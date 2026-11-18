// A rift, or the city between them, a tick (20 ms) at a time: the hero and their skills, the
// monsters and their packs, projectiles and what falls from the sky, what drops and what's picked
// up, the way out and the ways home. In the city there are no monsters, only its people to talk
// to, and no skills. Deterministic: everything random comes from its seeded Rng and its
// trigonometry from fm, so a seed and the same presses play out the same on every machine.
import { BOUNTY_HERBS, BountyId } from "../content/web";
import { Rng } from "../../../engine/core/Rng";
import { SpatialHash } from "../../../engine/core/SpatialHash";
import { fm } from "../../../engine/core/fmath";
import { CharacterBody, MoveRules, moveCharacter, yawFromVector } from "../../../engine/controller/CharacterMovement";
import type { ArenaGrid } from "../../../engine/world/ArenaGrid";
import { findFreeSpot, isCircleFree, moveCircle } from "../../../engine/world/Collision";
import { FlowField, canWalkStraight } from "../../../engine/world/FlowField";
import { canSee } from "../../../engine/world/Sight";
import { SKILL_SLOTS } from "../content/classes";
import {
    BLOODTHIRST_SECONDS,
    ECHO_SECONDS,
    FRENZY_SECONDS,
    NUMB_SECONDS,
    RISEN_MOST,
    RISEN_SECONDS,
    RISEN_SHARE,
    SMOULDER_SECONDS,
    SPLIT_SHARE,
    STACKS_MOST,
    SURGE_EVERY,
    SkillTraits,
    THUNDER_EVERY,
    THUNDER_SHARE,
    VOLATILE_RADIUS,
    WARD_SECONDS,
} from "../content/forge";
import type { BuffDef, SkillDef, SkillIcon } from "../content/gems";
import { GEM_BY_ID } from "../content/gems";
import {
    AHRIMS,
    BROTHER_SETS,
    ELYSIAN,
    GRACEFUL_DROPS,
    GUTHANS,
    KARILS,
    PROC_SECONDS,
    PYRE_RADIUS,
    Proc,
    ProcWhen,
    RECENTLY,
    REDEMPTION,
    SET_IDS,
    SPECTRAL_LESS,
    Slot,
    StatKey,
    THRALLS_COUNTED,
    THRALL_BURST,
    TORAGS,
    UNIQUE_BY_ID,
    VERACS,
    When,
} from "../content/items";
import { CHICKEN_DROPS, GOODS, GoodId, HERB_DROPS, HERB_IDS, ORB_DROPS, PART_DROPS } from "../content/goods";
import { ELIXIR_XP, INSTIL_EVERY_SECONDS, Instil, SATURATED_SLOWER, SUFFIX_SECONDS, WARD_FADE_SECONDS } from "../content/potions";
import { BARBARIAN_HERBLORE, KEYSTONES } from "../content/passives";
import { MINIONS, MinionDef } from "../content/minions";
import {
    AILMENTS,
    AILMENT_NAMES,
    AilmentKind,
    BIND_VISUAL,
    CAMPAIGN_MODS,
    CHARGE_SPEED,
    GUARDIAN_MODS,
    GUARDIAN_MOD_COUNT,
    AILMENT_ELEMENT,
    GUARDIAN_SPECIALS,
    LADDER_MODS,
    LADDER_MOD_COUNTS,
    LEADER_MODS,
    MOD,
    MOD_LOOT,
    MonsterMod,
    SHOOTER_MODS,
    STILL_SHUNS,
    SUMMON_MOST,
} from "../content/monsterMods";
import { BOSSES, BossDef, BossId, BossSpecial, DEMONS, MONSTERS, MonsterDef, MonsterId, VAMPYRES, bossSpecials, formDef } from "../content/monsters";
import {
    AGGRO_RADIUS,
    Element,
    GUARDIAN_LAP,
    HERO,
    HIT_SHARE,
    IMPACT,
    LADDER_DEPTH,
    LEASH,
    RIFT_TIME,
    TICKS_PER_SECOND,
    areaLevel,
    armourReduction,
    killXp,
    monsterArmourScale,
    monsterDamageScale,
    monsterLifeScale,
    resistance,
    seconds,
    xpToNext,
} from "../content/rules";
import { LEVEL_UP_SPOT, SOUND, SPOT, STUN_SPOT, TELEPORT_SPOT, Visual } from "../content/visuals";
import { HitKind, PRAYER, PRAYERS, PrayerId, isMissile } from "../content/prayers";
import { HIRELING, HirelingKind } from "../content/hirelings";
import { HirelingStats, hirelingStats } from "./hirelings";
import { ZONES, ZoneDef, lapOf } from "../content/zones";
import { AWAKENED, AWAKENED_DROPS, PINNACLES, PinnacleId } from "../content/pinnacles";
import { ACHIEVEMENTS, AchievementGoal, HILT } from "../content/achievements";
import { PET_BY_ID, PET_CHANCE } from "../content/pets";
import { achieve, hasHilt, logIt, logItem, winPet } from "./log";
import { ORRERY, ORRERY_PAID } from "../content/orrery";
import { OrreryLevers, favoured, hostSphere, lightSphere, orreryLevers, pinnacleSphere } from "./orrery";
import { LadderRift, ladderMight, ladderRift, onLadder, ownMight, riftBoss, riftZone } from "./ladder";
import { BARROWS, BREACH, BrotherId, FIGHT_CAVES, GOD_WARS, HUNTER, IMPLING, PEST_CONTROL, RIFT_GUARDIANS, ROAMERS, SUPERIOR, SUPERIORS } from "../content/encounters";
import { COLOSSEUM, GLORIES, GLORY_IDS, GloryId } from "../content/colosseum";
import { INVOCATIONS, INVOCATION_IDS, InvocationId, TOMBS, raidLevel } from "../content/tombs";
import { HOSTS } from "../content/ladder";
import { GOD_NAMES, GodId, HOST_GOD } from "../content/pinnacles";
import { addKillCount } from "./pinnacles";
import { CHEST, FEATURES, HOARD, SHRINES, SHRINE_IDS, ShrineId } from "../content/features";
import { HEART, RIFTSTONE } from "../content/riftstones";
import type { RuneId } from "../content/runes";
import type { RiftEffect, RiftModId, RiftReward } from "../content/riftMods";
import { SHOPS } from "../content/town";
import type { FolkId, ShopId } from "../content/town";
import { SocketWork, emptySockets, gainGemXp, rollForgedGem, rollGem, socketWork, wornGems } from "./gems";
import { Hero, HeroState, Stats, cityLevel, gainXp, heroStats, nextUid, stow, togglePrayer } from "./hero";
import { Item, gambleCost, itemInfo, rollItem, rollPinnacleUnique, rollPotion, rollSetPiece, rollTalisman, rollTopHalf, sellValue } from "./loot";
import { BELT_SIZE, beltOpen, dosesLeft, errandDrops, fillBelt, killFill, potionDef, potionStat } from "./potions";
import { rollRiftstone, rollShard } from "./riftstones";
import { Paid, Task, claimTask, countClear, countFeature, countKill, taskDone } from "./tasks";
import { claimQuest, questClear, questKill } from "./quests";
import type { QuestId } from "../content/quests";
import { RuneTarget, rollRune, useRune } from "./runes";
import { riftEffect, riftReward } from "./riftMods";
import { ResolvedSkill, resolveSkill, resolveSkills, spreadOf } from "./skills";
import { Layout, Spot, layOut, placeFeatures, spotNear, townLayout } from "./placement";
import type { PersonKind, StockItem, TownPlan } from "./town";
import { eliteGambleLevel } from "./town";

// ---- What the client hands in each tick ----

export type GameInput = {
    // WASD, length 0 or 1
    moveX: number;
    moveY: number;
    // Where the mouse is on the ground (world tiles), if it's anywhere
    aimX: number;
    aimY: number;
    hasAim: boolean;
    // The monster under the mouse, -1 for none: skills aimed at the mouse go for it, where it
    // stands, rather than the ground behind its head
    aimUid: number;
    // The left button held on open ground: walk there
    walkTo: boolean;
    // The left button held on a monster: go for it with the first skill
    targetUid: number;
    // Shift held: skills are used where they're aimed, without walking
    standing: boolean;
    // Each skill button held (left, right, Q, E, R, F). One pressed while the hero's busy is
    // remembered a moment, and used as soon as they're free.
    skills: boolean[];
    // Clicked this tick: something to go and do
    command?: { kind: "pick"; uid: number } | { kind: "talk"; uid: number } | { kind: "feature"; uid: number } | { kind: "waystone" } | { kind: "portal" } | { kind: "orrery" };
    // A potion drunk this tick, by its place in the belt (0 to 3), -1 for none
    potion: number;
    // The teleport home started this tick
    teleport: boolean;
};

export function noInput(): GameInput {
    return {
        moveX: 0,
        moveY: 0,
        aimX: 0,
        aimY: 0,
        hasAim: false,
        aimUid: -1,
        walkTo: false,
        targetUid: -1,
        standing: false,
        skills: new Array(SKILL_SLOTS).fill(false),
        potion: -1,
        teleport: false,
    };
}

// ---- What's in the rift ----

export type Action = {
    skill: number;
    start: number;
    end: number;
    hitAt: number;
    fired: boolean;
    aimX: number;
    aimY: number;
    targetUid: number;
    seq: number;
    // What it cost and when the skill was ready before, given back if it's called off before its
    // blow
    paidMana: number;
    paidLife: number;
    wasReady: number;
};

type Goal =
    | { kind: "walk"; x: number; y: number }
    // Up to a monster and at it with a skill: the left button's, or a blow on another that
    // couldn't reach from where the hero stood
    | { kind: "attack"; uid: number; held: boolean; skill: number; struck: boolean }
    | { kind: "pick"; uid: number }
    | { kind: "talk"; uid: number }
    // Up to a chest, a shrine or a hoard (content/features.ts), to open it or touch it
    | { kind: "feature"; uid: number }
    | { kind: "waystone" }
    | { kind: "portal" }
    // Up to the city's orrery (content/orrery.ts), to look into it
    | { kind: "orrery" };

// The teleport home, while it gathers
export type Channel = { start: number; end: number };

// A buff skill's while: what it gives till when, one of each skill's at a time
export type ActiveBuff = BuffDef & {
    id: string;
    name: string;
    until: number;
    // A trait's buff (forge.ts): how many it's built up to, its picture, and the tick it last grew
    stacks?: number;
    icon?: SkillIcon;
    gained?: number;
    // A Divine super combat potion's: held on while the hero's killed recently
    holds?: boolean;
};

export type HeroBody = CharacterBody & {
    prevX: number;
    prevY: number;
    life: number;
    mana: number;
    moving: boolean;
    action?: Action;
    dead: boolean;
    deadTick: number;
    buffs: ActiveBuff[];
    hurtTick: number;
    // A potion's recovery over its time: till when, and how much a tick
    lifePotionUntil: number;
    lifePotionRate: number;
    manaPotionUntil: number;
    manaPotionRate: number;
    // A ward (of Overflow, Ambrosia): taken from before life, fading a little each tick
    ward: number;
    wardFade: number;
    // The tick each skill's ready again
    ready: number[];
    // A use cut short after its blow, by walking: nothing but a blink or a leap till the tick it
    // would have ended, so moving is free and never a faster attack
    recoverUntil: number;
    goal?: Goal;
    // A skill pressed while another was being used, to use when it's done (until this tick)
    queued?: { skill: number; until: number; aimX: number; aimY: number; aimUid: number };
    channel?: Channel;
};

// Someone in the city: a shopkeeper, the Archmage, a wizard about the tower, a guard, or one of
// the townsfolk with lines of their own
export type Person = {
    uid: number;
    kind: PersonKind;
    npcId: number;
    name: string;
    shop?: ShopId;
    // One of the folk (town.ts FOLK), who set tasks (tasks.ts)
    folk?: FolkId;
    title?: string;
    lines?: string[];
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    yaw: number;
    // Where they stand, and the way they face there
    homeX: number;
    homeY: number;
    homeYaw: number;
    wander: number;
    moving: boolean;
    // Where they're walking to, and when they set off next
    toX: number;
    toY: number;
    nextMove: number;
    // The last tick the hero spoke to them, to look at the hero for a while after
    talkTick: number;
};

export type { MonsterMod } from "../content/monsterMods";
export { MOD_NAMES } from "../content/monsterMods";

export type MonsterRank = "normal" | "magic" | "rare" | "boss";

// What loot falls from: a monster as it dies, or a chest or a hoard opened
// What drops loot; a ladder monster's mods past its first (a rare's past its second) bring more
type LootSource = { x: number; y: number; level: number; rank: MonsterRank | "chest" | "hoard"; mods?: number };

export type MonsterState = "idle" | "chase" | "attack" | "special" | "return" | "dead";

export type Monster = {
    uid: number;
    def: MonsterDef;
    boss?: BossDef;
    rank: MonsterRank;
    name: string;
    mods: MonsterMod[];
    level: number;
    pack: number;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    yaw: number;
    homeX: number;
    homeY: number;
    life: number;
    maxLife: number;
    damage: [number, number];
    armour: number;
    // Tiles a tick
    speed: number;
    attackTicks: number;
    hitTicks: number;
    radius: number;
    // Drawn this much bigger than its def says
    size: number;
    state: MonsterState;
    // When the attack or special it's in started, and when it ends
    actionStart: number;
    actionEnd: number;
    actionDone: boolean;
    frozenUntil: number;
    stunnedUntil: number;
    // Staggered out of a blow (IMPACT): standing till then, and not again till staggerReady
    staggerUntil: number;
    staggerReady: number;
    // A blow's shove, in tiles a tick, spent a little each tick
    knockX: number;
    knockY: number;
    // Burning: till when, and how much a tick; shocked, it takes more from every hit
    burnUntil: number;
    burn: number;
    burnTaken: number;
    // Inferno's (passives.ts): each burning on it at once, on its own, and burn their sum
    burnStacks?: { perTick: number; until: number }[];
    shockUntil: number;
    // Numbed (a forged skill's trait): this much slower till then
    chillUntil: number;
    chill: number;
    hitTick: number;
    deadTick: number;
    nextSense: number;
    nextSpecial: number;
    // How many specials it's used, and the one it's using or last used
    specials: number;
    specialNow?: BossSpecial;
    // A special's aim, while it winds up
    specialX: number;
    specialY: number;
    moved: boolean;
    // A ranged monster backing off from the hero, till it's far enough
    retreating: boolean;
    // Its experience scaled as its life is, on the ladder (sim/ladder.ts)
    xpScale: number;
    // When each of its mods that comes and goes can next (content/monsterMods.ts), and whether a
    // Raising monster's raised it from where it fell
    modNext: Partial<Record<MonsterMod, number>>;
    raised?: boolean;
    // What it is on the ladder besides one of its host (content/encounters.ts): a fleeing impling,
    // a Wilderness hunter, a roaming Wilderness boss or a guard of one, a Fight Caves wave's, a
    // Barrows brother, a superior, or one a guardian called up
    encounter?: "impling" | "hunter" | "roamer" | "guard" | "caves" | "brother" | "superior" | "summoned" | "army" | "pest" | "portal" | "breach" | "rift" | "colosseum" | "tombs";
    // A side in a fight that isn't the hero's alone (content/encounters.ts): a god's army in a God
    // Wars skirmish, or Pest Control's pests, who go for the Void Knight; the monster it's fighting,
    // and whether the blow it's in is at that and not the hero
    side?: string;
    foe?: number;
    foeBlow?: boolean;
    // Its blow, or its shot, at the hero's hireling under way
    hireBlow?: boolean;
    // A Pest Control portal's shield, up till its turn
    shielded?: boolean;
    // An impling's flight, till it's gone
    fleeUntil?: number;
    // A ladder guardian's: enraged, how many times it's called its guards, the special it rolled
    // besides its own, and a charge's run
    enraged?: boolean;
    summons?: number;
    extraSpecial?: BossSpecial;
    // An awakened guardian's second phase begun, and the special it took up then
    awoken?: boolean;
    moreSpecial?: BossSpecial;
    // A guardian that changes form (BossDef forms): the one it's in (-1 asleep), and when it next
    // turns
    form?: number;
    nextForm?: number;
    // A guardian's or a roaming boss's: when it woke, and how many of its specials landed on the
    // hero (the combat achievements')
    wokeTick?: number;
    specialHits?: number;
    dash?: { x: number; y: number; from: number; step: number };
};

export type Projectile = {
    uid: number;
    side: "hero" | "monster";
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    startX: number;
    startY: number;
    // Tiles a tick
    vx: number;
    vy: number;
    range: number;
    travelled: number;
    damage: number;
    crit: boolean;
    pierce: number;
    // Bursts over this many tiles where it ends
    splash: number;
    hit: number[];
    visual: Visual;
    done: boolean;
    // A skill's, for what its hits do
    skill?: ResolvedSkill;
    // How many more enemies it leaps on to
    chain: number;
    // A returning skill's (forge.ts): it flies back to the hero once, at the end of its flight
    returns?: boolean;
    // A monster's shot's: who shot it, for Vengeance (passives.ts) to strike back at
    owner?: number;
    // Chinchompa's (passives.ts): whether it's burst yet
    burst?: boolean;
    // The hero's hireling's: what it hits gives the hero nothing back
    ally?: boolean;
    // A monster's shot at the hero's hireling, which strikes it rather than the hero
    toHireling?: boolean;
};

// Something that lands where it was aimed a moment after: arrows from the sky, a boss's slam
export type Strike = {
    uid: number;
    side: "hero" | "monster";
    x: number;
    y: number;
    radius: number;
    damage: number;
    crit: boolean;
    start: number;
    land: number;
    visual: Visual;
    stun: number;
    freeze: number;
    // How many spot animations it shows as it lands, scattered over it
    shows: number;
    skill?: ResolvedSkill;
    // A monster's slam's or rain's: whose it is, for Vengeance to strike back at
    owner?: number;
    // What it leaves on the hero it lands on (a mod's: content/monsterMods.ts)
    ailment?: { kind: AilmentKind; seconds: number; perSecond?: number };
    // One of a charge's line: the hero's hit by one of them at most
    group?: number;
};

// One of the hero's thralls (minions.ts): it follows them, goes for whatever's nearest them, and
// crumbles when its time's up or they fall. Nothing hurts it.
export type Minion = {
    uid: number;
    def: MinionDef;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    yaw: number;
    born: number;
    until: number;
    // The monster it's going for, or -1 while it follows the hero
    target: number;
    // A blow under way: started, landing, and over at these ticks
    attackStart: number;
    attackHit: number;
    attackEnd: number;
    struck: boolean;
    moving: boolean;
    // Ticks it's tried to move and got nowhere
    stuck: number;
    // The skill that raised it, as it was then: its blows are that skill's hits
    skill: ResolvedSkill;
    // Risen from a kill by a forged skill's trait, rather than summoned
    fallen?: boolean;
    // How much bigger it is than its def (its reach with it), and how much quicker
    scale: number;
    quick: number;
};

// The hero's hireling (content/hirelings.ts), in a rift or the city: it follows them, goes for
// what's nearest them, and is what a monster goes for when it's nearer it than the hero. Fallen, it
// lies a moment and is gone, till the Captain raises it.
export type HirelingActor = {
    uid: number;
    kind: HirelingKind;
    name: string;
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    yaw: number;
    life: number;
    // The monster it's going for, or -1 while it follows the hero
    target: number;
    // A blow under way: started, landing, and over at these ticks
    attackStart: number;
    attackHit: number;
    attackEnd: number;
    struck: boolean;
    moving: boolean;
    stuck: number;
    // Its blows so far, for a barbarian's stun on every so many
    blows: number;
    hurtTick: number;
    deadTick?: number;
};

// The ladder's encounters that run on their own (content/encounters.ts): Pest Control's Void
// Knight (a person, by uid) and his life, its portals (monsters) and which has its shield down, and
// its pests' pack; a God Wars skirmish's two armies, by pack; an Abyssal breach's ring and its
// monsters' pack; and the Great Guardian (a person) of Guardians of the Rift, its power and the
// essence the hero carries to it
export type PestState = {
    knight: number;
    x: number;
    y: number;
    life: number;
    portals: number[];
    broken: number;
    nextShield: number;
    nextSpawn: number;
    pack: number;
    state: "waiting" | "fighting" | "won" | "lost";
};
export type SkirmishState = { gods: [GodId, GodId]; packs: [number, number]; x: number; y: number; state: "waiting" | "fighting" | "done" };
export type BreachState = { feature: number; x: number; y: number; start: number; radius: number; nextSpawn: number; pack: number; state: "closed" | "open" | "done" };
export type GuardianState = { person: number; x: number; y: number; start: number; power: number; carried: number; nextSpawn: number; pack: number; state: "waiting" | "active" | "won" | "lost" };

// An encounter under way, as the screen shows it beside the map
export type EncounterStatus = { name: string; color: string; lines: string[]; share?: number };

// The Fortis Colosseum under way (content/colosseum.ts): Minimus and the sand's middle, the wave it's
// on and when the next comes, the glories offered and taken, and the glory they're worth
export type ColosseumState = {
    minimus: number;
    x: number;
    y: number;
    wave: number;
    next: number;
    pack: number;
    offer: GloryId[];
    taken: Partial<Record<GloryId, number>>;
    glory: number;
    state: "waiting" | "rest" | "fighting" | "choice" | "done";
};

// A path's chamber off the Tombs' Nexus: which of TOMBS.rooms it holds, its middle, how far it
// reaches, and whether its room's beaten
export type TombsChamber = { room: number; x: number; y: number; r: number; done: boolean };

// The Tombs of Amascut under way (content/tombs.ts): Osmumten, the Nexus's middle (where the
// Wardens rise), the four paths' chambers, the room up (an index in TOMBS.rooms, -1 if none), its
// pack and guardian, when the Wardens rise once they wake, how many paths are beaten, and the raid
// level its invocations are worth. Open while a path's to be chosen; the Wardens waiting once the
// four are beaten, for the hero to come back into the Nexus, and rising a moment after
export type TombsState = {
    osmumten: number;
    x: number;
    y: number;
    chambers: TombsChamber[];
    room: number;
    next: number;
    pack: number;
    guardian: number;
    beaten: number;
    level: number;
    state: "open" | "fighting" | "wardens" | "rising" | "done";
};

// Something to find in a rift (content/features.ts): a chest, a shrine or a guarded hoard
export type Feature = {
    uid: number;
    // and on the ladder an encounter's (content/encounters.ts): the Fight Caves' mouth, a Barrows
    // brother's tomb, the Barrows chest
    kind: "chest" | "shrine" | "hoard" | "caves" | "tomb" | "barrows" | "breach";
    brother?: BrotherId;
    // The middle of the tiles it stands on (a tile's middle for an odd size, a corner for an even
    // one), which block, and how many a side
    x: number;
    y: number;
    size: number;
    // Where the hero walks to, to use it: an open tile beside it, on the spawn's side
    stand: Spot;
    // Opened, or touched
    used: boolean;
    shrine?: ShrineId;
    // A chest that's a trap: opening it raises an ambush round it
    trapped?: boolean;
    // A hoard's guards, by their pack: it opens once they're dead
    guards?: number;
};

export type Drop = {
    uid: number;
    item?: Item;
    gold?: number;
    rune?: { id: RuneId; count: number };
    // Herbs and the like (content/goods.ts), picked up by walking over them as runes are
    good?: { id: GoodId; count: number };
    x: number;
    y: number;
    tick: number;
};

export type GameEvent =
    | { kind: "heroHit"; amount: number; x: number; y: number }
    // A hit, from where (the hero, a shot's way, a strike's middle), and its share of the life the
    // monster had at most
    | { kind: "monsterHit"; uid: number; amount: number; crit: boolean; fromX: number; fromY: number; share: number }
    | { kind: "monsterAttack"; monster: Monster }
    // Its attack's blow, struck or not (a shot let go): where the attack is heard
    | { kind: "monsterBlow"; monster: Monster }
    // Staggered out of its blow by a hard hit
    | { kind: "stagger"; uid: number }
    // Killed, by how much more than it had left (a share of its life), from where, and whether
    // the last hit was a crit
    | { kind: "monsterDied"; monster: Monster; overkill: number; fromX: number; fromY: number; crit: boolean }
    // Something from the sky landed (a rain of arrows, a guardian's slam)
    | { kind: "landed"; side: "hero" | "monster"; x: number; y: number; radius: number }
    | { kind: "heroDied" }
    // The rift's time is running out (seconds left), or has: it collapses, and the hero's cast home
    | { kind: "riftTime"; seconds: number }
    | { kind: "riftCollapsed" }
    | { kind: "levelUp"; level: number }
    | { kind: "cast"; skill: SkillDef; x: number; y: number }
    | { kind: "spot"; spot: number; x: number; y: number; lift?: number }
    | { kind: "sound"; id: number; x: number; y: number; volume?: number }
    | { kind: "drop"; drop: Drop }
    | { kind: "pickup"; item: Item }
    // The record (sim/log.ts): a collection log slot lit, a pet won (or a second, only a funny
    // feeling), a combat achievement done
    | { kind: "logged"; name: string }
    | { kind: "pet"; id: string; fresh: boolean }
    | { kind: "achievement"; id: string }
    // An orrery's sphere lit (sim/orrery.ts)
    | { kind: "sphere"; key: string }
    // Up to the orrery on the square, to look into it
    | { kind: "orrery" }
    | { kind: "gold"; amount: number }
    | { kind: "rune"; id: RuneId; count: number }
    | { kind: "good"; id: GoodId; count: number }
    | { kind: "packFull" }
    | { kind: "noMana" }
    | { kind: "bossAwake"; monster: Monster }
    | { kind: "bossDied"; monster: Monster }
    | { kind: "portal" }
    | { kind: "sealed" }
    | { kind: "talk"; person: Person }
    // A chest opened (or sprung, a trap), a shrine touched, a hoard opened or still guarded
    | { kind: "feature"; feature: Feature; what: "opened" | "ambush" | "blessed" | "guarded" }
    // A task further on, and whether that's done it
    | { kind: "task"; task: Task; done: boolean }
    // One of Reldo's quests done, to claim from him (content/quests.ts)
    | { kind: "quest"; id: QuestId }
    // Home to the city, by the camp's waystone or the teleport
    | { kind: "home"; how: "waystone" | "teleport" }
    | { kind: "channel" }
    | { kind: "channelBroken"; why: "hit" | "moved" }
    // A potion drunk from a place in the belt (by an instil, for you), or none there to drink, or
    // the place not open yet
    | { kind: "potion"; place: number; name: string; instil?: boolean }
    | { kind: "noPotion"; place: number; why: "empty" | "dry" | "shut" }
    // A guardian's drop for one of the Apothecary's errands (sim/potions.ts errandDrops)
    | { kind: "errandDrop"; id: GoodId; boss: string }
    // An elixir's time in the rifts run out
    | { kind: "elixirGone" }
    // An ailment a monster's mod put on the hero (content/monsterMods.ts)
    | { kind: "ailment"; ailment: AilmentKind; name: string }
    // On the ladder: an encounter's moments (content/encounters.ts), a superior called up, a
    // roaming boss or a guardian enraged
    | {
          kind: "encounter";
          what:
              | "impling"
              | "implingGone"
              | "implingCaught"
              | "hunter"
              | "roamer"
              | "superior"
              | "brother"
              | "barrowsOpen"
              | "barrowsSealed"
              | "wave"
              | "waveStands"
              | "waveCleared"
              | "cavesDone"
              | "enraged"
              | "awakened"
              | "pestStart"
              | "portalOpen"
              | "portalBroken"
              | "knightFallen"
              | "pestWon"
              | "skirmish"
              | "skirmishDone"
              | "breachOpen"
              | "breachClosed"
              | "guardiansStart"
              | "guardiansPower"
              | "guardiansWon"
              | "guardiansLost"
              | "colosseumStart"
              | "colosseumWave"
              | "glories"
              | "glory"
              | "colosseumWon"
              | "tombsRoom"
              | "tombsRoomDone"
              | "tombsWardens"
              | "tombsWon";
          name?: string;
          wave?: number;
          tokkul?: number;
          left?: number;
          count?: number;
      }
    | { kind: "cantUse"; why: string }
    // The hero's hireling hit, and fallen (content/hirelings.ts)
    | { kind: "hirelingHit"; amount: number; x: number; y: number }
    | { kind: "hirelingDied"; name: string }
    | { kind: "evaded" }
    | { kind: "burn"; uid: number; amount: number }
    // A gem levelled, and gems given for a level
    | { kind: "gemLevel"; name: string; level: number }
    | { kind: "gemsGiven"; names: string[] }
    // Lightning from one to the next
    | { kind: "beam"; points: { x: number; y: number }[] };

export type ZoneOptions = {
    // The rift's depth; 0 in the city
    depth: number;
    seed: number;
    // Where the hero comes in, in world tiles
    spawn: Spot;
    // The city's people and its portal: no monsters, no fighting
    town?: TownPlan;
    // The Archmage's modifiers on the rift (content/riftMods.ts): harder, and richer
    mods?: RiftModId[];
    // A pinnacle (content/pinnacles.ts), not the depth's own zone
    pinnacle?: PinnacleId;
    // The generator's landmarks, in world tiles: where a guarded hoard can stand
    sites?: Spot[];
    // A planned rift's dead ends off its way, in world tiles: where its chests go first
    nooks?: Spot[];
    // Reachable tiles a pack (content/rules.ts's PACK_AREA), an open rift's if not given
    packArea?: number;
    // A planned rift's guardian's arena's middle, in world tiles: where its boss stands, whatever
    // ground's further
    guardian?: Spot;
    // A rift of the web's, its bounty (content/web.ts)
    bounty?: BountyId;
    // A pinnacle opened awakened (content/pinnacles.ts AWAKENED)
    awakened?: boolean;
    // The Tombs' invocations, chosen before it was opened (content/tombs.ts)
    invocations?: InvocationId[];
    // A nexus's chambers (world/riftLayout.ts): the Tombs' paths', their middles and how far they
    // reach, in world tiles
    rooms?: { x: number; y: number; r: number }[];
};

// How fast the city's people stroll, tiles a tick
const STROLL = 1.1 / TICKS_PER_SECOND;
const PERSON_RADIUS = 0.4;
// Small counts as Osmumten says them
const COUNT_WORDS = ["None", "One", "Two", "Three", "Four"];
// How long someone spoken to keeps looking at the hero
const TALK_LOOK_TICKS = seconds(6);

const MONSTER_FIELD = 96;
const HERO_FIELD = 96;
// Which skill wins when more than one's held: the right button, Q, E, R, F, then the left with Shift
const SKILL_ORDER = [1, 2, 3, 4, 5, 0];

// Burning lasts this long, and burns this share of the hit that lit it, all told
const BURN_SECONDS = 3;
const BURN_SHARE = 0.9;
// A shocked enemy takes this much more from every hit, for this long
const SHOCK_MORE = 0.2;
const SHOCK_SECONDS = 3;

// The tree's wings' keystones (content/passives.ts KEYSTONES says them): Tempest's shock and its
// spread, the most burnings at once under Inferno, Ice Barrage's shatter, Demonic Offering's shares
// back, Vengeance's share of armour and how often, Dragon Claws' blows again, Rigour's most and at
// how far, and the Arceuus Covenant's risen (forge.ts Gravebound): a bigger share of the hit
// (their 50% more, on a hit the keystone halves), more at once, twice as often and four times as
// long, so the dead do half a build's damage (docs/design.md section 13)
const TEMPEST = { more: 0.4, radius: 2.5 };
const INFERNO_STACKS = 3;
const SHATTER = { share: 0.12, radius: 2 };
const DEMONIC = { mana: 0.2, life: 0.05, normal: 0.04 };
const VENGEANCE = { share: 0.5, every: 0.5 };
const CLAWS = [0.5, 0.25, 0.25];
const RIGOUR = { most: 0.4, tiles: 8 };
const COVENANT_RISEN = { share: 3, most: 2, chance: 2, lasts: 4 };
// How far a chain or an arc looks for the next enemy
const CHAIN_REACH = 6;

// A blow, that has to be in reach of what it hits
function isMelee(skill: SkillDef): boolean {
    return skill.kind === "strike" || skill.kind === "cleave";
}

// A skill that flies at what it's aimed at: used on a monster out of its range or sight, the hero
// walks up first, as for a blow (Path of Exile's way)
function flies(skill: SkillDef): boolean {
    return skill.kind === "shoot" || skill.kind === "burst" || skill.kind === "arc" || skill.kind === "rain";
}

// A blink or a leap: gets the hero out of anything they're doing at once (the dodge)
function escapes(skill: SkillDef): boolean {
    return skill.kind === "blink" || skill.kind === "leap";
}
// How far from the hero monsters are looked after at all; past it they stand where they are
const ACTIVE_RANGE = 48;
const CORPSE_TICKS = seconds(4);

const RARE_FIRST = ["Gor", "Mal", "Vex", "Thar", "Kru", "Zul", "Bel", "Mor", "Rak", "Sil", "Dra", "Ug", "Nar", "Ish"];
const RARE_SECOND = ["gash", "thak", "mire", "rot", "fang", "bane", "grim", "skull", "maw", "claw", "spine", "drool"];
const RARE_TITLES = ["the Wretched", "the Vile", "the Unbroken", "the Hungering", "the Cruel", "the Restless", "the Foul", "the Pale"];

export class Game {
    tick = 0;
    readonly rng: Rng;
    // Talismans' drops (talismans.ts), on their own, so the rest of what falls is as it was before
    // there were any; and potions' and herbs', and a Chemist's potion's saved doses, likewise
    private readonly talismanRng: Rng;
    private readonly potionRng: Rng;
    // The secret rift's makings, rolled on their own so a meadow's other drops are as they were
    private readonly chickenRng: Rng;
    // The late game's parts and orbs (content/goods.ts PART_DROPS), likewise
    private readonly partRng: Rng;
    // Whether a potion's been drunk in the rift (the combat achievements')
    private drank = false;
    // The hero's orrery (sim/orrery.ts), as the rift began: on the ladder, the levers on its rolls
    private readonly orrery: OrreryLevers;
    private readonly meadow: boolean;
    readonly layout: Layout;
    readonly hero: HeroBody;
    stats: Stats;
    // What each skill button does, worked out from gems, gear and passives (skills.ts)
    skills: (ResolvedSkill | undefined)[];
    readonly monsters: Monster[] = [];
    readonly projectiles: Projectile[] = [];
    readonly strikes: Strike[] = [];
    readonly drops: Drop[] = [];
    // Chests, shrines and a hoard (none in the city)
    readonly features: Feature[] = [];
    // The hero's thralls (none in the city)
    readonly minions: Minion[] = [];
    // The hero's hireling, while it's with them, and its numbers (sim/hirelings.ts)
    hireling?: HirelingActor;
    hireStats?: HirelingStats;
    // The city's people (none in a rift)
    readonly people: Person[] = [];
    // The city: nobody to fight, no skills, no teleport home
    readonly town: boolean;
    readonly level: number;
    bossUid = -1;
    // The tick the rift collapses at, if its guardian isn't dead by then (none in the city), and
    // whether it has
    timeLimit = 0;
    collapsed = false;
    // The tick the hero's attacks last gave mana back, and for how many enemies then
    private manaHitTick = -1;
    private manaHits = 0;
    // The way on: past a rift's boss once it's dead, or the city's portal once the Archmage opens it
    portalOpen = false;
    bossAwake = false;
    // Monsters killed in this rift, of how many
    killed = 0;
    // The rift's modifiers, and what they do and pay all told (none in the city)
    readonly riftMods: RiftModId[];
    readonly effect: RiftEffect;
    readonly reward: RiftReward;

    private events: GameEvent[] = [];
    private uid = 1;
    private readonly hash: SpatialHash<Monster>;
    private readonly field = new FlowField(MONSTER_FIELD);
    private fieldTick = -999;
    private readonly heroField = new FlowField(HERO_FIELD);
    private heroFieldTick = -999;
    private readonly rules: MoveRules = { radius: HERO.radius, speed: 0, frozen: false, held: false };
    private readonly stepOut = { x: 0, y: 0 };
    private noManaTick = -999;
    private cantUseTick = -999;
    // Each skill's button as it was last tick, and whether it's newly down this one
    private readonly skillsDown: boolean[] = [];
    private readonly skillsPressed: boolean[] = [];
    private readonly packs: Monster[][] = [];
    // A forged skill's traits under way (forge.ts): echoes still to come, the ground left burning,
    // each skill's uses towards its surge, and when lightning can next be called down
    private readonly echoes: { at: number; skill: ResolvedSkill; aimX: number; aimY: number; targetUid: number }[] = [];
    // Chances to cast (items.ts Proc): when each can next, and its skill as worked out for the
    // stats it was worked out for
    private readonly procReady = new Map<Proc, number>();
    private readonly procSkills = new Map<Proc, ResolvedSkill>();
    private procStats?: Stats;
    readonly grounds: { x: number; y: number; radius: number; start: number; until: number; perTick: number }[] = [];
    // The ladder's monster mods (content/monsterMods.ts): the ailments on the hero, till when, and
    // burning's life a second and what's built up of it; a pull under way; a Molten monster's
    // ground left burning; each potion suffix's ward against an ailment, till when; and the packs
    // a Commanding or a Shielding monster stands over
    readonly ailments: Record<AilmentKind, number> = { burn: 0, chill: 0, shock: 0, root: 0 };
    private heroBurn = 0;
    private heroBurnTaken = 0;
    private pull?: { x: number; y: number; until: number; step: number };
    readonly hazards: { x: number; y: number; radius: number; start: number; until: number; perSecond: number; kind: "burn" | "chill" }[] = [];
    private readonly ailmentWard: Record<AilmentKind, number> = { burn: 0, chill: 0, shock: 0, root: 0 };
    private readonly commanded = new Set<number>();
    private readonly shielded = new Map<number, number>();
    // A charge's lines that have struck the hero already
    private readonly struck = new Set<number>();
    private fieldTaken = 0;
    // The ladder's encounter (content/encounters.ts): its roll, the Fight Caves' state, the
    // Barrows' tombs and brothers slain, and a roaming boss
    readonly rift?: LadderRift;
    caves?: { feature: number; wave: number; held: number; pack: number; state: "ready" | "fighting" | "choice" | "done" };
    barrowsTombs = 0;
    barrowsSlain = 0;
    pest?: PestState;
    skirmish?: SkirmishState;
    breach?: BreachState;
    colosseum?: ColosseumState;
    tombs?: TombsState;
    // The Tombs' invocations, if it's the Tombs (content/tombs.ts)
    invocations: InvocationId[] = [];
    guardian?: GuardianState;
    private roamerUid = -1;
    private readonly surges = new Map<string, number>();
    private thunderReady = 0;
    // A surge's, while its use is made
    private damageMore = 1;
    private forceCrit = false;
    // When the hero last killed, evaded, and blinked or leapt (hurtTick is when they were last
    // hit), for the stats that hang on it (hero.ts HeroState), and how those stood when the stats
    // were last made
    private lastKill = -999;
    private lastEvade = -999;
    private lastMoved = -999;
    private stateKey = "";
    // Redemption's (items.ts): when it's ready again, and the life it gives back till when
    private redemptionReady = 0;
    private retributionReady = 0;
    private mendUntil = 0;
    private mendRate = 0;
    // Vengeance's: when it can strike back again
    private vengeanceReady = 0;
    // Potions' (content/potions.ts): till when one's in effect, for the stats that hang on it; a
    // suffix of Overflow's ward while it works and the most it can be; of Plenty's share of a dose
    // a kill gives the others; Overload's life cost over its time; and when each instilled potion
    // can drink itself again
    private potionUntil = 0;
    private overflow = { until: 0, most: 0 };
    private plenty = { until: 0, share: 0, from: -1 };
    private bleedUntil = 0;
    private bleedRate = 0;
    private readonly instilReady: number[] = new Array(BELT_SIZE).fill(0);
    // A crit's blows landing again (Dragon Claws), while they're made
    private clawing = false;

