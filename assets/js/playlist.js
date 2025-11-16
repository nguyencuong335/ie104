// ===== PLAYLIST PAGE MODULE =====

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    USER_PLAYLISTS: "user_playlists_v1",
    PLAYER_STATE: "player_state_v1",
};

const SONGS_JSON_PATH = "./assets/music_data/songs.json";
const PLAYLIST_TYPES = {
    USER: "user",
};

const DEFAULT_PLAYLIST_NAME = "Playlist";
const DEFAULT_TIME_DISPLAY = "--:--";

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
 * Query selector helper
 * @param {string} selector - CSS selector
 * @param {Document|Element} root - Root element to search from
 * @returns {HTMLElement|null} Found element or null
 */
function querySelector(selector, root = document) {
    return root.querySelector(selector);
}

/**
 * Query selector all helper
 * @param {string} selector - CSS selector
 * @param {Document|Element} root - Root element to search from
 * @returns {Array<HTMLElement>} Array of found elements
 */
function querySelectorAll(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
}

/**
 * Gets URL parameter value
 * @param {string} name - Parameter name
 * @returns {string} Parameter value or empty string
 */
function getUrlParam(name) {
    return safeExecute(() => {
        return new URL(location.href).searchParams.get(name) || "";
    }, "getUrlParam") ?? "";
}

/**
 * Formats seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Gets user playlists from localStorage
 * @returns {Array} Array of user playlists
 */
function getUserPlaylists() {
    return safeExecute(() => {
        return JSON.parse(
            localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS) || "[]"
        );
    }, "getUserPlaylists") ?? [];
}

/**
 * Gets cached songs from window
 * @returns {Array} Array of songs
 */
function getCachedSongs() {
    return safeExecute(() => {
        return window.__allSongs || [];
    }, "getCachedSongs") ?? [];
}

/**
 * Sets cached songs to window
 * @param {Array} songs - Array of songs
 */
function setCachedSongs(songs) {
    safeExecute(() => {
        window.__allSongs = songs;
    }, "setCachedSongs");
}

/**
 * Loads all songs from JSON file
 * @returns {Promise<Array>} Array of songs
 */
async function loadAllSongs() {
    const cached = getCachedSongs();
    if (cached.length > 0) {
        return cached;
    }

    try {
        const response = await fetch(SONGS_JSON_PATH, {
            cache: "no-store",
        });
        const data = await response.json();
        if (Array.isArray(data)) {
            setCachedSongs(data);
            return data;
        }
    } catch (error) {
        console.error("Không thể tải songs.json:", error);
    }
    return [];
}

/**
 * Creates a map of items by ID
 * @param {Array} items - Array of items with id property
 * @returns {Map} Map of id to item
 */
function createIdMap(items) {
    const map = new Map();
    items.forEach((item) => {
        if (item?.id) {
            map.set(item.id, item);
        }
    });
    return map;
}

/**
 * Saves user playlists to localStorage
 * @param {Array} playlists - Array of playlists
 */
function setUserPlaylists(playlists) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.USER_PLAYLISTS,
            JSON.stringify(playlists)
        );
        safeExecute(() => {
            window.dispatchEvent(new Event("playlists:changed"));
        }, "setUserPlaylists:dispatchEvent");
    }, "setUserPlaylists");
}

// ===== TRACK RENDERING =====
/**
 * Loads and displays track duration
 * @param {string} src - Audio source URL
 * @param {string} durationElementId - ID of element to update
 */
function loadTrackDuration(src, durationElementId) {
    safeExecute(() => {
        const audio = new Audio(src);
        audio.addEventListener("loadedmetadata", () => {
            const element = querySelector(`#${durationElementId}`);
            if (element) {
                element.textContent = formatTime(audio.duration);
            }
        });
    }, `loadTrackDuration:${durationElementId}`);
}

/**
 * Creates a playlist row element
 * @param {Object} track - Track object
 * @param {number} index - Track index
 * @returns {HTMLElement} Row element
 */
