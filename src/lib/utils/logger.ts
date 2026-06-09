import { env } from '$env/dynamic/private';

// 🇹🇭 ไลบรารี Log พิมพ์รายงานระบบโดยอัตโนมัติ พร้อมตรวจเช็กเซ็นเซอร์และล้างข้อมูลสำคัญ (PII) ตามเกณฑ์กฎหมาย PDPA
export function safeLog(message: string, severity: 'INFO' | 'WARN' | 'ERROR' = 'INFO', rawData?: any) {
  let dataString = '';
  if (rawData) {
    if (rawData instanceof Error) {
      dataString = rawData.stack || rawData.toString();
    } else {
      try {
        dataString = JSON.stringify(rawData);
      } catch {
        dataString = String(rawData);
      }
    }
  }

  // 🛡️ ดึงข้อมูลความลับจาก Dynamic Environment Variables มาทำการจัดทำ Mask เพื่อปิดบังสายตาผู้ตรวจสอบระบบ
  const secrets = [
    env.XENDIT_SECRET_KEY,
    env.STREAMLABS_ACCESS_TOKEN,
    env.STREAMELEMENTS_JWT,
    env.STREAMELEMENTS_CHANNEL_ID,
    env.XENDIT_WEBHOOK_TOKEN,
    env.ADMIN_PASSWORD,
    env.GITHUB_PAT
  ].filter(Boolean) as string[];

  let maskedData = dataString;
  secrets.forEach(secret => {
    if (secret && secret.length > 5) {
      maskedData = maskedData.split(secret).join('[SYSTEM_SECRET_MASKED]');
    }
  });

  // 🛡️ คัดกรองและล้างฟอร์แมต IP, Email และคีย์ API ผ่านกลไก Regular Expression เพื่อความมั่นคงปลอดภัยสูงสุด
  maskedData = maskedData.replace(/(xnd_(live|test)_[a-zA-Z0-9]{20,})/g, '[API_KEY_MASKED]');
  maskedData = maskedData.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[PII_EMAIL_MASKED]');
  maskedData = maskedData.replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[PII_IP_MASKED]');

  const logPayload = {
    timestamp: new Date().toISOString(),
    severity,
    message,
    context: maskedData
  };

  if (severity === 'ERROR') {
    console.error(JSON.stringify(logPayload));
  } else if (severity === 'WARN') {
    console.warn(JSON.stringify(logPayload));
  } else {
    console.log(JSON.stringify(logPayload));
  }
}