    constructor(
        readonly grid: ArenaGrid,
        readonly heroData: Hero,
        readonly zone: ZoneOptions,
    ) {
        this.rng = new Rng((zone.seed ^ 0x5eed1234) >>> 0);
        this.talismanRng = new Rng((zone.seed ^ 0x7a115a17) >>> 0);
        this.potionRng = new Rng((zone.seed ^ 0x9071a5e1) >>> 0);
        this.chickenRng = new Rng((zone.seed ^ 0xc41c4e11) >>> 0);
        this.partRng = new Rng((zone.seed ^ 0x9a27d20b) >>> 0);
        this.orrery = orreryLevers(heroData);
        this.town = zone.town !== undefined;
        this.meadow = !this.town && zone.pinnacle !== "chicken" && riftZone(zone.depth, zone.seed, zone.pinnacle).biome === "meadow";
        this.level = areaLevel(Math.max(1, zone.depth));
        this.rift = !this.town && onLadder(zone.depth, zone.pinnacle) ? ladderRift(zone.depth, zone.seed) : undefined;
        this.riftMods = this.town ? [] : [...(zone.mods ?? [])];
        this.effect = riftEffect(this.riftMods);
        this.reward = riftReward(this.riftMods);
        // The web's bounties that are more of what the rift gives
        if (zone.bounty === "runes") {
            this.reward.runes += 1;
        } else if (zone.bounty === "xp") {
            this.reward.xp += 0.5;
        }
        // The Tombs' invocations, over every monster as a rift's modifiers are, and the raid level
        // they're worth paying out over the rest of the run, as the Colosseum's glory does
        if (zone.pinnacle && PINNACLES[zone.pinnacle].rooms) {
            this.invocations = INVOCATION_IDS.filter((id) => zone.invocations?.includes(id));
            const effect = this.effect as Record<keyof RiftEffect, number>;
            for (const id of this.invocations) {
                const e = INVOCATIONS[id].effect ?? {};
                for (const key of Object.keys(e) as (keyof RiftEffect)[]) {
                    effect[key] += e[key] ?? 0;
                }
            }
            const level = raidLevel(this.invocations);
            this.reward.quantity += level * TOMBS.perLevel.quantity;
            this.reward.rarity += level * TOMBS.perLevel.rarity;
        }
        const spawn = findFreeSpot(grid, zone.spawn.x, zone.spawn.y, HERO.radius);
        this.layout = zone.town
            ? townLayout(grid, spawn, zone.town.portal)
            : layOut(grid, spawn, this.rng, Math.max(0.2, 1 + this.effect.packs + (zone.pinnacle ? PINNACLES[zone.pinnacle].packs : 0)), {
                  area: zone.packArea,
                  guardian: zone.guardian,
              });
        this.stats = heroStats(heroData);
        this.skills = resolveSkills(heroData, this.stats);
        this.hero = {
            x: spawn.x,
            y: spawn.y,
            prevX: spawn.x,
            prevY: spawn.y,
            yaw: 1024,
            life: this.stats.maxLife,
            mana: this.stats.maxMana,
            moving: false,
            dead: false,
            deadTick: 0,
            buffs: [],
            hurtTick: -999,
            lifePotionUntil: 0,
            lifePotionRate: 0,
            manaPotionUntil: 0,
            manaPotionRate: 0,
            ward: 0,
            wardFade: 0,
            ready: new Array(SKILL_SLOTS).fill(0),
            recoverUntil: 0,
        };
        this.hash = new SpatialHash<Monster>(4, { baseX: grid.baseX, baseY: grid.baseY, sizeX: grid.sizeX, sizeY: grid.sizeY });
        if (zone.town) {
            this.settle(zone.town);
            this.refillPotions(true);
        } else {
            this.populate();
            const share = Math.max(RIFT_TIME.least, 1 + this.effect.time);
            // The Colosseum's waves take as long as they take
            // Ghommal's sixth hilt: a quarter longer
            const hilt = (hasHilt(heroData, "time") ? 1 + HILT.timeMore : 1) * (onLadder(zone.depth, zone.pinnacle) ? 1 + this.orrery.time : 1);
            // The Tombs' take as long as they take too, unless Jog for It's chosen
            const jog = this.invocations.map((id) => INVOCATIONS[id].minutes ?? 0).filter((m) => m > 0);
            this.timeLimit = this.colosseum
                ? 0
                : this.tombs
                  ? jog.length > 0
                      ? seconds(Math.min(...jog) * 60)
                      : 0
                  : seconds((RIFT_TIME.base + RIFT_TIME.perMonster * this.monsters.length) * share * hilt);
        }
        this.hireStats = hirelingStats(heroData);
        this.syncHireling();
    }

    takeEvents(): GameEvent[] {
        const events = this.events;
        this.events = [];
        return events;
    }

    private emit(event: GameEvent): void {
        this.events.push(event);
    }

    get boss(): Monster | undefined {
        return this.monsters.find((m) => m.uid === this.bossUid);
    }

    // The guardian the screen's bar shows: the Tombs' room's, else the rift's
    get shownBoss(): Monster | undefined {
        const t = this.tombs;
        const room = t && t.guardian >= 0 ? this.monsterByUid(t.guardian) : undefined;
        return room ?? this.boss;
    }

    get monsterTotal(): number {
        return this.monsters.length;
    }

    // ---- Setting out the city ----

    private settle(town: TownPlan): void {
        for (const plan of town.people) {
            this.people.push({
                uid: this.uid++,
                kind: plan.kind,
                npcId: plan.npcId,
                name: plan.name,
                shop: plan.shop,
                folk: plan.folk,
                title: plan.title,
                lines: plan.lines,
                x: plan.x,
                y: plan.y,
                prevX: plan.x,
                prevY: plan.y,
                yaw: plan.yaw,
                homeX: plan.x,
                homeY: plan.y,
                homeYaw: plan.yaw,
                wander: plan.wander,
                moving: false,
                toX: plan.x,
                toY: plan.y,
                nextMove: seconds(1 + this.rng.next() * 6),
                talkTick: -999,
            });
        }
    }

    personByUid(uid: number): Person | undefined {
        return this.people.find((p) => p.uid === uid);
    }

    // ---- Setting out the rift ----

    private reachable(x: number, y: number): boolean {
        const { baseX, baseY, sizeX, sizeY } = this.grid;
        const tx = Math.floor(x) - baseX;
        const ty = Math.floor(y) - baseY;
        return tx >= 0 && ty >= 0 && tx < sizeX && ty < sizeY && this.layout.distance[tx + ty * sizeX] >= 0;
    }

    private populate(): void {
        if (this.zone.pinnacle && PINNACLES[this.zone.pinnacle].waves) {
            this.raiseColosseum();
            return;
        }
        if (this.zone.pinnacle && PINNACLES[this.zone.pinnacle].rooms) {
            this.raiseTombs();
            return;
        }
        const zone = riftZone(this.zone.depth, this.zone.seed, this.zone.pinnacle);
        const rng = this.rng;
        const weights = zone.monsters.map(([, w]) => w);
        const lap = Math.floor((this.zone.depth - 1) / 8);
        // Modifiers: magic and rare packs more common, and more in every pack
        const empowered = 1 + this.effect.empowered;
        const more = this.effect.packSize;
        for (const at of this.layout.packs) {
            const id = zone.monsters[Math.max(0, rng.weightedIndex(weights))][0];
            const def: MonsterDef = MONSTERS[id];
            const pack = this.packs.length;
            const members: Monster[] = [];
            const roll = rng.next();
            if (roll < 0.14 * empowered) {
                // A rare, and its followers
                const leaderId: MonsterId = zone.leaders ? rng.pick(zone.leaders) : id;
                const leader = this.spawnMonster(MONSTERS[leaderId], "rare", at, pack);
                members.push(leader);
                const n = 2 + rng.int(3) + lap + more;
                for (let i = 0; i < n; i++) {
                    members.push(this.spawnMonster(def, "normal", spotNear(this.grid, rng, at, 3, def.radius), pack));
                }
            } else if (roll < 0.36 * empowered) {
                // A magic pack, all with the same blessing (two, now and then, on the ladder)
                const mods = this.packMods(def);
                const n = 2 + rng.int(3) + lap + more;
                for (let i = 0; i < n; i++) {
                    members.push(this.spawnMonster(def, "magic", spotNear(this.grid, rng, at, 3, def.radius), pack, mods));
                }
            } else {
                const ranged = def.ranged !== undefined;
                const n = (ranged ? 2 : 3) + rng.int(ranged ? 3 : 4) + lap + more;
                for (let i = 0; i < n; i++) {
                    members.push(this.spawnMonster(def, "normal", spotNear(this.grid, rng, at, 3.5, def.radius), pack));
                }
            }
            this.packs.push(members.filter((m) => this.reachable(m.x, m.y) || this.dropUnreachable(m)));
        }
        // The boss, with a guard round it: the zone's own, or its second on an odd lap
        const bossDef: BossDef = BOSSES[riftBoss(this.zone.depth, this.zone.seed, this.zone.pinnacle)];
        const pack = this.packs.length;
        // On the ladder it has mods (one, two from depth 30), and a special of the pool's; a god's
        // general or the Sire, in their pinnacle, two and one, and much the tougher
        const pinnacle = this.zone.pinnacle && this.zone.pinnacle !== "heart" ? PINNACLES[this.zone.pinnacle] : undefined;
        // One that stays where it rises has nothing that moves it
        const still = bossDef.speed === 0;
        const bossMods =
            this.ladder || pinnacle
                ? this.pickMods(
                      rng,
                      [...LADDER_MODS, ...GUARDIAN_MODS].filter((mod) => (bossDef.ranged || !SHOOTER_MODS.includes(mod)) && !(still && STILL_SHUNS.includes(mod))),
                      pinnacle || this.zone.depth >= GUARDIAN_MOD_COUNT.twoFrom ? GUARDIAN_MOD_COUNT.two : GUARDIAN_MOD_COUNT.one,
                  )
                : [];
        const boss = this.spawnMonster(bossDef, "boss", this.layout.boss, pack, bossMods);
        if (this.ladder || pinnacle) {
            boss.extraSpecial = rng.pick(still ? GUARDIAN_SPECIALS.filter((s) => s.kind !== "charge") : GUARDIAN_SPECIALS);
        }
        if (pinnacle) {
            boss.maxLife = boss.life = Math.round(boss.maxLife * pinnacle.life);
            boss.damage = [boss.damage[0] * pinnacle.damage, boss.damage[1] * pinnacle.damage];
        }
        this.awakenBoss(boss);
        this.bossUid = boss.uid;
        const guards: Monster[] = [boss];
        // Its guard: a pinnacle's own bodyguards, rares, or a magic pack of the zone's first monster
        if (pinnacle?.retinue) {
            for (const id of pinnacle.retinue) {
                const def: MonsterDef = MONSTERS[id];
                const g = this.spawnMonster(def, "rare", spotNear(this.grid, rng, this.layout.boss, 3.5, def.radius), pack, this.packMods(def), true);
                g.name = def.name;
                guards.push(g);
            }
        } else {
            const guardDef: MonsterDef = MONSTERS[zone.monsters[0][0]];
            for (let i = 0; i < 3 + lap + more; i++) {
                guards.push(this.spawnMonster(guardDef, "magic", spotNear(this.grid, rng, this.layout.boss, 4, guardDef.radius), pack, this.packMods(guardDef)));
            }
        }
        this.packs.push(guards);
        this.placeFeatures(zone, lap, more);
    }

    // An awakened pinnacle's guardian: tougher again (content/pinnacles.ts AWAKENED)
    private awakenBoss(boss: Monster): void {
        if (!this.zone.awakened) {
            return;
        }
        boss.maxLife = boss.life = Math.round(boss.maxLife * AWAKENED.life);
        boss.damage = [boss.damage[0] * AWAKENED.damage, boss.damage[1] * AWAKENED.damage];
        boss.name = `Awakened ${boss.name}`;
    }

