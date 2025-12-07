const OS_IMPORT = '/scripts/osWindowManager.js';
let osPromise = null;

const ensureOSManager = async () => {
  if (window.__openOSWindow) return;
  osPromise = osPromise || import(OS_IMPORT).catch((err) => {
    console.error('Failed to load os window manager', err);
    return null;
  });
  await osPromise;
};

const handleBlogClick = async (event) => {
  const link = event.target.closest('[data-blog-slug]');
  if (!link) return;
  event.preventDefault();

  await ensureOSManager();
  if (!window.WINDOWS) window.WINDOWS = {};

  const slug = link.dataset.blogSlug;
  const title = link.dataset.blogTitle || 'Blog';
  const key = `blog-${slug}`;

  window.WINDOWS[key] = window.WINDOWS[key] || {
    title,
    url: `/blog/${slug}`,
    x: 'center',
    y: 'center',
    icon: '/assets/icons/notepad.png',
    maximize: true
  };

  const opener = window.__openOSWindow || window.__openWindow;
  opener?.(key);
};

document.addEventListener('click', handleBlogClick);
