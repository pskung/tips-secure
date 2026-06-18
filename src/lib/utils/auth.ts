import type { APIEvent } from "@solidjs/start/server";
import { safeLog } from "~/lib/utils/logger";

export async function verifyAdminJWT(event: APIEvent): Promise<boolean> {
  const authHeader = event.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;

  const token = authHeader.substring(7);
  const url = new URL(event.request.url);
  const headers = event.request.headers;

  let host = headers.get("x-forwarded-host") || headers.get("host") || url.host;

  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    const fallbackUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    if (fallbackUrl) {
      try {
        const parsedFallback = new URL(fallbackUrl);
        host = parsedFallback.host;
      } catch {
        host = fallbackUrl.replace(/^https?:\/\//, "");
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
    `Admin authentication request routed to Gateway: ${identityUrl}`,
    "INFO",
  );

  try {
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
    } else {
      safeLog(
        `Identity Gateway returned status code ${res.status} for address: ${identityUrl}`,
        "WARN",
      );
    }
  } catch (err) {
    safeLog(
      `Failed to verify JWT with Netlify Identity Gateway at ${identityUrl}`,
      "ERROR",
      err,
    );
    return false;
  }
  return false;
}
