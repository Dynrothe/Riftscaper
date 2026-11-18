// Forged gems: skill gems rolled when they drop, as Diablo's items are, rather than written out one
// by one. Each is an archetype (a way of fighting: a blow, a sweep, a bolt, a storm), one of its
// elements (what it's made of, and so what it looks like), a roll of its damage, and one to three
// traits: what makes it a skill nothing else is (it echoes, its kills explode, it calls lightning
// down, it leaves the ground burning). A trait costs some of its damage, so a gem with three is
// stranger, not simply stronger.
//
// Everything a forged gem shows is from a pool known before the game starts (an archetype's
// animation, an element's spot animations and icon), so the client bakes all of it up front
// (forgeSkillDefs). A gem's item keeps only its recipe, and the gem is made again from it.
import type { WeaponKind } from "./items";
import { SEQ } from "./items";
import type { GemColor, GemDef, SkillDef, SkillIcon, SkillKind, SkillTag } from "./gems";
import { SPOT, Visual } from "./visuals";

export type ForgeElement = "physical" | "fire" | "cold" | "lightning";

// A forged gem's name, and its traits, in its tooltip and on the ground
export const FORGED_COLOR = "#d878ff";
export const TRAIT_COLOR = "#ffb35a";

// One look an archetype can have: its element, the words for it in a name, its visuals and icon
type Variant = { element: ForgeElement; words: string[]; visual?: Visual; icon: SkillIcon };

// The numbers of a skill, all but what a forge fills in itself
type Base = Omit<SkillDef, "id" | "name" | "description" | "icon" | "visual" | "traits">;

export type Archetype = {
    id: string;
    color: GemColor;
    weapons?: WeaponKind[];
    tags: SkillTag[];
    // The last word of its name
    nouns: string[];
    // Its own words, {damage} its share of the weapon's damage
    says: string;
    base: Base;
    variants: Variant[];
};

const MELEE: WeaponKind[] = ["melee"];
const BOW: WeaponKind[] = ["bow"];

// An element's spot animation where a blow lands, for blades and arrows
const STRIKE_IMPACT: Record<ForgeElement, number> = {
    physical: SPOT.dust.impactSpot,
    fire: SPOT.fireBolt.impactSpot,
    cold: SPOT.iceBurst.impactSpot,
    lightning: SPOT.saradominStrike.impactSpot,
};

const arrow = (element: ForgeElement): Visual =>
    element === "physical" ? { sound: 2707 } : { projectile: element === "fire" ? SPOT.dragonArrow.projectile : SPOT.runeArrow.projectile, impactSpot: STRIKE_IMPACT[element], sound: 2707 };

