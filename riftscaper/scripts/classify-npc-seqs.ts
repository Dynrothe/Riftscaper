// Poses an NPC with candidate animations and measures each one, to tell attack, block and death
// animations apart before they're looked at in the game: a death ends lying down (low height on
// its last frame), an attack reaches out (wide mid-animation) and ends standing. A guess, not a
// reading. Run Escape's, with this game's cache.
//
//   bun run tsx riftscaper/scripts/classify-npc-seqs.ts 655 6182 6183 6184 6185
import { NpcModelLoader } from "../../engine/rs/config/npctype/NpcModelLoader";
import { VarManager } from "../../engine/rs/config/vartype/VarManager";
import type { Model } from "../../engine/rs/model/Model";
import { getFactory, loadGameCache } from "./cacheUtil";

const [npcArg, ...seqArgs] = process.argv.slice(2);
const npcId = parseInt(npcArg);
const seqIds = seqArgs.map((a) => parseInt(a));

const factory = getFactory(loadGameCache());
const npcTypeLoader = factory.getNpcTypeLoader();
const seqTypeLoader = factory.getSeqTypeLoader();
const basTypeLoader = factory.getBasTypeLoader();
const npcModelLoader = new NpcModelLoader(
    npcTypeLoader,
    factory.getModelLoader(),
    factory.getTextureLoader(),
    seqTypeLoader,
    factory.getSeqFrameLoader(),
    factory.getSkeletalSeqLoader(),
    new VarManager(factory.getVarBitTypeLoader()),
);

function measure(model: Model | undefined): { height: number; reach: number } {
    let height = 0;
    let reach = 0;
    if (!model) {
        return { height, reach };
    }
    for (let i = 0; i < model.verticesCount; i++) {
        height = Math.max(height, -model.verticesY[i]);
        reach = Math.max(reach, Math.hypot(model.verticesX[i], model.verticesZ[i]));
    }
    return { height, reach };
}

const npcType = npcTypeLoader.load(npcId);
const idleSeqId = npcType.getIdleSeqId(basTypeLoader);
const idle = measure(npcModelLoader.getModel(npcType, idleSeqId, 0));
console.log(`${npcType.name} (${npcId}) standing: height ${idle.height}, reach ${idle.reach | 0}`);

for (const seqId of seqIds) {
    const seqType = seqTypeLoader.load(seqId);
    const frameCount = seqType.isSkeletalSeq() ? seqType.getSkeletalDuration() : (seqType.frameIds?.length ?? 0);
    let maxReach = 0;
    let minHeight = Infinity;
    for (let frame = 0; frame < frameCount; frame++) {
        const m = measure(npcModelLoader.getModel(npcType, seqId, frame));
        maxReach = Math.max(maxReach, m.reach);
        minHeight = Math.min(minHeight, m.height);
    }
    const last = measure(npcModelLoader.getModel(npcType, seqId, frameCount - 1));
    const ticks = seqType.isSkeletalSeq() ? frameCount : (seqType.frameLengths ?? []).reduce((sum, l) => sum + (l || 1), 0);
    const lastRatio = last.height / Math.max(idle.height, 1);
    const reachRatio = maxReach / Math.max(idle.reach, 1);
    let guess = "";
    if (lastRatio < 0.6) {
        guess = "death?";
    } else if (reachRatio > 1.25 && ticks <= 100) {
        guess = "attack?";
    } else if (ticks <= 60) {
        guess = "block?";
    }
    console.log(
        `${seqId}`.padStart(6),
        `${(ticks * 0.02).toFixed(2)}s`.padEnd(7),
        `last height ${(lastRatio * 100).toFixed(0)}%`.padEnd(18),
        `min height ${((minHeight / Math.max(idle.height, 1)) * 100).toFixed(0)}%`.padEnd(17),
        `max reach ${(reachRatio * 100).toFixed(0)}%`.padEnd(16),
        guess,
    );
}
