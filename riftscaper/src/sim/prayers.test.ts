// The prayer tab (content/prayers.ts): each prayer keeps a share of the most mana (of the most life,
// with none), comes at its OSRS level, goes one protection and one other at once, and does what it
// says; a protection keeps a share of its kind of hit off, and Retribution saves a hero once a
// minute with a blast.
import { makeGrid } from "../../../engine/world/testGrid";
import { PRAYER, PRAYERS } from "../content/prayers";
import { Game, noInput } from "./Game";
import { PASSIVES } from "../content/passives";
import { Hero, gainXp, heroStats, newHero, prayersOn, togglePrayer } from "./hero";
import { allocate } from "./passives";
import { resolveSkills } from "./skills";

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

function hero(level: number, cls: Hero["cls"] = "warrior"): Hero {
    const h = newHero(cls, 7);
    h.level = level;
    return h;
}

describe("prayers", () => {
    it("keep a share of the most mana while they're on", () => {
        const h = hero(80);
        const before = heroStats(h);
        togglePrayer(h, "chivalry");
        const after = heroStats(h);
        expect(after.manaReserved).toBe(Math.round(before.maxMana * PRAYERS.chivalry.reserve));
        expect(after.maxMana).toBe(before.maxMana - after.manaReserved);
        // Its regeneration is the whole pool's still
        expect(after.manaRegen).toBeCloseTo(before.manaRegen);
    });

    it("keep a quarter less for the prayer classes", () => {
        const paladin = hero(80, "paladin");
        const full = heroStats(paladin).maxMana;
        togglePrayer(paladin, "steelSkin");
        expect(heroStats(paladin).manaReserved).toBe(Math.round(full * PRAYERS.steelSkin.reserve * (1 - PRAYER.lighterBy)));
    });

    it("go one protection and one other at once", () => {
        const h = hero(80);
        expect(togglePrayer(h, "protectMelee")).toBe(true);
        expect(togglePrayer(h, "steelSkin")).toBe(true);
        expect(prayersOn(h)).toEqual(["protectMelee", "steelSkin"]);
        // Another protection puts the first out, and another prayer the other
        togglePrayer(h, "protectMagic");
        togglePrayer(h, "chivalry");
        expect(prayersOn(h).sort()).toEqual(["chivalry", "protectMagic"]);
        // Said again, one goes out
        expect(togglePrayer(h, "chivalry")).toBe(false);
        expect(prayersOn(h)).toEqual(["protectMagic"]);
    });

    it("come at their OSRS levels", () => {
        const h = hero(PRAYERS.chivalry.level - 1);
        expect(togglePrayer(h, "chivalry")).toBe(false);
        expect(prayersOn(h)).toEqual([]);
        h.level++;
        expect(togglePrayer(h, "chivalry")).toBe(true);
        // A save's list that breaks the rule counts the first of each kind
        h.prayers = ["protectMelee", "protectMagic", "chivalry", "steelSkin"];
        expect(prayersOn(h)).toEqual(["protectMelee", "chivalry"]);
    });

    it("do what they say", () => {
        const h = hero(99);
        const plain = heroStats(h);
        togglePrayer(h, "chivalry");
        const chivalry = heroStats(h);
        expect(chivalry.armour).toBe(Math.round(plain.armour * 1.3));
        expect(chivalry.prayerMore.melee).toBeCloseTo(1.15);
        togglePrayer(h, "incredibleReflexes");
        expect(heroStats(h).attackSpeed).toBeCloseTo(plain.attackSpeed * 1.15);
        togglePrayer(h, "rapidHeal");
        expect(heroStats(h).lifeRegen).toBeCloseTo(plain.lifeRegen + plain.maxLife * 0.015);
        // Ultimate Strength makes a melee skill hit harder
        togglePrayer(h, "ultimateStrength");
        const strong = heroStats(h);
        const skill = resolveSkills(h, strong).find((s) => s?.tags.has("melee"));
        const weak = resolveSkills(h, plain).find((s) => s?.tags.has("melee"));
        expect(skill && weak && skill.maxHit / weak.maxHit).toBeCloseTo(1.2);
    });

    it("keep the most life instead, with no mana (Blood Rite)", () => {
        const h = newHero("mage", 1);
        gainXp(h, 1e8);
        h.maxDepth = 60;
        expect(allocate(h, PASSIVES.find((n) => n.keystone === "bloodRite")!.id)).toBeUndefined();
        const plain = heroStats(h);
        togglePrayer(h, "rapidHeal");
        const s = heroStats(h);
        expect(s.maxMana).toBe(0);
        expect(s.lifeReserved).toBe(Math.round(plain.maxLife * PRAYERS.rapidHeal.reserve));
        expect(s.maxLife).toBe(plain.maxLife - s.lifeReserved);
    });
});

describe("prayers in a rift", () => {
    function game(h: Hero): Game {
        return new Game(land(), h, { depth: 20, seed: 3, spawn: { x: BASE_X + 24.5, y: BASE_Y + 24.5 } });
    }

    it("keep a share of a protection's kind of hit off", () => {
        const plain = game(hero(80));
        const praying = hero(80);
        togglePrayer(praying, "protectMelee");
        const g = game(praying);
        const a = plain.hurtHero(200, undefined, false, undefined, "melee");
        const b = g.hurtHero(200, undefined, false, undefined, "melee");
        expect(b).toBeLessThan(a);
        // Not another kind
        const c = g.hurtHero(200, undefined, false, undefined, "magic");
        expect(c).toBe(a);
    });

    it("are said in a rift, and the stats follow", () => {
        const g = game(hero(80));
        const full = g.stats.maxMana;
        expect(g.togglePrayer("augury")).toBe(true);
        expect(g.stats.maxMana).toBe(full - Math.round(full * PRAYERS.augury.reserve));
        expect(g.togglePrayer("augury")).toBe(false);
        expect(g.stats.maxMana).toBe(full);
    });

    it("Retribution leaves the hero standing once a minute, and blasts what's round", () => {
        const h = hero(80);
        togglePrayer(h, "retribution");
        const g = game(h);
        const near = g.monsters.filter((m) => m.state !== "dead").sort((a, b) => Math.hypot(a.x - g.hero.x, a.y - g.hero.y) - Math.hypot(b.x - g.hero.x, b.y - g.hero.y))[0];
        // The hero beside it, and a tick for the sim's lookup to find it
        g.hero.x = near.x - 1;
        g.hero.y = near.y;
        g.step(noInput());
        const life = near.life;
        g.hurtHero(1e7, undefined);
        expect(g.hero.dead).toBe(false);
        expect(g.hero.life).toBe(1);
        expect(near.life).toBeLessThan(life);
        // Not again so soon
        g.hurtHero(1e7, undefined);
        expect(g.hero.dead).toBe(true);
    });
});
