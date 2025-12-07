const TRACKED_COMMANDS = ['about', 'skills', 'contact', 'bunny', 'hazel', 'dodgers', 'cleanse', 'manifest', 'coffee', 'ship'];

const commands = {
  help: 'Available commands: help, about, skills, contact, bunny, hazel, dodgers, cleanse, manifest, coffee, ship, achievements, clear',
  about: 'Clarissa Flores — full-stack developer in San Antonio, TX building fast, accessible, and visually thoughtful websites. \nLover of cozy corners, clean code, and coffee. Proud parent to Bunny the cat, Hazel the dog, and too many plants.',
  skills: 'Languages: JavaScript, TypeScript, PHP, HTML, CSS. \nFrameworks: Astro, React, Node. \nCMS: WordPress, Elementor, JetEngine, ACF. \nSpecialties: Performance, SEO, Accessibility, CRO, UI polish. \nSecret Skills: writing docs, creating client guides, organizing projects, and restructuring content.',
  contact: 'Email: contact@clarissaflores.me',
  bunny: { html: `<pre class="console-ascii"> /\\_/\\\n( o.o )\nBunny is currently: [ ████░░░░░░ ] 47% awake.\nStatus: plotting world domination, seeking treats, demanding scratches.</pre>` },
  hazel: { html: `<pre class="console-ascii">  /^ ^\\  \n / 0 0 \\ \n V\\ Y /V \n  / - \\ \n |    \\ \n || (__V \nHazel System Log: \n[✔] Tail wag detected. \n[✔] Soft snores activated. \n[✔] Human proximity confirmed. \nStatus: Warm, safe, content.</pre>` },
  dodgers: { html: `<pre class="console-ascii">It's time for
██████╗  ██████╗ ██████╗  ██████╗ ███████╗██████╗ ███████╗
██╔══██╗██╔═══██╗██╔══██╗██╔════╝ ██╔════╝██╔══██╗██╔════╝
██║  ██║██║   ██║██║  ██║██║  ███╗█████╗  ██████╔╝███████╗
██║  ██║██║   ██║██║  ██║██║   ██║██╔══╝  ██╔══██╗╚════██║
██████╔╝╚██████╔╝██████╔╝╚██████╔╝███████╗██║  ██║███████║ 
╚═════╝  ╚═════╝ ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝
Baseball!
░█▀▄░█▀█░█▀▀░█░█░░░▀█▀░█▀█░░░█▀▄░█▀█░█▀▀░█░█░░░█░█░█▀█░█▀▄░█░░░█▀▄
░█▀▄░█▀█░█░░░█▀▄░░░░█░░█░█░░░█▀▄░█▀█░█░░░█▀▄░░░█▄█░█░█░█▀▄░█░░░█░█
░▀▀░░▀░▀░▀▀▀░▀░▀░░░░▀░░▀▀▀░░░▀▀░░▀░▀░▀▀▀░▀░▀░░░▀░▀░▀▀▀░▀░▀░▀▀▀░▀▀░
░█▀▀░█▀▀░█▀▄░▀█▀░█▀▀░█▀▀░░░█▀▀░█░█░█▀█░█▄█░█▀█░▀█▀░█▀█░█▀█░█▀▀    
░▀▀█░█▀▀░█▀▄░░█░░█▀▀░▀▀█░░░█░░░█▀█░█▀█░█░█░█▀▀░░█░░█░█░█░█░▀▀█    
░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀░▀▀▀░░░▀▀▀░▀░▀░▀░▀░▀░▀░░░▀▀▀░▀▀▀░▀░▀░▀▀▀░▀▀▀</pre>` },
  cleanse: 'Burning palo santo... Clearing bad CSS energy... All bugs have been released.',
  manifest: 'Manifesting flawless deployments... Your intentions have been committed.',
  coffee: { html: `<pre class="console-ascii">
      )  (
     (   ) )
      ) ( (
    _______)_
 .-'---------|  
( C|_________|
 '-._________|
   '_________'
    '-------'
    Brewing... Productivity increased by 27 percent.</pre>` },
  ship: 'Deploying... Success! Your imposter syndrome will respawn shortly.'
};

