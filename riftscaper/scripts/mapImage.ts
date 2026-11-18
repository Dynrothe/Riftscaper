// A map's grid drawn from above, for the scripts: each tile its floor's colour (a textured
// overlay its texture's average), shaded by the ground's slope as the light from the south-west
// falls on it, blocked ground darker, what stands on it in its footprint (trees and the rest of
// what blocks darker still, walls along their edge), and marks on top.
import type { LoadedCache } from "../../engine/mapviewer/Caches";
import type { UnderlayFloorType } from "../../engine/rs/config/floortype/UnderlayFloorType";
import { HSL_RGB_MAP } from "../../engine/rs/util/ColorUtil";
import { TILE_BLOCKED, cacheFloorId } from "../../engine/scaperune/format";
import type { TileGrid } from "../../engine/scaperune/format";
import type { BuildContext } from "../../engine/scaperune/recipe";
import { getFactory } from "./cacheUtil";
import { encodePng } from "./png";

export type Mark = { x: number; y: number; color: number; radius?: number; ring?: boolean };

export type ImageOptions = {
    // Pixels a tile
    scale: number;
    // The rectangle drawn, in grid tiles
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    marks?: Mark[];
    // Tiles drawn lighter, such as what's reachable
    lit?: (x: number, y: number) => boolean;
};

export function createFloorColours(cache: LoadedCache) {
    const factory = getFactory(cache);
    const underlays = factory.getUnderlayTypeLoader();
    const overlays = factory.getOverlayTypeLoader();
    const textures = factory.getTextureLoader();
    const under = new Map<number, number>();
    const over = new Map<number, number>();
    return {
        underlay(id: number): number {
            let c = under.get(id);
            if (c === undefined) {
                c = id > 0 ? (underlays.load(cacheFloorId(id)) as UnderlayFloorType).rgbColor : 0x404040;
                under.set(id, c);
            }
            return c;
        },
        // -1 for the hidden overlay, which draws nothing
        overlay(id: number): number {
            let c = over.get(id);
            if (c === undefined) {
                const type = overlays.load(cacheFloorId(id));
                if (type.textureId >= 0) {
                    c = HSL_RGB_MAP[textures.getAverageHsl(type.textureId)] ?? 0x808080;
                } else if (type.primaryRgb === 0xff00ff) {
                    c = -1;
                } else {
                    c = type.primaryRgb;
                }
                over.set(id, c);
            }
            return c;
        },
    };
}

export function drawGrid(grid: TileGrid, context: BuildContext, cache: LoadedCache, options: ImageOptions): Buffer {
    const colours = createFloorColours(cache);
    const { scale, x0, y0, x1, y1 } = options;
    const w = (x1 - x0 + 1) * scale;
    const h = (y1 - y0 + 1) * scale;
    const rgba = new Uint8Array(w * h * 4);
    const level = grid.levels[0];
    const corners = grid.sizeX + 1;
    const height = (x: number, y: number) => level.heights[x + y * corners];
    const set = (px: number, py: number, rgb: number, alpha = 1) => {
        if (px < 0 || py < 0 || px >= w || py >= h) {
            return;
        }
        const i = (px + py * w) * 4;
        rgba[i] = Math.round(rgba[i] * (1 - alpha) + ((rgb >> 16) & 255) * alpha);
        rgba[i + 1] = Math.round(rgba[i + 1] * (1 - alpha) + ((rgb >> 8) & 255) * alpha);
        rgba[i + 2] = Math.round(rgba[i + 2] * (1 - alpha) + (rgb & 255) * alpha);
        rgba[i + 3] = 255;
    };
    const shade = (rgb: number, k: number) => {
        const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
        return (f((rgb >> 16) & 255) << 16) | (f((rgb >> 8) & 255) << 8) | f(rgb & 255);
    };
    // A tile's top-left pixel: north is up
    const px = (x: number) => (x - x0) * scale;
    const py = (y: number) => (y1 - y) * scale;
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const i = x + y * grid.sizeX;
            const o = level.overlays[i];
            let rgb = colours.underlay(level.underlays[i]);
            if (o > 0) {
                const c = colours.overlay(o);
                rgb = c < 0 ? 0x000000 : c;
            } else if (level.underlays[i] === 0) {
                rgb = 0x000000;
            }
            // Light from the south-west, heights going up
            const sw = height(x, y);
            const ne = height(x + 1, y + 1);
            const se = height(x + 1, y);
            const nw = height(x, y + 1);
            const dx = (se + ne - sw - nw) / 2;
            const dy = (nw + ne - sw - se) / 2;
            let k = 1 - (dx + dy) * 0.035;
            if (level.flags[i] & TILE_BLOCKED) {
                k *= 0.72;
            }
            if (options.lit && !options.lit(x, y)) {
                k *= 0.8;
            }
            rgb = shade(rgb, Math.max(0.35, Math.min(1.6, k)));
            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    set(px(x) + sx, py(y) + sy, rgb);
                }
            }
        }
    }
    // What stands: solid things a dark block on their footprint, soft ones a dot, walls an edge
    for (const loc of grid.locs) {
        if (loc.level !== 0 || loc.x < x0 || loc.y < y0 || loc.x > x1 || loc.y > y1) {
            continue;
        }
        const info = context.locs(loc.id);
        if (loc.type <= 3 || loc.type === 9) {
            const c = 0xe8e0d0;
            const lx = px(loc.x);
            const ly = py(loc.y);
            const r = loc.rotation & 3;
            for (let k = 0; k < scale; k++) {
                if (loc.type === 9) {
                    set(lx + k, ly + scale - 1 - k, c);
                } else if (r === 0) {
                    set(lx, ly + k, c);
                } else if (r === 1) {
                    set(lx + k, ly, c);
                } else if (r === 2) {
                    set(lx + scale - 1, ly + k, c);
                } else {
                    set(lx + k, ly + scale - 1, c);
                }
            }
            continue;
        }
        if (loc.type === 22) {
            continue;
        }
        const turned = loc.rotation & 1;
        const sx = turned ? info.sizeY : info.sizeX;
        const sy = turned ? info.sizeX : info.sizeY;
        const solid = info.clipType > 0;
        const tree = /tree|oak|willow|maple|yew|pine|palm|evergreen|jungle|dead/i.test(info.name ?? "");
        const c = !solid ? 0xd8c070 : tree ? 0x103010 : 0x303030;
        const alpha = !solid ? 0.6 : 0.75;
        const inset = solid ? Math.max(0, Math.floor(scale / 6)) : Math.floor(scale / 3);
        for (let ty = 0; ty < sy; ty++) {
            for (let tx = 0; tx < sx; tx++) {
                for (let ky = inset; ky < scale - inset; ky++) {
                    for (let kx = inset; kx < scale - inset; kx++) {
                        set(px(loc.x + tx) + kx, py(loc.y + ty) + ky, c, alpha);
                    }
                }
            }
        }
    }
    for (const m of options.marks ?? []) {
        const r = (m.radius ?? 1.5) * scale;
        const cx = (m.x - x0) * scale;
        const cy = (y1 + 1 - m.y) * scale;
        for (let yy = Math.floor(cy - r - 1); yy <= cy + r + 1; yy++) {
            for (let xx = Math.floor(cx - r - 1); xx <= cx + r + 1; xx++) {
                const d = Math.hypot(xx + 0.5 - cx, yy + 0.5 - cy);
                if (m.ring ? Math.abs(d - r) < Math.max(1, scale * 0.35) : d <= r) {
                    set(xx, yy, m.color);
                }
            }
        }
    }
    return encodePng(w, h, rgba);
}
