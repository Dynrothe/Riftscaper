// The ladder past depth 16: rifts rolled from parts, as Diablo II's places are named from theirs.
// A rift there is a land (one of the generator's thirteen biomes, now and then mixed with a second,
// its knobs rolled in ranges the biome sets), a host (one of OSRS's factions, its monsters and the
// guardians that lead it), a guardian of the host's, and a name from the parts: "The Ashen Fen,
// held by Bandos's warband". Every part is made by hand and looked at in the game; the roll
// (sim/ladder.ts) only puts them together. Ids here are in saves only as a rift's seed, so they can
// be added to; a host or land taken away changes old seeds' rifts, nothing more.
import type { BiomeId } from "../../../engine/scaperune/biomes";
import type { GeneratorSettings } from "../../../engine/scaperune/settings";
import type { BossId, MonsterId } from "./monsters";

export type HostId =
    | "bandos"
    | "zamorak"
    | "armadyl"
    | "saradomin"
    | "dead"
    | "vampyres"
    | "barrows"
    | "slayer"
    | "tzhaar"
    | "kalphite"
    | "waterbirth"
    | "wild"
    | "jungle"
    | "dragonkin"
    | "abyss";

export type HostDef = {
    id: HostId;
    // As a rift's name has it: "held by Bandos's warband"
    name: string;
    // Its monsters, and how often each makes up a pack
    monsters: [MonsterId, number][];
    // Rares are led by these when set (the Barrows brothers)
    leaders?: MonsterId[];
    // The guardians that can be met at its rifts' far end
    guardians: BossId[];
    // The lands it's most often met in: three times as often as any other
    lands: BiomeId[];
};

export const HOSTS: Record<HostId, HostDef> = {
    bandos: {
        id: "bandos",
        name: "Bandos's warband",
        monsters: [
            ["goblin", 3],
            ["hobgoblin", 3],
            ["ork", 3],
            ["ogre", 2],
            ["jogre", 2],
        ],
        guardians: ["graardor", "ogreChief", "obor"],
        lands: ["desert", "meadow", "autumn"],
    },
    zamorak: {
        id: "zamorak",
        name: "Zamorak's legion",
        monsters: [
            ["imp", 3],
            ["lesserDemon", 3],
            ["greaterDemon", 2],
            ["hellhound", 2],
            ["blackDemon", 1],
        ],
        guardians: ["kril", "skotizo", "cerberus", "tormentedDemon"],
        lands: ["ash", "astral", "deadlands"],
    },
    armadyl: {
        id: "armadyl",
        name: "Armadyl's flight",
        monsters: [
            ["aviansie", 4],
            ["fremennikArcher", 3],
            ["ranger", 2],
        ],
        guardians: ["kreearra"],
        lands: ["snow", "elven", "meadow"],
    },
    saradomin: {
        id: "saradomin",
        name: "Saradomin's host",
        monsters: [
            ["knightOfSaradomin", 3],
            ["saradominPriest", 2],
            ["spiritualWarrior", 2],
            ["spiritualRanger", 2],
            ["spiritualMage", 1],
        ],
        guardians: ["commanderZilyana"],
        lands: ["elven", "fairy", "meadow"],
    },
    dead: {
        id: "dead",
        name: "the restless dead",
        monsters: [
            ["zombie", 3],
            ["skeleton", 3],
            ["ghost", 3],
            ["shade", 2],
        ],
        guardians: ["vetion", "countDraynor"],
        lands: ["deadlands", "swamp", "darkwood"],
    },
    vampyres: {
        id: "vampyres",
        name: "Morytania's vampyres",
        monsters: [
            ["juvinate", 3],
            ["ghoul", 3],
            ["vyrewatch", 2],
            ["werewolf", 2],
        ],
        guardians: ["countDraynor", "werewolfAlpha"],
        lands: ["swamp", "darkwood", "deadlands"],
    },
    barrows: {
        id: "barrows",
        name: "the Barrows brothers",
        monsters: [
            ["skeleton", 3],
            ["darkWizard", 3],
            ["ghoul", 2],
        ],
        leaders: ["dharok", "ahrim", "karil", "guthan", "torag", "verac"],
        guardians: ["ahrimBoss", "vetion"],
        lands: ["deadlands", "swamp"],
    },
    slayer: {
        id: "slayer",
        name: "the Slayer Tower's",
        monsters: [
            ["crawlingHand", 3],
            ["banshee", 3],
            ["aberrantSpectre", 2],
            ["bloodveld", 2],
            ["gargoyle", 1],
            ["nechryael", 1],
            ["abyssalDemon", 1],
        ],
        guardians: ["abyssalSire", "skotizo"],
        lands: ["darkwood", "deadlands", "swamp"],
    },
    tzhaar: {
        id: "tzhaar",
        name: "the TzHaar",
        monsters: [
            ["tzhaarKet", 3],
            ["tzhaarXil", 2],
            ["tzhaarMej", 2],
            ["tzKih", 2],
            ["tzKek", 2],
        ],
        guardians: ["jad"],
        lands: ["ash"],
    },
    kalphite: {
        id: "kalphite",
        name: "the Kalphite hive",
        monsters: [
            ["kalphiteWorker", 4],
            ["kalphiteSoldier", 2],
            ["kalphiteGuardian", 1],
        ],
        guardians: ["kalphiteQueen"],
        lands: ["desert"],
    },
    waterbirth: {
        id: "waterbirth",
        name: "Waterbirth's dagannoth",
        monsters: [
            ["dagannoth", 4],
            ["dagannothLarge", 2],
            ["dagannothGiant", 1],
            ["fremennikWarrior", 1],
        ],
        guardians: ["dagannothRex", "kraken"],
        lands: ["snow", "tropical"],
    },
    wild: {
        id: "wild",
        name: "the Wilderness's beasts",
        monsters: [
            ["wolf", 3],
            ["giantSpider", 3],
            ["grizzlyBear", 2],
            ["rockCrab", 2],
        ],
        guardians: ["sarachnis", "callisto", "venenatis"],
        lands: ["darkwood", "autumn", "meadow"],
    },
    jungle: {
        id: "jungle",
        name: "Karamja's jungle",
        monsters: [
            ["jungleHorror", 3],
            ["jungleSpider", 3],
            ["mossGiant", 2],
        ],
        guardians: ["bryophyta", "jungleDemon", "zulrah"],
        lands: ["jungle", "tropical"],
    },
    dragonkin: {
        id: "dragonkin",
        name: "dragonkin",
        monsters: [
            ["babyBlueDragon", 3],
            ["babyRedDragon", 3],
            ["lesserDemon", 1],
        ],
        guardians: ["vorkath", "kingBlackDragon"],
        lands: ["ash", "snow", "desert"],
    },
    abyss: {
        id: "abyss",
        name: "the Abyss",
        monsters: [
            ["abyssalLeech", 3],
            ["abyssalGuardian", 2],
            ["abyssalWalker", 2],
            ["abyssalDemon", 1],
        ],
        guardians: ["abyssalSire"],
        lands: ["astral"],
    },
};

