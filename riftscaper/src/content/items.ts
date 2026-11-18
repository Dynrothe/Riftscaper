// Everything that drops: item bases from bronze to dragon (obj ids as the cache has them, looked up
// with riftscaper/scripts/find-objs.ts, so each is drawn on the ground, in the hand and as an icon as
// the client draws it), the affixes a magic or rare item rolls, and the uniques. Numbers are
// starting guesses, to be tuned in play.
import { EquipSlot } from "../../../engine/rs/model/player/PlayerModelLoader";
import type { SkillTraits } from "./forge";
import type { KeystoneId } from "./passives";
import type { PinnacleId } from "./pinnacles";
import { POTION_BASES, PotionDef, PotionFamily, UNIQUE_POTIONS, potionObjIds } from "./potions";
import { HEART_SHARDS, RIFTSTONE, SHARD_IDS } from "./riftstones";
import { SPOT, Visual } from "./visuals";

export type ClassId = "warrior" | "ranger" | "mage" | "paladin" | "rogue" | "necromancer";

// What's worn; a talisman, not worn but set in the passive tree's sockets (talismans.ts); and a
// potion, carried in the belt (potions.ts)
export type Slot = "weapon" | "offhand" | "head" | "body" | "legs" | "hands" | "feet" | "cape" | "amulet" | "ring" | "talisman" | "potion";

// The slots that are worn
export const SLOTS: Slot[] = ["weapon", "offhand", "head", "body", "legs", "hands", "feet", "cape", "amulet", "ring"];

export const SLOT_NAMES: Record<Slot, string> = {
    weapon: "Weapon",
    offhand: "Shield",
    head: "Helm",
    body: "Body",
    legs: "Legs",
    hands: "Gloves",
    feet: "Boots",
    cape: "Cape",
    amulet: "Amulet",
    ring: "Ring",
    talisman: "Talisman",
    potion: "Potion",
};

// Where each slot's item is worn on the player's model (a ring isn't drawn)
export const EQUIP_SLOT: Record<Slot, EquipSlot | undefined> = {
    weapon: EquipSlot.WEAPON,
    offhand: EquipSlot.SHIELD,
    head: EquipSlot.HEAD,
    body: EquipSlot.TORSO,
    legs: EquipSlot.LEGS,
    hands: EquipSlot.HANDS,
    feet: EquipSlot.FEET,
    cape: EquipSlot.CAPE,
    amulet: EquipSlot.AMULET,
    ring: undefined,
    talisman: undefined,
    potion: undefined,
};

export type StatKey =
    | "addedMin"
    | "addedMax"
    | "damagePct"
    | "attackSpeedPct"
    | "critChance"
    | "critMulti"
    | "life"
    | "mana"
    | "lifeRegen"
    | "manaRegen"
    | "armour"
    | "armourPct"
    | "moveSpeedPct"
    | "lifeOnHit"
    | "lifeLeech"
    | "rarity"
    | "extraProjectiles"
    // Attributes: Strength for life and melee, Dexterity for projectiles and evasion,
    // Intelligence for mana and spells
    | "str"
    | "dex"
    | "int"
    | "lifePct"
    | "manaPct"
    // Increased damage for skills with the tag (gems.ts)
    | "meleeDamagePct"
    | "projectileDamagePct"
    | "spellDamagePct"
    | "areaDamagePct"
    | "elementalDamagePct"
    | "physicalDamagePct"
    | "castSpeedPct"
    | "areaPct"
    | "evade"
    | "lifeRegenPct"
    | "manaCostPct"
    | "cooldownPct"
    | "igniteChance"
    | "freezeChance"
    | "shockChance"
    | "stunChance"
    | "flaskPct"
    | "durationPct"
    | "lifeOnKill"
    | "manaOnKill"
    // The tree's wings and talismans (docs/design.md, the passive tree)
    | "thrallDamagePct"
    | "thrallSpeedPct"
    | "thrallSizePct"
    | "extraThralls"
    | "burnDamagePct"
    | "burnLengthPct"
    | "freezeLengthPct"
    | "shockLengthPct"
    | "shockEffectPct"
    | "extraChain"
    | "extraPierce"
    | "buffEffectPct"
    | "lessDamageTaken"
    // A share of one attribute's worth as another tag's damage: a point for every ten
    | "spellPerStr"
    | "meleePerInt"
    | "projectileAreaPct"
    | "burstDamagePct"
    // A potion's own (potions.ts), read as it's drunk, not added to the hero's: its prefixes'
    | "potionInstantLess"
    | "potionHalfInstant"
    | "potionFaster"
    | "potionMore"
    | "potionPanic"
    | "potionDoses"
    | "potionRefill"
    | "potionSave"
    | "potionLonger"
    // and its suffixes', while it works
    | "potionMove"
    | "potionArmour"
    | "potionEvade"
    | "potionAttackSpeed"
    | "potionWard"
    | "potionPlenty"
    // The ladder's, against its monsters' ailments (content/monsterMods.ts)
    | "potionDouse"
    | "potionHeat"
    | "potionGround"
    | "potionFooting"
    // The tree's for every potion
    | "potionFillPct"
    | "potionEffectPct"
    | "potionRareDose"
    // Diablo II's "+1 to all skills": levels on skill gems past their own, all of them or a tag's
    // (skills.ts resolveSkill), so a gem can go past MAX_GEM_LEVEL
    | "skillLevels"
    | "meleeSkillLevels"
    | "projectileSkillLevels"
    | "spellSkillLevels"
    | "minionSkillLevels"
    // Resistances (content/rules.ts RESIST)
    | "fireRes"
    | "coldRes"
    | "lightningRes"
    | "allRes";

// How each stat reads on an item, {0} its value
export const STAT_TEXT: Record<StatKey, string> = {
    addedMin: "Adds {0} minimum damage",
    addedMax: "Adds {0} maximum damage",
    damagePct: "{0}% increased damage",
    attackSpeedPct: "{0}% increased attack speed",
    critChance: "+{0}% critical strike chance",
    critMulti: "+{0}% critical strike multiplier",
    life: "+{0} to maximum life",
    mana: "+{0} to maximum mana",
    lifeRegen: "Regenerate {0} life per second",
    manaRegen: "Regenerate {0} mana per second",
    armour: "+{0} to armour",
    armourPct: "{0}% increased armour",
    moveSpeedPct: "{0}% increased movement speed",
    lifeOnHit: "Gain {0} life for each enemy hit",
    lifeLeech: "{0}% of damage leeched as life",
    rarity: "{0}% increased rarity of items found",
    extraProjectiles: "Fires {0} additional arrows",
    str: "+{0} to Strength",
    dex: "+{0} to Dexterity",
    int: "+{0} to Intelligence",
    lifePct: "{0}% increased maximum life",
    manaPct: "{0}% increased maximum mana",
    meleeDamagePct: "{0}% increased melee damage",
    projectileDamagePct: "{0}% increased projectile damage",
    spellDamagePct: "{0}% increased spell damage",
    areaDamagePct: "{0}% increased area damage",
    elementalDamagePct: "{0}% increased elemental damage",
    physicalDamagePct: "{0}% increased physical damage",
    castSpeedPct: "{0}% increased cast speed",
    areaPct: "{0}% increased area of effect",
    evade: "+{0}% chance to evade attacks",
    lifeRegenPct: "Regenerate {0}% of life per second",
    manaCostPct: "{0}% reduced mana cost of skills",
    cooldownPct: "{0}% increased cooldown recovery speed",
    igniteChance: "{0}% chance to ignite with fire skills",
    freezeChance: "{0}% chance to freeze with cold skills",
    shockChance: "{0}% chance to shock with lightning skills",
    stunChance: "{0}% chance to stun on hit",
    flaskPct: "{0}% increased potion recovery",
    durationPct: "{0}% increased skill effect duration",
    lifeOnKill: "Gain {0} life for each enemy killed",
    manaOnKill: "Gain {0} mana for each enemy killed",
    thrallDamagePct: "{0}% increased thrall damage",
    thrallSpeedPct: "Thralls attack and move {0}% faster",
    thrallSizePct: "Thralls are {0}% larger, and reach further",
    extraThralls: "+{0} to the most thralls of each kind",
    burnDamagePct: "{0}% increased burning damage",
    burnLengthPct: "Burning lasts {0}% longer",
    freezeLengthPct: "Freezes last {0}% longer",
    shockLengthPct: "Shocks last {0}% longer",
    shockEffectPct: "{0}% increased effect of shock",
    extraChain: "Skills that chain chain {0} more times",
    extraPierce: "Projectiles pierce {0} more enemies",
    buffEffectPct: "{0}% increased effect of your skills' buffs",
    lessDamageTaken: "{0}% less damage taken",
    spellPerStr: "{0}% increased spell damage for every 10 Strength",
    meleePerInt: "{0}% increased melee damage for every 10 Intelligence",
    projectileAreaPct: "{0}% increased area of projectiles' bursts",
    burstDamagePct: "{0}% increased damage with projectiles' bursts",
    potionInstantLess: "Recovers at once, but {0}% less",
    potionHalfInstant: "{0}% of its recovery at once, the rest over its time",
    potionFaster: "Recovers {0}% faster",
    potionMore: "Recovers {0}% more, but takes 30% longer",
    potionPanic: "Recovers {0}% more, and at once, if drunk on low life",
    potionDoses: "+{0} to its most doses",
    potionRefill: "Kills fill it {0}% faster",
    potionSave: "{0}% chance a drink takes no dose",
    potionLonger: "Its effects last {0}% longer",
    potionMove: "{0}% increased movement speed while it works",
    potionArmour: "{0}% increased armour while it works",
    potionEvade: "+{0}% chance to evade attacks while it works",
    potionAttackSpeed: "{0}% increased attack speed while it works",
    potionWard: "Life past full becomes a ward, up to {0}% of your life, that fades over 4 seconds",
    potionPlenty: "A kill while it works fills {0}% of a dose of your other potions",
    potionDouse: "Ends burning when drunk, and none takes hold for {0} seconds",
    potionHeat: "Ends being chilled when drunk, and none takes hold for {0} seconds",
    potionGround: "Ends being shocked when drunk, and none takes hold for {0} seconds",
    potionFooting: "Ends being rooted when drunk, and none takes hold for {0} seconds",
    potionFillPct: "Kills fill your potions {0}% faster",
    potionEffectPct: "{0}% increased effect of your potions' buffs",
    potionRareDose: "Killing a rare enemy or a guardian puts {0} dose back in each of your potions",
    skillLevels: "+{0} to the level of all your skill gems",
    meleeSkillLevels: "+{0} to the level of your melee skill gems",
    projectileSkillLevels: "+{0} to the level of your projectile skill gems",
    spellSkillLevels: "+{0} to the level of your spell skill gems",
    minionSkillLevels: "+{0} to the level of your thrall skill gems",
    fireRes: "+{0}% to fire resistance",
    coldRes: "+{0}% to cold resistance",
    lightningRes: "+{0}% to lightning resistance",
    allRes: "+{0}% to all resistances",
};

// What a stat can be held to: what's worn (settled in heroStats, as gear doesn't change in a rift),
// the hero as they are in a rift (Game keeps it, and makes the stats again when it changes), and
// the enemy hit (read in Game.hitMonster, as a shock is)
export type When =
    | "shield"
    | "book"
    | "blade"
    | "battleaxe"
    | "mace"
    | "shortbow"
    | "longbow"
    | "staff"
    | "killedRecently"
    | "hitRecently"
    | "evadedRecently"
    | "movedRecently"
    | "lowLife"
    | "fullLife"
    | "buffed"
    | "flasked"
    | "blessed"
    | "perThrall"
    | "vsBurning"
    | "vsChilled"
    | "vsShocked"
    | "vsHindered"
    | "vsNotAttacking"
    | "vsRare"
    // What the enemy is, for the weapons made against them (the late game's upgrades)
    | "vsDemon"
    | "vsVampyre";

// Those of the hero in a rift, and those of the enemy hit
export const HERO_WHEN: When[] = ["killedRecently", "hitRecently", "evadedRecently", "movedRecently", "lowLife", "fullLife", "buffed", "flasked", "blessed", "perThrall"];
export const VERSUS_WHEN: When[] = ["vsBurning", "vsChilled", "vsShocked", "vsHindered", "vsNotAttacking", "vsRare", "vsDemon", "vsVampyre"];

// How long "recently" is, in seconds, and the most thralls a stat for each counts
export const RECENTLY = { killed: 4, hit: 2, evaded: 2, moved: 2 };
export const THRALLS_COUNTED = 5;

// A stat's condition, as a tooltip ends its line with it
export const WHEN_TEXT: Record<When, string> = {
    shield: "while holding a shield",
    book: "while holding a book",
    blade: "with a dagger, scimitar, sword or claws",
    battleaxe: "with a battleaxe",
    mace: "with a mace",
    shortbow: "with a shortbow",
    longbow: "with a longbow",
    staff: "with a staff",
    killedRecently: `if you've killed in the last ${RECENTLY.killed} seconds`,
    hitRecently: `if you've been hit in the last ${RECENTLY.hit} seconds`,
    evadedRecently: `if you've evaded in the last ${RECENTLY.evaded} seconds`,
    movedRecently: `if you've moved in the last ${RECENTLY.moved} seconds`,
    lowLife: "while on low life",
    fullLife: "while on full life",
    buffed: "while a buff of your skills is on",
    flasked: "while a potion is in effect",
    blessed: "while a shrine's blessing is on",
    perThrall: `for each thrall you have, up to ${THRALLS_COUNTED}`,
    vsBurning: "against burning enemies",
    vsChilled: "against frozen or chilled enemies",
    vsShocked: "against shocked enemies",
    vsHindered: "against stunned, frozen or chilled enemies",
    vsNotAttacking: "against enemies not attacking you",
    vsRare: "against rare enemies and guardians",
    vsDemon: "against demons",
    vsVampyre: "against vampyres",
};

// What a weapon or a shield is, for the conditions on what's worn
export type Family = "scimitar" | "sword" | "battleaxe" | "mace" | "dagger" | "claws" | "whip" | "maul" | "shortbow" | "longbow" | "staff" | "shield" | "book";

// The families each condition on what's worn is met by
export const WHEN_FAMILIES: Partial<Record<When, Family[]>> = {
    shield: ["shield"],
    book: ["book"],
    blade: ["dagger", "scimitar", "sword", "claws"],
    battleaxe: ["battleaxe"],
    mace: ["mace"],
    shortbow: ["shortbow"],
    longbow: ["longbow"],
    staff: ["staff"],
};

// ---- Sockets ----

// A gem goes in a socket of its own colour, or a white one, which takes any
export type SocketColor = "red" | "green" | "blue" | "white";

export const SOCKET_COLOR: Record<SocketColor, string> = {
    red: "#d04030",
    green: "#40b040",
    blue: "#4070e0",
    white: "#e8e8e8",
};

// The most sockets each slot can have (a bow, two-handed, as many as a body)
export const MAX_SOCKETS: Record<Slot, number> = {
    weapon: 4,
    offhand: 3,
    head: 4,
    body: 6,
    legs: 4,
    hands: 4,
    feet: 4,
    cape: 2,
    amulet: 0,
    ring: 0,
    talisman: 0,
    potion: 0,
};

export type WeaponKind = "melee" | "bow" | "staff";

export type WeaponDef = {
    kind: WeaponKind;
    damage: [number, number];
    // Attacks a second
    speed: number;
    // The hero's attack animation with it
    seq: number;
    // An arrow's look, for a bow
    arrow?: Visual;
};

// A stat and its number; `rift` marks a rift-touched affix's (its seventh tier), drawn as its own
export type StatLine = { stat: StatKey; value: number; when?: When; rift?: boolean };

export type BaseDef = {
    id: string;
    name: string;
    objId: number;
    slot: Slot;
    // The level it needs, and the least an item's level can be to drop it
    level: number;
    weapon?: WeaponDef;
    armour?: number;
    implicit?: StatLine[];
    // Who it suits: drops lean towards your class's own, and a weapon's only theirs
    classes?: ClassId[];
    // What it is, for the conditions on what's worn
    family?: Family;
    // A talisman's affixes it rolls three times as often (TALISMAN_BASES)
    lean?: string[];
    // A potion's family, doses and what it does (potions.ts)
    potion?: PotionDef;
    // Diablo II's elite bases (ELITE_BASES): OSRS's best gear, dropped only on the ladder, and the
    // transmuting circle's for a normal base of its slot and kind (circle.ts)
    elite?: boolean;
};

const bases: BaseDef[] = [];

function add(def: BaseDef): void {
    bases.push(def);
}

