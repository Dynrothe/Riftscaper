// A rift's land, from its depth and seed: ScapeRune's generator in the zone's biome, three map
// squares a side, laid on a plan of lanes and arenas (riftLayout.ts, riftShape.ts) with the camp in
// one corner and the guardian at the far end. No towns, since nobody lives in a rift; ruins and
// landmarks in the lanes, and a road from the camp to the guardian. The same depth and seed
// always make the same land.
import { MAP_SQUARE_SIZE, TILE_BLOCKED } from "../../../engine/scaperune/format";
import type { PlacedLoc, TileGrid } from "../../../engine/scaperune/format";
import {
    DEFAULT_SETTINGS,
    GeneratorSettings,
    generateMapDetail,
    getGeneratedArena,
    getGeneratedSize,
    getGeneratedSpawn,
    getSettingsError,
} from "../../../engine/scaperune/generator";
import { MARGIN } from "../../../engine/scaperune/mapBuild";
import { createRng } from "../../../engine/scaperune/noise";
import type { BuildContext, MapRecipe } from "../../../engine/scaperune/recipe";
import { buildRecipeSquares } from "../../../engine/scaperune/squares";
import type { CustomMapSquares } from "../../../engine/rs/map/CustomMapFileLoader";
import { PINNACLES, PinnacleId } from "../content/pinnacles";
import { PACK_AREA } from "../content/rules";
import { riftZone } from "../sim/ladder";
import { LayoutKind, RiftLayout, planLayout } from "./riftLayout";
import { EDGES, shapeRift, spawnFor } from "./riftShape";

// Map squares the cache doesn't have and nothing else here uses (scripts/free-squares.ts): x 92 to
// 96, y 92 to 96, the arena and a square of margin round it
export const RIFT_MAP_X = 92;
export const RIFT_MAP_Y = 92;
export const RIFT_SQUARES = 3;

// The camp's things, by the spawn: a fire, a tent (2 by 3), a crate and barrels
const CAMPFIRE = 19881;
const TENT = 23061;
const CRATE = 357;
const BARREL = 362;

export type Rift = {
    depth: number;
    seed: number;
    // A pinnacle (content/pinnacles.ts), not the depth's own zone
    pinnacle?: PinnacleId;
    settings: GeneratorSettings;
    squares: CustomMapSquares;
    // The arena, in world tiles
    baseX: number;
    baseY: number;
    sizeX: number;
    sizeY: number;
    spawn: { x: number; y: number };
    // Where the campfire burns, for its light
    fire?: { x: number; y: number };
    // The middles of the generator's landmarks on land, in world tiles: where a guarded hoard
    // can stand (sim/placement.ts)
    sites: { x: number; y: number }[];
    // A planned rift's dead ends off its way, in world tiles: where its chests go first
    nooks: { x: number; y: number }[];
    // Reachable tiles a pack (content/rules.ts's PACK_AREA)
    packArea: number;
    // A planned rift's guardian's arena's middle, in world tiles: where the boss stands
    guardian?: { x: number; y: number };
    // A nexus's chambers (the Tombs' paths: riftLayout.ts), their middles and how far they reach,
    // in world tiles
    rooms?: Chamber[];
};

export type Chamber = { x: number; y: number; r: number };

// The four corners the camp can be in, the far end opposite
const CORNERS: [number, number][] = [
    [0.08, 0.08],
    [0.92, 0.08],
    [0.08, 0.92],
    [0.92, 0.92],
];

export function riftSettings(depth: number, seed: number, pinnacle?: PinnacleId): GeneratorSettings {
    const zone = riftZone(depth, seed, pinnacle);
    const roll = createRng(seed + 777);
    const [spawnX, spawnY] = CORNERS[Math.floor(roll() * CORNERS.length) % CORNERS.length];
    return {
        ...DEFAULT_SETTINGS,
        seed,
        squaresX: RIFT_SQUARES,
        squaresY: RIFT_SQUARES,
        biome: zone.biome,
        boundary: "forest",
        roads: 0,
        buildings: 0,
        towns: 0,
        sites: 0.6,
        ruins: 0.3,
        landmarks: 0.3,
        waymarkers: 0,
        props: 0.3,
        flowers: 0.4,
        spawnX,
        spawnY,
        ...zone.settings,
    };
}

