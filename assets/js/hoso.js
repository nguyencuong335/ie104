// Ẩn .main-content khi có .queue hiển thị trên trang
(function () {
    const SEARCH_SEL = ".main-content";
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

// ==== Avatar upload & persist ====
(function () {
  function getUserKey() {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      if (u && (u.id || u.email)) return `avatar_${u.id || u.email}`;
    } catch {}
    return 'avatar_guest';
  }

  const avatarEl = document.getElementById('user-avatar');
  const fileInput = document.getElementById('avatar-file');
  const removeBtn = document.getElementById('avatar-remove');
  if (!avatarEl || !fileInput) return;

  // Ensure small CSS for locked state
  (function ensureAvatarLockStyle(){
    try{
      if (document.getElementById('avatar-lock-style')) return;
      const s = document.createElement('style');
      s.id = 'avatar-lock-style';
      s.textContent = `.user-avatar.locked{cursor:not-allowed}`;
      document.head.appendChild(s);
    }catch{}
  })();

  // Restore saved avatar
  try {
    const key = getUserKey();
    const dataUrl = localStorage.getItem(key);
    if (dataUrl) avatarEl.style.backgroundImage = `url('${dataUrl}')`;
  } catch {}

  function isLocked(){ try { return !!localStorage.getItem(getUserKey()); } catch { return false; } }
  function syncLock(){
    try {
      const locked = isLocked();
      avatarEl.classList.toggle('locked', locked);
      avatarEl.setAttribute('aria-disabled', String(!!locked));
      if (locked) avatarEl.setAttribute('title','Đã có ảnh đại diện'); else avatarEl.removeAttribute('title');
      if (removeBtn) removeBtn.disabled = !locked; // chỉ cho xóa khi đã có ảnh
    } catch {}
  }
  syncLock();

  function openPicker() { try { if (isLocked()) return; fileInput.click(); } catch {} }
  avatarEl.addEventListener('click', (e)=>{ if (isLocked()) { e.preventDefault(); e.stopPropagation(); return; } openPicker(); });
  avatarEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isLocked()) return; openPicker(); }
  });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        avatarEl.style.backgroundImage = `url('${dataUrl}')`;
        try { localStorage.setItem(getUserKey(), dataUrl); } catch {}
        try { window.dispatchEvent(new Event('avatar:changed')); } catch {}
        syncLock();
      }
    };
    reader.readAsDataURL(file);
  });

  // Remove avatar -> clear storage and restore default
  function defaultAvatarUrl() { return "./assets/imgs/avatar.jpg"; }
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const ok = window.confirm('Bạn có chắc muốn xóa ảnh đại diện không?');
      if (!ok) return;
      try { localStorage.removeItem(getUserKey()); } catch {}
      try { avatarEl.style.removeProperty('background-image'); } catch { avatarEl.style.backgroundImage = ''; }
      try { window.dispatchEvent(new Event('avatar:changed')); } catch {}
      syncLock();
    });
  }
})();

// ==== Editable display name (persist per user) ====
(function () {
  function getNameKey() {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      if (u && (u.id || u.email)) return `displayname_${u.id || u.email}`;
    } catch {}
    return 'displayname_guest';
  }

  const nameEl = document.getElementById('user-name');
  const inputEl = document.getElementById('user-name-input');
  const editBtn = document.getElementById('name-edit-btn');
  if (!nameEl || !inputEl || !editBtn) return;

  // Restore saved name
  try {
    const saved = localStorage.getItem(getNameKey());
    if (saved && saved.trim()) {
      nameEl.textContent = saved;
      inputEl.value = saved;
    } else {
      inputEl.value = nameEl.textContent.trim();
    }
  } catch { inputEl.value = nameEl.textContent.trim(); }

  function startEdit() {
    inputEl.value = nameEl.textContent.trim();
    inputEl.hidden = false;
    inputEl.focus();
    inputEl.select();
  }
  function finishEdit(commit) {
    inputEl.hidden = true;
    if (!commit) return;
    let v = inputEl.value.trim().replace(/\s+/g, ' ');
    inputEl.setCustomValidity('');
    // Validate: 2–40 chars, letters/numbers/spaces only
    const isLenOk = v.length >= 2 && v.length <= 40;
    const isCharsOk = /^([\p{L}\p{N}]+)([\p{L}\p{N}\s]*)$/u.test(v);
    if (!isLenOk || !isCharsOk) {
      inputEl.hidden = false;
      inputEl.setCustomValidity('Tên phải từ 2-40 ký tự, chỉ gồm chữ, số và khoảng trắng.');
      inputEl.reportValidity();
      inputEl.focus();
      inputEl.select();
      return;
    }
    nameEl.textContent = v;
    try { localStorage.setItem(getNameKey(), v); } catch {}
  }

  editBtn.addEventListener('click', startEdit);
  nameEl.addEventListener('click', startEdit);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishEdit(true);
    else if (e.key === 'Escape') finishEdit(false);
  });
  inputEl.addEventListener('blur', () => finishEdit(true));
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
