// Items as they drop: a base, a rarity, and for a magic or rare item its affixes rolled within
// their tiers for the item's level. Everything random comes from the Rng it's handed, so a seed
// drops the same things.
import { Rng } from "../../../engine/core/Rng";
import {
    AFFIXES,
    PROC_WHEN_TEXT,
    Proc,
    RIFT_TIER,
    SETS,
    SetId,
    AFFIX_BY_ID,
    AffixDef,
    BASES,
    BASE_BY_ID,
    BaseDef,
    ClassId,
    ELITE_LEVELS,
    MAX_SOCKETS,
    POWER_TEXT,
    RARE_FIRST,
    RARE_SECOND,
    Rarity,
    STAT_TEXT,
    Slot,
    StatKey,
    SocketColor,
    StatLine,
    TALISMAN_POWER_TEXT,
    UNIQUES,
    UNIQUE_BY_ID,
    UniqueDef,
    WHEN_TEXT,
    WeaponDef,
} from "../content/items";
import { CLASSES } from "../content/classes";
import type { ForgeRecipe } from "../content/forge";
import { TRAITS, forgedGem } from "../content/forge";
import { KEYSTONES, PASSIVES } from "../content/passives";
import { RIFT_MODS, RiftModId } from "../content/riftMods";
import { RIFTSTONE, RIFTSTONE_BASE, RIFTSTONE_TEXT, SHARD_BY_BASE, SHARD_TEXT, ShardId } from "../content/riftstones";
import { riftName } from "./ladder";
import { CLASS_COLORS, GEM_BY_ID, GemDef, SkillIcon } from "../content/gems";
import { FAMILY_NAMES, INSTIL_TEXT, Instil, PotionDef, PotionFamily } from "../content/potions";
import { RUNEWORD_BY_ID, RunewordDef } from "../content/runewords";
import { PINNACLES, PinnacleId } from "../content/pinnacles";
import { LADDER_DEPTH, LADDER_LEVEL, areaLevel } from "../content/rules";
import { dosesLeft, mostDoses, potionDef, potionIcon } from "./potions";

// One rolled affix: which, at which tier, and its values (one a stat)
export type Mod = { affix: string; tier: number; values: number[] };

// A socket on something worn, and the gem in it. Linked to the next one along: linked gems are
// a group, and a group's supports support its skills.
export type Socket = { color: SocketColor; linked: boolean; gem?: Item };

export type Item = {
    uid: number;
    // A base's id, a unique's, or a gem's
    base: string;
    rarity: Rarity;
    // An item's level, or a gem's own
    level: number;
    mods: Mod[];
    // A rare's own name
    rareName?: string;
    sockets?: Socket[];
    // A gem's experience towards its next level
    xp?: number;
    // A forged gem's recipe (forge.ts): what it is, rolled when it dropped. Its base is FORGED.
    forge?: ForgeRecipe;
    // A riftstone's modifiers (riftstones.ts); its level is its rift's depth
    rift?: RiftModId[];
    // A ring's or an amulet's notable of the passive tree, enchanted at Aubury's (enchant.ts): it
    // gives it as if it were taken
    enchant?: number;
    // A potion's doses left, a share of one counting towards the next (potions.ts)
    charges?: number;
    // What drinks a potion for you, instilled at the Apothecary's
    instil?: Instil;
    // A normal item's runeword, inscribed at Aubury's (runewords.ts)
    runeword?: string;
    // A unique's numbers as rolled, one a stat line (uniqueRange); none, its written ones
    rolls?: number[];
    // A unique or a set piece as it drops: its name and numbers unknown till Reldo reads it
    unid?: boolean;
};

// The base of every forged gem
export const FORGED = "forged";

// A gem item's gem: one of the written ones, or a forged one made from its recipe
export function gemOf(item: Item): GemDef | undefined {
    return item.forge ? forgedGem(item.forge) : GEM_BY_ID.get(item.base);
}

// What an item is, whatever its rarity: what it's called, where it goes, what it does
export type ItemInfo = {
    name: string;
    // A skill gem's skill's picture, drawn small over the gem
    skillIcon?: SkillIcon;
    gem?: GemDef;
    // The base's name under a rare's or unique's
    baseName: string;
    objId: number;
    slot: Slot;
    level: number;
    weapon?: WeaponDef;
    armour?: number;
    implicit: StatLine[];
    stats: StatLine[];
    lore?: string;
    classes?: ClassId[];
    // A unique's powers past its numbers (items.ts): its traits', its keystone's and its own, as
    // a tooltip says them
    powers?: string[];
    // A key to a rift (riftstones.ts), not something worn: a riftstone's depth and modifiers, or
    // which of the Heartstone's shards
    key?: { kind: "riftstone"; depth: number; mods: RiftModId[] } | { kind: "shard"; shard: ShardId };
    // A ring's or an amulet's enchanted notable: its name, and what it gives
    enchant?: { name: string; lines: string[] };
    // A potion's: what it is, its doses, and what drinks it for you
    potion?: { def: PotionDef; family: PotionFamily; doses: number; most: number; lines: string[]; instil?: string };
    // A set piece's set: its name, its pieces, and its bonuses at so many worn
    set?: { id: SetId; name: string; pieces: { id: string; name: string }[]; bonuses: { pieces: number; lines: string[] }[] };
    // A runeword's, and an unidentified unique's
    runeword?: boolean;
    unid?: boolean;
    // A unique dropped on the ladder above its own level, its numbers lifted (riftTouched)
    touched?: boolean;
};

