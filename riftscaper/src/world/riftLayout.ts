// The shape of a rift, planned before its land is made, as Diablo's and Path of Exile's levels
// are: not an open field but ground you can walk, shaped into arenas joined by lanes, with the
// camp at one end, the guardian's arena at the other, nooks off the way with something in them,
// and everything else walled off by what the land's made of (cliffs, forest, water, lava, the
// void). docs/rift-maps.md has the research and the reasons. A plan is pure data, from a seed:
// the same seed and kind always give the same plan, and it needs no cache.
//
// Coordinates are grid tiles (x east, y north), on the generator's grid: the arena with a map
// square of margin round it. Nothing open comes within `inset` of the arena's edge.
import { fm } from "../../../engine/core/fmath";
import { createNoise, createRng } from "../../../engine/scaperune/noise";
import type { Rng } from "../../../engine/scaperune/noise";

// The four shapes:
// - trail: a long winding way across the rift, corner to corner, with nooks off it and now and
//   then a second way round (Diablo II's wilderness, Path of Exile's linear maps)
// - loop: a ring round a heart of water, lava, void or high ground, and the guardian on an
//   island in the heart, one causeway in from the ring's far side (Path of Exile's ring maps)
// - arms: a great hub with four arms off it, the camp at the end of one, the guardian at the end
//   of the longest, and something to find at the end of the others (the Arcane Sanctuary)
// - isles: islands joined by causeways, a tree of them with a loop or two (the Great Marsh, Path
//   of Exile's Atoll)
// - field: open ground inside a ragged edge, broken by blocks of what the land's made of about a
//   screen across, and a road winding from the camp to the guardian (Diablo II's wilderness)
// And two a pinnacle's alone, not among the kinds a biome picks from:
// - nexus: the Tombs of Amascut's (content/tombs.ts), a great hall with a chamber off it for each
//   of the raid's paths and the camp in an alcove beside it, as the Tombs' own Nexus is
// - pit: the Fortis Colosseum's (content/colosseum.ts), its round sand and the camp in an alcove
//   beside it
export type LayoutKind = "trail" | "loop" | "arms" | "isles" | "field" | "nexus" | "pit";
export const LAYOUT_KINDS: LayoutKind[] = ["trail", "loop", "arms", "isles", "field"];

// camp: where the rift's entered; arena: open ground to fight on, with a landmark if it's big
// enough; bend: where a lane turns; nook: a dead end off the way, with something in it; hub: the
// arms' meeting; heart: the loop's middle, the guardian's; guardian: the guardian's arena; room: a
// nexus's chamber, a fight of its own
export type Role = "camp" | "arena" | "bend" | "nook" | "hub" | "guardian" | "room";

export type Point = { x: number; y: number };
export type LayoutNode = Point & { r: number; role: Role };
export type LayoutLane = { from: number; to: number; width: number; points: Point[] };
// A block of closed ground in a field: an oval, its half-widths rx and ry
export type Block = Point & { rx: number; ry: number };

export type RiftLayout = {
    kind: LayoutKind;
    sizeX: number;
    sizeY: number;
    // 1 where the ground's walked
    open: Uint8Array;
    // 1 where the ground that isn't walked falls away (water, lava, the void) rather than rising
    // (cliffs, forest)
    deep: Uint8Array;
    nodes: LayoutNode[];
    lanes: LayoutLane[];
    // A field's blocks
    blocks?: Block[];
    camp: number;
    guardian: number;
    // The nodes from the camp to the guardian, the way the rift's meant to be crossed
    route: number[];
    // A nexus's chambers, in turn round its hall from the camp
    rooms?: number[];
    // Walking distance from the camp per tile over the open ground (-1 closed or cut off)
    distance: Int32Array;
};

export type LayoutRequest = {
    kind: LayoutKind;
    seed: number;
    sizeX: number;
    sizeY: number;
    arena: { x0: number; y0: number; x1: number; y1: number };
    // Which corner the camp's in: 0 south-west, 1 south-east, 2 north-west, 3 north-east
    corner: number;
    // How the ground that isn't walked is shared out: "none" all rises, "all" all falls away,
    // "heart" only the loop's heart and the sea round islands fall away, "pools" pools of it
    // here and there besides
    deep: "none" | "all" | "heart" | "pools";
};

// Sizes in tiles, [least, most]. Path of Exile's ways are one to two screens across and Diablo
// II's fields open ground round a road (a screen's about 27 of our tiles); a way of ours is two
// thirds of a screen, so a long one fits in the field's 192 and the hero and a pack have room to
// fight in it. A narrows is an accent, not the rule: single-file corridors are the layouts both
// games' players hate most.
const WAY: [number, number] = [15, 21];
const NARROWS: [number, number] = [10, 12];
// A lane to a nook, a second way round, a causeway
const SIDE: [number, number] = [10, 13];
const ARENA: [number, number] = [14, 19];
const BEND: [number, number] = [10, 12];
const NOOK: [number, number] = [9, 12];
const GUARDIAN: [number, number] = [17, 20];
const CAMP = 11;
// Ground that isn't joined by a lane is kept apart by a wall at least this thick, so the way
// isn't cut short where two arenas happen to lie side by side
const WALL = 8;
// Nothing open within this many tiles of the arena's edge
const INSET = 10;
// The camp within this many of it, at least: the generator keeps the spawn 14 in
const CAMP_INSET = 18;
// A lane's edge wanders by up to this many tiles, and a node's by this share of its radius
const LANE_WOBBLE = 1.6;
const NODE_WOBBLE = 0.2;
// Closed pieces smaller than this inside the open ground are opened; bigger stay, as outcrops
const SPECK = 10;
// A field's edge comes in by up to this many tiles more than INSET, rolling
const FIELD_EDGE = 16;
// The guardian's arena is this much further from the camp than anything else, on foot
const GUARDIAN_LEAD = 12;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function between(rng: Rng, lo: number, hi: number): number {
    return lo + (hi - lo) * rng();
}

