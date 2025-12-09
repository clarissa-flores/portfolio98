import { ClippyBrain } from './clippy-brain.js';

(() => {
  const PATH = '/vendor/clippy/agents/';
  window.CLIPPY_CDN = PATH;
  let agentPromise = null;
  let enabled = false;

  const bootReady = new Promise((resolve) => {
    if (document.body.classList.contains('boot-ready')) {
      resolve();
      return;
    }
    document.body.addEventListener('boot:ready', () => resolve(), { once: true });
  });

  const ensureLib = () =>
    new Promise((resolve, reject) => {
      if (window.clippy) {
        resolve(window.clippy);
        return;
      }

      const waitForJq = () =>
        new Promise((res, rej) => {
          if (window.jQuery) {
            res();
            return;
          }
          const jq = document.querySelector('[data-clippy-jq]');
          if (!jq) {
            rej(new Error('jQuery script not found'));
            return;
          }
          jq.addEventListener('load', () => res(), { once: true });
          jq.addEventListener('error', () => rej(new Error('Failed to load jQuery')), { once: true });
        });

      waitForJq()
        .then(() => {
          if (window.clippy) {
            resolve(window.clippy);
            return;
          }
          const script = document.querySelector('[data-clippy-lib]');
          if (!script) {
            reject(new Error('Clippy library script not found'));
            return;
          }
          const cleanup = () => {
            script.removeEventListener('load', onLoad);
            script.removeEventListener('error', onError);
          };
          const onLoad = () => {
            cleanup();
            if (window.clippy) {
              resolve(window.clippy);
            } else {
              reject(new Error('Clippy library missing after load'));
            }
          };
          const onError = () => {
            cleanup();
            reject(new Error('Failed to load Clippy library'));
          };
          script.addEventListener('load', onLoad, { once: true });
          script.addEventListener('error', onError, { once: true });
        })
        .catch(reject);
    });

  const mountAgent = () => {
    if (agentPromise) return agentPromise;
    agentPromise = Promise.all([bootReady, ensureLib()])
      .then(() => new Promise((resolve, reject) => {
        try {
          window.clippy.load(
            'Clippy',
            (agent) => {
              agent.show();
              ClippyBrain.setAgent(agent);
              agent.animate?.();
              agent.play?.('Greeting');
              ClippyBrain.onBoot();
              resolve(agent);
            },
            undefined,
            PATH
          );
        } catch (err) {
          reject(err);
        }
      }))
      .catch((err) => {
        console.warn('Clippy failed to load', err);
        agentPromise = null;
        return null;
      });
    return agentPromise;
  };

  const teardownAgent = () => {
    const cleanDom = () => {
      document.querySelectorAll('.clippy, .clippy-balloon').forEach((node) => node.remove());
    };
    agentPromise?.then((agent) => {
      agent?.hide?.();
      agent?.stop?.();
      cleanDom();
    });
    cleanDom();
    agentPromise = null;
  };

  window.__clippyToggle = {
    enable: () => {
      enabled = true;
      mountAgent();
    },
    disable: () => {
      enabled = false;
      teardownAgent();
    },
    isEnabled: () => enabled
  };

  const withAgent = (fn) => mountAgent().then((agent) => agent && fn(agent));

  const scheduleHint = () => {
    if (window.__clippyHintScheduled) return;
    window.__clippyHintScheduled = true;
    setTimeout(() => {
      if (!enabled) return;
      const target = document.querySelector('.desktop-icon');
      const center = target?.getBoundingClientRect
        ? target.getBoundingClientRect()
        : null;
      withAgent((agent) => {
        if (center) {
          const x = center.left + center.width / 2;
          const y = center.top + center.height / 2;
          agent.gestureAt?.(x, y);
        } else {
          agent.animate?.();
        }
        ClippyBrain.showBasicTip();
      });
    }, 1000);
  };

  const APP_MAP = {
    solitaire: 'solitaire',
    paint: 'paint',
    bunny: 'bunny',
    hazel: 'hazel',
    settings: 'settings'
  };

  document.addEventListener('winbox:opened', (event) => {
    const key = event.detail?.key;
    if (!key) return;
    const app = APP_MAP[key];
    if (app) ClippyBrain.onAppOpen(app);
  });

  // If settings were applied before this script loaded, honor them now.
  if (window.__clippyPreload === true) {
    window.__clippyToggle.enable();
  }

  // Always queue a gentle hint once per page view.
  scheduleHint();
})();