// ---- Rift-touched uniques (docs/late-game.md), as Diablo III's ancients ----

// A unique dropped on the ladder (past LADDER_LEVEL) above its own level stands with the elite
// bases its level reaches: its weapon hits as much harder as the best weapon of its kind at its
// drop's level does than the best at its own, its armour likewise, and its numbers that grow a
// fifth more for each elite tier passed (ELITE_LEVELS). Its trait, keystone or power is as it was:
// the lift is numbers, not rules. Worked out from the level it dropped at, so nothing's saved.
export const TOUCHED = { more: 0.2 };

// The numbers that grow when it's touched: what's added and what's increased, not speeds,
// chances, leech or skill levels, which have caps or are already enough
const TOUCHED_STATS = new Set<StatKey>([
    "addedMin",
    "addedMax",
    "damagePct",
    "life",
    "mana",
    "lifeRegen",
    "manaRegen",
    "armour",
    "armourPct",
    "lifeOnHit",
    "str",
    "dex",
    "int",
    "lifePct",
    "manaPct",
    "meleeDamagePct",
    "projectileDamagePct",
    "spellDamagePct",
    "areaDamagePct",
    "elementalDamagePct",
    "physicalDamagePct",
    "lifeOnKill",
    "manaOnKill",
    "thrallDamagePct",
    "burnDamagePct",
    "burstDamagePct",
    "fireRes",
    "coldRes",
    "lightningRes",
    "allRes",
]);

export function isTouched(item: Item, u: UniqueDef): boolean {
    return item.level > LADDER_LEVEL && item.level > u.level && u.slot !== "potion" && u.slot !== "talisman";
}

// The best a weapon of a kind hits a second, of the bases a level can have, and the most armour a
// slot's bases give
const bestDpsAt = new Map<string, number>();
function bestDps(kind: WeaponDef["kind"], level: number): number {
    const key = `${kind}:${level}`;
    let best = bestDpsAt.get(key);
    if (best === undefined) {
        best = 0;
        for (const b of BASES) {
            if (b.weapon?.kind === kind && b.level <= level) {
                best = Math.max(best, ((b.weapon.damage[0] + b.weapon.damage[1]) / 2) * b.weapon.speed);
            }
        }
        bestDpsAt.set(key, best);
    }
    return best;
}
const bestArmourAt = new Map<string, number>();
function bestArmour(slot: Slot, level: number): number {
    const key = `${slot}:${level}`;
    let best = bestArmourAt.get(key);
    if (best === undefined) {
        best = 0;
        for (const b of BASES) {
            if (b.slot === slot && b.level <= level && b.armour) {
                best = Math.max(best, b.armour);
            }
        }
        bestArmourAt.set(key, best);
    }
    return best;
}

// How much a touched unique's weapon, armour and numbers are lifted (all 1 if it isn't)
export function touchLift(item: Item, u: UniqueDef): { weapon: number; armour: number; stats: number } {
    if (!isTouched(item, u)) {
        return { weapon: 1, armour: 1, stats: 1 };
    }
    const ratio = (now: number, then: number) => (then > 0 && now > then ? now / then : 1);
    const tiers = ELITE_LEVELS.filter((l) => item.level > l).length;
    return {
        weapon: u.weapon ? ratio(bestDps(u.weapon.kind, item.level), bestDps(u.weapon.kind, u.level)) : 1,
        armour: u.armour ? ratio(bestArmour(u.slot, item.level), bestArmour(u.slot, u.level)) : 1,
        stats: 1 + TOUCHED.more * tiers,
    };
}

// A unique's powers, as lines: its traits on the skills they suit, its keystone's rule, its own
export function uniquePowers(u: UniqueDef): string[] {
    const lines = TRAITS.filter((t) => u.traits?.[t.id] !== undefined).map((t) => `${t.adjective}: ${lowerFirst(t.line(u.traits![t.id]!))}, on ${traitSkills(t.kinds)}`);
    if (u.keystone) {
        lines.push(`${KEYSTONES[u.keystone].name}: ${KEYSTONES[u.keystone].lines.join("; ")}`);
    }
    if (u.power) {
        lines.push(POWER_TEXT[u.power]);
    }
    if (u.talisman) {
        lines.push(TALISMAN_POWER_TEXT[u.talisman.power] + (u.talisman.radius ? ` (radius ${u.talisman.radius})` : ""));
    }
    u.procs?.forEach((p) => lines.push(procText(p)));
    return lines;
}

// A chance to cast, as a line: "10% chance to cast a level 12 Ice Burst when you're hit"
export function procText(p: Proc): string {
    return `${Math.round(p.chance * 100)}% chance to cast a level ${p.level} ${GEM_BY_ID.get(p.gem)?.name ?? p.gem} ${PROC_WHEN_TEXT[p.when]}`;
}

// A runeword's powers, as lines, as a unique's are
export function runewordPowers(w: RunewordDef): string[] {
    const lines: string[] = [];
    if (w.keystone) {
        lines.push(`${KEYSTONES[w.keystone].name}: ${KEYSTONES[w.keystone].lines.join("; ")}`);
    }
    if (w.power) {
        lines.push(POWER_TEXT[w.power]);
    }
    w.procs?.forEach((p) => lines.push(procText(p)));
    return lines;
}

