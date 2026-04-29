// localStorage helpers — photo images live in assets/, only paths are stored
const PREFIX = 'lifewall:';

const storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Storage write failed:', e);
      return false;
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  getItems(season) {
    return this.get(`${season}:items`) || [];
  },

  setItems(season, items) {
    this.set(`${season}:items`, items);
  },

  getConfig() {
    return this.get('config') || null;
  },

  setConfig(config) {
    this.set('config', config);
  },

  nextZ() {
    const z = (this.get('zCounter') || 10) + 1;
    this.set('zCounter', z);
    return z;
  },

  // Always reload photo list and backgrounds from config.json so adding files
  // to assets/ + editing config.json is reflected without clearing localStorage.
  async loadDefaults() {
    try {
      const res = await fetch('data/config.json');
      const data = await res.json();

      const existing = this.getConfig();
      this.set('config', {
        anniversaries: existing?.anniversaries ?? data.anniversaries ?? [],
        defaultSeason: data.defaultSeason ?? 'spring',
        // Photo list always comes from config.json (source of truth)
        photos: data.photos ?? { spring:[], summer:[], autumn:[], winter:[] },
        // Background paths always come from config.json
        backgrounds: data.backgrounds ?? { spring:'', summer:'', autumn:'', winter:'' },
      });

      for (const season of ['spring','summer','autumn','winter']) {
        if (!this.get(`${season}:items`)) {
          this.set(`${season}:items`, (data.defaultItems ?? {})[season] ?? []);
        }
      }
    } catch (e) {
      console.warn('Could not load config.json:', e);
      if (!this.getConfig()) {
        this.set('config', {
          anniversaries: [],
          defaultSeason: 'spring',
          photos: { spring:[], summer:[], autumn:[], winter:[] },
          backgrounds: { spring:'', summer:'', autumn:'', winter:'' },
        });
      }
    }
    return this.getConfig();
  }
};

export default storage;
