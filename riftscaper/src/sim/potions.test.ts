// Potions: the belt's places, which are open, and what goes in each, kills filling them, the Apothecary's brewing up,
// instils and elixirs, an old save's doses mended, and a drink in a rift, Barbarian Herblore's too.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { BASES } from "../content/items";
import { PASSIVES } from "../content/passives";
import { BELT_ERRANDS, BREW_UP, ELIXIRS, ELIXIR_SECONDS, INSTILS, LIFE_GRADES, instilCost } from "../content/potions";
import { Game, noInput } from "./Game";
import { heroStats, newHero, statTotals, toBelt, whyNotEquip } from "./hero";
import { Item, itemInfo, rollPotion } from "./loot";
import {
    beltErrand,
    beltOpen,
    beltPlaceFor,
    beltPlaces,
    beltShutText,
    beltWhyNot,
    brewUp,
    brewUpCost,
    clearShutPlaces,
    dosesLeft,
    drinkElixir,
    errandDrops,
    fillBelt,
    instil,
    isErrandGood,
    killFill,
    mendPotion,
    mostDoses,
    potionDef,
    stitchBelt,
    stitchWhyNot,
} from "./potions";

const SIZE = 40;

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
    return makeGrid(rows, 100, 200);
}

function potion(name: string, uid = 500): Item {
    const base = BASES.find((b) => b.slot === "potion" && b.name === name)!;
    const item: Item = { uid, base: base.id, rarity: "normal", level: 1, mods: [] };
    item.charges = mostDoses(item);
    return item;
}

