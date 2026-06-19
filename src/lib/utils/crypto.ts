import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "crypto";

export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = a ?? "";
  const strB = b ?? "";

  const hashA = createHash("sha256").update(strA).digest();
  const hashB = createHash("sha256").update(strB).digest();

  return timingSafeEqual(hashA, hashB) && strA.length === strB.length;
}

// ฟังก์ชันสร้าง One-Time Token สำหรับส่งให้งาน Retry เบื้องหลังโดยอัตโนมัติ
export function generateOneTimeToken(): string {
  return randomBytes(16).toString("hex");
}

const getEncryptionKey = (): Buffer => {
  const secret =
    process.env.PII_ENCRYPTION_KEY || process.env.BEAM_WEBHOOK_SECRET;

  if (!secret || secret.trim() === "") {
    throw new Error(
      "CRITICAL SECURITY FAILURE: PII_ENCRYPTION_KEY or BEAM_WEBHOOK_SECRET is not configured. Encryption is halted.",
    );
  }

  return createHash("sha256").update(secret).digest();
};

export function encryptPII(text: string): string {
  if (!text) return "";
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex");

    return `${iv.toString("hex")}:${encrypted}:${tag}`;
  } catch (error) {
    console.error("[Crypto] Encryption failed:", error);
    return text;
  }
}

export function decryptPII(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], "hex");
    const key = getEncryptionKey();

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[Crypto] Decryption failed:", error);
    return "Anonymous";
  }
}
