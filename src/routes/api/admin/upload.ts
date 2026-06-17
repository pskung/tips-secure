// src/routes/api/admin/upload.ts
import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";

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
    const isAuthenticated = await verifyAdminJWT(event);
    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({
          error: "ไม่มีสิทธิ์เข้าถึงหรือเซสชันหมดอายุ กรุณาล็อกอินใหม่ค่ะ",
        }),
        { status: 401 },
      );
    }

    const formData = await event.request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return new Response(
        JSON.stringify({ error: "กรุณาแนบไฟล์ภาพและระบุประเภทนะคะ" }),
        { status: 400 },
      );
    }

    // จำกัดขนาดไฟล์ห้ามเกิน 5MB หลังบ้าน (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "ขนาดไฟล์ภาพต้องไม่เกิน 5 MB นะคะ" }),
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "กรุณาอัปโหลดเฉพาะไฟล์รูปภาพนะคะ" }),
        { status: 400 },
      );
    }

    let ext = "png";
    if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
    else if (file.type === "image/gif") ext = "gif";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/svg+xml") ext = "svg";

    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${ext}`;

    const store = getStore("donation_store");
    const arrayBuffer = await file.arrayBuffer();
    await store.set(`image:${filename}`, arrayBuffer);

    safeLog(`Admin uploaded image: ${filename}`, "INFO");

    return new Response(
      JSON.stringify({
        success: true,
        url: `/api/images/${filename}`,
        filename,
      }),
      { status: 200 },
    );
  } catch (err) {
    safeLog("Fatal crash during image upload processing", "ERROR", err);
    return new Response(
      JSON.stringify({ error: "ระบบอัปโหลดรูปภาพขัดข้องชั่วคราว" }),
      { status: 500 },
    );
  }
}
