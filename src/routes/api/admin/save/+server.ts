import { json } from '@sveltejs/kit';
// ✅ แก้ไข Error 2307: นำเข้า RequestHandler จาก Core ของ SvelteKit โดยตรงโดยไม่ต้องพึ่งพาโฟลเดอร์ชั่วคราว
import type { RequestHandler } from '@sveltejs/kit';
// ✅ แก้ไข Error 2307: ใช้ Relative Path แทนการใช้ Path Alias ป้องกันการแฮงก์ของ VS Code TS Server
import { safeLog } from '../../../../lib/utils/logger';
// ✅ แก้ไข Error 2339: เปลี่ยนไปใช้ Named Import จาก @netlify/blobs แทนการดึงผ่าน Property Namespace
import { getStore } from '@netlify/blobs';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  try {
    // 🛡️ 1. CSRF Protection - ตรวจสอบความถูกต้องของขอบเขตเครือข่ายต้นทาง
    const origin = request.headers.get('origin');
    const host = request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (origin && origin !== expectedOrigin) {
      safeLog(`Security Alert: CSRF Blocked on Admin Save from ${origin}`, 'WARN');
      return json({ error: 'Rejected Cross-Origin action' }, { status: 403 });
    }

    // 🛡️ 2. Secure Cookie Check - ตรวจสอบเซสชันผู้ใช้อย่างแน่นหนา
    const sessionToken = cookies.get('admin_session_token');
    if (!sessionToken) {
      return json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการค่ะ' }, { status: 401 });
    }

    const store = getStore('donation_store');
    const sessionData = await store.get(`session:${sessionToken}`, { type: 'json' }) as { expiresAt: number } | null;

    if (!sessionData || Date.now() > sessionData.expiresAt) {
      safeLog(`Admin session rejected or expired for token: ${sessionToken}`, 'WARN');
      // เคลียร์คุกกี้เสียทิ้ง
      cookies.delete('admin_session_token', { path: '/' });
      return json({ error: 'หมดอายุการเข้าใช้งานระบบกรุณาล็อกอินใหม่อีกครั้งค่ะ' }, { status: 401 });
    }

    // 📥 3. รับและประมวลข้อมูลธีมใหม่
    const newTheme = await request.json();
    
    // บันทึกค่าธีมใหม่ลงไปยัง Netlify Blob Storage
    await store.setJSON('vtuber_personalized_theme', newTheme);
    
    safeLog('Admin settings saved successfully.', 'INFO');
    return json({ success: true });

  } catch (err) {
    safeLog('Exception occurred during admin settings storage save', 'ERROR', err);
    return json({ error: 'เกิดปัญหาขัดข้องทางเทคนิคขณะจัดเก็บข้อมูลธีม' }, { status: 500 });
  }
};