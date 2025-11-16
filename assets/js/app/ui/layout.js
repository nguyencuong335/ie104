// ===== LAYOUT HELPERS MODULE =====

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    AUTH_USER: "auth_user",
    PREMIUM_ENABLED: "premium_enabled",
};

const CSS_VARIABLES = {
    PLAYER_HEIGHT: "--player-h",
    PLAYER_BOTTOM_SPACE: "--player-bottom-space",
    PROGRESS_VALUE: "--progress-value",
    VOLUME_VALUE: "--volume-value",
};

const PAGE_EXIT_DELAY = 180;
const PROFILE_PAGE = "./Hoso.html";
const DEFAULT_LOGO_LINK = "./index.html";

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
 * Sets a CSS custom property on document root
 * @param {string} property - CSS property name
 * @param {string} value - CSS property value
 */
function setCSSVariable(property, value) {
    safeExecute(() => {
        document.documentElement.style.setProperty(property, value);
    }, `setCSSVariable:${property}`);
}

/**
 * Checks if queue panel is currently visible
 * @param {HTMLElement} queuePanel - Queue panel element
 * @returns {boolean}
 */
function isQueueOpen(queuePanel) {
    return queuePanel ? !queuePanel.classList.contains("hidden") : false;
}

// ===== PLAYER SPACING =====
/**
 * Gets player element height
 * @returns {number} Player height in pixels
 */
function getPlayerHeight() {
    const player = document.querySelector(".player");
    return player?.offsetHeight || 0;
}

/**
 * Sets player height CSS variable
 */
function setPlayerSpacer() {
    const height = getPlayerHeight();
    if (height > 0) {
        setCSSVariable(CSS_VARIABLES.PLAYER_HEIGHT, `${height}px`);
    }
}

/**
 * Updates player bottom spacing CSS variable
 */
function updatePlayerBottomSpace() {
    const height = getPlayerHeight();
    if (height > 0) {
        setCSSVariable(CSS_VARIABLES.PLAYER_BOTTOM_SPACE, `${height}px`);
    }
}

// ===== HEADER AVATAR =====
/**
 * Gets avatar storage key for current user
 * @returns {string} Avatar key
 */
function getAvatarKey() {
    return safeExecute(() => {
        const userData = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.AUTH_USER) || "null"
        );
        if (userData && (userData.id || userData.email)) {
            return `avatar_${userData.id || userData.email}`;
        }
        return "avatar_guest";
    }, "getAvatarKey") ?? "avatar_guest";
}

/**
 * Applies header avatar image
 */
function applyHeaderAvatar() {
    safeExecute(() => {
        const profileButton = document.querySelector(".profile-btn");
        if (!profileButton) return;
        
        const avatarData = localStorage.getItem(getAvatarKey());
        if (avatarData) {
            profileButton.classList.add("has-avatar");
            profileButton.style.backgroundImage = `url('${avatarData}')`;
        } else {
            profileButton.classList.remove("has-avatar");
            profileButton.style.backgroundImage = "";
        }
    }, "applyHeaderAvatar");
}

// ===== QUEUE MANAGEMENT =====
/**
 * Sets queue visibility state
 * @param {boolean} show - Whether to show queue
 * @param {boolean} fromPopState - Whether triggered from popstate event
 */
function setQueueVisible(show, fromPopState = false) {
    const queuePanel = document.getElementById("queue");
    const playlistSection = document.querySelector(".playlist");
    const recentButton = document.querySelector(".menu-btn.recent");
    const queueTitle = document.querySelector(".q-title");
    
    if (!queuePanel) return;
    
    queuePanel.classList.toggle("hidden", !show);
    if (playlistSection) {
        playlistSection.classList.toggle("hidden", show);
    }

    if (recentButton) {
        recentButton.setAttribute("aria-expanded", String(show));
    }
    
    // Focus management
    if (show) {
        if (queueTitle && !queueTitle.hasAttribute("tabindex")) {
            queueTitle.setAttribute("tabindex", "-1");
        }
        setTimeout(() => queueTitle?.focus(), 0);
    } else {
        recentButton?.focus();
    }
    
    // Toggle body state class for CSS targeting
    safeExecute(() => {
        document.body.classList.toggle("queue-open", !!show);
    }, "setQueueVisible:toggleBodyClass");
    
    if (!fromPopState && window.__mbPushUIState) {
        window.__mbPushUIState();
    }
    if (window.__mbSavePlayerState) {
        window.__mbSavePlayerState(true);
    }
}

/**
 * Pushes current UI state to history
 */
function pushUIState() {
    const queuePanel = document.getElementById("queue");
    const state = {
        index: playerContext.getCurrentIndex(),
        queueOpen: isQueueOpen(queuePanel),
    };
    
    safeExecute(() => {
        history.pushState(state, "");
    }, "pushUIState");
}

