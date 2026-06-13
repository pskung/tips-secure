import type { PageServerLoad } from './$types';
import defaultTheme from '$lib/config/theme.json';
import { env } from '$env/dynamic/private';
import { getStore } from '@netlify/blobs';

export const load: PageServerLoad = async ({ setHeaders }) => {
  // 🎯 บังคับแคชหน้าแรกที่ Edge CDN 5 วินาทีเพื่อความเสถียรและสกัดการดึง GET เปลืองคิวตาทรัพยากร
  setHeaders({
    'cache-control': 'public, max-age=0, s-maxage=5'
  });

  try {
    const store = getStore('donation_store');
    const theme = await store.get('vtuber_personalized_theme', { type: 'json' });
    return {
      theme: theme || defaultTheme,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || ''
    };
  } catch {
    return {
      theme: defaultTheme,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY || ''
    };
  }
};
