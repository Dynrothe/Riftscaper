// A rift's plan (riftLayout.ts) laid on the land: ScapeRune's generator makes the ground in the
// zone's biome with everything that isn't walked kept off the map, so its sites, set pieces and
// ruins land on the lanes and arenas, and the sea it's handed is what falls away (water, lava,
// the void). Then what rises is raised: cliffs whose faces look south at the camera, high to the
// north of the lanes and low to the south, so they never hide the ground; or a forest packed
// tight on level ground. Everything closed is blocked, and its edge dressed, so there's never an
// invisible wall. docs/rift-maps.md has the reasons.
import { Ground } from "../../../engine/scaperune/Ground";
import { BIOMES, BiomeDef, BiomeId } from "../../../engine/scaperune/biomes";
import { blockTile, findReachable, findStranded, getCollisionFlags } from "../../../engine/scaperune/collision";
import { dressRock, paintRockFloor } from "../../../engine/scaperune/dress";
import { TILE_BLOCKED } from "../../../engine/scaperune/format";
import type { PlacedLoc, TileGrid } from "../../../engine/scaperune/format";
import { GeneratedMap, GeneratorSettings, generateMapDetail, getGeneratedArena } from "../../../engine/scaperune/generator";
import { LOC_FLOOR_DECORATION, LOC_NORMAL, getTouchedTiles } from "../../../engine/scaperune/mapBuild";
import { addPathToField } from "../../../engine/scaperune/paths";
import { createNoise, createRng, distanceTo, smoothField } from "../../../engine/scaperune/noise";
import type { BuildContext } from "../../../engine/scaperune/recipe";
import { LayoutKind, RiftLayout, routeLanes } from "./riftLayout";

// How a biome's rifts are walled: what rises round the lanes, how high, and what falls away
export type EdgeStyle = {
    rise: "forest" | "cliff";
    // A cliff's height north of a lane, in height units (16 a tile): it faces the camera. South of
    // one it's a share of that, as it's behind the camera, and east or west another.
    height: number;
    south: number;
    side: number;
    // Which of the closed ground falls away (riftLayout.ts's LayoutRequest)
    deep: "none" | "all" | "heart" | "pools";
    // The plans its rifts are drawn from, by the seed
    kinds: LayoutKind[];
    // The road's overlay, where the biome's own won't do
    road?: number;
};

const CLIFF = { rise: "cliff" as const, height: 56, south: 0.45, side: 0.7 };
const FOREST = { rise: "forest" as const, height: 0, south: 0, side: 0 };

// The fields are the Diablo II wilderness's (the meadows, the snow, the desert), the isles its
// Great Marsh's, the arms its Arcane Sanctuary's, out over the void. The darkwood biome's road is
// an older floor, a bright blood red on its ground: its rifts have the Darkwood's own paths' (by
// Vampyrium, 2560,7744 on), dark and worn
export const EDGES: Record<BiomeId, EdgeStyle> = {
    meadow: { ...FOREST, deep: "pools", kinds: ["field", "trail", "loop"] },
    darkwood: { ...FOREST, deep: "none", kinds: ["trail", "field", "loop"], road: 634 },
    swamp: { ...FOREST, deep: "all", kinds: ["isles", "field", "loop"] },
    deadlands: { ...CLIFF, deep: "none", kinds: ["trail", "arms", "field"] },
    snow: { ...CLIFF, deep: "pools", kinds: ["field", "trail", "loop"] },
    ash: { ...CLIFF, deep: "pools", kinds: ["isles", "loop", "trail"] },
    desert: { ...CLIFF, height: 48, deep: "none", kinds: ["field", "trail", "loop"] },
    astral: { ...CLIFF, deep: "all", kinds: ["isles", "arms", "loop"] },
    jungle: { ...FOREST, deep: "pools", kinds: ["trail", "isles", "field"] },
    tropical: { ...FOREST, deep: "all", kinds: ["isles", "loop"] },
    autumn: { ...FOREST, deep: "pools", kinds: ["field", "trail", "loop"] },
    elven: { ...FOREST, deep: "pools", kinds: ["loop", "trail", "field"] },
    fairy: { ...FOREST, deep: "heart", kinds: ["loop", "trail", "arms"] },
};

