// The hero as they're kept between rifts and visits: their class, level and experience, gold, what
// they carry and wear (and the gems in it), their runes and what's in the banker's stash, the
// passives they've taken and what's on their skill bar, and how deep they've gone. What they can do
// follows from it (heroStats, and skills.ts for each skill).
import type { InvocationId } from "../content/tombs";
import { QUESTS } from "../content/quests";
import type { OrreryState } from "./orrery";
import type { SkillTraits, TraitId } from "../content/forge";
import type { SkillTag } from "../content/gems";
import type { ClassId, Family, Proc, SetId, Slot, StatKey, StatLine, UniquePower, WeaponDef, When } from "../content/items";
import { BASE_BY_ID, SEQ, SETS, SLOTS, STAT_TEXT, THRALLS_COUNTED, UNIQUE_BY_ID, VERSUS_WHEN, WHEN_FAMILIES } from "../content/items";
import { RUNEWORD_BY_ID } from "../content/runewords";
import { CLASSES, SKILL_SLOTS } from "../content/classes";
import { CLASS_LOOKS, Look, readLook } from "../content/looks";
import type { KeystoneId } from "../content/passives";
import type { RiftModId } from "../content/riftMods";
import { ELIXIRS, ElixirId } from "../content/potions";
import type { GoodId } from "../content/goods";
import type { GodId, PinnacleId } from "../content/pinnacles";
import { HitKind, PRAYER, PRAYERS, PrayerId } from "../content/prayers";
import { HIRELINGS } from "../content/hirelings";
import type { Hire } from "./hirelings";
import { Element, HERO, MAX_LEVEL, PEAK_LEVEL, STASH, xpToNext } from "../content/rules";
import { BASIC, bindNew, cleanBar, grantLevelGems, moveGems, starterSockets } from "./gems";
import { Item, canEquip, isGem, itemInfo, plainItem } from "./loot";
import { PassiveGains, TREE_VERSION, passiveStats } from "./passives";
import { BELT_SIZE, beltNoPlace, beltPlaceFor, beltShutWhy, beltWhyNot, fresh, isPotion } from "./potions";
import { isRiftstone, isShard } from "./riftstones";
import { RunePouch, emptyPouch } from "./runes";
import type { Task } from "./tasks";
import type { QuestLog } from "./quests";
import type { WebState } from "./web";
import type { BountyId } from "../content/web";

export { BASIC };

export type Hero = {
    cls: ClassId;
    name: string;
    // How they look under what they wear (looks.ts)
    look: Look;
    // One life only: a hardcore hero who dies has fallen, and plays no more
    hardcore: boolean;
    fallen: boolean;
    level: number;
    xp: number;
    gold: number;
    inventory: (Item | null)[];
    equipment: Partial<Record<Slot, Item>>;
    // The rift they're in, and the deepest they've reached
    depth: number;
    maxDepth: number;
    // The ladder's second passive point a depth, from before the levels went past 60, kept by a
    // hero who had them (passives.ts)
    ladderPoints?: number;
    // Reldo's quests (sim/quests.ts): done, claimed, and the favours they've left
    quests?: QuestLog;
    // The seed of the rift they're in, so a visit later comes back to the same land
    zoneSeed: number;
    // Whether the Archmage's rift is open, and the modifiers it was opened with (riftMods.ts)
    riftOpen: boolean;
    riftMods: RiftModId[];
    // The pinnacle the open rift is, if it's one (content/pinnacles.ts), at the depth it was opened at
    riftPinnacle?: PinnacleId;
    // And whether it's that pinnacle awakened (docs/late-game.md B)
    riftAwakened?: boolean;
    // The Tombs' invocations chosen at the Archmage's for the next raid, and those the open one
    // was opened with (content/tombs.ts)
    invocations?: InvocationId[];
    riftInvocations?: InvocationId[];
    // The record (sim/log.ts): the collection log's slots lit, the combat achievements done, the
    // pets won and the one that follows
    log?: string[];
    achievements?: string[];
    pets?: string[];
    pet?: string;
    // The orrery's spheres lit and nodes taken (sim/orrery.ts)
    orrery?: OrreryState;
    // The rift web (sim/web.ts): its seed and the lane they stand on, and the open rift's place on
    // it and its bounty, if it's the web's
    web?: WebState;
    riftLane?: number;
    riftBounty?: BountyId;
    // Each god's kill count, from their followers slain on the ladder: forty opens their general's
    // stronghold (content/pinnacles.ts)
    killCount: Partial<Record<GodId, number>>;
    nextUid: number;
    // The belt: four potions, drunk with 1 to 4 (potions.ts), the first a life potion and the second
    // a mana potion, and the places the Apothecary's stitched on past those two (none, saved before)
    potions: (Item | null)[];
    beltStitched?: number;
    // Herbs and the like, by how many (content/goods.ts), kept in the pouch beside the runes
    goods: Partial<Record<GoodId, number>>;
    // An elixir drunk in the city, and the seconds of it left in the rifts (content/potions.ts)
    elixir?: { id: ElixirId; left: number };
    kills: number;
    deaths: number;
    // The passive tree's nodes taken (passives.ts), not counting the class's start
    passives: number[];
    // The talismans set in the tree's sockets, by the socket's node (talismans.ts)
    talismans: Record<number, Item>;
    // The tree's version their points were spent on (passives.ts TREE_VERSION)
    treeVersion: number;
    // What each skill button uses: a skill gem's uid, BASIC, or nothing
    skillBar: (number | null)[];
    // The highest level whose gems they've been given (gems.ts GEM_REWARDS)
    rewarded: number;
    // How many of each rune they carry, and where their runes' rolls have got to (runes.ts)
    runes: RunePouch;
    craftSeed: number;
    // What the banker keeps for them in the city: STASH.tabs tabs of STASH.tabSize, end to end
    stash: (Item | null)[];
    // The tasks the city's folk have set them (tasks.ts), as far as they've got
    tasks: Task[];
    // The prayers they have on (content/prayers.ts), which stay on between rifts: none for a hero
    // saved before them
    prayers?: PrayerId[];
    // Their hireling (content/hirelings.ts), if they've hired one: none for a hero saved before them
    hireling?: Hire;
};

