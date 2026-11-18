// Gems, as plain data: skill gems, each a skill the hero can use while it's socketed in something
// they wear, and support gems, which make better the skills linked to them. A gem goes in a socket
// of its colour: red for Strength's skills (blades and war), green for Dexterity's (bows and quick
// feet), blue for Intelligence's (spells). A skill's damage is a share of the weapon's hit, as it
// always was, so better weapons make every skill better; a gem's level makes its own share bigger.
// Numbers are starting guesses, to be tuned in play.
import type { ClassId, WeaponKind } from "./items";
import { SEQ } from "./items";
import type { SkillTraits } from "./forge";
import type { MinionId } from "./minions";
import { SPOT, Visual } from "./visuals";

export type GemColor = "red" | "green" | "blue";

// A skill's picture: a sprite from the client's interface (a spell's or a prayer's, from the
// spellbook and prayer tabs), or an item's icon: a weapon, for an attack nothing there is like.
// The gem itself is always a gem (its objId): only where it's a skill is the skill shown
export type SkillIcon = { sprite: number } | { obj: number };

export type SkillKind =
    // A blow at what's in front (melee)
    | "strike"
    // A blow at everything in an arc in front
    | "cleave"
    // Everything round the hero
    | "slam"
    // A while of being stronger, quicker or harder to hurt
    | "buff"
    // One projectile, or a fan of them
    | "shoot"
    // A projectile that bursts where it lands
    | "burst"
    // Falls on where the mouse is, a moment later
    | "rain"
    // Everything round the hero, at once
    | "nova"
    // To where the mouse is, in an instant
    | "blink"
    // Up and onto where the mouse is, and a slam where it lands
    | "leap"
    // Lightning from one enemy to the next
    | "arc"
    // Something risen beside the hero, to fight for them a while (minions.ts)
    | "summon";

// What a skill is, for what can support it and what makes it stronger
export type SkillTag =
    | "attack"
    | "spell"
    | "melee"
    | "projectile"
    | "area"
    | "buff"
    | "movement"
    | "physical"
    | "fire"
    | "cold"
    | "lightning"
    | "chaining"
    | "duration"
    | "minion";

export const TAG_NAMES: Record<SkillTag, string> = {
    attack: "Attack",
    spell: "Spell",
    melee: "Melee",
    projectile: "Projectile",
    area: "Area",
    buff: "Buff",
    movement: "Movement",
    physical: "Physical",
    fire: "Fire",
    cold: "Cold",
    lightning: "Lightning",
    chaining: "Chaining",
    duration: "Duration",
    minion: "Minion",
};

// What a summon raises, for how long, and how many can stand at once (more as its gem levels)
export type SummonDef = { minion: MinionId; seconds: number; max: number };

export type BuffDef = {
    seconds: number;
    damagePct?: number;
    attackSpeedPct?: number;
    moveSpeedPct?: number;
    armourPct?: number;
    // Less damage taken, as a percentage
    lessDamageTaken?: number;
    // A share of life back at once
    heal?: number;
    // A potion's own (content/potions.ts PotionBuff): more damage as a share, increased damage with
    // a tag's skills, a chance to evade, less mana cost and less elemental damage taken as shares,
    // and no ailments
    more?: number;
    tag?: SkillTag;
    tagPct?: number;
    evade?: number;
    manaCostLess?: number;
    elementalLess?: number;
    noAilments?: boolean;
};

export type SkillDef = {
    id: string;
    name: string;
    // {damage} is its share of the weapon's damage, as a percentage
    description: string;
    kind: SkillKind;
    // Times the weapon's hit
    damage: number;
    mana: number;
    cooldown: number;
    // Times the weapon's attack time
    castTime: number;
    // The animation, if not the weapon's own attack's
    seq?: number;
    // Melee reach, or how far a projectile flies or a leap or arc goes, in tiles
    range: number;
    radius?: number;
    // Degrees: a cleave's arc, a fan's spread (360, a ring round the hero)
    arc?: number;
    count?: number;
    // A fan's projectiles hit each enemy once between them, as Path of Exile's do, so a fan for a
    // crowd isn't also the best thing at a big enemy's feet (Barrage's tight spread is meant to)
    onePerTarget?: boolean;
    // Blows a strike lands at once, each rolled on its own
    hits?: number;
    // Added to its critical strike chance, as a share
    critBonus?: number;
    summon?: SummonDef;
    // Tiles a second, a projectile's
    speed?: number;
    pierce?: number;
    // How many more enemies an arc goes on to
    chain?: number;
    // Seconds every hit freezes or stuns for
    freeze?: number;
    stun?: number;
    // Chances on each hit, as shares
    ignite?: number;
    shock?: number;
    freezeChance?: number;
    // A share of the damage it deals, healed
    leech?: number;
    buff?: BuffDef;
    // Seconds before a rain lands, and how many spot animations it shows as it does
    delay?: number;
    shows?: number;
    // The weapon's arrow if unset, for a bow's skills
    visual?: Visual;
    // Its picture on the skill bar and its buff
    icon: SkillIcon;
    // A forged skill's traits (forge.ts), with their numbers
    traits?: SkillTraits;
};

