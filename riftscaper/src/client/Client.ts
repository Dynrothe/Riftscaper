// The game on the engine's renderer (GameFrameHandler): builds the city once and each rift's land
// with ScapeRune's generator, and puts whichever the hero's in in the world; ticks it, follows the
// hero with the camera, draws everyone and everything flying, lights the dark, and puts what's over
// the world on the overlay (bars, hitsplats, the loot's labels, what people say, warnings of what's
// about to land, the minimap). The mouse and keys become the hero's orders. The city's shops and
// the Archmage's rifts are run from here; what the screens show goes through the Store.
//
// The title is over the city too, before the Archmage's portal (TitleStage.ts): the heroes kept,
// and making a new one, its class from the line and then how it looks.
//
// The way round: the hero starts in the city; the Archmage opens a rift and its portal; through it,
// a rift made for its depth. Home again by the waystone at the camp or the teleport (T), which
// leave the rift open to go back to; by dying, which closes it; or by the portal past its
// guardian, which closes it and lets the Archmage open one a depth deeper.
import { mat4, vec4 } from "gl-matrix";

import { GameAudio, PlayOptions } from "../../../engine/audio/GameAudio";
import { yawFromVector } from "../../../engine/controller/CharacterMovement";
import { GameInput } from "../../../engine/input/GameInput";
import type { PadBindings } from "../../../engine/input/GamePad";
import type { Camera } from "../../../engine/mapviewer/Camera";
import type { MapViewer } from "../../../engine/mapviewer/MapViewer";
import type { ActorDrawOptions, ActorModel, ActorRenderer } from "../../../engine/mapviewer/webgl/actor/ActorRenderer";
import type { RegionData, RegionDataInput } from "../../../engine/mapviewer/worker/RegionData";
import { RegionDataLoader } from "../../../engine/mapviewer/worker/RegionDataLoader";
import { Rng } from "../../../engine/core/Rng";
import { NPC_IDLE_SEQ, NPC_WALK_SEQ } from "../../../engine/mapviewer/webgl/actor/ActorBakeTypes";
import { CameraRig, getGroundReach } from "../../../engine/render/CameraRig";
import { DrawnLights } from "../../../engine/render/DrawnLights";
import type { CameraReach, GameFrameHandler, GameWebGLRenderer } from "../../../engine/render/GameWebGLRenderer";
import { HitsplatImages, HitsplatKind } from "../../../engine/render/Hitsplats";
import { LightBudget, MAX_SHOWN_LIGHTS, lightKey } from "../../../engine/render/LightBudget";
import type { LightLook } from "../../../engine/render/LightLook";
import { Overlay, ScreenPoint } from "../../../engine/render/Overlay";
import type { BuildContext } from "../../../engine/scaperune/recipe";
import { createBuildContext } from "../../../engine/scaperune/squares";
import { isCoarsePointer, pixelRatio } from "../../../engine/util/DeviceUtil";
import { ArenaGrid } from "../../../engine/world/ArenaGrid";
import { isCircleFree } from "../../../engine/world/Collision";
import { SKILL_KEYS, SKILL_SLOTS } from "../content/classes";
import { ControlId, SKILL_CONTROLS, bindKey, controlLabel, controlOf, defaultBindings } from "./controls";
import { FORGED_COLOR, traitLines } from "../content/forge";
import { GEMS, GEM_DAMAGE_PER_LEVEL, GEM_MANA_PER_LEVEL, MANA_COST_MULT, MAX_GEM_LEVEL, SkillIcon, TAG_NAMES } from "../content/gems";
import { CLASS_LOOKS, NAME_FIRST, NAME_LAST, NAME_MAX, nameProblem, randomLook, readLook } from "../content/looks";
import { KEYSTONES } from "../content/passives";
import { BASES, ClassId, MAX_CAPE_LEVEL, MAX_CAPE_PRICE, RARITY_COLOR, RUNEWORD_COLOR, SEQ, SETS, SET_COLOR, SET_PRICES, SLOTS, SLOT_NAMES, STAT_TEXT, Slot, StatKey, StatLine, UNIQUE_BY_ID } from "../content/items";
import { RUNEWORDS } from "../content/runewords";
import { CIRCLE_TEXT, CircleRecipe, MAKES, UPGRADES } from "../content/circle";
import { ELEMENTS, HERO, HIT_SHARE, LADDER_DEPTH, MAX_LEVEL, RESIST, TICKS_PER_SECOND, TICK_MS, areaLevel, resistPenalty, resistance, seconds, xpToNext } from "../content/rules";
import { ANIM_HIT, animTick } from "../content/anims";
import { BOSSES, MONSTERS } from "../content/monsters";
import { CHEST, HOARD, SHRINES } from "../content/features";
import { BARROWS, BREACH, ENCOUNTERS, FIGHT_CAVES, GOD_WARS, PEST_CONTROL, RIFT_GUARDIANS } from "../content/encounters";
import { COLOSSEUM, GLORIES, GloryId } from "../content/colosseum";
import { PRAYER, PRAYERS, PrayerId } from "../content/prayers";
import { HEART, HEART_SHARDS, SHARD_IDS } from "../content/riftstones";
import { RUNES, RUNE_IDS, RuneId, SHOP_RUNES, runeName, runePrice, runeShines } from "../content/runes";
import { GOODS, GOOD_IDS, GoodId, goodName } from "../content/goods";
import { BELT_PLACE_NAMES, ELIXIRS, ELIXIR_IDS, ELIXIR_SECONDS, ELIXIR_XP, ElixirId, INSTILS, INSTIL_NAMES, INSTIL_TEXT, Instil, instilCost } from "../content/potions";
import { RIFT_MODS, RIFT_OFFERS, RiftModId } from "../content/riftMods";
import { ARCHMAGE, BANKER, CITY_LIGHT, CITY_NAME, FOLK, FolkId, GUARD_LINES, SHOPS, ShopId, WIZARD_LINES } from "../content/town";
import { HIRELING, HIRELINGS, HIRELING_KINDS, HIRELING_SLOTS, HirelingKind, HirelingSlot } from "../content/hirelings";
import { dismissHireling, giveHireling, hire, hireCost, hirelingDps, hirelingStats, raiseCost, raiseHireling, takeFromHireling } from "../sim/hirelings";
import { GIVERS, TASK_LINES } from "../content/tasks";
import { QUESTS, QUEST_IDS, QUEST_LINES, QuestDef, QuestId } from "../content/quests";
import { questOffers, questState } from "../sim/quests";
import { heroWeb, nextLanes, onWeb, webCleared, webNode } from "../sim/web";
import { BOUNTIES, BountyId, WEB } from "../content/web";
import { HOME_TELEPORT_SPOT, LEVEL_UP_SPOT, SOUND, TELEPORT_SPOT, Visual } from "../content/visuals";
import { DAY, DAY_GLOW, DUSK, ZONES, bossOf } from "../content/zones";
import { LANDS } from "../content/ladder";
import { AWAKENED, PINNACLES, PINNACLE_IDS, PinnacleId, awakenable } from "../content/pinnacles";
import { INVOCATIONS, INVOCATION_IDS, InvocationId, TOMBS, raidLevel } from "../content/tombs";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, HILTS, TIER_NAMES, TIER_POINTS } from "../content/achievements";
import { PETS, PET_BY_ID, PET_FOLLOW } from "../content/pets";
import { achievementPoints, hasHilt, logPages, totalPoints } from "../sim/log";
import { ORRERY, ORRERY_ARMS, ORRERY_NODES, orreryText } from "../content/orrery";
import { favourHost, orreryLevers, orreryPoints, orreryRefund, refundNode, refundWhyNot, sphereName, takeNode, takeWhyNot } from "../sim/orrery";
import { HOSTS, HOST_IDS } from "../content/ladder";
import { awakenedWhyNot, pinnacleHave, pinnacleKeyText, pinnacleNeed, pinnacleWhyNot, spendOrb, spendPinnacleKey } from "../sim/pinnacles";
import { AILMENT_ICON } from "../content/monsterMods";
import { ladderRift, onLadder, riftHost, riftName, riftZone } from "../sim/ladder";
import { Drop, Feature, Game, GameEvent, GameInput as SimInput, MOD_NAMES, Monster, Person, noInput } from "../sim/Game";
import { hasAllShards, isRiftKey, isRiftstone, isShard, shardsHeld, takeShards } from "../sim/riftstones";
import {
    BASIC,
    SOCKET_WORK,
    SocketWork,
    autoSocket,
    bindSkill,
    classLock,
    findWornGem,
    gemDef,
    gemRequirement,
    gemXpToNext,
    socketGem,
    socketWorkCost,
    supports,
    unsocketGem,
} from "../sim/gems";
import { Hero, cityLevel, equipFrom, freeSlot as packSlot, fromBelt, fromStash, identify, newHero, prayerWhyNot, setsWorn, toBelt, toStash, unequip, whyNotEquip } from "../sim/hero";
import { inscribe, runesShort, runewordWhyNot } from "../sim/runewords";
import {
    buyMaxCape,
    chickenKnown,
    chickenWhyNot,
    eliteOf,
    eliteWhyNot,
    layChicken,
    makeKnown,
    makeTakes,
    makeWhyNot,
    maxCapeWhyNot,
    nextHerb,
    nextRune,
    rejuvWhyNot,
    riftstoneDepths,
    transmuteElite,
    transmuteHerb,
    transmuteMake,
    transmuteRejuv,
    transmuteRiftstones,
    transmuteRune,
    transmuteUpgrade,
    upgradeTakes,
    upgradeWhyNot,
} from "../sim/circle";
import {
    BELT_SIZE,
    beltErrand,
    beltOpen,
    beltPlaces,
    beltShutText,
    brewUp,
    brewUpCost,
    dosesLeft,
    drinkElixir,
    goodsOf,
    instil,
    instilWhyNot,
    isErrandGood,
    mostDoses,
    potionDef,
    stitchBelt,
    stitchWhyNot,
} from "../sim/potions";
import { Task, giveUpTask, rollTaskOffers, takeTask, taskDone, taskObjective, taskWhere, whyNotTake } from "../sim/tasks";
import { Item, gambleCost, itemInfo, runewordPowers, sellValue, statLines, statText } from "../sim/loot";
import { RuneTarget, buyRune, runeWhyNot, targetItem } from "../sim/runes";
import { riftReward, rollRiftOffers } from "../sim/riftMods";
import { allocate, freeReset, omniOf, passivePoints, passiveStats, pointsLeft, refund, refundCost, resetCost, resetTree } from "../sim/passives";
import { isTalisman, socketTalisman, talismanWhy, unsocketTalisman } from "../sim/talismans";
import { enchantItem } from "../sim/enchant";
import { ResolvedSkill, resolveSkill, skillChoices, skillDescription, skillLines, supportLines } from "../sim/skills";
import { Stock, buySetPiece, buyTalisman, buyWare, eliteGambleLevel, rollStock, stallUpgrade, stallUpgradeWhyNot } from "../sim/town";
import { City, generateCity } from "../world/cityGen";
import { LAYOUT_KINDS } from "../world/riftLayout";
import { Rift, RiftShape, generateRift } from "../world/zoneGen";
import { Assets, COINS_OBJ, allSounds } from "./Assets";
import {
    AUDIO_SETTINGS_KEY,
    MAX_HEROES,
    Settings,
    deleteHero,
    freeSlot,
    heroCount,
    listHeroes,
    loadHero,
    loadSettings,
    saveHero,
    saveSettings,
    setLastHero,
    summarise as heroSummary,
} from "./settings";
import type {
    ApothecaryView,
    ArchmageView,
    BeltSlot,
    CaptainView,
    Creation,
    GemView,
    GloryView,
    GoodView,
    HeroCard,
    HirelingView,
    Hover,
    Hud,
    ItemView,
    JewellerView,
    Pack,
    Panel,
    RiftModView,
    RiftRewardView,
    RuneView,
    ShopView,
    SkillChoice,
    SkillRow,
    Store,
    QuestLogView,
    OrreryView,
    TaskDialogView,
    TaskView,
    TreeView,
} from "./Store";
import { rewardText } from "./Store";
import { StageDrawing, TitleStage } from "./TitleStage";
import { uiScale } from "./uiScale";
import { Juice } from "./Juice";

// The camera: from the south, looking down on the hero as the game's camera does
const PITCH = -400;
const START_DISTANCE = 19;
const MIN_DISTANCE = 12;
const MAX_DISTANCE = 30;
const CAMERA_REACH: CameraReach = { behind: getGroundReach(PITCH, MAX_DISTANCE), around: 24 };
// How far over the ground the middle of the screen is, in tiles, while playing
const PLAY_LIFT = 0.8;
// Ticks a thrall takes to rise from the ground, and to sink back into it
const RISE_TICKS = 22;
// The record's toasts: the collection log's own gold
const LOG_COLOR = "#ff981f";
// The orrery's box for the mouse, in tiles: it stands three a side, its rings head high
const ORRERY_BOX = { radius: 1.4, tall: 2.4 };

// Every rift is shaped to a plan (world/riftLayout.ts), its kind the biome and seed's. In
// development, ?rifts= one of the plans' kinds (trail, loop, arms, isles, field) makes every rift
// that kind, and ?rifts=open makes them open land, as rifts were first made
const RIFT_SHAPE: RiftShape = riftShapeAsked();

function riftShapeAsked(): RiftShape {
    if (!import.meta.env.DEV || typeof window === "undefined") {
        return "planned";
    }
    const asked = new URLSearchParams(window.location.search).get("rifts") ?? "";
    return asked === "open" || (LAYOUT_KINDS as string[]).includes(asked) ? (asked as RiftShape) : "planned";
}

const MAX_TICKS_PER_FRAME = 8;
const HUD_MS = 100;
const SAVE_MS = 30_000;
const SPLAT_MS = 900;
const FLOAT_MS = 1400;
// Projectiles fly this high over the ground (tiles)
const SHOT_LIFT = 1.0;
// How far the hero sees on the minimap, in tiles
const REVEAL = 15;
const MINIMAP_SIZE = 168;
// The overlay map (Tab), as Diablo's and Path of Exile's: the outlines of what's been seen, laid
// over the world round the hero at this share of its size on screen, each tile this many pixels
// in its picture, and rebuilt at most this often as more is seen
const BIG_MAP_ZOOM = 0.32;
const BIG_MAP_TILE = 4;
const BIG_MAP_MS = 200;
// Blocked ground in a clump smaller than this many tiles (a tree, a rock, a stall) isn't outlined
// on it: it's the lie of the land the map shows, not every bush
const BIG_MAP_CLUMP = 10;
// What the mouse can be over: a box round each model on screen, from its own size (this share of
// its widest, as a model's widest is its arms out or its tail) and this many pixels more all
// round, so the camera's steep look doesn't leave only a sliver of someone to click
const HIT_RADIUS_SHARE = 0.8;
const HIT_MIN_RADIUS = 0.35;
const HIT_PAD = 5;
const MARKER_MS = 380;
// A left press this soon after the keys last walked the hero is still the keys' (used in place):
// kiting is tapping a key between shots
const KEYS_GRACE_MS = 600;

// The way a shrine's altar is turned: all four God Wars altars face south as the cache has them,
// to the camera looking north (looked at in the game)
const SHRINE_YAW = 0;

const LIGHT_HERO = 1;
const LIGHT_SHOT = 2;
const LIGHT_FIRE = 3;
const LIGHT_PORTAL = 4;
const LIGHT_SPOT = 5;
const LIGHT_WAYSTONE = 6;
const LIGHT_TORCH = 7;
const LIGHT_RUNE = 8;
const LIGHT_SHARD = 9;
const LIGHT_FEATURE = 10;
const LIGHT_DROP = 11;

// The pillar of light over a drop worth turning round for (dropGlory): how tall in tiles, how wide
// in pixels, and how long it takes to rise as the drop lands, in ticks
const PILLAR = { height: 6, width: 16, rise: 20 };

// The waystone: the portal's model, small and blue
const WAYSTONE_SCALE = 0.55;
const WAYSTONE_TINT = 0x80b0ff;
// How long a line said stays over someone's head
const SAY_MS = 4500;

// What one of the folk with a task is, under their name
const TASK_HOVER = { offer: "Has a task for you", held: "You're doing a task for them", done: "Your task's done: they'll pay you" };

const PERSON_COLOR: Record<Person["kind"], string> = { shop: "#ffff00", archmage: "#d0a0ff", banker: "#ffff00", wizard: "#80c0ff", guard: "#e8e8e8", folk: "#e8e8e8", ally: "#80e0c0", captain: "#ffff00" };

const HERO_LIGHT: LightLook = { radius: 9, color: 0xffe2b8, intensity: 0.9 };
const FIRE_LIGHT: LightLook = { radius: 8, color: 0xffa040, intensity: 1.1, flicker: 0.3 };
const PORTAL_LIGHT: LightLook = { radius: 7, color: 0xb070ff, intensity: 1.0, pulse: { amount: 0.3, seconds: 2 } };
const SEALED_LIGHT: LightLook = { radius: 4, color: 0x6050a0, intensity: 0.5 };
const WAYSTONE_LIGHT: LightLook = { radius: 5, color: 0x80b0ff, intensity: 0.9, pulse: { amount: 0.25, seconds: 3 } };
const TORCH_LIGHT: LightLook = { radius: 6, color: 0xffa040, intensity: 1.0, flicker: 0.3 };
// The fallen stones' runes, burning red, and the fall's shards of essence, a cold blue
const RUNE_LIGHT: LightLook = { radius: 3.5, color: 0xff6070, intensity: 0.8, pulse: { amount: 0.35, seconds: 3 } };
const SHARD_LIGHT: LightLook = { radius: 2.5, color: 0x70a0ff, intensity: 0.7, pulse: { amount: 0.3, seconds: 4 } };
const SHOT_LIGHT: LightLook = { radius: 3.5, color: 0xff8a40, intensity: 0.9 };
const ICE_LIGHT: LightLook = { radius: 4, color: 0x80c0ff, intensity: 0.9 };

const RANK_COLOR: Record<Monster["rank"], string> = { normal: "#e8e8e8", magic: "#8a8aff", rare: "#ffff77", boss: "#ff9a40" };

// A controller's buttons come in as keys (GamePad): these are set to the keys the pack and the
// flasks are on whenever the controls change (Client.applyKeys)
export const PAD_BINDINGS: PadBindings = {
    run: { start: "Escape", north: "KeyI", west: "Digit1", east: "Digit2" },
    menu: { east: "Escape" },
    menuStart: "Enter",
    modal: ".ui-modal",
    main: ".ui-main",
};

type Effect = { model: ActorModel; x: number; y: number; lift: number; start: number; ms: number };
type Splat = { uid: number; hero: boolean; x: number; y: number; amount: number; kind: HitsplatKind; crit: boolean; start: number; slot: number };
type Float = { text: string; color: string; x: number; y: number; start: number };
// Lightning between points on the ground, drawn over the world a moment
type Beam = { points: { x: number; y: number }[]; start: number; seed: number };
const BEAM_MS = 260;
type Label = { drop: Drop; x: number; y: number; w: number; h: number };
type Said = { uid: number; text: string; until: number };
// The arena on screen, the city's or a rift's, in world tiles
type Area = { baseX: number; baseY: number; sizeX: number; sizeY: number; spawn: { x: number; y: number } };
// What's been seen of an area, for the minimap, and which of it is open ground. The overlay map
// (Tab) is its outlines drawn finer, rebuilt from it when it's changed (version against outlined).
type MiniMap = {
    explored: Uint8Array;
    open: Uint8Array;
    canvas: HTMLCanvasElement;
    data: ImageData;
    lastReveal: { x: number; y: number };
    version: number;
    outline?: { canvas: HTMLCanvasElement; version: number; at: number };
};
// The rift the Archmage opened, with the modifiers he wove into it: made when it's first stepped
// into, and kept, with its game, while the hero's away in the city
// A version of a rift the Archmage offers: on the web, a place on it and its bounty (content/web.ts)
type RiftOffer = { seed: number; mods: RiftModId[]; lane?: number; bounty?: BountyId };

type OpenRift = { depth: number; seed: number; mods: RiftModId[]; pinnacle?: PinnacleId; awakened?: boolean; invocations?: InvocationId[]; lane?: number; bounty?: BountyId; shape?: RiftShape; rift?: Rift; grid?: ArenaGrid; game?: Game; map?: MiniMap };

export class Client implements GameFrameHandler {
    static async create(mapViewer: MapViewer, renderer: GameWebGLRenderer, overlayCanvas: HTMLCanvasElement, store: Store): Promise<Client> {
        renderer.setPlane(0);
        const workerPool = mapViewer.workerPool;
        const actors = await renderer.getActorRenderer();
        renderer.setLighting(true);
        const audio = new GameAudio(AUDIO_SETTINGS_KEY);
        const sounds = audio.load(workerPool, allSounds());
        store.set({ loadingText: "Gathering spells and arrows", loadingProgress: 25 });
        const assets = new Assets(workerPool, renderer, actors);
        await assets.loadCommon((share) => store.set({ loadingProgress: Math.round(25 + share * 40) }));
        await sounds;
        const context = createBuildContext(mapViewer.mapFileLoader, mapViewer.locTypeLoader);
        const client = new Client(mapViewer, renderer, assets, audio, overlayCanvas, store, context);
        store.set({ loadingText: `Raising ${CITY_NAME}`, loadingProgress: 70 });
        await client.showCity();
        client.refreshHeroes();
        store.set({ loadingProgress: 100, screen: "title" });
        return client;
    }

    readonly input: GameInput;
    readonly cameraRig = new CameraRig();
    settings: Settings = loadSettings();
    hero?: Hero;
    // The key the hero playing is saved under (settings.ts)
    private slot?: string;
    // The title's stage, before the portal, once the city's built
    private stage?: TitleStage;
    private stageDrawing?: StageDrawing;
    // Each class's first gear, for showing a new hero in it
    private readonly starterGear = new Map<ClassId, Hero["equipment"]>();
    game?: Game;
    // Where the hero is, and its collision
    place: "city" | "rift" = "city";
    grid?: ArenaGrid;
    city?: City;
    // The rift the Archmage's portal leads to, while one's open
    open?: OpenRift;
    private cityGrid?: ArenaGrid;
    private cityMap?: MiniMap;
    private area?: Area;
    // What's on the shops' shelves, rolled again every time the hero comes home
    private stock?: Stock;
    private shopId?: ShopId;
    private chosenDepth = 1;
    // The versions of each depth's rift the Archmage offers, rolled when first asked for and kept
    // till he opens one
    // The Archmage's versions of each depth's rift: its seed (on the ladder, its land, host and
    // guardian) and its modifiers
    private offers = new Map<number, RiftOffer[]>();
    // When the Archmage last cast (performance.now)
    private archmageCast = -99999;
    private said: Said[] = [];
    // The folk with a task to offer, rolled again every time the hero comes home, and the one whose
    // task panel is open
    private taskOffers = new Map<FolkId, Task>();
    private taskGiver?: FolkId;

    private readonly overlay: Overlay;
    private readonly hitsplatImages = new HitsplatImages();
    private readonly lights = new DrawnLights(new LightBudget(MAX_SHOWN_LIGHTS));
    private camera?: Camera;
    private accumulator = 0;
    private lastHud = 0;
    private lastSave = 0;
    private packVersion = 0;
    private shownPackVersion = -1;
    private effects: Effect[] = [];
    private splats: Splat[] = [];
    private floats: Float[] = [];
    private beams: Beam[] = [];
    private labels: Label[] = [];
    private making?: Promise<void>;
    private titleTime = 0;
    private focusX = 0;
    private focusY = 0;
    private targetDistance = START_DISTANCE;
    private targetPitch = PITCH;
    private lift = PLAY_LIFT;
    // The mouse: where it is, whether it's over the world rather than a screen, and whether it's
    // been anywhere yet
    private pointer = { x: 0, y: 0, inside: false, seen: false };
    private aim?: { x: number; y: number };
    // The left button, held: what it was pressed on decides what it does till it's let go, as in
    // the genre. On a monster it fights that one, then whichever's under the mouse when it falls
    // (walking towards the mouse while nothing is); on open ground it walks, and fights the
    // first monster it's swept over (buildInput).
    private leftDown = false;
    private rightDown = false;
    private leftTarget = -1;
    private leftWalk = false;
    // A press made while the keys walk the hero, or just after, or one they walked during: it's
    // used where the hero is till it's let go, as with Shift, so letting go of a key while kiting
    // never turns it into a walk up to the monster (Path of Exile's WASD mode). keysAt is when
    // the keys last walked the hero.
    private leftInPlace = false;
    private keysAt = -Infinity;
    // A click is seen by at least one tick, however quick it was
    private clickTarget = -1;
    private clickWalk = false;
    // And so is a tap of a skill's button or key
    private skillTaps: boolean[] = new Array(SKILL_SLOTS).fill(false);
    private hoverMonster = -1;
    private hoverDrop = -1;
    private hoverPerson = -1;
    // A chest, a hoard or a shrine (content/features.ts), by uid
    private hoverFeature = -1;
    // The rift just cleared was a pinnacle, for the toast home
    private pinnacleCleared?: PinnacleId;
    private hoverWaystone = false;
    private hoverPortal = false;
    private hoverOrrery = false;
    private hoverKey = "";
    // Where the ground was last clicked to walk to, shown a moment
    private marker?: { x: number; y: number; start: number };
    private command?: SimInput["command"];
    // A potion drunk this frame, by its place in the belt
    private potion = -1;
    private teleport = false;
    private readonly simInput = noInput();
    private readonly point: ScreenPoint = { x: 0, y: 0, visible: false };
    private readonly drawOptions: ActorDrawOptions = {};
    private readonly fxOptions: ActorDrawOptions = { unlit: 0.8 };
    private readonly invViewProj = mat4.create();
    private readonly near = vec4.create();
    private readonly far = vec4.create();
    private readonly move = { x: 0, y: 0 };
    // The minimap: what's been seen of where the hero is
    private map?: MiniMap;
    // The overlay map's showing (Tab)
    private bigMap = false;
    private deathShown = false;
    // Hit pause, flinches, shake, thrown corpses and smoothed facing: how a fight looks (Juice.ts)
    readonly juice = new Juice();
    // This frame's length, for what eases by the frame
    private frameMs = 16;
    // The hero's run, played by how fast they're going: its tick, kept between frames
    private runPhase = 0;

