// The tree's expansion (docs/tree-expansion.md): notables whose numbers hang on what the hero's
// doing or fighting, the talismans in the tree's sockets and what the unique ones do round them,
// Aubury's enchanting, the free reset a changed tree gives, and a few of the wings' keystones in a
// rift.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { ENCHANTABLE, PASSIVES, START_NODE } from "../content/passives";
import { CATALYTIC_MORE, LAW_EACH } from "../content/items";
import { TICKS_PER_SECOND, xpToNext } from "../content/rules";
import { ENCHANT, enchantItem } from "./enchant";
import { Game, noInput } from "./Game";
import { Hero, HeroState, gainXp, heroStats, newHero } from "./hero";
import { Item, rollItem, rollTalisman } from "./loot";
import { TREE_VERSION, allocate, canRefund, freeReset, passiveStats, pathTo, pointsLeft, resetCost, resetTree, takenSet } from "./passives";
import { SOCKETS, socketTalisman, unsocketTalisman } from "./talismans";

const CALM: HeroState = { killedRecently: false, hitRecently: false, evadedRecently: false, movedRecently: false, lowLife: false, fullLife: true, buffed: false, flasked: false, blessed: false, thralls: 0 };

function byName(name: string): number {
    const node = PASSIVES.find((n) => n.name === name && (n.kind === "notable" || n.kind === "keystone"));
    if (!node) {
        throw new Error(name);
    }
    return node.id;
}

function levelled(cls: Hero["cls"], level: number): Hero {
    const hero = newHero(cls, 7);
    while (hero.level < level) {
        gainXp(hero, xpToNext(hero.level));
    }
    return hero;
}

function unique(base: string, level = 40): Item {
    return { uid: 9000 + base.length, base, rarity: "unique", level, mods: [] };
}

// The main tree's socket nearest a class's start, taken by the way to it
function takeNearestSocket(hero: Hero): number {
    const start = PASSIVES[START_NODE[hero.cls]];
    const socket = SOCKETS.filter((id) => !PASSIVES[id].wing).sort((a, b) => Math.hypot(PASSIVES[a].x - start.x, PASSIVES[a].y - start.y) - Math.hypot(PASSIVES[b].x - start.x, PASSIVES[b].y - start.y))[0];
    expect(allocate(hero, socket)).toBeUndefined();
    return socket;
}

function total(lines: { stat: string; value: number }[], stat: string): number {
    return lines.filter((l) => l.stat === stat).reduce((a, l) => a + l.value, 0);
}

describe("notables that hang on something", () => {
    it("count a hero condition only while it holds", () => {
        const hero = levelled("warrior", 10);
        hero.passives = [byName("Berserker Necklace")];
        const calm = heroStats(hero, CALM);
        const low = heroStats(hero, { ...CALM, lowLife: true, fullLife: false });
        expect(low.damage.melee - calm.damage.melee).toBeCloseTo(0.25, 5);
        expect(calm.hangsOn).toContain("lowLife");
    });

    it("keep an enemy's state apart, for the hit against it", () => {
        const hero = levelled("necromancer", 10);
        const before = heroStats(hero, CALM);
        hero.passives = [byName("Winter's Bite")];
        const stats = heroStats(hero, CALM);
        expect(stats.versus.vsChilled?.damage).toBeCloseTo(0.25, 5);
        // Not on every hit
        expect(stats.damage.all).toBeCloseTo(before.damage.all, 5);
    });
});