function sized(rng: Rng, [lo, hi]: [number, number]): number {
    return between(rng, lo, hi);
}

// A list in an order of the rng's (Fisher-Yates: sort with a random comparator isn't the same
// from one browser to the next)
function shuffle<T>(rng: Rng, list: T[]): T[] {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// A lane's way from one point to another: bent once to one side, by up to `bend` of its length,
// and sampled every couple of tiles
function laneLine(rng: Rng, a: Point, b: Point, bend: number): Point[] {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = fm.hypot(dx, dy);
    const side = (rng() * 2 - 1) * bend * length;
    const cx = (a.x + b.x) / 2 + (-dy / Math.max(length, 1)) * side;
    const cy = (a.y + b.y) / 2 + (dx / Math.max(length, 1)) * side;
    const steps = Math.max(2, Math.ceil(length / 2));
    const points: Point[] = [];
    for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const u = 1 - t;
        points.push({ x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y });
    }
    return points;
}

function segmentDistance(px: number, py: number, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? clamp(((px - a.x) * dx + (py - a.y) * dy) / len2, 0, 1) : 0;
    return fm.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
    const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return d1 * d2 < 0 && d3 * d4 < 0;
}

// The corner's middle, inset, and the one opposite
function cornerPoint(request: LayoutRequest, corner: number, inset: number): Point {
    const { arena } = request;
    return {
        x: corner & 1 ? arena.x1 - inset : arena.x0 + inset,
        y: corner & 2 ? arena.y1 - inset : arena.y0 + inset,
    };
}

type Plan = { nodes: LayoutNode[]; lanes: LayoutLane[]; blocks?: Block[]; camp: number; guardian: number; route: number[]; rooms?: number[] };

class Planner {
    nodes: LayoutNode[] = [];
    lanes: LayoutLane[] = [];

    constructor(
        readonly rng: Rng,
        readonly request: LayoutRequest,
    ) {}

    node(x: number, y: number, r: number, role: Role): number {
        const { arena } = this.request;
        const reach = role === "camp" ? CAMP_INSET : INSET + r * 0.8;
        this.nodes.push({
            x: clamp(x, arena.x0 + reach, arena.x1 - reach),
            y: clamp(y, arena.y0 + reach, arena.y1 - reach),
            r,
            role,
        });
        return this.nodes.length - 1;
    }

    lane(from: number, to: number, width: number, bend = 0.18): void {
        const points = laneLine(this.rng, this.nodes[from], this.nodes[to], bend);
        this.lanes.push({ from, to, width, points });
    }

    // Whether a lane from a to b would cross one already laid
    crosses(a: Point, b: Point): boolean {
        return this.lanes.some((lane) => {
            const p = this.nodes[lane.from];
            const q = this.nodes[lane.to];
            if (p === a || p === b || q === a || q === b) {
                return false;
            }
            return segmentsCross(a, b, p, q);
        });
    }
}

// ---- trail: a self-avoiding walk over a grid of cells, corner to corner ----

// A randomised depth-first search over a square of cells for a walk of about `want` of them,
// from one cell to another, never crossing itself
function walkCells(rng: Rng, cells: number, start: Point, end: Point, want: number): Point[] {
    let best: Point[] = [];
    const seen = new Set<string>();
    const walk: Point[] = [start];
    seen.add(`${start.x},${start.y}`);
    let budget = 20000;
    const search = (): boolean => {
        if (--budget <= 0) {
            return true;
        }
        const at = walk[walk.length - 1];
        if (at.x === end.x && at.y === end.y) {
            if (Math.abs(walk.length - want) < Math.abs(best.length - want) || best.length === 0) {
                best = walk.slice();
            }
            return walk.length === want;
        }
        const left = want - walk.length;
        const steps = shuffle(rng, [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ]);
        for (const [dx, dy] of steps) {
            const next = { x: at.x + dx, y: at.y + dy };
            const key = `${next.x},${next.y}`;
            if (next.x < 0 || next.y < 0 || next.x >= cells || next.y >= cells || seen.has(key)) {
                continue;
            }
            // Can't get to the end in time: it's no use going on
            if (Math.abs(end.x - next.x) + Math.abs(end.y - next.y) > left + 2) {
                continue;
            }
            seen.add(key);
            walk.push(next);
            if (search()) {
                return true;
            }
            walk.pop();
            seen.delete(key);
        }
        return false;
    };
    search();
    return best;
}