export type Stats = {
    maxLife: number;
    maxMana: number;
    lifeRegen: number;
    manaRegen: number;
    armour: number;
    // A share: the chance an attack misses the hero
    evade: number;
    // A hit's damage before the skill's share, what increases it, crits and armour
    minDamage: number;
    maxDamage: number;
    // Attacks a second
    attackSpeed: number;
    // Shares
    castSpeed: number;
    critChance: number;
    critMulti: number;
    // Tiles a second
    moveSpeed: number;
    lifeOnHit: number;
    lifeLeech: number;
    // The most leech can be
    leechCap: number;
    lifeOnKill: number;
    manaOnKill: number;
    // Mana back for each enemy an attack hits (the class's share of the most mana)
    manaOnHit: number;
    // Increased rarity of items found, as a share
    rarity: number;
    extraProjectiles: number;
    // Increased damage, as shares: for every skill, and for those with each tag
    damage: { all: number; melee: number; projectile: number; spell: number; area: number; elemental: number; physical: number };
    // Shares
    area: number;
    manaCost: number;
    cooldown: number;
    duration: number;
    // Potions': more recovered, faster filled by kills, and their buffs stronger, as shares
    flask: number;
    potionFill: number;
    potionEffect: number;
    // Doses back in every potion for a rare's or a guardian's death (the tree's)
    potionRareDose: number;
    // Chances on a hit, as shares (ignite with fire, freeze with cold, shock with lightning)
    ignite: number;
    freeze: number;
    shock: number;
    stun: number;
    // Damage taken is multiplied by this
    damageTaken: number;
    // The share of damage taken from mana first (Mind over Matter)
    manaShield: number;
    str: number;
    dex: number;
    int: number;
    // The tree's keystones and those worn uniques give
    keystones: Set<KeystoneId>;
    // Worn uniques' traits (items.ts), on every skill of the kinds each suits (skills.ts), and
    // their powers of their own, and the tree's notables'
    traits: SkillTraits;
    powers: Set<UniquePower>;
    // The tree's notables' traits: on every skill of the kinds each suits, or only those with a tag
    treeTraits: SkillTraits;
    tagTraits: Partial<Record<SkillTag, SkillTraits>>;
    // The Soul talisman's: forged and unique traits stronger, plain skill gems weaker
    soul: boolean;
    weapon: WeaponDef;
    // Thralls': increased damage, attack and movement speed, and size, as shares, and how many
    // more of each kind can stand at once
    thrallDamage: number;
    thrallSpeed: number;
    thrallSize: number;
    extraThralls: number;
    // Shares: burning's damage and how long it lasts; how long freezes and shocks last; how much
    // more a shock makes a hit; a buff skill's numbers
    burnDamage: number;
    burnLength: number;
    freezeLength: number;
    shockLength: number;
    shockEffect: number;
    buffEffect: number;
    // A projectile's burst's area, and its damage, as shares
    projectileArea: number;
    burstDamage: number;
    extraChain: number;
    extraPierce: number;
    // More from a hit on an enemy in a state (items.ts When): increased damage and critical strike
    // multiplier, as shares
    versus: Partial<Record<When, { damage: number; critMulti: number }>>;
    // The hero's states in a rift that some of these hang on (HeroState), for the sim to watch
    hangsOn: When[];
    // Levels on skill gems past their own, all of them and a tag's (skills.ts resolveSkill)
    skillLevels: { all: number; melee: number; projectile: number; spell: number; minion: number };
    // Chances to cast (items.ts Proc): the uniques', runewords' and sets' worn
    procs: Proc[];
    // How many pieces of each set are worn
    sets: Partial<Record<SetId, number>>;
    // The prayers on (content/prayers.ts), and what they keep of the most mana, or of the most
    // life with no mana (Blood Rite)
    prayers: PrayerId[];
    manaReserved: number;
    lifeReserved: number;
    // Their less damage from each kind of hit, more damage for skills with each tag (as
    // multipliers), the share longer buffs and potions last, and Retribution's
    protect: Record<HitKind, number>;
    prayerMore: { melee: number; projectile: number; spell: number };
    preserve: number;
    retribution: boolean;
    // Each element's resistance before the Torment's penalty (content/rules.ts resistance)
    resist: Record<Element, number>;
};

