// The city's tasks (content/tasks.ts): rolling those the folk offer, counting them in the rifts,
// and paying for them. Everything random comes from the Rng it's handed, so a seed offers the
// same tasks; the counting is the sim's (Game), as the rifts play out.
import type { Rng } from "../../../engine/core/Rng";
import { BOSSES, BossId, MONSTERS, MonsterId } from "../content/monsters";
import { LADDER_DEPTH, MAX_LEVEL, areaLevel, xpToNext } from "../content/rules";
import { RIFTSTONE } from "../content/riftstones";
import { RUNES, RuneId } from "../content/runes";
import { GOODS, GoodId } from "../content/goods";
import { logIt } from "./log";
import {
    GIVERS,
    SWIFT_SHARE,
    TASKS,
    TASK_KIND,
    TASK_KIND_IDS,
    TASK_MOD_WORTH,
    TASK_PREY,
    TaskKind,
} from "../content/tasks";
import { FOLK, FolkId } from "../content/town";
import { depthGuardians, depthMonsters } from "./ladder";
import { rollForgedGem } from "./gems";
import { Hero, cityLevel, freeSlot, gainXp, nextUid, stow } from "./hero";
import { Item, rollItem } from "./loot";
import { rollRiftstone } from "./riftstones";

// What a task pays: gold, experience, and one thing more
export type TaskReward = { gold: number; xp: number; item?: Item; runes?: { id: RuneId; count: number }; goods?: { id: GoodId; count: number } };

export type Task = {
    uid: number;
    // Who set it, and pays for it
    giver: FolkId;
    kind: TaskKind;
    // A slaying task's monster, or a guardian's
    target?: string;
    count: number;
    // It counts in rifts this deep or deeper
    depth: number;
    // A clearing task's fewest modifiers
    mods?: number;
    progress: number;
    reward: TaskReward;
};

export function taskDone(task: Task): boolean {
    return task.progress >= task.count;
}

// ---- Setting them ----

// Those of the given folk who'll have a task to offer this time home: so many of them, none who
// has set one of the hero's still
export function rollTaskOffers(rng: Rng, hero: Hero, givers: readonly FolkId[]): Map<FolkId, Task> {
    const open = givers.filter((g) => !hero.tasks.some((t) => t.giver === g));
    const offers = new Map<FolkId, Task>();
    while (offers.size < TASKS.offers && open.length > 0) {
        const giver = open.splice(rng.int(open.length), 1)[0];
        offers.set(giver, rollTask(rng, hero, giver));
    }
    return offers;
}

// A task of one of the giver's kinds, near the deepest the hero has reached, and what it pays
export function rollTask(rng: Rng, hero: Hero, giver: FolkId): Task {
    const def = GIVERS[giver];
    const kinds = TASK_KIND_IDS.filter((k) => (def.kinds[k] ?? 0) > 0);
    const kind = kinds[Math.max(0, rng.weightedIndex(kinds.map((k) => def.kinds[k]!)))];
    const k = TASK_KIND[kind];
    const reached = Math.max(1, hero.maxDepth);
    const lowest = Math.max(1, reached - k.below);
    let depth = lowest + rng.int(reached - lowest + 1);
    let count = between(rng, k.count);
    let worth = k.worth + (count - k.count[0]) * (k.each ?? 0);
    let target: string | undefined;
    let mods: number | undefined;
    if (kind === "slay") {
        const prey = rollPrey(rng, lowest, reached, def.prey);
        depth = prey.depth;
        target = prey.id;
        count = prey.count;
    } else if (kind === "guardian") {
        // On the ladder, any host's: the Archmage's offers show which is where
        const guardians = depthGuardians(depth);
        target = guardians.length === 1 ? guardians[0] : rng.pick(guardians);
    } else if (kind === "clear") {
        mods = rng.int(4);
        worth += mods * TASK_MOD_WORTH;
    }
    return { uid: nextUid(hero), giver, kind, target, count, depth, mods, progress: 0, reward: rollReward(rng, hero, worth, depth, giver) };
}

// A monster of a zone between those depths, the giver's own kind where any are there, and how many
// of it: about a share of a rift's, by how much of its zone's packs it makes up
function rollPrey(rng: Rng, lowest: number, reached: number, theirs?: MonsterId[]): { id: MonsterId; depth: number; count: number } {
    const all: { id: MonsterId; depth: number; share: number }[] = [];
    for (let d = lowest; d <= reached; d++) {
        const monsters = depthMonsters(d);
        const total = monsters.reduce((sum, [, w]) => sum + w, 0);
        for (const [id, w] of monsters) {
            if (TASK_PREY[id]) {
                all.push({ id, depth: d, share: w / total });
            }
        }
    }
    const own = theirs ? all.filter((p) => theirs.includes(p.id)) : [];
    const pool = own.length > 0 ? own : all;
    const pick = pool[Math.max(0, rng.weightedIndex(pool.map((p) => p.share)))];
    const { perRift, least, most } = TASKS.slay;
    const count = Math.min(most, Math.max(least, Math.round((pick.share * perRift * (0.6 + rng.next() * 0.4)) / 5) * 5));
    return { id: pick.id, depth: pick.depth, count };
}

