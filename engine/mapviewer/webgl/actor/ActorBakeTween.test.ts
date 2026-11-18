import { describe, expect, test } from "vitest";

import type { Model } from "../../../rs/model/Model";
import { tweenFrames } from "./ActorBakeLoader";

// A posed copy of a one-vertex model, at x
function pose(x: number): Model {
    return { verticesCount: 1, verticesX: new Int32Array([x]), verticesY: new Int32Array([0]), verticesZ: new Int32Array([0]) } as unknown as Model;
}

describe("smoothing an animation's keyframes", () => {
    test("bakes them as they are without it", () => {
        const frames = tweenFrames([pose(0), pose(100)], [4, 4], false, 0);
        expect(frames.map((f) => f.length)).toEqual([4, 4]);
    });

    test("cuts a frame held longer than the step into poses moved on towards the next, the same length in all", () => {
        const frames = tweenFrames([pose(0), pose(100)], [4, 5], false, 2);
        expect(frames.map((f) => f.model!.verticesX[0])).toEqual([0, 50, 100]);
        expect(frames.reduce((n, f) => n + f.length, 0)).toBe(9);
        // The last of one that doesn't loop holds as it is
        expect(frames[2].length).toBe(5);
    });

    test("moves a looping animation's last frame on towards its first", () => {
        const frames = tweenFrames([pose(0), pose(100)], [2, 4], true, 2);
        expect(frames.map((f) => f.model!.verticesX[0])).toEqual([0, 100, 50]);
    });

    test("leaves a frame alone whose next has other vertices", () => {
        const odd = { ...pose(100), verticesCount: 2, verticesX: new Int32Array([100, 0]) } as unknown as Model;
        expect(tweenFrames([pose(0), odd], [8, 4], false, 2)).toHaveLength(2);
    });
});