function isOpen(grid: TileGrid, taken: Set<number>, x: number, y: number, sizeX: number, sizeY: number): boolean {
    for (let dy = -1; dy <= sizeY; dy++) {
        for (let dx = -1; dx <= sizeX; dx++) {
            const tx = x + dx;
            const ty = y + dy;
            if (tx < 0 || ty < 0 || tx >= grid.sizeX || ty >= grid.sizeY) {
                return false;
            }
            const i = tx + ty * grid.sizeX;
            if (taken.has(i) || grid.levels[0].flags[i] & TILE_BLOCKED) {
                return false;
            }
        }
    }
    return true;
}

// The camp round the spawn: a fire a few tiles off, a tent behind it, a crate and barrels.
// Only where there's room, so it never shuts anything in.
function pitchCamp(
    grid: TileGrid,
    context: BuildContext,
    spawn: { x: number; y: number },
    towardX: number,
    towardY: number,
): { x: number; y: number } | undefined {
    // What blocks is in the way; flowers and what's dressing the ground make room
    const blocks = (loc: PlacedLoc) => loc.type <= 3 || loc.type === 9 || (loc.type !== 22 && context.locs(loc.id).clipType > 0);
    const taken = new Set<number>();
    for (const loc of grid.locs) {
        if (loc.level === 0 && blocks(loc)) {
            const info = context.locs(loc.id);
            const turned = loc.rotation % 2 === 1;
            const sx = loc.type >= 9 ? (turned ? info.sizeY : info.sizeX) : 1;
            const sy = loc.type >= 9 ? (turned ? info.sizeX : info.sizeY) : 1;
            for (let dy = 0; dy < sy; dy++) {
                for (let dx = 0; dx < sx; dx++) {
                    taken.add(loc.x + dx + (loc.y + dy) * grid.sizeX);
                }
            }
        }
    }
    let fire: { x: number; y: number } | undefined;
    const put = (id: number, x: number, y: number, sizeX: number, sizeY = sizeX, rotation = 0): boolean => {
        if (!isOpen(grid, taken, x, y, sizeX, sizeY)) {
            return false;
        }
        // Anything soft under it goes
        grid.locs = grid.locs.filter((l) => l.level !== 0 || l.x < x || l.y < y || l.x >= x + sizeX || l.y >= y + sizeY);
        const loc: PlacedLoc = { id, type: 10, rotation, level: 0, x, y };
        grid.locs.push(loc);
        for (let dy = 0; dy < sizeY; dy++) {
            for (let dx = 0; dx < sizeX; dx++) {
                taken.add(x + dx + (y + dy) * grid.sizeX);
            }
        }
        return true;
    };
    // Away from where the land opens out: behind the spawn, towards its corner
    const bx = -Math.sign(towardX) || 1;
    const by = -Math.sign(towardY) || 1;
    if (put(CAMPFIRE, spawn.x + bx * 3, spawn.y + by * 1, 1)) {
        fire = { x: spawn.x + bx * 3 + 0.5, y: spawn.y + by + 0.5 };
    }
    put(TENT, spawn.x + bx * 4 - (bx < 0 ? 1 : 0), spawn.y + by * 4 - (by < 0 ? 2 : 0), 2, 3);
    put(CRATE, spawn.x - bx * 1, spawn.y + by * 4, 1);
    put(BARREL, spawn.x - bx * 2, spawn.y + by * 4, 1);
    put(BARREL, spawn.x + bx * 5, spawn.y - by * 1, 1);
    return fire;
}

