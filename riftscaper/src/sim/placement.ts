// Where things go on a rift's land, once its collision's built: how far every tile is from the
// spawn on foot, the boss and the way out at the far end of it, the waystone home by the camp, and
// the packs spread over the rest. Deterministic, from the Rng it's handed. The city has a layout
// too, from its own plan, for the hero's walking and the minimap.
import type { Rng } from "../../../engine/core/Rng";
import type { ArenaGrid } from "../../../engine/world/ArenaGrid";
import { isCircleFree } from "../../../engine/world/Collision";
import { canStep } from "../../../engine/world/FlowField";
import { FEATURE_ROOM, FEATURE_SPACING, SHRINES, SHRINE_GROUND, SHRINE_IDS } from "../content/features";
import { PACK_AREA, PACK_SPACING } from "../content/rules";

export type Spot = { x: number; y: number };

export type Layout = {
    spawn: Spot;
    // A waystone by the camp that takes the hero home to the city (the spawn itself, in the city)
    waystone: Spot;
    // The way out: past a rift's boss, or the Archmage's portal in the city
    exit: Spot;
    boss: Spot;
    // Each pack's middle
    packs: Spot[];
    // Walking distance in tiles from the spawn, per arena tile (-1 unreached), for the minimap
    distance: Int32Array;
    reachable: number;
};

const STEPS: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

// Walking distance from a tile to every other, in steps (-1 where it can't get)
export function walkDistances(grid: ArenaGrid, fromX: number, fromY: number): Int32Array {
    const { baseX, baseY, sizeX, sizeY } = grid;
    const distance = new Int32Array(sizeX * sizeY).fill(-1);
    const sx = Math.floor(fromX) - baseX;
    const sy = Math.floor(fromY) - baseY;
    if (sx < 0 || sy < 0 || sx >= sizeX || sy >= sizeY) {
        return distance;
    }
    const queue = new Int32Array(sizeX * sizeY);
    let head = 0;
    let tail = 0;
    distance[sx + sy * sizeX] = 0;
    queue[tail++] = sx + sy * sizeX;
    while (head < tail) {
        const i = queue[head++];
        const x = i % sizeX;
        const y = (i / sizeX) | 0;
        const d = distance[i];
        for (const [dx, dy] of STEPS) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 1 || ny < 1 || nx >= sizeX - 1 || ny >= sizeY - 1) {
                continue;
            }
            const n = nx + ny * sizeX;
            if (distance[n] !== -1 || !canStep(grid, baseX + x, baseY + y, dx, dy)) {
                continue;
            }
            distance[n] = d + 1;
            queue[tail++] = n;
        }
    }
    return distance;
}

// A planned rift's (world/riftLayout.ts): the reachable tiles a pack (PACK_AREA), and the middle of
// its guardian's arena, where the boss stands whatever's further
export type LayoutPlan = { area?: number; guardian?: Spot };

// How far from a planned guardian's arena's middle its boss can stand
const GUARDIAN_REACH = 15;

