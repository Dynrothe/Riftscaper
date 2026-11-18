// How long each class can use each of its skills without stopping, by level: its mana a second
// while spammed against its regeneration, and the seconds till the pool's dry. A check on the
// mana numbers (MANA_COST_MULT, GEM_MANA_PER_LEVEL, HERO.manaRegenShare).
//
//     bun run tsx riftscaper/scripts/mana-check.ts
import { CLASS_IDS } from "../src/content/classes";
import { GEM_REWARDS, MAX_GEM_LEVEL } from "../src/content/gems";
import { wornGems } from "../src/sim/gems";
import { gainXp, heroStats, newHero } from "../src/sim/hero";
import { resolveSkill } from "../src/sim/skills";
import { xpToNext } from "../src/content/rules";

for (const level of [1, 10, 30, 60]) {
    console.log(`\nLevel ${level}`);
    for (const cls of CLASS_IDS) {
        const hero = newHero(cls, 1);
        let xp = 0;
        for (let l = 1; l < level; l++) {
            xp += xpToNext(l);
        }
        gainXp(hero, xp);
        // Gems as far as the hero's level lets them, about
        for (const w of wornGems(hero)) {
            w.gem.level = Math.max(1, Math.min(MAX_GEM_LEVEL, Math.floor((level - w.def.level) / 2.5) + 1));
        }
        const stats = heroStats(hero);
        const parts: string[] = [];
        for (const w of wornGems(hero)) {
            const r = resolveSkill(hero, stats, w.gem.uid);
            if (!r || r.mana <= 0 || r.def.kind === "buff" || !GEM_REWARDS[cls].some((g) => g.gem === r.def.id)) {
                continue;
            }
            const perUse = Math.max(r.def.castTime / r.speed, r.cooldown);
            const drain = r.mana / perUse;
            const net = drain - stats.manaRegen;
            const secs = net > 0 ? `${Math.round(stats.maxMana / net)}s` : "forever";
            parts.push(`${r.def.name} ${r.mana} (${drain.toFixed(1)}/s): ${secs}`);
        }
        console.log(`  ${cls.padEnd(12)} mana ${String(stats.maxMana).padStart(4)}, ${stats.manaRegen.toFixed(1)}/s | ${parts.join(" · ")}`);
    }
}