// A rift's land as a grid, before it's squares: in grid tiles, for the game and the scripts
export type RiftGrid = {
    settings: GeneratorSettings;
    grid: TileGrid;
    arena: { x0: number; y0: number; x1: number; y1: number };
    spawn: { x: number; y: number };
    fire?: { x: number; y: number };
    sites: { x: number; y: number }[];
    // A planned rift's nooks' middles, its guardian's arena's, and a nexus's chambers
    nooks: { x: number; y: number }[];
    guardian?: { x: number; y: number };
    rooms?: Chamber[];
};

// How a rift's land is shaped: to a plan (riftLayout.ts) of lanes and arenas walled by cliffs,
// forest, water, lava or the void, "planned" for the kind the biome and seed pick or one of the
// plan's kinds; or open land corner to corner, as rifts were first made (to look at, in development)
export type RiftShape = "open" | "planned" | LayoutKind;

export function buildRiftGrid(depth: number, seed: number, context: BuildContext, pinnacle?: PinnacleId, shape: RiftShape = "planned"): RiftGrid {
    if (shape !== "open") {
        return buildPlannedRiftGrid(depth, seed, context, pinnacle, shape === "planned" ? undefined : shape);
    }
    const settings = riftSettings(depth, seed, pinnacle);
    const error = getSettingsError(settings);
    if (error) {
        throw new Error(error);
    }
    const detail = generateMapDetail(settings, context);
    const grid = detail.grid;
    const arena = getGeneratedArena(settings);
    const spawn = getGeneratedSpawn(settings);
    const middleX = (arena.x0 + arena.x1) / 2;
    const middleY = (arena.y0 + arena.y1) / 2;
    const fire = pitchCamp(grid, context, spawn, middleX - spawn.x, middleY - spawn.y);
    const sites = detail.landmarks.filter((l) => l.onLand).map((l) => ({ x: l.x + l.sizeX / 2, y: l.y + l.sizeY / 2 }));
    return { settings, grid, arena, spawn, fire, sites, nooks: [] };
}

// The kind of plan a rift's land is drawn to, by its biome and seed. A pinnacle with no packs on
// the way to its fight is laid out so the hero comes in beside it, or any kind would be a walk with
// nothing in it: one fought in waves (the Colosseum) is a pit, its sand just past the camp's gate,
// and one fought in rooms (the Tombs) a nexus, its chambers round the hall the hero comes in by
export function plannedKind(depth: number, seed: number, pinnacle?: PinnacleId): LayoutKind {
    if (pinnacle && PINNACLES[pinnacle].waves) {
        return "pit";
    }
    if (pinnacle && PINNACLES[pinnacle].rooms) {
        return "nexus";
    }
    const { kinds } = EDGES[riftSettings(depth, seed, pinnacle).biome];
    return kinds[Math.floor(createRng(seed + 991)() * kinds.length) % kinds.length];
}

// A planned rift's plan, from its depth and seed alone, without the cache: the land's laid on it
// below, and the balance bot plays on it as it is
export function riftPlan(depth: number, seed: number, pinnacle?: PinnacleId, kind?: LayoutKind) {
    const base = riftSettings(depth, seed, pinnacle);
    const edge = EDGES[base.biome];
    const { sizeX, sizeY } = getGeneratedSize(base);
    const arena = getGeneratedArena(base);
    // The camp's corner, as riftSettings rolls it
    const corner = Math.floor(createRng(seed + 777)() * CORNERS.length) % CORNERS.length;
    const layout = planLayout({ kind: kind ?? plannedKind(depth, seed, pinnacle), seed, sizeX, sizeY, arena, corner, deep: edge.deep });
    return { base, edge, arena, layout };
}

