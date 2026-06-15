export function safeLog(message: string, severity: "INFO" | "WARN" | "ERROR" = "INFO", rawError?: any) {
  const logPayload = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    errorContext: rawError instanceof Error ? rawError.stack || rawError.message : undefined
  };

  if (severity === "ERROR") {
    console.error(JSON.stringify(logPayload));
  } else if (severity === "WARN") {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}