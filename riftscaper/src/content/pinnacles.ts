// The pinnacles: rifts beside the ladder, not on it, each with the hardest of its kind at its end
// and uniques only it drops, as Path of Exile's pinnacle bosses are its endgame's. The Heart of the
// Rift opens with the Heartstone's four shards (riftstones.ts); a god's general with forty of the
// god's kill count, from the god's followers slain on the ladder (God Wars, as OSRS's own doors
// ask); the Abyssal Sire with abyssal ashes from the breaches (encounters.ts). Each opens at the
// deepest the hero has reached, and takes them no deeper. Ids are the cache's.
import { COLOSSEUM, colosseumMonsters } from "./colosseum";
import { TOMBS, tombsGuardians, tombsMonsters } from "./tombs";
import type { GoodId } from "./goods";
import type { MonsterId } from "./monsters";
import { HEART_ZONE, ZoneDef } from "./zones";

export type PinnacleId = "heart" | "graardor" | "kreearra" | "kril" | "zilyana" | "sire" | "colosseum" | "chicken" | "tombs";

// The four gods whose armies the ladder's hosts are (ladder.ts HOSTS), and whose kill count opens
// their general's stronghold
export type GodId = "bandos" | "armadyl" | "saradomin" | "zamorak";
export const GOD_IDS: GodId[] = ["bandos", "armadyl", "saradomin", "zamorak"];
export const GOD_NAMES: Record<GodId, string> = { bandos: "Bandos", armadyl: "Armadyl", saradomin: "Saradomin", zamorak: "Zamorak" };

export type PinnacleKey =
    // The Heartstone's four shards, in the pack
    | { kind: "shards" }
    // So much of a god's kill count, spent
    | { kind: "killCount"; god: GodId; count: number }
    // So many of one of the pouch's goods, spent
    | { kind: "goods"; id: GoodId; count: number }
    // Nothing: open to any hero past the ladder's start (the Colosseum)
    | { kind: "free" }
    // Laid in Aubury's circle, not given to the Archmage (the secret rift: content/circle.ts)
    | { kind: "circle" };

export type PinnacleDef = {
    id: PinnacleId;
    name: string;
    zone: ZoneDef;
    key: PinnacleKey;
    // A share of a rift's packs, more or less (the Heart's are a third: its guardian is the fight)
    packs: number;
    chests: number;
    shrines: number;
    // Its guardian, made this much tougher than it is as a ladder guardian (the Heart's is its own)
    life: number;
    damage: number;
    // Its bodyguards, raised round it as it wakes: rares, each a guard of the guardian's
    retinue?: MonsterId[];
    // One of its uniques always, and a second this often
    second: number;
    // Uniques it drops besides its own, as often as one of its own (the Sire's whip)
    alsoDrops?: string[];
    // With none of its own, so many uniques of any kind instead (the secret rift's)
    anyUniques?: number;
    // Its monsters but the guardian, made this much weaker than its depth's are (the Coop's flock:
    // many, and each easy)
    flock?: { life: number; damage: number };
    // Waves at its sand's middle, not packs over its land (the Colosseum, content/colosseum.ts)
    waves?: boolean;
    // Rooms there instead, a guardian each, and invocations chosen before (the Tombs, tombs.ts)
    rooms?: boolean;
    // What the Archmage says as it opens, and the colour it's shown in
    says: string;
    color: string;
};

// A god's stronghold, its general's bodyguards baked with it
const stronghold = (name: string, biome: ZoneDef["biome"], monsters: ZoneDef["monsters"], boss: ZoneDef["boss"], ambient: number, ambientColor: number, retinue: MonsterId[]): ZoneDef => ({
    name,
    biome,
    monsters,
    boss,
    also: { monsters: retinue, bosses: [] },
    ambient,
    ambientColor,
    settings: { boundary: "mountains", mountains: 0.4, trees: 0.15, ruins: 0.6, landmarks: 0.6 },
});

// Each general's bodyguards, as OSRS's own are round them (npc-info.ts), and the Sire's spawn and
// scion: raised as rares round the guardian as it wakes (Game.ts)
const BODYGUARDS: Record<Exclude<PinnacleId, "heart" | "colosseum" | "chicken" | "tombs">, MonsterId[]> = {
    graardor: ["sergeantStrongstack", "sergeantSteelwill", "sergeantGrimspike"],
    kreearra: ["wingmanSkree", "flockleaderGeerin", "flightKilisa"],
    kril: ["tstanonKarlak", "zaklnGritch", "balfrugKreeyath"],
    zilyana: ["starlight", "growler", "bree"],
    sire: ["sireScion", "sireSpawn", "sireSpawn"],
};

