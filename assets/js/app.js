// ===== MAIN APPLICATION ENTRY POINT =====
import { gate, signOut } from "./app/auth.js";
import { initPlaylists, loadPlaylistFromJSON, renderQueue, updateQueueActive, setPlaylist, getPlaylist, getUserPlaylists, setUserPlaylists, getLikedList, setLikedList, isLiked, getFollowedArtists, saveFollowedArtists } from "./app/playlists.js";
import { initPlayer } from "./app/player.js";
import { initUI } from "./app/ui.js";

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
    if (!playerContext.restorePlayerState()) {
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
        try {
            playerContext.updateVolumeSlider();
        } catch {}
    }
    
    // Initialize UI module
    const uiContext = initUI({ 
        signOut, 
        playlistContext, 
        playerContext 
    });
    
    // Set up additional UI functionality that requires all modules to be loaded
    setupAdditionalFeatures(playlistContext, playerContext, uiContext);
});

function setupAdditionalFeatures(playlistContext, playerContext, uiContext) {
    // Profile page playlist sync
    function syncProfilePlaylists() {
        try {
            const wrap = document.querySelector(".my-playlists");
            if (!wrap) return; // not on profile page
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
            // Helper: truncate display name to 40 chars with ellipsis
            function trunc40(s) {
                const t = String(s || "");
                return t.length > 40 ? t.slice(0, 37) + "..." : t;
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
                if (cover) {
                    cover.style.backgroundImage = `url('${
                        pl.cover ||
                        "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"
                    }')`;
                    cover.style.backgroundSize = "cover";
                    cover.style.backgroundPosition = "center";
                    cover.style.backgroundRepeat = "no-repeat";
                }
                const name = card.querySelector(".my-pl-name");
                if (name) name.textContent = trunc40(pl.name || "Playlist");
                const sub = card.querySelector(".my-pl-sub");
                if (sub)
                    sub.textContent = `${
                        Array.isArray(pl.tracks) ? pl.tracks.length : 0
                    } bài hát`;
                
                // Wire click to navigate
                card.onclick = () => {
                    try {
                        uiContext.go(`./playlist.html?id=${encodeURIComponent(pl.id)}`);
                    } catch {
                        window.location.href = `./playlist.html?id=${encodeURIComponent(
                            pl.id
                        )}`;
                    }
                };
            });
        } catch {}
    }
    
    // Run once on load and on changes
    syncProfilePlaylists();
    window.addEventListener("playlists:changed", syncProfilePlaylists);
    
    // Sidebar playlists rendering
    function renderSidebarPlaylists() {
        try {
            const container = document.querySelector(".pl-list");
            if (!container) return;
            const lists = getUserPlaylists();
            container.innerHTML = "";
            function trunc40(s) {
                const t = String(s || "");
                return t.length > 40 ? t.slice(0, 37) + "..." : t;
            }
            lists.forEach((pl) => {
                const row = document.createElement("div");
                row.className = "pl-item";
                row.dataset.plId = pl.id;
                row.innerHTML = `
                  <div class="pl-cover"></div>
                  <div class="pl-meta"><div class="pl-name">${trunc40(
                      pl.name || "Playlist"
                  )}</div><div class="pl-sub">Playlist • ${
                        pl.tracks?.length || 0
                    } songs</div></div>
                `;
                const cov = row.querySelector(".pl-cover");
                if (cov) {
                    cov.style.backgroundImage = `url('${
                        pl.cover ||
                        "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"
                    }')`;
                    cov.style.backgroundSize = "cover";
                    cov.style.backgroundPosition = "center";
                    cov.style.backgroundRepeat = "no-repeat";
                }
                row.addEventListener("click", () => {
                    try {
                        uiContext.go(`./playlist.html?id=${encodeURIComponent(pl.id)}`);
                    } catch {
                        window.location.href = `./playlist.html?id=${encodeURIComponent(
                            pl.id
                        )}`;
                    }
                });
                container.appendChild(row);
            });
        } catch {}
    }
    
    renderSidebarPlaylists();
    window.addEventListener("playlists:changed", renderSidebarPlaylists);
    
    // Like button functionality
    const likeBtn = document.getElementById("like");
    function updateLikeUI() {
        if (!likeBtn) return;
        const icon = likeBtn.querySelector("i");
        if (!icon) return;
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const cur = playlist[index] || {};
        const liked = isLiked(cur.id);
        icon.classList.toggle("fa-solid", !!liked);
        icon.classList.toggle("fa-regular", !liked);
        icon.classList.add("fa-heart");
        likeBtn.classList.toggle("active", !!liked);
    }
    
    function toggleLikeCurrent() {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const cur = playlist[index] || null;
        if (!cur) return;
        let list = getLikedList();
        const exists =
            cur.id && Array.isArray(list)
                ? list.findIndex((x) => x && x.id === cur.id)
                : -1;
        if (exists >= 0) {
            list.splice(exists, 1);
        } else {
            const durationEl = document.getElementById("duration");
            const item = {
                id: cur.id || cur.src || cur.title + "|" + cur.artist,
                title: cur.title || "—",
                artist: cur.artist || "—",
                cover: cur.cover || "",
                duration:
                    durationEl && durationEl.textContent
                        ? durationEl.textContent
                        : "--:--",
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
    
    if (likeBtn) {
        likeBtn.addEventListener("click", () => {
            toggleLikeCurrent();
        });
        // Sync UI when storage changes
        window.addEventListener("liked:changed", () => {
            updateLikeUI();
        });
        window.addEventListener("musicbox:trackchange", () => {
            updateLikeUI();
        });
        // Initialize icon state on first load
        updateLikeUI();
    }
    
    // Follow button functionality
    const bFollow = document.getElementById("b-follow");
    let isFollowing = false;
    
    function updateFollowUI(artistName) {
        if (!bFollow) return;
        const set = getFollowedArtists();
        const key = playlistContext.normArtist(artistName);
        isFollowing = !!(key && set.has(key));
        bFollow.classList.toggle("is-following", isFollowing);
        bFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
        bFollow.setAttribute("aria-pressed", String(isFollowing));
    }
    
    if (bFollow) {
        bFollow.addEventListener("click", () => {
            try {
                const playlist = getPlaylist();
                const index = playerContext.getCurrentIndex();
                const t = playlist[index] || {};
                const key = playlistContext.normArtist(t.artist || "");
                if (!key) return;
                const set = getFollowedArtists();
                if (set.has(key)) set.delete(key);
                else set.add(key);
                saveFollowedArtists(set);
                updateFollowUI(t.artist || "");
            } catch {}
        });
    }
    
    // Update follow UI when track changes
    window.addEventListener("musicbox:trackchange", () => {
        const playlist = getPlaylist();
        const index = playerContext.getCurrentIndex();
        const t = playlist[index] || {};
        updateFollowUI(t.artist);
    });
}
