// ===== LIVE SEARCH DROPDOWN MODULE =====

// ===== CONSTANTS =====
const CONFIG = {
    SONGS_JSON_PATH: "./assets/music_data/songs.json",
    SEARCH_DEBOUNCE_MS: 180,
    BLUR_HIDE_DELAY_MS: 150,
    MAX_RESULTS: 8,
    COMPACT_BREAKPOINT: 340,
    MIN_PANEL_WIDTH: 260,
    DESIRED_MIN_WIDTH: 320,
    VIEWPORT_MARGIN: 8,
    PANEL_GAP: 6,
    MAX_Z_INDEX: "2147483647",
    PANEL_ID: "mb-search-panel",
    SEARCH_INPUT_ID: "search-input",
    SEARCH_WRAP_SELECTOR: ".search",
};

const STYLES = {
    COLORS: {
        PRIMARY: "#111827",
        SECONDARY: "#6b7280",
        HOVER_BG: "#E0F2FE",
        HOVER_TEXT: "#135E88",
        PLACEHOLDER: "#9ca3af",
        COVER_BG: "#e5e7eb",
        PANEL_BG: "#ffffff",
        PANEL_BORDER: "rgba(0,0,0,.08)",
    },
    SIZES: {
        COMPACT: { gap: 8, padding: 8, cover: 32, fontSize: 11 },
        NORMAL: { gap: 10, padding: 10, cover: 36, fontSize: 12 },
    },
};

// ===== UTILITY FUNCTIONS =====
function normalizeText(text) {
    const str = String(text || "").trim();
    if (!str) return "";
    
    try {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    } catch {
        return str.toLowerCase();
    }
}

function getViewportWidth() {
    return Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0
    );
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

