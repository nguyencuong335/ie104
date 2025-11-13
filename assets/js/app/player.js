// ===== PLAYER MODULE =====

// Player state
let audio = null;
let index = 0;
let isPlaying = false;
let shuffle = false;
let repeatMode = "off"; // 'off' | 'all' | 'one'

// Ad state
let isAdPlaying = false;
let adAfterCallback = null;
let adShownThisTrackCycle = false;
let lastAdTrackId = null;
let currentTrackKey = null;

// Logout flag
let logoutInProgress = false;

// First visit detection
const FIRST_VISIT = (() => {
    try {
        const v = !sessionStorage.getItem("app_started");
        sessionStorage.setItem("app_started", "1");
        return v;
    } catch {
        return false;
    }
})();

// Just logged in detection
let JUST_LOGGED_IN = false;
try {
    const uNow = localStorage.getItem("auth_user") || "";
    const uSeen = sessionStorage.getItem("seen_auth_user") || "";
    if (uNow && uNow !== uSeen) {
        JUST_LOGGED_IN = true;
        sessionStorage.setItem("seen_auth_user", uNow);
    }
} catch {}

// DOM elements (will be set during init)
let elements = {};

// Ad assets
const adAssets = {
    title: "Quảng cáo",
    artist: "Tài trợ",
    src: "./assets/quang_cao/songs_quang_cao/quang_cao.mp3",
    cover: "./assets/quang_cao/imgs_banner_quang_cao/quang_cao.png",
    artistImg: "./assets/quang_cao/imgs_logo_quang_cao/quang_cao.png",
};

// Helper functions
function fmt(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60),
        ss = Math.floor(s % 60)
            .toString()
            .padStart(2, "0");
    return `${m}:${ss}`;
}

function isReloadNavigation() {
    try {
        const nav =
            performance.getEntriesByType &&
            performance.getEntriesByType("navigation");
        if (nav && nav[0] && typeof nav[0].type === "string")
            return nav[0].type === "reload";
        // fallback (deprecated API)
        if (
            performance &&
            performance.navigation &&
            typeof performance.navigation.type === "number"
        )
            return performance.navigation.type === 1;
    } catch {}
    return false;
}

function getTrackKey(t) {
    try {
        return (t && (t.id || t.src || t.title + "|" + t.artist)) || null;
    } catch {
        return null;
    }
}

function setPlayUI(p) {
    if (elements.playIcon) {
        elements.playIcon.classList.toggle("fa-play", !p);
        elements.playIcon.classList.toggle("fa-pause", p);
    }
}

function setControlsDisabled(disabled) {
    try {
        [elements.playBtn, elements.prevBtn, elements.nextBtn, elements.shuffleBtn, elements.repeatBtn].forEach((b) => {
            if (!b) return;
            b.disabled = !!disabled;
            b.classList.toggle("disabled", !!disabled);
        });
        if (elements.progress) elements.progress.disabled = !!disabled;
    } catch {}
}

function isPremiumOn() {
    try {
        return localStorage.getItem("premium_enabled") === "true";
    } catch {
        return false;
    }
}

// Player state persistence
const PLAYER_STATE_KEY = "player_state_v1";
let lastStateSavedAt = 0;

function savePlayerState(force = false) {
    if (isAdPlaying) return; // avoid saving ad as track
    const now = Date.now();
    if (!force && now - lastStateSavedAt < 500) return; // throttle
    lastStateSavedAt = now;
    try {
        const playlist = window.__mbPlaylist || [];
        const s = {
            index,
            currentTime: Math.max(
                0,
                Math.min(
                    audio.currentTime || 0,
                    isFinite(audio.duration) ? audio.duration - 0.2 : 1e9
                )
            ),
            isPlaying: logoutInProgress
                ? false
                : !!isPlaying && !isAdPlaying,
            volume: Number.isFinite(audio.volume) ? audio.volume : 0.8,
            shuffle: !!shuffle,
            repeatMode,
            queueOpen: document.body.classList.contains("queue-open"),
            ts: now,
            playlistCtx: window.__mbCurrentPlaylistCtx || { type: "global", id: null },
            trackIds: (playlist || [])
                .map((t) => t && t.id)
                .filter(Boolean),
            currentId:
                playlist && playlist[index] && playlist[index].id
                    ? playlist[index].id
                    : null,
        };
        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(s));
    } catch {}
}

