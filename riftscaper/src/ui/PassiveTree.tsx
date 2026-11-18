// The passive tree, over the whole screen while it's open (the game waits): every node and the
// links between them, drawn on a canvas, dragged about and zoomed with the wheel. A node's tooltip
// says what it gives; a click takes it and the shortest way to it, a right-click gives one back.
// A socket taken holds a talisman, set from the pack in its picker (a click on it); a unique one's
// radius is drawn round it.
// It's dressed as the client's interface: a stone frame round it, the nodes stone discs with the
// stats tab's skill icons on the bigger ones (and the prayers' on the keystones), and the names in
// the client's fonts, at their own size whatever the zoom.
//
// It's a canvas rather than SVG for speed: some 3,000 shapes in SVG were all drawn again for every
// move of a drag, and every node again whenever the pointer met a new one. On the canvas a disc is
// drawn once for each look at the zoom it's shown at (discSprite) and copied for every node that
// looks so, only the nodes on screen are drawn, and the links are one shape for each colour. The
// view moves once a frame however many pointer and wheel events came (showView), and the tooltip
// follows the pointer by its style alone, so moving over a node draws nothing again.
//
// What's under the pointer is worked out from where the nodes are, each time it moves (or the tree
// moves under it), rather than from each node's enter and leave events: those go missing while a
// drag holds the pointer, when the wheel zooms the tree under a still pointer, and when a move's
// leave and its move arrive together, so a tooltip could stay up over nothing.
import { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ItemIcon, iconCache } from "../../../engine/components/rs/icon/ItemIcon";
import type { Client } from "../client/Client";
import type { ItemView, TreeView } from "../client/Store";
import { CLASSES } from "../content/classes";
import { RARITY_COLOR } from "../content/items";
import type { ClassId, StatKey, TalismanPower } from "../content/items";
import { KeystoneId, PASSIVES, PASSIVE_LINKS, PassiveKind, PassiveNode, START_NODE, TREE_RADIUS, Tint } from "../content/passives";
import { nodeLines } from "../sim/loot";
import { ExtraLinks, extraLinks, pathTo, refundable } from "../sim/passives";
import { CloseButton, PanelHead, stackText, useSprites } from "./rs";
import { TREE_ICON } from "./sprites";

const COINS = 995;

// The gem in a small node's middle, by what it's good for
const TINT: Record<Tint, string> = {
    life: "#d8463a",
    mana: "#4a7ae8",
    defence: "#b0b0b8",
    damage: "#e88a3a",
    speed: "#46c8a8",
    crit: "#e8d84a",
    utility: "#b080e0",
    str: "#d03a2a",
    dex: "#3ab03a",
    int: "#3a6ae0",
    fire: "#ff6a2a",
    cold: "#6ac8ff",
    lightning: "#f8f080",
    thrall: "#8ce0a0",
    keystone: "#e8b868",
};

// A unique talisman's radius, by what it does there
const FIELD_TINT: Record<TalismanPower, string> = {
    omni: "#f0f0f0",
    catalytic: "#e8d84a",
    bloodConversion: "#d8463a",
    deathConversion: "#8ce0a0",
    lawConversion: "#b080e0",
    soul: "#6ac8ff",
};

// The cache's pictures (ui/sprites.ts, so the slim cache has them)
const ICON = TREE_ICON;
const TILE = ICON.tile;
const TILE_TAKEN = ICON.tileTaken;

const KEYSTONE_ICON: Record<KeystoneId, number> = {
    zamoraksFury: ICON.retribution,
    ironSkin: ICON.steelSkin,
    steadyHand: ICON.sharpEye,
    acrobatics: ICON.agility,
    pointBlank: ICON.protectMissiles,
    mindOverMatter: ICON.clarity,
    bloodRite: ICON.rapidHeal,
    painAttunement: ICON.smite,
    vampiricPact: ICON.redemption,
    arceuusCovenant: ICON.slayer,
    demonicOffering: ICON.mysticLore,
    inferno: ICON.firemaking,
    iceBarrage: ICON.iceSpell,
    tempest: ICON.sparkSpell,
    templeOath: ICON.mysticMight,
    vengeance: ICON.protectMelee,
    dharoksCurse: ICON.superhumanStrength,
    piety: ICON.ultimateStrength,
    graceful: ICON.running,
    dragonClaws: ICON.attack,
    chinchompa: ICON.eagleEye,
    rigour: ICON.rigour,
    barbarianHerblore: ICON.herblore,
};

// What a node's colour says first, where it says enough on its own
const TINT_ICON: Partial<Record<Tint, number>> = {
    str: ICON.strength,
    dex: ICON.ranged,
    int: ICON.magic,
    fire: ICON.firemaking,
    cold: ICON.waterBlast,
    lightning: ICON.windBolt,
    thrall: ICON.slayer,
};

