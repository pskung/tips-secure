import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit"; // 🟢 ดึงไลบรารีควบคุมขนาดคำร้องขอของ Hono
import { safeLog } from "./lib/utils/logger";
import { timingSafeCompare } from "./lib/utils/crypto";
import { DonateInputSchema, ThemeSchema } from "./lib/utils/schemas";
import defaultTheme from "./lib/config/theme.json";

// กำหนดโครงสร้างตัวแปรระบบ
type Bindings = {
  DONATION_STORE: KVNamespace;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string; // 🟢 กลับมาใช้ตัวแปรตัวเดิมของระบบ ไม่ต้องสร้าง EV ใหม่เพิ่มค่ะ
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  BEAM_WEBHOOK_SECRET?: string;
  BEAM_API_KEY?: string;
  BEAM_API_URL?: string;
  STREAMLABS_ACCESS_TOKEN?: string;
  STREAMELEMENTS_JWT?: string;
  STREAMELEMENTS_CHANNEL_ID?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
};

// 🟢 ตัวกรองสยบสแปม DoS จำกัดขนาด JSON ขาเข้าสูงสุดไม่เกิน 16KB (เหลือเฟือสำหรับโดเนทและบันทึกสกิน)
const jsonPayloadLimit = bodyLimit({
  maxSize: 16 * 1024, // 16 Kilobytes
  onError: (c) => {
    return c.json(
      { error: "Payload size limits exceeded. Action blocked." },
      413,
    );
  },
});

// 🟢 ฟังก์ชันแปลงอักขระพิเศษ (HTML Entity Encoder) สกัดช่องโหว่ XSS จากการส่งสคริปต์ก่อกวน [1]
const escapeHtml = (str: string): string => {
  return str.replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return map[m] || m;
  });
};

