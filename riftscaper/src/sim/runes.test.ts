// Runes on items: each does what it says and nothing else, keeps an item within its affix limits,
// says no to what it can't change, and rolls the same for the same hero. What drops them and where,
// picking them up, Aubury's counter, and the banker's stash.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { AFFIX_BY_ID, BASES, Slot, UNIQUES } from "../content/items";
import { STASH } from "../content/rules";
import { RUNES, RUNE_IDS, RuneId, runePrice } from "../content/runes";
import { Game, GameEvent, GameInput, noInput } from "./Game";
import { makeGem } from "./gems";
import { fromStash, newHero, stow, toStash } from "./hero";
import { Item, itemInfo } from "./loot";
import { applyRune, buyRune, rollRune, runeWhyNot, useRune } from "./runes";

const SIZE = 72;
const BASE_X = 100;
const BASE_Y = 200;

function land() {
    const rows: string[] = [];
    for (let row = 0; row < SIZE; row++) {
        let line = "";
        for (let x = 0; x < SIZE; x++) {
            const y = SIZE - 1 - row;
            line += x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1 ? "#" : ".";
        }
        rows.push(line);
    }
    return makeGrid(rows, BASE_X, BASE_Y);
}

function plain(slot: Slot = "body", level = 30, uid = 1): Item {
    const base = BASES.find((b) => b.slot === slot)!;
    return { uid, base: base.id, rarity: "normal", level, mods: [] };
}

function kinds(item: Item): { prefix: number; suffix: number } {
    const count = { prefix: 0, suffix: 0 };
    for (const mod of item.mods) {
        count[AFFIX_BY_ID.get(mod.affix)!.kind]++;
    }
    return count;
}

// No affix twice, and no more of a kind than the rarity allows
function wellFormed(item: Item): void {
    const ids = item.mods.map((m) => m.affix);
    expect(new Set(ids).size).toBe(ids.length);
    const most = item.rarity === "magic" ? 1 : 3;
    const { prefix, suffix } = kinds(item);
    expect(prefix).toBeLessThanOrEqual(most);
    expect(suffix).toBeLessThanOrEqual(most);
}

const rune = (rng: Rng, item: Item, id: RuneId) => expect(applyRune(rng, item, id)).toBeUndefined();