export const ARCHETYPES: Archetype[] = [
    // ---- Red: blades and war ----
    {
        id: "blade",
        color: "red",
        weapons: MELEE,
        tags: ["attack", "melee"],
        nouns: ["Strike", "Edge", "Blow", "Cut"],
        says: "Strikes the enemy in front for {damage}% of your weapon's damage.",
        base: { kind: "strike", damage: 1.35, mana: 4, cooldown: 0, castTime: 1.1, range: 1.6, arc: 70 },
        variants: [
            { element: "physical", words: ["Iron", "Brutal"], visual: { impactSpot: STRIKE_IMPACT.physical, sound: 2564 }, icon: { obj: 1333 } },
            { element: "fire", words: ["Searing", "Molten"], visual: { impactSpot: STRIKE_IMPACT.fire, sound: 2564 }, icon: { obj: 1305 } },
            { element: "cold", words: ["Frost", "Rime"], visual: { impactSpot: STRIKE_IMPACT.cold, sound: 2564 }, icon: { sprite: 325 } },
            { element: "lightning", words: ["Storm", "Holy"], visual: SPOT.saradominStrike, icon: { sprite: 132 } },
        ],
    },
    {
        id: "sweep",
        color: "red",
        weapons: MELEE,
        tags: ["attack", "melee", "area"],
        nouns: ["Sweep", "Reaping", "Cleave"],
        says: "A wide swing that hits everything in front of you for {damage}% of your weapon's damage.",
        base: { kind: "cleave", damage: 1.3, mana: 5, cooldown: 0, castTime: 1.15, seq: SEQ.sweep, range: 2.4, arc: 150 },
        variants: [
            { element: "physical", words: ["Iron", "Savage"], visual: { sound: 2564 }, icon: { obj: 1373 } },
            { element: "fire", words: ["Searing", "Ember"], visual: { impactSpot: STRIKE_IMPACT.fire, sound: 2564 }, icon: { obj: 1305 } },
            { element: "cold", words: ["Frost", "Glacial"], visual: { impactSpot: STRIKE_IMPACT.cold, sound: 2564 }, icon: { sprite: 325 } },
        ],
    },
    {
        id: "quake",
        color: "red",
        weapons: MELEE,
        tags: ["attack", "melee", "area"],
        nouns: ["Quake", "Slam", "Tremor", "Sunder"],
        says: "Smashes the ground, hitting everything around you for {damage}% of your weapon's damage.",
        base: { kind: "slam", damage: 2.5, mana: 12, cooldown: 3, castTime: 1.3, seq: SEQ.smash, range: 3.2, radius: 3.2 },
        variants: [
            { element: "physical", words: ["Iron", "Granite"], visual: SPOT.stomp, icon: { obj: 4153 } },
            { element: "fire", words: ["Molten", "Infernal"], visual: SPOT.zamorakFlames, icon: { sprite: 125 } },
            { element: "lightning", words: ["Storm", "Holy"], visual: SPOT.saradominStrike, icon: { sprite: 131 } },
        ],
    },
    {
        id: "lunge",
        color: "red",
        weapons: MELEE,
        tags: ["attack", "melee", "area", "movement"],
        nouns: ["Leap", "Descent", "Pounce"],
        says: "Leaps to where you aim, up to 8 tiles, and slams down on everything there for {damage}% damage.",
        base: { kind: "leap", damage: 1.45, mana: 14, cooldown: 2.5, castTime: 1.1, seq: SEQ.smash, range: 8, radius: 2.2 },
        variants: [
            { element: "physical", words: ["Iron", "Brutal"], visual: SPOT.stomp, icon: { obj: 1319 } },
            { element: "fire", words: ["Molten", "Comet"], visual: SPOT.zamorakFlames, icon: { obj: 1305 } },
        ],
    },
    {
        id: "hurl",
        color: "red",
        weapons: MELEE,
        tags: ["attack", "projectile"],
        nouns: ["Hammers", "Mauls"],
        says: "Hurls three hammers that spin through every enemy in their way, each for {damage}% of your weapon's damage.",
        base: { kind: "shoot", damage: 0.8, mana: 6, cooldown: 0, castTime: 1.2, seq: SEQ.throw, range: 7, speed: 8, count: 3, arc: 40, pierce: 99 },
        variants: [
            { element: "physical", words: ["Iron", "Blessed"], visual: { projectileObj: 1347, sound: 2564 }, icon: { obj: 1347 } },
            { element: "lightning", words: ["Storm", "Holy"], visual: { projectileObj: 1347, impactSpot: STRIKE_IMPACT.lightning, sound: 2564 }, icon: { sprite: 132 } },
        ],
    },

    // ---- Green: quick blades ----
    {
        id: "flurry",
        color: "green",
        weapons: MELEE,
        tags: ["attack", "melee"],
        nouns: ["Flurry", "Stabs", "Riposte"],
        says: "Three quick stabs at the enemy in front, each for {damage}% of your weapon's damage.",
        base: { kind: "strike", damage: 0.55, hits: 3, mana: 3, cooldown: 0, castTime: 1.05, seq: SEQ.stab, range: 1.4, arc: 70 },
        variants: [
            { element: "physical", words: ["Barbed", "Venom"], visual: { impactSpot: 252, sound: 2564 }, icon: { obj: 1213 } },
            { element: "cold", words: ["Frost", "Rime"], visual: { impactSpot: STRIKE_IMPACT.cold, sound: 2564 }, icon: { obj: 1215 } },
            { element: "lightning", words: ["Spark", "Storm"], visual: { impactSpot: STRIKE_IMPACT.lightning, sound: 2564 }, icon: { sprite: 558 } },
        ],
    },
    {
        id: "knives",
        color: "green",
        weapons: MELEE,
        tags: ["attack", "projectile"],
        nouns: ["Knives", "Fan", "Daggers"],
        says: "Flings eight knives in a ring round you, each for {damage}% of your weapon's damage.",
        base: { kind: "shoot", damage: 0.62, mana: 7, cooldown: 0, castTime: 1.25, seq: SEQ.throw, range: 6.5, speed: 16, count: 8, arc: 360 },
        variants: [
            { element: "physical", words: ["Barbed", "Shadow"], visual: { projectile: 218, sound: 2707 }, icon: { obj: 868 } },
            { element: "fire", words: ["Searing", "Ember"], visual: { projectile: 218, impactSpot: STRIKE_IMPACT.fire, sound: 2707 }, icon: { obj: 868 } },
            { element: "cold", words: ["Frost", "Rime"], visual: { projectile: 218, impactSpot: STRIKE_IMPACT.cold, sound: 2707 }, icon: { obj: 868 } },
        ],
    },

    // ---- Green: bows ----
    {
        id: "arrow",
        color: "green",
        weapons: BOW,
        tags: ["attack", "projectile"],
        nouns: ["Shot", "Arrow", "Shaft"],
        says: "Looses an arrow for {damage}% of your weapon's damage.",
        base: { kind: "shoot", damage: 1.25, mana: 2, cooldown: 0, castTime: 1, range: 13, speed: 18, count: 1 },
        variants: [
            { element: "physical", words: ["Barbed", "Hunter's"], visual: arrow("physical"), icon: { obj: 861 } },
            { element: "fire", words: ["Searing", "Dragon"], visual: arrow("fire"), icon: { obj: 11235 } },
            { element: "cold", words: ["Frost", "Rime"], visual: arrow("cold"), icon: { sprite: 325 } },
            { element: "lightning", words: ["Storm", "Spark"], visual: arrow("lightning"), icon: { sprite: 502 } },
        ],
    },
    {
        id: "volley",
        color: "green",
        weapons: BOW,
        tags: ["attack", "projectile"],
        nouns: ["Volley", "Spread", "Fan"],
        says: "Looses five arrows in a fan, each for {damage}% of your weapon's damage. An enemy is struck by one of them at most.",
        base: { kind: "shoot", damage: 0.9, mana: 5, cooldown: 0, castTime: 1.1, range: 12, speed: 17, count: 5, arc: 50, onePerTarget: true },
        variants: [
            { element: "physical", words: ["Barbed", "Hunter's"], visual: arrow("physical"), icon: { obj: 859 } },
            { element: "fire", words: ["Searing", "Dragon"], visual: arrow("fire"), icon: { obj: 11235 } },
            { element: "cold", words: ["Frost", "Rime"], visual: arrow("cold"), icon: { sprite: 325 } },
        ],
    },
    {
        id: "piercer",
        color: "green",
        weapons: BOW,
        tags: ["attack", "projectile"],
        nouns: ["Lance", "Piercer", "Skewer"],
        says: "A heavy arrow for {damage}% of your weapon's damage that passes through three enemies.",
        base: { kind: "shoot", damage: 1.05, mana: 4, cooldown: 0, castTime: 1.1, range: 14, speed: 22, count: 1, pierce: 3 },
        variants: [
            { element: "physical", words: ["Barbed", "Iron"], visual: arrow("physical"), icon: { obj: 892 } },
            { element: "lightning", words: ["Storm", "Spark"], visual: arrow("lightning"), icon: { sprite: 502 } },
            { element: "cold", words: ["Frost", "Rime"], visual: arrow("cold"), icon: { sprite: 325 } },
        ],
    },
    {
        id: "blast",
        color: "green",
        weapons: BOW,
        tags: ["attack", "projectile", "area"],
        nouns: ["Blast", "Burst", "Charge"],
        says: "An arrow that bursts where it lands, hitting everything near for {damage}% damage.",
        base: { kind: "burst", damage: 2.1, mana: 10, cooldown: 1.1, castTime: 1.2, range: 13, radius: 2.4, speed: 15 },
        variants: [
            { element: "fire", words: ["Searing", "Dragon"], visual: SPOT.dragonArrow, icon: { obj: 11235 } },
            { element: "cold", words: ["Frost", "Rime"], visual: arrow("cold"), icon: { sprite: 326 } },
            { element: "lightning", words: ["Storm", "Thunder"], visual: arrow("lightning"), icon: { sprite: 502 } },
        ],
    },
    {
        id: "deluge",
        color: "green",
        weapons: BOW,
        tags: ["attack", "area"],
        nouns: ["Rain", "Deluge", "Hail"],
        says: "Arrows fall where you aim a moment later, hitting everything there for {damage}% damage.",
        base: { kind: "rain", damage: 2.5, mana: 14, cooldown: 2.5, castTime: 1, range: 12, radius: 3.2, delay: 0.4, shows: 7 },
        variants: [
            { element: "physical", words: ["Barbed", "Hunter's"], visual: SPOT.dragonArrow, icon: { sprite: 504 } },
            { element: "cold", words: ["Frost", "Rime"], visual: SPOT.iceBurst, icon: { sprite: 326 } },
            { element: "fire", words: ["Searing", "Ember"], visual: SPOT.zamorakFlames, icon: { obj: 11235 } },
        ],
    },

    // ---- Blue: spells ----
    {
        id: "bolt",
        color: "blue",
        tags: ["spell", "projectile"],
        nouns: ["Bolt", "Missile", "Lance"],
        says: "Hurls a bolt for {damage}% of your weapon's damage.",
        base: { kind: "shoot", damage: 1.05, mana: 2, cooldown: 0, castTime: 1, range: 13, speed: 12, count: 1 },
        variants: [
            { element: "fire", words: ["Searing", "Flame"], visual: SPOT.fireBolt, icon: { sprite: 32 } },
            { element: "physical", words: ["Shadow", "Void"], visual: SPOT.shadowBolt, icon: { sprite: 53 } },
            { element: "fire", words: ["Blazing", "Infernal"], visual: SPOT.fireBlast, icon: { sprite: 52 } },
        ],
    },
    {
        id: "orb",
        color: "blue",
        tags: ["spell", "projectile", "area"],
        nouns: ["Orb", "Wave", "Comet"],
        says: "A slow orb that bursts on the first enemy it meets, hitting everything near for {damage}% damage.",
        base: { kind: "burst", damage: 1.9, mana: 13, cooldown: 1.2, castTime: 1.25, seq: SEQ.castWave, range: 13, radius: 1.9, speed: 10 },
        variants: [
            { element: "fire", words: ["Searing", "Infernal"], visual: SPOT.fireWave, icon: { sprite: 52 } },
            { element: "fire", words: ["Molten", "Obsidian"], visual: SPOT.jadMagic, icon: { sprite: 52 } },
            { element: "physical", words: ["Shadow", "Void"], visual: { ...SPOT.shadowBolt, impactSpot: SPOT.shadowBarrage.impactSpot }, icon: { sprite: 53 } },
        ],
    },
    {
        id: "nova",
        color: "blue",
        tags: ["spell", "area"],
        nouns: ["Nova", "Pulse", "Burst"],
        says: "A burst of magic round you, hitting everything near for {damage}% damage.",
        base: { kind: "nova", damage: 1.3, mana: 10, cooldown: 2.5, castTime: 1.1, seq: SEQ.castBurst, range: 3.2, radius: 3.2 },
        variants: [
            { element: "cold", words: ["Frost", "Glacial"], visual: SPOT.iceBurst, icon: { sprite: 326 } },
            { element: "physical", words: ["Blood", "Crimson"], visual: SPOT.bloodBurst, icon: { sprite: 336 } },
            { element: "physical", words: ["Shadow", "Void"], visual: SPOT.shadowBarrage, icon: { sprite: 1268 } },
            { element: "lightning", words: ["Storm", "Holy"], visual: SPOT.saradominStrike, icon: { sprite: 131 } },
        ],
    },
    {
        id: "storm",
        color: "blue",
        tags: ["spell", "area"],
        nouns: ["Wrath", "Fall", "Judgement"],
        says: "Magic falls from the sky where you aim, a moment later, for {damage}% damage.",
        base: { kind: "rain", damage: 1.7, mana: 10, cooldown: 0.8, castTime: 1.1, range: 12, radius: 2, delay: 0.2, shows: 2 },
        variants: [
            { element: "lightning", words: ["Storm", "Holy"], visual: SPOT.saradominStrike, icon: { sprite: 61 } },
            { element: "fire", words: ["Infernal", "Zamorakian"], visual: SPOT.zamorakFlames, icon: { sprite: 125 } },
            { element: "cold", words: ["Frost", "Glacial"], visual: SPOT.iceBurst, icon: { sprite: 326 } },
            { element: "physical", words: ["Shadow", "Grave"], visual: SPOT.shadowBarrage, icon: { sprite: 1268 } },
        ],
    },
    {
        id: "arc",
        color: "blue",
        tags: ["spell", "chaining"],
        nouns: ["Arc", "Current", "Spark"],
        says: "Lightning that strikes an enemy for {damage}% damage and arcs on to four more.",
        base: { kind: "arc", damage: 1.1, mana: 9, cooldown: 0, castTime: 1, range: 10, chain: 4 },
        variants: [{ element: "lightning", words: ["Storm", "Armadyl's"], visual: SPOT.blueImpact, icon: { sprite: 558 } }],
    },
];

