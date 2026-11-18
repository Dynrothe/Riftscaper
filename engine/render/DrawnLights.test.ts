import { describe, expect, test } from "vitest";

import { DrawnLights, LightTarget } from "./DrawnLights";
import { LightBudget, lightKey } from "./LightBudget";
import { WARM_LIGHT, lightColor } from "./LightLook";

type Drawn = { x: number; y: number; radius: number; r: number; g: number; b: number };

class Target implements LightTarget {
    ambient: number[] = [];
    lights: Drawn[] = [];
    setAmbient(level: number, color: number): void {
        this.ambient = [level, color];
    }
    beginLights(): void {
        this.lights = [];
    }
    addLight(x: number, y: number, radius: number, r: number, g: number, b: number): void {
        this.lights.push({ x, y, radius, r, g, b });
    }
    endLights(): void {}
}

// Frames of a light offered by offer, long enough for it to have faded all the way in
function frames(offer: (lights: DrawnLights) => void, count = 10) {
    const lights = new DrawnLights(new LightBudget(4));
    const target = new Target();
    for (let i = 0; i < count; i++) {
        lights.begin(target, 0.3, 0x8080ff, 0.05);
        offer(lights);
        lights.end(target, 0, 0);
    }
    return target;
}

describe("a light's look", () => {
    test("is its colour times its intensity, warm when it doesn't say", () => {
        const out = [0, 0, 0];
        lightColor({ radius: 1, color: 0xff8000, intensity: 0.5 }, out);
        expect(out).toEqual([0.5, (0x80 / 255) * 0.5, 0]);
        lightColor({ radius: 1 }, out);
        const warm = [0, 0, 0];
        lightColor({ radius: 1, color: WARM_LIGHT }, warm);
        expect(out).toEqual(warm);
    });
});

describe("DrawnLights", () => {
    test("sets the ambient, and draws what's offered in its colour", () => {
        const target = frames((lights) => {
            lights.offer(lightKey(1, 0), 3, 4, 2, { radius: 2, color: 0xff0000 });
        });
        expect(target.ambient).toEqual([0.3, 0x8080ff]);
        expect(target.lights).toEqual([{ x: 3, y: 4, radius: 2, r: 1, g: 0, b: 0 }]);
    });

    test("a share of its strength, and a flicker that wavers", () => {
        const half = frames((lights) => {
            lights.offer(lightKey(1, 0), 0, 0, 2, { radius: 2, color: 0xffffff }, false, 0.5);
        });
        expect(half.lights[0].g).toBeCloseTo(0.5);
        const seen = new Set<number>();
        for (let n = 10; n < 20; n++) {
            const fire = frames((lights) => {
                lights.offer(lightKey(1, 0), 0, 0, 2, { radius: 2, flicker: 0.5 });
            }, n);
            seen.add(fire.lights[0].r);
            expect(fire.lights[0].r).toBeLessThanOrEqual(1);
        }
        expect(seen.size).toBeGreaterThan(1);
    });

    test("glowing scenery by its loc's look", () => {
        const target = frames((lights) => {
            const glowLocs = new Float32Array([5, 1, 1, 6, 2, 3]);
            lights.offerGlowLocs(glowLocs, { 6: { radius: 3, color: 0x00ff00 } }, 2);
        });
        expect(target.lights).toEqual([{ x: 2, y: 3, radius: 3, r: 0, g: 1, b: 0 }]);
    });
});
