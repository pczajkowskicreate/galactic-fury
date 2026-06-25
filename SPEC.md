# Retro Space Shooter — Game Specification (Current Build)

> Last updated: 2026-06-25. All milestones M1–M13 complete. Post-release polish applied (see bottom of file).

---

## Overview

A vertical-scrolling retro space shooter built with **Phaser 3** (browser, no build step required).
The player pilots through **5 stages** (25 waves total) and faces 6 bosses, culminating in the Prism Overlord at the end of Stage 5: Prism Dimension.

---

## Technical Foundation

- Phaser 3.60.0 loaded from CDN — single `index.html` entry point, no bundler
- All assets loaded from local paths relative to `index.html`
- Target resolution: 480 × 720 px (letterboxed in browser, FIT scale mode)
- 60 fps target; animations driven by Phaser's animation system
- **All sound effects synthesized via Web Audio API** (`SoundFX` class) — no audio files needed
- Scene structure: `PreloadScene → MenuScene → GameScene → VictoryScene`

---

## Gameplay — Current Feature Set

### Player
- Ship rendered as a container (scale **0.25**) holding ship body + animated thrust sprite
- Moves freely in 8 directions (WASD or arrow keys), clamped to screen bounds
- Fires upward automatically while holding Space (rate: 1 bolt per 240 ms)
- Bolts have rotation that follows their velocity direction (affected by black hole gravity)
- **Lives:** start at 3, max 5. Hit by enemy/projectile/asteroid → lose 1 life + brief invincibility flash
- Game over at 0 lives; HUD shows red `♥` hearts with gray `♥` ghost hearts up to the cap of 5

### Controls
| Key | Action |
|---|---|
| WASD / Arrows | Move ship |
| Space | Fire |
| E | Activate plasma shield (if held in reserve) |
| P | Pause / resume |
| R | Restart (on Game Over screen) |

### Scoring
| Event | Points |
|---|---|
| Kill Flying Eye Demon | +100 |
| Kill Enemy-01 (shooter) | +300 |
| Destroy asteroid | +50 |
| Destroy crystal asteroid (bolt) | +300 |
| Hit boss | +50 per hit |

---

## Enemies

### Flying Eye Demon (Wave 1–5)
- 8-frame animation, 1 HP
- Spawns at top, drifts straight down
- Despawns harmlessly at bottom of screen
- **18% chance to drop a health crystal on death**

### Enemy-01 (Wave 3–5)
- 5-frame animation, 3 HP
- Spawns at top, moves in a sine wave pattern horizontally
- Fires enemy projectiles downward on a timer (every 2–3.5 s)
- Uses hit FX variant 2 (larger splash)
- **Asset:** `top-down-shooter-enemies/sprites/enemy-01/` (5 layer PNGs)

---

## Wave System

5 waves before the boss. State machine: `idle → announcing → active → clearing → done`.

| Wave | Eye Demons | Enemy-01 | Spawn Interval |
|---|---|---|---|
| 1 | 5 | 0 | 1400 ms |
| 2 | 7 | 0 | 1200 ms |
| 3 | 4 | 3 | 1100 ms |
| 4 | 3 | 5 | 1000 ms |
| 5 | 5 | 5 | 850 ms |

- "WAVE N" announcement text fades in/out at wave start
- 3-second pause between waves
- 80% chance to force-spawn a black hole when a wave clears

---

## Hazards

### Asteroids
- 5 visual variants; spawn continuously throughout the game
- HP by variant: asteroid-01 = 3, asteroid-02/03 = 2, asteroid-04/05 = 1
- Drift downward with horizontal drift and spin
- Colliding with player → 1 life lost (not flagged as crystals)
- **15% chance to drop a plasma shield on destruction by bolt**
- **7% of asteroid spawns are red crystal asteroids** (see Pickups)

### Black Holes
- Spawn between waves (forced) and randomly during play
- Drift down with sine-wave horizontal oscillation and rotation
- Apply gravitational pull to all player bolts within 150 px radius (G = 300 000)
- Bolts within 20 px of center are absorbed (small hit FX)
- Contact with player → 1 life lost

---

## Pickups

### Health Crystal (pink, drops from killed enemies)
- 18% drop chance on enemy death
- Floats downward; player collects by contact (radius 26 px)
- Restores **+1 HP** (capped at 5)
- Shows "HEALTH CAP" popup if already at max

### Red Crystal Asteroid (crimson, drifts down like normal asteroids)
- 7% of asteroid spawns
- Pulsing alpha animation to distinguish from normal asteroids
- Player collects by contact (radius 22 px) **or** can be shot (300 pts, no drop)
- Restores **+3 HP** (capped at 5)
- Shows "HEALTH CAP" popup if already at max

### Plasma Shield Drop (cyan, drops from destroyed asteroids)
- 15% drop chance when a bolt destroys a normal asteroid
- Floats downward; player collects by contact (radius 26 px)
- Adds 1 to shield reserve (max 2 stored)
- Shows "SHIELD CAP" popup if already at max 2

---

## Plasma Shield System

- Press **E** to activate one stored shield charge
- Lasts **4 seconds**; visual: glowing circle (radius 22 px) centered on ship
- Last 1.2 seconds: circle flickers rapidly as warning
- While active: deflects all enemy projectiles and boss fireballs on contact
- Shield does **not** protect against direct enemy body collision or black holes
- HUD (top-left, below lives): `E — PLASMA SHIELD  ■□` or `PLASMA SHIELD ACTIVE  ■■`
- Slots shown as filled/empty squares (■/□) up to 2

---

## Boss Fight — Top-Down Mech Boss

Triggered after Wave 5 clears. Boss enters from top with "⚠ WARNING ⚠ BOSS APPROACHING" flash.
Background fades from space to arena (`stage-back.png`).

### Stats
- **30 HP total**; boss HP bar shown at top of screen
- Horizontal bounce movement, speed increases each phase

### Phases
| Phase | HP range | Speed | Attack |
|---|---|---|---|
| 1 | 30–21 | 65 px/s | Spread volley (5 bolts, ±35°) every 2.5 s |
| 2 | 20–11 | 95 px/s | Sweep beam (rapid small bolts, ±55° arc) |
| 3 | 10–1 | 140 px/s | Both spread (7 bolts, ±42°, every 1.8 s) AND sweep beam |

- Phase transitions: screen flash + "PHASE 2" / "FINAL PHASE" text
- Orange rays overlay sprite fades in at phase 2 (alpha 0.75) and fully at phase 3 (alpha 1.0)
- On death: 9-round chain of large explosions + camera shake → Victory screen

### Boss Assets
| Role | File |
|---|---|
| Boss body (5 frames) | `Warped/Characters/top-down-boss/PNG/sprites/boss/_000{0-4}_Layer-{1-5}.png` |
| Boss rays overlay (11 frames) | `Warped/Characters/top-down-boss/PNG/sprites/rays/_000{0-10}_Layer-{1-11}.png` |
| Boss bolt projectile (2 frames) | `Warped/Characters/top-down-boss/PNG/sprites/bolt/_000{0-1}_Layer-{2,1}.png` |

---

## Sound Effects (Synthesized — Web Audio API)

