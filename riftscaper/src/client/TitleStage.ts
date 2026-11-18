// The title's stage, in the tear's crater before the Archmage's portal, open as if ready for
// whoever's chosen. On the heroes step, the hero chosen stands alone on the flagstones before it;
// for a new hero, the classes stand in a line round it, and the one picked steps out towards the
// camera with its flourish; then it stands alone again, close, while it's made. A hero alone turns
// as the mouse drags across it. The camera's view of each step, and which of the line the mouse is
// over, come from here; the Client draws with it and moves the camera.
import { yawFromVector } from "../../../engine/controller/CharacterMovement";
import type { ActorDrawOptions, ActorModel, ActorRenderer } from "../../../engine/mapviewer/webgl/actor/ActorRenderer";
import { CLASSES, LINEUP } from "../content/classes";
import { ClassId, SEQ } from "../content/items";
import type { TitleStep } from "./Store";

// The line: tiles out from the portal's middle, and where round it each class stands (degrees
// from east, so the camera's side is below 0)
const LINE_RADIUS = 3.6;
const LINE_FROM = -150;
const LINE_STEP = 24;
// How far the class picked steps out towards the camera, and how long it takes
const STEP_OUT = 1.3;
const STEP_SECONDS = 0.55;
// How far east of the portal the camera looks on the class step, in tiles
const LINE_SHIFT = 1.6;
// A hero alone stands this far before the portal
const ALONE_OUT = 2.6;
// The camera on each step: tiles from what it looks at, its pitch (RS units, -512 straight down),
// and how far over the ground the middle of the screen is, in tiles
const VIEWS: Record<TitleStep, { distance: number; pitch: number; lift: number }> = {
    heroes: { distance: 5.8, pitch: -140, lift: 0.85 },
    class: { distance: 10.5, pitch: -165, lift: 0.75 },
    look: { distance: 4.4, pitch: -100, lift: 0.85 },
};
// Dragging turns a hero alone this far (RS units) a pixel
const DRAG_TURN = 3.2;
// The ones not picked, a little in shadow
const UNPICKED_TINT = 0xa8a8b0;
// A fallen hero, grey-blue as a ghost
const FALLEN_TINT = 0x9aa8c8;

export type StageView = { x: number; y: number; distance: number; pitch: number; lift: number };

type Place = { x: number; y: number };

// What the Client hands over to draw with
export type StageDrawing = {
    actors: ActorRenderer;
    options: ActorDrawOptions;
    height: (x: number, y: number) => number;
    reset: (o: ActorDrawOptions) => void;
};

export class TitleStage {
    // Each class's way out of the line, 0 in it and 1 stepped out, and when its flourish began
    // (performance.now)
    private readonly out = new Map<ClassId, number>();
    private readonly flourishAt = new Map<ClassId, number>();
    // A hero alone: which way they face, when their flourish began, and who they were last drawn as
    yaw = 0;
    private aloneFlourish = -Infinity;
    private aloneTag = "";
    private drag?: { x: number; yaw: number };
    private readonly view: StageView = { x: 0, y: 0, distance: 0, pitch: 0, lift: 0 };

    constructor(readonly portal: Place) {}

    private linePlace(cls: ClassId): Place {
        const out = this.out.get(cls) ?? 0;
        const a = ((LINE_FROM + LINEUP.indexOf(cls) * LINE_STEP) * Math.PI) / 180;
        return { x: this.portal.x + Math.cos(a) * LINE_RADIUS, y: this.portal.y + Math.sin(a) * LINE_RADIUS - out * STEP_OUT };
    }

    get alone(): Place {
        return { x: this.portal.x, y: this.portal.y - ALONE_OUT };
    }

    // The line stepped on, and where the camera wants to be
    step(deltaMs: number, now: number, step: TitleStep, pick: ClassId | undefined): StageView {
        const d = deltaMs / 1000 / STEP_SECONDS;
        for (const cls of LINEUP) {
            const was = this.out.get(cls) ?? 0;
            const want = step === "class" && cls === pick ? 1 : 0;
            // Towards where it wants to be, and still once there
            const is = want > was ? Math.min(want, was + d) : Math.max(want, was - d);
            this.out.set(cls, is);
            if (is === 1 && was < 1) {
                this.flourishAt.set(cls, now);
            }
        }
        const look = VIEWS[step];
        // The line a little left of the middle, clear of the class's panel on the right
        const at = step === "class" ? { x: this.portal.x + LINE_SHIFT, y: this.portal.y - LINE_RADIUS * 0.8 } : this.alone;
        const v = this.view;
        v.x = at.x;
        v.y = at.y;
        v.distance = look.distance;
        v.pitch = look.pitch;
        v.lift = look.lift;
        return v;
    }