function planTrail(rng: Rng, request: LayoutRequest): Plan {
    const { arena, corner } = request;
    const cells = 4;
    const cellX = (arena.x1 - arena.x0 + 1) / cells;
    const cellY = (arena.y1 - arena.y0 + 1) / cells;
    const start = { x: corner & 1 ? cells - 1 : 0, y: corner & 2 ? cells - 1 : 0 };
    const end = { x: cells - 1 - start.x, y: cells - 1 - start.y };
    const best = walkCells(rng, cells, start, end, Math.round(between(rng, 9, 12.99)));
    const plan = new Planner(rng, request);
    const middle = (c: Point, jitter: number): Point => ({
        x: arena.x0 + (c.x + 0.5) * cellX + (rng() * 2 - 1) * jitter,
        y: arena.y0 + (c.y + 0.5) * cellY + (rng() * 2 - 1) * jitter,
    });
    const campAt = cornerPoint(request, corner, CAMP_INSET + 2);
    const route: number[] = [];
    best.forEach((cell, i) => {
        const last = i === best.length - 1;
        if (i === 0) {
            route.push(plan.node(campAt.x, campAt.y, CAMP, "camp"));
            return;
        }
        const p = middle(cell, last ? 5 : 8);
        const arenaHere = last || rng() < 0.6;
        const r = last ? sized(rng, GUARDIAN) : arenaHere ? sized(rng, ARENA) : sized(rng, BEND);
        route.push(plan.node(p.x, p.y, r, last ? "guardian" : arenaHere ? "arena" : "bend"));
    });
    for (let i = 1; i < route.length; i++) {
        // Mostly broad, with a narrows now and then
        const width = rng() < 0.15 ? sized(rng, NARROWS) : sized(rng, WAY);
        plan.lane(route[i - 1], route[i], width, 0.22);
    }
    // A second way round, where the walk passes back by itself
    const index = new Map(best.map((c, i) => [`${c.x},${c.y}`, i]));
    let loops = 0;
    for (let i = 1; i < best.length - 2 && loops < 2; i++) {
        for (const [dx, dy] of [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
        ]) {
            const j = index.get(`${best[i].x + dx},${best[i].y + dy}`);
            // Only where enough of the way's left after it that the guardian's still the far end
            const ahead = j !== undefined && best.length - 1 - j >= (j - i) / 2;
            if (j !== undefined && j >= i + 3 && j < best.length - 1 && ahead && rng() < 0.35) {
                const a = plan.nodes[route[i]];
                const b = plan.nodes[route[j]];
                if (!plan.crosses(a, b)) {
                    plan.lane(route[i], route[j], sized(rng, SIDE), 0.12);
                    loops++;
                    break;
                }
            }
        }
    }
    // Nooks into the cells the walk left out, off the way's middle stretch
    const empty: { cell: Point; from: number }[] = [];
    for (let i = 2; i < best.length - 1; i++) {
        for (const [dx, dy] of [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
        ]) {
            const cell = { x: best[i].x + dx, y: best[i].y + dy };
            if (cell.x >= 0 && cell.y >= 0 && cell.x < cells && cell.y < cells && !index.has(`${cell.x},${cell.y}`)) {
                empty.push({ cell, from: i });
            }
        }
    }
    const nooks = Math.round(between(rng, 3, 4.99));
    const used = new Set<string>();
    for (const { cell, from } of shuffle(rng, empty)) {
        const key = `${cell.x},${cell.y}`;
        if (used.has(key) || used.size >= nooks) {
            continue;
        }
        const parent = plan.nodes[route[from]];
        const target = middle(cell, 8);
        // Not all the way to the cell's middle: a nook is a short way off
        const reach = between(rng, 0.55, 0.8);
        const p = { x: parent.x + (target.x - parent.x) * reach, y: parent.y + (target.y - parent.y) * reach };
        if (plan.crosses(parent, p)) {
            continue;
        }
        used.add(key);
        const nook = plan.node(p.x, p.y, sized(rng, NOOK), "nook");
        plan.lane(route[from], nook, sized(rng, SIDE), 0.15);
    }
    return { nodes: plan.nodes, lanes: plan.lanes, camp: route[0], guardian: route[route.length - 1], route };
}

// ---- loop: a ring round a heart, the guardian in the heart ----

