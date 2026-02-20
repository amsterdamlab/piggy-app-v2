import { MOCK_MISSIONS } from './mockData.js';
import { AppState } from '../state.js';

/**
 * Checks and updates mission statuses based on the current application state.
 * This is a client-side simulation. In production, this would be a DB query.
 */
export function syncMissionsStatus() {
  const piggies = AppState.get('piggies') || [];
  const profile = AppState.get('profile');
  
  // Create a copy or update the mock directly for simulation
  const missions = MOCK_MISSIONS.map(mission => {
    switch (mission.id) {
      case 'm1': // Cuenta creada
        mission.is_completed = !!profile;
        break;
      case 'm2': // Primer Piggy
        if (piggies.length >= 1) mission.is_completed = true;
        break;
      case 'm4': // Segundo Piggy
        if (piggies.length >= 2) mission.is_completed = true;
        break;
      case 'm7': // Tercer Piggy
        if (piggies.length >= 3) mission.is_completed = true;
        break;
      // Las misiones m3, m5, m6, m8, m9 requieren tracking de eventos 
      // que implementaremos a medida que avancemos.
      default:
        break;
    }
    return mission;
  });

  return missions;
}

/**
 * Get active (not completed) missions, limited to the top 3.
 */
export function getActiveMissions() {
  const missions = syncMissionsStatus();
  return missions.filter(m => !m.is_completed);
}

/**
 * Get mission progress stats.
 */
export function getMissionsProgress() {
  const missions = syncMissionsStatus();
  const total = missions.length;
  const completed = missions.filter(m => m.is_completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { total, completed, percent };
}