// A cliff's face takes this many tiles to rise
const FACE = 3;
// A forest's edge: a tile in this many of the lanes almost always has a tree if there's room,
// so the edge reads as a wall from the play camera; then packed to FOREST_DEPTH, and thinner past
// it, where it's out of sight
const FOREST_EDGE = 5;
const FOREST_EDGE_SHARE = 0.95;
const FOREST_DEPTH = 13;
const FOREST_SHUFFLE = 4;
const FOREST_NEAR = 0.7;
const FOREST_FAR = 0.3;
// Of the open ground at a forest's edge, this share has something soft growing on it
const FRINGE = 0.14;
// The road's half-width in tiles, rolling between the two, and how much further the ground under
// it reaches (the engine's roads' TRAIL_MARGIN)
const ROAD: [number, number] = [0.9, 1.6];
const ROAD_TRAIL = 0.8;
// How hard the road keeps off the walls, the water and the landmarks: a step's cost is 1 and this
// over the tiles to the nearest of them, so it keeps to the middle of a lane and goes round a
// ruin; how far it looks for them; and how many of its tiles are averaged to smooth it
const ROAD_HUG = 6;
const ROAD_CLEAR = 12;
const ROAD_SMOOTH = 4;
// How much dearer or cheaper the ground's made here and there, so the road wanders a little
// across open ground rather than going straight as a ruler
const ROAD_WIGGLE = 0.35;

export type ShapedRift = {
    grid: TileGrid;
    detail: GeneratedMap;
    // Open tiles the generator's land left cut off, blocked here
    stranded: number;
};

// The layout's open ground as the generator's spawn settings: the camp's middle, exactly
export function spawnFor(settings: Pick<GeneratorSettings, "squaresX" | "squaresY">, x: number, y: number): { spawnX: number; spawnY: number } {
    const arena = getGeneratedArena(settings);
    const inset = (lo: number, hi: number) => Math.min(14, (hi - lo) >> 1);
    const at = (v: number, lo: number, hi: number) => (Math.round(v) - lo - inset(lo, hi)) / (hi - lo - inset(lo, hi) * 2);
    return { spawnX: at(x, arena.x0, arena.x1), spawnY: at(y, arena.y0, arena.y1) };
}

// A mask of tiles as a field per corner, as Ground.paintOverlay makes one: a corner's share of
// set tiles less 0.4, smoothed once; and never above KEEP_DRY at a corner of open ground, so the
// sea doesn't creep onto a lane and narrow it, or cut a causeway
const KEEP_DRY = -0.2;

function maskField(mask: Uint8Array, open: Uint8Array, sizeX: number, sizeY: number): Float32Array {
    const cornersX = sizeX + 1;
    const field = new Float32Array(cornersX * (sizeY + 1));
    for (let y = 0; y <= sizeY; y++) {
        for (let x = 0; x <= sizeX; x++) {
            let count = 0;
            for (const [tx, ty] of [
                [x - 1, y - 1],
                [x, y - 1],
                [x - 1, y],
                [x, y],
            ]) {
                if (tx >= 0 && ty >= 0 && tx < sizeX && ty < sizeY && mask[tx + ty * sizeX]) {
                    count++;
                }
            }
            field[x + y * cornersX] = count / 4 - 0.4;
        }
    }
    const smooth = smoothField(field, cornersX, sizeY + 1, 1);
    for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
            if (open[x + y * sizeX]) {
                for (const c of [x + y * cornersX, x + 1 + y * cornersX, x + (y + 1) * cornersX, x + 1 + (y + 1) * cornersX]) {
                    smooth[c] = Math.min(smooth[c], KEEP_DRY);
                }
            }
        }
    }
    return smooth;
}