function planLoop(rng: Rng, request: LayoutRequest): Plan {
    const { arena, corner } = request;
    const plan = new Planner(rng, request);
    const middle = { x: (arena.x0 + arena.x1) / 2 + between(rng, -6, 6), y: (arena.y0 + arena.y1) / 2 + between(rng, -6, 6) };
    const count = 8;
    const radius = between(rng, 56, 62);
    const stretch = between(rng, 0.88, 1.12);
    const toward = cornerPoint(request, corner, 0);
    const campAngle = fm.atan2(toward.y - middle.y, toward.x - middle.x);
    const ring: number[] = [];
    for (let k = 0; k < count; k++) {
        const angle = campAngle + (k / count) * Math.PI * 2 + (k === 0 ? 0 : between(rng, -0.12, 0.12));
        const r = radius + (k === 0 ? 4 : between(rng, -6, 6));
        const x = middle.x + fm.cos(angle) * r * stretch;
        const y = middle.y + fm.sin(angle) * r / stretch;
        const role: Role = k === 0 ? "camp" : rng() < 0.55 ? "arena" : "bend";
        ring.push(plan.node(x, y, k === 0 ? CAMP : role === "arena" ? between(rng, ARENA[0], 16) : sized(rng, BEND), role));
    }
    for (let k = 0; k < count; k++) {
        plan.lane(ring[k], ring[(k + 1) % count], sized(rng, WAY), 0.12);
    }
    // The heart: the guardian's island, one causeway from the far side of the ring
    const guardian = plan.node(middle.x, middle.y, between(rng, 15, GUARDIAN[0]), "guardian");
    const far = ring[count / 2];
    plan.lane(far, guardian, sized(rng, SIDE), 0.08);
    // Nooks off the ring, outwards
    const sides = shuffle(rng, [1, 2, 3, 5, 6, 7]).slice(0, Math.round(between(rng, 3, 4.99)));
    for (const k of sides) {
        const from = plan.nodes[ring[k]];
        const dx = from.x - middle.x;
        const dy = from.y - middle.y;
        const d = Math.max(1, fm.hypot(dx, dy));
        const reach = between(rng, 22, 30);
        const turn = between(rng, -0.5, 0.5);
        const ux = (dx / d) * fm.cos(turn) - (dy / d) * fm.sin(turn);
        const uy = (dx / d) * fm.sin(turn) + (dy / d) * fm.cos(turn);
        const nook = plan.node(from.x + ux * reach, from.y + uy * reach, sized(rng, NOOK), "nook");
        // Hemmed in by the field's edge: no room for a nook here
        const placed = plan.nodes[nook];
        if (fm.hypot(placed.x - from.x, placed.y - from.y) < from.r + placed.r * 0.5) {
            plan.nodes.pop();
            continue;
        }
        plan.lane(ring[k], nook, sized(rng, SIDE), 0.15);
    }
    const route = [ring[0], ring[1], ring[2], ring[3], far, guardian];
    return { nodes: plan.nodes, lanes: plan.lanes, camp: ring[0], guardian, route };
}

// ---- arms: a hub with four arms ----

function planArms(rng: Rng, request: LayoutRequest): Plan {
    const { arena, corner } = request;
    const plan = new Planner(rng, request);
    const middle = { x: (arena.x0 + arena.x1) / 2 + between(rng, -8, 8), y: (arena.y0 + arena.y1) / 2 + between(rng, -8, 8) };
    const hub = plan.node(middle.x, middle.y, between(rng, 20, 24), "hub");
    const toward = cornerPoint(request, corner, 0);
    const first = fm.atan2(toward.y - middle.y, toward.x - middle.x);
    let camp = hub;
    let guardian = hub;
    const route: number[] = [];
    for (let k = 0; k < 4; k++) {
        const angle = first + (k * Math.PI) / 2 + (k === 0 ? 0 : between(rng, -0.2, 0.2));
        const ux = fm.cos(angle);
        const uy = fm.sin(angle);
        const along = (d: number, side: number): Point => ({ x: middle.x + ux * d - uy * side, y: middle.y + uy * d + ux * side });
        const isCamp = k === 0;
        const isGuardian = k === 2;
        const reach = isCamp ? 92 : isGuardian ? 74 : between(rng, 62, 74);
        const mid = along(reach * 0.5, between(rng, -12, 12));
        const midNode = plan.node(mid.x, mid.y, rng() < 0.6 ? between(rng, ARENA[0], 16) : sized(rng, BEND), "arena");
        plan.lane(hub, midNode, sized(rng, WAY), 0.15);
        if (isGuardian) {
            // The guardian's arm hooks round, so it's the longest walk
            const elbow = along(reach, between(rng, -6, 6));
            const elbowNode = plan.node(elbow.x, elbow.y, sized(rng, BEND), "arena");
            plan.lane(midNode, elbowNode, sized(rng, WAY), 0.15);
            const hook = rng() < 0.5 ? 1 : -1;
            const end = { x: elbow.x - uy * hook * 46, y: elbow.y + ux * hook * 46 };
            guardian = plan.node(end.x, end.y, sized(rng, GUARDIAN), "guardian");
            plan.lane(elbowNode, guardian, sized(rng, WAY), 0.2);
            route.push(hub, midNode, elbowNode, guardian);
        } else {
            const end = along(reach, between(rng, -10, 10));
            const endNode = plan.node(end.x, end.y, isCamp ? CAMP : sized(rng, NOOK), isCamp ? "camp" : "nook");
            plan.lane(midNode, endNode, isCamp ? sized(rng, WAY) : sized(rng, SIDE), 0.2);
            if (isCamp) {
                camp = endNode;
                route.unshift(endNode, midNode);
            }
        }
    }
    return { nodes: plan.nodes, lanes: plan.lanes, camp, guardian, route };
}

// ---- nexus and pit: a hall the hero comes in beside, and chambers off it ----

// The pinnacles fought in one place rather than across the land, laid out so the hero comes in a
// few steps from it, not at the end of an empty walk. The hall is the guardian's arena, and the
// camp's in an alcove off it towards its corner, down a gate a few tiles long. The Tombs of
// Amascut's Nexus has its four paths' chambers round the hall besides, each a short way off, so
// no fight is more than a few seconds' walk from the hall; the Colosseum's pit is its sand alone,
// wide enough for twelve waves and the kiting round them
export const NEXUS_ROOMS = 4;
const NEXUS_HALL: [number, number] = [22, 25];
const PIT_HALL: [number, number] = [24, 27];
const NEXUS_ROOM: [number, number] = [15, 17];
// From the hall's middle to a chamber's
const NEXUS_REACH: [number, number] = [49, 54];
// Tiles of gate between the camp and the hall
const GATE = 3;

