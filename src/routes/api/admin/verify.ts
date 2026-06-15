import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { timingSafeCompare } from "~/lib/utils/crypto";
import { getStore } from "@netlify/blobs";

export async function POST(event: APIEvent) {
  try {
    const { password, turnstile_token } = await event.request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "";
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;

    // 🟢 1. ตรวจยืนยันความถูกต้องของบอต ผ่าน API ปลายทางของ Cloudflare ก่อนทำตรรกะอื่น
    if (turnstileSecret) {
      if (!turnstile_token) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "กรุณายืนยันความปลอดภัยในด่านตรวจด้วยน้า 🔒",
          }),
          { status: 400 },
        );
      }

      const verifyResponse = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: turnstileSecret,
            response: turnstile_token,
          }),
        },
      );

      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "ตรวจพบพฤติกรรมบอตในกระบวนการล็อกอิน กรุณาลองใหม่อีกครั้งค่ะ",
          }),
          { status: 403 },
        );
      }
    }

    // 2. หากยืนยันตัวตนว่าไม่ใช่บอตเรียบร้อย ค่อยทำตรวจสอบเทียบค่ารหัสผ่านจริง
    if (
      !password ||
      !expectedPassword ||
      !timingSafeCompare(password, expectedPassword)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "รหัสผ่านไม่ถูกต้องกรุณาลองใหม่อีกครั้งค่ะ",
        }),
        { status: 401 },
      );
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // เซสชันมีอายุ 24 ชั่วโมง

    const store = getStore("donation_store");
    await store.set(`session:${expiresAt}:${sessionToken}`, "active");

    setCookie(
      event.nativeEvent,
      "admin_session_token",
      `${expiresAt}:${sessionToken}`,
      {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
      },
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "ระบบตรวจสอบหลังบ้านขัดข้องชั่วคราว",
      }),
      { status: 500 },
    );
  }
}
