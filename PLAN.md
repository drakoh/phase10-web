# Phase 10 Web — Product & Engineering Plan

> A mobile-first, bilingual (FR/EN) web recreation of the official Phase 10 card game,
> with a single-player "Journey" progression that steadily increases difficulty, plus
> local multiplayer and practice modes. Built as an installable PWA so it behaves like
> a native app on iOS and Android.

**Owner:** Remi Cartier · **Primary user:** daughter (+ family) · **Status:** Proposal  
**Target:** Playable MVP in ~6–8 weeks of part-time work; full release ~12–16 weeks.

---

## 1. Vision & Scope

### 1.1 Vision
Deliver the feeling of the official Phase 10 mobile app (Mattel/Magmic "World Tour"
style) — short 3–5 minute rounds, portrait one-handed play, a progressive journey
map, characters, rewards — while staying **100% faithful to the official rules** and
**free of paywalls/energy gating** (this is a family game, not a monetized app).

### 1.2 In scope (v1)
- Full official rules (2–6 players, all 10 phases, Skip/Wild, hitting, scoring, tie-break).
- Single-player "Journey" mode vs AI with a progression/leveling system that gets
  harder (see §6).
- "Quick Play" / practice mode: choose number of phases, number of AI opponents,
  difficulty.
- Local pass-and-play multiplayer (same device) for family nights.
- Bilingual UI: French + English, switchable at runtime, persisted.
- Mobile-first responsive web, installable PWA, offline-capable.
- Progression: XP, player level, stars per level, unlocks (themes, card backs,
  avatars, boosters), achievements.
- Tutorial / interactive onboarding.
- Stats & history (wins, best scores, phases completed).

### 1.3 Out of scope (v1, revisit later)
- Online real-time multiplayer (WebRTC/WebSocket) — design hooks included, not built.
- Real-money purchases, ads, energy timers.
- User accounts / cloud sync (local-first; optional Supabase/Firebase sync in v2).
- Voice chat, emotes beyond simple ones.

### 1.4 Non-goals
- Pixel-perfect clone of the licensed app's art (we use our own clean 2D art to
  avoid trademark issues; Phase 10® is a Mattel trademark — see §11 risks).

---

## 2. Target Platforms & Tech Stack

### 2.1 Platforms
- **Primary:** iOS Safari (iPhone, portrait), installed to Home Screen (PWA).
- **Secondary:** Android Chrome (PWA install).
- **Tertiary:** desktop browsers (responsive, landscape OK but portrait-optimized).

### 2.2 Stack (recommended)

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Compile-time safety for game logic |
| UI | React 18 + Vite | Fast dev, great ecosystem, PWA plugin |
| Styling | Tailwind CSS + CSS variables for theming | Mobile-first, dark/light, themes |
| Animation | Framer Motion | Card deal/draw/discard/hit animations |
| State | Zustand (slices) | Simple, performant, testable |
| i18n | react-i18next + ICU | FR/EN, pluralization |
| Persistence | IndexedDB via Dexie (primary), localStorage (settings) | Offline-first, structured |
| PWA | vite-plugin-pwa (Workbox) | Installable, offline cache |
| Testing | Vitest (unit) + Playwright (e2e) | Game engine must be thoroughly tested |
| Lint/Format | ESLint + Prettier | Consistency |
| CI | GitHub Actions | Build, test, deploy to Pages/Cloudflare |
| Hosting | Cloudflare Pages or GitHub Pages | Free, fast, HTTPS (required for PWA) |

### 2.3 Why not a game engine?
Card game UI is DOM-friendly; React gives us accessibility, i18n, and responsive
layout for free. A canvas engine (Phaser) would fight us on text/i18n and
accessibility. We keep game logic pure (no React dependency) so it's testable and
portable.

---

## 3. Repository Layout

```
phase10-web/
├── PLAN.md
├── README.md
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── i18n/                 # fr.json, en.json, init
│   ├── engine/               # PURE game logic (no React/DOM)
│   │   ├── cards.ts          # Card model, deck creation, shuffle
│   │   ├── phases.ts         # Phase definitions & validators
│   │   ├── rules.ts          # Turn flow, hitting, going out, scoring
│   │   ├── ai.ts             # AI decision engine
│   │   └── __tests__/
│   ├── state/                # Zustand stores (game, profile, settings, ui)
│   ├── components/           # React UI (Card, Hand, Table, PlayerPanel, ...)
│   ├── screens/              # Home, Journey, Game, Settings, Tutorial, Stats
│   ├── progression/          # Level definitions, XP, unlocks, achievements
│   ├── persistence/          # Dexie DB, repositories
│   ├── audio/                # Sound effects (howler or web audio)
│   ├── styles/               # Tailwind config, theme tokens
│   └── utils/
├── public/                   # icons, manifest, splash screens
└── tests/e2e/                # Playwright
```