// The hero in a rift, for the stats that hang on it (items.ts When): the sim's to say (Game)
export type HeroState = {
    killedRecently: boolean;
    hitRecently: boolean;
    evadedRecently: boolean;
    movedRecently: boolean;
    lowLife: boolean;
    fullLife: boolean;
    buffed: boolean;
    flasked: boolean;
    blessed: boolean;
    thralls: number;
};

export type NewHero = { name?: string; look?: Look; hardcore?: boolean };

export function newHero(cls: ClassId, seed: number, made: NewHero = {}): Hero {
    const def = CLASSES[cls];
    const hero: Hero = {
        cls,
        name: made.name?.trim() || def.name,
        look: readLook(made.look, CLASS_LOOKS[cls]),
        hardcore: made.hardcore === true,
        fallen: false,
        level: 1,
        xp: 0,
        gold: 0,
        inventory: new Array(HERO.inventorySize).fill(null),
        equipment: {},
        depth: 1,
        maxDepth: 1,
        ladderPoints: 0,
        zoneSeed: seed,
        riftOpen: false,
        riftMods: [],
        killCount: {},
        nextUid: 1,
        potions: new Array(BELT_SIZE).fill(null),
        goods: {},
        kills: 0,
        deaths: 0,
        passives: [],
        talismans: {},
        treeVersion: TREE_VERSION,
        skillBar: new Array(SKILL_SLOTS).fill(null),
        rewarded: 0,
        runes: emptyPouch(),
        craftSeed: (seed ^ 0x2c9a17e5) >>> 0,
        stash: new Array(STASH.tabs * STASH.tabSize).fill(null),
        tasks: [],
    };
    for (const baseId of def.start) {
        const base = BASE_BY_ID.get(baseId);
        if (!base) {
            throw new Error(`No starting item ${baseId}`);
        }
        const item = plainItem(hero.nextUid++, baseId);
        item.sockets = starterSockets(cls, base.slot);
        hero.equipment[base.slot] = item;
    }
    giveStarterPotions(hero);
    grantLevelGems(hero);
    return hero;
}

// The potions a hero starts with, the grade-1 life and mana potions, as the flasks were before
// there were potions: for a new hero, and one saved before
export function giveStarterPotions(hero: Hero): void {
    hero.potions[0] ??= fresh(plainItem(hero.nextUid++, "guthix_rest"));
    hero.potions[1] ??= fresh(plainItem(hero.nextUid++, "prayer_potion"));
}

// Fists, for a hero with nothing in their hands
function unarmed(cls: ClassId): WeaponDef {
    const kind = CLASSES[cls].weapon;
    return { kind, damage: [1, 3], speed: 1.2, seq: kind === "bow" ? SEQ.shoot : kind === "staff" ? SEQ.cast : 422 };
}

// Every stat there is
const STAT_KEYS = Object.keys(STAT_TEXT) as StatKey[];

// The damage stats a hit on an enemy in a state counts (the versus table), whatever the skill
const VERSUS_DAMAGE: StatKey[] = ["damagePct", "meleeDamagePct", "projectileDamagePct", "spellDamagePct", "areaDamagePct", "elementalDamagePct", "physicalDamagePct"];

