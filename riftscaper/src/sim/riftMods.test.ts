// Rift modifiers: what the Archmage offers, that each modifier changes the rift's monsters as it
// says, that the rewards grow with them (more items, better ones, more runes, more experience), and
// that a modified rift plays out the same from the same seed and modifiers.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { MAX_RIFT_MODS, RIFT_MODS, RIFT_MOD_IDS, RIFT_OFFERS, RiftModId } from "../content/riftMods";
import { RIFT_TIME, TICKS_PER_SECOND, seconds, xpToNext } from "../content/rules";
import { Game, GameInput, Monster, noInput } from "./Game";
import { Hero, gainXp, newHero } from "./hero";
import { itemInfo } from "./loot";
import { riftEffect, riftModsFor, riftReward, rollRiftMods, rollRiftOffers } from "./riftMods";

const SIZE = 72;
const BASE_X = 100;
const BASE_Y = 200;
const SPAWN = { x: BASE_X + 4.5, y: BASE_Y + 4.5 };

// Open ground with a ring of rock round it and a few walls to get round (as Game.test.ts's)
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

function rift(seed: number, mods: RiftModId[], depth = 1, hero = newHero("warrior", seed)): Game {
    return new Game(land(), hero, { depth, seed, spawn: SPAWN, mods });
}

// All the experience a hero's had, across their levels
function totalXp(hero: Hero): number {
    let total = hero.xp;
    for (let level = 1; level < hero.level; level++) {
        total += xpToNext(level);
    }
    return total;
}

// The sim's own kill, as a blow would end in
function kill(game: Game, m: Monster): void {
    game["kill"](m);
}

// The hero going for the nearest monster, with every skill they have, drinking when low
function autopilot(game: Game): GameInput {
    const input = noInput();
    const h = game.hero;
    let best: Monster | undefined;
    let bestD = Infinity;
    for (const m of game.monsters) {
        const d = Math.hypot(m.x - h.x, m.y - h.y);
        if (m.state !== "dead" && d < bestD) {
            bestD = d;
            best = m;
        }
    }
    if (best) {
        input.targetUid = best.uid;
        input.skills[0] = true;
        input.hasAim = true;
        input.aimX = best.x;
        input.aimY = best.y;
        if (bestD < 6) {
            input.skills[1] = game.tick % 3 === 0;
            input.skills[2] = true;
        }
    }
    if (h.life < game.stats.maxLife * 0.4) {
        input.potion = 0;
    }
    return input;
}

function play(seed: number, mods: RiftModId[] | undefined, ticks: number): Game {
    const hero = newHero("ranger", seed);
    gainXp(hero, 4000);
    const game = new Game(land(), hero, { depth: 1, seed, spawn: SPAWN, mods });
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
    const monsters = game.monsters.map((m) => `${m.uid}:${m.state}:${m.x.toFixed(3)},${m.y.toFixed(3)}:${m.life.toFixed(2)}`).join(";");
    const drops = game.drops.map((d) => `${d.uid}:${d.gold ?? ""}${d.rune?.id ?? ""}${d.item?.base ?? ""}`).join(";");
    return `${game.tick}|${h.x.toFixed(4)},${h.y.toFixed(4)}|${h.life.toFixed(2)}|${game.killed}|${game.heroData.xp}|${monsters}|${drops}`;
}

