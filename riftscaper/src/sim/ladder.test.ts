// The ladder: past depth 16 each rift is rolled from its seed (a land, a host, a guardian), the same
// seed always the same rift, and every roll one the map maker takes; its monsters' mods, the
// ailments they put on the hero, and the potion suffixes that end them.
import { makeGrid } from "../../../engine/world/testGrid";
import { getSettingsError } from "../../../engine/scaperune/settings";
import { BASES } from "../content/items";
import { CAMPAIGN_MODS, LADDER_MODS, LEADER_MODS, MOD } from "../content/monsterMods";
import { ZONES } from "../content/zones";
import { riftSettings } from "../world/zoneGen";
import { Game, Monster, noInput } from "./Game";
import { newHero } from "./hero";
import { ladderRift, onLadder, riftBoss, riftName, riftZone } from "./ladder";
import { Item } from "./loot";
import { mostDoses } from "./potions";

const SIZE = 72;
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

function hero(seed: number, level: number) {
    const h = newHero("warrior", seed);
    h.level = level;
    return h;
}

function ladderGame(seed: number, level = 62): Game {
    return new Game(land(), hero(seed, level), { depth: 17, seed, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
}

// A monster of the rift's set down beside the hero with these mods, its pack's only one awake
function beside(game: Game, mods: Monster["mods"]): Monster {
    const m = game.monsters.find((n) => n.rank !== "boss" && n.state !== "dead")!;
    m.mods = mods;
    m.x = m.prevX = game.hero.x + 1;
    m.y = m.prevY = game.hero.y;
    m.state = "chase";
    return m;
}

function quiet(game: Game, keep: Monster[] = []): void {
    for (const m of game.monsters) {
        if (!keep.includes(m)) {
            m.state = "dead";
        }
    }
}

describe("the ladder", () => {
    it("starts past depth 16, and leaves the campaign's zones as they were", () => {
        expect(onLadder(16)).toBe(false);
        expect(onLadder(17)).toBe(true);
        expect(onLadder(30, "heart")).toBe(false);
        expect(onLadder(30, "kril")).toBe(false);
        expect(riftZone(5, 123)).toBe(ZONES[4]);
        expect(riftZone(13, 99).name).toBe(ZONES[4].name);
    });

    it("rolls the same rift from the same seed, and many kinds from many", () => {
        expect(ladderRift(17, 42)).toBe(ladderRift(17, 42));
        expect(riftName(17, 42)).toBe(riftName(17, 42));
        const hosts = new Set<string>();
        const lands = new Set<string>();
        const names = new Set<string>();
        for (let seed = 1; seed <= 300; seed++) {
            const rift = ladderRift(17 + (seed % 9), seed * 7919);
            hosts.add(rift.host.id);
            lands.add(rift.biome);
            names.add(rift.title);
            expect(rift.host.guardians).toContain(rift.zone.boss);
        }
        expect(hosts.size).toBeGreaterThanOrEqual(12);
        expect(lands.size).toBeGreaterThanOrEqual(10);
        expect(names.size).toBeGreaterThan(100);
        expect(riftName(17, 5)).toMatch(/\(Torment 2\)$/);
        expect(riftName(25)).toBe("Depth 25 of the ladder (Torment 3)");
    });

    it("only rolls lands the map maker takes", () => {
        for (let seed = 1; seed <= 120; seed++) {
            const settings = riftSettings(17 + (seed % 5), seed * 104729);
            expect(getSettingsError(settings)).toBeUndefined();
        }
    });

    it("is held by its host: its monsters and its guardian", () => {
        for (const seed of [3, 11, 29]) {
            const game = ladderGame(seed);
            const rift = ladderRift(17, seed);
            expect(game.boss!.def.id).toBe(riftBoss(17, seed));
            const allowed = new Set<string>([...rift.host.monsters.map(([id]) => id), ...(rift.host.leaders ?? [])]);
            for (const m of game.monsters) {
                if (m.rank !== "boss" && !m.encounter) {
                    expect(allowed.has(m.def.id)).toBe(true);
                }
            }
        }
    });

    it("gives magic packs one or two mods and rares three or four, the campaign only its six", () => {
        for (const seed of [4, 8, 15, 16, 23, 42]) {
            const game = ladderGame(seed);
            for (const m of game.monsters) {
                if (m.encounter || m.rank === "boss") {
                    continue;
                }
                if (m.rank === "magic") {
                    expect(m.mods.length).toBeGreaterThanOrEqual(1);
                    expect(m.mods.length).toBeLessThanOrEqual(2);
                    for (const mod of m.mods) {
                        expect(LEADER_MODS).not.toContain(mod);
                        expect(m.def.ranged !== undefined || mod !== "volleying").toBe(true);
                    }
                } else if (m.rank === "rare") {
                    expect(m.mods.length).toBeGreaterThanOrEqual(3);
                    expect(m.mods.length).toBeLessThanOrEqual(4);
                    expect(new Set(m.mods).size).toBe(m.mods.length);
                }
                for (const mod of m.mods) {
                    expect(LADDER_MODS).toContain(mod);
                }
            }
        }
        const campaign = new Game(land(), hero(1, 40), { depth: 12, seed: 9, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        for (const m of campaign.monsters) {
            for (const mod of m.mods) {
                expect(CAMPAIGN_MODS).toContain(mod);
            }
        }
    });

    it("lets a Frostbound monster's blow chill the hero, who goes slower", () => {
        const game = ladderGame(5);
        const m = beside(game, ["frostbound"]);
        quiet(game, [m]);
        m.damage = [1, 1];
        for (let i = 0; i < 400 && !game.ailmentList().some((a) => a.kind === "chill"); i++) {
            game.hero.life = 1e6;
            game.step(noInput());
        }
        expect(game.ailmentList().map((a) => a.name)).toContain("Chilled");
        // Walking east, chilled, covers less ground than walking unchilled
        quiet(game);
        game.strikes.length = 0;
        const walk = (): number => {
            const from = game.hero.x;
            const input = noInput();
            input.moveX = 1;
            for (let i = 0; i < 10; i++) {
                game.step(input);
            }
            return game.hero.x - from;
        };
        game.ailments.chill = game.tick + 1000;
        const slow = walk();
        game.ailments.chill = 0;
        const fast = walk();
        expect(slow).toBeLessThan(fast * 0.8);
    });

    it("bursts into flame as an Infernal monster dies, and the fire burns", () => {
        const game = ladderGame(6);
        const m = beside(game, ["infernal"]);
        quiet(game, [m]);
        game["kill"](m);
        expect(game.strikes.some((s) => s.ailment?.kind === "burn")).toBe(true);
        const life = (game.hero.life = game.stats.maxLife);
        for (let i = 0; i < 100; i++) {
            game.step(noInput());
        }
        expect(game.hero.life).toBeLessThan(life);
    });

    it("roots the hero where they stand, and a potion of Footing frees them", () => {
        const game = ladderGame(7);
        quiet(game);
        game.ailments.root = game.tick + 1000;
        const from = game.hero.x;
        const input = noInput();
        input.moveX = 1;
        for (let i = 0; i < 5; i++) {
            game.step(input);
        }
        expect(game.hero.x).toBeCloseTo(from);
        const base = BASES.find((b) => b.slot === "potion" && b.name === "Guthix rest")!;
        const potion: Item = { uid: 900, base: base.id, rarity: "magic", level: 70, mods: [{ affix: "pFooting", tier: 0, values: [5] }] };
        potion.charges = mostDoses(potion);
        // A hero on the ladder who's done the Apothecary's errands has every place of the belt open
        game.heroData.beltStitched = 2;
        game.heroData.potions[2] = potion;
        const drink = noInput();
        drink.potion = 2;
        game.step(drink);
        expect(game.ailmentList().length).toBe(0);
        // And none takes hold while it works
        game["afflict"]("root", 3);
        expect(game.ailments.root).toBe(0);
        for (let i = 0; i < 5; i++) {
            game.step(input);
        }
        expect(game.hero.x).toBeGreaterThan(from + 0.3);
    });

    it("makes a Shielding monster's packmates hard to hurt while it stands", () => {
        const game = ladderGame(8);
        const pack = game.monsters.find((m) => m.rank === "magic")!.pack;
        const mates = game.monsters.filter((m) => m.pack === pack);
        expect(mates.length).toBeGreaterThan(1);
        const [shield, mate] = mates;
        shield.mods = ["shielding"];
        mate.mods = [];
        mate.armour = 0;
        game.step(noInput());
        const life = mate.life;
        game["hitMonster"](mate, { amount: 100, crit: false });
        const shielded = life - mate.life;
        game["kill"](shield);
        game.step(noInput());
        const after = mate.life;
        game["hitMonster"](mate, { amount: 100, crit: false });
        expect(shielded).toBeLessThan((after - mate.life) * (1 - MOD.shielding.less) + 2);
    });

    it("lets a Raising monster raise its fallen pack once each", () => {
        const game = ladderGame(9);
        const pack = game.monsters.find((m) => m.rank === "magic")!.pack;
        const mates = game.monsters.filter((m) => m.pack === pack);
        const [raiser, fallen, ...rest] = mates;
        quiet(game, [raiser, fallen]);
        for (const m of rest) {
            m.raised = true;
        }
        raiser.mods = ["raising"];
        raiser.state = "chase";
        game["kill"](fallen);
        const before = game.monsters.length;
        for (let i = 0; i < 50 * 8; i++) {
            game.hero.life = 1e6;
            game.step(noInput());
        }
        const risen = game.monsters.slice(before);
        expect(risen.length).toBe(1);
        expect(risen[0].def.id).toBe(fallen.def.id);
    });
});
