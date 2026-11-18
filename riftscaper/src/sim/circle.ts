// The transmuting circle at Aubury's (content/circle.ts): each recipe takes what it needs from the
// pouch and the pack and gives back one thing, or says why not. Nothing here is random, so a
// recipe always gives what it says.
import { Rng } from "../../../engine/core/Rng";
import { CIRCLE, IMBUE_RUNE, MakeDef, UpgradeDef } from "../content/circle";
import { BASES, BASE_BY_ID, BaseDef, MAX_CAPE_LEVEL, MAX_CAPE_PRICE, UNIQUE_BY_ID } from "../content/items";
import { GOODS, GoodId, HERB_IDS } from "../content/goods";
import { RIFTSTONE_BASE } from "../content/riftstones";
import { areaLevel } from "../content/rules";
import { RUNES, RUNE_IDS, RuneId } from "../content/runes";
import { Hero, freeSlot, nextUid, stow } from "./hero";
import { Item, freshUnique, isGem, plainItem, rollSockets, uniqueRange } from "./loot";
import { logItem } from "./log";
import { fresh, potionDef } from "./potions";
import { RuneTarget, targetItem } from "./runes";
import { isRiftstone, isShard } from "./riftstones";

// The next of a rune or a herb, in the pouch's order
export function nextRune(id: RuneId): RuneId | undefined {
    return RUNE_IDS[RUNE_IDS.indexOf(id) + 1];
}

export function nextHerb(id: GoodId): GoodId | undefined {
    return HERB_IDS[HERB_IDS.indexOf(id) + 1];
}

// The secret rift's makings (content/circle.ts CIRCLE.chicken), or why not; undefined is ready
export function chickenWhyNot(hero: Hero): string | undefined {
    const c = CIRCLE.chicken;
    const eggs = hero.goods.egg ?? 0;
    const chickens = hero.goods.rawChicken ?? 0;
    const law = hero.runes.law ?? 0;
    if (eggs >= c.eggs && chickens >= c.chickens && law >= c.law) {
        return undefined;
    }
    return `It takes ${c.eggs} eggs, a raw chicken and a Law rune: you have ${eggs} ${eggs === 1 ? "egg" : "eggs"}, ${chickens} raw ${chickens === 1 ? "chicken" : "chickens"} and ${law} Law ${law === 1 ? "rune" : "runes"}.`;
}

// Whether the bench shows the secret recipe: only to a hero who's found some of its makings
export function chickenKnown(hero: Hero): boolean {
    return (hero.goods.egg ?? 0) > 0 || (hero.goods.rawChicken ?? 0) > 0;
}

// The makings laid in the circle and taken, for the Coop's way (Client.transmute)
export function layChicken(hero: Hero): string | undefined {
    const why = chickenWhyNot(hero);
    if (why) {
        return why;
    }
    const c = CIRCLE.chicken;
    hero.goods.egg = (hero.goods.egg ?? 0) - c.eggs;
    hero.goods.rawChicken = (hero.goods.rawChicken ?? 0) - c.chickens;
    hero.runes.law = (hero.runes.law ?? 0) - c.law;
    return undefined;
}

// Three of a rune for one of the next
export function transmuteRune(hero: Hero, id: RuneId): string | undefined {
    const next = nextRune(id);
    if (!next) {
        return `Nothing comes after the ${RUNES[id].name}.`;
    }
    if ((hero.runes[id] ?? 0) < CIRCLE.three) {
        return `It takes ${CIRCLE.three} ${RUNES[id].name}s.`;
    }
    hero.runes[id] -= CIRCLE.three;
    hero.runes[next] = (hero.runes[next] ?? 0) + 1;
    return undefined;
}

// Three of a herb for one of the next
export function transmuteHerb(hero: Hero, id: GoodId): string | undefined {
    const next = nextHerb(id);
    if (!next || GOODS[id].currency) {
        return `Nothing comes after ${GOODS[id].name}.`;
    }
    if ((hero.goods[id] ?? 0) < CIRCLE.three) {
        return `It takes ${CIRCLE.three} ${GOODS[id].name}.`;
    }
    hero.goods[id] = (hero.goods[id] ?? 0) - CIRCLE.three;
    hero.goods[next] = (hero.goods[next] ?? 0) + 1;
    return undefined;
}

// The places in the pack of the riftstones of a depth
function riftstonesAt(hero: Hero, depth: number): number[] {
    const out: number[] = [];
    hero.inventory.forEach((item, i) => {
        if (item && isRiftstone(item) && item.level === depth) {
            out.push(i);
        }
    });
    return out;
}

