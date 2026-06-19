import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/donate") {
    const cookies = request.headers.get("cookie") || "";

    if (cookies.includes("cooldown_active=true")) {
      return new Response(
        JSON.stringify({
          error:
            "Please wait 1 minute before making another transaction (Edge Blocked) 🔒",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!cookies || !cookies.includes("session_init=true")) {
      return new Response(
        JSON.stringify({
          error:
            "Unauthorized automated connection detected (Bypass Blocked) 🔒",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  const response = await context.next();

  if (
    request.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/index")
  ) {
    response.headers.append(
      "Set-Cookie",
      "session_init=true; Path=/; HttpOnly; SameSite=Strict; Secure",
    );
  }

  return response;
};

export const config: Config = {
  path: ["/", "/index", "/api/donate", "/api/admin/save"],
  rateLimit: {
    windowLimit: 180,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
