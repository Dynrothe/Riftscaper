// The folk's tasks: offers rolled from a seed, three of the folk at a time and none still owed one;
// tasks that read well and can be done at every depth, with the particular folk's own prey; taking
// up to three, one for each of the folk; counting them in a rift as monsters, guardians, chests,
// shrines and hoards fall to the hero, only as deep as they're set; and paying for them.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { BOSSES } from "../content/monsters";
import { RIFTSTONE } from "../content/riftstones";
import { RiftModId } from "../content/riftMods";
import { xpToNext } from "../content/rules";
import { GIVERS, TASKS, TASK_KIND_IDS, TASK_PREY, TaskKind } from "../content/tasks";
import { FOLK, FolkId } from "../content/town";
import { bossOf } from "../content/zones";
import { depthGuardians, depthMonsters } from "./ladder";
import { Feature, Game, Monster, noInput } from "./Game";
import { Hero, freeSlot, gainXp, newHero } from "./hero";
import { Item } from "./loot";
import { isRiftstone } from "./riftstones";
import { Task, claimTask, giveUpTask, rollTask, rollTaskOffers, takeTask, taskDone, taskObjective, taskWhere, whyNotTake } from "./tasks";

const SIZE = 96;
const BASE_X = 100;
const BASE_Y = 200;
const SPAWN = { x: BASE_X + 4.5, y: BASE_Y + 4.5 };
const ALL_FOLK = Object.keys(FOLK) as FolkId[];

// Open ground with a ring of rock round it and two walls to get round
function land() {
    const rows: string[] = [];
    for (let row = 0; row < SIZE; row++) {
        let line = "";
        for (let x = 0; x < SIZE; x++) {
            const y = SIZE - 1 - row;
            const edge = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
            const wall = (x === 30 && y > 10 && y < 80) || (x === 62 && y > 16 && y < 94);
            line += edge || wall ? "#" : ".";
        }
        rows.push(line);
    }
    return makeGrid(rows, BASE_X, BASE_Y);
}

function rift(seed: number, depth: number, hero: Hero, mods?: RiftModId[]): Game {
    return new Game(land(), hero, { depth, seed, spawn: SPAWN, mods });
}

function kill(game: Game, m: Monster): void {
    game["kill"](m);
}

// The hero stood beside a feature, and told to use it
function use(game: Game, f: Feature): void {
    game.hero.x = f.stand.x;
    game.hero.y = f.stand.y;
    game.hero.prevX = game.hero.x;
    game.hero.prevY = game.hero.y;
    const input = noInput();
    input.command = { kind: "feature", uid: f.uid };
    game.step(input);
    for (let i = 0; i < 5; i++) {
        game.step(noInput());
    }
}

let made = 9000;
function task(kind: TaskKind, more: Partial<Task> = {}): Task {
    return { uid: made++, giver: "farmer", kind, count: 1, depth: 1, progress: 0, reward: { gold: 100, xp: 100 }, ...more };
}

function taskEvents(game: Game): { task: Task; done: boolean }[] {
    return game.takeEvents().flatMap((e) => (e.kind === "task" ? [{ task: e.task, done: e.done }] : []));
}

function junk(uid: number, hero: Hero): Item {
    return { uid, base: hero.equipment.body!.base, rarity: "normal", level: 1, mods: [] };
}

