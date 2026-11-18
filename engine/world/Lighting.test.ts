import { describe, expect, test } from "vitest";

import { AmbientFade, isInLight } from "./Lighting";

describe("what a sim knows of light", () => {
    test("a spot's in a light out to its edge, and within its grace past it", () => {
        const lights = [{ x: 10, y: 10, radius: 2 }];
        expect(isInLight(lights, 12, 10)).toBe(true);
        expect(isInLight(lights, 12.4, 10)).toBe(false);
        expect(isInLight(lights, 12.4, 10, 0.5)).toBe(true);
        expect(isInLight([], 10, 10, 0.5)).toBe(false);
    });

    test("the ambient fades from wherever it is, by the tick", () => {
        const fade = new AmbientFade(1);
        expect(fade.at(0)).toBe(1);
        fade.fadeTo(0.2, 100, 100);
        expect(fade.at(100)).toBe(1);
        expect(fade.at(150)).toBeCloseTo(0.6);
        expect(fade.at(250)).toBe(0.2);
        // Turned back halfway, from where it got to
        fade.fadeTo(1, 150, 50);
        expect(fade.at(150)).toBeCloseTo(0.6);
        expect(fade.at(200)).toBe(1);
        fade.reset(0.5);
        expect(fade.at(0)).toBe(0.5);
    });
});