export const PINNACLES: Record<PinnacleId, PinnacleDef> = {
    heart: {
        id: "heart",
        name: HEART_ZONE.name,
        zone: HEART_ZONE,
        key: { kind: "shards" },
        packs: -0.65,
        chests: 2,
        shrines: 2,
        life: 1,
        damage: 1,
        second: 0.35,
        says: "The Heart. I never thought to see the way to it. Whatever waits there has waited since the fall.",
        color: "#d070ff",
    },
    graardor: {
        id: "graardor",
        name: "Bandos's Stronghold",
        zone: stronghold(
            "Bandos's Stronghold",
            "desert",
            [
                ["ork", 3],
                ["ogre", 2],
                ["jogre", 2],
                ["hobgoblin", 2],
            ],
            "graardor",
            1.02,
            0xfff0dc,
            BODYGUARDS.graardor,
        ),
        retinue: BODYGUARDS.graardor,
        key: { kind: "killCount", god: "bandos", count: 40 },
        packs: -0.5,
        chests: 1,
        shrines: 1,
        life: 3,
        damage: 1.25,
        second: 0.25,
        says: "Bandos's Stronghold. Graardor holds it for his god, and he's never lost it. Go loud.",
        color: "#b08850",
    },
    kreearra: {
        id: "kreearra",
        name: "Armadyl's Eyrie",
        zone: stronghold(
            "Armadyl's Eyrie",
            "snow",
            [
                ["aviansie", 4],
                ["fremennikArcher", 2],
            ],
            "kreearra",
            1,
            0xf2f6ff,
            BODYGUARDS.kreearra,
        ),
        retinue: BODYGUARDS.kreearra,
        key: { kind: "killCount", god: "armadyl", count: 40 },
        packs: -0.5,
        chests: 1,
        shrines: 1,
        life: 3,
        damage: 1.25,
        second: 0.25,
        says: "Armadyl's Eyrie. Kree'arra sees you before you see him. Keep moving.",
        color: "#a8c8d8",
    },
    kril: {
        id: "kril",
        name: "Zamorak's Fortress",
        zone: stronghold(
            "Zamorak's Fortress",
            "ash",
            [
                ["imp", 2],
                ["lesserDemon", 3],
                ["greaterDemon", 2],
                ["hellhound", 2],
            ],
            "kril",
            0.94,
            0xffe6d8,
            BODYGUARDS.kril,
        ),
        retinue: BODYGUARDS.kril,
        key: { kind: "killCount", god: "zamorak", count: 40 },
        packs: -0.5,
        chests: 1,
        shrines: 1,
        life: 3,
        damage: 1.25,
        second: 0.25,
        says: "Zamorak's Fortress. K'ril Tsutsaroth burns there, and his god's fire with him.",
        color: "#d04830",
    },
    zilyana: {
        id: "zilyana",
        name: "Saradomin's Encampment",
        zone: stronghold(
            "Saradomin's Encampment",
            "elven",
            [
                ["knightOfSaradomin", 3],
                ["saradominPriest", 2],
                ["spiritualWarrior", 2],
                ["spiritualMage", 1],
            ],
            "commanderZilyana",
            1,
            0xf4fbff,
            BODYGUARDS.zilyana,
        ),
        retinue: BODYGUARDS.zilyana,
        key: { kind: "killCount", god: "saradomin", count: 40 },
        packs: -0.5,
        chests: 1,
        shrines: 1,
        life: 3,
        damage: 1.25,
        second: 0.25,
        says: "Saradomin's Encampment. Commander Zilyana is quick, and she's never alone.",
        color: "#e8e0b0",
    },
    sire: {
        id: "sire",
        name: "The Abyssal Nexus",
        zone: {
            name: "The Abyssal Nexus",
            biome: "astral",
            monsters: [
                ["abyssalLeech", 3],
                ["abyssalWalker", 2],
                ["abyssalGuardian", 2],
                ["abyssalDemon", 2],
            ],
            boss: "abyssalSire",
            also: { monsters: BODYGUARDS.sire, bosses: [] },
            ambient: 0.9,
            ambientColor: 0xf0e0f0,
            settings: { boundary: "mountains", mountains: 0.35, trees: 0.1, ruins: 0.4, landmarks: 0.5, ponds: 3 },
        },
        key: { kind: "goods", id: "abyssalAshes", count: 100 },
        retinue: BODYGUARDS.sire,
        alsoDrops: ["abyssal_whip"],
        packs: -0.55,
        chests: 1,
        shrines: 1,
        life: 3,
        damage: 1.25,
        second: 0.3,
        says: "The Abyssal Nexus. The Sire sleeps there, and what it's spawned. The ashes got you in; mind they don't make you more.",
        color: "#9060a8",
    },
    colosseum: {
        id: "colosseum",
        name: "The Fortis Colosseum",
        zone: {
            name: "The Fortis Colosseum",
            biome: "desert",
            monsters: [["jaguarWarrior", 1]],
            boss: "solHeredit",
            also: { monsters: colosseumMonsters(), bosses: [] },
            ambient: 1.04,
            ambientColor: 0xfff0d8,
            settings: { boundary: "mountains", mountains: 0.3, trees: 0.05, ruins: 0.7, landmarks: 0.6 },
        },
        key: { kind: "free" },
        packs: -1,
        chests: 0,
        shrines: 0,
        life: COLOSSEUM.life,
        damage: COLOSSEUM.damage,
        second: 0.15,
        waves: true,
        says: "The Fortis Colosseum. Twelve waves, and Sol Heredit at the end of them. Take glory when Minimus offers it: it pays.",
        color: COLOSSEUM.color,
    },
    // The raid (docs/late-game.md G): four paths' guardians, each in a chamber off the Nexus, taken
    // in any order, and the Wardens in the Nexus, with the invocations chosen before it's opened
    tombs: {
        id: "tombs",
        name: "The Tombs of Amascut",
        zone: {
            name: "The Tombs of Amascut",
            biome: "desert",
            // What Kephri calls up
            monsters: [["soldierScarab", 1]],
            boss: "wardens",
            also: { monsters: tombsMonsters(), bosses: tombsGuardians() },
            ambient: 0.98,
            ambientColor: 0xffe8c8,
            settings: { boundary: "mountains", mountains: 0.35, trees: 0.02, ruins: 0.8, landmarks: 0.7 },
        },
        key: { kind: "free" },
        packs: -1,
        chests: 0,
        shrines: 0,
        life: TOMBS.wardens.life,
        damage: TOMBS.wardens.damage,
        second: 0.1,
        rooms: true,
        says: "The Tombs of Amascut. Osmumten waits by the Nexus: four paths off it, any order, and the Wardens once they're beaten. The invocations you chose will be held to, all the way, and paid for.",
        color: TOMBS.color,
    },
    // Diablo II's secret level, made of OSRS's own joke: the Evil Chicken of the old random event,
    // and its flock, in a meadow. Opened in Aubury's circle with three eggs, a raw chicken and a Law
    // rune; its guardian's drops are a pinnacle's, and its flock's many.
    chicken: {
        id: "chicken",
        name: "The Coop",
        zone: {
            name: "The Coop",
            biome: "meadow",
            monsters: [["chicken", 1]],
            boss: "evilChicken",
            ambient: 1.04,
            ambientColor: 0xfffaf0,
            settings: { boundary: "forest", trees: 0.4, hills: 0.3, ruins: 0.2, ponds: 2 },
        },
        key: { kind: "circle" },
        packs: 0.6,
        chests: 2,
        shrines: 1,
        life: 2,
        damage: 1,
        flock: { life: 0.35, damage: 0.4 },
        second: 0,
        anyUniques: 2,
        says: "The Coop. Something in the circle answered, and it's very angry.",
        color: "#f0e8d0",
    },
};

