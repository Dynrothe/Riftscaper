// The ladder's encounters, as Path of Exile's leagues are its maps': past depth 16 each rift rolls
// one (sim/ladder.ts), a self-contained thing to do that pays in its own way, and the Archmage's
// offers show which. Each is one of OSRS's own minigames or haunts: a fleeing impling (Diablo
// III's treasure goblin), a hunter out of the Wilderness (Path of Exile's rogue exiles), the Fight
// Caves' waves for tokkul (push your luck, as Ritual is) and the Barrows' tombs (Diablo II's);
// Pest Control's portals round a Void Knight to be held (Legion's defence); a God Wars skirmish
// between two gods' armies, for their kill count (Legion's, as its generals' doors ask); an
// Abyssal breach, its ring growing and shrinking with the Abyss pouring out (Breach's); and
// Guardians of the Rift, essence carried to the Great Guardian against the clock (Harvest's,
// Ultimatum's). Besides them, any ladder kill can call up its superior, and a Wilderness boss
// roams one rift in four. Numbers are the sim's (Game.ts); every id is the cache's, looked up
// with the scripts.
import type { GodId } from "./pinnacles";
import type { GoodId } from "./goods";
import type { BossId, MonsterId } from "./monsters";

// A monster's rank, as the sim has it (Game.ts MonsterRank)
type Rank = "normal" | "magic" | "rare" | "boss";
import { SPOT, TELEPORT_SPOT } from "./visuals";

export type EncounterId = "impling" | "hunter" | "fightCaves" | "barrows" | "pestControl" | "godWars" | "breach" | "guardians";

export const ENCOUNTER_IDS: EncounterId[] = ["impling", "hunter", "fightCaves", "barrows", "pestControl", "godWars", "breach", "guardians"];

export const ENCOUNTERS: Record<EncounterId, { name: string; text: string; color: string }> = {
    impling: { name: "A fleeing impling", text: "Catch it before it's gone, and its jar is yours", color: "#e8c860" },
    hunter: { name: "A Wilderness hunter", text: "Someone hunts you, and what they wear is yours", color: "#e05040" },
    fightCaves: { name: "The Fight Caves", text: "Waves of TzHaar for tokkul, doubling as long as you dare", color: "#ff8838" },
    barrows: { name: "The Barrows", text: "Three brothers' tombs, and the chest they keep", color: "#c8b898" },
    pestControl: { name: "Pest Control", text: "A Void Knight beset: break the portals before the pests break him", color: "#a070e0" },
    godWars: { name: "A God Wars skirmish", text: "Two gods' armies at war, and their kill count for whoever's left", color: "#d0a040" },
    breach: { name: "An Abyssal breach", text: "A tear into the Abyss, pouring out while it's open, for its ashes", color: "#b060c0" },
    guardians: { name: "Guardians of the Rift", text: "The Great Guardian's rift: bring it essence before time's up", color: "#60d0c0" },
};

// An impling: it flees once it's seen the hero, a little slower than them, and is gone through a
// puff of smoke when its time's up. A hit shakes gold or a rune out of it; caught, its jar is a
// hoard's, and a lucky one's is a guardian's.
export const IMPLING = {
    kinds: [
        ["dragonImpling", 3],
        ["ninjaImpling", 3],
        ["magpieImpling", 3],
        ["crystalImpling", 2],
        ["luckyImpling", 1],
    ] as [MonsterId, number][],
    lucky: "luckyImpling" as MonsterId,
    seconds: 15,
    sight: 9,
    goldChance: 0.5,
    runeChance: 0.15,
    // The puff it's gone in (spot-info.ts 1120: model 26377, next to the implings' own)
    puff: 1120,
};

// A hunter out of the Wilderness: a rare of the four that dress as heroes do, much tougher, that
// finds the hero from far off and never gives up the chase. It drops as a guardian, one of its
// items sure to be rare.
export const HUNTER = {
    monsters: ["fremennikWarrior", "ranger", "wizard", "templeKnight"] as MonsterId[],
    names: ["Corvin", "Ysolde", "Mordaunt", "Brannoc", "Maeve", "Osric", "Thessaly", "Grimbald", "Kestra", "Vallen", "Rook", "Ashlyn"],
    title: "the Wilderness hunter",
    life: 2.2,
    damage: 1.15,
    speed: 1.12,
    sight: 22,
};

