// Lists the locs in a rectangle of the real world, level by level, with their names, and draws the
// ground level as text with each loc's first letter on its tile: to read a building before
// cutting it out as a prefab (where its doors, furniture and lamps are).
//
//   bun run tsx riftscaper/scripts/locs-in.ts <worldX> <worldY> <sizeX> <sizeY> [filter]
import { cutPrefab } from "../../engine/scaperune/prefab";
import { getFactory, loadGameCache } from "./cacheUtil";

const [worldX, worldY, sizeX, sizeY] = process.argv.slice(2, 6).map(Number);
const filter = process.argv[6] ? new RegExp(process.argv[6], "i") : undefined;
if (!(sizeX > 0 && sizeY > 0)) {
    console.log("bun run tsx riftscaper/scripts/locs-in.ts <worldX> <worldY> <sizeX> <sizeY> [filter]");
    process.exit(1);
}

const factory = getFactory(loadGameCache());
const maps = factory.getMapFileLoader();
const locTypes = factory.getLocTypeLoader();
const grid = cutPrefab(maps, worldX, worldY, sizeX, sizeY);

const counts = new Map<string, number>();
const rows: string[][] = Array.from({ length: sizeY }, () => Array.from({ length: sizeX }, () => " "));
// Floor laid over the ground (paving, a building's boards) shows as dots
const level0 = grid.levels[0];
for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
        if (level0.overlays[x + y * sizeX] !== 0) {
            rows[sizeY - 1 - y][x] = ".";
        }
    }
}
for (const loc of grid.locs) {
    const type = locTypes.load(loc.id);
    const name = type.name && type.name !== "null" ? type.name : "-";
    if (filter && !filter.test(name)) {
        continue;
    }
    const key = `L${loc.level} ${String(loc.id).padStart(6)} t${String(loc.type).padStart(2)} ${name} (${type.sizeX}x${type.sizeY} clip ${type.clipType})`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    // Walls are drawn whether they have a name or not: most don't
    const wall = loc.type <= 3 || loc.type === 9;
    if (loc.level === 0 && (name !== "-" || wall)) {
        const row = rows[sizeY - 1 - loc.y];
        if (row) {
            const mark = /door|gate|curtain/i.test(name) ? "D" : wall ? "|" : name[0];
            if (row[loc.x] === " " || row[loc.x] === "." || mark === "D") {
                row[loc.x] = mark;
            }
        }
    }
    if (filter) {
        console.log(`${worldX + loc.x},${worldY + loc.y} ${key} rot ${loc.rotation}`);
    }
}
if (!filter) {
    for (const [key, count] of [...counts].sort()) {
        console.log(`${String(count).padStart(4)} × ${key}`);
    }
}
console.log();
rows.forEach((row, i) => {
    const y = worldY + sizeY - 1 - i;
    console.log(`${y % 5 === 0 ? String(y).padStart(5) : "     "} ${row.join("")}`);
});