// Otherwise, its first stat that has a picture
const STAT_ICON: Partial<Record<StatKey, number>> = {
    life: ICON.hitpoints,
    lifePct: ICON.hitpoints,
    lifeRegen: ICON.hitpoints,
    lifeRegenPct: ICON.hitpoints,
    lifeLeech: ICON.hitpoints,
    lifeOnHit: ICON.hitpoints,
    lifeOnKill: ICON.hitpoints,
    mana: ICON.prayer,
    manaPct: ICON.prayer,
    manaRegen: ICON.prayer,
    manaCostPct: ICON.prayer,
    manaOnKill: ICON.prayer,
    armour: ICON.defence,
    armourPct: ICON.defence,
    evade: ICON.thieving,
    meleeDamagePct: ICON.attack,
    projectileDamagePct: ICON.ranged,
    extraProjectiles: ICON.ranged,
    spellDamagePct: ICON.magic,
    castSpeedPct: ICON.magic,
    areaDamagePct: ICON.runecraft,
    areaPct: ICON.runecraft,
    elementalDamagePct: ICON.runecraft,
    physicalDamagePct: ICON.strength,
    damagePct: ICON.strength,
    addedMin: ICON.strength,
    addedMax: ICON.strength,
    stunChance: ICON.strength,
    critChance: ICON.slayer,
    critMulti: ICON.slayer,
    attackSpeedPct: ICON.agility,
    moveSpeedPct: ICON.agility,
    cooldownPct: ICON.running,
    durationPct: ICON.vial,
    flaskPct: ICON.herblore,
    potionFillPct: ICON.herblore,
    potionEffectPct: ICON.vial,
    potionRareDose: ICON.herblore,
    rarity: ICON.treasure,
    igniteChance: ICON.firemaking,
    freezeChance: ICON.waterBlast,
    shockChance: ICON.windBolt,
    thrallDamagePct: ICON.slayer,
    thrallSpeedPct: ICON.slayer,
    thrallSizePct: ICON.slayer,
    extraThralls: ICON.slayer,
    burnDamagePct: ICON.firemaking,
    burnLengthPct: ICON.firemaking,
    freezeLengthPct: ICON.waterBlast,
    shockLengthPct: ICON.windBolt,
    shockEffectPct: ICON.windBolt,
    extraChain: ICON.windBolt,
    extraPierce: ICON.ranged,
    buffEffectPct: ICON.prayer,
    lessDamageTaken: ICON.defence,
    spellPerStr: ICON.magic,
    meleePerInt: ICON.attack,
    projectileAreaPct: ICON.runecraft,
    burstDamagePct: ICON.runecraft,
};

function nodeIcon(n: PassiveNode): number | undefined {
    if (n.kind === "socket") {
        // Its talisman's, if it has one, drawn on its own
        return undefined;
    }
    if (n.keystone) {
        return KEYSTONE_ICON[n.keystone];
    }
    const byTint = TINT_ICON[n.tint];
    if (byTint !== undefined) {
        return byTint;
    }
    for (const line of n.stats) {
        const icon = STAT_ICON[line.stat];
        if (icon !== undefined) {
            return icon;
        }
    }
    return undefined;
}

// How wide each picture's drawn, against its node's radius: the spells' and prayers' have more
// empty round them than the skill icons
function iconWidth(icon: number, r: number): number {
    if (icon === ICON.windBolt || icon === ICON.waterBlast) {
        return r * 1.9;
    }
    return icon >= 115 && icon <= 135 ? r * 1.6 : r * 1.45;
}

const ICONS: number[] = [...new Set([TILE, TILE_TAKEN, ...PASSIVES.map(nodeIcon).filter((i): i is number => i !== undefined)])];

const RADIUS: Record<PassiveKind, number> = { start: 38, attribute: 12, small: 13, notable: 21, mastery: 24, keystone: 30, socket: 19 };

// How far from a node's middle the pointer's on it (a keystone's a square)
const REACH: Record<PassiveKind, number> = { start: 40, attribute: 14, small: 15, notable: 24, mastery: 30, keystone: 36, socket: 22 };

const KIND_NAME: Record<PassiveKind, string> = {
    start: "Class start",
    attribute: "Attribute",
    small: "Passive",
    notable: "Notable passive",
    mastery: "Mastery",
    keystone: "Keystone",
    socket: "Talisman socket",
};

// A node's frame: gold when it's taken, blue along the way to the one under the pointer, tan where
// it can be taken next, and dark stone elsewhere
type NodeState = "taken" | "way" | "open" | "shut";
const RING: Record<NodeState, string> = { taken: "#ffb000", way: "#9fd0ff", open: "#c8a468", shut: "#17120d" };

// Out far enough to see the whole wheel, wings and all, as 0.12 did before them
const MIN_ZOOM = 0.09;
const MAX_ZOOM = 2.2;

// Each link's line, or arc where both ends sit on the same ring
const EDGE_PATHS: string[] = PASSIVE_LINKS.map(([a, b]) => {
    const p = PASSIVES[a];
    const q = PASSIVES[b];
    const o = p.orbit;
    const r = q.orbit;
    if (o && r && o.x === r.x && o.y === r.y && o.r === r.r) {
        const cross = (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
        return `M${p.x} ${p.y}A${o.r} ${o.r} 0 0 ${cross > 0 ? 1 : 0} ${q.x} ${q.y}`;
    }
    return `M${p.x} ${p.y}L${q.x} ${q.y}`;
});
// Every link as one shape, made when it's first drawn (Path2D is the browser's, and the tests have none)
let allEdges: Path2D | undefined;

// The nodes with names written under them
const NAMED = PASSIVES.filter((n) => n.kind === "start" || n.kind === "keystone" || n.kind === "notable" || n.kind === "mastery");

// The node under a point on the tree, if any: the nearest one it's on, or a little way round,
// so a small node far off is still easy to point at
function nodeAt(x: number, y: number, zoom: number): number | undefined {
    const slack = Math.max(2, 4 / zoom);
    let best: number | undefined;
    let bestD = Infinity;
    for (const n of PASSIVES) {
        const reach = REACH[n.kind] + slack;
        const dx = n.x - x;
        const dy = n.y - y;
        const d = dx * dx + dy * dy;
        if (d <= reach * reach && d < bestD) {
            best = n.id;
            bestD = d;
        }
    }
    return best;
}

type View = { cx: number; cy: number; zoom: number };
type Point = { x: number; y: number };

// ---- Drawing ----

// The links by colour, each one shape: gold between two taken, tan where one end is, blue along
// the way to the node under the pointer, and stone between the rest
type EdgeGroups = { dark: Path2D; near: Path2D; way: Path2D; lit: Path2D };

function edgeGroups(taken: Set<number>, path: Set<number>): EdgeGroups {
    const lit: string[] = [];
    const near: string[] = [];
    const way: string[] = [];
    const dark: string[] = [];
    PASSIVE_LINKS.forEach(([a, b], i) => {
        const ta = taken.has(a);
        const tb = taken.has(b);
        const d = EDGE_PATHS[i];
        if (ta && tb) {
            lit.push(d);
        } else if ((path.has(a) || ta) && (path.has(b) || tb)) {
            way.push(d);
        } else if (ta || tb) {
            near.push(d);
        } else {
            dark.push(d);
        }
    });
    return { dark: new Path2D(dark.join("")), near: new Path2D(near.join("")), way: new Path2D(way.join("")), lit: new Path2D(lit.join("")) };
}

// How a node's drawn: its frame's state, whether it's another class's start, whether the search
// found it, and whether its picture's on it (else the gem in its middle)
type Look = { state: NodeState; other: boolean; found: boolean; picture: boolean };

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
}

