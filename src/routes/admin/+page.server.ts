import type { PageServerLoad } from './$types';
import defaultTheme from '$lib/config/theme.json';
import * as blobs from '@netlify/blobs';

const getStore = blobs.getStore;

export const load: PageServerLoad = async () => {
  try {
    const store = getStore('donation_store');
    const theme = await store.get('vtuber_personalized_theme', { type: 'json' });
    return {
      theme: theme || defaultTheme
    };
  } catch {
    return {
      theme: defaultTheme
    };
  }
};