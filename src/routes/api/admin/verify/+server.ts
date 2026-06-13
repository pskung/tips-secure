import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';
import * as blobs from '@netlify/blobs';

const getStore = blobs.getStore;

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const { password } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD || '';
    
    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return json({ success: false, error: 'รหัสผ่านไม่ถูกต้องกรุณาลองใหม่อีกครั้งค่ะ' }, { status: 401 });
    }

    // 🔑 สร้าง Session ID แบบสุ่มและเซฟสถานะในระบบเก็บข้อมูล Netlify Blobs [3]
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // หมดอายุภายใน 24 ชั่วโมง

    const store = getStore('donation_store');
    await store.setJSON(`session:${sessionToken}`, { expiresAt });

    // 🍪 จ่าย Cookie ด้วยสัญญาน HttpOnly, Secure, SameSite=Strict กันขโมยทุกรูปแบบ [3]
    cookies.set('admin_session_token', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24
    });
    
    return json({ success: true });
  } catch (err) {
    return json({ success: false, error: 'ระบบตรวจสอบหลังบ้านขัดข้องชั่วคราว' }, { status: 500 });
  }
};