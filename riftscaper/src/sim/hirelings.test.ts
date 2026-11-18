// The hireling (content/hirelings.ts): hired and raised for gold, grows with the hero, wears a weapon
// of its kind, a helm and a body of their cast-offs, and lives under their prayers; in a rift it
// fights beside them, takes what's nearer it than them, and falls, staying fallen till it's raised.
import { makeGrid } from "../../../engine/world/testGrid";
import { HIRELINGS } from "../content/hirelings";
import { BASES } from "../content/items";
import { Game, noInput } from "./Game";
import { Hero, heroStats, newHero, togglePrayer } from "./hero";
import { dismissHireling, giveHireling, hire, hireCost, hireWhyNot, hirelingDps, hirelingStats, ownWeapon, raiseCost, raiseHireling, takeFromHireling } from "./hirelings";
import { plainItem } from "./loot";

const SIZE = 48;
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

function hero(level: number): Hero {
    const h = newHero("warrior", 7);
    h.level = level;
    h.gold = 1e6;
    return h;
}

const bow = BASES.find((b) => b.weapon?.kind === "bow" && b.level <= 5)!;
const sword = BASES.find((b) => b.weapon?.kind === "melee" && b.level <= 5)!;
const helm = BASES.find((b) => b.slot === "head" && b.level <= 5)!;
const ring = BASES.find((b) => b.slot === "ring" && b.level <= 5)!;

describe("hiring", () => {
    it("costs gold by the hero's level, and raising a fallen one costs too", () => {
        const h = hero(30);
        h.gold = hireCost(h) - 1;
        expect(hire(h, "barbarian")).toBeDefined();
        expect(h.hireling).toBeUndefined();
        h.gold = hireCost(h);
        expect(hire(h, "barbarian")).toBeUndefined();
        expect(h.gold).toBe(0);
        expect(h.hireling?.kind).toBe("barbarian");
        h.hireling!.dead = true;
        expect(raiseHireling(h)).toBeDefined();
        h.gold = raiseCost(h);
        expect(raiseHireling(h)).toBeUndefined();
        expect(h.hireling!.dead).toBe(false);
    });

    it("wears a weapon of its kind, a helm and a body, at the hero's level", () => {
        const h = hero(30);
        hire(h, "archer");
        expect(hireWhyNot(h, plainItem(1, sword.id))).toMatch(/bow/);
        expect(hireWhyNot(h, plainItem(2, ring.id))).toBeDefined();
        expect(hireWhyNot(h, plainItem(3, bow.id))).toBeUndefined();
        h.inventory[0] = plainItem(3, bow.id);
        h.inventory[1] = plainItem(4, helm.id);
        const bare = hirelingStats(h)!;
        expect(giveHireling(h, 0)).toBeUndefined();
        expect(giveHireling(h, 1)).toBeUndefined();
        const geared = hirelingStats(h)!;
        expect(h.inventory[0]).toBeNull();
        // Its own bow, the best plain one at the hero's level, gives way to the one given it
        const own = ownWeapon(HIRELINGS.archer, 30)!;
        expect(bare.own).toBe(own.name);
        expect(geared.own).toBeUndefined();
        expect(geared.maxDamage / bow.weapon!.damage[1]).toBeCloseTo(bare.maxDamage / own.weapon!.damage[1], 0);
        expect(geared.armour).toBeGreaterThan(bare.armour);
        // Taken back into the pack
        expect(takeFromHireling(h, "head")).toBeUndefined();
        expect(h.hireling!.equipment.head).toBeUndefined();
        expect(h.inventory.some((i) => i?.uid === 4)).toBe(true);
    });

    it("gives back what it wore when it's sent away, or another's hired", () => {
        const h = hero(30);
        hire(h, "barbarian");
        h.inventory[0] = plainItem(9, sword.id);
        giveHireling(h, 0);
        hire(h, "whiteKnight");
        expect(h.hireling?.kind).toBe("whiteKnight");
        expect(h.inventory.some((i) => i?.uid === 9)).toBe(true);
        h.inventory[0] = plainItem(10, sword.id);
        expect(giveHireling(h, 0)).toBeUndefined();
        expect(dismissHireling(h)).toBeUndefined();
        expect(h.hireling).toBeUndefined();
        expect(h.inventory.some((i) => i?.uid === 10)).toBe(true);
    });

    it("grows with the hero", () => {
        const low = hero(10);
        const high = hero(60);
        hire(low, "battleMage");
        hire(high, "battleMage");
        const a = hirelingStats(low)!;
        const b = hirelingStats(high)!;
        expect(b.maxLife).toBeGreaterThan(a.maxLife * 3);
        expect(hirelingDps(b)).toBeGreaterThan(hirelingDps(a) * 3);
    });

    it("lives under the hero's prayers, and a White Knight's Defiance is theirs while it stands", () => {
        const h = hero(80);
        const plain = heroStats(h).armour;
        hire(h, "whiteKnight");
        expect(heroStats(h).armour).toBe(Math.round(plain * (1 + HIRELINGS.whiteKnight.defiance!)));
        h.hireling!.dead = true;
        expect(heroStats(h).armour).toBe(plain);
        h.hireling!.dead = false;
        const before = hirelingStats(h)!;
        togglePrayer(h, "protectMelee");
        togglePrayer(h, "steelSkin");
        const after = hirelingStats(h)!;
        expect(after.protect.melee).toBeGreaterThan(0);
        expect(after.armour).toBe(Math.round(before.armour * 1.4));
    });
});

