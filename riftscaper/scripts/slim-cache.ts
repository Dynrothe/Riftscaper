// Writes a slim copy of Riftscaper's cache for hosting: only the groups the game reads, in chunks
// (engine/rs/cache/ChunkedCache.ts), so a first visit downloads a few MB instead of the whole
// cache. Run it from the project's root, after the build (which empties riftscaper/dist):
//
//   bun run build:riftscaper && bun run slim-cache:riftscaper
//
//   SLIM_CHECK=0      skip loading it all again from the slim cache (local runs only)
//   SLIM_SEEDS=n      rifts made from the cache, per zone, besides ScapeRune's palette (2)
//
// What the game reads is found by loading what it loads, with its own loaders, and noting every
// group read: the city; ScapeRune's palette map, which has every floor, loc and prefab the
// generator can put in a rift, so any seed's land is covered; a few rifts of each zone, with the
// camp; every bake (the common ones, every monster and boss, the hero in every kit, worn item and
// animation, and every item on the ground); the textures, sounds and sprites; and an icon for
// every item. The chunks are written to the out dir and read back, every group has to come out
// as it went in, and then it's all loaded again from the slim cache, with rifts from other seeds,
// and a group it hasn't got fails the script.
//
// The out dir (riftscaper/dist/caches, unless one's given) gets the chunks in chunks/, each named
// after its sha256, and a caches.json listing them. The same cache and content always give the
// same chunks, so a host can keep them for good; caches.json and the page need no-cache.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { LoadedCache } from "../../engine/mapviewer/Caches";
import { assembleChunkedCache } from "../../engine/mapviewer/Caches";
import type { BakeRequest } from "../../engine/mapviewer/webgl/actor/ActorBakeTypes";
import { ActorBakeLoader } from "../../engine/mapviewer/webgl/actor/ActorBakeLoader";
import { SdMapDataLoader } from "../../engine/mapviewer/webgl/loader/SdMapDataLoader";
import { getSdTextureIds } from "../../engine/mapviewer/webgl/loader/TextureIndex";
import { ItemIconLoader } from "../../engine/mapviewer/worker/ItemIconLoader";
import type { RegionDataInput } from "../../engine/mapviewer/worker/RegionData";
import { RegionDataLoader } from "../../engine/mapviewer/worker/RegionDataLoader";
import type { RenderDataLoader } from "../../engine/mapviewer/worker/RenderDataLoader";
import { SoundLoader } from "../../engine/mapviewer/worker/SoundLoader";
import { SpriteDataLoader } from "../../engine/mapviewer/worker/SpriteDataLoader";
import { WorkerState, clearWorkerStateCaches, createWorkerState } from "../../engine/mapviewer/worker/WorkerState";
import { HITSPLAT_SPRITES } from "../../engine/render/Hitsplats";
import { CacheFiles } from "../../engine/rs/cache/CacheFiles";
import { CacheIndex } from "../../engine/rs/cache/CacheIndex";
import type { CacheInfo } from "../../engine/rs/cache/CacheInfo";
import { CHUNK_DIR, CacheGroup, getChunkFileName, isChunk, packChunks } from "../../engine/rs/cache/ChunkedCache";
import { MemoryStore } from "../../engine/rs/cache/store/MemoryStore";
import { SectorCluster } from "../../engine/rs/cache/store/SectorCluster";
import { Bzip2 } from "../../engine/rs/compression/Bzip2";
import { Gzip } from "../../engine/rs/compression/Gzip";
import { addCustomMapSquares } from "../../engine/rs/map/CustomMapFileLoader";
import type { CustomMapSquares } from "../../engine/rs/map/CustomMapFileLoader";
import { EquipSlot, createAppearance } from "../../engine/rs/model/player/PlayerModelLoader";
import { Scene } from "../../engine/rs/scene/Scene";
import { PALETTE_RECIPE } from "../../engine/scaperune/palette";
import { PINNACLES, PINNACLE_IDS, PinnacleId } from "../src/content/pinnacles";
import { buildRecipeSquares, createBuildContext } from "../../engine/scaperune/squares";
import { Hasher } from "../../engine/util/Hasher";
import { GAME_CACHE_NAME } from "../src/cache";
import { allSounds, commonRequests, heroAppearance, lookAppearance, monsterRequest, titleSeqs } from "../src/client/Assets";
import * as achievements from "../src/content/achievements";
import * as anims from "../src/content/anims";
import * as circle from "../src/content/circle";
import * as classes from "../src/content/classes";
import { CLASSES, LINEUP } from "../src/content/classes";
import * as forge from "../src/content/forge";
import { forgeSkillDefs } from "../src/content/forge";
import * as gems from "../src/content/gems";
import * as goods from "../src/content/goods";
import { allSkillDefs } from "../src/content/gems";
import * as items from "../src/content/items";
import { BASES, EQUIP_SLOT, SEQ, UNIQUES, allItemObjIds } from "../src/content/items";
import * as looks from "../src/content/looks";
import { BODY_PARTS, CLASS_LOOKS, PRESETS, kitsFor, plainLook } from "../src/content/looks";
import * as minions from "../src/content/minions";
import * as monsters from "../src/content/monsters";
import * as orrery from "../src/content/orrery";
import { BOSSES, allMonsterDefs } from "../src/content/monsters";
import * as passives from "../src/content/passives";
import * as pets from "../src/content/pets";
import * as pinnacles from "../src/content/pinnacles";
import * as riftMods from "../src/content/riftMods";
import * as rules from "../src/content/rules";
import * as runes from "../src/content/runes";
import * as town from "../src/content/town";
import * as visuals from "../src/content/visuals";
import * as zones from "../src/content/zones";
import { ZONES } from "../src/content/zones";
import { newHero } from "../src/sim/hero";
import { SLOT_SPRITE, SLOT_TILE, SPRITE, TREE_ICON } from "../src/ui/sprites";
import { PRAYER, PRAYERS } from "../src/content/prayers";
import { generateCity } from "../src/world/cityGen";
import { generateRift } from "../src/world/zoneGen";
import { loadGameCache } from "./cacheUtil";