function createPlaylistRow(track, index) {
    const row = document.createElement("div");
    row.className = "pl-row";
    row.setAttribute("data-index", String(index));
    row.innerHTML = `
        <div class="pl-idx">
            <span class="pl-num">${index + 1}</span>
            <button class="btn tiny del first" title="Xóa khỏi playlist" aria-label="Xóa khỏi playlist">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="pl-cell-track">
            <div class="pl-cover" style="background-image:url('${track.cover || ""}')"></div>
            <div class="pl-title" title="${track.title || ""}">${track.title || ""}</div>
        </div>
        <div class="pl-artist">${track.artist || ""}</div>
        <div class="pl-time" id="pl-dur-${index}">${DEFAULT_TIME_DISPLAY}</div>
    `;
    return row;
}

/**
 * Renders playlist tracks
 * @param {HTMLElement} container - Container element
 * @param {Array} tracks - Array of track objects
 */
function renderPlaylistTracks(container, tracks) {
    if (!container) return;

    container.innerHTML = "";

    tracks.forEach((track, index) => {
        const row = createPlaylistRow(track, index);
        container.appendChild(row);
        loadTrackDuration(track.src, `pl-dur-${index}`);
    });
}

/**
 * Updates playlist header information
 * @param {Object} playlist - Playlist object
 * @param {number} trackCount - Number of tracks
 */
function updatePlaylistHeader(playlist, trackCount) {
    const nameElement = querySelector("#pl-name");
    const coverElement = querySelector("#pl-cover");
    const countElement = querySelector("#pl-count");

    if (nameElement) {
        nameElement.textContent = playlist.name || DEFAULT_PLAYLIST_NAME;
    }

    if (coverElement) {
        coverElement.style.backgroundImage = playlist.cover
            ? `url('${playlist.cover}')`
            : "";
    }

    if (countElement) {
        countElement.textContent = `${trackCount} bài hát`;
    }
}

// ===== PLAYLIST STATE MANAGEMENT =====
/**
 * Gets saved player state from localStorage
 * @returns {Object|null} Saved state or null
 */
function getSavedPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        return JSON.parse(raw);
    }, "getSavedPlayerState") ?? null;
}

/**
 * Checks if this playlist is currently active in player
 * @param {Object} playlist - Playlist object
 * @returns {boolean}
 */
function isPlaylistActive(playlist) {
    const state = getSavedPlayerState();
    return !!(
        state?.playlistCtx &&
        state.playlistCtx.type === PLAYLIST_TYPES.USER &&
        state.playlistCtx.id === playlist.id
    );
}

/**
 * Syncs playlist with player after deletion
 * @param {Array} tracks - Updated tracks array
 * @param {Object} playlist - Playlist object
 * @param {string|null} currentTrackId - Current playing track ID
 * @param {boolean} wasPlaying - Whether player was playing
 */
function syncPlaylistWithPlayer(tracks, playlist, currentTrackId, wasPlaying) {
    if (
        typeof window.MusicBox?.setPlaylist !== "function" ||
        !Array.isArray(tracks)
    ) {
        return;
    }

    window.MusicBox.setPlaylist(tracks, {
        type: PLAYLIST_TYPES.USER,
        id: playlist.id,
    });

    if (currentTrackId) {
        const newIndex = tracks.findIndex(
            (track) => track?.id === currentTrackId
        );
        if (newIndex >= 0 && typeof window.MusicBox.playAt === "function") {
            window.MusicBox.playAt(newIndex);
            if (
                !wasPlaying &&
                typeof window.MusicBox.pause === "function"
            ) {
                window.MusicBox.pause();
            }
        }
    }
}

/**
 * Updates row indices after deletion
 * @param {HTMLElement} container - Container element
 */
function updateRowIndices(container) {
    const rows = querySelectorAll("#pl-body .pl-row", container);
    rows.forEach((row, index) => {
        row.setAttribute("data-index", String(index));
        const numberSpan = row.querySelector(".pl-idx .pl-num");
        if (numberSpan) {
            numberSpan.textContent = String(index + 1);
        }
    });
}

// ===== MAIN INITIALIZATION =====
/**
 * Initializes the playlist page
 */
