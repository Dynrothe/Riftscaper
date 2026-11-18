// Hitsplats as the client draws them: its splat sprite with the number on it
// in white, drawn on a 2D canvas over the world (Overlay). Where and when they
// show is the game's; this draws one.
import { formatCompact } from "../util/formatCompact";

// Hitsplat sprites (RuneLite's SpriteID): the red damage splat, the green
// poison one and the blue one for a hit that was blocked (a shield's). The game
// loads them (SpriteDataLoader) and hands them in as canvases.
export const HITSPLAT_SPRITES = { damage: 1359, poison: 1360, block: 1358 } as const;

export type HitsplatKind = keyof typeof HITSPLAT_SPRITES;

// The splat a little smaller than the client draws it; the number stays at
// the font's own size, where it's crisp
const HITSPLAT_SPRITE_SCALE = 0.85;

// A hitsplat: the client's sprite with the number on it in white. If the
// sprite didn't load, a blob of its colour stands in.
// A hitsplat's digits: in full, as OSRS shows them, till a hit gets too long
// for a splat (an endless run's, in Run Escape). drawHitsplatImage sizes its canvas from the same.
export function hitsplatText(amount: number): string {
    return amount < 100_000 ? String(amount) : formatCompact(amount);
}

export function drawHitsplat(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement | undefined,
    x: number,
    y: number,
    pixel: number,
    amount: number,
    kind: HitsplatKind,
): void {
    // The digits themselves (not the space around them) on whole pixels so
    // they stay sharp, and the splat (scaled, so smoothed anyway) centred on
    // them
    const text = hitsplatText(amount);
    const ink = ctx.measureText(text);
    const inkWidth = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight;
    const inkHeight = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
    const inkLeft = Math.round(x - inkWidth / 2);
    const inkTop = Math.round(y - inkHeight / 2);
    const centerX = inkLeft + inkWidth / 2;
    const centerY = inkTop + inkHeight / 2;
    const width = (sprite?.width ?? 24) * pixel * HITSPLAT_SPRITE_SCALE;
    const height = (sprite?.height ?? 23) * pixel * HITSPLAT_SPRITE_SCALE;
    if (sprite) {
        ctx.drawImage(sprite, centerX - width / 2, centerY - height / 2, width, height);
    } else {
        drawHitsplatBlob(ctx, centerX, centerY, width / 2, kind);
    }
    const textX = inkLeft + ink.actualBoundingBoxLeft;
    const textY = inkTop + ink.actualBoundingBoxAscent;
    ctx.fillStyle = "#000000";
    ctx.fillText(text, textX + pixel, textY + pixel);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, textX, textY);
}

// A hitsplat drawn once, as drawHitsplat would at a whole pixel, to be copied:
// measuring and drawing its text for every one of a hundred splats each frame
// is the slowest thing on the overlay. left and top are where the canvas goes
// from the corner of the digits.
export type HitsplatImage = {
    sprite: HTMLCanvasElement;
    canvas: HTMLCanvasElement;
    inkWidth: number;
    inkHeight: number;
    left: number;
    top: number;
};

// Enough for every number in a busy fight
const MAX_HITSPLAT_IMAGES = 160;

export class HitsplatImages {
    private readonly images = new Map<string, HitsplatImage>();
    private font = "";

    get(
        sprite: HTMLCanvasElement,
        font: string,
        pixel: number,
        hitsplat: { kind: HitsplatKind; amount: number },
    ): HitsplatImage {
        if (font !== this.font) {
            this.images.clear();
            this.font = font;
        }
        // By what's drawn, so an endless run's huge hits that show the same
        // ("1.2Qa") share one image
        const key = hitsplat.kind + hitsplatText(hitsplat.amount);
        let image = this.images.get(key);
        if (image && image.sprite === sprite) {
            // Most recently used last, for dropping the oldest
            this.images.delete(key);
            this.images.set(key, image);
            return image;
        }
        if (this.images.size >= MAX_HITSPLAT_IMAGES) {
            this.images.delete(this.images.keys().next().value!);
        }
        image = drawHitsplatImage(sprite, font, pixel, hitsplat.amount, hitsplat.kind);
        this.images.set(key, image);
        return image;
    }
}

function drawHitsplatImage(
    sprite: HTMLCanvasElement,
    font: string,
    pixel: number,
    amount: number,
    kind: HitsplatKind,
): HitsplatImage {
    const canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d")!;
    ctx.font = font;
    const ink = ctx.measureText(hitsplatText(amount));
    const inkWidth = ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight;
    const inkHeight = ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent;
    const width = sprite.width * pixel * HITSPLAT_SPRITE_SCALE;
    const height = sprite.height * pixel * HITSPLAT_SPRITE_SCALE;
    // Room for the splat and the digits' shadow, a pixel past each
    const left = Math.floor(Math.min(0, inkWidth / 2 - width / 2)) - 1;
    const top = Math.floor(Math.min(0, inkHeight / 2 - height / 2)) - 1;
    const right = Math.ceil(Math.max(inkWidth + pixel, inkWidth / 2 + width / 2)) + 1;
    const bottom = Math.ceil(Math.max(inkHeight + pixel, inkHeight / 2 + height / 2)) + 1;
    canvas.width = right - left;
    canvas.height = bottom - top;
    // Sizing the canvas resets its context
    ctx = canvas.getContext("2d")!;
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.imageSmoothingQuality = "high";
    // As drawHitsplat, with the digits' corner at (-left, -top), a whole pixel
    drawHitsplat(ctx, sprite, -left + inkWidth / 2, -top + inkHeight / 2, pixel, amount, kind);
    return { sprite, canvas, inkWidth, inkHeight, left, top };
}

// Fill and edge of the blob that stands in for a splat that didn't load
const HITSPLAT_BLOB_COLORS: Record<HitsplatKind, [string, string]> = {
    damage: ["#b0120c", "#3a0402"],
    poison: ["#1f8a12", "#063a02"],
    block: ["#1c5fd0", "#061a3a"],
};

function drawHitsplatBlob(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    kind: HitsplatKind,
): void {
    ctx.beginPath();
    const points = 9;
    for (let i = 0; i <= points * 2; i++) {
        const a = (i / (points * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? radius : radius * 0.82;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r * 0.9;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fillStyle = HITSPLAT_BLOB_COLORS[kind][0];
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = HITSPLAT_BLOB_COLORS[kind][1];
    ctx.stroke();
}