All sounds generated in real-time by the `SoundFX` class. No external audio files.

| Method | Trigger |
|---|---|
| `shoot` | Player fires a bolt |
| `hit` | Bolt impact (enemy, boss, shield block) |
| `enemyDie` | Enemy or bipedal death |
| `asteroidExplode` | Asteroid destroyed |
| `playerHit` | Player takes damage |
| `gameOver` | Lives reach 0 |
| `crystalPickup` | Health crystal or red asteroid collected |
| `shieldPickup` | Shield drop collected |
| `shieldActivate` | E pressed, shield goes active |
| `shieldBlock` | Projectile deflected by shield |
| `shieldExpire` | Shield duration ends |
| `bossHit` | Boss takes 1 HP damage |
| `bossFire` | Boss fires spread volley |
| `bossSweep` | Boss sweep beam tick (throttled to 1 per 300 ms) |
| `bossExplosion` | Each explosion in boss death sequence |
| `bossWarning` | Boss warning screen appears |
| `waveStart` | Each new wave begins |
| `victory` | Victory screen loads |

---

## HUD Layout

```
[LIVES  ♥♥♥♥♥]   [WAVE  3]   [SCORE  001200]   ← top bar
[E — PLASMA SHIELD  ■□]                          ← below lives, top-left
                                                  ← boss HP bar at y=44 (boss fight only)
```

- Lives: red filled hearts + gray ghost hearts showing max 5 cap (two-layer text trick)
- Shield slots: `■` filled / `□` empty, up to 2
- Boss HP bar color: red (>66%) → orange (33–66%) → pink (<33%)

---

## Screens

### Menu Screen (`MenuScene`)
- Starfield background, "SPACE SHOOTER" title
- Blinking "PRESS SPACE TO START" prompt
- Controls hint at bottom

### Game Over
- Shown inline in `GameScene` (no scene switch)
- Displays final score; press R to restart

### Victory Screen (`VictoryScene`)
- Starfield background, "YOU WIN!" title
- Final score displayed; press R to return to menu
- Victory fanfare plays on load

---

## Milestone 4 — Weapon Power-Ups & Kill Combo

**Goal:** Add depth to combat through weapon variety and a risk/reward combo system. Fully playable on top of the current build.

### Weapon Power-Ups
- Enemies have a **10% chance** to drop a weapon capsule on death (any enemy type)
- Weapon capsule drifts downward; player collects by contact
- Only one active weapon at a time; picking up a new one replaces the old
- Active weapon lasts **12 seconds**; HUD shows weapon name + a shrinking timer bar below the shield row
- Taking a hit while a weapon is active **immediately reverts** to normal bolt (punishment for getting hit)
- Three weapon types:

| Weapon | Behaviour | Fire Rate |
|---|---|---|
| **Spread Shot** | 3 bolts in a 25° fan | 240 ms (normal) |
| **Twin Bolt** | 2 parallel bolts, 12 px apart | 240 ms (normal) |
| **Rapid Fire** | Single bolt, double speed | 120 ms |

### Kill Combo System
- Every kill within **2.5 s** of the previous one extends the current combo chain
- Combo multiplier tiers: ×1 (default) → ×2 at 3 kills → ×3 at 6 kills → ×4 at 10+ kills
- All score events (enemy kill, asteroid, boss hit) are multiplied by current tier
- Taking damage **resets** combo to ×1
- Current multiplier shown as a small gold badge next to the score (e.g. `×3`)
- On multiplier increase: brief floating text announces the new tier ("COMBO ×3!")

### Kamikaze Drone (new enemy, waves 3–5)
- Spawns in tight clusters of 2–3 at the top
- 1 HP, no firing — dives straight toward player's current X position at ~250 px/s
- Worth **+50 pts** (multiplied by combo)
- Great for feeding combo chains but forces quick sidesteps
- **Asset:** `top-down-shooter-enemies/sprites/enemy-02/` (4 layer PNGs, existing pack)

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `weaponPickup` | Weapon capsule collected |
| `weaponExpire` | Weapon reverts to normal |
| `comboUp` | Multiplier tier increases |
| `comboBreak` | Multiplier resets on hit |

---

## Milestone 5 — Stage 2: Nebula Run + Mid-Boss

**Goal:** Double the game length with a second stage, new enemy mechanic, environmental hazard, and a mid-boss before a harder final encounter.

### Stage Transition
- After the mech boss death sequence ends, instead of going straight to Victory:
  - "STAGE  2" announcement fills the screen (same style as wave announcements)
  - Background cross-fades to a reddish-purple nebula (existing `bg-deep` tinted `0xff4422`, `bg-stars` tinted `0xcc00ff`)
  - Player score carries over; lives do **not** reset
  - 5 new waves begin with the same wave manager, but tighter intervals and mixed enemy types from the start

### Stage 2 Wave Table

| Wave | Eye Demons | Enemy-01 | Drones | Shield Carriers | Interval |
|---|---|---|---|---|---|
| 6 | 4 | 4 | 3 | 0 | 900 ms |
| 7 | 3 | 5 | 4 | 1 | 820 ms |
| 8 | 2 | 4 | 4 | 2 | 740 ms |
| 9 | 3 | 6 | 5 | 2 | 680 ms |
| 10 | 4 | 6 | 6 | 3 | 600 ms |

### Shield Carrier (new enemy)
- **5 HP**; a front arc (~120°) reflects all player bolts back harmlessly
- Must be flanked (bolt hits from the side or rear) or hit with Spread Shot which clips around the arc
- Fires a **2-shot burst** downward every 2.5 s
- Worth **+500 pts**
- **Asset:** `top-down-shooter-enemies/sprites/enemy-03/` (4 layer PNGs, existing pack)

### Meteor Shower Hazard
- Triggered automatically between waves 7→8 and 9→10
- 20 asteroids rain down rapidly over 8 seconds
- Random asteroid variant (asteroid-01–05), random vivid tint (10 colours), random scale (×0.7–×2.2), random speed (160–260 px/s), slight horizontal drift (±15 px/s)
- Cannot be destroyed by bolts during shower; player must dodge
- Brief "☄ METEOR SHOWER" warning text before it starts

### Stage 2 Mid-Boss — Gunship (between waves 8 and 9)
- **20 HP**, enters from top like the mech boss
- Moves in a slow figure-8 pattern across the arena
- **Phase 1** (HP 20–11): fires a 5-bolt spread downward every 2 s
- **Phase 2** (HP 10–1): adds a rotating ring of 8 bolts every 3 s (full circle, slow speed)
- No phase visual overlay — instead gunship tints progressively red as HP drops
- On death: medium explosion chain (6 bursts), then Wave 9 begins
- **Asset:** `Warped/Characters/mech-unit/` (mech-unit-export1–10.png) or `spaceship-unit/` (frame1–8.png) — to be confirmed during implementation
- Worth **+2000 pts** flat on kill

### Stage 2 Final Boss
- Same mech boss asset but with tuned stats: **40 HP**, faster movement, denser attacks
- Phase 3 adds a **homing fireball** that tracks the player slowly for 3 s before fading

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `meteorWarning` | Meteor shower begins |
| `shieldDeflect` | Shield Carrier deflects a bolt |
| `midBossDeath` | Gunship kill sequence |

