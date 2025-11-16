// ===== MAIN APPLICATION ENTRY POINT =====
import { gate, signOut } from "./app/auth.js";
import {
    initPlaylists,
    loadPlaylistFromJSON,
    renderQueue,
    updateQueueActive,
    setPlaylist,
    getPlaylist,
    getUserPlaylists,
    getLikedList,
    setLikedList,
    isLiked,
    getFollowedArtists,
    saveFollowedArtists,
} from "./app/playlists.js";
import { initPlayer } from "./app/player.js";
import { initUI } from "./app/ui.js";
import DarkModeManager from "./darkmode.js";

// ===== CONSTANTS =====
const DEFAULT_PLAYLIST_COVER = "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg";
const TRUNCATE_LENGTH = 40;
const TRUNCATE_PREVIEW = 37;
const DEFAULT_PLAYLIST_NAME = "Playlist";
const DEFAULT_TRACK_COUNT = 0;

// ===== HELPER FUNCTIONS =====
/**
 * Truncates a string to a maximum length with ellipsis
 * @param {string} str - String to truncate
 * @returns {string} Truncated string
 */
function truncateText(str) {
    const text = String(str || "");
    if (text.length <= TRUNCATE_LENGTH) return text;
    return text.slice(0, TRUNCATE_PREVIEW) + "...";
}

/**
 * Sets background image styles for a cover element
 * @param {HTMLElement} element - Element to style
 * @param {string} imageUrl - Image URL
 */
function setCoverImage(element, imageUrl) {
    if (!element) return;
    element.style.backgroundImage = `url('${imageUrl || DEFAULT_PLAYLIST_COVER}')`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    element.style.backgroundRepeat = "no-repeat";
}

/**
 * Navigates to a playlist page with error handling
 * @param {Object} uiContext - UI context with navigation method
 * @param {string} playlistId - Playlist ID to navigate to
 */
function navigateToPlaylist(uiContext, playlistId) {
    try {
        uiContext.go(`./playlist.html?id=${encodeURIComponent(playlistId)}`);
    } catch (error) {
        console.warn("Navigation via uiContext failed, using window.location:", error);
        window.location.href = `./playlist.html?id=${encodeURIComponent(playlistId)}`;
    }
}

/**
 * Safely executes a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context description for error logging
 */
function safeExecute(fn, context = "operation") {
    try {
        return fn();
    } catch (error) {
        console.error(`Error in ${context}:`, error);
        return null;
    }
}

// ===== INITIALIZATION =====
// Initialize dark mode (only once)
if (!window.darkModeManager) {
    window.darkModeManager = new DarkModeManager();
}

// Run authentication gate
gate();

document.addEventListener("DOMContentLoaded", async () => {
    // Initialize playlists module
    const playlistContext = initPlaylists();

    // Load playlist data
    const playlistData = await loadPlaylistFromJSON();

    // Store playlist data globally for other modules to access
    window.__mbPlaylist = playlistData.playlist;
    window.__mbAllSongs = playlistData.allSongs;
    window.__mbCurrentPlaylistCtx = playlistData.currentPlaylistCtx;

    // Initialize player module
    const playerContext = initPlayer();

    // Store player functions globally for cross-module communication
    window.__mbSavePlayerState = playerContext.savePlayerState;
    window.__mbGetCurrentIndex = playerContext.getCurrentIndex;
    window.__mbUpdateVolumeSlider = playerContext.updateVolumeSlider;

    // Set up playlist functions for player
    window.__mbSetPlaylist = setPlaylist;
    window.__mbRenderQueue = () => {
        const queueListEl = document.getElementById("queue-list");
        renderQueue(queueListEl, (index) => {
            if (window.__mbIsAdPlaying && window.__mbIsAdPlaying()) return;
            playerContext.loadTrack(index);
            playerContext.play();
            if (window.__mbPushUIState) window.__mbPushUIState();
            playerContext.savePlayerState(true);
        });
    };
    window.__mbUpdateQueueActive = updateQueueActive;

    // Initial queue render
    window.__mbRenderQueue();

    // Try to restore player state or load first track
    initializePlayerState(playerContext);

    // Initialize UI module
    const uiContext = initUI({
        signOut,
        playlistContext,
        playerContext,
    });

    // Set up additional UI functionality that requires all modules to be loaded
    setupAdditionalFeatures(playlistContext, playerContext, uiContext);
});

