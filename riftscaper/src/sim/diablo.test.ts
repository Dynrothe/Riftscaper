// Diablo II's items (docs/diablo-expansion.md, section 4): sets and their bonuses, the Barrows
// brothers' powers, chances to cast, levels on skill gems, the rift-touched tier, elite bases,
// uniques that roll and drop unidentified, the high runes, runewords, the transmuting circle, and
// TzHaar-Hur-Tel's obsidian for tokkul.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { BARROWS } from "../content/encounters";
import { AFFIXES, BASES, RIFT_TIER, SETS, SET_PRICES, UNIQUE_BY_ID } from "../content/items";
import { RUNEWORD_BY_ID } from "../content/runewords";
import { RUNES } from "../content/runes";
import { Game, noInput } from "./Game";
import { eliteOf, transmuteElite, transmuteHerb, transmuteRejuv, transmuteRiftstones, transmuteRune } from "./circle";
import { BASIC, wornGems } from "./gems";
import { gainXp, heroStats, identify, newHero, setsWorn, whyNotEquip } from "./hero";
import { ELITE_FROM, Item, freshUnique, itemInfo, pickBase, plainItem, rollItem, rollMod, rollSetPiece, uniqueRange } from "./loot";
import { applyRune, rollRune, runeWhyNot } from "./runes";
import { inscribe, runewordWhyNot } from "./runewords";
import { resolveSkill } from "./skills";
import { buySetPiece } from "./town";
import { RIFTSTONE_BASE } from "../content/riftstones";
import { ladderRift } from "./ladder";

const piece = (id: string, uid = 500): Item => ({ uid, base: id, rarity: "unique", level: 55, mods: [] });

function strongHero(cls: "warrior" | "mage" | "ranger" = "warrior") {
    const hero = newHero(cls, 4);
    gainXp(hero, 50_000_000);
    return hero;
}

describe("set items", () => {
    it("give their bonuses for the pieces worn together, and nothing unidentified", () => {
        const hero = strongHero();
        const bare = heroStats(hero);
        hero.equipment.head = piece("torags_helm", 501);
        hero.equipment.body = piece("torags_platebody", 502);
        const two = heroStats(hero);
        expect(setsWorn(hero).torag).toBe(2);
        expect(two.sets.torag).toBe(2);
        // 25% more armour from the pair, past the pieces' own
        expect(two.armour).toBeGreaterThan(bare.armour + 60 + 155);
        expect(two.powers.has("torags")).toBe(false);
        hero.equipment.legs = piece("torags_platelegs", 503);
        hero.equipment.weapon = piece("torags_hammers", 504);
        const four = heroStats(hero);
        expect(four.powers.has("torags")).toBe(true);
        expect(four.maxLife).toBeGreaterThan(two.maxLife + 80);
        // A piece unread counts for nothing
        hero.equipment.weapon.unid = true;
        expect(heroStats(hero).powers.has("torags")).toBe(false);
        expect(setsWorn(hero).torag).toBe(3);
    });

    it("gives Dharok's full set his curse, its greataxe the unique it was", () => {
        const hero = strongHero();
        for (const [slot, id] of [
            ["head", "dharoks_helm"],
            ["body", "dharoks_platebody"],
            ["legs", "dharoks_platelegs"],
        ] as const) {
            hero.equipment[slot] = piece(id);
        }
        expect(heroStats(hero).keystones.has("dharoksCurse")).toBe(false);
        hero.equipment.weapon = piece("dharoks_greataxe");
        expect(heroStats(hero).keystones.has("dharoksCurse")).toBe(true);
        expect(UNIQUE_BY_ID.get("dharoks_greataxe")!.source).toBeUndefined();
    });

    it("lists every set's pieces, each of its slot once, and all of them real uniques", () => {
        for (const set of Object.values(SETS)) {
            const slots = new Set(set.pieces.map((id) => UNIQUE_BY_ID.get(id)!.slot));
            // The Void Knights' three helms are one piece, whichever's worn
            expect(slots.size, set.id).toBe(set.id === "void" ? set.pieces.length - 2 : set.pieces.length);
            expect(set.bonuses.map((b) => b.pieces)).toEqual(slots.size === 6 ? [2, 4, 6] : [2, 3, 4]);
            for (const id of set.pieces) {
                expect(UNIQUE_BY_ID.get(id)!.set, id).toBe(set.id);
            }
        }
    });

    it("keeps the Barrows' and the TzHaar's pieces out of the rifts' unique drops", () => {
        const rng = new Rng(3);
        for (let i = 0; i < 3000; i++) {
            const item = rollItem(rng, i, { level: 90, rarity: 0, atLeast: "unique" });
            const u = UNIQUE_BY_ID.get(item.base);
            expect(u?.source, item.base).toBeUndefined();
        }
        const p = rollSetPiece(new Rng(4), 1, 70, ["ahrim"]);
        expect(SETS.ahrim.pieces).toContain(p.base);
        expect(p.unid).toBe(true);
    });
});