---

## Post-M5 Polish (2026-05-29)

### Plasma Shield
- Radius increased **22 px → 46 px** to visually encompass the full ship sprite (vehicle-3.png is 329×160 px at 0.25 scale = ~82×40 px rendered; diagonal half-extent ≈ 46 px)
- Collision detection radius (`sr`) in `_collide()` updated to match

### Weapon Power-Up Icons
- Replaced tinted bolt sprites with PixelLab-generated pixel art assets saved to `assets/`:
  - `powerup-spread.png` — orange 4-petal burst
  - `powerup-twin.png` — dark teal barrel
  - `powerup-rapid.png` — purple/pink canister
- Rendered at **0.5 scale** (32 px on screen)
- Slow rotation tween: one full turn per **3.5 s**
- Colored glow via `postFX.addGlow()`: orange / teal / magenta per type
- Drop physics upgraded: `vx` added so blackhole gravity can pull horizontally

### Blackholes Swallow Powerups
- Weapon drops now subject to the same gravity/absorption logic as player bolts
- Pull radius: 150 px, G = 300 000; absorb radius: 20 px (plays hit FX on absorption)
- Off-screen cleanup extended to horizontal bounds (±40 px)

---

## Milestone 6 — Endless Mode, High Score & Full Polish

**Goal:** Replayability, persistence, difficulty choice, and quality-of-life polish that makes the game feel complete.

### High Score Persistence
- Best score saved to **localStorage** (`key: 'space-shooter-hiscore'`)
- Shown on the Menu screen below the title: `BEST  012400`
- Shown on Game Over and Victory screens alongside the current run score
- Only beaten if current run score exceeds saved best

### Difficulty Select
- Menu screen shows three difficulty options before starting (arrow keys / click to select):

| Mode | Starting Lives | Enemy Speed | Enemy Fire Rate | Shield drops |
|---|---|---|---|---|
| **EASY** | 5 | −25% | −30% | +50% chance |
| **NORMAL** | 3 | baseline | baseline | baseline |
| **HARD** | 2 | +20% | +25% | −50% chance |

- Selected difficulty stored in scene data and passed through all scenes
- Hard mode adds a permanent score ×1.5 multiplier to reflect the challenge

### Endless Mode
- After the Stage 2 Victory screen, player is offered: `[MENU]  or  [ENDLESS MODE]`
- Endless generates infinite randomized waves:
  - Starts at Wave 11 difficulty and escalates every 3 waves
  - Every 3rd wave triggers a meteor shower
  - Every 10th wave spawns a random boss (mech boss or gunship, alternating, with +10 HP per appearance)
- Endless high score tracked separately in localStorage (`'space-shooter-endless-hiscore'`)
- "ENDLESS — WAVE N" shown in HUD instead of normal wave counter

### Visual Polish
- **Low-health vignette**: when lives = 1, a pulsing red gradient ring appears around screen edges (`this.add.graphics()` fullscreen overlay with radial gradient, alpha ~0.4, pulse period 1.8 s)
- **Player engine glow**: a small soft cyan circle (radius 6 px, alpha 0.5) rendered under the ship, pulsing with thrust animation
- **Player death explosion**: when lives reach 0, ship flashes white then plays a full explosion sequence before showing Game Over (instead of simply hiding the ship)
- **Combo floating text** polish: numbers scale up briefly (tween scale 1→1.6→1) then float upward and fade

### Credits Screen
- Accessible from the Menu via `C` key
- Simple dark background with slow upward scrolling text:
  - Game title, engine credit (Phaser 3), asset packs used (Warped, Gothicvania), developer name
  - Press any key to return to menu

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `difficultySelect` | Difficulty option confirmed |
| `endlessLoop` | Endless mode begins |
| `newHighScore` | Run score beats saved best |

---

## Milestone 7 — Stage 3: Void Run (New Enemies & Environment)

**Goal:** Begin Stage 3 immediately after the Stage 2 final boss dies (reroute from Victory → Stage 3 transition). Introduce two new enemy types and a visually oppressive deep-void atmosphere across 5 tighter waves.

### Stage Transition
- Triggered at the end of Stage 2 final boss death sequence (currently routes to `VictoryScene` — change to `_beginStage3()`)
- **"STAGE  3"** announcement text in cold cyan (`#00ffee`, 46 px)
- Background: `bg-deep` tinted near-black `0x000a1a`, `bg-stars` tinted cold blue `0x001833`, `stageBack` alpha → 0.06 — a minimalist, claustrophobic void
- All planets hidden; weapon drops remain gated on `bossDefeated`; score and lives carry over unchanged
- New `GameMusic` pitch/tempo variant (or separate `Stage3Music` class) — same D-minor framework but faster (158 BPM) and with a sub-bass drone layer

### Alien Swarm (new enemy — wave type `'swarm'`)
- **Asset:** `Warped/Characters/alien-flying-enemy/sprites/alien-enemy-flying1–8.png` (8-frame anim at 12 fps)
- **1 HP**, worth **+75 pts**; 8% health crystal drop chance
- Spawns via `_spawnSwarmGroup()`: 4 units simultaneously at random top-row X positions (±30 px apart), counts 4 toward `waveAlive`
- Moves downward in a fast sine wave (amplitude 55 px, period 320 ms) — harder to track than Eye Demons
- No shooting; despawns harmlessly at bottom
- High drone-like combo potential; no weapon drop

### Stage 3 Wave Table

| Wave | Swarm groups | Drones | Carriers | Interval |
|---|---|---|---|---|
| 11 | 3 (=12 units) | 4 | 2 | 520 ms |
| 12 | 3 (=12 units) | 5 | 3 | 480 ms |
| 13 | 4 (=16 units) | 5 | 3 | 440 ms |
| 14 | 3 (=12 units) | 6 | 4 | 400 ms |
| 15 | 4 (=16 units) | 7 | 3 | 360 ms |

> `WAVES` array extended to 15 entries. The wave queue entry `'swarm'` triggers `_spawnSwarmGroup()` which spawns 4 units at once. Endless mode starts at wave 16 difficulty.

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `swarmSpawn` | Alien swarm group materialises |

---

## Milestone 8 — Stage 3 Hazards & Void Cruiser Mid-Boss

**Goal:** Raise the danger ceiling with two new environmental hazards unique to Stage 3 and a mid-boss that forces the player to manage both threats simultaneously.

### Ion Storm Hazard
- Triggered between waves 12→13 and 14→15 (same slot as meteor shower in Stage 2)
- Duration ~10 s; 8 lightning strikes fired at ~1.1 s intervals after a 700 ms lead-in
- **Each strike sequence:**
  1. Thin red warning line (`Graphics.lineBetween`, 2 px, alpha 0.7) appears at a random X column, top-to-bottom, for **0.7 s**
  2. Line flashes white then becomes a full bolt (8 px thick, `0x88ccff`) for **0.15 s**
  3. Player within ±24 px of that X column takes 1 damage
- **"⚡  ION  STORM"** warning text (`#88ccff`, 26 px) before first strike
- Plasma shield does **not** block ion bolts (penetrating electrical damage)
- `this.ionStormActive` flag; asteroid spawning continues during storm; bolts from enemies still fire normally
- `ionStormWarning` SoundFX on start; `ionBolt` SoundFX on each bolt

