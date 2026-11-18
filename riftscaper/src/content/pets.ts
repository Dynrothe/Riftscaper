// Every OSRS guardian's pet (docs/late-game.md D): its guardian drops it now and then, into the
// collection log (sim/log.ts), and one follows the hero, chosen on the log's pets page, as a thrall
// follows (content/minions.ts) without its fighting: never hurt, blocking nothing, drawn by the
// client alone, so the sim's the same with it or without. Ids are the cache's (find-npcs.ts,
// find-objs.ts): the NPC that follows, and the item the log shows.
import type { Seqs } from "./monsters";

export type PetDef = {
    // Its guardian's id (monsters.ts BOSSES), which is its own
    id: string;
    name: string;
    npcId: number;
    objId: number;
    seqs: Pick<Seqs, "idle" | "walk">;
};

const pet = (id: string, name: string, npcId: number, objId: number, idle: number, walk: number): PetDef => ({ id, name, npcId, objId, seqs: { idle, walk } });

export const PETS: PetDef[] = [
    pet("heart", "Pet dark core", 318, 12816, 7980, 2417),
    pet("graardor", "General Graardor Jr.", 6632, 12650, 7017, 7016),
    pet("kreearra", "Kree'arra Jr.", 6631, 12649, 7166, 7167),
    pet("kril", "K'ril Tsutsaroth Jr.", 6634, 12652, 6935, 4070),
    pet("commanderZilyana", "Zilyana Jr.", 6633, 12651, 6966, 6965),
    pet("abyssalSire", "Abyssal orphan", 5883, 13262, 7125, 7124),
    pet("solHeredit", "Smol Heredit", 12767, 28960, 10874, 10880),
    pet("jad", "TzRek-Jad", 5892, 13225, 2650, 5805),
    pet("dagannothRex", "Dagannoth Rex Jr.", 6630, 12645, 2850, 2849),
    pet("kalphiteQueen", "Kalphite Princess", 6637, 12647, 6236, 6236),
    pet("vorkath", "Vorki", 8025, 21992, 7948, 7959),
    pet("cerberus", "Hellpuppy", 964, 13247, 6561, 6560),
    pet("skotizo", "Skotos", 425, 21273, 6935, 4070),
    pet("vetion", "Vet'ion Jr.", 5536, 13179, 9965, 9967),
    pet("sarachnis", "Sraracha", 2143, 23495, 8320, 8319),
    pet("callisto", "Callisto cub", 497, 13178, 10011, 10010),
    pet("venenatis", "Venenatis spiderling", 495, 13177, 9986, 9987),
    pet("kingBlackDragon", "Prince Black Dragon", 6636, 12653, 90, 4635),
    pet("scorpia", "Scorpia's offspring", 5547, 13181, 6258, 6257),
    pet("chaosElemental", "Pet chaos elemental", 2055, 11995, 3144, 3145),
    pet("kraken", "Pet kraken", 6640, 12655, 3989, 3989),
    pet("zulrah", "Pet snakeling", 2127, 12921, 1721, 2405),
    pet("wardens", "Tumeken's guardian", 11652, 27352, 9655, 9651),
];

export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));

// How often a guardian drops its pet: a Diablo-length chase, not OSRS's 1 in 5,000; twice as often
// with Ghommal's fifth hilt (achievements.ts)
export const PET_CHANCE = { guardian: 1 / 250, awakened: 1 / 50 };

// How a pet follows: so far behind, at most so fast, and how near before it stops
export const PET_FOLLOW = { behind: 1.6, speed: 7, near: 0.6 };