// What's held: the weapon's kind and the offhand's
function heldFamilies(hero: Hero): Family[] {
    const out: Family[] = [];
    for (const slot of ["weapon", "offhand"] as const) {
        const item = hero.equipment[slot];
        const family = item ? (item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base)?.family : BASE_BY_ID.get(item.base)?.family) : undefined;
        if (family) {
            out.push(family);
        }
    }
    return out;
}

// How many times over a stat with a condition counts: the gear's to say for what's held, the
// rift's (HeroState) for the rest; with no state, as in the city, those don't count
function times(when: When, held: Family[], state: HeroState | undefined): number {
    const families = WHEN_FAMILIES[when];
    if (families) {
        return families.some((f) => held.includes(f)) ? 1 : 0;
    }
    if (!state) {
        return 0;
    }
    if (when === "perThrall") {
        return Math.min(THRALLS_COUNTED, state.thralls);
    }
    return state[when as Exclude<keyof HeroState, "thralls">] ? 1 : 0;
}

type Versus = Stats["versus"];

// Everything worn and every passive taken, added up; what's only so against an enemy in a state
// into `versus`, if it's given, and the hero's states the rest hang on into `hangsOn`
export function statTotals(hero: Hero, state?: HeroState, gains: PassiveGains = passiveStats(hero), versus?: Versus, hangsOn?: Set<When>): Record<StatKey, number> {
    const totals = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
    const held = heldFamilies(hero);
    const add = (line: StatLine) => {
        const when = line.when;
        if (!when) {
            totals[line.stat] += line.value;
        } else if (VERSUS_WHEN.includes(when)) {
            if (versus && (VERSUS_DAMAGE.includes(line.stat) || line.stat === "critMulti")) {
                const v = (versus[when] ??= { damage: 0, critMulti: 0 });
                if (line.stat === "critMulti") {
                    v.critMulti += line.value / 100;
                } else {
                    v.damage += line.value / 100;
                }
            }
        } else {
            if (!WHEN_FAMILIES[when]) {
                hangsOn?.add(when);
            }
            totals[line.stat] += line.value * times(when, held, state);
        }
    };
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        if (!item) {
            continue;
        }
        const info = itemInfo(item);
        info.implicit.forEach(add);
        info.stats.forEach(add);
        totals.armour += info.armour ?? 0;
    }
    // A set's bonuses, for as many of its pieces as are worn, more with its elite pieces all on
    for (const [id, worn] of Object.entries(setsWorn(hero)) as [SetId, number][]) {
        const more = setMore(hero, id);
        for (const b of SETS[id].bonuses) {
            if (worn >= b.pieces) {
                b.stats.forEach((line) => add(more === 1 ? line : { ...line, value: line.value * more }));
            }
        }
    }
    gains.stats.forEach(add);
    // Reldo's quests' numbers, for good (content/quests.ts)
    for (const id of hero.quests?.claimed ?? []) {
        const reward = QUESTS[id].reward;
        if (reward.kind === "stats") {
            reward.stats.forEach(add);
        }
    }
    // An elixir drunk in the city, while it lasts
    const elixir = hero.elixir && hero.elixir.left > 0 ? ELIXIRS[hero.elixir.id] : undefined;
    if (elixir) {
        add({ stat: elixir.stat, value: elixir.value });
    }
    return totals;
}

