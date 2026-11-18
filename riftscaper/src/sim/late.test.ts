// The late game (docs/late-game.md): rift-touched uniques, the circle's upgrades, imbues, joins and
// makes, the parts' drops, and Reldo's Max cape
import { describe, expect, it } from "vitest";
import { makeGrid } from "../../../engine/world/testGrid";
import { AWAKENED, PINNACLES, awakenable } from "../content/pinnacles";
import { INVOCATIONS, INVOCATION_IDS, TOMBS, raidLevel } from "../content/tombs";
import { TICKS_PER_SECOND } from "../content/rules";
import { Game, Monster, noInput } from "./Game";
import { awakenedWhyNot, pinnacleNeed } from "./pinnacles";
import { ACHIEVEMENTS, HILTS, TIER_POINTS } from "../content/achievements";
import { PETS } from "../content/pets";
import { achievementPoints, hasHilt, logHeld, logPages, petKey, totalPoints, winPet } from "./log";
import { MAKES, UPGRADES } from "../content/circle";
import { GOODS, GOOD_IDS, PART_DROPS } from "../content/goods";
import { BASE_BY_ID, MAX_CAPE_LEVEL, MAX_CAPE_PRICE, UNIQUES, UNIQUE_BY_ID } from "../content/items";
import { BOSSES, DEMONS, MONSTERS, VAMPYRES } from "../content/monsters";
import { LADDER_LEVEL, areaLevel } from "../content/rules";
import { buyMaxCape, makeWhyNot, transmuteMake, transmuteUpgrade, upgradeGold, upgradeWhyNot } from "./circle";
import { gainXp, heroStats, newHero, setMore, setsWorn } from "./hero";
import { ladderRift } from "./ladder";
import { buyTalisman, buyWare, eliteGambleLevel, stallUpgrade, stallUpgradeWhyNot } from "./town";
import { claimTask, rollTask } from "./tasks";
import { Rng } from "../../../engine/core/Rng";
import { Item, gambleCost, isTouched, itemInfo, touchLift, uniqueRange } from "./loot";
import { ORRERY_ARMS, ORRERY_NODES } from "../content/orrery";
import { favourHost, favoured, hostSphere, lightSphere, orreryLevers, orreryPoints, orreryRefund, readOrrery, refundNode, refundWhyNot, sphereName, takeNode, takeWhyNot } from "./orrery";

const unique = (id: string, level: number, uid = 900): Item => ({ uid, base: id, rarity: "unique", level, mods: [], sockets: [{}, {}] as Item["sockets"] });
const known = (id: string) => (MONSTERS as Record<string, unknown>)[id] !== undefined || (BOSSES as Record<string, unknown>)[id] !== undefined;

describe("rift-touched uniques", () => {
    it("lifts a unique found past the campaign's last level, and names it so", () => {
        const at = itemInfo(unique("abyssal_whip", 40));
        const deep = itemInfo(unique("abyssal_whip", 140));
        expect(at.name).toBe("Abyssal whip");
        expect(deep.name).toBe("Rift-touched Abyssal whip");
        expect(deep.touched).toBe(true);
        expect(deep.weapon!.damage[1]).toBeGreaterThan(at.weapon!.damage[1] * 1.5);
        // It still asks for its own level
        expect(deep.level).toBe(UNIQUE_BY_ID.get("abyssal_whip")!.level);
    });

    it("leaves the campaign's alone, and potions and talismans", () => {
        expect(isTouched(unique("abyssal_whip", LADDER_LEVEL), UNIQUE_BY_ID.get("abyssal_whip")!)).toBe(false);
        for (const u of UNIQUES.filter((u) => u.slot === "potion" || u.slot === "talisman")) {
            expect(isTouched(unique(u.id, 200), u)).toBe(false);
        }
    });

    it("lifts its numbers by a fifth for each elite tier passed", () => {
        const u = UNIQUE_BY_ID.get("amulet_of_fury")!;
        expect(touchLift(unique(u.id, 60), u).stats).toBe(1);
        expect(touchLift(unique(u.id, 100), u).stats).toBeCloseTo(1.6);
    });
});

