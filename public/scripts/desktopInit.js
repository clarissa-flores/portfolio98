const OS_WINDOWS_IMPORT = '/scripts/osWindowManager.js';
const SETTINGS_IMPORT = '/scripts/settings.js';
const CONSOLE_IMPORT = '/scripts/console.js';
const BLOG_IMPORT = '/scripts/blogWindows.js';
const PET_DATA_IMPORT = '/scripts/petData.js';
const PET_VIEWER_IMPORT = '/scripts/petViewer.js';

let settingsModule = null;
let currentSettings = {};
let petViewerModule = null;
let petDataPromise = null;

const consoleModulePromise = import(CONSOLE_IMPORT).catch((err) => {
  console.error('Failed to load console module', err);
  return null;
});

import(BLOG_IMPORT).catch((err) => console.error('Failed to load blog window helper', err));

const osGuiReady = import(OS_WINDOWS_IMPORT)
  .then((mod) => {
    mod.setupOSWindowManager?.(mod.OS_WINDOWS || {});
    return mod;
  })
  .catch((err) => {
    console.error('Failed to load os-gui manager', err);
    return null;
  });

const ensureSettings = async () => {
  if (settingsModule) return settingsModule;
  try {
    settingsModule = await import(SETTINGS_IMPORT);
    window.__settings = settingsModule;
    currentSettings = settingsModule.applyAllSettings(settingsModule.loadSavedSettings());
    return settingsModule;
  } catch (err) {
    console.error('Failed to load settings', err);
    return null;
  }
};

const loadPetViewerModule = async () => {
  if (petViewerModule) return petViewerModule;
  try {
    petViewerModule = await import(PET_VIEWER_IMPORT);
    return petViewerModule;
  } catch (err) {
    console.error('Failed to load pet viewer', err);
    return null;
  }
};

const loadPetData = async () => {
  if (petDataPromise) return petDataPromise;
  petDataPromise = import(PET_DATA_IMPORT).catch((err) => {
    console.error('Failed to load pet data', err);
    return null;
  });
  return petDataPromise;
};

const bindDesktopIconHover = () => {
  document.querySelectorAll('.desktop-icon').forEach((icon) => {
    const img = icon.querySelector('img');
    const hoverSrc = icon.dataset.hoverIcon;
    if (!img || !hoverSrc) return;
    const baseSrc = img.getAttribute('src');
    const applyHover = () => img.setAttribute('src', hoverSrc);
    const removeHover = () => img.setAttribute('src', baseSrc);
    icon.addEventListener('mouseenter', applyHover);
    icon.addEventListener('mouseleave', removeHover);
    icon.addEventListener('focus', applyHover);
    icon.addEventListener('blur', removeHover);
  });
};

const bindDesktopIconSounds = () => {
  document.querySelectorAll('.desktop-icon[data-sound]').forEach((icon) => {
    const soundName = icon.dataset.sound;
    if (!soundName) return;
    const trigger = () => window.__sound?.play?.(soundName, { allowQueue: true });
    icon.addEventListener('dblclick', trigger);
    icon.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') trigger();
    });
  });
};

const getWinBody = (win) =>
  win?.body ||
  (win?.$content?.get ? win.$content.get(0) : win?.$content?.[0]) ||
  win?.element?.querySelector?.('.window-content') ||
  win?.element;

const openFileWindow = async (name, src, icon = '/assets/icons/bin.png') => {
  const osMod = await osGuiReady;
  const $WindowCtor = osMod?.$Window || window.$Window;
  if (!$WindowCtor) return;
  const key = `file-${name}`;
  const openMap = window.__osOpenMap || {};
  const existing = openMap[key];
  if (existing && existing.element && document.body.contains(existing.element)) {
    existing.bringToFront?.();
    existing.focus?.();
    return;
  }

  const $w = $WindowCtor({
    title: name,
    resizable: true,
    minimizable: true,
    maximizable: true,
    width: 420,
    height: 420
  });

  if ($w?.element) {
    $w.element.classList.add('os-window');
    $w.element.dataset.winId = key;
  }
  $w.center?.();
  $w.bringToFront?.();
  $w.focus?.();
  const content = $w.element?.querySelector('.window-content') || $w.element || $w.$content?.get?.(0);
  if (content) {
    content.innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = name;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    content.appendChild(img);
  }

  if (typeof $w.onClosed === 'function') {
    $w.onClosed(() => {
      delete openMap[key];
      document.dispatchEvent(new CustomEvent('winbox:closed', { detail: { key } }));
    });
  }
  if (typeof $w.onFocus === 'function') {
    $w.onFocus(() => {
      document.dispatchEvent(new CustomEvent('winbox:focused', { detail: { key } }));
    });
  }
  if (typeof $w.onBlur === 'function') {
    $w.onBlur(() => {
      document.dispatchEvent(new CustomEvent('winbox:blurred', { detail: { key } }));
    });
  }

  openMap[key] = $w;
  document.dispatchEvent(new CustomEvent('winbox:opened', {
    detail: { key, title: name, icon, win: $w }
  }));
};

