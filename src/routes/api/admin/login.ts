// src/routes/api/admin/login.ts
import { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { timingSafeCompare } from "~/lib/utils/crypto";

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(event: APIEvent) {
  try {
    const env = event.nativeEvent.context.cloudflare.env;
    const body = await event.request.json();
    const inputPassword = body.password;
    const turnstileToken = body.turnstile_token;
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return new Response(
        JSON.stringify({
          error: "System Error: Admin password not configured on server.",
        }),
        { status: 500 },
      );
    }

    // 1. ด่านป้องกันบอท: ตรวจสอบความถูกต้องของ Cloudflare Turnstile Token [1]
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return new Response(
        JSON.stringify({
          error: "Security system (Turnstile) not initialized.",
        }),
        { status: 500 },
      );
    }

    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ error: "Please complete the security challenge." }),
        { status: 400 },
      );
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

    const verifyData = await verifyResponse.json();
    if (!verifyData.success) {
      safeLog("Admin login blocked: Turnstile verification failed.", "WARN");
      return new Response(
        JSON.stringify({ error: "Security verification failed. Try again." }),
        { status: 400 },
      );
    }

    // 2. ด่านตรวจสอบรหัสผ่าน: เปรียบเทียบรหัสผ่านแบบ Timing-Safe ป้องกันการแฮกเชิงเวลา [1]
    if (!inputPassword || !timingSafeCompare(inputPassword, expectedPassword)) {
      safeLog("Unsuccessful login attempt to admin dashboard.", "WARN");
      return new Response(JSON.stringify({ error: "Invalid password." }), {
        status: 401,
      });
    }

    const token = await sha256(expectedPassword);

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Server connection error" }), {
      status: 500,
    });
  }
}
