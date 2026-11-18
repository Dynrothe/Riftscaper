import { COSINE, SINE } from "../../rs/MathConstants";
import { Rasterizer2D } from "../../rs/graphics/Rasterizer2D";
import { Rasterizer3D } from "../../rs/graphics/Rasterizer3D";
import { Model } from "../../rs/model/Model";
import { RenderDataLoader, RenderDataResult } from "./RenderDataLoader";
import { WorkerState } from "./RenderDataWorker";

// Inventory icons drawn the way the client draws them: the item's model posed
// by its 2D view angles and zoom, rasterized in software with painter's
// ordering, then outlined in black with a drop shadow. A game that shows an
// item big asks for a scale: the same model and view on a raster that many
// times finer, its outline and shadow as many pixels thick, so it keeps the
// client's look without the blocks of a 36x32 icon blown up.

export const ICON_WIDTH = 36;
export const ICON_HEIGHT = 32;

// scale: a whole number, 1 (the client's size) without
export type ItemIconRequest = { objId: number; count: number; scale?: number };

export type ItemIconInput = { requests: ItemIconRequest[] };

export type ItemIcon = {
    objId: number;
    count: number;
    scale: number;
    // ARGB, ICON_WIDTH x ICON_HEIGHT times the scale; empty when the item has no model
    pixels: Int32Array;
};

const OUTLINE_RGB = 0x010101;
const SHADOW_RGB = 0x302020;

const INVALID_HSL_COLOR = -2;

// Where projectModel (or a loader of its own, LocIconLoader) put each vertex, for drawModel
export const screenX = new Int32Array(16384);
export const screenY = new Int32Array(16384);
// Depth from the model's origin
export const viewZ = new Int32Array(16384);

function projectModel(
    model: Model,
    yan2d: number,
    zan2d: number,
    xan2d: number,
    xOffset: number,
    yOffset: number,
    zOffset: number,
    scale: number,
): boolean {
    if (model.verticesCount > screenX.length) {
        return false;
    }
    const centerX = Rasterizer3D.centerX;
    const centerY = Rasterizer3D.centerY;
    const sinY = SINE[yan2d & 2047];
    const cosY = COSINE[yan2d & 2047];
    const sinZ = SINE[zan2d & 2047];
    const cosZ = COSINE[zan2d & 2047];
    const sinX = SINE[xan2d & 2047];
    const cosX = COSINE[xan2d & 2047];
    const originZ = (yOffset * sinX + zOffset * cosX) >> 16;
    // The client's focal length is 512 (a shift by 9); a finer raster has a longer one
    const focal = 512 * scale;
    for (let i = 0; i < model.verticesCount; i++) {
        let x = model.verticesX[i];
        let y = model.verticesY[i];
        let z = model.verticesZ[i];
        // Roll, then yaw, then move out along the view; the pitch comes last so
        // it also turns the offset back onto the view axis
        if (zan2d !== 0) {
            const t = (y * sinZ + x * cosZ) >> 16;
            y = (y * cosZ - x * sinZ) >> 16;
            x = t;
        }
        if (yan2d !== 0) {
            const t = (z * sinY + x * cosY) >> 16;
            z = (z * cosY - x * sinY) >> 16;
            x = t;
        }
        x += xOffset;
        y += yOffset;
        z += zOffset;
        const t = (y * cosX - z * sinX) >> 16;
        z = (y * sinX + z * cosX) >> 16;
        y = t;
        viewZ[i] = z - originZ;
        if (z <= 0) {
            z = 1;
        }
        screenX[i] = (centerX + (x * focal) / z) | 0;
        screenY[i] = (centerY + (y * focal) / z) | 0;
    }
    return true;
}

// The colour of a textured face without its texture, as the client draws it
// when the texture isn't loaded: the texture's average colour, shaded
function shadeTextureAverage(averageHsl: number, lightness: number): number {
    lightness = ((averageHsl & 0x7f) * lightness) >> 7;
    if (lightness < 2) {
        lightness = 2;
    } else if (lightness > 126) {
        lightness = 126;
    }
    return (averageHsl & 0xff80) + lightness;
}

