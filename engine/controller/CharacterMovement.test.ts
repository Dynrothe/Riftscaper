import { describe, expect, test } from "vitest";

import { makeGrid } from "../world/testGrid";
import { MoveRules, moveCharacter, walkToward, yawFromVector } from "./CharacterMovement";

// Open ground from (100, 200), with a column of rock at x 106 (makeGrid's rock
// stands a little in from its tile's edges, so only which side matters)
const grid = makeGrid(Array(8).fill("......#."));
const rules: MoveRules = { radius: 0.35, speed: 0.1, frozen: false, held: false };
const body = () => ({ x: 103.5, y: 203.5, yaw: 0, facingX: 0, facingY: -1 });

describe("moveCharacter", () => {
    test("walks at its speed and faces the way it goes", () => {
        const walker = body();
        expect(moveCharacter(grid, walker, 1, 0, rules)).toBe(true);
        expect(walker.x).toBeCloseTo(103.6, 12);
        expect(walker.y).toBe(203.5);
        expect(walker.yaw).toBe(yawFromVector(1, 0));
        expect([walker.facingX, walker.facingY]).toEqual([1, 0]);
    });

    test("stops at what blocks it", () => {
        const walker = body();
        for (let i = 0; i < 100; i++) moveCharacter(grid, walker, 1, 0, rules);
        expect(walker.x).toBeGreaterThan(105.5);
        expect(walker.x).toBeLessThan(106);
        const x = walker.x;
        moveCharacter(grid, walker, 1, 0, rules);
        expect(walker.x).toBe(x);
    });

    test("frozen, it stands still, and held it still turns to what's pressed", () => {
        const frozen = body();
        expect(moveCharacter(grid, frozen, 0, 1, { ...rules, frozen: true })).toBe(false);
        expect([frozen.x, frozen.y, frozen.yaw]).toEqual([103.5, 203.5, 0]);
        const held = body();
        moveCharacter(grid, held, 0, 1, { ...rules, frozen: true, held: true });
        expect([held.x, held.y]).toEqual([103.5, 203.5]);
        expect(held.yaw).toBe(yawFromVector(0, 1));
    });

    test("steers through its matrix, keeps to its bounds and faces what it's told to", () => {
        const mirrored = body();
        moveCharacter(grid, mirrored, 1, 0, { ...rules, steer: [-1, 0, 0, 1] });
        expect(mirrored.x).toBeCloseTo(103.4, 12);
        const boxed = body();
        const bounds = { minX: 103, minY: 203, maxX: 104, maxY: 204 };
        for (let i = 0; i < 50; i++) moveCharacter(grid, boxed, 1, 1, { ...rules, bounds });
        expect([boxed.x, boxed.y]).toEqual([104 - rules.radius, 204 - rules.radius]);
        const watching = body();
        moveCharacter(grid, watching, 1, 0, {
            ...rules,
            frozen: true,
            faces: { x: 103.5, y: 199 },
        });
        expect(watching.yaw).toBe(yawFromVector(0, -1));
    });

    test("goes by the ground's pace, and on ice keeps its momentum", () => {
        const slow = body();
        moveCharacter(grid, slow, 1, 0, { ...rules, surface: { pace: 0.5 } });
        expect(slow.x).toBeCloseTo(103.55, 12);
        const glide = { x: 0.1, y: 0, grip: 0.1 };
        const sliding = body();
        moveCharacter(grid, sliding, 0, 0, { ...rules, surface: { pace: 1, glide } });
        expect(sliding.x).toBeCloseTo(103.59, 12);
        expect(glide.x).toBeCloseTo(0.09, 12);
    });
});

describe("walkToward", () => {
    test("follows to a stop short of its goal, and a ghost goes through walls", () => {
        const pet = { x: 101.5, y: 203.5, yaw: 0 };
        while (walkToward(grid, pet, 104.5, 203.5, 1, 0.2, 0.3));
        expect(pet.x).toBeCloseTo(103.5, 12);
        const blocked = { x: 105.5, y: 203.5, yaw: 0 };
        walkToward(grid, blocked, 107.5, 203.5, 0, 1, 0.3);
        expect(blocked.x).toBeLessThan(106);
        const ghost = { x: 105.5, y: 203.5, yaw: 0 };
        walkToward(grid, ghost, 107.5, 203.5, 0, 1, 0.3, true);
        expect(ghost.x).toBe(106.5);
    });
});
