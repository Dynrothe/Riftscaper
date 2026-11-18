// The ladder's encounters that run on their own (content/encounters.ts): Pest Control's portals
// round the Void Knight, a God Wars skirmish and its kill count, an Abyssal breach's ring and its
// ashes, and Guardians of the Rift's essence; the gods' generals' strongholds they open; and the
// Fortis Colosseum's waves and glories.
import { makeGrid } from "../../../engine/world/testGrid";
import { BREACH, EncounterId, PEST_CONTROL, RIFT_GUARDIANS } from "../content/encounters";
import { COLOSSEUM, GLORIES } from "../content/colosseum";
import { PINNACLES, PinnacleId } from "../content/pinnacles";
import { TICKS_PER_SECOND } from "../content/rules";
import { Game, Monster, noInput } from "./Game";
import { newHero } from "./hero";
import { ladderRift } from "./ladder";
import { pinnacleWhyNot, spendPinnacleKey } from "./pinnacles";

const SIZE = 96;
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

function seedFor(encounter: EncounterId): number {
    for (let seed = 1; seed < 5000; seed++) {
        if (ladderRift(17, seed).encounter === encounter && !ladderRift(17, seed).roamer) {
            return seed;
        }
    }
    throw new Error(`no seed for ${encounter}`);
}

function ladderGame(seed: number, pinnacle?: PinnacleId): Game {
    const hero = newHero("warrior", seed);
    hero.level = 62;
    return new Game(land(), hero, { depth: 17, seed, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 }, pinnacle });
}

// Everything but the encounter's own stood down
function quiet(game: Game): void {
    for (const m of game.monsters) {
        if (!m.encounter) {
            m.state = "dead";
        }
    }
}

function steps(game: Game, n: number): void {
    for (let i = 0; i < n; i++) {
        game.hero.life = game.stats.maxLife;
        game.step(noInput());
    }
}

function kill(game: Game, m: Monster): void {
    game["kill"](m);
}

function standAt(game: Game, x: number, y: number): void {
    game.hero.x = game.hero.prevX = x;
    game.hero.y = game.hero.prevY = y;
}

const sealsOnTheGround = (game: Game) => game.drops.filter((d) => d.good?.id === "voidSeal").reduce((n, d) => n + (d.good?.count ?? 0), 0);

describe("Pest Control", () => {
    it("brings the portals' shields down one at a time, and pays seals for breaking them all", () => {
        const game = ladderGame(seedFor("pestControl"));
        quiet(game);
        const pest = game.pest!;
        expect(pest.state).toBe("waiting");
        expect(game.people.find((p) => p.uid === pest.knight)?.name).toBe(PEST_CONTROL.knight.name);
        const portals = game.monsters.filter((m) => m.encounter === "portal");
        expect(portals.length).toBe(4);
        expect(portals.every((m) => m.shielded)).toBe(true);
        standAt(game, pest.x + 1.5, pest.y);
        steps(game, 2);
        expect(pest.state).toBe("fighting");
        // One open, drawn as its open self; pests come out
        const open = portals.filter((m) => !m.shielded);
        expect(open.length).toBe(1);
        expect(open[0].def.id).toMatch(/Open$/);
        steps(game, TICKS_PER_SECOND * 3);
        expect(game.monsters.some((m) => m.encounter === "pest" && m.state !== "dead")).toBe(true);
        for (const m of portals) {
            kill(game, m);
        }
        expect(pest.state).toBe("won");
        expect(sealsOnTheGround(game)).toBeGreaterThanOrEqual(4 * PEST_CONTROL.commendations.portal + PEST_CONTROL.commendations.won);
        // The pests go with the portals
        expect(game.monsters.some((m) => m.encounter === "pest" && m.state !== "dead")).toBe(false);
    });

    it("ends with the Void Knight's fall, the portals gone with him", () => {
        const game = ladderGame(seedFor("pestControl"));
        quiet(game);
        const pest = game.pest!;
        standAt(game, pest.x + 1.5, pest.y);
        steps(game, 2);
        pest.life = 0;
        steps(game, 1);
        expect(pest.state).toBe("lost");
        expect(game.monsters.some((m) => m.encounter === "portal" && m.state !== "dead")).toBe(false);
    });

    it("takes no hit on a shielded portal", () => {
        const game = ladderGame(seedFor("pestControl"));
        quiet(game);
        const shielded = game.monsters.find((m) => m.encounter === "portal")!;
        const life = shielded.life;
        game["hitMonster"](shielded, { amount: 500, crit: false });
        expect(shielded.life).toBe(life);
    });
});

