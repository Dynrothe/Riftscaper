// Measures a rectangle of the real world as a city: how its ground rises and falls (levels, faces,
// how much is flat), how much of it is paved, and what it's built with (the locs by count, with
// their types and rotations), and draws its heights as text. For laying Runefall out the way the
// real cities are.
//
//   bun run tsx riftscaper/scripts/city-survey.ts <worldX> <worldY> <sizeX> <sizeY> [top]
import { cutPrefab } from "../../engine/scaperune/prefab";
import { getFactory, loadGameCache } from "./cacheUtil";

const [worldX, worldY, sizeX, sizeY] = process.argv.slice(2, 6).map(Number);
const top = Number(process.argv[6] ?? 40);
if (!(sizeX > 0 && sizeY > 0)) {
    console.log("bun run tsx riftscaper/scripts/city-survey.ts <worldX> <worldY> <sizeX> <sizeY> [top]");
    process.exit(1);
}

const factory = getFactory(loadGameCache());
const maps = factory.getMapFileLoader();
const locTypes = factory.getLocTypeLoader();
const grid = cutPrefab(maps, worldX, worldY, sizeX, sizeY);
const level0 = grid.levels[0];
const corners = sizeX + 1;
const height = (x: number, y: number) => level0.heights[x + y * corners];

// Heights: the range, and how steep each tile is at its steepest edge
let min = Infinity;
let max = -Infinity;
for (let i = 0; i < level0.heights.length; i++) {
    min = Math.min(min, level0.heights[i]);
    max = Math.max(max, level0.heights[i]);
}
const bands = [0, 2, 4, 8, 16, 32, Infinity];
const steep = new Array(bands.length).fill(0);
const levels = new Map<number, number>();
let paved = 0;
for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
        const h = [height(x, y), height(x + 1, y), height(x, y + 1), height(x + 1, y + 1)];
        const slope = Math.max(...h) - Math.min(...h);
        steep[bands.findIndex((b) => slope <= b)]++;
        const mean = Math.round((h[0] + h[1] + h[2] + h[3]) / 4 / 4) * 4;
        levels.set(mean, (levels.get(mean) ?? 0) + 1);
        if (level0.overlays[x + y * sizeX] !== 0) {
            paved++;
        }
    }
}
const tiles = sizeX * sizeY;
console.log(`Heights ${min} to ${max} (${max - min} units, ${((max - min) / 16).toFixed(1)} tiles). Tiles by their steepest edge:`);
bands.forEach((b, i) => {
    const label = i === 0 ? "flat" : `to ${b}`;
    console.log(`  ${label.padEnd(8)} ${String(steep[i]).padStart(6)}  ${((steep[i] / tiles) * 100).toFixed(1)}%`);
});
console.log("Tiles by mean height (in steps of 4), the levels the ground sits at:");
for (const [h, n] of [...levels].sort((a, b) => a[0] - b[0])) {
    if (n / tiles >= 0.02) {
        console.log(`  ${String(h).padStart(4)} ${String(n).padStart(6)}  ${((n / tiles) * 100).toFixed(1)}%`);
    }
}
console.log(`Paved or floored: ${((paved / tiles) * 100).toFixed(1)}% of ${tiles} tiles`);

// What it's built with
type Count = { n: number; rotations: number[]; name: string; type: number; size: string; clip: number };
const counts = new Map<string, Count>();
for (const loc of grid.locs) {
    if (loc.level !== 0) {
        continue;
    }
    const t = locTypes.load(loc.id);
    const name = t.name && t.name !== "null" ? t.name : "-";
    const key = `${loc.id}:${loc.type}`;
    const c = counts.get(key) ?? { n: 0, rotations: [0, 0, 0, 0], name, type: loc.type, size: `${t.sizeX}x${t.sizeY}`, clip: t.clipType };
    c.n++;
    c.rotations[loc.rotation & 3]++;
    counts.set(key, c);
}
console.log(`\nLocs on the ground level: ${grid.locs.filter((l) => l.level === 0).length}, of ${counts.size} kinds. The most used:`);
for (const [key, c] of [...counts].sort((a, b) => b[1].n - a[1].n).slice(0, top)) {
    const [id] = key.split(":");
    console.log(`${String(c.n).padStart(5)} × ${id.padStart(6)} t${String(c.type).padStart(2)} ${c.name.padEnd(26)} ${c.size.padEnd(4)} clip ${c.clip}  rot [${c.rotations.join(",")}]`);
}

// The heights as text, a character a tile: 0 the lowest, each step 4 units; walls as |
console.log("\nHeights (0 lowest, a step every 4 units; | a wall, . paving on the level):");
const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const rows: string[][] = [];
for (let y = 0; y < sizeY; y++) {
    const row: string[] = [];
    for (let x = 0; x < sizeX; x++) {
        const mean = (height(x, y) + height(x + 1, y) + height(x, y + 1) + height(x + 1, y + 1)) / 4;
        const step = Math.min(chars.length - 1, Math.round((mean - min) / 4));
        row.push(level0.overlays[x + y * sizeX] !== 0 && step === 0 ? "." : chars[step]);
    }
    rows.push(row);
}
for (const loc of grid.locs) {
    if (loc.level === 0 && (loc.type <= 3 || loc.type === 9) && rows[loc.y]) {
        rows[loc.y][loc.x] = "|";
    }
}
for (let y = sizeY - 1; y >= 0; y--) {
    const wy = worldY + y;
    console.log(`${wy % 5 === 0 ? String(wy).padStart(5) : "     "} ${rows[y].join("")}`);
}
