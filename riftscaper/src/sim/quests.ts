// Reldo's quests (content/quests.ts): counting them in the rifts, claiming them from him, and what
// each leaves for good. The counting is the sim's (Game), as the rifts play out; what's left is
// read where it counts: passive points (passives.ts), the hero's numbers (hero.ts statTotals), the
// gem trader's work (gems.ts) and the Archmage's offers.
import type { Rng } from "../../../engine/core/Rng";
import type { StatLine } from "../content/items";
import type { MonsterId } from "../content/monsters";
import { QUESTS, QUEST_IDS, QuestDef, QuestId } from "../content/quests";
import type { RiftModId } from "../content/riftMods";
import { RIFTSTONE_BASE } from "../content/riftstones";
import { LADDER_DEPTH } from "../content/rules";
import { SWIFT_SHARE } from "../content/tasks";
import { ZONES, zoneOf } from "../content/zones";
import { Hero, freeSlot, nextUid, stow } from "./hero";
import type { Item } from "./loot";
import { weaveMods } from "./riftstones";

// What a hero has of them, as saved: those done and not yet claimed, those claimed, the leaders
// slain towards a leaders' quest, and the gem trader's favours not yet used
export type QuestLog = {
    ready: QuestId[];
    claimed: QuestId[];
    leaders?: MonsterId[];
    sockets?: number;
    imbues?: number;
};

export function questLog(hero: Hero): QuestLog {
    return (hero.quests ??= { ready: [], claimed: [] });
}

export function questState(hero: Hero, id: QuestId): "unseen" | "open" | "ready" | "claimed" {
    const log = hero.quests;
    if (log?.claimed.includes(id)) {
        return "claimed";
    }
    if (log?.ready.includes(id)) {
        return "ready";
    }
    // Open once the hero has reached its zone
    return hero.maxDepth > QUESTS[id].zone ? "open" : "unseen";
}

// ---- Counting them ----

// A rift of a quest's zone, in the first two laps
function inZone(def: QuestDef, depth: number): boolean {
    return depth <= LADDER_DEPTH && zoneOf(depth) === ZONES[def.zone];
}

// Those open whose goal this meets, done now: their ids
function meet(hero: Hero, depth: number, meets: (def: QuestDef) => boolean): QuestId[] {
    const done: QuestId[] = [];
    for (const id of QUEST_IDS) {
        const def = QUESTS[id];
        if (questState(hero, id) === "open" && inZone(def, depth) && meets(def)) {
            questLog(hero).ready.push(id);
            done.push(id);
        }
    }
    return done;
}

// A monster killed in a rift this deep: `allDead` whether nothing's left standing there now
export function questKill(hero: Hero, id: string, rank: "normal" | "magic" | "rare" | "boss", depth: number, mods: readonly RiftModId[], allDead: () => boolean): QuestId[] {
    return meet(hero, depth, (def) => {
        const goal = def.goal;
        switch (goal.kind) {
            case "clearAll":
                return allDead();
            case "boss":
                return rank === "boss" && id === goal.boss && (!goal.mod || mods.includes(goal.mod));
            case "leaders": {
                if (rank !== "rare" || !goal.leaders.includes(id as MonsterId)) {
                    return false;
                }
                const log = questLog(hero);
                const slain = (log.leaders ??= []);
                if (!slain.includes(id as MonsterId)) {
                    slain.push(id as MonsterId);
                }
                return goal.leaders.every((l) => slain.includes(l));
            }
            case "swift":
                return false;
        }
    });
}

// A rift's guardian dead, with this share of its time left
export function questClear(hero: Hero, depth: number, timeLeft: number): QuestId[] {
    return meet(hero, depth, (def) => def.goal.kind === "swift" && timeLeft >= SWIFT_SHARE);
}

// ---- Claiming them ----

// One done, claimed from Reldo: what it gave, if it was an item, or why not
export function claimQuest(rng: Rng, hero: Hero, id: QuestId): { item?: Item } | string {
    if (questState(hero, id) !== "ready") {
        return "It isn't done yet.";
    }
    const reward = QUESTS[id].reward;
    const log = questLog(hero);
    let item: Item | undefined;
    if (reward.kind === "riftstone") {
        if (freeSlot(hero) < 0) {
            return "Make room in your pack for your reward first.";
        }
        const depth = Math.max(1, hero.maxDepth);
        item = { uid: nextUid(hero), base: RIFTSTONE_BASE, rarity: "rare", level: depth, mods: [], rift: weaveMods(rng, depth, reward.mods) };
        stow(hero, item);
    } else if (reward.kind === "socket") {
        log.sockets = (log.sockets ?? 0) + 1;
    } else if (reward.kind === "imbue") {
        log.imbues = (log.imbues ?? 0) + 1;
    }
    log.ready = log.ready.filter((q) => q !== id);
    log.claimed.push(id);
    return { item };
}

// ---- What they leave ----

function claimed(hero: Hero): QuestDef[] {
    return (hero.quests?.claimed ?? []).map((id) => QUESTS[id]);
}

export function questPoints(hero: Hero): number {
    return claimed(hero).filter((q) => q.reward.kind === "point").length;
}

export function questStats(hero: Hero): StatLine[] {
    return claimed(hero).flatMap((q) => (q.reward.kind === "stats" ? q.reward.stats : []));
}

// The Archmage's versions of each rift, past his own
export function questOffers(hero: Hero): number {
    return claimed(hero).filter((q) => q.reward.kind === "offer").length;
}

// A quest log from a save: what it names that the game still has
export function readQuests(raw: unknown): QuestLog | undefined {
    const q = raw as Partial<QuestLog> | null | undefined;
    if (!q || typeof q !== "object") {
        return undefined;
    }
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter((id): id is QuestId => QUEST_IDS.includes(id)) : []);
    const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined);
    const claimed = [...new Set(ids(q.claimed))];
    const log: QuestLog = { ready: [...new Set(ids(q.ready))].filter((id) => !claimed.includes(id)), claimed };
    if (Array.isArray(q.leaders)) {
        log.leaders = q.leaders.filter((l): l is MonsterId => typeof l === "string");
    }
    const sockets = count(q.sockets);
    const imbues = count(q.imbues);
    if (sockets) {
        log.sockets = sockets;
    }
    if (imbues) {
        log.imbues = imbues;
    }
    return log;
}
