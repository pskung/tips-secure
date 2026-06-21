export function safeLog(
  message: string,
  severity: "INFO" | "WARN" | "ERROR" = "INFO",
  rawError?: any,
) {
  let sanitizedError = "";

  if (rawError instanceof Error) {
    sanitizedError = rawError.stack || rawError.message;
  } else if (rawError) {
    try {
      const stringified =
        typeof rawError === "string" ? rawError : JSON.stringify(rawError);

      const piiFields = [
        "donor_name",
        "donor_message",
        "email",
        "password",
        "token",
        "access_token",
        "ADMIN_PASSWORD_HASH",
        "ADMIN_PASSWORD",
        "BEAM_API_KEY",
        "BEAM_WEBHOOK_SECRET",
      ];

      let sanitizedString = stringified;
      piiFields.forEach((field) => {
        const regex = new RegExp(`("${field}"\\s*:\\s*")[^"]+(")`, "gi");
        sanitizedString = sanitizedString.replace(regex, `$1[REDACTED_PII]$2`);
      });

      sanitizedError = sanitizedString;
    } catch {
      sanitizedError = "[UNPARSABLE_ERROR_DATA]";
    }
  }

  const logPayload = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    errorContext: sanitizedError || undefined,
  };

  if (severity === "ERROR") {
    console.error(JSON.stringify(logPayload));
  } else if (severity === "WARN") {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}
