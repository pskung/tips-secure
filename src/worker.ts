import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { sign, verify } from "hono/jwt";
import { safeLog } from "./lib/utils/logger";
import { timingSafeCompare } from "./lib/utils/crypto";
import { DonateInputSchema, ThemeSchema } from "./lib/utils/schemas";
import defaultTheme from "./lib/config/theme.json";

type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
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

const app = new Hono<{ Bindings: Bindings }>();

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
};

const jsonPayloadLimit = bodyLimit({
  maxSize: 16 * 1024,
  onError: (c) => {
    return c.json(
      { error: "Payload size limits exceeded. Action blocked." },
      413,
    );
  },
});

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

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function retryAlertInBackground(
  env: any,
  transactionId: string,
  donorName: string,
  donorMessage: string,
  amountInThb: number,
  currency: string,
) {
  const db = env.DB;
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

  const nowEpoch = Math.floor(Date.now() / 1000);
  if (slSuccess && seSuccess) {
    await db
      .prepare(
        "INSERT OR REPLACE INTO transactions (id, status, created_at) VALUES (?, ?, ?)",
      )
      .bind(transactionId, "success", nowEpoch)
      .run();
    safeLog(`Background Retry Success: ${transactionId}`, "INFO");
  } else {
    await db
      .prepare(
        "INSERT OR REPLACE INTO transactions (id, status, created_at) VALUES (?, ?, ?)",
      )
      .bind(transactionId, "failed", nowEpoch)
      .run();
    safeLog(`Background Retry Permanently Failed: ${transactionId}`, "ERROR");
  }
}

let isDbInitialized = false;
const api = app.basePath("/api");

api.use("*", async (c, next) => {
  const db = c.env.DB;
  if (db && !isDbInitialized) {
    try {
      await db.batch([
        db.prepare(`
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        `),
        db.prepare(`
          CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )
        `),
      ]);
      isDbInitialized = true;
    } catch (err) {
      safeLog("Database auto-bootstrap failed", "ERROR", err);
    }
  }
  await next();
});

api.get("/theme", async (c) => {
  const turnstileSiteKey = c.env.TURNSTILE_SITE_KEY || "";
  try {
    const db = c.env.DB;
    if (!db) {
      safeLog("Warning: DB is not bound to the environment.", "WARN");
      return c.json({ theme: defaultTheme, turnstileSiteKey }, 200);
    }

    const result = await db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .bind("personalized_theme")
      .first<{ value: string }>();

    const parsedDbTheme = result ? JSON.parse(result.value) : {};
    const theme = { ...defaultTheme, ...parsedDbTheme };

    return c.json({ theme, turnstileSiteKey }, 200, {
      "Cache-Control":
        "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
    });
  } catch (error) {
    safeLog("Theme fetch failed, falling back to default.", "WARN", error);
    return c.json({ theme: defaultTheme, turnstileSiteKey }, 200, {
      "Cache-Control":
        "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
    });
  }
});

api.get("/admin/verify", async (c) => {
  const authHeader = c.req.header("Authorization");
  const clientToken = authHeader?.replace("Bearer ", "");
  const expectedPassword = c.env.ADMIN_PASSWORD;

  if (!expectedPassword || expectedPassword.trim() === "") {
    return c.json(
      { valid: false, error: "System validation not configured." },
      500,
    );
  }

  if (!clientToken) {
    return c.json({ valid: false, error: "Missing authorization token." }, 401);
  }

  try {
    const decoded = await verify(clientToken, expectedPassword, "HS256");
    if (decoded && decoded.role === "admin") {
      return c.json({ valid: true }, 200);
    }
    return c.json({ valid: false, error: "Invalid credentials." }, 401);
  } catch {
    return c.json({ valid: false, error: "Token expired or corrupted." }, 401);
  }
});

api.post("/admin/login", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const body = await c.req.json();
    const inputPassword = body.password;
    const turnstileToken = body.turnstile_token;

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

    const hashedInput = await sha256(inputPassword || "");
    const hashedExpected = await sha256(expectedPassword);

    if (!inputPassword || !timingSafeCompare(hashedInput, hashedExpected)) {
      safeLog("Unsuccessful login attempt to admin dashboard.", "WARN");
      return c.json({ error: "Invalid password." }, 401);
    }

    const payload = {
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 7200,
    };
    const token = await sign(payload, expectedPassword, "HS256");

    return c.json({ success: true, token }, 200);
  } catch (error) {
    safeLog("Admin login controller exception raised", "ERROR", error);
    return c.json({ error: "Server connection error" }, 500);
  }
});

