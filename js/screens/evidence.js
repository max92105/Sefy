/**
 * Screen: Inventory — shows all collected items organized by category.
 *
 * Features:
 *  - Keycards: displayed as colored cards
 *  - AR Objects: tap to zoom & reveal code (tier4-card)
 *  - Audio Logs: tap to replay audio
 *  - Paper Fragments: tap any piece → opens puzzle overlay where all found
 *    pieces can be dragged around like a jigsaw
 */

import { AUDIO_CATALOG, VIDEO_LOG_CATALOG, PAPER_CATALOG, CARD_CODES, classifyAudioQR } from '../stages/field-ops/config.js';
import { addKeycard, saveState } from '../state.js';
import { playVideo } from '../components/video-player.js';
import { playSFX } from '../ui.js';

/* ═══════════════  Data  ═══════════════ */

const KEYCARD_COLORS = {
  RED:    { label: 'ROUGE',  css: '#ff3040', icon: '🔑', code: '524544' },
  BLUE:   { label: 'BLEUE',  css: '#4488ff', icon: '🔑', code: '424C5545' },
  YELLOW: { label: 'JAUNE',  css: '#f5c542', icon: '🔑', code: '59454C4C4F57' },
};

const AR_ITEM_INFO = {
  bomb:         { label: 'BOMBE',             icon: '💣', css: '#ff0040' },
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
        <div class="inv-paper-area" id="inv-paper-area"></div>
        <div class="inv-paper-header">
          <span>FRAGMENTS DE PAPIER</span>
          <div class="inv-paper-actions">
            <button class="btn btn-outline btn-sm" id="inv-paper-reset">↺ POSITIONS</button>
            <button class="btn btn-outline btn-sm" id="inv-paper-close">✕ FERMER</button>
          </div>
        </div>
      </div>

      <!-- DEBUG: manual QR input (REMOVE BEFORE PROD) -->
      <div class="inv-debug" id="inv-debug">
        <div class="inv-debug-title">⚠ DEBUG QR</div>
        <div class="inv-debug-row">
          <input type="text" id="inv-debug-input" class="inv-debug-input" placeholder="SEFY:KEY:RED, SEFY:AUDIO:cmd-center, SEFY:VIDEO:chief-adrian, SEFY:PAPER:1...">
          <button class="btn btn-outline btn-sm" id="inv-debug-btn">SCAN</button>
        </div>
        <div class="inv-debug-row">
          <button class="btn btn-outline btn-sm" id="inv-debug-bomb">+ 💣 BOMBE</button>
          <button class="btn btn-outline btn-sm" id="inv-debug-card">+ 🪪 CARTE T4</button>
          <button class="btn btn-danger btn-sm" id="inv-debug-reset">🗑 RESET</button>
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

  // --- Video Logs ---
  if (state.videoLogs?.length) {
    hasItems = true;
    container.appendChild(buildSection('LOGS VIDÉO', state.videoLogs.map(id => {
      const a = VIDEO_LOG_CATALOG[id] || { label: id, src: '' };
      const el = buildItem('🎬', a.label, '#ff8c00', 'playable');
      el.addEventListener('click', () => playVideo(a.src));
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

let paperState = null;

function openPaperPuzzle(state) {
  paperState = state;
  const overlay = document.getElementById('inv-paper-overlay');
  const area = document.getElementById('inv-paper-area');
  if (!overlay || !area) return;
  renderPapers();
  overlay.classList.remove('hidden');
}

/** (Re)render the paper pieces, restoring each piece's saved position. */
function renderPapers() {
  const area = document.getElementById('inv-paper-area');
  if (!area || !paperState) return;
  area.innerHTML = '';
  const papers = paperState.papers || [];
  const positions = paperState.paperPositions || {};

  papers.forEach((id, i) => {
    const p = PAPER_CATALOG[id];
    if (!p) return;
    const img = document.createElement('img');
    img.src = p.image;
    img.className = 'inv-paper-piece';
    img.draggable = false;
    img.dataset.paperId = id;
    const pos = positions[id];
    if (pos) {
      img.style.left = `${pos.x}px`;
      img.style.top = `${pos.y}px`;
    } else {
      // Default scatter for pieces never moved yet.
      img.style.left = `${20 + (i % 2) * 40}%`;
      img.style.top = `${15 + i * 20}%`;
    }
    makeDraggable(img);
    area.appendChild(img);
  });
}

/** Forget all saved positions and re-scatter the pieces. */
function resetPaperPositions() {
  if (!paperState) return;
  paperState.paperPositions = {};
  saveState(paperState);
  renderPapers();
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
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');
    // Persist this piece's position (px relative to the drag area) so it stays
    // put across sessions.
    if (paperState && el.dataset.paperId) {
      if (!paperState.paperPositions) paperState.paperPositions = {};
      paperState.paperPositions[el.dataset.paperId] = {
        x: parseFloat(el.style.left) || 0,
        y: parseFloat(el.style.top) || 0,
      };
      saveState(paperState);
    }
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
  const input = document.getElementById('inv-debug-input');

  // Process a debug code string, show feedback, and refresh the inventory.
  const run = (val) => {
    if (!val) return;
    const msg = processDebugQR(val, state);
    const fb = document.getElementById('inv-debug-feedback');
    if (fb) { fb.textContent = msg; setTimeout(() => { if (fb.textContent === msg) fb.textContent = ''; }, 3000); }
    populateInventory(state);
    updateInventoryBadge(state);
  };

  const btn = document.getElementById('inv-debug-btn');
  if (btn && input) {
    btn.onclick = () => { run(input.value.trim()); input.value = ''; };
    input.onkeydown = (e) => { if (e.key === 'Enter') { run(input.value.trim()); input.value = ''; } };
  }

  // Quick-add AR objects (normally found via the orientation-seek AR scanner).
  const bombBtn = document.getElementById('inv-debug-bomb');
  const cardBtn = document.getElementById('inv-debug-card');
  if (bombBtn) bombBtn.onclick = () => run('SEFY:AR:BOMB');
  if (cardBtn) cardBtn.onclick = () => run('SEFY:AR:CARD');

  // Clear every collected item (keeps mission progress, only empties inventory).
  const resetBtn = document.getElementById('inv-debug-reset');
  if (resetBtn) resetBtn.onclick = () => {
    state.keycards = [];
    state.arFound = [];
    state.audioLogs = [];
    state.videoLogs = [];
    state.papers = [];
    state.paperPositions = {};
    state.inventory = [];
    saveState(state);
    const fb = document.getElementById('inv-debug-feedback');
    if (fb) { fb.textContent = '✓ Inventaire réinitialisé'; setTimeout(() => { if (fb.textContent === '✓ Inventaire réinitialisé') fb.textContent = ''; }, 3000); }
    populateInventory(state);
    updateInventoryBadge(state);
  };
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
    const found = classifyAudioQR(value);
    if (!found) return `✗ Audio inconnu: ${value}`;
    const { kind, entry } = found;
    // Play-only (room titles & AR cues): trigger the sound so it can be tested.
    if (kind === 'play') {
      playSFX(entry.src);
      return `▶ Lecture : ${entry.label}`;
    }
    if (!state.audioLogs) state.audioLogs = [];
    if (state.audioLogs.includes(value)) return `— Audio ${value} déjà collecté`;
    state.audioLogs.push(value);
    saveState(state);
    return `✓ Audio ${entry.label} ajouté`;
  }
  if (type === 'VIDEO') {
    const entry = VIDEO_LOG_CATALOG[value];
    if (!entry) return `✗ Vidéo inconnue: ${value}`;
    if (!state.videoLogs) state.videoLogs = [];
    if (!state.videoLogs.includes(value)) { state.videoLogs.push(value); saveState(state); }
    playVideo(entry.src);
    return `🎬 ${entry.label}`;
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
    const id = value === 'BOMB' ? 'bomb' : value === 'CARD' ? 'tier4-card' : value.toLowerCase();
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
  const resetBtn = document.getElementById('inv-paper-reset');
  if (resetBtn) resetBtn.onclick = resetPaperPositions;
}

/* ═══════════════  Badge  ═══════════════ */

export function updateInventoryBadge(state) {
  const badge = document.getElementById('inv-badge');
  const count = (state.keycards || []).length
              + (state.arFound || []).length
              + (state.audioLogs || []).length
              + (state.videoLogs || []).length
              + (state.papers || []).length
              + (state.inventory || []).length;
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}
