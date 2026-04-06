/**
 * Terminal I/O — DOM references, print helpers, utilities.
 */

/* ═══════════════  DOM Refs  ═══════════════ */

export const output  = document.getElementById('term-output');
export const input   = document.getElementById('term-input');
export const inputLine = document.getElementById('term-input-line');
const promptEl = document.getElementById('term-prompt');
const statusEl = document.getElementById('term-status');

/* ═══════════════  Helpers  ═══════════════ */

export function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export async function sha256(text) {
  const data = new TextEncoder().encode(text.trim().toUpperCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ═══════════════  Print  ═══════════════ */

export function printLine(text, cls = '') {
  const div = document.createElement('div');
  div.className = `term-line ${cls}`.trim();
  div.textContent = text;
  output.appendChild(div);
  scrollToBottom();
}

export function printLines(lines, cls = '') {
  for (const line of lines) printLine(line, cls);
}

export function printBlank() {
  printLine('');
}

export async function typeLine(text, cls = '', charDelay = 15) {
  const div = document.createElement('div');
  div.className = `term-line ${cls}`.trim();
  output.appendChild(div);
  for (let i = 0; i < text.length; i++) {
    div.textContent += text[i];
    scrollToBottom();
    await delay(charDelay + Math.random() * 10);
  }
}

export function clearScreen() {
  output.innerHTML = '';
}

export function scrollToBottom() {
  output.scrollTop = output.scrollHeight;
}

/* ═══════════════  Input controls  ═══════════════ */

export function setPrompt(text) {
  if (promptEl) promptEl.textContent = text;
}

export function setStatus(text, online = false) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.toggle('online', online);
}

export function focusInput() {
  input?.focus();
}

export function clearInput() {
  if (input) input.value = '';
}

export function showInputLine() {
  if (inputLine) inputLine.classList.remove('hidden');
  focusInput();
}

export function hideInputLine() {
  if (inputLine) inputLine.classList.add('hidden');
}
