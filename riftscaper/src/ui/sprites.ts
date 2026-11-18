// The OSRS client's interface sprites the screens are dressed in (rs.tsx draws them). Apart from
// rs.tsx, so the slim cache can list them without React (riftscaper/scripts/slim-cache.ts).
import type { Slot } from "../content/items";

export const SPRITE = {
    close: 535,
    closeHover: 536,
    orbFrame: 1071,
    orbEmpty: 1059,
    orbLife: 1060,
    orbMana: 1066,
    orbHeart: 1067,
    orbStar: 1068,
    // The side panel's tabs: its row of grey stones (seven, 33 pixels apart, the second from 40
    // pixels in cut from it for each tab) and the red stone of a middle tab that's open, 33 by 36.
    // 1026 to 1029 are the corners' red stones, rounded on one side
    tabStones: 1032,
    tabSelected: 1030,
    tabPack: 777,
    tabStats: 898,
    tabMagic: 780,
    tabHome: 1052,
    tabQuests: 776,
    tabSettings: 785,
} as const;

// The passive tree's pictures (PassiveTree.tsx): the stats tab's skill icons, spells' and prayers',
// and the stats tab's stone square (grey, and red as a chosen one is) under each keystone
export const TREE_ICON = {
    attack: 197,
    strength: 198,
    defence: 199,
    ranged: 200,
    prayer: 201,
    magic: 202,
    hitpoints: 203,
    agility: 204,
    herblore: 205,
    thieving: 206,
    treasure: 212,
    firemaking: 213,
    runecraft: 215,
    slayer: 216,
    vial: 223,
    running: 227,
    windBolt: 5,
    waterBlast: 10,
    // Two of the Ancient and the standard spellbooks' (forge.ts's own icons): ice, and lightning
    iceSpell: 326,
    sparkSpell: 558,
    clarity: 117,
    superhumanStrength: 119,
    rapidHeal: 122,
    steelSkin: 124,
    ultimateStrength: 125,
    protectMissiles: 128,
    protectMelee: 129,
    redemption: 130,
    retribution: 131,
    smite: 132,
    sharpEye: 133,
    mysticLore: 503,
    eagleEye: 504,
    mysticMight: 505,
    rigour: 1420,
    tile: 195,
    tileTaken: 196,
} as const;

// The worn equipment tab's stone square, under every slot
export const SLOT_TILE = 170;

// The worn equipment tab's shapes for an empty slot
export const SLOT_SPRITE: Record<Slot, number> = {
    head: 156,
    cape: 157,
    amulet: 158,
    weapon: 159,
    ring: 160,
    body: 161,
    offhand: 162,
    legs: 163,
    hands: 164,
    feet: 165,
    // Never worn (a talisman goes in the tree): the ring's, for the type; an empty place in the
    // belt is drawn as a vial
    talisman: 160,
    potion: 160,
};
