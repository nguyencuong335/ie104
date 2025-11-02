// ===== HARD GATE: yêu cầu đăng nhập trước khi xem site =====
(function gate() {
  try {
    const u = JSON.parse(localStorage.getItem("auth_user") || "null");
    if (!u) {
      const next = location.pathname + location.search + location.hash;
      location.replace("./auth.html?next=" + encodeURIComponent(next));
    }
  } catch {
    location.replace("./auth.html");
  }
})();

/** Đăng xuất và chuyển về trang đăng nhập (giữ next để quay lại) */
function signOut(redirect = true) {
  try { localStorage.removeItem("auth_user"); } catch {}
  if (redirect) {
    const next = location.pathname + location.search + location.hash;
    location.replace("./auth.html?next=" + encodeURIComponent(next));
  }
}

// ===== TẤT CẢ LOGIC SAU KHI DOM SẴN SÀNG =====
document.addEventListener("DOMContentLoaded", () => {
  // Bind nút Đăng xuất (sidebar)
  document.querySelector(".menu-btn.logout")?.addEventListener("click", () => {
    signOut(true);
  });

  // ===== Đồng bộ chiều cao player để sidebar/queue ăn khít bên trên
  function setPlayerSpacer() {
    const p = document.querySelector(".player");
    if (p) {
      document.documentElement.style.setProperty("--player-h", p.offsetHeight + "px");
    }
  }
  setPlayerSpacer();
  window.addEventListener("resize", setPlayerSpacer);

  // ===== Playlist =====
  const playlist = [
    { title: "Âm thầm bên em", artist: "Sơn Tùng M-TP", src: "./assets/songs/am-tham-ben-em-son-tung-mtp.mp3", cover: "./assets/imgs/am-tham-ben-em-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Buông đôi tay nhau ra", artist: "Sơn Tùng M-TP", src: "./assets/songs/buong-doi-tay-nhau-ra-son-tung-mtp.mp3", cover: "./assets/imgs/buong-doi-tay-nhau-ra-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Đừng Làm Trái Tim Anh Đau", artist: "Sơn Tùng M-TP", src: "./assets/songs/dung-lam-trai-tim-anh-dau-son-tung-mtp.mp3", cover: "./assets/imgs/dung-lam-trai-tim-anh-dau-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Không Phải Dạng Vừa Đâu", artist: "Sơn Tùng M-TP", src: "./assets/songs/khong-phai-dang-vua-dau-son-tung-mtp.mp3", cover: "./assets/imgs/khong-phai-dang-vua-dau-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Khuôn Mặt Đáng Thương", artist: "Sơn Tùng M-TP", src: "./assets/songs/khuon-mat-dang-thuong-son-tung-mtp.mp3", cover: "./assets/imgs/khuon-mat-dang-thuong-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Muộn Rồi Mà Sao Còn", artist: "Sơn Tùng M-TP", src: "./assets/songs/muon-roi-ma-sao-con-son-tung-mtp.mp3", cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Nắng Ấm Xa Dần", artist: "Sơn Tùng M-TP", src: "./assets/songs/nang-am-xa-dan-son-tung-mtp.mp3", cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
    { title: "Nơi Này Có Anh", artist: "Sơn Tùng M-TP", src: "./assets/songs/noi-nay-co-anh-son-tung-mtp.mp3", cover: "./assets/imgs/chung-ta-cua-hien-tai-son-tung-mtp.jpg", artistImg: "./assets/imgs/son-tung-mtp.jpg" },
  ];

  // ===== State & Elements =====
  const audio = new Audio();
  let index = 0, isPlaying = false, shuffle = false, repeatMode = "off"; // 'off' | 'all' | 'one'

  const titleEl   = document.getElementById("title");
  const artistEl  = document.getElementById("artist");
  const coverEl   = document.getElementById("cover");
  const playBtn   = document.getElementById("play");
  const playIcon  = document.getElementById("play-icon");
  const prevBtn   = document.getElementById("prev");
  const nextBtn   = document.getElementById("next");
  const shuffleBtn= document.getElementById("shuffle");
  const repeatBtn = document.getElementById("repeat");

  const progress      = document.getElementById("progress");
  const currentTimeEl = document.getElementById("current");
  const durationEl    = document.getElementById("duration");

  const volume  = document.getElementById("volume");
  const volIcon = document.getElementById("vol-icon");

  const queueListEl    = document.getElementById("queue-list");
  const queuePanel     = document.getElementById("queue");
  const recentBtn      = document.querySelector(".menu-btn.recent");
  const qTitle         = document.querySelector(".q-title");

  // Banner elements
  const bTitle = document.getElementById("b-title");
  const bArtistName = document.getElementById("b-artist-name");
  const bCover = document.getElementById("b-cover");
  const bArtistAvatar = document.getElementById("b-artist-avatar");

  // Artist bar
  const abName = document.getElementById("ab-name");
  const abAvatar = document.getElementById("ab-avatar");
  const abFollow = document.getElementById("ab-follow");
  let isFollowing = false;

  // ===== Guards =====
  console.assert(playlist.length >= 3, "Playlist phải có >= 3 bài");
  [
    ["title", titleEl],["artist", artistEl],["cover", coverEl],
    ["b-title", bTitle],["b-artist-name", bArtistName],["b-cover", bCover],["b-artist-avatar", bArtistAvatar],
    ["ab-name", abName],["ab-avatar", abAvatar],["ab-follow", abFollow],["queue-list", queueListEl],
  ].forEach(([id, el]) => {
    console.assert(el instanceof HTMLElement, `Phần tử #${id} phải tồn tại trước khi dùng`);
  });

  // ===== Helpers =====
  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), ss = Math.floor(s % 60).toString().padStart(2, "0");
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
    abAvatar.style.backgroundImage = 'url("' + (t.artistImg || t.cover) + '")';
  }

  function play()  { audio.play();  isPlaying = true;  setPlayUI(true); }
  function pause() { audio.pause(); isPlaying = false; setPlayUI(false); }

  function nextIndex() {
    if (shuffle) {
      if (playlist.length === 1) return index;
      let r; do { r = Math.floor(Math.random() * playlist.length); } while (r === index);
      return r;
    }
    return (index + 1) % playlist.length;
  }
  function prevIndex() {
    if (shuffle) {
      if (playlist.length === 1) return index;
      let r; do { r = Math.floor(Math.random() * playlist.length); } while (r === index);
      return r;
    }
    return (index - 1 + playlist.length) % playlist.length;
  }

  function nextTrack(auto = false) {
    if (auto && repeatMode === "one") { audio.currentTime = 0; audio.play(); return; }
    if (auto && repeatMode === "off" && !shuffle && index === playlist.length - 1) {
      pause(); audio.currentTime = 0; return;
    }
    loadTrack(nextIndex());
    if (isPlaying || auto) play(); else setPlayUI(false);
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
      row.addEventListener("click", () => { loadTrack(i); play(); pushUIState(); });
      queueListEl.appendChild(row);

      // Prefetch duration
      const a = new Audio(t.src);
      a.addEventListener("loadedmetadata", () => {
        const el = document.getElementById(`qtime-${i}`);
        if (el) el.textContent = fmt(a.duration);
      });
    });
    updateQueueActive();
  }
  function updateQueueActive() {
    document.querySelectorAll(".q-item").forEach((el) => el.classList.remove("current"));
    const active = document.querySelector(`.q-item[data-index="${index}"]`);
    if (active) active.classList.add("current");
  }

  // ===== A11y helpers =====
  function updateRepeatA11y() {
    const pressed = repeatMode !== "off";
    repeatBtn.setAttribute("aria-pressed", String(pressed));
    const titles = { off: "Repeat: Off", all: "Repeat: All", one: "Repeat: One" };
    repeatBtn.title = titles[repeatMode] || "Repeat";
  }
  function updateShuffleA11y() {
    shuffleBtn.setAttribute("aria-pressed", String(shuffle));
    shuffleBtn.title = shuffle ? "Shuffle: On" : "Shuffle: Off";
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
    updateShuffleA11y();
    updateRepeatA11y();
  });

  repeatBtn.addEventListener("click", () => {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    repeatBtn.dataset.mode = repeatMode;
    repeatBtn.classList.toggle("active", repeatMode !== "off");
    updateRepeatA11y();
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = fmt(audio.duration);
  });
  audio.addEventListener("timeupdate", () => {
    const pct = (audio.currentTime / audio.duration) * 100;
    const val = isFinite(pct) ? Math.round(pct) : 0;
    progress.value = val;
    progress.setAttribute("aria-valuenow", String(val));
    currentTimeEl.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("ended", () => nextTrack(true));

  progress.addEventListener("input", (e) => {
    if (!isFinite(audio.duration)) return;
    const val = Number(e.target.value);
    progress.setAttribute("aria-valuenow", String(val));
    audio.currentTime = (val / 100) * audio.duration;
  });
  volume.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    audio.volume = v;
    volume.setAttribute("aria-valuenow", String(v));
    volIcon.className =
      "fa-solid " +
      (audio.volume === 0 ? "fa-volume-xmark" : audio.volume < 0.5 ? "fa-volume-low" : "fa-volume-high");
  });

  // ===== Init =====
  updateShuffleA11y();
  updateRepeatA11y();
  renderQueue();
  loadTrack(index);
  audio.volume = Number(volume.value);
  volume.setAttribute("aria-valuenow", String(audio.volume));
  progress.setAttribute("aria-valuenow", "0");
  setPlayUI(false);

  // ===== Queue toggle từ tiêu đề bài hát trong player =====
  const titleClickable = titleEl;
  function setQueueVisible(show, fromPop = false) {
    queuePanel.classList.toggle("hidden", !show);

    if (recentBtn) recentBtn.setAttribute("aria-expanded", String(show));
    if (show) {
      if (qTitle && !qTitle.hasAttribute("tabindex")) qTitle.setAttribute("tabindex", "-1");
      setTimeout(() => qTitle?.focus(), 0);
    } else {
      recentBtn?.focus();
    }
    if (!fromPop) pushUIState();
  }
  if (titleClickable) {
    titleClickable.style.cursor = "pointer";
    titleClickable.setAttribute("title", "Mở/đóng Queue");
    titleClickable.addEventListener("click", () => {
      const open = queuePanel.classList.contains("hidden");
      setQueueVisible(open);
    });
  }

  function pushUIState() {
    const state = { index, queueOpen: !queuePanel.classList.contains("hidden") };
    try { history.pushState(state, ""); } catch {}
  }
  try { history.replaceState({ index, queueOpen: !queuePanel.classList.contains("hidden") }, ""); } catch {}
  window.addEventListener("popstate", (e) => {
    const s = e.state; if (!s) return;
    loadTrack(s.index);
    if (isPlaying) play(); else setPlayUI(false);
    setQueueVisible(!!s.queueOpen, true);
  });

  // ===== Follow button =====
  abFollow.addEventListener("click", () => {
    isFollowing = !isFollowing;
    abFollow.classList.toggle("is-following", isFollowing);
    abFollow.textContent = isFollowing ? "Đã theo dõi" : "Theo dõi";
    abFollow.setAttribute("aria-pressed", String(isFollowing));
  });

  // ===== Header nav back/forward =====
  document.getElementById("nav-back")?.addEventListener("click", () => history.back());
  document.getElementById("nav-forward")?.addEventListener("click", () => history.forward());

  // ===== Nút "Nghe gần đây" mở/đóng Queue (A11y) =====
  if (recentBtn) {
    recentBtn.setAttribute("aria-controls", "queue");
    recentBtn.setAttribute("aria-expanded", String(!queuePanel.classList.contains("hidden")));
    recentBtn.addEventListener("click", () => {
      const open = queuePanel.classList.contains("hidden");
      setQueueVisible(open);
    });
  }
  queuePanel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setQueueVisible(false);
  });

  // ===== Profile -> Hoso.html =====
  document.querySelector(".profile-btn")?.addEventListener("click", () => {
    window.location.href = "./Hoso.html";
  });

  // ===== Search enter "son tung" -> timkiem.html =====
  const searchInput = document.querySelector('.search input[type="search"]');
  if (searchInput) {
    const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const q = normalize(searchInput.value);
      if (q.includes("son tung")) {
        window.location.href = "./timkiem.html?q=" + encodeURIComponent(searchInput.value);
      }
    });
  }

  // ===== Settings button: click trái -> auth.html, chuột phải -> Đăng xuất nhanh
  const settingsBtn = document.querySelector(".settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => { window.location.href = "./auth.html"; });
    settingsBtn.addEventListener("contextmenu", (e) => { e.preventDefault(); signOut(true); });
    settingsBtn.setAttribute("title", "Cài đặt (Click) / Đăng xuất (Right-click)");
  }

  // ===== Smoke tests nho nhỏ =====
  try {
    console.assert(getComputedStyle(document.querySelector(".header")).display === "flex", "Header cần là flex");
  } catch {}
  console.assert(document.getElementById("b-title").textContent.length >= 0, "Banner title phải được gán sau loadTrack");
  (function smokeTests() {
    console.assert(playIcon.classList.contains("fa-play") && !playIcon.classList.contains("fa-pause"), "Nút play phải hiển thị biểu tượng play khi khởi động");
    console.assert(document.querySelectorAll(".q-item").length >= playlist.length, "Queue phải được render đủ items");
    try { nextTrack(false); prevTrack(); } catch (err) { console.error("next/prev throw", err); }
  })();
});

// =================Hiệu ứng thanh chạy nhạc ===================
// Update progress bar value
const progressBar = document.getElementById("progress");
progressBar.style.setProperty("--progress-value", `${progressBar.value}%`);

// Add event listener to update visual state when value changes
progressBar.addEventListener("input", (e) => {
    const value = e.target.value;
    progressBar.style.setProperty("--progress-value", `${value}%`);
});
// =================Hiệu ứng thanh chạy nhạc ===================
const volumeSlider = document.getElementById("volume");

function updateVolumeSlider() {
    const value = volumeSlider.value;
    const percentage = (value / volumeSlider.max) * 100;
    volumeSlider.style.setProperty("--volume-value", `${percentage}%`);
}

// Set initial value
updateVolumeSlider();

// Update on change
volumeSlider.addEventListener("input", updateVolumeSlider);
