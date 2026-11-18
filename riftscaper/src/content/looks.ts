// What a hero can look like: the body, face and colours OSRS's own character creation offers
// (identity kits and body colours, engine/rs/model/player/PlayerModelLoader.ts), under whatever
// they wear. Kit ids are the cache's, listed by body part with riftscaper/scripts/kit-info.ts.
import { BODY_COLORS } from "../../../engine/rs/model/player/PlayerModelLoader";
import type { Rng } from "../../../engine/core/Rng";
import type { ClassId } from "./items";

export type Look = {
    // Body type B (the cache's female body) or A
    female: boolean;
    // Identity kits by body part: hair, jaw, torso, arms, hands, legs, feet
    kits: number[];
    // Body colours, each an index into its row of BODY_COLORS: hair, torso, legs, feet, skin
    colors: number[];
    // The helm isn't drawn, so the face is
    hideHelm: boolean;
};

export type BodyPart = "hair" | "jaw" | "torso" | "arms" | "hands" | "legs" | "feet";
export const BODY_PARTS: BodyPart[] = ["hair", "jaw", "torso", "arms", "hands", "legs", "feet"];

export type ColorPart = "hair" | "torso" | "legs" | "feet" | "skin";
export const COLOR_PARTS: ColorPart[] = ["hair", "torso", "legs", "feet", "skin"];

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// The kits each body part can be, for each body: hair and jaw are the face, the rest what's worn
// under armour. The hair's models stop above the chin, so a face always has a jaw kit: the first
// is the chin alone, no beard. The two bodies' beards run in the same order.
export const KITS: Record<"a" | "b", Record<BodyPart, number[]>> = {
    a: {
        hair: [...range(0, 9), ...range(129, 134), ...range(144, 151), ...range(201, 247)],
        jaw: [14, ...range(10, 13), ...range(15, 17), ...range(111, 117)],
        torso: [...range(18, 25), ...range(105, 110), ...range(254, 259)],
        arms: [...range(26, 32), ...range(84, 88), ...range(260, 264)],
        hands: [33, 34],
        legs: [...range(36, 41), ...range(100, 104), ...range(281, 291)],
        feet: [42, 43],
    },
    b: {
        hair: [...range(45, 55), ...range(118, 128), 141, 143, ...range(154, 200)],
        jaw: [296, ...range(292, 295), ...range(297, 306)],
        torso: [...range(56, 60), ...range(89, 94), ...range(265, 273)],
        arms: [...range(61, 66), ...range(95, 99), ...range(248, 253)],
        hands: [67, 68],
        legs: [...range(70, 78), ...range(135, 140), ...range(274, 280)],
        feet: [79, 80],
    },
};

export function kitsFor(female: boolean): Record<BodyPart, number[]> {
    return female ? KITS.b : KITS.a;
}

// Kits that are another's model exactly, offered once: a look saved with one has the other
const SAME_KIT: Record<number, number> = { 153: 117, 142: 141, 152: 141 };

// How many choices each colour has (the first keeps the model's own)
export const COLOR_COUNT: Record<ColorPart, number> = {
    hair: BODY_COLORS[0].length,
    torso: BODY_COLORS[1].length,
    legs: BODY_COLORS[2].length,
    feet: BODY_COLORS[3].length,
    skin: BODY_COLORS[4].length,
};

// A colour's 16-bit HSL, as the cache has it, for its swatch
export function colorHsl(part: ColorPart, index: number): number {
    return BODY_COLORS[COLOR_PARTS.indexOf(part)][index] & 0xffff;
}

// The skins past these are the otherworldly ones (green, black, white, blue, purple)
export const NATURAL_SKINS = 8;

// A body's own plain look: the first of everything, clean-shaven
export function plainLook(female: boolean): Look {
    const kits = kitsFor(female);
    return { female, kits: BODY_PARTS.map((p) => kits[p][0]), colors: [0, 0, 0, 0, 0], hideHelm: false };
}

// A look by its hair and beard, -1 for none
function look(female: boolean, hair: number, jaw: number, colors: [number, number, number, number, number]): Look {
    const l = plainLook(female);
    l.kits[0] = hair;
    if (jaw !== -1) {
        l.kits[1] = jaw;
    }
    l.colors = colors;
    return l;
}

// Each class's look as it stands in the line at the creation screen, and as it's first offered.
// Colours by index (as the swatches run): hair 3 near-black, 4 ginger, 5 blond, 12 black, 14 ash;
// tunics 6 rust, 7 navy, 8 green, 16 black, 21 royal blue, 24 blood red; trousers the same less
// one; skin 0 to 7 fair to dark and pale last.
export const CLASS_LOOKS: Record<ClassId, Look> = {
    warrior: look(false, 3, 13, [3, 6, 4, 0, 1]),
    paladin: look(false, 7, 10, [5, 21, 21, 2, 0]),
    rogue: look(true, 49, -1, [12, 16, 16, 3, 1]),
    ranger: look(true, 52, -1, [4, 8, 9, 0, 0]),
    necromancer: look(false, 5, 16, [12, 24, 16, 3, 7]),
    mage: look(true, 54, -1, [14, 7, 8, 3, 0]),
};

