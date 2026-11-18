// Forged gems: every archetype and look makes a whole gem; drops are only of what the class can
// use, the same from the same seed, with one to three traits each; every one works in a fight;
// and each trait does what its words say.
import { Rng } from "../../../engine/core/Rng";
import { makeGrid } from "../../../engine/world/testGrid";
import { CLASSES, CLASS_IDS } from "../content/classes";
import { ARCHETYPES, ForgeRecipe, SURGE_EVERY, TRAITS, TraitId, forgeSkillDefs, forgedGem, readRecipe, traitLines, traitsFor } from "../content/forge";
import { MAX_GEM_LEVEL } from "../content/gems";
import type { ClassId } from "../content/items";
import { Game, Monster, noInput } from "./Game";
import { FORGED, itemInfo, sellValue } from "./loot";
import { bindSkill, classCanUse, forgeArchetypes, gemDef, gemPrice, rollForgedGem } from "./gems";
import { gainXp, newHero } from "./hero";

const SIZE = 40;
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

function recipe(arch: string, traits: TraitId[], variant = 0): ForgeRecipe {
    return { arch, variant, word: 0, noun: 0, roll: 0.5, level: 1, traits: traits.map((id) => ({ id, q: 1 })) };
}

// The class that can use an archetype
function classFor(arch: string): ClassId {
    return CLASS_IDS.find((cls) => forgeArchetypes(cls).some((a) => a.id === arch))!;
}

// A hero with a forged gem on the button after the left, at its highest level so it never levels
// mid-fight (and the skills are made again), and a normal monster in front of them (a guardian
// shrugs off slows and pulls); the rest gone, unless asked for
function fight(r: ForgeRecipe, distance = 1.6, others = 0) {
    const cls = classFor(r.arch);
    const hero = newHero(cls, 3);
    gainXp(hero, 1e7);
    const gem = { uid: hero.nextUid++, base: FORGED, rarity: "gem" as const, level: MAX_GEM_LEVEL, mods: [], xp: 0, forge: r };
    hero.equipment.body!.sockets = [{ color: "white", linked: false, gem }];
    bindSkill(hero, 1, gem.uid);
    const game = new Game(land(), hero, { depth: 1, seed: 3, spawn: { x: BASE_X + 10.5, y: BASE_Y + 20.5 } });
    const h = game.hero;
    const near: Monster[] = [];
    game.monsters.forEach((m, i) => {
        if (i <= others) {
            // so the land's guardian, if it's first, takes them as any monster does
            m.rank = "normal";
            m.x = m.prevX = h.x + distance + i * 0.9;
            m.y = m.prevY = h.y + (i % 2) * 0.6;
            m.life = m.maxLife = 1e7;
            m.frozenUntil = 1e9;
            near.push(m);
        } else {
            m.state = "dead";
        }
    });
    return { game, m: near[0], near, hero };
}

// Uses the forged skill at the monster (or where it was) for a while, its button down at first
function use(game: Game, m: Monster, ticks: number, press = 3, standing = true) {
    const events = [];
    for (let i = 0; i < ticks; i++) {
        const input = noInput();
        input.hasAim = true;
        input.aimX = m.x;
        input.aimY = m.y;
        input.aimUid = m.state === "dead" ? -1 : m.uid;
        input.skills[1] = i % 60 < press;
        input.standing = standing;
        game.step(input);
        events.push(...game.takeEvents());
    }
    return events;
}

