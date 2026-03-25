/**
 * Component: Mission Banner — persistent countdown fixed at top of page.
 * Color-phases: green (>50%) → yellow (20–50%) → red (<20%).
 */

const MISSION_DURATION_MS = 90 * 60 * 1000;
let missionDeadline = null;
let timerInterval = null;

/** Create the banner DOM and inject it into the body */
export function createBanner() {
  const banner = document.createElement('div');
  banner.id = 'mission-banner';
  banner.className = 'mission-banner hidden';
  banner.innerHTML = `
    <span class="mission-banner-label">TEMPS RESTANT</span>
    <span class="mission-banner-value" id="mission-banner-value">01:30:00</span>
  `;
  document.body.prepend(banner);
}

/** Show the banner and start counting down from now */
export function showBanner() {
  clearInterval(timerInterval);
  missionDeadline = Date.now() + MISSION_DURATION_MS;

  const banner = document.getElementById('mission-banner');
  const valueEl = document.getElementById('mission-banner-value');
  if (!banner || !valueEl) return;

  banner.classList.remove('hidden');
  void banner.offsetWidth;
  banner.classList.add('visible');
  document.body.classList.add('banner-active');

  function update() {
    const remaining = Math.max(0, missionDeadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    valueEl.textContent =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const pct = remaining / MISSION_DURATION_MS;
    banner.classList.remove('phase-green', 'phase-yellow', 'phase-red');
    if (pct > 0.5) banner.classList.add('phase-green');
    else if (pct > 0.2) banner.classList.add('phase-yellow');
    else banner.classList.add('phase-red');

    if (remaining <= 0) clearInterval(timerInterval);
  }

  update();
  timerInterval = setInterval(update, 1000);
}

/** Resume the banner from a saved ISO deadline string */
export function resumeBanner(deadlineISO) {
  missionDeadline = new Date(deadlineISO).getTime();

  const banner = document.getElementById('mission-banner');
  const valueEl = document.getElementById('mission-banner-value');
  if (!banner || !valueEl) return;

  banner.classList.remove('hidden');
  void banner.offsetWidth;
  banner.classList.add('visible');
  document.body.classList.add('banner-active');

  clearInterval(timerInterval);

  function update() {
    const remaining = Math.max(0, missionDeadline - Date.now());
    const totalSec = Math.floor(remaining / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    valueEl.textContent =
      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    const pct = remaining / MISSION_DURATION_MS;
    banner.classList.remove('phase-green', 'phase-yellow', 'phase-red');
    if (pct > 0.5) banner.classList.add('phase-green');
    else if (pct > 0.2) banner.classList.add('phase-yellow');
    else banner.classList.add('phase-red');

    if (remaining <= 0) clearInterval(timerInterval);
  }

  update();
  timerInterval = setInterval(update, 1000);
}

/** Hide the banner and stop the timer */
export function hideBanner() {
  clearInterval(timerInterval);
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