function drawFace(model: Model, f: number, textureAverageHsl: (id: number) => number): void {
    const a = model.indices1[f];
    const b = model.indices2[f];
    const c = model.indices3[f];
    // Lit colours keep extra bits above the 16 bit HSL value
    let hslA = model.faceColors1[f] & 0xffff;
    let hslB = model.faceColors2[f] & 0xffff;
    let hslC = model.faceColors3[f] & 0xffff;
    if (model.faceColors3[f] === -1) {
        hslB = hslC = hslA;
    }
    const textureId = model.faceTextures ? model.faceTextures[f] : -1;
    if (textureId !== -1) {
        // Textured faces store only lighting
        const average = textureAverageHsl(textureId);
        hslA = shadeTextureAverage(average, hslA & 0x7f);
        hslB = shadeTextureAverage(average, hslB & 0x7f);
        hslC = shadeTextureAverage(average, hslC & 0x7f);
    }
    const xa = screenX[a];
    const xb = screenX[b];
    const xc = screenX[c];
    const endX = Rasterizer3D.endX;
    const endY = Rasterizer3D.endY;
    Rasterizer3D.rasterClipEnable =
        xa < 0 || xb < 0 || xc < 0 || xa > endX || xb > endX || xc > endX;
    if (screenY[a] < 0 && screenY[b] < 0 && screenY[c] < 0) {
        return;
    }
    if (screenY[a] > endY && screenY[b] > endY && screenY[c] > endY) {
        return;
    }
    Rasterizer3D.rasterAlpha = model.faceAlphas ? model.faceAlphas[f] & 0xff : 0;
    Rasterizer3D.rasterGouraud(screenY[a], screenY[b], screenY[c], xa, xb, xc, hslA, hslB, hslC);
    Rasterizer3D.rasterAlpha = 0;
}

// Draws the faces that face the camera far to near, the way the client does:
// faces are ordered by average depth, then by render priority, with the
// priority 10 and 11 faces (decals and the like) slotted in between the others
// by depth.
export function drawModel(model: Model, textureAverageHsl: (id: number) => number): void {
    const faceCount = model.faceCount;
    const faces: number[] = [];
    const depth = new Int32Array(faceCount);
    for (let f = 0; f < faceCount; f++) {
        if (model.faceColors3[f] === INVALID_HSL_COLOR) {
            continue;
        }
        const a = model.indices1[f];
        const b = model.indices2[f];
        const c = model.indices3[f];
        // Front faces wind the other way round on screen; back faces aren't drawn
        const cross =
            (screenX[b] - screenX[a]) * (screenY[c] - screenY[a]) -
            (screenY[b] - screenY[a]) * (screenX[c] - screenX[a]);
        if (cross >= 0) {
            continue;
        }
        depth[f] = Math.trunc((viewZ[a] + viewZ[b] + viewZ[c]) / 3) + model.radius;
        faces.push(f);
    }
    faces.sort((fa, fb) => depth[fb] - depth[fa] || fa - fb);

    const priorities = model.faceRenderPriorities;
    if (!priorities) {
        for (const f of faces) {
            drawFace(model, f, textureAverageHsl);
        }
        return;
    }

    const byPriority: number[][] = [];
    const depthSums = new Array<number>(12).fill(0);
    for (let p = 0; p < 12; p++) {
        byPriority.push([]);
    }
    for (const f of faces) {
        const p = Math.min(priorities[f] & 0xff, 11);
        byPriority[p].push(f);
        depthSums[p] += depth[f];
    }
    const averageDepth = (p1: number, p2: number): number => {
        const count = byPriority[p1].length + byPriority[p2].length;
        return count > 0 ? Math.trunc((depthSums[p1] + depthSums[p2]) / count) : 0;
    };
    const depth12 = averageDepth(1, 2);
    const depth34 = averageDepth(3, 4);
    const depth68 = averageDepth(6, 8);

    const late = byPriority[10].concat(byPriority[11]);
    let next = 0;
    const nextDepth = (): number => (next < late.length ? depth[late[next]] : -1000);
    for (let p = 0; p < 10; p++) {
        const before = p === 0 ? depth12 : p === 3 ? depth34 : p === 5 ? depth68 : undefined;
        if (before !== undefined) {
            while (nextDepth() > before) {
                drawFace(model, late[next++], textureAverageHsl);
            }
        }
        for (const f of byPriority[p]) {
            drawFace(model, f, textureAverageHsl);
        }
    }
    while (next < late.length) {
        drawFace(model, late[next++], textureAverageHsl);
    }
}

