/**
 * Terminal configuration — constants, action codes, virtual file system.
 */

/* ═══════════════  Agent Hashes (SHA-256)  ═══════════════
   456D79 → emy
   4C6561 → lea
   ════════════════════════════════════════════════════════ */

export const AGENT_HASHES = {
  '1c1ba6c2628afd47c9e1c57cf6ac548daedfc75a71874f0f2a10c84dbb1640fe': 'emy',
  '130111a9374da4888cf316006ce27b082c6dc1c90bcdd4aa2b5cae31a347808f': 'lea',
};

/* ═══════════════  Staff Hashes (SHA-256)  ═══════════════
   566963 → Victor   (Responsable biosécurité)
   C96C6F → Élodie   (Directrice scientifique)
   ════════════════════════════════════════════════════════ */

export const STAFF_HASHES = {
  'a17616e2e0fc45879be59d54cf9395735bc2c81c644448c34eeb7c79f59a62b4': { name: 'Victor', role: 'Responsable biosécurité' },
  '4f4de0735a2fdc92bb766985bc3b7bb045bb2361b0f937febda3cba01acdc17c': { name: 'Élodie', role: 'Directrice scientifique' },
};

export const INACTIVITY_TIMEOUT = 25000; // 25 seconds

/* ═══════════════  Boot Sequence  ═══════════════ */

export const BOOT_LINES = [
  { text: 'SEFY FACILITY TERMINAL v2.4.1', delay: 600, cls: 'dim' },
  { text: 'Initialisation du système…', delay: 800, cls: '' },
  { text: 'Connexion au réseau interne… ██████████ OK', delay: 1200, cls: '' },
  { text: 'ATTENTION: Protocole de sécurité actif', delay: 800, cls: 'warning' },
  { text: 'Authentification requise.', delay: 600, cls: 'bright' },
];

/* ═══════════════  Action Codes  ═══════════════ */

export const ACTION_CODES = [
  {
    code: 'STATUS',
    response: [
      '╔══════════════════════════════════════╗',
      '║ ÉTAT DES SYSTÈMES DE L\'INSTALLATION ║',
      '╠══════════════════════════════════════╣',
      '║ Réseau interne .......... EN LIGNE   ║',
      '║ HELIX ............. COMPROMIS        ║',
      '║ Protocole ACTIF ......... LOCKDOWN   ║',
      '║ SEFY ........ VERROUILLÉ             ║',
      '╚══════════════════════════════════════╝',
    ],
  },
  {
    code: 'AIDE',
    response: ['Alias pour HELP.'],
    alias: 'HELP',
  },
];

/* ═══════════════  Virtual File System  ═══════════════
   tier: minimum accessTier required to read (default 1)
   ════════════════════════════════════════════════════════ */

export const FILE_SYSTEM = {
  '/': {
    type: 'dir',
    children: ['logs', 'audio', 'documents'],
  },
  '/logs': {
    type: 'dir',
    children: ['system.log', 'employees.log'],
  },
  '/logs/system.log': {
    type: 'file',
    content: [
      '[2026-03-15 08:12] Système démarré normalement.',
      '[2026-03-15 14:33] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-22 08:09] Système démarré normalement.',
      '[2026-03-22 14:28] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-27 23:57] ALERTE CRITIQUE: Protocole 7 initié.',
      '[2026-03-28 02:19] ALERTE CRITIQUE: Protocole 11 initié.',
    ],
  },
  '/logs/employees.log': {
    type: 'file',
    content: [
      'Berger, Thomas - Agent logistique - Tier 1',
      'Bouchard, Karim - Chercheur clinique - Tier 2',
      'Delaney, Marc - Analyste pathogènes - Tier 2',
      'Gagnon, Camille - Assistante recherche - Tier 1',
      'Halden, Victor - Responsable biosécurité - Tier 3',
      'Ionescu, Sofia - Spécialiste génétique - Tier 2',
      'Klein, Sarah - Technicienne prélèvements - Tier 1',
      'Marin, Élodie - Directrice scientifique - Tier 3',
      'Moreau, Lucas - Opérateur maintenance - Tier 1',
      'Okada, Hana - Immunologiste - Tier 2',
      'Park, Julien - Virologue senior - Tier 2',
      'Petrov, Nina - Support informatique - Tier 1',
      'Rivera, Alex - Technicien laboratoire - Tier 1',
      'Voss, Adrian - Chercheur principal - Tier 4',
    ],
  },
  '/audio': {
    type: 'dir',
    children: [],
  },
  '/documents': {
    type: 'dir',
    children: ['readme.txt'],
  },
  '/documents/readme.txt': {
    type: 'file',
    content: [
      '=== PROTOCOLE D\'URGENCE ===',
      'En cas de défaillance de l\'IA:',
      '1. Authentifiez-vous sur un terminal.',
      '2. Utilisez la commande STATUS pour vérifier les systèmes.',
      '3. Entrez les codes d\'action reçus de votre équipe.',
      '4. Transmettez les codes obtenus aux agents sur le terrain.',
      '',
      'Tapez HELP pour la liste des commandes.',
    ],
  },
};
