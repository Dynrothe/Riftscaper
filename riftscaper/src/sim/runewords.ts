// Runewords inscribed at Aubury's (content/runewords.ts): what an item has to be to take a word,
// and the word inscribed, its runes spent from the pouch. Nothing here is random.
import { BASE_BY_ID } from "../content/items";
import { RUNEWORDS, RUNEWORD_BY_ID, RunewordDef } from "../content/runewords";
import { RUNES } from "../content/runes";
import type { Hero } from "./hero";
import { isGem, Item } from "./loot";
import { RuneTarget, targetItem } from "./runes";
import { isRiftstone, isShard } from "./riftstones";

export { RUNEWORDS };

// Why a word can't go on an item, if it can't: a normal item of the word's slots and kinds, with
// exactly as many sockets as the word has runes
export function runewordWhyNot(item: Item, word: RunewordDef): string | undefined {
    if (isGem(item) || isRiftstone(item) || isShard(item) || item.rarity === "unique") {
        return "Only a normal item takes a runeword.";
    }
    const base = BASE_BY_ID.get(item.base);
    if (!base || base.slot === "potion" || base.slot === "talisman") {
        return "Only gear takes a runeword.";
    }
    if (item.runeword) {
        return "It has a runeword already.";
    }
    if (item.rarity !== "normal") {
        return "Only a normal item takes a runeword: no affixes.";
    }
    if (!word.slots.includes(base.slot) || (base.slot === "weapon" && word.kinds && base.weapon && !word.kinds.includes(base.weapon.kind))) {
        return `${word.name} doesn't go on that.`;
    }
    const sockets = item.sockets?.length ?? 0;
    if (sockets !== word.runes.length) {
        return `${word.name} needs exactly ${word.runes.length} sockets, and it has ${sockets}.`;
    }
    return undefined;
}

// The runes a word still needs, if the pouch is short of any
export function runesShort(hero: Hero, word: RunewordDef): string | undefined {
    const need = new Map<string, number>();
    for (const r of word.runes) {
        need.set(r, (need.get(r) ?? 0) + 1);
    }
    for (const [r, n] of need) {
        if ((hero.runes[r as keyof typeof hero.runes] ?? 0) < n) {
            return `It takes ${word.runes.map((id) => RUNES[id].name.replace(" rune", "")).join(", ")}: you're short of ${RUNES[r as keyof typeof RUNES].name}s.`;
        }
    }
    return undefined;
}

// The word inscribed, its runes spent: the item as it is now, or why not
export function inscribe(hero: Hero, target: RuneTarget, wordId: string): Item | string {
    const word = RUNEWORD_BY_ID.get(wordId);
    const item = targetItem(hero, target);
    if (!word || !item) {
        return "There's nothing there.";
    }
    const why = runewordWhyNot(item, word) ?? runesShort(hero, word);
    if (why) {
        return why;
    }
    for (const r of word.runes) {
        hero.runes[r]--;
    }
    item.runeword = word.id;
    return item;
}