describe("chances to cast and levels on skill gems", () => {
    it("adds levels to the gems worn, past their own", () => {
        const hero = strongHero();
        const worn = wornGems(hero).find((w) => w.def.skill)!;
        const before = resolveSkill(hero, heroStats(hero), worn.gem.uid)!.level;
        hero.equipment.amulet = { uid: 600, base: "amulet_of_power", rarity: "rare", level: 70, mods: [{ affix: "skillLevels", tier: 1, values: [2] }], rareName: "Test" };
        if (!itemInfo(hero.equipment.amulet)) {
            throw new Error("no amulet");
        }
        const stats = heroStats(hero);
        expect(stats.skillLevels.all).toBe(2);
        expect(resolveSkill(hero, stats, worn.gem.uid)!.level).toBe(before + 2);
    });

    it("casts a worn proc's skill at what was hit, once in a while and never from its own cast", () => {
        const hero = strongHero();
        const rows: string[] = [];
        for (let row = 0; row < 40; row++) {
            rows.push(row === 0 || row === 39 ? "#".repeat(40) : `#${".".repeat(38)}#`);
        }
        const game = new Game(makeGrid(rows, 100, 200), hero, { depth: 3, seed: 2, spawn: { x: 104.5, y: 204.5 } });
        const m = game.monsters.find((o) => o.rank === "normal")!;
        for (const o of game.monsters) {
            if (o !== m) {
                o.state = "dead";
            }
        }
        m.maxLife = m.life = 1e9;
        game.stats.procs = [{ when: "strike", chance: 1, gem: "icenova", level: 10 }];
        const basic = resolveSkill(hero, game.stats, BASIC)!;
        const casts = () => game.takeEvents().filter((e) => e.kind === "cast" && e.skill.id === "icenova").length;
        game.takeEvents();
        game["hitMonster"](m, { amount: 5, crit: false }, basic);
        game.step(noInput());
        expect(casts()).toBe(1);
        // Not again till PROC_SECONDS have gone
        game["hitMonster"](m, { amount: 5, crit: false }, basic);
        game.step(noInput());
        expect(casts()).toBe(0);
        // and never from a cast that was one
        game["procReady"].clear();
        game["hitMonster"](m, { amount: 5, crit: false }, { ...basic, proc: true });
        game.step(noInput());
        expect(casts()).toBe(0);
    });
});