function planHall(rng: Rng, request: LayoutRequest, size: [number, number], chambers: number): Plan {
    const { arena, corner } = request;
    const plan = new Planner(rng, request);
    const middle = { x: (arena.x0 + arena.x1) / 2 + between(rng, -6, 6), y: (arena.y0 + arena.y1) / 2 + between(rng, -6, 6) };
    const r = sized(rng, size);
    const hall = plan.node(middle.x, middle.y, r, "guardian");
    const toward = cornerPoint(request, corner, 0);
    const first = fm.atan2(toward.y - middle.y, toward.x - middle.x);
    const gate = r + CAMP + GATE;
    const camp = plan.node(middle.x + fm.cos(first) * gate, middle.y + fm.sin(first) * gate, CAMP, "camp");
    plan.lane(camp, hall, sized(rng, SIDE), 0.1);
    // The chambers and the camp evenly round the hall, each a little off true
    const spokes = chambers + 1;
    const rooms: number[] = [];
    for (let k = 1; k < spokes; k++) {
        const angle = first + (k * Math.PI * 2) / spokes + between(rng, -0.15, 0.15);
        const reach = sized(rng, NEXUS_REACH);
        rooms.push(plan.node(middle.x + fm.cos(angle) * reach, middle.y + fm.sin(angle) * reach, sized(rng, NEXUS_ROOM), "room"));
        plan.lane(hall, rooms[rooms.length - 1], sized(rng, SIDE), 0.15);
    }
    return { nodes: plan.nodes, lanes: plan.lanes, camp, guardian: hall, route: [camp, hall], rooms: chambers > 0 ? rooms : undefined };
}

// ---- isles: a tree of islands, a loop or two, causeways ----

// An island's radius: at most half the least spacing less a wall, so two never run together. The
// balance bot died a third more often on islands of 11 to 15 and causeways of 8 to 11, mostly the
// ranger, whose kiting ran out of room; at these it dies no more than on any other kind
const ISLAND: [number, number] = [13, 17];

function planIsles(rng: Rng, request: LayoutRequest): Plan {
    const { arena, corner } = request;
    const plan = new Planner(rng, request);
    const spacing = between(rng, 42, 48);
    const pad = INSET + 10;
    const points: Point[] = [];
    const campAt = cornerPoint(request, corner, CAMP_INSET + 2);
    points.push(campAt);
    for (let tries = 0; tries < 3000; tries++) {
        const p = { x: between(rng, arena.x0 + pad, arena.x1 - pad), y: between(rng, arena.y0 + pad, arena.y1 - pad) };
        if (points.every((q) => fm.hypot(p.x - q.x, p.y - q.y) >= spacing)) {
            points.push(p);
        }
    }
    points.forEach((p, i) => plan.node(p.x, p.y, i === 0 ? CAMP : sized(rng, ISLAND), i === 0 ? "camp" : "arena"));
    // Every pair near enough, shortest first; a tree of them, then a few more for loops
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const d = fm.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
            if (d < spacing * 1.75) {
                pairs.push([i, j, d]);
            }
        }
    }
    pairs.sort((a, b) => a[2] - b[2]);
    const parent = points.map((_, i) => i);
    const root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
    const links: [number, number][] = [];
    const extra: [number, number][] = [];
    for (const [i, j] of pairs) {
        if (root(i) !== root(j)) {
            if (!plan.crosses(plan.nodes[i], plan.nodes[j])) {
                parent[root(i)] = root(j);
                links.push([i, j]);
                plan.lane(i, j, sized(rng, SIDE), 0.2);
            }
        } else {
            extra.push([i, j]);
        }
    }
    for (const [i, j] of extra) {
        if (rng() < 0.18 && !plan.crosses(plan.nodes[i], plan.nodes[j])) {
            links.push([i, j]);
            plan.lane(i, j, between(rng, SIDE[0], SIDE[1] - 1), 0.2);
        }
    }
    // The guardian's on the island furthest from the camp along the causeways
    const far = new Array(points.length).fill(Infinity);
    const from = new Array(points.length).fill(-1);
    far[0] = 0;
    const todo = new Set(points.map((_, i) => i));
    while (todo.size > 0) {
        let at = -1;
        for (const i of todo) {
            if (at < 0 || far[i] < far[at]) {
                at = i;
            }
        }
        todo.delete(at);
        for (const [i, j] of links) {
            const other = i === at ? j : j === at ? i : -1;
            if (other >= 0) {
                const d = far[at] + fm.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
                if (d < far[other]) {
                    far[other] = d;
                    from[other] = at;
                }
            }
        }
    }
    let guardian = 0;
    far.forEach((d, i) => {
        if (d !== Infinity && d > far[guardian]) {
            guardian = i;
        }
    });
    plan.nodes[guardian].role = "guardian";
    plan.nodes[guardian].r = sized(rng, GUARDIAN);
    const route: number[] = [];
    for (let at = guardian; at >= 0; at = from[at]) {
        route.unshift(at);
    }
    // Islands at the end of one causeway are nooks
    const degree = points.map((_, i) => links.filter(([a, b]) => a === i || b === i).length);
    plan.nodes.forEach((n, i) => {
        if (degree[i] === 1 && n.role === "arena") {
            n.role = "nook";
            n.r = Math.min(n.r, sized(rng, NOOK));
        }
    });
    return { nodes: plan.nodes, lanes: plan.lanes, camp: 0, guardian, route };
}

