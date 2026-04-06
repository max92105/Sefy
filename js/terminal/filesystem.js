/**
 * Terminal virtual file system — ls, cd, cat, play.
 * Files can have a `tier` property; agent needs at least that accessTier.
 */

import { FILE_SYSTEM } from './config.js';
import { printLine, printLines, printBlank } from './io.js';
import { getCurrentDir, setCurrentDir, getAgentState } from './state.js';

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
  const dir = FILE_SYSTEM[cwd];
  if (!dir || dir.type !== 'dir') {
    printLine('Erreur: répertoire non trouvé.', 'error');
    return;
  }

  const tier = getAgentState()?.accessTier || 1;

  printLine(`Contenu de ${cwd}:`, 'bright');
  printBlank();

  if (!dir.children.length) {
    printLine('  (vide)', 'dim');
    return;
  }

  for (const child of dir.children) {
    const childPath = resolvePath(child);
    const entry = FILE_SYSTEM[childPath];
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
  const entry = FILE_SYSTEM[target];

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
  const entry = FILE_SYSTEM[target];

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

  printLine(`── ${name} ──`, 'bright');
  printLines(entry.content);
  printLine('── fin ──', 'dim');
}

export function playMedia(name) {
  if (!name) {
    printLine('Usage: PLAY <nom_du_fichier>', 'dim');
    return;
  }

  printLine(`Lecture de ${name}…`, 'bright');
  printLine('(Fonctionnalité en développement)', 'warning');
}