const FULL_DIR = `./caches/${GAME_CACHE_NAME}/`;
const outDir = (process.argv[2] ?? "riftscaper/dist/caches").replace(/[\\/]?$/, "/");
const chunkDir = outDir + CHUNK_DIR;
const CHECK = process.env.SLIM_CHECK !== "0";
const SEEDS = Number(process.env.SLIM_SEEDS ?? 2);

// Map squares loaded round each arena: the renderer never asks for more than two past its edge
const MAP_MARGIN = 2;
// The most bake requests put through one buffer, as the game bakes a handful at a time
const BAKE_BATCH = 25;
const ICON_BATCH = 64;
const COINS = 995;

// The map loaders can draw minimap images on an OffscreenCanvas, which Node doesn't have. Only
// what they read from the cache matters here.
class NodeImageData {
    readonly data: Uint8ClampedArray;

    constructor(width: number, height: number) {
        this.data = new Uint8ClampedArray(width * height * 4);
    }
}
class NodeOffscreenCanvas {
    getContext() {
        return { putImageData() {} };
    }

    convertToBlob(): Promise<Blob> {
        return Promise.resolve(new Blob());
    }
}
Object.assign(globalThis, { ImageData: NodeImageData, OffscreenCanvas: NodeOffscreenCanvas });

// ---- What the game loads ----

type Area = { baseX: number; baseY: number; sizeX: number; sizeY: number };

type Unit =
    | { kind: "city" }
    | { kind: "palette" }
    | { kind: "rift"; depth: number; seed: number; pinnacle?: PinnacleId }
    | { kind: "bake"; name: string; requests: BakeRequest[] }
    | { kind: "textures" }
    | { kind: "sounds"; ids: number[] }
    | { kind: "sprites"; ids: number[] }
    | { kind: "icons"; objIds: number[] };