// The Fight Caves: the cave's mouth (loc-info.ts 11833, "Enter"); touched, a wave of TzHaar comes
// out of it. Each wave beaten holds its tokkul, twice the last's; touched again it's the next
// wave, or the hero takes what's held. Falling loses it. Tokkul (6529) goes in the pouch.
export const FIGHT_CAVES = {
    locId: 11833,
    size: 3,
    name: "Cave entrance",
    color: "#ff8838",
    tokkul: 60,
    // The waves, each what comes out and how many: the last is Ket-Zek's
    waves: [
        [["tzKih", 4]],
        [
            ["tzKih", 3],
            ["tzKek", 2],
        ],
        [
            ["tzKek", 3],
            ["tokXil", 2],
        ],
        [
            ["tokXil", 2],
            ["ytMejKot", 2],
            ["tzKek", 2],
        ],
        [
            ["ketZek", 1],
            ["ytMejKot", 2],
            ["tokXil", 2],
        ],
    ] as [MonsterId, number][][],
    // A wave's monsters are magic ones, with a mod each, from this wave on
    magicFrom: 3,
};

export type BrotherId = "dharok" | "ahrim" | "karil" | "guthan" | "torag" | "verac";

// The Barrows: three of the six brothers' sarcophagi (loc-info.ts: the six of their crypts, each
// with its brother's emblem) spread through the rift, and the chest (the hoard's loc, which is
// the Barrows chest). Touching a sarcophagus raises its brother; with the three down, the chest
// opens.
export const BARROWS = {
    sarcophagi: { dharok: 20720, torag: 20721, guthan: 20722, ahrim: 20770, karil: 20771, verac: 20772 } as Record<BrotherId, number>,
    brothers: ["dharok", "ahrim", "karil", "guthan", "torag", "verac"] as BrotherId[],
    tombs: 3,
    size: 3,
    name: "Sarcophagus",
    chest: "Barrows chest",
    color: "#c8b898",
    // A brother is a rare, and this much tougher
    life: 1.8,
    // The chest's chance of a piece of a slain brother's set (items.ts SETS), and a brother's of
    // his own
    setChance: 0.6,
    pieceChance: 0.1,
};

// Any monster killed on the ladder (not a guardian's or an encounter's) has this chance of calling
// up its superior where it fell: the cache's own where there is one, else itself drawn bigger. It
// has a rare's life five times over, three mods, and drops as a rare three times.
export const SUPERIOR = { chance: 1 / 200, life: 5, size: 1.3, mods: 3, drops: 3 };

export const SUPERIORS: Partial<Record<MonsterId, MonsterId>> = {
    abyssalDemon: "greaterAbyssalDemon",
    nechryael: "nechryarch",
    bloodveld: "insatiableBloodveld",
    banshee: "screamingBanshee",
    crawlingHand: "crushingHand",
    jungleHorror: "caveAbomination",
};

// A Wilderness boss, Diablo II's superuniques: one ladder rift in four has one roaming (not its
// guardian), awake from far off and hunting the hero, dropping as a guardian does. Each has its
// way: the Chaos Elemental's hit throws the hero a few tiles, Scorpia's guardians heal her.
export const ROAMERS = {
    chance: 0.25,
    bosses: ["chaosElemental", "scorpia", "crazyArchaeologist", "callisto", "venenatis"] as BossId[],
    life: 0.6,
    sight: 26,
    chaos: { chance: 0.4, from: 3, to: 6 },
    scorpia: { guards: 2, guard: "scorpiaGuardian" as MonsterId, heal: 0.015, near: 6 },
};

// Pest Control: the Void Knight (npc-info.ts 1755) with four portals in a ring round him, each
// shielded. Coming near starts it: one portal's shield comes down at a time (the next at once when
// one's broken), and pests pour out of every portal still standing, after the knight and then the
// hero. A portal broken pays seals (Void seal, 11666); all four, the knight still standing, pays
// more by how much life he's kept, and a hoard. The knight falling ends it, the portals and pests
// gone with him.
export const PEST_CONTROL = {
    knight: { npcId: 1755, name: "Void Knight" },
    // Shielded, and each one's open self (monsters.ts)
    portals: ["purplePortal", "bluePortal", "yellowPortal", "redPortal"] as MonsterId[],
    open: { purplePortal: "purplePortalOpen", bluePortal: "bluePortalOpen", yellowPortal: "yellowPortalOpen", redPortal: "redPortalOpen" } as Partial<Record<MonsterId, MonsterId>>,
    // Tiles from the knight, a portal's life as so many monsters', and how near the hero starts it
    ring: 7,
    portalLife: 7,
    start: 7,
    // A shield's down this long before the next is looked at (none comes down while one is)
    shieldSeconds: 10,
    // Pests come out of each portal this often, no more than this many at once
    every: 4,
    most: 14,
    pests: [
        ["brawler", 2],
        ["defiler", 2],
        ["ravager", 2],
        ["shifter", 2],
        ["spinner", 1],
        ["splatter", 2],
        ["torcher", 2],
    ] as [MonsterId, number][],
    shieldSpot: SPOT.blueImpact.impactSpot!,
    spawnSpot: TELEPORT_SPOT,
    commendationId: "voidSeal" as GoodId,
    // Seals: each portal broken, the win, and up to this many more for the knight's life kept
    commendations: { portal: 5, won: 15, life: 15 },
    // How much of the knight's life (of 100) a pest's blow takes: a magic or rare one's twice
    blow: 2,
    // A pest's after the hero instead while the hero's this near
    heroNear: 4.5,
    color: "#a070e0",
};

