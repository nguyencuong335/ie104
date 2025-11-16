// ===== UI MODULE ORCHESTRATOR =====

import { setupHeaderSearch } from "./ui/search.js";
import { setupGlobalLiveSearch } from "./ui/live-search.js";
import { setupMoreMenu } from "./ui/more-menu.js";
import { setupAddToPlaylist } from "./ui/add-to-playlist.js";
import { setupLayoutHelpers } from "./ui/layout.js";
import { setupSidebarPlaylists } from "./ui/sidebar-playlists.js";

// ===== CONSTANTS =====
const SELECTORS = {
    MENU_BUTTONS: ".menu .menu-btn",
    LOGOUT_BUTTON: ".menu-btn.logout",
    LIKED_BUTTON: ".menu-btn.liked",
    YOUR_BUTTON: ".menu-btn.your",
    EXPLORE_BUTTON: ".menu-btn.explore",
    RECENT_BUTTON: ".menu-btn.recent",
};

const PAGE_TO_SELECTOR_MAP = {
    "index.html": SELECTORS.EXPLORE_BUTTON,
    "hoso.html": SELECTORS.YOUR_BUTTON,
    "yeuthich.html": SELECTORS.LIKED_BUTTON,
    "ngheganday.html": SELECTORS.RECENT_BUTTON,
    "playlist.html": SELECTORS.YOUR_BUTTON,
};

const NAVIGATION_PATHS = {
    LIKED: "./Yeuthich.html",
    YOUR: "./Hoso.html",
    EXPLORE: "./index.html",
    RECENT: "./NgheGanDay.html",
};

const DEFAULT_PAGE = "index.html";
const ACTIVE_CLASS = "active";
const LOADED_CLASS = "is-loaded";

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
 * Gets current page filename from URL
 * @returns {string} Current page filename in lowercase
 */
function getCurrentPageFilename() {
    return safeExecute(() => {
        return (
            location.pathname.split("/").pop() || DEFAULT_PAGE
        ).toLowerCase();
    }, "getCurrentPageFilename") ?? DEFAULT_PAGE;
}

/**
 * Gets sidebar selector for current page
 * @param {string} filename - Current page filename
 * @returns {string|null} Selector for active sidebar item or null
 */
function getSidebarSelectorForPage(filename) {
    if (filename === "") {
        return SELECTORS.EXPLORE_BUTTON;
    }
    return PAGE_TO_SELECTOR_MAP[filename] || null;
}

/**
 * Removes active class from all menu buttons
 */
function clearActiveSidebarItems() {
    safeExecute(() => {
        const buttons = document.querySelectorAll(SELECTORS.MENU_BUTTONS);
        buttons.forEach((button) => button.classList.remove(ACTIVE_CLASS));
    }, "clearActiveSidebarItems");
}

/**
 * Sets active class on specified sidebar item
 * @param {string} selector - Selector for the sidebar item
 */
function setActiveSidebarItem(selector) {
    safeExecute(() => {
        const target = document.querySelector(selector);
        if (target) {
            target.classList.add(ACTIVE_CLASS);
        }
    }, "setActiveSidebarItem");
}

/**
 * Sets active sidebar item based on current page
 */
function setActiveSidebar() {
    const filename = getCurrentPageFilename();
    const selector = getSidebarSelectorForPage(filename);

    clearActiveSidebarItems();

    if (selector) {
        setActiveSidebarItem(selector);
    }
}

/**
 * Adds loaded class to body for smooth page enter animation
 */
function addPageLoadedClass() {
    safeExecute(() => {
        requestAnimationFrame(() => {
            document.body.classList.add(LOADED_CLASS);
        });
    }, "addPageLoadedClass");
}

// ===== NAVIGATION SETUP =====
/**
 * Sets up logout button click handler
 * @param {Function} signOut - Sign out function
 */
function setupLogoutButton(signOut) {
    safeExecute(() => {
        const logoutButton = document.querySelector(SELECTORS.LOGOUT_BUTTON);
        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                signOut(true);
            });
        }
    }, "setupLogoutButton");
}

/**
 * Sets up sidebar navigation button
 * @param {string} selector - Button selector
 * @param {string} path - Navigation path
 * @param {Function} go - Navigation function
 */
function setupSidebarNavigationButton(selector, path, go) {
    safeExecute(() => {
        const button = document.querySelector(selector);
        if (button) {
            button.addEventListener("click", () => {
                go(path);
            });
        }
    }, `setupSidebarNavigationButton:${selector}`);
}

/**
 * Sets up all sidebar navigation buttons
 * @param {Function} go - Navigation function
 */
function setupSidebarNavigation(go) {
    setupSidebarNavigationButton(
        SELECTORS.LIKED_BUTTON,
        NAVIGATION_PATHS.LIKED,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.YOUR_BUTTON,
        NAVIGATION_PATHS.YOUR,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.EXPLORE_BUTTON,
        NAVIGATION_PATHS.EXPLORE,
        go
    );
    setupSidebarNavigationButton(
        SELECTORS.RECENT_BUTTON,
        NAVIGATION_PATHS.RECENT,
        go
    );
}

/**
 * Sets up all individual UI modules
 * @param {Object} layoutContext - Layout context with navigation function
 * @param {Object} playerContext - Player context
 * @param {Object} playlistContext - Playlist context
 */
function setupUIModules(layoutContext, playerContext, playlistContext) {
    setupHeaderSearch({ go: layoutContext.go });
    setupGlobalLiveSearch({ playerContext });
    setupMoreMenu({ playerContext, playlistContext });
    setupAddToPlaylist({ playerContext, playlistContext });
    setupSidebarPlaylists({ playlistContext, playerContext });
}

/**
 * Creates and returns UI context object
 * @param {Object} layoutContext - Layout context
 * @returns {Object} UI context with layout methods
 */
function createUIContext(layoutContext) {
    return {
        go: layoutContext.go,
        setQueueVisible: layoutContext.setQueueVisible,
        pushUIState: layoutContext.pushUIState,
        setPlayerSpacer: layoutContext.setPlayerSpacer,
        updatePlayerBottomSpace: layoutContext.updatePlayerBottomSpace,
    };
}

// ===== MAIN INITIALIZATION =====
/**
 * Initializes UI module and sets up all UI components
 * @param {Object} deps - Dependencies object
 * @param {Function} deps.signOut - Sign out function
 * @param {Object} deps.playlistContext - Playlist context
 * @param {Object} deps.playerContext - Player context
 * @returns {Object} UI context with navigation and layout methods
 */
export function initUI(deps) {
    const { signOut, playlistContext, playerContext } = deps;

    // Smooth page enter animation
    addPageLoadedClass();

    // Set active sidebar item based on current page
    setActiveSidebar();

    // Initialize layout helpers (handles most of the UI setup)
    const layoutContext = setupLayoutHelpers({
        signOut,
        playerContext,
        playlistContext,
    });

    // Setup navigation handlers
    setupLogoutButton(signOut);
    setupSidebarNavigation(layoutContext.go);

    // Setup individual UI modules
    setupUIModules(layoutContext, playerContext, playlistContext);

    // Return UI context
    return createUIContext(layoutContext);
}
