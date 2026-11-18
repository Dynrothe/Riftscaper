// The passive tree: a great wheel of nodes, each a little stronger in some way, that the hero
// spends a point on per level (and per rift's guardian slain the first time) to make their own.
// Each class starts on the inner ring, Strength's warriors at the lower left, Dexterity's rangers
// at the lower right, Intelligence's mages at the top, and the hybrids between: from there a path
// is taken outwards, along spokes and rings of attributes, into clusters that end in a notable,
// and at the rim, keystones that change the rules. Past the rim, a wing for each class's side:
// thirteen keystones more, about the game's own systems (thralls, burning, freezing, shock, buffs,
// crits, projectiles), and sockets for talismans across the whole of it. It's laid out once, from
// these tables, the same every time: a node's id is where it falls in the making, and saves keep
// those ids, so what's new is made after everything that was.
import { CLASSES } from "./classes";
import type { SkillTraits } from "./forge";
import type { SkillTag } from "./gems";
import type { ClassId, StatKey, StatLine, UniquePower, When } from "./items";

export type KeystoneId =
    | "zamoraksFury"
    | "ironSkin"
    | "steadyHand"
    | "acrobatics"
    | "pointBlank"
    | "mindOverMatter"
    | "bloodRite"
    | "painAttunement"
    | "vampiricPact"
    // The wings'
    | "arceuusCovenant"
    | "demonicOffering"
    | "inferno"
    | "iceBarrage"
    | "tempest"
    | "templeOath"
    | "vengeance"
    | "dharoksCurse"
    | "piety"
    | "graceful"
    | "dragonClaws"
    | "chinchompa"
    | "rigour"
    // The herblore way's, past the rim between Dexterity and Intelligence
    | "barbarianHerblore";

export const KEYSTONES: Record<KeystoneId, { name: string; lines: string[] }> = {
    zamoraksFury: { name: "Zamorak's Fury", lines: ["40% more damage", "You take 25% more damage"] },
    ironSkin: { name: "Iron Skin", lines: ["Your armour is doubled", "You can't evade attacks"] },
    steadyHand: { name: "Steady Hand", lines: ["Your hits can't be critical strikes", "30% more damage"] },
    acrobatics: { name: "Acrobatics", lines: ["+30% chance to evade attacks", "50% less armour"] },
    pointBlank: {
        name: "Point Blank",
        lines: ["Projectiles deal up to 30% more damage close to you", "and less the further they fly, down to 30% less"],
    },
    mindOverMatter: { name: "Mind over Matter", lines: ["30% of damage taken comes from your mana before your life"] },
    bloodRite: { name: "Blood Rite", lines: ["Your skills cost life instead of mana", "You have no mana"] },
    painAttunement: { name: "Pain Attunement", lines: ["30% more spell damage while on low life (half or less)"] },
    vampiricPact: { name: "Vampiric Pact", lines: ["Twice as much life leech, up to 16% of damage", "You have no life regeneration"] },
    arceuusCovenant: {
        name: "Arceuus Covenant",
        lines: ["You can have 2 more thralls of every kind at once", "Thralls deal 50% more damage", "Gravebound raises your kills twice as often, to stand four times as long", "Your own hits deal 50% less damage"],
    },
    demonicOffering: {
        name: "Demonic Offering",
        lines: ["Killing a magic or rare enemy or a guardian gives back 20% of your mana and 5% of your life", "Killing any other gives back 4% of your mana", "You have no mana regeneration"],
    },
    inferno: { name: "Inferno", lines: ["Your ignites stack: up to 3 burn on an enemy at once, each on its own", "You can't freeze or shock"] },
    iceBarrage: {
        name: "Ice Barrage",
        lines: ["A frozen or chilled enemy that dies shatters, hitting those within 2 tiles for 12% of its life", "You can't ignite or shock"],
    },
    tempest: { name: "Tempest", lines: ["Shocked enemies take 40% more damage, not 20%", "A shocked enemy that dies shocks those within 2.5 tiles", "You can't ignite or freeze"] },
    templeOath: {
        name: "Temple Knight's Oath",
        lines: ["Increases to melee damage apply to your spells, and increases to spell damage to your melee skills", "Your skills cost 25% more mana"],
    },
    vengeance: { name: "Vengeance", lines: ["When hit, strike the attacker back for half your armour, twice a second at most", "Your hits deal 20% less damage"] },
    dharoksCurse: { name: "Dharok's Curse", lines: ["1% more melee damage for each 1% of your life missing, up to 80% more", "You have no life regeneration"] },
    piety: { name: "Piety", lines: ["Your skills' buffs last twice as long and do 50% more", "Buff skills cost 50% more mana"] },
    graceful: { name: "Graceful", lines: ["You move at your full pace while using skills", "Your hits deal 20% less damage"] },
    dragonClaws: { name: "Dragon Claws", lines: ["Your critical strikes land again for half their damage, then twice more for a quarter", "Half the critical strike chance"] },
    chinchompa: {
        name: "Chinchompa",
        lines: ["Your projectiles burst where they first hit or stop, for 50% of their hit within 1.5 tiles", "They can't pierce, chain, split or return"],
    },
    rigour: { name: "Rigour", lines: ["Projectiles deal up to 40% more damage the further they've flown, the most at 8 tiles", "You move 10% slower"] },
    barbarianHerblore: {
        name: "Barbarian Herblore",
        lines: ["Your life potions recover no life", "Each dose you drink gives 15% more damage for 8 seconds, up to three at once"],
    },
};

