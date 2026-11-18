// Prints spot animations: their model, the seq they play and how long that runs (client ticks of
// 20 ms), to check one before the game bakes it.
//
//   bun run tsx riftscaper/scripts/spot-info.ts 111 342 800
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { createSpotAnimTypeLoader } from "../../engine/rs/config/spotanimtype/SpotAnimTypeLoader";
import { getFactory, loadGameCache } from "./cacheUtil";

const cache = loadGameCache();
const spots = createSpotAnimTypeLoader(cache.info, CacheSystem.fromFiles(cache.type, cache.files));
const seqs = getFactory(cache).getSeqTypeLoader();
for (const id of process.argv.slice(2).map(Number)) {
    const spot = spots.load(id);
    const seq = spot.sequenceId >= 0 ? seqs.load(spot.sequenceId) : undefined;
    const length = !seq ? 0 : seq.skeletalId !== -1 ? seq.skeletalEnd - seq.skeletalStart : (seq.frameLengths ?? []).reduce((a, b) => a + b, 0);
    console.log(`${id}`.padStart(6), `model ${spot.modelId}`, `seq ${spot.sequenceId}`, `length ${length}`, `scale ${spot.widthScale}x${spot.heightScale}`);
}