export const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((a) => [a.id, a]));

// What an element adds: its tag, its own chance on a hit, and its words for that
const ELEMENTS: Record<ForgeElement, { add: Partial<Pick<SkillDef, "ignite" | "freezeChance" | "shock">>; more: number; says: string }> = {
    // Plain force hits a little harder for having nothing else
    physical: { add: {}, more: 1.08, says: "" },
    fire: { add: { ignite: 0.2 }, more: 1, says: " It has a 20% chance to ignite." },
    cold: { add: { freezeChance: 0.12 }, more: 1, says: " It has a 12% chance to freeze." },
    lightning: { add: { shock: 0.25 }, more: 1, says: " It has a 25% chance to shock." },
};

// ---- Traits ----

export type TraitId =
    | "echo"
    | "volatile"
    | "thunder"
    | "surging"
    | "frenzy"
    | "splitting"
    | "returning"
    | "smoulder"
    | "vortex"
    | "numbing"
    | "cascade"
    | "grave"
    | "warding"
    | "bloodthirst";

// A trait's numbers, as a forged skill has them
export type SkillTraits = Partial<Record<TraitId, number>>;

export type TraitDef = {
    id: TraitId;
    // Before the gem's name, if it's its first trait, and after "of", if it's its second
    adjective: string;
    noun: string;
    // The share of the skill's damage it costs
    cost: number;
    // The skills it's for
    kinds: SkillKind[];
    // Its number, from a roll of 0 to 1
    range: [number, number];
    // Whether its number's a count, a whole one
    whole?: boolean;
    // What it does, in a tooltip's words
    line: (v: number) => string;
};