// The hero's numbers, from their class, level, gear and tree, and in a rift, how they're doing
// there (state)
export function heroStats(hero: Hero, state?: HeroState): Stats {
    const def = CLASSES[hero.cls];
    const gains = passiveStats(hero);
    const versus: Versus = {};
    const hangsOn = new Set<When>();
    const t = statTotals(hero, state, gains, versus, hangsOn);
    const keystones = new Set(gains.keystones);
    const { traits, powers, procs } = uniquesWorn(hero, keystones);
    gains.powers.forEach((p) => powers.add(p));
    const weaponItem = hero.equipment.weapon;
    const weapon = (weaponItem && itemInfo(weaponItem).weapon) || unarmed(hero.cls);
    // Life, mana and regeneration grow to the campaign's last level; past it a level is a point
    const levels = Math.min(hero.level, PEAK_LEVEL) - 1;
    const str = def.attributes[0] + t.str;
    const dex = def.attributes[1] + t.dex;
    const int = def.attributes[2] + t.int;
    // Strength: a life every 2 and 1% melee damage every 5. Dexterity: 1% projectile damage every
    // 5 and 1% evasion every 20. Intelligence: a mana every 2 and 1% spell damage every 5.
    let maxLife = Math.round((def.life[0] + def.life[1] * levels + t.life + Math.floor(str / 2)) * (1 + t.lifePct / 100));
    let maxMana = Math.round((def.mana[0] + def.mana[1] * levels + t.mana + Math.floor(int / 2)) * (1 + t.manaPct / 100));
    let lifeRegen = def.lifeRegen + levels * 0.08 + t.lifeRegen + (maxLife * t.lifeRegenPct) / 100;
    // Mana comes back a share of the pool a second besides, as Path of Exile's does, so a bigger
    // pool pays for the dearer skills a deeper rift asks for
    let manaRegen = def.manaRegen + levels * 0.05 + t.manaRegen + maxMana * HERO.manaRegenShare;
    let armour = t.armour * (1 + t.armourPct / 100);
    let evade = t.evade + dex / 20;
    let leech = t.lifeLeech;
    let leechCap = 8;
    let damageTaken = 1 - Math.min(50, t.lessDamageTaken) / 100;
    let moveSpeed = HERO.moveSpeed * (1 + Math.min(t.moveSpeedPct, 60) / 100);
    // The prayers on (content/prayers.ts): life and mana back first, so the keystones that stop
    // them stop the prayers' too
    const prayers = prayersOn(hero);
    let reserve = 0;
    let armourMore = 1;
    let speedMore = 1;
    let preserve = 0;
    let retribution = false;
    const protect: Record<HitKind, number> = { melee: 0, missile: 0, magic: 0 };
    const prayerMore = { melee: 1, projectile: 1, spell: 1 };
    for (const id of prayers) {
        const p = PRAYERS[id];
        reserve += p.reserve;
        if (p.protect) {
            protect[p.protect] = PRAYER.protect;
        }
        for (const [tag, v] of Object.entries(p.more ?? {}) as [keyof typeof prayerMore, number][]) {
            prayerMore[tag] *= 1 + v;
        }
        armourMore *= 1 + (p.armour ?? 0);
        speedMore *= 1 + (p.speed ?? 0);
        lifeRegen += maxLife * (p.lifeRegen ?? 0);
        manaRegen += maxMana * (p.manaRegen ?? 0);
        preserve += p.preserve ?? 0;
        retribution ||= p.retribution === true;
    }
    if (PRAYER.lighter.includes(hero.cls)) {
        reserve *= 1 - PRAYER.lighterBy;
    }
    // A White Knight hireling's Defiance, while it stands (content/hirelings.ts)
    if (hero.hireling && !hero.hireling.dead) {
        armourMore *= 1 + (HIRELINGS[hero.hireling.kind].defiance ?? 0);
    }
    armour *= armourMore;
    if (keystones.has("ironSkin")) {
        armour *= 2;
        evade = 0;
    }
    if (keystones.has("acrobatics")) {
        evade += 30;
        armour *= 0.5;
    }
    if (keystones.has("zamoraksFury")) {
        damageTaken *= 1.25;
    }
    if (keystones.has("vampiricPact")) {
        leech *= 2;
        leechCap = 16;
        lifeRegen = 0;
    }
    if (keystones.has("bloodRite")) {
        maxMana = 0;
        manaRegen = 0;
    }
    if (keystones.has("demonicOffering")) {
        manaRegen = 0;
    }
    if (keystones.has("dharoksCurse")) {
        lifeRegen = 0;
    }
    if (keystones.has("rigour")) {
        moveSpeed *= 0.9;
    }
    // Proselyte's Discipline and Saradomin's Light (the paladin's wing): one attribute's worth to
    // the other's damage
    const spellFromStr = Math.floor(str / 10) * t.spellPerStr;
    const meleeFromInt = Math.floor(int / 10) * t.meleePerInt;
    // What the prayers keep: of the mana, or of the life with none, as Path of Exile's Blood
    // Magic reserves life
    const totalMana = maxMana;
    let manaReserved = 0;
    let lifeReserved = 0;
    if (reserve > 0 && maxMana > 0) {
        manaReserved = Math.round(maxMana * reserve);
        maxMana -= manaReserved;
    } else if (reserve > 0) {
        lifeReserved = Math.round(maxLife * reserve);
        maxLife -= lifeReserved;
    }
    return {
        maxLife,
        maxMana,
        lifeRegen,
        manaRegen,
        armour: Math.round(armour),
        evade: Math.min(60, evade) / 100,
        minDamage: Math.max(1, Math.round(weapon.damage[0] + t.addedMin)),
        maxDamage: Math.max(1, Math.round(weapon.damage[1] + t.addedMax)),
        attackSpeed: weapon.speed * (1 + t.attackSpeedPct / 100) * speedMore,
        castSpeed: t.castSpeedPct / 100,
        critChance: Math.min(0.75, HERO.baseCrit + t.critChance / 100),
        critMulti: HERO.critMulti + t.critMulti / 100,
        moveSpeed,
        lifeOnHit: t.lifeOnHit,
        lifeLeech: Math.min(leech, leechCap) / 100,
        leechCap: leechCap / 100,
        lifeOnKill: t.lifeOnKill,
        manaOnKill: t.manaOnKill,
        manaOnHit: Math.round(def.manaOnHit * totalMana * 10) / 10,
        rarity: t.rarity / 100,
        extraProjectiles: t.extraProjectiles,
        damage: {
            all: t.damagePct / 100,
            melee: (t.meleeDamagePct + Math.floor(str / 5) + meleeFromInt) / 100,
            projectile: (t.projectileDamagePct + Math.floor(dex / 5)) / 100,
            spell: (t.spellDamagePct + Math.floor(int / 5) + spellFromStr) / 100,
            area: t.areaDamagePct / 100,
            elemental: t.elementalDamagePct / 100,
            physical: t.physicalDamagePct / 100,
        },
        area: t.areaPct / 100,
        manaCost: Math.min(80, t.manaCostPct) / 100,
        cooldown: t.cooldownPct / 100,
        duration: t.durationPct / 100,
        flask: t.flaskPct / 100,
        potionFill: t.potionFillPct / 100,
        potionEffect: t.potionEffectPct / 100,
        potionRareDose: t.potionRareDose,
        ignite: t.igniteChance / 100,
        freeze: t.freezeChance / 100,
        shock: t.shockChance / 100,
        stun: t.stunChance / 100,
        damageTaken,
        manaShield: keystones.has("mindOverMatter") && maxMana > 0 ? 0.3 : 0,
        str,
        dex,
        int,
        keystones,
        traits,
        powers,
        treeTraits: gains.traits,
        tagTraits: gains.tagTraits,
        soul: gains.soul,
        weapon,
        thrallDamage: t.thrallDamagePct / 100,
        thrallSpeed: t.thrallSpeedPct / 100,
        thrallSize: t.thrallSizePct / 100,
        extraThralls: Math.round(t.extraThralls),
        burnDamage: t.burnDamagePct / 100,
        burnLength: t.burnLengthPct / 100,
        freezeLength: t.freezeLengthPct / 100,
        shockLength: t.shockLengthPct / 100,
        shockEffect: t.shockEffectPct / 100,
        buffEffect: t.buffEffectPct / 100,
        projectileArea: t.projectileAreaPct / 100,
        burstDamage: t.burstDamagePct / 100,
        extraChain: Math.round(t.extraChain),
        extraPierce: Math.round(t.extraPierce),
        versus,
        hangsOn: [...hangsOn],
        skillLevels: {
            all: Math.round(t.skillLevels),
            melee: Math.round(t.meleeSkillLevels),
            projectile: Math.round(t.projectileSkillLevels),
            spell: Math.round(t.spellSkillLevels),
            minion: Math.round(t.minionSkillLevels),
        },
        procs,
        sets: setsWorn(hero),
        prayers,
        manaReserved,
        lifeReserved,
        protect,
        prayerMore,
        preserve,
        retribution,
        resist: { fire: t.fireRes + t.allRes, cold: t.coldRes + t.allRes, lightning: t.lightningRes + t.allRes },
    };
}

