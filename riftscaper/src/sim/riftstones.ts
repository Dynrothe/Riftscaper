// Riftstones and the Heartstone's shards (content/riftstones.ts): rolling them as they drop, what
// the runes do to a riftstone, and the shards the hero holds. Everything random comes from the Rng
// it's handed, so a seed drops the same stones and a hero's crafting seed weaves the same ones.
import type { Rng } from "../../../engine/core/Rng";
import { RIFT_MODS, RiftModId } from "../content/riftMods";
import { HEART, HEART_SHARDS, RIFTSTONE, RIFTSTONE_BASE, SHARD_BY_BASE, SHARD_IDS, ShardId } from "../content/riftstones";
import type { RuneId } from "../content/runes";
import type { Hero } from "./hero";
import type { Item } from "./loot";
import { riftModsFor } from "./riftMods";

export function isRiftstone(item: Item): boolean {
    return item.base === RIFTSTONE_BASE;
}

export function isShard(item: Item): boolean {
    return SHARD_BY_BASE.has(item.base);
}

// A key to a rift, not something worn
export function isRiftKey(item: Item): boolean {
    return isRiftstone(item) || isShard(item);
}

export function shardOf(item: Item): ShardId | undefined {
    return SHARD_BY_BASE.get(item.base)?.id;
}

// Modifiers woven in for a rift this deep, none twice and none it has already, by their weights,
// in the order they're listed in
export function weaveMods(rng: Rng, depth: number, count: number, has: readonly RiftModId[] = []): RiftModId[] {
    const pool = riftModsFor(depth).filter((id) => !has.includes(id));
    const chosen = [...has];
    for (let i = 0; i < count && pool.length > 0; i++) {
        const at = Math.max(0, rng.weightedIndex(pool.map((id) => RIFT_MODS[id].weight)));
        chosen.push(pool[at]);
        pool.splice(at, 1);
    }
    return (Object.keys(RIFT_MODS) as RiftModId[]).filter((id) => chosen.includes(id));
}

function between(rng: Rng, [lo, hi]: [number, number]): number {
    return lo + rng.int(hi - lo + 1);
}

// A riftstone of a depth as it falls: normal mostly, magic or rare now and then, more often with
// rarity (half of it counts)
export function rollRiftstone(rng: Rng, uid: number, depth: number, rarity: number): Item {
    const more = 1 + rarity * 0.5;
    const roll = rng.next();
    const item: Item = { uid, base: RIFTSTONE_BASE, rarity: "normal", level: Math.max(1, depth), mods: [], rift: [] };
    if (roll < RIFTSTONE.rareChance * more) {
        item.rarity = "rare";
        item.rift = weaveMods(rng, depth, between(rng, RIFTSTONE.rareMods));
    } else if (roll < (RIFTSTONE.rareChance + RIFTSTONE.magic) * more) {
        item.rarity = "magic";
        item.rift = weaveMods(rng, depth, between(rng, RIFTSTONE.magicMods));
    }
    return item;
}

// The shards a hero holds, in the pack and the stash, by kind
export function shardsHeld(hero: Hero): Record<ShardId, number> {
    const held = { air: 0, water: 0, earth: 0, fire: 0 };
    for (const item of [...hero.inventory, ...hero.stash]) {
        const id = item ? shardOf(item) : undefined;
        if (id) {
            held[id]++;
        }
    }
    return held;
}

// A shard as a guardian sheds it: one the hero hasn't got is likelier, so a set comes together
export function rollShard(rng: Rng, uid: number, level: number, hero: Hero): Item {
    const held = shardsHeld(hero);
    const id = SHARD_IDS[Math.max(0, rng.weightedIndex(SHARD_IDS.map((s) => (held[s] > 0 ? 1 : HEART.lacking))))];
    return { uid, base: HEART_SHARDS[id].base, rarity: "unique", level, mods: [] };
}

// Whether the pack holds one of each shard
export function hasAllShards(hero: Hero): boolean {
    return SHARD_IDS.every((id) => hero.inventory.some((item) => item && shardOf(item) === id));
}

// One of each shard out of the pack, given to the Archmage; false if there isn't one of each
export function takeShards(hero: Hero): boolean {
    if (!hasAllShards(hero)) {
        return false;
    }
    for (const id of SHARD_IDS) {
        const i = hero.inventory.findIndex((item) => item && shardOf(item) === id);
        hero.inventory[i] = null;
    }
    return true;
}

// The most modifiers a riftstone of its rarity can hold
function most(item: Item): number {
    return item.rarity === "magic" ? RIFTSTONE.most.magic : item.rarity === "rare" ? RIFTSTONE.most.rare : 0;
}

// Why a rune can't be used on a riftstone, if it can't: as on gear, but its modifiers are the
// rift's (Soul has no numbers to roll)
export function riftstoneWhyNot(item: Item, rune: RuneId): string | undefined {
    const mods = item.rift ?? [];
    switch (rune) {
        case "air":
        case "nature":
            return item.rarity === "normal" ? undefined : "It works only on a plain riftstone.";
        case "mind":
            return item.rarity === "magic" ? undefined : "It works only on a magic riftstone.";
        case "chaos":
            return item.rarity === "rare" ? undefined : "It works only on a rare riftstone.";
        case "cosmic":
            if (item.rarity === "normal") {
                return "It works only on a magic or rare riftstone.";
            }
            if (mods.length >= most(item) || riftModsFor(item.level).length <= mods.length) {
                return "It has no room for another modifier.";
            }
            return undefined;
        case "death":
            if (item.rarity === "normal") {
                return "It works only on a magic or rare riftstone.";
            }
            return mods.length > 0 ? undefined : "It has no modifiers.";
        case "soul":
            return "A riftstone's modifiers have no numbers to roll.";
    }
}

// The riftstone woven again as the rune does
export function applyRuneToRiftstone(rng: Rng, item: Item, rune: RuneId): string | undefined {
    const why = riftstoneWhyNot(item, rune);
    if (why) {
        return why;
    }
    const depth = item.level;
    switch (rune) {
        case "air":
        case "mind":
            item.rarity = "magic";
            item.rift = weaveMods(rng, depth, between(rng, RIFTSTONE.magicMods));
            break;
        case "nature":
        case "chaos":
            item.rarity = "rare";
            item.rift = weaveMods(rng, depth, between(rng, RIFTSTONE.rareMods));
            break;
        case "cosmic":
            item.rift = weaveMods(rng, depth, 1, item.rift ?? []);
            break;
        case "death": {
            const mods = [...(item.rift ?? [])];
            mods.splice(rng.int(mods.length), 1);
            item.rift = mods;
            break;
        }
    }
    return undefined;
}
