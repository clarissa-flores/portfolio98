const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const randomFrom = (list = []) => list[Math.floor(Math.random() * list.length)];
const shuffle = (list = []) => [...list].sort(() => Math.random() - 0.5);
const ensureScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      // if it was already loaded
      if (existing.dataset.loaded === 'true') resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => {
      el.dataset.loaded = 'true';
      resolve();
    };
    el.onerror = reject;
    document.head.appendChild(el);
  });

const happinessLabel = (value) => {
  if (value >= 85) return 'Overjoyed';
  if (value >= 65) return 'Happy';
  if (value >= 45) return 'Content';
  if (value >= 25) return 'Needs attention';
  return 'Lonely';
};

const setStatusLine = (root, text) => {
  const status = root.querySelector('[data-status-line]');
  if (status) status.textContent = text;
};

const renderRarity = (root, chance) => {
  const rarity = root.querySelector('[data-photo-rarity]');
  if (rarity) rarity.textContent = `Rarity chance: ${(chance * 100).toFixed(0)}%`;
};

const renderHappiness = (root, happiness) => {
  const meter = root.querySelector('[data-happy-bar]');
  const label = root.querySelector('[data-happy-label]');
  if (meter) meter.style.width = `${happiness}%`;
  if (label) label.textContent = happinessLabel(happiness);
};

const triggerRareCelebration = () => {
  import('/scripts/clippy-brain.js')
    .then((mod) => mod?.ClippyBrain?.onRarePet?.())
    .catch(() => {});
};

