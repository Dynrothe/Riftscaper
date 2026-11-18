// The rift web (sim/web.ts), as plain data: past rift 16 the Archmage's versions of the deepest rift
// reached are the web's, as Path of Exile's atlas and Last Epoch's monoliths are. Lanes run side by
// side, with a rift at each depth on each, rolled from the hero's web and its place there and kept
// till it's done, and each with a bounty shown. The hero stands on the lane of the last rift they
// cleared at their deepest, and the rifts open to them a depth on are that lane's and those beside
// it; the depth past those shows its bounties, so a lane's chosen for what's ahead as well as what's
// here.
export const WEB = {
    lanes: 5,
    // Where a hero starts, and how far to either side the next depth's open to them
    start: 2,
    reach: 1,
    // How many of a node's modifiers, at the most (the Archmage's own offers' most)
    mods: 3,
};

export type BountyId = "talisman" | "herbs" | "set" | "forged" | "runes" | "potions" | "unique" | "xp";

// Every bounty, as saves name them: never rename one
export const BOUNTY_IDS: BountyId[] = ["talisman", "herbs", "set", "forged", "runes", "potions", "unique", "xp"];

export type BountyDef = {
    name: string;
    // What it gives, as the Archmage's panel says it
    text: string;
    // How often a node has it
    weight: number;
};

export const BOUNTIES: Record<BountyId, BountyDef> = {
    talisman: { name: "Talisman", text: "Its guardian drops a talisman", weight: 3 },
    herbs: { name: "Herbs", text: "Its guardian drops a hoard of herbs", weight: 3 },
    set: { name: "Set piece", text: "Its guardian drops a set piece", weight: 2 },
    forged: { name: "Forged gem", text: "Its guardian drops a forged gem", weight: 2 },
    runes: { name: "Runes", text: "Twice the runes", weight: 3 },
    potions: { name: "Potions", text: "Its guardian drops three potions", weight: 2 },
    unique: { name: "Unique", text: "Its guardian drops a unique", weight: 1 },
    xp: { name: "Experience", text: "Half as much experience again", weight: 2 },
};

// The herbs' bounty: so many stacks of the best herbs the depth's level has, so many a stack
export const BOUNTY_HERBS = { stacks: 3, each: 3 };
