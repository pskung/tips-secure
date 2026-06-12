import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { safeLog } from '$lib/utils/logger';
import { timingSafeCompare } from '$lib/utils/crypto';
import { env } from '$env/dynamic/private';

const EXTERNAL_API = {
  STREAMLABS_DONATIONS: 'https://streamlabs.com/api/v1.0/donations',
  STREAMELEMENTS_TIPS: (channelId: string) => `https://api.streamelements.com/kappa/v2/tips/${channelId}`
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const headers = request.headers;

    const callbackToken = headers.get('x-callback-token');
    const expectedToken = env.XENDIT_WEBHOOK_TOKEN;

    if (!callbackToken || !expectedToken || callbackToken.trim() === '' || expectedToken.trim() === '') {
      safeLog('Security Alert: Null, blank or missing Webhook validation credentials.', 'WARN');
      return json({ error: 'Unauthenticated callback parameters' }, { status: 401 });
    }

    if (!timingSafeCompare(callbackToken, expectedToken)) {
      safeLog('Security Alert: Webhook callback signature mismatch.', 'WARN');
      return json({ error: 'Unauthenticated callback origin' }, { status: 401 });
    }

    if (body.status === 'PAID') {
      const amount = body.amount;
      const currency = body.currency || 'THB';
      const metadata = body.metadata || {};
      const donorName = metadata.donor_name || 'Anonymous';
      const donorMessage = metadata.donor_message || '';
      const externalId = body.external_id || `xendit_${body.id}`;
      
      const alertPromises: Promise<any>[] = [];

      if (env.STREAMLABS_ACCESS_TOKEN) {
        try {
          const params = new URLSearchParams();
          params.append('access_token', env.STREAMLABS_ACCESS_TOKEN);
          params.append('name', donorName);
          params.append('message', donorMessage);
          params.append('amount', String(amount));
          params.append('currency', currency);

          alertPromises.push(
            fetch(EXTERNAL_API.STREAMLABS_DONATIONS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString(),
            })
            .then(async (slRes) => {
              if (!slRes.ok) {
                const slData = await slRes.json();
                safeLog('Streamlabs Dispatch warning:', 'WARN', slData);
              } else {
                safeLog(`Alert Box (Streamlabs) triggered for: ${donorName}`, 'INFO');
              }
            })
            .catch((err) => safeLog('Streamlabs notification dispatch connection error', 'ERROR', err))
          );
        } catch (innerErr) {
          safeLog('Streamlabs dispatch exception', 'ERROR', innerErr);
        }
      }

      if (env.STREAMELEMENTS_JWT && env.STREAMELEMENTS_CHANNEL_ID) {
        try {
          const sePayload = {
            user: { username: donorName },
            message: donorMessage,
            amount: Number(amount),
            currency: currency
          };

          alertPromises.push(
            fetch(EXTERNAL_API.STREAMELEMENTS_TIPS(env.STREAMELEMENTS_CHANNEL_ID), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.STREAMELEMENTS_JWT}`
              },
              body: JSON.stringify(sePayload)
            })
            .then(async (seRes) => {
              if (!seRes.ok) {
                const seData = await seRes.json();
                safeLog('StreamElements Dispatch warning:', 'WARN', seData);
              } else {
                safeLog(`Alert Box (StreamElements) triggered for: ${donorName}`, 'INFO');
              }
            })
            .catch((err) => safeLog('StreamElements notification dispatch connection error', 'ERROR', err))
          );
        } catch (innerErr) {
          safeLog('StreamElements dispatch exception', 'ERROR', innerErr);
        }
      }

      // บังคับให้เซิร์ฟเวอร์รอยิงสำเร็จทั้งหมดขนานกัน ป้องกันเซิร์ฟเวอร์หลับ (Serverless Call Freezing)
      if (alertPromises.length > 0) {
        await Promise.all(alertPromises);
      }
    }

    return json({ success: true });
  } catch (error) {
    safeLog('Internal Exception in Webhook Controller', 'ERROR', error);
    return json({ error: 'Internal system processing failure' }, { status: 500 });
  }
};
