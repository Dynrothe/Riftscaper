// A balance bot: a hero of each class plays rift after rift by themselves, on the game's own plans
// for its rifts (or made-up open land), with the real sim, and between rifts does what a sensible player does in the
// city: wears what's better, sockets what fits, spends passive points, sells the rest and buys
// what the shops have that's better, says its prayers and keeps a hireling in cast-offs (--alone
// for neither). What it prints is what tuning needs: how long each rift
// takes, how often the hero dies and where, how long the guardian lasts, what level the hero is
// at each depth, and what the hero's damage and life are against the monsters'.
//
//   bun run tsx riftscaper/scripts/balance.ts                       every class, depths 1 to 16
//   bun run tsx riftscaper/scripts/balance.ts warrior mage --depth 8 --seeds 2
//   bun run tsx riftscaper/scripts/balance.ts --from 17 --depth 40  the ladder: a typical hero who has
//                                                                   cleared 16 pushes on (--hours, 6)
//   bun run tsx riftscaper/scripts/balance.ts --sheet [--depth 32]  only the numbers on paper
//   bun run tsx riftscaper/scripts/balance.ts --curve --seeds 4     a typical hero by level, on paper
//   bun run tsx riftscaper/scripts/balance.ts --skills --level 25   every skill, estimated and on a dummy
//   bun run tsx riftscaper/scripts/balance.ts --guardians           each guardian against an on-level hero
//   bun run tsx riftscaper/scripts/balance.ts --inspect rogue --level 30   one typical hero up close
//   bun run tsx riftscaper/scripts/balance.ts --build pyre --depth 12      a named build (BUILDS) beside
//                                                                   its class's plain path, same seeds
//   bun run tsx riftscaper/scripts/balance.ts --rifts open          on open land, as rifts were first
//                                                                   made, or all one kind: --rifts trail
//   DEBUG=1 ...                                                   why a rift timed out, a fight's breakdown
//
// The bot is no expert: it fights whatever's nearest, steps to the gap in a guardian's marked
// rings, kites what fights hand to hand when its own attack flies, walks into range and sight to
// shoot, drinks at half life and uses every skill it has when it's ready. A death here is a death
// a careless player would have. docs/design.md, section 13, has what it's tuned to and found.
import { Rng } from "../../engine/core/Rng";
import { makeGrid } from "../../engine/world/testGrid";
import type { ArenaGrid } from "../../engine/world/ArenaGrid";
import { CLASS_IDS } from "../src/content/classes";
import { ClassId, SLOTS } from "../src/content/items";
import { BOSSES, MONSTERS } from "../src/content/monsters";
import { ELEMENTS, GUARDIAN_LAP, HERO, LADDER_DEPTH, PACK_AREA, PEAK_LEVEL, TICKS_PER_SECOND, areaLevel, armourReduction, monsterDamageScale, monsterLifeScale, resistance, xpToNext } from "../src/content/rules";
import { ZONES } from "../src/content/zones";
import { BUY_MARKUP } from "../src/content/town";
import { Game, GameInput, Monster, noInput } from "../src/sim/Game";
import { BASIC, allGems, autoSocket, bindSkill, gemDef, gemRequirement, makeGem } from "../src/sim/gems";
import { Hero, Stats, equipFrom, freeSlot, gainXp, heroStats, newHero, nextUid, prayersOn, stow, togglePrayer, whyNotEquip } from "../src/sim/hero";
import { Item, gambleCost, isGem, itemInfo, rollItem, sellValue } from "../src/sim/loot";
import { fillBelt } from "../src/sim/potions";
import { CLASSES } from "../src/content/classes";
import { CLASS_COLORS, GEMS } from "../src/content/gems";
import { PASSIVES } from "../src/content/passives";
import { allocate, pathTo, pointsLeft, takenSet } from "../src/sim/passives";
import { ResolvedSkill, resolveSkill, resolveSkills, skillChoices, spreadOf } from "../src/sim/skills";
import { rollStock } from "../src/sim/town";
import { walkDistances } from "../src/sim/placement";
import { canSee } from "../../engine/world/Sight";
import { HirelingKind } from "../src/content/hirelings";
import { PRAYERS, PrayerId } from "../src/content/prayers";
import { LAYOUT_KINDS } from "../src/world/riftLayout";
import { RiftShape, riftPlan } from "../src/world/zoneGen";
import { giveHireling, hire, hireCost, hireWhyNot, hirelingDps, hirelingStats, raiseCost, raiseHireling } from "../src/sim/hirelings";

const SIZE = 192;
const BASE_X = 1000;
const BASE_Y = 1000;

// ---- Land ----

// The land a rift's played on, where the hero comes in, and a planned rift's plan's spots
type Land = {
    grid: ArenaGrid;
    spawn: { x: number; y: number };
    // What the land is: "open", or a planned rift's kind
    kind: string;
    nooks?: { x: number; y: number }[];
    guardian?: { x: number; y: number };
    packArea?: number;
};

// Which rifts are played: planned, as the game's are (docs/rift-maps.md), or with --rifts open the
// open land rifts were first made on, or --rifts and one of the plans' kinds, as the game's ?rifts=
// has them
const RIFTS: RiftShape = riftsAsked();
function riftsAsked(): RiftShape {
    const i = process.argv.indexOf("--rifts");
    if (i < 0) {
        return "planned";
    }
    const asked = process.argv[i + 1];
    if (asked === "open" || asked === "planned" || (LAYOUT_KINDS as string[]).includes(asked)) {
        return asked as RiftShape;
    }
    console.error(`--rifts is open, planned, or one of the plans' kinds: ${LAYOUT_KINDS.join(", ")}`);
    process.exit(1);
}

// Clumps of rock, from the seed, where `fits` lets them stand
function clumps(rng: Rng, solid: Uint8Array, fits: (cx: number, cy: number, r: number) => boolean): void {
    for (let i = 0; i < 70; i++) {
        const cx = 12 + rng.int(SIZE - 24);
        const cy = 12 + rng.int(SIZE - 24);
        const r = 1.5 + rng.next() * 3.5;
        if (!fits(cx, cy, r)) {
            continue;
        }
        for (let y = Math.floor(cy - r); y <= cy + r; y++) {
            for (let x = Math.floor(cx - r); x <= cx + r; x++) {
                if (Math.hypot(x - cx, y - cy) <= r && x > 0 && y > 0 && x < SIZE && y < SIZE) {
                    solid[x + y * SIZE] = 1;
                }
            }
        }
    }
}

// Rows of the grid from what's solid and what's water, the north row first
function gridOf(solid: Uint8Array, water?: Uint8Array): ArenaGrid {
    const rows: string[] = [];
    for (let row = 0; row < SIZE; row++) {
        const y = SIZE - 1 - row;
        let line = "";
        for (let x = 0; x < SIZE; x++) {
            const i = x + y * SIZE;
            const edge = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
            line += edge || (solid[i] && !water?.[i]) ? "#" : water?.[i] ? "~" : ".";
        }
        rows.push(line);
    }
    return makeGrid(rows, BASE_X, BASE_Y);
}

function riftLand(depth: number, seed: number): Land {
    return RIFTS === "open" ? { grid: land(seed), spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 }, kind: "open" } : plannedLand(depth, seed);
}

// A planned rift's land: the game's own plan for the depth and seed, the kind its biome picks
// (world/zoneGen.ts's riftPlan, no cache), what rises round its lanes solid and what falls away
// water, and on its open ground the same clumps of rock as the open land, where there's room
// round one, so the lanes are as cluttered as an open rift is and no causeway's cut. The game's
// cliffs and forest stop sight no more than the bot's rock does.
function plannedLand(depth: number, seed: number): Land {
    const { arena, layout } = riftPlan(depth, seed, undefined, RIFTS === "planned" || RIFTS === "open" ? undefined : RIFTS);
    if (arena.x1 - arena.x0 + 1 !== SIZE || arena.y1 - arena.y0 + 1 !== SIZE) {
        throw new Error(`A rift's arena is ${arena.x1 - arena.x0 + 1} by ${arena.y1 - arena.y0 + 1}, not ${SIZE}`);
    }
    const plan = (x: number, y: number) => x + arena.x0 + (y + arena.y0) * layout.sizeX;
    const solid = new Uint8Array(SIZE * SIZE);
    const water = new Uint8Array(SIZE * SIZE);
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = plan(x, y);
            solid[x + y * SIZE] = layout.open[p] ? 0 : 1;
            water[x + y * SIZE] = layout.deep[p];
        }
    }
    const camp = layout.nodes[layout.camp];
    const campX = camp.x - arena.x0;
    const campY = camp.y - arena.y0;
    const roomy = (cx: number, cy: number, r: number) => {
        if (Math.hypot(cx - campX, cy - campY) < 14) {
            return false;
        }
        const reach = r + 3;
        for (let y = Math.floor(cy - reach); y <= cy + reach; y++) {
            for (let x = Math.floor(cx - reach); x <= cx + reach; x++) {
                if (Math.hypot(x - cx, y - cy) <= reach && (x < 0 || y < 0 || x >= SIZE || y >= SIZE || solid[x + y * SIZE])) {
                    return false;
                }
            }
        }
        return true;
    };
    const rocks = new Uint8Array(SIZE * SIZE);
    clumps(new Rng(seed), rocks, roomy);
    // Whatever the rock cuts off the camp is solid too, as the game blocks what its land strands
    const reached = new Uint8Array(SIZE * SIZE);
    const queue = [Math.floor(campX) + Math.floor(campY) * SIZE];
    reached[queue[0]] = 1;
    while (queue.length > 0) {
        const i = queue.pop()!;
        const x = i % SIZE;
        const y = (i - x) / SIZE;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            const n = nx + ny * SIZE;
            if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && !reached[n] && !solid[n] && !rocks[n]) {
                reached[n] = 1;
                queue.push(n);
            }
        }
    }
    for (let i = 0; i < solid.length; i++) {
        solid[i] = reached[i] ? 0 : 1;
    }
    const local = (s: { x: number; y: number }) => ({ x: BASE_X + s.x - arena.x0, y: BASE_Y + s.y - arena.y0 });
    const guardian = layout.nodes[layout.guardian];
    return {
        grid: gridOf(solid, water),
        spawn: { x: BASE_X + campX + 0.5, y: BASE_Y + campY + 0.5 },
        kind: layout.kind,
        nooks: layout.nodes.filter((n) => n.role === "nook").map(local),
        guardian: local(guardian),
        packArea: PACK_AREA.planned,
    };
}

