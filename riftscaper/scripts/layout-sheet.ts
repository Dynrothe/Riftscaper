// Draws rift layouts' plans as a sheet, without the cache: each kind across, a seed a row. Open
// ground pale, ground that falls away blue, ground that rises dark, the route's lanes traced,
// the camp green, the guardian magenta, nooks gold, a nexus's chambers amber.
//
//   bun run tsx riftscaper/scripts/layout-sheet.ts out.png [seeds=4] [kinds=trail,loop,arms,isles] [scale=2]
import fs from "fs";
import { LAYOUT_KINDS, LayoutKind, planLayout } from "../src/world/riftLayout";
import { encodePng } from "./png";

const out = process.argv[2] ?? "layouts.png";
const args = Object.fromEntries(process.argv.slice(3).map((a) => a.split("=")));
const seeds = Number(args.seeds ?? 4);
const first = Number(args.first ?? 1);
const scale = Number(args.scale ?? 2);
const kinds = (args.kinds ? args.kinds.split(",") : LAYOUT_KINDS) as LayoutKind[];
const deepFor: Record<LayoutKind, "none" | "all" | "heart" | "pools"> = { trail: "pools", loop: "heart", arms: "none", isles: "heart", field: "pools", nexus: "none", pit: "none" };

const size = 320;
const arena = { x0: 64, y0: 64, x1: 255, y1: 255 };
const cell = 192 * scale + 8;
const w = cell * kinds.length;
const h = cell * seeds;
const rgba = new Uint8Array(w * h * 4).fill(255);
const set = (px: number, py: number, rgb: number) => {
    if (px < 0 || py < 0 || px >= w || py >= h) {
        return;
    }
    const i = (px + py * w) * 4;
    rgba[i] = (rgb >> 16) & 255;
    rgba[i + 1] = (rgb >> 8) & 255;
    rgba[i + 2] = rgb & 255;
    rgba[i + 3] = 255;
};
const lines: string[] = [];
kinds.forEach((kind, col) => {
    for (let row = 0; row < seeds; row++) {
        const seed = first + row;
        const started = performance.now();
        const layout = planLayout({ kind, seed, sizeX: size, sizeY: size, arena, corner: seed % 4, deep: deepFor[kind] });
        const ms = Math.round(performance.now() - started);
        const ox = col * cell + 4;
        const oy = row * cell + 4;
        let open = 0;
        for (let y = arena.y0; y <= arena.y1; y++) {
            for (let x = arena.x0; x <= arena.x1; x++) {
                const i = x + y * size;
                open += layout.open[i];
                const c = layout.open[i] ? 0xe8dcc0 : layout.deep[i] ? 0x3060a0 : 0x404030;
                for (let k = 0; k < scale * scale; k++) {
                    set(ox + (x - arena.x0) * scale + (k % scale), oy + (arena.y1 - y) * scale + Math.floor(k / scale), c);
                }
            }
        }
        const dot = (x: number, y: number, r: number, c: number) => {
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (dx * dx + dy * dy <= r * r) {
                        set(ox + Math.round((x - arena.x0) * scale) + dx, oy + Math.round((arena.y1 - y) * scale) + dy, c);
                    }
                }
            }
        };
        for (const lane of layout.lanes) {
            const onRoute = layout.route.some((a, k) => k > 0 && ((layout.route[k - 1] === lane.from && a === lane.to) || (layout.route[k - 1] === lane.to && a === lane.from)));
            for (const p of lane.points) {
                dot(p.x, p.y, 0, onRoute ? 0xc04020 : 0xa09080);
            }
        }
        for (const n of layout.nodes) {
            const c = { camp: 0x00c040, guardian: 0xff00ff, nook: 0xffb000, arena: 0x806040, bend: 0xa09080, hub: 0x4040ff, room: 0xe0a020 }[n.role];
            const big = n.role === "camp" || n.role === "guardian" || n.role === "room";
            dot(n.x, n.y, big ? 3 * scale : scale + 1, c);
        }
        const g = layout.nodes[layout.guardian];
        const far = layout.distance[Math.floor(g.x) + Math.floor(g.y) * size];
        const nooks = layout.nodes.filter((n) => n.role === "nook").length;
        lines.push(`${kind} seed ${seed}: ${ms} ms, ${Math.round((open / 192 / 192) * 100)}% open (${open} tiles), guardian ${far} tiles' walk, ${nooks} nooks, ${layout.nodes.length} nodes`);
    }
});
fs.writeFileSync(out, encodePng(w, h, rgba));
console.log(lines.join("\n"));