// Barbarian Herblore's more damage a dose, how long it lasts, and how many at once
export const BARBARIAN_HERBLORE = { more: 0.15, seconds: 8, most: 3 };

// A socket holds a talisman (talismans.ts)
export type PassiveKind = "start" | "attribute" | "small" | "notable" | "mastery" | "keystone" | "socket";

// What a node is good for, by its colour on the tree
export type Tint = "life" | "mana" | "defence" | "damage" | "speed" | "crit" | "utility" | "str" | "dex" | "int" | "fire" | "cold" | "lightning" | "thrall" | "keystone";

// A ring a node sits on: links along it are drawn as arcs
export type Orbit = { x: number; y: number; r: number };

export type PassiveNode = {
    id: number;
    kind: PassiveKind;
    name: string;
    x: number;
    y: number;
    stats: StatLine[];
    keystone?: KeystoneId;
    // The class that starts here
    cls?: ClassId;
    tint: Tint;
    links: number[];
    orbit?: Orbit;
    // A forged gem's traits (forge.ts), on every skill of the kinds each suits (or only those with
    // the tag), as a unique's are: the best of each, the tree's or the gear's
    traits?: SkillTraits;
    traitTag?: SkillTag;
    // A power of its own, as a unique's (items.ts)
    power?: UniquePower;
    // In the wing of this class's side, past the rim (never enchanted on a ring)
    wing?: ClassId;
};

type ThemeId =
    | "life"
    | "mana"
    | "armour"
    | "evasion"
    | "melee"
    | "projectile"
    | "spell"
    | "area"
    | "elemental"
    | "physical"
    | "crit"
    | "attackSpeed"
    | "castSpeed"
    | "leech"
    | "speed"
    | "regen"
    | "efficiency"
    | "cooldown"
    | "fire"
    | "cold"
    | "lightning"
    | "stun"
    | "flask"
    | "potion"
    | "fortune"
    | "duration"
    // The wings' and the tastes'
    | "thrall"
    | "burn"
    | "frost"
    | "static"
    | "buffEffect"
    | "hybrid";

const s = (stat: StatKey, value: number, when?: When): StatLine => (when ? { stat, value, when } : { stat, value });

// A small node of each theme
const THEMES: Record<ThemeId, { name: string; tint: Tint; stats: StatLine[] }> = {
    life: { name: "Life", tint: "life", stats: [s("lifePct", 4)] },
    mana: { name: "Mana", tint: "mana", stats: [s("manaPct", 5)] },
    armour: { name: "Armour", tint: "defence", stats: [s("armourPct", 10)] },
    evasion: { name: "Evasion", tint: "defence", stats: [s("evade", 2)] },
    melee: { name: "Melee Damage", tint: "damage", stats: [s("meleeDamagePct", 8)] },
    projectile: { name: "Projectile Damage", tint: "damage", stats: [s("projectileDamagePct", 8)] },
    spell: { name: "Spell Damage", tint: "damage", stats: [s("spellDamagePct", 8)] },
    area: { name: "Area Damage", tint: "damage", stats: [s("areaDamagePct", 8)] },
    elemental: { name: "Elemental Damage", tint: "damage", stats: [s("elementalDamagePct", 8)] },
    physical: { name: "Physical Damage", tint: "damage", stats: [s("physicalDamagePct", 8)] },
    crit: { name: "Critical Strikes", tint: "crit", stats: [s("critChance", 0.5), s("critMulti", 5)] },
    attackSpeed: { name: "Attack Speed", tint: "speed", stats: [s("attackSpeedPct", 3)] },
    castSpeed: { name: "Cast Speed", tint: "speed", stats: [s("castSpeedPct", 3)] },
    leech: { name: "Life Leech", tint: "life", stats: [s("lifeLeech", 0.3)] },
    speed: { name: "Movement Speed", tint: "speed", stats: [s("moveSpeedPct", 2)] },
    regen: { name: "Life Regeneration", tint: "life", stats: [s("lifeRegenPct", 0.2)] },
    efficiency: { name: "Mana Efficiency", tint: "mana", stats: [s("manaCostPct", 4)] },
    cooldown: { name: "Cooldown Recovery", tint: "utility", stats: [s("cooldownPct", 5)] },
    fire: { name: "Fire", tint: "fire", stats: [s("elementalDamagePct", 6), s("igniteChance", 2)] },
    cold: { name: "Cold", tint: "cold", stats: [s("elementalDamagePct", 6), s("freezeChance", 1.5)] },
    lightning: { name: "Lightning", tint: "lightning", stats: [s("elementalDamagePct", 6), s("shockChance", 2)] },
    stun: { name: "Stunning Blows", tint: "damage", stats: [s("physicalDamagePct", 5), s("stunChance", 2)] },
    flask: { name: "Potions", tint: "utility", stats: [s("flaskPct", 6)] },
    potion: { name: "Herblore", tint: "utility", stats: [s("potionEffectPct", 6)] },
    fortune: { name: "Item Rarity", tint: "utility", stats: [s("rarity", 5)] },
    duration: { name: "Skill Duration", tint: "utility", stats: [s("durationPct", 5)] },
    thrall: { name: "Thrall Damage", tint: "thrall", stats: [s("thrallDamagePct", 6)] },
    burn: { name: "Burning", tint: "fire", stats: [s("burnDamagePct", 8)] },
    frost: { name: "Frost", tint: "cold", stats: [s("freezeLengthPct", 6), s("elementalDamagePct", 4)] },
    static: { name: "Static", tint: "lightning", stats: [s("shockLengthPct", 8), s("elementalDamagePct", 4)] },
    buffEffect: { name: "Buff Effect", tint: "utility", stats: [s("buffEffectPct", 5)] },
    hybrid: { name: "Melee and Spell Damage", tint: "damage", stats: [s("meleeDamagePct", 4), s("spellDamagePct", 4)] },
};

