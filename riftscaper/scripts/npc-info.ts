// Prints an NPC type's fields that change how it's drawn: its recolours, retextures, lighting
// (ambient, contrast), scale and animations, to tell look-alike ids apart.
//
//   bun run tsx riftscaper/scripts/npc-info.ts 11432 11433
import { getFactory, loadGameCache } from "./cacheUtil";

const factory = getFactory(loadGameCache());
const npcs = factory.getNpcTypeLoader();
for (const arg of process.argv.slice(2)) {
    const npc = npcs.load(Number(arg)) as unknown as Record<string, unknown>;
    const pick = Object.fromEntries(
        Object.entries(npc).filter(([k, v]) => v !== undefined && v !== null && typeof v !== "function" && !["cacheInfo", "id"].includes(k)),
    );
    console.log(arg, JSON.stringify(pick));
}
