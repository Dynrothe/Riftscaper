// What each skill on the hero's bar does, with everything that bears on it worked out: its gem's
// level, the supports linked to it, the hero's gear and passives, keystones. The sim uses these
// numbers as they are; they're made again whenever any of that changes (Game.refreshStats).
import { CLASSES, SKILL_SLOTS } from "../content/classes";
import {
    BASIC_ATTACK,
    BuffDef,
    GEM_DAMAGE_PER_LEVEL,
    GEM_MANA_PER_LEVEL,
    MANA_COST_MULT,
    GemDef,
    MAX_GEM_LEVEL,
    Ranged,
    SPELL_WITHOUT_STAFF,
    SkillDef,
    SkillTag,
} from "../content/gems";
import { SkillTraits, TRAITS } from "../content/forge";
import { SOUL } from "../content/items";
import { MINIONS, MinionDef } from "../content/minions";
import type { Hero, Stats } from "./hero";
import { BASIC, classLock, findWornGem, gemDef, gemRequirement, supports } from "./gems";
import type { Item } from "./loot";

export type ResolvedSkill = {
    // A gem's uid, or BASIC
    ref: number;
    def: SkillDef;
    gem?: GemDef;
    level: number;
    tags: Set<SkillTag>;
    // The supports that support it, by name
    supportedBy: string[];
    // Why it can't be used, if it can't
    why?: string;
    mana: number;
    // Life paid instead of mana (Blood Rite)
    life: number;
    // Seconds
    cooldown: number;
    // Attacks (or casts) a second, before a buff's
    speed: number;
    // Its share of the weapon's damage, with its gem's level
    share: number;
    // A hit, before a crit, armour and what's only so now and then (a buff, low life)
    minHit: number;
    maxHit: number;
    critChance: number;
    critMulti: number;
    // Chances on a hit, as shares
    ignite: number;
    freezeChance: number;
    shock: number;
    stun: number;
    // Burning's damage is multiplied by this, and how long it lasts
    burnMore: number;
    burnLength: number;
    // Seconds every hit freezes or stuns for, and a chance's freeze or stun
    freeze: number;
    stunFor: number;
    chanceFreeze: number;
    chanceStun: number;
    range: number;
    radius: number;
    arc: number;
    count: number;
    // Blows a strike lands at once
    hits: number;
    pierce: number;
    chain: number;
    lifeOnHit: number;
    leech: number;
    // A share of the damage it heals the hero for itself (Blood Barrage)
    selfHeal: number;
    cull: boolean;
    splash: number;
    buff?: BuffDef;
    // What a summon raises, for how many seconds, and how many can stand at once; how much bigger
    // (its reach with it) and quicker they are
    summon?: { def: MinionDef; seconds: number; max: number; scale: number; quick: number };
    painAttunement: boolean;
    pointBlank: boolean;
    // The wings' keystones (passives.ts): Rigour's flight, Dharok's missing life, Dragon Claws'
    // crits landing again
    rigour: boolean;
    dharok: boolean;
    claws: boolean;
    // Chinchompa's: a burst where its projectiles first hit or stop, its share of their hit and
    // its radius; and how much more a burst's hits are
    burst?: { share: number; radius: number };
    burstMore: number;
    // Its increased damage, as a share, so a hit on an enemy in a state can add to it (Stats.versus)
    increased: number;
    // A forged skill's traits (forge.ts); none on what a trait does itself, so nothing recurs
    traits?: SkillTraits;
    // Cast by a chance to cast (items.ts Proc), which carries none of its own
    proc?: boolean;
};

// A summon's gem levels that each let one more stand at once
const MORE_MINIONS_AT = [8, 15];

const at = ([lo, hi]: Ranged, level: number) => lo + ((hi - lo) * (Math.min(level, MAX_GEM_LEVEL) - 1)) / (MAX_GEM_LEVEL - 1);

function round1(v: number): number {
    return Math.round(v * 10) / 10;
}

