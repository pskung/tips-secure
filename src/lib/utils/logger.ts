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
      sanitizedError =
        typeof rawError === "string" ? rawError : JSON.stringify(rawError);
    } catch {
      sanitizedError = "[UNPARSABLE_ERROR_DATA]";
    }
  }

  if (sanitizedError) {
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

    piiFields.forEach((field) => {
      const jsonRegex = new RegExp(`("${field}"\\s*:\\s*")[^"]+(")`, "gi");
      sanitizedError = sanitizedError.replace(jsonRegex, `$1[REDACTED_PII]$2`);

      const plainRegex = new RegExp(`(${field}\\s*[=:]\\s*)[^\\s"';,]+`, "gi");
      sanitizedError = sanitizedError.replace(
        plainRegex,
        `$1[REDACTED_SECRET]`,
      );
    });

    const authHeaderRegex =
      /(Authorization\s*:\s*(Bearer|Basic)\s+)[^\s"';,]+/gi;
    sanitizedError = sanitizedError.replace(
      authHeaderRegex,
      `$1[REDACTED_AUTH_TOKEN]`,
    );

    const queryParamRegex =
      /([?&](access_token|token|key|secret)=)[^&?\s"';,]+/gi;
    sanitizedError = sanitizedError.replace(
      queryParamRegex,
      `$1[REDACTED_CREDENTIAL]`,
    );
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
