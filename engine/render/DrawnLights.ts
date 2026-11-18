import { LightBudget, lightKey } from "./LightBudget";
import { LightLook, lightColor } from "./LightLook";

// A frame's lights: everything that gives one off is offered where it's drawn, with its look's
// flicker and pulse on its strength, and the LightBudget picks which few are drawn, into a
// LightTarget (GameWebGLRenderer). Only drawn, so a sim never sees any of it: a frame goes begin,
// offer as many as there are, end.

// What draws them: GameWebGLRenderer, or a test's stand-in
export type LightTarget = {
    setAmbient(level: number, color: number): void;
    beginLights(x: number, y: number): void;
    addLight(x: number, z: number, radius: number, r: number, g: number, b: number): void;
    endLights(): void;
};

// Where a lit map's glowing scenery stands (RegionData.glowLocs): loc id, x, y in world tiles
export type GlowLocs = Float32Array;
export const GLOW_LOC_STRIDE = 3;

export class DrawnLights {
    private readonly color = new Float32Array(3);
    // The clock flicker and pulse go by, and this frame's step of it
    private seconds = 0;
    private deltaSeconds = 0;

    constructor(readonly budget: LightBudget) {}

    // A new scene: every light faded out at once
    reset(): void {
        this.budget.reset();
    }

    // A frame's start: how bright what's out of every light is (0 to 1) and its tint (0xRRGGBB)
    begin(target: LightTarget, ambient: number, ambientColor: number, deltaSeconds: number): void {
        this.seconds += deltaSeconds;
        this.deltaSeconds = deltaSeconds;
        target.setAmbient(ambient, ambientColor);
        this.budget.begin();
    }

    // One light: key says which it is from frame to frame (lightKey), radius is how far it reaches
    // now (its look's, unless it grows or shrinks), first puts it before every other (the shown
    // player's own), and strength is a share of its look's
    offer(
        key: number,
        x: number,
        y: number,
        radius: number,
        look: LightLook,
        first = false,
        strength = 1,
    ): void {
        const color = this.color;
        lightColor(look, color);
        const s = strength * this.waver(look, key);
        this.budget.add(key, x, y, radius, color[0] * s, color[1] * s, color[2] * s, first);
    }

    // A map's glowing scenery, each by its loc id's look (looks), keyed by kind (lightKey) and its
    // place in glowLocs
    offerGlowLocs(
        glowLocs: GlowLocs,
        looks: Readonly<Record<number, LightLook>>,
        kind: number,
    ): void {
        for (let i = 0; i < glowLocs.length; i += GLOW_LOC_STRIDE) {
            const look = looks[glowLocs[i]];
            if (look) {
                this.offer(lightKey(kind, i), glowLocs[i + 1], glowLocs[i + 2], look.radius, look);
            }
        }
    }

    // The frame's end: the budget's pick drawn, the view's middle at viewX, viewY (world tiles)
    end(target: LightTarget, viewX: number, viewY: number): void {
        target.beginLights(viewX, viewY);
        this.budget.end(viewX, viewY, this.deltaSeconds, (x, y, radius, r, g, b) => {
            target.addLight(x, y, radius, r, g, b);
        });
        target.endLights();
    }

    // How much of its strength a light has now, with its flicker and pulse: a few sines out of
    // step, each light its own way (by its key), so fires don't flicker as one
    private waver(look: LightLook, key: number): number {
        let s = 1;
        const t = this.seconds;
        const flicker = look.flicker;
        if (flicker) {
            const k = (key % 997) * 0.37;
            const n =
                0.5 +
                0.25 * Math.sin(t * 9.1 + k) +
                0.15 * Math.sin(t * 17.3 + k * 2.1) +
                0.1 * Math.sin(t * 31.7 + k * 3.3);
            s *= 1 - flicker * n;
        }
        const pulse = look.pulse;
        if (pulse) {
            s *= 1 - pulse.amount * (0.5 + 0.5 * Math.sin((t * Math.PI * 2) / pulse.seconds));
        }
        return s;
    }
}