describe("talismans", () => {
    it("go into a socket taken, count as the tree's, and come out into the pack", () => {
        const hero = levelled("mage", 40);
        const socket = takeNearestSocket(hero);
        const talisman = unique("blood_talisman", 20);
        hero.inventory[0] = talisman;
        const before = total(passiveStats(hero).stats, "lifePct");
        expect(socketTalisman(hero, socket, 0)).toBeUndefined();
        expect(hero.talismans[socket]).toBe(talisman);
        expect(hero.inventory[0]).toBeNull();
        expect(total(passiveStats(hero).stats, "lifePct")).toBe(before + 4);
        expect(unsocketTalisman(hero, socket)).toBeUndefined();
        expect(hero.talismans[socket]).toBeUndefined();
        expect(hero.inventory).toContain(talisman);
    });

    it("won't go in a socket not taken, nor two of a unique at once", () => {
        const hero = levelled("mage", 40);
        const socket = takeNearestSocket(hero);
        const other = SOCKETS.find((id) => id !== socket)!;
        hero.inventory[0] = unique("blood_talisman", 20);
        hero.inventory[1] = unique("blood_talisman", 20);
        expect(socketTalisman(hero, other, 0)).toBeDefined();
        expect(socketTalisman(hero, socket, 0)).toBeUndefined();
        hero.passives.push(other);
        expect(socketTalisman(hero, other, 1)).toBeDefined();
    });

    it("stay in a socket given back, doing nothing, so starting over never loses one", () => {
        const hero = levelled("mage", 40);
        const socket = takeNearestSocket(hero);
        hero.talismans[socket] = unique("blood_talisman", 20);
        hero.gold = 1e9;
        expect(resetTree(hero)).toBeUndefined();
        expect(hero.talismans[socket]).toBeDefined();
        expect(total(passiveStats(hero).stats, "lifePct")).toBe(0);
    });

    it("drop as their own roll, magic or better more often than gear", () => {
        const rng = new Rng(11);
        const items = Array.from({ length: 400 }, (_, i) => rollTalisman(rng, i + 1, 30, 0));
        expect(items.some((t) => t.rarity === "unique")).toBe(true);
        expect(items.filter((t) => t.rarity !== "normal").length).toBeGreaterThan(items.length / 2);
    });

    it("a catalytic one makes the small passives round it give more", () => {
        const hero = levelled("mage", 40);
        const socket = takeNearestSocket(hero);
        const s = PASSIVES[socket];
        const near = hero.passives.filter((id) => PASSIVES[id].kind === "small" && Math.hypot(PASSIVES[id].x - s.x, PASSIVES[id].y - s.y) <= 450);
        expect(near.length).toBeGreaterThan(0);
        const stat = PASSIVES[near[0]].stats[0].stat;
        const plain = total(passiveStats(hero).stats, stat);
        hero.talismans[socket] = unique("catalytic_talisman", 20);
        const more = total(passiveStats(hero).stats, stat);
        const fromNear = near.reduce((a, id) => a + total(PASSIVES[id].stats, stat), 0);
        expect(more).toBeCloseTo(plain + fromNear * (CATALYTIC_MORE - 1), 5);
    });

    it("a law one makes the attributes round it give some of every one", () => {
        const hero = levelled("mage", 40);
        const socket = takeNearestSocket(hero);
        const s = PASSIVES[socket];
        const attrs = hero.passives.filter((id) => PASSIVES[id].kind === "attribute" && Math.hypot(PASSIVES[id].x - s.x, PASSIVES[id].y - s.y) <= 450);
        expect(attrs.length).toBeGreaterThan(0);
        const plain = passiveStats(hero).stats;
        hero.talismans[socket] = unique("law_talisman", 20);
        const law = passiveStats(hero).stats;
        const own = (stat: string) => attrs.reduce((a, id) => a + total(PASSIVES[id].stats, stat), 0);
        for (const stat of ["str", "dex", "int"]) {
            expect(total(law, stat)).toBe(total(plain, stat) - own(stat) + attrs.length * LAW_EACH);
        }
    });

    it("an Elemental one lets the nodes round it be taken without the way to them", () => {
        const hero = levelled("mage", 60);
        const socket = takeNearestSocket(hero);
        const s = PASSIVES[socket];
        const taken = takenSet(hero);
        // Near the socket, but a long way round by the tree's links
        const far = PASSIVES.find((n) => n.kind === "small" && !taken.has(n.id) && Math.hypot(n.x - s.x, n.y - s.y) <= 650 && (pathTo(hero.cls, taken, n.id)?.length ?? 99) >= 4);
        expect(far).toBeDefined();
        hero.talismans[socket] = unique("elemental_talisman", 28);
        const left = pointsLeft(hero);
        expect(allocate(hero, far!.id)).toBeUndefined();
        expect(pointsLeft(hero)).toBe(left - 1);
        // It hangs from the socket now: neither can go while the other's there
        expect(canRefund(hero, socket)).toBe(false);
        expect(unsocketTalisman(hero, socket)).toBeDefined();
        expect(canRefund(hero, far!.id)).toBe(true);
    });
});

