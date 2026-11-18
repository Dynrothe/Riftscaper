// Lists NPC types whose name matches any of the patterns, with their combat level, size and idle
// and walk animations. A seq existing doesn't mean the NPC can play it: bake it and look.
//
//   bun run find-npcs "^ghoul$" "^cave horror"
import { getFactory, loadGameCache } from "./cacheUtil";

const patterns = process.argv.slice(2).map((p) => new RegExp(p, "i"));
const factory = getFactory(loadGameCache());
const npcs = factory.getNpcTypeLoader();
const bas = factory.getBasTypeLoader();

for (let id = 0; id < npcs.getCount(); id++) {
    const npc = npcs.load(id);
    if (!npc.name || npc.name === "null" || !patterns.some((p) => p.test(npc.name))) {
        continue;
    }
    console.log(
        [
            `${id}`.padStart(5),
            npc.name.padEnd(24),
            `lvl ${npc.combatLevel}`.padEnd(8),
            `size ${npc.size}`,
            `idle ${npc.getIdleSeqId(bas)}`,
            `walk ${npc.getWalkSeqId(bas)}`,
            `models [${npc.modelIds?.join(",")}]`,
            npc.transforms ? "transforms" : "",
        ].join("  "),
    );
}