// A set's bonuses, as lines, at each count of pieces
export function setBonusLines(id: SetId): { pieces: number; lines: string[] }[] {
    return SETS[id].bonuses.map((b) => {
        const lines = statLines(b.stats);
        if (b.keystone) {
            lines.push(`${KEYSTONES[b.keystone].name}: ${KEYSTONES[b.keystone].lines.join("; ")}`);
        }
        if (b.power) {
            lines.push(POWER_TEXT[b.power]);
        }
        b.procs?.forEach((p) => lines.push(procText(p)));
        return { pieces: b.pieces, lines };
    });
}

// ---- Uniques that roll ----

// A unique's numbers roll within ranges, as Diablo II's do, so a second copy is worth a look: a
// fifth either side of the number written, which was its middle. A set piece's are fixed, as are
// numbers under 4 (an arrow more, a level on gems). A Soul rune rolls them again (runes.ts).
export const UNIQUE_SPREAD = 0.2;

export function uniqueRange(u: UniqueDef, line: StatLine): [number, number] | undefined {
    if (u.set || u.potion || Math.abs(line.value) < 4 || !Number.isInteger(line.value)) {
        return undefined;
    }
    const lo = Math.round(line.value * (1 - UNIQUE_SPREAD));
    const hi = Math.round(line.value * (1 + UNIQUE_SPREAD));
    return lo === hi ? undefined : [lo, hi];
}

// A unique's numbers rolled, or none if it has none that roll
export function rollUniqueValues(rng: Rng, u: UniqueDef): number[] | undefined {
    if (!u.stats.some((line) => uniqueRange(u, line))) {
        return undefined;
    }
    return u.stats.map((line) => {
        const r = uniqueRange(u, line);
        return r ? r[0] + rng.int(r[1] - r[0] + 1) : line.value;
    });
}

// A unique's rolls moved into the top half of their ranges, each as far up it as it was up the
// whole (an awakened pinnacle's)
export function rollTopHalf(item: Item): Item {
    const u = UNIQUE_BY_ID.get(item.base);
    if (!u || !item.rolls) {
        return item;
    }
    item.rolls = item.rolls.map((v, i) => {
        const r = u.stats[i] ? uniqueRange(u, u.stats[i]) : undefined;
        if (!r || r[0] >= r[1]) {
            return v;
        }
        const mid = Math.ceil((r[0] + r[1]) / 2);
        return mid + Math.round(((v - r[0]) * (r[1] - mid)) / (r[1] - r[0]));
    });
    return item;
}

// A unique as it drops: unidentified (but for a potion or a talisman, which are read at once), its
// numbers rolled with their own Rng from its uid, so the drop's own rolls are as they were before
// uniques rolled
export function freshUnique(item: Item): Item {
    const u = UNIQUE_BY_ID.get(item.base);
    if (!u) {
        return item;
    }
    const rolls = rollUniqueValues(new Rng((item.uid * 0x9e3779b1) ^ 0x7a11e5), u);
    if (rolls) {
        item.rolls = rolls;
    }
    if (u.slot !== "potion" && u.slot !== "talisman") {
        item.unid = true;
    }
    return item;
}

// What a passive node gives, as lines: its stats, its traits on the skills they suit, its power,
// its keystone's rule
export function nodeLines(id: number): string[] {
    const node = PASSIVES[id];
    if (!node) {
        return [];
    }
    const lines = node.stats.map(statText);
    for (const t of TRAITS) {
        const v = node.traits?.[t.id];
        if (v !== undefined) {
            lines.push(`${t.adjective}: ${lowerFirst(t.line(v))}, on ${node.traitTag ? `your ${node.traitTag} skills` : traitSkills(t.kinds)}`);
        }
    }
    if (node.power) {
        lines.push(POWER_TEXT[node.power]);
    }
    if (node.keystone) {
        lines.push(...KEYSTONES[node.keystone].lines);
    }
    return lines;
}

function lowerFirst(text: string): string {
    return text.charAt(0).toLowerCase() + text.slice(1);
}

// The skills a trait goes on, in a few words
function traitSkills(kinds: readonly string[]): string {
    if (kinds.length === 1) {
        return kinds[0] === "shoot" ? "your shots" : "skills that fall from the sky";
    }
    if (!kinds.includes("strike")) {
        return "your area skills";
    }
    if (!kinds.includes("shoot")) {
        return "your blows and slams";
    }
    return kinds.includes("leap") ? "every skill that hits" : "every skill but leaps";
}

const RARITY_CHANCE = { magic: 0.24, rare: 0.055, unique: 0.006 };

export function isGem(item: Item): boolean {
    return item.rarity === "gem";
}

export function baseOf(item: Item): BaseDef | UniqueDef {
    const def = item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base) : BASE_BY_ID.get(item.base);
    if (!def) {
        throw new Error(`No item ${item.base}`);
    }
    return def;
}

