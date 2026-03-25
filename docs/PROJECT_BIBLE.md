# Operation Raven — Project Bible

> This is the single source of truth for the escape room website project.
> Refer to this during all implementation work. Keep it updated.

---

## 1. Overview

**What**: A static website that orchestrates a physical escape room experience in a house.
**Who**: Birthday gift for niece (turning 11) — played in a team with her sister (at least).
**When**: October 2026.
**Where**: Hosted on GitHub Pages. Played on phones during the house escape room.
**Theme**: Spy mission — rogue agent bomb defusal.

## 2. Story Premise

A security AI ("SEFY" — Sécurité de l'Établissement) has been woken up after detecting a threat.
A rogue agent ("Operative Raven") planted a bomb somewhere in the facility (the house).
The AI needs the players (the "agents") to physically locate clues around the house, enter codes on the site, unlock story beats, and ultimately defuse the bomb before time runs out.

**The website IS the AI.** It speaks to the players as mission control.
**The house IS the field.** Physical clues, QR codes, envelopes, hidden objects.

## 3. Core Design Principles

1. **The site orchestrates, it doesn't replace.** Players should spend most time in the house, not staring at screens.
2. **Mobile-first.** Big buttons, readable text, thumb-friendly. Players hold phones while searching.
3. **Offline-resilient.** localStorage saves everything. No stage requires a live network fetch.
4. **Answer security.** Hash puzzle answers (SHA-256) so players can't inspect source to cheat.
5. **Graceful recovery.** Auto-save, resume codes, admin bypass — nothing should break the experience.
6. **Age-appropriate.** 11-year-old friendly: exciting but not scary, challenging but not frustrating.
7. **French locale.** All player-facing text (UI labels, buttons, narrative, hints, feedback messages) MUST be in French. Code (variable names, comments, file names, CSS classes) stays in English. The admin panel can stay in English (developer tool, not player-facing).

## 4. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Markup | HTML5 | No build step |
| Styling | CSS3 (custom properties) | Theming, animations, no deps |
| Logic | Vanilla ES modules | No framework, no build, GitHub Pages native |
| State | localStorage | Persistent, client-side, no backend |
| Hosting | GitHub Pages | Free, static, reliable |
| Media | Audio/Video files | User will create/provide |
| QR | Generated separately | Link to site routes or embed codes |

## 5. Progression & State

### What we save (localStorage)
```json
{
  "missionStarted": true,
  "currentStage": 3,
  "solvedPuzzles": ["briefing", "raven-envelope", "cipher-wheel"],
  "hintsUsed": { "cipher-wheel": 2 },
  "inventory": ["red-keycard", "cipher-fragment-a"],
  "timestamps": {
    "start": "2026-10-15T14:00:00Z",
    "stage-1": "2026-10-15T14:02:30Z",
    "stage-2": "2026-10-15T14:12:00Z"
  },
  "finalModeUnlocked": false,
  "settings": {
    "soundEnabled": true,
    "musicEnabled": true
  }
}
```

### Recovery mechanisms
- **Auto-save**: after every state change
- **Reset button**: clears localStorage with confirmation
- **Admin page**: hidden route, jump to any stage, skip puzzles
- **Resume code**: displayed after each stage (manual backup, encoded state snapshot)

## 6. Stage Structure (V1 Target)

| # | Stage | Type | Summary |
|---|-------|------|---------|
| 1 | Briefing | Website | AI intro, mission context, sends players into house |
| 2 | Dead Drop | Physical → Website | Find envelope, decode clue, enter code on site |
| 3 | Intelligence | Website puzzle | Cipher/decode challenge unlocked by stage 2 |
| 4 | Field Ops | Physical (multi-room) | Combine clues from multiple locations |
| 5 | Midpoint Reveal | Website | Dramatic twist — bomb location revealed |
| 6 | Final Hunt | Physical → Website | Collect last code fragments |
| 7 | Defusal | Website | Countdown + keypad + wire choice = finale |

**V1 minimum**: 5 stages, 3 physical locations, 2 website puzzles, 1 bomb finale.
Can expand to 7 if time allows.

## 7. Puzzle Types Available

- **Code entry**: Find number physically, enter on site
- **QR unlock**: Scan physical QR → opens hidden page
- **Cipher**: Site shows key, physical clue has encoded text
- **Sequence**: Symbols from multiple rooms, enter in order
- **Image matching**: Photos on site, physical clue narrows selection
- **Audio clue**: Site plays message, house object helps interpret
- **Multi-part code**: Fragments collected over whole hunt, combined at end

## 8. Hint System

Each puzzle gets 3 tiers:
1. **Nudge**: Vague directional hint
2. **Guide**: Direct guidance
3. **Reveal**: Near-solution

Hints used affect final score. Tracked per puzzle in state.

## 9. Visual Design: Spy Terminal

- Dark background (#0a0a0a to #1a1a2e)
- Primary accent: electric green (#00ff41)
- Alert accent: red (#ff0040)
- Warning accent: amber (#ffab00)
- Fonts: monospace for terminal elements, clean sans-serif for readability
- UI elements: radar lines, glitch transitions, dossier panels, redacted text
- "SECURE ACCESS" / "CLASSIFIED" aesthetic
- Scanline overlay (subtle)
- CRT flicker on transitions

## 10. Pages / Screens

| Page | Purpose |
|------|----------|
| Terminal Boot | Black screen, typewriter lines: DÉMARRAGE DU SYSTÈME… / RÉCUPÉRATION / SIGNAL INTERMITTENT / ERREUR… ERREUR… / PROTOCOLE D’URGENCE / SIGNAL DÉTECTÉ. Heavy glitch + screen shake on errors. |
| SEFY Landing | Logo reveal [SEFY] + “Sécurité de l'Établissement corrompue / Besoin d'intervention humaine” + button |
| Briefing | AI video avatar (10s loop, muted) + voice-over audio (robotic voice) + narrative text + “Commencer la Mission” button |
| Stage (template) | Reusable: narrative text → puzzle/action → validation → next |
| Code Entry | Keypad or text input for answer validation |
| Evidence Board | Collected items, unlocked intel, mission progress |
| Hint Modal | Overlay with tiered hints |
| Bomb Defusal | Final set-piece: countdown, keypad, wire choice |
| Success | Mission accomplished, score, time, hints used |
| Failure | Time ran out (optional, cosmetic only — can retry) |
| Admin | Hidden debug panel: jump stages, reset, view state |

## 11. Audio / Video Plan

- **Ambient**: Low background music (spy/tension theme) — toggleable
- **SFX**: Button clicks, code accepted, code rejected, stage transitions, alarm
- **Video/Audio messages**: AI "speaking" to players at key moments (briefing, reveals, finale)
- User will create/provide media assets

## 12. Physical Props Checklist (Ideas)

- [ ] Envelopes with raven icon
- [ ] QR code stickers (print and hide)
- [ ] Printed "classified" dossiers / redacted files
- [ ] Color keycards
- [ ] Stopped clock (set to specific time)
- [ ] Objects with labels (first letters spell password)
- [ ] Invisible ink notes + UV flashlight
- [ ] Torn paper pieces to assemble
- [ ] Fake agent badges for players
- [ ] Wire color cards (for bomb finale)
- [ ] House floor plan / map (printed)

## 13. File Structure

```
escape/
├── index.html              # SPA entry point
├── admin.html              # Hidden debug/admin panel
├── css/
│   └── style.css           # Full spy terminal theme
├── js/
│   ├── app.js              # Main app controller & router
│   ├── state.js            # localStorage state management
│   ├── stages.js           # Stage navigation & unlock logic
│   ├── puzzles.js          # Puzzle validation engine
│   ├── ui.js               # UI helpers (modals, transitions, audio)
│   └── admin.js            # Admin panel logic
├── data/
│   └── stages.json         # All stage/puzzle/hint data
├── assets/
│   ├── audio/              # SFX and music
│   ├── video/              # Mission briefing videos
│   └── images/             # Dossiers, evidence photos, props
├── docs/
│   └── PROJECT_BIBLE.md    # This file
└── README.md               # GitHub repo description
```

## 14. Implementation Phases

### Phase 1 — Shell (CURRENT)
- [x] Project structure
- [x] HTML shell with screen containers
- [x] CSS spy terminal theme
- [x] State management module
- [x] Stage navigation skeleton
- [x] UI framework (modals, transitions)
- [x] Admin page skeleton

### Phase 2 — Core Flow
- [ ] Stage data JSON with real content
- [ ] Puzzle validation engine (hashed answers)
- [ ] Code entry keypad component
- [ ] Hint modal with 3-tier system
- [ ] Evidence board page
- [ ] Stage transitions with narrative screens

### Phase 3 — Set Pieces
- [ ] Landing boot sequence animation
- [ ] Briefing screen with AI message (video/audio)
- [ ] Bomb defusal finale (countdown, keypad, wires)
- [ ] Success/failure screens with scoring

### Phase 4 — Polish
- [ ] Audio integration (SFX, ambient music)
- [ ] Video messages
- [ ] QR code generation
- [ ] Resume code system
- [ ] Glitch/scanline effects
- [ ] Mobile testing & optimization
- [ ] Real puzzle content from user's script

### Phase 5 — Playtest & Prep
- [ ] Full dry run
- [ ] Physical prop creation
- [ ] QR code printing and placement plan
- [ ] Backup/recovery testing
- [ ] Final content review
