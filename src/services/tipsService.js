/* ============================================
   PIGGY APP — Tips Service
   Fetches dynamic notification tips from DB.
   Falls back to hardcoded data in mock mode
   or if the network request fails.
   ============================================ */

import { getClient, isUsingMockData } from './supabase.js';
import { getWelcomeBonusExpiryInfo } from './walletService.js';

/**
 * Fallback tips used in mock mode or on DB error.
 * Mirrors the data inserted in the dynamic_tips table.
 */
const FALLBACK_TIPS = [
  {
    icon: '🎉',
    title: 'Compra en locales aliados',
    reward: 'Desbloquea un Piggy Silver (24h)',
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#ffe4e6',
    ctaUrl: '#/aliados',
  },
  {
    icon: '🐘',
    title: 'Al cerrar un ciclo',
    reward: 'Desbloquea Piggy Silver (24h)',
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#ffe4e6',
    ctaUrl: null,
  },
  {
    icon: '🔥',
    title: 'Compra la oferta de la semana',
    reward: 'Desbloquea un Piggy Gold (24h)',
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#ffe4e6',
    ctaUrl: '#/gourmet',
  },
  {
    icon: '🤝',
    title: 'Refiere a un amigo y si compra su 1er Piggy',
    reward: 'Obtén $20.000 en tu Wallet',
    color: '#be123c',
    bgColor: '#fff1f2',
    borderColor: '#ffe4e6',
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
 * Automatically injects the dynamic Welcome Bonus tip if active and within 30 days.
 * @returns {Promise<Array<Object>>}
 */
export async function getActiveTips() {
  let tips = [];
  if (isUsingMockData()) {
    tips = [...FALLBACK_TIPS];
  } else {
    try {
      const client = getClient();
      const { data, error } = await client
        .from('dynamic_tips')
        .select('icon, title, reward, color, bg_color, border_color, cta_url')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error || !data?.length) {
        console.warn('TipsService: falling back to local data', error?.message);
        tips = [...FALLBACK_TIPS];
      } else {
        tips = data.map(normalizeTip);
      }
    } catch (err) {
      console.warn('TipsService: unexpected error, using fallback', err);
      tips = [...FALLBACK_TIPS];
    }
  }

  // Dynamic Welcome Bonus Countdown Tip (active while within 30 days and has balance)
  try {
    const expiryInfo = await getWelcomeBonusExpiryInfo();
    if (expiryInfo.status === 'active' && !expiryInfo.isExpired && expiryInfo.daysRemaining > 0 && expiryInfo.hasWelcomeBonus) {
      const daysText = expiryInfo.daysRemaining === 1 ? '1 día' : `${expiryInfo.daysRemaining} días`;
      const welcomeBonusTip = {
        icon: '🎁',
        title: 'Bono Bienvenida $20.000',
        reward: `Redime en productos de la Tienda. <strong>Te quedan solo ${daysText}</strong>`,
        color: '#be123c',
        bgColor: '#fff1f2',
        borderColor: '#ffe4e6',
        ctaUrl: '#/gourmet',
      };
      tips.unshift(welcomeBonusTip);
    }
  } catch (err) {
    console.warn('TipsService: error checking welcome bonus tip expiry', err);
  }

  return tips;
}

/**
 * Pick a random tip from the active pool.
 * @returns {Promise<Object>}
 */
export async function getRandomTip() {
  const tips = await getActiveTips();
  return tips[Math.floor(Math.random() * tips.length)];
}