### Black Hole Clusters (Stage 3 upgrade)
- From wave 11 onward, the forced between-wave black hole spawn produces a **cluster of 2–3 small black holes** instead of one large one
- Each cluster hole: scale 0.65, G = 180 000 (weaker individually, but combined pull in tight formation is potent)
- Cluster holes are seeded ±60–110 px apart horizontally and share the same downward velocity
- Single random black hole spawning during waves remains unchanged (the 45% chance check)

### Void Cruiser Mid-Boss (between waves 13 and 14)
- **Asset:** same `spaceship-unit` image as Raider but scale **2.0×**, tint **`0x6600ff`** (deep violet) — visually distinct at large size
- **35 HP**; enters from top; slow horizontal bounce + gentle vertical sine drift (amplitude 40 px, period 5 s)
- Reuses `bossBarBg/Fg/Label` HUD; label: `VOID CRUISER`; bar colour: purple `0x8800ff`

| Phase | HP range | Speed | Attacks |
|---|---|---|---|
| 1 | 35–18 | 55 px/s | 3-bolt downward spread every 2 s + 2 diagonal bolts (±55°) every 3 s |
| 2 | 17–1  | 80 px/s | Spread + **sweep beam** (identical to Stage 1 boss sweep); tint shifts progressively toward red |

- Death: 8-explosion chain (xD + xB alternating, 220 ms apart) → Wave 14; **+3 000 pts**
- `midBossDeath` SoundFX reused; game music resumes 1.5 s after death

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `ionStormWarning` | Ion storm begins |
| `ionBolt` | Each lightning strike |
| `voidCruiserDeath` | Cruiser kill sequence |

---

## Milestone 9 — The Leviathan (Stage 3 Final Boss & True Ending)

**Goal:** Deliver the climactic final encounter — a three-phase boss with mechanics that test every skill the player has developed — followed by a dedicated True Ending screen distinct from the normal Victory screen.

### The Leviathan (Space Demon)
- **Asset:** `assets/boss-space-demon-frame0–8.png` (PixelLab generated, 9-frame animation, dark armoured demon with wings and blue glow) — key prefix `bsd`, animation key `space-demon-anim`, scale **2.0**, no tint override
- **60 HP** (`bossMaxHp = 60`); horizontal bounce from 55 → 90 → 130 px/s per phase
- Enters from top; settles at y = 145; `bossBarLabel` text: `THE LEVIATHAN`

### Phase Breakdown

| Phase | HP Range | Speed | Attacks |
|---|---|---|---|
| 1 | 60–41 | 55 px/s | **Spiral volley**: 10 bolts fired in a rotating fan (±180°), rotates 36° each firing, every 2.8 s |
| 2 | 40–21 | 90 px/s | Spiral volley + **3 Phantom Drones** orbiting the boss at r = 80 px, each firing 1 bolt radially outward per orbit cycle |
| 3 | 20–1  | 130 px/s | Spiral + **Void Pulse** every 5 s (1.5 s duration) + **homing fireballs** every 3 s |

**Phantom Drones (phase 2 mechanic):**
- Rendered as `enemy-02` sprites at scale 0.6, tinted `0x9900ff`
- Orbit the Leviathan at angular speed 1.2 rad/s; position updated each frame: `x = boss.x + cos(angle) * 80`, `y = boss.y + sin(angle) * 80`
- Destroyed by 1 bolt hit (+100 pts each); respawn 8 s after destruction if boss is still alive
- Stored in `this.phantomDrones` group; cleared on boss death

**Void Pulse (phase 3 mechanic):**
- `this.voidPulseActive` boolean; set for 1.5 s every 5 s
- Any player bolt within 160 px of boss centre has its vx reversed and vy sign toggled — bolts scatter outward from the boss
- Visual: two concentric dark rings expanding outward from boss (Graphics, `0x330055`, alpha 0.6 → 0)
- `voidPulse` SoundFX on activation

### Phase Transitions
| Transition | Flash colour | Text | Extra |
|---|---|---|---|
| 1 → 2 | Deep purple `0x440088` | `PHASE  2` in `#9900ff` | Phantom Drones spawn with `swarmSpawn` sound |
| 2 → 3 | Hot pink `0xff0066` | `FINAL  PHASE` in `#ff0066` | Void Pulse timer starts immediately |

### Death Sequence
- 12-explosion chain (xD + xF alternating, 180 ms apart); full camera shake (2.5 s, 0.030)
- All Phantom Drones destroyed simultaneously on boss death
- Screen fades to black over 1.5 s → `TrueEndingScene`
- Kill reward: **+6 000 pts flat**

### True Ending Screen (`TrueEndingScene`)
- New Phaser scene registered in the boot array alongside `VictoryScene`
- Fade-in from black; **"YOU  SAVED  THE  GALAXY"** in large gold text (52 px) with slow alpha-pulsing glow tween
- Subtitle: `"All three stages cleared"` (18 px, white)
- Final score + best score displayed; difficulty badge shown (`EASY` / `NORMAL` / `HARD` label)
- Hi score saved to `'space-shooter-hiscore'` (shares key with normal run — same game, harder path)
- `VictoryMusic` plays at elevated master gain (0.22); `newHighScore` fanfare fires if beaten
- `[MENU]` / `[ENDLESS]` selection identical to VictoryScene (arrows + WASD + Space)
- Endless mode launched from here starts at wave 16 difficulty

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `voidPulse` | Leviathan Void Pulse activates |
| `phantomSpawn` | Phantom Drones appear (phase 2 transition) |

---

## Milestone 10 — Chromatic Chaos (Color, Flair & Playful Systems)

**Goal:** Make every moment feel vibrant and rewarding. Add visual spectacle for skilled play, new interactive events between waves, and small systems that make the game feel alive and joyful.

### Rainbow Combo Mode
- When kill combo reaches **×4**, activate **8-second Rainbow Mode**:
  - Player bolts cycle through the full color spectrum (red → orange → yellow → green → cyan → blue → purple) at 0.3s per step
  - All enemy death FX tinted with matching bolt color
  - HUD combo badge pulses and rotates
  - Screen gets a subtle rainbow-tinted vignette instead of the red health vignette
  - Score from all kills during Rainbow Mode gains an additional **×1.5 multiplier on top of the existing combo**
  - `rainbowMode` SoundFX: ascending arpeggio on activation
- If combo drops during Rainbow Mode, mode ends immediately with a `comboBreak` sound

### Color Trails (Player Engine Polish)
- Player ship engine glow color reflects active weapon:
  - No weapon: **cyan** `0x00ffcc` (current)
  - Spread: **warm orange** `0xff8800`
  - Twin: **electric teal** `0x00ffaa`
  - Rapid: **hot magenta** `0xff00cc`
- Color tweens smoothly on weapon pickup / expiry (0.4s lerp)
- Engine glow radius also pulses wider while Rainbow Mode is active

