// The rifts, deeper and deeper: each a stretch of land ScapeRune's generator makes from a seed in
// one biome, with its own monsters and a boss at the far end guarding the way on. Past the last
// they come round again, harder. The generator's settings here lay over the ones every rift shares
// (world/zoneGen.ts).
import type { GeneratorSettings } from "../../../engine/scaperune/settings";
import type { BiomeId } from "../../../engine/scaperune/biomes";
import type { BossId, MonsterId } from "./monsters";

export type ZoneDef = {
    name: string;
    biome: BiomeId;
    // Its monsters, and how often each makes up a pack
    monsters: [MonsterId, number][];
    // Rares are led by these when set (the Barrows brothers)
    leaders?: MonsterId[];
    boss: BossId;
    // The guardian of its odd laps (Torment 1, 3 and so on), so the second time round is a new
    // fight and not only a harder one
    second?: BossId;
    // Monsters and guardians met there besides its own: a ladder rift's superiors, roaming bosses
    // and encounters' (sim/ladder.ts), so they're baked with the rest
    also?: { monsters?: MonsterId[]; bosses?: BossId[] };
    // Its daylight: how bright (1 is the map as the cache colours it, OSRS's own day; DAY at the
    // least) and its tint
    ambient: number;
    ambientColor: number;
    settings: Partial<GeneratorSettings>;
};

// Every place is by day: an ambient of DAY or more. By day a light only warms what it's on, at
// DAY_GLOW of its strength, and the hero's lantern isn't seen at all; as the ambient falls to DUSK
// they come up to their full strength (Client.updateLights).
export const DAY = 0.85;
export const DUSK = 0.6;
export const DAY_GLOW = 0.25;

export const ZONES: ZoneDef[] = [
    {
        name: "The Greenway",
        biome: "meadow",
        monsters: [
            ["goblin", 5],
            ["giantRat", 3],
            ["hobgoblin", 2],
        ],
        boss: "ogreChief",
        second: "obor",
        ambient: 1.02,
        ambientColor: 0xfffaf0,
        settings: { boundary: "forest", trees: 0.6, hills: 0.4, ruins: 0.4, ponds: 2, rivers: 1 },
    },
    {
        name: "Gloomwood",
        biome: "darkwood",
        monsters: [
            ["wolf", 4],
            ["giantSpider", 4],
            ["werewolf", 2],
        ],
        boss: "werewolfAlpha",
        second: "sarachnis",
        ambient: 0.94,
        ambientColor: 0xeef8f0,
        settings: { boundary: "forest", trees: 0.85, treeClumping: 0.8, hills: 0.5, ruins: 0.3, ponds: 2 },
    },
    {
        name: "Fetid Marsh",
        biome: "swamp",
        monsters: [
            ["zombie", 4],
            ["skeleton", 3],
            ["giantSpider", 2],
            ["mossGiant", 1],
        ],
        boss: "countDraynor",
        second: "bryophyta",
        ambient: 0.94,
        ambientColor: 0xf2f8e6,
        settings: { boundary: "forest", trees: 0.6, hills: 0.25, ponds: 5, lakes: 1, ruins: 0.5 },
    },
    {
        name: "The Barrow Fields",
        biome: "deadlands",
        monsters: [
            ["skeleton", 4],
            ["zombie", 3],
            ["darkWizard", 3],
        ],
        leaders: ["dharok", "ahrim", "karil"],
        boss: "ahrimBoss",
        second: "vetion",
        ambient: 0.93,
        ambientColor: 0xf2f0f8,
        settings: { boundary: "hills", trees: 0.35, hills: 0.5, ruins: 0.8, landmarks: 0.6 },
    },
    {
        name: "Frostmarch",
        biome: "snow",
        monsters: [
            ["wolf", 3],
            ["fremennikArcher", 3],
            ["berserker", 3],
            ["aviansie", 2],
        ],
        boss: "kreearra",
        second: "vorkath",
        ambient: 1,
        ambientColor: 0xf2f6ff,
        settings: { boundary: "mountains", mountains: 0.3, snow: 0.6, trees: 0.45, rivers: 1, ruins: 0.3 },
    },
    {
        name: "Ashen Wastes",
        biome: "ash",
        monsters: [
            ["imp", 3],
            ["lesserDemon", 2],
            ["tzhaarKet", 3],
            ["tzhaarXil", 2],
            ["tzhaarMej", 2],
        ],
        boss: "jad",
        second: "cerberus",
        ambient: 0.96,
        ambientColor: 0xfff0e0,
        settings: { boundary: "mountains", mountains: 0.25, trees: 0.2, rubble: 1, ponds: 2, volcanoes: 1, peakHeight: 140 },
    },
    {
        name: "Sunscorch Dunes",
        biome: "desert",
        monsters: [
            ["guard", 3],
            ["ork", 3],
            ["ogre", 2],
            ["rockCrab", 2],
        ],
        boss: "graardor",
        second: "kalphiteQueen",
        ambient: 1.05,
        ambientColor: 0xfff4e0,
        settings: { boundary: "mountains", mountains: 0.15, trees: 0.12, rocks: 0.6, mesas: 4, ruins: 0.6, ponds: 0 },
    },
    {
        name: "The Abyssal Rift",
        biome: "astral",
        monsters: [
            ["imp", 3],
            ["lesserDemon", 3],
            ["darkWizard", 2],
            ["blackDemon", 2],
        ],
        boss: "kril",
        second: "skotizo",
        ambient: 0.94,
        ambientColor: 0xf6eeff,
        settings: { boundary: "mountains", mountains: 0.3, trees: 0.3, ruins: 0.4, landmarks: 0.5 },
    },
];

// The Heart of the Rift (riftstones.ts): where the Heartstone is still falling, opened with its
// four shards at the deepest the hero has reached. A small rift of the Abyss's worst, and at its
// end the hardest guardian there is, with every kind of special.
export const HEART_ZONE: ZoneDef = {
    name: "The Heart of the Rift",
    biome: "astral",
    monsters: [
        ["blackDemon", 3],
        ["lesserDemon", 2],
        ["darkWizard", 2],
    ],
    boss: "heart",
    ambient: 0.92,
    ambientColor: 0xf2e6ff,
    settings: { boundary: "mountains", mountains: 0.35, trees: 0.2, ruins: 0.5, landmarks: 0.6 },
};

// A campaign depth's zone (the ladder's and the pinnacles' are sim/ladder.ts riftZone's)
export function zoneOf(depth: number): ZoneDef {
    return ZONES[(depth - 1) % ZONES.length];
}

// How many times round the zones a depth is: 0 for the first eight
export function lapOf(depth: number): number {
    return Math.floor((Math.max(1, depth) - 1) / ZONES.length);
}

// The guardian at a depth's far end: the zone's own, or on its odd laps its second
export function bossOf(depth: number): BossId {
    const zone = zoneOf(depth);
    return zone.second && lapOf(depth) % 2 === 1 ? zone.second : zone.boss;
}

// Past the last rift, its name says how many times round
export function zoneName(depth: number): string {
    const lap = lapOf(depth);
    const name = zoneOf(depth).name;
    return lap === 0 ? name : `${name} (Torment ${lap})`;
}
