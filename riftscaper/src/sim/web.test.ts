// The rift web (content/web.ts): each place's rift kept as it is till it's done, the lanes open
// from the hero's, what clearing one at the deepest does, saves, and a bounty in a rift.
import { makeGrid } from "../../../engine/world/testGrid";
import { WEB } from "../content/web";
import { Game } from "./Game";
import { newHero } from "./hero";
import { itemInfo } from "./loot";
import { heroWeb, nextLanes, onWeb, readBounty, readWeb, webCleared, webNode } from "./web";

function land() {
    const rows: string[] = [];
    for (let row = 0; row < 96; row++) {
        rows.push(row === 0 || row === 95 ? "#".repeat(96) : `#${".".repeat(94)}#`);
    }
    return makeGrid(rows, 100, 200);
}

describe("the rift web", () => {
    it("keeps each place's rift as it is, and each place its own", () => {
        const web = { seed: 1234, lane: 2 };
        expect(webNode(web, 20, 1)).toEqual(webNode(web, 20, 1));
        const nodes = [...Array(WEB.lanes).keys()].map((lane) => webNode(web, 20, lane));
        expect(new Set(nodes.map((n) => n.seed)).size).toBe(WEB.lanes);
        for (const n of nodes) {
            expect(n.mods.length).toBeLessThanOrEqual(WEB.mods);
        }
    });

    it("opens a hero's lane and those beside it, and is only at the deepest on the ladder", () => {
        expect(nextLanes(2)).toEqual([1, 2, 3]);
        expect(nextLanes(0)).toEqual([0, 1]);
        expect(nextLanes(WEB.lanes - 1)).toEqual([WEB.lanes - 2, WEB.lanes - 1]);
        const h = newHero("mage", 2);
        h.maxDepth = 20;
        expect(onWeb(h, 20)).toBe(true);
        expect(onWeb(h, 19)).toBe(false);
        h.maxDepth = 12;
        expect(onWeb(h, 12)).toBe(false);
    });

    it("moves the hero onto the lane they clear at their deepest, and comes back from a save", () => {
        const h = newHero("mage", 2);
        h.maxDepth = 25;
        heroWeb(h, () => 77);
        expect(h.web).toEqual({ seed: 77, lane: WEB.start });
        webCleared(h, 24, 0);
        expect(h.web!.lane).toBe(WEB.start);
        webCleared(h, 25, 3);
        expect(h.web!.lane).toBe(3);
        expect(readWeb(JSON.parse(JSON.stringify(h.web)))).toEqual({ seed: 77, lane: 3 });
        expect(readWeb({ seed: 5, lane: 99 })?.lane).toBe(WEB.lanes - 1);
        expect(readWeb({ lane: 1 })).toBeUndefined();
        expect(readBounty("talisman")).toBe("talisman");
        expect(readBounty("gold")).toBeUndefined();
    });

    it("drops its bounty from the guardian, or gives more of what the rift does", () => {
        const make = (bounty: "talisman" | "runes" | "herbs") => {
            const hero = newHero("warrior", 9);
            hero.level = 62;
            return new Game(land(), hero, { depth: 17, seed: 31, spawn: { x: 104.5, y: 204.5 }, bounty });
        };
        const plain = new Game(land(), Object.assign(newHero("warrior", 9), { level: 62 }), { depth: 17, seed: 31, spawn: { x: 104.5, y: 204.5 } });
        expect(make("runes").reward.runes).toBe(plain.reward.runes + 1);
        for (const bounty of ["talisman", "herbs"] as const) {
            const game = make(bounty);
            const boss = game.monsters.find((m) => m.uid === game["bossUid"])!;
            game["kill"](boss);
            const drops = game.drops;
            if (bounty === "talisman") {
                expect(drops.some((d) => d.item && itemInfo(d.item).slot === "talisman")).toBe(true);
            } else {
                expect(drops.filter((d) => d.good && d.good.count >= 3).length).toBeGreaterThan(0);
            }
        }
    });
});
