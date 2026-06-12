import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const ipCache = new Map<string, number>();
const usedNonces = new Map<string, number>();

const EXTERNAL_API = {
  XENDIT_INVOICES: 'https://api.xendit.co/v2/invoices'
};

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

async function verifyMicroPoW(token: string, nonce: string, difficulty: number): Promise<boolean> {
  const input = `${token}_${nonce}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const prefix = '0'.repeat(difficulty);
  return hashHex.startsWith(prefix);
}

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
  const now = Date.now();
  
  if (ipCache.size > 1500) {
    const cutoff = now - 60000;
    for (const [key, val] of ipCache.entries()) {
      if (val < cutoff) ipCache.delete(key);
    }
  }
  if (usedNonces.size > 3000) {
    const cutoff = now;
    for (const [key, val] of usedNonces.entries()) {
      if (val < cutoff) usedNonces.delete(key);
    }
  }

  try {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host') || url.host;
    const protocol = request.headers.get('x-forwarded-proto') || url.protocol;
    const expectedOrigin = `${protocol}://${host}`;

    if (origin && origin !== expectedOrigin) {
      safeLog(`Security Alert: Blocked Cross-Origin request from ${origin}`, 'WARN');
      return json({ error: 'Untrusted network origin rejected' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, amount, message, currency = 'THB', 
      email_confirm, render_time, token, client_nonce 
    } = body;

    const clientIp = getClientAddress() || '127.0.0.1';

    const salt = env.XENDIT_SECRET_KEY || 'default-cryptographic-handshake-signing-salt';
    const hashedIp = await hmacSha256(salt, clientIp);

    if (email_confirm) {
      safeLog('Spam Bot Detected: Invisible honeypot trap triggered.', 'WARN', { email_confirm });
      return json({ error: 'Operation rejected' }, { status: 400 });
    }

    if (render_time && (now - Number(render_time) < 1500)) {
      safeLog('Spam Bot Detected: Trigger speed abnormal.', 'WARN');
      return json({ error: 'Operation rate limit exceeded' }, { status: 400 });
    }

    if (!token || !client_nonce) {
      return json({ error: 'Challenge component parameters missing' }, { status: 400 });
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return json({ error: 'Malformed token session signatures' }, { status: 400 });
    }

    const [fingerprint, timestampStr, incomingSignature] = tokenParts;
    const timestamp = Number(timestampStr);

    if (isNaN(timestamp) || Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return json({ error: 'Challenge session signature expired' }, { status: 400 });
    }

    const expectedSignature = await hmacSha256(salt, `${fingerprint}.${timestampStr}`);
    if (!timingSafeCompare(incomingSignature, expectedSignature)) {
      safeLog('Security Hack Attempt: Token signature invalid.', 'ERROR');
      return json({ error: 'Handshake token validation failed' }, { status: 400 });
    }

    const isPoWValid = await verifyMicroPoW(token, client_nonce, 3);
    if (!isPoWValid) {
      safeLog('Security Hack Attempt: Mathematical challenge failure.', 'ERROR');
      return json({ error: 'Challenge verification failed' }, { status: 400 });
    }

    const nonceKey = `${fingerprint}_${client_nonce}`;
    if (usedNonces.has(nonceKey)) {
      return json({ error: 'Challenge signature already consumed' }, { status: 400 });
    }
    usedNonces.set(nonceKey, now + 5 * 60 * 1000);

    if (cookies.get('cooldown_active') === 'true') {
      return json({ error: 'Rate limit exceeded: Cooldown dynamic signature is currently active' }, { status: 429 });
    }

    const lastRequestTime = ipCache.get(hashedIp);
    if (lastRequestTime && (now - lastRequestTime < 60000)) {
      return json({ error: 'IP address rate limit exceeded' }, { status: 429 });
    }
    ipCache.set(hashedIp, now);

    if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9\u0e00-\u0e7f\s._-]+$/.test(name) || name.length < 2 || name.length > 25) {
      return json({ error: 'Validation failed: Invalid Nickname configuration rules' }, { status: 400 });
    }
    if (message && (typeof message !== 'string' || message.length > 100)) {
      return json({ error: 'Validation failed: Content size exceeds limitation constraints' }, { status: 400 });
    }
    if (isNaN(amount) || amount < 10.00 || amount > 5000.00) {
      return json({ error: 'Validation failed: Amount value parameter out of scope' }, { status: 400 });
    }

    if (!env.XENDIT_SECRET_KEY) {
      return json({ 
        error: 'สตรีมเมอร์กำลังตั้งค่าระบบรับเงินชั่วคราวอยู่ค่ะ ช่องทางโดเนทจะเปิดใช้งานเร็วๆ นี้นะคะ!' 
      }, { status: 501 });
    }

    // 🎯 เปลี่ยนแปลงสำคัญ: ชี้ทิศทางกลับมาที่หน้าแรกหลักโดยตรง ไม่ต้องผ่าน /success หรือ /failure อีกต่อไปค่ะ
    const siteUrl = `${url.protocol}//${url.host}/`;
    
    const authHeader = 'Basic ' + btoa(`${env.XENDIT_SECRET_KEY}:`);
    
    const response = await fetch(EXTERNAL_API.XENDIT_INVOICES, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_id: `donate_${now}_${Math.random().toString(36).substring(2, 7)}`,
        amount: Number(amount),
        currency,
        description: `VTuber tip by ${name}`,
        success_redirect_url: siteUrl, // กลับหน้าแรกหลัก
        failure_redirect_url: siteUrl, // กลับหน้าแรกหลัก
        metadata: { donor_name: name, donor_message: message || '' },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      safeLog('Failed to generate Xendit payment bill', 'ERROR', data);
      return json({ error: 'Unable to communicate with downstream payment gateway' }, { status: response.status });
    }

    cookies.set('cooldown_active', 'true', {
      maxAge: 60,
      path: '/',
      httpOnly: true,
      secure: !dev,
      sameSite: 'strict'
    });

    return json({ invoice_url: data.invoice_url });

  } catch (error) {
    safeLog('Internal Fatal Exception in Payment Controller', 'ERROR', error);
    return json({ error: 'Internal system processing failure' }, { status: 500 });
  }
};
