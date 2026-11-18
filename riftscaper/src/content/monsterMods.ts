// What makes a magic or rare monster dangerous: its mods. The campaign's six, and from depth 17
// twelve more after Diablo II's champion and unique mods, Diablo III's elite affixes and Path of
// Exile's, each something seen and answered: a fire that bursts as it dies, a ring of ice, sparks,
// a teleport, a volley, a raised pack, an aura, a bind, a pull, burning ground, a drain, a shield.
// Several of them bring the hero ailments (burning, chilled, shocked, rooted), which potions'
// suffixes end and keep off (content/potions.ts, items.ts). Reflected damage is left out on
// purpose: it punishes the player for playing. Numbers are the sim's (Game.ts).
import type { Element } from "./rules";
import type { SkillIcon } from "./gems";
import type { BossSpecial } from "./monsters";
import { SPOT, Visual } from "./visuals";

export type MonsterMod =
    | "hasted"
    | "armoured"
    | "vampiric"
    | "berserk"
    | "regenerating"
    | "colossal"
    // The ladder's
    | "infernal"
    | "frostbound"
    | "charged"
    | "blinking"
    | "volleying"
    | "raising"
    | "commanding"
    | "binding"
    | "grasping"
    | "molten"
    | "draining"
    | "shielding"
    // A ladder guardian's own
    | "enraging"
    | "summoning"
    | "warded";

export const MOD_NAMES: Record<MonsterMod, string> = {
    hasted: "Hasted",
    armoured: "Armoured",
    vampiric: "Vampiric",
    berserk: "Berserk",
    regenerating: "Regenerating",
    colossal: "Colossal",
    infernal: "Infernal",
    frostbound: "Frostbound",
    charged: "Charged",
    blinking: "Blinking",
    volleying: "Volleying",
    raising: "Raising",
    commanding: "Commanding",
    binding: "Binding",
    grasping: "Grasping",
    molten: "Molten",
    draining: "Draining",
    shielding: "Shielding",
    enraging: "Enraging",
    summoning: "Summoning",
    warded: "Warded",
};

// The campaign's, rolled up to depth 16
export const CAMPAIGN_MODS: MonsterMod[] = ["hasted", "armoured", "vampiric", "berserk", "regenerating", "colossal"];

// The ladder's, all of them; a whole magic pack can't have the ones that are about a pack (a
// leader's), and only a shooter volleys
export const LADDER_MODS: MonsterMod[] = [...CAMPAIGN_MODS, "infernal", "frostbound", "charged", "blinking", "volleying", "raising", "commanding", "binding", "grasping", "molten", "draining", "shielding"];
export const LEADER_MODS: MonsterMod[] = ["raising", "commanding", "shielding"];
export const SHOOTER_MODS: MonsterMod[] = ["volleying"];
// What a guardian that stays where it rises can't have: the mods about moving
export const STILL_SHUNS: MonsterMod[] = ["hasted", "blinking", "molten"];

// A ladder guardian's: one of all of them and three of its own (two from depth 30), as Diablo
// III's elites' are. Enraging: at half life faster, and its specials twice as often. Summoning:
// its guards called again at three quarters and a quarter. Warded: its guards make it take far
// less while any stands.
export const GUARDIAN_MODS: MonsterMod[] = ["enraging", "summoning", "warded"];
export const GUARDIAN_MOD_COUNT = { one: 1, two: 2, twoFrom: 30 };

// How many on the ladder: a magic pack's one or two, a rare's three or four
export const LADDER_MOD_COUNTS = { magic: [1, 2] as [number, number], rare: [3, 4] as [number, number] };

// Each mod past the first (a rare's past its second) pays as Diablo II's do: more items and
// better from that monster
export const MOD_LOOT = { quantity: 0.35, rarity: 0.25 };

// What the hero can suffer from them: burning (life lost each second), chilled (slower), shocked
// (more damage taken) and rooted (can't move)
export type AilmentKind = "burn" | "chill" | "shock" | "root";

export const AILMENT_NAMES: Record<AilmentKind, string> = { burn: "Burning", chill: "Chilled", shock: "Shocked", root: "Rooted" };

// The element of a hit that leaves one, for the hero's resistances (content/rules.ts RESIST)
export const AILMENT_ELEMENT: Partial<Record<AilmentKind, Element>> = { burn: "fire", chill: "cold", shock: "lightning" };

// Their icons beside the buffs: the spells' (sprite-info.ts: Fire Wave, Ice Burst, Energy
// Transfer's bolt, Snare)
export const AILMENT_ICON: Record<AilmentKind, SkillIcon> = { burn: { sprite: 52 }, chill: { sprite: 326 }, shock: { sprite: 558 }, root: { sprite: 320 } };

export const AILMENTS = {
    // Chilled: this much slower; shocked: this much more damage taken
    chill: 0.3,
    shock: 0.2,
    // Burning's life lost is taken every so often, as a hit
    burnEvery: 0.5,
};

// Each new mod's numbers; damage is a share of the monster's average hit
export const MOD = {
    infernal: { more: 0.2, igniteChance: 0.3, burnSeconds: 3, burnShare: 0.15, burst: { radius: 2.2, windup: 0.7, damage: 1.5, burnSeconds: 2, burnShare: 0.3 }, visual: SPOT.fireWave },
    frostbound: { chillSeconds: 2, ring: { radius: 2.6, windup: 0.5, damage: 0.8, chillSeconds: 3 }, visual: SPOT.iceBurst },
    charged: { every: 1, sparks: 3, spread: 3, radius: 0.9, windup: 0.6, damage: 0.5, shockSeconds: 3, visual: SPOT.saradominStrike },
    blinking: { every: 6, from: 5, to: 16, near: 1.6 },
    volleying: { shots: 3, spread: 0.21 },
    raising: { every: 3, life: 0.6 },
    commanding: { faster: 0.2 },
    binding: { every: 8, range: 9, radius: 1.3, windup: 0.9, damage: 0.3, rootSeconds: 1.5 },
    grasping: { every: 8, range: 9, from: 2.5, to: 1.5, seconds: 0.35 },
    molten: { every: 0.5, radius: 0.9, seconds: 4, perSecond: 0.6, most: 24 },
    draining: { mana: 1.5 },
    shielding: { less: 0.6 },
    enraging: { at: 0.5, faster: 0.3, specials: 2 },
    summoning: { at: [0.75, 0.25], guards: 3 },
    warded: { less: 0.75 },
};

// Bind's vines, from the cast to the snare round the feet (spot-info.ts: 177 cast, 178 in
// flight, 180 Snare's impact); a blink's out and in is the teleport's own
export const BIND_VISUAL: Visual = { castSpot: 177, impactSpot: 180, sound: 1659 };

// A ladder guardian's specials are its own and one of these, rolled with it (Game.ts): a charge
// down a line it marks, a pack of its rift's called up, or ground round the hero that burns or
// freezes. Damage is a share of its average hit.
export const GUARDIAN_SPECIALS: BossSpecial[] = [
    { kind: "charge", length: 10, width: 1.7, damage: 2.0, windup: 1.0, visual: SPOT.dust },
    { kind: "summon", count: 3, damage: 0, visual: SPOT.shadowBarrage },
    { kind: "field", radius: 3, seconds: 6, damage: 0.5, ailment: "burn", visual: SPOT.zamorakFlames },
    { kind: "field", radius: 3, seconds: 6, damage: 0.3, ailment: "chill", visual: SPOT.iceBurst },
];

// How many a summon may have standing at once, and how fast a charge runs, tiles a second
export const SUMMON_MOST = 9;
export const CHARGE_SPEED = 16;