// Gold and experience by the task's worth and the hero's level, and one thing more
function rollReward(rng: Rng, hero: Hero, worth: number, depth: number, giver: FolkId): TaskReward {
    // Gold and items at the city's level, or past the campaign at the task's depth's (elite bases
    // and the rift-touched tier with it); experience a share of the hero's next level, to 99
    const late = depth > LADDER_DEPTH;
    const level = late ? Math.max(cityLevel(hero), areaLevel(depth)) : cityLevel(hero);
    const gold = Math.round(TASKS.gold * 4 * (1 + 0.7 * level) * worth);
    const xp = hero.level >= MAX_LEVEL ? 0 : Math.round(xpToNext(hero.level) * TASKS.xp * worth);
    const reward: TaskReward = { gold, xp };
    const stones = depth >= RIFTSTONE.from;
    const { item, runes, forged, riftstone } = TASKS.extra;
    const pick = rng.weightedIndex([item, runes, forged, stones ? riftstone : 0]);
    if (pick === 1) {
        const ids = TASKS.runes.ids.filter((id) => RUNES[id].level <= areaLevel(depth));
        const id = ids[Math.max(0, rng.weightedIndex(ids.map((r) => RUNES[r].weight)))];
        // The rarer the rune, the fewer
        reward.runes = { id, count: Math.max(1, Math.round((between(rng, TASKS.runes.count) * RUNES[id].weight) / RUNES.nature.weight)) };
    } else if (pick === 2) {
        reward.item = rollForgedGem(rng, nextUid(hero), cityLevel(hero) + 1, hero.cls);
    } else if (pick === 3) {
        reward.item = rollRiftstone(rng, nextUid(hero), depth, 1);
    } else {
        const unique = rng.chance(TASKS.unique * worth);
        reward.item = rollItem(rng, nextUid(hero), { level: level + 1, rarity: 1, cls: hero.cls, atLeast: unique ? "unique" : "rare", elite: late });
    }
    // The giver's own good besides, past the campaign
    const good = GIVERS[giver].late;
    if (late && good) {
        reward.goods = { id: good.good, count: Math.max(1, Math.round(good.count * worth)) };
    }
    return reward;
}

function between(rng: Rng, [lo, hi]: [number, number]): number {
    return lo + rng.int(hi - lo + 1);
}

// ---- Taking, giving up and paying ----

// Why the hero can't take it, if they can't
export function whyNotTake(hero: Hero, task: Task): string | undefined {
    if (hero.tasks.some((t) => t.giver === task.giver)) {
        return `You're already doing a task for ${FOLK[task.giver].name}.`;
    }
    if (hero.tasks.length >= TASKS.most) {
        return `You can do ${TASKS.most} tasks at once: finish one, or give one up, first.`;
    }
    return undefined;
}

export function takeTask(hero: Hero, task: Task): string | undefined {
    const why = whyNotTake(hero, task);
    if (why) {
        return why;
    }
    hero.tasks.push({ ...task, progress: 0 });
    return undefined;
}

export function giveUpTask(hero: Hero, uid: number): void {
    hero.tasks = hero.tasks.filter((t) => t.uid !== uid);
}

export type Paid = { gold: number; xp: number; levels: number; gems: string[]; item?: Item; runes?: { id: RuneId; count: number }; goods?: { id: GoodId; count: number } };

// A task done, paid for by whoever set it: its gold, experience, and its item into the pack (which
// needs room) or its runes into the pouch; why not, if it can't be
export function claimTask(hero: Hero, uid: number): Paid | string {
    const at = hero.tasks.findIndex((t) => t.uid === uid);
    const task = hero.tasks[at];
    if (!task) {
        return "There's no such task.";
    }
    if (!taskDone(task)) {
        return "It isn't done yet.";
    }
    const r = task.reward;
    if (r.item && freeSlot(hero) < 0) {
        return "Make room in your pack for your reward first.";
    }
    if (r.item) {
        stow(hero, r.item);
    }
    if (r.runes) {
        hero.runes[r.runes.id] += r.runes.count;
    }
    if (r.goods) {
        hero.goods[r.goods.id] = (hero.goods[r.goods.id] ?? 0) + r.goods.count;
        logIt(hero, r.goods.id);
    }
    hero.gold += r.gold;
    const gems: string[] = [];
    const levels = gainXp(hero, r.xp, gems);
    hero.tasks.splice(at, 1);
    return { gold: r.gold, xp: r.xp, levels, gems, item: r.item, runes: r.runes, goods: r.goods };
}