// Open ground in a ring of rock, with clumps of rock and a few long walls to get round, from a seed
function land(seed: number): ArenaGrid {
    const rng = new Rng(seed);
    const solid = new Uint8Array(SIZE * SIZE);
    clumps(rng, solid, (cx, cy) => !(cx < 22 && cy < 22));
    for (let i = 0; i < 6; i++) {
        const horizontal = rng.chance(0.5);
        const at = 30 + rng.int(SIZE - 60);
        const from = 10 + rng.int(60);
        const to = from + 40 + rng.int(60);
        for (let t = from; t < Math.min(SIZE - 10, to); t++) {
            solid[horizontal ? t + at * SIZE : at + t * SIZE] = 1;
        }
    }
    return gridOf(solid);
}

// ---- Judging the hero ----

// What a skill does a second to one enemy, and to a crowd (as if three stood in it)
function skillDps(s: ResolvedSkill | undefined, stats: Stats): { single: number; crowd: number } {
    if (!s || s.why || s.def.damage <= 0) {
        return { single: 0, crowd: 0 };
    }
    const avg = ((s.minHit + s.maxHit) / 2) * (1 + s.critChance * (s.critMulti - 1));
    // Thralls: as many as can stand, each a blow every so often, whoever's nearest
    if (s.summon) {
        const thralls = (avg * s.summon.max) / s.summon.def.attackSeconds;
        return { single: thralls, crowd: thralls * 1.5 };
    }
    const uses = s.speed / Math.max(0.2, s.def.castTime);
    const rate = s.cooldown > 0 ? Math.min(uses, 1 / s.cooldown) : uses;
    const hits = s.hits;
    const kind = s.def.kind;
    const count = kind === "shoot" ? Math.min(s.count, kind === "shoot" && (s.def.arc ?? 0) >= 300 ? 2 : 1.5) : 1;
    const ignite = s.ignite * 0.9 * s.burnMore;
    // On one target: a tight spread lands every arrow, a fan that hits each once lands one, and a
    // wide fan lands two or three at the feet and one from a few tiles off (measured with --skills'
    // dummy and by range and size): a fight is mostly the latter, so a quarter more than one. The
    // spread is the sim's (spreadOf): judged by the gem's own arc, Volley's two more arrows on
    // Barrage were six on one target where the sim fanned them over 50 degrees (it keeps them
    // tight now), and the bot's ranger linked it, missed three arrows in four and ran dry on the
    // ladder.
    const onOne = kind !== "shoot" || s.count <= 1 || s.def.onePerTarget ? 1 : spreadOf(s) <= 15 ? s.count : 1.25;
    const single = avg * rate * hits * (1 + ignite) * onOne;
    const area = kind === "cleave" || kind === "slam" || kind === "nova" || kind === "rain" || kind === "burst" || kind === "leap" || kind === "arc";
    const spread = kind === "shoot" ? Math.min(3, s.count * 0.6 + s.pierce * 0.5 + s.chain * 0.7) : 1;
    const crowd = single * (area ? 3 : Math.max(1, spread)) * (s.splash > 0 ? 1 + s.splash : 1);
    void stats;
    void count;
    return { single, crowd: Math.max(single, crowd) };
}

// The hero's damage, single and crowd, from the best of their skills
function heroDps(hero: Hero): { single: number; crowd: number; stats: Stats } {
    const stats = heroStats(hero);
    const skills = resolveSkills(hero, stats);
    let single = 0;
    let crowd = 0;
    // Thralls fight beside whatever the hero casts, so theirs adds to the best of the rest
    let thralls = { single: 0, crowd: 0 };
    for (const s of skills) {
        const d = skillDps(s, stats);
        if (s?.summon) {
            thralls = { single: Math.max(thralls.single, d.single), crowd: Math.max(thralls.crowd, d.crowd) };
            continue;
        }
        single = Math.max(single, d.single);
        crowd = Math.max(crowd, d.crowd);
    }
    return { single: single + thralls.single, crowd: crowd + thralls.crowd, stats };
}

// Life as it stands against a typical hit at the hero's level: armour, evasion and the rest; on
// the ladder a share of what hits is fire, cold or lightning, which resistances stop and not armour
// (content/rules.ts RESIST)
function effectiveLife(stats: Stats, level: number, depth = 1): number {
    const hit = 4.5 * monsterDamageScale(level);
    const armour = 1 - armourReduction(stats.armour, hit);
    const share = depth > LADDER_DEPTH ? 0.25 : 0;
    const resisted = ELEMENTS.reduce((a, e) => a + 1 - resistance(stats.resist[e], depth) / 100, 0) / 3;
    const taken = armour * (1 - share) + resisted * share;
    return stats.maxLife / Math.max(0.05, taken * (1 - stats.evade) * stats.damageTaken) + stats.lifeRegen * 6;
}

function score(hero: Hero): number {
    const { single, crowd, stats } = heroDps(hero);
    const ehp = effectiveLife(stats, hero.level, hero.maxDepth);
    const speed = stats.moveSpeed / HERO.moveSpeed;
    // Mana matters if the skills can't be paid for
    return Math.pow(single * 0.4 + crowd * 0.6 + 0.1, 0.55) * Math.pow(ehp, 0.45) * Math.pow(speed, 0.3);
}

// ---- In the city ----

function clone<T>(v: T): T {
    return structuredClone(v);
}

// Tries each thing in the pack on, and keeps it on if the hero's better for it
function wearBetter(hero: Hero): number {
    let changed = 0;
    for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < hero.inventory.length; i++) {
            const item = hero.inventory[i];
            if (!item || isGem(item) || whyNotEquip(hero, item)) {
                continue;
            }
            const before = score(hero);
            const trial = clone(hero);
            const r = equipFrom(trial, i);
            if (typeof r === "string") {
                continue;
            }
            socketAll(trial);
            if (score(trial) > before * 1.005) {
                Object.assign(hero, trial);
                changed++;
            }
        }
    }
    return changed;
}

// Every gem in the pack into the best socket that'll have it, if the hero's better for it
function socketAll(hero: Hero): void {
    for (let i = 0; i < hero.inventory.length; i++) {
        const item = hero.inventory[i];
        if (!item || !isGem(item)) {
            continue;
        }
        const before = score(hero);
        const trial = clone(hero);
        if (autoSocket(trial, i) === undefined && score(trial) >= before) {
            Object.assign(hero, trial);
        }
    }
}

// ---- Named builds ----

// A build of docs/tree-expansion.md's: a class, and the passives it walks to in order before it
// spends the rest where they do the most. The bot's score can't see a trait or a keystone's rule,
// so a build takes them whatever the score says, and its rifts measure them beside the plain path.
type Build = { cls: ClassId; nodes: string[] };