function describe(unit: Unit): string {
    switch (unit.kind) {
        case "rift":
            return `${unit.pinnacle ? PINNACLES[unit.pinnacle].name : `rift ${unit.depth}`} seed ${unit.seed}`;
        case "bake":
            return `${unit.name} bakes from ${unit.requests[0].key}`;
        case "icons":
            return `icons from ${unit.objIds[0]}`;
        default:
            return unit.kind;
    }
}

function batches<T>(list: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < list.length; i += size) {
        out.push(list.slice(i, i + size));
    }
    return out;
}

// Every number under a key that matches, anywhere in the content
function collectNumbers(roots: unknown[], key: RegExp): Set<number> {
    const found = new Set<number>();
    const seen = new Set<object>();
    const visit = (value: unknown, at: string): void => {
        if (typeof value === "number") {
            if (key.test(at) && Number.isInteger(value) && value >= 0) {
                found.add(value);
            }
        } else if (value && typeof value === "object" && !seen.has(value)) {
            seen.add(value);
            for (const [k, child] of value instanceof Map ? value.entries() : Object.entries(value)) {
                visit(child, Array.isArray(value) ? at : String(k));
            }
        }
    };
    roots.forEach((root) => visit(root, ""));
    return found;
}

// Ids written straight into the game's code (a buff's sprite, a skill's icon), as `key: 123`
function scanSource(key: string): Set<number> {
    const found = new Set<number>();
    const pattern = new RegExp(`\\b${key}:\\s*(\\d+)`, "g");
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(file);
            } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
                for (const match of fs.readFileSync(file, "utf8").matchAll(pattern)) {
                    found.add(Number(match[1]));
                }
            }
        }
    };
    walk("riftscaper/src");
    return found;
}

const CONTENT = [achievements, anims, circle, classes, forge, gems, goods, items, looks, minions, monsters, orrery, passives, pets, pinnacles, riftMods, rules, runes, town, visuals, zones];

function contentRoots(): unknown[] {
    return [...CONTENT.map((module) => ({ ...module })), allSkillDefs(), forgeSkillDefs()];
}

// Every animation the hero can play: what every class stands, walks and dies with, its flourish,
// every weapon's blow and every skill's own
function heroSeqs(): number[] {
    const seqs = new Set<number>([...Object.values(SEQ), 422]);
    for (const cls of Object.values(CLASSES)) {
        seqs.add(cls.flourish);
    }
    for (const def of [...BASES, ...UNIQUES]) {
        if (def.weapon) {
            seqs.add(def.weapon.seq);
        }
    }
    for (const skill of [...allSkillDefs(), ...forgeSkillDefs()]) {
        if (skill.seq !== undefined) {
            seqs.add(skill.seq);
        }
    }
    return [...seqs].filter((id) => id >= 0);
}

// The hero as anything they can look like: every kit of each body, every worn item on each, and
// every animation. Colours only recolour, so they read nothing.
function heroRequests(): BakeRequest[] {
    const requests: BakeRequest[] = [{ kind: "player", key: "seqs", appearance: createAppearance(), seqIds: heroSeqs() }];
    for (const female of [false, true]) {
        const body = female ? "b" : "a";
        const kits = kitsFor(female);
        const most = Math.max(...BODY_PARTS.map((part) => kits[part].length));
        for (let i = 0; i < most; i++) {
            const look = plainLook(female);
            look.kits = BODY_PARTS.map((part) => kits[part][i % kits[part].length]);
            requests.push({ kind: "player", key: `kits:${body}:${i}`, appearance: lookAppearance(look), seqIds: [] });
        }
        const worn = new Map<string, [EquipSlot, number]>();
        for (const def of [...BASES, ...UNIQUES]) {
            const at = EQUIP_SLOT[def.slot];
            if (at !== undefined) {
                worn.set(`${at}:${def.objId}`, [at, def.objId]);
            }
        }
        for (const [key, [at, objId]] of worn) {
            const appearance = createAppearance({ [at]: objId });
            appearance.female = female;
            const plain = plainLook(female);
            appearance.kits = [...plain.kits];
            requests.push({ kind: "player", key: `worn:${body}:${key}`, appearance, seqIds: [] });
        }
    }
    for (const cls of LINEUP) {
        requests.push({ kind: "player", key: `lineup:${cls}`, appearance: heroAppearance(newHero(cls, 1)), seqIds: titleSeqs(cls) });
    }
    for (const [name, look] of [...Object.entries(CLASS_LOOKS), ...PRESETS.map((p) => [p.name, p.look] as const)]) {
        requests.push({ kind: "player", key: `look:${name}`, appearance: lookAppearance(look), seqIds: [] });
    }
    return requests;
}

