// Music player for the photo wall — compact, expandable
import storage from './storage.js';
import { makeDraggable } from './drag.js';

const PLAYER_KEY = 'player:state';

let audio = null;
let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let playerEl = null;
let expanded = false;

export function initPlayer() {
  audio = new Audio();
  audio.volume = 0.6;

  audio.addEventListener('ended', () => nextTrack());
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateDuration);

  loadTracks();
}

function loadTracks() {
  const config = storage.getConfig();
  if (!config) return;

  const folder = config.musicFolder || 'assets/music/';
  const trackFiles = config.musicTracks || [];

  tracks = trackFiles.map(t => ({
    name: t.replace(/\.[^.]+$/, ''),
    src: encodeURI(folder + t),
  }));
}

// ── Create / show ──────────────────────────────────────

export function createPlayerEl() {
  if (playerEl) return playerEl;

  const state = getState();
  expanded = state.expanded ?? false;

  playerEl = document.createElement('div');
  playerEl.className = 'wall-item player-fixture';
  playerEl.dataset.id = 'music-player';
  playerEl.style.cssText = `left:${state.x}px; top:${state.y}px;`;

  playerEl.innerHTML = `
    <div class="player-collapsed" id="playerCollapsed">
      <button class="player-collapsed-btn" id="playerToggleBtn" title="展开播放器">🎵</button>
      <span class="player-collapsed-name" id="playerCollapsedName">无曲目</span>
      <button class="player-collapsed-play" id="playerMiniPlay">▶</button>
      <button class="player-collapsed-close" id="playerMiniClose">×</button>
    </div>
    <div class="player-expanded" id="playerExpanded" style="display:none">
      <div class="player-header">
        <span class="player-title">🎵 音乐播放器</span>
        <div class="player-header-actions">
          <button class="player-btn-sm" id="playerCollapseBtn" title="收起">_</button>
          <button class="player-btn-sm" id="playerCloseBtn" title="关闭">×</button>
        </div>
      </div>
      <div class="player-track" id="playerTrack">未选择曲目</div>
      <div class="player-progress-wrap">
        <span class="player-time" id="playerCurrTime">0:00</span>
        <div class="player-progress-bar" id="playerProgressBar">
          <div class="player-progress-fill" id="playerProgressFill"></div>
        </div>
        <span class="player-time" id="playerDuration">0:00</span>
      </div>
      <div class="player-controls">
        <button class="player-ctrl-btn" id="prevTrackBtn" title="上一曲">⏮</button>
        <button class="player-ctrl-btn primary" id="playMusicBtn" title="播放">▶</button>
        <button class="player-ctrl-btn" id="nextTrackBtn" title="下一曲">⏭</button>
        <button class="player-ctrl-btn" id="playlistBtn" title="播放列表">☰</button>
      </div>
      <div class="player-playlist" id="playerPlaylist"></div>
    </div>
  `;

  document.getElementById('wallCanvas').appendChild(playerEl);

  bindEvents();
  initPlayerDrag();
  refreshUI();

  if (expanded) {
    playerEl.classList.add('expanded');
    playerEl.querySelector('#playerCollapsed').style.display = 'none';
    playerEl.querySelector('#playerExpanded').style.display = '';
  }

  // Auto-load first track
  if (tracks.length && !audio.src) {
    loadTrack(0);
  }

  return playerEl;
}

function bindEvents() {
  // Collapsed controls
  playerEl.querySelector('#playerToggleBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    expand();
  });
  playerEl.querySelector('#playerMiniPlay').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  playerEl.querySelector('#playerMiniClose').addEventListener('click', (e) => {
    e.stopPropagation();
    closePlayer();
  });
  // Double-click collapsed to expand
  playerEl.querySelector('#playerCollapsed').addEventListener('dblclick', (e) => {
    e.stopPropagation();
    expand();
  });

  // Expanded controls
  playerEl.querySelector('#playerCloseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    closePlayer();
  });
  playerEl.querySelector('#playerCollapseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    collapse();
  });
  playerEl.querySelector('#playMusicBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });
  playerEl.querySelector('#prevTrackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    prevTrack();
  });
  playerEl.querySelector('#nextTrackBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    nextTrack();
  });
  playerEl.querySelector('#playlistBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlaylist();
  });

  // Progress bar seek
  playerEl.querySelector('#playerProgressBar').addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  });
}

function expand() {
  expanded = true;
  const collapsed = playerEl.querySelector('#playerCollapsed');
  const expandedEl = playerEl.querySelector('#playerExpanded');
  if (collapsed) collapsed.style.display = 'none';
  if (expandedEl) expandedEl.style.display = '';
  playerEl.classList.add('expanded');
  saveCurrentState();
  updatePlaylistUI();
}

function collapse() {
  expanded = false;
  const collapsed = playerEl.querySelector('#playerCollapsed');
  const expandedEl = playerEl.querySelector('#playerExpanded');
  if (collapsed) collapsed.style.display = '';
  if (expandedEl) expandedEl.style.display = 'none';
  playerEl.classList.remove('expanded');
  saveCurrentState();
}