// One skill: a gem's (with its level and linked supports) or the weapon's plain attack
// (or, given one, a gem's skill at a level of its own, for a chance to cast: no supports, and
// nothing to say no)
export function resolveSkill(hero: Hero, stats: Stats, ref: number, given?: { gem: GemDef; level: number }): ResolvedSkill | undefined {
    let def: SkillDef;
    let gem: GemDef | undefined;
    let level = 1;
    let tags: SkillTag[];
    let linked: Item[] = [];
    let why: string | undefined;
    if (given) {
        if (!given.gem.skill) {
            return undefined;
        }
        gem = given.gem;
        def = given.gem.skill;
        level = given.level;
        tags = gem.tags;
    } else if (ref === BASIC) {
        const basic = BASIC_ATTACK[stats.weapon.kind];
        def = basic.def;
        tags = basic.tags;
    } else {
        const worn = findWornGem(hero, ref);
        if (!worn || !worn.def.skill) {
            return undefined;
        }
        gem = worn.def;
        def = worn.def.skill;
        level = worn.gem.level;
        tags = gem.tags;
        linked = worn.linked;
        if (gem.weapons && !gem.weapons.includes(stats.weapon.kind)) {
            why = gem.weapons.includes("bow") ? "Needs a bow." : gem.weapons.includes("melee") ? "Needs a melee weapon." : "Needs a staff.";
        }
        if (gem.weapons && !gem.weapons.some((kind) => CLASSES[hero.cls].weapons.includes(kind))) {
            why = `A ${CLASSES[hero.cls].name.toLowerCase()} can't use this.`;
        }
        // A skill of another class's, worn from before skills were the class's own
        why = classLock(hero.cls, gem) ?? why;
        const needs = gemRequirement(gem, level);
        if (needs > hero.level) {
            why = `Needs level ${needs}.`;
        }
        // Levels past the gem's own, from what's worn (Diablo II's "+1 to all skills")
        const more = stats.skillLevels;
        if (more) {
            level += more.all + (tags.includes("melee") ? more.melee : 0) + (tags.includes("projectile") ? more.projectile : 0) + (tags.includes("spell") ? more.spell : 0) + (tags.includes("minion") ? more.minion : 0);
        }
    }
    // The supports that work with it; what one adds to it (added fire) can let in another
    const tagSet = new Set<SkillTag>(tags);
    const supportGems = linked.map((g) => ({ gem: g, def: gemDef(g)! })).filter((s) => s.def?.support);
    const applied: { def: GemDef; level: number }[] = [];
    if (gem) {
        for (let pass = 0; pass < 2; pass++) {
            for (const s of supportGems) {
                if (applied.some((a) => a.def === s.def) || gemRequirement(s.def, s.gem.level) > hero.level) {
                    continue;
                }
                if (supports(s.def, gem, [...tagSet])) {
                    applied.push({ def: s.def, level: s.gem.level });
                    s.def.support!.addTags?.forEach((t) => tagSet.add(t));
                }
            }
        }
    }

    const keystones = stats.keystones;
    const share = def.damage * (1 + GEM_DAMAGE_PER_LEVEL * (level - 1));
    const projectile = tagSet.has("projectile") && (def.kind === "shoot" || def.kind === "burst");
    let more = 1;
    let manaMult = 1 + GEM_MANA_PER_LEVEL * (level - 1);
    let speedMore = 1;
    let area = stats.area;
    let critChance = stats.critChance + (def.critBonus ?? 0);
    let critMulti = stats.critMulti;
    let cooldownInc = stats.cooldown;
    let duration = stats.duration;
    let projectiles = 0;
    let pierce = def.pierce ?? 0;
    let chain = def.chain ?? 0;
    let ignite = tagSet.has("fire") ? stats.ignite : 0;
    let freezeChance = tagSet.has("cold") ? stats.freeze : 0;
    let shock = tagSet.has("lightning") ? stats.shock : 0;
    let stun = stats.stun;
    let lifeOnHit = stats.lifeOnHit;
    let leech = stats.lifeLeech * 100;
    let burnMore = 1;
    let cull = false;
    let splash = 0;
    ignite += def.ignite ?? 0;
    shock += def.shock ?? 0;
    freezeChance += def.freezeChance ?? 0;
    for (const { def: sdef, level: sl } of applied) {
        const s = sdef.support!;
        manaMult *= at(s.manaMult, sl);
        if (s.more) more *= 1 + at(s.more, sl) / 100;
        if (s.moreSpeed) speedMore *= 1 + at(s.moreSpeed, sl) / 100;
        if (s.areaPct) area += at(s.areaPct, sl) / 100;
        if (s.critChance) critChance += at(s.critChance, sl) / 100;
        if (s.critMulti) critMulti += at(s.critMulti, sl) / 100;
        if (s.cooldownPct) cooldownInc += at(s.cooldownPct, sl) / 100;
        if (s.durationPct) duration += at(s.durationPct, sl) / 100;
        if (s.projectiles) projectiles += s.projectiles;
        if (s.pierce) pierce += s.pierce;
        if (s.chain) chain += s.chain;
        if (s.ignite) ignite += at(s.ignite, sl) / 100;
        if (s.freeze) freezeChance += at(s.freeze, sl) / 100;
        if (s.shock) shock += at(s.shock, sl) / 100;
        if (s.stun) stun += at(s.stun, sl) / 100;
        if (s.lifeOnHit) lifeOnHit += Math.round(at(s.lifeOnHit, sl));
        if (s.leech) leech += at(s.leech, sl);
        if (s.burnMore) burnMore *= 1 + at(s.burnMore, sl) / 100;
        if (s.cull) cull = true;
        if (s.splash) splash = Math.max(splash, at(s.splash, sl) / 100);
    }

    // Increased damage: everything's, and each of the skill's tags'; a thrall's, a summon's
    const d = stats.damage;
    let increased = d.all;
    const melee = tagSet.has("melee");
    const spell = tagSet.has("spell");
    // Temple Knight's Oath: melee's and spells' increases both, on either
    if (melee || (spell && keystones.has("templeOath"))) increased += d.melee;
    if (tagSet.has("projectile")) increased += d.projectile;
    if (spell || (melee && keystones.has("templeOath"))) increased += d.spell;
    if (tagSet.has("area")) increased += d.area;
    if (tagSet.has("physical")) increased += d.physical;
    if (tagSet.has("fire") || tagSet.has("cold") || tagSet.has("lightning")) increased += d.elemental;
    const summons = def.kind === "summon";
    if (summons) increased += stats.thrallDamage;
    const hitting = def.damage > 0;
    // The prayers' more (content/prayers.ts), by the skill's tags; a thrall's blows are melee
    const pm = stats.prayerMore;
    if (melee || summons) more *= pm.melee;
    if (tagSet.has("projectile")) more *= pm.projectile;
    if (spell) more *= pm.spell;
    if (keystones.has("zamoraksFury")) more *= 1.4;
    if (keystones.has("steadyHand")) {
        more *= 1.3;
        critChance = 0;
    }
    if (tagSet.has("spell") && stats.weapon.kind !== "staff") {
        more *= SPELL_WITHOUT_STAFF;
    }
    // The wings' keystones: thralls' more and the hero's own less (Arceuus Covenant), less for a
    // rule of their own (Vengeance, Graceful), half the crits that land again (Dragon Claws)
    if (keystones.has("arceuusCovenant") && hitting) more *= summons ? 1.5 : 0.5;
    if (keystones.has("vengeance") && hitting && !summons) more *= 0.8;
    if (keystones.has("graceful") && hitting && !summons) more *= 0.8;
    if (keystones.has("dragonClaws")) critChance *= 0.5;
    // The Soul talisman's: a plain skill gem, not forged, weaker beside the forged
    if (stats.soul && gem && !def.traits) more *= SOUL.written;
    if (keystones.has("templeOath")) manaMult *= 1.25;
    if (def.kind === "buff" && keystones.has("piety")) manaMult *= 1.5;
    burnMore *= 1 + stats.burnDamage;
    // More enemies on: a chaining skill's, and a projectile's through them
    if (chain > 0 || tagSet.has("chaining")) chain += stats.extraChain;
    if (projectile && def.kind === "shoot") pierce += stats.extraPierce;
    const chinchompa = projectile && keystones.has("chinchompa");
    if (chinchompa) {
        pierce = 0;
        chain = 0;
    }
    // The elemental keystones each give up the other two
    if (keystones.has("inferno")) {
        freezeChance = 0;
        shock = 0;
    }
    if (keystones.has("iceBarrage")) {
        ignite = 0;
        shock = 0;
    }
    if (keystones.has("tempest")) {
        ignite = 0;
        freezeChance = 0;
    }
    const noFreeze = keystones.has("inferno") || keystones.has("tempest");
    const mult = share * (1 + increased) * more;

    // Speed: the weapon's attacks a second, a spell's cast speed, a support's
    const speed = stats.attackSpeed * (tagSet.has("spell") ? 1 + stats.castSpeed : 1) * speedMore;
    // A projectile's burst is the bigger for what makes them so
    const burstArea = def.kind === "burst" || chinchompa ? stats.projectileArea : 0;
    const radiusMult = Math.sqrt(Math.max(0.2, 1 + area + burstArea));
    const durationMult = 1 + duration;
    const freezeMult = durationMult * (1 + stats.freezeLength);
    const cost = def.mana * MANA_COST_MULT * manaMult * (1 - stats.manaCost);
    const bloodRite = keystones.has("bloodRite");
    const isBow = stats.weapon.kind === "bow";
    const buff = def.buff ? boosted(def.buff, durationMult, stats) : undefined;
    const summon = def.summon
        ? {
              def: MINIONS[def.summon.minion],
              seconds: def.summon.seconds * durationMult,
              max: def.summon.max + MORE_MINIONS_AT.filter((l) => level >= l).length + stats.extraThralls + (keystones.has("arceuusCovenant") ? 2 : 0),
              scale: 1 + stats.thrallSize,
              quick: 1 + stats.thrallSpeed,
          }
        : undefined;
    let traits = skillTraits(def, stats, tagSet);
    if (chinchompa && traits && (traits.splitting !== undefined || traits.returning !== undefined)) {
        traits = { ...traits, splitting: undefined, returning: undefined };
    }
    return {
        proc: given ? true : undefined,
        ref,
        def,
        gem,
        level,
        tags: tagSet,
        supportedBy: applied.map((a) => a.def.name),
        why,
        mana: bloodRite ? 0 : Math.round(cost),
        life: bloodRite ? Math.round(cost) : 0,
        cooldown: def.cooldown / (1 + cooldownInc),
        speed,
        share,
        minHit: stats.minDamage * mult,
        maxHit: stats.maxDamage * mult,
        critChance: Math.max(0, Math.min(0.95, critChance)),
        critMulti,
        ignite: hitting ? Math.min(1, ignite) : 0,
        freezeChance: hitting ? Math.min(1, freezeChance) : 0,
        shock: hitting ? Math.min(1, shock) : 0,
        stun: hitting ? Math.min(1, stun) : 0,
        burnMore,
        burnLength: 1 + stats.burnLength,
        freeze: noFreeze ? 0 : (def.freeze ?? 0) * freezeMult,
        stunFor: (def.stun ?? 0) * durationMult,
        chanceFreeze: 1 * freezeMult,
        chanceStun: 0.8 * durationMult,
        range: def.kind === "cleave" || def.kind === "slam" || def.kind === "nova" ? def.range * radiusMult : def.range,
        radius: (def.radius ?? 0) * radiusMult,
        arc: def.arc ?? 0,
        count: (def.count ?? 1) + projectiles + (isBow && tagSet.has("projectile") ? stats.extraProjectiles : 0),
        hits: def.hits ?? 1,
        pierce,
        chain,
        lifeOnHit,
        leech: Math.min(leech / 100, stats.leechCap),
        selfHeal: def.leech ?? 0,
        cull,
        splash,
        buff,
        summon,
        painAttunement: keystones.has("painAttunement") && tagSet.has("spell"),
        pointBlank: keystones.has("pointBlank") && tagSet.has("projectile"),
        rigour: keystones.has("rigour") && tagSet.has("projectile"),
        dharok: keystones.has("dharoksCurse") && melee,
        claws: keystones.has("dragonClaws") && hitting && !summons,
        burst: chinchompa && def.kind === "shoot" ? { share: 0.5 * (1 + stats.burstDamage), radius: 1.5 * radiusMult } : undefined,
        burstMore: def.kind === "burst" ? 1 + stats.burstDamage : 1,
        increased,
        traits,
    };
}

