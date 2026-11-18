// Diablo II's runewords, inscribed rather than socketed, since a socket here holds a gem: a normal
// item with exactly a word's number of sockets is taken to Aubury's, and the word's runes are
// spent on it in their order (sim/runewords.ts). It becomes the word: its stats on top of its
// base's, and often a power, a chance to cast or levels on skill gems, as a unique's are, and it
// keeps its sockets for gems. The chase is Diablo II's: the right base with the right sockets (the
// gem trader recuts them for gold) and the rare runes, most of them the ladder's high ones. The
// words are the game's own, of OSRS's gods and places, and every one is listed at Aubury's.
import type { Proc, Slot, StatLine, UniquePower, WeaponKind } from "./items";
import type { KeystoneId } from "./passives";
import type { RuneId } from "./runes";

export type RunewordDef = {
    id: string;
    name: string;
    // Spent in this order; as many sockets as runes
    runes: RuneId[];
    // What it can be inscribed on: these slots, and for a weapon, these kinds
    slots: Slot[];
    kinds?: WeaponKind[];
    // The least level the item needs to be, as Diablo II's words need theirs
    level: number;
    stats: StatLine[];
    power?: UniquePower;
    keystone?: KeystoneId;
    procs?: Proc[];
    lore: string;
};

const ARMOUR: Slot[] = ["head", "body", "legs", "offhand"];

