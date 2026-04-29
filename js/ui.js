// UI modals, panels, toolbar wiring
import storage from './storage.js';
import { FRAMES } from './frames.js';
import {
  addPhoto, addTextbox, lockAll, unlockAll,
  updateSelectedFrame, updateBackground, getCurrentSeason
} from './wall.js';

export function initUI() {
  initFramePicker();
  initPhotoModal();
  initSettingsModal();
  initUploadBackground();
  initToolbarButtons();
  listenItemSelected();
}

// ── Frame picker side panel ──────────────────────────────
function initFramePicker() {
  const panel = document.getElementById('framePicker');
  const list = document.getElementById('frameList');
  list.innerHTML = FRAMES.map(f => `
    <div class="frame-option" data-frame="${f.id}">
      <span class="frame-preview">${f.icon}</span>
      ${f.label}
    </div>
  `).join('');

  list.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-frame]');
    if (!opt) return;
    updateSelectedFrame(opt.dataset.frame);
    list.querySelectorAll('.frame-option').forEach(el => el.classList.remove('active'));
    opt.classList.add('active');
  });
}

function listenItemSelected() {
  document.addEventListener('item-selected', (e) => {
    const item = e.detail?.item;
    const panel = document.getElementById('framePicker');
    if (!panel) return;
    if (item?.type === 'photo') {
      panel.classList.add('open');
      // Highlight current frame
      panel.querySelectorAll('.frame-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.frame === item.frame);
      });
    } else {
      panel.classList.remove('open');
    }
  });
}

// ── Add photo modal ──────────────────────────────────────
function initPhotoModal() {
  const modal = document.getElementById('photoModal');
  const closeBtn = modal.querySelector('.modal-close');
  const grid = document.getElementById('photoGrid');
  const uploadBtn = document.getElementById('uploadPhotoBtn');
  const fileInput = document.getElementById('photoFileInput');

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  // Upload new photo
  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      // Save to config photos list
      const config = storage.getConfig();
      const season = getCurrentSeason();
      if (!config.photos[season]) config.photos[season] = [];
      config.photos[season].push(src);
      storage.setConfig(config);
      addPhoto(src);
      modal.classList.remove('open');
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  document.getElementById('addPhotoBtn').addEventListener('click', () => {
    populatePhotoGrid(grid);
    modal.classList.add('open');
  });

  grid.addEventListener('click', (e) => {
    // Delete button
    const delBtn = e.target.closest('.photo-thumb-delete');
    if (delBtn) {
      e.stopPropagation();
      const idx = parseInt(delBtn.dataset.index);
      const config = storage.getConfig();
      const season = getCurrentSeason();
      config.photos[season].splice(idx, 1);
      storage.setConfig(config);
      populatePhotoGrid(grid);
      return;
    }
    // Add to wall
    const thumb = e.target.closest('[data-src]');
    if (!thumb) return;
    addPhoto(thumb.dataset.src);
    modal.classList.remove('open');
  });
}

function populatePhotoGrid(grid) {
  const config = storage.getConfig();
  const season = getCurrentSeason();
  const photos = config?.photos?.[season] || [];
  if (!photos.length) {
    grid.innerHTML = '<p style="color:#7a6a5a;text-align:center;padding:20px">暂无照片，点击上方"上传照片"按钮添加</p>';
    return;
  }
  grid.innerHTML = photos.map((src, i) => `
    <div class="photo-thumb" data-src="${src}" data-index="${i}" title="点击添加到照片墙">
      <img src="${src}" alt="">
      <button class="photo-thumb-delete" data-index="${i}" title="从库中删除">×</button>
    </div>
  `).join('');
}

// ── Background upload ────────────────────────────────────
function initUploadBackground() {
  const input = document.getElementById('bgFileInput');
  const btn = document.getElementById('uploadBgBtn');
  btn.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateBackground(ev.target.result);
    };
    reader.readAsDataURL(file);
    input.value = '';
  });
}

// ── Settings modal (anniversaries) ──────────────────────
function initSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const closeBtn = modal.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.getElementById('settingsBtn').addEventListener('click', () => {
    renderAnniversaryList();
    modal.classList.add('open');
  });

  document.getElementById('addAnniversaryBtn').addEventListener('click', addAnniversaryRow);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

function renderAnniversaryList() {
  const config = storage.getConfig();
  const container = document.getElementById('anniversaryList');
  const list = config?.anniversaries || [];
  container.innerHTML = list.map((a, i) => `
    <div class="ann-row" data-index="${i}">
      <input type="text" class="ann-label" value="${a.label}" placeholder="纪念日名称">
      <input type="number" class="ann-month" value="${a.month}" min="1" max="12" placeholder="月">
      <span>/</span>
      <input type="number" class="ann-day" value="${a.day}" min="1" max="31" placeholder="日">
      <input type="color" class="ann-color" value="${a.color || '#e8a0bf'}">
      <input type="text" class="ann-note" value="${a.note || ''}" placeholder="备注（可选）">
      <button class="ann-delete" data-index="${i}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('.ann-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const config = storage.getConfig();
      config.anniversaries.splice(idx, 1);
      storage.setConfig(config);
      renderAnniversaryList();
    });
  });
}

function addAnniversaryRow() {
  const config = storage.getConfig();
  config.anniversaries.push({ id: `a${Date.now()}`, label: '', month: 1, day: 1, color: '#e8a0bf', note: '' });
  storage.setConfig(config);
  renderAnniversaryList();
}

function saveSettings() {
  const config = storage.getConfig();
  const rows = document.querySelectorAll('.ann-row');
  config.anniversaries = Array.from(rows).map((row, i) => ({
    id: config.anniversaries[i]?.id || `a${Date.now()}-${i}`,
    label: row.querySelector('.ann-label').value,
    month: parseInt(row.querySelector('.ann-month').value),
    day: parseInt(row.querySelector('.ann-day').value),
    color: row.querySelector('.ann-color').value,
    note: row.querySelector('.ann-note').value,
  }));
  storage.setConfig(config);
  document.getElementById('settingsModal').classList.remove('open');
}

// ── Toolbar buttons ──────────────────────────────────────
function initToolbarButtons() {
  document.getElementById('addTextBtn').addEventListener('click', addTextbox);
  document.getElementById('lockAllBtn').addEventListener('click', lockAll);
  document.getElementById('unlockAllBtn').addEventListener('click', unlockAll);

  // Season selector
  const seasonSelect = document.getElementById('seasonSelect');
  if (seasonSelect) {
    seasonSelect.addEventListener('change', (e) => {
      const params = new URLSearchParams(location.search);
      params.set('season', e.target.value);
      location.href = `wall.html?${params}`;
    });
  }
}
