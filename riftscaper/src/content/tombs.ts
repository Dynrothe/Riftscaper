// The Tombs of Amascut, the raid (docs/late-game.md G), a pinnacle (content/pinnacles.ts) made from
// OSRS's own, and laid out as its own is: the hero comes in by Osmumten, beside the Nexus, a hall
// with a chamber off it for each of the four paths (world/riftLayout.ts's nexus). The paths are
// taken in any order: walking into a chamber raises its room, a guardian with its own at its side,
// up through the sand. Once the four are beaten the Wardens wake in the Nexus itself, and their
// fall opens the way home there. Before it's opened, invocations chosen at the Archmage's: each a
// harder rule held to the whole way, worth so much raid level, and the raid level pays, more items
// and rarer from every room, and a better chance of the Wardens' second unique. A run is what was
// chosen, as a Colosseum run is what was taken. Numbers are the sim's (Game.ts); every id is the
// cache's (find-npcs.ts, seq-sheet.ts).
import type { BossId, MonsterId } from "./monsters";
import type { RiftEffect } from "./riftMods";
import { SPOT } from "./visuals";

export type InvocationId = "walkThePath" | "overclocked" | "insanity" | "feelingSpecial" | "bloodThinners" | "aerialAssault" | "moreOverlords" | "doubleTrouble" | "onADiet" | "jogForIt";

export type InvocationDef = {
    id: InvocationId;
    name: string;
    // What it does, the whole raid
    text: string;
    // The raid level it's worth
    level: number;
    // On every monster of the raid, as a rift's modifiers are (riftMods.ts)
    effect?: Partial<RiftEffect>;
    // Each room this many more of its first add, and so many of its adds rares
    more?: number;
    rares?: number;
    // No potion drunk in the Tombs
    noPotions?: boolean;
    // The Tombs collapse in so many minutes, as a rift does when its time's up
    minutes?: number;
};

// OSRS's invocations' names, each a rule of this game's own that's near what it does there
export const INVOCATIONS: Record<InvocationId, InvocationDef> = {
    walkThePath: { id: "walkThePath", name: "Walk the Path", text: "Monsters have 25% more life", level: 20, effect: { monsterLife: 0.25 } },
    overclocked: { id: "overclocked", name: "Overclocked", text: "Monsters move and attack 15% faster", level: 20, effect: { monsterSpeed: 0.15 } },
    insanity: { id: "insanity", name: "Insanity", text: "The guardians have 50% more life and hit 25% harder", level: 40, effect: { bossLife: 0.5, bossDamage: 0.25 } },
    feelingSpecial: { id: "feelingSpecial", name: "Feeling Special?", text: "The guardians use their specials half again as often", level: 20, effect: { bossSpecial: 0.5 } },
    bloodThinners: { id: "bloodThinners", name: "Blood Thinners", text: "Monsters regenerate 1% of their life a second", level: 10, effect: { regen: 0.01 } },
    aerialAssault: { id: "aerialAssault", name: "Aerial Assault", text: "A fifth of every hit on you comes again as the sun's fire", level: 15, effect: { elemental: 0.2 } },
    moreOverlords: { id: "moreOverlords", name: "More Overlords", text: "Each room has two more of its first add", level: 15, more: 2 },
    doubleTrouble: { id: "doubleTrouble", name: "Double Trouble", text: "A rare leads each room's adds", level: 25, rares: 1 },
    onADiet: { id: "onADiet", name: "On a Diet", text: "No potion can be drunk in the Tombs", level: 15, noPotions: true },
    jogForIt: { id: "jogForIt", name: "Jog for It", text: "The Tombs collapse in 10 minutes", level: 20, minutes: 10 },
};

export const INVOCATION_IDS = Object.keys(INVOCATIONS) as InvocationId[];

export function isInvocation(id: unknown): id is InvocationId {
    return typeof id === "string" && Object.prototype.hasOwnProperty.call(INVOCATIONS, id);
}

// What the chosen invocations are worth together
export function raidLevel(ids: readonly InvocationId[]): number {
    return ids.reduce((sum, id) => sum + INVOCATIONS[id].level, 0);
}

// A room: its guardian, and what's at its side
export type TombsRoom = { name: string; boss: BossId; adds: [MonsterId, number][] };

export const TOMBS = {
    // Who leads the hero through (find-npcs.ts 11690), standing this far from where they come in
    osmumten: { npcId: 11690, name: "Osmumten", by: 3 },
    // How far into a chamber the hero comes to raise its room, as a share of how far it reaches;
    // how near the Nexus's middle they come, with the paths beaten, to wake the Wardens, and the
    // seconds they take to rise; and the ring round a room's middle it rises on
    enter: 0.7,
    nexus: 14,
    rest: 3,
    ring: [6, 10] as [number, number],
    // On land drawn without a nexus (the tests' plain field, the open shape in development), the
    // chambers this far from where the hero comes in, and reaching this far
    fallback: { reach: 22, r: 9 },
    // A path's guardian made this much tougher, and the Wardens this much, as Sol Heredit is
    path: { life: 1.8, damage: 1.1 },
    wardens: { life: 2.5, damage: 1.2 },
    // Each raid level: more items, rarer, for the rest of the run, and a better chance of the
    // Wardens' second unique (at 200, the most, 40% more of each and half again the chance)
    perLevel: { quantity: 0.002, rarity: 0.002, second: 0.002 },
    spawnSpot: SPOT.dust.impactSpot!,
    color: "#e0c070",
    // The four paths, then the Wardens, Elidinis' beside Tumeken's
    rooms: [
        { name: "The Path of Het", boss: "akkha", adds: [["akkhaShadow", 2]] },
        {
            name: "The Path of Apmeken",
            boss: "baba",
            adds: [
                ["baboonBrawler", 3],
                ["baboonMage", 2],
            ],
        },
        { name: "The Path of Scabaras", boss: "kephri", adds: [["soldierScarab", 3]] },
        { name: "The Path of Crondis", boss: "zebak", adds: [] },
        { name: "The Wardens", boss: "wardens", adds: [["elidinisWarden", 1]] },
    ] as TombsRoom[],
};

// Every monster and guardian the Tombs can raise, for the bake
export function tombsMonsters(): MonsterId[] {
    return [...new Set(TOMBS.rooms.flatMap((r) => r.adds.map(([id]) => id)))];
}

export function tombsGuardians(): BossId[] {
    return TOMBS.rooms.map((r) => r.boss).filter((id) => id !== "wardens");
}
