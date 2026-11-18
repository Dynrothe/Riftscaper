// The hero's hireling (content/hirelings.ts): what it is from their level, what it wears and their
// prayers, and its hiring, raising and gear. The Game fights it (Game.ts stepHireling); this is its
// numbers and the city's dealings.
import { HIRELING, HIRELINGS, HIRELING_NAMES, HirelingDef, HirelingKind, HirelingSlot } from "../content/hirelings";
import { BASES, BaseDef, StatKey } from "../content/items";
import { HitKind, PRAYERS } from "../content/prayers";
import { HERO } from "../content/rules";
import { Hero, cityLevel, prayersOn, stow } from "./hero";
import { Item, isGem, itemInfo } from "./loot";
import { isPotion } from "./potions";
import { isRiftstone, isShard } from "./riftstones";

// What's saved of one: its kind and name, whether it's fallen, and what it wears
export type Hire = {
    kind: HirelingKind;
    name: string;
    dead?: boolean;
    equipment: Partial<Record<HirelingSlot, Item>>;
};

export type HirelingStats = {
    def: HirelingDef;
    level: number;
    // Its own weapon's name, with none given it
    own?: string;
    maxLife: number;
    lifeRegen: number;
    armour: number;
    // A blow's, before the monster's armour
    minDamage: number;
    maxDamage: number;
    // Seconds from one blow to the next
    attackSeconds: number;
    critChance: number;
    critMulti: number;
    // A share of what it deals back as its life
    leech: number;
    // The hero's protection prayers' less, of each kind
    protect: Record<HitKind, number>;
};

// The prayers' tag for its weapon's kind
const PRAYER_TAG = { melee: "melee", bow: "projectile", staff: "spell" } as const;

// Its weapon's kind's increased damage, from what it wears
const KIND_DAMAGE: Record<HirelingDef["weapon"], StatKey[]> = {
    melee: ["meleeDamagePct", "physicalDamagePct"],
    bow: ["projectileDamagePct", "physicalDamagePct"],
    staff: ["spellDamagePct", "elementalDamagePct"],
};

// What it is now: none for a hero with no hireling
export function hirelingStats(hero: Hero): HirelingStats | undefined {
    const hire = hero.hireling;
    if (!hire) {
        return undefined;
    }
    const def = HIRELINGS[hire.kind];
    const levels = hero.level - 1;
    const t: Partial<Record<StatKey, number>> = {};
    let baseArmour = 0;
    for (const item of Object.values(hire.equipment)) {
        if (!item) {
            continue;
        }
        const info = itemInfo(item);
        baseArmour += info.armour ?? 0;
        // Its numbers that hold always: those that hang on a state are the hero's alone
        for (const line of [...info.implicit, ...info.stats]) {
            if (!line.when) {
                t[line.stat] = (t[line.stat] ?? 0) + line.value;
            }
        }
    }
    const v = (k: StatKey) => t[k] ?? 0;
    // The hero's prayers on it as on them: protections, armour, pace and its kind's more damage
    const protect: Record<HitKind, number> = { melee: 0, missile: 0, magic: 0 };
    let armourMore = 1;
    let speedMore = 1;
    let damageMore = 1;
    let regenShare = HIRELING.regen;
    for (const id of prayersOn(hero)) {
        const p = PRAYERS[id];
        if (p.protect) {
            protect[p.protect] = Math.max(protect[p.protect], 0.2);
        }
        armourMore *= 1 + (p.armour ?? 0);
        speedMore *= 1 + (p.speed ?? 0);
        damageMore *= 1 + (p.more?.[PRAYER_TAG[def.weapon]] ?? 0);
        regenShare += p.lifeRegen ?? 0;
    }
    const maxLife = Math.round((def.life[0] + def.life[1] * levels + v("life") + Math.floor(v("str") / 2)) * (1 + v("lifePct") / 100));
    const armour = Math.round((def.armour[0] + def.armour[1] * levels + baseArmour + v("armour")) * (1 + v("armourPct") / 100) * armourMore);
    const weaponItem = hire.equipment.weapon;
    const own = weaponItem ? undefined : ownWeapon(def, hero.level);
    const weapon = weaponItem ? itemInfo(weaponItem).weapon : own?.weapon;
    const damage = weapon?.damage ?? [1, 2];
    const speed = weapon?.speed ?? 1;
    const increased = 1 + (v("damagePct") + KIND_DAMAGE[def.weapon].reduce((a, k) => a + v(k), 0)) / 100;
    const more = (1 + HIRELING.damagePerLevel * levels) * increased * damageMore;
    return {
        def,
        level: hero.level,
        own: own?.name,
        maxLife,
        lifeRegen: maxLife * regenShare + v("lifeRegen"),
        armour,
        minDamage: Math.max(1, Math.round((damage[0] + v("addedMin")) * more)),
        maxDamage: Math.max(1, Math.round((damage[1] + v("addedMax")) * more)),
        attackSeconds: 1 / (speed * (1 + v("attackSpeedPct") / 100) * speedMore),
        critChance: Math.min(0.75, HERO.baseCrit + v("critChance") / 100),
        critMulti: HERO.critMulti + v("critMulti") / 100,
        leech: Math.min(8, v("lifeLeech")) / 100,
        protect,
    };
}

