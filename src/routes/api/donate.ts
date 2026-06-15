// src/routes/api/donate.ts
import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";

export async function POST(event: APIEvent) {
  const now = Date.now();

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
        `Security Alert: Blocked Cross-Origin request from ${origin}`,
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Untrusted network origin rejected" }),
        { status: 403 },
      );
    }

    const body = await event.request.json();
    const {
      name,
      amount,
      message,
      email_confirm,
      render_time,
      turnstile_token,
      is_consented,
    } = body;

    if (!is_consented) {
      return new Response(
        JSON.stringify({
          error: "กรุณากดยินยอมยอมรับนโยบายก่อนดำเนินรายการค่ะ",
        }),
        { status: 400 },
      );
    }

    if (email_confirm) {
      safeLog("Spam Bot Detected: Invisible honeypot trap triggered.", "WARN", {
        email_confirm,
      });
      return new Response(JSON.stringify({ error: "Operation rejected" }), {
        status: 400,
      });
    }

    if (render_time && now - Number(render_time) < 1000) {
      safeLog("Spam Bot Detected: Trigger speed abnormal.", "WARN");
      return new Response(
        JSON.stringify({ error: "Operation rate limit exceeded" }),
        { status: 400 },
      );
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      safeLog(
        "Critical: TURNSTILE_SECRET_KEY is missing in production environment.",
        "ERROR",
      );
      return new Response(
        JSON.stringify({
          error:
            "ระบบความปลอดภัยไม่ได้เปิดใช้งานอย่างสมบูรณ์ กรุณาติดต่อสตรีมเมอร์ค่ะ",
        }),
        { status: 500 },
      );
    }

    if (!turnstile_token) {
      return new Response(
        JSON.stringify({ error: "กรุณารอระบบยืนยันตัวตนสักครู่น้า 🔒" }),
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
          error: "ด่านตรวจพบว่ามีพฤติกรรมเป็นบอท กรุณาลองใหม่อีกครั้งค่ะ",
        }),
        { status: 400 },
      );
    }

    const cooldownActive = getCookie(event.nativeEvent, "cooldown_active");
    if (cooldownActive === "true") {
      return new Response(
        JSON.stringify({ error: "กรุณารอ 1 นาทีก่อนทำรายการถัดไปน้า" }),
        { status: 429 },
      );
    }

    if (
      !name ||
      typeof name !== "string" ||
      !/^[a-zA-Z0-9\u0e00-\u0e7f\s._-]+$/.test(name) ||
      name.length < 2 ||
      name.length > 25
    ) {
      return new Response(
        JSON.stringify({ error: "กรุณาตรวจสอบความถูกต้องของชื่อเล่นค่ะ" }),
        { status: 400 },
      );
    }

    if (message && (typeof message !== "string" || message.length > 255)) {
      return new Response(
        JSON.stringify({ error: "ข้อความยาวเกิน 255 ตัวอักษรค่ะ" }),
        { status: 400 },
      );
    }

    const rawAmount = Number(amount);
    if (isNaN(rawAmount) || rawAmount < 10.0 || rawAmount > 5000.0) {
      return new Response(
        JSON.stringify({
          error: "ยอดเงินโดเนทขั้นต่ำต้องอยู่ระหว่าง 10 - 5,000 บาทค่ะ",
        }),
        { status: 400 },
      );
    }

    if (!process.env.BEAM_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ระบบยังไม่ได้ตั้งค่าคีย์รับเงินของ Beam หลังบ้านค่ะ",
        }),
        { status: 501 },
      );
    }

    // 🟢 แปลงหน่วย THB เป็น Satang (สตางค์) และปัดเศษป้องกันความพังพินาศจากเศษทศนิยม
    const netAmountInSatang = Math.round(rawAmount * 100);

    const siteUrl = `${protocol}://${host}/`;
    const beamUrl =
      process.env.BEAM_API_URL || "https://playground.api.beamcheckout.com";

    // ตั้งค่า Basic Authentication สำหรับเชื่อมต่อ Beam API
    const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);

    // 🟢 ยิงคำร้องไปขอเปิดหน้าต่าง Payment Link กับ Beam
    const response = await fetch(`${beamUrl}/api/v1/payment-links`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirectUrl: siteUrl,
        order: {
          currency: "THB",
          netAmount: netAmountInSatang, // ส่งในหน่วยสตางค์
          description: `VTuber tip by ${name}`,
          referenceId: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
          // เข้ารหัสข้อมูลสตรีมเมอร์ลงไปใน internalNote เพื่อนำกลับมาแกะใช้ตอน Webhook ตีกลับ
          internalNote: JSON.stringify({
            donor_name: name,
            donor_message: message || "",
          }),
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      safeLog("Failed to generate Beam payment link", "ERROR", data);
      return new Response(
        JSON.stringify({ error: "ไม่สามารถติดต่อเกตเวย์รับเงินภายนอกได้ค่ะ" }),
        { status: response.status },
      );
    }

    setCookie(event.nativeEvent, "cooldown_active", "true", {
      maxAge: 60,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // 🟢 ใช้คุณสมบัติ data.url ที่คืนมาจาก Beam ในการ Redirect ผู้ชำระเงิน
    return new Response(JSON.stringify({ invoice_url: data.url }), {
      status: 200,
    });
  } catch (error) {
    safeLog("Internal Fatal Exception in Payment Controller", "ERROR", error);
    return new Response(
      JSON.stringify({ error: "ระบบทำงานหลังบ้านประมวลผลล้มเหลว" }),
      { status: 500 },
    );
  }
}
