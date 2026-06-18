import { getStore } from "@netlify/blobs";
import { decryptPII } from "../../src/lib/utils/crypto";

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: "https://streamlabs.com/api/v2.0/donations",
  STREAMELEMENTS_TIPS: (channelId: string) =>
    `https://api.streamelements.com/kappa/v2/tips/${channelId}`,
};

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) {
      return new Response("Missing transaction identification", {
        status: 400,
      });
    }

    console.log(`[Background Retry] Loop started for ${transactionId}`);
    const store = getStore("donation_store");

    const alertData = (await store.get(`failed_alert:${transactionId}`, {
      type: "json",
    })) as any;
    if (!alertData) {
      console.log(
        `[Background Retry] Alert not found or already finished: ${transactionId}`,
      );
      return new Response("Done", { status: 200 });
    }

    const donorName = decryptPII(alertData.donorName);
    const donorMessage = decryptPII(alertData.donorMessage);
    const { amountInThb, currency } = alertData;

    let slSuccess = false;
    let seSuccess = false;

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `[Background Retry] Attempt ${attempt}/${maxRetries} for ${transactionId}`,
      );
      const promises: Promise<any>[] = [];

      if (process.env.STREAMLABS_ACCESS_TOKEN && !slSuccess) {
        const params = new URLSearchParams();
        params.append("access_token", process.env.STREAMLABS_ACCESS_TOKEN);
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
            .catch((err) =>
              console.error("[Background Retry] Streamlabs error:", err),
            ),
        );
      } else {
        slSuccess = true;
      }

      if (
        process.env.STREAMELEMENTS_JWT &&
        process.env.STREAMELEMENTS_CHANNEL_ID &&
        !seSuccess
      ) {
        const sePayload = {
          user: { username: donorName },
          message: donorMessage,
          amount: Number(amountInThb),
          currency,
        };
        promises.push(
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
              signal: AbortSignal.timeout(5000),
            },
          )
            .then((res) => {
              if (res.ok) seSuccess = true;
            })
            .catch((err) =>
              console.error("[Background Retry] StreamElements error:", err),
            ),
        );
      } else {
        seSuccess = true;
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

    const now = Date.now();
    if (slSuccess && seSuccess) {
      await store.set(`processed_tx:${transactionId}`, "success");
      await store.set(`tx_log:${now}:${transactionId}`, "success");
      await store.delete(`failed_alert:${transactionId}`);
      console.log(
        `[Background Retry] Alert successfully completed for ${transactionId}`,
      );
    } else {
      await store.set(`processed_tx:${transactionId}`, "failed");
      await store.set(`tx_log:${now}:${transactionId}`, "failed");
      await store.delete(`failed_alert:${transactionId}`);
      console.error(
        `[Background Retry] Permanently failed for ${transactionId}`,
      );
    }

    return new Response("Retry process completed", { status: 200 });
  } catch (error) {
    console.error("[Background Retry] Fatal crash:", error);
    return new Response("Fail", { status: 500 });
  }
};

export const config = {
  background: true,
};