    // Which of the line the mouse is over: `distance` is the Client's own test of a box round
    // something standing at (x, y), as for everything else that's clicked
    pickAt(distance: (x: number, y: number, radius: number, tall: number) => number): ClassId | undefined {
        let best = Infinity;
        let found: ClassId | undefined;
        for (const cls of LINEUP) {
            const p = this.linePlace(cls);
            const d = distance(p.x, p.y, 0.5, 1.7);
            if (d < best) {
                best = d;
                found = cls;
            }
        }
        return found;
    }

    drawLine(d: StageDrawing, lineup: Map<ClassId, ActorModel>, now: number, pick: ClassId | undefined, hover: ClassId | undefined): void {
        const o = d.options;
        LINEUP.forEach((cls, i) => {
            const model = lineup.get(cls);
            if (!model) {
                return;
            }
            const p = this.linePlace(cls);
            const out = this.out.get(cls) ?? 0;
            const going = cls === pick;
            // Facing the camera, turned a little out from the portal
            let yaw = yawFromVector((p.x - this.portal.x) * 0.3, -1);
            let seq: number = SEQ.idle;
            let ticks = Math.floor(now / 20) + i * 13;
            let loop = true;
            const flourish = this.flourishAt.get(cls);
            if ((going && out < 1) || (!going && out > 0)) {
                seq = SEQ.walk;
                yaw = going ? 0 : 1024;
            } else if (going && flourish !== undefined) {
                const anim = model.getAnim(CLASSES[cls].flourish);
                const t = Math.floor((now - flourish) / 20);
                if (t < anim.totalTicks) {
                    seq = CLASSES[cls].flourish;
                    ticks = t;
                    loop = false;
                }
            }
            const anim = model.getAnim(seq);
            d.reset(o);
            o.outline = hover === cls ? 1.05 : undefined;
            o.tint = pick && !going ? UNPICKED_TINT : undefined;
            d.actors.draw(model, anim, anim.getFrame(ticks, loop), p.x, d.height(p.x, p.y), p.y, yaw, o);
        });
    }

    // A hero alone before the portal: `tag` says who it is, and a new one comes with a flourish
    drawAlone(d: StageDrawing, model: ActorModel, tag: string, cls: ClassId, fallen: boolean, now: number): void {
        if (tag !== this.aloneTag) {
            this.aloneTag = tag;
            this.aloneFlourish = now;
            this.yaw = 0;
        }
        const p = this.alone;
        let seq: number = SEQ.idle;
        let ticks = Math.floor(now / 20);
        let loop = true;
        if (!fallen) {
            const anim = model.getAnim(CLASSES[cls].flourish);
            const t = Math.floor((now - this.aloneFlourish) / 20) - 10;
            if (t >= 0 && t < anim.totalTicks) {
                seq = CLASSES[cls].flourish;
                ticks = t;
                loop = false;
            }
        }
        const anim = model.getAnim(seq);
        const o = d.options;
        d.reset(o);
        // Washed to the tint's grey-blue, a ghost of themselves (alpha only fades a model's
        // see-through faces, so it can't do it)
        if (fallen) {
            o.tint = FALLEN_TINT;
            o.flash = -0.6;
        }
        d.actors.draw(model, anim, anim.getFrame(ticks, loop), p.x, d.height(p.x, p.y), p.y, this.yaw, o);
    }

    // The flourish again, as when the hero first stood there
    flourish(now: number): void {
        this.aloneFlourish = now;
    }

    startDrag(x: number): void {
        this.drag = { x, yaw: this.yaw };
    }

    dragTo(x: number): boolean {
        if (!this.drag) {
            return false;
        }
        this.yaw = Math.round(this.drag.yaw - (x - this.drag.x) * DRAG_TURN) & 2047;
        return true;
    }

    endDrag(): void {
        this.drag = undefined;
    }

    get dragging(): boolean {
        return this.drag !== undefined;
    }
}
