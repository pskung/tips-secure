import { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { DonateInputSchema } from "~/lib/utils/schemas";

export async function POST(event: APIEvent) {
  const now = Date.now();
  try {
    const cloudflare = event.nativeEvent.context.cloudflare;
    const env = cloudflare.env;
    const store = env.DONATION_STORE;

    const body = await event.request.json();
    const result = DonateInputSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error.issues[0].message }),
        { status: 400 },
      );
    }

    const {
      name,
      amount,
      message,
      email_confirm,
      render_time,
      turnstile_token,
    } = result.data;

    if (email_confirm) {
      safeLog("Spam Bot Detected: Invisible honeypot trap triggered.", "WARN");
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

    let minDonationAmount = 10;
    try {
      // [โยกย้าย]: ค้นหาเกณฑ์ขั้นต่ำไดนามิกผ่านคลาวด์ KV
      const theme = (await store.get("personalized_theme", {
        type: "json",
      })) as any;
      if (theme && theme.minDonationAmount) {
        minDonationAmount = Number(theme.minDonationAmount);
      }
    } catch (err) {
      safeLog("Fallback to 10 THB due to KV fetch failure", "WARN", err);
    }

    if (amount < minDonationAmount) {
      return new Response(
        JSON.stringify({
          error: `Donation must be at least ${minDonationAmount} THB.`,
        }),
        { status: 400 },
      );
    }

    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) {
      return new Response(
        JSON.stringify({ error: "Security system not initialized." }),
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
        signal: AbortSignal.timeout(5000),
      },
    );

    const verifyData = await verifyResponse.json();
    if (!verifyData.success) {
      return new Response(
        JSON.stringify({ error: "Security verification failed." }),
        { status: 400 },
      );
    }

    if (!env.BEAM_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured." }),
        { status: 501 },
      );
    }

    const netAmountInSatang = Math.round(amount * 100);
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol =
      event.request.headers.get("x-forwarded-proto") || url.protocol;
    const siteUrl = `${protocol}://${host}/`;

    const beamUrl =
      env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
    const authHeader = "Basic " + btoa(`${env.BEAM_API_KEY}:`);

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
          netAmount: netAmountInSatang,
          description: `Support payment by ${name}`,
          referenceId: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
          internalNote: JSON.stringify({
            donor_name: name,
            donor_message: message || "",
          }),
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to generate payment link." }),
        { status: response.status },
      );
    }

    setCookie(event.nativeEvent, "cooldown_active", "true", {
      maxAge: 60,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return new Response(JSON.stringify({ invoice_url: data.url }), {
      status: 200,
    });
  } catch (error) {
    safeLog("Fatal exception in donate controller", "ERROR", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
    });
  }
}