// A God Wars skirmish: two of the four gods' armies (their hosts' monsters, ladder.ts HOSTS), a
// rare at the head of each, standing apart. Coming near starts the war: each army goes for the
// other's nearest, and for the hero when they're close. Every follower the hero slays is kill
// count for its god (a rare's two), which opens the god's general's stronghold (content/
// pinnacles.ts), as a god's host's are anywhere on the ladder; with both armies down, a hoard.
export const GOD_WARS = {
    // The pairs that fight: every two of the four
    pairs: [
        ["bandos", "armadyl"],
        ["bandos", "saradomin"],
        ["bandos", "zamorak"],
        ["armadyl", "saradomin"],
        ["armadyl", "zamorak"],
        ["saradomin", "zamorak"],
    ] as [GodId, GodId][],
    // Each army's size, how far apart they stand, and how near the hero starts it
    army: 7,
    apart: 10,
    start: 16,
    // A blow from one army's monster at the other's takes this much of its life (a rare's more)
    blow: 0.07,
    heroNear: 4.5,
    color: "#d0a040",
};

// An Abyssal breach: a tear into the Abyss (loc-info.ts 49242, the Abyssal Portal; the way on is
// 26149). Touched, a ring grows out of it, holds, and shrinks back, and the Abyss's creatures pour
// out inside it all the while; what's outside the ring as it shrinks is gone. Each slain drops
// abyssal ashes (25775), a hundred of which open the Abyssal Sire's nexus.
export const BREACH = {
    locId: 49242,
    size: 3,
    name: "Abyssal breach",
    color: "#b060c0",
    // Tiles at its widest; seconds growing, in all, and shrinking at the end
    radius: 9,
    grow: 2,
    seconds: 22,
    shrink: 5,
    // A creature out of it this often, and the chance it's magic
    every: 0.45,
    magic: 0.2,
    monsters: [
        ["abyssalLeech", 4],
        ["abyssalWalker", 2],
        ["abyssalGuardian", 2],
        ["abyssalDemon", 1],
    ] as [MonsterId, number][],
    ashes: { normal: 1, magic: 2, rare: 4, boss: 10 } as Record<Rank, number>,
    ashesId: "abyssalAshes" as GoodId,
    spot: SPOT.shadowBarrage.impactSpot!,
    sound: SPOT.shadowBarrage.sound!,
    spawnSpot: SPOT.shadowBarrage.impactSpot!,
};

// Guardians of the Rift: the Great Guardian (npc-info.ts 11403), spoken to, opens its rift for a
// minute and a half: the Abyss's creatures come out of it round the Guardian, each slain giving
// guardian essence to carry (none on the ground), and the essence given to the Guardian is its
// power. At a hundred it seals the rift and pays pearls (26792) by the time left, and a hoard;
// out of time, it pays a little for the power it had.
export const RIFT_GUARDIANS = {
    npcId: 11403,
    name: "The Great Guardian",
    seconds: 90,
    // Power for each essence given
    perEssence: 4,
    // A creature this often, no more than this many at once, in a ring this far out
    every: 1.1,
    most: 9,
    ring: [5, 10] as [number, number],
    magic: 0.25,
    monsters: [
        ["abyssalLeech", 3],
        ["abyssalGuardian", 3],
        ["abyssalWalker", 2],
    ] as [MonsterId, number][],
    essence: { normal: 1, magic: 2, rare: 4, boss: 8 } as Record<Rank, number>,
    // Pearls: the win, and so many for each second left; out of time, so many for each power
    pearls: { won: 30, perSecond: 0.5, per: 0.3 },
    pearlsId: "abyssalPearls" as GoodId,
    spawnSpot: SPOT.shadowBarrage.impactSpot!,
    powerSpot: SPOT.blueImpact.impactSpot!,
    color: "#60d0c0",
};

// The encounters' own spot animations, baked with the game's (client/Assets.ts)
export function encounterSpotIds(): number[] {
    return [IMPLING.puff, PEST_CONTROL.shieldSpot, PEST_CONTROL.spawnSpot, BREACH.spot, BREACH.spawnSpot, RIFT_GUARDIANS.spawnSpot, RIFT_GUARDIANS.powerSpot];
}
