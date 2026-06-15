import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";

export async function POST(event: APIEvent) {
  try {
    const origin = event.request.headers.get("origin");
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol = event.request.headers.get("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (origin && origin !== expectedOrigin) {
      safeLog(`Security Alert: CSRF Blocked on Admin Save from ${origin}`, "WARN");
      return new Response(JSON.stringify({ error: "Rejected Cross-Origin action" }), { status: 403 });
    }

    const sessionToken = getCookie(event.nativeEvent, "admin_session_token");
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการค่ะ" }), { status: 401 });
    }

    const store = getStore("donation_store");
    const sessionData = await store.get(`session:${sessionToken}`, { type: "json" }) as { expiresAt: number } | null;

    if (!sessionData || Date.now() > sessionData.expiresAt) {
      safeLog(`Admin session rejected or expired for token: ${sessionToken}`, "WARN");
      setCookie(event.nativeEvent, "admin_session_token", "", { maxAge: 0, path: "/" });
      return new Response(JSON.stringify({ error: "หมดอายุการเข้าใช้งานระบบกรุณาล็อกอินใหม่อีกครั้งค่ะ" }), { status: 401 });
    }

    const { config: newTheme } = await event.request.json();

    // บันทึกเฉพาะข้อมูลชุดปรับแต่งสไตล์ลงระบบคลาวด์ Netlify Blobs (ลบและป้องกันไม่ให้คีย์รหัสหลุดเซฟรวมกับธีมสาธารณะ)
    await store.setJSON("vtuber_personalized_theme", newTheme);

    safeLog("Admin settings saved successfully.", "INFO");
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    safeLog("Exception occurred during admin settings storage save", "ERROR", err);
    return new Response(JSON.stringify({ error: "เกิดปัญหาขัดข้องทางเทคนิคขณะจัดเก็บข้อมูลธีม" }), { status: 500 });
  }
}