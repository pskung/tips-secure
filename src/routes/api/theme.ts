import { APIEvent } from "@solidjs/start/server";
import defaultTheme from "~/lib/config/theme.json";

export async function GET(event: APIEvent) {
  try {
    const cloudflare = event.nativeEvent.context.cloudflare;
    const store = cloudflare.env.DONATION_STORE;
    const turnstileSiteKey = cloudflare.env.TURNSTILE_SITE_KEY || "";

    // [โยกย้าย]: ค้นหาธีมในรูปแบบ JSON จาก Cloudflare KV
    const theme = await store.get("personalized_theme", { type: "json" });
    const mergedTheme = { ...defaultTheme, ...(theme || {}) };

    return new Response(
      JSON.stringify({
        theme: mergedTheme,
        turnstileSiteKey,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        theme: defaultTheme,
        turnstileSiteKey: "",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  }
}