function idOf(name: string): string {
    return name
        .toLowerCase()
        .replace(/'/g, "")
        .replace(/[^a-z0-9]+/g, "_");
}

// ---- Weapons ----

const METALS = ["Bronze", "Iron", "Steel", "Black", "Mithril", "Adamant", "Rune", "Dragon"];
const METAL_LEVELS = [1, 4, 9, 14, 19, 25, 32, 40];
// A scimitar's damage at each metal; longswords and battleaxes hit harder and slower
const BLADE_DAMAGE: [number, number][] = [
    [3, 7],
    [5, 10],
    [8, 14],
    [10, 18],
    [13, 23],
    [17, 29],
    [23, 38],
    [30, 49],
];
const SCIMITARS = [1321, 1323, 1325, 1327, 1329, 1331, 1333, 4587];
const LONGSWORDS = [1291, 1293, 1295, 1297, 1299, 1301, 1303, 1305];
const BATTLEAXES = [1375, 1363, 1365, 1367, 1369, 1371, 1373, 1377];
const MACES = [1422, 1420, 1424, 1426, 1428, 1430, 1432, 1434];
const DAGGERS = [1205, 1203, 1207, 1217, 1209, 1211, 1213, 1215];

// Who each family of gear suits: drops lean to a class's own, and the shops stock them
const BLADE_CLASSES: ClassId[] = ["warrior", "paladin"];
const PLATE_CLASSES: ClassId[] = ["warrior", "paladin"];
const HIDE_CLASSES: ClassId[] = ["ranger", "rogue"];
const BOW_CLASSES: ClassId[] = ["ranger", "rogue"];
const ROBE_CLASSES: ClassId[] = ["mage", "necromancer"];

// The hero's attack animations: a sword's slash, an axe's hack, a mace's pound, a dagger's stab,
// a bow drawn, a spell cast
export const SEQ = {
    idle: 808,
    walk: 819,
    run: 824,
    death: 836,
    slash: 390,
    hack: 395,
    pound: 401,
    stab: 386,
    // The dragon dagger's double stab, and a knife thrown
    puncture: 1062,
    throw: 929,
    whip: 1658,
    smash: 2067,
    shoot: 426,
    cast: 711,
    castWave: 1162,
    castBurst: 1978,
    teleport: 714,
    // The home teleport's first part: the hero reads from a book as it gathers
    homeTeleport: 4847,
    sweep: 440,
    pray: 811,
};

function scaled([lo, hi]: [number, number], by: number): [number, number] {
    return [Math.round(lo * by), Math.round(hi * by)];
}

METALS.forEach((metal, i) => {
    const level = METAL_LEVELS[i];
    const melee = BLADE_CLASSES;
    add({
        id: idOf(`${metal} scimitar`),
        name: `${metal} scimitar`,
        objId: SCIMITARS[i],
        slot: "weapon",
        level,
        weapon: { kind: "melee", damage: BLADE_DAMAGE[i], speed: 1.6, seq: SEQ.slash },
        classes: melee,
        family: "scimitar",
    });
    add({
        id: idOf(`${metal} longsword`),
        name: `${metal} longsword`,
        objId: LONGSWORDS[i],
        slot: "weapon",
        level: level + 1,
        weapon: { kind: "melee", damage: scaled(BLADE_DAMAGE[i], 1.3), speed: 1.3, seq: SEQ.slash },
        classes: melee,
        family: "sword",
    });
    add({
        id: idOf(`${metal} battleaxe`),
        name: `${metal} battleaxe`,
        objId: BATTLEAXES[i],
        slot: "weapon",
        level: level + 2,
        weapon: { kind: "melee", damage: scaled(BLADE_DAMAGE[i], 1.7), speed: 1.05, seq: SEQ.hack },
        classes: melee,
        family: "battleaxe",
    });
    // A paladin's mace: a little slower than a scimitar, a little harder, and it rings heads
    add({
        id: idOf(`${metal} mace`),
        name: `${metal} mace`,
        objId: MACES[i],
        slot: "weapon",
        level,
        weapon: { kind: "melee", damage: scaled(BLADE_DAMAGE[i], 1.15), speed: 1.45, seq: SEQ.pound },
        implicit: [{ stat: "stunChance", value: 3 + i }],
        classes: ["paladin", "warrior"],
        family: "mace",
    });
    // A rogue's dagger: light, quick, and it finds the gaps
    add({
        id: idOf(`${metal} dagger`),
        name: `${metal} dagger`,
        objId: DAGGERS[i],
        slot: "weapon",
        level,
        weapon: { kind: "melee", damage: scaled(BLADE_DAMAGE[i], 0.85), speed: 2.0, seq: SEQ.stab },
        implicit: [{ stat: "critChance", value: 2 + Math.floor(i / 3) }],
        classes: ["rogue"],
        family: "dagger",
    });
});

const BOW_NAMES = ["", "Oak ", "Willow ", "Maple ", "Yew ", "Magic "];
const BOW_LEVELS = [1, 5, 12, 20, 29, 38];
const BOW_DAMAGE: [number, number][] = [
    [3, 6],
    [5, 9],
    [8, 14],
    [12, 20],
    [17, 28],
    [23, 38],
];
const SHORTBOWS = [841, 843, 849, 853, 857, 861];
const LONGBOWS = [839, 845, 847, 851, 855, 859];
const ARROWS: Visual[] = [SPOT.bronzeArrow, SPOT.bronzeArrow, SPOT.mithrilArrow, SPOT.mithrilArrow, SPOT.runeArrow, SPOT.runeArrow];

BOW_NAMES.forEach((wood, i) => {
    add({
        id: idOf(`${wood}shortbow`),
        name: `${wood}shortbow`.replace(/^./, (c) => c.toUpperCase()),
        objId: SHORTBOWS[i],
        slot: "weapon",
        level: BOW_LEVELS[i],
        weapon: { kind: "bow", damage: BOW_DAMAGE[i], speed: 1.5, seq: SEQ.shoot, arrow: ARROWS[i] },
        classes: BOW_CLASSES,
        family: "shortbow",
    });
    add({
        id: idOf(`${wood}longbow`),
        name: `${wood}longbow`.replace(/^./, (c) => c.toUpperCase()),
        objId: LONGBOWS[i],
        slot: "weapon",
        level: BOW_LEVELS[i] + 2,
        weapon: { kind: "bow", damage: scaled(BOW_DAMAGE[i], 1.45), speed: 1.1, seq: SEQ.shoot, arrow: ARROWS[i] },
        classes: BOW_CLASSES,
        family: "longbow",
    });
});

// Staves, by the level they need: their damage is the spells cast with them
const STAVES: [string, number, number][] = [
    ["Staff", 1379, 1],
    ["Staff of air", 1381, 4],
    ["Staff of water", 1383, 8],
    ["Staff of earth", 1385, 12],
    ["Staff of fire", 1387, 16],
    ["Air battlestaff", 1397, 20],
    ["Water battlestaff", 1395, 24],
    ["Earth battlestaff", 1399, 28],
    ["Fire battlestaff", 1393, 32],
    ["Mystic air staff", 1405, 36],
    ["Mystic fire staff", 1401, 40],
];
STAVES.forEach(([name, objId, level]) => {
    const lo = Math.round(3 + level * 0.62);
    const hi = Math.round(7 + level * 1.05);
    add({
        id: idOf(name),
        name,
        objId,
        slot: "weapon",
        level,
        weapon: { kind: "staff", damage: [lo, hi], speed: 1.25, seq: SEQ.cast },
        implicit: [{ stat: "mana", value: 10 + Math.round(level * 1.2) }],
        classes: ROBE_CLASSES,
        family: "staff",
    });
});

// ---- Armour ----

// A full helm's armour at each metal: the rest of a set is so many times it
const PLATE_ARMOUR = [4, 7, 11, 15, 20, 27, 35, 45];
const FULL_HELMS = [1155, 1153, 1157, 1165, 1159, 1161, 1163, 1149];
const PLATEBODIES = [1117, 1115, 1119, 1125, 1121, 1123, 1127, 3140];
const PLATELEGS = [1075, 1067, 1069, 1077, 1071, 1073, 1079, 4087];
const KITESHIELDS = [1189, 1191, 1193, 1195, 1197, 1199, 1201, 1187];
const METAL_BOOTS = [4119, 4121, 4123, 4125, 4127, 4129, 4131];
// Chain, lighter than plate: a paladin's first, and anyone's who'd keep a little mana
const CHAINBODIES = [1103, 1101, 1105, 1107, 1109, 1111, 1113];

METALS.forEach((metal, i) => {
    const level = METAL_LEVELS[i];
    const a = PLATE_ARMOUR[i];
    const dragon = metal === "Dragon";
    const warrior = PLATE_CLASSES;
    add({ id: idOf(`${metal} helm`), name: dragon ? "Dragon med helm" : `${metal} full helm`, objId: FULL_HELMS[i], slot: "head", level, armour: a, classes: warrior });
    add({ id: idOf(`${metal} body`), name: dragon ? "Dragon chainbody" : `${metal} platebody`, objId: PLATEBODIES[i], slot: "body", level: level + 1, armour: Math.round(a * 2.6), classes: warrior });
    add({ id: idOf(`${metal} legs`), name: `${metal} platelegs`, objId: PLATELEGS[i], slot: "legs", level, armour: Math.round(a * 1.9), classes: warrior });
    add({
        id: idOf(`${metal} shield`),
        name: dragon ? "Dragon sq shield" : `${metal} kiteshield`,
        objId: KITESHIELDS[i],
        slot: "offhand",
        level,
        armour: Math.round(a * 1.7),
        implicit: [{ stat: "life", value: 6 + i * 6 }],
        classes: ["warrior", "paladin", "mage"],
        family: "shield",
    });
    if (i < METAL_BOOTS.length) {
        add({ id: idOf(`${metal} boots`), name: `${metal} boots`, objId: METAL_BOOTS[i], slot: "feet", level, armour: Math.round(a * 0.8), classes: warrior });
    }
    if (i < CHAINBODIES.length) {
        add({
            id: idOf(`${metal} chainbody`),
            name: `${metal} chainbody`,
            objId: CHAINBODIES[i],
            slot: "body",
            level,
            armour: Math.round(a * 2),
            implicit: [{ stat: "mana", value: 4 + i * 3 }],
            classes: ["paladin", "warrior"],
        });
    }
});

// Hide, for archers: lighter than plate, and quicker on the feet
const HIDES: [string, number][] = [
    ["Leather", 1],
    ["Hardleather", 6],
    ["Studded", 12],
    ["Green d'hide", 19],
    ["Blue d'hide", 26],
    ["Red d'hide", 33],
    ["Black d'hide", 40],
];
const HIDE_BODIES = [1129, 1131, 1133, 1135, 2499, 2501, 2503];
const HIDE_LEGS: (number | undefined)[] = [1095, undefined, 1097, 1099, 2493, 2495, 2497];
const HIDE_HANDS: (number | undefined)[] = [1059, undefined, undefined, 1065, 2487, 2489, 2491];

function plateArmourAt(level: number): number {
    let a = PLATE_ARMOUR[0];
    METAL_LEVELS.forEach((l, i) => {
        if (level >= l) {
            a = PLATE_ARMOUR[i];
        }
    });
    return a;
}

HIDES.forEach(([hide, level], i) => {
    const a = plateArmourAt(level) * 0.6;
    const ranger = HIDE_CLASSES;
    const speed: StatLine = { stat: "moveSpeedPct", value: 2 + Math.floor(i / 2) };
    add({ id: idOf(`${hide} body`), name: `${hide} body`, objId: HIDE_BODIES[i], slot: "body", level, armour: Math.round(a * 2.6), implicit: [speed], classes: ranger });
    const legs = HIDE_LEGS[i];
    if (legs !== undefined) {
        add({ id: idOf(`${hide} chaps`), name: `${hide} chaps`, objId: legs, slot: "legs", level, armour: Math.round(a * 1.9), classes: ranger });
    }
    const hands = HIDE_HANDS[i];
    if (hands !== undefined) {
        add({
            id: idOf(`${hide} gloves`),
            name: i === 0 ? "Leather gloves" : `${hide} vambraces`,
            objId: hands,
            slot: "hands",
            level,
            armour: Math.round(a * 0.8 + 1),
            implicit: [{ stat: "attackSpeedPct", value: 2 + Math.floor(i / 2) }],
        });
    }
});
add({ id: "leather_cowl", name: "Leather cowl", objId: 1167, slot: "head", level: 1, armour: 3, classes: HIDE_CLASSES });
add({ id: "coif", name: "Coif", objId: 1169, slot: "head", level: 14, armour: 9, implicit: [{ stat: "critChance", value: 1 }], classes: HIDE_CLASSES });
add({ id: "leather_boots", name: "Leather boots", objId: 1061, slot: "feet", level: 1, armour: 2, implicit: [{ stat: "moveSpeedPct", value: 3 }] });

// Robes, for mages: little armour, but mana
const ROBES: [string, number, Slot, number, number][] = [
    ["Wizard hat", 1017, "head", 1, 1],
    ["Blue wizard hat", 579, "head", 10, 3],
    ["Mystic hat", 4089, "head", 30, 8],
    ["Blue wizard robe", 577, "body", 1, 3],
    ["Mystic robe top", 4091, "body", 30, 16],
    ["Skirt", 5048, "legs", 1, 2],
    ["Mystic robe bottom", 4093, "legs", 30, 12],
    ["Mystic gloves", 4095, "hands", 30, 5],
    ["Mystic boots", 4097, "feet", 30, 5],
];
ROBES.forEach(([name, objId, slot, level, armour]) => {
    add({
        id: idOf(name),
        name,
        objId,
        slot,
        level,
        armour,
        implicit: [
            { stat: "mana", value: 6 + Math.round(level * 0.9) },
            { stat: "manaRegen", value: Math.round((0.3 + level * 0.04) * 10) / 10 },
        ],
        classes: ROBE_CLASSES,
    });
});

// The Temple Knights' kit, for paladins: near plate's armour, with a little mana in it
const TEMPLAR: [string, number, Slot, number, number][] = [
    ["Initiate sallet", 5574, "head", 10, 1],
    ["Initiate hauberk", 5575, "body", 11, 2.6],
    ["Initiate cuisse", 5576, "legs", 10, 1.9],
    ["Proselyte sallet", 9672, "head", 24, 1],
    ["Proselyte hauberk", 9674, "body", 25, 2.6],
    ["Proselyte cuisse", 9676, "legs", 24, 1.9],
];
TEMPLAR.forEach(([name, objId, slot, level, share]) => {
    add({
        id: idOf(name),
        name,
        objId,
        slot,
        level,
        armour: Math.round(plateArmourAt(level) * share * 0.9),
        implicit: [{ stat: "mana", value: Math.round((4 + level * 0.6) * share) }],
        classes: ["paladin"],
    });
});

// The rogues' outfit: little armour, but it's hard to land a blow on whoever wears it
const ROGUE_KIT: [string, number, Slot, number, StatLine][] = [
    ["Rogue mask", 5554, "head", 8, { stat: "critChance", value: 1 }],
    ["Rogue top", 5553, "body", 9, { stat: "evade", value: 3 }],
    ["Rogue trousers", 5555, "legs", 8, { stat: "evade", value: 2 }],
    ["Rogue gloves", 5556, "hands", 8, { stat: "attackSpeedPct", value: 4 }],
    ["Rogue boots", 5557, "feet", 8, { stat: "moveSpeedPct", value: 5 }],
];
ROGUE_KIT.forEach(([name, objId, slot, level, implicit]) => {
    const share = slot === "body" ? 2.6 : slot === "legs" ? 1.9 : 0.8;
    add({ id: idOf(name), name, objId, slot, level, armour: Math.round(plateArmourAt(level) * 0.5 * share), implicit: [implicit], classes: ["rogue"] });
});

// A necromancer's: Zamorak's monks' robes, and bone
const NECRO_KIT: [string, number, Slot, number, number][] = [
    ["Zamorak monk top", 1035, "body", 1, 3],
    ["Zamorak monk bottom", 1033, "legs", 1, 2],
    ["Skeletal helm", 6137, "head", 20, 6],
    ["Skeletal top", 6139, "body", 21, 14],
    ["Skeletal bottoms", 6141, "legs", 20, 10],
    ["Skeletal gloves", 6153, "hands", 20, 4],
    ["Skeletal boots", 6147, "feet", 20, 4],
];
NECRO_KIT.forEach(([name, objId, slot, level, armour]) => {
    add({
        id: idOf(name),
        name,
        objId,
        slot,
        level,
        armour,
        implicit: [
            { stat: "mana", value: 5 + Math.round(level * 0.8) },
            level > 1 ? { stat: "evade", value: 1 + Math.floor(level / 12) } : { stat: "manaRegen", value: 0.3 },
        ],
        classes: ["necromancer"],
    });
});

// Books, held in the shield hand by those who'd rather read than block
const BOOKS: [string, number, number, StatLine[], ClassId[]][] = [
    ["Holy book", 3840, 1, [{ stat: "mana", value: 8 }, { stat: "lifeRegen", value: 0.5 }], ["paladin", "mage"]],
    ["Unholy book", 3842, 1, [{ stat: "mana", value: 8 }, { stat: "spellDamagePct", value: 5 }], ["necromancer", "mage"]],
    ["Book of balance", 3844, 16, [{ stat: "mana", value: 25 }, { stat: "castSpeedPct", value: 6 }, { stat: "spellDamagePct", value: 8 }], ["mage", "necromancer", "paladin"]],
];
BOOKS.forEach(([name, objId, level, implicit, classes]) => add({ id: idOf(name), name, objId, slot: "offhand", level, implicit, classes, family: "book" }));

// Capes: a little of something, by colour
const CAPES: [string, number, StatLine][] = [
    ["Red cape", 1007, { stat: "life", value: 10 }],
    ["Blue cape", 1021, { stat: "mana", value: 10 }],
    ["Green cape", 1027, { stat: "lifeRegen", value: 1 }],
    ["Yellow cape", 1023, { stat: "critChance", value: 1 }],
    ["Purple cape", 1029, { stat: "manaRegen", value: 1 }],
    ["Black cape", 1019, { stat: "armour", value: 8 }],
    ["Orange cape", 1031, { stat: "moveSpeedPct", value: 3 }],
];
CAPES.forEach(([name, objId, implicit]) => add({ id: idOf(name), name, objId, slot: "cape", level: 1, implicit: [implicit] }));

// Amulets and rings: what they're made of is what they're good for
const AMULETS: [string, number, number, StatLine[]][] = [
    ["Amulet of strength", 1725, 1, [{ stat: "damagePct", value: 8 }]],
    ["Amulet of magic", 1727, 1, [{ stat: "mana", value: 15 }]],
    ["Amulet of accuracy", 1478, 1, [{ stat: "critChance", value: 2 }]],
    ["Amulet of power", 1731, 14, [{ stat: "life", value: 15 }, { stat: "damagePct", value: 10 }]],
    ["Amulet of glory", 1704, 28, [{ stat: "life", value: 20 }, { stat: "mana", value: 20 }, { stat: "damagePct", value: 12 }]],
];
AMULETS.forEach(([name, objId, level, implicit]) => add({ id: idOf(name), name, objId, slot: "amulet", level, implicit }));

const RINGS: [string, number, number, StatLine[]][] = [
    ["Gold ring", 1635, 1, [{ stat: "lifeRegen", value: 1 }]],
    ["Sapphire ring", 1637, 6, [{ stat: "mana", value: 18 }]],
    ["Emerald ring", 1639, 12, [{ stat: "attackSpeedPct", value: 5 }]],
    ["Ruby ring", 1641, 18, [{ stat: "life", value: 25 }]],
    ["Diamond ring", 1643, 26, [{ stat: "critChance", value: 3 }]],
    ["Dragonstone ring", 1645, 34, [{ stat: "damagePct", value: 15 }]],
];
RINGS.forEach(([name, objId, level, implicit]) => add({ id: idOf(name), name, objId, slot: "ring", level, implicit }));

// Talismans, the runecrafter's keys to the altars: not worn, but set in the passive tree's sockets
// (talismans.ts). Each leans to the affixes of its rune's kind, three times as likely. Blood, death,
// law and soul talismans are uniques of their own (below).
const TALISMAN_BASES: [string, number, number, string[]][] = [
    ["Air talisman", 1438, 1, ["tProjectile", "tKilledSpeed"]],
    ["Mind talisman", 1448, 1, ["tSpell", "tMana"]],
    ["Water talisman", 1444, 6, ["tFreeze", "tVsChilled"]],
    ["Earth talisman", 1440, 6, ["tShield", "tBuffedDefence"]],
    ["Fire talisman", 1442, 10, ["tBurn", "tVsBurning"]],
    ["Body talisman", 1446, 10, ["tMelee", "tLife"]],
    ["Chaos talisman", 1452, 16, ["tThrall", "tThrallSpeed"]],
    ["Cosmic talisman", 1454, 20, ["tBuff", "tKilled"]],
    ["Nature talisman", 1462, 26, ["tElemental", "tVsShocked", "tCrit"]],
];
TALISMAN_BASES.forEach(([name, objId, level, lean]) => add({ id: idOf(name), name, objId, slot: "talisman", level, lean }));

// ---- Potions (potions.ts): carried in the belt, their icon the cache's for the doses left ----

// The lesser and greater grades named (-) and (+) in OSRS: "xerics_aid_minus", "xerics_aid_plus"
POTION_BASES.forEach((p) => add({ id: idOf(p.name.replace("(-)", "minus").replace("(+)", "plus")), name: p.name, objId: p.potion.icons[p.potion.icons.length - 1], slot: "potion", level: p.level, potion: p.potion }));

// ---- Elite bases ----

// Diablo II's elite bases, from OSRS's best gear: God Wars' at 55, the Nightmare's, the Theatre's
// and Chambers' at 70, Nex's and the Tombs' at 85. Only the ladder drops them (loot.ts pickBase:
// past LADDER_DEPTH's area level), and the transmuting circle makes one of a normal base of its
// slot and kind. Their numbers go on from the metals', bows' and staves' own.
export const ELITE_LEVELS = [55, 70, 85];
const ELITE_PLATE = [58, 72, 88];
const ELITE_BLADE: [number, number][] = [
    [43, 70],
    [56, 90],
    [69, 111],
];
const ELITE_BOW: [number, number][] = [
    [34, 57],
    [44, 73],
    [54, 90],
];
const eliteStaff = (level: number): [number, number] => [Math.round(3 + level * 0.62), Math.round(7 + level * 1.05)];

type EliteArmour = [name: string, objId: number, slot: Slot, tier: number, kind: "plate" | "hide" | "robe", classes: ClassId[]];
const ELITE_ARMOUR: EliteArmour[] = [
    ["Bandos chestplate", 11832, "body", 0, "plate", PLATE_CLASSES],
    ["Bandos tassets", 11834, "legs", 0, "plate", PLATE_CLASSES],
    ["Bandos boots", 11836, "feet", 0, "plate", PLATE_CLASSES],
    ["Armadyl helmet", 11826, "head", 0, "hide", HIDE_CLASSES],
    ["Armadyl chestplate", 11828, "body", 0, "hide", HIDE_CLASSES],
    ["Armadyl chainskirt", 11830, "legs", 0, "hide", HIDE_CLASSES],
    ["Inquisitor's great helm", 24419, "head", 1, "plate", PLATE_CLASSES],
    ["Inquisitor's hauberk", 24420, "body", 1, "plate", PLATE_CLASSES],
    ["Inquisitor's plateskirt", 24421, "legs", 1, "plate", PLATE_CLASSES],
    ["Justiciar faceguard", 22326, "head", 1, "plate", ["paladin"]],
    ["Justiciar chestguard", 22327, "body", 1, "plate", ["paladin"]],
    ["Justiciar legguards", 22328, "legs", 1, "plate", ["paladin"]],
    ["Ancestral hat", 21018, "head", 1, "robe", ROBE_CLASSES],
    ["Ancestral robe top", 21021, "body", 1, "robe", ROBE_CLASSES],
    ["Ancestral robe bottom", 21024, "legs", 1, "robe", ROBE_CLASSES],
    ["Torva full helm", 26382, "head", 2, "plate", PLATE_CLASSES],
    ["Torva platebody", 26384, "body", 2, "plate", PLATE_CLASSES],
    ["Torva platelegs", 26386, "legs", 2, "plate", PLATE_CLASSES],
    ["Masori mask", 27226, "head", 2, "hide", HIDE_CLASSES],
    ["Masori body", 27229, "body", 2, "hide", HIDE_CLASSES],
    ["Masori chaps", 27232, "legs", 2, "hide", HIDE_CLASSES],
    ["Virtus mask", 26241, "head", 2, "robe", ROBE_CLASSES],
    ["Virtus robe top", 26243, "body", 2, "robe", ROBE_CLASSES],
    ["Virtus robe bottom", 26245, "legs", 2, "robe", ROBE_CLASSES],
];
const ELITE_SHARE: Record<Slot, number> = { head: 1, body: 2.6, legs: 1.9, feet: 0.8, hands: 0.8, offhand: 1.7, weapon: 0, cape: 0, amulet: 0, ring: 0, talisman: 0, potion: 0 };
ELITE_ARMOUR.forEach(([name, objId, slot, tier, kind, classes]) => {
    const level = ELITE_LEVELS[tier] + (slot === "body" ? 1 : 0);
    const plate = ELITE_PLATE[tier] * ELITE_SHARE[slot];
    const share = slot === "body" ? 2.6 : slot === "legs" ? 1.9 : 1;
    const implicit: StatLine[] =
        kind === "robe"
            ? [{ stat: "mana", value: Math.round((10 + level * 0.6) * share) }]
            : kind === "hide"
              ? [{ stat: "evade", value: Math.round(2 + tier + share) }]
              : // Justiciar's is the most armour, and takes less besides
                classes.length === 1
                ? [{ stat: "lessDamageTaken", value: 1 + tier }]
                : [{ stat: "life", value: Math.round((12 + level * 0.3) * share) }];
    add({ id: idOf(name), name, objId, slot, level, armour: Math.round(plate * (kind === "plate" ? (classes.length === 1 ? 1.1 : 1) : kind === "hide" ? 0.6 : 0.3)), implicit, classes, elite: true });
});

type EliteWeapon = [name: string, objId: number, tier: number, weapon: Omit<WeaponDef, "damage"> & { times: number }, classes: ClassId[], family?: Family];
const ELITE_WEAPONS: EliteWeapon[] = [
    ["Bandos godsword", 11804, 0, { kind: "melee", times: 1.6, speed: 0.95, seq: SEQ.smash }, BLADE_CLASSES, "maul"],
    ["Saradomin godsword", 11806, 0, { kind: "melee", times: 1.6, speed: 0.95, seq: SEQ.smash }, ["paladin", "warrior"], "maul"],
    ["Zamorak godsword", 11808, 0, { kind: "melee", times: 1.6, speed: 0.95, seq: SEQ.smash }, BLADE_CLASSES, "maul"],
    ["Armadyl crossbow", 11785, 0, { kind: "bow", times: 1.2, speed: 1.25, seq: SEQ.shoot, arrow: SPOT.runeArrow }, BOW_CLASSES, "shortbow"],
    ["Nightmare staff", 24422, 0, { kind: "staff", times: 1, speed: 1.25, seq: SEQ.cast }, ROBE_CLASSES, "staff"],
    ["Inquisitor's mace", 24417, 1, { kind: "melee", times: 1.15, speed: 1.45, seq: SEQ.pound }, ["paladin", "warrior"], "mace"],
    ["Ghrazi rapier", 22324, 1, { kind: "melee", times: 0.9, speed: 1.9, seq: SEQ.stab }, ["rogue", "warrior"], "dagger"],
    ["Bow of Faerdhinen", 25865, 1, { kind: "bow", times: 1, speed: 1.5, seq: SEQ.shoot, arrow: SPOT.dragonArrow }, BOW_CLASSES, "shortbow"],
    ["Kodai wand", 21006, 1, { kind: "staff", times: 1, speed: 1.3, seq: SEQ.cast }, ROBE_CLASSES, "staff"],
    ["Soulreaper axe", 28338, 2, { kind: "melee", times: 1.7, speed: 1.05, seq: SEQ.hack }, BLADE_CLASSES, "battleaxe"],
    ["Osmumten's fang", 26219, 2, { kind: "melee", times: 0.9, speed: 2.0, seq: SEQ.stab }, ["rogue"], "dagger"],
    ["Zaryte crossbow", 26374, 2, { kind: "bow", times: 1.2, speed: 1.3, seq: SEQ.shoot, arrow: SPOT.dragonArrow }, BOW_CLASSES, "shortbow"],
    ["Tumeken's shadow", 27275, 2, { kind: "staff", times: 1, speed: 1.25, seq: SEQ.cast }, ROBE_CLASSES, "staff"],
];
ELITE_WEAPONS.forEach(([name, objId, tier, w, classes, family]) => {
    const level = ELITE_LEVELS[tier] + 1;
    const damage = w.kind === "staff" ? eliteStaff(level) : scaled(w.kind === "bow" ? ELITE_BOW[tier] : ELITE_BLADE[tier], w.times);
    const implicit: StatLine[] =
        w.kind === "staff" ? [{ stat: "mana", value: 10 + Math.round(level * 1.2) }] : family === "dagger" ? [{ stat: "critChance", value: 4 + tier }] : family === "mace" ? [{ stat: "stunChance", value: 10 + tier * 2 }] : [];
    add({ id: idOf(name), name, objId, slot: "weapon", level, weapon: { kind: w.kind, damage, speed: w.speed, seq: w.seq, arrow: w.arrow }, implicit, classes, family, elite: true });
});

// ---- Uniques ----

// A unique's power of its own, past its numbers, a trait's and a keystone's (POWER_TEXT)
export type UniquePower =
    // Thralls burst as they crumble, hitting what's near for a share of their blow
    | "thrallBurst"
    // A chance to take less from each hit
    | "elysian"
    // Less from what falls from the sky: guardians' slams and rains
    | "spectral"
    // The tree's wings' notables' (passives.ts): a rare's or a guardian's death starts the thralls'
    // time again; a burning enemy's death sets those near alight; once a minute a killing blow
    // leaves the hero standing; melee hits now and then heal
    | "deathCharge"
    | "pyre"
    | "redemption"
    | "guthans"
    // The Barrows brothers' sets' own (SETS), each a brother's way of fighting: Ahrim's spells hit
    // harder now and then, Karil's shots hit twice, Torag's blows slow, Verac's go through armour
    | "ahrims"
    | "karils"
    | "torags"
    | "veracs";

// What each power does, as a tooltip says it
export const POWER_TEXT: Record<UniquePower, string> = {
    thrallBurst: "Your thralls burst as they crumble, hitting enemies near for 150% of their blow",
    elysian: "70% chance to take 25% less damage from each hit",
    spectral: "You take 40% less damage from guardians' slams and rains",
    deathCharge: "When a rare enemy or a guardian dies, your thralls' time starts again",
    pyre: "An enemy burning as it dies sets those within 2 tiles alight",
    redemption: "Once a minute, a hit that would kill you leaves you on 1 life, and heals 30% of your life over 2 seconds",
    guthans: "Your melee hits have a 25% chance to heal you for 30% of the damage they deal",
    ahrims: "Your spells have a 25% chance to deal 30% more damage",
    karils: "Your projectiles have a 25% chance to hit again for half their damage",
    torags: "Your hits slow enemies by 30% for 2 seconds",
    veracs: "Your melee hits have a 25% chance to ignore armour and wards",
};

export const THRALL_BURST = { share: 1.5, radius: 2.4 };
export const ELYSIAN = { chance: 0.7, less: 0.25 };
export const SPECTRAL_LESS = 0.4;
export const PYRE_RADIUS = 2;
export const REDEMPTION = { every: 60, heal: 0.3, seconds: 2 };
export const GUTHANS = { chance: 0.25, heal: 0.3 };
export const AHRIMS = { chance: 0.25, more: 0.3 };
export const KARILS = { chance: 0.25, share: 0.5 };
export const TORAGS = { slow: 0.3, seconds: 2 };
export const VERACS = { chance: 0.25 };

// Diablo II's "chance to cast": a skill gem's skill (gems.ts) at a level of its own, cast for no
// mana and no time at what was hit, what hit the hero, or where a kill fell, as a gem's would be.
// A cast from one carries no chance to cast, so nothing recurs, and one proc casts at most once in
// PROC_SECONDS, so a fan of arrows doesn't cast it six times.
export type ProcWhen = "strike" | "struck" | "kill";
export type Proc = { when: ProcWhen; chance: number; gem: string; level: number };
export const PROC_WHEN_TEXT: Record<ProcWhen, string> = { strike: "when you hit an enemy", struck: "when you're hit", kill: "when you kill an enemy" };
export const PROC_SECONDS = 0.4;

// A unique talisman's power over the tree round its socket (talismans.ts), in the tree's units: the
// rings are 400 apart
export type TalismanPower = "omni" | "catalytic" | "bloodConversion" | "deathConversion" | "lawConversion" | "soul";

export const TALISMAN_RADIUS = { small: 300, medium: 450, large: 650 };

export const TALISMAN_POWER_TEXT: Record<TalismanPower, string> = {
    omni: "Passives in its radius can be taken without being joined to your tree",
    catalytic: "Small passives in its radius give 50% more; notables in it give nothing",
    bloodConversion: "Mana passives in its radius give life instead",
    deathConversion: "Melee, projectile and spell damage passives in its radius give thrall damage instead",
    lawConversion: "Attribute passives in its radius give +4 to every attribute instead",
    soul: "Your forged gems' and uniques' traits are 40% stronger; your other skill gems deal 20% less damage",
};

export const CATALYTIC_MORE = 1.5;
export const LAW_EACH = 4;
export const SOUL = { traits: 1.4, written: 0.8 };

export type UniqueDef = {
    id: string;
    name: string;
    objId: number;
    slot: Slot;
    level: number;
    weapon?: WeaponDef;
    armour?: number;
    stats: StatLine[];
    lore: string;
    classes?: ClassId[];
    // What makes it more than its numbers, so it's a way to play and not only an upgrade: a forged
    // gem's traits (forge.ts) on every skill of the kinds each suits, at these values and at no
    // cost to the skill's damage; a keystone's rule (passives.ts), as if taken on the tree; or a
    // power of its own
    traits?: SkillTraits;
    keystone?: KeystoneId;
    power?: UniquePower;
    // Only from this pinnacle's guardian (content/pinnacles.ts), never from anything else
    pinnacle?: PinnacleId;
    family?: Family;
    // A unique talisman's power over the tree round its socket, and how far it reaches
    talisman?: { power: TalismanPower; radius?: number };
    // A unique potion's (potions.ts): its doses and its rule, and its rule in words
    potion?: PotionDef;
    potionText?: string[];
    // A set's piece (SETS): green, its numbers fixed, and the set's bonuses for the pieces worn
    // together. Where it comes from, if not from anything that drops uniques: the Barrows chest
    // and its brothers, a stall in the strangers' camp for an encounter's money (SET_PRICES), or the
    // ladder's guardians and rares (Graceful)
    set?: SetId;
    // or the transmuting circle, which makes it of another unique and a part (circle.ts UPGRADES)
    source?: "barrows" | "stall" | "ladder" | "upgrade";
    // Chances to cast (Proc)
    procs?: Proc[];
};

export const UNIQUES: UniqueDef[] = [
    {
        id: "abyssal_whip",
        family: "whip",
        name: "Abyssal whip",
        objId: 4151,
        slot: "weapon",
        level: 30,
        weapon: { kind: "melee", damage: [22, 34], speed: 1.9, seq: SEQ.whip },
        stats: [
            { stat: "attackSpeedPct", value: 15 },
            { stat: "lifeLeech", value: 3 },
            { stat: "damagePct", value: 30 },
        ],
        lore: "Torn from the Abyss, it still remembers the taste of blood.",
        traits: { echo: 0.4 },
        classes: BLADE_CLASSES,
    },
    {
        id: "granite_maul",
        family: "maul",
        name: "Granite maul",
        objId: 4153,
        slot: "weapon",
        level: 22,
        weapon: { kind: "melee", damage: [36, 64], speed: 0.85, seq: SEQ.smash },
        stats: [
            { stat: "damagePct", value: 40 },
            { stat: "critMulti", value: 40 },
            { stat: "life", value: 30 },
        ],
        lore: "Slow as a landslide, and as final.",
        traits: { surging: 1 },
        classes: BLADE_CLASSES,
    },
    {
        id: "dark_bow",
        family: "longbow",
        name: "Dark bow",
        objId: 11235,
        slot: "weapon",
        level: 28,
        weapon: { kind: "bow", damage: [20, 34], speed: 1.0, seq: SEQ.shoot, arrow: SPOT.dragonArrow },
        stats: [
            { stat: "extraProjectiles", value: 1 },
            { stat: "damagePct", value: 25 },
        ],
        lore: "Two arrows, one heartbeat.",
        traits: { thunder: 0.2 },
        classes: BOW_CLASSES,
    },
    {
        id: "twisted_bow",
        family: "shortbow",
        name: "Twisted bow",
        objId: 20997,
        slot: "weapon",
        level: 40,
        weapon: { kind: "bow", damage: [32, 56], speed: 1.2, seq: SEQ.shoot, arrow: SPOT.dragonArrow },
        stats: [
            { stat: "damagePct", value: 50 },
            { stat: "critChance", value: 5 },
            { stat: "critMulti", value: 30 },
        ],
        lore: "Strung from the very will of the Great Olm.",
        traits: { splitting: 2 },
        classes: BOW_CLASSES,
    },
    {
        id: "ancient_staff",
        family: "staff",
        name: "Ancient staff",
        objId: 4675,
        slot: "weapon",
        level: 22,
        weapon: { kind: "staff", damage: [20, 34], speed: 1.3, seq: SEQ.cast },
        stats: [
            { stat: "damagePct", value: 25 },
            { stat: "mana", value: 40 },
            { stat: "manaRegen", value: 3 },
        ],
        lore: "Its runes were old before Saradomin came.",
        traits: { numbing: 0.3 },
        classes: ROBE_CLASSES,
    },
    {
        id: "staff_of_the_dead",
        family: "staff",
        name: "Staff of the Dead",
        objId: 11791,
        slot: "weapon",
        level: 38,
        weapon: { kind: "staff", damage: [30, 50], speed: 1.35, seq: SEQ.cast },
        stats: [
            { stat: "damagePct", value: 40 },
            { stat: "lifeLeech", value: 2 },
            { stat: "critChance", value: 3 },
        ],
        lore: "Zamorak's own, and it has not forgotten whose.",
        traits: { grave: 0.2 },
        classes: ROBE_CLASSES,
    },
    {
        id: "ivandis_flail",
        family: "mace",
        name: "Ivandis flail",
        objId: 22398,
        slot: "weapon",
        level: 26,
        weapon: { kind: "melee", damage: [24, 44], speed: 1.4, seq: SEQ.pound },
        stats: [
            { stat: "damagePct", value: 25 },
            { stat: "shockChance", value: 15 },
            { stat: "mana", value: 30 },
            { stat: "life", value: 30 },
        ],
        lore: "Blessed silver, for the things that should have stayed in their graves.",
        traits: { volatile: 0.5 },
        classes: ["paladin"],
    },
    {
        id: "darklight",
        family: "sword",
        name: "Darklight",
        objId: 6746,
        slot: "weapon",
        level: 24,
        weapon: { kind: "melee", damage: [16, 30], speed: 2.0, seq: SEQ.stab },
        stats: [
            { stat: "critChance", value: 6 },
            { stat: "critMulti", value: 35 },
            { stat: "lifeOnHit", value: 4 },
        ],
        lore: "Silverlight, quenched in shadow. It never shows where it will strike.",
        traits: { bloodthirst: 0.25 },
        classes: ["rogue"],
    },
    {
        id: "skull_sceptre",
        family: "staff",
        name: "Skull sceptre",
        objId: 9013,
        slot: "weapon",
        level: 18,
        weapon: { kind: "staff", damage: [14, 26], speed: 1.3, seq: SEQ.cast },
        stats: [
            { stat: "damagePct", value: 25 },
            { stat: "durationPct", value: 30 },
            { stat: "lifeOnKill", value: 6 },
        ],
        lore: "The Stronghold's dead answer whoever holds it.",
        power: "thrallBurst",
        classes: ["necromancer"],
    },
    {
        id: "fire_cape",
        name: "Fire cape",
        objId: 6570,
        slot: "cape",
        level: 30,
        stats: [
            { stat: "life", value: 60 },
            { stat: "damagePct", value: 15 },
            { stat: "lifeRegen", value: 3 },
        ],
        lore: "Earned in the Fight Caves, and still warm.",
        traits: { smoulder: 0.4 },
    },
    {
        id: "obsidian_cape",
        name: "Obsidian cape",
        objId: 6568,
        slot: "cape",
        level: 15,
        armour: 30,
        stats: [
            { stat: "life", value: 30 },
            { stat: "armourPct", value: 25 },
        ],
        lore: "Volcanic glass, spun like silk.",
        keystone: "ironSkin",
    },
    {
        id: "barrows_gloves",
        name: "Barrows gloves",
        objId: 7462,
        slot: "hands",
        level: 25,
        armour: 20,
        stats: [
            { stat: "damagePct", value: 12 },
            { stat: "attackSpeedPct", value: 8 },
            { stat: "life", value: 30 },
            { stat: "mana", value: 20 },
        ],
        lore: "A cook's reward for a long road.",
        traits: { vortex: 1.2 },
    },
    {
        id: "dragon_boots",
        name: "Dragon boots",
        objId: 11840,
        slot: "feet",
        level: 30,
        armour: 40,
        stats: [
            { stat: "moveSpeedPct", value: 12 },
            { stat: "life", value: 25 },
        ],
        lore: "Spiritual mages never wanted to give these up.",
        keystone: "acrobatics",
    },
    {
        id: "amulet_of_fury",
        name: "Amulet of fury",
        objId: 6585,
        slot: "amulet",
        level: 32,
        stats: [
            { stat: "life", value: 40 },
            { stat: "mana", value: 30 },
            { stat: "critChance", value: 4 },
            { stat: "damagePct", value: 15 },
        ],
        lore: "An onyx set in gold, and in rage.",
        keystone: "zamoraksFury",
    },
    {
        id: "berserker_ring",
        name: "Berserker ring",
        objId: 6737,
        slot: "ring",
        level: 20,
        stats: [
            { stat: "damagePct", value: 20 },
            { stat: "critMulti", value: 30 },
        ],
        lore: "Taken from a Dagannoth King's hoard.",
        traits: { frenzy: 0.06 },
    },
    {
        id: "archers_ring",
        name: "Archers ring",
        objId: 6733,
        slot: "ring",
        level: 20,
        stats: [
            { stat: "attackSpeedPct", value: 12 },
            { stat: "critChance", value: 3 },
        ],
        lore: "Steady hands, steady heart.",
        keystone: "pointBlank",
    },
    {
        id: "seers_ring",
        name: "Seers ring",
        objId: 6731,
        slot: "ring",
        level: 20,
        stats: [
            { stat: "mana", value: 40 },
            { stat: "manaRegen", value: 4 },
        ],
        lore: "It sees what you'll cast before you do.",
        keystone: "mindOverMatter",
    },
    {
        id: "warrior_ring",
        name: "Warrior ring",
        objId: 6735,
        slot: "ring",
        level: 20,
        stats: [
            { stat: "life", value: 45 },
            { stat: "armour", value: 40 },
        ],
        lore: "For those who stand in front.",
        traits: { warding: 0.03 },
    },
    // A unique for most of the tree's wings' keystones, so a build can be found as well as taken
    // (docs/design.md, the passive tree)
    {
        id: "book_of_the_dead",
        name: "Book of the Dead",
        objId: 25818,
        slot: "offhand",
        level: 30,
        stats: [
            { stat: "thrallDamagePct", value: 25 },
            { stat: "mana", value: 30 },
            { stat: "durationPct", value: 15 },
        ],
        lore: "Arceuus's own. Every page of it was someone.",
        keystone: "arceuusCovenant",
        classes: ["necromancer"],
        family: "book",
    },
    {
        id: "infernal_cape",
        name: "Infernal cape",
        objId: 21295,
        slot: "cape",
        level: 42,
        stats: [
            { stat: "life", value: 70 },
            { stat: "elementalDamagePct", value: 20 },
            { stat: "burnDamagePct", value: 30 },
        ],
        lore: "Pulled from the Inferno, and it never stopped burning.",
        keystone: "inferno",
    },
    {
        id: "graceful_boots",
        name: "Graceful boots",
        objId: 11860,
        slot: "feet",
        level: 20,
        armour: 8,
        stats: [
            { stat: "moveSpeedPct", value: 15 },
            { stat: "evade", value: 4 },
        ],
        lore: "So light you forget you're running.",
        keystone: "graceful",
        // A unique first, as Dharok's greataxe was: now the Graceful outfit's boots too (SETS)
        set: "graceful",
    },
    {
        id: "dharoks_greataxe",
        name: "Dharok's greataxe",
        objId: 25516,
        slot: "weapon",
        level: 36,
        weapon: { kind: "melee", damage: [44, 76], speed: 0.9, seq: SEQ.hack },
        stats: [
            { stat: "damagePct", value: 30 },
            { stat: "life", value: 40 },
        ],
        lore: "The nearer Dharok came to death, the harder he struck.",
        keystone: "dharoksCurse",
        classes: BLADE_CLASSES,
        family: "battleaxe",
        set: "dharok",
    },
    {
        id: "ring_of_suffering",
        name: "Ring of suffering",
        objId: 19550,
        slot: "ring",
        level: 35,
        stats: [
            { stat: "life", value: 40 },
            { stat: "armour", value: 60 },
        ],
        lore: "Every blow you take, it remembers, and gives back.",
        keystone: "vengeance",
    },
    {
        id: "dragon_claws",
        name: "Dragon claws",
        objId: 13652,
        slot: "weapon",
        level: 38,
        weapon: { kind: "melee", damage: [22, 38], speed: 2.0, seq: SEQ.slash },
        stats: [
            { stat: "critChance", value: 6 },
            { stat: "critMulti", value: 40 },
            { stat: "attackSpeedPct", value: 8 },
        ],
        lore: "Once they find a gap, they find it four times.",
        keystone: "dragonClaws",
        classes: ["rogue"],
        family: "claws",
    },
    {
        id: "ice_ancient_sceptre",
        name: "Ice ancient sceptre",
        objId: 25490,
        slot: "weapon",
        level: 34,
        weapon: { kind: "staff", damage: [26, 46], speed: 1.3, seq: SEQ.cast },
        stats: [
            { stat: "damagePct", value: 30 },
            { stat: "freezeChance", value: 10 },
            { stat: "mana", value: 40 },
        ],
        lore: "So cold that what it touches breaks.",
        keystone: "iceBarrage",
        classes: ROBE_CLASSES,
        family: "staff",
    },
    // The unique talismans, set in the tree's sockets as the others are (talismans.ts): five with a
    // power over the nodes round their socket, and the Soul talisman's over every forged trait. The
    // cache has no Omni-talisman; the Elemental talisman, which opens four altars, does its work.
    {
        id: "elemental_talisman",
        name: "Elemental talisman",
        objId: 5516,
        slot: "talisman",
        level: 28,
        stats: [{ stat: "elementalDamagePct", value: 8 }],
        lore: "It opens four altars, and a good deal else.",
        talisman: { power: "omni", radius: TALISMAN_RADIUS.large },
    },
    {
        id: "catalytic_talisman",
        name: "Catalytic talisman",
        objId: 26798,
        slot: "talisman",
        level: 20,
        stats: [],
        lore: "What's near it becomes more of what it is.",
        talisman: { power: "catalytic", radius: TALISMAN_RADIUS.medium },
    },
    {
        id: "blood_talisman",
        name: "Blood talisman",
        objId: 1450,
        slot: "talisman",
        level: 14,
        stats: [{ stat: "lifePct", value: 4 }],
        lore: "Warm to the touch, and it beats.",
        talisman: { power: "bloodConversion", radius: TALISMAN_RADIUS.medium },
    },
    {
        id: "death_talisman",
        name: "Death talisman",
        objId: 1456,
        slot: "talisman",
        level: 14,
        stats: [{ stat: "thrallDamagePct", value: 8 }],
        lore: "What's near it serves something else now.",
        talisman: { power: "deathConversion", radius: TALISMAN_RADIUS.medium },
    },
    {
        id: "law_talisman",
        name: "Law talisman",
        objId: 1458,
        slot: "talisman",
        level: 14,
        stats: [],
        lore: "Saradomin's order: a little of everything, and everything in its place.",
        talisman: { power: "lawConversion", radius: TALISMAN_RADIUS.medium },
    },
    {
        id: "soul_talisman",
        name: "Soul talisman",
        objId: 1460,
        slot: "talisman",
        level: 30,
        stats: [],
        lore: "It knows a thing made in the rift from a thing made by hand.",
        talisman: { power: "soul" },
    },
    // The pinnacle uniques: only a pinnacle's guardian drops them (content/pinnacles.ts), these the Heart
    // of the Rift's
    {
        id: "spectral_spirit_shield",
        family: "shield",
        name: "Spectral spirit shield",
        objId: 12821,
        slot: "offhand",
        level: 50,
        armour: 120,
        stats: [
            { stat: "life", value: 60 },
            { stat: "armourPct", value: 20 },
        ],
        lore: "Blessed by the spirits that walk the space between rifts.",
        power: "spectral",
        pinnacle: "heart",
    },
    {
        id: "arcane_spirit_shield",
        family: "shield",
        name: "Arcane spirit shield",
        objId: 12825,
        slot: "offhand",
        level: 50,
        armour: 60,
        stats: [
            { stat: "spellDamagePct", value: 30 },
            { stat: "mana", value: 60 },
        ],
        lore: "The sigil hums with every spell, and answers it.",
        traits: { echo: 0.5 },
        classes: ROBE_CLASSES,
        pinnacle: "heart",
    },
    {
        id: "elysian_spirit_shield",
        family: "shield",
        name: "Elysian spirit shield",
        objId: 12817,
        slot: "offhand",
        level: 55,
        armour: 140,
        stats: [
            { stat: "life", value: 80 },
            { stat: "armourPct", value: 25 },
        ],
        lore: "Most blows that find you find nothing worth breaking.",
        power: "elysian",
        classes: PLATE_CLASSES,
        pinnacle: "heart",
    },
    {
        id: "necklace_of_anguish",
        name: "Necklace of anguish",
        objId: 19547,
        slot: "amulet",
        level: 50,
        stats: [
            { stat: "projectileDamagePct", value: 30 },
            { stat: "dex", value: 25 },
            { stat: "critChance", value: 4 },
        ],
        lore: "Cut from the Heart's own stone, and it weeps for it.",
        traits: { returning: 1 },
        classes: BOW_CLASSES,
        pinnacle: "heart",
    },
    {
        id: "amulet_of_torture",
        name: "Amulet of torture",
        objId: 19553,
        slot: "amulet",
        level: 50,
        stats: [
            { stat: "meleeDamagePct", value: 30 },
            { stat: "str", value: 25 },
            { stat: "lifeLeech", value: 2 },
        ],
        lore: "It tightens with every blow you land.",
        traits: { numbing: 0.4 },
        classes: BLADE_CLASSES,
        pinnacle: "heart",
    },
    // The gods' generals' own (content/pinnacles.ts), each a godsword (or) for those who fight up
    // close, the god's d'hide body for those who shoot, and the god's stole for those who cast; the
    // Abyssal Sire's dagger, bludgeon and lantern (find-objs.ts: every objId here)
    {
        id: "bandos_godsword_or",
        family: "maul",
        name: "Bandos godsword (or)",
        objId: 20370,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [84, 138], speed: 0.95, seq: SEQ.smash },
        stats: [
            { stat: "damagePct", value: 40 },
            { stat: "armourPct", value: 20 },
        ],
        lore: "Graardor's own, taken from his hand. Warstrike: what it hits stays down.",
        traits: { volatile: 0.5 },
        procs: [{ when: "strike", chance: 0.1, gem: "slam", level: 25 }],
        classes: BLADE_CLASSES,
        pinnacle: "graardor",
    },
    {
        id: "bandos_dhide_body",
        name: "Bandos d'hide body",
        objId: 12500,
        slot: "body",
        level: 67,
        armour: 110,
        stats: [
            { stat: "life", value: 80 },
            { stat: "projectileDamagePct", value: 25 },
        ],
        lore: "Tanned by orks who never once stopped to ask why.",
        traits: { frenzy: 0.06 },
        classes: HIDE_CLASSES,
        pinnacle: "graardor",
    },
    {
        id: "bandos_stole",
        name: "Bandos stole",
        objId: 12269,
        slot: "amulet",
        level: 67,
        stats: [
            { stat: "spellDamagePct", value: 30 },
            { stat: "life", value: 60 },
        ],
        lore: "Bandos has priests. They are mostly very large.",
        traits: { volatile: 0.45 },
        classes: ROBE_CLASSES,
        pinnacle: "graardor",
    },
    {
        id: "armadyl_godsword_or",
        family: "maul",
        name: "Armadyl godsword (or)",
        objId: 20368,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [80, 132], speed: 1.0, seq: SEQ.smash },
        stats: [
            { stat: "critChance", value: 8 },
            { stat: "critMulti", value: 40 },
        ],
        lore: "Kree'arra's, and the Judgement still rings in it.",
        traits: { surging: 1.2 },
        procs: [{ when: "strike", chance: 0.08, gem: "storm_of_armadyl", level: 25 }],
        classes: BLADE_CLASSES,
        pinnacle: "kreearra",
    },
    {
        id: "armadyl_dhide_body",
        name: "Armadyl d'hide body",
        objId: 12508,
        slot: "body",
        level: 67,
        armour: 100,
        stats: [
            { stat: "critChance", value: 5 },
            { stat: "projectileDamagePct", value: 30 },
        ],
        lore: "Light as the feathers it's stitched with.",
        traits: { splitting: 2 },
        procs: [{ when: "strike", chance: 0.06, gem: "storm_of_armadyl", level: 25 }],
        classes: HIDE_CLASSES,
        pinnacle: "kreearra",
    },
    {
        id: "armadyl_stole",
        name: "Armadyl stole",
        objId: 12257,
        slot: "amulet",
        level: 67,
        stats: [
            { stat: "spellDamagePct", value: 30 },
            { stat: "castSpeedPct", value: 10 },
        ],
        lore: "Worn by the Aviansie's few priests, high up where the air thins.",
        traits: { thunder: 0.2 },
        classes: ROBE_CLASSES,
        pinnacle: "kreearra",
    },
    {
        id: "zamorak_godsword_or",
        family: "maul",
        name: "Zamorak godsword (or)",
        objId: 20374,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [84, 138], speed: 0.95, seq: SEQ.smash },
        stats: [
            { stat: "damagePct", value: 35 },
            { stat: "lifeLeech", value: 3 },
        ],
        lore: "K'ril's, cold as his fire is hot. Ice Cleave: what it hits can't run.",
        traits: { numbing: 0.4 },
        procs: [{ when: "strike", chance: 0.1, gem: "icenova", level: 25 }],
        classes: BLADE_CLASSES,
        pinnacle: "kril",
    },
    {
        id: "zamorak_dhide_body",
        name: "Zamorak d'hide body",
        objId: 10370,
        slot: "body",
        level: 67,
        armour: 100,
        stats: [
            { stat: "projectileDamagePct", value: 25 },
            { stat: "burnDamagePct", value: 40 },
        ],
        lore: "It smells of brimstone, however often it's washed.",
        traits: { smoulder: 0.45 },
        classes: HIDE_CLASSES,
        pinnacle: "kril",
    },
    {
        id: "zamorak_stole",
        name: "Zamorak stole",
        objId: 10474,
        slot: "amulet",
        level: 67,
        stats: [
            { stat: "spellDamagePct", value: 35 },
            { stat: "igniteChance", value: 15 },
        ],
        lore: "Zamorak's priests wear it for the blood it hides.",
        traits: { smoulder: 0.5 },
        procs: [{ when: "kill", chance: 0.15, gem: "firewave", level: 25 }],
        classes: ROBE_CLASSES,
        pinnacle: "kril",
    },
    {
        id: "saradomin_godsword_or",
        family: "maul",
        name: "Saradomin godsword (or)",
        objId: 20372,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [80, 132], speed: 0.95, seq: SEQ.smash },
        stats: [
            { stat: "damagePct", value: 30 },
            { stat: "lifeOnHit", value: 12 },
        ],
        lore: "Zilyana's, and Healing Blade's still in it: every blow mends.",
        traits: { warding: 0.03 },
        procs: [{ when: "strike", chance: 0.1, gem: "saradomin_strike", level: 25 }],
        classes: ["paladin", "warrior"],
        pinnacle: "zilyana",
    },
    {
        id: "saradomin_dhide_body",
        name: "Saradomin d'hide body",
        objId: 10386,
        slot: "body",
        level: 67,
        armour: 110,
        stats: [
            { stat: "life", value: 60 },
            { stat: "projectileDamagePct", value: 25 },
        ],
        lore: "Blessed, and quick with it.",
        traits: { thunder: 0.18 },
        classes: HIDE_CLASSES,
        pinnacle: "zilyana",
    },
    {
        id: "saradomin_stole",
        name: "Saradomin stole",
        objId: 10470,
        slot: "amulet",
        level: 67,
        stats: [
            { stat: "spellDamagePct", value: 30 },
            { stat: "manaRegen", value: 6 },
        ],
        lore: "The weave is blessed; the wearer had better be.",
        traits: { warding: 0.03 },
        procs: [{ when: "struck", chance: 0.12, gem: "sanctuary", level: 20 }],
        classes: ROBE_CLASSES,
        pinnacle: "zilyana",
    },
    {
        id: "abyssal_dagger",
        family: "dagger",
        name: "Abyssal dagger",
        objId: 13265,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [52, 84], speed: 2.0, seq: SEQ.stab },
        stats: [
            { stat: "critChance", value: 8 },
            { stat: "attackSpeedPct", value: 10 },
        ],
        lore: "Abyssal Puncture: it strikes, and the Abyss strikes after it.",
        traits: { echo: 0.5 },
        classes: ["rogue"],
        pinnacle: "sire",
    },
    {
        id: "abyssal_bludgeon",
        family: "maul",
        name: "Abyssal bludgeon",
        objId: 13263,
        slot: "weapon",
        level: 68,
        weapon: { kind: "melee", damage: [90, 146], speed: 0.9, seq: SEQ.pound },
        stats: [
            { stat: "damagePct", value: 35 },
            { stat: "life", value: 60 },
        ],
        lore: "Put together from what the Sire kept. Penance: the more it's hurt you, the harder it hits.",
        keystone: "dharoksCurse",
        classes: BLADE_CLASSES,
        pinnacle: "sire",
    },
    {
        id: "abyssal_lantern",
        family: "book",
        name: "Abyssal lantern",
        objId: 26832,
        slot: "offhand",
        level: 67,
        stats: [
            { stat: "spellDamagePct", value: 30 },
            { stat: "mana", value: 80 },
        ],
        lore: "It burns with the Abyss's own light, and the Abyss's creatures follow it.",
        traits: { vortex: 1.2 },
        classes: ROBE_CLASSES,
        pinnacle: "sire",
    },
    // Sol Heredit's, at the Fortis Colosseum's end (content/colosseum.ts)
    {
        id: "dizanas_quiver",
        name: "Dizana's quiver",
        objId: 28951,
        slot: "cape",
        level: 68,
        stats: [
            { stat: "projectileDamagePct", value: 25 },
            { stat: "extraProjectiles", value: 1 },
        ],
        lore: "Dizana's, who took the Colosseum's glory and kept it.",
        traits: { frenzy: 0.05 },
        classes: BOW_CLASSES,
        pinnacle: "colosseum",
    },
    {
        id: "tonalztics_of_ralos",
        family: "shortbow",
        name: "Tonalztics of Ralos",
        objId: 28922,
        slot: "weapon",
        level: 68,
        weapon: { kind: "bow", damage: [50, 84], speed: 1.35, seq: SEQ.shoot, arrow: SPOT.runeArrow },
        stats: [
            { stat: "projectileDamagePct", value: 35 },
            { stat: "attackSpeedPct", value: 10 },
        ],
        lore: "Thrown twice, and it comes back twice.",
        traits: { echo: 0.45 },
        classes: BOW_CLASSES,
        pinnacle: "colosseum",
    },
    {
        id: "sunfire_fanatic_helm",
        name: "Sunfire fanatic helm",
        objId: 28933,
        slot: "head",
        level: 67,
        armour: 70,
        stats: [
            { stat: "life", value: 60 },
            { stat: "burnDamagePct", value: 30 },
        ],
        lore: "Worn by those who fight for Ralos, and burn for him.",
        traits: { smoulder: 0.4 },
        pinnacle: "colosseum",
    },
    {
        id: "sunfire_fanatic_cuirass",
        name: "Sunfire fanatic cuirass",
        objId: 28936,
        slot: "body",
        level: 68,
        armour: 160,
        stats: [
            { stat: "life", value: 90 },
            { stat: "armourPct", value: 20 },
        ],
        lore: "The sun's in the metal, and it never sets.",
        traits: { warding: 0.03 },
        classes: PLATE_CLASSES,
        pinnacle: "colosseum",
    },
    {
        id: "sunfire_fanatic_chausses",
        name: "Sunfire fanatic chausses",
        objId: 28939,
        slot: "legs",
        level: 67,
        armour: 115,
        stats: [
            { stat: "life", value: 70 },
            { stat: "meleeDamagePct", value: 20 },
        ],
        lore: "They've crossed the Colosseum's sand more times than anyone counts.",
        traits: { bloodthirst: 0.25 },
        classes: PLATE_CLASSES,
        pinnacle: "colosseum",
    },
    // The Tombs of Amascut's (content/tombs.ts): from the Wardens, more often the higher the raid
    // level
    {
        id: "lightbearer",
        name: "Lightbearer",
        objId: 25975,
        slot: "ring",
        level: 70,
        stats: [
            { stat: "attackSpeedPct", value: 8 },
            { stat: "manaRegen", value: 6 },
            { stat: "life", value: 40 },
        ],
        lore: "Tumeken's light, kept in a ring. It finds you sooner than it should.",
        traits: { thunder: 0.15 },
        pinnacle: "tombs",
    },
    {
        id: "elidinis_ward_f",
        family: "shield",
        name: "Elidinis' ward (f)",
        objId: 27251,
        slot: "offhand",
        level: 70,
        armour: 70,
        stats: [
            { stat: "spellDamagePct", value: 25 },
            { stat: "life", value: 60 },
            { stat: "lessDamageTaken", value: 6 },
        ],
        lore: "Elidinis' own, made whole in the Tombs. The waters keep the one who carries it.",
        traits: { warding: 0.04 },
        classes: ROBE_CLASSES,
        pinnacle: "tombs",
    },
    {
        id: "keris_partisan_of_the_sun",
        name: "Keris partisan of the sun",
        objId: 27291,
        slot: "weapon",
        level: 70,
        weapon: { kind: "melee", damage: [56, 92], speed: 1.6, seq: SEQ.stab },
        stats: [
            { stat: "meleeDamagePct", value: 30 },
            { stat: "lifeOnHit", value: 6 },
        ],
        lore: "A keris partisan, set with Tumeken's jewel. What it cuts, the sun keeps burning.",
        traits: { smoulder: 0.45 },
        classes: BLADE_CLASSES,
        pinnacle: "tombs",
    },
];

