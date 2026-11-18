// A hero saved and loaded again: gems in their sockets with their levels, the passives taken and the
// skill bar, the runes and the stash; a hero saved before gems were, given sockets and their level's
// gems; one saved before runes, given an empty pouch and stash; the open rift's modifiers; and the
// tasks under way. The roster of heroes: the first hero's own key kept, each after under one of its own, and deleting;
// what was saved while the game was called Runefall, moved to its own keys;
// and how each looks, their name and whether they're hardcore.
import { CLASS_LOOKS, KITS, PRESETS, kitsFor, plainLook, randomLook, readLook, switchBody } from "../content/looks";
import { Rng } from "../../../engine/core/Rng";
import { STASH } from "../content/rules";
import { PASSIVES, START_NODE } from "../content/passives";
import { wornGems } from "../sim/gems";
import { gainXp, newHero } from "../sim/hero";
import { allocate } from "../sim/passives";
import { rollTask, takeTask } from "../sim/tasks";
import { SAVE_KEY, deleteHero, freeSlot, heroCount, listHeroes, loadHero, loadSettings, moveOldKeys, saveHero, setLastHero } from "./settings";

const store = new Map<string, string>();
beforeAll(() => {
    (globalThis as { localStorage?: unknown }).localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
        key: (i: number) => [...store.keys()][i] ?? null,
        get length() {
            return store.size;
        },
    };
});

