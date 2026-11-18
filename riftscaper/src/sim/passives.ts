// The hero's passive tree: which nodes they've taken, how many points they have to take more,
// and taking and giving back. A node can be taken when it's linked to one already taken (the
// class's start counts as taken); a far one is reached by the shortest way to it, every node on
// the way taken with it. Giving one back leaves the rest still joined to the start, or isn't
// allowed, and costs gold. A socket taken holds a talisman (talismans.ts), whose stats count as
// the tree's, and a unique one changes the nodes in its radius.
import { QUESTS } from "../content/quests";
import type { SkillTraits, TraitId } from "../content/forge";
import type { SkillTag } from "../content/gems";
import { CATALYTIC_MORE, LAW_EACH, UNIQUE_BY_ID } from "../content/items";
import type { ClassId, StatKey, StatLine, TalismanPower, UniquePower } from "../content/items";
import { KeystoneId, PASSIVES, PassiveNode, START_NODE } from "../content/passives";
import { LADDER_DEPTH } from "../content/rules";
import type { Hero } from "./hero";
import { Item, itemInfo } from "./loot";

// The tree as it is now: a save from an older one has its points back for nothing once (the
// tree's free reset), and a hero made now is of it already
export const TREE_VERSION = 1;

// A point every level after the first, to 99, and one for every rift whose guardian has fallen:
// on the ladder the levels past 60 come about a depth apiece (content/rules.ts), so pushing deeper
// is a power curve of two points a depth against the monsters' 6%, with the rift-touched tier, elite
// bases, rolls and runes the rest. The ladder gave a second point a depth before the levels went
// past 60, and a hero who had them keeps them (ladderPoints, set when such a save is read).
export function passivePoints(hero: Hero): number {
    const cleared = Math.max(0, hero.maxDepth - 1);
    // And Reldo's quests' (content/quests.ts)
    const quests = (hero.quests?.claimed ?? []).filter((id) => QUESTS[id].reward.kind === "point").length;
    return Math.max(0, hero.level - 1) + cleared + (hero.ladderPoints ?? 0) + quests;
}

// The ladder's second points a depth a hero saved before the levels to 99 had earned
export function oldLadderPoints(maxDepth: number): number {
    return Math.max(0, maxDepth - 1 - LADDER_DEPTH);
}

export function pointsLeft(hero: Hero): number {
    return passivePoints(hero) - hero.passives.length;
}

// What giving a point back costs
export function refundCost(hero: Hero): number {
    return Math.round(15 + hero.level * 4);
}

// Taken, with the start
export function takenSet(hero: Hero): Set<number> {
    return new Set([START_NODE[hero.cls], ...hero.passives]);
}

// ---- Talismans in the tree ----

// What a unique talisman in a socket does to the nodes round it
export type Field = { power: TalismanPower; x: number; y: number; radius: number };

// The unique talismans in sockets taken, and what each does over its radius
export function fields(passives: Iterable<number>, talismans: Hero["talismans"] | undefined): Field[] {
    const out: Field[] = [];
    if (!talismans) {
        return out;
    }
    for (const id of passives) {
        const item = talismans[id];
        const u = item?.rarity === "unique" ? UNIQUE_BY_ID.get(item.base) : undefined;
        const socket = PASSIVES[id];
        if (u?.talisman && socket?.kind === "socket") {
            out.push({ power: u.talisman.power, x: socket.x, y: socket.y, radius: u.talisman.radius ?? 0 });
        }
    }
    return out;
}

export function inField(f: Field, node: PassiveNode): boolean {
    return Math.hypot(node.x - f.x, node.y - f.y) <= f.radius;
}

// The nodes in a radius of a socket, once worked out
const near = new Map<string, number[]>();
function nodesNear(socket: number, radius: number): number[] {
    const key = `${socket}:${radius}`;
    let ids = near.get(key);
    if (!ids) {
        const s = PASSIVES[socket];
        ids = PASSIVES.filter((n) => n.id !== socket && Math.hypot(n.x - s.x, n.y - s.y) <= radius).map((n) => n.id);
        near.set(key, ids);
    }
    return ids;
}

// A socket with an Elemental talisman in it (the omni power), and its radius
export type Omni = { socket: number; radius: number };

export function omniOf(talismans: Hero["talismans"] | undefined): Omni[] {
    const out: Omni[] = [];
    for (const [key, item] of Object.entries(talismans ?? {})) {
        const u = item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base) : undefined;
        if (u?.talisman?.power === "omni" && PASSIVES[Number(key)]?.kind === "socket") {
            out.push({ socket: Number(key), radius: u.talisman.radius ?? 0 });
        }
    }
    return out;
}

// Links the tree doesn't draw: from each of those sockets that's taken to every node in its
// radius, both ways, so those can be taken without the way to them
export type ExtraLinks = Map<number, number[]>;