async function initializePlaylistPage() {
    const playlistId = getUrlParam("id");
    const playlists = getUserPlaylists();
    const playlist =
        playlists.find((p) => p.id === playlistId) || playlists[0];

    if (!playlist) return;

    // Load and map tracks
    const songs = await loadAllSongs();
    const songMap = createIdMap(songs);
    let trackIds = Array.isArray(playlist.tracks) ? playlist.tracks.slice() : [];
    let tracks = trackIds.map((id) => songMap.get(id)).filter(Boolean);

    // Update header
    updatePlaylistHeader(playlist, tracks.length);

    // Render tracks
    const bodyContainer = querySelector("#pl-body");
    renderPlaylistTracks(bodyContainer, tracks);

    // ===== DELETE FUNCTIONALITY =====
    /**
     * Deletes a track from playlist
     * @param {number} indexToRemove - Index of track to remove
     * @param {Object} playlist - Playlist object
     * @param {Array} currentTrackIds - Current track IDs array
     * @param {Array} currentTracks - Current tracks array
     * @param {Map} songMap - Map of songs by ID
     * @returns {Object|null} Updated tracks and trackIds or null
     */
    function deleteTrackFromPlaylist(
        indexToRemove,
        playlist,
        currentTrackIds,
        currentTracks,
        songMap
    ) {
        return safeExecute(() => {
            const trackToRemove = currentTracks[indexToRemove];
            const trackTitle = trackToRemove?.title || "bài này";
            const confirmed = window.confirm(
                `Xóa "${trackTitle}" khỏi playlist?`
            );

            if (!confirmed) return null;

            const playlists = getUserPlaylists();
            const playlistIndex = playlists.findIndex(
                (p) => p.id === playlist.id
            );

            if (playlistIndex < 0) return null;

            const trackIdToRemove = currentTrackIds[indexToRemove];
            if (!trackIdToRemove) return null;

            // Remove track from playlist
            playlists[playlistIndex].tracks = (
                playlists[playlistIndex].tracks || []
            ).filter((id) => id !== trackIdToRemove);

            setUserPlaylists(playlists);

            // Update local arrays
            const updatedTrackIds = playlists[playlistIndex].tracks.slice();
            const updatedTracks = updatedTrackIds
                .map((id) => songMap.get(id))
                .filter(Boolean);

            // Get player state for sync
            const playerState = getSavedPlayerState();
            const wasPlaying = !!playerState?.isPlaying;
            const currentTrackId = playerState?.currentId || null;

            // Sync with player if this playlist is active
            if (isPlaylistActive(playlist)) {
                syncPlaylistWithPlayer(
                    updatedTracks,
                    playlist,
                    currentTrackId,
                    wasPlaying
                );
            }

            // Remove row from DOM
            const rowToRemove = querySelector(
                `#pl-body .pl-row[data-index="${indexToRemove}"]`
            );
            if (rowToRemove) {
                rowToRemove.remove();
            }

            // Update remaining row indices
            updateRowIndices(bodyContainer);

            // Update count
            updatePlaylistHeader(playlist, updatedTracks.length);

            return {
                trackIds: updatedTrackIds,
                tracks: updatedTracks,
            };
        }, "deleteTrackFromPlaylist") ?? null;
    }

    // ===== CURRENT TRACK HIGHLIGHTING =====
    /**
     * Clears all current row highlights
     */
    function clearAllHighlights() {
        const rows = querySelectorAll("#pl-body .pl-row");
        rows.forEach((row) => row.classList.remove("is-current"));
    }

    /**
     * Highlights the current playing row
     * @param {Object} playlist - Playlist object
     */
    function highlightCurrentRow(playlist) {
        safeExecute(() => {
            if (!isPlaylistActive(playlist)) {
                clearAllHighlights();
                return;
            }

            const currentIndex =
                typeof window.MusicBox?.currentIndex === "function"
                    ? window.MusicBox.currentIndex()
                    : -1;

            clearAllHighlights();

            if (currentIndex >= 0) {
                const currentRow = querySelector(
                    `#pl-body .pl-row[data-index="${currentIndex}"]`
                );
                if (currentRow) {
                    currentRow.classList.add("is-current");
                    currentRow.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth",
                    });
                }
            }
        }, "highlightCurrentRow");
    }

    // Setup track change listener
    window.addEventListener("musicbox:trackchange", () => {
        highlightCurrentRow(playlist);
    });
    highlightCurrentRow(playlist);

    // ===== ROW INTERACTIONS =====
    /**
     * Handles row click to play track
     * @param {HTMLElement} row - Clicked row element
     * @param {Array} currentTracks - Current tracks array
     * @param {Object} playlist - Playlist object
     */
    function handleRowClick(row, currentTracks, playlist) {
        const index = Number(row.getAttribute("data-index")) || 0;

        // Set playlist as active
        if (typeof window.MusicBox?.setPlaylist === "function") {
            window.MusicBox.setPlaylist(currentTracks, {
                type: PLAYLIST_TYPES.USER,
                id: playlist.id,
            });
        }

        // Play track
        if (typeof window.MusicBox?.playAt === "function") {
            window.MusicBox.playAt(index);
        }

        // Optimistic highlight
        clearAllHighlights();
        row.classList.add("is-current");
    }

    /**
     * Handles delete button click
     * @param {Event} event - Click event
     * @param {HTMLElement} row - Row element
     * @param {Object} playlist - Playlist object
     * @param {Array} currentTrackIds - Current track IDs
     * @param {Array} currentTracks - Current tracks
     * @param {Map} songMap - Song map
     */
    function handleDeleteClick(
        event,
        row,
        playlist,
        currentTrackIds,
        currentTracks,
        songMap
    ) {
        event.stopPropagation();
        const indexToRemove = Number(row.getAttribute("data-index")) || 0;

        const result = deleteTrackFromPlaylist(
            indexToRemove,
            playlist,
            currentTrackIds,
            currentTracks,
            songMap
        );

        if (result) {
            // Update local variables
            trackIds = result.trackIds;
            tracks = result.tracks;
        }
    }

    // Setup row event listeners
    const rows = querySelectorAll("#pl-body .pl-row");
    rows.forEach((row) => {
        row.style.cursor = "pointer";
        row.addEventListener("click", () => {
            handleRowClick(row, tracks, playlist);
        });

        const deleteButton = row.querySelector(
            ".pl-idx button.btn.tiny.del.first"
        );
        if (deleteButton) {
            deleteButton.addEventListener("click", (event) => {
                handleDeleteClick(
                    event,
                    row,
                    playlist,
                    trackIds,
                    tracks,
                    songMap
                );
            });
        }
    });
}

