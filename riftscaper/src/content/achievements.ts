// Combat achievements, OSRS's six tiers (docs/late-game.md D): never offered and never given up,
// counted from what the sim sees (Game.ts achieve, as sim/tasks.ts counts the folk's), and saved
// by id, so an id once written is never changed. For each guardian: its kill, its kill untouched
// by its specials, and its kill soon after it wakes; for each pinnacle's, its awakened kill; and a
// dozen for the rifts and the encounters. Their points open Ghommal's hilts, each a convenience,
// not power. The tiers of each guardian are first guesses, by how deep it's met.
import { BOSSES } from "./monsters";

export type AchievementTier = "easy" | "medium" | "hard" | "elite" | "master" | "grandmaster";
export const ACHIEVEMENT_TIERS: AchievementTier[] = ["easy", "medium", "hard", "elite", "master", "grandmaster"];
export const TIER_NAMES: Record<AchievementTier, string> = { easy: "Easy", medium: "Medium", hard: "Hard", elite: "Elite", master: "Master", grandmaster: "Grandmaster" };
export const TIER_POINTS: Record<AchievementTier, number> = { easy: 1, medium: 2, hard: 3, elite: 4, master: 5, grandmaster: 6 };

export type AchievementGoal =
    // Slay a guardian (or a roaming boss), awakened if it says
    | { kind: "kill"; boss: string; awakened?: boolean }
    // Slay it without one of its specials landing on you
    | { kind: "untouched"; boss: string }
    // Slay it within so many seconds of its waking
    | { kind: "swift"; boss: string; seconds: number }
    // Slay a pinnacle's guardian with no hireling beside you and no prayer on
    | { kind: "alone" }
    // Clear a rift this deep; one woven with so many modifiers; one with this share of its time
    // left; one on the ladder with no potion drunk
    | { kind: "clear"; depth: number }
    | { kind: "mods"; count: number }
    | { kind: "quick"; left: number }
    | { kind: "dry" }
    // Dare so many waves of the Fight Caves; win the Colosseum with so much glory; beat the
    // Wardens at so high a raid level
    | { kind: "caves"; waves: number }
    | { kind: "glory"; count: number }
    | { kind: "raid"; level: number }
    // Come to a level
    | { kind: "level"; level: number };

export type AchievementDef = { id: string; name: string; tier: AchievementTier; goal: AchievementGoal; text: string };

// Each guardian's tier for its kill; untouched and swift are a tier harder
const BOSS_TIER: Record<string, AchievementTier> = {
    ogreChief: "easy",
    obor: "easy",
    bryophyta: "easy",
    evilChicken: "easy",
    crazyArchaeologist: "easy",
    werewolfAlpha: "easy",
    countDraynor: "medium",
    ahrimBoss: "medium",
    sarachnis: "medium",
    chaosElemental: "medium",
    scorpia: "medium",
    kingBlackDragon: "medium",
    jungleDemon: "medium",
    jad: "hard",
    kreearra: "hard",
    graardor: "hard",
    kril: "hard",
    commanderZilyana: "hard",
    vetion: "hard",
    dagannothRex: "hard",
    kalphiteQueen: "hard",
    callisto: "hard",
    venenatis: "hard",
    skotizo: "hard",
    tormentedDemon: "hard",
    cerberus: "hard",
    kraken: "hard",
    zulrah: "elite",
    akkha: "elite",
    baba: "elite",
    kephri: "elite",
    zebak: "elite",
    vorkath: "elite",
    abyssalSire: "elite",
    solHeredit: "elite",
    heart: "master",
    wardens: "master",
};

// The pinnacles' guardians, whose awakened kill is its own achievement (Grandmaster for the Heart's
// and Sol Heredit's)
const AWAKENED_TIER: Record<string, AchievementTier> = {
    graardor: "master",
    kreearra: "master",
    kril: "master",
    commanderZilyana: "master",
    abyssalSire: "master",
    solHeredit: "grandmaster",
    heart: "grandmaster",
};

const SWIFT_SECONDS = 45;

function harder(tier: AchievementTier): AchievementTier {
    return ACHIEVEMENT_TIERS[Math.min(ACHIEVEMENT_TIERS.length - 1, ACHIEVEMENT_TIERS.indexOf(tier) + 1)];
}

