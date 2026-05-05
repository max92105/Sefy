/**
 * Screen: Inventory — shows all collected items organized by category.
 *
 * Features:
 *  - Keycards: displayed as colored cards
 *  - AR Objects: tap to zoom & reveal code (tier3-card, tier4-card)
 *  - Audio Logs: tap to replay audio
 *  - Paper Fragments: tap any piece → opens puzzle overlay where all found
 *    pieces can be dragged around like a jigsaw
 */

import { AUDIO_CATALOG, PAPER_CATALOG, CARD_CODES } from '../stages/field-ops/config.js';
import { addKeycard, saveState } from '../state.js';

/* ═══════════════  Data  ═══════════════ */

const KEYCARD_COLORS = {
  RED:    { label: 'ROUGE',  css: '#ff3040', icon: '🔑', code: '524544' },
  BLUE:   { label: 'BLEUE',  css: '#4488ff', icon: '🔑', code: '424C5545' },
  YELLOW: { label: 'JAUNE',  css: '#f5c542', icon: '🔑', code: '59454C4C4F57' },
};

const AR_ITEM_INFO = {
  bomb:         { label: 'BOMBE',             icon: '💣', css: '#ff0040' },
  'tier3-card': { label: 'CARTE TIER 3',     icon: '🪪', css: '#00ff41' },
  'tier4-card': { label: 'CARTE DR. ADRIAN', icon: '🪪', css: '#ffd700' },
};

export { KEYCARD_COLORS };

/* ═══════════════  DOM  ═══════════════ */

export function createInventoryScreen() {
  const section = document.createElement('section');
  section.id = 'screen-inventory';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content">
      <div class="screen-header">
        <span class="header-tag">INVENTAIRE</span>
        <span class="header-title">OBJETS COLLECTÉS</span>
      </div>

      <div class="inv-categories" id="inv-categories">
        <p class="empty-state">Aucun objet collecté.</p>
      </div>

      <!-- Card zoom overlay -->
      <div class="inv-zoom-overlay hidden" id="inv-zoom-overlay">
        <div class="inv-zoom-card" id="inv-zoom-card">
          <div class="inv-zoom-icon" id="inv-zoom-icon"></div>
          <div class="inv-zoom-label" id="inv-zoom-label"></div>
          <div class="inv-zoom-code" id="inv-zoom-code"></div>
          <div class="inv-zoom-desc" id="inv-zoom-desc"></div>
        </div>
      </div>

      <!-- Paper puzzle overlay -->
      <div class="inv-paper-overlay hidden" id="inv-paper-overlay">
        <div class="inv-paper-header">
          <span>FRAGMENTS DE PAPIER</span>
          <button class="btn btn-outline btn-sm" id="inv-paper-close">✕ FERMER</button>
        </div>
        <div class="inv-paper-area" id="inv-paper-area"></div>
      </div>

      <!-- DEBUG: manual QR input (REMOVE BEFORE PROD) -->
      <div class="inv-debug" id="inv-debug">
        <div class="inv-debug-title">⚠ DEBUG QR</div>
        <div class="inv-debug-row">
          <input type="text" id="inv-debug-input" class="inv-debug-input" placeholder="SEFY:KEY:RED, SEFY:AUDIO:cmd-center, SEFY:PAPER:1...">
          <button class="btn btn-outline btn-sm" id="inv-debug-btn">SCAN</button>
        </div>
        <div class="inv-debug-feedback" id="inv-debug-feedback"></div>
      </div>

      <button id="btn-inventory-back" class="btn btn-outline" style="margin-top: var(--space-lg);">RETOUR À LA MISSION</button>
    </div>
  `;
  return section;
}

/* ═══════════════  Populate  ═══════════════ */

export function populateInventory(state) {
  const container = document.getElementById('inv-categories');
  if (!container) return;
  container.innerHTML = '';

  let hasItems = false;

  // --- Keycards ---
  if (state.keycards?.length) {
    hasItems = true;
    container.appendChild(buildSection('CARTES D\'ACCÈS', state.keycards.map(id => {
      const c = KEYCARD_COLORS[id] || { label: id, css: '#888', icon: '🔑', code: '' };
      const el = buildItem(c.icon, `Carte ${c.label}`, c.css, 'zoomable');
      el.addEventListener('click', () => showZoom(c.icon, `Carte ${c.label}`, c.code, `Code carte ${c.label}`));
      return el;
    })));
  }

  // --- AR Objects ---
  if (state.arFound?.length) {
    hasItems = true;
    container.appendChild(buildSection('OBJETS AR', state.arFound.map(id => {
      const info = AR_ITEM_INFO[id] || { label: id, icon: '📦', css: '#888' };
      const code = CARD_CODES[id];
      const el = buildItem(info.icon, info.label, info.css, code ? 'zoomable' : null);
      if (code) {
        el.addEventListener('click', () => showZoom(info.icon, info.label, code.code, code.description));
      }
      return el;
    })));
  }

  // --- Audio Logs ---
  if (state.audioLogs?.length) {
    hasItems = true;
    container.appendChild(buildSection('LOGS AUDIO', state.audioLogs.map(id => {
      const a = AUDIO_CATALOG[id] || { label: id, room: '', src: '' };
      const el = buildItem('🔊', a.label, '#00ccff', 'playable');
      el.dataset.audioSrc = a.src;
      el.addEventListener('click', () => playAudioLog(a.src, el));
      return el;
    })));
  }

  // --- Paper Fragments ---
  if (state.papers?.length) {
    hasItems = true;
    const items = state.papers.map(id => {
      const p = PAPER_CATALOG[id] || { label: `Papier #${id}` };
      const el = buildItem('📜', p.label, '#c8a050', 'clickable');
      el.addEventListener('click', () => openPaperPuzzle(state));
      return el;
    });
    container.appendChild(buildSection('FRAGMENTS DE PAPIER', items));
  }

  // --- Generic inventory ---
  if (state.inventory?.length) {
    hasItems = true;
    container.appendChild(buildSection('OBJETS', state.inventory.map(id => {
      return buildItem('📦', id, '#888', null);
    })));
  }

  if (!hasItems) {
    container.innerHTML = '<p class="empty-state">Aucun objet collecté.</p>';
  }

  bindOverlays();
}