describe("the save", () => {
    it("keeps gems in their sockets, the passives taken and the skill bar", () => {
        const hero = newHero("ranger", 4);
        gainXp(hero, 20000);
        allocate(hero, PASSIVES[START_NODE.ranger].links[0]);
        const worn = wornGems(hero);
        worn[0].gem.level = 4;
        worn[0].gem.xp = 123;
        saveHero(hero);
        const back = loadHero()!;
        expect(back.passives).toEqual(hero.passives);
        expect(back.skillBar).toEqual(hero.skillBar);
        expect(back.rewarded).toBe(hero.rewarded);
        const again = wornGems(back);
        expect(again.map((w) => [w.slot, w.index, w.def.id, w.gem.level, w.gem.xp])).toEqual(worn.map((w) => [w.slot, w.index, w.def.id, w.gem.level, w.gem.xp]));
        expect(back.equipment.body!.sockets).toEqual(hero.equipment.body!.sockets);
    });

    it("keeps the hireling, what it wears and whether it's fallen, and none for a hero from before", () => {
        const hero = newHero("warrior", 9);
        hero.hireling = { kind: "archer", name: "Ailsa", dead: true, equipment: { body: { uid: 777, base: hero.equipment.body!.base, rarity: "normal", level: 1, mods: [] } } };
        saveHero(hero);
        const back = loadHero()!;
        expect(back.hireling).toEqual(hero.hireling);
        const old = newHero("warrior", 9);
        saveHero(old);
        expect(loadHero()!.hireling).toBeUndefined();
    });

    it("keeps the belt's places stitched on, none for a hero from before, and moves a potion from a place not open into the pack", () => {
        const hero = newHero("warrior", 3);
        hero.beltStitched = 1;
        saveHero(hero);
        expect(loadHero()!.beltStitched).toBe(1);
        const old = newHero("warrior", 3);
        const potion = { ...old.potions[0]!, uid: 9001 };
        old.potions[3] = { ...potion, base: "super_defence" };
        delete (old as { beltStitched?: number }).beltStitched;
        saveHero(old);
        const back = loadHero()!;
        expect(back.beltStitched).toBe(0);
        expect(back.potions[3]).toBeNull();
        expect(back.inventory.some((i) => i?.uid === 9001)).toBe(true);
    });

    it("keeps Reldo's quests, the rift web and the open rift's place on it", () => {
        const hero = newHero("ranger", 4);
        hero.quests = { ready: ["gloomwood"], claimed: ["greenway"], leaders: ["dharok"], sockets: 1 };
        hero.web = { seed: 4242, lane: 4 };
        hero.riftOpen = true;
        hero.riftLane = 3;
        hero.riftBounty = "set";
        saveHero(hero);
        const back = loadHero()!;
        expect(back.quests).toEqual(hero.quests);
        expect(back.web).toEqual(hero.web);
        expect(back.riftLane).toBe(3);
        expect(back.riftBounty).toBe("set");
        saveHero(newHero("ranger", 4));
        const old = loadHero()!;
        expect(old.quests).toBeUndefined();
        expect(old.web).toBeUndefined();
    });

    it("keeps the rune pouch, where its rolls have got to, and the stash", () => {
        const hero = newHero("mage", 12);
        hero.runes.chaos = 3;
        hero.runes.soul = 1;
        hero.craftSeed = 123456;
        hero.stash[STASH.tabSize + 5] = { uid: 5000, base: hero.equipment.body!.base, rarity: "normal", level: 12, mods: [] };
        saveHero(hero);
        const back = loadHero()!;
        expect(back.runes).toEqual(hero.runes);
        expect(back.craftSeed).toBe(123456);
        expect(back.stash.length).toBe(STASH.tabs * STASH.tabSize);
        expect(back.stash[STASH.tabSize + 5]?.uid).toBe(5000);
        // Uids made from here can't be one the stash has
        expect(back.nextUid).toBeGreaterThan(5000);
    });

    it("gives a hero from before runes an empty pouch and stash", () => {
        const hero = newHero("ranger", 4) as unknown as Record<string, unknown>;
        delete hero.runes;
        delete hero.craftSeed;
        delete hero.stash;
        store.set("riftscaper-save", JSON.stringify(hero));
        const back = loadHero()!;
        expect(Object.values(back.runes).every((n) => n === 0)).toBe(true);
        expect(back.stash.every((x) => x === null)).toBe(true);
        expect(Number.isInteger(back.craftSeed)).toBe(true);
    });

    it("gives a hero from before gems sockets and the gems their level brings", () => {
        const hero = newHero("warrior", 4) as unknown as Record<string, unknown>;
        // As saves were: no sockets, gems, passives or bar
        const equipment = hero.equipment as Record<string, { sockets?: unknown }>;
        for (const item of Object.values(equipment)) {
            delete item.sockets;
        }
        delete hero.passives;
        delete hero.skillBar;
        delete hero.rewarded;
        hero.level = 8;
        store.set("riftscaper-save", JSON.stringify(hero));
        const back = loadHero()!;
        expect(back.level).toBe(8);
        expect(back.rewarded).toBe(8);
        expect(back.passives).toEqual([]);
        const ids = wornGems(back).map((w) => w.def.id);
        expect(ids).toContain("slash");
        expect(ids).toContain("slam");
        expect(back.skillBar[0]).not.toBeNull();
    });

    it("keeps the open rift and its modifiers, and gives a hero from before them none", () => {
        const hero = newHero("ranger", 6);
        hero.depth = 3;
        hero.maxDepth = 4;
        hero.zoneSeed = 987654;
        hero.riftOpen = true;
        hero.riftMods = ["hasted", "elemental", "enraged"];
        saveHero(hero);
        const back = loadHero()!;
        expect(back.riftOpen).toBe(true);
        expect(back.riftMods).toEqual(["hasted", "elemental", "enraged"]);
        expect(back.depth).toBe(3);
        expect(back.zoneSeed).toBe(987654);

        // Modifiers that aren't any more, or twice over, are left out
        const odd = { ...hero, riftMods: ["hasted", "nonsense", "hasted", 7] } as unknown as Record<string, unknown>;
        store.set("riftscaper-save", JSON.stringify(odd));
        expect(loadHero()!.riftMods).toEqual(["hasted"]);

        const old = newHero("ranger", 6) as unknown as Record<string, unknown>;
        delete old.riftOpen;
        delete old.riftMods;
        store.set("riftscaper-save", JSON.stringify(old));
        const before = loadHero()!;
        expect(before.riftOpen).toBe(false);
        expect(before.riftMods).toEqual([]);
    });

    it("keeps the Tombs' invocations chosen and the open raid's, leaving out any that aren't any more", () => {
        const hero = newHero("mage", 7);
        hero.invocations = ["walkThePath", "onADiet"];
        hero.riftOpen = true;
        hero.riftPinnacle = "tombs";
        hero.riftInvocations = ["insanity"];
        saveHero(hero);
        const back = loadHero()!;
        expect(back.invocations).toEqual(["walkThePath", "onADiet"]);
        expect(back.riftInvocations).toEqual(["insanity"]);

        const odd = { ...hero, invocations: ["onADiet", "nonsense", "walkThePath", "onADiet"] } as unknown as Record<string, unknown>;
        store.set("riftscaper-save", JSON.stringify(odd));
        expect(loadHero()!.invocations).toEqual(["walkThePath", "onADiet"]);

        const old = newHero("mage", 7) as unknown as Record<string, unknown>;
        store.set("riftscaper-save", JSON.stringify(old));
        expect(loadHero()!.invocations).toBeUndefined();
    });

    it("keeps riftstones with their modifiers, the Heartstone's shards, and the Heart left open", () => {
        const hero = newHero("mage", 8);
        hero.maxDepth = 20;
        hero.depth = 20;
        hero.riftOpen = true;
        hero.riftPinnacle = "heart";
        hero.riftMods = [];
        hero.inventory[0] = { uid: 7001, base: "riftstone", rarity: "rare", level: 12, mods: [], rift: ["hasted", "elemental", "enraged", "teeming"] };
        hero.inventory[1] = { uid: 7002, base: "heartshard_fire", rarity: "unique", level: 30, mods: [] };
        hero.stash[3] = { uid: 7003, base: "riftstone", rarity: "normal", level: 9, mods: [], rift: [] };
        saveHero(hero);
        const back = loadHero()!;
        expect(back.inventory[0]).toEqual(hero.inventory[0]);
        expect(back.inventory[1]).toEqual(hero.inventory[1]);
        expect(back.stash[3]).toEqual(hero.stash[3]);
        expect(back.riftPinnacle).toBe("heart");

        // A stone's modifiers that aren't any more are left out; a hero from before the Heart is
        // in no Heart, and one from before the other pinnacles in the Heart by its flag alone
        const odd = { ...hero, riftPinnacle: undefined, inventory: [{ ...hero.inventory[0], rift: ["hasted", "nonsense"] }] } as unknown as Record<string, unknown>;
        store.set("riftscaper-save", JSON.stringify(odd));
        const mended = loadHero()!;
        expect(mended.inventory[0]?.rift).toEqual(["hasted"]);
        expect(mended.riftPinnacle).toBeUndefined();
        store.set("riftscaper-save", JSON.stringify({ ...odd, riftHeart: true }));
        expect(loadHero()!.riftPinnacle).toBe("heart");
        store.set("riftscaper-save", JSON.stringify({ ...odd, riftPinnacle: "kril", killCount: { zamorak: 12, nonsense: 4 } }));
        expect(loadHero()!.riftPinnacle).toBe("kril");
        expect(loadHero()!.killCount).toEqual({ zamorak: 12 });
    });

    it("keeps the tasks under way and their rewards, leaving out any naming what isn't any more", () => {
        const hero = newHero("warrior", 6);
        hero.maxDepth = 8;
        const rng = new Rng(9);
        for (const giver of ["farmer", "priest", "carter"] as const) {
            expect(takeTask(hero, rollTask(rng, hero, giver))).toBeUndefined();
        }
        hero.tasks[0].progress = 1;
        saveHero(hero);
        const back = loadHero()!;
        expect(back.tasks).toEqual(hero.tasks);
        // Uids made from here can't be a task's or its reward's
        const most = Math.max(...hero.tasks.flatMap((t) => [t.uid, t.reward.item?.uid ?? 0]));
        expect(back.nextUid).toBeGreaterThan(most);

        // A kind of task, one of the folk or a monster that isn't any more: that task left out
        const [a, b, c] = hero.tasks;
        const odd = { ...hero, tasks: [{ ...a, kind: "nonsense" }, { ...b, giver: "nobody" }, c, { ...c, kind: "slay", target: "nothing" }] };
        store.set("riftscaper-save", JSON.stringify(odd));
        expect(loadHero()!.tasks.map((t) => t.uid)).toEqual([c.uid]);

        // A hero from before tasks has none
        const old = { ...hero } as unknown as Record<string, unknown>;
        delete old.tasks;
        store.set("riftscaper-save", JSON.stringify(old));
        expect(loadHero()!.tasks).toEqual([]);
    });
});