// The client's finishing touches: a black outline around the item, then a
// shadow one pixel down and right; both as many pixels as the scale. A thick
// outline grows a pixel at a time, by the sides and then the corners as well
// in turn, so it comes out round rather than a diamond.
function outlineAndShadow(pixels: Int32Array, width: number, height: number, scale = 1): void {
    for (let pass = 0; pass < scale; pass++) {
        const corners = pass % 2 === 1;
        const copy = pixels.slice();
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = x + y * width;
                if (copy[i] !== 0) {
                    continue;
                }
                const left = x > 0;
                const right = x < width - 1;
                const up = y > 0;
                const down = y < height - 1;
                if (
                    (left && copy[i - 1] !== 0) ||
                    (up && copy[i - width] !== 0) ||
                    (right && copy[i + 1] !== 0) ||
                    (down && copy[i + width] !== 0) ||
                    (corners &&
                        ((left && up && copy[i - width - 1] !== 0) ||
                            (right && up && copy[i - width + 1] !== 0) ||
                            (left && down && copy[i + width - 1] !== 0) ||
                            (right && down && copy[i + width + 1] !== 0)))
                ) {
                    pixels[i] = OUTLINE_RGB;
                }
            }
        }
    }
    // Bottom up, so what's read above is still the item and its outline
    const offset = scale * width + scale;
    for (let y = height - 1; y >= scale; y--) {
        for (let x = width - 1; x >= scale; x--) {
            const i = x + y * width;
            if (pixels[i] === 0 && pixels[i - offset] !== 0) {
                pixels[i] = SHADOW_RGB;
            }
        }
    }
}

// Stacks like coins have their own item (model and view) per stack size
function getStackObjId(state: WorkerState, objId: number, count: number): number {
    const objType = state.objTypeLoader.load(objId);
    let stackId = objId;
    if (objType.countObj && count > 1) {
        for (let i = 0; i < 10; i++) {
            if (count >= objType.countCo[i] && objType.countCo[i] !== 0) {
                stackId = objType.countObj[i];
            }
        }
    }
    return stackId;
}

export function renderItemIcon(
    state: WorkerState,
    objId: number,
    count: number,
    scale = 1,
): Int32Array {
    scale = Math.max(1, Math.floor(scale));
    const width = ICON_WIDTH * scale;
    const height = ICON_HEIGHT * scale;
    const pixels = new Int32Array(width * height);
    const stackId = getStackObjId(state, objId, count);
    const objType = state.objTypeLoader.load(stackId);
    const model = state.objModelLoader.getModel(stackId, 1);
    if (!model) {
        return pixels;
    }

    Rasterizer2D.setRaster(pixels, width, height);
    Rasterizer2D.setClip(0, 0, width, height);
    Rasterizer3D.setClip();
    // The client centres item models at (16, 16), not in the middle of the
    // 36 pixel wide sprite
    Rasterizer3D.setViewport(16 * scale, 16 * scale);
    Rasterizer3D.rasterGouraudLowRes = false;
    Rasterizer3D.rasterAlpha = 0;

    model.calculateBoundsCylinder();
    const zoom = objType.zoom2d;
    const sin = (SINE[objType.xan2d & 2047] * zoom) >> 16;
    const cos = (COSINE[objType.xan2d & 2047] * zoom) >> 16;
    if (
        projectModel(
            model,
            objType.yan2d,
            objType.zan2d,
            objType.xan2d,
            objType.offsetX2d,
            ((model.height / 2) | 0) + sin + objType.offsetY2d,
            cos + objType.offsetY2d,
            scale,
        )
    ) {
        drawModel(model, (id) => state.textureLoader.getAverageHsl(id));
    }

    // The rasterizer writes plain RGB; mark everything drawn as opaque
    outlineAndShadow(pixels, width, height, scale);
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) {
            pixels[i] |= 0xff000000;
        }
    }
    return pixels;
}

export class ItemIconLoader implements RenderDataLoader<ItemIconInput, ItemIcon[]> {
    __type = "itemIconLoader" as const;

    init(): void {}

    async load(state: WorkerState, input: ItemIconInput): Promise<RenderDataResult<ItemIcon[]>> {
        const icons = input.requests.map(({ objId, count, scale: asked }) => {
            const scale = Math.max(1, Math.floor(asked ?? 1));
            let pixels: Int32Array;
            try {
                pixels = renderItemIcon(state, objId, count, scale);
            } catch (e) {
                console.error("Failed drawing item icon", objId, e);
                pixels = new Int32Array(ICON_WIDTH * ICON_HEIGHT * scale * scale);
            }
            return { objId, count, scale, pixels };
        });
        return { data: icons, transferables: icons.map((icon) => icon.pixels.buffer) };
    }

    reset(): void {}
}