// A support's numbers at gem level 1 and at 20; between, in a line
export type Ranged = [number, number];

export type SupportDef = {
    // A skill it supports has at least one of these (none: any skill)
    needsAny?: SkillTag[];
    // and none of these
    excludes?: SkillTag[];
    // Only skills with a cooldown
    needsCooldown?: boolean;
    // Its skill's mana cost is multiplied by this
    manaMult: Ranged;
    // More damage (less, if under 0), as a percentage
    more?: Ranged;
    // More attack and cast speed, as a percentage
    moreSpeed?: Ranged;
    projectiles?: number;
    pierce?: number;
    chain?: number;
    areaPct?: Ranged;
    // Added to critical strike chance, and to its multiplier, as percentages
    critChance?: Ranged;
    critMulti?: Ranged;
    // Chances on hit, as percentages, whatever the element
    ignite?: Ranged;
    freeze?: Ranged;
    shock?: Ranged;
    stun?: Ranged;
    lifeOnHit?: Ranged;
    // A percentage of damage leeched as life
    leech?: Ranged;
    // Kills what's left on 10% of its life (5% for a guardian)
    cull?: boolean;
    // A blow at one also hits those near it, for this percentage of the damage
    splash?: Ranged;
    cooldownPct?: Ranged;
    durationPct?: Ranged;
    // More damage for burning, as a percentage
    burnMore?: Ranged;
    // What the skill becomes too (added fire makes it a fire skill)
    addTags?: SkillTag[];
};

export type GemDef = {
    id: string;
    name: string;
    color: GemColor;
    // The hero's level a gem of level 1 needs
    level: number;
    tags: SkillTag[];
    // The model on the ground, and in the pack for a support
    objId: number;
    skill?: SkillDef;
    // What it has to be used with: an attack's weapon. Unset, anything.
    weapons?: WeaponKind[];
    support?: SupportDef;
    // A support's own words for what it does, before its numbers
    blurb?: string;
    // Rolled when it dropped (forge.ts), not one of these
    forged?: boolean;
};

// A cut gem for a skill, an uncut one for a support, of the gem's colour
const SKILL_OBJ: Record<GemColor, number> = { red: 1603, green: 1605, blue: 1607 };
const SUPPORT_OBJ: Record<GemColor, number> = { red: 1619, green: 1621, blue: 1623 };

export const MAX_GEM_LEVEL = 20;
// What a level adds to a skill's share of the weapon's damage, and to its mana cost: the cost
// climbs faster than the damage, so a gem's skill stays dear as the hero's mana grows
export const GEM_DAMAGE_PER_LEVEL = 0.045;
export const GEM_MANA_PER_LEVEL = 0.07;
// Every skill's mana (its `mana` below) times this: skills are paid for, not spammed, and mana
// flasks and regeneration are part of the fight. A skill with no cost stays free (a class's
// first attack, the weapon's own).
export const MANA_COST_MULT = 2.5;

const gems: GemDef[] = [];

function skill(color: GemColor, level: number, tags: SkillTag[], def: SkillDef, weapons?: WeaponKind[]): void {
    gems.push({ id: def.id, name: def.name, color, level, tags, objId: SKILL_OBJ[color], skill: def, weapons });
}

function support(id: string, name: string, color: GemColor, level: number, blurb: string, def: SupportDef): void {
    gems.push({ id, name, color, level, tags: [], objId: SUPPORT_OBJ[color], support: def, blurb });
}

const MELEE: WeaponKind[] = ["melee"];
const BOW: WeaponKind[] = ["bow"];

// ---- Red: blades, and war ----

skill("red", 1, ["attack", "melee", "physical"], {
    id: "slash",
    name: "Slash",
    description: "Strikes the enemy in front for {damage}% of your weapon's damage.",
    kind: "strike",
    damage: 1,
    mana: 0,
    cooldown: 0,
    castTime: 1,
    range: 1.5,
    arc: 70,
    icon: { obj: 1333 }, // Rune scimitar
}, MELEE);

skill("red", 1, ["attack", "melee", "area", "physical"], {
    id: "cleave",
    name: "Cleave",
    description: "A wide swing that hits everything in front of you for {damage}% of your weapon's damage.",
    kind: "cleave",
    damage: 1.35,
    mana: 5,
    cooldown: 0,
    castTime: 1.15,
    seq: SEQ.sweep,
    range: 2.4,
    arc: 150,
    visual: { sound: 2564 },
    icon: { obj: 1373 }, // Rune battleaxe
}, MELEE);

