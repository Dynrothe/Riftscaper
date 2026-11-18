// Lists item types whose name matches any of the patterns, with their wear slot and models.
//
//   bun run find-objs "^oil lantern" "^candle$"
import { getFactory, loadGameCache } from "./cacheUtil";

const patterns = process.argv.slice(2).map((p) => new RegExp(p, "i"));
const objs = getFactory(loadGameCache()).getObjTypeLoader();

for (let id = 0; id < objs.getCount(); id++) {
    const obj = objs.load(id);
    if (!obj.name || obj.name === "null" || obj.noteTemplate !== -1) {
        continue;
    }
    if (obj.placeholderTemplate !== -1 || !patterns.some((p) => p.test(obj.name))) {
        continue;
    }
    console.log(
        [
            `${id}`.padStart(5),
            obj.name.padEnd(28),
            `slot ${obj.op13}`.padEnd(8),
            `worn [${obj.maleModel},${obj.maleModel1},${obj.maleModel2}]`,
            `inv ${obj.model}`,
        ].join("  "),
    );
}
