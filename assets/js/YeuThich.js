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