export function extraLinks(omni: Omni[], taken: Set<number>): ExtraLinks {
    const links: ExtraLinks = new Map();
    const add = (a: number, b: number) => {
        const list = links.get(a);
        if (list) {
            list.push(b);
        } else {
            links.set(a, [b]);
        }
    };
    for (const o of omni) {
        if (taken.has(o.socket)) {
            for (const other of nodesNear(o.socket, o.radius)) {
                add(o.socket, other);
                add(other, o.socket);
            }
        }
    }
    return links;
}

// A node's links, the tree's and any of those
function linksOf(id: number, extra?: ExtraLinks): number[] {
    const more = extra?.get(id);
    return more ? [...PASSIVES[id].links, ...more] : PASSIVES[id].links;
}

// Whether a node can be walked through, or taken, by this class: never another class's start
function open(cls: ClassId, id: number): boolean {
    const node = PASSIVES[id];
    return node !== undefined && (node.kind !== "start" || node.cls === cls);
}

// The nodes to take to reach this one, nearest first and it last, by the fewest; undefined if it's
// taken already or can't be reached
export function pathTo(cls: ClassId, taken: Set<number>, target: number, extra?: ExtraLinks): number[] | undefined {
    if (taken.has(target) || !open(cls, target)) {
        return undefined;
    }
    const from = new Map<number, number>();
    const queue: number[] = [];
    for (const id of taken) {
        from.set(id, -1);
        queue.push(id);
    }
    for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        for (const next of linksOf(id, extra)) {
            if (from.has(next) || !open(cls, next)) {
                continue;
            }
            from.set(next, id);
            if (next === target) {
                const path: number[] = [];
                for (let at = next; !taken.has(at); at = from.get(at)!) {
                    path.push(at);
                }
                return path.reverse();
            }
            queue.push(next);
        }
    }
    return undefined;
}

// Takes a node, and the way to it: why not, if it can't be
export function allocate(hero: Hero, target: number): string | undefined {
    const taken = takenSet(hero);
    const path = pathTo(hero.cls, taken, target, extraLinks(omniOf(hero.talismans), taken));
    if (!path) {
        return "You can't reach that from what you've taken.";
    }
    if (path.length > pointsLeft(hero)) {
        const left = pointsLeft(hero);
        return left <= 0 ? "You have no passive points left." : `That needs ${path.length} points, and you have ${left}.`;
    }
    hero.passives.push(...path);
    return undefined;
}

