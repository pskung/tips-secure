import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/donate") {
    const cookies = request.headers.get("cookie") || "";

    if (cookies.includes("cooldown_active=true")) {
      return new Response(
        JSON.stringify({
          error: "กรุณารอ 1 นาทีก่อนทำรายการถัดไปน้า (Edge Blocked) 🔒",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return context.next();
};

export const config: Config = {
  path: ["/api/donate", "/api/admin/save"],
  rateLimit: {
    windowLimit: 180,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
