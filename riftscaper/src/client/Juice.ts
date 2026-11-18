// What makes a hit look like one, on screen only: the sim decides what happens (its own share, the
// shove and the stagger, is IMPACT in content/rules.ts), and this decides how it looks. The rules
// it follows are from Diablo's and Path of Exile's:
//
// - A hit pause: the pose of whoever struck and whoever was struck held a moment as a blow lands,
//   longer for a crit or a kill that matters, so a blow connects. The world goes on.
// - A flinch: what's hit leans back away from the blow and comes upright again.
// - Shake, only for what's big (a slam, a guardian's blow landing, a hard hit taken, a rare's
//   death), as trauma that's squared and fades, so small things barely move the camera.
// - A corpse thrown along the killing blow, further the more it was overkilled.
// - Facing turned through in a few frames, not snapped, so a crowd doesn't twitch.
//
// Everything here is the client's: it reads the clock (performance.now) and nothing of it goes
// back to the sim.

// Milliseconds
const HOLD = { hit: 45, crit: 85, kill: 70, big: 120 };
const RECOIL_MS = 280;
const RECOIL_RISE_MS = 40;
// The most a flinch leans, RS angle units (2048 a turn): about 17 degrees
const RECOIL_MOST = 100;
const CORPSE_MS = 380;
// Shake: trauma lost a second, and the camera's most offset at full trauma, in tiles
const TRAUMA_DECAY = 1.5;
const SHAKE_MOST = 0.32;

const RS_TO_RAD = (Math.PI * 2) / 2048;

type Recoil = { start: number; dirX: number; dirY: number; power: number };
type Corpse = { start: number; dx: number; dy: number; hop: number };

export class Juice {
    shakeOn = true;
    private trauma = 0;
    private holds = new Map<number, { until: number; at?: number }>();
    private recoils = new Map<number, Recoil>();
    private corpses = new Map<number, Corpse>();
    private yaws = new Map<number, number>();

    clear(): void {
        this.trauma = 0;
        this.holds.clear();
        this.recoils.clear();
        this.corpses.clear();
        this.yaws.clear();
    }

    // ---- Hit pause ----

    // Hold whoever this is (a monster's uid, or -1 for the hero) in the pose they're in for a moment
    hold(key: number, kind: keyof typeof HOLD, now: number): void {
        const until = now + HOLD[kind];
        const held = this.holds.get(key);
        if (!held || held.until < until) {
            this.holds.set(key, { until, at: held && now < held.until ? held.at : undefined });
        }
    }

    // An animation's tick to draw for someone: the one they were at when a hold began, while it lasts
    animTime(key: number, t: number, now: number): number {
        const held = this.holds.get(key);
        if (!held) {
            return t;
        }
        if (now >= held.until) {
            this.holds.delete(key);
            return t;
        }
        held.at ??= t;
        return held.at;
    }

    // A small shiver of someone held by a blow, in tiles
    shiver(key: number, now: number): number {
        const held = this.holds.get(key);
        return held && now < held.until ? Math.sin(now * 0.09) * 0.035 : 0;
    }

    // ---- Flinch ----

    // Struck from (fromX, fromY): a lean away from there, by how hard (0 to 1)
    recoil(uid: number, x: number, y: number, fromX: number, fromY: number, power: number, now: number): void {
        let dx = x - fromX;
        let dy = y - fromY;
        const d = Math.hypot(dx, dy);
        if (d < 0.001) {
            return;
        }
        dx /= d;
        dy /= d;
        const old = this.recoils.get(uid);
        if (old && now - old.start < RECOIL_RISE_MS && old.power >= power) {
            return;
        }
        this.recoils.set(uid, { start: now, dirX: dx, dirY: dy, power: Math.min(1, power) });
    }