/**
 * Gets current UI state
 * @returns {Object} UI state object
 */
function getUIState() {
    const queuePanel = document.getElementById("queue");
    return {
        index: playerContext.getCurrentIndex(),
        queueOpen: isQueueOpen(queuePanel),
    };
}

// ===== PROFILE DROPDOWN =====
/**
 * Sets up profile dropdown menu functionality
 * @param {Function} go - Navigation function
 * @param {Function} signOut - Sign out function
 */
function setupProfileDropdown(go, signOut) {
    const profileButton = document.getElementById("profile-btn");
    const profileMenu = document.getElementById("profile-menu");
    const profileOpenButton = document.getElementById("profile-open");
    const profileLogoutButton = document.getElementById("profile-logout");

    if (!profileButton || !profileMenu) return;

    /**
     * Closes the profile menu
     */
    function closeProfileMenu() {
        profileMenu.classList.remove("open");
        profileMenu.setAttribute("aria-hidden", "true");
        document.removeEventListener("click", handleProfileDocumentClick, true);
        document.removeEventListener("keydown", handleProfileEscape, true);
    }

    /**
     * Handles clicks outside profile menu
     * @param {Event} event - Click event
     */
    function handleProfileDocumentClick(event) {
        if (
            profileMenu.contains(event.target) ||
            profileButton.contains(event.target)
        ) {
            return;
        }
        closeProfileMenu();
    }

    /**
     * Handles Escape key press
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleProfileEscape(event) {
        if (event.key === "Escape") {
            closeProfileMenu();
        }
    }

    // Toggle menu on button click
    profileButton.addEventListener("click", () => {
        const isOpen = profileMenu.classList.toggle("open");
        profileMenu.setAttribute("aria-hidden", String(!isOpen));
        
        if (isOpen) {
            document.addEventListener("click", handleProfileDocumentClick, true);
            document.addEventListener("keydown", handleProfileEscape, true);
        } else {
            closeProfileMenu();
        }
    });

    // Profile page navigation
    if (profileOpenButton) {
        profileOpenButton.addEventListener("click", () => {
            closeProfileMenu();
            safeExecute(() => {
                go(PROFILE_PAGE);
            }, "setupProfileDropdown:go") ?? (window.location.href = PROFILE_PAGE);
        });
    }

    // Logout
    if (profileLogoutButton) {
        profileLogoutButton.addEventListener("click", () => {
            closeProfileMenu();
            signOut(true);
        });
    }
}

// ===== PREMIUM BUTTON =====
/**
 * Applies premium state to button
 * @param {HTMLElement} premiumButton - Premium button element
 * @param {boolean} isEnabled - Whether premium is enabled
 */
function applyPremiumState(premiumButton, isEnabled) {
    if (!premiumButton) return;
    premiumButton.setAttribute("aria-pressed", String(isEnabled));
    premiumButton.classList.toggle("active", isEnabled);
    premiumButton.setAttribute("title", isEnabled ? "Premium (on)" : "Premium");
}

/**
 * Sets up premium button functionality
 */
function setupPremiumButton() {
    const premiumButton = document.querySelector(".premium-btn");
    if (!premiumButton) return;
    
    // Initialize from storage
    safeExecute(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.PREMIUM_ENABLED);
        if (saved !== null) {
            applyPremiumState(premiumButton, saved === "true");
        }
    }, "setupPremiumButton:init");
    
    // Toggle on click
    premiumButton.addEventListener("click", () => {
        const currentState =
            premiumButton.getAttribute("aria-pressed") === "true";
        const newState = !currentState;
        
        applyPremiumState(premiumButton, newState);
        
        safeExecute(() => {
            localStorage.setItem(
                STORAGE_KEYS.PREMIUM_ENABLED,
                String(newState)
            );
        }, "setupPremiumButton:save");
        
        // Stop ad if premium is activated during ad playback
        if (newState && window.__mbIsAdPlaying && window.__mbIsAdPlaying()) {
            safeExecute(() => {
                window.dispatchEvent(new CustomEvent("premium:activated"));
            }, "setupPremiumButton:stopAd");
        }
    });
}

// ===== SLIDER EFFECTS =====
/**
 * Updates progress bar visual indicator
 * @param {HTMLElement} progressBar - Progress bar element
 * @param {string} value - Progress value
 */
function updateProgressBar(progressBar, value) {
    setCSSVariable(CSS_VARIABLES.PROGRESS_VALUE, `${value}%`);
}

/**
 * Updates volume slider visual indicator
 * @param {HTMLElement} volumeSlider - Volume slider element
 */