export function setupPetViewer(root, config) {
  if (!root || root.dataset.petViewerInit === 'true') return null;
  root.dataset.petViewerInit = 'true';

  const petKey = config?.pet || 'pet';
  const petLabel = config?.petLabel || (petKey ? `${petKey[0].toUpperCase()}${petKey.slice(1)}` : 'Pet');
  const baseChance = typeof config?.rarityChance === 'number' ? config.rarityChance : 0.07;
  const state = {
    pet: petKey,
    petLabel,
    images: Array.isArray(config?.images) ? [...config.images] : [],
    rareImages: Array.isArray(config?.rareImages) ? [...config.rareImages] : [],
    totalPhotos: Array.isArray(config?.images) ? config.images.length : 0,
    rarityChance: baseChance,
    baseChance,
    luckyMode: false,
    queue: [],
    history: [],
    photoIndex: -1,
    viewCount: 0,
    happiness: 60,
    seen: new Set(),
    uniqueCount: 0,
    photoViews: new Map(),
    started: false
  };

  if (!state.images.length) {
    setStatusLine(root, 'No pet photos found.');
    return null;
  }

  const refs = {
    photo: root.querySelector('[data-pet-photo]'),
    rareFlag: root.querySelector('[data-rare-flag]'),
    photoIndex: root.querySelector('[data-photo-index]'),
    viewCount: root.querySelector('[data-view-count]'),
    loader: root.querySelector('[data-pet-loader]'),
    loaderBar: root.querySelector('[data-pet-progress]'),
    loaderText: root.querySelector('[data-pet-loader-text]'),
    loaderBtn: root.querySelector('[data-pet-launch]'),
    content: root.querySelector('[data-pet-content]'),
    menubar: root.querySelector('[data-pet-menubar]')
  };
  const initialWindowEl = root.closest('.window, .os-window');

  const buildQueue = () => {
    if (!state.queue.length) {
      state.queue = shuffle(state.images);
    }
  };

  const pullNextBase = () => {
    buildQueue();
    const next = state.queue.pop();
    if (!state.queue.length) {
      state.queue = shuffle(state.images);
    }
    return next;
  };

  const makeEntry = ({ forceRare = false } = {}) => {
    const canGoRare = state.rareImages.length > 0;
    const shouldGoRare = canGoRare && (forceRare || Math.random() < state.rarityChance);
    const src = shouldGoRare ? randomFrom(state.rareImages) : pullNextBase();
    return {
      src: src || pullNextBase(),
      isRare: Boolean(shouldGoRare && src)
    };
  };

  const updateMeta = (entry) => {
    const total = Math.max(state.totalPhotos, 0);
    if (refs.photoIndex) {
      refs.photoIndex.textContent = `Unique ${state.uniqueCount} / ${total}`;
    }
    if (refs.viewCount) {
      const perPhotoViews = entry ? (state.photoViews.get(entry.src) || 0) : 0;
      const label = perPhotoViews === 1 ? 'time' : 'times';
      refs.viewCount.textContent = `Viewed ${perPhotoViews} ${label}`;
    }
    renderRarity(root, state.rarityChance);
  };

  const adjustHappiness = (delta) => {
    state.happiness = clamp(state.happiness + delta, 0, 100);
    renderHappiness(root, state.happiness);
  };

  const showEntry = (entry, { isNew = false, incrementView = true } = {}) => {
    if (!entry || !refs.photo) return;
    refs.photo.src = entry.src;
    refs.photo.alt = `${state.petLabel} photo`;
    if (refs.rareFlag) {
      refs.rareFlag.hidden = !entry.isRare;
    }
    if (incrementView) {
      const current = state.photoViews.get(entry.src) || 0;
      state.photoViews.set(entry.src, current + 1);
    }
    const viewPenalty = isNew ? -1 : 0;
    const rareBoost = entry.isRare ? 12 : 0;
    const isBasePhoto = state.images.includes(entry.src);
    if (isNew && isBasePhoto && !state.seen.has(entry.src)) {
      state.seen.add(entry.src);
      state.uniqueCount = state.seen.size;
    }
    adjustHappiness(viewPenalty + rareBoost);
    if (entry.isRare) triggerRareCelebration();
    updateMeta(entry);
  };

  const nextPhoto = ({ forceRare = false } = {}) => {
    const hasForwardHistory = state.photoIndex < state.history.length - 1 && !forceRare;
    if (hasForwardHistory) {
      state.photoIndex += 1;
      showEntry(state.history[state.photoIndex], { isNew: false });
      setStatusLine(root, 'Revisiting a favorite shot.');
      return;
    }
    const entry = makeEntry({ forceRare });
    state.history = state.history.slice(0, state.photoIndex + 1);
    state.history.push(entry);
    state.photoIndex = state.history.length - 1;
    showEntry(entry, { isNew: true });
    setStatusLine(root, forceRare ? 'Lucky mode rolled a rare photo!' : 'New photo loaded.');
  };

  const prevPhoto = () => {
    if (state.photoIndex <= 0) {
      setStatusLine(root, 'At the first photo already.');
      adjustHappiness(-1);
      return;
    }
    state.photoIndex -= 1;
    showEntry(state.history[state.photoIndex], { isNew: false });
    setStatusLine(root, 'Back in time one photo.');
  };

  const toggleLuckyMode = () => {
    state.luckyMode = !state.luckyMode;
    state.rarityChance = state.luckyMode ? Math.max(state.rarityChance, 0.2) : state.baseChance;
    renderRarity(root, state.rarityChance);
    setStatusLine(root, state.luckyMode ? 'Lucky mode on. Rare rolls boosted.' : 'Lucky mode off.');
  };

  const resetChance = () => {
    state.rarityChance = state.baseChance;
    state.luckyMode = false;
    renderRarity(root, state.rarityChance);
    setStatusLine(root, 'Rarity reset to default.');
  };

  const pet = () => {
    adjustHappiness(8);
    setStatusLine(root, `${state.petLabel} loved that ear scritch.`);
  };

  const treat = () => {
    adjustHappiness(12);
    state.rarityChance = clamp(state.rarityChance + 0.02, 0.35);
    renderRarity(root, state.rarityChance);
    setStatusLine(root, 'Treat given. Spirits (and luck) boosted.');
  };

  const randomTip = () => {
    const tips = [
      'Try Lucky Mode for a better rare chance.',
      'Treats make everyone happier.',
      'Arrow keys also move through photos.',
      'Rare finds glow in the corner of the frame.'
    ];
    setStatusLine(root, randomFrom(tips));
  };

  const buildMenuBar = async () => {
    if (!window.MenuBar) {
      try {
        await ensureScript('/os-gui/MenuBar.js');
      } catch (err) {
        console.warn('MenuBar failed to load', err);
      }
    }
    const host = root.querySelector('[data-pet-menubar]');
    if (!host || !window.MenuBar) return;
    const menus = {
      '&File': [
        { label: '&Next Photo\t→', action: () => nextPhoto() },
        { label: '&Previous Photo\t←', action: () => prevPhoto() },
        { label: '&Surprise Photo', action: () => nextPhoto({ forceRare: Math.random() < 0.5 }) }
      ],
      '&View': [
        { label: '&Lucky Mode', action: () => toggleLuckyMode() },
        { label: '&Reset Rarity', action: () => resetChance() }
      ],
      '&Tools': [
        { label: '&Pet', action: () => pet() },
        { label: 'Give &Treat', action: () => treat() }
      ],
      '&Help': [{ label: '&Tip', action: () => randomTip() }]
    };
    const bar = window.MenuBar(menus);
    host.innerHTML = '';
    host.appendChild(bar.element || bar);
  };

  const spawnViewerWindow = () => {
    const ctor = window.$Window;
    if (typeof ctor !== 'function') return null;
    const key = `pet-viewer-${state.pet}`;
    const icon = state.pet === 'bunny' ? '/assets/icons/bunny.png' : state.pet === 'hazel' ? '/assets/icons/hazel.png' : '/assets/icons/bunny.png';
    const openMap = window.__osOpenMap || (window.__osOpenMap = {});
    const existing = openMap[key];
    if (existing && existing.element && document.body.contains(existing.element)) {
      existing.bringToFront?.();
      existing.focus?.();
      return existing;
    }

    const $w = ctor({
      title: `${state.petLabel}.exe`,
      resizable: true,
      minimizable: true,
      maximizable: true,
      width: 720,
      height: 520
    });
    if ($w?.element) {
      $w.element.classList.add('os-window');
      $w.element.dataset.winId = key;
      const contentEl = $w.element.querySelector('.window-content') || $w.element;
      if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.appendChild(root);
        root.tabIndex = -1;
        root.focus?.();
      }
      $w.center?.();
      $w.bringToFront?.();
      $w.focus?.();
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
      detail: { key, title: `${state.petLabel}.exe`, icon, win: $w }
    }));
    document.dispatchEvent(new CustomEvent('winbox:focused', { detail: { key, win: $w } }));
    return $w;
  };

  root.addEventListener('click', (event) => {
    const action = event.target.closest('[data-pet-action]');
    if (!action) return;
    const name = action.dataset.petAction;
    switch (name) {
      case 'next':
        nextPhoto();
        break;
      case 'prev':
        prevPhoto();
        break;
      case 'random':
        nextPhoto({ forceRare: Math.random() < 0.3 });
        break;
      case 'pet':
        pet();
        break;
      case 'treat':
        treat();
        break;
      case 'toggle-rare':
        toggleLuckyMode();
        break;
      case 'reset-chance':
        resetChance();
        break;
      case 'tip':
        randomTip();
        break;
      default:
        break;
    }
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      nextPhoto();
    } else if (event.key === 'ArrowLeft') {
      prevPhoto();
    }
  });

  renderHappiness(root, state.happiness);
  renderRarity(root, state.rarityChance);
  buildMenuBar();
  if (refs.menubar) refs.menubar.hidden = true;

  const startViewer = () => {
    if (state.started) return;
    state.started = true;
    if (refs.loader) refs.loader.remove();
    if (refs.content) refs.content.hidden = false;
    if (refs.menubar) refs.menubar.hidden = false;
    const newWin = spawnViewerWindow();
    if (!newWin) {
      if (refs.loader && refs.loader.parentElement !== root) {
        refs.loader.remove();
      }
    } else if (initialWindowEl && initialWindowEl !== newWin.element) {
      const maybeClose =
        initialWindowEl.$window?.close ||
        initialWindowEl.close ||
        initialWindowEl.$win?.close;
      if (typeof maybeClose === 'function') {
        maybeClose.call(initialWindowEl.$window || initialWindowEl.$win || initialWindowEl);
      } else {
        initialWindowEl.remove?.();
      }
    }
    nextPhoto({ forceRare: false });
    setStatusLine(root, 'Pet Viewer 2.0 ready.');
  };

  const runLoader = () => {
    if (!refs.loader || !refs.loaderBar) {
      startViewer();
      return;
    }
    let progress = 0;
    const render = () => {
      refs.loaderBar.style.width = `${progress}%`;
      if (refs.loaderText) {
        refs.loaderText.textContent = progress >= 100
          ? `${state.petLabel} ready!`
          : `Initializing ${state.petLabel}... ${progress}%`;
      }
    };
    render();
    const tick = () => {
      progress = Math.min(100, progress + 5);
      render();
      if (progress >= 100) {
        clearInterval(timer);
        if (refs.loaderBtn) refs.loaderBtn.hidden = false;
        if (refs.loaderBtn) refs.loaderBtn.focus?.();
      }
    };
    const timer = setInterval(tick, 100);
    refs.loaderBtn?.addEventListener('click', startViewer, { once: true });
  };

  runLoader();

  return {
    next: nextPhoto,
    prev: prevPhoto
  };
}
