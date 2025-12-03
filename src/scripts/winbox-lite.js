const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computeCoord = (value, size, viewport) => {
  if (value === 'center') {
    return clamp(Math.round((viewport - size) / 2), 8, Math.max(viewport - size - 8, 8));
  }
  if (typeof value === 'number') return value;
  return 32 + Math.random() * 96;
};

const makeDraggable = (el, handle) => {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseDown = (event) => {
    if (event.button !== 0) return;
    dragging = true;
    offsetX = event.clientX - el.offsetLeft;
    offsetY = event.clientY - el.offsetTop;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (event) => {
    if (!dragging) return;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const left = clamp(event.clientX - offsetX, 0, Math.max(viewportW - el.offsetWidth, 0));
    const top = clamp(event.clientY - offsetY, 0, Math.max(viewportH - el.offsetHeight - 8, 0));
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const onMouseUp = () => {
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  handle.addEventListener('mousedown', onMouseDown);
};

class WinBoxLite {
  static zIndex = 1000;

  constructor(title = 'Window', options = {}) {
    this.id = options.id;
    this.options = options;
    this.title = title;
    this.width = typeof options.width === 'number' ? options.width : null;
    this.height = typeof options.height === 'number' ? options.height : null;
    this.isMinimized = false;
    this.isMaximized = false;
    this.prevBounds = null;
    this.fitContent = options.fitContent ?? false;
    this.titleBar = null;

    const classNames = Array.isArray(options.class)
      ? options.class.join(' ')
      : (options.class ?? '');

    this.el = document.createElement('div');
    this.el.className = `winbox-lite window ${classNames}`.trim();
    this.el.style.position = 'fixed';
    if (this.width) this.el.style.width = `${this.width}px`;
    if (this.height) this.el.style.height = `${this.height}px`;
    this.el.style.left = `${computeCoord(options.x, this.width, window.innerWidth)}px`;
    this.el.style.top = `${computeCoord(options.y, this.height, window.innerHeight)}px`;
    this.el.style.zIndex = `${++WinBoxLite.zIndex}`;
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', this.title);
    this.el.winbox = this;
    if (this.id) {
      this.el.dataset.winId = this.id;
    }

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    this.titleBar = titleBar;

    const heading = document.createElement('div');
    heading.className = 'title-bar-heading';
    if (options.icon) {
      const icon = document.createElement('img');
      icon.src = options.icon;
      icon.alt = '';
      icon.width = 16;
      icon.height = 16;
      icon.className = 'title-bar-icon';
      heading.appendChild(icon);
    }

    const titleText = document.createElement('div');
    titleText.className = 'title-bar-text';
    titleText.textContent = this.title;
    heading.appendChild(titleText);

    const controls = document.createElement('div');
    controls.className = 'title-bar-controls';

    const makeCtrl = (label, handler) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', label);
      btn.addEventListener('click', handler);
      return btn;
    };

    controls.append(
      makeCtrl('Minimize', () => this.minimize()),
      makeCtrl('Maximize', () => this.toggleMaximize()),
      makeCtrl('Close', () => this.close())
    );
    titleBar.append(heading, controls);

    this.el.appendChild(titleBar);

    this.body = document.createElement('div');
    this.body.className = 'window-body';
    this.body.winbox = this;
    if (this.id) {
      this.body.dataset.winId = this.id;
    }
    this.el.appendChild(this.body);

    document.body.appendChild(this.el);

    this.el.addEventListener('mousedown', () => this.focus());
    makeDraggable(this.el, titleBar);
    this.focus();

    const clampToViewport = () => {
      const margin = 16;
      const taskbar = document.querySelector('.taskbar');
      const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;
      const maxWidth = Math.max(window.innerWidth - margin * 2, 200);
      const maxHeight = Math.max(window.innerHeight - taskbarHeight - margin * 2, 160);
      const bounds = this.getBounds();
      const nextWidth = Math.min(bounds.width, maxWidth);
      const nextHeight = Math.min(bounds.height, maxHeight);
      const nextLeft = clamp(bounds.left, margin, Math.max(window.innerWidth - nextWidth - margin, margin));
      const nextTop = clamp(bounds.top, margin, Math.max(window.innerHeight - nextHeight - taskbarHeight - margin, margin));
      this.applyBounds({ width: nextWidth, height: nextHeight, left: nextLeft, top: nextTop });
    };

    window.addEventListener('resize', clampToViewport);
    this.cleanup = () => window.removeEventListener('resize', clampToViewport);

    const maybeFit = () => {
      if (!this.fitContent || this.isMaximized || this.isMinimized) return;
      const margin = 32;
      const taskbar = document.querySelector('.taskbar');
      const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;
      const bodyRect = this.body.getBoundingClientRect();
      const bodyWidth = Math.max(bodyRect.width, this.body.scrollWidth);
      const bodyHeight = Math.max(bodyRect.height, this.body.scrollHeight);
      const desiredWidth = bodyWidth + margin;
      const desiredHeight = bodyHeight + margin + 48; // include titlebar + padding
      const maxWidth = Math.max(window.innerWidth - margin * 2, 240);
      const maxHeight = Math.max(window.innerHeight - taskbarHeight - margin * 2, 360);
      const nextBounds = {
        width: Math.min(desiredWidth, maxWidth),
        height: Math.min(desiredHeight, maxHeight)
      };
      this.applyBounds(nextBounds);

      // If content still overflows, grow once more
      const overflowY = this.body.scrollHeight - this.body.clientHeight;
      if (overflowY > 0) {
        const adjustedHeight = Math.min(
          nextBounds.height + overflowY + 12,
          maxHeight
        );
        this.applyBounds({ height: adjustedHeight, width: nextBounds.width });
      }
    };

    if (options.mount) {
      this.body.append(options.mount);
      requestAnimationFrame(maybeFit);
    } else if (options.url) {
      this.loadUrl(options.url).then(() => {
        requestAnimationFrame(maybeFit);
        setTimeout(maybeFit, 50);
      });
    } else if (options.html) {
      this.body.innerHTML = options.html;
      requestAnimationFrame(maybeFit);
      setTimeout(maybeFit, 50);
    }
  }

  async loadUrl(url) {
    this.body.innerHTML = '<p>Loading…</p>';
    try {
      const res = await fetch(url, { headers: { 'X-Requested-With': 'WinBoxLite' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const content = doc.body?.innerHTML?.trim() ? doc.body.innerHTML : html;
      this.body.innerHTML = content;
    } catch (err) {
      this.body.innerHTML = `<p class="window-error">Unable to load content (${err.message}).</p>`;
    }
  }

  focus() {
    if (this.isMinimized) {
      this.restore();
    }
    // mark all others inactive
    document.querySelectorAll('.winbox-lite').forEach((node) => {
      if (node === this.el) return;
      node.classList.add('inactive');
      node.classList.remove('active');
      const tb = node.querySelector('.title-bar');
      if (tb) tb.classList.add('inactive');
    });
    this.el.classList.add('active');
    this.el.classList.remove('inactive');
    if (this.titleBar) this.titleBar.classList.remove('inactive');
    this.el.style.zIndex = `${++WinBoxLite.zIndex}`;
    if (typeof this.options.onfocus === 'function') {
      this.options.onfocus.call(this);
    }
  }

  getBounds() {
    return {
      left: parseFloat(this.el.style.left) || 0,
      top: parseFloat(this.el.style.top) || 0,
      width: this.el.offsetWidth,
      height: this.el.offsetHeight
    };
  }

  applyBounds({ left, top, width, height }) {
    if (typeof left === 'number') this.el.style.left = `${left}px`;
    if (typeof top === 'number') this.el.style.top = `${top}px`;
    if (typeof width === 'number') this.el.style.width = `${width}px`;
    if (typeof height === 'number') this.el.style.height = `${height}px`;
  }

  minimize() {
    if (this.isMinimized) return;
    this.prevBounds = this.getBounds();
    this.isMinimized = true;
    this.el.classList.add('winbox-minimized');
    this.el.classList.add('inactive');
    if (this.titleBar) this.titleBar.classList.add('inactive');
    this.el.style.display = 'none';
  }

  maximize() {
    if (this.isMaximized) return;
    this.prevBounds = this.getBounds();
    const margin = 6;
    const taskbar = document.querySelector('.taskbar');
    const taskbarHeight = taskbar ? taskbar.offsetHeight : 0;
    this.applyBounds({
      left: margin,
      top: margin,
      width: window.innerWidth - margin * 2,
      height: window.innerHeight - taskbarHeight - margin * 2
    });
    this.isMaximized = true;
    this.el.classList.add('winbox-maximized');
  }

  restore() {
    if (this.isMinimized) {
      this.el.style.display = '';
      this.el.classList.remove('winbox-minimized');
      this.isMinimized = false;
      this.focus();
      return;
    }
    if (this.isMaximized && this.prevBounds) {
      this.applyBounds(this.prevBounds);
      this.el.classList.remove('winbox-maximized');
      this.isMaximized = false;
      this.focus();
    }
  }

  toggleMaximize() {
    if (this.isMaximized) {
      this.restore();
    } else {
      this.maximize();
    }
  }

  close() {
    if (this.cleanup) this.cleanup();
    this.el.remove();
    if (typeof this.options.onblur === 'function') {
      this.options.onblur.call(this);
    }
    if (typeof this.options.onclose === 'function') {
      this.options.onclose.call(this);
    }
  }

  setBackground(color) {
    this.el.style.borderColor = color;
  }
}

window.WinBox = WinBoxLite;