    private constructor(
        readonly mapViewer: MapViewer,
        readonly renderer: GameWebGLRenderer,
        readonly assets: Assets,
        readonly audio: GameAudio,
        overlayCanvas: HTMLCanvasElement,
        readonly store: Store,
        readonly context: BuildContext,
    ) {
        this.overlay = new Overlay(overlayCanvas);
        this.input = new GameInput(renderer.canvas, {
            pads: PAD_BINDINGS,
            ownKeys: ["KeyQ", "KeyE", "KeyR", "KeyF", "KeyP", "KeyI", "KeyC", "KeyT", "KeyZ", "Tab", "Digit1", "Digit2", "KeyH", "ShiftLeft", "ShiftRight"],
        });
        this.input.onPress = (code) => this.onPress(code);
        // Every key the controls are set to is the game's while it's played, not the browser's
        this.input.takesKey = (code) => this.store.getSnapshot().screen === "play" && (code === "Tab" || controlOf(this.settings.keys, code) !== undefined);
        this.input.onBlur = () => {
            this.leftDown = false;
            this.rightDown = false;
        };
        this.cameraRig.pitch = PITCH;
        this.cameraRig.distance = START_DISTANCE;
        const canvas = renderer.canvas;
        canvas.addEventListener("pointerdown", this.onPointerDown);
        canvas.addEventListener("contextmenu", this.onContextMenu);
        canvas.addEventListener("pointermove", this.onCanvasMove);
        canvas.addEventListener("pointerleave", this.onPointerLeave);
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp);
        document.addEventListener("visibilitychange", this.onHidden);
        this.store.set({ uiSize: this.settings.uiSize, muted: this.audioMuted(), volume: this.audio.settings.volume });
        this.applyKeys();
        this.applyVolumes();
        this.applyFeel();
    }

    dispose(): void {
        const canvas = this.renderer.canvas;
        canvas.removeEventListener("pointerdown", this.onPointerDown);
        canvas.removeEventListener("contextmenu", this.onContextMenu);
        canvas.removeEventListener("pointermove", this.onCanvasMove);
        canvas.removeEventListener("pointerleave", this.onPointerLeave);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerup", this.onPointerUp);
        document.removeEventListener("visibilitychange", this.onHidden);
        this.save();
        this.input.dispose();
        this.audio.dispose();
        if (this.renderer.game === this) {
            this.renderer.game = undefined;
        }
    }

    private audioMuted(): boolean {
        try {
            return !!JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) ?? "{}").muted;
        } catch {
            return false;
        }
    }

    // ---- The city and the rifts ----

    // One thing made at a time: the city, or a rift
    private async oneAtATime(build: () => Promise<void>): Promise<void> {
        while (this.making) {
            await this.making;
        }
        this.making = build();
        try {
            await this.making;
        } finally {
            this.making = undefined;
        }
    }

    // The city on screen: built the first time, and its collision kept
    private showCity(): Promise<void> {
        return this.oneAtATime(() => this.buildCity());
    }

    private async buildCity(): Promise<void> {
        if (this.place === "city" && this.city && this.grid === this.cityGrid) {
            return;
        }
        this.store.set({ generating: `Entering ${CITY_NAME}` });
        // Let the screen say so before the main thread's taken up
        await new Promise((resolve) => setTimeout(resolve, 40));
        if (!this.city || !this.cityGrid) {
            const city = generateCity(this.context);
            await this.mapViewer.addCustomMapSquares(city.squares, []);
            this.cityGrid = await this.loadGrid(city);
            this.city = city;
            this.cityMap = this.newMap(city);
            this.revealAll(this.cityMap, city, this.cityGrid);
            this.stage = new TitleStage(city.plan.portal);
        }
        const city = this.city;
        this.place = "city";
        this.grid = this.cityGrid;
        this.map = this.cityMap;
        this.arrange(city);
        this.store.set({ generating: undefined });
    }

    // A rift on screen, the open one: made the first time it's stepped into, and kept after
    private showRift(open: OpenRift): Promise<void> {
        return this.oneAtATime(() => this.buildRift(open));
    }

    private async buildRift(open: OpenRift): Promise<void> {
        const zone = riftZone(open.depth, open.seed, open.pinnacle);
        this.store.set({ generating: `Entering ${riftName(open.depth, open.seed, open.pinnacle)}` });
        await new Promise((resolve) => setTimeout(resolve, 40));
        if (!open.rift || !open.grid) {
            const rift = generateRift(open.depth, open.seed, this.context, open.pinnacle, open.shape ?? RIFT_SHAPE);
            await this.mapViewer.addCustomMapSquares(rift.squares, []);
            open.grid = await this.loadGrid(rift);
            open.rift = rift;
            open.map = this.newMap(rift);
        }
        await this.assets.loadZone(zone);
        this.place = "rift";
        this.grid = open.grid;
        this.map = open.map;
        this.arrange(open.rift);
        this.store.set({ generating: undefined });
    }

    // An arena's collision and heights, built off the main thread
    private async loadGrid(area: Area): Promise<ArenaGrid> {
        const input: RegionDataInput = { baseX: area.baseX, baseY: area.baseY, sizeX: area.sizeX, sizeY: area.sizeY, plane: 0 };
        const region = await this.mapViewer.workerPool.queueLoad<RegionDataInput, RegionData, RegionDataLoader>(new RegionDataLoader(), input);
        return new ArenaGrid(region);
    }

    // The world drawn round an arena, in place of the last one
    private arrange(area: Area): void {
        this.area = area;
        this.renderer.clearMaps();
        this.renderer.mapManager.loadingMapIds.clear();
        this.renderer.setPlayArea(area.baseX, area.baseY, area.baseX + area.sizeX, area.baseY + area.sizeY, CAMERA_REACH);
        this.effects = [];
        this.splats = [];
        this.floats = [];
        this.labels = [];
        this.said = [];
        this.juice.clear();
        this.focusX = area.spawn.x;
        this.focusY = area.spawn.y;
        this.titleTime = 0;
    }

    // Into the city with this hero, saved under this key
    private async begin(hero: Hero, slot: string): Promise<void> {
        if (this.store.getSnapshot().generating || this.making) {
            return;
        }
        this.hero = hero;
        this.slot = slot;
        // A rift left open when the hero was last saved is open still: the same land and its
        // modifiers, though whole again
        this.open = hero.riftOpen
            ? { depth: Math.max(1, Math.min(hero.depth, hero.maxDepth)), seed: hero.zoneSeed, mods: [...hero.riftMods], pinnacle: hero.riftPinnacle, awakened: hero.riftAwakened, lane: hero.riftLane, bounty: hero.riftBounty, invocations: hero.riftInvocations }
            : undefined;
        this.offers.clear();
        this.chosenDepth = Math.max(1, Math.min(hero.depth, hero.maxDepth));
        await this.showCity();
        await this.assets.loadHero(hero);
        this.assets.dropTitle();
        this.enterCity("start");
    }

    // The hero in the city, by whatever way they came
    private enterCity(how: "start" | "waystone" | "teleport" | "died" | "cleared" | "collapsed"): void {
        const hero = this.hero!;
        const city = this.city!;
        this.game = new Game(this.cityGrid!, hero, { depth: 0, seed: randomSeed(), spawn: city.spawn, town: city.plan });
        this.game.portalOpen = this.open !== undefined;
        // Fresh stock on the shelves
        this.stock = rollStock(new Rng(randomSeed()), hero);
        // and tasks from a few of the folk
        this.taskOffers = rollTaskOffers(
            new Rng(randomSeed()),
            hero,
            city.plan.people.flatMap((p) => (p.folk ? [p.folk] : [])),
        );
        this.arrived();
        const store = this.store;
        if (how === "start") {
            store.toast(`${CITY_NAME}, the city between the rifts`, 4000);
            if (hero.hardcore) {
                store.toast(`Hardcore: one life. If ${hero.name} falls, they play no more.`, 6000, "warn");
            }
            if (this.open) {
                store.toast(`Your rift to ${riftName(this.open.depth, this.open.seed, this.open.pinnacle)} is still open: the tear in the square leads back.`, 6000);
            } else {
                store.toast(`Talk to ${ARCHMAGE.name} by the tear in the square to open a rift.`, 6000);
            }
        } else if (how === "died") {
            store.toast("The tower's ward pulls you home. The rift collapses behind you.", 5000, "warn");
        } else if (how === "collapsed") {
            store.toast("The rift's time ran out: it collapses, and the tower's ward pulls you home.", 6000, "warn");
        } else if (how === "cleared" && this.pinnacleCleared) {
            const was = this.pinnacleCleared;
            this.pinnacleCleared = undefined;
            store.toast(was === "heart" ? "The Heart of the Rift is stilled, for now. Its shards will fall again." : `${PINNACLES[was].name} is quiet, for now. What holds it will be back.`, 6000, "good");
        } else if (how === "cleared") {
            store.toast(`Rift cleared! ${ARCHMAGE.name} can now open rifts down to depth ${hero.maxDepth}.`, 6000, "good");
        } else {
            store.toast(`Home to ${CITY_NAME}. Your rift stays open: the tear in the square leads back.`, 5000);
        }
        if (how !== "start") {
            this.spot(TELEPORT_SPOT, city.spawn.x, city.spawn.y, 0);
        }
    }

    // Through the Archmage's portal, into the open rift
    private async enterRift(): Promise<void> {
        const hero = this.hero;
        const open = this.open;
        if (!hero || !open || this.making) {
            return;
        }
        this.sfx(SOUND.portal, { volume: 0.35 });
        this.game = undefined;
        const back = open.game !== undefined;
        const name = `${open.awakened ? "Awakened " : ""}${riftName(open.depth, open.seed, open.pinnacle)}`;
        this.store.set({ transition: `Entering ${name}`, panel: undefined });
        await this.showRift(open);
        if (open.game) {
            open.game.arrive();
        } else {
            open.game = new Game(open.grid!, hero, {
                depth: open.depth,
                seed: open.seed,
                spawn: open.rift!.spawn,
                mods: open.mods,
                pinnacle: open.pinnacle,
                sites: open.rift!.sites,
                nooks: open.rift!.nooks,
                packArea: open.rift!.packArea,
                guardian: open.rift!.guardian,
                rooms: open.rift!.rooms,
                bounty: open.bounty,
                awakened: open.awakened,
                invocations: open.invocations,
            });
        }
        this.game = open.game;
        this.arrived();
        if (back) {
            this.store.toast(`Back into ${name}, as you left it.`, 4000);
        } else if (open.pinnacle) {
            const boss = BOSSES[PINNACLES[open.pinnacle].zone.boss];
            this.store.toast(`${name}: area level ${areaLevel(open.depth)}`, 4000);
            this.store.toast(
                open.awakened
                    ? `At its end waits ${boss.name}, awakened: twice the life, harder blows, and worse at half its life.`
                    : PINNACLES[open.pinnacle].rooms
                      ? `Four paths off the Nexus, in any order: walk into a chamber to raise its guardian. The Wardens wake once all four are beaten${(open.invocations ?? []).length > 0 ? `. Raid level ${raidLevel(open.invocations ?? [])}` : ""}.`
                      : open.pinnacle === "heart"
                      ? `At its end waits ${boss.name}, ${boss.title}, with every guardian's blows.`
                      : `At its end waits ${boss.name}, ${boss.title}, at the height of their power.`,
                6000,
                "warn",
            );
        } else {
            const host = riftHost(open.depth, open.seed);
            this.store.toast(`${name}: rift ${open.depth}, area level ${areaLevel(open.depth)}${host ? `, held by ${host.name}` : ""}`, 4000);
            if (open.mods.length > 0) {
                this.store.toast(`Woven with ${open.mods.map((id) => RIFT_MODS[id].name).join(", ")}: ${rewardText(rewardView(open.mods))}.`, 6000, "warn");
            }
            this.store.toast("Slay the guardian at the far end. The waystone by the camp, or T, takes you home.", 6000);
        }
    }

    // Back to the city from a rift
    private async goHome(how: "waystone" | "teleport" | "died" | "cleared" | "collapsed"): Promise<void> {
        if (!this.hero || this.making) {
            return;
        }
        this.game = undefined;
        this.sfx(SOUND.portal, { volume: 0.3, rate: 0.85 });
        this.store.set({ transition: `Returning to ${CITY_NAME}`, panel: undefined, deathWait: 0 });
        await this.showCity();
        this.enterCity(how);
    }

    // Whatever was just entered, ready to play
    private arrived(): void {
        this.accumulator = 0;
        this.leftDown = this.rightDown = false;
        this.leftTarget = -1;
        this.leftWalk = false;
        this.marker = undefined;
        this.command = undefined;
        this.teleport = false;
        this.deathShown = false;
        this.targetDistance = START_DISTANCE;
        this.targetPitch = PITCH;
        this.lift = PLAY_LIFT;
        this.stage?.endDrag();
        this.renderer.canvas.style.cursor = "";
        this.hoverKey = "";
        this.packVersion++;
        this.save();
        this.store.set({
            screen: "play",
            panel: undefined,
            shop: undefined,
            archmage: undefined,
            hover: undefined,
            menu: false,
            toasts: [],
            transition: undefined,
            deathWait: 0,
            help: !this.settings.seenHelp,
        });
        this.updateHud();
        this.updatePack();
    }

    // ---- The title: the heroes kept, and making a new one ----

    // The heroes as the select screen lists them, this one chosen (or whoever was, or the last
    // played); with none, straight to making one
    private refreshHeroes(select?: string): void {
        const heroes: HeroCard[] = listHeroes().map(({ slot, hero }) => ({ ...heroSummary(slot, hero), zone: riftName(hero.maxDepth) }));
        const was = this.store.getSnapshot().selected;
        const selected = heroes.find((h) => h.slot === select)?.slot ?? heroes.find((h) => h.slot === was)?.slot ?? heroes[0]?.slot;
        this.store.set({ heroes, selected, titleStep: heroes.length > 0 ? "heroes" : "class", pick: undefined, hoverClass: undefined, creating: undefined, deleting: undefined });
        if (heroes.length === 0) {
            void this.assets.loadLineup();
        }
        this.showSelected();
    }

    private showSelected(): void {
        const slot = this.store.getSnapshot().selected;
        const hero = slot ? loadHero(slot) : undefined;
        if (slot && hero) {
            void this.assets.loadPreview(slot, hero.cls, hero.look, hero.equipment);
        }
    }

    selectHero(slot: string): void {
        if (this.store.getSnapshot().selected === slot) {
            this.stage?.flourish(performance.now());
            return;
        }
        this.store.set({ selected: slot, deleting: undefined });
        this.showSelected();
    }

    async playHero(): Promise<void> {
        const slot = this.store.getSnapshot().selected;
        const hero = slot ? loadHero(slot) : undefined;
        if (!slot || !hero || hero.fallen) {
            return;
        }
        setLastHero(slot);
        await this.begin(hero, slot);
    }

    // Asked first, then gone for good
    askDelete(slot: string | undefined): void {
        this.store.set({ deleting: slot });
    }

    confirmDelete(): void {
        const slot = this.store.getSnapshot().deleting;
        if (slot) {
            const name = this.store.getSnapshot().heroes.find((h) => h.slot === slot)?.name;
            deleteHero(slot);
            this.refreshHeroes();
            if (name) {
                this.store.toast(`${name} is gone.`, 2500);
            }
        }
    }

    // A new hero: first their class, from the line
    createNew(): void {
        if (heroCount() >= MAX_HEROES) {
            this.store.toast(`You can keep ${MAX_HEROES} heroes. Delete one to make another.`, 3500, "warn");
            return;
        }
        this.store.set({ titleStep: "class", pick: this.store.getSnapshot().creating?.cls, deleting: undefined });
        void this.assets.loadLineup();
    }

    pickClass(cls: ClassId): void {
        const state = this.store.getSnapshot();
        if (state.titleStep !== "class") {
            return;
        }
        if (state.pick === cls) {
            this.toLook();
            return;
        }
        this.store.set({ pick: cls });
        this.sfx(SOUND.portal, { volume: 0.12, rate: 1.6 });
    }

    // Then how they look, their name, and whether they've one life
    toLook(): void {
        const state = this.store.getSnapshot();
        const cls = state.pick;
        if (!cls) {
            return;
        }
        const was = state.creating;
        const creating: Creation =
            was?.cls === cls ? { ...was, problem: undefined } : { cls, look: readLook(undefined, CLASS_LOOKS[cls]), name: was?.name ?? "", hardcore: was?.hardcore ?? false, showGear: true };
        this.store.set({ titleStep: "look", creating, hoverClass: undefined });
        this.showCreation(creating);
    }

    setCreation(patch: Partial<Creation>): void {
        const was = this.store.getSnapshot().creating;
        if (!was) {
            return;
        }
        const creating: Creation = { ...was, ...patch, problem: patch.name !== undefined ? undefined : was.problem };
        this.store.set({ creating });
        if (patch.look || patch.showGear !== undefined) {
            this.showCreation(creating);
        }
    }

    randomiseLook(): void {
        const c = this.store.getSnapshot().creating;
        if (c) {
            this.setCreation({ look: randomLook(new Rng(randomSeed()), c.look.female) });
        }
    }

    randomName(): void {
        const rng = new Rng(randomSeed());
        const first = rng.pick(NAME_FIRST);
        const full = first + rng.pick(NAME_LAST);
        this.setCreation({ name: full.length <= NAME_MAX ? full : first });
    }

    private showCreation(c: Creation): void {
        let gear = this.starterGear.get(c.cls);
        if (!gear) {
            gear = newHero(c.cls, 1).equipment;
            this.starterGear.set(c.cls, gear);
        }
        void this.assets.loadPreview("new", c.cls, c.look, c.showGear ? gear : undefined);
    }

    // A step back: from how they look to the line, from the line to the heroes there are
    titleBack(): void {
        const state = this.store.getSnapshot();
        if (state.deleting) {
            this.store.set({ deleting: undefined });
        } else if (state.titleStep === "look") {
            this.store.set({ titleStep: "class", pick: state.creating?.cls });
        } else if (state.titleStep === "class" && state.heroes.length > 0) {
            this.store.set({ titleStep: "heroes", pick: undefined, hoverClass: undefined });
            this.showSelected();
        }
    }

    async createHero(): Promise<void> {
        const c = this.store.getSnapshot().creating;
        if (!c || this.store.getSnapshot().generating) {
            return;
        }
        const name = c.name.trim();
        const problem = nameProblem(name);
        if (problem) {
            this.store.set({ creating: { ...c, problem } });
            return;
        }
        if (heroCount() >= MAX_HEROES) {
            this.store.toast(`You can keep ${MAX_HEROES} heroes. Delete one to make another.`, 3500, "warn");
            return;
        }
        await this.begin(newHero(c.cls, randomSeed(), { name, look: c.look, hardcore: c.hardcore }), freeSlot());
    }

    toTitle(): void {
        this.save();
        const slot = this.slot;
        this.game = undefined;
        this.open = undefined;
        this.store.set({
            screen: "title",
            hud: undefined,
            pack: undefined,
            panel: undefined,
            shop: undefined,
            archmage: undefined,
            hover: undefined,
            picker: undefined,
            tree: undefined,
            menu: false,
            toasts: [],
            deathWait: 0,
        });
        this.hero = undefined;
        this.slot = undefined;
        this.titleTime = 0;
        this.refreshHeroes(slot);
        // The title's over the city
        void this.showCity();
    }

    save(): void {
        if (this.hero && this.slot) {
            saveHero(this.hero, this.slot);
            this.lastSave = performance.now();
        }
    }

    // The helm drawn or not, so the face shows
    setHideHelm(hide: boolean): void {
        const hero = this.hero;
        if (hero && hero.look.hideHelm !== hide) {
            hero.look = { ...hero.look, hideHelm: hide };
            this.gearChanged();
            this.save();
        }
    }

    private onHidden = () => {
        if (document.visibilityState === "hidden") {
            this.save();
        }
    };

    setSettings(patch: Partial<Settings>): void {
        this.settings = { ...this.settings, ...patch };
        saveSettings(this.settings);
        this.store.set({ uiSize: this.settings.uiSize });
        this.applyFeel();
    }

    // The screen shake and the smoothing of animations, as the settings have them: smoothing is on
    // unless it's been turned off, or it's a touch screen and hasn't been turned on, as it costs
    // memory a phone hasn't to spare. The hero's baked again with it at once, the rest as it's next
    // baked (a rift's monsters as it opens).
    private applyFeel(): void {
        const smoothing = this.settings.smoothing ?? !isCoarsePointer;
        this.juice.shakeOn = this.settings.shake;
        const tween = smoothing ? 2 : 0;
        if (tween !== this.assets.tweenTicks) {
            this.assets.tweenTicks = tween;
            if (this.hero) {
                void this.assets.loadHero(this.hero);
            }
        }
        this.store.set({ shake: this.settings.shake, smoothing });
    }

    setMuted(muted: boolean): void {
        this.audio.setSettings({ muted });
        this.store.set({ muted });
    }

    // ---- Sound and controls (the menu's) ----

    // The master volume, kept by the audio itself
    setVolume(volume: number): void {
        this.audio.setSettings({ volume: Math.max(0, Math.min(1, volume)) });
        this.store.set({ volume: this.audio.settings.volume });
        this.sfx(SOUND.click, { volume: 0.4 });
    }

    // The world's sounds or the interface's, on top of the master volume
    setVolumes(patch: Partial<Pick<Settings, "combatVolume" | "interfaceVolume">>): void {
        this.setSettings(patch);
        this.applyVolumes();
        if (patch.interfaceVolume !== undefined) {
            this.sfx(SOUND.click, { volume: 0.4 });
        } else {
            this.sfx(SOUND.swing, { volume: 0.4 }, "combat");
        }
    }

    private applyVolumes(): void {
        this.store.set({ combatVolume: this.settings.combatVolume, interfaceVolume: this.settings.interfaceVolume });
    }

    // A key set on a control (or a place cleared, with ""), or every control back as it was
    setKey(id: ControlId, place: number, code: string): void {
        this.setSettings({ keys: bindKey(this.settings.keys, id, place, code) });
        this.applyKeys();
    }

    resetKeys(): void {
        this.setSettings({ keys: defaultBindings() });
        this.applyKeys();
    }

    private applyKeys(): void {
        const keys = this.settings.keys;
        PAD_BINDINGS.run.north = keys.pack[0] ?? "KeyB";
        PAD_BINDINGS.run.west = keys.lifeFlask[0] ?? "Digit1";
        PAD_BINDINGS.run.east = keys.manaFlask[0] ?? "Digit2";
        this.store.set({ keys });
        if (this.hero) {
            this.updateHud();
        }
    }

    // Whether any of a control's keys is held
    private held(id: ControlId): boolean {
        return this.settings.keys[id].some((code) => this.input.isDown(code));
    }

    // Walking from the controls' keys, or else a controller, or else the touch stick
    private readMove(out: { x: number; y: number }): void {
        let x = 0;
        let y = 0;
        if (this.held("moveUp")) y += 1;
        if (this.held("moveDown")) y -= 1;
        if (this.held("moveRight")) x += 1;
        if (this.held("moveLeft")) x -= 1;
        const len = Math.hypot(x, y);
        if (len > 0) {
            out.x = x / len;
            out.y = y / len;
            return;
        }
        this.input.pads.getMove(out);
        if (out.x === 0 && out.y === 0) {
            this.input.stick.getMove(out);
        }
    }

    // A skill button's key as the bar shows it: the mouse's, or what the controls have it on
    skillKeyName(i: number): string {
        return i < 2 ? SKILL_KEYS[i] : controlLabel(this.settings.keys, SKILL_CONTROLS[i - 2]);
    }

    closeHelp(): void {
        this.setSettings({ seenHelp: true });
        this.store.set({ help: false });
    }

    // What's new, from the title's corner
    setChangelog(open: boolean): void {
        this.store.set({ changelog: open });
    }

    setMenu(open: boolean): void {
        this.store.set({ menu: open });
        this.save();
    }

    setPanel(panel: Panel | undefined): void {
        const was = this.store.getSnapshot();
        this.store.set({
            panel,
            shop: panel === "shop" ? was.shop : undefined,
            task: panel === "task" ? was.task : undefined,
            quests: panel === "quests" ? was.quests : undefined,
            caves: panel === "caves" ? was.caves : undefined,
            glory: panel === "glory" ? was.glory : undefined,
            log: panel === "log" ? was.log : undefined,
            orrery: panel === "orrery" ? was.orrery : undefined,
        });
        if (panel === "log") {
            this.updateLog();
        }
        if (panel === "orrery") {
            this.updateOrrery();
        }
        if (panel === "shop") {
            this.updateShop();
        }
        if (panel === "quests") {
            this.updateQuests();
        }
        if (panel === "task") {
            this.updateTask();
        }
        if (panel === "archmage") {
            this.updateArchmage();
        }
        if (panel) {
            this.updatePack();
        } else {
            this.shopId = undefined;
            this.taskGiver = undefined;
            this.save();
        }
    }

    // ---- The record (sim/log.ts) ----

    private updateLog(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const lit = new Set(hero.log ?? []);
        const pages = logPages().map((p) => {
            const entries = p.entries.map((e) => ({ ...e, have: lit.has(e.key) }));
            return { id: p.id, name: p.name, have: entries.filter((e) => e.have).length, entries };
        });
        const keys = new Set(pages.flatMap((p) => p.entries.map((e) => e.key)));
        const points = achievementPoints(hero);
        const done = new Set(hero.achievements ?? []);
        this.store.set({
            log: {
                pages,
                have: [...keys].filter((k) => lit.has(k)).length,
                total: keys.size,
                pets: PETS.map((p) => ({ id: p.id, name: p.name, objId: p.objId, have: (hero.pets ?? []).includes(p.id), following: hero.pet === p.id })),
                achievements: ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, text: a.text, tier: a.tier, points: TIER_POINTS[a.tier], done: done.has(a.id) })),
                points,
                totalPoints: totalPoints(),
                hilts: HILTS.map((h) => ({ name: h.name, objId: h.objId, points: h.points, text: h.text, have: points >= h.points })),
            },
        });
    }

    // ---- The orrery (sim/orrery.ts) ----

    private updateOrrery(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const taken = new Set(hero.orrery?.taken ?? []);
        const view: OrreryView = {
            points: orreryPoints(hero),
            spheres: (hero.orrery?.lit ?? []).map((key) => ({ key, name: sphereName(key) })),
            arms: ORRERY_ARMS.map((arm) => ({
                id: arm.id,
                name: arm.name,
                nodes: ORRERY_NODES.filter((n) => n.arm === arm.id).map((n) => ({
                    id: n.id,
                    name: n.name,
                    text: orreryText(n),
                    notable: n.notable === true,
                    taken: taken.has(n.id),
                    why: takeWhyNot(hero, n.id),
                    refundWhy: refundWhyNot(hero, n.id),
                })),
            })),
            refund: orreryRefund(hero),
            places: orreryLevers(hero).favour,
            favour: hero.orrery?.favour ?? [],
            hosts: HOST_IDS.map((id) => ({ id, name: HOSTS[id].name })),
        };
        this.store.set({ orrery: view });
    }

    // A node of the orrery taken with a sphere's point
    takeOrrery(id: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = takeNode(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.updateOrrery();
        this.save();
    }

    // A node given back, for gold, its point to spend again
    refundOrrery(id: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = refundNode(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3 });
        this.updateOrrery();
        this.updatePack();
        this.save();
    }

    // A host chosen for a favoured place
    favourOrrery(slot: number, host: string): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = favourHost(hero, slot, host);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.updateOrrery();
        this.save();
    }

    // A pet won chosen to follow, or none
    choosePet(id: string | undefined): void {
        const hero = this.hero;
        if (!hero || (id !== undefined && !(hero.pets ?? []).includes(id))) {
            return;
        }
        hero.pet = hero.pet === id ? undefined : id;
        this.sfx(SOUND.click, { volume: 0.3 });
        this.updateLog();
        this.save();
    }

    // Home after dying: the rift's gone
    returnHome(): void {
        const game = this.game;
        if (!game || !game.hero.dead) {
            return;
        }
        // A hardcore hero who's fallen goes nowhere
        if (this.hero?.fallen) {
            this.toTitle();
            return;
        }
        this.open = undefined;
        if (this.hero) {
            this.hero.riftOpen = false;
            this.hero.riftLane = undefined;
            this.hero.riftBounty = undefined;
            this.hero.riftAwakened = undefined;
            this.hero.riftInvocations = undefined;
        }
        void this.goHome("died");
    }

    // Starts the teleport home (the T key's, and the button's)
    startTeleport(): void {
        const game = this.game;
        if (!game || game.hero.dead) {
            return;
        }
        if (game.town) {
            this.denied(`You're already in ${CITY_NAME}.`);
            return;
        }
        this.teleport = true;
    }

    // ---- The Archmage ----

    // The rift to show the versions of on the Archmage's panel
    chooseRift(depth: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        this.chosenDepth = Math.max(1, Math.min(hero.maxDepth, Math.round(depth)));
        this.updateArchmage();
    }

    // The versions of a depth's rift on offer, rolled the first time they're asked for
    private riftOffers(depth: number): RiftOffer[] {
        let offers = this.offers.get(depth);
        // At the deepest rift reached on the ladder, the web's: the places open from the hero's lane,
        // each kept as it is till it's done (sim/web.ts)
        const hero = this.hero;
        if (!offers && hero && onWeb(hero, depth)) {
            const web = heroWeb(hero, randomSeed);
            offers = nextLanes(web.lane).map((lane) => {
                const node = webNode(web, depth, lane);
                return { seed: node.seed, mods: node.mods, lane, bounty: node.bounty };
            });
            this.offers.set(depth, offers);
        }
        if (!offers) {
            // and one more for Reldo's last quest (content/quests.ts)
            const more = this.hero ? questOffers(this.hero) : 0;
            // and one more with Ghommal's second hilt (content/achievements.ts)
            const hilt = this.hero && hasHilt(this.hero, "offer") ? 1 : 0;
            offers = rollRiftOffers(new Rng(randomSeed()), depth, RIFT_OFFERS + more + hilt).map((mods) => ({ seed: randomSeed(), mods }));
            this.offers.set(depth, offers);
        }
        return offers;
    }

    // A rift to this depth, the offer'th version of it, its portal opening in the tear; one
    // already open closes, and the Archmage has new versions to offer
    openRift(depth: number, offer = 0): void {
        const hero = this.hero;
        const game = this.game;
        const city = this.city;
        if (!hero || !game || !game.town || !city) {
            return;
        }
        depth = Math.max(1, Math.min(hero.maxDepth, Math.round(depth)));
        const offers = this.riftOffers(depth);
        const chosen = offers[Math.max(0, Math.min(offers.length - 1, Math.round(offer)))];
        this.openWay(depth, [...(chosen?.mods ?? [])], undefined, chosen?.seed, chosen?.lane, chosen?.bounty);
    }

    // In development: straight from the city into a rift of this depth and seed, its land shaped as
    // asked (world/zoneGen.ts's RiftShape), to look at a plan, or open land, in the game
    devRift(depth: number, seed: number, shape: RiftShape = "planned"): Promise<void> {
        if (!this.hero || !this.game?.town || !this.city) {
            return Promise.resolve();
        }
        this.openWay(depth, [], undefined, seed);
        this.open!.shape = shape;
        return this.enterRift();
    }

    // A riftstone from the pack, given to the Archmage: its land's rift, woven as it is, and the
    // stone's spent
    openRiftstone(uid: number): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game || !game.town || !this.city) {
            return;
        }
        const index = hero.inventory.findIndex((item) => item?.uid === uid);
        const stone = index >= 0 ? hero.inventory[index] : null;
        if (!stone || !isRiftstone(stone)) {
            return;
        }
        const why = stoneWhyNot(hero, stone);
        if (why) {
            this.denied(why);
            return;
        }
        hero.inventory[index] = null;
        this.packVersion++;
        this.openWay(stone.level, [...(stone.rift ?? [])], undefined);
    }

    // The Heartstone's four shards, given up: the way to the Heart of the Rift, at the deepest the
    // hero has reached
    openHeart(): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game || !game.town || !this.city) {
            return;
        }
        if (!hasAllShards(hero) || !takeShards(hero)) {
            this.denied("You need all four of the Heartstone's shards in your pack.");
            return;
        }
        this.packVersion++;
        this.openWay(heartDepth(hero), [], "heart");
    }

    // A god's stronghold for their kill count, or the Abyssal Nexus for its ashes (pinnacles.ts);
    // or any but the Coop awakened, for its key and an Awakener's orb
    openPinnacle(id: PinnacleId, awakened = false): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game || !game.town || !this.city) {
            return;
        }
        if (awakened) {
            const why = awakenedWhyNot(hero, id);
            if (why) {
                this.denied(why);
                return;
            }
            if (id === "heart") {
                if (!takeShards(hero)) {
                    this.denied("You need all four of the Heartstone's shards in your pack.");
                    return;
                }
            } else {
                spendPinnacleKey(hero, id);
            }
            spendOrb(hero);
            this.packVersion++;
            this.openWay(heartDepth(hero), [], id, randomSeed(), undefined, undefined, true);
            return;
        }
        if (id === "heart") {
            this.openHeart();
            return;
        }
        const why = pinnacleWhyNot(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        spendPinnacleKey(hero, id);
        this.packVersion++;
        this.openWay(heartDepth(hero), [], id);
    }

    // A rift's portal opening in the tear; one already open closes, and the Archmage has new
    // versions to offer
    private openWay(depth: number, mods: RiftModId[], pinnacle: PinnacleId | undefined, seed = randomSeed(), lane?: number, bounty?: BountyId, awakened = false): void {
        const hero = this.hero!;
        const game = this.game!;
        const city = this.city!;
        this.open = { depth, seed, mods, pinnacle, awakened: awakened || undefined, lane, bounty };
        hero.riftAwakened = awakened || undefined;
        // The Tombs, with the invocations chosen now
        hero.riftInvocations = pinnacle && PINNACLES[pinnacle].rooms ? INVOCATION_IDS.filter((id) => hero.invocations?.includes(id)) : undefined;
        this.open.invocations = hero.riftInvocations;
        hero.riftLane = lane;
        hero.riftBounty = bounty;
        this.offers.clear();
        if (!pinnacle) {
            this.chosenDepth = depth;
        }
        hero.depth = depth;
        hero.zoneSeed = this.open.seed;
        hero.riftOpen = true;
        hero.riftMods = [...mods];
        hero.riftPinnacle = pinnacle;
        this.save();
        game.portalOpen = true;
        this.archmageCast = performance.now();
        const portal = city.plan.portal;
        this.spot(ARCHMAGE.castSpot, portal.x, portal.y, 0);
        this.spot(TELEPORT_SPOT, portal.x, portal.y, 0);
        this.sfx(SOUND.portal, { volume: 0.35 });
        const archmage = game.people.find((p) => p.kind === "archmage");
        const name = `${awakened ? "Awakened " : ""}${riftName(depth, seed, pinnacle)}`;
        if (archmage) {
            this.say(
                archmage,
                awakened
                    ? `${name}. The orb's woken what waits there, and it remembers you. It won't fall the same way twice.`
                    : pinnacle
                    ? PINNACLES[pinnacle].says
                    : mods.length > 0
                      ? `The way to ${name} is open, and it's angry. Go carefully.`
                      : `The way to ${name} is open. Go carefully.`,
            );
        }
        this.store.toast(`The tear opens on ${name}.`, 4500, "good");
        this.setPanel(undefined);
    }

    // A ladder rift's parts, as an offer shows them before it's chosen
    // The web round the deepest rift, for the Archmage's panel: the lane the hero stands on, the
    // depth's places (those open lit), and the bounties a depth past them (content/web.ts)
    private webView(depth: number): ArchmageView["web"] {
        const hero = this.hero;
        if (!hero || !onWeb(hero, depth)) {
            return undefined;
        }
        const web = heroWeb(hero, randomSeed);
        const open = nextLanes(web.lane);
        const lanes = [...Array(WEB.lanes).keys()];
        const column = (at: number, lit: (lane: number) => boolean) =>
            lanes.map((lane) => {
                const node = webNode(web, at, lane);
                return { lane, bounty: BOUNTIES[node.bounty].name, text: BOUNTIES[node.bounty].text, lit: lit(lane) };
            });
        return {
            depth,
            lane: web.lane,
            open,
            here: column(depth, (lane) => open.includes(lane)),
            ahead: column(depth + 1, (lane) => open.some((o) => Math.abs(o - lane) <= WEB.reach)),
        };
    }

    private landView(depth: number, seed: number): ArchmageView["offers"][number]["land"] {
        if (!onLadder(depth)) {
            return undefined;
        }
        const rift = ladderRift(depth, seed);
        const boss = BOSSES[rift.zone.boss];
        return {
            name: rift.title,
            host: rift.host.name,
            land: `${LANDS[rift.biome].name}${rift.second ? ` and ${LANDS[rift.second].name.toLowerCase()}` : ""}${rift.dusk ? ", at dusk" : ""}`,
            guardian: `${boss.name}, ${boss.title}`,
            encounter: ENCOUNTERS[rift.encounter].name,
            roamer: rift.roamer ? `${BOSSES[rift.roamer].name} roams it` : undefined,
        };
    }

    private updateArchmage(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const tiers: ArchmageView["tiers"] = [];
        for (let depth = 1; depth <= hero.maxDepth; depth++) {
            tiers.push({ depth, zone: riftName(depth), areaLevel: areaLevel(depth), boss: onLadder(depth) ? "Rolled" : BOSSES[bossOf(depth)].name });
        }
        const open = this.open;
        const chosen = Math.max(1, Math.min(this.chosenDepth, hero.maxDepth));
        const stones: ArchmageView["stones"] = [];
        for (const item of hero.inventory) {
            if (item && isRiftstone(item)) {
                const depth = item.level;
                const mods = item.rift ?? [];
                stones.push({
                    uid: item.uid,
                    name: itemInfo(item).name,
                    rarity: item.rarity,
                    objId: itemInfo(item).objId,
                    depth,
                    zone: riftName(depth),
                    areaLevel: areaLevel(depth),
                    boss: onLadder(depth) ? "Rolled as it opens" : BOSSES[bossOf(depth)].name,
                    mods: modViews(mods),
                    reward: rewardView(mods),
                    why: stoneWhyNot(hero, item),
                });
            }
        }
        stones.sort((a, b) => b.depth - a.depth);
        const held = shardsHeld(hero);
        const packed = shardsHeld({ ...hero, stash: [] });
        const heart: ArchmageView["heart"] =
            hero.maxDepth >= HEART.from || SHARD_IDS.some((id) => held[id] > 0)
                ? {
                      shards: SHARD_IDS.map((id) => ({
                          name: HEART_SHARDS[id].name,
                          objId: HEART_SHARDS[id].objId,
                          color: HEART_SHARDS[id].color,
                          have: packed[id] > 0,
                          stashed: packed[id] === 0 && held[id] > 0,
                      })),
                      ready: hasAllShards(hero),
                      depth: heartDepth(hero),
                      areaLevel: areaLevel(heartDepth(hero)),
                      awakened: (hero.goods.awakenersOrb ?? 0) > 0 ? { why: awakenedWhyNot(hero, "heart") } : undefined,
                  }
                : undefined;
        this.store.set({
            archmage: {
                tiers,
                maxDepth: hero.maxDepth,
                chosen,
                offers: this.riftOffers(chosen).map(({ seed, mods, bounty }) => ({
                    mods: modViews(mods),
                    reward: rewardView(mods),
                    land: this.landView(chosen, seed),
                    bounty: bounty ? BOUNTIES[bounty].text : undefined,
                })),
                web: this.webView(chosen),
                open: open ? { depth: open.depth, zone: riftName(open.depth, open.seed, open.pinnacle), mods: modViews(open.mods) } : undefined,
                stones,
                heart,
                pinnacles: this.pinnacleViews(),
                invocations: this.invocationViews(),
            },
        });
    }

    // The Tombs' invocations, once the Tombs can be opened: each, whether it's chosen for the next
    // raid, and the raid level they come to and what it pays
    private invocationViews(): ArchmageView["invocations"] {
        const hero = this.hero!;
        if (hero.maxDepth <= LADDER_DEPTH) {
            return undefined;
        }
        const on = hero.invocations ?? [];
        const level = raidLevel(on);
        const pct = (v: number) => Math.round(v * 100);
        return {
            list: INVOCATION_IDS.map((id) => ({ id, name: INVOCATIONS[id].name, text: INVOCATIONS[id].text, level: INVOCATIONS[id].level, on: on.includes(id) })),
            level,
            pay:
                level > 0
                    ? `${pct(level * TOMBS.perLevel.quantity)}% more items and ${pct(level * TOMBS.perLevel.rarity)}% rarer; the Wardens' second unique ${pct(PINNACLES.tombs.second + level * TOMBS.perLevel.second)}% of the time`
                    : `None chosen: the Wardens' second unique ${pct(PINNACLES.tombs.second)}% of the time`,
        };
    }

    // An invocation chosen, or not, for the next time the Tombs are opened
    toggleInvocation(id: InvocationId): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const on = new Set(hero.invocations ?? []);
        if (on.has(id)) {
            on.delete(id);
        } else {
            on.add(id);
        }
        hero.invocations = INVOCATION_IDS.filter((i) => on.has(i));
        this.save();
        this.updateArchmage();
    }

    // The pinnacles past the Heart, once the ladder's reached or their key's begun: what each asks
    // and how much of it the hero has
    private pinnacleViews(): ArchmageView["pinnacles"] {
        const hero = this.hero!;
        return PINNACLE_IDS.filter((id) => id !== "heart" && PINNACLES[id].key.kind !== "circle" && (hero.maxDepth > LADDER_DEPTH || pinnacleHave(hero, id) > 0)).map((id) => {
            const p = PINNACLES[id];
            const boss = BOSSES[p.zone.boss];
            return {
                id,
                name: p.name,
                color: p.color,
                guardian: `${boss.name}, ${boss.title}`,
                key: pinnacleKeyText(id, hero),
                have: pinnacleHave(hero, id),
                need: pinnacleNeed(id, hero),
                areaLevel: areaLevel(heartDepth(hero)),
                why: pinnacleWhyNot(hero, id),
                awakened: awakenable(id) && (hero.goods.awakenersOrb ?? 0) > 0 ? { why: awakenedWhyNot(hero, id) } : undefined,
            };
        });
    }

    // ---- The city's people ----

    private talkTo(person: Person): void {
        if (person.kind === "ally") {
            // Someone in a rift: the Great Guardian woken or given essence, the Void Knight
            const said = this.game?.speakTo(person);
            if (said) {
                this.sfx(SOUND.click, { volume: 0.3 });
                this.say(person, said);
            }
            return;
        }
        if (person.kind === "shop" && person.shop) {
            this.shopId = person.shop;
            this.sfx(SOUND.click, { volume: 0.3 });
            this.setPanel("shop");
        } else if (person.kind === "archmage") {
            this.sfx(SOUND.click, { volume: 0.3 });
            this.say(person, this.open ? "Your rift is still open. Shall I close it and open another?" : "Where shall I send you?");
            this.setPanel("archmage");
        } else if (person.kind === "banker") {
            this.sfx(SOUND.click, { volume: 0.3 });
            this.say(person, BANKER.greeting);
            this.setPanel("stash");
        } else if (person.kind === "captain") {
            this.sfx(SOUND.click, { volume: 0.3 });
            this.say(person, this.hero?.hireling?.dead ? HIRELING.captain.raise : HIRELING.captain.greeting);
            this.setPanel("captain");
        } else if (person.folk === "chronicler" && this.hero && this.identifyAll(person)) {
            // Reldo reads what's unidentified, for nothing, before anything else
        } else if (person.folk === "chronicler" && this.hero && this.taskState("chronicler") !== "done") {
            // And then his quest log, his own task a button away
            this.sfx(SOUND.click, { volume: 0.3 });
            this.taskGiver = "chronicler";
            this.say(person, QUEST_LINES.log);
            this.setPanel("quests");
        } else if (person.folk && this.taskState(person.folk)) {
            // One of the folk with a task: theirs to offer, or the hero's to report on
            this.sfx(SOUND.click, { volume: 0.3 });
            this.taskGiver = person.folk;
            this.setPanel("task");
        } else if (person.lines) {
            // The folk, and the wardens: their own lines
            this.say(person, person.lines[Math.floor(Math.random() * person.lines.length)]);
        } else if (person.kind === "wizard") {
            this.say(person, WIZARD_LINES[Math.floor(Math.random() * WIZARD_LINES.length)]);
        } else {
            this.say(person, GUARD_LINES[Math.floor(Math.random() * GUARD_LINES.length)]);
        }
    }

    // Reldo reads every unidentified unique and set piece the hero has: true if there was any
    private identifyAll(person: Person): boolean {
        const hero = this.hero;
        if (!hero) {
            return false;
        }
        const read = identify(hero);
        if (read.length === 0) {
            return false;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        const names = read.map((item) => itemInfo(item).name);
        this.say(person, read.length === 1 ? `Let me see... this is ${names[0]}. Remarkable.` : `Let me see... ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}. Remarkable, every one.`);
        for (const item of read) {
            const u = UNIQUE_BY_ID.get(item.base);
            this.store.toast(`Reldo reads it: ${itemInfo(item).name}`, 4000, "loot", u?.set ? SET_COLOR : RARITY_COLOR.unique);
        }
        this.game?.refreshStats();
        this.packVersion++;
        this.updatePack();
        this.save();
        return true;
    }

    // ---- The folk's tasks (sim/tasks.ts) ----

    // Where one of the folk stands with the hero: a task to offer, one under way, or one done
    private taskState(folk: FolkId): "offer" | "held" | "done" | undefined {
        const held = this.hero?.tasks.find((t) => t.giver === folk);
        return held ? (taskDone(held) ? "done" : "held") : this.taskOffers.has(folk) ? "offer" : undefined;
    }

    private taskView(task: Task): TaskView {
        return {
            uid: task.uid,
            giver: FOLK[task.giver].name,
            objective: taskObjective(task),
            where: taskWhere(task),
            progress: task.progress,
            count: task.count,
            done: taskDone(task),
        };
    }

    // ---- Reldo's quests (content/quests.ts) ----

    // Where one's done: its zone's rift, and its second lap's if any rift of it will do (the second
    // lap's guardian is another)
    private questWhere(def: QuestDef): string {
        if (def.goal.kind === "boss") {
            return `Rift ${def.zone + 1}${def.goal.mod ? `, woven with ${RIFT_MODS[def.goal.mod].name}` : ""}`;
        }
        return `Rift ${def.zone + 1} or ${def.zone + 1 + ZONES.length}`;
    }

    // The tracker's line: in a rift, its zone's quest if it's open; in the city, one to claim
    private questLine(): Hud["quest"] {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game) {
            return undefined;
        }
        if (game.town) {
            const ready = QUEST_IDS.find((id) => questState(hero, id) === "ready");
            return ready ? { name: QUESTS[ready].name, ask: QUESTS[ready].ask, ready: true } : undefined;
        }
        const depth = game.zone.depth;
        if (depth > LADDER_DEPTH || game.zone.pinnacle) {
            return undefined;
        }
        const id = QUEST_IDS.find((q) => QUESTS[q].zone === (depth - 1) % ZONES.length && questState(hero, q) !== "claimed");
        return id ? { name: QUESTS[id].name, ask: QUESTS[id].ask, ready: questState(hero, id) === "ready" } : undefined;
    }

    private updateQuests(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const log = hero.quests;
        const favours: string[] = [];
        if ((log?.sockets ?? 0) > 0) {
            favours.push(`The gem trader adds ${log!.sockets === 1 ? "a socket" : `${log!.sockets} sockets`} for nothing.`);
        }
        if ((log?.imbues ?? 0) > 0) {
            favours.push("The gem trader imbues a normal item you wear.");
        }
        const view: QuestLogView = {
            says: QUEST_IDS.some((id) => questState(hero, id) === "ready") ? QUEST_LINES.done : QUEST_LINES.log,
            quests: QUEST_IDS.map((id) => {
                const def = QUESTS[id];
                const goal = def.goal;
                const state = questState(hero, id);
                const slain = goal.kind === "leaders" ? goal.leaders.filter((l) => log?.leaders?.includes(l)) : [];
                return {
                    id,
                    name: def.name,
                    where: this.questWhere(def),
                    ask: def.ask,
                    gives: def.gives,
                    tale: def.tale,
                    state,
                    progress: state === "open" && slain.length > 0 ? `${slain.map((l) => MONSTERS[l].name).join(" and ")} slain` : undefined,
                };
            }),
            task: this.taskState("chronicler") !== undefined,
            favours,
            maxCape: hero.level >= MAX_CAPE_LEVEL ? { price: MAX_CAPE_PRICE, why: maxCapeWhyNot(hero) } : undefined,
        };
        this.store.set({ quests: view });
    }

    // Reldo's Max cape, at level 99, for gold
    buyMaxCape(): void {
        const hero = this.hero;
        if (!hero || !this.game?.town) {
            return;
        }
        const got = buyMaxCape(hero);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.35 });
        this.store.toast(`Reldo hands you the ${itemInfo(got).name}. Aubury's circle can join it with a cape of your own.`, 6000, "loot", RARITY_COLOR.unique);
        this.packVersion++;
        this.updateQuests();
        this.updatePack();
        this.updateHud();
        this.save();
    }

    // One of Reldo's quests claimed: what it leaves, for good
    claimQuest(id: QuestId): void {
        const game = this.game;
        const hero = this.hero;
        if (!game || !hero || !game.town) {
            return;
        }
        const got = game.claimQuest(id);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.35 });
        this.store.toast(`${QUESTS[id].name}: ${QUESTS[id].gives}${got.item ? ` (${itemInfo(got.item).name})` : ""}.`, 6000, "good");
        this.packVersion++;
        this.updateQuests();
        this.updatePack();
        this.updateHud();
        this.save();
    }

    // The giver's panel: the task they offer, or the hero's for them, and what it pays
    private updateTask(): void {
        const hero = this.hero;
        const giver = this.taskGiver;
        const held = giver ? hero?.tasks.find((t) => t.giver === giver) : undefined;
        const task = held ?? (giver ? this.taskOffers.get(giver) : undefined);
        if (!hero || !giver || !task) {
            this.store.set({ task: undefined });
            return;
        }
        const folk = FOLK[giver];
        const state = held ? (taskDone(held) ? "done" : "held") : "offer";
        const r = task.reward;
        const view: TaskDialogView = {
            giver: folk.name,
            title: folk.title,
            says: state === "offer" ? GIVERS[giver].ask : TASK_LINES[state],
            state,
            task: this.taskView(task),
            reward: {
                gold: r.gold,
                xp: r.xp,
                item: r.item ? this.itemView(r.item) : undefined,
                runes: r.runes ? { ...this.runeView(r.runes.id), count: r.runes.count } : undefined,
                goods: r.goods ? { name: GOODS[r.goods.id].name, objId: GOODS[r.goods.id].objId, count: r.goods.count } : undefined,
            },
            why: state === "offer" ? whyNotTake(hero, task) : state === "done" && r.item && packSlot(hero) < 0 ? "Make room in your pack for your reward first." : undefined,
        };
        this.store.set({ task: view });
    }

    // The task offered, taken
    // What the Fight Caves' mouth says, as it stands
    private cavesHover(game: Game): string {
        const caves = game.caves;
        if (!caves || caves.state === "done") {
            return "Its waves are beaten.";
        }
        if (caves.state === "ready") {
            return `Enter, and the TzHaar come out in waves: ${FIGHT_CAVES.waves.length} of them, for tokkul.`;
        }
        if (caves.state === "fighting") {
            return `Wave ${caves.wave} is out.`;
        }
        return `${caves.held} tokkul held. Take it, or face wave ${caves.wave + 1} for twice as much.`;
    }

    // The Fight Caves' choice, after a wave: the next wave, or what's held taken
    cavesChoice(go: boolean): void {
        const game = this.game;
        if (!game || game.town) {
            return;
        }
        if (go) {
            game.cavesGo();
        } else {
            game.cavesTake();
        }
        this.setPanel(undefined);
    }

    // A prayer said, or put out, from the prayer tab (content/prayers.ts)
    togglePrayer(id: PrayerId): void {
        const game = this.game;
        const hero = this.hero;
        if (!game || !hero) {
            return;
        }
        const why = prayerWhyNot(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        const on = game.togglePrayer(id);
        this.sfx(on ? PRAYERS[id].sound : PRAYER.off, { volume: 0.4 });
        this.packVersion++;
        this.save();
    }

    // A glory taken from Minimus's offer, after a Colosseum wave
    chooseGlory(id: GloryId): void {
        const game = this.game;
        if (!game || game.town || !game.chooseGlory(id)) {
            return;
        }
        this.sfx(SOUND.godSpell, { volume: 0.25, rate: 0.9 });
        this.setPanel(undefined);
    }

    // What Minimus offers, as the panel shows it
    private gloryView(): GloryView | undefined {
        const c = this.game?.colosseum;
        if (!c || c.state !== "choice") {
            return undefined;
        }
        return {
            wave: c.wave,
            waves: COLOSSEUM.waves.length,
            glory: c.glory,
            offers: c.offer.map((id) => ({ id, name: GLORIES[id].name, text: GLORIES[id].text, glory: GLORIES[id].glory, taken: c.taken[id] ?? 0 })),
        };
    }

    takeTask(): void {
        const hero = this.hero;
        const giver = this.taskGiver;
        const task = giver ? this.taskOffers.get(giver) : undefined;
        if (!hero || !giver || !task) {
            return;
        }
        const why = takeTask(hero, task);
        if (why) {
            this.denied(why);
            return;
        }
        this.taskOffers.delete(giver);
        this.sfx(SOUND.click, { volume: 0.3 });
        this.store.toast(`Task taken: ${taskObjective(task)}. ${taskWhere(task)}.`, 4000, "good");
        this.setPanel(undefined);
        this.updateHud();
    }

    // The task under way for whoever's panel is open, given up: they've nothing more to offer till
    // the hero's next home
    giveUpTask(): void {
        const hero = this.hero;
        const giver = this.taskGiver;
        const held = giver ? hero?.tasks.find((t) => t.giver === giver) : undefined;
        if (!hero || !held) {
            return;
        }
        giveUpTask(hero, held.uid);
        this.sfx(SOUND.click, { volume: 0.3, rate: 0.8 });
        this.store.toast(`You give up the task for ${FOLK[held.giver].name}.`, 3000);
        this.setPanel(undefined);
        this.updateHud();
    }

    // The task done, paid for by whoever set it
    claimTask(): void {
        const game = this.game;
        const hero = this.hero;
        const giver = this.taskGiver;
        const held = giver ? hero?.tasks.find((t) => t.giver === giver) : undefined;
        if (!game || !hero || !held) {
            return;
        }
        const paid = game.claimTask(held.uid);
        if (typeof paid === "string") {
            this.denied(paid);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.35 });
        const xp = paid.xp > 0 ? ` and ${paid.xp.toLocaleString("en-GB")} experience` : "";
        const more = (paid.item ? `, and ${itemInfo(paid.item).name}` : paid.runes ? `, and ${runeName(paid.runes.id, paid.runes.count)}` : "") + (paid.goods ? `, and ${goodName(paid.goods.id, paid.goods.count)}` : "");
        this.store.toast(`${FOLK[held.giver].name} pays you ${paid.gold.toLocaleString("en-GB")} gold${xp}${more}.`, 5000, "good");
        const person = game.people.find((q) => q.folk === held.giver);
        if (person) {
            this.say(person, GIVERS[held.giver].thanks);
        }
        this.packVersion++;
        this.setPanel(undefined);
        this.updateHud();
    }

    // A line over someone's head, as people talk in the game
    private say(person: Person, text: string): void {
        this.said = this.said.filter((s) => s.uid !== person.uid);
        this.said.push({ uid: person.uid, text, until: performance.now() + SAY_MS });
    }

    private shopKeeper(game: Game): Person | undefined {
        return this.shopId ? game.people.find((p) => p.kind === "shop" && p.shop === this.shopId) : undefined;
    }

    private updateShop(): void {
        const id = this.shopId;
        const stock = this.stock;
        if (!id || !stock || !this.hero) {
            return;
        }
        const shop = SHOPS[id];
        const view: ShopView = {
            id,
            name: shop.name,
            keeper: shop.keeper,
            greeting: shop.greeting,
            gamble: shop.gamble === true,
            gems: shop.gems === true,
            enchants: shop.runes === true,
            stock: stock[id].map((offer) => ({ item: this.itemView(offer.item), price: offer.price })),
            runes: shop.runes ? SHOP_RUNES.map((r) => ({ ...this.runeView(r), price: runePrice(r, this.hero!.level) })) : [],
            apothecary: shop.potions ? this.apothecaryView() : undefined,
            stall: shop.sets ? this.stallView(id) : undefined,
            jeweller: shop.runes ? this.jewellerView() : undefined,
            eliteGamble: shop.gamble ? this.eliteGambleView() : undefined,
        };
        this.store.set({ shop: view });
    }

    // A stall's set, each piece as it would be bought, for the stall's money
    private stallView(id: ShopId): ShopView["stall"] {
        const stall = SHOPS[id].sets!;
        const offers = SETS[stall.set].pieces.map((piece, i) => {
            const u = UNIQUE_BY_ID.get(piece)!;
            return { id: piece, item: this.itemView({ uid: -100 - i, base: piece, rarity: "unique", level: u.level, mods: [] }), price: SET_PRICES[piece] ?? 0 };
        });
        const hero = this.hero!;
        const def = SHOPS[id];
        const upgrades = (def.upgrades ?? []).map((up, i) => {
            const u = UNIQUE_BY_ID.get(up.to)!;
            const item = this.itemView({ uid: -200 - i, base: up.to, rarity: "unique", level: u.level, mods: [] });
            return { to: up.to, item, from: UNIQUE_BY_ID.get(up.from)?.name ?? up.from, price: up.price, why: stallUpgradeWhyNot(hero, id, up.to) };
        });
        const wares = (def.wares ?? []).map((w) => ({ good: w.good, name: GOODS[w.good].name, objId: GOODS[w.good].objId, blurb: GOODS[w.good].blurb, price: w.price }));
        const t = def.talismans;
        const talismans = t
            ? {
                  price: t.price,
                  text: `A talisman of the kind you choose, rare; one time in ${Math.round(1 / t.unique)}, ${t.uniques.map((u) => UNIQUE_BY_ID.get(u)?.name ?? u).join(" or ")} instead.`,
                  bases: BASES.filter((b) => b.slot === "talisman" && b.level <= cityLevel(hero)).map((b) => ({ id: b.id, name: b.name, objId: b.objId })),
              }
            : undefined;
        return { title: `${SETS[stall.set].name}, for ${stall.money}`, money: stall.money, text: stall.text, held: hero.goods[stall.good] ?? 0, offers, upgrades, wares, talismans };
    }

    // Fortunato's elite gamble, once the hero's past the campaign (sim/town.ts)
    private eliteGambleView(): ShopView["eliteGamble"] {
        const level = this.hero ? eliteGambleLevel(this.hero) : undefined;
        return level === undefined ? undefined : { level, cost: gambleCost(level) };
    }

    // A set's piece made elite at its stall, from the one it was
    stallUpgrade(to: string): void {
        const hero = this.hero;
        if (!hero || !this.shopId) {
            return;
        }
        const got = stallUpgrade(hero, this.shopId, to);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        this.store.toast(`${SHOPS[this.shopId].keeper} makes it your ${itemInfo(got.item).name}.`, 3500, "loot", SET_COLOR);
        this.benchDone(got.worn);
        this.updateShop();
    }

    // A good off a stall, for its money
    buyWare(good: GoodId): void {
        const hero = this.hero;
        if (!hero || !this.shopId) {
            return;
        }
        const why = buyWare(hero, this.shopId, good);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        this.store.toast(`You buy ${GOODS[good].name.toLowerCase().startsWith("uncut") ? "an" : "a"} ${GOODS[good].name}.`, 3000, "loot", GOODS[good].color);
        this.benchDone(false);
        this.updateShop();
    }

    // A talisman off Felix's stall, of the base chosen
    buyTalisman(base: string): void {
        const hero = this.hero;
        if (!hero || !this.shopId) {
            return;
        }
        const got = buyTalisman(hero, this.shopId, base);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        this.store.toast(`${SHOPS[this.shopId].keeper} hands you ${itemInfo(got).name}.`, 3500, "loot", RARITY_COLOR[got.rarity]);
        this.benchDone(false);
        this.updateShop();
    }

    // Aubury's runewords and transmuting circle: what each can be done to and what it takes
    private jewellerView(): JewellerView {
        const hero = this.hero!;
        const items: { key: string; target: RuneTarget; item: Item; where: string }[] = [];
        for (const slot of SLOTS) {
            const item = hero.equipment[slot];
            if (item) {
                items.push({ key: `slot:${slot}`, target: { slot }, item, where: "Worn" });
            }
        }
        hero.inventory.forEach((item, index) => {
            if (item) {
                items.push({ key: `index:${index}`, target: { index }, item, where: "In your pack" });
            }
        });
        const plain = items.filter((i) => i.item.rarity === "normal" && !i.item.runeword && (i.item.sockets?.length ?? 0) >= 2 && !isRiftKey(i.item));
        const runeIcon = (id: RuneId) => ({ name: RUNES[id].name.replace(" rune", ""), objId: RUNES[id].objId, color: RUNES[id].color, have: (hero.runes[id] ?? 0) > 0 });
        return {
            words: RUNEWORDS.map((w) => ({
                id: w.id,
                name: w.name,
                runes: w.runes.map(runeIcon),
                fits: `${w.runes.length} sockets · ${w.slots.map((s) => SLOT_NAMES[s].toLowerCase()).join(", ")}${w.kinds ? ` (${w.kinds.map((k) => (k === "melee" ? "melee weapons" : k === "bow" ? "bows" : "staves")).join(", ")})` : ""}`,
                level: w.level,
                lines: statLines(w.stats),
                powers: runewordPowers(w),
                lore: w.lore,
                short: runesShort(hero, w),
            })),
            bases: plain.map((i) => ({ key: i.key, target: i.target, item: this.itemView(i.item), where: i.where, why: Object.fromEntries(RUNEWORDS.map((w) => [w.id, runewordWhyNot(i.item, w)])) })),
            circle: {
                runes: RUNE_IDS.filter((id) => nextRune(id) && (hero.runes[id] ?? 0) > 0).map((id) => {
                    const to = nextRune(id)!;
                    return { id, name: RUNES[id].name, objId: RUNES[id].objId, count: hero.runes[id] ?? 0, to: RUNES[to].name, toObjId: RUNES[to].objId };
                }),
                herbs: GOOD_IDS.filter((id) => !GOODS[id].currency && nextHerb(id) && (hero.goods[id] ?? 0) > 0).map((id) => {
                    const to = nextHerb(id)!;
                    return { id, name: GOODS[id].name, objId: GOODS[id].objId, count: hero.goods[id] ?? 0, to: GOODS[to].name, toObjId: GOODS[to].objId };
                }),
                riftstones: riftstoneDepths(hero),
                rejuv: rejuvWhyNot(hero),
                chicken: chickenKnown(hero) ? { why: chickenWhyNot(hero) } : undefined,
                elite: items
                    .filter((i) => i.item.rarity === "normal" && !i.item.runeword && eliteOf(i.item))
                    .map((i) => ({ key: i.key, target: i.target, item: this.itemView(i.item), where: i.where, to: eliteOf(i.item)?.name, why: eliteWhyNot(hero, i.item) })),
                upgrades: items.flatMap((i) =>
                    i.item.rarity !== "unique"
                        ? []
                        : UPGRADES.flatMap((up, n) => {
                              const to = UNIQUE_BY_ID.get(up.to);
                              return up.from !== i.item.base || !to ? [] : [{ key: `${i.key}:${n}`, target: i.target, up: n, item: this.itemView(i.item), where: i.where, to: to.name, toObjId: to.objId, takes: upgradeTakes(i.item, up), why: upgradeWhyNot(hero, i.item, up) }];
                          }),
                ),
                makes: MAKES.flatMap((make, n) => {
                    const u = UNIQUE_BY_ID.get(make.to);
                    return !u || !makeKnown(hero, make) ? [] : [{ make: n, name: u.name, objId: u.objId, takes: makeTakes(make), why: makeWhyNot(hero, make) }];
                }),
                texts: (Object.keys(CIRCLE_TEXT) as CircleRecipe[]).map((r) => CIRCLE_TEXT[r]),
            },
        };
    }

    // The Apothecary's bench: every potion in the belt and the pack, with what brewing it up and
    // instilling it would take, and the elixirs and what each needs
    private apothecaryView(): ApothecaryView {
        const hero = this.hero!;
        const potions: ApothecaryView["potions"] = [];
        const add = (item: Item | null, target: { belt: number } | { index: number }, where: string) => {
            const def = item ? potionDef(item) : undefined;
            if (!item || !def) {
                return;
            }
            const brew = brewUpCost(hero, item);
            const cost = instilCost(def);
            potions.push({
                target,
                where,
                item: this.itemView(item),
                brew: typeof brew === "string" ? { why: brew } : { to: brew.to, herb: GOODS[brew.herb].name, count: brew.count, gold: brew.gold, why: hero.level < brew.level ? `You need to be level ${brew.level} to use a ${brew.to}.` : goodsOf(hero, brew.herb) < brew.count ? `It needs ${brew.count} × ${GOODS[brew.herb].name}.` : hero.gold < brew.gold ? `It costs ${brew.gold} gold.` : undefined },
                instil: { herb: GOODS[cost.herb].name, count: cost.count, gold: cost.gold, why: instilWhyNot(hero, item), now: item.instil ? INSTIL_NAMES[item.instil] : undefined },
            });
        };
        hero.potions.forEach((item, belt) => add(item, { belt }, `Belt ${belt + 1}`));
        hero.inventory.forEach((item, index) => add(item, { index }, "In your pack"));
        const elixirs = ELIXIR_IDS.map((id) => {
            const e = ELIXIRS[id];
            const short = goodsOf(hero, e.herb) < e.count ? `It needs ${e.count} × ${GOODS[e.herb].name}.` : hero.gold < e.gold ? `It costs ${e.gold} gold.` : undefined;
            return { id, name: e.name, objId: e.objId, text: `${statText({ stat: e.stat, value: e.value })}, and ${Math.round(ELIXIR_XP * 100)}% more experience`, herb: GOODS[e.herb].name, count: e.count, gold: e.gold, why: short };
        });
        // Her errand for the next place of the belt, if there's one left
        const errand = beltErrand(hero);
        const belt: ApothecaryView["belt"] = errand && {
            place: beltPlaces(hero),
            name: BELT_PLACE_NAMES[beltPlaces(hero)],
            good: { name: GOODS[errand.good].name, objId: GOODS[errand.good].objId, color: GOODS[errand.good].color, have: goodsOf(hero, errand.good) > 0, from: `${BOSSES[errand.boss].name} drops it, at the end of rift ${errand.depth}` },
            herb: { name: GOODS[errand.herb].name, objId: GOODS[errand.herb].objId, count: errand.count, have: goodsOf(hero, errand.herb) },
            gold: errand.gold,
            why: stitchWhyNot(hero),
        };
        return {
            potions,
            elixirs,
            minutes: Math.round(ELIXIR_SECONDS / 60),
            elixir: hero.elixir ? { name: ELIXIRS[hero.elixir.id].name, minutes: Math.ceil(hero.elixir.left / 60) } : undefined,
            belt,
            beltPlaces: beltPlaces(hero),
        };
    }

    // The next place of the belt stitched on at the Apothecary's, for her errand: a reward for a
    // lap, so it's marked as one, with the level-up's fireworks over the hero
    stitchBelt(): void {
        const hero = this.hero;
        if (!hero || this.shopId !== "apothecary") {
            return;
        }
        const place = stitchBelt(hero);
        if (typeof place === "string") {
            this.denied(place);
            return;
        }
        this.sfx(SOUND.uniqueDrop, { volume: 0.4 });
        const h = this.game?.hero;
        if (h) {
            this.spot(LEVEL_UP_SPOT, h.x, h.y, 0);
        }
        const key = controlLabel(this.settings.keys, POTION_CONTROLS[place]);
        this.store.toast(`${SHOPS.apothecary.keeper}: "There. A ${BELT_PLACE_NAMES[place]} place on your belt, and any potion goes in it."`, 6000, "good");
        this.store.toast(`Your belt holds ${place + 1} potions now: drink the ${BELT_PLACE_NAMES[place]} with ${key}.`, 8000, "loot", "#ffd040");
        this.potionsChanged();
    }

    // A potion brewed up a grade at the Apothecary's
    brewPotion(target: { belt: number } | { index: number }): void {
        const hero = this.hero;
        const item = hero ? targetItem(hero, target) : undefined;
        if (!hero || !item || this.shopId !== "apothecary") {
            return;
        }
        const was = itemInfo(item).name;
        const why = brewUp(hero, item);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        this.store.toast(`${SHOPS.apothecary.keeper}: "${was}, brewed up: it's ${itemInfo(item).name} now."`, 3500, "good");
        this.potionsChanged();
    }

    // A potion instilled at the Apothecary's: it drinks itself when something happens
    instilPotion(target: { belt: number } | { index: number }): void {
        const hero = this.hero;
        const item = hero ? targetItem(hero, target) : undefined;
        if (!hero || !item || this.shopId !== "apothecary") {
            return;
        }
        const result = instil(hero, item);
        if (!INSTILS.includes(result as Instil)) {
            this.denied(result);
            return;
        }
        this.sfx(SOUND.godSpell, { volume: 0.22, rate: 1.4 });
        this.store.toast(`${itemInfo(item).name}: ${INSTIL_TEXT[result as Instil].toLowerCase()}.`, 3500, "good");
        this.potionsChanged();
    }

    // An elixir made and drunk at the Apothecary's, for the rifts ahead
    drinkElixir(id: ElixirId): void {
        const hero = this.hero;
        if (!hero || this.shopId !== "apothecary") {
            return;
        }
        const why = drinkElixir(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3, rate: 0.7 });
        this.store.toast(`You drink the ${ELIXIRS[id].name}. It'll last ${Math.round(ELIXIR_SECONDS / 60)} minutes in the rifts.`, 3500, "good");
        this.game?.refreshStats();
        this.potionsChanged();
    }

    private potionsChanged(): void {
        this.packVersion++;
        this.updatePack();
        this.updateHud();
        this.save();
    }

    // A rune off Aubury's counter
    buyRune(id: RuneId): void {
        const hero = this.hero;
        if (!hero || !this.shopId || !SHOPS[this.shopId].runes) {
            return;
        }
        const why = buyRune(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 1.05 });
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    // A set's piece off a stall in the strangers' camp, for its money
    buySetPiece(piece: string): void {
        const hero = this.hero;
        if (!hero || !this.shopId || !SHOPS[this.shopId].sets) {
            return;
        }
        const got = buySetPiece(hero, this.shopId, piece);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        this.store.toast(`You buy the ${itemInfo(got).name}.`, 3000, "loot", SET_COLOR);
        this.benchDone(false);
    }

    // A runeword inscribed at Aubury's (sim/runewords.ts)
    inscribe(target: RuneTarget, word: string): void {
        const hero = this.hero;
        if (!hero || !this.shopId || !SHOPS[this.shopId].runes) {
            return;
        }
        const got = inscribe(hero, target, word);
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        this.sfx(SOUND.godSpell, { volume: 0.25, rate: 1.2 });
        this.store.toast(`Aubury inscribes ${itemInfo(got).name}.`, 3500, "loot", RUNEWORD_COLOR);
        this.benchDone("slot" in target);
    }

    // One of the transmuting circle's recipes (sim/circle.ts)
    transmute(
        recipe:
            | { kind: "runes"; id: RuneId }
            | { kind: "herbs"; id: GoodId }
            | { kind: "riftstones"; depth: number }
            | { kind: "rejuv" }
            | { kind: "elite"; target: RuneTarget }
            | { kind: "chicken" }
            | { kind: "upgrade"; target: RuneTarget; up: number }
            | { kind: "make"; make: number },
    ): void {
        const hero = this.hero;
        if (!hero || !this.shopId || !SHOPS[this.shopId].runes) {
            return;
        }
        let got: Item | string | undefined;
        switch (recipe.kind) {
            case "runes":
                got = transmuteRune(hero, recipe.id);
                break;
            case "herbs":
                got = transmuteHerb(hero, recipe.id);
                break;
            case "riftstones":
                got = transmuteRiftstones(hero, recipe.depth);
                break;
            case "rejuv":
                got = transmuteRejuv(hero);
                break;
            case "elite":
                got = transmuteElite(hero, recipe.target);
                break;
            case "chicken":
                got = this.layChicken(hero);
                break;
            case "upgrade":
                got = UPGRADES[recipe.up] ? transmuteUpgrade(hero, recipe.target, UPGRADES[recipe.up]) : "There's no such recipe.";
                break;
            case "make":
                got = MAKES[recipe.make] ? transmuteMake(hero, MAKES[recipe.make]) : "There's no such recipe.";
                break;
        }
        if (typeof got === "string") {
            this.denied(got);
            return;
        }
        if (recipe.kind === "chicken") {
            return;
        }
        this.sfx(SOUND.godSpell, { volume: 0.2, rate: 0.85 });
        this.benchDone((recipe.kind === "elite" || recipe.kind === "upgrade") && "slot" in recipe.target);
    }

    // Diablo II's secret level: the makings laid in the circle, and the way to the Coop opens in the
    // tear at the deepest the hero's reached (content/pinnacles.ts chicken)
    private layChicken(hero: Hero): string | undefined {
        const game = this.game;
        if (!game || !game.town || !this.city) {
            return "Lay them in the circle in the city.";
        }
        const why = layChicken(hero);
        if (why) {
            return why;
        }
        this.sfx(SOUND.godSpell, { volume: 0.25, rate: 0.6 });
        this.packVersion++;
        this.openWay(Math.max(1, hero.maxDepth), [], "chicken");
        this.store.toast("Something in the circle clucks. A way opens in the tear.", 5000, "good");
        return undefined;
    }

    // After work at a bench: what's worn may have changed, and the pack and shop show it
    private benchDone(worn: boolean): void {
        if (worn) {
            this.game?.refreshStats();
        }
        this.packVersion++;
        this.updatePack();
        this.updateHud();
        this.save();
    }

    // A rune from the pouch, on something in the pack or worn
    useRune(id: RuneId, target: RuneTarget): void {
        const game = this.game;
        if (!game || !this.hero) {
            return;
        }
        const before = targetItem(this.hero, target);
        const was = before ? itemInfo(before).name : "";
        const result = game.useRune(id, target);
        if (typeof result === "string") {
            this.denied(result);
            return;
        }
        const now = itemInfo(result);
        this.sfx(SOUND.godSpell, { volume: 0.22, rate: 1.6 });
        const what =
            id === "death"
                ? `an affix gone from ${now.name}`
                : id === "cosmic"
                  ? `an affix added to ${now.name}`
                  : id === "soul"
                    ? `${now.name}'s numbers rolled again`
                    : now.name === was
                      ? `${now.name}, rolled again`
                      : `${was} is now ${now.name}`;
        this.store.toast(`${RUNES[id].name}: ${what}.`, 3000, "loot", RARITY_COLOR[result.rarity]);
        if ("slot" in target) {
            this.gearChanged();
        } else {
            this.packVersion++;
            this.updatePack();
        }
    }

    // ---- The banker's stash ----

    // From the pack into a tab of the stash
    stash(index: number, tab: number): void {
        const hero = this.hero;
        if (!hero || this.store.getSnapshot().panel !== "stash") {
            return;
        }
        const why = toStash(hero, index, tab);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.pickup, { volume: 0.25, rate: 0.9 });
        this.packVersion++;
        this.updatePack();
    }

    // From the stash into the pack
    unstash(index: number): void {
        const hero = this.hero;
        if (!hero || this.store.getSnapshot().panel !== "stash") {
            return;
        }
        const why = fromStash(hero, index);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.pickup, { volume: 0.25, rate: 1.1 });
        this.packVersion++;
        this.updatePack();
    }

    buy(index: number): void {
        const game = this.game;
        const id = this.shopId;
        const shelf = id && this.stock ? this.stock[id] : undefined;
        const offer = shelf?.[index];
        if (!game || !shelf || !offer) {
            return;
        }
        const result = game.buy(offer);
        if (typeof result === "string") {
            this.denied(result);
            return;
        }
        shelf.splice(index, 1);
        this.sfx(SOUND.coins, { volume: 0.3 });
        this.store.toast(`Bought ${itemInfo(result).name} for ${offer.price} gold.`, 3000, "loot", RARITY_COLOR[result.rarity]);
        this.packVersion++;
        this.updateShop();
        this.updatePack();
        this.updateHud();
    }

    // ---- The pack, and selling and gambling ----

    equip(index: number): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game) {
            return;
        }
        const item = hero.inventory[index];
        if (item && item.rarity === "gem") {
            // A gem goes into the best free socket for it
            const why = autoSocket(hero, index);
            if (why) {
                this.denied(why);
                return;
            }
            this.sfx(SOUND.click, { volume: 0.3, rate: 1.2 });
            this.gearChanged();
            return;
        }
        const result = equipFrom(hero, index);
        if (typeof result === "string") {
            this.denied(result);
            return;
        }
        // Gems that had no socket to go to stay in what came off
        const off = hero.inventory[index];
        const left = off?.sockets?.filter((s) => s.gem).length ?? 0;
        if (off && left > 0) {
            this.store.toast(`${left} ${left === 1 ? "gem stays" : "gems stay"} in ${itemInfo(off).name}: no socket of ${left === 1 ? "its" : "their"} colour.`, 3500, "warn");
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.gearChanged();
    }

    // Something in the pack dragged onto a worn slot: worn, if it's that slot's
    equipInto(index: number, slot: Slot): void {
        const item = this.hero?.inventory[index];
        if (!item || item.rarity === "gem") {
            return;
        }
        const info = itemInfo(item);
        if (info.slot !== slot) {
            this.denied(`${info.name} goes in the ${SLOT_NAMES[info.slot].toLowerCase()} slot.`);
            return;
        }
        this.equip(index);
    }

    // A potion in the pack put in a place in the belt (dragged there), and what was there into the
    // pack
    beltInto(index: number, place: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = toBelt(hero, index, place);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3, rate: 0.9 });
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    // A potion out of the belt into the pack: at the place it's dragged to, if it's free
    beltTo(place: number, index?: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const there = index !== undefined ? hero.inventory[index] : null;
        if (there && potionDef(there)) {
            this.beltInto(index!, place);
            return;
        }
        const why = fromBelt(hero, place, index);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    // Something in the pack dragged onto another place in it: the two change places
    movePack(from: number, to: number): void {
        const hero = this.hero;
        if (!hero || from === to || from < 0 || to < 0 || from >= hero.inventory.length || to >= hero.inventory.length) {
            return;
        }
        const inv = hero.inventory;
        [inv[from], inv[to]] = [inv[to], inv[from]];
        this.sfx(SOUND.click, { volume: 0.2, rate: 1.1 });
        this.packVersion++;
        this.updatePack();
    }

    // Something worn dragged into the pack: onto an empty place, it goes there; onto something
    // for the same slot, the two change places; anywhere else, the first free place
    unequipTo(slot: Slot, index: number): void {
        const hero = this.hero;
        const worn = hero?.equipment[slot];
        if (!hero || !worn) {
            return;
        }
        const there = hero.inventory[index];
        if (there && there.rarity !== "gem" && itemInfo(there).slot === slot) {
            this.equip(index);
            return;
        }
        const why = unequip(hero, slot);
        if (why) {
            this.denied(why);
            return;
        }
        const at = hero.inventory.indexOf(worn);
        if (!there && at >= 0 && at !== index) {
            hero.inventory[at] = null;
            hero.inventory[index] = worn;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.gearChanged();
    }

    // ---- Gems and the skill bar ----

    // A gem from the pack into a socket of something worn
    socketInto(invIndex: number, slot: Slot, socketIndex: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = socketGem(hero, invIndex, slot, socketIndex);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3, rate: 1.2 });
        this.gearChanged();
    }

    // A gem out of a socket and into the pack
    unsocket(slot: Slot, socketIndex: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = unsocketGem(hero, slot, socketIndex);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3, rate: 0.9 });
        this.gearChanged();
    }

    // The skills that could go on a button, in its picker
    openPicker(button: number): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game) {
            return;
        }
        if (this.store.getSnapshot().picker?.button === button) {
            this.store.set({ picker: undefined });
            return;
        }
        const choices: SkillChoice[] = skillChoices(hero, game.stats).map((r) => {
            const on = hero.skillBar.indexOf(r.ref);
            return {
                ref: r.ref,
                name: r.def.name,
                icon: r.def.icon,
                level: r.level,
                supports: r.supportedBy,
                why: r.why,
                on: on >= 0 ? this.skillKeyName(on) : r.ref === BASIC && hero.skillBar[0] === null ? SKILL_KEYS[0] : undefined,
            };
        });
        this.store.set({ picker: { button, choices } });
    }

    // A skill onto a button (null empties it)
    bindButton(button: number, ref: number | null): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        bindSkill(hero, button, ref);
        this.store.set({ picker: undefined });
        this.sfx(SOUND.click, { volume: 0.3 });
        this.game?.refreshStats();
        this.packVersion++;
        this.updateHud();
    }

    // Work on the sockets of something worn, at the gem trader's
    socketWork(slot: Slot, work: SocketWork): void {
        const game = this.game;
        if (!game || !this.hero) {
            return;
        }
        const why = game.socketWork(slot, work);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 1.1 });
        this.store.toast(`${SHOPS.gems.keeper}: "${SOCKET_WORK[work].name}, done."`, 2200, "good");
        this.gearChanged();
    }

    // ---- The passive tree ----

    setTree(open: boolean): void {
        if (open) {
            this.store.set({ picker: undefined });
            this.updateTree();
            this.leftDown = this.rightDown = false;
        } else {
            this.store.set({ tree: undefined });
            this.save();
        }
    }

    allocatePassive(id: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = allocate(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.35, rate: 1.3 });
        this.passivesChanged();
    }

    refundPassive(id: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = refund(hero, id);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.25, rate: 0.8 });
        this.passivesChanged();
    }

    resetPassives(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = resetTree(hero);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.8 });
        this.passivesChanged();
    }

    // A talisman from the pack into a socket on the tree (talismans.ts)
    socketTalisman(socket: number, index: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = socketTalisman(hero, socket, index);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.35, rate: 1.1 });
        this.passivesChanged();
        this.updatePack();
    }

    // A socket's talisman out into the pack
    unsocketTalisman(socket: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = unsocketTalisman(hero, socket);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3, rate: 0.9 });
        this.passivesChanged();
        this.updatePack();
    }

    // Aubury's enchanting: a notable of the tree on a ring or an amulet (enchant.ts)
    enchant(target: RuneTarget, node: number): void {
        const hero = this.hero;
        if (!hero || !this.shopId || !SHOPS[this.shopId].runes) {
            return;
        }
        const why = enchantItem(hero, target, node);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 1.05 });
        if ("slot" in target) {
            this.game?.refreshStats();
        }
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    private passivesChanged(): void {
        this.game?.refreshStats();
        this.packVersion++;
        this.updateTree();
        this.updateHud();
    }

    private updateTree(): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const tree: TreeView = {
            cls: hero.cls,
            taken: [...hero.passives],
            points: pointsLeft(hero),
            total: passivePoints(hero),
            refundCost: refundCost(hero),
            resetCost: resetCost(hero),
            gold: hero.gold,
            summary: summarise(passiveStats(hero).stats),
            talismans: Object.fromEntries(Object.entries(hero.talismans).map(([id, item]) => [Number(id), this.itemView(item)])),
            packTalismans: hero.inventory.flatMap((item, index) => (item && isTalisman(item) ? [{ index, item: this.itemView(item) }] : [])),
            fields: Object.entries(hero.talismans).flatMap(([id, item]) => {
                const u = item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base) : undefined;
                return u?.talisman?.radius && hero.passives.includes(Number(id)) ? [{ socket: Number(id), radius: u.talisman.radius, power: u.talisman.power }] : [];
            }),
            omni: omniOf(hero.talismans),
            freeReset: freeReset(hero),
        };
        this.store.set({ tree });
    }

    unequipSlot(slot: Slot): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = unequip(hero, slot);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.gearChanged();
    }

    private gearChanged(): void {
        this.game?.refreshStats();
        void this.assets.loadHero(this.hero!);
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    sell(index: number): void {
        const game = this.game;
        if (!game) {
            return;
        }
        const gold = game.sell(index);
        if (typeof gold === "string") {
            this.denied(gold);
            return;
        }
        if (gold > 0) {
            this.sfx(SOUND.coins, { volume: 0.3 });
            this.packVersion++;
            this.updatePack();
            this.updateHud();
        }
    }

    gamble(slot: Slot, elite = false): void {
        const game = this.game;
        if (!game) {
            return;
        }
        const result = game.gamble(slot, elite);
        if (typeof result === "string") {
            this.denied(result);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.3, rate: 0.9 });
        const info = itemInfo(result);
        this.store.toast(`${SHOPS.general.keeper} hands you ${info.name}.`, 3500, "loot", RARITY_COLOR[result.rarity]);
        this.packVersion++;
        this.updatePack();
        this.updateHud();
    }

    // Out of the pack and onto the ground
    discard(index: number): void {
        const game = this.game;
        if (!game) {
            return;
        }
        if (game.dropItem(index)) {
            this.sfx(SOUND.pickup, { volume: 0.25, rate: 0.8 });
            this.packVersion++;
            this.updatePack();
        } else if (this.hero?.inventory[index]) {
            this.denied("There's no room in your pack for its gems.");
        }
    }

    private denied(text: string): void {
        this.sfx(SOUND.denied, { volume: 0.3 });
        this.store.toast(text, 2200, "warn");
    }

    // ---- Keys ----

    private onPress(code: string): void {
        const state = this.store.getSnapshot();
        if (state.screen === "title" && code === "Escape") {
            if (state.changelog) {
                this.setChangelog(false);
            } else {
                this.titleBack();
            }
            return;
        }
        if (state.screen !== "play" || !this.game) {
            return;
        }
        if (code === "Escape") {
            if (state.picker) {
                this.store.set({ picker: undefined });
            } else if (state.tree) {
                this.setTree(false);
            } else if (state.help) {
                this.closeHelp();
            } else if (state.panel) {
                this.setPanel(undefined);
            } else {
                this.setMenu(!state.menu);
            }
            return;
        }
        const control = controlOf(this.settings.keys, code);
        if (control === "tree") {
            if (!state.menu) {
                this.setTree(!state.tree);
            }
            return;
        }
        if (state.menu || state.tree) {
            return;
        }
        const tap = control ? SKILL_CONTROLS.indexOf(control) : -1;
        if (tap >= 0) {
            this.skillTaps[tap + 2] = true;
        }
        const drink = control ? POTION_CONTROLS.indexOf(control) : -1;
        if (drink >= 0) {
            this.potion = drink;
        } else if (control === "pack") {
            this.setPanel(state.panel === "inventory" ? undefined : "inventory");
        } else if (control === "map") {
            // The overlay map, over the world; a panel open is shut so it can be seen
            this.bigMap = !this.bigMap;
            if (this.bigMap && state.panel) {
                this.setPanel(undefined);
            }
        } else if (control === "help") {
            this.store.set({ help: !state.help });
        } else if (control === "teleport") {
            this.startTeleport();
        } else if (control === "labels") {
            // Loot's names on the ground, or only the one the mouse is over
            const labels = !this.settings.labels;
            this.setSettings({ labels });
            this.store.toast(labels ? "Showing loot's names." : "Hiding loot's names: point at loot to see it.", 2200);
        } else if (control === "pickUp") {
            this.pickNearest();
        }
    }

    // The nearest thing on the ground within a few tiles
    private pickNearest(): void {
        const game = this.game!;
        const h = game.hero;
        let best: Drop | undefined;
        let bestD = 6;
        for (const d of game.drops) {
            const dist = Math.hypot(d.x - h.x, d.y - h.y);
            if (dist < bestD) {
                bestD = dist;
                best = d;
            }
        }
        if (best) {
            this.command = { kind: "pick", uid: best.uid };
        }
    }

    // ---- The mouse ----

    private toCanvas(clientX: number, clientY: number): { x: number; y: number } {
        const rect = this.overlay.canvas.getBoundingClientRect();
        const sx = this.overlay.width / Math.max(rect.width, 1);
        const sy = this.overlay.height / Math.max(rect.height, 1);
        return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    }

    // Where on the ground the mouse is, in world tiles: a ray from the camera, met with the
    // ground's height a few times over
    private groundAt(clientX: number, clientY: number): { x: number; y: number } | undefined {
        const camera = this.camera;
        const grid = this.grid;
        if (!camera || !grid || !mat4.invert(this.invViewProj, camera.viewProjMatrix)) {
            return undefined;
        }
        const { x, y } = this.toCanvas(clientX, clientY);
        const nx = (x / Math.max(this.overlay.width, 1)) * 2 - 1;
        const ny = 1 - (y / Math.max(this.overlay.height, 1)) * 2;
        vec4.set(this.near, nx, ny, -1, 1);
        vec4.set(this.far, nx, ny, 1, 1);
        vec4.transformMat4(this.near, this.near, this.invViewProj);
        vec4.transformMat4(this.far, this.far, this.invViewProj);
        const ax = this.near[0] / this.near[3];
        const ay = this.near[1] / this.near[3];
        const az = this.near[2] / this.near[3];
        const bx = this.far[0] / this.far[3];
        const by = this.far[1] / this.far[3];
        const bz = this.far[2] / this.far[3];
        let h = this.height(this.focusX, this.focusY);
        let hit: { x: number; y: number } | undefined;
        for (let i = 0; i < 4; i++) {
            const t = (h - ay) / (by - ay);
            if (!Number.isFinite(t) || t < 0) {
                return hit;
            }
            hit = { x: ax + (bx - ax) * t, y: az + (bz - az) * t };
            h = this.height(hit.x, hit.y);
        }
        return hit;
    }

    private onContextMenu = (e: Event) => e.preventDefault();

    private onPointerLeave = () => {
        this.pointer.inside = false;
    };

    private onCanvasMove = (e: PointerEvent) => {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.inside = true;
        this.pointer.seen = true;
    };

    // Over the screens too: the skills on keys still go where the mouse is
    private onPointerMove = (e: PointerEvent) => {
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.seen = true;
        this.stage?.dragTo(e.clientX);
    };

    private standing(): boolean {
        return this.held("stand");
    }

    private onPointerDown = (e: PointerEvent) => {
        this.onCanvasMove(e);
        const state = this.store.getSnapshot();
        const game = this.game;
        if (state.screen === "title") {
            this.titlePointerDown(e);
            return;
        }
        if (state.screen !== "play" || !game || state.menu || state.help || state.tree || game.hero.dead) {
            return;
        }
        if (state.picker) {
            this.store.set({ picker: undefined });
            return;
        }
        this.renderer.canvas.setPointerCapture?.(e.pointerId);
        // What's under the mouse now, not as the last frame had it
        this.aim = this.groundAt(e.clientX, e.clientY) ?? this.aim;
        this.updateHover();
        if (e.button === 2) {
            this.rightDown = true;
            this.skillTaps[1] = true;
            return;
        }
        if (e.button !== 0) {
            return;
        }
        this.leftDown = true;
        this.leftTarget = -1;
        this.leftWalk = false;
        this.readMove(this.move);
        if (this.move.x !== 0 || this.move.y !== 0) {
            this.keysAt = performance.now();
        }
        // (Not in town, where there are no skills and a click is always a walk)
        this.leftInPlace = !game.town && performance.now() - this.keysAt < KEYS_GRACE_MS;
        if (this.standing()) {
            // Shift: the left button's skill where the mouse is, at the monster under it if
            // there's one, and the hero stays put
            this.leftTarget = this.hoverMonster;
            this.skillTaps[0] = true;
            return;
        }
        if (this.hoverDrop >= 0) {
            this.command = { kind: "pick", uid: this.hoverDrop };
            this.leftDown = false;
        } else if (this.leftInPlace && (this.hoverMonster >= 0 || (this.hoverPerson < 0 && this.hoverFeature < 0 && !this.hoverWaystone && !this.hoverPortal && !this.hoverOrrery))) {
            // Walking on the keys: the left button's skill, at the monster under the mouse if
            // there's one, never a walk
            this.leftTarget = this.hoverMonster;
            this.skillTaps[0] = true;
        } else if (this.hoverMonster >= 0) {
            this.leftTarget = this.hoverMonster;
            this.clickTarget = this.hoverMonster;
        } else if (this.hoverPerson >= 0) {
            this.command = { kind: "talk", uid: this.hoverPerson };
            this.leftDown = false;
        } else if (this.hoverFeature >= 0) {
            this.command = { kind: "feature", uid: this.hoverFeature };
            this.leftDown = false;
        } else if (this.hoverWaystone) {
            this.command = { kind: "waystone" };
            this.leftDown = false;
        } else if (this.hoverPortal) {
            this.command = { kind: "portal" };
            this.leftDown = false;
        } else if (this.hoverOrrery) {
            this.command = { kind: "orrery" };
            this.leftDown = false;
        } else {
            this.leftWalk = true;
            this.clickWalk = true;
            if (this.aim) {
                this.marker = { x: this.aim.x, y: this.aim.y, start: performance.now() };
            }
        }
    };

    private onPointerUp = (e: PointerEvent) => {
        this.stage?.endDrag();
        if (e.button === 2) {
            this.rightDown = false;
        } else if (e.button === 0) {
            this.leftDown = false;
            this.leftTarget = -1;
            this.leftWalk = false;
        }
    };

    // On the title: a class in the line picked, or a hero alone turned by dragging
    private titlePointerDown(e: PointerEvent): void {
        const state = this.store.getSnapshot();
        if (e.button !== 0 || state.generating || !this.stage) {
            return;
        }
        if (state.titleStep === "class") {
            const cls = this.classUnder(e.clientX, e.clientY);
            if (cls) {
                this.pickClass(cls);
            }
            return;
        }
        this.renderer.canvas.setPointerCapture?.(e.pointerId);
        this.stage.startDrag(e.clientX);
    }

    private classUnder(clientX: number, clientY: number): ClassId | undefined {
        if (!this.stage || this.assets.lineup.size === 0) {
            return undefined;
        }
        const { x, y } = this.toCanvas(clientX, clientY);
        const pad = HIT_PAD * uiScale(this.settings.uiSize) * pixelRatio;
        return this.stage.pickAt((wx, wy, radius, tall) => this.boxDistance(x, y, wx, wy, radius, tall, pad));
    }

    // What's under the mouse. A loot label first, as it's drawn over everything; then a monster,
    // as fighting comes first; then the nearest of what's on the ground, someone in the city, the
    // waystone and the portal. Each is a box round its model on screen, and where boxes overlap,
    // the one whose middle the mouse is nearest wins.
    private updateHover(): void {
        this.hoverMonster = -1;
        this.hoverDrop = -1;
        this.hoverPerson = -1;
        this.hoverFeature = -1;
        this.hoverWaystone = false;
        this.hoverPortal = false;
        this.hoverOrrery = false;
        const game = this.game;
        if (!game || !this.pointer.inside) {
            return;
        }
        const { x, y } = this.toCanvas(this.pointer.x, this.pointer.y);
        for (let i = this.labels.length - 1; i >= 0; i--) {
            const l = this.labels[i];
            if (x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) {
                this.hoverDrop = l.drop.uid;
                return;
            }
        }
        const pad = HIT_PAD * uiScale(this.settings.uiSize) * pixelRatio;
        const a = this.alpha();
        const h = game.hero;
        let best = Infinity;
        for (const m of game.monsters) {
            if (m.state === "dead" || Math.abs(m.x - h.x) > 40 || Math.abs(m.y - h.y) > 40) {
                continue;
            }
            const look = this.assets.monsters.get(m.def.look ?? m.def.id);
            const radius = look ? (look.model.radius / 128) * look.scale * m.size : m.radius;
            const tall = (look?.height ?? 1.5) * m.size;
            const d = this.boxDistance(x, y, m.prevX + (m.x - m.prevX) * a, m.prevY + (m.y - m.prevY) * a, radius, tall, pad);
            if (d < best) {
                best = d;
                this.hoverMonster = m.uid;
            }
        }
        if (this.hoverMonster >= 0) {
            return;
        }
        let kind: "drop" | "person" | "feature" | "waystone" | "portal" | "orrery" | undefined;
        let uid = -1;
        for (const drop of game.drops) {
            if (Math.abs(drop.x - h.x) > 30 || Math.abs(drop.y - h.y) > 30) {
                continue;
            }
            const model = this.assets.item(dropObj(drop));
            const radius = model ? model.radius / 128 : 0.3;
            const tall = Math.max(0.3, model ? model.height / 128 : 0.3);
            const d = this.boxDistance(x, y, drop.x, drop.y, radius, tall, pad);
            if (d < best) {
                best = d;
                kind = "drop";
                uid = drop.uid;
            }
        }
        for (const p of game.people) {
            const model = this.assets.people.get(p.npcId);
            const radius = model ? model.radius / 128 : 0.5;
            const d = this.boxDistance(x, y, p.prevX + (p.x - p.prevX) * a, p.prevY + (p.y - p.prevY) * a, radius, this.personHeight(p), pad);
            if (d < best) {
                best = d;
                kind = "person";
                uid = p.uid;
            }
        }
        for (const f of game.features) {
            if (f.used || Math.abs(f.x - h.x) > 30 || Math.abs(f.y - h.y) > 30) {
                continue;
            }
            const model = this.assets.locs.get(featureLoc(f));
            const radius = model ? Math.min(2, model.radius / 128) : 0.6;
            const tall = Math.max(0.5, model ? model.height / 128 : 1);
            const d = this.boxDistance(x, y, f.x, f.y, radius, tall, pad);
            if (d < best) {
                best = d;
                kind = "feature";
                uid = f.uid;
            }
        }
        const portal = this.assets.portal;
        const portalRadius = portal ? portal.radius / 128 : 1;
        const portalTall = portal ? portal.height / 128 : 2.2;
        if (!game.town) {
            const w = game.layout.waystone;
            const d = this.boxDistance(x, y, w.x, w.y, portalRadius * WAYSTONE_SCALE, portalTall * WAYSTONE_SCALE, pad);
            if (d < best) {
                best = d;
                kind = "waystone";
            }
        }
        // The orrery, in the city: part of its map, so a box round where it stands
        const orrery = game.zone.town?.orrery;
        if (orrery) {
            const d = this.boxDistance(x, y, orrery.x, orrery.y, ORRERY_BOX.radius, ORRERY_BOX.tall, pad);
            if (d < best) {
                best = d;
                kind = "orrery";
            }
        }
        const e = game.layout.exit;
        if (this.boxDistance(x, y, e.x, e.y, portalRadius, portalTall, pad) < best) {
            kind = "portal";
        }
        if (kind === "drop") {
            this.hoverDrop = uid;
        } else if (kind === "person") {
            this.hoverPerson = uid;
        } else if (kind === "feature") {
            this.hoverFeature = uid;
        } else if (kind === "waystone") {
            this.hoverWaystone = true;
        } else if (kind === "portal") {
            this.hoverPortal = true;
        } else if (kind === "orrery") {
            this.hoverOrrery = true;
        }
    }

    private personHeight(p: Person): number {
        const model = this.assets.people.get(p.npcId);
        return model ? Math.max(model.height, 1) / 128 : 1.8;
    }

    // Whether the mouse, at (x, y) on the canvas, is over something standing at (wx, wy): a
    // cylinder `radius` tiles round and `tall` tiles high, its corners projected to a box on
    // screen, `pad` pixels bigger all round. How far from the box's middle the mouse is, 0 there
    // and 1 at its edges' middles; Infinity if it's not over it.
    private boxDistance(x: number, y: number, wx: number, wy: number, radius: number, tall: number, pad: number): number {
        const r = Math.max(HIT_MIN_RADIUS, radius * HIT_RADIUS_SHARE);
        const ground = this.height(wx, wy);
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        const p = this.point;
        for (let i = 0; i < 8; i++) {
            this.overlay.project(wx + (i & 1 ? r : -r), i & 4 ? ground - tall : ground, wy + (i & 2 ? r : -r), p);
            if (p.behind) {
                return Infinity;
            }
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }
        const halfW = (maxX - minX) / 2 + pad;
        const halfH = (maxY - minY) / 2 + pad;
        const dx = (x - (minX + maxX) / 2) / halfW;
        const dy = (y - (minY + maxY) / 2) / halfH;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            return Infinity;
        }
        return Math.sqrt(dx * dx + dy * dy);
    }

    private buildInput(): SimInput {
        const input = this.simInput;
        const game = this.game!;
        this.readMove(this.move);
        input.moveX = this.move.x;
        input.moveY = this.move.y;
        const aim = this.aim;
        input.hasAim = aim !== undefined;
        input.aimX = aim?.x ?? 0;
        input.aimY = aim?.y ?? 0;
        const keys = this.move.x !== 0 || this.move.y !== 0;
        if (keys) {
            this.keysAt = performance.now();
            if (this.leftDown && !game.town) {
                this.leftInPlace = true;
            }
        }
        const standing = this.standing() || (this.leftDown && this.leftInPlace);
        // The left button held on the ground walks towards the mouse, and a monster swept under it
        // on the way is fought, as Diablo's held button does: the button's then on that monster
        if (this.leftDown && this.leftWalk && !standing && !keys && this.hoverMonster >= 0) {
            this.leftWalk = false;
            this.leftTarget = this.hoverMonster;
        }
        // The left button held from a monster: that one till it falls, then the next under the
        // mouse; with none under it, it walks towards the mouse till there is one
        const fighting = this.leftDown && !this.leftWalk;
        if (fighting) {
            const target = this.leftTarget >= 0 ? game.monsterByUid(this.leftTarget) : undefined;
            if (!target || target.state === "dead") {
                this.leftTarget = this.hoverMonster;
            }
        }
        const locked = fighting ? this.leftTarget : -1;
        // Skills aimed at the mouse go for the monster under it, or with Shift the one the left
        // button's on
        input.aimUid = standing && locked >= 0 ? locked : this.hoverMonster;
        if (standing) {
            input.targetUid = -1;
            input.walkTo = false;
        } else if (this.leftDown) {
            input.targetUid = locked >= 0 ? locked : this.clickTarget;
            input.walkTo = this.leftWalk || input.targetUid < 0;
        } else {
            input.targetUid = this.clickTarget;
            input.walkTo = this.clickWalk;
        }
        this.clickTarget = -1;
        this.clickWalk = false;
        input.standing = standing;
        input.skills[0] = this.leftDown || this.skillTaps[0] || input.targetUid >= 0;
        input.skills[1] = this.rightDown || this.skillTaps[1];
        SKILL_CONTROLS.forEach((id, i) => {
            input.skills[i + 2] = this.held(id) || this.skillTaps[i + 2];
        });
        this.skillTaps.fill(false);
        input.command = this.command;
        input.potion = this.potion;
        input.teleport = this.teleport;
        this.command = undefined;
        this.potion = -1;
        this.teleport = false;
        return input;
    }

    // ---- A frame ----

    update(deltaMs: number, camera: Camera): void {
        this.camera = camera;
        const now = performance.now();
        const state = this.store.getSnapshot();
        const game = this.game;
        const playing = state.screen === "play" && game !== undefined && !state.menu && !state.help && !state.tree && !state.generating;
        // The passive tree covers the whole screen and the game waits, so the world isn't drawn
        // under it (from the next frame)
        this.renderer.holdFrame = state.tree !== undefined;
        this.input.pollPads(now, playing ? "run" : "menu");
        const wheel = this.input.takeWheel();
        if (wheel !== 0 && state.screen === "play" && !state.tree) {
            this.targetDistance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, this.targetDistance * Math.pow(1.1, wheel)));
        }
        this.store.expireToasts(now);
        if (this.pointer.seen && this.grid) {
            this.aim = this.groundAt(this.pointer.x, this.pointer.y) ?? this.aim;
        }

        if (playing && game) {
            this.accumulator = Math.min(this.accumulator + deltaMs, TICK_MS * MAX_TICKS_PER_FRAME);
            while (this.accumulator >= TICK_MS && this.game === game) {
                this.accumulator -= TICK_MS;
                game.step(this.buildInput());
                this.handleEvents(game, game.takeEvents(), now);
            }
            this.updateHover();
            this.updateHoverLabel(game);
            const h = game.hero;
            const a = this.alpha();
            this.focusX = h.prevX + (h.x - h.prevX) * a;
            this.focusY = h.prevY + (h.y - h.prevY) * a;
            this.reveal(h.x, h.y);
            if (h.dead) {
                const wait = Math.max(0, HERO.deathSeconds - (game.tick - h.deadTick) / 50);
                if (!this.deathShown || Math.ceil(wait) !== Math.ceil(state.deathWait)) {
                    this.deathShown = true;
                    this.store.set({ deathWait: wait });
                }
            }
            // Walked away from whoever's panel is open
            if (state.panel === "shop" || state.panel === "archmage" || state.panel === "stash") {
                const kind = state.panel === "stash" ? "banker" : "archmage";
                const p = state.panel === "shop" ? this.shopKeeper(game) : game.people.find((q) => q.kind === kind);
                if (!p || Math.hypot(h.x - p.x, h.y - p.y) > HERO.talkReach + 3) {
                    this.setPanel(undefined);
                }
            }
            if (state.panel === "captain") {
                const p = game.people.find((q) => q.kind === "captain");
                if (!p || Math.hypot(h.x - p.x, h.y - p.y) > HERO.talkReach + 3) {
                    this.setPanel(undefined);
                }
            }
            if (state.panel === "task" || state.panel === "quests") {
                const p = game.people.find((q) => q.folk !== undefined && q.folk === this.taskGiver);
                if (!p || Math.hypot(h.x - p.x, h.y - p.y) > HERO.talkReach + 3) {
                    this.setPanel(undefined);
                }
            }
            if (now - this.lastHud > HUD_MS) {
                this.lastHud = now;
                this.updateHud();
            }
            if (now - this.lastSave > SAVE_MS) {
                this.save();
            }
        } else if (state.screen === "title" && this.city && this.place === "city" && this.stage) {
            // Before the portal: the camera eases from step to step (straight there at first)
            const v = this.stage.step(deltaMs, now, state.titleStep, state.pick);
            const k = this.titleTime === 0 ? 1 : Math.min(1, deltaMs / 280);
            this.titleTime += deltaMs / 1000;
            this.focusX += (v.x - this.focusX) * k;
            this.focusY += (v.y - this.focusY) * k;
            this.lift += (v.lift - this.lift) * k;
            this.targetDistance = v.distance;
            this.targetPitch = v.pitch;
            if (k === 1) {
                this.cameraRig.distance = v.distance;
                this.cameraRig.pitch = v.pitch;
            }
            const hover = state.titleStep === "class" && this.pointer.inside && !state.generating ? this.classUnder(this.pointer.x, this.pointer.y) : undefined;
            if (hover !== state.hoverClass) {
                this.store.set({ hoverClass: hover });
            }
            this.renderer.canvas.style.cursor = hover ? "pointer" : this.stage.dragging ? "grabbing" : "";
        }
        this.cameraRig.distance += (this.targetDistance - this.cameraRig.distance) * Math.min(1, deltaMs / 200);
        this.cameraRig.pitch += (this.targetPitch - this.cameraRig.pitch) * Math.min(1, deltaMs / 300);
        this.frameMs = deltaMs;
        const shake = this.juice.shakeOffset(now, deltaMs);
        this.cameraRig.apply(camera, this.focusX + shake.x, this.height(this.focusX, this.focusY) - this.lift, this.focusY + shake.y);
        this.updateLights(deltaMs, now);
    }

    private alpha(): number {
        return Math.min(1, this.accumulator / TICK_MS);
    }

    private height(x: number, y: number): number {
        const grid = this.grid;
        return grid && grid.contains(Math.floor(x), Math.floor(y)) ? grid.getHeight(x, y) / 128 : 0;
    }

    private updateLights(deltaMs: number, now: number): void {
        const city = this.place === "city" ? this.city : undefined;
        const rift = this.place === "rift" ? this.open?.rift : undefined;
        if (!city && !rift) {
            return;
        }
        const light = rift ? riftZone(rift.depth, rift.seed, rift.pinnacle) : CITY_LIGHT;
        const lights = this.lights;
        lights.begin(this.renderer, light.ambient, light.ambientColor, deltaMs / 1000);
        // How far it is from day to dusk, and so how strong every light is, and the hero's lantern
        const dark = Math.min(1, Math.max(0, (DAY - light.ambient) / (DAY - DUSK)));
        const glow = DAY_GLOW + (1 - DAY_GLOW) * dark;
        const offer = (key: number, x: number, y: number, look: LightLook, radius = look.radius, strength = 1): void =>
            lights.offer(key, x, y, radius, look, false, strength * glow);
        const lantern = (x: number, y: number): void => {
            if (dark > 0) {
                lights.offer(lightKey(LIGHT_HERO, 0), x, y, HERO_LIGHT.radius, HERO_LIGHT, true, dark);
            }
        };
        if (city) {
            city.torches.forEach((t, i) => offer(lightKey(LIGHT_TORCH, i), t.x, t.y, TORCH_LIGHT));
            city.runes.forEach((r, i) => offer(lightKey(LIGHT_RUNE, i), r.x, r.y, RUNE_LIGHT));
            city.shards.forEach((s, i) => offer(lightKey(LIGHT_SHARD, i), s.x, s.y, SHARD_LIGHT));
            if (!this.game) {
                // Open on the title, ready for whoever's chosen, and the stage before it lit
                const p = city.plan.portal;
                const title = this.store.getSnapshot().screen === "title";
                offer(lightKey(LIGHT_PORTAL, 0), p.x, p.y, title ? PORTAL_LIGHT : SEALED_LIGHT);
                if (title) {
                    lantern(this.focusX, this.focusY - 1.5);
                }
            }
        }
        const game = this.game;
        if (game) {
            const h = game.hero;
            lantern(this.focusX, this.focusY);
            const e = game.layout.exit;
            offer(lightKey(LIGHT_PORTAL, 0), e.x, e.y, game.portalOpen ? PORTAL_LIGHT : SEALED_LIGHT);
            if (!game.town) {
                const w = game.layout.waystone;
                offer(lightKey(LIGHT_WAYSTONE, 0), w.x, w.y, WAYSTONE_LIGHT);
                // A shrine burns in its god's colour till it's touched
                for (const f of game.features) {
                    if (f.kind === "shrine" && !f.used && Math.abs(f.x - h.x) < 30 && Math.abs(f.y - h.y) < 30) {
                        offer(lightKey(LIGHT_FEATURE, f.uid), f.x, f.y, shrineLight(f));
                    }
                }
            }
            const a = this.alpha();
            for (const p of game.projectiles) {
                const v = p.visual;
                if (v.projectile === undefined || v.projectile === 10 || v.projectile === 12 || v.projectile === 15) {
                    continue;
                }
                const x = p.prevX + (p.x - p.prevX) * a;
                const y = p.prevY + (p.y - p.prevY) * a;
                offer(lightKey(LIGHT_SHOT, p.uid), x, y, p.skill?.freeze ? ICE_LIGHT : SHOT_LIGHT);
            }
            // A pillar's light on the ground under it, in its colour
            for (const d of game.drops) {
                const glory = dropGlory(d);
                if (glory && Math.abs(d.x - h.x) < 30 && Math.abs(d.y - h.y) < 30) {
                    offer(lightKey(LIGHT_DROP, d.uid), d.x, d.y, glory.light);
                }
            }
        }
        if (rift?.fire) {
            offer(lightKey(LIGHT_FIRE, 0), rift.fire.x, rift.fire.y, FIRE_LIGHT);
        }
        // Impacts flare
        for (let i = 0; i < this.effects.length; i++) {
            const e = this.effects[i];
            const t = (now - e.start) / e.ms;
            if (t < 0.6 && i < 8) {
                offer(lightKey(LIGHT_SPOT, Math.round(e.start) + i), e.x, e.y, SHOT_LIGHT, 3, 1 - t / 0.6);
            }
        }
        lights.end(this.renderer, this.focusX, this.focusY);
    }

    // ---- What happens, seen and heard ----

    private handleEvents(game: Game, events: GameEvent[], now: number): void {
        const h = game.hero;
        const store = this.store;
        for (const e of events) {
            switch (e.kind) {
                case "heroHit": {
                    this.splat(-1, true, h.x, h.y, e.amount, "damage", false, now);
                    this.sfxAt(SOUND.heroHit[Math.floor(Math.random() * SOUND.heroHit.length)], h.x, h.y, { volume: 0.3, minGap: 120 });
                    // A hard hit taken shakes the screen, by how much of the hero's life it took
                    const share = e.amount / game.stats.maxLife;
                    if (share > 0.06) {
                        this.juice.shake(Math.min(0.6, share * 1.6));
                    }
                    break;
                }
                case "monsterHit": {
                    const m = game.monsterByUid(e.uid);
                    if (m) {
                        this.splat(m.uid, false, m.x, m.y, e.amount, "damage", e.crit, now);
                        this.impact(game, m, e.fromX, e.fromY, e.share, e.crit, now);
                    }
                    break;
                }
                case "stagger": {
                    const m = game.monsterByUid(e.uid);
                    if (m) {
                        this.juice.hold(m.uid, "big", now);
                        this.juice.recoil(m.uid, m.x, m.y, h.x, h.y, 1, now);
                    }
                    break;
                }
                case "landed": {
                    // A guardian's slam or rain landing near the hero; a rain of the hero's own, less
                    const d = Math.hypot(e.x - h.x, e.y - h.y);
                    if (e.side === "monster" && d < e.radius + 6) {
                        this.juice.shake(0.28);
                    } else if (e.side === "hero" && d < 14) {
                        this.juice.shake(0.1);
                    }
                    break;
                }
                case "monsterAttack": {
                    const m = e.monster;
                    // A guardian's special is heard as it starts; an attack on its blow
                    if (m.state === "special") {
                        this.sfxAt(m.def.sounds.attack, m.x, m.y, { volume: 0.3, minGap: 90 });
                    }
                    const cast = m.def.ranged?.visual.castSpot;
                    if (cast !== undefined && m.state === "attack") {
                        this.spot(cast, m.x, m.y, 0);
                    }
                    break;
                }
                case "monsterBlow": {
                    const m = e.monster;
                    this.sfxAt(m.def.sounds.attack, m.x, m.y, { volume: 0.3, minGap: 90 });
                    break;
                }
                case "monsterDied":
                    this.fall(game, e.monster, e.overkill, e.fromX, e.fromY, e.crit, now);
                    if (e.monster.rank === "rare") {
                        store.toast(`${e.monster.name} is slain.`, 2500);
                    }
                    break;
                case "riftTime":
                    store.toast(
                        e.seconds >= 60 ? `The rift is failing: ${Math.round(e.seconds / 60)} minute left to slay its guardian.` : `${e.seconds} seconds till the rift collapses!`,
                        4000,
                        "warn",
                    );
                    break;
                case "riftCollapsed":
                    // Out of time: the rift's gone, whatever's left in it, and the hero home alive
                    this.leftDown = this.rightDown = false;
                    this.setPanel(undefined);
                    this.open = undefined;
                    game.heroData.riftOpen = false;
                    this.save();
                    void this.goHome("collapsed");
                    break;
                case "heroDied":
                    this.sfx(SOUND.heroDeath, { volume: 0.45 }, "combat");
                    this.leftDown = this.rightDown = false;
                    this.setPanel(undefined);
                    // The rift's lost, even if the game's closed before the hero goes home
                    game.heroData.riftOpen = false;
                    // And a hardcore hero with it, for good
                    if (game.heroData.hardcore) {
                        game.heroData.fallen = true;
                    }
                    this.save();
                    break;
                case "levelUp": {
                    this.float(`Level ${e.level}!`, "#ffd040", h.x, h.y, now);
                    store.toast(`You've reached level ${e.level}.`, 3500, "good");
                    const left = this.hero ? pointsLeft(this.hero) : 0;
                    if (left > 0) {
                        store.toast(`${left} passive ${left === 1 ? "point" : "points"} to spend. Press P for the passive tree.`, 5000, "good");
                    }
                    this.sfx(SOUND.godSpell, { volume: 0.3, rate: 1.2 });
                    this.packVersion++;
                    break;
                }
                case "gemsGiven":
                    store.toast(`New ${e.names.length === 1 ? "gem" : "gems"}: ${e.names.join(", ")}. Open your pack's Gems to set them.`, 6000, "good", RARITY_COLOR.gem);
                    this.packVersion++;
                    break;
                case "gemLevel":
                    store.toast(`${e.name} reached level ${e.level}.`, 3000, "good", RARITY_COLOR.gem);
                    this.packVersion++;
                    break;
                case "cantUse":
                    this.denied(e.why);
                    break;
                case "hirelingHit": {
                    const a = game.hireling;
                    this.splat(a?.uid ?? -2, false, e.x, e.y, e.amount, "damage", false, now);
                    break;
                }
                case "hirelingDied":
                    store.toast(`${e.name} has fallen. The ${HIRELING.captain.name} at the barracks can raise them.`, 5000, "warn");
                    this.packVersion++;
                    this.save();
                    break;
                case "evaded":
                    this.splat(-1, true, h.x, h.y, 0, "block", false, now);
                    break;
                case "burn": {
                    const m = game.monsterByUid(e.uid);
                    if (m) {
                        this.splat(m.uid, false, m.x, m.y, e.amount, "damage", false, now);
                    }
                    break;
                }
                case "beam":
                    this.beams.push({ points: e.points, start: now, seed: Math.random() * 1000 });
                    if (this.beams.length > 12) {
                        this.beams.splice(0, this.beams.length - 12);
                    }
                    break;
                case "cast": {
                    // The hero's own slams and leaps landing shake the ground
                    if (e.skill.kind === "slam" || e.skill.kind === "leap") {
                        this.juice.shake(0.16);
                    } else if (e.skill.kind === "nova") {
                        this.juice.shake(0.08);
                    }
                    const v = e.skill.visual;
                    if (v?.castSpot !== undefined) {
                        this.spot(v.castSpot, e.x, e.y, 0);
                    }
                    const weapon = game.stats.weapon;
                    const sound = v?.sound ?? (weapon.kind === "bow" ? SOUND.bow : weapon.kind === "melee" ? SOUND.swing : undefined);
                    if (sound !== undefined && e.skill.kind !== "rain") {
                        this.sfxAt(sound, e.x, e.y, { volume: 0.3, minGap: 60 });
                    }
                    break;
                }
                case "spot":
                    this.spot(e.spot, e.x, e.y, e.lift ?? 0);
                    break;
                case "sound":
                    this.sfxAt(e.id, e.x, e.y, { volume: (e.volume ?? 0.5) * 0.7, minGap: 70 });
                    break;
                case "drop": {
                    // A unique, a set piece or a high rune lands with a sound of its own
                    const glory = dropGlory(e.drop);
                    if (glory) {
                        this.sfxAt(glory.sound, e.drop.x, e.drop.y, { volume: glory.volume, minGap: 250 });
                    }
                    if (e.drop.item && isRiftKey(e.drop.item)) {
                        const info = itemInfo(e.drop.item);
                        store.toast(`${isShard(e.drop.item) ? "A shard of the Heartstone" : "A riftstone"} dropped: ${info.name}!`, 4500, "loot", dropColor(e.drop));
                    } else if (e.drop.item && e.drop.item.rarity !== "normal") {
                        if (e.drop.item.rarity === "unique") {
                            store.toast(`A unique item dropped: ${itemInfo(e.drop.item).name}!`, 4000, "loot", RARITY_COLOR.unique);
                        } else if (e.drop.item.forge) {
                            store.toast(`A forged gem dropped: ${itemInfo(e.drop.item).name}!`, 4500, "loot", FORGED_COLOR);
                        }
                    }
                    if (e.drop.rune && RUNES[e.drop.rune.id].weight <= 3) {
                        store.toast(`A ${RUNES[e.drop.rune.id].name} dropped.`, 3000, "loot", RUNES[e.drop.rune.id].color);
                    }
                    this.assets.item(dropObj(e.drop));
                    break;
                }
                case "pickup": {
                    const info = itemInfo(e.item);
                    this.sfx(SOUND.pickup, { volume: 0.3 });
                    store.toast(`Picked up ${info.name}.`, 2200, "loot", RARITY_COLOR[e.item.rarity]);
                    this.packVersion++;
                    break;
                }
                case "logged":
                    store.toast(`New item added to your collection log: ${e.name}`, 4000, "good", LOG_COLOR);
                    break;
                case "pet":
                    store.toast(e.fresh ? `You have a funny feeling like you're being followed: ${PET_BY_ID.get(e.id)?.name}.` : "You have a funny feeling like you would have been followed...", 6000, "good", LOG_COLOR);
                    this.sfx(SOUND.godSpell, { volume: 0.3, rate: 1.3 });
                    break;
                case "sphere":
                    store.toast(`The orrery turns: a sphere's lit for ${sphereName(e.key)}. Spend it there, in the square.`, 5000, "good", ORRERY.color);
                    break;
                case "orrery":
                    this.setPanel("orrery");
                    break;
                case "achievement": {
                    const a = ACHIEVEMENT_BY_ID.get(e.id);
                    if (a) {
                        store.toast(`Congratulations, you've completed ${a.tier === "easy" || a.tier === "elite" ? "an" : "a"} ${TIER_NAMES[a.tier].toLowerCase()} combat task: ${a.name}.`, 5000, "good", LOG_COLOR);
                        const points = achievementPoints(this.hero!);
                        const hilt = HILTS.find((h) => points >= h.points && points - TIER_POINTS[a.tier] < h.points);
                        if (hilt) {
                            store.toast(`${hilt.name} is yours: ${hilt.text.charAt(0).toLowerCase()}${hilt.text.slice(1)}.`, 7000, "good", LOG_COLOR);
                        }
                    }
                    break;
                }
                case "gold":
                    this.sfx(SOUND.coins, { volume: 0.2, minGap: 90 });
                    this.float(`+${e.amount} gold`, "#ffd040", h.x, h.y, now);
                    this.packVersion++;
                    break;
                case "rune":
                    this.sfx(SOUND.pickup, { volume: 0.25, rate: 1.25, minGap: 90 });
                    this.float(`+${runeName(e.id, e.count)}`, RUNES[e.id].color, h.x, h.y, now);
                    this.packVersion++;
                    break;
                case "good":
                    this.sfx(SOUND.pickup, { volume: 0.22, rate: 1.1, minGap: 90 });
                    this.float(`+${goodName(e.id, e.count)}`, GOODS[e.id].color, h.x, h.y, now);
                    this.packVersion++;
                    break;
                case "packFull":
                    this.denied("Your pack is full.");
                    break;
                case "noMana":
                    this.denied("Not enough mana.");
                    break;
                case "feature":
                    this.featureUsed(e.feature, e.what);
                    break;
                case "encounter":
                    this.encounterMoment(e);
                    break;
                case "quest":
                    store.toast(`Quest done: ${QUESTS[e.id].name}. Reldo, in ${CITY_NAME}, has its reward.`, 6000, "good");
                    this.sfx(SOUND.portal, { volume: 0.3, rate: 1.15 });
                    this.save();
                    break;
                case "task":
                    if (e.done) {
                        store.toast(`Task done: ${taskObjective(e.task)}. ${FOLK[e.task.giver].name} will pay you in ${CITY_NAME}.`, 6000, "good");
                        this.sfx(SOUND.portal, { volume: 0.25, rate: 1.25 });
                    }
                    break;
                case "bossAwake":
                    store.toast(`${e.monster.name}, ${e.monster.boss?.title ?? "the guardian"}, awakens!`, 3500, "warn");
                    break;
                case "bossDied":
                    store.toast(`${e.monster.name} has fallen. The portal home is open!`, 5000, "good");
                    this.sfx(SOUND.portal, { volume: 0.35 });
                    break;
                case "portal":
                    if (game.town) {
                        void this.enterRift();
                    } else {
                        this.riftCleared();
                    }
                    break;
                case "sealed":
                    this.denied(game.town ? `The portal is dormant. Ask ${ARCHMAGE.name} to open a rift.` : "The portal is sealed. Slay the rift's guardian first.");
                    break;
                case "talk":
                    this.talkTo(e.person);
                    break;
                case "home":
                    void this.goHome(e.how);
                    break;
                case "channel":
                    this.sfx(SOUND.godSpell, { volume: 0.2, rate: 0.7 });
                    store.toast("Teleporting home... Stand still.", Math.round(HERO.teleportSeconds * 1000));
                    break;
                case "channelBroken":
                    this.denied(e.why === "hit" ? "Your teleport was interrupted!" : "You moved, and the teleport fades.");
                    break;
                case "potion":
                    this.sfx(SOUND.click, { volume: 0.2, rate: 0.7 });
                    if (e.instil) {
                        store.toast(`${e.name}: drunk for you.`, 1800, "good");
                    }
                    this.packVersion++;
                    break;
                case "noPotion":
                    this.denied(e.why === "shut" ? beltShutText(e.place) : e.why === "empty" ? `There's no potion in your belt's place ${e.place + 1}.` : "That potion's empty. Kills fill it.");
                    break;
                case "errandDrop":
                    store.toast(`${e.boss} dropped the ${GOODS[e.id].name}! The Apothecary can stitch a new place onto your belt with it.`, 7000, "loot", GOODS[e.id].color);
                    break;
                case "elixirGone":
                    store.toast("Your elixir has worn off.", 3500, "warn");
                    this.packVersion++;
                    break;
            }
        }
    }

    // A chest opened or sprung, a shrine touched, a hoard opened, or still guarded
    private featureUsed(f: Feature, what: "opened" | "ambush" | "blessed" | "guarded"): void {
        const store = this.store;
        if (what === "guarded") {
            this.denied("Its guards still stand, and now they've seen you.");
        } else if (what === "blessed") {
            const def = SHRINES[f.shrine ?? "bandos"];
            store.toast(`${def.name}: ${def.text.charAt(0).toLowerCase()}${def.text.slice(1)}, for ${def.buff.seconds} seconds.`, 4500, "good", def.color);
        } else {
            this.sfxAt(SOUND.pickup, f.x, f.y, { volume: 0.4, rate: 0.7 });
            if (what === "ambush") {
                store.toast("It's a trap! An ambush rises round the chest.", 4000, "warn");
            } else if (f.kind === "hoard") {
                store.toast("The hoard is yours.", 3000, "loot", HOARD.color);
            } else if (f.kind === "barrows") {
                store.toast("The Barrows chest is yours.", 3000, "loot", BARROWS.color);
            } else if (f.kind === "tomb") {
                store.toast("The sarcophagus grinds open, and its brother rises!", 3500, "warn");
            }
        }
    }

    // An encounter's moment, as a toast (content/encounters.ts); a Fight Caves wave beaten opens
    // its choice
    private encounterMoment(e: Extract<GameEvent, { kind: "encounter" }>): void {
        const store = this.store;
        const name = e.name ?? "";
        switch (e.what) {
            case "impling":
                store.toast(`${name}! Catch it before it's gone.`, 3500, "good", ENCOUNTERS.impling.color);
                break;
            case "implingGone":
                store.toast(`The ${name.toLowerCase()} got away.`, 3000, "warn");
                break;
            case "implingCaught":
                store.toast(`You caught the ${name.toLowerCase()}! Its jar spills open.`, 3500, "loot", ENCOUNTERS.impling.color);
                break;
            case "hunter":
                store.toast(`${name} has found you!`, 3500, "warn");
                break;
            case "roamer":
                store.toast(`${name}, hunts you!`, 4000, "warn");
                break;
            case "superior":
                store.toast(`A superior foe has appeared: ${name}!`, 4000, "warn");
                break;
            case "brother":
                store.toast(`${name} is slain. ${e.left === 1 ? "One brother rests" : `${e.left} brothers rest`} still.`, 3500, "good", BARROWS.color);
                break;
            case "barrowsOpen":
                store.toast("The brothers are slain. The Barrows chest stands open.", 4000, "good", BARROWS.color);
                break;
            case "barrowsSealed":
                this.denied(`The chest is sealed: ${e.left === 1 ? "one brother rests" : `${e.left} brothers rest`} in their tombs still.`);
                break;
            case "wave":
                store.toast(`Wave ${e.wave} of ${FIGHT_CAVES.waves.length}: the TzHaar come!`, 3000, "warn", FIGHT_CAVES.color);
                break;
            case "waveStands":
                this.denied(`Wave ${e.wave} still stands.`);
                break;
            case "waveCleared":
                this.store.set({ caves: { wave: e.wave ?? 0, waves: FIGHT_CAVES.waves.length, tokkul: e.tokkul ?? 0, next: (e.tokkul ?? 0) * 2 } });
                this.setPanel("caves");
                break;
            case "cavesDone":
                store.toast(`The Fight Caves pay ${e.tokkul} tokkul for ${e.wave === 1 ? "a wave" : `${e.wave} waves`}.`, 4000, "loot", FIGHT_CAVES.color);
                break;
            case "enraged":
                store.toast(`${name} is enraged!`, 3000, "warn");
                break;
            case "awakened":
                store.toast(`${name} rises again: its guard returns, and it has a new trick.`, 4000, "warn", AWAKENED.color);
                break;
            case "pestStart":
                store.toast("The portals awaken! Break them before the pests overrun the Void Knight.", 4000, "warn", PEST_CONTROL.color);
                this.sfx(SOUND.portal, { volume: 0.3, rate: 0.8 });
                break;
            case "portalOpen":
                store.toast(`The ${name.toLowerCase()}'s shield is down!`, 3000, "good", PEST_CONTROL.color);
                break;
            case "portalBroken":
                store.toast(`A portal is broken. ${e.left === 1 ? "One is" : `${e.left} are`} left.`, 3000, "good", PEST_CONTROL.color);
                break;
            case "knightFallen":
                store.toast(`The Void Knight has fallen. The portals close${e.count ? `, and you keep ${e.count} seals` : ""}.`, 5000, "warn");
                break;
            case "pestWon":
                store.toast(`The portals are broken and the Void Knight stands! ${e.count} Void seals are yours.`, 5000, "loot", PEST_CONTROL.color);
                this.sfx(SOUND.portal, { volume: 0.35 });
                break;
            case "skirmish":
                store.toast(`${name} are at war! Every follower slain is their god's kill count.`, 4500, "warn", GOD_WARS.color);
                break;
            case "skirmishDone":
                store.toast(`The war between ${name} is over.`, 4000, "loot", GOD_WARS.color);
                break;
            case "breachOpen":
                store.toast("The breach tears open! Slay what comes out before it closes.", 4000, "warn", BREACH.color);
                break;
            case "breachClosed":
                store.toast("The breach closes.", 3000, "good", BREACH.color);
                break;
            case "guardiansStart":
                store.toast(`The Great Guardian's rift opens! Bring it essence: ${RIFT_GUARDIANS.seconds} seconds.`, 4000, "warn", RIFT_GUARDIANS.color);
                break;
            case "guardiansPower":
                store.toast(`The Great Guardian takes ${e.count} essence: ${Math.round(e.left ?? 0)}%.`, 2500, "good", RIFT_GUARDIANS.color);
                break;
            case "guardiansWon":
                store.toast(`The rift is sealed! ${e.count} abyssal pearls are yours.`, 5000, "loot", RIFT_GUARDIANS.color);
                this.sfx(SOUND.portal, { volume: 0.35 });
                break;
            case "colosseumStart":
                store.toast("The crowd roars! The first wave comes.", 3500, "warn", COLOSSEUM.color);
                break;
            case "colosseumWave":
                // The last is Sol Heredit's, whose waking says so
                if ((e.wave ?? 0) < COLOSSEUM.waves.length) {
                    store.toast(`Wave ${e.wave} of ${COLOSSEUM.waves.length}!`, 3000, "warn", COLOSSEUM.color);
                }
                break;
            case "glories": {
                const view = this.gloryView();
                if (view) {
                    this.store.set({ glory: view });
                    this.setPanel("glory");
                }
                break;
            }
            case "glory":
                store.toast(`Glory taken: ${name}.`, 2500, "good", COLOSSEUM.color);
                break;
            case "colosseumWon":
                store.toast(`Sol Heredit is beaten! The Colosseum is yours, with ${e.count} glory.`, 6000, "loot", COLOSSEUM.color);
                this.sfx(SOUND.portal, { volume: 0.4 });
                break;
            case "tombsRoom":
                store.toast(`${name}!`, 3500, "warn", TOMBS.color);
                break;
            case "tombsRoomDone":
                store.toast(
                    e.left ? `${name}: beaten. ${e.left === 1 ? "One path" : `${e.left} paths`} left.` : `${name}: beaten. The four paths are done: the Wardens wake in the Nexus.`,
                    e.left ? 3000 : 4500,
                    "good",
                    TOMBS.color,
                );
                break;
            case "tombsWardens":
                store.toast("The Nexus shakes: the Wardens rise!", 3000, "warn", TOMBS.color);
                break;
            case "tombsWon":
                store.toast(`The Wardens are beaten! The Tombs of Amascut are yours${e.count ? `, at raid level ${e.count}` : ""}.`, 6000, "loot", TOMBS.color);
                this.sfx(SOUND.portal, { volume: 0.4 });
                break;
            case "guardiansLost":
                store.toast(`Time's up: the rift closes at ${Math.round(e.left ?? 0)}%.${e.count ? ` The Guardian gives you ${e.count} pearls.` : ""}`, 5000, "warn");
                break;
        }
    }

    // Through the portal past a rift's guardian: home, and a depth deeper is open to the Archmage
    private riftCleared(): void {
        const hero = this.hero;
        const open = this.open;
        if (!hero || !open || this.making) {
            return;
        }
        // A pinnacle takes the hero no deeper: it's beside the ladder, not on it
        if (open.pinnacle) {
            this.pinnacleCleared = open.pinnacle;
        } else {
            // A rift of the web's at the deepest: the hero stands on its lane now
            if (open.lane !== undefined) {
                webCleared(hero, open.depth, open.lane);
            }
            hero.maxDepth = Math.max(hero.maxDepth, open.depth + 1);
            hero.depth = open.depth + 1;
        }
        hero.riftOpen = false;
        hero.riftMods = [];
        hero.riftPinnacle = undefined;
        hero.riftAwakened = undefined;
        hero.riftInvocations = undefined;
        hero.riftLane = undefined;
        hero.riftBounty = undefined;
        this.chosenDepth = hero.depth;
        this.open = undefined;
        void this.goHome("cleared");
    }

    private spot(id: number, x: number, y: number, lift: number): void {
        const model = this.assets.spots.get(id);
        if (!model) {
            return;
        }
        const ms = Math.min(model.anims[0].totalTicks * 20, 3000);
        this.effects.push({ model, x, y, lift, start: performance.now(), ms });
        if (this.effects.length > 80) {
            this.effects.splice(0, this.effects.length - 80);
        }
    }

    // A hit seen: the hold on whoever struck and was struck, the lean back from it, and shake for
    // a crit on something big (Juice.ts)
    private impact(game: Game, m: Monster, fromX: number, fromY: number, share: number, crit: boolean, now: number): void {
        const h = game.hero;
        const kind = crit ? "crit" : "hit";
        this.juice.hold(m.uid, kind, now);
        // The hero's own blow, landing this tick, holds them too; a shot doesn't
        const a = h.action;
        if (a && a.fired && game.tick - a.hitAt <= 1 && Math.abs(fromX - h.x) < 0.01 && Math.abs(fromY - h.y) < 0.01) {
            this.juice.hold(-1, kind, now);
        }
        const big = m.rank === "boss" ? 0.4 : m.rank === "rare" ? 0.7 : 1;
        this.juice.recoil(m.uid, m.x, m.y, fromX, fromY, (0.35 + share * 2.5 + (crit ? 0.25 : 0)) * big, now);
        if (crit && (m.rank === "boss" || m.rank === "rare")) {
            this.juice.shake(0.1);
        } else if (share > 0.3) {
            this.juice.shake(0.06);
        }
    }

    // A monster killed: its body thrown along the killing blow, further the more it was overkilled,
    // as far as there's ground for it; a hold and shake for a rare or a guardian
    private fall(game: Game, m: Monster, overkill: number, fromX: number, fromY: number, crit: boolean, now: number): void {
        const grid = this.grid;
        let dx = m.x - fromX;
        let dy = m.y - fromY;
        const d = Math.hypot(dx, dy);
        const weight = m.rank === "boss" ? 0 : m.rank === "rare" ? 0.55 : m.rank === "magic" ? 0.8 : 1;
        if (grid && d > 0.001 && weight > 0) {
            dx /= d;
            dy /= d;
            const want = Math.min(1.8, 0.25 + overkill * 1.5 + (crit ? 0.45 : 0)) * weight;
            let reach = 0;
            for (let s = 0.1; s <= want; s += 0.1) {
                if (!isCircleFree(grid, m.x + dx * s, m.y + dy * s, Math.min(0.3, m.radius * 0.5))) {
                    break;
                }
                reach = s;
            }
            const hop = overkill > 0.5 || crit ? Math.min(0.45, 0.15 + overkill * 0.2) * weight : 0;
            this.juice.throwCorpse(m.uid, dx * reach, dy * reach, hop, now);
        }
        const h = game.hero;
        const a = h.action;
        const own = a && a.fired && game.tick - a.hitAt <= 1;
        if (m.rank === "boss") {
            this.juice.shake(0.6);
            this.juice.hold(-1, "big", now);
        } else if (m.rank === "rare") {
            this.juice.shake(0.25);
            if (own) {
                this.juice.hold(-1, "big", now);
            }
        } else if (own) {
            this.juice.hold(-1, "kill", now);
        }
    }

    private splat(uid: number, hero: boolean, x: number, y: number, amount: number, kind: HitsplatKind, crit: boolean, now: number): void {
        const recent = this.splats.filter((s) => s.uid === uid && s.hero === hero && now - s.start < 300).length;
        this.splats.push({ uid, hero, x, y, amount, kind, crit, start: now, slot: recent % 3 });
        if (this.splats.length > 60) {
            this.splats.splice(0, this.splats.length - 60);
        }
    }

    private float(text: string, color: string, x: number, y: number, now: number): void {
        this.floats.push({ text, color, x, y, start: now });
    }

    // A sound of the interface's (or, said so, the hero's own in a fight), at its volume setting
    private sfx(id: number, options: PlayOptions = {}, kind: "interface" | "combat" = "interface"): void {
        const volume = kind === "combat" ? this.settings.combatVolume : this.settings.interfaceVolume;
        if (volume > 0) {
            this.audio.play(id, { ...options, volume: (options.volume ?? 1) * volume });
        }
    }

    // A sound in the world, from where it is, at the world's volume setting
    private sfxAt(id: number, x: number, y: number, options: PlayOptions = {}): void {
        const volume = this.settings.combatVolume;
        if (volume > 0) {
            this.audio.playAt(id, x, y, this.focusX, this.focusY, { ...options, volume: (options.volume ?? 1) * volume });
        }
    }

    // ---- Drawing ----

    submitActors(actors: ActorRenderer): void {
        const now = performance.now();
        const game = this.game;
        if (game) {
            this.drawHero(actors, game);
            this.drawMinions(actors, game);
            this.drawPet(actors, game, now);
            this.drawHireling(actors, game);
            this.drawMonsters(actors, game);
            this.drawProjectiles(actors, game, now);
            this.drawDrops(actors, game, now);
        } else if (this.place === "city" && this.store.getSnapshot().screen === "title") {
            this.drawTitle(actors, now);
        }
        this.drawPeople(actors, game, now);
        this.drawWays(actors, game, now);
        this.drawFeatures(actors, game);
        // Spot animations, each once through
        let w = 0;
        const o = this.fxOptions;
        o.scale = 1;
        for (const e of this.effects) {
            const t = now - e.start;
            if (t >= e.ms) {
                continue;
            }
            this.effects[w++] = e;
            const anim = e.model.anims[0];
            actors.draw(e.model, anim, anim.getFrame(Math.floor(t / 20), false), e.x, this.height(e.x, e.y) - e.lift, e.y, 0, o);
        }
        this.effects.length = w;
    }

    // The city's people, standing, strolling, and the Archmage at his casting; on the title too,
    // as they stand
    private drawPeople(actors: ActorRenderer, game: Game | undefined, now: number): void {
        const o = this.drawOptions;
        if (game) {
            const a = this.alpha();
            for (const p of game.people) {
                const model = this.assets.people.get(p.npcId);
                if (!model) {
                    continue;
                }
                const x = p.prevX + (p.x - p.prevX) * a;
                const y = p.prevY + (p.y - p.prevY) * a;
                let seq = p.moving ? NPC_WALK_SEQ : NPC_IDLE_SEQ;
                let ticks = Math.floor(now / 20) + p.uid * 7;
                let loop = true;
                let yaw = p.yaw;
                if (p.kind === "archmage" && now - this.archmageCast < 2400) {
                    seq = ARCHMAGE.castSeq;
                    ticks = Math.floor((now - this.archmageCast) / 20);
                    loop = false;
                    const portal = game.layout.exit;
                    yaw = yawFromVector(portal.x - p.x, portal.y - p.y);
                }
                const anim = model.getAnim(seq);
                resetOptions(o);
                o.outline = p.uid === this.hoverPerson ? 1.06 : undefined;
                actors.draw(model, anim, anim.getFrame(ticks, loop), x, this.height(x, y), y, yaw, o);
            }
        } else if (this.place === "city" && this.city) {
            for (const p of this.city.plan.people) {
                const model = this.assets.people.get(p.npcId);
                if (model) {
                    const anim = model.getAnim(NPC_IDLE_SEQ);
                    resetOptions(o);
                    actors.draw(model, anim, anim.getFrame(Math.floor(now / 20) + p.npcId), p.x, this.height(p.x, p.y), p.y, p.yaw, o);
                }
            }
        }
    }

    // The portal (the Archmage's in the city, or past a rift's guardian), and a rift's waystone home
    private drawWays(actors: ActorRenderer, game: Game | undefined, now: number): void {
        const portal = this.assets.portal;
        if (!portal || !this.grid) {
            return;
        }
        const o = this.drawOptions;
        const anim = portal.anims[0];
        const exit = game?.layout.exit ?? (this.place === "city" ? this.city?.plan.portal : undefined);
        const open = game?.portalOpen ?? this.store.getSnapshot().screen === "title";
        if (exit) {
            resetOptions(o);
            o.alpha = open ? 1 : 0.35;
            o.tint = open ? undefined : 0x606070;
            o.unlit = open ? 0.6 : 0;
            o.outline = this.hoverPortal ? 1.04 : undefined;
            const frame = open ? anim.getFrame(Math.floor(now / 20)) : 0;
            // The loc's model is centred on its 2 by 2 tiles' middle
            actors.draw(portal, anim, frame, exit.x, this.height(exit.x, exit.y), exit.y, 0, o);
        }
        if (game && !game.town) {
            const w = game.layout.waystone;
            resetOptions(o);
            o.scale = WAYSTONE_SCALE;
            // Pulled towards the tint's own blue, so it's not taken for the purple way out
            o.tint = WAYSTONE_TINT;
            o.flash = -0.55;
            o.unlit = 0.5;
            o.outline = this.hoverWaystone ? 1.06 : undefined;
            // Facing the camera, as the portal does
            actors.draw(portal, anim, anim.getFrame(Math.floor(now / 30)), w.x, this.height(w.x, w.y), w.y, 0, o);
        }
    }

    // A rift's chests, hoards and shrines (content/features.ts): shut and then open, lit and then
    // spent
    private drawFeatures(actors: ActorRenderer, game: Game | undefined): void {
        if (!game || game.town) {
            return;
        }
        const o = this.drawOptions;
        const h = game.hero;
        for (const f of game.features) {
            if (Math.abs(f.x - h.x) > 40 || Math.abs(f.y - h.y) > 40) {
                continue;
            }
            const model = this.assets.locs.get(featureLoc(f));
            if (!model) {
                continue;
            }
            resetOptions(o);
            o.outline = this.hoverFeature === f.uid ? 1.05 : undefined;
            if (f.kind === "shrine" && f.used) {
                o.tint = 0x606070;
            }
            if (f.kind === "shrine") {
                // Its front to the camera, as its altar stood against a wall of the God Wars Dungeon
                // (Zamorak's is open at the back), and on the lowest corner of its tiles, so no side
                // of it floats where the ground isn't quite flat
                actors.draw(model, model.anims[0], 0, f.x, this.lowestGround(f.x - f.size / 2, f.y - f.size / 2, f.size), f.y, SHRINE_YAW, o);
            } else {
                actors.draw(model, model.anims[0], 0, f.x, this.height(f.x, f.y), f.y, (f.uid % 4) * 512, o);
            }
        }
    }

    // The lowest of the corners of the tiles a side from a south-west corner, as a height (up is
    // negative, so the greatest)
    private lowestGround(x0: number, y0: number, size: number): number {
        let lowest = -Infinity;
        for (let y = 0; y <= size; y++) {
            for (let x = 0; x <= size; x++) {
                lowest = Math.max(lowest, this.height(x0 + x, y0 + y));
            }
        }
        return lowest;
    }

    // The title's stage: the line of classes, or a hero alone before the portal
    private drawTitle(actors: ActorRenderer, now: number): void {
        const stage = this.stage;
        if (!stage) {
            return;
        }
        const d = (this.stageDrawing ??= { actors, options: this.drawOptions, height: (x, y) => this.height(x, y), reset: resetOptions });
        d.actors = actors;
        const state = this.store.getSnapshot();
        const assets = this.assets;
        if (state.titleStep === "class") {
            stage.drawLine(d, assets.lineup, now, state.pick, state.hoverClass);
        } else if (state.titleStep === "look" && state.creating) {
            // Their class's own from the line till the look's baked
            const cls = state.creating.cls;
            const model = assets.previewTag === "new" ? assets.preview : assets.lineup.get(cls);
            if (model) {
                stage.drawAlone(d, model, "new", cls, false, now);
            }
        } else {
            const card = state.heroes.find((h) => h.slot === state.selected);
            if (card && assets.preview && assets.previewTag === card.slot) {
                stage.drawAlone(d, assets.preview, card.slot, card.cls, card.fallen, now);
            }
        }
    }

    // What the hero's skills raised: up out of the ground, fighting beside them, and back into it
    // as their time runs out
    private drawMinions(actors: ActorRenderer, game: Game): void {
        const a = this.alpha();
        const tick = game.tick + a;
        const o = this.drawOptions;
        for (const m of game.minions) {
            const model = this.assets.minions.get(m.def.id);
            if (!model) {
                continue;
            }
            const x = m.prevX + (m.x - m.prevX) * a;
            const y = m.prevY + (m.y - m.prevY) * a;
            let seq = m.moving ? m.def.seqs.walk : m.def.seqs.idle;
            let ticks = Math.floor(tick) + m.uid * 7;
            let loop = true;
            if (tick >= m.attackStart && tick < m.attackEnd) {
                seq = m.def.seqs.attack;
                ticks = Math.floor(tick - m.attackStart);
                loop = false;
            }
            const up = Math.max(0, Math.min(1, (tick - m.born) / RISE_TICKS, (m.until - tick) / RISE_TICKS));
            const anim = model.getAnim(seq);
            resetOptions(o);
            o.tint = m.def.tint;
            o.flash = -0.2;
            // Greater Thralls' (the necromancer's wing): bigger
            o.scale = m.scale;
            actors.draw(model, anim, anim.getFrame(ticks, loop), x, this.height(x, y) + (1 - up) * 1.1, y, m.yaw, o);
        }
    }

    // The pet that follows (content/pets.ts): the client's alone, a little behind the hero, walking
    // to catch up and standing once it has
    private petAt?: { id: string; x: number; y: number; yaw: number; moving: boolean; last: number };
    private drawPet(actors: ActorRenderer, game: Game, now: number): void {
        const id = this.hero?.pet;
        const def = id ? PET_BY_ID.get(id) : undefined;
        const model = id ? this.assets.pets.get(id) : undefined;
        const h = game.hero;
        if (!id || !def || !model || h.dead) {
            this.petAt = undefined;
            return;
        }
        const a = this.alpha();
        const hx = h.prevX + (h.x - h.prevX) * a;
        const hy = h.prevY + (h.y - h.prevY) * a;
        let p = this.petAt;
        if (!p || p.id !== id || Math.hypot(p.x - hx, p.y - hy) > 12) {
            p = this.petAt = { id, x: hx + PET_FOLLOW.behind, y: hy, yaw: h.yaw, moving: false, last: now };
        }
        const dt = Math.min(0.1, Math.max(0, (now - p.last) / 1000));
        p.last = now;
        const dx = hx - p.x;
        const dy = hy - p.y;
        const d = Math.hypot(dx, dy);
        p.moving = d > PET_FOLLOW.behind + (p.moving ? 0 : PET_FOLLOW.near);
        if (p.moving && d > 0) {
            // Quicker the further it's fallen behind
            const step = Math.min(d - PET_FOLLOW.behind, PET_FOLLOW.speed * dt * Math.max(1, d / (PET_FOLLOW.behind * 2)));
            p.x += (dx / d) * step;
            p.y += (dy / d) * step;
            p.yaw = yawFromVector(dx, dy);
        }
        const anim = model.getAnim(p.moving ? def.seqs.walk : def.seqs.idle);
        const o = this.drawOptions;
        resetOptions(o);
        actors.draw(model, anim, anim.getFrame(Math.floor(game.tick + a), true), p.x, this.height(p.x, p.y), p.y, p.yaw, o);
    }

    // The hero's hireling (content/hirelings.ts): its own model and the cache's animations for it,
    // and as it falls, its death, played through and held
    private drawHireling(actors: ActorRenderer, game: Game): void {
        const a = game.hireling;
        const model = a ? this.assets.hirelings.get(a.kind) : undefined;
        if (!a || !model) {
            return;
        }
        const def = HIRELINGS[a.kind];
        const alpha = this.alpha();
        const tick = game.tick + alpha;
        const x = a.prevX + (a.x - a.prevX) * alpha;
        const y = a.prevY + (a.y - a.prevY) * alpha;
        let seq = a.moving ? def.seqs.walk : def.seqs.idle;
        let ticks = Math.floor(tick) + a.uid * 7;
        let loop = true;
        if (a.deadTick !== undefined) {
            seq = def.seqs.death;
            ticks = Math.floor(tick - a.deadTick);
            loop = false;
        } else if (tick >= a.attackStart && tick < a.attackEnd) {
            seq = def.seqs.attack;
            ticks = Math.floor(tick - a.attackStart);
            loop = false;
        }
        const anim = model.getAnim(seq);
        const o = this.drawOptions;
        resetOptions(o);
        o.flash = game.tick - a.hurtTick < 5 ? 0.35 : 0;
        actors.draw(model, anim, anim.getFrame(ticks, loop), x, this.height(x, y), y, a.yaw, o);
    }

    private drawHero(actors: ActorRenderer, game: Game): void {
        const model = this.assets.hero;
        if (!model) {
            return;
        }
        const h = game.hero;
        const a = this.alpha();
        const x = h.prevX + (h.x - h.prevX) * a;
        const y = h.prevY + (h.y - h.prevY) * a;
        const tick = game.tick + a;
        const now = performance.now();
        // The run played as fast as they go: its tick moved on by the frame, faster with a buff
        const pace = (game.stats.moveSpeed * (1 + game.buffTotal("moveSpeedPct") / 100)) / HERO.moveSpeed;
        if (h.moving) {
            this.runPhase += (this.frameMs / TICK_MS) * pace;
        }
        // A use's animation played to land its blow on the tick the sim lands it (content/anims.ts),
        // held a moment as it does; -1 once it's played out
        const act = h.action;
        const use = act ? animTick(tick - act.start, act.end - act.start, act.hitAt - act.start, model.getAnim(act.seq).totalTicks, ANIM_HIT[act.seq] ?? HIT_SHARE) : -1;
        let seq: number;
        let frame: number;
        if (h.dead) {
            seq = SEQ.death;
            frame = model.getAnim(seq).getFrame(Math.floor(tick - h.deadTick), false);
        } else if (act && use >= 0 && !(h.moving && act.fired)) {
            // On the move, the use is shown up to its blow, and then they run on
            seq = act.seq;
            frame = model.getAnim(seq).getFrame(Math.floor(this.juice.animTime(-1, use, now)), false);
        } else if (h.channel) {
            // The teleport home, its reading and its light played through over the channel's length
            seq = SEQ.homeTeleport;
            const share = Math.min(1, (tick - h.channel.start) / Math.max(1, h.channel.end - h.channel.start));
            const anim = model.getAnim(seq);
            frame = anim.getFrame(Math.floor(share * (anim.totalTicks - 1)), false);
            const light = this.assets.spots.get(HOME_TELEPORT_SPOT);
            if (light) {
                const la = light.anims[0];
                const o = this.fxOptions;
                o.scale = 1;
                actors.draw(light, la, la.getFrame(Math.floor(share * (la.totalTicks - 1)), false), h.x, this.height(h.x, h.y), h.y, 0, o);
            }
        } else {
            seq = h.moving ? SEQ.run : SEQ.idle;
            frame = model.getAnim(seq).getFrame(Math.floor(h.moving ? this.runPhase : tick), true);
        }
        const o = this.drawOptions;
        resetOptions(o);
        o.flash = game.tick - h.hurtTick < 5 ? 0.4 : 0;
        o.tint = h.buffs.length > 0 ? 0xffc8a8 : undefined;
        const yaw = this.juice.yaw(-1, h.yaw, this.frameMs, 25);
        const sx = x + this.juice.shiver(-1, now);
        actors.draw(model, model.getAnim(seq), frame, sx, this.height(sx, y), y, yaw, o);
    }

    private drawMonsters(actors: ActorRenderer, game: Game): void {
        const a = this.alpha();
        const o = this.drawOptions;
        const tick = game.tick + a;
        const h = game.hero;
        const now = performance.now();
        for (const m of game.monsters) {
            const look = this.assets.monsters.get(m.def.look ?? m.def.id);
            if (!look) {
                continue;
            }
            // Only those near enough to be seen
            if (Math.abs(m.x - h.x) > 40 || Math.abs(m.y - h.y) > 40) {
                continue;
            }
            const seqs = m.def.seqs;
            let seq: number;
            let frame: number;
            let fade = 1;
            const held = game.tick < m.frozenUntil || game.tick < m.stunnedUntil;
            const busy = (m.state === "attack" || m.state === "special") && !held;
            // An attack played to land its blow when the sim lands it, as the hero's are; a
            // guardian's special winds up to its end if it's a slam, halfway for the rest
            let use = -1;
            if (busy) {
                const length = m.state === "attack" ? m.attackTicks : m.actionEnd - m.actionStart;
                const hit = m.state === "attack" ? m.hitTicks : m.specialNow?.kind === "slam" ? length : Math.round(length / 2);
                use = animTick(tick - m.actionStart, length, hit, look.model.getAnim(seqs.attack).totalTicks, ANIM_HIT[seqs.attack] ?? m.def.hitAt);
            }
            let corpse: { dx: number; dy: number; up: number } | undefined;
            if (m.state === "dead") {
                seq = seqs.death;
                const since = tick - m.deadTick;
                frame = look.model.getAnim(seq).getFrame(Math.floor(since), false);
                const left = game.corpseTicks - since;
                if (left <= 0) {
                    this.juice.forgetCorpse(m.uid);
                    continue;
                }
                fade = Math.min(1, left / 50);
                corpse = this.juice.corpse(m.uid, now);
            } else if (busy && use >= 0) {
                seq = seqs.attack;
                frame = look.model.getAnim(seq).getFrame(Math.floor(this.juice.animTime(m.uid, use, now)), false);
            } else {
                seq = m.moved ? seqs.walk : seqs.idle;
                // Its walk as fast as it goes: a hasted one's feet keep up
                const pace = m.moved ? (m.speed * TICKS_PER_SECOND) / m.def.speed : 1;
                frame = held ? 0 : look.model.getAnim(seq).getFrame(Math.floor(this.juice.animTime(m.uid, (tick + m.uid * 7) * pace, now)), true);
            }
            let x = m.prevX + (m.x - m.prevX) * a;
            let y = m.prevY + (m.y - m.prevY) * a;
            let up = 0;
            if (corpse) {
                x += corpse.dx;
                y += corpse.dy;
                up = corpse.up;
            } else {
                x += this.juice.shiver(m.uid, now);
            }
            const yaw = m.state === "dead" ? m.yaw : this.juice.yaw(m.uid, m.yaw, this.frameMs, 60);
            resetOptions(o);
            o.scale = look.scale * m.size;
            o.flash = game.tick - m.hitTick < 5 ? 0.45 : 0;
            o.alpha = fade;
            if (game.tick < m.frozenUntil) {
                o.tint = 0x90c8ff;
            } else if (m.rank === "magic") {
                o.tint = 0xc8c8ff;
            }
            o.outline = m.uid === this.hoverMonster && m.state !== "dead" ? 1.06 : undefined;
            const lean = m.state === "dead" ? undefined : this.juice.lean(m.uid, yaw, now);
            if (lean) {
                o.pitch = lean.pitch;
                o.roll = lean.roll;
            }
            actors.draw(look.model, look.model.getAnim(seq), frame, x, this.height(x, y) + up, y, yaw, o);
        }
    }

    private drawProjectiles(actors: ActorRenderer, game: Game, now: number): void {
        const a = this.alpha();
        const o = this.fxOptions;
        o.scale = 1;
        for (const p of game.projectiles) {
            const x = p.prevX + (p.x - p.prevX) * a;
            const y = p.prevY + (p.y - p.prevY) * a;
            const yaw = yawFromVector(p.vx, p.vy);
            const v: Visual = p.visual;
            if (v.projectile !== undefined) {
                const model = this.assets.spots.get(v.projectile);
                if (model) {
                    const anim = model.anims[0];
                    actors.draw(model, anim, anim.getFrame(Math.floor(now / 20), true), x, this.height(x, y) - SHOT_LIFT, y, yaw, o);
                }
            } else if (v.projectileObj !== undefined) {
                const model = this.assets.objs.get(v.projectileObj);
                if (model) {
                    actors.draw(model, model.anims[0], 0, x, this.height(x, y) - SHOT_LIFT, y, (now * 3) & 2047, o);
                }
            }
        }
    }

    private drawDrops(actors: ActorRenderer, game: Game, now: number): void {
        const o = this.drawOptions;
        for (const d of game.drops) {
            const model = this.assets.item(dropObj(d));
            if (!model) {
                continue;
            }
            resetOptions(o);
            o.outline = d.uid === this.hoverDrop ? 1.15 : undefined;
            // A new drop bounces as it lands
            const t = (game.tick - d.tick) / 25;
            const lift = t < 1 ? Math.sin(t * Math.PI) * 0.8 : 0;
            actors.draw(model, model.anims[0], 0, d.x, this.height(d.x, d.y) - lift, d.y, (d.uid * 337) & 2047, o);
        }
        void now;
    }

    // ---- Over the world ----

    drawOverlay(camera: Camera): void {
        const overlay = this.overlay;
        overlay.begin(camera);
        const ctx = overlay.ctx;
        const game = this.game;
        const state = this.store.getSnapshot();
        if (!game || state.screen !== "play") {
            this.labels = [];
            return;
        }
        const scale = uiScale(this.settings.uiSize) * pixelRatio;
        const now = performance.now();
        if (this.bigMap && !state.panel && !state.tree && !state.menu) {
            this.drawBigMap(ctx, game, scale, now);
        }
        this.drawWarnings(ctx, game, scale);
        this.drawMarker(ctx, scale, now);
        this.drawMonsterBars(ctx, game, scale);
        this.drawNames(ctx, game, scale);
        this.drawTaskIcons(ctx, game, scale, now);
        this.drawSaid(ctx, game, scale, now);
        this.drawPillars(ctx, game, scale, now);
        this.drawLabels(ctx, game, scale);
        this.drawBeams(ctx, scale, now);
        this.drawSplats(ctx, game, scale, now);
        this.drawFloats(ctx, scale, now);
        this.drawMinimap(ctx, game, scale);
    }

    // Rings on the ground where something's about to land: red for what hurts the hero; and an
    // Abyssal breach's edge, as it grows and shrinks
    private drawWarnings(ctx: CanvasRenderingContext2D, game: Game, scale: number): void {
        const breach = game.breach;
        if (breach && breach.state === "open" && breach.radius > 0.2) {
            this.ring(ctx, breach.x, breach.y, breach.radius, "rgba(176, 96, 192, 0.75)", 3 * scale);
            this.ring(ctx, breach.x, breach.y, breach.radius, "rgba(176, 96, 192, 0.08)", 0, true);
        }
        for (const s of game.strikes) {
            const share = Math.min(1, (game.tick - s.start) / Math.max(1, s.land - s.start));
            const enemy = s.side === "monster";
            this.ring(ctx, s.x, s.y, s.radius, enemy ? `rgba(255, 60, 30, ${0.5 + share * 0.4})` : `rgba(255, 210, 120, ${0.25 + share * 0.3})`, 2 * scale);
            if (enemy) {
                this.ring(ctx, s.x, s.y, s.radius * share, "rgba(255, 90, 40, 0.35)", 0, true);
            }
        }
    }

    // Where the ground was clicked to walk to: a ring that closes in and fades
    private drawMarker(ctx: CanvasRenderingContext2D, scale: number, now: number): void {
        const m = this.marker;
        if (!m) {
            return;
        }
        const t = (now - m.start) / MARKER_MS;
        if (t >= 1) {
            this.marker = undefined;
            return;
        }
        this.ring(ctx, m.x, m.y, 0.55 - t * 0.3, `rgba(255, 236, 170, ${0.85 * (1 - t)})`, 2 * scale);
        this.ring(ctx, m.x, m.y, 0.12, `rgba(255, 236, 170, ${0.6 * (1 - t)})`, 0, true);
    }

    private ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number, fill = false): void {
        if (r <= 0.05) {
            return;
        }
        const steps = 28;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const px = x + Math.cos(a) * r;
            const py = y + Math.sin(a) * r;
            this.overlay.project(px, this.height(px, py) - 0.05, py, this.point);
            if (i === 0) {
                ctx.moveTo(this.point.x, this.point.y);
            } else {
                ctx.lineTo(this.point.x, this.point.y);
            }
        }
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        }
    }

    // A bar over every monster that's been hurt, and over every rare
    private drawMonsterBars(ctx: CanvasRenderingContext2D, game: Game, scale: number): void {
        const a = this.alpha();
        for (const m of game.monsters) {
            if (m.state === "dead" || m.uid === game.bossUid || (m.life >= m.maxLife && m.rank !== "rare" && m.rank !== "boss")) {
                continue;
            }
            const look = this.assets.monsters.get(m.def.look ?? m.def.id);
            const x = m.prevX + (m.x - m.prevX) * a;
            const y = m.prevY + (m.y - m.prevY) * a;
            this.overlay.project(x, this.height(x, y) - (look?.height ?? 1.5) * m.size - 0.3, y, this.point);
            if (!this.point.visible) {
                continue;
            }
            const width = Math.round((m.rank === "boss" ? 64 : m.rank === "rare" ? 50 : 36) * scale);
            const h = Math.round(4 * scale);
            const left = Math.round(this.point.x - width / 2);
            const top = Math.round(this.point.y);
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(left - 1, top - 1, width + 2, h + 2);
            ctx.fillStyle = "#3a0a06";
            ctx.fillRect(left, top, width, h);
            ctx.fillStyle = m.rank === "rare" ? "#e8c020" : m.rank === "magic" ? "#6a6aff" : "#d02818";
            ctx.fillRect(left, top, Math.round(width * Math.max(0, m.life / m.maxLife)), h);
        }
    }

    // What the portal's called, where it goes
    private portalName(game: Game): string {
        if (game.town) {
            return this.open ? `Rift to ${riftName(this.open.depth, this.open.seed, this.open.pinnacle)}` : "Rift portal (dormant)";
        }
        return game.portalOpen ? `Portal to ${CITY_NAME}` : "Portal (sealed)";
    }

    private drawNames(ctx: CanvasRenderingContext2D, game: Game, scale: number): void {
        const h = game.hero;
        const a = this.alpha();
        const hovered = this.hoverPerson >= 0 ? game.personByUid(this.hoverPerson) : undefined;
        if (hovered && !this.said.some((s) => s.uid === hovered.uid)) {
            const x = hovered.prevX + (hovered.x - hovered.prevX) * a;
            const y = hovered.prevY + (hovered.y - hovered.prevY) * a;
            this.overlay.project(x, this.height(x, y) - this.personHeight(hovered) - 0.4, y, this.point);
            if (this.point.visible) {
                drawLabel(ctx, hovered.name, this.point.x, this.point.y, scale * 0.8, PERSON_COLOR[hovered.kind]);
            }
        }
        const e = game.layout.exit;
        if (this.hoverPortal || Math.hypot(h.x - e.x, h.y - e.y) < 10) {
            this.overlay.project(e.x, this.height(e.x, e.y) - 3, e.y, this.point);
            if (this.point.visible) {
                drawLabel(ctx, this.portalName(game), this.point.x, this.point.y, scale * 0.8, game.portalOpen ? "#d0a0ff" : "#909090");
            }
        }
        for (const f of game.features) {
            if (f.used || (this.hoverFeature !== f.uid && Math.hypot(h.x - f.x, h.y - f.y) >= 6)) {
                continue;
            }
            const model = this.assets.locs.get(featureLoc(f));
            const tall = model ? Math.min(3, model.height / 128) : 1;
            this.overlay.project(f.x, this.height(f.x, f.y) - tall - 0.5, f.y, this.point);
            if (this.point.visible) {
                drawLabel(ctx, featureName(f), this.point.x, this.point.y, scale * 0.8, featureColor(f));
            }
        }
        const orrery = game.zone.town?.orrery;
        if (orrery && (this.hoverOrrery || Math.hypot(h.x - orrery.x, h.y - orrery.y) < 5)) {
            this.overlay.project(orrery.x, this.height(orrery.x, orrery.y) - ORRERY_BOX.tall - 0.4, orrery.y, this.point);
            if (this.point.visible) {
                drawLabel(ctx, "Orrery", this.point.x, this.point.y, scale * 0.8, ORRERY.color);
            }
        }
        if (!game.town) {
            const w = game.layout.waystone;
            if (this.hoverWaystone || Math.hypot(h.x - w.x, h.y - w.y) < 5) {
                this.overlay.project(w.x, this.height(w.x, w.y) - 1.9, w.y, this.point);
                if (this.point.visible) {
                    drawLabel(ctx, `Waystone to ${CITY_NAME}`, this.point.x, this.point.y, scale * 0.8, "#a0c8ff");
                }
            }
        }
    }

    // Over the folk with a task: the quest icon over one with a task to offer, and the hint arrow,
    // bobbing, over one whose task is done, as the client points to whom to talk to
    private drawTaskIcons(ctx: CanvasRenderingContext2D, game: Game, scale: number, now: number): void {
        if (!game.town) {
            return;
        }
        const a = this.alpha();
        const zoom = Math.max(1, Math.round(scale));
        ctx.imageSmoothingEnabled = false;
        for (const p of game.people) {
            const state = p.folk ? this.taskState(p.folk) : undefined;
            const icon = state === "offer" ? this.assets.taskIcons.offer : state === "done" ? this.assets.taskIcons.done : undefined;
            if (!icon) {
                continue;
            }
            const x = p.prevX + (p.x - p.prevX) * a;
            const y = p.prevY + (p.y - p.prevY) * a;
            this.overlay.project(x, this.height(x, y) - this.personHeight(p) - 0.4, y, this.point);
            if (!this.point.visible) {
                continue;
            }
            const bob = state === "done" ? Math.round(Math.sin(now / 160) * 3 * zoom) : 0;
            const w = icon.width * zoom;
            const tall = icon.height * zoom;
            ctx.drawImage(icon, Math.round(this.point.x - w / 2), Math.round(this.point.y - tall - 12 * scale + bob), w, tall);
        }
        ctx.imageSmoothingEnabled = true;
    }

    // What people have said, in yellow over their heads
    private drawSaid(ctx: CanvasRenderingContext2D, game: Game, scale: number, now: number): void {
        const a = this.alpha();
        this.said = this.said.filter((s) => s.until > now);
        for (const s of this.said) {
            const p = game.personByUid(s.uid);
            if (!p) {
                continue;
            }
            const x = p.prevX + (p.x - p.prevX) * a;
            const y = p.prevY + (p.y - p.prevY) * a;
            this.overlay.project(x, this.height(x, y) - this.personHeight(p) - 0.4, y, this.point);
            if (this.point.visible) {
                ctx.globalAlpha = Math.min(1, (s.until - now) / 400);
                drawLabel(ctx, s.text, this.point.x, this.point.y, scale * 0.85, "#ffff00");
                ctx.globalAlpha = 1;
            }
        }
    }

    // Labels for what's on the ground, in the item's colour, nudged up so none overlap
    private drawLabels(ctx: CanvasRenderingContext2D, game: Game, scale: number): void {
        const labels: Label[] = [];
        const font = `${Math.round(13 * scale)}px "OSRS Small", sans-serif`;
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const h = game.hero;
        const all = this.settings.labels;
        for (const d of game.drops) {
            if (Math.abs(d.x - h.x) > 30 || Math.abs(d.y - h.y) > 30 || (!all && d.uid !== this.hoverDrop)) {
                continue;
            }
            this.overlay.project(d.x, this.height(d.x, d.y) - 0.4, d.y, this.point);
            if (!this.point.visible) {
                continue;
            }
            const text = dropText(d);
            const w = ctx.measureText(text).width + 10 * scale;
            const lh = 16 * scale;
            const label: Label = { drop: d, x: this.point.x - w / 2, y: this.point.y - lh, w, h: lh };
            for (let tries = 0; tries < 12; tries++) {
                const hit = labels.find((l) => l.x < label.x + label.w && label.x < l.x + l.w && l.y < label.y + label.h && label.y < l.y + l.h);
                if (!hit) {
                    break;
                }
                label.y = hit.y - label.h - 1;
            }
            labels.push(label);
        }
        for (const l of labels) {
            const d = l.drop;
            const hovered = d.uid === this.hoverDrop;
            ctx.fillStyle = hovered ? "rgba(40, 34, 24, 0.92)" : "rgba(0, 0, 0, 0.72)";
            ctx.fillRect(l.x, l.y, l.w, l.h);
            if ((d.item && d.item.rarity !== "normal") || d.rune) {
                ctx.strokeStyle = dropColor(d);
                ctx.lineWidth = Math.max(1, scale);
                ctx.strokeRect(l.x + 0.5, l.y + 0.5, l.w - 1, l.h - 1);
            }
            ctx.fillStyle = dropColor(d);
            ctx.fillText(dropText(d), l.x + l.w / 2, l.y + l.h / 2 + scale);
        }
        this.labels = labels;
    }

    private drawSplats(ctx: CanvasRenderingContext2D, game: Game, scale: number, now: number): void {
        let w = 0;
        for (const s of this.splats) {
            const t = now - s.start;
            if (t >= SPLAT_MS) {
                continue;
            }
            this.splats[w++] = s;
            let tall = 1.5;
            if (s.hero) {
                s.x = game.hero.x;
                s.y = game.hero.y;
            } else {
                const m = game.monsterByUid(s.uid);
                if (m && m.state !== "dead") {
                    s.x = m.x;
                    s.y = m.y;
                }
                const look = m && this.assets.monsters.get(m.def.look ?? m.def.id);
                tall = (look?.height ?? 1.5) * (m?.size ?? 1);
            }
            this.overlay.project(s.x, this.height(s.x, s.y) - tall * 0.6, s.y, this.point);
            if (!this.point.visible) {
                continue;
            }
            const size = s.crit ? scale * 1.3 : scale;
            const rise = (t / SPLAT_MS) * 18 * scale;
            const x = this.point.x + (s.slot === 0 ? 0 : s.slot === 1 ? -20 : 20) * scale;
            const y = this.point.y - rise;
            ctx.globalAlpha = t > SPLAT_MS * 0.7 ? 1 - (t - SPLAT_MS * 0.7) / (SPLAT_MS * 0.3) : 1;
            const sprite = this.assets.hitsplats[s.kind];
            if (sprite) {
                const font = `${Math.round(13 * size)}px "OSRS Small", sans-serif`;
                ctx.font = font;
                const image = this.hitsplatImages.get(sprite, font, size, { kind: s.kind, amount: s.amount });
                ctx.drawImage(image.canvas, Math.round(x - image.inkWidth / 2) + image.left, Math.round(y - image.inkHeight / 2) + image.top);
                if (s.crit) {
                    drawLabel(ctx, "!", x + image.inkWidth / 2 + 4 * scale, y - 6 * scale, scale * 0.9, "#ffd040");
                }
            }
            ctx.globalAlpha = 1;
        }
        this.splats.length = w;
    }

    // Lightning: a jagged line from each point to the next, a little above the ground, that flickers
    // and fades
    // A pillar of light over each drop worth turning round for (dropGlory), in its colour, as Path
    // of Exile's loot beams are: it rises as the drop lands, throbs a little, and fades upwards, so
    // a unique in a heap of drops, or past a tree, is seen at once
    private drawPillars(ctx: CanvasRenderingContext2D, game: Game, scale: number, now: number): void {
        const h = game.hero;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const d of game.drops) {
            const glory = dropGlory(d);
            if (!glory || Math.abs(d.x - h.x) > 30 || Math.abs(d.y - h.y) > 30) {
                continue;
            }
            const ground = this.height(d.x, d.y);
            this.overlay.project(d.x, ground, d.y, this.point);
            if (!this.point.visible) {
                continue;
            }
            const bx = this.point.x;
            const by = this.point.y;
            const rise = Math.min(1, Math.max(0, (game.tick - d.tick) / PILLAR.rise));
            this.overlay.project(d.x, ground - PILLAR.height * rise, d.y, this.point);
            const tx = this.point.x;
            const ty = this.point.y;
            const throb = 0.8 + 0.2 * Math.sin(now / 450 + d.uid);
            const color = glory.rgb;
            for (const [width, alpha] of [
                [PILLAR.width, 0.4],
                [PILLAR.width * 0.3, 0.85],
            ] as [number, number][]) {
                const w = (width * scale) / 2;
                const fill = ctx.createLinearGradient(bx, by, tx, ty);
                fill.addColorStop(0, `rgba(${color}, ${alpha * throb})`);
                fill.addColorStop(0.7, `rgba(${color}, ${alpha * throb * 0.35})`);
                fill.addColorStop(1, `rgba(${color}, 0)`);
                ctx.fillStyle = fill;
                ctx.beginPath();
                ctx.moveTo(bx - w, by);
                ctx.lineTo(tx - w * 0.6, ty);
                ctx.lineTo(tx + w * 0.6, ty);
                ctx.lineTo(bx + w, by);
                ctx.closePath();
                ctx.fill();
            }
        }
        ctx.restore();
    }

    private drawBeams(ctx: CanvasRenderingContext2D, scale: number, now: number): void {
        this.beams = this.beams.filter((b) => now - b.start < BEAM_MS);
        if (this.beams.length === 0) {
            return;
        }
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (const b of this.beams) {
            const t = (now - b.start) / BEAM_MS;
            const screen: { x: number; y: number }[] = [];
            for (const p of b.points) {
                this.overlay.project(p.x, this.height(p.x, p.y) - 1.1, p.y, this.point);
                if (this.point.visible) {
                    screen.push({ x: this.point.x, y: this.point.y });
                }
            }
            if (screen.length < 2) {
                continue;
            }
            const flicker = Math.floor((now - b.start) / 40);
            for (const [width, color] of [
                [7, `rgba(120, 170, 255, ${0.35 * (1 - t)})`],
                [2.5, `rgba(235, 245, 255, ${1 - t})`],
            ] as [number, string][]) {
                ctx.strokeStyle = color;
                ctx.lineWidth = width * scale;
                ctx.beginPath();
                for (let i = 0; i < screen.length - 1; i++) {
                    const a = screen[i];
                    const c = screen[i + 1];
                    const steps = 6;
                    ctx.moveTo(a.x, a.y);
                    for (let k = 1; k < steps; k++) {
                        const f = k / steps;
                        const jitter = (Math.sin(b.seed + i * 13.7 + k * 7.3 + flicker * 3.1) * 10 + Math.sin(k * 2.1 + flicker) * 4) * scale;
                        const nx = -(c.y - a.y);
                        const ny = c.x - a.x;
                        const nl = Math.max(1, Math.hypot(nx, ny));
                        ctx.lineTo(a.x + (c.x - a.x) * f + (nx / nl) * jitter, a.y + (c.y - a.y) * f + (ny / nl) * jitter);
                    }
                    ctx.lineTo(c.x, c.y);
                }
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    private drawFloats(ctx: CanvasRenderingContext2D, scale: number, now: number): void {
        let w = 0;
        for (const f of this.floats) {
            const t = now - f.start;
            if (t >= FLOAT_MS) {
                continue;
            }
            this.floats[w++] = f;
            this.overlay.project(f.x, this.height(f.x, f.y) - 2.4, f.y, this.point);
            if (!this.point.visible) {
                continue;
            }
            ctx.globalAlpha = t > FLOAT_MS * 0.6 ? 1 - (t - FLOAT_MS * 0.6) / (FLOAT_MS * 0.4) : 1;
            drawLabel(ctx, f.text, this.point.x, this.point.y - (t / FLOAT_MS) * 30 * scale, scale * 0.9, f.color);
            ctx.globalAlpha = 1;
        }
        this.floats.length = w;
    }

    // ---- The minimap ----

    private newMap(area: Area): MiniMap {
        const canvas = document.createElement("canvas");
        canvas.width = area.sizeX;
        canvas.height = area.sizeY;
        const data = canvas.getContext("2d")!.createImageData(area.sizeX, area.sizeY);
        return { explored: new Uint8Array(area.sizeX * area.sizeY), open: new Uint8Array(area.sizeX * area.sizeY), canvas, data, lastReveal: { x: -999, y: -999 }, version: 0 };
    }

    // One tile on the map: open ground pale, the rest dark
    private paint(map: MiniMap, area: Area, i: number, open: boolean): void {
        map.explored[i] = 1;
        map.open[i] = open ? 1 : 0;
        map.version++;
        const tx = i % area.sizeX;
        const ty = (i / area.sizeX) | 0;
        // North up: the image's rows run down from the north
        const p = (tx + (area.sizeY - 1 - ty) * area.sizeX) * 4;
        const data = map.data.data;
        data[p] = open ? 150 : 40;
        data[p + 1] = open ? 140 : 34;
        data[p + 2] = open ? 110 : 28;
        data[p + 3] = open ? 170 : 140;
    }

    // The city's known from the start: the whole of it on the map
    private revealAll(map: MiniMap, area: Area, grid: ArenaGrid): void {
        for (let i = 0; i < map.explored.length; i++) {
            const tx = area.baseX + (i % area.sizeX);
            const ty = area.baseY + ((i / area.sizeX) | 0);
            this.paint(map, area, i, !grid.isSolid(tx, ty));
        }
        map.canvas.getContext("2d")!.putImageData(map.data, 0, 0);
    }

    // What the hero can see round them goes on the map
    private reveal(x: number, y: number): void {
        const area = this.area;
        const game = this.game;
        const map = this.map;
        if (!area || !game || !map || game.town || Math.hypot(x - map.lastReveal.x, y - map.lastReveal.y) < 2) {
            return;
        }
        map.lastReveal = { x, y };
        const cx = Math.floor(x) - area.baseX;
        const cy = Math.floor(y) - area.baseY;
        const distance = game.layout.distance;
        let changed = false;
        for (let dy = -REVEAL; dy <= REVEAL; dy++) {
            for (let dx = -REVEAL; dx <= REVEAL; dx++) {
                if (dx * dx + dy * dy > REVEAL * REVEAL) {
                    continue;
                }
                const tx = cx + dx;
                const ty = cy + dy;
                if (tx < 0 || ty < 0 || tx >= area.sizeX || ty >= area.sizeY) {
                    continue;
                }
                const i = tx + ty * area.sizeX;
                if (map.explored[i]) {
                    continue;
                }
                this.paint(map, area, i, distance[i] >= 0);
                changed = true;
            }
        }
        if (changed) {
            map.canvas.getContext("2d")!.putImageData(map.data, 0, 0);
        }
    }

    private drawMinimap(ctx: CanvasRenderingContext2D, game: Game, scale: number): void {
        const mini = this.map;
        const rift = this.area;
        if (!mini || !rift) {
            return;
        }
        const map = mini.canvas;
        const size = Math.round(MINIMAP_SIZE * scale);
        const pad = Math.round(12 * scale);
        const left = this.overlay.width - size - pad;
        const top = pad;
        // The stone frame round it is the interface's (.minimap-frame in ui.css)
        ctx.fillStyle = "#000";
        ctx.fillRect(left - 2, top - 2, size + 4, size + 4);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(map, left, top, size, size);
        ctx.imageSmoothingEnabled = true;
        const toMap = (x: number, y: number) => ({
            x: left + ((x - rift.baseX) / rift.sizeX) * size,
            y: top + (1 - (y - rift.baseY) / rift.sizeY) * size,
        });
        this.drawMarks(ctx, game, mini, rift, toMap, scale, 30);
    }

    // What the maps mark: the city's shops and the Archmage, the waystone, the portal, the guardian
    // once seen, monsters that are about within so many tiles, and the hero
    private drawMarks(
        ctx: CanvasRenderingContext2D,
        game: Game,
        mini: MiniMap,
        rift: Area,
        toMap: (x: number, y: number) => { x: number; y: number },
        scale: number,
        monsterReach: number,
    ): void {
        const dot = (x: number, y: number, r: number, color: string) => {
            const p = toMap(x, y);
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
        };
        const seen = (x: number, y: number) => {
            const tx = Math.floor(x) - rift.baseX;
            const ty = Math.floor(y) - rift.baseY;
            return tx >= 0 && ty >= 0 && tx < rift.sizeX && ty < rift.sizeY && mini.explored[tx + ty * rift.sizeX] === 1;
        };
        if (game.town) {
            for (const p of game.people) {
                if (p.kind === "shop" || p.kind === "archmage" || p.kind === "banker" || p.kind === "captain") {
                    dot(p.x, p.y, 2.5 * scale, PERSON_COLOR[p.kind]);
                }
            }
            // The folk with a task to offer, or one done: the minimap's quest icon
            const icon = this.assets.taskIcons.offer;
            for (const p of game.people) {
                const state = p.folk ? this.taskState(p.folk) : undefined;
                if (icon && (state === "offer" || state === "done")) {
                    const at = toMap(p.x, p.y);
                    const w = icon.width * scale * 0.8;
                    const tall = icon.height * scale * 0.8;
                    ctx.drawImage(icon, at.x - w / 2, at.y - tall / 2, w, tall);
                }
            }
        } else {
            const w = game.layout.waystone;
            dot(w.x, w.y, 2.5 * scale, "#80b0ff");
        }
        const e = game.layout.exit;
        if (seen(e.x, e.y) || game.portalOpen) {
            dot(e.x, e.y, 3.5 * scale, game.portalOpen ? "#c080ff" : "#706080");
        }
        const boss = game.boss;
        if (boss && boss.state !== "dead" && seen(boss.x, boss.y)) {
            dot(boss.x, boss.y, 3 * scale, "#ff6020");
        }
        // The Tombs' paths still to beat, seen or not, as Osmumten's shown the way to each; and the
        // Nexus's middle once the Wardens wake in it
        const tombs = game.tombs;
        if (tombs) {
            for (const c of tombs.chambers) {
                if (!c.done) {
                    dot(c.x, c.y, 3 * scale, TOMBS.color);
                }
            }
            if (tombs.state === "wardens" || tombs.state === "rising") {
                dot(tombs.x, tombs.y, 3.5 * scale, TOMBS.color);
            }
        }
        for (const f of game.features) {
            if (!f.used && seen(f.x, f.y)) {
                dot(f.x, f.y, (f.kind === "hoard" ? 2.6 : 2) * scale, featureColor(f));
            }
        }
        for (const m of game.monsters) {
            if (m.state !== "dead" && m.rank !== "boss" && m.state !== "idle" && Math.hypot(m.x - game.hero.x, m.y - game.hero.y) < monsterReach) {
                dot(m.x, m.y, 1.4 * scale, "#e03020");
            }
        }
        dot(game.hero.x, game.hero.y, 2.8 * scale, "#40ff60");
    }

    // The overlay map, laid on the ground round the hero as the camera sees it: the way east and
    // the way north on screen, at the hero, taken from the camera and shrunk, so its walls run as
    // the world's do. Only its outlines, so the fight shows through.
    private drawBigMap(ctx: CanvasRenderingContext2D, game: Game, scale: number, now: number): void {
        const mini = this.map;
        const area = this.area;
        if (!mini || !area) {
            return;
        }
        const outline = this.outline(mini, area, now);
        const h = game.hero;
        const a = this.alpha();
        const hx = h.prevX + (h.x - h.prevX) * a;
        const hy = h.prevY + (h.y - h.prevY) * a;
        const ground = this.height(hx, hy);
        const at = this.overlay.project(hx, ground, hy, { x: 0, y: 0, visible: false });
        const east = this.overlay.project(hx + 4, ground, hy, { x: 0, y: 0, visible: false });
        const north = this.overlay.project(hx, ground, hy + 4, { x: 0, y: 0, visible: false });
        if (!at.visible) {
            return;
        }
        // Screen pixels a tile east and a tile north, shrunk
        const ex = ((east.x - at.x) / 4) * BIG_MAP_ZOOM;
        const ey = ((east.y - at.y) / 4) * BIG_MAP_ZOOM;
        const nx = ((north.x - at.x) / 4) * BIG_MAP_ZOOM;
        const ny = ((north.y - at.y) / 4) * BIG_MAP_ZOOM;
        // The middle of the screen, a little above the hero's feet, is where they are on it
        const cx = at.x;
        const cy = at.y;
        const toMap = (x: number, y: number) => ({ x: cx + ex * (x - hx) + nx * (y - hy), y: cy + ey * (x - hx) + ny * (y - hy) });
        ctx.save();
        // The picture's columns run east from the area's west edge and its rows south from its north
        const k = 1 / BIG_MAP_TILE;
        const originX = area.baseX - hx;
        const originY = area.baseY + area.sizeY - hy;
        ctx.setTransform(ex * k, ey * k, -nx * k, -ny * k, cx + ex * originX + nx * originY, cy + ey * originX + ny * originY);
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(outline, 0, 0);
        ctx.restore();
        this.drawMarks(ctx, game, mini, area, toMap, scale * 0.9, 45);
    }

    // The overlay map's picture: each seen tile of open ground faintly, and a line along each of
    // its sides that meets a wall, a wood or water; a lone tree or rock is left out
    private outline(mini: MiniMap, area: Area, now: number): HTMLCanvasElement {
        const t = BIG_MAP_TILE;
        let o = mini.outline;
        if (!o) {
            const canvas = document.createElement("canvas");
            canvas.width = area.sizeX * t;
            canvas.height = area.sizeY * t;
            o = mini.outline = { canvas, version: -1, at: 0 };
        }
        if (o.version === mini.version || now - o.at < BIG_MAP_MS) {
            return o.canvas;
        }
        o.version = mini.version;
        o.at = now;
        const w = area.sizeX * t;
        const image = new ImageData(w, area.sizeY * t);
        const px = new Uint32Array(image.data.buffer);
        // Little-endian ABGR: a pale blue, as the genre's overlays are
        const FILL = (64 << 24) | (150 << 16) | (130 << 8) | 110;
        const EDGE = (235 << 24) | (255 << 16) | (210 << 8) | 140;
        const { explored, open } = mini;
        const sx = area.sizeX;
        const sy = area.sizeY;
        // Each clump of seen, blocked ground, by its tiles side by side: big ones are walls
        const big = new Uint8Array(sx * sy);
        const seen = new Uint8Array(sx * sy);
        const stack: number[] = [];
        const clump: number[] = [];
        for (let i = 0; i < sx * sy; i++) {
            if (seen[i] || !explored[i] || open[i]) {
                continue;
            }
            seen[i] = 1;
            stack.push(i);
            clump.length = 0;
            while (stack.length > 0) {
                const j = stack.pop()!;
                clump.push(j);
                const x = j % sx;
                for (const n of [x > 0 ? j - 1 : -1, x < sx - 1 ? j + 1 : -1, j - sx, j + sx]) {
                    if (n >= 0 && n < sx * sy && !seen[n] && explored[n] && !open[n]) {
                        seen[n] = 1;
                        stack.push(n);
                    }
                }
            }
            if (clump.length >= BIG_MAP_CLUMP) {
                for (const j of clump) {
                    big[j] = 1;
                }
            }
        }
        const wall = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= sx || ty >= sy || big[tx + ty * sx] === 1;
        for (let ty = 0; ty < sy; ty++) {
            for (let tx = 0; tx < sx; tx++) {
                const i = tx + ty * sx;
                if (!explored[i] || big[i]) {
                    continue;
                }
                // North up: the picture's rows run down from the north
                const top = (sy - 1 - ty) * t;
                const left = tx * t;
                for (let y = 0; y < t; y++) {
                    px.fill(FILL, (top + y) * w + left, (top + y) * w + left + t);
                }
                if (wall(tx, ty + 1)) {
                    px.fill(EDGE, top * w + left, top * w + left + t);
                }
                if (wall(tx, ty - 1)) {
                    px.fill(EDGE, (top + t - 1) * w + left, (top + t - 1) * w + left + t);
                }
                if (wall(tx - 1, ty)) {
                    for (let y = 0; y < t; y++) {
                        px[(top + y) * w + left] = EDGE;
                    }
                }
                if (wall(tx + 1, ty)) {
                    for (let y = 0; y < t; y++) {
                        px[(top + y) * w + left + t - 1] = EDGE;
                    }
                }
            }
        }
        o.canvas.getContext("2d")!.putImageData(image, 0, 0);
        return o.canvas;
    }

    // ---- What the screens show ----

    private updateHoverLabel(game: Game): void {
        let hover: Hover | undefined;
        let key = "";
        if (this.hoverMonster >= 0) {
            const m = game.monsterByUid(this.hoverMonster);
            if (m) {
                const sub = m.mods.map((mod) => MOD_NAMES[mod]).join(", ") || (m.boss ? m.boss.title : undefined);
                hover = { name: m.name, color: RANK_COLOR[m.rank], sub, life: m.life / m.maxLife };
                key = `m${m.uid}:${Math.round((m.life / m.maxLife) * 100)}`;
            }
        } else if (this.hoverDrop >= 0) {
            key = "";
        } else if (this.hoverPerson >= 0) {
            const p = game.personByUid(this.hoverPerson);
            if (p) {
                const sub =
                    p.kind === "ally"
                        ? game.allyText(p)
                        : p.kind === "shop" && p.shop
                        ? SHOPS[p.shop].name
                        : p.kind === "archmage"
                          ? `${ARCHMAGE.title}. Opens the rifts.`
                          : p.kind === "banker"
                            ? BANKER.title
                            : p.title
                              ? p.title
                              : p.kind === "wizard"
                                ? "Of the tower"
                                : `Keeps the peace in ${CITY_NAME}`;
                const task = p.folk ? this.taskState(p.folk) : undefined;
                hover = { name: p.name, color: PERSON_COLOR[p.kind], sub: task ? `${sub}. ${TASK_HOVER[task]}` : sub };
                key = `n${p.uid}:${task ?? ""}`;
            }
        } else if (this.hoverFeature >= 0) {
            const f = game.featureByUid(this.hoverFeature);
            if (f) {
                const sub =
                    f.kind === "shrine"
                        ? `${SHRINES[f.shrine ?? "bandos"].text}, for ${SHRINES[f.shrine ?? "bandos"].buff.seconds} seconds`
                        : f.kind === "hoard"
                          ? game.guarded(f)
                              ? "Guarded: it opens once its guards are dead."
                              : "Its guards are dead. Open it."
                          : f.kind === "caves"
                            ? this.cavesHover(game)
                            : f.kind === "tomb"
                              ? f.used
                                  ? "Empty."
                                  : `${MONSTERS[f.brother ?? "dharok"].name} rests here. Disturb them, and they rise.`
                              : f.kind === "barrows"
                                ? game.barrowsSlain < game.barrowsTombs
                                    ? `Sealed till the brothers are slain: ${game.barrowsTombs - game.barrowsSlain} of ${game.barrowsTombs} rest still.`
                                    : f.used
                                      ? "Opened."
                                      : "The brothers are slain. Open it."
                                : f.kind === "breach"
                                  ? `A tear into the Abyss. Touch it, and it opens for ${BREACH.seconds} seconds: what pours out drops abyssal ashes.`
                                  : "Left by the lost. Most hold something; a few are a trap.";
                hover = { name: featureName(f), color: featureColor(f), sub };
                key = `f${f.uid}:${f.kind === "hoard" && game.guarded(f)}:${f.used}:${game.barrowsSlain}:${game.caves?.state}:${game.caves?.wave}`;
            }
        } else if (this.hoverWaystone) {
            hover = { name: "Waystone", color: "#a0c8ff", sub: `Home to ${CITY_NAME}. Your rift stays open.` };
            key = "w";
        } else if (this.hoverPortal) {
            const sub = game.town
                ? this.open
                    ? `Rift ${this.open.depth}, area level ${areaLevel(this.open.depth)}${this.open.mods.length > 0 ? `: ${this.open.mods.map((id) => RIFT_MODS[id].name).join(", ")}` : ""}`
                    : `${ARCHMAGE.name} can open it.`
                : game.portalOpen
                  ? "Home, the rift cleared, and a deeper one open to you."
                  : "Slay the rift's guardian to open it.";
            hover = { name: this.portalName(game), color: game.portalOpen ? "#d0a0ff" : "#a0a0a0", sub };
            key = `p${game.portalOpen}${this.open?.depth}`;
        } else if (this.hoverOrrery) {
            const points = this.hero ? orreryPoints(this.hero) : 0;
            const lit = this.hero?.orrery?.lit.length ?? 0;
            const sub = lit === 0 ? "It turns with the rifts. Slay a host's guardian past rift 16, or clear a pinnacle, and a sphere of it lights." : `${lit} sphere${lit === 1 ? "" : "s"} lit${points > 0 ? `, ${points} to spend` : ""}.`;
            hover = { name: "Orrery", color: ORRERY.color, sub };
            key = `o${lit}:${points}`;
        }
        if (key !== this.hoverKey) {
            this.hoverKey = key;
            this.store.set({ hover });
        }
    }

    private updateHud(): void {
        const game = this.game;
        const hero = this.hero;
        if (!game || !hero) {
            return;
        }
        const h = game.hero;
        // The Tombs' room's guardian, or the rift's
        const boss = game.shownBoss;
        const hud: Hud = {
            name: hero.name,
            cls: hero.cls,
            hardcore: hero.hardcore,
            hideHelm: hero.look.hideHelm,
            life: Math.max(0, Math.ceil(h.life)),
            maxLife: game.stats.maxLife,
            mana: Math.floor(h.mana),
            maxMana: game.stats.maxMana,
            prayers: game.stats.prayers,
            reserved: { mana: game.stats.manaReserved, life: game.stats.lifeReserved },
            hireling: hero.hireling
                ? {
                      name: hero.hireling.name,
                      title: HIRELINGS[hero.hireling.kind].title,
                      life: hero.hireling.dead || !game.hireling || !game.hireStats ? 0 : Math.max(0, game.hireling.life / game.hireStats.maxLife),
                      dead: hero.hireling.dead === true,
                  }
                : undefined,
            level: hero.level,
            xp: hero.xp,
            // None at 99, the last
            xpNext: hero.level >= MAX_LEVEL ? 0 : xpToNext(hero.level),
            gold: hero.gold,
            // The places open, the first so many
            potions: hero.potions.slice(0, beltPlaces(hero)).map((item, i) => this.beltView(item, i)),
            ward: Math.round(h.ward),
            elixir: hero.elixir ? { name: ELIXIRS[hero.elixir.id].name, objId: ELIXIRS[hero.elixir.id].objId, seconds: Math.ceil(hero.elixir.left) } : undefined,
            skills: game.skills.map((skill, i) => this.skillRow(skill, i, hero.skillBar[i] ?? null)),
            zone: game.town ? CITY_NAME : riftName(game.zone.depth, game.zone.seed, game.zone.pinnacle),
            depth: game.zone.depth,
            areaLevel: game.level,
            killed: game.killed,
            total: game.monsterTotal,
            boss: boss
                ? {
                      name: boss.name,
                      title: boss.boss?.title ?? "",
                      life: boss.life / boss.maxLife,
                      awake: game.bossAwake || boss.uid !== game.bossUid,
                      dead: boss.state === "dead",
                  }
                : undefined,
            portalOpen: game.portalOpen,
            timeLeft: Number.isFinite(game.timeLeft) ? Math.ceil(game.timeLeft) : undefined,
            buffs: [
                ...game.ailmentList().map((a) => ({ name: a.name, seconds: a.seconds, icon: AILMENT_ICON[a.kind], ailment: true })),
                ...h.buffs.map((b) => ({ name: b.name, seconds: Math.max(0, (b.until - game.tick) / 50), icon: b.icon ?? GEM_ICON.get(b.id) })),
            ],
            points: pointsLeft(hero),
            dead: h.dead,
            town: game.town,
            riftOpen: this.open ? riftName(this.open.depth, this.open.seed, this.open.pinnacle) : undefined,
            mods: modViews(game.town ? (this.open?.mods ?? []) : game.riftMods),
            reward: rewardView(game.town ? (this.open?.mods ?? []) : game.riftMods),
            channel: h.channel ? Math.min(1, (game.tick - h.channel.start) / Math.max(1, h.channel.end - h.channel.start)) : undefined,
            tasks: hero.tasks.map((t) => this.taskView(t)),
            quest: this.questLine(),
            encounter: game.town ? undefined : game.encounterStatus(),
        };
        this.store.set({ hud });
        if (this.packVersion !== this.shownPackVersion && this.store.getSnapshot().panel) {
            this.updatePack();
        }
    }

    // A place in the belt as the bar shows it
    private beltView(item: Item | null, place: number): BeltSlot {
        const key = controlLabel(this.settings.keys, POTION_CONTROLS[place]);
        if (!item) {
            return { key, doses: 0, most: 0, empty: true };
        }
        const info = itemInfo(item);
        return { key, name: info.name, objId: info.objId, rarity: item.rarity, doses: Math.floor(dosesLeft(item) + 1e-6), most: mostDoses(item), share: dosesLeft(item) % 1, empty: false };
    }

    // A skill button as the bar shows it
    private skillRow(skill: ResolvedSkill | undefined, i: number, ref: number | null): SkillRow {
        const game = this.game!;
        const h = game.hero;
        if (!skill) {
            return {
                ref: null,
                name: "Empty",
                key: this.skillKeyName(i),
                description: "Click to put a skill here.",
                lines: [],
                supports: [],
                mana: 0,
                life: 0,
                affordable: true,
                cooldown: 0,
                cooldownSeconds: 0,
            };
        }
        const cooldownTicks = seconds(skill.cooldown);
        const left = Math.max(0, h.ready[i] - game.tick);
        return {
            ref: ref ?? skill.ref,
            name: skill.gem ? `${skill.def.name} (level ${skill.level})` : skill.def.name,
            key: this.skillKeyName(i),
            description: skillDescription(skill),
            lines: skillLines(skill),
            supports: skill.supportedBy,
            icon: skill.def.icon,
            why: skill.why,
            mana: skill.mana,
            life: skill.life,
            affordable: h.mana >= skill.mana && (skill.life === 0 || h.life > skill.life),
            cooldown: cooldownTicks > 0 ? left / cooldownTicks : 0,
            cooldownSeconds: Math.round(skill.cooldown * 10) / 10,
        };
    }

    private updatePack(): void {
        const hero = this.hero;
        const game = this.game;
        if (!hero || !game) {
            return;
        }
        this.shownPackVersion = this.packVersion;
        const view = (item: Item): ItemView => this.itemView(item);
        const equipment: Pack["equipment"] = {};
        for (const slot of SLOTS) {
            const item = hero.equipment[slot];
            if (item) {
                equipment[slot] = view(item);
            }
        }
        const s = game.stats;
        const pct = (v: number) => `${Math.round(v * 100)}%`;
        const inc = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
        // Resistances as they stand here, or in the city at the deepest rift reached, the Torment's
        // penalty off (content/rules.ts RESIST)
        const resistAt = game.town ? hero.maxDepth : game.zone.depth;
        const penalty = resistPenalty(resistAt);
        const resists = ELEMENTS.map((e) => {
            const raw = s.resist[e];
            const at = resistance(raw, resistAt);
            const name = e === "fire" ? "Fire" : e === "cold" ? "Cold" : "Lightning";
            return { label: `${name} resistance`, value: `${at}%${raw - penalty > RESIST.most ? ` (${raw - penalty}%, held to ${RESIST.most}%)` : ""}` };
        });
        const socketWork: Pack["socketWork"] = {};
        for (const slot of SLOTS) {
            const item = hero.equipment[slot];
            if (!item) {
                continue;
            }
            const costs: Partial<Record<SocketWork, number>> = {};
            for (const work of Object.keys(SOCKET_WORK) as SocketWork[]) {
                const cost = socketWorkCost(item, work, hero);
                if (cost !== undefined) {
                    costs[work] = cost;
                }
            }
            socketWork[slot] = costs;
        }
        const keystones = [...s.keystones].map((k) => KEYSTONES[k].name);
        const pack: Pack = {
            inventory: hero.inventory.map((item) => (item ? view(item) : null)),
            equipment,
            potions: hero.potions.map((item) => (item ? view(item) : null)),
            beltShut: Array.from({ length: BELT_SIZE }, (_, i) => (beltOpen(hero, i) ? null : beltShutText(i))),
            goods: GOOD_IDS.filter((id) => !GOODS[id].secret || (hero.goods[id] ?? 0) > 0).map((id) => this.goodView(id)),
            stats: [
                { label: "Strength", value: `${s.str}` },
                { label: "Dexterity", value: `${s.dex}` },
                { label: "Intelligence", value: `${s.int}` },
                { label: "Life", value: s.lifeReserved > 0 ? `${s.maxLife} (${s.lifeReserved} kept by prayers)` : `${s.maxLife}` },
                { label: "Mana", value: s.manaReserved > 0 ? `${s.maxMana} (${s.manaReserved} kept by prayers)` : `${s.maxMana}` },
                { label: "Weapon damage", value: `${s.minDamage}-${s.maxDamage}` },
                { label: "Attacks per second", value: s.attackSpeed.toFixed(2) },
                { label: "Cast speed", value: inc(s.castSpeed) },
                { label: "Critical chance", value: pct(s.critChance) },
                { label: "Critical damage", value: pct(s.critMulti) },
                { label: "Increased damage", value: inc(s.damage.all) },
                { label: "Melee damage", value: inc(s.damage.melee) },
                { label: "Projectile damage", value: inc(s.damage.projectile) },
                { label: "Spell damage", value: inc(s.damage.spell) },
                { label: "Area damage", value: inc(s.damage.area) },
                { label: "Elemental damage", value: inc(s.damage.elemental) },
                { label: "Area of effect", value: inc(s.area) },
                { label: "Armour", value: `${s.armour}` },
                { label: "Evade chance", value: pct(s.evade) },
                ...resists,
                ...(penalty > 0 ? [{ label: "Torment's penalty", value: `-${penalty}% to resistances ${game.town ? `at rift ${resistAt}` : "here"}` }] : []),
                { label: "Life regeneration", value: `${s.lifeRegen.toFixed(1)}/s` },
                { label: "Mana regeneration", value: `${s.manaRegen.toFixed(1)}/s` },
                ...(s.manaOnHit > 0 ? [{ label: "Mana per enemy hit", value: `${s.manaOnHit.toFixed(1)} (attacks)` }] : []),
                { label: "Movement speed", value: pct(s.moveSpeed / HERO.moveSpeed) },
                { label: "Life leech", value: pct(s.lifeLeech) },
                { label: "Item rarity", value: `+${pct(s.rarity)}` },
                ...(keystones.length > 0 ? [{ label: "Keystones", value: keystones.join(", ") }] : []),
                { label: "Passive points", value: `${hero.passives.length} of ${passivePoints(hero)}` },
                { label: "Monsters slain", value: `${hero.kills}` },
                { label: "Deepest rift", value: `${hero.maxDepth}` },
            ],
            gambleCost: gambleCost(cityLevel(hero)),
            runes: RUNE_IDS.map((id) => this.runeView(id)),
            stash: this.store.getSnapshot().panel === "stash" ? hero.stash.map((item) => (item ? view(item) : null)) : undefined,
            socketWork,
            hireling: this.hirelingView(view),
            captain: this.store.getSnapshot().panel === "captain" ? this.captainView() : undefined,
        };
        this.store.set({ pack });
        if (this.store.getSnapshot().panel === "shop") {
            this.updateShop();
        }
    }

    // The hireling as its panel shows it (content/hirelings.ts)
    private hirelingView(view: (item: Item) => ItemView): HirelingView | undefined {
        const hero = this.hero;
        const hire = hero?.hireling;
        const s = hero ? hirelingStats(hero) : undefined;
        if (!hero || !hire || !s) {
            return undefined;
        }
        const live = this.game?.hireling;
        const equipment = {} as Record<HirelingSlot, ItemView | null>;
        for (const slot of HIRELING_SLOTS) {
            const item = hire.equipment[slot];
            equipment[slot] = item ? view(item) : null;
        }
        return {
            kind: hire.kind,
            name: hire.name,
            title: s.def.title,
            text: s.def.text,
            level: s.level,
            dead: hire.dead === true,
            life: hire.dead ? 0 : Math.ceil(live && live.deadTick === undefined ? live.life : s.maxLife),
            maxLife: s.maxLife,
            armour: s.armour,
            damage: `${s.minDamage}-${s.maxDamage}`,
            dps: Math.round(hirelingDps(s)),
            blows: (1 / s.attackSeconds).toFixed(2),
            own: s.own,
            equipment,
        };
    }

    // The Captain's offers: each kind at the hero's level, bare-handed
    private captainView(): CaptainView | undefined {
        const hero = this.hero;
        if (!hero) {
            return undefined;
        }
        return {
            hireCost: hireCost(hero),
            raiseCost: raiseCost(hero),
            offers: HIRELING_KINDS.map((kind) => {
                const def = HIRELINGS[kind];
                const s = hirelingStats({ ...hero, hireling: { kind, name: def.name, equipment: {} } })!;
                return { kind, name: def.name, text: def.text, life: s.maxLife, weapon: def.weapon === "melee" ? "A melee weapon" : def.weapon === "bow" ? "A bow" : "A staff" };
            }),
        };
    }

    // ---- The hireling (content/hirelings.ts) ----

    // One hired from the Captain, in place of any the hero had
    hireHireling(kind: HirelingKind): void {
        const hero = this.hero;
        if (!hero || !this.game?.town) {
            return;
        }
        const why = hire(hero, kind);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.5 });
        this.store.toast(`${hero.hireling!.name} the ${HIRELINGS[kind].title} joins you.`, 3500, "good");
        this.hirelingChanged();
    }

    // A fallen one raised by the Captain
    raiseHireling(): void {
        const hero = this.hero;
        if (!hero?.hireling?.dead || !this.game?.town) {
            return;
        }
        const why = raiseHireling(hero);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.coins, { volume: 0.5 });
        this.store.toast(`${hero.hireling.name} is back on their feet.`, 3000, "good");
        this.hirelingChanged();
    }

    // Sent away, what it wore back in the pack
    dismissHireling(): void {
        const hero = this.hero;
        const name = hero?.hireling?.name;
        if (!hero || !name) {
            return;
        }
        const why = dismissHireling(hero);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.click, { volume: 0.3 });
        this.store.toast(`${name} goes back to the Captain.`, 3000);
        this.hirelingChanged();
    }

    // Something from the pack for the hireling to wear, and what it wore there back in its place
    giveHireling(index: number): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = giveHireling(hero, index);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.pickup, { volume: 0.4 });
        this.hirelingChanged();
    }

    takeFromHireling(slot: HirelingSlot): void {
        const hero = this.hero;
        if (!hero) {
            return;
        }
        const why = takeFromHireling(hero, slot);
        if (why) {
            this.denied(why);
            return;
        }
        this.sfx(SOUND.pickup, { volume: 0.4 });
        this.hirelingChanged();
    }

    private hirelingChanged(): void {
        this.game?.refreshStats();
        this.packVersion++;
        this.updatePack();
        this.save();
    }

    // A herb as the pouch shows it, with how many the hero has
    private goodView(id: GoodId): GoodView {
        const def = GOODS[id];
        return { id, name: def.name, objId: def.objId, color: def.color, blurb: def.blurb, count: this.hero?.goods[id] ?? 0 };
    }

    // A rune as the pouch shows it, with how many the hero has
    private runeView(id: RuneId): RuneView {
        const def = RUNES[id];
        return { id, name: def.name, objId: def.objId, color: def.color, blurb: def.blurb, count: this.hero?.runes[id] ?? 0 };
    }

    // An item as the screens show it, for this hero
    private itemView(item: Item): ItemView {
        const info = itemInfo(item);
        const hero = this.hero;
        const gem = item.rarity === "gem" ? this.gemView(item) : undefined;
        const runeWhy: ItemView["runeWhy"] = {};
        for (const id of RUNE_IDS) {
            const why = runeWhyNot(item, id);
            if (why) {
                runeWhy[id] = why;
            }
        }
        let implicit = statLines(info.implicit);
        let lines = statLines(info.stats);
        // A set piece's green and a runeword's gold; a set's pieces worn and bonuses had
        const u = item.rarity === "unique" ? UNIQUE_BY_ID.get(item.base) : undefined;
        const tone: ItemView["tone"] = u?.set ? "set" : item.runeword ? "runeword" : undefined;
        const color = tone === "set" ? SET_COLOR : tone === "runeword" ? RUNEWORD_COLOR : RARITY_COLOR[item.rarity];
        const riftText = new Set(statLines(info.stats.filter((l) => l.rift)));
        let set: ItemView["set"];
        if (info.set) {
            const worn = new Set(hero ? SLOTS.map((s) => hero.equipment[s]).filter((i) => i && !i.unid).map((i) => i!.base) : []);
            const count = hero ? (setsWorn(hero)[info.set.id] ?? 0) : 0;
            set = {
                name: info.set.name,
                pieces: info.set.pieces.map((p) => ({ name: p.name, worn: worn.has(p.id) })),
                bonuses: info.set.bonuses.map((b) => ({ pieces: b.pieces, lines: b.lines, active: count >= b.pieces })),
            };
        }
        // A potion's own: what a dose does and how many it has, and what drinks it for you
        if (info.potion) {
            implicit = [...info.potion.lines, `${Math.floor(info.potion.doses + 1e-6)} of ${info.potion.most} ${info.potion.most === 1 ? "dose" : "doses"}`];
            if (info.potion.instil) {
                lines = [...lines, info.potion.instil];
            }
        }
        if (info.key?.kind === "riftstone") {
            const mods = info.key.mods;
            implicit = [`Area level ${areaLevel(info.key.depth)}`, onLadder(info.key.depth) ? "A land, host and guardian rolled as it opens" : `Guardian: ${BOSSES[bossOf(info.key.depth)].name}`];
            lines = mods.length > 0 ? [...mods.map((id) => RIFT_MODS[id].text), rewardText(rewardView(mods))] : [];
        }
        return {
            color,
            tone,
            rift: lines.filter((l) => riftText.has(l)),
            set,
            runeWhy,
            uid: item.uid,
            rarity: item.rarity,
            info,
            implicit,
            lines,
            // A talisman's set in the tree, not worn, so only its level keeps it out, as a gem's does
            why: hero && !gem ? (isTalisman(item) ? talismanWhy(hero, item) : whyNotEquip(hero, item)) : gem?.why,
            sell: sellValue(item),
            itemLevel: item.level,
            sockets: item.sockets?.map((socket) => ({ color: socket.color, linked: socket.linked, gem: socket.gem ? this.itemView(socket.gem) : undefined })),
            gem,
        };
    }

    // A gem as its tooltip shows it: a skill's numbers as the hero would have them, where it is
    private gemView(item: Item): GemView | undefined {
        const def = gemDef(item);
        const hero = this.hero;
        const game = this.game;
        if (!def || !hero) {
            return undefined;
        }
        const worn = findWornGem(hero, item.uid);
        let lines: string[] = [];
        let description: string | undefined;
        let why: string | undefined;
        let links: string[] | undefined;
        if (def.skill) {
            const r = game && worn ? resolveSkill(hero, game.stats, item.uid) : undefined;
            if (worn && r) {
                lines = skillLines(r);
                description = skillDescription(r);
                why = r.why;
                links = r.supportedBy.length > 0 ? [`Supported by ${r.supportedBy.join(", ")}`] : undefined;
            } else {
                description = def.skill.description.replace("{damage}", `${Math.round(def.skill.damage * 100 * (1 + (item.level - 1) * GEM_DAMAGE_PER_LEVEL))}`);
                const mana = Math.round(def.skill.mana * MANA_COST_MULT * (1 + GEM_MANA_PER_LEVEL * (item.level - 1)));
                const cost = mana > 0 ? [`Costs ${mana} mana`] : [];
                const cool = def.skill.cooldown > 0 ? [`${def.skill.cooldown} second cooldown`] : [];
                lines = [...cost, ...cool];
            }
        } else {
            lines = supportLines(def, item.level);
            if (worn) {
                const helped = worn.linked.map((g) => gemDef(g)).filter((g) => g?.skill && supports(def, g!));
                links = helped.length > 0 ? [`Supporting ${helped.map((g) => g!.name).join(", ")}`] : ["Supports nothing it's linked to"];
            }
        }
        const requires = gemRequirement(def, item.level);
        if (requires > hero.level) {
            why = `You need to be level ${requires} to use it at this level.`;
        }
        why = classLock(hero.cls, def) ?? why;
        const max = item.level >= MAX_GEM_LEVEL;
        return {
            color: def.color,
            support: !!def.support,
            level: item.level,
            maxLevel: MAX_GEM_LEVEL,
            xp: Math.floor(item.xp ?? 0),
            xpNext: max ? 0 : gemXpToNext(def, item.level),
            requires,
            nextRequires: max ? 0 : gemRequirement(def, item.level + 1),
            tags: def.tags.map((t) => TAG_NAMES[t]),
            blurb: def.blurb,
            lines,
            description,
            why,
            links,
            forged: def.forged,
            traits: traitLines(def.skill?.traits),
        };
    }
}

