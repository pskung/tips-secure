// src/routes/api/admin/save.ts
import { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { ThemeSchema } from "~/lib/utils/schemas";
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
    const store = env.DONATION_STORE;

    // 1. ตรวจสอบ CSRF ข้ามเว็บไซต์
    const origin = event.request.headers.get("origin");
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol =
      event.request.headers.get("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin || origin !== expectedOrigin) {
      safeLog(
        `Security Alert: CSRF Blocked on Admin Save from ${origin}`,
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Rejected Cross-Origin action" }),
        { status: 403 },
      );
    }

    // 2. ตรวจสอบรหัสผ่าน Token บนส่วนหัว Authorization
    const authHeader = event.request.headers.get("Authorization");
    const expectedPassword = env.ADMIN_PASSWORD;

    if (!expectedPassword || expectedPassword.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Admin password is not set" }),
        { status: 500 },
      );
    }

    const expectedToken = await sha256(expectedPassword);
    const clientToken = authHeader?.replace("Bearer ", "");

    if (!clientToken || !timingSafeCompare(clientToken, expectedToken)) {
      safeLog("Security Alert: Unauthorized API save attempt", "WARN");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // 3. ตรวจสอบโครงสร้างข้อมูล และเขียนบันทึกค่าลงคลาวด์ KV
    const { config: newTheme } = await event.request.json();
    const result = ThemeSchema.safeParse(newTheme);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: `Invalid configuration: ${result.error.issues[0].message}`,
        }),
        { status: 400 },
      );
    }

    await store.put("personalized_theme", JSON.stringify(result.data));

    safeLog("Admin settings saved successfully.", "INFO");
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    safeLog("Exception during admin save", "ERROR", err);
    return new Response(
      JSON.stringify({ error: "Failed to save configuration." }),
      { status: 500 },
    );
  }
}