export function itemInfo(item: Item): ItemInfo {
    if (item.base === RIFTSTONE_BASE) {
        const mods = item.rift ?? [];
        return {
            name: mods.length > 0 ? `${RIFT_MODS[mods[0]].name} riftstone` : "Riftstone",
            baseName: `Rift ${item.level}: ${riftName(item.level)}`,
            objId: RIFTSTONE.objId,
            // Not worn: given to the Archmage
            slot: "ring",
            level: 1,
            implicit: [],
            stats: [],
            lore: RIFTSTONE_TEXT,
            key: { kind: "riftstone", depth: item.level, mods },
        };
    }
    const shard = SHARD_BY_BASE.get(item.base);
    if (shard) {
        return {
            name: shard.name,
            baseName: "Heartstone shard",
            objId: shard.objId,
            slot: "ring",
            level: 1,
            implicit: [],
            stats: [],
            lore: SHARD_TEXT,
            key: { kind: "shard", shard: shard.id },
        };
    }
    if (item.rarity === "gem") {
        const gem = gemOf(item)!;
        return {
            name: gem.name,
            baseName: gem.support ? "Support gem" : gem.forged ? "Forged skill gem" : "Skill gem",
            skillIcon: gem.skill?.icon,
            gem,
            objId: gem.objId,
            // Not worn: socketed (gems.ts)
            slot: "ring",
            level: gem.level,
            implicit: [],
            stats: [],
        };
    }
    if (item.rarity === "unique") {
        const u = UNIQUE_BY_ID.get(item.base)!;
        if (item.unid) {
            return {
                name: u.set ? "Unidentified set piece" : "Unidentified unique",
                baseName: SLOT_BASE_NAMES[u.slot],
                objId: u.objId,
                slot: u.slot,
                level: u.level,
                weapon: u.weapon,
                armour: u.armour,
                implicit: [],
                stats: [],
                lore: "Reldo, in the city, reads it for nothing.",
                classes: u.classes,
                unid: true,
            };
        }
        const set = u.set ? SETS[u.set] : undefined;
        const rolled = item.rolls ? u.stats.map((line, i) => ({ ...line, value: item.rolls![i] ?? line.value })) : u.stats;
        const touched = isTouched(item, u);
        const lift = touchLift(item, u);
        return {
            name: touched ? `Rift-touched ${u.name}` : u.name,
            baseName: u.potion ? FAMILY_NAMES[u.potion.family] : SLOT_BASE_NAMES[u.slot],
            objId: u.potion ? potionIcon(item) : u.objId,
            slot: u.slot,
            level: u.level,
            weapon: u.weapon && lift.weapon > 1 ? { ...u.weapon, damage: [Math.round(u.weapon.damage[0] * lift.weapon), Math.round(u.weapon.damage[1] * lift.weapon)] } : u.weapon,
            armour: u.armour && lift.armour > 1 ? Math.round(u.armour * lift.armour) : u.armour,
            implicit: [],
            stats: touched ? rolled.map((line) => (TOUCHED_STATS.has(line.stat) && Number.isInteger(line.value) && Math.abs(line.value) >= 2 ? { ...line, value: Math.round(line.value * lift.stats), rift: true } : line)) : rolled,
            touched: touched || undefined,
            lore: u.lore,
            classes: u.classes,
            powers: u.potionText ?? uniquePowers(u),
            enchant: enchantInfo(item),
            potion: potionInfo(item),
            set: set && { id: set.id, name: set.name, pieces: set.pieces.map((id) => ({ id, name: UNIQUE_BY_ID.get(id)?.name ?? id })), bonuses: setBonusLines(set.id) },
        };
    }
    const base = BASE_BY_ID.get(item.base)!;
    const stats: StatLine[] = [];
    let prefix = "";
    let suffix = "";
    for (const mod of item.mods) {
        const affix = AFFIX_BY_ID.get(mod.affix);
        if (!affix) {
            continue;
        }
        const rift = (affix.tiers[mod.tier]?.level ?? 0) >= RIFT_TIER.level;
        affix.stats.forEach((stat, i) => {
            const line: StatLine = affix.when ? { stat, value: mod.values[i], when: affix.when } : { stat, value: mod.values[i] };
            if (rift) {
                line.rift = true;
            }
            stats.push(line);
        });
        const tierName = affix.tiers[mod.tier]?.name ?? "";
        if (affix.kind === "prefix") {
            prefix = tierName;
        } else {
            suffix = tierName;
        }
    }
    let name = base.name;
    if (item.rarity === "magic") {
        name = [prefix, base.name, suffix].filter((s) => s).join(" ");
    } else if (item.rarity === "rare") {
        name = item.rareName ?? base.name;
    }
    const word = item.runeword ? RUNEWORD_BY_ID.get(item.runeword) : undefined;
    if (word) {
        return {
            name: word.name,
            baseName: base.name,
            objId: base.objId,
            slot: base.slot,
            level: Math.max(base.level, word.level),
            weapon: base.weapon,
            armour: base.armour,
            implicit: base.implicit ?? [],
            stats: word.stats,
            lore: word.lore,
            classes: base.classes,
            powers: runewordPowers(word),
            runeword: true,
        };
    }
    return {
        name,
        baseName: base.potion ? FAMILY_NAMES[base.potion.family] : base.name,
        objId: base.potion ? potionIcon(item) : base.objId,
        slot: base.slot,
        level: base.level,
        weapon: base.weapon,
        armour: base.armour,
        implicit: base.implicit ?? [],
        stats,
        classes: base.classes,
        enchant: enchantInfo(item),
        potion: potionInfo(item),
    };
}

