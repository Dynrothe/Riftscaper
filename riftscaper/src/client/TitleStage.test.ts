// The title's line: the class picked steps out once, plays its flourish through, and then stands.
import type { ActorModel } from "../../../engine/mapviewer/webgl/actor/ActorRenderer";
import { CLASSES, LINEUP } from "../content/classes";
import type { ClassId } from "../content/items";
import { SEQ } from "../content/items";
import { StageDrawing, TitleStage } from "./TitleStage";

// Every animation 40 ticks long, its frame the tick it's on, so what's drawn says how far in it is
function fakeModel(): ActorModel {
    const anim = (seqId: number) => ({ seqId, totalTicks: 40, getFrame: (ticks: number) => ticks });
    return { getAnim: anim } as unknown as ActorModel;
}

type Drawn = { seq: number; frame: number; y: number };

function drawing(drawn: Drawn[]): StageDrawing {
    return {
        actors: { draw: (_m: unknown, anim: { seqId: number }, frame: number, _x: number, _h: number, y: number) => drawn.push({ seq: anim.seqId, frame, y }) },
        options: {},
        height: () => 0,
        reset: () => {},
    } as unknown as StageDrawing;
}

describe("the title's line", () => {
    it("steps the class picked out, plays its flourish through once, then stands", () => {
        const stage = new TitleStage({ x: 100, y: 100 });
        const lineup = new Map<ClassId, ActorModel>(LINEUP.map((cls) => [cls, fakeModel()]));
        const pick: ClassId = "paladin";
        const flourish = CLASSES[pick].flourish;
        const seen: Drawn[] = [];
        let now = 1000;
        for (let i = 0; i < 180; i++) {
            const frameMs = 1000 / 60;
            now += frameMs;
            stage.step(frameMs, now, "class", pick);
            const drawn: Drawn[] = [];
            stage.drawLine(drawing(drawn), lineup, now, pick, undefined);
            seen.push(drawn[LINEUP.indexOf(pick)]);
        }
        const firstFlourish = seen.findIndex((d) => d.seq === flourish);
        expect(firstFlourish).toBeGreaterThan(0);
        // Walking out till then, and never again after
        expect(seen.slice(0, firstFlourish).every((d) => d.seq === SEQ.walk)).toBe(true);
        expect(seen.slice(firstFlourish).some((d) => d.seq === SEQ.walk)).toBe(false);
        // Out, and staying out
        const out = seen[firstFlourish].y;
        expect(seen.slice(firstFlourish).every((d) => d.y === out)).toBe(true);
        // The flourish's frames only go forward, to its end, then it stands
        const flourishes = seen.filter((d) => d.seq === flourish);
        flourishes.forEach((d, i) => i > 0 && expect(d.frame).toBeGreaterThanOrEqual(flourishes[i - 1].frame));
        expect(flourishes[flourishes.length - 1].frame).toBe(39);
        expect(seen[seen.length - 1].seq).toBe(SEQ.idle);
    });

    it("walks the class back into the line when another's picked", () => {
        const stage = new TitleStage({ x: 100, y: 100 });
        const lineup = new Map<ClassId, ActorModel>(LINEUP.map((cls) => [cls, fakeModel()]));
        let now = 1000;
        const run = (pick: ClassId, frames: number) => {
            const drawn: Drawn[] = [];
            for (let i = 0; i < frames; i++) {
                now += 1000 / 60;
                stage.step(1000 / 60, now, "class", pick);
                drawn.length = 0;
                stage.drawLine(drawing(drawn), lineup, now, pick, undefined);
            }
            return drawn;
        };
        const inLine = run("rogue", 1)[LINEUP.indexOf("warrior")].y;
        run("warrior", 120);
        const back = run("rogue", 120)[LINEUP.indexOf("warrior")];
        expect(back.y).toBe(inLine);
        expect(back.seq).toBe(SEQ.idle);
    });
});