// The prayers a hero has on that count: those they're the level for, one protection and one
// other at most (the first of each kind on)
export function prayersOn(hero: Hero): PrayerId[] {
    const out: PrayerId[] = [];
    let protection = false;
    let other = false;
    for (const id of hero.prayers ?? []) {
        const p = PRAYERS[id];
        if (!p || hero.level < p.level || out.includes(id)) {
            continue;
        }
        if (p.protect ? protection : other) {
            continue;
        }
        if (p.protect) {
            protection = true;
        } else {
            other = true;
        }
        out.push(id);
    }
    return out;
}

// Why a hero can't say a prayer, if they can't
export function prayerWhyNot(hero: Hero, id: PrayerId): string | undefined {
    const p = PRAYERS[id];
    return hero.level < p.level ? `${p.name} needs level ${p.level}` : undefined;
}

// A prayer said, or put out if it's on: one of the same kind (a protection, or another) goes out
// for it. True if it's on now.
export function togglePrayer(hero: Hero, id: PrayerId): boolean {
    const on = prayersOn(hero);
    if (on.includes(id)) {
        hero.prayers = on.filter((p) => p !== id);
        return false;
    }
    if (prayerWhyNot(hero, id)) {
        hero.prayers = on;
        return false;
    }
    const protect = PRAYERS[id].protect !== undefined;
    hero.prayers = [...on.filter((p) => (PRAYERS[p].protect !== undefined) !== protect), id];
    return true;
}

