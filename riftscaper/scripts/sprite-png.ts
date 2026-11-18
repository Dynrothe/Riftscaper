// Draws interface sprites into a PNG, side by side at a whole multiple of their size on a magenta
// check (so what's see-through shows), as the game draws them: to look at one before building
// with it, since the cache doesn't name them (sprite-info.ts gives their sizes).
//
//   bun run tsx riftscaper/scripts/sprite-png.ts out.png 1026 1030 1032
//   SCALE=6 bun run tsx riftscaper/scripts/sprite-png.ts out.png 1030
import fs from "fs";

import { decodeSpriteImage } from "../../engine/mapviewer/worker/SpriteDataLoader";
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { IndexType } from "../../engine/rs/cache/IndexType";
import { loadGameCache } from "./cacheUtil";
import { encodePng } from "./png";

const [out, ...ids] = process.argv.slice(2);
if (!out || ids.length === 0) {
    console.log("usage: sprite-png.ts out.png id [id...]");
    process.exit(1);
}
const scale = Number(process.env.SCALE ?? 3);
const cache = loadGameCache();
const sprites = CacheSystem.fromFiles(cache.type, cache.files).getIndex(IndexType.DAT2.sprites);

const pics = ids
    .map((arg) => {
        const image = decodeSpriteImage(sprites, Number(arg));
        console.log(arg.padStart(6), image.width > 0 ? `${image.width}x${image.height}` : "not in the cache");
        return image;
    })
    .filter((image) => image.width > 0);

const gap = 4;
const width = pics.reduce((sum, p) => sum + p.width * scale + gap, gap);
const height = Math.max(1, ...pics.map((p) => p.height * scale)) + gap * 2;
const sheet = new Uint8Array(width * height * 4);
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const v = ((x >> 3) + (y >> 3)) % 2 ? 200 : 255;
        sheet.set([v, 0, v, 255], (y * width + x) * 4);
    }
}
let left = gap;
for (const p of pics) {
    for (let y = 0; y < p.height * scale; y++) {
        for (let x = 0; x < p.width * scale; x++) {
            const argb = p.pixels[Math.floor(y / scale) * p.width + Math.floor(x / scale)];
            const a = (argb >>> 24) / 255;
            if (a === 0) {
                continue;
            }
            const o = ((y + gap) * width + (x + left)) * 4;
            const rgb = [(argb >> 16) & 255, (argb >> 8) & 255, argb & 255];
            for (let k = 0; k < 3; k++) {
                sheet[o + k] = Math.round(rgb[k] * a + sheet[o + k] * (1 - a));
            }
        }
    }
    left += p.width * scale + gap;
}
fs.writeFileSync(out, encodePng(width, height, sheet));
console.log("wrote", out);