/**
 * Initializes player state on first load
 * @param {Object} playerContext - Player context
 */
function initializePlayerState(playerContext) {
    if (playerContext.restorePlayerState()) return;

    playerContext.loadTrack(0);
    const audio = playerContext.getAudio();
    
    const volumeSlider = document.getElementById("volume");
    if (volumeSlider) {
        audio.volume = Number(volumeSlider.value);
        volumeSlider.setAttribute("aria-valuenow", String(audio.volume));
    }

    const progressBar = document.getElementById("progress");
    if (progressBar) {
        progressBar.setAttribute("aria-valuenow", "0");
    }

    // Set initial play UI to paused
    const playIcon = document.getElementById("play-icon");
    if (playIcon) {
        playIcon.classList.add("fa-play");
        playIcon.classList.remove("fa-pause");
    }

    safeExecute(() => playerContext.updateVolumeSlider(), "updateVolumeSlider");
}

// ===== ADDITIONAL FEATURES SETUP =====
function setupAdditionalFeatures(playlistContext, playerContext, uiContext) {
    setupProfilePlaylists(uiContext);
    setupSidebarPlaylists(uiContext);
    setupLikeButton(playerContext);
    setupFollowButton(playlistContext, playerContext);
}

/**
 * Sets up profile page playlist synchronization
 * @param {Object} uiContext - UI context
 */
function setupProfilePlaylists(uiContext) {
    function syncProfilePlaylists() {
        return safeExecute(() => {
            const wrap = document.querySelector(".my-playlists");
            if (!wrap) return; // Not on profile page

            const lists = getUserPlaylists();

            // Update section title count
            const titleEl = Array.from(
                document.querySelectorAll(".section-title")
            ).find((el) => /Playlist\s+đã\s+tạo/i.test(el.textContent));
            
            if (titleEl) {
                titleEl.textContent = `Playlist đã tạo (${lists.length})`;
            }

            // Ensure there are enough cards; reuse existing ones
            let cards = Array.from(wrap.querySelectorAll(".my-pl-card"));

            // Create missing cards if needed
            while (cards.length < lists.length) {
                const card = document.createElement("div");
                card.className = "my-pl-card";
                card.innerHTML = `
                    <div class="my-pl-cover"></div>
                    <div class="my-pl-name"></div>
                    <div class="my-pl-sub"></div>
                `;
                wrap.appendChild(card);
                cards.push(card);
            }

            // Update cards with playlist data
            cards.forEach((card, i) => {
                const pl = lists[i];
                if (!pl) {
                    card.style.display = "none";
                    return;
                }

                card.style.display = "";
                card.dataset.plId = pl.id;

                const cover = card.querySelector(".my-pl-cover");
                setCoverImage(cover, pl.cover);

                const name = card.querySelector(".my-pl-name");
                if (name) {
                    name.textContent = truncateText(pl.name || DEFAULT_PLAYLIST_NAME);
                }

                const sub = card.querySelector(".my-pl-sub");
                if (sub) {
                    const trackCount = Array.isArray(pl.tracks) ? pl.tracks.length : DEFAULT_TRACK_COUNT;
                    sub.textContent = `${trackCount} bài hát`;
                }

                // Wire click to navigate
                card.onclick = () => navigateToPlaylist(uiContext, pl.id);
            });
        }, "syncProfilePlaylists");
    }

    syncProfilePlaylists();
    window.addEventListener("playlists:changed", syncProfilePlaylists);
}

/**
 * Sets up sidebar playlists rendering
 * @param {Object} uiContext - UI context
 */
