(function(){
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function getParam(name){ try{ return new URL(location.href).searchParams.get(name)||""; }catch{ return ""; } }
  function fmtTime(s){ if(!isFinite(s)||s<0) return "0:00"; const m=Math.floor(s/60), ss=Math.floor(s%60).toString().padStart(2,'0'); return `${m}:${ss}`; }

  function getUserPlaylists(){ try{ return JSON.parse(localStorage.getItem('user_playlists_v1')||'[]'); }catch{ return []; } }
  function getSongs(){ try{ return window.__allSongs || []; }catch{ return []; } }
  function setSongs(arr){ try{ window.__allSongs = arr; }catch{} }

  async function loadAllSongs(){
    if (getSongs().length) return getSongs();
    try {
      const res = await fetch('./assets/music_data/songs.json', { cache: 'no-store' });
      const data = await res.json();
      if(Array.isArray(data)) { setSongs(data); return data; }
    } catch(err) { console.error('Không thể tải songs.json', err); }
    return [];
  }

  function mapById(arr){ const m=new Map(); arr.forEach(o=>{ if(o && o.id) m.set(o.id, o); }); return m; }
  function setUserPlaylists(arr){ try{ localStorage.setItem('user_playlists_v1', JSON.stringify(arr)); try{ window.dispatchEvent(new Event('playlists:changed')); } catch{} }catch{} }

  async function start(){
    const id = getParam('id');
    const lists = getUserPlaylists();
    const pl = lists.find(p=>p.id===id) || lists[0];
    if (!pl) return;

    // Header
    const nameEl = qs('#pl-name'); const coverEl = qs('#pl-cover'); const countEl = qs('#pl-count');
    // No banner play/pause button per latest requirement
    if (nameEl) nameEl.textContent = pl.name || 'Playlist';
    if (coverEl) coverEl.style.backgroundImage = pl.cover ? `url('${pl.cover}')` : '';

    // Load and map tracks
    const songs = await loadAllSongs();
    const map = mapById(songs);
    let trackIds = Array.isArray(pl.tracks) ? pl.tracks.slice() : [];
    let tracks = trackIds.map(tid=> map.get(tid)).filter(Boolean);
    if (countEl) countEl.textContent = `${tracks.length} bài hát`;

    // Render table
    const tbody = qs('#pl-tbody');
    if (tbody) tbody.innerHTML = '';
    const pendingDur = [];
    tracks.forEach((t, i)=>{
      const tr = document.createElement('tr');
      tr.setAttribute('data-index', String(i));
      tr.innerHTML = `
        <td class="pl-idx" style="padding:8px; width:48px;">
          <span class="pl-num">${i+1}</span>
          <button class="btn tiny del first" title="Xóa khỏi playlist" aria-label="Xóa khỏi playlist">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
        <td class="pl-cell-track" style="padding:8px; max-width: 520px;">
          <div class="pl-cover" style="background-image:url('${t.cover || ''}')"></div>
          <div class="pl-title" title="${t.title}">${t.title}</div>
        </td>
        <td style="padding:8px; color:#7f8b99;">${t.artist || ''}</td>
        <td style="padding:8px; text-align:right;" id="pl-dur-${i}">--:--</td>
      `;
      if (tbody) tbody.appendChild(tr);
      // Prefetch duration
      try {
        const a = new Audio(t.src);
        a.addEventListener('loadedmetadata', ()=>{
          const el = qs(`#pl-dur-${i}`);
          if (el) el.textContent = fmtTime(a.duration);
        });
        pendingDur.push(a);
      } catch {}
    });

    // Wire actions
    // Do NOT switch queue on page load. Keep whatever is playing.
    // Delete song from playlist handler
    function deleteAt(indexToRemove){
      try {
        const song = tracks[indexToRemove];
        const ok = window.confirm(`Xóa "${(song && song.title) ? song.title : 'bài này'}" khỏi playlist?`);
        if (!ok) return;
        const lists = getUserPlaylists();
        const idxPl = lists.findIndex(p=>p.id===pl.id);
        if (idxPl<0) return;
        const idToRemove = trackIds[indexToRemove];
        if (!idToRemove) return;
        lists[idxPl].tracks = (lists[idxPl].tracks||[]).filter(id=> id!==idToRemove);
        setUserPlaylists(lists);
        // update local arrays and UI count
        trackIds = lists[idxPl].tracks.slice();
        tracks = trackIds.map(id=> map.get(id)).filter(Boolean);
        if (countEl) countEl.textContent = `${tracks.length} bài hát`;
        // If this playlist is active in player, sync it preserving current song if possible
        const stateRaw = localStorage.getItem('player_state_v1');
        let wasPlaying = false, currentId = null;
        try { const s = JSON.parse(stateRaw||'null'); if (s) { wasPlaying = !!s.isPlaying; currentId = s.currentId||null; } } catch{}
        if (typeof window.MusicBox?.setPlaylist === 'function' && Array.isArray(tracks)){
          window.MusicBox.setPlaylist(tracks, { type: 'user', id: pl.id });
          if (currentId){
            const newIdx = tracks.findIndex(x=> x && x.id===currentId);
            if (newIdx>=0 && typeof window.MusicBox.playAt==='function'){
              window.MusicBox.playAt(newIdx);
              if (!wasPlaying && typeof window.MusicBox.pause==='function') window.MusicBox.pause();
            }
          }
        }
        // Rerender table quickly: remove the row and reindex numbers
        const row = qs(`#pl-tbody tr[data-index="${indexToRemove}"]`);
        if (row) row.remove();
        // update remaining data-index and order number
        qsa('#pl-tbody tr').forEach((r, idx)=>{
          r.setAttribute('data-index', String(idx));
          const numCell = r.querySelector('td:first-child'); if (numCell) numCell.textContent = String(idx+1);
        });
      } catch{}
    }

    // Highlight current playing row
    function getSavedState(){
      try { return JSON.parse(localStorage.getItem('player_state_v1')||'null'); } catch { return null; }
    }
    function isThisPlaylistActive(){
      const s = getSavedState();
      return !!(s && s.playlistCtx && s.playlistCtx.type === 'user' && s.playlistCtx.id === pl.id);
    }
    function markCurrentRow() {
      try {
        if (!isThisPlaylistActive()) { // clear highlight if another context is active
          document.querySelectorAll('#pl-tbody tr').forEach(tr => tr.classList.remove('is-current'));
          return;
        }
        const cur = typeof window.MusicBox?.currentIndex === 'function' ? window.MusicBox.currentIndex() : -1;
        document.querySelectorAll('#pl-tbody tr').forEach(tr => tr.classList.remove('is-current'));
        const row = document.querySelector(`#pl-tbody tr[data-index="${cur}"]`);
        if (row) {
          row.classList.add('is-current');
          // auto scroll into view nicely
          row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      } catch {}
    }
    window.addEventListener('musicbox:trackchange', markCurrentRow);
    // sync once after setting playlist
    markCurrentRow();
    // click hàng để phát bài
    qsa('#pl-tbody tr').forEach(row=>{
      row.style.cursor = 'pointer';
      row.addEventListener('click', ()=>{
        const idx = Number(row.getAttribute('data-index'))||0;
        // ensure this playlist becomes active then play selected track
        if (typeof window.MusicBox?.setPlaylist === 'function') {
          window.MusicBox.setPlaylist(tracks, { type: 'user', id: pl.id });
        }
        if (typeof window.MusicBox?.playAt === 'function') window.MusicBox.playAt(idx);
        // optimistic highlight
        document.querySelectorAll('#pl-tbody tr').forEach(tr => tr.classList.remove('is-current'));
        row.classList.add('is-current');
      });
      // handle delete button inside the row (stop propagation)
      const delBtn = row.querySelector('td.pl-idx button.btn.tiny.del.first');
      if (delBtn) {
        delBtn.addEventListener('click', (e)=>{ e.stopPropagation(); const rmIdx = Number(row.getAttribute('data-index'))||0; deleteAt(rmIdx); });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

// ==== Hide main-content when Queue is visible (match other pages) ====
(function(){
  const MAIN_SEL = '.main-content';
  const QUEUE_SEL = '.queue';
  const HIDE_CLASS = 'is-hidden';
  // inject simple css once
  if (!document.getElementById('hide-playlist-style')) {
    const s = document.createElement('style');
    s.id = 'hide-playlist-style';
    s.textContent = `.${HIDE_CLASS}{ display:none !important; }`;
    document.head.appendChild(s);
  }
  function isVisible(el){
    if (!el || el.hidden) return false; const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect(); return r.width>0 && r.height>0;
  }
  function sync(){
    const main = document.querySelector(MAIN_SEL); if (!main) return;
    const qs = Array.from(document.querySelectorAll(QUEUE_SEL));
    const any = qs.some(isVisible);
    main.classList.toggle(HIDE_CLASS, any);
  }
  const mo = new MutationObserver(sync);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ()=>{ sync(); mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']}); }, {once:true});
  } else { sync(); mo.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']}); }
})();
