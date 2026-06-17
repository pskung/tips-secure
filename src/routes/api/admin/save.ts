import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";
import { ThemeSchema } from "~/lib/utils/schemas"; // นำเข้า Zod Schema เรียบร้อยแล้ว

export async function POST(event: APIEvent) {
  try {
    const origin = event.request.headers.get("origin");
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol =
      event.request.headers.get("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin) {
      return new Response(
        JSON.stringify({
          error: "Missing required Origin verification header",
        }),
        { status: 400 },
      );
    }

    if (origin !== expectedOrigin) {
      safeLog(
        `Security Alert: CSRF Blocked on Admin Save from ${origin}`,
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Rejected Cross-Origin action" }),
        { status: 403 },
      );
    }

    const rawToken = getCookie(event.nativeEvent, "admin_session_token");
    if (!rawToken) {
      return new Response(
        JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการค่ะ" }),
        { status: 401 },
      );
    }

    const parts = rawToken.split(":");
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: "โครงสร้างเซสชันคุกกี้ไม่ถูกต้อง" }),
        { status: 401 },
      );
    }

    const [expiresAtStr, sessionToken] = parts;
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) {
      safeLog(`Admin session expired for token: ${sessionToken}`, "WARN");
      setCookie(event.nativeEvent, "admin_session_token", "", {
        maxAge: 0,
        path: "/",
      });
      return new Response(
        JSON.stringify({
          error: "หมดอายุการเข้าใช้งานระบบกรุณาล็อกอินใหม่อีกครั้งค่ะ",
        }),
        { status: 401 },
      );
    }

    const store = getStore("donation_store");
    const sessionExists = await store.get(
      `session:${expiresAt}:${sessionToken}`,
    );

    if (!sessionExists) {
      safeLog(
        `Admin session rejected or not found for token: ${sessionToken}`,
        "WARN",
      );
      setCookie(event.nativeEvent, "admin_session_token", "", {
        maxAge: 0,
        path: "/",
      });
      return new Response(
        JSON.stringify({
          error: "ไม่พบข้อมูลเซสชัน กรุณาล็อกอินใหม่อีกครั้งค่ะ",
        }),
        { status: 401 },
      );
    }

    const { config: newTheme } = await event.request.json();

    // 🟢 1. ตรวจสอบความถูกต้องและความปลอดภัยของธีมด้วย Zod Schema
    const result = ThemeSchema.safeParse(newTheme);
    if (!result.success) {
      // ดึงข้อความแสดงจุดบกพร่องข้อแรกสุดส่งกลับให้แอดมิน เพื่อความสะดวกในการแก้ไขคีย์ตกแต่ง
      const firstError = result.error.issues[0].message;
      safeLog(
        "Security Alert: Malformed theme config payload rejected by Zod Schema",
        "WARN",
        result.error.format(),
      );
      return new Response(
        JSON.stringify({
          error: `การตั้งค่าไม่ถูกต้อง: ${firstError}`,
        }),
        { status: 400 },
      );
    }

    // 🟢 2. บันทึกเฉพาะข้อมูลที่ผ่านการกรอง (Sanitized Data) เรียบร้อยแล้วลงฐานข้อมูล
    // ฟังก์ชัน result.data จะทิ้งตัวแปรอื่น ๆ ที่สแกนเจอแปลกปลอมออกไปให้ทันทีค่ะ
    await store.setJSON("vtuber_personalized_theme", result.data);

    safeLog(
      "Admin settings saved successfully with Zod strict parsing.",
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
      JSON.stringify({ error: "เกิดปัญหาขัดข้องทางเทคนิคขณะจัดเก็บข้อมูลธีม" }),
      { status: 500 },
    );
  }
}
