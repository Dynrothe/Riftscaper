// Reldo's quests (content/quests.ts): each opens once its zone's reached, counts in that zone's
// rifts, is claimed from him once, and leaves something for good: a passive point, the gem trader's
// favours, attributes, life, resistances, a riftstone, one more of the Archmage's offers.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { AFFIX_BY_ID, BASES } from "../content/items";
import { Game, Monster } from "./Game";
import { socketWork, socketWorkCost } from "./gems";
import { Hero, heroStats, newHero } from "./hero";
import { plainItem } from "./loot";
import { passivePoints } from "./passives";
import { claimQuest, questClear, questKill, questOffers, questState, readQuests } from "./quests";

const SIZE = 64;
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

function hero(maxDepth = 9): Hero {
    const h = newHero("warrior", 5);
    h.level = 20;
    h.maxDepth = maxDepth;
    return h;
}

const none = () => false;
const rng = () => new Rng(11);

describe("Reldo's quests", () => {
    it("open once their zone's reached, and count only there", () => {
        const h = hero(2);
        expect(questState(h, "greenway")).toBe("open");
        expect(questState(h, "frostmarch")).toBe("unseen");
        h.maxDepth = 6;
        // Kree'arra slain on the ladder (his pinnacle's) counts for nothing; in Frostmarch (rift 5),
        // it's done
        expect(questKill(h, "kreearra", "boss", 20, [], none)).toEqual([]);
        expect(questKill(h, "kreearra", "boss", 5, [], none)).toEqual(["frostmarch"]);
        expect(questState(h, "frostmarch")).toBe("ready");
        // Done once
        expect(questKill(h, "kreearra", "boss", 5, [], none)).toEqual([]);
    });

    it("leave what they give for good, claimed once", () => {
        const h = hero();
        const life = heroStats(h).maxLife;
        const points = passivePoints(h);
        questKill(h, "kreearra", "boss", 5, [], none);
        questKill(h, "goblin", "normal", 1, [], () => true);
        expect(claimQuest(rng(), h, "frostmarch")).toEqual({ item: undefined });
        expect(claimQuest(rng(), h, "greenway")).toEqual({ item: undefined });
        expect(typeof claimQuest(rng(), h, "greenway")).toBe("string");
        expect(heroStats(h).maxLife).toBeGreaterThanOrEqual(life + 20);
        expect(passivePoints(h)).toBe(points + 1);
    });

    it("ask Jad's rift to be Fleeting, and the Dunes' to be cleared in half the time", () => {
        const h = hero();
        expect(questKill(h, "jad", "boss", 6, [], none)).toEqual([]);
        expect(questKill(h, "jad", "boss", 6, ["fleeting"], none)).toEqual(["ashen"]);
        const before = heroStats(h).resist.fire;
        claimQuest(rng(), h, "ashen");
        expect(heroStats(h).resist.fire).toBe(before + 10);
        expect(questClear(h, 7, 0.3)).toEqual([]);
        expect(questClear(h, 15, 0.6)).toEqual(["dunes"]);
        const got = claimQuest(rng(), h, "dunes");
        expect(typeof got !== "string" && got.item?.rift?.length).toBe(3);
    });

    it("count each Barrows brother's rare across the Barrow Fields' rifts", () => {
        const h = hero();
        expect(questKill(h, "dharok", "rare", 4, [], none)).toEqual([]);
        expect(questKill(h, "dharok", "normal", 4, [], none)).toEqual([]);
        expect(questKill(h, "ahrim", "rare", 12, [], none)).toEqual([]);
        expect(questKill(h, "karil", "rare", 4, [], none)).toEqual(["barrows"]);
    });

    it("leave the gem trader's favours: a socket for nothing, and an imbue", () => {
        const h = hero();
        h.gold = 0;
        const body = BASES.find((b) => b.slot === "body" && b.level <= 10)!;
        h.equipment.body = plainItem(900, body.id);
        h.equipment.body.sockets = [];
        expect(socketWorkCost(h.equipment.body, "imbue", h)).toBeUndefined();
        questKill(h, "werewolfAlpha", "boss", 2, [], none);
        questKill(h, "countDraynor", "boss", 3, [], none);
        claimQuest(rng(), h, "gloomwood");
        claimQuest(rng(), h, "marsh");
        expect(socketWorkCost(h.equipment.body, "socket", h)).toBe(0);
        expect(socketWork(h, rng(), "body", "socket")).toBeUndefined();
        expect(h.equipment.body.sockets!.length).toBe(1);
        // Spent: the next one costs
        expect(socketWorkCost(h.equipment.body, "socket", h)).toBeGreaterThan(0);
        expect(socketWork(h, rng(), "body", "imbue")).toBeUndefined();
        const item = h.equipment.body;
        expect(item.rarity).toBe("rare");
        expect(item.mods.length).toBeGreaterThanOrEqual(3);
        // Each at the best tier its level allows
        for (const m of item.mods) {
            const tiers = AFFIX_BY_ID.get(m.affix)!.tiers;
            const best = tiers.reduce((b, t, i) => (t.level <= h.level && t.level < 65 ? i : b), 0);
            expect(m.tier).toBeGreaterThanOrEqual(best);
        }
        expect(socketWorkCost(item, "imbue", h)).toBeUndefined();
    });

    it("give the Archmage one more offer, and come back from a save", () => {
        const h = hero();
        questKill(h, "kril", "boss", 8, [], none);
        claimQuest(rng(), h, "abyss");
        expect(questOffers(h)).toBe(1);
        const back = readQuests(JSON.parse(JSON.stringify({ ...h.quests, ready: ["greenway", "bogus"] })));
        expect(back?.claimed).toEqual(["abyss"]);
        expect(back?.ready).toEqual(["greenway"]);
        expect(readQuests(undefined)).toBeUndefined();
    });
});

describe("Reldo's quests in a rift", () => {
    it("are done in the Greenway when the last monster falls, guardian and all", () => {
        const h = hero(1);
        const game = new Game(land(), h, { depth: 1, seed: 4, spawn: { x: BASE_X + 32.5, y: BASE_Y + 32.5 } });
        const kill = (m: Monster) => game["kill"](m);
        const alive = game.monsters.filter((m) => m.state !== "dead");
        expect(alive.length).toBeGreaterThan(1);
        alive.slice(0, -1).forEach(kill);
        expect(game.takeEvents().some((e) => e.kind === "quest")).toBe(false);
        kill(alive[alive.length - 1]);
        expect(game.takeEvents().some((e) => e.kind === "quest" && e.id === "greenway")).toBe(true);
        expect(questState(h, "greenway")).toBe("ready");
    });
});
