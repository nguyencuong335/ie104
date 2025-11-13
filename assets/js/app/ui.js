// ===== UI MODULE ORCHESTRATOR =====

import { setupHeaderSearch } from "./ui/search.js";
import { setupGlobalLiveSearch } from "./ui/live-search.js";
import { setupMoreMenu } from "./ui/more-menu.js";
import { setupAddToPlaylist } from "./ui/add-to-playlist.js";
import { setupLayoutHelpers } from "./ui/layout.js";
import { setupSidebarPlaylists } from "./ui/sidebar-playlists.js";
import { setupHosoPlaylists } from "./ui/hoso.js";

// Set active sidebar item by current page
function setActiveSidebar() {
    try {
        const file = (
            location.pathname.split("/").pop() || "index.html"
        ).toLowerCase();
        const map = {
            "index.html": ".menu-btn.explore",
            "hoso.html": ".menu-btn.your",
            "yeuthich.html": ".menu-btn.liked",
            "ngheganday.html": ".menu-btn.recent",
            "playlist.html": ".menu-btn.your",
        };
        const sel = map[file] || (file === "" ? ".menu-btn.explore" : null);
        const all = document.querySelectorAll(".menu .menu-btn");
        all.forEach((b) => b.classList.remove("active"));
        if (sel) {
            const target = document.querySelector(sel);
            if (target) target.classList.add("active");
        }
    } catch {}
}

// Initialize UI module
export function initUI(deps) {
    const { signOut, playlistContext, playerContext } = deps;

    // Smooth page enter
    try {
        requestAnimationFrame(() => document.body.classList.add("is-loaded"));
    } catch {}

    // Set active sidebar
    setActiveSidebar();

    // Initialize layout helpers (this handles most of the UI setup)
    const layoutContext = setupLayoutHelpers({ signOut, playerContext, playlistContext });

    // Setup navigation
    document
        .querySelector(".menu-btn.logout")
        ?.addEventListener("click", () => {
            signOut(true);
        });

    // Sidebar navigation
    const likedBtn = document.querySelector(".menu-btn.liked");
    if (likedBtn) {
        likedBtn.addEventListener("click", () => {
            layoutContext.go("./Yeuthich.html");
        });
    }

    const yourBtn = document.querySelector(".menu-btn.your");
    if (yourBtn) {
        yourBtn.addEventListener("click", () => {
            layoutContext.go("./Hoso.html");
        });
    }

    const exploreBtn = document.querySelector(".menu-btn.explore");
    if (exploreBtn) {
        exploreBtn.addEventListener("click", () => {
            layoutContext.go("./index.html");
        });
    }

    const recentNavBtn = document.querySelector(".menu-btn.recent");
    if (recentNavBtn) {
        recentNavBtn.addEventListener("click", () => {
            layoutContext.go("./NgheGanDay.html");
        });
    }

    // Setup individual UI modules
    setupHeaderSearch({ go: layoutContext.go });
    setupGlobalLiveSearch({ playerContext });
    setupMoreMenu({ playerContext, playlistContext });
    setupAddToPlaylist({ playerContext, playlistContext });
    setupSidebarPlaylists({ playlistContext, playerContext });
    setupHosoPlaylists({ playlistContext, playerContext });

    return {
        go: layoutContext.go,
        setQueueVisible: layoutContext.setQueueVisible,
        pushUIState: layoutContext.pushUIState,
        setPlayerSpacer: layoutContext.setPlayerSpacer,
        updatePlayerBottomSpace: layoutContext.updatePlayerBottomSpace
    };
}