const loadSet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};

const saveSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore storage errors */
  }
};

const commandsSeen = loadSet('console-commands');

const markCommand = (cmd) => {
  if (!TRACKED_COMMANDS.includes(cmd)) return;
  commandsSeen.add(cmd);
  saveSet('console-commands', commandsSeen);
};

const ACHIEVEMENTS = [
  { label: 'Cat Whisperer', check: (has) => has('bunny'), hint: 'Run "bunny" to visit Bunny.' },
  { label: 'Dog Day', check: (has) => has('hazel'), hint: 'Run "hazel" to check on Hazel.' },
  { label: 'Animal Lover', check: (has) => has('bunny') && has('hazel'), hint: 'Meet both Bunny and Hazel.' },
  { label: 'True Blue', check: (has) => has('dodgers'), hint: 'Declare your Dodgers fandom with "dodgers".' },
  { label: 'Code Exorcist', check: (has) => has('cleanse'), hint: 'Cleanse the bad vibes with "cleanse".' },
  { label: 'Powered Up', check: (has) => has('coffee'), hint: 'Grab a cup with "coffee".' },
  {
    label: 'Wellness Wizard',
    check: (has) => has('cleanse') && has('manifest') && has('coffee'),
    hint: 'Complete the wellness trio: "cleanse", "manifest", and "coffee".'
  },
  {
    label: 'Completionist',
    check: (_has, missing) => missing.length === 0,
    hint: (_has, missing) =>
      missing.length ? `Discover every console command. Still missing: ${missing.join(', ')}` : 'You found every command!'
  }
];

const renderAchievements = (output) => {
  const has = (cmd) => commandsSeen.has(cmd);
  const missingCommands = TRACKED_COMMANDS.filter((cmd) => !has(cmd));
  const lines = ['Achievements:'];

  ACHIEVEMENTS.forEach(({ label, check, hint }) => {
    const done = check(has, missingCommands);
    const hintText = typeof hint === 'function' ? hint(has, missingCommands) : hint;
    lines.push(`${done ? '[✔]' : '[ ]'} ${label} — ${hintText}`);
  });

  lines.push(`Commands discovered: ${TRACKED_COMMANDS.length - missingCommands.length}/${TRACKED_COMMANDS.length}`);
  write(output, lines.join('\n'));
};

const write = (outputEl, text, { preserve = false } = {}) => {
  const line = document.createElement('p');
  if (typeof text === 'object' && text?.html) {
    line.innerHTML = text.html;
  } else {
    line.innerHTML = preserve ? text : String(text ?? '').replace(/\n/g, '<br>');
  }
  outputEl.appendChild(line);
  requestAnimationFrame(() => {
    outputEl.scrollTop = outputEl.scrollHeight;
  });
};

const getWinBody = (win) =>
  win?.body ||
  (win?.$content?.get ? win.$content.get(0) : win?.$content?.[0]) ||
  win?.element?.querySelector?.('.window-content') ||
  win?.element;

export function initConsoleWindow(win) {
  const setup = () => {
    const shell = getWinBody(win)?.querySelector?.('[data-console]');
    if (!shell) {
      setTimeout(setup, 30);
      return;
    }
    const output = shell.querySelector('.console-output');
    const form = shell.querySelector('.console-input-row');
    const input = form?.querySelector('input');
    if (!output || !form || !input) return;

    write(output, `⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩
C:\\> boot clarissa_console.exe
Clarissa Developer Console v1.0
Copyright 1995 - 2025
System ready.
⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩⋆｡°✩`);
    write(output, commands.help);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = input.value.trim().toLowerCase();
      if (!cmd) return;
      write(output, `> ${cmd}`);
      if (cmd === 'achievements') {
        renderAchievements(output);
      } else if (cmd === 'clear') {
        output.innerHTML = '';
        requestAnimationFrame(() => {
          output.scrollTop = output.scrollHeight;
        });
      } else if (commands[cmd]) {
        write(output, commands[cmd]);
        markCommand(cmd);
      } else {
        write(output, 'Unknown command. Type "help".');
      }
      input.value = '';
      input.focus();
    });

    input.focus();
  };
  setup();
}
