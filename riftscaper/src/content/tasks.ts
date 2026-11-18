// The tasks the city's folk set, as plain data: what each kind of task asks, what each of the folk
// sets and says, and what a task pays. In the way of Diablo's bounties and the Slayer masters'
// tasks: each time the hero comes home a few of the folk have one, marked over their heads; the
// hero takes up to three at once, they count in the rifts, and whoever set one pays when it's done.
// Rolled, counted and paid for in sim/tasks.ts. Starting guesses, to be tuned in play.
import type { GoodId } from "./goods";
import type { MonsterId } from "./monsters";
import type { FolkId } from "./town";

export type TaskKind = "slay" | "rares" | "guardian" | "clear" | "swift" | "chests" | "shrines" | "hoards";

// Every kind, as saves name them: never rename one
export const TASK_KIND_IDS: TaskKind[] = ["slay", "rares", "guardian", "clear", "swift", "chests", "shrines", "hoards"];

export const TASKS = {
    // Tasks held at once
    most: 3,
    // Folk with a task to offer, each time the hero comes home
    offers: 3,
    // What a task pays, by its worth (TASK_KIND): gold, this many times a monster's gold roll at
    // the hero's level at its most (four times 1 + 0.7 * level); and experience, this share of
    // what the hero's level needs
    gold: 10,
    xp: 0.15,
    // And one thing more, by these weights: an item at least rare, a handful of runes, a forged
    // gem, or a riftstone once the hero has reached their depths
    extra: { item: 4, runes: 3, forged: 1.5, riftstone: 1.5 },
    // An item's chance of being unique instead, by the task's worth
    unique: 0.05,
    // How many of the rarer runes, and which
    runes: { count: [2, 4] as [number, number], ids: ["nature", "chaos", "death", "cosmic", "soul"] as const },
    // A slaying task asks about this share of a rift's monsters of that kind, rounded to fives
    slay: { perRift: 90, least: 10, most: 40 },
};

// Over the head of someone with a task to offer, and on the minimap: the minimap's quest start
// icon; over someone whose task is done, the client's yellow hint arrow (headicons_hint), bobbing
// (riftscaper/scripts/sprite-info.ts, map-icons.ts)
export const TASK_ICONS = {
    offer: { sprite: 1454, frame: 0 },
    done: { sprite: 441, frame: 0 },
};

export type TaskKindDef = {
    // How many it asks for, at the least and most (a slaying task's goes by its monster)
    count: [number, number];
    // What it pays, a slaying task's being 1; and more for each one past the least
    worth: number;
    each?: number;
    // How far short of the deepest reached it may be set
    below: number;
};

export const TASK_KIND: Record<TaskKind, TaskKindDef> = {
    slay: { count: [0, 0], worth: 1, below: 3 },
    rares: { count: [3, 6], worth: 1.1, each: 0.1, below: 2 },
    guardian: { count: [1, 1], worth: 1.3, below: 3 },
    // and more for each modifier it asks for (TASK_MOD_WORTH)
    clear: { count: [1, 2], worth: 1, each: 0.7, below: 2 },
    swift: { count: [1, 1], worth: 1.5, below: 2 },
    chests: { count: [3, 5], worth: 0.8, each: 0.1, below: 2 },
    shrines: { count: [2, 3], worth: 0.7, each: 0.15, below: 2 },
    hoards: { count: [1, 2], worth: 1.2, each: 0.6, below: 2 },
};

export const TASK_MOD_WORTH = 0.25;

// A swift clear: the guardian dead with this share of the rift's time still left
export const SWIFT_SHARE = 0.5;

// The monsters a slaying task can name, and what they're called by the score
export const TASK_PREY: Partial<Record<MonsterId, string>> = {
    goblin: "goblins",
    giantRat: "giant rats",
    hobgoblin: "hobgoblins",
    wolf: "wolves",
    giantSpider: "giant spiders",
    werewolf: "werewolves",
    zombie: "zombies",
    skeleton: "skeletons",
    mossGiant: "moss giants",
    darkWizard: "dark wizards",
    fremennikArcher: "Fremennik archers",
    berserker: "Fremennik berserkers",
    aviansie: "aviansies",
    imp: "imps",
    lesserDemon: "lesser demons",
    tzhaarKet: "TzHaar-Ket",
    tzhaarXil: "TzHaar-Xil",
    tzhaarMej: "TzHaar-Mej",
    ork: "orks",
    ogre: "ogres",
    guard: "desert raiders",
    rockCrab: "rock crabs",
    blackDemon: "black demons",
    // The ladder's hosts' (content/ladder.ts)
    jogre: "jogres",
    greaterDemon: "greater demons",
    hellhound: "hellhounds",
    ranger: "rangers",
    knightOfSaradomin: "Knights of Saradomin",
    saradominPriest: "Saradomin priests",
    spiritualWarrior: "spiritual warriors",
    ghost: "ghosts",
    shade: "shades",
    juvinate: "vampyre juvinates",
    ghoul: "ghouls",
    vyrewatch: "Vyrewatch",
    crawlingHand: "crawling hands",
    banshee: "banshees",
    aberrantSpectre: "aberrant spectres",
    bloodveld: "bloodveld",
    gargoyle: "gargoyles",
    nechryael: "nechryael",
    abyssalDemon: "abyssal demons",
    tzKih: "Tz-Kih",
    tzKek: "Tz-Kek",
    kalphiteWorker: "Kalphite workers",
    kalphiteSoldier: "Kalphite soldiers",
    dagannoth: "dagannoth",
    grizzlyBear: "grizzly bears",
    jungleHorror: "jungle horrors",
    jungleSpider: "jungle spiders",
    babyBlueDragon: "baby blue dragons",
    babyRedDragon: "baby red dragons",
    abyssalLeech: "abyssal leeches",
    abyssalGuardian: "abyssal guardians",
    abyssalWalker: "abyssal walkers",
};