const BUILDS: Record<string, Build> = {
    "hollow-fletcher": { cls: "ranger", nodes: ["Lingering Magic", "Greater Thralls", "Death Charge", "Arceuus Covenant"] },
    "the-offering": { cls: "necromancer", nodes: ["Ward of Arceuus", "Shadow Veil", "Demonic Offering"] },
    pyre: { cls: "mage", nodes: ["Flames of Zamorak", "Pyre", "Inferno"] },
    shatterstorm: { cls: "necromancer", nodes: ["Ice Blitz", "Winter's Bite", "Ice Barrage"] },
    tempest: { cls: "mage", nodes: ["Claws of Guthix", "Chain Lightning", "Tempest"] },
    spellblade: { cls: "paladin", nodes: ["Proselyte's Discipline", "Saradomin's Light", "Temple Knight's Oath"] },
    thornwall: { cls: "paladin", nodes: ["Shield of Arrav", "Redemption", "Vengeance"] },
    "dharoks-disciple": { cls: "warrior", nodes: ["Berserker Necklace", "Guthan's Warspear", "Dharok's Curse"] },
    piety: { cls: "warrior", nodes: ["Ultimate Strength", "Steel Skin", "Piety"] },
    windrunner: { cls: "rogue", nodes: ["Agility Shortcut", "Stamina", "Graceful"] },
    "dragon-claws": { cls: "rogue", nodes: ["Backstab", "Shadow Strike", "Dragon Claws"] },
    artillery: { cls: "ranger", nodes: ["Black Chinchompa", "Explosive Shot", "Chinchompa"] },
    rigour: { cls: "ranger", nodes: ["Sharp Eye", "Hawk Eye", "Rigour"] },
};

function buildNodes(build: Build): number[] {
    return build.nodes.map((name) => {
        const node = PASSIVES.find((n) => n.name === name && n.kind !== "attribute" && n.kind !== "small");
        if (!node) {
            throw new Error(`No notable or keystone called ${name}`);
        }
        return node.id;
    });
}

// The nodes the hero being played walks to first, in order: a build's, or none
let rushing: number[] = [];

// A build's nodes, a step at a time while there are points: whether they're all taken
function rush(hero: Hero): boolean {
    for (const target of rushing) {
        while (!hero.passives.includes(target)) {
            const path = pointsLeft(hero) > 0 ? pathTo(hero.cls, takenSet(hero), target) : undefined;
            if (!path || allocate(hero, path[0])) {
                return false;
            }
        }
    }
    return true;
}

// Spends passive points one at a time, each where it does the most per point, looking a few
// nodes out so a notable's path is worth walking (a build's nodes first, whatever they score)
function spendPoints(hero: Hero): void {
    if (!rush(hero)) {
        return;
    }
    while (pointsLeft(hero) > 0) {
        const taken = takenSet(hero);
        const base = score(hero);
        let best: number[] | undefined;
        let bestGain = -Infinity;
        // Everything within four steps of what's taken, with the way to it
        const reach = Math.min(4, pointsLeft(hero));
        const from = new Map<number, number>();
        let ring = [...taken];
        for (let step = 0; step < reach; step++) {
            const next: number[] = [];
            for (const id of ring) {
                for (const n of PASSIVES[id].links) {
                    const node = PASSIVES[n];
                    if (taken.has(n) || from.has(n) || (node.kind === "start" && node.cls !== hero.cls)) {
                        continue;
                    }
                    from.set(n, taken.has(id) ? -1 : id);
                    next.push(n);
                }
            }
            ring = next;
        }
        for (const id of from.keys()) {
            const path: number[] = [];
            for (let at = id; at !== -1; at = from.get(at)!) {
                path.unshift(at);
            }
            // Only the passives differ, and scoring changes nothing
            const trial = { ...hero, passives: [...hero.passives, ...path] };
            const gain = (score(trial) - base) / path.length;
            if (gain > bestGain) {
                bestGain = gain;
                best = path;
            }
        }
        if (!best) {
            break;
        }
        // Take the first step of the best way
        allocate(hero, best[0]);
    }
}

// The skill bar as a player would keep it: the best attack on the left button (a buff or a blink
// there, after gear changed hands, would never strike), the rest after it
function arrangeBar(hero: Hero): void {
    const stats = heroStats(hero);
    const choices = skillChoices(hero, stats).filter((s) => !s.why);
    const attacks = choices.filter((s) => s.def.damage > 0 && !s.summon && s.cooldown === 0);
    attacks.sort((a, b) => skillDps(b, stats).single - skillDps(a, stats).single);
    const main = attacks[0];
    const rest = choices.filter((s) => s !== main && s.ref !== BASIC);
    rest.sort((a, b) => skillDps(b, stats).crowd - skillDps(a, stats).crowd);
    const bar = [main?.ref ?? BASIC, ...rest.map((s) => s.ref)].slice(0, hero.skillBar.length);
    hero.skillBar = [...bar, ...new Array(hero.skillBar.length - bar.length).fill(null)];
}

// ---- Prayers and the hireling ----

// The bot alone: no prayers, no hireling
const ALONE = process.argv.includes("--alone");

// Who each class's bot hires, and the prayers it says: a protection from blows, and its weapon's
const HIRE_FOR: Record<ClassId, HirelingKind> = {
    warrior: "archer",
    ranger: "barbarian",
    mage: "whiteKnight",
    paladin: "archer",
    rogue: "battleMage",
    necromancer: "whiteKnight",
};
const PRAY_FOR: Record<ClassId, PrayerId[]> = {
    warrior: ["chivalry", "ultimateStrength", "steelSkin"],
    ranger: ["eagleEye", "steelSkin"],
    mage: ["augury", "mysticMight", "rapidHeal"],
    paladin: ["chivalry", "ultimateStrength", "steelSkin"],
    rogue: ["eagleEye", "steelSkin"],
    necromancer: ["augury", "mysticMight", "rapidHeal"],
};

// The best prayers its level allows: Protect from Melee, and its class's first it can say
function pray(hero: Hero): void {
    if (ALONE) {
        return;
    }
    const want: PrayerId[] = [];
    if (hero.level >= PRAYERS.protectMelee.level) {
        want.push("protectMelee");
    }
    const other = PRAY_FOR[hero.cls].find((id) => hero.level >= PRAYERS[id].level);
    if (other) {
        want.push(other);
    }
    for (const id of want) {
        if (!prayersOn(hero).includes(id)) {
            togglePrayer(hero, id);
        }
    }
}

// A hireling hired once there's gold to spare for it, raised when it's fallen
function keepHireling(hero: Hero): void {
    if (ALONE) {
        return;
    }
    if (!hero.hireling && hero.gold >= hireCost(hero) * 2) {
        hire(hero, HIRE_FOR[hero.cls]);
    } else if (hero.hireling?.dead && hero.gold >= raiseCost(hero)) {
        raiseHireling(hero);
    }
}

// How good the hireling is: its damage and its life against its armour
function hireScore(hero: Hero): number {
    const s = hirelingStats(hero);
    return s ? hirelingDps(s) * s.maxLife * (1 + s.armour / 2000) : 0;
}

// What in the pack the hireling's better for, given it
function hireBetter(hero: Hero): void {
    if (!hero.hireling) {
        return;
    }
    for (let i = 0; i < hero.inventory.length; i++) {
        const item = hero.inventory[i];
        if (!item || isGem(item) || hireWhyNot(hero, item)) {
            continue;
        }
        const trial = clone(hero);
        giveHireling(trial, i);
        if (hireScore(trial) > hireScore(hero) * 1.005) {
            Object.assign(hero, trial);
        }
    }
}

// A typical hero's hireling, of the kind their class hires, in the best of seventy on-level cast-offs
function typicalHireling(hero: Hero, seed: number): void {
    hero.gold += hireCost(hero);
    hire(hero, HIRE_FOR[hero.cls]);
    const rng = new Rng(seed * 17 + hero.level);
    const pack = hero.inventory;
    hero.inventory = new Array(pack.length).fill(null);
    for (let batch = 0; batch < 2; batch++) {
        for (let i = 0; i < 35; i++) {
            stow(hero, rollItem(rng, nextUid(hero), { level: Math.max(1, hero.level - rng.int(4)), rarity: 0.4 }));
        }
        hireBetter(hero);
        hero.inventory = new Array(pack.length).fill(null);
    }
    hero.inventory = pack;
}

function sellRest(hero: Hero): void {
    for (let i = 0; i < hero.inventory.length; i++) {
        const item = hero.inventory[i];
        if (!item) {
            continue;
        }
        // Gems that might fit later are kept, a few
        if (isGem(item)) {
            continue;
        }
        hero.gold += sellValue(item);
        hero.inventory[i] = null;
    }
    // Too many gems kept: the oldest go
    const gems = hero.inventory.map((it, i) => (it ? i : -1)).filter((i) => i >= 0);
    for (const i of gems.slice(0, Math.max(0, gems.length - 12))) {
        hero.gold += sellValue(hero.inventory[i]!);
        hero.inventory[i] = null;
    }
}

