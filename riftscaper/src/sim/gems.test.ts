// Gems in gear: given as the hero levels, socketed by colour, linked supports making skills
// better, levelling from kills, moving with what's worn, and every skill gem usable in a fight.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { CLASSES, CLASS_IDS, SKILL_SLOTS } from "../content/classes";
import { CLASS_COLORS, GEMS, GEM_BY_ID, GEM_REWARDS, MAX_GEM_LEVEL } from "../content/gems";
import type { ClassId } from "../content/items";
import { BASE_BY_ID } from "../content/items";
import { Game, noInput } from "./Game";
import {
    BASIC,
    autoSocket,
    bindSkill,
    classCanUse,
    gainGemXp,
    gemRequirement,
    linkGroups,
    makeGem,
    rollGem,
    socketGem,
    socketWork,
    unsocketGem,
    wornGems,
} from "./gems";
import { Hero, equipFrom, gainXp, heroStats, newHero, unequip } from "./hero";
import { itemInfo, plainItem, rollItem } from "./loot";
import { resolveSkill, resolveSkills } from "./skills";

const SIZE = 40;
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

// A free inventory place, with a gem put there
function give(hero: Hero, id: string, level = 1): number {
    const i = hero.inventory.indexOf(null);
    hero.inventory[i] = makeGem(hero.nextUid++, id, level);
    return i;
}

