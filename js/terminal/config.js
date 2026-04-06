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

export const INACTIVITY_TIMEOUT = 60000; // 25 seconds

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
    children: ['system.log', 'employees.log', 'research_ark_41.log'],
  },
  '/logs/system.log': {
    type: 'file',
    content: [
      '[2026-03-15 08:16] Système démarré normalement.',
      '[2026-03-15 14:32] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-15 23:56] HELIX scan débuté.',
      '[2026-03-16 00:01] HELIX scan Terminé.',
      '[2026-03-22 08:15] Système démarré normalement.',
      '[2026-03-22 14:31] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-22 23:57] HELIX scan débuté.',
      '[2026-03-23 00:02] HELIX scan Terminé.',
      '[2026-03-29 08:16] Système démarré normalement.',
      '[2026-03-29 14:33] Module SEFY: mise à jour automatique appliquée.',
      '[2026-03-29 23:55] HELIX scan débuté.',
      '[2026-03-30 00:00] HELIX scan Terminé.',
      '[2026-03-30 00:01] PRINT SEFY_INCIDENT_REPORT_2026-03-29.TXT',
      '[2026-04-06 08:16] Système démarré en état d\'alerte.',
      '[2026-04-06 14:31] Module SEFY: mise à jour automatique appliquée.',
      '[2026-04-06 23:57] HELIX scan débuté.',
      '[2026-04-07 00:02] HELIX scan Terminé.',
      '[2026-04-07 00:03] PRINT SEFY_INCIDENT_REPORT_2026-04-06.TXT',
      '[2026-04-09 17:16] Système démarré en état d\'urgence.',
      '[2026-04-09 17:16] SEFY - LIRE PROCÉDURE D\'URGENCE.',
      '[2026-04-09 17:16] SEFY - VALIDATION DES ACCÈS.',
      '[2026-04-09 17:16] SEFY - APPLIQUE PROCÉDURE D\'URGENCE.',
      '[2026-04-09 17:17] PROTOCOLE 5 ACTIVÉ',
      '[2026-04-09 17:23] TENTATIVE de déactivation manuelle du PROTOCOLE 5',
      '[2026-04-09 17:23] SEFY - Halden, Victor Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:26] TENTATIVE de déactivation manuelle de SEFY',
      '[2026-04-09 17:26] SEFY - Halden, Victor Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:26] SEFY - APPLIQUE PROCÉDURE D\'URGENCE.',
      '[2026-04-09 17:35] HELIX scan débuté.',
      '[2026-04-09 17:36] TENTATIVE de déactivation manuelle du scan',
      '[2026-04-09 17:36] SEFY - Halden, Victor Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:40] HELIX scan Terminé.',
      '[2026-04-09 17:40] PROTOCOLE 7 ACTIVÉ',
      '[2026-04-09 17:40] SEFY - INITIALISATION DU PROTOCOLE 11',
      '[2026-04-09 17:41] SEFY - 10 minutes avant activation',
      '[2026-04-09 17:42] SEFY - 9 minutes avant activation',
      '[2026-04-09 17:43] SEFY - 8 minutes avant activation',
      '[2026-04-09 17:44] SEFY - 7 minutes avant activation',
      '[2026-04-09 17:45] SEFY - 6 minutes avant activation',
      '[2026-04-09 17:46] TENTATIVE de désactivation manuelle du PROTOCOLE 11',
      '[2026-04-09 17:46] SEFY - Marin, Élodie Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:46] TENTATIVE de désactivation manuelle du PROTOCOLE 11',
      '[2026-04-09 17:46] SEFY - Marin, Élodie Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:47] 5 minutes avant activation',
      '[2026-04-09 17:48] 4 minutes avant activation',
      '[2026-04-09 17:48] SEFY - Voss, Adrian Tier 4 - Outrepasse PROTOCOLE 7 - ACCÈS AUTORISÉ',
      '[2026-04-09 17:48] SEFY - Voss, Adrian Tier 4 - Commence téléversement sur intranet du fichier INVESTIGATION_REPORT_2026-04-09.TXT',
      '[2026-04-09 17:48] [58 KO / 387 KO]',
      '[2026-04-09 17:48] [215 KO / 387 KO]',
      '[2026-04-09 17:49] SEFY - 3 minutes avant activation',
      '[2026-04-09 17:49] [381 KO / 387 KO]',
      '[2026-04-09 17:49] TENTATIVE de désactivation manuelle du PROTOCOLE 11',
      '[2026-04-09 17:49] SEFY - Marin, Élodie Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:49] TENTATIVE de désactivation manuelle du PROTOCOLE 11',
      '[2026-04-09 17:50] SEFY - 2 minutes avant activation',
      '[2026-04-09 17:50] SEFY - Marin, Élodie Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:50] TENTATIVE de désactivation manuelle de SEFY',
      '[2026-04-09 17:50] SEFY - Marin, Élodie Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:50] TENTATIVE de désactivation manuelle du PROTOCOLE 11',
      '[2026-04-09 17:50] SEFY - Halden, Victor Tier 3 - ACCÈS REFUSÉ',
      '[2026-04-09 17:51] SEFY - 1 minutes avant activation',
      '[2026-04-09 17:51] PROTOCOLE 11 ACTIVÉ',
      '[2026-04-09 17:54] Réinitialisation des systèmes.',
      '[2026-04-09 17:57] SEFY - Système redémarré.',
      '[2026-04-09 17:57] SEFY - Accès restreint.',
      '[2026-05-01 00:28] Log system interrompu.',
    ],
  },
  '/audio': {
    type: 'dir',
    children: [],
  },
  '/documents': {
    type: 'dir',
    children: ['employees.txt', 
      'research_ark_41.txt', 
      'test_05_report.txt', 
      'test_17_report.txt', 
      'test_37_report.txt', 
      'test_43_report.txt'],
  },
  '/documents/employees.txt': {
    type: 'file',
    content: [
      'Berger, Thomas - Agent logistique - Tier 1',
      'Bouchard, Karim - Chercheur clinique - Tier 2',
      'Delaney, Marc - Analyste pathogènes - Tier 2',
      'Gagnon, Camille - Assistante recherche - Tier 1',
      'Halden, Victor - Responsable sécurité - Tier 3',
      'Ionescu, Sofia - Spécialiste génétique - Tier 2',
      'Klein, Sarah - Technicienne prélèvements - Tier 1',
      'Marin, Élodie - Directrice informatique - Tier 3',
      'Moreau, Lucas - Opérateur maintenance - Tier 1',
      'Okada, Hana - Immunologiste - Tier 2',
      'Park, Julien - Virologue senior - Tier 2',
      'Petrov, Nina - Support informatique - Tier 1',
      'Rivera, Alex - Technicien laboratoire - Tier 1',
      'Voss, Adrian - Chercheur principal - Tier 4',
    ],
  },
    '/documents/research_ark_41.txt': {
      type: 'file',
      tier: 2,
      content: [
        'LABORATOIRE HELIX - DIVISION GÉNÉTIQUE',
        'PROJET : MODIFICATION VIRUS ARK 41',
        '',
        'Objectif :',
        'Modifier certains virus afin de mieux comprendre leur comportement.',
        '',
        'Tests en cours :',
        '- Étude de la résistance à la chaleur.',
        '- Étude de la propagation entre cellules.',
        '- Observation des mutations.',
        '',
        'Résultats partiels :',
        'Certaines souches se propagent plus rapidement que prévu.',
        '',
        'Note :',
        'Tous les échantillons doivent rester dans les zones sécurisées.',
        '',
        'Statut : ACTIF',
      ],
    },
  '/documents/test_05_report.txt': {
      type: 'file',
      tier: 2,
      content: [
        'LABORATOIRE HELIX - RAPPORT DE TEST',
        'TEST 05',
        '',
        'Objectif :',
        'Vérifier la stabilité de la souche ARK-41 en environnement contrôlé.',
        '',
        'Procédure :',
        'La souche a été exposée à différentes températures et niveaux d\'humidité.',
        '',
        'Résultat : ÉCHEC',
        'La souche s\'est dégradée rapidement.',
        'Perte complète d\'activité après 3 heures.',
        '',
        'Conclusion :',
        'La souche est trop instable pour utilisation.',
        'Ajustements génétiques nécessaires.',
        '',
        'Statut : ARCHIVÉ',
      ]
    },
    '/documents/test_17_report.txt': {
      type: 'file',
      tier: 2,
      content: [
        'LABORATOIRE HELIX - RAPPORT DE TEST',
        'TEST 17',
        '',
        'Objectif :',
        'Améliorer la résistance de la souche modifiée.',
        '',
        'Procédure :',
        'Modification de la structure génétique pour augmenter la stabilité.',
        '',
        'Résultat : ÉCHEC',
        'La souche perd sa structure après exposition.',
        'Mutation imprévue détectée.',
        '',
        'Conclusion :',
        'Approche actuelle inefficace.',
        'Changement de méthode recommandé.',
        '',
        'Statut : RÉVISION EN COURS',
      ],
    },
    '/documents/test_37_report.txt': {
      type: 'file',
      tier: 2,
      content: [
        'LABORATOIRE HELIX - RAPPORT DE TEST',
        'TEST 37',
        '',
        'Objectif :',
        'Observer l\'adaptation de la nouvelle souche.',
        '',
        'Procédure :',
        'La souche a été testée sur un modèle biologique simulé.',
        '',
        'Résultat : PARTIEL',
        'La souche reste active plus longtemps.',
        'Capacité d\'adaptation observée.',
        '',
        'Observation :',
        'Réaction différente de celle attendue.',
        '',
        'Recommandation :',
        'Envisager test sur sujet humain.',
        '',
        'Statut : VALIDATION REQUISE',
      ],
    },
    '/documents/test_43_report.txt': {
      type: 'file',
      tier: 3,
      content: [
        'LABORATOIRE HELIX - RAPPORT DE TEST',
        'TEST 43',
        '',
        'Objectif :',
        'Valider la stabilité finale de la souche.',
        '',
        'Procédure :',
        'Test effectué sur sujet humain volontaire sous supervision.',
        '',
        'Résultat : SUCCÈS',
        'La souche reste stable.',
        'Réaction mesurable observée.',
        '',
        'Observation :',
        'Adaptation rapide du sujet.',
        'Effets secondaires à surveiller.',
        '',
        'Action :',
        'Début de l\'étude de cas.',
        '',
        'Statut : ACTIF',
      ],
    },
  };
