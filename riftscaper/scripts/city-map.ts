// Builds the city as the game does and draws it as text, from the game's own collision: every
// tile walked to from the spawn, what blocks, and who stands where. It fails if anyone can't be
// talked to from ground the hero can reach, or the portal can't be walked to.
//
//   bun run tsx riftscaper/scripts/city-map.ts [x0 y0 x1 y1, in arena tiles]
import { ArenaGrid } from "../../engine/world/ArenaGrid";
import { HERO } from "../src/content/rules";
import { ORRERY } from "../src/content/orrery";
import { walkDistances } from "../src/sim/placement";
import { CITY_SQUARES, cityPlan, cityRecipe } from "../src/world/cityGen";
import { getRecipeArena } from "../../engine/scaperune/recipe";
import { MAP_SQUARE_SIZE } from "../../engine/scaperune/format";
import { loadGameCache, loadRegion } from "./cacheUtil";

const [ax0, ay0, ax1, ay1] = process.argv.length >= 6 ? process.argv.slice(2, 6).map(Number) : [0, 0, 127, 127];
const cache = loadGameCache();
const recipe = cityRecipe();
const arena = getRecipeArena(recipe);
const started = performance.now();
const region = loadRegion(cache, { baseX: arena.baseX, baseY: arena.baseY, sizeX: arena.sizeX, sizeY: arena.sizeY, plane: 0 }, recipe);
console.log(`Built in ${Math.round(performance.now() - started)} ms, ${CITY_SQUARES * MAP_SQUARE_SIZE} tiles a side`);
const grid = new ArenaGrid(region);
const { plan, spawn } = cityPlan();
const distance = walkDistances(grid, spawn.x, spawn.y);
const reached = (x: number, y: number) => {
    const tx = Math.floor(x) - grid.baseX;
    const ty = Math.floor(y) - grid.baseY;
    return tx >= 0 && ty >= 0 && tx < grid.sizeX && ty < grid.sizeY && distance[tx + ty * grid.sizeX] >= 0;
};

const marks = new Map<string, string>();
const mark = (x: number, y: number, c: string) => marks.set(`${Math.floor(x)},${Math.floor(y)}`, c);
mark(spawn.x, spawn.y, "@");
mark(plan.portal.x, plan.portal.y, "P");
if (plan.orrery) {
    mark(plan.orrery.x, plan.orrery.y, "O");
}
for (const p of plan.people) {
    mark(p.x, p.y, { shop: "K", archmage: "A", banker: "B", wizard: "W", guard: "G", folk: "F", ally: "V", captain: "M" }[p.kind]);
}

// With HEIGHTS=1, the ground's height instead, a character a tile: 0 the lowest, a step every 4
// units (half a tile is 8)
const heights = process.env.HEIGHTS === "1";
let lowest = Infinity;
for (let ay = ay0; ay <= ay1 && heights; ay++) {
    for (let ax = ax0; ax <= ax1; ax++) {
        lowest = Math.min(lowest, -grid.getHeight(arena.baseX + ax + 0.5, arena.baseY + ay + 0.5) / 8);
    }
}
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (let ay = ay1; ay >= ay0; ay--) {
    let line = `${String(ay).padStart(4)} `;
    for (let ax = ax0; ax <= ax1; ax++) {
        const x = arena.baseX + ax;
        const y = arena.baseY + ay;
        const m = marks.get(`${x},${y}`);
        if (heights) {
            const h = -grid.getHeight(x + 0.5, y + 0.5) / 8 - lowest;
            line += grid.isSolid(x, y) ? "#" : chars[Math.min(chars.length - 1, Math.round(h / 4))];
        } else if (m) {
            line += m;
        } else if (grid.isSolid(x, y)) {
            line += "#";
        } else if (grid.getFlags(x, y) !== 0) {
            line += reached(x, y) ? "+" : "=";
        } else {
            line += reached(x, y) ? "." : " ";
        }
    }
    console.log(line);
}
console.log(
    heights
        ? "     height in steps of 4 units from the lowest (0), # blocked"
        : "     # blocked  + a wall on an edge (= one not reached)  . reached from the spawn (@)  P portal  O orrery  A Archmage  K shopkeeper  W wizard  G guard  F folk  M Mercenary Captain",
);

// Everyone the hero talks to has to be reachable within talking distance
let failed = false;
const near = (x: number, y: number, reach: number) => {
    for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
            const tx = Math.floor(x) + dx + 0.5;
            const ty = Math.floor(y) + dy + 0.5;
            if (Math.hypot(tx - x, ty - y) <= reach && reached(tx, ty)) {
                return true;
            }
        }
    }
    return false;
};
for (const p of plan.people) {
    if (!near(p.x, p.y, HERO.talkReach - 0.3)) {
        console.log(`Can't reach ${p.name} at ${p.x - arena.baseX}, ${p.y - arena.baseY}`);
        failed = true;
    }
}
if (!near(plan.portal.x, plan.portal.y, HERO.portalReach - 0.3)) {
    console.log("Can't reach the portal");
    failed = true;
}
// The orrery's looked into from beside it
if (plan.orrery && !near(plan.orrery.x, plan.orrery.y, ORRERY.reach - 0.3)) {
    console.log("Can't reach the orrery");
    failed = true;
}
process.exit(failed ? 1 : 0);
