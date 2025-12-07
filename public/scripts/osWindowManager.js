const DEFAULT_CSS = ['/os-gui/windows-98.css', '/os-gui/layout.css'];
const DEFAULT_SCRIPTS = [
  '/os-gui/jquery.min.js',
  '/os-gui/MenuBar.js',
  '/os-gui/$Window.js'
];

export const OS_WINDOWS = {
  about: {
    title: 'About Clarissa',
    url: '/about',
    icon: '/assets/icons/user.png',
    width: 520,
    height: 480
  },
  projects: {
    title: 'Projects',
    url: '/projects',
    icon: '/assets/icons/folder-closed.png',
    width: 640,
    height: 520
  },
  contact: {
    title: 'Contact',
    url: '/contact',
    icon: '/assets/icons/mail.png',
    width: 520,
    height: 220
  },
  colophon: {
    title: 'Colophon',
    url: '/colophon',
    icon: '/assets/icons/help.png',
    width: 600,
    height: 680
  },
  blog: {
    title: 'Blog',
    url: '/blog',
    icon: '/assets/icons/notepad.png',
    width: 640,
    height: 520
  },
  settings: {
    title: 'Settings',
    url: '/settings',
    icon: '/assets/icons/monitor-gear.png',
    width: 540,
    height: 600
  },
  console: {
    title: 'Console',
    url: '/console',
    icon: '/assets/icons/console.png',
    width: 700,
    height: 520
  },
  solitaire: {
    title: 'Solitaire',
    url: '/solitaire/index.html',
    icon: '/assets/icons/solitaire.png',
    width: 900,
    height: 720,
    iframe: true
  },
  paint: {
    title: 'Paint',
    url: 'https://jspaint.app/',
    icon: '/assets/icons/paint.png',
    width: 960,
    height: 720,
    iframe: true
  },
  welcome: {
    title: 'Welcome',
    url: '/welcome',
    icon: '/assets/icons/warning.png',
    width: 480,
    height: 260
  },
  bunnyWin: {
    title: 'Bunny.exe',
    url: '/bunny',
    icon: '/assets/icons/bunny.png',
    width: 520,
    height: 140
  },
  hazelWin: {
    title: 'Hazel.exe',
    url: '/hazel',
    icon: '/assets/icons/hazel.png',
    width: 520,
    height: 140
  },
  bin: {
    title: 'Recycle Bin',
    url: '/bin',
    icon: '/assets/icons/bin.png',
    width: 520,
    height: 480
  }
};

const loadCssOnce = (href) => {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = (err) => reject(err);
    document.head.appendChild(el);
  });

const ensureOSGui = async () => {
  DEFAULT_CSS.forEach(loadCssOnce);
  for (const src of DEFAULT_SCRIPTS) {
    // load sequentially to satisfy dependencies (jQuery before $Window)
    // eslint-disable-next-line no-await-in-loop
    await loadScript(src);
  }
  return typeof window.$Window === 'function' ? window.$Window : null;
};