// How many pieces of each set the hero wears (identified ones: an unidentified piece does nothing)
export function setsWorn(hero: Hero): Partial<Record<SetId, number>> {
    const out: Partial<Record<SetId, number>> = {};
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        const set = item?.rarity === "unique" && !item.unid ? UNIQUE_BY_ID.get(item.base)?.set : undefined;
        if (set) {
            out[set] = (out[set] ?? 0) + 1;
        }
    }
    return out;
}

// What a set's numbers are multiplied by: more, its elite pieces all worn (items.ts SETS' elite)
export function setMore(hero: Hero, id: SetId): number {
    const elite = SETS[id].elite;
    const on = (piece: string) => SLOTS.some((slot) => hero.equipment[slot]?.base === piece && !hero.equipment[slot]?.unid);
    return elite && elite.pieces.every(on) ? 1 + elite.more : 1;
}

// Everything in the pack and the stash Reldo reads: the unidentified uniques and set pieces, as
// they are now
export function identify(hero: Hero): Item[] {
    const read: Item[] = [];
    for (const item of [...hero.inventory, ...hero.stash, ...Object.values(hero.equipment)]) {
        if (item?.unid) {
            item.unid = undefined;
            read.push(item);
        }
    }
    return read;
}

// What the uniques worn give past their numbers: their traits (the best of each), their powers,
// and their keystones, into the tree's
// and their chances to cast; a runeword's and a set's worn too
function uniquesWorn(hero: Hero, keystones: Set<KeystoneId>): { traits: SkillTraits; powers: Set<UniquePower>; procs: Proc[] } {
    const traits: SkillTraits = {};
    const powers = new Set<UniquePower>();
    const procs: Proc[] = [];
    for (const [id, worn] of Object.entries(setsWorn(hero)) as [SetId, number][]) {
        for (const b of SETS[id].bonuses) {
            if (worn >= b.pieces) {
                if (b.keystone) {
                    keystones.add(b.keystone);
                }
                if (b.power) {
                    powers.add(b.power);
                }
                procs.push(...(b.procs ?? []));
            }
        }
    }
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        const word = item?.runeword ? RUNEWORD_BY_ID.get(item.runeword) : undefined;
        if (word) {
            if (word.keystone) {
                keystones.add(word.keystone);
            }
            if (word.power) {
                powers.add(word.power);
            }
            procs.push(...(word.procs ?? []));
        }
        const u = item?.rarity === "unique" && !item.unid ? UNIQUE_BY_ID.get(item.base) : undefined;
        if (!u) {
            continue;
        }
        procs.push(...(u.procs ?? []));
        for (const [id, v] of Object.entries(u.traits ?? {}) as [TraitId, number][]) {
            traits[id] = Math.max(traits[id] ?? 0, v);
        }
        if (u.keystone) {
            keystones.add(u.keystone);
        }
        if (u.power) {
            powers.add(u.power);
        }
    }
    return { traits, powers, procs };
}

// What equipping it says no to, if anything
export function whyNotEquip(hero: Hero, item: Item): string | undefined {
    if (isGem(item)) {
        return "A gem goes in a socket, not on you.";
    }
    if (isRiftstone(item)) {
        return "A riftstone isn't worn: give it to the Archmage, and he opens its rift.";
    }
    if (isShard(item)) {
        return "A shard isn't worn: with all four, the Archmage can open the way to the Heart of the Rift.";
    }
    if (item.unid) {
        return "It's unidentified: Reldo, in the city, reads it for nothing.";
    }
    const info = itemInfo(item);
    if (info.slot === "potion") {
        return info.level > hero.level ? `You need to be level ${info.level} to use this.` : beltNoPlace(hero, item);
    }
    const no = canEquip(hero.cls, info);
    if (no) {
        return no;
    }
    if (info.level > hero.level) {
        return `You need to be level ${info.level} to use this.`;
    }
    return undefined;
}

export function freeSlot(hero: Hero): number {
    return hero.inventory.indexOf(null);
}

