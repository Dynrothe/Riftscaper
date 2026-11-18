// Gems in the hero's gear: a gem is an item (rarity "gem") that goes in a socket of its colour on
// something worn. A skill gem there puts its skill within reach of the skill bar; a support gem
// linked to it makes it better. Gems in worn gear learn from every kill, and level up as far as the
// hero's level lets them. The class's own gems come as the hero levels (GEM_REWARDS), into a socket
// where one's free and onto the bar, or into the pack.
import type { Rng } from "../../../engine/core/Rng";
import { CLASSES, CLASS_IDS, SKILL_SLOTS } from "../content/classes";
import { ARCHETYPES, Archetype, forgedGem, rollRecipe } from "../content/forge";
import { CLASS_COLORS, GEMS, GEM_BY_ID, GEM_REWARDS, GemColor, GemDef, MAX_GEM_LEVEL, SkillTag } from "../content/gems";
import type { ClassId, Slot } from "../content/items";
import { SLOTS } from "../content/items";
import { PEAK_LEVEL, campaignXpToNext } from "../content/rules";
import type { Hero } from "./hero";
import type { Item, Socket } from "./loot";
import { FORGED, gemOf, imbueMods, itemInfo, mostSockets, rareName, rollLinks, rollSocketColor } from "./loot";

// A skill bar button with the weapon's plain attack on it, rather than a gem's skill
export const BASIC = -1;

export function gemDef(item: Item | undefined): GemDef | undefined {
    return item && item.rarity === "gem" ? gemOf(item) : undefined;
}

export function makeGem(uid: number, id: string, level = 1): Item {
    if (!GEM_BY_ID.has(id)) {
        throw new Error(`No gem ${id}`);
    }
    return { uid, base: id, rarity: "gem", level, mods: [], xp: 0 };
}

// The hero's level a gem needs to be used at a level
export function gemRequirement(def: GemDef, level: number): number {
    return Math.min(PEAK_LEVEL, def.level + Math.round((level - 1) * 2.5));
}

// Experience from a level to the next: about what the hero needs for the levels between
export function gemXpToNext(def: GemDef, level: number): number {
    return Math.round(campaignXpToNext(gemRequirement(def, level)) * 2.2);
}

// A kill's experience: a gem levels as far as the hero's level allows, and keeps the rest till
// they catch up. Whether it levelled.
export function gainGemXp(gem: Item, xp: number, heroLevel: number): boolean {
    const def = gemDef(gem);
    if (!def || gem.level >= MAX_GEM_LEVEL) {
        return false;
    }
    gem.xp = (gem.xp ?? 0) + xp;
    let levelled = false;
    while (gem.level < MAX_GEM_LEVEL) {
        const need = gemXpToNext(def, gem.level);
        if (gem.xp < need) {
            break;
        }
        if (gemRequirement(def, gem.level + 1) > heroLevel) {
            gem.xp = need;
            break;
        }
        gem.xp -= need;
        gem.level++;
        levelled = true;
    }
    if (gem.level >= MAX_GEM_LEVEL) {
        gem.xp = 0;
    }
    return levelled;
}

// ---- Sockets ----

export function fits(socket: Socket, gem: Item): boolean {
    const def = gemDef(gem);
    return !!def && (socket.color === "white" || socket.color === def.color);
}

// Linked sockets in runs, as indexes
export function linkGroups(sockets: Socket[] | undefined): number[][] {
    const groups: number[][] = [];
    if (!sockets) {
        return groups;
    }
    let group: number[] = [];
    sockets.forEach((socket, i) => {
        group.push(i);
        if (!socket.linked || i === sockets.length - 1) {
            groups.push(group);
            group = [];
        }
    });
    return groups;
}

export function groupOf(sockets: Socket[], index: number): number[] {
    return linkGroups(sockets).find((g) => g.includes(index)) ?? [index];
}

// A gem in something worn: where it is, and those linked with it
export type WornGem = { slot: Slot; item: Item; index: number; gem: Item; def: GemDef; linked: Item[] };