function shop(hero: Hero, rng: Rng): { bought: number; spent: number } {
    const stock = rollStock(rng, hero);
    let bought = 0;
    let spent = 0;
    const offers = Object.values(stock).flat();
    // Best improvement per gold first, as long as there's gold
    for (let round = 0; round < 4; round++) {
        let best: { offer: (typeof offers)[number]; gain: number } | undefined;
        const before = score(hero);
        for (const offer of offers) {
            if (offer.price > hero.gold || isGem(offer.item)) {
                if (!(isGem(offer.item) && offer.price <= hero.gold)) {
                    continue;
                }
            }
            const trial = clone(hero);
            if (!stow(trial, clone(offer.item))) {
                continue;
            }
            const i = trial.inventory.findIndex((x) => x?.uid === offer.item.uid);
            if (isGem(offer.item)) {
                if (autoSocket(trial, i) !== undefined) {
                    continue;
                }
            } else {
                if (whyNotEquip(trial, offer.item) || typeof equipFrom(trial, i) === "string") {
                    continue;
                }
                socketAll(trial);
            }
            const gain = (score(trial) - before) / before;
            if (gain > 0.02 && (!best || gain / offer.price > best.gain / best.offer.price)) {
                best = { offer, gain };
            }
        }
        if (!best) {
            break;
        }
        hero.gold -= best.offer.price;
        spent += best.offer.price;
        stow(hero, best.offer.item);
        const i = hero.inventory.findIndex((x) => x?.uid === best!.offer.item.uid);
        if (isGem(best.offer.item)) {
            autoSocket(hero, i);
        } else {
            equipFrom(hero, i);
            socketAll(hero);
        }
        offers.splice(offers.indexOf(best.offer), 1);
        bought++;
    }
    // Gold to spare goes on gambles, as it does in Diablo: a slot at a time, keeping enough back
    // for a gamble or two more
    const cost = gambleCost(hero.level);
    let slot = rng.int(SLOTS.length);
    while (hero.gold >= cost * 3 && freeSlot(hero) >= 0) {
        const s = SLOTS[slot++ % SLOTS.length];
        if (s === "offhand" && !CLASSES[hero.cls].shield) {
            continue;
        }
        hero.gold -= cost;
        spent += cost;
        stow(hero, rollItem(rng, nextUid(hero), { level: hero.level, rarity: 2.5, cls: hero.cls, atLeast: "magic", slot: s }));
        bought++;
        gambles++;
    }
    wearBetter(hero);
    sellRest(hero);
    void BUY_MARKUP;
    return { bought, spent };
}

// ---- In a rift ----

type RiftResult = {
    outcome: "cleared" | "died" | "timeout";
    seconds: number;
    kills: number;
    bossSeconds: number;
    bossLife: number;
    taken: number;
    drinks: number;
    gold: number;
    items: number;
    rares: number;
    uniques: number;
    lowest: number;
    killedBy: string;
    // The land it was played on (Land's kind)
    land: string;
};

type Pilot = {
    target: number;
    since: number;
    lastKills: number;
    lastLife?: number;
    lastTarget?: number;
    avoid: Set<number>;
    dist?: Int32Array;
    distTick: number;
    toward?: Int32Array;
    towardUid?: number;
    towardTick?: number;
    // Stepping back from a monster until, and shooting without stepping until
    kiteUntil?: number;
    shootUntil?: number;
};

// How far a walk it is from the hero to a spot, by the last map of it
function walk(game: Game, p: Pilot, x: number, y: number): number {
    const { baseX, baseY, sizeX, sizeY } = game.grid;
    const tx = Math.floor(x) - baseX;
    const ty = Math.floor(y) - baseY;
    if (!p.dist || tx < 0 || ty < 0 || tx >= sizeX || ty >= sizeY) {
        return Infinity;
    }
    const d = p.dist[tx + ty * sizeX];
    return d < 0 ? Infinity : d;
}

function autopilot(game: Game, state: Pilot): GameInput {
    const input = noInput();
    const h = game.hero;
    const stats = game.stats;
    // Out of the marked rings about to land: of sixteen ways, the one to the fewest rings by the
    // time they land, as a player looks for the gap in a guardian's rain rather than just stepping
    // out of the nearest ring into the next
    const threats = game.strikes.filter((s) => s.side === "monster" && s.land - game.tick < 60 && s.land >= game.tick);
    const inRing = (x: number, y: number) => threats.reduce((n, s) => n + (Math.hypot(x - s.x, y - s.y) < s.radius + 0.8 ? 1 : 0), 0);
    if (threats.length > 0 && inRing(h.x, h.y) > 0) {
        const soonest = Math.min(...threats.map((s) => s.land)) - game.tick;
        const reach = Math.max(1, (stats.moveSpeed / TICKS_PER_SECOND) * soonest);
        let bestDir = { x: 1, y: 0, n: Infinity, d: Infinity };
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            const ux = Math.cos(a);
            const uy = Math.sin(a);
            // The first spot along the way that's clear, or the end of what can be run
            let n = Infinity;
            let at = reach;
            for (let step = 0.5; step <= reach; step += 0.5) {
                const x = h.x + ux * step;
                const y = h.y + uy * step;
                if (game.grid.isSolid(Math.floor(x), Math.floor(y))) {
                    break;
                }
                const here = inRing(x, y);
                if (here < n) {
                    n = here;
                    at = step;
                }
                if (here === 0) {
                    break;
                }
            }
            if (n < bestDir.n || (n === bestDir.n && at < bestDir.d)) {
                bestDir = { x: ux, y: uy, n, d: at };
            }
        }
        input.moveX = bestDir.x;
        input.moveY = bestDir.y;
        return input;
    }
    // The guardian's own slam round itself: step back out of it
    const boss = game.boss;
    const slam = boss?.state === "special" && boss.specialNow?.kind === "slam" ? boss.specialNow : undefined;
    if (boss && slam) {
        const dx = h.x - boss.x;
        const dy = h.y - boss.y;
        const d = Math.hypot(dx, dy);
        if (d < slam.radius + 1) {
            input.moveX = dx / Math.max(0.001, d);
            input.moveY = dy / Math.max(0.001, d);
            return input;
        }
    }
    // Anything killed, or the one being fought brought lower than it's been, is getting somewhere
    // (a monster healing itself back up isn't)
    const fighting = state.target >= 0 ? game.monsterByUid(state.target) : undefined;
    const lifeNow = fighting ? fighting.life : -1;
    if (game.killed !== state.lastKills || (lifeNow >= 0 && lifeNow < (state.lastLife ?? Infinity)) || state.target !== state.lastTarget) {
        state.lastTarget = state.target;
        state.lastKills = game.killed;
        state.lastLife = lifeNow;
        state.since = game.tick;
    }
    // Going nowhere for a long while: try another
    if (game.tick - state.since > TICKS_PER_SECOND * 25 && state.target >= 0) {
        state.avoid.add(state.target);
        state.target = -1;
        state.since = game.tick;
    }
    if (!state.dist || game.tick - state.distTick >= 25) {
        state.dist = walkDistances(game.grid, h.x, h.y);
        state.distTick = game.tick;
    }
    let best: Monster | undefined;
    let bestW = Infinity;
    for (const m of game.monsters) {
        if (m.state === "dead" || state.avoid.has(m.uid)) {
            continue;
        }
        // Whatever's close comes first; then the nearest walk
        const straight = Math.hypot(m.x - h.x, m.y - h.y);
        const w = straight < 5 ? straight : walk(game, state, m.x, m.y);
        if (w < bestW) {
            bestW = w;
            best = m;
        }
    }
    const bestD = best ? Math.hypot(best.x - h.x, best.y - h.y) : Infinity;
    // A shot at something behind rock breaks on the rock, so a hero whose attack flies walks round
    // to where it can see it, as a player would (a blow walks itself up to its target)
    const main0 = game.skills[0];
    const shoots = !!main0 && !main0.why && !["strike", "cleave", "slam", "leap", "nova", "buff", "blink"].includes(main0.def.kind);
    const unseen = !!best && shoots && (bestD > main0.range - 1.5 || !canSee(game.grid, h.x, h.y, best.x, best.y));
    if (best && (bestD > 24 || unseen)) {
        // A long walk: down the map of walks to it, step by step, as the hero's own field is short
        if (!state.toward || state.towardUid !== best.uid || game.tick - (state.towardTick ?? 0) > 100) {
            state.toward = walkDistances(game.grid, best.x, best.y);
            state.towardUid = best.uid;
            state.towardTick = game.tick;
        }
        const { baseX, baseY, sizeX } = game.grid;
        const tx = Math.floor(h.x) - baseX;
        const ty = Math.floor(h.y) - baseY;
        let bx = 0;
        let by = 0;
        let bv = state.toward[tx + ty * sizeX];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const v = state.toward[tx + dx + (ty + dy) * sizeX];
            if (v >= 0 && (bv < 0 || v < bv)) {
                // No cutting a corner past rock
                if (dx !== 0 && dy !== 0 && (state.toward[tx + dx + ty * sizeX] < 0 || state.toward[tx + (ty + dy) * sizeX] < 0)) {
                    continue;
                }
                bv = v;
                bx = dx;
                by = dy;
            }
        }
        if (bx !== 0 || by !== 0) {
            const cx = Math.floor(h.x) + bx + 0.5 - h.x;
            const cy = Math.floor(h.y) + by + 0.5 - h.y;
            const cd = Math.max(0.001, Math.hypot(cx, cy));
            input.moveX = cx / cd;
            input.moveY = cy / cd;
            state.target = best.uid;
            if (h.life < stats.maxLife * 0.5 && game.tick >= h.lifePotionUntil) {
                input.potion = 0;
            }
            return input;
        }
    }
    // Kiting: a hero whose attack flies steps back from a monster that fights hand to hand when it's
    // close, between shots, as a ranged player does; to the way that's furthest from them all
    const main = game.skills[0];
    const flies = main && !main.why && (main.def.kind === "shoot" || main.def.kind === "burst" || main.def.kind === "rain" || main.def.kind === "arc") && main.range >= 8;
    // A step calls off a shot not yet loosed (and refunds it), so it lets the shot fly first, then
    // steps for half a second (cutting the follow-through short), then shoots for at least a second
    // before stepping again
    if (flies) {
        const until = state.kiteUntil ?? -1;
        if (game.tick < until && h.action && !h.action.fired) {
            // The steps start once the shot's loosed
            state.kiteUntil = game.tick + 25;
        } else if (game.tick === until) {
            // Stepped back: now shoot a while
            state.shootUntil = game.tick + 50;
        } else if (game.tick > until && game.tick >= (state.shootUntil ?? 0)) {
            const near = game.monsters.some((m) => m.state !== "dead" && !m.def.ranged && Math.hypot(m.x - h.x, m.y - h.y) < 2.2 + m.radius);
            if (near) {
                state.kiteUntil = game.tick + 25;
            }
        }
        if (game.tick < (state.kiteUntil ?? -1) && !(h.action && !h.action.fired)) {
            let bestDir = { x: 0, y: 0, score: -Infinity };
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const x = h.x + Math.cos(a) * 2.5;
                const y = h.y + Math.sin(a) * 2.5;
                if (game.grid.isSolid(Math.floor(x), Math.floor(y)) || game.grid.isSolid(Math.floor(h.x + Math.cos(a)), Math.floor(h.y + Math.sin(a)))) {
                    continue;
                }
                let score = Infinity;
                for (const m of game.monsters) {
                    if (m.state !== "dead") {
                        score = Math.min(score, Math.hypot(m.x - x, m.y - y));
                    }
                }
                if (score > bestDir.score) {
                    bestDir = { x: Math.cos(a), y: Math.sin(a), score };
                }
            }
            if (bestDir.score > -Infinity) {
                input.moveX = bestDir.x;
                input.moveY = bestDir.y;
                if (h.life < stats.maxLife * 0.5 && game.tick >= h.lifePotionUntil) {
                    input.potion = 0;
                }
                return input;
            }
        }
    }
    if (best) {
        if (best.uid !== state.target) {
            state.target = best.uid;
        }
        input.targetUid = best.uid;
        input.aimUid = best.uid;
        input.skills[0] = true;
        input.hasAim = true;
        input.aimX = best.x;
        input.aimY = best.y;
        if (bestD < 7) {
            for (let i = 1; i < game.skills.length; i++) {
                const s = game.skills[i];
                if (!s || s.why) {
                    continue;
                }
                const kind = s.def.kind;
                if (kind === "blink" || kind === "leap") {
                    input.skills[i] = bestD > 3 && game.tick % 47 === 0;
                } else if (kind === "buff") {
                    input.skills[i] = game.tick % 13 === 0;
                } else if (kind === "summon") {
                    input.skills[i] = game.tick % 29 === 0;
                } else {
                    input.skills[i] = h.mana > stats.maxMana * 0.25 || s.mana === 0 ? game.tick % 3 === 0 : false;
                }
            }
        }
    }
    if (h.life < stats.maxLife * 0.5 && game.tick >= h.lifePotionUntil) {
        input.potion = 0;
    } else if (h.mana < stats.maxMana * 0.2 && game.tick >= h.manaPotionUntil) {
        input.potion = 1;
    }
    return input;
}

