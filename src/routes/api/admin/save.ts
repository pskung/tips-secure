import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";
import { createHmac } from "crypto";
import { timingSafeCompare } from "~/lib/utils/crypto";
import { z } from "zod";

// ประกาศการรวบยอดตรวจสอบความสมบูรณ์ปลอดภัยของข้อมูลแผงสตรีมเมอร์ผ่าน Zod Schema
const themeSchema = z.object({
  mainFontFamily: z
    .string()
    .regex(/^[a-zA-Z0-9\u0e00-\u0e7f\s-]+$/, "Invalid font family characters")
    .max(50),
  vtuberName: z.string().min(1).max(100),
  welcomeText: z.string().min(1).max(1000),
  bgType: z.enum(["solid", "image"]),
  bgColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  cardBgColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  generalTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  inputBgColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  inputTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  submitBtnColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),
  submitBtnTextColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color format"),

  avatarUrl: z.string().url().or(z.literal("")).optional(),
  bannerUrl: z.string().url().or(z.literal("")).optional(),
  bgUrl: z.string().url().or(z.literal("")).optional(),
  nameColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .or(z.literal(""))
    .optional(),
  inputBorderColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .or(z.literal(""))
    .optional(),
  cardBorderColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .or(z.literal(""))
    .optional(),
  presetBorderColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .or(z.literal(""))
    .optional(),
  youtubeUrl: z.string().url().or(z.literal("")).optional(),
  twitchUrl: z.string().url().or(z.literal("")).optional(),
  discordUrl: z.string().url().or(z.literal("")).optional(),
  xUrl: z.string().url().or(z.literal("")).optional(),
  facebookUrl: z.string().url().or(z.literal("")).optional(),
  instagramUrl: z.string().url().or(z.literal("")).optional(),
  tiktokUrl: z.string().url().or(z.literal("")).optional(),

  presetAmounts: z.array(z.number().min(10).max(5000)).length(4),
});

export async function POST(event: APIEvent) {
  try {
    const origin = event.request.headers.get("origin");
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol =
      event.request.headers.get("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin || origin !== expectedOrigin) {
      safeLog(
        `Security Alert: CSRF Blocked on Admin Save from ${origin}`,
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Rejected Cross-Origin action" }),
        { status: 403 },
      );
    }

    // เรียกอ่านคุกกี้ระดับ Prefix คุ้มครองสูง
    const rawToken = getCookie(event.nativeEvent, "__Host-admin_session_token");
    if (!rawToken) {
      return new Response(
        JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการค่ะ" }),
        { status: 401 },
      );
    }

    const dotIndex = rawToken.indexOf(".");
    if (dotIndex === -1) {
      return new Response(
        JSON.stringify({ error: "โครงสร้างเซสชันคุกกี้ไม่ถูกต้อง" }),
        { status: 401 },
      );
    }

    const expiresAtStr = rawToken.substring(0, dotIndex);
    const clientSignature = rawToken.substring(dotIndex + 1);
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) {
      setCookie(event.nativeEvent, "__Host-admin_session_token", "", {
        maxAge: 0,
        path: "/",
      });
      return new Response(
        JSON.stringify({
          error: "หมดอายุการเข้าใช้งานระบบกรุณาล็อกอินใหม่อีกครั้งค่ะ",
        }),
        { status: 401 },
      );
    }

    const expectedPassword = process.env.ADMIN_PASSWORD || "";
    const expectedSignature = createHmac("sha256", expectedPassword)
      .update(expiresAtStr)
      .digest("hex");

    if (!timingSafeCompare(clientSignature, expectedSignature)) {
      setCookie(event.nativeEvent, "__Host-admin_session_token", "", {
        maxAge: 0,
        path: "/",
      });
      return new Response(
        JSON.stringify({
          error: "ไม่พบข้อมูลเซสชัน กรุณาล็อกอินใหม่อีกครั้งค่ะ",
        }),
        { status: 401 },
      );
    }

    const { config: newTheme } = await event.request.json();

    // ดึงกลไกตรวจสอบความปลอดภัยของ Zod เข้ามาป้องกันตัวแทนลูปแมนนวลอย่างรวดเร็ว
    const validation = themeSchema.safeParse(newTheme);
    if (!validation.success) {
      safeLog(
        "Security Alert: Malformed theme config payload rejected",
        "WARN",
        validation.error,
      );
      return new Response(
        JSON.stringify({
          error: "พารามิเตอร์การตกแต่งมีความเสี่ยงด้านความปลอดภัย",
        }),
        { status: 400 },
      );
    }

    const store = getStore("donation_store");
    await store.setJSON("vtuber_personalized_theme", validation.data);

    safeLog("Admin settings saved successfully.", "INFO");
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    safeLog(
      "Exception occurred during admin settings storage save",
      "ERROR",
      err,
    );
    return new Response(
      JSON.stringify({ error: "เกิดปัญหาขัดข้องทางเทคนิคขณะจัดเก็บข้อมูลธีม" }),
      { status: 500 },
    );
  }
}