// ---- field: open ground round a road, broken by blocks ----

// A field's cells a side, each about a screen across, as Diablo II's are
const FIELD_CELLS = 6;
// The share of the cells off the road that are blocks, and of those on it with a small one
// beside the road
const FIELD_BLOCKS = 0.8;
const FIELD_FILLS = 0.35;

function planField(rng: Rng, request: LayoutRequest): Plan {
    const { arena, corner } = request;
    const cells = FIELD_CELLS;
    const cellX = (arena.x1 - arena.x0 + 1) / cells;
    const cellY = (arena.y1 - arena.y0 + 1) / cells;
    const start = { x: corner & 1 ? cells - 1 : 0, y: corner & 2 ? cells - 1 : 0 };
    const end = { x: cells - 1 - start.x, y: cells - 1 - start.y };
    const road = walkCells(rng, cells, start, end, Math.round(between(rng, 13, 16.99)));
    const onRoad = new Set(road.map((c) => `${c.x},${c.y}`));
    const plan = new Planner(rng, request);
    const middle = (c: Point, jitter: number): Point => ({
        x: arena.x0 + (c.x + 0.5) * cellX + (rng() * 2 - 1) * jitter,
        y: arena.y0 + (c.y + 0.5) * cellY + (rng() * 2 - 1) * jitter,
    });
    const campAt = cornerPoint(request, corner, CAMP_INSET + 2);
    const route: number[] = [];
    road.forEach((cell, i) => {
        if (i === 0) {
            route.push(plan.node(campAt.x, campAt.y, CAMP, "camp"));
            return;
        }
        const last = i === road.length - 1;
        const p = middle(cell, last ? 4 : 7);
        route.push(plan.node(p.x, p.y, last ? sized(rng, GUARDIAN) : sized(rng, BEND), last ? "guardian" : "bend"));
    });
    for (let i = 1; i < route.length; i++) {
        plan.lane(route[i - 1], route[i], sized(rng, WAY), 0.25);
    }
    const blocks: Block[] = [];
    for (let cy = 0; cy < cells; cy++) {
        for (let cx = 0; cx < cells; cx++) {
            if (Math.abs(cx - start.x) + Math.abs(cy - start.y) <= 1) {
                continue;
            }
            if (!onRoad.has(`${cx},${cy}`)) {
                // A clump of two or three boxes, off the cell's middle, so the blocks aren't a
                // grid of squares; next to each other they run together
                if (rng() < FIELD_BLOCKS) {
                    const lumps = rng() < 0.5 ? 2 : 3;
                    for (let k = 0; k < lumps; k++) {
                        const c = middle({ x: cx, y: cy }, cellX * 0.25);
                        blocks.push({ ...c, rx: cellX * between(rng, 0.26, 0.46), ry: cellY * between(rng, 0.26, 0.46) });
                    }
                }
            } else if (rng() < FIELD_FILLS) {
                // A small one the road goes round, or by
                const c = middle({ x: cx, y: cy }, cellX * 0.2);
                blocks.push({ ...c, rx: cellX * between(rng, 0.12, 0.2), ry: cellY * between(rng, 0.12, 0.2) });
            }
        }
    }
    return { nodes: plan.nodes, lanes: plan.lanes, blocks, camp: route[0], guardian: route[route.length - 1], route };
}

const PLANNERS: Record<LayoutKind, (rng: Rng, request: LayoutRequest) => Plan> = {
    trail: planTrail,
    loop: planLoop,
    arms: planArms,
    isles: planIsles,
    field: planField,
    nexus: (rng, request) => planHall(rng, request, NEXUS_HALL, NEXUS_ROOMS),
    pit: (rng, request) => planHall(rng, request, PIT_HALL, 0),
};

// Shrinks nodes that aren't joined by a lane but lie too near each other to leave a wall between
// them, the bigger the more, the camp, the guardian and a nexus's chambers least
function keepApart(plan: Plan): void {
    const joined = new Set(plan.lanes.flatMap((l) => [`${l.from},${l.to}`, `${l.to},${l.from}`]));
    const { nodes } = plan;
    const fixed = (n: LayoutNode) => n.role === "camp" || n.role === "guardian" || n.role === "room";
    const least = 7;
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (joined.has(`${i},${j}`)) {
                continue;
            }
            const a = nodes[i];
            const b = nodes[j];
            const room = (fm.hypot(a.x - b.x, a.y - b.y) - WALL) / (1 + NODE_WOBBLE);
            if (a.r + b.r <= room) {
                continue;
            }
            if (fixed(a) !== fixed(b)) {
                const free = fixed(a) ? b : a;
                const other = fixed(a) ? a : b;
                free.r = Math.max(least, room - other.r);
            } else {
                const k = Math.max(0, room) / (a.r + b.r);
                a.r = Math.max(least, a.r * k);
                b.r = Math.max(least, b.r * k);
            }
        }
    }
}

// ---- From a plan to tiles ----

