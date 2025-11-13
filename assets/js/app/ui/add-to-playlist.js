// ===== ADD TO PLAYLIST MODULE =====

export function setupAddToPlaylist({ playerContext, playlistContext }) {
    const btn = document.getElementById("add-to-playlist");
    if (!btn) return;

    // Ensure minimal styles for modal
    function ensurePickerStyle() {
        try {
            if (document.getElementById("pl-picker-style")) return;
            const s = document.createElement("style");
            s.id = "pl-picker-style";
            s.textContent = `
                .pl-picker-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999}
                .pl-picker{background:#F8FAFC;color:#135E88;min-width:360px;max-width:520px;width:92vw;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.15);overflow:hidden;border:1px solid #e5e7eb}
                .pl-picker .hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:16px;color:#135E88}
                .pl-picker .list{max-height:60vh;overflow:auto}
                .pl-picker .row{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:12px 16px;cursor:pointer}
                .pl-picker .row:hover{background:#E0F2FE}
                .pl-picker .row .cover{width:44px;height:44px;border-radius:8px;background-size:cover;background-position:center}
                .pl-picker .row .name{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:15px}
                .pl-picker .row .count{opacity:.85;min-width:48px;text-align:right}
                .pl-picker .btn{background:#ffffff;color:#135E88;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1;box-sizing:border-box;white-space:nowrap}
                .pl-picker .hd .close-btn{background:transparent;border:none;padding:0;color:#135E88;cursor:pointer;border-radius:0}
                .pl-picker .hd .close-btn:hover{color:#0b4c6c;text-decoration:underline;background:transparent;border-color:transparent}
                .pl-picker .hd .close-btn:focus{outline:none;text-decoration:underline}
                .pl-picker .btn:hover{background:#E0F2FE;color:#135E88}
                .pl-picker .row.is-exist{opacity:.6;cursor:not-allowed}
                .pl-picker .row .tag{font-size:12px;opacity:.9;background:#E0F2FE;color:#135E88;padding:2px 6px;border-radius:999px;border:1px solid #bae6fd}
                @media (max-width: 420px){ .pl-picker{min-width:300px} .pl-picker .row{grid-template-columns:auto 1fr auto} }
            `;
            document.head.appendChild(s);
        } catch {}
    }

    // Toast styles & helpers
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
            el.className =
                "toast " + (type === "error" ? "error" : "success");
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

    function closePicker(ov) {
        try {
            if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
        } catch {}
    }

    function openPicker(trackId) {
        if (!trackId) return;
        const lists = playlistContext.getUserPlaylists();
        if (!Array.isArray(lists) || !lists.length) return;
        const ov = document.createElement("div");
        ov.className = "pl-picker-overlay";
        ov.innerHTML = `
            <div class="pl-picker" role="dialog" aria-modal="true" aria-label="Chọn playlist">
                <div class="hd"><span>Chọn playlist</span><button class="btn close-btn" data-act="close" aria-label="Đóng">Đóng</button></div>
                <div class="list"></div>
            </div>
        `;
        const listEl = ov.querySelector(".list");
        lists.forEach((pl) => {
            const row = document.createElement("div");
            row.className = "row";
            row.setAttribute("data-pl-id", pl.id);
            const has =
                Array.isArray(pl.tracks) && pl.tracks.includes(trackId);
            row.innerHTML = `
                <div class="cover" style="background-image:url('${(
                    pl.cover || ""
                ).replace(/"/g, "&quot;")}')"></div>
                <div class="name">${pl.name || "Playlist"}</div>
                <div class="count">${
                    Array.isArray(pl.tracks) ? pl.tracks.length : 0
                } bài</div>
                ${
                    has
                        ? '<span class="tag" style="margin-right:4px;">Đã có</span>'
                        : ""
                }
            `;
            if (has) row.classList.add("is-exist");
            listEl.appendChild(row);
        });
        document.body.appendChild(ov);

        const onSelect = (plId) => {
            try {
                const arr = playlistContext.getUserPlaylists();
                const idx = arr.findIndex((x) => x && x.id === plId);
                if (idx < 0) {
                    closePicker(ov);
                    return;
                }
                const target = arr[idx];
                if (!Array.isArray(target.tracks)) target.tracks = [];
                if (!target.tracks.includes(trackId))
                    target.tracks.push(trackId);
                playlistContext.setUserPlaylists(arr);
                showToast(
                    "Đã thêm vào " + (target.name || "playlist"),
                    "success"
                );
            } catch {
                showToast("Không thể thêm vào playlist", "error");
            }
            closePicker(ov);
        };

        // Wire events
        ov.addEventListener("click", (e) => {
            const t = e.target;
            if (t instanceof Element) {
                if (t.classList.contains("pl-picker-overlay")) {
                    closePicker(ov);
                    return;
                }
                const act = t.getAttribute("data-act");
                if (act === "close") {
                    closePicker(ov);
                    return;
                }
                const row = t.closest(".row");
                if (row && row.classList.contains("is-exist")) {
                    return;
                }
                if (row && row.getAttribute("data-pl-id")) {
                    onSelect(row.getAttribute("data-pl-id"));
                }
            }
        });
        const onKey = (ev) => {
            if (ev.key === "Escape") {
                ev.preventDefault();
                closePicker(ov);
                window.removeEventListener("keydown", onKey, true);
            }
        };
        window.addEventListener("keydown", onKey, true);
    }

    // Initialize styles
    ensurePickerStyle();
    ensureToastStyle();

    btn.addEventListener("click", () => {
        try {
            const playlist = playlistContext.getPlaylist();
            const index = playerContext.getCurrentIndex();
            const current = playlist[index];
            const trackId = current && current.id ? current.id : null;
            if (!trackId) {
                showToast("Không thể thêm: bài không hợp lệ", "error");
                return;
            }
            const lists = playlistContext.getUserPlaylists();
            if (!Array.isArray(lists) || !lists.length) {
                showToast("Chưa có playlist nào", "error");
                return;
            }
            openPicker(trackId);
        } catch {
            showToast("Đã xảy ra lỗi", "error");
        }
    });
}
