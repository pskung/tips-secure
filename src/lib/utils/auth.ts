import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";

export async function verifyAdminJWT(event: APIEvent): Promise<boolean> {
  safeLog("[Auth Debug] verifyAdminJWT function called.", "INFO");

  const authHeader = event.request.headers.get("Authorization");
  if (!authHeader) {
    safeLog(
      "[Auth Debug] Failed: Authorization header is completely missing.",
      "WARN",
    );
    return false;
  }

  if (!authHeader.startsWith("Bearer ")) {
    safeLog(
      `[Auth Debug] Failed: Authorization header does not start with Bearer. Received: "${authHeader.substring(0, 15)}..."`,
      "WARN",
    );
    return false;
  }

  const token = authHeader.substring(7);
  if (!token || token.trim() === "") {
    safeLog("[Auth Debug] Failed: Token inside Bearer is empty.", "WARN");
    return false;
  }

  const url = new URL(event.request.url);
  const headers = event.request.headers;

  let host = headers.get("x-forwarded-host") || headers.get("host") || url.host;
  safeLog(`[Auth Debug] Initial host resolved as: "${host}"`, "INFO");

  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    const fallbackUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    safeLog(
      `[Auth Debug] Host is local. Attempting fallback. DEPLOY_PRIME_URL: "${process.env.DEPLOY_PRIME_URL}", URL: "${process.env.URL}"`,
      "INFO",
    );
    if (fallbackUrl) {
      try {
        const parsedFallback = new URL(fallbackUrl);
        host = parsedFallback.host;
        safeLog(`[Auth Debug] Fallback resolved host to: "${host}"`, "INFO");
      } catch {
        host = fallbackUrl.replace(/^https?:\/\//, "");
        safeLog(
          `[Auth Debug] Fallback regex resolved host to: "${host}"`,
          "INFO",
        );
      }
    }
  }

  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("localhost:3000");
  const protocol = isLocal ? "http" : "https";
  const identityUrl = `${protocol}://${host}/.netlify/identity/user`;

  safeLog(
    `[Auth Debug] Triggering fetch to Identity Gateway: ${identityUrl}`,
    "INFO",
  );

  try {
    const res = await fetch(identityUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    safeLog(
      `[Auth Debug] Identity Gateway response status: ${res.status} (${res.statusText})`,
      "INFO",
    );

    if (!res.ok) {
      const errorText = await res.text().catch(() => "No error body");
      safeLog(
        `[Auth Debug] Failed: Identity Gateway rejected token with status ${res.status}. Body: "${errorText.substring(0, 100)}"`,
        "WARN",
      );
      return false;
    }

    const user = await res.json();
    safeLog(
      `[Auth Debug] User authenticated. ID: "${user.id}", Email: "${user.email}"`,
      "INFO",
    );

    const allowedEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS;
    safeLog(
      `[Auth Debug] Raw ADMIN_EMAILS env value: "${allowedEmail}"`,
      "INFO",
    );

    if (!allowedEmail || allowedEmail.trim() === "") {
      safeLog(
        "[Auth Debug] Failed: ADMIN_EMAILS environment variable is completely empty or missing.",
        "ERROR",
      );
      return false;
    }

    // 🟢 ดักกรองเครื่องหมายคำพูดเดี่ยวและคู่ออกอัตโนมัติ (Clean quotes error)
    const allowedEmails = allowedEmail
      .replace(/['"]/g, "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== "");

    safeLog(
      `[Auth Debug] Whitelisted emails parsed as: ${JSON.stringify(allowedEmails)}`,
      "INFO",
    );

    const userEmail = (user.email || "").trim().toLowerCase();
    const isAuthorized = userEmail !== "" && allowedEmails.includes(userEmail);

    if (!isAuthorized) {
      safeLog(
        `[Auth Debug] Failed: Email "${userEmail}" is not in the whitelist.`,
        "WARN",
      );
      return false;
    }

    safeLog(`[Auth Debug] Success: Access granted to "${userEmail}"`, "INFO");
    return !!user.id;
  } catch (err) {
    safeLog(
      `[Auth Debug] Exception caught in verifyAdminJWT: ${err instanceof Error ? err.message : String(err)}`,
      "ERROR",
      err,
    );
    return false;
  }
}