describe("runes on an item", () => {
    it("make a normal item magic (Air), and roll a magic item again (Mind)", () => {
        const rng = new Rng(1);
        const item = plain("weapon");
        rune(rng, item, "air");
        expect(item.rarity).toBe("magic");
        expect(item.mods.length).toBeGreaterThanOrEqual(1);
        expect(item.mods.length).toBeLessThanOrEqual(2);
        wellFormed(item);
        const names = new Set<string>();
        for (let i = 0; i < 20; i++) {
            rune(rng, item, "mind");
            expect(item.rarity).toBe("magic");
            wellFormed(item);
            names.add(itemInfo(item).name);
        }
        expect(names.size).toBeGreaterThan(3);
    });

    it("make a normal item rare (Nature), and roll a rare again, name and all (Chaos)", () => {
        const rng = new Rng(2);
        const item = plain("body", 30);
        rune(rng, item, "nature");
        expect(item.rarity).toBe("rare");
        expect(item.rareName).toBeDefined();
        expect(item.mods.length).toBeGreaterThanOrEqual(3);
        expect(item.mods.length).toBeLessThanOrEqual(6);
        wellFormed(item);
        const names = new Set<string>();
        for (let i = 0; i < 20; i++) {
            rune(rng, item, "chaos");
            expect(item.rarity).toBe("rare");
            expect(item.mods.length).toBeGreaterThanOrEqual(3);
            wellFormed(item);
            names.add(item.rareName!);
        }
        expect(names.size).toBeGreaterThan(5);
    });

    it("add an affix while there's room for one (Cosmic)", () => {
        const rng = new Rng(3);
        const magic = plain("ring");
        rune(rng, magic, "air");
        while (magic.mods.length === 2) {
            rune(rng, magic, "mind");
        }
        rune(rng, magic, "cosmic");
        expect(magic.mods.length).toBe(2);
        wellFormed(magic);
        expect(runeWhyNot(magic, "cosmic")).toBe("It has no room for another affix.");

        const rare = plain("body");
        rune(rng, rare, "nature");
        let added = 0;
        while (!runeWhyNot(rare, "cosmic")) {
            const before = rare.mods.length;
            rune(rng, rare, "cosmic");
            expect(rare.mods.length).toBe(before + 1);
            wellFormed(rare);
            added++;
        }
        expect(rare.mods.length).toBeLessThanOrEqual(6);
        expect(added + 3).toBeLessThanOrEqual(6);
        // Prefixes first once one's been added
        if (added > 0) {
            const order = rare.mods.map((m) => AFFIX_BY_ID.get(m.affix)!.kind);
            expect([...order].sort()).toEqual(order);
        }
    });

    it("take an affix off (Death), and roll the numbers within their tiers (Soul)", () => {
        const rng = new Rng(4);
        const item = plain("weapon", 40);
        rune(rng, item, "nature");
        const count = item.mods.length;
        rune(rng, item, "death");
        expect(item.mods.length).toBe(count - 1);
        expect(item.rarity).toBe("rare");
        const shape = item.mods.map((m) => `${m.affix}:${m.tier}`);
        const values = new Set<string>();
        for (let i = 0; i < 10; i++) {
            rune(rng, item, "soul");
            expect(item.mods.map((m) => `${m.affix}:${m.tier}`)).toEqual(shape);
            values.add(JSON.stringify(item.mods.map((m) => m.values)));
        }
        expect(values.size).toBeGreaterThan(5);
        // Every affix taken off, the item stays rare, and Cosmic can add again
        while (item.mods.length > 0) {
            rune(rng, item, "death");
        }
        expect(runeWhyNot(item, "death")).toBe("It has no affixes.");
        expect(runeWhyNot(item, "cosmic")).toBeUndefined();
    });

    it("say no to what they can't change", () => {
        const normal = plain();
        const magic = plain();
        applyRune(new Rng(5), magic, "air");
        const rare = plain();
        applyRune(new Rng(5), rare, "nature");
        const can = (item: Item) => RUNE_IDS.filter((id) => !runeWhyNot(item, id));
        expect(can(normal)).toEqual(["air", "nature"]);
        expect(can(magic).sort()).toEqual(magic.mods.length < 2 ? ["cosmic", "death", "mind", "soul"] : ["death", "mind", "soul"]);
        expect(can(rare).sort()).toEqual(["chaos", "cosmic", "death", "soul"].filter((id) => id !== "cosmic" || !runeWhyNot(rare, "cosmic")));
        // A unique's numbers roll again with a Soul rune, and nothing else changes it
        const unique: Item = { uid: 9, base: UNIQUES[0].id, rarity: "unique", level: 40, mods: [] };
        expect(can(unique)).toEqual(["soul"]);
        expect(can(makeGem(10, "slash"))).toEqual([]);
        // And leave it as it was
        const before = JSON.stringify(rare);
        expect(applyRune(new Rng(6), rare, "air")).toBe("It works only on a normal item.");
        expect(JSON.stringify(rare)).toBe(before);
    });
});