describe("the circle's upgrades", () => {
    it("knows every unique and good its recipes name", () => {
        for (const up of UPGRADES) {
            expect(UNIQUE_BY_ID.get(up.from), up.from).toBeDefined();
            expect(UNIQUE_BY_ID.get(up.to), up.to).toBeDefined();
            expect(UNIQUE_BY_ID.get(up.to)!.slot).toBe(UNIQUE_BY_ID.get(up.from)!.slot);
            for (const g of Object.keys(up.goods ?? {})) {
                expect(GOOD_IDS).toContain(g);
            }
        }
        for (const make of MAKES) {
            expect(UNIQUE_BY_ID.get(make.to), make.to).toBeDefined();
        }
        // Nothing random drops an upgrade: the circle makes them
        for (const up of UPGRADES) {
            expect(UNIQUE_BY_ID.get(up.to)!.source).toBe("upgrade");
        }
    });

    it("makes a whip a tentacle, the same item with its sockets and level", () => {
        const hero = newHero("warrior", 3);
        const whip = unique("abyssal_whip", 120);
        hero.inventory[0] = whip;
        const up = UPGRADES.find((u) => u.to === "abyssal_tentacle")!;
        expect(upgradeWhyNot(hero, whip, up)).toMatch(/Kraken tentacle/);
        hero.goods.krakenTentacle = 1;
        expect(upgradeWhyNot(hero, whip, up)).toMatch(/gold/);
        hero.gold = upgradeGold(whip, up);
        const got = transmuteUpgrade(hero, { index: 0 }, up);
        expect(typeof got).not.toBe("string");
        const item = got as Item;
        expect(item.uid).toBe(900);
        expect(item.base).toBe("abyssal_tentacle");
        expect(item.level).toBe(120);
        expect(item.sockets).toHaveLength(2);
        expect(hero.goods.krakenTentacle).toBe(0);
        expect(hero.gold).toBe(0);
        expect(itemInfo(item).name).toBe("Rift-touched Abyssal tentacle");
    });

    it("keeps a unique's rolls where they were in their ranges", () => {
        const hero = newHero("warrior", 3);
        const from = UNIQUE_BY_ID.get("amulet_of_fury")!;
        const fury = unique("amulet_of_fury", 50);
        fury.rolls = from.stats.map((l) => l.value);
        hero.inventory[0] = fury;
        hero.goods.bloodShard = 1;
        hero.gold = 1e9;
        const up = UPGRADES.find((u) => u.to === "amulet_of_blood_fury")!;
        transmuteUpgrade(hero, { index: 0 }, up);
        const to = UNIQUE_BY_ID.get("amulet_of_blood_fury")!;
        to.stats.forEach((line, i) => expect(fury.rolls![i]).toBe(line.value));
    });

    it("imbues a ring with a Wrath rune and gold, its numbers doubled", () => {
        const hero = newHero("warrior", 3);
        const ring = unique("berserker_ring", 50);
        hero.inventory[0] = ring;
        hero.gold = 1e9;
        const up = UPGRADES.find((u) => u.to === "berserker_ring_i")!;
        expect(upgradeWhyNot(hero, ring, up)).toMatch(/Wrath/);
        hero.runes.wrath = 1;
        transmuteUpgrade(hero, { index: 0 }, up);
        const was = UNIQUE_BY_ID.get("berserker_ring")!;
        const now = UNIQUE_BY_ID.get("berserker_ring_i")!;
        expect(ring.base).toBe("berserker_ring_i");
        expect(now.stats[0].value).toBe(was.stats[0].value * 2);
        expect(hero.runes.wrath).toBe(0);
    });

    it("joins the Max cape with an Infernal cape, the Max cape gone into it", () => {
        const hero = newHero("warrior", 3);
        hero.inventory[0] = unique("infernal_cape", 80);
        const up = UPGRADES.find((u) => u.to === "infernal_max_cape")!;
        expect(upgradeWhyNot(hero, hero.inventory[0]!, up)).toMatch(/Max cape/);
        hero.inventory[1] = unique("max_cape", 99, 901);
        transmuteUpgrade(hero, { index: 0 }, up);
        expect(hero.inventory[0]!.base).toBe("infernal_max_cape");
        expect(hero.inventory[1]).toBeNull();
        expect(UNIQUE_BY_ID.get("infernal_max_cape")!.level).toBe(MAX_CAPE_LEVEL);
    });

    it("sets a vestige with three Chromium ingots into its ring, read at once", () => {
        const hero = newHero("warrior", 3);
        hero.maxDepth = 30;
        const make = MAKES.find((m) => m.to === "ultor_ring")!;
        hero.goods.ultorVestige = 1;
        hero.goods.chromiumIngot = 2;
        expect(makeWhyNot(hero, make)).toMatch(/Chromium/);
        hero.goods.chromiumIngot = 3;
        const got = transmuteMake(hero, make) as Item;
        expect(got.base).toBe("ultor_ring");
        expect(got.unid).toBeUndefined();
        expect(got.level).toBeGreaterThan(LADDER_LEVEL);
        expect(hero.goods.ultorVestige).toBe(0);
        expect(hero.goods.chromiumIngot).toBe(0);
        expect(hero.inventory).toContain(got);
    });
});

describe("the parts", () => {
    it("are kept in the pouch, shown once found", () => {
        for (const part of PART_DROPS) {
            expect(GOODS[part.id].currency).toBe(true);
            expect(GOODS[part.id].secret).toBe(true);
        }
    });

    it("drop from monsters the game has", () => {
        for (const part of PART_DROPS) {
            for (const id of part.from) {
                expect(known(id), id).toBe(true);
            }
        }
        for (const id of [...DEMONS, ...VAMPYRES]) {
            expect(known(id), id).toBe(true);
        }
    });
});