describe("gems", () => {
    it("are all whole: a model, a colour, a skill or a support, and the classes' rewards are gems", () => {
        expect(GEMS.length).toBeGreaterThanOrEqual(45);
        for (const g of GEMS) {
            expect(g.objId).toBeGreaterThan(0);
            expect(!!g.skill !== !!g.support).toBe(true);
            if (g.skill) {
                expect("sprite" in g.skill.icon ? g.skill.icon.sprite : g.skill.icon.obj).toBeGreaterThan(0);
                expect(g.skill.castTime).toBeGreaterThan(0);
            }
        }
        for (const cls of CLASS_IDS) {
            for (const reward of GEM_REWARDS[cls]) {
                expect(GEM_BY_ID.has(reward.gem)).toBe(true);
            }
        }
    });

    it("gives a new hero their class's first gems, socketed, linked and on the bar", () => {
        for (const cls of CLASS_IDS) {
            const hero = newHero(cls, 1);
            const worn = wornGems(hero);
            const first = GEM_REWARDS[cls].filter((r) => r.level === 1).map((r) => r.gem);
            expect(worn.map((w) => w.def.id).sort()).toEqual([...first].sort());
            expect(hero.skillBar.length).toBe(SKILL_SLOTS);
            expect(hero.skillBar[0]).toBe(worn.find((w) => w.def.id === first[0])!.gem.uid);
            const skills = resolveSkills(hero, heroStats(hero));
            expect(skills[0]?.why).toBeUndefined();
            expect(skills[0]?.gem?.id).toBe(first[0]);
        }
    });

    it("gives more gems as the hero levels, into sockets where there's room", () => {
        const hero = newHero("warrior", 1);
        const given: string[] = [];
        gainXp(hero, 6000, given);
        expect(given.length).toBeGreaterThan(0);
        const all = [...wornGems(hero).map((w) => w.def.name), ...hero.inventory.filter((x) => x?.rarity === "gem").map((x) => itemInfo(x!).name)];
        for (const name of given) {
            expect(all).toContain(name);
        }
        // Not twice
        const again: string[] = [];
        gainXp(hero, 0, again);
        expect(again).toEqual([]);
    });

    it("goes only into a socket of its colour, or a white one", () => {
        const hero = newHero("ranger", 1);
        const body = hero.equipment.body!;
        body.sockets = [
            { color: "red", linked: true },
            { color: "blue", linked: false },
            { color: "white", linked: false },
        ];
        const green = give(hero, "split");
        expect(socketGem(hero, green, "body", 0)).toMatch(/green socket/);
        expect(socketGem(hero, green, "body", 1)).toMatch(/green socket/);
        expect(socketGem(hero, green, "body", 2)).toBeUndefined();
        expect(body.sockets[2].gem?.base).toBe("split");
        // Out again, into the pack
        expect(unsocketGem(hero, "body", 2)).toBeUndefined();
        expect(body.sockets[2].gem).toBeUndefined();
        expect(hero.inventory.some((x) => x?.base === "split")).toBe(true);
    });

    it("makes a skill better with a support linked to it, and not one that isn't", () => {
        const hero = newHero("warrior", 1);
        gainXp(hero, 100000);
        const body = hero.equipment.body!;
        // Slash alone in the body, linked to a free socket, and one apart
        const slash = makeGem(hero.nextUid++, "slash");
        body.sockets = [
            { color: "red", linked: true, gem: slash },
            { color: "red", linked: false },
            { color: "red", linked: false },
        ];
        hero.equipment.weapon!.sockets = undefined;
        hero.equipment.legs!.sockets = undefined;
        hero.equipment.head = undefined;
        bindSkill(hero, 0, slash.uid);
        const stats = heroStats(hero);
        const alone = resolveSkill(hero, stats, slash.uid)!;
        const apart = give(hero, "brutality");
        socketGem(hero, apart, "body", 2);
        expect(resolveSkill(hero, stats, slash.uid)!.maxHit).toBe(alone.maxHit);
        expect(linkGroups(body.sockets)).toEqual([[0, 1], [2]]);
        unsocketGem(hero, "body", 2);
        const linked = hero.inventory.findIndex((x) => x?.base === "brutality");
        socketGem(hero, linked, "body", 1);
        const supported = resolveSkill(hero, stats, slash.uid)!;
        expect(supported.supportedBy).toEqual(["Brutality"]);
        expect(supported.maxHit).toBeGreaterThan(alone.maxHit * 1.2);
        expect(supported.mana).toBeGreaterThanOrEqual(alone.mana);
    });

    it("sets a gem where it fits best: a support beside a skill it supports", () => {
        const hero = newHero("warrior", 1);
        const i = give(hero, "brutality");
        expect(autoSocket(hero, i)).toBeUndefined();
        const worn = wornGems(hero).find((w) => w.def.id === "brutality")!;
        expect(worn.linked.some((g) => GEM_BY_ID.get(g.base)!.skill)).toBe(true);
    });

    it("levels from experience as far as the hero's level allows", () => {
        const def = GEM_BY_ID.get("cleave")!;
        const gem = makeGem(1, "cleave");
        // Held at level 1 by a level 1 hero, with a level's worth kept for later
        expect(gainGemXp(gem, 1e7, 1)).toBe(false);
        expect(gem.level).toBe(1);
        expect(gainGemXp(gem, 0, 20)).toBe(true);
        expect(gem.level).toBe(2);
        gainGemXp(gem, 1e9, 20);
        expect(gemRequirement(def, gem.level)).toBeLessThanOrEqual(20);
        expect(gemRequirement(def, gem.level + 1)).toBeGreaterThan(20);
        gainGemXp(gem, 1e9, 100);
        expect(gem.level).toBe(MAX_GEM_LEVEL);
    });

    it("moves with what's worn: gems go across into the new piece where they fit", () => {
        const hero = newHero("warrior", 1);
        const old = hero.equipment.body!;
        const before = old.sockets!.filter((s) => s.gem).map((s) => s.gem!.uid);
        expect(before.length).toBeGreaterThan(0);
        const next = plainItem(hero.nextUid++, old.base);
        next.sockets = [
            { color: "red", linked: true },
            { color: "red", linked: true },
            { color: "red", linked: false },
        ];
        hero.inventory[0] = next;
        const result = equipFrom(hero, 0);
        expect(result).toEqual({ moved: before.length });
        expect(hero.equipment.body!.sockets!.filter((s) => s.gem).map((s) => s.gem!.uid)).toEqual(before);
        expect(old.sockets!.every((s) => !s.gem)).toBe(true);
        // Taken off, its skills leave the bar
        const bar = [...hero.skillBar];
        expect(unequip(hero, "body")).toBeUndefined();
        for (const uid of before) {
            expect(hero.skillBar).not.toContain(uid);
        }
        expect(bar.some((ref) => before.includes(ref as number))).toBe(true);
    });

    it("rolls gems and sockets the same from the same seed, sockets no more than a slot has", () => {
        const roll = (seed: number) => {
            const rng = new Rng(seed);
            return Array.from({ length: 30 }, (_, i) => [rollGem(rng, i, 30, "mage"), rollItem(rng, 100 + i, { level: 40, rarity: 1 })]);
        };
        expect(roll(3)).toEqual(roll(3));
        for (const [gem, item] of roll(5)) {
            expect(gem.rarity).toBe("gem");
            expect(GEM_BY_ID.get(gem.base)!.level).toBeLessThanOrEqual(32);
            const info = itemInfo(item);
            const most = info.slot === "weapon" && info.weapon?.kind === "bow" ? 6 : { weapon: 4, offhand: 3, head: 4, body: 6, legs: 4, hands: 4, feet: 4, cape: 2, amulet: 0, ring: 0, talisman: 0, potion: 0 }[info.slot];
            expect(item.sockets?.length ?? 0).toBeLessThanOrEqual(most);
            if (most === 0) {
                expect(item.sockets).toBeUndefined();
            }
        }
    });

    it("recuts sockets for gold, and gems that no longer fit come out", () => {
        const hero = newHero("mage", 1);
        hero.gold = 10000;
        const rng = new Rng(9);
        // A level 1 robe has as many sockets as it can; the skirt has room for one more
        expect(socketWork(hero, rng, "body", "socket")).toMatch(/another socket/);
        const legs = hero.equipment.legs!;
        const count = legs.sockets!.length;
        expect(socketWork(hero, rng, "legs", "socket")).toBeUndefined();
        expect(legs.sockets!.length).toBe(count + 1);
        const gems = wornGems(hero).length;
        for (let i = 0; i < 10; i++) {
            expect(socketWork(hero, rng, "body", "colours")).toBeUndefined();
            expect(socketWork(hero, rng, "legs", "links")).toBeUndefined();
        }
        const inPack = hero.inventory.filter((x) => x?.rarity === "gem").length;
        expect(wornGems(hero).length + inPack).toBe(gems);
        expect(hero.gold).toBeLessThan(10000);
        hero.gold = 0;
        expect(socketWork(hero, rng, "body", "links")).toMatch(/costs/);
    });
});