type Cluster = { theme: ThemeId; notable: string; stats: StatLine[]; traits?: SkillTraits; traitTag?: SkillTag; power?: UniquePower };

const c = (theme: ThemeId, notable: string, ...stats: StatLine[]): Cluster => ({ theme, notable, stats });
// A notable that does more than its numbers: a trait, a power
const x = (cluster: Cluster, more: Pick<Cluster, "traits" | "traitTag" | "power">): Cluster => ({ ...cluster, ...more });

// Between the inner ring and the middle one, at 15° + 30° k (0° east, counterclockwise)
const INNER: Cluster[] = [
    c("evasion", "Shadow's Veil", s("evade", 5), s("moveSpeedPct", 4)),
    c("efficiency", "Runic Thrift", s("manaCostPct", 10), s("manaRegen", 2)),
    c("spell", "Arcane Focus", s("spellDamagePct", 16), s("castSpeedPct", 10, "book")),
    c("mana", "Wellspring", s("manaPct", 12), s("manaRegen", 2)),
    c("regen", "Troll's Blood", s("lifeRegenPct", 0.8), s("lifePct", 5)),
    c("fire", "Kindled Soul", s("elementalDamagePct", 15), s("igniteChance", 6)),
    c("life", "Bandos's Vigour", s("lifePct", 10), s("lifeRegen", 2)),
    x(c("melee", "Heavy Blows", s("meleeDamagePct", 15), s("stunChance", 4)), { traits: { numbing: 0.15 } }),
    c("armour", "Iron Hide", s("armourPct", 25), s("armourPct", 25, "shield"), s("lessDamageTaken", 5, "shield")),
    c("attackSpeed", "Swift Hands", s("attackSpeedPct", 6), s("attackSpeedPct", 6, "blade"), s("moveSpeedPct", 2)),
    c("projectile", "Eagle Eye", s("projectileDamagePct", 20), s("critChance", 1)),
    c("speed", "Fleet of Foot", s("moveSpeedPct", 6), s("evade", 3)),
];

// Between the middle ring and the outer, at 30° k
const OUTER: Cluster[] = [
    x(c("crit", "Deadly Aim", s("critChance", 2), s("critMulti", 10)), { traits: { surging: 0.5 } }),
    c("cold", "Frostbite", s("elementalDamagePct", 15), s("freezeChance", 5)),
    c("castSpeed", "Quickened Runes", s("castSpeedPct", 10), s("spellDamagePct", 8)),
    c("spell", "Elder Rune", s("spellDamagePct", 25), s("manaPct", 6)),
    x(c("lightning", "Storm Caller", s("elementalDamagePct", 10), s("shockChance", 6)), { traits: { thunder: 0.1 } }),
    x(c("leech", "Blood Drinker", s("lifeLeech", 1.2)), { traits: { bloodthirst: 0.12 } }),
    x(c("area", "Earthshaker", s("areaDamagePct", 10), s("areaPct", 10)), { traits: { vortex: 0.6 } }),
    c("physical", "Brute Strength", s("physicalDamagePct", 20), s("str", 20)),
    x(c("stun", "Skull Cracker", s("stunChance", 8)), { traits: { volatile: 0.25 } }),
    c("flask", "Survivalist", s("flaskPct", 20), s("lifeRegenPct", 0.5)),
    c("cooldown", "Second Wind", s("cooldownPct", 15), s("durationPct", 10)),
    x(c("projectile", "Volley Master", s("projectileDamagePct", 15)), { traits: { cascade: 2 } }),
];

// Past the outer ring, at 15° + 30° k
const OUTERMOST: Cluster[] = [
    c("fortune", "Treasure Hunter", s("rarity", 20), s("moveSpeedPct", 3)),
    x(c("duration", "Lingering Magic", s("durationPct", 15), s("cooldownPct", 5)), { traits: { grave: 0.2 } }),
    c("elemental", "Elemental Mastery", s("elementalDamagePct", 25), s("castSpeedPct", 3)),
    c("mana", "Astral Reservoir", s("manaPct", 15), s("manaOnKill", 4)),
    c("crit", "Wizard's Insight", s("critChance", 2), s("spellDamagePct", 10)),
    c("life", "Undying", s("lifePct", 10), s("lifeOnKill", 4)),
    c("armour", "Juggernaut's Plate", s("armourPct", 30), s("lifePct", 4)),
    c("melee", "Executioner's Edge", s("meleeDamagePct", 20), s("critMulti", 15), s("areaPct", 15, "battleaxe")),
    c("life", "Warrior's Heart", s("lifePct", 12), s("lifeRegen", 3)),
    c("crit", "Lethal Precision", s("critChance", 2), s("critMulti", 25)),
    c("evasion", "Ghost Step", s("evade", 6), s("moveSpeedPct", 3)),
    c("attackSpeed", "Rapid Fire", s("attackSpeedPct", 7), s("attackSpeedPct", 7, "shortbow"), s("projectileDamagePct", 5)),
];

