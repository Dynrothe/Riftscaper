// Resistances (content/rules.ts RESIST): fire, cold and lightning, from gear's suffixes, a
// talisman's and a quest's, held to 75% and less each Torment lap; a hit of an element is stopped by
// its resistance and not by armour.
import { makeGrid } from "../../../engine/world/testGrid";
import { AFFIX_BY_ID } from "../content/items";
import { RESIST, resistPenalty, resistance } from "../content/rules";
import { Game } from "./Game";
import { heroStats, newHero } from "./hero";
import { plainItem } from "./loot";
import { BASES } from "../content/items";

function land() {
    const rows: string[] = [];
    for (let row = 0; row < 32; row++) {
        rows.push(row === 0 || row === 31 ? "#".repeat(32) : `#${".".repeat(30)}#`);
    }
    return makeGrid(rows, 100, 200);
}

describe("resistances", () => {
    it("are held to their most, and each Torment lap takes its share off, to its most", () => {
        expect(resistPenalty(1)).toBe(0);
        expect(resistPenalty(9)).toBe(RESIST.perLap);
        expect(resistPenalty(17)).toBe(2 * RESIST.perLap);
        expect(resistPenalty(33)).toBe(RESIST.perLap * RESIST.laps);
        expect(resistPenalty(90)).toBe(RESIST.perLap * RESIST.laps);
        expect(resistance(120, 1)).toBe(RESIST.most);
        expect(resistance(0, 40)).toBe(-RESIST.perLap * RESIST.laps);
        expect(resistance(-500, 1)).toBe(RESIST.least);
    });

    it("come from gear's suffixes, all three from one", () => {
        const h = newHero("warrior", 3);
        h.level = 40;
        const ring = BASES.find((b) => b.slot === "ring")!;
        const item = plainItem(500, ring.id);
        item.rarity = "magic";
        item.mods = [
            { affix: "fireRes", tier: 0, values: [20] },
            { affix: "allRes", tier: 0, values: [5] },
        ];
        h.equipment.ring = item;
        expect(AFFIX_BY_ID.get("fireRes")?.kind).toBe("suffix");
        expect(heroStats(h).resist).toEqual({ fire: 25, cold: 5, lightning: 5 });
    });

    it("stop a hit of their element, which armour doesn't", () => {
        const h = newHero("warrior", 3);
        h.level = 40;
        const game = new Game(land(), h, { depth: 1, seed: 2, spawn: { x: 116.5, y: 216.5 } });
        game.stats.armour = 5000;
        const hit = (element?: "fire") => {
            game.hero.life = game.stats.maxLife;
            return game.hurtHero(100, undefined, false, undefined, undefined, element);
        };
        const physical = hit();
        expect(hit("fire")).toBe(100);
        expect(physical).toBeLessThan(100);
        game.stats.resist.fire = 75;
        expect(hit("fire")).toBe(25);
        // Twice as much at -100%
        game.stats.resist.fire = -100;
        expect(hit("fire")).toBe(200);
    });
});
