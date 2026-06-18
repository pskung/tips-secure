import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = typeof a === "string" ? a : "";
  const strB = typeof b === "string" ? b : "";

  const hashA = createHash("sha256").update(strA).digest();
  const hashB = createHash("sha256").update(strB).digest();

  if (hashA.length !== hashB.length) return false;

  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }

  return diff === 0 && strA.length === strB.length;
}

// 🟢 ฟังก์ชันจัดสรรคีย์ขนาด 32 ไบต์จากค่าตัวแปรสากลหลังบ้าน เพื่อความมั่นคงปลอดภัยสูงสุด
const getEncryptionKey = (): Buffer => {
  const secret =
    process.env.PII_ENCRYPTION_KEY ||
    process.env.BEAM_WEBHOOK_SECRET ||
    "fallback-stable-32bytes-secret-key-system!";
  return createHash("sha256").update(secret).digest();
};

// 🟢 เข้ารหัสข้อมูลผู้สนับสนุนด้วยอัลกอริทึมมาตรฐาน AES-256-GCM
export function encryptPII(text: string): string {
  if (!text) return "";
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // มาตรฐานความปลอดภัยระดับ IV (Initialization Vector) ขนาด 12 ไบต์
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag().toString("hex"); // คีย์ประทับตราตรวจสอบข้อมูล (Auth Tag)

    return `${iv.toString("hex")}:${encrypted}:${tag}`;
  } catch {
    return text;
  }
}

// 🟢 ถอดรหัสลับข้อมูลผู้สนับสนุนกลับไปเป็นข้อความปกติสำหรับการเด้งแจ้งเตือนบนจอไลฟ์สตรีม
export function decryptPII(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText; // ไม่ใช่ข้อความที่ถูกเข้ารหัส หรือข้อความผิดรูปแบบ

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], "hex");
    const key = getEncryptionKey();

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "Anonymous";
  }
}
