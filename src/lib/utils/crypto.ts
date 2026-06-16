import { createHash, timingSafeEqual } from "crypto";

export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = typeof a === "string" ? a : "";
  const strB = typeof b === "string" ? b : "";

  const hashA = createHash("sha256").update(strA).digest();
  const hashB = createHash("sha256").update(strB).digest();

  return timingSafeEqual(hashA, hashB) && strA.length === strB.length;
}
