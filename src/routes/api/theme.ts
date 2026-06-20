import { APIEvent } from "@solidjs/start/server";
import { getStore } from "@netlify/blobs";
import { safeLog } from "~/lib/utils/logger";
import defaultTheme from "~/lib/config/theme.json";

export async function GET(event: APIEvent) {
  try {
    const store = getStore({ name: "donation_store" });
    const theme = (await store.get("personalized_theme", {
      type: "json",
    })) as any;

    const mergedTheme = { ...defaultTheme, ...(theme || {}) };

    return new Response(
      JSON.stringify({
        theme: mergedTheme,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
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
    safeLog("Failed to fetch theme in API, fallback to default", "WARN", error);
    return new Response(
      JSON.stringify({
        theme: defaultTheme,
        turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
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
