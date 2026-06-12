import type { PageServerLoad } from './$types';
import defaultTheme from '$lib/config/theme.json';

export const load: PageServerLoad = async ({ platform }) => {
  try {
    // ☁️ ดึงข้อมูลสไตล์จาก Cloudflare KV (สิทธิ์การอ่านฟรี 100,000 ครั้ง/วัน)
    const theme = await platform?.env?.DONATION_KV.get('vtuber_personalized_theme', { type: 'json' });
    return {
      theme: theme || defaultTheme
    };
  } catch {
    return {
      theme: defaultTheme
    };
  }
};