// A buff skill's buff as the hero has it: lasting longer for skill duration and Preserve, its
// numbers bigger for buff effect, and under Piety both again
function boosted(buff: BuffDef, durationMult: number, stats: Stats): BuffDef {
    const piety = stats.keystones.has("piety");
    const more = (1 + stats.buffEffect) * (piety ? 1.5 : 1);
    const out: BuffDef = { ...buff, seconds: buff.seconds * durationMult * (1 + stats.preserve) * (piety ? 2 : 1) };
    for (const key of ["damagePct", "attackSpeedPct", "moveSpeedPct", "armourPct", "lessDamageTaken", "heal"] as const) {
        const v = buff[key];
        if (v !== undefined) {
            out[key] = Math.round(v * more * 100) / 100;
        }
    }
    return out;
}

// A skill's traits: its forged gem's, and those of worn uniques and the tree's notables that suit
// its kind (and its tags, for a notable's that ask for one), the best of each. The Soul talisman
// makes the forged's and the uniques' stronger.
function skillTraits(def: SkillDef, stats: Stats, tags: Set<SkillTag>): SkillTraits | undefined {
    let out: SkillTraits | undefined;
    const take = (id: keyof SkillTraits, v: number) => {
        out ??= {};
        out[id] = Math.max(out[id] ?? 0, v);
    };
    for (const t of TRAITS) {
        const strong = (v: number) => (stats.soul ? (t.whole ? Math.round(v * SOUL.traits) : Math.round(v * SOUL.traits * 1000) / 1000) : v);
        const own = def.traits?.[t.id];
        if (own !== undefined) {
            take(t.id, strong(own));
        }
        if (!t.kinds.includes(def.kind)) {
            continue;
        }
        const worn = stats.traits[t.id];
        if (worn !== undefined) {
            take(t.id, strong(worn));
        }
        const tree = stats.treeTraits[t.id];
        if (tree !== undefined) {
            take(t.id, tree);
        }
        for (const tag of tags) {
            const v = stats.tagTraits[tag]?.[t.id];
            if (v !== undefined) {
                take(t.id, v);
            }
        }
    }
    return out;
}

