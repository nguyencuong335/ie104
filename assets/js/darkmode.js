// ===== DARK MODE MANAGER =====

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    DARK_MODE: "musicbox-dark-mode",
};

const SELECTORS = {
    HEADER_RIGHT: ".header-right",
    DARK_MODE_TOGGLE: ".dark-mode-toggle",
    PREMIUM_BUTTON: ".premium-btn",
};

const THEMES = {
    DARK: "dark",
    LIGHT: "light",
};

const ICONS = {
    MOON: "fa-solid fa-moon",
    SUN: "fa-solid fa-sun",
};

const ANIMATION = {
    ROTATING_CLASS: "rotating",
    DURATION: 300,
};

const ATTRIBUTES = {
    DATA_THEME: "data-theme",
    DATA_INITIALIZED: "data-initialized",
    ARIA_LABEL: "aria-label",
    ARIA_HIDDEN: "aria-hidden",
};

const MEDIA_QUERY = "(prefers-color-scheme: dark)";
const DEFAULT_THEME = THEMES.LIGHT;
const INITIALIZED_FLAG = "true";

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
 * Gets saved theme from localStorage
 * @returns {string|null} Saved theme or null
 */
function getSavedTheme() {
    return safeExecute(() => {
        return localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    }, "getSavedTheme") ?? null;
}

/**
 * Saves theme to localStorage
 * @param {string} theme - Theme to save
 */
function saveTheme(theme) {
    safeExecute(() => {
        localStorage.setItem(STORAGE_KEYS.DARK_MODE, theme);
    }, "saveTheme");
}

/**
 * Checks if system prefers dark mode
 * @returns {boolean} True if system prefers dark mode
 */
function prefersDarkMode() {
    return safeExecute(() => {
        return window.matchMedia(MEDIA_QUERY).matches;
    }, "prefersDarkMode") ?? false;
}

/**
 * Gets icon class name for theme
 * @param {string} theme - Theme name
 * @returns {string} Icon class name
 */
function getIconForTheme(theme) {
    return theme === THEMES.DARK ? ICONS.MOON : ICONS.SUN;
}

/**
 * Dark Mode Manager
 * Quản lý chế độ tối/sáng cho toàn bộ ứng dụng
 */
class DarkModeManager {
    /**
     * Creates a new DarkModeManager instance
     */
    constructor() {
        this.toggleButton = null;
        this.init();
    }

    /**
     * Khởi tạo dark mode
     */
    init() {
        // Apply saved theme or system preference
        this.applyInitialTheme();

        // Tạo toggle button
        this.createToggleButton();

        // Listen for system theme changes
        this.setupSystemThemeListener();
    }

