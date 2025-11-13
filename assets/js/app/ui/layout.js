// ===== LAYOUT HELPERS MODULE =====

export function setupLayoutHelpers({ signOut, playerContext, playlistContext }) {
    // Queue visibility helpers
    function closeQueue() {
        try {
            document.body.classList.remove("queue-open");
            document
                .querySelectorAll(".queue")
                .forEach((q) => q.classList.add("hidden"));
        } catch {}
    }

    function openQueue() {
        try {
            document.body.classList.add("queue-open");
            document
                .querySelectorAll(".queue")
                .forEach((q) => q.classList.remove("hidden"));
        } catch {}
    }

    // Player spacing helpers
    function setPlayerSpacer() {
        const p = document.querySelector(".player");
        if (p) {
            document.documentElement.style.setProperty(
                "--player-h",
                p.offsetHeight + "px"
            );
        }
    }

    function updatePlayerBottomSpace() {
        try {
            const p = document.querySelector(".player");
            if (!p) return;
            const h = p.offsetHeight || 0;
            document.documentElement.style.setProperty(
                "--player-bottom-space",
                h + "px"
            );
        } catch {}
    }

    // Header avatar sync
    function getAvatarKey() {
        try {
            const u = JSON.parse(localStorage.getItem("auth_user") || "null");
            if (u && (u.id || u.email)) return `avatar_${u.id || u.email}`;
        } catch {}
        return "avatar_guest";
    }

    function applyHeaderAvatar() {
        try {
            const btn = document.querySelector(".profile-btn");
            if (!btn) return;
            const data = localStorage.getItem(getAvatarKey());
            if (data) {
                btn.classList.add("has-avatar");
                btn.style.backgroundImage = `url('${data}')`;
            } else {
                btn.classList.remove("has-avatar");
                btn.style.backgroundImage = "";
            }
        } catch {}
    }

    // Queue visibility and state management
    function setQueueVisible(show, fromPop = false) {
        const queuePanel = document.getElementById("queue");
        const playlistSection = document.querySelector(".playlist");
        const recentBtn = document.querySelector(".menu-btn.recent");
        const qTitle = document.querySelector(".q-title");
        
        if (!queuePanel) return;
        queuePanel.classList.toggle("hidden", !show);
        if (playlistSection) playlistSection.classList.toggle("hidden", show);

        if (recentBtn) recentBtn.setAttribute("aria-expanded", String(show));
        if (show) {
            if (qTitle && !qTitle.hasAttribute("tabindex"))
                qTitle.setAttribute("tabindex", "-1");
            setTimeout(() => qTitle?.focus(), 0);
        } else {
            recentBtn?.focus();
        }
        // Toggle a body state class so CSS can target small-screen layout when queue is open
        try {
            document.body.classList.toggle("queue-open", !!show);
        } catch {}
        if (!fromPop && window.__mbPushUIState) window.__mbPushUIState();
        if (window.__mbSavePlayerState) window.__mbSavePlayerState(true);
    }

    function pushUIState() {
        const queuePanel = document.getElementById("queue");
        const state = {
            index: playerContext.getCurrentIndex(),
            queueOpen: queuePanel
                ? !queuePanel.classList.contains("hidden")
                : false,
        };
        try {
            history.pushState(state, "");
        } catch {}
    }

    // Profile dropdown management
    function setupProfileDropdown() {
        const profileBtn = document.getElementById("profile-btn");
        const profileMenu = document.getElementById("profile-menu");
        const profileOpen = document.getElementById("profile-open");
        const profileLogout = document.getElementById("profile-logout");

        function closeProfileMenu() {
            if (!profileMenu) return;
            profileMenu.classList.remove("open");
            profileMenu.setAttribute("aria-hidden", "true");
            document.removeEventListener("click", onProfileDoc, true);
            document.removeEventListener("keydown", onProfileEsc, true);
        }
        function onProfileDoc(e) {
            if (!profileMenu || !profileBtn) return;
            if (profileMenu.contains(e.target) || profileBtn.contains(e.target))
                return;
            closeProfileMenu();
        }
        function onProfileEsc(e) {
            if (e.key === "Escape") closeProfileMenu();
        }

        if (profileBtn && profileMenu) {
            profileBtn.addEventListener("click", () => {
                const open = profileMenu.classList.toggle("open");
                profileMenu.setAttribute("aria-hidden", String(!open));
                if (open) {
                    document.addEventListener("click", onProfileDoc, true);
                    document.addEventListener("keydown", onProfileEsc, true);
                } else closeProfileMenu();
            });
        }
        if (profileOpen) {
            profileOpen.addEventListener("click", () => {
                closeProfileMenu();
                try {
                    go("./Hoso.html");
                } catch {
                    window.location.href = "./Hoso.html";
                }
            });
        }
        if (profileLogout) {
            profileLogout.addEventListener("click", () => {
                closeProfileMenu();
                signOut(true);
            });
        }
    }

    // Premium button functionality
    function setupPremiumButton() {
        const premiumBtn = document.querySelector(".premium-btn");
        const PREMIUM_KEY = "premium_enabled";
        
        function applyPremiumState(on) {
            if (!premiumBtn) return;
            premiumBtn.setAttribute("aria-pressed", String(on));
            premiumBtn.classList.toggle("active", on);
            premiumBtn.setAttribute("title", on ? "Premium (on)" : "Premium");
        }
        
        // Initialize from storage
        try {
            const saved = localStorage.getItem(PREMIUM_KEY);
            if (saved !== null) applyPremiumState(saved === "true");
        } catch {}
        
        // Click to toggle and save
        if (premiumBtn) {
            premiumBtn.addEventListener("click", () => {
                const now =
                    premiumBtn.getAttribute("aria-pressed") === "true"
                        ? false
                        : true;
                applyPremiumState(now);
                try {
                    localStorage.setItem(PREMIUM_KEY, String(now));
                } catch {}
                // If user turns on premium during an ad, stop ad immediately
                try {
                    if (now === true && window.__mbIsAdPlaying && window.__mbIsAdPlaying()) {
                        // Signal to player to stop ad
                        window.dispatchEvent(new CustomEvent("premium:activated"));
                    }
                } catch {}
            });
        }
    }

    // Visual effects for progress and volume sliders
    function setupSliderEffects() {
        // Progress bar effect
        const progressBar = document.getElementById("progress");
        if (progressBar) {
            progressBar.style.setProperty("--progress-value", `${progressBar.value}%`);
            progressBar.addEventListener("input", (e) => {
                const value = e.target.value;
                progressBar.style.setProperty("--progress-value", `${value}%`);
            });
        }

        // Volume slider effect
        const volumeSlider = document.getElementById("volume");
        if (volumeSlider) {
            function updateVolumeSlider() {
                const value = volumeSlider.value;
                const percentage = (value / volumeSlider.max) * 100;
                volumeSlider.style.setProperty("--volume-value", `${percentage}%`);
            }
            // Set initial value
            updateVolumeSlider();
            // Update on change
            volumeSlider.addEventListener("input", updateVolumeSlider);
        }
    }

    // Helper: smooth navigate with fade-out
    function go(url) {
        try {
            document.body.classList.add("page-exit");
        } catch {}
        setTimeout(() => {
            window.location.href = url;
        }, 180);
    }

    // Initialize all layout helpers
    
    // Queue functionality
    closeQueue(); // Always hide Queue by default on page load
    
    // Inject global CSS guard for queue visibility
    (function ensureQueueCSS() {
        try {
            if (!document.getElementById("queue-visibility-style")) {
                const s = document.createElement("style");
                s.id = "queue-visibility-style";
                s.textContent = `.queue{display:none !important;} body.queue-open .queue{display:block !important;}`;
                document.head.appendChild(s);
            }
        } catch {}
    })();

    // Queue toggle from title click
    const titleClickable = document.getElementById("title");
    if (titleClickable) {
        titleClickable.style.cursor = "pointer";
        titleClickable.setAttribute("title", "Mở/đóng Queue");
        titleClickable.addEventListener("click", () => {
            const queuePanel = document.getElementById("queue");
            const open = queuePanel ? queuePanel.classList.contains("hidden") : false;
            setQueueVisible(open);
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
    setupProfileDropdown();

    // Premium button
    setupPremiumButton();

    // Visual effects
    setupSliderEffects();

    // Logo link smooth navigation
    const logoLink = document.querySelector("a.logo-link");
    if (logoLink) {
        logoLink.addEventListener("click", (e) => {
            e.preventDefault();
            go(logoLink.getAttribute("href") || "./index.html");
        });
    }

    // History management
    try {
        const queuePanel = document.getElementById("queue");
        history.replaceState(
            {
                index: playerContext.getCurrentIndex(),
                queueOpen: queuePanel
                    ? !queuePanel.classList.contains("hidden")
                    : false,
            },
            ""
        );
    } catch {}

    window.addEventListener("popstate", (e) => {
        const s = e.state;
        if (!s) return;
        if (playerContext.loadTrack) playerContext.loadTrack(s.index);
        if (playerContext.isCurrentlyPlaying()) playerContext.play();
        else if (playerContext.setPlayUI) playerContext.setPlayUI(false);
        setQueueVisible(!!s.queueOpen, true);
        if (playerContext.savePlayerState) playerContext.savePlayerState(true);
    });

    window.addEventListener("beforeunload", () => {
        if (playerContext.savePlayerState) playerContext.savePlayerState(true);
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
        updatePlayerBottomSpace
    };
}