export function setupOSWindowManager(config) {
  const openMap = {};
  window.__osWindows = config;
  window.__osOpenMap = openMap;
  let lastFocusedKey = null;

  window.__openOSWindow = async (key) => {
    let cfg = config[key];
    if (!cfg && key.startsWith('blog-')) {
      const slug = key.replace('blog-', '');
      cfg = {
        title: 'Blog',
        url: `/blog/${slug}`,
        icon: '/assets/icons/notepad.png',
        width: 640,
        height: 520,
        maximize: true
      };
    }
    if (!cfg) return;

    const $WindowCtor = await ensureOSGui();
    if (!$WindowCtor) {
      console.error('os-gui not available');
      return;
    }

    const existing = openMap[key];
    if (existing && existing.element && document.body.contains(existing.element)) {
      existing.bringToFront?.();
      return;
    }

    const $w = $WindowCtor({
      title: cfg.title || key,
      resizable: cfg.resizable !== false,
      modal: cfg.modal === true
    });
    if ($w?.element) {
      $w.element.classList.add('os-window');
      $w.element.dataset.winId = key;
      const contentEl = $w.element.querySelector('.window-content');
      if (contentEl) contentEl.dataset.winId = key;
    }

    const setContent = (html) => {
      let inner = html;
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (doc?.body?.innerHTML) {
          inner = doc.body.innerHTML;
        }
      } catch {
        /* ignore parse errors */
      }
      if ($w.$content?.html) {
        $w.$content.html(inner);
      } else if ($w.element) {
        const target = $w.element.querySelector('.window-content') || $w.element;
        target.innerHTML = inner;
      }
    };

    const applyMenu = () => {
      if (!cfg.menu || !window.MenuBar || !$w.element) return;
      const normalizeItems = (items = []) => items.map((it) => {
        if (it === 'separator' || it === '-' || it?.divider) return window.MenuBar.MENU_DIVIDER;
        const mapped = { label: it.label || '' };
        if (typeof it.action === 'function') {
          mapped.action = () => it.action($w);
        } else if (it.action === 'close') {
          mapped.action = () => $w.close?.();
        } else if (it.open) {
          mapped.action = () => window.__openWindow?.(it.open);
        }
        return mapped;
      });
      const menus = cfg.menu.map((m) => ({
        label: m.label || '',
        items: normalizeItems(m.items)
      }));
      const bar = window.MenuBar(menus);
      const content = $w.element.querySelector('.window-content') || $w.element;
      content.prepend(bar.element || bar);
    };

    if (cfg.iframe) {
      const iframe = document.createElement('iframe');
      iframe.src = cfg.url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('loading', 'lazy');
      iframe.tabIndex = -1;
      iframe.addEventListener('load', () => {
        $w.bringToFront?.();
        $w.focus?.();
        markFocused();
      });
      if ($w.$content?.empty) $w.$content.empty();
      if ($w.$content?.append) {
        $w.$content.append(iframe);
      } else if ($w.element) {
        const target = $w.element.querySelector('.window-content') || $w.element;
        target.innerHTML = '';
        target.appendChild(iframe);
      }
    } else if (cfg.mount) {
      const node = cfg.mount();
      if (node) {
        $w.$content.empty?.();
        $w.$content.append(node);
      }
    } else if (cfg.url) {
      try {
        const res = await fetch(cfg.url, { headers: { 'X-Requested-With': 'OS-GUI' } });
        const html = await res.text();
        setContent(html);
      } catch (err) {
        setContent(`<p>Unable to load content (${err?.message || err}).</p>`);
      }
    }

    if (cfg.width || cfg.height) {
      $w.setDimensions?.({ innerWidth: cfg.width, innerHeight: cfg.height });
    }

    applyMenu();

    $w.center?.();
    const clampToViewport = () => {
      const el = $w.element;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxW = Math.max(window.innerWidth - 20, 240);
      const maxH = Math.max(window.innerHeight - 40, 160);
      const nextW = Math.min(rect.width, maxW);
      const nextH = Math.min(rect.height, maxH);
      if (nextW !== rect.width || nextH !== rect.height) {
        $w.setDimensions?.({ innerWidth: nextW, innerHeight: nextH });
      }
      const left = Math.min(Math.max(rect.left, 10), Math.max(window.innerWidth - nextW - 10, 10));
      const top = Math.min(Math.max(rect.top, 10), Math.max(window.innerHeight - nextH - 10, 10));
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    clampToViewport();
    window.addEventListener('resize', clampToViewport);

    const markFocused = () => {
      document.querySelectorAll('.window.os-window.focused').forEach((el) => {
        if (el !== $w.element) el.classList.remove('focused');
      });
      if ($w.element) $w.element.classList.add('focused');
      lastFocusedKey = key;
      document.dispatchEvent(new CustomEvent('winbox:focused', { detail: { key } }));
    };

    // Ensure new window is brought to front and focused
    $w.bringToFront?.();
    $w.focus?.();
    markFocused();
    requestAnimationFrame(markFocused);

    const taskBtn = document.querySelector(`.task-button[data-win-id="${key}"]`);
    if (taskBtn) {
      $w.minimize_target_el = taskBtn;
    }
    if (typeof $w.onClosed === 'function') {
      $w.onClosed(() => {
        delete openMap[key];
        document.dispatchEvent(new CustomEvent('winbox:closed', { detail: { key } }));
      });
    }
    if (typeof $w.onFocus === 'function') {
      $w.onFocus(markFocused);
    }
    if ($w.element) {
      $w.element.addEventListener('mousedown', markFocused);
      $w.element.addEventListener('focusin', markFocused);
    }
    if (typeof $w.onBlur === 'function') {
      $w.onBlur(() => {
        document.dispatchEvent(new CustomEvent('winbox:blurred', { detail: { key } }));
      });
    }

    openMap[key] = $w;

    document.dispatchEvent(new CustomEvent('winbox:opened', {
      detail: { key, title: cfg.title, icon: cfg.icon, win: $w }
    }));
  };

  // Ensure legacy callers work
  window.__openWindow = window.__openOSWindow;

  const isFormElement = (el) => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      tag === 'option' ||
      el.isContentEditable
    );
  };

  document.addEventListener('keydown', (event) => {
    if (!lastFocusedKey) return;
    if (isFormElement(document.activeElement)) return;
    if (event.key === 'Escape') {
      const win = openMap[lastFocusedKey];
      if (win && typeof win.close === 'function') {
        event.preventDefault();
        win.close();
      }
    }
  });
}