describe("Reldo's Max cape", () => {
    it("is for a hero of 99 with its price, one at a time", () => {
        const hero = newHero("ranger", 5);
        hero.gold = MAX_CAPE_PRICE;
        expect(buyMaxCape(hero)).toMatch(/level 99/);
        gainXp(hero, 1e12);
        expect(hero.level).toBe(MAX_CAPE_LEVEL);
        const cape = buyMaxCape(hero) as Item;
        expect(cape.base).toBe("max_cape");
        expect(hero.gold).toBe(0);
        hero.gold = MAX_CAPE_PRICE;
        expect(buyMaxCape(hero)).toMatch(/already/);
    });
});

// Open ground with a ring of rock round it, as riftKeys.test.ts's
const SIZE = 96;
const SPAWN = { x: 104.5, y: 204.5 };
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

function stronghold(seed: number, awakened: boolean): Game {
    const hero = newHero("warrior", seed);
    hero.maxDepth = 20;
    return new Game(land(), hero, { depth: 20, seed, spawn: SPAWN, pinnacle: "graardor", awakened });
}

describe("awakened pinnacles", () => {
    it("open with their key and an Awakener's orb", () => {
        const hero = newHero("warrior", 3);
        hero.maxDepth = 20;
        hero.killCount.bandos = 40;
        expect(awakenedWhyNot(hero, "graardor")).toMatch(/Awakener's orb/);
        hero.goods.awakenersOrb = 1;
        expect(awakenedWhyNot(hero, "graardor")).toBeUndefined();
        expect(awakenedWhyNot(hero, "chicken")).toMatch(/no awakened/);
    });

    it("have a guardian twice as hard, that rises again at half its life", () => {
        const plain = stronghold(5, false);
        const awake = stronghold(5, true);
        expect(awake.boss!.maxLife).toBe(Math.round(plain.boss!.maxLife * AWAKENED.life));
        expect(awake.boss!.name).toMatch(/^Awakened /);
        const guards = awake.monsters.length;
        const boss = awake.boss!;
        boss.life = boss.maxLife * 0.4;
        boss.state = "chase";
        for (let i = 0; i < 3; i++) {
            awake.step(noInput());
        }
        expect((boss as Monster).awoken).toBe(true);
        expect(awake.monsters.length).toBe(guards + PINNACLES.graardor.retinue!.length);
    });

    it("drop two of their uniques, high in their ranges, and their own goods", () => {
        let vestiges = 0;
        for (let seed = 1; seed <= 8; seed++) {
            const game = stronghold(seed, true);
            game["kill"](game.boss!);
            const uniques = game.drops.filter((d) => d.item && UNIQUE_BY_ID.get(d.item.base)?.pinnacle === "graardor").map((d) => d.item!);
            expect(uniques.length).toBe(AWAKENED.uniques);
            for (const item of uniques) {
                const u = UNIQUE_BY_ID.get(item.base)!;
                item.rolls?.forEach((v, i) => {
                    const r = uniqueRange(u, u.stats[i]);
                    if (r && r[0] < r[1]) {
                        expect(v).toBeGreaterThanOrEqual(Math.ceil((r[0] + r[1]) / 2));
                    }
                });
            }
            vestiges += game.drops.filter((d) => d.good?.id === "ultorVestige").length;
        }
        expect(vestiges).toBeGreaterThan(0);
    });
});

describe("the record", () => {
    it("has a slot for each thing once a page, each with an icon, and no page empty", () => {
        for (const page of logPages()) {
            expect(page.entries.length, page.id).toBeGreaterThan(0);
            expect(new Set(page.entries.map((e) => e.key)).size, page.id).toBe(page.entries.length);
            for (const e of page.entries) {
                expect(e.objId, e.key).toBeGreaterThan(0);
            }
        }
        // Every pet's guardian is one the game has, but those to come
        for (const pet of PETS) {
            expect(known(pet.id), pet.id).toBe(true);
        }
    });

    it("lights a unique's slot as it's picked up, and what a save from before holds", () => {
        const game = stronghold(4, false);
        const hero = game.heroData;
        const whip = unique("abyssal_whip", 30, 4242);
        game.drops.push({ uid: 99999, item: whip, x: game.hero.x, y: game.hero.y, tick: 0 });
        const events = game["pickUp"](game.drops[game.drops.length - 1]);
        void events;
        expect(hero.log).toContain("abyssal_whip");
        const old = newHero("mage", 2);
        old.inventory[0] = unique("amulet_of_fury", 30);
        logHeld(old);
        expect(old.log).toContain("amulet_of_fury");
    });

    it("counts a guardian's kill among the achievements", () => {
        const game = stronghold(6, true);
        game["kill"](game.boss!);
        expect(game.heroData.achievements).toContain("graardor:kill");
        expect(game.heroData.achievements).toContain("graardor:awakened");
        expect(achievementPoints(game.heroData)).toBeGreaterThan(0);
    });

    it("opens Ghommal's hilts in order, the last within reach", () => {
        const points = HILTS.map((h) => h.points);
        expect([...points].sort((a, b) => a - b)).toEqual(points);
        expect(totalPoints()).toBeGreaterThan(points[points.length - 1]);
        expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
        const hero = newHero("warrior", 1);
        expect(pinnacleNeed("graardor", hero)).toBe(40);
        hero.achievements = ACHIEVEMENTS.map((a) => a.id);
        expect(hasHilt(hero, "key")).toBe(true);
        expect(pinnacleNeed("graardor", hero)).toBe(30);
        expect(TIER_POINTS.grandmaster).toBe(6);
    });

    it("has the first pet won follow, and a second of it only a feeling", () => {
        const hero = newHero("ranger", 1);
        expect(winPet(hero, "graardor")).toBe(true);
        expect(hero.pet).toBe("graardor");
        expect(winPet(hero, "graardor")).toBe(false);
        expect(hero.log).toContain(petKey("graardor"));
    });
});

describe("the orrery", () => {
    it("lights a host's sphere for its guardian in each band of the ladder, once", () => {
        expect(hostSphere("bandos", 16)).toBeUndefined();
        expect(hostSphere("bandos", 17)).toBe("host:bandos:0");
        expect(hostSphere("bandos", 24)).toBe("host:bandos:0");
        expect(hostSphere("bandos", 25)).toBe("host:bandos:1");
        const hero = newHero("warrior", 7);
        hero.maxDepth = 20;
        const game = new Game(land(), hero, { depth: 20, seed: 7, spawn: SPAWN });
        expect(game.rift).toBeDefined();
        game["kill"](game.boss!);
        expect(hero.orrery?.lit).toEqual([hostSphere(game.rift!.host.id, 20)]);
        expect(lightSphere(hero, hostSphere(game.rift!.host.id, 23)!)).toBe(false);
    });

    it("lights a pinnacle's, and its awakened one's apart", () => {
        const plain = stronghold(8, false);
        plain["kill"](plain.boss!);
        expect(plain.heroData.orrery?.lit).toEqual(["pinnacle:graardor"]);
        const awake = stronghold(8, true);
        awake["kill"](awake.boss!);
        expect(awake.heroData.orrery?.lit).toEqual(["awakened:graardor"]);
        expect(sphereName("awakened:graardor")).toMatch(/^Awakened /);
    });

    it("takes a node for a point, after the one before it in its arm", () => {
        const hero = newHero("mage", 3);
        expect(takeWhyNot(hero, 100)).toMatch(/Light a sphere/);
        lightSphere(hero, "pinnacle:graardor");
        lightSphere(hero, "pinnacle:kril");
        expect(takeWhyNot(hero, 101)).toMatch(/first/);
        expect(takeNode(hero, 100)).toBeUndefined();
        expect(takeWhyNot(hero, 100)).toMatch(/yours/);
        expect(takeNode(hero, 101)).toBeUndefined();
        expect(orreryPoints(hero)).toBe(0);
        expect(takeWhyNot(hero, 200)).toMatch(/Light a sphere/);
        // Every arm's ids its own hundred, in order
        for (const arm of ORRERY_ARMS) {
            const nodes = ORRERY_NODES.filter((n) => n.arm === arm.id);
            expect(nodes.map((n) => n.step)).toEqual(nodes.map((_, i) => i));
        }
    });

    it("gives a node back for gold, the last of its arm first", () => {
        const hero = newHero("ranger", 4);
        hero.maxDepth = 30;
        for (const key of ["pinnacle:graardor", "pinnacle:kril"]) {
            lightSphere(hero, key);
        }
        takeNode(hero, 100);
        takeNode(hero, 101);
        hero.gold = 0;
        expect(refundWhyNot(hero, 100)).toMatch(/after it/);
        expect(refundWhyNot(hero, 101)).toMatch(/gold/);
        hero.gold = orreryRefund(hero);
        expect(refundNode(hero, 101)).toBeUndefined();
        expect(hero.gold).toBe(0);
        expect(orreryPoints(hero)).toBe(1);
    });

    it("makes a pinnacle's key lighter, and favours a host once its node is taken", () => {
        const hero = newHero("warrior", 5);
        hero.orrery = { lit: ORRERY_NODES.map((_, i) => `pinnacle:x${i}`), taken: ORRERY_NODES.map((n) => n.id) };
        const levers = orreryLevers(hero);
        expect(levers.keys).toBeCloseTo(0.1);
        expect(pinnacleNeed("graardor", hero)).toBe(Math.ceil(40 * (1 - levers.keys)));
        expect(levers.favour).toBe(2);
        expect(favourHost(hero, 0, "bandos")).toBeUndefined();
        expect(favourHost(hero, 1, "zamorak")).toBeUndefined();
        expect(favourHost(hero, 2, "saradomin")).toMatch(/node first/);
        expect(favoured(hero, "bandos")).toBe(true);
        expect(favoured(hero, "armadyl")).toBe(false);
    });

    it("reads a save back with only what it knows", () => {
        const o = readOrrery({ lit: ["pinnacle:graardor", "pinnacle:graardor", 3], taken: [100, 9999, 101], favour: ["bandos", "nobody"] });
        expect(o).toEqual({ lit: ["pinnacle:graardor"], taken: [100], favour: ["bandos"] });
        expect(readOrrery(undefined)).toBeUndefined();
    });
});

describe("the sinks", () => {
    it("make a Void knight top elite at the Void Knight's stall, for seals, its sockets kept", () => {
        const hero = newHero("warrior", 9);
        hero.inventory[0] = { uid: 501, base: "void_knight_top", rarity: "unique", level: 63, mods: [], sockets: [{}, {}] as Item["sockets"] };
        expect(stallUpgradeWhyNot(hero, "void", "elite_void_top")).toMatch(/200 void seals/);
        hero.goods.voidSeal = 200;
        const got = stallUpgrade(hero, "void", "elite_void_top");
        expect(typeof got).not.toBe("string");
        expect(hero.inventory[0]!.base).toBe("elite_void_top");
        expect(hero.inventory[0]!.sockets).toHaveLength(2);
        expect(hero.goods.voidSeal).toBe(0);
        expect(stallUpgradeWhyNot(hero, "void", "elite_void_robe")).toMatch(/Void knight robe/);
        expect(hero.log).toContain("elite_void_top");
    });

    it("give the Void Knights' bonuses half again with the elite top and robe both worn", () => {
        const hero = newHero("warrior", 10);
        const wear = (base: string, slot: "head" | "body" | "legs" | "hands", uid: number) => {
            hero.equipment[slot] = { uid, base, rarity: "unique", level: UNIQUE_BY_ID.get(base)!.level, mods: [] };
        };
        wear("void_melee_helm", "head", 601);
        wear("elite_void_top", "body", 602);
        wear("void_knight_gloves", "hands", 603);
        wear("void_knight_robe", "legs", 604);
        expect(setsWorn(hero).void).toBe(4);
        expect(setMore(hero, "void")).toBe(1);
        const plain = heroStats(hero).maxLife;
        wear("elite_void_robe", "legs", 605);
        expect(setMore(hero, "void")).toBe(1.5);
        // The elite robe's 15 life more than the robe's, and the set's 60 half again
        expect(heroStats(hero).maxLife - plain).toBe(15 + 30);
    });

    it("sell an uncut onyx for tokkul, and a talisman of the kind chosen for pearls", () => {
        const hero = newHero("mage", 11);
        expect(buyWare(hero, "tzhaar", "uncutOnyx")).toMatch(/8,000 tokkul/);
        hero.goods.tokkul = 8000;
        expect(buyWare(hero, "tzhaar", "uncutOnyx")).toBeUndefined();
        expect(hero.goods.uncutOnyx).toBe(1);
        expect(hero.goods.tokkul).toBe(0);
        hero.goods.abyssalPearls = 400;
        let uniques = 0;
        for (let i = 0; i < 10; i++) {
            const got = buyTalisman(hero, "felix", "air_talisman");
            expect(typeof got).not.toBe("string");
            const item = got as Item;
            if (item.rarity === "unique") {
                expect(["elemental_talisman", "catalytic_talisman"]).toContain(item.base);
                uniques++;
            } else {
                expect(item.base).toBe("air_talisman");
                expect(item.rarity).toBe("rare");
            }
            hero.inventory[hero.inventory.indexOf(item)] = null;
        }
        expect(uniques).toBeLessThan(10);
        expect(hero.goods.abyssalPearls).toBe(0);
        expect(buyTalisman(hero, "felix", "nature_talisman")).toMatch(/doesn't sell/);
    });

    it("gamble an elite base at the deepest level reached, past the campaign", () => {
        const hero = newHero("warrior", 12);
        hero.maxDepth = 10;
        expect(eliteGambleLevel(hero)).toBeUndefined();
        hero.maxDepth = 30;
        expect(eliteGambleLevel(hero)).toBe(areaLevel(30));
        hero.gold = 10_000_000;
        const game = new Game(land(), hero, { depth: 20, seed: 12, spawn: SPAWN });
        let elite = 0;
        for (let i = 0; i < 12; i++) {
            const got = game.gamble("body", true) as Item;
            expect(got.level).toBe(areaLevel(30));
            if (BASE_BY_ID.get(got.base)?.elite) {
                elite++;
            }
            hero.inventory[hero.inventory.indexOf(got)] = null;
        }
        expect(elite).toBeGreaterThan(0);
        expect(hero.gold).toBe(10_000_000 - 12 * gambleCost(areaLevel(30)));
    });

    it("pay a folk's task past the campaign at its depth, Father Lawrence in ancient shards besides", () => {
        let checked = 0;
        for (let seed = 1; seed <= 40 && checked < 5; seed++) {
            const hero = newHero("warrior", seed);
            hero.level = 70;
            hero.maxDepth = 30;
            const task = rollTask(new Rng(seed), hero, "priest");
            if (task.depth <= 16) {
                expect(task.reward.goods).toBeUndefined();
                continue;
            }
            checked++;
            expect(task.reward.goods?.id).toBe("ancientShard");
            if (task.reward.item && BASE_BY_ID.has(task.reward.item.base) && task.reward.item.rarity !== "unique" && !task.reward.item.rift) {
                expect(task.reward.item.level).toBe(areaLevel(task.depth) + 1);
            }
            hero.tasks.push({ ...task, progress: task.count });
            const paid = claimTask(hero, task.uid);
            expect(typeof paid).not.toBe("string");
            expect(hero.goods.ancientShard).toBe(task.reward.goods!.count);
        }
        expect(checked).toBeGreaterThan(0);
    });
});

// A ladder rift whose guardian is the one asked for: the first such seed, or a later one
function guardedBy(boss: string, depth = 20, skip = 0): Game {
    for (let seed = 1; seed < 20000; seed++) {
        if (ladderRift(depth, seed).zone.boss === boss && skip-- <= 0) {
            const hero = newHero("warrior", seed);
            hero.maxDepth = depth;
            return new Game(land(), hero, { depth, seed, spawn: SPAWN });
        }
    }
    throw new Error(`No rift ${depth} guarded by ${boss}`);
}

describe("the Kraken and Zulrah", () => {
    it("guard Waterbirth's dagannoth and Karamja's jungle, staying where they rise", () => {
        for (const id of ["kraken", "zulrah"]) {
            const game = guardedBy(id);
            const boss = game.boss!;
            expect(boss.def.id).toBe(id);
            expect(boss.mods.some((m) => ["hasted", "blinking", "molten"].includes(m)), id).toBe(false);
            expect(boss.extraSpecial?.kind).not.toBe("charge");
            game.hero.x = boss.x + 6;
            game.hero.y = boss.y;
            game["wake"](boss);
            // Settled where it rose (off a wall, if it rose against one)
            game.step(noInput());
            const at = { x: boss.x, y: boss.y };
            for (let i = 0; i < 400; i++) {
                game.step(noInput());
                game.hero.life = game["stats"].maxLife;
            }
            expect(Math.hypot(boss.x - at.x, boss.y - at.y), id).toBeLessThan(0.01);
        }
    });

    it("has the Kraken a whirlpool till it's disturbed", () => {
        const game = guardedBy("kraken");
        const boss = game.boss!;
        expect(boss.form).toBe(-1);
        expect(boss.def.look).toBe("krakenWhirlpool");
        game["wake"](boss);
        expect(boss.form).toBe(0);
        expect(boss.def.look).toBe("krakenRisen");
        expect(boss.def.ranged).toBeDefined();
    });

    it("turns Zulrah through its three forms, its blows and specials each its own", () => {
        const game = guardedBy("zulrah");
        const boss = game.boss!;
        // The hero stands there and takes it
        game["hurtHero"] = () => 0;
        game.hero.x = boss.x + 5;
        game.hero.y = boss.y;
        game["wake"](boss);
        const seen = new Set<string>();
        for (let i = 0; i < 40 * 30 * 4; i++) {
            game.step(noInput());
            game.hero.life = game["stats"].maxLife;
            seen.add(boss.def.look!);
            if (boss.def.look === "zulrahMagma") {
                expect(boss.def.ranged).toBeUndefined();
                expect(boss.boss!.special.kind).toBe("rain");
            }
        }
        expect([...seen].sort()).toEqual(["zulrahMagma", "zulrahSerpentine", "zulrahTanzanite"]);
        expect(boss.def.id).toBe("zulrah");
        expect(boss.name).toMatch(/Zulrah/);
    });

    it("drop the tentacle and the fang, and their pets", () => {
        let tentacles = 0;
        let fangs = 0;
        for (let i = 0; i < 10; i++) {
            const k = guardedBy("kraken", 20, i);
            k["kill"](k.boss!);
            tentacles += k.drops.filter((d) => d.good?.id === "krakenTentacle").length;
            const z = guardedBy("zulrah", 20, i);
            z["kill"](z.boss!);
            fangs += z.drops.filter((d) => d.good?.id === "magicFang").length;
            expect(z.heroData.achievements).toContain("zulrah:kill");
        }
        expect(tentacles).toBeGreaterThan(0);
        expect(fangs).toBeGreaterThan(0);
        expect(PETS.some((p) => p.id === "kraken")).toBe(true);
    });
});


describe("the Tombs of Amascut", () => {
    function tombs(seed: number, invocations = INVOCATION_IDS.filter(() => false), rooms?: { x: number; y: number; r: number }[]): Game {
        const hero = newHero("warrior", seed);
        hero.maxDepth = 20;
        const game = new Game(land(), hero, { depth: 20, seed, spawn: SPAWN, pinnacle: "tombs", invocations, rooms });
        // The hero stands there and takes it
        game["hurtHero"] = () => 0;
        return game;
    }

    // The hero put somewhere, and a tick stepped
    function goTo(game: Game, x: number, y: number): void {
        game.hero.x = game.hero.prevX = x;
        game.hero.y = game.hero.prevY = y;
        game.step(noInput());
    }

    // Everything in the room that's up killed; its guardian
    function clearRoom(game: Game): Monster {
        const t = game.tombs!;
        expect(t.state).toBe("fighting");
        const guardian = game.monsters.find((m) => m.uid === t.guardian)!;
        for (const m of game["packs"][t.pack].filter((m) => m.state !== "dead")) {
            game["kill"](m);
        }
        game.step(noInput());
        return guardian;
    }

    // Into the Nexus, and on till the Wardens are up
    function wakeWardens(game: Game): void {
        const t = game.tombs!;
        goTo(game, t.x + 2, t.y);
        expect(t.state).toBe("rising");
        for (let i = 0; i < 10 * TICKS_PER_SECOND && t.state === "rising"; i++) {
            game.step(noInput());
        }
        expect(t.state).toBe("fighting");
    }

    it("knows every room's guardian and adds, and its own uniques, each more than its numbers", () => {
        for (const room of TOMBS.rooms) {
            expect(known(room.boss), room.boss).toBe(true);
            for (const [id] of room.adds) {
                expect(known(id), id).toBe(true);
            }
        }
        const own = UNIQUES.filter((u) => u.pinnacle === "tombs");
        expect(own.map((u) => u.id).sort()).toEqual(["elidinis_ward_f", "keris_partisan_of_the_sun", "lightbearer"]);
        for (const u of own) {
            expect(u.traits ?? u.keystone ?? u.power, u.id).toBeDefined();
        }
        expect(awakenable("tombs")).toBe(false);
        expect(raidLevel(INVOCATION_IDS)).toBe(200);
        expect(logPages().find((p) => p.id === "tombs")!.entries.length).toBe(4);
        expect(ACHIEVEMENTS.some((a) => a.id === "akkha:kill")).toBe(true);
    });

    it("has Osmumten by the hero as they come in, and a chamber for each path, each in a place of its own", () => {
        const game = tombs(5);
        const t = game.tombs!;
        expect(t.state).toBe("open");
        expect(game.monsters.length).toBe(0);
        expect(game.timeLimit).toBe(0);
        const osmumten = game.personByUid(t.osmumten)!;
        expect(Math.hypot(osmumten.x - game.hero.x, osmumten.y - game.hero.y)).toBeLessThanOrEqual(TOMBS.osmumten.by + 2);
        expect(game.allyText(osmumten)).toMatch(/Four paths/);
        expect(game.speakTo(osmumten)).toMatch(/any order/);
        // The four paths, but the Wardens, one to a chamber, and no chamber on the hero
        expect(t.chambers.map((c) => c.room).sort()).toEqual([0, 1, 2, 3]);
        for (const c of t.chambers) {
            expect(Math.hypot(c.x - game.hero.x, c.y - game.hero.y)).toBeGreaterThan(c.r * TOMBS.enter);
        }
        // Standing about raises nothing
        for (let i = 0; i < 3 * TICKS_PER_SECOND; i++) {
            game.step(noInput());
        }
        expect(game.monsters.length).toBe(0);
        expect(game.encounterStatus()!.lines[0]).toMatch(/Choose a path/);
    });

    it("takes the chambers a nexus is planned with", () => {
        const rooms = [0, 1, 2, 3].map((i) => ({ x: SPAWN.x + 10 + i * 18, y: SPAWN.y + 40, r: 8 }));
        const t = tombs(5, [], rooms).tombs!;
        expect(t.chambers.map((c) => [c.x, c.y, c.r])).toEqual(rooms.map((c) => [c.x, c.y, c.r]));
    });

    it("raises a path's room as the hero walks into its chamber, in any order, one at a time, and the Wardens in the Nexus last", () => {
        const game = tombs(5);
        const t = game.tombs!;
        const met: string[] = [];
        // The other way round from how they're listed: the order's the hero's
        const order = [...t.chambers].reverse();
        order.forEach((c, i) => {
            goTo(game, c.x, c.y);
            expect(t.state).toBe("fighting");
            expect(t.room).toBe(c.room);
            const guardian = game.monsters.find((m) => m.uid === t.guardian)!;
            expect(guardian.def.id).toBe(TOMBS.rooms[c.room].boss);
            expect(guardian.encounter).toBe("tombs");
            expect(game.shownBoss?.uid).toBe(guardian.uid);
            expect(guardian.uid).not.toBe(game.bossUid);
            // Another chamber walked into while it's up raises nothing
            const other = order[i + 1];
            if (other) {
                goTo(game, other.x, other.y);
                expect(t.room).toBe(c.room);
            }
            met.push(clearRoom(game).def.id);
            expect(c.done).toBe(true);
            expect(t.beaten).toBe(i + 1);
            expect(t.state).toBe(i < order.length - 1 ? "open" : "wardens");
            expect(game.portalOpen).toBe(false);
        });
        expect(met).toEqual(order.map((c) => TOMBS.rooms[c.room].boss));
        // A chamber beaten raises nothing again, and the Wardens wait for the hero in the Nexus
        goTo(game, order[0].x, order[0].y);
        expect(t.state).toBe("wardens");
        expect(game.speakTo(game.personByUid(t.osmumten)!)).toMatch(/Nexus/);
        wakeWardens(game);
        expect(t.room).toBe(TOMBS.rooms.length - 1);
        const wardens = game.monsters.find((m) => m.uid === t.guardian)!;
        expect(wardens.def.id).toBe("wardens");
        expect(wardens.uid).toBe(game.bossUid);
        expect(Math.hypot(wardens.x - t.x, wardens.y - t.y)).toBeLessThanOrEqual(TOMBS.ring[1] + 4);
        clearRoom(game);
        expect(t.state).toBe("done");
        expect(game.portalOpen).toBe(true);
        expect(game.encounterStatus()!.lines[0]).toMatch(/Wardens: beaten/);
    });

    it("keeps Kephri and Zebak where they rise", () => {
        expect(BOSSES.kephri.speed).toBe(0);
        expect(BOSSES.zebak.speed).toBe(0);
        expect(BOSSES.wardens.speed).toBeGreaterThan(0);
    });

    it("lays its invocations over the raid, and pays for them", () => {
        const plain = tombs(6);
        const hard = tombs(6, INVOCATION_IDS);
        expect(hard.invocations).toEqual(INVOCATION_IDS);
        expect(hard.tombs!.level).toBe(200);
        expect(hard["effect"].monsterLife - plain["effect"].monsterLife).toBeCloseTo(INVOCATIONS.walkThePath.effect!.monsterLife!);
        expect(hard["effect"].bossLife - plain["effect"].bossLife).toBeCloseTo(INVOCATIONS.insanity.effect!.bossLife!);
        expect(hard["reward"].quantity - plain["reward"].quantity).toBeCloseTo(200 * TOMBS.perLevel.quantity);
        // Jog for It: ten minutes
        expect(hard.timeLimit / TICKS_PER_SECOND).toBe(600);
        // On a Diet: no potion
        expect(hard["drink"](0)).toBe(false);
        expect(plain["drink"](0)).toBe(true);
        // More Overlords and Double Trouble: two more of the first add, and a rare at their head,
        // in a room that has adds
        for (const g of [plain, hard]) {
            const c = g.tombs!.chambers.find((c) => TOMBS.rooms[c.room].adds.length > 0)!;
            goTo(g, c.x, c.y);
        }
        const adds = (g: Game) => g.monsters.filter((m) => m.encounter === "tombs" && m.rank !== "boss" && m.pack === g.tombs!.pack);
        expect(adds(hard).length - adds(plain).length).toBe(INVOCATIONS.moreOverlords.more);
        expect(adds(hard).some((m) => m.rank === "rare")).toBe(true);
        expect(adds(plain).some((m) => m.rank === "rare")).toBe(false);
    });

    it("drops only hoards from the paths' guardians, the Tombs' uniques from the Wardens, and the raid's achievements", () => {
        const game = tombs(8, INVOCATION_IDS);
        const t = game.tombs!;
        const own = (from: number) => game.drops.slice(from).filter((d) => d.item && UNIQUE_BY_ID.get(d.item.base)?.pinnacle === "tombs").length;
        for (const c of t.chambers) {
            const before = game.drops.length;
            goTo(game, c.x, c.y);
            clearRoom(game);
            expect(own(before)).toBe(0);
        }
        wakeWardens(game);
        const before = game.drops.length;
        clearRoom(game);
        expect(own(before)).toBeGreaterThanOrEqual(1);
        for (const id of ["wardens:kill", "akkha:kill", "zebak:kill", "raid:100", "raid:200"]) {
            expect(game.heroData.achievements, id).toContain(id);
        }
    });
});