// Its own weapon, with none given it: the best plain one of its kind its level allows, not an
// elite's (the ladder's own), as a Diablo II mercenary comes armed
export function ownWeapon(def: HirelingDef, level: number): BaseDef | undefined {
    let best: BaseDef | undefined;
    let most = -1;
    for (const b of BASES) {
        const w = b.weapon;
        if (!w || w.kind !== def.weapon || b.level > level || b.elite) {
            continue;
        }
        const v = (w.damage[0] + w.damage[1]) * w.speed;
        if (v > most) {
            most = v;
            best = b;
        }
    }
    return best;
}

// Its damage a second, crits counted
export function hirelingDps(s: HirelingStats): number {
    return (((s.minDamage + s.maxDamage) / 2) * (1 + s.critChance * (s.critMulti - 1))) / s.attackSeconds;
}

// Gold to hire one, and to raise one that's fallen
export function hireCost(hero: Hero): number {
    return HIRELING.hirePerLevel * cityLevel(hero);
}

export function raiseCost(hero: Hero): number {
    return HIRELING.raisePerLevel * cityLevel(hero);
}

// What it has on, back into the pack: false, and nothing moved, if there isn't the room
function gearBack(hero: Hero): boolean {
    const hire = hero.hireling;
    if (!hire) {
        return true;
    }
    const worn = Object.values(hire.equipment).filter((i): i is Item => !!i);
    if (hero.inventory.filter((i) => !i).length < worn.length) {
        return false;
    }
    worn.forEach((i) => stow(hero, i));
    hire.equipment = {};
    return true;
}

// One hired, in place of any they had (whose gear comes back to them): why not, if not
export function hire(hero: Hero, kind: HirelingKind): string | undefined {
    const cost = hireCost(hero);
    if (hero.gold < cost) {
        return `A ${HIRELINGS[kind].name.toLowerCase()} costs ${cost} coins.`;
    }
    if (!gearBack(hero)) {
        return `Make room in your pack for what ${hero.hireling!.name} wears first.`;
    }
    hero.gold -= cost;
    const names = HIRELING_NAMES[kind];
    const before = hero.hireling?.name;
    let name = names[(hero.nextUid + hero.kills) % names.length];
    if (name === before) {
        name = names[(names.indexOf(name) + 1) % names.length];
    }
    hero.hireling = { kind, name, equipment: {} };
    return undefined;
}

// A fallen one raised: why not, if not
export function raiseHireling(hero: Hero): string | undefined {
    const hire = hero.hireling;
    if (!hire || !hire.dead) {
        return undefined;
    }
    const cost = raiseCost(hero);
    if (hero.gold < cost) {
        return `Raising ${hire.name} costs ${cost} coins.`;
    }
    hero.gold -= cost;
    hire.dead = false;
    return undefined;
}

// Sent away, its gear back to the hero first
export function dismissHireling(hero: Hero): string | undefined {
    if (!hero.hireling) {
        return undefined;
    }
    if (!gearBack(hero)) {
        return `Make room in your pack for what ${hero.hireling.name} wears first.`;
    }
    hero.hireling = undefined;
    return undefined;
}

// Why the hireling can't wear something, if it can't
export function hireWhyNot(hero: Hero, item: Item): string | undefined {
    const hire = hero.hireling;
    if (!hire) {
        return "You have no hireling: the Mercenary Captain, at the barracks by the south gate, has some for hire.";
    }
    if (isGem(item) || isRiftstone(item) || isShard(item) || isPotion(item)) {
        return `${hire.name} wears only a weapon, a helm and a body.`;
    }
    if (item.unid) {
        return "It's unidentified: Reldo, in the city, reads it for nothing.";
    }
    const info = itemInfo(item);
    const def = HIRELINGS[hire.kind];
    if (info.slot !== "weapon" && info.slot !== "head" && info.slot !== "body") {
        return `${hire.name} wears only a weapon, a helm and a body.`;
    }
    if (info.slot === "weapon" && info.weapon?.kind !== def.weapon) {
        return `${hire.name} fights with ${def.weapon === "melee" ? "a melee weapon" : def.weapon === "bow" ? "a bow" : "a staff"}.`;
    }
    if (info.level > hero.level) {
        return `${hire.name} needs to be level ${info.level} to use this.`;
    }
    return undefined;
}

// Something from the pack given it to wear, and what it wore there into the pack in its place
export function giveHireling(hero: Hero, index: number): string | undefined {
    const item = hero.inventory[index];
    if (!item) {
        return undefined;
    }
    const why = hireWhyNot(hero, item);
    if (why) {
        return why;
    }
    const slot = itemInfo(item).slot as HirelingSlot;
    const equipment = hero.hireling!.equipment;
    hero.inventory[index] = equipment[slot] ?? null;
    equipment[slot] = item;
    return undefined;
}

// Something it wears taken back into the pack
export function takeFromHireling(hero: Hero, slot: HirelingSlot): string | undefined {
    const item = hero.hireling?.equipment[slot];
    if (!item) {
        return undefined;
    }
    if (!stow(hero, item)) {
        return "Your pack is full.";
    }
    delete hero.hireling!.equipment[slot];
    return undefined;
}
