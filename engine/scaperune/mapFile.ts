// A map as a file: what the map maker (mapmaker/) saves, and what any game on the engine loads.
// It's the tile grid itself (every level's floors, flags and heights, and every loc) with where the
// player starts and the points a game puts things on, and nothing about where in the world it goes:
// a game picks free map squares for it when it loads it (mapFileRecipe), so two games can use the
// same map on different squares.
//
// The file is JSON. The terrain is one blob, deflated and in base 64, of each level in turn:
//
//   heights    (sizeX + 1) * (sizeY + 1) bytes, corners, x + y * (sizeX + 1)
//   underlays  sizeX * sizeY 16-bit numbers, little-endian, as the map files store them (cache id + 1)
//   overlays   the same
//   shapes     sizeX * sizeY bytes
//   rotations  sizeX * sizeY bytes
//   flags      sizeX * sizeY bytes
//
// Locs are numbers, six to a loc: id, type, rotation, level, x, y. Everything is in grid tiles,
// from the grid's south-west corner, x east and y north, as a recipe's are.
import pako from "pako";

import { LEVELS, MAP_SQUARE_SIZE, PlacedLoc, TileGrid, createTileGrid } from "./format";
import type { MapPoint, MapRecipe } from "./recipe";

export const MAP_FILE_FORMAT = "scaperune-map";
// Bump only with a reader for the old version beside the new one: maps out there stay readable
export const MAP_FILE_VERSION = 1;

// A tile the game puts something on. kind is the game's own word for what (an enemy's spawn, a
// chest, an exit), and name tells two of a kind apart.
export type MapFilePoint = MapPoint & { kind?: string };

// What a map says about itself
export type MapFileInfo = {
    name: string;
    // The cache its loc and floor ids are from: another cache can number them differently
    cache: string;
    // Map squares, margin and all, and how many squares of the edge are scenery the game keeps
    // the player out of
    squaresX: number;
    squaresY: number;
    margin: number;
    // Where the player starts, in grid tiles
    spawn: { x: number; y: number };
    points: MapFilePoint[];
    // Anything else of the game's own, as plain values: a brightness, the music, a name to show
    properties: Record<string, string | number | boolean>;
};

export type MapFile = MapFileInfo & {
    format: typeof MAP_FILE_FORMAT;
    version: number;
    terrain: string;
    locs: number[];
};

const LOC_FIELDS = 6;

// ---- Writing ----

export function writeMapFile(grid: TileGrid, info: MapFileInfo): MapFile {
    checkInfo(info, grid);
    const { sizeX, sizeY } = grid;
    const bytes = new Uint8Array(terrainSize(sizeX, sizeY));
    let at = 0;
    for (let level = 0; level < LEVELS; level++) {
        const tiles = grid.levels[level];
        bytes.set(tiles.heights, at);
        at += tiles.heights.length;
        for (const shorts of [tiles.underlays, tiles.overlays]) {
            for (let i = 0; i < shorts.length; i++) {
                bytes[at++] = shorts[i] & 0xff;
                bytes[at++] = shorts[i] >> 8;
            }
        }
        for (const field of [tiles.shapes, tiles.rotations, tiles.flags]) {
            bytes.set(field, at);
            at += field.length;
        }
    }
    const locs: number[] = [];
    for (const loc of grid.locs) {
        locs.push(loc.id, loc.type, loc.rotation, loc.level, loc.x, loc.y);
    }
    return {
        format: MAP_FILE_FORMAT,
        version: MAP_FILE_VERSION,
        name: info.name,
        cache: info.cache,
        squaresX: info.squaresX,
        squaresY: info.squaresY,
        margin: info.margin,
        spawn: { x: info.spawn.x, y: info.spawn.y },
        points: info.points.map((p) => ({ ...p })),
        properties: { ...info.properties },
        terrain: toBase64(pako.deflate(bytes)),
        locs,
    };
}

// ---- Reading ----

