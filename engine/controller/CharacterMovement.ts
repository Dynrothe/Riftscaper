// A character controller for a top-down world, a tick at a time: what's pressed
// (a direction of length 0 or 1, x east and y north, as GameInput gives it)
// becomes a step through the world's collision, and the way the character faces.
// It only writes the body it's given, so the same rules can move a copy of it
// too (a co-op guest's prediction of their own character). Timers, animations and
// whatever else moving means to a game stay with the game.
import { fm } from "../core/fmath";
import type { ArenaGrid } from "../world/ArenaGrid";
import { moveCircle } from "../world/Collision";

export type MoveBounds = { minX: number; minY: number; maxX: number; maxY: number };

export type MoveRules = {
    // The body's radius, in tiles
    radius: number;
    // Tiles a tick at a walk
    speed: number;
    // Can't move (frozen, stunned)
    frozen: boolean;
    // Frozen, but still turning to face what's pressed (rooted and watching something)
    held: boolean;
    // What's pressed, turned first: x and y times this (scrambled controls)
    steer?: readonly [number, number, number, number];
    // Kept inside this box (a boss's arena)
    bounds?: MoveBounds;
    // Turned to face this spot whatever's pressed
    faces?: { x: number; y: number };
    // The ground under them: faster or slower by pace; and on ice, glide is how far they went
    // last tick, which they keep, getting grip of the way from it to where they're steering
    // each tick (it's left as how far they went)
    surface?: { pace: number; glide?: { x: number; y: number; grip: number } };
};

export type CharacterBody = {
    x: number;
    y: number;
    // RS yaw (yawFromVector)
    yaw: number;
    // The way they face, as a unit vector
    facingX?: number;
    facingY?: number;
};

// Moves the body by what's pressed, for ticks ticks (a fraction for a smaller
// step). Whether they moved under their own steam.
export function moveCharacter(
    grid: ArenaGrid,
    body: CharacterBody,
    moveX: number,
    moveY: number,
    rules: MoveRules,
    ticks = 1,
): boolean {
    if (rules.steer) {
        const [a, b, c, d] = rules.steer;
        const x = moveX * a + moveY * b;
        moveY = moveX * c + moveY * d;
        moveX = x;
    }
    const input = moveX !== 0 || moveY !== 0;
    const moving = !rules.frozen && input;
    const glide = rules.surface?.glide;
    if (glide && ticks > 0) {
        // Sliding: what they had, turned only a little towards where they're steering
        const speed = rules.speed * rules.surface!.pace;
        const wantX = moving ? moveX * speed : 0;
        const wantY = moving ? moveY * speed : 0;
        const vx = glide.x + (wantX - glide.x) * glide.grip;
        const vy = glide.y + (wantY - glide.y) * glide.grip;
        const fromX = body.x;
        const fromY = body.y;
        moveCircle(grid, body, vx * ticks, vy * ticks, rules.radius);
        glide.x = (body.x - fromX) / ticks;
        glide.y = (body.y - fromY) / ticks;
    } else if (moving && ticks > 0) {
        const speed = rules.speed * (rules.surface?.pace ?? 1);
        moveCircle(grid, body, moveX * speed * ticks, moveY * speed * ticks, rules.radius);
    }
    const faces = rules.faces;
    const toX = faces ? faces.x - body.x : 0;
    const toY = faces ? faces.y - body.y : 0;
    if (faces && (toX !== 0 || toY !== 0)) {
        const len = fm.hypot(toX, toY);
        body.facingX = toX / len;
        body.facingY = toY / len;
        body.yaw = yawFromVector(toX, toY);
    } else if (moving || (rules.frozen && rules.held && input)) {
        const len = fm.hypot(moveX, moveY);
        body.facingX = moveX / len;
        body.facingY = moveY / len;
        body.yaw = yawFromVector(moveX, moveY);
    }
    if (rules.bounds) {
        const bounds = rules.bounds;
        const edge = rules.radius;
        body.x = Math.max(bounds.minX + edge, Math.min(bounds.maxX - edge, body.x));
        body.y = Math.max(bounds.minY + edge, Math.min(bounds.maxY - edge, body.y));
    }
    return moving;
}

// A follower's tick (a pet, a summoned helper): towards its goal, stopping `stop` short of
// it, at most `speed`, and through walls only if it's a ghost. Whether it had ground to cover.
export function walkToward(
    grid: ArenaGrid,
    body: Pick<CharacterBody, "x" | "y" | "yaw">,
    goalX: number,
    goalY: number,
    stop: number,
    speed: number,
    radius: number,
    ghost = false,
): boolean {
    const dx = goalX - body.x;
    const dy = goalY - body.y;
    const distance = fm.hypot(dx, dy);
    if (!(distance > stop)) {
        return false;
    }
    const move = Math.min(speed, distance - stop);
    const moveX = (dx / distance) * move;
    const moveY = (dy / distance) * move;
    if (ghost) {
        body.x += moveX;
        body.y += moveY;
    } else {
        moveCircle(grid, body, moveX, moveY, radius);
    }
    body.yaw = yawFromVector(dx, dy);
    return true;
}

// RS yaw (0 south, 512 west, 1024 north, 1536 east) for a direction.
export function yawFromVector(dx: number, dy: number): number {
    return Math.round((fm.atan2(-dx, -dy) / (2 * Math.PI)) * 2048) & 2047;
}
