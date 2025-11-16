// ===== SIDEBAR PLAYLISTS MODULE =====

// ===== CONSTANTS =====
const SELECTORS = {
    ADD_BUTTON: ".menu .icon-btn.add",
    PLAYLIST_LIST: ".pl-list",
    TOAST_WRAP: ".toast-wrap",
};

const TOAST_CONFIG = {
    STYLE_ID: "toast-style",
    DURATION: 1800,
    FADE_OUT: 200,
    TYPES: {
        SUCCESS: "success",
        ERROR: "error",
    },
};

const TOAST_STYLES = `
    .toast-wrap{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
    .toast{min-width:240px;max-width:90vw;padding:10px 14px;border-radius:10px;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);transition:opacity .2s ease, transform .2s ease}
    .toast.show{opacity:1;transform:translateY(0)}
    .toast.success{background:#1f8b4c}
    .toast.error{background:#a23b3b}
`;

const PLAYLIST_CONFIG = {
    MAX_USER_PLAYLISTS: 5,
    MAX_NAME_LENGTH: 40,
    TRUNCATE_LENGTH: 37,
    DEFAULT_NAME: "Playlist mới",
    DEFAULT_PLAYLIST_NAME: "Playlist",
    FALLBACK_COVER: "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg",
    ID_PREFIX: "pl_",
    FILE_PICKER_DELAY: 600,
};

const PATHS = {
    PLAYLIST_PAGE: "./playlist.html",
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
 * Converts a string to a URL-friendly slug
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
function slugify(str) {
    return String(str || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\-]/g, "");
}

/**
 * Truncates text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = PLAYLIST_CONFIG.MAX_NAME_LENGTH) {
    const str = String(text || "");
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
}

/**
 * Ensures toast styles are injected into the document
 */
function ensureToastStyle() {
    if (document.getElementById(TOAST_CONFIG.STYLE_ID)) return;

    safeExecute(() => {
        const style = document.createElement("style");
        style.id = TOAST_CONFIG.STYLE_ID;
        style.textContent = TOAST_STYLES;
        document.head.appendChild(style);
    }, "ensureToastStyle");
}

/**
 * Gets or creates the toast wrapper element
 * @returns {HTMLElement} Toast wrapper element
 */
function getToastWrap() {
    let wrap = document.querySelector(SELECTORS.TOAST_WRAP);
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "toast-wrap";
        document.body.appendChild(wrap);
    }
    return wrap;
}

/**
 * Shows a toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success or error)
 */
function showToast(message, type = TOAST_CONFIG.TYPES.SUCCESS) {
    safeExecute(() => {
        const wrap = getToastWrap();
        const element = document.createElement("div");
        element.className = `toast ${
            type === TOAST_CONFIG.TYPES.ERROR
                ? TOAST_CONFIG.TYPES.ERROR
                : TOAST_CONFIG.TYPES.SUCCESS
        }`;
        element.textContent = String(message || "");
        wrap.appendChild(element);

        requestAnimationFrame(() => {
            element.classList.add("show");
        });

        setTimeout(() => {
            safeExecute(() => {
                element.classList.remove("show");
                setTimeout(() => {
                    element.remove();
                }, TOAST_CONFIG.FADE_OUT);
            }, "showToast:remove");
        }, TOAST_CONFIG.DURATION);
    }, "showToast");
}

// ===== PLAYLIST CREATION =====
/**
 * Checks if user has reached maximum playlist limit
 * @param {Array} playlists - Array of user playlists
 * @returns {boolean} True if limit reached
 */
function isPlaylistLimitReached(playlists) {
    return (
        Array.isArray(playlists) &&
        playlists.length >= PLAYLIST_CONFIG.MAX_USER_PLAYLISTS
    );
}

/**
 * Validates playlist name
 * @param {string} name - Playlist name to validate
 * @returns {Object} Validation result with isValid and error message
 */
function validatePlaylistName(name) {
    if (!name || !name.trim()) {
        return { isValid: false, error: null };
    }

    if (name.length > PLAYLIST_CONFIG.MAX_NAME_LENGTH) {
        return {
            isValid: false,
            error: `Tên tối đa ${PLAYLIST_CONFIG.MAX_NAME_LENGTH} ký tự`,
        };
    }

    return { isValid: true, error: null };
}

