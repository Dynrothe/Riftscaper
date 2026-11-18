// The secret rift (content/pinnacles.ts chicken): its makings from a meadow's rifts only, laid in
// the circle and taken, opened by any hero who has them, and its guardian's uniques.
import { makeGrid } from "../../../engine/world/testGrid";
import { CIRCLE } from "../content/circle";
import { GOODS, HERB_IDS } from "../content/goods";
import { PINNACLES } from "../content/pinnacles";
import { chickenKnown, chickenWhyNot, layChicken } from "./circle";
import { Game } from "./Game";
import { newHero } from "./hero";
import { pinnacleWhyNot } from "./pinnacles";

function land() {
    const rows: string[] = [];
    for (let row = 0; row < 96; row++) {
        rows.push(row === 0 || row === 95 ? "#".repeat(96) : `#${".".repeat(94)}#`);
    }
    return makeGrid(rows, 100, 200);
}

function game(depth: number, pinnacle?: "chicken") {
    const hero = newHero("warrior", 9);
    hero.level = 30;
    return new Game(land(), hero, { depth, seed: 41, spawn: { x: 104.5, y: 204.5 }, pinnacle });
}

describe("the secret rift", () => {
    it("drops its makings in a meadow's rifts, and nowhere else, and they aren't herbs", () => {
        const eggs = (g: Game) => {
            let n = 0;
            for (let i = 0; i < 300; i++) {
                const got = g["rollPotions"]({ x: 0, y: 0, level: 20, rank: "boss" }, 0);
                n += got.goods.filter((d) => d.id === "egg" || d.id === "rawChicken").length;
            }
            return n;
        };
        expect(eggs(game(1))).toBeGreaterThan(0);
        expect(eggs(game(2))).toBe(0);
        expect(eggs(game(1, "chicken"))).toBe(0);
        expect(HERB_IDS).not.toContain("egg");
        expect(GOODS.egg.secret && GOODS.rawChicken.secret).toBe(true);
    });

    it("takes three eggs, a raw chicken and a Law rune, whatever the hero's depth", () => {
        const hero = newHero("mage", 3);
        hero.maxDepth = 3;
        expect(chickenKnown(hero)).toBe(false);
        hero.goods.egg = 2;
        hero.goods.rawChicken = 1;
        hero.runes.law = 1;
        expect(chickenKnown(hero)).toBe(true);
        expect(chickenWhyNot(hero)).toContain("2 eggs");
        expect(layChicken(hero)).toBeDefined();
        hero.goods.egg = CIRCLE.chicken.eggs + 1;
        expect(pinnacleWhyNot(hero, "chicken")).toBeUndefined();
        expect(layChicken(hero)).toBeUndefined();
        expect([hero.goods.egg, hero.goods.rawChicken, hero.runes.law]).toEqual([1, 0, 0]);
    });

    it("is led by the Evil Chicken, whose drops are uniques", () => {
        const g = game(5, "chicken");
        const boss = g.monsters.find((m) => m.uid === g["bossUid"])!;
        expect(boss.def.id).toBe(PINNACLES.chicken.zone.boss);
        expect(g.monsters.filter((m) => m.def.id === "chicken").length).toBeGreaterThan(10);
        g["kill"](boss);
        const uniques = g.drops.filter((d) => d.item?.rarity === "unique");
        expect(uniques.length).toBeGreaterThanOrEqual(PINNACLES.chicken.anyUniques!);
    });
});
