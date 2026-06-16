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

    const callbackToken = headers.get("x-beam-webhook-token");
    const expectedToken = process.env.BEAM_WEBHOOK_SECRET;

    if (
      !callbackToken ||
      !expectedToken ||
      callbackToken.trim() === "" ||
      expectedToken.trim() === ""
    ) {
      safeLog(
        "Security Alert: Missing Webhook validation credentials.",
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

    const isPaymentLinkPaid =
      body.status === "PAID" || body.status === "SUCCEEDED";
    const isTransactionSuccess = body.transactionType === "PAYMENT";

    if (isPaymentLinkPaid || isTransactionSuccess) {
      const store = getStore("donation_store");
      const transactionId =
        body.transactionId || body.chargeId || body.paymentLinkId;

      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "Missing transaction identification" }),
          { status: 400 },
        );
      }

      const txKey = `processed_tx:${transactionId}`;

      try {
        // 🟢 เปลี่ยนมาใช้ตัวเลือก onlyIfNew เพื่อเขียนคีย์ธุรกรรมแบบ Atomic ป้องกันสัญญาณแข่งกันประมวลผลล่ม 100%
        await store.setJSON(
          txKey,
          { expiresAt: Date.now() + 1000 * 60 * 60 * 48 }, // เก็บไว้ตรวจสอบ 48 ชั่วโมง
          { onlyIfNew: true },
        );
      } catch (writeError: any) {
        // คีย์มีอยู่แล้ว บ่งบอกว่าเสี้ยววินาทีเดียวกันมี Webhook อีกเส้นบันทึกธุรกรรมนี้สำเร็จแล้ว ให้ตีกลับ 200 OK ทันที
        safeLog(
          `Atomic collision resolved. Duplicate webhook blocked: ${transactionId}`,
          "INFO",
        );
        return new Response(
          JSON.stringify({ error: "Duplicate webhook processed and ignored" }),
          { status: 200 },
        );
      }

      const amountInSatang = body.grossAmount || body.amount || 0;
      const amountInThb = amountInSatang / 100;
      const currency = body.currency || "THB";

      let donorName = "Anonymous";
      let donorMessage = "";

      const paymentLinkId = body.sourceId || body.paymentLinkId;

      if (paymentLinkId) {
        const beamUrl =
          process.env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
        const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);

        try {
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
            "Failed to fetch detailed payment-link from Beam API",
            "WARN",
            fetchErr,
          );
        }
      }

      const alertPromises: Promise<any>[] = [];

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

      // 🟢 รันขั้นตอนส่งข้อมูลขึ้นหน้าจอโดเนทแบบ Non-blocking Async Background Task ทันที ป้องกันเซิร์ฟเวอร์ค้างรอระบบส่งแจ้งเตือนตอบสนอง
      if (alertPromises.length > 0) {
        Promise.all(alertPromises).catch((err) =>
          safeLog(
            "Asynchronous Background Alerts pipeline caught error:",
            "ERROR",
            err,
          ),
        );
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
