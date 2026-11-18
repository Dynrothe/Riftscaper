import { describe, expect, it } from "vitest";

import { LAYOUT_KINDS, LayoutKind, LayoutRequest, NEXUS_ROOMS, planLayout, routeLanes } from "./riftLayout";

// A rift's grid: three map squares of arena and one of margin round them (zoneGen.ts)
const SIZE = 320;
const ARENA = { x0: 64, y0: 64, x1: 255, y1: 255 };
const DEEP: Record<LayoutKind, LayoutRequest["deep"]> = { trail: "pools", loop: "heart", arms: "none", isles: "all", field: "pools", nexus: "none", pit: "none" };
// The share of the arena each kind leaves open, at the least and the most
const OPEN: Record<LayoutKind, [number, number]> = {
    trail: [0.22, 0.5],
    loop: [0.18, 0.4],
    arms: [0.15, 0.35],
    isles: [0.12, 0.4],
    field: [0.35, 0.7],
    nexus: [0.1, 0.3],
    pit: [0.04, 0.15],
};
// The biomes' kinds, and the Tombs' and the Colosseum's own
const KINDS: LayoutKind[] = [...LAYOUT_KINDS, "nexus", "pit"];
const SEEDS = [1, 2, 3, 7, 11, 19, 23, 42];

function plan(kind: LayoutKind, seed: number) {
    return planLayout({ kind, seed, sizeX: SIZE, sizeY: SIZE, arena: ARENA, corner: seed % 4, deep: DEEP[kind] });
}

const at = (x: number, y: number) => Math.floor(x) + Math.floor(y) * SIZE;

describe("rift layouts", () => {
    it("are the same from the same seed", () => {
        for (const kind of KINDS) {
            const a = plan(kind, 5);
            const b = plan(kind, 5);
            expect(Array.from(a.open)).toEqual(Array.from(b.open));
            expect(Array.from(a.deep)).toEqual(Array.from(b.deep));
            expect(a.route).toEqual(b.route);
        }
    });

    for (const kind of KINDS) {
        it(`${kind}: open ground all one piece, inside the arena, in its kind's share`, () => {
            for (const seed of SEEDS) {
                const layout = plan(kind, seed);
                // Counted rather than expected a tile at a time, which is slow enough to time out
                let open = 0;
                let cutOff = 0;
                let atEdge = 0;
                let fallen = 0;
                for (let y = 0; y < SIZE; y++) {
                    for (let x = 0; x < SIZE; x++) {
                        const i = x + y * SIZE;
                        if (!layout.open[i]) {
                            continue;
                        }
                        open++;
                        // Walkable from the camp, and never at the arena's edge
                        cutOff += layout.distance[i] < 0 ? 1 : 0;
                        atEdge += x >= ARENA.x0 + 10 && x <= ARENA.x1 - 10 && y >= ARENA.y0 + 10 && y <= ARENA.y1 - 10 ? 0 : 1;
                        // What falls away is never walked
                        fallen += layout.deep[i] ? 1 : 0;
                    }
                }
                expect({ seed, cutOff, atEdge, fallen }).toEqual({ seed, cutOff: 0, atEdge: 0, fallen: 0 });
                const share = open / ((ARENA.x1 - ARENA.x0 + 1) * (ARENA.y1 - ARENA.y0 + 1));
                expect(share).toBeGreaterThanOrEqual(OPEN[kind][0]);
                expect(share).toBeLessThanOrEqual(OPEN[kind][1]);
            }
        });

        it(`${kind}: the route runs from the camp to the guardian, and every nook's nearer than it`, () => {
            for (const seed of SEEDS) {
                const layout = plan(kind, seed);
                const { nodes, route } = layout;
                expect(route[0]).toBe(layout.camp);
                expect(route[route.length - 1]).toBe(layout.guardian);
                const guardian = nodes[layout.guardian];
                const toGuardian = layout.distance[at(guardian.x, guardian.y)];
                expect(toGuardian).toBeGreaterThan(0);
                for (const i of route) {
                    expect(layout.distance[at(nodes[i].x, nodes[i].y)]).toBeGreaterThanOrEqual(0);
                }
                for (const n of nodes) {
                    if (n.role === "nook") {
                        const d = layout.distance[at(n.x, n.y)];
                        expect(d).toBeGreaterThanOrEqual(0);
                        expect(d).toBeLessThan(toGuardian);
                    }
                }
                // A lane for each step of it
                expect(routeLanes(layout).length).toBeGreaterThanOrEqual(route.length - 1);
            }
        });
    }

    it("nexus: a chamber for each path round the hall, each a short walk from the camp, and the hall the guardian's", () => {
        for (const seed of SEEDS) {
            const layout = plan("nexus", seed);
            const { nodes } = layout;
            const walk = (i: number) => layout.distance[at(nodes[i].x, nodes[i].y)];
            expect(layout.route).toEqual([layout.camp, layout.guardian]);
            expect(walk(layout.guardian)).toBeLessThan(70);
            const rooms = layout.rooms ?? [];
            expect(rooms.length).toBe(NEXUS_ROOMS);
            for (const i of rooms) {
                expect(nodes[i].role).toBe("room");
                // Reached through the hall, and none at the end of a long walk
                expect(walk(i)).toBeGreaterThan(walk(layout.guardian));
                expect(walk(i)).toBeLessThan(150);
                expect(nodes[i].r).toBeGreaterThanOrEqual(12);
            }
        }
    });

    it("pit: the sand just past the camp's gate, and nothing else", () => {
        for (const seed of SEEDS) {
            const layout = plan("pit", seed);
            const { nodes } = layout;
            const sand = nodes[layout.guardian];
            expect(layout.route).toEqual([layout.camp, layout.guardian]);
            expect(layout.rooms).toBeUndefined();
            expect(nodes.length).toBe(2);
            expect(sand.r).toBeGreaterThanOrEqual(24);
            // The sand's edge a few seconds' walk from the camp, its middle not much further
            expect(layout.distance[at(sand.x, sand.y)]).toBeLessThan(70);
        }
    });

    it("puts the camp in the corner it's asked for", () => {
        for (const kind of KINDS) {
            for (let corner = 0; corner < 4; corner++) {
                const layout = planLayout({ kind, seed: 3, sizeX: SIZE, sizeY: SIZE, arena: ARENA, corner, deep: DEEP[kind] });
                const camp = layout.nodes[layout.camp];
                const midX = (ARENA.x0 + ARENA.x1) / 2;
                const midY = (ARENA.y0 + ARENA.y1) / 2;
                expect(camp.x > midX).toBe((corner & 1) === 1);
                expect(camp.y > midY).toBe((corner & 2) === 2);
            }
        }
    });
});
