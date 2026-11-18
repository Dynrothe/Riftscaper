// Potions as the hero has them: the belt's four places, which are open, and what goes in each, a potion's doses and
// what its affixes add up to, kills and the city filling them, and the Apothecary's work (stitching
// the belt's last two places on for her errands, brewing up a grade, instilling, elixirs), which
// rolls with the hero's crafting seed as the runes do. What a drink does in a rift is Game.drink's.
import { Rng } from "../../../engine/core/Rng";
import { GOODS, GoodId } from "../content/goods";
import { AFFIX_BY_ID, BASE_BY_ID, BASES, StatKey, UNIQUE_BY_ID } from "../content/items";
import { BOSSES } from "../content/monsters";
import {
    BELT_ERRANDS,
    BELT_PLACE_NAMES,
    BELT_START,
    BREW_UP,
    BeltErrand,
    ELIXIRS,
    ELIXIR_SECONDS,
    ElixirId,
    INSTILS,
    Instil,
    LIFE_GRADES,
    MANA_GRADES,
    PotionDef,
    VIAL,
    instilCost,
} from "../content/potions";
import type { Hero } from "./hero";
import type { Item } from "./loot";

// The belt's places: the first a life potion's, the second a mana potion's, the last two any, each
// stitched on by the Apothecary for an errand (content/potions.ts BELT_ERRANDS)
export const BELT_SIZE = BELT_START + BELT_ERRANDS.length;

// The places she's stitched on past the first two
export function beltStitched(hero: Hero): number {
    return Math.max(0, Math.min(BELT_ERRANDS.length, Math.floor(hero.beltStitched ?? 0)));
}

// How many places of the belt are open: always the first so many
export function beltPlaces(hero: Hero): number {
    return BELT_START + beltStitched(hero);
}

export function beltOpen(hero: Hero, place: number): boolean {
    return place >= 0 && place < beltPlaces(hero);
}

// The errand for the next place, if there's one left
export function beltErrand(hero: Hero): BeltErrand | undefined {
    return BELT_ERRANDS[beltStitched(hero)];
}

// What an errand asks, in a line
export function errandText(errand: BeltErrand): string {
    return `the ${GOODS[errand.good].name} ${BOSSES[errand.boss].name} drops at the end of rift ${errand.depth}, ${errand.count} × ${GOODS[errand.herb].name} and ${errand.gold} gold`;
}

// What the Apothecary asks for a place of the belt that isn't open yet
export function beltShutText(place: number): string {
    const errand = BELT_ERRANDS[place - BELT_START];
    if (!errand) {
        return "There's no place in your belt for it.";
    }
    const after = place > BELT_START ? `, once the ${BELT_PLACE_NAMES[place - 1]} is on` : "";
    return `The Apothecary can stitch your belt's ${BELT_PLACE_NAMES[place]} place on${after}: bring her ${errandText(errand)}.`;
}

// Why she can't stitch the next place on, if she can't
export function stitchWhyNot(hero: Hero): string | undefined {
    const errand = beltErrand(hero);
    if (!errand) {
        return "Your belt has all its places.";
    }
    if (goodsOf(hero, errand.good) < 1) {
        return `She needs the ${GOODS[errand.good].name}: ${BOSSES[errand.boss].name} drops it, at the end of rift ${errand.depth}.`;
    }
    if (goodsOf(hero, errand.herb) < errand.count) {
        return `She needs ${errand.count} × ${GOODS[errand.herb].name}.`;
    }
    return hero.gold < errand.gold ? "You can't afford that." : undefined;
}

// The next place stitched on, its errand's goods and gold spent: the place, or why not
export function stitchBelt(hero: Hero): number | string {
    const errand = beltErrand(hero);
    const why = stitchWhyNot(hero);
    if (why || !errand) {
        return why ?? "Your belt has all its places.";
    }
    hero.goods[errand.good] = goodsOf(hero, errand.good) - 1;
    spend(hero, errand.herb, errand.count, errand.gold);
    hero.beltStitched = beltStitched(hero) + 1;
    return beltPlaces(hero) - 1;
}

// What a guardian's death drops for the hero's errands: the good of each it's the guardian of,
// while its place isn't on yet and the hero hasn't one
export function errandDrops(hero: Hero, boss: string): GoodId[] {
    return BELT_ERRANDS.filter((e, i) => e.boss === boss && beltStitched(hero) <= i && goodsOf(hero, e.good) < 1).map((e) => e.good);
}

// Whether a good is one an errand wants
export function isErrandGood(id: GoodId): boolean {
    return BELT_ERRANDS.some((e) => e.good === id);
}

