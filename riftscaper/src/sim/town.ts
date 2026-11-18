// The city between the rifts, for the sim: who stands where (a plan the city's map hands in), and
// what's on each shop's shelves, rolled for the hero's level and class from a seeded Rng.
import { Rng } from "../../../engine/core/Rng";
import { BASE_BY_ID, SETS, SET_PRICES, SLOTS, UNIQUE_BY_ID } from "../content/items";
import type { GoodId } from "../content/goods";
import { LADDER_DEPTH, PEAK_LEVEL, areaLevel } from "../content/rules";
import { logIt, logItem } from "./log";
import { CLASS_COLORS, GEMS } from "../content/gems";
import { BUY_MARKUP, FolkId, SHOPS, SHOP_IDS, ShopId } from "../content/town";
import { classCanUse, gemDef, gemPrice, makeGem, rollForgedGem } from "./gems";
import type { Hero } from "./hero";
import { cityLevel, freeSlot, nextUid, stow } from "./hero";
import { Item, buyValue, rollItem, rollSockets } from "./loot";
import { fresh } from "./potions";

// "ally": someone met in a ladder rift's encounter, the Void Knight or the Great Guardian
export type PersonKind = "shop" | "archmage" | "banker" | "wizard" | "guard" | "folk" | "ally" | "captain";

// Someone in the city, where the map puts them
export type PersonPlan = {
    kind: PersonKind;
    npcId: number;
    name: string;
    shop?: ShopId;
    // One of the folk, who set tasks (tasks.ts)
    folk?: FolkId;
    // What they're known as, under their name, and what they say when spoken to, where their kind's
    // own don't do (the folk in the streets, the wardens round the tear)
    title?: string;
    lines?: string[];
    x: number;
    y: number;
    // Which way they face when there's nobody to look at (OSRS yaw, 0 south, 1024 north)
    yaw: number;
    // How far from home they wander, in tiles (0 stays put)
    wander: number;
};

export type TownPlan = {
    // Where the Archmage's portal opens, its middle
    portal: { x: number; y: number };
    people: PersonPlan[];
    // The orrery's middle, on the square (content/orrery.ts)
    orrery?: { x: number; y: number };
};

export type StockItem = { item: Item; price: number };

export type Stock = Record<ShopId, StockItem[]>;

// Every shop's shelves, filled again: things for the hero's level, a few above, mostly plain or
// magic and now and then rare, never unique
export function rollStock(rng: Rng, hero: Hero): Stock {
    const stock = {} as Stock;
    for (const id of SHOP_IDS) {
        const shop = SHOPS[id];
        if (shop.gems) {
            stock[id] = rollGemStock(rng, hero, shop.stock);
            continue;
        }
        const items: StockItem[] = [];
        for (let i = 0; i < shop.stock; i++) {
            const level = Math.max(1, cityLevel(hero) + rng.int(4) - 1);
            // The Apothecary's potions: magic at most, their doses full
            const item = shop.potions
                ? fresh(rollItem(rng, nextUid(hero), { level, rarity: 1.5, atMost: "magic", slot: "potion" }))
                : rollItem(rng, nextUid(hero), { level, rarity: 1.5, atMost: "rare", bases: shop.sells });
            items.push({ item, price: buyValue(item, BUY_MARKUP) });
        }
        // Cheapest first, by slot
        items.sort((a, b) => a.price - b.price);
        stock[id] = items;
    }
    return stock;
}

// The gem trader's shelves: gems the hero's level is near, no two the same, about half of the
// class's colour, and only skills the class can use; skills first, then supports, each by the level they need
function rollGemStock(rng: Rng, hero: Hero, count: number): StockItem[] {
    const own = CLASS_COLORS[hero.cls];
    const pool = GEMS.filter((g) => g.level <= cityLevel(hero) + 3 && classCanUse(hero.cls, g));
    const chosen = new Set<string>();
    const items: StockItem[] = [];
    // One place on the shelf is the forged gem's
    for (let i = 0; i < count - 1 && chosen.size < pool.length; i++) {
        const left = pool.filter((g) => !chosen.has(g.id));
        const weights = left.map((g) => (g.color === own[0] ? 2.5 : own.includes(g.color) ? 1.8 : 1));
        const def = left[Math.max(0, rng.weightedIndex(weights))];
        chosen.add(def.id);
        const item = makeGem(nextUid(hero), def.id);
        items.push({ item, price: gemPrice(item) });
    }
    // and one forged gem of the class's, dear, as what's only found otherwise is
    const forged = rollForgedGem(rng, nextUid(hero), cityLevel(hero) + 2, hero.cls);
    items.push({ item: forged, price: gemPrice(forged) });
    items.sort((a, b) => {
        const da = gemDef(a.item)!;
        const db = gemDef(b.item)!;
        return (da.forged ? 1 : 0) - (db.forged ? 1 : 0) || (da.support ? 1 : 0) - (db.support ? 1 : 0) || da.level - db.level || da.name.localeCompare(db.name);
    });
    return items;
}

