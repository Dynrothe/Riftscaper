import { describe, expect, test } from "vitest";

import { Rng } from "../core/Rng";
import { DrawnLights, LightTarget } from "../render/DrawnLights";
import { LightBudget } from "../render/LightBudget";
import { ArenaFloor } from "./ArenaFloor";
import {
    DEFAULT_FLOOR_SKIN,
    getFloorLidKey,
    getFloorPieceKey,
    getFloorRequests,
    getFloorSkinKey,
    getFloorSpotAnims,
} from "./floorBakes";
import { TYPE_PILLAR } from "./floorLayout";
import { offerFloorLights } from "./floorLights";
import { floorGrid, lintFloor } from "./floorLint";
import { beat, dropRows, holes, side } from "./patterns";
import type { FloorDef } from "./types";

// A floor on its own, with nothing of a game's: 9 by 11 tiles, its numbers made up, at a sim's
// 50 ticks a second. Run Escape's own floor tests (src/game/core/) play its Wardens' floor in a run.

const BASE = 100;
const SIZE_X = 9;
const SIZE_Y = 11;
const RECT = { x0: BASE, y0: BASE, x1: BASE + SIZE_X - 1, y1: BASE + SIZE_Y - 1 };
const MIDDLE_X = Math.floor(SIZE_X / 2);
const T = 50;

function floorOf(more: Partial<FloorDef> = {}): FloorDef {
    return {
        rect: RECT,
        slam: { warn: 1, hurt: [0.04, 0.28], damage: 0.2, grace: 0.6, spotAnim: 10, sound: 1 },
        drop: { warn: 2, damage: 0.1, shove: 0.25, spotAnim: 11, fall: 1, keepRows: 3, sound: 2 },
        script: [],
        loopSeconds: 1000,
        ...more,
    };
}

function play(def: FloorDef, seconds: number, seed = 7) {
    const grid = floorGrid(def);
    const floor = new ArenaFloor(def, grid, new Rng(seed), T);
    const player = { x: RECT.x0 + MIDDLE_X + 0.5, y: RECT.y0 + 5.5 };
    const rose: number[] = [];
    const fell: number[] = [];
    for (let tick = 0; tick <= seconds * T; tick++) {
        const step = floor.step(tick, () => player);
        rose.push(...step.rose);
        fell.push(...step.fell);
    }
    return { grid, floor, rose, fell };
}

describe("a floor", () => {
    test("a slam down the east half rises row by row from the front, warned first", () => {
        const def = floorOf({ script: [beat(1, side("east", 0.1))] });
        // Each tile's rise is set as the pattern starts
        const { floor } = play(def, 1);
        for (let y = 0; y < SIZE_Y; y++) {
            for (let x = 0; x < SIZE_X; x++) {
                const i = x + y * SIZE_X;
                if (x < MIDDLE_X) {
                    expect(floor.riseAt[i]).toBe(-1);
                } else {
                    // Started at 1 s, warned 1 s, a row each 0.1 s from the north
                    expect(floor.riseAt[i]).toBe(2 * T + (SIZE_Y - 1 - y) * 5);
                    expect(floor.warnAt[i]).toBe(floor.riseAt[i] - T);
                }
            }
        }
        // and step says which rose as they do, in world tiles, the front row first
        const { rose } = play(def, 4);
        expect(rose.length / 2).toBe((SIZE_X - MIDDLE_X) * SIZE_Y);
        expect(rose.slice(0, 2)).toEqual([RECT.x0 + MIDDLE_X, RECT.y1]);
    });

    test("rows fall away from the back, and the grid's tiles go with them", () => {
        const { grid, fell } = play(floorOf({ script: [beat(1, dropRows(2, 0.1))] }), 5);
        for (let x = 0; x < SIZE_X; x++) {
            expect(grid.isDropped(RECT.x0 + x, RECT.y0)).toBe(true);
            expect(grid.isDropped(RECT.x0 + x, RECT.y0 + 1)).toBe(true);
            expect(grid.isDropped(RECT.x0 + x, RECT.y0 + 2)).toBe(false);
        }
        expect(fell.length / 2).toBe(2 * SIZE_X);
    });

    test("fallen tiles come back with a restore", () => {
        const { grid } = play(
            floorOf({
                script: [beat(1, dropRows(2, 0.1)), beat(5, { kind: "restore", rowSeconds: 0.1 })],
            }),
            9,
        );
        expect(grid.isDropped(RECT.x0, RECT.y0)).toBe(false);
    });

    test("plays the same every time from the same seed", () => {
        const def = floorOf({ script: [beat(1, holes(4))] });
        const a = play(def, 5);
        const b = play(def, 5);
        expect(a.fell.length).toBeGreaterThan(0);
        expect(a.fell).toEqual(b.fell);
        expect([...a.floor.dropAt]).toEqual([...b.floor.dropAt]);
    });

    test("is laid out from its ascii map and tiles rules, and the grid knows it", () => {
        const ascii = Array.from({ length: SIZE_Y }, (_, row) =>
            row === SIZE_Y - 2 ? "#.p" + "#".repeat(SIZE_X - 3) : "#".repeat(SIZE_X),
        );
        const def = floorOf({
            ascii,
            tiles: [{ where: { kind: "chars", chars: "p" }, type: "pillar" }],
        });
        const { grid, floor } = play(def, 0);
        // The north row first: the second row of the map is floor tile row 1
        expect(floor.layout.mask[1 + SIZE_X]).toBe(0);
        expect(floor.layout.type[2 + SIZE_X]).toBe(TYPE_PILLAR);
        expect(floor.hasPillars).toBe(true);
        expect(floor.isPillarTile(RECT.x0 + 2, RECT.y0 + 1)).toBe(true);
        // No floor is the pit's from the start, and a pillar blocks the way
        expect(grid.isDropped(RECT.x0 + 1, RECT.y0 + 1)).toBe(true);
        expect(grid.isSolid(RECT.x0 + 2, RECT.y0 + 1)).toBe(true);
        expect(grid.isSolid(RECT.x0 + 3, RECT.y0 + 1)).toBe(false);
    });
});

