// The rift web (content/web.ts): each place's rift, the same each time it's asked for; the places
// open to a hero at their deepest; and what clearing one does. Everything random is from the web's
// seed and the place, so a node keeps its roll till it's done.
import { Rng } from "../../../engine/core/Rng";
import type { RiftModId } from "../content/riftMods";
import { LADDER_DEPTH } from "../content/rules";
import { BOUNTIES, BOUNTY_IDS, BountyId, WEB } from "../content/web";
import type { Hero } from "./hero";
import { rollRiftMods } from "./riftMods";

// What's saved: the web's seed, and the lane the hero stands on
export type WebState = { seed: number; lane: number };

export type WebNode = { depth: number; lane: number; seed: number; mods: RiftModId[]; bounty: BountyId };

// A place's own seed, mixed from the web's, its depth and its lane
function placeSeed(seed: number, depth: number, lane: number): number {
    let h = (seed ^ Math.imul(depth, 0x9e3779b1) ^ Math.imul(lane + 1, 0x85ebca6b)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return (h ^ (h >>> 16)) >>> 0 || 1;
}

// A place's rift: its bounty, its modifiers, and the seed its land, host, guardian and encounter
// are rolled from (sim/ladder.ts ladderRift)
export function webNode(web: WebState, depth: number, lane: number): WebNode {
    const rng = new Rng(placeSeed(web.seed, depth, lane));
    const bounty = BOUNTY_IDS[Math.max(0, rng.weightedIndex(BOUNTY_IDS.map((id) => BOUNTIES[id].weight)))];
    const mods = rollRiftMods(rng, depth, rng.int(WEB.mods + 1));
    return { depth, lane, seed: 1 + rng.int(0x7ffffffe), mods, bounty };
}

// The lanes open from one: its own and those beside it
export function nextLanes(lane: number): number[] {
    const out: number[] = [];
    for (let l = lane - WEB.reach; l <= lane + WEB.reach; l++) {
        if (l >= 0 && l < WEB.lanes) {
            out.push(l);
        }
    }
    return out;
}

// Whether a depth's versions are the web's: the deepest the hero's reached, on the ladder
export function onWeb(hero: Hero, depth: number): boolean {
    return depth > LADDER_DEPTH && depth === hero.maxDepth;
}

// The hero's web, begun the first time it's asked for
export function heroWeb(hero: Hero, seed: () => number): WebState {
    return (hero.web ??= { seed: seed(), lane: WEB.start });
}

// A rift of the web cleared at the hero's deepest: they stand on its lane
export function webCleared(hero: Hero, depth: number, lane: number): void {
    if (hero.web && depth === hero.maxDepth && lane >= 0 && lane < WEB.lanes) {
        hero.web.lane = lane;
    }
}

// The web from a save
export function readWeb(raw: unknown): WebState | undefined {
    const w = raw as Partial<WebState> | null | undefined;
    if (!w || typeof w !== "object" || typeof w.seed !== "number" || !Number.isFinite(w.seed)) {
        return undefined;
    }
    const lane = typeof w.lane === "number" && Number.isFinite(w.lane) ? Math.max(0, Math.min(WEB.lanes - 1, Math.round(w.lane))) : WEB.start;
    return { seed: w.seed >>> 0 || 1, lane };
}

export function readBounty(raw: unknown): BountyId | undefined {
    return BOUNTY_IDS.includes(raw as BountyId) ? (raw as BountyId) : undefined;
}