// A guard only: a rift ends when it collapses, at its own time limit (Game.timeLimit)
const RIFT_SECONDS = 30 * 60;
// Gambles bought, all told
let gambles = 0;

function playRift(hero: Hero, depth: number, seed: number): RiftResult {
    const where = riftLand(depth, seed);
    const game = new Game(where.grid, hero, { depth, seed, spawn: where.spawn, nooks: where.nooks, guardian: where.guardian, packArea: where.packArea });
    const state: Pilot = { target: -1, since: 0, lastKills: 0, avoid: new Set<number>(), distTick: -999 };
    let bossStart = -1;
    let bossEnd = -1;
    let taken = 0;
    let drinks = 0;
    let lowest = 1;
    let gold = 0;
    let killedBy = "";
    let lastHitter = "";
    const end = RIFT_SECONDS * TICKS_PER_SECOND;
    let outcome: RiftResult["outcome"] = "timeout";
    const goldBefore = hero.gold;
    while (game.tick < end && !game.collapsed) {
        game.step(autopilot(game, state));
        for (const e of game.takeEvents()) {
            if (e.kind === "heroHit") {
                taken += e.amount;
            } else if (e.kind === "potion") {
                drinks++;
            } else if (e.kind === "monsterAttack") {
                lastHitter = `${e.monster.rank === "boss" ? "guardian" : e.monster.rank} ${e.monster.def.name}`;
            } else if (e.kind === "monsterHit" && e.uid === game.bossUid && bossStart < 0) {
                bossStart = game.tick;
            }
        }
        lowest = Math.min(lowest, game.hero.life / game.stats.maxLife);
        if (game.hero.dead) {
            outcome = "died";
            killedBy = lastHitter;
            break;
        }
        if (game.portalOpen) {
            bossEnd = game.tick;
            outcome = "cleared";
            break;
        }
    }
    if (outcome === "timeout" && process.env.DEBUG) {
        const alive = game.monsters.filter((m) => m.state !== "dead");
        const b = game.boss;
        console.log(
            `  timeout: hero ${game.hero.x.toFixed(0)},${game.hero.y.toFixed(0)} alive ${alive.length} avoid ${state.avoid.size} boss ${b?.x.toFixed(0)},${b?.y.toFixed(0)} ${b?.state} ${b?.life}/${b?.maxLife} target ${state.target}`,
        );
        const t = game.monsterByUid(state.target);
        if (t) {
            const h = game.hero;
            console.log(
                `    target ${t.def.name} ${t.rank} ${t.state} at ${t.x.toFixed(1)},${t.y.toFixed(1)} life ${Math.round(t.life)}/${t.maxLife} straight ${Math.hypot(t.x - h.x, t.y - h.y).toFixed(1)} walk ${walk(game, state, t.x, t.y)} sees ${canSee(game.grid, h.x, h.y, t.x, t.y)} mods ${t.mods?.map((x) => x).join("+")}`,
            );
        }
        for (const m of alive.slice(0, 8)) {
            console.log(`    ${m.uid} ${m.def.name} ${m.state} at ${m.x.toFixed(0)},${m.y.toFixed(0)} avoid=${state.avoid.has(m.uid)}`);
        }
    }
    // Everything on the ground is picked up (a sensible player picks up what's worth it)
    let items = 0;
    let rares = 0;
    let uniques = 0;
    if (outcome !== "died") {
        for (const d of game.drops) {
            if (d.gold) {
                hero.gold += d.gold;
            } else if (d.item) {
                if (stow(hero, d.item)) {
                    items++;
                    if (d.item.rarity === "rare") rares++;
                    if (d.item.rarity === "unique") uniques++;
                } else {
                    hero.gold += sellValue(d.item);
                }
            } else if (d.rune) {
                hero.runes[d.rune.id] += d.rune.count;
            }
        }
    }
    gold = hero.gold - goldBefore;
    if (outcome === "cleared") {
        hero.maxDepth = Math.max(hero.maxDepth, depth + 1);
    }
    fillBelt(hero, true);
    const boss = game.monsters.find((m) => m.uid === game.bossUid);
    return {
        outcome,
        seconds: game.tick / TICKS_PER_SECOND,
        kills: game.killed,
        bossSeconds: bossStart >= 0 && bossEnd >= 0 ? (bossEnd - bossStart) / TICKS_PER_SECOND : -1,
        bossLife: boss?.maxLife ?? 0,
        taken,
        drinks,
        gold,
        items,
        rares,
        uniques,
        lowest,
        killedBy,
        land: where.kind,
    };
}

// ---- A whole run ----

type Row = { label?: string; cls: ClassId; depth: number; al: number; levelIn: number; levelOut: number; r: RiftResult; dps: number; crowd: number; life: number; armour: number; evade: number; gold: number };

