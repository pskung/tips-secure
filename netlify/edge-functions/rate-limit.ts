import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  // กรองและบล็อกผู้ไม่ประสงค์ดีที่ส่งสแปมถี่เกินไปโดยตรงจากขอบเครือข่าย CDN
  return context.next();
};

export const config: Config = {
  path: [
    "/api/donate",
    "/api/admin/verify",
    "/api/admin/save"
  ],
  rateLimit: {
    windowLimit: 3,        // ยิงปุ่มส่งข้อมูลได้ไม่เกิน 3 ครั้ง
    windowSize: 60,        // ภายในระยะเวลา 60 วินาทีต่อหนึ่งไอพี
    aggregateBy: ["ip"]
  }
};
