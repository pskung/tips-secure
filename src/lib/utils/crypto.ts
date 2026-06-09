import crypto from 'crypto';

// 🇹🇭 ตรวจประเมินและเปรียบเทียบ String สองชุดแบบคงเวลาคงที่ เพื่อลบล้างช่องโหว่ด้านการถอดรหัสลับมิลลิวินาที (ASVS v5-V2.11.1)
export function timingSafeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  const strA = typeof a === 'string' ? a : '';
  const strB = typeof b === 'string' ? b : '';

  const aBuf = Buffer.from(strA);
  const bBuf = Buffer.from(strB);
  
  // 🛡️ แปลงค่าข้อมูลจริงด้วยการทำแฮช SHA-256 เพื่อทำลายช่องทางวิเคราะห์ขนาดรหัสผ่านที่ส่งเข้ามา (Length-Leakage Protection)
  const aHash = crypto.createHash('sha256').update(aBuf).digest();
  const bHash = crypto.createHash('sha256').update(bBuf).digest();
  
  return crypto.timingSafeEqual(aHash, bHash);
}
