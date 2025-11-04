// -------- 1. DARK / LIGHT MODE TOGGLE --------
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
  body.classList.add('dark-mode');
}

// Toggle theme
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const current = body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', current);
    themeToggle.innerHTML = current === 'dark' ? '🌞' : '🌙';
  });
}

// -------- 2. HERO CAROUSEL AUTO SLIDE --------
const banners = document.querySelectorAll('.q-banner');
const dots = document.querySelectorAll('.hero-dot');
let currentIndex = 0;

function showBanner(index) {
  banners.forEach((b, i) => {
    b.classList.toggle('hidden', i !== index);
    dots[i].classList.toggle('is-active', i === index);
  });
}

function nextBanner() {
  currentIndex = (currentIndex + 1) % banners.length;
  showBanner(currentIndex);
}

if (banners.length > 0) {
  showBanner(0);
  setInterval(nextBanner, 5000);

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      currentIndex = i;
      showBanner(i);
    });
  });
}

// -------- 3. PLAY BUTTON INTERACTION (Mock) --------
function setupPlayButtons() {
  const buttons = document.querySelectorAll(
    '.playlist-play, .album-play, .track-play-btn'
  );
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card =
        btn.closest('.playlist-card') ||
        btn.closest('.album-card') ||
        btn.closest('.track-row');
      const title =
        card?.querySelector('.playlist-title, .album-title, .track-title')
          ?.textContent || 'Bài hát';
      alert(`🎵 Đang phát: ${title}`);
    });
  });
}

document.addEventListener('DOMContentLoaded', setupPlayButtons);
