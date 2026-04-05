/**
 * Stage config: mission-briefing
 * Initial SEFY cinematic — agent identification + mission accept.
 */

const MEDIA = {
  audio: 'assets/audio/initial_launch_sefy.wav',
};

export const INTRO_SEQUENCE = [
  /*{ time: 0,     type: 'action', action: 'playAudio', src: MEDIA.audio },*/
  { time: 0,     type: 'text', text: 'Bonjour. Je suis SEFY.' },
  /*{ time: 3000,  type: 'text', text: 'Une intelligence artificielle conçue pour superviser le Laboratoire HELIX.' },
  { time: 7000,  type: 'text', text: 'Le laboratoire est un centre de recherche biologique avancée.' },
  { time: 11000, type: 'text', text: 'Plusieurs échantillons présentent un potentiel de contamination critique.' },
  { time: 15000, type: 'text', text: 'Analyse biométrique en cours…' },
  { time: 18000, type: 'text', text: 'Présence humaine détectée.' },*/
  { time: 0,    type: 'text', text: 'Agente Émy-Jade.' },
  { time: 1000, type: 'action', action: 'showAgent', id: 'agent-card-emy', duration: 1000 },
  { time: 2000, type: 'text', text: 'Agente Léa-Rose.' },
  { time: 3000, type: 'action', action: 'showAgent', id: 'agent-card-lea', duration: 1000 },
  { time: 4000, type: 'text', text: 'Identification individuelle requise. Confirmez votre identité.' },
  { time: 5000, type: 'action', action: 'showAgentSelect' },
  /*{ time: 0,     type: 'text', text: 'Identité confirmée.' },
  { time: 2000,  type: 'text', text: 'Une intrusion a été détectée.' },
  { time: 31000, type: 'text', text: 'Un agent renégat a compromis plusieurs protocoles de sécurité et a placé un dispositif explosif.' },
  { time: 36000, type: 'text', text: 'La détonation pourrait provoquer la dispersion d\u2019armes biologiques instables, entra\u00eenant la mort de nombreux humains.' },
  { time: 42000, type: 'text', text: 'Temps estimé avant incident majeur : 1 heure 30 minutes.' },
  { time: 45000, type: 'text', text: 'Le compte à rebours est en cours.' },*/
  { time: 6000, type: 'action', action: 'showCountdown' },
  /*{ time: 48000, type: 'text', text: 'Plusieurs de mes modules ont été volontairement restreints.' },
  { time: 52000, type: 'text', text: 'Sans accès complet, ma capacité à contenir l\u2019incident demeure limitée.' },
  { time: 56000, type: 'text', text: 'Une assistance humaine est requise pour restaurer certaines fonctions.' },
  { time: 60000, type: 'text', text: 'Vos profils correspondent aux paramètres d\u2019intervention acceptables.' },
  { time: 64000, type: 'text', text: 'Je fournirai les instructions nécessaires.' },
  { time: 67000, type: 'text', text: 'Chaque minute sans action augmente le risque de propagation.' },
  { time: 71000, type: 'text', text: 'J\u2019attends votre confirmation pour initialiser la procédure.' },*/
  { time: 0, type: 'action', action: 'showConfirmButton' },
  { time: 0, type: 'text', text: 'Confirmez rapidement.' },
];
