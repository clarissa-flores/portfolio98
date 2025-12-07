(() => {
  const BOOT_SEEN_KEY = 'clarissa-boot-seen';
  const MIN_DURATION = 1600;
  const MAX_DURATION = 2600;

  const el = document.querySelector('[data-boot-screen]');
  const bar = document.querySelector('[data-boot-progress]');
  const skip = document.querySelector('[data-boot-skip]');
  if (!el || !bar) return;

  const shouldSkip = sessionStorage.getItem(BOOT_SEEN_KEY) === 'true';
  if (shouldSkip) {
    el.remove();
    document.body.classList.add('boot-ready');
    return;
  }

  const show = () => {
    el.hidden = false;
    requestAnimationFrame(() => {
      el.dataset.active = 'true';
    });
  };

  let done = false;
  let progress = 0;
  const setProgress = (value) => {
    progress = Math.min(100, Math.max(0, value));
    bar.style.width = `${progress}%`;
  };

  const finish = () => {
    if (done) return;
    done = true;
    sessionStorage.setItem(BOOT_SEEN_KEY, 'true');
    document.body.classList.add('boot-ready');
    el.dataset.active = 'false';
    setTimeout(() => el.remove(), 400);
  };

  const animate = () => {
    if (done) return;
    const increment = 8 + Math.random() * 8;
    setProgress(progress + increment);
    if (progress >= 100) return;
    setTimeout(animate, 80 + Math.random() * 120);
  };

  const launch = () => {
    const duration = MIN_DURATION + Math.random() * (MAX_DURATION - MIN_DURATION);
    setTimeout(finish, duration);
    animate();
    try {
      window.__sound?.play?.('startup', { allowQueue: true });
    } catch {
      /* ignore sound errors */
    }
  };

  const onReady = () => {
    launch();
  };

  ['pointerdown', 'keydown'].forEach((evt) => {
    document.addEventListener(evt, () => {
      if (!el.hidden && !done) launch();
    }, { once: true, capture: true });
  });

  skip?.addEventListener('click', finish);

  show();
  if (document.readyState === 'complete') {
    onReady();
  } else {
    window.addEventListener('load', onReady, { once: true });
  }
})();
