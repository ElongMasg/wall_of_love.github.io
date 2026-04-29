// Pointer-events drag engine for wall items
let activeDrag = null;

export function initDrag(wallEl, onDragEnd) {
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

export function makeDraggable(el, opts = {}) {
  // opts: { onStart, onMove, onEnd, getTransform }
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const locked = el.closest('[data-locked="true"]');
    if (locked) return;

    // Don't drag if clicking a button or handle inside item toolbar
    if (e.target.closest('.item-toolbar') ||
        e.target.closest('.resize-handle') ||
        e.target.closest('.rotate-handle') ||
        e.target.closest('.textbox-content')) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    activeDrag = { el, offsetX, offsetY, opts };
    el.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    opts.onStart && opts.onStart(e);
  });
}

function onPointerMove(e) {
  if (!activeDrag) return;
  const { el, offsetX, offsetY, opts } = activeDrag;

  const wall = el.parentElement;
  const wallRect = wall.getBoundingClientRect();

  let x = e.clientX - wallRect.left - offsetX;
  let y = e.clientY - wallRect.top - offsetY;

  // Clamp to wall bounds
  x = Math.max(0, Math.min(x, wallRect.width - el.offsetWidth));
  y = Math.max(0, Math.min(y, wall.scrollHeight - el.offsetHeight));

  // Preserve existing rotation from the CSS transform
  const current = el.style.transform || '';
  const rotateMatch = current.match(/rotate\(([^)]+)\)/);
  const rotate = rotateMatch ? ` rotate(${rotateMatch[1]})` : '';

  el.style.left = x + 'px';
  el.style.top = y + 'px';

  opts.onMove && opts.onMove(x, y, e);
}

function onPointerUp(e) {
  if (!activeDrag) return;
  const { el, opts } = activeDrag;

  el.classList.remove('dragging');

  const x = parseFloat(el.style.left) || 0;
  const y = parseFloat(el.style.top) || 0;

  opts.onEnd && opts.onEnd(x, y, e);
  activeDrag = null;
}

// Resize handle drag
export function makeResizable(handle, el, onResize) {
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startW = el.offsetWidth;

    const onMove = (ev) => {
      const newW = Math.max(80, startW + ev.clientX - startX);
      el.style.width = newW + 'px';
      onResize && onResize(newW);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

// Rotate handle drag
export function makeRotatable(handle, el, onRotate) {
  handle.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
      const rounded = Math.round(angle);
      el.style.transform = `rotate(${rounded}deg)`;
      onRotate && onRotate(rounded);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}