// Past the far ring, at 30° k: the main tree's last clusters, the strongest notables
const FAR: Cluster[] = [
    c("projectile", "Hawk's Gaze", s("projectileDamagePct", 25), s("critChance", 1.5)),
    c("lightning", "Armadyl's Tempest", s("elementalDamagePct", 20), s("shockChance", 8)),
    c("castSpeed", "Swift Incantation", s("castSpeedPct", 12), s("manaRegen", 2)),
    x(c("spell", "Ancient Magicks", s("spellDamagePct", 20), s("critChance", 1)), { traits: { echo: 0.25 }, traitTag: "spell" }),
    x(c("cold", "Winter's Grasp", s("elementalDamagePct", 15), s("freezeChance", 8)), { traits: { numbing: 0.2 } }),
    x(c("fire", "Infernal Heart", s("elementalDamagePct", 15), s("igniteChance", 8)), { traits: { smoulder: 0.25 } }),
    c("life", "Barbarian Fortitude", s("lifePct", 14), s("lifeRegen", 4)),
    c("melee", "Dharok's Rage", s("meleeDamagePct", 30), s("lifeLeech", 0.6)),
    x(c("armour", "Torag's Bulwark", s("armourPct", 30), s("lifePct", 5)), { traits: { warding: 0.02 } }),
    x(c("attackSpeed", "Verac's Flail", s("attackSpeedPct", 8)), { traits: { frenzy: 0.03 } }),
    c("evasion", "Karil's Agility", s("evade", 8), s("moveSpeedPct", 4)),
    c("projectile", "Ranger's Cunning", s("projectileDamagePct", 20), s("attackSpeedPct", 6)),
];

// At the rim, at 15° + 30° k: a keystone, or a mastery where two attributes meet
type Rim = { theme: ThemeId; keystone?: KeystoneId; mastery?: { name: string; stats: StatLine[] } };

const RIM: Rim[] = [
    { theme: "projectile", keystone: "pointBlank" },
    { theme: "mana", keystone: "mindOverMatter" },
    { theme: "spell", mastery: { name: "Runic Mastery", stats: [s("spellDamagePct", 25), s("castSpeedPct", 10), s("manaPct", 10)] } },
    { theme: "life", keystone: "bloodRite" },
    { theme: "spell", keystone: "painAttunement" },
    { theme: "leech", keystone: "vampiricPact" },
    { theme: "melee", mastery: { name: "Warlord's Mastery", stats: [s("meleeDamagePct", 25), s("lifePct", 10), s("armourPct", 30)] } },
    { theme: "physical", keystone: "zamoraksFury" },
    { theme: "armour", keystone: "ironSkin" },
    { theme: "physical", keystone: "steadyHand" },
    { theme: "projectile", mastery: { name: "Fletcher's Mastery", stats: [s("projectileDamagePct", 25), s("attackSpeedPct", 8), s("critChance", 1)] } },
    { theme: "evasion", keystone: "acrobatics" },
];

// Each class's start, on the inner ring, and the little chain from it towards the middle
const STARTS: { cls: ClassId; angle: number; core: [ThemeId, ThemeId]; notable: string; stats: StatLine[] }[] = [
    { cls: "mage", angle: 90, core: ["spell", "mana"], notable: "Saradomin's Chosen", stats: [s("spellDamagePct", 10), s("manaPct", 8)] },
    { cls: "warrior", angle: 210, core: ["life", "melee"], notable: "Bandos's Chosen", stats: [s("meleeDamagePct", 10), s("lifePct", 6)] },
    { cls: "ranger", angle: 330, core: ["projectile", "evasion"], notable: "Armadyl's Chosen", stats: [s("projectileDamagePct", 10), s("evade", 3)] },
];

// The hybrids' starts, just inside the inner ring between the two attributes they're of: the
// paladin's between Strength and Intelligence, the rogue's between Strength and Dexterity, the
// necromancer's between Dexterity and Intelligence. Each comes off the inner ring's node there,
// with a node and a notable of its own inside it.
const HYBRID_STARTS: { cls: ClassId; angle: number; core: ThemeId; notable: string; stats: StatLine[] }[] = [
    { cls: "paladin", angle: 150, core: "armour", notable: "Saradomin's Shield", stats: [s("meleeDamagePct", 8), s("armourPct", 15), s("manaPct", 5)] },
    { cls: "rogue", angle: 270, core: "crit", notable: "Rogues' Cunning", stats: [s("critChance", 1.5), s("attackSpeedPct", 6), s("evade", 2)] },
    { cls: "necromancer", angle: 30, core: "duration", notable: "Zamorak's Thrall", stats: [s("durationPct", 15), s("spellDamagePct", 8), s("evade", 2)] },
];