function square(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, round: number): void {
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, round);
}

// A node's stone over a square (x, y its top left, s its side), lit from the top left as the
// interface's is
function stone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dim: boolean): CanvasGradient {
    const fx = x + 0.38 * s;
    const fy = y + 0.32 * s;
    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 0.7 * s);
    if (dim) {
        g.addColorStop(0, "#4e4538");
        g.addColorStop(1, "#1c1813");
    } else {
        g.addColorStop(0, "#8c7f68");
        g.addColorStop(0.55, "#5c5141");
        g.addColorStop(1, "#2c251d");
    }
    return g;
}

// A round node's disc at (x, y), everything but its picture
function drawDisc(ctx: CanvasRenderingContext2D, n: PassiveNode, x: number, y: number, look: Look): void {
    const r = RADIUS[n.kind];
    const ring = RING[look.state];
    const taken = look.state === "taken";
    const big = n.kind === "notable" || n.kind === "mastery" || n.kind === "start";
    if (look.found) {
        circle(ctx, x, y, r + 13);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 5;
        ctx.stroke();
    }
    if (taken && big) {
        circle(ctx, x, y, r + 7);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#ffb000";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    if (n.kind === "mastery") {
        circle(ctx, x, y, r + 8);
        ctx.setLineDash([7, 5]);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    if (n.kind === "socket") {
        // A hole in the stone for a talisman, its rim notched
        circle(ctx, x, y, r + 2.5);
        ctx.fillStyle = "#0b0907";
        ctx.fill();
        circle(ctx, x, y, r);
        const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
        g.addColorStop(0, "#050403");
        g.addColorStop(1, look.state === "shut" ? "#211c16" : "#3a3126");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ring;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
        return;
    }
    circle(ctx, x, y, r + 2.5);
    ctx.fillStyle = "#0b0907";
    ctx.fill();
    circle(ctx, x, y, r);
    ctx.fillStyle = stone(ctx, x - r, y - r, r * 2, look.state === "shut" || look.other);
    ctx.fill();
    ctx.strokeStyle = ring;
    ctx.lineWidth = n.kind === "start" ? 6 : big ? 4 : 3;
    ctx.stroke();
    if (!look.picture && n.kind !== "start") {
        circle(ctx, x, y, r * 0.5);
        ctx.globalAlpha = taken ? 1 : look.state === "shut" ? 0.35 : 0.8;
        ctx.fillStyle = TINT[n.tint];
        ctx.fill();
        ctx.globalAlpha = 1;
        if (taken) {
            circle(ctx, x - r * 0.17, y - r * 0.17, r * 0.2);
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
}

// How far past its radius a disc's drawing reaches (the search's ring and its stroke)
const DISC_PAD = 16;

// The discs drawn once each for every look, at the scale they're shown at: a power of two at or
// over it, so they're crisp, and drawn again only when the zoom passes one
type Sprites = { scale: number; discs: Map<string, HTMLCanvasElement> };

function discSprite(sprites: Sprites, n: PassiveNode, look: Look): HTMLCanvasElement {
    const key = `${n.kind}|${look.state}|${look.other ? 1 : 0}|${look.found ? 1 : 0}|${look.picture || n.kind === "start" ? "" : n.tint}`;
    let sprite = sprites.discs.get(key);
    if (!sprite) {
        const ext = RADIUS[n.kind] + DISC_PAD;
        const side = Math.ceil(ext * 2 * sprites.scale);
        sprite = document.createElement("canvas");
        sprite.width = side;
        sprite.height = side;
        const ctx = sprite.getContext("2d")!;
        const k = side / (ext * 2);
        ctx.setTransform(k, 0, 0, k, side / 2, side / 2);
        drawDisc(ctx, n, 0, 0, look);
        sprites.discs.set(key, sprite);
    }
    return sprite;
}

// A keystone: the stats tab's stone square, red once it's taken, its picture drawn after
function drawKeystone(ctx: CanvasRenderingContext2D, n: PassiveNode, look: Look, images: Record<number, HTMLImageElement>): void {
    const s = RADIUS.keystone * 2.1;
    const x = n.x - s / 2;
    const y = n.y - s / 2;
    const taken = look.state === "taken";
    if (look.found) {
        square(ctx, x - 14, y - 14, s + 28, 12);
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 5;
        ctx.stroke();
    }
    if (taken) {
        square(ctx, x - 9, y - 9, s + 18, 10);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#ffb000";
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    square(ctx, x - 4, y - 4, s + 8, 8);
    ctx.fillStyle = "#0b0907";
    ctx.fill();
    ctx.strokeStyle = RING[look.state];
    ctx.lineWidth = 4;
    ctx.stroke();
    const tile = images[taken ? TILE_TAKEN : TILE];
    if (tile) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tile, x, y, s, s);
        ctx.imageSmoothingEnabled = true;
    } else {
        square(ctx, x, y, s, 5);
        ctx.fillStyle = taken ? "#7e2e1d" : stone(ctx, x, y, s, false);
        ctx.fill();
    }
}

// A node's picture, kept as pixels however far it's zoomed, fainter where it can't be taken yet
function drawPicture(ctx: CanvasRenderingContext2D, n: PassiveNode, state: NodeState, image: HTMLImageElement, icon: number): void {
    const w = iconWidth(icon, RADIUS[n.kind]);
    ctx.globalAlpha = state === "taken" ? 1 : state === "shut" ? 0.35 : 0.75;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, n.x - w / 2, n.y - w / 2, w, w);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 1;
}

// Round the node under the pointer (square round a keystone's square)
function drawHoverRing(ctx: CanvasRenderingContext2D, n: PassiveNode, zoom: number): void {
    if (n.kind === "keystone") {
        const s = RADIUS.keystone * 2.1 + 20;
        square(ctx, n.x - s / 2, n.y - s / 2, s, 11);
    } else {
        circle(ctx, n.x, n.y, RADIUS[n.kind] + 7);
    }
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, 2.5 / zoom);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

type Scene = {
    // The box's size, and the canvas's pixels to each of its own
    w: number;
    h: number;
    pixel: number;
    view: View;
    cls: ClassId;
    taken: Set<number>;
    path: Set<number>;
    found: Set<number>;
    edges: EdgeGroups;
    images: Record<number, HTMLImageElement>;
    hovered?: PassiveNode;
    // The talismans' pictures, by socket; the unique ones' radii; an Elemental talisman's links
    talismans: Record<number, HTMLImageElement>;
    fields: TreeView["fields"];
    extra: ExtraLinks;
};

// How far past the screen's edge a node's middle can be and still show some of it
const CULL_PAD = 60;

function drawTree(ctx: CanvasRenderingContext2D, scene: Scene, sprites: Sprites): void {
    const { w, h, pixel, view, cls, taken, path, found, edges, images, hovered, talismans, fields, extra } = scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const k = pixel * view.zoom;
    ctx.setTransform(k, 0, 0, k, pixel * (w / 2 - view.cx * view.zoom), pixel * (h / 2 - view.cy * view.zoom));

    const glowR = TREE_RADIUS + 80;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
    glow.addColorStop(0, "rgba(255, 152, 31, 0.12)");
    glow.addColorStop(1, "rgba(255, 152, 31, 0)");
    circle(ctx, 0, 0, glowR);
    ctx.fillStyle = glow;
    ctx.fill();

    // The links, each over a dark edge
    allEdges ??= new Path2D(EDGE_PATHS.join(""));
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0b0907";
    ctx.lineWidth = 11;
    ctx.stroke(allEdges);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#4d4233";
    ctx.stroke(edges.dark);
    ctx.strokeStyle = "#9a7c4c";
    ctx.stroke(edges.near);
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#9fd0ff";
    ctx.stroke(edges.way);
    ctx.strokeStyle = "#ffb000";
    ctx.stroke(edges.lit);

    // The unique talismans' radii, faint over what's in them
    for (const f of fields) {
        const s = PASSIVES[f.socket];
        circle(ctx, s.x, s.y, f.radius);
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = FIELD_TINT[f.power];
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([18, 12]);
        ctx.strokeStyle = FIELD_TINT[f.power];
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    // The nodes on screen
    const scale = Math.pow(2, Math.ceil(Math.log2(Math.max(0.125, k))));
    if (sprites.scale !== scale) {
        sprites.scale = scale;
        sprites.discs.clear();
    }
    const halfW = w / 2 / view.zoom + CULL_PAD;
    const halfH = h / 2 / view.zoom + CULL_PAD;
    for (const n of PASSIVES) {
        if (Math.abs(n.x - view.cx) > halfW || Math.abs(n.y - view.cy) > halfH) {
            continue;
        }
        const isTaken = taken.has(n.id);
        const other = n.kind === "start" && n.cls !== cls;
        const reachable = !isTaken && !other && (n.links.some((l) => taken.has(l)) || !!extra.get(n.id)?.some((l) => taken.has(l)));
        const state: NodeState = isTaken ? "taken" : path.has(n.id) ? "way" : reachable ? "open" : "shut";
        const icon = nodeIcon(n);
        const image = icon !== undefined && n.kind !== "small" && n.kind !== "attribute" ? images[icon] : undefined;
        const look: Look = { state, other, found: found.has(n.id), picture: image !== undefined };
        if (n.kind === "keystone") {
            drawKeystone(ctx, n, look, images);
        } else {
            const ext = RADIUS[n.kind] + DISC_PAD;
            ctx.drawImage(discSprite(sprites, n, look), n.x - ext, n.y - ext, ext * 2, ext * 2);
        }
        if (image) {
            drawPicture(ctx, n, state, image, icon!);
        }
        const talisman = n.kind === "socket" ? talismans[n.id] : undefined;
        if (talisman) {
            // Its item icon, a little over the hole (an icon's 36 by 32, with room round it)
            const iw = RADIUS.socket * 2.3;
            ctx.globalAlpha = isTaken ? 1 : 0.45;
            ctx.drawImage(talisman, n.x - iw / 2, n.y - (iw * 32) / 36 / 2, iw, (iw * 32) / 36);
            ctx.globalAlpha = 1;
        }
    }
    if (hovered) {
        drawHoverRing(ctx, hovered, view.zoom);
    }
}

// The pictures from their addresses, as images to draw: those not loaded yet are missing, and
// it's drawn again as each comes in
const IMAGES = new Map<string, HTMLImageElement>();

function useImages(urls: Record<number, string>): Record<number, HTMLImageElement> {
    const [, setLoads] = useState(0);
    useEffect(() => {
        const loaded = () => setLoads((v) => v + 1);
        const waiting: HTMLImageElement[] = [];
        let ready = false;
        for (const url of Object.values(urls)) {
            let image = IMAGES.get(url);
            if (!image) {
                image = new Image();
                image.src = url;
                IMAGES.set(url, image);
                // One that's there at once (it was cached) is drawn on the next render
                ready ||= image.complete;
            }
            if (!image.complete) {
                image.addEventListener("load", loaded);
                waiting.push(image);
            }
        }
        if (ready) {
            loaded();
        }
        return () => {
            for (const image of waiting) {
                image.removeEventListener("load", loaded);
            }
        };
    }, [urls]);
    const out: Record<number, HTMLImageElement> = {};
    for (const [id, url] of Object.entries(urls)) {
        const image = IMAGES.get(url);
        if (image?.complete && image.naturalWidth > 0) {
            out[Number(id)] = image;
        }
    }
    return out;
}

// Item icons' addresses, by object (the engine draws them in a worker), as each comes in
function useItemIcons(objIds: number[]): Record<number, string> {
    const key = objIds.join(",");
    const [urls, setUrls] = useState<Record<number, string>>({});
    useEffect(() => {
        let cancelled = false;
        const have = (id: number, url: string) => setUrls((known) => (known[id] === url ? known : { ...known, [id]: url }));
        for (const id of objIds) {
            const known = iconCache.get(id, 1);
            if (known) {
                have(id, known);
            } else {
                iconCache.request(id, 1, (url) => {
                    if (!cancelled && url) {
                        have(id, url);
                    }
                });
            }
        }
        return () => {
            cancelled = true;
        };
        // The ids, by what they are rather than the array they came in
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return urls;
}

// ---- The screen ----

type Props = { tree: TreeView; client: Client };

export function PassiveTree({ tree, client }: Props): JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const tip = useRef<HTMLDivElement>(null);
    // The box's size, and the screen's pixels to each of its own (the interface is zoomed)
    const [size, setSize] = useState({ w: 1280, h: 720, pixel: 1 });
    const start = PASSIVES[START_NODE[tree.cls]];
    const [view, setView] = useState<View>(() => ({ cx: start.x * 0.8, cy: start.y * 0.8, zoom: 0.6 }));
    // The view as it'll be shown next frame: what the pointer and the wheel move, and read
    const nextView = useRef(view);
    const frame = useRef<number | undefined>(undefined);
    // The node under the pointer, and where the pointer is in the box
    const [hoverId, setHoverId] = useState<number>();
    const pointer = useRef<Point>({ x: 0, y: 0 });
    const [search, setSearch] = useState("");
    const [showTotals, setShowTotals] = useState(true);
    const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean; button: number } | undefined>(undefined);
    const nextMatch = useRef(0);
    const sprites = useRef<Sprites>({ scale: 0, discs: new Map() });
    const icons = useSprites(ICONS);
    const images = useImages(icons);
    // The socket whose talisman picker is open
    const [picking, setPicking] = useState<number>();
    const objIds = useMemo(() => [...new Set([...Object.values(tree.talismans), ...tree.packTalismans.map((t) => t.item)].map((t) => t.info.objId))].sort((a, b) => a - b), [tree.talismans, tree.packTalismans]);
    const itemIcons = useItemIcons(objIds);
    const talismanUrls = useMemo(() => {
        const out: Record<number, string> = {};
        for (const [id, item] of Object.entries(tree.talismans)) {
            const url = itemIcons[item.info.objId];
            if (url) {
                out[Number(id)] = url;
            }
        }
        return out;
    }, [tree.talismans, itemIcons]);
    const talismanImages = useImages(talismanUrls);

    useEffect(() => {
        const el = box.current;
        if (!el) {
            return;
        }
        const measure = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            const rect = el.getBoundingClientRect();
            const pixel = Math.round(((window.devicePixelRatio || 1) * (w > 0 ? rect.width / w : 1)) * 100) / 100;
            setSize((s) => (s.w === w && s.h === h && s.pixel === pixel ? s : { w, h, pixel }));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        // The interface's zoom and the screen's pixels change without the box's size
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, []);
    useEffect(() => () => {
        if (frame.current !== undefined) {
            cancelAnimationFrame(frame.current);
        }
    }, []);

    const taken = useMemo(() => new Set([START_NODE[tree.cls], ...tree.taken]), [tree.cls, tree.taken]);
    const extra = useMemo(() => extraLinks(tree.omni, taken), [tree.omni, taken]);
    const path = useMemo(() => (hoverId !== undefined ? pathTo(tree.cls, taken, hoverId, extra) : undefined), [hoverId, taken, tree.cls, extra]);
    const pathSet = useMemo(() => new Set(path ?? []), [path]);
    const matches = useMemo(() => searchNodes(search), [search]);
    const found = useMemo(() => new Set(matches), [matches]);
    const edges = useMemo(() => edgeGroups(taken, pathSet), [taken, pathSet]);
    const hovered = hoverId !== undefined ? PASSIVES[hoverId] : undefined;

    // The tree, drawn again after every render: they come once a frame at most while it moves
    useLayoutEffect(() => {
        const ctx = canvas.current?.getContext("2d");
        if (ctx) {
            drawTree(ctx, { ...size, view, cls: tree.cls, taken, path: pathSet, found, edges, images, hovered, talismans: talismanImages, fields: tree.fields, extra }, sprites.current);
        }
    });

    // The view's shown on the next frame, with whatever else moves it before then
    const showView = (v: View) => {
        nextView.current = v;
        frame.current ??= requestAnimationFrame(() => {
            frame.current = undefined;
            setView(nextView.current);
        });
    };

    // The tooltip beside the pointer, to its right and below, or turned the other way where
    // there's no room: moved by its style, so following the pointer draws nothing again
    const placeTip = () => {
        const el = tip.current;
        if (!el) {
            return;
        }
        const { x, y } = pointer.current;
        const tw = el.offsetWidth;
        const th = el.offsetHeight;
        let left = x + 18;
        if (left + tw > size.w - 6) {
            left = Math.max(6, x - 14 - tw);
        }
        let top = y + 18;
        if (top + th > size.h - 6) {
            top = Math.max(6, y - 14 - th);
        }
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.visibility = "visible";
    };
    useLayoutEffect(placeTip, [hoverId, size, tree]);

    // From the pointer to the box's own pixels (the screens are zoomed), and on to the tree's
    const local = useCallback((clientX: number, clientY: number): Point => {
        const el = box.current!;
        const rect = el.getBoundingClientRect();
        return { x: ((clientX - rect.left) * el.clientWidth) / rect.width, y: ((clientY - rect.top) * el.clientHeight) / rect.height };
    }, []);
    const toTree = (at: Point, v: View): Point => ({ x: (at.x - size.w / 2) / v.zoom + v.cx, y: (at.y - size.h / 2) / v.zoom + v.cy });

    // What's under the pointer, with the tree as it's (about to be) shown
    const pointAt = (at: Point, v = nextView.current) => {
        const t = toTree(at, v);
        pointer.current = at;
        setHoverId(nodeAt(t.x, t.y, v.zoom));
        placeTip();
    };
    // The totals' panel and a socket's picker are over the tree, and aren't the tree
    const onTree = (e: { target: EventTarget }) => !(e.target as Element).closest?.(".tree-totals, .tree-picker");

    const onWheel = (e: ReactWheelEvent) => {
        if (!onTree(e)) {
            return;
        }
        const at = local(e.clientX, e.clientY);
        const v = nextView.current;
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.pow(1.15, -Math.sign(e.deltaY))));
        const before = toTree(at, v);
        // The point under the mouse stays under it
        const next = { zoom, cx: before.x - (at.x - size.w / 2) / zoom, cy: before.y - (at.y - size.h / 2) / zoom };
        showView(next);
        if (!drag.current) {
            pointAt(at, next);
        }
    };
    const onPointerDown = (e: ReactPointerEvent) => {
        if ((e.button !== 0 && e.button !== 2) || !onTree(e)) {
            return;
        }
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        const v = nextView.current;
        drag.current = { x: e.clientX, y: e.clientY, cx: v.cx, cy: v.cy, moved: false, button: e.button };
    };
    const onPointerMove = (e: ReactPointerEvent) => {
        const at = local(e.clientX, e.clientY);
        const d = drag.current;
        if (d) {
            const a = local(d.x, d.y);
            if (!d.moved && Math.hypot(at.x - a.x, at.y - a.y) > 5) {
                d.moved = true;
                setHoverId(undefined);
            }
            if (d.moved) {
                const v = nextView.current;
                const cx = Math.max(-TREE_RADIUS, Math.min(TREE_RADIUS, d.cx - (at.x - a.x) / v.zoom));
                const cy = Math.max(-TREE_RADIUS, Math.min(TREE_RADIUS, d.cy - (at.y - a.y) / v.zoom));
                showView({ ...v, cx, cy });
            } else {
                pointAt(at);
            }
            return;
        }
        if (onTree(e)) {
            pointAt(at);
        } else {
            setHoverId(undefined);
        }
    };
    const onPointerUp = (e: ReactPointerEvent) => {
        const d = drag.current;
        drag.current = undefined;
        if (!d) {
            return;
        }
        const at = local(e.clientX, e.clientY);
        if (!d.moved) {
            // What's under the pointer now, not what was when the button went down
            const v = nextView.current;
            const t = toTree(at, v);
            const id = nodeAt(t.x, t.y, v.zoom);
            if (id !== undefined) {
                if (d.button === 0 && PASSIVES[id].kind === "socket" && taken.has(id)) {
                    // A socket taken: its picker
                    setPicking(id);
                } else if (d.button === 0) {
                    client.allocatePassive(id);
                } else {
                    client.refundPassive(id);
                }
            }
        }
        pointAt(at);
    };
    // A drag cut short (the pointer's taken away) ends there
    const onDragLost = () => {
        drag.current = undefined;
    };
    const onPointerLeave = () => {
        if (!drag.current) {
            setHoverId(undefined);
        }
    };
    const centre = (id: number) => showView({ zoom: Math.max(nextView.current.zoom, 0.8), cx: PASSIVES[id].x, cy: PASSIVES[id].y });

    const resetDisabled = tree.taken.length === 0 || tree.gold < tree.resetCost;
    const picked = picking !== undefined && taken.has(picking) ? picking : undefined;
    const gold = stackText(tree.gold);
    return (
        <div className="tree-screen panel rs-background ui-modal" onContextMenu={(e) => e.preventDefault()}>
            <div className="tree-head">
                <span className={`tree-points ${tree.points > 0 ? "has" : ""}`}>
                    {tree.points} {tree.points === 1 ? "point" : "points"} to spend
                </span>
                <span className="panel-title">Passive Tree</span>
                <span className="tree-taken">
                    {tree.taken.length} of {tree.total} taken
                </span>
                <CloseButton title="Close (P)" onClick={() => client.setTree(false)} />
            </div>
            {tree.freeReset && (
                <div className="tree-free-reset">The tree has grown since you spent your points: starting it over is free, once. Reset below to try the new wings and sockets.</div>
            )}
            <div
                ref={box}
                className={`tree-box ${hovered ? "on-node" : ""}`}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onDragLost}
                onLostPointerCapture={onDragLost}
                onPointerLeave={onPointerLeave}
            >
                <canvas
                    ref={canvas}
                    className="tree-canvas"
                    width={Math.max(1, Math.round(size.w * size.pixel))}
                    height={Math.max(1, Math.round(size.h * size.pixel))}
                    style={{ width: size.w, height: size.h }}
                />
                <Labels cls={tree.cls} view={view} w={size.w} h={size.h} />
                {showTotals && (
                    <div className="tree-totals panel rs-background">
                        <div className="panel-title">What your passives give</div>
                        {tree.summary.length === 0 ? (
                            <div className="dim">Nothing yet. Take a node next to your start.</div>
                        ) : (
                            tree.summary.map((line) => (
                                <div key={line} className="tree-total">
                                    {line}
                                </div>
                            ))
                        )}
                    </div>
                )}
                {picked !== undefined && <SocketPicker socket={picked} tree={tree} icons={itemIcons} client={client} onClose={() => setPicking(undefined)} />}
                {hovered && (
                    <NodeTip
                        node={hovered}
                        icon={hovered.kind === "socket" && tree.talismans[hovered.id] ? itemIcons[tree.talismans[hovered.id].info.objId] : icons[nodeIcon(hovered) ?? -1]}
                        tree={tree}
                        taken={taken}
                        path={path}
                        boxRef={tip}
                    />
                )}
                <div className="tree-hint">
                    Click a node to take it, with the way to it - Right-click to give one back ({tree.refundCost} gold) - Drag to look about - Wheel to zoom
                </div>
            </div>
            <div className="tree-foot">
                <input
                    className="tree-search"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        nextMatch.current = 0;
                    }}
                    onKeyDown={(e) => {
                        // Enter goes to each found one in turn
                        if (e.key === "Enter" && matches.length > 0) {
                            centre(matches[nextMatch.current % matches.length]);
                            nextMatch.current++;
                        }
                        e.stopPropagation();
                    }}
                />
                {search.trim().length >= 2 && <span className="tree-found">{matches.length === 0 ? "None found" : `${matches.length} found - Enter to go to each`}</span>}
                <span className="tree-gold" data-tip={`${tree.gold} gold`}>
                    <ItemIcon objId={COINS} count={Math.max(1, tree.gold)} size={24} />
                    <span style={{ color: gold.color }}>{gold.text}</span>
                </span>
                <button className={`ui-button small ${showTotals ? "chosen" : ""}`} onClick={() => setShowTotals(!showTotals)}>
                    Totals
                </button>
                <button
                    className={`ui-button small ${tree.freeReset ? "chosen" : ""}`}
                    disabled={resetDisabled}
                    data-tip={tree.freeReset ? "Every point back, for nothing: the tree has changed since you spent them" : "Every point back, for half what giving them back one by one costs"}
                    onClick={() => client.resetPassives()}
                >
                    {tree.freeReset ? "Reset (free)" : `Reset (${tree.resetCost} gold)`}
                </button>
            </div>
        </div>
    );
}