// The depths the pack has three riftstones of, for the bench
export function riftstoneDepths(hero: Hero): number[] {
    const depths = new Set<number>();
    for (const item of hero.inventory) {
        if (item && isRiftstone(item) && riftstonesAt(hero, item.level).length >= CIRCLE.three) {
            depths.add(item.level);
        }
    }
    return [...depths].sort((a, b) => a - b);
}

// Three riftstones of a depth for a plain one a depth deeper
export function transmuteRiftstones(hero: Hero, depth: number): Item | string {
    const at = riftstonesAt(hero, depth);
    if (at.length < CIRCLE.three) {
        return `It takes ${CIRCLE.three} riftstones of depth ${depth}.`;
    }
    for (const i of at.slice(0, CIRCLE.three)) {
        hero.inventory[i] = null;
    }
    const item: Item = { uid: nextUid(hero), base: RIFTSTONE_BASE, rarity: "normal", level: depth + 1, mods: [], rift: [] };
    stow(hero, item);
    return item;
}

// The first potion of a family in the pack (not a unique), by its place
function potionAt(hero: Hero, family: "life" | "mana"): number {
    return hero.inventory.findIndex((item) => item !== null && item.rarity !== "unique" && potionDef(item)?.family === family);
}

// The commonest herb the pouch has, to spend
function herbToSpend(hero: Hero): GoodId | undefined {
    return HERB_IDS.find((id) => (hero.goods[id] ?? 0) > 0);
}

// Why the rejuvenation recipe can't be made, if it can't
export function rejuvWhyNot(hero: Hero): string | undefined {
    if (potionAt(hero, "life") < 0 || potionAt(hero, "mana") < 0) {
        return "It takes a life potion and a mana potion from your pack.";
    }
    return herbToSpend(hero) ? undefined : "It takes a herb.";
}

// A life potion, a mana potion and a herb for a rejuvenation potion, its doses full
export function transmuteRejuv(hero: Hero): Item | string {
    const why = rejuvWhyNot(hero);
    if (why) {
        return why;
    }
    const life = potionAt(hero, "life");
    const mana = potionAt(hero, "mana");
    const level = Math.max(hero.inventory[life]!.level, hero.inventory[mana]!.level);
    hero.inventory[life] = null;
    hero.inventory[mana] = null;
    const herb = herbToSpend(hero)!;
    hero.goods[herb] = (hero.goods[herb] ?? 0) - 1;
    const item = fresh({ ...plainItem(nextUid(hero), CIRCLE.rejuv), level });
    stow(hero, item);
    return item;
}

// An item's elite version: of its slot (and a weapon's kind), suiting a class it suits, the
// lowest tier above it; none for what isn't plain gear or is the best already
export function eliteOf(item: Item): BaseDef | undefined {
    if (item.rarity === "unique" || isGem(item) || isRiftstone(item) || isShard(item)) {
        return undefined;
    }
    const base = BASE_BY_ID.get(item.base);
    if (!base || base.slot === "potion" || base.slot === "talisman") {
        return undefined;
    }
    const fits = (b: BaseDef) =>
        b.elite &&
        b.slot === base.slot &&
        b.level > base.level &&
        (base.slot !== "weapon" || b.weapon?.kind === base.weapon?.kind) &&
        (!base.classes || !b.classes || b.classes.some((c) => base.classes!.includes(c)));
    const open = BASES.filter(fits);
    if (open.length === 0) {
        return undefined;
    }
    const lowest = Math.min(...open.map((b) => b.level));
    // Of those at the lowest tier, one of its own family first
    const tier = open.filter((b) => b.level === lowest);
    return tier.find((b) => b.family !== undefined && b.family === base.family) ?? tier[0];
}

// Why an item can't be made elite, if it can't
export function eliteWhyNot(hero: Hero, item: Item | undefined): string | undefined {
    if (!item) {
        return "Choose something from your pack.";
    }
    if (item.rarity !== "normal" || item.runeword) {
        return "Only a normal item: no affixes, no runeword.";
    }
    if (!eliteOf(item)) {
        return "It has no elite version.";
    }
    if ((hero.runes.law ?? 0) < CIRCLE.elite.law || (hero.runes.cosmic ?? 0) < CIRCLE.elite.cosmic) {
        return "It takes a Law rune and a Cosmic rune.";
    }
    return undefined;
}

