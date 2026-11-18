// Prints sound effects as the engine synthesises them (index 4): how long each runs from its first
// sound and how loud it peaks, to check one from the OSRS Wiki's list of sound ids is there and
// isn't silence before the game plays it.
//
//   bun run tsx riftscaper/scripts/sound-info.ts 2582 6765 6647
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { IndexType } from "../../engine/rs/cache/IndexType";
import { SAMPLE_RATE } from "../../engine/rs/audio/Instrument";
import { SoundEffect } from "../../engine/rs/audio/SoundEffect";
import { loadGameCache } from "./cacheUtil";

const cache = loadGameCache();
const index = CacheSystem.fromFiles(cache.type, cache.files).getIndex(IndexType.DAT2.soundEffects);
for (const id of process.argv.slice(2).map(Number)) {
    try {
        const file = index.getFile(id, 0);
        if (!file) {
            console.log(`${id}`.padStart(6), "missing");
            continue;
        }
        const effect = SoundEffect.decode(file.data);
        effect.trimDelay();
        const pcm = effect.mix();
        let peak = 0;
        for (let i = 0; i < pcm.length; i++) {
            peak = Math.max(peak, Math.abs(pcm[i]));
        }
        console.log(`${id}`.padStart(6), `${Math.round((pcm.length / SAMPLE_RATE) * 1000)} ms`.padStart(9), `peak ${(peak / 128).toFixed(2)}`);
    } catch (e) {
        console.log(`${id}`.padStart(6), "failed", (e as Error).message);
    }
}
