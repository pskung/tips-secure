// src/routes/api/admin/save.ts
import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";
import { ThemeSchema } from "~/lib/utils/schemas";

// ฟังก์ชันดึงและยืนยันสิทธิ์ JWT ไร้สถานะร่วมกับการระบุกลุ่มแอดมิน
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

      // 🔒 ด่านตรวจสอบกลุ่มอีเมลแอดมินที่ได้รับอนุญาตขั้นสูง
      const allowedEmailsEnv = process.env.ADMIN_EMAILS;
      if (!allowedEmailsEnv || allowedEmailsEnv.trim() === "") {
        safeLog(
          "Security Block: ADMIN_EMAILS environment variable is missing on Netlify.",
          "ERROR",
        );
        return false;
      }

      // แปลงข้อความ Comma-separated ให้กลายเป็น Array และล้างช่องว่างส่วนเกินออกทั้งหมด
      const allowedEmails = allowedEmailsEnv
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email !== "");

      if (allowedEmails.length === 0) {
        safeLog("Security Block: Parsed ADMIN_EMAILS list is empty.", "ERROR");
        return false;
      }

      // ตรวจสอบว่าอีเมลของบัญชีที่ล็อกอินมาด้วย OAuth อยู่ในรายชื่อที่ได้รับสิทธิ์หรือไม่
      const userEmail = (user.email || "").trim().toLowerCase();
      const isAuthorized =
        userEmail !== "" && allowedEmails.includes(userEmail);

      if (!isAuthorized) {
        safeLog(
          `Security Block: Unauthorized OAuth user attempt. Email: ${user.email}`,
          "WARN",
        );
        return false;
      }

      return !!user.id;
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

    // ยืนยันสิทธิ์ความปลอดภัยด้วย JWT + Email Whitelist
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
