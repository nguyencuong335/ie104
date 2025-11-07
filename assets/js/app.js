// ===== HARD GATE: yêu cầu đăng nhập trước khi xem site =====
(function gate() {
  try {
    const u = JSON.parse(localStorage.getItem("auth_user") || "null");
    if (!u) {
      const next = location.pathname + location.search + location.hash;
      location.replace("./landingpage.html");
    }
  } catch {
    location.replace("./landingpage.html");
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
  // Smooth page enter
  try { requestAnimationFrame(() => document.body.classList.add("is-loaded")); } catch {}

  // Helper: smooth navigate with fade-out
  function go(url) {
    try { document.body.classList.add("page-exit"); } catch {}
    setTimeout(() => { window.location.href = url; }, 180);
  }
  // Bind nút Đăng xuất (sidebar)
  document.querySelector(".menu-btn.logout")?.addEventListener("click", () => {
    signOut(true);
  });

  // ===== Expose minimal API for other pages =====
  try {
    window.MusicBox = Object.freeze({
      playAt(i) { if (typeof i === "number" && i >= 0 && i < playlist.length) { loadTrack(i); play(); pushUIState(); } },
      currentIndex() { return index; },
      playlist() { return playlist.slice(); },
    });
  } catch {}

  // Sidebar: Yêu thích -> Yeuthich.html
  const likedBtn = document.querySelector(".menu-btn.liked");
  if (likedBtn) {
    likedBtn.addEventListener("click", () => {
      go("./Yeuthich.html");
    });
  }

  // Sidebar: Playlist của bạn -> Hoso.html
  const yourBtn = document.querySelector(".menu-btn.your");
  if (yourBtn) {
    yourBtn.addEventListener("click", () => {
      go("./Hoso.html");
    });
  }

  // Sidebar: Khám phá -> index.html (Trang chủ)
  const exploreBtn = document.querySelector(".menu-btn.explore");
  if (exploreBtn) {
    exploreBtn.addEventListener("click", () => {
      go("./index.html");
    });
  }

  // Sidebar: Nghe gần đây -> NgheGanDay.html
  const recentNavBtn = document.querySelector(".menu-btn.recent");
  if (recentNavBtn) {
    recentNavBtn.addEventListener("click", () => {
      go("./NgheGanDay.html");
    });
  }

  // ===== Highlight active sidebar item by current page =====
  (function setActiveSidebar() {
    try {
      const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
      const map = {
        "index.html": ".menu-btn.explore",
        "hoso.html": ".menu-btn.your",
        "yeuthich.html": ".menu-btn.liked",
        "ngheganday.html": ".menu-btn.recent",
      };
      const sel = map[file] || (file === "" ? ".menu-btn.explore" : null);
      const all = document.querySelectorAll(".menu .menu-btn");
      all.forEach((b) => b.classList.remove("active"));
      if (sel) {
        const target = document.querySelector(sel);
        if (target) target.classList.add("active");
      }
    } catch {}
  })();

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
  let playlist = [];
  const fallbackPlaylist = [
    { title: "Muộn Rồi Mà Sao Còn", artist: "Sơn Tùng M-TP", src: "./assets/music_data/songs/muon_roi_ma_sao_con.mp3", cover: "./assets/music_data/imgs_song/muon_roi_ma_sao_con.jpg", artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg" },
    { title: "Nơi Này Có Anh", artist: "Sơn Tùng M-TP", src: "./assets/music_data/songs/noi_nay_co_anh.mp3", cover: "./assets/music_data/imgs_song/noi_nay_co_anh.jpg", artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg" },
    { title: "Chúng Ta Của Hiện Tại", artist: "Sơn Tùng M-TP", src: "./assets/music_data/songs/chung_ta_cua_hien_tai.mp3", cover: "./assets/music_data/imgs_song/chung_ta_cua_hien_tai.jpg", artistImg: "./assets/music_data/imgs_casi/son_tung_mtp.jpg" },
    { title: "Gái Độc Thân", artist: "Tlinh", src: "./assets/music_data/songs/gai_doc_than.mp3", cover: "./assets/music_data/imgs_song/gai_doc_than.jpg", artistImg: "./assets/music_data/imgs_casi/tlinh.jpg" },
  ];
  async function loadPlaylistFromJSON() {
    try {
      const res = await fetch("./assets/music_data/songs.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch songs.json");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error("songs.json invalid or empty");
      // Replace playlist contents in-place
      playlist.splice(0, playlist.length, ...data);
      renderQueue();
      loadTrack(0);
      audio.volume = Number(volume.value);
      volume.setAttribute("aria-valuenow", String(audio.volume));
      progress.setAttribute("aria-valuenow", "0");
      setPlayUI(false);
      console.assert(playlist.length >= 3, "Playlist phải có >= 3 bài");
      // simple smoke after data ready
      try { nextTrack(false); prevTrack(); } catch (err) { console.error("next/prev throw", err); }
    } catch (err) {
      console.error("Không thể tải playlist từ songs.json:", err);
      // Fallback to built-in playlist
      playlist.splice(0, playlist.length, ...fallbackPlaylist);
      renderQueue();
      loadTrack(0);
      audio.volume = Number(volume.value);
      volume.setAttribute("aria-valuenow", String(audio.volume));
      progress.setAttribute("aria-valuenow", "0");
      setPlayUI(false);
      console.warn("Đang sử dụng fallback playlist nội bộ");
    }
  }

  // ===== State & Elements =====
  const audio = new Audio();
  let index = 0, isPlaying = false, shuffle = false, repeatMode = "off"; // 'off' | 'all' | 'one'
  // Ad state
  let isAdPlaying = false;
  let adAfterCallback = null;

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
  const playlistSection = document.querySelector(".playlist");

  // Banner elements
  const bTitle = document.getElementById("b-title");
  const bArtistName = document.getElementById("b-artist-name");
  const bCover = document.getElementById("b-cover");
  const bArtistAvatar = document.getElementById("b-artist-avatar");

  // Follow state (banner button)
  const bFollow = document.getElementById("b-follow");
  let isFollowing = false;
  // Normalize artist names so the follow state stays consistent across tracks of the same artist
  function normArtist(name) {
    return String(name || "").toLowerCase().trim().replace(/\s+/g, " ");
  }
  // Persist followed artists by name
  function getFollowedArtists() {
    try {
      const arr = JSON.parse(localStorage.getItem('followed_artists') || '[]');
      return new Set(Array.isArray(arr) ? arr.map(normArtist) : []);
    } catch { return new Set(); }
  }
  function saveFollowedArtists(set) {
    try { localStorage.setItem('followed_artists', JSON.stringify(Array.from(set))); } catch {}
  }
  function updateFollowUI(artistName) {
    if (!bFollow) return;
    const set = getFollowedArtists();
    const key = normArtist(artistName);
    isFollowing = !!(key && set.has(key));
    bFollow.classList.toggle('is-following', isFollowing);
    bFollow.textContent = isFollowing ? 'Đã theo dõi' : 'Theo dõi';
    bFollow.setAttribute('aria-pressed', String(isFollowing));
  }

  // Meta actions
  const likeBtn = document.getElementById("like");
  const moreBtn = document.getElementById("more");
  const moreMenu = document.getElementById("more-menu");
  const downloadBtn = document.getElementById("download");
  const addToPlBtn = document.getElementById("add-to-playlist");

  // ===== Guards =====
  // Moved playlist length assertion to after JSON load
  [
    ["title", titleEl],["artist", artistEl],["cover", coverEl],
    ["b-title", bTitle],["b-artist-name", bArtistName],["b-cover", bCover],["b-artist-avatar", bArtistAvatar],
    ["queue-list", queueListEl],
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

  function setControlsDisabled(disabled) {
    try {
      [playBtn, prevBtn, nextBtn, shuffleBtn, repeatBtn].forEach((b) => {
        if (!b) return;
        b.disabled = !!disabled;
        b.classList.toggle('disabled', !!disabled);
      });
      if (progress) progress.disabled = !!disabled;
    } catch {}
  }

  function isPremiumOn() {
    try { return localStorage.getItem("premium_enabled") === "true"; } catch { return false; }
  }

  // Ad assets
  const adAssets = {
    title: "Quảng cáo",
    artist: "Tài trợ",
    src: "./assets/quang_cao/songs_quang_cao/quang_cao.mp3",
    cover: "./assets/quang_cao/imgs_banner_quang_cao/quang_cao.png",
    artistImg: "./assets/quang_cao/imgs_logo_quang_cao/quang_cao.png",
  };

  function applyAdUI() {
    try {
      titleEl.textContent = adAssets.title;
      artistEl.textContent = adAssets.artist;
      coverEl.src = adAssets.cover;
      bTitle.textContent = adAssets.title;
      bArtistName.textContent = adAssets.artist;
      bCover.src = adAssets.cover;
      bArtistAvatar.src = adAssets.artistImg;
      progress.value = 0;
      progress.style.setProperty('--progress-value', '0%');
      currentTimeEl.textContent = "0:00";
      durationEl.textContent = "0:00";
    } catch {}
  }

  function startAdThen(cb) {
    isAdPlaying = true;
    adAfterCallback = typeof cb === 'function' ? cb : null;
    setControlsDisabled(true);
    applyAdUI();
    audio.src = adAssets.src;
    audio.load();
    play();
  }

  function endAdThenResume() {
    isAdPlaying = false;
    setControlsDisabled(false);
    // Continue as requested
    if (typeof adAfterCallback === 'function') {
      const fn = adAfterCallback; adAfterCallback = null; fn();
    } else {
      nextTrack(true);
    }
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
    try { progress.style.setProperty('--progress-value', '0%'); } catch {}
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    updateQueueActive();

    // update follow button state based on current artist
    updateFollowUI(t.artist);

    // thông báo ra ngoài để trang khác sync
    try { window.dispatchEvent(new CustomEvent('musicbox:trackchange', { detail: { index } })); } catch {}
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
    if (isAdPlaying) return; // cannot control during ad
    if (audio.src === "" && playlist.length > 0) loadTrack(index);
    isPlaying ? pause() : play();
  });
  prevBtn.addEventListener("click", () => { if (isAdPlaying) return; if (playlist.length === 0) return; prevTrack(); });
  nextBtn.addEventListener("click", () => { if (isAdPlaying) return; if (playlist.length === 0) return; nextTrack(false); });

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

  // ===== Like button & More (ellipsis) menu =====
  if (likeBtn) {
    likeBtn.addEventListener("click", () => {
      const icon = likeBtn.querySelector("i");
      const isSolid = icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular", !isSolid);
      icon.classList.add("fa-heart");
      likeBtn.classList.toggle("active", isSolid);
    });
  }
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
  function onEsc(e) { if (e.key === "Escape") hideMoreMenu(); }
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener("click", (e) => {
      const open = moreMenu.classList.toggle("open");
      moreMenu.setAttribute("aria-hidden", String(!open));
      if (open) {
        document.addEventListener("click", onDocClick, true);
        document.addEventListener("keydown", onEsc, true);
      } else hideMoreMenu();
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      try {
        const t = playlist[index] || {};
        const url = t.src;
        if (!url) return hideMoreMenu();
        const safe = (s) => String(s || "")
          .replace(/[\\/:*?"<>|]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        const base = safe((t.title || "baihat") + (t.artist ? ` - ${t.artist}` : "")) || "baihat";
        const ext = (() => {
          try {
            const p = new URL(url, location.href).pathname;
            const seg = p.split("/").pop() || "";
            const e = seg.includes(".") ? seg.split(".").pop() : "mp3";
            return e.split("?")[0].split("#")[0] || "mp3";
          } catch { return "mp3"; }
        })();
        const filename = `${base}.${ext}`;

        // Try simple anchor first
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();

        // Fallback: fetch -> blob (if CORS permits)
        setTimeout(async () => {
          try {
            const res = await fetch(url, { mode: "cors" });
            if (!res.ok) return;
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
          } catch {}
        }, 50);
      } finally {
        hideMoreMenu();
      }
    });
  }
  if (addToPlBtn) {
    addToPlBtn.addEventListener("click", () => {
      try { window.dispatchEvent(new CustomEvent('musicbox:addtoplaylist', { detail: { index } })); } catch {}
      hideMoreMenu();
    });
  }

  // Toggle Follow button (per-artist)
  if (bFollow) {
    bFollow.addEventListener('click', () => {
      try {
        const t = playlist[index] || {};
        const key = normArtist(t.artist || '');
        if (!key) return;
        const set = getFollowedArtists();
        if (set.has(key)) set.delete(key); else set.add(key);
        saveFollowedArtists(set);
        updateFollowUI(t.artist || '');
      } catch {}
    });
  }

  audio.addEventListener("timeupdate", () => {
    const pct = (audio.currentTime / audio.duration) * 100;
    const val = isFinite(pct) ? Math.round(pct) : 0;
    progress.value = val;
    progress.setAttribute("aria-valuenow", String(val));
    try { progress.style.setProperty('--progress-value', val + '%'); } catch {}
    currentTimeEl.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("ended", () => {
    if (isAdPlaying) { endAdThenResume(); }
    else if (isPremiumOn()) { nextTrack(true); }
    else { startAdThen(() => nextTrack(true)); }
  });
  // Prevent pausing ad
  audio.addEventListener("pause", () => {
    if (isAdPlaying) {
      try { audio.play(); } catch {}
    }
  });

  progress.addEventListener("input", (e) => {
    if (isAdPlaying) return; // block seeking during ad
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

  function toggleMobileVolume(e) {
    if (window.innerWidth > 900) return;
    const right = volIcon.closest('.right');
    if (!right) return;
    e.stopPropagation();
    right.classList.toggle('show-volume');
  }
  function hideMobileVolume() {
    const right = document.querySelector('.right.show-volume');
    if (right) right.classList.remove('show-volume');
  }
  volIcon.addEventListener('click', toggleMobileVolume);
  document.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return;
    const right = document.querySelector('.right');
    if (right && (right.contains(e.target) || e.target === volIcon)) return;
    hideMobileVolume();
  }, true);
  window.addEventListener('resize', () => { if (window.innerWidth > 900) hideMobileVolume(); });

  // ===== Keep bottom spacing in sync with actual player height =====
  function updatePlayerBottomSpace() {
    try {
      const p = document.querySelector('.player');
      if (!p) return;
      const h = p.offsetHeight || 0;
      document.documentElement.style.setProperty('--player-bottom-space', h + 'px');
    } catch {}
  }
  // Initial measure and on resize/orientation
  updatePlayerBottomSpace();
  window.addEventListener('resize', updatePlayerBottomSpace);
  window.addEventListener('orientationchange', updatePlayerBottomSpace);

  // ===== Init =====
  updateShuffleA11y();
  updateRepeatA11y();
  // Load playlist from JSON and then render UI
  loadPlaylistFromJSON();

  // ===== Queue toggle từ tiêu đề bài hát trong player =====
  const titleClickable = titleEl;
  function setQueueVisible(show, fromPop = false) {
    if (!queuePanel) return;
    queuePanel.classList.toggle("hidden", !show);
    if (playlistSection) playlistSection.classList.toggle("hidden", show);

    if (recentBtn) recentBtn.setAttribute("aria-expanded", String(show));
    if (show) {
      if (qTitle && !qTitle.hasAttribute("tabindex")) qTitle.setAttribute("tabindex", "-1");
      setTimeout(() => qTitle?.focus(), 0);
    } else {
      recentBtn?.focus();
    }
    // Toggle a body state class so CSS can target small-screen layout when queue is open
    try { document.body.classList.toggle("queue-open", !!show); } catch {}
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
    const state = { index, queueOpen: queuePanel ? !queuePanel.classList.contains("hidden") : false };
    try { history.pushState(state, ""); } catch {}
  }
  try { history.replaceState({ index, queueOpen: queuePanel ? !queuePanel.classList.contains("hidden") : false }, ""); } catch {}
  window.addEventListener("popstate", (e) => {
    const s = e.state; if (!s) return;
    loadTrack(s.index);
    if (isPlaying) play(); else setPlayUI(false);
    setQueueVisible(!!s.queueOpen, true);
  });

  // (disabled) Auto-open Queue on small screens was removed per request.

  // ===== Profile dropdown =====
  const profileBtn = document.getElementById("profile-btn");
  const profileMenu = document.getElementById("profile-menu");
  const profileOpen = document.getElementById("profile-open");
  const profileLogout = document.getElementById("profile-logout");

  function closeProfileMenu() {
    if (!profileMenu) return;
    profileMenu.classList.remove("open");
    profileMenu.setAttribute("aria-hidden", "true");
    document.removeEventListener("click", onProfileDoc, true);
    document.removeEventListener("keydown", onProfileEsc, true);
  }
  function onProfileDoc(e) {
    if (!profileMenu || !profileBtn) return;
    if (profileMenu.contains(e.target) || profileBtn.contains(e.target)) return;
    closeProfileMenu();
  }
  function onProfileEsc(e) { if (e.key === "Escape") closeProfileMenu(); }

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", () => {
      const open = profileMenu.classList.toggle("open");
      profileMenu.setAttribute("aria-hidden", String(!open));
      if (open) {
        document.addEventListener("click", onProfileDoc, true);
        document.addEventListener("keydown", onProfileEsc, true);
      } else closeProfileMenu();
    });
  }
  if (profileOpen) {
    profileOpen.addEventListener("click", () => {
      closeProfileMenu();
      try { go("./Hoso.html"); } catch { window.location.href = "./Hoso.html"; }
    });
  }
  if (profileLogout) {
    profileLogout.addEventListener("click", () => {
      closeProfileMenu();
      try { localStorage.removeItem("auth_user"); } catch {}
      try { go("./landingpage.html"); } catch { window.location.href = "./landingpage.html"; }
    });
  }

  // ===== Search enter "son tung" -> timkiem.html =====
  const searchInput = document.querySelector('.search input[type="search"]');
  if (searchInput) {
    const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const raw = searchInput.value;
      const q = normalize(raw);
      if (q.length === 0) return;
      go("./timkiem.html?q=" + encodeURIComponent(raw));
    });
  }

  // ===== Premium button: toggle crown yellow on click + persist
  const premiumBtn = document.querySelector(".premium-btn");
  const PREMIUM_KEY = "premium_enabled";
  function applyPremiumState(on) {
    if (!premiumBtn) return;
    premiumBtn.setAttribute("aria-pressed", String(on));
    premiumBtn.classList.toggle("active", on);
    premiumBtn.setAttribute("title", on ? "Premium (on)" : "Premium");
  }
  // Initialize from storage
  try {
    const saved = localStorage.getItem(PREMIUM_KEY);
    if (saved !== null) applyPremiumState(saved === "true");
  } catch {}
  // Click to toggle and save
  if (premiumBtn) {
    premiumBtn.addEventListener("click", () => {
      const now = premiumBtn.getAttribute("aria-pressed") === "true" ? false : true;
      applyPremiumState(now);
      try { localStorage.setItem(PREMIUM_KEY, String(now)); } catch {}
    });
  }

  // Logo link smooth
  const logoLink = document.querySelector("a.logo-link");
  if (logoLink) {
    logoLink.addEventListener("click", (e) => { e.preventDefault(); go(logoLink.getAttribute("href") || "./index.html"); });
  }

  // ===== Smoke tests nho nhỏ =====
  try {
    console.assert(getComputedStyle(document.querySelector(".header")).display === "flex", "Header cần là flex");
  } catch {}
  console.assert(document.getElementById("b-title").textContent.length >= 0, "Banner title phải được gán sau loadTrack");
  (function smokeTests() {
    console.assert(playIcon.classList.contains("fa-play") && !playIcon.classList.contains("fa-pause"), "Nút play phải hiển thị biểu tượng play khi khởi động");
    console.assert(document.querySelectorAll(".q-item").length >= playlist.length, "Queue phải được render đủ items");
    // defer navigation tests until data is loaded
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
