// UI modals, panels, toolbar wiring
import storage from './storage.js';
import { FRAMES } from './frames.js';
import {
  addPhoto, addTextbox, addEnvelope, lockAll, unlockAll,
  updateSelectedFrame, getCurrentSeason, getCurrentPage,
  goToPage, addPage, deletePage,
} from './wall.js';

export function initUI() {
  initFramePicker();
  initPhotoModal();
  initSettingsModal();
  initToolbarButtons();
  initPagination();
  listenItemSelected();
}

// ── Frame picker side panel ──────────────────────────────
function initFramePicker() {
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

  closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.getElementById('addPhotoBtn').addEventListener('click', async () => {
    await populatePhotoGrid(grid);
    modal.classList.add('open');
  });

  grid.addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-src]');
    if (!thumb) return;
    addPhoto(thumb.dataset.src);
    modal.classList.remove('open');
  });
}

async function populatePhotoGrid(grid) {
  let photos = [];
  const season = getCurrentSeason();
  try {
    const res = await fetch('data/config.json');
    const data = await res.json();
    photos = data?.photos?.[season] || [];
  } catch {
    photos = storage.getConfig()?.photos?.[season] || [];
  }

  if (!photos.length) {
    grid.innerHTML = `
      <div style="color:#7a6a5a;text-align:center;padding:24px;line-height:1.8">
        <p>暂无照片</p>
        <p style="font-size:0.8rem;margin-top:8px">
          将图片放入 <code>assets/photos/${season}/</code><br>
          并在 <code>data/config.json</code> 的 <code>photos.${season}</code> 中添加路径
        </p>
      </div>`;
    return;
  }
  grid.innerHTML = photos.map(src => `
    <div class="photo-thumb" data-src="${src}" title="点击添加到照片墙">
      <img src="${src}" alt="" loading="lazy">
    </div>
  `).join('');
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

// ── Letter picker ─────────────────────────────────────────

async function getAvailableLetters() {
  try {
    const res = await fetch('data/config.json');
    const data = await res.json();
    return data?.letters || [];
  } catch {
    const config = storage.getConfig();
    return config?.letters || [];
  }
}

async function handleAddEnvelope() {
  const letters = await getAvailableLetters();
  if (!letters.length) {
    alert('暂无手写信图片。请将图片放入 assets/letter/ 并在 config.json 的 letters 中添加路径。');
    return;
  }
  if (letters.length === 1) {
    addEnvelope(letters[0]);
    return;
  }
  showLetterPickerModal(letters);
}

function showLetterPickerModal(letters) {
  const existing = document.querySelector('.letter-picker-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay letter-picker-overlay open';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h2>选择手写信</h2>
        <button class="modal-close letter-picker-close">×</button>
      </div>
      <div class="photo-grid-container">
        ${letters.map((src, i) => `
          <div class="photo-thumb letter-pick-thumb" data-src="${src}" title="手写信 ${i + 1}">
            <img src="${src}" alt="手写信 ${i + 1}" loading="lazy">
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.letter-picker-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll('.letter-pick-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const src = thumb.dataset.src;
      close();
      addEnvelope(src);
    });
  });
}

// ── Toolbar buttons ──────────────────────────────────────
function initToolbarButtons() {
  document.getElementById('addTextBtn').addEventListener('click', addTextbox);
  document.getElementById('addEnvelopeBtn').addEventListener('click', () => handleAddEnvelope());
  document.getElementById('lockAllBtn').addEventListener('click', lockAll);
  document.getElementById('unlockAllBtn').addEventListener('click', unlockAll);
}

// ── Pagination ───────────────────────────────────────────
function initPagination() {
  document.getElementById('prevPageBtn').addEventListener('click', () => {
    goToPage(getCurrentPage() - 1);
  });
  document.getElementById('nextPageBtn').addEventListener('click', () => {
    goToPage(getCurrentPage() + 1);
  });
  document.getElementById('addPageBtn').addEventListener('click', addPage);
  document.getElementById('deletePageBtn').addEventListener('click', () => {
    const count = storage.getPageCount(getCurrentSeason());
    if (count <= 1) return;
    if (confirm(`删除第 ${getCurrentPage()} 页？该页上的所有内容将被清除。`)) {
      deletePage();
    }
  });

  document.addEventListener('page-changed', updatePaginationUI);

  updatePaginationUI({
    detail: {
      page: 1,
      pageCount: storage.getPageCount(getCurrentSeason()),
    }
  });
}

function updatePaginationUI(e) {
  const { page, pageCount } = e.detail;
  document.getElementById('pageIndicator').textContent = `${page} / ${pageCount}`;
  document.getElementById('prevPageBtn').disabled = page <= 1;
  document.getElementById('nextPageBtn').disabled = page >= pageCount;
  document.getElementById('deletePageBtn').disabled = pageCount <= 1;
}
