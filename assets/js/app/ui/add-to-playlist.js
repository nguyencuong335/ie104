// ===== ADD TO PLAYLIST MODULE =====

// ===== CONSTANTS =====
const TOAST_TYPES = {
    SUCCESS: "success",
    ERROR: "error",
};

const TOAST_DURATION = 1800;
const TOAST_FADE_OUT = 200;
const MOBILE_BREAKPOINT = 420;

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
 * Escapes HTML special characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    return String(str || "").replace(/"/g, "&quot;");
}

/**
 * Ensures a style element exists in the document
 * @param {string} id - Style element ID
 * @param {string} css - CSS content
 */
function ensureStyle(id, css) {
    safeExecute(() => {
        if (document.getElementById(id)) return;
        const style = document.createElement("style");
        style.id = id;
        style.textContent = css;
        document.head.appendChild(style);
    }, `ensureStyle:${id}`);
}

// ===== STYLES =====
const PICKER_STYLES = `
    .pl-picker-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    .pl-picker {
        background: var(--bg-primary);
        color: var(--text-primary);
        min-width: 360px;
        max-width: 520px;
        width: 92vw;
        border-radius: 14px;
        box-shadow: 0 14px 40px var(--shadow-color);
        overflow: hidden;
        border: 1px solid var(--border-color);
    }
    .pl-picker .hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color);
        font-weight: 700;
        font-size: 16px;
        color: var(--text-primary);
    }
    .pl-picker .list {
        max-height: 60vh;
        overflow: auto;
    }
    .pl-picker .row {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 12px;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
    }
    .pl-picker .row:hover {
        background: var(--hover-bg);
    }
    .pl-picker .row .cover {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        background-size: cover;
        background-position: center;
    }
    .pl-picker .row .name {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        font-size: 15px;
    }
    .pl-picker .row .count {
        opacity: 0.85;
        min-width: 48px;
        text-align: right;
    }
    .pl-picker .btn {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        line-height: 1;
        box-sizing: border-box;
        white-space: nowrap;
    }
    .pl-picker .hd .close-btn {
        background: transparent;
        border: none;
        padding: 0;
        color: var(--text-primary);
        cursor: pointer;
        border-radius: 0;
    }
    .pl-picker .hd .close-btn:hover {
        color: var(--text-primary);
        text-decoration: underline;
        background: transparent;
        border-color: transparent;
    }
    .pl-picker .hd .close-btn:focus {
        outline: none;
        text-decoration: underline;
    }
    .pl-picker .btn:hover {
        background: var(--hover-bg);
        color: var(--text-primary);
    }
    .pl-picker .row.is-exist {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .pl-picker .row .tag {
        font-size: 12px;
        opacity: 0.9;
        background: var(--hover-bg);
        color: var(--text-primary);
        padding: 2px 6px;
        border-radius: 999px;
        border: 1px solid var(--border-color);
    }
    @media (max-width: ${MOBILE_BREAKPOINT}px) {
        .pl-picker {
            min-width: 300px;
        }
        .pl-picker .row {
            grid-template-columns: auto 1fr auto;
        }
    }
`;

const TOAST_STYLES = `
    .toast-wrap {
        position: fixed;
        left: 50%;
        top: 20px;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
    }
    .toast {
        min-width: 240px;
        max-width: 90vw;
        padding: 10px 14px;
        border-radius: 10px;
        color: #fff;
        font-weight: 600;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .toast.show {
        opacity: 1;
        transform: translateY(0);
    }
    .toast.success {
        background: #1f8b4c;
    }
    .toast.error {
        background: #a23b3b;
    }
`;

/**
 * Ensures picker modal styles are loaded
 */
function ensurePickerStyle() {
    ensureStyle("pl-picker-style", PICKER_STYLES);
}

/**
 * Ensures toast notification styles are loaded
 */
function ensureToastStyle() {
    ensureStyle("toast-style", TOAST_STYLES);
}
// ===== TOAST NOTIFICATIONS =====
/**
 * Gets or creates the toast container element
 * @returns {HTMLElement} Toast wrapper element
 */
function getToastWrap() {
    let wrapper = document.querySelector(".toast-wrap");
    if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.className = "toast-wrap";
        document.body.appendChild(wrapper);
    }
    return wrapper;
}

/**
 * Shows a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type ('success' or 'error')
 */
function showToast(message, type = TOAST_TYPES.SUCCESS) {
    safeExecute(() => {
        const wrapper = getToastWrap();
        const toast = document.createElement("div");
        toast.className = `toast ${type === TOAST_TYPES.ERROR ? TOAST_TYPES.ERROR : TOAST_TYPES.SUCCESS}`;
        toast.textContent = String(message || "");
        wrapper.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add("show");
        });
        
        setTimeout(() => {
            safeExecute(() => {
                toast.classList.remove("show");
                setTimeout(() => toast.remove(), TOAST_FADE_OUT);
            }, "showToast:remove");
        }, TOAST_DURATION);
    }, "showToast");
}

// ===== PICKER MODAL =====
/**
 * Closes the picker modal
 * @param {HTMLElement} overlay - Overlay element to remove
 */
