// Page-specific behavior for timkiem.html

(function initTopSongsForSearchPage() {
    function build() {
        const grid = document.getElementById("top-songs-grid");
        if (!grid) return false;
        const items = Array.from(document.querySelectorAll(".q-item")).slice(
            0,
            5
        );
        if (items.length === 0) return false;
        grid.innerHTML = "";
        const localCovers = [
            "./assets/imgs/am-tham-ben-em-son-tung-mtp.jpg",
            "./assets/imgs/buong-doi-tay-nhau-ra-son-tung-mtp.jpg",
            "./assets/imgs/dung-lam-trai-tim-anh-dau-son-tung-mtp.jpg",
            "./assets/imgs/khong-phai-dang-vua-dau-son-tung-mtp.jpg",
            "./assets/imgs/khuon-mat-dang-thuong-son-tung-mtp.jpg",
        ];
        items.forEach((row, i) => {
            const idx = row.getAttribute("data-index");
            const coverImg = row.querySelector(".q-cover img");
            const titleEl = row.querySelector(".q-title-text");
            const artistEl = row.querySelector(".q-artist");
            const coverUrl = localCovers[i] || (coverImg ? coverImg.src : "");
            const card = document.createElement("div");
            card.className = "song-item";
            card.innerHTML = `
        <div class="song-cover" style="background-image:url('${coverUrl}'); background-size: cover; background-position: center;"></div>
        <div class="song-info">
          <div class="song-name">${titleEl ? titleEl.textContent : ""}</div>
          <div class="song-artist">${artistEl ? artistEl.textContent : ""}</div>
        </div>
      `;
            card.addEventListener("click", () => {
                const target = document.querySelector(
                    `.q-item[data-index="${idx}"]`
                );
                if (target) target.click();
            });
            grid.appendChild(card);
        });
        return true;
    }

    function tryBuildWhenReady() {
        setTimeout(() => {
            if (build()) return;

            const obs = new MutationObserver(() => {
                if (build()) obs.disconnect();
            });
            obs.observe(document.body, { childList: true, subtree: true });
        }, 0);
    }

    if (
        document.readyState === "complete" ||
        document.readyState === "interactive"
    ) {
        tryBuildWhenReady();
    } else {
        window.addEventListener("DOMContentLoaded", tryBuildWhenReady);
    }
})();

// Ẩn .main-content khi có .queue hiển thị trên trang
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
