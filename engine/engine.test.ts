import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const ROOT = __dirname;

function sources(dir: string): string[] {
    return (readdirSync(dir, { recursive: true }) as string[])
        .filter((file) => /\.(tsx?|mjs|js)$/.test(file))
        .map((file) => join(dir, file));
}

const IMPORT =
    /(?:(?:import|export)\s[^'"`;]*?from\s*|import\(\s*|import\s+|vi\.mock\(\s*)["'](\.{1,2}\/[^"'\n]*)["']/g;

describe("the engine", () => {
    // So that another game can take this folder as it is
    it("imports nothing from outside its own folder", () => {
        const outside: string[] = [];
        for (const file of sources(ROOT)) {
            for (const [, spec] of readFileSync(file, "utf8").matchAll(IMPORT)) {
                const to = relative(ROOT, resolve(dirname(file), spec));
                if (to.startsWith("..") || to.startsWith(sep)) {
                    outside.push(`${relative(ROOT, file)}: ${spec}`);
                }
            }
        }
        expect(outside).toEqual([]);
    });

    // A lockstep game runs the same sim on every player's browser, so what a sim
    // calls here has to agree to the bit: trigonometry goes through fm (core/fmath.ts),
    // never the browser's own Math
    it("keeps the sim's maths in fm", () => {
        const banned =
            /\bMath\.(sin|cos|tan|asin|acos|atan|atan2|hypot|pow|exp|log|log2|log10|cbrt)\(/;
        const offenders: string[] = [];
        // What a sim runs: the basics, the world, the character controller and a floor's own
        const files = [
            ...["core", "world", "controller"].flatMap((dir) => sources(join(ROOT, dir))),
            join(ROOT, "floor", "ArenaFloor.ts"),
            join(ROOT, "floor", "floorLayout.ts"),
        ];
        for (const file of files) {
            if (/\.test\.ts$/.test(file) || file.endsWith("fmath.ts")) {
                continue;
            }
            readFileSync(file, "utf8")
                .split("\n")
                .forEach((line, i) => {
                    if (banned.test(line)) {
                        offenders.push(`${relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
                    }
                });
        }
        expect(offenders).toEqual([]);
    });
});
