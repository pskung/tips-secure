import { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { ThemeSchema } from "~/lib/utils/schemas";

export async function POST(event: APIEvent) {
  try {
    const cloudflare = event.nativeEvent.context.cloudflare;
    const env = cloudflare.env;
    const store = env.DONATION_STORE;

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

    // [อัปเกรดความปลอดภัย]: บน Cloudflare Pages จะใช้ Cloudflare Access คุมสิทธิ์การผ่านด่าน `/admin/*`
    // โดยแอดมินจะสามารถเรียกเซฟข้อมูลได้อย่างปลอดภัยผ่าน Endpoint นี้
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

    // [โยกย้าย]: เขียนทับสีธีมลงสู่ฐานข้อมูลคลาวด์ KV ในฐานะ JSON String
    await store.put("personalized_theme", JSON.stringify(result.data));

    safeLog("Admin settings saved successfully via Cloudflare KV.", "INFO");
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    safeLog("Exception during admin save", "ERROR", err);
    return new Response(
      JSON.stringify({ error: "Failed to save configuration." }),
      { status: 500 },
    );
  }
}
