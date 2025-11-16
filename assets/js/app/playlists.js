// ===== PLAYLISTS MODULE =====

// ===== CONSTANTS =====
const STORAGE_KEYS = {
    PLAYER_STATE: "player_state_v1",
    USER_PLAYLISTS: "user_playlists_v1",
    LIKED_SONGS: "liked_songs",
    FOLLOWED_ARTISTS: "followed_artists",
};

const PLAYLIST_TYPES = {
    GLOBAL: "global",
    USER: "user",
};

const DEFAULT_PLAYLIST_COVER = "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg";
const SONGS_JSON_PATH = "./assets/music_data/songs.json";
const MIN_PLAYLIST_LENGTH = 3;

// ===== FALLBACK DATA =====
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

// ===== GLOBAL STATE =====
let playlist = [];
let allSongs = [];
let currentPlaylistCtx = { type: PLAYLIST_TYPES.GLOBAL, id: null };

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
 * Formats seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    if (!isFinite(seconds)) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${minutes}:${secs}`;
}

/**
 * Gets current filename from pathname
 * @returns {string} Current filename in lowercase
 */
function getCurrentFilename() {
    return (location.pathname.split("/").pop() || "").toLowerCase();
}

/**
 * Checks if current page is index/home page
 * @returns {boolean}
 */
function isIndexPage() {
    const filename = getCurrentFilename();
    return filename === "index.html" || filename === "";
}

/**
 * Sets playlist to global catalog
 */
function setGlobalPlaylist() {
    currentPlaylistCtx = { type: PLAYLIST_TYPES.GLOBAL, id: null };
    playlist.splice(0, playlist.length, ...allSongs);
}

// ===== PLAYLIST LOADING =====
/**
 * Initializes playlist from loaded songs
 */
function initializePlaylist() {
    if (isIndexPage()) {
        setGlobalPlaylist();
    } else if (!rehydratePlaylistFromSavedContext()) {
        setGlobalPlaylist();
    }
}

/**
 * Loads playlist from JSON file
 * @returns {Promise<Object>} Playlist data with playlist, allSongs, and currentPlaylistCtx
 */
export async function loadPlaylistFromJSON() {
    try {
        const response = await fetch(SONGS_JSON_PATH, {
            cache: "no-store",
        });
        
        if (!response.ok) {
            throw new Error("Failed to fetch songs.json");
        }
        
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("songs.json invalid or empty");
        }
        
        // Keep full catalog separate from current queue
        allSongs = data;
        initializePlaylist();
        
        console.assert(
            playlist.length >= MIN_PLAYLIST_LENGTH,
            "Playlist phải có >= 3 bài"
        );
        
        return { playlist, allSongs, currentPlaylistCtx };
    } catch (error) {
        console.error("Không thể tải playlist từ songs.json:", error);
        
        // Fallback to built-in playlist
        allSongs = fallbackPlaylist;
        initializePlaylist();
        
        console.warn("Đang sử dụng fallback playlist nội bộ");
        return { playlist, allSongs, currentPlaylistCtx };
    }
}

/**
 * Rehydrates playlist from saved player state
 * @returns {boolean} Success status
 */
function rehydratePlaylistFromSavedContext() {
    return safeExecute(() => {
        const savedState = getSavedPlayerState();
        if (!savedState?.playlistCtx) return false;
        
        if (
            savedState.playlistCtx.type === PLAYLIST_TYPES.USER &&
            Array.isArray(savedState.trackIds) &&
            savedState.trackIds.length > 0
        ) {
            // Map track IDs to actual track objects
            const trackMap = new Map(
                (allSongs || []).map((track) => [track.id, track])
            );
            const tracks = savedState.trackIds
                .map((id) => trackMap.get(id))
                .filter(Boolean);
            
            if (tracks.length > 0) {
                currentPlaylistCtx = {
                    type: PLAYLIST_TYPES.USER,
                    id: savedState.playlistCtx.id || null,
                };
                playlist.splice(0, playlist.length, ...tracks);
                return true;
            }
        }
        
        return false;
    }, "rehydratePlaylistFromSavedContext") ?? false;
}

/**
 * Gets saved player state from localStorage
 * @returns {Object|null} Saved state or null
 */
function getSavedPlayerState() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
        if (!raw) return null;
        
        const state = JSON.parse(raw);
        if (!state || typeof state !== "object") return null;
        
        return state;
    }, "getSavedPlayerState") ?? null;
}

// ===== USER PLAYLISTS MANAGEMENT =====
/**
 * Gets all user playlists from localStorage
 * @returns {Array} Array of user playlists
 */
export function getUserPlaylists() {
    return safeExecute(() => {
        return JSON.parse(
            localStorage.getItem(STORAGE_KEYS.USER_PLAYLISTS) || "[]"
        );
    }, "getUserPlaylists") ?? [];
}

/**
 * Saves user playlists to localStorage
 * @param {Array} playlists - Array of playlists to save
 */
export function setUserPlaylists(playlists) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.USER_PLAYLISTS,
            JSON.stringify(playlists)
        );
        safeExecute(() => {
            window.dispatchEvent(new Event("playlists:changed"));
        }, "setUserPlaylists:dispatchEvent");
    }, "setUserPlaylists");
}

/**
 * Ensures demo playlists exist for new users
 */
export function ensureDemoPlaylists() {
    const currentPlaylists = getUserPlaylists();
    if (Array.isArray(currentPlaylists) && currentPlaylists.length > 0) {
        return;
    }
    
    const demoPlaylists = [
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
    
    setUserPlaylists(demoPlaylists);
}

// ===== LIKED SONGS MANAGEMENT =====
/**
 * Gets liked songs list from localStorage
 * @returns {Array} Array of liked songs
 */
export function getLikedList() {
    return safeExecute(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.LIKED_SONGS);
        return raw ? JSON.parse(raw) : [];
    }, "getLikedList") ?? [];
}

/**
 * Saves liked songs list to localStorage
 * @param {Array} list - Array of liked songs
 */
export function setLikedList(list) {
    safeExecute(() => {
        localStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(list));
        safeExecute(() => {
            window.dispatchEvent(new Event("liked:changed"));
        }, "setLikedList:dispatchEvent");
    }, "setLikedList");
}

/**
 * Checks if a song is liked
 * @param {string} id - Song ID
 * @returns {boolean}
 */
export function isLiked(id) {
    if (!id) return false;
    const likedList = getLikedList();
    return Array.isArray(likedList) && likedList.some((song) => song?.id === id);
}

// ===== FOLLOWED ARTISTS MANAGEMENT =====
/**
 * Normalizes artist name for consistent comparison
 * @param {string} name - Artist name
 * @returns {string} Normalized artist name
 */
export function normArtist(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Gets followed artists from localStorage
 * @returns {Set} Set of normalized artist names
 */
export function getFollowedArtists() {
    return safeExecute(() => {
        const arr = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.FOLLOWED_ARTISTS) || "[]"
        );
        return new Set(Array.isArray(arr) ? arr.map(normArtist) : []);
    }, "getFollowedArtists") ?? new Set();
}

/**
 * Saves followed artists to localStorage
 * @param {Set} artistSet - Set of artist names
 */
export function saveFollowedArtists(artistSet) {
    safeExecute(() => {
        localStorage.setItem(
            STORAGE_KEYS.FOLLOWED_ARTISTS,
            JSON.stringify(Array.from(artistSet))
        );
    }, "saveFollowedArtists");
}

// ===== QUEUE RENDERING =====
/**
 * Loads and displays track duration
 * @param {string} src - Audio source URL
 * @param {string} timeElementId - ID of element to update
 */
function loadTrackDuration(src, timeElementId) {
    const audio = new Audio(src);
    audio.addEventListener("loadedmetadata", () => {
        const timeElement = document.getElementById(timeElementId);
        if (timeElement) {
            timeElement.textContent = formatTime(audio.duration);
        }
    });
}

/**
 * Renders the queue list
 * @param {HTMLElement} queueListEl - Container element for queue
 * @param {Function} onItemClick - Callback when queue item is clicked
 */
export function renderQueue(queueListEl, onItemClick) {
    if (!queueListEl) return;
    
    queueListEl.innerHTML = "";
    
    playlist.forEach((track, index) => {
        const row = document.createElement("div");
        row.className = "q-item";
        row.setAttribute("data-index", index);
        row.innerHTML = `
            <div class="q-cover"><img src="${track.cover}" alt="${track.title}"></div>
            <div class="q-meta">
                <div class="q-title-text">${track.title}</div>
                <div class="q-artist">${track.artist}</div>
            </div>
            <div class="q-time" id="qtime-${index}">--:--</div>
        `;
        
        row.addEventListener("click", () => {
            if (onItemClick) onItemClick(index);
        });
        
        queueListEl.appendChild(row);
        
        // Prefetch and display duration
        loadTrackDuration(track.src, `qtime-${index}`);
    });
}

/**
 * Updates active queue item styling
 * @param {number} index - Index of active track
 */
export function updateQueueActive(index) {
    document
        .querySelectorAll(".q-item")
        .forEach((element) => element.classList.remove("current"));
    
    const activeElement = document.querySelector(
        `.q-item[data-index="${index}"]`
    );
    if (activeElement) {
        activeElement.classList.add("current");
    }
}

// ===== PLAYLIST STATE MANAGEMENT =====
/**
 * Sets the current playlist
 * @param {Array} tracksArray - Array of track objects
 * @param {Object} context - Playlist context (type and id)
 * @returns {boolean} Success status
 */
export function setPlaylist(tracksArray, context) {
    return safeExecute(() => {
        if (!Array.isArray(tracksArray) || tracksArray.length === 0) {
            return false;
        }
        
        playlist.splice(0, playlist.length, ...tracksArray);
        currentPlaylistCtx = context?.type
            ? context
            : { type: PLAYLIST_TYPES.GLOBAL, id: null };
        
        return true;
    }, "setPlaylist") ?? false;
}

/**
 * Gets a copy of the current playlist
 * @returns {Array} Copy of playlist array
 */
export function getPlaylist() {
    return playlist.slice();
}

/**
 * Gets a copy of all songs catalog
 * @returns {Array} Copy of allSongs array
 */
export function getAllSongs() {
    return allSongs.slice();
}

/**
 * Gets current playlist context
 * @returns {Object} Copy of currentPlaylistCtx
 */
export function getCurrentPlaylistCtx() {
    return { ...currentPlaylistCtx };
}

// ===== USER PLAYLIST OPERATIONS =====
/**
 * Converts string to URL-friendly slug
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
 * Generates a unique playlist ID
 * @param {string} name - Playlist name
 * @param {Array} existingPlaylists - Existing playlists to check against
 * @returns {string} Unique playlist ID
 */
function generateUniquePlaylistId(name, existingPlaylists) {
    const base = "pl_" + slugify(name || "new");
    let id = base || `pl_${Date.now()}`;
    let counter = 1;
    
    const existingIds = new Set(
        (existingPlaylists || []).map((playlist) => playlist?.id).filter(Boolean)
    );
    
    while (existingIds.has(id)) {
        id = `${base}_${++counter}`;
    }
    
    return id;
}

/**
 * Finds playlist index by ID
 * @param {Array} playlists - Array of playlists
 * @param {string} id - Playlist ID
 * @returns {number} Index or -1 if not found
 */
function findPlaylistIndex(playlists, id) {
    return playlists.findIndex((playlist) => playlist?.id === id);
}

/**
 * Creates a new user playlist
 * @param {Object} options - Playlist options
 * @param {string} options.name - Playlist name
 * @param {string} options.cover - Cover image URL
 * @returns {Object|null} New playlist object or null on error
 */
export function createUserPlaylist({ name, cover }) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const id = generateUniquePlaylistId(name, playlists);
        
        const newPlaylist = {
            id,
            name: name || "Playlist mới",
            cover: cover || DEFAULT_PLAYLIST_COVER,
            tracks: [],
        };
        
        playlists.push(newPlaylist);
        setUserPlaylists(playlists);
        return newPlaylist;
    }, "createUserPlaylist") ?? null;
}

/**
 * Renames a user playlist
 * @param {string} id - Playlist ID
 * @param {string} newName - New playlist name
 * @returns {boolean} Success status
 */
export function renameUserPlaylist(id, newName) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists[index].name = newName;
        setUserPlaylists(playlists);
        return true;
    }, "renameUserPlaylist") ?? false;
}

/**
 * Updates playlist cover image
 * @param {string} id - Playlist ID
 * @param {string} newCoverUrl - New cover image URL
 * @returns {boolean} Success status
 */
export function updateUserPlaylistCover(id, newCoverUrl) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists[index].cover = newCoverUrl;
        setUserPlaylists(playlists);
        return true;
    }, "updateUserPlaylistCover") ?? false;
}

/**
 * Deletes a user playlist
 * @param {string} id - Playlist ID
 * @returns {boolean} Success status
 */
export function deleteUserPlaylist(id) {
    return safeExecute(() => {
        const playlists = getUserPlaylists();
        const index = findPlaylistIndex(playlists, id);
        
        if (index < 0) return false;
        
        playlists.splice(index, 1);
        setUserPlaylists(playlists);
        return true;
    }, "deleteUserPlaylist") ?? false;
}

// ===== INITIALIZATION =====
/**
 * Initializes the playlists module
 * @returns {Object} Playlist context with all exported functions
 */
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
        normArtist,
    };
}
