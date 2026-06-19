import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // ดักตรวจสอบการ Bypass ทราฟฟิกฝั่งสร้าง Invoice ยอดบริจาค
  if (request.method === "POST" && url.pathname === "/api/donate") {
    const cookies = request.headers.get("cookie") || "";

    // 1. สกัดการยิงถล่มกรณีที่ติดคูลดาวน์หน่วงเวลา (60 วินาที)
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

    // 2. ตรวจจับและปฏิเสธทราฟฟิกยิง bypass ที่ไม่มี Session Cookie จากหน้าแรก
    if (!cookies || !cookies.includes("session_init=true")) {
      return new Response(
        JSON.stringify({
          error: "สกัดกั้นการเชื่อมต่ออัตโนมัติที่ผิดปกติ (Bypass Blocked) 🔒",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // ส่งผลลัพธ์ปกติกลับหากเป็นทราฟฟิกมีคุณภาพ
  const response = await context.next();

  // ตรวจสอบและฝังคุกกี้เริ่มต้น (session_init) ทันทีเมื่อผู้ใช้เข้ามาที่หน้าแรกสุดของพอร์ทัล
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
