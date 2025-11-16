// ===== PLAYER MODULE =====

// ===== CONSTANTS =====
const REPEAT_MODES = {
    OFF: "off",
    ALL: "all",
    ONE: "one",
};

const PLAYER_STATE_KEY = "player_state_v1";
const STATE_SAVE_THROTTLE_MS = 500;
const TIME_BUFFER_SECONDS = 0.2;
const DEFAULT_VOLUME = 0.8;
const MOBILE_BREAKPOINT = 900;
const NAVIGATION_TYPE_RELOAD = 1;

const AD_LOCK_SELECTORS = [
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

// ===== STATE VARIABLES =====
// Player state
let audio = null;
let index = 0;
let isPlaying = false;
let shuffle = false;
let repeatMode = REPEAT_MODES.OFF;

// Ad state
let isAdPlaying = false;
let adAfterCallback = null;
let adShownThisTrackCycle = false;
let lastAdTrackId = null;
let currentTrackKey = null;

// Logout flag
let logoutInProgress = false;

// DOM elements (will be set during init)
let elements = {};

// Player state persistence
let lastStateSavedAt = 0;

// ===== INITIALIZATION HELPERS =====
/**
 * Detects if this is the first visit
 * @returns {boolean}
 */
function detectFirstVisit() {
    try {
        const isFirst = !sessionStorage.getItem("app_started");
        sessionStorage.setItem("app_started", "1");
        return isFirst;
    } catch {
        return false;
    }
}

/**
 * Detects if user just logged in
 * @returns {boolean}
 */
function detectJustLoggedIn() {
    try {
        const currentUser = localStorage.getItem("auth_user") || "";
        const seenUser = sessionStorage.getItem("seen_auth_user") || "";
        if (currentUser && currentUser !== seenUser) {
            sessionStorage.setItem("seen_auth_user", currentUser);
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

const FIRST_VISIT = detectFirstVisit();
const JUST_LOGGED_IN = detectJustLoggedIn();

// ===== AD ASSETS =====
const adAssets = {
    title: "Quảng cáo",
    artist: "Tài trợ",
    src: "./assets/quang_cao/songs_quang_cao/quang_cao.mp3",
    cover: "./assets/quang_cao/imgs_banner_quang_cao/quang_cao.png",
    artistImg: "./assets/quang_cao/imgs_logo_quang_cao/quang_cao.png",
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
 * Formats seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Checks if navigation was a reload
 * @returns {boolean}
 */
function isReloadNavigation() {
    return safeExecute(() => {
        const navEntries =
            performance.getEntriesByType &&
            performance.getEntriesByType("navigation");
        if (navEntries?.[0]?.type === "string") {
            return navEntries[0].type === "reload";
        }
        // Fallback (deprecated API)
        if (performance?.navigation?.type === "number") {
            return performance.navigation.type === NAVIGATION_TYPE_RELOAD;
        }
        return false;
    }, "isReloadNavigation") ?? false;
}

/**
 * Gets a unique key for a track
 * @param {Object} track - Track object
 * @returns {string|null} Track key or null
 */
function getTrackKey(track) {
    if (!track) return null;
    return track.id || track.src || `${track.title}|${track.artist}` || null;
}

/**
 * Updates play/pause UI icon
 * @param {boolean} isPlaying - Whether audio is playing
 */
function setPlayUI(isPlaying) {
    if (!elements.playIcon) return;
    elements.playIcon.classList.toggle("fa-play", !isPlaying);
    elements.playIcon.classList.toggle("fa-pause", isPlaying);
}

/**
 * Enables or disables player controls
 * @param {boolean} disabled - Whether to disable controls
 */
function setControlsDisabled(disabled) {
    const controls = [
        elements.playBtn,
        elements.prevBtn,
        elements.nextBtn,
        elements.shuffleBtn,
        elements.repeatBtn,
    ];
    
    controls.forEach((button) => {
        if (!button) return;
        button.disabled = !!disabled;
        button.classList.toggle("disabled", !!disabled);
    });
    
    if (elements.progress) {
        elements.progress.disabled = !!disabled;
    }
}

/**
 * Checks if premium is enabled
 * @returns {boolean}
 */
function isPremiumOn() {
    return safeExecute(
        () => localStorage.getItem("premium_enabled") === "true",
        "isPremiumOn"
    ) ?? false;
}

// ===== PLAYER STATE PERSISTENCE =====
/**
 * Saves current player state to localStorage
 * @param {boolean} force - Force save even if throttled
 */
function savePlayerState(force = false) {
    if (isAdPlaying) return; // Avoid saving ad as track
    
    const now = Date.now();
    if (!force && now - lastStateSavedAt < STATE_SAVE_THROTTLE_MS) {
        return; // Throttle saves
    }
    lastStateSavedAt = now;

    safeExecute(() => {
        const playlist = window.__mbPlaylist || [];
        const currentTrack = playlist[index];
        
        const state = {
            index,
            currentTime: Math.max(
                0,
                Math.min(
                    audio.currentTime || 0,
                    isFinite(audio.duration)
                        ? audio.duration - TIME_BUFFER_SECONDS
                        : 1e9
                )
            ),
            isPlaying: logoutInProgress
                ? false
                : !!isPlaying && !isAdPlaying,
            volume: Number.isFinite(audio.volume) ? audio.volume : DEFAULT_VOLUME,
            shuffle: !!shuffle,
            repeatMode,
            queueOpen: document.body.classList.contains("queue-open"),
            ts: now,
            playlistCtx: window.__mbCurrentPlaylistCtx || { type: "global", id: null },
            trackIds: playlist.map((t) => t?.id).filter(Boolean),
            currentId: currentTrack?.id || null,
        };
        
        localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
    }, "savePlayerState");
}

/**
 * Retrieves saved player state from localStorage
 * @returns {Object|null} Saved state or null
 */
function getSavedPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(PLAYER_STATE_KEY);
        if (!raw) return null;
        
        const state = JSON.parse(raw);
        if (!state || typeof state !== "object") return null;
        
        return state;
    }, "getSavedPlayerState") ?? null;
}

/**
 * Restores player state from localStorage
 * @returns {boolean} Success status
 */
function restorePlayerState() {
    const savedState = getSavedPlayerState();
    if (!savedState) return false;

    return safeExecute(() => {
        const playlist = window.__mbPlaylist || [];
        
        // Validate index
        if (
            typeof savedState.index !== "number" ||
            savedState.index < 0 ||
            savedState.index >= playlist.length
        ) {
            return false;
        }

        // Restore volume
        if (typeof savedState.volume === "number") {
            audio.volume = Math.min(1, Math.max(0, savedState.volume));
            if (elements.volume) {
                elements.volume.value = String(audio.volume);
                elements.volume.setAttribute("aria-valuenow", String(audio.volume));
            }
            updateVolumeSlider();
        }

        // Restore shuffle
        if (typeof savedState.shuffle === "boolean") {
            shuffle = savedState.shuffle;
            if (elements.shuffleBtn) {
                elements.shuffleBtn.classList.toggle("active", shuffle);
            }
            updateShuffleA11y();
        }

        // Restore repeat mode
        if (
            savedState.repeatMode === REPEAT_MODES.OFF ||
            savedState.repeatMode === REPEAT_MODES.ALL ||
            savedState.repeatMode === REPEAT_MODES.ONE
        ) {
            repeatMode = savedState.repeatMode;
            if (elements.repeatBtn) {
                elements.repeatBtn.dataset.mode = repeatMode;
                elements.repeatBtn.classList.toggle("active", repeatMode !== REPEAT_MODES.OFF);
            }
            updateRepeatA11y();
        }

        // Determine target index (prefer mapping by currentId)
        let targetIndex = savedState.index;
        if (savedState.currentId) {
            const foundIndex = playlist.findIndex(
                (track) => track?.id === savedState.currentId
            );
            if (foundIndex >= 0) {
                targetIndex = foundIndex;
            }
        }

        loadTrack(targetIndex);

        // Restore playback time
        const applyTime = () => {
            if (
                typeof savedState.currentTime === "number" &&
                isFinite(audio.duration)
            ) {
                audio.currentTime = Math.min(
                    audio.duration - TIME_BUFFER_SECONDS,
                    Math.max(0, savedState.currentTime)
                );
            }
        };

        if (isFinite(audio.duration)) {
            applyTime();
        } else {
            audio.addEventListener("loadedmetadata", applyTime, { once: true });
        }

        // Restore play/pause state
        if (isReloadNavigation()) {
            pause();
            setPlayUI(false);
        } else {
            // Force paused on first visit OR right after login
            if (!FIRST_VISIT && !JUST_LOGGED_IN && savedState.isPlaying) {
                play();
            } else {
                setPlayUI(false);
            }
        }

        return true;
    }, "restorePlayerState") ?? false;
}

// ===== AD FUNCTIONS =====
/**
 * Applies ad UI to player elements
 */
function applyAdUI() {
    safeExecute(() => {
        // Update main player UI
        if (elements.titleEl) elements.titleEl.textContent = adAssets.title;
        if (elements.artistEl) elements.artistEl.textContent = adAssets.artist;
        if (elements.coverEl) elements.coverEl.src = adAssets.cover;

        // Update banner UI
        if (elements.bTitle) elements.bTitle.textContent = adAssets.title;
        if (elements.bArtistName) elements.bArtistName.textContent = adAssets.artist;
        if (elements.bCover) elements.bCover.src = adAssets.cover;
        if (elements.bArtistAvatar) elements.bArtistAvatar.src = adAssets.artistImg;

        // Reset progress
        if (elements.progress) {
            elements.progress.value = 0;
            elements.progress.style.setProperty("--progress-value", "0%");
        }

        // Reset time displays
        if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
        if (elements.durationEl) elements.durationEl.textContent = "0:00";
    }, "applyAdUI");
}

/**
 * Starts an ad and executes callback after
 * @param {Function|null} callback - Callback to execute after ad
 */
function startAdThen(callback) {
    // Don't start ad if already playing
    if (isAdPlaying) return;

    // Skip ad for premium users
    if (isPremiumOn()) {
        if (typeof callback === "function") {
            callback();
        } else {
            nextTrack(true);
        }
        return;
    }

    // Skip ad if already shown for this track in repeat-one mode
    if (repeatMode === REPEAT_MODES.ONE && adShownThisTrackCycle) {
        if (typeof callback === "function") {
            callback();
        } else {
            nextTrack(true);
        }
        return;
    }

    isAdPlaying = true;
    adAfterCallback = typeof callback === "function" ? callback : null;
    setControlsDisabled(true);
    applyAdUI();
    
    audio.src = adAssets.src;
    audio.load();
    play();

    safeExecute(() => {
        if (elements.queueListEl) {
            elements.queueListEl.setAttribute("aria-disabled", "true");
        }
        document.body.classList.add("ad-locked");
    }, "startAdThen");
}

/**
 * Ends ad and resumes playback
 */
function endAdThenResume() {
    isAdPlaying = false;
    setControlsDisabled(false);

    safeExecute(() => {
        if (elements.queueListEl) {
            elements.queueListEl.removeAttribute("aria-disabled");
        }
        document.body.classList.remove("ad-locked");
    }, "endAdThenResume");

    // Execute callback or continue to next track
    if (typeof adAfterCallback === "function") {
        const callback = adAfterCallback;
        adAfterCallback = null;
        callback();
    } else {
        nextTrack(true);
    }
}

// ===== TRACK LOADING AND PLAYBACK =====
/**
 * Updates track UI elements
 * @param {Object} track - Track object
 */
function updateTrackUI(track) {
    // Update main player UI
    if (elements.titleEl) elements.titleEl.textContent = track.title;
    if (elements.artistEl) elements.artistEl.textContent = track.artist;
    if (elements.coverEl) elements.coverEl.src = track.cover;

    // Update banner UI
    if (elements.bTitle) elements.bTitle.textContent = track.title;
    if (elements.bArtistName) elements.bArtistName.textContent = track.artist;
    if (elements.bCover) elements.bCover.src = track.cover;
    if (elements.bArtistAvatar) {
        elements.bArtistAvatar.src = track.artistImg || track.cover;
    }
}

/**
 * Resets progress and time displays
 */
function resetProgressUI() {
    if (elements.progress) {
        elements.progress.value = 0;
        elements.progress.style.setProperty("--progress-value", "0%");
    }
    if (elements.currentTimeEl) elements.currentTimeEl.textContent = "0:00";
    if (elements.durationEl) elements.durationEl.textContent = "0:00";
}

/**
 * Loads a track at the given index
 * @param {number} trackIndex - Index of track to load
 */
function loadTrack(trackIndex) {
    const playlist = window.__mbPlaylist || [];
    const track = playlist[trackIndex];
    if (!track) return;

    // Reset ad flags only if track identity changes
    const nextKey = getTrackKey(track);
    if (nextKey !== currentTrackKey) {
        currentTrackKey = nextKey;
        adShownThisTrackCycle = false;
        lastAdTrackId = null;
    }

    index = trackIndex;
    audio.src = track.src;
    audio.load();

    // Update UI
    updateTrackUI(track);
    resetProgressUI();

    // Expose current track id for other modules
    safeExecute(() => {
        window.currentTrackId = track.id || null;
    }, "loadTrack:setTrackId");

    // Update queue active state
    if (window.__mbUpdateQueueActive) {
        window.__mbUpdateQueueActive(index);
    }

    // Notify other modules
    safeExecute(() => {
        window.dispatchEvent(
            new CustomEvent("musicbox:trackchange", { detail: { index } })
        );
    }, "loadTrack:dispatchEvent");
}

/**
 * Plays the audio
 */
function play() {
    audio.play();
    isPlaying = true;
    setPlayUI(true);
    safeExecute(() => {
        window.dispatchEvent(new Event("musicbox:statechange"));
    }, "play:dispatchEvent");
}

/**
 * Pauses the audio
 */
function pause() {
    audio.pause();
    isPlaying = false;
    setPlayUI(false);
    safeExecute(() => {
        window.dispatchEvent(new Event("musicbox:statechange"));
    }, "pause:dispatchEvent");
}

/**
 * Gets a random index different from current index
 * @param {number} currentIndex - Current track index
 * @param {number} playlistLength - Playlist length
 * @returns {number} Random index
 */
function getRandomIndex(currentIndex, playlistLength) {
    if (playlistLength === 1) return currentIndex;
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * playlistLength);
    } while (randomIndex === currentIndex);
    return randomIndex;
}