// Reads a map file (as parsed JSON), and throws with what's wrong if it isn't one this can read
export function readMapFile(data: unknown): { grid: TileGrid; info: MapFileInfo } {
    if (typeof data !== "object" || data === null) {
        throw new Error("A map file is a JSON object");
    }
    const file = data as Partial<MapFile>;
    if (file.format !== MAP_FILE_FORMAT) {
        throw new Error(`Not a ScapeRune map (its format is ${JSON.stringify(file.format)})`);
    }
    if (file.version !== MAP_FILE_VERSION) {
        throw new Error(`A map of version ${file.version}: this reads version ${MAP_FILE_VERSION}`);
    }
    const info: MapFileInfo = {
        name: String(file.name ?? ""),
        cache: String(file.cache ?? ""),
        squaresX: Number(file.squaresX),
        squaresY: Number(file.squaresY),
        margin: Number(file.margin ?? 0),
        spawn: { x: Number(file.spawn?.x), y: Number(file.spawn?.y) },
        points: Array.isArray(file.points) ? file.points.map(readPoint) : [],
        properties: readProperties(file.properties),
    };
    const sizeX = info.squaresX * MAP_SQUARE_SIZE;
    const sizeY = info.squaresY * MAP_SQUARE_SIZE;
    const grid = createTileGrid(sizeX, sizeY);
    checkInfo(info, grid);

    if (typeof file.terrain !== "string") {
        throw new Error("The map has no terrain");
    }
    const bytes = pako.inflate(fromBase64(file.terrain));
    if (bytes.length !== terrainSize(sizeX, sizeY)) {
        throw new Error(`The terrain is ${bytes.length} bytes, not ${terrainSize(sizeX, sizeY)}`);
    }
    let at = 0;
    for (let level = 0; level < LEVELS; level++) {
        const tiles = grid.levels[level];
        tiles.heights.set(bytes.subarray(at, at + tiles.heights.length));
        at += tiles.heights.length;
        for (const shorts of [tiles.underlays, tiles.overlays]) {
            for (let i = 0; i < shorts.length; i++) {
                shorts[i] = bytes[at] | (bytes[at + 1] << 8);
                at += 2;
            }
        }
        for (const field of [tiles.shapes, tiles.rotations, tiles.flags]) {
            field.set(bytes.subarray(at, at + field.length));
            at += field.length;
        }
    }

    const locs = file.locs;
    if (!Array.isArray(locs) || locs.length % LOC_FIELDS !== 0) {
        throw new Error(`The map's locs are ${LOC_FIELDS} numbers each`);
    }
    for (let i = 0; i < locs.length; i += LOC_FIELDS) {
        const [id, type, rotation, level, x, y] = locs.slice(i, i + LOC_FIELDS);
        const ok =
            [id, type, rotation, level, x, y].every(Number.isInteger) &&
            id >= 0 &&
            type >= 0 &&
            type <= 22 &&
            rotation >= 0 &&
            rotation <= 3 &&
            level >= 0 &&
            level < LEVELS &&
            x >= 0 &&
            y >= 0 &&
            x < sizeX &&
            y < sizeY;
        if (!ok) {
            throw new Error(`Loc ${i / LOC_FIELDS} isn't one: ${locs.slice(i, i + LOC_FIELDS).join(", ")}`);
        }
        grid.locs.push({ id, type, rotation, level, x, y });
    }
    return { grid, info };
}

// ---- Playing it ----

export type MapFileRecipeOptions = {
    // The recipe's id, which installRecipe installs once: the map's name when unset
    id?: string;
    // Map squares the cache doesn't have and nothing else of the game's uses (x 70-99, y 66-199
    // are empty in the cache; the scaperune guide says who has which)
    mapX: number;
    mapY: number;
};

