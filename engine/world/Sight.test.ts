import { canSee } from "./Sight";
import { makeGrid } from "./testGrid";

// makeGrid's rows run north to south from (100, 200): the tile at row r, column c is
// (100 + c, 200 + rows - 1 - r)
function at(rows: string[], c: number, r: number): [number, number] {
    return [100 + c, 200 + rows.length - 1 - r];
}

describe("canSee", () => {
    it("sees across open ground, water and things that only stop walking", () => {
        const rows = [
            ".......", //
            ".#.~.o.",
            ".......",
        ];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 0, 1), ...at(rows, 6, 1))).toBe(true);
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 6, 2))).toBe(true);
    });

    it("is stopped by a rock or a pillar, not a crate", () => {
        const rows = [
            ".....", //
            "..@..",
            ".....",
        ];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 0, 1), ...at(rows, 4, 1))).toBe(false);
        // Past it, above and below
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 4, 0))).toBe(true);
        expect(canSee(grid, ...at(rows, 0, 2), ...at(rows, 4, 2))).toBe(true);
    });

    it("lets a fence by and stops a wall", () => {
        const fence = [
            ".|...", //
        ];
        const wall = [
            ".]...", //
        ];
        expect(canSee(makeGrid(fence), ...at(fence, 0, 0), ...at(fence, 4, 0))).toBe(true);
        expect(canSee(makeGrid(wall), ...at(wall, 0, 0), ...at(wall, 4, 0))).toBe(false);
        // Only the edge it's on: from the wall's own tile, westwards is open
        expect(canSee(makeGrid(wall), ...at(wall, 1, 0), ...at(wall, 0, 0))).toBe(true);
        expect(canSee(makeGrid(wall), ...at(wall, 2, 0), ...at(wall, 1, 0))).toBe(false);
    });

    it("stops at a wall on a tile's north side, both ways", () => {
        const rows = [
            "...", //
            ".=.",
            "...",
        ];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 1, 2), ...at(rows, 1, 0))).toBe(false);
        expect(canSee(grid, ...at(rows, 1, 0), ...at(rows, 1, 2))).toBe(false);
        expect(canSee(grid, ...at(rows, 0, 2), ...at(rows, 0, 0))).toBe(true);
    });

    it("doesn't squeeze between two rocks touching at a corner", () => {
        const rows = [
            "....", //
            "..@.",
            ".@..",
            "....",
        ];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 1, 1), ...at(rows, 2, 2))).toBe(false);
        expect(canSee(grid, ...at(rows, 2, 2), ...at(rows, 1, 1))).toBe(false);
        // One rock at a corner leaves the other way round it
        const one = [
            "...", //
            ".@.",
            "...",
        ];
        expect(canSee(makeGrid(one), ...at(one, 0, 1), ...at(one, 1, 2))).toBe(true);
        expect(canSee(makeGrid(one), ...at(one, 1, 2), ...at(one, 0, 1))).toBe(true);
        // and a line that goes through it is stopped
        expect(canSee(makeGrid(one), ...at(one, 0, 0), ...at(one, 1, 2))).toBe(false);
    });

    it("still sees something standing at a pillar or on a table", () => {
        const rows = [
            "..@", //
        ];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 2, 0))).toBe(true);
        expect(canSee(grid, ...at(rows, 2, 0), ...at(rows, 0, 0))).toBe(true);
    });

    it("sees nothing outside the grid", () => {
        const rows = ["..."];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 0, 0), 90, 200)).toBe(false);
        expect(canSee(grid, 90, 200, ...at(rows, 0, 0))).toBe(false);
    });

    it("agrees with a floor's pillars", () => {
        const rows = ["....."];
        const grid = makeGrid(rows);
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 4, 0))).toBe(true);
        grid.dropTile(...at(rows, 2, 0), true);
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 4, 0))).toBe(false);
        // A fallen tile is a hole, and sight goes over it
        grid.restoreTile(...at(rows, 2, 0));
        grid.dropTile(...at(rows, 2, 0));
        expect(canSee(grid, ...at(rows, 0, 0), ...at(rows, 4, 0))).toBe(true);
    });

    it("is the same both ways between every pair of tiles", () => {
        const rows = [
            "..@.....]..", //
            ".=...@@....",
            "...|....=..",
            "@....#..@..",
            "..]...@....",
            ".......=...",
            "....@......",
        ];
        const grid = makeGrid(rows);
        const tiles: [number, number][] = [];
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[0].length; c++) {
                tiles.push(at(rows, c, r));
            }
        }
        let seen = 0;
        let hidden = 0;
        for (const [ax, ay] of tiles) {
            for (const [bx, by] of tiles) {
                const there = canSee(grid, ax, ay, bx, by);
                expect([ax, ay, bx, by, canSee(grid, bx, by, ax, ay)]).toEqual([
                    ax,
                    ay,
                    bx,
                    by,
                    there,
                ]);
                if (there) {
                    seen++;
                } else {
                    hidden++;
                }
            }
        }
        // It's a real test of both answers
        expect(seen).toBeGreaterThan(0);
        expect(hidden).toBeGreaterThan(0);
    });

    it("takes positions within tiles as the tiles they're in", () => {
        const rows = [
            ".....", //
            "..@..",
            ".....",
        ];
        const grid = makeGrid(rows);
        const [x0, y0] = at(rows, 0, 1);
        const [x1, y1] = at(rows, 4, 1);
        expect(canSee(grid, x0 + 0.9, y0 + 0.1, x1 + 0.2, y1 + 0.8)).toBe(false);
    });
});