describe("a God Wars skirmish", () => {
    it("sets two gods' armies on each other, and counts the followers the hero slays", () => {
        const seed = seedFor("godWars");
        const [a, b] = ladderRift(17, seed).armies!;
        expect(a).not.toBe(b);
        const game = ladderGame(seed);
        quiet(game);
        const s = game.skirmish!;
        const army = game.monsters.filter((m) => m.encounter === "army");
        expect(army.some((m) => m.side === a) && army.some((m) => m.side === b)).toBe(true);
        expect(army.filter((m) => m.rank === "rare").length).toBe(2);
        standAt(game, s.x, s.y + 12);
        steps(game, 2);
        expect(s.state).toBe("fighting");
        const before = game.heroData.killCount[a] ?? 0;
        const follower = army.find((m) => m.side === a && m.rank === "normal" && m.state !== "dead")!;
        kill(game, follower);
        expect(game.heroData.killCount[a]).toBe(before + 1);
        for (const m of army) {
            if (m.state !== "dead") {
                kill(game, m);
            }
        }
        expect(s.state).toBe("done");
    });

    it("lets one army's blows fell the other's", () => {
        const game = ladderGame(seedFor("godWars"));
        quiet(game);
        const s = game.skirmish!;
        const army = game.monsters.filter((m) => m.encounter === "army");
        const life = army.reduce((n, m) => n + m.life, 0);
        // The hero's far off, so they've only each other
        standAt(game, s.x, s.y + 15.5);
        steps(game, 2);
        standAt(game, game.hero.x > s.x ? s.x - 40 : s.x + 40, s.y);
        steps(game, TICKS_PER_SECOND * 12);
        expect(army.reduce((n, m) => n + Math.max(0, m.life), 0)).toBeLessThan(life);
    });

    it("opens a general's stronghold with forty of his god's kill count, and spends it", () => {
        const hero = newHero("warrior", 1);
        hero.maxDepth = 20;
        expect(pinnacleWhyNot(hero, "graardor")).toMatch(/kill count/);
        hero.killCount.bandos = 41;
        expect(pinnacleWhyNot(hero, "graardor")).toBeUndefined();
        spendPinnacleKey(hero, "graardor");
        expect(hero.killCount.bandos).toBe(1);
    });

    it("raises the general's bodyguards round him", () => {
        const game = ladderGame(3, "graardor");
        const guards = game.monsters.filter((m) => PINNACLES.graardor.retinue!.includes(m.def.id as never));
        expect(guards.length).toBe(3);
        expect(guards.every((m) => m.rank === "rare")).toBe(true);
    });
});

describe("an Abyssal breach", () => {
    it("opens when touched, pours out the Abyss inside its ring, and closes", () => {
        const game = ladderGame(seedFor("breach"));
        quiet(game);
        const f = game.features.find((x) => x.kind === "breach")!;
        expect(game.breach!.state).toBe("closed");
        standAt(game, f.stand.x, f.stand.y);
        const input = noInput();
        input.command = { kind: "feature", uid: f.uid };
        game.step(input);
        const b = game.breach!;
        expect(b.state).toBe("open");
        steps(game, TICKS_PER_SECOND * 4);
        expect(b.radius).toBeCloseTo(BREACH.radius, 0);
        const poured = game.monsters.filter((m) => m.encounter === "breach" && m.state !== "dead");
        expect(poured.length).toBeGreaterThan(2);
        kill(game, poured[0]);
        expect(game.drops.some((d) => d.good?.id === BREACH.ashesId)).toBe(true);
        steps(game, TICKS_PER_SECOND * BREACH.seconds);
        expect(b.state).toBe("done");
        expect(game.monsters.some((m) => m.encounter === "breach" && m.state !== "dead" && Math.hypot(m.x - b.x, m.y - b.y) > 1)).toBe(false);
    });
});

describe("Guardians of the Rift", () => {
    it("opens the Great Guardian's rift when spoken to, and seals it with essence for pearls", () => {
        const game = ladderGame(seedFor("guardians"));
        quiet(game);
        const g = game.guardian!;
        const guardian = game.people.find((p) => p.uid === g.person)!;
        expect(guardian.name).toBe(RIFT_GUARDIANS.name);
        standAt(game, g.x + 2, g.y);
        game.speakTo(guardian);
        expect(g.state).toBe("active");
        steps(game, TICKS_PER_SECOND * 5);
        const creature = game.monsters.find((m) => m.encounter === "rift" && m.state !== "dead")!;
        expect(creature).toBeDefined();
        kill(game, creature);
        expect(g.carried).toBeGreaterThan(0);
        game.speakTo(guardian);
        expect(g.power).toBeGreaterThan(0);
        expect(g.carried).toBe(0);
        g.carried = 100;
        game.speakTo(guardian);
        expect(g.state).toBe("won");
        expect(game.drops.some((d) => d.good?.id === RIFT_GUARDIANS.pearlsId && (d.good?.count ?? 0) >= RIFT_GUARDIANS.pearls.won)).toBe(true);
    });

    it("closes the rift when time's up, paying a little for the power it had", () => {
        const game = ladderGame(seedFor("guardians"));
        quiet(game);
        const g = game.guardian!;
        game.speakTo(game.people.find((p) => p.uid === g.person)!);
        g.power = 50;
        standAt(game, g.x + 30, g.y + 30);
        steps(game, TICKS_PER_SECOND * (RIFT_GUARDIANS.seconds + 1));
        expect(g.state).toBe("lost");
        expect(game.drops.some((d) => d.good?.id === RIFT_GUARDIANS.pearlsId)).toBe(true);
    });
});