describe("the rune pouch", () => {
    it("spends a rune, and rolls the same for the same hero", () => {
        const make = () => {
            const hero = newHero("warrior", 42);
            stow(hero, plain("body", 30, 900));
            hero.runes.nature = 1;
            hero.runes.chaos = 2;
            hero.runes.death = 1;
            hero.runes.soul = 1;
            return hero;
        };
        const a = make();
        const b = make();
        const index = a.inventory.findIndex((x) => x?.uid === 900);
        for (const hero of [a, b]) {
            for (const id of ["nature", "chaos", "chaos", "death", "soul"] as RuneId[]) {
                const seed = hero.craftSeed;
                expect(typeof useRune(hero, id, { index })).not.toBe("string");
                expect(hero.craftSeed).not.toBe(seed);
            }
        }
        expect(a.inventory[index]).toEqual(b.inventory[index]);
        expect(RUNE_IDS.every((id) => a.runes[id] === 0)).toBe(true);
        // None left
        const before = JSON.stringify(a.inventory[index]);
        expect(useRune(a, "chaos", { index })).toBe("You have no Chaos runes.");
        expect(JSON.stringify(a.inventory[index])).toBe(before);
        // A rune that does nothing to it isn't spent
        a.runes.air = 1;
        expect(useRune(a, "air", { index })).toBe("It works only on a normal item.");
        expect(a.runes.air).toBe(1);
    });

    it("changes what's worn, and the hero's stats with it", () => {
        const hero = newHero("mage", 7);
        hero.runes.nature = 1;
        const game = new Game(land(), hero, { depth: 1, seed: 7, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const before = game.stats;
        const result = game.useRune("nature", { slot: "body" });
        expect(typeof result).not.toBe("string");
        expect(hero.equipment.body!.rarity).toBe("rare");
        expect(game.stats).not.toBe(before);
    });

    it("buys Air and Mind runes from Aubury, and nothing else", () => {
        const hero = newHero("ranger", 3);
        hero.level = 10;
        hero.gold = 1000;
        expect(buyRune(hero, "air")).toBeUndefined();
        expect(hero.runes.air).toBe(1);
        expect(hero.gold).toBe(1000 - runePrice("air", 10));
        expect(buyRune(hero, "mind")).toBeUndefined();
        expect(hero.gold).toBe(1000 - runePrice("air", 10) - runePrice("mind", 10));
        expect(buyRune(hero, "chaos")).toBe("He doesn't sell those.");
        hero.gold = 0;
        expect(buyRune(hero, "air")).toBe("You can't afford that.");
        expect(hero.runes.air).toBe(1);
    });
});

describe("runes in the rifts", () => {
    it("drop the rarer runes only deeper, the commoner much more often", () => {
        const rng = new Rng(8);
        const shallow = new Set<RuneId>();
        for (let i = 0; i < 2000; i++) {
            shallow.add(rollRune(rng, 1).id);
        }
        expect([...shallow].sort()).toEqual(["air", "mind", "nature"]);
        const counts = Object.fromEntries(RUNE_IDS.map((id) => [id, 0])) as Record<RuneId, number>;
        for (let i = 0; i < 6000; i++) {
            counts[rollRune(rng, 30).id]++;
        }
        // Every rune open at 30 falls; the ladder's high runes don't, till its first depth
        for (const id of RUNE_IDS) {
            if (RUNES[id].high) {
                expect(counts[id], id).toBe(0);
            } else {
                expect(counts[id], id).toBeGreaterThan(0);
            }
        }
        expect(counts.air).toBeGreaterThan(counts.chaos * 3);
        expect(counts.chaos).toBeGreaterThan(counts.soul);
    });

    it("fall from a boss, and are picked up by walking over them", () => {
        const hero = newHero("warrior", 5);
        const game = new Game(land(), hero, { depth: 1, seed: 5, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const boss = game.boss!;
        boss.life = 1;
        const h = game.hero;
        h.x = h.prevX = boss.x - 1.2;
        h.y = h.prevY = boss.y;
        const fell: GameEvent[] = [];
        for (let i = 0; i < 200 && !game.portalOpen; i++) {
            const input: GameInput = noInput();
            input.targetUid = boss.uid;
            input.skills[0] = true;
            input.hasAim = true;
            input.aimX = boss.x;
            input.aimY = boss.y;
            game.step(input);
            fell.push(...game.takeEvents());
        }
        expect(game.portalOpen).toBe(true);
        // At least three, some of them perhaps picked up already by the hero standing over them
        expect(fell.filter((e) => e.kind === "drop" && e.drop.rune).length).toBeGreaterThanOrEqual(3);
        const drop = game.drops.find((d) => d.rune && Math.hypot(d.x - h.x, d.y - h.y) > 2)!;
        expect(drop).toBeDefined();
        h.x = h.prevX = drop.x;
        h.y = h.prevY = drop.y;
        const events: GameEvent[] = [];
        for (let i = 0; i < 5; i++) {
            game.step(noInput());
            events.push(...game.takeEvents());
        }
        expect(game.drops).not.toContain(drop);
        expect(hero.runes[drop.rune!.id]).toBeGreaterThanOrEqual(drop.rune!.count);
        expect(events).toContainEqual({ kind: "rune", id: drop.rune!.id, count: drop.rune!.count });
    });
});

describe("the banker's stash", () => {
    it("keeps things out of the pack, a tab at a time, and gives them back", () => {
        const hero = newHero("warrior", 6);
        const item = plain("legs", 10, 700);
        stow(hero, item);
        const index = hero.inventory.indexOf(item);
        expect(toStash(hero, index, 2)).toBeUndefined();
        expect(hero.inventory[index]).toBeNull();
        expect(hero.stash[2 * STASH.tabSize]).toBe(item);
        expect(fromStash(hero, 2 * STASH.tabSize)).toBeUndefined();
        expect(hero.stash[2 * STASH.tabSize]).toBeNull();
        expect(hero.inventory).toContain(item);
        // A full tab, and a full pack
        for (let i = 0; i < STASH.tabSize; i++) {
            hero.stash[i] = plain("legs", 10, 800 + i);
        }
        const again = hero.inventory.indexOf(item);
        expect(toStash(hero, again, 0)).toBe("That tab of your stash is full.");
        expect(hero.inventory[again]).toBe(item);
        hero.inventory.fill(plain("feet", 10, 999));
        expect(fromStash(hero, 0)).toBe("Your pack is full.");
        expect(hero.stash[0]).not.toBeNull();
    });
});