/**
 * Prompts user for playlist name
 * @returns {string|null} Playlist name or null if cancelled
 */
function promptPlaylistName() {
    return safeExecute(() => {
        const name = window.prompt(
            "Tên playlist mới",
            PLAYLIST_CONFIG.DEFAULT_NAME
        );
        if (name == null) return null;
        return name.trim().replace(/\s+/g, " ");
    }, "promptPlaylistName") ?? null;
}

/**
 * Generates a unique playlist ID
 * @param {string} name - Playlist name
 * @param {Array} existingPlaylists - Existing playlists
 * @returns {string} Unique playlist ID
 */
function generateUniquePlaylistId(name, existingPlaylists) {
    const base = `${PLAYLIST_CONFIG.ID_PREFIX}${slugify(name || "new")}`;
    let id = base || `${PLAYLIST_CONFIG.ID_PREFIX}${Date.now()}`;
    const existingIds = new Set(
        (existingPlaylists || []).map((p) => p?.id).filter(Boolean)
    );

    let counter = 1;
    while (existingIds.has(id)) {
        id = `${base}_${++counter}`;
    }

    return id;
}

/**
 * Creates a file input element for image selection
 * @returns {HTMLInputElement} File input element
 */
function createFileInput() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    return input;
}

/**
 * Reads file as data URL
 * @param {File} file - File to read
 * @returns {Promise<string|null>} Data URL or null on error
 */
function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl =
                typeof reader.result === "string" ? reader.result : null;
            resolve(dataUrl);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
}

/**
 * Finalizes playlist creation with cover image
 * @param {string} name - Playlist name
 * @param {string|null} cover - Cover image data URL or null
 * @param {HTMLInputElement} input - File input element
 * @param {Array} playlists - Current playlists array
 * @param {Object} playlistContext - Playlist context
 */
function finalizePlaylistCreation(
    name,
    cover,
    input,
    playlists,
    playlistContext
) {
    if (isPlaylistLimitReached(playlists)) {
        showToast(
            `Bạn chỉ có thể tạo tối đa ${PLAYLIST_CONFIG.MAX_USER_PLAYLISTS} playlist`,
            TOAST_CONFIG.TYPES.ERROR
        );
        safeExecute(() => input.remove(), "finalizePlaylistCreation:removeInput");
        return;
    }

    const newPlaylist = playlistContext.createUserPlaylist({
        name,
        cover: cover || PLAYLIST_CONFIG.FALLBACK_COVER,
    });

    if (newPlaylist) {
        showToast("Tạo thành công", TOAST_CONFIG.TYPES.SUCCESS);
        window.dispatchEvent(new CustomEvent("playlists:changed"));
    }

    safeExecute(() => input.remove(), "finalizePlaylistCreation:removeInput");
}

/**
 * Handles file input change event
 * @param {HTMLInputElement} input - File input element
 * @param {string} name - Playlist name
 * @param {Array} playlists - Current playlists
 * @param {Object} playlistContext - Playlist context
 * @param {Function} finalizeOnce - One-time finalize callback
 */
async function handleFileInputChange(
    input,
    name,
    playlists,
    playlistContext,
    finalizeOnce
) {
    const file = input.files?.[0];
    if (!file) {
        finalizeOnce(null);
        return;
    }

    const cover = await readFileAsDataURL(file);
    finalizeOnce(cover);
}

/**
 * Sets up file picker for playlist cover selection
 * @param {string} name - Playlist name
 * @param {Array} playlists - Current playlists
 * @param {Object} playlistContext - Playlist context
 */
function setupFilePicker(name, playlists, playlistContext) {
    const input = createFileInput();

    // Đảm bảo chỉ tạo playlist một lần duy nhất
    let isFinalized = false;
    const finalizeOnce = (cover) => {
        if (isFinalized) return;
        isFinalized = true;
        finalizePlaylistCreation(name, cover, input, playlists, playlistContext);
    };

    input.addEventListener(
        "change",
        () => {
            handleFileInputChange(
                input,
                name,
                playlists,
                playlistContext,
                finalizeOnce
            );
        },
        { once: true }
    );

    input.click();
}

/**
 * Handles add playlist button click
 * @param {Object} playlistContext - Playlist context
 */