const HITTING: SkillKind[] = ["strike", "cleave", "slam", "nova", "shoot", "burst", "rain", "leap", "arc"];
const AREA: SkillKind[] = ["slam", "nova", "burst", "rain", "leap"];
const pct = (v: number) => Math.round(v * 100);

// How often a trait's lightning can fall, and what it and a kill's blast hit for, as a share of a hit
export const THUNDER_SHARE = 0.8;
export const THUNDER_EVERY = 0.25;
export const ECHO_SECONDS = 0.4;
export const SURGE_EVERY = 4;
export const STACKS_MOST = 5;
export const FRENZY_SECONDS = 2.5;
export const WARD_SECONDS = 3;
export const SMOULDER_SECONDS = 3;
export const NUMB_SECONDS = 2;
export const RISEN_SECONDS = 8;
export const RISEN_MOST = 3;
export const RISEN_SHARE = 0.6;
export const BLOODTHIRST_SECONDS = 3;
export const SPLIT_SHARE = 0.5;
export const VOLATILE_RADIUS = 2.2;

export const TRAITS: TraitDef[] = [
    {
        id: "echo",
        adjective: "Echoing",
        noun: "Echoes",
        cost: 0.2,
        kinds: ["strike", "cleave", "slam", "nova", "shoot", "burst", "rain", "arc"],
        range: [0.4, 0.65],
        line: (v) => `Echoes ${ECHO_SECONDS} seconds later for ${pct(v)}% of its damage`,
    },
    {
        id: "volatile",
        adjective: "Volatile",
        noun: "Ruin",
        cost: 0.1,
        kinds: HITTING,
        range: [0.3, 0.6],
        line: (v) => `Enemies it kills explode, hitting those near for ${pct(v)}% of a hit`,
    },
    {
        id: "thunder",
        adjective: "Thundering",
        noun: "Thunder",
        cost: 0.1,
        kinds: HITTING,
        range: [0.12, 0.25],
        line: (v) => `${pct(v)}% chance on a hit to call lightning down for ${pct(THUNDER_SHARE)}% of a hit`,
    },
    {
        id: "surging",
        adjective: "Surging",
        noun: "Surges",
        cost: 0.08,
        kinds: HITTING,
        range: [0.6, 1.2],
        line: (v) => `Every ${SURGE_EVERY}th use is a critical strike, with ${pct(v)}% more damage`,
    },
    {
        id: "frenzy",
        adjective: "Frenzied",
        noun: "Frenzy",
        cost: 0.08,
        kinds: HITTING,
        range: [0.04, 0.08],
        line: (v) => `Its hits give Frenzy: ${pct(v)}% more attack speed each, up to ${STACKS_MOST}, for ${FRENZY_SECONDS} seconds`,
    },
    {
        id: "splitting",
        adjective: "Splitting",
        noun: "Splinters",
        cost: 0.12,
        kinds: ["shoot"],
        range: [2, 3],
        whole: true,
        line: (v) => `Its projectiles split into ${v} on the first enemy they hit, each for ${pct(SPLIT_SHARE)}% of the damage`,
    },
    {
        id: "returning",
        adjective: "Returning",
        noun: "Return",
        cost: 0.15,
        kinds: ["shoot"],
        range: [1, 1],
        whole: true,
        line: () => "Its projectiles pierce every enemy, and fly back to you at the end of their flight",
    },
    {
        id: "smoulder",
        adjective: "Smouldering",
        noun: "Embers",
        cost: 0.2,
        kinds: AREA,
        range: [0.3, 0.55],
        line: (v) => `The ground where it lands burns for ${SMOULDER_SECONDS} seconds: ${pct(v)}% of a hit a second to what stands in it`,
    },
    {
        id: "vortex",
        adjective: "Whirling",
        noun: "the Vortex",
        cost: 0.06,
        kinds: AREA,
        range: [0.8, 1.5],
        line: (v) => {
            const tiles = Math.round(v * 10) / 10;
            return `Draws enemies near up to ${tiles} ${tiles === 1 ? "tile" : "tiles"} in to where it lands`;
        },
    },
    {
        id: "numbing",
        adjective: "Numbing",
        noun: "Winter",
        cost: 0.05,
        kinds: HITTING,
        range: [0.2, 0.4],
        line: (v) => `Its hits slow enemies by ${pct(v)}% for ${NUMB_SECONDS} seconds`,
    },
    {
        id: "cascade",
        adjective: "Cascading",
        noun: "Cascades",
        cost: 0.15,
        kinds: ["rain"],
        range: [2, 3],
        whole: true,
        line: (v) => `Falls ${v} more times, each further on the way you aimed`,
    },
    {
        id: "grave",
        adjective: "Gravebound",
        noun: "the Grave",
        cost: 0.08,
        kinds: HITTING,
        range: [0.1, 0.25],
        line: (v) =>
            `${pct(v)}% chance that what it kills rises as a skeleton for you, for ${RISEN_SECONDS} seconds (${RISEN_MOST} at most), its blows ${pct(RISEN_SHARE)}% of a hit`,
    },
    {
        id: "warding",
        adjective: "Warding",
        noun: "the Bulwark",
        cost: 0.05,
        kinds: ["strike", "cleave", "slam", "leap", "nova"],
        range: [0.02, 0.04],
        line: (v) => `Its hits give a Ward: ${pct(v)}% less damage taken each, up to ${STACKS_MOST}, for ${WARD_SECONDS} seconds`,
    },
    {
        id: "bloodthirst",
        adjective: "Bloodthirsty",
        noun: "the Hunt",
        cost: 0.05,
        kinds: HITTING,
        range: [0.15, 0.3],
        line: (v) => `Its kills give ${pct(v)}% more movement speed and ${pct(v / 2)}% more attack speed for ${BLOODTHIRST_SECONDS} seconds`,
    },
];

