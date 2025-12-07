(() => {
  const SOUND_PREF_KEY = 'clarissa-sound-enabled';
  const DEFAULT_VOLUME = 0.5;

  const manifest = {
    startup: '/sounds/startup.wav',
    chord: '/sounds/chord.wav',
    recycle: '/sounds/recycle.wav',
    chimes: '/sounds/chimes.wav',
    tada: '/sounds/tada.wav'
  };

  const buildAudio = (src) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = DEFAULT_VOLUME;
    return audio;
  };

  const soundBank = Object.fromEntries(
    Object.entries(manifest).map(([name, src]) => [name, buildAudio(src)])
  );

  let enabled = true;
  try {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    if (saved !== null) {
      enabled = saved === 'true';
    }
  } catch {
    /* ignore storage access issues */
  }

  let unlocked = false;
  const pendingQueue = [];

  const syncToggleUI = () => {
    document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(enabled));
      btn.title = enabled ? 'Sound on (click to mute)' : 'Sound muted (click to unmute)';
      const icon = btn.querySelector('[data-sound-icon]');
      if (icon) {
        icon.src = enabled ? '/assets/icons/loudspeaker.png' : '/assets/icons/loudspeaker-muted.png';
        icon.alt = enabled ? 'Sound on' : 'Sound muted';
      }
    });
  };

  const flushQueue = () => {
    if (!unlocked || !enabled) return;
    while (pendingQueue.length) {
      const playFn = pendingQueue.shift();
      playFn?.();
    }
  };

  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    Object.values(soundBank).forEach((audio) => {
      try {
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    });
    flushQueue();
  };

  ['pointerdown', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, unlock, { once: true, capture: true });
  });

  const setEnabled = (value) => {
    enabled = Boolean(value);
    try {
      localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
    } catch {
      /* ignore storage failures */
    }
    if (!enabled) {
      pendingQueue.length = 0;
    } else {
      flushQueue();
    }
    syncToggleUI();
  };

  const play = (name, options = {}) => {
    const { allowQueue = true, volume } = options;
    const template = soundBank[name];
    if (!template || !enabled) return;

    const doPlay = () => {
      const node = template.cloneNode();
      node.volume = typeof volume === 'number' ? volume : template.volume;
      node.play().catch(() => {});
    };

    if (!unlocked) {
      if (allowQueue) pendingQueue.push(doPlay);
      return;
    }

    doPlay();
  };

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-sound-toggle]');
    if (!btn) return;
    setEnabled(!enabled);
  });

  syncToggleUI();

  window.__sound = {
    play,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    isEnabled: () => enabled,
    manifest: { ...manifest }
  };
})();
