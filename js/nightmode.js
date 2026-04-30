// Night mode: darkness overlay + draggable spotlights rendered on Canvas
import storage from './storage.js';
import { getCurrentSeason } from './wall.js';

const STORAGE_KEY = 'nightmode:lights';
// angle: cone spread degrees, length multiplier increased for wider range
const LIGHT = { angle: 52, lengthMult: 4.2, intensity: 0.95 };

let canvas, ctx, wallEl, animFrameId;
let lights = [];   // [{ id, x, y, rotation }]
let isNight = false;

// Snow
let snowCanvas, snowCtx, snowFlakes = [], snowAnimId;

export function initNightMode(wall) {
  wallEl = wall;

  canvas = document.getElementById('nightCanvas');
  ctx = canvas.getContext('2d');

  lights = storage.get(STORAGE_KEY) || [];

  snowCanvas = document.createElement('canvas');
  snowCanvas.id = 'snowCanvas';
  snowCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:9999;';
  wallEl.appendChild(snowCanvas);
  snowCtx = snowCanvas.getContext('2d');

  document.getElementById('nightModeBtn').addEventListener('click', toggleNight);
  document.getElementById('addLightBtn').addEventListener('click', addLight);

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
    if (getCurrentSeason() === 'winter') startSnow();
  } else {
    cancelAnimationFrame(animFrameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stopSnow();
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
  if (canvas.width !== wallEl.offsetWidth || canvas.height !== wallEl.scrollHeight) {
    syncCanvasSize();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'destination-out';
  for (const light of lights) drawCone(light);
  ctx.globalCompositeOperation = 'source-over';

  animFrameId = requestAnimationFrame(renderDarkness);
}

function drawCone(light) {
  const { x, y, rotation = 0 } = light;
  const halfAngle = (LIGHT.angle / 2) * Math.PI / 180;
  // Base radius ~120px, length is the cone reach
  const length = 120 * LIGHT.lengthMult;
  // rotation=0 means pointing straight down (Math.PI/2)
  const dir = Math.PI / 2 + rotation * Math.PI / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir - Math.PI / 2);

  // Main cone gradient — radial from tip, soft warm falloff
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
  grad.addColorStop(0,    `rgba(255,235,180,${LIGHT.intensity})`);
  grad.addColorStop(0.25, `rgba(255,220,140,${LIGHT.intensity * 0.82})`);
  grad.addColorStop(0.55, `rgba(255,200,100,${LIGHT.intensity * 0.45})`);
  grad.addColorStop(0.8,  `rgba(255,180,60, ${LIGHT.intensity * 0.15})`);
  grad.addColorStop(1,    'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, length, Math.PI / 2 - halfAngle, Math.PI / 2 + halfAngle);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Soft edge blur — second wider, dimmer cone for natural penumbra
  const penumbra = ctx.createRadialGradient(0, 0, length * 0.6, 0, 0, length * 1.15);
  penumbra.addColorStop(0, `rgba(255,210,120,${LIGHT.intensity * 0.18})`);
  penumbra.addColorStop(1, 'rgba(0,0,0,0)');
  const pa = halfAngle * 1.35;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, length * 1.15, Math.PI / 2 - pa, Math.PI / 2 + pa);
  ctx.closePath();
  ctx.fillStyle = penumbra;
  ctx.fill();

  // Bulb halo
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 48);
  halo.addColorStop(0, `rgba(255,240,200,${LIGHT.intensity})`);
  halo.addColorStop(0.5, `rgba(255,220,150,${LIGHT.intensity * 0.4})`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.fillStyle = halo;
  ctx.fill();

  ctx.restore();
}

function addLight() {
  const id = `light-${Date.now()}`;
  const x = wallEl.offsetWidth / 2;
  const y = window.scrollY + 60;
  const light = { id, x, y, rotation: 0 };
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
      <button class="fixture-rotate-left" title="向左旋转">↺</button>
      <button class="fixture-rotate-right" title="向右旋转">↻</button>
    </div>
    <div class="fixture-wire"></div>
  `;
  wallEl.appendChild(el);

  // Update fixture visual tilt to match rotation
  function applyTilt() {
    el.querySelector('.fixture-wire').style.transform = `rotate(${light.rotation}deg)`;
  }
  applyTilt();

  el.querySelector('.fixture-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    lights = lights.filter(l => l.id !== light.id);
    saveLights();
    el.remove();
    renderDarkness();
  });

  el.querySelector('.fixture-rotate-left').addEventListener('click', (e) => {
    e.stopPropagation();
    light.rotation = (light.rotation - 15 + 360) % 360;
    applyTilt();
    saveLights();
  });

  el.querySelector('.fixture-rotate-right').addEventListener('click', (e) => {
    e.stopPropagation();
    light.rotation = (light.rotation + 15) % 360;
    applyTilt();
    saveLights();
  });

  // Drag
  let dragging = false, ox, oy;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
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

function startSnow() {
  snowCanvas.width  = wallEl.offsetWidth;
  snowCanvas.height = wallEl.scrollHeight;
  snowCanvas.style.width  = wallEl.offsetWidth + 'px';
  snowCanvas.style.height = wallEl.scrollHeight + 'px';

  snowFlakes = Array.from({ length: 120 }, () => ({
    x: Math.random() * snowCanvas.width,
    y: Math.random() * snowCanvas.height,
    r: Math.random() * 3 + 1,
    speed: Math.random() * 1.2 + 0.4,
    drift: (Math.random() - 0.5) * 0.5,
    opacity: Math.random() * 0.5 + 0.4,
  }));

  function tick() {
    snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
    snowCtx.fillStyle = '#fff';
    for (const f of snowFlakes) {
      snowCtx.globalAlpha = f.opacity;
      snowCtx.beginPath();
      snowCtx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      snowCtx.fill();
      f.y += f.speed;
      f.x += f.drift;
      if (f.y > snowCanvas.height) { f.y = -f.r; f.x = Math.random() * snowCanvas.width; }
      if (f.x > snowCanvas.width)  f.x = 0;
      if (f.x < 0) f.x = snowCanvas.width;
    }
    snowCtx.globalAlpha = 1;
    snowAnimId = requestAnimationFrame(tick);
  }
  tick();
}

function stopSnow() {
  cancelAnimationFrame(snowAnimId);
  if (snowCtx) snowCtx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);
  snowFlakes = [];
}
