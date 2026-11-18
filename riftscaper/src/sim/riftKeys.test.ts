// Uniques that change how a hero plays (their traits, keystones and powers), the keys to rifts past
// the Archmage's offers (riftstones and the Heartstone's shards), the second guardians of the
// second lap and the Heart of the Rift, and what there is to find in a rift besides its packs:
// chests, a few of them traps, shrines, and a guarded hoard.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { FEATURES, SHRINES, SHRINE_GROUND } from "../content/features";
import { UNIQUES } from "../content/items";
import { BOSSES, bossSpecials } from "../content/monsters";
import { RIFTSTONE } from "../content/riftstones";
import { RUNE_IDS } from "../content/runes";
import { HEART_ZONE, ZONES, bossOf, lapOf, zoneName, zoneOf } from "../content/zones";
import { groundRise } from "./placement";
import { mostDoses } from "./potions";
import { riftBoss, riftName, riftZone } from "./ladder";
import { Feature, Game, Monster, noInput } from "./Game";
import { Hero, gainXp, heroStats, newHero, whyNotEquip } from "./hero";
import { Item, itemInfo, rollItem, rollPinnacleUnique } from "./loot";
import { applyRuneToRiftstone, hasAllShards, isRiftstone, isShard, rollRiftstone, rollShard, shardsHeld, takeShards } from "./riftstones";
import { runeWhyNot } from "./runes";
import { resolveSkills } from "./skills";

const SIZE = 96;
const BASE_X = 100;
const BASE_Y = 200;
const SPAWN = { x: BASE_X + 4.5, y: BASE_Y + 4.5 };

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

function rift(seed: number, depth = 1, hero: Hero = newHero("warrior", seed), heart = false): Game {
    return new Game(land(), hero, { depth, seed, spawn: SPAWN, pinnacle: heart ? "heart" : undefined });
}

