// The potions, as plain data: OSRS's own brews, each an item of the slot "potion" that's carried in
// the belt (four places, drunk with 1 to 4, the last two the Apothecary's errands) rather than worn. A potion's doses are its charges, and
// kills fill them a share of a dose at a time, the city in full. Its icon is the cache's own object
// for the doses it has left, (4) full and (1) on its last, the vial when it's dry. Object ids are the
// cache's (riftscaper/scripts/find-objs.ts). What drinking one does is the sim's (sim/potions.ts and
// Game.drink); docs/design.md has the numbers' reasons.
import type { SkillTag } from "./gems";
import type { GoodId } from "./goods";
import type { BossId } from "./monsters";
import type { PinnacleId } from "./pinnacles";

// Life and mana over a moment, both at once, or a buff for a while
export type PotionFamily = "life" | "mana" | "rejuv" | "combat";

// What a combat potion (or a potion's suffix) gives while it works: the numbers of a skill's buff
// (gems.ts BuffDef), and a few of a potion's own
export type PotionBuff = {
    damagePct?: number;
    attackSpeedPct?: number;
    moveSpeedPct?: number;
    armourPct?: number;
    lessDamageTaken?: number;
    // Increased damage with skills of a tag
    tag?: SkillTag;
    tagPct?: number;
    // More damage, as a share (Overload's 0.4 is 40% more)
    more?: number;
    // Elemental damage taken, a share less
    elementalLess?: number;
    // Skills' mana costs, a share less
    manaCostLess?: number;
    // Added to the chance to evade, as a percentage
    evade?: number;
    // No ailments take hold (sim/ailments.ts)
    noAilments?: boolean;
};

// A unique potion's rule, past its numbers (Game.drink)
export type PotionRule = "overload" | "zamorakBrew" | "ancientBrew" | "divineCombat" | "menaphite" | "ambrosia" | "adrenaline" | "salts";

export type PotionDef = {
    family: PotionFamily;
    // A life or mana potion's grade, 1 to 5, which the Apothecary brews it up through
    grade: number;
    doses: number;
    // A dose's share back for each kill (a rare's twice, a guardian's four times)
    perKill: number;
    // How long its recovery or its buff takes, in seconds: 0 is at once
    seconds: number;
    // Shares of the most life and mana it gives back
    life?: number;
    mana?: number;
    buff?: PotionBuff;
    rule?: PotionRule;
    // Its icon by the doses left: the one-dose object first
    icons: number[];
};

// The vial a dry potion's drawn as
export const VIAL = 229;

// The belt's places a hero starts with: a life potion's and a mana potion's, as the two flasks were
export const BELT_START = 2;

// The Apothecary's errands, one for each place she stitches onto the belt past those, in order
// (Diablo II's quests that leave something for good, Diablo IV's alchemist): each wants what one
// guardian alone drops, which it drops on every death while a hero needs one, and herbs and gold.
// K'ril Tsutsaroth ends the first lap, about an hour in, and Skotizo the campaign, about two
// (balance.ts --depth 8: the first lap's 62 minutes on average), so each place is a reward for
// a lap and comes as the potions that want it do: the combat potions and the uniques by the
// first, Ambrosia and the Heart's brews by the second. The gold is about half what the balance
// bot holds there (7,000 to 15,000 at rift 8, 33,000 to 52,000 at 16), and the herbs are of the
// grades open there.
export type BeltErrand = {
    good: GoodId;
    boss: BossId;
    // The rift whose guardian that is, on the first two laps
    depth: number;
    herb: GoodId;
    count: number;
    gold: number;
};

export const BELT_ERRANDS: BeltErrand[] = [
    { good: "wineOfZamorak", boss: "kril", depth: 8, herb: "ranarr", count: 5, gold: 5000 },
    { good: "jarOfDarkness", boss: "skotizo", depth: 16, herb: "cadantine", count: 5, gold: 20000 },
];

export const BELT_PLACE_NAMES = ["first", "second", "third", "fourth"];

// The families' doses and refills (a grade can have a dose more)
export const POTION_FAMILY = {
    life: { doses: 4, perKill: 0.25, seconds: 1.5 },
    mana: { doses: 4, perKill: 0.35, seconds: 1.5 },
    rejuv: { doses: 2, perKill: 0.1, seconds: 0 },
    combat: { doses: 3, perKill: 0.2, seconds: 6 },
};