// Whether every node taken joins up with the start, by the tree's links and the talismans'
export function joined(cls: ClassId, passives: number[], omni: Omni[] = []): boolean {
    const start = START_NODE[cls];
    const taken = new Set(passives);
    const extra = extraLinks(omni, taken);
    const seen = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
        for (const next of linksOf(queue[i], extra)) {
            if (taken.has(next) && !seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return seen.size === taken.size + 1;
}

// Whether a node taken can be given back: everything else taken still joins up with the start
export function refundable(cls: ClassId, passives: number[], without: number, omni: Omni[] = []): boolean {
    return passives.includes(without) && joined(cls, passives.filter((id) => id !== without), omni);
}

export function canRefund(hero: Hero, id: number): boolean {
    return refundable(hero.cls, hero.passives, id, omniOf(hero.talismans));
}

// Gives a node back, for gold: why not, if it can't be. A talisman in a socket given back stays
// in it, doing nothing till the socket's taken again.
export function refund(hero: Hero, id: number): string | undefined {
    if (!hero.passives.includes(id)) {
        return undefined;
    }
    if (!canRefund(hero, id)) {
        return "Other passives you've taken hang from that one. Give them back first.";
    }
    const cost = refundCost(hero);
    if (hero.gold < cost) {
        return `Giving a point back costs ${cost} gold.`;
    }
    hero.gold -= cost;
    hero.passives = hero.passives.filter((n) => n !== id);
    return undefined;
}

// Whether the tree's changed since this hero's points were spent, and so their reset is free
export function freeReset(hero: Hero): boolean {
    return hero.treeVersion < TREE_VERSION && hero.passives.length > 0;
}

// Every point back at once: half the price of giving them back one by one, or nothing once if
// the tree's changed since they were spent
export function resetCost(hero: Hero): number {
    return freeReset(hero) ? 0 : Math.round((hero.passives.length * refundCost(hero)) / 2);
}

export function resetTree(hero: Hero): string | undefined {
    if (hero.passives.length === 0) {
        hero.treeVersion = TREE_VERSION;
        return undefined;
    }
    const cost = resetCost(hero);
    if (hero.gold < cost) {
        return `Starting the tree over costs ${cost} gold.`;
    }
    hero.gold -= cost;
    hero.passives = [];
    hero.treeVersion = TREE_VERSION;
    return undefined;
}

// What's taken, made sound: nodes the tree no longer has, or not joined to the start, dropped,
// and no more than the hero has points for (a save from before the tree changed)
export function soundPassives(hero: Hero): void {
    const start = START_NODE[hero.cls];
    const wanted = new Set(hero.passives.filter((id) => PASSIVES[id] && id !== start && open(hero.cls, id)));
    const extra = extraLinks(omniOf(hero.talismans), wanted);
    const kept: number[] = [];
    const seen = new Set([start]);
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
        for (const next of linksOf(queue[i], extra)) {
            if (wanted.has(next) && !seen.has(next)) {
                seen.add(next);
                queue.push(next);
                kept.push(next);
            }
        }
    }
    hero.passives = kept.slice(0, passivePoints(hero));
}

// ---- What the tree gives ----

export type PassiveGains = {
    stats: StatLine[];
    keystones: Set<KeystoneId>;
    // Notables' traits, the best of each: on every skill of the kinds each suits, or only on
    // those with the tag
    traits: SkillTraits;
    tagTraits: Partial<Record<SkillTag, SkillTraits>>;
    powers: Set<UniquePower>;
    // The Soul talisman's (items.ts SOUL)
    soul: boolean;
};

const CONVERT: Partial<Record<TalismanPower, Partial<Record<StatKey, StatKey>>>> = {
    bloodConversion: { mana: "life", manaPct: "lifePct", manaRegen: "lifeRegen", manaOnKill: "lifeOnKill" },
    deathConversion: { meleeDamagePct: "thrallDamagePct", projectileDamagePct: "thrallDamagePct", spellDamagePct: "thrallDamagePct" },
};

// A node's stats, as the unique talismans whose radius it's in make them
function fieldStats(node: PassiveNode, over: Field[]): StatLine[] | undefined {
    let stats = node.stats;
    for (const f of over) {
        if (!inField(f, node)) {
            continue;
        }
        if (f.power === "catalytic") {
            if (node.kind === "notable") {
                return undefined;
            }
            if (node.kind === "small") {
                stats = stats.map((l) => ({ ...l, value: Math.round(l.value * CATALYTIC_MORE * 100) / 100 }));
            }
        } else if (f.power === "lawConversion") {
            if (node.kind === "attribute") {
                stats = [
                    { stat: "str", value: LAW_EACH },
                    { stat: "dex", value: LAW_EACH },
                    { stat: "int", value: LAW_EACH },
                ];
            }
        } else {
            const to = CONVERT[f.power];
            if (to) {
                stats = stats.map((l) => (to[l.stat] ? { ...l, stat: to[l.stat]! } : l));
            }
        }
    }
    return stats;
}

function addTraits(into: SkillTraits, from: SkillTraits): void {
    for (const [id, v] of Object.entries(from) as [TraitId, number][]) {
        into[id] = Math.max(into[id] ?? 0, v);
    }
}

// The stats from everything taken, the talismans in its sockets and the notables enchanted on
// rings and amulets worn (enchant.ts), and the keystones, traits and powers
export function passiveStats(hero: Hero): PassiveGains {
    const gains: PassiveGains = { stats: [], keystones: new Set(), traits: {}, tagTraits: {}, powers: new Set(), soul: false };
    const over = fields(hero.passives, hero.talismans);
    const give = (node: PassiveNode, stats: StatLine[] | undefined) => {
        if (!stats) {
            // A notable a Catalytic talisman's radius takes everything from
            return;
        }
        gains.stats.push(...stats);
        if (node.keystone) {
            gains.keystones.add(node.keystone);
        }
        if (node.traits) {
            if (node.traitTag) {
                addTraits((gains.tagTraits[node.traitTag] ??= {}), node.traits);
            } else {
                addTraits(gains.traits, node.traits);
            }
        }
        if (node.power) {
            gains.powers.add(node.power);
        }
    };
    for (const id of hero.passives) {
        const node = PASSIVES[id];
        if (!node) {
            continue;
        }
        give(node, over.length > 0 ? fieldStats(node, over) : node.stats);
        const talisman = node.kind === "socket" ? hero.talismans?.[id] : undefined;
        if (talisman) {
            const info = itemInfo(talisman);
            gains.stats.push(...info.implicit, ...info.stats);
            if (UNIQUE_BY_ID.get(talisman.base)?.talisman?.power === "soul" && talisman.rarity === "unique") {
                gains.soul = true;
            }
        }
    }
    for (const slot of ["ring", "amulet"] as const) {
        const enchant = hero.equipment[slot]?.enchant;
        const node = enchant !== undefined ? PASSIVES[enchant] : undefined;
        if (node && node.kind === "notable" && !node.wing) {
            give(node, node.stats);
        }
    }
    return gains;
}

// The talisman in a socket, if the socket's taken and there's one in it
export function talismanAt(hero: Hero, socket: number): Item | undefined {
    return hero.passives.includes(socket) ? hero.talismans?.[socket] : undefined;
}
