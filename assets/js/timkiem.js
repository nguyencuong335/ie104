// Page-specific behavior for timkiem.html: render artist and songs by query

(function searchArtistAndRender() {
    function normalize(s) {
        return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    function getQuery() {
        try { return new URLSearchParams(location.search).get("q") || ""; } catch { return ""; }
    }

    async function getAllSongs() {
        try {
            if (window.MusicBox && typeof window.MusicBox.playlist === "function") {
                const pl = window.MusicBox.playlist();
                if (Array.isArray(pl) && pl.length) return pl;
            }
        } catch {}
        try {
            const res = await fetch("./assets/music_data/songs.json", { cache: "no-store" });
            const data = await res.json();
            if (Array.isArray(data)) return data;
        } catch {}
        return [];
    }

    function pickArtist(artists, qNorm) {
        const list = artists.map(name => ({ name, norm: normalize(name) }));
        if (!qNorm) return list[0]?.name || "";
        const exact = list.find(a => a.norm === qNorm);
        if (exact) return exact.name;
        const contains = list.find(a => a.norm.includes(qNorm) || qNorm.includes(a.norm));
        if (contains) return contains.name;
        return list[0]?.name || "";
    }

    function renderArtistHeader(artistName, artistImgUrl) {
        const card = document.querySelector(".top-result-card");
        const imgBox = card?.querySelector(".artist-image");
        const nameEl = card?.querySelector(".artist-name");
        if (imgBox) imgBox.style.backgroundImage = `url('${artistImgUrl || ""}')`;
        if (nameEl) nameEl.textContent = artistName || "—";
    }

    function mapToPlaylistIndex(track) {
        try {
            if (!window.MusicBox || typeof window.MusicBox.playlist !== "function") return -1;
            const list = window.MusicBox.playlist();
            const tNorm = normalize(track.title);
            const aNorm = normalize(track.artist);
            return list.findIndex(p => normalize(p.title) === tNorm && normalize(p.artist) === aNorm);
        } catch { return -1; }
    }

    function renderSongs(songs) {
        const grid = document.getElementById("top-songs-grid");
        if (!grid) return;
        grid.innerHTML = "";
        songs.forEach((t) => {
            const card = document.createElement("div");
            card.className = "song-item";
            card.innerHTML = `
                <div class="song-cover" style="background-image:url('${t.cover}'); background-size: cover; background-position: center;"></div>
                <div class="song-info">
                  <div class="song-name">${t.title}</div>
                  <div class="song-artist">${t.artist}</div>
                </div>
            `;
            card.addEventListener("click", () => {
                const idx = mapToPlaylistIndex(t);
                if (idx >= 0 && window.MusicBox && typeof window.MusicBox.playAt === "function") {
                    window.MusicBox.playAt(idx);
                }
            });
            grid.appendChild(card);
        });
    }

    async function start() {
        const rawQ = getQuery();
        const qNorm = normalize(rawQ);

        const input = document.querySelector('.search input[type="search"]');
        if (input) input.value = rawQ;

        const all = await getAllSongs();
        if (!all.length) return;
        const artistSet = Array.from(new Set(all.map(s => s.artist)));
        const pickedArtist = pickArtist(artistSet, qNorm);
        const artistSongs = all.filter(s => normalize(s.artist) === normalize(pickedArtist)).slice(0, 12);
        const artistImg = artistSongs[0]?.artistImg || artistSongs[0]?.cover || "";

        renderArtistHeader(pickedArtist, artistImg);
        renderSongs(artistSongs);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();

// Ẩn .main-content khi có .queue hiển thị trên trang fix bug
(function () {
    const SEARCH_SEL = ".timkiem-main";
    const QUEUE_SEL = ".queue";
    const HIDE_CLASS = "is-hidden";

    // Thêm CSS ẩn nếu chưa có
    (function ensureHideClass() {
        if (document.getElementById("hide-timkiem-style")) return;
        const style = document.createElement("style");
        style.id = "hide-timkiem-style";
        style.textContent = `.${HIDE_CLASS}{ display:none !important; }`;
        document.head.appendChild(style);
    })();

    // Helper: kiểm tra phần tử có "đang hiển thị" không
    function isVisible(el) {
        if (!el || el.hidden) return false;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    // Đồng bộ trạng thái ẩn/hiện
    function sync() {
        const searchEl = document.querySelector(SEARCH_SEL);
        if (!searchEl) return;
        const queues = Array.from(document.querySelectorAll(QUEUE_SEL));
        const anyQueueVisible = queues.some(isVisible);
        searchEl.classList.toggle(HIDE_CLASS, anyQueueVisible);
    }

    // Debounce nhẹ bằng rAF để tránh chạy quá dày
    let rafId = 0;
    const scheduleSync = () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
            rafId = 0;
            sync();
        });
    };

    // Bắt đầu: chạy 1 lần + theo dõi thay đổi DOM/thuộc tính
    function start() {
        sync();
        new MutationObserver(scheduleSync).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "hidden"],
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();
