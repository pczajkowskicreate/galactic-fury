# Galactic Fury — Game Design Reference

## Table of Contents
1. [Game Modes](#game-modes)
2. [Difficulty Settings](#difficulty-settings)
3. [Player & Controls](#player--controls)
4. [Enemy Types](#enemy-types)
5. [Campaign Stages & Waves](#campaign-stages--waves)
6. [Bosses](#bosses)
7. [Hazards](#hazards)
8. [Endless Mode](#endless-mode)
9. [Stage 5: Prism Dimension](#stage-5-prism-dimension)
10. [Power-ups & Pickups](#power-ups--pickups)
11. [Systems](#systems)
12. [Code Locations — Quick Edit Guide](#code-locations--quick-edit-guide)

---

## Game Modes

| Mode | Key | Description |
|------|-----|-------------|
| Campaign | SPACE | 5 stages, 25 waves total — Stage 4 ends with The Leviathan (boss 5), Stage 5 is the Prism Dimension ending with the Prism Overlord (boss 6) |
| Endless | E | Repeating tier loop after campaign waves, scales with each lap |

---

## Difficulty Settings

Set on the main menu with arrow keys. Applies to all modes.

| Setting | Easy | Normal | Hard |
|---------|------|--------|------|
| Starting lives | 5 | 3 | 2 |
| Enemy speed | ×0.75 | ×1.0 | ×1.20 |
| Enemy fire rate | ×0.70 | ×1.0 | ×1.25 |
| Shield drop rate | ×1.50 | ×1.0 | ×0.50 |
| Score multiplier | ×1.0 | ×1.0 | ×1.5 |
| Boss HP | ×0.85 | ×1.25 | ×1.60 |
| Boss bolt deflect | Leviathan only | Leviathan only | All bosses |

---

## Player & Controls

| Action | Key |
|--------|-----|
| Move | WASD / Arrow keys |
| Fire | SPACE |
| Plasma Shield | E |
| Pause | P / ESC |
| How to Play / Bestiary | H (works during gameplay AND from pause menu) |

**Ship**: `pship3` (64×64 PixelLab sprite, customizable color).
**Lives**: Max 5. Hit by anything = −1 life.
**Shield**: Max 2 charges in reserve. Deflects enemy bolts and boss projectiles. Does NOT block black holes.

---

## Enemy Types

### Standard Enemies

| Name | Internal type | HP | Behavior | Asset |
|------|---------------|----|----------|-------|
| Flying Eye | `eye` | 1 | Drifts straight down, no shooting | `enemy-fly` anim (Gothicvania) |
| Biped | `biped` | 3 | Sine-wave drift, fires aimed bolts; **retreats 55 px/s** when player is within 80 px vertically | `biped-walk` anim (Warped e01) |
| Scarab Bomber | `scarab` | 4 | Drops timed bomb; on death: 5-bolt fan burst | `scarab-m*` PixelLab frames |
| Spectrum Worm | `worm` | 5 | Slow & tanky; fires 3-way spread shot | `worm-m*` PixelLab frames |
| Demon Hornet | `hornet` | 2 | Swoops diagonally; fires glowing sting | `hornet-m*` PixelLab frames |
| Kamikaze Drone | `drone` | 1 | Kamikaze — dives straight at player | `drone-fly` anim (Warped e02) |
| Shield Carrier | `carrier` | 5 | Zigzags; fires twin bolt volleys; front arc deflects player bolts; drops shield pickup on death | `carrier-move` anim (Warped e03) |
| Swarm Alien | `swarm` | 1 | Tiny fast kamikaze spawned in groups of 4; sine-wave drift | `alien-fly` anim (Warped) |
| Prism Entity | `prism` | 2 | On death fires **5 RGB shards** outward at fixed angles | `prism-enemy-anim` (PixelLab) |
| Void Leech | `vleech` | 2–3 | Bonus encounter; orbits the player area then strikes; drops ♥ or shield on death | `vleech-m*` PixelLab frames |
| Mimic | `mimic` | 4 | Diamond-shaped, copies the player's current weapon type and fires it back; on death fires **5 RGB shards** | Drawn procedurally with `_drawMimicShape` |

### Prism Shards
Spawned by Prism Entity and Mimic on death — 5 shards per kill.
- **HP**: 3 hits to destroy (each hit dims alpha as feedback)
- **Score**: +25 pts on final hit
- **Movement**: outward burst at 320 px/s, despawn after 3 seconds
- **Pierce chance**: 35% — shard continues through an enemy after damaging it
- **Kill enemies**: shards deal 1 HP damage to any enemy they pass through

**To add a new enemy type:**
1. Add a spawn function `_spawnXxx()` following the pattern in `game.js` (~line 2119).
2. Push a new type string in `_startWave()` queue builder (~line 1980).
3. Add it to the `_updateWave` dispatch (~line 2024).
4. Handle hit scoring in `_collide()`.

---

## Campaign Stages & Waves

Wave data lives in the `WAVES` array at the top of `game.js` (lines 9–34). 20 campaign waves (Stages 1–4), followed by 5 Stage 5 waves in `PRISM_WAVES` (lines 42–48).
Each entry: `{ eyes, bipeds, drones, shields, swarms, prisms, scarabs, worms, hornets, interval }`.
`interval` = ms between enemy spawns (lower = faster).

### Stage 1 — Waves 1–5
No drones, no weapon drops. Intro difficulty ramp.

| Wave | Eyes | Bipeds | Interval |
|------|------|--------|----------|
| 1 | 5 | 0 | 1400ms |
| 2 | 7 | 0 | 1200ms |
| 3 | 4 | 3 | 1100ms |
| 4 | 3 | 5 | 1000ms |
| 5 | 5 | 5 | 850ms |

→ After wave 5 clears: **Stage 1 Boss** (`BOSS_WAVE = 5`).

---

### Stage 2 — Waves 6–10
Post-boss. Drones, shields, and prism enemies introduced. Weapon drops enabled.

| Wave | Eyes | Bipeds | Drones | Shields | Prisms | Interval |
|------|------|--------|--------|---------|--------|----------|
| 6 | 4 | 4 | 3 | 0 | 0 | 900ms |
| 7 | 3 | 5 | 4 | 1 | 1 | 820ms |
| 8 | 2 | 4 | 4 | 2 | 1 | 740ms |
| 9 | 3 | 6 | 5 | 2 | 2 | 680ms |
| 10 | 4 | 6 | 6 | 3 | 2 | 600ms |

**Hazard triggers:**
- After wave 7 → **Meteor Shower** → then wave 8
- After wave 8 → **Gunship Mid-Boss**
- After wave 9 → **Meteor Shower** → then wave 10
- After wave 10 → **Stage 2 Final Boss**

---

### Stage 3 — Waves 11–15 (Void Run)
Void atmosphere. Drones and swarms alternate — never both in the same wave. Stage 3 music plays.
First wave is `STAGE3_WAVE = 11`. `swarms: N` = N groups of 4 aliens each.

| Wave | Eyes | Bipeds | Drones | Swarms | Shields | Prisms | Scarabs | Worms | Interval |
|------|------|--------|--------|--------|---------|--------|---------|-------|----------|
| 11 | 3 | 1 | 4 | — | 4 | 2 | 3 | — | 520ms |
| 12 | — | — | — | 2 | 5 | 3 | 3 | 3 | 480ms |
| 13 | 2 | 2 | 4 | — | 4 | 3 | — | 3 | 440ms |
| 14 | — | — | — | 2 | 5 | 4 | 2 | 3 | 400ms |
| 15 | 3 | 1 | 4 | — | 4 | 3 | — | 3 | 360ms |

**Hazard triggers:**
- After wave 12 → **Ion Storm** → then wave 13
- After wave 13 → **Void Cruiser Mid-Boss** → then wave 14
- After wave 14 → **Ion Storm** → then wave 15
- After wave 15 → `_beginStage4()` → transitions to Stage 4

---

### Stage 4 — Waves 16–20 (Deep Void)
Hornets introduced. Worms continue. Drones/swarms alternate. Intense pace.
First wave is `STAGE4_WAVE = 16`. `swarms: N` = N groups of 4 aliens each.

| Wave | Eyes | Bipeds | Drones | Swarms | Shields | Prisms | Hornets | Worms | Interval |
|------|------|--------|--------|--------|---------|--------|---------|-------|----------|
| 16 | — | — | — | 2 | 4 | 4 | 4 | 2 | 380ms |
| 17 | 2 | 2 | 4 | — | 3 | 3 | 3 | 2 | 340ms |
| 18 | — | — | — | 2 | 5 | 4 | 5 | 3 | 320ms |
| 19 | 3 | 2 | 4 | — | 4 | 4 | 4 | 3 | 300ms |
| 20 | — | — | — | 2 | 5 | 5 | 5 | 3 | 280ms |

**Hazard triggers:**
- After wave 17 → **Gravity Storm** → then wave 18
- After wave 19 → **Gravity Storm** → then wave 20

→ After wave 20 clears: **The Leviathan (Final Boss)**

**To add a new campaign wave:** extend the `WAVES` array, adjust `STAGE3_WAVE` / `STAGE4_WAVE` if needed, and add any hazard triggers in `_updateWave()` (~line 2049).

---

## Bosses

### Stage 1 Boss — Top-Down Mech
- **HP**: 30 × `bossHpMult`
- **Sprite**: `td-boss` anim (Warped top-down-boss)
- **Phases**: 3 (at 67% and 33% HP)
  - Phase 1: Spread shot (5 bolts, ±35°), slow horizontal bounce
  - Phase 2: Sweep beam (oscillating angle), faster bounce (95 px/s)
  - Phase 3: Dense spread (7 bolts) + sweep beam combined, fastest bounce (140 px/s)
- **Bolt deflect**: 25% chance per hit — **Hard mode only**
- **On death** → transitions to Stage 2

---

### Stage 2 Final Boss — Interceptor
- Same as Stage 1 Boss but with `isStage2Boss = true`
- **HP**: 35 × `bossHpMult`
- **Extra attack in Phase 3**: Fires homing fireballs every 4 seconds
- Faster fire rates and bounce speeds throughout
- **Bolt deflect**: 25% chance per hit — **Hard mode only**
- **On death** → transitions to Stage 3

---

### Gunship Mid-Boss (Stage 2, between waves 8–9)
- **HP**: 20 × `bossHpMult`
- **Sprite**: `vehicle1-anim` (Warped Vehicle 1)
- **Phases**: 3 (at 65% and 30% HP)
- **Attacks**: Spread bursts, ring fire, targeted shots
- **Bolt deflect**: 25% chance per hit — **Hard mode only**
- **On death** → wave 9 starts

---

### Void Cruiser Mid-Boss (Stage 3, between waves 13–14)
- **HP**: 35 × `bossHpMult`
- **Sprite**: Procedural graphics (mech-like)
- **Attacks**: Ion orb blasts, diagonal shot pairs, rotating beam sweep
- **Bolt deflect**: 25% chance per hit — **Hard mode only**
- **On death** → wave 14 starts

---

### The Leviathan — Final Boss (Campaign)
- **HP**: 90 (scales with `bossHpMult`)
- **Sprite**: `bsd` / `levHover` / `levAtk` / `levPhase` / `levRage` anims (PixelLab)
- **Phases**: 3 — transitions at 66% and 33% HP
  - Phase 1: Spiral projectile rings, aimed bolts, slow movement
  - Phase 2: Adds phantom drone waves, faster attacks; **Dark Shield** activates 6s after phase start
  - Phase 3: Adds homing fireballs every ~8s, **void pulse** rings, Dark Shield activates 4s after phase start
- **Void Pulse**: 3 concentric Graphics rings (capped at 130px radius) expand outward from boss position. Hitting any ring deals damage.
- **Bolt deflect**: 25% chance per body hit — **all difficulties** (Leviathan is the only boss that deflects in Easy/Normal)
- **Dark Shield** (Phase 2+): Boss briefly deflects ALL player bolts back as enemy projectiles.
  - Phase 2: lasts 3 seconds, cooldown 13s after expiry
  - Phase 3: lasts 4 seconds, cooldown 9s after expiry
  - Visual: thin pulsing purple ring (~68px radius) around boss while active
  - Deflect radius: 95px (outside body hitbox). Intercepted bolt is removed from `bolts` and re-added to `enemyBolts`.
  - Activation: flash + camera shake + "DARK SHIELD" warning text + spark burst
- **On death** → transitions to Stage 5: Prism Dimension

---

### Prism Overlord — Stage 5 Final Boss (Boss 6)
- **HP**: 120 × `bossHpMult`
- **Sprite**: Procedurally drawn spinning hexagon (rainbow color-cycling)
- **Phases**: 3 (at 65% and 30% HP)
  - Phase 1: Fan of 3 rainbow bolts aimed at player
  - Phase 2 (Chromatic Surge): 5-bolt fan + shard ring bursts
  - Phase 3 (Prism Fury): Faster fire, wider spreads, more shards
- **Bolt deflect**: 35% chance per hit — **Hard mode only**
- **On death** → `FinalCreditsScene` ("STAGE 5: PRISM DIMENSION CONQUERED" scrolling credits). Cannot be dismissed for the first 5 seconds — prevents accidental skip from the killing shot.

---

## Hazards

Hazards block asteroid spawning and regular black hole spawning while active.

### Black Holes (Passive, all stages)
- Spawn randomly between waves (~45% chance per check window of 9–18s)
- In Stage 3: spawn as clusters of 2–3 smaller black holes
- **Gravity**: Pulls player bullets into absorb radius; pulls player ship gently
- **Rainbow Mode exception**: Bolts can destroy black holes instead of being absorbed
- **HP**: 10 (normal) / 5 (Stage 3 cluster) — only destroyable in Rainbow Mode
- **Config**: `_doSpawnBlackhole()` / `_doSpawnBHCluster()` in `game.js`

### Meteor Shower (Stage 2 hazard)
- Triggered: after wave 7, after wave 9
- Asteroids rain down for ~15s, then next wave starts
- Asteroids have varying HP and sizes (variants 1–5)
- **Config**: `_beginMeteorShower()` in `game.js`

### Ion Storm (Stage 3 hazard)
- Triggered: between waves 12–13, 14–15
- Ion bolts rain from above; special music plays
- **Config**: `_beginIonStorm()` in `game.js`

### Gravity Storm / Black Hole Shower (Stage 4 + Endless)
- **Campaign**: triggered between waves 17–18 and 19–20 (Stage 4)
- **Endless**: also triggers at Tier A wave 5
- Large black holes spawn over ~14s, much stronger gravity (G = 520 000 vs normal 300 000)
- Black holes are bigger (scale 1.5 vs 1.2) and slower (35–55 px/s vs 50–80 px/s) — more pull time
- Player gravity pull multiplied ×2 during shower
- Announce text: "◉ GRAVITY STORM"
- **Config**: `_beginBlackholeShower()` / `_doSpawnShowerBlackhole()` in `game.js`

**To add a new hazard:**
1. Write `_beginMyHazard(onComplete)` — call `onComplete()` when done.
2. Add a trigger condition in `_updateWave()` with `this.time.delayedCall(2200, () => this._beginMyHazard(() => this._startWave(n)))`.
3. Guard asteroid/BH spawning with a flag if needed (see `this.meteorActive` / `this.bhShowerActive` pattern).

---

## Endless Mode

Triggered from menu with **E**. Plays through all 20 campaign waves first (including The Leviathan), then enters the endless loop.

### Tier Structure
Each "lap" = 21 waves: **Tier A** (7 waves) → **Tier B** (7 waves) → **Tier C** (7 waves) → repeat.
Difficulty scales each lap (`endlessDifficulty` / `lap` variable, 0-indexed).

### Tier A — Normal Space
- **Enemies**: Eyes, Bipeds, Drones
- **Scaling**: `eyes = min(3 + lap×2, 9)`, `bipeds = min(2 + lap×2, 8)`, `drones = min(2 + lap, 6)`
- **Interval**: `max(550 − lap×30, 220)ms`
- **Hazard at wave 5**: Gravity Storm (Black Hole Shower)
- **End-of-tier boss** (wave 7):
  - Lap 0–1: Top-Down Mech (HP scales with lap)
  - Lap 2+: Stage 2 Final Boss (Interceptor)

### Tier B — Crimson/Void
- **Enemies**: Bipeds, Drones, Shields, Prisms, Mimics (from lap 1)
- **Scaling**: no eyes; bipeds/drones/shields/prisms scale with lap
- **Interval**: `max(500 − lap×30, 190)ms`
- **Hazard at wave 3**: Meteor Shower
- **End-of-tier boss**:
  - Lap 0: Gunship Mid-Boss
  - Lap 1+: Void Cruiser

### Tier C — Deep Void (Stage 3 atmosphere)
- **Enemies**: Drones, Shields, Swarms, Prisms, Mimics
- **Scaling**: no eyes or bipeds; all others scale with lap
- **Interval**: `max(450 − lap×30, 160)ms`
- **Hazards at waves 3 and 6**: Ion Storms
- **End-of-tier boss**:
  - Lap 0: Stage 2 Final Boss
  - Lap 1–2: The Leviathan
  - Lap 3+: Prism Overlord

### Endless-Only Power-ups
| Power-up | Effect |
|----------|--------|
| Overcharge | All 3 weapons active for 6s |
| Ghost | 3s invincibility |
| Nova | Clears all enemies on screen, +50 pts each |

---

## Stage 5: Prism Dimension — Waves 21–25

Stage 5 begins after the Leviathan dies and a **Void Leech bonus encounter** plays (same as after the Stage 2 Final Boss). The `PRISM_WAVES` array (lines 42–48) drives 5 campaign waves before the Prism Overlord final boss.
`swarms: N` = N groups of 4 aliens each. Background cycles through 7 dark rainbow colors (`PRISM_BG_COLS`). 40% chance of Crystal Event between waves.

| Wave | Mimics | Prisms | Swarms | Scarabs | Hornets | Carriers | Drones | Interval |
|------|--------|--------|--------|---------|---------|----------|--------|----------|
| 21 | 3 | 4 | 1 | 3 | — | — | — | 480ms |
| 22 | 4 | 5 | — | — | — | — | 6 | 430ms |
| 23 | 5 | 6 | 2 | 2 | 2 | — | — | 380ms |
| 24 | 6 | 7 | — | — | — | — | 8 | 340ms |
| 25 | 7 | 8 | 2 | — | 4 | 2 | — | 300ms |

After wave 25: **Prism Overlord** (6th and final boss) → `FinalCreditsScene`.

---

## Power-ups & Pickups

### Standard (all modes)
| Item | Source | Effect |
|------|--------|--------|
| Health Crystal | Enemy death (chance varies) | +1 life (max 5) |
| Crystal Cluster | Red asteroid (7% chance) | +3 lives (max 5) |
| Shield Charge | Asteroid death / Void Leech death | +1 shield (max 2) |
| Spread Shot | Enemy drop (Stage 2+, boss defeated) | 3-way fan for timed duration |
| Twin Bolt | Enemy drop (Stage 2+, boss defeated) | Dual beams |
| Rapid Fire | Enemy drop (Stage 2+, boss defeated) | 2× fire rate, aimed |

Weapons time out after a set duration or reset when the player is hit.

### Enemy Drop Rates

| Enemy | ♥ Health drop | 🔫 Weapon drop¹ | 🛡 Shield drop² |
|-------|---------------|-----------------|----------------|
| Flying Eye | 18% | 5% | 5% |
| Biped | 18% | 10% | 8% |
| Kamikaze Drone | 10% | 15% | 5% |
| Shield Carrier | 10% | 15% | 12% |
| Scarab Bomber | 10% | 10% | 10% |
| Spectrum Worm | 10% | 10% | 12% |
| Demon Hornet | 8% | 5% | 8% |
| Swarm Alien | 8% | 5% | 5% |
| Prism Entity | 12% | 0% | 8% |
| Mimic | 10% | 0% | 10% |
| Void Leech | ~17.5% | 0% | ~17.5%³ |
| Asteroid | 0% | 0% | 15%² |

¹ Weapon drops only spawn after the Stage 1 boss is defeated (`bossDefeated = true`).
² Enemy and asteroid shield drops are multiplied by difficulty: Easy ×1.5 / Normal ×1.0 / Hard ×0.5. Values shown are Normal baseline.
³ Void Leech has a 35% drop chance on death; outcome is a 50/50 coin flip between health and shield (not scaled by difficulty).

### Crystal Events (random, between waves)
40% chance per non-hazard transition (35% in Endless). Shoot the crystal to trigger:

| Roll | Reward |
|------|--------|
| 0–25% | +2 HP |
| 25–50% | All weapons active for 8s |
| 50–70% | +2 shield charges |
| 70–85% | Score ×2 for next wave |
| 85–100% | Full restore to 5 HP + 2s invincibility |

---

## Systems

### Combo System
- Kill enemies without getting hit → combo counter rises
- ×1 → ×2 → ×3 → ×4
- Getting hit resets combo to ×1
- Reaching ×4 triggers **Rainbow Mode** (8 seconds, score ×1.5)
- In Rainbow Mode: bolts cycle through 7 colors, and can **destroy black holes** on hit
- **Combo SFX pitch ladder**: `comboUp` SFX plays a higher arpeggio at ×3 and ×4 tiers

### FLAWLESS Bonus
- Clear a wave without taking any damage → **+500 pts** + "FLAWLESS" floating popup + 4-note fanfare
- Tracked via `this.waveHitsTaken` counter, reset at each wave start

### Score Milestones
- Every 1 000 points earned triggers a floating "+BONUS" popup and `milestone` SFX
- Tracked via `this.scoreMilestones` Set

### Per-Difficulty Personal Bests
- Campaign bests stored separately: `space-shooter-hiscore-easy`, `-normal`, `-hard`
- Menu shows the highest across all three difficulties

### Plasma Shield (E key)
- Activates a bubble around the player for ~3 seconds
- Deflects all enemy bolts, boss fireballs, homing projectiles
- Does NOT block black holes or physical collision with enemies
- Max 2 charges stored; charges drop from Shield Carriers

### How to Play / Bestiary (H key)
- Press **H** at any time during gameplay (not just from pause) to open the in-game guide
- 5 pages: Controls → Power-ups → Combo/Crystals → Bestiary p1 → Bestiary p2
- Same content available from the main menu → HOW TO PLAY
- H key also closes the overlay

### Score
| Target | Points |
|--------|--------|
| Flying Eye | 100 |
| Biped | 300 |
| Kamikaze Drone | 50 |
| Shield Carrier | 500 |
| Swarm Alien | 75 |
| Scarab Bomber | 250 |
| Spectrum Worm | 350 |
| Demon Hornet | 100 |
| Prism Entity | 200 |
| Mimic | 350 |
| Prism Shard (last hit) | 25 |
| Phantom Drone | 100 |
| Ion Orb | 150 |
| Asteroid | 50 |
| Crystal Asteroid | 300 |
| Void Leech | 150 |
| Gunship Mid-Boss | 2 000 |
| Black Hole (Rainbow) | HP × 100 |

- Combo multiplier applies at time of kill (×1 → ×4, reaching ×4 triggers Rainbow Mode)
- Hard difficulty: ×1.5 score multiplier

### Background Passers (all game stages)
Atmospheric objects drift downward continuously — simulating the player flying upward through deep space. Spawn randomly every 3.5–8.5 seconds, max 8 on screen at once.

| Type | Weight | Speed | Rotation | Notes |
|------|--------|-------|----------|-------|
| Galaxy | 30% | 14–30 px/s | 0.5–2°/s | Small, semi-transparent |
| Nebula | 25% | 4–9 px/s | very slow | Large, low alpha, tinted |
| Void Cloud | 22% | 3–8 px/s | barely moves | Huge, near-invisible; pink/gold/blue tint |
| Derelict Station | 15% | 10–22 px/s | 3–9°/s | Slowly rotates in place as it passes |
| Planet | 8% | 7–22 px/s | 0.3–1.5°/s | Rare; **bigger = slower drift** (inverse scale/speed) |

Managed by `createGameBgPool()` / `updateGameBgPool()` global functions. Called from `GameScene._scrollBg()`.

### Black Hole Gravity
- Normal BH: G = 300 000 — pulls player and deflects bullets
- Shower BH: G = 520 000 — much stronger pull
- Gravity formula in `_movePlayer()`: `pull = min((G / dist²) × dist × dt, 55 × dt)`
- Pull range: 24–230px from center; inside 24px = instant damage

---

## Code Locations — Quick Edit Guide

| What to change | Where in game.js |
|----------------|-----------------|
| Campaign wave counts / speed | `WAVES` array, lines 9–34 |
| When Stage 3 starts | `STAGE3_WAVE` constant (= 11) |
| When Stage 4 starts | `STAGE4_WAVE` constant (= 16) |
| Boss wave trigger | `BOSS_WAVE` constant, line 7 |
| Stage 5: Prism Dimension waves | `PRISM_WAVES` array, lines 42–48 |
| Difficulty multipliers | `create()` function, lines 1398–1402 |
| Hazard triggers between waves | `_updateWave()`, lines 2049–2115 |
| Stage 1 Boss behavior | `_updateBoss()`, line 2358 |
| Stage 1 Boss phases | `_bossPhaseTransition()`, line 2445 |
| Gunship Mid-Boss | `_updateMidBoss()` |
| Void Cruiser | `_updateVoidCruiser()` |
| Leviathan Final Boss | `_updateLeviathan()` |
| Leviathan Dark Shield activation | `_levActivateDeflectShield()` |
| Leviathan Void Pulse rings | `_levVoidPulse()` |
| Prism Overlord | `_updatePrismOverlord()`, line 5334 |
| Black hole spawning (normal) | `_doSpawnBlackhole()`, line 3329 |
| Gravity Storm (shower) | `_beginBlackholeShower()`, line 3352 |
| Meteor shower | `_beginMeteorShower()` |
| Ion storm | `_beginIonStorm()` |
| Enemy spawn functions | `_spawnEye/Biped/Drone/Carrier/Swarm/Prism/Mimic()` |
| Enemy drop rates (health/weapon) | `_collide()` — `crystalChance` and `wChance` lines |
| Prism shard HP | `_spawnPrismShards()` — `hp: 3` in `setData()` |
| Prism shard bullet collision | `_collide()` — "Prism shards" block, decrement hp logic |
| Game-stage background passers | `createGameBgPool()` / `updateGameBgPool()` global functions |
| Background passer spawn weights | `updateGameBgPool()` — weighted `r < 30 / 55 / 77 / 92` branches |
| Endless tier wave generation | `_generateEndlessWave()`, line 4527 |
| Endless tier boss selection | `_showEndlessBoss()`, line 4571 |
| Crystal event rewards | `_shatterCrystal()`, line 4363 |
| Player movement + BH gravity | `_movePlayer()`, line 1809 |
| Weapons | `_shoot()`, `_fireSingleFrom()`, `_fireSpreadFrom()`, line 1922 |
| Combo / Rainbow Mode | `_activateRainbowMode()`, line 4276 |
| Endless-only power-ups | look for `overcharge`, `ghost`, `nova` in `_collide()` |
| In-game HTP pages (5 pages) | `_openHowToPlay()` in GameScene |
| Menu HTP pages (5 pages) | `_openMenuHTP()` in MenuScene |
| Boss bolt deflect (all bosses) | `_collide()` — guarded by `this.difficulty === 'hard'` |
| Leviathan Dark Shield deflect | `_levActivateDeflectShield()` — active in all difficulties |
| Prism Overlord victory screen | `FinalCreditsScene` — 5s skip guard |

---

## Running the Game

The game is a static Phaser 3 site and requires a local HTTP server (browsers block `file://` asset loading).

**Easiest — double-click `play.bat`** (Windows, requires Python 3):
- Opens `http://localhost:8000` in your browser automatically
- Close the terminal window to stop the server

**VS Code**: Right-click `index.html` → *Open with Live Server* (requires Live Server extension)

**Any machine with Python**:
```
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Online (GitHub Pages)**: Push the folder to a GitHub repo, enable Pages in repo Settings → Pages → Branch: main. The game becomes playable at `https://username.github.io/repo-name/`.

---

*File: game.js — single-file Phaser 3.60 game. All gameplay logic in `GameScene` class.*