// A taste of each class's wing near its start: two nodes and a notable off the inner ring, inside
// it, so a necromancer can be a thrall master at level 5 and the wing finish the job at 25
const TASTES: { cls: ClassId; angle: number; cluster: Cluster }[] = [
    { cls: "necromancer", angle: 30, cluster: c("thrall", "Bone Rites", s("thrallDamagePct", 12), s("durationPct", 8)) },
    { cls: "mage", angle: 90, cluster: c("elemental", "Rune Mysteries", s("burnDamagePct", 10), s("freezeLengthPct", 10), s("shockLengthPct", 10)) },
    { cls: "paladin", angle: 150, cluster: c("hybrid", "Squire's Oath", s("meleeDamagePct", 6), s("spellDamagePct", 6)) },
    { cls: "warrior", angle: 210, cluster: c("buffEffect", "Battle Cry", s("buffEffectPct", 10), s("meleeDamagePct", 10, "buffed")) },
    { cls: "rogue", angle: 270, cluster: c("speed", "Light Feet", s("damagePct", 15, "movedRecently"), s("moveSpeedPct", 4, "killedRecently")) },
    { cls: "ranger", angle: 330, cluster: c("projectile", "Steady Aim", s("projectileDamagePct", 15, "fullLife"), s("critChance", 1)) },
];

// A wing of the tree for each class's side, out past the rim from the outward node of the far
// cluster at the class's own angle: a way out to a hub notable with a talisman socket beside it,
// and from the hub two ways (three for the mage's), each of small nodes, two notables and a
// keystone at its end. Every class can walk to every wing, as to the rest of the tree.
type WingWay = { themes: [ThemeId, ThemeId]; notables: [Cluster, Cluster]; keystone: KeystoneId };
type Wing = { cls: ClassId; angle: number; theme: ThemeId; hub: Cluster; ways: WingWay[] };

const WINGS: Wing[] = [
    {
        cls: "necromancer",
        angle: 30,
        theme: "thrall",
        hub: c("thrall", "Arceuus Library", s("thrallDamagePct", 10), s("durationPct", 10)),
        ways: [
            {
                themes: ["thrall", "duration"],
                notables: [
                    c("thrall", "Greater Thralls", s("thrallDamagePct", 20), s("thrallSizePct", 15), s("thrallSpeedPct", 10)),
                    x(c("thrall", "Death Charge", s("thrallDamagePct", 10)), { power: "deathCharge" }),
                ],
                keystone: "arceuusCovenant",
            },
            {
                themes: ["mana", "evasion"],
                notables: [c("thrall", "Ward of Arceuus", s("lessDamageTaken", 3, "perThrall")), c("evasion", "Shadow Veil", s("evade", 5), s("evade", 5, "killedRecently"))],
                keystone: "demonicOffering",
            },
        ],
    },
    {
        cls: "mage",
        angle: 90,
        theme: "elemental",
        hub: c("elemental", "Rune Essence", s("elementalDamagePct", 10), s("castSpeedPct", 5)),
        ways: [
            {
                themes: ["burn", "fire"],
                notables: [c("fire", "Flames of Zamorak", s("burnDamagePct", 25), s("burnLengthPct", 33)), x(c("fire", "Pyre", s("burnDamagePct", 10)), { power: "pyre" })],
                keystone: "inferno",
            },
            {
                themes: ["frost", "cold"],
                notables: [x(c("cold", "Ice Blitz", s("freezeLengthPct", 20)), { traits: { numbing: 0.15 } }), c("cold", "Winter's Bite", s("damagePct", 25, "vsChilled"))],
                keystone: "iceBarrage",
            },
            {
                themes: ["static", "lightning"],
                notables: [c("lightning", "Claws of Guthix", s("shockLengthPct", 50)), c("lightning", "Chain Lightning", s("extraChain", 1), s("elementalDamagePct", 10))],
                keystone: "tempest",
            },
        ],
    },
    {
        cls: "paladin",
        angle: 150,
        theme: "hybrid",
        hub: c("hybrid", "Initiate's Vow", s("meleeDamagePct", 6), s("spellDamagePct", 6), s("str", 10), s("int", 10)),
        ways: [
            {
                themes: ["hybrid", "mana"],
                notables: [c("spell", "Proselyte's Discipline", s("spellPerStr", 1)), c("melee", "Saradomin's Light", s("meleePerInt", 1))],
                keystone: "templeOath",
            },
            {
                themes: ["armour", "life"],
                notables: [
                    c("armour", "Shield of Arrav", s("armourPct", 40, "shield"), s("lessDamageTaken", 6, "shield")),
                    x(c("life", "Redemption", s("lifePct", 6)), { power: "redemption" }),
                ],
                keystone: "vengeance",
            },
        ],
    },
    {
        cls: "warrior",
        angle: 210,
        theme: "melee",
        hub: c("melee", "Bandos's Will", s("meleeDamagePct", 10), s("lifePct", 5)),
        ways: [
            {
                themes: ["melee", "leech"],
                notables: [c("melee", "Berserker Necklace", s("meleeDamagePct", 25, "lowLife")), x(c("leech", "Guthan's Warspear", s("lifeLeech", 0.5)), { power: "guthans" })],
                keystone: "dharoksCurse",
            },
            {
                themes: ["buffEffect", "armour"],
                notables: [c("melee", "Ultimate Strength", s("meleeDamagePct", 15, "buffed")), c("armour", "Steel Skin", s("armourPct", 30, "buffed"))],
                keystone: "piety",
            },
        ],
    },
    {
        cls: "rogue",
        angle: 270,
        theme: "speed",
        hub: c("attackSpeed", "Rogue's Trick", s("attackSpeedPct", 6), s("moveSpeedPct", 3)),
        ways: [
            {
                themes: ["speed", "evasion"],
                notables: [c("speed", "Agility Shortcut", s("damagePct", 30, "movedRecently")), c("speed", "Stamina", s("moveSpeedPct", 10, "killedRecently"))],
                keystone: "graceful",
            },
            {
                themes: ["crit", "attackSpeed"],
                notables: [c("crit", "Backstab", s("critMulti", 40, "vsNotAttacking")), c("crit", "Shadow Strike", s("critMulti", 30, "vsHindered"))],
                keystone: "dragonClaws",
            },
        ],
    },
    {
        cls: "ranger",
        angle: 330,
        theme: "projectile",
        hub: c("projectile", "Guild Marksman", s("projectileDamagePct", 10), s("critChance", 1)),
        ways: [
            {
                themes: ["area", "projectile"],
                notables: [c("area", "Black Chinchompa", s("projectileAreaPct", 25)), c("area", "Explosive Shot", s("burstDamagePct", 15))],
                keystone: "chinchompa",
            },
            {
                themes: ["projectile", "crit"],
                notables: [c("projectile", "Sharp Eye", s("extraPierce", 1)), c("projectile", "Hawk Eye", s("projectileDamagePct", 20, "fullLife"))],
                keystone: "rigour",
            },
        ],
    },
];