// ===== INITIALIZATION =====
/**
 * Starts the playlist page initialization
 */
function start() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePlaylistPage, {
            once: true,
        });
    } else {
        initializePlaylistPage();
    }
}

start();

// ===== QUEUE VISIBILITY SYNC =====
/**
 * Checks if an element is visible
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
 */
function isElementVisible(element) {
    if (!element || element.hidden) return false;

    const computedStyle = getComputedStyle(element);
    if (
        computedStyle.display === "none" ||
        computedStyle.visibility === "hidden"
    ) {
        return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

/**
 * Ensures queue visibility CSS is injected
 */
function ensureQueueVisibilityCSS() {
    const HIDE_CLASS = "is-hidden";
    const STYLE_ID = "hide-playlist-style";

    if (document.getElementById(STYLE_ID)) return;

    safeExecute(() => {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `.${HIDE_CLASS} { display: none !important; }`;
        document.head.appendChild(style);
    }, "ensureQueueVisibilityCSS");
}

/**
 * Syncs main content visibility with queue visibility
 */
function syncMainContentVisibility() {
    const MAIN_SELECTOR = ".main-content";
    const QUEUE_SELECTOR = ".queue";
    const HIDE_CLASS = "is-hidden";

    const mainContent = document.querySelector(MAIN_SELECTOR);
    if (!mainContent) return;

    const queueElements = querySelectorAll(QUEUE_SELECTOR);
    const isQueueVisible = queueElements.some(isElementVisible);

    mainContent.classList.toggle(HIDE_CLASS, isQueueVisible);
}

/**
 * Sets up queue visibility observer
 */
function setupQueueVisibilityObserver() {
    ensureQueueVisibilityCSS();

    const observer = new MutationObserver(syncMainContentVisibility);
    const observerOptions = {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden"],
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            () => {
                syncMainContentVisibility();
                observer.observe(document.body, observerOptions);
            },
            { once: true }
        );
    } else {
        syncMainContentVisibility();
        observer.observe(document.body, observerOptions);
    }
}

setupQueueVisibilityObserver();