describe("the rift-touched tier and elite bases", () => {
    it("opens a seventh tier at item level 65, rarely, on gear's affixes", () => {
        const added = AFFIXES.find((a) => a.id === "added")!;
        expect(added.tiers.length).toBe(7);
        expect(added.tiers[6].level).toBe(RIFT_TIER.level);
        expect(added.tiers[6].name).toBe(RIFT_TIER.prefix);
        const rng = new Rng(9);
        let rift = 0;
        for (let i = 0; i < 2000; i++) {
            expect(rollMod(rng, added, "weapon", 64).tier).toBeLessThan(6);
            if (rollMod(rng, added, "weapon", 70).tier === 6) {
                rift++;
            }
        }
        expect(rift).toBeGreaterThan(40);
        expect(rift).toBeLessThan(400);
        const item: Item = { uid: 1, base: "rune_scimitar", rarity: "magic", level: 70, mods: [{ affix: "added", tier: 6, values: [14, 30] }] };
        expect(itemInfo(item).stats.every((l) => l.rift)).toBe(true);
        expect(itemInfo(item).name).toContain("Riftborn");
    });

    it("drops elite bases only on the ladder, and the circle makes a normal item's", () => {
        const rng = new Rng(5);
        for (let i = 0; i < 3000; i++) {
            expect(pickBase(rng, 90).elite).toBeFalsy();
            expect(pickBase(rng, ELITE_FROM, undefined, undefined, undefined, false).elite).toBeFalsy();
        }
        let elite = 0;
        for (let i = 0; i < 400; i++) {
            if (rollItem(rng, i, { level: 90, rarity: 0, elite: true }).base.match(/torva|masori|virtus|bandos|armadyl|godsword|inquisitor|justiciar|ancestral|rapier|kodai|faerdhinen|nightmare|soulreaper|fang|zaryte|tumeken/)) {
                elite++;
            }
        }
        expect(elite).toBeGreaterThan(20);
        expect(BASES.filter((b) => b.elite).length).toBeGreaterThan(30);
        expect(eliteOf(plainItem(1, "rune_body"))!.slot).toBe("body");
        expect(eliteOf(plainItem(1, "rune_scimitar"))!.weapon!.kind).toBe("melee");
    });
});

describe("uniques that roll, and drop unidentified", () => {
    it("rolls a unique's numbers within a fifth of each, the same for its uid, and a Soul rune again", () => {
        const u = UNIQUE_BY_ID.get("abyssal_whip")!;
        const a = freshUnique(piece("abyssal_whip", 77));
        const b = freshUnique(piece("abyssal_whip", 77));
        expect(a.rolls).toEqual(b.rolls);
        expect(a.unid).toBe(true);
        u.stats.forEach((line, i) => {
            const r = uniqueRange(u, line);
            if (r) {
                expect(a.rolls![i]).toBeGreaterThanOrEqual(r[0]);
                expect(a.rolls![i]).toBeLessThanOrEqual(r[1]);
            } else {
                expect(a.rolls![i]).toBe(line.value);
            }
        });
        expect(runeWhyNot(a, "soul")).toBeDefined();
        const hero = strongHero();
        hero.inventory[0] = a;
        expect(whyNotEquip(hero, a)).toMatch(/Reldo/);
        expect(itemInfo(a).name).toBe("Unidentified unique");
        expect(identify(hero)).toEqual([a]);
        expect(a.unid).toBeUndefined();
        expect(itemInfo(a).name).toBe(u.name);
        expect(runeWhyNot(a, "soul")).toBeUndefined();
        expect(runeWhyNot(a, "chaos")).toBeDefined();
        const rng = new Rng(2);
        let changed = false;
        for (let i = 0; i < 20 && !changed; i++) {
            const before = JSON.stringify(a.rolls);
            applyRune(rng, a, "soul");
            changed = JSON.stringify(a.rolls) !== before;
        }
        expect(changed).toBe(true);
        // A set piece's numbers are fixed
        const set = UNIQUE_BY_ID.get("dharoks_helm")!;
        expect(set.stats.every((line) => !uniqueRange(set, line))).toBe(true);
    });
});

