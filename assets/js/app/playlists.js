// ===== PLAYLISTS MODULE =====

// Fallback playlist data
const fallbackPlaylist = [
    {
        title: "Muộn Rồi Mà Sao Còn",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/muon_roi_ma_sao_con.mp3",
        cover: "./assets/music_data/imgs_song/muon_roi_ma_sao_con.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Nơi Này Có Anh",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/noi_nay_co_anh.mp3",
        cover: "./assets/music_data/imgs_song/noi_nay_co_anh.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Chúng Ta Của Hiện Tại",
        artist: "Sơn Tùng M-TP",
        src: "./assets/music_data/songs/chung_ta_cua_hien_tai.mp3",
        cover: "./assets/music_data/imgs_song/chung_ta_cua_hien_tai.jpg",
        artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg",
    },
    {
        title: "Gái Độc Thân",
        artist: "Tlinh",
        src: "./assets/music_data/songs/gai_doc_than.mp3",
        cover: "./assets/music_data/imgs_song/gai_doc_than.jpg",
        artistImg: "./assets/music_data/imgs_casi/tlinh.jpg",
    },
];

// Global playlist state
let playlist = [];
let allSongs = [];
let currentPlaylistCtx = { type: "global", id: null };

// Load playlist from JSON
export async function loadPlaylistFromJSON() {
    try {
        const res = await fetch("./assets/music_data/songs.json", {
            cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch songs.json");
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0)
            throw new Error("songs.json invalid or empty");
        
        // Keep full catalog separate from current queue
        allSongs = data;
        
        // If we are on index.html, always default to full catalog
        const curFile = (
            location.pathname.split("/").pop() || ""
        ).toLowerCase();
        if (curFile === "index.html" || curFile === "") {
            currentPlaylistCtx = { type: "global", id: null };
            playlist.splice(0, playlist.length, ...allSongs);
        } else if (!rehydratePlaylistFromSavedContext()) {
            // Otherwise, default to full catalog
            currentPlaylistCtx = { type: "global", id: null };
            playlist.splice(0, playlist.length, ...allSongs);
        }
        
        console.assert(playlist.length >= 3, "Playlist phải có >= 3 bài");
        return { playlist, allSongs, currentPlaylistCtx };
    } catch (err) {
        console.error("Không thể tải playlist từ songs.json:", err);
        // Fallback to built-in playlist
        allSongs = fallbackPlaylist;
        const curFile2 = (
            location.pathname.split("/").pop() || ""
        ).toLowerCase();
        if (curFile2 === "index.html" || curFile2 === "") {
            currentPlaylistCtx = { type: "global", id: null };
            playlist.splice(0, playlist.length, ...allSongs);
        } else if (!rehydratePlaylistFromSavedContext()) {
            currentPlaylistCtx = { type: "global", id: null };
            playlist.splice(0, playlist.length, ...allSongs);
        }
        console.warn("Đang sử dụng fallback playlist nội bộ");
        return { playlist, allSongs, currentPlaylistCtx };
    }
}

function rehydratePlaylistFromSavedContext() {
    try {
        const s = getSavedPlayerState();
        if (!s || !s.playlistCtx) return false;
        if (
            s.playlistCtx.type === "user" &&
            Array.isArray(s.trackIds) &&
            s.trackIds.length
        ) {
            // Map ids to allSongs
            const map = new Map((allSongs || []).map((o) => [o.id, o]));
            const tracks = s.trackIds
                .map((id) => map.get(id))
                .filter(Boolean);
            if (tracks.length) {
                currentPlaylistCtx = {
                    type: "user",
                    id: s.playlistCtx.id || null,
                };
                playlist.splice(0, playlist.length, ...tracks);
                return true;
            }
        }
        return false;
    } catch {
        return false;
    }
}

function getSavedPlayerState() {
    try {
        const raw = localStorage.getItem("player_state_v1");
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object") return null;
        return obj;
    } catch {
        return null;
    }
}

// User playlists management
export function getUserPlaylists() {
    try {
        return JSON.parse(
            localStorage.getItem("user_playlists_v1") || "[]"
        );
    } catch {
        return [];
    }
}

export function setUserPlaylists(arr) {
    try {
        localStorage.setItem("user_playlists_v1", JSON.stringify(arr));
        try {
            window.dispatchEvent(new Event("playlists:changed"));
        } catch {}
    } catch {}
}

export function ensureDemoPlaylists() {
    const cur = getUserPlaylists();
    if (Array.isArray(cur) && cur.length) return;
    const demos = [
        {
            id: "pl_chill",
            name: "My Chill Mix",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg",
            tracks: [
                "son_tung_mtp/muon_roi_ma_sao_con",
                "son_tung_mtp/noi_nay_co_anh",
                "son_tung_mtp/chung_ta_cua_hien_tai",
                "tlinh/gai_doc_than",
            ],
        },
        {
            id: "pl_focus",
            name: "Suy tí thôi",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_2.jpg",
            tracks: [
                "han_sara/dem_cuu",
                "han_sara/do_anh_si",
                "han_sara/giong_nhu_em",
                "han_sara/xinh",
            ],
        },
        {
            id: "pl_study",
            name: "IELTS",
            cover: "./assets/imgs/danh_sach_da_tao/anh_playlist_3.jpg",
            tracks: [
                "truc_nhan/sang_mat_chua",
                "truc_nhan/made_in_vietnam",
                "truc_nhan/lon_roi_con_khoc_nhe",
            ],
        },
    ];
    setUserPlaylists(demos);
}

// Liked songs management
export function getLikedList() {
    try {
        const raw = localStorage.getItem("liked_songs");
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function setLikedList(list) {
    try {
        localStorage.setItem("liked_songs", JSON.stringify(list));
        try {
            window.dispatchEvent(new Event("liked:changed"));
        } catch {}
    } catch {}
}

export function isLiked(id) {
    if (!id) return false;
    const list = getLikedList();
    return Array.isArray(list) && list.some((x) => x && x.id === id);
}

// Followed artists management
function normArtist(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

export function getFollowedArtists() {
    try {
        const arr = JSON.parse(
            localStorage.getItem("followed_artists") || "[]"
        );
        return new Set(Array.isArray(arr) ? arr.map(normArtist) : []);
    } catch {
        return new Set();
    }
}

export function saveFollowedArtists(set) {
    try {
        localStorage.setItem(
            "followed_artists",
            JSON.stringify(Array.from(set))
        );
    } catch {}
}

// Queue rendering
export function renderQueue(queueListEl, onItemClick) {
    if (!queueListEl) return;
    
    queueListEl.innerHTML = "";
    playlist.forEach((t, i) => {
        const row = document.createElement("div");
        row.className = "q-item";
        row.setAttribute("data-index", i);
        row.innerHTML = `
            <div class="q-cover"><img src="${t.cover}" alt="${t.title}"></div>
            <div class="q-meta">
              <div class="q-title-text">${t.title}</div>
              <div class="q-artist">${t.artist}</div>
            </div>
            <div class="q-time" id="qtime-${i}">--:--</div>
        `;
        row.addEventListener("click", () => {
            if (onItemClick) onItemClick(i);
        });
        queueListEl.appendChild(row);

        // Prefetch duration
        const a = new Audio(t.src);
        a.addEventListener("loadedmetadata", () => {
            const el = document.getElementById(`qtime-${i}`);
            if (el) {
                const m = Math.floor(a.duration / 60);
                const ss = Math.floor(a.duration % 60).toString().padStart(2, "0");
                el.textContent = `${m}:${ss}`;
            }
        });
    });
}

export function updateQueueActive(index) {
    document
        .querySelectorAll(".q-item")
        .forEach((el) => el.classList.remove("current"));
    const active = document.querySelector(`.q-item[data-index="${index}"]`);
    if (active) active.classList.add("current");
}

// Set playlist function
export function setPlaylist(tracksArray, ctx) {
    try {
        if (!Array.isArray(tracksArray) || !tracksArray.length) return false;
        playlist.splice(0, playlist.length, ...tracksArray);
        currentPlaylistCtx =
            ctx && ctx.type ? ctx : { type: "global", id: null };
        return true;
    } catch {
        return false;
    }
}

// Getters for current state
export function getPlaylist() {
    return playlist.slice();
}

export function getAllSongs() {
    return allSongs.slice();
}

export function getCurrentPlaylistCtx() {
    return { ...currentPlaylistCtx };
}

// Playlist management helpers
export function createUserPlaylist({ name, cover }) {
    try {
        const lists = getUserPlaylists();
        
        // Generate unique ID
        function slugify(s) {
            return String(s || "")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "_")
                .replace(/[^a-z0-9_\-]/g, "");
        }
        
        let base = "pl_" + slugify(name || "new");
        let id = base || "pl_" + Date.now();
        let i = 1;
        const ids = new Set((lists || []).map((p) => p && p.id));
        while (ids.has(id)) {
            id = base + "_" + ++i;
        }
        
        const newPlaylist = {
            id,
            name: name || "Playlist mới",
            cover: cover || "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg",
            tracks: [],
        };
        
        lists.push(newPlaylist);
        setUserPlaylists(lists);
        return newPlaylist;
    } catch {
        return null;
    }
}

export function renameUserPlaylist(id, newName) {
    try {
        const lists = getUserPlaylists();
        const idx = lists.findIndex((x) => x && x.id === id);
        if (idx < 0) return false;
        
        lists[idx].name = newName;
        setUserPlaylists(lists);
        return true;
    } catch {
        return false;
    }
}

export function updateUserPlaylistCover(id, newCoverUrl) {
    try {
        const lists = getUserPlaylists();
        const idx = lists.findIndex((x) => x && x.id === id);
        if (idx < 0) return false;
        
        lists[idx].cover = newCoverUrl;
        setUserPlaylists(lists);
        return true;
    } catch {
        return false;
    }
}

export function deleteUserPlaylist(id) {
    try {
        const lists = getUserPlaylists();
        const idx = lists.findIndex((x) => x && x.id === id);
        if (idx < 0) return false;
        
        lists.splice(idx, 1);
        setUserPlaylists(lists);
        return true;
    } catch {
        return false;
    }
}

// Initialize playlists
export function initPlaylists() {
    ensureDemoPlaylists();
    
    return {
        loadPlaylistFromJSON,
        getUserPlaylists,
        setUserPlaylists,
        createUserPlaylist,
        renameUserPlaylist,
        updateUserPlaylistCover,
        deleteUserPlaylist,
        getLikedList,
        setLikedList,
        isLiked,
        getFollowedArtists,
        saveFollowedArtists,
        renderQueue,
        updateQueueActive,
        setPlaylist,
        getPlaylist,
        getAllSongs,
        getCurrentPlaylistCtx,
        normArtist
    };
}
