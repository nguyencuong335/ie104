// ===== SIDEBAR PLAYLISTS MODULE =====

export function setupSidebarPlaylists({ playlistContext, playerContext }) {
    const addBtn = document.querySelector(".menu .icon-btn.add");
    if (!addBtn) return;

    function slugify(s) {
        return String(s || "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_\-]/g, "");
    }

    // Toast helpers (reuse from add-to-playlist if needed)
    function ensureToastStyle() {
        try {
            if (document.getElementById("toast-style")) return;
            const s = document.createElement("style");
            s.id = "toast-style";
            s.textContent = `
                .toast-wrap{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
                .toast{min-width:240px;max-width:90vw;padding:10px 14px;border-radius:10px;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);transition:opacity .2s ease, transform .2s ease}
                .toast.show{opacity:1;transform:translateY(0)}
                .toast.success{background:#1f8b4c}
                .toast.error{background:#a23b3b}
            `;
            document.head.appendChild(s);
        } catch {}
    }

    function getToastWrap() {
        let w = document.querySelector(".toast-wrap");
        if (!w) {
            w = document.createElement("div");
            w.className = "toast-wrap";
            document.body.appendChild(w);
        }
        return w;
    }

    function showToast(msg, type) {
        try {
            const w = getToastWrap();
            const el = document.createElement("div");
            el.className = "toast " + (type === "error" ? "error" : "success");
            el.textContent = String(msg || "");
            w.appendChild(el);
            requestAnimationFrame(() => el.classList.add("show"));
            setTimeout(() => {
                try {
                    el.classList.remove("show");
                    setTimeout(() => el.remove(), 200);
                } catch {}
            }, 1800);
        } catch {}
    }

    // Initialize toast styles
    ensureToastStyle();

    const MAX_USER_PLAYLISTS = 5;

    addBtn.addEventListener("click", () => {
        try {
            const lists = playlistContext.getUserPlaylists();
            if (Array.isArray(lists) && lists.length >= MAX_USER_PLAYLISTS) {
                try {
                    showToast(
                        `Bạn chỉ có thể tạo tối đa ${MAX_USER_PLAYLISTS} playlist`,
                        "error"
                    );
                } catch {}
                return;
            }

            let name = window.prompt("Tên playlist mới", "Playlist mới");
            if (name == null) return;
            name = name.trim().replace(/\s+/g, " ");
            if (!name) return;
            if (name.length > 40) {
                try {
                    showToast("Tên tối đa 40 ký tự", "error");
                } catch {}
                return;
            }

            let base = "pl_" + slugify(name || "new");
            let id = base || "pl_" + Date.now();
            let i = 1;
            const ids = new Set((lists || []).map((p) => p && p.id));
            while (ids.has(id)) {
                id = base + "_" + ++i;
            }

            // Ask for cover via file picker (optional)
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.style.display = "none";
            document.body.appendChild(input);
            const fallbackCover = "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg";

            const finalize = (cover) => {
                if (Array.isArray(lists) && lists.length >= MAX_USER_PLAYLISTS) {
                    try {
                        showToast(
                            `Bạn chỉ có thể tạo tối đa ${MAX_USER_PLAYLISTS} playlist`,
                            "error"
                        );
                    } catch {}
                    try {
                        input.remove();
                    } catch {}
                    return;
                }

                const newPlaylist = playlistContext.createUserPlaylist({
                    name,
                    cover: cover || fallbackCover,
                });

                if (newPlaylist) {
                    showToast("Tạo thành công", "success");
                    // Trigger refresh of sidebar and profile playlists
                    window.dispatchEvent(new CustomEvent("playlists:changed"));
                }

                try {
                    input.remove();
                } catch {}
            };

            input.addEventListener(
                "change",
                () => {
                    const file = input.files && input.files[0];
                    if (!file) {
                        finalize(null);
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl =
                            typeof reader.result === "string"
                                ? reader.result
                                : null;
                        finalize(dataUrl);
                    };
                    reader.onerror = () => finalize(null);
                    reader.readAsDataURL(file);
                },
                { once: true }
            );

            // Open picker; if user cancels, still create with fallback after a short delay
            input.click();
            setTimeout(() => {
                try {
                    if (!input.files || !input.files.length) finalize(null);
                } catch {}
            }, 600);
        } catch {}
    });

    // Render sidebar playlists
    function renderSidebarPlaylists() {
        try {
            const container = document.querySelector(".pl-list");
            if (!container) return;
            const lists = playlistContext.getUserPlaylists();
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
                    <div class="pl-meta">
                        <div class="pl-name">${trunc40(pl.name || "Playlist")}</div>
                        <div class="pl-sub">Playlist • ${pl.tracks?.length || 0} songs</div>
                    </div>
                `;
                const cov = row.querySelector(".pl-cover");
                if (cov) {
                    cov.style.backgroundImage = `url('${
                        pl.cover || "./assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg"
                    }')`;
                    cov.style.backgroundSize = "cover";
                    cov.style.backgroundPosition = "center";
                    cov.style.backgroundRepeat = "no-repeat";
                }
                row.addEventListener("click", () => {
                    try {
                        const go = window.__mbGo || ((url) => { window.location.href = url; });
                        go(`./playlist.html?id=${encodeURIComponent(pl.id)}`);
                    } catch {
                        window.location.href = `./playlist.html?id=${encodeURIComponent(pl.id)}`;
                    }
                });
                container.appendChild(row);
            });
        } catch {}
    }

    // Initial render
    renderSidebarPlaylists();

    // Listen for playlist changes
    window.addEventListener("playlists:changed", renderSidebarPlaylists);
}