function itemObjIds(): number[] {
    const ids = new Set<number>([COINS, ...allItemObjIds(), ...collectNumbers(contentRoots(), /^(obj|objId|objIds|projectileObj)$/), ...scanSource("obj")]);
    return [...ids].sort((a, b) => a - b);
}

function spriteIds(): number[] {
    const ids = new Set<number>([
        ...Object.values(HITSPLAT_SPRITES),
        ...Object.values(SPRITE),
        ...Object.values(SLOT_SPRITE),
        ...Object.values(TREE_ICON),
        SLOT_TILE,
        ...Object.values(PRAYERS).flatMap((p) => [p.sprite, p.dim]),
        PRAYER.tab,
        ...collectNumbers(contentRoots(), /^(sprite|spriteId|spriteIds)$/),
        ...scanSource("sprite"),
    ]);
    return [...ids].sort((a, b) => a - b);
}

// The first depth of each zone: a rift's land goes by its zone alone, not how deep it is
function zoneDepths(): number[] {
    return ZONES.map((_, i) => i + 1);
}

function getUnits(seeds: number[]): Unit[] {
    const monsterDefs = new Map([...allMonsterDefs(), ...Object.values(BOSSES)].map((def) => [def.id, def]));
    // Everything on the ground: every item, a stack of coins as each of its models
    const ground = itemObjIds().map((objId): BakeRequest => ({ kind: "obj", key: `item:${objId}`, objId, count: 1 }));
    const coins = [5, 25, 100, 250, 1000, 10000].map((count): BakeRequest => ({ kind: "obj", key: `coins:${count}`, objId: COINS, count }));
    const bakes: [string, BakeRequest[]][] = [
        ["common", commonRequests()],
        ["monsters", [...monsterDefs.values()].map(monsterRequest)],
        ["hero", heroRequests()],
        ["ground", [...ground, ...coins]],
    ];
    return [
        { kind: "city" },
        { kind: "palette" },
        ...zoneDepths().flatMap((depth) => seeds.map((seed): Unit => ({ kind: "rift", depth, seed }))),
        // The pinnacles' lands, each a zone of its own
        ...PINNACLE_IDS.flatMap((pinnacle) => seeds.map((seed): Unit => ({ kind: "rift", depth: 17, seed, pinnacle }))),
        ...bakes.flatMap(([name, requests]) => batches(requests, BAKE_BATCH).map((batch): Unit => ({ kind: "bake", name, requests: batch }))),
        { kind: "textures" },
        { kind: "sounds", ids: [...new Set(allSounds().filter((id) => id >= 0))] },
        { kind: "sprites", ids: spriteIds() },
        ...batches(itemObjIds(), ICON_BATCH).map((objIds): Unit => ({ kind: "icons", objIds })),
    ];
}

// ---- Loading it, noting what's read ----

let reading: Set<string> | undefined;
const readGroup = MemoryStore.prototype.read;
MemoryStore.prototype.read = function (indexId: number, archiveId: number): Int8Array {
    reading?.add(`${indexId}:${archiveId}`);
    return readGroup.call(this, indexId, archiveId);
};

// The map loader logs every square
async function quietly<T>(load: () => Promise<T>): Promise<T> {
    const { log, time, timeEnd } = console;
    console.log = console.time = console.timeEnd = () => {};
    try {
        return await load();
    } finally {
        Object.assign(console, { log, time, timeEnd });
    }
}

class SlimLoader {
    private readonly state: WorkerState;
    private readonly bakeLoader = new ActorBakeLoader();
    private readonly mapLoader = new SdMapDataLoader();

