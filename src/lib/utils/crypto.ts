// 🛡️ พัฒนาโดยอาคาริ: อัลกอริทึมเปรียบเทียบข้อความแบบใช้เวลาคงที่ (Constant-time string comparison)
// ทำงานผ่าน Pure JS ไร้การพึ่งพา Node.js ส่งผลให้สามารถรันบน Cloudflare Pages ได้โดยตรงโดยไม่ต้องใช้ nodejs_compat
export function timingSafeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  const strA = typeof a === 'string' ? a : '';
  const strB = typeof b === 'string' ? b : '';

  // ตรวจสอบขนาดความยาวเพื่อป้องกันการตัดจบ (Early-exit Protection)
  let diff = strA.length ^ strB.length;
  const len = Math.max(strA.length, strB.length);

  for (let i = 0; i < len; i++) {
    const charA = i < strA.length ? strA.charCodeAt(i) : 0;
    const charB = i < strB.length ? strB.charCodeAt(i) : 0;
    diff |= charA ^ charB; // ใช้ bitwise XOR ตรวจสอบความแตกต่างทีละหลัก
  }

  return diff === 0;
}