skill("red", 2, ["attack", "melee", "physical", "duration"], {
    id: "heavy_strike",
    name: "Heavy Strike",
    description: "A slow, crushing blow for {damage}% of your weapon's damage that stuns.",
    kind: "strike",
    damage: 2,
    mana: 6,
    cooldown: 0,
    castTime: 1.4,
    seq: SEQ.hack,
    range: 1.6,
    arc: 70,
    stun: 0.8,
    visual: SPOT.dust,
    icon: { obj: 1432 }, // Rune mace
}, MELEE);

skill("red", 3, ["attack", "melee", "area", "physical", "duration"], {
    id: "slam",
    name: "Ground Slam",
    description: "Smashes the ground, hitting everything around you for {damage}% damage and stunning it.",
    kind: "slam",
    damage: 2.8,
    mana: 12,
    cooldown: 3,
    castTime: 1.3,
    seq: SEQ.smash,
    range: 3.4,
    radius: 3.4,
    stun: 1.2,
    visual: SPOT.stomp,
    icon: { obj: 4153 }, // Granite maul
}, MELEE);

skill("red", 6, ["buff", "duration"], {
    id: "warcry",
    name: "War Cry",
    description: "A roar that heals 15% of your life and gives 40% more damage and 25% attack speed for 6 seconds.",
    kind: "buff",
    damage: 0,
    mana: 15,
    cooldown: 14,
    castTime: 0.9,
    seq: SEQ.pray,
    range: 0,
    buff: { seconds: 6, damagePct: 40, attackSpeedPct: 25, heal: 0.15 },
    visual: SPOT.zamorakFlames,
    icon: { sprite: 125 }, // the sprite of Ultimate Strength
});

skill("blue", 4, ["buff", "duration"], {
    id: "sanctuary",
    name: "Sanctuary",
    description: "Saradomin's light round you: heals 20% of your life, and for 6 seconds you take 25% less damage with half again your armour.",
    kind: "buff",
    damage: 0,
    mana: 14,
    cooldown: 15,
    castTime: 0.8,
    seq: SEQ.pray,
    range: 0,
    buff: { seconds: 6, lessDamageTaken: 25, armourPct: 50, heal: 0.2 },
    visual: { impactSpot: 436, sound: 1659 },
    icon: { sprite: 130 }, // the sprite of Redemption
});

skill("red", 8, ["attack", "melee", "fire"], {
    id: "searing_strike",
    name: "Searing Strike",
    description: "A burning blow for {damage}% of your weapon's damage, with a 40% chance to ignite.",
    kind: "strike",
    damage: 1.45,
    mana: 6,
    cooldown: 0,
    castTime: 1.1,
    range: 1.6,
    arc: 70,
    ignite: 0.4,
    visual: { impactSpot: SPOT.fireBolt.impactSpot, sound: 2564 },
    icon: { obj: 1305 }, // Dragon longsword
}, MELEE);

skill("red", 10, ["attack", "melee", "area", "movement", "physical"], {
    id: "leap_slam",
    name: "Leap Slam",
    description: "Leaps to where you aim, up to 8 tiles, and slams down on everything there for {damage}% damage.",
    kind: "leap",
    damage: 1.5,
    mana: 14,
    cooldown: 2.5,
    castTime: 1.1,
    seq: SEQ.smash,
    range: 8,
    radius: 2.2,
    stun: 0.5,
    visual: SPOT.stomp,
    icon: { obj: 1319 }, // Rune 2h sword
}, MELEE);

skill("red", 1, ["attack", "melee", "lightning"], {
    id: "smite",
    name: "Smite",
    description: "A holy blow for {damage}% of your weapon's damage. Saradomin's lightning answers it, with a 25% chance to shock.",
    kind: "strike",
    damage: 1.3,
    mana: 2,
    cooldown: 0,
    castTime: 1.1,
    range: 1.6,
    arc: 70,
    shock: 0.25,
    visual: SPOT.saradominStrike,
    icon: { sprite: 132 }, // the sprite of Smite
}, MELEE);

skill("red", 1, ["attack", "projectile", "physical"], {
    id: "blessed_hammer",
    name: "Blessed Hammer",
    description: "Hurls three blessed hammers that spin through every enemy in their way, each for {damage}% of your weapon's damage.",
    kind: "shoot",
    damage: 0.85,
    mana: 6,
    cooldown: 0,
    castTime: 1.2,
    seq: SEQ.throw,
    range: 7,
    speed: 8,
    count: 3,
    arc: 40,
    pierce: 99,
    visual: { projectileObj: 1347, sound: 2564 },
    icon: { obj: 1347 }, // Rune warhammer
}, MELEE);

