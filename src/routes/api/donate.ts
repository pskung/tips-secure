import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { DonateInputSchema } from "~/lib/utils/schemas"; // 🟢 นำเข้า Zod Schema เรียบร้อยแล้ว

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

    // 🟢 1. ใช้ Zod ทำการตรวจสอบประเภทตัวแปร ความยาว และโครงสร้างทั้งหมดในขั้นตอนเดียว
    const result = DonateInputSchema.safeParse(body);
    if (!result.success) {
      // ดึงเอาข้อความแจ้งเตือนข้อผิดพลาดแรกสุดส่งกลับหน้าจอทันที เช่น "ยอดเงินโดเนทขั้นต่ำต้องอยู่ระหว่าง 10 - 5,000 บาทค่ะ"
      const firstError = result.error.issues[0].message;
      return new Response(JSON.stringify({ error: firstError }), {
        status: 400,
      });
    }

    // ตัวแปรทุกตัวผ่านการรับประกันประเภทข้อมูลรันไทม์ (Type-Safe) จาก Zod เรียบร้อยแล้วค่ะ
    const {
      name,
      amount,
      message,
      email_confirm,
      render_time,
      turnstile_token,
    } = result.data;

    // 🟢 2. ระบบตรวจสอบสแปมบอทและอัตราความเร็วการพิมพ์
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

    // 🟢 3. ตรวจสอบ Cloudflare Turnstile Verification
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

    // 🟢 4. ตรวจสอบคุกกี้สกัดการโอนซ้ำรัวๆ
    const cooldownActive = getCookie(event.nativeEvent, "cooldown_active");
    if (cooldownActive === "true") {
      return new Response(
        JSON.stringify({ error: "กรุณารอ 1 นาทีก่อนทำรายการถัดไปน้า" }),
        { status: 429 },
      );
    }

    // 🟢 5. สกัดการเริ่มเปิดธุรกรรมหากเกตเวย์ Beam ข้อมูลไม่สมบูรณ์ [1]
    if (!process.env.BEAM_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ระบบยังไม่ได้ตั้งค่าคีย์รับเงินของ Beam หลังบ้านค่ะ",
        }),
        { status: 501 },
      );
    }

    // ทำการแปลงหน่วย THB เป็น Satang (สตางค์) และปัดเศษป้องการจุดทศนิยมผิดเพี้ยน [1]
    const netAmountInSatang = Math.round(amount * 100);

    const siteUrl = `${protocol}://${host}/`;
    const beamUrl =
      process.env.BEAM_API_URL || "https://playground.api.beamcheckout.com";

    const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);

    // ส่งคำขอสร้างลิงก์ชำระเงินกับ Beam API [1]
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
          netAmount: netAmountInSatang, // ส่งหน่วยสตางค์
          description: `VTuber tip by ${name}`,
          referenceId: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
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
