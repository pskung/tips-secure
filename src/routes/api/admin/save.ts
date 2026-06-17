// src/routes/api/admin/save.ts
import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";
import { ThemeSchema } from "~/lib/utils/schemas";

// ฟังก์ชันดึงและยืนยันสิทธิ์ JWT ไร้สถานะผ่าน Netlify Identity Endpoint
async function verifyAdminJWT(event: APIEvent): Promise<boolean> {
  const authHeader = event.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const url = new URL(event.request.url);
  const host = event.request.headers.get("host") || url.host;
  const protocol =
    event.request.headers.get("x-forwarded-proto") || url.protocol;

  try {
    const identityUrl = `${protocol}://${host}/.netlify/identity/user`;
    const res = await fetch(identityUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const user = await res.json();
      return !!user.id; // หาก Login ผ่าน Netlify สำเร็จ จะพบ ID ประจำตัวผู้ใช้
    }
  } catch (err) {
    safeLog("Failed to verify JWT with Netlify Identity Gateway", "ERROR", err);
    return false;
  }
  return false;
}

export async function POST(event: APIEvent) {
  try {
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

    // ยืนยันสิทธิ์ความปลอดภัยด้วย JWT
    const isAuthenticated = await verifyAdminJWT(event);
    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: "ไม่มีสิทธิ์เข้าถึงหรือเซสชันหมดอายุ กรุณาล็อกอินใหม่ค่ะ",
        }),
        { status: 401 },
      );
    }

    const { config: newTheme } = await event.request.json();

    // กรองความถูกต้องพารามิเตอร์ตกแต่งด้วย Zod
    const result = ThemeSchema.safeParse(newTheme);
    if (!result.success) {
      const firstError = result.error.issues[0].message;
      return new Response(
        JSON.stringify({ error: `การตั้งค่าไม่ถูกต้อง: ${firstError}` }),
        { status: 400 },
      );
    }

    const store = getStore("donation_store");
    await store.setJSON("vtuber_personalized_theme", result.data);

    safeLog(
      "Admin settings saved successfully via Netlify Identity JWT.",
      "INFO",
    );
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    safeLog(
      "Exception occurred during admin settings storage save",
      "ERROR",
      err,
    );
    return new Response(
      JSON.stringify({ error: "เกิดปัญหาขัดข้องขณะจัดเก็บข้อมูลธีม" }),
      { status: 500 },
    );
  }
}
