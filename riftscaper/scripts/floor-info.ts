// Prints floors by their map file ids (a biome's numbers): an overlay's colour, its texture and
// that's average colour, or an underlay's colour. Or counts the floors of a rectangle of the real
// world's ground level, commonest first, near=<locId>,... to count only what's within 3 tiles of
// those locs (what a wood's trees stand on, say), and where they are. To choose a floor, and see
// what a place's own are, before it's built with.
//
//   bun run tsx riftscaper/scripts/floor-info.ts 72 22 25
//   bun run tsx riftscaper/scripts/floor-info.ts under 240 235
//   bun run tsx riftscaper/scripts/floor-info.ts in <worldX> <worldY> <sizeX> <sizeY> [near=40788,40789]
import type { OverlayFloorType } from "../../engine/rs/config/floortype/OverlayFloorType";
import type { UnderlayFloorType } from "../../engine/rs/config/floortype/UnderlayFloorType";
import { HSL_RGB_MAP } from "../../engine/rs/util/ColorUtil";
import { cacheFloorId } from "../../engine/scaperune/format";
import { cutPrefab } from "../../engine/scaperune/prefab";
import { getFactory, loadGameCache } from "./cacheUtil";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("bun run tsx riftscaper/scripts/floor-info.ts <overlay ids> | under <underlay ids> | in <worldX> <worldY> <sizeX> <sizeY> [near=<locIds>]");
    process.exit(1);
}

const factory = getFactory(loadGameCache());
const overlays = factory.getOverlayTypeLoader();
const underlays = factory.getUnderlayTypeLoader();
const textures = factory.getTextureLoader();

const hex = (rgb: number) => "#" + (rgb >>> 0).toString(16).padStart(6, "0");

function describeOverlay(id: number): string {
    try {
        const type = overlays.load(cacheFloorId(id)) as OverlayFloorType;
        if (type.primaryRgb === 0xff00ff && type.textureId < 0) {
            return "hidden (draws nothing)";
        }
        const parts = [`colour ${hex(type.primaryRgb)}`];
        if (type.textureId >= 0) {
            parts.push(`texture ${type.textureId} (about ${hex(HSL_RGB_MAP[textures.getAverageHsl(type.textureId)] ?? 0x808080)})`);
        }
        if (type.secondaryRgb !== -1 && type.secondaryRgb !== undefined) {
            parts.push(`minimap ${hex(type.secondaryRgb)}`);
        }
        if (!type.hideUnderlay) {
            parts.push("shows the underlay");
        }
        return parts.join(", ");
    } catch (e) {
        return `can't be read: ${(e as Error).message}`;
    }
}

function describeUnderlay(id: number): string {
    try {
        return `colour ${hex((underlays.load(cacheFloorId(id)) as UnderlayFloorType).rgbColor)}`;
    } catch (e) {
        return `can't be read: ${(e as Error).message}`;
    }
}

if (args[0] === "in") {
    const [worldX, worldY, sizeX, sizeY] = args.slice(1, 5).map(Number);
    const nearArg = args.find((a) => a.startsWith("near="));
    const near = nearArg ? new Set(nearArg.slice(5).split(",").map(Number)) : undefined;
    const grid = cutPrefab(factory.getMapFileLoader(), worldX, worldY, sizeX, sizeY);
    const level0 = grid.levels[0];
    let counted: Uint8Array | undefined;
    if (near) {
        counted = new Uint8Array(sizeX * sizeY);
        let found = 0;
        let box = [Infinity, Infinity, -Infinity, -Infinity];
        for (const loc of grid.locs) {
            if (loc.level !== 0 || !near.has(loc.id)) {
                continue;
            }
            found++;
            box = [Math.min(box[0], loc.x), Math.min(box[1], loc.y), Math.max(box[2], loc.x), Math.max(box[3], loc.y)];
            for (let y = loc.y - 3; y <= loc.y + 3; y++) {
                for (let x = loc.x - 3; x <= loc.x + 3; x++) {
                    if (x >= 0 && y >= 0 && x < sizeX && y < sizeY) {
                        counted[x + y * sizeX] = 1;
                    }
                }
            }
        }
        console.log(found ? `${found} of those locs, from ${worldX + box[0]},${worldY + box[1]} to ${worldX + box[2]},${worldY + box[3]}` : "none of those locs here");
    }
    const over = new Map<number, number>();
    const under = new Map<number, number>();
    let tiles = 0;
    for (let i = 0; i < sizeX * sizeY; i++) {
        if (counted && !counted[i]) {
            continue;
        }
        tiles++;
        const o = level0.overlays[i];
        if (o) {
            over.set(o, (over.get(o) ?? 0) + 1);
        }
        const u = level0.underlays[i];
        under.set(u, (under.get(u) ?? 0) + 1);
    }
    const share = (n: number) => `${((n / Math.max(1, tiles)) * 100).toFixed(1)}%`.padStart(6);
    console.log(`\n${tiles} tiles. Overlays:`);
    for (const [id, n] of [...over].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
        console.log(`${share(n)}  ${String(id).padStart(4)}  ${describeOverlay(id)}`);
    }
    console.log("\nUnderlays:");
    for (const [id, n] of [...under].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
        console.log(`${share(n)}  ${String(id).padStart(4)}  ${id ? describeUnderlay(id) : "none"}`);
    }
} else if (args[0] === "under") {
    for (const id of args.slice(1).map(Number)) {
        console.log(`${String(id).padStart(4)}  ${describeUnderlay(id)}`);
    }
} else {
    for (const id of args.map(Number)) {
        console.log(`${String(id).padStart(4)}  ${describeOverlay(id)}`);
    }
}