/**
 * Calculates next track index
 * @returns {number} Next track index
 */
function nextIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        return getRandomIndex(index, playlist.length);
    }
    return (index + 1) % playlist.length;
}

/**
 * Calculates previous track index
 * @returns {number} Previous track index
 */
function prevIndex() {
    const playlist = window.__mbPlaylist || [];
    if (shuffle) {
        return getRandomIndex(index, playlist.length);
    }
    return (index - 1 + playlist.length) % playlist.length;
}

/**
 * Advances to next track
 * @param {boolean} auto - Whether this was auto-advanced
 */
function nextTrack(auto = false) {
    // Repeat one: restart current track
    if (auto && repeatMode === REPEAT_MODES.ONE) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    const playlist = window.__mbPlaylist || [];
    
    // End of playlist: stop if not repeating
    if (
        auto &&
        repeatMode === REPEAT_MODES.OFF &&
        !shuffle &&
        index === playlist.length - 1
    ) {
        pause();
        audio.currentTime = 0;
        return;
    }

    loadTrack(nextIndex());
    
    if (isPlaying || auto) {
        play();
    } else {
        setPlayUI(false);
    }

    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

/**
 * Goes to previous track
 */
function prevTrack() {
    loadTrack(prevIndex());
    if (isPlaying) play();
    if (window.__mbPushUIState) window.__mbPushUIState();
    savePlayerState(true);
}

// ===== ACCESSIBILITY HELPERS =====
/**
 * Updates repeat button accessibility attributes
 */
function updateRepeatA11y() {
    if (!elements.repeatBtn) return;
    
    const pressed = repeatMode !== REPEAT_MODES.OFF;
    elements.repeatBtn.setAttribute("aria-pressed", String(pressed));
    
    const titles = {
        [REPEAT_MODES.OFF]: "Repeat: Off",
        [REPEAT_MODES.ALL]: "Repeat: All",
        [REPEAT_MODES.ONE]: "Repeat: One",
    };
    elements.repeatBtn.title = titles[repeatMode] || "Repeat";
}

/**
 * Updates shuffle button accessibility attributes
 */
function updateShuffleA11y() {
    if (!elements.shuffleBtn) return;
    elements.shuffleBtn.setAttribute("aria-pressed", String(shuffle));
    elements.shuffleBtn.title = shuffle ? "Shuffle: On" : "Shuffle: Off";
}

// ===== VOLUME CONTROL =====
/**
 * Updates volume slider visual indicator
 */
function updateVolumeSlider() {
    if (!elements.volume) return;
    const value = elements.volume.value;
    const percentage = (value / elements.volume.max) * 100;
    elements.volume.style.setProperty("--volume-value", `${percentage}%`);
}

// ===== AD INTERACTION GUARDS =====
/**
 * Checks if an element matches ad-locked selectors
 * @param {Element} element - Element to check
 * @returns {boolean}
 */
function isAdLockedElement(element) {
    if (!(element instanceof Element)) return false;
    return AD_LOCK_SELECTORS.some((selector) => element.closest(selector));
}

/**
 * Sets up ad interaction guards to prevent control during ads
 */
function setupAdInteractionGuards() {
    safeExecute(() => {
        // Add visual cue styles when locked
        if (!document.getElementById("ad-lock-style")) {
            const style = document.createElement("style");
            style.id = "ad-lock-style";
            style.textContent = `
                body.ad-locked .player .controls .btn,
                body.ad-locked #progress,
                body.ad-locked #queue-list *,
                body.ad-locked #pl-tbody tr,
                body.ad-locked .song-card,
                body.ad-locked .song-item {
                    cursor: not-allowed !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Block clicks on locked elements
        document.addEventListener(
            "click",
            (e) => {
                if (!isAdPlaying) return;
                if (isAdLockedElement(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            },
            true
        );

        // Block keyboard interactions on locked elements
        document.addEventListener(
            "keydown",
            (e) => {
                if (!isAdPlaying) return;
                if ((e.key === "Enter" || e.key === " ") && isAdLockedElement(e.target)) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            },
            true
        );
    }, "setupAdInteractionGuards");
}

/**
 * Handles track ended event with ad logic
 */
function handleTrackEnded() {
    // If repeating one song, show ad only once per track cycle
    if (repeatMode === REPEAT_MODES.ONE) {
        const playlist = window.__mbPlaylist || [];
        const currentTrack = playlist[index];
        const currentId = currentTrack?.id || null;

        if (
            !adShownThisTrackCycle &&
            currentId &&
            currentId !== lastAdTrackId
        ) {
            adShownThisTrackCycle = true;
            lastAdTrackId = currentId;
            startAdThen(() => nextTrack(true));
        } else {
            nextTrack(true); // Loop without showing ad again
        }
    } else {
        startAdThen(() => nextTrack(true));
    }
}

/**
 * Sets up mobile volume toggle functionality
 */
function setupMobileVolumeToggle() {
    function toggleMobileVolume(e) {
        if (window.innerWidth > MOBILE_BREAKPOINT) return;
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
            if (window.innerWidth > MOBILE_BREAKPOINT) return;
            const right = document.querySelector(".right");
            if (right && (right.contains(e.target) || e.target === elements.volIcon)) {
                return;
            }
            hideMobileVolume();
        },
        true
    );

    window.addEventListener("resize", () => {
        if (window.innerWidth > MOBILE_BREAKPOINT) hideMobileVolume();
    });
}

// ===== EVENT LISTENERS SETUP =====
/**
 * Sets up all event listeners for player controls
 */
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
            
            // Disable repeat-one when shuffle is enabled
            if (repeatMode === REPEAT_MODES.ONE && shuffle) {
                repeatMode = REPEAT_MODES.ALL;
            }
            
            if (elements.repeatBtn) {
                elements.repeatBtn.dataset.mode = repeatMode;
                elements.repeatBtn.classList.toggle("active", repeatMode !== REPEAT_MODES.OFF);
            }
            
            updateShuffleA11y();
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Repeat button
    if (elements.repeatBtn) {
        elements.repeatBtn.addEventListener("click", () => {
            // Cycle through repeat modes: off -> all -> one -> off
            repeatMode =
                repeatMode === REPEAT_MODES.OFF
                    ? REPEAT_MODES.ALL
                    : repeatMode === REPEAT_MODES.ALL
                    ? REPEAT_MODES.ONE
                    : REPEAT_MODES.OFF;
            
            elements.repeatBtn.dataset.mode = repeatMode;
            elements.repeatBtn.classList.toggle("active", repeatMode !== REPEAT_MODES.OFF);
            updateRepeatA11y();
            savePlayerState(true);
        });
    }

    // Audio events
    audio.addEventListener("loadedmetadata", () => {
        if (elements.durationEl) {
            elements.durationEl.textContent = formatTime(audio.duration);
        }
    });

    audio.addEventListener("timeupdate", () => {
        const percentage = (audio.currentTime / audio.duration) * 100;
        const value = isFinite(percentage) ? Math.round(percentage) : 0;
        
        if (elements.progress) {
            elements.progress.value = value;
            elements.progress.setAttribute("aria-valuenow", String(value));
            elements.progress.style.setProperty("--progress-value", `${value}%`);
        }
        
        if (elements.currentTimeEl) {
            elements.currentTimeEl.textContent = formatTime(audio.currentTime);
        }
        
        savePlayerState(false);
    });

    audio.addEventListener("ended", () => {
        if (isAdPlaying) {
            endAdThenResume();
        } else if (isPremiumOn()) {
            nextTrack(true);
        } else {
            handleTrackEnded();
        }
    });

    // Prevent pausing ad
    audio.addEventListener("pause", () => {
        if (isAdPlaying) {
            safeExecute(() => audio.play(), "preventAdPause");
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
                let volumeIcon = "fa-solid ";
                if (audio.volume === 0) {
                    volumeIcon += "fa-volume-xmark";
                } else if (audio.volume < 0.5) {
                    volumeIcon += "fa-volume-low";
                } else {
                    volumeIcon += "fa-volume-high";
                }
                elements.volIcon.className = volumeIcon;
            }
            savePlayerState(true);
        });
    }

    // Mobile volume toggle
    if (elements.volIcon) {
        setupMobileVolumeToggle();
    }
}

// ===== PLAYER INITIALIZATION =====
/**
 * Initializes the player module
 * @param {Object} options - Initialization options
 * @returns {Object} Player context with public methods
 */
export function initPlayer(options = {}) {
    // Create audio element
    audio = new Audio();
    safeExecute(() => {
        window.__mbAudio = audio;
        window.__mbLogoutInProgress = logoutInProgress;
    }, "initPlayer:exposeGlobals");

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
    safeExecute(() => {
        window.MusicBox = Object.assign({}, window.MusicBox || {}, {
            playAt(trackIndex) {
                const playlist = window.__mbPlaylist || [];
                if (
                    typeof trackIndex === "number" &&
                    trackIndex >= 0 &&
                    trackIndex < playlist.length
                ) {
                    if (isAdPlaying) return;
                    loadTrack(trackIndex);
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
            setPlaylist(tracks, context) {
                if (isAdPlaying) return;
                if (window.__mbSetPlaylist) {
                    const success = window.__mbSetPlaylist(tracks, context);
                    if (success) {
                        if (window.__mbRenderQueue) window.__mbRenderQueue();
                        loadTrack(0);
                        setPlayUI(false);
                        savePlayerState(true);
                    }
                }
            },
            pause() {
                pause();
                savePlayerState(true);
            },
            resume() {
                if (isAdPlaying) return;
                play();
                savePlayerState(true);
            },
            isPlaying() {
                return !!isPlaying;
            },
        });
    }, "initPlayer:exposeMusicBoxAPI");

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
