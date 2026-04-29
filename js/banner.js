// Anniversary banner logic
import storage from './storage.js';

function spawnConfetti(color) {
  const count = 30;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: -10px;
      background: ${color};
      transform: rotate(${Math.random() * 360}deg);
      animation-duration: ${1.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

function showBanner(anniversary) {
  const banner = document.createElement('div');
  banner.className = 'anniversary-banner';
  banner.innerHTML = `
    <div class="banner-accent-bar" style="background:${anniversary.color || '#e8a0bf'}"></div>
    <span class="banner-icon">🌸</span>
    <div class="banner-text">
      <strong>${anniversary.label}</strong>
      ${anniversary.note ? `<span>${anniversary.note}</span>` : ''}
    </div>
    <button class="banner-close" aria-label="关闭">×</button>
  `;
  document.body.appendChild(banner);

  spawnConfetti(anniversary.color || '#e8a0bf');

  const close = () => {
    banner.classList.add('exit');
    banner.addEventListener('animationend', () => banner.remove(), { once: true });
  };

  banner.querySelector('.banner-close').addEventListener('click', close);
  setTimeout(close, 8000);
}

export function checkAnniversaries() {
  const config = storage.getConfig();
  if (!config?.anniversaries?.length) return;

  const today = new Date();
  const m = today.getMonth() + 1;
  const d = today.getDate();

  let delay = 800;
  for (const ann of config.anniversaries) {
    if (ann.month === m && ann.day === d) {
      setTimeout(() => showBanner(ann), delay);
      delay += 2000;
    }
  }
}