describe("the Fortis Colosseum", () => {
    it("waits for the hero with Minimus, nothing else on its sand, and no clock", () => {
        const game = ladderGame(5, "colosseum");
        const c = game.colosseum!;
        expect(game.monsters.length).toBe(0);
        expect(game.people.find((p) => p.uid === c.minimus)?.name).toBe(COLOSSEUM.minimus.name);
        expect(game.timeLeft).toBe(Infinity);
        expect(c.state).toBe("waiting");
    });

    it("has its sand in the planned guardian's arena, Minimus on it towards the gate, and starts as the hero comes on to it", () => {
        const hero = newHero("warrior", 5);
        hero.level = 62;
        const spawn = { x: BASE_X + 20.5, y: BASE_Y + 20.5 };
        const sand = { x: BASE_X + 50.5, y: BASE_Y + 50.5 };
        const game = new Game(land(), hero, { depth: 17, seed: 5, spawn, pinnacle: "colosseum", guardian: sand });
        const c = game.colosseum!;
        expect([c.x, c.y]).toEqual([sand.x, sand.y]);
        const minimus = game.people.find((p) => p.uid === c.minimus)!;
        expect(Math.hypot(minimus.x - sand.x, minimus.y - sand.y)).toBeLessThanOrEqual(COLOSSEUM.minimus.by + 2);
        expect(Math.hypot(minimus.x - spawn.x, minimus.y - spawn.y)).toBeLessThan(Math.hypot(sand.x - spawn.x, sand.y - spawn.y));
        // At the gate, nothing; a step on to the sand, the first wave's coming
        steps(game, TICKS_PER_SECOND * 2);
        expect(c.state).toBe("waiting");
        standAt(game, sand.x - COLOSSEUM.start + 1, sand.y);
        steps(game, 2);
        expect(c.state).toBe("rest");
    });

    it("runs twelve waves with three glories offered after each, Sol Heredit the last", () => {
        const game = ladderGame(5, "colosseum");
        const c = game.colosseum!;
        standAt(game, c.x + 2, c.y);
        steps(game, 2);
        expect(c.state).toBe("rest");
        steps(game, TICKS_PER_SECOND * COLOSSEUM.rest + 2);
        expect(c.wave).toBe(1);
        expect(game.monsters.filter((m) => m.encounter === "colosseum" && m.state !== "dead").length).toBe(4);
        const life = game.effect.monsterLife;
        for (let wave = 1; wave <= COLOSSEUM.waves.length; wave++) {
            expect(c.wave).toBe(wave);
            for (const m of game.monsters) {
                if (m.state !== "dead") {
                    kill(game, m);
                }
            }
            steps(game, 1);
            if (wave === COLOSSEUM.waves.length) {
                break;
            }
            expect(c.state).toBe("choice");
            expect(new Set(c.offer).size).toBe(COLOSSEUM.offer);
            // Relentless when it's offered, to see its rule land
            const pick = c.offer.includes("relentless") ? "relentless" : c.offer[0];
            const glory = c.glory;
            expect(game.chooseGlory(pick)).toBe(true);
            expect(c.glory).toBe(glory + GLORIES[pick].glory);
            expect(game.chooseGlory(pick)).toBe(false);
            if (pick === "relentless") {
                expect(game.effect.monsterLife).toBeGreaterThan(life);
            }
            steps(game, TICKS_PER_SECOND * COLOSSEUM.rest + 2);
            if (wave + 1 === COLOSSEUM.waves.length) {
                expect(game.monsters.some((m) => m.uid === game.bossUid && m.def.id === "solHeredit" && m.state !== "dead")).toBe(true);
            }
        }
        expect(c.state).toBe("done");
        expect(game.portalOpen).toBe(true);
        expect(Object.values(c.taken).every((n) => n! <= COLOSSEUM.most)).toBe(true);
    });
});
