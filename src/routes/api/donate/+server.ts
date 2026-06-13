import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const EXTERNAL_API = {
  XENDIT_INVOICES: 'https://api.xendit.co/v2/invoices'
};

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const now = Date.now();

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
    const { name, amount, message, currency = 'THB', email_confirm, render_time } = body;

    // 1. ตรวจจับ Honeypot สแปมบอท
    if (email_confirm) {
      safeLog('Spam Bot Detected: Invisible honeypot trap triggered.', 'WARN', { email_confirm });
      return json({ error: 'Operation rejected' }, { status: 400 });
    }

    // 2. ตรวจจับเวลาปุ่มความเร็วสูง (ยิงแบบไม่โหลดหน้าจอจริง)
    if (render_time && (now - Number(render_time) < 1000)) {
      safeLog('Spam Bot Detected: Trigger speed abnormal.', 'WARN');
      return json({ error: 'Operation rate limit exceeded' }, { status: 400 });
    }

    // 3. ตรวจสอบคุกกี้สกัดกันการกดรัวๆ ฝั่ง Client
    if (cookies.get('cooldown_active') === 'true') {
      return json({ error: 'กรุณารอ 1 นาทีก่อนทำรายการถัดไปน้า' }, { status: 429 });
    }

    // 4. ตรวจสอบเงื่อนไขข้อมูลรับเงินพื้นฐาน
    if (!name || typeof name !== 'string' || !/^[a-zA-Z0-9\u0e00-\u0e7f\s._-]+$/.test(name) || name.length < 2 || name.length > 25) {
      return json({ error: 'กรุณาตรวจสอบความถูกต้องของชื่อเล่นค่ะ' }, { status: 400 });
    }
    if (message && (typeof message !== 'string' || message.length > 100)) {
      return json({ error: 'ข้อความยาวเกิน 100 ตัวอักษรค่ะ' }, { status: 400 });
    }
    if (isNaN(amount) || amount < 10.00 || amount > 5000.00) {
      return json({ error: 'ยอดเงินโดเนทขั้นต่ำต้องอยู่ระหว่าง 10 - 5,000 บาทค่ะ' }, { status: 400 });
    }

    if (!env.XENDIT_SECRET_KEY) {
      return json({ 
        error: 'ระบบสตรีมเมอร์ขัดข้องเนื่องจากยังไม่ได้ป้อนคีย์รับเงินลับหลังบ้านค่ะ' 
      }, { status: 501 });
    }

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
        success_redirect_url: siteUrl,
        failure_redirect_url: siteUrl,
        metadata: { donor_name: name, donor_message: message || '' },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      safeLog('Failed to generate Xendit payment bill', 'ERROR', data);
      return json({ error: 'ไม่สามารถติดต่อเกตเวย์รับเงินภายนอกได้ค่ะ' }, { status: response.status });
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
    return json({ error: 'ระบบทำงานหลังบ้านประมวลผลล้มเหลว' }, { status: 500 });
  }
};
