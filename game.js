'use strict';

const W = 480;
const H = 720;
const BASE = 'Legacy Collection/Legacy Collection/Assets/';

const BOSS_WAVE = 5; // boss triggers when this wave clears

const WAVES = [
    // ── Stage 1 (no drones, no weapon drops) ─────────────────────────────────
    { eyes: 5, bipeds: 0, drones: 0, interval: 1400 },
    { eyes: 7, bipeds: 0, drones: 0, interval: 1200 },
    { eyes: 4, bipeds: 3, drones: 0, interval: 1100 },
    { eyes: 3, bipeds: 5, drones: 0, interval: 1000 },
    { eyes: 5, bipeds: 5, drones: 0, interval: 850  },
    // ── Stage 2 (post-boss) ───────────────────────────────────────────────────
    { eyes: 4, bipeds: 4, drones: 3, shields: 0, prisms: 0,           interval: 900 },
    { eyes: 3, bipeds: 5, drones: 4, shields: 1, prisms: 1, scarabs: 1, interval: 820 },
    { eyes: 2, bipeds: 4, drones: 4, shields: 2, prisms: 1, scarabs: 1, interval: 740 },
    { eyes: 3, bipeds: 6, drones: 5, shields: 2, prisms: 2, scarabs: 2, interval: 680 },
    { eyes: 4, bipeds: 6, drones: 6, shields: 3, prisms: 2, scarabs: 2, interval: 600 },
    // ── Stage 3 (ion storms) — drones and swarms alternate, never together ──────
    { eyes: 0, bipeds: 0, drones: 7,  shields: 3, swarms: 0, prisms: 2, scarabs: 2,            interval: 520 },
    { eyes: 0, bipeds: 0, drones: 0,  shields: 3, swarms: 4, prisms: 2, scarabs: 2, worms: 1,  interval: 480 },
    { eyes: 0, bipeds: 0, drones: 8,  shields: 3, swarms: 0, prisms: 3,             worms: 2,  interval: 440 },
    { eyes: 0, bipeds: 0, drones: 0,  shields: 4, swarms: 5, prisms: 3, scarabs: 1, worms: 2,  interval: 400 },
    { eyes: 0, bipeds: 0, drones: 10, shields: 4, swarms: 0, prisms: 3,             worms: 3,  interval: 360 },
    // ── Stage 4 (gravity storms, deep void) — drones and swarms alternate ────
    { eyes: 0, bipeds: 0, drones: 0,  shields: 3, swarms: 5, prisms: 3, hornets: 2, interval: 320 },
    { eyes: 0, bipeds: 0, drones: 12, shields: 3, swarms: 0, prisms: 3, hornets: 3, interval: 280 },
    { eyes: 0, bipeds: 0, drones: 0,  shields: 4, swarms: 5, prisms: 3, hornets: 3, interval: 260 },
    { eyes: 0, bipeds: 0, drones: 13, shields: 4, swarms: 0, prisms: 4, hornets: 4, interval: 240 },
    { eyes: 0, bipeds: 0, drones: 0,  shields: 4, swarms: 6, prisms: 4, hornets: 4, interval: 220 },
];

const STAGE3_WAVE = 11; // first wave of Stage 3
const STAGE4_WAVE = 16; // first wave of Stage 4

const RAINBOW_COLORS  = [0xff2222, 0xff8800, 0xffee00, 0x00ff44, 0x00eeff, 0x4488ff, 0xcc00ff];
const PRISM_BG_COLS   = [0x220008, 0x221100, 0x222200, 0x002209, 0x002222, 0x001422, 0x180022];

const PRISM_WAVES = [
    { mimics: 3, prisms: 4, swarms: 4, drones: 0, interval: 480 },
    { mimics: 4, prisms: 5, swarms: 0, drones: 6, interval: 430 },
    { mimics: 5, prisms: 6, swarms: 5, drones: 0, interval: 380 },
    { mimics: 6, prisms: 7, swarms: 0, drones: 8, interval: 340 },
    { mimics: 7, prisms: 8, swarms: 6, drones: 0, interval: 300 },
];

// ─── SOUND FX (synthesized via Web Audio API — no files needed) ──────────────

class SoundFX {
    constructor(ctx) {
        this.ctx    = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.2;
        this.master.connect(ctx.destination);
    }

    _t() { return this.ctx.currentTime; }

    _tone(t, freq, endFreq, dur, wave = 'square', vol = 0.3) {
        const { ctx, master } = this;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type  = wave;
        osc.frequency.setValueAtTime(freq, t);
        if (endFreq > 0) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(master);
        osc.start(t); osc.stop(t + dur + 0.01);
        setTimeout(() => { try { osc.disconnect(); g.disconnect(); } catch(_) {} }, Math.max(0, (t - ctx.currentTime + dur + 0.1)) * 1000);
    }

    _noise(t, dur, vol = 0.3, cutoff = 2000) {
        const { ctx, master } = this;
        const len = Math.ceil(ctx.sampleRate * (dur + 0.05));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass'; flt.frequency.value = cutoff;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(flt); flt.connect(g); g.connect(master);
        src.start(t);
        setTimeout(() => { try { src.disconnect(); flt.disconnect(); g.disconnect(); } catch(_) {} }, Math.max(0, (t - ctx.currentTime + dur + 0.15)) * 1000);
    }

    shoot()          { const t = this._t(); this._tone(t, 520, 190, 0.09, 'square', 0.26); }
    hit()            { const t = this._t(); this._tone(t, 280, 100, 0.07, 'sawtooth', 0.28); this._noise(t, 0.07, 0.09, 900); }
    enemyDie()       { const t = this._t(); this._tone(t, 400, 55, 0.26, 'sawtooth', 0.56); this._noise(t, 0.22, 0.42, 1100); }
    asteroidExplode(){ const t = this._t(); this._noise(t, 0.55, 0.76, 220); this._noise(t + 0.06, 0.38, 0.48, 650); this._tone(t, 68, 16, 0.52, 'sawtooth', 0.62); }
    asteroidCrack()  { const t = this._t(); this._noise(t, 0.09, 0.16, 900); this._tone(t, 140, 60, 0.06, 'sawtooth', 0.20); }
    playerHit()      { const t = this._t(); this._tone(t, 200, 55, 0.32, 'sawtooth', 0.48); this._noise(t, 0.28, 0.3, 600); }

    crystalPickup() {
        const t = this._t();
        this._tone(t,        660,  0, 0.09, 'sine', 0.36);
        this._tone(t + 0.09, 880,  0, 0.09, 'sine', 0.36);
        this._tone(t + 0.18, 1100, 0, 0.14, 'sine', 0.4);
    }

    shieldPickup()   { const t = this._t(); this._tone(t, 330, 660, 0.18, 'sine', 0.34); this._tone(t + 0.06, 495, 990, 0.14, 'sine', 0.2); }
    shieldActivate() { const t = this._t(); this._tone(t, 220, 880, 0.28, 'sine', 0.38); this._tone(t + 0.04, 330, 1320, 0.24, 'square', 0.14); }
    shieldBlock()    { const t = this._t(); this._tone(t, 700, 350, 0.06, 'square', 0.24); this._noise(t, 0.05, 0.08, 2200); }
    shieldExpire()   { const t = this._t(); this._tone(t, 440, 88, 0.45, 'sine', 0.26); }
    shieldHum()      {
        const t = this._t();
        this._tone(t,        220, 260,  0.10, 'sawtooth', 0.30);  // electrical buzz base
        this._tone(t + 0.06, 440, 400,  0.07, 'sawtooth', 0.24);  // mid harmonic sweep
        this._tone(t + 0.12, 880, 960,  0.04, 'square',   0.18);  // high crackle tone
        this._tone(t + 0.18,1320,1200,  0.025,'square',   0.12);  // top shimmer
        this._noise(t,        0.06, 0.30, 6000);                   // electrical crackle
        this._noise(t + 0.14, 0.04, 0.16, 9000);                   // high spark
    }

    bossHit()        { const t = this._t(); this._tone(t, 240, 120, 0.1, 'sawtooth', 0.3); this._noise(t, 0.08, 0.13, 1600); }
    mimicFire()      { const t = this._t(); this._tone(t, 440, 220, 0.10, 'sine', 0.22); this._tone(t, 660, 330, 0.08, 'sine', 0.14); }
    prismOverlordHit(){ const t = this._t(); this._tone(t, 880, 440, 0.08, 'sine', 0.28); this._noise(t, 0.06, 0.10, 3500); }
    prismOverlordPhase(){ const t = this._t(); this._tone(t, 220, 880, 0.35, 'sine', 0.38); this._tone(t+0.06, 440, 1760, 0.22, 'square', 0.18); this._noise(t, 0.3, 0.14, 2200); }
    bossExplosion()  { const t = this._t(); this._noise(t, 0.85, 0.52, 380); this._tone(t, 65, 18, 0.8, 'sawtooth', 0.48); this._tone(t, 130, 35, 0.65, 'square', 0.26); }
    bossFire()       { const t = this._t(); this._tone(t, 85, 28, 0.48, 'sawtooth', 0.52); this._noise(t, 0.38, 0.24, 650); this._tone(t + 0.06, 170, 58, 0.32, 'square', 0.22); }
    bossSweep()      { const t = this._t(); this._tone(t, 620, 300, 0.09, 'square', 0.2); this._noise(t, 0.07, 0.08, 3200); }
    leechGurgle()    { const t = this._t(); this._tone(t, 92, 28, 0.20, 'sine', 0.18); this._tone(t+0.06, 68, 20, 0.16, 'sine', 0.14); this._noise(t, 0.12, 0.14, 200); }
    leechAttack()    { const t = this._t(); this._tone(t, 130, 38, 0.50, 'sine', 0.10); this._tone(t+0.06, 175, 50, 0.44, 'sine', 0.10); this._tone(t+0.12, 110, 32, 0.48, 'sine', 0.12); this._tone(t+0.18, 90, 25, 0.42, 'sine', 0.14); this._noise(t, 0.40, 0.28, 320); this._noise(t+0.14, 0.32, 0.18, 260); }
    leechTongue()    { const t = this._t(); this._tone(t, 480, 120, 0.14, 'sine', 0.12); this._tone(t+0.05, 280, 55, 0.10, 'sine', 0.10); this._noise(t, 0.06, 0.10, 1800); }
    leechRush()      { const t = this._t(); this._tone(t, 190, 70, 2.72, 'sine', 0.08); this._tone(t+0.07, 230, 55, 2.88, 'sine', 0.08); this._tone(t+0.14, 160, 80, 3.04, 'sine', 0.08); this._tone(t+0.21, 140, 45, 3.20, 'sine', 0.10); this._tone(t+0.31, 200, 60, 2.88, 'sine', 0.08); this._tone(t+0.39, 110, 35, 2.56, 'sine', 0.14); this._noise(t, 2.56, 0.50, 280); this._noise(t+0.22, 2.08, 0.34, 220); }
    scarabBurst()    { const t = this._t(); this._noise(t, 0.55, 0.14, 2400); this._noise(t+0.03, 0.38, 0.24, 680); this._tone(t, 360, 75, 0.30, 'sawtooth', 0.18); this._tone(t+0.06, 210, 38, 0.22, 'square', 0.14); }
    hornetSting()    { const t = this._t(); this._tone(t, 1100, 400, 0.07, 'sawtooth', 0.10); this._tone(t+0.03, 700, 200, 0.06, 'square', 0.08); this._noise(t, 0.09, 0.06, 4800); }

    meteorWarning() {
        const t = this._t();
        this._noise(t, 0.6, 0.44, 320);
        this._tone(t,        55, 220, 0.5, 'sawtooth', 0.4);
        this._tone(t + 0.3, 110, 440, 0.5, 'sawtooth', 0.36);
    }
    meteorRumble() {
        const t = this._t();
        this._noise(t,        0.9,  0.52, 170);
        this._tone(t,          46,   20,  0.8, 'sawtooth', 0.48);
        this._noise(t + 0.28,  0.55, 0.32, 340);
        this._tone(t + 0.45,   62,   26,  0.5, 'sawtooth', 0.28);
    }
    shieldDeflect() { const t = this._t(); this._tone(t, 1200, 400, 0.12, 'square', 0.34); this._noise(t, 0.1, 0.18, 3500); }
    midBossDeath() {
        const t = this._t();
        this._noise(t, 1.2, 0.55, 300);
        this._tone(t,        80,  25, 1.0, 'sawtooth', 0.55);
        this._tone(t + 0.2, 160,  50, 0.8, 'square',   0.3);
        this._tone(t + 0.5,  55,  18, 0.8, 'sawtooth', 0.45);
    }

    droneSpawn()    { const t = this._t(); [0, 0.08, 0.16].forEach(d => this._tone(t + d, 740, 340, 0.07, 'square', 0.22)); }
    weaponPickup()  { const t = this._t(); this._tone(t, 440, 880, 0.13, 'square', 0.28); this._tone(t + 0.1, 660, 1320, 0.12, 'square', 0.22); }
    weaponExpire()  { const t = this._t(); this._tone(t, 440, 200, 0.28, 'sine', 0.22); }
    comboUp(mult=2) {
        const t = this._t();
        if      (mult >= 4) { this._tone(t, 880, 1760, 0.13, 'square', 0.32); this._tone(t+0.08, 1100, 2200, 0.12, 'square', 0.26); }
        else if (mult === 3) { this._tone(t, 660, 1320, 0.12, 'square', 0.30); this._tone(t+0.09, 880, 1760, 0.11, 'square', 0.24); }
        else                { this._tone(t, 440,  880, 0.11, 'square', 0.28); this._tone(t+0.10, 660, 1320, 0.10, 'square', 0.22); }
    }
    comboBreak()    { const t = this._t(); this._tone(t, 330, 110, 0.22, 'sawtooth', 0.32); }
    flawless()      { const t = this._t(); [880,1047,1319,1568].forEach((f,i) => this._tone(t+i*.07, f, f*1.5, 0.13, 'square', 0.28)); }
    milestone()     { const t = this._t(); this._tone(t, 523, 1047, 0.18, 'square', 0.34); this._tone(t+0.12, 784, 1568, 0.16, 'square', 0.28); this._tone(t+0.22, 1047, 2094, 0.14, 'square', 0.22); }
    voidDrone(ctx, dest) {
        if (this._voidOsc) return;
        this._voidGain = ctx.createGain(); this._voidGain.gain.value = 0;
        this._voidOsc  = ctx.createOscillator(); this._voidOsc.type = 'sine'; this._voidOsc.frequency.value = 48;
        this._voidOsc.connect(this._voidGain); this._voidGain.connect(dest);
        this._voidOsc.start();
        this._voidGain.gain.setTargetAtTime(0.045, ctx.currentTime, 3.5);
    }
    stopVoidDrone(ctx) {
        if (!this._voidOsc) return;
        this._voidGain.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
        const osc = this._voidOsc, gain = this._voidGain;
        setTimeout(() => { try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch(_){} }, 2500);
        this._voidOsc = null; this._voidGain = null;
    }

    bossWarning() {
        const t = this._t();
        this._tone(t,     110, 0, 0.38, 'sawtooth', 0.42);
        this._tone(t + 0.5, 110, 0, 0.38, 'sawtooth', 0.42);
        this._tone(t + 1.0, 82,  0, 0.55, 'sawtooth', 0.52);
    }

    waveStart() {
        const t = this._t();
        this._tone(t,        330, 0, 0.13, 'square', 0.26);
        this._tone(t + 0.13, 440, 0, 0.13, 'square', 0.26);
        this._tone(t + 0.26, 550, 0, 0.18, 'square', 0.28);
    }

    gameOver() {
        const t = this._t();
        [440, 330, 220, 110].forEach((f, i) => this._tone(t + i * 0.22, f, f * 0.6, 0.24, 'sawtooth', 0.34));
    }

    victory() {
        const t = this._t();
        [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(t + i * 0.14, f, 0, 0.18, 'square', 0.26));
    }

    difficultySelect() { const t = this._t(); this._tone(t, 440, 880, 0.12, 'square', 0.28); this._tone(t + 0.08, 660, 1320, 0.1, 'square', 0.22); }
    endlessLoop() {
        const t = this._t();
        [330, 440, 550, 660, 880, 1100].forEach((f, i) => this._tone(t + i * 0.1, f, 0, 0.14, 'square', 0.24));
    }
    newHighScore() {
        const t = this._t();
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this._tone(t + i * 0.1, f, 0, 0.16, 'square', 0.26));
    }
    swarmSpawn() { const t = this._t(); [880,1100,660,880].forEach((f,i) => this._tone(t+i*.05, f, 0, .06, 'square', .16)); }

    ionStormWarning() {
        const t = this._t();
        this._noise(t, 0.5, 0.38, 4500);
        this._tone(t,        180, 720, 0.4, 'sawtooth', 0.28);
        this._tone(t + 0.2, 360, 1440, 0.4, 'square',   0.18);
    }
    ionBolt() {
        const t = this._t();
        this._noise(t, 0.12, 0.55, 8000);
        this._tone(t, 1800, 400, 0.1, 'square', 0.3);
        this._noise(t + 0.05, 0.08, 0.28, 5000);
    }
    voidCruiserDeath() {
        const t = this._t();
        this._noise(t, 1.4, 0.6, 280);
        this._tone(t,        55,  18, 1.2, 'sawtooth', 0.6);
        this._tone(t + 0.3, 110,  36, 0.9, 'square',   0.32);
        this._tone(t + 0.7, 880, 440, 0.5, 'sine',     0.24);
    }

    voidPulse() {
        const t = this._t();
        this._noise(t, 0.9, 0.52, 190);
        this._tone(t,        41,  16, 0.8, 'sawtooth', 0.55);
        this._tone(t + 0.15, 82,  28, 0.65, 'square',  0.32);
        this._tone(t + 0.3, 164,  55, 0.5, 'sawtooth', 0.22);
    }
    phantomSpawn() {
        const t = this._t();
        [660, 880, 1100, 880, 660].forEach((f, i) => this._tone(t + i * 0.06, f, 0, 0.08, 'square', 0.22));
    }
    leviathanWarning() {
        const t = this._t();
        this._noise(t, 1.8, 0.65, 160);
        this._tone(t,        41,  0, 0.9, 'sawtooth', 0.58);
        this._tone(t + 0.5,  37,  0, 0.9, 'sawtooth', 0.52);
        this._tone(t + 1.0,  31,  0, 1.1, 'sawtooth', 0.62);
        this._tone(t + 1.6,  28,  0, 1.4, 'sawtooth', 0.68);
    }
    leviathanDeath() {
        const t = this._t();
        this._noise(t, 2.5, 0.75, 140);
        this._tone(t,        41,  12, 2.2, 'sawtooth', 0.70);
        this._tone(t + 0.4,  82,  22, 1.6, 'square',   0.44);
        this._tone(t + 0.9, 164,  44, 1.0, 'sawtooth', 0.30);
        [880, 660, 523, 440, 330, 220, 110].forEach((f, i) =>
            this._tone(t + 0.3 + i * 0.2, f, f * 0.45, 0.28, 'sawtooth', 0.38));
    }

    rainbowMode() {
        const t = this._t();
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) =>
            this._tone(t + i * 0.08, f, 0, 0.12, 'square', 0.28));
    }
    crystalEvent() {
        const t = this._t();
        this._tone(t,        880, 1760, 0.28, 'sine', 0.30);
        this._tone(t + 0.10, 1047, 2094, 0.22, 'sine', 0.22);
        this._tone(t + 0.20, 1319, 2638, 0.18, 'sine', 0.18);
    }
    crystalShatter() {
        const t = this._t();
        this._noise(t, 0.30, 0.44, 6000);
        [1047, 1319, 1568, 1975].forEach((f, i) =>
            this._tone(t + i * 0.04, f, f * 0.5, 0.11, 'square', 0.20));
    }
    prismSplit() {
        const t = this._t();
        this._noise(t, 0.14, 0.28, 4500);
        [659, 784, 523].forEach((f, i) =>
            this._tone(t + i * 0.05, f, f * 1.5, 0.09, 'square', 0.17));
    }

    startGame() {
        const t = this._t();
        this._tone(t,        523,  0, 0.07, 'square', 0.36);
        this._tone(t + 0.08, 659,  0, 0.07, 'square', 0.36);
        this._tone(t + 0.16, 784,  0, 0.07, 'square', 0.36);
        this._tone(t + 0.24, 1047, 0, 0.24, 'square', 0.44);
    }

    menuNavigate() { const t = this._t(); this._tone(t, 440, 330, 0.06, 'square', 0.18); }
    menuConfirm()  { const t = this._t(); this._tone(t, 660, 880, 0.10, 'square', 0.28); this._tone(t+0.07, 880, 1100, 0.09, 'square', 0.22); }
    settingsChange(){ const t = this._t(); this._tone(t, 550, 440, 0.05, 'sine', 0.16); }
    pauseOpen()    { const t = this._t(); this._tone(t, 330, 660, 0.16, 'sine', 0.22); this._noise(t, 0.12, 0.07, 1000); }
}

// ─── STAGE 3 MUSIC ────────────────────────────────────────────────────────────

class Stage3Music {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()      { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.10,.7); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    fadeIn()     { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.10,.7); }
    stop()       { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.3); }
    setVol(f)    { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)     { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _hat(t,v){
        const l=Math.ceil(this.ctx.sampleRate*.04),b=this.ctx.createBuffer(1,l,this.ctx.sampleRate),d=b.getChannelData(0);
        for(let i=0;i<l;i++) d[i]=Math.random()*2-1;
        const s=this.ctx.createBufferSource(); s.buffer=b;
        const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=5500;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.035);
        s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
        setTimeout(()=>{try{s.disconnect();f.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+.09))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/158, H=B/2, L=B*16; // D minor 158 BPM — darker/faster than GameMusic

        // Sub-bass void drone
        this._n(37, s, L*.95, .20, 'sawtooth');
        this._n(55, s+L/2, (L/2)*.9, .14, 'sawtooth');

        // Bass (sawtooth)
        [[0,147,B*.8,.32],[B,147,H*.7,.24],[B*1.5,131,H*.7,.22],[B*2,110,B*.8,.28],[B*3,98,B*.8,.26],
         [B*4,117,B*.8,.30],[B*5,117,H*.7,.22],[B*5.5,98,H*.7,.20],[B*6,131,B*.8,.26],[B*7,147,B*.8,.28],
         [B*8,147,B*.8,.30],[B*9,175,H*.7,.24],[B*9.5,147,H*.7,.20],[B*10,131,B*.8,.26],[B*11,110,B*.8,.24],
         [B*12,175,B*.8,.28],[B*13,147,H*.7,.22],[B*13.5,131,H*.7,.20],[B*14,110,B*.8,.26],[B*15,147,B*.8,.28]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));

        // Melody (square) — tighter, more intense
        [[0,587,H*.7,.18],[H,698,H*.7,.16],[B,587,H*.7,.18],[B*1.5,523,H*.7,.16],
         [B*2,466,H*.7,.18],[B*2.5,440,H*.7,.16],[B*3,392,B*.7,.18],[B*3.5,440,H*.7,.16],
         [B*4,587,H*.7,.20],[B*4.5,698,H*.7,.16],[B*5,587,B*.7,.18],[B*5.5,523,H*.7,.16],
         [B*6,440,B*.7,.18],[B*7,466,B*.7,.16],
         [B*8,784,H*.7,.20],[B*8.5,698,H*.7,.16],[B*9,587,H*.7,.20],[B*9.5,698,H*.7,.16],
         [B*10,784,B*.7,.20],[B*11,698,B*.7,.16],
         [B*12,587,H*.7,.18],[B*12.5,523,H*.7,.16],[B*13,466,H*.7,.18],[B*13.5,440,H*.7,.16],
         [B*14,392,B*1.6,.18],[B*15.5,587,H*.7,.20]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));

        for(let i=0;i<32;i++) this._hat(s+i*H, i%2===0?.12:.07);
        this._loop=setTimeout(()=>this._sched(s+L),(L-.35)*1000);
    }
}

// ─── ION STORM MUSIC ──────────────────────────────────────────────────────────

class IonStormMusic {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()     { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.14,.5); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    fadeIn()    { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.14,.5); }
    stop()      { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.3); }
    setVol(f)   { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)    { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _noise(t,d,v,cut){
        const len=Math.ceil(this.ctx.sampleRate*(d+.05)),buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),da=buf.getChannelData(0);
        for(let i=0;i<len;i++) da[i]=Math.random()*2-1;
        const src=this.ctx.createBufferSource(); src.buffer=buf;
        const flt=this.ctx.createBiquadFilter(); flt.type='bandpass'; flt.frequency.value=cut;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t);
        setTimeout(()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.15))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/176, H=B/2, L=B*16; // 176 BPM, E minor — fast electric action

        // Driving staccato bass
        [[0,82,H*.5,.36],[B,82,H*.4,.28],[B*1.5,73,H*.4,.24],[B*2,98,H*.5,.32],
         [B*3,82,H*.5,.30],[B*4,110,H*.4,.28],[B*5,82,H*.5,.32],[B*6,73,H*.5,.30],
         [B*7,98,H*.4,.26],[B*8,82,H*.5,.36],[B*9,82,H*.4,.28],[B*10,123,H*.4,.26],
         [B*11,82,H*.5,.30],[B*12,110,H*.4,.28],[B*13,82,H*.5,.30],[B*14,73,H*.5,.32],[B*15,82,H*.6,.36]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));

        // Electric choppy lead
        [[0,330,H*.4,.18],[H,392,H*.3,.14],[B,330,H*.4,.18],[B*1.5,294,H*.3,.13],
         [B*2,440,H*.5,.20],[B*2.5,392,H*.3,.14],[B*3,330,H*.4,.18],
         [B*4,494,H*.5,.22],[B*4.5,440,H*.3,.15],[B*5,330,H*.4,.18],[B*5.5,294,H*.3,.13],
         [B*6,392,H*.5,.20],[B*7,440,H*.5,.22],
         [B*8,659,H*.4,.20],[B*8.5,587,H*.3,.15],[B*9,523,H*.4,.18],[B*9.5,440,H*.3,.13],
         [B*10,494,H*.5,.22],[B*11,440,H*.5,.20],
         [B*12,523,H*.4,.18],[B*12.5,494,H*.3,.14],[B*13,392,H*.5,.20],
         [B*14,330,H*.8,.22],[B*15,294,H*.3,.15],[B*15.5,330,H*.3,.18]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));

        // Electric noise crackle on every beat
        [0,B,B*2,B*3,B*4,B*5,B*6,B*7,B*8,B*9,B*10,B*11,B*12,B*13,B*14,B*15].forEach(o=>{
            this._noise(s+o, .04, .15, 4000);
            this._noise(s+o+H, .03, .09, 7000);
        });

        // Tense chord stabs
        [[0,[330,415,494],H*.3,.15],[B*4,[294,370,440],H*.3,.13],
         [B*8,[330,415,494],H*.3,.17],[B*12,[247,330,392],H*.4,.19]
        ].forEach(([o,freqs,d,v])=>freqs.forEach(f=>this._n(f,s+o,d,v,'sawtooth')));

        this._loop=setTimeout(()=>this._sched(s+L),(L-.25)*1000);
    }
}

// ─── GRAVITY STORM MUSIC ─────────────────────────────────────────────────────

class GravityStormMusic {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()       { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.13,.9); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    fadeIn()      { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.13,.9); }
    stop()        { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.4); }
    setVol(f)     { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)      { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _noise(t,d,v,cut){
        const len=Math.ceil(this.ctx.sampleRate*(d+.05)),buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),da=buf.getChannelData(0);
        for(let i=0;i<len;i++) da[i]=Math.random()*2-1;
        const src=this.ctx.createBufferSource(); src.buffer=buf;
        const flt=this.ctx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=cut;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t);
        setTimeout(()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.15))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/85, H=B/2, L=B*16; // 85 BPM — slow, heavy, gravitational crush
        // Sub-bass void pull — constant cosmic drone
        this._n(41.2, s,     L*.92, .28, 'sawtooth');
        this._n(55,   s+B*4, B*6.5, .22, 'sawtooth');
        // Heavy pulsing bass hits — gravity waves
        [[0,55,B*.7,.40],[B*2,41.2,B*.65,.32],[B*4,55,B*.7,.38],[B*6,49,B*.65,.30],
         [B*8,55,B*.7,.42],[B*10,41.2,B*.65,.34],[B*12,55,B*.7,.38],[B*14,46.2,B*.8,.36]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));
        // Dark chromatic melody — slow, ominous descent
        [[0,220,B*.8,.16],[B*2,207.7,B*.75,.15],[B*4,185,B*.8,.18],[B*6,196,B*.7,.16],
         [B*8,220,B*.8,.17],[B*10,233,B*.75,.15],[B*12,207.7,B*.9,.18],[B*14,185,B*1.0,.20]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));
        // High unsettling tremolo — tension spikes
        [[B*.5,440,H*.3,.09],[B*2.5,415,H*.3,.08],[B*4.5,440,H*.3,.10],[B*6.5,392,H*.3,.09],
         [B*8.5,440,H*.3,.09],[B*10.5,466,H*.3,.08],[B*12.5,440,H*.3,.10],[B*14.5,415,H*.3,.09]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'triangle'));
        // Deep sub-frequency noise rumble — physical gravity feel
        [0,B*2,B*4,B*6,B*8,B*10,B*12,B*14].forEach(o=>{
            this._noise(s+o,     B*.65, .24, 100);
            this._noise(s+o+H,   B*.40, .13, 200);
        });
        // Ominous minor chord stabs
        [[B*4,[220,262,330],H*.4,.14],[B*8,[196,247,294],H*.4,.16],[B*12,[207.7,261.6,311],H*.4,.15]]
        .forEach(([o,freqs,d,v])=>freqs.forEach(f=>this._n(f,s+o,d,v,'sawtooth')));
        this._loop=setTimeout(()=>this._sched(s+L),(L-.4)*1000);
    }
}

// ─── VOID LEECH MUSIC — slow, ethereal, mysterious ────────────────────────────

class VoidLeechMusic {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()       { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.11,.9); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    fadeIn()      { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.11,.9); }
    stop()        { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.5); }
    setVol(f)     { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)      { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _pad(f,t,d,v,w='sine'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f;
        const atk=Math.min(d*.38,1.1);
        g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(v,t+atk);
        g.gain.setValueAtTime(v,t+d*.68); g.gain.exponentialRampToValueAtTime(0.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.05);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.15))*1000);
    }
    _n(f,t,d,v,w='sine'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _noise(t,v,d,cut){
        const len=Math.ceil(this.ctx.sampleRate*(d+.05)),buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),da=buf.getChannelData(0);
        for(let i=0;i<len;i++) da[i]=Math.random()*2-1;
        const src=this.ctx.createBufferSource(); src.buffer=buf;
        const flt=this.ctx.createBiquadFilter(); flt.type='lowpass'; flt.frequency.value=cut;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t);
        setTimeout(()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.15))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/38, L=B*8; // 38 BPM — glacially slow, no pulse feel

        // Deep beating drone — two detuned sines create ~1.4 Hz tremolo (unsettling beating)
        this._pad(54.6, s, L*.97, .22, 'sine');
        this._pad(56.1, s, L*.97, .18, 'sine');

        // Tritone shadow — Eb against the A (devil's interval)
        this._pad(77.8,  s+B*1.2, B*4.5, .12, 'sine');
        this._pad(82.4,  s+B*5.3, B*2.6, .10, 'sine');

        // Dissonant mid cluster — minor 2nds and tritones, off-beat, no rhythm
        [[B*.3,220,.09],[B*1.7,233,.08],[B*2.9,277,.08],[B*4.4,311,.07],[B*6.1,208,.09],[B*7.0,185,.08]]
        .forEach(([o,f,v])=>this._pad(f,s+o,B*.85,v,'sine'));

        // Sparse high drips — irregular, like water in a dark cave
        [[B*.5,880,.038],[B*1.9,740,.042],[B*3.6,1047,.030],[B*5.2,622,.040],[B*7.1,932,.034]]
        .forEach(([o,f,v])=>this._n(f,s+o,.06,v,'sine'));

        // Low irregular rumble — no steady pulse, random feel
        [B*.1, B*2.3, B*4.9, B*6.6].forEach(o=>this._noise(s+o,.09,B*.38,115));

        // Occasional mid scrape — deeply unsettling texture
        this._noise(s+B*3.1, .06, B*.6, 340);
        this._noise(s+B*7.4, .05, B*.5, 280);

        this._loop=setTimeout(()=>this._sched(s+L),(L-.4)*1000);
    }
}

// ─── MENU MUSIC ───────────────────────────────────────────────────────────────

class MenuMusic {
    constructor(ctx) {
        this.ctx    = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.13;
        this.master.connect(ctx.destination);
        this._active   = false;
        this._loopTout = null;
    }

    start() {
        if (this._active) return;
        this._active = true;
        this._schedule(this.ctx.currentTime + 0.05);
    }

    stop() {
        this._active = false;
        if (this._loopTout) { clearTimeout(this._loopTout); this._loopTout = null; }
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
    }
    setVol(f) { this._vf = f || 1; this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setValueAtTime(0.13 * this._vf, this.ctx.currentTime); }

    _n(freq, t, dur, vol, wave) {
        const osc = this.ctx.createOscillator();
        const g   = this.ctx.createGain();
        osc.type  = wave; osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(this.master);
        osc.start(t); osc.stop(t + dur + 0.01);
        setTimeout(()=>{try{osc.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+dur+.1))*1000);
    }

    _hat(t, vol) {
        const len = Math.ceil(this.ctx.sampleRate * 0.05);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'highpass'; flt.frequency.value = 6000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
        src.connect(flt); flt.connect(g); g.connect(this.master);
        src.start(t);
        setTimeout(()=>{try{src.disconnect();flt.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+.09))*1000);
    }

    _schedule(s) {
        if (!this._active) return;
        const B = 60 / 138, H = B / 2, loop = B * 16; // 4 bars in A-minor

        // Bass (sawtooth) — A2=110 G2=98 C3=131 D3=147 B2=123 E3=165
        [
            [0,      110,B*.9,0.32],[B,      110,B*.9,0.26],[B*2,  98,B*.9,0.28],[B*3, 110,B*.9,0.26],
            [B*4,    131,B*.9,0.30],[B*5,    131,B*.9,0.24],[B*6, 147,B*.9,0.28],[B*7, 123,B*.9,0.24],
            [B*8,    110,B*.9,0.30],[B*9,    110,H*.8,0.22],[B*9.5,98,H*.8,0.22],[B*10,147,B*.9,0.26],
            [B*11,   131,B*.9,0.28],[B*12,   165,B*.9,0.30],[B*13,165,H*.8,0.22],[B*13.5,131,H*.8,0.22],
            [B*14,   110,B*.9,0.28],[B*15,   110,B*.9,0.26],
        ].forEach(([o,f,d,v]) => this._n(f, s+o, d, v, 'sawtooth'));

        // Melody (square) — E5=659 D5=587 C5=523 A4=440 G4=392 G5=784 A5=880
        [
            [0,      659,H*.8,0.22],[H,      587,H*.8,0.18],[B,    523,B*.8,0.20],
            [B*2,    587,H*.8,0.18],[B*2.5,  659,H*.8,0.20],[B*3,  659,H*.8,0.22],[B*3.5,659,H*.8,0.22],
            [B*4,    587,B*.8,0.22],[B*5,    587,B*.8,0.18],[B*6,  523,B*.8,0.22],[B*7,  440,B*.8,0.18],
            [B*8,    880,H*.8,0.20],[B*8.5,  784,H*.8,0.18],[B*9,  659,H*.8,0.22],[B*9.5,784,H*.8,0.18],
            [B*10,   880,B*.8,0.22],[B*11,   784,H*.8,0.18],[B*11.5,659,H*.8,0.20],
            [B*12,   659,H*.8,0.22],[B*12.5, 587,H*.8,0.18],[B*13, 523,B*1.8,0.20],
            [B*15,   440,H*.8,0.18],[B*15.5, 659,H*.75,0.22],
        ].forEach(([o,f,d,v]) => this._n(f, s+o, d, v, 'square'));

        // Arp sparkle (square) — pentatonic ascending/descending
        [
            [H*.5,440,0.08,0.10],[H*1.5,523,0.08,0.10],[H*2.5,659,0.08,0.10],[H*3.5,784,0.08,0.10],
            [H*4.5,880,0.08,0.10],[H*5.5,784,0.08,0.09],[H*6.5,659,0.08,0.09],[H*7.5,523,0.08,0.09],
            [B*8+H*.5,1047,0.08,0.11],[B*8+H*1.5,880,0.08,0.10],[B*8+H*2.5,784,0.08,0.09],[B*8+H*3.5,1047,0.08,0.11],
            [B*8+H*4.5,1319,0.08,0.12],[B*8+H*5.5,1047,0.08,0.10],[B*8+H*6.5,880,0.08,0.09],[B*8+H*7.5,784,0.08,0.09],
        ].forEach(([o,f,d,v]) => this._n(f, s+o, d, v, 'square'));

        // Hi-hats every half-beat
        for (let i = 0; i < 32; i++) this._hat(s + i * H, i % 2 === 0 ? 0.09 : 0.05);

        this._loopTout = setTimeout(() => this._schedule(s + loop), (loop - 0.35) * 1000);
    }
}

// ─── GAMEPLAY MUSIC ───────────────────────────────────────────────────────────

class GameMusic {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()      { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.10,.7); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    fadeIn()     { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.10,.7); }
    stop()       { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.3); }
    setVol(f)    { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)     { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _hat(t,v){
        const l=Math.ceil(this.ctx.sampleRate*.045),b=this.ctx.createBuffer(1,l,this.ctx.sampleRate),d=b.getChannelData(0);
        for(let i=0;i<l;i++) d[i]=Math.random()*2-1;
        const s=this.ctx.createBufferSource(); s.buffer=b;
        const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=5500;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.04);
        s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
        setTimeout(()=>{try{s.disconnect();f.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+.09))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/148, H=B/2, L=B*16; // D minor 148 BPM 4-bar loop

        // Bass (sawtooth) — D minor groove
        [[0,147,B*.85,.34],[B,147,H*.8,.26],[B*1.5,131,H*.8,.24],[B*2,110,B*.85,.30],[B*3,98,B*.85,.28],
         [B*4,117,B*.85,.32],[B*5,117,H*.8,.24],[B*5.5,98,H*.8,.22],[B*6,131,B*.85,.28],[B*7,147,B*.85,.30],
         [B*8,147,B*.85,.32],[B*9,175,H*.8,.26],[B*9.5,147,H*.8,.22],[B*10,131,B*.85,.28],[B*11,110,B*.85,.26],
         [B*12,175,B*.85,.30],[B*13,147,H*.8,.24],[B*13.5,131,H*.8,.22],[B*14,110,B*.85,.28],[B*15,147,B*.85,.30]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));

        // Melody (square) — D5=587 F5=698 C5=523 A4=440 G4=392 Bb4=466
        [[0,587,H*.8,.20],[H,698,H*.8,.18],[B,587,H*.8,.20],[B*1.5,523,H*.8,.18],
         [B*2,466,H*.8,.20],[B*2.5,440,H*.8,.18],[B*3,392,B*.8,.20],[B*3.5,440,H*.8,.18],
         [B*4,587,H*.8,.22],[B*4.5,698,H*.8,.18],[B*5,587,B*.8,.20],[B*5.5,523,H*.8,.18],
         [B*6,440,B*.8,.20],[B*7,466,B*.8,.18],
         [B*8,784,H*.8,.22],[B*8.5,698,H*.8,.18],[B*9,587,H*.8,.22],[B*9.5,698,H*.8,.18],
         [B*10,784,B*.8,.22],[B*11,698,B*.8,.18],
         [B*12,587,H*.8,.20],[B*12.5,523,H*.8,.18],[B*13,466,H*.8,.20],[B*13.5,440,H*.8,.18],
         [B*14,392,B*1.8,.20],[B*15.5,587,H*.75,.22]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));

        // 16th-note arp (D minor pentatonic: 294 349 392 440 523 587 698 784) — first 2 bars only
        [294,349,392,440,523,587,698,784,784,698,587,523,440,392,349,294].forEach((f,i)=>this._n(f,s+i*(H/2),.07,.08,'square'));

        for(let i=0;i<32;i++) this._hat(s+i*H, i%2===0?.10:.06);
        this._loop=setTimeout(()=>this._sched(s+L),(L-.35)*1000);
    }
}

class BossMusic {
    constructor(ctx) {
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=0; this.master.connect(ctx.destination);
        this._on=false; this._loop=null; this._vf=1; this._lastV=0; this._fadeStop=null;
    }
    start()      { if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.05);} this._g(.14,.5); }
    fadeOut(t=1.5){ this._g(0,t/3.5); if(this._fadeStop)clearTimeout(this._fadeStop); this._fadeStop=setTimeout(()=>{this._fadeStop=null;this.stop();},(t+1.0)*1000); }
    stop()       { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} if(this._fadeStop){clearTimeout(this._fadeStop);this._fadeStop=null;} this._g(0,.3); }
    setVol(f)    { this._vf=f; this._g(this._lastV,0.2); }
    _g(v,tc)     { this._lastV=v; const g=this.master.gain; g.cancelScheduledValues(this.ctx.currentTime); g.setTargetAtTime(v*this._vf,this.ctx.currentTime,tc); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _kick(t,v){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type='sine';
        o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(28,t+.12);
        g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.14);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+.15);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+.2))*1000);
    }
    _hat(t,v){
        const l=Math.ceil(this.ctx.sampleRate*.04),b=this.ctx.createBuffer(1,l,this.ctx.sampleRate),d=b.getChannelData(0);
        for(let i=0;i<l;i++) d[i]=Math.random()*2-1;
        const s=this.ctx.createBufferSource(); s.buffer=b;
        const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7000;
        const g=this.ctx.createGain(); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+.035);
        s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
        setTimeout(()=>{try{s.disconnect();f.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+.09))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/168, H=B/2, L=B*16; // A minor Phrygian 168 BPM 4-bar

        // Heavy bass (sawtooth) — E2=82 F2=87 G2=98 A2=110 Bb2=117 D3=147 C3=131
        [[0,82,H*.8,.42],[H,82,H*.75,.36],[B,87,H*.8,.40],[B*1.5,98,H*.75,.36],
         [B*2,110,H*.8,.42],[B*2.5,117,H*.75,.36],[B*3,98,H*.8,.40],[B*3.5,87,H*.75,.36],
         [B*4,82,H*.8,.42],[B*4.5,82,H*.75,.36],[B*5,87,H*.8,.40],[B*5.5,82,H*.75,.36],
         [B*6,110,H*.8,.42],[B*6.5,117,H*.75,.36],[B*7,131,H*.8,.40],[B*7.5,110,H*.75,.36],
         [B*8,82,H*.8,.44],[B*8.5,82,H*.75,.38],[B*9,87,H*.8,.42],[B*9.5,98,H*.75,.38],
         [B*10,147,H*.8,.42],[B*10.5,131,H*.75,.36],[B*11,110,H*.8,.40],[B*11.5,98,H*.75,.36],
         [B*12,82,H*.8,.44],[B*12.5,82,H*.75,.38],[B*13,87,H*.8,.42],[B*13.5,87,H*.75,.36],
         [B*14,82,B*.85,.42],[B*15,82,B*.85,.40]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));

        // Aggressive melody (square) — A5=880 G5=784 F5=698 E5=659 D5=587 Eb5=622
        [[0,880,H*.7,.24],[H,784,H*.7,.20],[B,659,H*.7,.24],[B*1.5,784,H*.7,.20],
         [B*2,880,H*.7,.26],[B*2.5,880,H*.7,.22],[B*3,784,H*.7,.24],[B*3.5,659,H*.7,.20],
         [B*4,698,H*.7,.22],[B*4.5,784,H*.7,.20],[B*5,880,H*.7,.24],[B*5.5,784,H*.7,.20],
         [B*6,698,H*.7,.22],[B*6.5,659,H*.7,.20],[B*7,622,H*.7,.24],[B*7.5,587,H*.7,.20],
         [B*8,880,H*.7,.26],[B*8.5,880,H*.7,.22],[B*9,1047,H*.7,.26],[B*9.5,880,H*.7,.22],
         [B*10,784,H*.7,.22],[B*10.5,659,H*.7,.20],[B*11,698,H*.7,.22],[B*11.5,659,H*.7,.20],
         [B*12,784,H*.7,.24],[B*12.5,880,H*.7,.26],[B*13,784,H*.7,.22],[B*13.5,659,H*.7,.22],
         [B*14,622,B*.7,.26],[B*15,587,B*.7,.24]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));

        for(let i=0;i<16;i++) this._kick(s+i*B, i%2===0?.58:.38);
        for(let i=0;i<32;i++) this._hat(s+i*H, i%4===0?.12:i%2===0?.08:.05);
        this._loop=setTimeout(()=>this._sched(s+L),(L-.35)*1000);
    }
}

class VictoryMusic {
    constructor(ctx){
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=.15; this.master.connect(ctx.destination);
        this._on=false; this._loop=null;
    }
    start(){ if(!this._on){this._on=true;this._sched(this.ctx.currentTime+.1);} }
    stop() { this._on=false; if(this._loop){clearTimeout(this._loop);this._loop=null;} this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.5); }
    _n(f,t,d,v,w='square'){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain();
        o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
        setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
    }
    _sched(s){
        if(!this._on) return;
        const B=60/132, H=B/2, L=B*16; // C major triumphant 132 BPM

        // Bass (sawtooth) C major
        [[0,131,B*.85,.28],[B*2,165,B*.85,.26],[B*4,196,B*.85,.28],[B*6,131,B*.85,.26],
         [B*8,131,B*.85,.30],[B*10,165,B*.85,.28],[B*12,262,B*.85,.30],[B*14,196,B*.85,.28]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'sawtooth'));

        // Triumphant melody — C5=523 E5=659 G5=784 A5=880 C6=1047
        [[0,523,H*.8,.22],[H,659,H*.8,.20],[B,784,H*.8,.22],[B*1.5,880,H*.8,.20],
         [B*2,1047,B*1.8,.26],[B*4,880,H*.8,.22],[B*4.5,784,H*.8,.20],
         [B*5,659,H*.8,.22],[B*5.5,784,H*.8,.20],[B*6,880,B*.8,.24],[B*7,784,B*.8,.20],
         [B*8,523,H*.8,.22],[B*8.5,659,H*.8,.20],[B*9,784,H*.8,.22],[B*9.5,659,H*.8,.20],
         [B*10,523,B*1.8,.24],[B*12,659,H*.8,.22],[B*12.5,784,H*.8,.20],
         [B*13,880,H*.8,.22],[B*13.5,1047,H*.8,.24],[B*14,880,B*.8,.22],[B*15,784,B*.8,.20]
        ].forEach(([o,f,d,v])=>this._n(f,s+o,d,v,'square'));

        // Sparkling arp
        [523,659,784,880,1047,880,784,659,523,659,784,1047,1319,1047,784,659].forEach((f,i)=>this._n(f,s+i*H,.08,.10,'square'));

        this._loop=setTimeout(()=>this._sched(s+L),(L-.35)*1000);
    }
}

class GameOverMusic {
    constructor(ctx){
        this.ctx=ctx; this.master=ctx.createGain(); this.master.gain.value=.15; this.master.connect(ctx.destination);
    }
    play(){
        const s=this.ctx.currentTime+.1;
        const n=(f,t,d,v,w='sine')=>{
            const o=this.ctx.createOscillator(),g=this.ctx.createGain();
            o.type=w; o.frequency.value=f; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
            o.connect(g); g.connect(this.master); o.start(t); o.stop(t+d+.01);
            setTimeout(()=>{try{o.disconnect();g.disconnect();}catch(_){}},Math.max(0,(t-this.ctx.currentTime+d+.1))*1000);
        };
        // Slow descending A minor requiem
        [440,392,349,330,294,262,247,220].forEach((f,i)=>{
            n(f,   s+i*.55, .50, .28-.02*i, 'sine');
            n(f/2, s+i*.55, .48, .22-.015*i,'sawtooth');
        });
        n(110, s+4.6, 2.8, .32, 'sawtooth'); // low drone
        n(220, s+4.6, 2.5, .20, 'sine');
        n(165, s+5.0, 2.2, .16, 'sine');     // melancholic E3
    }
}

// ─── PRELOAD ──────────────────────────────────────────────────────────────────

class PreloadScene extends Phaser.Scene {
    constructor() { super({ key: 'PreloadScene' }); }

    preload() {
        this.add.rectangle(W / 2, H / 2, 204, 24, 0x111111);
        const bar = this.add.rectangle(W / 2 - 100, H / 2, 4, 16, 0x44eeaa).setOrigin(0, 0.5);
        this.add.text(W / 2, H / 2 + 26, 'LOADING', {
            fontSize: '11px', fill: '#888', fontFamily: 'monospace'
        }).setOrigin(0.5);
        this.load.on('progress', p => { bar.width = 200 * p; });

        // Backgrounds
        this.load.image('bg-deep',     BASE + 'Warped/Environments/space_background_pack/Blue Version/layered/blue-with-stars.png');
        this.load.image('bg-stars',    BASE + 'Warped/Environments/space_background_pack/Blue Version/layered/blue-stars.png');
        this.load.image('planet-big',  BASE + 'Warped/Environments/space_background_pack/Blue Version/layered/prop-planet-big.png');
        this.load.image('planet-small',BASE + 'Warped/Environments/space_background_pack/Blue Version/layered/prop-planet-small.png');
        this.load.image('stage-back',  BASE + 'Warped/Environments/top-down-space-environment/PNG/layers/stage-back.png');

        // Player ship (PixelLab)
        this.load.image('ship',            BASE + 'Warped/Characters/Warped Vehicles Files/vehicle 3/Sprites/vehicle-3.png');
        [1,2,3].forEach(i => this.load.image(`thrust${i}`, BASE + `Warped/Characters/Warped Vehicles Files/vehicle 3/Sprites/frames-thrust/thrust-bottom/thrust-bottom${i}.png`));
        this.load.image('pship',           'assets/pship.png');
        this.load.image('pexhaust-puff',   'assets/pexhaust-puff.png');
        this.load.image('pexhaust-smudge', 'assets/pexhaust-smudge.png');
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pship-a${i}`,          `assets/pship-a${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pexhaust-puff-a${i}`,  `assets/pexhaust-puff-a${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pexhaust-smudge-a${i}`,`assets/pexhaust-smudge-a${i}.png`));
        // New symmetric top-down ship (no rotation needed)
        this.load.image('pship2', 'assets/pship2.png');
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pship2-a${i}`, `assets/pship2-a${i}.png`));
        // pship3: 64x64 colorful ship with canvas-recolored nozzles
        this.load.image('pship3', 'assets/pship3.png');
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pship3-a${i}`, `assets/pship3-a${i}.png`));

        // Player bolt
        [1,2,3,4].forEach(i => this.load.image(`bolt${i}`, BASE + `Explosions and Magic/Warped shooting fx/Bolt/sprites/bolt${i}.png`));

        // Hit FX 1
        [1,2,3,4,5].forEach(i => this.load.image(`hit${i}`, BASE + `Explosions and Magic/Warped shooting fx/hits/hits-1/sprites/hits-1-${i}.png`));

        // Hit FX 2
        [1,2,3,4,5,6,7].forEach(i => this.load.image(`hit2-${i}`, BASE + `Explosions and Magic/Warped shooting fx/hits/Hits-2/sprites/hits-2-${i}.png`));

        // Flying Eye
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`enemy${i}`, BASE + `Gothicvania/Characters/flying-eye-demon/Sprites/flying-eye-demon${i}.png`));

        // Stage 3 enemies
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`alien${i}`, BASE + `Warped/Characters/alien-flying-enemy/sprites/alien-enemy-flying${i}.png`));
        this.load.image('spaceship-unit', BASE + 'Warped/Characters/spaceship-unit/Spritesheets/separated sprites/spaceship-unit.png');

        // Enemy-01 (tougher shooter) and Enemy-02 (kamikaze drone)
        const E01 = BASE + 'Warped/Characters/top-down-shooter-enemies/sprites/enemy-01/';
        this.load.image('e01-1', E01 + '_0000_Layer-1.png');
        this.load.image('e01-2', E01 + '_0001_Layer-2.png');
        this.load.image('e01-3', E01 + '_0002_Layer-3.png');
        this.load.image('e01-4', E01 + '_0003_4.png');
        this.load.image('e01-5', E01 + '_0004_5.png');
        const E02 = BASE + 'Warped/Characters/top-down-shooter-enemies/sprites/enemy-02/';
        this.load.image('e02-1', E02 + '_0000_Layer-1.png');
        this.load.image('e02-2', E02 + '_0001_Layer-2.png');
        this.load.image('e02-3', E02 + '_0002_Layer-3.png');
        this.load.image('e02-4', E02 + '_0003_Layer-4.png');
        const E03 = BASE + 'Warped/Characters/top-down-shooter-enemies/sprites/enemy-03/';
        this.load.image('e03-1', E03 + '_0000_Layer-1.png');
        this.load.image('e03-2', E03 + '_0001_Layer-2.png');
        this.load.image('e03-3', E03 + '_0002_Layer-3.png');
        this.load.image('e03-4', E03 + '_0003_Layer-4.png');
        const MECH = BASE + 'Warped/Characters/mech-unit/sprites/';
        [1,2,3,4,5,6,7,8,9,10].forEach(i => this.load.image(`mech${i}`, MECH + `mech-unit-export${i}.png`));

        // Vehicle 1 — mid-boss replacement
        const V1 = BASE + 'Warped/Characters/Warped Vehicles Files/vehicle 1/Sprites/';
        this.load.image('v1-1', V1 + 'vehicle-1.png');
        this.load.image('v1-2', V1 + 'vehicle-2.png');
        this.load.image('v1-3', V1 + 'vehicle-3.png');

        // Demon — kept for Stage 3 / future use
        const DEM = BASE + 'Gothicvania/Characters/demon-Files/Sprites/Idle/';
        [1,2,3,4,5,6].forEach(i => this.load.image(`dem${i}`, DEM + `idle${i}.png`));

        // Interceptor — Stage 2 final boss (PixelLab animated, 9 frames)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`bint${i}`, `assets/boss-interceptor-frame${i}.png`));

        // Void Wraith — Stage 3 mid-boss (PixelLab animated, 9 frames)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`bvw${i}`, `assets/boss-void-wraith-frame${i}.png`));

        // Space Demon — Stage 3 final boss / The Leviathan (PixelLab animated, 9 frames)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`bsd${i}`, `assets/boss-space-demon-frame${i}.png`));

        // Void Leech tongue — animated projectile sprite
        Array.from({length:9},(_,i)=>i).forEach(i => this.load.image(`tongue-${i}`, `assets/leech_tongue/tongue-${i}.png`));

        // Void Leech bonus — PixelLab nebula cloud sprites
        this.load.image('cloud-purple', 'assets/void_leech_clouds/cloud-purple.png');
        this.load.image('cloud-teal',   'assets/void_leech_clouds/cloud-teal.png');
        this.load.image('cloud-orange', 'assets/void_leech_clouds/cloud-orange.png');

        // PixelLab enemy sprites — Void Leech, Scarab Bomber, Spectrum Worm, Demon Hornet
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`vleech-m${i}`, `assets/void_leech/move-${i}.png`));
        Array.from({length:16},(_,i)=>i).forEach(i => this.load.image(`vleech-a${i}`, `assets/void_leech/attack-${i}.png`));
        // Prism Boss (Jellyfish)
        this.load.image('pboss-idle', 'assets/prism_boss/idle.png');
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pboss-m${i}`,     `assets/prism_boss/move-${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pboss-atent${i}`, `assets/prism_boss/atk-tent-${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`pboss-abeam${i}`, `assets/prism_boss/atk-beam-${i}.png`));
        // Mimic
        this.load.image('mimic2-idle', 'assets/mimic/idle.png');
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`mimic2-m${i}`, `assets/mimic/move-${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`mimic2-a${i}`, `assets/mimic/atk-${i}.png`));
        Array.from({length:16},(_,i)=>i).forEach(i => this.load.image(`scarab-m${i}`, `assets/scarab_bomber/move-${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`worm-m${i}`, `assets/spectrum_worm/move-${i}.png`));
        Array.from({length:16},(_,i)=>i).forEach(i => this.load.image(`worm-a${i}`, `assets/spectrum_worm/attack-${i}.png`));
        Array.from({length:16},(_,i)=>i).forEach(i => this.load.image(`hornet-m${i}`, `assets/demon_hornet/move-${i}.png`));
        Array.from({length:9}, (_,i)=>i).forEach(i => this.load.image(`hornet-sting-${i}`, `assets/hornet_sting/frame-${i}.png`));

        // Leviathan battle animations (PixelLab generated)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levHover${i}`,  `assets/lev-hover${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levAtk${i}`,    `assets/lev-atk-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levPhase${i}`,  `assets/lev-phase-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levRage${i}`,   `assets/lev-rage-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levBurst${i}`,  `assets/lev-burst-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levPBurst${i}`, `assets/lev-pburst-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`levPB2_${i}`, `assets/lev_phase_burst/${i}.png`));

        // Ion effects (PixelLab generated — animated)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`ionOrb${i}`,   `assets/ion-orb-a${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`ionFlash${i}`, `assets/ion-flash-a${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`ionBolt${i}`,  `assets/ion-bolt-b${i}.png`));

        // Leviathan attack effects (PixelLab generated)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`vp${i}`, `assets/vp-b${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`sb${i}`, `assets/sb-b${i}.png`));

        // Enemy projectile
        [1,2].forEach(i => this.load.image(`eproj${i}`, BASE + `Gothicvania/Misc/EnemyProjectile/Sprites/frame${i}.png`));

        // Asteroids
        [1,2,3,4,5].forEach(i => this.load.image(`asteroid${i}`, BASE + `Warped/Environments/top-down-space-environment/PNG/layers/cut-out-sprites/asteroid-0${i}.png`));

        // Death / explosion FX
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`edeath${i}`, BASE + `Explosions and Magic/EnemyDeath/Sprites/enemy-death${i}.png`));
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`xA${i}`, BASE + `Explosions and Magic/Explosions pack/explosion-1-a/Sprites/explosion-${i}.png`));
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`xB${i}`, BASE + `Explosions and Magic/Explosions pack/explosion-1-b/Sprites/explosion-1-b-${i}.png`));
        [1,2,3,4,5,6,7,8,9,10].forEach(i => this.load.image(`xC${i}`, BASE + `Explosions and Magic/Explosions pack/explosion-1-c/Sprites/explosion-c${i}.png`));

        // Large explosions for boss death
        [1,2,3,4,5,6,7,8,9,10,11,12].forEach(i => this.load.image(`xD${i}`, BASE + `Explosions and Magic/Explosions pack/explosion-1-d/Sprites/explosion-d${i}.png`));
        [1,2,3,4,5,6,7,8].forEach(i => this.load.image(`xF${i}`, BASE + `Explosions and Magic/Explosions pack/explosion-1-f/Sprites/explosion-f${i}.png`));

        // M10 — Prism crystal event + prism enemy (PixelLab generated)
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`prism-crystal-${i}`, `assets/prism-crystal-a${i}.png`));
        [0,1,2,3,4,5,6,7,8].forEach(i => this.load.image(`prism-enemy-${i}`,   `assets/prism-enemy-a${i}.png`));

        // Black hole
        this.load.image('blackhole', 'assets/blackhole.png');

        // Weapon power-up icons
        this.load.image('powerup-spread', 'assets/powerup-spread.png');
        this.load.image('powerup-twin',   'assets/powerup-twin.png');
        this.load.image('powerup-rapid',  'assets/powerup-rapid.png');

        // Boss – Top-Down Boss
        const TDBOSS = BASE + 'Warped/Characters/top-down-boss/PNG/sprites/';
        [0,1,2,3,4].forEach(i =>
            this.load.image(`tdb${i+1}`, TDBOSS + `boss/_000${i}_Layer-${i+1}.png`));
        Array.from({length: 11}, (_, i) =>
            this.load.image(`tdr${i+1}`, TDBOSS + `rays/_${String(i).padStart(4,'0')}_Layer-${i+1}.png`));
        [0,1].forEach(i =>
            this.load.image(`tdbl${i+1}`, TDBOSS + `bolt/_000${i}_Layer-${i === 0 ? 2 : 1}.png`));
    }

    create() {
        const A = this.anims;
        const f = (prefix, count) => Array.from({ length: count }, (_, i) => ({ key: `${prefix}${i + 1}` }));

        A.create({ key: 'enemy-fly',    frames: f('enemy',   8),  frameRate: 10, repeat: -1 });
        A.create({ key: 'alien-fly',    frames: f('alien',   8),  frameRate: 12, repeat: -1 });
        A.create({ key: 'biped-walk', frames: [
            { key: 'e01-1' }, { key: 'e01-2' }, { key: 'e01-3' }, { key: 'e01-4' }, { key: 'e01-5' }
        ], frameRate: 10, repeat: -1 });
        A.create({ key: 'drone-fly', frames: [
            { key: 'e02-1' }, { key: 'e02-2' }, { key: 'e02-3' }, { key: 'e02-4' }
        ], frameRate: 12, repeat: -1 });
        A.create({ key: 'carrier-move', frames: [
            { key: 'e03-1' }, { key: 'e03-2' }, { key: 'e03-3' }, { key: 'e03-4' }
        ], frameRate: 8, repeat: -1 });
        A.create({ key: 'mech-anim',    frames: f('mech', 10), frameRate: 10, repeat: -1 });
        A.create({ key: 'vehicle1-anim', frames: [{ key:'v1-1' },{ key:'v1-2' },{ key:'v1-3' }], frameRate: 8, repeat: -1 });
        A.create({ key: 'demon-idle',      frames: f('dem', 6), frameRate: 8, repeat: -1 });
        A.create({ key: 'interceptor-anim', frames: Array.from({length:9},(_,i)=>({key:`bint${i}`})), frameRate: 10, repeat: -1 });
        A.create({ key: 'void-wraith-anim',   frames: Array.from({length:9},(_,i)=>({key:`bvw${i}`})), frameRate: 9,  repeat: -1 });
        A.create({ key: 'space-demon-anim',    frames: Array.from({length:9},(_,i)=>({key:`bsd${i}`})),      frameRate: 9,  repeat: -1 });
        A.create({ key: 'lev-hover-anim',     frames: Array.from({length:9},(_,i)=>({key:`levHover${i}`})),  frameRate: 10, repeat: -1 });
        A.create({ key: 'lev-atk-anim',       frames: Array.from({length:9},(_,i)=>({key:`levAtk${i}`})),    frameRate: 13, repeat: 0  });
        A.create({ key: 'lev-phase-anim',     frames: Array.from({length:9},(_,i)=>({key:`levPhase${i}`})),  frameRate: 12, repeat: 0  });
        A.create({ key: 'lev-rage-anim',      frames: Array.from({length:9},(_,i)=>({key:`levRage${i}`})),   frameRate: 14, repeat: -1 });
        A.create({ key: 'lev-burst-anim',     frames: Array.from({length:9},(_,i)=>({key:`levBurst${i}`})),  frameRate: 18, repeat: 0  });
        A.create({ key: 'lev-pburst-anim',    frames: Array.from({length:9},(_,i)=>({key:`levPBurst${i}`})), frameRate: 14, repeat: 0  });
        A.create({ key: 'lev-pburst2-anim',   frames: Array.from({length:9},(_,i)=>({key:`levPB2_${i}`})),   frameRate: 12, repeat: 0  });
        A.create({ key: 'ion-orb-anim',   frames: Array.from({length:9},(_,i)=>({key:`ionOrb${i}`})),   frameRate: 14, repeat: -1 });
        A.create({ key: 'ion-flash-anim', frames: Array.from({length:9},(_,i)=>({key:`ionFlash${i}`})), frameRate: 16, repeat: 0  });
        A.create({ key: 'ion-bolt-anim',    frames: Array.from({length:9},(_,i)=>({key:`ionBolt${i}`})),  frameRate: 18, repeat: 0  });
        A.create({ key: 'void-pulse-anim',  frames: Array.from({length:9},(_,i)=>({key:`vp${i}`})),      frameRate: 14, repeat: 0  });
        A.create({ key: 'spiral-bolt-anim', frames: Array.from({length:9},(_,i)=>({key:`sb${i}`})),      frameRate: 16, repeat: -1 });
        A.create({ key: 'prism-crystal-anim', frames: Array.from({length:9},(_,i)=>({key:`prism-crystal-${i}`})), frameRate: 10, repeat: -1 });
        A.create({ key: 'prism-enemy-anim',   frames: Array.from({length:9},(_,i)=>({key:`prism-enemy-${i}`})),   frameRate: 10, repeat: -1 });
        A.create({ key: 'thrust-anim',  frames: f('thrust',  3),  frameRate: 12, repeat: -1 });
        A.create({ key: 'bolt-anim',    frames: f('bolt',    4),  frameRate: 15, repeat: -1 });
        A.create({ key: 'pship-thruster',     frames: Array.from({length:9},(_,i)=>({key:`pship-a${i}`})),          frameRate: 10, repeat: -1 });
        A.create({ key: 'pship2-thruster',    frames: Array.from({length:9},(_,i)=>({key:`pship2-a${i}`})),         frameRate: 10, repeat: -1 });
        A.create({ key: 'pship3-thruster',    frames: Array.from({length:9},(_,i)=>({key:`pship3-a${i}`})),         frameRate: 10, repeat: -1 });
        A.create({ key: 'pexhaust-puff-anim', frames: Array.from({length:9},(_,i)=>({key:`pexhaust-puff-a${i}`})),  frameRate: 12, repeat: 0  });
        A.create({ key: 'pexhaust-smudge-anim',frames:Array.from({length:9},(_,i)=>({key:`pexhaust-smudge-a${i}`})),frameRate: 12, repeat: 0  });
        A.create({ key: 'eproj-anim',   frames: f('eproj',   2),  frameRate: 8,  repeat: -1 });
        A.create({ key: 'hit-anim',     frames: f('hit',     5),  frameRate: 20, repeat: 0  });
        A.create({ key: 'hit2-anim',    frames: f('hit2-',   7),  frameRate: 20, repeat: 0  });
        A.create({ key: 'death-anim',   frames: f('edeath',  8),  frameRate: 15, repeat: 0  });
        A.create({ key: 'xA',           frames: f('xA',      8),  frameRate: 15, repeat: 0  });
        A.create({ key: 'xB',           frames: f('xB',      8),  frameRate: 15, repeat: 0  });
        A.create({ key: 'xC',           frames: f('xC',      10), frameRate: 15, repeat: 0  });
        A.create({ key: 'xD',           frames: f('xD',      12), frameRate: 18, repeat: 0  });
        A.create({ key: 'xF',           frames: f('xF',      8),  frameRate: 15, repeat: 0  });
        A.create({ key: 'td-boss', frames: f('tdb',  5),  frameRate: 8,  repeat: -1 });
        A.create({ key: 'td-rays', frames: f('tdr',  11), frameRate: 12, repeat: -1 });
        A.create({ key: 'td-bolt', frames: f('tdbl', 2),  frameRate: 10, repeat: -1 });
        // PixelLab enemies
        A.create({ key: 'vleech-move',  frames: Array.from({length:9}, (_,i)=>({key:`vleech-m${i}`})), frameRate: 10, repeat: -1 });
        A.create({ key: 'tongue-fly',   frames: Array.from({length:9}, (_,i)=>({key:`tongue-${i}`})),   frameRate: 14, repeat: -1 });
        A.create({ key: 'vleech-atk',  frames: Array.from({length:16},(_,i)=>({key:`vleech-a${i}`})), frameRate: 12, repeat: 0  });
        A.create({ key: 'scarab-move', frames: Array.from({length:16},(_,i)=>({key:`scarab-m${i}`})), frameRate: 10, repeat: -1 });
        // Prism Boss
        A.create({ key: 'pboss-move',     frames: Array.from({length:9},(_,i)=>({key:`pboss-m${i}`})),     frameRate: 8,  repeat: -1 });
        A.create({ key: 'pboss-atk-tent', frames: Array.from({length:9},(_,i)=>({key:`pboss-atent${i}`})), frameRate: 10, repeat: 0  });
        A.create({ key: 'pboss-atk-beam', frames: Array.from({length:9},(_,i)=>({key:`pboss-abeam${i}`})), frameRate: 10, repeat: 0  });
        // Mimic
        A.create({ key: 'mimic2-move', frames: Array.from({length:9},(_,i)=>({key:`mimic2-m${i}`})), frameRate: 10, repeat: -1 });
        A.create({ key: 'mimic2-atk',  frames: Array.from({length:9},(_,i)=>({key:`mimic2-a${i}`})), frameRate: 12, repeat: 0  });
        A.create({ key: 'worm-move',   frames: Array.from({length:9}, (_,i)=>({key:`worm-m${i}`})),   frameRate: 10, repeat: -1 });
        A.create({ key: 'worm-atk',    frames: Array.from({length:16},(_,i)=>({key:`worm-a${i}`})),   frameRate: 12, repeat: 0  });
        A.create({ key: 'hornet-move',  frames: Array.from({length:16},(_,i)=>({key:`hornet-m${i}`})),      frameRate: 12, repeat: -1 });
        A.create({ key: 'hornet-sting', frames: Array.from({length:9}, (_,i)=>({key:`hornet-sting-${i}`})), frameRate: 14, repeat: -1 });

        this.scene.start('MenuScene');
    }
}

// ─── MENU ─────────────────────────────────────────────────────────────────────

class MenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MenuScene' }); }

    create() {
        this.add.rectangle(W / 2, H / 2, W, H, 0x00000f);
        for (let i = 0; i < 90; i++) {
            this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.15, 0.9)
            );
        }

        // Drifting ship silhouette
        const sil = this.add.graphics().setAlpha(0.07).setDepth(0);
        sil.fillStyle(0x3366ff, 1);
        sil.fillTriangle(0, 20, -14, -6, 14, -6);
        sil.fillTriangle(-14, -6, -20, 14, 0, 2);
        sil.fillTriangle(14, -6, 20, 14, 0, 2);
        sil.x = 30; sil.y = H - 30;
        this.tweens.add({ targets: sil, x: W - 30, y: 40, duration: 13000, ease: 'Linear', yoyo: true, repeat: -1 });

        const spaceTxt = this.add.text(W / 2, H / 2 - 155, 'GALACTIC', {
            fontFamily: 'monospace', fontSize: '52px', fill: '#4488ff',
            stroke: '#000044', strokeThickness: 10
        }).setOrigin(0.5);
        const shooterTxt = this.add.text(W / 2, H / 2 - 88, 'FURY', {
            fontFamily: 'monospace', fontSize: '64px', fill: '#ffffff',
            stroke: '#000066', strokeThickness: 10
        }).setOrigin(0.5);
        this.tweens.add({ targets: [spaceTxt, shooterTxt], scaleX: 1.014, scaleY: 1.014, duration: 2800, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        // Hi score — best across all difficulties
        const _diffScores = ['easy','normal','hard'].map(d => parseInt(localStorage.getItem(`space-shooter-hiscore-${d}`) || '0', 10));
        const best = Math.max(0, ..._diffScores);
        if (best > 0) {
            this.add.text(W / 2, H / 2 - 30, 'BEST  ' + String(best).padStart(8, '0'), {
                fontFamily: 'monospace', fontSize: '14px', fill: '#44ffaa',
                stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5);
        }

        // ── Game start options ────────────────────────────────────────────────
        const stage4Unlocked = localStorage.getItem('space-shooter-stage4-unlocked') === '1';

        const prompt = this.add.text(W / 2, 362, '▶  SPACE  to  Start  ◀', {
            fontFamily: 'monospace', fontSize: '22px', fill: '#ffee44',
            stroke: '#220000', strokeThickness: 5
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.1, duration: 550, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        this.add.text(W / 2, 394, 'E  —  Endless  Mode', {
            fontFamily: 'monospace', fontSize: '13px', fill: '#ff88ff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);


        // ── Navigable menu items ────────────────────────────────────────────
        this.diffs       = ['EASY', 'NORMAL', 'HARD'];
        this.selDiff     = parseInt(localStorage.getItem('space-shooter-diff-idx') || '1', 10);
        if (this.selDiff < 0 || this.selDiff > 2) this.selDiff = 1;
        this.selMenuItem = 0;
        this.menuItemTxts = [440, 462, 481].map(y =>
            this.add.text(W / 2, y, '', { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5)
        );
        this._refreshMenuItems();

        // ── Animated ship preview (stored for live color update) ──────────
        const _shipColor   = parseInt(localStorage.getItem('space-shooter-ship-color')   || '') || 0x00aaff;
        const _thrustColor = parseInt(localStorage.getItem('space-shooter-thrust-color') || '') || 0x00ffee;
        this._menuPreviewShip = this.add.sprite(W / 2, 540, 'pship3-a0').play('pship3-thruster').setScale(1.2).setTint(_shipColor);
        this.tweens.add({ targets: this._menuPreviewShip, y: 534, duration: 900, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
        this._menuExhaustGlow = this.add.ellipse(W / 2, 558, 16, 9, _thrustColor, 0.5);
        this.tweens.add({ targets: this._menuExhaustGlow, scaleY: 1.7, scaleX: 0.6, alpha: 0.15, duration: 420, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

        // ── Bottom bar ────────────────────────────────────────────────────
        this.add.text(W / 2, H - 54, 'SPACE  start    E  endless    C  credits    H  guide', {
            fontFamily: 'monospace', fontSize: '9px', fill: '#666', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add.text(W / 2, H - 38, '↑↓ / WS  navigate     ENTER  open', {
            fontFamily: 'monospace', fontSize: '9px', fill: '#555', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add.text(W - 8, H - 8, 'v1.0', {
            fontFamily: 'monospace', fontSize: '10px', fill: '#333333'
        }).setOrigin(1, 1);

        // ── Key handlers ──────────────────────────────────────────────────
        const _guard  = () => this._htpOpen || this._customOpen || this._diffOpen || this._settingsOpen;
        const _menuUp = () => { if (_guard()) return; this.selMenuItem = (this.selMenuItem - 1 + 3) % 3; this._refreshMenuItems(); this._playSelectSound(); };
        const _menuDn = () => { if (_guard()) return; this.selMenuItem = (this.selMenuItem + 1)     % 3; this._refreshMenuItems(); this._playSelectSound(); };
        const _menuOk = () => {
            if (_guard()) return;
            if      (this.selMenuItem === 0) this._openDiffPanel();
            else if (this.selMenuItem === 1) this._openCustomize();
            else                             this._openSettingsPanel();
        };
        this.input.keyboard.on('keydown-UP',    _menuUp);
        this.input.keyboard.on('keydown-W',     _menuUp);
        this.input.keyboard.on('keydown-DOWN',  _menuDn);
        this.input.keyboard.on('keydown-S',     _menuDn);
        this.input.keyboard.on('keydown-ENTER', _menuOk);
        this.input.keyboard.on('keydown-SPACE', () => {
            if (_guard() || this._leaving) return;
            this._leaving = true;
            this._playStartSound();
            if (this._music) { this._music.stop(); this._music = null; }
            this.scene.start('GameScene', { difficulty: this.diffs[this.selDiff].toLowerCase() });
        });
        this.input.keyboard.on('keydown-C', () => {
            if (_guard() || this._leaving) return;
            if (this._music) { this._music.stop(); this._music = null; }
            this.scene.start('CreditsScene');
        });
        this.input.keyboard.on('keydown-H', () => { if (!_guard()) this._openMenuHTP(); });
        this.input.keyboard.on('keydown-O', () => { if (!_guard()) this._openCustomize(); });
        this.input.keyboard.on('keydown-E', () => {
            if (_guard() || this._leaving) return;
            this._leaving = true;
            this._playStartSound();
            if (this._music) { this._music.stop(); this._music = null; }
            this.scene.start('GameScene', { difficulty: this.diffs[this.selDiff].toLowerCase(), endless: true });
        });
        if (stage4Unlocked) {
            this.input.keyboard.on('keydown-P', () => {
                if (_guard() || this._leaving) return;
                this._leaving = true;
                this._playStartSound();
                if (this._music) { this._music.stop(); this._music = null; }
                this.scene.start('GameScene', { difficulty: this.diffs[this.selDiff].toLowerCase(), prism: true });
            });
        }

        // Music — start immediately if AudioContext already active, else on first key
        this._music      = null;
        this._leaving    = false;
        this._htpOpen    = false;
        this._customOpen = false;
        this._diffOpen   = false;
        this._settingsOpen = false;
        this._startMusic();
        this.input.keyboard.once('keydown', () => this._startMusic());
        this.events.once('shutdown', () => { if (this._music) { this._music.stop(); this._music = null; } });
    }

    _startMusic() {
        if (this._music || this._leaving) return;
        if (localStorage.getItem('space-shooter-music') === 'off') return;
        if (!this.sound || !this.sound.context) return;
        this.sound.context.resume().then(() => {
            if (this._music || this._leaving) return;
            this._music = new MenuMusic(this.sound.context);
            this._music.start();
        }).catch(() => {});
    }

    _playStartSound() {
        if (localStorage.getItem('space-shooter-sfx') === 'off') return;
        if (!this.sound || !this.sound.context) return;
        this.sound.context.resume().then(() => {
            new SoundFX(this.sound.context).startGame();
        }).catch(() => {});
    }

    _playSelectSound() {
        if (localStorage.getItem('space-shooter-sfx') === 'off') return;
        if (!this.sound || !this.sound.context) return;
        this.sound.context.resume().then(() => {
            new SoundFX(this.sound.context).difficultySelect();
        }).catch(() => {});
    }

    _refreshMenuItems() {
        const diffCols = ['#44ff88', '#ffee88', '#ff5555'];
        const labels   = [
            `DIFFICULTY:  ${this.diffs[this.selDiff]}`,
            'SHIP  COLORS',
            'SETTINGS',
        ];
        this.menuItemTxts.forEach((t, i) => {
            const sel = i === this.selMenuItem;
            const col = i === 0 ? diffCols[this.selDiff] : (sel ? '#ffee88' : '#3a5060');
            if (sel) {
                t.setText(`▶  ${labels[i]}  ◀`);
                t.setStyle({ fontFamily: 'monospace', fontSize: '14px', fill: col, stroke: '#000', strokeThickness: 3 });
            } else {
                t.setText(labels[i]);
                t.setStyle({ fontFamily: 'monospace', fontSize: '12px', fill: col, stroke: '#000', strokeThickness: 2 });
            }
        });
    }

    _refreshDiff() { this._refreshMenuItems(); }

    _updateShipPreview() {
        const sc = parseInt(localStorage.getItem('space-shooter-ship-color')   || '') || 0x00aaff;
        const tc = parseInt(localStorage.getItem('space-shooter-thrust-color') || '') || 0x00ffee;
        if (this._menuPreviewShip)  this._menuPreviewShip.setTint(sc);
        if (this._menuExhaustGlow)  this._menuExhaustGlow.setFillStyle(tc, 0.5);
    }

    _openDiffPanel() {
        if (this._diffOpen) return;
        this._diffOpen = true;

        const descs = [
            'Forgiving damage  ·  slower enemies\nGreat for learning the ropes',
            'Balanced challenge\nThe intended experience',
            'Fast enemies  ·  brutal damage\nFor veterans only',
        ];
        const cols = ['#44ff88', '#ffee88', '#ff5555'];
        let sel = this.selDiff;

        const D   = 20;
        const bg  = this.add.rectangle(W / 2, H / 2, W, H, 0x000011, 0.93).setDepth(D);
        const S   = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };
        const SEP = '──────────────────────────────────';
        let objs  = [];

        const T = (x, y, txt, sz, col, ox = 0.5) => {
            const t = this.add.text(x, y, txt, { ...S, fontSize: sz, fill: col })
                .setOrigin(ox, 0.5).setDepth(D + 1);
            objs.push(t); return t;
        };

        const render = () => {
            objs.forEach(o => o.destroy()); objs = [];
            let y = H / 2 - 148;
            T(W/2, y, 'SELECT  DIFFICULTY', '14px', '#ffee00');         y += 24;
            T(W/2, y, SEP, '11px', '#333333');                           y += 30;
            ['EASY', 'NORMAL', 'HARD'].forEach((name, i) => {
                const active = i === sel;
                T(W/2, y, active ? `▶  ${name}  ◀` : name,
                    active ? '22px' : '14px', active ? cols[i] : '#444444');
                y += active ? 36 : 28;
            });
            T(W/2, y, SEP, '11px', '#333333');                           y += 22;
            T(W/2, y, descs[sel], '12px', '#8899aa');                   y += 44;
            T(W/2, y, SEP, '11px', '#333333');                           y += 20;
            T(W/2, y, '↑↓ WS AD ← →  change     ENTER  confirm     ESC  cancel', '11px', '#777777');
        };
        render();

        const kb = this.input.keyboard;
        const _close = (save) => {
            bg.destroy(); objs.forEach(o => o.destroy());
            this._diffOpen = false;
            kb.off('keydown-UP',    _prev); kb.off('keydown-LEFT',  _prev); kb.off('keydown-W', _prev); kb.off('keydown-A', _prev);
            kb.off('keydown-DOWN',  _next); kb.off('keydown-RIGHT', _next); kb.off('keydown-S', _next); kb.off('keydown-D', _next);
            kb.off('keydown-ENTER', _confirm); kb.off('keydown-ESC', _cancel);
            if (save) {
                this.selDiff = sel;
                localStorage.setItem('space-shooter-diff-idx', sel.toString());
                this._refreshMenuItems();
                this._playSelectSound();
            }
        };
        const _prev    = () => { if (sel > 0) { sel--; render(); this._playSelectSound(); } };
        const _next    = () => { if (sel < 2) { sel++; render(); this._playSelectSound(); } };
        const _confirm = () => _close(true);
        const _cancel  = () => _close(false);
        kb.on('keydown-UP',    _prev); kb.on('keydown-LEFT',  _prev); kb.on('keydown-W', _prev); kb.on('keydown-A', _prev);
        kb.on('keydown-DOWN',  _next); kb.on('keydown-RIGHT', _next); kb.on('keydown-S', _next); kb.on('keydown-D', _next);
        kb.on('keydown-ENTER', _confirm); kb.on('keydown-ESC', _cancel);
    }

    _openSettingsPanel() {
        if (this._settingsOpen) return;
        this._settingsOpen = true;

        const KEYS   = ['space-shooter-music', 'space-shooter-sfx', 'space-shooter-shake', 'space-shooter-combopop'];
        const LABELS = ['MUSIC', 'SFX', 'SCREEN SHAKE', 'COMBO POPUPS'];
        const DESCS  = [
            'Background music on or off',
            'Sound effects on or off',
            'Camera shake when taking damage',
            'Show COMBO ×2 ×3 ×4 popups',
        ];
        let vals   = KEYS.map(k => (localStorage.getItem(k) || 'on') === 'on');
        let selSet = 0;

        const D   = 20;
        const bg  = this.add.rectangle(W / 2, H / 2, W, H, 0x000011, 0.93).setDepth(D);
        const S   = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };
        const SEP = '──────────────────────────────────';
        let objs  = [];

        const T = (x, y, txt, sz, col, ox = 0.5) => {
            const t = this.add.text(x, y, txt, { ...S, fontSize: sz, fill: col })
                .setOrigin(ox, 0.5).setDepth(D + 1);
            objs.push(t); return t;
        };

        const render = () => {
            objs.forEach(o => o.destroy()); objs = [];
            let y = H / 2 - 148;
            T(W/2, y, 'SETTINGS', '14px', '#ffee00');    y += 24;
            T(W/2, y, SEP, '11px', '#333333');            y += 30;
            LABELS.forEach((lbl, i) => {
                const active = i === selSet;
                const val    = vals[i];
                const valStr = val ? 'ON' : 'OFF';
                const valCol = val ? '#44ffaa' : '#ff5555';
                const dimCol = val ? '#2a5040' : '#502020';
                if (active) {
                    T(W/2, y, `▶  ${lbl}:  ${valStr}  ◀`, '16px', valCol); y += 28;
                    T(W/2, y, DESCS[i], '11px', '#667788');                 y += 30;
                } else {
                    T(W/2, y, `${lbl}:  ${valStr}`, '13px', dimCol);       y += 26;
                }
            });
            T(W/2, y, SEP, '11px', '#333333');            y += 20;
            T(W/2, y, '↑↓ WS  navigate     ← → AD  toggle     ESC  close', '11px', '#777777');
        };
        render();

        const kb = this.input.keyboard;
        const _close = () => {
            bg.destroy(); objs.forEach(o => o.destroy());
            this._settingsOpen = false;
            kb.off('keydown-UP',    _up);  kb.off('keydown-W', _up);
            kb.off('keydown-DOWN',  _dn);  kb.off('keydown-S', _dn);
            kb.off('keydown-LEFT',  _tog); kb.off('keydown-RIGHT', _tog); kb.off('keydown-A', _tog); kb.off('keydown-D', _tog);
            kb.off('keydown-ESC',   _close);
        };
        const _up  = () => { selSet = (selSet - 1 + 4) % 4; render(); this._playSelectSound(); };
        const _dn  = () => { selSet = (selSet + 1)     % 4; render(); this._playSelectSound(); };
        const _tog = () => {
            vals[selSet] = !vals[selSet];
            localStorage.setItem(KEYS[selSet], vals[selSet] ? 'on' : 'off');
            render(); this._playSelectSound();
            if (selSet === 0) {
                if (!vals[0]) { if (this._music) { this._music.stop(); this._music = null; } }
                else this._startMusic();
            }
        };
        kb.on('keydown-UP',    _up);  kb.on('keydown-W', _up);
        kb.on('keydown-DOWN',  _dn);  kb.on('keydown-S', _dn);
        kb.on('keydown-LEFT',  _tog); kb.on('keydown-RIGHT', _tog); kb.on('keydown-A', _tog); kb.on('keydown-D', _tog);
        kb.on('keydown-ESC',   _close);
    }

    _openCustomize() {
        if (this._customOpen) return;
        this._customOpen = true;

        const PALETTE = [
            0xff0000, 0xff4400, 0xff8800, 0xffbb00, 0xffee00,
            0xaaff00, 0x44ff00, 0x00ff44, 0x00ff99, 0x00ffee,
            0x00aaff, 0x0055ff, 0x3300ff, 0x7700ff, 0xcc00ff,
            0xff00cc, 0xff0066, 0xff0022,
            0xffffff, 0x888888,
        ];
        const PX = 31, PS = 22, PR = 9;

        const findIdx = (key, def) => {
            const v = parseInt(localStorage.getItem(key) || '') || def;
            const i = PALETTE.indexOf(v);
            return i < 0 ? PALETTE.indexOf(def) : i;
        };
        let idxs = [
            findIdx('space-shooter-thrust-color', 0x00ffee),
            findIdx('space-shooter-ship-color',   0x00aaff),
            findIdx('space-shooter-bolt-color',   0xffffff),
        ];
        if (idxs[0] < 0) idxs[0] = 9;
        if (idxs[1] < 0) idxs[1] = 10;
        if (idxs[2] < 0) idxs[2] = 18;
        let activeRow = 0;

        // [label y, circles y, swatch y, text, color, border color]
        const ROWS = [
            { ly: 118, ry: 140, sy: 176, label: 'THRUST  COLOR', col: '#00ffcc', bcol: 0x00ffcc },
            { ly: 203, ry: 225, sy: 261, label: 'SHIP  HULL  COLOR', col: '#ff88ff', bcol: 0xff88ff },
            { ly: 288, ry: 310, sy: 346, label: 'BOLT  COLOR',   col: '#ffcc44', bcol: 0xffcc44 },
        ];

        const D   = 20;
        const kb  = this.input.keyboard;
        const objs = [];

        const bg = this.add.rectangle(W/2, H/2, W, H, 0x000014, 0.95).setDepth(D).setInteractive();
        objs.push(bg);

        const T = (x, y, txt, size, col) => {
            const t = this.add.text(x, y, txt, {
                fontFamily: 'monospace', fontSize: size, fill: col,
                stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5).setDepth(D+1);
            objs.push(t);
            return t;
        };

        T(W/2, 72, 'SHIP  CUSTOMIZATION', '20px', '#00eedd');
        T(W/2, 96, '─'.repeat(38), '11px', '#1a3a55');
        ROWS.forEach(r => T(W/2, r.ly, r.label, '12px', r.col));
        T(W/2, 378, '↑↓  Switch row       ←→  Select color', '10px', '#5577aa');
        T(W/2, 398, 'ENTER  Save & Close      ESC  Cancel',   '10px', '#5577aa');

        const g = this.add.graphics().setDepth(D+1);
        objs.push(g);

        const render = () => {
            g.clear();
            ROWS.forEach((row, ri) => {
                const selIdx   = idxs[ri];
                const isActive = ri === activeRow;
                for (let i = 0; i < PALETTE.length; i++) {
                    g.fillStyle(PALETTE[i], 1);
                    g.fillCircle(PX + i * PS, row.ry, PR);
                    if (i === selIdx) {
                        g.lineStyle(2, isActive ? 0xffffff : 0x666666, 1);
                        g.strokeCircle(PX + i * PS, row.ry, PR + 3);
                    }
                }
                if (isActive) {
                    g.lineStyle(1.5, row.bcol, 0.6);
                    g.strokeRect(W/2 - 80, row.ly - 12, 160, 22);
                }
                g.fillStyle(PALETTE[selIdx], 1);
                g.fillCircle(W/2, row.sy, 14);
                g.lineStyle(1.5, 0xffffff, 0.4);
                g.strokeCircle(W/2, row.sy, 14);
            });
        };

        render();

        let _up, _down, _left, _right, _save, _cancel;

        const _close = () => {
            objs.forEach(o => o.destroy());
            kb.off('keydown-UP',    _up);
            kb.off('keydown-W',     _up);
            kb.off('keydown-DOWN',  _down);
            kb.off('keydown-S',     _down);
            kb.off('keydown-LEFT',  _left);
            kb.off('keydown-A',     _left);
            kb.off('keydown-RIGHT', _right);
            kb.off('keydown-D',     _right);
            kb.off('keydown-ENTER', _save);
            kb.off('keydown-ESC',   _cancel);
            kb.off('keydown-O',     _cancel);
            this._customOpen = false;
        };

        _up    = () => { activeRow = (activeRow - 1 + ROWS.length) % ROWS.length; render(); };
        _down  = () => { activeRow = (activeRow + 1) % ROWS.length; render(); };
        _left  = () => { idxs[activeRow] = (idxs[activeRow] - 1 + PALETTE.length) % PALETTE.length; render(); };
        _right = () => { idxs[activeRow] = (idxs[activeRow] + 1) % PALETTE.length; render(); };
        _save  = () => {
            localStorage.setItem('space-shooter-thrust-color', PALETTE[idxs[0]].toString());
            localStorage.setItem('space-shooter-ship-color',   PALETTE[idxs[1]].toString());
            localStorage.setItem('space-shooter-bolt-color',   PALETTE[idxs[2]].toString());
            _close();
            this._updateShipPreview();
        };
        _cancel = () => _close();

        kb.on('keydown-UP',    _up);
        kb.on('keydown-W',     _up);
        kb.on('keydown-DOWN',  _down);
        kb.on('keydown-S',     _down);
        kb.on('keydown-LEFT',  _left);
        kb.on('keydown-A',     _left);
        kb.on('keydown-RIGHT', _right);
        kb.on('keydown-D',     _right);
        kb.on('keydown-ENTER', _save);
        kb.on('keydown-ESC',   _cancel);
        kb.on('keydown-O',     _cancel);
    }

    _openMenuHTP() {
        if (this._htpOpen) return;
        this._htpOpen = true;
        const D = 10;
        const bg = this.add.rectangle(W/2, H/2, W, H, 0x000011, 0.93).setDepth(D);
        const S = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };
        const SEP = '──────────────────────────────────';
        const KX = W/2 - 10;
        const AX = W/2 + 14;
        const IX = 88;
        const LX = 108;
        const DX = W/2 + 30;

        let page = 0;
        let lineObjs = [];

        const T = (x, y, txt, sz, col, ox = 0.5) => {
            const t = this.add.text(x, y, txt, { ...S, fontSize: sz, fill: col })
                .setOrigin(ox, 0.5).setDepth(D+1);
            lineObjs.push(t); return t;
        };
        const icon = (x, y, type) => {
            const g = this.add.graphics().setDepth(D+1);
            if (type === 'health') {
                g.fillStyle(0xff4444, 1); g.fillCircle(x, y, 8);
                g.fillStyle(0xffffff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'shield') {
                g.fillStyle(0x44ff88, 1); g.fillCircle(x, y, 8);
                g.fillStyle(0xffffff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'overcharge') {
                g.fillStyle(0xffdd00, 1);
                g.fillRect(x-2, y-9, 4, 18); g.fillRect(x-9, y-2, 18, 4);
                g.fillStyle(0xffffff, 0.45); g.fillCircle(x, y, 3);
            } else if (type === 'ghost') {
                g.fillStyle(0xaaaaff, 0.35); g.fillCircle(x, y, 11);
                g.fillStyle(0xffffff, 0.85); g.fillCircle(x, y, 8);
                g.fillStyle(0xccccff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'nova') {
                g.fillStyle(0xff4400, 1); g.fillCircle(x, y, 7);
                g.fillStyle(0xffaa00, 0.85); g.fillCircle(x, y, 4);
                g.lineStyle(1.5, 0xff6600, 0.9);
                for (let a = 0; a < 360; a += 45) {
                    const r = a * Math.PI / 180;
                    g.lineBetween(x + Math.cos(r)*8, y + Math.sin(r)*8, x + Math.cos(r)*13, y + Math.sin(r)*13);
                }
            }
            lineObjs.push(g);
        };
        const img = (x, y, key, tint = null, sc = 0.5) => {
            const im = this.add.image(x, y, key).setScale(sc).setDepth(D+1);
            if (tint !== null) im.setTint(tint);
            lineObjs.push(im);
        };

        const renderPage1 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 1 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'CONTROLS', '12px', '#888888'); y += 22;
            [
                ['WASD / ARROWS', 'Move ship'],
                ['SPACE',          'Fire bolts'],
                ['E',              'Plasma Shield  (absorbs hits)'],
                ['P  /  ESC',      'Pause'],
            ].forEach(([k, a]) => {
                T(KX, y, k, '12px', '#ffffff', 1);
                T(AX, y, a, '12px', '#88ccff', 0);
                y += 24;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'HEALTH', '12px', '#888888'); y += 20;
            T(W/2, y, 'Lose a ♥ on any hit or collision', '11px', '#aaaaaa'); y += 17;
            T(W/2, y, 'At  1 ♥  —  ship catches fire!  Get a heal fast.', '11px', '#ff6622'); y += 17;
            T(W/2, y, 'Shield deflects projectiles  (not black holes)', '11px', '#aaaaaa'); y += 17;
            T(W/2, y, 'Max  5 lives  ·  max  2 shield charges', '11px', '#aaaaaa'); y += 17;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, '→ D  —  NEXT PAGE  [ 2 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage2 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 2 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'STANDARD  POWER-UPS', '12px', '#888888'); y += 22;
            icon(IX, y, 'health');
            T(LX, y, 'Health Crystal', '12px', '#ff8888', 0);
            T(DX, y, '+1 life', '12px', '#888888', 0); y += 24;
            img(IX, y, 'asteroid2', 0xff2244, 0.64);
            T(LX, y, 'Crystal Cluster', '12px', '#ff8888', 0);
            T(DX, y, '+3 lives', '12px', '#888888', 0); y += 24;
            icon(IX, y, 'shield');
            T(LX, y, 'Shield Charge', '12px', '#44ff88', 0);
            T(DX, y, '+1 shield', '12px', '#888888', 0); y += 24;
            [
                ['spread', '#ff8800', 'Spread Shot  [S]',  '3-way fan'],
                ['twin',   '#00ffaa', 'Twin Bolt    [T]',  'dual beams'],
                ['rapid',  '#ff44ff', 'Rapid Fire   [R]',  'fast aimed'],
            ].forEach(([key, col, name, desc]) => {
                img(IX, y, `powerup-${key}`);
                T(LX, y, name, '12px', col, 0);
                T(DX, y, desc, '12px', '#888888', 0);
                y += 24;
            });
            T(W/2, y, 'Weapons time out or reset when hit', '11px', '#666666'); y += 18;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'ENDLESS  MODE  ONLY', '12px', '#ff88ff'); y += 22;
            [
                ['overcharge', '#ffdd00', 'Overcharge',  'all weapons 6s'],
                ['ghost',      '#ccccff', 'Ghost',       '3s invincibility'],
                ['nova',       '#ff6600', 'Nova',        'screen clear +50pt'],
            ].forEach(([type, col, name, desc]) => {
                icon(IX, y, type);
                T(LX, y, name, '12px', col, 0);
                T(DX, y, desc, '12px', '#888888', 0);
                y += 24;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, '← A  [ 1 / 5 ]    → D  [ 3 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage3 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 3 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'COMBO  SYSTEM', '12px', '#888888'); y += 20;
            T(W/2, y, 'Kill enemies without being hit  →  ×2 → ×3 → ×4', '11px', '#cccccc'); y += 16;
            T(W/2, y, 'Being hit resets combo to ×1', '11px', '#888888'); y += 16;
            T(W/2, y, '×4  =  RAINBOW MODE  (8s, ×1.5 score)', '13px', '#ffee00'); y += 18;
            T(W/2, y, 'Rainbow: your bolts destroy black holes!', '11px', '#ff88ff'); y += 16;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'CRYSTAL  EVENTS', '12px', '#888888'); y += 20;
            T(W/2, y, 'A crystal drifts in between waves', '11px', '#cccccc'); y += 16;
            T(W/2, y, 'Shoot it for a random reward:', '11px', '#cccccc'); y += 16;
            T(W/2, y, '+life  /  +shield  /  all weapons  /  ×2 score', '11px', '#aaaaaa'); y += 16;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'VOID  LEECH  BONUS', '12px', '#aa66ff'); y += 20;
            T(W/2, y, 'Bonus encounter between waves 1–5', '11px', '#cccccc'); y += 16;
            T(W/2, y, 'Survive 4 waves of Void Leeches', '11px', '#aaaaaa'); y += 16;
            T(W/2, y, 'Leeches drop  ♥  or  shields  on death  (35%)', '11px', '#aaaaaa'); y += 16;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, '← A  [ 2 / 5 ]    → D  [ 4 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage4 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'BESTIARY  —  ENEMIES  [ 4 / 5 ]', '14px', '#ffee00'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            const BIX = 38, BNX = 64;
            [
                { key: 'enemy1',    sc: 0.38, col: '#ff7777', name: 'FLYING  EYE',   hp: '1',   desc: 'Dives straight down · no weapons' },
                { key: 'e01-1',     sc: 0.38, col: '#ffaa55', name: 'BIPED',          hp: '3',   desc: 'Zigzags side to side · fires aimed bolt' },
                { key: 'scarab-m0', sc: 0.34, col: '#ffcc44', name: 'SCARAB  BOMBER', hp: '4',   desc: 'Drops timed bomb · death: 5-bolt fan burst' },
                { key: 'worm-m0',   sc: 0.34, col: '#44ffcc', name: 'SPECTRUM  WORM', hp: '5',   desc: 'Slow & tanky · fires 3-way spread shot' },
                { key: 'hornet-m0', sc: 0.34, col: '#ffee55', name: 'DEMON  HORNET',  hp: '2',   desc: 'Swoops diagonally · fires glowing sting' },
            ].forEach(en => {
                img(BIX, y + 7, en.key, null, en.sc);
                T(BNX, y, en.name, '12px', en.col, 0);
                T(W - 14, y, `HP: ${en.hp}`, '11px', '#445566', 1);
                y += 15;
                T(BNX, y, en.desc, '10px', '#888888', 0);
                y += 22;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 14;
            T(W/2, y, '← A  [ 3 / 5 ]    → D  [ 5 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage5 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'BESTIARY  —  ENEMIES  [ 5 / 5 ]', '14px', '#ffee00'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            const BIX = 38, BNX = 64;
            [
                { key: 'e02-1',        sc: 0.38, col: '#ff5588', name: 'KAMIKAZE  DRONE', hp: '1',   desc: 'Spawns in packs · fast dive · no shots' },
                { key: 'e03-1',        sc: 0.38, col: '#aa88ff', name: 'SHIELD  CARRIER', hp: '5',   desc: 'Zigzags · fires twin bolt volleys' },
                { key: 'alien1',       sc: 0.38, col: '#55ffaa', name: 'SWARM  ALIEN',    hp: '1',   desc: 'Groups of 4 · fast sine wave drift · no shots' },
                { key: 'prism-enemy-0',sc: 0.38, col: '#88aaff', name: 'PRISM  ENTITY',   hp: '2',   desc: 'Death: fires 5 RGB shards outward' },
                { key: 'vleech-m0',    sc: 0.34, col: '#cc88ff', name: 'VOID  LEECH',     hp: '2-3', desc: 'Bonus encounter · orbits then strikes · drops ♥/shield' },
            ].forEach(en => {
                img(BIX, y + 7, en.key, null, en.sc);
                T(BNX, y, en.name, '12px', en.col, 0);
                T(W - 14, y, `HP: ${en.hp}`, '11px', '#445566', 1);
                y += 15;
                T(BNX, y, en.desc, '10px', '#888888', 0);
                y += 22;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 14;
            T(W/2, y, '← A  PREV PAGE  [ 4 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const render = () => {
            lineObjs.forEach(o => o.destroy()); lineObjs = [];
            if (page === 0) renderPage1();
            else if (page === 1) renderPage2();
            else if (page === 2) renderPage3();
            else if (page === 3) renderPage4();
            else renderPage5();
        };
        render();
        const _left  = () => { if (page > 0) { page--; render(); } };
        const _right = () => { if (page < 4) { page++; render(); } };
        const _close = () => {
            bg.destroy(); lineObjs.forEach(o => o.destroy());
            this.input.keyboard.off('keydown-LEFT',  _left);  this.input.keyboard.off('keydown-A', _left);
            this.input.keyboard.off('keydown-RIGHT', _right); this.input.keyboard.off('keydown-D', _right);
            this.input.keyboard.removeListener('keydown-H',   _close);
            this.input.keyboard.removeListener('keydown-ESC', _close);
            this._htpOpen = false;
        };
        this.input.keyboard.on('keydown-LEFT',  _left);  this.input.keyboard.on('keydown-A', _left);
        this.input.keyboard.on('keydown-RIGHT', _right); this.input.keyboard.on('keydown-D', _right);
        this.input.keyboard.once('keydown-H',   _close);
        this.input.keyboard.once('keydown-ESC', _close);
    }
}

// ─── CREDITS ─────────────────────────────────────────────────────────────────

class CreditsScene extends Phaser.Scene {
    constructor() { super({ key: 'CreditsScene' }); }

    create() {
        this.add.rectangle(W / 2, H / 2, W, H, 0x000008);
        for (let i = 0; i < 60; i++) {
            this.add.circle(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H),
                Phaser.Math.Between(1,2), 0xffffff, Phaser.Math.FloatBetween(0.1,0.6));
        }

        const lines = [
            { t: 'CREDITS',                              s: '28px', c: '#ffee00' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'GAME',                                 s: '13px', c: '#888'    },
            { t: 'Galactic Fury',                        s: '18px', c: '#4488ff' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'ENGINE',                               s: '13px', c: '#888'    },
            { t: 'Phaser 3.60.0',                        s: '16px', c: '#ffffff' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'ART  PACKS',                           s: '13px', c: '#888'    },
            { t: 'Warped — Characters & Environments',   s: '13px', c: '#ffffff' },
            { t: 'Gothicvania — Eye Demon & Projectiles',s: '13px', c: '#ffffff' },
            { t: 'PixelLab AI — Power-up Icons',         s: '13px', c: '#ffffff' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'SOUND',                                s: '13px', c: '#888'    },
            { t: 'Web Audio API (synthesized)',           s: '13px', c: '#ffffff' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'DEVELOPER',                            s: '13px', c: '#888'    },
            { t: 'Przemo',                               s: '22px', c: '#44ffaa' },
            { t: '',                                     s: '10px', c: '#fff'    },
            { t: 'Made with Claude Code',                s: '12px', c: '#666'    },
            { t: '',                                     s: '24px', c: '#fff'    },
            { t: 'Press any key to return',              s: '13px', c: '#ffee88' },
        ];

        const container = this.add.container(0, 0);
        let y = H + 50;
        for (const l of lines) {
            const sz = parseInt(l.s);
            const t = this.add.text(W / 2, y, l.t, {
                fontFamily: 'monospace', fontSize: l.s, fill: l.c, stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5);
            container.add(t);
            y += sz + 14;
        }

        this.tweens.add({
            targets: container, y: -(y), duration: y * 22,
            ease: 'Linear', onComplete: () => this.scene.start('MenuScene')
        });
        this.input.keyboard.once('keydown', () => this.scene.start('MenuScene'));
    }
}

// ─── HSL helpers for canvas pixel recoloring ──────────────────────────────────
function _hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}
function _rgbToHsl(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if      (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    return [h / 6, s, l];
}
function _hslToRgb(h, s, l) {
    if (s === 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [_hue2rgb(p, q, h + 1/3), _hue2rgb(p, q, h), _hue2rgb(p, q, h - 1/3)];
}

// ─── GAME ─────────────────────────────────────────────────────────────────────

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    create(data) {
        // Difficulty
        const diff = (data && data.difficulty) || 'normal';
        this.difficulty     = diff;
        this.enemySpeedMult = diff === 'easy' ? 0.75 : diff === 'hard' ? 1.20 : 1.0;
        this.enemyFireMult  = diff === 'easy' ? 0.70 : diff === 'hard' ? 1.25 : 1.0;
        this.shieldDropMult = diff === 'easy' ? 1.50 : diff === 'hard' ? 0.50 : 1.0;
        this.hardScoreMult  = diff === 'hard' ? 1.5  : 1.0;
        this.bossHpMult     = diff === 'easy' ? 0.85 : diff === 'hard' ? 1.60 : 1.25;

        // Endless mode
        this.endlessMode        = (data && data.endless) || false;
        this.endlessBossCount   = 0;
        this.endlessTier        = 'A';
        this.endlessDifficulty  = 0;
        this.endlessWaveInTier  = 1;
        this.endlessBestWave    = parseInt(localStorage.getItem('space-shooter-endless-best-wave') || '0');
        this.ghostActive        = false;
        this.ghostEnd           = 0;
        this.overchargeActive   = false;
        this.overchargeEnd      = 0;
        this._vignetteTween     = null;
        this._musicStarted      = false;

        // State
        this.lives      = diff === 'easy' ? 5 : diff === 'hard' ? 2 : 3;
        this.score      = 0;
        this.dead       = false;
        this.paused     = false;
        this.invincible = false;

        // Ship fire effect (1 HP)
        this._shipFireActive = false;
        this._shipFireTimer  = null;
        this.nextFire   = 0;
        this.nextAsteroid = 0;
        this.nextBHCheck  = 10000;

        // Wave state
        this.waveNum       = 0;
        this.waveState     = 'idle';
        this.waveQueue     = [];
        this.waveAlive     = 0;
        this.nextSpawn     = 0;
        this.spawnInterval = 1400;

        // Weapon state — independent timers, stack freely
        this.spreadTimer = 0;
        this.twinTimer   = 0;
        this.rapidTimer  = 0;
        this._prevSpread = false;
        this._prevTwin   = false;
        this._prevRapid  = false;

        // Combo state
        this.comboCount    = 0;
        this.comboMult     = 1;
        this.comboLastKill = 0;

        // Shield state
        this.shieldCount       = 0;      // 0–2 shields in reserve
        this.shieldActive      = false;
        this.shieldTimer       = 0;
        this.shieldNextHumTime = 0;
        this.shieldGraphic     = null;
        this.nextCapWarning = 0;     // debounce cap popups

        // Boss state
        this.bossDefeated  = false;
        this.bossActive    = false;
        this.bossMaxHp     = 30;
        this.bossNextHoming = 0;
        this.isStage2Boss  = false;

        // Mid-boss (Gunship) state
        this.midBossActive   = false;
        this.midBossEntering = false;
        this.midBossSprite   = null;
        this.midBossHp       = 20;
        this.midBossMaxHp    = 20;
        this.midBossPhase    = 1;
        this.midBossT        = 0;
        this.midBossNextFire = 0;
        this.midBossNextRing = 0;
        this.midBossDefeated = false;

        // Stage 3 / Stage 4 state
        this.isStage3Started = false;
        this.isStage4Started = false;
        this.ionStormActive  = false;

        // Leviathan (Space Demon) final boss state
        this.leviathanActive    = false;
        this.leviathanEntering  = false;
        this.leviathanSprite    = null;
        this.leviathanHp        = 90;
        this.leviathanMaxHp     = 90;
        this.leviathanPhase     = 1;
        this.leviathanVx        = 55;
        this.leviathanT         = 0;
        this.leviathanSpiralAngle = 0;
        this.leviathanNextSpiral  = 0;
        this.leviathanNextHoming  = 0;
        this.leviathanNextPulse   = 0;
        this.voidPulseActive    = false;
        this.voidPulseEnd       = 0;
        this.voidPulseId        = 0;
        this.leviathanDefeated  = false;
        this.levShieldActive    = false;
        this.levShieldEnd       = 0;
        this.levNextShield      = 0;
        this.levShieldGfx       = null;
        this.levShieldAngle     = 0;

        // Void Cruiser mid-boss state
        this.voidCruiserActive      = false;
        this.voidCruiserEntering    = false;
        this.voidCruiserSprite      = null;
        this.voidCruiserHp          = 35;
        this.voidCruiserMaxHp       = 35;
        this.voidCruiserPhase       = 1;
        this.voidCruiserT           = 0;
        this.voidCruiserVx          = 55;
        this.voidCruiserBeamAngle   = 0;
        this.voidCruiserBeamDir     = 1;
        this.voidCruiserNextFire     = 0;
        this.voidCruiserNextDiag     = 0;
        this.voidCruiserNextBeam     = 0;
        this.voidCruiserNextIonBlast = 0;
        this.voidCruiserBeamSoundNext = 0;

        // M10 — Chromatic Chaos
        this.rainbowMode         = false;
        this.rainbowEnd          = 0;
        this.rainbowColorIdx     = 0;
        this.rainbowNextColor    = 0;
        this._rainbowComboTween  = null;
        this.crystalActive       = false;
        this.crystalEventSprite  = null;
        this.crystalNextWaveMult = 1;
        this.shieldColorIdx      = 0;
        this.shieldNextColorTime = 0;

        // M12 — Prism Dimension
        this.prismMode              = false;
        this.prismWaveNum           = 0;
        this.prismBgColorIdx        = 0;
        this.prismNextBgChange      = 0;
        this.prismOverlordActive    = false;
        this.prismOverlordEntering  = false;
        this.prismOverlordSprite    = null;
        this.prismOverlordHp        = 120;
        this.prismOverlordMaxHp     = 120;
        this.prismOverlordPhase     = 1;
        this.prismOverlordT         = 0;
        this.prismOverlordVx        = 60;
        this.prismOverlordNextFire  = 0;
        this.prismOverlordNextLaser = 0;
        this.prismOverlordNextPhase = 0;
        this.prismOverlordDefeated  = false;

        // M13 — Run stats & settings
        this.runStartTime       = Date.now();
        this.totalKills         = 0;
        this.totalShotsFired    = 0;
        this.totalShotsHit      = 0;
        this.highestCombo       = 1;
        this.powerupsCollected  = 0;
        this.lastWeaponType     = 'normal';

        // New mechanics state
        this.waveHitsTaken      = 0;
        this.scoreMilestones    = new Set();
        this.lastScarabDeathTime = 0;
        this.bossStaggerUntil   = 0;
        this.midBossStaggerUntil = 0;
        this.levStaggerUntil    = 0;
        this.musicVol = parseInt(localStorage.getItem('space-shooter-music-vol') || '80', 10);
        this.sfxVol   = parseInt(localStorage.getItem('space-shooter-sfx-vol')   || '80', 10);
        this._pauseEl    = null;
        this._htpEl      = null;
        this._settingsEl = null;

        // Meteor shower / black hole shower state
        this.meteorActive    = false;
        this.bhShowerActive  = false;
        this.bossEntering  = false;
        this.bossSprite    = null;
        this.bossHp        = 30;
        this.bossPhase     = 0;
        this.bossVx        = 65;
        this.bossNextFire  = 0;
        this.bossBeamAngle = 0;
        this.bossBeamDir   = 1;
        this.bossNextBeam  = 0;

        // Backgrounds
        this.bgDeep    = this.add.tileSprite(0, 0, W, H, 'bg-deep').setOrigin(0,0).setDepth(0);
        this.bgStars   = this.add.tileSprite(0, 0, W, H, 'bg-stars').setOrigin(0,0).setAlpha(0.75).setDepth(1);
        this.stageBack = this.add.tileSprite(0, 0, W, H, 'stage-back').setOrigin(0,0).setDepth(1).setAlpha(0);

        this.planetBig   = this.add.image(Phaser.Math.Between(70, W-70), -180, 'planet-big').setAlpha(0.85).setScale(0.75).setDepth(2);
        this.planetSmall = this.add.image(Phaser.Math.Between(70, W-70), -380, 'planet-small').setAlpha(0.7).setScale(0.55).setDepth(2);

        // Player – PixelLab interceptor ship sprite
        this.thrustColor = parseInt(localStorage.getItem('space-shooter-thrust-color') || '') || 0x00ffee;
        this.shipColor   = parseInt(localStorage.getItem('space-shooter-ship-color')   || '') || 0x00aaff;
        this.boltColor   = parseInt(localStorage.getItem('space-shooter-bolt-color')   || '') || 0xffffff;
        this._bankAngle  = 0;
        this.shipGraphic = this._makeShipGraphic();
        this.player = this.add.container(W / 2, H - 110, [this.shipGraphic]).setDepth(5).setScale(0.25);

        // Recolor ship hull pixels to match chosen ship color
        this._recolorShipTextures(this.shipColor);

        // Path-following trail — records nozzle positions each frame, draws fading line segments
        this._trailHistory = [];
        this._trailDuration = 320;
        this._trailGraphics = this.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);

        // Low-health / rainbow vignette
        this.vignette = this.add.graphics().setDepth(15).setAlpha(0);
        this._vignetteColor = 0xff0000;
        this._drawVignette(0xff0000);

        // Groups
        this.bolts           = this.add.group();
        this.enemies         = this.add.group();
        this.enemyBolts      = this.add.group();
        this.asteroids       = this.add.group();
        this.blackholes      = this.add.group();
        this.bossFireballs    = this.add.group();
        this.midBossFireballs = this.add.group();
        this.homingFireballs  = this.add.group();
        this.ionOrbs          = this.add.group();
        this.phantomDrones    = this.add.group();
        this.prismShards      = this.add.group();
        this.healthCrystals  = this.add.group();
        this.shieldDrops     = this.add.group();
        this.weaponDrops     = this.add.group();
        this.endlessDrops    = this.add.group();
        this.bonusLeeches    = this.add.group();
        this.leechTongues    = this.add.group();

        // Mystery portal state
        this.voidPortalActive    = false;
        this.voidPortalTriggered = false;
        this.voidPortalRadius    = 0;
        this.voidPortalAngle     = 0;
        this.voidPortalGfx       = null;
        this.voidPortalOnDone    = null;
        this.voidPortalStartTime = 0;
        this.voidPortalForcePull = false;

        // Void Leech bonus wave state
        this.voidLeechBonusActive   = false;
        this.voidLeechBonusT        = 0;
        this.voidLeechMiniWave      = 0;
        this.voidLeechAlive         = 0;
        this.voidLeechTransitioning = false;
        this.voidLeechOnComplete    = null;
        this.voidLeechClouds        = [];
        this.voidLeechGroupCenters  = [];

        // Input
        this.cursors  = this.input.keyboard.createCursorKeys();
        this.wasd     = this.input.keyboard.addKeys({ up:'W', down:'S', left:'A', right:'D' });
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.rKey     = this.input.keyboard.addKey('R');
        this.pKey     = this.input.keyboard.addKey('P');
        this.escKey   = this.input.keyboard.addKey('ESC');
        this.eKey     = this.input.keyboard.addKey('E');
        this.input.keyboard.on('keydown-ESC', () => {
            if (!this.paused && this.lives > 0) this._openPauseMenu();
        });
        this.mKey     = this.input.keyboard.addKey('M');

        this.input.keyboard.on('keydown-H', () => {
            if (this.dead || this.gameOver || this._htpEl) return;
            this._openHowToPlay(false);
        });

        // Pause is handled dynamically via _openPauseMenu()

        // HUD
        const hud = { fontFamily: 'monospace', fontSize: '13px', stroke: '#000', strokeThickness: 3 };
        this.scoreTxt       = this.add.text(W - 12, 12, '', { ...hud, fill: '#cce0ff' }).setOrigin(1, 0).setDepth(10);
        this.waveTxt        = this.add.text(W / 2, 12, '', { ...hud, fill: '#ffee88' }).setOrigin(0.5, 0).setDepth(10);
        this.endlessTierTxt = this.add.text(W / 2, 28, '', { fontFamily: 'monospace', fontSize: '11px', fill: '#ffaa44', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(10).setVisible(false);
        this.endlessBestTxt = this.add.text(12, H - 18, '', { fontFamily: 'monospace', fontSize: '10px', fill: '#888866', stroke: '#000', strokeThickness: 2 }).setOrigin(0, 1).setDepth(10).setVisible(false);

        // Lives as hearts (gray cap layer underneath, red filled layer on top)
        this.livesCapTxt = this.add.text(12, 12, 'LIVES  ' + '♥'.repeat(5), { ...hud, fill: '#444444' }).setDepth(9);
        this.livesTxt    = this.add.text(12, 12, '', { ...hud, fill: '#ff6666' }).setDepth(10);
        this.shieldTxt   = this.add.text(12, 30, '', {
            fontFamily: 'monospace', fontSize: '11px', fill: '#44ffff',
            stroke: '#000', strokeThickness: 2
        }).setDepth(10);
        this.weaponTxt   = this.add.text(12, 46, '', {
            fontFamily: 'monospace', fontSize: '11px', fill: '#ffcc00',
            stroke: '#000', strokeThickness: 2
        }).setDepth(10);
        this.weaponBarBg = this.add.rectangle(12, 60, 90, 4, 0x333333).setOrigin(0, 0.5).setDepth(10).setVisible(false);
        this.weaponBarFg = this.add.rectangle(12, 60, 90, 4, 0xff8800).setOrigin(0, 0.5).setDepth(11).setVisible(false);
        this.comboTxt    = this.add.text(W - 12, 30, '', {
            fontFamily: 'monospace', fontSize: '13px', fill: '#ffee00',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(1, 0).setDepth(10);

        // Game over text
        this.gameOverTxt = this.add.text(W/2, H/2, '', {
            fontFamily: 'monospace', fontSize: '24px', fill: '#ff3333',
            align: 'center', stroke: '#000', strokeThickness: 5, lineSpacing: 12
        }).setOrigin(0.5).setDepth(20);

        // Wave announce text
        this.announceTxt = this.add.text(W/2, H/2 - 40, '', {
            fontFamily: 'monospace', fontSize: '38px', fill: '#ffffff',
            stroke: '#000066', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

        // Boss HP bar (hidden until boss fight)
        this.bossBarBg    = this.add.rectangle(W/2, 44, 304, 16, 0x222222).setDepth(10).setVisible(false);
        this.bossBarFg    = this.add.rectangle(W/2 - 150, 44, 300, 12, 0xff3333).setOrigin(0, 0.5).setDepth(11).setVisible(false);
        this.bossBarLabel = this.add.text(W/2, 44, 'BOSS', {
            fontFamily: 'monospace', fontSize: '9px', fill: '#fff', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(12).setVisible(false);

        // Prism Overlord HP bar (rainbow Graphics, separate from regular boss bar)
        this.bossHpBar = this.add.graphics().setDepth(12).setVisible(false);

        // Controls hint
        const hint = this.add.text(W/2, H - 28, 'ARROWS / WASD  move     SPACE  fire     P  pause', {
            fontFamily: 'monospace', fontSize: '10px', fill: '#888', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(10);
        this.time.delayedCall(3000, () => this.tweens.add({ targets: hint, alpha: 0, duration: 800 }));

        this._updateHUD();

        if (this.endlessMode) {
            this.bossDefeated    = true;
            this.midBossDefeated = true;
            this.time.delayedCall(800, () => this._startEndless());
        } else {
            this.time.delayedCall(800, () => this._startWave(1));
        }

        // Sound — resume AudioContext after user gesture (SPACE on menu)
        this.sfx                = null;
        this.gameMusic          = null;
        this.bossMusic          = null;
        this.goMusic            = null;
        this.stage3Music        = null;
        this.ionStormMusic      = null;
        this.gravityStormMusic  = null;
        this.voidLeechMusic     = null;
        this.screenShake  = localStorage.getItem('space-shooter-shake')    !== 'off';
        this.showComboPop = localStorage.getItem('space-shooter-combopop') !== 'off';
        const _musicOn = localStorage.getItem('space-shooter-music') !== 'off';
        const _sfxOn   = localStorage.getItem('space-shooter-sfx')   !== 'off';
        if (this.sound && this.sound.context) {
            this.sound.context.resume().then(() => {
                if (_sfxOn)   this.sfx               = new SoundFX(this.sound.context);
                if (_musicOn) this.gameMusic          = new GameMusic(this.sound.context);
                if (_musicOn) this.bossMusic          = new BossMusic(this.sound.context);
                if (_musicOn) this.goMusic            = new GameOverMusic(this.sound.context);
                if (_musicOn) this.stage3Music        = new Stage3Music(this.sound.context);
                if (_musicOn) this.ionStormMusic      = new IonStormMusic(this.sound.context);
                if (_musicOn) this.gravityStormMusic  = new GravityStormMusic(this.sound.context);
                if (_musicOn) this.voidLeechMusic     = new VoidLeechMusic(this.sound.context);
                this._applyVolumes();
            }).catch(() => {});
        }
        this.events.once('shutdown', () => {
            if (this.gameMusic)          this.gameMusic.stop();
            if (this.bossMusic)          this.bossMusic.stop();
            if (this.stage3Music)        this.stage3Music.stop();
            if (this.ionStormMusic)      this.ionStormMusic.stop();
            if (this.gravityStormMusic)  this.gravityStormMusic.stop();
            if (this.voidLeechMusic)     this.voidLeechMusic.stop();
            if (this.sfx && this.sound && this.sound.context) this.sfx.stopVoidDrone(this.sound.context);
        });
    }

    update(time, delta) {
        if (this.dead) {
            if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
                if (this.gameMusic)         this.gameMusic.stop();
                if (this.bossMusic)         this.bossMusic.stop();
                if (this.ionStormMusic)     this.ionStormMusic.stop();
                if (this.gravityStormMusic) this.gravityStormMusic.stop();
                if (this.voidLeechMusic)    this.voidLeechMusic.stop();
                if (this.sfx && this.sound && this.sound.context) this.sfx.stopVoidDrone(this.sound.context);
                this.scene.restart();
            }
            if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
                if (this.gameMusic)         this.gameMusic.stop();
                if (this.bossMusic)         this.bossMusic.stop();
                if (this.ionStormMusic)     this.ionStormMusic.stop();
                if (this.gravityStormMusic) this.gravityStormMusic.stop();
                if (this.voidLeechMusic)    this.voidLeechMusic.stop();
                if (this.sfx && this.sound && this.sound.context) this.sfx.stopVoidDrone(this.sound.context);
                this.scene.start('MenuScene');
            }
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.pKey) && !this.paused) this._openPauseMenu();
        if (this.paused) return;

        if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.shieldCount > 0 && !this.shieldActive) {
            this._activateShield(time);
        }
        const dt = delta / 1000;
        this._scrollBg(dt);
        this._movePlayer(dt);
        this._shoot(time);
        this._updateWave(time);
        this._spawnAsteroid(time);
        this._spawnBlackhole(time);
        this._applyBlackholeGravity(dt);
        this._moveBolts(dt);
        this._moveEnemies(time, dt);
        this._updateVoidPortal(time, dt);
        this._updateVoidLeechBonus(time, dt);
        this._moveLeechTongues(dt);
        this._moveEnemyBolts(dt);
        this._moveAsteroids(dt);
        this._moveBlackholes(time, dt);
        this._updateBoss(time, dt);
        this._moveBossFireballs(dt);
        this._updateMidBoss(time, dt);
        this._updateVoidCruiser(time, dt);
        this._moveMidBossFireballs(dt);
        this._moveIonOrbs(time, dt);
        this._updateLeviathan(time, dt);
        this._updatePhantomDrones(time, dt);
        this._applyVoidPulse(time);
        this._moveHomingFireballs(time, dt);
        this._moveHealthCrystals(dt);
        this._moveShieldDrops(dt);
        this._moveWeaponDrops(dt);
        this._updateWeapon(time);
        this._updateShield(time);
        this._collide(time);
        this._updateHUD();
        this._updateShipFire();
        this._updateVignette();
        this._updateRainbowMode(time);
        this._movePrismShards(dt);
        this._moveCrystalEvent(dt);
        if (this.endlessMode) this._updateEndlessDrops(time, dt);
        if (this.prismMode)   this._updatePrismBackground(time);
        if (this.prismOverlordActive) this._updatePrismOverlord(time, dt);
    }

    _scrollBg(dt) {
        this.bgDeep.tilePositionY    -= 32 * dt;
        this.bgStars.tilePositionY   -= 68 * dt;
        this.stageBack.tilePositionY -= 18 * dt;

        if (!this.bossActive) {
            this.planetBig.y += 20 * dt;
            if (this.planetBig.y > H + 220) { this.planetBig.y = -220; this.planetBig.x = Phaser.Math.Between(70, W-70); }
            this.planetSmall.y += 30 * dt;
            if (this.planetSmall.y > H + 180) { this.planetSmall.y = -180; this.planetSmall.x = Phaser.Math.Between(50, W-50); }
        }
    }

    _movePlayer(dt) {
        const speed = 210;
        const { cursors: c, wasd: w } = this;
        const goL = c.left.isDown  || w.left.isDown;
        const goR = c.right.isDown || w.right.isDown;
        if (goL)                              this.player.x -= speed * dt;
        if (goR)                              this.player.x += speed * dt;
        if (c.up.isDown   || w.up.isDown)    this.player.y -= speed * dt;
        if (c.down.isDown || w.down.isDown)  this.player.y += speed * dt;

        // Black hole gravitational pull on player
        for (const bh of [...this.blackholes.getChildren()]) {
            if (!bh.active) continue;
            const dx = bh.x - this.player.x;
            const dy = bh.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 24 && dist < 230) {
                const G  = bh.getData('G') || 300000;
                const pg = this.bhShowerActive ? G * 0.006 : G * 0.003;
                const pull = Math.min((pg / (dist * dist)) * dist * dt, 55 * dt);
                this.player.x += (dx / dist) * pull;
                this.player.y += (dy / dist) * pull;
            }
        }

        this.player.x = Phaser.Math.Clamp(this.player.x, 28, W - 28);
        this.player.y = Phaser.Math.Clamp(this.player.y, 28, H - 28);
        const targetBA = goL ? -9 : goR ? 9 : 0;
        this._bankAngle = Phaser.Math.Linear(this._bankAngle, targetBA, 0.12);
        this.player.angle = this._bankAngle;

        // Path trail — stamp current nozzle positions, then redraw history as fading lines
        const now = this.time.now;
        this._trailHistory.push({
            t: now,
            lx: this.player.x - 8, ly: this.player.y + 35,
            rx: this.player.x + 8, ry: this.player.y + 35,
        });
        // Trim entries older than trail duration
        while (this._trailHistory.length > 1 && now - this._trailHistory[0].t > this._trailDuration) {
            this._trailHistory.shift();
        }
        const g = this._trailGraphics;
        g.clear();
        const tc = this.thrustColor;
        for (let i = 1; i < this._trailHistory.length; i++) {
            const prev = this._trailHistory[i - 1];
            const curr = this._trailHistory[i];
            const alpha = Math.max(0, 1 - (now - prev.t) / this._trailDuration);
            g.lineStyle(3, tc, alpha * 0.9);
            g.beginPath();
            g.moveTo(prev.lx, prev.ly);
            g.lineTo(curr.lx, curr.ly);
            g.strokePath();
            g.beginPath();
            g.moveTo(prev.rx, prev.ry);
            g.lineTo(curr.rx, curr.ry);
            g.strokePath();
        }
    }

    _makeShipGraphic() {
        // pship3: 64x64 colorful ship, nose straight up, no rotation needed
        return this.add.sprite(0, 0, 'pship3-a0').play('pship3-thruster').setAngle(0).setScale(5.0);
    }

    // Option A — recolor nozzle-glow pixels on all animation frames to match thrustColor.
    // Detects saturated, bright pixels in the cyan/blue hue range and hue-shifts them.
    _recolorShipTextures(thrustColor) {
        const SZ = 64;
        const tr = ((thrustColor >> 16) & 0xff) / 255;
        const tg = ((thrustColor >> 8)  & 0xff) / 255;
        const tb = (thrustColor & 0xff) / 255;
        const [targetH, targetS] = _rgbToHsl(tr, tg, tb);

        const recolor = (srcKey, dstKey) => {
            if (!this.textures.exists(srcKey)) return;
            const img = this.textures.get(srcKey).getSourceImage();
            const cv = document.createElement('canvas');
            cv.width = SZ; cv.height = SZ;
            const cx = cv.getContext('2d');
            cx.drawImage(img, 0, 0);
            const id = cx.getImageData(0, 0, SZ, SZ);
            const d = id.data;
            for (let i = 0; i < d.length; i += 4) {
                if (d[i + 3] < 10) continue;
                const r = d[i]/255, g = d[i+1]/255, b = d[i+2]/255;
                const [h, s, l] = _rgbToHsl(r, g, b);
                // Target: bright (l>0.35), saturated (s>0.3), cyan-to-blue hue (0.4–0.72)
                // This catches nozzle glows while skipping dark hull and unsaturated pixels
                if (s > 0.3 && l > 0.35 && h > 0.4 && h < 0.72) {
                    const [nr, ng, nb] = _hslToRgb(targetH, Math.max(s, targetS * 0.8), l);
                    d[i]   = Math.round(nr * 255);
                    d[i+1] = Math.round(ng * 255);
                    d[i+2] = Math.round(nb * 255);
                }
            }
            cx.putImageData(id, 0, 0);
            if (this.textures.exists(dstKey)) this.textures.remove(dstKey);
            this.textures.addCanvas(dstKey, cv);
        };

        for (let i = 0; i <= 8; i++) recolor(`pship3-a${i}`, `pship3-c${i}`);

        if (this.anims.exists('pship3-colored')) this.anims.remove('pship3-colored');
        this.anims.create({
            key: 'pship3-colored',
            frames: Array.from({length: 9}, (_, i) => ({ key: `pship3-c${i}` })),
            frameRate: 10, repeat: -1
        });
        this.shipGraphic.play('pship3-colored');
    }

    _shoot(time) {
        const now = this.time.now;
        const hasSpread = now < this.spreadTimer;
        const hasTwin   = now < this.twinTimer;
        const hasRapid  = now < this.rapidTimer;
        const rate = hasRapid ? 120 : 240;

        if (this.spaceKey.isDown && time >= this.nextFire) {
            this.nextFire = time + rate;
            const offsets = hasTwin ? [-10, 10] : [0];
            this.lastWeaponType = hasSpread ? 'spread' : hasRapid ? 'rapid' : hasTwin ? 'twin' : 'normal';
            for (const off of offsets) {
                if (hasSpread) this._fireSpreadFrom(off);
                else           this._fireSingleFrom(off);
            }
            if (this.sfx) this.sfx.shoot();
        }
    }

    _fireSingleFrom(xOff) {
        this.totalShotsFired++;
        const bx = this.player.x + xOff, by = this.player.y - 12;
        const tCol = this.rainbowMode ? RAINBOW_COLORS[this.rainbowColorIdx] : this.boltColor;
        const trail = this.add.graphics().setDepth(3);
        trail.lineStyle(4, tCol, 0.55);
        trail.lineBetween(bx, by + 6, bx, by + 16);
        this.tweens.add({ targets: trail, alpha: 0, duration: 80, onComplete: () => trail.destroy() });
        const b = this.add.sprite(bx, by, 'bolt1').play('bolt-anim').setDepth(4).setAngle(90).setScale(0.65);
        b.setTint(tCol);
        b.setData('vy', -500); b.setData('vx', 0);
        this.bolts.add(b);
    }

    _fireSpreadFrom(xOff) {
        for (const deg of [-25, 0, 25]) {
            this.totalShotsFired++;
            const rad = Phaser.Math.DegToRad(deg);
            const b = this.add.sprite(this.player.x + xOff, this.player.y - 12, 'bolt1')
                .play('bolt-anim').setDepth(4).setScale(0.65);
            b.setTint(this.rainbowMode ? RAINBOW_COLORS[this.rainbowColorIdx] : this.boltColor);
            b.setData('vx',  Math.sin(rad) * 500);
            b.setData('vy', -Math.cos(rad) * 500);
            this.bolts.add(b);
        }
    }

    // ── Wave management ───────────────────────────────────────────────────────

    _startWave(n) {
        this.crystalNextWaveMult = 1;  // reset score-doubler reward
        this.waveHitsTaken = 0;
        this.waveNum   = n;
        this.waveState = 'announcing';

        const isPrismWave = !this.endlessMode && n > WAVES.length && n <= WAVES.length + PRISM_WAVES.length;
        const cfg = isPrismWave ? PRISM_WAVES[n - WAVES.length - 1]
                  : (this.endlessMode && n > WAVES.length) ? this._generateEndlessWave(n) : WAVES[n - 1];
        this.spawnInterval = cfg.interval;
        if (this.sfx) this.sfx.waveStart();

        if (!this._musicStarted) {
            this._musicStarted = true;
            this.time.delayedCall(400, () => { if (this.gameMusic) this.gameMusic.start(); });
        }

        const q = [];
        for (let i = 0; i < (cfg.eyes    || 0); i++) q.push('eye');
        for (let i = 0; i < (cfg.bipeds  || 0); i++) q.push('biped');
        for (let i = 0; i < (cfg.drones  || 0); i++) q.push('drone');
        for (let i = 0; i < (cfg.shields || 0); i++) q.push('carrier');
        for (let i = 0; i < (cfg.swarms  || 0); i++) q.push('swarm');
        for (let i = 0; i < (cfg.prisms  || 0); i++) q.push('prism');
        for (let i = 0; i < (cfg.mimics  || 0); i++) q.push('mimic');
        for (let i = 0; i < (cfg.scarabs || 0); i++) q.push('scarab');
        for (let i = 0; i < (cfg.worms   || 0); i++) q.push('worm');
        for (let i = 0; i < (cfg.hornets || 0); i++) q.push('hornet');
        Phaser.Utils.Array.Shuffle(q);
        this.waveQueue = q;
        this.waveAlive = 0;

        if (this.endlessMode && n > WAVES.length) {
            this._updateEndlessHUD();
            const eWave = n - WAVES.length;
            if (eWave > this.endlessBestWave) {
                this.endlessBestWave = eWave;
                localStorage.setItem('space-shooter-endless-best-wave', eWave);
                if (this.sfx) this.sfx.newHighScore();
                this.tweens.add({ targets: this.endlessBestTxt, alpha: 0, duration: 140, yoyo: true, repeat: 3 });
            }
        }
        const displayWave = (this.endlessMode && n > WAVES.length) ? (n - WAVES.length) : n;
        const announceLabel = 'WAVE  ' + displayWave;
        const announceColor = isPrismWave ? '#ff88ff' : '#ffffff';
        this.announceTxt.setText(announceLabel).setAlpha(0).setStyle({ fill: announceColor, fontSize: '38px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 280,
            onComplete: () => {
                this.time.delayedCall(1400, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => { this.waveState = 'active'; this.nextSpawn = this.time.now + 300; }
                    });
                });
            }
        });
    }

    _updateWave(time) {
        if (this.waveState !== 'active') return;

        if (this.waveQueue.length > 0 && time >= this.nextSpawn) {
            this.nextSpawn = time + this.spawnInterval;
            const type = this.waveQueue.pop();

            // Screen cap: max 5 drones and 5 swarms on screen at once
            if (type === 'drone' || type === 'swarm') {
                const active = this.enemies.getChildren().filter(e => e.active && e.getData('type') === type).length;
                if (active >= 5) {
                    this.waveQueue.unshift(type); // defer — retry after interval
                    this.nextSpawn = time + 900;
                    return;
                }
            }

            if (type === 'eye')          this._spawnEye(time);
            else if (type === 'biped')   this._spawnBiped(time);
            else if (type === 'carrier') this._spawnCarrier(time);
            else if (type === 'swarm')   this._spawnSwarmGroup(time);
            else if (type === 'prism')   this._spawnPrism(time);
            else if (type === 'mimic')   this._spawnMimic(time);
            else if (type === 'scarab')  this._spawnScarab(time);
            else if (type === 'worm')    this._spawnWorm(time);
            else if (type === 'hornet')  this._spawnHornet(time);
            else                         this._spawnDrone();
        }

        if (this.waveQueue.length === 0 && this.waveAlive === 0) {
            if (this.waveHitsTaken === 0 && this.waveNum > 0) {
                this.score += 200;
                this._showFlawless();
                if (this.sfx) this.sfx.flawless();
            }
            this.waveState = 'clearing';
            if (Math.random() < 0.8) this._forceBlackhole(this.time.now);

            if (this.prismMode) {
                this.waveState = 'done';
                if (this.waveNum < WAVES.length + PRISM_WAVES.length) {
                    if (Math.random() < 0.45) this.time.delayedCall(600, () => this._triggerCrystalEvent());
                    this.time.delayedCall(3000, () => this._startWave(this.waveNum + 1));
                } else {
                    // All 5 prism waves done — summon the Overlord
                    this.time.delayedCall(1500, () => this._showPrismOverlordWarning());
                }
                return;
            }

            if (this.waveNum === BOSS_WAVE && !this.bossDefeated) {
                // Stage 1 complete — trigger boss
                this.waveState = 'done';
                this.time.delayedCall(1500, () => this._showBossWarning());
            } else if (this.waveNum === 7) {
                // Meteor shower before wave 8
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginMeteorShower(() => this._startWave(8)));
            } else if (this.waveNum === 8) {
                // Gunship mid-boss before wave 9
                this.waveState = 'done';
                this.time.delayedCall(1500, () => this._showMidBossWarning());
            } else if (this.waveNum === 9) {
                // Meteor shower before wave 10
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginMeteorShower(() => this._startWave(10)));
            } else if (this.waveNum === 10) {
                // Stage 2 final boss
                this.waveState = 'done';
                this.time.delayedCall(1500, () => this._showFinalBossWarning());
            } else if (this.waveNum === 12) {
                // Ion storm before wave 13
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginIonStorm(() => this._startWave(13)));
            } else if (this.waveNum === 13) {
                // Void Cruiser mid-boss before wave 14
                this.waveState = 'done';
                this.time.delayedCall(1500, () => this._showVoidCruiserWarning());
            } else if (this.waveNum === 14) {
                // Ion storm before wave 15
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginIonStorm(() => this._startWave(15)));
            } else if (this.waveNum === 15) {
                // Stage 3 complete — begin Stage 4
                this.waveState = 'done';
                this.time.delayedCall(2000, () => this._beginStage4());
            } else if (this.waveNum === 17) {
                // Gravity Storm 1 before wave 18
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginBlackholeShower(() => this._startWave(18)));
            } else if (this.waveNum === 19) {
                // Gravity Storm 2 before wave 20
                this.waveState = 'done';
                this.time.delayedCall(2200, () => this._beginBlackholeShower(() => this._startWave(20)));
            } else if (this.waveNum < WAVES.length) {
                // 40% crystal event on normal non-hazard transitions
                if (Math.random() < 0.40) {
                    this.time.delayedCall(600, () => this._triggerCrystalEvent());
                }
                this.time.delayedCall(3000, () => this._startWave(this.waveNum + 1));
            } else if (this.waveNum === WAVES.length && !this.endlessMode) {
                // Stage 3 complete — summon The Leviathan
                this.waveState = 'done';
                this.time.delayedCall(1500, () => this._showLeviathanWarning());
            } else if (this.endlessMode) {
                this.waveState = 'done';
                const nextWave = this.waveNum + 1;
                const wit  = this.endlessWaveInTier;
                const tier = this.endlessTier;
                const lap  = this.endlessDifficulty;

                if (wit === 7) {
                    // End of tier — milestone reward then boss
                    this._showEndlessMilestone(() => this._showEndlessBoss(tier, lap));
                } else if (tier === 'A' && wit === 5) {
                    this.time.delayedCall(2200, () => this._beginBlackholeShower(() => this._startWave(nextWave)));
                } else if (tier === 'B' && wit === 3) {
                    this.time.delayedCall(2200, () => this._beginMeteorShower(() => this._startWave(nextWave)));
                } else if (tier === 'C' && (wit === 3 || wit === 6)) {
                    this.time.delayedCall(2200, () => this._beginIonStorm(() => this._startWave(nextWave)));
                } else {
                    if (Math.random() < 0.35) this.time.delayedCall(600, () => this._triggerCrystalEvent());
                    this.time.delayedCall(3000, () => this._startWave(nextWave));
                }
            }
        }
    }

    _spawnEye(time) {
        const x = Phaser.Math.Between(32, W - 32);
        const e = this.add.sprite(x, -36, 'enemy1').play('enemy-fly').setDepth(3);
        e.setData({ type: 'eye', hp: 1, vy: Phaser.Math.Between(65, 115) * this.enemySpeedMult });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _spawnBiped(time) {
        const x = Phaser.Math.Between(50, W - 50);
        const e = this.add.sprite(x, -44, 'e01-1').play('biped-walk').setDepth(3);
        e.setData({ type: 'biped', hp: 3, vy: Phaser.Math.Between(42, 72) * this.enemySpeedMult, startX: x, startTime: time, nextFire: time + Phaser.Math.Between(1500, 2800) / this.enemyFireMult });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _spawnAsteroid(time) {
        if (this.meteorActive) return;
        if (this.bhShowerActive) return;
        if (time < this.nextAsteroid) return;
        this.nextAsteroid = time + Phaser.Math.Between(2500, 5000);

        // 7% chance: red crystal asteroid (collect for +3 HP)
        if (Math.random() < 0.07) {
            const a = this.add.image(Phaser.Math.Between(30, W - 30), -40, 'asteroid2')
                .setDepth(3).setTint(0xff2244).setScale(1.1);
            a.setData({ vy: 52, vx: 0, spin: Phaser.Math.FloatBetween(-0.6, 0.6), crystal: true });
            this.tweens.add({ targets: a, alpha: 0.55, duration: 380, yoyo: true, repeat: -1 });
            this.asteroids.add(a);
            return;
        }

        const v = Phaser.Math.Between(1, 5);
        const hpByVariant    = { 1: 7, 2: 5, 3: 5, 4: 3, 5: 2 };
        const scaleByVariant = { 1: 1.3, 2: 1.1, 3: 1.05, 4: 0.85, 5: 0.7 };
        const a = this.add.image(Phaser.Math.Between(20, W - 20), -40, `asteroid${v}`).setDepth(2).setScale(scaleByVariant[v]);
        a.setData({ vy: Phaser.Math.Between(55, 105), vx: Phaser.Math.FloatBetween(-18, 18), spin: Phaser.Math.FloatBetween(-1.5, 1.5), hp: hpByVariant[v], maxHp: hpByVariant[v] });
        this.asteroids.add(a);
    }

    _moveBolts(dt) {
        for (const b of [...this.bolts.getChildren()]) {
            b.y += b.getData('vy') * dt;
            b.x += b.getData('vx') * dt;
            const vx = b.getData('vx');
            const vy = b.getData('vy');
            b.setAngle(90 + Math.atan2(vx, -vy) * (180 / Math.PI));
            if (b.y < -32 || b.x < -32 || b.x > W + 32) { b.destroy(); continue; }

            // Snake trail — emit every other frame
            const tf = (b.getData('trailFrame') || 0) + 1;
            b.setData('trailFrame', tf);
            if (tf % 2 === 0) {
                const spd = Math.sqrt(vx * vx + vy * vy) || 1;
                const col = b.tintTopLeft || 0xffffff;
                const ox  = Phaser.Math.Between(-1, 1);
                const tx  = b.x - (vx / spd) * 7 + ox;
                const ty  = b.y - (vy / spd) * 7;
                const tr  = this.add.graphics().setDepth(3);
                tr.fillStyle(col, 0.70);
                tr.fillCircle(0, 0, 2.2);
                tr.x = tx; tr.y = ty;
                this.tweens.add({
                    targets: tr, alpha: 0, scaleX: 0.1, scaleY: 0.1,
                    y: ty - (vy / spd) * 4,
                    x: tx + ox * 2,
                    duration: 160,
                    onComplete: () => tr.destroy()
                });
            }
        }
    }

    _applyBlackholeGravity(dt) {
        const ABSORB_R       = 20;
        const RAINBOW_HIT_R  = 38;
        const GRAVITY_R      = 150;

        for (const b of [...this.bolts.getChildren()]) {
            if (!b.active) continue;
            let vx = b.getData('vx');
            let vy = b.getData('vy');

            for (const bh of [...this.blackholes.getChildren()]) {
                if (!bh.active) continue;
                const dx   = bh.x - b.x;
                const dy   = bh.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const hitR = this.rainbowMode ? RAINBOW_HIT_R : ABSORB_R;
                if (dist < hitR) {
                    if (this.rainbowMode) {
                        b.destroy();
                        const hp = (bh.getData('hp') || 1) - 1;
                        bh.setData('hp', hp);
                        if (hp <= 0) {
                            const pts = (bh.getData('maxHp') || 5) * 100;
                            this._spawnBlackholeImplosion(bh.x, bh.y);
                            this._registerKill(pts);
                            this.cameras.main.flash(200, 80, 0, 180);
                            this.cameras.main.shake(320, 0.015);
                            if (this.sfx) this.sfx.bossExplosion();
                            const lbl = this.add.text(bh.x, bh.y - 10, `BLACK HOLE  +${pts}`, {
                                fontFamily: 'monospace', fontSize: '13px', fill: '#ffff44',
                                stroke: '#440088', strokeThickness: 4
                            }).setOrigin(0.5).setDepth(20);
                            this.tweens.add({ targets: lbl, y: lbl.y - 52, alpha: 0, duration: 900, onComplete: () => lbl.destroy() });
                            bh.destroy();
                        } else {
                            bh.setTint(0xcc44ff);
                            this.time.delayedCall(110, () => { if (bh.active) bh.clearTint(); });
                            const hit = this.add.text(bh.x, bh.y - 14, `${hp} HP`, {
                                fontFamily: 'monospace', fontSize: '11px', fill: '#ff88ff',
                                stroke: '#000', strokeThickness: 3
                            }).setOrigin(0.5).setDepth(20);
                            this.tweens.add({ targets: hit, y: hit.y - 28, alpha: 0, duration: 600, onComplete: () => hit.destroy() });
                        }
                    } else {
                        this._spawnHitFX(b.x, b.y, false); b.destroy();
                    }
                    break;
                }
                if (dist < GRAVITY_R) {
                    const G = bh.getData('G') || 300000;
                    const force = (G / (dist * dist)) * dt;
                    vx += (dx / dist) * force;
                    vy += (dy / dist) * force;
                }
            }
            if (b.active) { b.setData('vx', vx); b.setData('vy', vy); }
        }
    }

    _moveEnemies(time, dt) {
        // Kamikaze signal: every ~1s, if 3+ non-kamikaze swarms alive, convert one
        if (!this._kamikazeCheckAt || time > this._kamikazeCheckAt) {
            this._kamikazeCheckAt = time + 1000;
            const playerY = this.player ? this.player.y : H;
            const swarms = this.enemies.getChildren().filter(e => e.active && e.getData('type') === 'swarm' && !e.getData('kamikaze') && e.y < playerY + 40);
            if (swarms.length >= 3) {
                const victim = swarms[Math.floor(Math.random() * swarms.length)];
                victim.setData('kamikaze', true);
                victim.setTint(0xff3300);
                this.tweens.add({ targets: victim, alpha: 0.25, duration: 100, yoyo: true, repeat: 4 });
            }
        }

        for (const e of [...this.enemies.getChildren()]) {
            if (!e.active) continue;
            const type = e.getData('type');

            if (type === 'drone') {
                const dx = this.player.x - e.x;
                const dy = this.player.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 1) { e.x += (dx / dist) * 250 * this.enemySpeedMult * dt; e.y += (dy / dist) * 250 * this.enemySpeedMult * dt; }
            } else if (type === 'swarm') {
                if (e.getData('kamikaze')) {
                    // Kamikaze: dive straight at player
                    if (this.player && this.player.active) {
                        const kdx = this.player.x - e.x, kdy = this.player.y - e.y;
                        const kd = Math.sqrt(kdx*kdx+kdy*kdy) || 1;
                        e.x += (kdx/kd) * 230 * this.enemySpeedMult * dt;
                        e.y += (kdy/kd) * 230 * this.enemySpeedMult * dt;
                    } else { e.y += 230 * dt; }
                } else {
                    e.y += e.getData('vy') * dt;
                    if (e.y > e.getData('splitY')) {
                        // Split path: fan outward after crossing mid-screen
                        e.x = Phaser.Math.Clamp(e.x + e.getData('svx') * dt, 8, W - 8);
                    } else {
                        // Normal sine drift
                        const swarmElapsed = time - e.getData('startTime');
                        e.x = Phaser.Math.Clamp(e.getData('startX') + Math.sin(swarmElapsed / 320) * 55, 22, W - 22);
                    }
                }
            } else if (type === 'carrier') {
                e.y += e.getData('vy') * dt;
                const elapsed = time - e.getData('startTime');
                e.x = Phaser.Math.Clamp(e.getData('startX') + Math.sin(elapsed / 900) * 65, 32, W - 32);
                if (time >= e.getData('nextFire')) {
                    e.setData('nextFire', time + 2500 / this.enemyFireMult);
                    this._fireCarrierBurst(e.x, e.y);
                }
                // Shield drop cycle
                const shieldDown = e.getData('shieldDown');
                if (shieldDown) {
                    if (time >= e.getData('shieldDownUntil')) {
                        // Shield back up
                        e.setData('shieldDown', false);
                        e.setData('nextShieldDrop', time + Phaser.Math.Between(7000, 10000));
                        e.clearTint();
                        if (this._carrierShieldTween) { this._carrierShieldTween.stop(); this._carrierShieldTween = null; }
                    }
                } else {
                    const timeToNext = e.getData('nextShieldDrop') - time;
                    if (timeToNext <= 600 && timeToNext > 0) {
                        // Tell: flicker rapidly before dropping
                        if (!e.getData('flickering')) {
                            e.setData('flickering', true);
                            this.tweens.add({ targets: e, alpha: 0.3, duration: 80, yoyo: true, repeat: 3,
                                onComplete: () => { if (e.active) e.setAlpha(1); } });
                        }
                    }
                    if (time >= e.getData('nextShieldDrop')) {
                        // Shield drops
                        e.setData('shieldDown', true);
                        e.setData('shieldDownUntil', time + 2500);
                        e.setData('flickering', false);
                        e.setTint(0xff6600);
                    }
                }
                // Draw shield arc visual
                const sgfx = e.getData('shieldGfx');
                if (sgfx && sgfx.active) {
                    sgfx.clear();
                    if (!e.getData('shieldDown') && !this.rainbowMode) {
                        const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
                        sgfx.lineStyle(2.5, 0x44aaff, 0.4 + pulse * 0.35);
                        sgfx.beginPath();
                        sgfx.arc(e.x, e.y, 28, Phaser.Math.DegToRad(50), Phaser.Math.DegToRad(130), false);
                        sgfx.strokePath();
                    }
                }
            } else {
                e.y += e.getData('vy') * dt;
                if (type === 'biped') {
                    const elapsed = time - e.getData('startTime');
                    e.x = Phaser.Math.Clamp(e.getData('startX') + Math.sin(elapsed / 700) * 55, 22, W - 22);
                    if (this.player && this.player.active && this.player.y < e.y + 80) {
                        e.y -= 55 * dt; // back up when player gets close
                    }
                    if (time >= e.getData('nextFire')) {
                        e.setData('nextFire', time + Phaser.Math.Between(2000, 3500) / this.enemyFireMult);
                        this._fireEnemyBolt(e.x, e.y);
                    }
                } else if (type === 'prism') {
                    e.angle += 1.4;
                    if (e.getData('phase') === 'down' && e.y >= H * 0.5) {
                        e.setData('phase', 'up');
                        e.setData('vy', -e.getData('vy'));
                    }
                } else if (type === 'mimic') {
                    const elapsed = time - e.getData('startTime');
                    e.x = Phaser.Math.Clamp(e.getData('startX') + Math.sin(elapsed / 550) * 80, 28, W - 28);
                    // Cycle tint color
                    const colorIdx = Math.floor((elapsed / 400)) % RAINBOW_COLORS.length;
                    const prevIdx  = e.getData('colorIdx') || 0;
                    if (colorIdx !== prevIdx) {
                        e.setData('colorIdx', colorIdx);
                        this._drawMimicShape(e, RAINBOW_COLORS[colorIdx]);
                    }
                    // Firing — play attack animation then return to move
                    if (time >= e.getData('nextFire')) {
                        e.setData('nextFire', time + 2200 / this.enemyFireMult);
                        if (e.anims && e.anims.currentAnim?.key !== 'mimic2-atk') {
                            e.play('mimic2-atk', true);
                            e.once('animationcomplete', () => { if (e.active) e.play('mimic2-move', true); });
                        }
                        this._fireMimicSpread(e.x, e.y, colorIdx);
                    }
                } else if (type === 'scarab') {
                    e.y += e.getData('vy') * dt;
                } else if (type === 'worm') {
                    e.y += e.getData('vy') * dt;
                    e.x = Phaser.Math.Clamp(e.getData('startX') + Math.sin((time - e.getData('startTime')) * 0.0018) * 65, 18, W - 18);
                    const nf = e.getData('nextFire');
                    if (time >= nf) {
                        e.setData('nextFire', time + Phaser.Math.Between(7000, 10000) / this.enemyFireMult);
                        this._fireWormSpread(e.x, e.y);
                        e.play('worm-atk', true);
                        e.once('animationcomplete', () => { if (e.active) e.play('worm-move', true); });
                    }
                } else if (type === 'hornet') {
                    e.y += e.getData('vy') * dt;
                    e.x += e.getData('vx') * dt;
                    const hPhase = e.getData('hPhase');
                    if (hPhase === 'sweep') {
                        // First sting: when hornet reaches player's level
                        if (!e.getData('fired1') && e.y > this.player.y - 80) {
                            this._fireHornetSting(e.x, e.y);
                            e.setData('fired1', true);
                        }
                        // Boomerang: when hornet exits side, reverse and climb
                        if (e.x < -30 || e.x > W + 30) {
                            e.setData('vx', -e.getData('vx'));
                            e.setData('vy', -72);
                            e.setData('hPhase', 'return');
                            e.setFlipX(!e.flipX);
                        }
                    } else if (hPhase === 'return') {
                        // Second sting on the way back
                        if (!e.getData('fired2') && this.player && e.y < this.player.y + 60 && e.y > this.player.y - 120) {
                            this._fireHornetSting(e.x, e.y);
                            e.setData('fired2', true);
                        }
                    }
                }
            }
            // Off-screen culling
            let offScreen = e.y > H + 44 || (type === 'prism' && e.y < -44) || (type === 'swarm' && (e.x < -40 || e.x > W + 40));
            if (type === 'hornet') {
                if (e.getData('hPhase') === 'return' && e.y < -60) {
                    // Retreating shot before exit
                    if (this.player && this.player.active) this._fireHornetSting(e.x, e.y);
                    offScreen = true;
                }
            }
            if (offScreen) { this.waveAlive = Math.max(0, this.waveAlive - 1); e.destroy(); }
        }
    }

    _fireEnemyBolt(x, y) {
        const p = this.add.sprite(x, y + 12, 'eproj1').play('eproj-anim').setDepth(4);
        p.setData('vy', 195);
        this.enemyBolts.add(p);
    }

    _moveEnemyBolts(dt) {
        for (const p of [...this.enemyBolts.getChildren()]) {
            p.y += p.getData('vy') * dt;
            const vx = p.getData('vx'); if (vx) p.x += vx * dt;
            if (p.y > H + 20 || p.x < -20 || p.x > W + 20) p.destroy();
        }
    }

    // ── New PixelLab enemies ──────────────────────────────────────────────────

    _spawnScarab(time) {
        const x = Phaser.Math.Between(44, W - 44);
        const e = this.add.sprite(x, -44, 'scarab-m0').play('scarab-move').setDepth(3).setScale(0.88);
        e.setData({ type: 'scarab', hp: 4, vy: 46 });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _spawnWorm(time) {
        const x = Phaser.Math.Between(50, W - 50);
        const e = this.add.sprite(x, -44, 'worm-m0').play('worm-move').setDepth(3).setScale(0.88);
        e.setData({ type: 'worm', hp: 5, vy: 36, startX: x, startTime: time, nextFire: time + Phaser.Math.Between(2500, 4000) });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _spawnHornet(time) {
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? Phaser.Math.Between(10, 70) : Phaser.Math.Between(W - 70, W - 10);
        const e = this.add.sprite(x, Phaser.Math.Between(-60, -20), 'hornet-m0').play('hornet-move').setDepth(3).setScale(0.85);
        const vx = fromLeft ? Phaser.Math.Between(28, 55) : -Phaser.Math.Between(28, 55);
        e.setData({ type: 'hornet', hp: 2, vy: 105, vx, hPhase: 'sweep', fired1: false, fired2: false });
        if (!fromLeft) e.setFlipX(true);
        this.enemies.add(e);
        this.waveAlive++;
    }

    _fireScarabBomb(x, y, vx = 0, vy = 230) {
        const b = this.add.graphics().setDepth(4);
        b.fillStyle(0xff6600, 0.92); b.fillCircle(0, 0, 8);
        b.fillStyle(0xffcc00, 0.80); b.fillCircle(0, 0, 5);
        b.x = x; b.y = y;
        b.setData({ vy, vx });
        this.enemyBolts.add(b);
    }

    _fireScarabDeathBolts(x, y) {
        // Scarab releases 5-bolt fan on death
        if (this.sfx) this.sfx.scarabBurst();
        const spd = 250;
        for (const deg of [-50, -24, 0, 24, 50]) {
            const rad = Phaser.Math.DegToRad(90 + deg);
            this._fireScarabBomb(x, y, Math.cos(rad) * spd, Math.sin(rad) * spd);
        }
    }

    _fireScarabClusterCross(x, y) {
        // Two scarabs die together — overlapping fans create a dangerous cross pattern
        if (this.sfx) { this.sfx.scarabBurst(); }
        const spd = 260;
        for (const deg of [-50, -24, 0, 24, 50]) {
            const rad = Phaser.Math.DegToRad(90 + deg);
            this._fireScarabBomb(x, y, Math.cos(rad) * spd, Math.sin(rad) * spd);
        }
        for (const deg of [-65, -32, 0, 32, 65]) {
            const rad = Phaser.Math.DegToRad(90 + deg + 22); // offset for cross
            this._fireScarabBomb(x, y, Math.cos(rad) * spd * 0.85, Math.sin(rad) * spd * 0.85);
        }
    }

    _fireWormSpread(x, y) {
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        const base = Math.atan2(dy, dx);
        const spd = 135;
        for (const off of [-0.38, 0, 0.38]) {
            const ang = base + off;
            const b = this.add.graphics().setDepth(4);
            b.fillStyle(0x44ffff, 0.92); b.fillCircle(0, 0, 5);
            b.fillStyle(0xffffff, 0.7);  b.fillCircle(0, 0, 2);
            b.x = x; b.y = y;
            b.setData({ vy: Math.sin(ang) * spd, vx: Math.cos(ang) * spd });
            this.enemyBolts.add(b);
        }
        if (this.sfx) this.sfx.bossSweep();
    }

    _fireHornetSting(x, y) {
        const SPD = 220;
        let vx = 0, vy = SPD;
        if (this.player && this.player.active) {
            const dx = this.player.x - x;
            const dy = this.player.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            vx = (dx / dist) * SPD;
            vy = (dy / dist) * SPD;
        }
        const angle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
        const b = this.add.sprite(x, y, 'hornet-sting-0').play('hornet-sting').setDepth(4).setScale(0.55).setAngle(angle);
        b.setData({ vy, vx });
        this.enemyBolts.add(b);
        if (this.sfx) this.sfx.hornetSting();
    }

    // ── Mystery portal sequence ───────────────────────────────────────────────

    _showVoidLeechPortal(onComplete) {
        const cx = W / 2, cy = H / 2;

        this.voidPortalActive    = true;
        this.voidPortalTriggered = false;
        this.voidPortalRadius    = 0;
        this.voidPortalAngle     = 0;
        this.voidPortalOnDone    = onComplete;
        this.voidPortalStartTime = this.time.now;
        this.voidPortalForcePull = false;

        // Darken bg to set the mood
        this.tweens.add({ targets: this.bgDeep,  alpha: 0.85, duration: 1000 });

        // Rainbow blackhole graphics (redrawn each frame in _updateVoidPortal)
        this.voidPortalGfx = this.add.graphics().setDepth(9);

        // Announcement text
        this.voidPortalTxt = this.add.text(cx, H * 0.22, 'MYSTERY DIMENSION\nPORTAL FOUND', {
            fontFamily: 'monospace', fontSize: '22px', fill: '#ffffff',
            stroke: '#6600cc', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

        this.tweens.add({ targets: this.voidPortalTxt, alpha: 1, duration: 600, ease: 'Sine.In',
            onComplete: () => {
                // Gentle pulse
                this.tweens.add({ targets: this.voidPortalTxt, scaleX: 1.04, scaleY: 1.04,
                    duration: 850, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
                // Rainbow color cycle on txt
                const colors = ['#ffffff','#ff88ff','#88aaff','#aaffee','#ffddaa','#ffaaff'];
                let ci = 0;
                this.voidPortalTxtCycle = this.time.addEvent({ delay: 300, loop: true, callback: () => {
                    if (!this.voidPortalTxt || !this.voidPortalTxt.active) return;
                    this.voidPortalTxt.setStyle({ fill: colors[ci % colors.length] });
                    ci++;
                }});
            }
        });

        // Grow the portal over 1.5s
        this.tweens.add({ targets: this, voidPortalRadius: 72, duration: 1500, ease: 'Back.Out' });

        // Soft ambient sound cue
        if (this.sfx) this.sfx.meteorWarning();
    }

    _updateVoidPortal(time, dt) {
        if (!this.voidPortalActive || this.voidPortalTriggered) return;

        const cx = W / 2, cy = H / 2;
        const r  = this.voidPortalRadius;

        this.voidPortalAngle += dt * 1.6;

        const g = this.voidPortalGfx;
        g.clear();

        if (r < 4) return;

        // Outer glow rings — 5 layers fading outward
        const glowRings = [
            { rOff: 22, alpha: 0.10, w: 14 },
            { rOff: 14, alpha: 0.18, w: 10 },
            { rOff:  8, alpha: 0.28, w:  8 },
            { rOff:  4, alpha: 0.40, w:  6 },
            { rOff:  0, alpha: 0.55, w:  4 },
        ];
        for (const gr of glowRings) {
            g.lineStyle(gr.w, 0x8844ff, gr.alpha);
            g.strokeCircle(cx, cy, r + gr.rOff);
        }

        // Rainbow arc segments rotating around the ring
        const SEG = 12;
        const rainbowColors = [0xff0044, 0xff6600, 0xffdd00, 0x44ff88, 0x0088ff, 0xcc44ff];
        for (let i = 0; i < SEG; i++) {
            const startAngle = this.voidPortalAngle + (i / SEG) * Math.PI * 2;
            const endAngle   = startAngle + (Math.PI * 2 / SEG) * 0.75;
            const col = rainbowColors[i % rainbowColors.length];
            g.lineStyle(4, col, 0.85);
            g.beginPath();
            g.arc(cx, cy, r, startAngle, endAngle, false);
            g.strokePath();
        }

        // Counter-rotating inner ring (faster, shorter arcs)
        const SEG2 = 8;
        const r2   = r * 0.65;
        for (let i = 0; i < SEG2; i++) {
            const startAngle = -this.voidPortalAngle * 1.4 + (i / SEG2) * Math.PI * 2;
            const endAngle   = startAngle + (Math.PI * 2 / SEG2) * 0.5;
            const col = rainbowColors[(i + 3) % rainbowColors.length];
            g.lineStyle(3, col, 0.60);
            g.beginPath();
            g.arc(cx, cy, r2, startAngle, endAngle, false);
            g.strokePath();
        }

        // Dark void core
        g.fillStyle(0x000000, 0.92);
        g.fillCircle(cx, cy, r * 0.55);

        // Subtle pulsing inner glow (dark purple haze)
        const pulse = 0.3 + 0.2 * Math.sin(time * 0.003);
        g.fillStyle(0x330044, pulse);
        g.fillCircle(cx, cy, r * 0.50);

        // After 5 s activate irresistible pull; before that — gentle proximity pull
        const elapsed = time - this.voidPortalStartTime;
        if (!this.voidPortalForcePull && elapsed >= 5000) {
            this.voidPortalForcePull = true;
            // Visual warning — ring flashes white
            this.cameras.main.shake(220, 0.012);
        }

        if (this.player && this.player.active) {
            const dx = cx - this.player.x;
            const dy = cy - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (this.voidPortalForcePull) {
                // Irresistible full-screen pull — completely overrides player movement
                // Speed ramps from 200px/s up to 900px/s as the player gets closer
                const forceMag = Math.max(200, 900 - dist * 3.5);
                this.player.x += (dx / dist) * forceMag * dt;
                this.player.y += (dy / dist) * forceMag * dt;
                // Spin the portal faster to signal doom
                this.voidPortalAngle += dt * 3.0;
            } else if (dist < r + 40) {
                const pull = Math.min(60, (r + 40 - dist) * 2.2) * dt;
                this.player.x += (dx / dist) * pull;
                this.player.y += (dy / dist) * pull;
            }

            // Trigger when player reaches the void core
            if (dist < r * 0.55 && r >= 60) {
                this.voidPortalTriggered = true;
                this.voidPortalActive    = false;

                if (this.voidPortalTxtCycle) { this.voidPortalTxtCycle.remove(); this.voidPortalTxtCycle = null; }
                if (this.voidPortalTxt)      { this.tweens.add({ targets: this.voidPortalTxt, alpha: 0, duration: 300, onComplete: () => this.voidPortalTxt.destroy() }); }

                this.cameras.main.flash(700, 160, 80, 255);
                this.cameras.main.shake(400, 0.018);

                this.time.delayedCall(500, () => {
                    if (this.voidPortalGfx) { this.voidPortalGfx.destroy(); this.voidPortalGfx = null; }
                    if (this.voidPortalOnDone) this.voidPortalOnDone();
                });
            }
        }
    }

    // ── Void Leech bonus wave ─────────────────────────────────────────────────

    _beginVoidLeechBonus(onComplete) {
        this.voidLeechBonusActive   = true;
        this.voidLeechBonusT        = 0;
        this.voidLeechMiniWave      = 0;
        this.voidLeechAlive         = 0;
        this.voidLeechTransitioning = false;
        this.voidLeechOnComplete    = onComplete;
        this.voidLeechGroupCenters  = [];

        // Magical deep-space — rich violet void, stars tinted ethereal blue-pink
        this.bgDeep.setTint(0x0d0028);
        this.bgStars.setTint(0xeeddff);
        this.tweens.add({ targets: this.bgDeep,  alpha: 1.0, duration: 1200 });
        this.tweens.add({ targets: this.bgStars, alpha: 1.0, duration: 1200 });

        // Colorful nebula gas clouds — PixelLab sprites, varied sizes + slow rotation
        const cloudDefs = [
            { x: 240, y: 310, key: 'cloud-purple', scale: 3.2,  pulse: 0.55, phase: 0.0,  baseAlpha: 0.50, flipX: false, rot:  0.8 },
            { x: 390, y: 520, key: 'cloud-teal',   scale: 2.8,  pulse: 0.70, phase: 1.8,  baseAlpha: 0.45, flipX: true,  rot: -0.6 },
            { x: 80,  y: 420, key: 'cloud-orange', scale: 2.4,  pulse: 0.85, phase: 3.1,  baseAlpha: 0.48, flipX: false, rot:  0.5 },
            { x: 400, y: 160, key: 'cloud-purple', scale: 1.6,  pulse: 1.10, phase: 2.2,  baseAlpha: 0.60, flipX: true,  rot: -1.2 },
            { x: 140, y: 150, key: 'cloud-teal',   scale: 1.4,  pulse: 0.95, phase: 0.7,  baseAlpha: 0.55, flipX: false, rot:  1.0 },
            { x: 330, y: 390, key: 'cloud-orange', scale: 1.2,  pulse: 1.30, phase: 2.6,  baseAlpha: 0.52, flipX: true,  rot: -0.9 },
            { x: 60,  y: 610, key: 'cloud-teal',   scale: 0.75, pulse: 1.50, phase: 1.2,  baseAlpha: 0.65, flipX: true,  rot:  1.6 },
            { x: 440, y: 370, key: 'cloud-purple', scale: 0.65, pulse: 1.20, phase: 3.8,  baseAlpha: 0.70, flipX: false, rot: -1.8 },
            { x: 200, y: 590, key: 'cloud-orange', scale: 0.70, pulse: 1.40, phase: 1.9,  baseAlpha: 0.62, flipX: false, rot:  1.4 },
        ];
        this.voidLeechClouds = [];
        for (const cd of cloudDefs) {
            const img = this.add.image(cd.x, cd.y, cd.key)
                .setDepth(1.2)
                .setScale(cd.scale)
                .setAlpha(cd.baseAlpha)
                .setFlipX(cd.flipX);
            this.voidLeechClouds.push({ gfx: img, pulse: cd.pulse, phase: cd.phase, baseAlpha: cd.baseAlpha, rot: cd.rot });
        }

        this.announceTxt.setText('VOID  LEECH\nTERRITORY').setAlpha(0)
            .setStyle({ fill: '#aaffee', fontSize: '28px', stroke: '#000', strokeThickness: 5 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 280,
            onComplete: () => this.tweens.add({ targets: this.announceTxt, alpha: 0, delay: 1600, duration: 400 })
        });
        if (this.sfx) this.sfx.meteorWarning();

        // Fade out all active music and start the mysterious leech theme
        if (this.gameMusic)         this.gameMusic.fadeOut(1.5);
        if (this.stage3Music)       this.stage3Music.fadeOut(1.5);
        if (this.bossMusic)         this.bossMusic.fadeOut(1.5);
        this.time.delayedCall(1200, () => { if (this.voidLeechMusic) this.voidLeechMusic.start(); });

        this.time.delayedCall(900, () => this._spawnVoidLeechMiniWave(1));
    }

    _spawnVoidLeechMiniWave(n) {
        if (!this.voidLeechBonusActive) return;
        this.voidLeechMiniWave = n;
        this.voidLeechAlive    = 0;
        this.voidLeechGroupCenters = [];

        // Green, yellow, blue, red — vivid creature palette
        const LEECH_COLORS = [0xff3333, 0xffdd00, 0x44ff88, 0x3399ff, 0xff8800, 0xee44ff, 0x00ffcc];
        const LEECH_SCALES = [0.52, 0.68, 0.86, 1.08];

        // Entry x/y (spawn point off-screen) and target x/y (hover center) for 2 groups
        const MW_CFG = [
            null,
            [{ ex: -60,  ey: 90,   tx: 118, ty: 225 }, { ex: W+60, ey: 80,   tx: 362, ty: 215 }],
            [{ ex: -60,  ey: 360,  tx: 145, ty: 330 }, { ex: W+60, ey: 265,  tx: 338, ty: 355 }],
            [{ ex: 100,  ey: -60,  tx: 165, ty: 188 }, { ex: W-100,ey: -60,  tx: 318, ty: 415 }],
            [{ ex: W+60, ey: 440,  tx: 355, ty: 280 }, { ex: -60,  ey: 500,  tx: 128, ty: 480 }, { ex: W/2,  ey: -60, tx: 240, ty: 150 }],
        ];
        const groupCfgs = MW_CFG[n];

        for (let gi = 0; gi < groupCfgs.length; gi++) {
            const cfg = groupCfgs[gi];
            this.voidLeechGroupCenters.push({ x: cfg.ex, y: cfg.ey, tx: cfg.tx, ty: cfg.ty, phase: 'entering', nextAttacker: 0, atkTimer: this.time.now + Phaser.Math.Between(1400, 2600) });
            const orbitR = Phaser.Math.Between(22, 38);
            for (let i = 0; i < 3; i++) {
                const angleOffset = (i / 3) * Math.PI * 2;
                const col = Phaser.Utils.Array.GetRandom(LEECH_COLORS);
                const scl = Phaser.Utils.Array.GetRandom(LEECH_SCALES);
                const hp  = scl > 0.85 ? 3 : 2;
                const lch = this.add.sprite(cfg.ex, cfg.ey, 'vleech-m0').play('vleech-move').setDepth(3).setScale(scl);
                lch.setTint(col);
                lch.setData({
                    hp, groupIdx: gi, orbitAngle: angleOffset, orbitR, memberIdx: i,
                });
                this.bonusLeeches.add(lch);
                this.voidLeechAlive++;
            }
        }
    }

    _updateVoidLeechBonus(time, dt) {
        if (!this.voidLeechBonusActive) return;
        this.voidLeechBonusT += dt;
        const T = this.voidLeechBonusT;

        // Pulse + slowly rotate gas clouds
        for (const c of this.voidLeechClouds) {
            c.gfx.setAlpha(c.baseAlpha + 0.18 * Math.sin(T * c.pulse + c.phase));
            c.gfx.angle += c.rot * dt;
        }

        // Update group centers
        for (let gi = 0; gi < this.voidLeechGroupCenters.length; gi++) {
            const gc = this.voidLeechGroupCenters[gi];
            if (gc.phase === 'entering') {
                gc.x += (gc.tx - gc.x) * Math.min(dt * 1.6, 1);
                gc.y += (gc.ty - gc.y) * Math.min(dt * 1.6, 1);
                if (Math.abs(gc.x - gc.tx) < 3 && Math.abs(gc.y - gc.ty) < 3) {
                    gc.x = gc.tx; gc.y = gc.ty; gc.phase = 'orbiting';
                }
            } else {
                gc.x = gc.tx + Math.sin(T * 0.34 + gi * 2.1) * 22;
                gc.y = gc.ty + Math.cos(T * 0.27 + gi * 1.6) * 16;
            }
        }

        // Move leeches — orbit their group center, or rush if last survivor
        for (const l of [...this.bonusLeeches.getChildren()]) {
            if (!l.active) continue;
            const gi = l.getData('groupIdx');
            const gc = this.voidLeechGroupCenters[gi];
            if (!gc) continue;

            // Detect last survivor and trigger rush
            if (!l.getData('rushing')) {
                const groupCount = [...this.bonusLeeches.getChildren()]
                    .filter(m => m.active && m.getData('groupIdx') === gi).length;
                if (groupCount === 1) {
                    l.setData('rushing', true);
                    if (this.sfx) this.sfx.leechRush();
                }
            }

            if (l.getData('rushing')) {
                // Charge directly at the player
                const dx = this.player.x - l.x;
                const dy = this.player.y - l.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                l.x += (dx / dist) * 230 * dt;
                l.y += (dy / dist) * 230 * dt;
                // Rapid red-white flicker to signal danger
                l.setTint(Math.floor(T * 7) % 2 === 0 ? 0xffffff : 0xff2222);
                // Repeat scream every ~600ms
                const lastScream = l.getData('lastScream') || 0;
                if (this.sfx && time - lastScream > 600) {
                    this.sfx.leechRush();
                    l.setData('lastScream', time);
                }
            } else {
                // Normal ambient gurgle
                if (this.sfx && Math.random() < dt * 0.25) this.sfx.leechGurgle();
                // Normal orbit
                const newAngle = l.getData('orbitAngle') + dt * 1.5;
                l.setData('orbitAngle', newAngle);
                const orbitR = l.getData('orbitR');
                l.x = gc.x + Math.cos(newAngle) * orbitR;
                l.y = gc.y + Math.sin(newAngle) * orbitR;
            }
        }

        // Tongue attacks — one leech per group at a time, cycling
        for (let gi = 0; gi < this.voidLeechGroupCenters.length; gi++) {
            const gc = this.voidLeechGroupCenters[gi];
            if (!gc.atkTimer || time < gc.atkTimer) continue;

            const groupLeeches = [...this.bonusLeeches.getChildren()]
                .filter(l => l.active && l.getData('groupIdx') === gi);
            if (groupLeeches.length === 0) continue;

            // Pick the next attacker in cycle order
            const targetMember = gc.nextAttacker % 3;
            const attacker = groupLeeches.find(l => l.getData('memberIdx') === targetMember)
                          || groupLeeches[0];

            gc.nextAttacker = (gc.nextAttacker + 1) % groupLeeches.length;
            gc.atkTimer = time + Phaser.Math.Between(900, 1800);

            if (this.sfx) this.sfx.leechAttack();
            attacker.play('vleech-atk', true);
            attacker.once('animationcomplete', () => {
                if (!attacker.active) return;
                attacker.play('vleech-move', true);
                this._fireLeechTongue(attacker.x, attacker.y, attacker);
            });
        }
    }

    _endVoidLeechBonus() {
        this.voidLeechBonusActive   = false;
        this.voidLeechTransitioning = false;
        [...this.bonusLeeches.getChildren()].forEach(l => l.destroy());
        [...this.leechTongues.getChildren()].forEach(t => t.destroy());

        // Remove gas clouds
        for (const c of this.voidLeechClouds) c.gfx.destroy();
        this.voidLeechClouds       = [];
        this.voidLeechGroupCenters = [];

        // Stop leech music, resume game music
        if (this.voidLeechMusic) this.voidLeechMusic.fadeOut(1.5);
        this.time.delayedCall(1000, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });

        // Guaranteed reward: health crystal + shield
        this._spawnHealthCrystal(W / 2 - 30, H / 2 - 30);
        this._spawnShieldDrop(W / 2 + 30, H / 2 - 30);

        // Colorful exit flash sequence
        const flashColors = [0xff44ff, 0x44ffee, 0xffee44, 0xff6600, 0x88ff44, 0x4488ff];
        let fi = 0;
        const doFlash = () => {
            if (fi >= flashColors.length) {
                // Final white-out then restore bg and continue
                this.cameras.main.flash(600, 255, 255, 255);
                this.time.delayedCall(300, () => {
                    this.tweens.add({ targets: this.bgDeep,  alpha: 1,   duration: 900 });
                    this.tweens.add({ targets: this.bgStars, alpha: 0.4, duration: 900 });
                    this.bgDeep.clearTint();
                    this.bgStars.clearTint();
                    // Pull player to bottom-centre if off to either side
                    if (this.player && this.player.active) {
                        this.tweens.add({
                            targets: this.player,
                            x: W / 2, y: H - 80,
                            duration: 500, ease: 'Quad.Out'
                        });
                    }
                    if (this.voidLeechOnComplete) {
                        this.time.delayedCall(800, this.voidLeechOnComplete, [], this);
                        this.voidLeechOnComplete = null;
                    }
                });
                return;
            }
            const col = flashColors[fi++];
            const r = (col >> 16) & 0xff;
            const g = (col >> 8)  & 0xff;
            const b =  col        & 0xff;
            this.cameras.main.flash(120, r, g, b);
            this.time.delayedCall(130, doFlash);
        };
        this.time.delayedCall(200, doFlash);
    }

    _fireLeechTongue(x, y, leech) {
        if (this.sfx) this.sfx.leechTongue();
        const tx    = this.player.x;
        const ty    = this.player.y;
        const angle = Math.atan2(ty - y, tx - x);
        const spd   = 260;
        const scl   = leech ? leech.scaleX * 0.75 : 0.75;
        const tint  = leech ? leech.tintTopLeft    : 0xffffff;
        const s = this.add.sprite(x, y, 'tongue-0')
            .setRotation(angle)
            .setScale(scl)
            .setTint(tint)
            .setDepth(5);
        s.play('tongue-fly');
        s.setData({ vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, born: this.time.now });
        this.leechTongues.add(s);
    }

    _moveLeechTongues(dt) {
        for (const t of [...this.leechTongues.getChildren()]) {
            if (!t.active) continue;
            t.x += t.getData('vx') * dt;
            t.y += t.getData('vy') * dt;
            if (t.x < -40 || t.x > W + 40 || t.y < -40 || t.y > H + 40) {
                t.destroy();
                continue;
            }
            // Player collision
            if (!this.invincible && !this.shieldActive && Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y) < 26) {
                t.destroy();
                this._damagePlayer();
            }
        }
    }

    _moveAsteroids(dt) {
        for (const a of [...this.asteroids.getChildren()]) {
            a.y     += a.getData('vy') * dt;
            a.x     += a.getData('vx') * dt;
            a.angle += a.getData('spin');
            if (a.y > H + 50) a.destroy();
        }
    }

    // ── Boss sequence ─────────────────────────────────────────────────────────

    _showBossWarning() {
        this.announceTxt.setText('⚠  WARNING  ⚠\nBOSS APPROACHING').setAlpha(0)
            .setStyle({ fill: '#ff2222', fontSize: '32px' });

        if (this.gameMusic)          this.gameMusic.fadeOut(1.2);
        if (this.stage3Music)        this.stage3Music.fadeOut(1.0);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.8);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.8);
        this.time.delayedCall(1200, () => { if (this.bossMusic) this.bossMusic.start(); });
        if (this.sfx) this.sfx.bossWarning();

        let flashes = 0;
        const flash = () => {
            this.tweens.add({
                targets: this.announceTxt, alpha: 1, duration: 260, yoyo: true,
                onComplete: () => {
                    flashes++;
                    if (flashes < 4) this.time.delayedCall(120, flash);
                    else { this.announceTxt.setAlpha(0); this._beginBossFight(); }
                }
            });
        };
        flash();
    }

    _beginBossFight() {
        this.tweens.add({ targets: [this.bgDeep, this.bgStars], alpha: 0, duration: 1400 });
        this.tweens.add({ targets: this.stageBack, alpha: 1, duration: 1400 });
        this.tweens.add({ targets: [this.planetBig, this.planetSmall], alpha: 0, duration: 800 });

        this.waveTxt.setText('');

        this.bossBarBg.setVisible(true);
        this.bossBarFg.setVisible(true);
        this.bossBarLabel.setVisible(true);

        this.bossSprite = this.add.sprite(W / 2, -130, 'tdb1').play('td-boss').setDepth(5).setScale(1.8);
        this.bossRays   = this.add.sprite(W / 2, -130, 'tdr1').play('td-rays').setDepth(6).setScale(1.8).setAlpha(0);

        this.bossActive    = true;
        this.bossEntering  = true;
        this.bossHp        = Math.round(30 * this.bossHpMult);
        this.bossMaxHp     = this.bossHp;
        this.bossPhase     = 1;
        this.bossVx        = 65;
        this.bossBeamAngle = 0;
        this.bossBeamDir   = 1;
        this.bossNextFire  = this.time.now + 999999;
        this.bossNextBeam  = this.time.now + 999999;
    }

    _updateBoss(time, dt) {
        if (!this.bossActive || !this.bossSprite) return;

        const boss = this.bossSprite;

        if (this.bossEntering) {
            boss.y += 100 * dt;
            if (this.bossRays) this.bossRays.setPosition(boss.x, boss.y);
            if (boss.y >= 155) {
                boss.y = 155;
                this.bossEntering = false;
                this.bossNextFire = time + 2200;
                this.bossNextBeam = time + 3800;
            }
            return;
        }

        // Sync rays overlay
        if (this.bossRays) this.bossRays.setPosition(boss.x, boss.y);

        // Horizontal bounce
        boss.x += this.bossVx * dt;
        if (boss.x > W - 80) { boss.x = W - 80; this.bossVx = -Math.abs(this.bossVx); }
        if (boss.x < 80)     { boss.x = 80;      this.bossVx =  Math.abs(this.bossVx); }

        // Phase transition check (thresholds scale with max HP)
        const maxHp    = this.bossMaxHp;
        const newPhase = this.bossHp > maxHp * 0.67 ? 1 : this.bossHp > maxHp * 0.33 ? 2 : 3;
        if (newPhase !== this.bossPhase) this._bossPhaseTransition(newPhase);

        // Attacks per phase
        if (this.bossPhase === 1) {
            if (time >= this.bossNextFire) {
                this.bossNextFire = time + (this.isStage2Boss ? 2200 : 2500);
                this._bossSpread(boss.x, boss.y, this.isStage2Boss ? 6 : 5, 35);
            }
        } else if (this.bossPhase === 2) {
            this._bossSweepBeam(time, dt, boss.x, boss.y);
        } else {
            if (time >= this.bossNextFire) {
                this.bossNextFire = time + (this.isStage2Boss ? 1500 : 1800);
                this._bossSpread(boss.x, boss.y, this.isStage2Boss ? 8 : 7, 42);
            }
            this._bossSweepBeam(time, dt, boss.x, boss.y);
            if (this.isStage2Boss && time >= this.bossNextHoming) {
                this.bossNextHoming = time + 4000;
                this._fireHomingFireball(boss.x, boss.y);
            }
        }

        // Update HP bar
        const pct = Math.max(0, this.bossHp / this.bossMaxHp);
        this.bossBarFg.width = 300 * pct;
        this.bossBarFg.setFillStyle(pct > 0.66 ? 0xff3333 : pct > 0.33 ? 0xff8800 : 0xff00bb);
    }

    _bossSpread(bx, by, count, halfAngle) {
        if (this.sfx) this.sfx.bossFire();
        for (let i = 0; i < count; i++) {
            const deg = Phaser.Math.Linear(-halfAngle, halfAngle, count === 1 ? 0.5 : i / (count - 1));
            const rad = Phaser.Math.DegToRad(deg);
            const speed = 210;
            const p = this.add.sprite(bx, by + 24, 'tdbl1').play('td-bolt').setDepth(4).setScale(1.8);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.bossFireballs.add(p);
        }
    }

    _bossSweepBeam(time, dt, bx, by) {
        this.bossBeamAngle += this.bossBeamDir * 85 * dt;
        if (this.bossBeamAngle >  55) { this.bossBeamAngle =  55; this.bossBeamDir = -1; }
        if (this.bossBeamAngle < -55) { this.bossBeamAngle = -55; this.bossBeamDir =  1; }

        if (time >= this.bossNextBeam) {
            this.bossNextBeam = time + 85;
            const rad = Phaser.Math.DegToRad(this.bossBeamAngle);
            const speed = 390;
            const p = this.add.sprite(bx, by + 24, 'tdbl1').play('td-bolt').setDepth(4).setScale(0.9);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.bossFireballs.add(p);
            if (this.sfx && (!this.bossBeamSoundNext || time >= this.bossBeamSoundNext)) {
                this.bossBeamSoundNext = time + 300;
                this.sfx.bossSweep();
            }
        }
    }

    _bossPhaseTransition(newPhase) {
        this.bossPhase = newPhase;
        this.cameras.main.flash(350, 255, newPhase === 2 ? 120 : 40, newPhase === 2 ? 0 : 40);

        if (newPhase === 2) {
            this.bossVx = this.isStage2Boss ? 120 : 95;
            this.bossNextBeam = this.time.now + 500;
            if (this.bossRays) this.tweens.add({ targets: this.bossRays, alpha: 0.75, duration: 700 });
            else if (this.bossSprite) this.bossSprite.setTint(0xff8844); // demon phase 2 tint
        } else {
            this.bossVx = this.isStage2Boss ? 170 : 140;
            this.bossNextFire  = this.time.now + 800;
            this.bossNextHoming = this.time.now + 2500;
            if (this.bossRays) this.tweens.add({ targets: this.bossRays, alpha: 1, duration: 300 });
            else if (this.bossSprite) this.bossSprite.setTint(0xff2200); // demon phase 3 tint
        }

        const label = newPhase === 2 ? 'PHASE  2' : 'FINAL  PHASE';
        const color = newPhase === 2 ? '#ff8800' : '#ff2266';
        const txt = this.add.text(W/2, H/2 - 20, label, {
            fontFamily: 'monospace', fontSize: '30px', fill: color, stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setAlpha(0);
        this.tweens.add({ targets: txt, alpha: 1, duration: 180, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
    }

    _bossDeath() {
        this.bossActive   = false;
        this.bossDefeated = true;
        if (this.bossMusic) this.bossMusic.fadeOut(2.0);
        const bx = this.bossSprite.x;
        const by = this.bossSprite.y;
        this.bossSprite.destroy();
        if (this.bossRays) this.bossRays.destroy();
        this.bossSprite = null;
        this.bossRays   = null;

        this.cameras.main.shake(2000, 0.022);
        this.bossBarBg.setVisible(false);
        this.bossBarFg.setVisible(false);
        this.bossBarLabel.setVisible(false);

        let count = 0;
        const doExplosion = () => {
            if (count >= 9) {
                this.time.delayedCall(900, () => {
                    if (this.endlessMode) {
                        this.bossDefeated = true;
                        this._endlessTierTransition();
                    } else if (this.isStage2Boss) {
                        this._showVoidLeechPortal(() => this._beginVoidLeechBonus(() => this._beginStage3()));
                    } else {
                        this._beginStage2();
                    }
                });
                return;
            }
            if (this.sfx) this.sfx.bossExplosion();

            const d = this.add.sprite(bx + Phaser.Math.Between(-80,80), by + Phaser.Math.Between(-60,60), 'xD1')
                .play('xD').setDepth(16).setScale(Phaser.Math.FloatBetween(1.2, 2.4));
            d.on('animationcomplete', () => d.destroy());

            const f = this.add.sprite(bx + Phaser.Math.Between(-60,60), by + Phaser.Math.Between(-50,50), 'xF1')
                .play('xF').setDepth(16).setScale(Phaser.Math.FloatBetween(0.9, 1.8));
            f.on('animationcomplete', () => f.destroy());

            count++;
            this.time.delayedCall(210, doExplosion);
        };
        doExplosion();
    }

    _debugSkipToStage2() {
        // Tester shortcut: Q on wave 1 → instant Stage 2
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.asteroids.getChildren()].forEach(a => a.destroy());
        [...this.blackholes.getChildren()].forEach(b => b.destroy());
        this.waveState       = 'done';
        this.waveAlive       = 0;
        this.bossDefeated    = true;
        this.midBossDefeated = true;
        this.score           = 9999;
        this.lives           = Math.max(this.lives, 3);
        this._beginStage2();
    }

    _debugSkipToWave11() {
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.asteroids.getChildren()].forEach(a => a.destroy());
        [...this.blackholes.getChildren()].forEach(b => b.destroy());
        this.waveState       = 'done';
        this.waveAlive       = 0;
        this.midBossDefeated = true;
        this.isStage3Started = true;
        this.score           = Math.max(this.score, 9999);
        this.lives           = Math.max(this.lives, 3);
        // Apply Stage 3 void atmosphere immediately
        this.bgDeep.setTint(0x000a1a);
        this.bgStars.setTint(0x001833);
        this.tweens.add({ targets: this.bgDeep,    alpha: 1,    duration: 600 });
        this.tweens.add({ targets: this.bgStars,   alpha: 0.55, duration: 600 });
        this.tweens.add({ targets: this.stageBack,  alpha: 0.06, duration: 600 });
        this.tweens.add({ targets: [this.planetBig, this.planetSmall], alpha: 0, duration: 400 });
        if (this.gameMusic)  this.gameMusic.fadeOut(0.6);
        if (this.bossMusic)  this.bossMusic.fadeOut(0.6);
        this.time.delayedCall(1000, () => { if (this.stage3Music) this.stage3Music.start(); });
        this._startWave(11);
    }

    _debugSkipToWave15() {
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.midBossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.asteroids.getChildren()].forEach(a => a.destroy());
        [...this.blackholes.getChildren()].forEach(b => b.destroy());
        [...this.ionOrbs.getChildren()].forEach(o => o.destroy());
        [...this.phantomDrones.getChildren()].forEach(d => d.destroy());
        this.waveState        = 'done';
        this.waveAlive        = 0;
        this.voidCruiserActive = false;
        if (this.voidCruiserSprite) { this.voidCruiserSprite.destroy(); this.voidCruiserSprite = null; }
        this.bossBarBg.setVisible(false);
        this.bossBarFg.setVisible(false);
        this.bossBarLabel.setVisible(false);
        this.score            = Math.max(this.score, 49999);
        this.lives            = Math.max(this.lives, 3);
        this._startWave(WAVES.length);
    }

    _debugSkipToStage3() {
        // Tester shortcut: Q on wave 6 → instant Stage 3
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.asteroids.getChildren()].forEach(a => a.destroy());
        [...this.blackholes.getChildren()].forEach(b => b.destroy());
        this.waveState       = 'done';
        this.waveAlive       = 0;
        this.bossDefeated    = true;
        this.midBossDefeated = true;
        this.isStage2Boss    = true;
        this.isStage3Started = true;
        this.score           = Math.max(this.score, 9999);
        this.lives           = Math.max(this.lives, 3);
        this._beginStage3();
    }

    _beginStage2() {
        // Clear leftover projectiles so player gets a clean start
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        this.time.delayedCall(2200, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });

        // Stage 2 — red nebula atmosphere: tint the space layers, keep arena faintly visible
        this.bgDeep.setTint(0xcc2200);
        this.bgStars.setTint(0x9922ff);
        this.tweens.add({ targets: this.bgDeep,   alpha: 1,   duration: 1400 });
        this.tweens.add({ targets: this.bgStars,  alpha: 0.6, duration: 1400 });
        this.tweens.add({ targets: this.stageBack, alpha: 0.22, duration: 1400 });

        // Show "STAGE  2" announcement then kick off wave 6
        this.announceTxt
            .setText('STAGE  2').setAlpha(0)
            .setStyle({ fill: '#ff8844', fontSize: '46px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 380,
            onComplete: () => {
                this.time.delayedCall(1800, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => this._startWave(BOSS_WAVE + 1)
                    });
                });
            }
        });
    }

    // ── Meteor Shower ─────────────────────────────────────────────────────────

    _beginMeteorShower(onComplete) {
        this.meteorActive = true;
        if (this.sfx) this.sfx.meteorWarning();

        this.announceTxt
            .setText('☄  METEOR  SHOWER')
            .setAlpha(0)
            .setStyle({ fill: '#ff8822', fontSize: '28px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 260,
            onComplete: () => {
                this.time.delayedCall(1400, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 350 });
                });
            }
        });

        // Rumble loop for the duration of the shower (~11 s total)
        if (this.sfx) this.sfx.meteorRumble();
        this._meteorRumble = this.time.addEvent({
            delay: 950, repeat: 24,
            callback: () => { if (this.sfx && this.meteorActive) this.sfx.meteorRumble(); }
        });

        let spawned = 0;
        const spawnNext = () => {
            if (spawned >= 40) {
                this.time.delayedCall(2200, () => {
                    this.meteorActive = false;
                    if (this._meteorRumble) { this._meteorRumble.remove(false); this._meteorRumble = null; }
                    onComplete();
                });
                return;
            }
            const meteorTints  = [0xff5522, 0xff9900, 0xffdd00, 0x44ccff, 0xaa44ff, 0xff44aa, 0x44ff99, 0xff3333, 0x00eeff, 0xffaa44];
            const meteorKeys   = ['asteroid1','asteroid2','asteroid3','asteroid4','asteroid5'];
            const key   = Phaser.Utils.Array.GetRandom(meteorKeys);
            const tint  = Phaser.Utils.Array.GetRandom(meteorTints);
            const scale = Phaser.Math.FloatBetween(0.7, 2.2);
            const speed = Phaser.Math.Between(160, 260);
            const a = this.add.image(Phaser.Math.Between(28, W - 28), -60, key)
                .setDepth(3).setScale(scale).setTint(tint);
            a.setData({ vy: speed, vx: Phaser.Math.FloatBetween(-15, 15), spin: Phaser.Math.FloatBetween(-1.2, 1.2), meteor: true });
            this.asteroids.add(a);
            spawned++;
            this.time.delayedCall(380, spawnNext);
        };
        this.time.delayedCall(700, spawnNext);
    }

    // ── Mid-Boss (Gunship) ────────────────────────────────────────────────────

    _showMidBossWarning() {
        this.announceTxt.setText('⚠  WARNING  ⚠\nGUNSHIP  INCOMING').setAlpha(0)
            .setStyle({ fill: '#ff6600', fontSize: '28px' });
        if (this.gameMusic)          this.gameMusic.fadeOut(1.2);
        if (this.stage3Music)        this.stage3Music.fadeOut(1.0);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.8);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.8);
        this.time.delayedCall(1200, () => { if (this.bossMusic) this.bossMusic.start(); });
        if (this.sfx) this.sfx.bossWarning();
        let flashes = 0;
        const flash = () => {
            this.tweens.add({
                targets: this.announceTxt, alpha: 1, duration: 260, yoyo: true,
                onComplete: () => {
                    flashes++;
                    if (flashes < 4) this.time.delayedCall(120, flash);
                    else { this.announceTxt.setAlpha(0); this._beginMidBoss(); }
                }
            });
        };
        flash();
    }

    _beginMidBoss() {
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());

        this.midBossSprite  = this.add.sprite(W / 2, -110, 'v1-1').play('vehicle1-anim').setDepth(5).setScale(1.6);
        this.midBossActive  = true;
        this.midBossEntering = true;
        this.midBossHp      = Math.round(20 * this.bossHpMult);
        this.midBossMaxHp   = this.midBossHp;
        this.midBossPhase   = 1;
        this.midBossT       = 0;
        this.midBossNextFire = this.time.now + 999999;
        this.midBossNextRing = this.time.now + 999999;

        this.bossBarBg.setVisible(true);
        this.bossBarFg.setFillStyle(0xff6600).setVisible(true);
        this.bossBarLabel.setText('GUNSHIP').setVisible(true);
    }

    _updateMidBoss(time, dt) {
        if (!this.midBossActive || !this.midBossSprite) return;
        const boss = this.midBossSprite;

        if (this.midBossEntering) {
            boss.y += 90 * dt;
            if (boss.y >= 155) {
                boss.y = 155;
                this.midBossEntering = false;
                this.midBossNextFire = time + 2000;
            }
            return;
        }

        // Figure-8 movement
        this.midBossT += dt * 0.5;
        boss.x = W / 2 + Math.sin(this.midBossT) * 160;
        boss.y = 155 + Math.sin(this.midBossT * 2) * 48;

        // Phase transition at 50% HP
        if (this.midBossPhase === 1 && this.midBossHp <= Math.floor(this.midBossMaxHp / 2)) {
            this.midBossPhase = 2;
            this.midBossNextRing = time + 2200;
            this.time.delayedCall(400, () => {
                this.cameras.main.flash(300, 255, 80, 0);
                if (this.screenShake) this.cameras.main.shake(600, 0.015);
                if (this.sfx) this.sfx.bossWarning();
            });
            const txt = this.add.text(W/2, H/2 - 20, 'PHASE  2', {
                fontFamily: 'monospace', fontSize: '26px', fill: '#ff6600', stroke: '#000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(20).setAlpha(0);
            this.tweens.add({ targets: txt, alpha: 1, duration: 180, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
        }

        // Progressive red tint as HP drops
        const hpPct = this.midBossHp / this.midBossMaxHp;
        boss.setTint((0xff0000) | (Math.floor(hpPct * 160) << 8));

        // Phase 1: 5-bolt spread every 2 s
        if (time >= this.midBossNextFire) {
            this.midBossNextFire = time + 2000;
            this._midBossSpread(boss.x, boss.y, 5, 32);
        }
        // Phase 2: rotating ring every 3 s
        if (this.midBossPhase === 2 && time >= this.midBossNextRing) {
            this.midBossNextRing = time + 3000;
            this._midBossRing(boss.x, boss.y);
        }

        // HP bar (reusing boss bar)
        const pct = Math.max(0, this.midBossHp / this.midBossMaxHp);
        this.bossBarFg.width = 300 * pct;
    }

    _midBossSpread(bx, by, count, halfAngle) {
        if (this.sfx) this.sfx.bossFire();
        for (let i = 0; i < count; i++) {
            const deg = Phaser.Math.Linear(-halfAngle, halfAngle, count === 1 ? 0.5 : i / (count - 1));
            const rad = Phaser.Math.DegToRad(deg);
            const speed = 185;
            const p = this.add.sprite(bx, by + 20, 'tdbl1').play('td-bolt').setDepth(4).setScale(1.4);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.midBossFireballs.add(p);
        }
    }

    _midBossRing(bx, by) {
        if (this.sfx) this.sfx.bossFire();
        for (let i = 0; i < 8; i++) {
            const rad = Phaser.Math.DegToRad(i * 45);
            const p = this.add.sprite(bx, by, 'tdbl1').play('td-bolt').setDepth(4).setScale(1.1);
            p.setData({ vx: Math.sin(rad) * 115, vy: Math.cos(rad) * 115 });
            this.midBossFireballs.add(p);
        }
    }

    _moveMidBossFireballs(dt) {
        for (const p of [...this.midBossFireballs.getChildren()]) {
            if (!p.active) continue;
            p.x += p.getData('vx') * dt;
            p.y += p.getData('vy') * dt;
            if (p.y > H + 44 || p.x < -44 || p.x > W + 44 || p.y < -44) p.destroy();
        }
    }

    _midBossDeath() {
        this.midBossActive   = false;
        this.midBossDefeated = true;
        this._registerKill(2000);

        const bx = this.midBossSprite.x;
        const by = this.midBossSprite.y;
        this.midBossSprite.destroy();
        this.midBossSprite = null;

        this.cameras.main.shake(1200, 0.016);
        this.bossBarBg.setVisible(false);
        this.bossBarFg.setVisible(false);
        this.bossBarLabel.setVisible(false);
        if (this.sfx) this.sfx.midBossDeath();
        if (this.bossMusic) this.bossMusic.fadeOut(1.5);
        this.time.delayedCall(1500, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });

        let count = 0;
        const doExplosion = () => {
            if (count >= 6) {
                [...this.midBossFireballs.getChildren()].forEach(p => p.destroy());
                this.time.delayedCall(700, () => {
                    if (this.endlessMode) this._endlessTierTransition();
                    else                  this._startWave(9);
                });
                return;
            }
            if (this.sfx) this.sfx.bossExplosion();
            const d = this.add.sprite(bx + Phaser.Math.Between(-50,50), by + Phaser.Math.Between(-40,40), 'xD1')
                .play('xD').setDepth(16).setScale(Phaser.Math.FloatBetween(0.9, 1.8));
            d.on('animationcomplete', () => d.destroy());
            const f = this.add.sprite(bx + Phaser.Math.Between(-40,40), by + Phaser.Math.Between(-30,30), 'xB1')
                .play('xB').setDepth(16).setScale(Phaser.Math.FloatBetween(0.8, 1.5));
            f.on('animationcomplete', () => f.destroy());
            count++;
            this.time.delayedCall(260, doExplosion);
        };
        doExplosion();
    }

    // ── Stage 2 Final Boss ────────────────────────────────────────────────────

    _showFinalBossWarning() {
        this.announceTxt.setText('⚠  WARNING  ⚠\nALIEN  INTERCEPTOR').setAlpha(0)
            .setStyle({ fill: '#ff0044', fontSize: '28px' });
        if (this.gameMusic)          this.gameMusic.fadeOut(1.2);
        if (this.stage3Music)        this.stage3Music.fadeOut(1.0);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.8);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.8);
        this.time.delayedCall(1200, () => { if (this.bossMusic) this.bossMusic.start(); });
        if (this.sfx) this.sfx.bossWarning();
        let flashes = 0;
        const flash = () => {
            this.tweens.add({
                targets: this.announceTxt, alpha: 1, duration: 260, yoyo: true,
                onComplete: () => {
                    flashes++;
                    if (flashes < 5) this.time.delayedCall(120, flash);
                    else { this.announceTxt.setAlpha(0); this._beginFinalBoss(); }
                }
            });
        };
        flash();
    }

    _beginFinalBoss() {
        this.isStage2Boss = true;
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());

        // Deepen the nebula for the final confrontation
        this.tweens.add({ targets: this.bgDeep,    alpha: 0.55, duration: 1200 });
        this.tweens.add({ targets: this.stageBack,  alpha: 0.35, duration: 1200 });

        this.waveTxt.setText('');
        this.bossBarBg.setVisible(true);
        this.bossBarFg.setFillStyle(0xff3333).setVisible(true);
        this.bossBarLabel.setText('ALIEN  INTERCEPTOR').setVisible(true);

        this.bossSprite = this.add.sprite(W / 2, -130, 'bint0').play('interceptor-anim').setDepth(5).setScale(1.8).setAngle(90);
        this.bossRays   = null; // Interceptor uses tint-based phase transitions

        this.bossActive     = true;
        this.bossEntering   = true;
        this.bossHp         = Math.round(40 * this.bossHpMult);
        this.bossMaxHp      = this.bossHp;
        this.bossPhase      = 1;
        this.bossVx         = 80;
        this.bossBeamAngle  = 0;
        this.bossBeamDir    = 1;
        this.bossNextFire   = this.time.now + 999999;
        this.bossNextBeam   = this.time.now + 999999;
        this.bossNextHoming = this.time.now + 999999;
    }

    _fireHomingFireball(bx, by) {
        if (this.sfx) this.sfx.bossFire();
        const g = this.add.graphics().setDepth(4);
        // Organic plasma orb — layered glowing circles
        g.fillStyle(0x550022, 0.10); g.fillCircle(0, 0, 34);
        g.fillStyle(0xcc0077, 0.22); g.fillCircle(0, 0, 24);
        g.fillStyle(0xff00aa, 0.45); g.fillCircle(0, 0, 17);
        g.fillStyle(0xff66dd, 0.70); g.fillCircle(0, 0, 10);
        g.fillStyle(0xffccff, 0.92); g.fillCircle(0, 0, 5);
        g.fillStyle(0xffffff, 1.00); g.fillCircle(0, 0, 2);
        g.x = bx; g.y = by + 20;
        g.setData({ vx: 0, vy: 55, born: this.time.now, lifetime: 3000 });
        this.tweens.add({ targets: g, scaleX: 1.25, scaleY: 1.25, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.homingFireballs.add(g);
    }

    _moveHomingFireballs(time, dt) {
        for (const p of [...this.homingFireballs.getChildren()]) {
            if (!p.active) continue;
            const born     = p.getData('born');
            const lifetime = p.getData('lifetime');
            if (time - born >= lifetime) { p.destroy(); continue; }

            // Steer toward player
            const dx = this.player.x - p.x;
            const dy = this.player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 1) {
                let vx = p.getData('vx');
                let vy = p.getData('vy');
                vx += (dx / dist) * 95 * dt;
                vy += (dy / dist) * 95 * dt;
                const spd = Math.sqrt(vx * vx + vy * vy);
                if (spd > 140) { vx = (vx / spd) * 140; vy = (vy / spd) * 140; }
                p.setData('vx', vx); p.setData('vy', vy);
            }
            p.x += p.getData('vx') * dt;
            p.y += p.getData('vy') * dt;

            // Fade out in last 600 ms
            const remaining = lifetime - (time - born);
            if (remaining < 600) p.setAlpha(remaining / 600);
        }
    }

    _moveBossFireballs(dt) {
        for (const p of [...this.bossFireballs.getChildren()]) {
            if (!p.active) continue;
            p.x += p.getData('vx') * dt;
            p.y += p.getData('vy') * dt;
            if (p.y > H + 44 || p.x < -44 || p.x > W + 44) p.destroy();
        }
    }

    // ── Collision ─────────────────────────────────────────────────────────────

    _deflectPlayerBolt(b) {
        this.bolts.remove(b, false, false);
        const dx = this.player ? this.player.x - b.x : 0;
        const dy = this.player ? this.player.y - b.y : 60;
        const spread = Phaser.Math.DegToRad(Phaser.Math.Between(-20, 20));
        const angle  = Math.atan2(dy, dx) + spread;
        const spd    = 230;
        b.setData('vx', Math.cos(angle) * spd);
        b.setData('vy', Math.sin(angle) * spd);
        b.setTint(0xff4400);
        this.enemyBolts.add(b);
        if (this.sfx) this.sfx.shieldDeflect();
    }

    _collide(time) {
        for (const b of [...this.bolts.getChildren()]) {
            if (!b.active) continue;

            // Boss
            if (this.bossActive && !this.bossEntering && this.bossSprite) {
                if (Phaser.Math.Distance.Between(b.x, b.y, this.bossSprite.x, this.bossSprite.y) < 52) {
                    if (time < this.bossStaggerUntil) { b.destroy(); continue; }
                    this._spawnHitFX(b.x, b.y, true);
                    this.totalShotsHit++;
                    if (this.difficulty === 'hard' && Math.random() < 0.25) this._deflectPlayerBolt(b); else b.destroy();
                    this.score += 50 * this.comboMult;
                    this.bossHp--;
                    if (this.sfx) this.sfx.bossHit();
                    if (this.bossHp === 1 && this.bossStaggerUntil === 0) {
                        this.bossStaggerUntil = time + 500;
                        this.tweens.add({ targets: this.bossSprite, alpha: 0.15, duration: 60, yoyo: true, repeat: 7, onComplete: () => { if (this.bossSprite) this.bossSprite.setAlpha(1); } });
                    } else if (this.bossHp <= 0) this._bossDeath();
                    continue;
                }
            }

            // Mid-boss
            if (this.midBossActive && !this.midBossEntering && this.midBossSprite) {
                if (Phaser.Math.Distance.Between(b.x, b.y, this.midBossSprite.x, this.midBossSprite.y) < 42) {
                    if (time < this.midBossStaggerUntil) { b.destroy(); continue; }
                    this._spawnHitFX(b.x, b.y, true);
                    this.totalShotsHit++;
                    if (this.difficulty === 'hard' && Math.random() < 0.25) this._deflectPlayerBolt(b); else b.destroy();
                    this.score += 30 * this.comboMult;
                    this.midBossHp--;
                    if (this.sfx) this.sfx.bossHit();
                    if (this.midBossHp === 1 && this.midBossStaggerUntil === 0) {
                        this.midBossStaggerUntil = time + 500;
                        this.tweens.add({ targets: this.midBossSprite, alpha: 0.15, duration: 60, yoyo: true, repeat: 7, onComplete: () => { if (this.midBossSprite) this.midBossSprite.setAlpha(1); } });
                    } else if (this.midBossHp <= 0) this._midBossDeath();
                    continue;
                }
            }

            // Leviathan body
            if (this.leviathanActive && !this.leviathanEntering && this.leviathanSprite) {
                // Dark shield intercepts bolts before they reach the body
                if (this.levShieldActive && Phaser.Math.Distance.Between(b.x, b.y, this.leviathanSprite.x, this.leviathanSprite.y) < 95) {
                    this._spawnHitFX(b.x, b.y, false);
                    this._deflectPlayerBolt(b);
                    continue;
                }
                if (Phaser.Math.Distance.Between(b.x, b.y, this.leviathanSprite.x, this.leviathanSprite.y) < 64) {
                    if (time < this.levStaggerUntil) { b.destroy(); continue; }
                    this._spawnHitFX(b.x, b.y, true);
                    this.totalShotsHit++;
                    if (Math.random() < 0.25) this._deflectPlayerBolt(b); else b.destroy();
                    this.score += 50 * this.comboMult;
                    this.leviathanHp--;
                    if (this.sfx) this.sfx.bossHit();
                    if (this.leviathanHp === 1 && this.levStaggerUntil === 0) {
                        this.levStaggerUntil = time + 500;
                        this.tweens.add({ targets: this.leviathanSprite, alpha: 0.15, duration: 60, yoyo: true, repeat: 7, onComplete: () => { if (this.leviathanSprite) this.leviathanSprite.setAlpha(1); } });
                    } else if (this.leviathanHp <= 0) this._leviathanDeath();
                    continue;
                }
            }

            // Phantom drones (phase 2+)
            if (this.leviathanActive && this.leviathanPhase >= 2) {
                let droneHit = false;
                for (const d of [...this.phantomDrones.getChildren()]) {
                    if (!d.active) continue;
                    if (Phaser.Math.Distance.Between(b.x, b.y, d.x, d.y) < 18) {
                        this._spawnDeathFX(d.x, d.y, 'xA');
                        b.destroy();
                        this._registerKill(100);
                        d.destroy();
                        // Respawn single replacement after 8s (capped at 3 total)
                        this.time.delayedCall(8000, () => {
                            if (this.leviathanActive && this.leviathanSprite && this.leviathanPhase >= 2
                                && this.phantomDrones.countActive(true) < 12) {
                                const ang = Math.random() * Math.PI * 2;
                                const bx  = this.leviathanSprite.x, by = this.leviathanSprite.y;
                                const nd  = this.add.sprite(bx + Math.cos(ang)*80, by + Math.sin(ang)*80, 'e02-1')
                                    .play('drone-fly').setDepth(5).setScale(0.65).setTint(0x9900ff);
                                nd.setData({ angle: ang, nextFire: this.time.now + 1500, hp: 1 });
                                this.phantomDrones.add(nd);
                            }
                        });
                        droneHit = true;
                        break;
                    }
                }
                if (droneHit) continue;
            }

            // Void Cruiser body
            if (this.voidCruiserActive && !this.voidCruiserEntering && this.voidCruiserSprite) {
                if (Phaser.Math.Distance.Between(b.x, b.y, this.voidCruiserSprite.x, this.voidCruiserSprite.y) < 55) {
                    this._spawnHitFX(b.x, b.y, true);
                    this.totalShotsHit++;
                    if (this.difficulty === 'hard' && Math.random() < 0.25) this._deflectPlayerBolt(b); else b.destroy();
                    this.score += 30 * this.comboMult;
                    this.voidCruiserHp--;
                    if (this.sfx) this.sfx.bossHit();
                    if (this.voidCruiserHp <= 0) this._voidCruiserDeath();
                    continue;
                }
            }

            // Prism Overlord body — higher deflect chance (crystal surface)
            if (this.prismOverlordActive && !this.prismOverlordEntering && this.prismOverlordSprite) {
                if (Phaser.Math.Distance.Between(b.x, b.y, this.prismOverlordSprite.x, this.prismOverlordSprite.y) < 52) {
                    this._spawnHitFX(b.x, b.y, true);
                    this.totalShotsHit++;
                    if (this.difficulty === 'hard' && Math.random() < 0.35) this._deflectPlayerBolt(b); else b.destroy();
                    this.score += 40 * this.comboMult;
                    this.prismOverlordHp--;
                    if (this.sfx) this.sfx.prismOverlordHit();
                    if (this.prismOverlordHp <= 0) this._prismOverlordDeath();
                    continue;
                }
            }

            // Ion orbs (shoot to detonate safely)
            let ionHit = false;
            for (const orb of [...this.ionOrbs.getChildren()]) {
                if (!orb.active) continue;
                if (Phaser.Math.Distance.Between(b.x, b.y, orb.x, orb.y) < 18) {
                    this._spawnHitFX(b.x, b.y, false);
                    b.destroy();
                    this._registerKill(150);
                    this._spawnIonDetonation(orb.x);
                    orb.destroy();
                    ionHit = true;
                    break;
                }
            }
            if (ionHit) continue;

            // Crystal event — shoot to shatter
            if (this.crystalActive && this.crystalEventSprite && this.crystalEventSprite.active) {
                const c = this.crystalEventSprite;
                if (Phaser.Math.Distance.Between(b.x, b.y, c.x, c.y) < 26) {
                    this._spawnHitFX(b.x, b.y, false);
                    b.destroy();
                    this._shatterCrystal(c.x, c.y);
                    c.destroy();
                    this.crystalActive = false;
                    this.crystalEventSprite = null;
                    continue;
                }
            }

            // Prism shards (shoot for +25 pts each)
            let shardHit = false;
            for (const s of [...this.prismShards.getChildren()]) {
                if (!s.active) continue;
                if (Phaser.Math.Distance.Between(b.x, b.y, s.x, s.y) < 12) {
                    this._spawnHitFX(s.x, s.y, false);
                    b.destroy();
                    this._registerKill(25);
                    s.destroy();
                    shardHit = true;
                    break;
                }
            }
            if (shardHit) continue;

            // Bonus Leeches
            if (this.voidLeechBonusActive) {
                let lhit = false;
                for (const l of [...this.bonusLeeches.getChildren()]) {
                    if (!l.active) continue;
                    if (Phaser.Math.Distance.Between(b.x, b.y, l.x, l.y) < 20) {
                        this._spawnHitFX(l.x, l.y, false);
                        if (this.sfx) this.sfx.leechGurgle();
                        b.destroy(); lhit = true;
                        const lhp = l.getData('hp') - 1;
                        if (lhp <= 0) {
                            this._registerKill(150);
                            this._spawnDeathFX(l.x, l.y, 'xA');
                            if (Math.random() < 0.35) { if (Math.random() < 0.5) this._spawnHealthCrystal(l.x, l.y); else this._spawnShieldDrop(l.x, l.y); }
                            l.destroy();
                            this.voidLeechAlive = Math.max(0, this.voidLeechAlive - 1);
                            if (this.voidLeechAlive === 0 && !this.voidLeechTransitioning) {
                                this.voidLeechTransitioning = true;
                                const nextMW = this.voidLeechMiniWave + 1;
                                if (nextMW <= 4) {
                                    this.time.delayedCall(900, () => {
                                        this.voidLeechTransitioning = false;
                                        this._spawnVoidLeechMiniWave(nextMW);
                                    });
                                } else {
                                    this.time.delayedCall(900, () => this._endVoidLeechBonus());
                                }
                            }
                        } else { l.setData('hp', lhp); }
                        break;
                    }
                }
                if (lhit) continue;
            }

            // Enemies
            let used = false;
            for (const e of [...this.enemies.getChildren()]) {
                if (!e.active) continue;
                if (Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y) < 22) {
                    const eType     = e.getData('type');
                    const isBiped   = eType === 'biped';
                    const isDrone   = eType === 'drone';
                    const isCarrier = eType === 'carrier';
                    const isSwarm   = eType === 'swarm';
                    const isPrism   = eType === 'prism';
                    const isMimic   = eType === 'mimic';
                    const isScarab  = eType === 'scarab';
                    const isWorm    = eType === 'worm';
                    const isHornet  = eType === 'hornet';

                    // Shield carrier front-arc deflection (80° arc facing down) — bypassed in rainbow mode or when shield is down
                    if (isCarrier && !this.rainbowMode && !e.getData('shieldDown')) {
                        const dx = b.x - e.x;
                        const dy = b.y - e.y;
                        const impactAngle = Math.abs(Math.atan2(dx, dy));
                        if (dy > -10 && impactAngle < Phaser.Math.DegToRad(40)) {
                            this._spawnHitFX(b.x, b.y, false);
                            b.destroy(); used = true;
                            if (this.sfx) this.sfx.shieldDeflect();
                            break;
                        }
                    }

                    this._spawnHitFX(e.x, e.y, isBiped);
                    this.totalShotsHit++;
                    b.destroy(); used = true;
                    const hp = e.getData('hp') - 1;
                    if (hp <= 0) {
                        this.totalKills++;
                        const pts = isDrone ? 50 : isBiped ? 300 : isCarrier ? 500 : isSwarm ? 75 : isPrism ? 200 : isMimic ? 350 : isScarab ? 250 : isWorm ? 350 : isHornet ? 100 : 100;
                        this._registerKill(pts);
                        this._spawnDeathFX(e.x, e.y, (isPrism || isMimic) ? 'xA' : isBiped ? 'xB' : isScarab ? 'xC' : 'xA');
                        if (isPrism) this._spawnPrismShards(e.x, e.y);
                        if (isMimic) {
                            this._spawnPrismShards(e.x, e.y);
                            if (Math.random() < 0.10) this._spawnHealthCrystal(e.x, e.y);
                        }
                        if (isWorm) {
                            if (!this.rainbowMode) this._activateRainbowMode();
                            this.rainbowEnd = this.time.now + 5000;
                        }
                        if (isScarab) {
                            const now = this.time.now;
                            if (now - this.lastScarabDeathTime < 500) {
                                this._fireScarabClusterCross(e.x, e.y);
                            } else {
                                this._fireScarabDeathBolts(e.x, e.y);
                            }
                            this.lastScarabDeathTime = now;
                        }
                        this.waveAlive = Math.max(0, this.waveAlive - 1);
                        const crystalChance = isSwarm ? 0.08 : isPrism ? 0.12 : isMimic ? 0 : isDrone ? 0.10 : isCarrier ? 0.10 : isScarab ? 0.10 : isWorm ? 0.10 : isHornet ? 0.08 : 0.18;
                        if (Math.random() < crystalChance) this._spawnHealthCrystal(e.x, e.y);
                        const wChance = isDrone ? 0.20 : isBiped ? 0.15 : isCarrier ? 0.20 : (isPrism || isMimic) ? 0 : isScarab ? 0.15 : isWorm ? 0.10 : isHornet ? 0.05 : 0.05;
                        if (this.bossDefeated && Math.random() < wChance) this._spawnWeaponDrop(e.x, e.y);
                        if (this.endlessMode && Math.random() < 0.10) this._spawnEndlessDrop(e.x, e.y);
                        e.destroy();
                    } else { e.setData('hp', hp); }
                    break;
                }
            }
            if (used) continue;

            // Asteroids
            for (const a of [...this.asteroids.getChildren()]) {
                if (!a.active) continue;
                if (Phaser.Math.Distance.Between(b.x, b.y, a.x, a.y) < 20) {
                    if (a.getData('meteor')) { b.destroy(); break; } // indestructible during shower
                    b.destroy();
                    if (a.getData('crystal')) {
                        this._registerKill(300);
                        this._spawnDeathFX(a.x, a.y, 'xC');
                        a.destroy();
                    } else {
                        const hp = a.getData('hp') - 1;
                        if (hp <= 0) {
                            this._registerKill(50);
                            this._spawnDeathFX(a.x, a.y, 'xC');
                            if (Math.random() < 0.15 * this.shieldDropMult) this._spawnShieldDrop(a.x, a.y);
                            a.destroy();
                        } else {
                            a.setData('hp', hp);
                            if (this.sfx) this.sfx.asteroidCrack();
                            a.setTint(0xff8844);
                            this.tweens.add({ targets: a, alpha: 0.3, duration: 60, yoyo: true, onComplete: () => { if (a.active) { a.alpha = 1; a.clearTint(); } } });
                            const hpLbl = this.add.text(a.x, a.y - 12, `${hp} HP`, {
                                fontFamily: 'monospace', fontSize: '11px', fill: '#ffaa44',
                                stroke: '#000', strokeThickness: 3
                            }).setOrigin(0.5).setDepth(12);
                            this.tweens.add({ targets: hpLbl, y: hpLbl.y - 26, alpha: 0, duration: 700, onComplete: () => hpLbl.destroy() });
                        }
                    }
                    break;
                }
            }
        }

        // ── Pickups — always available, ignore invincibility / shield
        for (const c of [...this.healthCrystals.getChildren()]) {
            if (!c.active) continue;
            if (Phaser.Math.Distance.Between(c.x, c.y, this.player.x, this.player.y) < 26) {
                if (this.lives >= 5) {
                    this._showCapPopup('HEALTH CAP');
                } else {
                    c.destroy(); this.lives++; this.powerupsCollected++;
                    this._spawnHitFX(this.player.x, this.player.y, false);
                    if (this.sfx) this.sfx.crystalPickup();
                }
                break;
            }
        }
        for (const a of [...this.asteroids.getChildren()]) {
            if (!a.active || !a.getData('crystal')) continue;
            if (Phaser.Math.Distance.Between(a.x, a.y, this.player.x, this.player.y) < 22) {
                if (this.lives >= 5) {
                    this._showCapPopup('HEALTH CAP');
                } else {
                    this._spawnHitFX(a.x, a.y, false); a.destroy();
                    this.lives = Math.min(5, this.lives + 3); this.powerupsCollected++;
                    if (this.sfx) this.sfx.crystalPickup();
                }
                return;
            }
        }
        for (const s of [...this.shieldDrops.getChildren()]) {
            if (!s.active) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 26) {
                if (this.shieldCount >= 2) {
                    this._showCapPopup('SHIELD CAP');
                } else {
                    s.destroy(); this.shieldCount++; this.powerupsCollected++;
                    if (this.sfx) this.sfx.shieldPickup();
                }
                break;
            }
        }
        for (const w of [...this.weaponDrops.getChildren()]) {
            if (!w.active) continue;
            if (Phaser.Math.Distance.Between(w.x, w.y, this.player.x, this.player.y) < 24) {
                this._activateWeapon(w.getData('weaponType'));
                this.powerupsCollected++;
                w.destroy(); break;
            }
        }

        // ── Shield deflects incoming projectiles
        if (this.shieldActive) {
            const sx = this.player.x, sy = this.player.y, sr = 46;
            const _shieldBlock = (p) => {
                const bc = RAINBOW_COLORS[this.shieldColorIdx];
                const fx = this.add.sprite(p.x, p.y, 'hit1').play('hit-anim').setDepth(8).setTint(bc).setScale(1.3);
                fx.on('animationcomplete', () => fx.destroy());
                p.destroy();
                if (this.sfx) this.sfx.shieldBlock();
            };
            for (const p of [...this.enemyBolts.getChildren()]) {
                if (!p.active) continue;
                if (Phaser.Math.Distance.Between(p.x, p.y, sx, sy) < sr) _shieldBlock(p);
            }
            for (const p of [...this.bossFireballs.getChildren()]) {
                if (!p.active) continue;
                if (Phaser.Math.Distance.Between(p.x, p.y, sx, sy) < sr) _shieldBlock(p);
            }
            for (const p of [...this.midBossFireballs.getChildren()]) {
                if (!p.active) continue;
                if (Phaser.Math.Distance.Between(p.x, p.y, sx, sy) < sr) _shieldBlock(p);
            }
            for (const p of [...this.homingFireballs.getChildren()]) {
                if (!p.active) continue;
                if (Phaser.Math.Distance.Between(p.x, p.y, sx, sy) < sr) _shieldBlock(p);
            }
        }

        // ── Prism shards vs enemies (with pierce chance) ─────────────────────
        for (const s of [...this.prismShards.getChildren()]) {
            if (!s.active) continue;
            for (const e of [...this.enemies.getChildren()]) {
                if (!e.active) continue;
                if (Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y) < 18) {
                    this._spawnHitFX(e.x, e.y, false);
                    const ehp = e.getData('hp') - 2;
                    if (ehp <= 0) {
                        const eT = e.getData('type');
                        this.totalKills++;
                        this._registerKill(eT === 'drone' ? 50 : eT === 'swarm' ? 75 : 120);
                        this._spawnDeathFX(e.x, e.y, 'xA');
                        this.waveAlive = Math.max(0, this.waveAlive - 1);
                        e.destroy();
                    } else {
                        e.setData('hp', ehp);
                    }
                    // 35% pierce chance — shard continues; otherwise destroyed
                    if (Math.random() >= 0.35) { s.destroy(); }
                    break;
                }
            }
        }

        // ── Skip all damage while invincible or shielded
        if (this.invincible || this.shieldActive) return;

        for (const e of [...this.enemies.getChildren()]) {
            if (!e.active) continue;
            if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 24) {
                const ct = e.getData('type');
                if (ct === 'drone' || ct === 'swarm' || ct === 'hornet') {
                    this._spawnDeathFX(e.x, e.y, 'xA');
                    this.waveAlive = Math.max(0, this.waveAlive - 1);
                    e.destroy();
                }
                this._damagePlayer(); return;
            }
        }
        if (this.voidLeechBonusActive) {
            for (const l of [...this.bonusLeeches.getChildren()]) {
                if (!l.active) continue;
                const hitR = l.getData('rushing') ? 28 : 22;
                if (Phaser.Math.Distance.Between(l.x, l.y, this.player.x, this.player.y) < hitR) {
                    this._spawnDeathFX(l.x, l.y, 'xA');
                    if (Math.random() < 0.35) { if (Math.random() < 0.5) this._spawnHealthCrystal(l.x, l.y); else this._spawnShieldDrop(l.x, l.y); }
                    l.destroy();
                    this.voidLeechAlive = Math.max(0, this.voidLeechAlive - 1);
                    if (this.voidLeechAlive === 0 && !this.voidLeechTransitioning) {
                        this.voidLeechTransitioning = true;
                        const nextMW = this.voidLeechMiniWave + 1;
                        if (nextMW <= 4) {
                            this.time.delayedCall(900, () => {
                                this.voidLeechTransitioning = false;
                                this._spawnVoidLeechMiniWave(nextMW);
                            });
                        } else {
                            this.time.delayedCall(900, () => this._endVoidLeechBonus());
                        }
                    }
                    this._damagePlayer(); return;
                }
            }
        }
        for (const p of [...this.enemyBolts.getChildren()]) {
            if (!p.active) continue;
            if (this._checkBossProjectileHitsAsteroid(p, 20)) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 18) { p.destroy(); this._damagePlayer(); return; }
        }
        for (const a of [...this.asteroids.getChildren()]) {
            if (!a.active || a.getData('crystal')) continue;
            if (Phaser.Math.Distance.Between(a.x, a.y, this.player.x, this.player.y) < 22) {
                this._spawnDeathFX(a.x, a.y, 'xC'); a.destroy(); this._damagePlayer(); return;
            }
        }
        for (const bh of [...this.blackholes.getChildren()]) {
            if (!bh.active) continue;
            if (Phaser.Math.Distance.Between(bh.x, bh.y, this.player.x, this.player.y) < 22) { this._damagePlayer(); return; }
        }
        for (const p of [...this.bossFireballs.getChildren()]) {
            if (!p.active) continue;
            if (this._checkBossProjectileHitsAsteroid(p, 22)) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 18) { p.destroy(); this._damagePlayer(); return; }
        }
        for (const p of [...this.midBossFireballs.getChildren()]) {
            if (!p.active) continue;
            if (this._checkBossProjectileHitsAsteroid(p, 22)) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 18) { p.destroy(); this._damagePlayer(); return; }
        }
        for (const p of [...this.homingFireballs.getChildren()]) {
            if (!p.active) continue;
            if (this._checkBossProjectileHitsAsteroid(p, 22)) continue;
            if (Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y) < 20) { p.destroy(); this._damagePlayer(); return; }
        }
        for (const s of [...this.prismShards.getChildren()]) {
            if (!s.active) continue;
            if (this._checkBossProjectileHitsAsteroid(s, 18)) continue;
            if (Phaser.Math.Distance.Between(s.x, s.y, this.player.x, this.player.y) < 14) { s.destroy(); this._damagePlayer(); return; }
        }
    }

    _checkBossProjectileHitsAsteroid(proj, radius) {
        for (const a of [...this.asteroids.getChildren()]) {
            if (!a.active) continue;
            if (Phaser.Math.Distance.Between(proj.x, proj.y, a.x, a.y) >= radius + 18) continue;
            // Indestructible meteor-shower rocks just absorb the bolt
            if (a.getData('meteor')) { proj.destroy(); return true; }
            proj.destroy();
            if (a.getData('crystal')) {
                this._registerKill(300);
                this._spawnDeathFX(a.x, a.y, 'xC');
                a.destroy();
            } else {
                const hp = a.getData('hp') - 1;
                if (hp <= 0) {
                    this._registerKill(50);
                    this._spawnDeathFX(a.x, a.y, 'xC');
                    if (Math.random() < 0.15 * this.shieldDropMult) this._spawnShieldDrop(a.x, a.y);
                    a.destroy();
                } else {
                    a.setData('hp', hp);
                    if (this.sfx) this.sfx.asteroidCrack();
                    a.setTint(0xff8844);
                    this.tweens.add({ targets: a, alpha: 0.3, duration: 60, yoyo: true,
                        onComplete: () => { if (a.active) { a.alpha = 1; a.clearTint(); } } });
                    const hpLbl = this.add.text(a.x, a.y - 12, `${hp} HP`, {
                        fontFamily: 'monospace', fontSize: '11px', fill: '#ff8844',
                        stroke: '#000', strokeThickness: 3
                    }).setOrigin(0.5).setDepth(12);
                    this.tweens.add({ targets: hpLbl, y: hpLbl.y - 26, alpha: 0, duration: 700, onComplete: () => hpLbl.destroy() });
                }
            }
            return true;
        }
        return false;
    }

    // ── Black holes ───────────────────────────────────────────────────────────

    _forceBlackhole(time) {
        this.nextBHCheck = time + Phaser.Math.Between(9000, 18000);
        if (this.waveNum >= STAGE3_WAVE) {
            this._doSpawnBHCluster(time);
        } else {
            this._doSpawnBlackhole(time);
        }
    }

    _spawnBlackhole(time) {
        if (this.bossActive) return;
        if (this.bhShowerActive) return;
        if (time < this.nextBHCheck) return;
        this.nextBHCheck = time + Phaser.Math.Between(9000, 18000);
        if (Math.random() > 0.45) return;
        this._doSpawnBlackhole(time);
    }

    _doSpawnBlackhole(time) {
        const x  = Phaser.Math.Between(60, W - 60);
        const bh = this.add.image(x, -75, 'blackhole').setDepth(6).setScale(1.2);
        bh.setData({ G: 300000, vy: Phaser.Math.Between(50, 80), startX: x, startTime: time, sineAmp: Phaser.Math.Between(70, 120), sineFreq: Phaser.Math.FloatBetween(0.45, 0.85), rotSpeed: Phaser.Math.FloatBetween(90, 160), hp: 10, maxHp: 10 });
        this.blackholes.add(bh);
    }

    _doSpawnBHCluster(time) {
        const count = Phaser.Math.Between(2, 3);
        const baseX = Phaser.Math.Between(90, W - 90);
        const baseVy = Phaser.Math.Between(50, 80);
        for (let i = 0; i < count; i++) {
            const spread = Phaser.Math.Between(60, 110);
            const offsetX = i === 0 ? 0 : (i % 2 === 0 ? -spread : spread);
            const x = Phaser.Math.Clamp(baseX + offsetX, 52, W - 52);
            const bh = this.add.image(x, -75, 'blackhole').setDepth(6).setScale(0.65);
            bh.setData({ G: 180000, vy: baseVy, startX: x, startTime: time + i * 180, sineAmp: Phaser.Math.Between(40, 70), sineFreq: Phaser.Math.FloatBetween(0.45, 0.85), rotSpeed: Phaser.Math.FloatBetween(90, 160), hp: 5, maxHp: 5 });
            this.blackholes.add(bh);
        }
    }

    // ── Black Hole Shower ─────────────────────────────────────────────────────

    _beginBlackholeShower(onComplete) {
        this.bhShowerActive = true;

        // Music: fade everything out, then bring in gravity storm music
        if (this.gameMusic)     this.gameMusic.fadeOut(0.8);
        if (this.stage3Music)   this.stage3Music.fadeOut(0.8);
        if (this.ionStormMusic) this.ionStormMusic.fadeOut(0.8);
        this.time.delayedCall(900, () => { if (this.gravityStormMusic) this.gravityStormMusic.start(); });

        if (this.sfx) this.sfx.meteorWarning();

        this.announceTxt
            .setText('◉  GRAVITY  STORM')
            .setAlpha(0)
            .setStyle({ fill: '#aa44ff', fontSize: '32px', stroke: '#000', strokeThickness: 6 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 280,
            onComplete: () => this.tweens.add({ targets: this.announceTxt, alpha: 0, delay: 1400, duration: 500 })
        });

        if (this.sfx) this.sfx.meteorRumble();
        this._bhShowerRumble = this.time.addEvent({
            delay: 950, repeat: 24,
            callback: () => { if (this.sfx && this.bhShowerActive) this.sfx.meteorRumble(); }
        });

        let spawned = 0;
        const total = 14;
        const spawnNext = () => {
            if (spawned >= total) {
                this.time.delayedCall(2800, () => {
                    this.bhShowerActive = false;
                    if (this._bhShowerRumble) { this._bhShowerRumble.remove(false); this._bhShowerRumble = null; }
                    // Fade out storm music, restore appropriate track
                    if (this.gravityStormMusic) this.gravityStormMusic.fadeOut(1.5);
                    if (this.endlessMode) {
                        this.time.delayedCall(800, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });
                    } else {
                        this.time.delayedCall(800, () => { if (this.stage3Music) this.stage3Music.fadeIn(); });
                    }
                    onComplete();
                });
                return;
            }
            this._doSpawnShowerBlackhole(this.time.now);
            spawned++;
            this.time.delayedCall(Phaser.Math.Between(900, 1700), spawnNext);
        };
        this.time.delayedCall(1600, spawnNext);
    }

    _doSpawnShowerBlackhole(time) {
        const x     = Phaser.Math.Between(55, W - 55);
        const scale = Phaser.Math.FloatBetween(0.7, 2.4); // varied sizes
        const bh    = this.add.image(x, -75, 'blackhole').setDepth(6).setScale(scale);
        // Bigger BH = stronger gravity pull and more HP
        bh.setData({
            G:         Math.round(520000 * scale * scale),
            vy:        Phaser.Math.Between(56, 110),
            startX:    x,
            startTime: time,
            sineAmp:   Phaser.Math.Between(14, 44),
            sineFreq:  Phaser.Math.FloatBetween(0.24, 0.55),
            rotSpeed:  Phaser.Math.FloatBetween(90, 200),
            hp: Math.round(8 + scale * 5), maxHp: Math.round(8 + scale * 5),
        });
        this.blackholes.add(bh);
    }

    _spawnBlackholeImplosion(x, y) {
        // Concentric rings collapse inward
        const rings = [
            { r: 54, col: 0x220033, w: 5, delay: 0 },
            { r: 38, col: 0x6600aa, w: 4, delay: 50 },
            { r: 24, col: 0xaa22ff, w: 3, delay: 100 },
            { r: 12, col: 0xee88ff, w: 2, delay: 150 },
        ];
        for (const def of rings) {
            const g = this.add.graphics().setDepth(15);
            g.lineStyle(def.w, def.col, 1);
            g.strokeCircle(0, 0, def.r);
            g.x = x; g.y = y;
            this.tweens.add({
                targets: g, scaleX: 0, scaleY: 0, alpha: 0,
                delay: def.delay, duration: 400,
                ease: 'Power3.easeIn',
                onComplete: () => g.destroy()
            });
        }

        // Bright singularity core — flares up then collapses
        const core = this.add.graphics().setDepth(16);
        core.fillStyle(0x6600cc, 0.55); core.fillCircle(0, 0, 26);
        core.fillStyle(0xcc44ff, 0.85); core.fillCircle(0, 0, 14);
        core.fillStyle(0xffffff, 1);    core.fillCircle(0, 0, 5);
        core.x = x; core.y = y; core.setScale(0);
        this.tweens.add({
            targets: core, scaleX: 1, scaleY: 1,
            duration: 110, ease: 'Back.Out',
            onComplete: () => this.tweens.add({
                targets: core, scaleX: 0, scaleY: 0, alpha: 0,
                duration: 320, ease: 'Power3.easeIn',
                onComplete: () => core.destroy()
            })
        });

        // Debris: shoot outward briefly then get sucked back
        const debrisCols = [0x8800ff, 0x6600cc, 0xcc44ff, 0x4400aa, 0xaa00dd, 0x330066, 0xdd88ff];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist  = 32 + Math.random() * 28;
            const p = this.add.graphics().setDepth(14);
            p.fillStyle(debrisCols[i % debrisCols.length], 0.9);
            p.fillCircle(0, 0, 2 + Math.random() * 2.5);
            p.x = x; p.y = y;
            const tx = x + Math.cos(angle) * dist;
            const ty = y + Math.sin(angle) * dist;
            this.tweens.add({
                targets: p, x: tx, y: ty,
                duration: 170, ease: 'Power1',
                onComplete: () => this.tweens.add({
                    targets: p, x: x, y: y, scaleX: 0, scaleY: 0, alpha: 0,
                    duration: 250, ease: 'Power3.easeIn',
                    onComplete: () => p.destroy()
                })
            });
        }
    }

    _moveBlackholes(time, dt) {
        for (const bh of [...this.blackholes.getChildren()]) {
            if (!bh.active) continue;
            bh.y += bh.getData('vy') * dt;
            const elapsed = (time - bh.getData('startTime')) / 1000;
            bh.x = Phaser.Math.Clamp(bh.getData('startX') + Math.sin(elapsed * bh.getData('sineFreq')) * bh.getData('sineAmp'), 52, W - 52);
            bh.angle += bh.getData('rotSpeed') * dt;
            if (bh.y > H + 80) bh.destroy();
        }
    }

    // ── FX ───────────────────────────────────────────────────────────────────

    _spawnHealthCrystal(x, y) {
        const c = this.add.sprite(x, y, 'eproj1').setDepth(4).setTint(0xff44cc).setScale(1.4);
        c.setData('vy', 52);
        this.tweens.add({ targets: c, scaleX: 1.9, scaleY: 1.9, duration: 380, yoyo: true, repeat: -1 });
        this.healthCrystals.add(c);
    }

    _moveHealthCrystals(dt) {
        for (const c of [...this.healthCrystals.getChildren()]) {
            if (!c.active) continue;
            c.y += c.getData('vy') * dt;
            if (c.y > H + 20) c.destroy();
        }
    }

    _spawnShieldDrop(x, y) {
        const s = this.add.sprite(x, y, 'eproj1').setDepth(4).setTint(0x00ccff).setScale(1.5);
        s.setData('vy', 48);
        this.tweens.add({ targets: s, scaleX: 2.0, scaleY: 2.0, duration: 340, yoyo: true, repeat: -1 });
        this.shieldDrops.add(s);
    }

    _moveShieldDrops(dt) {
        for (const s of [...this.shieldDrops.getChildren()]) {
            if (!s.active) continue;
            s.y += s.getData('vy') * dt;
            if (s.y > H + 20) s.destroy();
        }
    }

    _drawShieldGraphic(g, color) {
        g.clear();
        g.fillStyle(color, 0.16);
        g.fillCircle(0, 0, 46);
        g.lineStyle(2.5, color, 0.9);
        g.strokeCircle(0, 0, 46);
        g.lineStyle(1, 0xffffff, 0.55);
        g.strokeCircle(0, 0, 40);
    }

    _activateShield(time) {
        this.shieldCount       = Math.max(0, this.shieldCount - 1);
        this.shieldActive      = true;
        this.shieldTimer       = time + 4000;
        this.shieldNextHumTime = time + 300;
        this.shieldColorIdx      = 0;
        this.shieldNextColorTime = time;

        const g = this.add.graphics().setDepth(6);
        this._drawShieldGraphic(g, RAINBOW_COLORS[0]);
        g.setPosition(this.player.x, this.player.y);
        this.shieldGraphic = g;

        this.tweens.add({ targets: g, alpha: 0.45, duration: 240, yoyo: true, repeat: -1 });
        if (this.sfx) this.sfx.shieldActivate();
    }

    _updateShield(time) {
        if (!this.shieldActive) return;
        if (time >= this.shieldTimer) { this._deactivateShield(); return; }
        this.shieldGraphic.setPosition(this.player.x, this.player.y);

        // Cycle chromatic colors every 600ms
        if (time >= this.shieldNextColorTime) {
            this.shieldColorIdx = (this.shieldColorIdx + 1) % RAINBOW_COLORS.length;
            this.shieldNextColorTime = time + 600;
            this._drawShieldGraphic(this.shieldGraphic, RAINBOW_COLORS[this.shieldColorIdx]);
        }

        // Force field hum every 350ms
        if (time >= this.shieldNextHumTime) {
            this.shieldNextHumTime = time + 350;
            if (this.sfx) this.sfx.shieldHum();
        }

        // Fast-flash warning in the last 1.2 seconds
        const remaining = this.shieldTimer - time;
        if (remaining < 1200) {
            this.shieldGraphic.alpha = (Math.floor(time / 120) % 2 === 0) ? 1 : 0.1;
        }
    }

    _deactivateShield() {
        this.shieldActive = false;
        if (this.shieldGraphic) { this.shieldGraphic.destroy(); this.shieldGraphic = null; }
        if (this.sfx) this.sfx.shieldExpire();
    }

    _showCapPopup(text) {
        if (this.time.now < this.nextCapWarning) return;
        this.nextCapWarning = this.time.now + 1800;
        const txt = this.add.text(this.player.x, this.player.y - 38, text, {
            fontFamily: 'monospace', fontSize: '13px', fill: '#ffdd00',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(21);
        this.tweens.add({
            targets: txt, y: txt.y - 36, alpha: 0, duration: 1100,
            ease: 'Power2', onComplete: () => txt.destroy()
        });
    }

    _spawnHitFX(x, y, isBiped) {
        const fx = this.add.sprite(x, y, isBiped ? 'hit2-1' : 'hit1').play(isBiped ? 'hit2-anim' : 'hit-anim').setDepth(7);
        fx.on('animationcomplete', () => fx.destroy());
        if (this.sfx) this.sfx.hit();
    }

    _spawnDeathFX(x, y, explKey) {
        const d = this.add.sprite(x, y, 'edeath1').play('death-anim').setDepth(7);
        d.on('animationcomplete', () => d.destroy());
        const ex = this.add.sprite(x + Phaser.Math.Between(-7,7), y + Phaser.Math.Between(-7,7), explKey + '1').play(explKey).setDepth(7);
        ex.on('animationcomplete', () => ex.destroy());
        if (this.sfx) (explKey === 'xC' ? this.sfx.asteroidExplode() : this.sfx.enemyDie());
    }

    _buildStats() {
        const ms  = Date.now() - this.runStartTime;
        const min = Math.floor(ms / 60000);
        const sec = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
        const acc = this.totalShotsFired > 0 ? Math.round(this.totalShotsHit / this.totalShotsFired * 100) : 0;
        return { kills: this.totalKills, accuracy: acc, combo: this.highestCombo,
                 time: `${min}:${sec}`, pickups: this.powerupsCollected };
    }

    _damagePlayer() {
        if (this.ghostActive) return;
        this.waveHitsTaken++;
        this.lives--;
        if (this.screenShake) this.cameras.main.shake(200, 0.013);
        if (this.sfx) this.sfx.playerHit();
        if (this.comboMult > 1 && this.sfx) this.sfx.comboBreak();
        this.comboCount = 0; this.comboMult = 1;
        if (this.rainbowMode) {
            this.rainbowMode = false;
            this.rainbowEnd  = 0;
            if (this._rainbowComboTween) { this._rainbowComboTween.stop(); this._rainbowComboTween = null; }
            this.comboTxt.setAngle(0).setScale(1);
            this._drawVignette(0xff0000);
        }
        const now2 = this.time.now;
        if (now2 < this.spreadTimer || now2 < this.twinTimer || now2 < this.rapidTimer) {
            if (this.sfx) this.sfx.weaponExpire();
        }
        this.spreadTimer = 0; this.twinTimer = 0; this.rapidTimer = 0;
        if (this.lives <= 0) {
            this.dead = true;
            this._playerDeathSequence();
        } else {
            this.invincible = true;
            this.tweens.add({
                targets: this.player, alpha: 0.15, duration: 65, yoyo: true, repeat: 9,
                onComplete: () => { this.player.alpha = 1; this.invincible = false; }
            });
        }
    }

    _updateShipFire() {
        const shouldBurn = this.lives === 1 && !this.dead;
        if (shouldBurn && !this._shipFireActive) this._startShipFire();
        else if (!shouldBurn && this._shipFireActive) this._stopShipFire();
    }

    _startShipFire() {
        this._shipFireActive = true;
        const FIRE_COLS = [0xff1100, 0xff4400, 0xff8800, 0xffcc00, 0xffffff];
        this._shipFireTimer = this.time.addEvent({
            delay: 38,
            loop:  true,
            callback: () => {
                if (!this.player || !this.player.active || !this._shipFireActive) return;
                const ox  = Phaser.Math.Between(-10, 10);
                const oy  = Phaser.Math.Between(6, 20);
                const r   = Phaser.Math.Between(3, 7);
                const col = FIRE_COLS[Math.floor(Math.random() * FIRE_COLS.length)];
                const g   = this.add.graphics().setDepth(7);
                g.fillStyle(col, 1);
                g.fillCircle(0, 0, r);
                g.x = this.player.x + ox;
                g.y = this.player.y + oy;
                this.tweens.add({
                    targets:  g,
                    y:        g.y - Phaser.Math.Between(22, 46),
                    x:        g.x + Phaser.Math.Between(-10, 10),
                    alpha:    0,
                    scaleX:   0.1,
                    scaleY:   0.1,
                    duration: Phaser.Math.Between(150, 300),
                    ease:     'Quad.Out',
                    onComplete: () => g.destroy(),
                });
            },
        });
    }

    _stopShipFire() {
        this._shipFireActive = false;
        if (this._shipFireTimer) { this._shipFireTimer.destroy(); this._shipFireTimer = null; }
    }

    // ── Weapon power-ups ──────────────────────────────────────────────────────

    _spawnWeaponDrop(x, y) {
        const types  = ['spread', 'twin', 'rapid'];
        const glows  = { spread: 0xff8800, twin: 0x00ccaa, rapid: 0xff44ff };
        const type   = Phaser.Utils.Array.GetRandom(types);
        const w = this.add.image(x, y, `powerup-${type}`).setDepth(4).setScale(0.5);
        w.postFX.addGlow(glows[type], 6, 0, false);
        w.setData({ vx: 0, vy: 55, weaponType: type });
        this.tweens.add({ targets: w, angle: 360, duration: 3500, repeat: -1 });
        this.weaponDrops.add(w);
    }

    _moveWeaponDrops(dt) {
        const ABSORB_R  = 20;
        const GRAVITY_R = 150;
        const G         = 300000;
        for (const w of [...this.weaponDrops.getChildren()]) {
            if (!w.active) continue;
            let vx = w.getData('vx');
            let vy = w.getData('vy');
            for (const bh of [...this.blackholes.getChildren()]) {
                if (!bh.active) continue;
                const dx   = bh.x - w.x;
                const dy   = bh.y - w.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < ABSORB_R) { this._spawnHitFX(w.x, w.y, false); w.destroy(); break; }
                if (dist < GRAVITY_R) {
                    const force = (G / (dist * dist)) * dt;
                    vx += (dx / dist) * force;
                    vy += (dy / dist) * force;
                }
            }
            if (!w.active) continue;
            w.setData('vx', vx); w.setData('vy', vy);
            w.x += vx * dt;
            w.y += vy * dt;
            if (w.y > H + 20 || w.x < -40 || w.x > W + 40) w.destroy();
        }
    }

    _activateWeapon(type) {
        const now = this.time.now;
        const dur = 12000;
        if      (type === 'spread') this.spreadTimer = Math.max(this.spreadTimer, now) + dur;
        else if (type === 'twin')   this.twinTimer   = Math.max(this.twinTimer,   now) + dur;
        else if (type === 'rapid')  this.rapidTimer  = Math.max(this.rapidTimer,  now) + dur;
        if (this.sfx) this.sfx.weaponPickup();
    }

    _updateWeapon(time) {
        const hasSpread = time < this.spreadTimer;
        const hasTwin   = time < this.twinTimer;
        const hasRapid  = time < this.rapidTimer;
        if ((this._prevSpread && !hasSpread) ||
            (this._prevTwin   && !hasTwin)   ||
            (this._prevRapid  && !hasRapid)) {
            if (this.sfx) this.sfx.weaponExpire();
        }
        this._prevSpread = hasSpread;
        this._prevTwin   = hasTwin;
        this._prevRapid  = hasRapid;

    }

    // ── Kamikaze Drone ────────────────────────────────────────────────────────

    _spawnDrone() {
        const count = Phaser.Math.Between(2, 3);
        const baseX = Phaser.Math.Between(50, W - 50);
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Clamp(baseX + (i - 1) * 28, 30, W - 30);
            const e = this.add.sprite(x, Phaser.Math.Between(-60, -20), 'e02-1')
                .play('drone-fly').setDepth(3);
            e.setData({ type: 'drone', hp: 1 });
            this.enemies.add(e);
            this.waveAlive++;
        }
        if (this.sfx) this.sfx.droneSpawn();
    }

    // ── Shield Carrier ────────────────────────────────────────────────────────

    _spawnCarrier(time) {
        const x = Phaser.Math.Between(60, W - 60);
        const e = this.add.sprite(x, -50, 'e03-1').play('carrier-move').setDepth(3).setScale(1.1);
        const firstDrop = time + Phaser.Math.Between(7000, 10000);
        const shieldGfx = this.add.graphics().setDepth(4);
        e.on('destroy', () => { if (shieldGfx && shieldGfx.active) shieldGfx.destroy(); });
        e.setData({ type: 'carrier', hp: 5, vy: 38 * this.enemySpeedMult, startX: x, startTime: time,
                    nextFire: time + Phaser.Math.Between(1800, 3000) / this.enemyFireMult,
                    shieldDown: false, nextShieldDrop: firstDrop, shieldDownUntil: 0, shieldGfx });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _fireCarrierBurst(x, y) {
        [-10, 10].forEach(off => {
            const p = this.add.sprite(x + off, y + 14, 'eproj1').play('eproj-anim').setDepth(4);
            p.setData('vy', 215);
            this.enemyBolts.add(p);
        });
        if (this.sfx) this.sfx.bossFire();
    }

    // ── Combo system ──────────────────────────────────────────────────────────

    _registerKill(pts) {
        const now = this.time.now;
        if (now - this.comboLastKill < 2500) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        this.comboLastKill = now;

        const prev = this.comboMult;
        this.comboMult = this.comboCount >= 10 ? 4 : this.comboCount >= 6 ? 3 : this.comboCount >= 3 ? 2 : 1;
        if (this.comboMult > prev) {
            this._showComboUp(this.comboMult);
            if (this.sfx) this.sfx.comboUp(this.comboMult);
            if (this.comboMult === 4 && !this.rainbowMode) this._activateRainbowMode();
        }
        if (this.comboMult > this.highestCombo) this.highestCombo = this.comboMult;

        const rainbowBonus = this.rainbowMode ? 1.5 : 1;
        this.score += Math.floor(pts * this.comboMult * this.hardScoreMult * rainbowBonus * this.crystalNextWaveMult);
        this._checkScoreMilestones();
    }

    _checkScoreMilestones() {
        for (const ms of [5000, 10000, 25000, 50000, 100000]) {
            if (this.score >= ms && !this.scoreMilestones.has(ms)) {
                this.scoreMilestones.add(ms);
                const label = ms >= 1000 ? `★ SCORE ${ms/1000}K ★` : `★ SCORE ${ms} ★`;
                const badge = this.add.text(W + 160, H / 2 - 60, label, {
                    fontFamily: 'monospace', fontSize: '17px', fill: '#ffee55',
                    stroke: '#4466aa', strokeThickness: 4
                }).setOrigin(0.5).setDepth(22).setAlpha(0).setScale(0.5);
                this.tweens.add({
                    targets: badge, x: W - 80, alpha: 1, scale: 1.0, duration: 320, ease: 'Back.Out',
                    onComplete: () => {
                        // Rainbow color cycle
                        const colors = ['#ffee55','#ff6699','#55eeff','#aaff44','#ff9900','#cc55ff'];
                        let ci = 0;
                        const cycle = this.time.addEvent({ delay: 120, repeat: 9, callback: () => {
                            badge.setStyle({ fill: colors[ci % colors.length] });
                            ci++;
                        }});
                        this.tweens.add({ targets: badge, alpha: 0, duration: 350, delay: 1200,
                            onComplete: () => { cycle.remove(); badge.destroy(); } });
                    }
                });
                if (this.sfx) this.sfx.milestone();
            }
        }
    }

    _showComboUp(mult) {
        if (!this.showComboPop) return;
        const txt = this.add.text(this.player.x, this.player.y - 52, 'COMBO  ×' + mult, {
            fontFamily: 'monospace', fontSize: '18px', fill: '#ffee00',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(22).setScale(0.4);
        this.tweens.add({
            targets: txt, scale: 1.6, duration: 170, ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: txt, y: txt.y - 42, alpha: 0, scale: 1.0, duration: 820,
                    ease: 'Power2', onComplete: () => txt.destroy()
                });
            }
        });
    }

    _showFlawless() {
        const txt = this.add.text(W/2, H/2 - 40, 'FLAWLESS  +200', {
            fontFamily: 'monospace', fontSize: '20px', fill: '#ffffaa',
            stroke: '#886600', strokeThickness: 5
        }).setOrigin(0.5).setDepth(22).setAlpha(0).setScale(0.5);
        this.tweens.add({ targets: txt, alpha: 1, scale: 1.4, duration: 220, ease: 'Back.Out',
            onComplete: () => this.tweens.add({ targets: txt, y: txt.y - 55, alpha: 0, duration: 900, delay: 600, onComplete: () => txt.destroy() }) });
    }

    _updateHUD() {
        this.scoreTxt.setText('SCORE  ' + String(this.score).padStart(6, '0'));
        if (this.waveNum > 0 && !this.bossActive && !this.midBossActive && !this.prismOverlordActive) {
            if (this.endlessMode && this.waveNum > WAVES.length) {
                // waveTxt and tier info maintained by _updateEndlessHUD — no-op here
            } else if (!this.prismMode || this.waveState !== 'done') {
                this.waveTxt.setText('WAVE  ' + this.waveNum);
            }
        }
        this.livesTxt.setText('LIVES  ' + '♥'.repeat(Math.max(this.lives, 0)));
        const slots = '■'.repeat(Math.max(this.shieldCount, 0)) + '□'.repeat(Math.max(2 - this.shieldCount, 0));
        if (this.shieldActive) {
            this.shieldTxt.setText(`PLASMA SHIELD ACTIVE   ${slots}`).setStyle({ fill: '#00ffff' });
        } else if (this.shieldCount > 0) {
            this.shieldTxt.setText(`E — PLASMA SHIELD   ${slots}`).setStyle({ fill: '#44aaff' });
        } else {
            this.shieldTxt.setText('');
        }

        // Weapon timer bar — stacked modifiers
        const wNow      = this.time.now;
        const wSpread   = wNow < this.spreadTimer;
        const wTwin     = wNow < this.twinTimer;
        const wRapid    = wNow < this.rapidTimer;
        const wParts    = [];
        const wTimers   = [];
        if (wRapid)  { wParts.push('RAPID');  wTimers.push(this.rapidTimer); }
        if (wSpread) { wParts.push('SPREAD'); wTimers.push(this.spreadTimer); }
        if (wTwin)   { wParts.push('TWIN');   wTimers.push(this.twinTimer); }
        if (wParts.length > 0) {
            const minTimer = Math.min(...wTimers);
            const pct      = Math.max(0, (minTimer - wNow) / 12000);
            const barColor = wParts.length >= 3 ? 0xffee00 : wParts.length === 2 ? 0xff8800 : 0xaaffee;
            const txtColor = wParts.length >= 3 ? '#ffee00' : wParts.length === 2 ? '#ff8800' : '#aaffee';
            this.weaponTxt.setText(wParts.join(' + ')).setStyle({ fill: txtColor });
            this.weaponBarBg.setVisible(true);
            this.weaponBarFg.setVisible(true).setFillStyle(barColor).setSize(90 * pct, 4);
        } else {
            this.weaponTxt.setText('');
            this.weaponBarBg.setVisible(false);
            this.weaponBarFg.setVisible(false);
        }

        // Combo badge
        if (this.rainbowMode) {
            const secsLeft = Math.ceil(Math.max(0, this.rainbowEnd - this.time.now) / 1000);
            this.comboTxt.setText(`RAINBOW\n   ×4  ${secsLeft}s`);
        } else {
            this.comboTxt.setText(this.comboMult > 1 ? '×' + this.comboMult : '');
        }
    }

    // ── Stage 3 / Stage 4 ────────────────────────────────────────────────────

    _beginStage3() {
        this.isStage3Started = true;
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.homingFireballs.getChildren()].forEach(p => p.destroy());

        // Void atmosphere — near-black, cold blue stars, no planets
        this.bgDeep.setTint(0x000a1a);
        this.bgStars.setTint(0x001833);
        this.tweens.add({ targets: this.bgDeep,    alpha: 1,    duration: 1600 });
        this.tweens.add({ targets: this.bgStars,   alpha: 0.55, duration: 1600 });
        this.tweens.add({ targets: this.stageBack,  alpha: 0.06, duration: 1600 });
        this.tweens.add({ targets: [this.planetBig, this.planetSmall], alpha: 0, duration: 800 });

        if (this.gameMusic)  this.gameMusic.fadeOut(0.8);
        if (this.bossMusic)  this.bossMusic.fadeOut(0.8);
        this.time.delayedCall(2400, () => { if (this.stage3Music) this.stage3Music.start(); });

        this.announceTxt.setText('STAGE  3').setAlpha(0).setStyle({ fill: '#00ffee', fontSize: '46px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 380,
            onComplete: () => {
                this.time.delayedCall(1800, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => this._startWave(STAGE3_WAVE)
                    });
                });
            }
        });
    }

    _beginStage4() {
        this.isStage4Started = true;
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.ionOrbs.getChildren()].forEach(o => o.destroy());

        // Deep void — near-black, purple gravity distortion
        this.bgDeep.setTint(0x060006);
        this.bgStars.setTint(0x110022);
        this.tweens.add({ targets: this.bgDeep,    alpha: 1,    duration: 1800 });
        this.tweens.add({ targets: this.bgStars,   alpha: 0.75, duration: 1800 });
        this.tweens.add({ targets: this.stageBack,  alpha: 0.03, duration: 1800 });

        // Brief dip then continue stage3Music through Stage 4
        if (this.stage3Music)   { this.stage3Music.fadeOut(0.5); }
        if (this.ionStormMusic) { this.ionStormMusic.fadeOut(0.5); }
        this.time.delayedCall(1400, () => { if (this.stage3Music) this.stage3Music.fadeIn(); });
        // Ambient sub-bass void drone fades in
        if (this.sfx && this.sound && this.sound.context) {
            this.sfx.voidDrone(this.sound.context, this.sound.context.destination);
        }

        this.announceTxt.setText('STAGE  4').setAlpha(0).setStyle({ fill: '#aa44ff', fontSize: '46px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 380,
            onComplete: () => {
                this.time.delayedCall(1800, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => this._startWave(STAGE4_WAVE)
                    });
                });
            }
        });
    }

    _spawnSwarmGroup(time, rapid = false) {
        const baseX = Phaser.Math.Between(50, W - 50);
        const splitY = H * 0.50;
        for (let i = 0; i < 4; i++) {
            const x = Phaser.Math.Clamp(baseX + (i - 1.5) * 30, 22, W - 22);
            const e = this.add.sprite(x, Phaser.Math.Between(-60, -20), 'alien1')
                .play('alien-fly').setDepth(3).setScale(0.9);
            const svx = i < 2 ? -80 : 80;
            e.setData({ type: 'swarm', hp: 1, vy: Phaser.Math.Between(85, 130) * this.enemySpeedMult,
                        startX: x, startTime: time, splitY, svx, kamikaze: false });
            this.enemies.add(e);
            this.waveAlive++;
        }
        if (this.sfx) this.sfx.swarmSpawn();
        // Wave after wave: 38% chance of 2 rapid follow-up groups (non-recursive)
        if (!rapid && Math.random() < 0.38) {
            this.time.delayedCall(800,  () => { if (!this.dead && !this.gameOver) this._spawnSwarmGroup(this.time.now, true); });
            this.time.delayedCall(1600, () => { if (!this.dead && !this.gameOver) this._spawnSwarmGroup(this.time.now, true); });
        }
    }

    // ── Ion Storm ─────────────────────────────────────────────────────────────

    _beginIonStorm(onComplete) {
        this.ionStormActive = true;
        if (this.sfx) this.sfx.ionStormWarning();
        if (this.gameMusic)     this.gameMusic.fadeOut(0.8);
        if (this.bossMusic)     this.bossMusic.fadeOut(0.8);
        if (this.stage3Music)   this.stage3Music.fadeOut(1.0);
        if (this.ionStormMusic) { this.time.delayedCall(900, () => { if (this.ionStormMusic) this.ionStormMusic.start(); }); }

        // Cycling colors for the warning text
        const stormColors = ['#88ccff', '#ff44ff', '#ffee00', '#44ffcc', '#ff8844'];
        let colorIdx = 0;
        const colorCycle = this.time.addEvent({
            delay: 220, repeat: 18,
            callback: () => {
                colorIdx = (colorIdx + 1) % stormColors.length;
                if (this.announceTxt.alpha > 0)
                    this.announceTxt.setStyle({ fill: stormColors[colorIdx], fontSize: '28px', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5 });
            }
        });

        this.announceTxt.setText('⚡  ION  STORM  ⚡').setAlpha(0).setStyle({ fill: '#88ccff', fontSize: '28px', fontFamily: 'monospace', stroke: '#000', strokeThickness: 5 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 240,
            onComplete: () => {
                this.time.delayedCall(1600, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => colorCycle.remove(false)
                    });
                });
            }
        });

        const boltColors = [0x88ccff, 0xff44ff, 0xffee00, 0x44ffcc, 0xffffff, 0xff8844, 0xaa44ff];
        let strike = 0;
        const doStrike = () => {
            if (strike >= 10) {
                this.ionStormActive = false;
                if (this.ionStormMusic) this.ionStormMusic.fadeOut(1.5);
                this.time.delayedCall(1600, () => { if (this.stage3Music) this.stage3Music.fadeIn(); });
                onComplete();
                return;
            }
            this._fireIonBolt(Phaser.Utils.Array.GetRandom(boltColors));
            strike++;
            this.time.delayedCall(1000, doStrike);
        };
        this.time.delayedCall(700, doStrike);
    }

    _fireIonBolt(boltColor = 0x88ccff) {
        const boltX = Phaser.Math.Between(30, W - 30);

        // Warning: thin pulsing glow column + a ghosted bolt sprite (dim, alpha 0.3)
        const warn = this.add.graphics().setDepth(12);
        warn.lineStyle(4, boltColor, 0.4);
        warn.lineBetween(boltX, 0, boltX, H);
        this.tweens.add({ targets: warn, alpha: 0.1, duration: 130, yoyo: true, repeat: 3 });

        const warnBolt = this.add.sprite(boltX, H / 2, 'ionBolt0')
            .setDepth(12).setScale(0.55, H / 64).setTint(boltColor).setAlpha(0.28);
        this.tweens.add({ targets: warnBolt, alpha: 0.08, duration: 130, yoyo: true, repeat: 3 });

        this.time.delayedCall(650, () => {
            if (warn.active)     warn.destroy();
            if (warnBolt.active) warnBolt.destroy();
            if (this.sfx) this.sfx.ionBolt();

            // Glow backing column
            const glow = this.add.graphics().setDepth(12);
            glow.lineStyle(22, boltColor, 0.18);
            glow.lineBetween(boltX, 0, boltX, H);
            glow.lineStyle(10, boltColor, 0.45);
            glow.lineBetween(boltX, 0, boltX, H);

            // Animated lightning bolt sprite — stretched to full screen height
            const boltSprite = this.add.sprite(boltX, H / 2, 'ionBolt0')
                .play('ion-bolt-anim').setDepth(13)
                .setScale(0.6, H / 64)     // 0.6× wide, full H tall
                .setTint(boltColor);
            boltSprite.on('animationcomplete', () => { if (boltSprite.active) boltSprite.destroy(); });

            // Ion flash burst at center for impact
            const fx = this.add.sprite(boltX, H / 2, 'ionFlash0').play('ion-flash-anim')
                .setDepth(14).setScale(3.0).setTint(boltColor);
            fx.on('animationcomplete', () => fx.destroy());

            // Second flash at top entry point
            const fxTop = this.add.sprite(boltX, 30, 'ionFlash0').play('ion-flash-anim')
                .setDepth(14).setScale(1.8).setTint(boltColor);
            fxTop.on('animationcomplete', () => fxTop.destroy());

            // Screen effects
            const r = (boltColor >> 16) & 0xff;
            const g = (boltColor >> 8)  & 0xff;
            const bC = boltColor & 0xff;
            this.cameras.main.flash(130, r, g, bC, false);
            this.cameras.main.shake(180, 0.01);

            // Damage check — shield does NOT block; ±32 px column
            if (!this.dead && !this.invincible) {
                if (Math.abs(this.player.x - boltX) <= 32) this._damagePlayer();
            }

            this.time.delayedCall(220, () => { if (glow.active) glow.destroy(); });
        });
    }

    // ── Void Cruiser ──────────────────────────────────────────────────────────

    _showVoidCruiserWarning() {
        this.announceTxt.setText('⚠  WARNING  ⚠\nVOID  WRAITH').setAlpha(0)
            .setStyle({ fill: '#aa44ff', fontSize: '28px' });
        if (this.gameMusic)          this.gameMusic.fadeOut(1.0);
        if (this.stage3Music)        this.stage3Music.fadeOut(1.2);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.8);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.8);
        this.time.delayedCall(1200, () => { if (this.bossMusic) this.bossMusic.start(); });
        if (this.sfx) this.sfx.bossWarning();
        let flashes = 0;
        const flash = () => {
            this.tweens.add({
                targets: this.announceTxt, alpha: 1, duration: 260, yoyo: true,
                onComplete: () => {
                    flashes++;
                    if (flashes < 4) this.time.delayedCall(120, flash);
                    else { this.announceTxt.setAlpha(0); this._beginVoidCruiser(); }
                }
            });
        };
        flash();
    }

    _beginVoidCruiser() {
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.midBossFireballs.getChildren()].forEach(p => p.destroy());

        this.voidCruiserSprite    = this.add.sprite(W / 2, -110, 'bvw0').play('void-wraith-anim').setDepth(5).setScale(2.2);
        this.voidCruiserActive    = true;
        this.voidCruiserEntering  = true;
        this.voidCruiserHp        = Math.round(35 * this.bossHpMult);
        this.voidCruiserMaxHp     = this.voidCruiserHp;
        this.voidCruiserPhase     = 1;
        this.voidCruiserT         = 0;
        this.voidCruiserVx        = 55;
        this.voidCruiserBeamAngle = 0;
        this.voidCruiserBeamDir   = 1;
        this.voidCruiserNextFire     = this.time.now + 999999;
        this.voidCruiserNextDiag     = this.time.now + 999999;
        this.voidCruiserNextBeam     = this.time.now + 999999;
        this.voidCruiserNextIonBlast = this.time.now + 999999;

        this.bossBarBg.setVisible(true);
        this.bossBarFg.setFillStyle(0x8800ff).setVisible(true);
        this.bossBarLabel.setText('VOID  WRAITH').setVisible(true);
    }

    _updateVoidCruiser(time, dt) {
        if (!this.voidCruiserActive || !this.voidCruiserSprite) return;
        const boss = this.voidCruiserSprite;

        if (this.voidCruiserEntering) {
            boss.y += 90 * dt;
            if (boss.y >= 155) {
                boss.y = 155;
                this.voidCruiserEntering     = false;
                this.voidCruiserNextFire     = time + 2000;
                this.voidCruiserNextDiag     = time + 3000;
                this.voidCruiserNextIonBlast = time + 4500;
            }
            return;
        }

        // Horizontal bounce + gentle vertical sine drift (period ~5 s, amplitude 40 px)
        this.voidCruiserT += dt;
        boss.x += this.voidCruiserVx * dt;
        if (boss.x > W - 80) { boss.x = W - 80; this.voidCruiserVx = -Math.abs(this.voidCruiserVx); }
        if (boss.x < 80)     { boss.x = 80;      this.voidCruiserVx =  Math.abs(this.voidCruiserVx); }
        boss.y = 155 + Math.sin(this.voidCruiserT * Math.PI * 2 / 5) * 40;

        // Phase transition at ≤17 HP
        if (this.voidCruiserPhase === 1 && this.voidCruiserHp <= Math.floor(this.voidCruiserMaxHp / 2)) {
            this.voidCruiserPhase = 2;
            this.voidCruiserVx    = this.voidCruiserVx > 0 ? 80 : -80;
            this.voidCruiserNextBeam = time + 600;
            this.cameras.main.flash(300, 100, 0, 200);
            const txt = this.add.text(W / 2, H / 2 - 20, 'PHASE  2', {
                fontFamily: 'monospace', fontSize: '26px', fill: '#aa44ff', stroke: '#000', strokeThickness: 5
            }).setOrigin(0.5).setDepth(20).setAlpha(0);
            this.tweens.add({ targets: txt, alpha: 1, duration: 180, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
        }

        // Phase 2: tint wraith red as it gets hurt (white → red)
        if (this.voidCruiserPhase === 2) {
            const hpPct = this.voidCruiserHp / this.voidCruiserMaxHp;
            const p2StartPct = 0.5;
            const progress = Phaser.Math.Clamp((p2StartPct - hpPct) / p2StartPct, 0, 1);
            const gb = Math.floor(0xff * (1 - progress));
            boss.setTint((0xff << 16) | (gb << 8) | gb);
        }

        // Attacks — phase 1 spread + diagonal; phase 2 adds sweep; both phases get ion blasts
        if (time >= this.voidCruiserNextFire) {
            this.voidCruiserNextFire = time + 2000;
            this._vcSpread(boss.x, boss.y, 3, 30);
        }
        if (time >= this.voidCruiserNextDiag) {
            this.voidCruiserNextDiag = time + 3000;
            this._vcDiagBolts(boss.x, boss.y);
        }
        if (time >= this.voidCruiserNextIonBlast) {
            this.voidCruiserNextIonBlast = time + (this.voidCruiserPhase === 2 ? 3800 : 5000);
            this._vcFireIonBlast(boss.x, boss.y);
        }
        if (this.voidCruiserPhase === 2) {
            this._vcSweepBeam(time, dt, boss.x, boss.y);
        }

        // HP bar
        const pct = Math.max(0, this.voidCruiserHp / this.voidCruiserMaxHp);
        this.bossBarFg.width = 300 * pct;
    }

    _vcSpread(bx, by, count, halfAngle) {
        if (this.sfx) this.sfx.bossFire();
        for (let i = 0; i < count; i++) {
            const deg = Phaser.Math.Linear(-halfAngle, halfAngle, count === 1 ? 0.5 : i / (count - 1));
            const rad = Phaser.Math.DegToRad(deg);
            const speed = 185;
            const p = this.add.sprite(bx, by + 20, 'tdbl1').play('td-bolt').setDepth(4).setScale(1.5).setTint(0xaa44ff);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.midBossFireballs.add(p);
        }
    }

    _vcDiagBolts(bx, by) {
        if (this.sfx) this.sfx.bossFire();
        for (const deg of [-55, 55]) {
            const rad = Phaser.Math.DegToRad(deg);
            const speed = 210;
            const p = this.add.sprite(bx, by + 20, 'tdbl1').play('td-bolt').setDepth(4).setScale(1.3).setTint(0x6600ff);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.midBossFireballs.add(p);
        }
    }

    _vcSweepBeam(time, dt, bx, by) {
        this.voidCruiserBeamAngle += this.voidCruiserBeamDir * 85 * dt;
        if (this.voidCruiserBeamAngle >  55) { this.voidCruiserBeamAngle =  55; this.voidCruiserBeamDir = -1; }
        if (this.voidCruiserBeamAngle < -55) { this.voidCruiserBeamAngle = -55; this.voidCruiserBeamDir =  1; }

        if (time >= this.voidCruiserNextBeam) {
            this.voidCruiserNextBeam = time + 85;
            const rad = Phaser.Math.DegToRad(this.voidCruiserBeamAngle);
            const speed = 390;
            const p = this.add.sprite(bx, by + 24, 'tdbl1').play('td-bolt').setDepth(4).setScale(0.9).setTint(0xcc00ff);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.midBossFireballs.add(p);
            if (this.sfx && time >= this.voidCruiserBeamSoundNext) {
                this.voidCruiserBeamSoundNext = time + 300;
                this.sfx.bossSweep();
            }
        }
    }

    _vcFireIonBlast(bx, by) {
        if (this.sfx) this.sfx.bossFire();
        // Telegraph: brief cyan flare on the cruiser
        this.cameras.main.flash(80, 0, 200, 255, false);

        const count = this.voidCruiserPhase === 2 ? 2 : 1;
        for (let i = 0; i < count; i++) {
            const offsetX = count === 1 ? 0 : (i === 0 ? -30 : 30);
            const orb = this.add.sprite(bx + offsetX, by + 20, 'ionOrb0').play('ion-orb-anim')
                .setDepth(5).setScale(1.4).setTint(0x44ccff);
            orb.setData({ vy: 95, targetX: bx + offsetX, born: this.time.now, lifetime: 5000 });
            this.ionOrbs.add(orb);
        }
    }

    _moveIonOrbs(time, dt) {
        for (const orb of [...this.ionOrbs.getChildren()]) {
            if (!orb.active) continue;
            orb.y += orb.getData('vy') * dt;
            // Slight drift toward original target X
            const tx = orb.getData('targetX');
            orb.x += (tx - orb.x) * 0.015;

            // Lifetime check
            if (time - orb.getData('born') >= orb.getData('lifetime') || orb.y > H - 30) {
                this._spawnIonDetonation(orb.x);
                orb.destroy();
                continue;
            }

            // Player direct hit
            if (!this.invincible && !this.dead) {
                if (Phaser.Math.Distance.Between(orb.x, orb.y, this.player.x, this.player.y) < 22) {
                    this._spawnIonDetonation(orb.x);
                    orb.destroy();
                    this._damagePlayer();
                }
            }
        }
    }

    _spawnIonDetonation(x) {
        // Column damage check — shield does NOT block
        if (!this.dead && !this.invincible) {
            if (Math.abs(this.player.x - x) <= 28) this._damagePlayer();
        }
        // Visual flash using ion-flash sprite + Graphics column
        const g = this.add.graphics().setDepth(13);
        const cols = [0x44ccff, 0xaa44ff, 0xffffff];
        const widths = [12, 6, 2];
        cols.forEach((c, i) => { g.lineStyle(widths[i], c, 1 - i * 0.2); g.lineBetween(x, 0, x, H); });
        this.cameras.main.shake(180, 0.01);
        this.cameras.main.flash(120, 0, 150, 255, false);

        // Ion flash sprite centered
        const fx = this.add.sprite(x, H / 2, 'ionFlash0').play('ion-flash-anim').setDepth(14).setScale(3.0).setTint(0x44ccff);
        fx.on('animationcomplete', () => fx.destroy());

        this.time.delayedCall(200, () => { if (g.active) g.destroy(); });
        if (this.sfx) this.sfx.ionBolt();
    }

    _voidCruiserDeath() {
        this.voidCruiserActive = false;
        this._registerKill(3000);

        const bx = this.voidCruiserSprite.x;
        const by = this.voidCruiserSprite.y;
        this.voidCruiserSprite.destroy();
        this.voidCruiserSprite = null;

        this.cameras.main.shake(1200, 0.016);
        this.bossBarBg.setVisible(false);
        this.bossBarFg.setVisible(false);
        this.bossBarLabel.setVisible(false);
        if (this.sfx) this.sfx.voidCruiserDeath();
        if (this.bossMusic) this.bossMusic.fadeOut(1.5);
        this.time.delayedCall(1500, () => {
            if (this.endlessMode) { if (this.gameMusic) this.gameMusic.fadeIn(); }
            else { if (this.stage3Music) this.stage3Music.fadeIn(); }
        });

        let count = 0;
        const doExplosion = () => {
            if (count >= 8) {
                [...this.midBossFireballs.getChildren()].forEach(p => p.destroy());
                [...this.ionOrbs.getChildren()].forEach(p => p.destroy());
                this.time.delayedCall(700, () => {
                    if (this.endlessMode) this._endlessTierTransition();
                    else this._startWave(14);
                });
                return;
            }
            if (this.sfx) this.sfx.bossExplosion();
            const d = this.add.sprite(bx + Phaser.Math.Between(-70, 70), by + Phaser.Math.Between(-50, 50), 'xD1')
                .play('xD').setDepth(16).setScale(Phaser.Math.FloatBetween(0.9, 1.8));
            d.on('animationcomplete', () => d.destroy());
            const f = this.add.sprite(bx + Phaser.Math.Between(-50, 50), by + Phaser.Math.Between(-40, 40), 'xB1')
                .play('xB').setDepth(16).setScale(Phaser.Math.FloatBetween(0.8, 1.5));
            f.on('animationcomplete', () => f.destroy());
            count++;
            this.time.delayedCall(220, doExplosion);
        };
        doExplosion();
    }

    // ── Vignette ──────────────────────────────────────────────────────────────

    _drawVignette(color) {
        this._vignetteColor = color;
        this.vignette.clear();
        const alpha = this.rainbowMode ? 0.38 : 0.55;
        this.vignette.fillStyle(color, alpha);
        this.vignette.fillRect(0, 0, W, 52);
        this.vignette.fillRect(0, H - 52, W, 52);
        this.vignette.fillRect(0, 52, 52, H - 104);
        this.vignette.fillRect(W - 52, 52, 52, H - 104);
    }

    _updateVignette() {
        if (this.rainbowMode) {
            if (!this._vignetteTween) {
                this._vignetteTween = this.tweens.add({
                    targets: this.vignette, alpha: 0.7, duration: 300,
                    yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        } else if (this.lives === 1 && !this.dead) {
            if (this._vignetteColor !== 0xff0000) this._drawVignette(0xff0000);
            if (!this._vignetteTween) {
                this._vignetteTween = this.tweens.add({
                    targets: this.vignette, alpha: 0.9, duration: 900,
                    yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        } else {
            if (this._vignetteTween) {
                this._vignetteTween.stop();
                this._vignetteTween = null;
                this.vignette.setAlpha(0);
            }
        }
    }

    // ── M10 — Chromatic Chaos systems ────────────────────────────────────────

    _activateRainbowMode() {
        this.rainbowMode      = true;
        this.rainbowEnd       = this.time.now + 8000;
        this.rainbowColorIdx  = 0;
        this.rainbowNextColor = this.time.now;
        if (this.sfx) this.sfx.rainbowMode();

        const announce = this.add.text(W / 2, H / 2 - 60, 'RAINBOW  MODE!', {
            fontFamily: 'monospace', fontSize: '22px', fill: '#ffee00',
            stroke: '#880044', strokeThickness: 5
        }).setOrigin(0.5).setDepth(22).setScale(0.3);
        this.tweens.add({
            targets: announce, scale: 1.4, duration: 200, ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: announce, y: announce.y - 50, alpha: 0, duration: 1100,
                    ease: 'Power2', onComplete: () => announce.destroy()
                });
            }
        });

        this.comboTxt.setStyle({ fontFamily: 'monospace', fontSize: '18px', fill: '#ff2222', stroke: '#000044', strokeThickness: 5, align: 'right' });

        if (this._rainbowComboTween) this._rainbowComboTween.stop();
        this._rainbowComboTween = this.tweens.add({
            targets: this.comboTxt,
            angle: { from: -10, to: 10 },
            scaleX: { from: 0.9, to: 1.35 },
            scaleY: { from: 0.9, to: 1.35 },
            duration: 220, yoyo: true, repeat: -1
        });
    }

    _updateRainbowMode(time) {
        if (!this.rainbowMode) return;
        if (time >= this.rainbowEnd) {
            this.rainbowMode = false;
            this.rainbowEnd  = 0;
            if (this._rainbowComboTween) { this._rainbowComboTween.stop(); this._rainbowComboTween = null; }
            this.comboTxt.setAngle(0).setScale(1).setStyle({ fontFamily: 'monospace', fontSize: '13px', fill: '#ffee00', stroke: '#000', strokeThickness: 3 });
            this._drawVignette(0xff0000);
            return;
        }
        if (time >= this.rainbowNextColor) {
            this.rainbowColorIdx  = (this.rainbowColorIdx + 1) % RAINBOW_COLORS.length;
            this.rainbowNextColor = time + 300;
            this._drawVignette(RAINBOW_COLORS[this.rainbowColorIdx]);
            const hexCol = '#' + RAINBOW_COLORS[this.rainbowColorIdx].toString(16).padStart(6, '0');
            this.comboTxt.setStyle({ fontFamily: 'monospace', fontSize: '18px', fill: hexCol, stroke: '#000044', strokeThickness: 5, align: 'right' });
        }
    }

    _triggerCrystalEvent() {
        if (this.crystalActive) return;
        this.crystalActive = true;
        if (this.sfx) this.sfx.crystalEvent();

        this.announceTxt.setText('✦  CRYSTAL  ✦').setAlpha(0)
            .setStyle({ fill: '#ff88ff', fontSize: '22px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 200,
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 280 });
                });
            }
        });

        const c = this.add.sprite(W / 2, -60, 'prism-crystal-0').play('prism-crystal-anim').setDepth(6).setScale(1.2);
        c.setData({ vy: 42 });
        this.tweens.add({ targets: c, angle: 360, duration: 2400, repeat: -1, ease: 'Linear' });
        this.tweens.add({ targets: c, scaleX: 1.5, scaleY: 1.5, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.crystalEventSprite = c;
    }

    _moveCrystalEvent(dt) {
        if (!this.crystalActive || !this.crystalEventSprite) return;
        const c = this.crystalEventSprite;
        if (!c.active) { this.crystalActive = false; this.crystalEventSprite = null; return; }
        c.y += c.getData('vy') * dt;
        if (c.y > H + 70) {
            c.destroy();
            this.crystalActive = false;
            this.crystalEventSprite = null;
        }
    }

    _shatterCrystal(x, y) {
        if (this.sfx) this.sfx.crystalShatter();
        RAINBOW_COLORS.forEach((col, i) => {
            this.time.delayedCall(i * 38, () => {
                const fx = this.add.sprite(
                    x + Phaser.Math.Between(-22, 22),
                    y + Phaser.Math.Between(-22, 22),
                    'xA1'
                ).play('xA').setDepth(8).setTint(col).setScale(1.3);
                fx.on('animationcomplete', () => fx.destroy());
            });
        });

        const roll = Math.random() * 100;
        let rewardTxt = '';
        if (roll < 25) {
            this.lives = Math.min(5, this.lives + 2);
            rewardTxt  = this.lives >= 5 ? 'HP  CAP!' : '+2  HP';
        } else if (roll < 50) {
            const now2 = this.time.now;
            this.spreadTimer = Math.max(this.spreadTimer, now2) + 8000;
            this.twinTimer   = Math.max(this.twinTimer,   now2) + 8000;
            this.rapidTimer  = Math.max(this.rapidTimer,  now2) + 8000;
            rewardTxt = 'ALL  WEAPONS!';
        } else if (roll < 70) {
            this.shieldCount = Math.min(2, this.shieldCount + 2);
            rewardTxt = this.shieldCount >= 2 ? 'SHIELD  CAP!' : '+2  SHIELDS';
        } else if (roll < 85) {
            this.crystalNextWaveMult = 2;
            rewardTxt = 'SCORE  ×2  NEXT  WAVE!';
        } else {
            this.lives      = 5;
            this.invincible = true;
            rewardTxt       = 'FULL  RESTORE!';
            this.cameras.main.flash(200, 255, 255, 255, true);
            this.time.delayedCall(2000, () => { this.invincible = false; });
        }
        if (rewardTxt) this._showCapPopup(rewardTxt);
        if (this.sfx) this.sfx.crystalPickup();
    }

    _spawnPrism(time) {
        const x = Phaser.Math.Between(48, W - 48);
        const e = this.add.sprite(x, -44, 'prism-enemy-0').play('prism-enemy-anim').setDepth(3).setScale(1.1);
        e.setData({ type: 'prism', hp: 2, vy: 55 * this.enemySpeedMult, startX: x, startTime: time, phase: 'down' });
        this.enemies.add(e);
        this.waveAlive++;
    }

    _spawnPrismShards(x, y) {
        if (this.sfx) this.sfx.prismSplit();
        const colors = [0xff3333, 0x33ff33, 0x3366ff, 0xffaa00, 0xcc44ff];
        [-38, 0, 38, -155, 155].forEach((deg, i) => {
            const rad = Phaser.Math.DegToRad(deg);
            const s = this.add.graphics().setDepth(4);
            s.fillStyle(colors[i], 1.0);
            s.fillTriangle(-6, -10, 6, -10, 0, 10);
            s.setPosition(x, y).setAngle(deg + 180);
            s.setData({
                vx: Math.sin(rad) * 320,
                vy: Math.cos(rad) * 320,
                born: this.time.now
            });
            this.prismShards.add(s);
        });
    }

    _movePrismShards(dt) {
        const now = this.time.now;
        for (const s of [...this.prismShards.getChildren()]) {
            if (!s.active) continue;
            s.x += s.getData('vx') * dt;
            s.y += s.getData('vy') * dt;
            if (now - s.getData('born') > 3000 || s.y > H + 30 || s.x < -30 || s.x > W + 30) {
                s.destroy();
            }
        }
    }

    // ── Hi score ──────────────────────────────────────────────────────────────

    _getHiScore(key = 'space-shooter-hiscore') {
        return parseInt(localStorage.getItem(key) || '0', 10);
    }

    // ── Player death explosion ────────────────────────────────────────────────

    _playerDeathSequence() {
        if (this.gameMusic)          this.gameMusic.fadeOut(0.4);
        if (this.bossMusic)          this.bossMusic.fadeOut(0.4);
        if (this.stage3Music)        this.stage3Music.fadeOut(0.4);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.4);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.4);
        if (this.sfx && this.sound && this.sound.context) this.sfx.stopVoidDrone(this.sound.context);
        const px = this.player.x, py = this.player.y;
        this.player.setAlpha(0.9);
        this.cameras.main.flash(140, 255, 255, 255);
        if (this.sfx) this.sfx.playerHit();

        this.time.delayedCall(130, () => {
            this.player.setAlpha(0);
            if (this.sfx) this.sfx.gameOver();
            for (let i = 0; i < 6; i++) {
                this.time.delayedCall(i * 150, () => {
                    if (i > 0 && this.sfx) this.sfx.bossExplosion();
                    const d = this.add.sprite(
                        px + Phaser.Math.Between(-32, 32),
                        py + Phaser.Math.Between(-24, 24),
                        'xD1'
                    ).play('xD').setDepth(16).setScale(Phaser.Math.FloatBetween(0.7, 1.5));
                    d.on('animationcomplete', () => d.destroy());
                });
            }
            this.time.delayedCall(950, () => {
                if (this.goMusic) this.goMusic.play();
                const diff   = this.difficulty || 'normal';
                const hsKey  = this.endlessMode ? 'space-shooter-endless-hiscore' : `space-shooter-hiscore-${diff}`;
                const prev   = this._getHiScore(hsKey);
                const newHi  = this.score > prev;
                if (newHi) {
                    localStorage.setItem(hsKey, this.score);
                    if (this.sfx) this.sfx.newHighScore();
                }
                const best = Math.max(this.score, prev);
                const label = this.endlessMode ? 'ENDLESS  SCORE' : this.prismMode ? 'PRISM  DEFEATED' : 'GAME  OVER';
                let msg = `${label}\n\nScore  ${String(this.score).padStart(6,'0')}\nBest   ${String(best).padStart(6,'0')}`;
                if (this.endlessMode) {
                    const bw = this.endlessBestWave;
                    const prevBw = parseInt(localStorage.getItem('space-shooter-endless-best-wave') || '0');
                    msg += `\n\nBest Wave  ${bw}`;
                    if (bw > prevBw) msg += '  ★';
                }
                if (newHi) msg += '\n\n★  NEW  HI-SCORE  ★';
                const st = this._buildStats();
                msg += `\n\nKills ${st.kills}  Acc ${st.accuracy}%  ×${st.combo}  ${st.time}`;
                msg += '\n\nR — Restart     M — Menu';
                this.gameOverTxt.setFontSize('16px').setText(msg);
            });
        });
    }

    // ── Endless mode ──────────────────────────────────────────────────────────

    _startEndless() {
        // Start with Tier A — Stage 1 blue space atmosphere
        this.bgDeep.clearTint().setAlpha(1);
        this.bgStars.clearTint().setAlpha(0.75);
        this.stageBack.setAlpha(0);
        this.endlessTierTxt.setVisible(true);
        this.endlessBestTxt.setVisible(true);
        this._updateEndlessHUD();

        this.announceTxt.setText('ENDLESS  MODE').setAlpha(0).setStyle({ fill: '#ffaa00', fontSize: '38px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 380,
            onComplete: () => {
                this.time.delayedCall(1800, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 350,
                        onComplete: () => this._startWave(WAVES.length + 1)
                    });
                });
            }
        });
        if (this.sfx) this.sfx.endlessLoop();
    }

    _generateEndlessWave(n) {
        const rel        = n - WAVES.length;                        // 1-based within endless
        const lap        = Math.floor((rel - 1) / 21);             // 0-indexed lap (21 waves = A+B+C)
        const posInLap   = ((rel - 1) % 21) + 1;                   // 1–21 within this lap
        const tierIdx    = Math.floor((posInLap - 1) / 7);         // 0=A 1=B 2=C
        const waveInTier = ((posInLap - 1) % 7) + 1;               // 1–7 within tier

        this.endlessTier       = ['A','B','C'][tierIdx];
        this.endlessDifficulty = lap;
        this.endlessWaveInTier = waveInTier;

        const d = lap;
        // From lap 3+ intervals break below 160ms for real chaos ceiling
        const extraCrunch = d >= 3 ? Math.min((d - 2) * 20, 80) : 0;
        if (this.endlessTier === 'A') {
            return {
                eyes:    Math.min(3 + d * 2, 9),
                bipeds:  Math.min(2 + d * 2, 8),
                drones:  Math.min(2 + d,     6),
                scarabs: d >= 2 ? Math.min(d - 1, 3) : 0,
                shields: d >= 3 ? 1 : 0,
                swarms: 0, prisms: 0,
                interval: Math.max(550 - d * 30 - extraCrunch, 120)
            };
        } else if (this.endlessTier === 'B') {
            return {
                eyes: 0,
                bipeds:  Math.min(3 + d * 2, 10),
                drones:  Math.min(3 + d,      8),
                shields: Math.min(1 + d,      4),
                swarms: d >= 2 ? Math.min(d, 4) : 0,
                hornets: d >= 2 ? Math.min(d - 1, 3) : 0,
                prisms:  Math.min(d,          3),
                mimics:  d >= 1 ? Math.min(d, 2) : 0,
                interval: Math.max(500 - d * 30 - extraCrunch, 110)
            };
        } else {
            return {
                eyes: 0, bipeds: 0,
                drones:  Math.min(3 + d,     8),
                shields: Math.min(1 + d,     4),
                swarms:  Math.min(2 + d,     6),
                prisms:  Math.min(1 + d,     4),
                mimics:  Math.min(1 + d,     3),
                worms:   d >= 1 ? Math.min(d, 3) : 0,
                hornets: d >= 1 ? Math.min(d + 1, 4) : 0,
                scarabs: d >= 2 ? Math.min(d - 1, 3) : 0,
                interval: Math.max(450 - d * 30 - extraCrunch, 95)
            };
        }
    }

    _showEndlessBoss(tier, lap) {
        this.endlessBossCount++;
        const hpScale = 1 + lap * 0.2;
        if (tier === 'A') {
            if (lap < 2) {
                // Laps 0-1: Mech boss
                this.bossHp = Math.round((30 + lap * 10) * this.bossHpMult * hpScale);
                this.bossMaxHp = this.bossHp;
                this.bossDefeated  = false;
                this.isStage2Boss  = false;
                this._showBossWarning();
            } else {
                // Lap 2+: Stage 2 Final Boss
                this.bossHp = Math.round(35 * this.bossHpMult * hpScale);
                this.bossMaxHp = this.bossHp;
                this.bossDefeated  = false;
                this.isStage2Boss  = true;
                this._showBossWarning();
            }
        } else if (tier === 'B') {
            if (lap < 1) {
                // Lap 0: Gunship mid-boss
                this.midBossHp       = Math.round(20 * this.bossHpMult * hpScale);
                this.midBossMaxHp    = this.midBossHp;
                this.midBossDefeated = false;
                this._showMidBossWarning();
            } else {
                // Lap 1+: Void Wraith
                this.voidCruiserHp      = Math.round(35 * this.bossHpMult * hpScale);
                this.voidCruiserMaxHp   = this.voidCruiserHp;
                this.voidCruiserActive  = false;
                this._showVoidCruiserWarning();
            }
        } else {
            if (lap < 1) {
                // Lap 0: Stage 2 Final Boss
                this.bossHp = Math.round(35 * this.bossHpMult * hpScale);
                this.bossMaxHp = this.bossHp;
                this.bossDefeated  = false;
                this.isStage2Boss  = true;
                this._showBossWarning();
            } else if (lap < 3) {
                // Lap 1-2: The Leviathan
                this.leviathanDefeated = false;
                this._showLeviathanWarning();
            } else {
                // Lap 3+: Prism Overlord
                this._showPrismOverlordWarning();
            }
        }
    }

    // ── Endless M11 helpers ───────────────────────────────────────────────────

    _updateEndlessHUD() {
        if (!this.endlessMode) return;
        const eWave = this.waveNum - WAVES.length;
        const lapLabel = this.endlessDifficulty > 0 ? `  LAP ${this.endlessDifficulty + 1}` : '';
        this.waveTxt.setText(`ENDLESS  ${eWave}`);
        this.endlessTierTxt.setText(`TIER ${this.endlessTier}${lapLabel}`);
        const best = parseInt(localStorage.getItem('space-shooter-endless-best-wave') || '0');
        this.endlessBestTxt.setText(`BEST ${best}`);
    }

    _endlessTierTransition() {
        // Advance tier or lap after boss death
        const nextRel    = (this.waveNum - WAVES.length) + 1;
        const nextLap    = Math.floor((nextRel - 1) / 21);
        const posInLap   = ((nextRel - 1) % 21) + 1;
        const tierIdx    = Math.floor((posInLap - 1) / 7);
        const nextTier   = ['A','B','C'][tierIdx];

        // Clear active projectiles
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.midBossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.homingFireballs.getChildren()].forEach(p => p.destroy());
        [...this.ionOrbs.getChildren()].forEach(o => o.destroy());

        // Atmosphere + music change
        if (nextTier === 'A') {
            this.bgDeep.clearTint();
            this.bgStars.clearTint();
            this.tweens.add({ targets: this.bgDeep,   alpha: 1,    duration: 1400 });
            this.tweens.add({ targets: this.bgStars,  alpha: 0.75, duration: 1400 });
            this.tweens.add({ targets: this.stageBack, alpha: 0,   duration: 1400 });
            if (this.stage3Music) this.stage3Music.fadeOut(1.0);
            this.time.delayedCall(900, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });
            this.isStage3Started = false;
        } else if (nextTier === 'B') {
            this.bgDeep.setTint(0xcc2200);
            this.bgStars.setTint(0x9922ff);
            this.tweens.add({ targets: this.bgDeep,   alpha: 1,    duration: 1400 });
            this.tweens.add({ targets: this.bgStars,  alpha: 0.6,  duration: 1400 });
            this.tweens.add({ targets: this.stageBack, alpha: 0.22, duration: 1400 });
            if (this.stage3Music) this.stage3Music.fadeOut(1.0);
            this.time.delayedCall(900, () => { if (this.gameMusic) this.gameMusic.fadeIn(); });
            this.isStage3Started = false;
        } else {
            this.bgDeep.setTint(0x000a1a);
            this.bgStars.setTint(0x001833);
            this.tweens.add({ targets: this.bgDeep,   alpha: 1,    duration: 1600 });
            this.tweens.add({ targets: this.bgStars,  alpha: 0.55, duration: 1600 });
            this.tweens.add({ targets: this.stageBack, alpha: 0.06, duration: 1600 });
            if (this.gameMusic) this.gameMusic.fadeOut(1.0);
            this.time.delayedCall(900, () => { if (this.stage3Music) this.stage3Music.fadeIn(); });
            this.isStage3Started = true;
        }

        // Force black hole cluster at every tier boundary
        this._forceBlackhole(this.time.now);
        if (nextTier === 'C') {
            this.time.delayedCall(600, () => this._forceBlackhole(this.time.now));
        }

        const nextTierText = `TIER  ${nextTier}${nextLap > 0 ? `  —  LAP ${nextLap + 1}` : ''}`;
        this.announceTxt.setText(nextTierText).setAlpha(0).setStyle({ fill: '#ffaa00', fontSize: '28px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 320,
            onComplete: () => {
                this.time.delayedCall(1600, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 280,
                        onComplete: () => this._startWave(this.waveNum + 1)
                    });
                });
            }
        });
    }

    _showEndlessMilestone(onComplete) {
        const baseRewards = ['shield', 'weapon', 'score2x', 'crystal'];
        const pool = Math.random() < 0.20 ? [...baseRewards, 'surge'] : baseRewards;
        const reward  = pool[Math.floor(Math.random() * pool.length)];
        const labels  = { shield: 'PLASMA  SHIELD', weapon: 'WEAPON  COMBO', score2x: 'SCORE  ×2', crystal: 'CRYSTAL  EVENT', surge: 'CHROMATIC  SURGE' };

        this.announceTxt.setText(`MILESTONE!\n${labels[reward]}`).setAlpha(0)
            .setStyle({ fill: '#ffdd44', fontSize: '22px' });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 280,
            onComplete: () => {
                // Apply reward
                if (reward === 'shield') {
                    this.shieldCount = Math.min(this.shieldCount + 1, 2);
                } else if (reward === 'weapon') {
                    const now = this.time.now;
                    this.spreadTimer = Math.max(this.spreadTimer, now) + 5000;
                    this.twinTimer   = Math.max(this.twinTimer,   now) + 5000;
                    this.rapidTimer  = Math.max(this.rapidTimer,  now) + 5000;
                } else if (reward === 'score2x') {
                    this.crystalNextWaveMult = 2;
                } else if (reward === 'surge') {
                    // Chromatic Surge — destroy all enemy bolts + rainbow flash vignette
                    [...this.enemyBolts.getChildren()].forEach(p => { this._spawnHitFX(p.x, p.y, false); p.destroy(); });
                    this.cameras.main.flash(400, 200, 0, 255);
                    if (!this.rainbowMode) this._activateRainbowMode();
                } else {
                    this.time.delayedCall(800, () => this._triggerCrystalEvent());
                }
                this.time.delayedCall(2000, () => {
                    this.tweens.add({
                        targets: this.announceTxt, alpha: 0, duration: 300,
                        onComplete: () => { if (onComplete) onComplete(); }
                    });
                });
            }
        });
    }

    _spawnEndlessDrop(x, y) {
        const r = Math.random();
        const type = r < 0.4 ? 'overcharge' : r < 0.7 ? 'ghost' : 'nova';
        const g = this.add.graphics().setDepth(4);
        if (type === 'overcharge') {
            // Gold star — 4 diamond lozenges crossing at center
            g.fillStyle(0xffdd00, 0.9);
            g.fillRect(-10, -3, 20, 6);
            g.fillRect(-3, -10, 6, 20);
            g.fillStyle(0xffff88, 1.0); g.fillCircle(0, 0, 4);
        } else if (type === 'ghost') {
            g.fillStyle(0xcceeff, 0.55); g.fillCircle(0, 0, 9);
            g.fillStyle(0xffffff, 0.9);  g.fillCircle(0, 0, 5);
        } else {
            g.fillStyle(0xff2200, 0.85); g.fillCircle(0, 0, 10);
            g.fillStyle(0xff8800, 0.7);  g.fillCircle(0, 0, 6);
            g.fillStyle(0xffee00, 0.9);  g.fillCircle(0, 0, 3);
        }
        g.x = x; g.y = y;
        g.setData({ type, vy: 48 });
        this.tweens.add({ targets: g, angle: 360, duration: 1200, repeat: -1, ease: 'Linear' });
        this.endlessDrops.add(g);
    }

    _updateEndlessDrops(time, dt) {
        const sx = this.player.x, sy = this.player.y;
        for (const d of [...this.endlessDrops.getChildren()]) {
            if (!d.active) continue;
            d.y += d.getData('vy') * dt;
            if (d.y > H + 30) { d.destroy(); continue; }
            if (Phaser.Math.Distance.Between(d.x, d.y, sx, sy) < 20) {
                this._collectEndlessDrop(d);
                d.destroy();
            }
        }
        // Expire ghost / overcharge
        if (this.ghostActive && time >= this.ghostEnd) {
            this.ghostActive = false;
            this.player.setAlpha(1);
        }
        if (this.overchargeActive && time >= this.overchargeEnd) {
            this.overchargeActive = false;
        }
    }

    _collectEndlessDrop(d) {
        const type = d.getData('type');
        if (this.sfx) this.sfx.crystalPickup();
        if (type === 'overcharge') {
            this.overchargeActive = true;
            this.overchargeEnd    = this.time.now + 6000;
            const now = this.time.now;
            this.spreadTimer = Math.max(this.spreadTimer, now) + 6000;
            this.twinTimer   = Math.max(this.twinTimer,   now) + 6000;
            this.rapidTimer  = Math.max(this.rapidTimer,  now) + 6000;
            this.announceTxt.setText('OVERCHARGE!').setAlpha(0).setStyle({ fill: '#ffdd00', fontSize: '26px' });
            this.tweens.add({ targets: this.announceTxt, alpha: 1, duration: 180,
                onComplete: () => this.time.delayedCall(900, () =>
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 250 })) });
        } else if (type === 'ghost') {
            this.ghostActive = true;
            this.ghostEnd    = this.time.now + 6000;
            this.player.setAlpha(0.35);
            this.announceTxt.setText('GHOST!').setAlpha(0).setStyle({ fill: '#88ccff', fontSize: '26px' });
            this.tweens.add({ targets: this.announceTxt, alpha: 1, duration: 180,
                onComplete: () => this.time.delayedCall(700, () =>
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 250 })) });
        } else {
            // Nova — destroy all enemies on screen
            let novaKills = 0;
            [...this.enemies.getChildren()].forEach(e => {
                if (!e.active) return;
                const pts = e.getData('type') === 'biped' ? 300 : 100;
                this._registerKill(pts + 50);
                this._spawnDeathFX(e.x, e.y, 'xA');
                e.destroy();
                novaKills++;
                this.waveAlive = Math.max(0, this.waveAlive - 1);
            });
            this.cameras.main.flash(220, 255, 120, 0);
            this.cameras.main.shake(400, 0.012);
            this.announceTxt.setText('NOVA!').setAlpha(0).setStyle({ fill: '#ff6600', fontSize: '32px' });
            this.tweens.add({ targets: this.announceTxt, alpha: 1, duration: 150,
                onComplete: () => this.time.delayedCall(700, () =>
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 250 })) });
        }
    }

    // ── The Leviathan (Space Demon) ───────────────────────────────────────────

    _showLeviathanWarning() {
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());

        this.announceTxt.setText('⚠  FINAL  BOSS  ⚠\nTHE  LEVIATHAN').setAlpha(0)
            .setStyle({ fill: '#aa00ff', fontSize: '26px' });
        if (this.gameMusic)          this.gameMusic.fadeOut(1.0);
        if (this.stage3Music)        this.stage3Music.fadeOut(1.5);
        if (this.ionStormMusic)      this.ionStormMusic.fadeOut(0.5);
        if (this.gravityStormMusic)  this.gravityStormMusic.fadeOut(0.5);
        this.time.delayedCall(1500, () => { if (this.bossMusic) this.bossMusic.start(); });
        if (this.sfx) this.sfx.leviathanWarning();

        let flashes = 0;
        const flash = () => {
            this.tweens.add({
                targets: this.announceTxt, alpha: 1, duration: 240, yoyo: true,
                onComplete: () => {
                    flashes++;
                    if (flashes < 6) this.time.delayedCall(100, flash);
                    else { this.announceTxt.setAlpha(0); this._beginLeviathan(); }
                }
            });
        };
        flash();
    }

    _beginLeviathan() {
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());

        this.leviathanSprite  = this.add.sprite(W / 2, -160, 'levHover0').play('lev-hover-anim')
            .setDepth(5).setScale(2.0);
        this.leviathanActive   = true;
        this.leviathanEntering = true;
        this.leviathanHp       = Math.round(90 * this.bossHpMult);
        this.leviathanMaxHp    = this.leviathanHp;
        this.leviathanPhase    = 1;
        this.leviathanVx       = 55;
        this.leviathanT        = 0;
        this.leviathanSpiralAngle = 0;
        this.leviathanNextSpiral  = this.time.now + 999999;
        this.leviathanNextHoming  = this.time.now + 999999;
        this.leviathanNextPulse   = this.time.now + 999999;
        this.levNextShield        = this.time.now + 999999;
        this.levShieldActive      = false;
        this.levShieldGfx         = null;
        this.voidPulseActive      = false;

        this.waveTxt.setText('');
        this.bossBarBg.setVisible(true);
        this.bossBarFg.setFillStyle(0xaa00ff).setVisible(true);
        this.bossBarLabel.setText('THE  LEVIATHAN').setVisible(true);
    }

    _updateLeviathan(time, dt) {
        if (!this.leviathanActive || !this.leviathanSprite) return;
        const boss = this.leviathanSprite;

        if (this.leviathanEntering) {
            boss.y += 85 * dt;
            if (boss.y >= 145) {
                boss.y = 145;
                this.leviathanEntering = false;
                this.leviathanNextSpiral = time + 2800;
            }
            return;
        }

        // Horizontal bounce + subtle vertical drift
        this.leviathanT += dt;
        boss.x += this.leviathanVx * dt;
        if (boss.x > W - 90) { boss.x = W - 90; this.leviathanVx = -Math.abs(this.leviathanVx); }
        if (boss.x < 90)     { boss.x = 90;      this.leviathanVx =  Math.abs(this.leviathanVx); }
        boss.y = 145 + Math.sin(this.leviathanT * 0.6) * 18;

        // Phase thresholds
        const maxHp = this.leviathanMaxHp;
        const newPhase = this.leviathanHp > maxHp * 0.667 ? 1
                       : this.leviathanHp > maxHp * 0.333 ? 2 : 3;
        if (newPhase !== this.leviathanPhase) this._leviathanPhaseTransition(newPhase, time);

        // Attacks
        if (time >= this.leviathanNextSpiral) {
            this.leviathanNextSpiral = time + (this.leviathanPhase === 3 ? 2200 : 2800);
            this._levSpiralVolley(boss.x, boss.y);
        }
        if (this.leviathanPhase >= 3 && time >= this.leviathanNextHoming) {
            this.leviathanNextHoming = time + 3000;
            this._fireHomingFireball(boss.x, boss.y);
        }
        if (this.leviathanPhase >= 3 && time >= this.leviathanNextPulse) {
            this.leviathanNextPulse = time + 5000;
            this._levVoidPulse(boss.x, boss.y, time);
        }
        if (this.leviathanPhase >= 2 && time >= this.levNextShield && !this.levShieldActive) {
            this._levActivateDeflectShield(boss.x, boss.y, time);
        }

        // Update shield visual
        if (this.levShieldActive) {
            if (time >= this.levShieldEnd) {
                this.levShieldActive = false;
                if (this.levShieldGfx) { this.levShieldGfx.destroy(); this.levShieldGfx = null; }
            } else {
                const timeLeft = (this.levShieldEnd - time) / 3500;
                const shieldAlpha = Math.min(0.55, timeLeft * 1.5, (1 - timeLeft) * 4 + 0.1);
                const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
                if (!this.levShieldGfx || !this.levShieldGfx.active) {
                    this.levShieldGfx = this.add.graphics().setDepth(8);
                }
                const g = this.levShieldGfx;
                g.clear();
                const cx = boss.x, cy = boss.y;
                // Single thin pulsing ring
                g.lineStyle(2, 0x6600cc, shieldAlpha * (0.5 + pulse * 0.5));
                g.strokeCircle(cx, cy, 68 + pulse * 4);
                // Very faint inner fill
                g.fillStyle(0x220044, shieldAlpha * 0.08);
                g.fillCircle(cx, cy, 68);
            }
        }

        // HP bar
        const pct = Math.max(0, this.leviathanHp / maxHp);
        this.bossBarFg.width = 300 * pct;
        this.bossBarFg.setFillStyle(pct > 0.66 ? 0xaa00ff : pct > 0.33 ? 0xff00aa : 0xff2200);
    }

    _leviathanPhaseTransition(newPhase, time) {
        this.leviathanPhase = newPhase;
        const bx = this.leviathanSprite ? this.leviathanSprite.x : W/2;
        const by = this.leviathanSprite ? this.leviathanSprite.y : 145;

        // Phase animation on boss sprite
        if (this.leviathanSprite && this.leviathanSprite.active) {
            this.leviathanSprite.play('lev-phase-anim');
            this.leviathanSprite.once('animationcomplete', () => {
                if (this.leviathanSprite && this.leviathanSprite.active)
                    this.leviathanSprite.play(newPhase >= 3 ? 'lev-rage-anim' : 'lev-hover-anim');
            });
        }

        if (newPhase === 2) {
            this.leviathanVx = this.leviathanVx > 0 ? 90 : -90;
            this.levNextShield = time + 6000;
            this.time.delayedCall(400, () => {
                this.cameras.main.flash(400, 68, 0, 136);
                if (this.screenShake) this.cameras.main.shake(800, 0.018);
                if (this.sfx) this.sfx.bossWarning();
            });
            this._spawnPhantomDrones(bx, by, time);
            const txt = this.add.text(W/2, H/2-20, 'PHASE  2', {
                fontFamily: 'monospace', fontSize: '28px', fill: '#9900ff', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(20).setAlpha(0);
            this.tweens.add({ targets: txt, alpha: 1, duration: 200, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
        } else {
            this.leviathanVx = this.leviathanVx > 0 ? 130 : -130;
            this.leviathanNextPulse  = time + 1500;
            this.leviathanNextHoming = time + 2000;
            this.levNextShield       = time + 4000;
            this.time.delayedCall(400, () => {
                this.cameras.main.flash(500, 255, 0, 102);
                if (this.screenShake) this.cameras.main.shake(1400, 0.030);
                if (this.sfx) this.sfx.leviathanWarning();
            });
            const txt = this.add.text(W/2, H/2-20, 'FINAL  PHASE', {
                fontFamily: 'monospace', fontSize: '28px', fill: '#ff0066', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(20).setAlpha(0);
            this.tweens.add({ targets: txt, alpha: 1, duration: 200, yoyo: true, repeat: 2, onComplete: () => txt.destroy() });
        }
    }

    _levSpiralVolley(bx, by) {
        if (this.sfx) this.sfx.bossFire();

        // Attack animation on boss sprite
        if (this.leviathanSprite && this.leviathanSprite.active) {
            this.leviathanSprite.play('lev-atk-anim');
            this.leviathanSprite.once('animationcomplete', () => {
                if (this.leviathanSprite && this.leviathanSprite.active)
                    this.leviathanSprite.play(this.leviathanPhase >= 3 ? 'lev-rage-anim' : 'lev-hover-anim');
            });
        }
        // Muzzle burst overlay
        const burst = this.add.sprite(bx, by, 'levBurst0').play('lev-burst-anim')
            .setDepth(6).setScale(2.2).setAlpha(0.9);
        burst.on('animationcomplete', () => burst.destroy());
        const count = 10;
        for (let i = 0; i < count; i++) {
            const deg = this.leviathanSpiralAngle + (i / count) * 360;
            const rad = Phaser.Math.DegToRad(deg);
            const speed = 185;
            // Use spiral bolt sprite if loaded, else fallback to boss bolt
            const key = this.textures.exists('sb0') ? 'sb0' : 'tdbl1';
            const anim = this.textures.exists('sb0') ? 'spiral-bolt-anim' : 'td-bolt';
            const p = this.add.sprite(bx, by + 10, key).play(anim).setDepth(4).setScale(1.1);
            p.setData({ vx: Math.sin(rad) * speed, vy: Math.cos(rad) * speed });
            this.bossFireballs.add(p);
        }
        this.leviathanSpiralAngle = (this.leviathanSpiralAngle + 36) % 360;
    }

    _spawnPhantomDrones(bx, by, time) {
        if (this.sfx) this.sfx.phantomSpawn();
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const d = this.add.sprite(
                bx + Math.cos(angle) * 80, by + Math.sin(angle) * 80, 'e02-1'
            ).play('drone-fly').setDepth(5).setScale(0.65).setTint(0x9900ff);
            d.setData({ angle, nextFire: (time || this.time.now) + 1200 + i * 600, hp: 1 });
            this.phantomDrones.add(d);
        }
    }

    _updatePhantomDrones(time, dt) {
        if (!this.leviathanActive || !this.leviathanSprite || this.leviathanPhase < 2) return;
        const bx = this.leviathanSprite.x, by = this.leviathanSprite.y;
        for (const d of [...this.phantomDrones.getChildren()]) {
            if (!d.active) continue;
            const ang = d.getData('angle') + 1.2 * dt;
            d.setData('angle', ang);
            d.x = bx + Math.cos(ang) * 80;
            d.y = by + Math.sin(ang) * 80;

            if (time >= d.getData('nextFire')) {
                d.setData('nextFire', time + 2600);
                const p = this.add.sprite(d.x, d.y, 'tdbl1').play('td-bolt')
                    .setDepth(4).setScale(0.8).setTint(0xaa00ff);
                p.setData({ vx: Math.cos(ang) * 170, vy: Math.sin(ang) * 170 });
                this.bossFireballs.add(p);
                if (this.sfx) this.sfx.bossFire();
            }
        }
    }

    _levActivateDeflectShield(bx, by, time) {
        const dur = this.leviathanPhase >= 3 ? 4000 : 3000;
        this.levShieldActive = true;
        this.levShieldEnd    = time + dur;
        this.levNextShield   = time + dur + (this.leviathanPhase >= 3 ? 9000 : 13000);
        this.levShieldAngle  = 0;
        if (this.sfx) this.sfx.shieldDeflect();
        this.cameras.main.flash(180, 68, 0, 136);
        if (this.screenShake) this.cameras.main.shake(300, 0.010);

        // Warning text
        const warn = this.add.text(W / 2, H / 2 - 40, 'DARK SHIELD', {
            fontFamily: 'monospace', fontSize: '22px', fill: '#cc44ff',
            stroke: '#220033', strokeThickness: 5
        }).setOrigin(0.5).setDepth(20).setAlpha(0);
        this.tweens.add({
            targets: warn, alpha: 1, duration: 180, yoyo: true, repeat: 2,
            onComplete: () => warn.destroy()
        });

        // Spawn impact sparks outward from boss
        for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            const spk = this.add.graphics().setDepth(9);
            spk.fillStyle(0x9900ff, 0.9);
            spk.fillCircle(0, 0, 3);
            spk.x = bx + Math.cos(ang) * 40;
            spk.y = by + Math.sin(ang) * 40;
            this.tweens.add({
                targets: spk,
                x: bx + Math.cos(ang) * 100,
                y: by + Math.sin(ang) * 100,
                alpha: 0, duration: 350, ease: 'Power2',
                onComplete: () => spk.destroy()
            });
        }
    }

    _levVoidPulse(bx, by, time) {
        this.voidPulseActive = true;
        this.voidPulseEnd    = time + 1500;
        this.voidPulseId++;
        if (this.sfx) this.sfx.voidPulse();
        this.cameras.main.flash(200, 68, 0, 136);

        // Scatter all bolts within range immediately
        for (const b of [...this.bolts.getChildren()]) {
            if (!b.active) continue;
            if (Phaser.Math.Distance.Between(b.x, b.y, bx, by) < 160) {
                b.setData('vx', -b.getData('vx'));
                b.setData('vy', -b.getData('vy'));
                b.setData('pulsed', this.voidPulseId);
            }
        }

        // Three staggered expanding rings — capped radius so they stay on canvas
        const rings = [
            { delay: 0,   color: 0x9900ff, maxR: 130, lw: 4 },
            { delay: 180, color: 0xcc44ff, maxR: 100, lw: 3 },
            { delay: 360, color: 0x550088, maxR:  70, lw: 3 },
        ];
        rings.forEach(({ delay, color, maxR, lw }) => {
            this.time.delayedCall(delay, () => {
                const g = this.add.graphics().setDepth(9);
                let r = 8;
                const steps = 28;
                const step  = (maxR - 8) / steps;
                const ev = this.time.addEvent({
                    delay: 28, repeat: steps - 1,
                    callback: () => {
                        if (!g.active) return;
                        r = Math.min(r + step, maxR);
                        const alpha = Phaser.Math.Clamp(1.1 - r / maxR, 0, 1);
                        g.clear();
                        g.lineStyle(lw, color, alpha);
                        g.strokeCircle(bx, by, r);
                        g.lineStyle(1, 0xffffff, alpha * 0.35);
                        g.strokeCircle(bx, by, r);
                    }
                });
                this.tweens.add({
                    targets: g, alpha: 0, duration: 700, delay: 80, ease: 'Power2',
                    onComplete: () => { ev.remove(); if (g.active) g.destroy(); }
                });
            });
        });

        // Central glow sprite overlay
        if (this.textures.exists('vp0')) {
            const vpfx = this.add.sprite(bx, by, 'vp0').play('void-pulse-anim')
                .setDepth(10).setScale(0.9).setAlpha(0.85).setTint(0xaa22ff);
            this.tweens.add({
                targets: vpfx, scale: 3.0, alpha: 0, duration: 800, ease: 'Power2',
                onComplete: () => { if (vpfx.active) vpfx.destroy(); }
            });
        }
    }

    _applyVoidPulse(time) {
        if (!this.voidPulseActive) return;
        if (time >= this.voidPulseEnd) { this.voidPulseActive = false; return; }
        if (!this.leviathanSprite || !this.leviathanSprite.active) return;
        const bx = this.leviathanSprite.x, by = this.leviathanSprite.y;
        for (const b of [...this.bolts.getChildren()]) {
            if (!b.active) continue;
            if (b.getData('pulsed') === this.voidPulseId) continue;
            if (Phaser.Math.Distance.Between(b.x, b.y, bx, by) < 160) {
                b.setData('vx', -b.getData('vx'));
                b.setData('vy', -b.getData('vy'));
                b.setData('pulsed', this.voidPulseId);
            }
        }
    }

    _leviathanDeath() {
        this.leviathanActive   = false;
        this.leviathanDefeated = true;
        this.levShieldActive   = false;
        if (this.levShieldGfx) { this.levShieldGfx.destroy(); this.levShieldGfx = null; }
        if (this.sfx) this.sfx.leviathanDeath();
        if (this.bossMusic) this.bossMusic.fadeOut(2.5);

        const bx = this.leviathanSprite.x, by = this.leviathanSprite.y;
        this.leviathanSprite.destroy(); this.leviathanSprite = null;
        [...this.phantomDrones.getChildren()].forEach(d => { this._spawnDeathFX(d.x, d.y, 'xA'); d.destroy(); });
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());

        this.bossBarBg.setVisible(false); this.bossBarFg.setVisible(false); this.bossBarLabel.setVisible(false);
        this.cameras.main.shake(2500, 0.030);
        this._registerKill(6000);

        let count = 0;
        const doExplosion = () => {
            if (count >= 12) {
                if (this.endlessMode) {
                    this._registerKill(10000);
                    this.time.delayedCall(800, () => this._endlessTierTransition());
                } else {
                    this.prismMode = true;
                    this.time.delayedCall(1200, () => this._startPrismDimension());
                }
                return;
            }
            if (this.sfx) this.sfx.bossExplosion();
            const key = count % 2 === 0 ? 'xD1' : 'xF1';
            const anim = count % 2 === 0 ? 'xD' : 'xF';
            const d = this.add.sprite(bx + Phaser.Math.Between(-100, 100), by + Phaser.Math.Between(-80, 80), key)
                .play(anim).setDepth(16).setScale(Phaser.Math.FloatBetween(1.4, 2.8));
            d.on('animationcomplete', () => d.destroy());
            count++;
            this.time.delayedCall(180, doExplosion);
        };
        doExplosion();
    }

    _debugSkipToLeviathan() {
        [...this.enemies.getChildren()].forEach(e => e.destroy());
        [...this.enemyBolts.getChildren()].forEach(p => p.destroy());
        [...this.bossFireballs.getChildren()].forEach(p => p.destroy());
        [...this.asteroids.getChildren()].forEach(a => a.destroy());
        [...this.blackholes.getChildren()].forEach(b => b.destroy());
        [...this.ionOrbs.getChildren()].forEach(o => o.destroy());
        [...this.phantomDrones.getChildren()].forEach(d => d.destroy());
        this.waveState          = 'done';
        this.waveAlive          = 0;
        this.score              = Math.max(this.score, 99999);
        this.lives              = Math.max(this.lives, 3);
        this._showLeviathanWarning();
    }

    // ── M12 — Prism Dimension ─────────────────────────────────────────────────

    _startPrismDimension() {
        // Set prismatic atmosphere
        this.bgDeep.setTint(0x1a0033);
        this.bgStars.setTint(0x440066);
        this.tweens.add({ targets: this.bgDeep,   alpha: 1,    duration: 1800 });
        this.tweens.add({ targets: this.bgStars,  alpha: 0.9,  duration: 1800 });
        this.tweens.add({ targets: this.stageBack, alpha: 0.4, duration: 1800 });
        this.stageBack.setTint(0x220044);

        // Announce
        this.announceTxt.setText('PRISM\nDIMENSION').setAlpha(0)
            .setStyle({ fill: '#ff88ff', fontSize: '36px', stroke: '#220044', strokeThickness: 6 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 400,
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 400,
                        onComplete: () => this._startWave(WAVES.length + 1)
                    });
                });
            }
        });

        if (!this._musicStarted) {
            this._musicStarted = true;
            this.time.delayedCall(600, () => { if (this.stage3Music) this.stage3Music.start(); });
        }
        if (this.sfx) this.sfx.prismOverlordPhase();

        // Persistent prism color cycling panel (vignette-like rainbow border)
        this.prismBgColorIdx  = 0;
        this.prismNextBgChange = this.time.now + 700;
    }

    _updatePrismBackground(time) {
        if (time < this.prismNextBgChange) return;
        this.prismNextBgChange = time + 700;
        this.prismBgColorIdx = (this.prismBgColorIdx + 1) % PRISM_BG_COLS.length;
        const col = PRISM_BG_COLS[this.prismBgColorIdx];
        this.bgDeep.setTint(col);
    }

    _spawnMimic(time) {
        const x = Phaser.Math.Between(40, W - 40);
        const g = this.add.sprite(x, -40, 'mimic2-idle').setDepth(3).setScale(1.15).play('mimic2-move');
        g.setData({
            type: 'mimic', hp: 4,
            vy: Phaser.Math.Between(45, 75) * this.enemySpeedMult,
            startX: x, startTime: time, colorIdx: 0,
            nextFire: time + Phaser.Math.Between(1200, 2200) / this.enemyFireMult
        });
        this.enemies.add(g);
        this.waveAlive++;
    }

    _drawMimicShape(g, col) {
        if (g && g.active && g.setTint) g.setTint(col);
    }

    _fireMimicSpread(mx, my, colorIdx) {
        if (this.sfx) this.sfx.mimicFire();
        const col = RAINBOW_COLORS[colorIdx];
        const _bolt = (vx, vy) => {
            const p = this.add.graphics().setDepth(4);
            p.fillStyle(col, 0.9); p.fillCircle(0, 0, 4);
            p.fillStyle(0xffffff, 0.7); p.fillCircle(0, 0, 2);
            p.x = mx; p.y = my + 10;
            p.setData({ vx, vy });
            this.enemyBolts.add(p);
        };
        const wt = this.lastWeaponType;
        if (wt === 'spread') {
            for (const deg of [-28, 0, 28]) {
                const rad = Phaser.Math.DegToRad(deg + 90);
                _bolt(Math.sin(rad) * 240, Math.cos(rad) * 240);
            }
        } else if (wt === 'twin') {
            _bolt(-7, 240); _bolt(7, 240);
        } else if (wt === 'rapid') {
            const dx = this.player.x - mx;
            const dist = Math.max(Math.abs(dx), 1);
            _bolt((dx / dist) * 80, 360);
        } else {
            const dx = this.player.x - mx;
            const dist = Math.max(Math.abs(dx), 1);
            _bolt((dx / dist) * 60, 260);
        }
    }

    _showPrismOverlordWarning() {
        this.waveState = 'done';
        this.waveTxt.setText('');
        if (this.sfx) this.sfx.prismOverlordPhase();
        this.cameras.main.flash(300, 180, 0, 255);
        this.announceTxt.setText('⚠  PRISM  OVERLORD  ⚠').setAlpha(0)
            .setStyle({ fill: '#ff44ff', fontSize: '22px', stroke: '#220044', strokeThickness: 5 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 300,
            onComplete: () => {
                this.time.delayedCall(2200, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 300,
                        onComplete: () => this._spawnPrismOverlord()
                    });
                });
            }
        });
    }

    _spawnPrismOverlord() {
        const hpScale = this.endlessMode ? (1 + this.endlessDifficulty * 0.25) : 1;
        this.prismOverlordHp      = Math.round(120 * this.bossHpMult * hpScale);
        this.prismOverlordMaxHp   = this.prismOverlordHp;
        this.prismOverlordPhase   = 1;
        this.prismOverlordT       = 0;
        this.prismOverlordActive  = true;
        this.prismOverlordEntering = true;
        this.prismOverlordDefeated = false;

        const g = this.add.sprite(W / 2, -90, 'pboss-idle').setDepth(6).setScale(2.4).play('pboss-move');
        this.prismOverlordSprite = g;

        // Show standard boss bar with Prism Overlord label
        this.bossBarBg.setVisible(true);
        this.bossBarFg.setFillStyle(0xff44ff).setVisible(true);
        this.bossBarLabel.setText('PRISM  OVERLORD').setVisible(true);

        // Enter from top
        this.tweens.add({
            targets: g, y: 100, duration: 1800, ease: 'Back.easeOut',
            onComplete: () => {
                this.prismOverlordEntering = false;
                this.prismOverlordNextFire  = this.time.now + 1000;
                this.prismOverlordNextLaser = this.time.now + 3500;
            }
        });
        if (this.bossMusic) this.bossMusic.start();
        if (this.gameMusic) this.gameMusic.fadeOut(0.8);
        if (this.stage3Music) this.stage3Music.fadeOut(0.8);
    }

    _drawPrismOverlord(g, col) {
        if (g && g.active && g.setTint) g.setTint(col);
    }

    _updatePrismOverlord(time, dt) {
        const g = this.prismOverlordSprite;
        if (!g || !g.active) return;
        if (this.prismOverlordEntering) return;

        // Drift side to side
        this.prismOverlordT += dt;
        g.x = W / 2 + Math.sin(this.prismOverlordT * 0.7) * (80 + this.prismOverlordPhase * 20);

        // Color tint cycle
        const colorIdx = Math.floor((time / 350)) % RAINBOW_COLORS.length;
        this._drawPrismOverlord(g, RAINBOW_COLORS[colorIdx]);

        // Fire — tentacle burst
        if (time >= this.prismOverlordNextFire) {
            const interval = Math.max(1200 - this.prismOverlordPhase * 200, 500);
            this.prismOverlordNextFire = time + interval / this.enemyFireMult;
            const curAnim = g.anims?.currentAnim?.key;
            if (curAnim !== 'pboss-atk-beam') {
                g.play('pboss-atk-tent', true);
                g.off('animationcomplete').once('animationcomplete', () => { if (g.active) g.play('pboss-move', true); });
            }
            this._prismOverlordFire(g.x, g.y);
        }
        // Fire — prism beam
        if (time >= this.prismOverlordNextLaser) {
            this.prismOverlordNextLaser = time + 4500 / this.enemyFireMult;
            g.play('pboss-atk-beam', true);
            g.off('animationcomplete').once('animationcomplete', () => { if (g.active) g.play('pboss-move', true); });
            this._prismOverlordLaserSweep(g.x, g.y);
        }

        // HP bar
        const pct = this.prismOverlordHp / this.prismOverlordMaxHp;
        this.bossBarFg.width = 300 * pct;
        this.bossBarFg.setFillStyle(RAINBOW_COLORS[colorIdx]);

        // Phase transitions
        if (this.prismOverlordPhase === 1 && pct <= 0.65) this._prismOverlordPhaseChange(2);
        if (this.prismOverlordPhase === 2 && pct <= 0.30) this._prismOverlordPhaseChange(3);

        // Collision with player bolts is handled in _collide — we check hit here for convenience
        // Player collision
        if (!this.invincible && !this.ghostActive &&
            Phaser.Math.Distance.Between(g.x, g.y, this.player.x, this.player.y) < 44) {
            this._damagePlayer();
        }
    }

    _prismOverlordFire(x, y) {
        // Fan of 5 bolts aimed toward player
        const dx = this.player.x - x;
        const dy = this.player.y - y;
        const baseAngle = Math.atan2(dy, dx);
        const colorIdx = Math.floor((this.time.now / 350)) % RAINBOW_COLORS.length;
        const spread = this.prismOverlordPhase >= 2 ? 5 : 3;
        for (let i = 0; i < spread; i++) {
            const off = (i - (spread - 1) / 2) * Phaser.Math.DegToRad(22);
            const angle = baseAngle + off;
            const spd = 200 + this.prismOverlordPhase * 40;
            const p = this.add.graphics().setDepth(4);
            p.fillStyle(RAINBOW_COLORS[(colorIdx + i) % RAINBOW_COLORS.length], 0.9);
            p.fillCircle(0, 0, 5);
            p.fillStyle(0xffffff, 0.8); p.fillCircle(0, 0, 2);
            p.x = x; p.y = y + 20;
            p.setData({ vy: Math.sin(angle) * spd + 30, vx: Math.cos(angle) * spd });
            this.enemyBolts.add(p);
        }
        if (this.sfx) this.sfx.mimicFire();
    }

    _prismOverlordLaserSweep(x, y) {
        if (this.prismOverlordPhase < 2) return;
        if (this.sfx) this.sfx.prismOverlordPhase();
        // Spawn a ring of 12 shards that radiate outward
        this._spawnOverlordShardBurst(x, y, 12, 180 + this.prismOverlordPhase * 40);
    }

    _prismOverlordPhaseChange(phase) {
        this.prismOverlordPhase = phase;
        if (this.sfx) this.sfx.prismOverlordPhase();
        this.cameras.main.shake(500, 0.018);
        this.cameras.main.flash(350, 200, 0, 255);
        this._spawnOverlordShardBurst(this.prismOverlordSprite.x, this.prismOverlordSprite.y, 8, 150);
        const phaseLabel = phase === 2 ? 'PHASE  II\nCHROMATIC  SURGE' : 'PHASE  III\nPRISM  FURY';
        this.announceTxt.setText(phaseLabel).setAlpha(0)
            .setStyle({ fill: '#ff44ff', fontSize: '20px', stroke: '#220044', strokeThickness: 5 });
        this.tweens.add({
            targets: this.announceTxt, alpha: 1, duration: 220,
            onComplete: () => {
                this.time.delayedCall(1400, () => {
                    this.tweens.add({ targets: this.announceTxt, alpha: 0, duration: 300 });
                });
            }
        });
    }

    _prismOverlordDeath() {
        this.prismOverlordActive   = false;
        this.prismOverlordDefeated = true;
        const g = this.prismOverlordSprite;
        this.cameras.main.shake(700, 0.022);
        this.cameras.main.flash(500, 255, 100, 255);
        if (this.sfx) this.sfx.bossExplosion();

        // Big shard burst
        this._spawnOverlordShardBurst(g.x, g.y, 20, 260);

        // Score
        const pts = 8000 + this.prismOverlordPhase * 2000;
        this._registerKill(pts);
        const lbl = this.add.text(g.x, g.y - 16, `PRISM OVERLORD\n+${pts}`, {
            fontFamily: 'monospace', fontSize: '16px', fill: '#ff88ff',
            stroke: '#220044', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5).setDepth(22);
        this.tweens.add({ targets: lbl, y: lbl.y - 70, alpha: 0, duration: 1400, onComplete: () => lbl.destroy() });

        // Dramatic implosion
        this.tweens.add({
            targets: g, scaleX: 0, scaleY: 0, alpha: 0, duration: 700, ease: 'Power3',
            onComplete: () => { g.destroy(); }
        });

        if (this.bossMusic) this.bossMusic.stop();
        this.bossBarBg.setVisible(false);
        this.bossBarFg.setVisible(false);
        this.bossBarLabel.setVisible(false);

        // End state
        if (this.prismMode) {
            // Prism Mode clear — go to Final Credits
            this.time.delayedCall(2000, () => {
                this.scene.start('FinalCreditsScene', { score: this.score, difficulty: this.difficulty, stats: this._buildStats() });
            });
        } else {
            // Endless mode — tier transition
            this.time.delayedCall(1800, () => this._endlessTierTransition());
        }
    }

    _spawnOverlordShardBurst(x, y, count, speed) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const col   = RAINBOW_COLORS[i % RAINBOW_COLORS.length];
            const s = this.add.graphics().setDepth(5);
            s.fillStyle(col, 0.9);
            s.fillTriangle(-7, 6, 0, -10, 7, 6);
            s.fillStyle(0xffffff, 0.6); s.fillCircle(0, 0, 2);
            s.x = x; s.y = y;
            s.setData({ vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born: this.time.now });
            this.prismShards.add(s);
        }
    }

    // ── M13 — Pause Menu, HTP, Settings ──────────────────────────────────────

    _openPauseMenu() {
        if (this._pauseEl) return;
        this.paused = true;
        this.time.timeScale = 0;   // freeze all delayedCall timers (ion storm, hazards, etc.)
        this.tweens.timeScale = 0; // freeze game-world tweens
        if (this.sfx) this.sfx.pauseOpen();

        const D = 20; // depth base
        const bg   = this.add.rectangle(W/2, H/2, W, H, 0x000011, 0.82).setDepth(D);
        // Scanlines overlay
        const scanlines = this.add.graphics().setDepth(D);
        for (let sy = 0; sy < H; sy += 4) {
            scanlines.lineStyle(1, 0x000000, 0.22);
            scanlines.lineBetween(0, sy, W, sy);
        }
        const title= this.add.text(W/2, H/2 - 130, 'PAUSED', {
            fontFamily: 'monospace', fontSize: '30px', fill: '#ffee00', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(D+1);

        const opts  = ['RESUME', 'HOW  TO  PLAY', 'SETTINGS', 'QUIT  TO  MENU'];
        const txts  = opts.map((lbl, i) => this.add.text(W/2, H/2 - 50 + i * 44, lbl, {
            fontFamily: 'monospace', fontSize: '17px', fill: '#cccccc', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(D+1));

        let sel = 0;
        const refresh = () => {
            txts.forEach((t, i) => {
                const on = i === sel;
                t.setStyle({ fontFamily: 'monospace', fontSize: on ? '20px' : '16px',
                    fill: on ? '#ffee00' : '#777777', stroke: '#000', strokeThickness: on ? 4 : 2 });
                t.setText(on ? `▶  ${opts[i]}  ◀` : opts[i]);
            });
        };
        refresh();

        const _up   = () => { sel = (sel - 1 + 4) % 4; refresh(); if (this.sfx) this.sfx.menuNavigate(); };
        const _down = () => { sel = (sel + 1) % 4;     refresh(); if (this.sfx) this.sfx.menuNavigate(); };
        const _confirm = () => {
            if (this.sfx) this.sfx.menuConfirm();
            this._closePauseMenu();
            if      (sel === 1) this._openHowToPlay(true);
            else if (sel === 2) this._openSettings(true);
            else if (sel === 3) {
                if (this.gameMusic)          this.gameMusic.stop();
                if (this.bossMusic)          this.bossMusic.stop();
                if (this.stage3Music)        this.stage3Music.stop();
                if (this.ionStormMusic)      this.ionStormMusic.stop();
                if (this.gravityStormMusic)  this.gravityStormMusic.stop();
                if (this.voidLeechMusic)     this.voidLeechMusic.stop();
                this.scene.start('MenuScene');
            }
        };

        const kb = this.input.keyboard;
        kb.on('keydown-UP',    _up);   kb.on('keydown-W', _up);
        kb.on('keydown-DOWN',  _down); kb.on('keydown-S', _down);
        kb.on('keydown-SPACE', _confirm); kb.on('keydown-ENTER', _confirm);
        const _esc = () => { if (this.sfx) this.sfx.menuConfirm(); this._closePauseMenu(); };
        kb.once('keydown-ESC', _esc);
        kb.once('keydown-P',   _esc);

        this._pauseEl = { bg, scanlines, title, txts, _up, _down, _confirm, _esc };
    }

    _closePauseMenu() {
        if (!this._pauseEl) return;
        const { bg, scanlines, title, txts, _up, _down, _confirm, _esc } = this._pauseEl;
        bg.destroy(); if (scanlines) scanlines.destroy(); title.destroy(); txts.forEach(t => t.destroy());
        const kb = this.input.keyboard;
        kb.off('keydown-UP', _up);    kb.off('keydown-W', _up);
        kb.off('keydown-DOWN', _down); kb.off('keydown-S', _down);
        kb.off('keydown-SPACE', _confirm); kb.off('keydown-ENTER', _confirm);
        kb.removeListener('keydown-ESC', _esc);
        kb.removeListener('keydown-P',   _esc);
        this._pauseEl = null;
        this.paused   = false;
        this.time.timeScale  = 1; // resume all timers
        this.tweens.timeScale = 1; // resume tweens
    }

    _openHowToPlay(fromPause = false) {
        if (this._htpEl) return;
        this.paused = true;
        const D = 22;
        const bg = this.add.rectangle(W/2, H/2, W, H, 0x000011, 0.88).setDepth(D);
        const S = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 2 };
        const SEP = '──────────────────────────────────';
        const KX = W/2 - 10;
        const AX = W/2 + 14;
        const IX = 88;
        const LX = 108;
        const DX = W/2 + 30;

        let page = 0;
        let lineObjs = [];

        const T = (x, y, txt, sz, col, ox = 0.5) => {
            const t = this.add.text(x, y, txt, { ...S, fontSize: sz, fill: col })
                .setOrigin(ox, 0.5).setDepth(D+1);
            lineObjs.push(t); return t;
        };
        const icon = (x, y, type) => {
            const g = this.add.graphics().setDepth(D+1);
            if (type === 'health') {
                g.fillStyle(0xff4444, 1); g.fillCircle(x, y, 8);
                g.fillStyle(0xffffff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'shield') {
                g.fillStyle(0x44ff88, 1); g.fillCircle(x, y, 8);
                g.fillStyle(0xffffff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'overcharge') {
                g.fillStyle(0xffdd00, 1);
                g.fillRect(x-2, y-9, 4, 18); g.fillRect(x-9, y-2, 18, 4);
                g.fillStyle(0xffffff, 0.45); g.fillCircle(x, y, 3);
            } else if (type === 'ghost') {
                g.fillStyle(0xaaaaff, 0.35); g.fillCircle(x, y, 11);
                g.fillStyle(0xffffff, 0.85); g.fillCircle(x, y, 8);
                g.fillStyle(0xccccff, 0.5); g.fillCircle(x-2, y-3, 3);
            } else if (type === 'nova') {
                g.fillStyle(0xff4400, 1); g.fillCircle(x, y, 7);
                g.fillStyle(0xffaa00, 0.85); g.fillCircle(x, y, 4);
                g.lineStyle(1.5, 0xff6600, 0.9);
                for (let a = 0; a < 360; a += 45) {
                    const r = a * Math.PI / 180;
                    g.lineBetween(x + Math.cos(r)*8, y + Math.sin(r)*8, x + Math.cos(r)*13, y + Math.sin(r)*13);
                }
            }
            lineObjs.push(g);
        };
        const img = (x, y, key, tint = null, sc = 0.5) => {
            const im = this.add.image(x, y, key).setScale(sc).setDepth(D+1);
            if (tint !== null) im.setTint(tint);
            lineObjs.push(im);
        };

        const renderPage1 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 1 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'CONTROLS', '12px', '#888888'); y += 24;
            [
                ['WASD / ARROWS', 'Move'],
                ['SPACE',          'Fire bolts'],
                ['E',              'Plasma Shield'],
                ['P  /  ESC',      'Pause'],
            ].forEach(([k, a]) => {
                T(KX, y, k, '13px', '#ffffff', 1);
                T(AX, y, a, '13px', '#88ccff', 0);
                y += 28;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'Lose a ♥ on any hit or collision', '12px', '#aaaaaa'); y += 20;
            T(W/2, y, 'Shield deflects bolts  (not black holes)', '12px', '#aaaaaa'); y += 20;
            T(W/2, y, 'Max 5 lives,  max 2 shield charges', '12px', '#aaaaaa'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, '→  NEXT PAGE  [ 2 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage2 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 2 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'STANDARD  POWER-UPS', '12px', '#888888'); y += 22;
            icon(IX, y, 'health');
            T(LX, y, 'Health Crystal', '12px', '#ff8888', 0);
            T(DX, y, '+1 life', '12px', '#888888', 0); y += 24;
            img(IX, y, 'asteroid2', 0xff2244, 0.64);
            T(LX, y, 'Crystal Cluster', '12px', '#ff8888', 0);
            T(DX, y, '+3 lives', '12px', '#888888', 0); y += 24;
            icon(IX, y, 'shield');
            T(LX, y, 'Shield Charge', '12px', '#44ff88', 0);
            T(DX, y, '+1 shield', '12px', '#888888', 0); y += 24;
            [
                ['spread', '#ff8800', 'Spread Shot  [S]',  '3-way fan'],
                ['twin',   '#00ffaa', 'Twin Bolt    [T]',  'dual beams'],
                ['rapid',  '#ff44ff', 'Rapid Fire   [R]',  'fast aimed'],
            ].forEach(([key, col, name, desc]) => {
                img(IX, y, `powerup-${key}`);
                T(LX, y, name, '12px', col, 0);
                T(DX, y, desc, '12px', '#888888', 0);
                y += 24;
            });
            T(W/2, y, 'Weapons time out or reset when hit', '11px', '#666666'); y += 18;
            T(W/2, y, SEP, '11px', '#333333'); y += 16;
            T(W/2, y, 'ENDLESS  MODE  ONLY', '12px', '#ff88ff'); y += 22;
            [
                ['overcharge', '#ffdd00', 'Overcharge',  'all weapons 6s'],
                ['ghost',      '#ccccff', 'Ghost',       '3s invincibility'],
                ['nova',       '#ff6600', 'Nova',        'screen clear +50pt'],
            ].forEach(([type, col, name, desc]) => {
                icon(IX, y, type);
                T(LX, y, name, '12px', col, 0);
                T(DX, y, desc, '12px', '#888888', 0);
                y += 24;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, '←  [ 1 / 5 ]    →  [ 3 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage3 = () => {
            let y = H/2 - 148;
            T(W/2, y, 'HOW  TO  PLAY          [ 3 / 5 ]', '14px', '#ffee00'); y += 24;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'COMBO  SYSTEM', '12px', '#888888'); y += 22;
            T(W/2, y, 'Kill enemies without being hit  →  ×2 → ×3 → ×4', '11px', '#cccccc'); y += 18;
            T(W/2, y, 'Being hit resets combo to ×1', '11px', '#888888'); y += 18;
            T(W/2, y, '×4  =  RAINBOW MODE  (8s, ×1.5 score)', '13px', '#ffee00'); y += 20;
            T(W/2, y, 'Rainbow: your bolts destroy black holes!', '12px', '#ff88ff'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, 'CRYSTAL  EVENTS', '12px', '#888888'); y += 22;
            T(W/2, y, 'A crystal drifts in between waves', '11px', '#cccccc'); y += 18;
            T(W/2, y, 'Shoot it for a random reward:', '11px', '#cccccc'); y += 18;
            T(W/2, y, '+life / +shield / all weapons / ×2 score', '11px', '#aaaaaa'); y += 22;
            T(W/2, y, SEP, '11px', '#333333'); y += 18;
            T(W/2, y, '←  [ 2 / 5 ]    →  [ 4 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage4 = () => {
            let y = H/2 - 148;
            const BIX = 38, BNX = 64;
            T(W/2, y, 'BESTIARY  —  ENEMIES  [ 4 / 5 ]', '14px', '#ffee00'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            [
                { key: 'enemy1',    sc: 0.38, col: '#ff7777', name: 'FLYING  EYE',   hp: '1', desc: 'Dives straight down · no weapons' },
                { key: 'e01-1',     sc: 0.38, col: '#ffaa55', name: 'BIPED',          hp: '3', desc: 'Zigzags side to side · fires aimed bolt' },
                { key: 'scarab-m0', sc: 0.34, col: '#ffcc44', name: 'SCARAB  BOMBER', hp: '4', desc: 'Drops timed bomb · death: 5-bolt fan burst' },
                { key: 'worm-m0',   sc: 0.34, col: '#44ffcc', name: 'SPECTRUM  WORM', hp: '5', desc: 'Slow & tanky · fires 3-way spread shot' },
                { key: 'hornet-m0', sc: 0.34, col: '#ffee55', name: 'DEMON  HORNET',  hp: '2', desc: 'Swoops diagonally · fires glowing sting' },
            ].forEach(en => {
                img(BIX, y + 7, en.key, null, en.sc);
                T(BNX, y, en.name, '12px', en.col, 0);
                T(W - 14, y, `HP: ${en.hp}`, '11px', '#445566', 1);
                y += 15;
                T(BNX, y, en.desc, '10px', '#777777', 0); y += 22;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            T(W/2, y, '←  [ 3 / 5 ]    →  [ 5 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const renderPage5 = () => {
            let y = H/2 - 148;
            const BIX = 38, BNX = 64;
            T(W/2, y, 'BESTIARY  —  ENEMIES  [ 5 / 5 ]', '14px', '#ffee00'); y += 20;
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            [
                { key: 'e02-1',        sc: 0.38, col: '#ff5588', name: 'KAMIKAZE  DRONE', hp: '1',   desc: 'Spawns in packs · fast dive · no shots' },
                { key: 'e03-1',        sc: 0.38, col: '#aa88ff', name: 'SHIELD  CARRIER', hp: '5',   desc: 'Zigzags · fires twin bolt volleys' },
                { key: 'alien1',       sc: 0.38, col: '#55ffaa', name: 'SWARM  ALIEN',    hp: '1',   desc: 'Groups of 4 · fast sine wave drift · no shots' },
                { key: 'prism-enemy-0',sc: 0.38, col: '#88aaff', name: 'PRISM  ENTITY',   hp: '2',   desc: 'Death: fires 5 RGB shards outward' },
                { key: 'vleech-m0',    sc: 0.34, col: '#cc88ff', name: 'VOID  LEECH',     hp: '2-3', desc: 'Bonus encounter · orbits then strikes · drops ♥/shield' },
            ].forEach(en => {
                img(BIX, y + 7, en.key, null, en.sc);
                T(BNX, y, en.name, '12px', en.col, 0);
                T(W - 14, y, `HP: ${en.hp}`, '11px', '#445566', 1);
                y += 15;
                T(BNX, y, en.desc, '10px', '#777777', 0); y += 22;
            });
            T(W/2, y, SEP, '11px', '#333333'); y += 12;
            T(W/2, y, '←  PREV PAGE  [ 4 / 5 ]', '12px', '#777777'); y += 20;
            T(W/2, y, 'H / ESC  —  Close', '12px', '#777777');
        };

        const render = () => {
            lineObjs.forEach(o => o.destroy()); lineObjs = [];
            if (page === 0) renderPage1();
            else if (page === 1) renderPage2();
            else if (page === 2) renderPage3();
            else if (page === 3) renderPage4();
            else renderPage5();
        };
        render();

        const _left  = () => { if (page > 0) { page--; render(); if (this.sfx) this.sfx.menuNavigate(); } };
        const _right = () => { if (page < 4) { page++; render(); if (this.sfx) this.sfx.menuNavigate(); } };
        const _close = () => {
            bg.destroy(); lineObjs.forEach(o => o.destroy());
            this.input.keyboard.off('keydown-LEFT',  _left);
            this.input.keyboard.off('keydown-A',     _left);
            this.input.keyboard.off('keydown-RIGHT', _right);
            this.input.keyboard.off('keydown-D',     _right);
            this.input.keyboard.removeListener('keydown-ESC', _close);
            this.input.keyboard.removeListener('keydown-H',   _close);
            this._htpEl = null;
            if (fromPause) this._openPauseMenu();
            else this.paused = false;
        };
        this.input.keyboard.on('keydown-LEFT',  _left);
        this.input.keyboard.on('keydown-A',     _left);
        this.input.keyboard.on('keydown-RIGHT', _right);
        this.input.keyboard.on('keydown-D',     _right);
        this.input.keyboard.once('keydown-ESC', _close);
        this.input.keyboard.once('keydown-H',   _close);
        this._htpEl = { bg, lineObjs, _close };
    }

    _openSettings(fromPause = false) {
        if (this._settingsEl) return;
        this.paused = true;
        const D = 22;
        const bg    = this.add.rectangle(W/2, H/2, W, H, 0x000011, 0.88).setDepth(D);
        const title = this.add.text(W/2, H/2 - 120, 'SETTINGS', {
            fontFamily: 'monospace', fontSize: '24px', fill: '#ffee00', stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(D+1);

        const rows   = ['MUSIC  VOLUME', 'SFX  VOLUME'];
        let   sel    = 0;
        const txts   = rows.map((lbl, i) => this.add.text(W/2, H/2 - 30 + i * 60, '', {
            fontFamily: 'monospace', fontSize: '15px', fill: '#fff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(D+1));

        const backTxt = this.add.text(W/2, H/2 + 120, '▶  BACK  ◀', {
            fontFamily: 'monospace', fontSize: '16px', fill: '#ffee00', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(D+1);

        const render = () => {
            const vals = [this.musicVol, this.sfxVol];
            txts.forEach((t, i) => {
                const on = i === sel;
                t.setStyle({ fontFamily: 'monospace', fontSize: on ? '17px' : '14px',
                    fill: on ? '#ffee00' : '#888888', stroke: '#000', strokeThickness: on ? 4 : 2 });
                t.setText(`${rows[i]}    ◀  ${vals[i]}  ▶`);
            });
            backTxt.setStyle({ fontFamily: 'monospace', fontSize: sel === 2 ? '18px' : '15px',
                fill: sel === 2 ? '#ffee00' : '#666', stroke: '#000', strokeThickness: sel === 2 ? 4 : 2 });
        };
        render();

        const _up   = () => { sel = (sel - 1 + 3) % 3; render(); if (this.sfx) this.sfx.menuNavigate(); };
        const _down = () => { sel = (sel + 1) % 3;     render(); if (this.sfx) this.sfx.menuNavigate(); };
        const _left = () => {
            if (sel === 0) { this.musicVol = Math.max(0, this.musicVol - 10); localStorage.setItem('space-shooter-music-vol', this.musicVol); this._applyVolumes(); }
            else if (sel === 1) { this.sfxVol = Math.max(0, this.sfxVol - 10); localStorage.setItem('space-shooter-sfx-vol', this.sfxVol); this._applyVolumes(); }
            render(); if (this.sfx) this.sfx.settingsChange();
        };
        const _right = () => {
            if (sel === 0) { this.musicVol = Math.min(100, this.musicVol + 10); localStorage.setItem('space-shooter-music-vol', this.musicVol); this._applyVolumes(); }
            else if (sel === 1) { this.sfxVol = Math.min(100, this.sfxVol + 10); localStorage.setItem('space-shooter-sfx-vol', this.sfxVol); this._applyVolumes(); }
            render(); if (this.sfx) this.sfx.settingsChange();
        };
        const _confirm = () => {
            if (this.sfx) this.sfx.menuConfirm();
            _close();
        };
        const _close = () => {
            [bg, title, ...txts, backTxt].forEach(o => o.destroy());
            const kb = this.input.keyboard;
            kb.off('keydown-UP', _up);    kb.off('keydown-W', _up);
            kb.off('keydown-DOWN', _down); kb.off('keydown-S', _down);
            kb.off('keydown-LEFT', _left); kb.off('keydown-A', _left);
            kb.off('keydown-RIGHT', _right); kb.off('keydown-D', _right);
            kb.off('keydown-SPACE', _confirm); kb.off('keydown-ENTER', _confirm);
            kb.removeListener('keydown-ESC', _close);
            this._settingsEl = null;
            if (fromPause) this._openPauseMenu();
            else this.paused = false;
        };
        const kb = this.input.keyboard;
        kb.on('keydown-UP', _up);    kb.on('keydown-W', _up);
        kb.on('keydown-DOWN', _down); kb.on('keydown-S', _down);
        kb.on('keydown-LEFT', _left); kb.on('keydown-A', _left);
        kb.on('keydown-RIGHT', _right); kb.on('keydown-D', _right);
        kb.on('keydown-SPACE', _confirm); kb.on('keydown-ENTER', _confirm);
        kb.once('keydown-ESC', _close);
        this._settingsEl = { bg, title, txts, backTxt, _close };
    }

    _applyVolumes() {
        const mf = this.musicVol / 100;
        const sf = this.sfxVol   / 100;
        if (this.sfx)                this.sfx.master.gain.value = sf * 0.2;
        if (this.gameMusic)          this.gameMusic.setVol(mf);
        if (this.bossMusic)          this.bossMusic.setVol(mf);
        if (this.stage3Music)        this.stage3Music.setVol(mf);
        if (this.ionStormMusic)      this.ionStormMusic.setVol(mf);
        if (this.gravityStormMusic)  this.gravityStormMusic.setVol(mf);
    }
}

// ─── VICTORY ─────────────────────────────────────────────────────────────────

class VictoryScene extends Phaser.Scene {
    constructor() { super({ key: 'VictoryScene' }); }

    create(data) {
        const score = (data && data.score)      ? data.score      : 0;
        const diff  = (data && data.difficulty) ? data.difficulty : 'normal';

        // Save hi score (per-difficulty)
        const hsKeyV = `space-shooter-hiscore-${diff}`;
        const prev  = parseInt(localStorage.getItem(hsKeyV) || '0', 10);
        const newHi = score > prev;
        if (newHi) localStorage.setItem(hsKeyV, score);
        const best = Math.max(score, prev);

        if (this.sound && this.sound.context) {
            this.sound.context.resume().then(() => {
                this._victMusic = new VictoryMusic(this.sound.context);
                this._victMusic.start();
                if (newHi) {
                    const sfx = new SoundFX(this.sound.context);
                    this.time.delayedCall(1800, () => sfx.newHighScore());
                }
            }).catch(() => {});
        }
        this.events.once('shutdown', () => { if (this._victMusic) { this._victMusic.stop(); this._victMusic = null; } });

        this.add.rectangle(W / 2, H / 2, W, H, 0x000008);
        for (let i = 0; i < 80; i++) {
            this.add.circle(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H), Phaser.Math.Between(1,2), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.7));
        }

        this.add.text(W / 2, H / 2 - 210, 'YOU  WIN!', {
            fontFamily: 'monospace', fontSize: '52px', fill: '#ffee00',
            stroke: '#884400', strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(W / 2, H / 2 - 148, 'CONGRATULATIONS', {
            fontFamily: 'monospace', fontSize: '15px', fill: '#ffffff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // Score
        this.add.text(W / 2, H / 2 - 108, 'SCORE', {
            fontFamily: 'monospace', fontSize: '12px', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 - 76, String(score).padStart(8, '0'), {
            fontFamily: 'monospace', fontSize: '36px', fill: '#44ffaa', stroke: '#004422', strokeThickness: 6
        }).setOrigin(0.5);

        // Hi score
        const hiLabel = newHi ? '★  NEW  HI-SCORE  ★' : 'BEST';
        const hiColor = newHi ? '#ffee00' : '#888888';
        this.add.text(W / 2, H / 2 - 24, hiLabel, {
            fontFamily: 'monospace', fontSize: '13px', fill: hiColor, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + 14, String(best).padStart(8, '0'), {
            fontFamily: 'monospace', fontSize: '28px', fill: hiColor, stroke: '#003300', strokeThickness: 5
        }).setOrigin(0.5);

        // [MENU] / [ENDLESS MODE] choice
        this.selOpt = 0;
        const hud = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 };
        this.optTxts = [
            this.add.text(W / 2 - 90, H / 2 + 90, 'MENU',    { ...hud, fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5),
            this.add.text(W / 2 + 90, H / 2 + 90, 'ENDLESS', { ...hud, fontSize: '18px', fill: '#ffffff' }).setOrigin(0.5),
        ];
        this._refreshOpts();

        this.add.text(W / 2, H / 2 + 138, '◀▶  choose     SPACE  confirm', {
            fontFamily: 'monospace', fontSize: '11px', fill: '#666', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        const _goLeft  = () => { this.selOpt = 0; this._refreshOpts(); };
        const _goRight = () => { this.selOpt = 1; this._refreshOpts(); };
        this.input.keyboard.on('keydown-LEFT',  _goLeft);
        this.input.keyboard.on('keydown-A',     _goLeft);
        this.input.keyboard.on('keydown-W',     _goLeft);
        this.input.keyboard.on('keydown-RIGHT', _goRight);
        this.input.keyboard.on('keydown-D',     _goRight);
        this.input.keyboard.on('keydown-S',     _goRight);
        this.input.keyboard.once('keydown-SPACE', () => {
            if (this.selOpt === 1) this.scene.start('GameScene', { difficulty: diff, endless: true });
            else                   this.scene.start('MenuScene');
        });
        this.input.keyboard.once('keydown-R', () => this.scene.start('MenuScene'));
    }

    _refreshOpts() {
        const labels = ['MENU', 'ENDLESS'];
        this.optTxts.forEach((t, i) => {
            const active = i === this.selOpt;
            t.setStyle({ fontFamily: 'monospace', fontSize: active ? '22px' : '16px',
                fill: active ? '#ffee00' : '#555555', stroke: '#000', strokeThickness: active ? 4 : 2 });
            t.setText(active ? `▶ ${labels[i]} ◀` : labels[i]);
        });
    }
}

// ─── TRUE ENDING ──────────────────────────────────────────────────────────────

class TrueEndingScene extends Phaser.Scene {
    constructor() { super({ key: 'TrueEndingScene' }); }

    create(data) {
        const score = (data && data.score)      ? data.score      : 0;
        const diff  = (data && data.difficulty) ? data.difficulty : 'normal';
        const st    = (data && data.stats)      ? data.stats      : null;

        const hsKeyTE = `space-shooter-hiscore-${diff}`;
        const prev  = parseInt(localStorage.getItem(hsKeyTE) || '0', 10);
        const newHi = score > prev;
        if (newHi) localStorage.setItem(hsKeyTE, score);
        const best = Math.max(score, prev);

        // Unlock Stage 4 — Prism Dimension
        localStorage.setItem('space-shooter-stage4-unlocked', '1');

        if (this.sound && this.sound.context) {
            this.sound.context.resume().then(() => {
                this._victMusic = new VictoryMusic(this.sound.context);
                this._victMusic.start();
                if (newHi) {
                    const sfx = new SoundFX(this.sound.context);
                    this.time.delayedCall(2200, () => sfx.newHighScore());
                }
            }).catch(() => {});
        }
        this.events.once('shutdown', () => { if (this._victMusic) { this._victMusic.stop(); this._victMusic = null; } });

        // Background — deep black with cyan stars
        this.add.rectangle(W/2, H/2, W, H, 0x000008);
        for (let i = 0; i < 120; i++) {
            const col = Phaser.Utils.Array.GetRandom([0xffffff, 0x88ccff, 0xcc88ff, 0xffccff]);
            this.add.circle(Phaser.Math.Between(0,W), Phaser.Math.Between(0,H),
                Phaser.Math.Between(1,2), col, Phaser.Math.FloatBetween(0.15, 0.9));
        }

        // Title — pulsing gold glow
        const title1 = this.add.text(W/2, H/2 - 218, 'YOU  SAVED', {
            fontFamily: 'monospace', fontSize: '40px', fill: '#ffee00',
            stroke: '#884400', strokeThickness: 8
        }).setOrigin(0.5);
        const title2 = this.add.text(W/2, H/2 - 168, 'THE  GALAXY', {
            fontFamily: 'monospace', fontSize: '52px', fill: '#ffee00',
            stroke: '#884400', strokeThickness: 10
        }).setOrigin(0.5);
        this.tweens.add({ targets: [title1, title2], alpha: 0.55, duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.add.text(W/2, H/2 - 116, 'All three stages cleared', {
            fontFamily: 'monospace', fontSize: '15px', fill: '#aaffcc', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // Difficulty badge
        const diffColors = { easy: '#44ff88', normal: '#ffee88', hard: '#ff5555' };
        this.add.text(W/2, H/2 - 90, diff.toUpperCase(), {
            fontFamily: 'monospace', fontSize: '13px', fill: diffColors[diff] || '#ffee88',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // Score
        this.add.text(W/2, H/2 - 52, 'FINAL  SCORE', {
            fontFamily: 'monospace', fontSize: '12px', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add.text(W/2, H/2 - 18, String(score).padStart(8, '0'), {
            fontFamily: 'monospace', fontSize: '36px', fill: '#44ffaa', stroke: '#004422', strokeThickness: 6
        }).setOrigin(0.5);

        // Hi score
        const hiLabel = newHi ? '★  NEW  HI-SCORE  ★' : 'BEST';
        const hiColor = newHi ? '#ffee00' : '#888888';
        this.add.text(W/2, H/2 + 30, hiLabel, {
            fontFamily: 'monospace', fontSize: '13px', fill: hiColor, stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        this.add.text(W/2, H/2 + 62, String(best).padStart(8, '0'), {
            fontFamily: 'monospace', fontSize: '28px', fill: hiColor, stroke: '#003300', strokeThickness: 5
        }).setOrigin(0.5);

        // Unlock notice
        this.add.text(W/2, H/2 + 108, '✦  PRISM  DIMENSION  UNLOCKED  ✦', {
            fontFamily: 'monospace', fontSize: '12px', fill: '#ff88ff', stroke: '#220044', strokeThickness: 3
        }).setOrigin(0.5);

        // Run stats
        if (st) {
            this.add.text(W/2, H/2 + 128, `Kills ${st.kills}  ·  Acc ${st.accuracy}%  ·  ×${st.combo}  ·  ${st.time}  ·  Pickups ${st.pickups}`, {
                fontFamily: 'monospace', fontSize: '11px', fill: '#88aaff', stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5);
        }

        // Options
        this.selOpt = 0;
        const hud = { fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 };
        this.optTxts = [
            this.add.text(W/2 - 80, H/2 + 148, 'MENU',    { ...hud, fontSize: '15px', fill: '#fff' }).setOrigin(0.5),
            this.add.text(W/2 + 80, H/2 + 148, 'ENDLESS', { ...hud, fontSize: '15px', fill: '#fff' }).setOrigin(0.5),
        ];
        this._refreshOpts();
        this.add.text(W/2, H/2 + 186, '◀▶  choose     SPACE  confirm', {
            fontFamily: 'monospace', fontSize: '11px', fill: '#666', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        const _L = () => { this.selOpt = (this.selOpt - 1 + 2) % 2; this._refreshOpts(); };
        const _R = () => { this.selOpt = (this.selOpt + 1) % 2;     this._refreshOpts(); };
        ['LEFT','A'].forEach(k => this.input.keyboard.on(`keydown-${k}`, _L));
        ['RIGHT','D'].forEach(k => this.input.keyboard.on(`keydown-${k}`, _R));
        this.input.keyboard.once('keydown-SPACE', () => {
            if (this.selOpt === 1) this.scene.start('GameScene', { difficulty: diff, endless: true });
            else                   this.scene.start('MenuScene');
        });
        this.input.keyboard.once('keydown-R', () => this.scene.start('MenuScene'));
    }

    _refreshOpts() {
        const labels = ['MENU', 'ENDLESS'];
        this.optTxts.forEach((t, i) => {
            const active = i === this.selOpt;
            t.setStyle({ fontFamily: 'monospace', fontSize: active ? '19px' : '14px',
                fill: active ? '#ffee00' : '#555555', stroke: '#000', strokeThickness: active ? 4 : 2 });
            t.setText(active ? `▶${labels[i]}◀` : labels[i]);
        });
    }
}

// ─── FINAL CREDITS ───────────────────────────────────────────────────────────

class FinalCreditsScene extends Phaser.Scene {
    constructor() { super({ key: 'FinalCreditsScene' }); }

    create(data) {
        const score = (data && data.score)      ? data.score      : 0;
        const diff  = (data && data.difficulty) ? data.difficulty : 'normal';
        const st    = (data && data.stats)      ? data.stats      : null;

        // Save hi score (per-difficulty)
        const hsKeyFC = `space-shooter-hiscore-${diff}`;
        const prev = parseInt(localStorage.getItem(hsKeyFC) || '0', 10);
        if (score > prev) localStorage.setItem(hsKeyFC, score);

        // Rainbow cycling background
        this._bgColors = [...RAINBOW_COLORS];
        this._bgIdx = 0;
        this._bg = this.add.rectangle(W/2, H/2, W, H, this._bgColors[0]).setDepth(0);
        this.time.addEvent({ delay: 500, repeat: -1, callback: () => {
            this._bgIdx = (this._bgIdx + 1) % this._bgColors.length;
            this.tweens.add({ targets: this._bg, fillColor: this._bgColors[this._bgIdx], duration: 480 });
        }});

        // Dark overlay
        this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.70).setDepth(1);

        // Parallax stars
        this._stars = [];
        for (let i = 0; i < 60; i++) {
            const vy = Phaser.Math.FloatBetween(0.3, 1.2);
            const c  = this.add.circle(
                Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
                Phaser.Math.Between(1, 2), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.9)
            ).setDepth(2);
            this._stars.push({ c, vy });
        }

        // Build credit content
        const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);
        const titleCols = ['#ff2222','#ff8800','#ffee00','#00ff44','#00eeff','#4488ff','#cc00ff'];
        const SEP = '─────────────────────────────────';
        const lines = [
            { t: '✦  PRISM  DIMENSION  CONQUERED  ✦', s: '22px', c: '#ff88ff', sp: 16, rainbow: true },
            { t: '', s: '8px', c: '#fff', sp: 6 },
            { t: `FINAL  SCORE:  ${String(score).padStart(8,'0')}`, s: '18px', c: '#ffee00', sp: 10 },
            { t: `Difficulty:  ${diffLabel}`, s: '13px', c: '#aaaaaa', sp: 8 },
            { t: SEP, s: '11px', c: '#333333', sp: 10 },
        ];
        if (st) {
            lines.push({ t: 'RUN  STATS', s: '14px', c: '#88aaff', sp: 8 });
            lines.push({ t: `Kills ${st.kills}  ·  Acc ${st.accuracy}%  ·  ×${st.combo}  ·  ${st.time}  ·  Pickups ${st.pickups}`, s: '11px', c: '#cccccc', sp: 8 });
            lines.push({ t: SEP, s: '11px', c: '#333333', sp: 10 });
        }
        lines.push(
            { t: 'CREATED  WITH', s: '13px', c: '#cccccc', sp: 8 },
            { t: 'ENGINE:  Phaser 3.60', s: '12px', c: '#88ccff', sp: 6 },
            { t: 'SOUND:  Web Audio API  —  fully synthesized', s: '12px', c: '#88ccff', sp: 6 },
            { t: 'ART  ASSETS:  Warped  /  Gothicvania  /  PixelLab AI', s: '12px', c: '#88ccff', sp: 6 },
            { t: 'MUSIC:  D minor  ·  140–182 BPM', s: '12px', c: '#88ccff', sp: 8 },
            { t: SEP, s: '11px', c: '#333333', sp: 10 },
            { t: '✦  Game creator:  Przemyslaw Czajkowski  ✦', s: '13px', c: '#ff88ff', sp: 6 },
            { t: '✦  and Claude  ✦', s: '13px', c: '#cc66ff', sp: 10 },
            { t: 'THANK  YOU  FOR  PLAYING', s: '20px', c: '#ffee00', sp: 10 },
            { t: '✦       ✦       ✦', s: '18px', c: '#ff88ff', sp: 40 }
        );

        // Scrolling container starting below the screen
        const container = this.add.container(0, H + 40).setDepth(5);
        let curY = 0;
        let _tcIdx = 0;
        lines.forEach(l => {
            const t = this.add.text(W/2, curY, l.t, {
                fontFamily: 'monospace', fontSize: l.s, fill: l.c,
                stroke: '#000', strokeThickness: 2, align: 'center'
            }).setOrigin(0.5, 0);
            container.add(t);
            if (l.rainbow) {
                this.time.addEvent({ delay: 400, repeat: -1, callback: () => {
                    _tcIdx = (_tcIdx + 1) % titleCols.length;
                    t.setStyle({ fontFamily: 'monospace', fontSize: l.s, fill: titleCols[_tcIdx],
                        stroke: '#220044', strokeThickness: 3, align: 'center' });
                }});
            }
            curY += parseInt(l.s) + l.sp;
        });
        this._scrollCont  = container;
        this._totalHeight = curY;
        this._scrollDone  = false;
        this._guardPassed = false;
        this._createTime  = this.time.now;

        // Prompt — hidden until guard passes
        const prompt = this.add.text(W/2, H - 36, 'Press  any  key  to  continue', {
            fontFamily: 'monospace', fontSize: '12px', fill: '#ffee88', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(6).setAlpha(0);
        this._prompt = prompt;

        // Sound
        if (this.sound && this.sound.context) {
            const sfxVol = parseInt(localStorage.getItem('space-shooter-sfx-vol') || '80', 10);
            this.sound.context.resume().then(() => {
                const sfx = new SoundFX(this.sound.context);
                sfx.master.gain.value = (sfxVol / 100) * 0.2;
                sfx.prismOverlordPhase();
            }).catch(() => {});
        }
    }

    update(time, delta) {
        const dt = delta / 1000;

        // Parallax stars drift downward, wrap at bottom
        this._stars.forEach(({ c, vy }) => {
            c.y += vy * 35 * dt;
            if (c.y > H + 4) c.y = -4;
        });

        // Scroll credits upward
        if (!this._scrollDone) {
            this._scrollCont.y -= 50 * dt;
            if (this._scrollCont.y <= -(this._totalHeight + 40)) {
                this._scrollCont.y = -(this._totalHeight + 40);
                this._scrollDone = true;
            }
        }

        // Unlock prompt after scroll completes AND 5s elapsed (both required)
        if (!this._guardPassed) {
            const elapsed = (time - this._createTime) / 1000;
            if (this._scrollDone && elapsed >= 5) {
                this._guardPassed = true;
                this.tweens.add({ targets: this._prompt, alpha: 1, duration: 600 });
                this.tweens.add({ targets: this._prompt, alpha: 0.2, duration: 700,
                    ease: 'Sine.easeInOut', yoyo: true, repeat: -1, delay: 700 });
                // Small delay to drop any held-key carryover from the game scene
                this.time.delayedCall(80, () => {
                    this.input.keyboard.once('keydown', () => this.scene.start('MenuScene'));
                });
            }
        }
    }
}

// ─── BOOT ─────────────────────────────────────────────────────────────────────

new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    backgroundColor: '#00000f',
    render: { pixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PreloadScene, MenuScene, CreditsScene, GameScene, VictoryScene, TrueEndingScene, FinalCreditsScene]
});
