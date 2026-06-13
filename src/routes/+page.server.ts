import type { PageServerLoad } from './$types';
import defaultTheme from '$lib/config/theme.json';

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
  // 🎯 กำหนดให้ Cloudflare Edge CDN แคชหน้า HTML นี้ไว้เป็นเวลา 5 วินาทีอย่างเข้มงวด
  // ช่วยบล็อกการยิง GET Flood เข้ามาที่โค้ดโดยตรง
  setHeaders({
    'cache-control': 'public, max-age=0, s-maxage=5'
  });

  try {
    // ดึงข้อมูลธีมจาก KV (พ่วง cacheTtl 60 วินาทีในระดับโหนด เพื่อลดโควตาการอ่านฐานข้อมูลลงอีกชั้น)
    // เพิ่มเครื่องหมาย ? เพื่อตรวจสอบหากย้ายไปรันบนระบบอื่นที่ไม่มี KV จะสลับไปใช้ defaultTheme ทันทีโดยไม่แครช
    const theme = await platform?.env?.DONATION_KV.get('vtuber_personalized_theme', { 
      type: 'json',
      cacheTtl: 60 
    });
    return {
      theme: theme || defaultTheme
    };
  } catch {
    return {
      theme: defaultTheme
    };
  }
};
