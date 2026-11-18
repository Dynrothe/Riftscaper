// Draws a rift from above as a PNG, built as the game builds it, with where the game puts the
// camp, the packs, the guardian and what there is to find (and the Tombs' chambers), and what's
// reachable lit.
//
//   bun run tsx riftscaper/scripts/rift-map.ts out.png depth=1 seed=5 [shape=open] [pinnacle=heart] [scale=4] [whole=1] [crop=x0,y0,x1,y1]
//
// shape is the land's (zoneGen.ts's RiftShape): planned, as the game's are, a plan's kind (trail,
// loop, arms, isles, field), or open, as rifts were first made. pinnacle draws a pinnacle's rift
// (content/pinnacles.ts) rather than the depth's own. whole=1 draws the margin round the arena too; crop only that
// rectangle, in the grid's tiles (the world's less the rift's origin, 5888).
import fs from "fs";
import { Rng } from "../../engine/core/Rng";
import { ArenaGrid } from "../../engine/world/ArenaGrid";
import { MAP_SQUARE_SIZE } from "../../engine/scaperune/format";
import type { MapRecipe } from "../../engine/scaperune/recipe";
import { createBuildContext } from "../../engine/scaperune/squares";
import { PINNACLE_IDS, PinnacleId } from "../src/content/pinnacles";
import { PACK_AREA } from "../src/content/rules";
import { TOMBS } from "../src/content/tombs";
import { layOut, placeFeatures } from "../src/sim/placement";
import { RIFT_MAP_X, RIFT_MAP_Y, RiftShape, buildRiftGrid } from "../src/world/zoneGen";
import { getFactory, loadGameCache, loadRegion } from "./cacheUtil";
import { Mark, drawGrid } from "./mapImage";

const out = process.argv[2] ?? "rift.png";
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.split("=")));
const depth = Number(args.depth ?? 1);
const seed = Number(args.seed ?? 1);
const scale = Number(args.scale ?? 4);
const whole = args.whole === "1";
const shape = (args.shape ?? "planned") as RiftShape;
const pinnacle = args.pinnacle as PinnacleId | undefined;
if (pinnacle !== undefined && !PINNACLE_IDS.includes(pinnacle)) {
    console.error(`There's no pinnacle called ${pinnacle}. The pinnacles: ${PINNACLE_IDS.join(", ")}`);
    process.exit(1);
}

const cache = loadGameCache();
const factory = getFactory(cache);
const context = createBuildContext(factory.getMapFileLoader(), factory.getLocTypeLoader());
const started = performance.now();
const rift = buildRiftGrid(depth, seed, context, pinnacle, shape);
const built = performance.now() - started;
const { grid, arena } = rift;

// The game's own collision, to place things as the sim does
const recipe: MapRecipe = {
    id: `rift_map_${depth}_${seed}`,
    mapX: RIFT_MAP_X,
    mapY: RIFT_MAP_Y,
    squaresX: grid.sizeX / MAP_SQUARE_SIZE,
    squaresY: grid.sizeY / MAP_SQUARE_SIZE,
    margin: 1,
    spawn: rift.spawn,
    build: () => grid,
};
const originX = RIFT_MAP_X * MAP_SQUARE_SIZE;
const originY = RIFT_MAP_Y * MAP_SQUARE_SIZE;
const region = loadRegion(
    cache,
    { baseX: originX + arena.x0, baseY: originY + arena.y0, sizeX: arena.x1 - arena.x0 + 1, sizeY: arena.y1 - arena.y0 + 1, plane: 0 },
    recipe,
);
const arenaGrid = new ArenaGrid(region);
const spawn = { x: originX + rift.spawn.x + 0.5, y: originY + rift.spawn.y + 0.5 };
const guardian = rift.guardian ? { x: originX + rift.guardian.x, y: originY + rift.guardian.y } : undefined;
const layout = layOut(arenaGrid, spawn, new Rng(seed), 1, { area: shape === "open" ? PACK_AREA.open : PACK_AREA.planned, guardian });
const sites = rift.sites.map((s) => ({ x: originX + s.x, y: originY + s.y }));
const nooks = rift.nooks.map((s) => ({ x: originX + s.x, y: originY + s.y }));
const features = placeFeatures(arenaGrid, layout, new Rng(seed ^ 0x0fea7e5), sites, { chests: 3, shrines: 2, hoard: true }, nooks);
const toGrid = (s: { x: number; y: number }) => ({ x: s.x - originX, y: s.y - originY });
const marks: Mark[] = [
    ...layout.packs.map((p) => ({ ...toGrid(p), color: 0xd03020, radius: 1.6 })),
    ...features.chests.map((p) => ({ ...toGrid(p), color: 0xffd040, radius: 1.3 })),
    ...features.shrines.map((p) => ({ ...toGrid(p), color: 0x40c0ff, radius: 1.6 })),
    ...(features.hoard ? [{ ...toGrid(features.hoard), color: 0xff8000, radius: 2.2 }] : []),
    ...rift.sites.map((p) => ({ ...p, color: 0xffffff, radius: 3, ring: true })),
    // A nexus's chambers (the Tombs'), ringed as far in as the hero walks to raise their rooms
    ...(rift.rooms ?? []).map((c) => ({ x: c.x, y: c.y, color: 0xe0c070, radius: c.r * TOMBS.enter, ring: true })),
    { ...toGrid(layout.boss), color: 0xff00ff, radius: 3 },
    { ...toGrid(layout.spawn), color: 0x00ff60, radius: 3 },
];
const lit = (x: number, y: number) => {
    const ax = x - arena.x0;
    const ay = y - arena.y0;
    if (ax < 0 || ay < 0 || ax >= arenaGrid.sizeX || ay >= arenaGrid.sizeY) {
        return false;
    }
    return layout.distance[ax + ay * arenaGrid.sizeX] >= 0;
};
const cropped = args.crop ? args.crop.split(",").map(Number) : undefined;
const rect = cropped
    ? { x0: cropped[0], y0: cropped[1], x1: cropped[2], y1: cropped[3] }
    : whole
      ? { x0: 0, y0: 0, x1: grid.sizeX - 1, y1: grid.sizeY - 1 }
      : arena;
fs.writeFileSync(out, drawGrid(grid, context, cache, { scale, ...rect, marks, lit }));
const far = layout.distance[Math.floor(layout.exit.x) - originX - arena.x0 + (Math.floor(layout.exit.y) - originY - arena.y0) * arenaGrid.sizeX];
const area = (arena.x1 - arena.x0 + 1) * (arena.y1 - arena.y0 + 1);
console.log(
    `${out}: depth ${depth} seed ${seed} ${shape} built in ${Math.round(built)} ms; ${layout.reachable} of ${area} tiles reachable ` +
        `(${Math.round((layout.reachable / area) * 100)}%), guardian ${far} tiles' walk away, ${layout.packs.length} packs`,
);
