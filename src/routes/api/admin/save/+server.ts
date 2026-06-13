import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';
import { getStore } from '@netlify/blobs';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { password, config } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD || '';
    
    // 🛡️ ป้องกันการโจมตีตรวจจับเวลา (Timing Attack) ด้วย Pure JS
    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return json({ error: 'Unauthenticated administration attempt' }, { status: 401 });
    }

    // 💾 บันทึกรูปแบบแผงจัดการหน้าบ้านลง Netlify Blobs Store แบบถาวร
    const store = getStore('donation_store');
    await store.setJSON('vtuber_personalized_theme', config);

    safeLog('Admin successfully updated theme styles via Netlify Blobs storage', 'INFO');
    return json({ success: true });
  } catch (err) {
    safeLog('Admin Save Exception', 'ERROR', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
