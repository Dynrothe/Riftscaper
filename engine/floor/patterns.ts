import type { FloorBeatDef, FloorPatternDef } from "./types";

// Short ways to write a floor's script (FloorDef.script): a beat, and the patterns it starts.
// rowSeconds is how long a wave takes from one row to the next.

export const side = (side: "east" | "west" | "both", rowSeconds: number): FloorPatternDef => ({
    kind: "side",
    side,
    rowSeconds,
});
export const sweep = (rowSeconds: number, gap = 2): FloorPatternDef => ({
    kind: "sweep",
    rowSeconds,
    gap,
});
export const ripple = (
    at: "player" | "middle",
    spokes: "cross" | "diagonal",
    ringSeconds: number,
    radius: number,
): FloorPatternDef => ({ kind: "ripple", at, spokes, ringSeconds, radius });
// A pattern shown bold from its start (FloorCue), over the floor's own cue
export const bold = (pattern: FloorPatternDef): FloorPatternDef => ({ ...pattern, cue: "bold" });
export const dropRows = (rows: number, rowSeconds = 0.4): FloorPatternDef => ({
    kind: "dropRows",
    rows,
    rowSeconds,
});
export const holes = (count: number): FloorPatternDef => ({ kind: "holes", count });

export const beat = (at: number, pattern: FloorPatternDef, message?: string): FloorBeatDef => ({
    at,
    pattern,
    message,
});