describe("forged gems", () => {
    it("make a whole gem of every archetype, look and trait", () => {
        for (const arch of ARCHETYPES) {
            expect(arch.nouns.length).toBeGreaterThan(0);
            expect(traitsFor(arch).length).toBeGreaterThan(1);
            arch.variants.forEach((v, variant) => {
                expect(v.words.length).toBeGreaterThan(0);
                for (const t of traitsFor(arch)) {
                    const def = forgedGem(recipe(arch.id, [t.id], variant));
                    expect(def.forged).toBe(true);
                    expect(def.skill!.damage).toBeGreaterThan(0);
                    expect(def.name).toMatch(new RegExp(`^${t.adjective} `));
                    expect(def.tags).toContain(v.element);
                    expect(traitLines(def.skill!.traits)).toHaveLength(1);
                    expect("sprite" in def.skill!.icon ? def.skill!.icon.sprite : def.skill!.icon.obj).toBeGreaterThan(0);
                }
            });
        }
        // The same recipe is the same gem; a trait costs damage
        const plain = forgedGem(recipe("blade", ["numbing"]));
        expect(forgedGem(recipe("blade", ["numbing"]))).toBe(plain);
        expect(forgedGem(recipe("blade", ["numbing", "echo"])).skill!.damage).toBeLessThan(plain.skill!.damage);
        expect(forgedGem(recipe("blade", ["numbing", "echo"])).name).toMatch(/ of Echoes$/);
        // and every look is baked
        expect(forgeSkillDefs().length).toBe(ARCHETYPES.reduce((n, a) => n + a.variants.length, 0));
    });

    it("drop only as what the class can use, with one to three traits of their kind", () => {
        const rng = new Rng(9);
        const counts = [0, 0, 0, 0];
        for (const cls of CLASS_IDS) {
            expect(forgeArchetypes(cls).length).toBeGreaterThanOrEqual(4);
            for (let i = 0; i < 200; i++) {
                const item = rollForgedGem(rng, i, 1 + (i % 40), cls);
                const def = gemDef(item)!;
                expect(classCanUse(cls, def)).toBe(true);
                expect(!def.weapons || def.weapons.some((w) => CLASSES[cls].weapons.includes(w))).toBe(true);
                const n = item.forge!.traits.length;
                expect(n).toBeGreaterThanOrEqual(1);
                expect(n).toBeLessThanOrEqual(3);
                expect(new Set(item.forge!.traits.map((t) => t.id)).size).toBe(n);
                counts[n]++;
                expect(itemInfo(item).name).toBe(def.name);
                expect(gemPrice(item)).toBeGreaterThan(0);
                expect(sellValue(item)).toBeGreaterThan(0);
            }
        }
        // one most often, three now and then
        expect(counts[1]).toBeGreaterThan(counts[2]);
        expect(counts[2]).toBeGreaterThan(counts[3]);
        expect(counts[3]).toBeGreaterThan(0);
        // the same from the same seed
        const a = rollForgedGem(new Rng(4), 1, 20, "mage");
        const b = rollForgedGem(new Rng(4), 1, 20, "mage");
        expect(b).toEqual(a);
    });

    it("are read back from a save as they were, and what can't be made is dropped", () => {
        const item = rollForgedGem(new Rng(2), 1, 20, "rogue");
        const back = readRecipe(JSON.parse(JSON.stringify(item.forge)));
        expect(back).toEqual(item.forge);
        expect(forgedGem(back!).name).toBe(gemDef(item)!.name);
        expect(readRecipe({ ...item.forge, arch: "nothing" })).toBeUndefined();
        expect(readRecipe({ ...item.forge, traits: [{ id: "nothing", q: 1 }] })).toBeUndefined();
        expect(readRecipe({ ...item.forge, variant: 99 })).toBeUndefined();
    });

    it.each(CLASS_IDS)("every %s's can be used, and hurts what's in front", (cls) => {
        const rng = new Rng(31);
        for (let i = 0; i < 12; i++) {
            const r = rollForgedGem(rng, 1, 30, cls).forge!;
            const { game, m } = fight(r);
            expect(game.skills[1]?.why).toBeUndefined();
            const kind = ARCHETYPES.find((a) => a.id === r.arch)!.base.kind;
            const events = use(game, m, 200, 3, kind !== "leap");
            expect(events.some((e) => e.kind === "cast")).toBe(true);
            expect(m.life).toBeLessThan(m.maxLife);
        }
    });
});