// The names, in the client's fonts at their own size over the drawing (so they're crisp at any
// zoom): the starts' always, the keystones' and masteries' unless it's far out, notables' closer in
function shown(kind: PassiveKind, zoom: number): boolean {
    switch (kind) {
        case "start":
            return true;
        case "keystone":
            return zoom > 0.2;
        case "mastery":
            return zoom > 0.25;
        case "notable":
            return zoom > 0.5;
        default:
            return false;
    }
}

const Labels = memo(function Labels({ cls, view, w, h }: { cls: ClassId; view: View; w: number; h: number }): JSX.Element {
    const labels: JSX.Element[] = [];
    for (const n of NAMED) {
        if (!shown(n.kind, view.zoom)) {
            continue;
        }
        const x = (n.x - view.cx) * view.zoom + w / 2;
        const y = (n.y - view.cy) * view.zoom + h / 2;
        if (x < -120 || x > w + 120 || y < -60 || y > h + 40) {
            continue;
        }
        const below = (n.kind === "keystone" ? RADIUS.keystone * 1.2 : RADIUS[n.kind] + 6) * view.zoom + 4;
        const other = n.kind === "start" && n.cls !== cls;
        labels.push(
            <div key={n.id} className={`tree-label ${n.kind} ${other ? "other" : ""}`} style={{ left: Math.round(x) - 100, top: Math.round(y + below) }}>
                {n.name}
            </div>,
        );
    }
    return <div className="tree-labels">{labels}</div>;
});

