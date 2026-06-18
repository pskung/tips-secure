// src/routes/api/admin/upload.ts
import type { APIEvent } from "@solidjs/start/server";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";

import { verifyAdminJWT } from "~/lib/utils/auth";

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