skill("red", 4, ["attack", "melee", "physical"], {
    id: "puncture",
    name: "Puncture",
    description: "Two quick stabs at the enemy in front, each for {damage}% of your weapon's damage, with 20% more chance to be critical.",
    kind: "strike",
    damage: 1.05,
    hits: 2,
    critBonus: 0.2,
    mana: 6,
    cooldown: 0,
    castTime: 1.5,
    seq: SEQ.puncture,
    range: 1.5,
    arc: 70,
    visual: { impactSpot: 252, sound: 2564 },
    icon: { obj: 1215 }, // Dragon dagger
}, MELEE);

skill("red", 6, ["attack", "melee", "area", "lightning", "duration"], {
    id: "judgement",
    name: "Judgement",
    description: "Calls Saradomin's judgement down on everything round you: {damage}% of your weapon's damage, and a moment's stun.",
    kind: "nova",
    damage: 2.4,
    mana: 13,
    cooldown: 3,
    castTime: 1.3,
    seq: SEQ.smash,
    range: 3.3,
    radius: 3.3,
    stun: 0.8,
    shock: 0.2,
    visual: SPOT.saradominStrike,
    icon: { sprite: 131 }, // the sprite of Retribution
}, MELEE);

skill("red", 14, ["buff", "duration"], {
    id: "rock_skin",
    name: "Rock Skin",
    description: "Your skin turns to granite: twice the armour, and 15% less damage taken, for 8 seconds.",
    kind: "buff",
    damage: 0,
    mana: 12,
    cooldown: 16,
    castTime: 0.8,
    seq: SEQ.pray,
    range: 0,
    buff: { seconds: 8, armourPct: 100, lessDamageTaken: 15 },
    visual: SPOT.dust,
    icon: { sprite: 118 }, // the sprite of Rock Skin
});

// ---- Green: the bow, quick blades and quick feet ----

skill("green", 1, ["attack", "melee", "physical"], {
    id: "flurry",
    name: "Flurry",
    description: "Three quick stabs at the enemy in front, each for {damage}% of your weapon's damage.",
    kind: "strike",
    damage: 0.5,
    hits: 3,
    mana: 0,
    cooldown: 0,
    castTime: 1.05,
    seq: SEQ.stab,
    range: 1.4,
    arc: 70,
    icon: { obj: 1213 }, // Rune dagger
}, MELEE);

skill("green", 1, ["attack", "projectile", "physical"], {
    id: "fan_of_knives",
    name: "Fan of Knives",
    description: "Flings ten knives in a ring round you, each for {damage}% of your weapon's damage.",
    kind: "shoot",
    damage: 0.58,
    mana: 7,
    cooldown: 0,
    castTime: 1.25,
    seq: SEQ.throw,
    range: 6.5,
    speed: 16,
    count: 10,
    arc: 360,
    visual: { projectile: 218, sound: 2707 },
    icon: { obj: 868 }, // Rune knife
}, MELEE);

skill("green", 1, ["attack", "projectile", "physical"], {
    id: "shoot",
    name: "Shoot",
    description: "Looses an arrow for {damage}% of your weapon's damage.",
    kind: "shoot",
    // The bow's one-target attack for nothing, as Slash and Flurry are the blades': a fifth more
    // since Split Arrow stopped landing all its arrows on one enemy
    damage: 1.2,
    mana: 0,
    cooldown: 0,
    castTime: 1,
    range: 13,
    speed: 18,
    count: 1,
    icon: { obj: 861 }, // Magic shortbow
}, BOW);

skill("green", 1, ["attack", "projectile", "physical"], {
    id: "split",
    name: "Split Arrow",
    description: "Looses five arrows in a fan, each for {damage}% of your weapon's damage. An enemy is struck by one of them at most.",
    kind: "shoot",
    // Each enemy takes one arrow at most (onePerTarget), so it's paid as a skill for a crowd
    damage: 0.9,
    mana: 5,
    cooldown: 0,
    castTime: 1.1,
    range: 12,
    speed: 17,
    count: 5,
    arc: 50,
    onePerTarget: true,
    icon: { obj: 859 }, // Magic longbow
}, BOW);

skill("green", 3, ["attack", "projectile", "area", "fire"], {
    id: "explosive",
    name: "Explosive Arrow",
    description: "An arrow that bursts where it lands, hitting everything near for {damage}% damage.",
    kind: "burst",
    damage: 2.2,
    mana: 10,
    cooldown: 1.1,
    castTime: 1.2,
    range: 13,
    radius: 2.4,
    speed: 15,
    visual: SPOT.dragonArrow,
    icon: { obj: 11235 }, // Dark bow
}, BOW);