function setupSidebarPlaylists(uiContext) {
    function renderSidebarPlaylists() {
        return safeExecute(() => {
            const container = document.querySelector(".pl-list");
            if (!container) return;

            const lists = getUserPlaylists();
            container.innerHTML = "";

            lists.forEach((pl) => {
                const row = document.createElement("div");
                row.className = "pl-item";
                row.dataset.plId = pl.id;
                row.innerHTML = `
                    <div class="pl-cover"></div>
                    <div class="pl-meta">
                        <div class="pl-name">${truncateText(pl.name || DEFAULT_PLAYLIST_NAME)}</div>
                        <div class="pl-sub">Playlist • ${pl.tracks?.length || DEFAULT_TRACK_COUNT} songs</div>
                    </div>
                `;

                const cover = row.querySelector(".pl-cover");
                setCoverImage(cover, pl.cover);

                row.addEventListener("click", () => navigateToPlaylist(uiContext, pl.id));
                container.appendChild(row);
            });
        }, "renderSidebarPlaylists");
    }

    renderSidebarPlaylists();
    window.addEventListener("playlists:changed", renderSidebarPlaylists);
}

/**
 * Sets up like button functionality
 * @param {Object} playerContext - Player context
 */
function setupLikeButton(playerContext) {
    const likeBtn = document.getElementById("like");
    if (!likeBtn) return;

    function updateLikeUI() {
        const icon = likeBtn.querySelector("i");
        if (!icon) return;

        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const currentTrack = playlist[index] || {};
        const liked = isLiked(currentTrack.id);

        icon.classList.toggle("fa-solid", !!liked);
        icon.classList.toggle("fa-regular", !liked);
        icon.classList.add("fa-heart");
        likeBtn.classList.toggle("active", !!liked);
    }

    function toggleLikeCurrent() {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const currentTrack = playlist[index];
        
        if (!currentTrack) return;

        let list = getLikedList();
        const exists = currentTrack.id && Array.isArray(list)
            ? list.findIndex((x) => x && x.id === currentTrack.id)
            : -1;

        if (exists >= 0) {
            list.splice(exists, 1);
        } else {
            const durationEl = document.getElementById("duration");
            const item = {
                id: currentTrack.id || currentTrack.src || `${currentTrack.title}|${currentTrack.artist}`,
                title: currentTrack.title || "—",
                artist: currentTrack.artist || "—",
                cover: currentTrack.cover || "",
                duration: durationEl?.textContent || "--:--",
            };

            // Deduplicate by id
            list = Array.isArray(list)
                ? list.filter((x) => x && x.id !== item.id)
                : [];
            list.push(item);
        }

        setLikedList(list);
        updateLikeUI();
    }

    likeBtn.addEventListener("click", toggleLikeCurrent);
    window.addEventListener("liked:changed", updateLikeUI);
    window.addEventListener("musicbox:trackchange", updateLikeUI);
    updateLikeUI();
}

/**
 * Sets up follow button functionality
 * @param {Object} playlistContext - Playlist context
 * @param {Object} playerContext - Player context
 */
function setupFollowButton(playlistContext, playerContext) {
    const bFollow = document.getElementById("b-follow");
    if (!bFollow) return;

    function updateFollowUI(artistName) {
        const set = getFollowedArtists();
        const key = playlistContext.normArtist(artistName);
        const isFollowing = !!(key && set.has(key));

        bFollow.classList.toggle("is-following", isFollowing);
        bFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
        bFollow.setAttribute("aria-pressed", String(isFollowing));
    }

    function toggleFollow() {
        return safeExecute(() => {
            const playlist = getPlaylist();
            const index = playerContext.getCurrentIndex();
            const track = playlist[index] || {};
            const key = playlistContext.normArtist(track.artist || "");

            if (!key) return;

            const set = getFollowedArtists();
            if (set.has(key)) {
                set.delete(key);
            } else {
                set.add(key);
            }

            saveFollowedArtists(set);
            updateFollowUI(track.artist || "");
        }, "toggleFollow");
    }

    bFollow.addEventListener("click", toggleFollow);

    // Update follow UI when track changes
    window.addEventListener("musicbox:trackchange", () => {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const track = playlist[index] || {};
        updateFollowUI(track.artist);
    });
}
