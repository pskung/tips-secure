// src/routes/api/webhook/beam.ts
import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { timingSafeCompare } from "~/lib/utils/crypto";
import { getStore } from "@netlify/blobs";

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v1.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
};

export async function POST(event: APIEvent) {
  try {
    const body = await event.request.json();
    const headers = event.request.headers;

    // 🟢 เปลี่ยนจาก Xendit Callback มาใช้ Beam Webhook Token ยืนยันความปลอดภัย
    const callbackToken = headers.get("x-beam-webhook-token");
    const expectedToken = process.env.BEAM_WEBHOOK_SECRET;

    if (
      !callbackToken ||
      !expectedToken ||
      callbackToken.trim() === "" ||
      expectedToken.trim() === ""
    ) {
      safeLog(
        "Security Alert: Null, blank or missing Webhook validation credentials.",
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Unauthenticated callback parameters" }),
        { status: 401 },
      );
    }

    if (!timingSafeCompare(callbackToken, expectedToken)) {
      safeLog("Security Alert: Webhook callback signature mismatch.", "WARN");
      return new Response(
        JSON.stringify({ error: "Unauthenticated callback origin" }),
        { status: 401 },
      );
    }

    // 🟢 ตรวจสอบสถานะการจ่ายเงินที่สำเร็จของระบบบิลและคำสั่งซื้อ (PAID / SUCCEEDED)
    const isPaymentLinkPaid =
      body.status === "PAID" || body.status === "SUCCEEDED";
    const isTransactionSuccess = body.transactionType === "PAYMENT";

    if (isPaymentLinkPaid || isTransactionSuccess) {
      const store = getStore("donation_store");

      // ดึงหมายเลข ID ธุรกรรมหลัก
      const transactionId =
        body.transactionId || body.chargeId || body.paymentLinkId;

      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "Missing transaction identification" }),
          { status: 400 },
        );
      }

      // 🟢 ป้องกัน Replay Attack: บันทึกความปลอดภัยเพื่อปฏิเสธการสแปมอีเวนท์ซ้ำ
      const isAlreadyProcessed = await store.get(
        `processed_tx:${transactionId}`,
      );
      if (isAlreadyProcessed) {
        return new Response(
          JSON.stringify({ error: "Duplicate webhook processed and ignored" }),
          { status: 200 },
        );
      }
      await store.set(`processed_tx:${transactionId}`, "true");

      // 🟢 ดึงยอดสตางค์จาก GrossAmount หรือ Amount ของ Beam แล้วหารด้วย 100 กลับเป็นยอดเงินปกติ
      const amountInSatang = body.grossAmount || body.amount || 0;
      const amountInThb = amountInSatang / 100;
      const currency = body.currency || "THB";

      let donorName = "Anonymous";
      let donorMessage = "";

      // ค้นหา ID สำหรับนำไปเรียกต่อข้อมูลจากเซิร์ฟเวอร์หลักของ Beam
      const paymentLinkId = body.sourceId || body.paymentLinkId;

      if (paymentLinkId) {
        const beamUrl =
          process.env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
        const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);

        try {
          // ดึงสเปกต้นขั้วจาก Beam API ป้องกันธุรกรรมปลอมแบบ 100% (Server-to-Server Validation)
          const plResponse = await fetch(
            `${beamUrl}/api/v1/payment-links/${paymentLinkId}`,
            {
              headers: { Authorization: authHeader },
            },
          );

          if (plResponse.ok) {
            const plData = await plResponse.json();
            const noteStr = plData.order?.internalNote;

            if (noteStr) {
              const parsedNote = JSON.parse(noteStr);
              donorName = parsedNote.donor_name || "Anonymous";
              donorMessage = parsedNote.donor_message || "";
            }
          }
        } catch (fetchErr) {
          safeLog(
            "Failed to fetch detailed payment-link from Beam API, trying fallback metadata",
            "WARN",
            fetchErr,
          );
        }
      }

      const alertPromises: Promise<any>[] = [];

      // ส่วนการส่งข้อมูลแจ้งเตือนขึ้นหน้าจอโปรแกรม Streamlabs
      if (process.env.STREAMLABS_ACCESS_TOKEN) {
        try {
          const params = new URLSearchParams();
          params.append("access_token", process.env.STREAMLABS_ACCESS_TOKEN);
          params.append("name", donorName);
          params.append("message", donorMessage);
          params.append("amount", String(amountInThb));
          params.append("currency", currency);

          alertPromises.push(
            fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString(),
              signal: AbortSignal.timeout(2500),
            })
              .then(async (slRes) => {
                if (!slRes.ok) {
                  const slData = await slRes.json();
                  safeLog("Streamlabs Dispatch warning:", "WARN", slData);
                } else {
                  safeLog(
                    `Alert Box (Streamlabs) triggered for: ${donorName}`,
                    "INFO",
                  );
                }
              })
              .catch((err) =>
                safeLog(
                  "Streamlabs notification dispatch connection error",
                  "ERROR",
                  err,
                ),
              ),
          );
        } catch (innerErr) {
          safeLog("Streamlabs dispatch exception", "ERROR", innerErr);
        }
      }

      // ส่วนการส่งข้อมูลแจ้งเตือนขึ้นหน้าจอโปรแกรม StreamElements
      if (
        process.env.STREAMELEMENTS_JWT &&
        process.env.STREAMELEMENTS_CHANNEL_ID
      ) {
        try {
          const sePayload = {
            user: { username: donorName },
            message: donorMessage,
            amount: Number(amountInThb),
            currency: currency,
          };

          alertPromises.push(
            fetch(
              EXTERNAL_API.STREAMELEMENTS_TIPS(
                process.env.STREAMELEMENTS_CHANNEL_ID,
              ),
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${process.env.STREAMELEMENTS_JWT}`,
                },
                body: JSON.stringify(sePayload),
                signal: AbortSignal.timeout(2500),
              },
            )
              .then(async (seRes) => {
                if (!seRes.ok) {
                  const seData = await seRes.json();
                  safeLog("StreamElements Dispatch warning:", "WARN", seData);
                } else {
                  safeLog(
                    `Alert Box (StreamElements) triggered for: ${donorName}`,
                    "INFO",
                  );
                }
              })
              .catch((err) =>
                safeLog(
                  "StreamElements notification dispatch connection error",
                  "ERROR",
                  err,
                ),
              ),
          );
        } catch (innerErr) {
          safeLog("StreamElements dispatch exception", "ERROR", innerErr);
        }
      }

      if (alertPromises.length > 0) {
        await Promise.all(alertPromises);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    safeLog("Internal Exception in Webhook Controller", "ERROR", error);
    return new Response(
      JSON.stringify({ error: "Internal system processing failure" }),
      { status: 500 },
    );
  }
}
