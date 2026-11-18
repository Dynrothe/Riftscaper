// The transmuting circle, Diablo II's cube, at Aubury's: things laid in it, and one thing back
// (sim/circle.ts). Every recipe is listed at his bench but one. Three of a rune give one of the next (the
// pouch's order, content/runes.ts), up to the ladder's high runes, which is a use for every rune
// that piles up; three herbs give one of the next; three riftstones of a depth give one a depth
// deeper, as Path of Exile's map recipe does; a life potion, a mana potion and a herb give a
// rejuvenation potion, as Diablo II's recipe does; and a normal base with a Law and a Cosmic rune
// gives its elite version (items.ts ELITE), as Diablo II's upgrades do. The one not listed opens Diablo
// II's secret level: three eggs, a raw chicken and a Law rune open the Coop (content/pinnacles.ts).
// The late game's (docs/late-game.md) are OSRS's own: a unique and its part give its upgrade, a
// ring with a Wrath rune and gold its imbued "(i)", the Max cape with a cape its join, and the
// awakened generals' vestiges and the onyx are made into uniques.
import { GoodId } from "./goods";
import { RuneId } from "./runes";

export type CircleRecipe = "runes" | "herbs" | "riftstones" | "rejuv" | "elite" | "upgrade" | "make";

export const CIRCLE = {
    // How many of one go in for one of the next
    three: 3,
    // The rejuvenation potion it makes (items.ts: the Sanfew serum)
    rejuv: "sanfew_serum",
    // What an elite upgrade costs
    elite: { law: 1, cosmic: 1 },
    // The secret rift's makings (content/pinnacles.ts chicken): not listed at the bench, and shown
    // only to a hero who has them
    chicken: { eggs: 3, chickens: 1, law: 1 },
    // An upgrade's and an imbue's gold, times the item's level squared: an upgrade under a ladder
    // rift's gold at any depth, an imbue a few rifts' (docs/late-game.md E)
    gold: { upgrade: 2, imbue: 8 },
};

// A unique laid in with what it takes, for its better self (items.ts lateUniques): its level,
// sockets and gems kept, its rolls where they were in their ranges
export type UpgradeDef = {
    from: string;
    to: string;
    // The parts from the pouch
    goods?: Partial<Record<GoodId, number>>;
    // A second unique from the pack, which goes into it (the Max cape, for a join)
    with?: string;
    // An imbue's: a Wrath rune, and an imbue's gold
    imbue?: boolean;
};

export const IMBUE_RUNE: RuneId = "wrath";

export const UPGRADES: UpgradeDef[] = [
    { from: "abyssal_whip", to: "abyssal_tentacle", goods: { krakenTentacle: 1 } },
    { from: "staff_of_the_dead", to: "toxic_staff_of_the_dead", goods: { magicFang: 1 } },
    { from: "darklight", to: "arclight", goods: { ancientShard: 3 } },
    { from: "arclight", to: "emberlight", goods: { tormentedSynapse: 1 } },
    { from: "ivandis_flail", to: "blisterwood_flail", goods: { blisterwoodLogs: 1 } },
    { from: "dragon_boots", to: "primordial_boots", goods: { primordialCrystal: 1 } },
    { from: "amulet_of_fury", to: "amulet_of_blood_fury", goods: { bloodShard: 1 } },
    { from: "dizanas_quiver", to: "blessed_dizanas_quiver", goods: { sunfireSplinters: 50 } },
    { from: "berserker_ring", to: "berserker_ring_i", imbue: true },
    { from: "archers_ring", to: "archers_ring_i", imbue: true },
    { from: "seers_ring", to: "seers_ring_i", imbue: true },
    { from: "warrior_ring", to: "warrior_ring_i", imbue: true },
    { from: "ring_of_suffering", to: "ring_of_suffering_i", imbue: true },
    { from: "skull_sceptre", to: "skull_sceptre_i", imbue: true },
    { from: "infernal_cape", to: "infernal_max_cape", with: "max_cape" },
    { from: "blessed_dizanas_quiver", to: "dizanas_max_cape", with: "max_cape" },
];

// Goods (and runes) laid in for a unique of their own, read at once: shown at the bench only to a
// hero who has some of what it takes
export type MakeDef = {
    to: string;
    goods: Partial<Record<GoodId, number>>;
    runes?: Partial<Record<RuneId, number>>;
};

export const MAKES: MakeDef[] = [
    { to: "ultor_ring", goods: { ultorVestige: 1, chromiumIngot: 3 } },
    { to: "venator_ring", goods: { venatorVestige: 1, chromiumIngot: 3 } },
    { to: "magus_ring", goods: { magusVestige: 1, chromiumIngot: 3 } },
    { to: "bellator_ring", goods: { bellatorVestige: 1, chromiumIngot: 3 } },
    { to: "amulet_of_fury", goods: { uncutOnyx: 1 }, runes: { law: 1 } },
    { to: "ring_of_suffering", goods: { uncutOnyx: 1 }, runes: { law: 1 } },
];

export const CIRCLE_TEXT: Record<CircleRecipe, string> = {
    runes: "Three of a rune give one of the next",
    herbs: "Three of a herb give one of the next",
    riftstones: "Three riftstones of a depth give one a depth deeper",
    rejuv: "A life potion, a mana potion and a herb give a rejuvenation potion",
    elite: "A normal item, a Law rune and a Cosmic rune give its elite version",
    upgrade: "A unique and its part give its upgrade; a ring, a Wrath rune and gold its imbued (i); the Max cape and a cape their join",
    make: "A vestige and three Chromium ingots give its ring; an Uncut onyx and a Law rune a fury or a Ring of suffering",
};