### Crystal Event (Between Waves)
- 40% chance to trigger between any wave that doesn't already have a hazard (waves 2, 3, 4, 6, etc.)
- A large **prismatic crystal** (new PixelLab asset, 64px, multi-color gem, slow rotation) drifts slowly down the center
- Player can:
  - **Shoot it** → shatters in a colorful explosion, grants one random reward:
    | Roll | Reward |
    |---|---|
    | 1–25% | +2 HP (capped at 5) |
    | 26–50% | All 3 weapons stacked for 8s |
    | 51–70% | +2 plasma shields |
    | 71–85% | Score ×2 for the next wave |
    | 86–100% | Full HP restore + brief invincibility 2s |
  - **Ignore it** → it drifts off screen harmlessly
- `crystalEvent` SoundFX on spawn; `crystalShatter` SoundFX on shoot
- Only one crystal per event; not affected by black holes

### Prism Enemy (New Enemy — wave type `'prism'`)
- **Asset:** PixelLab generated — a crystalline geometric enemy, top-down, 64px, faceted gem shape with colored inner glow (generate during M10)
- **2 HP**; on death splits into **3 colored shards** that each act as a fast-moving `'swarm'`-style projectile toward the player
  - Shards are red, green, blue — each different direction (±35° spread downward)
  - Player can shoot shards for +25 pts each; or dodge them
- Worth **+200 pts** on kill
- No weapon drop; **12% health crystal drop**
- Appears in Stage 2 and Stage 3 waves; add `prisms` field to WAVES entries

### Chromatic Plasma Shield
- While plasma shield is active, the shield circle animates through 6 colors (full rainbow cycle, 0.6s per step) instead of solid cyan
- Shield radius visible at its true 46px collision size (currently only 22px drawn)
- Blocking a projectile now spawns a small colored star-burst at the impact point (tiny PixelLab particle)

### New SoundFX methods needed
| Method | Trigger |
|---|---|
| `rainbowMode` | Rainbow Mode activates |
| `crystalEvent` | Crystal event spawns |
| `crystalShatter` | Crystal destroyed by bolt |
| `prismSplit` | Prism enemy splits into shards |

---

## Milestone 11 — True Endless Mode (Full Feature Parity)

**Goal:** Rebuild the endless mode from the ground up so it uses every system in the game — all 3 stage atmospheres, all hazards, all bosses, all enemy types — escalating into a genuine survival challenge with identity and personality distinct from the story mode.

### Stage Cycle System
Endless mode cycles through 3 atmospheric tiers, each lasting 7 waves, then repeating at higher difficulty. The cycle resets visually and musically on each new tier:

| Endless Waves | Atmosphere | Music | Hazards active |
|---|---|---|---|
| 1–7 (cycle A) | Stage 1 — blue space | GameMusic | Asteroids, Black holes |
| 8–14 (cycle B) | Stage 2 — red nebula | GameMusic | Asteroids, Meteor shower (wave 5 of tier), Black holes |
| 15–21 (cycle C) | Stage 3 — void black | Stage3Music | Asteroids, Ion storm (wave 3 and 6 of tier), Black hole clusters |
| 22+ | Repeats cycle A-C at +1 difficulty tier |

- Atmosphere transition uses the same tweens as the story mode stage transitions (`bgDeep`, `bgStars` tint + alpha)
- `this.endlessTier` tracks the current cycle (A/B/C) and `this.endlessDifficulty` the lap count
- Music switches on each tier start exactly as in story mode

### Full Enemy Roster in Endless
Replace the simplified `_generateEndlessWave` with a tier-aware generator:

```
Tier A  → eyes, bipeds, drones
Tier B  → bipeds, drones, shields, prisms (M10)
Tier C  → drones, shields, swarms, prisms
```

- Enemy counts scale with `endlessDifficulty`: base + `floor(difficulty * 1.5)` extra per type
- Spawn interval decreases: `max(150, baseInterval - difficulty * 30)` ms
- Enemy speed mult: `enemySpeedMult + difficulty * 0.08`
- Enemy fire mult: `enemyFireMult + difficulty * 0.06`

### Full Hazard Rotation
| Trigger | Hazard |
|---|---|
| Every 3rd wave in Tier A | Nothing (clean) |
| Every 3rd wave in Tier B | Meteor shower |
| Wave 3 and 6 of Tier C | Ion storm |
| Between wave 7 of any tier | Black hole cluster forced spawn |

### Full Boss Rotation
Every 7th wave (end of each tier), a boss appears. Rotation escalates:

| Lap 1 | Lap 2 | Lap 3+ |
|---|---|---|
| Tier A: Mech Boss | Tier A: Mech Boss (+10 HP) | Tier A: Stage 2 Final Boss |
| Tier B: Gunship | Tier B: Void Wraith | Tier B: Void Wraith (+scaled HP) |
| Tier C: Stage 2 Final Boss | Tier C: The Leviathan | Tier C: The Leviathan (scaled HP) |

- Boss HP: `Math.round(baseHp * bossHpMult * (1 + endlessDifficulty * 0.2))`
- After defeating a boss in endless, game music resumes appropriate to the current tier
- Leviathan in endless uses attack + phase animations but death **does not trigger TrueEndingScene** — instead awards **+10 000 pts** and immediately starts the next tier

### Milestone Wave Events (Every 7 Waves)
On every 7th wave in endless, before the boss appears, show a "MILESTONE" announcement with the wave count and award one of:
- Extra plasma shield charge
- 5-second full weapon combo (spread + twin + rapid)
- Temp score ×2 for the next boss fight
- Crystal event spawn

### Endless-Specific Power-Ups
Three new drops that only appear in endless mode (enemies have +10% drop rate in endless):

| Power-Up | Effect | Duration |
|---|---|---|
| **Overcharge** (gold, star shape) | All 3 weapons simultaneously | 6s |
| **Ghost** (white, translucent) | Full invincibility + pass through enemies | 3s |
| **Nova** (red, explosion shape) | Screen-clearing radial explosion (+50 pts per enemy) | Instant |

- Overcharge and Ghost use existing weapon/shield HUD rows; Nova has a brief full-screen flash + camera shake
- Each has a PixelLab icon (generate during M11)

### Endless HUD Additions
- Wave counter shows `ENDLESS WAVE N` (existing) + tier indicator `[A/B/C]` and difficulty `LAP N`
- Small persistent "personal best wave" shown top-right during endless
- On new personal-best wave: brief gold flash + `newHighScore` SoundFX

### Endless High Score
- Current `'space-shooter-endless-hiscore'` tracks score — also add `'space-shooter-endless-best-wave'` for the wave reached
- Both shown on Game Over screen in endless mode

### Implementation Notes
- `this.endlessTier` = `'A'|'B'|'C'`, computed from wave number within the cycle
- `this.endlessDifficulty` = lap count (0-indexed), increments every 21 waves
- `_generateEndlessWave(n)` receives the wave and derives tier + difficulty from it
- `_showEndlessBoss(rel)` extended to support the full rotation table above
- Existing `_startEndless()` call sets initial atmosphere; tier transitions happen inside `_updateWave()`

---

## Milestone 12 — Prism Dimension (Stage 5)

**Goal:** A fifth and final campaign stage that begins immediately after the Leviathan dies. Pure visual spectacle — chromatic, prismatic, dreamlike. A victory lap for skilled players.