function handleAddPlaylistClick(playlistContext) {
    const playlists = playlistContext.getUserPlaylists();

    if (isPlaylistLimitReached(playlists)) {
        showToast(
            `Bạn chỉ có thể tạo tối đa ${PLAYLIST_CONFIG.MAX_USER_PLAYLISTS} playlist`,
            TOAST_CONFIG.TYPES.ERROR
        );
        return;
    }

    const rawName = promptPlaylistName();
    // Hủy nếu người dùng nhấn Cancel trong prompt
    if (rawName == null) return;

    // Nếu người dùng để trống hoặc chỉ toàn khoảng trắng, dùng tên mặc định
    const name = rawName.trim() ? rawName : PLAYLIST_CONFIG.DEFAULT_NAME;

    const validation = validatePlaylistName(name);
    if (!validation.isValid) {
        if (validation.error) {
            showToast(validation.error, TOAST_CONFIG.TYPES.ERROR);
        }
        return;
    }

    // Generate unique ID (not used in createUserPlaylist but kept for consistency)
    generateUniquePlaylistId(name, playlists);

    // Setup file picker for cover selection
    setupFilePicker(name, playlists, playlistContext);
}

// ===== PLAYLIST RENDERING =====
/**
 * Sets cover image styles on element
 * @param {HTMLElement} element - Cover element
 * @param {string} coverUrl - Cover image URL
 */
function setCoverImageStyles(element, coverUrl) {
    if (!element) return;

    element.style.backgroundImage = `url('${coverUrl || PLAYLIST_CONFIG.FALLBACK_COVER}')`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
}

/**
 * Navigates to playlist page
 * @param {string} playlistId - Playlist ID
 */
function navigateToPlaylist(playlistId) {
    const url = `${PATHS.PLAYLIST_PAGE}?id=${encodeURIComponent(playlistId)}`;
    
    safeExecute(() => {
        const go = window.__mbGo || ((url) => {
            window.location.href = url;
        });
        go(url);
    }, "navigateToPlaylist") ?? (window.location.href = url);
}

/**
 * Creates a playlist row element
 * @param {Object} playlist - Playlist object
 * @returns {HTMLElement} Playlist row element
 */
function createPlaylistRow(playlist) {
    const row = document.createElement("div");
    row.className = "pl-item";
    row.dataset.plId = playlist.id;

    const truncatedName = truncateText(
        playlist.name || PLAYLIST_CONFIG.DEFAULT_PLAYLIST_NAME,
        PLAYLIST_CONFIG.MAX_NAME_LENGTH
    );
    const trackCount = playlist.tracks?.length || 0;

    row.innerHTML = `
        <div class="pl-cover"></div>
        <div class="pl-meta">
            <div class="pl-name">${truncatedName}</div>
            <div class="pl-sub">Playlist • ${trackCount} songs</div>
        </div>
    `;

    const coverElement = row.querySelector(".pl-cover");
    setCoverImageStyles(coverElement, playlist.cover);

    row.addEventListener("click", () => {
        navigateToPlaylist(playlist.id);
    });

    return row;
}

/**
 * Renders sidebar playlists
 * @param {Object} playlistContext - Playlist context
 */
function renderSidebarPlaylists(playlistContext) {
    safeExecute(() => {
        const container = document.querySelector(SELECTORS.PLAYLIST_LIST);
        if (!container) return;

        const playlists = playlistContext.getUserPlaylists();
        container.innerHTML = "";

        playlists.forEach((playlist) => {
            const row = createPlaylistRow(playlist);
            container.appendChild(row);
        });
    }, "renderSidebarPlaylists");
}

// ===== MAIN SETUP =====
/**
 * Sets up sidebar playlists functionality
 * @param {Object} options - Setup options
 * @param {Object} options.playlistContext - Playlist context
 * @param {Object} options.playerContext - Player context (unused but kept for API consistency)
 */
export function setupSidebarPlaylists({ playlistContext, playerContext }) {
    const addButton = document.querySelector(SELECTORS.ADD_BUTTON);
    if (!addButton) return;

    // Initialize toast styles
    ensureToastStyle();

    // Setup add playlist button
    addButton.addEventListener("click", () => {
        handleAddPlaylistClick(playlistContext);
    });

    // Initial render
    renderSidebarPlaylists(playlistContext);

    // Listen for playlist changes
    window.addEventListener("playlists:changed", () => {
        renderSidebarPlaylists(playlistContext);
    });
}
