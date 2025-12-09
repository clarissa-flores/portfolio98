export type DesktopIcon = {
  label: string;
  icon: string;
  hoverIcon?: string;
  windowKey?: string;
  href?: string;
  target?: string;
  rel?: string;
  imgClass?: string;
  sound?: string;
};

export const DESKTOP_ICONS: DesktopIcon[] = [
  { label: 'Welcome', icon: '/assets/icons/warning.png', windowKey: 'welcome' },
  { label: 'About', icon: '/assets/icons/user.png', windowKey: 'about' },
  { label: 'Projects', icon: '/assets/icons/folder-closed.png', hoverIcon: '/assets/icons/folder-open.png', windowKey: 'projects' },
  { label: 'Resume', icon: '/assets/icons/document.png', href: '/assets/Clarissa-Flores_Wordpress-Developer.pdf', target: '_blank', rel: 'noreferrer' },
  { label: 'Contact', icon: '/assets/icons/mail.png', windowKey: 'contact' },
  { label: 'Blog', icon: '/assets/icons/notepad.png', hoverIcon: '/assets/icons/notepad-file.png', windowKey: 'blog' },
  { label: 'Console', icon: '/assets/icons/console.png', windowKey: 'console' },
  { label: 'Solitaire', icon: '/assets/icons/solitaire.png', windowKey: 'solitaire' },
  { label: 'Paint', icon: '/assets/icons/paint.png', windowKey: 'paint' },
  { label: 'Bunny.exe', icon: '/assets/icons/bunny.png', windowKey: 'bunnyWin', imgClass: 'custom-icon' },
  { label: 'Hazel.exe', icon: '/assets/icons/hazel.png', windowKey: 'hazelWin', imgClass: 'custom-icon' },
  { label: 'Settings', icon: '/assets/icons/monitor-gear.png', windowKey: 'settings' },
  { label: 'Colophon', icon: '/assets/icons/help.png', windowKey: 'colophon' },
  { label: 'Recycle Bin', icon: '/assets/icons/bin.png', hoverIcon: '/assets/icons/bin-empty.png', windowKey: 'bin', sound: 'recycle' }
];
