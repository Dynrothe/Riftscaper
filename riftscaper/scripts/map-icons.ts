// Prints the minimap's and world map's icons (the cache's map elements): each one's id, name and
// sprite, to find an icon's sprite before the game draws with it. Words given keep those whose
// name has one of them; none prints them all.
//
//   bun run tsx riftscaper/scripts/map-icons.ts quest bank
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { ConfigType } from "../../engine/rs/cache/ConfigType";
import { IndexType } from "../../engine/rs/cache/IndexType";
import { ArchiveMapElementTypeLoader } from "../../engine/rs/config/meltype/MapElementTypeLoader";
import { loadGameCache } from "./cacheUtil";

const cache = loadGameCache();
const configs = CacheSystem.fromFiles(cache.type, cache.files).getIndex(IndexType.DAT2.configs);
const elements = new ArchiveMapElementTypeLoader(cache.info, configs.getArchive(ConfigType.OSRS.mapFunctions));
const words = process.argv.slice(2).map((w) => w.toLowerCase());
for (let id = 0; id < elements.getCount(); id++) {
    const el = elements.load(id);
    const name = el.name ?? "";
    if (words.length > 0 && !words.some((w) => name.toLowerCase().includes(w))) {
        continue;
    }
    console.log(`${id}`.padStart(5), `sprite ${el.spriteId}`.padEnd(12), name);
}
