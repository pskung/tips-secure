import type { PageServerLoad } from './$types';
import defaultTheme from '$lib/config/theme.json';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ platform, setHeaders }) => {
  // 🎯 บังคับแคชหน้าแรกที่ Edge CDN 5 วินาทีอย่างเข้มงวด ช่วยสกัดการยิง GET Flood
  setHeaders({
    'cache-control': 'public, max-age=0, s-maxage=5'
  });

  try {
    const theme = await platform?.env?.DONATION_KV.get('vtuber_personalized_theme', { 
      type: 'json',
      cacheTtl: 60 
    });
    return {
      theme: theme || defaultTheme,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || '' // ส่งคีย์สาธารณะไปหน้าบ้าน
    };
  } catch {
    return {
      theme: defaultTheme,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || ''
    };
  }
};