function toGround(grid: TileGrid): Ground {
    const ground = new Ground(grid.sizeX, grid.sizeY);
    grid.levels.forEach((level, i) => {
        const to = ground.grid.levels[i];
        to.heights.set(level.heights);
        to.underlays.set(level.underlays);
        to.overlays.set(level.overlays);
        to.shapes.set(level.shapes);
        to.rotations.set(level.rotations);
        to.flags.set(level.flags);
    });
    ground.grid.locs = grid.locs.slice();
    return ground;
}

// The tiles a loc stands on
function footprint(loc: PlacedLoc, context: BuildContext, each: (x: number, y: number) => void): void {
    if (loc.type < 9 || loc.type === 22) {
        each(loc.x, loc.y);
        return;
    }
    const info = context.locs(loc.id);
    const turned = loc.rotation & 1;
    const sx = turned ? info.sizeY : info.sizeX;
    const sy = turned ? info.sizeX : info.sizeY;
    for (let dy = 0; dy < sy; dy++) {
        for (let dx = 0; dx < sx; dx++) {
            each(loc.x + dx, loc.y + dy);
        }
    }
}

// For each tile, the open tile nearest it, by a flood out from all of them (-1 past `limit`)
function nearestOpen(open: Uint8Array, sizeX: number, sizeY: number, limit: number): Int32Array {
    const source = new Int32Array(open.length).fill(-1);
    const steps = new Int32Array(open.length).fill(-1);
    const queue = new Int32Array(open.length);
    let head = 0;
    let tail = 0;
    for (let i = 0; i < open.length; i++) {
        if (open[i]) {
            source[i] = i;
            steps[i] = 0;
            queue[tail++] = i;
        }
    }
    while (head < tail) {
        const i = queue[head++];
        if (steps[i] >= limit) {
            continue;
        }
        const x = i % sizeX;
        const y = (i / sizeX) | 0;
        for (const [nx, ny] of [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
        ]) {
            if (nx >= 0 && ny >= 0 && nx < sizeX && ny < sizeY) {
                const j = nx + ny * sizeX;
                if (source[j] < 0) {
                    source[j] = source[i];
                    steps[j] = steps[i] + 1;
                    queue[tail++] = j;
                }
            }
        }
    }
    return source;
}

