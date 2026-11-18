// A rift on a made-up stretch of land, with no cache: the hero fights their way along it by
// themselves, and the same seed plays out the same; the ways home; and the city on the same land,
// with its people, its shops and no fighting.
import { Rng } from "../../../engine/core/Rng";
import { isCircleFree } from "../../../engine/world/Collision";
import { makeGrid } from "../../../engine/world/testGrid";
import { CLASSES, CLASS_IDS } from "../content/classes";
import { ClassId } from "../content/items";
import { HERO, seconds } from "../content/rules";
import { BUY_MARKUP, SHOPS, SHOP_IDS } from "../content/town";
import { Game, GameEvent, GameInput, noInput } from "./Game";
import { gemPrice, makeGem } from "./gems";
import { gainXp, heroStats, newHero } from "./hero";
import { itemInfo, rollItem, sellValue } from "./loot";
import { spreadOf } from "./skills";
import { TownPlan, rollStock } from "./town";

const SIZE = 72;
const BASE_X = 100;
const BASE_Y = 200;

// Open ground with a ring of rock round it and a few walls to get round
function land() {
    const rows: string[] = [];
    for (let row = 0; row < SIZE; row++) {
        let line = "";
        for (let x = 0; x < SIZE; x++) {
            const y = SIZE - 1 - row;
            const edge = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
            const wall = (x === 24 && y > 10 && y < 60) || (x === 48 && y > 14 && y < 70);
            line += edge || wall ? "#" : ".";
        }
        rows.push(line);
    }
    return makeGrid(rows, BASE_X, BASE_Y);
}

// The hero's orders: go for the nearest living monster, holding the button down; Q and E and
// the right button whenever they're ready
function autopilot(game: Game): GameInput {
    const input = noInput();
    const h = game.hero;
    let best = -1;
    let bestD = Infinity;
    for (const m of game.monsters) {
        if (m.state === "dead") {
            continue;
        }
        const d = Math.hypot(m.x - h.x, m.y - h.y);
        if (d < bestD) {
            bestD = d;
            best = m.uid;
        }
    }
    const target = game.monsterByUid(best);
    if (target) {
        input.targetUid = best;
        input.skills[0] = true;
        input.hasAim = true;
        input.aimX = target.x;
        input.aimY = target.y;
        if (bestD < 6) {
            input.skills[1] = game.tick % 3 === 0;
            input.skills[2] = true;
            input.skills[3] = game.tick % 5 === 0;
        }
    }
    if (h.life < game.stats.maxLife * 0.4) {
        input.potion = 0;
    }
    return input;
}