export type GiverDef = {
    // The kinds of task they set, and how likely each
    kinds: Partial<Record<TaskKind, number>>;
    // The monsters they'd sooner see slain, if they're particular; any otherwise
    prey?: MonsterId[];
    // What they say offering one, and paying for one
    ask: string;
    thanks: string;
    // A good they pay besides for a task past the campaign, so many for its worth (docs/late-game.md E)
    late?: { good: GoodId; count: number };
};

// Every one of the folk sets tasks (town.ts FOLK), each their own kinds
export const GIVERS: Record<FolkId, GiverDef> = {
    chronicler: {
        kinds: { clear: 3, guardian: 2, swift: 1 },
        ask: "The register wants first-hand accounts, not tavern talk. Go and make me one, would you?",
        thanks: "Splendid. It goes in the register, with your name beside it. And this, for your trouble.",
    },
    crier: {
        kinds: { rares: 3, guardian: 2, slay: 1 },
        ask: "Hear ye! A bounty, posted by the tower, for any walker with the stomach for it!",
        thanks: "Hear ye! The bounty is claimed! Your purse, walker. Don't spend it all at Fortunato's.",
    },
    priest: {
        kinds: { slay: 3, guardian: 2, shrines: 2 },
        prey: ["zombie", "skeleton", "werewolf", "imp", "lesserDemon", "blackDemon"],
        // The restless dead's ancient shards, which Aubury's circle makes Darklight an Arclight with
        late: { good: "ancientShard", count: 1 },
        ask: "There are things in the rifts that should have stayed in their graves, and worse that never had one. Will you see to them?",
        thanks: "Saradomin keep you. Take this; the chapel can spare it, and you've earned it.",
    },
    apprentice: {
        kinds: { swift: 2, shrines: 2, clear: 1 },
        ask: "The Archmage wants to know how the rifts hold up, and he's told me to find out. Would you find out for me?",
        thanks: "That's just what he wanted. Don't tell him it was you. Here, I'm not supposed to have this.",
    },
    farmer: {
        kinds: { slay: 4, chests: 1 },
        prey: ["giantRat", "goblin", "hobgoblin", "wolf", "giantSpider", "rockCrab", "ogre", "ork"],
        ask: "Things keep wandering out of the tear and into my field. Thin them out where they come from, would you?",
        thanks: "That'll keep them off my cabbages a while. Here, for your trouble.",
    },
    townsman: {
        kinds: { chests: 3, hoards: 2, slay: 1 },
        ask: "The lost leave their things out there, in chests nobody comes back for. Go and see what's in them.",
        thanks: "Keep what you found. My grandfather would have wanted someone to look. This is for the looking.",
    },
    townswoman: {
        kinds: { slay: 2, rares: 2, chests: 1 },
        ask: "Everyone in the market wants a story from the rifts. Bring me one worth telling and I'll make it worth your while.",
        thanks: "Oh, they'll talk about that one for a week. Here, as promised.",
    },
    carter: {
        kinds: { hoards: 3, rares: 1, clear: 1 },
        ask: "The tower pays for maps to the hoards out there, and I'd sooner haul than fight. Clear the way, and we split it.",
        thanks: "That's the map sold. Your half, as promised, and a little over.",
    },
    goodwife: {
        kinds: { shrines: 3, slay: 1, clear: 1 },
        ask: "My lad went through last spring and came home. I promised the gods my thanks at their altars out there. Would you give it for me?",
        thanks: "Bless you. Here, it's not much, but it's meant.",
    },
};

// What any of the folk say of a task they've set: still under way, and done
export const TASK_LINES = {
    held: "How goes it? Come back to me when it's done.",
    done: "It's done? Then you've earned this.",
};
