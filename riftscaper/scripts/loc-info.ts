// Prints what the cache says about each loc id given: its name, size, clip, animation, models,
// whether it follows the ground, and the model types it has (0 to 3 and 9 are wall pieces that
// stand on a tile's edge, 10 and 11 stand on the tile, 22 lies on the floor).
//
//   bun run tsx riftscaper/scripts/loc-info.ts 1116 6727 201
import { getFactory, loadGameCache } from "./cacheUtil";

const ids = process.argv.slice(2).map(Number);
const locs = getFactory(loadGameCache()).getLocTypeLoader();
for (const id of ids) {
    const loc = locs.load(id) as any;
    console.log(
        `${id}`.padStart(6),
        (loc.name ?? "-").padEnd(24),
        `size ${loc.sizeX}x${loc.sizeY}`,
        `clip ${loc.clipType}`,
        `seq ${loc.seqId}`,
        `contour ${loc.contouredGround}`,
        `types [${loc.types?.join(",") ?? loc.modelTypes?.join(",") ?? "?"}]`,
        `models [${loc.models?.flat().join(",")}]`,
        loc.actions?.filter(Boolean).length ? `actions [${loc.actions.filter(Boolean).join(",")}]` : "",
    );
}
