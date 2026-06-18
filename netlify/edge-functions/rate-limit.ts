import type { Config, Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/api/donate") {
    const cookies = request.headers.get("cookie") || "";

    // [Layer 2] สกัดกั้นผู้ชมทั่วไปที่กดเบิ้ลซ้ำด้วย Cookie Cooldown (ความเร็ว 0ms)
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
  // [Layer 1] บล็อกคลื่นพายุสแปม DDoS ไม่ให้เข้าถึงเซิร์ฟเวอร์หลังบ้าน
  rateLimit: {
    windowLimit: 180, // ลิมิตสูงสุด 180 คำขอ
    windowSize: 60, // ต่อ 60 วินาที
    aggregateBy: ["ip", "domain"], // จัดกลุ่มและตรวจสอบผ่าน IP รายตัว
  },
};
