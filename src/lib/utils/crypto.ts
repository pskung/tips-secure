/**
 * ฟังก์ชันเปรียบเทียบข้อมูลแบบ Constant-Time เพื่อป้องกันภัย Timing Attacks
 * พัฒนาด้วย Pure JavaScript 100% ทำงานบนเครื่องผู้ชมและ Edge ได้ทันทีโดยไม่ต้องใช้สิทธิ์ของ Node.js
 */
export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = a ?? "";
  const strB = b ?? "";

  if (strA.length !== strB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < strA.length; i++) {
    result |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
  }

  return result === 0;
}