### Stage 5 Transition
- Leviathan death sequence ends → `this.prismMode = true` → `_startPrismDimension()` fires automatically
- Stage 5 begins → background cycles through `PRISM_BG_COLS` (7 dark rainbow colors, every 700 ms)
- Announcement text: "STAGE 5 / PRISM DIMENSION" in `#ff88ff`
- `stage3Music` continues; `prismOverlordPhase` SFX fires on entry

### Stage 5 Enemies
All existing enemies appear with colorful chromatic tints. New enemy:

**Chromatic Mimic** (new type `'mimic'`)
- Copies the last weapon type the player fired: if player fires spread, mimic shoots 3-bolt spread back; if rapid, fires rapid single bolts
- 4 HP, worth +350 pts
- Asset: PixelLab generated mimic sprite (`mimic2-idle` / `mimic2-move` animations)

### Stage 5 Boss — The Prism Overlord (Boss 6, Final Boss)
- Procedurally drawn spinning hexagon (rainbow color-cycling via `_updatePrismOverlord`)
- **120 HP** (scaled by `bossHpMult`); 3 phases
- Phase 1: Fan of 3 rainbow bolts aimed at player
- Phase 2 (Chromatic Surge): 5-bolt fan + shard ring bursts
- Phase 3 (Prism Fury): Faster fire, wider spreads, more shards; bolt deflect 35% on Hard
- Death: rainbow explosion chain (20 bursts) → `FinalCreditsScene` ("STAGE 5: PRISM DIMENSION CONQUERED" scrolling credits)

---

## Milestone 13 — Grand Finale: Polish & Publish-Ready

**Goal:** Make the game feel complete and presentable to players encountering it for the first time. Fix rough edges, add volume controls, surface an in-game guide, restore the originally specced Chromatic Mimic weapon-copy behavior, deliver the scrolling `FinalCreditsScene` originally promised in M12, and add a Run Stats Recap that rewards self-improvement and gives every run a satisfying debrief.

This is the last milestone. After M13 the game is ready to ship to GitHub Pages, itch.io, or any web game platform.

---

### 1. Pause Menu Overhaul

Currently `P` pauses the game but shows no UI. Replace with a styled overlay:

- **Overlay**: dark `Graphics` rect covering full screen (alpha 0.78), `"PAUSED"` title (28 px, gold `#ffee00`)
- **Four options** (up/down arrows navigate, Space/Enter confirms):

| Option | Action |
|---|---|
| RESUME | Close overlay, unpause |
| HOW TO PLAY | Open How to Play overlay (§3) |
| SETTINGS | Open Settings overlay (§2) |
| QUIT TO MENU | Fade black → `scene.start('MenuScene')` |

- ESC always acts as RESUME
- `this.pauseMenuSel` = 0–3; `this.pauseMenuOpen` boolean
- All `update()` logic already gated on `this.paused` — only overlay navigation runs while paused
- `menuNavigate` SoundFX on each option change; `menuConfirm` SoundFX on confirm
- Overlay destroyed (not hidden) when closed so it doesn't accumulate if paused multiple times

---

### 2. Settings Screen

Accessible from the Pause Menu **and** from `MenuScene` (press `S` on the main menu).

**Layout** (full-screen overlay, dark bg `0x000011` at alpha 0.92):

```
  SETTINGS
  ─────────────────────
  MUSIC VOLUME    ◀  70  ▶
  SFX   VOLUME    ◀  80  ▶
  ─────────────────────
         [ BACK ]
```

- Volume values: 0–100, step 10. Left/Right arrows adjust the focused row; Up/Down moves between rows.
- **Music volume** maps to `masterGain.gain.value = (musicVol / 100) * 0.18` (current master ceiling is 0.18). Applied immediately on change so the player hears the result.
- **SFX volume** exposed as `this.sfxVol` (0.0–1.0). All `SoundFX` methods multiply their oscillator's `gain.gain.value` by `this.sfxVol`.
- Both values saved to localStorage: `'space-shooter-music-vol'` and `'space-shooter-sfx-vol'`. Loaded in both `GameScene.create()` and `MenuScene.create()` (MenuScene has its own music).
- `settingsChange` SoundFX fires on each value step (a short soft blip so the player hears the volume change live).
- BACK or ESC closes the overlay and returns to the caller (pause menu or main menu).

---

### 3. How to Play Screen

Accessible from the Pause Menu and from `MenuScene` (press `H`). A two-page in-game guide rendered as a full-screen overlay.

**Page 1 — Controls & Basics:**

```
  HOW  TO  PLAY        [ 1 / 2 ]
  ─────────────────────────────────
  WASD / ARROWS        Move ship
  SPACE                Fire bolts
  E                    Plasma Shield
  P                    Pause
  ─────────────────────────────────
  Lose a ♥ on any hit or collision
  Plasma Shield deflects enemy bolts
  Max 5 lives, max 2 shield charges
  ─────────────────────────────────
  →  Next page                 ESC  Close
```

**Page 2 — Power-Ups & Tips:**

```
  HOW  TO  PLAY        [ 2 / 2 ]
  ─────────────────────────────────
  [S]  Spread Shot     3-way fan
  [T]  Twin Bolt       dual parallel
  [R]  Rapid Fire      fast single
  Weapons time out or reset on hit
  ─────────────────────────────────
  COMBO  ×2 / ×3 / ×4
  Reach ×4 → RAINBOW MODE (×1.5 score)
  Shoot crystals between waves for rewards
  ─────────────────────────────────
  ←  Prev page                 ESC  Close
```

- Left/Right arrows flip pages; ESC closes and returns to caller
- `this.howToPlayPage` (0 or 1); `menuNavigate` SoundFX on page flip
- Pure text — no new assets required

---

### 4. Run Stats Recap

Track lightweight counters throughout the run. Show a stats panel on every end screen (Game Over, VictoryScene, TrueEndingScene, FinalCreditsScene).

**New state vars added in `GameScene.create()`:**

```js
this.runStartTime      = Date.now();   // wall-clock ms at run start
this.totalKills        = 0;            // every enemy killed (any type)
this.totalShotsFired   = 0;            // every player bolt spawned
this.totalShotsHit     = 0;           // bolts that hit an enemy or boss
this.highestCombo      = 1;            // peak comboMult reached
this.powerupsCollected = 0;            // weapon + health + shield + endless drops
```

**Where to increment:**

| Counter | Location |
|---|---|
| `totalKills` | `_collide()` — on any enemy death, before `destroy()` |
| `totalShotsFired` | `_fireBolt()` — each call, once per bolt spawned |
| `totalShotsHit` | `_collide()` — any bolt-hits-enemy or bolt-hits-boss branch, before bolt `destroy()` |
| `highestCombo` | `_incrementCombo()` — `if (this.comboMult > this.highestCombo) this.highestCombo = this.comboMult;` |
| `powerupsCollected` | weapon pickup, health crystal, shield drop, endless drop — each collect path |

**`_buildStats()` helper (new method):**