describe("the hireling in a rift", () => {
    function game(h: Hero): Game {
        return new Game(land(), h, { depth: 20, seed: 3, spawn: { x: BASE_X + 24.5, y: BASE_Y + 24.5 } });
    }

    it("comes in beside the hero, and stays out fallen", () => {
        const h = hero(30);
        expect(game(h).hireling).toBeUndefined();
        hire(h, "barbarian");
        const g = game(h);
        expect(g.hireling?.kind).toBe("barbarian");
        expect(Math.hypot(g.hireling!.x - g.hero.x, g.hireling!.y - g.hero.y)).toBeLessThan(3);
        h.hireling!.dead = true;
        expect(game(h).hireling).toBeUndefined();
    });

    it("fights what's near the hero", () => {
        const h = hero(30);
        hire(h, "barbarian");
        const g = game(h);
        const near = g.monsters.filter((m) => m.state !== "dead").sort((a, b) => Math.hypot(a.x - g.hero.x, a.y - g.hero.y) - Math.hypot(b.x - g.hero.x, b.y - g.hero.y))[0];
        // The hero stands off, the hireling beside it
        g.hero.x = near.x - 4;
        g.hero.y = near.y;
        g.hireling!.x = near.x - 1.2;
        g.hireling!.y = near.y;
        const life = near.life;
        const heroLife = g.hero.life;
        for (let i = 0; i < 100 && near.life === life; i++) {
            g.hero.life = heroLife;
            g.step(noInput());
        }
        expect(near.life).toBeLessThan(life);
    });

    it("takes the blows of what's nearer it than the hero, and falls", () => {
        const h = hero(30);
        hire(h, "archer");
        const g = game(h);
        const near = g.monsters.filter((m) => m.state !== "dead" && !m.def.ranged).sort((a, b) => Math.hypot(a.x - g.hero.x, a.y - g.hero.y) - Math.hypot(b.x - g.hero.x, b.y - g.hero.y))[0];
        g.hero.x = near.x - 6;
        g.hero.y = near.y;
        g.hireling!.x = near.x - 1;
        g.hireling!.y = near.y;
        const most = g.hireStats!.maxLife;
        let fell = false;
        for (let i = 0; i < 20 * 120 && !fell; i++) {
            g.hero.life = g.stats.maxLife;
            g.hero.x = near.x - 6;
            g.hero.y = near.y;
            near.life = near.maxLife;
            g.step(noInput());
            fell = g.takeEvents().some((e) => e.kind === "hirelingDied");
            if (i === 60) {
                expect(g.hireling!.life).toBeLessThan(most);
            }
        }
        expect(fell).toBe(true);
        expect(h.hireling!.dead).toBe(true);
    });

    it("takes less of a protection prayer's kind", () => {
        const plain = hero(50);
        hire(plain, "barbarian");
        const praying = hero(50);
        hire(praying, "barbarian");
        togglePrayer(praying, "protectMelee");
        const a = game(plain).hurtHireling(300, "melee");
        const b = game(praying).hurtHireling(300, "melee");
        expect(b).toBeLessThan(a);
        expect(game(praying).hurtHireling(300, "magic")).toBe(a);
    });
});
