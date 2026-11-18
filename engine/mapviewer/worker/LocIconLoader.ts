import { COSINE, SINE } from "../../rs/MathConstants";
import { LocModelType } from "../../rs/config/loctype/LocModelType";
import { Rasterizer2D } from "../../rs/graphics/Rasterizer2D";
import { Rasterizer3D } from "../../rs/graphics/Rasterizer3D";
import { Model } from "../../rs/model/Model";
import { ModelData } from "../../rs/model/ModelData";
import { drawModel, screenX, screenY, viewZ } from "./ItemIconLoader";
import { RenderDataLoader, RenderDataResult } from "./RenderDataLoader";
import { WorkerState } from "./RenderDataWorker";

// Pictures of locs (trees, rocks, walls, furniture) for a picker: the loc's model seen from a
// little above and to one side, scaled to fill the square, rasterized in software the way item
// icons are. A tool's list can show what each thing is without placing it.

export type LocIconRequest = {
    locId: number;
    // The model to show for a loc with several (a wall's, a floor decoration's); its normal one
    // when it hasn't that
    modelType?: number;
    size: number;
};

export type LocIconInput = { requests: LocIconRequest[] };

export type LocIcon = {
    locId: number;
    modelType: number;
    size: number;
    // ARGB, size by size; empty when the loc has no model
    pixels: Int32Array;
};

// An eighth of a turn round and a little from above: enough to see a wall's face and a table's top
const ICON_YAW = 1792;
const ICON_PITCH = 160;
// Pixels left round the model
const ICON_MARGIN = 2;

function getLocModel(state: WorkerState, locId: number, asked: number | undefined): Model | undefined {
    // A loc that's one of several by a varbit shows what the scene would
    const base = state.locTypeLoader.load(locId);
    const locType = (base.transforms && base.transform(state.varManager, state.locTypeLoader)) || base;
    const types = locType.types;
    const modelType =
        asked !== undefined && (types ? types.includes(asked) : asked === LocModelType.NORMAL)
            ? asked
            : types && !types.includes(LocModelType.NORMAL)
              ? types[0]
              : LocModelType.NORMAL;
    const model = state.locModelLoader.getModel(locType, modelType, 0);
    if (model instanceof ModelData) {
        return model.light(
            state.textureLoader,
            locType.ambient + 64,
            locType.contrast + 768,
            -50,
            -10,
            -50,
        );
    }
    return model;
}

export function renderLocIcon(
    state: WorkerState,
    locId: number,
    modelType: number | undefined,
    size: number,
): Int32Array {
    const pixels = new Int32Array(size * size);
    const model = getLocModel(state, locId, modelType);
    if (!model || model.verticesCount === 0 || model.verticesCount > screenX.length) {
        return pixels;
    }

    // Turned and tilted, then fitted to the square: an orthographic view, so a long wall and a
    // small stool both fill it
    const sinY = SINE[ICON_YAW];
    const cosY = COSINE[ICON_YAW];
    const sinX = SINE[ICON_PITCH];
    const cosX = COSINE[ICON_PITCH];
    const count = model.verticesCount;
    const viewX = new Float64Array(count);
    const viewY = new Float64Array(count);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
        const x0 = model.verticesX[i];
        const y0 = model.verticesY[i];
        const z0 = model.verticesZ[i];
        const x = (z0 * sinY + x0 * cosY) / 65536;
        const z1 = (z0 * cosY - x0 * sinY) / 65536;
        const y = (y0 * cosX - z1 * sinX) / 65536;
        const z = (y0 * sinX + z1 * cosX) / 65536;
        viewX[i] = x;
        viewY[i] = y;
        viewZ[i] = Math.round(z);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    const inner = size - ICON_MARGIN * 2;
    const scale = inner / Math.max(maxX - minX, maxY - minY, 1);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    for (let i = 0; i < count; i++) {
        screenX[i] = Math.round(size / 2 + (viewX[i] - midX) * scale);
        screenY[i] = Math.round(size / 2 + (viewY[i] - midY) * scale);
    }

    Rasterizer2D.setRaster(pixels, size, size);
    Rasterizer2D.setClip(0, 0, size, size);
    Rasterizer3D.setClip();
    Rasterizer3D.setViewport(size >> 1, size >> 1);
    Rasterizer3D.rasterGouraudLowRes = false;
    Rasterizer3D.rasterAlpha = 0;
    // drawModel sorts by depth plus the model's radius, which it needs set
    model.calculateBoundsCylinder();
    drawModel(model, (id) => state.textureLoader.getAverageHsl(id));

    // The rasterizer writes plain RGB; mark everything drawn as opaque
    for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) {
            pixels[i] |= 0xff000000;
        }
    }
    return pixels;
}

export class LocIconLoader implements RenderDataLoader<LocIconInput, LocIcon[]> {
    __type = "locIconLoader" as const;

    init(): void {}

    async load(state: WorkerState, input: LocIconInput): Promise<RenderDataResult<LocIcon[]>> {
        const icons = input.requests.map(({ locId, modelType, size }) => {
            let pixels: Int32Array;
            try {
                pixels = renderLocIcon(state, locId, modelType, size);
            } catch (e) {
                console.error("Failed drawing loc icon", locId, e);
                pixels = new Int32Array(size * size);
            }
            return { locId, modelType: modelType ?? LocModelType.NORMAL, size, pixels };
        });
        return { data: icons, transferables: icons.map((icon) => icon.pixels.buffer) };
    }

    reset(): void {}
}
