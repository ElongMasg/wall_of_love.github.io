import { makeDraggable, makeResizable, makeRotatable } from './drag.js';

export function createEnvelopeElement(item, onUpdate, onSelect, onDelete) {
  const el = document.createElement('div');
  el.className = 'wall-item envelope-item';
  el.dataset.id = item.id;
  el.dataset.locked = item.locked ? 'true' : 'false';
  el.style.cssText = `
    left: ${item.x}px;
    top: ${item.y}px;
    width: ${item.width || 180}px;
    z-index: ${item.z || 10};
    transform: rotate(${item.rotation || 0}deg);
    position: absolute;
  `;

  if (item.opened) {
    el.classList.add('opened');
  }

  // Envelope body
  const body = document.createElement('div');
  body.className = 'envelope-body';

  const flap = document.createElement('div');
  flap.className = 'envelope-flap';
  body.appendChild(flap);

  const seal = document.createElement('div');
  seal.className = 'envelope-seal';
  seal.innerHTML = '&#10084;&#65039;';
  body.appendChild(seal);

  const preview = document.createElement('div');
  preview.className = 'envelope-preview';
  preview.textContent = (item.letterContent || '').slice(0, 20) || '打开信封阅读...';
  body.appendChild(preview);

  el.appendChild(body);

  // Letter
  const letter = document.createElement('div');
  letter.className = 'envelope-letter';

  const letterContent = document.createElement('div');
  letterContent.className = 'letter-content';
  letterContent.contentEditable = 'false';
  letterContent.textContent = item.letterContent || '写下你的心里话...';
  letter.appendChild(letterContent);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'letter-close';
  closeBtn.innerHTML = '&#10005;';
  closeBtn.title = '合上信封';
  letter.appendChild(closeBtn);

  el.appendChild(letter);

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

  // Selection + toggle open/close on click
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.item-toolbar') ||
        e.target.closest('.resize-handle') ||
        e.target.closest('.rotate-handle') ||
        e.target.closest('.letter-close')) return;

    // If clicking envelope body and already selected, toggle open/close
    if (e.target.closest('.envelope-body') && el.classList.contains('selected')) {
      e.stopPropagation();
      toggleEnvelope(el, item, onUpdate);
      return;
    }

    onSelect(item.id);
  });

  // Close button
  closeBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (el.classList.contains('opened')) {
      toggleEnvelope(el, item, onUpdate);
    }
  });

  // Double click letter content to edit
  letterContent.addEventListener('dblclick', (e) => {
    if (item.locked) return;
    e.stopPropagation();
    letterContent.contentEditable = 'true';
    letterContent.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(letterContent);
    sel.removeAllRanges();
    sel.addRange(range);
  });

  letterContent.addEventListener('blur', () => {
    letterContent.contentEditable = 'false';
    item.letterContent = letterContent.textContent;
    onUpdate(item);
    updatePreview(el, item);
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
    }
  });

  return el;
}

function toggleEnvelope(el, item, onUpdate) {
  const isOpen = el.classList.contains('opened');
  if (isOpen) {
    el.classList.remove('opened');
    item.opened = false;
    // Stop editing if active
    const lc = el.querySelector('.letter-content');
    if (lc) lc.contentEditable = 'false';
  } else {
    el.classList.add('opened');
    item.opened = true;
  }
  onUpdate(item);
}

function updatePreview(el, item) {
  const preview = el.querySelector('.envelope-preview');
  if (preview) {
    preview.textContent = (item.letterContent || '').slice(0, 20) || '打开信封阅读...';
  }
}

function buildEnvelopeToolbar(item) {
  return `
    <button class="item-toolbar-btn" data-action="lock" title="${item.locked ? '解锁' : '锁定'}">
      ${item.locked ? '🔓' : '🔒'}
    </button>
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
    const lc = el.querySelector('.letter-content');
    if (lc) lc.contentEditable = 'false';
  }
}