// A few looks to start from, of each body
export const PRESETS: { name: string; look: Look }[] = [
    { name: "Ironhand", look: look(false, 3, 13, [3, 6, 4, 0, 1]) },
    { name: "Grey Wolf", look: look(false, 6, 11, [2, 3, 4, 5, 3]) },
    { name: "Sunborn", look: look(false, 1, -1, [5, 4, 5, 2, 0]) },
    { name: "Ashen", look: look(false, 2, 16, [1, 16, 16, 3, 10]) },
    { name: "Rowan", look: look(true, 52, -1, [4, 8, 9, 0, 0]) },
    { name: "Nightshade", look: look(true, 49, -1, [12, 27, 27, 3, 6]) },
    { name: "Frost", look: look(true, 54, -1, [14, 20, 20, 5, 7]) },
    { name: "Ember", look: look(true, 47, -1, [19, 23, 24, 4, 4]) },
];

// A look made up from the dice: anything a body can have, with a natural skin
export function randomLook(rng: Rng, female: boolean, hideHelm = false): Look {
    const kits = kitsFor(female);
    return {
        female,
        kits: BODY_PARTS.map((p) => (p === "jaw" && (female || rng.chance(0.3)) ? kits.jaw[0] : rng.pick(p === "jaw" ? kits.jaw.slice(1) : kits[p]))),
        colors: COLOR_PARTS.map((p) => rng.int(p === "skin" ? NATURAL_SKINS : COLOR_COUNT[p])),
        hideHelm,
    };
}

// A look from a save, or a class's own if it's not one: every kit one its body can have (a face
// saved without a beard, as -1, has the bare chin)
export function readLook(raw: unknown, otherwise: Look): Look {
    if (!raw || typeof raw !== "object") {
        return { ...otherwise, kits: [...otherwise.kits], colors: [...otherwise.colors] };
    }
    const r = raw as Partial<Look>;
    const female = r.female === true;
    const kits = kitsFor(female);
    const plain = plainLook(female);
    return {
        female,
        kits: BODY_PARTS.map((p, i) => {
            const saved = Array.isArray(r.kits) ? r.kits[i] : undefined;
            const k = typeof saved === "number" ? (SAME_KIT[saved] ?? saved) : undefined;
            return k !== undefined && kits[p].includes(k) ? k : plain.kits[i];
        }),
        colors: COLOR_PARTS.map((p, i) => {
            const c = Array.isArray(r.colors) ? r.colors[i] : undefined;
            return typeof c === "number" && Number.isInteger(c) && c >= 0 && c < COLOR_COUNT[p] ? c : 0;
        }),
        hideHelm: r.hideHelm === true,
    };
}

// The other body, keeping what carries over: the colours, and the hair and beard's places in
// their lists where they can
export function switchBody(l: Look): Look {
    const from = kitsFor(l.female);
    const to = kitsFor(!l.female);
    const at = (p: BodyPart, i: number) => {
        const index = Math.max(0, from[p].indexOf(l.kits[i]));
        return to[p][Math.min(index, to[p].length - 1)];
    };
    return {
        female: !l.female,
        kits: BODY_PARTS.map((p, i) => (p === "hair" || p === "jaw" ? at(p, i) : to[p][0])),
        colors: [...l.colors],
        hideHelm: l.hideHelm,
    };
}

// Names to roll for a new hero
export const NAME_FIRST = [
    "Aldric", "Brana", "Cedric", "Dagny", "Edric", "Fenna", "Garrick", "Hilde", "Ivo", "Jorun", "Kael", "Liesel", "Morwen", "Nolan", "Orla",
    "Perrin", "Rhosyn", "Sigrid", "Torvald", "Ulla", "Varyn", "Wren", "Ysolde", "Zarek", "Ansel", "Briar", "Corwin", "Elowen", "Thane", "Isolde",
];
export const NAME_LAST = ["", "", "", " of Varrock", " of Falador", " Ashford", " Blackwood", " the Bold", " Stormborn", " Greyhame", " Thorne", " Vale"];

export const NAME_MAX = 16;

// A name as a hero can have it: letters, spaces, hyphens and apostrophes, trimmed
export function cleanName(name: string): string {
    return name
        .replace(/[^\p{L}' -]/gu, "")
        .replace(/\s+/g, " ")
        .trimStart()
        .slice(0, NAME_MAX);
}

export function nameProblem(name: string): string | undefined {
    const n = name.trim();
    if (n.length < 2) {
        return "Your hero needs a name of two letters or more.";
    }
    if (!/\p{L}/u.test(n)) {
        return "A name needs letters in it.";
    }
    return undefined;
}
