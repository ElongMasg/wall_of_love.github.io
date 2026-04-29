import storage from './storage.js';
import { makeDraggable, makeResizable, makeRotatable } from './drag.js';
import { FRAMES } from './frames.js';

export function createPhotoElement(item, season, onUpdate, onSelect, onDelete) {
  const el = document.createElement('div');
  el.className = `wall-item photo-item frame-${item.frame || 'none'}`;
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

  const wrapper = document.createElement('div');
  wrapper.className = 'photo-wrapper';

  const img = document.createElement('img');
  img.className = 'photo-img';
  img.src = item.src;
  img.alt = item.caption || '';
  img.draggable = false;
  wrapper.appendChild(img);

  if (item.frame === 'polaroid' && item.caption) {
    const cap = document.createElement('span');
    cap.className = 'photo-caption';
    cap.textContent = item.caption;
    wrapper.appendChild(cap);
  }

  el.appendChild(wrapper);

  // Action toolbar (shown when selected)
  const toolbar = document.createElement('div');
  toolbar.className = 'item-toolbar';
  toolbar.style.display = 'none';
  toolbar.innerHTML = buildPhotoToolbar(item);
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

  // Dragging
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

  // Toolbar button actions
  toolbar.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    e.stopPropagation();

    if (action === 'delete') {
      onDelete(item.id);
    } else if (action === 'lock') {
      item.locked = !item.locked;
      el.dataset.locked = item.locked ? 'true' : 'false';
      toolbar.innerHTML = buildPhotoToolbar(item);
      onUpdate(item);
    } else if (action === 'caption') {
      const newCaption = prompt('输入照片说明文字:', item.caption || '');
      if (newCaption !== null) {
        item.caption = newCaption;
        onUpdate(item);
        // Re-render caption
        const cap = wrapper.querySelector('.photo-caption');
        if (item.frame === 'polaroid') {
          if (cap) cap.textContent = newCaption;
          else {
            const c = document.createElement('span');
            c.className = 'photo-caption';
            c.textContent = newCaption;
            wrapper.appendChild(c);
          }
        }
      }
    }
  });

  return el;
}

function buildPhotoToolbar(item) {
  return `
    <button class="item-toolbar-btn" data-action="lock" title="${item.locked ? '解锁' : '锁定'}">
      ${item.locked ? '🔓' : '🔒'}
    </button>
    <button class="item-toolbar-btn" data-action="caption" title="说明文字">✏️</button>
    <button class="item-toolbar-btn danger" data-action="delete" title="删除">🗑️</button>
  `;
}

export function selectPhoto(el, selected) {
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

export function applyFrame(el, frameId) {
  FRAMES.forEach(f => el.classList.remove(`frame-${f.id}`));
  el.classList.add(`frame-${frameId}`);
}
