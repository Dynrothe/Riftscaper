import { Model } from "../../rs/model/Model";
import { HSL_RGB_MAP } from "../../rs/util/ColorUtil";
import { ICON_HEIGHT, ICON_WIDTH, renderItemIcon } from "./ItemIconLoader";

const RED = (7 << 7) | 64;
const BLUE = (43 << 10) | (7 << 7) | 64;

type Quad = { z: number; hsl: number; facing: "camera" | "away"; priority?: number };

// Square quads 80 units across, two flat shaded faces each. Faces wind so that
// (b - a) x (c - a) points out of the model, which the lighting in
// ModelData.light relies on.
function makeModel(quads: Quad[]): Model {
    const model = new Model();
    const xs: number[] = [];
    const ys: number[] = [];
    const zs: number[] = [];
    const faces: number[][] = [];
    const colors: number[] = [];
    const priorities: number[] = [];
    for (const quad of quads) {
        const base = xs.length;
        for (const [x, y] of [
            [-40, -40],
            [40, -40],
            [40, 40],
            [-40, 40],
        ]) {
            xs.push(x);
            ys.push(y);
            zs.push(quad.z);
        }
        const [a, b, c, d] = [base, base + 1, base + 2, base + 3];
        const tris =
            quad.facing === "camera"
                ? [
                      [a, c, b],
                      [a, d, c],
                  ]
                : [
                      [a, b, c],
                      [a, c, d],
                  ];
        for (const tri of tris) {
            faces.push(tri);
            colors.push(quad.hsl);
            priorities.push(quad.priority ?? 0);
        }
    }
    model.verticesCount = model.usedVertexCount = xs.length;
    model.verticesX = Int32Array.from(xs);
    model.verticesY = Int32Array.from(ys);
    model.verticesZ = Int32Array.from(zs);
    model.faceCount = faces.length;
    model.indices1 = Int32Array.from(faces.map((f) => f[0]));
    model.indices2 = Int32Array.from(faces.map((f) => f[1]));
    model.indices3 = Int32Array.from(faces.map((f) => f[2]));
    model.faceColors1 = Int32Array.from(colors);
    model.faceColors2 = new Int32Array(faces.length);
    model.faceColors3 = new Int32Array(faces.length).fill(-1);
    if (quads.some((q) => q.priority !== undefined)) {
        model.faceRenderPriorities = Int8Array.from(priorities);
    }
    return model;
}

function render(model: Model, scale = 1): Int32Array {
    const objType = { zoom2d: 2000, xan2d: 0, yan2d: 0, zan2d: 0, offsetX2d: 0, offsetY2d: 0 };
    const state = {
        objTypeLoader: { load: () => objType },
        objModelLoader: { getModel: () => model },
        textureLoader: { getAverageHsl: () => 0 },
    } as any;
    return renderItemIcon(state, 1, 1, scale);
}

// The box round the pixels of a colour, in a picture that many times an icon's width
function boundsOf(pixels: Int32Array, rgb: number, scale: number) {
    const width = ICON_WIDTH * scale;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < pixels.length; i++) {
        if ((pixels[i] & 0xffffff) === rgb) {
            const x = i % width;
            const y = Math.floor(i / width);
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
        }
    }
    return { x0, y0, x1, y1 };
}

function pixelAt(pixels: Int32Array, x: number, y: number): number {
    return pixels[x + y * ICON_WIDTH] & 0xffffff;
}

describe("item icons", () => {
    test("show the side of the model facing the camera", () => {
        // A box's front (towards the camera, -z) and back
        const pixels = render(
            makeModel([
                { z: -40, hsl: RED, facing: "camera" },
                { z: 40, hsl: BLUE, facing: "away" },
            ]),
        );
        expect(pixelAt(pixels, 16, 16)).toBe(HSL_RGB_MAP[RED]);
    });

    test("are centred at (16, 16) like the client's", () => {
        const pixels = render(makeModel([{ z: 0, hsl: RED, facing: "camera" }]));
        let minX = ICON_WIDTH;
        let maxX = 0;
        for (let x = 0; x < ICON_WIDTH; x++) {
            if (pixelAt(pixels, x, 16) === HSL_RGB_MAP[RED]) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        }
        // Not 18, the middle of the sprite
        expect(Math.abs((minX + maxX + 1) / 2 - 16)).toBeLessThanOrEqual(0.5);
    });

    test("draw higher priority faces over lower ones on the same plane", () => {
        // The decal comes first in face order but has the higher priority
        const pixels = render(
            makeModel([
                { z: 0, hsl: BLUE, facing: "camera", priority: 1 },
                { z: 0, hsl: RED, facing: "camera", priority: 0 },
            ]),
        );
        expect(pixelAt(pixels, 16, 16)).toBe(HSL_RGB_MAP[BLUE]);
    });

    test("drawn at a scale, are the same picture that many times finer, outline and shadow too", () => {
        const model = () => makeModel([{ z: 0, hsl: RED, facing: "camera" }]);
        const small = render(model());
        const big = render(model(), 4);
        expect(big.length).toBe(ICON_WIDTH * ICON_HEIGHT * 16);
        const a = boundsOf(small, HSL_RGB_MAP[RED], 1);
        const b = boundsOf(big, HSL_RGB_MAP[RED], 4);
        // The quad's edges land within a small pixel of four times as far out
        expect(Math.abs(b.x0 - a.x0 * 4)).toBeLessThanOrEqual(4);
        expect(Math.abs(b.x1 + 1 - (a.x1 + 1) * 4)).toBeLessThanOrEqual(4);
        expect(Math.abs(b.y0 - a.y0 * 4)).toBeLessThanOrEqual(4);
        // Four pixels of outline round it, then four of shadow down and to the right
        const width = ICON_WIDTH * 4;
        const at = (x: number, y: number) => big[x + y * width] & 0xffffff;
        const middle = Math.round((b.y0 + b.y1) / 2);
        for (let d = 1; d <= 4; d++) {
            expect(at(b.x0 - d, middle)).toBe(0x010101);
        }
        expect(at(b.x0 - 5, middle)).toBe(0);
        expect(at(b.x1 + 5, middle)).toBe(0x302020);
        expect(at(b.x1 + 8, middle)).toBe(0x302020);
        expect(at(b.x1 + 9, middle)).toBe(0);
    });
});
