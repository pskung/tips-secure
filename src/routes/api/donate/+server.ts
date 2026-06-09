import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'crypto';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const ipCache = new Map<string, number>();
const usedNonces = new Map<string, number>();

const EXTERNAL_API = {
  XENDIT_INVOICES: 'https://api.xendit.co/v2/invoices'
};

function verifyMicroPoW(token: string, nonce: string, difficulty: number): boolean {
  const input = `${token}_${nonce}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
}

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
  const now = Date.now();
  
  // 🛡️ [แก้ไข Finding #4] ย้ายการล้างตัวแปรประวัติหน่วยความจำขึ้นมาประมวลผลก่อนด่านตรวจสอบข้อกำหนด (Early Pruning)
  // เพื่อสกัดกั้นการก่อกวนแบบปล่อยคำขอเสียเข้ามาสะสมขยะทำลายหน่วยความจำเซิร์ฟเวอร์ (Anti-OOM Exhaustion Protection)
  if (ipCache.size > 1500) {
    const cutoff = now - 60000;
    for (const [key, val] of ipCache.entries()) {
      if (val < cutoff) ipCache.delete(key);
    }
  }
  if (usedNonces.size > 3000) {
    const cutoff = now;
    for (const [key, val] as [string, number] of usedNonces.entries()) {
      if (val < cutoff) usedNonces.delete(key);
    }
  }

  try {
    // 🛡️ [แก้ไข Finding #6] ป้องกันการยิงสวมสิทธิ์ประเภท CSRF บนคำขอแบบส่งดิบ JSON POST ด้วยระบบเช็กโดเมนต้นทาง (Origin)
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

    // 🛡️ [แก้ไข Finding #3] ป้องกันสิทธิ์ข้อมูลส่วนบุคคล (PII) ภายใต้เกณฑ์ PDPA และ GDPR อย่างเคร่งครัด
    // โดยใช้ระบบเข้ารหัสไอพีรวมเกลือ (HMAC SHA-256 IP Anonymization) ทำให้ข้อมูลในหน่วยความจำไม่ระบุตัวตนจริง
    const salt = env.XENDIT_SECRET_KEY || 'dynamic-anonymization-salt-factor';
    const hashedIp = crypto.createHmac('sha256', salt).update(clientIp).digest('hex');

    // ตรวจจับบ็อทอัตโนมัติด้วยกับดัก Honeypot
    if (email_confirm) {
      safeLog('Spam Bot Detected: Invisible honeypot trap triggered.', 'WARN', { email_confirm });
      return json({ error: 'Operation rejected' }, { status: 400 });
    }

    // ตรวจจับความเร็วในการพิมพ์กรอกฟอร์มประวัติผู้โดเนท
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

    // ตรวจทานลายเซ็นเพื่อรับรองความเป็นเจ้าของของเซิร์ฟเวอร์
    const expectedSignature = crypto.createHmac('sha256', salt).update(`${fingerprint}.${timestampStr}`).digest('hex');
    if (!timingSafeCompare(incomingSignature, expectedSignature)) {
      safeLog('Security Hack Attempt: Token signature invalid.', 'ERROR');
      return json({ error: 'Handshake token validation failed' }, { status: 400 });
    }

    // พิสูจน์ผลความถูกต้องเชิงคณิตศาสตร์ของสมการ PoW
    const isPoWValid = verifyMicroPoW(token, client_nonce, 3);
    if (!isPoWValid) {
      safeLog('Security Hack Attempt: Mathematical challenge failure.', 'ERROR');
      return json({ error: 'Challenge verification failed' }, { status: 400 });
    }

    // ป้องกันการแฝงรันสคริปต์ยิงรัวซ้ำซ้อน (Anti-Replay Protection)
    const nonceKey = `${fingerprint}_${client_nonce}`;
    if (usedNonces.has(nonceKey)) {
      return json({ error: 'Challenge signature already consumed' }, { status: 400 });
    }
    usedNonces.set(nonceKey, now + 5 * 60 * 1000);

    // เช็กสถานะคุ้กกี้ Cooldown ของบราวเซอร์ผู้โอนเงินชั่วคราว
    if (cookies.get('cooldown_active') === 'true') {
      return json({ error: 'Rate limit exceeded: Cooldown dynamic signature is currently active' }, { status: 429 });
    }

    // เช็กสถานะสเปมจากผลแฮชไอพีผู้ส่ง
    const lastRequestTime = ipCache.get(hashedIp);
    if (lastRequestTime && (now - lastRequestTime < 60000)) {
      return json({ error: 'IP address rate limit exceeded' }, { status: 429 });
    }
    ipCache.set(hashedIp, now);

    // ตรวจตัวอักษรนิคเนมและสัดส่วนข้อความ
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
        error: 'Streamer is currently setting up the channel. Payment gateway is temporary inactive. Please check back later!' 
      }, { status: 501 });
    }

    const siteUrl = `${url.protocol}//${url.host}`;
    const authHeader = 'Basic ' + Buffer.from(`${env.XENDIT_SECRET_KEY}:`).toString('base64');
    
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
        description: `VTuber secure tip by ${name}`,
        success_redirect_url: `${siteUrl}/success`,
        failure_redirect_url: `${siteUrl}/failure`,
        metadata: { donor_name: name, donor_message: message || '' },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      safeLog('Failed to generate Xendit payment bill', 'ERROR', data);
      return json({ error: 'Unable to communicate with downstream payment gateway' }, { status: response.status });
    }

    // 🛡️ [แก้ไข Finding #4] ฝังคุกกี้ความปลอดภัย โดยปรับให้ยอมรับการเซฟบน localhost HTTP ยามพัฒนา (Secure: !dev)
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