// The unique potions, as uniques of the slot (potions.ts)
UNIQUES.push(
    ...UNIQUE_POTIONS.map(
        (p): UniqueDef => ({
            id: p.id,
            name: p.name,
            objId: p.potion.icons[p.potion.icons.length - 1],
            slot: "potion",
            level: p.level,
            stats: [],
            lore: p.lore,
            pinnacle: p.pinnacle,
            potion: p.potion,
            potionText: p.text,
        }),
    ),
);

// The level the Max cape and its joins ask for, the last, and what Reldo asks for one: a sink as
// OSRS's own is, a few ladder rifts' gold
export const MAX_CAPE_LEVEL = 99;
export const MAX_CAPE_PRICE = 100_000;

UNIQUES.push(...setPieces());
UNIQUES.push(...lateUniques());

// ---- The late game's (docs/late-game.md) ----

// The uniques the transmuting circle makes of others (circle.ts UPGRADES), OSRS's own upgrades: a
// unique and a part from the ladder's hosts and pinnacles give one of its own, at the same level,
// keeping its way to play and adding to it; OSRS's imbues, a ring's numbers doubled; the Max cape
// at 99 and the two OSRS joins it into; and Desert Treasure II's four rings, made of the awakened
// generals' vestiges. None drops: each is made, so they're `source: "upgrade"`.
function lateUniques(): UniqueDef[] {
    // What's made so far, so a join can be of an upgrade
    const made: UniqueDef[] = [];
    const of = (id: string): UniqueDef => {
        const u = UNIQUES.find((x) => x.id === id) ?? made.find((x) => x.id === id);
        if (!u) {
            throw new Error(`No unique ${id}`);
        }
        return u;
    };
    // A unique made more of: its numbers this much more, its weapon's damage too, and changes
    const upgrade = (from: string, to: Partial<UniqueDef> & { id: string; name: string; objId: number; lore: string }, more = 1.15, extra: StatLine[] = []): UniqueDef => {
        const u = of(from);
        return {
            ...u,
            family: u.family,
            weapon: u.weapon && { ...u.weapon, damage: scaled(u.weapon.damage, more) },
            armour: u.armour && Math.round(u.armour * more),
            stats: [...u.stats.map((line) => ({ ...line, value: Number.isInteger(line.value) && Math.abs(line.value) >= 4 ? Math.round(line.value * more) : line.value })), ...extra],
            pinnacle: undefined,
            source: "upgrade",
            ...to,
        };
    };
    // OSRS's imbue: every number doubled, its rule as it was
    const imbued = (from: string, objId: number, extra: StatLine[] = []): UniqueDef => {
        const u = of(from);
        return {
            ...u,
            id: `${from}_i`,
            name: `${u.name} (i)`,
            objId,
            stats: [...u.stats.map((line) => ({ ...line, value: Number.isInteger(line.value) ? line.value * 2 : Math.round(line.value * 20) / 10 })), ...extra],
            lore: `${u.lore} Imbued, it gives twice what it did.`,
            pinnacle: undefined,
            source: "upgrade",
        };
    };
    const max: StatLine[] = [
        { stat: "str", value: 15 },
        { stat: "dex", value: 15 },
        { stat: "int", value: 15 },
        { stat: "life", value: 60 },
        { stat: "mana", value: 40 },
        { stat: "allRes", value: 8 },
    ];
    // And a little of the hunt's pace, on every skill that hits
    const maxTraits: UniqueDef["traits"] = { frenzy: 0.03, bloodthirst: 0.15 };
    const join = (from: string, to: { id: string; name: string; objId: number; lore: string }): UniqueDef => {
        const u = of(from);
        return { ...u, ...to, level: MAX_CAPE_LEVEL, stats: [...u.stats, ...max], traits: { ...maxTraits, ...u.traits }, pinnacle: undefined, source: "upgrade" };
    };
    made.push(
        upgrade("abyssal_whip", { id: "abyssal_tentacle", name: "Abyssal tentacle", objId: 12006, lore: "The whip, and a kraken's arm grown round it. It grips what it strikes.", traits: { echo: 0.55, numbing: 0.2 } }),
        upgrade("staff_of_the_dead", { id: "toxic_staff_of_the_dead", name: "Toxic Staff of the Dead", objId: 12904, lore: "Zulrah's fang set in Zamorak's staff. What it kills rises, and what it hits slows.", traits: { grave: 0.3, numbing: 0.25 } }),
        upgrade("darklight", { id: "arclight", name: "Arclight", objId: 19675, lore: "Darklight, charged with the shards of Kourend's catacombs. Demons know it.", traits: { bloodthirst: 0.35 } }, 1.2, [{ stat: "damagePct", value: 40, when: "vsDemon" }]),
        upgrade("darklight", { id: "emberlight", name: "Emberlight", objId: 29589, lore: "Arclight, and a tormented demon's synapse burning in it.", traits: { bloodthirst: 0.35, smoulder: 0.4 } }, 1.3, [{ stat: "damagePct", value: 50, when: "vsDemon" }]),
        upgrade("ivandis_flail", { id: "blisterwood_flail", name: "Blisterwood flail", objId: 24699, lore: "Ivandis's flail, its haft of Darkmeyer's blisterwood. Vampyres burst at its touch.", traits: { volatile: 0.7 } }, 1.2, [{ stat: "damagePct", value: 40, when: "vsVampyre" }]),
        upgrade("dragon_boots", { id: "primordial_boots", name: "Primordial boots", objId: 13239, lore: "Dragon boots, and Cerberus's primordial crystal fused to them." }, 1.2, [{ stat: "meleeDamagePct", value: 10 }]),
        upgrade("amulet_of_fury", { id: "amulet_of_blood_fury", name: "Amulet of blood fury", objId: 24780, lore: "A fury with a vyre's blood shard set in it. It drinks from every blow." }, 1.15, [{ stat: "lifeLeech", value: 3 }]),
        upgrade("dizanas_quiver", { id: "blessed_dizanas_quiver", name: "Blessed Dizana's quiver", objId: 28955, lore: "Dizana's quiver, blessed with the splinters of the Colosseum's sun.", traits: { frenzy: 0.05, splitting: 2 } }, 1.5),
        imbued("berserker_ring", 11773),
        imbued("archers_ring", 11771),
        imbued("seers_ring", 11770),
        imbued("warrior_ring", 11772),
        imbued("ring_of_suffering", 19710),
        imbued("skull_sceptre", 21276, [{ stat: "extraThralls", value: 1 }]),
        {
            id: "max_cape",
            name: "Max cape",
            objId: 13280,
            slot: "cape",
            level: MAX_CAPE_LEVEL,
            stats: max,
            traits: maxTraits,
            lore: "For those who've gone as far as anyone goes. Mac would be proud.",
            source: "upgrade",
        },
    );
    made.push(
        join("infernal_cape", { id: "infernal_max_cape", name: "Infernal max cape", objId: 21285, lore: "The Inferno's cape and the Max cape, sewn into one." }),
        join("blessed_dizanas_quiver", { id: "dizanas_max_cape", name: "Dizana's max cape", objId: 28902, lore: "Dizana's blessed quiver and the Max cape, sewn into one." }),
        dt2Ring("ultor_ring", "Ultor ring", 28307, "The awakened Graardor's vestige, set in chromium. Every blow is the one that ends it.", [
            { stat: "meleeDamagePct", value: 12 },
            { stat: "critMulti", value: 20 },
            { stat: "life", value: 40 },
        ], { volatile: 0.4 }),
        dt2Ring("venator_ring", "Venator ring", 28310, "The awakened Kree'arra's vestige, set in chromium. Its arrows find more than one mark.", [
            { stat: "projectileDamagePct", value: 12 },
            { stat: "extraProjectiles", value: 1 },
            { stat: "dex", value: 15 },
        ], { splitting: 2 }),
        dt2Ring("magus_ring", "Magus ring", 28313, "The awakened K'ril's vestige, set in chromium. Spells come cheaper through it.", [
            { stat: "spellDamagePct", value: 12 },
            { stat: "manaCostPct", value: 10 },
            { stat: "int", value: 15 },
        ], { echo: 0.35 }),
        dt2Ring("bellator_ring", "Bellator ring", 28316, "The awakened Zilyana's vestige, set in chromium. It knows where the gap in the armour is.", [
            { stat: "critChance", value: 3 },
            { stat: "damagePct", value: 8 },
            { stat: "str", value: 15 },
        ], { surging: 1 }),
    );
    return made;
}