// `packs` is how many packs against the usual, for a teeming rift: more of them, closer together
export function layOut(grid: ArenaGrid, spawn: Spot, rng: Rng, packs = 1, plan: LayoutPlan = {}): Layout {
    const area = plan.area ?? PACK_AREA.open;
    const { baseX, baseY, sizeX } = grid;
    const distance = walkDistances(grid, spawn.x, spawn.y);
    const open: number[] = [];
    let far = -1;
    let farDistance = -1;
    for (let i = 0; i < distance.length; i++) {
        const d = distance[i];
        if (d < 0) {
            continue;
        }
        open.push(i);
        // The far end: as far as can be walked, with room for a boss
        if (d > farDistance) {
            const x = baseX + (i % sizeX) + 0.5;
            const y = baseY + ((i / sizeX) | 0) + 0.5;
            if (isCircleFree(grid, x, y, 1.6)) {
                far = i;
                farDistance = d;
            }
        }
    }
    const at = (i: number): Spot => ({ x: baseX + (i % sizeX) + 0.5, y: baseY + ((i / sizeX) | 0) + 0.5 });
    if (plan.guardian) {
        const g = plan.guardian;
        let bestGap = GUARDIAN_REACH * GUARDIAN_REACH;
        for (const i of open) {
            const s = at(i);
            const gap = (s.x - g.x) ** 2 + (s.y - g.y) ** 2;
            if (gap < bestGap && isCircleFree(grid, s.x, s.y, 1.6)) {
                bestGap = gap;
                far = i;
                farDistance = distance[i];
            }
        }
    }
    const exit = far >= 0 ? at(far) : { x: spawn.x + 6, y: spawn.y + 6 };
    // The boss stands a few steps back from the way on, towards the spawn
    let boss = exit;
    const bossDistance = Math.max(0, farDistance - 7);
    let bestGap = Infinity;
    for (const i of open) {
        if (distance[i] !== bossDistance) {
            continue;
        }
        const s = at(i);
        const gap = Math.abs(s.x - exit.x) + Math.abs(s.y - exit.y);
        if (gap < bestGap && isCircleFree(grid, s.x, s.y, 1.2)) {
            bestGap = gap;
            boss = s;
        }
    }
    // The waystone, a few steps from the spawn
    let waystone = { x: spawn.x + 2, y: spawn.y + 1 };
    for (const [dx, dy] of [
        [2.5, 1.5],
        [-2.5, 1.5],
        [2.5, -1.5],
        [-2.5, -1.5],
        [0, 3],
        [3, 0],
    ]) {
        const x = spawn.x + dx;
        const y = spawn.y + dy;
        const i = Math.floor(x) - baseX + (Math.floor(y) - baseY) * sizeX;
        if (i >= 0 && i < distance.length && distance[i] >= 0 && isCircleFree(grid, x, y, 0.6)) {
            waystone = { x, y };
            break;
        }
    }
    // Packs: spread over what's reachable, not too near the spawn or the boss, and apart
    const want = Math.round(Math.max(16, Math.min(42, Math.round(open.length / area))) * packs);
    const spacing = PACK_SPACING / Math.sqrt(packs);
    const spots: Spot[] = [];
    const nearAny = (s: Spot, list: Spot[], r: number) => list.some((p) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < r * r);
    for (let tries = 0; tries < want * 60 && spots.length < want && open.length > 0; tries++) {
        const i = open[rng.int(open.length)];
        const s = at(i);
        // Not in the last stretch before the boss: in a planned rift, not near it, as there can
        // be ground further than it
        const byBoss = plan.guardian ? (s.x - boss.x) ** 2 + (s.y - boss.y) ** 2 < 14 * 14 : distance[i] > farDistance - 12;
        if (distance[i] < 34 || byBoss) {
            continue;
        }
        if (nearAny(s, spots, spacing) || !isCircleFree(grid, s.x, s.y, 0.9)) {
            continue;
        }
        spots.push(s);
    }
    return { spawn, waystone, exit, boss, packs: spots, distance, reachable: open.length };
}

// The largest shrine's tiles a side: a shrine's spot is chosen before which god's it is
const SHRINE_TILES = Math.max(...SHRINE_IDS.map((id) => SHRINES[id].size));

// How far the ground rises and falls, in scene units, under a feature of this many tiles a side
// on a spot (laid out as Game.raiseFeature lays it) and this many tiles round it: the highest of
// its tiles' corners less the lowest
export function groundRise(grid: ArenaGrid, s: Spot, size: number, margin: number): number {
    const x0 = Math.floor(s.x) - Math.floor((size - 1) / 2) - margin;
    const y0 = Math.floor(s.y) - Math.floor((size - 1) / 2) - margin;
    const corners = size + margin * 2;
    let low = Infinity;
    let high = -Infinity;
    for (let y = y0; y <= y0 + corners; y++) {
        for (let x = x0; x <= x0 + corners; x++) {
            const h = grid.getHeight(x, y);
            low = Math.min(low, h);
            high = Math.max(high, h);
        }
    }
    return high - low;
}

// And on the ladder its encounter's (content/encounters.ts), anywhere a chest could be
export type FeatureSpots = { chests: Spot[]; shrines: Spot[]; hoard?: Spot; encounter: Spot[] };

