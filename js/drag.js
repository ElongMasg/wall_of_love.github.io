// Pointer-events drag engine for wall items
let activeDrag = null;

export function initDrag() {
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
}

export function makeDraggable(el, opts = {}) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (el.dataset.locked === 'true') return;

    if (e.target.closest('.item-toolbar') ||
        e.target.closest('.resize-handle') ||
        e.target.closest('.rotate-handle')) return;
    const tc = e.target.closest('.textbox-content');
    if (tc && tc.contentEditable === 'true') return;

    e.preventDefault();
    e.stopPropagation();

    // Use stored left/top instead of getBoundingClientRect to avoid rotation distortion
    const wall = el.parentElement;
    const wallRect = wall.getBoundingClientRect();
    const elLeft = parseFloat(el.style.left) || 0;
    const elTop  = parseFloat(el.style.top)  || 0;
    const offsetX = e.clientX - wallRect.left - elLeft;
    const offsetY = e.clientY - wallRect.top  - elTop;

    activeDrag = { el, offsetX, offsetY, opts };
    el.classList.add('dragging');
    opts.onStart && opts.onStart(e);
  });
}

function onPointerMove(e) {
  if (!activeDrag) return;
  const { el, offsetX, offsetY, opts } = activeDrag;

  const wall = el.parentElement;
  const wallRect = wall.getBoundingClientRect();

  // Use the element's natural (un-rotated) dimensions for clamping
  const w = el.offsetWidth;
  const h = el.offsetHeight;

  let x = e.clientX - wallRect.left - offsetX;
  let y = e.clientY - wallRect.top  - offsetY;

  x = Math.max(0, Math.min(x, wallRect.width  - w));
  y = Math.max(0, Math.min(y, wall.scrollHeight - h));

  el.style.left = x + 'px';
  el.style.top  = y + 'px';

  opts.onMove && opts.onMove(x, y, e);
}

function onPointerUp(e) {
  if (!activeDrag) return;
  const { el, opts } = activeDrag;
  el.classList.remove('dragging');
  const x = parseFloat(el.style.left) || 0;
  const y = parseFloat(el.style.top)  || 0;
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

    // Record the angle offset between current pointer position and current rotation
    // so the element doesn't jump on first move
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const pointerAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    const currentRotation = parseFloat(
      (el.style.transform || '').match(/rotate\(([-\d.]+)deg\)/)?.[1] ?? 0
    );
    const angleOffset = currentRotation - pointerAngle;

    const onMove = (ev) => {
      const r = el.getBoundingClientRect();
      const ccx = r.left + r.width  / 2;
      const ccy = r.top  + r.height / 2;
      const raw = Math.atan2(ev.clientY - ccy, ev.clientX - ccx) * (180 / Math.PI) + 90;
      const angle = Math.round(raw + angleOffset);
      el.style.transform = `rotate(${angle}deg)`;
      onRotate && onRotate(angle);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}