describe("skills are the class's own", () => {
    it("lets each class use its colours' skills, and every support", () => {
        for (const cls of CLASS_IDS) {
            for (const def of GEMS) {
                const own = !def.skill || CLASS_COLORS[cls].includes(def.color);
                expect(classCanUse(cls, def)).toBe(own);
            }
        }
        // A mage can't use a ranger's bow skill, nor a ranger a mage's spell
        expect(classCanUse("mage", GEM_BY_ID.get("split")!)).toBe(false);
        expect(classCanUse("ranger", GEM_BY_ID.get("firebolt")!)).toBe(false);
        expect(classCanUse("warrior", GEM_BY_ID.get("brutality")!)).toBe(true);
        expect(classCanUse("warrior", GEM_BY_ID.get("volley")!)).toBe(true);
    });

    it("won't socket another class's skill, and marks one worn from before", () => {
        const hero = newHero("mage", 5);
        const body = hero.equipment.body!;
        body.sockets = [{ color: "white", linked: false }];
        const index = hero.inventory.indexOf(null);
        hero.inventory[index] = makeGem(hero.nextUid++, "split", 1);
        expect(socketGem(hero, index, "body", 0)).toMatch(/Only a Ranger, Rogue or Necromancer/);
        expect(autoSocket(hero, index)).toMatch(/Only a/);
        expect(body.sockets[0].gem).toBeUndefined();
        // One already in a socket, as an old save might have it, can't be used
        const gem = makeGem(hero.nextUid++, "split", 1);
        body.sockets[0].gem = gem;
        expect(resolveSkill(hero, heroStats(hero), gem.uid)?.why).toMatch(/Only a/);
    });

    it("drops only skills the class can use", () => {
        const rng = new Rng(7);
        for (const cls of CLASS_IDS) {
            for (let i = 0; i < 300; i++) {
                const def = GEM_BY_ID.get(rollGem(rng, 1, 30, cls).base)!;
                expect(classCanUse(cls, def)).toBe(true);
            }
        }
    });
});

