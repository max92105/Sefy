/**
 * Terminal virtual file system — ls, cd, cat, play.
 * Files can have a `tier` property; agent needs at least that accessTier.
 * The /logs directory includes a dynamic SYSTEM_{date}.log built from the agent's systemLog.
 */

import { FILE_SYSTEM } from './config.js';
import { printLine, printLines, printBlank } from './io.js';
import { getCurrentDir, setCurrentDir, getAgentState, setPendingConfirm, clearPendingConfirm } from './state.js';

/* ═══════════════  Dynamic log file  ═══════════════ */

function getTodayLogName() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `SYSTEM_${y}-${m}-${day}.log`;
}

function buildDynamicLog() {
  const state = getAgentState();
  const entries = state?.systemLog;
  if (!entries || entries.length === 0) return null;
  return {
    type: 'file',
    content: entries,
  };
}

/** Resolve a FS entry — checks dynamic files on top of static FILE_SYSTEM */
function getEntry(path) {
  // Dynamic: /logs/<today>.log
  const logName = getTodayLogName();
  if (path === `/logs/${logName}`) return buildDynamicLog();

  return FILE_SYSTEM[path] || null;
}

/** Get the effective children for a dir path (injects dynamic file names) */
function getDirChildren(path, dir) {
  const children = [...dir.children];
  if (path === '/logs') {
    const logName = getTodayLogName();
    if (!children.includes(logName) && buildDynamicLog()) {
      children.push(logName);
    }
  }
  return children;
}

/* ═══════════════  Path resolution  ═══════════════ */

function resolvePath(name) {
  const cwd = getCurrentDir();
  if (!name) return cwd;
  if (name === '..') {
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    return '/' + parts.join('/');
  }
  if (name.startsWith('/')) return name;
  const base = cwd === '/' ? '' : cwd;
  return `${base}/${name}`;
}

/* ═══════════════  Commands  ═══════════════ */

export function listDir() {
  const cwd = getCurrentDir();
  const dir = getEntry(cwd);
  if (!dir || dir.type !== 'dir') {
    printLine('Erreur: répertoire non trouvé.', 'error');
    return;
  }

  const tier = getAgentState()?.accessTier || 1;
  const children = getDirChildren(cwd, dir);

  printLine(`Contenu de ${cwd}:`, 'bright');
  printBlank();

  if (!children.length) {
    printLine('  (vide)', 'dim');
    return;
  }

  for (const child of children) {
    const childPath = resolvePath(child);
    const entry = getEntry(childPath);
    if (entry?.hidden) continue; // skip hidden files
    if (entry?.type === 'dir') {
      printLine(`  📁 ${child}/`, 'folder');
    } else if (entry?.type === 'file') {
      if (entry.tier && entry.tier > tier) continue; // hide files above agent tier
      printLine(`  📄 ${child}`, '');
    } else {
      printLine(`  📄 ${child}`, '');
    }
  }
}

export function changeDir(name) {
  if (!name) {
    printLine(`Répertoire actuel: ${getCurrentDir()}`, 'dim');
    return;
  }

  const target = resolvePath(name);
  const entry = getEntry(target);

  if (!entry || entry.type !== 'dir') {
    printLine(`Dossier non trouvé: ${name}`, 'error');
    return;
  }

  setCurrentDir(target);
  printLine(`📁 ${target || '/'}`, 'bright');
}

export function readFile(name) {
  if (!name) {
    printLine('Usage: CAT <nom_du_fichier>', 'dim');
    return;
  }

  const target = resolvePath(name);
  const entry = getEntry(target);

  if (!entry || entry.type !== 'file') {
    printLine(`Fichier non trouvé: ${name}`, 'error');
    return;
  }

  // Tier check
  const tier = getAgentState()?.accessTier || 1;
  if (entry.tier && entry.tier > tier) {
    printLine(`✗ ACCÈS REFUSÉ — Tier ${entry.tier} requis.`, 'error');
    printLine(`Votre niveau actuel: Tier ${tier}`, 'dim');
    return;
  }

  // Password-protected file
  if (entry.password) {
    printLine(`🔒 Fichier protégé.`, 'warning');
    printLine(`Q: ${entry.password.question}`, 'bright');
    setPendingConfirm((input) => {
      clearPendingConfirm();
      if (input.trim().toUpperCase() === entry.password.answer.toUpperCase()) {
        printLine(`── ${name} ──`, 'bright');
        printLines(entry.content);
        printLine('── fin ──', 'dim');
      } else {
        printLine('✗ Réponse incorrecte. Accès refusé.', 'error');
      }
    });
    return;
  }

  printLine(`── ${name} ──`, 'bright');
  printLines(entry.content);
  printLine('── fin ──', 'dim');
}

export function playMedia(name) {
  if (!name) {
    printLine('Usage: PLAY <nom_du_fichier>', 'dim');
    return;
  }

  const target = resolvePath(name);
  const entry = getEntry(target);
  if (!entry || entry.type !== 'file' || !entry.media || !entry.src) {
    printLine(`Fichier média non trouvé: ${name}`, 'error');
    return;
  }

  const tier = getAgentState()?.accessTier || 1;
  if (entry.tier && entry.tier > tier) {
    printLine(`✗ ACCÈS REFUSÉ — Tier ${entry.tier} requis.`, 'error');
    printLine(`Votre niveau actuel: Tier ${tier}`, 'dim');
    return;
  }

  printLine(`▶ Lecture de ${name}…`, 'bright');
  showTerminalVideo(entry.src);
}

/* ═══════════════  Video overlay (self-contained for the terminal page)  ═══════════════ */

function showTerminalVideo(src) {
  let overlay = document.getElementById('term-video-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'term-video-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.94);' +
      'display:flex;align-items:center;justify-content:center;padding:1rem;';
    overlay.innerHTML =
      '<button id="term-video-close" aria-label="Fermer" style="position:absolute;top:1rem;right:1rem;' +
      'width:44px;height:44px;font-size:1.4rem;background:rgba(0,20,0,0.85);color:#00ff41;' +
      'border:1px solid #00ff41;border-radius:4px;cursor:pointer;">&times;</button>' +
      '<video id="term-video-el" playsinline controls style="max-width:100%;max-height:88vh;' +
      'border:1px solid #00ff41;background:#000;"></video>';
    document.body.appendChild(overlay);
    const close = () => {
      const v = document.getElementById('term-video-el');
      if (v) v.pause();
      overlay.style.display = 'none';
    };
    overlay.querySelector('#term-video-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }
  overlay.style.display = 'flex';
  const video = document.getElementById('term-video-el');
  video.src = src;
  video.currentTime = 0;
  video.play().catch(() => {});
}