function resetOptions(o: ActorDrawOptions): void {
    o.scale = 1;
    o.flash = 0;
    o.tint = undefined;
    o.alpha = 1;
    o.outline = undefined;
    o.unlit = undefined;
    o.pitch = undefined;
    o.roll = undefined;
}

// The keys for the skill buttons after the mouse's two

// A buff's icon: its skill's
const GEM_ICON = new Map<string, SkillIcon>(GEMS.filter((g) => g.skill).map((g) => [g.id, g.skill!.icon]));

// Stat lines added up by stat and condition, as text: what a lot of passives come to, those with
// no condition first
function summarise(lines: StatLine[]): string[] {
    const totals = new Map<string, StatLine>();
    for (const line of lines) {
        const key = `${line.when ?? ""}|${line.stat}`;
        const was = totals.get(key);
        totals.set(key, was ? { ...was, value: was.value + line.value } : { ...line });
    }
    return [...totals.values()]
        .map((line) => ({ ...line, value: Math.round(line.value * 100) / 100 }))
        .sort((a, b) => (a.when ? 1 : 0) - (b.when ? 1 : 0) || (a.when ?? "").localeCompare(b.when ?? "") || STAT_ORDER(a.stat) - STAT_ORDER(b.stat))
        .map(statText);
}

const STAT_ORDER = (stat: StatKey) => {
    const i = Object.keys(STAT_TEXT).indexOf(stat);
    return i < 0 ? 999 : i;
};