function getSavedPlayerState() {
    try {
        const raw = localStorage.getItem(PLAYER_STATE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object") return null;
        return obj;
    } catch {
        return null;
    }
}

function restorePlayerState() {
    const s = getSavedPlayerState();
    if (!s) return false;
    try {
        const playlist = window.__mbPlaylist || [];
        // sanity checks
        if (
            typeof s.index !== "number" ||
            s.index < 0 ||
            s.index >= playlist.length
        )
            return false;
        if (typeof s.volume === "number") {
            audio.volume = Math.min(1, Math.max(0, s.volume));
            if (elements.volume) {
                elements.volume.value = String(audio.volume);
                elements.volume.setAttribute("aria-valuenow", String(audio.volume));
            }
            try {
                updateVolumeSlider();
            } catch {}
        }
        if (s.shuffle === true || s.shuffle === false) {
            shuffle = !!s.shuffle;
            if (elements.shuffleBtn) {
                elements.shuffleBtn.classList.toggle("active", shuffle);
            }
            updateShuffleA11y();
        }
        if (
            s.repeatMode === "off" ||
            s.repeatMode === "all" ||
            s.repeatMode === "one"
        ) {
            repeatMode = s.repeatMode;
            if (elements.repeatBtn) {
                elements.repeatBtn.dataset.mode = repeatMode;
                elements.repeatBtn.classList.toggle("active", repeatMode !== "off");
            }
            updateRepeatA11y();
        }
        // Decide which index to load: prefer mapping by currentId if present
        let targetIndex = s.index;
        try {
            if (s.currentId) {
                const found = (playlist || []).findIndex(
                    (t) => t && t.id === s.currentId
                );
                if (found >= 0) targetIndex = found;
            }
        } catch {}
        loadTrack(targetIndex);
        const applyTime = () => {
            if (
                typeof s.currentTime === "number" &&
                isFinite(audio.duration)
            ) {
                audio.currentTime = Math.min(
                    audio.duration - 0.2,
                    Math.max(0, s.currentTime)
                );
            }
        };
        if (isFinite(audio.duration)) applyTime();
        else
            audio.addEventListener("loadedmetadata", applyTime, {
                once: true,
            });
        // Decide paused/playing on load
        // Always paused on explicit reloads
        if (isReloadNavigation()) {
            pause();
            setPlayUI(false);
        } else {
            // Force paused on first visit OR right after login in this session
            if (!FIRST_VISIT && !JUST_LOGGED_IN && s.isPlaying) {
                play();
            } else {
                setPlayUI(false);
            }
        }
        return true;
    } catch {
        return false;
    }
}

// Ad functions
function applyAdUI() {
    try {
        if (elements.titleEl) elements.titleEl.textContent = adAssets.title;
        if (elements.artistEl) elements.artistEl.textContent = adAssets.artist;
        if (elements.coverEl) elements.coverEl.src = adAssets.cover;
        if (elements.bTitle) elements.bTitle.textContent = adAssets.title;
        if (elements.bArtistName) elements.bArtistName.textContent = adAssets.artist;
        if (elements.bCover) elements.bCover.src = adAssets.cover;
        if (elements.bArtistAvatar) elements.bArtistAvatar.src = adAssets.artistImg;
        if (elements.progress) {
            elements.progress.value = 0;
            elements.progress.style.setProperty("--progress-value", "0%");
        }
        if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
        if (elements.durationEl) elements.durationEl.textContent = "0:00";
    } catch {}
}

function startAdThen(cb) {
    // Do not start ad in these cases
    if (isAdPlaying) return;
    if (isPremiumOn()) {
        if (typeof cb === "function") cb();
        else nextTrack(true);
        return;
    }
    if (repeatMode === "one" && adShownThisTrackCycle) {
        if (typeof cb === "function") cb();
        else nextTrack(true);
        return;
    }
    isAdPlaying = true;
    adAfterCallback = typeof cb === "function" ? cb : null;
    setControlsDisabled(true);
    applyAdUI();
    audio.src = adAssets.src;
    audio.load();
    play();
    try {
        if (elements.queueListEl) {
            elements.queueListEl.setAttribute("aria-disabled", "true");
        }
    } catch {}
    try {
        document.body.classList.add("ad-locked");
    } catch {}
}

function endAdThenResume() {
    isAdPlaying = false;
    setControlsDisabled(false);
    try {
        if (elements.queueListEl) {
            elements.queueListEl.removeAttribute("aria-disabled");
        }
    } catch {}
    try {
        document.body.classList.remove("ad-locked");
    } catch {}
    // Continue as requested
    if (typeof adAfterCallback === "function") {
        const fn = adAfterCallback;
        adAfterCallback = null;
        fn();
    } else {
        nextTrack(true);
    }
}

// Track loading and playback
function loadTrack(i) {
    const playlist = window.__mbPlaylist || [];
    const t = playlist[i];
    if (!t) return;
    
    // Only reset ad flags if the track identity actually changes
    const nextKey = getTrackKey(t);
    if (nextKey !== currentTrackKey) {
        currentTrackKey = nextKey;
        adShownThisTrackCycle = false;
        lastAdTrackId = null;
    }
    index = i;
    audio.src = t.src;
    audio.load();
    
    // Update UI elements
    if (elements.titleEl) elements.titleEl.textContent = t.title;
    if (elements.artistEl) elements.artistEl.textContent = t.artist;
    if (elements.coverEl) elements.coverEl.src = t.cover;

    // Update banner
    if (elements.bTitle) elements.bTitle.textContent = t.title;
    if (elements.bArtistName) elements.bArtistName.textContent = t.artist;
    if (elements.bCover) elements.bCover.src = t.cover;
    if (elements.bArtistAvatar) elements.bArtistAvatar.src = t.artistImg || t.cover;

    // Expose current track id for other modules
    try {
        window.currentTrackId = t && (t.id || null);
    } catch {}

    if (elements.progress) {
        elements.progress.value = 0;
        try {
            elements.progress.style.setProperty("--progress-value", "0%");
        } catch {}
    }
    if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
    if (elements.durationEl) elements.durationEl.textContent = "0:00";
    
    // Update queue active state
    if (window.__mbUpdateQueueActive) {
        window.__mbUpdateQueueActive(index);
    }

    // Notify other modules
    try {
        window.dispatchEvent(
            new CustomEvent("musicbox:trackchange", { detail: { index } })
        );
    } catch {}
}

function play() {
    audio.play();
    isPlaying = true;
    setPlayUI(true);
    try {
        window.dispatchEvent(new Event("musicbox:statechange"));
    } catch {}
}

function pause() {
    audio.pause();
    isPlaying = false;
    setPlayUI(false);
    try {
        window.dispatchEvent(new Event("musicbox:statechange"));
    } catch {}
}

function nextIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        if (playlist.length === 1) return index;
        let r;
        do {
            r = Math.floor(Math.random() * playlist.length);
        } while (r === index);
        return r;
    }
    return (index + 1) % playlist.length;
}

function prevIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        if (playlist.length === 1) return index;
        let r;
        do {
            r = Math.floor(Math.random() * playlist.length);
        } while (r === index);
        return r;
    }
    return (index - 1 + playlist.length) % playlist.length;
}

function nextTrack(auto = false) {
    if (auto && repeatMode === "one") {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    const playlist = window.__mbPlaylist || [];
    if (
        auto &&
        repeatMode === "off" &&
        !shuffle &&
        index === playlist.length - 1
    ) {
        pause();
        audio.currentTime = 0;
        return;
    }
    loadTrack(nextIndex());
    if (isPlaying || auto) play();
    else setPlayUI(false);
    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

function prevTrack() {
    loadTrack(prevIndex());
    if (isPlaying) play();
    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

// A11y helpers
function updateRepeatA11y() {
    if (!elements.repeatBtn) return;
    const pressed = repeatMode !== "off";
    elements.repeatBtn.setAttribute("aria-pressed", String(pressed));
    const titles = {
        off: "Repeat: Off",
        all: "Repeat: All",
        one: "Repeat: One",
    };
    elements.repeatBtn.title = titles[repeatMode] || "Repeat";
}

function updateShuffleA11y() {
    if (!elements.shuffleBtn) return;
    elements.shuffleBtn.setAttribute("aria-pressed", String(shuffle));
    elements.shuffleBtn.title = shuffle ? "Shuffle: On" : "Shuffle: Off";
}

// Volume slider update
function updateVolumeSlider() {
    if (!elements.volume) return;
    const value = elements.volume.value;
    const percentage = (value / elements.volume.max) * 100;
    elements.volume.style.setProperty("--volume-value", `${percentage}%`);
}

// Setup ad interaction guards
function setupAdInteractionGuards() {
    try {
        // Visual cue styles when locked
        if (!document.getElementById("ad-lock-style")) {
            const s = document.createElement("style");
            s.id = "ad-lock-style";
            s.textContent = `
              body.ad-locked .player .controls .btn,
              body.ad-locked #progress,
              body.ad-locked #queue-list *,
              body.ad-locked #pl-tbody tr,
              body.ad-locked .song-card,
              body.ad-locked .song-item { cursor:not-allowed !important; }
            `;
            document.head.appendChild(s);
        }
        const SELS = [
            "#play",
            "#next",
            "#prev",
            "#shuffle",
            "#repeat",
            "#progress",
            "#queue-list",
            "#pl-tbody tr",
            ".song-card",
            ".song-item",
            ".q-list",
            ".q-item",
            ".q-row",
        ];
        function isTrigger(el) {
            if (!(el instanceof Element)) return false;
            for (const sel of SELS) {
                if (el.closest(sel)) return true;
            }
            return false;
        }
        // Capture clicks
        document.addEventListener(
            "click",
            (e) => {
                try {
                    if (!isAdPlaying) return;
                    const t = e.target;
                    if (isTrigger(t)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }
                } catch {}
            },
            true
        );
        // Capture Enter/Space on interactive elements
        document.addEventListener(
            "keydown",
            (e) => {
                try {
                    if (!isAdPlaying) return;
                    if (e.key === "Enter" || e.key === " ") {
                        const t = e.target;
                        if (isTrigger(t)) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        }
                    }
                } catch {}
            },
            true
        );
    } catch {}
}

// Event listeners setup
function setupEventListeners() {
    // Play/pause button
    if (elements.playBtn) {
        elements.playBtn.addEventListener("click", () => {
            if (isAdPlaying) return; // cannot control during ad
            const playlist = window.__mbPlaylist || [];
            if (audio.src === "" && playlist.length > 0) loadTrack(index);
            isPlaying ? pause() : play();
            savePlayerState(true);
        });
    }

    // Previous button
    if (elements.prevBtn) {
        elements.prevBtn.addEventListener("click", () => {
            if (isAdPlaying) return;
            const playlist = window.__mbPlaylist || [];
            if (playlist.length === 0) return;
            prevTrack();
        });
    }

    // Next button
    if (elements.nextBtn) {
        elements.nextBtn.addEventListener("click", () => {
            if (isAdPlaying) return;
            const playlist = window.__mbPlaylist || [];
            if (playlist.length === 0) return;
            nextTrack(false);
        });
    }

    // Shuffle button
    if (elements.shuffleBtn) {
        elements.shuffleBtn.addEventListener("click", () => {
            shuffle = !shuffle;
            elements.shuffleBtn.classList.toggle("active", shuffle);
            if (repeatMode === "one" && shuffle) repeatMode = "all";
            if (elements.repeatBtn) {
                elements.repeatBtn.dataset.mode = repeatMode;
                elements.repeatBtn.classList.toggle("active", repeatMode !== "off");
            }
            updateShuffleA11y();
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Repeat button
    if (elements.repeatBtn) {
        elements.repeatBtn.addEventListener("click", () => {
            repeatMode =
                repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
            elements.repeatBtn.dataset.mode = repeatMode;
            elements.repeatBtn.classList.toggle("active", repeatMode !== "off");
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Audio events
    audio.addEventListener("loadedmetadata", () => {
        if (elements.durationEl) {
            elements.durationEl.textContent = fmt(audio.duration);
        }
    });

    audio.addEventListener("timeupdate", () => {
        const pct = (audio.currentTime / audio.duration) * 100;
        const val = isFinite(pct) ? Math.round(pct) : 0;
        if (elements.progress) {
            elements.progress.value = val;
            elements.progress.setAttribute("aria-valuenow", String(val));
            try {
                elements.progress.style.setProperty("--progress-value", val + "%");
            } catch {}
        }
        if (elements.currentTimeEl) {
            elements.currentTimeEl.textContent = fmt(audio.currentTime);
        }
        savePlayerState(false);
    });

    audio.addEventListener("ended", () => {
        if (isAdPlaying) {
            endAdThenResume();
        } else if (isPremiumOn()) {
            nextTrack(true);
        } else {
            // If repeating one song, show the ad only once for this track cycle
            if (repeatMode === "one") {
                const playlist = window.__mbPlaylist || [];
                const currentId =
                    playlist && playlist[index] && playlist[index].id
                        ? playlist[index].id
                        : null;
                if (
                    !adShownThisTrackCycle &&
                    currentId &&
                    currentId !== lastAdTrackId
                ) {
                    adShownThisTrackCycle = true;
                    lastAdTrackId = currentId;
                    startAdThen(() => nextTrack(true));
                } else {
                    nextTrack(true); // loop without showing ad again
                }
            } else {
                startAdThen(() => nextTrack(true));
            }
        }
    });

    // Prevent pausing ad
    audio.addEventListener("pause", () => {
        if (isAdPlaying) {
            try {
                audio.play();
            } catch {}
        }
    });

    // Progress bar
    if (elements.progress) {
        elements.progress.addEventListener("input", (e) => {
            if (isAdPlaying) return; // block seeking during ad
            if (!isFinite(audio.duration)) return;
            const val = Number(e.target.value);
            elements.progress.setAttribute("aria-valuenow", String(val));
            audio.currentTime = (val / 100) * audio.duration;
            savePlayerState(true);
        });
    }

    // Volume control
    if (elements.volume) {
        elements.volume.addEventListener("input", (e) => {
            const v = Number(e.target.value);
            audio.volume = v;
            elements.volume.setAttribute("aria-valuenow", String(v));
            if (elements.volIcon) {
                elements.volIcon.className =
                    "fa-solid " +
                    (audio.volume === 0
                        ? "fa-volume-xmark"
                        : audio.volume < 0.5
                        ? "fa-volume-low"
                        : "fa-volume-high");
            }
            savePlayerState(true);
        });
    }

    // Mobile volume toggle
    if (elements.volIcon) {
        function toggleMobileVolume(e) {
            if (window.innerWidth > 900) return;
            const right = elements.volIcon.closest(".right");
            if (!right) return;
            e.stopPropagation();
            right.classList.toggle("show-volume");
        }
        function hideMobileVolume() {
            const right = document.querySelector(".right.show-volume");
            if (right) right.classList.remove("show-volume");
        }
        elements.volIcon.addEventListener("click", toggleMobileVolume);
        document.addEventListener(
            "click",
            (e) => {
                if (window.innerWidth > 900) return;
                const right = document.querySelector(".right");
                if (right && (right.contains(e.target) || e.target === elements.volIcon))
                    return;
                hideMobileVolume();
            },
            true
        );
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) hideMobileVolume();
        });
    }
}

// Initialize player
export function initPlayer(options = {}) {
    // Create audio element
    audio = new Audio();
    try {
        window.__mbAudio = audio;
        window.__mbLogoutInProgress = logoutInProgress;
    } catch {}

    // Store DOM elements
    elements = {
        titleEl: document.getElementById("title"),
        artistEl: document.getElementById("artist"),
        coverEl: document.getElementById("cover"),
        playBtn: document.getElementById("play"),
        playIcon: document.getElementById("play-icon"),
        prevBtn: document.getElementById("prev"),
        nextBtn: document.getElementById("next"),
        shuffleBtn: document.getElementById("shuffle"),
        repeatBtn: document.getElementById("repeat"),
        progress: document.getElementById("progress"),
        currentTimeEl: document.getElementById("current"),
        durationEl: document.getElementById("duration"),
        volume: document.getElementById("volume"),
        volIcon: document.getElementById("vol-icon"),
        queueListEl: document.getElementById("queue-list"),
        bTitle: document.getElementById("b-title"),
        bArtistName: document.getElementById("b-artist-name"),
        bCover: document.getElementById("b-cover"),
        bArtistAvatar: document.getElementById("b-artist-avatar"),
        ...options.elements
    };

    // Setup event listeners
    setupEventListeners();
    setupAdInteractionGuards();

    // Initialize A11y
    updateShuffleA11y();
    updateRepeatA11y();

    // Set initial volume slider
    updateVolumeSlider();

    // Expose global API
    try {
        window.MusicBox = Object.assign({}, window.MusicBox || {}, {
            playAt(i) {
                const playlist = window.__mbPlaylist || [];
                if (typeof i === "number" && i >= 0 && i < playlist.length) {
                    if (isAdPlaying) return;
                    loadTrack(i);
                    play();
                    if (window.__mbPushUIState) window.__mbPushUIState();
                    savePlayerState(true);
                }
            },
            currentIndex() {
                return index;
            },
            playlist() {
                return (window.__mbPlaylist || []).slice();
            },
            setPlaylist: (tracks, ctx) => {
                try {
                    if (isAdPlaying) return;
                    if (window.__mbSetPlaylist) {
                        const success = window.__mbSetPlaylist(tracks, ctx);
                        if (success) {
                            if (window.__mbRenderQueue) window.__mbRenderQueue();
                            loadTrack(0);
                            setPlayUI(false);
                            savePlayerState(true);
                        }
                    }
                } catch {}
            },
            pause: () => {
                try {
                    pause();
                    savePlayerState(true);
                } catch {}
            },
            resume: () => {
                try {
                    if (isAdPlaying) return;
                    play();
                    savePlayerState(true);
                } catch {}
            },
            isPlaying: () => {
                try {
                    return !!isPlaying;
                } catch {
                    return false;
                }
            },
        });
    } catch {}

    return {
        loadTrack,
        play,
        pause,
        nextTrack,
        prevTrack,
        savePlayerState,
        restorePlayerState,
        getSavedPlayerState,
        getCurrentIndex: () => index,
        isCurrentlyPlaying: () => isPlaying,
        getAudio: () => audio,
        updateVolumeSlider
    };
}