    constructor(cache: LoadedCache) {
        this.state = createWorkerState(cache, [], [], undefined as unknown as Cache);
    }

    private async load<I, D>(loader: RenderDataLoader<I, D>, input: I): Promise<void> {
        loader.init();
        await loader.load(this.state, input);
        clearWorkerStateCaches(this.state);
    }

    async run(unit: Unit): Promise<void> {
        switch (unit.kind) {
            case "city":
            case "palette":
            case "rift":
                return this.loadMap(unit);
            case "bake":
                return this.load(this.bakeLoader, { requests: unit.requests, loadedTextureIds: new Set<number>() });
            case "textures":
                // The renderer's texture array
                for (const id of getSdTextureIds(this.state.textureLoader)) {
                    this.state.textureLoader.getPixelsArgb(id, 128, true, 1.0);
                }
                return;
            case "sounds":
                return this.load(new SoundLoader(), { ids: unit.ids });
            case "sprites":
                return this.load(new SpriteDataLoader(), { spriteIds: unit.ids, frames: unit.ids.map(() => 0) });
            case "icons":
                // Stackables like coins have a model per stack size
                return this.load(new ItemIconLoader(), {
                    requests: unit.objIds.flatMap((objId) => {
                        const counts = this.state.objTypeLoader.load(objId).countCo ?? [];
                        return [1, ...counts.filter((count) => count > 1)].map((count) => ({ objId, count }));
                    }),
                });
        }
    }

    // A map built as the game builds it, from this cache (prefabs are read from its map squares),
    // then its arena's collision and every square round it drawn
    private async loadMap(unit: Extract<Unit, { kind: "city" | "palette" | "rift" }>): Promise<void> {
        const { mapFileLoader, locTypeLoader } = this.state.sceneBuilder;
        const context = createBuildContext(mapFileLoader, locTypeLoader);
        let squares: CustomMapSquares;
        let area: Area;
        if (unit.kind === "city") {
            ({ squares, ...area } = generateCity(context));
        } else if (unit.kind === "rift") {
            ({ squares, ...area } = generateRift(unit.depth, unit.seed, context, unit.pinnacle));
        } else {
            squares = buildRecipeSquares(PALETTE_RECIPE, context);
            const size = PALETTE_RECIPE.squaresX * Scene.MAP_SQUARE_SIZE;
            area = { baseX: PALETTE_RECIPE.mapX * Scene.MAP_SQUARE_SIZE, baseY: PALETTE_RECIPE.mapY * Scene.MAP_SQUARE_SIZE, sizeX: size, sizeY: size };
        }
        addCustomMapSquares(mapFileLoader, squares, []);
        const region: RegionDataInput = { baseX: area.baseX, baseY: area.baseY, sizeX: area.sizeX, sizeY: area.sizeY, plane: 0 };
        await this.load(new RegionDataLoader(), region);
        const firstX = Math.floor(area.baseX / Scene.MAP_SQUARE_SIZE) - MAP_MARGIN;
        const firstY = Math.floor(area.baseY / Scene.MAP_SQUARE_SIZE) - MAP_MARGIN;
        const lastX = Math.ceil((area.baseX + area.sizeX) / Scene.MAP_SQUARE_SIZE) - 1 + MAP_MARGIN;
        const lastY = Math.ceil((area.baseY + area.sizeY) / Scene.MAP_SQUARE_SIZE) - 1 + MAP_MARGIN;
        for (let mapX = firstX; mapX <= lastX; mapX++) {
            for (let mapY = firstY; mapY <= lastY; mapY++) {
                // GameWebGLRenderer's settings, with Riftscaper's smooth terrain (App.tsx)
                await quietly(() =>
                    this.load(this.mapLoader, {
                        mapX,
                        mapY,
                        minLevel: 0,
                        maxLevel: 0,
                        loadObjs: false,
                        loadNpcs: false,
                        smoothTerrain: true,
                        minimizeDrawCalls: false,
                        skipMinimap: true,
                        loadedTextureIds: new Set<number>(),
                    }),
                );
            }
        }
        // The next map's squares are its own
        addCustomMapSquares(mapFileLoader, new Map(), [...squares.keys()]);
    }
}

