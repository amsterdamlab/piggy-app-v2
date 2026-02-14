/* ============================================
   PIGGY APP — State Management
   Simple pub/sub reactive state store
   ============================================ */

/**
 * Creates a reactive store with pub/sub pattern.
 * Each property change notifies subscribers.
 */
function createStore(initialState) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
        getState() {
            return { ...state };
        },

        get(key) {
            return state[key];
        },

        set(updates) {
            const previous = { ...state };
            state = { ...state, ...updates };

            // Only notify if something actually changed
            const changed = Object.keys(updates).some(
                (key) => previous[key] !== state[key]
            );
            if (changed) {
                listeners.forEach((listener) => listener(state, previous));
            }
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        reset() {
            state = { ...initialState };
            listeners.forEach((listener) => listener(state, initialState));
        },
    };
}

export const AppState = createStore({
    // Auth
    currentUser: null,
    profile: null,
    isAuthenticated: false,
    authLoading: true,

    // Legal
    showLegalModal: false,

    // Data
    piggies: [],
    marketplaceItems: [],
    allies: [],
    missions: [],

    // UI
    currentView: 'auth',
    activeTab: 'granja',
    isLoading: false,
    error: null,
    notification: null,
});