export function shapeRift(layout: RiftLayout, settings: GeneratorSettings, context: BuildContext, edge: EdgeStyle): ShapedRift {
    const { sizeX, sizeY, open, deep } = layout;
    const biome: BiomeDef = BIOMES[settings.biome];
    const offMap = new Uint8Array(open.length);
    for (let i = 0; i < open.length; i++) {
        offMap[i] = open[i] ? 0 : 1;
    }
    const detail = generateMapDetail(settings, context, { sea: maskField(deep, open, sizeX, sizeY), fords: false, offMap });
    const ground = toGround(detail.grid);
    const level0 = ground.level0;
    const water = (i: number) => ground.isWaterTile(i % sizeX, (i / sizeX) | 0);
    // What rises: closed, and not water
    const high = new Uint8Array(open.length);
    for (let i = 0; i < open.length; i++) {
        high[i] = !open[i] && !water(i) ? 1 : 0;
    }
    const toOpen = distanceTo(open, sizeX, sizeY, 64);
    const rng = createRng(settings.seed + 0x5a9e);

    // Clear what'll be cliff or forest of what's standing there: on a cliff's face everything,
    // dressing too, and in a forest whatever's solid, which the forest replaces
    const face = new Uint8Array(open.length);
    for (let i = 0; i < open.length; i++) {
        face[i] = high[i] && toOpen[i] <= FACE + 1 ? 1 : 0;
    }
    ground.grid.locs = ground.grid.locs.filter((loc) => {
        if (loc.level !== 0) {
            return true;
        }
        let keep = true;
        footprint(loc, context, (x, y) => {
            if (x < 0 || y < 0 || x >= sizeX || y >= sizeY) {
                return;
            }
            const i = x + y * sizeX;
            if (!high[i]) {
                return;
            }
            if (edge.rise === "cliff" ? face[i] : loc.type !== LOC_FLOOR_DECORATION) {
                keep = false;
            }
        });
        return keep;
    });

    paintRoad(ground, layout, context, biome, edge.road ?? biome.road, water, detail, settings.seed);

    if (edge.rise === "cliff") {
        raiseCliffs(ground, layout, high, toOpen, edge, settings.seed);
        const rock = new Uint8Array(open.length);
        for (let i = 0; i < open.length; i++) {
            if (face[i]) {
                rock[i] = 1;
                level0.underlays[i] = biome.rock.ground;
            }
        }
        for (let i = 0; i < open.length; i++) {
            if (high[i]) {
                level0.flags[i] |= TILE_BLOCKED;
            }
        }
        const skip = new Uint8Array(open.length);
        for (let i = 0; i < open.length; i++) {
            skip[i] = open[i] || water(i) ? 1 : 0;
        }
        paintRockFloor(ground, rock, biome.rock.overlay, skip);
        dressRock(ground, rock, { kitAt: () => biome.rock, seed: settings.seed + 0x70c, share: 1 });
    } else {
        for (let i = 0; i < open.length; i++) {
            if (high[i]) {
                level0.flags[i] |= TILE_BLOCKED;
            }
        }
        plantForest(ground, context, biome, open, high, toOpen, rng);
    }

    // Whatever the land's left cut off from the camp is closed too
    const arena = getGeneratedArena(settings);
    const flags = getCollisionFlags(ground.grid, context.locs);
    const spawn = { x: Math.round(layout.nodes[layout.camp].x), y: Math.round(layout.nodes[layout.camp].y) };
    const reached = findReachable(flags, sizeX, sizeY, arena, spawn.x, spawn.y);
    const stranded = findStranded(flags, sizeX, arena, reached);
    for (const i of stranded) {
        blockTile(ground.grid, i);
    }
    return { grid: ground.grid, detail, stranded: stranded.length };
}

// The way from the camp to the guardian worn into the ground, as Diablo II's dirt roads are: laid
// once the land's built, from arena to arena along the route, down the middle of the lanes and
// round the landmarks; and painted as the engine paints its own (roads.ts), the biome's road on
// top with its edges cut on the slant and the ground for under a road beneath and a little past
// it. The scatter that stood on it is cleared.
function paintRoad(ground: Ground, layout: RiftLayout, context: BuildContext, biome: BiomeDef, overlay: number, water: (i: number) => boolean, detail: GeneratedMap, seed: number): void {
    const { sizeX, sizeY, open } = layout;
    const level0 = ground.level0;
    const skip = new Uint8Array(open.length);
    for (let i = 0; i < open.length; i++) {
        skip[i] = !open[i] || water(i) ? 1 : 0;
    }
    for (const piece of detail.landmarks) {
        for (let y = piece.y - 1; y <= piece.y + piece.sizeY; y++) {
            for (let x = piece.x - 1; x <= piece.x + piece.sizeX; x++) {
                if (x >= 0 && y >= 0 && x < sizeX && y < sizeY) {
                    skip[x + y * sizeX] = 1;
                }
            }
        }
    }
    const path = findRoad(layout, skip, seed);
    if (path.length < 2) {
        return;
    }
    const cornersX = sizeX + 1;
    const cornersY = sizeY + 1;
    const width = createNoise(seed + 0x70ad, 2);
    const half = (k: number) => ROAD[0] + (ROAD[1] - ROAD[0]) * width(path[k].x / 12, path[k].y / 12);
    const field = new Float32Array(cornersX * cornersY).fill(-4);
    const under = new Float32Array(cornersX * cornersY).fill(-4);
    addPathToField(field, cornersX, cornersY, path, half);
    addPathToField(under, cornersX, cornersY, path, (k) => half(k) + ROAD_TRAIL);
    const road = getTouchedTiles(under, sizeX, sizeY);
    for (let i = 0; i < road.length; i++) {
        if (skip[i]) {
            road[i] = 0;
        } else if (road[i]) {
            level0.underlays[i] = biome.trail;
        }
    }
    ground.paintField(smoothField(field, cornersX, cornersY, 1), overlay, false, skip);
    const scatter = new Set<number>([...biome.trees.map(([id]) => id), ...biome.rocks.map(([id]) => id), ...biome.props.map(([id]) => id), ...biome.flowers]);
    ground.grid.locs = ground.grid.locs.filter((loc) => {
        if (loc.level !== 0 || !scatter.has(loc.id)) {
            return true;
        }
        let onRoad = false;
        footprint(loc, context, (x, y) => {
            if (x >= 0 && y >= 0 && x < sizeX && y < sizeY && road[x + y * sizeX]) {
                onRoad = true;
            }
        });
        return !onRoad;
    });
}