export const PINNACLE_IDS = Object.keys(PINNACLES) as PinnacleId[];

// The ladder's god hosts and their god (ladder.ts HOSTS)
export const HOST_GOD: Partial<Record<string, GodId>> = { bandos: "bandos", armadyl: "armadyl", saradomin: "saradomin", zamorak: "zamorak" };

// ---- Awakened (docs/late-game.md B) ----

// Desert Treasure II's awakened bosses, Path of Exile's uber pinnacles: every pinnacle but the Coop
// again, harder, opened with its own key and an Awakener's orb (goods.ts ORB_DROPS), at the deepest
// rift reached, for drops of its own
export const AWAKENED = {
    // Its guardian's life and damage, on top of the pinnacle's own
    life: 2,
    damage: 1.25,
    // Its specials this much more often
    specials: 1.3,
    // At this share of its life, its second phase: its retinue raised again (or so many of its
    // land's guards, if it has none), and a special more of the ladder's pool
    phase: 0.5,
    guards: 4,
    // Two of its uniques always, their numbers in the top half of their ranges; and three Chromium
    // ingots this often
    uniques: 2,
    ingots: { count: 3, chance: 1 / 3 },
    color: "#b080ff",
};

// What each drops of its own besides: the generals' vestiges (circle.ts MAKES sets them in their
// rings), the Heart's ingots every time, the Colosseum's splinters (Dizana's quiver's blessing)
export const AWAKENED_DROPS: Partial<Record<PinnacleId, { id: GoodId; count: number; chance: number }[]>> = {
    graardor: [{ id: "ultorVestige", count: 1, chance: 0.5 }],
    kreearra: [{ id: "venatorVestige", count: 1, chance: 0.5 }],
    kril: [{ id: "magusVestige", count: 1, chance: 0.5 }],
    zilyana: [{ id: "bellatorVestige", count: 1, chance: 0.5 }],
    heart: [{ id: "chromiumIngot", count: 3, chance: 1 }],
    colosseum: [{ id: "sunfireSplinters", count: 25, chance: 1 }],
};

// Not the Coop, nor the Tombs, whose invocations are its harder self
export function awakenable(id: PinnacleId): boolean {
    return id !== "chicken" && id !== "tombs";
}