export const FAMILY_NAMES: Record<PotionFamily, string> = {
    life: "Life potion",
    mana: "Mana potion",
    rejuv: "Rejuvenation potion",
    combat: "Combat potion",
};

// A suffix's effect lasts this long at the least, or as long as its potion's own effect
export const SUFFIX_SECONDS = 4;
// A ward (of Overflow, Ambrosia): fades to nothing over this long
export const WARD_FADE_SECONDS = 4;
// Saturated: its recovery takes this share longer
export const SATURATED_SLOWER = 0.3;
// An instilled potion (the Apothecary's) drinks itself no more often than this
export const INSTIL_EVERY_SECONDS = 4;

// A potion base: the name and the item level it drops from, and what it does
export type PotionBase = { name: string; level: number; potion: PotionDef };

// One dose's object to the full one's, as the cache has them
function doses(...ids: number[]): number[] {
    return ids;
}

function grade(family: "life" | "mana", g: number, level: number, share: number, more: number, name: string, icons: number[]): PotionBase {
    const def = POTION_FAMILY[family];
    return {
        name,
        level,
        potion: { family, grade: g, doses: def.doses + more, perKill: def.perKill, seconds: def.seconds, ...(family === "life" ? { life: share } : { mana: share }), icons },
    };
}

function combat(name: string, level: number, buff: PotionBuff, icons: number[]): PotionBase {
    const def = POTION_FAMILY.combat;
    return { name, level, potion: { family: "combat", grade: 0, doses: def.doses, perKill: def.perKill, seconds: def.seconds, buff, icons } };
}

// The grades of life and mana potion: grade 1 is the flask the hero had before potions, exactly.
// The Chambers of Xeric's brews in their three strengths are the top three.
export const LIFE_GRADES: PotionBase[] = [
    grade("life", 1, 1, 0.45, 0, "Guthix rest", doses(4423, 4421, 4419, 4417)),
    grade("life", 2, 12, 0.48, 0, "Saradomin brew", doses(6691, 6689, 6687, 6685)),
    grade("life", 3, 24, 0.52, 0, "Xeric's aid (-)", doses(20973, 20974, 20975, 20976)),
    grade("life", 4, 36, 0.56, 1, "Xeric's aid", doses(20977, 20978, 20979, 20980)),
    grade("life", 5, 48, 0.6, 1, "Xeric's aid (+)", doses(20981, 20982, 20983, 20984)),
];

export const MANA_GRADES: PotionBase[] = [
    grade("mana", 1, 1, 0.6, 0, "Prayer potion", doses(143, 141, 139, 2434)),
    grade("mana", 2, 12, 0.64, 0, "Super restore", doses(3030, 3028, 3026, 3024)),
    grade("mana", 3, 24, 0.68, 0, "Prayer enhance (-)", doses(20961, 20962, 20963, 20964)),
    grade("mana", 4, 36, 0.72, 1, "Prayer enhance", doses(20965, 20966, 20967, 20968)),
    grade("mana", 5, 48, 0.76, 1, "Prayer enhance (+)", doses(20969, 20970, 20971, 20972)),
];

// Rejuvenation, Diablo II's: a share of both at once
export const REJUVENATION: PotionBase = {
    name: "Sanfew serum",
    level: 8,
    potion: { family: "rejuv", grade: 0, doses: POTION_FAMILY.rejuv.doses, perKill: POTION_FAMILY.rejuv.perKill, seconds: 0, life: 0.3, mana: 0.3, icons: doses(10931, 10929, 10927, 10925) },
};

// The combat potions: a buff for a few seconds
export const COMBAT_POTIONS: PotionBase[] = [
    combat("Super defence", 4, { armourPct: 50 }, doses(167, 165, 163, 2442)),
    combat("Super combat potion", 10, { tag: "melee", tagPct: 25 }, doses(12701, 12699, 12697, 12695)),
    combat("Ranging potion", 10, { tag: "projectile", tagPct: 25 }, doses(173, 171, 169, 2444)),
    combat("Magic potion", 10, { tag: "spell", tagPct: 25 }, doses(3046, 3044, 3042, 3040)),
    combat("Stamina potion", 14, { moveSpeedPct: 25 }, doses(12631, 12629, 12627, 12625)),
    combat("Antifire potion", 18, { elementalLess: 0.5 }, doses(2458, 2456, 2454, 2452)),
];