// ── State persistence ──────────────────────────────────

function getState() {
  return storage.get(PLAYER_KEY) || { visible: false, x: 100, y: 200, expanded: false };
}

function saveCurrentState() {
  if (!playerEl) return;
  const x = parseFloat(playerEl.style.left) || 100;
  const y = parseFloat(playerEl.style.top) || 200;
  storage.set(PLAYER_KEY, { visible: true, x, y, expanded });
}

// ── Drag ───────────────────────────────────────────────

function initPlayerDrag() {
  if (!playerEl) return;
  makeDraggable(playerEl, {
    onEnd(x, y) {
      saveCurrentState();
    }
  });
}

// ── Playback ───────────────────────────────────────────

function togglePlay() {
  if (!audio.src || !tracks.length) {
    // Try loading first track
    if (tracks.length) {
      loadTrack(0);
    } else {
      return;
    }
  }
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
      isPlaying = false;
    });
    isPlaying = true;
  }
  refreshUI();
}

function prevTrack() {
  if (!tracks.length) return;
  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  loadTrack(currentTrackIndex);
}

function nextTrack() {
  if (!tracks.length) return;
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
  loadTrack(currentTrackIndex);
}

function loadTrack(index) {
  if (!tracks[index]) return;
  currentTrackIndex = index;
  audio.src = tracks[index].src;
  updateTrackDisplay();
  updatePlaylistUI();
  if (isPlaying) {
    audio.play().catch(err => {
      console.warn('Audio playback failed:', err);
      isPlaying = false;
    });
  }
}

// ── UI refresh ─────────────────────────────────────────

function refreshUI() {
  updateTrackDisplay();
  syncPlayBtn();
  updatePlaylistUI();
  updateCollapsedName();
}

function updateTrackDisplay() {
  if (!playerEl) return;
  const trackEl = playerEl.querySelector('#playerTrack');
  const track = tracks[currentTrackIndex];
  if (trackEl) trackEl.textContent = track ? track.name : '未选择曲目';
}

function updateCollapsedName() {
  if (!playerEl) return;
  const nameEl = playerEl.querySelector('#playerCollapsedName');
  const track = tracks[currentTrackIndex];
  if (nameEl) nameEl.textContent = track ? track.name : '无曲目';
}

function syncPlayBtn() {
  if (!playerEl) return;
  const btn = playerEl.querySelector('#playMusicBtn');
  const mini = playerEl.querySelector('#playerMiniPlay');
  const icon = isPlaying ? '⏸' : '▶';
  if (btn) btn.textContent = icon;
  if (mini) mini.textContent = icon;
}

function updateProgress() {
  if (!playerEl || !audio.duration) return;
  const curr = playerEl.querySelector('#playerCurrTime');
  const fill = playerEl.querySelector('#playerProgressFill');
  if (!curr || !fill) return;
  const ratio = audio.currentTime / audio.duration;
  curr.textContent = formatTime(audio.currentTime);
  fill.style.width = (ratio * 100) + '%';
}

function updateDuration() {
  if (!playerEl || !audio.duration) return;
  const dur = playerEl.querySelector('#playerDuration');
  if (dur) dur.textContent = formatTime(audio.duration);
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Playlist ───────────────────────────────────────────

let isPlaylistOpen = false;

function togglePlaylist() {
  isPlaylistOpen = !isPlaylistOpen;
  if (playerEl) {
    playerEl.classList.toggle('playlist-open', isPlaylistOpen);
  }
  updatePlaylistUI();
}

function updatePlaylistUI() {
  if (!playerEl) return;
  const list = playerEl.querySelector('#playerPlaylist');
  if (!list) return;

  if (!tracks.length) {
    list.innerHTML = '<div class="playlist-empty">播放列表为空<br><small>将音乐文件放入 assets/music/ 并在 config.json 的 musicTracks 中添加文件名</small></div>';
    return;
  }

  list.innerHTML = tracks.map((t, i) => `
    <div class="playlist-item ${i === currentTrackIndex ? 'active' : ''}" data-index="${i}">
      <span class="playlist-num">${i + 1}</span>
      <span class="playlist-name">${t.name}</span>
    </div>
  `).join('');

  list.querySelectorAll('.playlist-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(item.dataset.index);
      loadTrack(idx);
      isPlaylistOpen = false;
      playerEl.classList.remove('playlist-open');
    });
  });
}

// ── Close ──────────────────────────────────────────────

function closePlayer() {
  isPlaying = false;
  audio.pause();
  audio.src = '';
  if (playerEl) {
    playerEl.remove();
    playerEl = null;
  }
  expanded = false;
  isPlaylistOpen = false;
  storage.set(PLAYER_KEY, { visible: false, x: 100, y: 200, expanded: false });
}

// ── Public API ─────────────────────────────────────────

export function showPlayer() {
  const state = getState();
  state.visible = true;
  storage.set(PLAYER_KEY, state);
}

export function isPlayerVisible() {
  return !!playerEl;
}

export function restorePlayer() {
  const state = getState();
  if (state.visible) {
    createPlayerEl();
  }
}
