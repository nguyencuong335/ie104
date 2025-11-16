// ===== MORE MENU MODULE =====

// ===== CONSTANTS =====
const DEFAULT_FILENAME = "baihat";
const DEFAULT_EXTENSION = "mp3";
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

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
 * Sanitizes a string for use as filename
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeFilename(str) {
    return String(str || "")
        .replace(INVALID_FILENAME_CHARS, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Extracts file extension from URL
 * @param {string} url - File URL
 * @returns {string} File extension
 */
function getFileExtension(url) {
    return safeExecute(() => {
        const urlObj = new URL(url, location.href);
        const pathname = urlObj.pathname;
        const segment = pathname.split("/").pop() || "";
        
        if (!segment.includes(".")) {
            return DEFAULT_EXTENSION;
        }
        
        const extension = segment.split(".").pop() || DEFAULT_EXTENSION;
        return extension.split("?")[0].split("#")[0] || DEFAULT_EXTENSION;
    }, "getFileExtension") ?? DEFAULT_EXTENSION;
}

/**
 * Checks if URL is from same origin
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isSameOrigin(url) {
    return safeExecute(() => {
        const urlObj = new URL(url, location.href);
        return urlObj.origin === location.origin;
    }, "isSameOrigin") ?? true;
}

/**
 * Creates a download link element
 * @param {string} href - Link URL
 * @param {string} filename - Download filename
 * @param {boolean} openInNewTab - Whether to open in new tab
 * @returns {HTMLElement} Anchor element
 */
function createDownloadLink(href, filename, openInNewTab = false) {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.rel = "noopener";
    
    if (openInNewTab) {
        link.target = "_blank";
    }
    
    return link;
}

/**
 * Triggers download via anchor element
 * @param {HTMLElement} link - Anchor element
 */
function triggerDownload(link) {
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// ===== MENU MANAGEMENT =====
/**
 * Sets up more menu toggle functionality
 * @param {HTMLElement} menuButton - Menu button element
 * @param {HTMLElement} menu - Menu element
 * @returns {Function} Function to hide menu
 */
function setupMenuToggle(menuButton, menu) {
    let handleDocumentClick = null;
    let handleEscape = null;

    /**
     * Closes the more menu
     */
    function hideMenu() {
        if (!menu) return;
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        
        if (handleDocumentClick) {
            document.removeEventListener("click", handleDocumentClick, true);
        }
        if (handleEscape) {
            document.removeEventListener("keydown", handleEscape, true);
        }
    }

    /**
     * Handles clicks outside menu
     * @param {Event} event - Click event
     */
    handleDocumentClick = (event) => {
        if (
            menu.contains(event.target) ||
            menuButton.contains(event.target)
        ) {
            return;
        }
        hideMenu();
    };

    /**
     * Handles Escape key press
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleEscape = (event) => {
        if (event.key === "Escape") {
            hideMenu();
        }
    };

    menuButton.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("open");
        menu.setAttribute("aria-hidden", String(!isOpen));
        
        if (isOpen) {
            document.addEventListener("click", handleDocumentClick, true);
            document.addEventListener("keydown", handleEscape, true);
        } else {
            hideMenu();
        }
    });

    return hideMenu;
}

// ===== DOWNLOAD FUNCTIONALITY =====
/**
 * Generates a safe filename from track data
 * @param {Object} track - Track object
 * @param {string} url - Track URL
 * @returns {string} Safe filename
 */
function generateFilename(track, url) {
    const title = track.title || DEFAULT_FILENAME;
    const artist = track.artist ? ` - ${track.artist}` : "";
    const base = sanitizeFilename(title + artist) || DEFAULT_FILENAME;
    const extension = getFileExtension(url);
    return `${base}.${extension}`;
}

/**
 * Downloads file from same-origin URL
 * @param {string} url - File URL
 * @param {string} filename - Download filename
 */
function downloadSameOrigin(url, filename) {
    const link = createDownloadLink(url, filename);
    triggerDownload(link);
}

/**
 * Downloads file from cross-origin URL
 * @param {string} url - File URL
 * @param {string} filename - Download filename
 */
async function downloadCrossOrigin(url, filename) {
    try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) {
            throw new Error("Fetch failed");
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        const link = createDownloadLink(objectUrl, filename);
        triggerDownload(link);
        
        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error("Failed to download cross-origin file:", error);
        // Fallback: open in new tab
        const link = createDownloadLink(url, filename, true);
        triggerDownload(link);
    }
}

/**
 * Handles track download
 * @param {Object} playerContext - Player context
 * @param {Object} playlistContext - Playlist context
 * @param {HTMLElement} menu - Menu element
 * @param {Function} hideMenu - Function to hide menu
 */
async function handleDownload(playerContext, playlistContext, menu, hideMenu) {
    try {
        const playlist = playlistContext.getPlaylist();
        const currentIndex = playerContext.getCurrentIndex();
        const currentTrack = playlist[currentIndex] || {};
        const trackUrl = currentTrack.src;
        
        if (!trackUrl) {
            hideMenu();
            return;
        }
        
        const filename = generateFilename(currentTrack, trackUrl);
        const sameOrigin = isSameOrigin(trackUrl);
        
        if (sameOrigin) {
            downloadSameOrigin(trackUrl, filename);
        } else {
            await downloadCrossOrigin(trackUrl, filename);
        }
    } catch (error) {
        console.error("Download error:", error);
    } finally {
        hideMenu();
    }
}

/**
 * Sets up download button functionality
 * @param {HTMLElement} downloadButton - Download button element
 * @param {Object} playerContext - Player context
 * @param {Object} playlistContext - Playlist context
 * @param {HTMLElement} menu - Menu element
 * @param {Function} hideMenu - Function to hide menu
 */
function setupDownloadButton(
    downloadButton,
    playerContext,
    playlistContext,
    menu,
    hideMenu
) {
    if (!downloadButton) return;
    
    downloadButton.addEventListener("click", async () => {
        await handleDownload(playerContext, playlistContext, menu, hideMenu);
    });
}

// ===== MAIN SETUP =====
/**
 * Sets up more menu functionality
 * @param {Object} options - Setup options
 * @param {Object} options.playerContext - Player context
 * @param {Object} options.playlistContext - Playlist context
 */
export function setupMoreMenu({ playerContext, playlistContext }) {
    const moreButton = document.getElementById("more");
    const moreMenu = document.getElementById("more-menu");
    const downloadButton = document.getElementById("download");
    
    if (!moreButton || !moreMenu) return;

    const hideMenu = setupMenuToggle(moreButton, moreMenu);
    
    setupDownloadButton(
        downloadButton,
        playerContext,
        playlistContext,
        moreMenu,
        hideMenu
    );
}
