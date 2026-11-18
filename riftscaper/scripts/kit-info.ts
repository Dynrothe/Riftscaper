// Lists the identity kits (the body parts a player's look is made of) by body part, with whether
// character creation offers them, to choose the looks the hero can be given.
//
//   bun run tsx riftscaper/scripts/kit-info.ts
import { createIdkTypeLoader } from "../../engine/rs/config/idktype/IdkTypeLoader";
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { loadGameCache } from "./cacheUtil";

const PARTS = ["hair", "jaw", "torso", "arms", "hands", "legs", "feet"];
const cache = loadGameCache();
const kits = createIdkTypeLoader(cache.info, CacheSystem.fromFiles(cache.type, cache.files));
const count = kits.getCount();
const rows: Record<string, string[]> = {};
for (let id = 0; id < count; id++) {
    const kit = kits.load(id);
    const part = kit.bodyPartyId;
    const name = part >= 7 ? `female ${PARTS[part - 7]}` : `male ${PARTS[part] ?? part}`;
    (rows[name] ??= []).push(`${id}${kit.nonSelectable ? "*" : ""}`);
}
for (const [name, ids] of Object.entries(rows)) {
    console.log(`${name}: ${ids.join(" ")}`);
}
console.log("(* not offered at character creation)");