// Every button's skill. The left button with nothing on it uses the weapon's plain attack, so a
// click on a monster always does something.
export function resolveSkills(hero: Hero, stats: Stats): (ResolvedSkill | undefined)[] {
    const out: (ResolvedSkill | undefined)[] = [];
    for (let i = 0; i < SKILL_SLOTS; i++) {
        const ref = hero.skillBar[i] ?? (i === 0 ? BASIC : null);
        out.push(ref === null ? undefined : resolveSkill(hero, stats, ref));
    }
    return out;
}

// The skills the hero could put on a button: every skill gem worn, and the plain attack
export function skillChoices(hero: Hero, stats: Stats): ResolvedSkill[] {
    const choices: ResolvedSkill[] = [];
    const basic = resolveSkill(hero, stats, BASIC);
    if (basic) {
        choices.push(basic);
    }
    for (const slot of Object.keys(hero.equipment) as (keyof Hero["equipment"])[]) {
        for (const socket of hero.equipment[slot]?.sockets ?? []) {
            if (socket.gem && gemDef(socket.gem)?.skill) {
                const r = resolveSkill(hero, stats, socket.gem.uid);
                if (r) {
                    choices.push(r);
                }
            }
        }
    }
    return choices;
}

// The degrees a shot's arrows are fanned over: its gem's arc (ten a gap if it has none). Arrows
// that supports or the tree add widen a fan to ten degrees a gap at the least, but a tight volley,
// its own arrows under ten degrees apart (Barrage's four in 8), fits them inside its arc, so all
// six of Barrage with Volley land on one enemy as its four do. Widened as a fan, they were over 50
// degrees and one in six found an enemy eight tiles off: a link for more damage gave less. The sim
// fans them so (Game.cast), and the balance bot judges a skill by it.
export function spreadOf(r: ResolvedSkill): number {
    const own = r.def.count ?? 1;
    const arc = r.def.arc ?? (r.count > 1 ? 10 * (r.count - 1) : 0);
    const tight = own > 1 && r.def.arc !== undefined && r.def.arc / (own - 1) < 10;
    return r.count > own && !tight ? Math.max(arc, 10 * (r.count - 1)) : arc;
}