type TipProps = {
    node: PassiveNode;
    icon?: string;
    tree: TreeView;
    taken: Set<number>;
    path?: number[];
    // The card, which the screen moves beside the pointer (placeTip)
    boxRef: RefObject<HTMLDivElement | null>;
};

// Drawn again only for another node or another tree, not as the pointer or the view moves: what
// it says can take a search of the tree for every class
const NodeTip = memo(function NodeTip({ node, icon, tree, taken, path, boxRef }: TipProps): JSX.Element {
    const isTaken = taken.has(node.id);
    let status: { text: string; bad?: boolean };
    if (node.kind === "start") {
        status = node.cls === tree.cls ? { text: "Where you start" } : { text: `The ${CLASSES[node.cls!].name}'s start. You can't pass through it.`, bad: true };
    } else if (isTaken && node.kind === "socket") {
        status = { text: tree.talismans[node.id] ? "Click to change its talisman, or take it out." : "Click to set a talisman in it." };
    } else if (isTaken) {
        status = refundable(tree.cls, tree.taken, node.id, tree.omni)
            ? { text: `Taken. Right-click to give it back for ${tree.refundCost} gold.` }
            : { text: "Taken. Others you've taken hang from it.", bad: true };
    } else if (!path) {
        const owner = (Object.keys(START_NODE) as ClassId[]).find((cls) => cls !== tree.cls && (pathTo(cls, new Set([START_NODE[cls]]), node.id)?.length ?? 99) <= 3);
        status = { text: owner ? `Only the ${CLASSES[owner].name} can reach this` : "Out of reach", bad: true };
    } else {
        const need = path.length;
        status =
            need <= tree.points
                ? { text: `Click to take it${need > 1 ? ` and the ${need - 1} on the way` : ""}: ${need} ${need === 1 ? "point" : "points"}` }
                : { text: `Needs ${need} ${need === 1 ? "point" : "points"}; you have ${tree.points}`, bad: true };
    }
    // A socket's card isn't "socket", the class of the gems' sockets
    const lines = nodeLines(node.id);
    const talisman = node.kind === "socket" ? tree.talismans[node.id] : undefined;
    // The unique talismans whose radius it's in
    const over = tree.fields.filter((f) => f.socket !== node.id && Math.hypot(PASSIVES[f.socket].x - node.x, PASSIVES[f.socket].y - node.y) <= f.radius);
    return (
        <div ref={boxRef} className={`tree-tip item-card ${node.kind === "socket" ? "talisman-socket" : node.kind}`} style={{ visibility: "hidden" }}>
            <div className="tip-head">
                {icon && <img className="ui-icon tip-icon" src={icon} alt="" draggable={false} />}
                <div>
                    <div className={`card-name tip-${node.kind}`}>{node.name}</div>
                    <div className="card-line dim">{KIND_NAME[node.kind]}</div>
                </div>
            </div>
            {lines.length > 0 && <div className="card-sep" />}
            {lines.map((line, i) => (
                <div key={i} className="card-line mod">
                    {line}
                </div>
            ))}
            {node.kind === "socket" && (
                <>
                    <div className="card-sep" />
                    {talisman ? <TalismanLines item={talisman} /> : <div className="card-line dim">Empty. Talismans drop in the rifts, most often from rares and guardians.</div>}
                </>
            )}
            {over.map((f) => (
                <div key={f.socket} className="card-line dim">
                    In the radius of your {tree.talismans[f.socket]?.info.name ?? "talisman"}
                </div>
            ))}
            <div className="card-sep" />
            <div className={`card-line ${status.bad ? "bad" : "good"}`}>{status.text}</div>
        </div>
    );
});

