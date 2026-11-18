// Every place is lit as by day, each a little its own way, with no ring of light round the hero
import { CITY_LIGHT } from "./town";
import { DAY, DUSK, HEART_ZONE, ZONES } from "./zones";

describe("daylight", () => {
    it("lights the city and every rift by day", () => {
        expect(DAY).toBeGreaterThan(DUSK);
        for (const light of [CITY_LIGHT, ...ZONES, HEART_ZONE]) {
            expect(light.ambient).toBeGreaterThanOrEqual(DAY);
            expect(light.ambient).toBeLessThanOrEqual(1.1);
        }
    });

    it("gives the rifts days of their own", () => {
        const days = new Set(ZONES.map((z) => `${z.ambient} ${z.ambientColor}`));
        expect(days.size).toBe(ZONES.length);
    });
});