// Every group the units read, the type loaders' whole archives included
async function loadAll(label: string, cache: LoadedCache, units: Unit[]): Promise<Set<string>> {
    const started = performance.now();
    const reads = new Set<string>();
    reading = reads;
    try {
        const loader = new SlimLoader(cache);
        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            try {
                await loader.run(unit);
            } catch (e) {
                throw new Error(`${describe(unit)} failed`, { cause: e });
            }
            if ((i + 1) % 20 === 0 || i === units.length - 1) {
                console.log(`  ${i + 1} / ${units.length} (${describe(unit)})`);
            }
        }
    } finally {
        reading = undefined;
    }
    const seconds = ((performance.now() - started) / 1000).toFixed(0);
    console.log(`${label}: ${units.length} units, ${reads.size} groups, in ${seconds}s`);
    return reads;
}

// ---- The full cache, and the slim one made from it ----

function parseKey(key: string): [number, number] {
    const [indexId, archiveId] = key.split(":").map(Number);
    return [indexId, archiveId];
}

// A group's stored size, from its index file entry: 0 for one the cache hasn't got
function getGroupSize(files: CacheFiles, indexId: number, archiveId: number): number {
    const indexFile = files.files.get(CacheFiles.INDEX_FILE_PREFIX + indexId);
    const ptr = archiveId * SectorCluster.SIZE;
    if (!indexFile || ptr + SectorCluster.SIZE > indexFile.byteLength) {
        return 0;
    }
    const entry = new Uint8Array(indexFile, ptr, 3);
    return (entry[0] << 16) | (entry[1] << 8) | entry[2];
}

// How many archive ids each index file has room for: the slim cache keeps the lengths, so a group
// it left out reads as missing, not out of range
function getIndexSizes(full: CacheFiles): number[] {
    const indexCount = full.files.get(CacheFiles.META_FILE_NAME)!.byteLength / SectorCluster.SIZE;
    return Array.from({ length: indexCount }, (_, indexId) => {
        const indexFile = full.files.get(CacheFiles.INDEX_FILE_PREFIX + indexId);
        return indexFile ? indexFile.byteLength / SectorCluster.SIZE : 0;
    });
}