describe("potions", () => {
    it("start in the belt, a life potion first and a mana potion second, and only there", () => {
        const hero = newHero("warrior", 1);
        expect(potionDef(hero.potions[0]!)?.family).toBe("life");
        expect(potionDef(hero.potions[1]!)?.family).toBe("mana");
        expect(hero.potions.length).toBe(4);
        const life = potion("Guthix rest");
        expect(beltWhyNot(life, 0)).toBeUndefined();
        expect(beltWhyNot(life, 1)).toMatch(/mana/);
        expect(beltWhyNot(life, 2)).toBeUndefined();
        // The first empty place that takes it, once it's open
        hero.beltStitched = 1;
        expect(beltPlaceFor(hero, life)).toBe(2);
        const sword = { uid: 9, base: BASES.find((b) => b.slot === "weapon")!.id, rarity: "normal", level: 1, mods: [] } as Item;
        expect(beltWhyNot(sword, 2)).toMatch(/Only a potion/);
    });

    it("open the belt's last two places only for the Apothecary's errands, however deep the hero goes", () => {
        const hero = newHero("warrior", 1);
        expect(beltPlaces(hero)).toBe(2);
        expect(beltOpen(hero, 2)).toBe(false);
        hero.maxDepth = 40;
        expect(beltPlaces(hero)).toBe(2);
        hero.beltStitched = 1;
        expect(beltPlaces(hero)).toBe(3);
        hero.beltStitched = 2;
        expect(beltPlaces(hero)).toBe(4);
        expect(beltOpen(hero, 4)).toBe(false);
        expect(beltShutText(2)).toMatch(/Apothecary can stitch your belt's third place on: bring her the Wine of Zamorak K'ril Tsutsaroth drops at the end of rift 8/);
        expect(beltShutText(3)).toMatch(/fourth place on, once the third is on: bring her the Jar of darkness Skotizo drops at the end of rift 16/);
    });

    it("are stitched on one at a time, for the errand's good, its herbs and its gold", () => {
        const hero = newHero("warrior", 1);
        const [third, fourth] = BELT_ERRANDS;
        expect(stitchWhyNot(hero)).toMatch(/needs the Wine of Zamorak: K'ril Tsutsaroth drops it/);
        hero.goods[third.good] = 1;
        expect(stitchBelt(hero)).toMatch(/needs 5 × Grimy ranarr weed/);
        hero.goods[third.herb] = third.count + 1;
        hero.gold = third.gold - 1;
        expect(stitchBelt(hero)).toMatch(/afford/);
        // The fourth's good doesn't stand in for the third's
        hero.goods[third.good] = 0;
        hero.goods[fourth.good] = 1;
        hero.gold = third.gold + 50;
        expect(stitchWhyNot(hero)).toMatch(/Wine of Zamorak/);
        hero.goods[third.good] = 1;
        expect(stitchBelt(hero)).toBe(2);
        expect(beltPlaces(hero)).toBe(3);
        expect(hero.goods[third.good]).toBe(0);
        expect(hero.goods[third.herb]).toBe(1);
        expect(hero.gold).toBe(50);
        expect(beltErrand(hero)).toBe(fourth);
        hero.goods[fourth.herb] = fourth.count;
        hero.gold = fourth.gold;
        expect(stitchBelt(hero)).toBe(3);
        expect(hero.goods[fourth.good]).toBe(0);
        expect(beltPlaces(hero)).toBe(4);
        expect(stitchWhyNot(hero)).toMatch(/all its places/);
        expect(stitchBelt(hero)).toMatch(/all its places/);
    });

    it("are earned with what K'ril and Skotizo drop, each while it's needed and the hero hasn't one", () => {
        const hero = newHero("warrior", 1);
        expect(errandDrops(hero, "kril")).toEqual(["wineOfZamorak"]);
        expect(errandDrops(hero, "skotizo")).toEqual(["jarOfDarkness"]);
        expect(errandDrops(hero, "countDraynor")).toEqual([]);
        hero.goods.wineOfZamorak = 1;
        expect(errandDrops(hero, "kril")).toEqual([]);
        hero.goods.wineOfZamorak = 0;
        hero.beltStitched = 1;
        expect(errandDrops(hero, "kril")).toEqual([]);
        expect(errandDrops(hero, "skotizo")).toEqual(["jarOfDarkness"]);
        hero.beltStitched = 2;
        expect(errandDrops(hero, "skotizo")).toEqual([]);
        expect(isErrandGood("jarOfDarkness")).toBe(true);
        expect(isErrandGood("ranarr")).toBe(false);
    });

    it("drop the Wine of Zamorak where K'ril falls, with the rest of his loot as it was", () => {
        const slay = (hero: ReturnType<typeof newHero>) => {
            const game = new Game(land(), hero, { depth: 8, seed: 8, spawn: { x: 104.5, y: 204.5 } });
            const boss = game.boss!;
            expect(boss.def.id).toBe("kril");
            boss.life = 1;
            game.hero.x = game.hero.prevX = boss.x - 1.2;
            game.hero.y = game.hero.prevY = boss.y;
            for (let i = 0; i < 200 && !game.portalOpen; i++) {
                const input = noInput();
                input.targetUid = boss.uid;
                input.skills[0] = true;
                input.hasAim = true;
                input.aimX = boss.x;
                input.aimY = boss.y;
                game.step(input);
            }
            expect(game.portalOpen).toBe(true);
            return game;
        };
        const needs = slay(newHero("mage", 8));
        const wine = needs.drops.filter((d) => d.good?.id === "wineOfZamorak");
        expect(wine.length).toBe(1);
        expect(needs.takeEvents().some((e) => e.kind === "errandDrop" && e.id === "wineOfZamorak")).toBe(true);
        // A hero with the place on gets none, and every other drop the same
        const done = newHero("mage", 8);
        done.beltStitched = 1;
        const without = slay(done);
        expect(without.drops.some((d) => d.good?.id === "wineOfZamorak")).toBe(false);
        const rest = (g: Game) => g.drops.filter((d) => d.good?.id !== "wineOfZamorak").map((d) => [d.x, d.y, d.gold, d.item?.base, d.rune?.id, d.good?.id]);
        expect(rest(without)).toEqual(rest(needs));
    });

    it("go only in a place that's open, and say what opens the rest", () => {
        const hero = newHero("warrior", 1);
        hero.level = 20;
        const combat = potion("Super defence");
        // Only the last two places take a combat potion, and neither is open
        expect(beltPlaceFor(hero, combat)).toBe(-1);
        expect(whyNotEquip(hero, combat)).toMatch(/stitch your belt's third place/);
        hero.inventory[0] = combat;
        expect(toBelt(hero, 0, 2)).toMatch(/stitch your belt's third place/);
        expect(hero.potions[2]).toBeNull();
        // A life potion goes in for the one there, as ever
        expect(beltPlaceFor(hero, potion("Guthix rest", 501))).toBe(0);
        hero.beltStitched = 1;
        expect(toBelt(hero, 0, 2)).toBeUndefined();
        expect(hero.potions[2]).toBe(combat);
        hero.inventory[0] = potion("Stamina potion", 502);
        expect(toBelt(hero, 0, 3)).toMatch(/fourth place/);
    });

    it("can't be drunk from a place that isn't open", () => {
        const hero = newHero("warrior", 2);
        hero.potions[2] = potion("Super defence");
        const game = new Game(land(), hero, { depth: 1, seed: 2, spawn: { x: 104.5, y: 204.5 } });
        game.monsters.length = 0;
        const input = noInput();
        input.potion = 2;
        game.step(input);
        const events = game.takeEvents();
        expect(events.some((e) => e.kind === "noPotion" && e.why === "shut")).toBe(true);
        expect(events.some((e) => e.kind === "potion")).toBe(false);
    });

    it("in a place not open yet, from a save of before, go into the pack, or the stash", () => {
        const hero = newHero("warrior", 3);
        const a = potion("Super defence", 600);
        const b = potion("Stamina potion", 601);
        hero.potions[2] = a;
        hero.potions[3] = b;
        hero.inventory.fill({ ...a, uid: 700 });
        hero.inventory[5] = null;
        clearShutPlaces(hero);
        expect(hero.potions[2]).toBeNull();
        expect(hero.potions[3]).toBeNull();
        expect(hero.inventory[5]).toBe(a);
        expect(hero.stash).toContain(b);
        // Kept where it is when it's open
        const open = newHero("warrior", 4);
        open.beltStitched = 2;
        open.potions[3] = b;
        clearShutPlaces(open);
        expect(open.potions[3]).toBe(b);
    });

    it("each have an id of their own, as every base does", () => {
        expect(new Set(BASES.map((b) => b.id)).size).toBe(BASES.length);
        expect(BASES.filter((b) => b.slot === "potion").map((b) => b.id)).toContain("xerics_aid_plus");
    });

    it("fill a share of a dose a kill, more for a rare's, and to the full in the city", () => {
        const hero = newHero("ranger", 2);
        const flask = hero.potions[0]!;
        flask.charges = 0;
        killFill(hero, 1, 0);
        expect(dosesLeft(flask)).toBeCloseTo(potionDef(flask)!.perKill);
        killFill(hero, 2, 0.5);
        expect(dosesLeft(flask)).toBeCloseTo(potionDef(flask)!.perKill * (1 + 2 * 1.5));
        killFill(hero, 1000, 0);
        expect(dosesLeft(flask)).toBe(mostDoses(flask));
        flask.charges = 0;
        fillBelt(hero, true);
        expect(dosesLeft(flask)).toBe(mostDoses(flask));
    });

    it("are brewed up a grade with herbs and gold, their affixes kept, as high as the hero's level lets", () => {
        const hero = newHero("mage", 3);
        const item = potion("Guthix rest");
        item.mods = [{ affix: "pAmple", tier: 0, values: [1] }];
        hero.goods[BREW_UP[2].herb] = BREW_UP[2].count;
        hero.gold = BREW_UP[2].gold;
        expect(brewUp(hero, item)).toMatch(/level/);
        hero.goods = {};
        hero.gold = 0;
        hero.level = 60;
        const cost = brewUpCost(hero, item);
        expect(typeof cost).toBe("object");
        expect(brewUp(hero, item)).toMatch(/need/);
        hero.goods[BREW_UP[2].herb] = BREW_UP[2].count;
        hero.gold = BREW_UP[2].gold;
        expect(brewUp(hero, item)).toBeUndefined();
        expect(itemInfo(item).name).toContain(LIFE_GRADES[1].name);
        expect(item.mods).toEqual([{ affix: "pAmple", tier: 0, values: [1] }]);
        expect(dosesLeft(item)).toBe(mostDoses(item));
        expect(hero.gold).toBe(0);
        expect(hero.goods[BREW_UP[2].herb]).toBe(0);
        // Up to the finest, and no further
        for (const g of [3, 4, 5] as const) {
            hero.goods[BREW_UP[g].herb] = BREW_UP[g].count;
            hero.gold = BREW_UP[g].gold;
            expect(brewUp(hero, item)).toBeUndefined();
        }
        expect(brewUpCost(hero, item)).toMatch(/finest/);
    });

    it("are instilled to drink themselves, another way each time", () => {
        const hero = newHero("rogue", 4);
        const item = potion("Prayer potion");
        const cost = instilCost(potionDef(item)!);
        expect(instil(hero, item)).toMatch(/need/);
        hero.goods[cost.herb] = cost.count * 10;
        hero.gold = cost.gold * 10;
        const first = instil(hero, item);
        expect(INSTILS).toContain(first);
        const second = instil(hero, item);
        expect(INSTILS).toContain(second);
        expect(second).not.toBe(first);
        expect(hero.gold).toBe(cost.gold * 8);
    });

    it("make elixirs at the Apothecary's, one at a time, that count in the hero's stats", () => {
        const hero = newHero("paladin", 5);
        const def = ELIXIRS.strength;
        expect(drinkElixir(hero, "strength")).toMatch(/need/);
        const before = statTotals(hero).damagePct;
        hero.goods[def.herb] = def.count;
        hero.gold = def.gold;
        expect(drinkElixir(hero, "strength")).toBeUndefined();
        expect(hero.elixir).toEqual({ id: "strength", left: ELIXIR_SECONDS });
        expect(statTotals(hero).damagePct).toBe(before + def.value);
    });

    it("drop as potions, never rare, with their doses full", () => {
        const rng = new Rng(7);
        for (let i = 0; i < 300; i++) {
            const item = rollPotion(rng, i, 1 + (i % 60), 0.5);
            expect(potionDef(item)).toBeDefined();
            expect(item.rarity).not.toBe("rare");
            expect(dosesLeft(item)).toBe(mostDoses(item));
        }
    });

    it("are mended as a save is read: doses in range, an unknown instil gone", () => {
        const item = potion("Saradomin brew");
        item.charges = 99;
        (item as { instil?: string }).instil = "nonsense";
        mendPotion(item);
        expect(item.charges).toBe(mostDoses(item));
        expect(item.instil).toBeUndefined();
        item.charges = Number.NaN;
        mendPotion(item);
        expect(item.charges).toBe(mostDoses(item));
    });

    it("are drunk in a rift: a dose for life back, and nothing from a dry one", () => {
        const hero = newHero("warrior", 6);
        const game = new Game(land(), hero, { depth: 1, seed: 6, spawn: { x: 104.5, y: 204.5 } });
        game.monsters.length = 0;
        const most = heroStats(hero).maxLife;
        game.hero.life = most * 0.2;
        const input = noInput();
        input.potion = 0;
        game.step(input);
        const events = game.takeEvents();
        expect(events.some((e) => e.kind === "potion")).toBe(true);
        expect(dosesLeft(hero.potions[0]!)).toBeCloseTo(mostDoses(hero.potions[0]!) - 1);
        for (let i = 0; i < 120; i++) {
            game.step(noInput());
        }
        expect(game.hero.life).toBeGreaterThan(most * 0.5);
        hero.potions[1]!.charges = 0.5;
        input.potion = 1;
        game.takeEvents();
        game.step(input);
        expect(game.takeEvents().some((e) => e.kind === "noPotion")).toBe(true);
    });

    it("are damage, not healing, under Barbarian Herblore: three doses at once at the most", () => {
        const hero = newHero("warrior", 7);
        hero.passives = [PASSIVES.find((n) => n.keystone === "barbarianHerblore")!.id];
        const game = new Game(land(), hero, { depth: 1, seed: 7, spawn: { x: 104.5, y: 204.5 } });
        game.monsters.length = 0;
        game.hero.life = 10;
        hero.potions[0]!.charges = 4;
        const input = noInput();
        input.potion = 0;
        for (let i = 0; i < 4; i++) {
            game.step(input);
            game.step(noInput());
        }
        expect(game.hero.life).toBeLessThan(15);
        expect(game.hero.buffs.filter((b) => b.id.startsWith("potion-herblore")).length).toBe(3);
    });
});
