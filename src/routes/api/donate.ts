import type { APIEvent } from "@solidjs/start/server";
import { setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { DonateInputSchema } from "~/lib/utils/schemas";
import { getStore } from "@netlify/blobs";

export async function POST(event: APIEvent) {
  const now = Date.now();

  try {
    const body = await event.request.json();

    const result = DonateInputSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0].message;
      return new Response(JSON.stringify({ error: firstError }), {
        status: 400,
      });
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

    let minDonationAmount = 10;
    try {
      const store = getStore("donation_store");
      const theme = (await store.get("personalized_theme", {
        type: "json",
      })) as any;
      if (theme && theme.minDonationAmount) {
        minDonationAmount = Number(theme.minDonationAmount);
      }
    } catch (err) {
      safeLog(
        "Dynamic validation fallback to 10 THB due to fetch failure",
        "WARN",
        err,
      );
    }

    if (amount < minDonationAmount) {
      return new Response(
        JSON.stringify({
          error: `Donation amount must be at least ${minDonationAmount} THB.`,
        }),
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
            "Security system is not fully initialized. Please contact administrator.",
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
        signal: AbortSignal.timeout(5000),
      },
    );

    const verifyData = await verifyResponse.json();
    if (!verifyData.success) {
      return new Response(
        JSON.stringify({
          error: "Security verification failed. Please try again.",
        }),
        { status: 400 },
      );
    }

    if (!process.env.BEAM_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "Payment gateway credentials are not configured.",
        }),
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
      process.env.BEAM_API_URL || "https://playground.api.beamcheckout.com";
    const authHeader = "Basic " + btoa(`${process.env.BEAM_API_KEY}:`);

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
      safeLog("Failed to generate Beam payment link", "ERROR", data);
      return new Response(
        JSON.stringify({ error: "Failed to generate payment link." }),
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
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
    });
  }
}
