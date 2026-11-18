// How an animation moves, frame by frame, on a model that can play it: when each frame starts (client
// ticks of 20 ms), how long it lasts, and how far the model's furthest-moving vertex went getting
// there, in model units (128 a tile) and per tick. A blow lands at the end of its fastest stretch,
// so this is where `content/anims.ts` hit shares start from, before they're looked at in the game.
// It's a guess, not a reading: a bow's fastest stretch is the string coming back after the shot,
// and a cast's the arm dropping after it, so read the table for those (the long hold is the shot).
// Also lists the seqs near an NPC's attack on the same skeleton (its block is often one).
//
//   bun run tsx riftscaper/scripts/seq-motion.ts <npcId> <seqId>...    a human NPC (510) for a hero's
//   bun run tsx riftscaper/scripts/seq-motion.ts <npcId> --near <seqId>
//   bun run tsx riftscaper/scripts/seq-motion.ts --monsters            every monster's attack
import { createWorkerState } from "../../engine/mapviewer/worker/WorkerState";
import { loadGameCache } from "./cacheUtil";

const state = createWorkerState(loadGameCache(), [], [], undefined as unknown as Cache);
const [npcArg, ...rest] = process.argv.slice(2);
const npc = state.npcTypeLoader.load(npcArg === "--monsters" ? 0 : Number(npcArg));
if (npcArg !== "--monsters") {
    console.log(`npc ${npc.id} ${npc.name}`);
}

function skeleton(seqId: number): number {
    const seq = state.seqTypeLoader.load(seqId);
    if (!seq || !seq.frameIds || seq.frameIds.length === 0) {
        return -1;
    }
    return state.seqFrameLoader.load(seq.frameIds[0])?.base.id ?? -1;
}

function motion(seqId: number): void {
    const seq = state.seqTypeLoader.load(seqId);
    if (!seq?.frameIds) {
        console.log(`${seqId}: no frames`);
        return;
    }
    let prev: { x: Int32Array; y: Int32Array; z: Int32Array } | undefined;
    let tick = 0;
    const total = seq.frameLengths.reduce((a, b) => a + b, 0);
    console.log(`seq ${seqId}: ${seq.frameIds.length} frames, ${total} ticks, skeleton ${skeleton(seqId)}`);
    let fastest = { at: 0, speed: 0 };
    for (let i = 0; i < seq.frameIds.length; i++) {
        const model = state.npcModelLoader.getModel(npc, seqId, i);
        if (!model) {
            continue;
        }
        const now = { x: model.verticesX.slice(0, model.verticesCount), y: model.verticesY.slice(0, model.verticesCount), z: model.verticesZ.slice(0, model.verticesCount) };
        let most = 0;
        if (prev && prev.x.length === now.x.length) {
            for (let v = 0; v < now.x.length; v++) {
                most = Math.max(most, Math.hypot(now.x[v] - prev.x[v], now.y[v] - prev.y[v], now.z[v] - prev.z[v]));
            }
        }
        const before = i > 0 ? seq.frameLengths[i - 1] || 1 : 1;
        const speed = most / before;
        if (speed > fastest.speed) {
            fastest = { at: tick, speed };
        }
        const length = seq.frameLengths[i] || 1;
        console.log(`  ${String(i).padStart(2)} at ${String(tick).padStart(3)} for ${String(length).padStart(2)}  moved ${String(Math.round(most)).padStart(4)}  ${speed.toFixed(0).padStart(4)}/tick  ${"#".repeat(Math.round(speed / 8))}`);
        prev = now;
        tick += length;
    }
    console.log(`  fastest arrives at tick ${fastest.at} of ${total}: share ${(fastest.at / total).toFixed(2)}`);
}

function fastestShare(on: typeof npc, seqId: number): number {
    const seq = state.seqTypeLoader.load(seqId);
    if (!seq?.frameIds) {
        return -1;
    }
    const total = seq.frameLengths.reduce((a, b) => a + b, 0);
    let prev: Int32Array[] | undefined;
    let tick = 0;
    let best = { at: 0, speed: 0 };
    for (let i = 0; i < seq.frameIds.length; i++) {
        const m = state.npcModelLoader.getModel(on, seqId, i);
        if (m) {
            const now = [m.verticesX.slice(0, m.verticesCount), m.verticesY.slice(0, m.verticesCount), m.verticesZ.slice(0, m.verticesCount)];
            if (prev && prev[0].length === now[0].length) {
                let most = 0;
                for (let v = 0; v < now[0].length; v++) {
                    most = Math.max(most, Math.hypot(now[0][v] - prev[0][v], now[1][v] - prev[1][v], now[2][v] - prev[2][v]));
                }
                const speed = most / (seq.frameLengths[i - 1] || 1);
                if (speed > best.speed) {
                    best = { at: tick, speed };
                }
            }
            prev = now;
        }
        tick += seq.frameLengths[i] || 1;
    }
    return best.at / total;
}

if (npcArg === "--monsters") {
    // Every monster and guardian: its attack's length and fastest share, and the seqs beside its
    // attack on its skeleton that it doesn't already use (a block is usually one of them)
    const { MONSTERS, BOSSES } = await import("../src/content/monsters");
    for (const def of [...Object.values(MONSTERS), ...Object.values(BOSSES)]) {
        const on = state.npcTypeLoader.load(def.npcId);
        const attack = state.seqTypeLoader.load(def.seqs.attack);
        const length = attack.frameLengths?.reduce((a, b) => a + b, 0) ?? 0;
        const bone = skeleton(def.seqs.attack);
        const used = new Set(Object.values(def.seqs));
        const near: string[] = [];
        for (let id = def.seqs.attack - 10; id <= def.seqs.attack + 10; id++) {
            if (id >= 0 && !used.has(id) && skeleton(id) === bone) {
                const seq = state.seqTypeLoader.load(id);
                near.push(`${id}(${seq.frameLengths.reduce((a, b) => a + b, 0)})`);
            }
        }
        console.log(
            `${def.id.padEnd(16)} npc ${String(def.npcId).padEnd(6)} attack ${String(def.seqs.attack).padEnd(5)} ${String(length).padStart(3)} ticks, ${def.attackSeconds}s hit ${def.hitAt ?? 0.5}  fastest ${fastestShare(on, def.seqs.attack).toFixed(2)}  near ${near.join(" ")}`,
        );
    }
} else if (rest[0] === "--near") {
    const around = Number(rest[1]);
    const bone = skeleton(around);
    for (let id = around - 12; id <= around + 12; id++) {
        if (id >= 0 && skeleton(id) === bone) {
            const seq = state.seqTypeLoader.load(id);
            console.log(`  ${id}: ${seq.frameIds.length} frames, ${seq.frameLengths.reduce((a, b) => a + b, 0)} ticks`);
        }
    }
} else {
    for (const id of rest) {
        motion(Number(id));
    }
}
