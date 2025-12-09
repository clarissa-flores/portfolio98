export const ClippyBrain = (() => {
  let clippyAgent = null;
  let windowsOpened = 0;
  let settingsChanges = 0;
  let hasShownMultitaskWarning = false;
  let hasGreeted = false;
  let rareFlashTimer = null;

  const CLIPPY_LINES = {
    boot: {
      morning: [
        "Good morning! I made coffee. It's imaginary, sorry."
      ],
      night: [
        'Coding past 10pm? Classic developer behavior.'
      ],
      neutral: [
        "Welcome back! Did you sleep? I didn't."
      ]
    },
    basicTips: [
      'You can double-click icons to open them. Not that I think you are having trouble. I just noticed.',
      'If a window gets lost, check the taskbar. Windows love hiding there.',
      'You can drag windows around. It makes you feel powerful.'
    ],
    solitaire: [
      'Solitaire? Bold choice. Prepare to lose track of time.',
      'Pro tip: Clicking randomly works surprisingly often.'
    ],
    paint: [
      'Art? I love art! Draw me. Please. No pressure.',
      'Reminder: Paint cannot undo your life decisions. Only brush strokes.'
    ],
    bunny: [
      'Are you checking on Bunny again? Should I be jealous?'
    ],
    hazel: [
      'Hazel.exe detected. Tail wags approaching.'
    ],
    settingsTheme: [
      'Teal is a classic. Very Windows 98 of you.',
      'If anything breaks, let us pretend it was like that before.'
    ],
    logoff: [
      "WAIT! I wasn't ready to say goodbye.",
      'Logging off... okay fine, leave.'
    ],
    tooManyWindows: [
      'Your multitasking is… impressive. And alarming.',
      "That's a lot of windows. Should I call someone?"
    ],
    settingsSpam: [
      'Indecisive? Or exploring options? I support it.'
    ],
    rarePet: [
      'WHAT?! A double pet sighting?!',
      'Statistically improbable. Emotionally overwhelming.',
      'RARE EVENT UNLOCKED: Dual Cuteness.',
      'Double pets detected. Deploying maximum awe.'
    ]
  };

  const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const speak = (lineOrArray) => {
    if (!clippyAgent) return;
    const text = Array.isArray(lineOrArray) ? randomFrom(lineOrArray) : lineOrArray;
    if (!text) return;
    clippyAgent.speak?.(text);
  };

  const api = {
    setAgent(agent) {
      clippyAgent = agent;
    },

    onBoot() {
      if (!clippyAgent || hasGreeted) return;
      hasGreeted = true;
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        speak(CLIPPY_LINES.boot.morning);
      } else if (hour >= 22 || hour < 4) {
        speak(CLIPPY_LINES.boot.night);
      } else {
        speak(CLIPPY_LINES.boot.neutral);
      }

      // Offer a gentle tip shortly after boot.
      setTimeout(() => api.showBasicTip(), 3000);
    },

    onAppOpen(appName) {
      windowsOpened += 1;
      switch (appName) {
        case 'solitaire':
          speak(CLIPPY_LINES.solitaire);
          break;
        case 'paint':
          speak(CLIPPY_LINES.paint);
          break;
        case 'bunny':
          speak(CLIPPY_LINES.bunny);
          break;
        case 'hazel':
          speak(CLIPPY_LINES.hazel);
          break;
        case 'settings':
          if (Math.random() < 0.4) speak(CLIPPY_LINES.settingsTheme);
          break;
        default:
          break;
      }

      if (!hasShownMultitaskWarning && windowsOpened >= 6) {
        hasShownMultitaskWarning = true;
        speak(CLIPPY_LINES.tooManyWindows);
      }
    },

    onSettingsChange() {
      settingsChanges += 1;
      if (settingsChanges === 5 || settingsChanges === 10) {
        speak(CLIPPY_LINES.settingsSpam);
      }
    },

    onLogoff() {
      speak(CLIPPY_LINES.logoff);
    },

    onRarePet() {
      speak(CLIPPY_LINES.rarePet);
      try {
        document.documentElement.classList.add('rare-pet-flash');
        clearTimeout(rareFlashTimer);
        rareFlashTimer = setTimeout(() => {
          document.documentElement.classList.remove('rare-pet-flash');
        }, 700);
      } catch {
        /* ignore DOM issues */
      }
      if (window.__sound?.play) {
        window.__sound.play('tada', { allowQueue: true, volume: 0.6 });
      }
    },

    showBasicTip() {
      speak(CLIPPY_LINES.basicTips);
    }
  };

  return api;
})();
