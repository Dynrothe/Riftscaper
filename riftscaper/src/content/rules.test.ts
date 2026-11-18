// How monsters grow with their level: as tuned to depth 16, and on the ladder past it slower in
// life and not at all in damage and armour, as the hero has stopped growing there.
import { LADDER_DEPTH, LADDER_LEVEL, areaLevel, monsterArmourScale, monsterDamageScale, monsterLifeScale } from "./rules";

describe("monster scaling", () => {
    it("starts the ladder past the most a monster at depth 16 can be", () => {
        expect(LADDER_DEPTH).toBe(16);
        expect(areaLevel(LADDER_DEPTH)).toBe(61);
        expect(LADDER_LEVEL).toBe(64);
    });

    it("keeps life as tuned to the ladder: eased to 49, then 4% a level", () => {
        expect(monsterLifeScale(1)).toBe(1);
        expect(monsterLifeScale(49)).toBeCloseTo(Math.exp(0.16 * 48 - 0.00125 * 48 * 48), 6);
        expect(monsterLifeScale(LADDER_LEVEL) / monsterLifeScale(49)).toBeCloseTo(Math.exp(0.04 * (LADDER_LEVEL - 49)), 9);
    });

    it("grows life 1.5% a level on the ladder, about 6% a depth", () => {
        for (const level of [LADDER_LEVEL, 80, 137, 300]) {
            expect(monsterLifeScale(level + 1) / monsterLifeScale(level)).toBeCloseTo(Math.exp(0.015), 9);
        }
        const perDepth = monsterLifeScale(areaLevel(30)) / monsterLifeScale(areaLevel(29));
        expect(perDepth).toBeCloseTo(Math.exp(0.06), 9);
        // Depth 24 was 3.6 times depth 16 at 4% a level; on the ladder it's under twice
        const at16 = monsterLifeScale(areaLevel(16));
        expect(monsterLifeScale(areaLevel(24)) / at16).toBeLessThan(2);
        expect(monsterLifeScale(areaLevel(40)) / at16).toBeLessThan(5);
    });

    it("stops damage and armour growing at the ladder", () => {
        expect(monsterDamageScale(LADDER_LEVEL)).toBeGreaterThan(monsterDamageScale(LADDER_LEVEL - 1));
        expect(monsterArmourScale(LADDER_LEVEL)).toBeGreaterThan(monsterArmourScale(LADDER_LEVEL - 1));
        expect(monsterArmourScale(1)).toBe(1);
        for (const level of [LADDER_LEVEL + 1, 100, 545]) {
            expect(monsterDamageScale(level)).toBe(monsterDamageScale(LADDER_LEVEL));
            expect(monsterArmourScale(level)).toBe(monsterArmourScale(LADDER_LEVEL));
        }
    });
});