Key invariant: **`engine/` has zero imports from React or browser APIs.** This makes
the rules trivially unit-testable and reusable for a future native/CLI port.

---

## 4. Domain Model

### 4.1 Cards
```ts
type Color = 'red' | 'blue' | 'yellow' | 'green';
type Card =
  | { kind: 'number'; value: 1..12; color: Color; id: string }
  | { kind: 'wild'; color: Color; id: string }   // wild is colored but flexible
  | { kind: 'skip'; id: string };                // blue skip
```
Deck: 2 sets of 1–12 per color (96) + 8 wild (2 per color) + 4 skip = 108.
Each card carries a stable `id` for animation keys and hit-testing.

### 4.2 Phases
```ts
type PhaseSpec =
  | { type: 'sets'; count: number; size: number }            // e.g. 2 sets of 3
  | { type: 'set+run'; set: number; run: number }
  | { type: 'run'; length: number }
  | { type: 'color'; count: number }
  | { type: 'set+set'; a: [count,size]; b: [count,size] };  // phase 9/10
```
The 10 official phases:
1. 2 sets of 3
2. 1 set of 3 + 1 run of 4
3. 1 set of 4 + 1 run of 4
4. 1 run of 7
5. 1 run of 8
6. 1 run of 9
7. 2 sets of 4
8. 7 cards of 1 color
9. 1 set of 5 + 1 set of 2
10. 1 set of 5 + 1 set of 3