export const TRAIT_BY_ID = new Map(TRAITS.map((t) => [t.id, t]));

// The traits' order in a tooltip, the order they're listed in
export function traitLines(traits: SkillTraits | undefined): string[] {
    if (!traits) {
        return [];
    }
    return TRAITS.filter((t) => traits[t.id] !== undefined).map((t) => t.line(traits[t.id]!));
}

export function traitValue(def: TraitDef, q: number): number {
    const v = def.range[0] + (def.range[1] - def.range[0]) * Math.max(0, Math.min(1, q));
    return def.whole ? Math.round(v) : Math.round(v * 1000) / 1000;
}

// ---- A forged gem's recipe ----

// Everything a forged gem is, kept on its item: the gem is made again from it whenever it's needed
export type ForgeRecipe = {
    arch: string;
    // Its look, of the archetype's
    variant: number;
    // Which of the look's words and the archetype's nouns its name has
    word: number;
    noun: number;
    // Its damage's roll, 0 to 1: 90% to 115% of the archetype's
    roll: number;
    // The hero's level its first gem level needs
    level: number;
    traits: { id: TraitId; q: number }[];
};

// How many traits a forged gem has: one most often, three now and then
export const TRAIT_COUNT_WEIGHTS = [60, 32, 8];
export const FORGED_ROLL: [number, number] = [0.9, 1.15];

