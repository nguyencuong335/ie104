// YeuThich page module – fully scoped, no globals leaked
(() => {
  // Only run on Yeuthich page
  if (!document.body || !document.body.classList.contains('page-yeuthich')) return;

  document.addEventListener('DOMContentLoaded', () => {
    const api = window.MusicBox;
    if (!api || typeof api.playlist !== 'function') return;
    const list = api.playlist();
    const tbody = document.getElementById('yt-body');
    const coverEl = document.querySelector('.playlist-cover img');
    const subs = document.querySelectorAll('.playlist-sub');

    if (coverEl && list[0] && list[0].cover) coverEl.src = list[0].cover;
    if (subs && subs[0]) subs[0].textContent = 'Playlist • ' + list.length + ' bài hát';

    const fmt = (sec) => { if(!isFinite(sec)) return '--:--'; const m=Math.floor(sec/60), s=Math.floor(sec%60).toString().padStart(2,'0'); return m+':'+s; };

    if (tbody) tbody.innerHTML = '';
    list.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-track-index', String(i));
      tr.setAttribute('role', 'button');
      tr.setAttribute('tabindex', '0');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td class="song-title"><img src="${t.cover || ''}" alt="${t.title || ''}"><span>${t.title || ''}</span></td>
        <td>—</td>
        <td>${t.artist || ''}</td>
        <td id="dur-${i}">--:--</td>`;

      const play = () => { if (window.MusicBox && typeof window.MusicBox.playAt==='function') window.MusicBox.playAt(i); };
      tr.addEventListener('click', play);
      tr.addEventListener('keydown', (e) => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); play(); }});
      tr.style.cursor = 'pointer';
      tbody && tbody.appendChild(tr);

      // Fetch duration like queue
      try {
        const a = new Audio(t.src);
        a.addEventListener('loadedmetadata', () => {
          const d = document.getElementById('dur-'+i);
          if (d) d.textContent = fmt(a.duration);
        });
      } catch {}
    });

    // Optional: highlight current playing row
    const highlight = (ix) => {
      document.querySelectorAll('.song-list tbody tr').forEach((r) => r.classList.remove('is-playing'));
      const active = document.querySelector('.song-list tbody tr[data-track-index="'+ix+'"]');
      if (active) active.classList.add('is-playing');
    };
    if (typeof api.currentIndex === 'function') highlight(api.currentIndex());
    window.addEventListener('musicbox:trackchange', (e) => { if(e && e.detail) highlight(e.detail.index); });
  });
})();

// Module thêm bài hát vào trang Yêu Thích với nút xóa từng dòng
(() => {
  const likeBtn = document.getElementById('like');
  const ytTbody = document.getElementById('yt-body');
  const playlistCover = document.querySelector('.playlist-cover img');
  const playlistSub = document.querySelector('.playlist .playlist-sub');

  if (!likeBtn || !ytTbody) return;

  function loadLiked() {
    try {
      const data = localStorage.getItem('liked_songs');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveLiked(list) {
    try {
      localStorage.setItem('liked_songs', JSON.stringify(list));
    } catch {}
  }

  function renderLiked() {
    const list = loadLiked();
    ytTbody.innerHTML = '';
    list.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-track-index', String(i));
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td class="song-title"><img src="${t.cover || ''}" alt="${t.title || ''}"><span>${t.title || ''}</span></td>
        <td>—</td>
        <td>${t.artist || ''}</td>
        <td>${t.duration || '--:--'}</td>
        <td><button class="remove-btn">Xóa</button></td>`; // Thêm nút Xóa
      tr.style.cursor = 'pointer';

      // Click vào dòng để play nhạc, nhưng bỏ qua nút Xóa
      tr.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) return;
        if (window.MusicBox && typeof window.MusicBox.playAt === 'function') {
          const playlist = window.MusicBox.playlist();
          const idx = playlist.findIndex(x => x.id === t.id);
          if (idx >= 0) window.MusicBox.playAt(idx);
        }
      });

      // Click nút Xóa
      tr.querySelector('.remove-btn').addEventListener('click', () => {
        let liked = loadLiked();
        liked = liked.filter(s => s.id !== t.id);
        saveLiked(liked);
        renderLiked();
        // Nếu bài đang chơi bị xóa, cập nhật icon trái tim
        if (window.currentTrackId === t.id && likeBtn.querySelector('i')) {
          likeBtn.querySelector('i').classList.replace('fa-solid', 'fa-regular');
        }
      });

      ytTbody.appendChild(tr);
    });

    // Update số lượng bài
    if (playlistSub) playlistSub.textContent = `Playlist • ${list.length} bài hát`;
    // Update cover nếu có bài đầu tiên
    const first = list[0];
    if (playlistCover && first && first.cover) playlistCover.src = first.cover;
  }

  // Click trái tim để thêm/bỏ thích
  likeBtn.addEventListener('click', () => {
    const current = {
      id: window.currentTrackId || Date.now(),
      title: document.getElementById('title')?.textContent || '—',
      artist: document.getElementById('artist')?.textContent || '—',
      cover: document.getElementById('cover')?.src || '',
      duration: document.getElementById('progress')?.max || '--:--',
    };

    let liked = loadLiked();
    if (!liked.some(s => s.id === current.id)) {
      liked.push(current);
      saveLiked(liked);
      renderLiked();
      likeBtn.querySelector('i').classList.replace('fa-regular', 'fa-solid');
    } else {
      liked = liked.filter(s => s.id !== current.id);
      saveLiked(liked);
      renderLiked();
      likeBtn.querySelector('i').classList.replace('fa-solid', 'fa-regular');
    }
  });

  document.addEventListener('DOMContentLoaded', renderLiked);
})();
