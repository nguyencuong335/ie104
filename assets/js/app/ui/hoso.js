// ===== HOSO (PROFILE) PLAYLISTS MODULE =====

export function setupHosoPlaylists({ playlistContext, playerContext }) {
    function syncProfilePlaylists() {
        try {
            const wrap = document.querySelector(".my-playlists");
            if (!wrap) return; // not on profile page
            const lists = playlistContext.getUserPlaylists();

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

                // actions (rename/change-cover/delete)
                let acts = card.querySelector(".my-pl-actions");
                if (!acts) {
                    acts = document.createElement("div");
                    acts.className = "my-pl-actions";
                    const btnRename = document.createElement("button");
                    btnRename.className = "btn tiny edit";
                    btnRename.title = "Đổi tên playlist";
                    btnRename.setAttribute("aria-label", "Đổi tên playlist");
                    btnRename.innerHTML = '<i class="fa-solid fa-pen"></i>';
                    const btnCover = document.createElement("button");
                    btnCover.className = "btn tiny cover";
                    btnCover.title = "Đổi ảnh playlist";
                    btnCover.setAttribute("aria-label", "Đổi ảnh playlist");
                    btnCover.innerHTML = '<i class="fa-regular fa-image"></i>';
                    const btnDel = document.createElement("button");
                    btnDel.className = "btn tiny danger delete";
                    btnDel.title = "Xóa playlist";
                    btnDel.setAttribute("aria-label", "Xóa playlist");
                    btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
                    acts.appendChild(btnRename);
                    acts.appendChild(btnCover);
                    acts.appendChild(btnDel);
                    card.appendChild(acts);

                    // stop navigation when clicking actions
                    acts.addEventListener("click", (e) => e.stopPropagation());

                    // Rename playlist
                    btnRename.addEventListener("click", () => {
                        try {
                            const curr = playlistContext.getUserPlaylists().find(x => x.id === pl.id);
                            if (!curr) return;
                            
                            const v = window.prompt(
                                "Đổi tên playlist",
                                curr.name || "Playlist"
                            );
                            if (v == null) return;
                            let nameNew = v.trim().replace(/\s+/g, " ");
                            if (!nameNew) return;
                            if (nameNew.length > 40) {
                                window.alert("Tên playlist tối đa 40 ký tự");
                                return;
                            }

                            playlistContext.renameUserPlaylist(pl.id, nameNew);
                            syncProfilePlaylists();
                            // Also refresh sidebar
                            window.dispatchEvent(new CustomEvent("playlists:changed"));
                        } catch {}
                    });

                    // Change cover
                    btnCover.addEventListener("click", () => {
                        try {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.style.display = "none";
                            document.body.appendChild(input);

                            const finalize = (dataUrl) => {
                                try {
                                    if (dataUrl) {
                                        playlistContext.updateUserPlaylistCover(pl.id, dataUrl);
                                        // immediate UI update
                                        const coverEl = card.querySelector(".my-pl-cover");
                                        if (coverEl) {
                                            coverEl.style.backgroundImage = `url('${dataUrl}')`;
                                            coverEl.style.backgroundSize = "cover";
                                            coverEl.style.backgroundPosition = "center";
                                            coverEl.style.backgroundRepeat = "no-repeat";
                                        }
                                        // Also refresh sidebar
                                        window.dispatchEvent(new CustomEvent("playlists:changed"));
                                    }
                                } catch {}
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
                                    reader.onload = () =>
                                        finalize(
                                            typeof reader.result === "string"
                                                ? reader.result
                                                : null
                                        );
                                    reader.onerror = () => finalize(null);
                                    reader.readAsDataURL(file);
                                },
                                { once: true }
                            );
                            input.click();
                        } catch {}
                    });

                    // Delete playlist
                    btnDel.addEventListener("click", () => {
                        try {
                            const ok = window.confirm("Xóa playlist này?");
                            if (!ok) return;
                            
                            playlistContext.deleteUserPlaylist(pl.id);
                            syncProfilePlaylists();
                            // Also refresh sidebar
                            window.dispatchEvent(new CustomEvent("playlists:changed"));
                        } catch {}
                    });
                }

                // Wire click to navigate
                card.onclick = () => {
                    try {
                        const go = window.__mbGo || ((url) => { window.location.href = url; });
                        go(`./playlist.html?id=${encodeURIComponent(pl.id)}`);
                    } catch {
                        window.location.href = `./playlist.html?id=${encodeURIComponent(pl.id)}`;
                    }
                };
            });
        } catch {}
    }

    // Run once on load and on changes
    syncProfilePlaylists();
    window.addEventListener("playlists:changed", syncProfilePlaylists);
}
