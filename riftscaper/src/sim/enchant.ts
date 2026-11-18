// Aubury's enchanting, at his counter in the city: a ring or an amulet given one of the passive
// tree's notables, which it gives as if it were taken (passives.ts passiveStats), for Cosmic runes
// and gold. Only the main tree's notables, not a wing's nor a class's own inside its start, so a
// build can reach a notable across the tree without the way there; a new one takes the old's place.
import { ENCHANTABLE, PASSIVES } from "../content/passives";
import type { Hero } from "./hero";
import { Item, itemInfo } from "./loot";
import type { RuneTarget } from "./runes";
import { targetItem } from "./runes";

// The Cosmic runes it takes, and gold by the item's level
export const ENCHANT = { cosmic: 2, gold: 60, goldPerLevel: 8 };

export function enchantCost(itemLevel: number): { cosmic: number; gold: number } {
    return { cosmic: ENCHANT.cosmic, gold: Math.round(ENCHANT.gold + Math.max(1, itemLevel) * ENCHANT.goldPerLevel) };
}

// Why it can't be enchanted, if it can't
export function enchantWhyNot(item: Item): string | undefined {
    const slot = itemInfo(item).slot;
    return slot === "ring" || slot === "amulet" ? undefined : "Only a ring or an amulet can be enchanted.";
}

// A notable on a ring or amulet, in the pack or worn: why not, if it can't be
export function enchantItem(hero: Hero, target: RuneTarget, node: number): string | undefined {
    const item = targetItem(hero, target);
    if (!item) {
        return "There's nothing there.";
    }
    const why = enchantWhyNot(item);
    if (why) {
        return why;
    }
    if (!ENCHANTABLE.includes(node)) {
        return "That can't be enchanted.";
    }
    if (item.enchant === node) {
        return `It's enchanted with ${PASSIVES[node].name} already.`;
    }
    const cost = enchantCost(item.level);
    if ((hero.runes.cosmic ?? 0) < cost.cosmic) {
        return `Enchanting takes ${cost.cosmic} Cosmic runes.`;
    }
    if (hero.gold < cost.gold) {
        return `Enchanting costs ${cost.gold} gold.`;
    }
    hero.runes.cosmic -= cost.cosmic;
    hero.gold -= cost.gold;
    item.enchant = node;
    return undefined;
}