// The road's way, in corners: from each arena on the route to the next, the cheapest walk over
// what isn't skipped, a step dearer the nearer the walls, then smoothed
function findRoad(layout: RiftLayout, skip: Uint8Array, seed: number): { x: number; y: number }[] {
    const { sizeX, sizeY, nodes, route } = layout;
    const clear = distanceTo(skip, sizeX, sizeY, ROAD_CLEAR);
    if (route.length < 2) {
        return [];
    }
    const wiggle = createNoise(seed + 0x70ae, 2);
    const cost = new Float32Array(skip.length);
    for (let i = 0; i < skip.length; i++) {
        cost[i] = (1 + ROAD_HUG / (clear[i] + 0.5)) * (1 - ROAD_WIGGLE + 2 * ROAD_WIGGLE * wiggle((i % sizeX) / 16, ((i / sizeX) | 0) / 16));
    }
    // The free tile nearest a node's middle, a landmark standing on it maybe
    const freeNear = (x: number, y: number): number => {
        let best = -1;
        let bestD = Infinity;
        for (let r = 0; r <= 12 && best < 0; r++) {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    const tx = Math.floor(x) + dx;
                    const ty = Math.floor(y) + dy;
                    const i = tx + ty * sizeX;
                    const d = dx * dx + dy * dy;
                    if (tx >= 0 && ty >= 0 && tx < sizeX && ty < sizeY && !skip[i] && d < bestD) {
                        best = i;
                        bestD = d;
                    }
                }
            }
        }
        return best;
    };
    // A field's road makes for the guardian over the open ground, bent once by the way's middle;
    // elsewhere it goes by every arena on the route
    const stops = layout.kind === "field" ? [route[0], route[route.length >> 1], route[route.length - 1]] : route;
    const tiles: number[] = [];
    let from = freeNear(nodes[stops[0]].x, nodes[stops[0]].y);
    for (let k = 1; k < stops.length && from >= 0; k++) {
        const to = freeNear(nodes[stops[k]].x, nodes[stops[k]].y);
        if (to < 0) {
            break;
        }
        const leg = cheapestWalk(skip, cost, sizeX, sizeY, from, to);
        if (leg.length === 0) {
            break;
        }
        tiles.push(...(tiles.length > 0 ? leg.slice(1) : leg));
        from = to;
    }
    const raw = tiles.map((i) => ({ x: (i % sizeX) + 0.5, y: ((i / sizeX) | 0) + 0.5 }));
    return raw.map((_, k) => {
        let x = 0;
        let y = 0;
        let n = 0;
        for (let j = Math.max(0, k - ROAD_SMOOTH); j <= Math.min(raw.length - 1, k + ROAD_SMOOTH); j++) {
            x += raw[j].x;
            y += raw[j].y;
            n++;
        }
        return { x: x / n, y: y / n };
    });
}

