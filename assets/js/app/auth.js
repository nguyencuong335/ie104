// ===== AUTHENTICATION MODULE =====

/** Login gate: requires authentication before viewing site */
export function gate() {
    try {
        const u = JSON.parse(localStorage.getItem("auth_user") || "null");
        if (!u) {
            const next = location.pathname + location.search + location.hash;
            location.replace("./landingpage.html");
        }
    } catch {
        location.replace("./landingpage.html");
    }
}

/** Sign out and redirect to login page (keeping next parameter to return) */
export function signOut(redirect = true) {
    // Persist paused player state so next app load won't auto-play
    try {
        // Set logout flag for player module
        if (window.__mbLogoutInProgress !== undefined) {
            window.__mbLogoutInProgress = true;
        }
        
        // Pause immediately in current session
        try {
            if (window.__mbAudio) window.__mbAudio.pause();
        } catch {}
        
        // Try to call player pause if available
        try {
            if (window.MusicBox && typeof window.MusicBox.pause === 'function') {
                window.MusicBox.pause();
            }
        } catch {}
        
        // Force save paused state
        const KEY = "player_state_v1";
        const raw = localStorage.getItem(KEY);
        let s = null;
        try {
            s = raw ? JSON.parse(raw) : null;
        } catch {}
        const patch = s
            ? { ...s, isPlaying: false }
            : {
                  index: 0,
                  currentTime: 0,
                  isPlaying: false,
                  volume: 0.8,
                  shuffle: false,
                  repeatMode: "off",
                  queueOpen: false,
                  ts: Date.now(),
              };
        localStorage.setItem(KEY, JSON.stringify(patch));
    } catch {}
    
    try {
        localStorage.removeItem("auth_user");
    } catch {}
    
    if (redirect) {
        location.replace("./landingpage.html");
    }
}