// The traits an archetype can have
export function traitsFor(arch: Archetype): TraitDef[] {
    return TRAITS.filter((t) => t.kinds.includes(arch.base.kind));
}

// A recipe's damage, all told: the roll's, the element's, less what each trait costs
export function forgedDamage(arch: Archetype, recipe: ForgeRecipe): number {
    const variant = arch.variants[recipe.variant];
    let mult = FORGED_ROLL[0] + (FORGED_ROLL[1] - FORGED_ROLL[0]) * recipe.roll;
    mult *= ELEMENTS[variant.element].more;
    for (const t of recipe.traits) {
        mult *= 1 - TRAIT_BY_ID.get(t.id)!.cost;
    }
    return arch.base.damage * mult;
}

export function forgedName(arch: Archetype, recipe: ForgeRecipe): string {
    const variant = arch.variants[recipe.variant];
    const word = variant.words[recipe.word % variant.words.length];
    const noun = arch.nouns[recipe.noun % arch.nouns.length];
    const [first, second] = recipe.traits.map((t) => TRAIT_BY_ID.get(t.id)!);
    return `${first ? first.adjective + " " : ""}${word} ${noun}${second ? " of " + second.noun : ""}`;
}

// A stable short id for a recipe, so the same recipe is always the same gem
function hashKey(key: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
}