describe("every skill gem", () => {
    // The first class whose weapon a gem works with, and whose own the gem is
    function classFor(id: string): ClassId {
        const def = GEM_BY_ID.get(id)!;
        return CLASS_IDS.find((cls) => classCanUse(cls, def) && (!def.weapons || def.weapons.some((w) => CLASSES[cls].weapons.includes(w))))!;
    }

    for (const def of GEMS.filter((g) => g.skill)) {
        it(`${def.name} can be used, and does what it should to a monster in front`, () => {
            const cls = classFor(def.id);
            const hero = newHero(cls, 3);
            gainXp(hero, 1e7);
            // Into a white socket of the body, with a support linked that works with most things
            const body = hero.equipment.body!;
            const gem = makeGem(hero.nextUid++, def.id, 5);
            body.sockets = [{ color: "white", linked: false, gem }];
            bindSkill(hero, 1, gem.uid);
            const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: BASE_X + 10.5, y: BASE_Y + 20.5 } });
            const m = game.monsters[0];
            for (const other of game.monsters) {
                if (other !== m) {
                    other.state = "dead";
                }
            }
            const h = game.hero;
            m.x = m.prevX = h.x + 1.6;
            m.y = m.prevY = h.y;
            m.life = m.maxLife = 1e7;
            m.frozenUntil = 1e9;
            expect(game.skills[1]?.why).toBeUndefined();
            let cast = false;
            for (let i = 0; i < 200; i++) {
                const input = noInput();
                input.hasAim = true;
                input.aimX = m.x;
                input.aimY = m.y;
                input.aimUid = m.uid;
                input.skills[1] = i < 3;
                input.standing = def.skill!.kind !== "blink" && def.skill!.kind !== "leap";
                game.step(input);
                cast ||= game.takeEvents().some((e) => e.kind === "cast" && e.skill.id === def.id);
            }
            expect(cast).toBe(true);
            if (def.skill!.kind === "buff") {
                expect(h.buffs.some((b) => b.id === def.id) || game.tick > 0).toBe(true);
            } else if (def.skill!.kind !== "blink") {
                expect(m.life).toBeLessThan(m.maxLife);
            }
        });
    }
});

describe("a fan of projectiles", () => {
    // Hits on one big monster close in front from one use of a gem
    function hitsOnOne(id: string): number {
        const hero = newHero("ranger", 3);
        gainXp(hero, 1e7);
        const gem = makeGem(hero.nextUid++, id, 5);
        hero.equipment.body!.sockets = [{ color: "white", linked: false, gem }];
        bindSkill(hero, 1, gem.uid);
        const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: BASE_X + 10.5, y: BASE_Y + 20.5 } });
        const m = game.monsters[0];
        for (const other of game.monsters) {
            if (other !== m) {
                other.state = "dead";
            }
        }
        const h = game.hero;
        m.x = m.prevX = h.x + 2;
        m.y = m.prevY = h.y;
        m.radius = 1.2;
        m.life = m.maxLife = 1e7;
        m.frozenUntil = 1e9;
        let hits = 0;
        const g = game as unknown as { hitMonster: (target: unknown, ...rest: unknown[]) => void };
        const hit = g.hitMonster.bind(game);
        g.hitMonster = (target, ...rest) => {
            hits += target === m ? 1 : 0;
            hit(target, ...rest);
        };
        for (let i = 0; i < 100; i++) {
            const input = noInput();
            input.hasAim = true;
            input.aimX = m.x;
            input.aimY = m.y;
            input.aimUid = m.uid;
            input.skills[1] = i < 2;
            input.standing = true;
            game.step(input);
        }
        return hits;
    }

    it("hits an enemy once between them when it's for a crowd, and every time when it's tight", () => {
        // Split Arrow's five arrows at a guardian's feet: one hit, as Path of Exile's fans are
        expect(hitsOnOne("split")).toBe(1);
        // Barrage is meant to put all four into one enemy
        expect(hitsOnOne("barrage")).toBe(4);
    });
});

describe("a basic attack", () => {
    it("is what the left button does with nothing on it", () => {
        const hero = newHero("ranger", 1);
        hero.skillBar[0] = null;
        const skills = resolveSkills(hero, heroStats(hero));
        expect(skills[0]?.ref).toBe(BASIC);
        expect(skills[0]?.def.name).toBe("Quick Shot");
        // A bow's attack gem with a sword in hand says why it can't be used
        const sword = plainItem(hero.nextUid++, [...BASE_BY_ID.values()].find((b) => b.weapon?.kind === "melee")!.id);
        sword.sockets = hero.equipment.weapon!.sockets;
        hero.equipment.weapon = sword;
        const shoot = wornGems(hero).find((w) => w.def.id === "shoot")!;
        expect(resolveSkill(hero, heroStats(hero), shoot.gem.uid)!.why).toBe("Needs a bow.");
    });
});