// A talisman's name and what it gives, as its card says them
function TalismanLines({ item }: { item: ItemView }): JSX.Element {
    return (
        <>
            <div className="card-line" style={{ color: RARITY_COLOR[item.rarity] }}>
                {item.info.name}
            </div>
            {[...item.implicit, ...item.lines, ...(item.info.powers ?? [])].map((line, i) => (
                <div key={i} className="card-line mod">
                    {line}
                </div>
            ))}
        </>
    );
}

// A socket's talisman, and those in the pack to set in it instead
function SocketPicker({ socket, tree, icons, client, onClose }: { socket: number; tree: TreeView; icons: Record<number, string>; client: Client; onClose: () => void }): JSX.Element {
    const current = tree.talismans[socket];
    return (
        <div className="tree-picker panel rs-background">
            <PanelHead title="Talisman Socket" onClose={onClose} />
            {current ? (
                <div className={`picker-current item-card ${current.rarity}`}>
                    <TalismanLines item={current} />
                    <button className="ui-button small" onClick={() => client.unsocketTalisman(socket)}>
                        Take it out
                    </button>
                </div>
            ) : (
                <div className="dim">Empty: set a talisman from your pack in it.</div>
            )}
            <div className="section-title">From your pack</div>
            {tree.packTalismans.length === 0 ? (
                <div className="dim note">You carry no talismans. They drop in the rifts, most often from rares and guardians, and a guarded hoard always has one.</div>
            ) : (
                <div className="picker-list">
                    {tree.packTalismans.map(({ index, item }) => (
                        <button key={item.uid} className={`picker-choice ${item.why ? "unusable" : ""}`} onClick={() => client.socketTalisman(socket, index)}>
                            <span className="picker-icon">{icons[item.info.objId] && <img src={icons[item.info.objId]} alt="" draggable={false} />}</span>
                            <span className="picker-text">
                                <span className="picker-name" style={{ color: RARITY_COLOR[item.rarity] }}>
                                    {item.info.name}
                                </span>
                                {[...item.implicit, ...item.lines, ...(item.info.powers ?? [])].map((line, i) => (
                                    <span key={i} className="picker-line">
                                        {line}
                                    </span>
                                ))}
                                {item.why && <span className="picker-sub bad">{item.why}</span>}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Nodes whose name or anything they give has the words in it
function searchNodes(search: string): number[] {
    const q = search.trim().toLowerCase();
    if (q.length < 2) {
        return [];
    }
    return PASSIVES.filter((n) => n.name.toLowerCase().includes(q) || nodeLines(n.id).some((l) => l.toLowerCase().includes(q))).map((n) => n.id);
}
