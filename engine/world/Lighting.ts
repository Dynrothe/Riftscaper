// What a sim knows of light: where its lights are, whether a spot's in one, and how bright the
// scene is as it changes over time. Drawing them is render/DrawnLights.ts's; this is what a game's
// rules can go by (only aiming at what's lit), so it's the same on every machine: squared
// distances, and nothing from Math but max.

// A light the sim keeps: where it is and how far it reaches now, in tiles
export type WorldLight = { x: number; y: number; radius: number };

// Whether a spot's in any of the lights, or within grace tiles of its edge
export function isInLight(lights: readonly WorldLight[], x: number, y: number, grace = 0): boolean {
    for (const light of lights) {
        const reach = light.radius + grace;
        const dx = x - light.x;
        const dy = y - light.y;
        if (dx * dx + dy * dy <= reach * reach) {
            return true;
        }
    }
    return false;
}

// A scene's ambient (how bright what's out of every light is, 0 to 1) as it fades from one level
// to another, in the sim's ticks
export class AmbientFade {
    private from: number;
    private to: number;
    private startTick = 0;
    private endTick = 0;

    constructor(level = 1) {
        this.from = this.to = level;
    }

    // As it is, still
    reset(level: number): void {
        this.from = this.to = level;
        this.startTick = this.endTick = 0;
    }

    // At a tick, fractions too, for drawing between ticks
    at(tick: number): number {
        if (tick >= this.endTick) {
            return this.to;
        }
        const t = Math.max(0, (tick - this.startTick) / Math.max(1, this.endTick - this.startTick));
        return this.from + (this.to - this.from) * t;
    }

    // To level over ticks, from wherever it is at tick
    fadeTo(level: number, tick: number, ticks: number): void {
        this.from = this.at(tick);
        this.to = level;
        this.startTick = tick;
        this.endTick = tick + ticks;
    }
}