api.post("/admin/save", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const db = env.DB;

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
      return c.json(
        { error: "Admin authentication password is not set on server" },
        500,
      );
    }

    const clientToken = authHeader?.replace("Bearer ", "");
    if (!clientToken) {
      return c.json({ error: "Unauthorized: Missing token." }, 401);
    }

    try {
      const decoded = await verify(clientToken, expectedPassword, "HS256");
      if (!decoded || decoded.role !== "admin") {
        return c.json({ error: "Unauthorized: Invalid credentials." }, 401);
      }
    } catch (err) {
      safeLog(
        "Unauthorized API save attempt - JWT validation failure",
        "WARN",
        err,
      );
      return c.json({ error: "Session expired. Please log in again." }, 401);
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

    if (!db) {
      return c.json({ error: "Database not available on server" }, 500);
    }

    await db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .bind("personalized_theme", JSON.stringify(result.data))
      .run();

    safeLog("Admin settings saved successfully.", "INFO");
    return c.json({ success: true }, 200);
  } catch (err) {
    safeLog("Exception during admin save", "ERROR", err);
    return c.json({ error: "Failed to save configuration." }, 500);
  }
});

api.post("/donate", jsonPayloadLimit, async (c) => {
  const now = Date.now();
  try {
    const env = c.env;
    const db = env.DB;

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
      if (db) {
        const result = await db
          .prepare("SELECT value FROM settings WHERE key = ?")
          .bind("personalized_theme")
          .first<{ value: string }>();

        if (result) {
          const theme = JSON.parse(result.value);
          if (theme && theme.minDonationAmount) {
            minDonationAmount = Number(theme.minDonationAmount);
          }
        }
      }
    } catch (err) {
      safeLog("Fallback to 10 THB due to DB fetch failure", "WARN", err);
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

api.post("/webhook/beam", jsonPayloadLimit, async (c) => {
  try {
    const env = c.env;
    const db = env.DB;
    const ctx = c.executionCtx;

    const body = await c.req.json();
    const callbackToken = c.req.header("x-beam-webhook-token") || "";
    const expectedToken = env.BEAM_WEBHOOK_SECRET || "";

    if (callbackToken.trim() === "" || expectedToken.trim() === "") {
      safeLog("Security Alert: Null or missing Webhook credentials.", "WARN");
      return c.json({ error: "Unauthenticated" }, 401);
    }

    const hashedCallback = await sha256(callbackToken);
    const hashedExpected = await sha256(expectedToken);

    if (!timingSafeCompare(hashedCallback, hashedExpected)) {
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

      if (!db) {
        return c.json({ error: "Database not available" }, 500);
      }

      const isAlreadyProcessed = await db
        .prepare("SELECT status FROM transactions WHERE id = ?")
        .bind(transactionId)
        .first<{ status: string }>();

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

      const nowEpoch = Math.floor(Date.now() / 1000);
      if (slSuccess && seSuccess) {
        await db
          .prepare(
            "INSERT INTO transactions (id, status, created_at) VALUES (?, ?, ?)",
          )
          .bind(transactionId, "success", nowEpoch)
          .run();
        safeLog(`Fast-Path success: ${transactionId}`, "INFO");
      } else {
        await db
          .prepare(
            "INSERT INTO transactions (id, status, created_at) VALUES (?, ?, ?)",
          )
          .bind(transactionId, "retry_pending", nowEpoch)
          .run();

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

      const sevenDaysAgo = nowEpoch - 7 * 24 * 60 * 60;
      ctx.waitUntil(
        db
          .prepare("DELETE FROM transactions WHERE created_at < ?")
          .bind(sevenDaysAgo)
          .run()
          .catch((err: any) =>
            safeLog("D1 old transaction purging failed", "WARN", err),
          ),
      );
    }
    return c.json({ success: true }, 200);
  } catch (error) {
    safeLog("Fatal Webhook Controller Error", "ERROR", error);
    return c.json({ error: "Fail. Webhook processing failed." }, 500);
  }
});

app.all("*", async (c) => {
  return await c.env.ASSETS.fetch(c.req.raw);
});

export default app;