// A ring of the awakened generals', with a trait of its own as every unique has: Ultor's kills
// burst, Venator's arrows split, Magus's spells echo, and Bellator's every few blows find the gap
function dt2Ring(id: string, name: string, objId: number, lore: string, stats: StatLine[], traits: SkillTraits): UniqueDef {
    return { id, name, objId, slot: "ring", level: 70, stats, traits, lore, source: "upgrade" };
}

export const BASES: BaseDef[] = bases;
export const BASE_BY_ID = new Map(BASES.map((b) => [b.id, b]));
export const UNIQUE_BY_ID = new Map(UNIQUES.map((u) => [u.id, u]));

// Every obj id an item can be, for baking and icons
// Every item's icon and model on the ground: bases, uniques, and the keys to rifts (riftstones.ts)
export function allItemObjIds(): number[] {
    return [...new Set([...BASES.map((b) => b.objId), ...UNIQUES.map((u) => u.objId), RIFTSTONE.objId, ...SHARD_IDS.map((id) => HEART_SHARDS[id].objId), ...potionObjIds()])];
}

// ---- Affixes ----

export type AffixTier = { level: number; name: string; ranges: [number, number][] };

export type AffixDef = {
    id: string;
    kind: "prefix" | "suffix";
    stats: StatKey[];
    slots: Partial<Record<Slot, number>>;
    tiers: AffixTier[];
    // How often it's picked against the others its slot can have
    weight: number;
    // Rolled to a tenth rather than a whole number
    decimals?: boolean;
    // Its stat's condition, if it has one (a talisman's)
    when?: When;
    // A potion's: the families it can go on (all, if it doesn't say)
    families?: PotionFamily[];
};

