import type { APIEvent } from "@solidjs/start/server";
import { getCookie, setCookie } from "vinxi/http";
import { safeLog } from "~/lib/utils/logger";
import { getStore } from "@netlify/blobs";

// 🟢 ตัวกรองสไตล์ที่เพิ่มระบบดักจับและตรวจสอบความถูกต้องรหัสสีของช่องกรอกข้อมูล
function validateTheme(theme: any): boolean {
  if (!theme || typeof theme !== "object") return false;

  const requiredStrings = [
    "vtuberName",
    "bgColor",
    "welcomeText",
    "nicknamePlaceholder",
    "messagePlaceholder",
    "amountPlaceholder",
    "submitBtnColor",
    "submitBtnTextColor",
    "submitBtnText",
    "generalTextColor",
    "cardBgColor",
    "inputBgColor",
    "inputTextColor",
  ];

  for (const key of requiredStrings) {
    if (typeof theme[key] !== "string") return false;
  }

  const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const colorKeys = [
    "bgColor",
    "inputBgColor",
    "inputTextColor",
    "inputBorderColor",
    "cardBorderColor",
    "cardBgColor",
    "submitBtnColor",
    "submitBtnTextColor",
    "generalTextColor",
  ];

  for (const key of colorKeys) {
    if (theme[key] && !hexColorRegex.test(theme[key])) return false;
  }

  if (!Array.isArray(theme.presetAmounts) || theme.presetAmounts.length !== 4)
    return false;
  for (const amt of theme.presetAmounts) {
    if (typeof amt !== "number" || amt < 10 || amt > 5000) return false;
  }

  return true;
}

export async function POST(event: APIEvent) {
  try {
    const origin = event.request.headers.get("origin");
    const url = new URL(event.request.url);
    const host = event.request.headers.get("host") || url.host;
    const protocol =
      event.request.headers.get("x-forwarded-proto") || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (!origin) {
      return new Response(
        JSON.stringify({
          error: "Missing required Origin verification header",
        }),
        { status: 400 },
      );
    }

    if (origin !== expectedOrigin) {
      safeLog(
        `Security Alert: CSRF Blocked on Admin Save from ${origin}`,
        "WARN",
      );
      return new Response(
        JSON.stringify({ error: "Rejected Cross-Origin action" }),
        { status: 403 },
      );
    }

    const rawToken = getCookie(event.nativeEvent, "admin_session_token");
    if (!rawToken) {
      return new Response(
        JSON.stringify({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการค่ะ" }),
        { status: 401 },
      );
    }

    const parts = rawToken.split(":");
    if (parts.length !== 2) {
      return new Response(
        JSON.stringify({ error: "โครงสร้างเซสชันคุกกี้ไม่ถูกต้อง" }),
        { status: 401 },
      );
    }

    const [expiresAtStr, sessionToken] = parts;
    const expiresAt = Number(expiresAtStr);

    if (Date.now() > expiresAt) {
      safeLog(`Admin session expired for token: ${sessionToken}`, "WARN");
      setCookie(event.nativeEvent, "admin_session_token", "", {
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

    const store = getStore("donation_store");
    const sessionExists = await store.get(
      `session:${expiresAt}:${sessionToken}`,
    );

    if (!sessionExists) {
      safeLog(
        `Admin session rejected or not found for token: ${sessionToken}`,
        "WARN",
      );
      setCookie(event.nativeEvent, "admin_session_token", "", {
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

    if (!validateTheme(newTheme)) {
      safeLog(
        "Security Alert: Malformed theme config payload rejected",
        "WARN",
      );
      return new Response(
        JSON.stringify({
          error: "พารามิเตอร์การตกแต่งมีความเสี่ยงด้านความปลอดภัย",
        }),
        { status: 400 },
      );
    }

    await store.setJSON("vtuber_personalized_theme", newTheme);

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
