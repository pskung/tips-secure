import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';
import { safeLog } from '$lib/utils/logger';
import { env } from '$env/dynamic/private';

// 🇹🇭 ด่านออกสิทธิ์ตั๋วลายเซ็น HMAC SHA-256 เพื่อเตรียมมอบคำท้าทายสมการคณิตศาสตร์ (Zero-State Handshake) ป้องกันสคริปต์อัตโนมัติ
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { fingerprint } = await request.json();

    // 🛡️ ตรวจลักษณะตัวอักษรของ Fingerprint อย่างเข้มงวดเพื่อสกัดภัยคุกคามประเภทแอบอ้างใส่สคริปต์สวมรอย
    const cleanFingerprint = String(fingerprint || '').trim();
    if (!/^[a-zA-Z0-9.\-_=]+$/.test(cleanFingerprint) || cleanFingerprint.length < 5 || cleanFingerprint.length > 128) {
      safeLog('Handshake system execution aborted: Malformed parameters provided', 'WARN');
      return json({ error: 'Handshake validation rejected' }, { status: 400 });
    }

    const timestamp = String(Date.now());
    const payload = `${cleanFingerprint}.${timestamp}`;
    
    // 🛡️ ลงลายมือชื่อกำกับด้วยเกลือความปลอดภัย (Salt Key) ระดับหลังบ้าน เพื่อรับประกันความถูกต้องสมบูรณ์
    const secret = env.XENDIT_SECRET_KEY || 'default-cryptographic-handshake-signing-salt';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const token = `${payload}.${signature}`;

    return json({ success: true, token });
  } catch (err) {
    safeLog('Handshake compilation crashed unexpectedly', 'ERROR', err);
    return json({ error: 'Handshake processing failed' }, { status: 500 });
  }
};
