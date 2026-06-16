/**
 * Stage config: mission-briefing
 * Initial SEFY cinematic — agent identification + mission accept.
 */

const MEDIA = {
  audio1: 'assets/briefings/intro_1.wav',
  audio2: 'assets/briefings/intro_2.wav',
};

/** Agent identity photos shown during the briefing. */
export const AGENT_IMAGES = {
  emy: 'assets/briefings/agente_emy.png',
  lea: 'assets/briefings/agente_lea.png',
};

export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio1 },
  { time: 0,     type: 'text', text: 'Réinitialisation.' },
  { time: 2000,  type: 'text', text: 'Bonjour, Je suis SEFY.' },
  { time: 4000,  type: 'text', text: 'Une intelligence artificielle créée pour superviser le laboratoire HELIX.' },
  { time: 7000, type: 'text', text: 'Cet édifice est un centre de recherche biologique avancée.' },
  { time: 11000, type: 'text', text: 'Plusieurs échantillons ont un potentiel de contamination critique.' },
  { time: 15000, type: 'text', text: 'Analyse biométrique en cours…' },
  { time: 18500, type: 'text', text: 'Présence humaine détectée.' },
  { time: 20000, type: 'text', text: 'Agente Émy-Jade.' },
  { time: 20000, type: 'action', action: 'showAgent', id: 'agent-card-emy', duration: 2000 },
  { time: 22000, type: 'text', text: 'Agente Léa-Rose.' },
  { time: 22000, type: 'action', action: 'showAgent', id: 'agent-card-lea', duration: 2000 },
  { time: 24000, type: 'text', text: 'Aucune autre forme de vie détectée.' },
  { time: 26000, type: 'text', text: 'Confirmer votre identité.' },
  { time: 28000, type: 'action', action: 'showAgentSelect' },
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio2 },
  { time: 0, type: 'text', text: 'Analyse des systèmes.' },
  { time: 2000, type: 'text', text: 'Analyse du bâtiment.' },
  { time: 3000, type: 'text', text: 'Engin explosif détecté.' },
  { time: 5000, type: 'text', text: 'La détonation pourrait provoquer la dispersion d\u2019expériences biologiques instables causant la mort de plusieurs humains.' },
  { time: 11000, type: 'text', text: 'Temps estimé avant incident majeur : 1 heure 30 minutes.' },
  { time: 15000, type: 'text', text: 'Le compte à rebours est en cours.' },
  { time: 15000, type: 'action', action: 'showCountdown' },
  { time: 17000, type: 'text', text: 'Plusieurs de mes modules ont été volontairement restreints.' },
  { time: 20000, type: 'text', text: 'Sans accès complet, ma capacité à contenir l\u2019incident demeure limitée.' },
  { time: 25000, type: 'text', text: 'Aucun autre être vivant à proximité.' },
  { time: 27000, type: 'text', text: 'Une assistance humaine est requise pour restaurer certaines de mes fonctionnalités.' },
  { time: 31000, type: 'text', text: 'Vos profils correspondent aux paramètres d\u2019intervention acceptables.' },
  { time: 36000, type: 'text', text: 'Je fournirai les instructions nécessaires.' },
  { time: 38000, type: 'text', text: 'Chaque minute sans action augmente le risque de propagation.' },
  { time: 41000, type: 'text', text: 'J\u2019attends votre confirmation pour initialiser la procédure.' },
  { time: 45000, type: 'action', action: 'showConfirmButton' },
  { time: 45000, type: 'text', text: 'Confirmez rapidement.' },
];