// The levels each affix tier opens at: spread to 50 so gear goes on getting better almost to the
// level cap, as the genre has it (a base tops out at 40, its affixes ten levels on)
const AFFIX_LEVELS = [1, 9, 18, 28, 39, 50];
const AFFIX_LEVELS_4 = [1, 14, 30, 46];

function tiers(names: string[], ranges: [number, number][][], levels = AFFIX_LEVELS): AffixTier[] {
    return names.map((name, i) => ({ level: levels[i], name, ranges: ranges[i] }));
}

function one(values: [number, number][]): [number, number][][] {
    return values.map((v) => [v]);
}

const ARMOUR_SLOTS = { head: 1, body: 1, legs: 1, hands: 1, feet: 1, offhand: 1 };

export const AFFIXES: AffixDef[] = [
    // ---- Prefixes ----
    {
        id: "added",
        kind: "prefix",
        stats: ["addedMin", "addedMax"],
        slots: { weapon: 1, hands: 0.4, ring: 0.4 },
        weight: 10,
        tiers: tiers(
            ["Glinting", "Burnished", "Polished", "Honed", "Gleaming", "Annealed"],
            [
                [
                    [1, 2],
                    [3, 4],
                ],
                [
                    [2, 4],
                    [5, 8],
                ],
                [
                    [4, 6],
                    [8, 12],
                ],
                [
                    [6, 9],
                    [12, 17],
                ],
                [
                    [8, 12],
                    [16, 22],
                ],
                [
                    [11, 16],
                    [21, 29],
                ],
            ],
        ),
    },
    {
        id: "damagePct",
        kind: "prefix",
        stats: ["damagePct"],
        slots: { weapon: 1, amulet: 0.5 },
        weight: 10,
        tiers: tiers(
            ["Heavy", "Serrated", "Wicked", "Vicious", "Bloodthirsty", "Merciless"],
            one([
                [10, 19],
                [20, 34],
                [35, 54],
                [55, 79],
                [80, 109],
                [110, 149],
            ]),
        ),
    },
    {
        id: "life",
        kind: "prefix",
        stats: ["life"],
        slots: { ...ARMOUR_SLOTS, cape: 1, amulet: 1, ring: 1 },
        weight: 12,
        tiers: tiers(
            ["Healthy", "Sanguine", "Stalwart", "Robust", "Vigorous", "Rapturous"],
            one([
                [8, 15],
                [16, 25],
                [26, 38],
                [39, 52],
                [53, 68],
                [69, 90],
            ]),
        ),
    },
    {
        id: "mana",
        kind: "prefix",
        stats: ["mana"],
        slots: { head: 1, body: 1, hands: 1, feet: 1, amulet: 1, ring: 1, offhand: 1, cape: 1, weapon: 0.6 },
        weight: 8,
        tiers: tiers(
            ["Beryl", "Cobalt", "Azure", "Sapphire", "Cerulean", "Aqua"],
            one([
                [8, 14],
                [15, 24],
                [25, 36],
                [37, 50],
                [51, 66],
                [67, 85],
            ]),
        ),
    },
    {
        id: "armourPct",
        kind: "prefix",
        stats: ["armourPct"],
        slots: ARMOUR_SLOTS,
        weight: 7,
        tiers: tiers(
            ["Reinforced", "Layered", "Lobstered", "Buttressed", "Thickened", "Girded"],
            one([
                [6, 12],
                [13, 20],
                [21, 30],
                [31, 42],
                [43, 55],
                [56, 70],
            ]),
        ),
    },
    {
        id: "armour",
        kind: "prefix",
        stats: ["armour"],
        slots: { ...ARMOUR_SLOTS, cape: 1, ring: 0.5 },
        weight: 7,
        tiers: tiers(
            ["Lacquered", "Studded", "Ribbed", "Fortified", "Plated", "Carapaced"],
            one([
                [5, 12],
                [13, 25],
                [26, 40],
                [41, 60],
                [61, 85],
                [86, 115],
            ]),
        ),
    },
    {
        id: "moveSpeed",
        kind: "prefix",
        stats: ["moveSpeedPct"],
        slots: { feet: 1 },
        weight: 10,
        tiers: tiers(
            ["Runner's", "Sprinter's", "Stallion's", "Gazelle's"],
            one([
                [6, 9],
                [10, 14],
                [15, 19],
                [20, 25],
            ]),
            AFFIX_LEVELS_4,
        ),
    },
    {
        id: "spellDamage",
        kind: "prefix",
        stats: ["spellDamagePct"],
        slots: { weapon: 1, amulet: 0.5, offhand: 0.5 },
        weight: 6,
        tiers: tiers(
            ["Apprentice's", "Adept's", "Scholar's", "Professor's", "Occultist's", "Incanter's"],
            one([
                [10, 19],
                [20, 34],
                [35, 54],
                [55, 79],
                [80, 109],
                [110, 149],
            ]),
        ),
    },
    {
        id: "elementalDamage",
        kind: "prefix",
        stats: ["elementalDamagePct"],
        slots: { weapon: 0.8, amulet: 0.6, ring: 0.5, hands: 0.4 },
        weight: 5,
        tiers: tiers(
            ["Searing", "Smouldering", "Blistering", "Scorching", "Blazing", "Incinerating"],
            one([
                [8, 14],
                [15, 24],
                [25, 36],
                [37, 50],
                [51, 66],
                [67, 85],
            ]),
        ),
    },
    // ---- Suffixes ----
    {
        id: "attackSpeed",
        kind: "suffix",
        stats: ["attackSpeedPct"],
        slots: { weapon: 1, hands: 0.6, ring: 0.6 },
        weight: 9,
        tiers: tiers(
            ["of Skill", "of Ease", "of Mastery", "of Grace", "of Fame", "of Celebration"],
            one([
                [5, 7],
                [8, 10],
                [11, 13],
                [14, 16],
                [17, 20],
                [21, 25],
            ]),
        ),
    },
    {
        id: "critChance",
        kind: "suffix",
        stats: ["critChance"],
        slots: { weapon: 1, amulet: 1, head: 0.6, ring: 0.6 },
        weight: 8,
        tiers: tiers(
            ["of Needling", "of Stinging", "of Piercing", "of Puncturing", "of Penetrating", "of Incision"],
            one([
                [1, 2],
                [2, 3],
                [3, 4],
                [4, 5],
                [5, 6],
                [6, 8],
            ]),
        ),
    },
    {
        id: "critMulti",
        kind: "suffix",
        stats: ["critMulti"],
        slots: { weapon: 1, amulet: 1, ring: 0.6 },
        weight: 7,
        tiers: tiers(
            ["of Ire", "of Anger", "of Rage", "of Fury", "of Ferocity", "of Destruction"],
            one([
                [8, 12],
                [13, 18],
                [19, 25],
                [26, 33],
                [34, 42],
                [43, 55],
            ]),
        ),
    },
    {
        id: "lifeRegen",
        kind: "suffix",
        stats: ["lifeRegen"],
        slots: { body: 1, legs: 1, amulet: 1, ring: 1, cape: 1, offhand: 1, head: 0.6 },
        weight: 8,
        decimals: true,
        tiers: tiers(
            ["of the Newt", "of the Lizard", "of the Flatworm", "of the Starfish", "of the Hydra", "of the Troll"],
            one([
                [0.5, 1],
                [1, 2],
                [2, 3.5],
                [3.5, 5.5],
                [5.5, 8],
                [8, 12],
            ]),
        ),
    },
    {
        id: "manaRegen",
        kind: "suffix",
        stats: ["manaRegen"],
        slots: { head: 1, amulet: 1, ring: 1, cape: 1, weapon: 0.6, offhand: 0.6 },
        weight: 7,
        decimals: true,
        tiers: tiers(
            ["of Excitement", "of Joy", "of Elation", "of Bliss", "of Euphoria", "of Nirvana"],
            one([
                [0.5, 1],
                [1, 2],
                [2, 3],
                [3, 4.5],
                [4.5, 6.5],
                [6.5, 9],
            ]),
        ),
    },
    {
        id: "lifeOnHit",
        kind: "suffix",
        stats: ["lifeOnHit"],
        slots: { weapon: 1, hands: 1, ring: 0.6 },
        weight: 6,
        tiers: tiers(
            ["of Rejuvenation", "of Restoration", "of Regrowth", "of Revival", "of Renewal", "of Regeneration"],
            one([
                [1, 2],
                [2, 4],
                [4, 7],
                [7, 11],
                [11, 16],
                [16, 22],
            ]),
        ),
    },
    {
        id: "lifeLeech",
        kind: "suffix",
        stats: ["lifeLeech"],
        slots: { weapon: 1, amulet: 0.7, ring: 0.5 },
        weight: 4,
        decimals: true,
        tiers: tiers(
            ["of the Parasite", "of the Leech", "of the Vampire", "of the Lamprey"],
            one([
                [0.5, 1],
                [1, 1.5],
                [1.5, 2.5],
                [2.5, 3.5],
            ]),
            AFFIX_LEVELS_4,
        ),
    },
    {
        id: "strength",
        kind: "suffix",
        stats: ["str"],
        slots: { ...ARMOUR_SLOTS, amulet: 1, ring: 1, cape: 1, weapon: 0.6 },
        weight: 6,
        tiers: tiers(["of the Brute", "of the Wrestler", "of the Bear", "of the Lion", "of the Gorilla", "of the Goliath"], one([
                [5, 9],
                [10, 15],
                [16, 22],
                [23, 30],
                [31, 40],
                [41, 52],
            ])),
    },
    {
        id: "dexterity",
        kind: "suffix",
        stats: ["dex"],
        slots: { ...ARMOUR_SLOTS, amulet: 1, ring: 1, cape: 1, weapon: 0.6 },
        weight: 6,
        tiers: tiers(["of the Mongoose", "of the Lynx", "of the Fox", "of the Falcon", "of the Panther", "of the Leopard"], one([
                [5, 9],
                [10, 15],
                [16, 22],
                [23, 30],
                [31, 40],
                [41, 52],
            ])),
    },
    {
        id: "intelligence",
        kind: "suffix",
        stats: ["int"],
        slots: { ...ARMOUR_SLOTS, amulet: 1, ring: 1, cape: 1, weapon: 0.6 },
        weight: 6,
        tiers: tiers(["of the Pupil", "of the Student", "of the Prodigy", "of the Augur", "of the Philosopher", "of the Sage"], one([
                [5, 9],
                [10, 15],
                [16, 22],
                [23, 30],
                [31, 40],
                [41, 52],
            ])),
    },
    {
        id: "evade",
        kind: "suffix",
        stats: ["evade"],
        slots: { body: 1, feet: 1, hands: 0.7, head: 0.7, cape: 0.6 },
        weight: 5,
        tiers: tiers(
            ["of Dodging", "of Evasion", "of Avoidance", "of the Wind", "of the Phantom", "of the Mirage"],
            one([
                [1, 2],
                [2, 3],
                [3, 4],
                [4, 5],
                [5, 7],
                [7, 9],
            ]),
        ),
    },
    {
        id: "castSpeed",
        kind: "suffix",
        stats: ["castSpeedPct"],
        slots: { weapon: 1, amulet: 0.6, ring: 0.6, hands: 0.5 },
        weight: 6,
        tiers: tiers(
            ["of Talent", "of Nimbleness", "of Expertise", "of Legerdemain", "of Prestidigitation", "of Sortilege"],
            one([
                [5, 7],
                [8, 10],
                [11, 13],
                [14, 16],
                [17, 20],
                [21, 25],
            ]),
        ),
    },
    {
        id: "rarity",
        kind: "suffix",
        stats: ["rarity"],
        slots: { head: 1, amulet: 1, ring: 1, feet: 0.5 },
        weight: 5,
        tiers: tiers(
            ["of Plunder", "of Raiding", "of Archaeology", "of Excavation"],
            one([
                [6, 10],
                [11, 16],
                [17, 24],
                [25, 34],
            ]),
            AFFIX_LEVELS_4,
        ),
    },
    // ---- Resistances (content/rules.ts RESIST): suffixes, as Path of Exile's, so they're weighed
    // against attack speed, critical strikes and the attributes ----
    ...resistAffixes(),
    // ---- A talisman's own (the tree's sockets), and where the conditions are ----
    ...talismanAffixes(),
    // ---- A potion's own (potions.ts) ----
    ...potionAffixes(),
];

