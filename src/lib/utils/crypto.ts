export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a ?? "");
  const bBytes = encoder.encode(b ?? "");

  // เพื่อป้องกันการรั่วไหลทางข้อมูลเวลา (Timing Leakage) เมื่อความยาวต่างกัน
  // ระบบจะนำค่าความล้มเหลวไปคำนวณผ่าน Dummy Native Comparison เพื่อหน่วงเวลาก่อนคืนค่า false
  if (aBytes.byteLength !== bBytes.byteLength) {
    crypto.subtle.timingSafeEqual(aBytes, aBytes);
    return false;
  }

  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

export async function secureCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): Promise<boolean> {
  const hashA = await sha256(a ?? "");
  const hashB = await sha256(b ?? "");
  return timingSafeCompare(hashA, hashB);
}
