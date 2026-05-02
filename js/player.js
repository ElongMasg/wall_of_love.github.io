// Music player for the photo wall
import storage from './storage.js';
import { getCurrentSeason, getCurrentPage } from './wall.js';
import { makeDraggable } from './drag.js';

const PLAYER_KEY = 'player:state';

let audio = null;
let tracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let playerEl = null;
let playlistEl = null;

// Playlist window state
let isPlaylistOpen = false;

export function initPlayer() {
  audio = new Audio();
  audio.volume = 0.6;

  audio.addEventListener('ended', () => nextTrack());
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', () => {
    updateDuration();
  });

  loadMusicFolder();
}

async function loadMusicFolder() {
  let folder = 'assets/music/';
  try {
    const res = await fetch('data/config.json');
    const data = await res.json();
    folder = data.musicFolder || folder;
  } catch {
    // use default
  }

  // Fetch directory listing via the config or assume common audio files
  // For now, we'll scan for common audio extensions in the folder path
  // Since we can't list a directory, we expose a mechanism to add tracks
  // via the config.json: "musicTracks": ["file1.mp3", "file2.mp3"]
  try {
    const res = await fetch('data/config.json');
    const data = await res.json();
    if (data.musicTracks && data.musicTracks.length) {
      tracks = data.musicTracks.map(t => ({
        name: t.replace(/\.[^.]+$/, ''),
        src: folder + t,
      }));
      updatePlaylistUI();
      if (tracks.length && !audio.src) {
        audio.src = tracks[0].src;
        updateTrackDisplay();
      }
    }
  } catch {
    // no tracks
  }
}

function getState() {
  return storage.get(PLAYER_KEY) || { visible: false, x: 100, y: 200, collapsed: false };
}

function saveState(state) {
  storage.set(PLAYER_KEY, state);
}

export function createPlayerEl() {
  if (playerEl) return playerEl;

  const state = getState();
  playerEl = document.createElement('div');
  playerEl.className = 'wall-item player-fixture';
  playerEl.dataset.id = 'music-player';
  playerEl.style.cssText = `left:${state.x}px; top:${state.y}px;`;

  playerEl.innerHTML = `
    <div class="player-body">
      <div class="player-header">
        <span class="player-icon">🎵</span>
        <span class="player-title" id="playerTitle">音乐播放器</span>
        <button class="player-btn-sm" id="closePlayerBtn" title="关闭播放器">×</button>
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
    </div>
    <div class="player-playlist" id="playerPlaylist"></div>
  `;

  document.getElementById('wallCanvas').appendChild(playerEl);

  // Event listeners for player controls
  playerEl.querySelector('#closePlayerBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    closePlayer();
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

  // Click on progress bar to seek
  playerEl.querySelector('#playerProgressBar').addEventListener('click', (e) => {
    if (!audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  });

  initPlayerDrag();
  syncPlayerUI();

  return playerEl;
}

function initPlayerDrag() {
  if (!playerEl) return;
  makeDraggable(playerEl, {
    onEnd(x, y) {
      const state = getState();
      state.x = x;
      state.y = y;
      saveState(state);
    }
  });
}

function togglePlay() {
  if (!audio.src || !tracks.length) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play();
    isPlaying = true;
  }
  syncPlayerUI();
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
  if (isPlaying) audio.play();
  updatePlaylistUI();
}

function updateTrackDisplay() {
  if (!playerEl) return;
  const track = tracks[currentTrackIndex];
  playerEl.querySelector('#playerTrack').textContent = track ? track.name : '未选择曲目';
}

function syncPlayerUI() {
  if (!playerEl) return;
  const btn = playerEl.querySelector('#playMusicBtn');
  btn.textContent = isPlaying ? '⏸' : '▶';
}

function updateProgress() {
  if (!playerEl || !audio.duration) return;
  const curr = playerEl.querySelector('#playerCurrTime');
  const fill = playerEl.querySelector('#playerProgressFill');
  const ratio = audio.currentTime / audio.duration;
  curr.textContent = formatTime(audio.currentTime);
  fill.style.width = (ratio * 100) + '%';
}

function updateDuration() {
  if (!playerEl) return;
  const dur = playerEl.querySelector('#playerDuration');
  dur.textContent = formatTime(audio.duration);
}

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
    list.innerHTML = '<div class="playlist-empty">播放列表为空</div>';
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

function closePlayer() {
  if (playerEl) {
    playerEl.remove();
    playerEl = null;
  }
  const state = getState();
  state.visible = false;
  saveState(state);
  isPlaying = false;
  audio.pause();
  audio.src = '';
}

export function showPlayer() {
  const state = getState();
  state.visible = true;
  saveState(state);
}

export function isPlayerVisible() {
  return !!playerEl;
}

export function restorePlayer() {
  const state = getState();
  if (state.visible) {
    createPlayerEl();
    // Ensure state is marked visible (in case of fresh load)
    const currentState = getState();
    if (!currentState.visible) {
      showPlayer();
    }
  }
}

export function getPlayerState() {
  return { isPlaying, currentTrackIndex, tracks: tracks.map(t => t.name) };
}