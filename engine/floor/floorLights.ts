import { DrawnLights } from "../render/DrawnLights";
import { lightKey } from "../render/LightBudget";
import type { LightLook } from "../render/LightLook";
import type { ArenaFloor } from "./ArenaFloor";
import { FLOOR_EFFECTS } from "./floorLayout";
import type { FloorEffect } from "./types";

// A floor's tiles that glow, by what standing on them does (looks: lava's burn, ice), offered to a
// frame's lights: only those within reach tiles of the view's middle (viewX, viewY), each keyed by
// kind (lightKey) and its place in the floor. Only drawn.
export function offerFloorLights(
    lights: DrawnLights,
    floor: ArenaFloor,
    tick: number,
    viewX: number,
    viewY: number,
    looks: Partial<Record<FloorEffect, LightLook>>,
    kind: number,
    reach = 14,
): void {
    const x0 = Math.max(floor.x0, Math.floor(viewX - reach));
    const x1 = Math.min(floor.x0 + floor.sizeX - 1, Math.floor(viewX + reach));
    const y0 = Math.max(floor.y0, Math.floor(viewY - reach));
    const y1 = Math.min(floor.y0 + floor.sizeY - 1, Math.floor(viewY + reach));
    for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
            // layout.effect is FLOOR_EFFECTS' index plus 1, 0 for nothing
            const effect = FLOOR_EFFECTS[floor.effectAt(tx, ty, tick) - 1];
            const look = effect && looks[effect];
            if (look) {
                const key = lightKey(kind, (ty - floor.y0) * floor.sizeX + tx - floor.x0);
                lights.offer(key, tx + 0.5, ty + 0.5, look.radius, look);
            }
        }
    }
}