// From level 1 and depth 1, or, from a later depth, as a typical hero who has cleared the ones
// before it (the ladder's, past 16, start there as a level-60 hero with depth 16 cleared, and level
// on past 60 from what they kill)
function run(cls: ClassId, seed: number, maxDepth: number, log: (row: Row) => void, from = 1, hours = 6): Row[] {
    const hero = from > 1 ? typicalHero(cls, Math.min(PEAK_LEVEL, areaLevel(from - 1)), seed, undefined, from) : newHero(cls, seed);
    const shopRng = new Rng(seed ^ 0x51ab);
    const rows: Row[] = [];
    let depth = from;
    let fails = 0;
    let rift = 0;
    let totalSeconds = 0;
    while (depth <= maxDepth && rift < (maxDepth - from + 1) * 4 && totalSeconds < hours * 3600) {
        spendPoints(hero);
        pray(hero);
        keepHireling(hero);
        wearBetter(hero);
        socketAll(hero);
        arrangeBar(hero);
        const { single, crowd, stats } = heroDps(hero);
        const levelIn = hero.level;
        const r = playRift(hero, depth, (seed * 7919 + rift * 104729) >>> 0);
        totalSeconds += r.seconds;
        rift++;
        const row: Row = {
            cls,
            depth,
            al: areaLevel(depth),
            levelIn,
            levelOut: hero.level,
            r,
            dps: single,
            crowd,
            life: stats.maxLife,
            armour: stats.armour,
            evade: stats.evade,
            gold: hero.gold,
        };
        rows.push(row);
        log(row);
        spendPoints(hero);
        wearBetter(hero);
        socketAll(hero);
        hireBetter(hero);
        sellRest(hero);
        shop(hero, shopRng);
        if (r.outcome === "cleared") {
            depth++;
            fails = 0;
        } else {
            fails++;
            // Stuck: back a depth to farm, as a player would
            if (fails >= 3 && depth > 1) {
                depth--;
                fails = 0;
            }
        }
    }
    return rows;
}

// ---- The numbers on paper ----

function sheet(maxDepth: number): void {
    console.log("\nMonsters on paper: a normal goblin-equivalent (life 15, hit 4.5) at each area level, and each zone's guardian, its laps' more with it");
    console.log("depth AL  lifeScale dmgScale  normal-life rare-life  hit   guardian            life    hit");
    for (let depth = 1; depth <= maxDepth; depth++) {
        const al = areaLevel(depth);
        const zone = ZONES[(depth - 1) % ZONES.length];
        const boss = BOSSES[zone.boss];
        const lap = Math.floor((depth - 1) / ZONES.length);
        const bl = boss.life * monsterLifeScale(al + 2) * (1 + GUARDIAN_LAP.life * lap);
        const bh = ((boss.damage[0] + boss.damage[1]) / 2) * monsterDamageScale(al + 2) * (1 + GUARDIAN_LAP.damage * lap);
        console.log(
            `${String(depth).padStart(5)} ${String(al).padStart(3)} ${monsterLifeScale(al).toFixed(2).padStart(9)} ${monsterDamageScale(al).toFixed(2).padStart(8)} ${(
                15 * monsterLifeScale(al)
            )
                .toFixed(0)
                .padStart(12)} ${(15 * 3.6 * monsterLifeScale(al + 1)).toFixed(0).padStart(9)} ${(4.5 * monsterDamageScale(al)).toFixed(1).padStart(5)}   ${boss.name.padEnd(18)} ${bl.toFixed(0).padStart(6)} ${bh.toFixed(1).padStart(6)}`,
        );
    }
    console.log("\nExperience: xp to next level, and normal kills of a 7-xp monster at the level's own area level to get it");
    for (const level of [1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 59]) {
        const xpKill = 7 * (1 + (level - 1) * 0.35);
        console.log(`  level ${String(level).padStart(2)}: ${String(xpToNext(level)).padStart(7)} xp, ${(xpToNext(level) / xpKill).toFixed(0).padStart(5)} kills`);
    }
    void MONSTERS;
}

// ---- A hero's power by level, on paper ----

// A hero of a level as a player would have them: the class's gems at the most their level allows,
// the best of what a few rifts at that level would drop (and the shops would sell), and every
// point spent. What they deal and what they can take, against the monsters of that level. Its
// depth is the one its level is had at, unless it's given (a ladder's hero is 60 at any depth, with
// a point a depth past 16 for the levels past 60 they'd have, about a rift apiece).
function typicalHero(cls: ClassId, level: number, seed: number, drops = Math.min(140, 35 + 8 * level), maxDepth = Math.max(1, Math.min(24, Math.round((level - 1) / 4) + 1))): Hero {
    const hero = newHero(cls, seed);
    hero.ladderPoints = Math.max(0, maxDepth - 1 - LADDER_DEPTH);
    gainXp(hero, 0);
    while (hero.level < level) {
        gainXp(hero, xpToNext(hero.level));
    }
    hero.maxDepth = maxDepth;
    const rng = new Rng(seed * 31 + level);
    for (const gem of allGems(hero)) {
        const def = gemDef(gem)!;
        let l = 1;
        while (l < 20 && gemRequirement(def, l + 1) <= level) {
            l++;
        }
        gem.level = l;
    }
    spendPoints(hero);
    for (let batch = 0; batch < drops / 35; batch++) {
        for (let i = 0; i < 35; i++) {
            const il = Math.max(1, level - rng.int(4));
            const item = rollItem(rng, nextUid(hero), { level: il, rarity: 0.4, cls });
            if (!stow(hero, item)) {
                break;
            }
        }
        wearBetter(hero);
        hero.inventory = hero.inventory.map((it) => (it && isGem(it) ? it : null));
    }
    // Refunded and spent again with the gear on, as a player tunes the tree to what they wear
    hero.passives = [];
    spendPoints(hero);
    return hero;
}

// ---- The guardians alone ----

// A typical hero of the area's level put a walk from each depth's guardian, with the rest of the
// rift emptied: how often it wins, how long it takes and how low it brings the hero, over seeds
function guardians(classes: ClassId[], seeds: number, maxDepth: number): void {
    console.log("\nEach guardian against a typical hero of its area level, the rest of the rift empty: wins of tries, seconds to win, the lowest life");
    console.log(`depth  guardian            ${classes.map((c) => c.padEnd(19)).join("")}`);
    for (let depth = 1; depth <= maxDepth; depth++) {
        let name = "";
        const cells: string[] = [];
        for (const cls of classes) {
            let wins = 0;
            let secs = 0;
            let low = 0;
            for (let s = 0; s < seeds; s++) {
                const level = Math.min(PEAK_LEVEL, areaLevel(depth));
                const hero = typicalHero(cls, level, 5000 + s * 31 + depth, undefined, depth);
                arrangeBar(hero);
                const seed = 9000 + s * 977 + depth * 13;
                const game = new Game(land(seed), hero, { depth, seed, spawn: { x: BASE_X + 4.5, y: BASE_Y + 4.5 } });
                const boss = game.boss!;
                name = boss.def.name;
                for (const m of game.monsters) {
                    if (m.pack !== boss.pack) {
                        m.state = "dead";
                    }
                }
                // Somewhere about fourteen tiles' walk from it
                const dist = walkDistances(game.grid, boss.x, boss.y);
                const { baseX, baseY, sizeX } = game.grid;
                let spot = -1;
                for (let i = 0; i < dist.length && spot < 0; i++) {
                    if (dist[i] >= 14 && dist[i] <= 15) {
                        spot = i;
                    }
                }
                const h = game.hero;
                h.x = h.prevX = baseX + (spot % sizeX) + 0.5;
                h.y = h.prevY = baseY + Math.floor(spot / sizeX) + 0.5;
                const state: Pilot = { target: -1, since: 0, lastKills: 0, avoid: new Set<number>(), distTick: -999 };
                let lowest = 1;
                // With DEBUG: what the hero spent the fight on
                const casts = new Map<string, number>();
                // And what hurt them, by who and how: a blow or shot, or what fell from the sky
                const hurt = new Map<string, number>();
                const hurtHero = game.hurtHero.bind(game);
                game.hurtHero = (amount, from, attack = false, by = from, kind, element) => {
                    const key = element ?? `${from?.rank === "boss" ? "guardian" : (from?.rank ?? "?")} ${attack ? "attack" : "special"}`;
                    const taken = hurtHero(amount, from, attack, by, kind, element);
                    hurt.set(key, (hurt.get(key) ?? 0) + taken);
                    return taken;
                };
                let moving = 0;
                while (game.tick < 180 * TICKS_PER_SECOND && !game.hero.dead && !game.portalOpen) {
                    const input = autopilot(game, state);
                    if (input.moveX !== 0 || input.moveY !== 0) {
                        moving++;
                    }
                    game.step(input);
                    for (const e of game.takeEvents()) {
                        if (e.kind === "cast") {
                            casts.set(e.skill.name, (casts.get(e.skill.name) ?? 0) + 1);
                        }
                    }
                    lowest = Math.min(lowest, game.hero.life / game.stats.maxLife);
                }
                if (process.env.DEBUG) {
                    const t = game.tick / TICKS_PER_SECOND;
                    console.log(
                        `  ${cls} d${depth} s${s}: ${game.portalOpen ? "won" : game.hero.dead ? "died" : "out of time"} at ${t.toFixed(0)}s, moving ${((moving / game.tick) * 100).toFixed(0)}%, casts ${[...casts].map(([k, v]) => `${k} ${v}`).join(", ")}; hurt (in lives) ${[...hurt]
                            .map(([k, v]) => `${k} ${(v / game.stats.maxLife).toFixed(1)}`)
                            .join(", ")}`,
                    );
                }
                if (game.portalOpen) {
                    wins++;
                    secs += game.tick / TICKS_PER_SECOND;
                }
                low += game.hero.dead ? 0 : lowest;
            }
            cells.push(`${wins}/${seeds} ${(wins > 0 ? secs / wins : 0).toFixed(0).padStart(3)}s ${String(Math.round((low / seeds) * 100)).padStart(3)}%`.padEnd(19));
        }
        console.log(`${String(depth).padStart(5)}  ${name.padEnd(18)}  ${cells.join("")}`);
    }
}

