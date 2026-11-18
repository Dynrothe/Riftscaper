// The six kinds of hero. What they can do comes from the gems socketed in what they wear
// (gems.ts) and the passive tree (passives.ts); a class is where it starts: its weapons, its
// life and mana, its attributes and its place on the tree. Three are of one attribute (the
// warrior's Strength, the ranger's Dexterity, the mage's Intelligence) and three of two, starting
// on the tree between them. Tuned with the balance bot (scripts/balance.ts).
import type { ClassId, WeaponKind } from "./items";
import { SEQ } from "./items";

export type Attribute = "str" | "dex" | "int";

export type ClassDef = {
    id: ClassId;
    name: string;
    // What they are, in a few words, and in a line or two
    role: string;
    blurb: string;
    // The weapon they fight with bare-handed, and every kind they can wield
    weapon: WeaponKind;
    weapons: WeaponKind[];
    shield: boolean;
    // At level 1, and more each level after; Strength and Intelligence add to them (hero.ts)
    life: [number, number];
    mana: [number, number];
    lifeRegen: number;
    manaRegen: number;
    // A share of the most mana back for every enemy an attack hits (up to HERO.manaOnHitPerTick
    // a tick): the classes that fight with weapons earn their skills' mana by fighting, as
    // Diablo's warriors build fury, while the casters live on a bigger pool and its regeneration
    manaOnHit: number;
    // Strength, Dexterity and Intelligence, before the tree and gear
    attributes: [number, number, number];
    // The attributes it's of, the first its own: its colour on the tree, and its gems' colours
    of: Attribute[];
    // What they set out with
    start: string[];
    // The skills it's known for, shown when choosing (each a gem it's given, gems.ts)
    signature: string[];
    // What it does as it steps forward when chosen, at the creation screen
    flourish: number;
    // The colour its name is shown in on the creation screen
    color: string;
};

// The skill bar's buttons: the mouse's two, then keys
export const SKILL_KEYS = ["LMB", "RMB", "Q", "E", "R", "F"];
export const SKILL_SLOTS = SKILL_KEYS.length;

export const CLASSES: Record<ClassId, ClassDef> = {
    warrior: {
        id: "warrior",
        name: "Warrior",
        role: "Strength · Melee · Plate",
        blurb: "Steel and plate. Wades into the pack, and comes out the other side.",
        weapon: "melee",
        weapons: ["melee"],
        shield: true,
        life: [55, 14],
        mana: [23, 4],
        lifeRegen: 1,
        manaRegen: 0.96,
        manaOnHit: 0.03,
        attributes: [30, 14, 14],
        of: ["str"],
        start: ["bronze_scimitar", "leather_body", "bronze_legs"],
        signature: ["slash", "cleave", "slam", "warcry"],
        flourish: SEQ.hack,
        color: "#e05a3a",
    },
    ranger: {
        id: "ranger",
        name: "Ranger",
        role: "Dexterity · Bow · Hide",
        blurb: "A bow and quick feet. Kills from afar, and is never where the blow lands.",
        weapon: "bow",
        weapons: ["bow"],
        shield: false,
        life: [53, 11],
        mana: [33, 6],
        lifeRegen: 0.8,
        manaRegen: 1.2,
        manaOnHit: 0.015,
        attributes: [14, 30, 14],
        of: ["dex"],
        start: ["shortbow", "leather_body", "leather_chaps"],
        signature: ["shoot", "split", "explosive", "rain"],
        flourish: SEQ.shoot,
        color: "#58c050",
    },
    mage: {
        id: "mage",
        name: "Mage",
        role: "Intelligence · Staff · Robes",
        blurb: "Fire and ice. Frail, but nothing stands for long in front of a staff.",
        weapon: "staff",
        weapons: ["staff"],
        shield: true,
        life: [45, 9],
        mana: [45, 9],
        lifeRegen: 0.6,
        manaRegen: 1.8,
        manaOnHit: 0,
        attributes: [14, 14, 30],
        of: ["int"],
        start: ["staff", "wizard_hat", "blue_wizard_robe", "skirt"],
        signature: ["firebolt", "icenova", "firewave", "blink"],
        flourish: SEQ.castWave,
        color: "#5a8cf0",
    },
    paladin: {
        id: "paladin",
        name: "Paladin",
        role: "Strength & Intelligence · Mace · Shield",
        blurb: "Saradomin's sworn. A mace in one hand and a shield in the other, and the sky answers every blow with lightning.",
        weapon: "melee",
        weapons: ["melee"],
        shield: true,
        life: [54, 12],
        mana: [34, 6],
        lifeRegen: 0.9,
        manaRegen: 1.2,
        manaOnHit: 0.03,
        attributes: [22, 14, 22],
        of: ["str", "int"],
        start: ["bronze_mace", "bronze_shield", "bronze_chainbody", "bronze_legs"],
        signature: ["smite", "blessed_hammer", "sanctuary", "judgement"],
        flourish: SEQ.pound,
        color: "#f0d060",
    },
    rogue: {
        id: "rogue",
        name: "Rogue",
        role: "Strength & Dexterity · Daggers & Bows",
        blurb: "Out of the Rogues' Den with a dagger in each sleeve. Quick blades up close, a bow when it must, and never there when you swing back.",
        weapon: "melee",
        weapons: ["melee", "bow"],
        shield: false,
        life: [57, 13],
        mana: [30, 5],
        lifeRegen: 0.8,
        manaRegen: 1.08,
        manaOnHit: 0.035,
        attributes: [22, 22, 14],
        of: ["dex", "str"],
        start: ["bronze_dagger", "leather_body", "leather_chaps", "leather_gloves"],
        signature: ["flurry", "fan_of_knives", "puncture", "shadow_step"],
        flourish: SEQ.puncture,
        color: "#c0c8d0",
    },
    necromancer: {
        id: "necromancer",
        name: "Necromancer",
        role: "Dexterity & Intelligence · Staff · Thralls",
        blurb: "What dies in the rifts doesn't stay down for long. Raises the dead to fight beside them, and holds the living where they stand.",
        weapon: "staff",
        weapons: ["staff"],
        shield: true,
        life: [47, 10],
        mana: [42, 8],
        lifeRegen: 0.7,
        manaRegen: 1.56,
        manaOnHit: 0,
        attributes: [14, 22, 22],
        of: ["int", "dex"],
        start: ["staff", "unholy_book", "zamorak_monk_top", "zamorak_monk_bottom"],
        signature: ["shadow_bolt", "raise_skeleton", "grasp_of_the_dead", "blood_barrage"],
        flourish: SEQ.castBurst,
        color: "#b070e0",
    },
};

// In the order saves have always checked them against; new classes go on the end
export const CLASS_IDS: ClassId[] = ["warrior", "ranger", "mage", "paladin", "rogue", "necromancer"];

// As they stand on the creation screen, left to right: Strength's, round to Intelligence's
export const LINEUP: ClassId[] = ["warrior", "paladin", "rogue", "ranger", "necromancer", "mage"];
