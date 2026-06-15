import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  return context.next();
};

export const config: Config = {
  path: [
    "/api/donate",
    "/api/admin/verify",
    "/api/admin/save"
  ],
  rateLimit: {
    windowLimit: 3,
    windowSize: 60,
    aggregateBy: ["ip"]
  }
};