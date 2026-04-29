// localStorage helpers
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
    } catch (e) {
      console.warn('Storage write failed:', e);
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

  async loadDefaults() {
    try {
      const res = await fetch('data/config.json');
      const data = await res.json();
      if (!this.getConfig()) {
        this.setConfig({
          anniversaries: data.anniversaries || [],
          defaultSeason: data.defaultSeason || 'spring',
          photos: data.photos || { spring:[], summer:[], autumn:[], winter:[] },
          backgrounds: data.backgrounds || { spring:'', summer:'', autumn:'', winter:'' },
        });
      }
      // Seed items for seasons that have none
      for (const season of ['spring','summer','autumn','winter']) {
        if (!this.get(`${season}:items`)) {
          const defaults = (data.defaultItems || {})[season] || [];
          this.setItems(season, defaults);
        }
      }
      return this.getConfig();
    } catch (e) {
      console.warn('Could not load config.json:', e);
      if (!this.getConfig()) {
        const defaultConfig = {
          anniversaries: [],
          defaultSeason: 'spring',
          photos: { spring:[], summer:[], autumn:[], winter:[] },
          backgrounds: { spring:'', summer:'', autumn:'', winter:'' },
        };
        this.setConfig(defaultConfig);
        return defaultConfig;
      }
      return this.getConfig();
    }
  }
};

export default storage;