describe("its checks", () => {
    const start = { x: MIDDLE_X, y: 5 };

    test("a whole floor passes, and one in two pieces doesn't", () => {
        expect(lintFloor(floorOf(), start).warnings).toEqual([]);
        const split = floorOf({
            ascii: Array.from({ length: SIZE_Y }, (_, row) =>
                row === 2 ? ".".repeat(SIZE_X) : "#".repeat(SIZE_X),
            ),
        });
        expect(lintFloor(split, start).warnings.some((w) => w.includes("2 pieces"))).toBe(true);
    });

    test("notes a skin that isn't one of the game's presets", () => {
        const def = floorOf({ skins: [{ loc: 1234 }] });
        expect(lintFloor(def, start).notes.some((n) => n.includes("isn't a preset"))).toBe(true);
        const known = lintFloor(def, start, { presets: [{ loc: 1234 }] });
        expect(known.notes).toEqual([]);
    });

    test("counts the room it's in towards a phone's triangles", () => {
        const plain = lintFloor(floorOf(), start);
        const empty = lintFloor(floorOf(), start, { room: 0 });
        expect(plain.triangles.rest - empty.triangles.rest).toBe(25000);
    });
});

describe("what it's drawn with", () => {
    test("a floor with no skins bakes its slab's top, and what's under it", () => {
        const def = floorOf({ under: { pillar: 20, beam: 21, wall: 22 } });
        const keys = getFloorRequests(def).map((request) => request.key);
        expect(keys).toEqual([
            getFloorPieceKey(20),
            getFloorPieceKey(21),
            getFloorPieceKey(22),
            getFloorLidKey(DEFAULT_FLOOR_SKIN(def)),
        ]);
    });

    test("each skin is baked whole and as its top", () => {
        const skin = { loc: 30, recolor: [[1, 2]] as [number, number][] };
        const requests = getFloorRequests(floorOf({ skins: [skin] }));
        expect(requests.map((request) => request.key)).toEqual([
            getFloorSkinKey(skin),
            getFloorLidKey(skin),
        ]);
        expect(requests.map((request) => request.kind === "model" && request.topOnly)).toEqual([
            false,
            true,
        ]);
    });

    test("its lava glows, tile by tile, and nothing else does", () => {
        const def = floorOf({
            tiles: [{ where: { kind: "rect", x0: 2, y0: 3, x1: 3, y1: 3 }, effect: "burn" }],
        });
        const { floor } = play(def, 0);
        const drawn: number[][] = [];
        const target: LightTarget = {
            setAmbient() {},
            beginLights() {
                drawn.length = 0;
            },
            addLight: (x, y, radius, r, g, b) => drawn.push([x, y, radius, r, g, b]),
            endLights() {},
        };
        const lights = new DrawnLights(new LightBudget(8));
        const looks = { burn: { radius: 2, color: 0xff0000 }, heal: { radius: 2 } };
        for (let i = 0; i < 10; i++) {
            lights.begin(target, 0.2, 0xffffff, 0.05);
            offerFloorLights(lights, floor, 0, RECT.x0 + 4, RECT.y0 + 4, looks, 9);
            lights.end(target, RECT.x0 + 4, RECT.y0 + 4);
        }
        expect(drawn.map(([x, y]) => [x, y]).sort()).toEqual([
            [RECT.x0 + 2.5, RECT.y0 + 3.5],
            [RECT.x0 + 3.5, RECT.y0 + 3.5],
        ]);
        expect(drawn[0].slice(2)).toEqual([2, 1, 0, 0]);
    });

    test("every spot animation it throws up is listed once", () => {
        const def = floorOf({
            effects: { dust: 12, fallDust: 13, rock: 12 },
            skins: [
                {
                    loc: 30,
                    material: { crack: { spotAnim: 14 } },
                    idle: { spotAnim: 15, every: 2 },
                },
            ],
        });
        expect(getFloorSpotAnims(def).sort((a, b) => a - b)).toEqual([10, 11, 12, 13, 14, 15]);
    });
});
