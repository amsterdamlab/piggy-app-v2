import { AppState } from '../state.js';
import { MOCK_MISSIONS } from './mockData.js';

// Simulación de base de datos local para misiones manuales (se reinicia al recargar página)
// En producción, esto vendría del backend.
let manualCompletions = new Set();

/**
 * Marca una misión externa como completada manualmente (ej: al hacer clic en el botón)
 */
export function completeMissionManual(missionId) {
    manualCompletions.add(missionId);
}

/**
 * Verifica si una misión fue completada manualmente en la sesión actual.
 */
export function isMissionCompletedManual(missionId) {
    return manualCompletions.has(missionId);
}


/**
 * Checks and updates mission statuses based on the current application state.
 * This is a client-side simulation. In production, this would be a DB query.
 */
export function syncMissionsStatus() {
    const piggies = AppState.get('piggies') || [];
    const profile = AppState.get('profile');

    // Mapeo de estado
    const hasFirstPiggy = piggies.length >= 1;
    const hasSecondPiggy = piggies.length >= 2;
    const hasThirdPiggy = piggies.length >= 3;

    const missions = MOCK_MISSIONS.map(mission => {
        // Copiamos la misión para no mutar la constante global directamente
        let m = { ...mission, is_locked: false };

        // 1. Verificar estado de completado (Automático + Manual)
        if (manualCompletions.has(m.id)) {
            m.is_completed = true;
        } else {
            // Lógica automática basada en ID
            switch (m.id) {
                case 'm1': // Cuenta creada (siempre true si hay perfil)
                    m.is_completed = !!profile;
                    break;
                case 'm2': // Primer Piggy
                    m.is_completed = hasFirstPiggy;
                    break;
                case 'm4': // Segundo Piggy
                    m.is_completed = hasSecondPiggy;
                    break;
                case 'm7': // Tercer Piggy
                    m.is_completed = hasThirdPiggy;
                    break;
                default:
                    // Las demás (m3, m5, etc) dependen de manualCompletions o flags del mock
                    // Forzamos false por defecto si no está en manualCompletions, 
                    // para evitar que el mockData 'true' confunda al usuario.
                    if (!manualCompletions.has(m.id)) {
                        m.is_completed = false;
                    }
                    break;
            }
        }

        // 2. Sistema de Niveles / Dependencias ESTRICTAS
        // Si la misión anterior clave no está lista, esta se bloquea (no se muestra)

        // m4 (2do Piggy) requiere m2 (1er Piggy)
        if (m.id === 'm4' && !hasFirstPiggy) {
            m.is_locked = true;
        }

        // m7 (3er Piggy) requiere m4 (2do Piggy)
        if (m.id === 'm7' && !hasSecondPiggy) {
            m.is_locked = true;
        }

        return m;
    });

    return missions;
}

/**
 * Get active (not completed AND not locked) missions.
 */
export function getActiveMissions() {
    const missions = syncMissionsStatus();
    // Filtramos completadas Y bloqueadas
    return missions.filter(m => !m.is_completed && !m.is_locked);
}

/**
 * Get mission progress stats.
 */
export function getMissionsProgress() {
    const missions = syncMissionsStatus();
    const total = missions.length;
    // Contamos completadas reales
    const completed = missions.filter(m => m.is_completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
}
