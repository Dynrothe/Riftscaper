// Prints a prefab's size and doors in each rotation (local tiles, x east and y north), to lay a
// town out round them: one of the engine's PREFABS by name, or a rectangle of the world.
//
//   bun run tsx riftscaper/scripts/prefab-exits.ts varrock_shop varrock_store
//   bun run tsx riftscaper/scripts/prefab-exits.ts 3100,3151,18,19
import { PREFABS, PrefabKit } from "../../engine/scaperune/prefabs";
import { createBuildContext } from "../../engine/scaperune/squares";
import { getFactory, loadGameCache } from "./cacheUtil";

const factory = getFactory(loadGameCache());
const context = createBuildContext(factory.getMapFileLoader(), factory.getLocTypeLoader());
for (const arg of process.argv.slice(2)) {
    const defs = { ...PREFABS };
    let name = arg;
    if (/^\d+,\d+,\d+,\d+$/.test(arg)) {
        const [worldX, worldY, sizeX, sizeY] = arg.split(",").map(Number);
        name = "rect";
        defs.rect = { worldX, worldY, sizeX, sizeY };
    }
    const kit = new PrefabKit(context, defs);
    for (let turns = 0; turns < 4; turns++) {
        const { prefab, exits } = kit.get(name, turns);
        const doors = exits.map((e) => `(${e.x},${e.y})->(${e.outX},${e.outY})`).join(" ");
        console.log(`${arg} turns ${turns}: ${prefab.sizeX}x${prefab.sizeY} doors ${doors}`);
    }
}