// ฟังก์ชันเข้ารหัส SHA-256 แบบไร้โมดูล Node.js [1]
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ฟังก์ชันซ่อมสัญญาณสตรีมเมอร์อัตโนมัติเบื้องหลัง
async function retryAlertInBackground(
  env: any,
  transactionId: string,
  donorName: string,
  donorMessage: string,
  amountInThb: number,
  currency: string,
) {
  const store = env.DONATION_STORE;
  let slSuccess = !env.STREAMLABS_ACCESS_TOKEN;
  let seSuccess = !(env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const promises: Promise<any>[] = [];

    if (env.STREAMLABS_ACCESS_TOKEN && !slSuccess) {
      const params = new URLSearchParams();
      params.append("access_token", env.STREAMLABS_ACCESS_TOKEN);
      params.append("name", donorName);
      params.append("message", donorMessage);
      params.append("amount", String(amountInThb));
      params.append("currency", currency);

      promises.push(
        fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => {
            if (res.ok) slSuccess = true;
          })
          .catch(() => {}),
      );
    }

    if (env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID && !seSuccess) {
      const sePayload = {
        user: { username: donorName },
        message: donorMessage,
        amount: Number(amountInThb),
        currency,
      };
      promises.push(
        fetch(EXTERNAL_API.STREAMELEMENTS_TIPS(env.STREAMELEMENTS_CHANNEL_ID), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STREAMELEMENTS_JWT}`,
          },
          body: JSON.stringify(sePayload),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => {
            if (res.ok) seSuccess = true;
          })
          .catch(() => {}),
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (slSuccess && seSuccess) break;

    if (attempt < maxRetries) {
      const backoffTime = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, backoffTime));
    }
  }

  if (slSuccess && seSuccess) {
    await store.put(`processed_tx:${transactionId}`, "success", {
      expirationTtl: 604800,
    });
    safeLog(`Background Retry Success: ${transactionId}`, "INFO");
  } else {
    await store.put(`processed_tx:${transactionId}`, "failed", {
      expirationTtl: 604800,
    });
    safeLog(`Background Retry Permanently Failed: ${transactionId}`, "ERROR");
  }
}

// -----------------------------------------------------------------------------
// กลุ่มเราเตอร์ประมวลผลข้อมูลหลังบ้าน (Hono API Routes under /api/*)
// -----------------------------------------------------------------------------
const api = app.basePath("/api");

// [GET] /api/theme: จัดส่งสกินตกแต่งความละเอียดสูง พร้อมการแคชบน Edge CDN
api.get("/theme", async (c) => {
  const turnstileSiteKey = c.env.TURNSTILE_SITE_KEY || "";
  try {
    const store = c.env.DONATION_STORE;
    if (!store) {
      safeLog(
        "Warning: DONATION_STORE is not bound to the environment.",
        "WARN",
      );
      return c.json({ theme: defaultTheme, turnstileSiteKey }, 200);
    }

    const theme = await store.get("personalized_theme", { type: "json" });
    const mergedTheme = { ...defaultTheme, ...(theme || {}) };

    return c.json({ theme: mergedTheme, turnstileSiteKey }, 200, {
      "Cache-Control":
        "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
    });
  } catch (error) {
    // 🟢 ดักจับ Error ส่งออกประวัติลับและตอบกลับทึบแสง (Opaque Fallback Response) ป้องกันข้อมูลทางเทคนิครั่วไหล
    safeLog("Theme fetch failed, falling back to default.", "WARN", error);
    return c.json({ theme: defaultTheme, turnstileSiteKey }, 200, {
      "Cache-Control":
        "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
    });
  }
});

// [POST] /api/admin/login: ตรวจสอบความปลอดภัยคัดแยกสแปมบอทและมอบรหัสเข้าใช้
api.post("/admin/login", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const body = await c.req.json();
    const inputPassword = body.password;
    const turnstileToken = body.turnstile_token;

    // 🟢 เรียกใช้ตัวแปร ADMIN_PASSWORD ตัวเดิม ไม่ต้องเพิ่ม EV ใหม่ให้ยุ่งยากค่ะ
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return c.json(
        {
          error: "System Error: Admin validation is not configured on server.",
        },
        500,
      );
    }

    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return c.json(
        { error: "Security system (Turnstile) not initialized." },
        500,
      );
    }

    if (!turnstileToken) {
      return c.json({ error: "Please complete the security challenge." }, 400);
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    const verifyData: any = await verifyResponse.json();
    if (!verifyData.success) {
      safeLog("Admin login blocked: Turnstile verification failed.", "WARN");
      return c.json({ error: "Security verification failed. Try again." }, 400);
    }

    // 🟢 แฮชไดนามิกในแรมทั้งฝั่งอินพุตและเอาต์พุต เพื่อบีบความยาวให้เป็น 64 ตัวอักษรเท่ากันสำหรับการทำ Timing-Safe [1]
    const hashedInput = await sha256(inputPassword || "");
    const hashedExpected = await sha256(expectedPassword);

    if (!inputPassword || !timingSafeCompare(hashedInput, hashedExpected)) {
      safeLog("Unsuccessful login attempt to admin dashboard.", "WARN");
      return c.json({ error: "Invalid password." }, 401);
    }

    // ส่งคืนลายเซ็น Token ที่ขึ้นอยู่กับคีย์แฮชเพื่อทำ Stateless Session
    const token = await sha256(expectedPassword);
    return c.json({ success: true, token }, 200);
  } catch (error) {
    safeLog("Admin login controller exception raised", "ERROR", error);
    return c.json({ error: "Server connection error" }, 500);
  }
});

// [POST] /api/admin/save: บันทึกความงามสกินใหม่ และป้องกันจู่โจมข้ามไซต์ (Anti-CSRF)
api.post("/admin/save", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const store = env.DONATION_STORE;

    const origin = c.req.header("origin");
    const url = new URL(c.req.url);
    const host = c.req.header("host") || url.host;
    const protocol = c.req.header("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin || origin !== expectedOrigin) {
      safeLog(
        `Security Alert: CSRF Blocked on Admin Save from ${origin}`,
        "WARN",
      );
      return c.json({ error: "Rejected Cross-Origin action" }, 403);
    }

    const authHeader = c.req.header("Authorization");

    // 🟢 ดึงรหัสผ่านแอดมินตัวเดิมมาประมวลผล
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return c.json(
        { error: "Admin authentication password is not set on server" },
        500,
      );
    }

    const expectedToken = await sha256(expectedPassword);
    const clientToken = authHeader?.replace("Bearer ", "");

    if (!clientToken || !timingSafeCompare(clientToken, expectedToken)) {
      safeLog("Security Alert: Unauthorized API save attempt", "WARN");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { config: newTheme } = await c.req.json();
    const result = ThemeSchema.safeParse(newTheme);
    if (!result.success) {
      return c.json(
        {
          error: `Invalid configuration: ${result.error.issues[0].message}`,
        },
        400,
      );
    }

    if (!store) {
      return c.json({ error: "KV database not available on server" }, 500);
    }

    await store.put("personalized_theme", JSON.stringify(result.data));
    safeLog("Admin settings saved successfully.", "INFO");
    return c.json({ success: true }, 200);
  } catch (err) {
    safeLog("Exception during admin save", "ERROR", err);
    return c.json({ error: "Failed to save configuration." }, 500);
  }
});

// [POST] /api/donate: ตรวจประวัติตัดความเสี่ยง ยืนยันผู้จ่าย และออกบิล QR Code
api.post("/donate", jsonPayloadLimit, async (c) => {
  const now = Date.now();
  try {
    const env = c.env;
    const store = env.DONATION_STORE;

    const body = await c.req.json();
    const result = DonateInputSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: result.error.issues[0].message }, 400);
    }

    const {
      name,
      amount,
      message,
      email_confirm,
      render_time,
      turnstile_token,
    } = result.data;

    if (email_confirm) {
      safeLog("Spam Bot Detected: Invisible honeypot trap triggered.", "WARN");
      return c.json({ error: "Operation rejected" }, 400);
    }

    if (render_time && now - Number(render_time) < 1000) {
      safeLog("Spam Bot Detected: Trigger speed abnormal.", "WARN");
      return c.json({ error: "Operation rate limit exceeded" }, 400);
    }

    let minDonationAmount = 10;
    try {
      if (store) {
        const theme: any = await store.get("personalized_theme", {
          type: "json",
        });
        if (theme && theme.minDonationAmount) {
          minDonationAmount = Number(theme.minDonationAmount);
        }
      }
    } catch (err) {
      safeLog("Fallback to 10 THB due to KV fetch failure", "WARN", err);
    }

    if (amount < minDonationAmount) {
      return c.json(
        {
          error: `Donation must be at least ${minDonationAmount} THB.`,
        },
        400,
      );
    }

    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return c.json({ error: "Security system not initialized." }, 500);
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: turnstileSecret,
          response: turnstile_token,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );

    const verifyData: any = await verifyResponse.json();
    if (!verifyData.success) {
      return c.json({ error: "Security verification failed." }, 400);
    }

    if (!env.BEAM_API_KEY) {
      return c.json({ error: "Payment gateway not configured." }, 501);
    }

    const netAmountInSatang = Math.round(amount * 100);
    const url = new URL(c.req.url);
    const host = c.req.header("host") || url.host;
    const protocol = c.req.header("x-forwarded-proto") || url.protocol;
    const siteUrl = `${protocol}://${host}/`;

    // 🟢 Finding #1: ดำเนินการล้างค่าอักขระพิเศษสกัดช่องโหว่ XSS จากชื่อผู้โดเนทและข้อความสนับสนุน [1]
    const sanitizedName = escapeHtml(name.trim());
    const sanitizedMessage = message ? escapeHtml(message.trim()) : "";

    const beamUrl =
      env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
    const authHeader = "Basic " + btoa(`${env.BEAM_API_KEY}:`);

    const response = await fetch(`${beamUrl}/api/v1/payment-links`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirectUrl: siteUrl,
        order: {
          currency: "THB",
          netAmount: netAmountInSatang,
          description: `Support payment by ${sanitizedName}`,
          referenceId: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
          internalNote: JSON.stringify({
            donor_name: sanitizedName,
            donor_message: sanitizedMessage || "",
          }),
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data: any = await response.json();
    if (!response.ok) {
      // 🟢 Finding #3: ดักจับและเขียนประวัติลับหลบเลี่ยง Trace Leakage หน้าบ้าน
      safeLog("Beam API generation failed", "ERROR", data);
      return c.json(
        {
          error:
            "Failed to generate payment link. Gateway is temporarily unavailable.",
        },
        502,
      );
    }

    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `cooldown_active=true; Max-Age=60; Path=/; HttpOnly; Secure; SameSite=Strict`,
    );

    return new Response(JSON.stringify({ invoice_url: data.url }), {
      status: 200,
      headers,
    });
  } catch (error) {
    safeLog("Fatal exception in donate controller", "ERROR", error);
    return c.json(
      { error: "An unexpected error occurred. Please try again later." },
      500,
    );
  }
});

// [POST] /api/webhook/beam: ตรวจบิลจ่ายเสร็จ และยิงแจ้งแจ้งเตือน
api.post("/webhook/beam", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const store = env.DONATION_STORE;
    const ctx = c.executionCtx;

    const body = await c.req.json();
    const callbackToken = c.req.header("x-beam-webhook-token");
    const expectedToken = env.BEAM_WEBHOOK_SECRET;

    if (
      !callbackToken ||
      !expectedToken ||
      callbackToken.trim() === "" ||
      expectedToken.trim() === ""
    ) {
      safeLog("Security Alert: Null or missing Webhook credentials.", "WARN");
      return c.json({ error: "Unauthenticated" }, 401);
    }

    if (!timingSafeCompare(callbackToken, expectedToken)) {
      safeLog("Security Alert: Webhook callback signature mismatch.", "WARN");
      return c.json({ error: "Unauthenticated origin" }, 401);
    }

    const isPaymentLinkPaid =
      body.status === "PAID" || body.status === "SUCCEEDED";
    const isTransactionSuccess = body.transactionType === "PAYMENT";

    if (isPaymentLinkPaid || isTransactionSuccess) {
      const transactionId =
        body.transactionId || body.chargeId || body.paymentLinkId;
      if (!transactionId) {
        return c.json({ error: "Missing transaction ID" }, 400);
      }

      if (!store) {
        return c.json({ error: "KV database not available" }, 500);
      }

      const isAlreadyProcessed = await store.get(
        `processed_tx:${transactionId}`,
      );
      if (isAlreadyProcessed) {
        return c.json({ success: true, message: "Duplicate skipped" }, 200);
      }

      let donorName = "Anonymous";
      let donorMessage = "";
      const amountInThb = (body.grossAmount || body.amount || 0) / 100;
      const currency = body.currency || "THB";

      const orderNote = body.order?.internalNote || body.internalNote;
      if (orderNote) {
        try {
          const parsedNote = JSON.parse(orderNote);
          // 🟢 Finding #1: สกัด XSS จากชื่อผู้โดเนทและข้อความสนับสนุนก่อนขึ้น overlays เสมอ
          donorName = escapeHtml(parsedNote.donor_name || "Anonymous");
          donorMessage = escapeHtml(parsedNote.donor_message || "");
        } catch {
          donorName = escapeHtml(orderNote || "Anonymous");
        }
      } else {
        const paymentLinkId = body.sourceId || body.paymentLinkId;
        if (paymentLinkId && env.BEAM_API_KEY) {
          const beamUrl =
            env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
          const authHeader = "Basic " + btoa(`${env.BEAM_API_KEY}:`);
          try {
            const plResponse = await fetch(
              `${beamUrl}/api/v1/payment-links/${paymentLinkId}`,
              {
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(1500),
              },
            );
            if (plResponse.ok) {
              const plData: any = await plResponse.json();
              const noteStr = plData?.order?.internalNote;
              if (noteStr) {
                try {
                  const parsedNote = JSON.parse(noteStr);
                  // 🟢 Finding #1: สกัด XSS ข้อมูลเรียกดูย้อนหลัง
                  donorName = escapeHtml(parsedNote.donor_name || "Anonymous");
                  donorMessage = escapeHtml(parsedNote.donor_message || "");
                } catch {
                  donorName = escapeHtml(noteStr || "Anonymous");
                }
              }
            }
          } catch (err) {
            safeLog("Beam API fallback GET error", "WARN", err);
          }
        }
      }

      let slSuccess = false;
      let seSuccess = false;
      const fastPathPromises: Promise<any>[] = [];

      if (env.STREAMLABS_ACCESS_TOKEN) {
        const params = new URLSearchParams();
        params.append("access_token", env.STREAMLABS_ACCESS_TOKEN);
        params.append("name", donorName);
        params.append("message", donorMessage);
        params.append("amount", String(amountInThb));
        params.append("currency", currency);

        fastPathPromises.push(
          fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
            signal: AbortSignal.timeout(800),
          })
            .then((res) => {
              if (res.ok) slSuccess = true;
            })
            .catch(() => {}),
        );
      } else {
        slSuccess = true;
      }

      if (env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID) {
        const sePayload = {
          user: { username: donorName },
          message: donorMessage,
          amount: Number(amountInThb),
          currency,
        };
        fastPathPromises.push(
          fetch(
            EXTERNAL_API.STREAMELEMENTS_TIPS(env.STREAMELEMENTS_CHANNEL_ID),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.STREAMELEMENTS_JWT}`,
              },
              body: JSON.stringify(sePayload),
              signal: AbortSignal.timeout(800),
            },
          )
            .then((res) => {
              if (res.ok) seSuccess = true;
            })
            .catch(() => {}),
        );
      } else {
        seSuccess = true;
      }

      if (fastPathPromises.length > 0) {
        await Promise.all(fastPathPromises);
      }

      if (slSuccess && seSuccess) {
        await store.put(`processed_tx:${transactionId}`, "success", {
          expirationTtl: 604800,
        });
        safeLog(`Fast-Path success: ${transactionId}`, "INFO");
      } else {
        await store.put(`processed_tx:${transactionId}`, "retry_pending", {
          expirationTtl: 604800,
        });

        ctx.waitUntil(
          retryAlertInBackground(
            env,
            transactionId,
            donorName,
            donorMessage,
            amountInThb,
            currency,
          ),
        );
      }
    }
    return c.json({ success: true }, 200);
  } catch (error) {
    // 🟢 Finding #3: ซ่อนข้อผิดพลาด Webhook
    safeLog("Fatal Webhook Controller Error", "ERROR", error);
    return c.json({ error: "Fail. Webhook processing failed." }, 500);
  }
});

// ระบบ Fallback เสิร์ฟไฟล์สถิตหน้าบ้านผ่านพอร์ต ASSETS
app.all("*", async (c) => {
  return await c.env.ASSETS.fetch(c.req.raw);
});

export default app;