function curve(classes: ClassId[], seeds: number): void {
    console.log("\nA typical hero by level: damage a second to one and to a crowd, life, armour, evasion, and how long an on-level normal monster lasts and a hit takes of life");
    console.log("class        lvl  AL   dps1   dpsN   life  mana  arm  eva  ehp    norm-ttk  rare-ttk  boss-ttk  hit/life   hire: dps  life");
    for (const cls of classes) {
        for (const level of [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 60]) {
            let single = 0;
            let crowd = 0;
            let life = 0;
            let mana = 0;
            let armour = 0;
            let evade = 0;
            let ehp = 0;
            let hireDps = 0;
            let hireLife = 0;
            for (let s = 0; s < seeds; s++) {
                const hero = typicalHero(cls, level, 1000 + s);
                const d = heroDps(hero);
                typicalHireling(hero, 1000 + s);
                const hs = hirelingStats(hero)!;
                if (process.env.DEBUG) {
                    const eq = Object.values(hero.hireling!.equipment).map((i) => i && `${itemInfo(i).name} (${itemInfo(i).baseName} ${JSON.stringify(itemInfo(i).weapon?.damage ?? "")}) ${i.rarity}`);
                    console.log(`  ${cls} ${level} ${hero.hireling!.kind}: ${eq.join(", ")} dmg ${hs.minDamage}-${hs.maxDamage} every ${hs.attackSeconds.toFixed(2)}s crit ${hs.critChance.toFixed(2)}x${hs.critMulti.toFixed(2)} own ${hs.own}`);
                }
                hireDps += hirelingDps(hs) / seeds;
                hireLife += hs.maxLife / seeds;
                single += d.single / seeds;
                crowd += d.crowd / seeds;
                life += d.stats.maxLife / seeds;
                mana += d.stats.maxMana / seeds;
                armour += d.stats.armour / seeds;
                evade += d.stats.evade / seeds;
                ehp += effectiveLife(d.stats, level) / seeds;
            }
            // The on-level area: a hero of level L is in rifts of about level L
            const al = level;
            const normal = 15 * monsterLifeScale(al);
            const rare = 15 * 3.6 * monsterLifeScale(al + 1);
            const zone = ZONES[Math.min(ZONES.length - 1, Math.floor((al - 1) / 4))];
            const boss = BOSSES[zone.boss].life * monsterLifeScale(al + 2);
            const hit = 4.5 * monsterDamageScale(al);
            console.log(
                `${cls.padEnd(12)} ${String(level).padStart(3)} ${String(al).padStart(3)} ${single.toFixed(0).padStart(6)} ${crowd.toFixed(0).padStart(6)} ${life
                    .toFixed(0)
                    .padStart(6)} ${mana.toFixed(0).padStart(5)} ${armour.toFixed(0).padStart(4)} ${(evade * 100).toFixed(0).padStart(3)}% ${ehp.toFixed(0).padStart(5)}  ${(
                    normal / Math.max(1, single)
                )
                    .toFixed(2)
                    .padStart(8)}s ${(rare / Math.max(1, single)).toFixed(1).padStart(8)}s ${(boss / Math.max(1, single)).toFixed(0).padStart(8)}s ${((hit / ehp) * 100).toFixed(1).padStart(8)}%   ${hireDps.toFixed(0).padStart(8)} ${hireLife.toFixed(0).padStart(5)}`,
            );
        }
    }
}

// Every skill gem, by a hero of each colour's at a level with typical gear: what each does
function skillTable(level: number): void {
    console.log(`\nEvery skill at hero level ${level}, gem at the most it can be, alone (no supports), with a typical hero of a class that can use it`);
    console.log("skill                 kind    class       share  uses/s  dps1  dummy   dpsN   mana/s  regen/s");
    for (const g of GEMS) {
        if (!g.skill) {
            continue;
        }
        const cls = CLASS_IDS.find((c) => (CLASS_COLORS[c][0] === g.color || (g.weapons && g.weapons.every((w) => CLASSES[c].weapons.includes(w)))) && (!g.weapons || g.weapons.some((w) => w === CLASSES[c].weapon)))!;
        if (!cls) {
            continue;
        }
        const hero = typicalHero(cls, level, 77, 70);
        // The gem, alone in the weapon
        const weapon = hero.equipment.weapon!;
        weapon.sockets = [{ color: "white", linked: false, gem: makeGem(nextUid(hero), g.id) }];
        let l = 1;
        while (l < 20 && gemRequirement(g, l + 1) <= level) {
            l++;
        }
        weapon.sockets[0].gem!.level = l;
        const stats = heroStats(hero);
        const s = resolveSkill(hero, stats, weapon.sockets[0].gem!.uid);
        if (!s) {
            continue;
        }
        const d = skillDps(s, stats);
        const uses = s.speed / Math.max(0.2, s.def.castTime);
        const rate = s.cooldown > 0 ? Math.min(uses, 1 / s.cooldown) : uses;
        const measured = s.def.damage > 0 ? onDummy(hero, weapon.sockets[0].gem!.uid) : 0;
        console.log(
            `${g.name.padEnd(21)} ${s.def.kind.padEnd(7)} ${cls.padEnd(11)} ${s.share.toFixed(2).padStart(5)} ${rate.toFixed(2).padStart(7)} ${d.single.toFixed(0).padStart(5)} ${measured
                .toFixed(0)
                .padStart(5)} ${d.crowd.toFixed(0).padStart(6)} ${(s.mana * rate).toFixed(1).padStart(8)} ${stats.manaRegen.toFixed(1).padStart(8)}${s.why ? `  (${s.why})` : ""}`,
        );
    }
}

// A skill's damage a second as the sim deals it: held for 20 seconds on a guardian-sized target that
// stands still, mana kept full, from a melee step away or a bow's distance. The paper estimate
// (skillDps) is checked against this.
function openLand(): ArenaGrid {
    const rows: string[] = [];
    for (let row = 0; row < 64; row++) {
        let line = "";
        for (let x = 0; x < 64; x++) {
            const y = 63 - row;
            line += x === 0 || y === 0 || x === 63 || y === 63 ? "#" : ".";
        }
        rows.push(line);
    }
    return makeGrid(rows, BASE_X, BASE_Y);
}

function onDummy(hero: Hero, uid: number): number {
    const h = structuredClone(hero);
    bindSkill(h, 1, uid);
    const game = new Game(openLand(), h, { depth: 1, seed: 4242, spawn: { x: BASE_X + 30.5, y: BASE_Y + 30.5 } });
    const m = game.monsters.find((o) => o.rank !== "boss") ?? game.monsters[0];
    for (const o of game.monsters) {
        if (o !== m) {
            o.state = "dead";
        }
    }
    const skill = game.skills[1];
    const far = skill && (skill.def.kind === "shoot" || skill.def.kind === "burst" || skill.def.kind === "rain" || skill.def.kind === "arc" || skill.def.kind === "summon");
    // On the hero's right, on open ground
    const p = game.hero;
    m.x = m.prevX = p.x + (far ? 5 : 1.8);
    m.y = m.prevY = p.y;
    m.radius = 1.2;
    m.life = m.maxLife = 1e9;
    m.armour = 0;
    m.frozenUntil = 1e9;
    const ticks = 20 * TICKS_PER_SECOND;
    for (let i = 0; i < ticks; i++) {
        const input = noInput();
        input.hasAim = true;
        input.aimX = m.x;
        input.aimY = m.y;
        input.aimUid = m.uid;
        input.skills[1] = true;
        input.standing = skill?.def.kind !== "leap" && skill?.def.kind !== "blink";
        game.hero.mana = game.stats.maxMana;
        game.step(input);
        game.takeEvents();
    }
    return (m.maxLife - m.life) / 20;
}

