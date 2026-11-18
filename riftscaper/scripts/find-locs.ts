// Lists loc (scenery) types whose name matches any of the patterns, with their size and
// animation.
//
//   bun run tsx riftscaper/scripts/find-locs.ts "^sconce" "^brazier"
import { getFactory, loadGameCache } from "./cacheUtil";

const patterns = process.argv.slice(2).map((p) => new RegExp(p, "i"));
const locs = getFactory(loadGameCache()).getLocTypeLoader();

for (let id = 0; id < locs.getCount(); id++) {
    const loc = locs.load(id);
    if (!loc.name || loc.name === "null" || !patterns.some((p) => p.test(loc.name))) {
        continue;
    }
    console.log(
        `${id}`.padStart(6),
        loc.name.padEnd(28),
        `size ${loc.sizeX}x${loc.sizeY}`,
        `clip ${loc.clipType}`,
        `seq ${loc.seqId}`,
        `models [${loc.models?.flat().join(",")}]`,
    );
}