function updateVolumeSlider(volumeSlider) {
    const value = volumeSlider.value;
    const percentage = (value / volumeSlider.max) * 100;
    setCSSVariable(CSS_VARIABLES.VOLUME_VALUE, `${percentage}%`);
}

/**
 * Sets up visual effects for progress and volume sliders
 */
function setupSliderEffects() {
    // Progress bar
    const progressBar = document.getElementById("progress");
    if (progressBar) {
        updateProgressBar(progressBar, progressBar.value);
        progressBar.addEventListener("input", (event) => {
            updateProgressBar(progressBar, event.target.value);
        });
    }

    // Volume slider
    const volumeSlider = document.getElementById("volume");
    if (volumeSlider) {
        updateVolumeSlider(volumeSlider);
        volumeSlider.addEventListener("input", () => {
            updateVolumeSlider(volumeSlider);
        });
    }
}

// ===== NAVIGATION =====
/**
 * Navigates to URL with smooth fade-out effect
 * @param {string} url - URL to navigate to
 */
function go(url) {
    safeExecute(() => {
        document.body.classList.add("page-exit");
    }, "go:addExitClass");
    
    setTimeout(() => {
        window.location.href = url;
    }, PAGE_EXIT_DELAY);
}

// ===== QUEUE CSS =====
/**
 * Ensures queue visibility CSS is injected
 */
function ensureQueueCSS() {
    safeExecute(() => {
        if (document.getElementById("queue-visibility-style")) return;
        
        const style = document.createElement("style");
        style.id = "queue-visibility-style";
        style.textContent = `
            .queue {
                display: none !important;
            }
            body.queue-open .queue {
                display: block !important;
            }
        `;
        document.head.appendChild(style);
    }, "ensureQueueCSS");
}

// ===== INITIALIZATION =====
/**
 * Sets up all layout helpers
 * @param {Object} options - Setup options
 * @param {Function} options.signOut - Sign out function
 * @param {Object} options.playerContext - Player context
 * @param {Object} options.playlistContext - Playlist context
 * @returns {Object} Layout context with public methods
 */
export function setupLayoutHelpers({ signOut, playerContext, playlistContext }) {
    // Initialize queue - hide by default
    setQueueVisible(false);
    ensureQueueCSS();

    // Queue toggle from title click
    const titleElement = document.getElementById("title");
    if (titleElement) {
        titleElement.style.cursor = "pointer";
        titleElement.setAttribute("title", "Mở/đóng Queue");
        titleElement.addEventListener("click", () => {
            const queuePanel = document.getElementById("queue");
            const shouldOpen = isQueueOpen(queuePanel);
            setQueueVisible(!shouldOpen);
        });
    }

    // Player spacing
    setPlayerSpacer();
    window.addEventListener("resize", setPlayerSpacer);
    updatePlayerBottomSpace();
    window.addEventListener("resize", updatePlayerBottomSpace);
    window.addEventListener("orientationchange", updatePlayerBottomSpace);

    // Header avatar
    applyHeaderAvatar();
    window.addEventListener("avatar:changed", applyHeaderAvatar);

    // Profile dropdown
    setupProfileDropdown(go, signOut);

    // Premium button
    setupPremiumButton();

    // Visual effects
    setupSliderEffects();

    // Logo link smooth navigation
    const logoLink = document.querySelector("a.logo-link");
    if (logoLink) {
        logoLink.addEventListener("click", (event) => {
            event.preventDefault();
            go(logoLink.getAttribute("href") || DEFAULT_LOGO_LINK);
        });
    }

    // History management
    safeExecute(() => {
        history.replaceState(getUIState(), "");
    }, "setupLayoutHelpers:replaceState");

    window.addEventListener("popstate", (event) => {
        const state = event.state;
        if (!state) return;
        
        if (playerContext.loadTrack) {
            playerContext.loadTrack(state.index);
        }
        
        if (playerContext.isCurrentlyPlaying()) {
            playerContext.play();
        } else if (playerContext.setPlayUI) {
            playerContext.setPlayUI(false);
        }
        
        setQueueVisible(!!state.queueOpen, true);
        
        if (playerContext.savePlayerState) {
            playerContext.savePlayerState(true);
        }
    });

    window.addEventListener("beforeunload", () => {
        if (playerContext.savePlayerState) {
            playerContext.savePlayerState(true);
        }
    });

    // Expose global functions for other modules
    window.__mbPushUIState = pushUIState;
    window.__mbSetQueueVisible = setQueueVisible;
    window.__mbGo = go;

    return {
        go,
        setQueueVisible,
        pushUIState,
        setPlayerSpacer,
        updatePlayerBottomSpace,
    };
}
