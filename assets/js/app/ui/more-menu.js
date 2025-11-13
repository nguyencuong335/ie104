// ===== MORE MENU MODULE =====

export function setupMoreMenu({ playerContext, playlistContext }) {
    const moreBtn = document.getElementById("more");
    const moreMenu = document.getElementById("more-menu");
    const downloadBtn = document.getElementById("download");
    
    if (!moreBtn || !moreMenu) return;

    function hideMoreMenu() {
        if (!moreMenu) return;
        moreMenu.classList.remove("open");
        moreMenu.setAttribute("aria-hidden", "true");
        document.removeEventListener("click", onDocClick, true);
        document.removeEventListener("keydown", onEsc, true);
    }
    
    function onDocClick(e) {
        if (!moreMenu || !moreBtn) return;
        if (moreMenu.contains(e.target) || moreBtn.contains(e.target)) return;
        hideMoreMenu();
    }
    
    function onEsc(e) {
        if (e.key === "Escape") hideMoreMenu();
    }

    moreBtn.addEventListener("click", () => {
        const open = moreMenu.classList.toggle("open");
        moreMenu.setAttribute("aria-hidden", String(!open));
        if (open) {
            document.addEventListener("click", onDocClick, true);
            document.addEventListener("keydown", onEsc, true);
        } else {
            hideMoreMenu();
        }
    });

    // Download functionality
    if (downloadBtn) {
        downloadBtn.addEventListener("click", async () => {
            try {
                const playlist = playlistContext.getPlaylist();
                const index = playerContext.getCurrentIndex();
                const t = playlist[index] || {};
                const url = t.src;
                if (!url) return hideMoreMenu();
                
                const safe = (s) =>
                    String(s || "")
                        .replace(/[\\/:*?"<>|]/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
                const base =
                    safe(
                        (t.title || "baihat") + (t.artist ? ` - ${t.artist}` : "")
                    ) || "baihat";
                const ext = (() => {
                    try {
                        const p = new URL(url, location.href).pathname;
                        const seg = p.split("/").pop() || "";
                        const e = seg.includes(".") ? seg.split(".").pop() : "mp3";
                        return e.split("?")[0].split("#")[0] || "mp3";
                    } catch {
                        return "mp3";
                    }
                })();
                const filename = `${base}.${ext}`;

                const sameOrigin = (() => {
                    try {
                        return new URL(url, location.href).origin === location.origin;
                    } catch {
                        return true;
                    }
                })();

                if (sameOrigin) {
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.rel = "noopener";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    try {
                        const res = await fetch(url, { mode: "cors" });
                        if (!res.ok) throw new Error("fetch failed");
                        const blob = await res.blob();
                        const objUrl = URL.createObjectURL(blob);
                        const a2 = document.createElement("a");
                        a2.href = objUrl;
                        a2.download = filename;
                        a2.rel = "noopener";
                        document.body.appendChild(a2);
                        a2.click();
                        a2.remove();
                        URL.revokeObjectURL(objUrl);
                    } catch {
                        const a = document.createElement("a");
                        a.href = url;
                        a.target = "_blank";
                        a.rel = "noopener";
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }
                }
            } finally {
                hideMoreMenu();
            }
        });
    }
}