// A skill's own words, with its share of the weapon's damage in them
export function skillDescription(r: ResolvedSkill): string {
    return r.def.description.replace("{damage}", `${Math.round(r.share * 100)}`);
}

// The lines a tooltip shows for a skill, as the hero has it now
export function skillLines(r: ResolvedSkill): string[] {
    const lines: string[] = [];
    if (r.def.damage > 0) {
        const each = (r.count > 1 && (r.def.kind === "shoot" || r.def.kind === "burst")) || r.hits > 1 ? " each" : r.summon ? " a blow" : "";
        lines.push(`Deals ${Math.round(r.minHit)}-${Math.round(r.maxHit)} damage${each}`);
        if (r.hits > 1) {
            lines.push(`${r.hits} blows`);
        }
        lines.push(`${round1(r.speed / r.def.castTime)} uses a second · ${Math.round(r.critChance * 100)}% critical chance`);
    }
    if (r.life > 0) {
        lines.push(`Costs ${r.life} life`);
    } else if (r.mana > 0) {
        lines.push(`Costs ${r.mana} mana`);
    }
    if (r.cooldown > 0) {
        lines.push(`${round1(r.cooldown)} second cooldown`);
    }
    if (r.radius > 0) {
        lines.push(`Radius ${round1(r.radius)}`);
    }
    if (r.count > 1 && (r.def.kind === "shoot" || r.def.kind === "burst")) {
        lines.push(`${r.count} projectiles`);
    }
    if (r.pierce > 0) {
        lines.push(`Pierces ${r.pierce} ${r.pierce === 1 ? "enemy" : "enemies"}`);
    }
    if (r.chain > 0) {
        lines.push(`Chains ${r.chain} ${r.chain === 1 ? "time" : "times"}`);
    }
    const chance = (label: string, v: number) => v > 0 && lines.push(`${Math.round(v * 100)}% chance to ${label}`);
    chance("ignite", r.ignite);
    chance("freeze", r.freezeChance);
    chance("shock", r.shock);
    chance("stun", r.stun);
    if (r.buff) {
        lines.push(`Lasts ${round1(r.buff.seconds)} seconds`);
    }
    if (r.summon) {
        lines.push(`Up to ${r.summon.max} at once, for ${round1(r.summon.seconds)} seconds each`);
    }
    if (r.burst) {
        lines.push(`Bursts for ${Math.round(r.burst.share * 100)}% of its hit within ${round1(r.burst.radius)} tiles`);
    }
    return lines;
}

