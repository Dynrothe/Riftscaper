// An NPC posed in each of some animations, drawn to a PNG to look at before they're built with: a
// row a seq, its poses from first to last frame across, the model in its own colours, lit from the
// camera's side and seen from a three-quarter view a little above (the game's camera). A death ends
// lying down, an attack reaches out and comes back; it's the look classify-npc-seqs.ts guesses at.
// Rows are in the order given, printed as they're drawn.
//
//   bun run tsx riftscaper/scripts/seq-sheet.ts <npcId> <seqId>... [--poses 6] [--out sheet.png]
import fs from "fs";

import { NpcModelLoader } from "../../engine/rs/config/npctype/NpcModelLoader";
import { VarManager } from "../../engine/rs/config/vartype/VarManager";
import type { Model } from "../../engine/rs/model/Model";
import { getFactory, loadGameCache } from "./cacheUtil";
import { encodePng } from "./png";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : fallback;
};
const poses = Number(option("--poses", "6"));
const out = option("--out", "seq-sheet.png");
const [npcId, ...seqIds] = args.map(Number);

const factory = getFactory(loadGameCache());
const npcTypeLoader = factory.getNpcTypeLoader();
const seqTypeLoader = factory.getSeqTypeLoader();
const basTypeLoader = factory.getBasTypeLoader();
const npcModelLoader = new NpcModelLoader(
    npcTypeLoader,
    factory.getModelLoader(),
    factory.getTextureLoader(),
    seqTypeLoader,
    factory.getSeqFrameLoader(),
    factory.getSkeletalSeqLoader(),
    new VarManager(factory.getVarBitTypeLoader()),
);
const npcType = npcTypeLoader.load(npcId);
const idleSeq = npcType.getIdleSeqId(basTypeLoader);

const CELL = 180;
const YAW = Math.PI / 4;
const PITCH = 0.45;

// HSL16 (6 bits of hue, 3 of saturation, 7 of lightness) to RGB
function hslRgb(c: number): [number, number, number] {
    const h = ((c >> 10) & 63) / 64 + 1 / 128;
    const s = ((c >> 7) & 7) / 8 + 1 / 16;
    const l = (c & 127) / 128;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t: number) => {
        t = (t + 1) % 1;
        return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// The model's vertices seen by the camera: x across, y up the picture, z into it
function project(m: Model): { x: Float32Array; y: Float32Array; z: Float32Array } {
    const n = m.verticesCount;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const z = new Float32Array(n);
    const cy = Math.cos(YAW);
    const sy = Math.sin(YAW);
    const cp = Math.cos(PITCH);
    const sp = Math.sin(PITCH);
    for (let i = 0; i < n; i++) {
        const vx = m.verticesX[i];
        const vy = -m.verticesY[i];
        const vz = m.verticesZ[i];
        const rx = vx * cy - vz * sy;
        const rz = vx * sy + vz * cy;
        x[i] = rx;
        y[i] = vy * cp - rz * sp;
        z[i] = vy * sp + rz * cp;
    }
    return { x, y, z };
}

const frames = (seqId: number) => {
    const seq = seqTypeLoader.load(seqId);
    return seq.isSkeletalSeq() ? seq.getSkeletalDuration() : (seq.frameIds?.length ?? 1);
};

// The scale every cell's drawn at, from the idle pose's size, so the rows compare
const idle = npcModelLoader.getModel(npcType, idleSeq, 0);
let extent = 1;
if (idle) {
    const p = project(idle);
    for (let i = 0; i < idle.verticesCount; i++) {
        extent = Math.max(extent, Math.abs(p.x[i]), Math.abs(p.y[i]));
    }
}
const scale = (CELL * 0.42) / extent;

const width = CELL * poses;
const height = CELL * seqIds.length;
const rgba = new Uint8Array(width * height * 4);
const depth = new Float32Array(width * height).fill(Infinity);
for (let i = 0; i < width * height; i++) {
    rgba.set([40, 36, 30, 255], i * 4);
}

function draw(m: Model, cellX: number, cellY: number): void {
    const p = project(m);
    const ox = cellX * CELL + CELL / 2;
    const oy = cellY * CELL + CELL * 0.72;
    const sx = (i: number) => ox + p.x[i] * scale;
    const sy = (i: number) => oy - p.y[i] * scale;
    for (let f = 0; f < m.faceCount; f++) {
        if (m.faceAlphas && m.faceAlphas[f] === -1) {
            continue;
        }
        const a = m.indices1[f];
        const b = m.indices2[f];
        const c = m.indices3[f];
        const ax = sx(a), ay = sy(a), bx = sx(b), by = sy(b), cx = sx(c), cy = sy(c);
        // Lit by how squarely it faces the camera
        const ux = p.x[b] - p.x[a], uy = p.y[b] - p.y[a], uz = p.z[b] - p.z[a];
        const vx = p.x[c] - p.x[a], vy = p.y[c] - p.y[a], vz = p.z[c] - p.z[a];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const light = 0.45 + 0.55 * Math.abs(nz - nx * 0.3 + ny * 0.3) / (Math.hypot(nx, ny, nz) || 1);
        const [r, g, bl] = m.faceColors ? hslRgb(m.faceColors[f]) : [180, 180, 180];
        const minX = Math.max(cellX * CELL, Math.floor(Math.min(ax, bx, cx)));
        const maxX = Math.min(cellX * CELL + CELL - 1, Math.ceil(Math.max(ax, bx, cx)));
        const minY = Math.max(cellY * CELL, Math.floor(Math.min(ay, by, cy)));
        const maxY = Math.min(cellY * CELL + CELL - 1, Math.ceil(Math.max(ay, by, cy)));
        const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
        if (Math.abs(area) < 1e-6) {
            continue;
        }
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const w0 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / area;
                const w1 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / area;
                const w2 = 1 - w0 - w1;
                if (w0 < 0 || w1 < 0 || w2 < 0) {
                    continue;
                }
                const z = w0 * p.z[a] + w1 * p.z[b] + w2 * p.z[c];
                const i = y * width + x;
                if (z >= depth[i]) {
                    continue;
                }
                depth[i] = z;
                rgba.set([r * light, g * light, bl * light, 255], i * 4);
            }
        }
    }
}

// The ground line in each cell, to see a body come down to it
for (let row = 0; row < seqIds.length; row++) {
    const y = row * CELL + Math.round(CELL * 0.72);
    for (let x = 0; x < width; x++) {
        rgba.set([90, 80, 60, 255], (y * width + x) * 4);
    }
    for (let col = 0; col < poses; col++) {
        for (let yy = row * CELL; yy < row * CELL + CELL; yy++) {
            rgba.set([20, 18, 15, 255], (yy * width + col * CELL) * 4);
        }
    }
}

seqIds.forEach((seqId, row) => {
    const n = frames(seqId);
    for (let col = 0; col < poses; col++) {
        const frame = Math.min(n - 1, Math.round((col / Math.max(1, poses - 1)) * (n - 1)));
        const model = npcModelLoader.getModel(npcType, seqId, frame);
        if (model) {
            draw(model, col, row);
        }
    }
    console.log(`row ${row + 1}: seq ${seqId}, ${n} frames`);
});

fs.writeFileSync(out, encodePng(width, height, rgba));
console.log(`${npcType.name} (${npcId}) → ${out}`);
