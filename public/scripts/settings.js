export const SETTINGS_DEFAULTS = {
  wallpaper: "url('/assets/wallpapers/clouds.jpeg')",
  wallpaperMode: 'cover',
  bgColor: '#008080',
  cursor: 'auto',
  neko: false,
  theme: '/os-gui/windows-98.css'
};

const SETTINGS_KEY = 'user-settings';

export const wallpaperDescriptions = {
  "url('/assets/wallpapers/clouds.jpeg')": 'Clouds — classic Windows 98 sky.',
  "url('/assets/wallpapers/bliss.jpg')": 'Bliss — an icon.',
  "url('/assets/wallpapers/bunny.jpg')": 'Bunny the cat.',
  "url('/assets/wallpapers/hazel.jpg')": 'Hazel the dog.',
  "url('/assets/wallpapers/riot.jpg')": 'The first wallpaper I ever made in Microsoft Paint.',
  "url('/assets/wallpapers/bedroomwall.JPG')": 'My childhood bedroom wall.',
  none: 'Solid color only.'
};

export const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage errors */
  }
};

export const applySetting = (key, value) => {
  const root = document.documentElement.style;
  switch (key) {
    case 'wallpaper':
      root.setProperty('--wallpaper', value);
      break;
    case 'theme':
      document.querySelectorAll('link[href*="/os-gui/"]').forEach((el) => {
        if (el.getAttribute('rel') === 'stylesheet') {
          el.href = value;
        }
      });
      break;
    case 'wallpaper-mode':
      switch (value) {
        case 'cover':
          root.setProperty('--wallpaper-size', 'cover');
          root.setProperty('--wallpaper-repeat', 'no-repeat');
          break;
        case 'contain':
          root.setProperty('--wallpaper-size', 'contain');
          root.setProperty('--wallpaper-repeat', 'no-repeat');
          break;
        case 'tile':
          root.setProperty('--wallpaper-size', 'auto');
          root.setProperty('--wallpaper-repeat', 'repeat');
          break;
        case 'stretch':
          root.setProperty('--wallpaper-size', '100% 100%');
          root.setProperty('--wallpaper-repeat', 'no-repeat');
          break;
        default:
          break;
      }
      break;
    case 'wallpaper-position':
      root.setProperty('--wallpaper-position', value);
      break;
    case 'bg-color':
      root.setProperty('--bg-color', value);
      break;
    case 'cursor':
      root.setProperty('--cursor', value);
      break;
    case 'neko':
      if (value) {
        loadNeko();
      } else {
        removeNeko();
      }
      break;
    default:
      break;
  }
};

export const applyAllSettings = (settings) => {
  const merged = { ...SETTINGS_DEFAULTS, ...(settings || {}) };
  applySetting('wallpaper', merged.wallpaper);
  applySetting('wallpaper-mode', merged.wallpaperMode);
  applySetting('wallpaper-position', merged.wallpaperPosition || 'center');
  applySetting('bg-color', merged.bgColor);
  applySetting('cursor', merged.cursor);
  applySetting('neko', merged.neko);
  return merged;
};

function loadNeko() {
  if (window.__nekoLoaded) return;
  const script = document.createElement('script');
  script.src = '/oneko/oneko.js';
  script.dataset.cat = '/oneko/oneko.gif';
  script.onload = () => { window.__nekoLoaded = true; };
  document.body.appendChild(script);
}

function removeNeko() {
  const el = document.getElementById('oneko');
  if (el) el.remove();
  window.__nekoLoaded = false;
}
