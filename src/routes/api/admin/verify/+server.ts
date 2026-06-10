import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';

const verifyIpCache = new Map<string, number>();

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const now = Date.now();
  const clientIp = getClientAddress() || '127.0.0.1';

  // เคลียร์ประวัติ IP เก่าหากแคชมีขนาดใหญ่เกินความจำเป็น
  if (verifyIpCache.size > 500) {
    const cutoff = now - 60000;
    for (const [key, val] of verifyIpCache.entries()) {
      if (val < cutoff) verifyIpCache.delete(key);
    }
  }

  // ดักสกัดแอดมินปลอมขยันยิงสุ่มรหัสผ่านบ่อยเกินไป (จำกัด 5 วินาทีต่อครั้ง)
  const lastAttempt = verifyIpCache.get(clientIp);
  if (lastAttempt && (now - lastAttempt < 5000)) {
    return json({ success: false, error: 'ส่งคำขอถี่เกินไป กรุณารอ 5 วินาทีก่อนลองอีกครั้งค่ะ' }, { status: 429 });
  }
  verifyIpCache.set(clientIp, now);

  try {
    const { password } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD || '';
    
    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return json({ success: false, error: 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่อีกครั้งค่ะ' }, { status: 401 });
    }
    
    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: 'ระบบตรวจสอบหลังบ้านขัดข้องชั่วคราว' }, { status: 500 });
  }
};
