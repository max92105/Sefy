/**
 * Terminal entry point — wires input, keyboard, and starts boot.
 */

import { input, focusInput, clearInput, showInputLine } from './io.js';
import {
  isLoggedIn, resetInactivityTimer, onLogout,
  getCommandHistory, getHistoryIndex, setHistoryIndex,
} from './state.js';
import { boot, handleLogin, loginPrompt } from './auth.js';
import { handleCommand } from './commands.js';

// When logout finishes, show the login prompt again
onLogout(() => loginPrompt());

/* ═══════════════  Input handler  ═══════════════ */

async function onSubmit() {
  const val = input.value;
  clearInput();
  resetInactivityTimer();

  if (!isLoggedIn()) {
    await handleLogin(val);
  } else {
    await handleCommand(val);
    // Only re-show input if still logged in (logout hides it)
    if (isLoggedIn()) showInputLine();
  }
}

/* ═══════════════  Keyboard  ═══════════════ */

input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    onSubmit();
  }

  // Command history navigation
  if (isLoggedIn()) {
    const history = getCommandHistory();
    if (history.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        let idx = getHistoryIndex();
        if (idx > 0) idx--;
        setHistoryIndex(idx);
        input.value = history[idx] || '';
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        let idx = getHistoryIndex();
        if (idx < history.length - 1) {
          idx++;
          setHistoryIndex(idx);
          input.value = history[idx] || '';
        } else {
          setHistoryIndex(history.length);
          input.value = '';
        }
      }
    }
  }
});

// Click anywhere to focus input
document.addEventListener('click', () => focusInput());

/* ═══════════════  Start  ═══════════════ */

document.addEventListener('DOMContentLoaded', boot);