// Why a place of the belt can't be used, if it isn't open
export function beltShutWhy(hero: Hero, place: number): string | undefined {
    if (place < 0 || place >= BELT_SIZE) {
        return "There's no place in your belt for it.";
    }
    return beltOpen(hero, place) ? undefined : beltShutText(place);
}

export function potionDef(item: Item): PotionDef | undefined {
    return item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base)?.potion : BASE_BY_ID.get(item.base)?.potion;
}

export function isPotion(item: Item): boolean {
    return potionDef(item) !== undefined;
}

// What a potion's affixes add up to, of one of their stats
export function potionStat(item: Item, stat: StatKey): number {
    let total = 0;
    for (const mod of item.mods) {
        const affix = AFFIX_BY_ID.get(mod.affix);
        affix?.stats.forEach((s, i) => {
            if (s === stat) {
                total += mod.values[i] ?? 0;
            }
        });
    }
    return total;
}

export function mostDoses(item: Item): number {
    return (potionDef(item)?.doses ?? 0) + potionStat(item, "potionDoses");
}

// The doses it has now: a share of one counts towards the next
export function dosesLeft(item: Item): number {
    return Math.min(mostDoses(item), item.charges ?? mostDoses(item));
}

// Its icon for the doses left: the cache's own object for each, the full one past them, a vial dry
export function potionIcon(item: Item): number {
    const def = potionDef(item);
    if (!def) {
        return VIAL;
    }
    const whole = Math.floor(dosesLeft(item) + 1e-6);
    if (whole < 1) {
        return VIAL;
    }
    return def.icons[Math.min(def.icons.length, whole) - 1];
}

// Why a potion can't go in a place in the belt, if it can't
export function beltWhyNot(item: Item, place: number): string | undefined {
    const def = potionDef(item);
    if (!def) {
        return "Only a potion goes in your belt.";
    }
    if (place === 0 && def.family !== "life") {
        return "Your belt's first place is for a life potion.";
    }
    if (place === 1 && def.family !== "mana") {
        return "Your belt's second place is for a mana potion.";
    }
    return undefined;
}

// Where in the belt a potion goes, if it's put there without saying: an empty open place that
// takes it, or the first open one that takes it
export function beltPlaceFor(hero: Hero, item: Item): number {
    let first = -1;
    for (let i = 0; i < BELT_SIZE; i++) {
        if (!beltOpen(hero, i) || beltWhyNot(item, i)) {
            continue;
        }
        if (!hero.potions[i]) {
            return i;
        }
        if (first < 0) {
            first = i;
        }
    }
    return first;
}

// Why there's no place in the belt for a potion, if there isn't: the places that would take it
// not open yet
export function beltNoPlace(hero: Hero, item: Item): string | undefined {
    if (beltPlaceFor(hero, item) >= 0) {
        return undefined;
    }
    for (let i = 0; i < BELT_SIZE; i++) {
        if (!beltWhyNot(item, i)) {
            return beltShutText(i);
        }
    }
    return "There's no place in your belt for it.";
}

// A potion in a place of the belt that isn't open, as a save from before the places opened has
// one, into the pack, or the stash if that's full; with both full it stays, not to be drunk, till
// it's taken out
export function clearShutPlaces(hero: Hero): void {
    hero.potions.forEach((item, place) => {
        if (!item || beltOpen(hero, place)) {
            return;
        }
        const pack = hero.inventory.indexOf(null);
        const stash = hero.stash.indexOf(null);
        if (pack >= 0) {
            hero.inventory[pack] = item;
        } else if (stash >= 0) {
            hero.stash[stash] = item;
        } else {
            return;
        }
        hero.potions[place] = null;
    });
}

// Every potion in the belt full, as the city fills them (and a shrine of Bandos); Ambrosia only in
// the city
export function fillBelt(hero: Hero, city: boolean): void {
    for (const item of hero.potions) {
        if (item && (city || (potionDef(item)?.perKill ?? 0) > 0)) {
            item.charges = mostDoses(item);
        }
    }
}

// A kill's share of a dose into every potion in the belt (`times` for a rare or a guardian), and
// the tree's and a potion's own faster filling; `besides` a share of a dose more (of Plenty), for
// all but the one it's on
export function killFill(hero: Hero, times: number, faster: number, besides = 0, from = -1): void {
    hero.potions.forEach((item, i) => {
        const def = item && potionDef(item);
        if (!item || !def || def.perKill <= 0) {
            return;
        }
        const add = def.perKill * times * (1 + faster + potionStat(item, "potionRefill") / 100) + (i !== from ? besides : 0);
        item.charges = Math.min(mostDoses(item), dosesLeft(item) + add);
    });
}