describe("the rift modifiers", () => {
    it("are all well formed: a name, what they do, and something for it", () => {
        for (const id of RIFT_MOD_IDS) {
            const def = RIFT_MODS[id];
            expect(def.id).toBe(id);
            expect(def.name.length).toBeGreaterThan(0);
            expect(def.text.length).toBeGreaterThan(0);
            expect(Object.keys(def.effect).length).toBeGreaterThan(0);
            const r = def.reward;
            expect(Math.min(r.quantity, r.rarity, r.runes, r.xp)).toBeGreaterThan(0);
            expect(def.weight).toBeGreaterThan(0);
            expect(def.depth).toBeGreaterThanOrEqual(1);
        }
        // Every one is woven in somewhere
        expect(riftModsFor(99).sort()).toEqual([...RIFT_MOD_IDS].sort());
    });

    it("add up what they do and what they pay", () => {
        expect(riftReward([])).toEqual({ quantity: 0, rarity: 0, runes: 0, xp: 0 });
        expect(Object.values(riftEffect([])).every((v) => v === 0)).toBe(true);
        const mods: RiftModId[] = ["hasted", "hardy", "enraged"];
        const reward = riftReward(mods);
        const sum = (key: "quantity" | "rarity" | "runes" | "xp") => mods.reduce((t, id) => t + RIFT_MODS[id].reward[key], 0);
        expect(reward.quantity).toBeCloseTo(sum("quantity"));
        expect(reward.rarity).toBeCloseTo(sum("rarity"));
        expect(reward.runes).toBeCloseTo(sum("runes"));
        expect(reward.xp).toBeCloseTo(sum("xp"));
        const effect = riftEffect(mods);
        expect(effect.monsterSpeed).toBeCloseTo(0.25);
        expect(effect.monsterLife).toBeCloseTo(0.4);
        expect(effect.bossLife).toBeCloseTo(0.6);
        expect(effect.packs).toBe(0);
        // More modifiers, more reward
        expect(riftReward(["hasted", "hardy"]).quantity).toBeGreaterThan(riftReward(["hasted"]).quantity);
    });

    it("give the rift its time: less for Fleeting, more for the hardier ones, never under the least", () => {
        // The rift's own time, from its monsters, before its modifiers' share
        const own = (game: Game) => seconds(RIFT_TIME.base + RIFT_TIME.perMonster * game.monsters.length);
        const plain = rift(7, []);
        expect(plain.timeLimit).toBe(own(plain));
        expect(plain.timeLeft).toBeCloseTo(plain.timeLimit / TICKS_PER_SECOND);
        const fleeting = rift(7, ["fleeting"]);
        expect(fleeting.timeLimit).toBe(seconds((own(fleeting) / TICKS_PER_SECOND) * (1 - 0.35)));
        const hardy = rift(7, ["hardy", "armoured"]);
        expect(hardy.timeLimit / own(hardy)).toBeCloseTo(1.25, 2);
        // Fleeting and a hardier one meet in the middle
        const both = rift(7, ["fleeting", "hardy"]);
        expect(both.timeLimit / own(both)).toBeCloseTo(0.8, 2);
        expect(riftEffect(["fleeting", "hardy"]).time).toBeCloseTo(-0.2);
    });

    it("collapse the rift when its time runs out, with warnings first, and never once it's cleared", () => {
        const game = rift(3, ["fleeting"]);
        // Short of time, the guardian alive: the warnings, then the collapse
        game.tick = game.timeLimit - seconds(61);
        const kinds: string[] = [];
        for (let i = 0; i < seconds(62); i++) {
            game.step(noInput());
            for (const e of game.takeEvents()) {
                if (e.kind === "riftTime") {
                    kinds.push(`time ${e.seconds}`);
                } else if (e.kind === "riftCollapsed") {
                    kinds.push("collapsed");
                }
            }
            game.hero.life = game.stats.maxLife;
        }
        expect(kinds).toEqual(["time 60", "time 15", "collapsed"]);
        expect(game.collapsed).toBe(true);
        expect(game.timeLeft).toBe(0);
        // A guardian slain stops the clock
        const cleared = rift(3, []);
        kill(cleared, cleared.monsters.find((m) => m.uid === cleared.bossUid)!);
        cleared.takeEvents();
        cleared.tick = cleared.timeLimit + 10;
        cleared.step(noInput());
        expect(cleared.takeEvents().some((e) => e.kind === "riftCollapsed")).toBe(false);
        expect(cleared.collapsed).toBe(false);
        expect(cleared.timeLeft).toBe(Infinity);
    });

    it("are offered in three versions of a rift, from mild to rich, none twice and none too deep", () => {
        for (let seed = 1; seed <= 300; seed++) {
            const depth = 1 + (seed % 12);
            const offers = rollRiftOffers(new Rng(seed), depth);
            expect(offers.length).toBe(RIFT_OFFERS);
            offers.forEach((mods, i) => {
                expect(mods.length).toBeGreaterThanOrEqual(i);
                expect(mods.length).toBeLessThanOrEqual(Math.min(MAX_RIFT_MODS, i + 1));
                expect(new Set(mods).size).toBe(mods.length);
                for (const id of mods) {
                    expect(RIFT_MODS[id].depth).toBeLessThanOrEqual(depth);
                }
            });
            const keys = offers.map((mods) => [...mods].sort().join(","));
            expect(new Set(keys).size).toBe(keys.length);
        }
        // The same seed offers the same
        expect(rollRiftOffers(new Rng(42), 9)).toEqual(rollRiftOffers(new Rng(42), 9));
        // The first rift has none of the deeper ones
        const shallow = new Set<RiftModId>();
        for (let seed = 1; seed <= 200; seed++) {
            rollRiftMods(new Rng(seed), 1, 3).forEach((id) => shallow.add(id));
        }
        expect([...shallow].every((id) => RIFT_MODS[id].depth === 1)).toBe(true);
        expect(shallow.has("hasted")).toBe(true);
    });

    it("leave a rift with none of them as it was", () => {
        expect(fingerprint(play(7, [], 50 * 8))).toBe(fingerprint(play(7, undefined, 50 * 8)));
        const game = rift(3, []);
        expect(game.riftMods).toEqual([]);
        expect(game.reward).toEqual({ quantity: 0, rarity: 0, runes: 0, xp: 0 });
    });

    it("make monsters hardier, faster, harder-hitting and better armoured, and the guardian more so", () => {
        const plain = rift(5, []);
        const hardy = rift(5, ["hardy"]);
        const hasted = rift(5, ["hasted"]);
        const brutal = rift(5, ["brutal"]);
        const armoured = rift(5, ["armoured"]);
        const enraged = rift(5, ["enraged"]);
        // These don't change what's where: the same monsters, only stronger
        for (const g of [hardy, hasted, brutal, armoured, enraged]) {
            expect(g.monsters.map((m) => `${m.uid}:${m.def.id}:${m.rank}`)).toEqual(plain.monsters.map((m) => `${m.uid}:${m.def.id}:${m.rank}`));
        }
        plain.monsters.forEach((m, i) => {
            const boss = m.rank === "boss";
            // Life's rounded to a whole, before and after
            expect(Math.abs(hardy.monsters[i].maxLife - m.maxLife * 1.4)).toBeLessThanOrEqual(1.5);
            expect(hasted.monsters[i].speed).toBeCloseTo(m.speed * 1.25);
            expect(hasted.monsters[i].attackTicks).toBeLessThanOrEqual(m.attackTicks);
            expect(brutal.monsters[i].damage[1]).toBeCloseTo(m.damage[1] * 1.25);
            // (an armoured pack's own doubling comes on top)
            if (!m.mods.includes("armoured")) {
                expect(armoured.monsters[i].armour).toBeCloseTo(m.armour * 2 + 12);
            }
            expect(armoured.monsters[i].armour).toBeGreaterThan(m.armour);
            // The enraged guardian, and only the guardian
            expect(Math.abs(enraged.monsters[i].maxLife - m.maxLife * (boss ? 1.6 : 1))).toBeLessThanOrEqual(1.5);
            expect(enraged.monsters[i].damage[0]).toBeCloseTo(m.damage[0] * (boss ? 1.3 : 1));
        });
        expect(hasted.monsters.some((m, i) => m.attackTicks < plain.monsters[i].attackTicks)).toBe(true);
    });

    it("fill the rift with more packs, bigger ones, and more magic and rare ones", () => {
        let plainPacks = 0;
        let teemingPacks = 0;
        let plainCount = 0;
        let swarmingCount = 0;
        let plainStrong = 0;
        let empoweredStrong = 0;
        const strong = (g: Game) => g.monsters.filter((m) => m.rank === "magic" || m.rank === "rare").length;
        for (let seed = 1; seed <= 12; seed++) {
            const plain = rift(seed, [], 3);
            plainPacks += plain.layout.packs.length;
            plainCount += plain.monsters.length;
            plainStrong += strong(plain);
            teemingPacks += rift(seed, ["teeming"], 3).layout.packs.length;
            swarmingCount += rift(seed, ["swarming"], 3).monsters.length;
            empoweredStrong += strong(rift(seed, ["empowered"], 3));
        }
        expect(teemingPacks).toBeGreaterThan(plainPacks * 1.15);
        // Two more in every pack and round the guardian
        expect(swarmingCount).toBeGreaterThan(plainCount + 12 * 10);
        expect(empoweredStrong).toBeGreaterThan(plainStrong * 1.2);
    });

    it("make monsters' hits elemental, past armour, and their blows heal them", () => {
        const hero = () => {
            const h = newHero("warrior", 2);
            gainXp(h, 20000);
            return h;
        };
        const plain = rift(2, [], 1, hero());
        const elemental = rift(2, ["elemental"], 1, hero());
        expect(plain.stats.armour).toBeGreaterThan(0);
        const before = elemental.hero.life;
        elemental.hurtHero(60, undefined);
        const taken = before - elemental.hero.life;
        plain.hurtHero(60, undefined);
        const plainTaken = before - plain.hero.life;
        // Armour takes its share of the hit, but not of the 30% that comes as the elements
        expect(Math.abs(taken - (plainTaken + 60 * plain.stats.damageTaken * 0.3))).toBeLessThanOrEqual(1);

        const vampiric = rift(2, ["vampiric"], 1, hero());
        const m = vampiric.monsters.find((x) => !x.mods.includes("vampiric"))!;
        m.life = Math.round(m.maxLife / 2);
        const life = m.life;
        vampiric.hurtHero(10, m, false);
        expect(m.life).toBeCloseTo(life + m.maxLife * 0.04);
    });

    it("make monsters regenerate", () => {
        const plain = rift(4, []);
        const regen = rift(4, ["regenerating"]);
        // A monster near enough the hero to be looked after, too far to see them, halfway dead
        const h = plain.hero;
        const a = plain.monsters.find((m) => {
            const d = Math.hypot(m.x - h.x, m.y - h.y);
            return !m.mods.includes("regenerating") && m.rank !== "boss" && d > 15 && d < 45;
        })!;
        const b = regen.monsters.find((m) => m.uid === a.uid)!;
        for (const [g, m] of [
            [plain, a],
            [regen, b],
        ] as [Game, Monster][]) {
            m.life = Math.round(m.maxLife / 2);
            for (let i = 0; i < 50; i++) {
                g.step(noInput());
            }
            expect(m.state).toBe("idle");
        }
        expect(b.life - a.life).toBeCloseTo(b.maxLife * 0.02, 0);
    });

    it("pay in more items, better ones, more runes and more experience", () => {
        // Modifiers that change nothing about what's where, so the same monsters die in each
        const mods: RiftModId[] = ["hasted", "hardy", "brutal"];
        const reward = riftReward(mods);
        const tally = (g: Game) => {
            for (const m of g.monsters) {
                kill(g, m);
            }
            // Gear: talismans fall on their own, as runes do
            const items = g.drops.filter((d) => d.item && d.item.rarity !== "gem" && itemInfo(d.item).slot !== "talisman");
            return {
                items: items.length,
                // Magic or better: rares alone are too few in a test's worth of rifts to tell apart
                good: items.filter((d) => d.item!.rarity !== "normal").length,
                runes: g.drops.filter((d) => d.rune).length,
            };
        };
        const plain = { items: 0, good: 0, runes: 0 };
        const rich = { items: 0, good: 0, runes: 0 };
        for (let seed = 1; seed <= 30; seed++) {
            const a = tally(rift(seed, [], 5));
            const b = tally(rift(seed, mods, 5));
            plain.items += a.items;
            plain.good += a.good;
            plain.runes += a.runes;
            rich.items += b.items;
            rich.good += b.good;
            rich.runes += b.runes;
        }
        const ratio = rich.items / plain.items;
        expect(ratio).toBeGreaterThan(1 + reward.quantity * 0.5);
        expect(ratio).toBeLessThan(1 + reward.quantity * 1.6);
        // Rarity: a bigger share of what falls is magic or better
        expect(rich.good / rich.items).toBeGreaterThan(plain.good / plain.items);
        expect(rich.runes).toBeGreaterThan(plain.runes * 1.1);

        // Experience: the same kill, the guardian's, teaches more
        const xpPlain = rift(8, [], 5);
        const xpRich = rift(8, mods, 5);
        kill(xpPlain, xpPlain.boss!);
        kill(xpRich, xpRich.boss!);
        expect(totalXp(xpRich.heroData) / totalXp(xpPlain.heroData)).toBeCloseTo(1 + reward.xp, 2);
    });

    it("play out the same from the same seed and modifiers, and differently with others", () => {
        const mods: RiftModId[] = ["hasted", "elemental", "teeming"];
        const a = play(9, mods, 50 * 15);
        const b = play(9, mods, 50 * 15);
        expect(fingerprint(a)).toBe(fingerprint(b));
        expect(a.killed).toBeGreaterThan(0);
        expect(fingerprint(play(9, ["brutal"], 50 * 15))).not.toBe(fingerprint(a));
        expect(fingerprint(play(9, [], 50 * 15))).not.toBe(fingerprint(a));
    }, 30_000);

    it("aren't in the city", () => {
        const city = new Game(land(), newHero("mage", 1), {
            depth: 0,
            seed: 1,
            spawn: SPAWN,
            town: { people: [], portal: { x: BASE_X + 30.5, y: BASE_Y + 30.5 } },
            mods: ["hasted"],
        });
        expect(city.riftMods).toEqual([]);
        expect(city.monsters.length).toBe(0);
    });
});