/* ═══════════════  Helpers  ═══════════════ */

function buildSection(title, itemEls) {
  const sec = document.createElement('div');
  sec.className = 'inv-section';
  sec.innerHTML = `<div class="inv-section-title">${title}</div>`;
  const grid = document.createElement('div');
  grid.className = 'inv-items';
  for (const el of itemEls) grid.appendChild(el);
  sec.appendChild(grid);
  return sec;
}

function buildItem(icon, label, color, extraClass) {
  const el = document.createElement('div');
  el.className = `inv-item ${extraClass || ''}`;
  el.style.setProperty('--item-color', color);
  el.innerHTML = `
    <div class="inv-item-icon">${icon}</div>
    <div class="inv-item-label">${label}</div>
  `;
  return el;
}

/* ═══════════════  Audio Replay  ═══════════════ */

let currentAudioEl = null;

function playAudioLog(src, itemEl) {
  if (currentAudioEl) {
    currentAudioEl.pause();
    currentAudioEl.currentTime = 0;
    document.querySelectorAll('.inv-item.playing').forEach(e => e.classList.remove('playing'));
  }
  const audio = new Audio(src);
  currentAudioEl = audio;
  itemEl.classList.add('playing');
  audio.play().catch(() => {});
  audio.onended = () => {
    itemEl.classList.remove('playing');
    currentAudioEl = null;
  };
}

/* ═══════════════  Card Zoom  ═══════════════ */

function showZoom(icon, label, code, desc) {
  const overlay = document.getElementById('inv-zoom-overlay');
  if (!overlay) return;
  document.getElementById('inv-zoom-icon').textContent = icon;
  document.getElementById('inv-zoom-label').textContent = label;
  document.getElementById('inv-zoom-code').textContent = code;
  document.getElementById('inv-zoom-desc').textContent = desc || '';
  overlay.classList.remove('hidden');
}

function hideZoom() {
  document.getElementById('inv-zoom-overlay')?.classList.add('hidden');
}

/* ═══════════════  Paper Puzzle  ═══════════════ */

function openPaperPuzzle(state) {
  const overlay = document.getElementById('inv-paper-overlay');
  const area = document.getElementById('inv-paper-area');
  if (!overlay || !area) return;

  area.innerHTML = '';
  const papers = state.papers || [];

  papers.forEach((id, i) => {
    const p = PAPER_CATALOG[id];
    if (!p) return;
    const img = document.createElement('img');
    img.src = p.image;
    img.className = 'inv-paper-piece';
    img.draggable = false;
    img.style.left = `${20 + (i % 2) * 40}%`;
    img.style.top = `${10 + i * 20}%`;
    img.dataset.paperId = id;
    makeDraggable(img);
    area.appendChild(img);
  });

  overlay.classList.remove('hidden');
}