    // An awakened guardian at half its life: its retinue raised again, or its land's guards, and a
    // special more of the ladder's pool
    private awakenPhase(m: Monster): void {
        m.awoken = true;
        const retinue = this.zone.pinnacle ? PINNACLES[this.zone.pinnacle].retinue : undefined;
        if (retinue) {
            for (const id of retinue) {
                const def: MonsterDef = MONSTERS[id];
                const at = spotNear(this.grid, this.rng, { x: m.x, y: m.y }, 3.5, def.radius);
                if (!this.reachable(at.x, at.y)) {
                    continue;
                }
                const g = this.spawnMonster(def, "rare", at, m.pack, this.packMods(def), true);
                g.name = def.name;
                g.encounter = "summoned";
                g.state = "chase";
                g.staggerUntil = this.tick + seconds(FEATURES.rise);
                this.packs[m.pack]?.push(g);
                this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot!, x: g.x, y: g.y });
            }
        } else {
            this.callGuards(m, AWAKENED.guards);
        }
        const open = GUARDIAN_SPECIALS.filter((s) => s !== m.extraSpecial);
        m.moreSpecial = open.length > 0 ? this.rng.pick(open) : undefined;
        this.emit({ kind: "spot", spot: SPOT.zamorakFlames.impactSpot!, x: m.x, y: m.y });
        this.emit({ kind: "encounter", what: "awakened", name: m.name });
    }

    // Chests, shrines and a guarded hoard (content/features.ts), from a stream of their own so
    // the packs are where they always were; the hoard's guards are a rare pack of the zone's
    private placeFeatures(zone: ZoneDef, lap: number, more: number): void {
        const rng = new Rng((this.zone.seed ^ 0x0fea7e5) >>> 0);
        const pinnacle = this.zone.pinnacle ? PINNACLES[this.zone.pinnacle] : undefined;
        const range = ([lo, hi]: [number, number]) => lo + rng.int(hi - lo + 1);
        const rift = this.rift;
        const encounter = rift ? { impling: 1, hunter: 1, fightCaves: 1, barrows: BARROWS.tombs + 1, pestControl: 1, godWars: 1, breach: 1, guardians: 1 }[rift.encounter] + (rift.roamer ? 1 : 0) : 0;
        const spots = placeFeatures(
            this.grid,
            this.layout,
            rng,
            this.zone.sites ?? [],
            {
                chests: pinnacle ? pinnacle.chests : range(FEATURES.chests) + (this.ladder ? this.orrery.chest : 0),
                shrines: pinnacle ? pinnacle.shrines : range(FEATURES.shrines),
                hoard: !pinnacle && (rng.chance(FEATURES.hoard) || (this.ladder && this.orrery.hoard > 0)),
                encounter,
            },
            this.zone.nooks,
        );
        for (const at of spots.chests) {
            const trapped = rng.chance(FEATURES.trapped);
            this.raiseFeature({ kind: "chest", trapped }, at, CHEST.size);
        }
        for (const at of spots.shrines) {
            const shrine = rng.pick(SHRINE_IDS);
            this.raiseFeature({ kind: "shrine", shrine }, at, SHRINES[shrine].size);
        }
        const pack = this.packs.length;
        const at = spots.hoard;
        if (at && this.raiseFeature({ kind: "hoard", guards: pack }, at, HOARD.size)) {
            const leaderId: MonsterId = zone.leaders ? rng.pick(zone.leaders) : zone.monsters[0][0];
            const leader: MonsterDef = MONSTERS[leaderId];
            const def: MonsterDef = MONSTERS[zone.monsters[Math.max(0, rng.weightedIndex(zone.monsters.map(([, w]) => w)))][0]];
            const guards = [this.spawnMonster(leader, "rare", spotNear(this.grid, rng, at, 2.5, leader.radius), pack)];
            for (let i = 0; i < 3 + lap + more; i++) {
                guards.push(this.spawnMonster(def, "magic", spotNear(this.grid, rng, at, 3.5, def.radius), pack, this.packMods(def, rng)));
            }
            this.packs.push(guards.filter((m) => this.reachable(m.x, m.y) || this.dropUnreachable(m)));
        }
        if (rift) {
            this.placeEncounter(rift, spots.encounter, rng);
        }
    }

    // A feature on the tiles round a spot, which then block as its loc does, with an open tile
    // beside it to use it from, the nearest the spawn on foot; none if there's no such tile
    private raiseFeature(what: Pick<Feature, "kind" | "trapped" | "shrine" | "guards" | "brother">, at: Spot, size: number): Feature | undefined {
        const { baseX, baseY, sizeX } = this.grid;
        const x0 = Math.floor(at.x) - Math.floor((size - 1) / 2);
        const y0 = Math.floor(at.y) - Math.floor((size - 1) / 2);
        let stand: Spot | undefined;
        let best = Infinity;
        for (let ty = y0 - 1; ty <= y0 + size; ty++) {
            for (let tx = x0 - 1; tx <= x0 + size; tx++) {
                const inside = tx >= x0 && ty >= y0 && tx < x0 + size && ty < y0 + size;
                const d = inside ? -1 : (this.layout.distance[tx - baseX + (ty - baseY) * sizeX] ?? -1);
                if (d >= 0 && d < best && !this.grid.isSolid(tx, ty)) {
                    best = d;
                    stand = { x: tx + 0.5, y: ty + 0.5 };
                }
            }
        }
        if (!stand) {
            return undefined;
        }
        for (let ty = y0; ty < y0 + size; ty++) {
            for (let tx = x0; tx < x0 + size; tx++) {
                this.grid.dropTile(tx, ty, true);
            }
        }
        const f: Feature = { uid: this.uid++, ...what, x: x0 + size / 2, y: y0 + size / 2, size, stand, used: false };
        this.features.push(f);
        return f;
    }

    featureByUid(uid: number): Feature | undefined {
        return this.features.find((f) => f.uid === uid);
    }

    // Whether a hoard's guards still stand
    guarded(f: Feature): boolean {
        return f.guards !== undefined && (this.packs[f.guards] ?? []).some((m) => m.state !== "dead");
    }

    // A monster placed somewhere it can't be reached: taken back out
    private dropUnreachable(m: Monster): boolean {
        const i = this.monsters.indexOf(m);
        if (i >= 0) {
            this.monsters.splice(i, 1);
        }
        return false;
    }

    // Past the campaign's sixteen depths, and not a pinnacle: the ladder (sim/ladder.ts)
    private get ladder(): boolean {
        return onLadder(this.zone.depth, this.zone.pinnacle);
    }

    // A magic pack's mods, all of it the same (or a guard's): one of the campaign's, or on the
    // ladder one or two, none of a leader's, and a volley only for a shooter
    private packMods(def: MonsterDef, rng = this.rng): MonsterMod[] {
        if (!this.ladder) {
            return [rng.pick(CAMPAIGN_MODS)];
        }
        const pool = LADDER_MODS.filter((mod) => !LEADER_MODS.includes(mod) && (def.ranged || !SHOOTER_MODS.includes(mod)));
        const [lo, hi] = LADDER_MOD_COUNTS.magic;
        return this.pickMods(rng, pool, lo + rng.int(hi - lo + 1));
    }

    // So many different mods from a pool
    private pickMods(rng: Rng, pool: MonsterMod[], n: number): MonsterMod[] {
        const left = [...pool];
        const out: MonsterMod[] = [];
        while (out.length < n && left.length > 0) {
            out.push(left.splice(rng.int(left.length), 1)[0]);
        }
        return out;
    }

    // `own`: an encounter's, as strong as its own kind is against the campaign's, not its host's
    private spawnMonster(def: MonsterDef, rank: MonsterRank, at: Spot, pack: number, mods: MonsterMod[] = [], own = false): Monster {
        const rng = this.rng;
        const boss = rank === "boss" ? (def as BossDef) : undefined;
        if (rank === "rare" && this.ladder) {
            // On the ladder three or four, of all of them
            const [lo, hi] = LADDER_MOD_COUNTS.rare;
            mods = this.pickMods(
                rng,
                LADDER_MODS.filter((mod) => def.ranged || !SHOOTER_MODS.includes(mod)),
                lo + rng.int(hi - lo + 1),
            );
        } else if (rank === "rare") {
            const MODS = CAMPAIGN_MODS;
            const first = rng.pick(MODS);
            let second = rng.pick(MODS);
            if (second === first) {
                second = MODS[(MODS.indexOf(first) + 1) % MODS.length];
            }
            mods = this.level >= 12 && rng.chance(0.5) ? [first, second, rng.pick(MODS.filter((m) => m !== first && m !== second))] : [first, second];
        }
        const level = this.level + (rank === "rare" ? 1 : rank === "boss" ? 2 : 0) + (rng.chance(0.3) ? 1 : 0);
        const rankLife = { normal: 1, magic: 1.6, rare: 3.6, boss: 1 }[rank];
        const rankDamage = { normal: 1, magic: 1.15, rare: 1.3, boss: 1 }[rank];
        // The rift's modifiers, over every monster, and the guardian's own over it
        const e = this.effect;
        // A guardian met again on a later lap is more than its first self, so a lap's first isn't
        // easier than the last one's last
        const lap = Math.floor((Math.max(1, this.zone.depth) - 1) / ZONES.length);
        const lapLife = boss ? 1 + GUARDIAN_LAP.life * lap : 1;
        const lapDamage = boss ? 1 + GUARDIAN_LAP.damage * lap : 1;
        // On the ladder, its host's or its guardian's evening out (sim/ladder.ts)
        const might = own ? ownMight(def, boss !== undefined) : ladderMight(this.zone.depth, this.zone.seed, this.zone.pinnacle, def, boss !== undefined);
        // A pinnacle's flock, weaker than its depth's (the Coop's)
        const flock = !boss && this.zone.pinnacle ? PINNACLES[this.zone.pinnacle].flock : undefined;
        let life = def.life * might.life * (flock?.life ?? 1) * monsterLifeScale(level) * rankLife * lapLife * (1 + e.monsterLife) * (boss ? 1 + e.bossLife : 1);
        let damageMult = might.damage * (flock?.damage ?? 1) * monsterDamageScale(level) * rankDamage * lapDamage * (1 + e.monsterDamage) * (boss ? 1 + e.bossDamage : 1);
        let armour = def.armour * monsterArmourScale(level) * (1 + e.monsterArmour) + 12 * e.monsterArmour;
        let speed = def.speed * (1 + e.monsterSpeed);
        let attackSeconds = def.attackSeconds / (1 + e.monsterSpeed);
        let size = rank === "rare" ? 1.12 : 1;
        for (const mod of mods) {
            if (mod === "hasted") {
                speed *= 1.35;
                attackSeconds /= 1.3;
            } else if (mod === "armoured") {
                armour = armour * 2 + 15;
            } else if (mod === "berserk") {
                damageMult *= 1.5;
            } else if (mod === "colossal") {
                life *= 1.6;
                size *= 1.22;
            } else if (mod === "infernal") {
                damageMult *= 1 + MOD.infernal.more;
            }
        }
        const attackTicks = Math.max(10, seconds(attackSeconds));
        const name =
            rank === "rare"
                ? `${rng.pick(RARE_FIRST)}${rng.pick(RARE_SECOND)} ${rng.pick(RARE_TITLES)}`
                : boss
                  ? boss.name
                  : def.name;
        const m: Monster = {
            uid: this.uid++,
            def,
            boss,
            rank,
            name,
            mods,
            level,
            pack,
            x: at.x,
            y: at.y,
            prevX: at.x,
            prevY: at.y,
            yaw: rng.int(2048),
            homeX: at.x,
            homeY: at.y,
            life: Math.round(life),
            maxLife: Math.round(life),
            damage: [def.damage[0] * damageMult, def.damage[1] * damageMult],
            armour,
            speed: speed / TICKS_PER_SECOND,
            attackTicks,
            hitTicks: Math.max(1, Math.round(attackTicks * def.hitAt)),
            radius: def.radius * size,
            size,
            state: "idle",
            actionStart: 0,
            actionEnd: 0,
            actionDone: true,
            frozenUntil: 0,
            stunnedUntil: 0,
            staggerUntil: 0,
            staggerReady: 0,
            knockX: 0,
            knockY: 0,
            chillUntil: 0,
            chill: 0,
            burnUntil: 0,
            burn: 0,
            burnTaken: 0,
            shockUntil: 0,
            hitTick: -999,
            deadTick: 0,
            nextSense: rng.int(10),
            nextSpecial: 0,
            specials: 0,
            specialX: 0,
            specialY: 0,
            moved: false,
            retreating: false,
            xpScale: might.life,
            modNext: {},
        };
        this.monsters.push(m);
        // A guardian that changes form starts in its first, or asleep
        if (boss?.forms) {
            this.shift(m, boss.asleep ? -1 : 0);
        }
        return m;
    }

    // A guardian into one of its forms (-1 its sleeping one): the same guardian, drawn and fighting
    // as the form, till the next is due
    private shift(m: Monster, index: number): void {
        const base = BOSSES[m.def.id as BossId] as BossDef | undefined;
        const form = base ? (index < 0 ? base.asleep : base.forms?.[index]) : undefined;
        if (!base || !form) {
            return;
        }
        const def = formDef(base, form);
        m.def = def;
        m.boss = def;
        m.form = index;
        m.hitTicks = Math.max(1, Math.round(m.attackTicks * def.hitAt));
        m.nextForm = this.tick + seconds(base.formSeconds ?? 12);
        if (index >= 0 && base.formSpot !== undefined) {
            this.emit({ kind: "spot", spot: base.formSpot, x: m.x, y: m.y });
        }
    }

    // ---- The hero's gear changed ----

    // A prayer said, or put out if it's on (content/prayers.ts), in the city or a rift: true if it's
    // on now
    togglePrayer(id: PrayerId): boolean {
        const on = togglePrayer(this.heroData, id);
        this.refreshStats();
        return on;
    }

    // Gear, gems or passives changed: the stats and skills again, life and mana kept as shares
    refreshStats(): void {
        const before = this.stats;
        const hireBefore = this.hireStats;
        this.hireStats = hirelingStats(this.heroData);
        this.syncHireling(hireBefore);
        this.stats = heroStats(this.heroData, this.town ? undefined : this.heroState());
        this.skills = resolveSkills(this.heroData, this.stats);
        const h = this.hero;
        const share = (v: number, max: number) => (max > 0 ? v / max : 1);
        h.life = Math.min(this.stats.maxLife, share(h.life, before.maxLife) * this.stats.maxLife);
        h.mana = Math.min(this.stats.maxMana, share(h.mana, before.maxMana) * this.stats.maxMana);
    }

    // How the hero's doing, for the stats that hang on it (hero.ts HeroState)
    heroState(): HeroState {
        const h = this.hero;
        const t = this.tick;
        const recent = (at: number, secs: number) => t - at < seconds(secs);
        let buffed = false;
        let blessed = false;
        for (const b of h.buffs) {
            if (t < b.until) {
                if (b.id.startsWith("shrine:")) {
                    blessed = true;
                } else if (!b.id.startsWith("trait:") && !b.id.startsWith("potion")) {
                    buffed = true;
                }
            }
        }
        const max = this.stats.maxLife;
        return {
            killedRecently: recent(this.lastKill, RECENTLY.killed),
            hitRecently: recent(h.hurtTick, RECENTLY.hit),
            evadedRecently: recent(this.lastEvade, RECENTLY.evaded),
            movedRecently: recent(this.lastMoved, RECENTLY.moved),
            lowLife: h.life <= max * 0.5,
            fullLife: h.life >= max - 0.01,
            buffed,
            flasked: t < this.potionUntil || t < h.lifePotionUntil || t < h.manaPotionUntil,
            blessed,
            thralls: this.minions.length,
        };
    }

    // The stats made again when what some of them hang on has changed since
    private watchState(): void {
        const hangs = this.stats.hangsOn;
        if (hangs.length === 0 && this.stateKey === "") {
            return;
        }
        const s = this.heroState();
        let key = "";
        for (const w of hangs) {
            key += w === "perThrall" ? `${Math.min(THRALLS_COUNTED, s.thralls)},` : s[w as Exclude<keyof HeroState, "thralls">] ? "1" : "0";
        }
        if (key !== this.stateKey) {
            this.stateKey = key;
            this.refreshStats();
        }
    }

    // What the buffs on the hero now add up to, of one of their numbers
    buffTotal(key: "damagePct" | "attackSpeedPct" | "moveSpeedPct" | "armourPct" | "lessDamageTaken" | "evade" | "manaCostLess" | "elementalLess"): number {
        let total = 0;
        for (const b of this.hero.buffs) {
            if (this.tick < b.until) {
                total += b[key] ?? 0;
            }
        }
        return total;
    }

    // The buffs' more damage (Overload's, a Zamorak brew's), one on another, and their increased
    // damage with a skill's tags (a combat potion's)
    private buffMore(skill: ResolvedSkill): number {
        let more = 1;
        let tagged = 0;
        for (const b of this.hero.buffs) {
            if (this.tick < b.until) {
                more *= 1 + (b.more ?? 0);
                if (b.tag && b.tagPct && skill.tags.has(b.tag)) {
                    tagged += b.tagPct;
                }
            }
        }
        return more * (1 + tagged / 100);
    }

    // What a skill costs now, a buff's less mana (Liquid adrenaline's) taken off
    private manaCost(skill: ResolvedSkill): number {
        const less = Math.min(0.8, this.buffTotal("manaCostLess"));
        return less > 0 ? Math.round(skill.mana * (1 - less)) : skill.mana;
    }

    // ---- A tick ----

    step(input: GameInput): void {
        this.tick++;
        const h = this.hero;
        h.prevX = h.x;
        h.prevY = h.y;
        for (const m of this.monsters) {
            m.prevX = m.x;
            m.prevY = m.y;
        }
        for (const p of this.projectiles) {
            p.prevX = p.x;
            p.prevY = p.y;
        }
        for (const p of this.people) {
            p.prevX = p.x;
            p.prevY = p.y;
        }
        for (const t of this.minions) {
            t.prevX = t.x;
            t.prevY = t.y;
        }
        if (this.hireling) {
            this.hireling.prevX = this.hireling.x;
            this.hireling.prevY = this.hireling.y;
        }
        this.hash.clear();
        for (const m of this.monsters) {
            if (m.state !== "dead") {
                this.hash.insert(m);
            }
        }
        if (!h.dead) {
            this.stepHero(input);
        }
        this.stepPeople();
        this.auras();
        this.stepMonsters();
        if (this.ladder || this.colosseum || this.tombs) {
            this.stepEncounters();
        }
        this.stepMinions();
        this.stepHireling();
        this.stepProjectiles();
        this.stepStrikes();
        this.stepAilments();
        this.stepTraits();
        if (!h.dead) {
            this.collectGold();
        }
        this.stepClock();
    }

    // ---- The rift's time ----

    // The seconds left before the rift collapses; Infinity in the city or once it's cleared
    get timeLeft(): number {
        if (this.timeLimit <= 0 || this.portalOpen) {
            return Infinity;
        }
        return Math.max(0, (this.timeLimit - this.tick) / TICKS_PER_SECOND);
    }

    private stepClock(): void {
        if (this.timeLimit <= 0 || this.portalOpen || this.collapsed || this.hero.dead) {
            return;
        }
        const left = this.timeLimit - this.tick;
        for (const warning of RIFT_TIME.warnings) {
            if (left === seconds(warning)) {
                this.emit({ kind: "riftTime", seconds: warning });
            }
        }
        if (left <= 0) {
            this.collapsed = true;
            this.hero.action = undefined;
            this.hero.goal = undefined;
            this.emit({ kind: "riftCollapsed" });
        }
    }

    // ---- The hero ----

    private skill(index: number): ResolvedSkill | undefined {
        return this.skills[index];
    }

    private stepHero(input: GameInput): void {
        const h = this.hero;
        if (!this.town) {
            this.watchState();
        }
        const stats = this.stats;
        // Life and mana come back, and a potion's more, and Redemption's; Overload's cost goes out
        const mend = (this.tick < h.lifePotionUntil ? h.lifePotionRate : 0) + (this.tick < this.mendUntil ? this.mendRate : 0);
        const life = h.life + stats.lifeRegen / TICKS_PER_SECOND + mend;
        // Of Overflow's: life past full into a ward while it works
        if (life > stats.maxLife && this.tick < this.overflow.until) {
            this.addWard(life - stats.maxLife, this.overflow.most);
        }
        h.life = Math.min(stats.maxLife, life);
        if (this.tick < this.bleedUntil) {
            h.life = Math.max(1, h.life - this.bleedRate);
        }
        h.mana = Math.min(stats.maxMana, h.mana + stats.manaRegen / TICKS_PER_SECOND + (this.tick < h.manaPotionUntil ? h.manaPotionRate : 0));
        if (h.ward > 0) {
            h.ward = Math.max(0, h.ward - h.wardFade);
        }
        if (h.buffs.length > 0 && h.buffs.some((b) => this.tick >= b.until)) {
            h.buffs = h.buffs.filter((b) => this.tick < b.until);
        }
        // An elixir's time runs only in the rifts
        const elixir = this.heroData.elixir;
        if (elixir && !this.town) {
            elixir.left -= 1 / TICKS_PER_SECOND;
            if (elixir.left <= 0) {
                delete this.heroData.elixir;
                this.refreshStats();
                this.emit({ kind: "elixirGone" });
            }
        }
        if (input.potion >= 0 && input.potion < BELT_SIZE) {
            this.drink(input.potion);
        }
        const keys = input.moveX !== 0 || input.moveY !== 0;
        // The teleport home: standing still while it gathers, and anything else done breaks it
        if (input.teleport && !this.town && !h.channel) {
            this.startChannel();
        }
        if (h.channel && !input.teleport) {
            const ordered =
                keys ||
                input.command !== undefined ||
                input.targetUid >= 0 ||
                (input.walkTo && input.hasAim && !input.standing) ||
                (input.hasAim && input.skills.some((held) => held));
            if (ordered) {
                this.breakChannel("moved");
            }
        }
        if (h.channel) {
            h.moving = false;
            if (this.tick >= h.channel.end) {
                h.channel = undefined;
                this.emit({ kind: "home", how: "teleport" });
            }
            return;
        }
        // Orders: a click sets a goal; keys walking cancel it
        const command = input.command;
        if (command) {
            h.goal = command.kind === "pick" || command.kind === "talk" || command.kind === "feature" ? { kind: command.kind, uid: command.uid } : { kind: command.kind };
        }
        const goal = h.goal;
        if (keys) {
            h.goal = undefined;
        } else if (input.targetUid >= 0) {
            if (goal?.kind === "attack" && goal.uid === input.targetUid && goal.skill === 0) {
                goal.held = true;
            } else {
                h.goal = { kind: "attack", uid: input.targetUid, held: true, skill: 0, struck: false };
            }
        } else if (input.walkTo && input.hasAim && !input.standing) {
            h.goal = this.walkGoal(input.aimX, input.aimY);
        } else if (goal?.kind === "attack") {
            // Let go: a click's one blow, so it's still to come if it hasn't been struck yet
            goal.held = goal.skill > 0 && input.skills[goal.skill];
            if (!goal.held && goal.struck) {
                h.goal = undefined;
            }
        }

        // What's being cast, if anything, plays out
        const action = h.action;
        if (action) {
            if (!action.fired && this.tick >= action.hitAt) {
                action.fired = true;
                this.fire(action);
            }
            if (this.tick >= action.end) {
                h.action = undefined;
            }
        }
        // Walking doesn't stop a use: the hero goes on moving while they swing or cast, slower
        // (HERO.castMoveShare), facing where it's aimed, and the skill plays out as it was begun.

        if (!this.town) {
            this.useSkills(input, keys);
        }

        // Moving, at a share of the pace while using a skill
        const rules = this.rules;
        // (Graceful's at their full pace)
        const using = h.action ? (stats.keystones.has("graceful") ? 1 : HERO.castMoveShare) : 1;
        rules.speed = ((stats.moveSpeed * (1 + this.buffTotal("moveSpeedPct") / 100)) / TICKS_PER_SECOND) * using;
        // Chilled, slower; rooted or being pulled, not moving at all
        if (this.tick < this.ailments.chill) {
            rules.speed *= 1 - AILMENTS.chill;
        }
        rules.frozen = this.tick < this.ailments.root || this.pull !== undefined;
        rules.held = false;
        rules.faces = h.action ? { x: h.action.aimX, y: h.action.aimY } : undefined;
        let mx = input.moveX;
        let my = input.moveY;
        if (!keys) {
            const dir = this.goalStep();
            mx = dir.x;
            my = dir.y;
        }
        h.moving = moveCharacter(this.grid, h, mx, my, rules);
        // A step counts as moving, as a blink or a leap does (Agility Shortcut, Light Feet)
        if (h.moving) {
            this.lastMoved = this.tick;
        }
    }

    // Where a click on the ground walks to: the spot itself, or the nearest the hero can stand
    // when it's on a wall, a tree or water, so they walk up to it rather than into it
    private walkGoal(x: number, y: number): Goal {
        if (!isCircleFree(this.grid, x, y, HERO.radius)) {
            const spot = findFreeSpot(this.grid, x, y, HERO.radius, undefined, 3);
            x = spot.x;
            y = spot.y;
        }
        return { kind: "walk", x, y };
    }

    // The right button, Q and E, used where the mouse is, and the left there too with Shift. One
    // pressed while the hero's busy is remembered a moment and used as soon as they're free, so a
    // press is never lost to the end of a swing. Only a press: a button still down from the one
    // that began the swing isn't another, or every click would be used twice.
    // While the keys walk the hero, the left button is its skill too, as it is in Path of Exile's
    // WASD mode: used at the mouse, or the monster under it, from where the hero's walking.
    private useSkills(input: GameInput, keys: boolean): void {
        const h = this.hero;
        // Used where they are, without walking up first: with Shift, or while the keys walk them
        const inPlace = input.standing || keys;
        for (let i = 0; i < input.skills.length; i++) {
            this.skillsPressed[i] = input.skills[i] && !this.skillsDown[i];
            this.skillsDown[i] = input.skills[i];
        }
        if (h.queued && this.tick > h.queued.until) {
            h.queued = undefined;
        }
        const goal = h.goal;
        // Held on a monster the hero's already going for, it's the goal's to use
        const pressed = (i: number) =>
            input.hasAim &&
            (i === 0 ? input.skills[0] && inPlace : input.skills[i]) &&
            !(goal?.kind === "attack" && goal.skill === i && !inPlace);
        const action = h.action;
        if (action || this.tick < h.recoverUntil) {
            for (const i of SKILL_ORDER) {
                if (this.skillsPressed[i] && pressed(i)) {
                    // A blink or a leap that's ready goes at once, out of whatever the hero was doing
                    const skill = this.skill(i);
                    if (skill && escapes(skill.def) && this.tick >= h.ready[i] && this.canUse(i)) {
                        this.cutAction();
                        h.queued = undefined;
                        this.useSkill(i, input.aimX, input.aimY, input.aimUid, inPlace, true);
                        return;
                    }
                    const until = action ? action.end : h.recoverUntil;
                    h.queued = { skill: i, until: until + seconds(HERO.queueSeconds), aimX: input.aimX, aimY: input.aimY, aimUid: input.aimUid };
                    break;
                }
            }
            return;
        }
        const queued = h.queued;
        if (queued) {
            h.queued = undefined;
            const aim = input.hasAim ? input : queued;
            if (this.useSkill(queued.skill, aim.aimX, aim.aimY, aim.aimUid, inPlace, false)) {
                return;
            }
        }
        for (const i of SKILL_ORDER) {
            if (pressed(i) && this.useSkill(i, input.aimX, input.aimY, input.aimUid, inPlace, true)) {
                return;
            }
        }
    }

    // A skill used at the mouse, or at the monster under it, where it stands. A blow that can't
    // reach it walks up to it first, unless Shift keeps the hero where they are.
    private useSkill(index: number, aimX: number, aimY: number, aimUid: number, standing: boolean, held: boolean): boolean {
        const skill = this.skill(index);
        if (!skill) {
            return false;
        }
        const target = aimUid >= 0 ? this.monsterByUid(aimUid) : undefined;
        if (!target || target.state === "dead" || skill.def.kind === "blink" || skill.def.kind === "leap") {
            return this.tryCast(index, aimX, aimY, -1);
        }
        const h = this.hero;
        const melee = isMelee(skill.def);
        const far = fm.hypot(target.x - h.x, target.y - h.y) > this.reachOf(skill, target);
        if ((melee || flies(skill.def)) && !standing && (far || (!melee && !canSee(this.grid, h.x, h.y, target.x, target.y)))) {
            if (!this.canUse(index)) {
                return false;
            }
            h.goal = { kind: "attack", uid: target.uid, held, skill: index, struck: false };
            return true;
        }
        return this.tryCast(index, target.x, target.y, target.uid);
    }

    // How near a monster the hero has to be to use a skill on it: a blow's reach, or a shot's
    // range less a little (and never from too far off to see)
    private reachOf(skill: ResolvedSkill, m: Monster): number {
        return isMelee(skill.def) ? skill.range + m.radius : Math.min(skill.range - 1, 11);
    }

    // Open to the hero and paid for (whether it's ready is another thing)
    private canUse(index: number): boolean {
        const skill = this.skill(index);
        return !!skill && !skill.why && this.hero.mana >= this.manaCost(skill) && (skill.life === 0 || this.hero.life > skill.life);
    }

    private startChannel(): void {
        const h = this.hero;
        h.goal = undefined;
        h.queued = undefined;
        h.action = undefined;
        h.moving = false;
        h.channel = { start: this.tick, end: this.tick + seconds(hasHilt(this.heroData, "teleport") ? HILT.teleportSeconds : HERO.teleportSeconds) };
        this.emit({ kind: "channel" });
    }

    // The use under way cut short: called off and paid back before its blow; after it, done with,
    // but nothing else till it would have ended (recoverUntil)
    private cutAction(): void {
        const h = this.hero;
        const a = h.action;
        if (!a) {
            return;
        }
        if (a.fired) {
            h.recoverUntil = Math.max(h.recoverUntil, a.end);
        } else {
            h.mana = Math.min(this.stats.maxMana, h.mana + a.paidMana);
            h.life = Math.min(this.stats.maxLife, h.life + a.paidLife);
            h.ready[a.skill] = a.wasReady;
        }
        h.action = undefined;
        h.queued = undefined;
    }

    private breakChannel(why: "hit" | "moved"): void {
        if (this.hero.channel) {
            this.hero.channel = undefined;
            this.emit({ kind: "channelBroken", why });
        }
    }

    // Where the hero's goal takes them this tick, as a direction (0, 0 to stop)
    private goalStep(): { x: number; y: number } {
        const h = this.hero;
        const goal = h.goal;
        const none = { x: 0, y: 0 };
        if (!goal) {
            return none;
        }
        let tx: number;
        let ty: number;
        let stop: number;
        if (goal.kind === "walk") {
            tx = goal.x;
            ty = goal.y;
            stop = 0.15;
        } else if (goal.kind === "attack") {
            const m = this.monsterByUid(goal.uid);
            if (!m || m.state === "dead") {
                h.goal = undefined;
                return none;
            }
            tx = m.x;
            ty = m.y;
            const skill = this.skill(goal.skill);
            if (!skill) {
                h.goal = undefined;
                return none;
            }
            const d = fm.hypot(m.x - h.x, m.y - h.y);
            if (d <= this.reachOf(skill, m) && (isMelee(skill.def) || canSee(this.grid, h.x, h.y, m.x, m.y))) {
                const cast = this.tryCast(goal.skill, m.x, m.y, m.uid);
                goal.struck ||= cast;
                // Let go, it's one blow; and nothing to wait for without the mana for it
                if (!goal.held && (cast || !this.canUse(goal.skill))) {
                    h.goal = undefined;
                }
                return none;
            }
            stop = 0;
        } else if (goal.kind === "pick") {
            const drop = this.drops.find((d) => d.uid === goal.uid);
            if (!drop) {
                h.goal = undefined;
                return none;
            }
            tx = drop.x;
            ty = drop.y;
            if (fm.hypot(tx - h.x, ty - h.y) <= HERO.reach) {
                this.pickUp(drop);
                h.goal = undefined;
                return none;
            }
            stop = 0;
        } else if (goal.kind === "talk") {
            const p = this.personByUid(goal.uid);
            if (!p) {
                h.goal = undefined;
                return none;
            }
            tx = p.x;
            ty = p.y;
            if (fm.hypot(tx - h.x, ty - h.y) <= HERO.talkReach) {
                h.goal = undefined;
                h.yaw = yawFromVector(p.x - h.x, p.y - h.y);
                p.talkTick = this.tick;
                p.moving = false;
                p.yaw = yawFromVector(h.x - p.x, h.y - p.y);
                this.emit({ kind: "talk", person: p });
                return none;
            }
            stop = 0;
        } else if (goal.kind === "feature") {
            const f = this.featureByUid(goal.uid);
            if (!f || f.used) {
                h.goal = undefined;
                return none;
            }
            // Up to the spot beside it, and used from within reach of its edge
            tx = f.stand.x;
            ty = f.stand.y;
            if (fm.hypot(f.x - h.x, f.y - h.y) <= HERO.talkReach + (f.size - 1) / 2) {
                h.goal = undefined;
                h.yaw = yawFromVector(f.x - h.x, f.y - h.y);
                this.useFeature(f);
                return none;
            }
            stop = 0;
        } else if (goal.kind === "orrery") {
            const o = this.zone.town?.orrery;
            if (!o) {
                h.goal = undefined;
                return none;
            }
            tx = o.x;
            ty = o.y;
            if (fm.hypot(tx - h.x, ty - h.y) <= ORRERY.reach) {
                h.goal = undefined;
                h.yaw = yawFromVector(o.x - h.x, o.y - h.y);
                this.emit({ kind: "orrery" });
                return none;
            }
            stop = 0;
        } else if (goal.kind === "waystone") {
            const w = this.layout.waystone;
            tx = w.x;
            ty = w.y;
            if (this.town) {
                h.goal = undefined;
                return none;
            }
            if (fm.hypot(tx - h.x, ty - h.y) <= HERO.talkReach) {
                h.goal = undefined;
                this.emit({ kind: "home", how: "waystone" });
                return none;
            }
            stop = 0;
        } else {
            const e = this.layout.exit;
            tx = e.x;
            ty = e.y;
            if (fm.hypot(tx - h.x, ty - h.y) <= HERO.portalReach) {
                h.goal = undefined;
                this.emit(this.portalOpen ? { kind: "portal" } : { kind: "sealed" });
                return none;
            }
            stop = 0;
        }
        const dx = tx - h.x;
        const dy = ty - h.y;
        const d = fm.hypot(dx, dy);
        if (d <= stop) {
            if (goal.kind === "walk") {
                h.goal = undefined;
            }
            return none;
        }
        // Straight there if nothing's in the way; round it by the field if something is
        if (d < 2 || canWalkStraight(this.grid, h.x, h.y, tx, ty)) {
            return { x: dx / d, y: dy / d };
        }
        const gx = Math.floor(tx);
        const gy = Math.floor(ty);
        const moving = goal.kind === "attack";
        if (this.heroField.targetX !== gx || this.heroField.targetY !== gy) {
            if (this.tick - this.heroFieldTick >= (moving ? 12 : 3)) {
                this.heroField.update(this.grid, gx, gy);
                this.heroFieldTick = this.tick;
            }
        }
        if (this.heroField.getStep(this.grid, Math.floor(h.x), Math.floor(h.y), this.stepOut)) {
            const sx = Math.floor(h.x) + this.stepOut.x + 0.5 - h.x;
            const sy = Math.floor(h.y) + this.stepOut.y + 0.5 - h.y;
            const sd = fm.hypot(sx, sy);
            if (sd > 0.001) {
                return { x: sx / sd, y: sy / sd };
            }
        }
        return { x: dx / d, y: dy / d };
    }

    private castTicks(skill: ResolvedSkill): number {
        const speed = skill.speed * (1 + this.buffTotal("attackSpeedPct") / 100);
        return Math.max(8, Math.round((TICKS_PER_SECOND * skill.def.castTime) / speed));
    }

    // Starts a skill if it can be: open, ready and paid for
    private tryCast(index: number, aimX: number, aimY: number, targetUid: number): boolean {
        const h = this.hero;
        if (h.action) {
            return false;
        }
        const skill = this.skill(index);
        if (!skill || this.tick < h.ready[index]) {
            return false;
        }
        if (this.tick < h.recoverUntil && !escapes(skill.def)) {
            return false;
        }
        if (skill.why) {
            if (this.tick - this.cantUseTick > seconds(1.2)) {
                this.cantUseTick = this.tick;
                this.emit({ kind: "cantUse", why: `${skill.def.name}: ${skill.why}` });
            }
            return false;
        }
        const mana = this.manaCost(skill);
        if (h.mana < mana || (skill.life > 0 && h.life <= skill.life)) {
            if (this.tick - this.noManaTick > seconds(1.2)) {
                this.noManaTick = this.tick;
                this.emit(skill.life > 0 ? { kind: "cantUse", why: "Not enough life." } : { kind: "noMana" });
            }
            return false;
        }
        h.mana -= mana;
        h.life -= skill.life;
        const ticks = this.castTicks(skill);
        if (aimX === h.x && aimY === h.y) {
            aimY += 0.01;
        }
        h.action = {
            skill: index,
            start: this.tick,
            end: this.tick + ticks,
            hitAt: this.tick + Math.max(1, Math.round(ticks * HIT_SHARE)),
            fired: false,
            aimX,
            aimY,
            targetUid,
            seq: skill.def.seq ?? this.stats.weapon.seq,
            paidMana: mana,
            paidLife: skill.life,
            wasReady: h.ready[index],
        };
        h.ready[index] = this.tick + seconds(skill.cooldown);
        h.yaw = yawFromVector(aimX - h.x, aimY - h.y);
        return true;
    }

    // A hit's damage for a skill: its roll (the weapon's, its share, everything that makes it
    // more), a buff's, low life's (Pain Attunement) and a crit
    rollDamage(skill: ResolvedSkill): { amount: number; crit: boolean } {
        let amount = skill.minHit + this.rng.next() * (skill.maxHit - skill.minHit);
        amount *= (1 + this.buffTotal("damagePct") / 100) * this.damageMore * this.buffMore(skill);
        if (skill.painAttunement && this.hero.life <= this.stats.maxLife * 0.5) {
            amount *= 1.3;
        }
        // Dharok's Curse: the more of their life the hero's missing, the harder their melee
        if (skill.dharok && this.stats.maxLife > 0) {
            amount *= 1 + Math.min(0.8, Math.max(0, 1 - this.hero.life / this.stats.maxLife));
        }
        const crit = this.forceCrit || (skill.critChance > 0 && this.rng.chance(skill.critChance));
        if (crit) {
            amount *= skill.critMulti;
        }
        return { amount, crit };
    }

    private fire(action: Action): void {
        const skill = this.skill(action.skill);
        if (!skill) {
            return;
        }
        const traits = skill.traits;
        // Surging: every so many uses, a sure crit and more
        if (traits?.surging !== undefined) {
            const uses = (this.surges.get(skill.def.id) ?? 0) + 1;
            this.surges.set(skill.def.id, uses % SURGE_EVERY);
            if (uses >= SURGE_EVERY) {
                this.forceCrit = true;
                this.damageMore = 1 + traits.surging;
                this.emit({ kind: "spot", spot: SPOT.blueImpact.impactSpot, x: this.hero.x, y: this.hero.y });
            }
        }
        this.cast(skill, action);
        this.forceCrit = false;
        this.damageMore = 1;
        // Echoing: the same again a moment later, weaker, where it was aimed (an echo doesn't echo)
        if (traits?.echo !== undefined) {
            this.echoes.push({
                at: this.tick + seconds(ECHO_SECONDS),
                skill: this.scaled(skill, traits.echo, { ...traits, echo: undefined, surging: undefined }),
                aimX: action.aimX,
                aimY: action.aimY,
                targetUid: action.targetUid,
            });
        }
    }

    // A skill's use from where the hero is now: their own, or an echo's
    private cast(skill: ResolvedSkill, action: Action): void {
        const h = this.hero;
        const def = skill.def;
        // Aim at the target where it is now, if there is one
        const target = action.targetUid >= 0 ? this.monsterByUid(action.targetUid) : undefined;
        if (target && target.state !== "dead") {
            action.aimX = target.x;
            action.aimY = target.y;
        }
        const dx = action.aimX - h.x;
        const dy = action.aimY - h.y;
        const d = Math.max(0.001, fm.hypot(dx, dy));
        const dirX = dx / d;
        const dirY = dy / d;
        this.emit({ kind: "cast", skill: def, x: h.x, y: h.y });
        switch (def.kind) {
            case "strike": {
                let best: Monster | undefined;
                if (target && target.state !== "dead" && fm.hypot(target.x - h.x, target.y - h.y) <= skill.range + target.radius + 0.4) {
                    best = target;
                } else {
                    let bestD = Infinity;
                    this.inArc(h.x, h.y, dirX, dirY, skill.range, skill.arc || 70, (m, md) => {
                        if (md < bestD) {
                            bestD = md;
                            best = m;
                        }
                    });
                }
                if (best) {
                    const struck: Monster = best;
                    if (def.visual?.impactSpot !== undefined) {
                        this.emit({ kind: "spot", spot: def.visual.impactSpot, x: struck.x, y: struck.y });
                    }
                    // A flurry's every blow rolled on its own, while there's anything left to hit
                    for (let n = 0; n < skill.hits && struck.state !== "dead"; n++) {
                        const roll = this.rollDamage(skill);
                        this.hitMonster(struck, roll, skill);
                        // A shockwave round what was struck
                        if (skill.splash > 0) {
                            this.hash.query(struck.x, struck.y, 4, (m) => {
                                if (m !== struck && m.state !== "dead" && fm.hypot(m.x - struck.x, m.y - struck.y) <= 1.8 + m.radius) {
                                    this.hitMonster(m, { amount: roll.amount * skill.splash, crit: roll.crit }, skill, struck.x, struck.y);
                                }
                            });
                            this.emit({ kind: "spot", spot: SPOT.dust.impactSpot, x: struck.x, y: struck.y });
                        }
                    }
                }
                break;
            }
            case "cleave": {
                this.inArc(h.x, h.y, dirX, dirY, skill.range, skill.arc || 150, (m) => this.hitMonster(m, this.rollDamage(skill), skill));
                this.emit({ kind: "spot", spot: SPOT.dust.impactSpot, x: h.x + dirX * 1.2, y: h.y + dirY * 1.2 });
                break;
            }
            case "slam":
            case "nova": {
                this.areaHit(h.x, h.y, skill.radius || 3, skill);
                if (def.kind === "slam" && def.visual?.impactSpot !== undefined) {
                    this.emit({ kind: "spot", spot: def.visual.impactSpot, x: h.x, y: h.y });
                }
                break;
            }
            case "buff": {
                const buff = skill.buff!;
                h.buffs = h.buffs.filter((b) => b.id !== def.id);
                h.buffs.push({ ...buff, id: def.id, name: def.name, until: this.tick + seconds(buff.seconds) });
                if (buff.heal) {
                    h.life = Math.min(this.stats.maxLife, h.life + this.stats.maxLife * buff.heal);
                }
                if (def.visual?.impactSpot !== undefined) {
                    this.emit({ kind: "spot", spot: def.visual.impactSpot, x: h.x, y: h.y });
                }
                break;
            }
            case "shoot":
            case "burst": {
                const count = skill.count;
                const arc = def.arc ?? (count > 1 ? 10 * (count - 1) : 0);
                const spread = spreadOf(skill);
                const visual = def.visual ?? this.stats.weapon.arrow ?? SPOT.bronzeArrow;
                const base = fm.atan2(dirY, dirX);
                // A full ring: evenly round the hero, however many there are
                const ring = arc >= 360;
                // One list of who's been hit for the whole fan, if its arrows hit each enemy once
                const shared: number[] | undefined = def.onePerTarget ? [] : undefined;
                for (let i = 0; i < count; i++) {
                    const t = ring ? i / count : count === 1 ? 0 : i / (count - 1) - 0.5;
                    const angle = base + ((t * (ring ? 360 : spread)) / 180) * Math.PI;
                    const roll = this.rollDamage(skill);
                    const returns = skill.traits?.returning !== undefined;
                    this.launch("hero", h.x, h.y, fm.cos(angle), fm.sin(angle), def.speed ?? 15, skill.range, roll.amount, roll.crit, visual, {
                        returns,
                        pierce: returns ? 99 : skill.pierce,
                        splash: def.kind === "burst" ? skill.radius || 2 : 0,
                        skill,
                        chain: def.kind === "burst" ? 0 : skill.chain,
                        hit: shared,
                    });
                }
                break;
            }
            case "rain": {
                let x = action.aimX;
                let y = action.aimY;
                if (d > skill.range) {
                    x = h.x + dirX * skill.range;
                    y = h.y + dirY * skill.range;
                }
                const fall = (fx: number, fy: number, later: number) => {
                    const roll = this.rollDamage(skill);
                    this.strikes.push({
                        uid: this.uid++,
                        side: "hero",
                        x: fx,
                        y: fy,
                        radius: skill.radius || 3,
                        damage: roll.amount,
                        crit: roll.crit,
                        start: this.tick,
                        land: this.tick + Math.max(1, seconds(def.delay ?? 0.4)) + later,
                        visual: def.visual ?? SPOT.dragonArrow,
                        stun: 0,
                        freeze: 0,
                        shows: def.shows ?? 7,
                        skill,
                    });
                };
                fall(x, y, 0);
                // Cascading: more of it, one after another, on along the way it was aimed
                const cascade = skill.traits?.cascade ?? 0;
                for (let i = 1; i <= cascade; i++) {
                    const along = (skill.radius || 3) * 1.4 * i;
                    const cx = x + dirX * along;
                    const cy = y + dirY * along;
                    if (!this.reachable(cx, cy)) {
                        break;
                    }
                    fall(cx, cy, seconds(0.22 * i));
                }
                break;
            }
            case "arc": {
                this.arc(skill, action, dirX, dirY);
                break;
            }
            case "summon": {
                this.summon(skill, action, dirX, dirY, Math.min(d, 1.6));
                break;
            }
            case "blink":
            case "leap": {
                let x = action.aimX;
                let y = action.aimY;
                if (d > skill.range) {
                    x = h.x + dirX * skill.range;
                    y = h.y + dirY * skill.range;
                }
                const spot = findFreeSpot(this.grid, x, y, HERO.radius, undefined, 4);
                if (isCircleFree(this.grid, spot.x, spot.y, HERO.radius) && this.reachable(spot.x, spot.y)) {
                    if (def.kind === "blink") {
                        this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: h.x, y: h.y });
                    }
                    h.x = spot.x;
                    h.y = spot.y;
                    h.prevX = spot.x;
                    h.prevY = spot.y;
                    h.goal = undefined;
                    this.lastMoved = this.tick;
                    if (def.kind === "blink") {
                        this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: h.x, y: h.y });
                    } else {
                        // Down on everything where it lands
                        this.areaHit(h.x, h.y, skill.radius || 2, skill);
                        if (def.visual?.impactSpot !== undefined) {
                            this.emit({ kind: "spot", spot: def.visual.impactSpot, x: h.x, y: h.y });
                        }
                        if (def.visual?.sound !== undefined) {
                            this.emit({ kind: "sound", id: def.visual.sound, x: h.x, y: h.y, volume: 0.6 });
                        }
                    }
                } else {
                    // Nowhere to go: the mana back
                    h.mana = Math.min(this.stats.maxMana, h.mana + action.paidMana);
                    h.life = Math.min(this.stats.maxLife, h.life + skill.life);
                    h.ready[action.skill] = this.tick;
                }
                break;
            }
        }
    }

    // ---- The hero's thralls ----

    // One risen beside the hero, towards where they aimed; past the most there can be at once,
    // the oldest crumbles
    private summon(skill: ResolvedSkill, action: Action, dirX: number, dirY: number, reach: number): void {
        const summon = skill.summon!;
        const h = this.hero;
        const def = summon.def;
        const mine = this.minions.filter((t) => t.def.id === def.id && !t.fallen);
        for (let i = 0; i + summon.max <= mine.length; i++) {
            mine[i].until = this.tick;
        }
        const spot = findFreeSpot(this.grid, h.x + dirX * reach, h.y + dirY * reach, def.radius, undefined, 4);
        const at = this.reachable(spot.x, spot.y) ? spot : { x: h.x, y: h.y };
        this.minions.push({
            uid: this.uid++,
            def,
            x: at.x,
            y: at.y,
            prevX: at.x,
            prevY: at.y,
            yaw: yawFromVector(dirX, dirY),
            born: this.tick,
            until: this.tick + seconds(summon.seconds),
            target: action.targetUid,
            attackStart: -999,
            attackHit: -999,
            attackEnd: -999,
            struck: true,
            moving: false,
            stuck: 0,
            skill,
            scale: summon.scale,
            quick: summon.quick,
        });
        const v = skill.def.visual;
        if (v?.impactSpot !== undefined) {
            this.emit({ kind: "spot", spot: v.impactSpot, x: at.x, y: at.y });
        }
        if (v?.sound !== undefined) {
            this.emit({ kind: "sound", id: v.sound, x: at.x, y: at.y, volume: 0.5 });
        }
    }

    private stepMinions(): void {
        const h = this.hero;
        let w = 0;
        for (const t of this.minions) {
            if (h.dead || this.tick >= t.until) {
                const v = t.skill.def.visual;
                if (v?.impactSpot !== undefined) {
                    this.emit({ kind: "spot", spot: v.impactSpot, x: t.x, y: t.y });
                }
                // The Skull sceptre's (items.ts): it bursts as it crumbles
                if (!h.dead && this.stats.powers.has("thrallBurst")) {
                    this.traitStrike(t.x, t.y, THRALL_BURST.radius, this.scaled(t.skill, THRALL_BURST.share), { impactSpot: SPOT.dragonArrow.impactSpot, sound: SPOT.stomp.sound }, 0.05);
                }
                continue;
            }
            this.minions[w++] = t;
            this.stepMinion(t);
        }
        this.minions.length = w;
    }

    private stepMinion(t: Minion): void {
        const h = this.hero;
        const def = t.def;
        t.moving = false;
        let target = t.target >= 0 ? this.monsterByUid(t.target) : undefined;
        // A blow under way
        if (this.tick < t.attackEnd) {
            if (target && target.state !== "dead") {
                t.yaw = yawFromVector(target.x - t.x, target.y - t.y);
                if (!t.struck && this.tick >= t.attackHit) {
                    t.struck = true;
                    // Heard on the blow, as the hero's and the monsters' are
                    this.emit({ kind: "sound", id: def.sounds.attack, x: t.x, y: t.y, volume: 0.3 });
                    if (fm.hypot(target.x - t.x, target.y - t.y) <= def.reach * t.scale + target.radius + 0.5) {
                        this.hitMonster(target, this.rollDamage(t.skill), t.skill, t.x, t.y);
                    }
                }
            }
            return;
        }
        // Left behind, or stuck on something: up beside the hero again
        const fromHero = fm.hypot(h.x - t.x, h.y - t.y);
        if (fromHero > 16 || t.stuck > seconds(1.5)) {
            const spot = findFreeSpot(this.grid, h.x, h.y, def.radius, undefined, 4);
            t.x = t.prevX = spot.x;
            t.y = t.prevY = spot.y;
            t.stuck = 0;
            t.target = -1;
            this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: t.x, y: t.y });
            return;
        }
        // What it's going for: the nearest to it of what the hero can see near them, looked for
        // again now and then, and whenever what it had has gone
        const gone = !target || target.state === "dead" || fm.hypot(target.x - h.x, target.y - h.y) > def.leash + 3;
        if (gone || (this.tick + t.uid) % 25 === 0) {
            target = this.minionTarget(t) ?? (gone ? undefined : target);
            t.target = target ? target.uid : -1;
        }
        if (target) {
            const dx = target.x - t.x;
            const dy = target.y - t.y;
            const d = fm.hypot(dx, dy);
            if (d <= def.reach * t.scale + target.radius) {
                t.attackStart = this.tick;
                t.attackHit = this.tick + seconds(def.hitAt / t.quick);
                t.attackEnd = this.tick + seconds(def.attackSeconds / t.quick);
                t.struck = false;
                t.yaw = yawFromVector(dx, dy);
                return;
            }
            this.moveMinion(t, dx / d, dy / d);
        } else if (fromHero > 2.6) {
            this.moveMinion(t, (h.x - t.x) / fromHero, (h.y - t.y) / fromHero);
        } else {
            t.stuck = 0;
        }
    }

    private minionTarget(t: Minion): Monster | undefined {
        const h = this.hero;
        let best: Monster | undefined;
        let bestD = Infinity;
        this.hash.query(h.x, h.y, t.def.leash + 2, (m) => {
            if (m.state === "dead" || fm.hypot(m.x - h.x, m.y - h.y) > t.def.leash) {
                return;
            }
            const d = fm.hypot(m.x - t.x, m.y - t.y);
            if (d < bestD && canSee(this.grid, h.x, h.y, m.x, m.y)) {
                bestD = d;
                best = m;
            }
        });
        return best;
    }

    private moveMinion(t: Minion, dirX: number, dirY: number): void {
        const step = (t.def.speed * t.quick) / TICKS_PER_SECOND;
        const x = t.x;
        const y = t.y;
        moveCircle(this.grid, t, dirX * step, dirY * step, t.def.radius);
        t.yaw = yawFromVector(dirX, dirY);
        t.moving = true;
        t.stuck = fm.hypot(t.x - x, t.y - y) < step * 0.25 ? t.stuck + 1 : 0;
    }

    // ---- The hero's hireling (content/hirelings.ts) ----

    // Beside the hero as they come into a rift or the city, or as it's hired or raised; gone as
    // it's sent away. Its life kept as a share as its numbers change.
    private syncHireling(before?: HirelingStats): void {
        const hire = this.heroData.hireling;
        const s = this.hireStats;
        const a = this.hireling;
        if (!hire || !s || hire.dead) {
            if (a && a.deadTick === undefined) {
                this.hireling = undefined;
            }
            return;
        }
        if (!a || a.kind !== hire.kind || a.deadTick !== undefined) {
            const h = this.hero;
            const spot = findFreeSpot(this.grid, h.x - 1, h.y - 1, HIRELING.radius, undefined, 4);
            this.hireling = {
                uid: this.uid++,
                kind: hire.kind,
                name: hire.name,
                x: spot.x,
                y: spot.y,
                prevX: spot.x,
                prevY: spot.y,
                yaw: h.yaw,
                life: s.maxLife,
                target: -1,
                attackStart: -999,
                attackHit: -999,
                attackEnd: -999,
                struck: true,
                moving: false,
                stuck: 0,
                blows: 0,
                hurtTick: -999,
            };
            return;
        }
        a.name = hire.name;
        a.life = before && before.maxLife > 0 ? Math.min(s.maxLife, (a.life / before.maxLife) * s.maxLife) : s.maxLife;
    }

    private stepHireling(): void {
        const a = this.hireling;
        const s = this.hireStats;
        if (!a || !s) {
            return;
        }
        a.moving = false;
        if (a.deadTick !== undefined) {
            if (this.tick - a.deadTick > seconds(3)) {
                this.hireling = undefined;
            }
            return;
        }
        const h = this.hero;
        const def = s.def;
        a.life = Math.min(s.maxLife, a.life + s.lifeRegen / TICKS_PER_SECOND);
        let target = a.target >= 0 ? this.monsterByUid(a.target) : undefined;
        // A blow under way
        if (this.tick < a.attackEnd) {
            if (target && target.state !== "dead") {
                a.yaw = yawFromVector(target.x - a.x, target.y - a.y);
                if (!a.struck && this.tick >= a.attackHit) {
                    a.struck = true;
                    this.hirelingBlow(a, s, target);
                }
            }
            return;
        }
        // Left behind, or stuck on something: up beside the hero again
        const fromHero = fm.hypot(h.x - a.x, h.y - a.y);
        if (fromHero > HIRELING.recall || a.stuck > seconds(1.5)) {
            const spot = findFreeSpot(this.grid, h.x, h.y, HIRELING.radius, undefined, 4);
            a.x = a.prevX = spot.x;
            a.y = a.prevY = spot.y;
            a.stuck = 0;
            a.target = -1;
            this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: a.x, y: a.y });
            return;
        }
        if (!this.town && !h.dead) {
            const gone = !target || target.state === "dead" || fm.hypot(target.x - h.x, target.y - h.y) > HIRELING.leash + 3;
            if (gone || (this.tick + a.uid) % 25 === 0) {
                target = this.hirelingTarget(a) ?? (gone ? undefined : target);
                a.target = target ? target.uid : -1;
            }
        } else {
            target = undefined;
            a.target = -1;
        }
        if (target) {
            const dx = target.x - a.x;
            const dy = target.y - a.y;
            const d = fm.hypot(dx, dy);
            const reach = def.shot ? def.reach : def.reach + target.radius;
            if (d <= reach && (!def.shot || canSee(this.grid, a.x, a.y, target.x, target.y))) {
                a.attackStart = this.tick;
                a.attackHit = this.tick + Math.max(1, seconds(Math.min(HIRELING.hitAt, s.attackSeconds * 0.5)));
                a.attackEnd = this.tick + Math.max(2, seconds(s.attackSeconds));
                a.struck = false;
                a.yaw = yawFromVector(dx, dy);
                return;
            }
            this.moveHireling(a, def.speed, dx / d, dy / d);
        } else if (fromHero > 2.4) {
            this.moveHireling(a, def.speed, (h.x - a.x) / fromHero, (h.y - a.y) / fromHero);
        } else {
            a.stuck = 0;
        }
    }

    // The nearest it of what the hero can see near them
    private hirelingTarget(a: HirelingActor): Monster | undefined {
        const h = this.hero;
        let best: Monster | undefined;
        let bestD = Infinity;
        this.hash.query(h.x, h.y, HIRELING.leash + 2, (m) => {
            if (m.state === "dead" || m.shielded || fm.hypot(m.x - h.x, m.y - h.y) > HIRELING.leash) {
                return;
            }
            const d = fm.hypot(m.x - a.x, m.y - a.y);
            if (d < bestD && canSee(this.grid, h.x, h.y, m.x, m.y)) {
                bestD = d;
                best = m;
            }
        });
        return best;
    }

    private moveHireling(a: HirelingActor, speed: number, dirX: number, dirY: number): void {
        const step = speed / TICKS_PER_SECOND;
        const x = a.x;
        const y = a.y;
        moveCircle(this.grid, a, dirX * step, dirY * step, HIRELING.radius);
        a.yaw = yawFromVector(dirX, dirY);
        a.moving = true;
        a.stuck = fm.hypot(a.x - x, a.y - y) < step * 0.25 ? a.stuck + 1 : 0;
    }

    // Its blow landing, or its shot let go: its weapon's damage, a crit now and then, and its
    // kind's own (a barbarian's stun)
    private hirelingBlow(a: HirelingActor, s: HirelingStats, target: Monster): void {
        const def = s.def;
        const crit = this.rng.chance(s.critChance);
        const amount = (s.minDamage + this.rng.next() * (s.maxDamage - s.minDamage)) * (crit ? s.critMulti : 1);
        this.emit({ kind: "sound", id: def.sounds.attack, x: a.x, y: a.y, volume: 0.3 });
        if (def.shot) {
            const dx = target.x - a.x;
            const dy = target.y - a.y;
            const d = Math.max(0.001, fm.hypot(dx, dy));
            const shot = def.shot;
            if (shot.visual.castSpot !== undefined) {
                this.emit({ kind: "spot", spot: shot.visual.castSpot, x: a.x, y: a.y });
            }
            this.launch("hero", a.x, a.y, dx / d, dy / d, shot.speed, def.reach + 2, amount, crit, shot.visual, { pierce: shot.pierce, splash: shot.splash, ally: true });
            return;
        }
        if (fm.hypot(target.x - a.x, target.y - a.y) > def.reach + target.radius + 0.5) {
            return;
        }
        a.blows++;
        this.hitMonster(target, { amount, crit }, undefined, a.x, a.y, true);
        const bash = def.bash;
        if (bash && a.blows % bash.every === 0 && target.state !== "dead") {
            target.stunnedUntil = Math.max(target.stunnedUntil, this.tick + seconds(target.rank === "boss" ? bash.seconds * 0.35 : bash.seconds));
            this.emit({ kind: "spot", spot: STUN_SPOT, x: target.x, y: target.y, lift: 1.8 });
            if (target.state === "attack" || target.state === "special") {
                target.state = "chase";
                target.hireBlow = false;
                target.foeBlow = false;
            }
        }
    }

    // A monster's turn while the hero's hireling is the nearer it: after it, and its blow or shot
    // at it. A boss keeps to the hero. Whether it was its turn's all.
    private hirelingTurn(m: Monster, dHero: number): boolean {
        if (m.state === "attack" && m.hireBlow) {
            this.blowAtHireling(m);
            return true;
        }
        const a = this.hireling!;
        if (m.state !== "chase" || m.rank === "boss" || a.deadTick !== undefined || m.encounter === "impling") {
            return false;
        }
        const dx = a.x - m.x;
        const dy = a.y - m.y;
        const d = fm.hypot(dx, dy);
        if (!this.hero.dead && d >= dHero - HIRELING.nearer) {
            return false;
        }
        m.yaw = yawFromVector(dx, dy);
        const reach = m.def.ranged ? Math.min(m.def.ranged.range, 6) : m.def.reach * m.size + HIRELING.radius;
        if (d <= reach) {
            m.state = "attack";
            m.hireBlow = true;
            m.actionStart = this.tick;
            m.actionEnd = this.tick + m.attackTicks;
            m.actionDone = false;
            this.emit({ kind: "monsterAttack", monster: m });
            return true;
        }
        if (d > 0.001) {
            this.moveMonster(m, dx / d, dy / d, m.speed);
        }
        return true;
    }

    // A monster's blow at the hireling landing, or its shot let go at it
    private blowAtHireling(m: Monster): void {
        const a = this.hireling;
        if (!m.actionDone && this.tick >= m.actionStart + m.hitTicks) {
            m.actionDone = true;
            this.emit({ kind: "monsterBlow", monster: m });
            if (a && a.deadTick === undefined) {
                const amount = m.damage[0] + this.rng.next() * (m.damage[1] - m.damage[0]);
                const ranged = m.def.ranged;
                const dx = a.x - m.x;
                const dy = a.y - m.y;
                const d = Math.max(0.001, fm.hypot(dx, dy));
                if (ranged) {
                    this.launch("monster", m.x, m.y, dx / d, dy / d, ranged.speed, ranged.range + 3, amount, false, ranged.visual, { owner: m.uid, toHireling: true });
                    if (ranged.visual.sound !== undefined) {
                        this.emit({ kind: "sound", id: ranged.visual.sound, x: m.x, y: m.y, volume: 0.4 });
                    }
                } else if (d <= m.def.reach * m.size + HIRELING.radius + 0.6) {
                    this.hurtHireling(amount, "melee");
                }
            }
        }
        if (this.tick >= m.actionEnd) {
            m.state = "chase";
            m.hireBlow = false;
        }
    }

    // A monster's shot at the hireling: it strikes it, or flies on and falls
    private shotAtHireling(p: Projectile): void {
        const a = this.hireling;
        if (!a || a.deadTick !== undefined) {
            if (p.travelled >= p.range) {
                p.done = true;
            }
            return;
        }
        if (fm.hypot(a.x - p.x, a.y - p.y) > HIRELING.radius + 0.3) {
            return;
        }
        this.hurtHireling(p.damage, isMissile(p.visual) ? "missile" : "magic");
        if (p.visual.impactSpot !== undefined) {
            this.emit({ kind: "spot", spot: p.visual.impactSpot, x: a.x, y: a.y });
        }
        if (p.visual.hitSound !== undefined) {
            this.emit({ kind: "sound", id: p.visual.hitSound, x: a.x, y: a.y, volume: 0.5 });
        }
        p.done = true;
    }

    // A hit on the hireling: the hero's protection prayers' less, its armour, and its fall
    hurtHireling(amount: number, kind: HitKind): number {
        const a = this.hireling;
        const s = this.hireStats;
        if (!a || !s || a.deadTick !== undefined) {
            return 0;
        }
        amount *= 1 - s.protect[kind];
        const taken = Math.max(1, Math.round(amount * (1 - armourReduction(s.armour, amount))));
        a.life -= taken;
        a.hurtTick = this.tick;
        this.emit({ kind: "hirelingHit", amount: taken, x: a.x, y: a.y });
        if (a.life <= 0) {
            a.life = 0;
            a.deadTick = this.tick;
            a.attackEnd = -999;
            a.target = -1;
            this.emit({ kind: "sound", id: s.def.sounds.death, x: a.x, y: a.y, volume: 0.6 });
            this.emit({ kind: "hirelingDied", name: a.name });
            if (this.heroData.hireling) {
                this.heroData.hireling.dead = true;
            }
            // A White Knight's Defiance goes with them
            this.refreshStats();
        }
        return taken;
    }

    // Everything living within a radius of a spot, hit
    private areaHit(x: number, y: number, r: number, skill: ResolvedSkill): void {
        this.hash.query(x, y, r + 2, (m) => {
            if (m.state !== "dead" && fm.hypot(m.x - x, m.y - y) <= r + m.radius) {
                this.hitMonster(m, this.rollDamage(skill), skill, x, y);
            }
        });
        if (skill.traits) {
            this.landed(x, y, r, skill);
        }
    }

    // Lightning: the monster aimed at (or the nearest the aim, in reach), then on to the nearest
    // not yet struck, as many times as it chains
    private arc(skill: ResolvedSkill, action: Action, dirX: number, dirY: number): void {
        const h = this.hero;
        let first: Monster | undefined;
        const aimed = action.targetUid >= 0 ? this.monsterByUid(action.targetUid) : undefined;
        if (aimed && aimed.state !== "dead" && fm.hypot(aimed.x - h.x, aimed.y - h.y) <= skill.range + aimed.radius) {
            first = aimed;
        } else {
            let bestD = Infinity;
            this.inArc(h.x, h.y, dirX, dirY, skill.range, 60, (m) => {
                const md = fm.hypot(m.x - action.aimX, m.y - action.aimY);
                if (md < bestD && canSee(this.grid, h.x, h.y, m.x, m.y)) {
                    bestD = md;
                    first = m;
                }
            });
        }
        const points = [{ x: h.x, y: h.y }];
        if (!first) {
            // Into the air where it was aimed
            const reach = Math.min(skill.range, fm.hypot(action.aimX - h.x, action.aimY - h.y));
            points.push({ x: h.x + dirX * reach, y: h.y + dirY * reach });
            this.emit({ kind: "beam", points });
            return;
        }
        const struck = new Set<number>();
        let at: Monster | undefined = first;
        for (let jump = 0; at && jump <= skill.chain; jump++) {
            const m: Monster = at;
            struck.add(m.uid);
            const from = points[points.length - 1];
            points.push({ x: m.x, y: m.y });
            this.hitMonster(m, this.rollDamage(skill), skill, from.x, from.y);
            if (skill.def.visual?.impactSpot !== undefined) {
                this.emit({ kind: "spot", spot: skill.def.visual.impactSpot, x: m.x, y: m.y });
            }
            at = this.nearestUnhit(m.x, m.y, struck);
        }
        this.emit({ kind: "beam", points });
        if (skill.def.visual?.sound !== undefined) {
            this.emit({ kind: "sound", id: skill.def.visual.sound, x: first.x, y: first.y, volume: 0.5 });
        }
    }

    // The nearest living monster to a spot, in reach and sight, not among these
    private nearestUnhit(x: number, y: number, not: Set<number> | number[]): Monster | undefined {
        let best: Monster | undefined;
        let bestD = CHAIN_REACH;
        const has = (uid: number) => (Array.isArray(not) ? not.includes(uid) : not.has(uid));
        this.hash.query(x, y, CHAIN_REACH + 1, (m) => {
            if (m.state === "dead" || has(m.uid)) {
                return;
            }
            const md = fm.hypot(m.x - x, m.y - y);
            if (md < bestD && canSee(this.grid, x, y, m.x, m.y)) {
                bestD = md;
                best = m;
            }
        });
        return best;
    }

    // Every living monster within range in an arc of `arc` degrees about (dirX, dirY)
    private inArc(x: number, y: number, dirX: number, dirY: number, range: number, arc: number, fn: (m: Monster, d: number) => void): void {
        const cosHalf = fm.cos(((arc / 2) * Math.PI) / 180);
        this.hash.query(x, y, range + 2, (m) => {
            if (m.state === "dead") {
                return;
            }
            const dx = m.x - x;
            const dy = m.y - y;
            const d = fm.hypot(dx, dy);
            if (d > range + m.radius) {
                return;
            }
            // Right on top counts as in front
            if (d > m.radius && (dx * dirX + dy * dirY) / d < cosHalf) {
                return;
            }
            fn(m, d);
        });
    }

    private launch(
        side: "hero" | "monster",
        x: number,
        y: number,
        dirX: number,
        dirY: number,
        speed: number,
        range: number,
        damage: number,
        crit: boolean,
        visual: Visual,
        more: { pierce?: number; splash?: number; skill?: ResolvedSkill; chain?: number; hit?: number[]; returns?: boolean; owner?: number; ally?: boolean; toHireling?: boolean } = {},
    ): void {
        const v = speed / TICKS_PER_SECOND;
        this.projectiles.push({
            uid: this.uid++,
            side,
            x,
            y,
            prevX: x,
            prevY: y,
            startX: x,
            startY: y,
            vx: dirX * v,
            vy: dirY * v,
            range,
            travelled: 0,
            damage,
            crit,
            pierce: more.pierce ?? 0,
            splash: more.splash ?? 0,
            hit: more.hit ?? [],
            visual,
            done: false,
            skill: more.skill,
            chain: more.chain ?? 0,
            returns: more.returns,
            owner: more.owner,
            ally: more.ally,
            toHireling: more.toHireling,
        });
    }

    // A hit on a monster, from a spot (the hero's, unless it's a shot's way or a strike's middle): what
    // it costs it, what it does to it, and its shove and stagger (IMPACT)
    private hitMonster(m: Monster, roll: { amount: number; crit: boolean }, skill?: ResolvedSkill, fromX = this.hero.x, fromY = this.hero.y, ally = false): void {
        if (m.state === "dead") {
            return;
        }
        // A Pest Control portal, shielded till its turn
        if (m.shielded) {
            this.emit({ kind: "monsterHit", uid: m.uid, amount: 0, crit: false, fromX, fromY, share: 0 });
            return;
        }
        const stats = this.stats;
        const shockMore = (stats.keystones.has("tempest") ? TEMPEST.more : SHOCK_MORE) * (1 + stats.shockEffect);
        const shocked = this.tick < m.shockUntil ? 1 + shockMore : 1;
        let raw = roll.amount * shocked * this.versusMore(m, roll.crit, skill);
        // Ahrim's set: now and then a spell hits harder
        if (skill?.tags.has("spell") && stats.powers.has("ahrims") && this.rng.chance(AHRIMS.chance)) {
            raw *= 1 + AHRIMS.more;
        }
        // Verac's set: now and then a melee blow goes through armour and wards
        const through = !!skill?.tags.has("melee") && stats.powers.has("veracs") && this.rng.chance(VERACS.chance);
        // A Shielding monster's packmates take less while it stands; a Warded guardian, while any
        // of its guards does
        const shield = this.shielded.get(m.pack);
        let guarded = shield !== undefined && shield !== m.uid ? 1 - MOD.shielding.less : 1;
        if (m.mods.includes("warded") && (this.packs[m.pack] ?? []).some((o) => o !== m && o.state !== "dead")) {
            guarded *= 1 - MOD.warded.less;
        }
        const reduced = through ? raw : raw * guarded * (1 - armourReduction(m.armour, raw));
        const amount = Math.max(1, Math.round(reduced));
        m.life -= amount;
        // Karil's set: now and then a shot hits again, for half
        if (skill?.tags.has("projectile") && stats.powers.has("karils") && m.life > 0 && this.rng.chance(KARILS.chance)) {
            const again = Math.max(1, Math.round(amount * KARILS.share));
            m.life -= again;
            this.emit({ kind: "monsterHit", uid: m.uid, amount: again, crit: roll.crit, fromX, fromY, share: again / m.maxLife });
        }
        // Torag's set: every hit slows
        if (stats.powers.has("torags")) {
            const slow = m.rank === "boss" ? TORAGS.slow / 2 : TORAGS.slow;
            m.chill = this.tick < m.chillUntil ? Math.max(m.chill, slow) : slow;
            m.chillUntil = Math.max(m.chillUntil, this.tick + seconds(TORAGS.seconds));
        }
        m.hitTick = this.tick;
        if (m.mods.includes("charged")) {
            this.sparks(m);
        }
        // An impling hit lets something fall
        if (m.encounter === "impling" && m.life > 0) {
            this.implingShaken(m);
        }
        const share = amount / m.maxLife;
        this.emit({ kind: "monsterHit", uid: m.uid, amount, crit: roll.crit, fromX, fromY, share });
        this.impact(m, share, roll.crit, fromX, fromY);
        this.emit({ kind: "sound", id: m.def.sounds.hit, x: m.x, y: m.y, volume: 0.5 });
        const h = this.hero;
        const lifeOnHit = skill ? skill.lifeOnHit : this.stats.lifeOnHit;
        const leech = skill ? skill.leech + skill.selfHeal : this.stats.lifeLeech;
        if (!ally) {
            h.life = Math.min(this.stats.maxLife, h.life + lifeOnHit + amount * leech);
        } else if (this.hireling && this.hireStats && this.hireling.deadTick === undefined) {
            // The hireling's own leech, from what it wears
            this.hireling.life = Math.min(this.hireStats.maxLife, this.hireling.life + amount * this.hireStats.leech);
        }
        // Guthan's Warspear (the warrior's wing): now and then a melee hit heals
        if (skill?.tags.has("melee") && stats.powers.has("guthans") && this.rng.chance(GUTHANS.chance)) {
            h.life = Math.min(stats.maxLife, h.life + amount * GUTHANS.heal);
        }
        // A weapon class's attacks earn mana back, a few enemies' worth a tick
        if (skill?.tags.has("attack") && this.stats.manaOnHit > 0) {
            if (this.manaHitTick !== this.tick) {
                this.manaHitTick = this.tick;
                this.manaHits = 0;
            }
            if (this.manaHits < HERO.manaOnHitPerTick) {
                this.manaHits++;
                h.mana = Math.min(this.stats.maxMana, h.mana + this.stats.manaOnHit);
            }
        }
        const def = skill?.def;
        if (def?.visual?.impactSpot !== undefined && (def.kind === "nova" || def.kind === "shoot")) {
            this.emit({ kind: "spot", spot: def.visual.impactSpot, x: m.x, y: m.y });
        }
        const boss = m.rank === "boss";
        const lasting = (secs: number) => this.tick + seconds(boss ? secs * 0.35 : secs);
        let held = false;
        if (skill) {
            if (skill.freeze > 0 || (skill.freezeChance > 0 && this.rng.chance(skill.freezeChance))) {
                m.frozenUntil = Math.max(m.frozenUntil, lasting(skill.freeze > 0 ? skill.freeze : skill.chanceFreeze));
                held = true;
            }
            if (skill.stunFor > 0 || (skill.stun > 0 && this.rng.chance(skill.stun))) {
                m.stunnedUntil = Math.max(m.stunnedUntil, lasting(skill.stunFor > 0 ? skill.stunFor : skill.chanceStun));
                this.emit({ kind: "spot", spot: STUN_SPOT, x: m.x, y: m.y, lift: 1.8 });
                held = true;
            }
            if (skill.ignite > 0 && this.rng.chance(skill.ignite)) {
                this.ignite(m, (amount * BURN_SHARE * skill.burnMore) / seconds(BURN_SECONDS), seconds(BURN_SECONDS * skill.burnLength));
            }
            if (skill.shock > 0 && this.rng.chance(skill.shock)) {
                m.shockUntil = Math.max(m.shockUntil, this.tick + this.shockTicks());
            }
        }
        if (held && (m.state === "attack" || m.state === "special")) {
            m.state = "chase";
        }
        this.wake(m);
        if (m.life > 0 && skill?.cull && m.life <= m.maxLife * (boss ? 0.05 : 0.1)) {
            m.life = 0;
        }
        if (skill?.traits) {
            this.traitsOnHit(m, skill, skill.traits);
        }
        // A chance to cast on a hit, or on a kill; never from a cast that was one
        const procs = !!skill && !skill.proc;
        if (procs && m.life > 0) {
            this.procsFor("strike", m.x, m.y, m.uid);
        }
        if (m.life <= 0) {
            this.kill(m, -m.life / m.maxLife, fromX, fromY, roll.crit);
            if (procs) {
                this.procsFor("kill", m.x, m.y, -1);
            }
            if (skill?.traits) {
                this.traitsOnKill(m, skill, skill.traits);
            }
        }
        // Dragon Claws: a crit lands again, for half, then twice for a quarter
        if (roll.crit && skill?.claws && !this.clawing) {
            this.clawing = true;
            for (const share of CLAWS) {
                this.hitMonster(m, { amount: roll.amount * share, crit: true }, skill, fromX, fromY);
            }
            this.clawing = false;
        }
    }

    // How much more a hit is on an enemy in a state the hero's stats are for (Stats.versus): their
    // increased damage beside the skill's own, and on a crit their crit multiplier beside its
    private versusMore(m: Monster, crit: boolean, skill?: ResolvedSkill): number {
        if (!skill) {
            return 1;
        }
        let damage = 0;
        let critMulti = 0;
        const versus = this.stats.versus;
        for (const when in versus) {
            const v = versus[when as When]!;
            if (this.enemyIs(m, when as When)) {
                damage += v.damage;
                critMulti += v.critMulti;
            }
        }
        if (damage === 0 && critMulti === 0) {
            return 1;
        }
        const base = Math.max(0.01, 1 + skill.increased);
        return ((base + damage) / base) * (crit && skill.critMulti > 0 ? (skill.critMulti + critMulti) / skill.critMulti : 1);
    }

    // Whether a monster's in a state a stat's for (items.ts When)
    private enemyIs(m: Monster, when: When): boolean {
        const t = this.tick;
        switch (when) {
            case "vsBurning":
                return t < m.burnUntil;
            case "vsChilled":
                return t < m.frozenUntil || t < m.chillUntil;
            case "vsShocked":
                return t < m.shockUntil;
            case "vsHindered":
                return t < m.frozenUntil || t < m.chillUntil || t < m.stunnedUntil;
            case "vsNotAttacking":
                return m.state !== "attack" && m.state !== "special";
            case "vsRare":
                return m.rank === "rare" || m.rank === "boss";
            case "vsDemon":
                return DEMONS.has(m.def.id);
            case "vsVampyre":
                return VAMPYRES.has(m.def.id);
            default:
                return false;
        }
    }

    // How long a shock the hero gives lasts, in ticks
    private shockTicks(): number {
        return seconds(SHOCK_SECONDS * (1 + this.stats.shockLength));
    }

    // Sets a monster alight for so long: the worst of what it's on fire from, or under Inferno each
    // on its own, up to INFERNO_STACKS at once (the one ending soonest giving way)
    private ignite(m: Monster, perTick: number, ticks: number): void {
        const alight = this.tick < m.burnUntil;
        const until = this.tick + ticks;
        if (this.stats.keystones.has("inferno")) {
            const stacks = (m.burnStacks ?? []).filter((b) => this.tick < b.until);
            if (stacks.length >= INFERNO_STACKS) {
                let soonest = 0;
                stacks.forEach((b, i) => {
                    if (b.until < stacks[soonest].until) {
                        soonest = i;
                    }
                });
                stacks.splice(soonest, 1);
            }
            stacks.push({ perTick, until });
            m.burnStacks = stacks;
            m.burn = stacks.reduce((sum, b) => sum + b.perTick, 0);
            m.burnUntil = Math.max(m.burnUntil, until);
        } else {
            if (!alight || perTick > m.burn) {
                m.burn = perTick;
            }
            m.burnUntil = until;
        }
        if (!alight) {
            this.emit({ kind: "spot", spot: SPOT.fireStrike.impactSpot, x: m.x, y: m.y });
        }
    }

    // Every other living monster within a radius of one
    private near(m: Monster, r: number, fn: (n: Monster) => void): void {
        this.hash.query(m.x, m.y, r + 2, (n) => {
            if (n !== m && n.state !== "dead" && fm.hypot(n.x - m.x, n.y - m.y) <= r + n.radius) {
                fn(n);
            }
        });
    }

    // What the tree's wings make of a death: Demonic Offering's mana and life back, Ice Barrage's
    // shatter, Tempest's shock and the Pyre's fire passed on, Death Charge's thralls renewed
    private deathRules(m: Monster): void {
        const s = this.stats;
        const h = this.hero;
        const k = s.keystones;
        if (k.has("demonicOffering")) {
            if (m.rank === "normal") {
                h.mana = Math.min(s.maxMana, h.mana + s.maxMana * DEMONIC.normal);
            } else {
                h.mana = Math.min(s.maxMana, h.mana + s.maxMana * DEMONIC.mana);
                h.life = Math.min(s.maxLife, h.life + s.maxLife * DEMONIC.life);
            }
        }
        if (k.has("iceBarrage") && (this.tick < m.frozenUntil || this.tick < m.chillUntil)) {
            this.strikes.push({
                uid: this.uid++,
                side: "hero",
                x: m.x,
                y: m.y,
                radius: SHATTER.radius,
                damage: m.maxLife * SHATTER.share,
                crit: false,
                start: this.tick,
                land: this.tick + Math.max(1, seconds(0.1)),
                visual: SPOT.iceBurst,
                stun: 0,
                freeze: 0,
                shows: 1,
            });
        }
        if (k.has("tempest") && this.tick < m.shockUntil) {
            const until = this.tick + this.shockTicks();
            this.near(m, TEMPEST.radius, (n) => {
                n.shockUntil = Math.max(n.shockUntil, until);
            });
            this.emit({ kind: "spot", spot: SPOT.saradominStrike.impactSpot, x: m.x, y: m.y });
        }
        if (s.powers.has("pyre") && this.tick < m.burnUntil) {
            // The worst of its burnings, not all of them, so a pyre never grows as it goes
            const worst = m.burnStacks && m.burnStacks.length > 0 ? Math.max(...m.burnStacks.map((b) => b.perTick)) : m.burn;
            if (worst > 0) {
                this.near(m, PYRE_RADIUS, (n) => this.ignite(n, worst, seconds(BURN_SECONDS * (1 + s.burnLength))));
            }
        }
        if (s.powers.has("deathCharge") && (m.rank === "rare" || m.rank === "boss")) {
            for (const t of this.minions) {
                const lasts = seconds(t.fallen ? this.risenSeconds() : (t.skill.summon?.seconds ?? 0));
                t.until = Math.max(t.until, this.tick + lasts);
            }
        }
    }

    // ---- A forged skill's traits (forge.ts) ----

    // Chances to cast (items.ts Proc): each rolled, at most once in PROC_SECONDS, and cast at once
    // where it's aimed, as an echo is: for no mana and no time, and carrying none of its own
    private procsFor(when: ProcWhen, x: number, y: number, uid: number): void {
        const procs = this.stats.procs ?? [];
        if (procs.length === 0) {
            return;
        }
        if (this.procStats !== this.stats) {
            this.procStats = this.stats;
            this.procSkills.clear();
        }
        for (const p of procs) {
            if (p.when !== when || this.tick < (this.procReady.get(p) ?? 0) || !this.rng.chance(p.chance)) {
                continue;
            }
            let skill = this.procSkills.get(p);
            if (!skill) {
                const gem = GEM_BY_ID.get(p.gem);
                const resolved = gem && resolveSkill(this.heroData, this.stats, -1, { gem, level: p.level });
                if (!resolved) {
                    continue;
                }
                skill = { ...resolved, traits: undefined };
                this.procSkills.set(p, skill);
            }
            this.procReady.set(p, this.tick + seconds(PROC_SECONDS));
            this.echoes.push({ at: this.tick, skill, aimX: x, aimY: y, targetUid: uid });
        }
    }

    // A forged skill without its traits (or with only these), its hits a share of its own: an
    // echo, and what a trait does itself, which does nothing more
    private scaled(skill: ResolvedSkill, share: number, traits?: SkillTraits): ResolvedSkill {
        return { ...skill, traits, minHit: skill.minHit * share, maxHit: skill.maxHit * share };
    }

    private traitsOnHit(m: Monster, skill: ResolvedSkill, t: SkillTraits): void {
        const boss = m.rank === "boss";
        if (t.numbing !== undefined) {
            const slow = boss ? t.numbing / 2 : t.numbing;
            m.chill = this.tick < m.chillUntil ? Math.max(m.chill, slow) : slow;
            m.chillUntil = this.tick + seconds(NUMB_SECONDS);
        }
        if (t.thunder !== undefined && m.life > 0 && this.tick >= this.thunderReady && this.rng.chance(t.thunder)) {
            this.thunderReady = this.tick + seconds(THUNDER_EVERY);
            this.traitStrike(m.x, m.y, 1.4, this.scaled(skill, THUNDER_SHARE), SPOT.saradominStrike, 0.12);
        }
        if (t.frenzy !== undefined) {
            this.stackBuff("trait:frenzy", "Frenzy", "attackSpeedPct", t.frenzy * 100, FRENZY_SECONDS, { sprite: 125 });
        }
        if (t.warding !== undefined) {
            this.stackBuff("trait:ward", "Ward", "lessDamageTaken", t.warding * 100, WARD_SECONDS, { sprite: 118 });
        }
    }

    private traitsOnKill(m: Monster, skill: ResolvedSkill, t: SkillTraits): void {
        if (t.volatile !== undefined) {
            this.traitStrike(m.x, m.y, VOLATILE_RADIUS, this.scaled(skill, t.volatile), { impactSpot: SPOT.dragonArrow.impactSpot, sound: SPOT.stomp.sound }, 0.06);
        }
        if (t.grave !== undefined && this.rng.chance(t.grave * (this.stats.keystones.has("arceuusCovenant") ? COVENANT_RISEN.chance : 1))) {
            this.raiseFallen(m, skill);
        }
        if (t.bloodthirst !== undefined) {
            const h = this.hero;
            h.buffs = h.buffs.filter((b) => b.id !== "trait:bloodthirst");
            h.buffs.push({
                seconds: BLOODTHIRST_SECONDS,
                moveSpeedPct: t.bloodthirst * 100,
                attackSpeedPct: t.bloodthirst * 50,
                id: "trait:bloodthirst",
                name: "Bloodthirst",
                until: this.tick + seconds(BLOODTHIRST_SECONDS),
                icon: { obj: 12625 },
            });
        }
    }

    // A trait's own hit on everything in a circle, a moment later: lightning, a kill's blast
    private traitStrike(x: number, y: number, radius: number, skill: ResolvedSkill, visual: Visual, delay: number): void {
        const roll = this.rollDamage(skill);
        this.strikes.push({
            uid: this.uid++,
            side: "hero",
            x,
            y,
            radius,
            damage: roll.amount,
            crit: roll.crit,
            start: this.tick,
            land: this.tick + Math.max(1, seconds(delay)),
            visual,
            stun: 0,
            freeze: 0,
            shows: 1,
            skill,
        });
    }

    // A buff that builds with each hit, once a tick, up to STACKS_MOST, and lasts from the last
    private stackBuff(id: string, name: string, key: "attackSpeedPct" | "lessDamageTaken", per: number, secs: number, icon: SkillIcon): void {
        const h = this.hero;
        const was = h.buffs.find((b) => b.id === id && this.tick < b.until);
        if (was && was.gained === this.tick) {
            return;
        }
        const stacks = Math.min(STACKS_MOST, (was?.stacks ?? 0) + 1);
        const buff: ActiveBuff = { seconds: secs, id, name: stacks > 1 ? `${name} ×${stacks}` : name, until: this.tick + seconds(secs), stacks, icon, gained: this.tick };
        buff[key] = per * stacks;
        h.buffs = h.buffs.filter((b) => b.id !== id);
        h.buffs.push(buff);
    }

    // How long a risen skeleton stands: longer under Arceuus Covenant
    private risenSeconds(): number {
        return RISEN_SECONDS * (this.stats.keystones.has("arceuusCovenant") ? COVENANT_RISEN.lasts : 1);
    }

    // Gravebound: what was killed stands up again as the hero's skeleton a while; past the most,
    // the oldest of the risen crumbles
    private raiseFallen(m: Monster, skill: ResolvedSkill): void {
        const def = MINIONS.skeleton;
        const h = this.hero;
        const covenant = this.stats.keystones.has("arceuusCovenant");
        const risen = this.minions.filter((t) => t.fallen && this.tick < t.until);
        for (let i = 0; i + RISEN_MOST + (covenant ? COVENANT_RISEN.most : 0) <= risen.length; i++) {
            risen[i].until = this.tick;
        }
        const spot = findFreeSpot(this.grid, m.x, m.y, def.radius, undefined, 4);
        const at = this.reachable(spot.x, spot.y) ? spot : { x: h.x, y: h.y };
        const visual: Visual = { impactSpot: 386, sound: 168 };
        // The risen are thralls: thrall damage joins the increases of the hit that raised them
        const thrall = (1 + skill.increased + this.stats.thrallDamage) / (1 + skill.increased);
        this.minions.push({
            uid: this.uid++,
            def,
            x: at.x,
            y: at.y,
            prevX: at.x,
            prevY: at.y,
            yaw: m.yaw,
            born: this.tick,
            until: this.tick + seconds(this.risenSeconds()),
            target: -1,
            attackStart: -999,
            attackHit: -999,
            attackEnd: -999,
            struck: true,
            moving: false,
            stuck: 0,
            skill: { ...this.scaled(skill, RISEN_SHARE * (covenant ? COVENANT_RISEN.share : 1) * thrall), def: { ...skill.def, visual } },
            fallen: true,
            scale: 1 + this.stats.thrallSize,
            quick: 1 + this.stats.thrallSpeed,
        });
        this.emit({ kind: "spot", spot: visual.impactSpot!, x: at.x, y: at.y });
    }

    // Where an area skill lands, what its traits leave: a pull in, and burning ground
    private landed(x: number, y: number, r: number, skill: ResolvedSkill): void {
        const t = skill.traits!;
        const vortex = t.vortex;
        if (vortex !== undefined) {
            const reach = r + vortex;
            this.hash.query(x, y, reach + 2, (m) => {
                if (m.state === "dead") {
                    return;
                }
                const dx = x - m.x;
                const dy = y - m.y;
                const d = fm.hypot(dx, dy);
                const pull = Math.min(vortex, d - m.radius - 0.2) * IMPACT.knockRank[m.rank];
                if (d > reach + m.radius || pull <= 0) {
                    return;
                }
                // A shove spent over ticks adds up to its first over (1 - decay), as a blow's does
                const v = pull * (1 - IMPACT.knockDecay);
                m.knockX = (dx / d) * v;
                m.knockY = (dy / d) * v;
            });
            this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot, x, y });
        }
        if (t.smoulder !== undefined) {
            const roll = this.rollDamage(skill);
            if (this.grounds.length >= 12) {
                this.grounds.shift();
            }
            this.grounds.push({ x, y, radius: r * 0.85, start: this.tick, until: this.tick + seconds(SMOULDER_SECONDS), perTick: (roll.amount * t.smoulder) / TICKS_PER_SECOND });
        }
    }

    // A projectile of a splitting skill on its first enemy: more of it from there, fanned on ahead
    private split(p: Projectile, m: Monster, count: number): void {
        const base = fm.atan2(p.vy, p.vx);
        const speed = fm.hypot(p.vx, p.vy) * TICKS_PER_SECOND;
        const skill = this.scaled(p.skill!, 1);
        for (let i = 0; i < count; i++) {
            const a = base + ((count === 1 ? 0 : i / (count - 1) - 0.5) * 70 * Math.PI) / 180;
            this.launch("hero", m.x, m.y, fm.cos(a), fm.sin(a), speed, 6, p.damage * SPLIT_SHARE, p.crit, p.visual, { skill, hit: [...p.hit] });
        }
    }

    // Echoes due, and the ground left burning
    private stepTraits(): void {
        const h = this.hero;
        if (this.echoes.length > 0) {
            const due = this.echoes.filter((e) => this.tick >= e.at);
            if (due.length > 0) {
                const left = this.echoes.filter((e) => this.tick < e.at);
                this.echoes.length = 0;
                this.echoes.push(...left);
                for (const e of due) {
                    if (!h.dead) {
                        const action: Action = {
                            skill: -1,
                            start: this.tick,
                            end: this.tick,
                            hitAt: this.tick,
                            fired: true,
                            aimX: e.aimX,
                            aimY: e.aimY,
                            targetUid: e.targetUid,
                            seq: 0,
                            paidMana: 0,
                            paidLife: 0,
                            wasReady: 0,
                        };
                        this.cast(e.skill, action);
                    }
                }
            }
        }
        let w = 0;
        for (const g of this.grounds) {
            if (this.tick >= g.until) {
                continue;
            }
            this.grounds[w++] = g;
            const perSecond = g.perTick * TICKS_PER_SECOND;
            this.hash.query(g.x, g.y, g.radius + 2, (m) => {
                if (m.state === "dead" || fm.hypot(m.x - g.x, m.y - g.y) > g.radius + m.radius) {
                    return;
                }
                // Burning, as an ignite is, for as long as it stands in it and a moment after;
                // armour takes its share of it as of a hit
                const perTick = g.perTick * (1 - armourReduction(m.armour, perSecond));
                if (this.tick >= m.burnUntil || perTick >= m.burn) {
                    m.burn = perTick;
                    m.burnUntil = Math.max(m.burnUntil, this.tick + seconds(0.25));
                }
            });
            if ((this.tick - g.start) % 12 === 0) {
                const a = this.rng.next() * Math.PI * 2;
                const rr = this.rng.next() * g.radius * 0.8;
                this.emit({ kind: "spot", spot: SPOT.zamorakFlames.impactSpot, x: g.x + fm.cos(a) * rr, y: g.y + fm.sin(a) * rr });
            }
        }
        this.grounds.length = w;
    }

    // A hit's shove, and the stagger out of a blow being wound up, by how much of the monster's
    // life it took (IMPACT in rules.ts). The shove's spent over a few ticks in stepMonsters.
    private impact(m: Monster, share: number, crit: boolean, fromX: number, fromY: number): void {
        const dx = m.x - fromX;
        const dy = m.y - fromY;
        const d = fm.hypot(dx, dy);
        const knock = IMPACT.knockRank[m.rank];
        if (knock > 0 && d > 0.001) {
            const tiles = Math.min(IMPACT.knockMost, IMPACT.knockLeast + share * IMPACT.knockPerLife + (crit ? IMPACT.knockCrit : 0)) * knock;
            // A shove spent as a run of ticks each `decay` of the last adds up to the first over
            // (1 - decay); the strongest of what's pushing it wins
            const v = tiles * (1 - IMPACT.knockDecay);
            if (v > fm.hypot(m.knockX, m.knockY)) {
                m.knockX = (dx / d) * v;
                m.knockY = (dy / d) * v;
            }
        }
        const stagger = IMPACT.staggerRank[m.rank];
        if (stagger > 0 && m.life > 0 && m.state === "attack" && !m.actionDone && this.tick >= m.staggerReady && share > IMPACT.staggerFrom) {
            const chance = Math.min(1, (share - IMPACT.staggerFrom) * IMPACT.staggerPerLife) * stagger;
            if (this.rng.chance(chance)) {
                m.state = "chase";
                m.staggerUntil = this.tick + seconds(IMPACT.staggerSeconds);
                m.staggerReady = this.tick + seconds(IMPACT.staggerAgainSeconds);
                this.emit({ kind: "stagger", uid: m.uid });
            }
        }
    }

    private kill(m: Monster, overkill = 0, fromX = m.x, fromY = m.y, crit = false): void {
        m.life = 0;
        m.state = "dead";
        m.deadTick = this.tick;
        this.killed++;
        this.lastKill = this.tick;
        this.emit({ kind: "monsterDied", monster: m, overkill, fromX, fromY, crit });
        this.emit({ kind: "sound", id: m.def.sounds.death, x: m.x, y: m.y, volume: 0.6 });
        if (m.mods.length > 0 && this.ladder) {
            this.modDeath(m);
        }
        const hero = this.heroData;
        hero.kills++;
        this.tasksMoved(countKill(hero, m.def.id, m.rank, this.zone.depth));
        if (!this.ladder) {
            for (const id of questKill(hero, m.def.id, m.rank, this.zone.depth, this.riftMods, () => this.monsters.every((o) => o.state === "dead"))) {
                this.emit({ kind: "quest", id });
            }
        }
        // A boss's own xp is already its worth: this is about a level for a hero who arrives at a
        // fair level
        const mult = { normal: 1, magic: 2.2, rare: 5, boss: 3 }[m.rank];
        const xp = killXp(m.def.xp * m.xpScale * mult * (1 + this.reward.xp + (hero.elixir ? ELIXIR_XP : 0)), m.level, hero.level);
        const given: string[] = [];
        const levels = gainXp(hero, xp, given);
        // The gems worn learn from it too
        let gemLevelled = false;
        for (const worn of wornGems(hero)) {
            if (gainGemXp(worn.gem, xp, hero.level)) {
                gemLevelled = true;
                this.emit({ kind: "gemLevel", name: worn.def.name, level: worn.gem.level });
            }
        }
        const h = this.hero;
        h.life = Math.min(this.stats.maxLife, h.life + this.stats.lifeOnKill);
        h.mana = Math.min(this.stats.maxMana, h.mana + this.stats.manaOnKill);
        this.deathRules(m);
        if (levels > 0) {
            this.refreshStats();
            h.life = this.stats.maxLife;
            h.mana = this.stats.maxMana;
            this.emit({ kind: "levelUp", level: hero.level });
            this.achieveWhere((g) => g.kind === "level" && hero.level >= g.level);
            this.emit({ kind: "spot", spot: LEVEL_UP_SPOT, x: h.x, y: h.y });
            if (given.length > 0) {
                this.emit({ kind: "gemsGiven", names: given });
            }
        } else if (gemLevelled) {
            this.refreshStats();
        }
        // The belt's potions fill a share of a dose (of Plenty's, the others more), a Divine super
        // combat potion's buff holds while the killing goes on, and a rare's death drinks what's
        // instilled for it
        const per = m.rank === "boss" ? 4 : m.rank === "rare" ? 2 : 1;
        const plenty = this.tick < this.plenty.until ? this.plenty : undefined;
        killFill(hero, per, this.stats.potionFill, plenty?.share ?? 0, plenty?.from ?? -1);
        for (const b of h.buffs) {
            if (b.holds && this.tick < b.until) {
                b.until = Math.max(b.until, this.tick + seconds(RECENTLY.killed));
            }
        }
        if (m.rank === "rare") {
            this.instilled("rareKill");
        }
        if ((m.rank === "rare" || m.rank === "boss") && this.stats.potionRareDose > 0) {
            killFill(hero, 0, 0, this.stats.potionRareDose);
        }
        if (!this.encounterLoot(m)) {
            const mods = this.ladder && m.rank !== "boss" ? Math.max(0, m.mods.length - (m.rank === "rare" ? 2 : 1)) : 0;
            this.dropLoot({ x: m.x, y: m.y, level: m.level, rank: m.rank, mods });
        }
        if (this.ladder) {
            this.partDrops(m);
            this.encounterKilled(m);
        }
        if (m.uid === this.bossUid && this.zone.pinnacle) {
            this.pinnacleGoods(m);
        }
        if (m.rank === "boss") {
            this.petDrop(m);
            this.bossAchievements(m);
            this.errandDrop(m);
        }
        if (m.uid === this.bossUid) {
            this.sphereLit();
        }
        if (m.uid === this.bossUid) {
            this.bountyDrop(m);
            // The rift's cleared, with this share of its time left
            const left = this.timeLimit > 0 ? Math.max(0, this.timeLimit - this.tick) / this.timeLimit : 0;
            this.tasksMoved(countClear(hero, this.zone.depth, this.riftMods.length, left));
            this.clearAchievements(left);
            if (!this.ladder) {
                for (const id of questClear(hero, this.zone.depth, left)) {
                    this.emit({ kind: "quest", id });
                }
            }
            this.portalOpen = true;
            this.emit({ kind: "bossDied", monster: m });
        }
    }

    // A ladder kill's part, if it's one that drops one (content/goods.ts PART_DROPS), and a
    // superior's or a Wilderness boss's Awakener's orb, all on their own stream
    private partDrops(m: Monster): void {
        const rng = this.partRng;
        const favour = favoured(this.heroData, this.rift?.host.id) ? 2 : 1;
        for (const part of PART_DROPS) {
            if (part.from.includes(m.def.id) && rng.chance(part.chance[m.rank] * favour)) {
                this.dropPart(part.id, 1, m.x, m.y);
            }
        }
        if ((m.encounter === "superior" || m.encounter === "roamer") && this.zone.depth >= ORB_DROPS.fromDepth && rng.chance(ORB_DROPS.ladder * (1 + this.orrery.orbs))) {
            this.dropPart("awakenersOrb", 1, m.x, m.y);
        }
    }

    // A pinnacle's guardian's goods, on the parts' stream: an Awakener's orb now and then (not the
    // Coop's), and an awakened one's ingots and its own (content/pinnacles.ts AWAKENED_DROPS)
    private pinnacleGoods(m: Monster): void {
        const pinnacle = this.zone.pinnacle!;
        const rng = this.partRng;
        if (pinnacle !== "chicken" && rng.chance(ORB_DROPS.pinnacle * (1 + this.orrery.orbs))) {
            this.dropPart("awakenersOrb", 1, m.x, m.y);
        }
        if (!this.zone.awakened) {
            return;
        }
        // Ghommal's fourth hilt: the orb back, now and then
        if (hasHilt(this.heroData, "orb") && rng.chance(HILT.orbBack)) {
            this.dropPart("awakenersOrb", 1, m.x, m.y);
        }
        if (rng.chance(AWAKENED.ingots.chance)) {
            this.dropPart("chromiumIngot", AWAKENED.ingots.count, m.x, m.y);
        }
        for (const drop of AWAKENED_DROPS[pinnacle] ?? []) {
            if (rng.chance(drop.chance)) {
                this.dropPart(drop.id, drop.count, m.x, m.y);
            }
        }
    }

    // A guardian's pet, now and then, on the parts' stream (content/pets.ts)
    private petDrop(m: Monster): void {
        const pet = PET_BY_ID.get(m.def.id);
        if (!pet) {
            return;
        }
        const hero = this.heroData;
        const chance = (this.zone.awakened && m.uid === this.bossUid ? PET_CHANCE.awakened : PET_CHANCE.guardian) * (hasHilt(hero, "pet") ? HILT.petMore : 1);
        if (this.partRng.chance(chance)) {
            this.emit({ kind: "pet", id: pet.id, fresh: winPet(hero, pet.id) });
        }
    }

    // The rift's guardian slain: the orrery's sphere for its host in its band, or its pinnacle's
    private sphereLit(): void {
        const key = this.zone.pinnacle ? (this.zone.pinnacle === "chicken" ? undefined : pinnacleSphere(this.zone.pinnacle, this.zone.awakened === true)) : this.rift ? hostSphere(this.rift.host.id, this.zone.depth) : undefined;
        if (key && lightSphere(this.heroData, key)) {
            this.emit({ kind: "sphere", key });
        }
    }

    // A combat achievement done, if it's new (content/achievements.ts)
    private achieved(id: string): void {
        if (achieve(this.heroData, id)) {
            this.emit({ kind: "achievement", id });
        }
    }

    // The achievements whose goal is of a kind and passes
    private achieveWhere(test: (goal: AchievementGoal) => boolean): void {
        for (const a of ACHIEVEMENTS) {
            if (test(a.goal)) {
                this.achieved(a.id);
            }
        }
    }

    // A guardian or a roaming boss slain: its kill, untouched, swift and awakened, and a pinnacle's
    // guardian slain alone
    private bossAchievements(m: Monster): void {
        const id = m.def.id;
        const awake = this.zone.awakened === true && m.uid === this.bossUid;
        const since = m.wokeTick !== undefined ? (this.tick - m.wokeTick) / TICKS_PER_SECOND : Infinity;
        this.achieveWhere((g) => {
            switch (g.kind) {
                case "kill":
                    return g.boss === id && (!g.awakened || awake);
                case "untouched":
                    return g.boss === id && (m.specialHits ?? 0) === 0;
                case "swift":
                    return g.boss === id && since <= g.seconds;
                case "alone":
                    return m.uid === this.bossUid && this.zone.pinnacle !== undefined && this.zone.pinnacle !== "chicken" && (!this.hireling || this.hireling.deadTick !== undefined) && (this.heroData.prayers ?? []).length === 0;
                case "glory":
                    return id === "solHeredit" && (this.colosseum?.glory ?? 0) >= g.count;
                case "raid":
                    return m.uid === this.bossUid && this.tombs !== undefined && this.tombs.level >= g.level;
                default:
                    return false;
            }
        });
    }

    // A rift cleared: its depth, its modifiers, its time left, and a ladder rift with no potion drunk
    private clearAchievements(left: number): void {
        const depth = this.zone.pinnacle ? 0 : this.zone.depth;
        this.achieveWhere((g) => {
            switch (g.kind) {
                case "clear":
                    return depth >= g.depth;
                case "mods":
                    return this.riftMods.length >= g.count;
                case "quick":
                    return this.timeLimit > 0 && left >= g.left;
                case "dry":
                    return this.ladder && !this.drank;
                default:
                    return false;
            }
        });
    }

    // What a guardian drops for the Apothecary's errands (sim/potions.ts errandDrops): sure, and
    // placed by a stream of its own made from the tick, so every other drop is as it was
    private errandDrop(m: Monster): void {
        for (const id of errandDrops(this.heroData, m.def.id)) {
            const at = spotNear(this.grid, new Rng((this.tick * 0x9e3779b1) >>> 0), { x: m.x, y: m.y }, 1, 0.2);
            const drop: Drop = { uid: this.uid++, good: { id, count: 1 }, x: at.x, y: at.y, tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
            this.emit({ kind: "errandDrop", id, boss: m.def.name });
        }
    }

    // A good dropped where it lands by the parts' stream, so the rest's placing is as it was
    private dropPart(id: GoodId, count: number, x: number, y: number): void {
        const at = spotNear(this.grid, this.partRng, { x, y }, 1, 0.2);
        const drop: Drop = { uid: this.uid++, good: { id, count }, x: at.x, y: at.y, tick: this.tick };
        this.drops.push(drop);
        this.emit({ kind: "drop", drop });
    }

    // A rift of the web's guardian dead: its bounty, if it's one that drops (content/web.ts)
    private bountyDrop(m: Monster): void {
        const bounty = this.zone.bounty;
        if (!bounty) {
            return;
        }
        const hero = this.heroData;
        const rarity = this.reward.rarity + this.stats.rarity;
        const near = (item: Item) => this.dropNear(item, m.x, m.y);
        switch (bounty) {
            case "talisman":
                near(rollTalisman(this.talismanRng, nextUid(hero), m.level, rarity));
                break;
            case "set":
                near(rollSetPiece(this.rng, nextUid(hero), m.level, SET_IDS));
                break;
            case "forged":
                near(rollForgedGem(this.rng, nextUid(hero), m.level, hero.cls));
                break;
            case "potions":
                for (let i = 0; i < 3; i++) {
                    near(rollPotion(this.potionRng, nextUid(hero), m.level, rarity + 1));
                }
                break;
            case "unique":
                near(rollItem(this.rng, nextUid(hero), { level: m.level, rarity, cls: hero.cls, atLeast: "unique" }));
                break;
            case "herbs": {
                // The best herbs the level has
                const open = HERB_IDS.filter((id) => GOODS[id].level <= m.level).slice(-BOUNTY_HERBS.stacks);
                for (const id of open) {
                    const at = spotNear(this.grid, this.rng, { x: m.x, y: m.y }, 1.6, 0.2);
                    const drop: Drop = { uid: this.uid++, good: { id, count: BOUNTY_HERBS.each }, x: at.x, y: at.y, tick: this.tick };
                    this.drops.push(drop);
                    this.emit({ kind: "drop", drop });
                }
                break;
            }
        }
    }

    private tasksMoved(tasks: Task[]): void {
        for (const task of tasks) {
            this.emit({ kind: "task", task, done: taskDone(task) });
        }
    }

    // A task done, paid for by whoever set it (tasks.ts), in the city: and a level or more, if its
    // experience brings one, as a kill's would. What it paid, or why not.
    // One of Reldo's quests claimed (sim/quests.ts): what it gave, or why not
    claimQuest(id: QuestId): { item?: Item } | string {
        const got = claimQuest(this.rng, this.heroData, id);
        if (typeof got !== "string") {
            this.refreshStats();
        }
        return got;
    }

    claimTask(uid: number): Paid | string {
        const paid = claimTask(this.heroData, uid);
        if (typeof paid === "string") {
            return paid;
        }
        const h = this.hero;
        if (paid.levels > 0) {
            this.refreshStats();
            h.life = this.stats.maxLife;
            h.mana = this.stats.maxMana;
            this.emit({ kind: "levelUp", level: this.heroData.level });
            this.emit({ kind: "spot", spot: LEVEL_UP_SPOT, x: h.x, y: h.y });
            if (paid.gems.length > 0) {
                this.emit({ kind: "gemsGiven", names: paid.gems });
            }
        }
        return paid;
    }

    private dropLoot(m: LootSource): void {
        const rng = this.rng;
        // The rift's modifiers: better items, and more of them. Every item and gem that falls has
        // the quantity's chance of bringing another with it (more than one, past 100%).
        const more = m.mods ?? 0;
        const quantity = this.reward.quantity + more * MOD_LOOT.quantity;
        const runeBonus = this.reward.runes;
        const rarity = this.stats.rarity + this.reward.rarity + more * MOD_LOOT.rarity + (this.ladder ? this.orrery.rarity : 0);
        const cls = this.heroData.cls;
        const items: Item[] = [];
        const extra = (): number => {
            let n = 0;
            for (let q = quantity; q > 0; q -= 1) {
                if (q >= 1 || rng.chance(q)) {
                    n++;
                }
            }
            return n;
        };
        // What quantity brings with a drop is as good as the drop is sure to be (a unique's, rare),
        // or a rift's rarity would be lost in its quantity's plain extras
        const roll = (bonus: number, atLeast?: Item["rarity"]) => {
            const elite = this.ladder;
            items.push(rollItem(rng, nextUid(this.heroData), { level: m.level, rarity: rarity + bonus, cls, atLeast, elite }));
            const extraAtLeast = atLeast === "unique" ? "rare" : atLeast;
            for (let n = extra(); n > 0; n--) {
                items.push(rollItem(rng, nextUid(this.heroData), { level: m.level, rarity: rarity + bonus, cls, atLeast: extraAtLeast, elite }));
            }
        };
        const gem = (chance: number) => {
            if (rng.chance(chance)) {
                for (let n = 1 + extra(); n > 0; n--) {
                    items.push(rollGem(rng, nextUid(this.heroData), m.level, cls));
                }
            }
        };
        // A forged gem (forge.ts) of the hero's class: rarer than a unique from a normal monster, a
        // guardian's now and then. Rarity finds them more often, at half the rate.
        const forged = (chance: number) => {
            if (rng.chance(chance * (1 + rarity * 0.5))) {
                items.push(rollForgedGem(rng, nextUid(this.heroData), m.level, cls));
            }
        };
        // A talisman for the tree's sockets (talismans.ts), rarer than gear and more often magic or
        // rare; rarity finds them more often, at half the rate
        const talisman = (chance: number) => {
            const own = this.talismanRng;
            if (own.chance(chance * (1 + rarity * 0.5))) {
                items.push(rollTalisman(own, nextUid(this.heroData), m.level, rarity));
            }
        };
        let gold = 0;
        const goldRoll = () => Math.round((1 + rng.int(4)) * (1 + m.level * 0.7));
        // Runes: now and then from anything, always from a rare, a handful from a boss. Rarity
        // finds them more often too, at half the rate.
        const runes: { id: RuneId; count: number }[] = [];
        const rune = (chance: number) => {
            if (rng.chance(chance * (1 + rarity * 0.5) * (1 + runeBonus))) {
                runes.push(rollRune(rng, m.level));
            }
        };
        switch (m.rank) {
            // Items are rare: most packs leave none, a rare monster one half the time, and the
            // guardian one sure item, so what does fall is worth looking at
            case "normal":
                if (rng.chance(0.015)) roll(0);
                if (rng.chance(0.3)) gold += goldRoll();
                gem(0.005);
                forged(0.0005);
                rune(0.05);
                talisman(0.003);
                break;
            case "magic":
                if (rng.chance(0.06)) roll(0.6);
                if (rng.chance(0.55)) gold += goldRoll() * 2;
                gem(0.02);
                forged(0.002);
                rune(0.12);
                talisman(0.01);
                break;
            case "rare":
                if (rng.chance(0.5)) roll(1.5, "magic");
                gold += goldRoll() * 4;
                gem(0.1);
                forged(0.02);
                rune(1);
                rune(0.4);
                talisman(0.06);
                break;
            case "boss":
                roll(2, "rare");
                if (rng.chance(0.35)) roll(2, "magic");
                if (rng.chance(0.2)) roll(0, "unique");
                gold += goldRoll() * 12;
                gem(1);
                gem(0.4);
                forged(0.15);
                rune(1);
                rune(1);
                rune(1);
                rune(0.5);
                rune(0.5);
                talisman(0.25);
                break;
            // A chest: one sure item, as good as a magic monster's at best, and a little of the rest
            case "chest":
                roll(0.8, rng.chance(0.4) ? "magic" : undefined);
                gold += goldRoll() * 3;
                gem(0.12);
                forged(0.008);
                rune(0.5);
                talisman(0.03);
                break;
            // A hoard, its guards dead: two sure items, one rare, a gem and runes, and now and then
            // a unique, as a guardian's has
            case "hoard":
                roll(1.8, "rare");
                roll(1, "magic");
                if (rng.chance(0.08)) roll(0, "unique");
                gold += goldRoll() * 8;
                gem(1);
                forged(0.05);
                rune(1);
                rune(0.6);
                talisman(1);
                break;
        }
        items.push(...this.rollKeys(m, rarity));
        // Potions and herbs (content/potions.ts, goods.ts), from a stream of their own
        const potions = this.rollPotions(m, rarity);
        const place = (from: Rng = rng): Spot => {
            for (let tries = 0; tries < 10; tries++) {
                const a = from.next() * Math.PI * 2;
                const r = 0.4 + from.next() * (m.rank === "boss" || m.rank === "hoard" ? 2.4 : 1.2);
                const x = m.x + fm.cos(a) * r;
                const y = m.y + fm.sin(a) * r;
                if (isCircleFree(this.grid, x, y, 0.2) && this.reachable(x, y)) {
                    return { x, y };
                }
            }
            return { x: m.x, y: m.y };
        };
        for (const item of items) {
            const drop: Drop = { uid: this.uid++, item, ...place(), tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        for (const r of runes) {
            const drop: Drop = { uid: this.uid++, rune: r, ...place(), tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        for (const item of potions.items) {
            const drop: Drop = { uid: this.uid++, item, ...place(this.potionRng), tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        for (const good of potions.goods) {
            const drop: Drop = { uid: this.uid++, good, ...place(this.potionRng), tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        if (gold > 0) {
            const drop: Drop = { uid: this.uid++, gold, ...place(), tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
    }

    // Potions and herbs from a kill, a chest or a hoard: a potion now and then, likelier from the
    // bigger ranks; herbs of the area's level, a monster's now and then, a rare's one, a guardian's a
    // handful (content/goods.ts HERB_DROPS). Rarity finds potions more often, at half the rate.
    private rollPotions(m: LootSource, rarity: number): { items: Item[]; goods: { id: GoodId; count: number }[] } {
        const rng = this.potionRng;
        const items: Item[] = [];
        const goods: { id: GoodId; count: number }[] = [];
        if (this.town) {
            return { items, goods };
        }
        const chance = { normal: 0.006, magic: 0.02, rare: 0.12, boss: 0.6, chest: 0.15, hoard: 0.5 }[m.rank];
        if (rng.chance(chance * (1 + rarity * 0.5))) {
            items.push(rollPotion(rng, nextUid(this.heroData), m.level, rarity));
        }
        let herbs = HERB_DROPS[m.rank];
        const open = HERB_IDS.filter((id) => GOODS[id].level <= m.level);
        while (herbs > 0 && open.length > 0) {
            if (herbs >= 1 || rng.chance(herbs)) {
                // The best two herbs open likeliest, as the newest bases are
                const weights = open.map((id, i) => GOODS[id].weight * (i >= open.length - 2 ? 2 : 1));
                const id = open[Math.max(0, rng.weightedIndex(weights))];
                const same = goods.find((g) => g.id === id);
                if (same) {
                    same.count++;
                } else {
                    goods.push({ id, count: 1 });
                }
            }
            herbs -= 1;
        }
        // In a meadow's rift, an egg or a raw chicken now and then (content/goods.ts CHICKEN_DROPS)
        if (this.meadow) {
            const chance = CHICKEN_DROPS[m.rank];
            if (this.chickenRng.chance(chance)) {
                goods.push({ id: "egg", count: 1 });
            }
            if (this.chickenRng.chance(chance / 2)) {
                goods.push({ id: "rawChicken", count: 1 });
            }
        }
        return { items, goods };
    }

    // The keys to rifts past the Archmage's own (content/riftstones.ts): riftstones from the
    // guardians and rares of the second lap on, a depth deeper now and then, and from hoards; the
    // Heartstone's shards from the ladder's guardians; and from the Heart's own guardian, the uniques
    // nothing else drops
    private rollKeys(m: LootSource, rarity: number): Item[] {
        const rng = this.rng;
        const hero = this.heroData;
        const depth = this.zone.depth;
        const keys: Item[] = [];
        const stone = (at: number) => keys.push(rollRiftstone(rng, nextUid(hero), at, rarity));
        const pinnacle = this.zone.pinnacle;
        if (pinnacle) {
            const any = PINNACLES[pinnacle].anyUniques;
            if (m.rank === "boss" && any) {
                // The Coop's: with none of its own, uniques of any kind
                for (let i = 0; i < any; i++) {
                    keys.push(rollItem(rng, nextUid(hero), { level: m.level, rarity, cls: hero.cls, atLeast: "unique" }));
                }
                stone(depth + 1);
            } else if (m.rank === "boss" && this.zone.awakened) {
                // Awakened: two of its own always, high in their ranges
                for (let i = 0; i < AWAKENED.uniques; i++) {
                    keys.push(rollTopHalf(rollPinnacleUnique(rng, nextUid(hero), m.level, hero.cls, pinnacle)));
                }
                stone(depth + 1);
            } else if (m.rank === "boss") {
                keys.push(rollPinnacleUnique(rng, nextUid(hero), m.level, hero.cls, pinnacle));
                if (rng.chance(PINNACLES[pinnacle].second + (this.colosseum?.glory ?? 0) * COLOSSEUM.perGlory.second + (this.tombs?.level ?? 0) * TOMBS.perLevel.second)) {
                    keys.push(rollPinnacleUnique(rng, nextUid(hero), m.level, hero.cls, pinnacle));
                }
                stone(depth + 1);
            }
            return keys;
        }
        if (this.town || depth < RIFTSTONE.from) {
            return keys;
        }
        if (m.rank === "boss") {
            stone(depth);
            if (rng.chance(RIFTSTONE.deeper + (this.ladder ? this.orrery.stones : 0))) {
                stone(depth + 1);
            }
            if (depth >= HEART.from && rng.chance(HEART.chance * (this.ladder ? 1 + this.orrery.shards : 1))) {
                keys.push(rollShard(rng, nextUid(hero), m.level, hero));
            }
        } else if (m.rank === "rare" && rng.chance(RIFTSTONE.rare)) {
            stone(depth);
        } else if (m.rank === "hoard" && rng.chance(0.5)) {
            stone(depth);
        }
        return keys;
    }

    // A chest opened, a hoard opened once its guards are dead, or a shrine touched
    // (content/features.ts)
    private useFeature(f: Feature): void {
        if (f.used) {
            return;
        }
        const h = this.hero;
        if (f.kind === "hoard" && this.guarded(f)) {
            // Still guarded: and they've seen you
            const guard = (this.packs[f.guards!] ?? []).find((m) => m.state !== "dead");
            if (guard) {
                this.wake(guard);
            }
            this.emit({ kind: "feature", feature: f, what: "guarded" });
            return;
        }
        if (f.kind === "caves" || f.kind === "tomb" || f.kind === "barrows" || f.kind === "breach") {
            this.useEncounter(f);
            return;
        }
        f.used = true;
        if (f.kind === "shrine") {
            const def = SHRINES[f.shrine ?? "bandos"];
            const id = `shrine:${def.id}`;
            h.buffs = h.buffs.filter((b) => b.id !== id);
            const longer = this.ladder ? 1 + this.orrery.shrine : 1;
            h.buffs.push({ ...def.buff, id, name: def.name, until: this.tick + seconds(def.buff.seconds * longer), icon: def.icon });
            if (def.restore) {
                this.refillPotions(false);
            }
            this.emit({ kind: "spot", spot: def.spot, x: h.x, y: h.y });
            this.emit({ kind: "sound", id: SOUND.godSpell, x: f.x, y: f.y });
            this.emit({ kind: "feature", feature: f, what: "blessed" });
            this.tasksMoved(countFeature(this.heroData, "shrine", this.zone.depth));
            return;
        }
        const kind = f.kind === "hoard" ? "hoard" : "chest";
        this.dropLoot({ x: f.x, y: f.y, level: this.level + (kind === "hoard" ? 1 : 0), rank: kind });
        this.tasksMoved(countFeature(this.heroData, kind, this.zone.depth));
        if (f.trapped) {
            this.ambush(f);
            this.emit({ kind: "feature", feature: f, what: "ambush" });
        } else {
            this.emit({ kind: "feature", feature: f, what: "opened" });
        }
    }

    // A trapped chest: a magic pack of the zone's rises in a ring round it, one more a lap, awake
    // and standing a moment before they move
    private ambush(f: Feature): void {
        const rng = this.rng;
        const zone = riftZone(this.zone.depth, this.zone.seed, this.zone.pinnacle);
        const weights = zone.monsters.map(([, w]) => w);
        const def: MonsterDef = MONSTERS[zone.monsters[Math.max(0, rng.weightedIndex(weights))][0]];
        const mods = this.packMods(def);
        const n = FEATURES.ambush + lapOf(this.zone.depth) + this.effect.packSize;
        const pack = this.packs.length;
        const members: Monster[] = [];
        const turn = rng.next() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
            const a = turn + (i / n) * Math.PI * 2;
            const at = spotNear(this.grid, rng, { x: f.x + fm.cos(a) * 3, y: f.y + fm.sin(a) * 3 }, 0.6, def.radius);
            if (!this.reachable(at.x, at.y) || !isCircleFree(this.grid, at.x, at.y, def.radius)) {
                continue;
            }
            const m = this.spawnMonster(def, "magic", at, pack, mods);
            m.state = "chase";
            m.staggerUntil = this.tick + seconds(FEATURES.rise);
            m.yaw = yawFromVector(f.x - m.x, f.y - m.y);
            members.push(m);
            this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot, x: m.x, y: m.y });
        }
        this.packs.push(members);
    }

    private pickUp(drop: Drop): void {
        if (drop.gold) {
            // The orrery's spoils, on the ladder
            const gold = this.ladder ? Math.round(drop.gold * (1 + this.orrery.gold)) : drop.gold;
            this.heroData.gold += gold;
            this.emit({ kind: "gold", amount: gold });
        } else if (drop.rune) {
            const { id, count } = drop.rune;
            this.heroData.runes[id] = (this.heroData.runes[id] ?? 0) + count;
            this.emit({ kind: "rune", id, count });
        } else if (drop.good) {
            const { id } = drop.good;
            // The orrery's wages for the encounters
            const count = ORRERY_PAID.includes(id) ? Math.round(drop.good.count * (1 + this.orrery.pay)) : drop.good.count;
            this.heroData.goods[id] = (this.heroData.goods[id] ?? 0) + count;
            this.emit({ kind: "good", id, count });
            if (logIt(this.heroData, id)) {
                this.emit({ kind: "logged", name: GOODS[id].name });
            }
        } else if (drop.item) {
            if (!stow(this.heroData, drop.item)) {
                this.emit({ kind: "packFull" });
                return;
            }
            this.emit({ kind: "pickup", item: drop.item });
            if (logItem(this.heroData, drop.item)) {
                this.emit({ kind: "logged", name: UNIQUE_BY_ID.get(drop.item.base)?.name ?? itemInfo(drop.item).name });
            }
        }
        this.drops.splice(this.drops.indexOf(drop), 1);
    }

    // Gold and runes are picked up just by walking over them: into the purse and the pouch, not
    // the pack
    private collectGold(): void {
        const h = this.hero;
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const d = this.drops[i];
            if ((d.gold || d.rune || d.good) && fm.hypot(d.x - h.x, d.y - h.y) <= HERO.goldReach) {
                this.pickUp(d);
            }
        }
    }

    // A potion from a place in the belt drunk (1 to 4, or an instil for you): a dose of it, what it
    // recovers and how (its prefix), its buff and its rule, and what else it does while it works
    // (its suffix). Whether it was drunk.
    private drink(place: number, auto = false): boolean {
        const hero = this.heroData;
        const h = this.hero;
        const s = this.stats;
        const item = hero.potions[place];
        const def = item ? potionDef(item) : undefined;
        if (!beltOpen(hero, place) || !item || !def || dosesLeft(item) < 1) {
            if (!auto) {
                this.emit({ kind: "noPotion", place, why: !beltOpen(hero, place) ? "shut" : item ? "dry" : "empty" });
            }
            return false;
        }
        // The Tombs' On a Diet
        if (this.invocations.some((id) => INVOCATIONS[id].noPotions)) {
            if (!auto) {
                this.emit({ kind: "cantUse", why: `${INVOCATIONS.onADiet.name}: no potion can be drunk in the Tombs.` });
            }
            return false;
        }
        this.drank = true;
        const low = h.life <= s.maxLife * 0.5;
        if (def.rule === "overload" && low) {
            if (!auto) {
                this.emit({ kind: "cantUse", why: "Overload can't be drunk on low life." });
            }
            return false;
        }
        const stat = (k: StatKey) => potionStat(item, k);
        // Chemist's: now and then, no dose taken
        const save = stat("potionSave");
        if (!(save > 0 && this.potionRng.chance(save / 100))) {
            item.charges = dosesLeft(item) - 1;
        }
        // Longer for its suffix, and for Preserve (content/prayers.ts)
        const longer = (1 + stat("potionLonger") / 100) * (1 + this.stats.preserve);
        const effect = 1 + s.potionEffect;
        // What it recovers: more for the tree's and a Saturated one's, less for a Seething one's,
        // and at once, or partly, or over its time
        const panic = low && stat("potionPanic") > 0;
        const amount = (1 + s.flask) * (1 + stat("potionMore") / 100) * (1 - stat("potionInstantLess") / 100) * (panic ? 1 + stat("potionPanic") / 100 : 1);
        const secs = (def.seconds * (stat("potionMore") > 0 ? 1 + SATURATED_SLOWER : 1)) / (1 + stat("potionFaster") / 100);
        const atOnce = def.family === "rejuv" || secs <= 0 || stat("potionInstantLess") > 0 || panic ? 1 : stat("potionHalfInstant") / 100;
        const wardMost = (stat("potionWard") / 100) * s.maxLife;
        // Barbarian Herblore: a life potion recovers no life, and every dose is more damage
        const barbarian = s.keystones.has("barbarianHerblore");
        if (barbarian) {
            const stacks = h.buffs.filter((x) => x.id.startsWith("potion-herblore") && this.tick < x.until).sort((p, q) => p.until - q.until);
            const drop = stacks.length >= BARBARIAN_HERBLORE.most ? stacks[0].id : undefined;
            h.buffs = h.buffs.filter((x) => x.id !== drop);
            h.buffs.push({
                id: `potion-herblore:${this.tick}:${place}`,
                name: KEYSTONES.barbarianHerblore.name,
                seconds: BARBARIAN_HERBLORE.seconds,
                until: this.tick + seconds(BARBARIAN_HERBLORE.seconds),
                more: BARBARIAN_HERBLORE.more,
            });
        }
        if (def.rule !== "ambrosia" && def.rule !== "ancientBrew") {
            if (def.life && !(barbarian && def.family === "life")) {
                this.recover("life", s.maxLife * def.life * amount, atOnce, secs, wardMost);
            }
            if (def.mana) {
                this.recover("mana", s.maxMana * def.mana * amount, atOnce, secs, 0);
            }
        }
        // Its buff, a combat potion's or a unique's, for its time
        let until = this.tick + seconds(Math.max(def.family === "combat" ? def.seconds : 0, def.buff ? def.seconds : 0) * longer);
        const name = itemInfo(item).name;
        if (def.buff) {
            const b = def.buff;
            const scale = (v: number | undefined) => (v === undefined ? undefined : v * effect);
            const id = `potion:${item.base}`;
            h.buffs = h.buffs.filter((x) => x.id !== id);
            h.buffs.push({
                id,
                name,
                seconds: def.seconds,
                until,
                damagePct: scale(b.damagePct),
                armourPct: scale(b.armourPct),
                moveSpeedPct: scale(b.moveSpeedPct),
                tag: b.tag,
                tagPct: scale(b.tagPct),
                more: scale(b.more),
                elementalLess: b.elementalLess,
                manaCostLess: b.manaCostLess,
                noAilments: b.noAilments,
                holds: def.rule === "divineCombat",
            });
        }
        // Its rule
        switch (def.rule) {
            case "overload":
                this.bleedUntil = this.tick + seconds(2);
                this.bleedRate = (s.maxLife * 0.3) / seconds(2);
                break;
            case "zamorakBrew":
            case "divineCombat":
                h.life = Math.max(1, h.life - s.maxLife * 0.1);
                break;
            case "ancientBrew":
                h.life = Math.max(1, h.life - s.maxLife * 0.3);
                h.mana = Math.min(s.maxMana, h.mana + s.maxMana * 0.6);
                break;
            case "ambrosia":
                h.life = s.maxLife;
                h.mana = s.maxMana;
                hero.potions.forEach((other, i) => {
                    if (other && i !== place) {
                        other.charges = this.fullDoses(other);
                    }
                });
                this.addWard(s.maxLife * 0.25, s.maxLife * 0.25);
                break;
            case "menaphite":
                this.cleanse();
                break;
        }
        // Its suffix: what else it does while it works, a few seconds at the least
        const suffix = { moveSpeedPct: stat("potionMove"), armourPct: stat("potionArmour"), evade: stat("potionEvade"), attackSpeedPct: stat("potionAttackSpeed") };
        const suffixUntil = this.tick + seconds(Math.max(SUFFIX_SECONDS, def.seconds) * longer);
        if (suffix.moveSpeedPct || suffix.armourPct || suffix.evade || suffix.attackSpeedPct) {
            const id = `potion-suffix:${place}`;
            h.buffs = h.buffs.filter((x) => x.id !== id);
            h.buffs.push({
                id,
                name: `${name}'s ${["Adrenaline", "Iron Skin", "Reflexes", "Fury"][[suffix.moveSpeedPct, suffix.armourPct, suffix.evade, suffix.attackSpeedPct].findIndex((v) => v > 0)]}`,
                seconds: Math.max(SUFFIX_SECONDS, def.seconds),
                until: suffixUntil,
                moveSpeedPct: suffix.moveSpeedPct * effect || undefined,
                armourPct: suffix.armourPct * effect || undefined,
                evade: suffix.evade * effect || undefined,
                attackSpeedPct: suffix.attackSpeedPct * effect || undefined,
            });
            until = Math.max(until, suffixUntil);
        }
        if (wardMost > 0) {
            this.overflow = { until: Math.max(this.tick + seconds(secs), suffixUntil), most: wardMost };
            until = Math.max(until, this.overflow.until);
        }
        const plenty = stat("potionPlenty");
        if (plenty > 0) {
            this.plenty = { until: suffixUntil, share: plenty / 100, from: place };
            until = Math.max(until, suffixUntil);
        }
        // Its ward against an ailment: ends it, and keeps it off a while
        const wards: [AilmentKind, number][] = [
            ["burn", stat("potionDouse")],
            ["chill", stat("potionHeat")],
            ["shock", stat("potionGround")],
            ["root", stat("potionFooting")],
        ];
        for (const [kind, secs] of wards) {
            if (secs > 0) {
                this.cleanse([kind]);
                this.ailmentWard[kind] = Math.max(this.ailmentWard[kind], this.tick + seconds(secs * longer));
            }
        }
        this.potionUntil = Math.max(this.potionUntil, until, this.tick + seconds(secs));
        this.emit({ kind: "potion", place, name, instil: auto || undefined });
        return true;
    }

    // A potion's doses full (Ambrosia's on the others)
    private fullDoses(item: Item): number {
        const def = potionDef(item);
        return def ? def.doses + potionStat(item, "potionDoses") : 0;
    }

    // Life or mana back from a potion: a share at once, the rest over its time; life past full into
    // a ward, if it has one
    private recover(what: "life" | "mana", amount: number, atOnce: number, secs: number, wardMost: number): void {
        const h = this.hero;
        const s = this.stats;
        const now = amount * Math.min(1, Math.max(0, atOnce));
        const later = amount - now;
        if (what === "life") {
            const life = h.life + now;
            if (life > s.maxLife && wardMost > 0) {
                this.addWard(life - s.maxLife, wardMost);
            }
            h.life = Math.min(s.maxLife, life);
            if (later > 0) {
                const ticks = Math.max(1, seconds(secs));
                h.lifePotionUntil = this.tick + ticks;
                h.lifePotionRate = later / ticks;
            }
        } else {
            h.mana = Math.min(s.maxMana, h.mana + now);
            if (later > 0) {
                const ticks = Math.max(1, seconds(secs));
                h.manaPotionUntil = this.tick + ticks;
                h.manaPotionRate = later / ticks;
            }
        }
    }

    // More to the hero's ward, up to `most`, fading over a few seconds from what it is now
    private addWard(amount: number, most: number): void {
        const h = this.hero;
        h.ward = Math.min(Math.max(most, h.ward), h.ward + amount);
        h.wardFade = h.ward / seconds(WARD_FADE_SECONDS);
    }

    // The ailments on the hero ended (a Menaphite remedy's), and a pull let go
    private cleanse(kinds: AilmentKind[] = ["burn", "chill", "shock", "root"]): void {
        for (const kind of kinds) {
            this.ailments[kind] = 0;
        }
        if (kinds.includes("root")) {
            this.pull = undefined;
        }
    }

    // ---- The ladder's monster mods (content/monsterMods.ts) ----

    // Whether an ailment can't take hold now: a buff that keeps them all off (a Menaphite
    // remedy's, Smelling salts'), or a potion suffix's ward against this one
    private immune(kind: AilmentKind): boolean {
        return this.tick < this.ailmentWard[kind] || this.hero.buffs.some((b) => b.noAilments && this.tick < b.until);
    }

    // An ailment on the hero, for so long (burning's life a second, too); being rooted or chilled
    // drinks what's instilled for being hindered
    private afflict(kind: AilmentKind, secs: number, perSecond = 0): void {
        const h = this.hero;
        if (h.dead || this.town || this.immune(kind)) {
            return;
        }
        const was = this.tick < this.ailments[kind];
        this.ailments[kind] = Math.max(this.ailments[kind], this.tick + seconds(secs));
        if (kind === "burn") {
            this.heroBurn = was ? Math.max(this.heroBurn, perSecond) : perSecond;
        }
        if (!was) {
            const spot = kind === "burn" ? SPOT.zamorakFlames.impactSpot : kind === "chill" ? SPOT.iceBurst.impactSpot : kind === "shock" ? SPOT.saradominStrike.impactSpot : BIND_VISUAL.impactSpot!;
            this.emit({ kind: "spot", spot, x: h.x, y: h.y });
            this.emit({ kind: "ailment", ailment: kind, name: AILMENT_NAMES[kind] });
            if (kind === "root" || kind === "chill") {
                this.instilled("hindered");
            }
        }
    }

    // The ailments on the hero, for the screen
    ailmentList(): { kind: AilmentKind; name: string; seconds: number }[] {
        return (Object.keys(this.ailments) as AilmentKind[])
            .filter((k) => this.tick < this.ailments[k])
            .map((k) => ({ kind: k, name: AILMENT_NAMES[k], seconds: (this.ailments[k] - this.tick) / TICKS_PER_SECOND }));
    }

    // A monster's blow or shot on the hero: what its mods add to it
    private blowLanded(m: Monster, amount: number): void {
        const h = this.hero;
        // The Chaos Elemental's hit throws the hero a few tiles
        if (m.def.id === "chaosElemental" && this.rng.chance(ROAMERS.chaos.chance)) {
            this.throwHero(ROAMERS.chaos.from, ROAMERS.chaos.to);
        }
        for (const mod of m.mods) {
            if (mod === "infernal" && this.rng.chance(MOD.infernal.igniteChance)) {
                this.afflict("burn", MOD.infernal.burnSeconds, amount * MOD.infernal.burnShare);
            } else if (mod === "frostbound") {
                this.afflict("chill", MOD.frostbound.chillSeconds);
            } else if (mod === "draining" && h.mana > 0) {
                h.mana = Math.max(0, h.mana - amount * MOD.draining.mana);
                this.emit({ kind: "spot", spot: SPOT.blueImpact.impactSpot, x: h.x, y: h.y });
            }
        }
    }

    // A monster's average hit
    private meanHit(m: Monster): number {
        return (m.damage[0] + m.damage[1]) / 2;
    }

    // A strike of a monster's on the ground, marked before it lands
    private monsterStrike(m: Monster, x: number, y: number, radius: number, windup: number, damage: number, visual: Visual, ailment?: Strike["ailment"]): void {
        this.strikes.push({
            uid: this.uid++,
            side: "monster",
            x,
            y,
            radius,
            damage,
            crit: false,
            start: this.tick,
            land: this.tick + Math.max(1, seconds(windup)),
            visual,
            stun: 0,
            freeze: 0,
            shows: 1,
            owner: m.uid,
            ailment,
        });
    }

    // The packs a Commanding or a Shielding monster still stands over, each tick
    private auras(): void {
        this.commanded.clear();
        this.shielded.clear();
        if (!this.ladder) {
            return;
        }
        for (const m of this.monsters) {
            if (m.state !== "dead" && m.mods.length > 0) {
                if (m.mods.includes("commanding")) {
                    this.commanded.add(m.pack);
                }
                if (m.mods.includes("shielding")) {
                    this.shielded.set(m.pack, m.uid);
                }
            }
        }
    }

    // What an awake monster's mods do on their own: a blink to the hero, a bind, a pull, burning
    // ground behind it, its pack raised
    private modsAct(m: Monster, d: number): void {
        const h = this.hero;
        const next = m.modNext;
        const ready = (mod: MonsterMod) => this.tick >= (next[mod] ?? 0);
        for (const mod of m.mods) {
            if (mod === "blinking" && ready(mod) && d > MOD.blinking.from && d < MOD.blinking.to) {
                next.blinking = this.tick + seconds(MOD.blinking.every);
                const at = spotNear(this.grid, this.rng, { x: h.x, y: h.y }, MOD.blinking.near, m.radius);
                if (this.reachable(at.x, at.y) && isCircleFree(this.grid, at.x, at.y, m.radius)) {
                    this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: m.x, y: m.y });
                    m.x = m.prevX = at.x;
                    m.y = m.prevY = at.y;
                    this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: m.x, y: m.y });
                }
            } else if (mod === "binding" && ready(mod) && d <= MOD.binding.range && canSee(this.grid, m.x, m.y, h.x, h.y)) {
                next.binding = this.tick + seconds(MOD.binding.every);
                const b = MOD.binding;
                this.emit({ kind: "spot", spot: BIND_VISUAL.castSpot!, x: m.x, y: m.y });
                this.monsterStrike(m, h.x, h.y, b.radius, b.windup, this.meanHit(m) * b.damage, BIND_VISUAL, { kind: "root", seconds: b.rootSeconds });
            } else if (mod === "grasping" && ready(mod) && d <= MOD.grasping.range && d > MOD.grasping.from && canSee(this.grid, m.x, m.y, h.x, h.y)) {
                next.grasping = this.tick + seconds(MOD.grasping.every);
                if (!this.immune("root")) {
                    const ticks = Math.max(1, seconds(MOD.grasping.seconds));
                    this.pull = { x: m.x, y: m.y, until: this.tick + ticks, step: (d - MOD.grasping.to) / ticks };
                    this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot, x: h.x, y: h.y });
                    this.instilled("hindered");
                }
            } else if (mod === "molten" && m.moved && ready(mod)) {
                next.molten = this.tick + seconds(MOD.molten.every);
                if (this.hazards.length >= MOD.molten.most) {
                    this.hazards.shift();
                }
                this.hazards.push({ x: m.x, y: m.y, radius: MOD.molten.radius, start: this.tick, until: this.tick + seconds(MOD.molten.seconds), perSecond: this.meanHit(m) * MOD.molten.perSecond, kind: "burn" });
            } else if (mod === "enraging" && !m.enraged && m.life < m.maxLife * MOD.enraging.at) {
                // Enraged at half life: faster, and its specials twice as often
                m.enraged = true;
                m.speed *= 1 + MOD.enraging.faster;
                m.attackTicks = Math.max(10, Math.round(m.attackTicks / (1 + MOD.enraging.faster)));
                m.hitTicks = Math.max(1, Math.round(m.attackTicks * m.def.hitAt));
                this.emit({ kind: "spot", spot: SPOT.zamorakFlames.impactSpot!, x: m.x, y: m.y });
                this.emit({ kind: "encounter", what: "enraged", name: m.name });
            } else if (mod === "summoning" && (m.summons ?? 0) < MOD.summoning.at.length && m.life < m.maxLife * MOD.summoning.at[m.summons ?? 0]) {
                m.summons = (m.summons ?? 0) + 1;
                this.callGuards(m, MOD.summoning.guards);
            } else if (mod === "raising" && ready(mod)) {
                next.raising = this.tick + seconds(MOD.raising.every);
                const fallen = (this.packs[m.pack] ?? []).find((n) => n !== m && n.state === "dead" && !n.raised && n.rank !== "boss");
                if (fallen) {
                    fallen.raised = true;
                    const risen = this.spawnMonster(fallen.def, "normal", { x: fallen.x, y: fallen.y }, m.pack);
                    risen.life = Math.round(risen.maxLife * MOD.raising.life);
                    risen.state = "chase";
                    this.packs[m.pack].push(risen);
                    this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot, x: risen.x, y: risen.y });
                }
            }
        }
    }

    // A Charged monster hit: sparks fly out to land round it
    private sparks(m: Monster): void {
        const c = MOD.charged;
        if (this.tick < (m.modNext.charged ?? 0)) {
            return;
        }
        m.modNext.charged = this.tick + seconds(c.every);
        for (let i = 0; i < c.sparks; i++) {
            const a = this.rng.next() * Math.PI * 2;
            const r = 1 + this.rng.next() * (c.spread - 1);
            this.monsterStrike(m, m.x + fm.cos(a) * r, m.y + fm.sin(a) * r, c.radius, c.windup, this.meanHit(m) * c.damage, c.visual, { kind: "shock", seconds: c.shockSeconds });
        }
    }

    // An Infernal monster bursts as it dies, and a Frostbound one sends out a ring of ice
    private modDeath(m: Monster): void {
        for (const mod of m.mods) {
            if (mod === "infernal") {
                const b = MOD.infernal.burst;
                this.monsterStrike(m, m.x, m.y, b.radius, b.windup, this.meanHit(m) * b.damage, MOD.infernal.visual, { kind: "burn", seconds: b.burnSeconds, perSecond: this.meanHit(m) * b.burnShare });
            } else if (mod === "frostbound") {
                const r = MOD.frostbound.ring;
                this.monsterStrike(m, m.x, m.y, r.radius, r.windup, this.meanHit(m) * r.damage, MOD.frostbound.visual, { kind: "chill", seconds: r.chillSeconds });
            }
        }
    }

    // The ailments and the ground working on the hero each tick: burning taken as a hit every so
    // often, a pull's step, a Molten monster's ground
    private stepAilments(): void {
        const h = this.hero;
        if (this.town || h.dead) {
            return;
        }
        if (this.tick < this.ailments.burn) {
            this.heroBurnTaken += this.heroBurn / TICKS_PER_SECOND;
            if (this.heroBurnTaken >= 1 && (this.tick % Math.max(1, seconds(AILMENTS.burnEvery)) === 0 || this.tick + 1 >= this.ailments.burn)) {
                const taken = this.heroBurnTaken;
                this.heroBurnTaken = 0;
                this.hurtHero(taken, undefined, false, undefined, undefined, "fire");
            }
        } else {
            this.heroBurnTaken = 0;
        }
        const pull = this.pull;
        if (pull) {
            const dx = pull.x - h.x;
            const dy = pull.y - h.y;
            const d = fm.hypot(dx, dy);
            if (this.tick >= pull.until || d <= MOD.grasping.to) {
                this.pull = undefined;
            } else {
                moveCircle(this.grid, h, (dx / d) * pull.step, (dy / d) * pull.step, HERO.radius);
            }
        }
        let w = 0;
        for (const g of this.hazards) {
            if (this.tick >= g.until) {
                continue;
            }
            this.hazards[w++] = g;
            if (this.tick < g.start) {
                continue;
            }
            if (fm.hypot(h.x - g.x, h.y - g.y) <= g.radius + HERO.radius) {
                if (g.kind === "burn") {
                    this.afflict("burn", AILMENTS.burnEvery, g.perSecond);
                } else {
                    // A freezing field: chilled while on it, and its cold taken as a hit now and then
                    this.afflict("chill", AILMENTS.burnEvery);
                    this.fieldTaken += g.perSecond / TICKS_PER_SECOND;
                    if (this.fieldTaken >= 1 && this.tick % Math.max(1, seconds(AILMENTS.burnEvery)) === 0) {
                        const taken = this.fieldTaken;
                        this.fieldTaken = 0;
                        this.hurtHero(taken, undefined, false, undefined, undefined, "cold");
                    }
                }
            }
            if ((this.tick - g.start) % 16 === 0) {
                const spot = g.kind === "burn" ? SPOT.zamorakFlames.impactSpot : SPOT.iceBurst.impactSpot;
                // A wide one shown in a few places across it
                const shows = g.radius > 1.5 ? 3 : 1;
                for (let i = 0; i < shows; i++) {
                    const a = (i / shows) * Math.PI * 2 + (this.tick % 7);
                    const r = shows > 1 ? g.radius * 0.55 : 0;
                    this.emit({ kind: "spot", spot: spot!, x: g.x + fm.cos(a) * r, y: g.y + fm.sin(a) * r });
                }
            }
        }
        this.hazards.length = w;
    }

    // ---- The ladder's encounters (content/encounters.ts) ----

    // Its encounter set out at the spots placement found for it, and its roaming boss
    private placeEncounter(rift: LadderRift, spots: Spot[], rng: Rng): void {
        let i = 0;
        const next = (): Spot | undefined => spots[i++];
        if (rift.encounter === "impling" && rift.impling) {
            const at = next();
            if (at) {
                const pack = this.packs.length;
                const m = this.spawnMonster(MONSTERS[rift.impling], "normal", at, pack, [], true);
                m.encounter = "impling";
                this.packs.push([m]);
            }
        } else if (rift.encounter === "hunter" && rift.hunter) {
            const at = next();
            if (at) {
                const pack = this.packs.length;
                const m = this.spawnMonster(MONSTERS[rift.hunter], "rare", at, pack, [], true);
                m.encounter = "hunter";
                m.name = `${rng.pick(HUNTER.names)} ${HUNTER.title}`;
                m.maxLife = m.life = Math.round(m.maxLife * HUNTER.life);
                m.damage = [m.damage[0] * HUNTER.damage, m.damage[1] * HUNTER.damage];
                m.speed *= HUNTER.speed;
                this.packs.push([m]);
            }
        } else if (rift.encounter === "fightCaves") {
            const at = next();
            const f = at && this.raiseFeature({ kind: "caves" }, at, FIGHT_CAVES.size);
            if (f) {
                this.caves = { feature: f.uid, wave: 0, held: 0, pack: -1, state: "ready" };
            }
        } else if (rift.encounter === "barrows" && rift.brothers) {
            for (const brother of rift.brothers) {
                const at = next();
                if (at && this.raiseFeature({ kind: "tomb", brother }, at, BARROWS.size)) {
                    this.barrowsTombs++;
                }
            }
            const at = next();
            if (at) {
                this.raiseFeature({ kind: "barrows" }, at, HOARD.size);
            }
        } else if (rift.encounter === "pestControl") {
            const at = next();
            if (at) {
                this.raisePestControl(at, rng);
            }
        } else if (rift.encounter === "godWars" && rift.armies) {
            const at = next();
            if (at) {
                this.raiseSkirmish(rift.armies, at, rng);
            }
        } else if (rift.encounter === "breach") {
            const at = next();
            const f = at && this.raiseFeature({ kind: "breach" }, at, BREACH.size);
            if (f) {
                this.breach = { feature: f.uid, x: f.x, y: f.y, start: 0, radius: 0, nextSpawn: 0, pack: -1, state: "closed" };
            }
        } else if (rift.encounter === "guardians") {
            const at = next();
            if (at) {
                const p = this.raiseAlly(RIFT_GUARDIANS.npcId, RIFT_GUARDIANS.name, at, rng.next() * Math.PI * 2);
                this.guardian = { person: p.uid, x: p.x, y: p.y, start: 0, power: 0, carried: 0, nextSpawn: 0, pack: -1, state: "waiting" };
            }
        }
        if (rift.roamer) {
            const at = next() ?? (this.layout.packs.length > 0 ? this.layout.packs[rng.int(this.layout.packs.length)] : undefined);
            if (at) {
                const pack = this.packs.length;
                const m = this.spawnMonster(BOSSES[rift.roamer], "boss", at, pack);
                m.encounter = "roamer";
                m.maxLife = m.life = Math.round(m.maxLife * ROAMERS.life);
                this.roamerUid = m.uid;
                const members = [m];
                if (rift.roamer === "scorpia") {
                    const def: MonsterDef = MONSTERS[ROAMERS.scorpia.guard];
                    for (let n = 0; n < ROAMERS.scorpia.guards; n++) {
                        const g = this.spawnMonster(def, "magic", spotNear(this.grid, rng, at, 2.5, def.radius), pack, [], true);
                        g.encounter = "guard";
                        members.push(g);
                    }
                }
                this.packs.push(members.filter((o) => this.reachable(o.x, o.y) || this.dropUnreachable(o)));
            }
        }
    }

    // An impling's flight: away from the hero, round what's in the way, and gone when its time's up
    private flee(m: Monster, d: number, dx: number, dy: number): void {
        if (m.fleeUntil !== undefined && this.tick >= m.fleeUntil) {
            m.state = "dead";
            m.deadTick = this.tick - this.corpseTicks;
            this.emit({ kind: "spot", spot: IMPLING.puff, x: m.x, y: m.y });
            this.emit({ kind: "encounter", what: "implingGone", name: m.name });
            return;
        }
        if (d < 0.001) {
            return;
        }
        const ax = -dx / d;
        const ay = -dy / d;
        // Straight away if it can; else the way of the two at a slant that's open
        for (const turn of [0, 0.6, -0.6, 1.3, -1.3, 2]) {
            const c = fm.cos(turn);
            const s = fm.sin(turn);
            const vx = ax * c - ay * s;
            const vy = ax * s + ay * c;
            if (isCircleFree(this.grid, m.x + vx * 0.8, m.y + vy * 0.8, m.radius)) {
                this.moveMonster(m, vx, vy, m.speed);
                m.yaw = yawFromVector(vx, vy);
                return;
            }
        }
    }

    // An impling hit: gold or a rune shaken out of it
    private implingShaken(m: Monster): void {
        const rng = this.rng;
        if (rng.chance(IMPLING.goldChance)) {
            const gold = Math.round((1 + rng.int(3)) * (1 + m.level * 0.7));
            const drop: Drop = { uid: this.uid++, gold, x: m.x, y: m.y, tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        if (rng.chance(IMPLING.runeChance)) {
            const drop: Drop = { uid: this.uid++, rune: rollRune(rng, m.level), x: m.x, y: m.y, tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
    }

    // What an encounter's monster drops in place of its own, true if it did: an impling's jar, a
    // hunter's gear, a superior's three rares' worth
    private encounterLoot(m: Monster): boolean {
        const at = { x: m.x, y: m.y, level: m.level };
        if (m.encounter === "impling") {
            this.dropLoot({ ...at, rank: m.def.id === IMPLING.lucky ? "boss" : "hoard" });
            m.deadTick = this.tick - this.corpseTicks;
            this.emit({ kind: "spot", spot: IMPLING.puff, x: m.x, y: m.y });
            this.emit({ kind: "encounter", what: "implingCaught", name: m.name });
            return true;
        }
        if (m.encounter === "hunter") {
            this.dropLoot({ ...at, rank: "hoard" });
            return true;
        }
        if (m.encounter === "superior") {
            for (let i = 0; i < SUPERIOR.drops; i++) {
                this.dropLoot({ ...at, rank: "rare" });
            }
            return true;
        }
        // A path's guardian in the Tombs: two hoards' worth, not a pinnacle's uniques, which are the
        // Wardens' alone
        if (m.encounter === "tombs" && m.rank === "boss" && m.uid !== this.bossUid) {
            this.dropLoot({ ...at, rank: "hoard" });
            this.dropLoot({ ...at, rank: "hoard" });
            return true;
        }
        return false;
    }

    // An encounter moved on by a kill: a Barrows brother down, a Fight Caves wave beaten; and any
    // ladder kill's chance of calling up its superior
    private encounterKilled(m: Monster): void {
        // A ladder guardian, or now and then a rare, drops a piece of Graceful
        const graceful = m.rank === "boss" ? GRACEFUL_DROPS.boss : m.rank === "rare" && !m.encounter ? GRACEFUL_DROPS.rare : 0;
        if (graceful > 0 && this.rng.chance(graceful)) {
            this.dropNear(rollSetPiece(this.rng, nextUid(this.heroData), m.level, ["graceful"]), m.x, m.y);
        }
        if (m.encounter === "brother") {
            this.barrowsSlain++;
            // A brother now and then drops a piece of his own set
            const own = BROTHER_SETS[m.def.id as BrotherId];
            if (own && this.rng.chance(BARROWS.pieceChance)) {
                this.dropNear(rollSetPiece(this.rng, nextUid(this.heroData), m.level, [own]), m.x, m.y);
            }
            if (this.barrowsSlain >= this.barrowsTombs) {
                this.emit({ kind: "encounter", what: "barrowsOpen" });
            } else {
                this.emit({ kind: "encounter", what: "brother", name: m.name, left: this.barrowsTombs - this.barrowsSlain });
            }
            return;
        }
        const caves = this.caves;
        if (m.encounter === "caves" && caves && caves.state === "fighting" && m.pack === caves.pack) {
            if (!(this.packs[caves.pack] ?? []).some((o) => o.state !== "dead")) {
                caves.held = FIGHT_CAVES.tokkul * 2 ** (caves.wave - 1);
                if (caves.wave >= FIGHT_CAVES.waves.length) {
                    this.cavesTake();
                } else {
                    caves.state = "choice";
                    this.emit({ kind: "encounter", what: "waveCleared", wave: caves.wave, tokkul: caves.held });
                }
            }
            return;
        }
        // A god's follower, of their host or their army in a skirmish: their kill count
        const god = (m.encounter === "army" ? m.side : !m.encounter && this.rift ? HOST_GOD[this.rift.host.id] : undefined) as GodId | undefined;
        if (god) {
            addKillCount(this.heroData, god, m.rank === "boss" ? 5 : m.rank === "rare" ? 2 : 1);
        }
        // The Great Guardian fought for: whatever's slain gives up its essence
        const g = this.guardian;
        if (g && g.state === "active") {
            g.carried += RIFT_GUARDIANS.essence[m.rank];
        }
        if (m.encounter === "breach") {
            const count = BREACH.ashes[m.rank] ?? 1;
            const drop: Drop = { uid: this.uid++, good: { id: BREACH.ashesId, count }, x: m.x, y: m.y, tick: this.tick };
            this.drops.push(drop);
            this.emit({ kind: "drop", drop });
        }
        if (m.encounter === "portal") {
            this.portalBroken(m);
        }
        if (m.encounter === "army") {
            this.armySlain(m);
        }
        if (!m.encounter && !m.raised && m.rank !== "boss" && this.rng.chance(SUPERIOR.chance * (1 + this.orrery.superior))) {
            this.callSuperior(m);
        }
    }

    // A superior where a monster fell: the cache's own, or the monster drawn bigger
    private callSuperior(m: Monster): void {
        const own = SUPERIORS[m.def.id as MonsterId];
        const def: MonsterDef = own ? MONSTERS[own] : m.def;
        const pack = this.packs.length;
        const s = this.spawnMonster(def, "rare", { x: m.x, y: m.y }, pack, [], !own ? false : true);
        s.encounter = "superior";
        s.name = own ? def.name : `Superior ${def.name.charAt(0).toLowerCase()}${def.name.slice(1)}`;
        s.mods = s.mods.slice(0, SUPERIOR.mods);
        s.maxLife = s.life = Math.round(s.maxLife * SUPERIOR.life);
        if (!own) {
            s.size *= SUPERIOR.size;
            s.radius *= SUPERIOR.size;
        }
        s.state = "chase";
        s.staggerUntil = this.tick + seconds(FEATURES.rise);
        this.packs.push([s]);
        this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot!, x: s.x, y: s.y });
        this.emit({ kind: "encounter", what: "superior", name: s.name });
    }

    // A guardian's guards called again (Summoning): a magic pack of its rift's first monster
    private callGuards(m: Monster, n: number): void {
        const zone = riftZone(this.zone.depth, this.zone.seed, this.zone.pinnacle);
        const def: MonsterDef = MONSTERS[zone.monsters[0][0]];
        const mods = this.packMods(def);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            const at = spotNear(this.grid, this.rng, { x: m.x + fm.cos(a) * 3, y: m.y + fm.sin(a) * 3 }, 1, def.radius);
            if (!this.reachable(at.x, at.y) || !isCircleFree(this.grid, at.x, at.y, def.radius)) {
                continue;
            }
            const o = this.spawnMonster(def, "magic", at, m.pack, mods);
            o.encounter = "summoned";
            o.state = "chase";
            o.staggerUntil = this.tick + seconds(FEATURES.rise);
            this.packs[m.pack]?.push(o);
            this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot!, x: o.x, y: o.y });
        }
    }

    // Scorpia's guardians heal her while they're near
    private guardHeals(m: Monster): void {
        const roamer = this.monsterByUid(this.roamerUid);
        if (!roamer || roamer.state === "dead" || roamer.life >= roamer.maxLife) {
            return;
        }
        if (fm.hypot(roamer.x - m.x, roamer.y - m.y) <= ROAMERS.scorpia.near) {
            roamer.life = Math.min(roamer.maxLife, roamer.life + (roamer.maxLife * ROAMERS.scorpia.heal) / TICKS_PER_SECOND);
            if (this.tick % 40 === 0) {
                this.emit({ kind: "spot", spot: SPOT.blueImpact.impactSpot!, x: roamer.x, y: roamer.y });
            }
        }
    }

    // The hero thrown a few tiles, somewhere they can stand (the Chaos Elemental's)
    private throwHero(from: number, to: number): void {
        const h = this.hero;
        for (let tries = 0; tries < 8; tries++) {
            const a = this.rng.next() * Math.PI * 2;
            const r = from + this.rng.next() * (to - from);
            const x = h.x + fm.cos(a) * r;
            const y = h.y + fm.sin(a) * r;
            if (this.reachable(x, y) && isCircleFree(this.grid, x, y, HERO.radius)) {
                this.emit({ kind: "spot", spot: TELEPORT_SPOT, x: h.x, y: h.y });
                h.x = h.prevX = x;
                h.y = h.prevY = y;
                h.goal = undefined;
                this.emit({ kind: "spot", spot: TELEPORT_SPOT, x, y });
                return;
            }
        }
    }

    // The Fight Caves' mouth, a Barrows tomb, the Barrows chest or an Abyssal breach, touched
    private useEncounter(f: Feature): void {
        if (f.kind === "breach") {
            const b = this.breach;
            if (b && b.state === "closed") {
                b.state = "open";
                b.start = this.tick;
                b.nextSpawn = this.tick;
                b.pack = this.packs.length;
                this.packs.push([]);
                f.used = true;
                this.emit({ kind: "spot", spot: BREACH.spot, x: f.x, y: f.y });
                this.emit({ kind: "sound", id: BREACH.sound, x: f.x, y: f.y });
                this.emit({ kind: "encounter", what: "breachOpen" });
            }
            return;
        }
        if (f.kind === "caves") {
            const caves = this.caves;
            if (!caves || caves.state === "done") {
                return;
            }
            if (caves.state === "fighting") {
                this.emit({ kind: "encounter", what: "waveStands", wave: caves.wave });
            } else if (caves.state === "choice") {
                this.emit({ kind: "encounter", what: "waveCleared", wave: caves.wave, tokkul: caves.held });
            } else {
                this.cavesGo();
            }
            return;
        }
        if (f.kind === "tomb") {
            f.used = true;
            const def: MonsterDef = MONSTERS[f.brother ?? "dharok"];
            const pack = this.packs.length;
            const m = this.spawnMonster(def, "rare", spotNear(this.grid, this.rng, f.stand, 1.5, def.radius), pack, [], true);
            m.encounter = "brother";
            m.name = def.name;
            m.maxLife = m.life = Math.round(m.maxLife * BARROWS.life);
            m.state = "chase";
            m.staggerUntil = this.tick + seconds(FEATURES.rise);
            this.packs.push([m]);
            this.emit({ kind: "spot", spot: SPOT.shadowBarrage.impactSpot!, x: m.x, y: m.y });
            this.emit({ kind: "sound", id: m.def.sounds.attack, x: m.x, y: m.y });
            this.emit({ kind: "feature", feature: f, what: "opened" });
            return;
        }
        // The Barrows chest: sealed till the brothers are down
        if (this.barrowsSlain < this.barrowsTombs || this.barrowsTombs === 0) {
            this.emit({ kind: "encounter", what: "barrowsSealed", left: this.barrowsTombs - this.barrowsSlain });
            return;
        }
        f.used = true;
        this.dropLoot({ x: f.x, y: f.y, level: this.level + 1, rank: "hoard" });
        this.dropLoot({ x: f.x, y: f.y, level: this.level + 1, rank: "rare" });
        // And now and then a piece of one of the slain brothers' sets
        const brothers = this.rift?.brothers ?? [];
        if (brothers.length > 0 && this.rng.chance(BARROWS.setChance)) {
            this.dropNear(rollSetPiece(this.rng, nextUid(this.heroData), this.level + 1, brothers.map((b) => BROTHER_SETS[b])), f.stand.x, f.stand.y);
        }
        this.emit({ kind: "feature", feature: f, what: "opened" });
    }

    // ---- The encounters that run on their own: Pest Control, a God Wars skirmish, an Abyssal
    // breach and Guardians of the Rift (content/encounters.ts) ----

    // Someone who stands in a rift to be spoken to: the Void Knight, the Great Guardian
    private raiseAlly(npcId: number, name: string, at: Spot, yaw: number): Person {
        const p: Person = {
            uid: this.uid++,
            kind: "ally",
            npcId,
            name,
            x: at.x,
            y: at.y,
            prevX: at.x,
            prevY: at.y,
            yaw,
            homeX: at.x,
            homeY: at.y,
            homeYaw: yaw,
            wander: 0,
            moving: false,
            toX: at.x,
            toY: at.y,
            nextMove: Infinity,
            talkTick: -999,
        };
        this.people.push(p);
        return p;
    }

    // Pest Control: the Void Knight, and four portals round him, shielded
    private raisePestControl(at: Spot, rng: Rng): void {
        const knight = this.raiseAlly(PEST_CONTROL.knight.npcId, PEST_CONTROL.knight.name, at, rng.next() * Math.PI * 2);
        const pack = this.packs.length;
        const portals: Monster[] = [];
        const turn = rng.next() * Math.PI * 2;
        PEST_CONTROL.portals.forEach((id, i) => {
            const def: MonsterDef = MONSTERS[id];
            const a = turn + (i / PEST_CONTROL.portals.length) * Math.PI * 2;
            const spot = spotNear(this.grid, rng, { x: at.x + fm.cos(a) * PEST_CONTROL.ring, y: at.y + fm.sin(a) * PEST_CONTROL.ring }, 2.5, def.radius);
            if (!this.reachable(spot.x, spot.y) || !isCircleFree(this.grid, spot.x, spot.y, def.radius)) {
                return;
            }
            const m = this.spawnMonster(def, "normal", spot, pack, [], true);
            m.encounter = "portal";
            m.side = "pest";
            m.shielded = true;
            m.maxLife = m.life = Math.round(m.maxLife * PEST_CONTROL.portalLife);
            portals.push(m);
        });
        this.packs.push(portals);
        const pests = this.packs.length;
        this.packs.push([]);
        this.pest = { knight: knight.uid, x: knight.x, y: knight.y, life: 100, portals: portals.map((m) => m.uid), broken: 0, nextShield: 0, nextSpawn: 0, pack: pests, state: "waiting" };
    }

    // A God Wars skirmish: two gods' armies, apart, each led by a rare
    private raiseSkirmish(gods: [GodId, GodId], at: Spot, rng: Rng): void {
        const turn = rng.next() * Math.PI * 2;
        const packs: number[] = [];
        gods.forEach((god, side) => {
            const host = HOSTS[god];
            const dir = side === 0 ? 1 : -1;
            const middle = { x: at.x + fm.cos(turn) * dir * GOD_WARS.apart * 0.5, y: at.y + fm.sin(turn) * dir * GOD_WARS.apart * 0.5 };
            const pack = this.packs.length;
            const members: Monster[] = [];
            for (let i = 0; i < GOD_WARS.army; i++) {
                const id = host.monsters[Math.max(0, rng.weightedIndex(host.monsters.map(([, w]) => w)))][0];
                const def: MonsterDef = MONSTERS[id];
                const spot = spotNear(this.grid, rng, middle, 3, def.radius);
                if (!this.reachable(spot.x, spot.y) || !isCircleFree(this.grid, spot.x, spot.y, def.radius)) {
                    continue;
                }
                const m = this.spawnMonster(def, i === 0 ? "rare" : "normal", spot, pack, [], true);
                m.encounter = "army";
                m.side = god;
                m.yaw = yawFromVector(at.x - m.x, at.y - m.y);
                members.push(m);
            }
            this.packs.push(members);
            packs.push(pack);
        });
        this.skirmish = { gods, packs: [packs[0], packs[1]], x: at.x, y: at.y, state: "waiting" };
    }

    // Each tick, the encounters that run on their own
    private stepEncounters(): void {
        const h = this.hero;
        const near = (x: number, y: number, r: number) => !h.dead && fm.hypot(h.x - x, h.y - y) <= r;
        const pest = this.pest;
        if (pest) {
            if (pest.state === "waiting" && near(pest.x, pest.y, PEST_CONTROL.start)) {
                pest.state = "fighting";
                pest.nextShield = this.tick;
                pest.nextSpawn = this.tick + seconds(1.5);
                this.emit({ kind: "encounter", what: "pestStart" });
            }
            if (pest.state === "fighting") {
                this.stepPest(pest);
            }
        }
        const skirmish = this.skirmish;
        if (skirmish && skirmish.state === "waiting" && near(skirmish.x, skirmish.y, GOD_WARS.start)) {
            skirmish.state = "fighting";
            for (const pack of skirmish.packs) {
                for (const m of this.packs[pack] ?? []) {
                    if (m.state === "idle") {
                        m.state = "chase";
                    }
                }
            }
            this.emit({ kind: "encounter", what: "skirmish", name: skirmish.gods.map((g) => GOD_NAMES[g]).join(" and ") });
        }
        const breach = this.breach;
        if (breach && breach.state === "open") {
            this.stepBreach(breach);
        }
        const g = this.guardian;
        if (g && g.state === "active") {
            this.stepGuardians(g);
        }
        const c = this.colosseum;
        if (c) {
            this.stepColosseum(c);
        }
        const t = this.tombs;
        if (t) {
            this.stepTombs(t);
        }
    }

    // Pest Control under way: a portal's shield down in turn, pests out of the open ones, and the
    // Void Knight's life
    private stepPest(pest: PestState): void {
        const portals = pest.portals.map((uid) => this.monsterByUid(uid)).filter((m): m is Monster => !!m && m.state !== "dead");
        if (this.tick >= pest.nextShield) {
            const next = portals.find((m) => m.shielded);
            if (next && !portals.some((m) => !m.shielded)) {
                next.shielded = false;
                // Drawn as its open self from now on
                const open = PEST_CONTROL.open[next.def.id as MonsterId];
                if (open) {
                    next.def = MONSTERS[open];
                }
                this.emit({ kind: "spot", spot: PEST_CONTROL.shieldSpot, x: next.x, y: next.y });
                this.emit({ kind: "encounter", what: "portalOpen", name: next.def.name });
            }
            pest.nextShield = this.tick + seconds(PEST_CONTROL.shieldSeconds);
        }
        if (this.tick >= pest.nextSpawn) {
            pest.nextSpawn = this.tick + seconds(PEST_CONTROL.every);
            const alive = (this.packs[pest.pack] ?? []).filter((m) => m.state !== "dead").length;
            for (const portal of portals) {
                if (alive >= PEST_CONTROL.most) {
                    break;
                }
                const id = PEST_CONTROL.pests[Math.max(0, this.rng.weightedIndex(PEST_CONTROL.pests.map(([, w]) => w)))][0];
                const def: MonsterDef = MONSTERS[id];
                const spot = spotNear(this.grid, this.rng, portal, 1.5, def.radius);
                if (!this.reachable(spot.x, spot.y) || !isCircleFree(this.grid, spot.x, spot.y, def.radius)) {
                    continue;
                }
                const m = this.spawnMonster(def, "normal", spot, pest.pack, [], true);
                m.encounter = "pest";
                m.side = "pest";
                m.state = "chase";
                m.staggerUntil = this.tick + seconds(FEATURES.rise);
                this.packs[pest.pack].push(m);
                this.emit({ kind: "spot", spot: PEST_CONTROL.spawnSpot, x: m.x, y: m.y });
            }
        }
        if (pest.life <= 0) {
            pest.state = "lost";
            this.endPest(pest);
            this.emit({ kind: "encounter", what: "knightFallen", count: pest.broken * PEST_CONTROL.commendations.portal });
        }
    }

    // A portal broken: the next one's shield comes down at once, and with all four the Void Knight
    // holds
    private portalBroken(m: Monster): void {
        const pest = this.pest;
        if (!pest || pest.state !== "fighting") {
            return;
        }
        pest.broken++;
        this.dropGood(PEST_CONTROL.commendationId, PEST_CONTROL.commendations.portal, m.x, m.y);
        const left = pest.portals.map((uid) => this.monsterByUid(uid)).filter((o) => o && o.state !== "dead");
        if (left.length === 0) {
            pest.state = "won";
            this.endPest(pest);
            const won = PEST_CONTROL.commendations.won + Math.round((pest.life / 100) * PEST_CONTROL.commendations.life);
            this.dropGood(PEST_CONTROL.commendationId, won, pest.x, pest.y);
            this.dropLoot({ x: pest.x, y: pest.y, level: this.level + 1, rank: "hoard" });
            this.emit({ kind: "encounter", what: "pestWon", count: won + pest.broken * PEST_CONTROL.commendations.portal });
        } else {
            pest.nextShield = this.tick;
            this.emit({ kind: "encounter", what: "portalBroken", left: left.length });
        }
    }

    // Pest Control over, won or lost: what's left of the pests and portals is gone
    private endPest(pest: PestState): void {
        for (const m of [...(this.packs[pest.pack] ?? []), ...pest.portals.map((uid) => this.monsterByUid(uid))]) {
            if (m && m.state !== "dead") {
                this.vanish(m);
            }
        }
    }

    // A monster gone in a puff, without dying: nothing dropped, nothing gained
    private vanish(m: Monster): void {
        m.life = 0;
        m.state = "dead";
        m.deadTick = this.tick - this.corpseTicks;
        this.emit({ kind: "spot", spot: IMPLING.puff, x: m.x, y: m.y });
    }

    // One of the pouch's goods dropped on the ground
    private dropGood(id: GoodId, count: number, x: number, y: number): void {
        if (count <= 0) {
            return;
        }
        const at = spotNear(this.grid, this.rng, { x, y }, 1, 0.2);
        const drop: Drop = { uid: this.uid++, good: { id, count }, x: at.x, y: at.y, tick: this.tick };
        this.drops.push(drop);
        this.emit({ kind: "drop", drop });
    }

    // A skirmish's monster slain, by the hero or the other army: with both armies down, it's over
    private armySlain(m: Monster): void {
        const s = this.skirmish;
        if (!s || s.state === "done") {
            return;
        }
        const standing = s.packs.some((pack) => (this.packs[pack] ?? []).some((o) => o !== m && o.state !== "dead"));
        if (!standing) {
            s.state = "done";
            this.dropLoot({ x: s.x, y: s.y, level: this.level + 1, rank: "hoard" });
            this.emit({ kind: "encounter", what: "skirmishDone", name: s.gods.map((g) => GOD_NAMES[g]).join(" and ") });
        }
    }

    // An Abyssal breach open: its ring grows, holds and shrinks, the Abyss pouring out inside it,
    // and what's outside it as it shrinks is gone
    private stepBreach(b: BreachState): void {
        const t = (this.tick - b.start) / TICKS_PER_SECOND;
        const { radius, grow, seconds: lasts, shrink } = BREACH;
        b.radius = t < grow ? radius * (t / grow) : t > lasts - shrink ? radius * Math.max(0, (lasts - t) / shrink) : radius;
        const inside = (m: Monster) => fm.hypot(m.x - b.x, m.y - b.y) <= b.radius + 0.5;
        for (const m of this.packs[b.pack] ?? []) {
            if (m.state !== "dead" && t > grow && !inside(m)) {
                this.vanish(m);
            }
        }
        if (t >= lasts) {
            b.state = "done";
            b.radius = 0;
            this.emit({ kind: "encounter", what: "breachClosed" });
            return;
        }
        if (this.tick >= b.nextSpawn && t < lasts - shrink) {
            b.nextSpawn = this.tick + seconds(BREACH.every);
            const id = BREACH.monsters[Math.max(0, this.rng.weightedIndex(BREACH.monsters.map(([, w]) => w)))][0];
            const def: MonsterDef = MONSTERS[id];
            const a = this.rng.next() * Math.PI * 2;
            const r = Math.max(1.5, b.radius * (0.3 + this.rng.next() * 0.6));
            const spot = spotNear(this.grid, this.rng, { x: b.x + fm.cos(a) * r, y: b.y + fm.sin(a) * r }, 1, def.radius);
            if (this.reachable(spot.x, spot.y) && isCircleFree(this.grid, spot.x, spot.y, def.radius)) {
                const magic = this.rng.chance(BREACH.magic);
                const m = this.spawnMonster(def, magic ? "magic" : "normal", spot, b.pack, magic ? this.packMods(def) : [], true);
                m.encounter = "breach";
                m.state = "chase";
                m.staggerUntil = this.tick + seconds(FEATURES.rise * 0.6);
                this.packs[b.pack].push(m);
                this.emit({ kind: "spot", spot: BREACH.spawnSpot, x: m.x, y: m.y });
            }
        }
    }

    // Guardians of the Rift under way: creatures out of the rifts round the Great Guardian, and its
    // time
    private stepGuardians(g: GuardianState): void {
        const t = (this.tick - g.start) / TICKS_PER_SECOND;
        if (t >= RIFT_GUARDIANS.seconds) {
            g.state = "lost";
            const pearls = Math.floor(g.power * RIFT_GUARDIANS.pearls.per);
            this.dropGood(RIFT_GUARDIANS.pearlsId, pearls, g.x, g.y);
            for (const m of this.packs[g.pack] ?? []) {
                if (m.state !== "dead") {
                    this.vanish(m);
                }
            }
            this.emit({ kind: "encounter", what: "guardiansLost", count: pearls, left: g.power });
            return;
        }
        if (this.tick >= g.nextSpawn) {
            g.nextSpawn = this.tick + seconds(RIFT_GUARDIANS.every);
            const alive = (this.packs[g.pack] ?? []).filter((m) => m.state !== "dead").length;
            if (alive < RIFT_GUARDIANS.most) {
                const id = RIFT_GUARDIANS.monsters[Math.max(0, this.rng.weightedIndex(RIFT_GUARDIANS.monsters.map(([, w]) => w)))][0];
                const def: MonsterDef = MONSTERS[id];
                const a = this.rng.next() * Math.PI * 2;
                const [lo, hi] = RIFT_GUARDIANS.ring;
                const r = lo + this.rng.next() * (hi - lo);
                const spot = spotNear(this.grid, this.rng, { x: g.x + fm.cos(a) * r, y: g.y + fm.sin(a) * r }, 1.5, def.radius);
                if (this.reachable(spot.x, spot.y) && isCircleFree(this.grid, spot.x, spot.y, def.radius)) {
                    const m = this.spawnMonster(def, this.rng.chance(RIFT_GUARDIANS.magic) ? "magic" : "normal", spot, g.pack, [], true);
                    m.encounter = "rift";
                    m.state = "chase";
                    m.staggerUntil = this.tick + seconds(FEATURES.rise * 0.6);
                    this.packs[g.pack].push(m);
                    this.emit({ kind: "spot", spot: RIFT_GUARDIANS.spawnSpot, x: m.x, y: m.y });
                }
            }
        }
    }

    // Someone in a rift spoken to: the Great Guardian woken, or given the essence carried; the
    // Void Knight only talks. Whether it was anyone's.
    speakTo(person: Person): string | undefined {
        const t = this.tombs;
        if (t && person.uid === t.osmumten) {
            const left = t.chambers.filter((c) => !c.done).length;
            switch (t.state) {
                case "open":
                    return t.beaten === 0
                        ? `Four paths lead off the Nexus, and you take them in any order: walk into a chamber and its guardian rises. Beat all four, and the Wardens wake in the Nexus itself${t.level > 0 ? `. Raid level ${t.level}: good luck` : ""}.`
                        : `${COUNT_WORDS[t.beaten]} of the four paths beaten. ${COUNT_WORDS[left]} more, then the Wardens.`;
                case "fighting":
                    return `${TOMBS.rooms[t.room].name}. Keep moving!`;
                case "wardens":
                    return "All four paths! Come into the Nexus, and the Wardens wake.";
                case "rising":
                    return "Here they come!";
                default:
                    return "The Wardens, beaten! Amascut won't forget this, and nor will I.";
            }
        }
        const c = this.colosseum;
        if (c && person.uid === c.minimus) {
            if (c.state === "choice") {
                this.emit({ kind: "encounter", what: "glories", wave: c.wave });
                return "Choose your glory! The crowd's waiting.";
            }
            return c.state === "waiting"
                ? "Step on to the sand, and the first wave comes. Twelve, and Sol Heredit last."
                : c.state === "done"
                  ? "Sol Heredit, beaten! They'll be talking about this for years."
                  : `Wave ${Math.max(1, c.wave)} of ${COLOSSEUM.waves.length}. Fight!`;
        }
        const g = this.guardian;
        if (g && person.uid === g.person) {
            if (g.state === "waiting") {
                g.state = "active";
                g.start = this.tick;
                g.nextSpawn = this.tick + seconds(1);
                g.pack = this.packs.length;
                this.packs.push([]);
                this.emit({ kind: "encounter", what: "guardiansStart" });
                return "The rift opens! Bring me their essence, quickly.";
            }
            if (g.state === "active") {
                if (g.carried === 0) {
                    return "Slay what comes through the rift, and bring me its essence.";
                }
                g.power = Math.min(100, g.power + g.carried * RIFT_GUARDIANS.perEssence);
                const given = g.carried;
                g.carried = 0;
                this.emit({ kind: "spot", spot: RIFT_GUARDIANS.powerSpot, x: g.x, y: g.y });
                if (g.power >= 100) {
                    g.state = "won";
                    const left = Math.max(0, RIFT_GUARDIANS.seconds - (this.tick - g.start) / TICKS_PER_SECOND);
                    const pearls = RIFT_GUARDIANS.pearls.won + Math.round(left * RIFT_GUARDIANS.pearls.perSecond);
                    this.dropGood(RIFT_GUARDIANS.pearlsId, pearls, g.x, g.y);
                    this.dropLoot({ x: g.x, y: g.y, level: this.level + 1, rank: "hoard" });
                    for (const m of this.packs[g.pack] ?? []) {
                        if (m.state !== "dead") {
                            this.vanish(m);
                        }
                    }
                    this.emit({ kind: "encounter", what: "guardiansWon", count: pearls });
                    return "The rift is sealed. Take these, with my thanks.";
                }
                this.emit({ kind: "encounter", what: "guardiansPower", count: given, left: g.power });
                return `${given} essence: I'm at ${Math.round(g.power)}%. More!`;
            }
            return g.state === "won" ? "The rift is sealed, thanks to you." : "The rift's closed. We'll try again another time.";
        }
        const pest = this.pest;
        if (pest && person.uid === pest.knight) {
            return pest.state === "waiting"
                ? "The portals! Break them, before what comes out of them breaks me."
                : pest.state === "fighting"
                  ? "Break the portals! I'll hold as long as I can."
                  : pest.state === "won"
                    ? "The portals are down. The Void Knights won't forget it."
                    : "I couldn't hold them. Go, before more come.";
        }
        return undefined;
    }

    // A side's monster while the hero's off: after its foe (the other army's nearest, or for a pest
    // the Void Knight), and its blow at it. Whether it was its turn's all.
    private sideTurn(m: Monster, dHero: number): boolean {
        if (m.state === "dead" || m.state === "special" || m.state === "return") {
            return false;
        }
        // A blow at a foe already under way lands, or misses, first
        if (m.state === "attack" && m.foeBlow) {
            this.foeBlowing(m);
            return true;
        }
        if (m.state !== "chase") {
            return false;
        }
        const heroNear = m.side === "pest" ? PEST_CONTROL.heroNear : GOD_WARS.heroNear;
        if (!this.hero.dead && dHero <= heroNear) {
            return false;
        }
        const foe = this.foeOf(m);
        if (!foe) {
            return false;
        }
        const dx = foe.x - m.x;
        const dy = foe.y - m.y;
        const d = fm.hypot(dx, dy);
        m.yaw = yawFromVector(dx, dy);
        const reach = m.def.ranged ? Math.min(m.def.ranged.range, 6) : m.def.reach * m.size + foe.radius;
        if (d <= reach) {
            m.state = "attack";
            m.foeBlow = true;
            m.actionStart = this.tick;
            m.actionEnd = this.tick + m.attackTicks;
            m.actionDone = false;
            this.emit({ kind: "monsterAttack", monster: m });
            return true;
        }
        if (d > 0.001) {
            this.moveMonster(m, dx / d, dy / d, m.speed);
        }
        return true;
    }

    // What a side's monster is after: for a pest, the Void Knight while he stands; for an army's, the
    // nearest of the other army, looked for again now and then
    private foeOf(m: Monster): { x: number; y: number; radius: number; monster?: Monster } | undefined {
        if (m.side === "pest") {
            const pest = this.pest;
            return pest && pest.state === "fighting" ? { x: pest.x, y: pest.y, radius: 0.5 } : undefined;
        }
        let foe = m.foe !== undefined ? this.monsterByUid(m.foe) : undefined;
        if (!foe || foe.state === "dead" || (this.tick + m.uid) % 25 === 0) {
            foe = undefined;
            let best = 24;
            const s = this.skirmish;
            for (const pack of s?.packs ?? []) {
                for (const o of this.packs[pack] ?? []) {
                    if (o.state === "dead" || o.side === m.side) {
                        continue;
                    }
                    const d = fm.hypot(o.x - m.x, o.y - m.y);
                    if (d < best) {
                        best = d;
                        foe = o;
                    }
                }
            }
            m.foe = foe?.uid;
        }
        return foe ? { x: foe.x, y: foe.y, radius: foe.radius, monster: foe } : undefined;
    }

    // A side's blow at its foe, landing: a share of an army's monster's life, or of the Void Knight's
    private foeBlowing(m: Monster): void {
        if (!m.actionDone && this.tick >= m.actionStart + m.hitTicks) {
            m.actionDone = true;
            this.emit({ kind: "monsterBlow", monster: m });
            const foe = this.foeOf(m);
            if (foe && fm.hypot(foe.x - m.x, foe.y - m.y) <= (m.def.ranged ? Math.min(m.def.ranged.range, 6) : m.def.reach * m.size + foe.radius) + 0.8) {
                if (m.def.ranged?.visual.impactSpot !== undefined) {
                    this.emit({ kind: "spot", spot: m.def.ranged.visual.impactSpot, x: foe.x, y: foe.y });
                }
                if (foe.monster) {
                    const o = foe.monster;
                    const amount = Math.max(1, Math.round(o.maxLife * GOD_WARS.blow * (m.rank === "rare" ? 1.6 : 1) * (0.8 + this.rng.next() * 0.4)));
                    o.life -= amount;
                    this.emit({ kind: "monsterHit", uid: o.uid, amount, crit: false, fromX: m.x, fromY: m.y, share: 0 });
                    if (o.life <= 0) {
                        o.life = 0;
                        o.state = "dead";
                        o.deadTick = this.tick;
                        this.emit({ kind: "monsterDied", monster: o, overkill: 0, fromX: m.x, fromY: m.y, crit: false });
                        this.emit({ kind: "sound", id: o.def.sounds.death, x: o.x, y: o.y, volume: 0.5 });
                        this.armySlain(o);
                    }
                } else if (this.pest) {
                    this.pest.life = Math.max(0, this.pest.life - PEST_CONTROL.blow * (m.rank === "normal" ? 1 : 2));
                }
            }
        }
        if (this.tick >= m.actionEnd) {
            m.state = "chase";
            m.foeBlow = false;
        }
    }

    // What's under the name of someone in a rift, as they are now
    allyText(person: Person): string {
        const t = this.tombs;
        if (t && person.uid === t.osmumten) {
            return t.state === "open" ? (t.beaten === 0 ? "Four paths lead off the Nexus" : "Points the way to the next path") : t.state === "fighting" ? "Leads you through the Tombs" : t.state === "done" ? "The Wardens are beaten" : "The Wardens wake in the Nexus";
        }
        const c = this.colosseum;
        if (c && person.uid === c.minimus) {
            return c.state === "choice" ? "Offers you glory" : c.state === "done" ? "The Colosseum's won" : "Calls the Colosseum's waves";
        }
        const g = this.guardian;
        if (g && person.uid === g.person) {
            return g.state === "waiting" ? "Speak to it to open its rift" : g.state === "active" ? `At ${Math.round(g.power)}%: bring it essence` : g.state === "won" ? "Its rift is sealed" : "Its rift has closed";
        }
        const pest = this.pest;
        if (pest && person.uid === pest.knight) {
            return pest.state === "waiting" ? "Beset by Pest Control's portals" : pest.state === "fighting" ? `${Math.round(pest.life)}% of his life: break the portals` : pest.state === "won" ? "The portals are broken" : "He couldn't hold them";
        }
        return "";
    }

    // What the screen shows of the encounter under way, if one is
    encounterStatus(): EncounterStatus | undefined {
        const t = this.tombs;
        if (t) {
            const rooms = TOMBS.rooms;
            const wardens = rooms[rooms.length - 1].name;
            const paths = t.chambers.length;
            const where =
                t.state === "open"
                    ? "Choose a path"
                    : t.state === "fighting"
                      ? rooms[t.room].name
                      : t.state === "wardens"
                        ? `${wardens}: back to the Nexus`
                        : t.state === "rising"
                          ? `${wardens}: coming`
                          : `${wardens}: beaten`;
            return {
                name: "The Tombs of Amascut",
                color: TOMBS.color,
                lines: [where, `Paths beaten: ${t.beaten} of ${paths} · raid level ${t.level}`, ...(this.invocations.length > 0 ? [this.invocations.map((id) => INVOCATIONS[id].name).join(", ")] : [])],
                share: (t.beaten + (t.state === "done" ? 1 : 0)) / rooms.length,
            };
        }
        const c = this.colosseum;
        if (c && c.state !== "waiting") {
            const taken = GLORY_IDS.filter((id) => (c.taken[id] ?? 0) > 0).map((id) => `${GLORIES[id].name}${c.taken[id]! > 1 ? ` ${"I".repeat(c.taken[id]!)}` : ""}`);
            const how = c.state === "rest" ? ": coming" : c.state === "choice" ? ": beaten" : c.state === "done" ? ": won" : "";
            return {
                name: "The Fortis Colosseum",
                color: COLOSSEUM.color,
                lines: [`Wave ${Math.max(1, c.wave)} of ${COLOSSEUM.waves.length}${how}`, `Glory: ${c.glory}`, ...(taken.length > 0 ? [taken.join(", ")] : [])],
                share: c.wave / COLOSSEUM.waves.length,
            };
        }
        const pest = this.pest;
        if (pest && pest.state === "fighting") {
            return {
                name: "Pest Control",
                color: PEST_CONTROL.color,
                lines: [`The Void Knight: ${Math.round(pest.life)}%`, `Portals broken: ${pest.broken} of ${pest.portals.length}`],
                share: pest.life / 100,
            };
        }
        const s = this.skirmish;
        if (s && s.state === "fighting") {
            return {
                name: "A God Wars skirmish",
                color: GOD_WARS.color,
                lines: s.gods.map((god, i) => `${GOD_NAMES[god]}: ${(this.packs[s.packs[i]] ?? []).filter((m) => m.state !== "dead").length} standing · kill count ${this.heroData.killCount[god] ?? 0}`),
            };
        }
        const b = this.breach;
        if (b && b.state === "open") {
            const left = Math.max(0, BREACH.seconds - (this.tick - b.start) / TICKS_PER_SECOND);
            return { name: "An Abyssal breach", color: BREACH.color, lines: [`${Math.ceil(left)} seconds`, `Abyssal ashes: ${this.heroData.goods[BREACH.ashesId] ?? 0}`], share: left / BREACH.seconds };
        }
        const g = this.guardian;
        if (g && g.state === "active") {
            const left = Math.max(0, RIFT_GUARDIANS.seconds - (this.tick - g.start) / TICKS_PER_SECOND);
            return {
                name: "Guardians of the Rift",
                color: RIFT_GUARDIANS.color,
                lines: [`The Great Guardian: ${Math.round(g.power)}%`, `Essence carried: ${g.carried}`, `${Math.ceil(left)} seconds`],
                share: g.power / 100,
            };
        }
        return undefined;
    }

    // ---- The Fortis Colosseum (content/colosseum.ts) ----

    // The sand's middle (the plan's guardian's arena, just past the camp's gate), and Minimus on it a
    // few steps towards the gate, facing the hero as they come in, waiting for them
    private raiseColosseum(): void {
        const sand = this.zone.guardian ?? this.layout.exit;
        const spawn = this.layout.spawn;
        const toward = fm.atan2(spawn.y - sand.y, spawn.x - sand.x);
        const by = spotNear(this.grid, this.rng, { x: sand.x + fm.cos(toward) * COLOSSEUM.minimus.by, y: sand.y + fm.sin(toward) * COLOSSEUM.minimus.by }, 1.5, PERSON_RADIUS);
        const at = this.reachable(by.x, by.y) ? by : sand;
        const p = this.raiseAlly(COLOSSEUM.minimus.npcId, COLOSSEUM.minimus.name, at, yawFromVector(spawn.x - at.x, spawn.y - at.y));
        this.colosseum = { minimus: p.uid, x: sand.x, y: sand.y, wave: 0, next: 0, pack: -1, offer: [], taken: {}, glory: 0, state: "waiting" };
    }

    // The hero come on to the sand, the next wave in after a rest, a wave beaten
    private stepColosseum(c: ColosseumState): void {
        const h = this.hero;
        if (c.state === "waiting" && !h.dead && fm.hypot(h.x - c.x, h.y - c.y) <= COLOSSEUM.start) {
            c.state = "rest";
            c.next = this.tick + seconds(COLOSSEUM.rest);
            this.emit({ kind: "encounter", what: "colosseumStart" });
        }
        if (c.state === "rest" && this.tick >= c.next) {
            this.colosseumWave(c);
        } else if (c.state === "fighting" && !(this.packs[c.pack] ?? []).some((m) => m.state !== "dead")) {
            this.colosseumCleared(c);
        }
    }

    // A wave in, round the sand's middle, as the glories taken have it; the twelfth with Sol Heredit
    private colosseumWave(c: ColosseumState): void {
        const rng = this.rng;
        c.wave++;
        c.state = "fighting";
        c.pack = this.packs.length;
        const wave = COLOSSEUM.waves[c.wave - 1];
        const level = (id: GloryId) => c.taken[id] ?? 0;
        const ids: MonsterId[] = wave.flatMap(([id, n]) => new Array<MonsterId>(n).fill(id));
        let rares = c.wave >= COLOSSEUM.rareFrom ? 1 : 0;
        const mods: MonsterMod[] = [];
        for (const g of GLORY_IDS) {
            const n = level(g);
            const def = GLORIES[g];
            for (let i = 0; i < n * (def.more ?? 0); i++) {
                ids.push(wave[0][0]);
            }
            for (let i = 0; i < n && def.extra; i++) {
                ids.push(def.extra);
            }
            rares += n * (def.rares ?? 0);
            if (n > 0 && def.mod) {
                mods.push(def.mod);
            }
        }
        const members: Monster[] = [];
        const turn = rng.next() * Math.PI * 2;
        const [lo, hi] = COLOSSEUM.ring;
        const place = (radius: number, a: number) => {
            const r = lo + rng.next() * (hi - lo);
            const spot = spotNear(this.grid, rng, { x: c.x + fm.cos(a) * r, y: c.y + fm.sin(a) * r }, 2, radius);
            return this.reachable(spot.x, spot.y) && isCircleFree(this.grid, spot.x, spot.y, radius) ? spot : spotNear(this.grid, rng, { x: c.x, y: c.y }, 3, radius);
        };
        ids.forEach((id, i) => {
            const def: MonsterDef = MONSTERS[id];
            const rank: MonsterRank = i < rares ? "rare" : c.wave >= COLOSSEUM.magicFrom ? "magic" : "normal";
            const m = this.spawnMonster(def, rank, place(def.radius, turn + (i / ids.length) * Math.PI * 2), c.pack, rank === "magic" ? this.packMods(def) : [], true);
            this.colosseumFighter(m, mods);
            members.push(m);
        });
        if (c.wave === COLOSSEUM.waves.length) {
            // Sol Heredit, as a god's general is in his stronghold: two of the guardians' mods, a
            // special of the pool's, and much the tougher
            const def: BossDef = BOSSES.solHeredit;
            const bossMods = this.pickMods(rng, [...LADDER_MODS, ...GUARDIAN_MODS].filter((mod) => !SHOOTER_MODS.includes(mod)), GUARDIAN_MOD_COUNT.two);
            const sol = this.spawnMonster(def, "boss", place(def.radius, turn + Math.PI), c.pack, bossMods);
            sol.extraSpecial = rng.pick(GUARDIAN_SPECIALS);
            sol.maxLife = sol.life = Math.round(sol.maxLife * COLOSSEUM.life);
            sol.damage = [sol.damage[0] * COLOSSEUM.damage, sol.damage[1] * COLOSSEUM.damage];
            this.awakenBoss(sol);
            this.bossUid = sol.uid;
            this.colosseumFighter(sol, mods);
            members.push(sol);
        }
        this.packs.push(members);
        for (const m of members) {
            this.wake(m);
        }
        this.emit({ kind: "encounter", what: "colosseumWave", wave: c.wave });
    }

    // A wave's fighter, in through the sand's dust and straight at the hero, with the glories' mods
    private colosseumFighter(m: Monster, mods: MonsterMod[]): void {
        m.encounter = "colosseum";
        m.state = "chase";
        m.staggerUntil = this.tick + seconds(FEATURES.rise);
        for (const mod of mods) {
            if (!m.mods.includes(mod)) {
                m.mods.push(mod);
            }
        }
        this.emit({ kind: "spot", spot: COLOSSEUM.spawnSpot, x: m.x, y: m.y });
    }

    // A wave beaten: what it's worth on the sand, and three glories offered for the next (or, past
    // the twelfth, the Colosseum won)
    private colosseumCleared(c: ColosseumState): void {
        this.dropLoot({ x: c.x, y: c.y, level: this.level + 1, rank: c.wave >= COLOSSEUM.hoardFrom ? "hoard" : "rare" });
        if (c.wave >= COLOSSEUM.waves.length) {
            c.state = "done";
            this.emit({ kind: "encounter", what: "colosseumWon", count: c.glory });
            return;
        }
        const open = GLORY_IDS.filter((id) => (c.taken[id] ?? 0) < COLOSSEUM.most);
        c.offer = [];
        while (c.offer.length < COLOSSEUM.offer && open.length > 0) {
            c.offer.push(open.splice(this.rng.int(open.length), 1)[0]);
        }
        c.state = "choice";
        this.emit({ kind: "encounter", what: "glories", wave: c.wave });
    }

    // A glory taken (one of the three offered): its rule on every wave to come, and its pay on the
    // rest of the run. Whether it could be.
    chooseGlory(id: GloryId): boolean {
        const c = this.colosseum;
        if (!c || c.state !== "choice" || !c.offer.includes(id)) {
            return false;
        }
        const def = GLORIES[id];
        c.taken[id] = (c.taken[id] ?? 0) + 1;
        c.glory += def.glory;
        const effect = this.effect as Record<keyof RiftEffect, number>;
        for (const key of Object.keys(def.effect ?? {}) as (keyof RiftEffect)[]) {
            effect[key] += def.effect![key] ?? 0;
        }
        this.reward.quantity += def.glory * COLOSSEUM.perGlory.quantity;
        this.reward.rarity += def.glory * COLOSSEUM.perGlory.rarity;
        c.offer = [];
        c.state = "rest";
        c.next = this.tick + seconds(COLOSSEUM.rest);
        this.emit({ kind: "encounter", what: "glory", name: def.name });
        return true;
    }

    // ---- The Tombs of Amascut (content/tombs.ts) ----

    // Osmumten beside where the hero comes in, the Nexus's middle where the Wardens will rise (the
    // plan's guardian's arena), and the four paths, each in a chamber off it, in an order of the
    // seed's
    private raiseTombs(): void {
        const rng = this.rng;
        const spawn = this.layout.spawn;
        const nexus = this.zone.guardian ?? this.layout.exit;
        const toward = fm.atan2(nexus.y - spawn.y, nexus.x - spawn.x);
        const by = spotNear(this.grid, rng, { x: spawn.x + fm.cos(toward) * TOMBS.osmumten.by, y: spawn.y + fm.sin(toward) * TOMBS.osmumten.by }, 1.5, PERSON_RADIUS);
        const at = this.reachable(by.x, by.y) ? by : spawn;
        const p = this.raiseAlly(TOMBS.osmumten.npcId, TOMBS.osmumten.name, at, yawFromVector(spawn.x - at.x, spawn.y - at.y));
        const paths = TOMBS.rooms.length - 1;
        const order = Array.from({ length: paths }, (_, i) => i);
        for (let i = order.length - 1; i > 0; i--) {
            const j = rng.int(i + 1);
            [order[i], order[j]] = [order[j], order[i]];
        }
        const chambers = this.tombsChambers(paths, nexus).map((c, i) => ({ ...c, room: order[i], done: false }));
        this.tombs = { osmumten: p.uid, x: nexus.x, y: nexus.y, chambers, room: -1, next: 0, pack: -1, guardian: -1, beaten: 0, level: raidLevel(this.invocations), state: "open" };
    }

    // Where the paths' chambers are: the nexus's (world/riftLayout.ts), or on land drawn without
    // one, spots round where the hero comes in, fanned out towards the Nexus
    private tombsChambers(paths: number, nexus: Spot): { x: number; y: number; r: number }[] {
        const planned = this.zone.rooms ?? [];
        if (planned.length >= paths) {
            return planned.slice(0, paths).map((c) => ({ x: c.x, y: c.y, r: c.r }));
        }
        const spawn = this.layout.spawn;
        const { reach, r } = TOMBS.fallback;
        const toward = fm.atan2(nexus.y - spawn.y, nexus.x - spawn.x);
        return Array.from({ length: paths }, (_, i) => {
            const a = toward + ((i - (paths - 1) / 2) * Math.PI) / (paths + 1);
            for (let d = reach; d >= r; d -= 2) {
                const x = spawn.x + fm.cos(a) * d;
                const y = spawn.y + fm.sin(a) * d;
                if (this.reachable(x, y) && isCircleFree(this.grid, x, y, 1.5)) {
                    return { x, y, r };
                }
            }
            return { x: spawn.x, y: spawn.y, r };
        });
    }

    // A path's chamber walked into, its room raised; a room beaten; the Wardens woken as the hero
    // comes back into the Nexus with the four paths beaten, and up a moment after
    private stepTombs(t: TombsState): void {
        const h = this.hero;
        if (t.state === "open" && !h.dead) {
            const c = t.chambers.find((c) => !c.done && fm.hypot(h.x - c.x, h.y - c.y) <= c.r * TOMBS.enter);
            if (c) {
                this.tombsRoom(t, c.room, c);
            }
        } else if (t.state === "wardens" && !h.dead && fm.hypot(h.x - t.x, h.y - t.y) <= TOMBS.nexus) {
            t.state = "rising";
            t.next = this.tick + seconds(TOMBS.rest);
            this.emit({ kind: "encounter", what: "tombsWardens" });
        } else if (t.state === "rising" && this.tick >= t.next) {
            this.tombsRoom(t, TOMBS.rooms.length - 1, t);
        } else if (t.state === "fighting" && !(this.packs[t.pack] ?? []).some((m) => m.state !== "dead")) {
            this.tombsCleared(t);
        }
    }

    // A room raised round its middle (a path's chamber's, or the Nexus's for the Wardens): its
    // guardian, tougher as a pinnacle's is, with a guardian's mod (the Wardens two, and a special of
    // the pool's), and its adds, magic, as the invocations have them; the Wardens, Tumeken's, the
    // rift's own guardian
    private tombsRoom(t: TombsState, index: number, at: Spot): void {
        const rng = this.rng;
        t.room = index;
        t.state = "fighting";
        t.pack = this.packs.length;
        const room = TOMBS.rooms[index];
        const last = index === TOMBS.rooms.length - 1;
        const more = this.invocations.reduce((n, id) => n + (INVOCATIONS[id].more ?? 0), 0);
        const rares = this.invocations.reduce((n, id) => n + (INVOCATIONS[id].rares ?? 0), 0);
        const ids: MonsterId[] = room.adds.flatMap(([id, n]) => new Array<MonsterId>(n).fill(id));
        for (let i = 0; i < more && room.adds.length > 0; i++) {
            ids.push(room.adds[0][0]);
        }
        const members: Monster[] = [];
        const turn = rng.next() * Math.PI * 2;
        const [lo, hi] = TOMBS.ring;
        const place = (radius: number, a: number) => {
            const r = lo + rng.next() * (hi - lo);
            const spot = spotNear(this.grid, rng, { x: at.x + fm.cos(a) * r, y: at.y + fm.sin(a) * r }, 2, radius);
            return this.reachable(spot.x, spot.y) && isCircleFree(this.grid, spot.x, spot.y, radius) ? spot : spotNear(this.grid, rng, { x: at.x, y: at.y }, 3, radius);
        };
        const def: BossDef = BOSSES[room.boss];
        const still = def.speed === 0;
        const pool = [...LADDER_MODS, ...GUARDIAN_MODS].filter((mod) => (def.ranged || !SHOOTER_MODS.includes(mod)) && !(still && STILL_SHUNS.includes(mod)));
        const guardian = this.spawnMonster(def, "boss", place(def.radius, turn), t.pack, this.pickMods(rng, pool, last ? GUARDIAN_MOD_COUNT.two : GUARDIAN_MOD_COUNT.one));
        const tough = last ? TOMBS.wardens : TOMBS.path;
        guardian.maxLife = guardian.life = Math.round(guardian.maxLife * tough.life);
        guardian.damage = [guardian.damage[0] * tough.damage, guardian.damage[1] * tough.damage];
        if (last) {
            guardian.extraSpecial = rng.pick(still ? GUARDIAN_SPECIALS.filter((s) => s.kind !== "charge") : GUARDIAN_SPECIALS);
            this.bossUid = guardian.uid;
        }
        guardian.nextSpecial = this.tick + seconds(3);
        t.guardian = guardian.uid;
        this.tombsFighter(guardian);
        members.push(guardian);
        ids.forEach((id, i) => {
            const d: MonsterDef = MONSTERS[id];
            // Elidinis' Warden's a rare always, and keeps her name
            const rank: MonsterRank = i < rares || id === "elidinisWarden" ? "rare" : "magic";
            const m = this.spawnMonster(d, rank, place(d.radius, turn + Math.PI * (0.5 + i / Math.max(1, ids.length))), t.pack, rank === "magic" ? this.packMods(d) : [], true);
            if (id === "elidinisWarden") {
                m.name = d.name;
            }
            this.tombsFighter(m);
            members.push(m);
        });
        this.packs.push(members);
        for (const m of members) {
            this.wake(m);
        }
        this.emit({ kind: "encounter", what: "tombsRoom", wave: t.beaten + 1, name: `${room.name}: ${def.name}, ${def.title}` });
    }

    // A room's fighter, up through the sand and straight at the hero
    private tombsFighter(m: Monster): void {
        m.encounter = "tombs";
        m.state = "chase";
        m.staggerUntil = this.tick + seconds(FEATURES.rise);
        this.emit({ kind: "spot", spot: TOMBS.spawnSpot, x: m.x, y: m.y });
    }

    // A room beaten: past the Wardens, the Tombs done; a path, its chamber's done, and the next to
    // be chosen, or with the four beaten, the Wardens waiting in the Nexus
    private tombsCleared(t: TombsState): void {
        const room = t.room;
        t.room = -1;
        if (room === TOMBS.rooms.length - 1) {
            t.state = "done";
            this.emit({ kind: "encounter", what: "tombsWon", count: t.level });
            return;
        }
        const chamber = t.chambers.find((c) => c.room === room);
        if (chamber) {
            chamber.done = true;
        }
        t.beaten++;
        const left = t.chambers.filter((c) => !c.done).length;
        t.state = left > 0 ? "open" : "wardens";
        this.emit({ kind: "encounter", what: "tombsRoomDone", wave: t.beaten, left, name: TOMBS.rooms[room].name });
    }

    // One item dropped near a spot
    private dropNear(item: Item, x: number, y: number): void {
        const at = spotNear(this.grid, this.rng, { x, y }, 1.2, 0.2);
        const drop: Drop = { uid: this.uid++, item, x: at.x, y: at.y, tick: this.tick };
        this.drops.push(drop);
        this.emit({ kind: "drop", drop });
    }

    // The next wave out of the Fight Caves, in a ring round its mouth
    cavesGo(): void {
        const caves = this.caves;
        const f = caves && this.featureByUid(caves.feature);
        if (!caves || !f || caves.state === "fighting" || caves.state === "done" || caves.wave >= FIGHT_CAVES.waves.length) {
            return;
        }
        caves.wave++;
        caves.state = "fighting";
        const pack = this.packs.length;
        caves.pack = pack;
        const members: Monster[] = [];
        const wave = FIGHT_CAVES.waves[caves.wave - 1];
        const all = wave.flatMap(([id, n]) => Array.from({ length: n }, () => id));
        const turn = this.rng.next() * Math.PI * 2;
        all.forEach((id, i) => {
            const def: MonsterDef = MONSTERS[id];
            const a = turn + (i / all.length) * Math.PI * 2;
            const at = spotNear(this.grid, this.rng, { x: f.x + fm.cos(a) * 3.5, y: f.y + fm.sin(a) * 3.5 }, 1, def.radius);
            if (!this.reachable(at.x, at.y) || !isCircleFree(this.grid, at.x, at.y, def.radius)) {
                return;
            }
            const magic = caves.wave >= FIGHT_CAVES.magicFrom;
            const m = this.spawnMonster(def, magic ? "magic" : "normal", at, pack, magic ? this.packMods(def) : [], true);
            m.encounter = "caves";
            m.state = "chase";
            m.staggerUntil = this.tick + seconds(FEATURES.rise);
            members.push(m);
            this.emit({ kind: "spot", spot: SPOT.fireWave.impactSpot!, x: m.x, y: m.y });
        });
        this.packs.push(members);
        this.emit({ kind: "encounter", what: "wave", wave: caves.wave });
        if (members.length === 0) {
            caves.state = "choice";
        }
    }

    // What the Fight Caves held, taken: its tokkul, and a chest's worth for each wave beaten
    cavesTake(): void {
        const caves = this.caves;
        const f = caves && this.featureByUid(caves.feature);
        if (!caves || !f || caves.state === "fighting" || caves.state === "done" || caves.wave === 0) {
            return;
        }
        caves.state = "done";
        f.used = true;
        const drop: Drop = { uid: this.uid++, good: { id: "tokkul", count: caves.held }, x: f.stand.x, y: f.stand.y, tick: this.tick };
        this.drops.push(drop);
        this.emit({ kind: "drop", drop });
        for (let i = 0; i < caves.wave; i++) {
            this.dropLoot({ x: f.x, y: f.y, level: this.level, rank: i === FIGHT_CAVES.waves.length - 1 ? "hoard" : "chest" });
        }
        this.emit({ kind: "encounter", what: "cavesDone", wave: caves.wave, tokkul: caves.held });
        this.achieveWhere((g) => g.kind === "caves" && caves.wave >= g.waves);
    }

    // Whatever's instilled to drink itself when this happens, drunk, if it can be and hasn't just been
    private instilled(when: Instil): void {
        if (this.town || this.hero.dead) {
            return;
        }
        const potions = this.heroData.potions;
        for (let i = 0; i < BELT_SIZE; i++) {
            if (potions[i]?.instil === when && this.tick >= this.instilReady[i] && this.drink(i, true)) {
                this.instilReady[i] = this.tick + seconds(INSTIL_EVERY_SECONDS);
            }
        }
    }

    // A hit on the hero. An attack (a blow or a shot, not what falls from the sky) can be evaded.
    // `from` is who struck it from beside them, and `by` whose it is, a shot's or a slam's too;
    // `kind` what a protection prayer keeps off (content/prayers.ts), an attack's.
    // `element` is a hit's that's all fire, cold or lightning (content/rules.ts RESIST): armour
    // doesn't stop it, its resistance does.
    hurtHero(amount: number, from: Monster | undefined, attack = false, by: Monster | undefined = from, kind?: HitKind, element?: Element): number {
        const h = this.hero;
        if (h.dead) {
            return 0;
        }
        const s = this.stats;
        // A potion's suffix adds to the chance to evade, for a while
        const evade = Math.min(0.75, s.evade + this.buffTotal("evade") / 100);
        if (attack && evade > 0 && this.rng.chance(evade)) {
            this.lastEvade = this.tick;
            this.emit({ kind: "evaded" });
            return 0;
        }
        const wasLow = h.life <= s.maxLife * 0.5;
        amount *= s.damageTaken * (1 - Math.min(80, this.buffTotal("lessDamageTaken")) / 100);
        // A protection prayer's less of its kind
        if (kind) {
            amount *= 1 - s.protect[kind];
        }
        // Shocked by a Charged monster's sparks: more from everything
        if (this.tick < this.ailments.shock) {
            amount *= 1 + AILMENTS.shock;
        }
        // The spirit shields' (items.ts): what falls from the sky, and a chance at any hit
        if (!attack && s.powers.has("spectral")) {
            amount *= 1 - SPECTRAL_LESS;
        }
        if (s.powers.has("elysian") && this.rng.chance(ELYSIAN.chance)) {
            amount *= 1 - ELYSIAN.less;
        }
        const armour = s.armour * (1 + this.buffTotal("armourPct") / 100);
        // An elemental rift's: some again as fire, cold and lightning, a third each, which armour
        // doesn't stop and resistances do (an Antifire potion's less of it, and of any element's)
        const antifire = 1 - Math.min(0.9, this.buffTotal("elementalLess"));
        const resisted = (e: Element) => 1 - resistance(s.resist[e], this.zone.depth) / 100;
        const elemental = (amount * this.effect.elemental * antifire * (resisted("fire") + resisted("cold") + resisted("lightning"))) / 3;
        let taken = Math.max(1, Math.round(element ? amount * resisted(element) * antifire : amount * (1 - armourReduction(armour, amount)) + elemental));
        // A ward takes it first
        if (h.ward > 0) {
            const warded = Math.min(h.ward, taken);
            h.ward -= warded;
            taken -= warded;
        }
        // Mind over Matter: some from mana first
        if (s.manaShield > 0 && h.mana > 0) {
            const fromMana = Math.min(h.mana, Math.round(taken * s.manaShield));
            h.mana -= fromMana;
            taken -= fromMana;
        }
        h.life -= taken;
        h.hurtTick = this.tick;
        // A guardian's special landing (what falls from the sky, or a blow struck in one)
        if (by?.rank === "boss" && (!attack || by.state === "special")) {
            by.specialHits = (by.specialHits ?? 0) + 1;
        }
        this.emit({ kind: "heroHit", amount: taken, x: h.x, y: h.y });
        if (by && by.state !== "dead" && h.life > 0) {
            this.procsFor("struck", by.x, by.y, by.uid);
        }
        // Fallen to low life: what's instilled for it drinks itself
        if (!wasLow && h.life > 0 && h.life <= s.maxLife * 0.5) {
            this.instilled("lowLife");
        }
        this.breakChannel("hit");
        if (from && from.mods.includes("vampiric")) {
            from.life = Math.min(from.maxLife, from.life + from.maxLife * 0.05);
        }
        if (from && this.effect.leech > 0) {
            from.life = Math.min(from.maxLife, from.life + from.maxLife * this.effect.leech);
        }
        // Redemption (the paladin's wing): once a minute, a killing blow leaves the hero standing
        if (h.life <= 0 && s.powers.has("redemption") && this.tick >= this.redemptionReady) {
            h.life = 1;
            this.redemptionReady = this.tick + seconds(REDEMPTION.every);
            this.mendUntil = this.tick + seconds(REDEMPTION.seconds);
            this.mendRate = (s.maxLife * REDEMPTION.heal) / seconds(REDEMPTION.seconds);
            this.emit({ kind: "spot", spot: SPOT.blueImpact.impactSpot, x: h.x, y: h.y });
        }
        // Retribution (content/prayers.ts): once a minute too, and a blast round the hero besides
        if (h.life <= 0 && s.retribution && this.tick >= this.retributionReady) {
            const r = PRAYER.retribution;
            h.life = 1;
            this.retributionReady = this.tick + seconds(r.every);
            const blast = s.maxLife * r.share;
            const struck: Monster[] = [];
            this.hash.query(h.x, h.y, r.radius + 2, (m) => {
                if (m.state !== "dead" && fm.hypot(m.x - h.x, m.y - h.y) <= r.radius + m.radius) {
                    struck.push(m);
                }
            });
            for (const m of struck) {
                this.hitMonster(m, { amount: blast, crit: false }, undefined, h.x, h.y);
                this.emit({ kind: "spot", spot: r.hitSpot, x: m.x, y: m.y });
            }
            this.emit({ kind: "spot", spot: r.spot, x: h.x, y: h.y });
            this.emit({ kind: "sound", id: PRAYERS.retribution.sound, x: h.x, y: h.y, volume: 0.5 });
        }
        // Vengeance: the attacker struck back for half the hero's armour, twice a second at most
        if (h.life > 0 && by && by.state !== "dead" && s.keystones.has("vengeance") && this.tick >= this.vengeanceReady && armour > 0) {
            this.vengeanceReady = this.tick + seconds(VENGEANCE.every);
            this.hitMonster(by, { amount: armour * VENGEANCE.share, crit: false }, undefined, h.x, h.y);
        }
        if (h.life <= 0) {
            h.life = 0;
            h.dead = true;
            h.deadTick = this.tick;
            h.action = undefined;
            h.goal = undefined;
            h.queued = undefined;
            h.channel = undefined;
            this.heroData.deaths++;
            const lose = Math.round(xpToNext(this.heroData.level) * HERO.deathXpLoss);
            this.heroData.xp = Math.max(0, this.heroData.xp - lose);
            this.emit({ kind: "heroDied" });
        }
        return taken;
    }

    // Back into a rift left open, at its camp, whole from the city and in whatever was bought
    // there; what was chasing has gone home
    arrive(): void {
        this.stats = heroStats(this.heroData);
        const h = this.hero;
        const s = this.layout.spawn;
        h.x = h.prevX = s.x;
        h.y = h.prevY = s.y;
        h.yaw = 1024;
        h.dead = false;
        h.life = this.stats.maxLife;
        h.mana = this.stats.maxMana;
        h.goal = undefined;
        h.queued = undefined;
        h.action = undefined;
        h.channel = undefined;
        h.moving = false;
        h.lifePotionUntil = 0;
        h.manaPotionUntil = 0;
        h.ward = 0;
        this.bleedUntil = 0;
        this.potionUntil = 0;
        this.cleanse();
        this.heroBurnTaken = 0;
        this.fieldTaken = 0;
        this.hazards.length = 0;
        this.struck.clear();
        this.ailmentWard.burn = this.ailmentWard.chill = this.ailmentWard.shock = this.ailmentWard.root = 0;
        h.buffs = [];
        h.ready.fill(0);
        h.recoverUntil = 0;
        this.skills = resolveSkills(this.heroData, this.stats);
        for (const m of this.monsters) {
            if (m.state !== "dead" && m.state !== "idle") {
                m.state = "return";
            }
        }
        this.projectiles.length = 0;
        this.strikes.length = 0;
        this.minions.length = 0;
        this.lastKill = this.lastEvade = this.lastMoved = -999;
        this.mendUntil = 0;
        this.stateKey = "";
        if (this.bossAwake && this.boss && this.boss.state !== "dead") {
            this.bossAwake = false;
        }
    }

    // ---- The city's people ----

    private stepPeople(): void {
        const h = this.hero;
        for (const p of this.people) {
            // Spoken to: they stop and look at the hero a while
            if (this.tick - p.talkTick < TALK_LOOK_TICKS) {
                p.moving = false;
                p.yaw = yawFromVector(h.x - p.x, h.y - p.y);
                p.nextMove = Math.max(p.nextMove, this.tick + seconds(2));
                continue;
            }
            if (p.moving) {
                const dx = p.toX - p.x;
                const dy = p.toY - p.y;
                const d = fm.hypot(dx, dy);
                if (d <= STROLL) {
                    p.x = p.toX;
                    p.y = p.toY;
                    this.stopStrolling(p);
                    continue;
                }
                const pos = { x: p.x, y: p.y };
                moveCircle(this.grid, pos, (dx / d) * STROLL, (dy / d) * STROLL, PERSON_RADIUS);
                // Caught on something: stand where they are
                if (fm.hypot(pos.x - p.x, pos.y - p.y) < STROLL * 0.3) {
                    this.stopStrolling(p);
                    continue;
                }
                p.yaw = yawFromVector(pos.x - p.x, pos.y - p.y);
                p.x = pos.x;
                p.y = pos.y;
            } else if (p.wander > 0 && this.tick >= p.nextMove) {
                // Somewhere near home they can walk to in a straight line, or home again
                const home = fm.hypot(p.x - p.homeX, p.y - p.homeY) > p.wander * 0.6 && this.rng.chance(0.5);
                for (let tries = 0; tries < 6; tries++) {
                    const a = this.rng.next() * Math.PI * 2;
                    const r = this.rng.next() * p.wander;
                    const x = home ? p.homeX : p.homeX + fm.cos(a) * r;
                    const y = home ? p.homeY : p.homeY + fm.sin(a) * r;
                    if (fm.hypot(x - p.x, y - p.y) > 0.6 && isCircleFree(this.grid, x, y, PERSON_RADIUS) && canWalkStraight(this.grid, p.x, p.y, x, y)) {
                        p.toX = x;
                        p.toY = y;
                        p.moving = true;
                        break;
                    }
                }
                if (!p.moving) {
                    p.nextMove = this.tick + seconds(2);
                }
            } else if (!p.moving && p.wander === 0) {
                p.yaw = p.homeYaw;
            }
        }
    }

    private stopStrolling(p: Person): void {
        p.moving = false;
        p.nextMove = this.tick + seconds(3 + this.rng.next() * 5);
        if (fm.hypot(p.x - p.homeX, p.y - p.homeY) < 0.5) {
            p.yaw = p.homeYaw;
        }
    }

    // ---- Monsters ----

    monsterByUid(uid: number): Monster | undefined {
        for (const m of this.monsters) {
            if (m.uid === uid) {
                return m;
            }
        }
        return undefined;
    }

    private wake(m: Monster): void {
        if (m.state === "dead") {
            return;
        }
        for (const o of this.packs[m.pack] ?? [m]) {
            if (o.state === "idle" || o.state === "return") {
                o.state = "chase";
            }
            if (o.rank === "boss" && o.wokeTick === undefined && o.state !== "dead") {
                o.wokeTick = this.tick;
            }
            // Disturbed, the Kraken rises out of its whirlpool
            if (o.form === -1 && o.state !== "dead") {
                this.shift(o, 0);
            }
            if (o.uid === this.bossUid && !this.bossAwake && o.state !== "dead") {
                this.bossAwake = true;
                o.nextSpecial = this.tick + seconds(3);
                this.emit({ kind: "bossAwake", monster: o });
                this.instilled("guardian");
            } else if (o.encounter === "roamer" && o.nextSpecial === 0 && o.state !== "dead") {
                o.nextSpecial = this.tick + seconds(3);
                this.emit({ kind: "encounter", what: "roamer", name: `${o.name}, ${o.boss?.title ?? ""}` });
            } else if (o.encounter === "hunter" && o === m) {
                this.emit({ kind: "encounter", what: "hunter", name: o.name });
            } else if (o.encounter === "impling" && o.fleeUntil === undefined) {
                o.fleeUntil = this.tick + seconds(IMPLING.seconds);
                this.emit({ kind: "encounter", what: "impling", name: o.name });
            }
        }
    }

    private stepMonsters(): void {
        const h = this.hero;
        const heroTileX = Math.floor(h.x);
        const heroTileY = Math.floor(h.y);
        if ((this.field.targetX !== heroTileX || this.field.targetY !== heroTileY) && this.tick - this.fieldTick >= 8) {
            this.field.update(this.grid, heroTileX, heroTileY);
            this.fieldTick = this.tick;
        }
        for (const m of this.monsters) {
            m.moved = false;
            if (m.state === "dead") {
                continue;
            }
            const dx = h.x - m.x;
            const dy = h.y - m.y;
            const d = fm.hypot(dx, dy);
            if (d > ACTIVE_RANGE && m.state === "idle") {
                continue;
            }
            const regen = (m.mods.includes("regenerating") ? 0.02 : 0) + this.effect.regen;
            if (regen > 0) {
                m.life = Math.min(m.maxLife, m.life + (m.maxLife * regen) / TICKS_PER_SECOND);
            }
            // A blow's shove, spent a little each tick (frozen solid, or one that stays where it
            // rose, it stays put)
            if (m.knockX !== 0 || m.knockY !== 0) {
                if (this.tick >= m.frozenUntil && m.def.speed !== 0) {
                    moveCircle(this.grid, m, m.knockX, m.knockY, m.radius);
                }
                m.knockX *= IMPACT.knockDecay;
                m.knockY *= IMPACT.knockDecay;
                if (Math.abs(m.knockX) + Math.abs(m.knockY) < 0.002) {
                    m.knockX = 0;
                    m.knockY = 0;
                }
            }
            if (this.tick < m.burnUntil) {
                if (!this.burnMonster(m)) {
                    continue;
                }
            }
            if (this.tick < m.frozenUntil || this.tick < m.stunnedUntil || this.tick < m.staggerUntil) {
                continue;
            }
            // A Pest Control portal stands and spawns (stepEncounters), and a side's monster fights
            // its foe while the hero's off
            if (m.encounter === "portal" || (m.side && this.sideTurn(m, d))) {
                continue;
            }
            // The hero's hireling, when it's the nearer
            if (this.hireling && !m.side && this.hirelingTurn(m, d)) {
                continue;
            }
            switch (m.state) {
                case "idle":
                    if (!h.dead && this.tick >= m.nextSense) {
                        m.nextSense = this.tick + 10;
                        const sight =
                            m.encounter === "hunter" ? HUNTER.sight : m.encounter === "roamer" ? ROAMERS.sight : m.encounter === "impling" ? IMPLING.sight : m.rank === "boss" ? 12 : AGGRO_RADIUS;
                        // A hunter, or a roaming boss, knows where the hero is without seeing them
                        const hunts = m.encounter === "hunter" || m.encounter === "roamer";
                        if (d <= sight && (hunts || canSee(this.grid, m.x, m.y, h.x, h.y))) {
                            this.wake(m);
                        }
                    }
                    break;
                case "chase":
                    this.chase(m, d, dx, dy);
                    break;
                case "attack":
                    this.attacking(m, d);
                    break;
                case "special":
                    this.special(m);
                    break;
                case "return": {
                    const hx = m.homeX - m.x;
                    const hy = m.homeY - m.y;
                    const hd = fm.hypot(hx, hy);
                    m.life = Math.min(m.maxLife, m.life + m.maxLife * 0.01);
                    if (hd < 0.5) {
                        m.state = "idle";
                        m.nextSense = this.tick + seconds(2);
                    } else {
                        this.moveMonster(m, hx / hd, hy / hd, m.speed * 1.3);
                    }
                    break;
                }
            }
            if (m.mods.length > 0 && !h.dead && (m.state === "chase" || m.state === "attack" || m.state === "special") && this.ladder) {
                this.modsAct(m, d);
            }
            if (this.zone.awakened && !m.awoken && m.uid === this.bossUid && m.life > 0 && m.life < m.maxLife * AWAKENED.phase) {
                this.awakenPhase(m);
            }
            if (m.encounter === "guard" && m.state !== "idle") {
                this.guardHeals(m);
            }
        }
        this.separate();
    }

    // A tick of burning, false if it burnt to death; what it's burnt shown every half second
    private burnMonster(m: Monster): boolean {
        // Inferno's burnings each end on their own
        if (m.burnStacks && m.burnStacks.length > 0 && m.burnStacks.some((b) => this.tick >= b.until)) {
            m.burnStacks = m.burnStacks.filter((b) => this.tick < b.until);
            m.burn = m.burnStacks.reduce((sum, b) => sum + b.perTick, 0);
        }
        m.life -= m.burn;
        m.burnTaken += m.burn;
        if (m.life <= 0) {
            this.emit({ kind: "burn", uid: m.uid, amount: Math.max(1, Math.round(m.burnTaken)) });
            m.burnTaken = 0;
            this.kill(m);
            return false;
        }
        if (((this.tick - m.burnUntil) % 25 === 0 || this.tick + 1 >= m.burnUntil) && m.burnTaken >= 1) {
            this.emit({ kind: "burn", uid: m.uid, amount: Math.round(m.burnTaken) });
            m.burnTaken = 0;
        }
        return true;
    }

    private chase(m: Monster, d: number, dx: number, dy: number): void {
        const h = this.hero;
        if (h.dead) {
            m.state = "return";
            return;
        }
        // An impling runs from them
        if (m.encounter === "impling") {
            this.flee(m, d, dx, dy);
            return;
        }
        // Too far from home, and the hero's off: back it goes (a hunter never gives up)
        if (fm.hypot(m.x - m.homeX, m.y - m.homeY) > LEASH && d > 14 && m.rank !== "boss" && m.encounter !== "hunter") {
            m.state = "return";
            return;
        }
        m.yaw = yawFromVector(dx, dy);
        // A guardian that changes form, when its next is due
        const forms = m.form !== undefined && m.form >= 0 ? (BOSSES[m.def.id as BossId] as BossDef).forms : undefined;
        if (forms && forms.length > 1 && this.tick >= (m.nextForm ?? 0)) {
            this.shift(m, (m.form! + 1) % forms.length);
        }
        // A boss's special when it's due
        if (m.boss && this.tick >= m.nextSpecial && d < 14) {
            this.startSpecial(m);
            return;
        }
        const ranged = m.def.ranged;
        const reach = m.def.reach * m.size + HERO.radius;
        if (ranged) {
            // Too close: it backs off till it's far enough, and fights where it is if it's cornered
            const near = m.retreating ? d < ranged.keep * IMPACT.retreatTo : d < ranged.keep * IMPACT.retreatFrom;
            m.retreating = near && m.rank !== "boss" && d > 0.001 && this.retreat(m, dx / d, dy / d);
            if (m.retreating) {
                return;
            }
            if (d <= ranged.range && canSee(this.grid, m.x, m.y, h.x, h.y)) {
                this.startAttack(m);
                return;
            }
        } else if (d <= reach) {
            this.startAttack(m);
            return;
        }
        // Towards the hero: straight if the way's clear, round things by the field if not (one that
        // stays where it rose doesn't)
        if (d > 0.001 && m.speed > 0) {
            if (d < 10 && canWalkStraight(this.grid, m.x, m.y, h.x, h.y)) {
                const way = this.roundCrowd(m, dx / d, dy / d, d);
                this.moveMonster(m, way.x, way.y, m.speed);
                return;
            }
            const tx = Math.floor(m.x);
            const ty = Math.floor(m.y);
            if (this.field.getStep(this.grid, tx, ty, this.stepOut)) {
                const sx = tx + this.stepOut.x + 0.5 - m.x;
                const sy = ty + this.stepOut.y + 0.5 - m.y;
                const sd = fm.hypot(sx, sy);
                if (sd > 0.001) {
                    this.moveMonster(m, sx / sd, sy / sd, m.speed);
                    return;
                }
            }
            this.moveMonster(m, dx / d, dy / d, m.speed);
        }
    }

    // A step away from the hero, or 45 degrees off it if that's blocked: whether it got anywhere
    private retreat(m: Monster, towardX: number, towardY: number): boolean {
        const speed = m.speed * IMPACT.retreatSpeed;
        for (const turn of [0, 1, -1]) {
            const c = turn === 0 ? 1 : 0.70710678;
            const s = turn * 0.70710678;
            const x = -(towardX * c - towardY * s);
            const y = -(towardX * s + towardY * c);
            const fromX = m.x;
            const fromY = m.y;
            moveCircle(this.grid, m, x * speed, y * speed, m.radius);
            if (fm.hypot(m.x - fromX, m.y - fromY) > speed * 0.5) {
                m.yaw = yawFromVector(x, y);
                m.moved = true;
                return true;
            }
        }
        return false;
    }

    // Close in on the hero, a monster with another in its way goes round it, to the side away from
    // it, so a pack comes at the hero from all round rather than in a queue behind the first
    private roundCrowd(m: Monster, dirX: number, dirY: number, d: number): { x: number; y: number } {
        const straight = { x: dirX, y: dirY };
        if (d > 4 || d < m.radius * 2) {
            return straight;
        }
        const aheadX = m.x + dirX * m.radius * 2;
        const aheadY = m.y + dirY * m.radius * 2;
        let blocker: Monster | undefined;
        this.hash.query(aheadX, aheadY, m.radius * 2 + 1, (o) => {
            if (blocker || o === m || o.state === "dead" || o.state === "idle") {
                return;
            }
            if (fm.hypot(o.x - aheadX, o.y - aheadY) < o.radius + m.radius * 0.8) {
                blocker = o;
            }
        });
        if (!blocker) {
            return straight;
        }
        // Which side of the way it's on: go the other
        const cross = dirX * (blocker.y - m.y) - dirY * (blocker.x - m.x);
        const side = cross > 0 ? -1 : 1;
        // 60 degrees off the way in
        const c = 0.5;
        const s = 0.8660254 * side;
        return { x: dirX * c - dirY * s, y: dirX * s + dirY * c };
    }

    private moveMonster(m: Monster, dirX: number, dirY: number, speed: number): void {
        if (this.tick < m.chillUntil) {
            speed *= 1 - m.chill;
        }
        if (this.commanded.has(m.pack)) {
            speed *= 1 + MOD.commanding.faster;
        }
        moveCircle(this.grid, m, dirX * speed, dirY * speed, m.radius);
        m.yaw = yawFromVector(dirX, dirY);
        m.moved = true;
    }

    private startAttack(m: Monster): void {
        m.state = "attack";
        m.hireBlow = false;
        m.actionStart = this.tick;
        // A Commanding monster's pack strikes faster
        const ticks = this.commanded.has(m.pack) ? Math.max(m.hitTicks + 1, Math.round(m.attackTicks / (1 + MOD.commanding.faster))) : m.attackTicks;
        m.actionEnd = this.tick + ticks;
        m.actionDone = false;
        this.emit({ kind: "monsterAttack", monster: m });
    }

    private attacking(m: Monster, d: number): void {
        const h = this.hero;
        m.yaw = yawFromVector(h.x - m.x, h.y - m.y);
        if (!m.actionDone && this.tick >= m.actionStart + m.hitTicks) {
            m.actionDone = true;
            this.emit({ kind: "monsterBlow", monster: m });
            const amount = m.damage[0] + this.rng.next() * (m.damage[1] - m.damage[0]);
            const ranged = m.def.ranged;
            if (ranged) {
                const dx = h.x - m.x;
                const dy = h.y - m.y;
                const dd = Math.max(0.001, fm.hypot(dx, dy));
                // A Volleying shooter's shot is three, fanned out
                const shots = m.mods.includes("volleying") ? MOD.volleying.shots : 1;
                for (let i = 0; i < shots; i++) {
                    const turn = (i - (shots - 1) / 2) * MOD.volleying.spread;
                    const c = fm.cos(turn);
                    const s = fm.sin(turn);
                    const vx = dx / dd;
                    const vy = dy / dd;
                    this.launch("monster", m.x, m.y, vx * c - vy * s, vx * s + vy * c, ranged.speed, ranged.range + 3, amount, false, ranged.visual, { owner: m.uid });
                }
                if (ranged.visual.sound !== undefined) {
                    this.emit({ kind: "sound", id: ranged.visual.sound, x: m.x, y: m.y, volume: 0.4 });
                }
            } else if (!h.dead && d <= m.def.reach * m.size + HERO.radius + 0.6) {
                if (this.hurtHero(amount, m, true, m, "melee") > 0) {
                    this.blowLanded(m, amount);
                }
            }
        }
        if (this.tick >= m.actionEnd) {
            m.state = "chase";
        }
    }

    private startSpecial(m: Monster): void {
        const boss = m.boss!;
        // Its specials in turn: one for most, every kind for the Heart's
        const specials = [...bossSpecials(boss), ...(m.extraSpecial ? [m.extraSpecial] : []), ...(m.moreSpecial ? [m.moreSpecial] : [])];
        const special = specials[m.specials % specials.length];
        m.specials++;
        m.specialNow = special;
        const h = this.hero;
        const awake = this.zone.awakened && m.uid === this.bossUid ? AWAKENED.specials : 1;
        m.nextSpecial = this.tick + seconds(boss.specialSeconds / (1 + this.effect.bossSpecial) / (m.enraged ? MOD.enraging.specials : 1) / awake);
        m.state = "special";
        m.actionStart = this.tick;
        m.actionDone = false;
        const damage = (m.damage[0] + m.damage[1]) * 0.5 * special.damage;
        if (special.kind === "slam") {
            m.actionEnd = this.tick + seconds(special.windup);
            this.strikes.push({
                uid: this.uid++,
                side: "monster",
                x: m.x,
                y: m.y,
                radius: special.radius,
                damage,
                crit: false,
                start: this.tick,
                land: m.actionEnd,
                visual: special.visual,
                stun: 0,
                freeze: 0,
                shows: 1,
                owner: m.uid,
            });
            this.emit({ kind: "monsterAttack", monster: m });
        } else if (special.kind === "rain") {
            m.actionEnd = this.tick + seconds(0.8);
            for (let i = 0; i < special.count; i++) {
                const a = this.rng.next() * Math.PI * 2;
                const r = i === 0 ? 0 : 1.5 + this.rng.next() * 3.5;
                this.strikes.push({
                    uid: this.uid++,
                    side: "monster",
                    x: h.x + fm.cos(a) * r,
                    y: h.y + fm.sin(a) * r,
                    radius: special.radius,
                    damage,
                    crit: false,
                    start: this.tick,
                    land: this.tick + seconds(special.windup) + i * 3,
                    visual: special.visual,
                    stun: 0,
                    freeze: 0,
                    shows: 1,
                    owner: m.uid,
                });
            }
            this.emit({ kind: "monsterAttack", monster: m });
        } else if (special.kind === "nova") {
            m.actionEnd = this.tick + seconds(0.7);
            const offset = this.rng.next() * Math.PI * 2;
            for (let i = 0; i < special.count; i++) {
                const a = offset + (i / special.count) * Math.PI * 2;
                this.launch("monster", m.x, m.y, fm.cos(a), fm.sin(a), special.speed, 14, damage, false, special.visual, { owner: m.uid });
            }
            if (special.visual.sound !== undefined) {
                this.emit({ kind: "sound", id: special.visual.sound, x: m.x, y: m.y });
            }
            this.emit({ kind: "monsterAttack", monster: m });
        } else {
            this.ladderSpecial(m, special, damage);
        }
    }

    private special(m: Monster): void {
        // A charge's run, once it's marked
        const dash = m.dash;
        if (dash && this.tick >= dash.from) {
            const dx = dash.x - m.x;
            const dy = dash.y - m.y;
            const d = fm.hypot(dx, dy);
            if (d <= dash.step) {
                moveCircle(this.grid, m, dx, dy, m.radius);
                m.dash = undefined;
            } else {
                moveCircle(this.grid, m, (dx / d) * dash.step, (dy / d) * dash.step, m.radius);
                m.moved = true;
            }
        }
        if (this.tick >= m.actionEnd) {
            m.dash = undefined;
            m.state = "chase";
        }
    }

    // A ladder guardian's special from the pool (content/monsterMods.ts): a charge down a line, a
    // pack called up, or a field of fire or frost round the hero
    private ladderSpecial(m: Monster, special: BossSpecial, damage: number): void {
        const h = this.hero;
        if (special.kind === "charge") {
            const dx = h.x - m.x;
            const dy = h.y - m.y;
            const d = Math.max(0.001, fm.hypot(dx, dy));
            const ux = dx / d;
            const uy = dy / d;
            // As far down the line as it can go
            let reach = 0;
            for (let t = 0.5; t <= special.length; t += 0.5) {
                if (!isCircleFree(this.grid, m.x + ux * t, m.y + uy * t, m.radius)) {
                    break;
                }
                reach = t;
            }
            const from = this.tick + seconds(special.windup);
            const step = CHARGE_SPEED / TICKS_PER_SECOND;
            const group = this.uid++;
            for (let t = 0; t <= reach; t += special.width) {
                this.strikes.push({
                    uid: this.uid++,
                    side: "monster",
                    x: m.x + ux * t,
                    y: m.y + uy * t,
                    radius: special.width / 2 + m.radius * 0.5,
                    damage,
                    crit: false,
                    start: this.tick,
                    land: from + Math.round(t / step),
                    visual: special.visual,
                    stun: 0,
                    freeze: 0,
                    shows: 1,
                    owner: m.uid,
                    group,
                });
            }
            m.dash = { x: m.x + ux * reach, y: m.y + uy * reach, from, step };
            m.actionEnd = from + Math.ceil(reach / step) + 3;
            m.yaw = yawFromVector(dx, dy);
            this.emit({ kind: "monsterAttack", monster: m });
        } else if (special.kind === "summon") {
            m.actionEnd = this.tick + seconds(0.9);
            const standing = (this.packs[m.pack] ?? []).filter((o) => o.encounter === "summoned" && o.state !== "dead").length;
            const zone = riftZone(this.zone.depth, this.zone.seed, this.zone.pinnacle);
            const weights = zone.monsters.map(([, w]) => w);
            for (let i = 0; i < Math.min(special.count, SUMMON_MOST - standing); i++) {
                const def: MonsterDef = MONSTERS[zone.monsters[Math.max(0, this.rng.weightedIndex(weights))][0]];
                const a = this.rng.next() * Math.PI * 2;
                const at = spotNear(this.grid, this.rng, { x: m.x + fm.cos(a) * 2.5, y: m.y + fm.sin(a) * 2.5 }, 1, def.radius);
                if (!this.reachable(at.x, at.y) || !isCircleFree(this.grid, at.x, at.y, def.radius)) {
                    continue;
                }
                const o = this.spawnMonster(def, "normal", at, m.pack);
                o.encounter = "summoned";
                o.state = "chase";
                o.staggerUntil = this.tick + seconds(FEATURES.rise);
                this.packs[m.pack]?.push(o);
                this.emit({ kind: "spot", spot: special.visual.impactSpot!, x: o.x, y: o.y });
            }
            this.emit({ kind: "monsterAttack", monster: m });
        } else if (special.kind === "field") {
            m.actionEnd = this.tick + seconds(0.8);
            const g = { x: h.x, y: h.y, radius: special.radius, start: this.tick + seconds(0.7), until: this.tick + seconds(0.7 + special.seconds), perSecond: damage, kind: special.ailment };
            if (this.hazards.length >= MOD.molten.most) {
                this.hazards.shift();
            }
            this.hazards.push(g);
            this.emit({ kind: "spot", spot: special.visual.impactSpot!, x: g.x, y: g.y });
            if (special.visual.sound !== undefined) {
                this.emit({ kind: "sound", id: special.visual.sound, x: g.x, y: g.y });
            }
            this.emit({ kind: "monsterAttack", monster: m });
        }
    }

    // Monsters out of each other, and off the hero
    private separate(): void {
        const h = this.hero;
        for (const m of this.monsters) {
            if (m.state === "dead" || m.state === "idle") {
                continue;
            }
            this.hash.query(m.x, m.y, m.radius + 1.6, (o) => {
                if (o === m || o.state === "dead" || o.uid < m.uid) {
                    return;
                }
                const dx = o.x - m.x;
                const dy = o.y - m.y;
                const d = fm.hypot(dx, dy);
                const min = m.radius + o.radius;
                if (d >= min || d < 0.0001) {
                    return;
                }
                const push = (min - d) * 0.5;
                const nx = dx / d;
                const ny = dy / d;
                if (o.rank !== "boss") {
                    moveCircle(this.grid, o, nx * push, ny * push, o.radius);
                }
                if (m.rank !== "boss") {
                    moveCircle(this.grid, m, -nx * push, -ny * push, m.radius);
                }
            });
            if (!h.dead) {
                const dx = m.x - h.x;
                const dy = m.y - h.y;
                const d = fm.hypot(dx, dy);
                const min = m.radius + HERO.radius;
                if (d < min && d > 0.0001) {
                    // One that stays where it rose shoulders the hero aside instead
                    if (m.def.speed === 0) {
                        moveCircle(this.grid, h, -(dx / d) * (min - d), -(dy / d) * (min - d), HERO.radius);
                    } else {
                        moveCircle(this.grid, m, (dx / d) * (min - d), (dy / d) * (min - d), m.radius);
                    }
                }
            }
        }
    }

    // ---- Projectiles and strikes ----

    private stepProjectiles(): void {
        const h = this.hero;
        for (const p of this.projectiles) {
            if (p.done) {
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.travelled += fm.hypot(p.vx, p.vy);
            if (!canSee(this.grid, p.prevX, p.prevY, p.x, p.y)) {
                this.endProjectile(p, p.prevX, p.prevY);
                continue;
            }
            if (p.side === "hero") {
                this.hash.query(p.x, p.y, 2.5, (m) => {
                    if (p.done || m.state === "dead" || p.hit.includes(m.uid)) {
                        return;
                    }
                    if (fm.hypot(m.x - p.x, m.y - p.y) > m.radius + 0.3) {
                        return;
                    }
                    p.hit.push(m.uid);
                    if (p.splash > 0 && p.pierce <= 0) {
                        this.endProjectile(p, p.x, p.y);
                        return;
                    }
                    this.hitMonster(m, { amount: p.damage * this.flown(p), crit: p.crit }, p.skill, p.x - p.vx * 4, p.y - p.vy * 4, p.ally);
                    // Chinchompa: a burst round what it hit
                    if (p.skill?.burst && !p.burst) {
                        this.chinBurst(p, m.x, m.y, m.uid);
                    }
                    // Splitting: on its first enemy, more of it fanned on ahead (they don't split)
                    const splits = p.skill?.traits?.splitting;
                    if (splits !== undefined && p.hit.length === 1) {
                        this.split(p, m, splits);
                    }
                    if (p.visual.hitSound !== undefined) {
                        this.emit({ kind: "sound", id: p.visual.hitSound, x: m.x, y: m.y, volume: 0.5 });
                    }
                    if (p.visual.impactSpot !== undefined && p.splash <= 0 && p.skill?.def.kind !== "shoot") {
                        this.emit({ kind: "spot", spot: p.visual.impactSpot, x: m.x, y: m.y });
                    }
                    if (p.pierce > 0) {
                        p.pierce--;
                    } else if (p.chain > 0) {
                        // On to the next
                        const next = this.nearestUnhit(m.x, m.y, p.hit);
                        if (next) {
                            p.chain--;
                            const ndx = next.x - m.x;
                            const ndy = next.y - m.y;
                            const nd = Math.max(0.001, fm.hypot(ndx, ndy));
                            const v = fm.hypot(p.vx, p.vy);
                            p.vx = (ndx / nd) * v;
                            p.vy = (ndy / nd) * v;
                            p.x = m.x;
                            p.y = m.y;
                            p.prevX = m.x;
                            p.prevY = m.y;
                            p.travelled = Math.max(0, p.range - CHAIN_REACH - 2);
                        } else {
                            p.done = true;
                        }
                    } else {
                        p.done = true;
                    }
                });
            } else if (p.toHireling) {
                this.shotAtHireling(p);
            } else if (!h.dead && fm.hypot(h.x - p.x, h.y - p.y) <= HERO.radius + 0.3) {
                const owner = p.owner !== undefined ? this.monsterByUid(p.owner) : undefined;
                if (this.hurtHero(p.damage, undefined, true, owner, isMissile(p.visual) ? "missile" : "magic") > 0 && owner) {
                    this.blowLanded(owner, p.damage);
                }
                if (p.visual.impactSpot !== undefined) {
                    this.emit({ kind: "spot", spot: p.visual.impactSpot, x: h.x, y: h.y });
                }
                if (p.visual.hitSound !== undefined) {
                    this.emit({ kind: "sound", id: p.visual.hitSound, x: h.x, y: h.y, volume: 0.5 });
                }
                p.done = true;
            }
            if (!p.done && p.travelled >= p.range) {
                if (p.returns && !h.dead) {
                    // Returning: back to the hero, through everything again
                    p.returns = false;
                    const dx = h.x - p.x;
                    const dy = h.y - p.y;
                    const d = Math.max(0.5, fm.hypot(dx, dy));
                    const v = fm.hypot(p.vx, p.vy);
                    p.vx = (dx / d) * v;
                    p.vy = (dy / d) * v;
                    p.travelled = 0;
                    p.range = d;
                    p.hit = [];
                } else {
                    this.endProjectile(p, p.x, p.y);
                }
            }
        }
        let w = 0;
        for (const p of this.projectiles) {
            if (!p.done) {
                this.projectiles[w++] = p;
            }
        }
        this.projectiles.length = w;
    }

    // Point Blank: more from a projectile close to the hero, less the further it's flown; Rigour:
    // more the further it's flown
    private flown(p: Projectile): number {
        let more = 1;
        if (p.skill?.pointBlank) {
            more *= 1.3 - Math.min(1, p.travelled / 10) * 0.6;
        }
        if (p.skill?.rigour) {
            more *= 1 + RIGOUR.most * Math.min(1, p.travelled / RIGOUR.tiles);
        }
        return more;
    }

    // Chinchompa: a burst where a projectile first hits or stops, for a share of its hit, round it
    // (and not on what it hit, which had the hit)
    private chinBurst(p: Projectile, x: number, y: number, struck = -1): void {
        const burst = p.skill!.burst!;
        p.burst = true;
        const amount = p.damage * this.flown(p) * burst.share;
        this.hash.query(x, y, burst.radius + 2, (m) => {
            if (m.uid !== struck && m.state !== "dead" && fm.hypot(m.x - x, m.y - y) <= burst.radius + m.radius) {
                this.hitMonster(m, { amount, crit: p.crit }, p.skill, x, y);
            }
        });
        this.emit({ kind: "spot", spot: SPOT.fireBlast.impactSpot, x, y });
    }

    // Where a projectile stops: a burst there if it bursts
    private endProjectile(p: Projectile, x: number, y: number): void {
        p.done = true;
        if (p.skill?.burst && !p.burst && p.side === "hero") {
            this.chinBurst(p, x, y);
        }
        if (p.splash > 0) {
            const amount = p.damage * this.flown(p) * (p.skill?.burstMore ?? 1);
            this.hash.query(x, y, p.splash + 2, (m) => {
                if (m.state !== "dead" && fm.hypot(m.x - x, m.y - y) <= p.splash + m.radius) {
                    this.hitMonster(m, { amount, crit: p.crit }, p.skill, x, y, p.ally);
                }
            });
            if (p.skill?.traits) {
                this.landed(x, y, p.splash, p.skill);
            }
            if (p.visual.impactSpot !== undefined) {
                this.emit({ kind: "spot", spot: p.visual.impactSpot, x, y });
            }
            this.emit({ kind: "sound", id: p.visual.hitSound ?? p.visual.sound ?? 2500, x, y, volume: 0.6 });
        }
    }

    private stepStrikes(): void {
        const h = this.hero;
        let w = 0;
        for (const s of this.strikes) {
            if (this.tick < s.land) {
                this.strikes[w++] = s;
                continue;
            }
            if (s.side === "hero") {
                this.hash.query(s.x, s.y, s.radius + 2, (m) => {
                    if (m.state !== "dead" && fm.hypot(m.x - s.x, m.y - s.y) <= s.radius + m.radius) {
                        this.hitMonster(m, { amount: s.damage, crit: s.crit }, s.skill, s.x, s.y);
                    }
                });
                if (s.skill?.traits) {
                    this.landed(s.x, s.y, s.radius, s.skill);
                }
            } else if (!h.dead && fm.hypot(h.x - s.x, h.y - s.y) <= s.radius + HERO.radius && (s.group === undefined || !this.struck.has(s.group))) {
                if (s.group !== undefined) {
                    this.struck.add(s.group);
                }
                if (s.damage > 0) {
                    // A mod's that leaves burning, a chill or a shock is all of that element
                    const element = s.ailment ? AILMENT_ELEMENT[s.ailment.kind] : undefined;
                    this.hurtHero(s.damage, undefined, false, s.owner !== undefined ? this.monsterByUid(s.owner) : undefined, undefined, element);
                }
                if (s.ailment) {
                    this.afflict(s.ailment.kind, s.ailment.seconds, s.ailment.perSecond);
                }
            }
            this.emit({ kind: "landed", side: s.side, x: s.x, y: s.y, radius: s.radius });
            if (s.visual.impactSpot !== undefined) {
                for (let i = 0; i < s.shows; i++) {
                    const a = this.rng.next() * Math.PI * 2;
                    const r = i === 0 ? 0 : this.rng.next() * s.radius * 0.8;
                    this.emit({ kind: "spot", spot: s.visual.impactSpot, x: s.x + fm.cos(a) * r, y: s.y + fm.sin(a) * r });
                }
            }
            if (s.visual.sound !== undefined) {
                this.emit({ kind: "sound", id: s.visual.sound, x: s.x, y: s.y, volume: 0.6 });
            }
        }
        this.strikes.length = w;
    }

    // ---- The city's shops ----

    // Something off a shop's shelves: the item, or why not
    buy(offer: StockItem): Item | string {
        const hero = this.heroData;
        if (hero.gold < offer.price) {
            return "You can't afford that.";
        }
        if (!stow(hero, offer.item)) {
            return "Your pack is full.";
        }
        hero.gold -= offer.price;
        return offer.item;
    }

    // Sold to a shop: the gold, or why not. Gems in it come out into the pack first.
    sell(index: number): number | string {
        const item = this.heroData.inventory[index];
        if (!item) {
            return 0;
        }
        const out = emptySockets(this.heroData, item);
        if (typeof out === "string") {
            return out;
        }
        const value = sellValue(item);
        this.heroData.inventory[index] = null;
        this.heroData.gold += value;
        return value;
    }

    // A mystery item for the hero's level, of a slot: more likely magic or better. Elite, past the
    // campaign: at the deepest area level reached, an elite base where they're made (sim/town.ts)
    gamble(slot: Slot, elite = false): Item | string {
        const hero = this.heroData;
        const level = elite ? eliteGambleLevel(hero) : cityLevel(hero);
        if (level === undefined) {
            return `${SHOPS.general.keeper} keeps his elite wares for those who've reached rift ${LADDER_DEPTH}.`;
        }
        const cost = gambleCost(level);
        if (hero.gold < cost) {
            return "You can't afford that.";
        }
        if (hero.inventory.indexOf(null) < 0) {
            return "Your pack is full.";
        }
        hero.gold -= cost;
        const item = rollItem(this.rng, nextUid(hero), { level, rarity: 2.5, cls: hero.cls, atLeast: "magic", slot, elite });
        stow(hero, item);
        logItem(hero, item);
        return item;
    }

    // A rune from the pouch on something in the pack or worn: the item as it is now, or why not
    useRune(rune: RuneId, target: RuneTarget): Item | string {
        const result = useRune(this.heroData, rune, target);
        if (typeof result !== "string" && "slot" in target) {
            this.refreshStats();
        }
        return result;
    }

    // Work on the sockets of something worn, at the gem trader's: why not, if it can't be done
    socketWork(slot: Slot, work: SocketWork): string | undefined {
        const why = socketWork(this.heroData, this.rng, slot, work);
        if (!why) {
            this.refreshStats();
        }
        return why;
    }

    // Out of the pack onto the ground at the hero's feet, its gems kept: false if there's no
    // room for them
    dropItem(index: number): boolean {
        const item = this.heroData.inventory[index];
        if (!item || typeof emptySockets(this.heroData, item) === "string") {
            return false;
        }
        this.heroData.inventory[index] = null;
        const h = this.hero;
        const drop: Drop = { uid: this.uid++, item, x: h.x, y: h.y - 0.6, tick: this.tick };
        this.drops.push(drop);
        this.emit({ kind: "drop", drop });
        return true;
    }

    // Life, mana and the belt's potions full: the city's (Ambrosia too), or a shrine of Bandos's
    refillPotions(city: boolean): void {
        fillBelt(this.heroData, city);
        this.hero.life = this.stats.maxLife;
        this.hero.mana = this.stats.maxMana;
    }

    // ---- For the client ----

    get corpseTicks(): number {
        return CORPSE_TICKS;
    }

    aliveCount(): number {
        let n = 0;
        for (const m of this.monsters) {
            if (m.state !== "dead") {
                n++;
            }
        }
        return n;
    }
}