// ---- Main ----

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? Number(args[i + 1]) : fallback;
};
const buildName = args.includes("--build") ? args[args.indexOf("--build") + 1] : undefined;
const chosen = buildName !== undefined ? BUILDS[buildName] : undefined;
if (buildName !== undefined && !chosen) {
    console.error(`There's no build called ${buildName}. The builds: ${Object.keys(BUILDS).join(", ")}`);
    process.exit(1);
}
const classes = chosen ? [chosen.cls] : (args.filter((a) => (CLASS_IDS as string[]).includes(a)) as ClassId[]);
// A build's hero (--inspect, --curve and the rest show it), and in the rifts its class's plain one beside it
rushing = chosen ? buildNodes(chosen) : [];
if (args.includes("--sheet")) {
    sheet(flag("depth", 16));
    process.exit(0);
}
if (args.includes("--curve")) {
    curve(classes.length > 0 ? classes : CLASS_IDS, flag("seeds", 2));
    process.exit(0);
}
if (args.includes("--inspect")) {
    // A typical hero up close: what they wear, their skills and what each does
    const level = flag("level", 30);
    for (const cls of classes.length > 0 ? classes : CLASS_IDS) {
        const hero = typicalHero(cls, level, 1000);
        const stats = heroStats(hero);
        console.log(`\n${cls} ${level}: life ${stats.maxLife} mana ${stats.maxMana} (${stats.manaRegen.toFixed(1)}/s) armour ${stats.armour} evade ${(stats.evade * 100).toFixed(0)}% str ${stats.str} dex ${stats.dex} int ${stats.int}`);
        console.log(`  weapon ${stats.weapon.kind} ${stats.minDamage}-${stats.maxDamage} x${stats.weapon.speed.toFixed(2)}; increased ${JSON.stringify(Object.fromEntries(Object.entries(stats.damage).map(([k, v]) => [k, Math.round(v * 100)])))}; crit ${(stats.critChance * 100).toFixed(0)}% x${stats.critMulti.toFixed(2)}`);
        for (const slot of SLOTS) {
            const it = hero.equipment[slot];
            if (it) {
                const info = itemInfo(it);
                console.log(`  ${slot.padEnd(7)} ${it.rarity.padEnd(6)} L${String(it.level).padStart(2)} ${info.name}${info.weapon ? ` ${info.weapon.damage.join("-")}` : ""} | ${info.stats.map((s) => `${s.stat} ${s.value}`).join(", ")} | ${(it.sockets ?? []).map((s) => (s.gem ? `${s.gem.base}${s.gem.level}` : s.color) + (s.linked ? "=" : " ")).join("")}`);
            }
        }
        const skills = resolveSkills(hero, stats);
        skills.forEach((s, i) => {
            if (s) {
                const d = skillDps(s, stats);
                console.log(`  [${i}] ${s.def.name} L${s.level} ${s.minHit.toFixed(0)}-${s.maxHit.toFixed(0)} dps ${d.single.toFixed(0)}/${d.crowd.toFixed(0)} mana ${s.mana} by ${s.supportedBy.join("+") || "-"}${s.why ? ` (${s.why})` : ""}`);
            }
        });
    }
    process.exit(0);
}
if (args.includes("--guardians")) {
    guardians(classes.length > 0 ? classes : CLASS_IDS, flag("seeds", 4), flag("depth", 16));
    process.exit(0);
}
if (args.includes("--skills")) {
    skillTable(flag("level", 20));
    process.exit(0);
}
const maxDepth = flag("depth", 16);
const from = flag("from", 1);
const hours = flag("hours", 6);
const seeds = flag("seeds", 1);
const firstSeed = flag("seed", 1);
const all: Row[] = [];
const pct = (v: number) => `${Math.round(v * 100)}%`;
console.log(`class        d  AL lvl     outcome   time  kills boss(s) bossLife  dps1  dpsN  life  arm  eva  taken/min drinks low  gold   items(r/u) ${RIFTS === "open" ? "" : "land   "}killedBy`);
const runs = chosen ? [{ label: buildName!, cls: chosen.cls, nodes: rushing }, { label: chosen.cls, cls: chosen.cls, nodes: [] as number[] }] : (classes.length > 0 ? classes : CLASS_IDS).map((cls) => ({ label: cls as string, cls, nodes: [] as number[] }));
for (const { label, cls, nodes } of runs) {
    rushing = nodes;
    for (let s = 0; s < seeds; s++) {
        const t0 = Date.now();
        run(cls, firstSeed + s, maxDepth, (row) => {
            all.push({ ...row, label });
            const r = row.r;
            console.log(
                `${label.padEnd(12)} ${String(row.depth).padStart(2)} ${String(row.al).padStart(3)} ${`${row.levelIn}->${row.levelOut}`.padEnd(7)} ${r.outcome.padEnd(8)} ${(
                    r.seconds / 60
                )
                    .toFixed(1)
                    .padStart(5)}m ${String(r.kills).padStart(5)} ${(r.bossSeconds >= 0 ? r.bossSeconds.toFixed(0) : "-").padStart(7)} ${String(r.bossLife).padStart(8)} ${row.dps
                    .toFixed(0)
                    .padStart(5)} ${row.crowd.toFixed(0).padStart(5)} ${String(row.life).padStart(5)} ${String(row.armour).padStart(4)} ${pct(row.evade).padStart(4)} ${pct(
                    r.taken / row.life / Math.max(0.1, r.seconds / 60),
                ).padStart(10)} ${String(r.drinks).padStart(6)} ${pct(r.lowest).padStart(4)} ${String(row.gold).padStart(6)}   ${`${r.items}(${r.rares}/${r.uniques})`.padEnd(10)} ${RIFTS === "open" ? "" : `${r.land.padEnd(6)} `}${r.killedBy}`,
            );
        }, from, hours);
        console.error(`${label} seed ${firstSeed + s}: ${((Date.now() - t0) / 1000).toFixed(0)}s, ${gambles} gambles`);
        gambles = 0;
    }
}

// A summary by class: rifts to reach each depth, deaths, and time
console.log("\nSummary: per class, level on first reaching each depth, deaths there, and minutes spent");
const byCls = new Map<string, Row[]>();
for (const row of all) {
    const label = row.label ?? row.cls;
    byCls.set(label, [...(byCls.get(label) ?? []), row]);
}
for (const [cls, rows] of byCls) {
    const parts: string[] = [];
    for (let d = 1; d <= maxDepth; d++) {
        const at = rows.filter((r) => r.depth === d);
        if (at.length === 0) {
            continue;
        }
        const deaths = at.filter((r) => r.r.outcome === "died").length;
        const mins = at.reduce((a, r) => a + r.r.seconds, 0) / 60;
        parts.push(`d${d} L${at[0].levelIn} ${deaths}x ${mins.toFixed(0)}m`);
    }
    console.log(`${cls.padEnd(12)} ${parts.join(" | ")}`);
}
if (chosen) {
    // The build beside the plain path: how deep, how fast, how often it died, what it dealt at the end
    console.log(`\n${buildName}, beside a plain ${chosen.cls}: ${chosen.nodes.join(", ")}`);
    for (const [label, rows] of byCls) {
        const last = rows[rows.length - 1];
        const deaths = rows.filter((r) => r.r.outcome === "died").length;
        const mins = rows.reduce((a, r) => a + r.r.seconds, 0) / 60;
        const deepest = Math.max(0, ...rows.filter((r) => r.r.outcome === "cleared").map((r) => r.depth));
        console.log(`${label.padEnd(16)} cleared to ${String(deepest).padStart(2)}  ${String(rows.length).padStart(3)} rifts  ${String(deaths).padStart(2)} deaths  ${mins.toFixed(0).padStart(4)}m  last dps ${last.dps.toFixed(0)}/${last.crowd.toFixed(0)}  life ${last.life}`);
    }
}
// By the land played on: open rifts' against planned ones', and the plans' kinds against each other
console.log("\nBy land: rifts, cleared, died, timed out, and a cleared rift's minutes, kills, minutes on its guardian and lowest life, on average");
const byLand = new Map<string, Row[]>();
for (const row of all) {
    byLand.set(row.r.land, [...(byLand.get(row.r.land) ?? []), row]);
}
for (const [kind, rows] of byLand) {
    const cleared = rows.filter((r) => r.r.outcome === "cleared");
    const mean = (f: (r: Row) => number, of = cleared) => (of.length > 0 ? of.reduce((a, r) => a + f(r), 0) / of.length : 0);
    const bossed = cleared.filter((r) => r.r.bossSeconds >= 0);
    console.log(
        `${kind.padEnd(6)} ${String(rows.length).padStart(4)} rifts ${String(cleared.length).padStart(4)} cleared ${String(rows.filter((r) => r.r.outcome === "died").length).padStart(3)} died ${String(rows.filter((r) => r.r.outcome === "timeout").length).padStart(3)} timed out   ${mean((r) => r.r.seconds / 60).toFixed(1).padStart(5)}m ${mean((r) => r.r.kills).toFixed(0).padStart(5)} kills ${(mean((r) => r.r.bossSeconds, bossed) / 60).toFixed(1).padStart(5)}m guardian ${pct(mean((r) => r.r.lowest)).padStart(4)} lowest`,
    );
}
void SLOTS;
void itemInfo;
