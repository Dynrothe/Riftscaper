// Rift modifiers, as plain data, in the way of Path of Exile's map mods: Sedridor offers a few
// versions of every rift he opens, some of them woven with modifiers. Each modifier makes the rift
// harder in one way and pays for it: more items fall there (quantity), better ones (rarity), more
// runes, and kills teach more. The sim adds a rift's modifiers up and lays them over its monsters
// and its loot (sim/riftMods.ts). Starting guesses, to be tuned.

export type RiftModId =
    | "hasted"
    | "hardy"
    | "brutal"
    | "armoured"
    | "teeming"
    | "swarming"
    | "empowered"
    | "elemental"
    | "vampiric"
    | "regenerating"
    | "enraged"
    | "fleeting";

// What a modifier does to the rift. Shares are "more": 0.4 is 40% more.
export type RiftEffect = {
    // Every monster's, the guardian's too
    monsterLife: number;
    monsterDamage: number;
    monsterArmour: number;
    // Moves and attacks this much faster
    monsterSpeed: number;
    // This many more packs over the land, as a share, and this many more monsters in each pack
    packs: number;
    packSize: number;
    // Magic and rare packs this much more common
    empowered: number;
    // This share of every hit's damage on the hero comes again as fire, cold or lightning, which
    // armour doesn't stop
    elemental: number;
    // A monster's blow heals it by this share of its life
    leech: number;
    // Life a monster regenerates a second, as a share of its life
    regen: number;
    // The guardian's own: more life and damage, and its special this much more often
    bossLife: number;
    bossDamage: number;
    bossSpecial: number;
    // More time before the rift collapses (less, under 0), as a share of its own (RIFT_TIME)
    time: number;
};

// What a modifier pays, as increases: 0.12 is 12% more items, rarity, runes or experience
export type RiftReward = { quantity: number; rarity: number; runes: number; xp: number };

export type RiftModDef = {
    id: RiftModId;
    name: string;
    // What it does, as the Archmage's panel and the HUD say it
    text: string;
    effect: Partial<RiftEffect>;
    reward: RiftReward;
    // The shallowest rift it's woven into
    depth: number;
    // How often it's rolled against the others
    weight: number;
};

// No rift has more than this many
export const MAX_RIFT_MODS = 3;
// How many versions of a rift Sedridor offers
export const RIFT_OFFERS = 3;

export const RIFT_MODS: Record<RiftModId, RiftModDef> = {
    hasted: {
        id: "hasted",
        name: "Hasted",
        text: "Monsters move and attack 25% faster",
        effect: { monsterSpeed: 0.25 },
        reward: { quantity: 0.12, rarity: 0.1, runes: 0.12, xp: 0.08 },
        depth: 1,
        weight: 10,
    },
    hardy: {
        id: "hardy",
        name: "Hardy",
        text: "Monsters have 40% more life; the rift lasts 15% longer",
        effect: { monsterLife: 0.4, time: 0.15 },
        reward: { quantity: 0.12, rarity: 0.1, runes: 0.1, xp: 0.1 },
        depth: 1,
        weight: 10,
    },
    brutal: {
        id: "brutal",
        name: "Brutal",
        text: "Monsters deal 25% more damage",
        effect: { monsterDamage: 0.25 },
        reward: { quantity: 0.12, rarity: 0.12, runes: 0.1, xp: 0.08 },
        depth: 1,
        weight: 10,
    },
    armoured: {
        id: "armoured",
        name: "Ironclad",
        text: "Monsters have twice the armour; the rift lasts 10% longer",
        effect: { monsterArmour: 1, time: 0.1 },
        reward: { quantity: 0.08, rarity: 0.08, runes: 0.08, xp: 0.06 },
        depth: 1,
        weight: 8,
    },
    teeming: {
        id: "teeming",
        name: "Teeming",
        text: "40% more monster packs",
        effect: { packs: 0.4 },
        reward: { quantity: 0.1, rarity: 0.05, runes: 0.1, xp: 0.05 },
        depth: 1,
        weight: 8,
    },
    swarming: {
        id: "swarming",
        name: "Swarming",
        text: "Packs have two more monsters",
        effect: { packSize: 2 },
        reward: { quantity: 0.08, rarity: 0.05, runes: 0.08, xp: 0.05 },
        depth: 2,
        weight: 8,
    },
    empowered: {
        id: "empowered",
        name: "Empowered",
        text: "Magic and rare packs are 50% more common",
        effect: { empowered: 0.5 },
        reward: { quantity: 0.06, rarity: 0.08, runes: 0.06, xp: 0.05 },
        depth: 3,
        weight: 7,
    },
    elemental: {
        id: "elemental",
        name: "Elemental",
        text: "Monsters' hits deal 30% more as fire, cold or lightning, which armour doesn't stop",
        effect: { elemental: 0.3 },
        reward: { quantity: 0.14, rarity: 0.12, runes: 0.14, xp: 0.1 },
        depth: 3,
        weight: 8,
    },
    vampiric: {
        id: "vampiric",
        name: "Vampiric",
        text: "Monsters' blows heal them by 4% of their life",
        effect: { leech: 0.04 },
        reward: { quantity: 0.08, rarity: 0.08, runes: 0.08, xp: 0.06 },
        depth: 2,
        weight: 7,
    },
    regenerating: {
        id: "regenerating",
        name: "Regenerating",
        text: "Monsters regenerate 2% of their life a second; the rift lasts 10% longer",
        effect: { regen: 0.02, time: 0.1 },
        reward: { quantity: 0.08, rarity: 0.06, runes: 0.08, xp: 0.06 },
        depth: 2,
        weight: 7,
    },
    enraged: {
        id: "enraged",
        name: "Enraged guardian",
        text: "The guardian has 60% more life, hits 30% harder and uses its special 50% more often; the rift lasts 10% longer",
        effect: { bossLife: 0.6, bossDamage: 0.3, bossSpecial: 0.5, time: 0.1 },
        reward: { quantity: 0.1, rarity: 0.15, runes: 0.15, xp: 0.08 },
        depth: 1,
        weight: 8,
    },
    // A race: the rift's time cut by a third, paid for well
    fleeting: {
        id: "fleeting",
        name: "Fleeting",
        text: "The rift collapses in a third less time",
        effect: { time: -0.35 },
        reward: { quantity: 0.16, rarity: 0.16, runes: 0.14, xp: 0.12 },
        depth: 2,
        weight: 8,
    },
};

export const RIFT_MOD_IDS = Object.keys(RIFT_MODS) as RiftModId[];

export function isRiftMod(id: unknown): id is RiftModId {
    return typeof id === "string" && Object.prototype.hasOwnProperty.call(RIFT_MODS, id);
}
