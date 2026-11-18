// A rift's modifiers (content/riftMods.ts) added up: what they do to its monsters and its loot
// together, and what they pay. And the versions of a rift the Archmage offers, rolled from the Rng
// it's handed: the client seeds it with a new seed each time, as it does a rift's.
import type { Rng } from "../../../engine/core/Rng";
import { MAX_RIFT_MODS, RIFT_MODS, RIFT_MOD_IDS, RIFT_OFFERS, RiftEffect, RiftModId, RiftReward } from "../content/riftMods";

export function noEffect(): RiftEffect {
    return {
        monsterLife: 0,
        monsterDamage: 0,
        monsterArmour: 0,
        monsterSpeed: 0,
        packs: 0,
        packSize: 0,
        empowered: 0,
        elemental: 0,
        leech: 0,
        regen: 0,
        bossLife: 0,
        bossDamage: 0,
        bossSpecial: 0,
        time: 0,
    };
}

// What a rift's modifiers do, all told: their shares added
export function riftEffect(mods: readonly RiftModId[]): RiftEffect {
    const total = noEffect();
    for (const id of mods) {
        const effect = RIFT_MODS[id].effect;
        for (const key of Object.keys(effect) as (keyof RiftEffect)[]) {
            total[key] += effect[key] ?? 0;
        }
    }
    return total;
}

// What a rift's modifiers pay, all told
export function riftReward(mods: readonly RiftModId[]): RiftReward {
    const total: RiftReward = { quantity: 0, rarity: 0, runes: 0, xp: 0 };
    for (const id of mods) {
        const reward = RIFT_MODS[id].reward;
        total.quantity += reward.quantity;
        total.rarity += reward.rarity;
        total.runes += reward.runes;
        total.xp += reward.xp;
    }
    return total;
}

// The modifiers that can be woven into a rift this deep
export function riftModsFor(depth: number): RiftModId[] {
    return RIFT_MOD_IDS.filter((id) => RIFT_MODS[id].depth <= depth);
}

// This many modifiers for a rift this deep, none twice, by their weights, in the order they're
// listed in
export function rollRiftMods(rng: Rng, depth: number, count: number): RiftModId[] {
    const pool = riftModsFor(depth);
    const chosen: RiftModId[] = [];
    while (chosen.length < Math.min(count, MAX_RIFT_MODS) && pool.length > 0) {
        const i = Math.max(0, rng.weightedIndex(pool.map((id) => RIFT_MODS[id].weight)));
        chosen.push(pool[i]);
        pool.splice(i, 1);
    }
    return RIFT_MOD_IDS.filter((id) => chosen.includes(id));
}

// The versions of a rift the Archmage offers: the first with none or one modifier, the next one or
// two, the last two or three, so there's always a choice between safe and rich. No two the same.
export function rollRiftOffers(rng: Rng, depth: number, offers = RIFT_OFFERS): RiftModId[][] {
    const out: RiftModId[][] = [];
    for (let i = 0; i < offers; i++) {
        const count = Math.min(MAX_RIFT_MODS, i + rng.int(2));
        let mods = rollRiftMods(rng, depth, count);
        for (let tries = 0; tries < 8 && out.some((o) => sameMods(o, mods)); tries++) {
            mods = rollRiftMods(rng, depth, count);
        }
        out.push(mods);
    }
    return out;
}

function sameMods(a: readonly RiftModId[], b: readonly RiftModId[]): boolean {
    return a.length === b.length && a.every((id) => b.includes(id));
}
