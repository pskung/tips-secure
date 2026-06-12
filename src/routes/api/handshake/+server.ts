import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { env } from '$env/dynamic/private';

// 🛡️ ฟังก์ชันเข้ารหัสมาตรฐานสากล (Web Crypto API) ของอาคาริ รันบน Cloudflare ได้รวดเร็วและปลอดภัยระดับโครงสร้างสากล
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { fingerprint } = await request.json();

    const cleanFingerprint = String(fingerprint || '').trim();
    if (!/^[a-zA-Z0-9.\-_=]+$/.test(cleanFingerprint) || cleanFingerprint.length < 5 || cleanFingerprint.length > 128) {
      safeLog('Handshake system execution aborted: Malformed parameters provided', 'WARN');
      return json({ error: 'Handshake validation rejected' }, { status: 400 });
    }

    const timestamp = String(Date.now());
    const payload = `${cleanFingerprint}.${timestamp}`;
    
    const secret = env.XENDIT_SECRET_KEY || 'default-cryptographic-handshake-signing-salt';
    
    // 🛡️ เรียกใช้ Web Crypto แทน Node Crypto แบบไร้ดีเลย์
    const signature = await hmacSha256(secret, payload);
    const token = `${payload}.${signature}`;

    return json({ success: true, token });
  } catch (err) {
    safeLog('Handshake compilation crashed unexpectedly', 'ERROR', err);
    return json({ error: 'Handshake processing failed' }, { status: 500 });
  }
};