```js
_buildStats() {
    const ms  = Date.now() - this.runStartTime;
    const min = Math.floor(ms / 60000);
    const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const acc = this.totalShotsFired > 0
        ? Math.round(this.totalShotsHit / this.totalShotsFired * 100) : 0;
    return { kills: this.totalKills, accuracy: acc, combo: this.highestCombo,
             time: `${min}:${sec}`, pickups: this.powerupsCollected };
}
```

**Stats panel layout** (shown below score on every end screen):

```
  ─────────────────────
  KILLS        142
  ACCURACY      73%
  BEST COMBO    ×4
  TIME          4:32
  PICKUPS       18
  ─────────────────────
```

- Stats passed to each end scene via `scene.start('XxxScene', { ..., stats: this._buildStats() })`
- Each end scene reads `data.stats` and renders the panel with small monospace text (13 px, `#aaaaaa`) below the existing score block
- If `data.stats` is missing (e.g. old code path), the panel simply doesn't render — no crash

---

### 5. FinalCreditsScene Overhaul (Scrolling Credits)

The current `FinalCreditsScene` shows static text. Replace with the scrolling credits originally promised in the M12 spec.

**Keep from current implementation:**
- Rainbow cycling background rectangle
- Dark overlay (alpha 0.65)
- Plays `prismOverlordPhase` SFX on load
- Any-key → MenuScene

**Add:**

- **Parallax star field**: 60 small white `Graphics` dots at random positions, each drifting upward at 18–45 px/s (randomised per star), wrapping to bottom when off the top edge — updated in the scene's `update()`.
- **Scrolling credit block**: a vertical stack of `Text` objects (or one long text) starting at `y = H + 30`, scrolled upward at **52 px/s** via `update()` (`textGroup.y -= 52 * dt`). Stops scrolling when bottom of text reaches `y = 80`.

**Credit text content:**

```
  ✦  STAGE  5:  PRISM  DIMENSION  CONQUERED  ✦

  FINAL  SCORE
  [score]     [difficulty label]

  ─────────────────────────────────
  RUN  STATS
  KILLS       [n]
  ACCURACY    [n]%
  BEST COMBO  ×[n]
  TIME        [m:ss]
  PICKUPS     [n]
  ─────────────────────────────────

  CREATED  WITH

  ENGINE
  Phaser 3.60

  SOUND
  Web Audio API — fully synthesized

  ART  ASSETS
  Warped Tilesets & Characters
  Gothicvania Pack
  PixelLab AI Pixel Art

  MUSIC
  D minor · 140–182 BPM
  Procedurally generated

  ─────────────────────────────────
  THANK  YOU  FOR  PLAYING
  ✦  ✦  ✦
```

- **Any-key listener** activates only after scrolling completes **or** 5 s have elapsed — prevents accidental skip at scene start
- After listener activates: `"Press any key to continue"` prompt fades in at center (same as before)
- Stats data received from `GameScene` via `scene.start('FinalCreditsScene', { score, difficulty, stats })`

---

### 6. Chromatic Mimic Weapon Copy

The M12 implementation fires a fixed 3-way spread from all Mimics. Restore the originally specced behavior: the Mimic mirrors the player's most recently fired weapon pattern.

**Track player's last weapon in `GameScene`:**

```js
this.lastWeaponType = 'normal';   // 'normal' | 'spread' | 'twin' | 'rapid'
```

In `_fireBolt()`, update `this.lastWeaponType` in each weapon branch (before firing).

**Updated `_fireMimicSpread(mx, my, colorIdx)` behavior:**

| `this.lastWeaponType` | Mimic fires |
|---|---|
| `'spread'` | 3-bolt fan at ±28° downward (current behavior) |
| `'twin'` | 2 parallel bolts 14 px apart, straight down |
| `'rapid'` | 1 fast bolt (vy 360 px/s) aimed at player's current X |
| `'normal'` | 1 standard bolt aimed at player's current X |

- Colors still set via `colorIdx` (RAINBOW_COLORS)
- Fire interval unchanged: 2200 ms / `enemyFireMult`
- This makes the Mimic dynamically threatening — a player spamming spread shot suddenly faces a spread barrage back

---

### 7. MenuScene Polish

Small but visible touches that improve the first impression:

- **Drifting ship silhouette**: player ship sprite (alpha 0.07, tint `0x3366ff`, scale 0.25) added to the menu background. Tweened from `{ x: -40, y: H + 40 }` to `{ x: W + 40, y: -40 }` over 13 000 ms with `Phaser.Math.Easing.Linear`, repeat -1. Purely decorative.
- **Title scale pulse**: `"SPACE  SHOOTER"` title gets a looping tween `{ scaleX: 1.0 → 1.014 → 1.0, scaleY: 1.0 → 1.014 → 1.0 }`, duration 2800 ms, `Sine.easeInOut`, `yoyo: true, repeat: -1`. Subtle — should not draw attention away from menu options.
- **H key hint**: below the existing controls hint, add `H  —  How  to  Play` in small gray text.
- **S key hint**: add `S  —  Settings` alongside the H hint.
- **Version tag**: `v1.0` at bottom-right (`x: W - 8, y: H - 8`, origin `1, 1`), 10 px, `#333333`.
- `H` key: launches How to Play overlay (page 1) from MenuScene.
- `S` key: launches Settings overlay from MenuScene.

---

### 8. Publish Checklist

**`index.html` additions** (in `<head>`):**

```html
<title>Prism Space Shooter</title>
<meta name="description" content="A retro vertical space shooter — 5 stages, 6 bosses, endless survival mode. Built with Phaser 3.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta charset="UTF-8">
```

No favicon needed for initial publish — browsers show a blank tab icon gracefully.

**`README.md`** (new file at project root):

```markdown
# Prism Space Shooter

A retro vertical space shooter built with Phaser 3 and pure Web Audio API synthesis.

## Features
- 5 campaign stages + endless survival mode
- Endless survival mode with 3-tier difficulty cycle
- 6 boss encounters, chromatic combo system, crystal events
- Fully synthesized sound — no audio files

## Controls
| Key | Action |
|---|---|
| WASD / Arrows | Move |
| Space | Fire |
| E | Plasma Shield |
| P | Pause |
| H | How to Play |

## Run Locally
```
python -m http.server 8000
```
Then open `http://localhost:8000`.