// The herblore way's notables: its hub's, and the two either side of the way on to the keystone
const HERBLORE: { hub: Cluster; sides: [Cluster, Cluster] } = {
    hub: c("potion", "Herbalist's Satchel", s("potionFillPct", 20), s("potionEffectPct", 10)),
    sides: [c("potion", "Rare Herbs", s("potionRareDose", 1), s("potionFillPct", 10)), c("flask", "Sanfew's Secret", s("flaskPct", 25), s("potionEffectPct", 15))],
};

// The rings' radii, in the tree's own units
const R_INNER = 320;
const R_MIDDLE = 720;
const R_OUTER = 1120;
const R_FAR = 1560;
// A wing's hub, and how far apart its ways' nodes are, outwards
const R_HUB = 2170;
const WING_STEP = 70;

type Attr = "str" | "dex" | "int";

// The attributes of each 60° sector, from 0°: Dexterity and Intelligence, Intelligence,
// Intelligence and Strength, Strength, Strength and Dexterity, Dexterity
const SECTOR_ATTRS: Attr[][] = [["dex", "int"], ["int"], ["int", "str"], ["str"], ["str", "dex"], ["dex"]];
const ATTR_NAMES: Record<Attr, string> = { str: "Strength", dex: "Dexterity", int: "Intelligence" };

export const SOCKET_NAME = "Talisman Socket";

