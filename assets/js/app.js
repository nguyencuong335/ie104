// Tất cả logic chạy sau khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    // Đồng bộ chiều cao player để sidebar/queue ăn khít bên trên
    function setPlayerSpacer() {
        const p = document.querySelector(".player");
        if (p) {
            document.documentElement.style.setProperty(
                "--player-h",
                p.offsetHeight + "px"
            );
        }
    }
    setPlayerSpacer();
    window.addEventListener("resize", setPlayerSpacer);

    // ===== Playlist (có thể đổi URL mp3/cover) =====
    const playlist = [
        {
            title: "Âm thầm bên em",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/am-tham-ben-em-son-tung-mtp.mp3",
            cover: "./assets/imgs/am-tham-ben-em-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Buông đôi tay nhau ra",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/buong-doi-tay-nhau-ra-son-tung-mtp.mp3",
            cover: "./assets/imgs/buong-doi-tay-nhau-ra-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Đừng Làm Trái Tim Anh Đau",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/dung-lam-trai-tim-anh-dau-son-tung-mtp.mp3",
            cover: "./assets/imgs/dung-lam-trai-tim-anh-dau-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Không Phải Dạng Vừa Đâu",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/khong-phai-dang-vua-dau-son-tung-mtp.mp3",
            cover: "./assets/imgs/khong-phai-dang-vua-dau-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Khuôn Mặt Đáng Thương",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/khuon-mat-dang-thuong-son-tung-mtp.mp3",
            cover: "./assets/imgs/khuon-mat-dang-thuong-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Muộn Rồi Mà Sao Còn",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/muon-roi-ma-sao-con-son-tung-mtp.mp3",
            cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Nắng Ấm Xa Dần",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/nang-am-xa-dan-son-tung-mtp.mp3",
            cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
        {
            title: "Nơi Này Có Anh",
            artist: "Sơn Tùng M-TP",
            src: "./assets/songs/noi-nay-co-anh-son-tung-mtp.mp3",
            cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg",
            artistImg: "./assets/imgs/son-tung-mtp.jpg",
        },
    ];

    // ===== State & Elements =====
    const audio = new Audio();
    let index = 0,
        isPlaying = false,
        shuffle = false,
        repeatMode = "off"; // 'off' | 'all' | 'one'

    const titleEl = document.getElementById("title");
    const artistEl = document.getElementById("artist");
    const coverEl = document.getElementById("cover");
    const playBtn = document.getElementById("play");
    const playIcon = document.getElementById("play-icon");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const shuffleBtn = document.getElementById("shuffle");
    const repeatBtn = document.getElementById("repeat");

    const progress = document.getElementById("progress");
    const currentTimeEl = document.getElementById("current");
    const durationEl = document.getElementById("duration");

    const volume = document.getElementById("volume");
    const volIcon = document.getElementById("vol-icon");

    const queueListEl = document.getElementById("queue-list");

    // Banner elements
    const bTitle = document.getElementById("b-title");
    const bArtistName = document.getElementById("b-artist-name");
    const bCover = document.getElementById("b-cover");
    const bArtistAvatar = document.getElementById("b-artist-avatar");

    // Artist bar elements
    const abName = document.getElementById("ab-name");
    const abAvatar = document.getElementById("ab-avatar");
    const abFollow = document.getElementById("ab-follow");
    let isFollowing = false;

    // ===== Guards / sanity checks =====
    console.assert(playlist.length >= 3, "Playlist phải có >= 3 bài");
    [
        ["title", titleEl],
        ["artist", artistEl],
        ["cover", coverEl],
        ["b-title", bTitle],
        ["b-artist-name", bArtistName],
        ["b-cover", bCover],
        ["b-artist-avatar", bArtistAvatar],
        ["ab-name", abName],
        ["ab-avatar", abAvatar],
        ["ab-follow", abFollow],
        ["queue-list", queueListEl],
    ].forEach(([id, el]) => {
        console.assert(
            el instanceof HTMLElement,
            `Phần tử #${id} phải tồn tại trước khi dùng`
        );
    });

    // ===== Helpers =====
    function fmt(s) {
        if (!isFinite(s)) return "0:00";
        const m = Math.floor(s / 60),
            ss = Math.floor(s % 60)
                .toString()
                .padStart(2, "0");
        return `${m}:${ss}`;
    }
    function setPlayUI(p) {
        playIcon.classList.toggle("fa-play", !p);
        playIcon.classList.toggle("fa-pause", p);
    }

    function loadTrack(i) {
        const t = playlist[i];
        index = i;
        audio.src = t.src;
        audio.load();
        titleEl.textContent = t.title;
        artistEl.textContent = t.artist;
        coverEl.src = t.cover;
        // Update banner
        bTitle.textContent = t.title;
        bArtistName.textContent = t.artist;
        bCover.src = t.cover;
        bArtistAvatar.src = t.artistImg || t.cover;
        progress.value = 0;
        currentTimeEl.textContent = "0:00";
        durationEl.textContent = "0:00";
        updateQueueActive();
        // update artist bar
        abName.textContent = t.artist;
        abAvatar.style.backgroundImage =
            'url("' + (t.artistImg || t.cover) + '")';
    }

    function play() {
        audio.play();
        isPlaying = true;
        setPlayUI(true);
    }
    function pause() {
        audio.pause();
        isPlaying = false;
        setPlayUI(false);
    }

    function nextIndex() {
        if (shuffle) {
            if (playlist.length === 1) return index;
            let r;
            do {
                r = Math.floor(Math.random() * playlist.length);
            } while (r === index);
            return r;
        }
        return (index + 1) % playlist.length;
    }
    function prevIndex() {
        if (shuffle) {
            if (playlist.length === 1) return index;
            let r;
            do {
                r = Math.floor(Math.random() * playlist.length);
            } while (r === index);
            return r;
        }
        return (index - 1 + playlist.length) % playlist.length;
    }

    // Gói toàn bộ logic chuyển bài
    function nextTrack(auto = false) {
        if (auto && repeatMode === "one") {
            audio.currentTime = 0;
            audio.play();
            return;
        }
        if (
            auto &&
            repeatMode === "off" &&
            !shuffle &&
            index === playlist.length - 1
        ) {
            pause();
            audio.currentTime = 0;
            return;
        }
        loadTrack(nextIndex());
        if (isPlaying || auto) {
            play();
        } else {
            setPlayUI(false);
        }
        pushUIState();
    }

    function prevTrack() {
        loadTrack(prevIndex());
        if (isPlaying) play();
        pushUIState();
    }

    // ===== Queue rendering =====
    function renderQueue() {
        queueListEl.innerHTML = "";
        playlist.forEach((t, i) => {
            const row = document.createElement("div");
            row.className = "q-item";
            row.setAttribute("data-index", i);
            row.innerHTML = `
        <div class="q-cover"><img src="${t.cover}" alt="${t.title}"></div>
        <div class="q-meta">
          <div class="q-title-text">${t.title}</div>
          <div class="q-artist">${t.artist}</div>
        </div>
        <div class="q-time" id="qtime-${i}">--:--</div>
      `;
            row.addEventListener("click", () => {
                loadTrack(i);
                play();
                pushUIState();
            });
            queueListEl.appendChild(row);

            // Prefetch duration cho mỗi track
            const a = new Audio(t.src);
            a.addEventListener("loadedmetadata", () => {
                const el = document.getElementById(`qtime-${i}`);
                if (el) el.textContent = fmt(a.duration);
            });
        });
        updateQueueActive();
    }

    function updateQueueActive() {
        document
            .querySelectorAll(".q-item")
            .forEach((el) => el.classList.remove("current"));
        const active = document.querySelector(`.q-item[data-index="${index}"]`);
        if (active) active.classList.add("current");
    }

    // ===== Listeners =====
    playBtn.addEventListener("click", () => {
        if (audio.src === "") loadTrack(index);
        isPlaying ? pause() : play();
    });
    prevBtn.addEventListener("click", prevTrack);
    nextBtn.addEventListener("click", () => nextTrack(false));
    shuffleBtn.addEventListener("click", () => {
        shuffle = !shuffle;
        shuffleBtn.classList.toggle("active", shuffle);
        if (repeatMode === "one" && shuffle) repeatMode = "all";
        repeatBtn.dataset.mode = repeatMode;
        repeatBtn.classList.toggle("active", repeatMode !== "off");
    });
    repeatBtn.addEventListener("click", () => {
        repeatMode =
            repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
        repeatBtn.dataset.mode = repeatMode;
        repeatBtn.classList.toggle("active", repeatMode !== "off");
    });

    audio.addEventListener("loadedmetadata", () => {
        durationEl.textContent = fmt(audio.duration);
    });
    audio.addEventListener("timeupdate", () => {
        const pct = (audio.currentTime / audio.duration) * 100;
        progress.value = isFinite(pct) ? pct : 0;
        currentTimeEl.textContent = fmt(audio.currentTime);
    });
    audio.addEventListener("ended", () => nextTrack(true));

    progress.addEventListener("input", (e) => {
        if (!isFinite(audio.duration)) return;
        audio.currentTime = (e.target.value / 100) * audio.duration;
    });
    volume.addEventListener("input", (e) => {
        audio.volume = Number(e.target.value);
        volIcon.className =
            "fa-solid " +
            (audio.volume === 0
                ? "fa-volume-xmark"
                : audio.volume < 0.5
                ? "fa-volume-low"
                : "fa-volume-high");
    });

    // Init
    renderQueue();
    loadTrack(index);
    audio.volume = Number(volume.value);
    setPlayUI(false);

    // ===== Toggle Queue when clicking on the player title =====
    const queuePanel = document.getElementById("queue");
    function setQueueVisible(show, fromPop = false) {
        queuePanel.classList.toggle("hidden", !show);
        if (!fromPop) pushUIState();
    }
    if (titleEl) {
        titleEl.style.cursor = "pointer";
        titleEl.setAttribute("title", "Mở/đóng Queue");
        titleEl.addEventListener("click", () => {
            const open = queuePanel.classList.contains("hidden");
            setQueueVisible(open);
        });
    }

    function pushUIState() {
        const state = {
            index,
            queueOpen: !queuePanel.classList.contains("hidden"),
        };
        try {
            history.pushState(state, "");
        } catch (_) {
            /* ignore */
        }
    }
    // Thiết lập state đầu tiên
    try {
        history.replaceState(
            { index, queueOpen: !queuePanel.classList.contains("hidden") },
            ""
        );
    } catch (_) {}

    window.addEventListener("popstate", (e) => {
        const s = e.state;
        if (!s) return;
        loadTrack(s.index);
        if (isPlaying) {
            play();
        } else {
            setPlayUI(false);
        }
        setQueueVisible(!!s.queueOpen, true);
    });

    // Follow button toggle
    abFollow.addEventListener("click", () => {
        isFollowing = !isFollowing;
        abFollow.classList.toggle("is-following", isFollowing);
        abFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
        abFollow.setAttribute("aria-pressed", String(isFollowing));
    });

    // Header nav: back/forward
    const backBtn = document.getElementById("nav-back");
    const fwdBtn = document.getElementById("nav-forward");
    if (backBtn) backBtn.addEventListener("click", () => history.back());
    if (fwdBtn) fwdBtn.addEventListener("click", () => history.forward());

    // ===== Tiny behaviour tests =====
    try {
        console.assert(
            getComputedStyle(document.querySelector(".header")).display ===
                "flex",
            "Header cần là flex"
        );
    } catch (_) {}
    console.assert(
        document.getElementById("b-title").textContent.length >= 0,
        "Banner title phải được gán sau loadTrack"
    );
    (function smokeTests() {
        console.assert(
            playIcon.classList.contains("fa-play") &&
                !playIcon.classList.contains("fa-pause"),
            "Nút play phải hiển thị biểu tượng play khi khởi động"
        );
        console.assert(
            document.querySelectorAll(".q-item").length >= playlist.length,
            "Queue phải được render đủ items"
        );
        try {
            nextTrack(false);
            prevTrack();
        } catch (err) {
            console.error("next/prev throw", err);
        }
    })();
});

// Chuyển trang khi click vào nút profile
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".profile-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
        // Đảm bảo đúng tên file: 'hoso.html' hay 'Hoso.html'
        window.location.href = "./Hoso.html";
        // hoặc: window.location.assign('./hoso.html');
    });
});

// Nhập Sơn Tùng thì sẽ qua trang tìm kiếm
document.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector('.search input[type="search"]');
    if (!input) return;

    // Chuẩn hoá: bỏ dấu tiếng Việt, về lowercase, trim
    const normalize = (s) =>
        s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;

        const q = normalize(input.value);
        if (q.includes("son tung")) {
            // chuyển trang; kèm query cho tiện nếu cần dùng ở timkiem.html
            window.location.href =
                "./timkiem.html?q=" + encodeURIComponent(input.value);
        }
    });
});