// A potion's own lines, as its tooltip says them: what a dose does, and its doses
function potionInfo(item: Item): ItemInfo["potion"] {
    const def = potionDef(item);
    if (!def) {
        return undefined;
    }
    const lines: string[] = [];
    const over = def.seconds > 0 ? ` over ${def.seconds} seconds` : " at once";
    if (def.life !== undefined && def.mana !== undefined && def.rule !== "ambrosia") {
        lines.push(`Recovers ${Math.round(def.life * 100)}% of your life and ${Math.round(def.mana * 100)}% of your mana at once`);
    } else if (def.life !== undefined && def.rule === undefined) {
        lines.push(`Recovers ${Math.round(def.life * 100)}% of your life${over}`);
    } else if (def.mana !== undefined && def.rule === undefined) {
        lines.push(`Recovers ${Math.round(def.mana * 100)}% of your mana${over}`);
    }
    const b = def.buff;
    if (b && def.rule === undefined) {
        const what = b.tagPct ? `${b.tagPct}% increased ${b.tag} damage` : b.armourPct ? `${b.armourPct}% increased armour` : b.moveSpeedPct ? `${b.moveSpeedPct}% increased movement speed` : b.elementalLess ? `${Math.round(b.elementalLess * 100)}% less elemental damage taken` : "";
        if (what) {
            lines.push(`${what} for ${def.seconds} seconds`);
        }
    }
    const most = mostDoses(item);
    return { def, family: def.family, doses: dosesLeft(item), most, lines, instil: item.instil ? INSTIL_TEXT[item.instil] : undefined };
}

// What an item's enchant gives, if it has one
function enchantInfo(item: Item): ItemInfo["enchant"] {
    const node = item.enchant !== undefined ? PASSIVES[item.enchant] : undefined;
    return node ? { name: node.name, lines: nodeLines(node.id) } : undefined;
}

const SLOT_BASE_NAMES: Record<Slot, string> = {
    weapon: "Weapon",
    offhand: "Shield",
    head: "Helm",
    body: "Body armour",
    legs: "Leg armour",
    hands: "Gloves",
    feet: "Boots",
    cape: "Cape",
    amulet: "Amulet",
    ring: "Ring",
    talisman: "Talisman",
    potion: "Potion",
};

// A stat as a line of text, with its condition after it
export function statText(line: StatLine): string {
    const value = Number.isInteger(line.value) ? String(line.value) : line.value.toFixed(1);
    const text = STAT_TEXT[line.stat].replace("{0}", value);
    return line.when ? `${text} ${WHEN_TEXT[line.when]}` : text;
}

// Stats read as one: an added damage's two values into "Adds 2 to 5 damage"
export function statLines(lines: StatLine[]): string[] {
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.stat === "addedMin" && lines[i + 1]?.stat === "addedMax") {
            out.push(`Adds ${line.value} to ${lines[i + 1].value} damage`);
            i++;
            continue;
        }
        out.push(statText(line));
    }
    return out;
}

// Whether a class can use it at all: weapons are a class's own; a bow takes both hands
export function canEquip(cls: ClassId, info: ItemInfo): string | undefined {
    const def = CLASSES[cls];
    if (info.slot === "weapon" && info.weapon && !def.weapons.includes(info.weapon.kind)) {
        return `A ${def.name.toLowerCase()} can't fight with this.`;
    }
    if (info.slot === "talisman") {
        return "A talisman isn't worn: set it in a socket on your passive tree.";
    }
    if (info.slot === "offhand" && !def.shield) {
        return def.weapon === "bow" ? `A ${def.name.toLowerCase()} needs both hands for a bow.` : `A ${def.name.toLowerCase()} keeps a hand free, and carries no shield.`;
    }
    return undefined;
}

// ---- Rolling ----

export type RollOptions = {
    level: number;
    // Increased rarity, as a share (0.5 is 50% more likely to be magic, rare or unique)
    rarity: number;
    // Leaning towards what this class can use
    cls?: ClassId;
    // At least this rare
    atLeast?: Rarity;
    // At most this rare (a shop's shelves have no uniques)
    atMost?: Rarity;
    // Only these slots
    slot?: Slot;
    // Only bases this says yes to (what a shop sells)
    bases?: (base: BaseDef) => boolean;
    // Elite bases too (items.ts ELITE): the ladder's drops only
    elite?: boolean;
};

// The deepest the elite bases never drop: the campaign's (items.ts ELITE)
export const ELITE_FROM = areaLevel(LADDER_DEPTH) + 3;

export function rollRarity(rng: Rng, rarity: number, atLeast?: Rarity): Rarity {
    const more = 1 + rarity;
    const roll = rng.next();
    let r: Rarity = "normal";
    if (roll < RARITY_CHANCE.unique * more) {
        r = "unique";
    } else if (roll < (RARITY_CHANCE.unique + RARITY_CHANCE.rare) * more) {
        r = "rare";
    } else if (roll < (RARITY_CHANCE.unique + RARITY_CHANCE.rare + RARITY_CHANCE.magic) * more) {
        r = "magic";
    }
    const order: Rarity[] = ["normal", "magic", "rare", "unique"];
    if (atLeast && order.indexOf(r) < order.indexOf(atLeast)) {
        r = atLeast;
    }
    return r;
}

