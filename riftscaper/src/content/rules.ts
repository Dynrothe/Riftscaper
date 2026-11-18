// The numbers the whole game runs by: the tick, how fast things grow, and what a level takes.
// Tuned with the balance bot (scripts/balance.ts, docs/design.md section 13).
import { fm } from "../../../engine/core/fmath";

// The sim ticks every 20 ms, as the engine's other games do
export const TICKS_PER_SECOND = 50;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

export function seconds(s: number): number {
    return Math.round(s * TICKS_PER_SECOND);
}

// Tiles a second, as tiles a tick
export function perSecond(tiles: number): number {
    return tiles / TICKS_PER_SECOND;
}

// The campaign's last level: a hero's life, mana and regeneration grow to it and stop there, no
// gem asks more of them, and the shops and the folk give nothing past it, so all the balance bot
// tuned to depth 16 stays as it was
export const PEAK_LEVEL = 60;
// Past it the levels go on to 99, as Diablo II's and OSRS's do, each a passive point and nothing
// else (passives.ts). The first past 60 is about a ladder rift's experience, and each is 16% dearer
// than the last, about what a ladder rift a depth deeper gives more (the balance bot's, from its
// monsters' levels and mods), so a hero who clears each depth once comes about a level a depth:
// with the depth's own point, the two a depth the ladder gave before. 94 is half the way to 99,
// as 92 is in OSRS.
export const MAX_LEVEL = 99;
const PAST_PEAK = { first: 3.5, growth: 1.16 };

// Experience from one level to the next, for the hero
export function xpToNext(level: number): number {
    if (level >= PEAK_LEVEL) {
        return Math.round(campaignXpToNext(PEAK_LEVEL) * PAST_PEAK.first * fm.pow(PAST_PEAK.growth, level - PEAK_LEVEL));
    }
    return campaignXpToNext(level);
}

// The campaign's curve, which a gem's levels follow too, to the last it asks (gems.ts)
export function campaignXpToNext(level: number): number {
    return Math.round(30 * fm.pow(level, 1.75) + 20);
}

// A rift's area level by how deep it is: every rift deeper is a few levels harder
export function areaLevel(depth: number): number {
    return 1 + (depth - 1) * 4;
}

// The ladder: past the second lap's last depth (16, area level 61) a hero who clears each depth
// once has come to 60, their gems to 20 and their gear to its last campaign tiers, so what's left
// to grow on is the levels to 99's passive points, the rift-touched tier, elite bases, rolls and
// runes. LADDER_LEVEL is the most a monster at that depth can be
// (two more for its guardian, one more three times in ten): every monster to depth 16 is as the
// balance bot tuned it, and the ladder starts with depth 17.
export const LADDER_DEPTH = 16;
export const LADDER_LEVEL = areaLevel(LADDER_DEPTH) + 3;

// Monsters grow with their level: life with what a typical hero of the level deals, and a little
// past it, so fights get longer, not deadlier; damage with what a typical hero of the level can
// take. Both were fitted to the balance bot's measure of the hero (scripts/balance.ts --curve), as
// Path of Exile's monster tables follow its players: a hero's damage grows fastest early, as metals
// and affix tiers open, and slows as the last of them do (dragon at 40, the last affix tier at
// 50), so monster life's growth slows with it, from 17% a level at 1 to 4% at 49 and on to the
// ladder. On the ladder it's 1.5% a level, 6% a depth: about what rolls, runes and the ladder's
// passive points still give a capped hero for a few laps, so the rifts go on (Torment) as a
// ladder to climb, as Diablo's greater rifts are, whose wall is where the hero's growth runs out.
// At 4% a level (17% a depth) it was a wall four depths up: a monster at depth 24 had 3.6 times the
// life it had at 16, and a hero with five times the drops dealt twice the damage.
//
// It's exp(0.16 x - 0.00125 x^2) for x = level - 1 up to the knee at 48, where that grows by
// exp(0.04) a level, then exp(0.04) a level to the ladder, and exp(0.015) a level on it. Written
// as whole powers of constants, as the sim's maths has to be the same on every machine (fm.pow is
// portable for whole exponents only).
const LIFE_GROWTH = 1.17351087099181; // exp(0.16)
const LIFE_EASING = 0.998750780925; // exp(-0.00125)
const LIFE_FLOOR = 1.04081077419239; // exp(0.04)
const LIFE_LADDER = 1.01511306461572; // exp(0.015)
const LIFE_KNEE = 48;