function build(): PassiveNode[] {
    const nodes: PassiveNode[] = [];
    const polar = (r: number, deg: number) => {
        const a = (deg * Math.PI) / 180;
        return { x: Math.round(r * Math.cos(a) * 10) / 10, y: Math.round(-r * Math.sin(a) * 10) / 10 };
    };
    const add = (kind: PassiveKind, name: string, at: { x: number; y: number }, stats: StatLine[], tint: Tint, more: Partial<PassiveNode> = {}): number => {
        const id = nodes.length;
        nodes.push({ id, kind, name, x: at.x, y: at.y, stats, tint, links: [], ...more });
        return id;
    };
    const link = (a: number, b: number) => {
        if (a !== b && !nodes[a].links.includes(b)) {
            nodes[a].links.push(b);
            nodes[b].links.push(a);
        }
    };
    const small = (theme: ThemeId, at: { x: number; y: number }, orbit?: Orbit, wing?: ClassId) => {
        const t = THEMES[theme];
        return add("small", t.name, at, t.stats, t.tint, wing ? { orbit, wing } : { orbit });
    };
    let attrTurn = 0;
    const attribute = (deg: number, at: { x: number; y: number }, orbit?: Orbit) => {
        const attrs = SECTOR_ATTRS[Math.floor((((deg % 360) + 360) % 360) / 60)];
        const attr = attrs[attrTurn++ % attrs.length];
        return add("attribute", ATTR_NAMES[attr], at, [s(attr, 10)], attr, { orbit });
    };
    const notable = (cluster: Cluster, at: { x: number; y: number }, wing?: ClassId) => {
        const more: Partial<PassiveNode> = {};
        if (cluster.traits) more.traits = cluster.traits;
        if (cluster.traitTag) more.traitTag = cluster.traitTag;
        if (cluster.power) more.power = cluster.power;
        if (wing) more.wing = wing;
        return add("notable", cluster.notable, at, cluster.stats, THEMES[cluster.theme].tint, more);
    };
    const keystone = (id: KeystoneId, at: { x: number; y: number }, wing?: ClassId) => add("keystone", KEYSTONES[id].name, at, [], "keystone", wing ? { keystone: id, wing } : { keystone: id });
    const socket = (at: { x: number; y: number }, wing?: ClassId) => add("socket", SOCKET_NAME, at, [], "utility", wing ? { wing } : {});
    // A wheel of small nodes round a notable: node 0 points away from the tree's middle, and the
    // notable's reached from it. Returns the wheel's nodes, in order round it.
    const wheel = (cluster: Cluster, r: number, deg: number, count: number, size: number): number[] => {
        const centre = polar(r, deg);
        const orbit: Orbit = { x: centre.x, y: centre.y, r: size };
        const ring: number[] = [];
        for (let j = 0; j < count; j++) {
            const a = ((deg + (360 / count) * j) * Math.PI) / 180;
            const at = { x: Math.round((centre.x + size * Math.cos(a)) * 10) / 10, y: Math.round((centre.y - size * Math.sin(a)) * 10) / 10 };
            ring.push(small(cluster.theme, at, orbit));
        }
        ring.forEach((id, j) => link(id, ring[(j + 1) % count]));
        link(notable(cluster, centre), ring[0]);
        return ring;
    };

    // The inner ring, every 15°, with each class's start on it
    const innerOrbit: Orbit = { x: 0, y: 0, r: R_INNER };
    const inner: number[] = [];
    for (let j = 0; j < 24; j++) {
        const deg = j * 15;
        const start = STARTS.find((st) => st.angle === deg);
        if (start) {
            inner.push(add("start", CLASSES[start.cls].name, polar(R_INNER, deg), [], CLASSES[start.cls].of[0], { cls: start.cls, orbit: innerOrbit }));
        } else {
            inner.push(attribute(deg, polar(R_INNER, deg), innerOrbit));
        }
    }
    inner.forEach((id, j) => link(id, inner[(j + 1) % inner.length]));
    // From each start, a short way in towards the middle
    for (const st of STARTS) {
        const from = inner[st.angle / 15];
        const a = small(st.core[0], polar(245, st.angle));
        const b = small(st.core[1], polar(175, st.angle));
        const n = add("notable", st.notable, polar(100, st.angle), st.stats, THEMES[st.core[0]].tint);
        link(from, a);
        link(a, b);
        link(b, n);
    }

    // The middle ring, every 7.5°: attributes on the 15°s, small nodes between of the nearest
    // outer cluster's kind
    const middleOrbit: Orbit = { x: 0, y: 0, r: R_MIDDLE };
    const outerOrbit: Orbit = { x: 0, y: 0, r: R_OUTER };
    const ring = (radius: number, orbit: Orbit, clusters = OUTER): number[] => {
        const ids: number[] = [];
        for (let j = 0; j < 48; j++) {
            const deg = j * 7.5;
            if (j % 2 === 0) {
                ids.push(attribute(deg, polar(radius, deg), orbit));
            } else {
                const k = Math.round(deg / 30) % 12;
                ids.push(small(clusters[k].theme, polar(radius, deg), orbit));
            }
        }
        ids.forEach((id, j) => link(id, ids[(j + 1) % ids.length]));
        return ids;
    };
    const middle = ring(R_MIDDLE, middleOrbit);
    const outer = ring(R_OUTER, outerOrbit);

    // Spokes from the inner ring to the middle, at 30° k: an attribute, a small node of the
    // inner cluster beside it, an attribute
    const innerSpokes: number[] = [];
    for (let k = 0; k < 12; k++) {
        const deg = k * 30;
        const a = attribute(deg, polar(420, deg));
        const b = small(INNER[k].theme, polar(520, deg));
        const d = attribute(deg, polar(620, deg));
        link(inner[k * 2], a);
        link(a, b);
        link(b, d);
        link(d, middle[k * 4]);
        innerSpokes.push(b);
    }
    // And from the middle ring to the outer, at 15° + 30° k
    const outerSpokes: number[] = [];
    for (let k = 0; k < 12; k++) {
        const deg = 15 + k * 30;
        const a = attribute(deg, polar(820, deg));
        const b = small(OUTER[(k + 1) % 12].theme, polar(920, deg));
        const d = attribute(deg, polar(1020, deg));
        link(middle[2 + k * 4], a);
        link(a, b);
        link(b, d);
        link(d, outer[2 + k * 4]);
        outerSpokes.push(b);
    }

    // The inner clusters, each between two spokes and reached from both
    INNER.forEach((cluster, k) => {
        const w = wheel(cluster, 520, 15 + k * 30, 5, 70);
        link(w[4], innerSpokes[k]);
        link(w[1], innerSpokes[(k + 1) % 12]);
    });
    // The outer clusters: from the spokes either side, and from the middle ring below
    OUTER.forEach((cluster, k) => {
        const w = wheel(cluster, 920, k * 30, 6, 105);
        link(w[2], outerSpokes[k]);
        link(w[4], outerSpokes[(k + 11) % 12]);
        link(w[3], middle[k * 4]);
    });
    // Past the outer ring: a way out to each outermost cluster, and on through it to the far ring
    const farOrbit: Orbit = { x: 0, y: 0, r: R_FAR };
    const far = ring(R_FAR, farOrbit, FAR);
    OUTERMOST.forEach((cluster, k) => {
        const deg = 15 + k * 30;
        const way = attribute(deg, polar(1215, deg));
        link(outer[2 + k * 4], way);
        const w = wheel(cluster, 1320, deg, 5, 80);
        link(way, w[2]);
        link(way, w[3]);
        link(w[0], far[2 + k * 4]);
    });
    // Spokes from the outer ring to the far one, at 30° k
    RIM.forEach((rim, k) => {
        const deg = k * 30;
        const a = small(rim.theme, polar(1240, deg));
        const b = small(rim.theme, polar(1400, deg));
        link(outer[k * 4], a);
        link(a, b);
        link(b, far[k * 4]);
    });
    // The far clusters, each reached from the far ring below it and either side
    const farWheels: number[][] = [];
    FAR.forEach((cluster, k) => {
        const w = wheel(cluster, 1760, k * 30, 6, 100);
        link(w[3], far[k * 4]);
        link(w[2], far[k * 4 + 1]);
        link(w[4], far[(k * 4 + 47) % 48]);
        farWheels.push(w);
    });
    // And at the very rim, between them, a keystone or a mastery at the end of a short way out
    RIM.forEach((rim, k) => {
        const deg = 15 + k * 30;
        const a = small(rim.theme, polar(1690, deg));
        const b = small(rim.theme, polar(1820, deg));
        let end: number;
        if (rim.keystone) {
            end = keystone(rim.keystone, polar(1960, deg));
        } else {
            end = add("mastery", rim.mastery!.name, polar(1960, deg), rim.mastery!.stats, THEMES[rim.theme].tint);
        }
        link(far[2 + k * 4], a);
        link(a, b);
        link(b, end);
    });
    // The hybrids' starts, so every node made before them keeps its id
    for (const st of HYBRID_STARTS) {
        const start = add("start", CLASSES[st.cls].name, polar(235, st.angle), [], CLASSES[st.cls].of[0], { cls: st.cls });
        const a = small(st.core, polar(165, st.angle));
        const n = add("notable", st.notable, polar(95, st.angle), st.stats, THEMES[st.core].tint);
        link(inner[st.angle / 15], start);
        link(start, a);
        link(a, n);
    }

    // ---- What came after (docs/design.md, the passive tree): made last, so nothing before moves ----

    // The tastes, inside the inner ring: straight in from its node halfway to the next class's
    // start, where the middle has room, clear of the classes' own notables
    for (const t of TASTES) {
        const from = inner[((t.angle + 30) / 15) % 24];
        const a = small(t.cluster.theme, polar(268, t.angle + 30));
        const b = small(t.cluster.theme, polar(216, t.angle + 30));
        const n = notable(t.cluster, polar(160, t.angle + 30));
        link(from, a);
        link(a, b);
        link(b, n);
    }
    // A talisman socket a sector, just past the outer ring where two of its clusters meet
    for (let k = 0; k < 12; k++) {
        link(outer[k * 4 + 1], socket(polar(1200, k * 30 + 7.5)));
    }
    // The wings: out from the far cluster's node that points away from the middle
    for (const wing of WINGS) {
        const deg = wing.angle;
        const from = farWheels[deg / 30][0];
        const a = small(wing.theme, polar(1960, deg), undefined, wing.cls);
        const b = small(wing.theme, polar(2060, deg), undefined, wing.cls);
        const hub = notable(wing.hub, polar(R_HUB, deg), wing.cls);
        link(from, a);
        link(a, b);
        link(b, hub);
        link(hub, socket(polar(R_HUB + 20, deg - 5.5), wing.cls));
        // The ways fan out from the hub, wider for three
        const spread = wing.ways.length === 3 ? 15 : 10;
        wing.ways.forEach((way, i) => {
            const side = wing.ways.length === 3 ? i - 1 : i === 0 ? -1 : 1;
            let prev = hub;
            for (let j = 0; j < 8; j++) {
                const at = polar(R_HUB + (j + 1) * WING_STEP, deg + side * (2 + ((spread - 2) * j) / 7));
                const id =
                    j === 2 || j === 5
                        ? notable(way.notables[j === 2 ? 0 : 1], at, wing.cls)
                        : j === 7
                          ? keystone(way.keystone, at, wing.cls)
                          : small(j < 2 || j === 6 ? way.themes[0] : way.themes[1], at, undefined, wing.cls);
                link(prev, id);
                prev = id;
            }
        });
    }
    // The herblore way: out past the rim at 0°, between Dexterity and Intelligence where no wing
    // goes, from the far cluster's outward node: to a notable, with a notable either side of it
    // and Barbarian Herblore at its end
    {
        const a = small("flask", polar(1960, 0));
        const b = small("potion", polar(2060, 0));
        const hub = notable(HERBLORE.hub, polar(2170, 0));
        link(farWheels[0][0], a);
        link(a, b);
        link(b, hub);
        HERBLORE.sides.forEach((cluster, i) => {
            const side = i === 0 ? 1 : -1;
            const near = small(cluster.theme, polar(2250, 4 * side));
            link(hub, near);
            link(near, notable(cluster, polar(2330, 7 * side)));
        });
        const c1 = small("potion", polar(2270, 0));
        const c2 = small("potion", polar(2370, 0));
        link(hub, c1);
        link(c1, c2);
        link(c2, keystone("barbarianHerblore", polar(2480, 0)));
    }
    return nodes;
}

export const PASSIVES: PassiveNode[] = build();

export const START_NODE: Record<ClassId, number> = Object.fromEntries(PASSIVES.filter((n) => n.cls).map((n) => [n.cls!, n.id])) as Record<ClassId, number>;

// Every link once, the lower id first
export const PASSIVE_LINKS: [number, number][] = PASSIVES.flatMap((n) => n.links.filter((m) => m > n.id).map((m): [number, number] => [n.id, m]));

// How far the tree reaches from its middle, for the view
export const TREE_RADIUS = 2800;

// The notables an item can be enchanted with at Aubury's (enchant.ts): the main tree's, not a
// wing's, and not a class's own few inside its start
export const ENCHANTABLE: number[] = PASSIVES.filter((n) => n.kind === "notable" && !n.wing && Math.hypot(n.x, n.y) > 200).map((n) => n.id);