// A base for the level: the newest tiers most likely, older ones less so, and the hero's class's
// own three times as likely
export function pickBase(rng: Rng, level: number, cls?: ClassId, slot?: Slot, only?: (base: BaseDef) => boolean, elite = false): BaseDef {
    // A talisman or a potion only when one's asked for: they drop on their own (rollTalisman,
    // rollPotion); an elite base only on the ladder
    const wanted = (b: BaseDef) => (slot ? b.slot === slot : b.slot !== "talisman" && b.slot !== "potion") && (!only || only(b)) && (elite || !b.elite);
    const open = BASES.filter((b) => b.level <= level && wanted(b));
    const pool = open.length > 0 ? open : BASES.filter(wanted);
    // How far behind the best of its slot the level allows, so that past the last tier (dragon at
    // 40) the best is still the likeliest, not as rare as bronze
    const top = new Map<string, number>();
    for (const b of pool) {
        top.set(b.slot, Math.max(top.get(b.slot) ?? 0, b.level));
    }
    const weights = pool.map((b) => {
        const behind = Math.min(level, top.get(b.slot)!) - b.level;
        let w = behind <= 6 ? 3 : behind <= 14 ? 1.5 : 0.6;
        if (b.classes) {
            w *= cls && b.classes.includes(cls) ? 3 : 0.5;
        }
        if (b.slot === "weapon" && b.classes && cls && !b.classes.includes(cls)) {
            w *= 0.3;
        }
        if (b.slot === "cape") {
            w *= 0.5;
        }
        return w;
    });
    return pool[Math.max(0, rng.weightedIndex(weights))];
}

// The affixes of a kind a slot can have, but for those already taken; a potion's, those of its
// family
// (and those whose first tier opens past the item's level: a ladder potion's, or levels on gems)
export function affixesFor(slot: Slot, kind: "prefix" | "suffix", taken: Set<string>, family?: PotionFamily, level = Infinity): AffixDef[] {
    return AFFIXES.filter((a) => a.kind === kind && a.slots[slot] !== undefined && !taken.has(a.id) && (!a.families || !family || a.families.includes(family)) && a.tiers[0].level <= level);
}

// A potion's family, for its affixes, if it's a potion
export function familyOf(item: Item): PotionFamily | undefined {
    return potionDef(item)?.family;
}

export function rollMod(rng: Rng, affix: AffixDef, slot: Slot, level: number): Mod {
    let top = 0;
    affix.tiers.forEach((t, i) => {
        if (t.level <= level) {
            top = i;
        }
    });
    // Mostly one of the best two tiers it can have; the rift-touched tier rarely, if it's open,
    // and likelier the deeper the ladder goes (a tenth at its first depth, half by depth 27)
    let tier = Math.max(0, top - (rng.chance(0.55) ? 0 : rng.chance(0.6) ? 1 : 2));
    if (tier === top && affix.tiers[top].level >= RIFT_TIER.level && top > 0 && !rng.chance(Math.min(0.5, 0.1 + (level - RIFT_TIER.level) * 0.01))) {
        tier = top - 1;
    }
    return { affix: affix.id, tier, values: rollValues(rng, affix, tier, slot) };
}

// An affix's numbers within one of its tiers, for a slot (some slots have less of it)
export function rollValues(rng: Rng, affix: AffixDef, tier: number, slot: Slot): number[] {
    const share = affix.slots[slot] ?? 1;
    return affix.tiers[tier].ranges.map(([lo, hi]) => {
        const v = (lo + rng.next() * (hi - lo)) * share;
        return affix.decimals ? Math.max(0.1, Math.round(v * 10) / 10) : Math.max(1, Math.round(v));
    });
}

// One of a pool's affixes, by their weights: those the item's base leans to (a talisman's rune's)
// three times as likely
export function pickAffix(rng: Rng, pool: AffixDef[], lean?: string[]): AffixDef | undefined {
    const i = rng.weightedIndex(pool.map((a) => a.weight * (lean?.includes(a.id) ? 3 : 1)));
    return i < 0 ? undefined : pool[i];
}

// What an item's base leans its affixes to, if anything
export function leanOf(item: Item): string[] | undefined {
    return item.rarity === "unique" ? undefined : BASE_BY_ID.get(item.base)?.lean;
}

function rollMods(rng: Rng, slot: Slot, level: number, prefixes: number, suffixes: number, lean?: string[], family?: PotionFamily): Mod[] {
    const taken = new Set<string>();
    const mods: Mod[] = [];
    for (const [kind, n] of [
        ["prefix", prefixes],
        ["suffix", suffixes],
    ] as const) {
        for (let i = 0; i < n; i++) {
            const affix = pickAffix(rng, affixesFor(slot, kind, taken, family, level), lean);
            if (!affix) {
                break;
            }
            taken.add(affix.id);
            mods.push(rollMod(rng, affix, slot, level));
        }
    }
    return mods;
}

// A rare's mods: up to three of each kind, a kind at random each time while both have any left,
// so a slot with few of one kind still gets its count from the other
export function rollRareMods(rng: Rng, slot: Slot, level: number, count: number, lean?: string[]): Mod[] {
    const taken = new Set<string>();
    const mods: Mod[] = [];
    const made = { prefix: 0, suffix: 0 };
    while (mods.length < count) {
        const open = (["prefix", "suffix"] as const).filter((kind) => made[kind] < 3 && affixesFor(slot, kind, taken, undefined, level).length > 0);
        if (open.length === 0) {
            break;
        }
        const kind = open.length === 1 ? open[0] : rng.chance(0.5) ? "prefix" : "suffix";
        const affix = pickAffix(rng, affixesFor(slot, kind, taken, undefined, level), lean)!;
        taken.add(affix.id);
        made[kind]++;
        mods.push(rollMod(rng, affix, slot, level));
    }
    return mods;
}