export function monsterLifeScale(level: number): number {
    const x = Math.max(0, Math.round(level) - 1);
    const eased = Math.min(x, LIFE_KNEE);
    const fitted = Math.min(x, LADDER_LEVEL - 1);
    return fm.pow(LIFE_GROWTH, eased) * fm.pow(LIFE_EASING, eased * eased) * fm.pow(LIFE_FLOOR, fitted - eased) * fm.pow(LIFE_LADDER, x - fitted);
}

// A hero's life grows about as a power of their level, not exponentially, and so does what hits
// them, a little faster: (1 + 0.1 x)^1.5, a typical hit about 4% of an on-level hero's life at 1
// and 7% at 60, before armour and evasion, which grow too. It stops at the ladder, as the hero's
// level does: past it a rift's danger is its laps' (a monster more in every pack, a guardian's
// GUARDIAN_LAP) and its modifiers', not a blow that outgrows the hero's life.
export function monsterDamageScale(level: number): number {
    const g = 1 + 0.1 * Math.max(0, Math.min(level, LADDER_LEVEL) - 1);
    return g * Math.sqrt(g);
}

// A monster's armour, 12% more a level, stopping at the ladder as its damage does
export function monsterArmourScale(level: number): number {
    return 1 + (Math.max(1, Math.min(level, LADDER_LEVEL)) - 1) * 0.12;
}

// A guardian on each lap past the first (Torment): this much more life and damage a lap
export const GUARDIAN_LAP = { life: 0.35, damage: 0.2 };

// Experience a kill gives, from its level and the hero's: far below you, it's hardly worth it
export function killXp(baseXp: number, monsterLevel: number, heroLevel: number): number {
    // Faster than a straight line, as a level's experience grows faster than one: a rift a depth
    // still gives a hero about the levels it takes them deeper, on the second lap as the first
    const x = monsterLevel - 1;
    const xp = baseXp * (1 + x * 0.3) * (1 + x * 0.015);
    const gap = heroLevel - monsterLevel;
    const penalty = gap <= 3 ? 1 : Math.max(0.1, 1 - (gap - 3) * 0.12);
    return Math.max(1, Math.round(xp * penalty));
}

// Armour takes off a share of a hit: more against small hits than big ones, at most 75%
export function armourReduction(armour: number, damage: number): number {
    if (armour <= 0 || damage <= 0) {
        return 0;
    }
    return Math.min(0.75, armour / (armour + 6 * damage));
}

// Resistances, as Diablo II's and Path of Exile's: fire, cold and lightning, from gear, talismans
// and a quest, each taking its share off a hit of its element, which armour doesn't stop. At most
// 75%. Each Torment lap takes 15% off them, to 60% from Torment 4 (rift 33 on), as Nightmare's and
// Hell's penalties do; below nothing, a hit of the element is more, to twice at -100%. The hits
// that are elemental are the ladder's monster mods' (Infernal, Frostbound, Charged, Molten), its
// guardians' fields and an Elemental rift's share, so the ladder's where they're wanted.
export type Element = "fire" | "cold" | "lightning";
export const ELEMENTS: Element[] = ["fire", "cold", "lightning"];
export const RESIST = { most: 75, least: -100, perLap: 15, laps: 4 };

// A resistance in a rift this deep: what the hero has, less the Torment's penalty, held between
// the least and the most
export function resistPenalty(depth: number): number {
    const lap = Math.floor((Math.max(1, depth) - 1) / 8);
    return RESIST.perLap * Math.min(RESIST.laps, lap);
}

export function resistance(raw: number, depth: number): number {
    return Math.max(RESIST.least, Math.min(RESIST.most, raw - resistPenalty(depth)));
}

