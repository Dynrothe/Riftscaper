// Prints a rift's plan: its nodes in world tiles, the route first, for looking round it in the game
//
//   bun run tsx riftscaper/scripts/layout-nodes.ts depth=1 seed=5 [kind=trail]
import { getGeneratedArena, getGeneratedSize } from "../../engine/scaperune/generator";
import { MAP_SQUARE_SIZE } from "../../engine/scaperune/format";
import { createRng } from "../../engine/scaperune/noise";
import { LayoutKind, planLayout } from "../src/world/riftLayout";
import { EDGES } from "../src/world/riftShape";
import { RIFT_MAP_X, RIFT_MAP_Y, plannedKind, riftSettings } from "../src/world/zoneGen";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const depth = Number(args.depth ?? 1);
const seed = Number(args.seed ?? 1);
const base = riftSettings(depth, seed);
const kind = (args.kind ?? plannedKind(depth, seed)) as LayoutKind;
const { sizeX, sizeY } = getGeneratedSize(base);
const corner = Math.floor(createRng(seed + 777)() * 4) % 4;
const layout = planLayout({ kind, seed, sizeX, sizeY, arena: getGeneratedArena(base), corner, deep: EDGES[base.biome].deep });
const ox = RIFT_MAP_X * MAP_SQUARE_SIZE;
const oy = RIFT_MAP_Y * MAP_SQUARE_SIZE;
const show = (i: number) => {
    const n = layout.nodes[i];
    return `${i} ${n.role} r${n.r.toFixed(0)} at ${Math.round(ox + n.x)},${Math.round(oy + n.y)}`;
};
console.log(`${base.biome} ${kind}, route:`);
layout.route.forEach((i) => console.log("  " + show(i)));
console.log("others:");
layout.nodes.forEach((_, i) => !layout.route.includes(i) && console.log("  " + show(i)));
