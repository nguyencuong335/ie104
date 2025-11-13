// ===== HEADER SEARCH MODULE =====

export function setupHeaderSearch({ go }) {
    const searchInput = document.querySelector('.search input[type="search"]');
    if (!searchInput) return;
    
    const normalize = (s) =>
        s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
            
    searchInput.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        const raw = searchInput.value || "";
        const q = normalize(raw);
        if (q.length === 0) return;
        
        // Try to detect if input is a song title; if so, redirect to artist search
        let target = raw;
        try {
            const res = await fetch("./assets/music_data/songs.json", {
                cache: "no-store",
            });
            const data = await res.json();
            if (Array.isArray(data) && data.length) {
                const exact = data.find((s) => normalize(s.title) === q);
                const partial = exact
                    ? null
                    : data.find((s) => normalize(s.title).includes(q));
                const hit = exact || partial || null;
                if (hit && hit.artist) target = hit.artist;
            }
        } catch {}
        go("./timkiem.html?q=" + encodeURIComponent(target));
    });
}