// An imbue's mods (Reldo's quest, content/quests.ts): a rare's, each at the best tier the level
// allows short of the rift-touched, or that if it rolled it
export function imbueMods(rng: Rng, slot: Slot, level: number): Mod[] {
    return rollRareMods(rng, slot, level, rareModCount(rng, level, slot)).map((m) => {
        const affix = AFFIX_BY_ID.get(m.affix)!;
        let best = m.tier;
        affix.tiers.forEach((t, i) => {
            if (t.level <= level && t.level < RIFT_TIER.level && i > best) {
                best = i;
            }
        });
        return best === m.tier ? m : { affix: m.affix, tier: best, values: rollValues(rng, affix, best, slot) };
    });
}

// A magic item's mods: a prefix, a suffix, or one of each
export function rollMagicMods(rng: Rng, slot: Slot, level: number, lean?: string[], family?: PotionFamily): Mod[] {
    const both = rng.chance(0.5);
    const prefix = both || rng.chance(0.5);
    return rollMods(rng, slot, level, prefix ? 1 : 0, both || !prefix ? 1 : 0, lean, family);
}

// How many mods a rare has: three to five, or to six from level 20; a talisman two to four
export function rareModCount(rng: Rng, level: number, slot?: Slot): number {
    if (slot === "talisman") {
        return 2 + rng.int(3);
    }
    return 3 + rng.int(level >= 20 ? 4 : 3);
}

// The most affixes a rare talisman has
export const TALISMAN_MOST_MODS = 4;

export function rareName(rng: Rng, slot: Slot): string {
    return `${rng.pick(RARE_FIRST)} ${rng.pick(RARE_SECOND[slot])}`;
}

export function rollItem(rng: Rng, uid: number, options: RollOptions): Item {
    const level = Math.max(1, options.level);
    let rarity = rollRarity(rng, options.rarity, options.atLeast);
    const order: Rarity[] = ["normal", "magic", "rare", "unique"];
    if (options.atMost && order.indexOf(rarity) > order.indexOf(options.atMost)) {
        rarity = options.atMost;
    }
    if (rarity === "unique") {
        // The Heart of the Rift's own are its alone (rollPinnacleUnique), and talismans and
        // potions drop on their own (rollTalisman, rollPotion)
        // nor are the set pieces that come from somewhere of their own (the Barrows, the TzHaar)
        const open = UNIQUES.filter((u) => !u.pinnacle && !u.source && u.level <= level + 4 && (options.slot ? u.slot === options.slot : u.slot !== "talisman" && u.slot !== "potion"));
        if (open.length > 0) {
            const weights = open.map((u) => (u.classes && options.cls && !u.classes.includes(options.cls) ? 0.4 : 1));
            const u = open[Math.max(0, rng.weightedIndex(weights))];
            return freshUnique({ uid, base: u.id, rarity: "unique", level, mods: [], sockets: rollSockets(rng, u.slot, level, u.classes, u.weapon) });
        }
        rarity = "rare";
    }
    const base = pickBase(rng, level, options.cls, options.slot, options.bases, options.elite === true && level > ELITE_FROM);
    let mods: Mod[] = [];
    let name: string | undefined;
    // A potion's never rare: magic at most, as Path of Exile's flasks are
    if (base.potion && rarity === "rare") {
        rarity = "magic";
    }
    if (rarity === "magic") {
        mods = rollMagicMods(rng, base.slot, level, base.lean, base.potion?.family);
    } else if (rarity === "rare") {
        mods = rollRareMods(rng, base.slot, level, rareModCount(rng, level, base.slot), base.lean);
        name = rareName(rng, base.slot);
    }
    return { uid, base: base.id, rarity, level, mods, rareName: name, sockets: rollSockets(rng, base.slot, level, base.classes, base.weapon) };
}

// A talisman for the passive tree's sockets (talismans.ts): magic or rare more often than gear is,
// as there's less of it, and now and then one of the unique ones
export function rollTalisman(rng: Rng, uid: number, level: number, rarity: number): Item {
    const more = 1 + rarity;
    const roll = rng.next();
    const uniques = UNIQUES.filter((u) => u.slot === "talisman" && u.level <= level + 4);
    if (uniques.length > 0 && roll < 0.04 * more) {
        const u = rng.pick(uniques);
        return { uid, base: u.id, rarity: "unique", level, mods: [] };
    }
    const atLeast: Rarity = roll < 0.15 * more ? "rare" : roll < 0.7 ? "magic" : "normal";
    return rollItem(rng, uid, { level, rarity: 0, slot: "talisman", atLeast, atMost: atLeast });
}

// One of a pinnacle's own uniques (and what else it drops, as the Sire does the whip), those for
// the hero's class likelier, and the Heart's potions (the Tombs of Amascut's) less likely than its
// gear
export function rollPinnacleUnique(rng: Rng, uid: number, level: number, cls?: ClassId, pinnacle: PinnacleId = "heart"): Item {
    const also = PINNACLES[pinnacle].alsoDrops ?? [];
    const open = UNIQUES.filter((u) => u.pinnacle === pinnacle || also.includes(u.id));
    const weights = open.map((u) => (u.potion ? 0.5 : u.classes && cls && !u.classes.includes(cls) ? 0.25 : 1));
    const u = open[Math.max(0, rng.weightedIndex(weights))];
    const item: Item = { uid, base: u.id, rarity: "unique", level, mods: [], sockets: rollSockets(rng, u.slot, level, u.classes, u.weapon) };
    if (u.potion) {
        item.charges = u.potion.doses;
    }
    return freshUnique(item);
}