function closePaperPuzzle() {
  document.getElementById('inv-paper-overlay')?.classList.add('hidden');
}

function makeDraggable(el) {
  let offsetX = 0, offsetY = 0;
  let dragging = false;

  const onStart = (e) => {
    dragging = true;
    el.classList.add('dragging');
    el.style.zIndex = Date.now() % 100000;
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!dragging) return;
    const area = el.parentElement;
    if (!area) return;
    const areaRect = area.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - areaRect.left - offsetX;
    const y = clientY - areaRect.top - offsetY;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    e.preventDefault();
  };

  const onEnd = () => {
    dragging = false;
    el.classList.remove('dragging');
  };

  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('mousemove', onMove);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

/* ═══════════════  Debug QR Input (REMOVE BEFORE PROD)  ═══════════════ */

let debugState = null;

export function bindDebugQR(state) {
  debugState = state;
  const btn = document.getElementById('inv-debug-btn');
  const input = document.getElementById('inv-debug-input');
  if (!btn || !input) return;

  const handle = () => {
    const val = input.value.trim();
    if (!val) return;
    const msg = processDebugQR(val, state);
    const fb = document.getElementById('inv-debug-feedback');
    if (fb) { fb.textContent = msg; setTimeout(() => fb.textContent = '', 3000); }
    input.value = '';
    populateInventory(state);
    updateInventoryBadge(state);
  };

  btn.onclick = handle;
  input.onkeydown = (e) => { if (e.key === 'Enter') handle(); };
}

function processDebugQR(data, state) {
  if (!data.startsWith('SEFY:')) return '✗ Format invalide (doit commencer par SEFY:)';
  const parts = data.replace('SEFY:', '').split(':');
  const type = parts[0];
  const value = parts[1];

  if (type === 'KEY') {
    const added = addKeycard(state, value);
    return added ? `✓ Carte ${value} ajoutée` : `— Carte ${value} déjà possédée`;
  }
  if (type === 'AUDIO') {
    if (!AUDIO_CATALOG[value]) return `✗ Audio inconnu: ${value}`;
    if (!state.audioLogs) state.audioLogs = [];
    if (state.audioLogs.includes(value)) return `— Audio ${value} déjà collecté`;
    state.audioLogs.push(value);
    saveState(state);
    return `✓ Audio ${AUDIO_CATALOG[value].label} ajouté`;
  }
  if (type === 'PAPER') {
    if (!PAPER_CATALOG[value]) return `✗ Papier inconnu: ${value}`;
    if (!state.papers) state.papers = [];
    if (state.papers.includes(value)) return `— Papier #${value} déjà collecté`;
    state.papers.push(value);
    saveState(state);
    return `✓ Papier #${value} ajouté`;
  }
  if (type === 'AR') {
    if (!state.arFound) state.arFound = [];
    const id = value === 'BOMB' ? 'bomb' : value === 'CARD' ? 'tier3-card' : value.toLowerCase();
    if (state.arFound.includes(id)) return `— AR ${id} déjà collecté`;
    state.arFound.push(id);
    saveState(state);
    return `✓ AR objet ${id} ajouté`;
  }
  if (type === 'ITEM') {
    if (!state.inventory) state.inventory = [];
    if (state.inventory.includes(value)) return `— Item ${value} déjà collecté`;
    state.inventory.push(value);
    saveState(state);
    return `✓ Item ${value} ajouté`;
  }
  return `✗ Type inconnu: ${type}`;
}

/* ═══════════════  Overlay Bindings  ═══════════════ */

function bindOverlays() {
  const zoomOverlay = document.getElementById('inv-zoom-overlay');
  if (zoomOverlay) {
    zoomOverlay.onclick = (e) => {
      if (e.target === zoomOverlay) hideZoom();
    };
  }
  const closeBtn = document.getElementById('inv-paper-close');
  if (closeBtn) closeBtn.onclick = closePaperPuzzle;
}

/* ═══════════════  Badge  ═══════════════ */

export function updateInventoryBadge(state) {
  const badge = document.getElementById('inv-badge');
  const count = (state.keycards || []).length
              + (state.arFound || []).length
              + (state.audioLogs || []).length
              + (state.papers || []).length
              + (state.inventory || []).length;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}