// Dijkstra's over the tiles, eight ways, a step's cost the tile's it steps onto (a diagonal's
// the more by root 2), not over a skipped tile or between two: the tiles from one to the other
function cheapestWalk(skip: Uint8Array, cost: Float32Array, sizeX: number, sizeY: number, from: number, to: number): number[] {
    const best = new Float32Array(skip.length).fill(Infinity);
    const came = new Int32Array(skip.length).fill(-1);
    // A binary heap of [cost, tile]
    const heapCost: number[] = [];
    const heapTile: number[] = [];
    const push = (c: number, t: number) => {
        let k = heapCost.length;
        heapCost.push(c);
        heapTile.push(t);
        while (k > 0) {
            const p = (k - 1) >> 1;
            if (heapCost[p] <= heapCost[k]) {
                break;
            }
            [heapCost[p], heapCost[k]] = [heapCost[k], heapCost[p]];
            [heapTile[p], heapTile[k]] = [heapTile[k], heapTile[p]];
            k = p;
        }
    };
    const pop = (): number => {
        const top = heapTile[0];
        const lastCost = heapCost.pop()!;
        const lastTile = heapTile.pop()!;
        if (heapCost.length > 0) {
            heapCost[0] = lastCost;
            heapTile[0] = lastTile;
            let k = 0;
            for (;;) {
                const l = k * 2 + 1;
                const r = l + 1;
                let m = k;
                if (l < heapCost.length && heapCost[l] < heapCost[m]) {
                    m = l;
                }
                if (r < heapCost.length && heapCost[r] < heapCost[m]) {
                    m = r;
                }
                if (m === k) {
                    break;
                }
                [heapCost[m], heapCost[k]] = [heapCost[k], heapCost[m]];
                [heapTile[m], heapTile[k]] = [heapTile[k], heapTile[m]];
                k = m;
            }
        }
        return top;
    };
    best[from] = 0;
    push(0, from);
    const done = new Uint8Array(skip.length);
    while (heapCost.length > 0) {
        const i = pop();
        if (done[i]) {
            continue;
        }
        done[i] = 1;
        if (i === to) {
            break;
        }
        const x = i % sizeX;
        const y = (i / sizeX) | 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if ((dx === 0 && dy === 0) || nx < 0 || ny < 0 || nx >= sizeX || ny >= sizeY) {
                    continue;
                }
                const j = nx + ny * sizeX;
                if (skip[j] || (dx !== 0 && dy !== 0 && (skip[x + dx + y * sizeX] || skip[x + (y + dy) * sizeX]))) {
                    continue;
                }
                const c = best[i] + cost[j] * (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
                if (c < best[j]) {
                    best[j] = c;
                    came[j] = i;
                    push(c, j);
                }
            }
        }
    }
    if (best[to] === Infinity) {
        return [];
    }
    const out: number[] = [];
    for (let i = to; i >= 0; i = came[i]) {
        out.push(i);
    }
    return out.reverse();
}

// Raises what rises round the lanes into cliffs: a face of FACE tiles from each lane's edge, then
// high ground on top, rolling a little. The open ground and the water keep their heights.
function raiseCliffs(ground: Ground, layout: RiftLayout, high: Uint8Array, toOpen: Float32Array, edge: EdgeStyle, seed: number): void {
    const { sizeX, sizeY, open } = layout;
    // How high each tile wants to be, by which side of its nearest lane it's on
    const source = nearestOpen(open, sizeX, sizeY, 80);
    const share = new Float32Array(open.length);
    for (let i = 0; i < open.length; i++) {
        if (!high[i]) {
            continue;
        }
        const s = source[i];
        if (s < 0) {
            share[i] = edge.side;
            continue;
        }
        const dx = (i % sizeX) - (s % sizeX);
        const dy = ((i / sizeX) | 0) - ((s / sizeX) | 0);
        share[i] = dy > Math.abs(dx) ? 1 : -dy > Math.abs(dx) ? edge.south : edge.side;
    }
    const smooth = smoothField(share, sizeX, sizeY, 4);
    const roll = createNoise(seed + 0x7e11, 2);
    const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
    for (let y = 1; y < sizeY; y++) {
        for (let x = 1; x < sizeX; x++) {
            const around = [x - 1 + (y - 1) * sizeX, x + (y - 1) * sizeX, x - 1 + y * sizeX, x + y * sizeX];
            // A corner of open ground or water stays put
            if (around.some((i) => !high[i])) {
                continue;
            }
            let d = Infinity;
            let want = 0;
            for (const i of around) {
                d = Math.min(d, toOpen[i]);
                want += smooth[i] / 4;
            }
            const rise = edge.height * want * ease((d - 0.5) / FACE) + (d > FACE ? (roll(x / 14, y / 14) - 0.5) * 14 : 0);
            ground.setHeight(x, y, ground.getHeight(x, y) + Math.max(0, rise));
        }
    }
}

