import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';

const adminIpCache = new Map<string, number>();

export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
  const now = Date.now();
  const clientIp = getClientAddress() || '127.0.0.1';

  if (adminIpCache.size > 500) {
    const cutoff = now - 60000;
    for (const [key, val] of adminIpCache.entries()) {
      if (val < cutoff) adminIpCache.delete(key);
    }
  }

  const lastAttempt = adminIpCache.get(clientIp);
  if (lastAttempt && (now - lastAttempt < 10000)) {
    return json({ error: 'Too many admin attempts. Please wait 10 seconds before retrying.' }, { status: 429 });
  }
  adminIpCache.set(clientIp, now);

  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto') || url.protocol;
  const expectedOrigin = `${protocol}://${host}`;

  if (origin && origin !== expectedOrigin) {
    safeLog(`Security Alert: Blocked CSRF attempt on Admin Save from ${origin}`, 'WARN');
    return json({ error: 'Untrusted network origin rejected' }, { status: 403 });
  }

  try {
    const { password, config } = await request.json();
    const expectedPassword = env.ADMIN_PASSWORD || '';
    
    if (!password || !expectedPassword || !timingSafeCompare(password, expectedPassword)) {
      return json({ error: 'Unauthenticated administration attempt' }, { status: 401 });
    }

    const { 
      avatarUrl, bannerUrl,
      bgType, bgColor, bgUrl,
      cardBgColor, cardOpacity, cardBorderColor, cardBorderOpacity, cardBlur,
      profileAreaBgColor, profileAreaOpacity,
      inputBgColor, inputBgOpacity, inputBorderColor,
      vtuberName, nameColor, mainFontFamily, // ใช้ฟอนต์เดี่ยวร่วมทั้งหน้าแรก
      welcomeText, welcomeColor,
      nicknameLabel, nicknamePlaceholder, messageLabel, messagePlaceholder, amountLabel, amountPlaceholder, presetLabel,
      labelColor,
      placeholderColor,
      socialLinks, socialColor,
      presetAmounts, presetBtnColor, presetBorderColor, // ยอด Preset แบบอาร์เรย์ที่ตั้งค่าได้
      submitBtnColor, submitBtnTextColor, submitBtnText,

      // หน้าชำระสำเร็จ (รวมใช้ successFontFamily)
      successTitle, successTitleColor, successFontFamily,
      successMessage, successMessageColor,
      successEmoji, successBtnText, successBtnColor, successBtnTextColor,

      // หน้าชำระล้มเหลว (รวมใช้ failureFontFamily)
      failureTitle, failureTitleColor, failureFontFamily,
      failureMessage, failureMessageColor,
      failureEmoji, failureBtnText, failureBtnColor, failureBtnTextColor
    } = config;

    const owner = env.VERCEL_GIT_REPO_OWNER || env.GITHUB_OWNER;
    const repo = env.VERCEL_GIT_REPO_SLUG || env.GITHUB_REPO;
    const token = env.GITHUB_PAT;
    const path = 'src/lib/config/theme.json';

    if (!owner || !repo || !token) {
      return json({ error: 'Missing GitHub Repository Credentials in System Properties' }, { status: 500 });
    }

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
    };

    const getRes = await fetch(apiUrl, { headers });
    let sha = '';
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
    }

    const updatedContent = Buffer.from(JSON.stringify({
      avatarUrl, bannerUrl,
      bgType, bgColor, bgUrl,
      cardBgColor, cardOpacity, cardBorderColor, cardBorderOpacity, cardBlur,
      profileAreaBgColor, profileAreaOpacity,
      inputBgColor, inputBgOpacity, inputBorderColor,
      vtuberName, nameColor, mainFontFamily,
      welcomeText, welcomeColor,
      nicknameLabel, nicknamePlaceholder, messageLabel, messagePlaceholder, amountLabel, amountPlaceholder, presetLabel,
      labelColor,
      placeholderColor,
      socialLinks, socialColor,
      presetAmounts, presetBtnColor, presetBorderColor,
      submitBtnColor, submitBtnTextColor, submitBtnText,

      successTitle, successTitleColor, successFontFamily,
      successMessage, successMessageColor,
      successEmoji, successBtnText, successBtnColor, successBtnTextColor,

      failureTitle, failureTitleColor, failureFontFamily,
      failureMessage, failureMessageColor,
      failureEmoji, failureBtnText, failureBtnColor, failureBtnTextColor
    }, null, 2)).toString('base64');

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: '💅 Unified font families and enabled preset amount customization.',
        content: updatedContent,
        sha: sha || undefined,
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      safeLog('GitHub write content failed', 'ERROR', errData);
      return json({ error: 'Downstream GitHub validation denied write access' }, { status: 500 });
    }

    return json({ success: true });
  } catch (err) {
    safeLog('Admin Save Exception', 'ERROR', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