// What's on the ground, as its model, its name and the colour of its name
// The loc a feature's drawn with, as it is now
function featureLoc(f: Feature): number {
    if (f.kind === "shrine") {
        return SHRINES[f.shrine ?? "bandos"].locId;
    }
    if (f.kind === "caves") {
        return FIGHT_CAVES.locId;
    }
    if (f.kind === "breach") {
        return BREACH.locId;
    }
    if (f.kind === "tomb") {
        return BARROWS.sarcophagi[f.brother ?? "dharok"];
    }
    const def = f.kind === "hoard" || f.kind === "barrows" ? HOARD : CHEST;
    return f.used ? def.open : def.closed;
}

function featureName(f: Feature): string {
    switch (f.kind) {
        case "shrine":
            return SHRINES[f.shrine ?? "bandos"].name;
        case "hoard":
            return HOARD.name;
        case "caves":
            return FIGHT_CAVES.name;
        case "tomb":
            return `${MONSTERS[f.brother ?? "dharok"].name.split(" ")[0]}'s sarcophagus`;
        case "barrows":
            return BARROWS.chest;
        case "breach":
            return BREACH.name;
        default:
            return CHEST.name;
    }
}

function featureColor(f: Feature): string {
    switch (f.kind) {
        case "shrine":
            return SHRINES[f.shrine ?? "bandos"].color;
        case "hoard":
            return HOARD.color;
        case "caves":
            return FIGHT_CAVES.color;
        case "tomb":
        case "barrows":
            return BARROWS.color;
        case "breach":
            return BREACH.color;
        default:
            return CHEST.color;
    }
}

