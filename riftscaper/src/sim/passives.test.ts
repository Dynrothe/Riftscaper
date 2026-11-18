// The passive tree: big, all of a piece, nodes apart from each other; taking nodes by the way to
// them, giving them back, and what they do to the hero.
import { CLASS_IDS } from "../content/classes";
import { PASSIVES, PASSIVE_LINKS, START_NODE } from "../content/passives";
import { LADDER_DEPTH } from "../content/rules";
import { gainXp, heroStats, newHero } from "./hero";
import { allocate, canRefund, passivePoints, pathTo, pointsLeft, refund, resetTree, soundPassives, takenSet } from "./passives";
import { resolveSkills } from "./skills";

// Inside the inner ring, where the tastes are
const R_INNER = 320;
// The herblore way's, made after the wings: past the rim at 0°, near the axis
const herblore = (n: { x: number; y: number }) => Math.hypot(n.x, n.y) > 1900 && Math.abs(n.y) < 320;

describe("the passive tree", () => {
    it("is big, and every link goes both ways", () => {
        expect(PASSIVES.length).toBeGreaterThan(600);
        expect(PASSIVES.filter((n) => n.kind === "notable").length).toBeGreaterThanOrEqual(50);
        expect(PASSIVES.filter((n) => n.kind === "keystone").length).toBeGreaterThanOrEqual(8);
        PASSIVES.forEach((n, i) => {
            expect(n.id).toBe(i);
            for (const l of n.links) {
                expect(PASSIVES[l].links).toContain(n.id);
            }
        });
        expect(PASSIVE_LINKS.length).toBeGreaterThan(PASSIVES.length);
    });

    it("can be walked from every class's start to every node but the others' starts and their own few inside them", () => {
        for (const cls of CLASS_IDS) {
            const taken = new Set([START_NODE[cls]]);
            let closed = 0;
            for (const n of PASSIVES) {
                if (n.id === START_NODE[cls]) {
                    continue;
                }
                const path = pathTo(cls, taken, n.id);
                if (n.kind === "start") {
                    expect(path).toBeUndefined();
                } else if (!path) {
                    // Another class's own: a short way in from its start
                    closed++;
                    const owner = CLASS_IDS.find((other) => other !== cls && (pathTo(other, new Set([START_NODE[other]]), n.id)?.length ?? 99) <= 3);
                    expect(owner, `${cls} to ${n.name} (${n.id})`).toBeDefined();
                }
            }
            // Three of each other class's of one attribute, two of each hybrid's
            expect(closed).toBeLessThanOrEqual(3 * (CLASS_IDS.length - 1));
        }
    });

    it("starts each hybrid between the classes of its two attributes, and keeps every node before them where it was", () => {
        for (const cls of ["paladin", "rogue", "necromancer"] as const) {
            const start = PASSIVES[START_NODE[cls]];
            expect(start.kind).toBe("start");
            // Made after every other node but the hybrids' own
            expect(start.id).toBeGreaterThan(START_NODE.warrior);
            expect(start.id).toBeGreaterThan(PASSIVES.filter((n) => n.kind === "keystone" && !n.wing && !herblore(n)).at(-1)!.id);
            // A notable of its own two nodes in
            const inside = PASSIVES.filter((n) => (pathTo(cls, new Set([start.id]), n.id)?.length ?? 99) <= 2 && n.kind === "notable");
            expect(inside.length).toBe(1);
        }
        // The pure classes' starts are where they always were, and the hybrids' too
        expect([START_NODE.warrior, START_NODE.ranger, START_NODE.mage].every((id) => id < 30)).toBe(true);
        expect([START_NODE.paladin, START_NODE.rogue, START_NODE.necromancer]).toEqual([633, 636, 639]);
        // What came after them: the tastes, the sockets, the wings, the herblore way
        const after = PASSIVES.filter((n) => n.id > START_NODE.necromancer + 2);
        expect(after.every((n) => n.wing || n.kind === "socket" || Math.hypot(n.x, n.y) < R_INNER || herblore(n))).toBe(true);
        // The herblore way, made last: a keystone at its end, and three notables
        const way = PASSIVES.filter(herblore);
        expect(way.filter((n) => n.kind === "keystone").map((n) => n.keystone)).toEqual(["barbarianHerblore"]);
        expect(way.filter((n) => n.kind === "notable").length).toBe(3);
        expect(Math.min(...way.map((n) => n.id))).toBeGreaterThan(Math.max(...PASSIVES.filter((n) => n.wing).map((n) => n.id)));
    });

    it("has a wing for each class past the rim, its keystones about thirty points from the class's start", () => {
        for (const cls of CLASS_IDS) {
            const wing = PASSIVES.filter((n) => n.wing === cls);
            expect(wing.filter((n) => n.kind === "keystone").length).toBeGreaterThanOrEqual(2);
            expect(wing.filter((n) => n.kind === "socket").length).toBe(1);
            for (const k of wing.filter((n) => n.kind === "keystone")) {
                const path = pathTo(cls, new Set([START_NODE[cls]]), k.id)!;
                expect(path.length, `${cls} to ${k.name}`).toBeGreaterThan(22);
                expect(path.length, `${cls} to ${k.name}`).toBeLessThan(36);
            }
        }
        // Thirteen keystones in the wings, and a socket in each sector of the main tree
        expect(PASSIVES.filter((n) => n.kind === "keystone" && n.wing).length).toBe(13);
        expect(PASSIVES.filter((n) => n.kind === "socket" && !n.wing).length).toBe(12);
    });

    it("has no two nodes on top of each other", () => {
        // Gathered rather than expected a pair at a time, which is slow enough to time out
        const close: string[] = [];
        for (let i = 0; i < PASSIVES.length; i++) {
            for (let j = i + 1; j < PASSIVES.length; j++) {
                const a = PASSIVES[i];
                const b = PASSIVES[j];
                if (!(Math.hypot(a.x - b.x, a.y - b.y) > 30)) {
                    close.push(`${a.name} (${a.id}) and ${b.name} (${b.id})`);
                }
            }
        }
        expect(close).toEqual([]);
    });

    it("gives a point a level and a point a rift, taken by the way to a node", () => {
        const hero = newHero("warrior", 1);
        expect(passivePoints(hero)).toBe(0);
        expect(allocate(hero, PASSIVES[START_NODE.warrior].links[0])).toMatch(/no passive points/);
        gainXp(hero, 3000);
        hero.maxDepth = 3;
        expect(passivePoints(hero)).toBe(hero.level - 1 + 2);
        // One a rift on the ladder too, its levels past 60 the rest (levels.test.ts); a hero saved
        // before keeps the second a rift they had
        hero.maxDepth = LADDER_DEPTH + 1;
        expect(passivePoints(hero)).toBe(hero.level - 1 + LADDER_DEPTH);
        hero.maxDepth = LADDER_DEPTH + 2;
        expect(passivePoints(hero)).toBe(hero.level - 1 + LADDER_DEPTH + 1);
        hero.ladderPoints = 1;
        expect(passivePoints(hero)).toBe(hero.level - 1 + LADDER_DEPTH + 2);
        hero.ladderPoints = 0;
        hero.maxDepth = 3;
        // A node a few steps away takes them all
        const taken = takenSet(hero);
        const far = PASSIVES.find((n) => {
            const path = pathTo("warrior", taken, n.id);
            return path !== undefined && path.length === 3;
        })!;
        const before = pointsLeft(hero);
        expect(allocate(hero, far.id)).toBeUndefined();
        expect(pointsLeft(hero)).toBe(before - 3);
        expect(hero.passives).toContain(far.id);
        // The one in the middle holds the far one up; the far one can go
        const middle = hero.passives[1];
        expect(canRefund(hero, middle)).toBe(false);
        expect(canRefund(hero, far.id)).toBe(true);
        hero.gold = 0;
        expect(refund(hero, far.id)).toMatch(/gold/);
        hero.gold = 1000;
        expect(refund(hero, far.id)).toBeUndefined();
        expect(hero.passives).not.toContain(far.id);
        expect(hero.gold).toBeLessThan(1000);
        expect(resetTree(hero)).toBeUndefined();
        expect(hero.passives).toEqual([]);
    });

    it("makes the hero stronger for what's taken", () => {
        const hero = newHero("warrior", 1);
        gainXp(hero, 1e6);
        const before = heroStats(hero);
        // Every life node within reach of the points
        const lifeNode = PASSIVES.find((n) => n.stats.some((s) => s.stat === "lifePct") && (pathTo("warrior", takenSet(hero), n.id)?.length ?? 99) <= pointsLeft(hero))!;
        expect(allocate(hero, lifeNode.id)).toBeUndefined();
        expect(heroStats(hero).maxLife).toBeGreaterThan(before.maxLife);
    });

    it("has keystones that change the rules: Blood Rite's skills cost life", () => {
        const hero = newHero("mage", 1);
        gainXp(hero, 1e8);
        hero.maxDepth = 60;
        const blood = PASSIVES.find((n) => n.keystone === "bloodRite")!;
        expect(allocate(hero, blood.id)).toBeUndefined();
        const stats = heroStats(hero);
        expect(stats.maxMana).toBe(0);
        expect(stats.keystones.has("bloodRite")).toBe(true);
        const costly = resolveSkills(hero, stats).find((s) => s && s.def.mana > 0)!;
        expect(costly.mana).toBe(0);
        expect(costly.life).toBeGreaterThan(0);
    });

    it("drops what a save had that doesn't join up, or that's more than the hero's points", () => {
        const hero = newHero("ranger", 1);
        gainXp(hero, 3000);
        const start = PASSIVES[START_NODE.ranger];
        hero.passives = [start.links[0], 99999, START_NODE.mage, ...PASSIVES.map((n) => n.id).slice(0, 300)];
        soundPassives(hero);
        expect(hero.passives.length).toBeLessThanOrEqual(passivePoints(hero));
        expect(hero.passives).not.toContain(99999);
        expect(hero.passives).not.toContain(START_NODE.mage);
        for (const id of hero.passives) {
            expect(canRefund(hero, id) || hero.passives.some((o) => o !== id)).toBe(true);
        }
    });
});
