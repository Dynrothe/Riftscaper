// What there is to find in a rift besides its packs, as plain data: chests that the lost left
// behind (a few of them a trap), shrines to the gods that bless whoever touches them a while, and
// a hoard that a rare pack guards beside a ruin, which opens once its guards are dead. Each is a
// real loc from the cache, drawn as a model the client bakes (`Assets`), shut and then open, lit
// and then spent. Placed by sim/placement.ts, used by Game (useFeature). Starting guesses, to be
// tuned in play.
import { BARROWS, BREACH, FIGHT_CAVES } from "./encounters";
import type { BuffDef, SkillIcon } from "./gems";

export type ShrineId = "zamorak" | "saradomin" | "armadyl" | "bandos";

export const SHRINE_IDS: ShrineId[] = ["zamorak", "saradomin", "armadyl", "bandos"];

export type ShrineDef = {
    id: ShrineId;
    name: string;
    // What it does, as the toast and the hover say it
    text: string;
    buff: BuffDef;
    // Bandos's: life, mana and potions filled at once
    restore?: boolean;
    // The loc, one of the God Wars Dungeon's four altars (riftscaper/scripts/loc-info.ts), and
    // the tiles a side it stands on, which block
    locId: number;
    size: number;
    // Its buff's picture
    icon: SkillIcon;
    // Its name's colour, over it and on the map
    color: string;
    // The spot animation over the hero as it's touched
    spot: number;
};

const SHRINE_SECONDS = 40;

export const SHRINES: Record<ShrineId, ShrineDef> = {
    zamorak: {
        id: "zamorak",
        name: "Shrine of Zamorak",
        text: "40% more damage",
        buff: { seconds: SHRINE_SECONDS, damagePct: 40 },
        locId: 26363, // Zamorak altar
        size: 4,
        icon: { sprite: 125 }, // the sprite of Ultimate Strength
        color: "#e05040",
        spot: 78, // Flames of Zamorak
    },
    saradomin: {
        id: "saradomin",
        name: "Shrine of Saradomin",
        text: "30% less damage taken",
        buff: { seconds: SHRINE_SECONDS, lessDamageTaken: 30 },
        locId: 26364, // Saradomin altar
        size: 4,
        icon: { sprite: 61 }, // the sprite of Saradomin Strike
        color: "#70a8f0",
        spot: 76, // Saradomin Strike
    },
    armadyl: {
        id: "armadyl",
        name: "Shrine of Armadyl",
        text: "30% more movement speed and 20% more attack speed",
        buff: { seconds: SHRINE_SECONDS, moveSpeedPct: 30, attackSpeedPct: 20 },
        locId: 26365, // Armadyl altar
        size: 3,
        icon: { sprite: 504 }, // the sprite of Eagle Eye
        color: "#f0e070",
        spot: 1458,
    },
    bandos: {
        id: "bandos",
        name: "Shrine of Bandos",
        text: "Life, mana and potions filled, and 50% more armour",
        buff: { seconds: SHRINE_SECONDS, armourPct: 50 },
        restore: true,
        locId: 26366, // Bandos altar
        size: 3,
        icon: { sprite: 118 }, // the sprite of Rock Skin
        color: "#90c060",
        spot: 199, // the level-up's fireworks
    },
};

// A chest and a hoard: the loc shut, and opened, and the tiles a side it stands on
export const CHEST = { name: "Chest", closed: 375, open: 378, size: 1, color: "#e8d080" };
export const HOARD = { name: "Guarded hoard", closed: 20723, open: 20724, size: 2, color: "#f0a040" };

// Every loc a feature is drawn with, for the bake (client/Assets.ts)
export function featureLocIds(): number[] {
    return [CHEST.closed, CHEST.open, HOARD.closed, HOARD.open, ...SHRINE_IDS.map((id) => SHRINES[id].locId), FIGHT_CAVES.locId, ...Object.values(BARROWS.sarcophagi), BREACH.locId];
}

export const FEATURES = {
    // How many of each a rift has
    chests: [2, 4] as [number, number],
    shrines: [1, 2] as [number, number],
    // The chance of a guarded hoard
    hoard: 0.65,
    // The chance a chest is a trap: what's opened it is set on by a magic pack risen round it
    trapped: 0.25,
    // An ambush: this many monsters (one more a lap), standing this long before they move
    ambush: 3,
    rise: 0.9,
};

// How far, in walking tiles, a feature stands from the spawn, the next feature, a pack and the
// guardian
export const FEATURE_SPACING = { spawn: 20, apart: 14, pack: 5, boss: 14 };

// How much open ground, in tiles from its middle, each needs round it to stand on: the largest
// shrine is four tiles a side
export const FEATURE_ROOM = { chest: 0.9, shrine: 2.4, hoard: 1.6 };

// The ground a shrine stands on. Its altar is drawn whole, as one model, so on a slope one side
// floats over the ground and on a cliff's lip it hangs out over the drop. It goes where the ground
// rises and falls least under the largest altar's tiles and this many tiles round them: anywhere
// within `flat` scene units (128 a tile) of level, or where there's nowhere as flat, wherever's
// flattest. A rift's lanes roll, so few of their spots are that flat, but most rifts have some.
export const SHRINE_GROUND = { margin: 1, flat: 24 };
