import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { safeLog } from "../../src/lib/utils/logger";
import { timingSafeCompare } from "../../src/lib/utils/crypto";
import { DonateInputSchema, ThemeSchema } from "../../src/lib/utils/schemas";
import defaultTheme from "../../src/lib/config/theme.json";

// กำหนดโครงสร้างตัวแปรระบบ (Types) สำหรับระบบจำหน่ายบน Cloudflare Pages
type Bindings = {
  DONATION_STORE: KVNamespace;
  ADMIN_PASSWORD?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  BEAM_WEBHOOK_SECRET?: string;
  BEAM_API_KEY?: string;
  BEAM_API_URL?: string;
  STREAMLABS_ACCESS_TOKEN?: string;
  STREAMELEMENTS_JWT?: string;
  STREAMELEMENTS_CHANNEL_ID?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
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
// [GET] /api/theme: จัดส่งสกินตกแต่งความละเอียดสูง พร้อมการแคชบน Edge CDN
// -----------------------------------------------------------------------------
app.get("/theme", async (c) => {
  // ดึงค่า Site Key ขึ้นมารอก่อนเสมอเพื่อความปลอดภัย
  const turnstileSiteKey = c.env.TURNSTILE_SITE_KEY || "";

  try {
    const store = c.env.DONATION_STORE;

    // ตรวจสอบโครงสร้าง: หากไม่ได้ผูกมัด KV ให้ดึงค่า Default ไปทำงานต่อโดยไม่ปล่อยให้ระบบล้มเหลว
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
    // หากเกิด Error อื่น ๆ ให้ส่ง Site Key ตัวจริงกลับไปหน้าบ้านเสมอ ห้ามส่ง "[REDACTED]"
    safeLog("Theme fetch failed, falling back to default.", "WARN", error);
    return c.json({ theme: defaultTheme, turnstileSiteKey }, 200, {
      "Cache-Control":
        "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
    });
  }
});

// -----------------------------------------------------------------------------
// [POST] /api/admin/login: ตรวจสอบความปลอดภัยคัดแยกสแปมบอทและมอบรหัสเข้าใช้
// -----------------------------------------------------------------------------
app.post("/admin/login", async (c) => {
  try {
    const env = c.env;
    const body = await c.req.json();
    const inputPassword = body.password;
    const turnstileToken = body.turnstile_token;
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return c.json(
        { error: "System Error: Admin password not configured on server." },
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

    if (!inputPassword || !timingSafeCompare(inputPassword, expectedPassword)) {
      safeLog("Unsuccessful login attempt to admin dashboard.", "WARN");
      return c.json({ error: "Invalid password." }, 401);
    }

    const token = await sha256(expectedPassword);
    return c.json({ success: true, token }, 200);
  } catch (error) {
    return c.json({ error: "Server connection error" }, 500);
  }
});

// -----------------------------------------------------------------------------
// [POST] /api/admin/save: บันทึกความงามสกินใหม่ และป้องกันจู่โจมข้ามไซต์ (Anti-CSRF)
// -----------------------------------------------------------------------------
app.post("/admin/save", async (c) => {
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
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return c.json({ error: "Admin password is not set" }, 500);
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

    await store.put("personalized_theme", JSON.stringify(result.data));
    safeLog("Admin settings saved successfully.", "INFO");
    return c.json({ success: true }, 200);
  } catch (err) {
    safeLog("Exception during admin save", "ERROR", err);
    return c.json({ error: "Failed to save configuration." }, 500);
  }
});

// -----------------------------------------------------------------------------
// [POST] /api/donate: ตรวจประวัติตัดความเสี่ยง ยืนยันผู้จ่าย และออกบิล QR Code
// -----------------------------------------------------------------------------
app.post("/donate", async (c) => {
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
      const theme: any = await store.get("personalized_theme", {
        type: "json",
      });
      if (theme && theme.minDonationAmount) {
        minDonationAmount = Number(theme.minDonationAmount);
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

    const beamUrl = env.BEAM_API_URL;
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
          description: `Support payment by ${name}`,
          referenceId: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
          internalNote: JSON.stringify({
            donor_name: name,
            donor_message: message || "",
          }),
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data: any = await response.json();
    if (!response.ok) {
      return c.json(
        { error: "Failed to generate payment link." },
        response.status as 400 | 401 | 403 | 404 | 500 | 501 | 502 | 503,
      );
    }

    // เซ็ตคุกกี้จำกัดความถี่ด้วย Web Standard Set-Cookie Header
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
    return c.json({ error: "Internal server error." }, 500);
  }
});

// -----------------------------------------------------------------------------
// [POST] /api/webhook/beam: ตรวจบิลจ่ายเสร็จ และยิงแจ้งขึ้นจอทันทีด้วย waitUntil [1]
// -----------------------------------------------------------------------------
app.post("/webhook/beam", async (c) => {
  try {
    const env = c.env;
    const store = env.DONATION_STORE;
    const ctx = c.executionCtx; // ดึง Execution Context สิทธิ์ WaitUntil ข้ามวินาทีมาใช้งานทันที! [1]

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
          donorName = parsedNote.donor_name || "Anonymous";
          donorMessage = parsedNote.donor_message || "";
        } catch {
          donorName = orderNote || "Anonymous";
        }
      } else {
        const paymentLinkId = body.sourceId || body.paymentLinkId;
        if (paymentLinkId && env.BEAM_API_KEY) {
          const beamUrl = env.BEAM_API_URL;
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
                  donorName = parsedNote.donor_name || "Anonymous";
                  donorMessage = parsedNote.donor_message || "";
                } catch {
                  donorName = noteStr || "Anonymous";
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

        // สั่งรันคำสั่ง Retries ซ่อมแซมแบบอะซิงโครนัสเบื้องหลังทันทีโดยไม่มีการรอหน่วงฝั่งลูกค้า! [1]
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
    safeLog("Fatal Webhook Controller Error", "ERROR", error);
    return c.json({ error: "Fail" }, 500);
  }
});

// สั่งจ่ายออกตัวประสานงาน Hono ให้รองรับระบบ Cloudflare Pages Functions
export const onRequest = handle(app);
export default app;
