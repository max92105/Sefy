/**
 * Component: Mission Banner — persistent countdown fixed at top of page.
 * Color-phases: green (>50%) → yellow (20–50%) → red (<20%).
 *
 * The countdown can be (re)started with a custom duration and an `onZero`
 * callback that fires once when it reaches 0:
 *   - mission timer (90 min): on zero → plays countdown_0_before_purge (flavor).
 *   - PURGE timer (20 min):   on zero → caller's onZero (the end-game screen).
 */

import { APP_AUDIO } from '../config.js';

const MISSION_DURATION_MS = 90 * 60 * 1000;

let missionDeadline = null;
let totalDuration = MISSION_DURATION_MS;
let timerInterval = null;
let onZeroFn = null;
let zeroFired = false;

/** Create the banner DOM and inject it into the body */
export function createBanner() {
  const banner = document.createElement('div');
  banner.id = 'mission-banner';
  banner.className = 'mission-banner hidden';
  banner.innerHTML = `
    <span class="mission-banner-agent hidden" id="mission-banner-agent"></span>
    <span class="mission-banner-label">TEMPS RESTANT</span>
    <span class="mission-banner-value" id="mission-banner-value">01:30:00</span>
  `;
  document.body.prepend(banner);
}

/** Show the agent name badge in the banner */
export function setAgentBadge(agent) {
  const el = document.getElementById('mission-banner-agent');
  if (!el) return;
  if (agent) {
    el.textContent = agent.toUpperCase();
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

/** Default zero behavior for the mission timer — play the flavor cue, nothing else. */
function playCountdownZero() {
  try { new Audio(APP_AUDIO.countdownZero).play().catch(() => {}); } catch { /* ignore */ }
}

/* ── Core timer ── */
function startTimer(deadlineMs, totalMs, onZero) {
  clearInterval(timerInterval);
  missionDeadline = deadlineMs;
  totalDuration = totalMs;
  onZeroFn = onZero || null;
  zeroFired = false;

  const banner = document.getElementById('mission-banner');
  const valueEl = document.getElementById('mission-banner-value');
  if (!banner || !valueEl) return;

  banner.classList.remove('hidden');
  void banner.offsetWidth;
  banner.classList.add('visible');
  document.body.classList.add('banner-active');

  const update = () => {
    const remaining = Math.max(0, missionDeadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    valueEl.textContent =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const pct = totalDuration ? remaining / totalDuration : 0;
    banner.classList.remove('phase-green', 'phase-yellow', 'phase-red');
    if (pct > 0.5) banner.classList.add('phase-green');
    else if (pct > 0.2) banner.classList.add('phase-yellow');
    else banner.classList.add('phase-red');

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      if (!zeroFired) { zeroFired = true; if (onZeroFn) onZeroFn(); }
    }
  };

  update();
  timerInterval = setInterval(update, 1000);
}

/** Show the banner and start the 90-min mission countdown. */
export function showBanner() {
  startTimer(Date.now() + MISSION_DURATION_MS, MISSION_DURATION_MS, playCountdownZero);
}

/**
 * Reset the countdown to a new duration (the PURGE timer).
 * @param {number}   minutes
 * @param {Function} onZero — fires once when it hits 0 (e.g. end-game screen)
 */
export function resetBanner(minutes, onZero) {
  startTimer(Date.now() + minutes * 60 * 1000, minutes * 60 * 1000, onZero);
}

/**
 * Resume the banner from a saved deadline.
 * @param {string}   deadlineISO
 * @param {object}   [opts] — { onZero, totalMs } (PURGE resume passes the failure
 *                   callback + 20-min total; otherwise defaults to the mission timer)
 */
export function resumeBanner(deadlineISO, opts = {}) {
  startTimer(
    new Date(deadlineISO).getTime(),
    opts.totalMs || MISSION_DURATION_MS,
    opts.onZero || playCountdownZero,
  );
}

/** Hide the banner and stop the timer */
export function hideBanner() {
  clearInterval(timerInterval);
  timerInterval = null;
  const banner = document.getElementById('mission-banner');
  if (banner) {
    banner.classList.remove('visible', 'phase-green', 'phase-yellow', 'phase-red');
    banner.classList.add('hidden');
  }
  document.body.classList.remove('banner-active');
}

/** Get the current deadline as ISO string for saving */
export function getDeadlineISO() {
  return missionDeadline ? new Date(missionDeadline).toISOString() : null;
}