function closePicker(overlay) {
    safeExecute(() => {
        if (overlay?.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, "closePicker");
}

/**
 * Checks if a track exists in a playlist
 * @param {Object} playlist - Playlist object
 * @param {string} trackId - Track ID to check
 * @returns {boolean}
 */
function trackExistsInPlaylist(playlist, trackId) {
    return Array.isArray(playlist.tracks) && playlist.tracks.includes(trackId);
}

/**
 * Creates a playlist row element
 * @param {Object} playlist - Playlist object
 * @param {string} trackId - Track ID being added
 * @returns {HTMLElement} Row element
 */
function createPlaylistRow(playlist, trackId) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("data-pl-id", playlist.id);
    
    const hasTrack = trackExistsInPlaylist(playlist, trackId);
    const trackCount = Array.isArray(playlist.tracks) ? playlist.tracks.length : 0;
    
    row.innerHTML = `
        <div class="cover" style="background-image:url('${escapeHtml(playlist.cover || "")}')"></div>
        <div class="name">${playlist.name || "Playlist"}</div>
        <div class="count">${trackCount} bài</div>
        ${hasTrack ? '<span class="tag" style="margin-right:4px;">Đã có</span>' : ""}
    `;
    
    if (hasTrack) {
        row.classList.add("is-exist");
    }
    
    return row;
}

/**
 * Handles playlist selection
 * @param {string} playlistId - Selected playlist ID
 * @param {string} trackId - Track ID to add
 * @param {HTMLElement} overlay - Overlay element to close
 * @param {Object} playlistContext - Playlist context
 */
function handlePlaylistSelection(playlistId, trackId, overlay, playlistContext) {
    return safeExecute(() => {
        const playlists = playlistContext.getUserPlaylists();
        const index = playlists.findIndex((playlist) => playlist?.id === playlistId);
        
        if (index < 0) {
            closePicker(overlay);
            return;
        }
        
        const targetPlaylist = playlists[index];
        if (!Array.isArray(targetPlaylist.tracks)) {
            targetPlaylist.tracks = [];
        }
        
        if (!targetPlaylist.tracks.includes(trackId)) {
            targetPlaylist.tracks.push(trackId);
        }
        
        playlistContext.setUserPlaylists(playlists);
        showToast(
            `Đã thêm vào ${targetPlaylist.name || "playlist"}`,
            TOAST_TYPES.SUCCESS
        );
        closePicker(overlay);
        return true;
    }, "handlePlaylistSelection") ?? showToast("Không thể thêm vào playlist", TOAST_TYPES.ERROR);
}

/**
 * Sets up picker modal event listeners
 * @param {HTMLElement} overlay - Overlay element
 * @param {string} trackId - Track ID being added
 * @param {Object} playlistContext - Playlist context
 */
function setupPickerEvents(overlay, trackId, playlistContext) {
    // Click handler
    overlay.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        
        // Close on overlay click
        if (target.classList.contains("pl-picker-overlay")) {
            closePicker(overlay);
            return;
        }
        
        // Close on close button click
        const action = target.getAttribute("data-act");
        if (action === "close") {
            closePicker(overlay);
            return;
        }
        
        // Handle playlist row click
        const row = target.closest(".row");
        if (row) {
            if (row.classList.contains("is-exist")) {
                return; // Don't allow adding to playlist that already has the track
            }
            
            const playlistId = row.getAttribute("data-pl-id");
            if (playlistId) {
                handlePlaylistSelection(playlistId, trackId, overlay, playlistContext);
            }
        }
    });
    
    // Escape key handler
    const handleEscape = (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePicker(overlay);
            window.removeEventListener("keydown", handleEscape, true);
        }
    };
    window.addEventListener("keydown", handleEscape, true);
}

/**
 * Opens the playlist picker modal
 * @param {string} trackId - Track ID to add
 * @param {Object} playlistContext - Playlist context
 */
function openPicker(trackId, playlistContext) {
    if (!trackId) return;
    
    const playlists = playlistContext.getUserPlaylists();
    if (!Array.isArray(playlists) || playlists.length === 0) {
        return;
    }
    
    const overlay = document.createElement("div");
    overlay.className = "pl-picker-overlay";
    overlay.innerHTML = `
        <div class="pl-picker" role="dialog" aria-modal="true" aria-label="Chọn playlist">
            <div class="hd">
                <span>Chọn playlist</span>
                <button class="btn close-btn" data-act="close" aria-label="Đóng">Đóng</button>
            </div>
            <div class="list"></div>
        </div>
    `;
    
    const listElement = overlay.querySelector(".list");
    playlists.forEach((playlist) => {
        const row = createPlaylistRow(playlist, trackId);
        listElement.appendChild(row);
    });
    
    document.body.appendChild(overlay);
    setupPickerEvents(overlay, trackId, playlistContext);
}

// ===== MAIN SETUP =====
/**
 * Sets up the add to playlist functionality
 * @param {Object} options - Setup options
 * @param {Object} options.playerContext - Player context
 * @param {Object} options.playlistContext - Playlist context
 */
export function setupAddToPlaylist({ playerContext, playlistContext }) {
    const addButton = document.getElementById("add-to-playlist");
    if (!addButton) return;

    // Initialize styles
    ensurePickerStyle();
    ensureToastStyle();

    // Handle add button click
    addButton.addEventListener("click", () => {
        safeExecute(() => {
            const playlist = playlistContext.getPlaylist();
            const currentIndex = playerContext.getCurrentIndex();
            const currentTrack = playlist[currentIndex];
            const trackId = currentTrack?.id || null;
            
            if (!trackId) {
                showToast("Không thể thêm: bài không hợp lệ", TOAST_TYPES.ERROR);
                return;
            }
            
            const userPlaylists = playlistContext.getUserPlaylists();
            if (!Array.isArray(userPlaylists) || userPlaylists.length === 0) {
                showToast("Chưa có playlist nào", TOAST_TYPES.ERROR);
                return;
            }
            
            openPicker(trackId, playlistContext);
            return true;
        }, "setupAddToPlaylist:click") ?? showToast("Đã xảy ra lỗi", TOAST_TYPES.ERROR);
    });
}
