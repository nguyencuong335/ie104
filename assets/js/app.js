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
  // Persist paused player state so next app load won't auto-play
  try {
    logoutInProgress = true;
    // Pause immediately in current session
    try { if (window.__mbAudio) window.__mbAudio.pause(); } catch {}
    try { pause(); setPlayUI(false); } catch {}
    savePlayerState(true);
    const KEY = 'player_state_v1';
    const raw = localStorage.getItem(KEY);
    let s = null; try { s = raw ? JSON.parse(raw) : null; } catch {}
    const patch = s ? { ...s, isPlaying: false } : {
      index: 0, currentTime: 0, isPlaying: false, volume: 0.8, shuffle: false, repeatMode: 'off', queueOpen: false, ts: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(patch));
  } catch {}
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

  // ===== Expose minimal API for other pages (mutable for later extensions) =====
  try {
    window.MusicBox = Object.assign({}, window.MusicBox || {}, {
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
        "playlist.html": ".menu-btn.your",
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

  // ===== Profile page: sync 'Playlist đã tạo' =====
  function syncProfilePlaylists() {
    try {
      const wrap = document.querySelector('.my-playlists');
      if (!wrap) return; // not on profile page
      const lists = getUserPlaylists();
      // Update section title count
      const titleEl = Array.from(document.querySelectorAll('.section-title'))
        .find(el => /Playlist\s+đã\s+tạo/i.test(el.textContent));
      if (titleEl) {
        titleEl.textContent = `Playlist đã tạo (${lists.length})`;
      }
      // Ensure there are enough cards; reuse existing ones
      let cards = Array.from(wrap.querySelectorAll('.my-pl-card'));
      // Create missing cards if needed
      while (cards.length < lists.length) {
        const card = document.createElement('div');
        card.className = 'my-pl-card';
        card.innerHTML = `
          <div class="my-pl-cover"></div>
          <div class="my-pl-name"></div>
          <div class="my-pl-sub"></div>
        `;
        wrap.appendChild(card);
        cards.push(card);
      }
      // Helper: truncate display name to 40 chars with ellipsis
      function trunc40(s){ const t = String(s||''); return t.length>40 ? (t.slice(0,37)+'...') : t; }
      // Update cards with playlist data
      cards.forEach((card, i) => {
        const pl = lists[i];
        if (!pl) { card.style.display = 'none'; return; }
        card.style.display = '';
        card.dataset.plId = pl.id;
        const cover = card.querySelector('.my-pl-cover');
        if (cover) cover.style.backgroundImage = `url('${pl.cover || './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg'}')`;
        const name = card.querySelector('.my-pl-name');
        if (name) name.textContent = trunc40(pl.name || 'Playlist');
        const sub = card.querySelector('.my-pl-sub');
        if (sub) sub.textContent = `${Array.isArray(pl.tracks) ? pl.tracks.length : 0} bài hát`;
        // actions (rename/change-cover/delete)
        let acts = card.querySelector('.my-pl-actions');
        if (!acts) {
          acts = document.createElement('div');
          acts.className = 'my-pl-actions';
          const btnRename = document.createElement('button');
          btnRename.className = 'btn tiny edit';
          btnRename.title = 'Đổi tên playlist';
          btnRename.setAttribute('aria-label', 'Đổi tên playlist');
          btnRename.innerHTML = '<i class="fa-solid fa-pen"></i>';
          const btnCover = document.createElement('button');
          btnCover.className = 'btn tiny cover';
          btnCover.title = 'Đổi ảnh playlist';
          btnCover.setAttribute('aria-label', 'Đổi ảnh playlist');
          btnCover.innerHTML = '<i class="fa-regular fa-image"></i>';
          const btnDel = document.createElement('button');
          btnDel.className = 'btn tiny danger delete';
          btnDel.title = 'Xóa playlist';
          btnDel.setAttribute('aria-label', 'Xóa playlist');
          btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
          acts.appendChild(btnRename);
          acts.appendChild(btnCover);
          acts.appendChild(btnDel);
          card.appendChild(acts);
          // style controlled by CSS in Hoso.css (.my-pl-actions .btn.tiny)
          // stop navigation when clicking actions
          acts.addEventListener('click', (e)=> e.stopPropagation());
          btnRename.addEventListener('click', ()=>{
            try {
              const lists2 = getUserPlaylists();
              const idx = lists2.findIndex(x=>x.id===pl.id);
              if (idx<0) return;
              const curr = lists2[idx];
              const v = window.prompt('Đổi tên playlist', curr.name || 'Playlist');
              if (v==null) return;
              let nameNew = v.trim().replace(/\s+/g,' ');
              if (!nameNew) return;
              if (nameNew.length > 40) { window.alert('Tên playlist tối đa 40 ký tự'); return; }
              curr.name = nameNew;
              setUserPlaylists(lists2);
              syncProfilePlaylists();
            } catch {}
          });
          btnCover.addEventListener('click', ()=>{
            try {
              const lists2 = getUserPlaylists();
              const idx = lists2.findIndex(x=>x.id===pl.id);
              if (idx<0) return;
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
              document.body.appendChild(input);
              const finalize = (dataUrl)=>{
                try {
                  if (dataUrl) lists2[idx].cover = dataUrl;
                  setUserPlaylists(lists2);
                  // immediate UI update
                  const coverEl = card.querySelector('.my-pl-cover');
                  if (coverEl) coverEl.style.backgroundImage = `url('${lists2[idx].cover || ''}')`;
                } catch {}
                try { input.remove(); } catch {}
              };
              input.addEventListener('change', ()=>{
                const file = input.files && input.files[0];
                if (!file) { finalize(null); return; }
                const reader = new FileReader();
                reader.onload = ()=> finalize(typeof reader.result==='string' ? reader.result : null);
                reader.onerror = ()=> finalize(null);
                reader.readAsDataURL(file);
              }, { once: true });
              input.click();
            } catch {}
          });
          btnDel.addEventListener('click', ()=>{
            try {
              const ok = window.confirm('Xóa playlist này?');
              if (!ok) return;
              const lists2 = getUserPlaylists();
              const idx = lists2.findIndex(x=>x.id===pl.id);
              if (idx<0) return;
              lists2.splice(idx,1);
              setUserPlaylists(lists2);
              syncProfilePlaylists();
            } catch {}
          });
        }
        // Wire click to navigate
        card.onclick = () => {
          try { go(`./playlist.html?id=${encodeURIComponent(pl.id)}`); }
          catch { window.location.href = `./playlist.html?id=${encodeURIComponent(pl.id)}`; }
        };
      });
    } catch {}
  }
  // Run once on load and on changes
  syncProfilePlaylists();
  window.addEventListener('playlists:changed', syncProfilePlaylists);

  // Queue visibility helpers
  function closeQueue() {
    try {
      document.body.classList.remove('queue-open');
      document.querySelectorAll('.queue').forEach(q => q.classList.add('hidden'));
    } catch {}
  }
  function openQueue() {
    try {
      document.body.classList.add('queue-open');
      document.querySelectorAll('.queue').forEach(q => q.classList.remove('hidden'));
    } catch {}
  }
  // Always hide Queue by default on page load (it will be shown explicitly elsewhere)
  closeQueue();
  // Inject global CSS guard for queue visibility
  (function ensureQueueCSS(){
    try {
      if (!document.getElementById('queue-visibility-style')) {
        const s = document.createElement('style');
        s.id = 'queue-visibility-style';
        s.textContent = `.queue{display:none !important;} body.queue-open .queue{display:block !important;}`;
        document.head.appendChild(s);
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
  let allSongs = [];
  let currentPlaylistCtx = { type: 'global', id: null };
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
      // Keep full catalog separate from current queue
      allSongs = data;
      // If we are on index.html, always default to full catalog
      const curFile = (location.pathname.split('/').pop() || '').toLowerCase();
      if (curFile === 'index.html' || curFile === '') {
        currentPlaylistCtx = { type: 'global', id: null };
        playlist.splice(0, playlist.length, ...allSongs);
        renderQueue();
      } else if (!rehydratePlaylistFromSavedContext()) {
        // Otherwise, default to full catalog
        currentPlaylistCtx = { type: 'global', id: null };
        playlist.splice(0, playlist.length, ...allSongs);
        renderQueue();
      }
      // Try restore previous state on top
      if (!restorePlayerState()) {
        loadTrack(0);
        audio.volume = Number(volume.value);
        volume.setAttribute("aria-valuenow", String(audio.volume));
        progress.setAttribute("aria-valuenow", "0");
        setPlayUI(false);
        try { updateVolumeSlider(); } catch {}
      }
      console.assert(playlist.length >= 3, "Playlist phải có >= 3 bài");
      // simple smoke after data ready
      try { nextTrack(false); prevTrack(); } catch (err) { console.error("next/prev throw", err); }
    } catch (err) {
      console.error("Không thể tải playlist từ songs.json:", err);
      // Fallback to built-in playlist
      allSongs = fallbackPlaylist;
      const curFile2 = (location.pathname.split('/').pop() || '').toLowerCase();
      if (curFile2 === 'index.html' || curFile2 === '') {
        currentPlaylistCtx = { type: 'global', id: null };
        playlist.splice(0, playlist.length, ...allSongs);
        renderQueue();
      } else if (!rehydratePlaylistFromSavedContext()) {
        currentPlaylistCtx = { type: 'global', id: null };
        playlist.splice(0, playlist.length, ...allSongs);
        renderQueue();
      }
      if (!restorePlayerState()) {
        loadTrack(0);
        audio.volume = Number(volume.value);
        volume.setAttribute("aria-valuenow", String(audio.volume));
        progress.setAttribute("aria-valuenow", "0");
        setPlayUI(false);
        try { updateVolumeSlider(); } catch {}
      }
      console.warn("Đang sử dụng fallback playlist nội bộ");
    }
  }

  function rehydratePlaylistFromSavedContext() {
    try {
      const s = getSavedPlayerState();
      if (!s || !s.playlistCtx) return false;
      if (s.playlistCtx.type === 'user' && Array.isArray(s.trackIds) && s.trackIds.length) {
        // Map ids to allSongs
        const map = new Map((allSongs || []).map(o => [o.id, o]));
        const tracks = s.trackIds.map(id => map.get(id)).filter(Boolean);
        if (tracks.length) {
          currentPlaylistCtx = { type: 'user', id: s.playlistCtx.id || null };
          playlist.splice(0, playlist.length, ...tracks);
          renderQueue();
          return true;
        }
      }
      return false;
    } catch { return false; }
  }

  // ===== State & Elements =====
  const audio = new Audio();
  try { window.__mbAudio = audio; } catch {}
  let index = 0, isPlaying = false, shuffle = false, repeatMode = "off"; // 'off' | 'all' | 'one'
  // Ad state
  let isAdPlaying = false;
  let adAfterCallback = null;
  // When logging out, force persisted state to paused
  let logoutInProgress = false;

  // First visit in this browser session -> force paused state
  const FIRST_VISIT = (() => {
    try {
      const v = !sessionStorage.getItem('app_started');
      sessionStorage.setItem('app_started', '1');
      return v;
    } catch { return false; }
  })();

  // If a new auth_user appears in this session, treat as just logged in
  let JUST_LOGGED_IN = false;
  try {
    const uNow = localStorage.getItem('auth_user') || '';
    const uSeen = sessionStorage.getItem('seen_auth_user') || '';
    if (uNow && uNow !== uSeen) {
      JUST_LOGGED_IN = true;
      sessionStorage.setItem('seen_auth_user', uNow);
    }
  } catch {}

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

  // ===== Header avatar sync =====
  function getAvatarKey() {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      if (u && (u.id || u.email)) return `avatar_${u.id || u.email}`;
    } catch {}
    return 'avatar_guest';
  }
  function applyHeaderAvatar() {
    try {
      const btn = document.querySelector('.profile-btn');
      if (!btn) return;
      const data = localStorage.getItem(getAvatarKey());
      if (data) {
        btn.classList.add('has-avatar');
        btn.style.backgroundImage = `url('${data}')`;
      } else {
        btn.classList.remove('has-avatar');
        btn.style.backgroundImage = '';
      }
    } catch {}
  }
  applyHeaderAvatar();
  window.addEventListener('avatar:changed', applyHeaderAvatar);

  // ===== Playlists (user/demo) =====
  function getUserPlaylists() {
    try { return JSON.parse(localStorage.getItem('user_playlists_v1') || '[]'); } catch { return []; }
  }
  function setUserPlaylists(arr) {
    try { localStorage.setItem('user_playlists_v1', JSON.stringify(arr)); try { window.dispatchEvent(new Event('playlists:changed')); } catch {} } catch {}
  }
  function ensureDemoPlaylists() {
    const cur = getUserPlaylists();
    if (Array.isArray(cur) && cur.length) return;
    const demos = [
      { id: 'pl_chill', name: 'My Chill Mix', cover: './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg', tracks: [
        'son_tung_mtp/muon_roi_ma_sao_con','son_tung_mtp/noi_nay_co_anh','son_tung_mtp/chung_ta_cua_hien_tai','tlinh/gai_doc_than'
      ]},
      { id: 'pl_focus', name: 'Suy tí thôi', cover: './assets/imgs/danh_sach_da_tao/anh_playlist_2.jpg', tracks: [
        'han_sara/dem_cuu','han_sara/do_anh_si','han_sara/giong_nhu_em','han_sara/xinh'
      ]},
      { id: 'pl_study', name: 'IELTS', cover: './assets/imgs/danh_sach_da_tao/anh_playlist_3.jpg', tracks: [
        'truc_nhan/sang_mat_chua','truc_nhan/made_in_vietnam','truc_nhan/lon_roi_con_khoc_nhe'
      ]},
    ];
    setUserPlaylists(demos);
  }
  ensureDemoPlaylists();

  // Expose a way to set current playlist to the player and re-render queue
  function setPlaylist(tracksArray, ctx) {
    try {
      if (!Array.isArray(tracksArray) || !tracksArray.length) return;
      playlist.splice(0, playlist.length, ...tracksArray);
      currentPlaylistCtx = ctx && ctx.type ? ctx : { type: 'global', id: null };
      renderQueue();
      loadTrack(0);
      setPlayUI(false);
      savePlayerState(true);
    } catch {}
  }
  try { window.MusicBox = Object.assign(window.MusicBox || {}, {
    setPlaylist: (tracks, ctx)=>{ try { if (isAdPlaying) return; setPlaylist(tracks, ctx); } catch {} },
    playAt: (i)=>{ try { if (isAdPlaying) return; loadTrack(i); play(); savePlayerState(true); } catch {} },
    pause: ()=>{ try { pause(); savePlayerState(true); } catch {} },
    resume: ()=>{ try { if (isAdPlaying) return; play(); savePlayerState(true); } catch {} },
    isPlaying: ()=>{ try { return !!isPlaying; } catch { return false; } }
  }); } catch {}

  // Sidebar navigation to playlist page
  function renderSidebarPlaylists() {
    try {
      const container = document.querySelector('.pl-list');
      if (!container) return;
      const lists = getUserPlaylists();
      container.innerHTML = '';
      function trunc40(s){ const t = String(s||''); return t.length>40 ? (t.slice(0,37)+'...') : t; }
      lists.slice(0, 4).forEach((pl) => {
        const row = document.createElement('div');
        row.className = 'pl-item';
        row.dataset.plId = pl.id;
        row.innerHTML = `
          <div class="pl-cover" style="background-image: url('${pl.cover || './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg'}');"></div>
          <div class="pl-meta"><div class="pl-name">${trunc40(pl.name || 'Playlist')}</div><div class="pl-sub">Playlist • ${pl.tracks?.length || 0} songs</div></div>
        `;
        container.appendChild(row);
      });
    } catch {}
  }
  function wireSidebarPlaylists() {
    try {
      const items = document.querySelectorAll('.pl-list .pl-item');
      const demoIds = ['pl_chill','pl_focus','pl_study'];
      items.forEach((it, i) => {
        if (!it.dataset.plId) it.dataset.plId = demoIds[i] || `pl_${i+1}`;
        it.addEventListener('click', () => {
          const id = it.dataset.plId;
          try { go(`./playlist.html?id=${encodeURIComponent(id)}`); } catch { window.location.href = `./playlist.html?id=${encodeURIComponent(id)}`; }
        });
      });
    } catch {}
  }
  renderSidebarPlaylists();
  wireSidebarPlaylists();

  // Sidebar: Add new playlist
  (function wireCreatePlaylist(){
    try {
      const addBtn = document.querySelector('.menu .icon-btn.add');
      if (!addBtn) return;
      function slugify(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,'_').replace(/[^a-z0-9_\-]/g,''); }
      // local toast helpers (safe if already defined elsewhere)
      (function ensureToastStyle(){
        try{
          if (document.getElementById('toast-style')) return;
          const s = document.createElement('style');
          s.id = 'toast-style';
          s.textContent = `
            .toast-wrap{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
            .toast{min-width:240px;max-width:90vw;padding:10px 14px;border-radius:10px;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);transition:opacity .2s ease, transform .2s ease}
            .toast.show{opacity:1;transform:translateY(0)}
            .toast.success{background:#1f8b4c}
            .toast.error{background:#a23b3b}
          `;
          document.head.appendChild(s);
        }catch{}
      })();
      function getToastWrap(){ let w = document.querySelector('.toast-wrap'); if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); } return w; }
      function showToast(msg, type){ try{ const w = getToastWrap(); const el = document.createElement('div'); el.className = 'toast ' + (type==='error'?'error':'success'); el.textContent = String(msg||''); w.appendChild(el); requestAnimationFrame(()=> el.classList.add('show')); setTimeout(()=>{ try{ el.classList.remove('show'); setTimeout(()=> el.remove(), 200); }catch{} }, 1800); }catch{} }
      addBtn.addEventListener('click', ()=>{
        try {
          const lists = getUserPlaylists();
          let name = window.prompt('Tên playlist mới', 'Playlist mới');
          if (name==null) return;
          name = name.trim().replace(/\s+/g,' ');
          if (!name) return;
          if (name.length > 40) { try{ showToast('Tên tối đa 40 ký tự', 'error'); }catch{} return; }
          let base = 'pl_' + slugify(name || 'new');
          let id = base || ('pl_' + Date.now());
          let i = 1;
          const ids = new Set((lists||[]).map(p=>p && p.id));
          while (ids.has(id)) { id = base + '_' + (++i); }
          // Ask for cover via file picker (optional)
          const input = document.createElement('input');
          input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none';
          document.body.appendChild(input);
          const fallbackCover = './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg';
          const finalize = (cover)=>{
            const pl = { id, name, cover: cover || fallbackCover, tracks: [] };
            lists.push(pl);
            setUserPlaylists(lists);
            showToast('Tạo thành công', 'success');
            try { input.remove(); } catch {}
          };
          input.addEventListener('change', ()=>{
            const file = input.files && input.files[0];
            if (!file) { finalize(null); return; }
            const reader = new FileReader();
            reader.onload = ()=>{ const dataUrl = typeof reader.result==='string' ? reader.result : null; finalize(dataUrl); };
            reader.onerror = ()=> finalize(null);
            reader.readAsDataURL(file);
          }, { once: true });
          // Open picker; if user cancels, still create with fallback after a short delay
          input.click();
          setTimeout(()=>{ try{ if (!input.files || !input.files.length) finalize(null); } catch {} }, 600);
        } catch {}
      });
    } catch {}
  })();

  // Sync sidebar playlist counts/names/covers to user data on all pages
  (function syncSidebarPlaylists() {
    try {
      const lists = getUserPlaylists();
      const items = document.querySelectorAll('.pl-list .pl-item');
      items.forEach((it, i) => {
        const pl = lists[i]; if (!pl) return;
        it.dataset.plId = pl.id;
        const cover = it.querySelector('.pl-cover');
        if (cover) cover.style.backgroundImage = `url('${pl.cover || './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg'}')`;
        const name = it.querySelector('.pl-name');
        if (name) { const t = String(pl.name||name.textContent); name.textContent = t.length>40 ? (t.slice(0,37)+'...') : t; }
        const sub = it.querySelector('.pl-sub');
        if (sub) sub.textContent = `Playlist • ${Array.isArray(pl.tracks) ? pl.tracks.length : 0} songs`;
      });
    } catch {}
  })();
  window.addEventListener('playlists:changed', () => {
    try {
      const lists = getUserPlaylists();
      const container = document.querySelector('.pl-list');
      if (!container) return;
      // Re-render sidebar items to include new playlists
      container.innerHTML = '';
      function trunc40(s){ const t = String(s||''); return t.length>40 ? (t.slice(0,37)+'...') : t; }
      lists.slice(0, 4).forEach((pl) => {
        const row = document.createElement('div');
        row.className = 'pl-item';
        row.dataset.plId = pl.id;
        row.innerHTML = `
          <div class="pl-cover" style="background-image: url('${pl.cover || './assets/imgs/danh_sach_da_tao/anh_playlist_1.jpg'}');"></div>
          <div class="pl-meta"><div class="pl-name">${trunc40(pl.name || 'Playlist')}</div><div class="pl-sub">Playlist • ${(pl.tracks?.length || 0)} songs</div></div>
        `;
        row.addEventListener('click', () => {
          try { go(`./playlist.html?id=${encodeURIComponent(pl.id)}`); }
          catch { window.location.href = `./playlist.html?id=${encodeURIComponent(pl.id)}`; }
        });
        container.appendChild(row);
      });
    } catch {}
  });

  // Add-to-playlist: open a simple picker modal and add current track to chosen playlist
  (function wireAddToPlaylist() {
    try {
      const btn = document.getElementById('add-to-playlist');
      if (!btn) return;

      // Ensure minimal styles for modal
      (function ensurePickerStyle(){
        try {
          if (document.getElementById('pl-picker-style')) return;
          const s = document.createElement('style');
          s.id = 'pl-picker-style';
          s.textContent = `
            .pl-picker-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999}
            .pl-picker{background:#111418;color:#fff;min-width:360px;max-width:520px;width:92vw;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.45);overflow:hidden}
            .pl-picker .hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);font-weight:700;font-size:16px}
            .pl-picker .list{max-height:60vh;overflow:auto}
            .pl-picker .row{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:12px 16px;cursor:pointer}
            .pl-picker .row:hover{background:rgba(255,255,255,.06)}
            .pl-picker .row .cover{width:44px;height:44px;border-radius:8px;background-size:cover;background-position:center}
            .pl-picker .row .name{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:15px}
            .pl-picker .row .count{opacity:.85;min-width:48px;text-align:right}
            .pl-picker .btn{background:#2a2f36;color:#e5e7eb;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1;box-sizing:border-box;white-space:nowrap}
            .pl-picker .hd .close-btn{background:transparent;border:none;padding:0;color:#e5e7eb;cursor:pointer;border-radius:0}
            .pl-picker .hd .close-btn:hover{color:#ffffff;text-decoration:underline;background:transparent;border-color:transparent}
            .pl-picker .hd .close-btn:focus{outline:none;text-decoration:underline}
            .pl-picker .btn:hover{background:#39414b;color:#fff}
            .pl-picker .row.is-exist{opacity:.6;cursor:not-allowed}
            .pl-picker .row .tag{font-size:12px;opacity:.9;background:#2a2f36;padding:2px 6px;border-radius:999px}
            @media (max-width: 420px){ .pl-picker{min-width:300px} .pl-picker .row{grid-template-columns:auto 1fr auto} }
          `;
          document.head.appendChild(s);
        } catch {}
      })();

      // Toast styles & helpers
      (function ensureToastStyle(){
        try{
          if (document.getElementById('toast-style')) return;
          const s = document.createElement('style');
          s.id = 'toast-style';
          s.textContent = `
            .toast-wrap{position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
            .toast{min-width:240px;max-width:90vw;padding:10px 14px;border-radius:10px;color:#fff;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.3);opacity:0;transform:translateY(-6px);transition:opacity .2s ease, transform .2s ease}
            .toast.show{opacity:1;transform:translateY(0)}
            .toast.success{background:#1f8b4c}
            .toast.error{background:#a23b3b}
          `;
          document.head.appendChild(s);
        }catch{}
      })();
      function getToastWrap(){
        let w = document.querySelector('.toast-wrap');
        if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
        return w;
      }
      function showToast(msg, type){
        try{
          const w = getToastWrap();
          const el = document.createElement('div');
          el.className = 'toast ' + (type==='error'?'error':'success');
          el.textContent = String(msg||'');
          w.appendChild(el);
          requestAnimationFrame(()=> el.classList.add('show'));
          setTimeout(()=>{ try{ el.classList.remove('show'); setTimeout(()=> el.remove(), 200); }catch{} }, 1800);
        }catch{}
      }

      function closePicker(ov){ try { if (ov && ov.parentNode) ov.parentNode.removeChild(ov); } catch {} }

      function openPicker(trackId){
        if (!trackId) return;
        const lists = getUserPlaylists();
        if (!Array.isArray(lists) || !lists.length) return;
        const ov = document.createElement('div');
        ov.className = 'pl-picker-overlay';
        ov.innerHTML = `
          <div class="pl-picker" role="dialog" aria-modal="true" aria-label="Chọn playlist">
            <div class="hd"><span>Chọn playlist</span><button class="btn close-btn" data-act="close" aria-label="Đóng">Đóng</button></div>
            <div class="list"></div>
          </div>
        `;
        const listEl = ov.querySelector('.list');
        lists.forEach(pl => {
          const row = document.createElement('div');
          row.className = 'row';
          row.setAttribute('data-pl-id', pl.id);
          const has = Array.isArray(pl.tracks) && pl.tracks.includes(trackId);
          row.innerHTML = `
            <div class="cover" style="background-image:url('${(pl.cover||'').replace(/"/g,'&quot;')}')"></div>
            <div class="name">${(pl.name||'Playlist')}</div>
            <div class="count">${Array.isArray(pl.tracks)?pl.tracks.length:0} bài</div>
            ${has?'<span class="tag" style="margin-right:4px;">Đã có</span>':''}
          `;
          if (has) row.classList.add('is-exist');
          listEl.appendChild(row);
        });
        document.body.appendChild(ov);

        const onSelect = (plId)=>{
          try {
            const arr = getUserPlaylists();
            const idx = arr.findIndex(x=>x && x.id===plId);
            if (idx<0) { closePicker(ov); return; }
            const target = arr[idx];
            if (!Array.isArray(target.tracks)) target.tracks = [];
            if (!target.tracks.includes(trackId)) target.tracks.push(trackId);
            setUserPlaylists(arr);
            showToast('Đã thêm vào '+(target.name||'playlist'), 'success');
          } catch { showToast('Không thể thêm vào playlist', 'error'); }
          closePicker(ov);
        };

        // Wire events
        ov.addEventListener('click', (e)=>{
          const t = e.target;
          if (t instanceof Element) {
            if (t.classList.contains('pl-picker-overlay')) { closePicker(ov); return; }
            const act = t.getAttribute('data-act');
            if (act === 'close') { closePicker(ov); return; }
            const row = t.closest('.row');
            if (row && row.classList.contains('is-exist')) { return; }
            if (row && row.getAttribute('data-pl-id')) { onSelect(row.getAttribute('data-pl-id')); }
          }
        });
        const onKey = (ev)=>{ if (ev.key === 'Escape') { ev.preventDefault(); closePicker(ov); window.removeEventListener('keydown', onKey, true); } };
        window.addEventListener('keydown', onKey, true);
      }

      btn.addEventListener('click', () => {
        try {
          const current = playlist[index];
          const trackId = current && current.id ? current.id : null;
          if (!trackId) { showToast('Không thể thêm: bài không hợp lệ', 'error'); return; }
          const lists = getUserPlaylists();
          if (!Array.isArray(lists) || !lists.length) { showToast('Chưa có playlist nào', 'error'); return; }
          openPicker(trackId);
        } catch { showToast('Đã xảy ra lỗi', 'error'); }
      });
    } catch {}
  })();

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
  // Detect browser reload navigation (not cross-page navigation)
  function isReloadNavigation(){
    try {
      const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (nav && nav[0] && typeof nav[0].type === 'string') return nav[0].type === 'reload';
      // fallback (deprecated API)
      if (performance && performance.navigation && typeof performance.navigation.type === 'number') return performance.navigation.type === 1;
    } catch {}
    return false;
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

  // ===== Persist player state across pages =====
  const PLAYER_STATE_KEY = 'player_state_v1';
  let lastStateSavedAt = 0;
  function savePlayerState(force = false) {
    if (isAdPlaying) return; // avoid saving ad as track
    const now = Date.now();
    if (!force && now - lastStateSavedAt < 500) return; // throttle
    lastStateSavedAt = now;
    try {
      const s = {
        index,
        currentTime: Math.max(0, Math.min(audio.currentTime || 0, isFinite(audio.duration) ? audio.duration - 0.2 : 1e9)),
        isPlaying: logoutInProgress ? false : (!!isPlaying && !isAdPlaying),
        volume: Number.isFinite(audio.volume) ? audio.volume : 0.8,
        shuffle: !!shuffle,
        repeatMode,
        queueOpen: document.body.classList.contains('queue-open'),
        ts: now,
        playlistCtx: currentPlaylistCtx,
        trackIds: (playlist||[]).map(t => t && t.id).filter(Boolean),
        currentId: (playlist && playlist[index] && playlist[index].id) ? playlist[index].id : null
      };
      localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(s));
    } catch {}
  }
  function getSavedPlayerState() {
    try {
      const raw = localStorage.getItem(PLAYER_STATE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    } catch { return null; }
  }
  function restorePlayerState() {
    const s = getSavedPlayerState();
    if (!s) return false;
    try {
      // sanity checks
      if (typeof s.index !== 'number' || s.index < 0 || s.index >= playlist.length) return false;
      if (typeof s.volume === 'number') {
        audio.volume = Math.min(1, Math.max(0, s.volume));
        volume.value = String(audio.volume);
        volume.setAttribute('aria-valuenow', String(audio.volume));
        try { updateVolumeSlider(); } catch {}
      }
      if (s.shuffle === true || s.shuffle === false) {
        shuffle = !!s.shuffle;
        shuffleBtn.classList.toggle('active', shuffle);
        updateShuffleA11y();
      }
      if (s.repeatMode === 'off' || s.repeatMode === 'all' || s.repeatMode === 'one') {
        repeatMode = s.repeatMode;
        repeatBtn.dataset.mode = repeatMode;
        repeatBtn.classList.toggle('active', repeatMode !== 'off');
        updateRepeatA11y();
      }
      // Decide which index to load: prefer mapping by currentId if present
      let targetIndex = s.index;
      try {
        if (s.currentId) {
          const found = (playlist || []).findIndex(t => t && t.id === s.currentId);
          if (found >= 0) targetIndex = found;
        }
      } catch {}
      loadTrack(targetIndex);
      const applyTime = () => {
        if (typeof s.currentTime === 'number' && isFinite(audio.duration)) {
          audio.currentTime = Math.min(audio.duration - 0.2, Math.max(0, s.currentTime));
        }
      };
      if (isFinite(audio.duration)) applyTime(); else audio.addEventListener('loadedmetadata', applyTime, { once: true });
      // Decide paused/playing on load
      // Always paused on explicit reloads
      if (isReloadNavigation()) {
        pause();
        setPlayUI(false);
      } else {
        // Force paused on first visit OR right after login in this session
        if (!FIRST_VISIT && !JUST_LOGGED_IN && s.isPlaying) {
          play();
        } else {
          setPlayUI(false);
        }
      }
      closeQueue();
      return true;
    } catch { return false; }
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
    try {
      if (queueListEl) {
        queueListEl.setAttribute('aria-disabled', 'true');
      }
    } catch {}
    try { document.body.classList.add('ad-locked'); } catch {}
  }

  function endAdThenResume() {
    isAdPlaying = false;
    setControlsDisabled(false);
    try {
      if (queueListEl) {
        queueListEl.removeAttribute('aria-disabled');
      }
    } catch {}
    try { document.body.classList.remove('ad-locked'); } catch {}
    // Continue as requested
    if (typeof adAfterCallback === 'function') {
      const fn = adAfterCallback; adAfterCallback = null; fn();
    } else {
      nextTrack(true);
    }
  }

  // Globally block interactions that may start playback while an ad is playing
  (function setupAdInteractionGuards(){
    try {
      // Visual cue styles when locked
      if (!document.getElementById('ad-lock-style')) {
        const s = document.createElement('style');
        s.id = 'ad-lock-style';
        s.textContent = `
          body.ad-locked .player .controls .btn,
          body.ad-locked #progress,
          body.ad-locked #queue-list *,
          body.ad-locked #pl-tbody tr,
          body.ad-locked .song-card,
          body.ad-locked .song-item { cursor:not-allowed !important; }
        `;
        document.head.appendChild(s);
      }
      const SELS = ['#play','#next','#prev','#shuffle','#repeat','#progress','#queue-list','#pl-tbody tr','.song-card','.song-item','.q-list','.q-item','.q-row'];
      function isTrigger(el){
        if (!(el instanceof Element)) return false;
        for (const sel of SELS) { if (el.closest(sel)) return true; }
        return false;
      }
      // Capture clicks
      document.addEventListener('click', (e)=>{
        try {
          if (!isAdPlaying) return;
          const t = e.target;
          if (isTrigger(t)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
        } catch {}
      }, true);
      // Capture Enter/Space on interactive elements
      document.addEventListener('keydown', (e)=>{
        try {
          if (!isAdPlaying) return;
          if (e.key === 'Enter' || e.key === ' ') {
            const t = e.target;
            if (isTrigger(t)) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }
          }
        } catch {}
      }, true);
    } catch {}
  })();

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

  function play()  { audio.play();  isPlaying = true;  setPlayUI(true);  try { window.dispatchEvent(new Event('musicbox:statechange')); } catch {} }
  function pause() { audio.pause(); isPlaying = false; setPlayUI(false); try { window.dispatchEvent(new Event('musicbox:statechange')); } catch {} }

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
    savePlayerState(true);
  }
  function prevTrack() {
    loadTrack(prevIndex());
    if (isPlaying) play();
    pushUIState();
    savePlayerState(true);
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
        if (isAdPlaying) return; // block interaction during ad
        loadTrack(i); play(); pushUIState(); savePlayerState(true);
      });
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
    savePlayerState(true);
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
    savePlayerState(true);
  });

  repeatBtn.addEventListener("click", () => {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    repeatBtn.dataset.mode = repeatMode;
    repeatBtn.classList.toggle("active", repeatMode !== "off");
    updateRepeatA11y();
    savePlayerState(true);
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
    savePlayerState(false);
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
    savePlayerState(true);
  });
  volume.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    audio.volume = v;
    volume.setAttribute("aria-valuenow", String(v));
    volIcon.className =
      "fa-solid " +
      (audio.volume === 0 ? "fa-volume-xmark" : audio.volume < 0.5 ? "fa-volume-low" : "fa-volume-high");
    savePlayerState(true);
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
    savePlayerState(true);
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
    savePlayerState(true);
  });

  window.addEventListener('beforeunload', () => { savePlayerState(true); });

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
      // Persist paused state on logout via profile menu
      try {
        logoutInProgress = true;
        try { if (window.__mbAudio) window.__mbAudio.pause(); } catch {}
        try { pause(); setPlayUI(false); } catch {}
        savePlayerState(true);
        const KEY = 'player_state_v1';
        const raw = localStorage.getItem(KEY);
        let s = null; try { s = raw ? JSON.parse(raw) : null; } catch {}
        const patch = s ? { ...s, isPlaying: false } : {
          index: 0, currentTime: 0, isPlaying: false, volume: 0.8, shuffle: false, repeatMode: 'off', queueOpen: false, ts: Date.now()
        };
        localStorage.setItem(KEY, JSON.stringify(patch));
      } catch {}
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