// A recipe that builds the map, to install and play as any other (installRecipe). Each build is a
// copy, so a game that changes the map as it's played doesn't change the next build.
export function mapFileRecipe(file: MapFile | unknown, options: MapFileRecipeOptions): MapRecipe {
    const { grid, info } = readMapFile(file);
    const { mapX, mapY } = options;
    if (mapX < 0 || mapY < 0 || mapX + info.squaresX > 100 || mapY + info.squaresY > 200) {
        throw new Error(`The map's ${info.squaresX} by ${info.squaresY} squares don't fit at ${mapX},${mapY}`);
    }
    return {
        id: options.id ?? `mapfile_${info.name}`,
        mapX,
        mapY,
        squaresX: info.squaresX,
        squaresY: info.squaresY,
        margin: info.margin,
        spawn: { ...info.spawn },
        points: info.points.map(({ name, x, y, region }) => (region ? { name, x, y, region } : { name, x, y })),
        build: () => cloneTileGrid(grid),
    };
}

// The points of a kind, as a game asks for its enemies' spawns or its chests
export function getMapPoints(info: Pick<MapFileInfo, "points">, kind: string): MapFilePoint[] {
    return info.points.filter((p) => p.kind === kind);
}

export function cloneTileGrid(grid: TileGrid): TileGrid {
    return {
        sizeX: grid.sizeX,
        sizeY: grid.sizeY,
        levels: grid.levels.map((level) => ({
            heights: level.heights.slice(),
            underlays: level.underlays.slice(),
            overlays: level.overlays.slice(),
            shapes: level.shapes.slice(),
            rotations: level.rotations.slice(),
            flags: level.flags.slice(),
        })),
        locs: grid.locs.map((loc): PlacedLoc => ({ ...loc })),
    };
}

// ---- Pieces ----

function terrainSize(sizeX: number, sizeY: number): number {
    return LEVELS * ((sizeX + 1) * (sizeY + 1) + sizeX * sizeY * 7);
}

function checkInfo(info: MapFileInfo, grid: TileGrid): void {
    const { squaresX, squaresY, margin, spawn } = info;
    if (!Number.isInteger(squaresX) || !Number.isInteger(squaresY) || squaresX < 1 || squaresY < 1) {
        throw new Error(`A map is a whole number of squares, not ${squaresX} by ${squaresY}`);
    }
    if (grid.sizeX !== squaresX * MAP_SQUARE_SIZE || grid.sizeY !== squaresY * MAP_SQUARE_SIZE) {
        throw new Error(`The grid is ${grid.sizeX} by ${grid.sizeY}, not ${squaresX} by ${squaresY} squares`);
    }
    if (!Number.isInteger(margin) || margin < 0 || margin * 2 >= Math.min(squaresX, squaresY)) {
        throw new Error(`A margin of ${margin} leaves nothing to play on`);
    }
    const inGrid = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < grid.sizeX && y < grid.sizeY;
    if (!inGrid(spawn.x, spawn.y)) {
        throw new Error(`The spawn, ${spawn.x},${spawn.y}, is off the map`);
    }
    for (const p of info.points) {
        if (!inGrid(p.x, p.y)) {
            throw new Error(`The point ${p.name}, ${p.x},${p.y}, is off the map`);
        }
    }
}

function readPoint(data: unknown): MapFilePoint {
    const p = (data ?? {}) as Partial<MapFilePoint>;
    const point: MapFilePoint = { name: String(p.name ?? ""), x: Number(p.x), y: Number(p.y) };
    if (typeof p.kind === "string" && p.kind) {
        point.kind = p.kind;
    }
    if (typeof p.region === "string" && p.region) {
        point.region = p.region;
    }
    return point;
}

function readProperties(data: unknown): MapFileInfo["properties"] {
    const out: MapFileInfo["properties"] = {};
    if (typeof data === "object" && data !== null) {
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                out[key] = value;
            }
        }
    }
    return out;
}

function toBase64(bytes: Uint8Array): string {
    let text = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        text += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(text);
}

function fromBase64(text: string): Uint8Array {
    const raw = atob(text);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
}