// A piece of one of these sets (the Barrows brothers' slain, or one brother's), unidentified
export function rollSetPiece(rng: Rng, uid: number, level: number, sets: SetId[]): Item {
    const set = SETS[rng.pick(sets)];
    const u = UNIQUE_BY_ID.get(rng.pick(set.pieces))!;
    return freshUnique({ uid, base: u.id, rarity: "unique", level, mods: [], sockets: rollSockets(rng, u.slot, level, u.classes, u.weapon) });
}

// A potion as it drops: the grades and kinds open at the level, normal or magic, and now and then a
// unique one; its doses full
export function rollPotion(rng: Rng, uid: number, level: number, rarity: number): Item {
    const more = 1 + rarity;
    const uniques = UNIQUES.filter((u) => u.potion && !u.pinnacle && u.level <= level + 4);
    if (uniques.length > 0 && rng.chance(0.03 * more)) {
        const u = rng.pick(uniques);
        return { uid, base: u.id, rarity: "unique", level, mods: [], charges: u.potion!.doses };
    }
    const atLeast: Rarity = rng.chance(Math.min(0.9, 0.4 * more)) ? "magic" : "normal";
    const item = rollItem(rng, uid, { level, rarity: 0, slot: "potion", atLeast, atMost: atLeast });
    item.sockets = undefined;
    item.charges = mostDoses(item);
    return item;
}

// ---- Sockets ----

// How many sockets a slot can have: a bow, in both hands, as many as a body
export function socketsFor(slot: Slot, weapon?: WeaponDef): number {
    return slot === "weapon" && weapon?.kind === "bow" ? 6 : MAX_SOCKETS[slot];
}

// An item's sockets as it drops: more of them the higher its level can go, mostly of its class's
// colour, and links between them now and then, fewer the longer the chain
export function rollSockets(rng: Rng, slot: Slot, level: number, classes?: ClassId[], weapon?: WeaponDef): Socket[] | undefined {
    const most = mostSockets(slot, level, weapon);
    if (most <= 0) {
        return undefined;
    }
    let count = 1;
    for (let i = 1; i < most; i++) {
        if (rng.chance(0.55)) {
            count++;
        }
    }
    const sockets: Socket[] = [];
    for (let i = 0; i < count; i++) {
        sockets.push({ color: rollSocketColor(rng, classes), linked: false });
    }
    rollLinks(rng, sockets);
    return sockets;
}

// The most sockets an item of a slot and level can have
export function mostSockets(slot: Slot, level: number, weapon?: WeaponDef): number {
    return Math.min(socketsFor(slot, weapon), level < 10 ? 3 : level < 20 ? 4 : level < 30 ? 5 : 6);
}

// A socket's colour: more likely one of the classes' it's made for (a hybrid's own first)
export function rollSocketColor(rng: Rng, classes?: ClassId[]): SocketColor {
    if (classes && classes.length > 0 && rng.chance(0.6)) {
        const colors = CLASS_COLORS[rng.pick(classes)];
        return colors.length > 1 && rng.chance(0.35) ? colors[1] : colors[0];
    }
    return rng.pick(GEM_COLORS);
}

// Links between sockets, fewer the longer the chain
export function rollLinks(rng: Rng, sockets: Socket[]): void {
    sockets.forEach((s, i) => {
        s.linked = i < sockets.length - 1 && rng.chance(Math.max(0.2, 0.62 - i * 0.08));
    });
}

const GEM_COLORS: SocketColor[] = ["red", "green", "blue"];

// A fresh normal item of a base, for the hero's first gear
export function plainItem(uid: number, baseId: string): Item {
    return { uid, base: baseId, rarity: "normal", level: 1, mods: [] };
}

// What the trader gives for it
export function sellValue(item: Item): number {
    if (item.base === RIFTSTONE_BASE) {
        const worth = RIFTSTONE.worth[item.rarity as "normal" | "magic" | "rare"] ?? RIFTSTONE.worth.normal;
        return Math.round(worth * (1 + item.level * 0.1));
    }
    if (SHARD_BY_BASE.has(item.base)) {
        return 400;
    }
    if (item.rarity === "gem") {
        const gem = gemOf(item);
        // A forged gem's worth more: there's no other like it
        const forged = item.forge ? 3 + item.forge.traits.length : 1;
        return Math.max(2, Math.round((4 + (gem?.level ?? 1) * 1.5) * (1 + (item.level - 1) * 0.35) * forged));
    }
    const mult = { normal: 1, magic: 3, rare: 8, unique: 25 }[item.rarity];
    // A talisman's worth more for there being less of it, a potion less
    const slot = itemInfo(item).slot;
    const kind = slot === "talisman" ? 2 : slot === "potion" ? 0.6 : 1;
    return Math.max(1, Math.round((2 + item.level * 0.8) * mult * kind));
}

// What a shop asks for it: a good deal more than it pays
export function buyValue(item: Item, markup: number): number {
    return sellValue(item) * markup;
}

// What the trader asks for a mystery item at the hero's level
// It grows with the square of the level, faster than gold does, so it stays the sink that
// Diablo's gambling is: about one a rift's gold buys, at any depth
export function gambleCost(level: number): number {
    return Math.round(50 + level * level * 3);
}

export function itemStatTotal(item: Item, stat: StatKey): number {
    const info = itemInfo(item);
    let total = 0;
    for (const line of [...info.implicit, ...info.stats]) {
        if (line.stat === stat) {
            total += line.value;
        }
    }
    return total;
}
