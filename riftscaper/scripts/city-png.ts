// Draws the city from above as a PNG, built as the game builds it, with who stands where marked
// (shopkeepers yellow, the folk green, guards and wardens red, wizards blue, the Archmage and the
// portal purple, the spawn white) and what the hero can walk to lit.
//
//   bun run tsx riftscaper/scripts/city-png.ts out.png [scale=6] [crop=x0,y0,x1,y1, in arena tiles]
import fs from "fs";
import { ArenaGrid } from "../../engine/world/ArenaGrid";
import { MAP_SQUARE_SIZE } from "../../engine/scaperune/format";
import { MARGIN } from "../../engine/scaperune/mapBuild";
import { createBuildContext } from "../../engine/scaperune/squares";
import { getRecipeArena } from "../../engine/scaperune/recipe";
import { walkDistances } from "../src/sim/placement";
import { CITY_MAP_X, CITY_MAP_Y, buildCityGrid, cityPlan, cityRecipe } from "../src/world/cityGen";
import { getFactory, loadGameCache, loadRegion } from "./cacheUtil";
import { Mark, drawGrid } from "./mapImage";

const out = process.argv[2] ?? "city.png";
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.split("=")));
const scale = Number(args.scale ?? 6);
const cache = loadGameCache();
const factory = getFactory(cache);
const context = createBuildContext(factory.getMapFileLoader(), factory.getLocTypeLoader());
const grid = buildCityGrid(context);
const recipe = { ...cityRecipe(), build: () => grid };
const arena = getRecipeArena(recipe);
const region = loadRegion(cache, { baseX: arena.baseX, baseY: arena.baseY, sizeX: arena.sizeX, sizeY: arena.sizeY, plane: 0 }, recipe);
const arenaGrid = new ArenaGrid(region);
const { plan, spawn } = cityPlan();
const distance = walkDistances(arenaGrid, spawn.x, spawn.y);
const originX = CITY_MAP_X * MAP_SQUARE_SIZE;
const originY = CITY_MAP_Y * MAP_SQUARE_SIZE;
const toGrid = (p: { x: number; y: number }) => ({ x: p.x - originX, y: p.y - originY });
const colour = { shop: 0xffd040, folk: 0x40e060, guard: 0xe03030, wizard: 0x4080ff, archmage: 0xc040ff, banker: 0xffd040, captain: 0xff8000, ally: 0xffffff } as const;
const marks: Mark[] = [
    ...plan.people.map((p) => ({ ...toGrid(p), color: colour[p.kind], radius: 0.6 })),
    { ...toGrid(plan.portal), color: 0xc040ff, radius: 2, ring: true },
    ...(plan.orrery ? [{ ...toGrid(plan.orrery), color: 0x40ffff, radius: 1.5, ring: true }] : []),
    { ...toGrid(spawn), color: 0xffffff, radius: 1 },
];
const ARENA = MARGIN * MAP_SQUARE_SIZE;
const lit = (x: number, y: number) => {
    const ax = x - ARENA;
    const ay = y - ARENA;
    if (ax < 0 || ay < 0 || ax >= arenaGrid.sizeX || ay >= arenaGrid.sizeY) {
        return false;
    }
    return distance[ax + ay * arenaGrid.sizeX] >= 0;
};
const crop = args.crop ? args.crop.split(",").map(Number) : [0, 0, arena.sizeX - 1, arena.sizeY - 1];
fs.writeFileSync(out, drawGrid(grid, context, cache, { scale, x0: crop[0] + ARENA, y0: crop[1] + ARENA, x1: crop[2] + ARENA, y1: crop[3] + ARENA, marks, lit }));
console.log(`${out}: ${arena.sizeX} by ${arena.sizeY} tiles`);
