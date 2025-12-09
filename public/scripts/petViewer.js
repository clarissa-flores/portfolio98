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
    photoViews: new Map()
  };

  if (!state.images.length) {
    setStatusLine(root, 'No pet photos found.');
    return null;
  }

  const refs = {
    photo: root.querySelector('[data-pet-photo]'),
    rareFlag: root.querySelector('[data-rare-flag]'),
    photoIndex: root.querySelector('[data-photo-index]'),
    viewCount: root.querySelector('[data-view-count]')
  };

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
  nextPhoto({ forceRare: false });
  buildMenuBar();
  setStatusLine(root, 'Pet Viewer 2.0 ready.');

  return {
    next: nextPhoto,
    prev: prevPhoto
  };
}
