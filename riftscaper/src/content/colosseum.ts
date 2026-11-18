// The Fortis Colosseum, a pinnacle (content/pinnacles.ts) made from OSRS's own: twelve waves in
// its sand, Minimus calling them, and after each wave a choice of three glories, a harder rule
// that pays the better for it, as Diablo IV's Infernal Hordes' boons and banes are. The twelfth
// is Sol Heredit, who drops the Colosseum's own uniques: more often the more glory was taken. A
// run is a set of choices, so no two are the same. Numbers are the sim's (Game.ts); every id is
// the cache's (npc-info.ts, find-objs.ts).
import type { MonsterMod } from "./monsterMods";
import type { MonsterId } from "./monsters";
import type { RiftEffect } from "./riftMods";
import { SPOT } from "./visuals";

export type GloryId = "relentless" | "doom" | "redFlag" | "totemic" | "quartet" | "dynamicDuo" | "mantimayhem" | "volatility" | "frailty" | "solarflare";

export type GloryDef = {
    id: GloryId;
    name: string;
    // What it does, at each of its levels
    text: string;
    // How much glory it's worth, each time it's taken
    glory: number;
    // On every monster from the next wave on, each level of it
    effect?: Partial<RiftEffect>;
    // Each wave this many more of its first monster, this many more rares, one more of this, or
    // every monster with this mod
    more?: number;
    rares?: number;
    extra?: MonsterId;
    mod?: MonsterMod;
};

export const GLORIES: Record<GloryId, GloryDef> = {
    relentless: { id: "relentless", name: "Relentless", text: "Monsters have 20% more life", glory: 2, effect: { monsterLife: 0.2 } },
    doom: { id: "doom", name: "Doom", text: "Monsters deal 15% more damage", glory: 2, effect: { monsterDamage: 0.15 } },
    redFlag: { id: "redFlag", name: "Red Flag", text: "Monsters move and attack 12% faster", glory: 2, effect: { monsterSpeed: 0.12 } },
    totemic: { id: "totemic", name: "Totemic", text: "Monsters have 40% more armour", glory: 1, effect: { monsterArmour: 0.4 } },
    quartet: { id: "quartet", name: "Quartet", text: "Each wave has two more of its first monster", glory: 1, more: 2 },
    dynamicDuo: { id: "dynamicDuo", name: "Dynamic Duo", text: "Each wave has another rare at its head", glory: 3, rares: 1 },
    mantimayhem: { id: "mantimayhem", name: "Mantimayhem", text: "A manticore joins each wave", glory: 3, extra: "manticore" },
    volatility: { id: "volatility", name: "Volatility", text: "Monsters are Molten: the ground they cross burns", glory: 2, mod: "molten" },
    frailty: { id: "frailty", name: "Frailty", text: "Monsters regenerate 1% of their life a second", glory: 1, effect: { regen: 0.01 } },
    solarflare: { id: "solarflare", name: "Solarflare", text: "A fifth of every hit on you comes again as the sun's fire", glory: 2, effect: { elemental: 0.2 } },
};

export const GLORY_IDS = Object.keys(GLORIES) as GloryId[];

export const COLOSSEUM = {
    // Who calls the waves and offers the glories (npc-info.ts 12807), standing this far from the
    // sand's middle towards the gate the hero comes in by
    minimus: { npcId: 12807, name: "Minimus", by: 4 },
    // How near the sand's middle the hero comes to start the first wave (on to the sand, which
    // reaches 24 tiles or more from it: world/riftLayout.ts's pit), the seconds before each wave,
    // and the ring round the sand's middle it comes in on
    start: 18,
    rest: 4,
    ring: [6, 10] as [number, number],
    // Three glories offered after each wave, each taken no more than three times
    offer: 3,
    most: 3,
    // Each point of glory: more items, rarer, for the rest of the run, and a better chance of Sol
    // Heredit's second unique
    perGlory: { quantity: 0.04, rarity: 0.04, second: 0.03 },
    // From this wave the monsters are magic, and from this one a rare leads them
    magicFrom: 5,
    rareFrom: 9,
    // What a cleared wave drops, and from which wave a hoard's worth
    hoardFrom: 6,
    // Sol Heredit is made this much tougher, as a god's general is in his stronghold
    life: 2.5,
    damage: 1.2,
    spawnSpot: SPOT.dust.impactSpot!,
    color: "#e0a040",
    // The twelve, each what comes in and how many: the last is Sol Heredit's
    waves: [
        [
            ["jaguarWarrior", 3],
            ["serpentShaman", 1],
        ],
        [
            ["jaguarWarrior", 3],
            ["serpentShaman", 2],
        ],
        [
            ["minotaur", 1],
            ["jaguarWarrior", 2],
            ["serpentShaman", 1],
        ],
        [
            ["fremennikArcher", 2],
            ["fremennikSeer", 1],
            ["berserker", 1],
            ["jaguarWarrior", 1],
        ],
        [
            ["javelinColossus", 1],
            ["jaguarWarrior", 2],
            ["serpentShaman", 2],
        ],
        [
            ["minotaur", 1],
            ["fremennikArcher", 2],
            ["fremennikSeer", 1],
            ["berserker", 1],
        ],
        [
            ["manticore", 1],
            ["jaguarWarrior", 2],
            ["serpentShaman", 1],
        ],
        [
            ["shockwaveColossus", 1],
            ["javelinColossus", 1],
            ["berserker", 2],
        ],
        [
            ["manticore", 1],
            ["minotaur", 1],
            ["fremennikSeer", 2],
        ],
        [
            ["javelinColossus", 2],
            ["shockwaveColossus", 1],
            ["jaguarWarrior", 2],
        ],
        [
            ["manticore", 2],
            ["minotaur", 1],
            ["serpentShaman", 2],
        ],
        [["jaguarWarrior", 2]],
    ] as [MonsterId, number][][],
};

// Every monster the Colosseum can send, for the bake
export function colosseumMonsters(): MonsterId[] {
    const ids = new Set<MonsterId>();
    for (const wave of COLOSSEUM.waves) {
        for (const [id] of wave) {
            ids.add(id);
        }
    }
    for (const g of GLORY_IDS) {
        if (GLORIES[g].extra) {
            ids.add(GLORIES[g].extra!);
        }
    }
    return [...ids];
}
