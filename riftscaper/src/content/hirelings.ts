// Hirelings: Diablo II's mercenaries, hired from the Mercenary Captain in Runefall's square (town.ts).
// One fights beside the hero at a time, grows with their level, comes armed with the best plain
// weapon of its kind its level allows, wears three of their cast-offs besides (a weapon of its kind
// in place of its own, a helm and a body: their numbers count, its looks stay its own), and lives
// under the hero's prayers. Monsters go for it when it's nearer them than the hero; if it falls it
// stays fallen till the Captain raises it, for gold. Each kind has a perk of its own, as each act's
// mercenaries have theirs. The NPCs are the cache's (find-npcs.ts, npc-info.ts), the animations the
// cache's for them (seq-info.ts), looked at in the game; none is a rift's monster, so a hireling's
// never taken for one.
import type { WeaponKind } from "./items";
import type { Seqs } from "./monsters";
import { SPOT, Visual } from "./visuals";

export type HirelingKind = "barbarian" | "archer" | "battleMage" | "whiteKnight";

// What it's given to wear: a weapon of its kind, a helm and a body
export type HirelingSlot = "weapon" | "head" | "body";
export const HIRELING_SLOTS: HirelingSlot[] = ["weapon", "head", "body"];

export type HirelingDef = {
    kind: HirelingKind;
    name: string;
    // What it's called before its name, and what it does, in the Captain's words
    title: string;
    text: string;
    npcId: number;
    seqs: Seqs;
    weapon: WeaponKind;
    // Its life and armour at level 1 and a level after
    life: [number, number];
    armour: [number, number];
    // How far it strikes from, tiles, and its shot's look and pace for one that shoots
    reach: number;
    shot?: { visual: Visual; speed: number; pierce?: number; splash?: number };
    // Its pace, tiles a second
    speed: number;
    sounds: { attack: number; death: number };
    // Its own: a stun on every so many blows, or more armour for the hero while it stands
    bash?: { every: number; seconds: number };
    defiance?: number;
};

// Names for each kind, drawn when one's hired
export const HIRELING_NAMES: Record<HirelingKind, string[]> = {
    barbarian: ["Halvar", "Sigrun", "Eirik", "Ragna", "Torvi", "Ulfar", "Brenna", "Gunnar"],
    archer: ["Ailsa", "Corin", "Maera", "Tamsin", "Elowen", "Jory", "Kestra", "Briony"],
    battleMage: ["Aldric", "Isolde", "Merrin", "Ysolde", "Cassian", "Orla", "Thane", "Lirien"],
    whiteKnight: ["Sir Aldous", "Dame Elspeth", "Sir Bevan", "Dame Rowena", "Sir Caddoc", "Dame Ilsa", "Sir Edric", "Dame Nessa"],
};

const HUMAN_SOUNDS = { attack: 2564, death: 512 };

export const HIRELINGS: Record<HirelingKind, HirelingDef> = {
    // Diablo II's barbarian of Harrogath: the most life, and a greataxe that stuns
    barbarian: {
        kind: "barbarian",
        name: "Barbarian",
        title: "Barbarian",
        text: "Fights up close with the most life of any, and every third blow stuns",
        npcId: 3055,
        seqs: { idle: 2065, walk: 2064, attack: 2067, death: 836 },
        weapon: "melee",
        life: [140, 26],
        armour: [12, 9],
        reach: 1.2,
        speed: 5.2,
        sounds: HUMAN_SOUNDS,
        bash: { every: 3, seconds: 1 },
    },
    // The rogue scout: a bow from afar, arrows that go through one
    archer: {
        kind: "archer",
        name: "Archer",
        title: "Archer",
        text: "Shoots from afar, arrows that go through the first they strike",
        npcId: 4096,
        seqs: { idle: 808, walk: 819, attack: 426, death: 836 },
        weapon: "bow",
        life: [90, 17],
        armour: [6, 5],
        reach: 7,
        shot: { visual: SPOT.mithrilArrow, speed: 16, pierce: 1 },
        speed: 5.2,
        sounds: { attack: 2707, death: 512 },
    },
    // The iron wolf: fire bolts that burst on what they strike
    battleMage: {
        kind: "battleMage",
        name: "Battle mage",
        title: "Battle mage",
        text: "Casts fire bolts from afar that burst on what they strike",
        npcId: 1611,
        seqs: { idle: 808, walk: 819, attack: 711, death: 836 },
        weapon: "staff",
        life: [80, 15],
        armour: [5, 4],
        reach: 6.5,
        shot: { visual: SPOT.fireBolt, speed: 11, splash: 1.4 },
        speed: 5,
        sounds: { attack: 157, death: 512 },
    },
    // The desert guard, Saradomin's: Defiance, more armour for the hero while they stand
    whiteKnight: {
        kind: "whiteKnight",
        name: "White Knight",
        title: "White Knight",
        text: "Holds the line up close, and while they stand you have 25% more armour",
        npcId: 1798,
        seqs: { idle: 2561, walk: 2562, attack: 390, death: 836 },
        weapon: "melee",
        life: [120, 22],
        armour: [16, 12],
        reach: 1.2,
        speed: 5.2,
        sounds: HUMAN_SOUNDS,
        defiance: 0.25,
    },
};

export const HIRELING_KINDS = Object.keys(HIRELINGS) as HirelingKind[];

export const HIRELING = {
    // The Captain, at the barracks by the south gate, and what he's called
    captain: {
        npcId: 4635,
        name: "Mercenary Captain",
        title: "Has swords for hire",
        greeting: "Need a hand in the rifts? Mine are for hire, and they're worth every coin.",
        raise: "Fallen, are they? Bring the coin and I'll have them back on their feet.",
    },
    // Gold to hire one, and to raise a fallen one, a level of the hero's
    hirePerLevel: 120,
    raisePerLevel: 60,
    // Its blow's more with its level, a share a level: modest, so its weapon's what matters most, as
    // a Diablo II mercenary's does (balance.ts --curve has it a fifth to two fifths of a typical
    // hero's, more early on, given their cast-offs)
    damagePerLevel: 0.025,
    // Life back a second, a share of its most, and its blows' time, seconds, before its weapon's pace
    regen: 0.01,
    attackSeconds: 1.4,
    hitAt: 0.45,
    // How far from the hero it goes for something, and is up beside them again
    leash: 10,
    recall: 16,
    radius: 0.45,
    // A monster goes for it over the hero when it's this much nearer it
    nearer: 0.75,
};