// The seventh tier, rift-touched, as Diablo IV's greater affixes and Last Epoch's exalted ones: it
// opens at item level 65, which only the ladder drops (an area level is its items' level), on
// every affix of gear's that has the six tiers to 50 or the four to 46, a quarter past its best.
// It's rarer than a best tier is (loot.ts rollMod), and likelier the deeper the ladder goes.
export const RIFT_TIER = { level: 65, prefix: "Riftborn", suffix: "of the Rift", more: [1.15, 1.3] as [number, number] };

for (const a of AFFIXES) {
    const last = a.tiers[a.tiers.length - 1];
    if (a.families || a.slots.talisman !== undefined || a.slots.potion !== undefined || last.level < 46) {
        continue;
    }
    const round = (v: number) => (a.decimals ? Math.round(v * 10) / 10 : Math.round(v));
    a.tiers.push({
        level: RIFT_TIER.level,
        name: a.kind === "prefix" ? RIFT_TIER.prefix : RIFT_TIER.suffix,
        ranges: last.ranges.map(([lo, hi]) => [Math.max(round(lo * RIFT_TIER.more[0]), lo + (a.decimals ? 0.1 : 1)), Math.max(round(hi * RIFT_TIER.more[1]), hi + (a.decimals ? 0.1 : 1))] as [number, number]),
    });
}

