(() => {
  const setup = () => {
    const toggle = document.querySelector('[data-start-toggle]');
    const menu = document.querySelector('[data-start-menu]');
    const taskButtons = document.querySelector('[data-task-buttons]');
    if (!toggle || !menu || !taskButtons) {
      setTimeout(setup, 30);
      return;
    }

    let isOpen = false;
    const syncState = () => {
      menu.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
    };

    // Ensure hidden on load
    isOpen = false;
    syncState();

    const buttonMap = new Map();

    const removeTaskButton = (key) => {
      const entry = buttonMap.get(key);
      if (!entry) return;
      entry.el.remove();
      buttonMap.delete(key);
    };

    const closeAll = () => {
      // os-gui windows
      document.querySelectorAll('.window.os-window').forEach((el) => {
        const key = el.dataset.winId;
        const win = el.win || el.winbox;
        if (win && typeof win.close === 'function') {
          win.close();
        } else {
          el.remove();
          if (key) {
            document.dispatchEvent(new CustomEvent('winbox:closed', { detail: { key } }));
          }
        }
      });

      // legacy winbox-lite windows (fallback)
      document.querySelectorAll('.winbox-lite').forEach((el) => {
        const key = el.dataset.winId;
        el.remove();
        if (key) {
          document.dispatchEvent(new CustomEvent('winbox:closed', { detail: { key } }));
        }
      });

      // Clear task buttons explicitly
      buttonMap.forEach((_, key) => removeTaskButton(key));
    };

    let desktopHidden = false;
    const setDesktopVisibility = (hide) => {
      desktopHidden = hide;
      document.querySelectorAll('.window.os-window').forEach((el) => {
        el.dataset.prevDisplay = el.style.display || '';
        el.style.display = hide ? 'none' : (el.dataset.prevDisplay || '');
      });
    };

    const createTaskButton = ({ key, title, icon, win }) => {
      if (buttonMap.has(key)) {
        const existing = buttonMap.get(key);
        existing.winRef = win;
        return existing.el;
      }
      const btn = document.createElement('button');
      btn.className = 'task-button';
      btn.type = 'button';
      btn.dataset.winId = key;
      btn.dataset.minimizeTarget = 'true';
      btn.innerHTML = `
        <img src="${icon || '/assets/icons/windows.png'}" alt="" width="16" height="16" />
        <span>${title}</span>
      `;
      btn.addEventListener('click', () => {
        const ref = btn.winRef;
        const el = ref?.element || ref?.el || ref?.$window_element?.get?.(0);
        if (ref && el && document.body.contains(el)) {
          const isMinimized = el.classList.contains('minimized') || el.classList.contains('minimized-without-taskbar');
          const isHidden = el.style.display === 'none';
          if (isMinimized || isHidden) {
            if (typeof ref.restore === 'function') {
              ref.restore();
            } else if (typeof ref.unminimize === 'function') {
              ref.unminimize();
            } else {
              el.style.display = '';
            }
            if (typeof ref.focus === 'function') ref.focus();
            if (typeof ref.bringToFront === 'function') ref.bringToFront();
          } else {
            if (typeof ref.minimize === 'function') {
              ref.minimize();
            } else {
              el.style.display = 'none';
            }
          }
        } else if (window.__openWindow) {
          window.__openWindow(key);
        }
      });
      btn.winRef = win;
      buttonMap.set(key, { el: btn, winRef: win });
      taskButtons.appendChild(btn);
      return btn;
    };

    const menuItems = Array.from(menu.querySelectorAll('[data-start-action]'));
    let focusedIndex = -1;
    const focusItem = (nextIndex) => {
      if (menuItems.length === 0) return;
      focusedIndex = (nextIndex + menuItems.length) % menuItems.length;
      menuItems.forEach((btn, idx) => {
        btn.tabIndex = idx === focusedIndex ? 0 : -1;
      });
      menuItems[focusedIndex]?.focus();
    };

    const openMenu = () => {
      isOpen = true;
      syncState();
      focusItem(0);
    };

    const closeMenu = () => {
      isOpen = false;
      syncState();
      focusedIndex = -1;
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      isOpen = !isOpen;
      syncState();
      if (isOpen) focusItem(0);
    });

    menu.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    document.addEventListener('click', (event) => {
      if (isOpen && !menu.contains(event.target) && !toggle.contains(event.target)) {
        isOpen = false;
        syncState();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
      if (event.key === 'Escape' && !isOpen && toggle === document.activeElement) {
        toggle.blur();
      }
      if (event.ctrlKey && event.key === 'Escape') {
        isOpen ? closeMenu() : openMenu();
      }
      if (isOpen && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (event.key === 'Home') {
          focusItem(0);
        } else if (event.key === 'End') {
          focusItem(menuItems.length - 1);
        } else {
          focusItem(focusedIndex + delta);
        }
      }
      if (isOpen && (event.key === 'Enter' || event.key === ' ')) {
        const current = menuItems[focusedIndex];
        if (current) current.click();
      }
    });

    menuItems.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.startAction;
        closeMenu();
        if (!action) return;
        if (action === 'close-all') {
          closeAll();
          return;
        }
        if (window.__openWindow) {
          window.__openWindow(action);
        }
      });
      btn.tabIndex = -1;
      btn.addEventListener('mouseenter', () => {
        focusedIndex = idx;
        btn.tabIndex = 0;
        btn.focus();
      });
    });

    document.addEventListener('winbox:opened', (event) => {
      const detail = event.detail || {};
      if (!detail.key) return;
      createTaskButton(detail);
    });

    document.addEventListener('winbox:closed', (event) => {
      const detail = event.detail || {};
      if (!detail.key) return;
      removeTaskButton(detail.key);
    });

    document.addEventListener('winbox:focused', (event) => {
      const detail = event.detail || {};
      if (!detail.key) return;
      const entry = buttonMap.get(detail.key);
      if (entry?.el) {
        entry.el.classList.add('active');
      }
    });

    document.addEventListener('winbox:blurred', (event) => {
      const detail = event.detail || {};
      if (!detail.key) return;
      const entry = buttonMap.get(detail.key);
      if (entry?.el) {
        entry.el.classList.remove('active');
      }
    });

    const trayClose = document.querySelector('[data-tray-close]');
    if (trayClose) {
      trayClose.addEventListener('click', () => closeAll());
    }

    const trayShow = document.querySelector('[data-tray-show]');
    if (trayShow) {
      trayShow.addEventListener('click', () => setDesktopVisibility(!desktopHidden));
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