skill("green", 4, ["attack", "projectile", "physical"], {
    id: "barrage",
    name: "Barrage",
    description: "Four arrows in a tight spread, each for {damage}% of your weapon's damage.",
    kind: "shoot",
    damage: 0.55,
    mana: 6,
    cooldown: 0,
    castTime: 1.15,
    range: 13,
    speed: 20,
    count: 4,
    arc: 8,
    icon: { obj: 892 }, // Rune arrow
}, BOW);

skill("green", 5, ["movement", "duration"], {
    id: "shadow_step",
    name: "Shadow Step",
    description: "Steps through the shadows to where you aim, up to 6 tiles away.",
    kind: "blink",
    damage: 0,
    mana: 6,
    cooldown: 2.5,
    castTime: 0.4,
    seq: SEQ.teleport,
    range: 6,
    icon: { sprite: 1315 }, // the sprite of Shadow Veil
});

skill("green", 6, ["attack", "area", "physical"], {
    id: "rain",
    name: "Rain of Arrows",
    description: "Arrows fall where you aim a moment later, hitting everything there for {damage}% damage.",
    kind: "rain",
    damage: 2.6,
    mana: 14,
    cooldown: 2.5,
    castTime: 1,
    range: 12,
    radius: 3.3,
    delay: 0.4,
    shows: 7,
    visual: SPOT.dragonArrow,
    icon: { sprite: 504 }, // the sprite of Eagle Eye (the prayer)
}, BOW);

skill("green", 7, ["attack", "projectile", "cold"], {
    id: "frost_arrow",
    name: "Frost Arrow",
    description: "An arrow of ice for {damage}% of your weapon's damage that pierces one enemy, with a 30% chance to freeze.",
    kind: "shoot",
    damage: 1.3,
    mana: 6,
    cooldown: 0,
    castTime: 1.1,
    range: 13,
    speed: 19,
    count: 1,
    pierce: 1,
    freezeChance: 0.3,
    visual: { projectile: SPOT.runeArrow.projectile, impactSpot: SPOT.iceBurst.impactSpot, sound: 2707 },
    icon: { sprite: 325 }, // the sprite of Ice Rush
}, BOW);

skill("green", 9, ["buff", "duration"], {
    id: "haste",
    name: "Haste",
    description: "Quickens you: 30% more movement speed and 15% more attack speed for 6 seconds.",
    kind: "buff",
    damage: 0,
    mana: 12,
    cooldown: 15,
    castTime: 0.6,
    seq: SEQ.pray,
    range: 0,
    buff: { seconds: 6, moveSpeedPct: 30, attackSpeedPct: 15 },
    visual: SPOT.blueImpact,
    icon: { obj: 12625 }, // Stamina potion(4)
});

skill("green", 12, ["attack", "projectile", "chaining", "physical"], {
    id: "chain_shot",
    name: "Chain Shot",
    description: "An arrow for {damage}% of your weapon's damage that leaps on to three more enemies.",
    kind: "shoot",
    damage: 0.95,
    mana: 7,
    cooldown: 0,
    castTime: 1.05,
    range: 13,
    speed: 20,
    count: 1,
    chain: 3,
    icon: { sprite: 502 }, // the sprite of Hawk Eye (the prayer)
}, BOW);

// ---- Blue: spells ----

skill("blue", 1, ["spell", "projectile", "fire"], {
    id: "firebolt",
    name: "Fire Bolt",
    description: "Hurls a bolt of fire for {damage}% of your weapon's damage.",
    kind: "shoot",
    damage: 1,
    mana: 2,
    cooldown: 0,
    castTime: 1,
    range: 13,
    speed: 12,
    count: 1,
    visual: SPOT.fireBolt,
    icon: { sprite: 32 }, // the sprite of Fire Bolt
});

skill("blue", 1, ["spell", "area", "cold", "duration"], {
    id: "icenova",
    name: "Ice Burst",
    description: "Ice bursts around you, hitting everything near for {damage}% damage and freezing it.",
    kind: "nova",
    damage: 1.1,
    mana: 9,
    cooldown: 2.5,
    castTime: 1.1,
    seq: SEQ.castBurst,
    range: 3.2,
    radius: 3.2,
    freeze: 2,
    visual: SPOT.iceBurst,
    icon: { sprite: 326 }, // the sprite of Ice Burst
});

skill("blue", 3, ["spell", "projectile", "area", "fire"], {
    id: "firewave",
    name: "Fire Wave",
    description: "A wave of fire that passes through enemies and bursts on the last, for {damage}% damage.",
    kind: "burst",
    damage: 2,
    mana: 14,
    cooldown: 1.2,
    castTime: 1.25,
    seq: SEQ.castWave,
    range: 14,
    radius: 1.6,
    speed: 11,
    pierce: 4,
    visual: SPOT.fireWave,
    icon: { sprite: 52 }, // the sprite of Fire Wave
});

