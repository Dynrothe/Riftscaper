// The levels to 99: the campaign's sixty as they were, each past it 16% dearer than the last, 94
// half the way from 60 to 99; a level past 60 a passive point and nothing else; the city's items
// at 60 at most; and a hero saved before, with the ladder's second points a depth, keeping them.
import { MAX_LEVEL, PEAK_LEVEL, campaignXpToNext, xpToNext } from "../content/rules";
import { fm } from "../../../engine/core/fmath";
import { SAVE_KEY, loadHero, saveHero } from "../client/settings";
import { cityLevel, gainXp, heroStats, newHero } from "./hero";
import { passivePoints } from "./passives";

const store = new Map<string, string>();
beforeAll(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
    };
});

function toLevel(level: number) {
    const hero = newHero("warrior", 3);
    while (hero.level < level) {
        gainXp(hero, xpToNext(hero.level));
    }
    return hero;
}

describe("the levels to 99", () => {
    it("keeps the campaign's sixty, and makes each past it 16% dearer, 94 half the way to 99", () => {
        for (const level of [1, 10, 30, 59]) {
            expect(xpToNext(level)).toBe(Math.round(30 * fm.pow(level, 1.75) + 20));
        }
        // The gems' curve is the campaign's still
        expect(campaignXpToNext(60)).toBe(Math.round(30 * fm.pow(60, 1.75) + 20));
        expect(xpToNext(60) / campaignXpToNext(60)).toBeCloseTo(3.5, 2);
        for (let level = PEAK_LEVEL + 1; level < MAX_LEVEL; level++) {
            expect(xpToNext(level) / xpToNext(level - 1)).toBeCloseTo(1.16, 2);
        }
        const from = (a: number, b: number) => {
            let sum = 0;
            for (let l = a; l < b; l++) {
                sum += xpToNext(l);
            }
            return sum;
        };
        const half = from(PEAK_LEVEL, 94) / from(PEAK_LEVEL, MAX_LEVEL);
        expect(half).toBeGreaterThan(0.45);
        expect(half).toBeLessThan(0.55);
    });

    it("stops at 99, the experience past it kept at none", () => {
        const hero = toLevel(98);
        expect(gainXp(hero, xpToNext(98) * 3)).toBe(1);
        expect(hero.level).toBe(MAX_LEVEL);
        expect(hero.xp).toBe(0);
        expect(gainXp(hero, 1e9)).toBe(0);
    });

    it("gives a passive point a level past 60, and no more life, mana or regeneration", () => {
        const at60 = toLevel(60);
        const at75 = toLevel(75);
        at60.maxDepth = at75.maxDepth = 20;
        const a = heroStats(at60);
        const b = heroStats(at75);
        expect(b.maxLife).toBe(a.maxLife);
        expect(b.maxMana).toBe(a.maxMana);
        expect(b.lifeRegen).toBe(a.lifeRegen);
        expect(passivePoints(at75) - passivePoints(at60)).toBe(15);
        // the depths cleared a point each, and no second on the ladder
        at75.maxDepth = 30;
        expect(passivePoints(at75) - 74 - 29).toBe(0);
    });

    it("deals in the city at 60 at most", () => {
        expect(cityLevel(toLevel(40))).toBe(40);
        expect(cityLevel(toLevel(80))).toBe(PEAK_LEVEL);
    });

    it("lets a hero saved before keep the ladder's second points a depth, and a new hero have none", () => {
        store.clear();
        const old = toLevel(60);
        old.maxDepth = 25;
        const before = 59 + 24 + (24 - 16);
        const raw = JSON.parse(JSON.stringify(old));
        delete raw.ladderPoints;
        store.set(SAVE_KEY, JSON.stringify(raw));
        const back = loadHero()!;
        expect(back.ladderPoints).toBe(8);
        expect(passivePoints(back)).toBe(before);
        // and keeps them, saved again, with the levels past 60 on top
        gainXp(back, xpToNext(60));
        saveHero(back);
        expect(passivePoints(loadHero()!)).toBe(before + 1);

        const fresh = newHero("mage", 5);
        fresh.maxDepth = 25;
        saveHero(fresh);
        expect(loadHero()!.ladderPoints).toBe(0);
    });
});