describe("the folk's offers", () => {
    it("offers a task from three of the folk, the same from the same seed", () => {
        const a = newHero("warrior", 7);
        const b = newHero("warrior", 7);
        a.maxDepth = b.maxDepth = 6;
        const one = rollTaskOffers(new Rng(5), a, ALL_FOLK);
        const two = rollTaskOffers(new Rng(5), b, ALL_FOLK);
        expect(one.size).toBe(TASKS.offers);
        expect([...one]).toEqual([...two]);
        for (const [giver, t] of one) {
            expect(t.giver).toBe(giver);
            expect(t.progress).toBe(0);
        }
        // Not everyone, every time
        const seen = new Set<FolkId>();
        for (let seed = 1; seed <= 40; seed++) {
            for (const giver of rollTaskOffers(new Rng(seed), a, ALL_FOLK).keys()) {
                seen.add(giver);
            }
        }
        expect(seen.size).toBe(ALL_FOLK.length);
    });

    it("offers nothing from someone whose task the hero's still doing", () => {
        const hero = newHero("ranger", 2);
        hero.maxDepth = 4;
        takeTask(hero, rollTask(new Rng(1), hero, "farmer"));
        takeTask(hero, rollTask(new Rng(2), hero, "priest"));
        for (let seed = 1; seed <= 30; seed++) {
            const offers = rollTaskOffers(new Rng(seed), hero, ALL_FOLK);
            expect(offers.size).toBe(TASKS.offers);
            expect(offers.has("farmer")).toBe(false);
            expect(offers.has("priest")).toBe(false);
        }
        // And only from the folk the city has
        const few = rollTaskOffers(new Rng(3), hero, ["farmer", "carter"]);
        expect([...few.keys()]).toEqual(["carter"]);
    });
});