const FORGED_OBJ: Record<GemColor, number> = { red: 1603, green: 1605, blue: 1607 };
const made = new Map<string, GemDef>();

// The gem a recipe makes, made once
export function forgedGem(recipe: ForgeRecipe): GemDef {
    const key = JSON.stringify(recipe);
    const known = made.get(key);
    if (known) {
        return known;
    }
    const arch = ARCHETYPE_BY_ID.get(recipe.arch)!;
    const variant = arch.variants[recipe.variant];
    const element = ELEMENTS[variant.element];
    const traits: SkillTraits = {};
    for (const t of recipe.traits) {
        traits[t.id] = traitValue(TRAIT_BY_ID.get(t.id)!, t.q);
    }
    const skill: SkillDef = {
        ...arch.base,
        ...element.add,
        id: `forged_${hashKey(key)}`,
        name: forgedName(arch, recipe),
        description: arch.says + element.says,
        damage: Math.round(forgedDamage(arch, recipe) * 1000) / 1000,
        visual: variant.visual,
        icon: variant.icon,
        traits,
    };
    const tags = [...arch.tags, variant.element as SkillTag];
    const def: GemDef = { id: skill.id, name: skill.name, color: arch.color, level: recipe.level, tags, objId: FORGED_OBJ[arch.color], skill, weapons: arch.weapons, forged: true };
    made.set(key, def);
    return def;
}