describe("the heroes", () => {
    beforeEach(() => store.clear());

    it("keeps the hero from before there were many under their own key, and each new one under another", () => {
        // As the game saved before the roster: one hero, and no list
        store.set(SAVE_KEY, JSON.stringify(newHero("warrior", 1, { name: "Old Hand" })));
        expect(heroCount()).toBe(1);
        expect(listHeroes().map((h) => [h.slot, h.hero.name])).toEqual([[SAVE_KEY, "Old Hand"]]);

        const slot = freeSlot();
        expect(slot).not.toBe(SAVE_KEY);
        saveHero(newHero("necromancer", 2, { name: "Morwen" }), slot);
        expect(heroCount()).toBe(2);
        // The last saved first, then the last played
        expect(listHeroes().map((h) => h.hero.name)).toEqual(["Morwen", "Old Hand"]);
        setLastHero(SAVE_KEY);
        expect(listHeroes().map((h) => h.hero.name)).toEqual(["Old Hand", "Morwen"]);
        expect(freeSlot()).not.toBe(slot);
    });

    it("deletes a hero for good, and gives the first key out again once it's free", () => {
        saveHero(newHero("rogue", 1, { name: "Briar" }), freeSlot());
        const second = freeSlot();
        saveHero(newHero("paladin", 1, { name: "Thane" }), second);
        deleteHero(SAVE_KEY);
        expect(store.has(SAVE_KEY)).toBe(false);
        expect(listHeroes().map((h) => h.hero.name)).toEqual(["Thane"]);
        expect(freeSlot()).toBe(SAVE_KEY);
        deleteHero(second);
        expect(heroCount()).toBe(0);
    });

    it("moves the heroes, the roster and the settings saved while the game was called Runefall", () => {
        // As the game saved them under its old name: the roster before its heroes, as a browser may list them
        store.set("runefall-heroes", JSON.stringify({ slots: ["runefall-save", "runefall-save-3"], last: "runefall-save-3" }));
        store.set("runefall-save", JSON.stringify(newHero("warrior", 1, { name: "Old Hand" })));
        store.set("runefall-save-3", JSON.stringify(newHero("mage", 1, { name: "Morwen" })));
        store.set("runefall-settings", JSON.stringify({ uiSize: 1.25, shake: false }));
        store.set("runefall-audio", JSON.stringify({ muted: true }));
        // Something already under the new name is kept, and the old left where it was
        store.set("riftscaper-audio", JSON.stringify({ muted: false }));

        moveOldKeys();

        expect(listHeroes().map((h) => [h.slot, h.hero.name])).toEqual([
            ["riftscaper-save-3", "Morwen"],
            [SAVE_KEY, "Old Hand"],
        ]);
        expect(loadSettings()).toMatchObject({ uiSize: 1.25, shake: false });
        expect(store.get("riftscaper-audio")).toBe(JSON.stringify({ muted: false }));
        expect([...store.keys()].filter((k) => k.startsWith("runefall-"))).toEqual(["runefall-audio"]);
        // Once moved, again does nothing
        const before = new Map(store);
        moveOldKeys();
        expect(store).toEqual(before);
    });

    it("keeps how a hero looks, their name, and whether they're hardcore and have fallen", () => {
        const look = { female: true, kits: [50, 296, 57, 62, 68, 71, 80], colors: [12, 24, 16, 3, 7], hideHelm: true };
        const hero = newHero("necromancer", 3, { name: "Ysolde", look, hardcore: true });
        hero.fallen = true;
        saveHero(hero);
        const back = loadHero()!;
        expect(back.name).toBe("Ysolde");
        expect(back.look).toEqual(look);
        expect(back.hardcore).toBe(true);
        expect(back.fallen).toBe(true);
    });

    it("offers only looks a body can have: each class's, the presets, the dice's, and a body switched", () => {
        const looks = [...Object.values(CLASS_LOOKS), ...PRESETS.map((p) => p.look)];
        const rng = new Rng(7);
        for (let i = 0; i < 40; i++) {
            looks.push(randomLook(rng, i % 2 === 0));
        }
        looks.push(...looks.map(switchBody));
        for (const look of looks) {
            // Read back as it is, so nothing in it was mended
            expect(readLook(JSON.parse(JSON.stringify(look)), CLASS_LOOKS.warrior)).toEqual(look);
            // Every face has its chin
            expect(look.kits[1]).not.toBe(-1);
        }
    });

    it("gives every body's face its chin, and a beard on one body the same on the other", () => {
        for (const female of [false, true]) {
            const kits = kitsFor(female);
            expect(plainLook(female).kits[1]).toBe(kits.jaw[0]);
            expect(kits.jaw).not.toContain(-1);
            for (const part of Object.values(kits)) {
                expect(new Set(part).size).toBe(part.length);
            }
        }
        expect(KITS.a.jaw.length).toBe(KITS.b.jaw.length);
        const bearded = { ...plainLook(false), kits: [3, 113, 18, 26, 33, 36, 42] };
        expect(switchBody(bearded).kits[1]).toBe(302);
        expect(switchBody(switchBody(bearded)).kits[1]).toBe(113);
    });

    it("gives a face saved without a beard its chin, and a kit offered once the one it's the same as", () => {
        const read = (female: boolean, hair: number, jaw: number) => readLook({ female, kits: [hair, jaw, 18, 26, 33, 36, 42], colors: [0, 0, 0, 0, 0] }, CLASS_LOOKS.warrior).kits;
        expect(read(false, 3, -1)[1]).toBe(KITS.a.jaw[0]);
        expect(read(true, 49, -1)[1]).toBe(KITS.b.jaw[0]);
        expect(read(false, 3, 153)[1]).toBe(117);
        expect(read(true, 142, 296)[0]).toBe(141);
        expect(read(true, 152, 296)[0]).toBe(141);
    });

    it("gives a hero from before looks their class's own, and mends a look that can't be", () => {
        const old = newHero("paladin", 1) as unknown as Record<string, unknown>;
        delete old.look;
        delete old.hardcore;
        delete old.fallen;
        store.set(SAVE_KEY, JSON.stringify(old));
        const back = loadHero()!;
        expect(back.look).toEqual(CLASS_LOOKS.paladin);
        expect(back.hardcore).toBe(false);
        expect(back.fallen).toBe(false);

        // A body type A's hair on body type B, and colours past the end
        const odd = { ...old, look: { female: true, kits: [3, 10, 18, 26, 33, 36, 42], colors: [99, -1, 2, 3, 4] } };
        store.set(SAVE_KEY, JSON.stringify(odd));
        const mended = loadHero()!.look;
        expect(mended.female).toBe(true);
        expect(mended.kits[0]).not.toBe(3);
        expect(mended.kits[1]).toBe(KITS.b.jaw[0]);
        expect(mended.colors).toEqual([0, 0, 2, 3, 4]);
    });
});