// A potion as it starts: its doses full
export function fresh(item: Item): Item {
    if (isPotion(item)) {
        item.charges = mostDoses(item);
    }
    return item;
}

// The best grade of life or mana potion a level can have
export function gradeAt(family: "life" | "mana", level: number): number {
    const grades = family === "life" ? LIFE_GRADES : MANA_GRADES;
    let best = 1;
    grades.forEach((g) => {
        if (g.level <= level) {
            best = g.potion.grade;
        }
    });
    return best;
}

// ---- The Apothecary ----

// What's in the hero's pouch of a good
export function goodsOf(hero: Hero, id: GoodId): number {
    return hero.goods[id] ?? 0;
}

function spend(hero: Hero, herb: GoodId, count: number, gold: number): string | undefined {
    if (goodsOf(hero, herb) < count) {
        return `You need ${count} × ${GOODS[herb].name}.`;
    }
    if (hero.gold < gold) {
        return "You can't afford that.";
    }
    hero.goods[herb] = goodsOf(hero, herb) - count;
    hero.gold -= gold;
    return undefined;
}

// What brewing a potion up a grade would take, or why it can't be
export function brewUpCost(hero: Hero, item: Item): { herb: GoodId; count: number; gold: number; to: string; level: number } | string {
    const def = potionDef(item);
    if (!def || item.rarity === "unique") {
        return "Only a life or mana potion can be brewed up.";
    }
    if (def.family !== "life" && def.family !== "mana") {
        return "Only a life or mana potion can be brewed up.";
    }
    const grades = def.family === "life" ? LIFE_GRADES : MANA_GRADES;
    const next = grades.find((g) => g.potion.grade === def.grade + 1);
    if (!next) {
        return "It's the finest there is.";
    }
    return { ...BREW_UP[next.potion.grade], to: next.name, level: next.level };
}

// A potion brewed up a grade (Diablo IV's alchemist): its affixes kept, its item level the hero's,
// and its doses full. Why not, if it can't be.
export function brewUp(hero: Hero, item: Item): string | undefined {
    const cost = brewUpCost(hero, item);
    if (typeof cost === "string") {
        return cost;
    }
    if (hero.level < cost.level) {
        return `You need to be level ${cost.level} to use a ${cost.to}.`;
    }
    const why = spend(hero, cost.herb, cost.count, cost.gold);
    if (why) {
        return why;
    }
    const base = BASES.find((b) => b.slot === "potion" && b.name === cost.to)!;
    item.base = base.id;
    item.level = Math.max(item.level, hero.level);
    item.charges = mostDoses(item);
    return undefined;
}

// A potion instilled (Path of Exile's enchants): it drinks itself when that happens. One a potion;
// instilling again rolls which, from the others. Why not, if it can't be.
export function instilWhyNot(hero: Hero, item: Item): string | undefined {
    const def = potionDef(item);
    if (!def) {
        return "Only a potion can be instilled.";
    }
    const cost = instilCost(def);
    if (goodsOf(hero, cost.herb) < cost.count) {
        return `You need ${cost.count} × ${GOODS[cost.herb].name}.`;
    }
    return hero.gold < cost.gold ? "You can't afford that." : undefined;
}

export function instil(hero: Hero, item: Item): Instil | string {
    const why = instilWhyNot(hero, item);
    if (why) {
        return why;
    }
    const cost = instilCost(potionDef(item)!);
    spend(hero, cost.herb, cost.count, cost.gold);
    const rng = new Rng(hero.craftSeed);
    const open = INSTILS.filter((i) => i !== item.instil);
    item.instil = rng.pick(open);
    hero.craftSeed = rng.position;
    return item.instil;
}

// An elixir drunk in the city: it lasts so long in the rifts, one at a time. Why not, if it can't be.
export function drinkElixir(hero: Hero, id: ElixirId): string | undefined {
    const def = ELIXIRS[id];
    if (!def) {
        return "There's no such elixir.";
    }
    const why = spend(hero, def.herb, def.count, def.gold);
    if (why) {
        return why;
    }
    hero.elixir = { id, left: ELIXIR_SECONDS };
    return undefined;
}

// Every potion item's doses brought into range, as a save is read
export function mendPotion(item: Item): void {
    if (!isPotion(item)) {
        return;
    }
    const most = mostDoses(item);
    item.charges = Math.max(0, Math.min(most, typeof item.charges === "number" && Number.isFinite(item.charges) ? item.charges : most));
    if (item.instil !== undefined && !INSTILS.includes(item.instil)) {
        delete item.instil;
    }
}
