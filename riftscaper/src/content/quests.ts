// Reldo's quests, as plain data: Diablo II's, that leave something for good. One for each zone of
// the first lap, each asking something of that zone's rifts (the first two laps', depths 1 to 16),
// set by Reldo, the city's chronicler and its Deckard Cain. They count in the rifts as the folk's
// tasks do, and each is claimed from him once it's done, once. Counted and paid for in
// sim/quests.ts.
import type { StatLine } from "./items";
import type { BossId, MonsterId } from "./monsters";
import type { RiftModId } from "./riftMods";

export type QuestId = "greenway" | "gloomwood" | "marsh" | "barrows" | "frostmarch" | "ashen" | "dunes" | "abyss";

// Every quest, in the order Reldo's log has them, as saves name them: never rename one
export const QUEST_IDS: QuestId[] = ["greenway", "gloomwood", "marsh", "barrows", "frostmarch", "ashen", "dunes", "abyss"];

// What one asks, in a rift of its zone
export type QuestGoal =
    // Every monster in one rift slain, the guardian's pack too
    | { kind: "clearAll" }
    // Its guardian slain, in a rift woven with a modifier if it says
    | { kind: "boss"; boss: BossId; mod?: RiftModId }
    // A rare led by each of these slain, in any of its rifts
    | { kind: "leaders"; leaders: MonsterId[] }
    // Its guardian slain with half the rift's time still left
    | { kind: "swift" };

// What it leaves, for good
export type QuestReward =
    // A passive point more
    | { kind: "point" }
    // The gem trader adds a socket for nothing, once
    | { kind: "socket" }
    // The gem trader makes a normal item worn rare, at the best tiers for the hero's level, once
    | { kind: "imbue" }
    // Numbers of the hero's, as a passive's are
    | { kind: "stats"; stats: StatLine[] }
    // A riftstone, woven with so many modifiers, at the deepest the hero has reached
    | { kind: "riftstone"; mods: number }
    // The Archmage offers one more version of each rift
    | { kind: "offer" };

export type QuestDef = {
    name: string;
    // Its zone, of content/zones.ts ZONES
    zone: number;
    goal: QuestGoal;
    reward: QuestReward;
    // What it asks, in a line, and what it leaves
    ask: string;
    gives: string;
    // What Reldo says of it
    tale: string;
};

export const QUESTS: Record<QuestId, QuestDef> = {
    greenway: {
        name: "Clearing the Way",
        zone: 0,
        goal: { kind: "clearAll" },
        reward: { kind: "point" },
        ask: "Slay every monster in one rift of the Greenway",
        gives: "A passive point",
        tale: "Every walker's first rift is the Greenway, and every walker leaves half of it standing. Clear one, to the last goblin, and the register has something for those who finish what they start.",
    },
    gloomwood: {
        name: "Bloodmoon's Heart",
        zone: 1,
        goal: { kind: "boss", boss: "werewolfAlpha" },
        reward: { kind: "socket" },
        ask: "Slay Bloodmoon, Alpha of the Pack, in Gloomwood",
        gives: "The gem trader adds a socket for nothing, once",
        tale: "The pack in Gloomwood runs under one wolf, and the register has a page of the walkers it's had. End it. The gem trader owes me a favour, and I'll see it's yours.",
    },
    marsh: {
        name: "The Count's Coffin",
        zone: 2,
        goal: { kind: "boss", boss: "countDraynor" },
        reward: { kind: "imbue" },
        ask: "Slay Count Draynor, Lord of the Marsh, in the Fetid Marsh",
        gives: "The gem trader imbues a normal item you wear: rare, at the best tiers for your level, once",
        tale: "Draynor was a lord before the marsh took him, and he keeps a lord's hours. Put a stake through him and the gem trader will work an imbue for you, as for the old walkers.",
    },
    barrows: {
        name: "The Brothers' Rest",
        zone: 3,
        goal: { kind: "leaders", leaders: ["dharok", "ahrim", "karil"] },
        reward: { kind: "stats", stats: [
            { stat: "str", value: 5 },
            { stat: "dex", value: 5 },
            { stat: "int", value: 5 },
        ] },
        ask: "Slay a rare led by each of Dharok, Ahrim and Karil in the Barrow Fields",
        gives: "+5 to every attribute",
        tale: "Three of the Barrows brothers walk the fields with their own warbands. Lay each of them to rest, and what the register knows of their training is yours.",
    },
    frostmarch: {
        name: "Kree'arra's Feather",
        zone: 4,
        goal: { kind: "boss", boss: "kreearra" },
        reward: { kind: "stats", stats: [{ stat: "life", value: 20 }] },
        ask: "Slay Kree'arra, Lord of the Skies, in Frostmarch",
        gives: "+20 to maximum life",
        tale: "Armadyl's bird holds the Frostmarch's skies. Bring it down and pluck me a feather: the Apothecary's old potion of life needs one, and it lasts for good.",
    },
    ashen: {
        name: "The Fury's End",
        zone: 5,
        goal: { kind: "boss", boss: "jad", mod: "fleeting" },
        reward: { kind: "stats", stats: [{ stat: "allRes", value: 10 }] },
        ask: "Slay TzTok-Jad in a Fleeting rift of the Ashen Wastes",
        gives: "+10% to all resistances",
        tale: "Anyone can kill Jad given the time. The TzHaar say a walker who does it as the rift closes has their fire in them after. I'd like to see that written down.",
    },
    dunes: {
        name: "Against the Sands",
        zone: 6,
        goal: { kind: "swift" },
        reward: { kind: "riftstone", mods: 3 },
        ask: "Clear a rift of the Sunscorch Dunes with half its time still left",
        gives: "A riftstone of three modifiers",
        tale: "The Dunes eat time: walkers go in at noon and come out at dusk, if they come out. Beat the sands, and I'll give you a stone the tower would sell its hat for.",
    },
    abyss: {
        name: "Zamorak's Hand",
        zone: 7,
        goal: { kind: "boss", boss: "kril" },
        reward: { kind: "offer" },
        ask: "Slay K'ril Tsutsaroth, Zamorak's Hand, in the Abyssal Rift",
        gives: "The Archmage offers one more version of each rift",
        tale: "At the bottom of the first rifts there's a general of Zamorak's, and the Archmage can't see past him. Kill him, and the tower's sight goes further.",
    },
};

// What Reldo says of them all, opening his log, and of one done
export const QUEST_LINES = {
    log: "The register has the old walkers' deeds in it, and a few they never finished. Finish them, and each leaves you something for good.",
    done: "It's done? Then it goes in the register, and this is yours.",
};
