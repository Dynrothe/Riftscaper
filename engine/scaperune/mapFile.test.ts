import { describe, expect, it } from "vitest";

import { LEVELS, TileGrid, createTileGrid } from "./format";
import { MAP_FILE_FORMAT, MapFileInfo, cloneTileGrid, getMapPoints, mapFileRecipe, readMapFile, writeMapFile } from "./mapFile";
import { createRng } from "./noise";
import type { BuildContext } from "./recipe";

function info(overrides: Partial<MapFileInfo> = {}): MapFileInfo {
    return {
        name: "test",
        cache: "osrs-241_2026-09-30",
        squaresX: 2,
        squaresY: 3,
        margin: 0,
        spawn: { x: 10, y: 20 },
        points: [
            { name: "goblin 1", kind: "enemy", x: 30, y: 40 },
            { name: "chest", kind: "chest", x: 5, y: 6 },
        ],
        properties: { music: "Harmony", brightness: 0.8 },
        ...overrides,
    };
}

// Every field of every level filled with noise, with values past a byte where they can be
function noisyGrid(sizeX: number, sizeY: number): TileGrid {
    const grid = createTileGrid(sizeX, sizeY);
    const rng = createRng(7);
    const byte = () => Math.floor(rng() * 256);
    for (let level = 0; level < LEVELS; level++) {
        const tiles = grid.levels[level];
        tiles.heights.forEach((_, i) => (tiles.heights[i] = byte()));
        tiles.underlays.forEach((_, i) => (tiles.underlays[i] = Math.floor(rng() * 1200)));
        tiles.overlays.forEach((_, i) => (tiles.overlays[i] = Math.floor(rng() * 1200)));
        tiles.shapes.forEach((_, i) => (tiles.shapes[i] = Math.floor(rng() * 12)));
        tiles.rotations.forEach((_, i) => (tiles.rotations[i] = Math.floor(rng() * 4)));
        tiles.flags.forEach((_, i) => (tiles.flags[i] = Math.floor(rng() * 16)));
    }
    for (let i = 0; i < 500; i++) {
        grid.locs.push({
            id: Math.floor(rng() * 60000),
            type: [0, 10, 22][i % 3],
            rotation: i & 3,
            level: i % LEVELS,
            x: Math.floor(rng() * sizeX),
            y: Math.floor(rng() * sizeY),
        });
    }
    return grid;
}

// A JSON round trip, as a file on disk would take
function throughJson<T>(value: T): unknown {
    return JSON.parse(JSON.stringify(value));
}

describe("map files", () => {
    it("reads back exactly what was written", () => {
        const grid = noisyGrid(128, 192);
        const file = writeMapFile(grid, info());
        expect(file.format).toBe(MAP_FILE_FORMAT);
        const read = readMapFile(throughJson(file));
        expect(read.info).toEqual(info());
        expect(read.grid.sizeX).toBe(128);
        expect(read.grid.sizeY).toBe(192);
        for (let level = 0; level < LEVELS; level++) {
            expect(read.grid.levels[level]).toEqual(grid.levels[level]);
        }
        expect(read.grid.locs).toEqual(grid.locs);
    });

    it("is small for a plain map", () => {
        const grid = createTileGrid(256, 256);
        grid.levels[0].underlays.fill(49);
        const text = JSON.stringify(writeMapFile(grid, info({ squaresX: 4, squaresY: 4 })));
        expect(text.length).toBeLessThan(20_000);
    });

    it("refuses what isn't a map it can read", () => {
        const file = writeMapFile(createTileGrid(64, 64), info({ squaresX: 1, squaresY: 1, spawn: { x: 1, y: 1 }, points: [] }));
        expect(() => readMapFile("map")).toThrow(/JSON object/);
        expect(() => readMapFile({ ...file, format: "other" })).toThrow(/Not a ScapeRune map/);
        expect(() => readMapFile({ ...file, version: 99 })).toThrow(/version 99/);
        expect(() => readMapFile({ ...file, squaresX: 2 })).toThrow(/terrain is/);
        expect(() => readMapFile({ ...file, locs: [1, 2, 3] })).toThrow(/6 numbers/);
        expect(() => readMapFile({ ...file, locs: [1, 10, 0, 0, 64, 0] })).toThrow(/isn't one/);
        expect(() => readMapFile({ ...file, spawn: { x: -1, y: 0 } })).toThrow(/spawn/);
        expect(() => readMapFile({ ...file, margin: 1 })).toThrow(/nothing to play on/);
    });

    it("refuses to write a grid that doesn't match what it says", () => {
        expect(() => writeMapFile(createTileGrid(64, 64), info())).toThrow(/not 2 by 3/);
    });

    it("makes a recipe that builds a fresh copy each time, wherever it's put", () => {
        const grid = noisyGrid(128, 192);
        const file = throughJson(writeMapFile(grid, info({ margin: 0 })));
        const recipe = mapFileRecipe(file, { mapX: 80, mapY: 150 });
        expect(recipe.id).toBe("mapfile_test");
        expect([recipe.mapX, recipe.mapY, recipe.squaresX, recipe.squaresY]).toEqual([80, 150, 2, 3]);
        expect(recipe.spawn).toEqual({ x: 10, y: 20 });
        expect(recipe.points).toEqual([
            { name: "goblin 1", x: 30, y: 40 },
            { name: "chest", x: 5, y: 6 },
        ]);
        const context = {} as BuildContext;
        const a = recipe.build(context);
        a.levels[0].heights[0] = (a.levels[0].heights[0] + 1) & 0xff;
        a.locs.length = 0;
        const b = recipe.build(context);
        expect(b.levels[0]).toEqual(grid.levels[0]);
        expect(b.locs).toEqual(grid.locs);
        expect(() => mapFileRecipe(file, { mapX: 99, mapY: 150 })).toThrow(/don't fit/);
    });

    it("finds points by kind", () => {
        expect(getMapPoints(info(), "enemy").map((p) => p.name)).toEqual(["goblin 1"]);
    });

    it("clones grids deeply", () => {
        const grid = noisyGrid(64, 64);
        const copy = cloneTileGrid(grid);
        expect(copy).toEqual(grid);
        copy.levels[1].flags[3] ^= 1;
        copy.locs[0].x++;
        expect(copy.levels[1].flags[3]).not.toBe(grid.levels[1].flags[3]);
        expect(copy.locs[0].x).not.toBe(grid.locs[0].x);
    });
});