describe("high runes, runewords and the transmuting circle", () => {
    it("drops the high runes only from the ladder's first depth, and lets them do nothing on their own", () => {
        const rng = new Rng(1);
        const seen = new Set<string>();
        for (let i = 0; i < 4000; i++) {
            seen.add(rollRune(rng, 64).id);
        }
        expect([...seen].some((id) => RUNES[id as keyof typeof RUNES].high)).toBe(false);
        for (let i = 0; i < 4000; i++) {
            seen.add(rollRune(rng, 65).id);
        }
        expect(seen.has("water")).toBe(true);
        expect(seen.has("sunfire")).toBe(false);
        expect(runeWhyNot(plainItem(1, "rune_scimitar"), "water")).toBeDefined();
    });

    it("inscribes a word on a normal item with exactly its sockets, spending its runes", () => {
        const hero = strongHero();
        const word = RUNEWORD_BY_ID.get("kindling")!;
        const sword: Item = { ...plainItem(700, "rune_scimitar"), level: 60, sockets: [{ color: "red", linked: false }] };
        hero.inventory[0] = sword;
        expect(runewordWhyNot(sword, word)).toMatch(/exactly 2 sockets/);
        sword.sockets!.push({ color: "red", linked: false });
        expect(runewordWhyNot(sword, word)).toBeUndefined();
        expect(inscribe(hero, { index: 0 }, "kindling")).toMatch(/short/);
        hero.runes.fire = 1;
        hero.runes.chaos = 1;
        expect(typeof inscribe(hero, { index: 0 }, "kindling")).toBe("object");
        expect(hero.runes.fire).toBe(0);
        expect(hero.runes.chaos).toBe(0);
        const info = itemInfo(sword);
        expect(info.name).toBe("Kindling");
        expect(info.runeword).toBe(true);
        expect(info.level).toBe(word.level);
        expect(info.powers!.length).toBe(1);
        expect(runeWhyNot(sword, "air")).toBeDefined();
        expect(runewordWhyNot(sword, word)).toBeDefined();
        // Worn, its chance to cast is the hero's
        hero.equipment.weapon = sword;
        expect(heroStats(hero).procs).toContainEqual(word.procs![0]);
    });

    it("makes three runes or herbs one of the next, three riftstones one a depth deeper, and the rest", () => {
        const hero = strongHero();
        hero.inventory.fill(null);
        hero.runes.air = 7;
        expect(transmuteRune(hero, "air")).toBeUndefined();
        expect(hero.runes.air).toBe(4);
        expect(hero.runes.mind).toBe(1);
        hero.runes.sunfire = 3;
        expect(transmuteRune(hero, "sunfire")).toBeDefined();
        hero.goods.guam = 3;
        expect(transmuteHerb(hero, "guam")).toBeUndefined();
        expect(hero.goods.tarromin).toBe(1);
        hero.inventory[0] = { uid: 1, base: RIFTSTONE_BASE, rarity: "normal", level: 20, mods: [], rift: [] };
        hero.inventory[1] = { uid: 2, base: RIFTSTONE_BASE, rarity: "magic", level: 20, mods: [], rift: [] };
        expect(transmuteRiftstones(hero, 20)).toMatch(/3 riftstones/);
        hero.inventory[2] = { uid: 3, base: RIFTSTONE_BASE, rarity: "normal", level: 20, mods: [], rift: [] };
        const deeper = transmuteRiftstones(hero, 20) as Item;
        expect(deeper.level).toBe(21);
        expect(hero.inventory.filter((i) => i?.base === RIFTSTONE_BASE).length).toBe(1);
        hero.inventory[3] = plainItem(10, "guthix_rest");
        hero.inventory[4] = plainItem(11, "prayer_potion");
        const rejuv = transmuteRejuv(hero) as Item;
        expect(rejuv.base).toBe("sanfew_serum");
        expect(rejuv.charges).toBeGreaterThan(0);
        const body: Item = { ...plainItem(12, "rune_body"), level: 66, sockets: [{ color: "red", linked: false }] };
        hero.inventory[5] = body;
        expect(transmuteElite(hero, { index: 5 })).toMatch(/Law/);
        hero.runes.law = 1;
        hero.runes.cosmic = 1;
        expect(transmuteElite(hero, { index: 5 })).toBe(body);
        expect(BASES.find((b) => b.id === body.base)!.elite).toBe(true);
        expect(body.level).toBe(66);
        expect(body.sockets!.length).toBe(1);
    });
});

