import storage from './storage.js';
import { initWall, getSeasonLabel, getCurrentSeason } from './wall.js';
import { initUI } from './ui.js';
import { checkAnniversaries } from './banner.js';

async function main() {
  // Load/seed defaults
  await storage.loadDefaults();

  const params = new URLSearchParams(location.search);
  const season = params.get('season') || storage.getConfig()?.defaultSeason || 'spring';

  const canvas = document.getElementById('wallCanvas');
  if (!canvas) return; // Not the wall page

  // Set season on select
  const sel = document.getElementById('seasonSelect');
  if (sel) sel.value = season;

  // Season label in toolbar
  const label = document.getElementById('seasonLabel');
  if (label) label.textContent = getSeasonLabel(season);

  initWall(canvas, season);
  initUI();
  checkAnniversaries();
}

document.addEventListener('DOMContentLoaded', main);