function rasterise(request: LayoutRequest, plan: Plan): Uint8Array {
    const { sizeX, sizeY, arena, seed } = request;
    const open = new Uint8Array(sizeX * sizeY);
    const laneNoise = createNoise(seed + 41, 2);
    const nodeNoise = createNoise(seed + 43, 2);
    const inside = (x: number, y: number) =>
        x >= arena.x0 + INSET && y >= arena.y0 + INSET && x <= arena.x1 - INSET && y <= arena.y1 - INSET;
    // A field: open but for its ragged edge and its blocks, then its road and clearings
    if (plan.blocks) {
        const edgeNoise = createNoise(seed + 51, 2);
        const blockNoise = createNoise(seed + 53, 2);
        for (let y = arena.y0; y <= arena.y1; y++) {
            for (let x = arena.x0; x <= arena.x1; x++) {
                const fromEdge = Math.min(x - arena.x0, arena.x1 - x, y - arena.y0, arena.y1 - y);
                if (fromEdge < INSET + edgeNoise(x / 22, y / 22) * FIELD_EDGE) {
                    continue;
                }
                const wobble = (blockNoise(x / 8, y / 8) - 0.5) * 0.5;
                const closed = plan.blocks.some((b) => {
                    const dx = Math.abs(x + 0.5 - b.x) / b.rx;
                    const dy = Math.abs(y + 0.5 - b.y) / b.ry;
                    return dx * dx + dy * dy < (1 + wobble) ** 2;
                });
                if (!closed) {
                    open[x + y * sizeX] = 1;
                }
            }
        }
    }
    for (const lane of plan.lanes) {
        const half = lane.width / 2 + LANE_WOBBLE + 1;
        let x0 = Infinity;
        let y0 = Infinity;
        let x1 = -Infinity;
        let y1 = -Infinity;
        for (const p of lane.points) {
            x0 = Math.min(x0, p.x);
            y0 = Math.min(y0, p.y);
            x1 = Math.max(x1, p.x);
            y1 = Math.max(y1, p.y);
        }
        for (let y = Math.floor(y0 - half); y <= Math.ceil(y1 + half); y++) {
            for (let x = Math.floor(x0 - half); x <= Math.ceil(x1 + half); x++) {
                if (!inside(x, y)) {
                    continue;
                }
                let d = Infinity;
                for (let k = 1; k < lane.points.length; k++) {
                    d = Math.min(d, segmentDistance(x + 0.5, y + 0.5, lane.points[k - 1], lane.points[k]));
                }
                const wobble = (laneNoise(x / 10, y / 10) - 0.5) * 2 * LANE_WOBBLE;
                if (d < lane.width / 2 + wobble) {
                    open[x + y * sizeX] = 1;
                }
            }
        }
    }
    for (const n of plan.nodes) {
        const reach = n.r * (1 + NODE_WOBBLE) + 1;
        for (let y = Math.floor(n.y - reach); y <= Math.ceil(n.y + reach); y++) {
            for (let x = Math.floor(n.x - reach); x <= Math.ceil(n.x + reach); x++) {
                if (!inside(x, y)) {
                    continue;
                }
                const d = fm.hypot(x + 0.5 - n.x, y + 0.5 - n.y);
                const wobble = (nodeNoise(x / 9, y / 9) - 0.5) * 2 * NODE_WOBBLE * n.r;
                if (d < n.r + wobble) {
                    open[x + y * sizeX] = 1;
                }
            }
        }
    }
    return open;
}

// Pieces of tiles with the same value, by touching sides: a label per tile and each piece's size
function pieces(mask: Uint8Array, sizeX: number, sizeY: number, value: number): { label: Int32Array; sizes: number[] } {
    const label = new Int32Array(mask.length).fill(-1);
    const sizes: number[] = [];
    const queue = new Int32Array(mask.length);
    for (let start = 0; start < mask.length; start++) {
        if (mask[start] !== value || label[start] >= 0) {
            continue;
        }
        const id = sizes.length;
        let head = 0;
        let tail = 0;
        queue[tail++] = start;
        label[start] = id;
        while (head < tail) {
            const i = queue[head++];
            const x = i % sizeX;
            const y = (i / sizeX) | 0;
            for (const [nx, ny] of [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
            ]) {
                if (nx < 0 || ny < 0 || nx >= sizeX || ny >= sizeY) {
                    continue;
                }
                const j = nx + ny * sizeX;
                if (mask[j] === value && label[j] < 0) {
                    label[j] = id;
                    queue[tail++] = j;
                }
            }
        }
        sizes.push(tail);
    }
    return { label, sizes };
}

// The lanes the route takes, camp to guardian
export function routeLanes(layout: Pick<RiftLayout, "lanes" | "route">): LayoutLane[] {
    const { lanes, route } = layout;
    return lanes.filter((l) => route.some((a, k) => k > 0 && ((route[k - 1] === l.from && a === l.to) || (route[k - 1] === l.to && a === l.from))));
}

