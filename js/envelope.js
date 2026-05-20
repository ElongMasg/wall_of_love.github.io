import { makeDraggable, makeResizable, makeRotatable } from './drag.js';

export function createEnvelopeElement(item, onUpdate, onSelect, onDelete) {
  const el = document.createElement('div');
  el.className = 'wall-item envelope-item';
  el.dataset.id = item.id;
  el.dataset.locked = item.locked ? 'true' : 'false';
  el.style.cssText = `
    left: ${item.x}px;
    top: ${item.y}px;
    width: ${item.width || 160}px;
    z-index: ${item.z || 10};
    transform: rotate(${item.rotation || 0}deg);
    position: absolute;
  `;

  // Envelope body
  const body = document.createElement('div');
  body.className = 'envelope-body';

  const flap = document.createElement('div');
  flap.className = 'envelope-flap';
  body.appendChild(flap);

  const seal = document.createElement('div');
  seal.className = 'envelope-seal';
  body.appendChild(seal);

  el.appendChild(body);

  // Action toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'item-toolbar';
  toolbar.style.display = 'none';
  toolbar.innerHTML = buildEnvelopeToolbar(item);
  el.appendChild(toolbar);

  // Handles
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.style.display = 'none';
  el.appendChild(resizeHandle);

  const rotateHandle = document.createElement('div');
  rotateHandle.className = 'rotate-handle';
  rotateHandle.style.display = 'none';
  el.appendChild(rotateHandle);

  // Selection
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.item-toolbar') ||
        e.target.closest('.resize-handle') ||
        e.target.closest('.rotate-handle')) return;
    onSelect(item.id);
  });

  // Drag
  makeDraggable(el, {
    onEnd(x, y) {
      item.x = x;
      item.y = y;
      onUpdate(item);
    }
  });

  // Resize
  makeResizable(resizeHandle, el, (w) => {
    item.width = w;
    onUpdate(item);
  });

  // Rotate
  makeRotatable(rotateHandle, el, (deg) => {
    item.rotation = deg;
    onUpdate(item);
  });

  // Toolbar actions
  toolbar.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    e.stopPropagation();
    if (action === 'delete') {
      onDelete(item.id);
    } else if (action === 'lock') {
      item.locked = !item.locked;
      el.dataset.locked = item.locked ? 'true' : 'false';
      toolbar.innerHTML = buildEnvelopeToolbar(item);
      onUpdate(item);
    } else if (action === 'view') {
      openLetterModal(item, onUpdate, el);
    }
  });

  // Double-click envelope body to quickly open letter
  body.addEventListener('dblclick', (e) => {
    if (item.locked) return;
    e.stopPropagation();
    openLetterModal(item, onUpdate, el);
  });

  return el;
}

// ── Letter Viewer ─────────────────────────────────────────

function openLetterModal(item, onUpdate, envelopeEl) {
  const existing = document.querySelector('.letter-viewer-overlay');
  if (existing) existing.remove();

  const imgSrc = item.letterImage;
  if (!imgSrc) {
    alert('这封信还没有关联的手写图片。');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'letter-viewer-overlay';

  const stage = document.createElement('div');
  stage.className = 'letter-viewer-stage';

  const img = document.createElement('img');
  img.className = 'letter-viewer-image';
  img.src = imgSrc;
  img.alt = '手写信';
  img.draggable = false;

  stage.appendChild(img);
  overlay.appendChild(stage);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'letter-viewer-close';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.title = '关闭';
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  // Show overlay — use double rAF so browser processes display:flex first
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });
  });

  // After unfold animation (1.4s), enable zoom + show close button
  const ANIMATION_MS = 1500;
  let revealed = false;

  const onRevealed = () => {
    if (revealed) return;
    revealed = true;
    stage.classList.add('revealed');
    img.classList.add('revealed');
    closeBtn.classList.add('visible');
  };

  // Listen for animation end as primary trigger
  stage.addEventListener('animationend', (e) => {
    if (e.animationName === 'letterUnfold') {
      onRevealed();
    }
  });

  // Fallback timer in case animationend doesn't fire
  setTimeout(onRevealed, ANIMATION_MS);

  // Close
  const close = () => {
    overlay.classList.remove('open');
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 350);
  };

  // Click on revealed letter to toggle zoom
  stage.addEventListener('click', (e) => {
    if (!stage.classList.contains('revealed')) return;
    e.stopPropagation();
    stage.classList.toggle('zoomed');
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  overlay.tabIndex = 0;
  overlay.focus();
}

function buildEnvelopeToolbar(item) {
  return `
    <button class="item-toolbar-btn" data-action="lock" title="${item.locked ? '解锁' : '锁定'}">
      ${item.locked ? '🔓' : '🔒'}
    </button>
    <button class="item-toolbar-btn envelope-view-btn" data-action="view" title="查看信件">👁️</button>
    <button class="item-toolbar-btn danger" data-action="delete" title="删除">🗑️</button>
  `;
}

export function selectEnvelope(el, selected) {
  if (selected) {
    el.classList.add('selected');
    el.querySelector('.item-toolbar').style.display = 'flex';
    el.querySelector('.resize-handle').style.display = 'block';
    el.querySelector('.rotate-handle').style.display = 'block';
  } else {
    el.classList.remove('selected');
    el.querySelector('.item-toolbar').style.display = 'none';
    el.querySelector('.resize-handle').style.display = 'none';
    el.querySelector('.rotate-handle').style.display = 'none';
  }
}