function shrineLight(f: Feature): LightLook {
    const color = parseInt(SHRINES[f.shrine ?? "bandos"].color.slice(1), 16);
    return { radius: 5, color, intensity: 0.9, pulse: { amount: 0.3, seconds: 2.5 } };
}

// Why a riftstone can't be opened yet: deeper than the hero's been
function stoneWhyNot(hero: Hero, stone: Item): string | undefined {
    return stone.level > hero.maxDepth ? `Reach rift ${stone.level} first: you've been down to ${hero.maxDepth}.` : undefined;
}

// Where the Heart opens: the deepest the hero has reached, and no shallower than the ladder
function heartDepth(hero: Hero): number {
    return Math.max(HEART.from, hero.maxDepth);
}

function dropObj(d: Drop): number {
    return d.gold ? COINS_OBJ : d.rune ? RUNES[d.rune.id].objId : d.good ? GOODS[d.good.id].objId : itemInfo(d.item!).objId;
}

function dropText(d: Drop): string {
    return d.gold ? `${d.gold} gold` : d.rune ? runeName(d.rune.id, d.rune.count) : d.good ? goodName(d.good.id, d.good.count) : itemInfo(d.item!).name;
}

// A drop worth turning round for: a unique's (a set piece's green, as Diablo II shows them even
// unread), or one of the ladder's rarer high runes (runes.ts runeShines); its pillar's colour and
// light, and the sound it lands with. The rest have none.
type Glory = { rgb: string; light: LightLook; sound: number; volume: number };
const GLORY = {
    unique: glory(RARITY_COLOR.unique, SOUND.uniqueDrop, 0.3),
    set: glory(SET_COLOR, SOUND.setDrop, 0.4),
};
const RUNE_GLORY = new Map<RuneId, Glory>();
const ERRAND_GLORY = new Map<GoodId, Glory>();