// What can be rolled: a random recipe of one of these archetypes, for an item of this level
export function rollRecipe(rng: { next(): number; int(n: number): number; weightedIndex(w: readonly number[]): number }, archs: Archetype[], weights: number[], level: number): ForgeRecipe {
    const arch = archs[Math.max(0, rng.weightedIndex(weights))];
    const variant = rng.int(arch.variants.length);
    const count = 1 + Math.max(0, rng.weightedIndex(TRAIT_COUNT_WEIGHTS));
    const pool = traitsFor(arch);
    const traits: ForgeRecipe["traits"] = [];
    while (traits.length < count && traits.length < pool.length) {
        const left = pool.filter((t) => !traits.some((x) => x.id === t.id));
        const t = left[rng.int(left.length)];
        traits.push({ id: t.id, q: Math.round(rng.next() * 1000) / 1000 });
    }
    return {
        arch: arch.id,
        variant,
        word: rng.int(4),
        noun: rng.int(4),
        roll: Math.round(rng.next() * 1000) / 1000,
        level: Math.max(1, level),
        traits,
    };
}

// A recipe from a save, if it's still one the game can make
export function readRecipe(raw: unknown): ForgeRecipe | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }
    const r = raw as ForgeRecipe;
    const arch = ARCHETYPE_BY_ID.get(r.arch);
    const num = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number(v) || 0));
    if (!arch || !Array.isArray(r.traits)) {
        return undefined;
    }
    const variant = Math.floor(num(r.variant, 0, 99));
    if (variant >= arch.variants.length) {
        return undefined;
    }
    const allowed = traitsFor(arch);
    const traits: ForgeRecipe["traits"] = [];
    for (const t of r.traits) {
        const def = allowed.find((a) => a.id === t?.id);
        if (def && !traits.some((x) => x.id === def.id)) {
            traits.push({ id: def.id, q: num(t.q, 0, 1) });
        }
    }
    if (traits.length === 0) {
        return undefined;
    }
    return {
        arch: arch.id,
        variant,
        word: Math.floor(num(r.word, 0, 99)),
        noun: Math.floor(num(r.noun, 0, 99)),
        roll: num(r.roll, 0, 1),
        level: Math.floor(num(r.level, 1, 99)),
        traits,
    };
}

// Every look a forged skill can have, for the client to bake its animations and spot animations
// (a trait's own are in SPOT, which is baked whole)
export function forgeSkillDefs(): SkillDef[] {
    return ARCHETYPES.flatMap((arch) =>
        arch.variants.map((v, i) => ({ ...arch.base, id: `forge_${arch.id}_${i}`, name: arch.nouns[0], description: arch.says, visual: v.visual, icon: v.icon })),
    );
}
