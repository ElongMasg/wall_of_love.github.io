// Wall state management
import storage from './storage.js';
import { createPhotoElement, selectPhoto, applyFrame } from './photos.js';
import { createTextboxElement, selectTextbox } from './textbox.js';

let season = 'spring';
let items = [];
let selectedId = null;
let wallEl = null;

const SEASON_LABELS = {
  spring: '春 · Spring',
  summer: '夏 · Summer',
  autumn: '秋 · Autumn',
  winter: '冬 · Winter',
};

export function initWall(canvasEl, currentSeason) {
  wallEl = canvasEl;
  season = currentSeason;
  items = storage.getItems(season);
  renderAll();
  applyBackground();

  // Deselect on wall click
  wallEl.addEventListener('pointerdown', (e) => {
    if (e.target === wallEl) {
      deselectAll();
    }
  });
}

function applyBackground() {
  const config = storage.getConfig();
  if (!config) return;
  const bg = config.backgrounds?.[season];
  if (bg) {
    wallEl.style.backgroundImage = `url('${bg}')`;
  } else {
    const gradients = {
      spring: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #fce4ec 100%)',
      summer: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 50%, #e8f5e9 100%)',
      autumn: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 50%, #fbe9e7 100%)',
      winter: 'linear-gradient(135deg, #e8eaf6 0%, #e3f2fd 50%, #e8eaf6 100%)',
    };
    wallEl.style.backgroundImage = gradients[season] || gradients.spring;
  }
}

function renderAll() {
  // Clear existing item elements (not toolbar or other fixed children)
  wallEl.querySelectorAll('.wall-item').forEach(el => el.remove());
  for (const item of items) {
    renderItem(item);
  }
}

function renderItem(item) {
  let el;
  if (item.type === 'photo') {
    el = createPhotoElement(item, season, onItemUpdate, onItemSelect, onItemDelete);
  } else if (item.type === 'textbox') {
    el = createTextboxElement(item, onItemUpdate, onItemSelect, onItemDelete);
  }
  if (el) wallEl.appendChild(el);
}

function onItemUpdate(item) {
  const idx = items.findIndex(i => i.id === item.id);
  if (idx !== -1) items[idx] = item;
  storage.setItems(season, items);
}

function onItemSelect(id) {
  deselectAll();
  selectedId = id;
  const item = items.find(i => i.id === id);
  if (!item) return;

  const el = wallEl.querySelector(`[data-id="${id}"]`);
  if (!el) return;

  // Bring to front
  const z = storage.nextZ();
  item.z = z;
  el.style.zIndex = z;
  onItemUpdate(item);

  if (item.type === 'photo') selectPhoto(el, true);
  else if (item.type === 'textbox') selectTextbox(el, true);

  // Update frame picker panel if it's open
  document.dispatchEvent(new CustomEvent('item-selected', { detail: { item } }));
}

function onItemDelete(id) {
  const el = wallEl.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
  items = items.filter(i => i.id !== id);
  selectedId = null;
  storage.setItems(season, items);
  document.dispatchEvent(new CustomEvent('item-selected', { detail: { item: null } }));
}

function deselectAll() {
  if (!selectedId) return;
  const el = wallEl.querySelector(`[data-id="${selectedId}"]`);
  if (el) {
    const item = items.find(i => i.id === selectedId);
    if (item?.type === 'photo') selectPhoto(el, false);
    else if (item?.type === 'textbox') selectTextbox(el, false);
  }
  selectedId = null;
  document.dispatchEvent(new CustomEvent('item-selected', { detail: { item: null } }));
}

export function addPhoto(src) {
  const id = `photo-${Date.now()}`;
  const scrollY = wallEl.parentElement.scrollTop || window.scrollY;
  const item = {
    id, type: 'photo',
    src,
    x: Math.random() * (wallEl.offsetWidth - 220) + 10,
    y: scrollY + 100 + Math.random() * 200,
    width: 200,
    rotation: (Math.random() * 10) - 5,
    frame: 'polaroid',
    locked: false,
    caption: '',
    z: storage.nextZ(),
  };
  items.push(item);
  renderItem(item);
  storage.setItems(season, items);
}

export function addTextbox() {
  const id = `text-${Date.now()}`;
  const scrollY = window.scrollY;
  const item = {
    id, type: 'textbox',
    x: Math.max(20, (wallEl.offsetWidth / 2) - 100),
    y: scrollY + 200,
    width: 200,
    content: '点击输入文字',
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    color: '#3a2a1a',
    rotation: 0,
    locked: false,
    z: storage.nextZ(),
  };
  items.push(item);
  renderItem(item);
  storage.setItems(season, items);

  // Auto-select and focus the new textbox
  setTimeout(() => {
    onItemSelect(id);
    const el = wallEl.querySelector(`[data-id="${id}"]`);
    const content = el?.querySelector('.textbox-content');
    if (content) {
      content.contentEditable = 'true';
      content.focus();
      content.textContent = '';
    }
  }, 50);
}

export function lockAll() {
  items.forEach(item => { item.locked = true; });
  renderAll();
  storage.setItems(season, items);
}

export function unlockAll() {
  items.forEach(item => { item.locked = false; });
  renderAll();
  storage.setItems(season, items);
}

export function getSelectedItem() {
  return selectedId ? items.find(i => i.id === selectedId) : null;
}

export function updateSelectedFrame(frameId) {
  if (!selectedId) return;
  const item = items.find(i => i.id === selectedId);
  if (!item || item.type !== 'photo') return;
  item.frame = frameId;
  onItemUpdate(item);
  const el = wallEl.querySelector(`[data-id="${selectedId}"]`);
  if (el) applyFrame(el, frameId);
}

export function getCurrentSeason() { return season; }
export function getSeasonLabel(s) { return SEASON_LABELS[s] || s; }
