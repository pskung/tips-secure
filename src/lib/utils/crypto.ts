import { createHash } from "crypto";

export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = typeof a === "string" ? a : "";
  const strB = typeof b === "string" ? b : "";

  // ล็อกความยาวข้อความด้วย SHA-256 (32 Bytes) ป้องกัน Side-Channel Timing Attacks ได้อย่างถาวร
  const hashA = createHash("sha256").update(strA).digest();
  const hashB = createHash("sha256").update(strB).digest();

  if (hashA.length !== hashB.length) return false;

  let diff = 0;
  for (let i = 0; i < hashA.length; i++) {
    diff |= hashA[i] ^ hashB[i];
  }

  return diff === 0 && strA.length === strB.length;
}
