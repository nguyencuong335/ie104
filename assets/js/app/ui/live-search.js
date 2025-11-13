// ===== LIVE SEARCH DROPDOWN MODULE =====

export function setupGlobalLiveSearch({ playerContext }) {
    const wrap = document.querySelector(".search");
    const input =
        wrap &&
        (document.getElementById("search-input") ||
            wrap.querySelector('input[type="search"]'));
    if (!wrap || !input) return;
    
    // If index.js already added a panel, skip
    if (
        document.getElementById("mb-search-panel") ||
        document.querySelector(".search-results-panel")
    )
        return;

    function normalize2(s) {
        try {
            return String(s || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
        } catch {
            return String(s || "")
                .toLowerCase()
                .trim();
        }
    }

    let SONGS_CACHE = null;
    let LOADING = false;
    let LOAD_ERR = false;
    async function loadSongs() {
        if (SONGS_CACHE || LOADING || LOAD_ERR) return SONGS_CACHE || [];
        LOADING = true;
        try {
            const res = await fetch("./assets/music_data/songs.json", {
                cache: "no-store",
            });
            const data = await res.json();
            SONGS_CACHE = Array.isArray(data) ? data : [];
        } catch {
            LOAD_ERR = true;
            SONGS_CACHE = [];
        } finally {
            LOADING = false;
        }
        return SONGS_CACHE;
    }

    const panel = document.createElement("div");
    panel.id = "mb-search-panel";
    Object.assign(panel.style, {
        position: "fixed",
        top: "0px",
        left: "0px",
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,.08)",
        zIndex: "2147483647",
        display: "none",
        maxHeight: "60vh",
        overflow: "auto",
        borderRadius: "12px",
        boxShadow: "0 12px 28px rgba(0,0,0,.18)",
    });
    try {
        document.body.appendChild(panel);
    } catch {
        wrap.appendChild(panel);
    }

    const hide = () => (panel.style.display = "none");
    const show = () => (panel.style.display = "block");
    function pos() {
        try {
            const anchor =
                wrap.querySelector('input[type="search"]') || wrap;
            const r = anchor.getBoundingClientRect();
            const vw = Math.max(
                document.documentElement.clientWidth || 0,
                window.innerWidth || 0
            );
            const margin = 8; // viewport side margins
            const minW = 260;
            let desired = Math.max(r.width, 320);
            let width = Math.min(Math.max(desired, minW), vw - margin * 2);
            // Clamp left so panel stays in viewport
            let left = Math.round(
                Math.max(margin, Math.min(r.left, vw - width - margin))
            );
            const gap = 6; // small gap below input
            const top = Math.round(r.bottom + gap);
            panel.style.left = left + "px";
            panel.style.top = top + "px";
            panel.style.width = Math.round(width) + "px";
            panel.style.maxWidth = vw - margin * 2 + "px";
            panel.style.minWidth = minW + "px";
        } catch {}
    }

    function render(items, q) {
        if (!q || !items.length) {
            panel.innerHTML = q
                ? `<div style="padding:10px 12px;color:#9ca3af">Không tìm thấy "${q}".</div>`
                : "";
            if (q) {
                pos();
                show();
            } else hide();
            return;
        }
        // Estimate width to choose compact layout on small screens
        const anchor = wrap.querySelector('input[type="search"]') || wrap;
        const r = anchor.getBoundingClientRect();
        const vw = Math.max(
            document.documentElement.clientWidth || 0,
            window.innerWidth || 0
        );
        const margin = 8;
        const minW = 260;
        let desired = Math.max(r.width, 320);
        const widthEst = Math.min(Math.max(desired, minW), vw - margin * 2);
        const compact = widthEst < 340;

        panel.innerHTML = items
            .map(
                (s) => `
        <div class="sr-item" data-id="${
            s.id
        }" style="display:flex;align-items:center;gap:${
                    compact ? "8" : "10"
                }px;padding:${
                    compact ? "8" : "10"
                }px 12px;cursor:pointer;border-radius:10px">
          <div class="sr-cover" style="width:${
              compact ? "32" : "36"
          }px;height:${
                    compact ? "32" : "36"
                }px;border-radius:6px;background:#e5e7eb;background-image:url('${
                    s.cover || ""
                }');background-size:cover;background-position:center"></div>
          <div class="sr-meta" style="display:flex;flex-direction:column;min-width:0">
            <div class="sr-title" style="color:#111827;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${
                s.title || "—"
            }</div>
            <div class="sr-artist" style="color:#6b7280;font-size:${
                compact ? "11" : "12"
            }px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${
                    s.artist || "—"
                }</div>
          </div>
          <div class="sr-type" style="margin-left:auto;color:#6b7280;font-size:${
              compact ? "11" : "12"
          }px">Bài hát</div>
        </div>
      `
            )
            .join("");
        panel.querySelectorAll(".sr-item").forEach((el) => {
            const t = el.querySelector(".sr-title");
            const a = el.querySelector(".sr-artist");
            const ty = el.querySelector(".sr-type");
            el.addEventListener("mouseenter", () => {
                el.style.background = "#E0F2FE";
                if (t) t.style.color = "#135E88";
                if (a) a.style.color = "#135E88";
                if (ty) ty.style.color = "#135E88";
            });
            el.addEventListener("mouseleave", () => {
                el.style.background = "transparent";
                if (t) t.style.color = "#111827";
                if (a) a.style.color = "#6b7280";
                if (ty) ty.style.color = "#6b7280";
            });
            el.addEventListener("click", async () => {
                try {
                    const id = el.getAttribute("data-id");
                    if (!id || !window.MusicBox) return;
                    const hasPlayAt =
                        typeof window.MusicBox.playAt === "function";
                    const hasPlaylist =
                        typeof window.MusicBox.playlist === "function";
                    const hasSetPlaylist =
                        typeof window.MusicBox.setPlaylist === "function";
                    if (!hasPlayAt || !hasPlaylist) return;
                    let pl = window.MusicBox.playlist();
                    let idx = Array.isArray(pl)
                        ? pl.findIndex((x) => x && x.id === id)
                        : -1;
                    if (idx < 0 && hasSetPlaylist) {
                        try {
                            const res = await fetch(
                                "./assets/music_data/songs.json",
                                { cache: "no-store" }
                            );
                            const data = await res.json();
                            if (Array.isArray(data) && data.length) {
                                window.MusicBox.setPlaylist(data, {
                                    type: "global",
                                    id: null,
                                });
                                pl = window.MusicBox.playlist();
                                idx = pl.findIndex((x) => x && x.id === id);
                            }
                        } catch {}
                    }
                    if (idx >= 0) {
                        window.MusicBox.playAt(idx);
                        hide();
                    }
                } catch {}
            });
        });
        pos();
        show();
    }

    let timer = 0;
    input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const q = input.value || "";
            const nq = normalize2(q);
            if (!nq) {
                hide();
                panel.innerHTML = "";
                return;
            }
            const list = await loadSongs();
            const results = list
                .filter(
                    (s) =>
                        normalize2(s.title).includes(nq) ||
                        normalize2(s.artist).includes(nq)
                )
                .slice(0, 8);
            render(results, q);
        }, 180);
    });

    document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target) && !panel.contains(e.target)) hide();
    });
    input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            hide();
            input.blur();
        }
    });
    input.addEventListener("blur", () => {
        setTimeout(hide, 150);
    });
    input.addEventListener("focus", () => {
        if (panel.style.display === "block") pos();
    });
    window.addEventListener(
        "scroll",
        () => {
            if (panel.style.display === "block") pos();
        },
        { passive: true }
    );
    window.addEventListener("resize", () => {
        if (panel.style.display === "block") pos();
    });
}
