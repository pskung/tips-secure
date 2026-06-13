import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // บล๊อกสแปมที่เลเยอร์ CDN (ทำงานโดยตรงที่ Edge ก่อนถึงตัวแอป SvelteKit)
  return context.next();
};

export const config: Config = {
  path: [
    "/api/donate",
    "/api/admin/verify",
    "/api/admin/save"
  ],
  rateLimit: {
    windowLimit: 3,        // อนุญาตสูงสุด 3 ครั้ง
    windowSize: 60,        // ต่อรอบเวลา 60 วินาที
    aggregateBy: ["ip"]    // คัดกรองและแบ่งสิทธิ์ราย IP
  }
};