// Diablo II's levels on skill gems: an amulet's for all of them, a weapon's or a helm's for a
// tag's. Few of them, and only from item level 45; the seventh tier is the second level.
const skillLevel = (id: string, stat: StatKey, slots: Partial<Record<Slot, number>>, names: [string, string], weight: number): AffixDef => ({
    id,
    kind: "suffix",
    stats: [stat],
    slots,
    weight,
    tiers: [
        { level: 45, name: names[0], ranges: [[1, 1]] },
        { level: RIFT_TIER.level, name: names[1], ranges: [[2, 2]] },
    ],
});
AFFIXES.push(
    skillLevel("skillLevels", "skillLevels", { amulet: 1 }, ["of Skill", "of Mastery"], 2),
    skillLevel("meleeSkillLevels", "meleeSkillLevels", { weapon: 1, head: 1 }, ["of the Duellist", "of the Champion"], 2),
    skillLevel("projectileSkillLevels", "projectileSkillLevels", { weapon: 1, head: 1, hands: 1 }, ["of the Fletcher", "of the Sharpshooter"], 2),
    skillLevel("spellSkillLevels", "spellSkillLevels", { weapon: 1, head: 1 }, ["of the Adept", "of the Magus"], 2),
    skillLevel("minionSkillLevels", "minionSkillLevels", { weapon: 1, head: 1, offhand: 1 }, ["of the Gravedigger", "of the Lich"], 1.5),
);

export const AFFIX_BY_ID = new Map(AFFIXES.map((a) => [a.id, a]));

// Each element's resistance on armour and jewellery, and all three on fewer slots and less of it
function resistAffixes(): AffixDef[] {
    const slots = { ...ARMOUR_SLOTS, ring: 1, amulet: 1, cape: 0.8 };
    const one3 = (id: string, stat: StatKey, names: string[]): AffixDef => ({
        id,
        kind: "suffix",
        stats: [stat],
        slots,
        weight: 6,
        tiers: tiers(names, one([[6, 11], [12, 17], [18, 23], [24, 29], [30, 35], [36, 42]])),
    });
    return [
        one3("fireRes", "fireRes", ["of the Whelp", "of the Salamander", "of the Drake", "of the Wyrm", "of the Dragon", "of the Elder Dragon"]),
        one3("coldRes", "coldRes", ["of the Yak", "of the Penguin", "of the Ice Troll", "of the Fremennik", "of the Wintertodt", "of the Ice Queen"]),
        one3("lightningRes", "lightningRes", ["of the Cloud", "of the Squall", "of the Storm", "of the Thunderhead", "of the Tempest", "of the Maelstrom"]),
        {
            id: "allRes",
            kind: "suffix",
            stats: ["allRes"],
            slots: { amulet: 1, ring: 0.7, offhand: 0.7, body: 0.5 },
            weight: 2,
            tiers: tiers(["of Shimmering", "of the Prism", "of the Rainbow", "of the Spectrum"], one([[3, 5], [6, 8], [9, 12], [13, 16]]), AFFIX_LEVELS_4),
        },
    ];
}

// A talisman's affixes: smaller than gear's, its own pool, and most of them held to a condition
function talismanAffixes(): AffixDef[] {
    const levels = [1, 18, 36];
    const a = (id: string, kind: "prefix" | "suffix", stat: StatKey, names: string[], ranges: [number, number][], when?: When, decimals?: boolean): AffixDef => ({
        id,
        kind,
        stats: [stat],
        slots: { talisman: 1 },
        weight: 10,
        tiers: tiers(names, one(ranges), levels),
        when,
        decimals,
    });
    return [
        a("tMelee", "prefix", "meleeDamagePct", ["Brutal", "Savage", "Warlord's"], [[4, 6], [6, 8], [8, 10]]),
        a("tProjectile", "prefix", "projectileDamagePct", ["Keen", "Piercing", "Marksman's"], [[4, 6], [6, 8], [8, 10]]),
        a("tSpell", "prefix", "spellDamagePct", ["Runic", "Arcane", "Archmage's"], [[4, 6], [6, 8], [8, 10]]),
        a("tElemental", "prefix", "elementalDamagePct", ["Charged", "Elemental", "Primal"], [[4, 6], [6, 8], [8, 10]]),
        a("tThrall", "prefix", "thrallDamagePct", ["Grave", "Necrotic", "Arceuus's"], [[6, 8], [8, 10], [10, 12]]),
        a("tBurn", "prefix", "burnDamagePct", ["Smoking", "Searing", "Infernal"], [[5, 7], [7, 9], [9, 10]]),
        a("tShield", "prefix", "damagePct", ["Guarded", "Bulwarked", "Templar's"], [[6, 8], [8, 10], [10, 12]], "shield"),
        a("tKilled", "prefix", "damagePct", ["Hungry", "Ravenous", "Insatiable"], [[6, 8], [8, 10], [10, 12]], "killedRecently"),
        a("tVsBurning", "prefix", "damagePct", ["Kindling", "Pyre-lit", "Ashen"], [[8, 10], [10, 12], [12, 15]], "vsBurning"),
        a("tVsChilled", "prefix", "damagePct", ["Rimed", "Shattering", "Glacial"], [[8, 10], [10, 12], [12, 15]], "vsChilled"),
        a("tVsShocked", "prefix", "damagePct", ["Static", "Thunderous", "Stormborn"], [[8, 10], [10, 12], [12, 15]], "vsShocked"),
        a("tLife", "suffix", "lifePct", ["of Vigour", "of Vitality", "of the Troll"], [[3, 4], [4, 5], [5, 6]]),
        a("tResist", "suffix", "allRes", ["of Warding Runes", "of the Prism", "of the Spectrum"], [[3, 4], [4, 6], [6, 8]]),
        a("tMana", "suffix", "manaPct", ["of the Mind", "of Focus", "of the Wellspring"], [[3, 4], [4, 5], [5, 6]]),
        a("tBuff", "suffix", "buffEffectPct", ["of Prayer", "of Devotion", "of Piety"], [[5, 7], [7, 9], [9, 10]]),
        a("tFreeze", "suffix", "freezeLengthPct", ["of Frost", "of Ice", "of Winter"], [[5, 7], [7, 9], [9, 10]]),
        a("tThrallSpeed", "suffix", "attackSpeedPct", ["of the Pack", "of the Horde", "of the Legion"], [[0.6, 0.9], [0.9, 1.2], [1.2, 1.5]], "perThrall", true),
        a("tKilledSpeed", "suffix", "moveSpeedPct", ["of the Chase", "of the Hunt", "of Pursuit"], [[3, 4], [4, 5], [5, 6]], "killedRecently"),
        a("tBuffedDefence", "suffix", "lessDamageTaken", ["of Warding", "of the Aegis", "of Sanctuary"], [[2, 3], [3, 4], [4, 5]], "buffed"),
        a("tCrit", "suffix", "critChance", ["of Precision", "of Accuracy", "of the Eagle"], [[0.5, 0.8], [0.8, 1.1], [1.1, 1.5]], undefined, true),
    ];
}

// A potion's affixes: one prefix for how it recovers or how often, and one suffix for what else it
// does while it works, as Path of Exile's flasks have them
function potionAffixes(): AffixDef[] {
    const levels = [1, 18, 36];
    const ladder = [65, 75, 85];
    const recovers: PotionFamily[] = ["life", "mana", "rejuv"];
    const a = (id: string, kind: "prefix" | "suffix", stat: StatKey, names: string[], ranges: [number, number][], families?: PotionFamily[], weight = 10, lv = levels): AffixDef => ({
        id,
        kind,
        stats: [stat],
        slots: { potion: 1 },
        weight,
        tiers: tiers(names, one(ranges), lv),
        families,
    });
    return [
        a("pSeething", "prefix", "potionInstantLess", ["Seething", "Boiling", "Roiling"], [[33, 35], [29, 31], [25, 27]], ["life", "mana"]),
        a("pBubbling", "prefix", "potionHalfInstant", ["Bubbling", "Frothing", "Effervescent"], [[35, 41], [41, 48], [48, 55]], ["life", "mana"]),
        a("pCatalysed", "prefix", "potionFaster", ["Catalysed", "Quickened", "Distilled"], [[30, 39], [39, 49], [49, 60]], ["life", "mana"]),
        a("pSaturated", "prefix", "potionMore", ["Saturated", "Concentrated", "Potent"], [[15, 19], [19, 24], [24, 30]], recovers),
        a("pPanicked", "prefix", "potionPanic", ["Panicked", "Desperate", "Frantic"], [[10, 14], [14, 19], [19, 25]], recovers),
        a("pAmple", "prefix", "potionDoses", ["Ample", "Plentiful"], [[1, 1], [2, 2]], undefined, 8, [1, 30]),
        a("pAbundant", "prefix", "potionRefill", ["Abundant", "Replenishing", "Bottomless"], [[20, 26], [26, 33], [33, 40]]),
        a("pChemists", "prefix", "potionSave", ["Chemist's", "Apothecary's", "Alchemist's"], [[15, 18], [18, 21], [21, 25]], undefined, 7),
        a("pExperimenters", "prefix", "potionLonger", ["Experimenter's", "Herbalist's", "Druid's"], [[20, 26], [26, 33], [33, 40]], ["combat"]),
        a("pAdrenaline", "suffix", "potionMove", ["of Adrenaline", "of Haste", "of the Hare"], [[15, 19], [19, 24], [24, 30]]),
        a("pIronSkin", "suffix", "potionArmour", ["of Iron Skin", "of Steel Skin", "of Rune Skin"], [[30, 39], [39, 49], [49, 60]]),
        a("pReflexes", "suffix", "potionEvade", ["of Reflexes", "of Grace", "of the Acrobat"], [[10, 13], [13, 16], [16, 20]]),
        a("pBerserker", "suffix", "potionAttackSpeed", ["of the Berserker", "of Fury", "of the Warlord"], [[10, 13], [13, 16], [16, 20]]),
        a("pOverflow", "suffix", "potionWard", ["of Overflow", "of the Brim", "of the Fountain"], [[10, 13], [13, 16], [16, 20]], ["life", "rejuv"]),
        a("pPlenty", "suffix", "potionPlenty", ["of Plenty", "of Bounty", "of the Harvest"], [[8, 10], [10, 12], [12, 15]]),
        // The ladder's monsters' ailments, answered as Path of Exile's flasks answer them: from
        // the ladder's first depth (area level 65) on
        a("pDousing", "suffix", "potionDouse", ["of Dousing", "of Quenching", "of the Rain"], [[4, 5], [5, 7], [7, 9]], undefined, 10, ladder),
        a("pHeat", "suffix", "potionHeat", ["of Heat", "of Thawing", "of the Hearth"], [[4, 5], [5, 7], [7, 9]], undefined, 10, ladder),
        a("pGrounding", "suffix", "potionGround", ["of Grounding", "of Earthing", "of the Lodestone"], [[4, 5], [5, 7], [7, 9]], undefined, 10, ladder),
        a("pFooting", "suffix", "potionFooting", ["of Footing", "of Freedom", "of the Unbound"], [[4, 5], [5, 7], [7, 9]], undefined, 10, ladder),
    ];
}

// ---- Rare names ----

export const RARE_FIRST = [
    "Doom", "Blood", "Storm", "Wrath", "Grim", "Rune", "Kraken", "Shadow", "Dragon", "Plague", "Ghoul", "Gale",
    "Corpse", "Dusk", "Bramble", "Hate", "Rapture", "Soul", "Vortex", "Ember", "Ash", "Mind", "Gloom", "Wyrm",
];

export const RARE_SECOND: Record<Slot, string[]> = {
    weapon: ["Edge", "Bite", "Fang", "Song", "Thirst", "Razor", "Spike", "Branch", "Reaver", "Bane"],
    offhand: ["Ward", "Bulwark", "Guard", "Aegis", "Tower", "Wall"],
    head: ["Visage", "Crown", "Brow", "Halo", "Peak", "Dome"],
    body: ["Shell", "Hide", "Coat", "Carapace", "Pelt", "Jack"],
    legs: ["Greaves", "Tread", "Stand", "Pillars", "Shanks"],
    hands: ["Grip", "Hand", "Fist", "Claw", "Mitts", "Touch"],
    feet: ["Stride", "Track", "Spur", "Road", "Trail", "Pace"],
    cape: ["Mantle", "Shroud", "Wings", "Veil", "Cloak"],
    amulet: ["Beads", "Charm", "Gorget", "Heart", "Collar", "Torc"],
    ring: ["Loop", "Band", "Coil", "Circle", "Knot", "Eye"],
    talisman: ["Sigil", "Seal", "Token", "Mark", "Key", "Charm"],
    // Never rare, but every slot has its names
    potion: ["Draught", "Tonic", "Brew"],
};

// A gem isn't worn, but socketed into what is (gems.ts)
export type Rarity = "normal" | "magic" | "rare" | "unique" | "gem";

// A set piece's name (it's a unique with a set), and a runeword's (runewords.ts)
export const SET_COLOR = "#30d050";
export const RUNEWORD_COLOR = "#c8b07a";
// A rift-touched affix's line (its seventh tier)
export const RIFT_COLOR = "#d070ff";

export const RARITY_COLOR: Record<Rarity, string> = {
    normal: "#e8e8e8",
    magic: "#8a8aff",
    rare: "#ffff77",
    unique: "#d08030",
    gem: "#1ba29b",
};

// ---- Sets ----

// Diablo II's set items, from OSRS's own sets: the six Barrows brothers' (Dharok's greataxe was a
// unique first, and is its set's weapon), each with its brother's own power when the four are
// worn; the TzHaar's obsidian, bought with the Fight Caves' tokkul; the Void Knights' equipment,
// for Pest Control's seals; the Raiments of the Eye, for Guardians of the Rift's pearls; and
// Graceful, which the ladder's guardians and rares drop. A piece is a unique with a set, and its
// numbers are fixed; the bonuses come at two, three and four pieces worn (Graceful's six at two,
// four and six). The Void Knights' three helms are one piece, whichever's worn.
export type SetId = "dharok" | "ahrim" | "karil" | "guthan" | "torag" | "verac" | "obsidian" | "void" | "raiments" | "graceful";

export type SetBonus = { pieces: number; stats: StatLine[]; power?: UniquePower; keystone?: KeystoneId; procs?: Proc[] };

export type SetDef = {
    id: SetId;
    name: string;
    pieces: string[];
    bonuses: SetBonus[];
    // Pieces made elite from the set's own at its stall (town.ts SHOPS' upgrades), which count as
    // theirs: all of them worn, the set's numbers are so much more (the Void Knights' elite top and
    // robe, half again)
    elite?: { pieces: string[]; more: number };
};

