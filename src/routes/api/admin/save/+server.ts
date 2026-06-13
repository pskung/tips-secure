import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { getStore } from '@netlify/blobs';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    // 🛡️ ยืนยันสิทธิ์ด้วย Secure Cookie แทนการใช้รหัสผ่านหลักดิบ [3]
    const sessionToken = cookies.get('admin_session_token');
    if (!sessionToken) {
      return json({ error: 'เข้าสู่ระบบหมดอายุแล้ว กรุณารีเฟรชเพื่อเข้าสู่ระบบใหม่อีกครั้งค่ะ' }, { status: 401 });
    }

    const store = getStore('donation_store');
    const activeSession = await store.get(`session:${sessionToken}`, { type: 'json' }) as { expiresAt: number } | null;

    if (!activeSession || activeSession.expiresAt < Date.now()) {
      return json({ error: 'เข้าสู่ระบบหมดอายุแล้ว กรุณารีเฟรชเพื่อเข้าสู่ระบบใหม่อีกครั้งค่ะ' }, { status: 401 });
    }

    const { config } = await request.json();

    // บันทึกสไตล์ลง Netlify Blobs อย่างถาวรบนคลาวด์ [3]
    await store.setJSON('vtuber_personalized_theme', config);

    safeLog('Admin successfully updated theme styles via Netlify Blobs storage', 'INFO');
    return json({ success: true });
  } catch (err) {
    safeLog('Admin Save Exception', 'ERROR', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
