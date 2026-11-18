// Forged gems rolled by the thousand: how much of an archetype's damage they keep after their
// traits' cost, how often each count of traits and each trait comes, and what a skill's damage on
// one enemy is worth with an echo counted in. A check on forge.ts's numbers.
//
//     bun run tsx riftscaper/scripts/forge-sample.ts
import { Rng } from "../../engine/core/Rng";
import { CLASS_IDS } from "../src/content/classes";
import { ARCHETYPE_BY_ID, TRAITS } from "../src/content/forge";
import { forgedGem } from "../src/content/forge";
import { rollForgedGem } from "../src/sim/gems";

const rng = new Rng(1);
const N = 4000;
const counts = [0, 0, 0, 0];
const traitCount = new Map<string, number>();
let kept = 0;
let withEcho = 0;
for (const cls of CLASS_IDS) {
    for (let i = 0; i < N; i++) {
        const r = rollForgedGem(rng, i, 30, cls).forge!;
        const def = forgedGem(r);
        const arch = ARCHETYPE_BY_ID.get(r.arch)!;
        const share = def.skill!.damage / arch.base.damage;
        kept += share;
        withEcho += share * (1 + (def.skill!.traits?.echo ?? 0));
        counts[r.traits.length]++;
        for (const t of r.traits) {
            traitCount.set(t.id, (traitCount.get(t.id) ?? 0) + 1);
        }
    }
}
const all = N * CLASS_IDS.length;
console.log(`Damage kept, of the archetype's, on average: ${((kept / all) * 100).toFixed(1)}%`);
console.log(`and on one enemy, an echo counted in: ${((withEcho / all) * 100).toFixed(1)}%`);
console.log(`Traits: one ${((counts[1] / all) * 100).toFixed(1)}%, two ${((counts[2] / all) * 100).toFixed(1)}%, three ${((counts[3] / all) * 100).toFixed(1)}%`);
for (const t of TRAITS) {
    console.log(`  ${t.id.padEnd(12)} ${(((traitCount.get(t.id) ?? 0) / all) * 100).toFixed(1)}% of gems`);
}