skill("blue", 5, ["spell", "area", "lightning"], {
    id: "saradomin_strike",
    name: "Saradomin Strike",
    description: "Lightning from the sky where you aim, for {damage}% damage, with a 30% chance to shock.",
    kind: "rain",
    damage: 1.7,
    mana: 10,
    cooldown: 0.8,
    castTime: 1.1,
    range: 12,
    radius: 1.8,
    shock: 0.3,
    delay: 0.15,
    shows: 1,
    visual: SPOT.saradominStrike,
    icon: { sprite: 61 }, // the sprite of Saradomin Strike
});

skill("blue", 6, ["spell", "movement"], {
    id: "blink",
    name: "Blink",
    description: "Teleports you to where you aim, up to 9 tiles away.",
    kind: "blink",
    damage: 0,
    mana: 8,
    cooldown: 3,
    castTime: 0.5,
    seq: SEQ.teleport,
    range: 9,
    icon: { sprite: 359 }, // the sprite of Teleport to Target
});

skill("blue", 9, ["spell", "lightning", "chaining"], {
    id: "storm_of_armadyl",
    name: "Storm of Armadyl",
    description: "Lightning that strikes an enemy for {damage}% damage and arcs on to four more, with a 15% chance to shock.",
    kind: "arc",
    damage: 1.1,
    mana: 9,
    cooldown: 0,
    castTime: 1,
    range: 10,
    chain: 4,
    shock: 0.15,
    visual: SPOT.blueImpact,
    icon: { sprite: 558 }, // the sprite of Energy Transfer (a lightning bolt)
});

skill("blue", 11, ["buff", "duration"], {
    id: "arcane_ward",
    name: "Arcane Ward",
    description: "A ward of runes round you: 30% less damage taken for 5 seconds.",
    kind: "buff",
    damage: 0,
    mana: 14,
    cooldown: 14,
    castTime: 0.7,
    seq: SEQ.pray,
    range: 0,
    buff: { seconds: 5, lessDamageTaken: 30 },
    visual: SPOT.saradominStrike,
    icon: { sprite: 1306 }, // the sprite of Ward of Arceuus
});

skill("blue", 14, ["spell", "area"], {
    id: "blood_barrage",
    name: "Blood Barrage",
    description: "Blood magic round you, hitting everything near for {damage}% damage and healing you for 15% of it.",
    kind: "nova",
    damage: 1.25,
    mana: 16,
    cooldown: 3,
    castTime: 1.15,
    seq: SEQ.castBurst,
    range: 3,
    radius: 3,
    leech: 0.15,
    visual: SPOT.bloodBurst,
    icon: { sprite: 336 }, // the sprite of Blood Barrage
});

skill("blue", 1, ["spell", "projectile"], {
    id: "shadow_bolt",
    name: "Shadow Bolt",
    description: "A bolt of shadow for {damage}% of your weapon's damage that passes through the first enemy it strikes.",
    kind: "shoot",
    damage: 0.95,
    mana: 2,
    cooldown: 0,
    castTime: 1,
    range: 13,
    speed: 13,
    count: 1,
    pierce: 1,
    visual: SPOT.shadowBolt,
    icon: { sprite: 53 }, // the sprite of Iban Blast
});

skill("blue", 1, ["spell", "minion", "duration", "physical"], {
    id: "raise_skeleton",
    name: "Raise Skeleton",
    description:
        "Raises a skeletal thrall beside you for 20 seconds. It goes for what's near you, every blow {damage}% of your weapon's damage. Three can stand at once, one more at gem levels 8 and 15.",
    kind: "summon",
    damage: 0.6,
    mana: 12,
    cooldown: 0,
    castTime: 1.2,
    seq: SEQ.castBurst,
    range: 2,
    summon: { minion: "skeleton", seconds: 20, max: 3 },
    visual: { impactSpot: 386, sound: 168 },
    icon: { sprite: 2981 }, // the sprite of Resurrect Superior Skeleton
});

skill("blue", 3, ["spell", "area", "duration"], {
    id: "grasp_of_the_dead",
    name: "Grasp of the Dead",
    description: "Dead hands claw up where you aim, a moment later: everything there takes {damage}% damage and is held fast for 2 seconds.",
    kind: "rain",
    damage: 1.3,
    mana: 11,
    cooldown: 2,
    castTime: 1.1,
    seq: SEQ.castBurst,
    range: 11,
    radius: 2.4,
    freeze: 2,
    delay: 0.3,
    shows: 3,
    visual: SPOT.shadowBarrage,
    icon: { sprite: 1268 }, // the sprite of Skeletal Grasp
});

// ---- Supports ----

const HITS: SkillTag[] = ["attack", "spell"];

