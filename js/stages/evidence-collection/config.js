/**
 * Stage config: evidence-collection
 * Post-rogue: quick camera access + scanner activation.
 */

export const INTRO_SEQUENCE = [
  { time: 0,    type: 'text',  text: 'Accès aux systèmes partiellement rétabli.' },
  { time: 3000, type: 'text',  text: 'Scanner optique en ligne. Collectez les éléments nécessaires.' },
  { time: 6000, type: 'text',  text: 'Autorisez l\'accès à la caméra.' },
  { time: 7000, type: 'action', action: 'requestCamera' },
  // ── pauses until camera granted, then timeline resets ──
  { time: 0,    type: 'text',  text: 'Caméra en ligne. Scannez les QR codes pour collecter les preuves.' },
  { time: 3000, type: 'action', action: 'startScanner' },
];