// A rift drawn to a plan: the plan first, from the seed, then the generator's land laid on it
export function buildPlannedRiftGrid(depth: number, seed: number, context: BuildContext, pinnacle?: PinnacleId, kind?: LayoutKind): RiftGrid & { layout: RiftLayout } {
    const { base, edge, arena, layout } = riftPlan(depth, seed, pinnacle, kind);
    const { sizeX } = layout;
    const camp = layout.nodes[layout.camp];
    const settings: GeneratorSettings = {
        ...base,
        ...spawnFor(base, camp.x, camp.y),
        // The plan's the shape of the land: nothing of the generator's own cuts it up
        boundary: "forest",
        boundaryDepth: 2,
        rivers: 0,
        lakes: 0,
        ponds: 0,
        mountains: 0,
        plateaus: 0,
        mesas: 0,
        canyons: 0,
        volcanoes: 0,
        cliffFalls: 0,
        caves: 0,
        hills: Math.min(base.hills, 0.3),
        // What's scattered on the lanes is cover, not a wood: the forest's round them
        trees: base.trees * 0.3,
        treeClumping: 0.85,
        rocks: base.rocks * 0.6,
        // Only the lanes and arenas take landmarks and ruins, a fraction of the land
        sites: 1,
        landmarks: Math.min(1, Math.max(base.landmarks, 0.4) * 2.2),
        ruins: Math.min(1, Math.max(base.ruins, 0.3) * 2),
        flowers: Math.max(base.flowers, 0.5),
    };
    const error = getSettingsError(settings);
    if (error) {
        throw new Error(error);
    }
    const shaped = shapeRift(layout, settings, context, edge);
    const grid = shaped.grid;
    const spawn = getGeneratedSpawn(settings);
    const next = layout.nodes[layout.route[1] ?? layout.guardian];
    const fire = pitchCamp(grid, context, spawn, next.x - spawn.x, next.y - spawn.y);
    const sites = shaped.detail.landmarks
        .filter((l) => l.onLand)
        .map((l) => ({ x: l.x + l.sizeX / 2, y: l.y + l.sizeY / 2 }))
        .filter((s) => layout.open[Math.floor(s.x) + Math.floor(s.y) * sizeX]);
    const nooks = layout.nodes.filter((n) => n.role === "nook").map((n) => ({ x: n.x, y: n.y }));
    const guardian = { x: layout.nodes[layout.guardian].x, y: layout.nodes[layout.guardian].y };
    const rooms = layout.rooms?.map((i) => ({ x: layout.nodes[i].x, y: layout.nodes[i].y, r: layout.nodes[i].r }));
    return { settings, grid, arena, spawn, fire, sites, nooks, guardian, rooms, layout };
}

// Builds a rift's land. A second or two, on the main thread.
export function generateRift(depth: number, seed: number, context: BuildContext, pinnacle?: PinnacleId, shape: RiftShape = "planned"): Rift {
    const { settings, grid, arena, spawn, fire, sites, nooks, guardian, rooms } = buildRiftGrid(depth, seed, context, pinnacle, shape);
    const squares = settings.squaresX + MARGIN * 2;
    const recipe: MapRecipe = {
        id: `riftscaper_${pinnacle ? `${pinnacle}_` : ""}${depth}_${seed}`,
        mapX: RIFT_MAP_X,
        mapY: RIFT_MAP_Y,
        squaresX: squares,
        squaresY: squares,
        margin: MARGIN,
        spawn,
        build: () => grid,
    };
    const originX = RIFT_MAP_X * MAP_SQUARE_SIZE;
    const originY = RIFT_MAP_Y * MAP_SQUARE_SIZE;
    return {
        depth,
        seed,
        pinnacle,
        settings,
        squares: buildRecipeSquares(recipe, context),
        baseX: originX + arena.x0,
        baseY: originY + arena.y0,
        sizeX: arena.x1 - arena.x0 + 1,
        sizeY: arena.y1 - arena.y0 + 1,
        spawn: { x: originX + spawn.x + 0.5, y: originY + spawn.y + 0.5 },
        fire: fire ? { x: originX + fire.x, y: originY + fire.y } : undefined,
        sites: sites.map((s) => ({ x: originX + s.x, y: originY + s.y })),
        nooks: nooks.map((s) => ({ x: originX + s.x, y: originY + s.y })),
        packArea: shape === "open" ? PACK_AREA.open : PACK_AREA.planned,
        guardian: guardian ? { x: originX + guardian.x, y: originY + guardian.y } : undefined,
        rooms: rooms?.map((c) => ({ x: originX + c.x, y: originY + c.y, r: c.r })),
    };
}
