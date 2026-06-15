import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { timingSafeCompare } from "~/lib/utils/crypto";
import { getStore } from "@netlify/blobs";

export async function POST(event: APIEvent) {
  try {
    const { password } = await event.request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "";

    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return new Response(JSON.stringify({ success: false, error: "รหัสผ่านไม่ถูกต้องกรุณาลองใหม่อีกครั้งค่ะ" }), { status: 401 });
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24 ชั่วโมง

    const store = getStore("donation_store");
    await store.setJSON(`session:${sessionToken}`, { expiresAt });

    setCookie(event.nativeEvent, "admin_session_token", sessionToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "ระบบตรวจสอบหลังบ้านขัดข้องชั่วคราว" }), { status: 500 });
  }
}