A `PhaseInstance` is a laid-down phase with its groups (sets/runs/color group) and
a list of hit cards attached to each group. Validation must enforce:
- Runs cannot extend below 1 or above 12 (even with wilds).
- A wild, once placed, is locked to its role for the round.
- Only the exact required groups may be laid (no extra third set on phase 1).
- Additional same-value/adjacent cards may be added to an already-laid group
  (hitting during lay-down is allowed: "you may lie down more than the minimum …
  if directly added").

### 4.3 Round state
```ts
type RoundState = {
  players: PlayerState[];          // currentPhase index 0..9 per player
  drawPile: Card[];
  discardPile: Card[];
  skipTokens: Record<playerId, Card | null>; // skip card held in front
  currentPlayerIndex: number;
  phaseLaid: Record<playerId, PhaseInstance | null>;
  status: 'playing' | 'finished';
  winnerId?: string;
  turn: TurnState;                 // draw done? phase laid? hits done? discard pending?
};
```
Turn is a small state machine: `awaitingDraw → (optional)layPhase → (optional)hits → awaitingDiscard → endTurn`.

### 4.4 Match / Journey
```ts
type MatchConfig = {
  mode: 'journey' | 'quick' | 'passAndPlay';
  targetPhases: number;            // how many phases needed to win (1..10)
  opponents: AiProfile[];         // 0 for solo? min 1 opponent for journey
  difficulty: Difficulty;
  specialRules: SpecialRule[];     // challenge modifiers
  seed?: number;                  // deterministic shuffle for replay/debug
};
```

---

## 5. Game Engine (Rules) — Implementation Notes

Must be a pure, deterministic, testable module. Key edge cases to encode (from
official FAQ):

1. **Skip card placed in front of skipped player**, not on discard pile. Skipped
   player's only action: move it to discard. Can't be skipped two turns in a row.
   If dealer starts discard with a Skip, first player auto-skipped.
2. **Skip card may never be picked up from discard pile** (even if top).
3. **Wild may be picked up from discard** (including dealer's first card).
4. **Runs bounded 1–12**; cannot wrap or extend beyond.
5. **Wild locked** once played in a phase.
6. **Phase credit on lay-down**, not on going out.
7. **Failed phase → retry same phase next round.**
8. **Round ends immediately when a player goes out**; remaining players lose
   their turn this round.
9. **Tie-break:** if 2+ complete phase 10 same round → lowest total score wins;
   if still tied → replay phase 10, first to go out wins.
10. **Hitting requires own phase already laid.** Multiple hits allowed per turn.
11. **Scoring:** 5 (1–9), 10 (10–12), 15 (skip), 25 (wild). Only hand cards.
12. **Dealer rotates** left each round.

Engine API:
```ts
function createRound(config, rng): RoundState;
function legalActions(state, playerId): Action[];
function applyAction(state, action): RoundState;   // immutable
function isRoundOver(state): boolean;
function scoreRound(state): ScoreSheet;
function nextRound(state, scores): RoundState;    // resets deck, advances phases
```
All actions validated; illegal actions throw `IllegalMoveError`. Every function is
pure (input state + action → new state), enabling time-travel debugging and tests.

RNG is injected (seeded PRNG, e.g. `seedrandom`) so matches are reproducible —
critical for debugging AI and for "replay" features.

---

## 6. Progression & Leveling System (the "harder and harder" core)

### 6.1 Design philosophy
- **Short sessions:** each level = one match (1–3 phases), target 3–5 minutes.
- **Difficulty ramps along several independent axes** so it doesn't feel arbitrary.
- **No paywalls:** boosters earned by play; energy either absent or very generous.
- **Forgiving but challenging:** stars (1–3) per level; replay for better stars;
  can't be soft-locked.

### 6.2 Journey map
A winding path (like the river-of-stones in the mobile app) grouped into **Worlds**
(5–7 worlds, ~15 levels each = ~90 levels). Each world has a theme (Beach, Forest,
City, Mountains, Desert, Space, …) unlocking card-backs/themes.

Levels are nodes; completing a level unlocks the next; 3-starring unlocks a
"hard mode" variant (optional).

### 6.3 Difficulty axes (ramp over levels)

| Axis | Early (L1–15) | Mid (L16–45) | Late (L46–90) |
|---|---|---|---|
| Phases to win | 1 | 2–3 | 5–10 |
| # opponents | 1 | 2 | 3 |
| AI skill | Easy | Medium | Hard/Expert |
| Starting hand luck bias | none | slight (AI gets better draws) | stronger |
| Special rules | none | introduced gradually | stacked |
| Score target (for 3 stars) | loose | moderate | tight |
| Boosters allowed | 3 | 2 | 1/0 |

"AI gets better draws" is implemented as **deck composition tweaks** (more wilds
removed? no — that changes rules). Instead, difficulty comes from AI skill + phase
count + special rules + tighter star thresholds. We do **not** rig the deck; that
breaks trust. (Optional "challenge" levels may use a fixed seed for fairness.)

### 6.4 Special rules (challenge modifiers), unlocked progressively
- **No Wilds in final hand** (must discard all wilds before going out).
- **Skip storm:** +2 extra skip cards in deck.
- **Speed round:** 30s turn timer (blitz).
- **Single color focus:** phase 8 variant requiring 9 of one color.
- **Handicap:** you start 1 phase behind opponents.
- **No hitting opponents:** may only hit own phase.
- **Double points:** scoring doubled (punishes leftover cards).
- **Blind draw:** discard pile hidden (can't see top card value) — increases luck.

Each special rule is a tagged modifier applied to `MatchConfig.specialRules`; engine
validates legality.

### 6.5 AI difficulty tiers

Implemented as a strategy with tunable parameters, not separate codebases:

- **Easy:** random legal moves among a filtered set; lays phase as soon as
  possible; discards highest-point leftovers; skips a random opponent; 20%
  "mistake" rate (suboptimal discard).
- **Medium:** greedy heuristic — prefers drawing discard if it completes a needed
  card; holds wilds; targets the player closest to winning with skips; discards
  cards useless to current phase; 5% mistake rate.
- **Hard:** 1-ply lookahead over (draw choice × discard) evaluating resulting
  hand "phase progress" score; better skip targeting (skip leader); manages wild
  conservation; no mistakes.
- **Expert:** 2-ply lookahead + opponent modeling (tracks what opponents likely
  hold via discard history); aggressive hitting to deny; optimal wild usage.

Difficulty knob also controls **reaction time** (artificial delay) for feel.

AI must be **deterministic given seed** and covered by tests (e.g., "expert beats
easy ≥ 80% over 1000 simulated games").

### 6.6 XP, levels, unlocks

- XP sources: win (+100), complete a phase (+20), go out first (+50), 3-star
  level (+25 bonus), daily challenge (+150), achievement (+varies).
- Player level 1–50 (or unbounded with prestige). Each level grants a reward.
- Unlock table: themes, card backs, avatar frames, booster packs, titles.
- Boosters (earned, not bought): "Peek top 3 of draw pile", "Swap a card with
  draw pile", "Shield (ignore next skip)", "Wild draw (guaranteed wild next
  draw)", "Undo last discard" (once per match).
- Achievements: "Complete phase 10", "Win without wilds", "Win with 0 points
  leftover", "Beat expert AI", "7-day streak", etc.

### 6.7 Star rating per level
- ★ Win the match.
- ★★ Win with total score ≤ threshold (e.g., 30).
- ★★★ Win with score 0 (went out first) OR within turn limit.

---

## 7. UI/UX & Mobile-First

### 7.1 Layout (portrait, one-handed)
```
┌─────────────────────┐
│ Opponents (top)     │  avatars + phase + card count
│                     │
│   Table / discard   │  draw pile, discard pile, laid phases
│                     │
│   Your phase area   │  laid phase + hit targets
│                     │
│   Your hand (fan)   │  draggable cards, bottom
│   [Draw][Discard]   │  big touch targets
└─────────────────────┘
```
- Min touch target 44×44pt; card size ~60×84pt.
- Bottom sheet for actions; swipe gestures for draw/discard.
- Safe-area insets for notch/home indicator.
- Landscape supported but not optimized (show "rotate" hint optional).

### 7.2 Interactions
- Tap card → select; tap target (phase group / pile) → play. Drag-and-drop as
  enhancement, with tap fallback (accessibility).
- Card animations: deal (staggered), draw (arc to hand), discard (slide to pile),
  lay phase (fan out), hit (snap into group), go-out (confetti).
- Haptics on draw/discard/win (Vibration API, iOS limited — degrade gracefully).
- Sound: deal, draw, discard, lay, hit, skip, win/lose; mute toggle persisted.

### 7.3 Screens
Home → (Play) Journey map / Quick Play / Pass & Play / Daily Challenge
     → Settings (language, sound, haptics, theme, account)
     → Stats & Achievements
     → Tutorial (first launch auto)
Game screen (as above) with pause menu (rules reference, quit, settings).
Post-match: results, XP earned, unlocks, stars, "next level" CTA.

### 7.4 Accessibility
- Semantic HTML, ARIA labels on cards ("Red 7", "Wild blue", "Skip").
- Keyboard support on desktop (arrow keys select, Enter play, D draw).
- Color-blind mode: add symbols/patterns to colors (not color alone).
- Reduced motion respect (`prefers-reduced-motion`).
- Screen-reader-friendly turn announcements.

---

## 8. Internationalization (FR/EN)

- All user-facing strings in `i18n/fr.json` & `en.json`; no hardcoded text in
  components.
- Language detection: device locale → fallback EN; manual override persisted.
- ICU pluralization for counts ("1 carte" vs "2 cartes").
- Card names localized ("Valet"? no—numbers stay; "Joker"→"Joker", "Skip"→
  "Passe ton tour"/"Skip"). Phase names: keep canonical English phase terms? Use
  localized descriptive form: "2 séries de 3", "1 série de 3 + 1 suite de 4".
- Numbers/dates formatted via `Intl` (scores, dates).
- RTL not needed (FR/EN both LTR) but layout avoids absolute LTR assumptions.

---

## 9. Persistence & Accounts (v1 local-first)

- **Profile:** single local profile (name, avatar, level, XP, unlocks, stats,
  settings). Stored in IndexedDB.
- **Game state:** in-progress match auto-saved; resume on reopen.
- **Settings:** language, sound, haptics, color-blind, theme.
- **Export/Import:** JSON backup (so daughter's progress survives device change)
  via share sheet / file download.
- v2: optional cloud sync (Supabase) with same schema; auth via email/OAuth.

---

## 10. Milestones

### M0 — Foundations (week 1–2)
- Repo scaffold, tooling, CI, PWA shell, i18n skeleton, design tokens.
- Card + deck + shuffle; Phase definitions; unit tests.

### M1 — Core engine (week 3–4)
- Turn flow, draw/discard, lay phase, hitting, going out, scoring, tie-break.
- 100% rules coverage with unit tests (target ≥90% branch coverage on engine).
- Seeded RNG; reproducible matches.

### M2 — AI (week 4–5)
- Easy/Medium/ Hard/Expert strategies; simulation harness; balance pass.

### M3 — Playable game UI (week 5–7)
- Game screen, hand, table, animations, sound, haptics.
- Quick Play + Pass & Play modes.
- Tutorial.

### M4 — Journey & progression (week 7–9)
- Journey map, levels, difficulty ramp, XP/levels, unlocks, achievements, stars.

### M5 — Polish & PWA (week 9–11)
- Offline, install prompts, splash screens, performance (60fps), a11y audit,
  color-blind mode, FR/EN review by native speaker.

### M6 — Beta & release (week 11–12)
- Playwright e2e (full match, tutorial, language switch, install).
- Bug bash, performance budget check, deploy.

### Post-launch
- Online multiplayer, cloud sync, seasonal events, new worlds.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Trademark (Phase 10® is Mattel's) | Use own branding/art; call it "Phase 10 Web" fan project; no monetization; add disclaimer "not affiliated with Mattel". Avoid copying app art/assets. |
| Rules ambiguity | Source of truth = official PDF instructions + FAQ; encode edge cases in tests; add in-app rules reference. |
| AI too weak/strong | Simulation harness; tunable params; playtest with daughter; difficulty tiers. |
| iOS PWA limitations (no push, limited storage) | Local-first; no push needed v1; storage quota monitoring; export backup. |
| Touch UX on small screens | Prototype early (M3); test on real iPhone; tap-first with drag enhancement. |
| Scope creep | Strict v1 scope above; multiplayer/online explicitly deferred. |
| i18n quality | Native-speaker review of FR copy; use ICU; avoid machine-translated card terms. |

---

## 12. Testing Strategy

- **Unit (Vitest):** engine modules, phase validators, scoring, AI helpers.
  Golden tests: given a hand, expected legal moves.
- **Property tests:** invariants (deck size 108, hand+draw+discard+piles conserved,
  no illegal phase accepted, score non-negative).
- **Simulation:** 10k AI-vs-AI games to catch crashes, verify difficulty ordering.
- **E2E (Playwright):** tutorial completion, start quick play, play a full
  round to completion, switch language, install PWA, offline load.
- **Manual:** device matrix (iPhone SE/14/15 Pro, Android mid-range), a11y
  (VoiceOver/TalkBack), reduced motion.

Performance budgets: initial JS < 200KB gzipped; LCP < 2.5s on 4G; 60fps during
card animations; memory < 150MB.

---

## 13. Open Questions for You

1. **Players:** only your daughter (single profile) or multiple family profiles on
   same device? (Affects profile/account design.)
2. **Difficulty target for daughter:** should early levels be very easy (guaranteed
   win first few) to build confidence?
3. **Art style:** simple flat 2D (fast) vs richer illustrated (slower)? Any
   theme preference?
4. **Sound:** on by default? (Kids often play muted.)
5. **Multiplayer scope:** pass-and-play only, or also "hot-seat" with hidden
   hands (current plan)?
6. **Hosting:** do you have a domain, or use `*.pages.dev` / GitHub Pages?
7. **Any specific mobile app feature she loves** (characters, crafting, events)
   that must be in v1?

---

## 14. Appendix — Phase Reference (official)

| # | Phase |
|---|---|
| 1 | 2 sets of 3 |
| 2 | 1 set of 3 + 1 run of 4 |
| 3 | 1 set of 4 + 1 run of 4 |
| 4 | 1 run of 7 |
| 5 | 1 run of 8 |
| 6 | 1 run of 9 |
| 7 | 2 sets of 4 |
| 8 | 7 cards of 1 color |
| 9 | 1 set of 5 + 1 set of 2 |
| 10 | 1 set of 5 + 1 set of 3 |

Scoring: 1–9 = 5 pts, 10–12 = 10 pts, Skip = 15 pts, Wild = 25 pts (hand only).
Winner = first to complete Phase 10; tie → lowest score; still tied → replay
Phase 10, first to go out wins.

---

## 15. Next Step

If you approve this plan, I can:
1. Scaffold the repo (M0) with Vite + React + TS + Tailwind + PWA + i18n.
2. Implement the engine + tests (M1) first, so rules are locked before UI.
3. Build a minimal playable prototype (single player vs 1 easy AI, 1 phase) to
   validate UX on your iPhone before investing in full Journey mode.

Reply with answers to §13 (or "just go") and I'll start scaffolding.
