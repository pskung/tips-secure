import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
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