function unique(id: string, uid = 900): Item {
    return { uid, base: id, rarity: "unique", level: 1, mods: [] };
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

describe("uniques that change how you play", () => {
    it("gives every unique something past its numbers: its own, or its set's", () => {
        for (const u of UNIQUES) {
            if (u.set && !u.keystone) {
                expect(itemInfo(unique(u.id)).set!.bonuses.length, u.id).toBeGreaterThan(0);
                continue;
            }
            expect(u.traits !== undefined || u.keystone !== undefined || u.power !== undefined || u.talisman !== undefined || u.potion?.rule !== undefined, u.id).toBe(true);
            expect(itemInfo(unique(u.id)).powers!.length, u.id).toBeGreaterThan(0);
        }
    });

    it("puts a worn unique's trait on the skills of the kinds it suits, and its keystone on the hero", () => {
        const hero = newHero("warrior", 3);
        gainXp(hero, 200000);
        const bare = heroStats(hero);
        expect(bare.traits.echo).toBeUndefined();
        hero.equipment.weapon = unique("abyssal_whip");
        hero.equipment.amulet = unique("amulet_of_fury", 901);
        const stats = heroStats(hero);
        expect(stats.traits.echo).toBe(0.4);
        expect(stats.keystones.has("zamoraksFury")).toBe(true);
        const skills = resolveSkills(hero, stats).filter((s) => s !== undefined);
        // On its hitting skills, not on a buff
        expect(skills.find((s) => s.def.kind === "cleave")?.traits?.echo).toBe(0.4);
        expect(skills.find((s) => s.def.kind === "buff")?.traits?.echo).toBeUndefined();
    });

    it("gives a power of its own, which the sim reads", () => {
        const hero = newHero("warrior", 3);
        hero.equipment.offhand = unique("spectral_spirit_shield");
        expect(heroStats(hero).powers.has("spectral")).toBe(true);
    });

    it("keeps the pinnacle uniques out of every drop but the Heart's", () => {
        const rng = new Rng(7);
        for (let i = 0; i < 400; i++) {
            const item = rollItem(rng, i, { level: 60, rarity: 0, atLeast: "unique" });
            expect(UNIQUES.find((u) => u.id === item.base)?.pinnacle).toBeUndefined();
        }
        for (let i = 0; i < 50; i++) {
            const item = rollPinnacleUnique(rng, i, 60, "mage");
            expect(UNIQUES.find((u) => u.id === item.base)?.pinnacle).toBe("heart");
        }
    });
});

describe("the second lap and the Heart", () => {
    it("gives every zone a second guardian, met on its odd laps", () => {
        ZONES.forEach((zone, i) => {
            expect(zone.second, zone.name).toBeDefined();
            expect(BOSSES[zone.second!]).toBeDefined();
            const depth = i + 1;
            expect(bossOf(depth)).toBe(zone.boss);
            expect(bossOf(depth + 8)).toBe(zone.second);
            expect(bossOf(depth + 16)).toBe(zone.boss);
            expect(bossOf(depth + 24)).toBe(zone.second);
        });
        expect(lapOf(9)).toBe(1);
        expect(zoneName(9)).toContain("Torment 1");
    });

    it("has the Heart's own zone and guardian, with every kind of special in turn", () => {
        expect(riftZone(30, 1, "heart")).toBe(HEART_ZONE);
        expect(riftBoss(30, 1, "heart")).toBe("heart");
        expect(riftName(30, 1, "heart")).toBe(HEART_ZONE.name);
        const kinds = bossSpecials(BOSSES.heart).map((s) => s.kind);
        expect(new Set(kinds)).toEqual(new Set(["slam", "nova", "rain"]));
        const game = rift(5, 20, newHero("warrior", 5), true);
        const boss = game.boss!;
        expect(boss.def.id).toBe("heart");
        const used: string[] = [];
        for (let i = 0; i < 3; i++) {
            game["startSpecial"](boss);
            used.push(boss.specialNow!.kind);
        }
        expect(used).toEqual(kinds);
    });

    it("sets a rift on its second lap's guardian, and the Heart with fewer packs than a rift", () => {
        expect(rift(4, 9).boss!.def.id).toBe(ZONES[0].second);
        // Past 16, the ladder's: its guardian rolled with its land and host
        expect(rift(4, 16).boss!.def.id).toBe(ZONES[7].second);
        expect(rift(4, 17).boss!.def.id).toBe(riftBoss(17, 4));
        expect(rift(4, 17, newHero("warrior", 4), true).layout.packs.length).toBeLessThan(rift(4, 17).layout.packs.length);
    });
});

describe("riftstones and the Heartstone's shards", () => {
    it("rolls a riftstone of its depth, its modifiers by its rarity", () => {
        const rng = new Rng(11);
        const seen = new Set<string>();
        for (let i = 0; i < 300; i++) {
            const stone = rollRiftstone(rng, i, 12, 0);
            expect(isRiftstone(stone)).toBe(true);
            expect(stone.level).toBe(12);
            const mods = stone.rift ?? [];
            seen.add(stone.rarity);
            if (stone.rarity === "normal") expect(mods.length).toBe(0);
            if (stone.rarity === "magic") expect(mods.length).toBeGreaterThanOrEqual(1);
            if (stone.rarity === "rare") expect(mods.length).toBeGreaterThanOrEqual(3);
            expect(new Set(mods).size).toBe(mods.length);
            expect(itemInfo(stone).key).toEqual({ kind: "riftstone", depth: 12, mods });
        }
        expect(seen).toEqual(new Set(["normal", "magic", "rare"]));
        // The same seed, the same stones
        const a = rollRiftstone(new Rng(3), 1, 10, 1);
        const b = rollRiftstone(new Rng(3), 1, 10, 1);
        expect(a).toEqual(b);
    });

    it("weaves a riftstone with the runes as gear is crafted", () => {
        const rng = new Rng(5);
        const stone = rollRiftstone(new Rng(1), 1, 10, 0);
        stone.rarity = "normal";
        stone.rift = [];
        expect(runeWhyNot(stone, "mind")).toBeDefined();
        expect(applyRuneToRiftstone(rng, stone, "air")).toBeUndefined();
        expect(stone.rarity).toBe("magic");
        while ((stone.rift ?? []).length < RIFTSTONE.most.magic) {
            expect(applyRuneToRiftstone(rng, stone, "cosmic")).toBeUndefined();
        }
        expect(runeWhyNot(stone, "cosmic")).toBeDefined();
        const before = stone.rift!.length;
        expect(applyRuneToRiftstone(rng, stone, "death")).toBeUndefined();
        expect(stone.rift!.length).toBe(before - 1);
        expect(applyRuneToRiftstone(rng, stone, "nature")).toBeDefined();
        expect(runeWhyNot(stone, "soul")).toBeDefined();
    });

    it("leaves the shards as they are, and never wears a key", () => {
        const hero = newHero("rogue", 2);
        const shard = rollShard(new Rng(1), 1, 30, hero);
        expect(isShard(shard)).toBe(true);
        for (const id of RUNE_IDS) {
            expect(runeWhyNot(shard, id), id).toBeDefined();
        }
        expect(whyNotEquip(hero, shard)).toBeDefined();
        expect(whyNotEquip(hero, rollRiftstone(new Rng(1), 2, 9, 0))).toBeDefined();
    });

    it("sheds the shards a hero lacks the likelier, and takes one of each to open the Heart", () => {
        const hero = newHero("rogue", 2);
        hero.inventory.fill(null);
        const rng = new Rng(9);
        let uid = 100;
        while (!hasAllShards(hero)) {
            const shard = rollShard(rng, uid++, 30, hero);
            hero.inventory[hero.inventory.indexOf(null)] = shard;
            expect(uid).toBeLessThan(140);
        }
        // A spare in the pack stays there
        hero.inventory[hero.inventory.indexOf(null)] = rollShard(rng, uid++, 30, hero);
        expect(takeShards(hero)).toBe(true);
        const left = shardsHeld(hero);
        expect(Object.values(left).reduce((a, b) => a + b, 0)).toBe(1);
        expect(hasAllShards(hero)).toBe(false);
        expect(takeShards(hero)).toBe(false);
    });

    it("drops riftstones from the second lap's guardian, and the pinnacle uniques from the Heart's", () => {
        const shallow = rift(2, 8);
        kill(shallow, shallow.boss!);
        expect(shallow.drops.some((d) => d.item && isRiftstone(d.item))).toBe(false);
        const deep = rift(2, 9);
        kill(deep, deep.boss!);
        const stones = deep.drops.filter((d) => d.item && isRiftstone(d.item)).map((d) => d.item!.level);
        expect(stones).toContain(9);
        expect(stones.every((depth) => depth === 9 || depth === 10)).toBe(true);
        const heart = rift(2, 20, newHero("mage", 2), true);
        kill(heart, heart.boss!);
        expect(heart.drops.some((d) => d.item && UNIQUES.find((u) => u.id === d.item!.base)?.pinnacle)).toBe(true);
    });

    it("sheds a shard now and then from a guardian on the ladder", () => {
        let shards = 0;
        for (let seed = 1; seed <= 12; seed++) {
            const game = rift(seed, 17);
            kill(game, game.boss!);
            shards += game.drops.filter((d) => d.item && isShard(d.item)).length;
        }
        expect(shards).toBeGreaterThan(0);
        expect(shards).toBeLessThan(12);
    });
});

describe("what there is to find in a rift", () => {
    it("lays out chests and shrines, reachable and apart, the same from the same seed", () => {
        const game = rift(21);
        const chests = game.features.filter((f) => f.kind === "chest");
        const shrines = game.features.filter((f) => f.kind === "shrine");
        expect(chests.length).toBeGreaterThanOrEqual(FEATURES.chests[0] - 1);
        expect(shrines.length).toBeGreaterThanOrEqual(1);
        for (const f of game.features) {
            // On tiles that block, with an open one beside it to use it from
            expect(game["reachable"](f.stand.x, f.stand.y)).toBe(true);
            expect(game["grid"].isSolid(Math.floor(f.stand.x), Math.floor(f.stand.y))).toBe(false);
            expect(game["grid"].isSolid(Math.floor(f.x - 0.25), Math.floor(f.y - 0.25))).toBe(true);
            for (const g of game.features) {
                if (g !== f) {
                    expect(Math.hypot(f.x - g.x, f.y - g.y)).toBeGreaterThanOrEqual(13.9);
                }
            }
        }
        expect(rift(21).features).toEqual(game.features);
        // The hero walks up to one and uses it
        const chest = game.features.find((f) => f.kind === "chest")!;
        for (const m of game.monsters) {
            m.state = "dead";
        }
        game.hero.x = chest.stand.x + (chest.stand.x - chest.x) * 4;
        game.hero.y = chest.stand.y + (chest.stand.y - chest.y) * 4;
        const input = noInput();
        input.command = { kind: "feature", uid: chest.uid };
        game.step(input);
        for (let i = 0; i < 400 && !chest.used; i++) {
            game.step(noInput());
        }
        expect(chest.used).toBe(true);
        // The packs are where they'd be without them
        expect(rift(21).layout.packs).toEqual(game.layout.packs);
    });

    it("stands a shrine on flat ground where there is some, and somewhere where there isn't", () => {
        // Bumpy ground, rising and falling over a tile and more, but for two flat patches
        const patches = [
            [36, 36],
            [36, 60],
        ];
        const ground = (flatPatches: boolean) => {
            const grid = land();
            const heights = grid.data.heights;
            for (let y = 0; y <= SIZE; y++) {
                for (let x = 0; x <= SIZE; x++) {
                    const flat = flatPatches && patches.some(([px, py]) => x >= px && x <= px + 18 && y >= py && y <= py + 18);
                    heights[x + y * (SIZE + 1)] = flat ? -64 : -((x * 37 + y * 53) % 160);
                }
            }
            return grid;
        };
        let placed = 0;
        for (let seed = 1; seed <= 6; seed++) {
            const game = new Game(ground(true), newHero("warrior", seed), { depth: 1, seed, spawn: SPAWN });
            for (const f of game.features.filter((f) => f.kind === "shrine")) {
                // The spot it was raised on, a tile in from its south-west corner
                const spot = { x: f.x - f.size / 2 + 1.5, y: f.y - f.size / 2 + 1.5 };
                expect(groundRise(game.grid, spot, 4, SHRINE_GROUND.margin), `seed ${seed}`).toBeLessThanOrEqual(SHRINE_GROUND.flat);
                placed++;
            }
            // With nowhere flat, they're still raised
            const rough = new Game(ground(false), newHero("warrior", seed), { depth: 1, seed, spawn: SPAWN });
            expect(rough.features.filter((f) => f.kind === "shrine").length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
        }
        expect(placed).toBeGreaterThanOrEqual(6);
    });

    it("opens a chest for loot, or springs it, and raises an ambush that stands a moment", () => {
        let opened = 0;
        let sprung = 0;
        for (let seed = 1; seed <= 16 && (opened === 0 || sprung === 0); seed++) {
            const game = rift(seed);
            for (const f of game.features.filter((f) => f.kind === "chest")) {
                const monsters = game.monsters.length;
                const drops = game.drops.length;
                use(game, f);
                expect(f.used).toBe(true);
                expect(game.drops.length).toBeGreaterThan(drops);
                if (f.trapped) {
                    sprung++;
                    const risen = game.monsters.slice(monsters);
                    expect(risen.length).toBeGreaterThanOrEqual(FEATURES.ambush - 1);
                    expect(risen.every((m) => m.rank === "magic" && m.state !== "idle")).toBe(true);
                } else {
                    opened++;
                    expect(game.monsters.length).toBe(monsters);
                }
                // Used once only
                const after = game.drops.length;
                use(game, f);
                expect(game.drops.length).toBe(after);
            }
        }
        expect(opened).toBeGreaterThan(0);
        expect(sprung).toBeGreaterThan(0);
    });

    it("blesses whoever touches a shrine, and Bandos's fills the potions", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const game = rift(seed);
            for (const f of game.features.filter((f) => f.kind === "shrine")) {
                const def = SHRINES[f.shrine!];
                game.heroData.potions[0]!.charges = 0;
                use(game, f);
                const buff = game.hero.buffs.find((b) => b.id === `shrine:${def.id}`);
                expect(buff?.name).toBe(def.name);
                if (def.restore) {
                    expect(game.heroData.potions[0]!.charges).toBe(mostDoses(game.heroData.potions[0]!));
                    return;
                }
            }
        }
        throw new Error("no Shrine of Bandos in twenty rifts");
    });

    it("keeps a hoard shut while its guards stand, and opens it once they're dead", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const game = rift(seed);
            const hoard = game.features.find((f) => f.kind === "hoard");
            if (!hoard) {
                continue;
            }
            const guards = game["packs"][hoard.guards!];
            expect(guards.some((m) => m.rank === "rare")).toBe(true);
            use(game, hoard);
            expect(hoard.used).toBe(false);
            expect(guards.every((m) => m.state !== "idle")).toBe(true);
            for (const m of guards) {
                if (m.state !== "dead") {
                    kill(game, m);
                }
            }
            const drops = game.drops.length;
            use(game, hoard);
            expect(hoard.used).toBe(true);
            expect(game.drops.length).toBeGreaterThan(drops + 1);
            return;
        }
        throw new Error("no hoard in twenty rifts");
    });
});