export const RUNEWORDS: RunewordDef[] = [
    {
        id: "mistwalker",
        name: "Mistwalker",
        runes: ["water", "air"],
        slots: ["feet"],
        level: 55,
        stats: [
            { stat: "moveSpeedPct", value: 20 },
            { stat: "evade", value: 6 },
            { stat: "life", value: 30 },
        ],
        lore: "Water and air make mist, and mist goes where it likes.",
    },
    {
        id: "steadfast",
        name: "Steadfast",
        runes: ["earth", "water"],
        slots: ARMOUR,
        level: 55,
        stats: [
            { stat: "armourPct", value: 40 },
            { stat: "life", value: 50 },
            { stat: "lessDamageTaken", value: 4 },
        ],
        lore: "Guthix's earth and water, which outlast everything.",
    },
    {
        id: "kindling",
        name: "Kindling",
        runes: ["fire", "chaos"],
        slots: ["weapon"],
        level: 55,
        stats: [
            { stat: "damagePct", value: 60 },
            { stat: "elementalDamagePct", value: 25 },
            { stat: "igniteChance", value: 20 },
        ],
        procs: [{ when: "strike", chance: 0.12, gem: "firebolt", level: 18 }],
        lore: "A spark is all chaos ever needed.",
    },
    {
        id: "kharidian_sands",
        name: "Kharidian Sands",
        runes: ["earth", "fire"],
        slots: ["hands"],
        level: 58,
        stats: [
            { stat: "attackSpeedPct", value: 12 },
            { stat: "castSpeedPct", value: 12 },
            { stat: "critChance", value: 2 },
        ],
        lore: "The desert's heat, and its hurry.",
    },
    {
        id: "guthix_balance",
        name: "Guthix's Balance",
        runes: ["water", "earth", "fire"],
        slots: ["body"],
        level: 60,
        stats: [
            { stat: "skillLevels", value: 1 },
            { stat: "life", value: 60 },
            { stat: "mana", value: 60 },
            { stat: "lifeRegen", value: 8 },
        ],
        lore: "Three of the four, and the fourth is you.",
    },
    {
        id: "saradomin_light",
        name: "Saradomin's Light",
        runes: ["body", "law", "air"],
        slots: ["offhand", "body"],
        level: 60,
        stats: [
            { stat: "armourPct", value: 50 },
            { stat: "life", value: 70 },
        ],
        procs: [{ when: "struck", chance: 0.12, gem: "sanctuary", level: 15 }],
        lore: "Strike its bearer, and the light answers.",
    },
    {
        id: "law_of_the_land",
        name: "Law of the Land",
        runes: ["law", "earth", "nature"],
        slots: ["weapon"],
        level: 62,
        stats: [
            { stat: "damagePct", value: 90 },
            { stat: "critChance", value: 3 },
            { stat: "critMulti", value: 40 },
        ],
        lore: "What grows, and what holds it, and what says where.",
    },
    {
        id: "arceuus_pact",
        name: "Arceuus's Pact",
        runes: ["death", "soul", "body"],
        slots: ["weapon", "offhand"],
        kinds: ["staff"],
        level: 62,
        stats: [
            { stat: "minionSkillLevels", value: 2 },
            { stat: "thrallDamagePct", value: 40 },
            { stat: "extraThralls", value: 1 },
        ],
        lore: "Written in the Dark Altar's ink: a body for a soul, and a soul for the house.",
    },
    {
        id: "bloodmoon",
        name: "Bloodmoon",
        runes: ["blood", "body", "fire"],
        slots: ["weapon"],
        kinds: ["melee"],
        level: 66,
        stats: [
            { stat: "damagePct", value: 110 },
            { stat: "lifeLeech", value: 3 },
        ],
        procs: [{ when: "kill", chance: 0.15, gem: "blood_barrage", level: 20 }],
        lore: "Morytania's moon, and what it asks for.",
    },
    {
        id: "zamorak_spite",
        name: "Zamorak's Spite",
        runes: ["fire", "body", "law", "death"],
        slots: ["weapon"],
        level: 66,
        stats: [
            { stat: "damagePct", value: 120 },
            { stat: "attackSpeedPct", value: 15 },
            { stat: "burnDamagePct", value: 50 },
        ],
        procs: [{ when: "kill", chance: 0.15, gem: "slam", level: 20 }],
        lore: "Every law, broken in the order it was written.",
    },
    {
        id: "armadyl_gale",
        name: "Armadyl's Gale",
        runes: ["air", "astral", "water"],
        slots: ["weapon", "hands"],
        kinds: ["bow"],
        level: 68,
        stats: [
            { stat: "projectileSkillLevels", value: 1 },
            { stat: "attackSpeedPct", value: 20 },
            { stat: "projectileDamagePct", value: 40 },
        ],
        procs: [{ when: "strike", chance: 0.08, gem: "storm_of_armadyl", level: 20 }],
        lore: "The wind off the god's own wings.",
    },
    {
        id: "astral_projection",
        name: "Astral Projection",
        runes: ["astral", "law", "cosmic"],
        slots: ["weapon", "head"],
        kinds: ["staff"],
        level: 70,
        stats: [
            { stat: "spellSkillLevels", value: 2 },
            { stat: "castSpeedPct", value: 20 },
            { stat: "mana", value: 80 },
            { stat: "manaRegen", value: 6 },
        ],
        lore: "Lunar magic: the body stays, and the mind goes on ahead.",
    },
    {
        id: "wrath_of_the_wilderness",
        name: "Wrath of the Wilderness",
        runes: ["wrath", "blood", "death"],
        slots: ["weapon"],
        level: 78,
        stats: [
            { stat: "skillLevels", value: 1 },
            { stat: "damagePct", value: 150 },
            { stat: "lifeLeech", value: 2 },
        ],
        procs: [{ when: "strike", chance: 0.1, gem: "firewave", level: 24 }],
        lore: "Past the ditch there's no law but this.",
    },
    {
        id: "ralos_dawn",
        name: "Ralos's Dawn",
        runes: ["sunfire", "wrath", "astral", "blood"],
        slots: ["body"],
        level: 85,
        stats: [
            { stat: "skillLevels", value: 2 },
            { stat: "life", value: 120 },
            { stat: "elementalDamagePct", value: 40 },
        ],
        procs: [{ when: "struck", chance: 0.15, gem: "firewave", level: 25 }],
        lore: "Varlamore's sun, which rises on everything, and burns what won't kneel.",
    },
];

export const RUNEWORD_BY_ID = new Map(RUNEWORDS.map((w) => [w.id, w]));
