// Prints interface sprites: whether the cache has each, its frames and its size, to check an id
// before the game draws with it. The cache doesn't name its sprites; RuneLite's SpriteID lists
// what most are (SPELL_FIRE_BOLT, PRAYER_SMITE), and they're looked at in the game before use.
// The client's own groups have names (mapfunction, headicons_hint), which find their ids.
//
//   bun run tsx riftscaper/scripts/sprite-info.ts 32 132 1268 headicons_hint
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { IndexType } from "../../engine/rs/cache/IndexType";
import { SpriteLoader } from "../../engine/rs/sprite/SpriteLoader";
import { loadGameCache } from "./cacheUtil";

const cache = loadGameCache();
const sprites = CacheSystem.fromFiles(cache.type, cache.files).getIndex(IndexType.DAT2.sprites);
for (const arg of process.argv.slice(2)) {
    const id = /^\d+$/.test(arg) ? Number(arg) : sprites.getArchiveId(arg);
    if (id < 0) {
        console.log(arg.padStart(6), "no sprite of that name");
        continue;
    }
    let found = false;
    try {
        found = SpriteLoader.loadFromIndex(sprites, id);
    } catch {
        // Past the end of the index
    }
    if (!found) {
        console.log(`${id}`.padStart(6), "not in the cache");
        continue;
    }
    const sizes = Array.from({ length: SpriteLoader.spriteCount }, (_, i) => `${SpriteLoader.widths![i]}x${SpriteLoader.heights![i]}`);
    console.log(`${id}`.padStart(6), arg === String(id) ? "" : `(${arg})`, `${SpriteLoader.spriteCount} frame(s)`, sizes.join(" "));
}