// A set's piece off a stall in the strangers' camp, for the stall's money (TzHaar-Hur-Tel's obsidian for
// tokkul, the Void Knight's equipment for seals, Felix's raiments for pearls): identified, its
// sockets rolled with the hero's own Rng (as a rune's work is); the item, or why not
export function buySetPiece(hero: Hero, shop: ShopId, piece: string): Item | string {
    const stall = SHOPS[shop].sets;
    const price = SET_PRICES[piece];
    const u = UNIQUE_BY_ID.get(piece);
    if (!stall || price === undefined || !u || !SETS[stall.set].pieces.includes(piece)) {
        return `${SHOPS[shop].keeper} doesn't sell that.`;
    }
    if ((hero.goods[stall.good] ?? 0) < price) {
        return `It costs ${price} ${stall.money}. ${stall.text.split(".")[0]}.`;
    }
    if (freeSlot(hero) < 0) {
        return "Your pack is full.";
    }
    const rng = new Rng(hero.craftSeed);
    const item: Item = { uid: nextUid(hero), base: u.id, rarity: "unique", level: u.level, mods: [], sockets: rollSockets(rng, u.slot, u.level, u.classes, u.weapon) };
    hero.craftSeed = rng.position;
    hero.goods[stall.good] = (hero.goods[stall.good] ?? 0) - price;
    stow(hero, item);
    return item;
}

// ---- The stalls' other wares (docs/late-game.md E) ----

// The piece an elite one's made from: worn first, then in the pack, read
function heldPiece(hero: Hero, base: string): Item | undefined {
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        if (item && item.base === base && !item.unid) {
            return item;
        }
    }
    return hero.inventory.find((item): item is Item => item !== null && item.base === base && !item.unid);
}

// Why a set's piece can't be made elite at its stall, if it can't
export function stallUpgradeWhyNot(hero: Hero, shop: ShopId, to: string): string | undefined {
    const def = SHOPS[shop];
    const up = def.upgrades?.find((u) => u.to === to);
    const stall = def.sets;
    if (!up || !stall || !UNIQUE_BY_ID.has(to)) {
        return `${def.keeper} doesn't make that.`;
    }
    if (!heldPiece(hero, up.from)) {
        return `It's made from a ${UNIQUE_BY_ID.get(up.from)?.name ?? up.from}: bring one, read.`;
    }
    if ((hero.goods[stall.good] ?? 0) < up.price) {
        return `It costs ${up.price} ${stall.money}, and the piece it's made from.`;
    }
    return undefined;
}

// A set's piece made its elite self (the Void Knight's top and robe), for the stall's money: the
// same item, its sockets kept, worn still if it was; the item and whether it's worn, or why not
export function stallUpgrade(hero: Hero, shop: ShopId, to: string): { item: Item; worn: boolean } | string {
    const why = stallUpgradeWhyNot(hero, shop, to);
    if (why) {
        return why;
    }
    const def = SHOPS[shop];
    const up = def.upgrades!.find((u) => u.to === to)!;
    const stall = def.sets!;
    const item = heldPiece(hero, up.from)!;
    hero.goods[stall.good] = (hero.goods[stall.good] ?? 0) - up.price;
    item.base = to;
    item.level = Math.max(item.level, UNIQUE_BY_ID.get(to)!.level);
    logItem(hero, item);
    return { item, worn: SLOTS.some((slot) => hero.equipment[slot] === item) };
}

// A good off a stall for its money (TzHaar-Hur-Tel's uncut onyx, for tokkul): why not, if not
export function buyWare(hero: Hero, shop: ShopId, good: GoodId): string | undefined {
    const def = SHOPS[shop];
    const ware = def.wares?.find((w) => w.good === good);
    const stall = def.sets;
    if (!ware || !stall) {
        return `${def.keeper} doesn't sell that.`;
    }
    if ((hero.goods[stall.good] ?? 0) < ware.price) {
        return `It costs ${ware.price.toLocaleString("en-GB")} ${stall.money}.`;
    }
    hero.goods[stall.good] = (hero.goods[stall.good] ?? 0) - ware.price;
    hero.goods[good] = (hero.goods[good] ?? 0) + 1;
    logIt(hero, good);
    return undefined;
}

// A talisman off Felix's stall for pearls: of the base the hero chooses, rare, or now and then one
// of his uniques instead, rolled with the hero's own Rng (as a set's piece's sockets are)
export function buyTalisman(hero: Hero, shop: ShopId, base: string): Item | string {
    const def = SHOPS[shop];
    const offer = def.talismans;
    const stall = def.sets;
    const b = BASE_BY_ID.get(base);
    const level = cityLevel(hero);
    if (!offer || !stall || !b || b.slot !== "talisman" || b.level > level) {
        return `${def.keeper} doesn't sell that.`;
    }
    if ((hero.goods[stall.good] ?? 0) < offer.price) {
        return `It costs ${offer.price} ${stall.money}.`;
    }
    if (freeSlot(hero) < 0) {
        return "Your pack is full.";
    }
    const rng = new Rng(hero.craftSeed);
    const unique = rng.chance(offer.unique) ? UNIQUE_BY_ID.get(rng.pick(offer.uniques)) : undefined;
    const item: Item = unique
        ? { uid: nextUid(hero), base: unique.id, rarity: "unique", level, mods: [] }
        : rollItem(rng, nextUid(hero), { level, rarity: 0, slot: "talisman", atLeast: "rare", atMost: "rare", bases: (x) => x.id === base });
    hero.craftSeed = rng.position;
    hero.goods[stall.good] = (hero.goods[stall.good] ?? 0) - offer.price;
    stow(hero, item);
    logItem(hero, item);
    return item;
}

// Fortunato's elite gamble, past the campaign: at the deepest area level reached, elite bases
// where they're made, at that level's price (loot.ts gambleCost). Undefined till then.
export function eliteGambleLevel(hero: Hero): number | undefined {
    const level = areaLevel(Math.max(1, hero.maxDepth));
    return hero.maxDepth >= LADDER_DEPTH && level > PEAK_LEVEL ? level : undefined;
}
