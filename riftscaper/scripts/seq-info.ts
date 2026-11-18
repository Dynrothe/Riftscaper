// Prints seqs: how many frames, how long (client ticks of 20 ms), the frame archive (seqs on the
// same archive share a skeleton, so a player's work animations sit with 808 and 819), and the items
// it puts in the hands.
//
//   bun run tsx riftscaper/scripts/seq-info.ts 808 819 879 625
import { getFactory, loadGameCache } from "./cacheUtil";

const seqs = getFactory(loadGameCache()).getSeqTypeLoader();
for (const id of process.argv.slice(2).map(Number)) {
    const seq = seqs.load(id);
    if (seq.skeletalId !== -1) {
        console.log(`${id}`.padStart(6), `skeletal ${seq.skeletalId} frames ${seq.skeletalStart}-${seq.skeletalEnd}`);
        continue;
    }
    const frames = seq.frameIds?.length ?? 0;
    const length = seq.frameLengths?.reduce((a, b) => a + b, 0) ?? 0;
    const archive = frames > 0 ? seq.frameIds[0] >> 16 : -1;
    console.log(
        `${id}`.padStart(6),
        `frames ${frames}`.padEnd(10),
        `length ${length}`.padEnd(11),
        `archive ${archive}`.padEnd(14),
        `hands ${seq.leftHandItem}/${seq.rightHandItem}`,
    );
}