// ---- Counting them ----

// A monster killed in a rift this deep: the tasks it counts for, now further on
export function countKill(hero: Hero, id: string, rank: "normal" | "magic" | "rare" | "boss", depth: number): Task[] {
    return count(hero, depth, (t) => (t.kind === "slay" && t.target === id) || (t.kind === "rares" && rank === "rare") || (t.kind === "guardian" && rank === "boss" && t.target === id));
}

// A rift's guardian dead: rifts cleared, with so many modifiers and this share of its time left
export function countClear(hero: Hero, depth: number, mods: number, timeLeft: number): Task[] {
    return count(hero, depth, (t) => (t.kind === "clear" && mods >= (t.mods ?? 0)) || (t.kind === "swift" && timeLeft >= SWIFT_SHARE));
}

// A chest or a hoard opened, or a shrine prayed at
export function countFeature(hero: Hero, kind: "chest" | "shrine" | "hoard", depth: number): Task[] {
    const wanted: TaskKind = kind === "chest" ? "chests" : kind === "shrine" ? "shrines" : "hoards";
    return count(hero, depth, (t) => t.kind === wanted);
}

function count(hero: Hero, depth: number, counts: (t: Task) => boolean): Task[] {
    const moved: Task[] = [];
    for (const t of hero.tasks) {
        if (!taskDone(t) && depth >= t.depth && counts(t)) {
            t.progress++;
            moved.push(t);
        }
    }
    return moved;
}

// ---- Saying them ----

// What it asks, in a line: "Slay 25 skeletons"
export function taskObjective(task: Task): string {
    const n = task.count;
    switch (task.kind) {
        case "slay":
            return `Slay ${n} ${TASK_PREY[task.target as MonsterId] ?? "monsters"}`;
        case "rares":
            return `Slay ${n} rare monsters`;
        case "guardian": {
            const boss = BOSSES[task.target as BossId];
            return boss ? `Slay ${boss.name}, ${boss.title}` : "Slay a rift's guardian";
        }
        case "clear": {
            const rifts = n === 1 ? "a rift" : `${n} rifts`;
            const mods = task.mods ?? 0;
            return mods > 0 ? `Clear ${rifts} woven with ${mods} or more modifiers` : `Clear ${rifts}`;
        }
        case "swift":
            return "Clear a rift with half its time still left";
        case "chests":
            return `Open ${n} chests`;
        case "shrines":
            return `Pray at ${n} shrines`;
        case "hoards":
            return n === 1 ? "Take a guarded hoard" : `Take ${n} guarded hoards`;
    }
}

// Where it counts
export function taskWhere(task: Task): string {
    if (task.kind === "guardian") {
        return task.depth > LADDER_DEPTH ? `At the end of a rift ${task.depth} or deeper` : `At the end of rift ${task.depth}`;
    }
    return task.depth > 1 ? `In rift ${task.depth} or deeper` : "In any rift";
}

// A task from a save: as it was, if the game still has everything it names
export function readTask(raw: unknown, readItem: (it: unknown) => Item | null): Task | undefined {
    const t = raw as Partial<Task> | null;
    if (!t || typeof t !== "object" || !TASK_KIND_IDS.includes(t.kind as TaskKind) || !(String(t.giver) in FOLK)) {
        return undefined;
    }
    const num = (v: unknown, otherwise: number) => (typeof v === "number" && Number.isFinite(v) ? v : otherwise);
    const kind = t.kind as TaskKind;
    if ((kind === "slay" && !(String(t.target) in MONSTERS)) || (kind === "guardian" && !(String(t.target) in BOSSES))) {
        return undefined;
    }
    const r = (t.reward ?? {}) as Partial<TaskReward>;
    const reward: TaskReward = { gold: Math.max(0, num(r.gold, 0)), xp: Math.max(0, num(r.xp, 0)) };
    const item = r.item ? readItem(r.item) : null;
    if (item) {
        reward.item = item;
    }
    if (r.runes && r.runes.id in RUNES) {
        reward.runes = { id: r.runes.id, count: Math.max(1, Math.floor(num(r.runes.count, 1))) };
    }
    if (r.goods && typeof r.goods.id === "string" && r.goods.id in GOODS) {
        reward.goods = { id: r.goods.id, count: Math.max(1, Math.floor(num(r.goods.count, 1))) };
    }
    const count = Math.max(1, Math.floor(num(t.count, 1)));
    return {
        uid: num(t.uid, 0),
        giver: t.giver as FolkId,
        kind,
        target: typeof t.target === "string" ? t.target : undefined,
        count,
        depth: Math.max(1, Math.floor(num(t.depth, 1))),
        mods: kind === "clear" ? Math.max(0, Math.floor(num(t.mods, 0))) : undefined,
        progress: Math.min(count, Math.max(0, Math.floor(num(t.progress, 0)))),
        reward,
    };
}
