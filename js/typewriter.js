/**
 * Reusable typewriter effect — types text character by character with a blinking cursor.
 * The cursor appears via the CSS `.typing` class (::after pseudo-element).
 *
 * @param {HTMLElement} element  — target element to type into
 * @param {string}      text    — the text to type
 * @param {number}      speed   — ms per character (default 35)
 * @returns {Promise<void>} resolves when typing is complete
 */
export function typewriter(element, text, speed = 35) {
  return new Promise(resolve => {
    element.textContent = '';
    element.classList.add('typing');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
      } else {
        clearInterval(interval);
        element.classList.remove('typing');
        resolve();
      }
    }, speed);
  });
}