function formatMb(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

type SlimCache = { info: CacheInfo; files: string[]; chunks: Uint8Array[]; keys: Set<string> };

async function makeSlimCache(full: LoadedCache, reads: Set<string>): Promise<SlimCache> {
    const keys = new Set(reads);
    // The reference tables, for every index there is
    const indexCount = full.files.files.get(CacheFiles.META_FILE_NAME)!.byteLength / SectorCluster.SIZE;
    for (let indexId = 0; indexId < indexCount; indexId++) {
        if (getGroupSize(full.files, CacheIndex.META_INDEX_ID, indexId) > 0) {
            keys.add(`${CacheIndex.META_INDEX_ID}:${indexId}`);
        }
    }
    const sorted = [...keys].map(parseKey).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const store = MemoryStore.fromFiles(full.files);
    const groups: CacheGroup[] = [];
    const absent: string[] = [];
    for (const [indexId, archiveId] of sorted) {
        if (getGroupSize(full.files, indexId, archiveId) === 0) {
            absent.push(`${indexId}:${archiveId}`);
            continue;
        }
        const data = readGroup.call(store, indexId, archiveId);
        groups.push({ indexId, archiveId, data: new Uint8Array(data.buffer, data.byteOffset, data.length) });
    }
    if (absent.length > 0) {
        // The loaders went on without them (map squares nobody made, mostly)
        console.log(`${absent.length} groups asked for aren't in ${GAME_CACHE_NAME}, and aren't needed`);
    }
    const chunks = packChunks(groups);
    const files = await Promise.all(chunks.map(getChunkFileName));
    const indexSizes = getIndexSizes(full.files);
    const xteas: Record<string, number[]> = JSON.parse(fs.readFileSync(FULL_DIR + "keys.json", "utf8"));
    // Named after what's in it, so it's the same wherever it's made
    const hash = createHash("sha256").update(JSON.stringify({ files, indexSizes, xteas })).digest("hex");
    const info: CacheInfo = {
        ...full.info,
        name: `${GAME_CACHE_NAME}-slim-${hash.slice(0, 8)}`,
        size: chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
        slimOf: GAME_CACHE_NAME,
        indexSizes,
        xteas,
        chunks: files.map((file, i) => ({ file, size: chunks[i].byteLength })),
    };
    return { info, files, chunks, keys: new Set(groups.map((g) => `${g.indexId}:${g.archiveId}`)) };
}

// Writes the chunks and reads them back: they're what players download. Every group has to come
// out of them as it went in.
async function writeChunks(full: LoadedCache, slim: SlimCache): Promise<Uint8Array[]> {
    fs.mkdirSync(chunkDir, { recursive: true });
    slim.files.forEach((file, i) => fs.writeFileSync(chunkDir + file, slim.chunks[i]));
    const written = slim.files.map((file) => new Uint8Array(fs.readFileSync(chunkDir + file)));
    for (let i = 0; i < slim.files.length; i++) {
        if (!(await isChunk(slim.files[i], written[i]))) {
            throw new Error(`${chunkDir}${slim.files[i]} isn't what was written`);
        }
    }
    const fromChunks = MemoryStore.fromFiles(assembleChunkedCache(slim.info, written, false).files);
    const fromFull = MemoryStore.fromFiles(full.files);
    for (const [indexId, archiveId] of [...slim.keys].map(parseKey)) {
        const expected = readGroup.call(fromFull, indexId, archiveId);
        const actual = readGroup.call(fromChunks, indexId, archiveId);
        if (Buffer.compare(Buffer.from(expected), Buffer.from(actual)) !== 0) {
            throw new Error(`Group ${indexId}:${archiveId} was written wrong`);
        }
    }
    return written;
}

// Takes out the chunks caches.json won't list, then writes it
function publish(slim: SlimCache): void {
    const keep = new Set(slim.files);
    for (const file of fs.readdirSync(chunkDir)) {
        if (!keep.has(file)) {
            fs.rmSync(chunkDir + file);
        }
    }
    fs.writeFileSync(outDir + "caches.json", JSON.stringify([slim.info]), "utf8");
}

async function main(): Promise<void> {
    const started = performance.now();
    await Hasher.init();
    await Promise.all([Bzip2.initWasm(), Gzip.initWasm()]);
    if (!fs.existsSync(path.join(outDir, ".."))) {
        throw new Error(`No ${path.join(outDir, "..")}: run bun run build:riftscaper first`);
    }
    const full = loadGameCache();
    const seeds = Array.from({ length: SEEDS }, (_, i) => 1000 + i);
    console.log(`Loading what Riftscaper loads from ${GAME_CACHE_NAME}...`);
    const reads = await loadAll("Loaded it", full, getUnits(seeds));
    const slim = await makeSlimCache(full, reads);
    const written = await writeChunks(full, slim);
    if (CHECK) {
        // Everything again, with rifts the first pass never made: what any seed asks for has to
        // be in the palette
        console.log(`Checking ${slim.info.name}, with other rifts...`);
        const checkSeeds = Array.from({ length: SEEDS }, (_, i) => 5000 + i * 7919);
        const again = await loadAll("Loaded it from the slim cache", assembleChunkedCache(slim.info, written, false), getUnits(checkSeeds));
        const missing = [...again].filter((key) => !slim.keys.has(key) && getGroupSize(full.files, ...parseKey(key)) > 0);
        if (missing.length > 0) {
            throw new Error(`Missing from the slim cache: ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? ", ..." : ""}`);
        }
    } else {
        console.warn("SLIM_CHECK=0: not loaded again from the slim cache");
    }
    publish(slim);
    const seconds = ((performance.now() - started) / 1000).toFixed(0);
    console.log(`Wrote ${outDir}caches.json: ${slim.info.name}, ${slim.files.length} chunks (${formatMb(slim.info.size)} of ${formatMb(full.info.size)}), in ${seconds}s`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