// A forest packed tight along the lanes, its biggest trees first, thinning further in, and soft
// growth on the open ground at its edge so the line isn't drawn with a ruler
function plantForest(
    ground: Ground,
    context: BuildContext,
    biome: BiomeDef,
    open: Uint8Array,
    high: Uint8Array,
    toOpen: Float32Array,
    rng: () => number,
): void {
    const { sizeX, sizeY } = ground;
    const taken = new Uint8Array(open.length);
    for (const loc of ground.grid.locs) {
        if (loc.level === 0 && loc.type !== LOC_FLOOR_DECORATION && (loc.type <= 3 || context.locs(loc.id).clipType > 0)) {
            footprint(loc, context, (x, y) => {
                if (x >= 0 && y >= 0 && x < sizeX && y < sizeY) {
                    taken[x + y * sizeX] = 1;
                }
            });
        }
    }
    // A list's size for a loc isn't always all of it
    const trees = biome.trees
        .map(([id, size]): [number, number] => [id, Math.max(size, context.locs(id).sizeX, context.locs(id).sizeY)])
        .sort((a, b) => b[1] - a[1]);
    const order: number[] = [];
    for (let i = 0; i < open.length; i++) {
        if (high[i]) {
            order.push(i);
        }
    }
    // Nearest the lanes first, but shuffled a few tiles' worth, or the trees stand in rows along
    // the edge like an orchard's
    const key = new Float32Array(open.length);
    for (const i of order) {
        key[i] = toOpen[i] + rng() * FOREST_SHUFFLE;
    }
    order.sort((a, b) => key[a] - key[b]);
    const fits = (x: number, y: number, size: number) => {
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx < 1 || ty < 1 || tx >= sizeX - 2 || ty >= sizeY - 2) {
                    return false;
                }
                const j = tx + ty * sizeX;
                if (!high[j] || taken[j]) {
                    return false;
                }
            }
        }
        return true;
    };
    for (const i of order) {
        const x = i % sizeX;
        const y = (i / sizeX) | 0;
        const share = toOpen[i] <= FOREST_EDGE ? FOREST_EDGE_SHARE : toOpen[i] <= FOREST_DEPTH ? FOREST_NEAR : FOREST_FAR;
        if (taken[i] || rng() > share) {
            continue;
        }
        for (const [id, size] of trees) {
            if (fits(x, y, size)) {
                ground.grid.locs.push({ id, type: LOC_NORMAL, rotation: Math.floor(rng() * 4), level: 0, x, y });
                for (let dy = 0; dy < size; dy++) {
                    for (let dx = 0; dx < size; dx++) {
                        taken[x + dx + (y + dy) * sizeX] = 1;
                    }
                }
                break;
            }
        }
    }
    // Soft growth along the edge, on open ground that's free
    for (let y = 1; y < sizeY - 1; y++) {
        for (let x = 1; x < sizeX - 1; x++) {
            const i = x + y * sizeX;
            if (!open[i] || taken[i] || biome.flowers.length === 0) {
                continue;
            }
            const byForest = high[i - 1] || high[i + 1] || high[i - sizeX] || high[i + sizeX];
            if (byForest && rng() < FRINGE) {
                const id = biome.flowers[Math.floor(rng() * biome.flowers.length)];
                if (context.locs(id).clipType === 0) {
                    ground.grid.locs.push({ id, type: LOC_NORMAL, rotation: Math.floor(rng() * 4), level: 0, x, y });
                    taken[i] = 1;
                }
            }
        }
    }
}
