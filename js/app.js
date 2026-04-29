import storage from './storage.js';
import { initWall, getSeasonLabel, getCurrentSeason } from './wall.js';
import { initUI } from './ui.js';
import { checkAnniversaries } from './banner.js';
import { initDrag } from './drag.js';
import { initNightMode } from './nightmode.js';

async function main() {
  await storage.loadDefaults();

  const params = new URLSearchParams(location.search);
  const season = params.get('season') || storage.getConfig()?.defaultSeason || 'spring';

  const canvas = document.getElementById('wallCanvas');
  if (!canvas) return;

  const sel = document.getElementById('seasonSelect');
  if (sel) sel.value = season;

  const label = document.getElementById('seasonLabel');
  if (label) label.textContent = getSeasonLabel(season);

  initDrag();
  initWall(canvas, season);
  initUI();
  initNightMode(canvas);
  checkAnniversaries();
}

document.addEventListener('DOMContentLoaded', main);
