import type { BakeRequest, ModelBakeRequest } from "../mapviewer/webgl/actor/ActorBakeTypes";
import type { FloorDef, FloorSkinDef } from "./types";

// What FloorView draws a floor with, and the keys it looks each up by in the models it's handed
// (FloorModels): bake getFloorRequests' requests, and each of getFloorSpotAnims' spot animations
// as a "spotanim" request keyed getFloorSpotKey, with ActorBakeLoader.

// A spot animation the floor throws up, or its slam's slab
export function getFloorSpotKey(spotAnim: number): string {
    return "spot:" + spotAnim;
}

// A floor with no skins of its own draws the slam's slab; this is it, for its top
export function DEFAULT_FLOOR_SKIN(floor: { slam: { spotAnim: number } }): FloorSkinDef {
    return { spotAnim: floor.slam.spotAnim };
}

// A piece of what's under a floor (FloorDef.under)
export function getFloorPieceKey(locId: number): string {
    return "floorpiece:" + locId;
}

// A floor's tile skin (FloorDef.skins): what it's baked from is all there is to it
export function getFloorSkinKey(skin: FloorSkinDef): string {
    const { spotAnim, loc, model, recolor, retexture, scale } = skin;
    return "floorskin:" + JSON.stringify([spotAnim, loc, model, recolor, retexture, scale]);
}

// The same, its top alone, for a tile at rest among others (none of its sides show)
export function getFloorLidKey(skin: FloorSkinDef): string {
    return getFloorSkinKey(skin) + ":top";
}

export function getFloorSkinRequest(skin: FloorSkinDef, topOnly = false): ModelBakeRequest {
    return {
        kind: "model",
        key: topOnly ? getFloorLidKey(skin) : getFloorSkinKey(skin),
        topOnly,
        spotAnimId: skin.spotAnim,
        locId: skin.loc,
        modelId: skin.model,
        recolor: skin.recolor,
        retexture: skin.retexture,
        scale: skin.scale,
        // A spot animation's baked with its own animation even when it rises in code: its first
        // frame is it at rest (the Wardens' slab's model unposed is nowhere near)
        still: skin.spotAnim === undefined,
    };
}

// Every spot animation a floor draws: its slam's slab and its tumble, what it throws up, and its
// skins' own (FloorSkinDef.material, idle)
export function getFloorSpotAnims(def: FloorDef): number[] {
    const ids = new Set<number>([def.slam.spotAnim, def.drop.spotAnim]);
    const add = (...spotAnims: (number | undefined)[]) => {
        for (const id of spotAnims) {
            if (id !== undefined) {
                ids.add(id);
            }
        }
    };
    add(def.effects?.dust, def.effects?.fallDust, def.effects?.rock);
    for (const skin of def.skins ?? []) {
        const { rise, fall, crack } = skin.material ?? {};
        add(rise?.spotAnim, fall?.spotAnim, crack?.spotAnim, skin.idle?.spotAnim);
    }
    return [...ids];
}

// The rest of what a floor needs baked: what's under it, and each skin whole and its top alone
export function getFloorRequests(def: FloorDef): BakeRequest[] {
    const requests: BakeRequest[] = [];
    for (const locId of Object.values(def.under ?? {})) {
        requests.push({ kind: "loc", key: getFloorPieceKey(locId), locId });
    }
    for (const skin of def.skins ?? []) {
        requests.push(getFloorSkinRequest(skin), getFloorSkinRequest(skin, true));
    }
    // The slam's own slab, for a floor with no skins of its own
    if (!def.skins) {
        requests.push(getFloorSkinRequest(DEFAULT_FLOOR_SKIN(def), true));
    }
    return requests;
}