function play(cls: ClassId, seed: number, ticks: number): Game {
    const hero = newHero(cls, seed);
    // Strong enough to clear the first rift on its own
    gainXp(hero, 4000);
    const game = new Game(land(), hero, { depth: 1, seed, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
    for (let i = 0; i < ticks; i++) {
        if (game.hero.dead) {
            game.arrive();
        }
        game.step(autopilot(game));
        game.takeEvents();
    }
    return game;
}

function fingerprint(game: Game): string {
    const h = game.hero;
    const monsters = game.monsters.map((m) => `${m.uid}:${m.state}:${m.x.toFixed(3)},${m.y.toFixed(3)}:${m.life}`).join(";");
    return `${game.tick}|${h.x.toFixed(4)},${h.y.toFixed(4)}|${h.life.toFixed(2)}|${game.killed}|${game.drops.length}|${game.heroData.xp}|${monsters}`;
}

describe("a rift", () => {
    it("lays out packs, a boss and the way on, all on reachable ground", () => {
        const game = new Game(land(), newHero("warrior", 3), { depth: 1, seed: 3, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        expect(game.monsters.length).toBeGreaterThan(10);
        expect(game.boss).toBeDefined();
        const { exit, spawn } = game.layout;
        expect(Math.hypot(exit.x - spawn.x, exit.y - spawn.y)).toBeGreaterThan(30);
        const { distance } = game.layout;
        for (const m of game.monsters) {
            const i = Math.floor(m.x) - BASE_X + (Math.floor(m.y) - BASE_Y) * SIZE;
            expect(distance[i]).toBeGreaterThanOrEqual(0);
        }
        expect(game.portalOpen).toBe(false);
    });

    it.each(CLASS_IDS)("lets a %s fight, level and pick up gold", (cls) => {
        const game = play(cls, 11, 50 * 60);
        expect(game.killed).toBeGreaterThan(3);
        expect(game.heroData.kills).toBe(game.killed);
    }, 30_000);

    it("plays out the same from the same seed", () => {
        const a = play("ranger", 7, 50 * 20);
        const b = play("ranger", 7, 50 * 20);
        expect(fingerprint(a)).toBe(fingerprint(b));
        const c = play("ranger", 8, 50 * 20);
        expect(fingerprint(c)).not.toBe(fingerprint(a));
    }, 30_000);

    it("opens the portal when its guardian dies, and only then", () => {
        const game = new Game(land(), newHero("mage", 5), { depth: 1, seed: 5, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const boss = game.boss!;
        game.hurtHero(0, undefined);
        expect(game.portalOpen).toBe(false);
        // Struck down where it stands
        boss.life = 1;
        const h = game.hero;
        h.x = boss.x - 1.2;
        h.y = boss.y;
        h.prevX = h.x;
        h.prevY = h.y;
        let input: GameInput = noInput();
        for (let i = 0; i < 200 && !game.portalOpen; i++) {
            input = noInput();
            input.targetUid = boss.uid;
            input.skills[0] = true;
            input.hasAim = true;
            input.aimX = boss.x;
            input.aimY = boss.y;
            game.step(input);
        }
        expect(game.portalOpen).toBe(true);
        expect(game.drops.length).toBeGreaterThan(0);
        const events = game.takeEvents().map((e) => e.kind);
        expect(events).toContain("bossDied");
    });

    it("dies, losing some experience", () => {
        const hero = newHero("warrior", 9);
        gainXp(hero, 200);
        const xp = hero.xp;
        const game = new Game(land(), hero, { depth: 1, seed: 9, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        game.hurtHero(100_000, undefined);
        expect(game.hero.dead).toBe(true);
        expect(hero.xp).toBeLessThan(xp);
        expect(game.takeEvents().map((e) => e.kind)).toContain("heroDied");
    });

    it("comes back into a rift left open at its camp, whole", () => {
        const game = new Game(land(), newHero("warrior", 9), { depth: 1, seed: 9, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        game.hurtHero(20, undefined);
        game.hero.x += 10;
        game.arrive();
        expect(game.hero.life).toBe(game.stats.maxLife);
        expect(game.hero.x).toBeCloseTo(game.layout.spawn.x);
    });

    it("takes the hero home by the waystone at the camp", () => {
        const game = new Game(land(), newHero("ranger", 4), { depth: 1, seed: 4, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const w = game.layout.waystone;
        expect(Math.hypot(w.x - game.layout.spawn.x, w.y - game.layout.spawn.y)).toBeLessThan(4);
        expect(isCircleFree(game.grid, w.x, w.y, 0.5)).toBe(true);
        const input = noInput();
        input.command = { kind: "waystone" };
        const events: GameEvent[] = [];
        for (let i = 0; i < 200 && !events.some((e) => e.kind === "home"); i++) {
            game.step(input);
            input.command = undefined;
            events.push(...game.takeEvents());
        }
        expect(events).toContainEqual({ kind: "home", how: "waystone" });
    });

    it("teleports home after standing still, and a hit or a step breaks it", () => {
        const game = new Game(land(), newHero("mage", 6), { depth: 1, seed: 6, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const press = noInput();
        press.teleport = true;
        const run = (ticks: number, each: (i: number) => GameInput) => {
            const events: GameEvent[] = [];
            for (let i = 0; i < ticks; i++) {
                game.step(each(i));
                events.push(...game.takeEvents());
            }
            return events.map((e) => (e.kind === "channelBroken" ? `broken:${e.why}` : e.kind === "home" ? `home:${e.how}` : e.kind));
        };
        // Broken by a hit
        let events = run(10, (i) => (i === 0 ? press : noInput()));
        expect(events).toContain("channel");
        game.hurtHero(1, undefined);
        expect(game.hero.channel).toBeUndefined();
        expect(run(1, () => noInput())).not.toContain("home:teleport");
        // Broken by walking
        const walk = noInput();
        walk.moveX = 1;
        events = run(20, (i) => (i === 0 ? press : i === 10 ? walk : noInput()));
        expect(events).toContain("broken:moved");
        // Stood still the whole time: home
        events = run(seconds(HERO.teleportSeconds) + 2, (i) => (i === 0 ? press : noInput()));
        expect(events).toContain("home:teleport");
        expect(events).not.toContain("broken:moved");
    });
});

describe("the hero's controls", () => {
    // The hero alone with one monster, this far east of them, that stays where it's put and
    // doesn't die
    function duel(cls: ClassId, distance: number) {
        const hero = newHero(cls, 21);
        gainXp(hero, 4000);
        const game = new Game(land(), hero, { depth: 1, seed: 21, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
        const m = game.monsters[0];
        for (const other of game.monsters) {
            if (other !== m) {
                other.state = "dead";
            }
        }
        const h = game.hero;
        m.x = m.prevX = h.x + distance;
        m.y = m.prevY = h.y;
        m.frozenUntil = 1e9;
        m.life = m.maxLife = 1e9;
        return { game, m };
    }

    // The mouse on a monster, this skill's button down
    function at(m: { uid: number; x: number; y: number }, skill: number): GameInput {
        const input = noInput();
        input.hasAim = true;
        input.aimX = m.x;
        input.aimY = m.y;
        input.aimUid = m.uid;
        input.skills[skill] = true;
        return input;
    }

    function casts(game: Game, ticks: number, each: (i: number) => GameInput): string[] {
        const cast: string[] = [];
        for (let i = 0; i < ticks; i++) {
            game.step(each(i));
            for (const e of game.takeEvents()) {
                if (e.kind === "cast") {
                    cast.push(e.skill.id);
                }
            }
        }
        return cast;
    }

    it("uses a skill pressed in the middle of a swing as soon as the swing's done", () => {
        const { game, m } = duel("warrior", 1.2);
        const swing = at(m, 0);
        swing.targetUid = m.uid;
        game.step(swing);
        expect(game.hero.action?.skill).toBe(0);
        // Q for a single tick, long before the swing's over
        const cast = casts(game, 120, (i) => (i === 0 ? at(m, 2) : noInput()));
        expect(cast).toEqual(["slash", "slam"]);
    });

    it("uses a skill once for one press, however long the press lasts while it's cast", () => {
        const { game, m } = duel("warrior", 1.2);
        // A click or a key is down for a tenth of a second or two: several ticks
        const press = at(m, 1);
        expect(casts(game, 200, (i) => (i < 8 ? press : noInput()))).toEqual(["cleave"]);
        // And a key held down and let go again in the middle of it is a second press, used after
        const twice = casts(game, 200, (i) => (i < 8 || (i >= 20 && i < 28) ? press : noInput()));
        expect(twice).toEqual(["cleave", "cleave"]);
        // Held down the whole time, it's used again and again (as long as there's the mana: a
        // full pool, the three uses before already spent)
        game.hero.mana = game.stats.maxMana;
        expect(casts(game, 200, () => press).length).toBeGreaterThan(1);
    });

    it("strikes once for a click on a monster in reach, and keeps at it while the button's held", () => {
        const { game, m } = duel("warrior", 1.2);
        const hold = at(m, 0);
        hold.targetUid = m.uid;
        expect(casts(game, 150, (i) => (i === 0 ? hold : noInput()))).toEqual(["slash"]);
        expect(casts(game, 150, () => hold).length).toBeGreaterThan(2);
    });

    it("walks up to a monster to use a blow on it that can't reach from where the hero stands", () => {
        const { game, m } = duel("warrior", 7);
        let distance = Infinity;
        for (let i = 0; i < 200 && distance === Infinity; i++) {
            game.step(i === 0 ? at(m, 1) : noInput());
            if (game.takeEvents().some((e) => e.kind === "cast" && e.skill.id === "cleave")) {
                distance = Math.hypot(m.x - game.hero.x, m.y - game.hero.y);
            }
        }
        expect(distance).toBeLessThan(2.4 + m.radius);
        expect(m.life).toBeLessThan(m.maxLife);
        // One press, one blow
        expect(casts(game, 100, () => noInput())).toEqual([]);
    });

    it("swings where it stands with Shift, whatever's out of reach", () => {
        const { game, m } = duel("warrior", 7);
        const input = at(m, 1);
        input.standing = true;
        game.step(input);
        expect(game.hero.action?.skill).toBe(1);
        expect(game.hero.goal).toBeUndefined();
    });

    it("aims a skill at the monster under the mouse, not the ground behind it", () => {
        const { game, m } = duel("ranger", 5);
        const input = at(m, 1);
        input.aimY = m.y + 1.5;
        game.step(input);
        const action = game.hero.action!;
        expect(action.aimX).toBeCloseTo(m.x);
        expect(action.aimY).toBeCloseTo(m.y);
        expect(action.targetUid).toBe(m.uid);
    });

    it("walks up to a wall clicked on, rather than into it for good", () => {
        const game = city(4);
        const input = noInput();
        input.walkTo = true;
        input.hasAim = true;
        input.aimX = BASE_X + 24.5;
        input.aimY = BASE_Y + 30.5;
        game.step(input);
        for (let i = 0; i < 50 * 30 && game.hero.goal; i++) {
            game.step(noInput());
        }
        const h = game.hero;
        expect(h.goal).toBeUndefined();
        expect(Math.hypot(h.x - input.aimX, h.y - input.aimY)).toBeLessThan(1.6);
    });

    // A step east: what WASD gives
    function step(): GameInput {
        const input = noInput();
        input.moveX = 1;
        return input;
    }

    it("goes on with a swing while the hero walks, slower, and lands its blow", () => {
        const { game, m } = duel("warrior", 1.2);
        const h = game.hero;
        const mana = h.mana;
        game.step(at(m, 1));
        const action = h.action!;
        expect(action).toBeDefined();
        expect(h.mana).toBeLessThan(mana);
        const x = h.x;
        game.step(step());
        expect(h.action).toBe(action);
        expect(h.moving).toBe(true);
        // At the share of the pace a use keeps
        expect(h.x - x).toBeCloseTo((game.stats.moveSpeed / 50) * HERO.castMoveShare, 3);
        expect(h.mana).toBeLessThan(mana);
        while (!action.fired) {
            game.step(step());
        }
        expect(m.life).toBeLessThan(m.maxLife);
        expect(h.recoverUntil).toBe(0);
    });

    it("gives a weapon class mana back for each enemy its attacks hit, three a tick at most, and a caster none", () => {
        const { game } = duel("warrior", 1.2);
        const h = game.hero;
        const slash = game.skills[0]!;
        expect(slash.tags.has("attack")).toBe(true);
        expect(game.stats.manaOnHit).toBeCloseTo(CLASSES.warrior.manaOnHit * game.stats.maxMana, 1);
        const five = game.monsters.slice(0, 5);
        for (const m of five) {
            m.state = "idle";
            m.life = m.maxLife = 1e9;
        }
        h.mana = 0;
        for (const m of five) {
            game["hitMonster"](m, { amount: 1, crit: false }, slash);
        }
        expect(h.mana).toBeCloseTo(game.stats.manaOnHit * HERO.manaOnHitPerTick, 5);
        // The next tick, as many again
        game.tick++;
        game["hitMonster"](five[0], { amount: 1, crit: false }, slash);
        expect(h.mana).toBeCloseTo(game.stats.manaOnHit * (HERO.manaOnHitPerTick + 1), 5);
        // A caster's spells give nothing back
        const mage = duel("mage", 1.2);
        expect(mage.game.stats.manaOnHit).toBe(0);
        mage.game.hero.mana = 0;
        mage.game["hitMonster"](mage.m, { amount: 1, crit: false }, mage.game.skills[0]!);
        expect(mage.game.hero.mana).toBe(0);
    });

    it("keeps using a skill that's held down, walking keys or not: the button held wins", () => {
        for (const [skill, standing] of [
            [0, true],
            [1, false],
        ] as const) {
            const { game, m } = duel("warrior", 1.2);
            m.life = m.maxLife = 1e9;
            const cast = casts(game, 150, () => {
                const input = at(m, skill);
                input.standing = standing;
                input.moveX = 1;
                return input;
            });
            expect(cast.length).toBeGreaterThan(1);
            expect(m.life).toBeLessThan(m.maxLife);
        }
    });

    it("uses the left button's skill while the keys walk the hero, at the monster under the mouse", () => {
        for (const cls of ["ranger", "warrior"] as const) {
            const { game, m } = duel(cls, cls === "ranger" ? 5 : 1.2);
            m.life = m.maxLife = 1e9;
            const h = game.hero;
            const x = h.x;
            const y = h.y;
            const cast = casts(game, 60, () => {
                const input = at(m, 0);
                input.targetUid = m.uid;
                input.moveY = 1;
                return input;
            });
            expect(cast.length).toBeGreaterThan(0);
            expect(m.life).toBeLessThan(m.maxLife);
            // and walked on all the while
            expect(Math.hypot(h.x - x, h.y - y)).toBeGreaterThan(1);
        }
    });

    it("keeps Barrage tight with Volley: all six arrows on one enemy eight tiles off, as its four are", () => {
        const fire = (support: boolean) => {
            const hero = newHero("ranger", 21);
            gainXp(hero, 1e6);
            const barrage = makeGem(hero.nextUid++, "barrage", 10);
            const sockets = [{ color: "green" as const, linked: true, gem: barrage }];
            if (support) {
                sockets.push({ color: "green", linked: true, gem: makeGem(hero.nextUid++, "volley", 10) });
            }
            hero.equipment.weapon!.sockets = sockets;
            hero.skillBar[0] = barrage.uid;
            const game = new Game(land(), hero, { depth: 1, seed: 21, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
            const m = game.monsters[0];
            for (const other of game.monsters) {
                if (other !== m) {
                    other.state = "dead";
                }
            }
            const h = game.hero;
            m.x = m.prevX = h.x + 8;
            m.y = m.prevY = h.y;
            m.radius = 0.45;
            m.frozenUntil = 1e9;
            m.life = m.maxLife = 1e9;
            const skill = game.skills[0]!;
            expect(skill.def.id).toBe("barrage");
            expect(skill.why).toBeUndefined();
            let hits = 0;
            for (let i = 0; i < 100; i++) {
                const input = at(m, 0);
                input.standing = true;
                input.skills[0] = i === 0;
                game.step(input);
                hits += game.takeEvents().filter((e) => e.kind === "monsterHit" && e.uid === m.uid).length;
            }
            return { skill, hits };
        };
        const alone = fire(false);
        expect(alone.skill.count).toBe(4);
        expect(alone.hits).toBe(4);
        const volley = fire(true);
        expect(volley.skill.count).toBe(6);
        expect(spreadOf(volley.skill)).toBe(8);
        expect(volley.hits).toBe(6);
    });

    it("uses what was pressed mid-swing once the swing's done, though the hero walked through it", () => {
        const { game, m } = duel("warrior", 1.2);
        const h = game.hero;
        const swing = at(m, 0);
        swing.targetUid = m.uid;
        game.step(swing);
        const action = h.action!;
        game.takeEvents();
        // Walking while the swing plays out, with the right button pressed on the way
        const cast = casts(game, 100, (i) => {
            const input = i === 2 ? at(m, 1) : step();
            if (i > 2 && i < 10) {
                input.moveX = 0;
            }
            return input;
        });
        expect(cast[0]).toBe("slash");
        expect(cast).toContain("cleave");
        expect(game.tick).toBeGreaterThan(action.end);
    });

    it("walks into range and sight to shoot a monster too far off", () => {
        const { game, m } = duel("ranger", 22);
        // The right button or a key: the left button's walks up already, as its goal
        const index = game.skills.findIndex((s, i) => i > 0 && s && !s.why && ["shoot", "burst", "arc", "rain"].includes(s.def.kind));
        expect(index).toBeGreaterThan(0);
        game.step(at(m, index));
        expect(game.hero.action).toBeUndefined();
        expect(game.hero.goal?.kind).toBe("attack");
        let cast = -1;
        for (let i = 0; i < 400 && cast < 0; i++) {
            game.step(noInput());
            if (game.takeEvents().some((e) => e.kind === "cast")) {
                cast = Math.hypot(m.x - game.hero.x, m.y - game.hero.y);
            }
        }
        expect(cast).toBeGreaterThan(0);
        expect(cast).toBeLessThanOrEqual(game.skills[index]!.range);
    });

    it("shoves what it hits away from the hero, and never a guardian", () => {
        const { game, m } = duel("warrior", 1.2);
        const swing = at(m, 0);
        swing.targetUid = m.uid;
        game.step(swing);
        while (m.life === m.maxLife) {
            game.step(noInput());
        }
        // East of the hero, shoved east
        expect(m.knockX).toBeGreaterThan(0);
        expect(Math.abs(m.knockY)).toBeLessThan(m.knockX);
        const boss = game.boss!;
        boss.state = "chase";
        const h = game.hero;
        h.x = h.prevX = boss.x - 1.5;
        h.y = h.prevY = boss.y;
        boss.frozenUntil = 1e9;
        const blow = at(boss, 0);
        blow.targetUid = boss.uid;
        const life = boss.life;
        for (let i = 0; i < 100 && boss.life === life; i++) {
            game.step(blow);
        }
        expect(boss.life).toBeLessThan(life);
        expect(boss.knockX).toBe(0);
        expect(boss.knockY).toBe(0);
    });

    it("staggers a monster out of its blow with a hit that takes half its life", () => {
        const { game, m } = duel("warrior", 1.2);
        m.frozenUntil = 0;
        m.rank = "normal";
        m.armour = 0;
        m.life = m.maxLife = 1000;
        m.state = "attack";
        m.actionStart = game.tick;
        m.actionEnd = game.tick + m.attackTicks;
        m.actionDone = false;
        (game as unknown as { hitMonster(m: unknown, roll: { amount: number; crit: boolean }): void }).hitMonster(m, { amount: 600, crit: false });
        expect(m.state).toBe("chase");
        expect(m.staggerUntil).toBeGreaterThan(game.tick);
        expect(game.takeEvents().map((e) => e.kind)).toContain("stagger");
        // And not again for a while
        m.state = "attack";
        m.actionDone = false;
        (game as unknown as { hitMonster(m: unknown, roll: { amount: number; crit: boolean }): void }).hitMonster(m, { amount: 300, crit: false });
        expect(m.state).toBe("attack");
    });

    it("has a monster that shoots back off from a hero up close", () => {
        const { game, m } = duel("warrior", 1.5);
        m.frozenUntil = 0;
        m.def = { ...m.def, ranged: { range: 9, keep: 5, visual: {}, speed: 9 } };
        m.state = "chase";
        const h = game.hero;
        for (let i = 0; i < 50; i++) {
            h.x = h.prevX;
            game.step(noInput());
        }
        expect(Math.hypot(m.x - h.x, m.y - h.y)).toBeGreaterThan(3);
    });
});

// The city's plan on the made-up land: a shopkeeper, the Archmage, a wizard who wanders
function town(): TownPlan {
    return {
        portal: { x: BASE_X + 30.5, y: BASE_Y + 40.5 },
        people: [
            { kind: "shop", shop: "smith", npcId: SHOPS.smith.npcId, name: "Horvik", x: BASE_X + 8.5, y: BASE_Y + 8.5, yaw: 0, wander: 0 },
            { kind: "archmage", npcId: 1, name: "Archmage", x: BASE_X + 30.5, y: BASE_Y + 37.5, yaw: 0, wander: 0 },
            { kind: "wizard", npcId: 2, name: "Wizard", x: BASE_X + 12.5, y: BASE_Y + 30.5, yaw: 0, wander: 4 },
        ],
    };
}

function city(seed: number, hero = newHero("warrior", seed)): Game {
    return new Game(land(), hero, { depth: 0, seed, spawn: { x: BASE_X + 6.5, y: BASE_Y + 6.5 }, town: town() });
}

describe("the city", () => {
    it("has its people and no monsters, and the portal's shut until it's opened", () => {
        const game = city(1);
        expect(game.town).toBe(true);
        expect(game.monsters.length).toBe(0);
        expect(game.people.length).toBe(3);
        expect(game.boss).toBeUndefined();
        expect(game.portalOpen).toBe(false);
        // And no clock: the city never collapses
        expect(game.timeLimit).toBe(0);
        expect(game.timeLeft).toBe(Infinity);
        expect(game.layout.exit).toEqual(town().portal);
    });

    it("walks to someone clicked and talks to them", () => {
        const game = city(2);
        const keeper = game.people.find((p) => p.kind === "shop")!;
        const input = noInput();
        input.command = { kind: "talk", uid: keeper.uid };
        let talked: GameEvent | undefined;
        for (let i = 0; i < 300 && !talked; i++) {
            game.step(input);
            input.command = undefined;
            talked = game.takeEvents().find((e) => e.kind === "talk");
        }
        expect(talked).toEqual({ kind: "talk", person: keeper });
        expect(Math.hypot(game.hero.x - keeper.x, game.hero.y - keeper.y)).toBeLessThanOrEqual(HERO.talkReach + 0.01);
    });

    it("takes the hero through the portal once it's open", () => {
        const game = city(3);
        const portal = noInput();
        portal.command = { kind: "portal" };
        const through = (): string[] => {
            const kinds: string[] = [];
            for (let i = 0; i < 600 && !kinds.includes("portal") && !kinds.includes("sealed"); i++) {
                game.step(portal);
                portal.command = undefined;
                kinds.push(...game.takeEvents().map((e) => e.kind));
            }
            return kinds;
        };
        portal.command = { kind: "portal" };
        expect(through()).toContain("sealed");
        game.portalOpen = true;
        portal.command = { kind: "portal" };
        expect(through()).toContain("portal");
    });

    it("lets no skill be used, and no teleport home", () => {
        const game = city(4);
        const input = noInput();
        input.hasAim = true;
        input.aimX = game.hero.x + 3;
        input.aimY = game.hero.y;
        input.skills = [true, true, true, true];
        input.standing = true;
        input.teleport = true;
        for (let i = 0; i < 50; i++) {
            game.step(input);
        }
        expect(game.hero.action).toBeUndefined();
        expect(game.hero.channel).toBeUndefined();
        expect(game.takeEvents().map((e) => e.kind)).not.toContain("cast");
    });

    it("has its wanderers stroll, always on open ground, the same from the same seed", () => {
        const walk = (seed: number) => {
            const game = city(seed);
            const wizard = game.people.find((p) => p.kind === "wizard")!;
            let moved = 0;
            for (let i = 0; i < seconds(40); i++) {
                game.step(noInput());
                expect(isCircleFree(game.grid, wizard.x, wizard.y, 0.35)).toBe(true);
                expect(Math.hypot(wizard.x - wizard.homeX, wizard.y - wizard.homeY)).toBeLessThanOrEqual(wizard.wander + 0.01);
                moved += Math.hypot(wizard.x - wizard.prevX, wizard.y - wizard.prevY);
            }
            return { moved, at: `${wizard.x.toFixed(4)},${wizard.y.toFixed(4)}` };
        };
        const a = walk(5);
        expect(a.moved).toBeGreaterThan(2);
        expect(walk(5).at).toBe(a.at);
        // Those who keep a shop stay put
        const game = city(5);
        const keeper = game.people.find((p) => p.kind === "shop")!;
        for (let i = 0; i < seconds(20); i++) {
            game.step(noInput());
        }
        expect(keeper.x).toBe(keeper.homeX);
    });

    it("sells off its shelves, for gold, into the pack", () => {
        const hero = newHero("warrior", 6);
        gainXp(hero, 3000);
        const stock = rollStock(new Rng(6), hero);
        for (const id of SHOP_IDS) {
            expect(stock[id].length).toBe(SHOPS[id].stock);
            for (const offer of stock[id]) {
                if (SHOPS[id].gems) {
                    expect(offer.item.rarity).toBe("gem");
                    expect(offer.price).toBe(gemPrice(offer.item));
                    continue;
                }
                expect(offer.price).toBe(sellValue(offer.item) * BUY_MARKUP);
                expect(offer.item.rarity).not.toBe("unique");
                const classes = ({ smith: ["warrior", "paladin", "rogue"], archery: ["ranger", "rogue"], staffs: ["mage", "necromancer"] } as Record<string, string[]>)[id];
                if (classes) {
                    expect(itemInfo(offer.item).classes?.some((c) => classes.includes(c))).toBe(true);
                } else if (id === "apothecary") {
                    expect(itemInfo(offer.item).slot).toBe("potion");
                    expect(offer.item.rarity).not.toBe("rare");
                } else if (id === "jeweller") {
                    expect(["amulet", "ring", "cape"]).toContain(itemInfo(offer.item).slot);
                }
            }
        }
        const game = city(6, hero);
        const offer = stock.smith[0];
        hero.gold = offer.price - 1;
        expect(game.buy(offer)).toBe("You can't afford that.");
        hero.gold = offer.price + 10;
        expect(game.buy(offer)).toBe(offer.item);
        expect(hero.gold).toBe(10);
        expect(hero.inventory).toContain(offer.item);
    });
});

describe("loot", () => {
    it("rolls the same items from the same seed", () => {
        const roll = (seed: number) => {
            const rng = new Rng(seed);
            return Array.from({ length: 40 }, (_, i) => rollItem(rng, i, { level: 20, rarity: 1, cls: "warrior" }));
        };
        expect(roll(4)).toEqual(roll(4));
        expect(roll(4)).not.toEqual(roll(5));
    });

    it("gives every item a name, a model and a place to wear it", () => {
        const rng = new Rng(1);
        for (let i = 0; i < 400; i++) {
            const item = rollItem(rng, i, { level: 1 + (i % 45), rarity: 3 });
            const info = itemInfo(item);
            expect(info.name.length).toBeGreaterThan(0);
            expect(info.objId).toBeGreaterThan(0);
            if (item.rarity === "magic") {
                expect(item.mods.length).toBeGreaterThanOrEqual(1);
                expect(item.mods.length).toBeLessThanOrEqual(2);
            }
            if (item.rarity === "rare") {
                expect(item.mods.length).toBeGreaterThanOrEqual(3);
            }
        }
    });

    it("makes a hero stronger as they level", () => {
        const hero = newHero("warrior", 1);
        const before = heroStats(hero).maxLife;
        expect(gainXp(hero, 5000)).toBeGreaterThan(1);
        expect(heroStats(hero).maxLife).toBeGreaterThan(before);
    });
});