    // The flinch's lean now, as the pitch and roll the renderer tips a model by (before its yaw)
    // so its top moves away from the blow, or undefined if it's upright
    lean(uid: number, yaw: number, now: number): { pitch: number; roll: number } | undefined {
        const r = this.recoils.get(uid);
        if (!r) {
            return undefined;
        }
        const t = now - r.start;
        if (t >= RECOIL_MS) {
            this.recoils.delete(uid);
            return undefined;
        }
        const shape = t < RECOIL_RISE_MS ? t / RECOIL_RISE_MS : Math.exp(-(t - RECOIL_RISE_MS) / 70) * (1 - (t - RECOIL_RISE_MS) / (RECOIL_MS - RECOIL_RISE_MS));
        const a = RECOIL_MOST * r.power * shape * RS_TO_RAD;
        return tip(r.dirX, r.dirY, a, yaw);
    }

    // ---- Shake ----

    // Something big: trauma added, up to 1
    shake(amount: number): void {
        if (this.shakeOn) {
            this.trauma = Math.min(1, this.trauma + amount);
        }
    }

    // The camera's offset now, in tiles, east and north
    shakeOffset(now: number, deltaMs: number): { x: number; y: number } {
        this.trauma = Math.max(0, this.trauma - (TRAUMA_DECAY * deltaMs) / 1000);
        if (this.trauma <= 0) {
            return NO_SHAKE;
        }
        const s = this.trauma * this.trauma * SHAKE_MOST;
        const t = now / 1000;
        // Smooth noise: sines that don't line up
        SHAKE.x = s * (Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7 + 1.3) * 0.4);
        SHAKE.y = s * (Math.sin(t * 43.3 + 2.1) * 0.6 + Math.sin(t * 71.9 + 0.4) * 0.4);
        return SHAKE;
    }

    // ---- Corpses ----

    // Thrown this far from where it fell, along (dx, dy), with a hop this high (tiles)
    throwCorpse(uid: number, dx: number, dy: number, hop: number, now: number): void {
        this.corpses.set(uid, { start: now, dx, dy, hop });
    }

    // Where a corpse is drawn from where it fell, and how high above the ground (negative is up, in
    // tiles, as heights are)
    corpse(uid: number, now: number): { dx: number; dy: number; up: number } | undefined {
        const c = this.corpses.get(uid);
        if (!c) {
            return undefined;
        }
        const t = Math.min(1, (now - c.start) / CORPSE_MS);
        const out = 1 - (1 - t) * (1 - t) * (1 - t);
        CORPSE.dx = c.dx * out;
        CORPSE.dy = c.dy * out;
        CORPSE.up = -c.hop * 4 * t * (1 - t);
        return CORPSE;
    }

    // A corpse gone: everything kept for it
    forgetCorpse(uid: number): void {
        this.corpses.delete(uid);
        this.yaws.delete(uid);
        this.holds.delete(uid);
        this.recoils.delete(uid);
    }

    // ---- Facing ----

    // The way someone's drawn facing, turned towards the way the sim has them face with this time
    // constant (ms): RS yaw units
    yaw(key: number, target: number, deltaMs: number, tau: number): number {
        const cur = this.yaws.get(key);
        if (cur === undefined || tau <= 0) {
            this.yaws.set(key, target);
            return target;
        }
        const diff = ((((target - cur) % 2048) + 3072) % 2048) - 1024;
        const next = (cur + diff * (1 - Math.exp(-deltaMs / tau)) + 2048) % 2048;
        this.yaws.set(key, next);
        return next;
    }
}

const NO_SHAKE = { x: 0, y: 0 };
const SHAKE = { x: 0, y: 0 };
const CORPSE = { dx: 0, dy: 0, up: 0 };
const LEAN = { pitch: 0, roll: 0 };

// The pitch and roll (RS units) that tip a model's top `a` radians along world direction (ux, uy)
// (east, north), for a model turned to `yaw`. The actor shader tips a model about x, then z, then
// turns it: worked through, its top moves by (r cos - p sin, -r sin - p cos) times its height, in
// world x and z, for small angles, where the angle is the yaw's.
export function tip(ux: number, uy: number, a: number, yaw: number): { pitch: number; roll: number } {
    const th = yaw * RS_TO_RAD;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const roll = a * (ux * c - uy * s);
    const pitch = -a * (ux * s + uy * c);
    LEAN.pitch = pitch / RS_TO_RAD;
    LEAN.roll = roll / RS_TO_RAD;
    return LEAN;
}
