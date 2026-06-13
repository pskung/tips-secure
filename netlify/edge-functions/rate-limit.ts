import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // ดักจับและกรองสแปมบอทที่ชั้นขอบ CDN (Edge CDN Layer) ก่อนเข้าหลังบ้าน SvelteKit
  return context.next();
};

export const config: Config = {
  path: [
    "/api/donate",
    "/api/admin/verify",
    "/api/admin/save"
  ],
  rateLimit: {
    windowLimit: 3,        // อัตราส่งคำขอสูงสุด 3 ครั้ง
    windowSize: 60,        // ภายในระยะเวลา 60 วินาที
    aggregateBy: ["ip"]    // บันทึกและวิเคราะห์ค่าราย IP Address
  }
};
