import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // 1. ตรวจสอบและดักกรองการสแปมที่หน้า Edge ทันทีเพื่อประหยัดเครดิตเซิร์ฟเวอร์ฟรี
  if (request.method === "POST" && url.pathname === "/api/donate") {
    const cookies = request.headers.get("cookie") || "";

    // หากผู้ชมกดรัวๆ (Bypass Cooldown) คุกกี้ cooldown_active จะสกัดไว้ที่ Edge ทันทีใน 0ms
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
  path: ["/api/donate", "/api/admin/verify", "/api/admin/save"],
  // 2. ปรับตัวแปร AggregateBy และเพิ่มขีดจำกัดเป็น 60 ครั้ง / นาที / IP
  // ตัวเลข 60 สูงพอที่ผู้ชม 20-30 คนใต้เครือข่ายมือถือเดียวกัน (CGNAT) จะกดพร้อมกันโดยไม่โดนบล็อก
  // แต่ยังต่ำพอที่จะสกัดกั้น Brute-Force Botnet ได้อย่างแข็งแกร่งค่ะ
  rateLimit: {
    windowLimit: 60,
    windowSize: 60,
    aggregateBy: ["ip"],
  },
};