export const POTION_BASES: PotionBase[] = [...LIFE_GRADES, ...MANA_GRADES, REJUVENATION, ...COMBAT_POTIONS];

// The unique potions: OSRS's special brews, each with a rule. The Tombs of Amascut's three, of two
// doses, are the Heart of the Rift's alone.
export type UniquePotion = { id: string; name: string; level: number; lore: string; pinnacle?: PinnacleId; text: string[]; potion: PotionDef };

export const UNIQUE_POTIONS: UniquePotion[] = [
    {
        id: "overload",
        name: "Overload",
        level: 30,
        lore: "Brewed for the Nightmare Zone's hardest dreams. It hurts going down.",
        text: ["40% more damage for 8 seconds", "Costs 30% of your life over 2 seconds", "Can't be drunk on low life"],
        potion: { family: "combat", grade: 0, doses: 3, perKill: 0.15, seconds: 8, buff: { more: 0.4 }, rule: "overload", icons: doses(11733, 11732, 11731, 11730) },
    },
    {
        id: "zamorak_brew",
        name: "Zamorak brew",
        level: 12,
        lore: "Zamorak's followers drink it before a battle, and don't feel the cost till after.",
        text: ["25% more damage for 6 seconds", "Costs 10% of your life at once"],
        potion: { family: "combat", grade: 0, doses: 3, perKill: 0.2, seconds: 6, buff: { more: 0.25 }, rule: "zamorakBrew", icons: doses(193, 191, 189, 2450) },
    },
    {
        id: "ancient_brew",
        name: "Ancient brew",
        level: 20,
        lore: "The Ancient Prayers' own: the body's strength given up to the mind.",
        text: ["Turns 30% of your life into 60% of your mana, at once"],
        potion: { family: "mana", grade: 0, doses: 4, perKill: 0.35, seconds: 0, rule: "ancientBrew", icons: doses(26346, 26344, 26342, 26340) },
    },
    {
        id: "divine_super_combat",
        name: "Divine super combat potion",
        level: 36,
        lore: "Blessed at an altar, so its strength doesn't wane while the fighting goes on.",
        text: ["25% increased damage for 6 seconds", "It doesn't wear off while you've killed recently", "Costs 10% of your life at once"],
        potion: { family: "combat", grade: 0, doses: 3, perKill: 0.2, seconds: 6, buff: { damagePct: 25 }, rule: "divineCombat", icons: doses(23694, 23691, 23688, 23685) },
    },
    {
        id: "menaphite_remedy",
        name: "Menaphite remedy",
        level: 24,
        lore: "From Menaphos's apothecaries, who know every sickness of the desert.",
        text: ["Ends every ailment on you, and none take hold for 4 seconds", "Recovers 20% of your life at once"],
        potion: { family: "rejuv", grade: 0, doses: 3, perKill: 0.2, seconds: 4, life: 0.2, buff: { noAilments: true }, rule: "menaphite", icons: doses(27211, 27208, 27205, 27202) },
    },
    {
        id: "ambrosia",
        name: "Ambrosia",
        level: 40,
        pinnacle: "heart",
        lore: "The food of the gods of Amascut's tombs. One sip, and nothing is beyond you.",
        text: ["Life and mana full, and every other potion's doses", "A ward of 25% of your life", "Only the city fills it again"],
        potion: { family: "rejuv", grade: 0, doses: 1, perKill: 0, seconds: 0, life: 1, mana: 1, rule: "ambrosia", icons: doses(27349, 27347) },
    },
    {
        id: "liquid_adrenaline",
        name: "Liquid adrenaline",
        level: 40,
        pinnacle: "heart",
        lore: "Brewed in the Tombs of Amascut from what the scarabs leave.",
        text: ["Your skills cost half their mana for 8 seconds"],
        potion: { family: "combat", grade: 0, doses: 2, perKill: 0.1, seconds: 8, buff: { manaCostLess: 0.5 }, rule: "adrenaline", icons: doses(27341, 27339) },
    },
    {
        id: "smelling_salts",
        name: "Smelling salts",
        level: 40,
        pinnacle: "heart",
        lore: "A sniff of them, and the warden's curses slide off you.",
        text: ["20% more damage for 6 seconds", "No ailments take hold for 6 seconds"],
        potion: { family: "combat", grade: 0, doses: 2, perKill: 0.1, seconds: 6, buff: { more: 0.2, noAilments: true }, rule: "salts", icons: doses(27345, 27343) },
    },
];

