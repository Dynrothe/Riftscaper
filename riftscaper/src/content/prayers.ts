// The prayer tab: OSRS's prayers as Diablo II's auras and Path of Exile's, each reserving a share of
// the hero's most mana while it's on (hero.ts heroStats). One protection and one other at once, as
// OSRS's own overheads and boosts go together. Each comes at the level OSRS's needs, now the levels
// go to 99. Piety, Rigour and Redemption are the passive tree's already, so the tab leaves them
// out. The sprites are the prayer book's (sprite-info.ts, looked at in the game), lit and dim; the
// sounds are the OSRS Wiki's list of sound ids.
import { SOUND, SPOT, Visual } from "./visuals";

export type PrayerId =
    | "rapidHeal"
    | "steelSkin"
    | "ultimateStrength"
    | "incredibleReflexes"
    | "protectMagic"
    | "protectMissiles"
    | "protectMelee"
    | "eagleEye"
    | "mysticMight"
    | "retribution"
    | "preserve"
    | "chivalry"
    | "augury";

// What a protection prayer keeps off: a blow, a shot (an arrow, a ring), or a spell
export type HitKind = "melee" | "missile" | "magic";

export type PrayerDef = {
    id: PrayerId;
    name: string;
    text: string;
    // The hero's level it comes at: OSRS's Prayer level for it
    level: number;
    // The share of the most mana it keeps while it's on
    reserve: number;
    protect?: HitKind;
    // More damage for skills with the tag, as shares
    more?: Partial<Record<"melee" | "projectile" | "spell", number>>;
    // More armour, attack speed; life and mana back a second, as shares of the most
    armour?: number;
    speed?: number;
    lifeRegen?: number;
    manaRegen?: number;
    // Buffs and potions last this much longer
    preserve?: number;
    retribution?: boolean;
    // The prayer book's icon, lit and dim, and what it sounds as it's said
    sprite: number;
    dim: number;
    sound: number;
};

export const PRAYERS: Record<PrayerId, PrayerDef> = {
    rapidHeal: { id: "rapidHeal", name: "Rapid Heal", text: "1.5% of your life back a second", level: 22, reserve: 0.15, lifeRegen: 0.015, sprite: 122, dim: 142, sound: 2678 },
    steelSkin: { id: "steelSkin", name: "Steel Skin", text: "40% more armour", level: 28, reserve: 0.25, armour: 0.4, sprite: 124, dim: 144, sound: 2687 },
    ultimateStrength: { id: "ultimateStrength", name: "Ultimate Strength", text: "20% more melee damage", level: 31, reserve: 0.25, more: { melee: 0.2 }, sprite: 125, dim: 145, sound: 2691 },
    incredibleReflexes: { id: "incredibleReflexes", name: "Incredible Reflexes", text: "15% more attack and cast speed", level: 34, reserve: 0.25, speed: 0.15, sprite: 126, dim: 146, sound: 2667 },
    protectMagic: { id: "protectMagic", name: "Protect from Magic", text: "20% less damage from spells", level: 37, reserve: 0.2, protect: "magic", sprite: 127, dim: 147, sound: 2675 },
    protectMissiles: { id: "protectMissiles", name: "Protect from Missiles", text: "20% less damage from arrows and the thrown", level: 40, reserve: 0.2, protect: "missile", sprite: 128, dim: 148, sound: 2677 },
    protectMelee: { id: "protectMelee", name: "Protect from Melee", text: "20% less damage from blows", level: 43, reserve: 0.2, protect: "melee", sprite: 129, dim: 149, sound: 2676 },
    eagleEye: { id: "eagleEye", name: "Eagle Eye", text: "20% more projectile damage", level: 44, reserve: 0.25, more: { projectile: 0.2 }, sprite: 504, dim: 508, sound: 2665 },
    mysticMight: { id: "mysticMight", name: "Mystic Might", text: "20% more spell damage", level: 45, reserve: 0.25, more: { spell: 0.2 }, sprite: 505, dim: 509, sound: 2669 },
    retribution: {
        id: "retribution",
        name: "Retribution",
        text: "Once a minute, a hit that would kill you leaves you on 1 life and blasts everything round you",
        level: 46,
        reserve: 0.15,
        retribution: true,
        sprite: 131,
        dim: 151,
        sound: 2682,
    },
    preserve: { id: "preserve", name: "Preserve", text: "Buffs and potions last 30% longer", level: 55, reserve: 0.15, preserve: 0.3, sprite: 947, dim: 951, sound: 2679 },
    chivalry: { id: "chivalry", name: "Chivalry", text: "15% more melee damage and 30% more armour", level: 60, reserve: 0.4, more: { melee: 0.15 }, armour: 0.3, sprite: 945, dim: 949, sound: 3826 },
    augury: { id: "augury", name: "Augury", text: "15% more spell damage, and 2% of your mana back a second", level: 77, reserve: 0.4, more: { spell: 0.15 }, manaRegen: 0.02, sprite: 1421, dim: 1425, sound: 2670 },
};

// In the prayer book's order
export const PRAYER_IDS = Object.keys(PRAYERS) as PrayerId[];

export const PRAYER = {
    // A protection's less damage of its kind
    protect: 0.2,
    // The prayer classes, as Diablo II's paladin is the aura class: a quarter less kept
    lighter: ["paladin", "necromancer"] as string[],
    lighterBy: 0.25,
    // Retribution's: how often, how far its blast reaches, and its damage, a share of the most life;
    // its beam on the hero, and the flames on each it strikes (Flames of Zamorak's)
    retribution: { every: 60, radius: 3.5, share: 1.5, spot: 437, hitSpot: SPOT.zamorakFlames.impactSpot },
    // The sound of one put out
    off: 2663,
    // The prayer tab's star
    tab: 779,
};

// Whether a shot is a missile (an arrow, a dart, a ring: what's loosed or thrown, by the bow's
// sound) or a spell
export function isMissile(visual: Visual): boolean {
    return visual.sound === SOUND.bow || visual.projectileObj !== undefined;
}
