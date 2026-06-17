// src/routes/api/admin/upload.ts
import type { APIEvent } from "@solidjs/start/server";
import { getCookie } from "vinxi/http";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";

export async function POST(event: APIEvent) {
  try {
    // 1. ตรวจสอบสิทธิ์ความปลอดภัยในระดับแอดมินผู้ดูแล
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
        JSON.stringify({ error: "โครงสร้างคุกกี้ไม่ถูกต้อง" }),
        { status: 401 },
      );
    }

    const [expiresAtStr, sessionToken] = parts;
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) {
      return new Response(
        JSON.stringify({ error: "หมดอายุการล็อกอิน กรุณาเข้าสู่ระบบใหม่นะคะ" }),
        { status: 401 },
      );
    }

    const store = getStore("donation_store");
    const sessionExists = await store.get(
      `session:${expiresAt}:${sessionToken}`,
    );
    if (!sessionExists) {
      return new Response(
        JSON.stringify({ error: "เซสชันไม่ถูกต้อง กรุณาล็อกอินใหม่ค่ะ" }),
        { status: 401 },
      );
    }

    // 2. แกะข้อมูลภาพอัปโหลด
    const formData = await event.request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'avatar', 'banner', หรือ 'bg'

    if (!file || !type) {
      return new Response(
        JSON.stringify({ error: "กรุณาแนบไฟล์ภาพและระบุประเภทนะคะ" }),
        { status: 400 },
      );
    }

    // ตรวจสอบขนาดไม่ให้เกิน 5MB (5 * 1024 * 1024 bytes) ด่านหลังบ้าน
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "ขนาดไฟล์ภาพต้องไม่เกิน 5 MB นะคะ" }),
        { status: 400 },
      );
    }

    // สกัดการอัปโหลดไฟล์แปลกปลอม ตรวจประเภทให้เป็นรูปภาพเท่านั้น
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: "กรุณาอัปโหลดเฉพาะไฟล์รูปภาพนะคะ" }),
        { status: 400 },
      );
    }

    // วิเคราะห์หาประเภทนามสกุลไฟล์
    let ext = "png";
    if (file.type === "image/jpeg" || file.type === "image/jpg") ext = "jpg";
    else if (file.type === "image/gif") ext = "gif";
    else if (file.type === "image/webp") ext = "webp";
    else if (file.type === "image/svg+xml") ext = "svg";

    // 3. กำหนดชื่อไฟล์โดยแนบ Timestamp ป้องกันแคชหน้า CDN ค้าง
    const timestamp = Date.now();
    const filename = `${type}_${timestamp}.${ext}`;

    // 4. บันทึกรูปภาพแบบ Binary (ArrayBuffer) ลง Netlify Blobs
    const arrayBuffer = await file.arrayBuffer();
    await store.set(`image:${filename}`, arrayBuffer);

    safeLog(`Admin successfully uploaded image: ${filename}`, "INFO");

    return new Response(
      JSON.stringify({
        success: true,
        url: `/api/images/${filename}`, // พาธปลายทางสำหรับการเรียกใช้งาน
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