// A support's lines at a level, for its tooltip
export function supportLines(def: GemDef, level: number): string[] {
    const s = def.support;
    if (!s) {
        return [];
    }
    const lines: string[] = [];
    const v = (r: Ranged) => round1(at(r, level));
    if (s.more) {
        const m = v(s.more);
        lines.push(m >= 0 ? `${m}% more damage` : `${-m}% less damage`);
    }
    if (s.moreSpeed) lines.push(`${v(s.moreSpeed)}% more attack and cast speed`);
    if (s.projectiles) lines.push(`${s.projectiles} more projectiles`);
    if (s.pierce) lines.push(`Projectiles pierce ${s.pierce} more enemies`);
    if (s.chain) lines.push(`Projectiles chain ${s.chain} more times`);
    if (s.areaPct) lines.push(`${v(s.areaPct)}% increased area of effect`);
    if (s.critChance) lines.push(`+${v(s.critChance)}% critical strike chance`);
    if (s.critMulti) lines.push(`+${v(s.critMulti)}% critical strike multiplier`);
    if (s.ignite) lines.push(`${v(s.ignite)}% chance to ignite`);
    if (s.burnMore && v(s.burnMore) > 0) lines.push(`${v(s.burnMore)}% more burning damage`);
    if (s.freeze) lines.push(`${v(s.freeze)}% chance to freeze`);
    if (s.shock) lines.push(`${v(s.shock)}% chance to shock`);
    if (s.stun) lines.push(`${v(s.stun)}% chance to stun`);
    if (s.lifeOnHit) lines.push(`Gain ${Math.round(at(s.lifeOnHit, level))} life for each enemy hit`);
    if (s.leech) lines.push(`${v(s.leech)}% of damage leeched as life`);
    if (s.cull) lines.push("Kills enemies left on 10% of their life");
    if (s.splash) lines.push(`Blows also hit enemies near the target for ${v(s.splash)}% of their damage`);
    if (s.cooldownPct) lines.push(`${v(s.cooldownPct)}% increased cooldown recovery speed`);
    if (s.durationPct) lines.push(`${v(s.durationPct)}% increased skill effect duration`);
    if (s.addTags?.includes("fire")) lines.push("Makes it a fire skill");
    const mana = at(s.manaMult, level);
    if (mana !== 1) {
        lines.push(`Mana cost ×${round1(mana * 100) / 100}`);
    }
    return lines;
}

// The class's weapon kind's plain attack, for the class choice and the help
export function basicFor(hero: Hero): SkillDef {
    return BASIC_ATTACK[CLASSES[hero.cls].weapon].def;
}
