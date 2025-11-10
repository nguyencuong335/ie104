// Module trang Yêu Thích: render từ localStorage và cho phép xóa từng bài
(() => {
  const ytTbody = document.getElementById('yt-body');
  const playlistCover = document.querySelector('.playlist-cover img');
  const playlistSub = document.querySelector('.playlist .playlist-sub');

  if (!ytTbody) return;

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
      try { window.dispatchEvent(new Event('liked:changed')); } catch {}
    } catch {}
  }

  async function renderLiked() {
    const list = loadLiked();
    ytTbody.innerHTML = '';
    list.forEach((t, i) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-track-index', String(i));
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td class="song-title"><img src="${t.cover || ''}" alt="${t.title || ''}"><span>${t.title || ''}</span></td>
        <td>${t.artist || ''}</td>
        <td><span class="dur">${t.duration || '--:--'}</span> <button class="remove-btn" title="Xóa">Xóa</button></td>`; // Nút Xóa nằm trong cột Thời lượng
      tr.style.cursor = 'pointer';

      // Click vào dòng để play nhạc, nhưng bỏ qua nút Xóa
      tr.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-btn')) return;
        if (window.MusicBox && typeof window.MusicBox.playAt === 'function') {
          const playlist = window.MusicBox.playlist();
          const idx = Array.isArray(playlist) ? playlist.findIndex(x => x && x.id === t.id) : -1;
          if (idx >= 0) window.MusicBox.playAt(idx);
        }
      });

      // Click nút Xóa
      tr.querySelector('.remove-btn').addEventListener('click', () => {
        let liked = loadLiked();
        liked = liked.filter(s => s.id !== t.id);
        saveLiked(liked);
        renderLiked();
      });

      ytTbody.appendChild(tr);
    });

    // Update số lượng bài
    if (playlistSub) playlistSub.textContent = `Playlist • ${list.length} bài hát`;
    // Update cover nếu có bài đầu tiên
    const first = list[0];
    if (playlistCover && first && first.cover) playlistCover.src = first.cover;

    // Render 'Kết hợp từ các nghệ sĩ' chỉ cho nghệ sĩ có trong yêu thích
    try {
      const wrap = document.querySelector('.artist-list');
      const section = wrap ? wrap.closest('.artist-section') : null;
      if (wrap) {
        // Lấy danh sách nghệ sĩ duy nhất
        const normalize = (s)=> String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
        const artistMap = new Map();
        list.forEach(it => {
          const name = String(it.artist||'').trim(); if (!name) return;
          if (!artistMap.has(name)) artistMap.set(name, { name, cover: it.cover || '' });
        });
        // Thử lấy ảnh nghệ sĩ từ songs.json nếu có
        let catalog = [];
        try {
          const res = await fetch('./assets/music_data/songs.json', { cache: 'no-store' });
          const data = await res.json();
          if (Array.isArray(data)) catalog = data;
        } catch {}
        function findArtistImg(name){
          const n = normalize(name);
          const hit = catalog.find(s => normalize(s.artist) === n);
          return (hit && (hit.artistImg || hit.cover)) || null;
        }
        wrap.innerHTML = '';
        artistMap.forEach((val) => {
          const img = findArtistImg(val.name) || val.cover || '';
          const el = document.createElement('div');
          el.className = 'artist';
          el.innerHTML = `
            <img src="${img}" alt="${val.name}">
            <span>${val.name}</span>
          `;
          wrap.appendChild(el);
        });
        // Toggle section visibility based on whether there are artists
        if (section) {
          section.style.display = artistMap.size ? '' : 'none';
        }
      }
    } catch {}
  }

  // Render khi trang load và khi có thay đổi danh sách thích
  document.addEventListener('DOMContentLoaded', renderLiked);
  window.addEventListener('liked:changed', renderLiked);
})();