describe("Aubury's enchanting", () => {
    function ring(hero: Hero): Item {
        const item = rollItem(new Rng(5), 4242, { level: 12, rarity: 0, slot: "ring" });
        hero.equipment.ring = item;
        return item;
    }

    it("gives a ring a notable of the tree, as if it were taken, for Cosmic runes and gold", () => {
        const hero = levelled("rogue", 15);
        const item = ring(hero);
        const node = ENCHANTABLE[0];
        const stat = PASSIVES[node].stats[0]?.stat;
        hero.runes.cosmic = ENCHANT.cosmic;
        hero.gold = 1e6;
        const before = stat ? total(passiveStats(hero).stats, stat) : 0;
        expect(enchantItem(hero, { slot: "ring" }, node)).toBeUndefined();
        expect(item.enchant).toBe(node);
        expect(hero.runes.cosmic).toBe(0);
        expect(hero.gold).toBeLessThan(1e6);
        if (stat) {
            expect(total(passiveStats(hero).stats, stat)).toBeCloseTo(before + total(PASSIVES[node].stats, stat), 5);
        }
    });

    it("takes runes it hasn't got, and a wing's notable, as a no", () => {
        const hero = levelled("rogue", 15);
        ring(hero);
        hero.gold = 1e6;
        hero.runes.cosmic = 0;
        expect(enchantItem(hero, { slot: "ring" }, ENCHANTABLE[0])).toBeDefined();
        hero.runes.cosmic = 10;
        expect(enchantItem(hero, { slot: "ring" }, byName("Pyre"))).toBeDefined();
        expect(ENCHANTABLE.every((id) => PASSIVES[id].kind === "notable" && !PASSIVES[id].wing)).toBe(true);
    });
});

describe("a tree that's grown since the points were spent", () => {
    it("starts over for nothing, once", () => {
        const hero = levelled("paladin", 20);
        allocate(hero, PASSIVES[START_NODE.paladin].links[0]);
        hero.treeVersion = TREE_VERSION - 1;
        hero.gold = 0;
        expect(freeReset(hero)).toBe(true);
        expect(resetCost(hero)).toBe(0);
        expect(resetTree(hero)).toBeUndefined();
        expect(hero.passives).toEqual([]);
        expect(hero.treeVersion).toBe(TREE_VERSION);
        allocate(hero, PASSIVES[START_NODE.paladin].links[0]);
        expect(freeReset(hero)).toBe(false);
        expect(resetCost(hero)).toBeGreaterThan(0);
    });
});