    /**
     * Applies initial theme from saved preference or system
     */
    applyInitialTheme() {
        const savedTheme = getSavedTheme();

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            const systemTheme = prefersDarkMode() ? THEMES.DARK : THEMES.LIGHT;
            this.setTheme(systemTheme);
        }
    }

    /**
     * Sets up listener for system theme changes
     */
    setupSystemThemeListener() {
        safeExecute(() => {
            const mediaQuery = window.matchMedia(MEDIA_QUERY);
            mediaQuery.addEventListener("change", (event) => {
                // Only apply system theme if user hasn't set a preference
                if (!getSavedTheme()) {
                    const newTheme = event.matches ? THEMES.DARK : THEMES.LIGHT;
                    this.setTheme(newTheme);
                }
            });
        }, "setupSystemThemeListener");
    }

    /**
     * Tạo nút toggle dark mode trong header
     */
    createToggleButton() {
        const headerRight = document.querySelector(SELECTORS.HEADER_RIGHT);
        if (!headerRight) return;

        // Kiểm tra xem nút đã tồn tại chưa
        const existingButton = headerRight.querySelector(
            SELECTORS.DARK_MODE_TOGGLE
        );
        if (existingButton) {
            this.setupExistingButton(existingButton);
            return;
        }

        // Tạo button mới
        this.createNewToggleButton(headerRight);
    }

    /**
     * Sets up existing toggle button
     * @param {HTMLElement} button - Existing button element
     */
    setupExistingButton(button) {
        this.toggleButton = button;
        this.updateToggleIcon(this.getCurrentTheme());

        // Add event listener nếu chưa có
        if (!button.dataset.initialized) {
            button.addEventListener("click", () => this.toggle());
            button.dataset.initialized = INITIALIZED_FLAG;
        }
    }

    /**
     * Creates a new toggle button
     * @param {HTMLElement} headerRight - Header right container
     */
    createNewToggleButton(headerRight) {
        this.toggleButton = document.createElement("button");
        this.toggleButton.className = "dark-mode-toggle";
        this.toggleButton.title = "Chuyển đổi chế độ sáng/tối";
        this.toggleButton.setAttribute(
            ATTRIBUTES.ARIA_LABEL,
            "Chuyển đổi dark mode"
        );
        this.toggleButton.dataset.initialized = INITIALIZED_FLAG;

        // Thêm icon
        const icon = this.createToggleIcon();
        this.toggleButton.appendChild(icon);

        // Add event listener
        this.toggleButton.addEventListener("click", () => this.toggle());

        // Insert button into header
        this.insertToggleButton(headerRight);
    }

    /**
     * Creates toggle icon element
     * @returns {HTMLElement} Icon element
     */
    createToggleIcon() {
        const icon = document.createElement("i");
        const currentTheme = this.getCurrentTheme();
        icon.className = getIconForTheme(currentTheme);
        icon.setAttribute(ATTRIBUTES.ARIA_HIDDEN, "true");
        return icon;
    }

    /**
     * Inserts toggle button into header
     * @param {HTMLElement} headerRight - Header right container
     */
    insertToggleButton(headerRight) {
        const premiumButton = headerRight.querySelector(
            SELECTORS.PREMIUM_BUTTON
        );
        if (premiumButton) {
            headerRight.insertBefore(this.toggleButton, premiumButton);
        } else {
            headerRight.insertBefore(
                this.toggleButton,
                headerRight.firstChild
            );
        }
    }

    /**
     * Lấy theme hiện tại
     * @returns {string} Current theme (dark or light)
     */
    getCurrentTheme() {
        return (
            document.documentElement.getAttribute(ATTRIBUTES.DATA_THEME) ||
            DEFAULT_THEME
        );
    }

    /**
     * Set theme và apply lên document
     * @param {string} theme - Theme to set (dark or light)
     */
    setTheme(theme) {
        safeExecute(() => {
            document.documentElement.setAttribute(ATTRIBUTES.DATA_THEME, theme);
            saveTheme(theme);
            this.updateToggleIcon(theme);
        }, "setTheme");
    }

    /**
     * Toggle theme giữa dark và light
     */
    toggle() {
        const currentTheme = this.getCurrentTheme();
        const newTheme =
            currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
        this.setTheme(newTheme);
        this.animateToggleButton();
    }

    /**
     * Animates toggle button with rotation
     */
    animateToggleButton() {
        if (!this.toggleButton) return;

        safeExecute(() => {
            this.toggleButton.classList.add(ANIMATION.ROTATING_CLASS);
            setTimeout(() => {
                this.toggleButton.classList.remove(ANIMATION.ROTATING_CLASS);
            }, ANIMATION.DURATION);
        }, "animateToggleButton");
    }

    /**
     * Update icon của toggle button dựa trên theme
     * @param {string} theme - Theme name
     */
    updateToggleIcon(theme) {
        if (!this.toggleButton) return;

        safeExecute(() => {
            const icon = this.toggleButton.querySelector("i");
            if (icon) {
                icon.className = getIconForTheme(theme);
            }
        }, "updateToggleIcon");
    }
}

// ===== EXPORT & INITIALIZATION =====
/**
 * Exports DarkModeManager class for ES6 modules
 */
export default DarkModeManager;

/**
 * Auto-initializes DarkModeManager if not using ES6 modules
 */
if (typeof module === "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        safeExecute(() => {
            window.darkModeManager = new DarkModeManager();
        }, "darkmode:autoInit");
    });
}
