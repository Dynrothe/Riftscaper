// Line of sight over a grid's tiles: whether one tile can see another, by the collision flags the
// client keeps for what a shot can pass (OBJECT_PROJECTILE_BLOCKER and the WALL_*_PROJECTILE_BLOCKER
// ones, which SceneBuilder sets from each loc's blocksProjectile). A wall, a rock or a floor's
// pillar stops it; a fence, a low wall, a crate or water doesn't. What a monster's eyes take in on
// top of this (how far, a cone, how lit) is the game's.
//
// It's in integers, from tile middle to tile middle, so the sim can use it and every machine
// agrees, and it's symmetric: if one tile sees another, that one sees it back.
import { CollisionFlag } from "../rs/pathfinder/flag/CollisionFlag";
import type { ArenaGrid } from "./ArenaGrid";

// What canSee needs of a grid
export type SightGrid = Pick<ArenaGrid, "contains" | "getFlags">;

const F = CollisionFlag;

// Whether sight crosses the edge from a tile to the one beside it (one of dx, dy is 0): a wall
// that stops shots on either side of the edge stops it
function crossesEdge(grid: SightGrid, x: number, y: number, dx: number, dy: number): boolean {
    const toX = x + dx;
    const toY = y + dy;
    if (!grid.contains(toX, toY)) {
        return false;
    }
    const from = grid.getFlags(x, y);
    const to = grid.getFlags(toX, toY);
    if (dx === 1) {
        return (
            (from & F.WALL_EAST_PROJECTILE_BLOCKER) === 0 &&
            (to & F.WALL_WEST_PROJECTILE_BLOCKER) === 0
        );
    }
    if (dx === -1) {
        return (
            (from & F.WALL_WEST_PROJECTILE_BLOCKER) === 0 &&
            (to & F.WALL_EAST_PROJECTILE_BLOCKER) === 0
        );
    }
    if (dy === 1) {
        return (
            (from & F.WALL_NORTH_PROJECTILE_BLOCKER) === 0 &&
            (to & F.WALL_SOUTH_PROJECTILE_BLOCKER) === 0
        );
    }
    return (
        (from & F.WALL_SOUTH_PROJECTILE_BLOCKER) === 0 &&
        (to & F.WALL_NORTH_PROJECTILE_BLOCKER) === 0
    );
}

// Whether sight goes into a tile on its way somewhere else: not through a rock or a pillar
function seesThrough(grid: SightGrid, x: number, y: number): boolean {
    return (grid.getFlags(x, y) & F.OBJECT_PROJECTILE_BLOCKER) === 0;
}

// Whether a step of sight from a tile to the next along the line is clear: over the edge, and
// into the next tile unless it's the last (a light on a table, a monster at a pillar's foot are
// still seen). A diagonal step, where the line goes through a corner exactly, is clear if
// either way round the corner is.
function stepClear(
    grid: SightGrid,
    x: number,
    y: number,
    dx: number,
    dy: number,
    last: boolean,
): boolean {
    if (dx !== 0 && dy !== 0) {
        const viaX =
            crossesEdge(grid, x, y, dx, 0) &&
            seesThrough(grid, x + dx, y) &&
            crossesEdge(grid, x + dx, y, 0, dy);
        const around =
            viaX ||
            (crossesEdge(grid, x, y, 0, dy) &&
                seesThrough(grid, x, y + dy) &&
                crossesEdge(grid, x, y + dy, dx, 0));
        return around && (last || seesThrough(grid, x + dx, y + dy));
    }
    return crossesEdge(grid, x, y, dx, dy) && (last || seesThrough(grid, x + dx, y + dy));
}

// Whether the tile at (x0, y0) can see the tile at (x1, y1): positions in world tiles, fractions
// dropped, so it's the tiles that are looked between. Every tile the line between their middles
// goes through is checked, and neither end blocks it. Outside the grid sees nothing.
export function canSee(grid: SightGrid, x0: number, y0: number, x1: number, y1: number): boolean {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const toX = Math.floor(x1);
    const toY = Math.floor(y1);
    if (!grid.contains(x, y) || !grid.contains(toX, toY)) {
        return false;
    }
    const nx = Math.abs(toX - x);
    const ny = Math.abs(toY - y);
    const sx = toX > x ? 1 : -1;
    const sy = toY > y ? 1 : -1;
    // Steps taken across columns and rows. The line crosses its next column at (0.5 + ix) / nx of
    // the way and its next row at (0.5 + iy) / ny, compared without dividing
    let ix = 0;
    let iy = 0;
    while (ix < nx || iy < ny) {
        const decision = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
        let dx = 0;
        let dy = 0;
        if (decision === 0) {
            dx = sx;
            dy = sy;
        } else if (decision < 0) {
            dx = sx;
        } else {
            dy = sy;
        }
        const last = ix + (dx !== 0 ? 1 : 0) === nx && iy + (dy !== 0 ? 1 : 0) === ny;
        if (!stepClear(grid, x, y, dx, dy, last)) {
            return false;
        }
        if (dx !== 0) {
            x += dx;
            ix++;
        }
        if (dy !== 0) {
            y += dy;
            iy++;
        }
    }
    return true;
}
