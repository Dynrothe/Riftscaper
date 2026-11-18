// Runes: what they do to an item, which runes a kill drops, and Aubury's runes for gold. A rune is
// used on something in the pack or something worn, and rolls with the hero's own seeded Rng
// (hero.craftSeed), so the same hero using the same runes gets the same items.
import { Rng } from "../../../engine/core/Rng";
import { AFFIX_BY_ID, Slot, UNIQUE_BY_ID } from "../content/items";
import { MAX_AFFIXES, RUNES, RUNE_IDS, RuneId, SHOP_RUNES, runePrice } from "../content/runes";
import type { Hero } from "./hero";
import { applyRuneToRiftstone, isRiftstone, isShard, riftstoneWhyNot } from "./riftstones";
import { Item, TALISMAN_MOST_MODS, affixesFor, familyOf, isGem, itemInfo, leanOf, pickAffix, rareModCount, rareName, rollMagicMods, rollMod, rollRareMods, rollUniqueValues, rollValues, uniqueRange } from "./loot";

export type RunePouch = Record<RuneId, number>;

export function emptyPouch(): RunePouch {
    return Object.fromEntries(RUNE_IDS.map((id) => [id, 0])) as RunePouch;
}

// What a rune's used on: something in the pack, by its place there, something worn, or a potion in
// the belt
export type RuneTarget = { index: number } | { slot: Slot } | { belt: number };

export function targetItem(hero: Hero, target: RuneTarget): Item | undefined {
    if ("belt" in target) {
        return hero.potions[target.belt] ?? undefined;
    }
    return "slot" in target ? hero.equipment[target.slot] : (hero.inventory[target.index] ?? undefined);
}

type Kind = "prefix" | "suffix";

// The kinds of affix it has room for: one of each on a magic item, three on a rare, and only
// those its slot has any more of
function room(item: Item, slot: Slot): Kind[] {
    if (item.rarity !== "magic" && item.rarity !== "rare") {
        return [];
    }
    const most = MAX_AFFIXES[item.rarity];
    // A rare talisman has four at most, of either kind
    if (slot === "talisman" && item.rarity === "rare" && item.mods.length >= TALISMAN_MOST_MODS) {
        return [];
    }
    const taken = new Set(item.mods.map((m) => m.affix));
    const count = { prefix: 0, suffix: 0 };
    for (const mod of item.mods) {
        const affix = AFFIX_BY_ID.get(mod.affix);
        if (affix) {
            count[affix.kind]++;
        }
    }
    return (["prefix", "suffix"] as const).filter((kind) => count[kind] < most && affixesFor(slot, kind, taken, familyOf(item), item.level).length > 0);
}

// Why a rune can't be used on it, if it can't
export function runeWhyNot(item: Item, rune: RuneId): string | undefined {
    if (RUNES[rune].high) {
        return "A high rune does nothing on its own: Aubury inscribes runewords with it, and it goes into his transmuting circle.";
    }
    if (isShard(item)) {
        return "A Heartstone shard can't be changed.";
    }
    if (isRiftstone(item)) {
        return riftstoneWhyNot(item, rune);
    }
    if (isGem(item)) {
        return "Runes work on gear, not on gems.";
    }
    if (item.rarity === "unique") {
        // A Soul rune rolls a unique's numbers again, within their ranges
        if (rune === "soul") {
            const u = UNIQUE_BY_ID.get(item.base);
            if (item.unid) {
                return "Have Reldo read it first.";
            }
            return u && u.stats.some((line) => uniqueRange(u, line)) ? undefined : "Its numbers are fixed.";
        }
        return "A unique item can't be changed.";
    }
    if (item.runeword) {
        return "A runeword can't be changed.";
    }
    if ((rune === "nature" || rune === "chaos") && familyOf(item)) {
        return "A potion can't be rare.";
    }
    switch (rune) {
        case "air":
        case "nature":
            return item.rarity === "normal" ? undefined : "It works only on a normal item.";
        case "mind":
            return item.rarity === "magic" ? undefined : "It works only on a magic item.";
        case "chaos":
            return item.rarity === "rare" ? undefined : "It works only on a rare item.";
        case "cosmic":
            if (item.rarity === "normal") {
                return "It works only on a magic or rare item.";
            }
            return room(item, itemInfo(item).slot).length > 0 ? undefined : "It has no room for another affix.";
        case "death":
        case "soul":
            if (item.rarity === "normal") {
                return "It works only on a magic or rare item.";
            }
            return item.mods.length > 0 ? undefined : "It has no affixes.";
    }
}

