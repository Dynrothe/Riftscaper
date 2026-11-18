// The ladder's encounters (content/encounters.ts): an impling that flees and is gone, a hunter
// that finds the hero from far off, the Fight Caves' waves and their doubling tokkul, the Barrows'
// tombs and chest, superiors, a roaming Wilderness boss, and a guardian's mods and specials.
import { makeGrid } from "../../../engine/world/testGrid";
import { BARROWS, EncounterId, FIGHT_CAVES, IMPLING, ROAMERS, SUPERIOR } from "../content/encounters";
import { GUARDIAN_MODS, LADDER_MODS, MOD } from "../content/monsterMods";
import { TICKS_PER_SECOND } from "../content/rules";
import { Game, Monster, noInput } from "./Game";
import { newHero } from "./hero";
import { ladderRift } from "./ladder";

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

// A ladder rift at depth 17 with this encounter (and a roamer, or none, if asked)
function seedFor(encounter: EncounterId, roamer?: boolean): number {
    for (let seed = 1; seed < 5000; seed++) {
        const rift = ladderRift(17, seed);
        if (rift.encounter === encounter && (roamer === undefined || (rift.roamer !== undefined) === roamer)) {
            return seed;
        }
    }
    throw new Error(`no seed for ${encounter}`);
}

function ladderGame(seed: number, depth = 17): Game {
    const hero = newHero("warrior", seed);
    hero.level = 62;
    return new Game(land(), hero, { depth, seed, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
}

// Everything but these stood down
function quiet(game: Game, keep: Monster[] = []): void {
    for (const m of game.monsters) {
        if (!keep.includes(m)) {
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

function touch(game: Game, uid: number): void {
    const f = game.featureByUid(uid)!;
    game.hero.x = game.hero.prevX = f.stand.x;
    game.hero.y = game.hero.prevY = f.stand.y;
    const input = noInput();
    input.command = { kind: "feature", uid };
    game.step(input);
}

describe("the ladder's encounters", () => {
    it("lets an impling flee once it's seen you, and be gone when its time's up", () => {
        const game = ladderGame(seedFor("impling", false));
        const imp = game.monsters.find((m) => m.encounter === "impling")!;
        expect(imp).toBeDefined();
        quiet(game, [imp]);
        game.hero.x = game.hero.prevX = imp.x - 3;
        game.hero.y = game.hero.prevY = imp.y;
        steps(game, 20);
        expect(imp.state).toBe("chase");
        expect(imp.fleeUntil).toBeDefined();
        // It's got further away
        expect(Math.hypot(imp.x - game.hero.x, imp.y - game.hero.y)).toBeGreaterThan(3);
        game.takeEvents();
        steps(game, IMPLING.seconds * TICKS_PER_SECOND);
        expect(imp.state).toBe("dead");
        expect(game.takeEvents().some((e) => e.kind === "encounter" && e.what === "implingGone")).toBe(true);
    });

    it("gives a caught impling's jar", () => {
        const game = ladderGame(seedFor("impling"));
        const imp = game.monsters.find((m) => m.encounter === "impling")!;
        const before = game.drops.length;
        kill(game, imp);
        expect(game.drops.length - before).toBeGreaterThan(2);
    });

    it("sends a hunter after the hero from far off, never letting go", () => {
        const game = ladderGame(seedFor("hunter"));
        const hunter = game.monsters.find((m) => m.encounter === "hunter")!;
        expect(hunter.rank).toBe("rare");
        expect(hunter.name).toMatch(/the Wilderness hunter$/);
        quiet(game, [hunter]);
        game.hero.x = game.hero.prevX = hunter.x - 18;
        game.hero.y = game.hero.prevY = hunter.y;
        steps(game, 20);
        expect(hunter.state).toBe("chase");
    });

    it("pays the Fight Caves' tokkul, doubled for each wave faced", () => {
        const game = ladderGame(seedFor("fightCaves"));
        quiet(game);
        const caves = game.caves!;
        expect(caves.state).toBe("ready");
        touch(game, caves.feature);
        expect(caves.wave).toBe(1);
        expect(caves.state).toBe("fighting");
        const wave = () => game.monsters.filter((m) => m.encounter === "caves" && m.state !== "dead");
        expect(wave().length).toBe(FIGHT_CAVES.waves[0].reduce((n, [, c]) => n + c, 0));
        for (const m of wave()) {
            kill(game, m);
        }
        expect(caves.state).toBe("choice");
        expect(caves.held).toBe(FIGHT_CAVES.tokkul);
        game.cavesGo();
        expect(caves.wave).toBe(2);
        for (const m of wave()) {
            kill(game, m);
        }
        expect(caves.held).toBe(FIGHT_CAVES.tokkul * 2);
        game.cavesTake();
        expect(caves.state).toBe("done");
        expect(game.drops.some((d) => d.good?.id === "tokkul" && d.good.count === FIGHT_CAVES.tokkul * 2)).toBe(true);
        expect(game.featureByUid(caves.feature)!.used).toBe(true);
    });

    it("keeps the Barrows chest sealed till its three brothers are slain", () => {
        const game = ladderGame(seedFor("barrows"));
        quiet(game);
        const tombs = game.features.filter((f) => f.kind === "tomb");
        const chest = game.features.find((f) => f.kind === "barrows")!;
        expect(tombs.length).toBe(BARROWS.tombs);
        expect(game.barrowsTombs).toBe(BARROWS.tombs);
        game.takeEvents();
        touch(game, chest.uid);
        expect(chest.used).toBe(false);
        expect(game.takeEvents().some((e) => e.kind === "encounter" && e.what === "barrowsSealed")).toBe(true);
        for (const tomb of tombs) {
            touch(game, tomb.uid);
            const brother = game.monsters.find((m) => m.encounter === "brother" && m.state !== "dead")!;
            expect(brother.def.id).toBe(tomb.brother);
            kill(game, brother);
        }
        const before = game.drops.length;
        touch(game, chest.uid);
        expect(chest.used).toBe(true);
        expect(game.drops.length).toBeGreaterThan(before);
    });

    it("calls up a superior: its own where the cache has one, five rares' life", () => {
        const game = ladderGame(seedFor("impling"));
        const m = game.monsters.find((o) => o.rank === "normal" && !o.encounter)!;
        const rare = game.monsters.find((o) => o.rank === "rare" && !o.encounter && o.def.id === m.def.id);
        game["callSuperior"](m);
        const s = game.monsters[game.monsters.length - 1];
        expect(s.encounter).toBe("superior");
        expect(s.rank).toBe("rare");
        if (rare) {
            expect(s.maxLife).toBeGreaterThan(rare.maxLife * (SUPERIOR.life - 1.5));
        }
        const before = game.drops.length;
        kill(game, s);
        expect(game.drops.length - before).toBeGreaterThanOrEqual(SUPERIOR.drops);
    });

    it("sets a Wilderness boss roaming one ladder rift in four, which isn't the guardian", () => {
        let roamers = 0;
        for (let seed = 1; seed <= 400; seed++) {
            const rift = ladderRift(18, seed);
            if (rift.roamer) {
                roamers++;
                expect(rift.roamer).not.toBe(rift.zone.boss);
                expect(rift.zone.also?.bosses).toContain(rift.roamer);
            }
        }
        expect(roamers / 400).toBeGreaterThan(ROAMERS.chance - 0.08);
        expect(roamers / 400).toBeLessThan(ROAMERS.chance + 0.08);
        const game = ladderGame(seedFor("impling", true));
        const roamer = game.monsters.find((m) => m.encounter === "roamer")!;
        expect(roamer.rank).toBe("boss");
        expect(roamer.uid).not.toBe(game.bossUid);
        quiet(game, [roamer]);
        game.hero.x = game.hero.prevX = roamer.x - 20;
        game.hero.y = game.hero.prevY = roamer.y;
        steps(game, 20);
        expect(roamer.state).not.toBe("idle");
        expect(game.bossAwake).toBe(false);
    });

    it("gives a ladder guardian a mod (two from depth 30) and a special of the pool's", () => {
        const pool = [...LADDER_MODS, ...GUARDIAN_MODS];
        const shallow = ladderGame(seedFor("hunter"));
        expect(shallow.boss!.mods.length).toBe(1);
        expect(pool).toContain(shallow.boss!.mods[0]);
        expect(shallow.boss!.extraSpecial).toBeDefined();
        const deep = ladderGame(31, 30);
        expect(deep.boss!.mods.length).toBe(2);
    });

    it("lets a Warded guardian take far less while its guards stand", () => {
        const game = ladderGame(seedFor("hunter"));
        const boss = game.boss!;
        boss.mods = ["warded"];
        boss.armour = 0;
        const life = boss.life;
        game["hitMonster"](boss, { amount: 1000, crit: false });
        const warded = life - boss.life;
        for (const m of game.monsters) {
            if (m.pack === boss.pack && m !== boss) {
                m.state = "dead";
            }
        }
        const after = boss.life;
        game["hitMonster"](boss, { amount: 1000, crit: false });
        expect(warded).toBeLessThan((after - boss.life) * (1 - MOD.warded.less) + 2);
    });

    it("runs a guardian's charge down the line it marked, hitting the hero once", () => {
        const game = ladderGame(seedFor("hunter"));
        const boss = game.boss!;
        quiet(game, [boss]);
        boss.extraSpecial = { kind: "charge", length: 10, width: 1.7, damage: 2, windup: 1, visual: { impactSpot: 2184 } };
        boss.specials = 1;
        game.hero.x = game.hero.prevX = boss.x - 6;
        game.hero.y = game.hero.prevY = boss.y;
        boss.state = "chase";
        boss.nextSpecial = 0;
        // Its own special, then the charge
        const specials = 1 + (boss.boss!.more?.length ?? 0);
        boss.specials = specials;
        const from = { x: boss.x, y: boss.y };
        game.step(noInput());
        expect(boss.state).toBe("special");
        expect(boss.specialNow?.kind).toBe("charge");
        const marked = game.strikes.filter((s) => s.group !== undefined);
        expect(marked.length).toBeGreaterThan(2);
        let hits = 0;
        const life = game.hero.life;
        for (let i = 0; i < 2 * TICKS_PER_SECOND; i++) {
            game.step(noInput());
            if (game.hero.life < life) {
                hits = 1;
            }
        }
        expect(hits).toBe(1);
        expect(Math.hypot(boss.x - from.x, boss.y - from.y)).toBeGreaterThan(3);
    });
});
