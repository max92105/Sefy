/**
 * Admin QR Setup tab — scan any game QR to see its id and preview its media,
 * so the codes can be identified and placed during setup.
 * Read-only: uses the field-ops catalogs but never touches the game state.
 */

import {
  classifyAudioQR, VIDEO_LOG_CATALOG, PAPER_CATALOG, CARD_CODES, SERINGE, AR_OBJECTS,
} from './stages/field-ops/config.js';
import { playVideo, hideVideo } from './components/video-player.js';

const AUDIO_KINDS = { room: 'Room title', cue: 'AR cue', log: 'Audio log' };

let running = false;
let runId = 0; // bumped on every stop, so a pending camera request knows it is stale
let stream = null;
let scanLoop = null;
let shownCode = null;
let shownInfo = null;
let audio = null;

/** Describe a scanned code, using the same parsing as the field-ops scanner. */
function describeCode(raw) {
  if (!raw.startsWith('SEFY:')) return { id: raw, kind: 'Not a SEFY code', unknown: true };

  const [type, value] = raw.replace('SEFY:', '').split(':');
  const unknown = { id: value || type, kind: 'Not in the game catalog', unknown: true };

  if (type === 'SERINGE') return { id: type, kind: 'Syringe', label: SERINGE.label };

  if (type === 'AUDIO') {
    const found = classifyAudioQR(value);
    if (!found) return unknown;
    const { label, room, src } = found.entry;
    return { id: value, kind: AUDIO_KINDS[found.cat], label, room, audio: src };
  }

  if (type === 'VIDEO') {
    const entry = VIDEO_LOG_CATALOG[value];
    if (!entry) return unknown;
    return { id: value, kind: 'Video log', label: entry.label, room: entry.room, video: entry.src };
  }

  if (type === 'PAPER') {
    const paper = PAPER_CATALOG[value];
    if (!paper) return unknown;
    return { id: value, kind: 'Paper', label: paper.label, room: paper.room, image: paper.image };
  }

  if (type === 'CARD') {
    const card = CARD_CODES[value];
    if (!card) return unknown;
    return { id: value, kind: 'Card', label: `${card.label} — ${card.code}` };
  }

  if (type === 'AR') {
    const obj = AR_OBJECTS.find((o) => o.qrCode === raw);
    if (!obj) return unknown;
    return { id: value, kind: 'AR object', label: obj.label };
  }

  if (type === 'ITEM' && value) return { id: value, kind: 'Inventory item' };

  return unknown;
}

function setStatus(message, isError = false) {
  const el = document.getElementById('qr-setup-status');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function setText(id, text) {
  const el = document.getElementById(id);
  el.textContent = text || '';
  el.classList.toggle('hidden', !text);
}

function showResult(raw) {
  stopAudio();
  shownCode = raw;
  shownInfo = describeCode(raw);
  const info = shownInfo;

  setText('qr-setup-id', info.id);
  setText('qr-setup-kind', info.kind);
  document.getElementById('qr-setup-kind').classList.toggle('error', !!info.unknown);
  setText('qr-setup-label', info.label);
  setText('qr-setup-room', info.room);
  setText('qr-setup-raw', raw);

  const image = document.getElementById('qr-setup-image');
  image.classList.toggle('hidden', !info.image);
  if (info.image) image.src = info.image;
  else image.removeAttribute('src');

  document.getElementById('qr-setup-play').classList.toggle('hidden', !info.audio && !info.video);
  document.getElementById('qr-setup-result').classList.remove('hidden');
  setStatus('Point the camera at a QR code.');
}

function stopAudio() {
  if (audio) {
    const playing = audio;
    audio = null; // cleared first so the aborted play() below isn't reported as an error
    playing.pause();
  }
  const btn = document.getElementById('qr-setup-play');
  if (btn) btn.textContent = '▶ Play';
}

function togglePlay() {
  if (!shownInfo) return;
  if (shownInfo.video) { playVideo(shownInfo.video); return; }
  if (!shownInfo.audio) return;
  if (audio) { stopAudio(); return; }

  const clip = new Audio(shownInfo.audio);
  audio = clip;
  clip.addEventListener('ended', stopAudio);
  clip.play().catch(() => {
    if (clip !== audio) return;
    stopAudio();
    setStatus('Could not play this file.', true);
  });
  document.getElementById('qr-setup-play').textContent = '■ Stop';
}

function scanFrame(video, canvas, ctx) {
  if (video.readyState < 2 || !video.videoWidth) return;
  // Don't swap the result while the video log it belongs to is on screen.
  const overlay = document.getElementById('video-player-overlay');
  if (overlay && !overlay.classList.contains('hidden')) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr = window.jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
  const raw = qr?.data?.trim();
  if (raw && raw !== shownCode) showResult(raw);
}

export async function startQrScanner() {
  if (running) return;

  if (!window.jsQR) {
    setStatus('Scanner unavailable: jsQR did not load (no connection?).', true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus('Camera unavailable: this page needs HTTPS or localhost.', true);
    return;
  }

  running = true;
  const run = ++runId;
  setStatus('Starting camera…');

  let camera;
  try {
    camera = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
    });
  } catch {
    if (run !== runId) return;
    running = false;
    setStatus('Camera access denied. Allow the camera, then reopen this tab.', true);
    return;
  }
  if (run !== runId) {
    camera.getTracks().forEach((t) => t.stop());
    return;
  }

  stream = camera;
  const video = document.getElementById('qr-setup-video');
  const canvas = document.getElementById('qr-setup-canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  video.srcObject = stream;
  setStatus('Point the camera at a QR code.');
  scanLoop = setInterval(() => scanFrame(video, canvas, ctx), 250);
}

export function stopQrScanner() {
  running = false;
  runId++;
  if (scanLoop) { clearInterval(scanLoop); scanLoop = null; }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  const video = document.getElementById('qr-setup-video');
  if (video) video.srcObject = null;
  stopAudio();
  hideVideo();
}

export function initQrSetup() {
  document.getElementById('qr-setup-play')?.addEventListener('click', togglePlay);
}