// A normal item with a Law and a Cosmic rune for its elite version: its level and sockets kept
export function transmuteElite(hero: Hero, target: RuneTarget): Item | string {
    const item = targetItem(hero, target);
    const why = eliteWhyNot(hero, item);
    if (why) {
        return why;
    }
    hero.runes.law -= CIRCLE.elite.law;
    hero.runes.cosmic -= CIRCLE.elite.cosmic;
    item!.base = eliteOf(item!)!.id;
    return item!;
}

// ---- The late game's: upgrades, imbues, joins and makes (docs/late-game.md A) ----

// What an upgrade or an imbue costs in gold, by the item's level
export function upgradeGold(item: Item, up: UpgradeDef): number {
    return (up.imbue ? CIRCLE.gold.imbue : CIRCLE.gold.upgrade) * item.level * item.level;
}

// The goods a recipe takes the hero is short of, as a line, or undefined
function goodsShort(hero: Hero, goods: Partial<Record<GoodId, number>>): string | undefined {
    for (const [id, count] of Object.entries(goods) as [GoodId, number][]) {
        const have = hero.goods[id] ?? 0;
        if (have < count) {
            const name = GOODS[id].name;
            return `It takes ${count} ${name}${count > 1 && !name.endsWith("s") ? "s" : ""}: you have ${have}.`;
        }
    }
    return undefined;
}

function runesShort(hero: Hero, runes: Partial<Record<RuneId, number>>): string | undefined {
    for (const [id, count] of Object.entries(runes) as [RuneId, number][]) {
        if ((hero.runes[id] ?? 0) < count) {
            return `It takes ${count} ${RUNES[id].name}${count === 1 ? "" : "s"}.`;
        }
    }
    return undefined;
}

// The place in the pack of a join's second unique, read, not the item itself
function withAt(hero: Hero, up: UpgradeDef, item: Item): number {
    return hero.inventory.findIndex((it) => it !== null && it !== item && it.base === up.with && !it.unid);
}

// The upgrades an item could be laid in for
export function upgradesOf(item: Item, ups: UpgradeDef[]): UpgradeDef[] {
    return item.rarity === "unique" ? ups.filter((up) => up.from === item.base) : [];
}

// Why an item can't be upgraded so, if it can't
export function upgradeWhyNot(hero: Hero, item: Item | undefined, up: UpgradeDef): string | undefined {
    if (!item) {
        return "Choose something from your pack.";
    }
    if (item.base !== up.from) {
        return `It takes ${UNIQUE_BY_ID.get(up.from)?.name ?? "something else"}.`;
    }
    if (item.unid) {
        return "Have Reldo read it first.";
    }
    const short = up.goods ? goodsShort(hero, up.goods) : undefined;
    if (short) {
        return short;
    }
    if (up.with && withAt(hero, up, item) < 0) {
        return `It takes ${UNIQUE_BY_ID.get(up.with)?.name ?? "a second unique"} from your pack.`;
    }
    if (up.imbue && (hero.runes[IMBUE_RUNE] ?? 0) < 1) {
        return `It takes a ${RUNES[IMBUE_RUNE].name}.`;
    }
    if (!up.with) {
        const gold = upgradeGold(item, up);
        if (hero.gold < gold) {
            return `It takes ${gold.toLocaleString("en-GB")} gold.`;
        }
    }
    return undefined;
}

// A unique laid in with what it takes, for its upgrade: the same item, its level, sockets and gems
// kept, its rolls kept where they were in their ranges
export function transmuteUpgrade(hero: Hero, target: RuneTarget, up: UpgradeDef): Item | string {
    const item = targetItem(hero, target);
    const why = upgradeWhyNot(hero, item, up);
    if (why) {
        return why;
    }
    const it = item!;
    for (const [id, count] of Object.entries(up.goods ?? {}) as [GoodId, number][]) {
        hero.goods[id] = (hero.goods[id] ?? 0) - count;
    }
    if (up.with) {
        hero.inventory[withAt(hero, up, it)] = null;
    } else {
        hero.gold -= upgradeGold(it, up);
    }
    if (up.imbue) {
        hero.runes[IMBUE_RUNE] -= 1;
    }
    const from = UNIQUE_BY_ID.get(up.from)!;
    const to = UNIQUE_BY_ID.get(up.to)!;
    if (it.rolls) {
        const rolls = it.rolls;
        it.rolls = to.stats.map((line, i) => {
            const old = from.stats[i];
            const range = uniqueRange(to, line);
            if (!old || old.stat !== line.stat || !old.value || rolls[i] === undefined || !range) {
                return line.value;
            }
            return Math.max(range[0], Math.min(range[1], Math.round((rolls[i] / old.value) * line.value)));
        });
    }
    it.base = to.id;
    logItem(hero, it);
    return it;
}

