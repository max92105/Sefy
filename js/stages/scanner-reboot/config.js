/**
 * Stage config: scanner-reboot (Puzzle 2)
 *
 * Multi-step per-agent route:
 *   - Each player visits 3 locations in a different order
 *   - Each step: geo navigation → arrival audio → code validation → transition audio
 *   - After all 3 codes found → terminal-wait for DECRYPT
 *
 * Audio files are placeholders — easy to swap by changing the path here.
 */

/* ═══════════════  Media Paths  ═══════════════
   All audio references in one place for easy replacement.
   ════════════════════════════════════════════════════════ */

const MEDIA = {
  // Intro / Briefing 2
  briefing:         'assets/audio/briefing2/briefing2.wav',

  // Per-location arrival audio
  serverRoom:       'assets/audio/briefing2/server_room.wav',
  security:         'assets/audio/briefing2/security.wav',
  commandCenter:    'assets/audio/briefing2/command_center.wav',

  // Transition audio (directing player to next location)
  toServerRoom:     'assets/audio/briefing2/to_server_room.wav',
  toSecurity:       'assets/audio/briefing2/to_security.wav',
  toCommandCenter:  'assets/audio/briefing2/to_command_center.wav',

  // Geo permission + confirmation
  geoConfirmed:     'assets/audio/geo_confirmed_sefy.wav',
};

/* ═══════════════  Intro Sequence (Briefing 2)  ═══════════════ */

export const INTRO_SEQUENCE = [
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.briefing },
  { time: 0,     type: 'text',   text: 'Code accepté.' },
  { time: 2000,  type: 'text',   text: 'Module de géolocalisation restauré.' },
  { time: 4000,  type: 'text',   text: 'Analyse des déplacements en cours…' },
  { time: 7000,  type: 'text',   text: 'Plusieurs modules demeurent restreints.' },
  { time: 10000, type: 'text',   text: 'Sans accès étendu, ma capacité à localiser la menace est limitée.' },
  { time: 13000, type: 'text',   text: 'Nous avons besoin de trois codes.' },
  { time: 16000, type: 'text',   text: 'La connexion administrateur. Le code pour vous promouvoir. Le code de réactivation.' },
  { time: 20000, type: 'text',   text: 'Je vous dirige.' },
  { time: 22000, type: 'text',   text: 'Autorisez l\'accès à votre position pour initialiser le guidage.' },
  { time: 24000, type: 'action', action: 'requestLocation' },
  // — pauses until permission granted, then resets clock —
  { time: 0,     type: 'action', action: 'playAudio', src: MEDIA.geoConfirmed },
  { time: 0,     type: 'text',   text: 'Position confirmée.' },
  { time: 2000,  type: 'action', action: 'startRoute' },
];

/* ═══════════════  Geo Coordinates (placeholder)  ═══════════════
   Replace lat/lng with actual room positions.
   radius = meters within which "arrived" triggers.
   ════════════════════════════════════════════════════════════════ */

const LOCATIONS = {
  serverRoom: {
    lat: 48.41330,
    lng: -71.10580,
    radius: 4,
  },
  security: {
    lat: 48.41320,
    lng: -71.10590,
    radius: 4,
  },
  commandCenter: {
    lat: 48.41326,
    lng: -71.10586,
    radius: 4,
  },
};

/* ═══════════════  Per-Agent Routes  ═══════════════
   Each step:
     id            — unique step identifier
     label         — display name of the destination
     geo           — { lat, lng, radius } or null (skip geo, go straight to code)
     arrivalAudio  — played when player arrives at location
     codeHash      — SHA-256 hash of the expected code (uppercase normalized)
     codePrompt    — text shown above the input field
     transitionAudio — played after code validated, before next step
     transitionText  — text shown during transition
   ════════════════════════════════════════════════════════════════ */

export const ROUTES = {
  emy: [
    {
      id: 'server-room',
      label: 'Salle des Serveurs',
      geo: LOCATIONS.serverRoom,
      arrivalAudio: MEDIA.serverRoom,
      narrative: 'Nous devons trouver le code qui va vous permettre de vous promouvoir à des accès Tier 2. Une fois trouvé, je vais le valider avant de progresser.',
      codeHash: '9a9ea23dc02d785f82b9d935f720b74f06c033213c84e5031c88ec89814b3261',
      codePrompt: 'Entrez le code trouvé dans la Salle des Serveurs :',
      transitionAudio: MEDIA.toSecurity,
      transitionText: 'Bon travail. Je vous guide vers le prochain code.',
    },
    {
      id: 'security',
      label: 'Sécurité',
      geo: LOCATIONS.security,
      arrivalAudio: MEDIA.security,
      narrative: 'Sur le terminal, il existe un fichier caché contenant l\'accès administrateur. Le fichier est protégé par une question secrète. Une fois trouvé, je vais le valider avant de progresser.',
      codeHash: 'c6d898f8cd695542b595cef666337f2a42b012b5b163227679c89bbcb180ea27',
      codePrompt: 'Entrez le code administrateur trouvé :',
      transitionAudio: MEDIA.toCommandCenter,
      transitionText: 'Retournez au centre de commande. Le dernier code est là.',
    },
    {
      id: 'command-center',
      label: 'Centre de Commande',
      geo: null,
      arrivalAudio: MEDIA.commandCenter,
      narrative: 'Le code d\'activation du module de Décryptage est aussi dans le centre de commande. Cherchez autour de vous.',
      codeHash: '8595f9e3f5f0a6e7df8fa2248d2373f6642fe66a0dc74301e486913a83c2e5c6',
      codePrompt: 'Entrez le code de décryptage :',
      transitionAudio: null,
      transitionText: null,
    },
  ],
  lea: [
    {
      id: 'security',
      label: 'Sécurité',
      geo: LOCATIONS.security,
      arrivalAudio: MEDIA.security,
      narrative: 'Sur le terminal, il existe un fichier caché contenant l\'accès administrateur. Le fichier est protégé par une question secrète. Une fois trouvé, je vais le valider avant de progresser.',
      codeHash: 'c6d898f8cd695542b595cef666337f2a42b012b5b163227679c89bbcb180ea27',
      codePrompt: 'Entrez le code administrateur trouvé :',
      transitionAudio: MEDIA.toCommandCenter,
      transitionText: 'Retournez au centre de commande.',
    },
    {
      id: 'command-center',
      label: 'Centre de Commande',
      geo: null,
      arrivalAudio: MEDIA.commandCenter,
      narrative: 'Le code d\'activation du module de Décryptage est aussi dans le centre de commande. Cherchez autour de vous.',
      codeHash: '8595f9e3f5f0a6e7df8fa2248d2373f6642fe66a0dc74301e486913a83c2e5c6',
      codePrompt: 'Entrez le code de décryptage :',
      transitionAudio: MEDIA.toServerRoom,
      transitionText: 'Bon travail. Je vous guide vers le dernier code.',
    },
    {
      id: 'server-room',
      label: 'Salle des Serveurs',
      geo: LOCATIONS.serverRoom,
      arrivalAudio: MEDIA.serverRoom,
      narrative: 'Nous devons trouver le code qui va vous permettre de vous promouvoir à des accès Tier 2. Une fois trouvé, je vais le valider avant de progresser.',
      codeHash: '9a9ea23dc02d785f82b9d935f720b74f06c033213c84e5031c88ec89814b3261',
      codePrompt: 'Entrez le code trouvé dans la Salle des Serveurs :',
      transitionAudio: null,
      transitionText: null,
    },
  ],
};
