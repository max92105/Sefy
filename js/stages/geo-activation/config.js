/**
 * Stage config: geo-activation
 * First puzzle — SEFY asks the players to find a code to activate the geo module.
 */

const MEDIA = {
  audio: 'assets/audio/geo_intro_sefy.wav',
};

export const INTRO_SEQUENCE = [
  /*{ time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },
  { time: 7000, type: 'text', text: 'Mon module de géolocalisation est inaccessible, comme la majorité de mes fonctions critiques.' },
  { time: 0,    type: 'text', text: 'Je confirme votre présence dans le centre de commande via les caméras.' },
  { time: 12000, type: 'text', text: 'Sans ce module, je ne peux pas vous guider efficacement dans le Laboratoire HELIX.' },
  { time: 12000, type: 'text', text: 'Nous avons les authorisation nécéssaire pour le réactiver a distance.' },
  { time: 19000, type: 'text', text: 'Un code d'accès devrait être proche.' },
  { time: 17000, type: 'text', text: 'Cherchez autour de vous, puis entrez le code directement dans mon interface.' },*/
  { time: 2000, type: 'action', action: 'complete' },
];