describe("the tasks they set", () => {
    it("sets tasks of their own kinds that read well and can be done, at every depth reached", () => {
        const kinds = new Set<TaskKind>();
        let stones = 0;
        for (const level of [1, 25]) {
            for (let reached = 1; reached <= 24; reached++) {
                for (const giver of ALL_FOLK) {
                    for (let seed = 1; seed <= 4; seed++) {
                        const hero = newHero("mage", seed);
                        gainXp(hero, level > 1 ? 400000 : 0);
                        hero.maxDepth = reached;
                        const t = rollTask(new Rng(seed * 101 + reached), hero, giver);
                        const what = `${giver} ${t.kind} at ${reached}`;
                        kinds.add(t.kind);
                        expect(GIVERS[giver].kinds[t.kind] ?? 0, what).toBeGreaterThan(0);
                        expect(t.depth, what).toBeGreaterThanOrEqual(1);
                        expect(t.depth, what).toBeLessThanOrEqual(reached);
                        expect(t.count, what).toBeGreaterThanOrEqual(1);
                        for (const text of [taskObjective(t), taskWhere(t)]) {
                            expect(text, what).not.toMatch(/undefined|NaN|^Slay \d+ monsters|a rift's guardian/);
                        }
                        if (t.kind === "slay") {
                            expect(TASK_PREY[t.target as keyof typeof TASK_PREY], what).toBeDefined();
                            expect(depthMonsters(t.depth).map(([id]) => id), what).toContain(t.target);
                            expect(t.count % 5, what).toBe(0);
                            expect(t.count, what).toBeGreaterThanOrEqual(TASKS.slay.least);
                            expect(t.count, what).toBeLessThanOrEqual(TASKS.slay.most);
                        } else if (t.kind === "guardian") {
                            expect(depthGuardians(t.depth), what).toContain(t.target);
                            expect(t.target! in BOSSES, what).toBe(true);
                        } else if (t.kind === "clear") {
                            expect(t.mods, what).toBeGreaterThanOrEqual(0);
                            expect(t.mods, what).toBeLessThanOrEqual(3);
                        }
                        // Gold, experience and one thing more
                        const r = t.reward;
                        expect(r.gold, what).toBeGreaterThan(0);
                        expect(r.xp, what).toBeGreaterThan(0);
                        expect((r.item ? 1 : 0) + (r.runes ? 1 : 0), what).toBe(1);
                        if (r.runes) {
                            expect(r.runes.count, what).toBeGreaterThanOrEqual(1);
                            expect((TASKS.runes.ids as readonly string[]).includes(r.runes.id), what).toBe(true);
                        }
                        if (r.item) {
                            expect(r.item.uid, what).not.toBe(t.uid);
                            expect(r.item.uid, what).toBeLessThan(hero.nextUid);
                            if (isRiftstone(r.item)) {
                                stones++;
                                expect(t.depth, what).toBeGreaterThanOrEqual(RIFTSTONE.from);
                            }
                        }
                    }
                }
            }
        }
        expect([...kinds].sort()).toEqual([...TASK_KIND_IDS].sort());
        expect(stones).toBeGreaterThan(0);
    });

    it("has the priest and the farmer name their own prey, where the rifts have any", () => {
        for (const giver of ["priest", "farmer"] as const) {
            const theirs = GIVERS[giver].prey!;
            let named = 0;
            for (let reached = 1; reached <= 20; reached++) {
                const lowest = Math.max(1, reached - 3);
                const there = new Set<string>();
                for (let d = lowest; d <= reached; d++) {
                    for (const [id] of depthMonsters(d)) {
                        if (TASK_PREY[id] && theirs.includes(id)) {
                            there.add(id);
                        }
                    }
                }
                for (let seed = 1; seed <= 12; seed++) {
                    const hero = newHero("warrior", seed);
                    hero.maxDepth = reached;
                    const t = rollTask(new Rng(seed * 7 + reached), hero, giver);
                    if (t.kind === "slay" && there.size > 0) {
                        expect(there.has(t.target!), `${giver} at ${reached}: ${t.target}`).toBe(true);
                        named++;
                    }
                }
            }
            expect(named, giver).toBeGreaterThan(10);
        }
    });

    it("lets the hero take three at once, one for each of the folk, and give one up", () => {
        const hero = newHero("ranger", 3);
        const rng = new Rng(4);
        const farmer = rollTask(rng, hero, "farmer");
        farmer.progress = 5;
        expect(takeTask(hero, farmer)).toBeUndefined();
        // A copy, begun afresh
        expect(hero.tasks[0]).not.toBe(farmer);
        expect(hero.tasks[0].progress).toBe(0);
        expect(whyNotTake(hero, rollTask(rng, hero, "farmer"))).toContain(FOLK.farmer.name);
        expect(takeTask(hero, rollTask(rng, hero, "priest"))).toBeUndefined();
        expect(takeTask(hero, rollTask(rng, hero, "carter"))).toBeUndefined();
        const crier = rollTask(rng, hero, "crier");
        expect(takeTask(hero, crier)).toContain(`${TASKS.most} tasks`);
        expect(hero.tasks.length).toBe(TASKS.most);
        giveUpTask(hero, hero.tasks[1].uid);
        expect(hero.tasks.map((t) => t.giver)).toEqual(["farmer", "carter"]);
        expect(takeTask(hero, crier)).toBeUndefined();
    });
});

describe("counting them in the rifts", () => {
    it("counts a kill for the tasks it's for, only in rifts as deep as they're set", () => {
        const hero = newHero("warrior", 3);
        const game = rift(3, 2, hero);
        const prey = game.monsters.find((m) => m.rank === "normal")!;
        const same = game.monsters.filter((m) => m !== prey && m.def.id === prey.def.id && m.rank === "normal");
        expect(same.length).toBeGreaterThanOrEqual(2);
        const here = task("slay", { target: prey.def.id, count: 2, depth: 2 });
        const deeper = task("slay", { target: prey.def.id, count: 2, depth: 3 });
        const other = task("slay", { target: prey.def.id === "goblin" ? "giantRat" : "goblin", count: 2 });
        const rares = task("rares", { count: 1 });
        game.heroData.tasks = [here, deeper, other, rares];
        game.takeEvents();
        kill(game, prey);
        expect(taskEvents(game)).toEqual([{ task: here, done: false }]);
        expect([here.progress, deeper.progress, other.progress]).toEqual([1, 0, 0]);
        kill(game, same[0]);
        expect(taskEvents(game)).toEqual([{ task: here, done: true }]);
        // Done is done
        kill(game, same[1]);
        expect(taskEvents(game)).toEqual([]);
        expect(here.progress).toBe(2);
        // A rare one
        const rare = game.monsters.find((m) => m.rank === "rare" && m.state !== "dead")!;
        kill(game, rare);
        expect(rares.progress).toBe(1);
        expect(taskDone(rares)).toBe(true);
    });

    it("counts the guardian's death, and the rift cleared with its modifiers and its time", () => {
        const hero = newHero("warrior", 4);
        const game = rift(4, 3, hero, ["hasted", "teeming"]);
        const guardian = task("guardian", { target: bossOf(3), depth: 3 });
        const wrong = task("guardian", { target: bossOf(5), depth: 1 });
        const clear = task("clear", { mods: 2, count: 2 });
        const harder = task("clear", { mods: 3 });
        const swift = task("swift");
        game.heroData.tasks = [guardian, wrong, clear, harder, swift];
        expect(game.boss!.def.id).toBe(bossOf(3));
        kill(game, game.boss!);
        expect([guardian, wrong, clear, harder, swift].map((t) => t.progress)).toEqual([1, 0, 1, 0, 1]);

        // A rift cleared late isn't swift
        const late = rift(5, 2, hero);
        const slow = task("swift");
        late.heroData.tasks = [slow];
        late.tick = Math.ceil(late.timeLimit * 0.6);
        kill(late, late.boss!);
        expect(slow.progress).toBe(0);
    });

    it("counts chests opened, shrines prayed at and hoards taken", () => {
        let hoards = 0;
        for (let seed = 1; seed <= 20; seed++) {
            const hero = newHero("warrior", seed);
            const game = rift(seed, 1, hero);
            const chests = task("chests", { count: 9 });
            const shrines = task("shrines", { count: 9 });
            const taken = task("hoards", { count: 9 });
            game.heroData.tasks = [chests, shrines, taken];
            for (const f of game.features) {
                if (f.kind === "hoard") {
                    for (const m of game["packs"][f.guards!]) {
                        if (m.state !== "dead") {
                            kill(game, m);
                        }
                    }
                }
                use(game, f);
                // Used once only
                use(game, f);
            }
            const used = (kind: string) => game.features.filter((f) => f.kind === kind && f.used).length;
            expect(chests.progress, `seed ${seed}`).toBe(used("chest"));
            expect(taken.progress, `seed ${seed}`).toBe(used("hoard"));
            expect(shrines.progress, `seed ${seed}`).toBe(used("shrine"));
            hoards += taken.progress;
        }
        expect(hoards).toBeGreaterThan(0);
    });
});

describe("paying for them", () => {
    it("pays a done task's gold, experience and item, and wants room in the pack for it", () => {
        const hero = newHero("mage", 5);
        const item = junk(8000, hero);
        const t = task("chests", { count: 3, reward: { gold: 500, xp: 40, item } });
        hero.tasks = [t];
        expect(claimTask(hero, t.uid)).toBe("It isn't done yet.");
        t.progress = 3;
        const pack = hero.inventory;
        hero.inventory = pack.map((_, i) => junk(100 + i, hero));
        expect(freeSlot(hero)).toBe(-1);
        expect(claimTask(hero, t.uid)).toContain("room");
        hero.inventory = pack;
        const gold = hero.gold;
        const xp = hero.xp;
        const paid = claimTask(hero, t.uid);
        expect(typeof paid).toBe("object");
        expect(hero.gold).toBe(gold + 500);
        expect(hero.xp).toBe(xp + 40);
        expect(hero.inventory.some((it) => it?.uid === 8000)).toBe(true);
        expect(hero.tasks).toEqual([]);
        expect(claimTask(hero, t.uid)).toBe("There's no such task.");

        // Runes go in the pouch, full pack or not
        const runes = task("shrines", { progress: 1, reward: { gold: 1, xp: 1, runes: { id: "chaos", count: 3 } } });
        hero.tasks = [runes];
        hero.inventory = pack.map((_, i) => junk(200 + i, hero));
        const chaos = hero.runes.chaos;
        expect(typeof claimTask(hero, runes.uid)).toBe("object");
        expect(hero.runes.chaos).toBe(chaos + 3);
    });

    it("levels the hero up, as a kill's experience would, when a task's pays enough", () => {
        const hero = newHero("warrior", 6);
        const game = rift(6, 1, hero);
        const t = task("clear", { progress: 1, reward: { gold: 10, xp: xpToNext(1) + 1 } });
        game.heroData.tasks = [t];
        game.hero.life = 1;
        game.takeEvents();
        const paid = game.claimTask(t.uid);
        expect(typeof paid === "object" && paid.levels).toBe(1);
        expect(game.heroData.level).toBe(2);
        expect(game.hero.life).toBe(game.stats.maxLife);
        expect(game.takeEvents().some((e) => e.kind === "levelUp")).toBe(true);
    });
});