// What an upgrade takes besides the unique, as words: "a Kraken tentacle and 12,800 gold"
export function upgradeTakes(item: Item, up: UpgradeDef): string {
    const parts = Object.entries(up.goods ?? {}).map(([id, count]) => countOf(count!, GOODS[id as GoodId].name));
    if (up.with) {
        parts.push(`the ${UNIQUE_BY_ID.get(up.with)?.name ?? "second unique"}`);
    }
    if (up.imbue) {
        parts.push(`a ${RUNES[IMBUE_RUNE].name}`);
    }
    if (!up.with) {
        parts.push(`${upgradeGold(item, up).toLocaleString("en-GB")} gold`);
    }
    return parts.join(" and ");
}

// What a make takes, as words
export function makeTakes(make: MakeDef): string {
    const parts = Object.entries(make.goods).map(([id, count]) => countOf(count!, GOODS[id as GoodId].name));
    for (const [id, count] of Object.entries(make.runes ?? {})) {
        parts.push(countOf(count!, RUNES[id as RuneId].name));
    }
    return parts.join(" and ");
}

// "a Kraken tentacle", "an Uncut onyx", "3 Ancient shards", "50 Sunfire splinters"
function countOf(count: number, name: string): string {
    if (count === 1) {
        return `${/^[AEIOU]/.test(name) ? "an" : "a"} ${name}`;
    }
    return `${count} ${name}${name.endsWith("s") ? "" : "s"}`;
}

// Why a make can't be laid, if it can't
export function makeWhyNot(hero: Hero, make: MakeDef): string | undefined {
    return goodsShort(hero, make.goods) ?? (make.runes ? runesShort(hero, make.runes) : undefined) ?? (freeSlot(hero) < 0 ? "Your pack is full." : undefined);
}

// Whether the bench shows a make: only to a hero who has some of what it takes
export function makeKnown(hero: Hero, make: MakeDef): boolean {
    return Object.keys(make.goods).some((id) => (hero.goods[id as GoodId] ?? 0) > 0);
}

// Goods laid in for a unique, at the deepest rift's level (as it would drop there), read at once
export function transmuteMake(hero: Hero, make: MakeDef): Item | string {
    const why = makeWhyNot(hero, make);
    if (why) {
        return why;
    }
    for (const [id, count] of Object.entries(make.goods) as [GoodId, number][]) {
        hero.goods[id] = (hero.goods[id] ?? 0) - count;
    }
    for (const [id, count] of Object.entries(make.runes ?? {}) as [RuneId, number][]) {
        hero.runes[id] -= count;
    }
    return madeUnique(hero, make.to);
}

// A unique made, not found: at the deepest rift's level, as it would drop there, its sockets and
// rolls from its uid, read at once, and into the pack
function madeUnique(hero: Hero, id: string): Item {
    const u = UNIQUE_BY_ID.get(id)!;
    const uid = nextUid(hero);
    const level = Math.max(u.level, areaLevel(Math.max(1, hero.maxDepth)));
    const item = freshUnique({ uid, base: u.id, rarity: "unique", level, mods: [], sockets: rollSockets(new Rng((uid * 0x2545f491) ^ 0xc1c1e), u.slot, level, u.classes, u.weapon) });
    delete item.unid;
    stow(hero, item);
    logItem(hero, item);
    return item;
}

// ---- Reldo's Max cape, at level 99 (docs/late-game.md D) ----

// Whether the hero has a Max cape already, worn, in the pack or in the stash
function holdsMaxCape(hero: Hero): boolean {
    const is = (item: Item | null | undefined) => item?.base === "max_cape";
    return Object.values(hero.equipment).some(is) || hero.inventory.some(is) || hero.stash.some(is);
}

// Why Reldo won't give one, if he won't
export function maxCapeWhyNot(hero: Hero): string | undefined {
    if (hero.level < MAX_CAPE_LEVEL) {
        return `It's for a hero of level ${MAX_CAPE_LEVEL}.`;
    }
    if (holdsMaxCape(hero)) {
        return "You have one already.";
    }
    if (hero.gold < MAX_CAPE_PRICE) {
        return `It costs ${MAX_CAPE_PRICE.toLocaleString("en-GB")} gold.`;
    }
    return freeSlot(hero) < 0 ? "Your pack is full." : undefined;
}

export function buyMaxCape(hero: Hero): Item | string {
    const why = maxCapeWhyNot(hero);
    if (why) {
        return why;
    }
    hero.gold -= MAX_CAPE_PRICE;
    return madeUnique(hero, "max_cape");
}
