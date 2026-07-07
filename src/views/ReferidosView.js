/* ============================================
   PIGGY APP — Referidos (Referrals) View
   Renders the Granja dashboard as background and
   immediately opens the Referrals modal overlay.
   ============================================ */

import { renderGranjaView } from './GranjaView.js';
import { showReferralModal } from './granja/ReferralsModal.js';

/**
 * Render the Referidos view.
 * Enables direct routing to the Referral Program via '#/referidos'.
 */
export function renderReferidosView() {
  // Render the farm view in the background
  const cleanup = renderGranjaView();
  
  // Instantly trigger the referral modal overlay
  showReferralModal();
  
  return cleanup;
}
