/* ============================================
   PIGGY APP — Tips Service
   Fetches dynamic notification tips from DB.
   Falls back to hardcoded data in mock mode
   or if the network request fails.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';

/**
 * Fallback tips used in mock mode or on DB error.
 * Mirrors the data inserted in the dynamic_tips table.
 */
const FALLBACK_TIPS = [
  {
    icon: '🎉',
    title: 'Compra en locales aliados',
    reward: 'Desbloquea un Piggy Silver (24h)',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    ctaUrl: '#/aliados',
  },
  {
    icon: '🐘',
    title: 'Al cerrar un ciclo',
    reward: 'Desbloquea Piggy Silver (24h)',
    color: '#0891b2',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    ctaUrl: null,
  },
  {
    icon: '🔥',
    title: 'Compra la oferta de la semana',
    reward: 'Desbloquea un Piggy Gold (24h)',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    ctaUrl: '#/gourmet',
  },
  {
    icon: '🤝',
    title: 'Refiere a un amigo y si compra su 1er Piggy',
    reward: 'Obtén $30.000 en tu Wallet',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    ctaUrl: null,
  },
];

/**
 * Normalize a DB row (snake_case) to the camelCase shape used by the UI.
 * @param {Object} row
 * @returns {Object}
 */
function normalizeTip(row) {
  return {
    icon:        row.icon,
    title:       row.title,
    reward:      row.reward,
    color:       row.color,
    bgColor:     row.bg_color,
    borderColor: row.border_color,
    ctaUrl:      row.cta_url ?? null,
  };
}

/**
 * Fetch all active tips from the DB, ordered by priority (desc).
 * Falls back to FALLBACK_TIPS in mock mode or on any error.
 * @returns {Promise<Array<Object>>}
 */
export async function getActiveTips() {
  if (isUsingMockData()) return FALLBACK_TIPS;

  try {
    const client = getClient();
    const { data, error } = await client
      .from('dynamic_tips')
      .select('icon, title, reward, color, bg_color, border_color, cta_url')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !data?.length) {
      console.warn('TipsService: falling back to local data', error?.message);
      return FALLBACK_TIPS;
    }

    return data.map(normalizeTip);
  } catch (err) {
    console.warn('TipsService: unexpected error, using fallback', err);
    return FALLBACK_TIPS;
  }
}

/**
 * Pick a random tip from the active pool.
 * @returns {Promise<Object>}
 */
export async function getRandomTip() {
  const tips = await getActiveTips();
  return tips[Math.floor(Math.random() * tips.length)];
}