describe("the wings' keystones in a rift", () => {
    function land() {
        const rows: string[] = [];
        for (let row = 0; row < 48; row++) {
            rows.push(row === 0 || row === 47 ? "#".repeat(48) : `#${".".repeat(46)}#`);
        }
        return makeGrid(rows, 100, 200);
    }

    function rift(keystone: string, cls: Hero["cls"] = "mage") {
        const hero = levelled(cls, 20);
        hero.passives = [byName(keystone)];
        const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: 104.5, y: 204.5 } });
        const m = game.monsters[0];
        for (const other of game.monsters) {
            if (other !== m) {
                other.state = "dead";
            }
        }
        m.life = m.maxLife = 1e9;
        return { game, m };
    }

    it("Inferno: ignites stack, three at once", () => {
        const { game, m } = rift("Inferno");
        for (let i = 0; i < 4; i++) {
            game["ignite"](m, 10 + i, 30 + i);
        }
        expect(m.burnStacks?.length).toBe(3);
        expect(m.burn).toBe(11 + 12 + 13);
    });

    it("without it, the strongest burn is the one that burns", () => {
        const hero = levelled("mage", 20);
        const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: 104.5, y: 204.5 } });
        const m = game.monsters[0];
        game["ignite"](m, 10, 30);
        game["ignite"](m, 4, 30);
        expect(m.burn).toBe(10);
    });

    it("Ice Barrage: a frozen enemy that dies shatters", () => {
        const { game, m } = rift("Ice Barrage", "necromancer");
        m.frozenUntil = game.tick + 100;
        const strikes = game.strikes.length;
        game["kill"](m);
        expect(game.strikes.length).toBe(strikes + 1);
    });

    it("Demonic Offering: a kill gives mana back, and none comes back on its own", () => {
        const { game, m } = rift("Demonic Offering", "necromancer");
        expect(game.stats.manaRegen).toBe(0);
        game.hero.mana = 0;
        m.rank = "normal";
        game["kill"](m);
        expect(game.hero.mana).toBeCloseTo(game.stats.maxMana * 0.04, 5);
    });

    it("Agility Shortcut: a step counts as moving, for a while after", () => {
        const { game } = rift("Agility Shortcut", "rogue");
        expect(game.heroState().movedRecently).toBe(false);
        for (let i = 0; i < 5; i++) {
            game.step({ ...noInput(), moveX: 1 });
        }
        expect(game.hero.moving).toBe(true);
        expect(game.heroState().movedRecently).toBe(true);
        for (let i = 0; i < 3 * TICKS_PER_SECOND; i++) {
            game.step(noInput());
        }
        expect(game.heroState().movedRecently).toBe(false);
    });

    it("Greater Thralls: the risen deal thrall damage too, as summoned thralls do", () => {
        const risen = (passives: number[]) => {
            const hero = levelled("ranger", 20);
            hero.passives = passives;
            const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: 104.5, y: 204.5 } });
            const skill = game.skills[0]!;
            game["raiseFallen"](game.monsters[0], skill);
            const t = game.minions.at(-1)!;
            return { hit: t.skill.maxHit, share: skill.maxHit, increased: skill.increased, thrall: game.stats.thrallDamage };
        };
        const plain = risen([]);
        const greater = risen([byName("Greater Thralls")]);
        expect(greater.thrall).toBeGreaterThan(0);
        expect(greater.hit / greater.share).toBeCloseTo((plain.hit / plain.share) * ((1 + greater.increased + greater.thrall) / (1 + greater.increased)), 5);
    });

    it("Arceuus Covenant: Gravebound raises twice as often, the risen stand four times as long", () => {
        const raise = (passives: number[]) => {
            const hero = levelled("ranger", 20);
            hero.passives = passives;
            const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: 104.5, y: 204.5 } });
            const skill = game.skills[0]!;
            let asked = 0;
            game["rng"].chance = (p: number) => {
                asked = p;
                return true;
            };
            game["traitsOnKill"](game.monsters[0], skill, { grave: 0.2 });
            const t = game.minions.at(-1)!;
            return { chance: asked, lasts: t.until - game.tick };
        };
        const plain = raise([]);
        const covenant = raise([byName("Arceuus Covenant")]);
        expect(plain.chance).toBeCloseTo(0.2, 5);
        expect(covenant.chance).toBeCloseTo(0.4, 5);
        expect(covenant.lasts).toBe(plain.lasts * 4);
    });

    it("Dharok's Curse: no life comes back on its own", () => {
        const hero = levelled("warrior", 20);
        hero.passives = [byName("Dharok's Curse")];
        expect(heroStats(hero, CALM).lifeRegen).toBe(0);
    });
});