describe("a forged gem's traits", () => {
    it("are all for some archetype", () => {
        for (const t of TRAITS) {
            expect(ARCHETYPES.some((a) => traitsFor(a).includes(t))).toBe(true);
        }
    });

    it("echo: the skill again a moment later", () => {
        const { game, m } = fight(recipe("blade", ["echo"]));
        const events = use(game, m, 50);
        expect(events.filter((e) => e.kind === "cast").length).toBe(2);
        expect(events.filter((e) => e.kind === "monsterHit").length).toBe(2);
    });

    it("surging: every fourth use a critical strike", () => {
        const { game, m } = fight(recipe("blade", ["surging"]));
        const hits: boolean[] = [];
        for (let n = 0; n < SURGE_EVERY * 2; n++) {
            for (const e of use(game, m, 60)) {
                if (e.kind === "monsterHit") {
                    hits.push(e.crit);
                }
            }
        }
        expect(hits.length).toBe(SURGE_EVERY * 2);
        expect(hits[SURGE_EVERY - 1]).toBe(true);
        expect(hits[SURGE_EVERY * 2 - 1]).toBe(true);
    });

    it("thunder: lightning called down on what's hit", () => {
        const { game, m } = fight(recipe("blade", ["thunder"]));
        // It's made on a hit and lands a moment later
        let landed = 0;
        for (let n = 0; n < 30 && landed === 0; n++) {
            landed += use(game, m, 60).filter((e) => e.kind === "landed" && e.radius === 1.4).length;
        }
        expect(landed).toBeGreaterThan(0);
    });

    it("numbing: what's hit is slower", () => {
        const { game, m } = fight(recipe("blade", ["numbing"]));
        use(game, m, 40);
        expect(m.chillUntil).toBeGreaterThan(game.tick);
        expect(m.chill).toBeCloseTo(0.4);
    });

    it("frenzy and warding: build up with hits", () => {
        for (const [trait, key] of [
            ["frenzy", "attackSpeedPct"],
            ["warding", "lessDamageTaken"],
        ] as const) {
            const { game, m } = fight(recipe("blade", [trait]));
            use(game, m, 40);
            const one = game.hero.buffs.find((b) => b.id.startsWith("trait:"))!;
            expect(one.stacks).toBe(1);
            use(game, m, 40);
            const two = game.hero.buffs.find((b) => b.id.startsWith("trait:"))!;
            expect(two.stacks).toBe(2);
            expect(two[key]).toBeCloseTo(one[key]! * 2);
        }
    });

    it("volatile: a kill bursts on those near", () => {
        const { game, m, near } = fight(recipe("blade", ["volatile"]), 1.6, 1);
        m.life = 1;
        const other = near[1];
        use(game, m, 60);
        expect(m.state).toBe("dead");
        expect(other.life).toBeLessThan(other.maxLife);
    });

    it("bloodthirst: a kill quickens the hero", () => {
        const { game, m } = fight(recipe("blade", ["bloodthirst"]));
        m.life = 1;
        use(game, m, 30);
        expect(game.hero.buffs.find((b) => b.id === "trait:bloodthirst")?.moveSpeedPct).toBeCloseTo(30);
    });

    it("gravebound: what's killed rises for the hero", () => {
        const { game, m } = fight(recipe("blade", ["grave"]));
        const h = game.hero;
        // The one monster killed again and again, up beside the hero each time
        for (let n = 0; n < 40 && !game.minions.some((t) => t.fallen); n++) {
            m.state = "idle";
            m.x = m.prevX = h.x + 1.4;
            m.y = m.prevY = h.y;
            m.life = 1;
            use(game, m, 60);
        }
        expect(game.minions.some((t) => t.fallen)).toBe(true);
    });

    it("splitting: an arrow becomes more on its first enemy", () => {
        const { game, m } = fight(recipe("arrow", ["splitting"]), 5);
        let most = 0;
        for (let i = 0; i < 60; i++) {
            use(game, m, 1, i < 3 ? 1 : 0);
            most = Math.max(most, game.projectiles.length);
        }
        expect(most).toBe(3);
    });

    it("returning: an arrow flies back and through its enemy again", () => {
        const { game, m } = fight(recipe("arrow", ["returning"]), 5);
        // One press, then long enough for it to fly out and back
        const events = [...use(game, m, 1, 1), ...use(game, m, 140, 0)];
        expect(events.filter((e) => e.kind === "cast")).toHaveLength(1);
        expect(events.filter((e) => e.kind === "monsterHit")).toHaveLength(2);
        expect(game.projectiles).toHaveLength(0);
    });

    it("cascade: a rain falls again further on", () => {
        const { game, m } = fight(recipe("deluge", ["cascade"]), 5);
        // One press, and long enough for every fall to land
        const landed = [...use(game, m, 3, 3), ...use(game, m, 150, 0)].flatMap((e) => (e.kind === "landed" && e.side === "hero" ? [e] : []));
        expect(landed).toHaveLength(4);
        // each further on the way it was aimed
        expect(landed[3].x).toBeGreaterThan(landed[0].x + 3);
    });

    it("smoulder: the ground it lands on burns", () => {
        const { game, m } = fight(recipe("quake", ["smoulder"]), 1.6);
        use(game, m, 60);
        expect(game.grounds.length).toBe(1);
        expect(m.burnUntil).toBeGreaterThan(game.tick);
    });

    it("vortex: what's near is drawn in", () => {
        const { game, m } = fight(recipe("quake", ["vortex"]), 4);
        m.frozenUntil = 0;
        m.stunnedUntil = 1e9;
        const h = game.hero;
        const before = Math.hypot(m.x - h.x, m.y - h.y);
        use(game, m, 60);
        expect(Math.hypot(m.x - h.x, m.y - h.y)).toBeLessThan(before - 0.5);
    });
});
