import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';
import { getStore } from '@netlify/blobs';

const adminIpCache = new Map<string, number>();

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const now = Date.now();
  const clientIp = getClientAddress() || '127.0.0.1';

  if (adminIpCache.size > 500) {
    const cutoff = now - 60000;
    for (const [key, val] of adminIpCache.entries()) {
      if (val < cutoff) adminIpCache.delete(key);
    }
  }

  const lastAttempt = adminIpCache.get(clientIp);
  if (lastAttempt && (now - lastAttempt < 10000)) {
    return json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
  }
  adminIpCache.set(clientIp, now);

  try {
    const { password, config } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD || '';
    
    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return json({ error: 'Unauthenticated administration attempt' }, { status: 401 });
    }

    // เขียนไฟล์ปรับแต่งค่ารูปแบบแผงควบคุมลง Netlify Blobs
    const store = getStore('donation_store');
    await store.setJSON('vtuber_personalized_theme', config);

    safeLog('Admin successfully updated theme styles via Netlify Blobs storage', 'INFO');
    return json({ success: true });
  } catch (err) {
    safeLog('Admin Save Exception', 'ERROR', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