export const SETS: Record<SetId, SetDef> = {
    dharok: {
        id: "dharok",
        name: "Dharok's armour",
        pieces: ["dharoks_helm", "dharoks_platebody", "dharoks_platelegs", "dharoks_greataxe"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "meleeDamagePct", value: 20 }] },
            { pieces: 3, stats: [{ stat: "lifePct", value: 10 }] },
            { pieces: 4, stats: [{ stat: "critMulti", value: 30 }], keystone: "dharoksCurse" },
        ],
    },
    ahrim: {
        id: "ahrim",
        name: "Ahrim's robes",
        pieces: ["ahrims_hood", "ahrims_robetop", "ahrims_robeskirt", "ahrims_staff"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "spellDamagePct", value: 20 }] },
            { pieces: 3, stats: [{ stat: "manaPct", value: 15 }] },
            { pieces: 4, stats: [{ stat: "skillLevels", value: 1 }], power: "ahrims" },
        ],
    },
    karil: {
        id: "karil",
        name: "Karil's leathers",
        pieces: ["karils_coif", "karils_leathertop", "karils_leatherskirt", "karils_crossbow"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "projectileDamagePct", value: 20 }] },
            { pieces: 3, stats: [{ stat: "evade", value: 5 }] },
            { pieces: 4, stats: [{ stat: "projectileSkillLevels", value: 1 }], power: "karils" },
        ],
    },
    guthan: {
        id: "guthan",
        name: "Guthan's armour",
        pieces: ["guthans_helm", "guthans_platebody", "guthans_chainskirt", "guthans_warspear"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "lifeOnHit", value: 8 }] },
            { pieces: 3, stats: [{ stat: "life", value: 80 }] },
            { pieces: 4, stats: [{ stat: "meleeSkillLevels", value: 1 }], power: "guthans" },
        ],
    },
    torag: {
        id: "torag",
        name: "Torag's armour",
        pieces: ["torags_helm", "torags_platebody", "torags_platelegs", "torags_hammers"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "armourPct", value: 25 }] },
            { pieces: 3, stats: [{ stat: "life", value: 80 }] },
            { pieces: 4, stats: [{ stat: "lessDamageTaken", value: 5 }], power: "torags" },
        ],
    },
    verac: {
        id: "verac",
        name: "Verac's armour",
        pieces: ["veracs_helm", "veracs_brassard", "veracs_plateskirt", "veracs_flail"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "critChance", value: 3 }] },
            { pieces: 3, stats: [{ stat: "physicalDamagePct", value: 25 }] },
            { pieces: 4, stats: [{ stat: "meleeSkillLevels", value: 1 }], power: "veracs" },
        ],
    },
    obsidian: {
        id: "obsidian",
        name: "Obsidian armour",
        pieces: ["obsidian_helmet", "obsidian_platebody", "obsidian_platelegs", "berserker_necklace"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "meleeDamagePct", value: 15 }] },
            { pieces: 3, stats: [{ stat: "life", value: 60 }] },
            { pieces: 4, stats: [{ stat: "meleeDamagePct", value: 25 }], procs: [{ when: "strike", chance: 0.08, gem: "slam", level: 20 }] },
        ],
    },
    void: {
        id: "void",
        name: "Void Knight equipment",
        pieces: ["void_melee_helm", "void_ranger_helm", "void_mage_helm", "void_knight_top", "void_knight_robe", "void_knight_gloves"],
        elite: { pieces: ["elite_void_top", "elite_void_robe"], more: 0.5 },
        bonuses: [
            { pieces: 2, stats: [{ stat: "damagePct", value: 10 }] },
            { pieces: 3, stats: [{ stat: "life", value: 60 }] },
            { pieces: 4, stats: [{ stat: "damagePct", value: 20 }, { stat: "critChance", value: 4 }] },
        ],
    },
    raiments: {
        id: "raiments",
        name: "Raiments of the Eye",
        pieces: ["hat_of_the_eye", "robe_top_of_the_eye", "robe_bottoms_of_the_eye", "boots_of_the_eye"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "rarity", value: 15 }] },
            { pieces: 3, stats: [{ stat: "manaPct", value: 12 }] },
            { pieces: 4, stats: [{ stat: "rarity", value: 30 }, { stat: "skillLevels", value: 1 }] },
        ],
    },
    graceful: {
        id: "graceful",
        name: "Graceful outfit",
        pieces: ["graceful_hood", "graceful_cape", "graceful_top", "graceful_legs", "graceful_gloves", "graceful_boots"],
        bonuses: [
            { pieces: 2, stats: [{ stat: "moveSpeedPct", value: 5 }] },
            { pieces: 4, stats: [{ stat: "evade", value: 6 }] },
            { pieces: 6, stats: [{ stat: "moveSpeedPct", value: 10 }, { stat: "cooldownPct", value: 10 }] },
        ],
    },
};

export const SET_IDS = Object.keys(SETS) as SetId[];

// The Barrows brothers' sets, for the chest's and the brothers' drops (Game.ts)
export const BROTHER_SETS: Record<"dharok" | "ahrim" | "karil" | "guthan" | "torag" | "verac", SetId> = { dharok: "dharok", ahrim: "ahrim", karil: "karil", guthan: "guthan", torag: "torag", verac: "verac" };

// What a stall in the strangers' camp asks for a piece, in the money its set is sold for (town.ts SHOPS'
// sets): the TzHaar's tokkul, the Void Knight's seals, Felix's abyssal pearls
export const SET_PRICES: Record<string, number> = {
    obsidian_helmet: 900,
    obsidian_platelegs: 1200,
    obsidian_platebody: 1600,
    berserker_necklace: 1400,
    void_melee_helm: 60,
    void_ranger_helm: 60,
    void_mage_helm: 60,
    void_knight_top: 90,
    void_knight_robe: 90,
    void_knight_gloves: 45,
    hat_of_the_eye: 70,
    robe_top_of_the_eye: 100,
    robe_bottoms_of_the_eye: 90,
    boots_of_the_eye: 60,
};

// How often the ladder's guardians and rares drop a piece of Graceful (Game.ts)
export const GRACEFUL_DROPS = { boss: 0.12, rare: 0.006 };

function setPieces(): UniqueDef[] {
    const piece = (set: SetId, id: string, name: string, objId: number, slot: Slot, level: number, armour: number | undefined, stats: StatLine[], lore: string, classes: ClassId[] | undefined, more: Partial<UniqueDef> = {}): UniqueDef => ({
        id,
        name,
        objId,
        slot,
        level,
        armour,
        stats,
        lore,
        classes,
        set,
        source: set === "graceful" ? "ladder" : set === "obsidian" || set === "void" || set === "raiments" ? "stall" : "barrows",
        ...more,
    });
    const L = 55;
    // Worn by any class
    const ALL = undefined;
    return [
        piece("dharok", "dharoks_helm", "Dharok's helm", 4716, "head", L, 55, [{ stat: "life", value: 50 }, { stat: "str", value: 15 }], "Dharok the Wretched's, who fought harder the nearer he came to death.", BLADE_CLASSES),
        piece("dharok", "dharoks_platebody", "Dharok's platebody", 4720, "body", L + 1, 145, [{ stat: "life", value: 80 }, { stat: "armourPct", value: 20 }], "It's dented in more places than it isn't.", BLADE_CLASSES),
        piece("dharok", "dharoks_platelegs", "Dharok's platelegs", 4722, "legs", L, 105, [{ stat: "life", value: 60 }, { stat: "meleeDamagePct", value: 10 }], "Heavy, and they never slowed him.", BLADE_CLASSES),
        piece("ahrim", "ahrims_hood", "Ahrim's hood", 4708, "head", L, 22, [{ stat: "mana", value: 50 }, { stat: "int", value: 15 }], "Ahrim the Blighted's, who studied what the other brothers feared.", ROBE_CLASSES),
        piece("ahrim", "ahrims_robetop", "Ahrim's robetop", 4712, "body", L + 1, 55, [{ stat: "mana", value: 80 }, { stat: "spellDamagePct", value: 20 }], "The weave still hums with something.", ROBE_CLASSES),
        piece("ahrim", "ahrims_robeskirt", "Ahrim's robeskirt", 4714, "legs", L, 40, [{ stat: "mana", value: 60 }, { stat: "manaRegen", value: 4 }], "Cold to the touch, whatever the weather.", ROBE_CLASSES),
        piece("ahrim", "ahrims_staff", "Ahrim's staff", 4710, "weapon", L + 1, undefined, [{ stat: "spellDamagePct", value: 40 }, { stat: "castSpeedPct", value: 10 }, { stat: "spellSkillLevels", value: 1 }], "The skull on it has seen more than you have.", ROBE_CLASSES, {
            weapon: { kind: "staff", damage: [37, 66], speed: 1.3, seq: SEQ.cast },
            family: "staff",
        }),
        piece("karil", "karils_coif", "Karil's coif", 4732, "head", L, 30, [{ stat: "dex", value: 15 }, { stat: "critChance", value: 2 }], "Karil the Tainted's, who never missed twice.", BOW_CLASSES),
        piece("karil", "karils_leathertop", "Karil's leathertop", 4736, "body", L + 1, 85, [{ stat: "life", value: 50 }, { stat: "evade", value: 5 }], "Supple still, after all this time underground.", BOW_CLASSES),
        piece("karil", "karils_leatherskirt", "Karil's leatherskirt", 4738, "legs", L, 60, [{ stat: "life", value: 40 }, { stat: "moveSpeedPct", value: 5 }], "Made for running, and for not being caught.", BOW_CLASSES),
        piece("karil", "karils_crossbow", "Karil's crossbow", 4734, "weapon", L + 1, undefined, [{ stat: "projectileDamagePct", value: 40 }, { stat: "attackSpeedPct", value: 10 }], "Light enough for one hand, quick enough for two.", BOW_CLASSES, {
            weapon: { kind: "bow", damage: [40, 68], speed: 1.25, seq: SEQ.shoot, arrow: SPOT.dragonArrow },
            family: "shortbow",
        }),
        piece("guthan", "guthans_helm", "Guthan's helm", 4724, "head", L, 55, [{ stat: "life", value: 40 }, { stat: "lifeOnHit", value: 4 }], "Guthan the Infested's, who healed on others' wounds.", BLADE_CLASSES),
        piece("guthan", "guthans_platebody", "Guthan's platebody", 4728, "body", L + 1, 145, [{ stat: "life", value: 70 }, { stat: "lifeRegen", value: 5 }], "Something still lives in the seams.", BLADE_CLASSES),
        piece("guthan", "guthans_chainskirt", "Guthan's chainskirt", 4730, "legs", L, 100, [{ stat: "life", value: 50 }, { stat: "armourPct", value: 15 }], "Every link of it was mended by hand.", BLADE_CLASSES),
        piece("guthan", "guthans_warspear", "Guthan's warspear", 4726, "weapon", L + 1, undefined, [{ stat: "damagePct", value: 40 }, { stat: "lifeLeech", value: 2 }], "It drinks, and its bearer is the better for it.", BLADE_CLASSES, {
            weapon: { kind: "melee", damage: [42, 70], speed: 1.3, seq: SEQ.stab },
        }),
        piece("torag", "torags_helm", "Torag's helm", 4745, "head", L, 60, [{ stat: "life", value: 40 }, { stat: "armourPct", value: 15 }], "Torag the Corrupted's, whose blows left you slow.", BLADE_CLASSES),
        piece("torag", "torags_platebody", "Torag's platebody", 4749, "body", L + 1, 155, [{ stat: "life", value: 70 }, { stat: "armourPct", value: 20 }], "The thickest of the six, and the dullest.", BLADE_CLASSES),
        piece("torag", "torags_platelegs", "Torag's platelegs", 4751, "legs", L, 110, [{ stat: "life", value: 50 }, { stat: "stunChance", value: 5 }], "They stand on their own when you take them off.", BLADE_CLASSES),
        piece("torag", "torags_hammers", "Torag's hammers", 4747, "weapon", L + 1, undefined, [{ stat: "damagePct", value: 35 }, { stat: "stunChance", value: 10 }], "Two of them, and either would do.", ["paladin", "warrior"], {
            weapon: { kind: "melee", damage: [38, 62], speed: 1.5, seq: SEQ.pound },
            family: "mace",
        }),
        piece("verac", "veracs_helm", "Verac's helm", 4753, "head", L, 55, [{ stat: "life", value: 40 }, { stat: "critChance", value: 2 }], "Verac the Defiled's, whose flail found the gaps in anything.", ["paladin", "warrior"]),
        piece("verac", "veracs_brassard", "Verac's brassard", 4757, "body", L + 1, 140, [{ stat: "life", value: 60 }, { stat: "buffEffectPct", value: 15 }], "A priest's armour, for a priest who stopped praying.", ["paladin", "warrior"]),
        piece("verac", "veracs_plateskirt", "Verac's plateskirt", 4759, "legs", L, 100, [{ stat: "life", value: 50 }, { stat: "moveSpeedPct", value: 5 }], "It rings like a bell when he walks.", ["paladin", "warrior"]),
        piece("verac", "veracs_flail", "Verac's flail", 4755, "weapon", L + 1, undefined, [{ stat: "damagePct", value: 35 }, { stat: "critMulti", value: 30 }], "No shield ever kept it out.", ["paladin", "warrior"], {
            weapon: { kind: "melee", damage: [40, 68], speed: 1.35, seq: SEQ.pound },
            family: "mace",
        }),
        piece("obsidian", "obsidian_helmet", "Obsidian helmet", 21298, "head", 50, 50, [{ stat: "life", value: 40 }, { stat: "meleeDamagePct", value: 10 }], "Knapped from the TzHaar's own stone, and still warm.", PLATE_CLASSES),
        piece("obsidian", "obsidian_platebody", "Obsidian platebody", 21301, "body", 51, 130, [{ stat: "life", value: 70 }, { stat: "str", value: 15 }], "The Fight Caves' heat is in it.", PLATE_CLASSES),
        piece("obsidian", "obsidian_platelegs", "Obsidian platelegs", 21304, "legs", 50, 95, [{ stat: "life", value: 50 }, { stat: "armourPct", value: 15 }], "Heavy as the mountain it came from.", PLATE_CLASSES),
        piece("obsidian", "berserker_necklace", "Berserker necklace", 11128, "amulet", 50, undefined, [{ stat: "meleeDamagePct", value: 20 }, { stat: "attackSpeedPct", value: 6 }], "Worn by the TzHaar who fight for the joy of it.", PLATE_CLASSES),
        // The Void Knights' (find-objs.ts: 11665, 11664, 11663, 8839, 8840, 8842), for anyone
        piece("void", "void_melee_helm", "Void melee helm", 11665, "head", 62, 40, [{ stat: "life", value: 40 }, { stat: "meleeDamagePct", value: 20 }], "A Void Knight's, for those who fight up close.", ALL),
        piece("void", "void_ranger_helm", "Void ranger helm", 11664, "head", 62, 30, [{ stat: "life", value: 30 }, { stat: "projectileDamagePct", value: 20 }], "A Void Knight's, for those who fight from afar.", ALL),
        piece("void", "void_mage_helm", "Void mage helm", 11663, "head", 62, 20, [{ stat: "mana", value: 40 }, { stat: "spellDamagePct", value: 20 }], "A Void Knight's, for those who fight with the runes.", ALL),
        piece("void", "void_knight_top", "Void knight top", 8839, "body", 63, 90, [{ stat: "life", value: 70 }, { stat: "critChance", value: 2 }], "Pest Control's pay, worn by those who earned it.", ALL),
        piece("void", "void_knight_robe", "Void knight robe", 8840, "legs", 62, 70, [{ stat: "life", value: 50 }, { stat: "attackSpeedPct", value: 5 }], "Light enough to run in, which is the point.", ALL),
        piece("void", "void_knight_gloves", "Void knight gloves", 8842, "hands", 62, 25, [{ stat: "critMulti", value: 20 }, { stat: "lifeOnHit", value: 4 }], "Their palms are worn through from portals.", ALL),
        // Made from the top and the robe at the Void Knight's stall, for seals (find-objs.ts 13072,
        // 13073): both worn, the set's numbers are half again
        piece("void", "elite_void_top", "Elite void top", 13072, "body", 70, 110, [{ stat: "life", value: 90 }, { stat: "critChance", value: 3 }], "The Void Knights' best, for those who've held the outpost longest. With the elite robe, the set gives half again.", ALL),
        piece("void", "elite_void_robe", "Elite void robe", 13073, "legs", 70, 85, [{ stat: "life", value: 65 }, { stat: "attackSpeedPct", value: 6 }], "Its trim is gold, and every thread of it earned. With the elite top, the set gives half again.", ALL),
        // Guardians of the Rift's (26850, 26852, 26854, 26856): the runecrafters', for finding
        piece("raiments", "hat_of_the_eye", "Hat of the eye", 26850, "head", 64, 20, [{ stat: "mana", value: 50 }, { stat: "rarity", value: 10 }], "The Eye watches the rifts, and so does whoever wears it.", ALL),
        piece("raiments", "robe_top_of_the_eye", "Robe top of the eye", 26852, "body", 65, 50, [{ stat: "life", value: 50 }, { stat: "rarity", value: 12 }], "Woven with essence the Great Guardian gave back.", ALL),
        piece("raiments", "robe_bottoms_of_the_eye", "Robe bottoms of the eye", 26854, "legs", 64, 40, [{ stat: "mana", value: 40 }, { stat: "rarity", value: 10 }], "Still faintly warm from the Guardian's rift.", ALL),
        piece("raiments", "boots_of_the_eye", "Boots of the eye", 26856, "feet", 64, 20, [{ stat: "moveSpeedPct", value: 6 }, { stat: "rarity", value: 8 }], "They never quite touch the ground.", ALL),
        // The rooftop runners' (11850-11858; the boots are the unique's), from the ladder's
        // guardians and rares
        piece("graceful", "graceful_hood", "Graceful hood", 11850, "head", 60, 10, [{ stat: "evade", value: 3 }, { stat: "dex", value: 10 }], "Light as a feather, and as hard to hit.", ALL),
        piece("graceful", "graceful_cape", "Graceful cape", 11852, "cape", 60, undefined, [{ stat: "moveSpeedPct", value: 4 }, { stat: "evade", value: 2 }], "It catches the wind, and never the wall.", ALL),
        piece("graceful", "graceful_top", "Graceful top", 11854, "body", 61, 30, [{ stat: "life", value: 40 }, { stat: "evade", value: 4 }], "Made for running across roofs, not for being hit on them.", ALL),
        piece("graceful", "graceful_legs", "Graceful legs", 11856, "legs", 60, 20, [{ stat: "life", value: 30 }, { stat: "moveSpeedPct", value: 4 }], "Not a seam that catches.", ALL),
        piece("graceful", "graceful_gloves", "Graceful gloves", 11858, "hands", 60, 8, [{ stat: "attackSpeedPct", value: 4 }, { stat: "dex", value: 8 }], "For a grip on ledges, and on hilts.", ALL),
    ];
}