support("brutality", "Brutality", "red", 2, "Melee blows land harder.", { needsAny: ["melee"], manaMult: [1.4, 1.4], more: [30, 49] });
support("concussion", "Concussion", "red", 4, "Hits ring heads.", { needsAny: HITS, manaMult: [1.1, 1.1], stun: [25, 44] });
support("bloodthirst", "Bloodthirst", "red", 5, "Every enemy struck gives back a little life.", { needsAny: ["attack"], manaMult: [1.1, 1.1], lifeOnHit: [3, 22] });
support("expanse", "Expanse", "red", 6, "A bigger area.", { needsAny: ["area"], manaMult: [1.4, 1.4], areaPct: [25, 44] });
support("shockwave", "Shockwave", "red", 8, "A blow at one enemy shakes those beside it.", { needsAny: ["melee"], excludes: ["area"], manaMult: [1.3, 1.3], splash: [60, 79] });
support("infernal_touch", "Infernal Touch", "red", 10, "Blows and arrows wreathed in fire.", {
    needsAny: ["attack"],
    manaMult: [1.2, 1.2],
    more: [20, 39],
    ignite: [10, 20],
    addTags: ["fire"],
});
support("siphon", "Siphon", "red", 12, "Drinks the life of what it hurts.", { needsAny: HITS, manaMult: [1.2, 1.2], leech: [2, 3.9] });

support("volley", "Volley", "green", 3, "More projectiles, each a little weaker.", { needsAny: ["projectile"], manaMult: [1.4, 1.4], projectiles: 2, more: [-25, -15] });
support("piercing", "Piercing", "green", 4, "Projectiles pass through enemies.", { needsAny: ["projectile"], manaMult: [1.15, 1.15], pierce: 2, more: [0, 19] });
support("swiftness", "Swiftness", "green", 4, "Faster attacks.", { needsAny: ["attack"], manaMult: [1.15, 1.15], moreSpeed: [20, 39] });
support("precision", "Precision", "green", 6, "Finds the weak spot.", { needsAny: HITS, manaMult: [1.2, 1.2], critChance: [3, 5], critMulti: [25, 44] });
support("ricochet", "Ricochet", "green", 8, "Projectiles leap on to other enemies.", {
    needsAny: ["projectile"],
    excludes: ["area"],
    manaMult: [1.3, 1.3],
    chain: 2,
    more: [-25, -15],
    addTags: ["chaining"],
});
support("executioner", "Executioner", "green", 10, "Finishes off the nearly dead.", { needsAny: HITS, manaMult: [1.1, 1.1], cull: true, more: [0, 19] });
support("momentum", "Momentum", "green", 7, "Movement skills come back sooner.", { needsAny: ["movement"], manaMult: [1, 1], cooldownPct: [30, 49] });

support("concentrated_power", "Concentrated Power", "blue", 2, "Raw power, at a price in mana.", { needsAny: HITS, manaMult: [1.5, 1.5], more: [30, 49] });
support("quickened_casting", "Quickened Casting", "blue", 4, "Spells cast faster.", { needsAny: ["spell"], manaMult: [1.2, 1.2], moreSpeed: [20, 39] });
support("kindling", "Kindling", "blue", 5, "Fire that clings and burns.", { needsAny: ["fire"], manaMult: [1.1, 1.1], ignite: [25, 44], burnMore: [0, 38] });
support("deep_freeze", "Deep Freeze", "blue", 6, "Cold that stops a heart.", { needsAny: ["cold"], manaMult: [1.15, 1.15], freeze: [20, 39], durationPct: [30, 49] });
support("static_charge", "Static Charge", "blue", 7, "Lightning that lingers.", { needsAny: ["lightning"], manaMult: [1.15, 1.15], shock: [25, 44] });
support("runic_focus", "Runic Focus", "blue", 9, "Fire, ice and lightning, all the fiercer.", { needsAny: ["fire", "cold", "lightning"], manaMult: [1.3, 1.3], more: [30, 49] });
support("efficiency", "Efficiency", "blue", 3, "Costs less to use.", { manaMult: [0.7, 0.55] });
support("persistence", "Persistence", "blue", 8, "What it does lasts longer.", { needsAny: ["duration", "buff"], manaMult: [1.2, 1.2], durationPct: [40, 59] });
support("haste_of_mind", "Haste of Mind", "blue", 10, "Skills with a cooldown are ready sooner.", { needsCooldown: true, manaMult: [1.2, 1.2], cooldownPct: [30, 49] });

export const GEMS: GemDef[] = gems;
export const GEM_BY_ID = new Map(GEMS.map((g) => [g.id, g]));

// ---- Basic attacks ----

