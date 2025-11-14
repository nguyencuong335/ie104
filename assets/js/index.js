// -------- 2. HERO CAROUSEL AUTO SLIDE --------
const hero = document.getElementById("hero-carousel");
const banners = hero ? hero.querySelectorAll(".q-banner") : [];
const dots = hero ? hero.querySelectorAll(".hero-dot") : [];
let currentIndex = 0;

function showBanner(index) {
    banners.forEach((b, i) => {
        b.classList.toggle("hidden", i !== index);
        dots[i].classList.toggle("is-active", i === index);
    });
}

function nextBanner() {
    currentIndex = (currentIndex + 1) % banners.length;
    showBanner(currentIndex);
}

if (banners.length > 0) {
    showBanner(0);
    setInterval(nextBanner, 5000);

    dots.forEach((dot, i) => {
        dot.addEventListener("click", () => {
            currentIndex = i;
            showBanner(i);
        });
    });
}

// -------- 3. PLAY BUTTON INTERACTION (Mock) --------
function setupPlayButtons() {
    const scope = document;
    const buttons = scope.querySelectorAll(
        ".playlist-play, .album-play, .track-play-btn"
    );
    buttons.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const card =
                btn.closest(".playlist-card") ||
                btn.closest(".album-card") ||
                btn.closest(".track-row");
            const title =
                card?.querySelector(
                    ".playlist-title, .album-title, .track-title"
                )?.textContent || "Bài hát";
            alert(`🎵 Đang phát: ${title}`);
        });
    });
}

document.addEventListener("DOMContentLoaded", setupPlayButtons);
function syncRangeFills() {
    const progress = document.getElementById("progress");
    const volume = document.getElementById("volume");
    if (progress) {
        const updateProgress = () => {
            const min = Number(progress.min || 0);
            const max = Number(progress.max || 100);
            const val = Number(progress.value || 0);
            const pct = ((val - min) * 100) / (max - min);
            progress.style.setProperty("--progress-value", pct + "%");
        };
        progress.addEventListener("input", updateProgress);
        updateProgress();
    }
    if (volume) {
        const updateVolume = () => {
            const min = Number(volume.min || 0);
            const max = Number(volume.max || 1);
            const val = Number(volume.value || 0);
            const pct = ((val - min) * 100) / (max - min);
            volume.style.setProperty("--volume-value", pct + "%");
        };
        volume.addEventListener("input", updateVolume);
        updateVolume();
    }
}

document.addEventListener("DOMContentLoaded", syncRangeFills);

// ---------- SLIDER CONTROLS ----------
function setupSliders() {
    const sliders = document.querySelectorAll(".slider");
    sliders.forEach((slider) => {
        const track = slider.querySelector(".slider-track");
        const prev = slider.querySelector(".slider-btn.prev");
        const next = slider.querySelector(".slider-btn.next");
        if (!track) return;

        const scrollAmount = () => Math.max(300, track.clientWidth * 0.8);

        if (prev)
            prev.addEventListener("click", () =>
                track.scrollBy({ left: -scrollAmount(), behavior: "smooth" })
            );
        if (next)
            next.addEventListener("click", () =>
                track.scrollBy({ left: scrollAmount(), behavior: "smooth" })
            );

        // Map vertical wheel to horizontal when appropriate (trackpad friendly)
        track.addEventListener(
            "wheel",
            (e) => {
                if (Math.abs(e.deltaX) < 2 && Math.abs(e.deltaY) > 0) {
                    e.preventDefault();
                    track.scrollBy({ left: e.deltaY, behavior: "auto" });
                }
            },
            { passive: false }
        );
    });
}

document.addEventListener("DOMContentLoaded", setupSliders);
