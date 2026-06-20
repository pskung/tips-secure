import { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { timingSafeCompare } from "~/lib/utils/crypto";

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
};

// ฟังก์ชันซ่อมสัญญาณอัตโนมัติในหน่วยความจำ Workers Edge ผ่านระบบ waitUntil()
async function retryAlertInBackground(
  env: any,
  transactionId: string,
  donorName: string,
  donorMessage: string,
  amountInThb: number,
  currency: string,
) {
  const store = env.DONATION_STORE;
  let slSuccess = !env.STREAMLABS_ACCESS_TOKEN;
  let seSuccess = !(env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const promises: Promise<any>[] = [];

    if (env.STREAMLABS_ACCESS_TOKEN && !slSuccess) {
      const params = new URLSearchParams();
      params.append("access_token", env.STREAMLABS_ACCESS_TOKEN);
      params.append("name", donorName);
      params.append("message", donorMessage);
      params.append("amount", String(amountInThb));
      params.append("currency", currency);

      promises.push(
        fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => {
            if (res.ok) slSuccess = true;
          })
          .catch(() => {}),
      );
    }

    if (env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID && !seSuccess) {
      const sePayload = {
        user: { username: donorName },
        message: donorMessage,
        amount: Number(amountInThb),
        currency,
      };
      promises.push(
        fetch(EXTERNAL_API.STREAMELEMENTS_TIPS(env.STREAMELEMENTS_CHANNEL_ID), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.STREAMELEMENTS_JWT}`,
          },
          body: JSON.stringify(sePayload),
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => {
            if (res.ok) seSuccess = true;
          })
          .catch(() => {}),
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (slSuccess && seSuccess) break;

    if (attempt < maxRetries) {
      const backoffTime = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, backoffTime));
    }
  }

  // [โยกย้าย]: บันทึกสถานะพร้อมระบบระบุลบล้างคีย์อัตโนมัติใน 7 วัน (604800 วินาที)
  if (slSuccess && seSuccess) {
    await store.put(`processed_tx:${transactionId}`, "success", {
      expirationTtl: 604800,
    });
    safeLog(`Background Retry Success: ${transactionId}`, "INFO");
  } else {
    await store.put(`processed_tx:${transactionId}`, "failed", {
      expirationTtl: 604800,
    });
    safeLog(`Background Retry Permanently Failed: ${transactionId}`, "ERROR");
  }
}

export async function POST(event: APIEvent) {
  try {
    const cloudflare = event.nativeEvent.context.cloudflare;
    const env = cloudflare.env;
    const store = env.DONATION_STORE;
    const ctx = cloudflare.context;

    const body = await event.request.json();
    const headers = event.request.headers;

    const callbackToken = headers.get("x-beam-webhook-token");
    const expectedToken = env.BEAM_WEBHOOK_SECRET;

    if (
      !callbackToken ||
      !expectedToken ||
      callbackToken.trim() === "" ||
      expectedToken.trim() === ""
    ) {
      safeLog("Security Alert: Null or missing Webhook credentials.", "WARN");
      return new Response(JSON.stringify({ error: "Unauthenticated" }), {
        status: 401,
      });
    }

    if (!timingSafeCompare(callbackToken, expectedToken)) {
      safeLog("Security Alert: Webhook callback signature mismatch.", "WARN");
      return new Response(JSON.stringify({ error: "Unauthenticated origin" }), {
        status: 401,
      });
    }

    const isPaymentLinkPaid =
      body.status === "PAID" || body.status === "SUCCEEDED";
    const isTransactionSuccess = body.transactionType === "PAYMENT";

    if (isPaymentLinkPaid || isTransactionSuccess) {
      const transactionId =
        body.transactionId || body.chargeId || body.paymentLinkId;
      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "Missing transaction ID" }),
          { status: 400 },
        );
      }

      const isAlreadyProcessed = await store.get(
        `processed_tx:${transactionId}`,
      );
      if (isAlreadyProcessed) {
        return new Response(
          JSON.stringify({ success: true, message: "Duplicate skipped" }),
          { status: 200 },
        );
      }

      let donorName = "Anonymous";
      let donorMessage = "";
      const amountInThb = (body.grossAmount || body.amount || 0) / 100;
      const currency = body.currency || "THB";

      const orderNote = body.order?.internalNote || body.internalNote;
      if (orderNote) {
        try {
          const parsedNote = JSON.parse(orderNote);
          donorName = parsedNote.donor_name || "Anonymous";
          donorMessage = parsedNote.donor_message || "";
        } catch {
          donorName = orderNote || "Anonymous";
        }
      } else {
        const paymentLinkId = body.sourceId || body.paymentLinkId;
        if (paymentLinkId && env.BEAM_API_KEY) {
          const beamUrl =
            env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
          const authHeader = "Basic " + btoa(`${env.BEAM_API_KEY}:`);
          try {
            const plResponse = await fetch(
              `${beamUrl}/api/v1/payment-links/${paymentLinkId}`,
              {
                headers: { Authorization: authHeader },
                signal: AbortSignal.timeout(1500),
              },
            );
            if (plResponse.ok) {
              const plData = await plResponse.json();
              const noteStr = plData?.order?.internalNote;
              if (noteStr) {
                try {
                  const parsedNote = JSON.parse(noteStr);
                  donorName = parsedNote.donor_name || "Anonymous";
                  donorMessage = parsedNote.donor_message || "";
                } catch {
                  donorName = noteStr || "Anonymous";
                }
              }
            }
          } catch (err) {
            safeLog("Beam API fallback GET error", "WARN", err);
          }
        }
      }

      let slSuccess = false;
      let seSuccess = false;
      const fastPathPromises: Promise<any>[] = [];

      if (env.STREAMLABS_ACCESS_TOKEN) {
        const params = new URLSearchParams();
        params.append("access_token", env.STREAMLABS_ACCESS_TOKEN);
        params.append("name", donorName);
        params.append("message", donorMessage);
        params.append("amount", String(amountInThb));
        params.append("currency", currency);

        fastPathPromises.push(
          fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
            signal: AbortSignal.timeout(800),
          })
            .then((res) => {
              if (res.ok) slSuccess = true;
            })
            .catch(() => {}),
        );
      } else {
        slSuccess = true;
      }

      if (env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID) {
        const sePayload = {
          user: { username: donorName },
          message: donorMessage,
          amount: Number(amountInThb),
          currency,
        };
        fastPathPromises.push(
          fetch(
            EXTERNAL_API.STREAMELEMENTS_TIPS(env.STREAMELEMENTS_CHANNEL_ID),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.STREAMELEMENTS_JWT}`,
              },
              body: JSON.stringify(sePayload),
              signal: AbortSignal.timeout(800),
            },
          )
            .then((res) => {
              if (res.ok) seSuccess = true;
            })
            .catch(() => {}),
        );
      } else {
        seSuccess = true;
      }

      if (fastPathPromises.length > 0) {
        await Promise.all(fastPathPromises);
      }

      // [โยกย้าย]: บันทึกธุรกรรมพร้อมระบบทำลายคีย์ตัวเองอัตโนมัติใน 7 วัน (604800 วินาที)
      if (slSuccess && seSuccess) {
        await store.put(`processed_tx:${transactionId}`, "success", {
          expirationTtl: 604800,
        });
        safeLog(`Fast-Path success: ${transactionId}`, "INFO");
      } else {
        // อนุมัติและสั่งรันระบบ Retries ซ่อมแซมแบบอะซิงโครนัสในแรม Edge
        await store.put(`processed_tx:${transactionId}`, "retry_pending", {
          expirationTtl: 604800,
        });

        ctx.waitUntil(
          retryAlertInBackground(
            env,
            transactionId,
            donorName,
            donorMessage,
            amountInThb,
            currency,
          ),
        );
      }
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    safeLog("Fatal Webhook Controller Error", "ERROR", error);
    return new Response(JSON.stringify({ error: "Fail" }), { status: 500 });
  }
}
