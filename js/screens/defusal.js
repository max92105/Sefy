/**
 * Screen: Bomb Defusal Finale — keypad + wire-cutting challenge.
 */

/** Create the defusal screen DOM */
export function createDefusalScreen() {
  const section = document.createElement('section');
  section.id = 'screen-defusal';
  section.className = 'screen';
  section.innerHTML = `
    <div class="screen-content centered">
      <div class="defusal-header">
        <span class="alert-flash">⚠ DISPOSITIF LOCALISÉ ⚠</span>
        <div class="countdown" id="defusal-countdown">60:00</div>
      </div>
      <div class="defusal-keypad" id="defusal-keypad"></div>
      <div class="defusal-wires" id="defusal-wires"></div>
      <div id="defusal-feedback" class="feedback hidden"></div>
    </div>
  `;
  return section;
}