describe("the square's set stalls", () => {
    it("sells the obsidian set for tokkul, read and socketed", () => {
        const hero = strongHero();
        hero.inventory.fill(null);
        const price = SET_PRICES.obsidian_helmet;
        hero.goods.tokkul = price - 1;
        expect(buySetPiece(hero, "tzhaar", "obsidian_helmet")).toMatch(/tokkul/);
        hero.goods.tokkul = price;
        const helm = buySetPiece(hero, "tzhaar", "obsidian_helmet") as Item;
        expect(helm.base).toBe("obsidian_helmet");
        expect(helm.unid).toBeUndefined();
        expect(hero.goods.tokkul).toBe(0);
        expect(buySetPiece(hero, "tzhaar", "abyssal_whip")).toMatch(/doesn't sell/);
    });

    it("sells each stall's own set, for its own money", () => {
        const hero = strongHero();
        hero.inventory.fill(null);
        hero.goods.voidSeal = 1000;
        hero.goods.abyssalPearls = 1000;
        expect(buySetPiece(hero, "void", "hat_of_the_eye")).toMatch(/doesn't sell/);
        expect(buySetPiece(hero, "felix", "void_knight_top")).toMatch(/doesn't sell/);
        expect((buySetPiece(hero, "void", "void_knight_top") as Item).base).toBe("void_knight_top");
        expect(hero.goods.voidSeal).toBe(1000 - SET_PRICES.void_knight_top);
        expect((buySetPiece(hero, "felix", "hat_of_the_eye") as Item).base).toBe("hat_of_the_eye");
        expect(hero.goods.abyssalPearls).toBe(1000 - SET_PRICES.hat_of_the_eye);
        // Every piece a stall sells has a price
        for (const set of ["obsidian", "void", "raiments"] as const) {
            for (const piece of SETS[set].pieces) {
                expect(SET_PRICES[piece], piece).toBeGreaterThan(0);
            }
        }
    });
});

describe("the Barrows' set pieces", () => {
    it("drops a piece of a slain brother's set from the chest, now and then", () => {
        const was = BARROWS.setChance;
        BARROWS.setChance = 1;
        try {
            let seed = 1;
            while (ladderRift(17, seed).encounter !== "barrows") {
                seed++;
            }
            const hero = newHero("warrior", seed);
            hero.level = 62;
            const rows: string[] = [];
            for (let row = 0; row < 96; row++) {
                rows.push(row === 0 || row === 95 ? "#".repeat(96) : `#${".".repeat(94)}#`);
            }
            const game = new Game(makeGrid(rows, 100, 200), hero, { depth: 17, seed, spawn: { x: 104.5, y: 204.5 } });
            for (const m of game.monsters) {
                m.state = "dead";
            }
            game.barrowsSlain = game.barrowsTombs;
            const chest = game.features.find((f) => f.kind === "barrows")!;
            game.hero.x = game.hero.prevX = chest.stand.x;
            game.hero.y = game.hero.prevY = chest.stand.y;
            const input = noInput();
            input.command = { kind: "feature", uid: chest.uid };
            game.step(input);
            const pieces = game.drops.filter((d) => d.item && UNIQUE_BY_ID.get(d.item.base)?.source === "barrows");
            expect(pieces.length).toBeGreaterThan(0);
            const sets = new Set(game.rift!.brothers!.map((b) => b));
            expect(sets.has(UNIQUE_BY_ID.get(pieces[0].item!.base)!.set as never)).toBe(true);
        } finally {
            BARROWS.setChance = was;
        }
    });
});
