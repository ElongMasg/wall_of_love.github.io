// Night mode: darkness overlay + draggable spotlights rendered on Canvas
import storage from './storage.js';

const STORAGE_KEY = 'nightmode:lights';
const LIGHT_DEFAULTS = { r: 120, angle: 38, intensity: 0.92 };

let canvas, ctx, wallEl, animFrameId;
let lights = [];   // [{ id, x, y }]
let isNight = false;

export function initNightMode(wall) {
  wallEl = wall;

  canvas = document.getElementById('nightCanvas');
  ctx = canvas.getContext('2d');

  lights = storage.get(STORAGE_KEY) || [];

  document.getElementById('nightModeBtn').addEventListener('click', toggleNight);
  document.getElementById('addLightBtn').addEventListener('click', addLight);

  // Render fixtures for persisted lights on load (hidden until night mode on)
  for (const light of lights) createFixtureEl(light);

  syncCanvasSize();
  window.addEventListener('resize', () => { syncCanvasSize(); renderDarkness(); });
  wallEl.addEventListener('scroll', renderDarkness);
}

function toggleNight() {
  isNight = !isNight;
  document.body.classList.toggle('night-mode', isNight);
  document.getElementById('nightModeBtn').classList.toggle('active', isNight);
  document.getElementById('nightModeBtn').textContent = isNight ? '💡 开灯' : '🌙 关灯';

  if (isNight) {
    syncCanvasSize();
    renderDarkness();
  } else {
    cancelAnimationFrame(animFrameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function syncCanvasSize() {
  canvas.width  = wallEl.offsetWidth;
  canvas.height = wallEl.scrollHeight;
  canvas.style.width  = wallEl.offsetWidth + 'px';
  canvas.style.height = wallEl.scrollHeight + 'px';
}

function renderDarkness() {
  if (!isNight) return;

  // Resize if needed
  if (canvas.width !== wallEl.offsetWidth || canvas.height !== wallEl.scrollHeight) {
    syncCanvasSize();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark base
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cut cone for each light using destination-out
  ctx.globalCompositeOperation = 'destination-out';
  for (const light of lights) {
    drawCone(light.x, light.y);
  }

  // Restore for next frame
  ctx.globalCompositeOperation = 'source-over';

  animFrameId = requestAnimationFrame(renderDarkness);
}

function drawCone(cx, cy) {
  const halfAngle = (LIGHT_DEFAULTS.angle / 2) * Math.PI / 180;
  const length = LIGHT_DEFAULTS.r * 3.2;

  // Gradient: bright at source, fades out
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, length);
  grad.addColorStop(0,   `rgba(255,230,170, ${LIGHT_DEFAULTS.intensity})`);
  grad.addColorStop(0.35, `rgba(255,210,120, ${LIGHT_DEFAULTS.intensity * 0.75})`);
  grad.addColorStop(0.7,  `rgba(255,190,80,  ${LIGHT_DEFAULTS.intensity * 0.35})`);
  grad.addColorStop(1,   'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, length, Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();

  // Soft halo at the bulb
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
  halo.addColorStop(0, `rgba(255,230,170,${LIGHT_DEFAULTS.intensity})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();
}

function addLight() {
  const id = `light-${Date.now()}`;
  // Place in center of current viewport
  const x = wallEl.offsetWidth / 2;
  const y = window.scrollY + 60;
  const light = { id, x, y };
  lights.push(light);
  saveLights();
  createFixtureEl(light);
  renderDarkness();
}

function createFixtureEl(light) {
  const el = document.createElement('div');
  el.className = 'spotlight-fixture';
  el.dataset.id = light.id;
  el.style.cssText = `left:${light.x - 14}px; top:${light.y - 32}px;`;
  el.innerHTML = `
    <div class="fixture-head">
      <button class="fixture-delete" title="删除">×</button>
    </div>
    <div class="fixture-wire"></div>
  `;
  wallEl.appendChild(el);

  // Delete
  el.querySelector('.fixture-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    lights = lights.filter(l => l.id !== light.id);
    saveLights();
    el.remove();
    renderDarkness();
  });

  // Drag
  let dragging = false, ox, oy;

  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.fixture-delete')) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    const wallRect = wallEl.getBoundingClientRect();
    ox = e.clientX - wallRect.left - light.x;
    oy = e.clientY - wallRect.top  - light.y;
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });

  function onMove(e) {
    if (!dragging) return;
    const wallRect = wallEl.getBoundingClientRect();
    light.x = Math.max(0, Math.min(e.clientX - wallRect.left - ox, wallEl.offsetWidth));
    light.y = Math.max(0, e.clientY - wallRect.top - oy);
    el.style.left = (light.x - 14) + 'px';
    el.style.top  = (light.y - 32) + 'px';
    // renderDarkness runs in rAF loop, no need to call manually
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    saveLights();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  }
}

function saveLights() {
  storage.set(STORAGE_KEY, lights);
}
