// ===== AUTHENTICATION MODULE =====

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    AUTH_USER: "auth_user",
    PLAYER_STATE: "player_state_v1",
};

const PATHS = {
    LANDING_PAGE: "./landingpage.html",
};

const DEFAULT_PLAYER_STATE = {
    index: 0,
    currentTime: 0,
    isPlaying: false,
    volume: 0.8,
    shuffle: false,
    repeatMode: "off",
    queueOpen: false,
    ts: Date.now(),
};

// ===== UTILITY FUNCTIONS =====
/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 * @returns {*} Function result or null on error
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return null;
    }
}

/**
 * Gets authenticated user from localStorage
 * @returns {Object|null} User object or null
 */
function getAuthUser() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getAuthUser") ?? null;
}

/**
 * Removes authenticated user from localStorage
 */
function removeAuthUser() {
    safeExecute(() => {
        localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }, "removeAuthUser");
}

/**
 * Redirects to landing page
 */
function redirectToLandingPage() {
    location.replace(PATHS.LANDING_PAGE);
}

/**
 * Gets saved player state from localStorage
 * @returns {Object|null} Player state or null
 */
function getPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getPlayerState") ?? null;
}

/**
 * Saves player state to localStorage
 * @param {Object} state - Player state object
 */
function savePlayerState(state) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.PLAYER_STATE,
            JSON.stringify(state)
        );
    }, "savePlayerState");
}

// ===== PLAYER STATE MANAGEMENT =====
/**
 * Sets logout flag for player module
 */
function setLogoutFlag() {
    safeExecute(() => {
        if (window.__mbLogoutInProgress !== undefined) {
            window.__mbLogoutInProgress = true;
        }
    }, "setLogoutFlag");
}

/**
 * Pauses current audio element
 */
function pauseCurrentAudio() {
    safeExecute(() => {
        if (window.__mbAudio) {
            window.__mbAudio.pause();
        }
    }, "pauseCurrentAudio");
}

/**
 * Pauses player via MusicBox API
 */
function pausePlayer() {
    safeExecute(() => {
        if (
            window.MusicBox &&
            typeof window.MusicBox.pause === "function"
        ) {
            window.MusicBox.pause();
        }
    }, "pausePlayer");
}

/**
 * Saves paused player state to localStorage
 */
function savePausedPlayerState() {
    const currentState = getPlayerState();
    const pausedState = currentState
        ? { ...currentState, isPlaying: false }
        : { ...DEFAULT_PLAYER_STATE };

    savePlayerState(pausedState);
}

/**
 * Pauses all audio and saves paused state
 */
function pauseAllAudio() {
    setLogoutFlag();
    pauseCurrentAudio();
    pausePlayer();
    savePausedPlayerState();
}

// ===== AUTHENTICATION FUNCTIONS =====
/**
 * Login gate: requires authentication before viewing site
 * Redirects to landing page if user is not authenticated
 */
export function gate() {
    const user = getAuthUser();
    if (!user) {
        redirectToLandingPage();
    }
}

/**
 * Signs out user and optionally redirects to landing page
 * Persists paused player state so next app load won't auto-play
 * @param {boolean} redirect - Whether to redirect to landing page (default: true)
 */
export function signOut(redirect = true) {
    // Pause all audio and save paused state
    pauseAllAudio();

    // Remove authenticated user
    removeAuthUser();

    // Redirect if requested
    if (redirect) {
        redirectToLandingPage();
    }
}
