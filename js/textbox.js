import { makeDraggable, makeResizable, makeRotatable } from './drag.js';

export function createTextboxElement(item, onUpdate, onSelect, onDelete) {
  const el = document.createElement('div');
  el.className = 'wall-item textbox-item';
  el.dataset.id = item.id;
  el.dataset.locked = item.locked ? 'true' : 'false';
  el.style.cssText = `
    left: ${item.x}px;
    top: ${item.y}px;
    width: ${item.width || 200}px;
    z-index: ${item.z || 10};
    transform: rotate(${item.rotation || 0}deg);
    position: absolute;
  `;

  const content = document.createElement('div');
  content.className = 'textbox-content';
  content.contentEditable = 'false';
  content.innerHTML = item.content || '点击输入文字';
  applyTextStyle(content, item);
  el.appendChild(content);

  // Format toolbar
  const fmtToolbar = document.createElement('div');
  fmtToolbar.className = 'text-format-toolbar';
  fmtToolbar.style.display = 'none';
  fmtToolbar.innerHTML = buildFormatToolbar(item);
  el.appendChild(fmtToolbar);

  // Action toolbar
  const actionToolbar = document.createElement('div');
  actionToolbar.className = 'item-toolbar';
  actionToolbar.style.display = 'none';
  actionToolbar.innerHTML = buildTextToolbar(item);
  el.appendChild(actionToolbar);

  // Handles
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';
  resizeHandle.style.display = 'none';
  el.appendChild(resizeHandle);

  const rotateHandle = document.createElement('div');
  rotateHandle.className = 'rotate-handle';
  rotateHandle.style.display = 'none';
  el.appendChild(rotateHandle);

  // Single click = select
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.item-toolbar') ||
        e.target.closest('.text-format-toolbar') ||
        e.target.closest('.resize-handle') ||
        e.target.closest('.rotate-handle')) return;
    onSelect(item.id);
  });

  // Double click = edit
  content.addEventListener('dblclick', (e) => {
    if (item.locked) return;
    e.stopPropagation();
    content.contentEditable = 'true';
    content.focus();
    fmtToolbar.style.display = 'flex';
    // Select all text on first click
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(content);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  content.addEventListener('blur', () => {
    content.contentEditable = 'false';
    fmtToolbar.style.display = 'none';
    item.content = content.innerHTML;
    onUpdate(item);
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

  // Format toolbar handlers
  fmtToolbar.addEventListener('change', (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    item[field] = e.target.value;
    applyTextStyle(content, item);
    onUpdate(item);
  });

  fmtToolbar.addEventListener('input', (e) => {
    const field = e.target.dataset.field;
    if (!field) return;
    item[field] = e.target.value;
    applyTextStyle(content, item);
  });

  // Action toolbar
  actionToolbar.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    e.stopPropagation();
    if (action === 'delete') {
      onDelete(item.id);
    } else if (action === 'lock') {
      item.locked = !item.locked;
      el.dataset.locked = item.locked ? 'true' : 'false';
      actionToolbar.innerHTML = buildTextToolbar(item);
      onUpdate(item);
    }
  });

  return el;
}

function applyTextStyle(el, item) {
  el.style.fontFamily = item.fontFamily || 'Georgia, serif';
  el.style.fontSize = (item.fontSize || 18) + 'px';
  el.style.color = item.color || '#3a2a1a';
  el.style.fontWeight = item.bold ? 'bold' : 'normal';
  el.style.fontStyle = item.italic ? 'italic' : 'normal';
}

function buildFormatToolbar(item) {
  const fonts = ['Georgia, serif', 'Arial, sans-serif', "'Times New Roman', serif", 'Verdana, sans-serif', 'Courier New, monospace'];
  const fontOptions = fonts.map(f =>
    `<option value="${f}" ${item.fontFamily === f ? 'selected' : ''}>${f.split(',')[0]}</option>`
  ).join('');
  return `
    <select data-field="fontFamily">${fontOptions}</select>
    <input type="number" data-field="fontSize" value="${item.fontSize || 18}" min="8" max="96" title="字号">
    <input type="color" data-field="color" value="${item.color || '#3a2a1a'}" title="颜色">
  `;
}

function buildTextToolbar(item) {
  return `
    <button class="item-toolbar-btn" data-action="lock" title="${item.locked ? '解锁' : '锁定'}">
      ${item.locked ? '🔓' : '🔒'}
    </button>
    <button class="item-toolbar-btn danger" data-action="delete" title="删除">🗑️</button>
  `;
}

export function selectTextbox(el, selected) {
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
    // Stop editing
    const c = el.querySelector('.textbox-content');
    if (c) c.contentEditable = 'false';
    const ft = el.querySelector('.text-format-toolbar');
    if (ft) ft.style.display = 'none';
  }
}
