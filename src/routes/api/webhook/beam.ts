import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";
import { timingSafeCompare, encryptPII } from "~/lib/utils/crypto";
import { getStore } from "@netlify/blobs";

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
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

      const store = getStore({ name: "donation_store", consistency: "strong" });

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
        if (paymentLinkId) {
          const beamUrl =
            process.env.BEAM_API_URL ||
            "https://playground.api.beamcheckout.com";
          const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);
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
              const noteStr = plData.order?.internalNote;
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

      if (process.env.STREAMLABS_ACCESS_TOKEN) {
        const params = new URLSearchParams();
        params.append("access_token", process.env.STREAMLABS_ACCESS_TOKEN);
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

      if (
        process.env.STREAMELEMENTS_JWT &&
        process.env.STREAMELEMENTS_CHANNEL_ID
      ) {
        const sePayload = {
          user: { username: donorName },
          message: donorMessage,
          amount: Number(amountInThb),
          currency,
        };
        fastPathPromises.push(
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

      const now = Date.now();
      if (slSuccess && seSuccess) {
        await store.set(`processed_tx:${transactionId}`, "success");
        await store.set(`tx_log:${now}:${transactionId}`, "success");
        safeLog(`Fast-Path success and indexed: ${transactionId}`, "INFO");
      } else {
        const alertTask = {
          transactionId,
          donorName: encryptPII(donorName),
          donorMessage: encryptPII(donorMessage),
          amountInThb,
          currency,
          createdAt: now,
          isEncrypted: true,
        };
        await store.setJSON(`failed_alert:${transactionId}`, alertTask);

        const url = new URL(event.request.url);
        const host = headers.get("host") || url.host;
        const protocol = headers.get("x-forwarded-proto") || url.protocol;
        fetch(
          `${protocol}://${host}/.netlify/functions/alert-retry-background`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId }),
            signal: AbortSignal.timeout(500),
          },
        ).catch(() => {});
      }
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    safeLog("Fatal Webhook Controller Error", "ERROR", error);
    return new Response(JSON.stringify({ error: "Fail" }), { status: 500 });
  }
}