export const HOST_IDS = Object.keys(HOSTS) as HostId[];

// A knob of the generator rolled between two numbers (a whole number for the ones that count)
export type Knob = [number, number];

export type LandDef = {
    biome: BiomeId;
    // What it's called on the Archmage's offers
    name: string;
    // Its name's words: "The Ashen Fen"
    adjectives: string[];
    // Its daylight, as the zones' (zones.ts)
    ambient: number;
    ambientColor: number;
    // What it always is, and what's rolled
    settings: Partial<GeneratorSettings>;
    knobs: Partial<Record<keyof GeneratorSettings, Knob>>;
};

const MOUNTAINS = { boundary: "mountains" as const };

export const LANDS: Record<BiomeId, LandDef> = {
    meadow: {
        biome: "meadow",
        name: "Meadow",
        adjectives: ["Green", "Gentle", "Bright"],
        ambient: 1.02,
        ambientColor: 0xfffaf0,
        settings: { boundary: "forest" },
        knobs: { trees: [0.4, 0.7], hills: [0.2, 0.5], ruins: [0.2, 0.6], ponds: [1, 4], rivers: [0, 2] },
    },
    darkwood: {
        biome: "darkwood",
        name: "Dark wood",
        adjectives: ["Gloom", "Shadowed", "Black"],
        ambient: 0.94,
        ambientColor: 0xeef8f0,
        settings: { boundary: "forest", treeClumping: 0.8 },
        knobs: { trees: [0.7, 0.9], hills: [0.3, 0.6], ruins: [0.2, 0.5], ponds: [1, 3] },
    },
    swamp: {
        biome: "swamp",
        name: "Swamp",
        adjectives: ["Fetid", "Drowned", "Rotting"],
        ambient: 0.94,
        ambientColor: 0xf2f8e6,
        settings: { boundary: "forest" },
        knobs: { trees: [0.45, 0.7], hills: [0.15, 0.35], ponds: [3, 7], lakes: [0, 2], ruins: [0.3, 0.7] },
    },
    deadlands: {
        biome: "deadlands",
        name: "Deadlands",
        adjectives: ["Barren", "Grey", "Forsaken"],
        ambient: 0.93,
        ambientColor: 0xf2f0f8,
        settings: { boundary: "hills" },
        knobs: { trees: [0.2, 0.45], hills: [0.3, 0.6], ruins: [0.5, 0.9], landmarks: [0.4, 0.8] },
    },
    snow: {
        biome: "snow",
        name: "Snowfield",
        adjectives: ["Frozen", "Frost", "White"],
        ambient: 1,
        ambientColor: 0xf2f6ff,
        settings: { ...MOUNTAINS, snow: 0.6 },
        knobs: { mountains: [0.15, 0.35], trees: [0.3, 0.55], rivers: [0, 2], ruins: [0.2, 0.5] },
    },
    ash: {
        biome: "ash",
        name: "Ashland",
        adjectives: ["Ashen", "Burning", "Cinder"],
        ambient: 0.96,
        ambientColor: 0xfff0e0,
        settings: { ...MOUNTAINS, rubble: 1, peakHeight: 140 },
        knobs: { mountains: [0.15, 0.3], trees: [0.1, 0.3], ponds: [0, 3], volcanoes: [0, 2] },
    },
    desert: {
        biome: "desert",
        name: "Desert",
        adjectives: ["Sunscorch", "Dry", "Red"],
        ambient: 1.05,
        ambientColor: 0xfff4e0,
        settings: { ...MOUNTAINS, ponds: 0 },
        knobs: { mountains: [0.1, 0.2], trees: [0.08, 0.2], rocks: [0.4, 0.7], mesas: [2, 6], ruins: [0.4, 0.8] },
    },
    astral: {
        biome: "astral",
        name: "Astral plane",
        adjectives: ["Abyssal", "Starless", "Hollow"],
        ambient: 0.94,
        ambientColor: 0xf6eeff,
        settings: MOUNTAINS,
        knobs: { mountains: [0.2, 0.4], trees: [0.2, 0.4], ruins: [0.3, 0.6], landmarks: [0.4, 0.7] },
    },
    jungle: {
        biome: "jungle",
        name: "Jungle",
        adjectives: ["Tangled", "Steaming", "Verdant"],
        ambient: 0.97,
        ambientColor: 0xf0fff0,
        settings: { boundary: "forest", treeClumping: 0.6 },
        knobs: { trees: [0.7, 0.95], hills: [0.2, 0.5], ponds: [1, 4], rivers: [0, 2], ruins: [0.2, 0.5] },
    },
    tropical: {
        biome: "tropical",
        name: "Tropical isle",
        adjectives: ["Sunlit", "Salt", "Palm"],
        ambient: 1.05,
        ambientColor: 0xfffbea,
        settings: { boundary: "forest" },
        knobs: { trees: [0.3, 0.6], hills: [0.2, 0.4], ponds: [2, 5], lakes: [0, 2], ruins: [0.2, 0.5] },
    },
    autumn: {
        biome: "autumn",
        name: "Autumn wood",
        adjectives: ["Russet", "Fallow", "Amber"],
        ambient: 1,
        ambientColor: 0xfff2e2,
        settings: { boundary: "forest" },
        knobs: { trees: [0.5, 0.8], hills: [0.3, 0.6], ruins: [0.2, 0.6], ponds: [1, 3], rivers: [0, 1] },
    },
    elven: {
        biome: "elven",
        name: "Elven forest",
        adjectives: ["Silver", "Crystal", "Elven"],
        ambient: 1,
        ambientColor: 0xf4fbff,
        settings: { boundary: "forest" },
        knobs: { trees: [0.5, 0.8], hills: [0.3, 0.6], ruins: [0.3, 0.6], ponds: [1, 4], rivers: [0, 2] },
    },
    fairy: {
        biome: "fairy",
        name: "Fairy realm",
        adjectives: ["Glimmering", "Faerie", "Dreaming"],
        ambient: 1.02,
        ambientColor: 0xfff0ff,
        settings: { boundary: "forest" },
        knobs: { trees: [0.4, 0.7], hills: [0.2, 0.5], ponds: [2, 5], ruins: [0.2, 0.5], landmarks: [0.3, 0.6] },
    },
};

export const LAND_IDS = Object.keys(LANDS) as BiomeId[];

// A land's name's second word, by what was rolled most of in it
export const LAND_NOUNS = {
    mountains: ["Crags", "Peaks", "Heights"],
    water: ["Fen", "Mere", "Waters"],
    trees: ["Wood", "Weald", "Thicket"],
    hills: ["Downs", "Hills", "Rise"],
    open: ["Fields", "Wastes", "Reach", "Marches", "Expanse"],
};

// How often a ladder rift is mixed with a second biome, and how much of it; how often it's at dusk
export const LAND_MIX = { chance: 1 / 3, share: [0.25, 0.45] as Knob };
export const LADDER_DUSK = 0.2;