// The item changed as the rune does, its affixes rolled for its own level; what it says no to, if
// anything
export function applyRune(rng: Rng, item: Item, rune: RuneId): string | undefined {
    const why = runeWhyNot(item, rune);
    if (why) {
        return why;
    }
    if (isRiftstone(item)) {
        return applyRuneToRiftstone(rng, item, rune);
    }
    const slot = itemInfo(item).slot;
    const level = Math.max(1, item.level);
    // A talisman's rune leans its affixes its own way (items.ts TALISMAN_BASES), and a potion's
    // are its family's
    const lean = leanOf(item);
    const family = familyOf(item);
    switch (rune) {
        case "air":
            item.rarity = "magic";
            item.mods = rollMagicMods(rng, slot, level, lean, family);
            break;
        case "mind":
            item.mods = rollMagicMods(rng, slot, level, lean, family);
            break;
        case "nature":
        case "chaos":
            item.rarity = "rare";
            item.mods = rollRareMods(rng, slot, level, rareModCount(rng, level, slot), lean);
            item.rareName = rareName(rng, slot);
            break;
        case "cosmic": {
            const kinds = room(item, slot);
            const kind = kinds.length === 1 ? kinds[0] : rng.chance(0.5) ? "prefix" : "suffix";
            const affix = pickAffix(rng, affixesFor(slot, kind, new Set(item.mods.map((m) => m.affix)), family, level), lean)!;
            item.mods.push(rollMod(rng, affix, slot, level));
            // Prefixes first, as they roll
            const order = (affix: string) => (AFFIX_BY_ID.get(affix)?.kind === "suffix" ? 1 : 0);
            item.mods.sort((a, b) => order(a.affix) - order(b.affix));
            break;
        }
        case "death":
            item.mods.splice(rng.int(item.mods.length), 1);
            break;
        case "soul":
            if (item.rarity === "unique") {
                const u = UNIQUE_BY_ID.get(item.base)!;
                item.rolls = rollUniqueValues(rng, u);
                break;
            }
            item.mods = item.mods.map((mod) => {
                const affix = AFFIX_BY_ID.get(mod.affix);
                return affix && affix.tiers[mod.tier] ? { ...mod, values: rollValues(rng, affix, mod.tier, slot) } : mod;
            });
            break;
    }
    return undefined;
}

// A rune from the pouch used on something: the item as it is now, or why not. Something worn
// changes the hero's stats, which the caller works out again.
export function useRune(hero: Hero, rune: RuneId, target: RuneTarget): Item | string {
    if ((hero.runes[rune] ?? 0) < 1) {
        return `You have no ${RUNES[rune].name}s.`;
    }
    const item = targetItem(hero, target);
    if (!item) {
        return "There's nothing there.";
    }
    const rng = new Rng(hero.craftSeed);
    const why = applyRune(rng, item, rune);
    if (why) {
        return why;
    }
    hero.craftSeed = rng.position;
    hero.runes[rune]--;
    return item;
}

// A rune a kill drops at an area level: the commoner ones much more often, and the rarest only
// deeper down
export function rollRune(rng: Rng, level: number): { id: RuneId; count: number } {
    const open = RUNE_IDS.filter((id) => RUNES[id].level <= level);
    const id = open[Math.max(0, rng.weightedIndex(open.map((r) => RUNES[r].weight)))];
    return { id, count: 1 + rng.int(RUNES[id].stack) };
}

// Runes off Aubury's counter, for gold: why not, if they can't be had
export function buyRune(hero: Hero, rune: RuneId, count = 1): string | undefined {
    if (!SHOP_RUNES.includes(rune)) {
        return "He doesn't sell those.";
    }
    const cost = runePrice(rune, hero.level) * count;
    if (hero.gold < cost) {
        return "You can't afford that.";
    }
    hero.gold -= cost;
    hero.runes[rune] = (hero.runes[rune] ?? 0) + count;
    return undefined;
}