// Where a rift's chests, shrines and guarded hoard go (content/features.ts): reachable, past the
// camp and short of the guardian, off the packs and apart. The hoard stands at one of the
// generator's landmarks where one can be reached, so it's a ruin that's guarded; else anywhere
// halfway out or further. Chests go in a planned rift's nooks first, the dead ends off its way, so
// there's always something at the end of one (as Diablo II's false tombs have a chest).
export function placeFeatures(
    grid: ArenaGrid,
    layout: Layout,
    rng: Rng,
    sites: readonly Spot[],
    counts: { chests: number; shrines: number; hoard: boolean; encounter?: number },
    nooks: readonly Spot[] = [],
): FeatureSpots {
    const { baseX, baseY, sizeX } = grid;
    const distance = layout.distance;
    const index = (s: Spot) => Math.floor(s.x) - baseX + (Math.floor(s.y) - baseY) * sizeX;
    const far = distance[index(layout.exit)] ?? 0;
    const at = (i: number): Spot => ({ x: baseX + (i % sizeX) + 0.5, y: baseY + ((i / sizeX) | 0) + 0.5 });
    const near = (s: Spot, list: readonly Spot[], r: number) => list.some((p) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < r * r);
    const taken: Spot[] = [];
    const fits = (s: Spot, from: number, room: number): boolean => {
        const d = distance[index(s)] ?? -1;
        return (
            d >= from &&
            d <= far - FEATURE_SPACING.boss &&
            isCircleFree(grid, s.x, s.y, room) &&
            !near(s, layout.packs, FEATURE_SPACING.pack) &&
            !near(s, taken, FEATURE_SPACING.apart) &&
            !near(s, [layout.boss], FEATURE_SPACING.boss)
        );
    };
    const open: number[] = [];
    for (let i = 0; i < distance.length; i++) {
        if (distance[i] >= FEATURE_SPACING.spawn) {
            open.push(i);
        }
    }
    const pick = (from: number, room: number): Spot | undefined => {
        for (let tries = 0; tries < 200 && open.length > 0; tries++) {
            const s = at(open[rng.int(open.length)]);
            if (fits(s, from, room)) {
                taken.push(s);
                return s;
            }
        }
        return undefined;
    };
    let hoard: Spot | undefined;
    if (counts.hoard) {
        const half = Math.round(far * 0.4);
        const shuffled = [...sites];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = rng.int(i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        for (const site of shuffled) {
            // Beside the landmark, not in it
            for (let r = 2; r <= 5 && !hoard; r++) {
                for (const [dx, dy] of RING) {
                    const s = { x: Math.floor(site.x + dx * r) + 0.5, y: Math.floor(site.y + dy * r) + 0.5 };
                    if (fits(s, half, FEATURE_ROOM.hoard)) {
                        hoard = s;
                        break;
                    }
                }
            }
            if (hoard) {
                taken.push(hoard);
                break;
            }
        }
        hoard ??= pick(half, FEATURE_ROOM.hoard);
    }
    const chests: Spot[] = [];
    for (const nook of nooks) {
        if (chests.length >= counts.chests) {
            break;
        }
        // At the nook's middle or near it
        let found: Spot | undefined;
        for (let r = 0; r <= 7 && !found; r++) {
            for (const [dx, dy] of r === 0 ? [[0, 0]] : RING) {
                const s = { x: Math.floor(nook.x + dx * r) + 0.5, y: Math.floor(nook.y + dy * r) + 0.5 };
                if (fits(s, FEATURE_SPACING.spawn, FEATURE_ROOM.chest)) {
                    found = s;
                    break;
                }
            }
        }
        if (found) {
            taken.push(found);
            chests.push(found);
        }
    }
    // As it always was, without nooks
    for (let i = chests.length; i < counts.chests; i++) {
        const s = pick(FEATURE_SPACING.spawn, FEATURE_ROOM.chest);
        if (s) {
            chests.push(s);
        }
    }
    // A shrine on the flattest ground there's room for (SHRINE_GROUND): any spot that fits and is
    // within `flat` of level, or the flattest there are where none is
    const shrines: Spot[] = [];
    for (let i = 0; i < counts.shrines; i++) {
        const flat: Spot[] = [];
        let limit = Infinity;
        for (const tile of open) {
            const s = at(tile);
            if (!fits(s, FEATURE_SPACING.spawn, FEATURE_ROOM.shrine)) {
                continue;
            }
            const rise = Math.max(SHRINE_GROUND.flat, groundRise(grid, s, SHRINE_TILES, SHRINE_GROUND.margin));
            if (rise < limit) {
                limit = rise;
                flat.length = 0;
            }
            if (rise === limit) {
                flat.push(s);
            }
        }
        if (flat.length > 0) {
            const s = flat[rng.int(flat.length)];
            taken.push(s);
            shrines.push(s);
        }
    }
    // Last, so the rest are where they always were
    const encounter: Spot[] = [];
    for (let i = 0; i < (counts.encounter ?? 0); i++) {
        const s = pick(FEATURE_SPACING.spawn, FEATURE_ROOM.hoard);
        if (s) {
            encounter.push(s);
        }
    }
    return { chests, shrines, hoard, encounter };
}

const RING: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.7, 0.7],
    [-0.7, 0.7],
    [0.7, -0.7],
    [-0.7, -0.7],
];

// The city's: no packs and no boss, the portal where its plan says, and how far everything is
export function townLayout(grid: ArenaGrid, spawn: Spot, portal: Spot): Layout {
    const distance = walkDistances(grid, spawn.x, spawn.y);
    let reachable = 0;
    for (let i = 0; i < distance.length; i++) {
        if (distance[i] >= 0) {
            reachable++;
        }
    }
    return { spawn, waystone: spawn, exit: portal, boss: portal, packs: [], distance, reachable };
}

// A free spot for a monster near a pack's middle
export function spotNear(grid: ArenaGrid, rng: Rng, at: Spot, spread: number, radius: number): Spot {
    for (let tries = 0; tries < 12; tries++) {
        const x = at.x + (rng.next() - 0.5) * 2 * spread;
        const y = at.y + (rng.next() - 0.5) * 2 * spread;
        if (isCircleFree(grid, x, y, radius)) {
            return { x, y };
        }
    }
    return at;
}