// What brewing a potion up a grade takes at the Apothecary's: the herb of the grade it goes to,
// so many of it, and gold
export const BREW_UP: Record<number, { herb: GoodId; count: number; gold: number }> = {
    2: { herb: "tarromin", count: 3, gold: 300 },
    3: { herb: "irit", count: 4, gold: 1500 },
    4: { herb: "kwuarm", count: 5, gold: 5000 },
    5: { herb: "torstol", count: 6, gold: 15000 },
};

// What drinks an instilled potion for you (Path of Exile's flask enchants, its second game's charms)
export type Instil = "lowLife" | "hindered" | "rareKill" | "guardian";

export const INSTILS: Instil[] = ["lowLife", "hindered", "rareKill", "guardian"];

export const INSTIL_TEXT: Record<Instil, string> = {
    lowLife: "Drunk for you when you fall to low life",
    hindered: "Drunk for you when you're frozen, stunned or snared",
    rareKill: "Drunk for you when you kill a rare monster",
    guardian: "Drunk for you when a guardian wakes",
};

export const INSTIL_NAMES: Record<Instil, string> = {
    lowLife: "When on low life",
    hindered: "When hindered",
    rareKill: "On a rare kill",
    guardian: "When a guardian wakes",
};

// Instilling costs a grade's herbs (a combat potion's, the second's) and gold
export function instilCost(potion: PotionDef): { herb: GoodId; count: number; gold: number } {
    const g = Math.max(1, Math.min(5, potion.grade || 2));
    const herb = (["guam", "tarromin", "irit", "kwuarm", "torstol"] as const)[g - 1];
    return { herb, count: 2 + g, gold: Math.round(120 * g * g) };
}

// ---- Elixirs (Diablo IV's): one dose drunk in the city, for a while in the rifts ----

export type ElixirId = "attack" | "strength" | "defence" | "agility" | "energy" | "hunter";

export type ElixirDef = {
    id: ElixirId;
    name: string;
    objId: number;
    // What it gives, as an item's stat lines do
    stat: "attackSpeedPct" | "damagePct" | "armourPct" | "evade" | "moveSpeedPct" | "rarity";
    value: number;
    // Its herb, so many, and gold
    herb: GoodId;
    count: number;
    gold: number;
};

// Every elixir gives this much more experience besides, and lasts this long in the rifts
export const ELIXIR_XP = 0.05;
export const ELIXIR_SECONDS = 600;

// OSRS's plain potions, the four-dose objects
export const ELIXIRS: Record<ElixirId, ElixirDef> = {
    attack: { id: "attack", name: "Attack potion", objId: 2428, stat: "attackSpeedPct", value: 8, herb: "guam", count: 3, gold: 60 },
    strength: { id: "strength", name: "Strength potion", objId: 113, stat: "damagePct", value: 10, herb: "tarromin", count: 3, gold: 150 },
    defence: { id: "defence", name: "Defence potion", objId: 2432, stat: "armourPct", value: 25, herb: "ranarr", count: 3, gold: 300 },
    agility: { id: "agility", name: "Agility potion", objId: 3032, stat: "evade", value: 5, herb: "irit", count: 3, gold: 600 },
    energy: { id: "energy", name: "Energy potion", objId: 3008, stat: "moveSpeedPct", value: 8, herb: "kwuarm", count: 3, gold: 1000 },
    hunter: { id: "hunter", name: "Hunter potion", objId: 9998, stat: "rarity", value: 15, herb: "cadantine", count: 3, gold: 1600 },
};

export const ELIXIR_IDS: ElixirId[] = ["attack", "strength", "defence", "agility", "energy", "hunter"];

// Every potion object, for baking icons
export function potionObjIds(): number[] {
    return [VIAL, ...POTION_BASES.flatMap((b) => b.potion.icons), ...UNIQUE_POTIONS.flatMap((u) => u.potion.icons), ...ELIXIR_IDS.map((id) => ELIXIRS[id].objId)];
}
