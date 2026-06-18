// src/lib/utils/auth.ts
import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";

// 🟢 ยื่นสิทธิ์ประเมิน JWT เป็นศูนย์กลางหนึ่งเดียวของหลังบ้าน ป้องกันโค้ดซ้ำซ้อนในระบบ
export async function verifyAdminJWT(event: APIEvent): Promise<boolean> {
  const authHeader = event.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const url = new URL(event.request.url);
  const host = event.request.headers.get("host") || url.host;
  const protocol =
    event.request.headers.get("x-forwarded-proto") || url.protocol;

  try {
    const identityUrl = `${protocol}://${host}/.netlify/identity/user`;
    const res = await fetch(identityUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const user = await res.json();

      const allowedEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS;
      if (!allowedEmail || allowedEmail.trim() === "") {
        safeLog(
          "Security Block: ADMIN_EMAILS environment variable is missing on Netlify.",
          "ERROR",
        );
        return false;
      }

      const allowedEmails = allowedEmail
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email !== "");

      const userEmail = (user.email || "").trim().toLowerCase();
      const isAuthorized =
        userEmail !== "" && allowedEmails.includes(userEmail);

      if (!isAuthorized) {
        safeLog(
          `Security Block: Unauthorized OAuth user attempt locked. Email: ${user.email}`,
          "WARN",
        );
        return false;
      }

      return !!user.id;
    }
  } catch (err) {
    safeLog("Failed to verify JWT with Netlify Identity Gateway", "ERROR", err);
    return false;
  }
  return false;
}