function glory(color: string, sound: number, volume: number): Glory {
    const n = parseInt(color.slice(1), 16);
    return { rgb: `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`, light: { radius: 2.5, color: n, intensity: 0.8, pulse: { amount: 0.3, seconds: 2.5 } }, sound, volume };
}

function dropGlory(d: Drop): Glory | undefined {
    // What the Apothecary's errands want: a pillar in its own colour, as a unique's
    if (d.good && isErrandGood(d.good.id)) {
        let g = ERRAND_GLORY.get(d.good.id);
        if (!g) {
            g = glory(GOODS[d.good.id].color, SOUND.uniqueDrop, 0.35);
            ERRAND_GLORY.set(d.good.id, g);
        }
        return g;
    }
    if (d.item?.rarity === "unique" && !isRiftKey(d.item)) {
        return UNIQUE_BY_ID.get(d.item.base)?.set ? GLORY.set : GLORY.unique;
    }
    if (d.rune && runeShines(d.rune.id)) {
        let g = RUNE_GLORY.get(d.rune.id);
        if (!g) {
            g = glory(RUNES[d.rune.id].color, SOUND.runeDrop, 0.4);
            RUNE_GLORY.set(d.rune.id, g);
        }
        return g;
    }
    return undefined;
}

function dropColor(d: Drop): string {
    return d.gold ? "#e8d080" : d.rune ? RUNES[d.rune.id].color : d.good ? GOODS[d.good.id].color : d.item!.forge ? FORGED_COLOR : RARITY_COLOR[d.item!.rarity];
}

// The controls that drink from the belt's four places: the first two keep the ids the flasks had,
// so the keys players set for them stay (controls.ts)
const POTION_CONTROLS: ControlId[] = ["lifeFlask", "manaFlask", "potion3", "potion4"];

function randomSeed(): number {
    return (Math.random() * 0x7fffffff) | 0;
}

// A rift's modifiers as the panels show them, and what they pay in whole percents
function modViews(mods: readonly RiftModId[]): RiftModView[] {
    return mods.map((id) => ({ id, name: RIFT_MODS[id].name, text: RIFT_MODS[id].text }));
}

function rewardView(mods: readonly RiftModId[]): RiftRewardView {
    const r = riftReward(mods);
    const pct = (v: number) => Math.round(v * 100);
    return { quantity: pct(r.quantity), rarity: pct(r.rarity), runes: pct(r.runes), xp: pct(r.xp) };
}


function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, scale: number, color: string): void {
    ctx.font = `${Math.round(16 * scale)}px "OSRS Bold", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000";
    ctx.fillText(text, x + scale, y + scale);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

export { ZONES };
