// Frame definitions
export const FRAMES = [
  { id: 'none',     label: '无边框',   icon: '□',  desc: 'No frame' },
  { id: 'polaroid', label: '拍立得',   icon: '📷', desc: 'Polaroid style' },
  { id: 'classic',  label: '古典',     icon: '🖼', desc: 'Classic golden border' },
  { id: 'vintage',  label: '复古',     icon: '🎞', desc: 'Dark vintage frame' },
  { id: 'heart',    label: '心形',     icon: '💕', desc: 'Heart border' },
  { id: 'film',     label: '胶片',     icon: '🎬', desc: 'Film strip' },
];

export function getFrameById(id) {
  return FRAMES.find(f => f.id === id) || FRAMES[0];
}
