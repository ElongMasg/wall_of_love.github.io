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

// ── Letter Modal ──────────────────────────────────────────

function openLetterModal(item, onUpdate, envelopeEl) {
  // Remove any existing modal
  const existing = document.querySelector('.letter-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'letter-modal-overlay';

  const paper = document.createElement('div');
  paper.className = 'letter-modal-paper';

  // Header
  const header = document.createElement('div');
  header.className = 'letter-modal-header';

  const title = document.createElement('span');
  title.className = 'letter-modal-title';
  title.textContent = '💌 亲笔信';

  const savedHint = document.createElement('span');
  savedHint.className = 'letter-saved-indicator';
  savedHint.textContent = '✓ 已保存';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'letter-modal-close';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.title = '关闭';

  header.appendChild(title);
  header.appendChild(savedHint);
  header.appendChild(closeBtn);
  paper.appendChild(header);

  // Format bar
  const formatBar = document.createElement('div');
  formatBar.className = 'letter-format-bar';

  const fontFamily = item.fontFamily || 'Times New Roman, Georgia, serif';
  const fontSize = item.fontSize || 17;
  const color = item.color || '#3a2a1a';

  const fonts = [
    'Times New Roman, Georgia, serif',
    'Georgia, serif',
    'Arial, sans-serif',
    'Verdana, sans-serif',
    'Courier New, monospace',
  ];
  const fontSelect = document.createElement('select');
  fontSelect.innerHTML = fonts.map(f =>
    `<option value="${f}" ${fontFamily === f ? 'selected' : ''}>${f.split(',')[0]}</option>`
  ).join('');

  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.value = fontSize;
  sizeInput.min = 10;
  sizeInput.max = 48;
  sizeInput.title = '字号';

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = color;
  colorInput.title = '文字颜色';

  formatBar.appendChild(document.createTextNode(''));
  formatBar.appendChild(fontSelect);
  formatBar.appendChild(sizeInput);
  formatBar.appendChild(colorInput);
  paper.appendChild(formatBar);

  // Content area
  const body = document.createElement('div');
  body.className = 'letter-modal-body';

  const content = document.createElement('div');
  content.className = 'letter-modal-content';
  content.contentEditable = 'true';
  content.textContent = item.letterContent || '';
  applyLetterStyle(content, { fontFamily, fontSize, color });
  body.appendChild(content);
  paper.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'letter-modal-footer';

  const closeFooterBtn = document.createElement('button');
  closeFooterBtn.className = 'letter-btn letter-btn-close';
  closeFooterBtn.textContent = '关闭';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'letter-btn letter-btn-save';
  saveBtn.textContent = '保存';

  footer.appendChild(closeFooterBtn);
  footer.appendChild(saveBtn);
  paper.appendChild(footer);

  overlay.appendChild(paper);
  document.body.appendChild(overlay);

  // Show modal
  requestAnimationFrame(() => {
    overlay.classList.add('open');
  });

  // Focus content
  setTimeout(() => {
    content.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(content);
    sel.removeAllRanges();
    sel.addRange(range);
  }, 200);

  // Save handler
  const doSave = () => {
    item.letterContent = content.textContent || '';
    item.fontFamily = fontSelect.value;
    item.fontSize = parseInt(sizeInput.value);
    item.color = colorInput.value;
    onUpdate(item);
    // Flash saved indicator
    savedHint.classList.add('show');
    setTimeout(() => savedHint.classList.remove('show'), 1500);
  };

  saveBtn.addEventListener('click', doSave);

  // Keyboard shortcut: Cmd/Ctrl + S
  overlay.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      doSave();
    }
  });

  // Close handlers
  const close = () => {
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => {
      overlay.remove();
    }, { once: true });
    // Fallback if transitionend doesn't fire
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 400);
  };

  closeBtn.addEventListener('click', close);
  closeFooterBtn.addEventListener('click', close);

  // Click overlay background to close (save first)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      doSave();
      close();
    }
  });

  // Escape to save and close
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      doSave();
      close();
    }
  });

  // Apply style when format controls change
  fontSelect.addEventListener('change', () => {
    applyLetterStyle(content, {
      fontFamily: fontSelect.value,
      fontSize: parseInt(sizeInput.value),
      color: colorInput.value,
    });
  });
  sizeInput.addEventListener('input', () => {
    content.style.fontSize = sizeInput.value + 'px';
  });
  colorInput.addEventListener('input', () => {
    content.style.color = colorInput.value;
  });
}

function applyLetterStyle(el, { fontFamily, fontSize, color }) {
  el.style.fontFamily = fontFamily || 'Times New Roman, Georgia, serif';
  el.style.fontSize = (fontSize || 17) + 'px';
  el.style.color = color || '#3a2a1a';
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