export function wornGems(hero: Hero): WornGem[] {
    const out: WornGem[] = [];
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        const sockets = item?.sockets;
        if (!item || !sockets) {
            continue;
        }
        for (const group of linkGroups(sockets)) {
            const gems = group.map((i) => sockets[i].gem).filter((g): g is Item => !!g);
            for (const i of group) {
                const gem = sockets[i].gem;
                const def = gemDef(gem);
                if (gem && def) {
                    out.push({ slot, item, index: i, gem, def, linked: gems.filter((g) => g !== gem) });
                }
            }
        }
    }
    return out;
}

export function findWornGem(hero: Hero, uid: number): WornGem | undefined {
    return wornGems(hero).find((w) => w.gem.uid === uid);
}

// Every gem the hero has, worn or in the pack or in the sockets of what's in the pack
export function allGems(hero: Hero): Item[] {
    const gems: Item[] = [];
    const inItem = (item: Item | null | undefined) => {
        if (!item) {
            return;
        }
        if (item.rarity === "gem") {
            gems.push(item);
        }
        item.sockets?.forEach((s) => s.gem && gems.push(s.gem));
    };
    SLOTS.forEach((slot) => inItem(hero.equipment[slot]));
    hero.inventory.forEach(inItem);
    return gems;
}

// Whether a support would make a skill better: the skill has one of the tags it needs, and none it
// won't work with
export function supports(support: GemDef, skill: GemDef, extraTags: SkillTag[] = []): boolean {
    const s = support.support;
    if (!s || !skill.skill) {
        return false;
    }
    const tags = new Set([...skill.tags, ...extraTags]);
    if (s.needsCooldown && skill.skill.cooldown <= 0) {
        return false;
    }
    if (s.excludes?.some((t) => tags.has(t))) {
        return false;
    }
    return !s.needsAny || s.needsAny.some((t) => tags.has(t));
}

// ---- Who can use what ----

// A skill gem is its class's own: it's used only by a class whose colours it's of, so a ranger's
// bow skills are the ranger's (and the rogue's), a mage's spells the mage's (and the paladin's and
// the necromancer's, who are half of Intelligence). Supports go with any class's skills.
export function classCanUse(cls: ClassId, def: GemDef): boolean {
    return !def.skill || CLASS_COLORS[cls].includes(def.color);
}