// What a hero does with no skill on the left button: a plain blow, shot or spell, with no gem
// behind it and so nothing to support it
export const BASIC_ATTACK: Record<WeaponKind, { def: SkillDef; tags: SkillTag[] }> = {
    melee: {
        tags: ["attack", "melee", "physical"],
        def: {
            id: "basic_melee",
            name: "Strike",
            description: "A plain blow at the enemy in front for {damage}% of your weapon's damage.",
            kind: "strike",
            damage: 0.9,
            mana: 0,
            cooldown: 0,
            castTime: 1,
            range: 1.5,
            arc: 70,
            icon: { obj: 1321 }, // Bronze scimitar
        },
    },
    bow: {
        tags: ["attack", "projectile", "physical"],
        def: {
            id: "basic_bow",
            name: "Quick Shot",
            description: "A plain arrow for {damage}% of your weapon's damage.",
            kind: "shoot",
            damage: 0.9,
            mana: 0,
            cooldown: 0,
            castTime: 1,
            range: 13,
            speed: 18,
            count: 1,
            icon: { obj: 841 }, // Shortbow
        },
    },
    staff: {
        tags: ["spell", "projectile", "fire"],
        def: {
            id: "basic_staff",
            name: "Fire Strike",
            description: "A small bolt of fire, free to cast, for {damage}% of your staff's damage.",
            kind: "shoot",
            damage: 0.8,
            mana: 0,
            cooldown: 0,
            castTime: 1,
            range: 12,
            speed: 12,
            count: 1,
            visual: SPOT.fireStrike,
            icon: { sprite: 21 }, // the sprite of Fire Strike
        },
    },
};

// ---- What each class starts with, and is given as they level ----

// The first of a level's gems goes on the left button, the next on the right
export const GEM_REWARDS: Record<ClassId, { level: number; gem: string }[]> = {
    warrior: [
        { level: 1, gem: "slash" },
        { level: 1, gem: "cleave" },
        { level: 2, gem: "brutality" },
        { level: 3, gem: "slam" },
        { level: 4, gem: "concussion" },
        { level: 6, gem: "warcry" },
        { level: 8, gem: "expanse" },
        { level: 10, gem: "leap_slam" },
    ],
    ranger: [
        { level: 1, gem: "shoot" },
        { level: 1, gem: "split" },
        { level: 2, gem: "piercing" },
        { level: 3, gem: "explosive" },
        { level: 4, gem: "swiftness" },
        { level: 6, gem: "rain" },
        { level: 8, gem: "shadow_step" },
        { level: 10, gem: "volley" },
    ],
    mage: [
        { level: 1, gem: "firebolt" },
        { level: 1, gem: "icenova" },
        { level: 2, gem: "concentrated_power" },
        { level: 3, gem: "firewave" },
        { level: 4, gem: "quickened_casting" },
        { level: 6, gem: "blink" },
        { level: 8, gem: "saradomin_strike" },
        { level: 10, gem: "static_charge" },
    ],
    paladin: [
        { level: 1, gem: "smite" },
        { level: 1, gem: "blessed_hammer" },
        { level: 2, gem: "brutality" },
        { level: 3, gem: "concussion" },
        { level: 4, gem: "sanctuary" },
        { level: 6, gem: "judgement" },
        { level: 8, gem: "static_charge" },
        { level: 10, gem: "runic_focus" },
    ],
    rogue: [
        { level: 1, gem: "flurry" },
        { level: 1, gem: "fan_of_knives" },
        { level: 2, gem: "swiftness" },
        { level: 3, gem: "bloodthirst" },
        { level: 4, gem: "puncture" },
        { level: 6, gem: "shadow_step" },
        { level: 8, gem: "precision" },
        { level: 10, gem: "haste" },
    ],
    necromancer: [
        { level: 1, gem: "shadow_bolt" },
        { level: 1, gem: "raise_skeleton" },
        { level: 2, gem: "concentrated_power" },
        { level: 3, gem: "grasp_of_the_dead" },
        { level: 4, gem: "piercing" },
        { level: 6, gem: "shadow_step" },
        { level: 8, gem: "persistence" },
        { level: 14, gem: "blood_barrage" },
    ],
};

// A class's own colours, its own first: drops lean towards them, and its first gear's sockets
// are of them
export const CLASS_COLORS: Record<ClassId, GemColor[]> = {
    warrior: ["red"],
    ranger: ["green"],
    mage: ["blue"],
    paladin: ["red", "blue"],
    rogue: ["green", "red"],
    necromancer: ["blue", "green"],
};

// A class's own colour, its first
export const CLASS_COLOR: Record<ClassId, GemColor> = Object.fromEntries(Object.entries(CLASS_COLORS).map(([cls, colors]) => [cls, colors[0]])) as Record<ClassId, GemColor>;

// Spells cast without a staff to channel them hit this much less hard
export const SPELL_WITHOUT_STAFF = 0.6;

// Every skill a gem can be, for the animations and spot animations to bake
export function allSkillDefs(): SkillDef[] {
    return [...GEMS.flatMap((g) => (g.skill ? [g.skill] : [])), ...Object.values(BASIC_ATTACK).map((b) => b.def)];
}