// Walking distance from a tile over the open ground, in steps
export function openDistances(open: Uint8Array, sizeX: number, sizeY: number, from: Point): Int32Array {
    const distance = new Int32Array(open.length).fill(-1);
    const start = Math.floor(from.x) + Math.floor(from.y) * sizeX;
    if (!open[start]) {
        return distance;
    }
    const queue = new Int32Array(open.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    distance[start] = 0;
    while (head < tail) {
        const i = queue[head++];
        const x = i % sizeX;
        const y = (i / sizeX) | 0;
        for (const [nx, ny] of [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
        ]) {
            const j = nx + ny * sizeX;
            if (nx >= 0 && ny >= 0 && nx < sizeX && ny < sizeY && open[j] && distance[j] < 0) {
                distance[j] = distance[i] + 1;
                queue[tail++] = j;
            }
        }
    }
    return distance;
}

// Tidies the open ground: specks of closed ground in it opened, and whatever's cut off from the
// camp closed
function tidy(open: Uint8Array, sizeX: number, sizeY: number, camp: Point): void {
    const closed = pieces(open, sizeX, sizeY, 0);
    for (let i = 0; i < open.length; i++) {
        if (!open[i] && closed.sizes[closed.label[i]] < SPECK) {
            open[i] = 1;
        }
    }
    const reached = openDistances(open, sizeX, sizeY, camp);
    for (let i = 0; i < open.length; i++) {
        if (open[i] && reached[i] < 0) {
            open[i] = 0;
        }
    }
}

// Which closed tiles fall away rather than rise
function deepen(request: LayoutRequest, plan: Plan, open: Uint8Array): Uint8Array {
    const { sizeX, sizeY, seed, deep } = request;
    const mask = new Uint8Array(open.length);
    if (deep === "none") {
        return mask;
    }
    if (deep === "all") {
        for (let i = 0; i < open.length; i++) {
            mask[i] = open[i] ? 0 : 1;
        }
        return mask;
    }
    // The heart: closed ground nearer the guardian's middle than the ring's, for a loop
    const guardian = plan.nodes[plan.guardian];
    const pools = createNoise(seed + 47, 2);
    let ringRadius = 0;
    if (request.kind === "loop") {
        const ring = plan.nodes.filter((n) => n.role !== "nook" && n.role !== "guardian");
        ringRadius = ring.reduce((sum, n) => sum + fm.hypot(n.x - guardian.x, n.y - guardian.y), 0) / Math.max(ring.length, 1);
    }
    for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
            const i = x + y * sizeX;
            if (open[i]) {
                continue;
            }
            if (request.kind === "loop" && fm.hypot(x + 0.5 - guardian.x, y + 0.5 - guardian.y) < ringRadius * 0.82) {
                mask[i] = 1;
            } else if (request.kind === "isles") {
                mask[i] = 1;
            } else if (deep === "pools" && pools(x / 34, y / 34) > 0.6) {
                mask[i] = 1;
            }
        }
    }
    // Water's no use in strips: open it out to a few tiles across or leave it out
    const shrink = (from: Uint8Array, set: number) => {
        const to = from.slice();
        for (let y = 1; y < sizeY - 1; y++) {
            for (let x = 1; x < sizeX - 1; x++) {
                const i = x + y * sizeX;
                if (from[i] === set && (from[i - 1] !== set || from[i + 1] !== set || from[i - sizeX] !== set || from[i + sizeX] !== set)) {
                    to[i] = 1 - set;
                }
            }
        }
        return to;
    };
    let opened = mask;
    for (let k = 0; k < 2; k++) {
        opened = shrink(opened, 1);
    }
    for (let k = 0; k < 2; k++) {
        opened = shrink(opened, 0);
    }
    for (let i = 0; i < opened.length; i++) {
        opened[i] = opened[i] && !open[i] ? 1 : 0;
    }
    return opened;
}

export function planLayout(request: LayoutRequest): RiftLayout {
    const { sizeX, sizeY, seed } = request;
    const rng = createRng(seed * 7 + 13);
    let plan = PLANNERS[request.kind](rng, request);
    keepApart(plan);
    let open: Uint8Array = new Uint8Array(0);
    let distance: Int32Array = new Int32Array(0);
    // The guardian's arena has to be the far end: a nook that reaches further goes
    for (let tries = 0; tries < 8; tries++) {
        open = rasterise(request, plan);
        const camp = plan.nodes[plan.camp];
        tidy(open, sizeX, sizeY, camp);
        distance = openDistances(open, sizeX, sizeY, camp);
        const guardian = plan.nodes[plan.guardian];
        const atGuardian = distance[Math.floor(guardian.x) + Math.floor(guardian.y) * sizeX];
        let worst = -1;
        let worstDistance = atGuardian + guardian.r - GUARDIAN_LEAD;
        plan.nodes.forEach((n, i) => {
            if (n.role !== "nook") {
                return;
            }
            const d = distance[Math.floor(n.x) + Math.floor(n.y) * sizeX] + n.r;
            if (d > worstDistance) {
                worst = i;
                worstDistance = d;
            }
        });
        if (worst < 0) {
            break;
        }
        plan = dropNode(plan, worst);
    }
    const deep = deepen(request, plan, open);
    return { kind: request.kind, sizeX, sizeY, open, deep, ...plan, distance };
}

function dropNode(plan: Plan, drop: number): Plan {
    const map = (i: number) => (i > drop ? i - 1 : i);
    return {
        nodes: plan.nodes.filter((_, i) => i !== drop),
        lanes: plan.lanes.filter((l) => l.from !== drop && l.to !== drop).map((l) => ({ ...l, from: map(l.from), to: map(l.to) })),
        blocks: plan.blocks,
        camp: map(plan.camp),
        guardian: map(plan.guardian),
        route: plan.route.filter((i) => i !== drop).map(map),
        rooms: plan.rooms?.filter((i) => i !== drop).map(map),
    };
}
