// The runes, as plain data: what falls in the rifts besides gear and gold, and what each does to an
// item it's used on (sim/runes.ts). They're kept in the hero's rune pouch, not the pack, and picked
// up by walking over them. Object ids are the cache's (riftscaper/scripts/find-objs.ts).

export type RuneId = "air" | "mind" | "nature" | "chaos" | "cosmic" | "death" | "soul" | "water" | "earth" | "fire" | "body" | "law" | "blood" | "astral" | "wrath" | "sunfire";

export type RuneDef = {
    id: RuneId;
    name: string;
    objId: number;
    // Its name on the ground and in the pouch
    color: string;
    // What it does, for its tooltip
    blurb: string;
    // How often it drops against the others
    weight: number;
    // The lowest area level it drops at
    level: number;
    // How many fall together, at most
    stack: number;
    // One of the ladder's high runes: no use on an item of its own, but spent in runewords
    // (runewords.ts) and the transmuting circle (circle.ts), both at Aubury's
    high?: boolean;
};

const HIGH_BLURB = "A high rune, found only on the ladder. Aubury inscribes runewords with it, and it goes into the transmuting circle.";

export const RUNES: Record<RuneId, RuneDef> = {
    air: {
        id: "air",
        name: "Air rune",
        objId: 556,
        color: "#d8e4f0",
        blurb: "Makes a normal item magic, with one or two affixes.",
        weight: 46,
        level: 1,
        stack: 3,
    },
    mind: {
        id: "mind",
        name: "Mind rune",
        objId: 558,
        color: "#f0a860",
        blurb: "Rolls a magic item's affixes again.",
        weight: 30,
        level: 1,
        stack: 2,
    },
    nature: {
        id: "nature",
        name: "Nature rune",
        objId: 561,
        color: "#70d860",
        blurb: "Makes a normal item rare, with three to six affixes.",
        weight: 7,
        level: 1,
        stack: 1,
    },
    chaos: {
        id: "chaos",
        name: "Chaos rune",
        objId: 562,
        color: "#ffb040",
        blurb: "Rolls a rare item again: new affixes and a new name.",
        weight: 7,
        level: 5,
        stack: 1,
    },
    death: {
        id: "death",
        name: "Death rune",
        objId: 560,
        color: "#c8c8c8",
        blurb: "Takes one affix, at random, off a magic or rare item.",
        weight: 4,
        level: 5,
        stack: 1,
    },
    cosmic: {
        id: "cosmic",
        name: "Cosmic rune",
        objId: 564,
        color: "#f0f070",
        blurb: "Adds an affix to a magic or rare item that has room for one.",
        weight: 2.5,
        level: 9,
        stack: 1,
    },
    soul: {
        id: "soul",
        name: "Soul rune",
        objId: 566,
        color: "#d090ff",
        blurb: "Rolls the numbers of a magic or rare item's affixes again, each within its tier, or a unique's within its ranges.",
        weight: 1.5,
        level: 13,
        stack: 1,
    },
    // The ladder's high runes, as Diablo II's are its Hell's: from its first depth (area level 65)
    // on, the rarer ones deeper, every few depths another
    water: { id: "water", name: "Water rune", objId: 555, color: "#5aa0ff", blurb: HIGH_BLURB, weight: 3, level: 65, stack: 1, high: true },
    earth: { id: "earth", name: "Earth rune", objId: 557, color: "#b08850", blurb: HIGH_BLURB, weight: 2.6, level: 65, stack: 1, high: true },
    fire: { id: "fire", name: "Fire rune", objId: 554, color: "#ff6030", blurb: HIGH_BLURB, weight: 2.2, level: 65, stack: 1, high: true },
    body: { id: "body", name: "Body rune", objId: 559, color: "#a0b0ff", blurb: HIGH_BLURB, weight: 1.6, level: 69, stack: 1, high: true },
    law: { id: "law", name: "Law rune", objId: 563, color: "#7090ff", blurb: HIGH_BLURB, weight: 1.1, level: 73, stack: 1, high: true },
    blood: { id: "blood", name: "Blood rune", objId: 565, color: "#e03030", blurb: HIGH_BLURB, weight: 0.7, level: 77, stack: 1, high: true },
    astral: { id: "astral", name: "Astral rune", objId: 9075, color: "#e0d8ff", blurb: HIGH_BLURB, weight: 0.45, level: 81, stack: 1, high: true },
    wrath: { id: "wrath", name: "Wrath rune", objId: 21880, color: "#ff4060", blurb: HIGH_BLURB, weight: 0.25, level: 85, stack: 1, high: true },
    sunfire: { id: "sunfire", name: "Sunfire rune", objId: 28929, color: "#ffc040", blurb: HIGH_BLURB, weight: 0.12, level: 89, stack: 1, high: true },
};

// In the order the pouch shows them: the commonest first, the high runes after. It's the circle's
// order too: three of one make one of the next (circle.ts).
export const RUNE_IDS: RuneId[] = ["air", "mind", "nature", "chaos", "death", "cosmic", "soul", "water", "earth", "fire", "body", "law", "blood", "astral", "wrath", "sunfire"];

// From the Law rune up, a high rune's rare enough to land with a pillar of light and a sound of its
// own (Client.dropGlory), as Diablo II's high runes are
export const RUNE_PILLAR_FROM: RuneId = "law";

export function runeShines(id: RuneId): boolean {
    return RUNE_IDS.indexOf(id) >= RUNE_IDS.indexOf(RUNE_PILLAR_FROM);
}

export function runeName(id: RuneId, count: number): string {
    return count === 1 ? RUNES[id].name : `${count} ${RUNES[id].name}s`;
}

// The runes Aubury keeps behind his counter, and what one costs at the hero's level
export const SHOP_RUNES: RuneId[] = ["air", "mind"];

export function runePrice(id: RuneId, level: number): number {
    const air = Math.round(10 + level * level * 0.3);
    return id === "air" ? air : air * 2;
}

// A magic item has at most one of each kind of affix; a rare, three
export const MAX_AFFIXES = { magic: 1, rare: 3 };