// The classes a skill gem is for, by name: "Ranger, Rogue or Necromancer"
export function gemClasses(def: GemDef): string {
    const names = CLASS_IDS.filter((cls) => classCanUse(cls, def)).map((cls) => CLASSES[cls].name);
    return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

// Why a class can't use a gem, if it can't
export function classLock(cls: ClassId, def: GemDef): string | undefined {
    return classCanUse(cls, def) ? undefined : `Only a ${gemClasses(def)} can use ${def.name}.`;
}

// Puts a gem from the pack into a socket of something worn, swapping out what was there
export function socketGem(hero: Hero, invIndex: number, slot: Slot, socketIndex: number): string | undefined {
    const gem = hero.inventory[invIndex];
    const def = gemDef(gem ?? undefined);
    if (!gem || !def) {
        return "That's not a gem.";
    }
    const item = hero.equipment[slot];
    const socket = item?.sockets?.[socketIndex];
    if (!socket) {
        return "There's no socket there.";
    }
    const locked = classLock(hero.cls, def);
    if (locked) {
        return locked;
    }
    if (!fits(socket, gem)) {
        return `A ${def.color} gem needs a ${def.color} socket.`;
    }
    const old = socket.gem;
    socket.gem = gem;
    hero.inventory[invIndex] = old ?? null;
    bindNew(hero, gem);
    cleanBar(hero);
    return undefined;
}

// Takes a gem out of something worn, into the pack
export function unsocketGem(hero: Hero, slot: Slot, socketIndex: number): string | undefined {
    const socket = hero.equipment[slot]?.sockets?.[socketIndex];
    if (!socket?.gem) {
        return undefined;
    }
    const free = hero.inventory.indexOf(null);
    if (free < 0) {
        return "Your pack is full.";
    }
    hero.inventory[free] = socket.gem;
    socket.gem = undefined;
    cleanBar(hero);
    return undefined;
}

// Every gem in an item out into the pack: how many, or why not
export function emptySockets(hero: Hero, item: Item): number | string {
    const gems = (item.sockets ?? []).filter((s) => s.gem);
    if (gems.length === 0) {
        return 0;
    }
    const free = hero.inventory.filter((x) => x === null).length;
    if (free < gems.length) {
        return "There's no room in your pack for its gems.";
    }
    for (const s of gems) {
        hero.inventory[hero.inventory.indexOf(null)] = s.gem!;
        s.gem = undefined;
    }
    cleanBar(hero);
    return gems.length;
}

// The best free socket in what's worn for a gem. A support: beside a skill it supports. A skill:
// in a group with nothing in it yet, so it has room for supports, or beside supports that would
// support it. Otherwise the first that fits.
export function bestSocket(hero: Hero, gem: Item): { slot: Slot; index: number } | undefined {
    const def = gemDef(gem);
    if (!def) {
        return undefined;
    }
    let best: { slot: Slot; index: number } | undefined;
    let bestScore = -1;
    for (const slot of SLOTS) {
        const sockets = hero.equipment[slot]?.sockets;
        if (!sockets) {
            continue;
        }
        for (const group of linkGroups(sockets)) {
            const free = group.find((i) => !sockets[i].gem && fits(sockets[i], gem));
            if (free === undefined) {
                continue;
            }
            const inGroup = group.map((i) => gemDef(sockets[i].gem)).filter((g): g is GemDef => !!g);
            let score = 0;
            if (def.support) {
                score = inGroup.some((g) => supports(def, g)) ? 2 : 0;
            } else if (inGroup.length === 0) {
                score = 2;
            } else if (!inGroup.some((g) => g.skill) && inGroup.some((g) => supports(g, def))) {
                score = 3;
            }
            if (score > bestScore) {
                bestScore = score;
                best = { slot, index: free };
            }
        }
    }
    return best;
}

// A gem from the pack into the best free socket for it
export function autoSocket(hero: Hero, invIndex: number): string | undefined {
    const gem = hero.inventory[invIndex];
    const def = gemDef(gem ?? undefined);
    if (!gem || !def) {
        return "That's not a gem.";
    }
    const locked = classLock(hero.cls, def);
    if (locked) {
        return locked;
    }
    const at = bestSocket(hero, gem);
    if (!at) {
        return `There's no free ${def.color} socket in what you're wearing.`;
    }
    return socketGem(hero, invIndex, at.slot, at.index);
}

// Gems out of what's coming off and into what's going on: into the same socket where it's free and
// fits, else any that is. What doesn't fit stays where it was. How many moved.
export function moveGems(from: Item, to: Item): number {
    const out = from.sockets;
    const into = to.sockets;
    if (!out || !into) {
        return 0;
    }
    let moved = 0;
    const place = (gem: Item, i: number): boolean => {
        const target = into[i] && !into[i].gem && fits(into[i], gem) ? i : into.findIndex((s) => !s.gem && fits(s, gem));
        if (target < 0) {
            return false;
        }
        into[target].gem = gem;
        return true;
    };
    out.forEach((socket, i) => {
        if (socket.gem && place(socket.gem, i)) {
            socket.gem = undefined;
            moved++;
        }
    });
    return moved;
}

// ---- The gem trader's socket work ----

// And an imbue, which only Reldo's quest buys (content/quests.ts): a normal item worn made rare
export type SocketWork = "colours" | "links" | "socket" | "imbue";

export const SOCKET_WORK: Record<SocketWork, { name: string; blurb: string }> = {
    colours: { name: "Recolour", blurb: "Every socket a new colour, at random. Gems that no longer fit come out into your pack." },
    links: { name: "Relink", blurb: "The links between its sockets made again, at random." },
    socket: { name: "Add a socket", blurb: "One more socket, unlinked, up to as many as its slot and item level allow." },
    imbue: { name: "Imbue", blurb: "Reldo's favour: a normal item made rare, its affixes at the best tiers your level allows." },
};

// What a piece of socket work on an item costs, or undefined if it can't be done to it: nothing,
// for a socket or an imbue Reldo's quests have left the hero (sim/quests.ts)
export function socketWorkCost(item: Item, work: SocketWork, hero?: Hero): number | undefined {
    if (work === "imbue") {
        return (hero?.quests?.imbues ?? 0) > 0 && item.rarity === "normal" && !item.runeword && !item.unid ? 0 : undefined;
    }
    const cost = workCost(item, work);
    return cost !== undefined && work === "socket" && (hero?.quests?.sockets ?? 0) > 0 ? 0 : cost;
}

function workCost(item: Item, work: Exclude<SocketWork, "imbue">): number | undefined {
    const info = itemInfo(item);
    const count = item.sockets?.length ?? 0;
    const level = item.level;
    // Dearer the better the item, as a deep rift's gold is more: a sink, as Path of Exile's orbs
    // of colour and fusing are
    const deep = 1 + level / 20;
    switch (work) {
        case "colours":
            return count > 0 ? Math.round((10 + level * 2.5) * deep) : undefined;
        case "links":
            return count > 1 ? Math.round((16 + level * 3.5) * deep) : undefined;
        case "socket":
            return count < mostSockets(info.slot, level, info.weapon) ? Math.round((50 + level * 6) * Math.max(1, count) * deep) : undefined;
    }
}

// Does a piece of socket work on something worn, for gold: why not, if it can't be
export function socketWork(hero: Hero, rng: Rng, slot: Slot, work: SocketWork): string | undefined {
    const item = hero.equipment[slot];
    if (!item) {
        return "You're not wearing anything there.";
    }
    const cost = socketWorkCost(item, work, hero);
    if (cost === undefined) {
        return work === "imbue"
            ? "Only a normal item can be imbued, and only with Reldo's favour."
            : work === "socket"
              ? "It can't take another socket."
              : work === "links"
                ? "It needs two sockets to link."
                : "It has no sockets.";
    }
    if (hero.gold < cost) {
        return `That costs ${cost} gold.`;
    }
    const classes = itemInfo(item).classes ?? [hero.cls];
    const sockets = item.sockets ?? [];
    if (work === "colours") {
        const colours = sockets.map(() => rollSocketColor(rng, classes));
        const out = sockets.filter((s, i) => s.gem && !fits({ color: colours[i], linked: false }, s.gem));
        if (out.length > hero.inventory.filter((x) => x === null).length) {
            return "Make room in your pack for the gems that might come out first.";
        }
        sockets.forEach((s, i) => {
            s.color = colours[i];
            if (s.gem && !fits(s, s.gem)) {
                hero.inventory[hero.inventory.indexOf(null)] = s.gem;
                s.gem = undefined;
            }
        });
    } else if (work === "links") {
        rollLinks(rng, sockets);
    } else if (work === "imbue") {
        const slot = itemInfo(item).slot;
        item.rarity = "rare";
        item.rareName = rareName(rng, slot);
        item.mods = imbueMods(rng, slot, hero.level);
        hero.quests!.imbues! -= 1;
    } else {
        sockets.push({ color: rollSocketColor(rng, classes), linked: false });
        item.sockets = sockets;
        if (cost === 0) {
            hero.quests!.sockets! -= 1;
        }
    }
    hero.gold -= cost;
    cleanBar(hero);
    return undefined;
}

// ---- The skill bar ----

// A skill gem just socketed goes on the first empty button, if it isn't on one
export function bindNew(hero: Hero, gem: Item): void {
    if (!gemDef(gem)?.skill || hero.skillBar.includes(gem.uid)) {
        return;
    }
    const free = hero.skillBar.indexOf(null);
    if (free >= 0) {
        hero.skillBar[free] = gem.uid;
    }
}

// Buttons whose gem isn't worn any more are emptied
export function cleanBar(hero: Hero): void {
    const worn = new Set(wornGems(hero).map((w) => w.gem.uid));
    hero.skillBar = hero.skillBar.map((ref) => (ref === null || ref === BASIC || worn.has(ref) ? ref : null));
    while (hero.skillBar.length < SKILL_SLOTS) {
        hero.skillBar.push(null);
    }
    hero.skillBar.length = SKILL_SLOTS;
}

// Puts a skill on a button (a gem's uid, BASIC, or null to clear it); if it was on another, that
// one gets what this one had
export function bindSkill(hero: Hero, button: number, ref: number | null): void {
    if (button < 0 || button >= SKILL_SLOTS) {
        return;
    }
    const was = hero.skillBar[button];
    const other = ref === null ? -1 : hero.skillBar.indexOf(ref);
    if (other >= 0 && other !== button) {
        hero.skillBar[other] = was;
    }
    hero.skillBar[button] = ref;
    cleanBar(hero);
}

// ---- Gems given and found ----

// Each class's first gear has a few sockets, linked, of its colour; a hybrid's of its two, its
// own in the weapon
export function starterSockets(cls: ClassId, slot: Slot): Socket[] | undefined {
    const [own, other = own] = CLASS_COLORS[cls];
    const colors: GemColor[] = slot === "body" ? [own, other, own] : slot === "weapon" ? [own, own] : slot === "head" || slot === "legs" ? [own, other] : [];
    if (colors.length === 0) {
        return undefined;
    }
    return colors.map((color, i) => ({ color, linked: i < colors.length - 1 }));
}

// A gem given to the hero: into the best socket for it and onto the bar, or into the pack. False
// if there was nowhere for it.
export function grantGem(hero: Hero, id: string, level = 1): boolean {
    const gem = makeGem(hero.nextUid++, id, level);
    const at = bestSocket(hero, gem);
    if (at) {
        hero.equipment[at.slot]!.sockets![at.index].gem = gem;
        bindNew(hero, gem);
        return true;
    }
    const free = hero.inventory.indexOf(null);
    if (free < 0) {
        return false;
    }
    hero.inventory[free] = gem;
    return true;
}

// The gems the hero's levels bring that they haven't had yet: their names
export function grantLevelGems(hero: Hero): string[] {
    const given: string[] = [];
    for (const reward of GEM_REWARDS[hero.cls]) {
        if (reward.level > hero.rewarded && reward.level <= hero.level) {
            if (grantGem(hero, reward.gem)) {
                given.push(GEM_BY_ID.get(reward.gem)!.name);
            }
        }
    }
    hero.rewarded = Math.max(hero.rewarded, hero.level);
    return given;
}

// A gem as it drops: one the area's level allows, a skill only of those the hero's class can use,
// more likely of its colour, and now and then a level or few up
export function rollGem(rng: Rng, uid: number, level: number, cls?: ClassId): Item {
    const pool = GEMS.filter((g) => g.level <= level + 2 && (!cls || classCanUse(cls, g)));
    const lean: GemColor[] = cls ? CLASS_COLORS[cls] : [];
    const weights = pool.map((g) => (g.color === lean[0] ? 3 : lean.includes(g.color) ? 2 : 1) * (g.support ? 0.9 : 1));
    const def = pool[Math.max(0, rng.weightedIndex(weights))];
    const most = Math.max(1, Math.min(MAX_GEM_LEVEL, Math.floor((level - def.level) / 3) + 1));
    const gemLevel = 1 + rng.int(Math.ceil(most / 2));
    return makeGem(uid, def.id, gemLevel);
}

// A forged gem (forge.ts) of the hero's class: one of the archetypes of its colours and weapons,
// its own colour's most often, at about the level it fell at
export function rollForgedGem(rng: Rng, uid: number, level: number, cls: ClassId): Item {
    const archs = forgeArchetypes(cls);
    const own = CLASS_COLORS[cls][0];
    const weights = archs.map((a) => (a.color === own ? 2 : 1));
    const recipe = rollRecipe(rng, archs, weights, Math.max(1, level - 2));
    const def = forgedGem(recipe);
    const most = Math.max(1, Math.min(MAX_GEM_LEVEL, Math.floor((level - def.level) / 3) + 1));
    const gemLevel = 1 + rng.int(Math.ceil(most / 2));
    return { uid, base: FORGED, rarity: "gem", level: gemLevel, mods: [], xp: 0, forge: recipe };
}

// The archetypes a class can be forged: of its colours, and for a weapon it can hold
export function forgeArchetypes(cls: ClassId): Archetype[] {
    const colors = CLASS_COLORS[cls];
    const weapons = CLASSES[cls].weapons;
    return ARCHETYPES.filter((a) => colors.includes(a.color) && (!a.weapons || a.weapons.some((w) => weapons.includes(w))));
}

// What a shop asks for a gem
export function gemPrice(item: Item): number {
    const def = gemDef(item);
    const forged = item.forge ? 4 + item.forge.traits.length * 2 : 1;
    return Math.round((20 + (def?.level ?? 1) * 12) * (def?.support ? 1.2 : 1) * forged);
}