// The hero
// How long a rift stands before it collapses: two minutes, and three seconds more for every
// monster in it (a bigger rift is given longer), times its modifiers' share (riftMods.ts' time),
// never under 0.3. A rift of about 170 monsters stands for ten and a half minutes: the balance
// bot clears most in 3 to 8, so a steady player has room to loot and a dawdler doesn't (at a
// minute and a half and two seconds a monster, a quarter of the bot's rifts collapsed). The clock runs only while the hero's in
// it, and stops once its guardian's dead. Warnings come at these seconds left.
export const RIFT_TIME = { base: 120, perMonster: 3, least: 0.3, warnings: [60, 15] };

export const HERO = {
    radius: 0.4,
    // Tiles a second, before anything that speeds it up (4.4 till it was found a little slow)
    moveSpeed: 4.84,
    // The share of that pace kept while a skill's being used: the hero moves as they swing and
    // cast, but slowly (60% slower; it was 70%), so standing to fight is still the stronger choice
    castMoveShare: 0.4,
    critMulti: 1.5,
    baseCrit: 0.05,
    // A share of the most mana, back every second (1.5% till skills were made dearer: then a
    // big pool was a fountain)
    manaRegenShare: 0.01,
    // The most enemies a tick whose hits give mana back (a class's manaOnHit), so a sweep through
    // a big pack refills some of a skill's cost, never all of it
    manaOnHitPerTick: 3,
    // Seconds after dying before the camp's offered
    deathSeconds: 2.5,
    // How much of this level's experience dying takes away
    deathXpLoss: 0.1,
    // Close enough to pick something up, talk to someone or step through a portal
    reach: 1.3,
    talkReach: 2.6,
    portalReach: 2.2,
    // The teleport home: this long standing still, and broken by a hit or a step
    teleportSeconds: 4,
    // A skill pressed while another's being used waits for it to finish, and this long past it
    queueSeconds: 0.25,
    // Gold is picked up just by walking near it
    goldReach: 1.4,
    inventorySize: 40,
};

// The banker's stash in the city: tabs the size of the pack
export const STASH = { tabs: 4, tabSize: 40 };


// A monster's sight and chase
export const AGGRO_RADIUS = 9;
export const LEASH = 36;

// How a fight feels, as the sim decides it (the client's own share of it, hit pause and shake, is in
// client/Juice.ts). A hero's blow lands this far into the use of a skill, whatever its animation (the
// client plays the animation to meet it: content/anims.ts).
export const HIT_SHARE = 0.42;
export const IMPACT = {
    // A blow's shove: this many tiles at the least, more by the share of the monster's life it took,
    // at most `most`; less for the bigger ranks, none for a guardian. It's spent over a few ticks,
    // each `decay` of the last.
    knockLeast: 0.08,
    knockPerLife: 1.0,
    knockMost: 0.6,
    knockCrit: 0.1,
    knockDecay: 0.6,
    knockRank: { normal: 1, magic: 0.75, rare: 0.45, boss: 0 },
    // A hit that takes more than `staggerFrom` of a monster's life may stagger it out of the blow
    // it's winding up: the chance grows `staggerPerLife` for each whole life past that (so a fifth
    // of its life is 25%, half is 100%), less for the bigger ranks; it stands a moment, and can't be
    // staggered again for a while. Guardians never are.
    staggerFrom: 0.1,
    staggerPerLife: 2.5,
    staggerRank: { normal: 1, magic: 0.7, rare: 0.4, boss: 0 },
    staggerSeconds: 0.3,
    staggerAgainSeconds: 2,
    // A ranged monster closer than this share of its `keep` backs off, till it's this share away
    retreatFrom: 0.5,
    retreatTo: 0.8,
    retreatSpeed: 0.8,
};
// Monsters a pack's spread over, and how far apart packs are at the least
export const PACK_SPACING = 13;
// Reachable tiles a pack (16 to 42 of them a rift): an open rift's spread over its field, a
// planned one's (world/riftLayout.ts) along its ways, two or three a screen of them as Path of
// Exile's maps are, so as many as an open rift's on less ground
export const PACK_AREA = { open: 520, planned: 230 };