const initPetViewer = async (win, pet) => {
  const petData = await loadPetData();
  const mod = await loadPetViewerModule();
  if (!mod?.setupPetViewer) return;
  const root =
    win?.body?.querySelector?.(`[data-pet-viewer="${pet}"]`) ||
    getWinBody(win)?.querySelector?.(`[data-pet-viewer="${pet}"]`);
  if (!root) return;
  mod.setupPetViewer(root, {
    pet,
    images: petData?.PET_IMAGES?.[pet] || [],
    rareImages: petData?.RARE_PET_IMAGES || [],
    rarityChance: petData?.RARE_PET_CHANCE ?? 0.07
  });
};

const initSettingsWindow = (win) => {
  const attempt = () => {
    const panel = getWinBody(win)?.querySelector?.('[data-settings]');
    if (!panel) {
      setTimeout(attempt, 30);
      return;
    }
    if (panel.dataset.settingsInit === 'true') return;
    panel.dataset.settingsInit = 'true';

    // Prevent window drag/focus churn when interacting with form controls
    const stopBubble = (el) => {
      if (!el) return;
      ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach((evt) => {
        el.addEventListener(evt, (e) => e.stopPropagation());
      });
    };
    panel.querySelectorAll('select, input, button, label').forEach(stopBubble);

    const wallpaperSelect = panel.querySelector('[data-setting="wallpaper"]');
    const bgColorInput = panel.querySelector('[data-setting="bg-color"]');
    const cursorSelect = panel.querySelector('[data-setting="cursor"]');
    const wallpaperModeSelect = panel.querySelector('[data-setting="wallpaper-mode"]');
    const wallpaperPosSelect = panel.querySelector('[data-setting="wallpaper-position"]');
    const nekoToggle = panel.querySelector('[data-setting="neko"]');
    const clippyToggle = panel.querySelector('[data-setting="clippy"]');
    const saveBtn = panel.querySelector('[data-settings-save]');
    const wallpaperHelp = panel.querySelector('[data-wallpaper-help]');
    const resetBtn = panel.querySelector('[data-settings-reset]');

    const syncWallpaperHelp = () => {
      if (!wallpaperHelp || !wallpaperSelect || !window.__settings) return;
      wallpaperHelp.textContent = window.__settings.wallpaperDescriptions[wallpaperSelect.value] ?? '';
    };

    const syncWallpaperModeState = () => {
      if (!wallpaperSelect) return;
      const isNone = wallpaperSelect.value === 'none';
      if (wallpaperModeSelect) wallpaperModeSelect.disabled = isNone;
      if (wallpaperPosSelect) wallpaperPosSelect.disabled = isNone;
    };

    if (wallpaperSelect) {
      wallpaperSelect.value = currentSettings.wallpaper || (window.__settings?.SETTINGS_DEFAULTS?.wallpaper ?? "url('/assets/wallpapers/clouds.jpeg')");
      wallpaperSelect.addEventListener('change', () => {
        window.__settings?.applySetting?.('wallpaper', wallpaperSelect.value);
        currentSettings.wallpaper = wallpaperSelect.value;
        syncWallpaperHelp();
        syncWallpaperModeState();
      });
      syncWallpaperHelp();
      syncWallpaperModeState();
    }
    if (wallpaperModeSelect) {
      wallpaperModeSelect.value = currentSettings.wallpaperMode || (window.__settings?.SETTINGS_DEFAULTS?.wallpaperMode ?? 'cover');
      wallpaperModeSelect.addEventListener('change', () => {
        window.__settings?.applySetting?.('wallpaper-mode', wallpaperModeSelect.value);
        currentSettings.wallpaperMode = wallpaperModeSelect.value;
      });
    }
    if (wallpaperPosSelect) {
      wallpaperPosSelect.value = currentSettings.wallpaperPosition || 'center';
      wallpaperPosSelect.addEventListener('change', () => {
        window.__settings?.applySetting?.('wallpaper-position', wallpaperPosSelect.value);
        currentSettings.wallpaperPosition = wallpaperPosSelect.value;
      });
    }
    if (bgColorInput) {
      bgColorInput.value = currentSettings.bgColor || (window.__settings?.SETTINGS_DEFAULTS?.bgColor ?? '#008080');
      bgColorInput.addEventListener('input', () => {
        window.__settings?.applySetting?.('bg-color', bgColorInput.value);
        currentSettings.bgColor = bgColorInput.value;
      });
    }
    if (cursorSelect) {
      cursorSelect.value = currentSettings.cursor || (window.__settings?.SETTINGS_DEFAULTS?.cursor ?? 'auto');
      cursorSelect.addEventListener('change', () => {
        window.__settings?.applySetting?.('cursor', cursorSelect.value);
        currentSettings.cursor = cursorSelect.value;
      });
    }
    if (nekoToggle) {
      nekoToggle.checked = Boolean(currentSettings.neko);
      nekoToggle.addEventListener('change', () => {
        currentSettings.neko = nekoToggle.checked;
        window.__settings?.applySetting?.('neko', currentSettings.neko);
      });
    }
    if (clippyToggle) {
      clippyToggle.checked = Boolean(currentSettings.clippy);
      clippyToggle.addEventListener('change', () => {
        currentSettings.clippy = clippyToggle.checked;
        window.__settings?.applySetting?.('clippy', currentSettings.clippy);
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', () => window.__settings?.saveSettings(currentSettings));
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentSettings = window.__settings?.applyAllSettings({}) || currentSettings;
        const defaults = window.__settings?.SETTINGS_DEFAULTS || {};
        if (wallpaperSelect) wallpaperSelect.value = defaults.wallpaper ?? "url('/assets/wallpapers/clouds.jpeg')";
        if (wallpaperModeSelect) wallpaperModeSelect.value = defaults.wallpaperMode ?? 'cover';
        if (wallpaperPosSelect) wallpaperPosSelect.value = 'center';
        if (bgColorInput) bgColorInput.value = defaults.bgColor ?? '#008080';
        if (cursorSelect) cursorSelect.value = defaults.cursor ?? 'auto';
        if (nekoToggle) nekoToggle.checked = Boolean(defaults.neko);
        if (clippyToggle) clippyToggle.checked = Boolean(defaults.clippy);
        window.__settings?.saveSettings(currentSettings);
        syncWallpaperHelp();
        syncWallpaperModeState();
      });
    }
  };
  attempt();
};

const bindFileLinks = () => {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-file-src]');
    if (!target) return;
    event.preventDefault();
    openFileWindow(target.dataset.fileName, target.dataset.fileSrc);
  });
};

const wireWindowEvents = () => {
  document.addEventListener('winbox:opened', (event) => {
    const detail = event.detail || {};
    if (detail.key === 'settings' && detail.win) {
      initSettingsWindow(detail.win);
    }
    if (detail.key === 'console' && detail.win) {
      consoleModulePromise.then((mod) => mod?.initConsoleWindow?.(detail.win));
    }
    if (detail.key === 'bunnyWin' && detail.win) {
      initPetViewer(detail.win, 'bunny');
    }
    if (detail.key === 'hazelWin' && detail.win) {
      initPetViewer(detail.win, 'hazel');
    }
  });
};

const initDesktop = async () => {
  await ensureSettings();
  await osGuiReady;
  bindDesktopIconHover();
  bindDesktopIconSounds();
  bindFileLinks();
  wireWindowEvents();
};

document.addEventListener('DOMContentLoaded', initDesktop);