// Puts it in the first free place, or says there's none
export function stow(hero: Hero, item: Item): boolean {
    const i = freeSlot(hero);
    if (i < 0) {
        return false;
    }
    hero.inventory[i] = item;
    return true;
}

// From the pack into a tab of the stash, at its first free place: why not, if it can't be
export function toStash(hero: Hero, index: number, tab: number): string | undefined {
    const item = hero.inventory[index];
    if (!item) {
        return undefined;
    }
    const start = Math.max(0, Math.min(STASH.tabs - 1, tab)) * STASH.tabSize;
    for (let i = start; i < start + STASH.tabSize; i++) {
        if (!hero.stash[i]) {
            hero.stash[i] = item;
            hero.inventory[index] = null;
            return undefined;
        }
    }
    return "That tab of your stash is full.";
}

// From the stash back into the pack
export function fromStash(hero: Hero, stashIndex: number): string | undefined {
    const item = hero.stash[stashIndex];
    if (!item) {
        return undefined;
    }
    if (!stow(hero, item)) {
        return "Your pack is full.";
    }
    hero.stash[stashIndex] = null;
    return undefined;
}

// Wears what's in the inventory at index, and puts what was worn there in its place. The gems in
// what comes off go across into what goes on, where they fit. How many moved, or why not.
export function equipFrom(hero: Hero, index: number): { moved: number } | string {
    const item = hero.inventory[index];
    if (!item) {
        return { moved: 0 };
    }
    const why = whyNotEquip(hero, item);
    if (why) {
        return why;
    }
    if (isPotion(item)) {
        return toBelt(hero, index, beltPlaceFor(hero, item)) ?? { moved: 0 };
    }
    const slot = itemInfo(item).slot;
    const worn = hero.equipment[slot];
    const moved = worn ? moveGems(worn, item) : 0;
    hero.equipment[slot] = item;
    hero.inventory[index] = worn ?? null;
    // Skills in what went on onto the bar where there's room, and off it what came off
    item.sockets?.forEach((s) => s.gem && bindNew(hero, s.gem));
    cleanBar(hero);
    return { moved };
}

// A potion from the pack into a place in the belt, and what was there into its place in the pack
export function toBelt(hero: Hero, index: number, place: number): string | undefined {
    const item = hero.inventory[index];
    if (!item) {
        return undefined;
    }
    const why = beltShutWhy(hero, place) ?? beltWhyNot(item, place);
    if (why) {
        return why;
    }
    if (itemInfo(item).level > hero.level) {
        return `You need to be level ${itemInfo(item).level} to use this.`;
    }
    hero.inventory[index] = hero.potions[place];
    hero.potions[place] = item;
    return undefined;
}

// A potion out of the belt, into the pack: at a place there, if it's given and free
export function fromBelt(hero: Hero, place: number, at?: number): string | undefined {
    const item = hero.potions[place];
    if (!item) {
        return undefined;
    }
    if (at !== undefined && at >= 0 && at < hero.inventory.length && !hero.inventory[at]) {
        hero.inventory[at] = item;
    } else if (!stow(hero, item)) {
        return "Your pack is full.";
    }
    hero.potions[place] = null;
    return undefined;
}

export function unequip(hero: Hero, slot: Slot): string | undefined {
    const worn = hero.equipment[slot];
    if (!worn) {
        return undefined;
    }
    if (!stow(hero, worn)) {
        return "Your pack is full.";
    }
    delete hero.equipment[slot];
    cleanBar(hero);
    return undefined;
}

// The level the city's shops, gambling and folk deal at: the hero's, to the campaign's last, so the
// rift-touched tier and elite bases stay the ladder's own
export function cityLevel(hero: Hero): number {
    return Math.min(hero.level, PEAK_LEVEL);
}

// Experience gained: levels up as many times as it covers, and gives the gems those levels bring
// (their names into `gems`, if it's given). How many levels.
export function gainXp(hero: Hero, xp: number, gems?: string[]): number {
    if (hero.level >= MAX_LEVEL) {
        return 0;
    }
    hero.xp += xp;
    let gained = 0;
    while (hero.level < MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
        hero.xp -= xpToNext(hero.level);
        hero.level++;
        gained++;
    }
    if (hero.level >= MAX_LEVEL) {
        hero.xp = 0;
    }
    if (gained > 0) {
        const given = grantLevelGems(hero);
        gems?.push(...given);
    }
    return gained;
}

export function nextUid(hero: Hero): number {
    return hero.nextUid++;
}