async function fetchSongsData() {
    const response = await fetch(CONFIG.SONGS_JSON_PATH, {
        cache: "no-store",
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

// ===== DATA MANAGEMENT =====
class SongsCache {
    constructor() {
        this.cache = null;
        this.loading = false;
        this.hasError = false;
    }

    async load() {
        if (this.cache || this.loading) {
            return this.cache || [];
        }

        this.loading = true;
        try {
            const data = await fetchSongsData();
            this.cache = Array.isArray(data) ? data : [];
            this.hasError = false;
        } catch (error) {
            console.error("Failed to load songs:", error);
            this.hasError = true;
            this.cache = [];
        } finally {
            this.loading = false;
        }

        return this.cache;
    }

    async reload() {
        this.cache = null;
        this.hasError = false;
        return this.load();
    }
}

// ===== PANEL MANAGEMENT =====
class SearchPanel {
    constructor(searchWrap) {
        this.panel = this.createPanel(searchWrap);
        this.searchWrap = searchWrap;
    }

    createPanel(searchWrap) {
        const panel = document.createElement("div");
        panel.id = CONFIG.PANEL_ID;

        Object.assign(panel.style, {
            position: "fixed",
            top: "0px",
            left: "0px",
            background: STYLES.COLORS.PANEL_BG,
            border: `1px solid ${STYLES.COLORS.PANEL_BORDER}`,
            zIndex: CONFIG.MAX_Z_INDEX,
            display: "none",
            maxHeight: "60vh",
            overflow: "auto",
            borderRadius: "12px",
            boxShadow: "0 12px 28px rgba(0,0,0,.18)",
        });

        try {
            document.body.appendChild(panel);
        } catch {
            searchWrap.appendChild(panel);
        }

        return panel;
    }

    calculatePosition() {
        const anchor =
            this.searchWrap?.querySelector('input[type="search"]') ||
            this.searchWrap;
        
        if (!anchor) {
            return this.getDefaultPosition();
        }

        const rect = anchor.getBoundingClientRect();
        const viewportWidth = getViewportWidth();

        const desiredWidth = Math.max(rect.width, CONFIG.DESIRED_MIN_WIDTH);
        const maxWidth = viewportWidth - CONFIG.VIEWPORT_MARGIN * 2;
        const width = Math.min(
            Math.max(desiredWidth, CONFIG.MIN_PANEL_WIDTH),
            maxWidth
        );

        // Center panel relative to search input
        const centeredLeft = rect.left + (rect.width - width) / 2;
        const left = Math.round(
            Math.max(
                CONFIG.VIEWPORT_MARGIN,
                Math.min(
                    centeredLeft,
                    viewportWidth - width - CONFIG.VIEWPORT_MARGIN
                )
            )
        );

        const top = Math.round(rect.bottom + CONFIG.PANEL_GAP);

        return {
            left,
            top,
            width: Math.round(width),
            maxWidth,
            isCompact: width < CONFIG.COMPACT_BREAKPOINT,
        };
    }

    getDefaultPosition() {
        return {
            left: 0,
            top: 0,
            width: CONFIG.MIN_PANEL_WIDTH,
            maxWidth: CONFIG.MIN_PANEL_WIDTH,
            isCompact: true,
        };
    }

    updatePosition() {
        const position = this.calculatePosition();

        this.panel.style.left = `${position.left}px`;
        this.panel.style.top = `${position.top}px`;
        this.panel.style.width = `${position.width}px`;
        this.panel.style.maxWidth = `${position.maxWidth}px`;
        this.panel.style.minWidth = `${CONFIG.MIN_PANEL_WIDTH}px`;
    }

    show() {
        this.panel.style.display = "block";
        this.updatePosition();
    }

    hide() {
        this.panel.style.display = "none";
    }

    isVisible() {
        return this.panel.style.display === "block";
    }

    render(items, query) {
        const hasQuery = Boolean(query);
        const hasResults = Array.isArray(items) && items.length > 0;

        if (!hasQuery || !hasResults) {
            this.panel.innerHTML = hasQuery
                ? `<div style="padding:10px 12px;color:${STYLES.COLORS.PLACEHOLDER}">Không tìm thấy "${escapeHtml(query)}".</div>`
                : "";

            hasQuery ? this.show() : this.hide();
            return;
        }

        const { isCompact } = this.calculatePosition();
        this.panel.innerHTML = items
            .map((song) => this.createResultItemHTML(song, isCompact))
            .join("");

        this.setupItemEvents();
        this.show();
    }

    createResultItemHTML(song, isCompact) {
        const sizes = isCompact ? STYLES.SIZES.COMPACT : STYLES.SIZES.NORMAL;
        const { gap, padding, cover: coverSize, fontSize } = sizes;
        const coverUrl = escapeHtml(song.cover || "");
        const songId = escapeHtml(song.id || "");
        const title = escapeHtml(song.title || "—");
        const artist = escapeHtml(song.artist || "—");

        return `
            <div class="sr-item" data-id="${songId}" 
                 style="display:flex;align-items:center;gap:${gap}px;padding:${padding}px 12px;cursor:pointer;border-radius:10px">
                <div class="sr-cover" 
                     style="width:${coverSize}px;height:${coverSize}px;border-radius:6px;background:${STYLES.COLORS.COVER_BG};background-image:url('${coverUrl}');background-size:cover;background-position:center"></div>
                <div class="sr-meta" style="display:flex;flex-direction:column;min-width:0">
                    <div class="sr-title" style="color:${STYLES.COLORS.PRIMARY};font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
                    <div class="sr-artist" style="color:${STYLES.COLORS.SECONDARY};font-size:${fontSize}px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${artist}</div>
                </div>
                <div class="sr-type" style="margin-left:auto;color:${STYLES.COLORS.SECONDARY};font-size:${fontSize}px">Bài hát</div>
            </div>
        `;
    }

    setupItemEvents() {
        this.panel.querySelectorAll(".sr-item").forEach((item) => {
            this.setupHoverEffects(item);
            this.setupClickHandler(item);
        });
    }

    setupHoverEffects(item) {
        const elements = {
            title: item.querySelector(".sr-title"),
            artist: item.querySelector(".sr-artist"),
            type: item.querySelector(".sr-type"),
        };

        const applyHoverStyles = (isHover) => {
            item.style.background = isHover ? STYLES.COLORS.HOVER_BG : "transparent";
            const textColor = isHover ? STYLES.COLORS.HOVER_TEXT : null;
            
            if (elements.title) {
                elements.title.style.color = textColor || STYLES.COLORS.PRIMARY;
            }
            if (elements.artist) {
                elements.artist.style.color = textColor || STYLES.COLORS.SECONDARY;
            }
            if (elements.type) {
                elements.type.style.color = textColor || STYLES.COLORS.SECONDARY;
            }
        };

        item.addEventListener("mouseenter", () => applyHoverStyles(true));
        item.addEventListener("mouseleave", () => applyHoverStyles(false));
    }

    setupClickHandler(item) {
        item.addEventListener("click", async () => {
            try {
                const trackId = item.getAttribute("data-id");
                if (!trackId || !window.MusicBox) return;

                const { playAt, playlist, setPlaylist } = window.MusicBox;
                if (typeof playAt !== "function" || typeof playlist !== "function") {
                    return;
                }

                let currentPlaylist = playlist();
                let trackIndex = Array.isArray(currentPlaylist)
                    ? currentPlaylist.findIndex((track) => track?.id === trackId)
                    : -1;

                // Load full catalog if track not in current playlist
                if (trackIndex < 0 && typeof setPlaylist === "function") {
                    await this.loadFullCatalog();
                    currentPlaylist = playlist();
                    trackIndex = currentPlaylist.findIndex(
                        (track) => track?.id === trackId
                    );
                }

                if (trackIndex >= 0) {
                    playAt(trackIndex);
                    this.hide();
                }
            } catch (error) {
                console.error("Error handling item click:", error);
            }
        });
    }

    async loadFullCatalog() {
        try {
            const data = await fetchSongsData();
            if (Array.isArray(data) && data.length > 0 && window.MusicBox?.setPlaylist) {
                window.MusicBox.setPlaylist(data, {
                    type: "global",
                    id: null,
                });
            }
        } catch (error) {
            console.error("Failed to load full catalog:", error);
        }
    }
}

// ===== SEARCH FUNCTIONALITY =====
class SearchEngine {
    constructor(songsCache) {
        this.songsCache = songsCache;
    }

    async search(query) {
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return [];

        const songs = await this.songsCache.load();
        if (!Array.isArray(songs) || songs.length === 0) return [];

        // Prioritize title matches, then artist matches
        const titleMatches = songs.filter((song) => {
            const normalizedTitle = normalizeText(song.title);
            return normalizedTitle.includes(normalizedQuery);
        });

        const artistMatches = songs.filter((song) => {
            const normalizedArtist = normalizeText(song.artist);
            const normalizedTitle = normalizeText(song.title);
            return (
                normalizedArtist.includes(normalizedQuery) &&
                !normalizedTitle.includes(normalizedQuery)
            );
        });

        return [...titleMatches, ...artistMatches].slice(0, CONFIG.MAX_RESULTS);
    }
}

// ===== EVENT MANAGER =====
class EventManager {
    constructor(input, panel, searchEngine, searchWrap) {
        this.input = input;
        this.panel = panel;
        this.searchEngine = searchEngine;
        this.searchWrap = searchWrap;
        this.searchTimer = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupInputEvents();
        this.setupDocumentEvents();
        this.setupWindowEvents();
    }

    setupInputEvents() {
        // Debounced search
        this.input.addEventListener("input", () => {
            if (this.searchTimer) {
                clearTimeout(this.searchTimer);
            }
            this.searchTimer = setTimeout(() => {
                this.performSearch();
            }, CONFIG.SEARCH_DEBOUNCE_MS);
        });

        // Keyboard navigation
        this.input.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.panel.hide();
                this.input.blur();
            }
        });

        // Focus/blur handling
        this.input.addEventListener("focus", () => {
            if (this.panel.isVisible()) {
                this.panel.updatePosition();
            }
        });

        this.input.addEventListener("blur", () => {
            setTimeout(() => this.panel.hide(), CONFIG.BLUR_HIDE_DELAY_MS);
        });
    }

    setupDocumentEvents() {
        // Click outside to close
        document.addEventListener("click", (event) => {
            const clickedInsideSearch = this.searchWrap?.contains(event.target);
            const clickedInsidePanel = this.panel.panel?.contains(event.target);
            
            if (!clickedInsideSearch && !clickedInsidePanel) {
                this.panel.hide();
            }
        });
    }

    setupWindowEvents() {
        // Reposition on scroll/resize
        const repositionHandler = () => {
            if (this.panel.isVisible()) {
                this.panel.updatePosition();
            }
        };

        window.addEventListener("scroll", repositionHandler, { passive: true });
        window.addEventListener("resize", repositionHandler);
    }

    async performSearch() {
        const query = this.input.value || "";
        const results = await this.searchEngine.search(query);
        this.panel.render(results, query);
    }
}

// ===== MAIN SETUP FUNCTION =====
export function setupGlobalLiveSearch({ playerContext }) {
    const searchWrap = document.querySelector(CONFIG.SEARCH_WRAP_SELECTOR);
    if (!searchWrap) return;

    const input =
        document.getElementById(CONFIG.SEARCH_INPUT_ID) ||
        searchWrap.querySelector('input[type="search"]');
    if (!input) return;

    // Skip if panel already exists
    if (document.getElementById(CONFIG.PANEL_ID)) {
        return;
    }

    // Initialize components
    const songsCache = new SongsCache();
    const panel = new SearchPanel(searchWrap);
    const searchEngine = new SearchEngine(songsCache);
    const eventManager = new EventManager(input, panel, searchEngine, searchWrap);
}