## Built With
- [Phaser 3.60](https://phaser.io/)
- Web Audio API (all sound synthesized)
- Warped Tilesets & Characters
- Gothicvania Pack
- [PixelLab](https://pixellab.ai/) (AI pixel art)
```

---

### New SoundFX Methods

| Method | Trigger |
|---|---|
| `menuNavigate` | Arrow key changes selection in any overlay |
| `menuConfirm` | Space/Enter confirms an option |
| `settingsChange` | Volume value steps up or down |
| `pauseOpen` | P key opens the pause menu |

---

### Implementation Notes

- Pause overlay and How to Play overlay can be built as helper methods `_openPauseMenu()` / `_closePauseMenu()` / `_openHowToPlay()` / `_openSettings()` that create and destroy `Graphics` + `Text` objects on demand — no separate Phaser scenes needed. Keep all overlay state in `this.overlayGroup` (a `Phaser.GameObjects.Group`) that is destroyed on close.
- Settings values should be read once in `create()` and stored as `this.musicVol` / `this.sfxVol` — never read directly from localStorage in `update()`.
- The mimic weapon-copy change is backward compatible: if `this.lastWeaponType` is not set for some reason, default to `'normal'`.
- Run stats passed to `VictoryScene` / `TrueEndingScene` require those scenes to read `data.stats` and render the panel — both scenes currently receive `data` objects, so the pattern is consistent.
- `FinalCreditsScene` scrolling: use the scene's `update(time, delta)` method to move `creditsGroup.y -= 52 * (delta / 1000)` each frame. Check `creditsGroup.y + creditsGroup.getBounds().height < 80` to detect scroll completion.

---

## Post-M13 Polish (2026-06-18)

Applied after all milestones were complete. No new milestone — publish-quality polish only.

### Gameplay Features

| Feature | Description |
|---|---|
| **FLAWLESS bonus** | If the player takes no hits during a wave, award +500 pts and show "FLAWLESS" popup |
| **Biped retreat** | Biped backs away at 55 px/s when player is within 80 px vertically |
| **Scarab/Prism cluster death** | Prism enemy death fires a 10-bolt cross pattern (two 5-bolt fans offset 22°) instead of the original 3-shard arc |
| **Carrier shield arc** | Animated arc Graphics drawn on each carrier's front each frame — pulses alpha with a sin wave; disappears when shield is down |
| **Boss pre-death stagger** | All three bosses flash/stagger (7 alpha tweens, 500 ms) when reduced to 1 HP before the kill shot lands |
| **Phase-death shake variation** | Leviathan phase 2 uses a gentler shake (0.018, 800 ms) and delayed boom; phase 3 uses heavy shake (0.030, 1400 ms) with 400 ms boom delay |
| **Bullet trails** | Each player bolt spawns a short trail Graphics object (80 ms tween, fades out) in the bolt's tint color |
| **Score milestone popups** | Every 1 000-point milestone shows a floating "+BONUS" popup and plays `milestone` SFX |
| **Per-difficulty personal bests** | Separate localStorage keys: `space-shooter-hiscore-easy/normal/hard`; menu shows `Math.max` of all three |
| **Combo SFX pitch ladder** | `comboUp(mult)` plays a higher-pitched arpeggio at ×3 and ×4 tiers |
| **Ambient void drone** | A 48 Hz sine oscillator fades in when Stage 4 / Prism content begins; stops on player death |
| **FLAWLESS SFX** | 4-note ascending fanfare on flawless wave completion |

### UX / Polish

| Feature | Description |
|---|---|
| **Pause scanlines** | Dark scanline overlay added to pause menu background |
| **H key during gameplay** | Opens the How to Play guide directly from gameplay (same as pause → HOW TO PLAY) |
| **Pause freezes hazards** | `time.timeScale = 0` + `tweens.timeScale = 0` on pause; restored to 1 on resume — ion storm, meteor, black hole timers all freeze |
| **Stage 5 is a campaign stage** | Prism Dimension is now Stage 5 of the campaign — reached automatically after the Leviathan dies. `PRISM_WAVES` drives waves 21–25. No separate menu unlock or Hard requirement. |
| **TrueEndingScene 2-option layout** | Only `[MENU]` and `[ENDLESS]` — Stage 5 is part of the campaign, not a post-credits unlock. |

### Bug Fixes

| Bug | Fix |
|---|---|
| **Wave 8 Gunship freeze** | Stagger guard changed from `<= time` to `=== 0` — prevents infinite stagger re-trigger loop |
| **First boss crash** | `_collide()` now receives `time` as a parameter; called as `this._collide(time)` from `update()` |
| **Audio crash at later waves** | All Web Audio nodes (OscillatorNode, GainNode, BiquadFilter, AudioBufferSourceNode) now call `disconnect()` via `setTimeout` after their scheduled play time ends. Previously they accumulated indefinitely, exhausting Chrome's ~16 384 node limit after ~8 minutes and crashing all audio. Fix applied to `SoundFX._tone()`, `SoundFX._noise()`, and every music class method (`_n`, `_hat`, `_kick`, `_pad`, `_noise`) |
| **Void drone leak on restart** | `stopVoidDrone` added to `events.once('shutdown')`, R (restart) and M (menu) key handlers |

---

## Complete Asset Index

All paths relative to `C:\Users\Przemo\Desktop\LEARN CLAUDE\1sza-gra\`

### Backgrounds
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/space_background_pack/Blue Version/layered/blue-with-stars.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/space_background_pack/Blue Version/layered/blue-stars.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/space_background_pack/Blue Version/layered/prop-planet-big.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/space_background_pack/Blue Version/layered/prop-planet-small.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/top-down-space-environment/PNG/layers/stage-back.png`

### Player
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/Warped Vehicles Files/vehicle 3/Sprites/vehicle-3.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/Warped Vehicles Files/vehicle 3/Sprites/frames-thrust/thrust-bottom/thrust-bottom1.png` … `thrust-bottom3.png`

### Enemies
- `Legacy Collection/Legacy Collection/Assets/Gothicvania/Characters/flying-eye-demon/Sprites/` (flying-eye-demon1–8.png)
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/top-down-shooter-enemies/sprites/enemy-01/` (_0000_Layer-1.png … _0004_5.png)
- `Legacy Collection/Legacy Collection/Assets/Gothicvania/Misc/EnemyProjectile/Sprites/frame1.png`, `frame2.png`
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/alien-flying-enemy/sprites/alien-enemy-flying1–8.png` *(Stage 3: Alien Swarm)*
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/spaceship-unit/Spritesheets/separated sprites/spaceship-unit.png` *(preloaded, reserved)*
- **PixelLab-generated** `assets/boss-void-wraith-frame0–8.png` *(Stage 3: Void Wraith mid-boss, key `bvw`)*
- **PixelLab-generated** `assets/boss-space-demon-frame0–8.png` *(Stage 3: The Leviathan final boss, key `bsd`)*

### Boss
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/top-down-boss/PNG/sprites/boss/` (5 layer PNGs)
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/top-down-boss/PNG/sprites/rays/` (11 layer PNGs)
- `Legacy Collection/Legacy Collection/Assets/Warped/Characters/top-down-boss/PNG/sprites/bolt/` (2 layer PNGs)

### Player FX
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Warped shooting fx/Bolt/sprites/` (bolt1–4.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Warped shooting fx/hits/hits-1/sprites/` (hits-1-1–5.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Warped shooting fx/hits/Hits-2/sprites/` (hits-2-1–7.png)

### Explosions / Death FX
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/EnemyDeath/Sprites/` (enemy-death1–8.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-a/Sprites/` (explosion-1–8.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-b/Sprites/` (explosion-1-b-1–8.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-c/Sprites/` (explosion-c1–10.png)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-d/Sprites/` (explosion-d1–12.png, boss death)
- `Legacy Collection/Legacy Collection/Assets/Explosions and Magic/Explosions pack/explosion-1-f/Sprites/` (explosion-f1–8.png, boss death)

### Hazards
- `Legacy Collection/Legacy Collection/Assets/Warped/Environments/top-down-space-environment/PNG/layers/cut-out-sprites/asteroid-01.png` … `asteroid-05.png`
- `assets/blackhole.png` (custom generated asset)