function bossAchievements(): AchievementDef[] {
    const out: AchievementDef[] = [];
    for (const [id, tier] of Object.entries(BOSS_TIER)) {
        const def = (BOSSES as Record<string, { name: string }>)[id];
        if (!def) {
            continue;
        }
        const name = def.name;
        out.push({ id: `${id}:kill`, name: `${name} slain`, tier, goal: { kind: "kill", boss: id }, text: `Slay ${name}.` });
        out.push({ id: `${id}:untouched`, name: `${name} untouched`, tier: harder(tier), goal: { kind: "untouched", boss: id }, text: `Slay ${name} without one of its specials landing on you.` });
        out.push({ id: `${id}:swift`, name: `${name} in haste`, tier: harder(tier), goal: { kind: "swift", boss: id, seconds: SWIFT_SECONDS }, text: `Slay ${name} within ${SWIFT_SECONDS} seconds of its waking.` });
        const awake = AWAKENED_TIER[id];
        if (awake) {
            out.push({ id: `${id}:awakened`, name: `${name} awakened`, tier: awake, goal: { kind: "kill", boss: id, awakened: true }, text: `Slay ${name} in its awakened pinnacle.` });
        }
    }
    return out;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    ...bossAchievements(),
    { id: "clear:17", name: "Up the ladder", tier: "medium", goal: { kind: "clear", depth: 17 }, text: "Clear a rift of the ladder." },
    { id: "clear:25", name: "Higher still", tier: "hard", goal: { kind: "clear", depth: 25 }, text: "Clear rift 25." },
    { id: "clear:33", name: "Third lap", tier: "elite", goal: { kind: "clear", depth: 33 }, text: "Clear rift 33." },
    { id: "clear:41", name: "Where few go", tier: "master", goal: { kind: "clear", depth: 41 }, text: "Clear rift 41." },
    { id: "clear:50", name: "The deep end", tier: "grandmaster", goal: { kind: "clear", depth: 50 }, text: "Clear rift 50." },
    { id: "mods:4", name: "Woven tight", tier: "hard", goal: { kind: "mods", count: 4 }, text: "Clear a rift woven with four modifiers." },
    { id: "quick", name: "Time to spare", tier: "elite", goal: { kind: "quick", left: 0.75 }, text: "Clear a rift with three quarters of its time left." },
    { id: "dry", name: "Dry run", tier: "hard", goal: { kind: "dry" }, text: "Clear a rift of the ladder without drinking a potion." },
    { id: "alone", name: "On your own", tier: "elite", goal: { kind: "alone" }, text: "Slay a pinnacle's guardian with no hireling beside you and no prayer on." },
    { id: "caves:6", name: "Daring the caves", tier: "elite", goal: { kind: "caves", waves: 6 }, text: "Dare six waves of the Fight Caves." },
    { id: "glory:12", name: "Glorious", tier: "grandmaster", goal: { kind: "glory", count: 12 }, text: "Win the Colosseum having taken glory after every wave." },
    { id: "raid:100", name: "Expert mode", tier: "master", goal: { kind: "raid", level: 100 }, text: "Beat the Wardens at raid level 100 or higher." },
    { id: "raid:200", name: "Every invocation", tier: "grandmaster", goal: { kind: "raid", level: 200 }, text: "Beat the Wardens with every invocation chosen." },
    { id: "level:99", name: "Maxed", tier: "master", goal: { kind: "level", level: 99 }, text: "Come to level 99." },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// Ghommal's hilts, OSRS's rewards for its tiers: each opened by so many points, and each a
// convenience (Game.ts, Client.ts and sim/pinnacles.ts read them)
export type HiltPerk = "teleport" | "offer" | "key" | "orb" | "pet" | "time";
export type HiltDef = { n: number; name: string; objId: number; points: number; perk: HiltPerk; text: string };

export const HILTS: HiltDef[] = [
    { n: 1, name: "Ghommal's hilt 1", objId: 25926, points: 10, perk: "teleport", text: "The teleport home takes 2 seconds, not 4" },
    { n: 2, name: "Ghommal's hilt 2", objId: 25928, points: 30, perk: "offer", text: "The Archmage offers a version more of each rift" },
    { n: 3, name: "Ghommal's hilt 3", objId: 25930, points: 60, perk: "key", text: "A pinnacle's key takes a quarter less" },
    { n: 4, name: "Ghommal's hilt 4", objId: 25932, points: 100, perk: "orb", text: "An awakened pinnacle gives its Awakener's orb back, one time in four" },
    { n: 5, name: "Ghommal's hilt 5", objId: 25934, points: 150, perk: "pet", text: "Pets come twice as often" },
    { n: 6, name: "Ghommal's hilt 6", objId: 25936, points: 220, perk: "time", text: "A rift's time runs a quarter longer" },
];

// The collection log's own book, its tab's icon
export const COLLECTION_LOG = { objId: 22711 };

export const HILT = { teleportSeconds: 2, keyLess: 0.25, orbBack: 0.25, petMore: 2, timeMore: 0.25 };
