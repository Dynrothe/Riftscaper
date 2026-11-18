// The player's settings and their heroes, kept in the browser between visits. Never rename a key
// once players have data under it without moving what's there, as moveOldKeys does: the first hero
// ever made is still kept under "riftscaper-save", and each one since under a key of its own, with
// the roster listing them all.
import { readBounty, readWeb } from "../sim/web";
import { readQuests } from "../sim/quests";
import { CLASS_IDS, SKILL_SLOTS } from "../content/classes";
import { readRecipe } from "../content/forge";
import { KeyBindings, defaultBindings, readBindings } from "./controls";
import { CLASS_COLOR, GEM_BY_ID, MAX_GEM_LEVEL } from "../content/gems";
import { BASE_BY_ID, ClassId, MAX_SOCKETS, SLOTS, SocketColor, UNIQUE_BY_ID } from "../content/items";
import { CLASS_LOOKS, Look, readLook } from "../content/looks";
import { HERO, STASH } from "../content/rules";
import { RUNE_IDS } from "../content/runes";
import { RUNEWORD_BY_ID } from "../content/runewords";
import { MAX_RIFT_MODS, RiftModId, isRiftMod } from "../content/riftMods";
import { INVOCATION_IDS, InvocationId, isInvocation } from "../content/tombs";

// Invocations, each once, in their own order; none if there were none
function readInvocations(raw: unknown): InvocationId[] | undefined {
    if (!Array.isArray(raw)) {
        return undefined;
    }
    const ids = new Set(raw.filter(isInvocation));
    return INVOCATION_IDS.filter((id) => ids.has(id));
}
import { RIFTSTONE, RIFTSTONE_BASE, SHARD_BY_BASE } from "../content/riftstones";
import { TASKS } from "../content/tasks";
import { BASIC, cleanBar, grantLevelGems, starterSockets } from "../sim/gems";
import { GOOD_IDS } from "../content/goods";
import { GOD_IDS, PINNACLE_IDS, PinnacleId } from "../content/pinnacles";
import { ELIXIRS, ELIXIR_SECONDS, ElixirId } from "../content/potions";
import { PRAYER_IDS, PrayerId } from "../content/prayers";
import { HIRELING_KINDS, HIRELING_SLOTS, HirelingKind } from "../content/hirelings";
import type { Hire } from "../sim/hirelings";
import { Hero, giveStarterPotions } from "../sim/hero";
import { BELT_SIZE, beltWhyNot, clearShutPlaces, mendPotion } from "../sim/potions";
import type { Item, Socket } from "../sim/loot";
import { FORGED, itemInfo } from "../sim/loot";
import { TREE_VERSION, oldLadderPoints, soundPassives } from "../sim/passives";
import { ENCHANTABLE, PASSIVES } from "../content/passives";
import { RunePouch, emptyPouch } from "../sim/runes";
import { Task, readTask } from "../sim/tasks";
import { logHeld } from "../sim/log";
import { readOrrery } from "../sim/orrery";
import { PET_BY_ID } from "../content/pets";

// A list of strings saved, or none
function strings(raw: unknown): string[] | undefined {
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : undefined;
}

const SETTINGS_KEY = "riftscaper-settings";
export const SAVE_KEY = "riftscaper-save";
const ROSTER_KEY = "riftscaper-heroes";
export const AUDIO_SETTINGS_KEY = "riftscaper-audio";
// The most heroes kept at once
export const MAX_HEROES = 10;

// What every key began with while the game was called Runefall
const OLD_PREFIX = "runefall-";
const PREFIX = "riftscaper-";

// Moves everything saved under the game's old name to its own: the heroes (runefall-save,
// runefall-save-2...), the roster, with the keys it lists renamed too, the settings and the sound.
// The roster goes last, so a move cut short (storage full) is finished the next time the game
// opens. A key already taken under the new name is kept, and the old one left where it is. Run it
// before anything reads a save.
export function moveOldKeys(): void {
    try {
        const old: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(OLD_PREFIX)) {
                old.push(key);
            }
        }
        const oldRoster = OLD_PREFIX + ROSTER_KEY.slice(PREFIX.length);
        old.sort((a, b) => Number(a === oldRoster) - Number(b === oldRoster));
        for (const key of old) {
            const value = localStorage.getItem(key);
            const moved = PREFIX + key.slice(OLD_PREFIX.length);
            if (value === null || localStorage.getItem(moved) !== null) {
                continue;
            }
            localStorage.setItem(moved, key === oldRoster ? renameRosterSlots(value) : value);
            localStorage.removeItem(key);
        }
    } catch {
        // No storage, or it's full: what's left is moved the next time
    }
}

// The roster as saved, with the keys it lists under the new name
function renameRosterSlots(json: string): string {
    const rename = (slot: unknown) => (typeof slot === "string" && slot.startsWith(OLD_PREFIX) ? PREFIX + slot.slice(OLD_PREFIX.length) : slot);
    try {
        const roster = JSON.parse(json);
        if (roster && Array.isArray(roster.slots)) {
            return JSON.stringify({ ...roster, slots: roster.slots.map(rename), last: rename(roster.last) });
        }
    } catch {
        // Unreadable: kept as it was, and read as none
    }
    return json;
}

export type Settings = {
    // The interface's size on top of what fits the window (uiScale.ts), 1 as it fits
    uiSize: number;
    seenHelp: boolean;
    // Loot's names shown on the ground (Z), or only the one the mouse is over
    labels: boolean;
    // The screen shaking for big hits (Juice.ts)
    shake: boolean;
    // Animations smoothed between their keyframes (a bake's tweenTicks), which costs memory;
    // unset, it's on but on a touch screen
    smoothing?: boolean;
    // The keyboard's controls as the player's set them (controls.ts)
    keys: KeyBindings;
    // How loud, 0 to 1, on top of the master volume (kept by GameAudio under AUDIO_SETTINGS_KEY):
    // the world's sounds (blows, spells, monsters), and the interface's (clicks, coins, the portal)
    combatVolume: number;
    interfaceVolume: number;
};

export const DEFAULT_SETTINGS: Settings = { uiSize: 1, seenHelp: false, labels: true, shake: true, keys: defaultBindings(), combatVolume: 1, interfaceVolume: 1 };
const volume = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? clamp(v, 0, 1) : 1);
export const UI_SIZE_RANGE = { min: 0.75, max: 1.5 };

export function loadSettings(): Settings {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
        return {
            uiSize: clamp(Number(saved.uiSize) || 1, UI_SIZE_RANGE.min, UI_SIZE_RANGE.max),
            seenHelp: !!saved.seenHelp,
            labels: saved.labels !== false,
            shake: saved.shake !== false,
            smoothing: typeof saved.smoothing === "boolean" ? saved.smoothing : undefined,
            keys: readBindings(saved.keys),
            combatVolume: volume(saved.combatVolume),
            interfaceVolume: volume(saved.interfaceVolume),
        };
    } catch {
        return { ...DEFAULT_SETTINGS, keys: defaultBindings() };
    }
}

export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
        // A private window: they last the visit
    }
}

const SOCKET_COLORS: SocketColor[] = ["red", "green", "blue", "white"];

// Rift modifiers from a save: those the game still has, none twice, so many at most
function readRiftMods(raw: unknown, most: number): RiftModId[] {
    return Array.isArray(raw) ? [...new Set<RiftModId>(raw.filter(isRiftMod))].slice(0, most) : [];
}

// An item from a save, if it's still something the game has, with the gems in its sockets
// A hireling as saved, if it's one the game has
function readHire(saved: unknown): Hire | undefined {
    const raw = saved as { kind?: HirelingKind; name?: unknown; dead?: unknown; equipment?: Record<string, unknown> } | null | undefined;
    if (!raw || !raw.kind || !HIRELING_KINDS.includes(raw.kind) || typeof raw.name !== "string") {
        return undefined;
    }
    const equipment: Hire["equipment"] = {};
    for (const slot of HIRELING_SLOTS) {
        const item = readItem(raw.equipment?.[slot]);
        if (item) {
            equipment[slot] = item;
        }
    }
    return { kind: raw.kind, name: raw.name, dead: raw.dead === true ? true : undefined, equipment };
}

function readItem(raw: unknown): Item | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const item = raw as Item;
    // A riftstone or a shard (riftstones.ts): a key, not gear
    if (typeof item.uid === "number" && (item.base === RIFTSTONE_BASE || SHARD_BY_BASE.has(item.base))) {
        const stone = item.base === RIFTSTONE_BASE;
        const rarity = stone ? (["normal", "magic", "rare"].includes(item.rarity) ? item.rarity : "normal") : "unique";
        const out: Item = { uid: item.uid, base: item.base, rarity, level: Math.max(1, Number(item.level) || 1), mods: [] };
        if (stone) {
            out.rift = readRiftMods(item.rift, rarity === "rare" ? RIFTSTONE.most.rare : rarity === "magic" ? RIFTSTONE.most.magic : 0);
        }
        return out;
    }
    // A forged gem's recipe, if it's one the game can still make
    const forge = item.rarity === "gem" && item.base === FORGED ? readRecipe(item.forge) : undefined;
    const known = item.rarity === "gem" ? GEM_BY_ID.has(item.base) || !!forge : item.rarity === "unique" ? UNIQUE_BY_ID.has(item.base) : BASE_BY_ID.has(item.base);
    if (!known || typeof item.uid !== "number" || !Array.isArray(item.mods)) {
        return null;
    }
    const out: Item = { uid: item.uid, base: item.base, rarity: item.rarity, level: Number(item.level) || 1, mods: item.mods, rareName: item.rareName };
    if (item.rarity === "gem") {
        out.level = Math.max(1, Math.min(MAX_GEM_LEVEL, out.level));
        out.xp = Math.max(0, Number(item.xp) || 0);
        out.mods = [];
        if (forge) {
            out.forge = forge;
        }
        return out;
    }
    // Aubury's enchant (enchant.ts), if it's a notable that can still be had so
    if (typeof item.enchant === "number" && ENCHANTABLE.includes(item.enchant)) {
        out.enchant = item.enchant;
    }
    // A potion's doses and its instil (potions.ts), brought into range
    if (typeof item.charges === "number") {
        out.charges = item.charges;
    }
    if (typeof item.instil === "string") {
        out.instil = item.instil;
    }
    // A runeword, if the game still has it; a unique's rolled numbers, one a stat line; and
    // whether Reldo has read it yet
    if (typeof item.runeword === "string" && RUNEWORD_BY_ID.has(item.runeword) && item.rarity === "normal") {
        out.runeword = item.runeword;
    }
    if (item.rarity === "unique" && Array.isArray(item.rolls) && item.rolls.length === UNIQUE_BY_ID.get(item.base)!.stats.length && item.rolls.every((v) => typeof v === "number")) {
        out.rolls = item.rolls;
    }
    if (item.rarity === "unique" && item.unid === true) {
        out.unid = true;
    }
    mendPotion(out);
    if (Array.isArray(item.sockets)) {
        out.sockets = item.sockets.slice(0, 6).map((raw: Socket): Socket => {
            const gem = readItem(raw?.gem);
            return {
                color: SOCKET_COLORS.includes(raw?.color) ? raw.color : "white",
                linked: raw?.linked === true,
                gem: gem && gem.rarity === "gem" ? gem : undefined,
            };
        });
        if (out.sockets.length > 0) {
            out.sockets[out.sockets.length - 1].linked = false;
        }
    }
    return out;
}

// ---- The roster: every hero, by the key they're saved under ----

type Roster = { slots: string[]; last?: string };

function readRoster(): Roster {
    try {
        const raw = JSON.parse(localStorage.getItem(ROSTER_KEY) ?? "null");
        if (raw && Array.isArray(raw.slots)) {
            const slots = [...new Set<string>(raw.slots.filter((s: unknown): s is string => typeof s === "string" && s.startsWith(SAVE_KEY)))];
            return { slots, last: typeof raw.last === "string" && slots.includes(raw.last) ? raw.last : undefined };
        }
    } catch {
        // Unreadable: as if there were none, but for the first hero's own key
    }
    // From before there was a roster: the one hero there was, if any
    const legacy = localStorage.getItem(SAVE_KEY) !== null;
    return { slots: legacy ? [SAVE_KEY] : [], last: legacy ? SAVE_KEY : undefined };
}

function writeRoster(roster: Roster): void {
    try {
        localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    } catch {
        // A private window: it lasts the visit
    }
}

// What the hero select screen shows of each hero, without loading the rest
export type HeroSummary = {
    slot: string;
    name: string;
    cls: ClassId;
    level: number;
    maxDepth: number;
    hardcore: boolean;
    fallen: boolean;
    kills: number;
    deaths: number;
    gold: number;
};

// Every hero kept, the last played first
export function listHeroes(): { slot: string; hero: Hero }[] {
    const roster = readRoster();
    const out: { slot: string; hero: Hero }[] = [];
    for (const slot of roster.slots) {
        const hero = loadHero(slot);
        if (hero) {
            out.push({ slot, hero });
        }
    }
    const last = out.findIndex((h) => h.slot === roster.last);
    if (last > 0) {
        out.unshift(...out.splice(last, 1));
    }
    return out;
}

export function summarise(slot: string, hero: Hero): HeroSummary {
    return {
        slot,
        name: hero.name,
        cls: hero.cls,
        level: hero.level,
        maxDepth: hero.maxDepth,
        hardcore: hero.hardcore,
        fallen: hero.fallen,
        kills: hero.kills,
        deaths: hero.deaths,
        gold: hero.gold,
    };
}

// A key no hero's saved under yet: the first hero's own while it's free
export function freeSlot(): string {
    const taken = new Set(readRoster().slots);
    if (!taken.has(SAVE_KEY) && localStorage.getItem(SAVE_KEY) === null) {
        return SAVE_KEY;
    }
    for (let n = 2; ; n++) {
        const slot = `${SAVE_KEY}-${n}`;
        if (!taken.has(slot) && localStorage.getItem(slot) === null) {
            return slot;
        }
    }
}

export function heroCount(): number {
    return readRoster().slots.length;
}

// The hero last played, to have them chosen when the game opens
export function setLastHero(slot: string): void {
    const roster = readRoster();
    if (roster.slots.includes(slot)) {
        writeRoster({ ...roster, last: slot });
    }
}

// Gone for good
export function deleteHero(slot: string): void {
    const roster = readRoster();
    writeRoster({ slots: roster.slots.filter((s) => s !== slot), last: roster.last === slot ? undefined : roster.last });
    try {
        localStorage.removeItem(slot);
    } catch {
        // Nothing to do
    }
}

export function loadHero(slot = SAVE_KEY): Hero | undefined {
    try {
        const raw = JSON.parse(localStorage.getItem(slot) ?? "null");
        if (!raw || !CLASS_IDS.includes(raw.cls)) {
            return undefined;
        }
        const inventory: (Item | null)[] = new Array(HERO.inventorySize).fill(null);
        (Array.isArray(raw.inventory) ? raw.inventory : []).slice(0, HERO.inventorySize).forEach((it: unknown, i: number) => {
            inventory[i] = readItem(it);
        });
        const equipment: Hero["equipment"] = {};
        for (const slot of SLOTS) {
            const item = readItem(raw.equipment?.[slot]);
            if (item) {
                equipment[slot] = item;
            }
        }
        const num = (v: unknown, otherwise: number) => (typeof v === "number" && Number.isFinite(v) ? v : otherwise);
        // A hero saved before the stash and runes has an empty stash and pouch
        const stash: (Item | null)[] = new Array(STASH.tabs * STASH.tabSize).fill(null);
        (Array.isArray(raw.stash) ? raw.stash : []).slice(0, stash.length).forEach((it: unknown, i: number) => {
            stash[i] = readItem(it);
        });
        const runes: RunePouch = emptyPouch();
        for (const id of RUNE_IDS) {
            runes[id] = Math.max(0, Math.floor(num(raw.runes?.[id], 0)));
        }
        const look: Look = readLook(raw.look, CLASS_LOOKS[raw.cls as ClassId]);
        // The talismans in the tree's sockets (talismans.ts), by the socket's node: a hero saved
        // before them has none
        const talismans: Hero["talismans"] = {};
        for (const [key, it] of Object.entries(raw.talismans && typeof raw.talismans === "object" ? raw.talismans : {})) {
            const id = Number(key);
            const item = readItem(it);
            if (item && PASSIVES[id]?.kind === "socket" && itemInfo(item).slot === "talisman") {
                talismans[id] = item;
            }
        }
        const hero: Hero = {
            cls: raw.cls,
            name: String(raw.name ?? raw.cls).slice(0, 24),
            // A hero from before looks has their class's own
            look,
            hardcore: raw.hardcore === true,
            fallen: raw.fallen === true,
            level: Math.max(1, num(raw.level, 1)),
            xp: Math.max(0, num(raw.xp, 0)),
            gold: Math.max(0, num(raw.gold, 0)),
            inventory,
            equipment,
            depth: Math.max(1, num(raw.depth, 1)),
            maxDepth: Math.max(1, num(raw.maxDepth, 1)),
            // A hero saved before the levels went past 60 keeps the ladder's second points a depth
            ladderPoints: typeof raw.ladderPoints === "number" ? Math.max(0, Math.floor(raw.ladderPoints)) : oldLadderPoints(Math.max(1, num(raw.maxDepth, 1))),
            zoneSeed: num(raw.zoneSeed, 1) >>> 0,
            // A hero saved before rift modifiers had no rift open across a reload
            riftOpen: raw.riftOpen === true,
            // A riftstone's rift can hold more than the Archmage weaves (riftstones.ts)
            riftMods: readRiftMods(raw.riftMods, Math.max(MAX_RIFT_MODS, RIFTSTONE.most.rare)),
            // A hero saved before the Heart of the Rift had it shut, and one saved before the other
            // pinnacles had the Heart's flag alone
            riftPinnacle: raw.riftOpen !== true ? undefined : PINNACLE_IDS.includes(raw.riftPinnacle) ? (raw.riftPinnacle as PinnacleId) : raw.riftHeart === true ? "heart" : undefined,
            // and no kill count
            killCount: Object.fromEntries(GOD_IDS.map((id) => [id, Math.max(0, Math.floor(num(raw.killCount?.[id], 0)))]).filter(([, n]) => (n as number) > 0)),
            nextUid: Math.max(1, num(raw.nextUid, 1000)),
            // The belt (potions.ts): a hero saved before potions is given the two the flasks were,
            // below; a potion in a place it can't be in goes nowhere
            potions: Array.from({ length: BELT_SIZE }, (_, i) => {
                const item = Array.isArray(raw.potions) ? readItem(raw.potions[i]) : null;
                return item && !beltWhyNot(item, i) ? item : null;
            }),
            // and the places the Apothecary's stitched on past the first two: none, saved before
            beltStitched: Math.max(0, Math.min(BELT_SIZE - 2, Math.floor(num(raw.beltStitched, 0)))),
            // Herbs and the like, those the game still has
            goods: Object.fromEntries(GOOD_IDS.map((id) => [id, Math.max(0, Math.floor(num(raw.goods?.[id], 0)))]).filter(([, n]) => (n as number) > 0)),
            elixir:
                raw.elixir && typeof raw.elixir === "object" && raw.elixir.id in ELIXIRS && num(raw.elixir.left, 0) > 0
                    ? { id: raw.elixir.id as ElixirId, left: Math.min(ELIXIR_SECONDS, num(raw.elixir.left, 0)) }
                    : undefined,
            kills: num(raw.kills, 0),
            deaths: num(raw.deaths, 0),
            passives: Array.isArray(raw.passives) ? raw.passives.filter((id: unknown) => typeof id === "number") : [],
            talismans,
            // A hero whose points were spent on an older tree has a free reset (passives.ts)
            treeVersion: num(raw.treeVersion, 0),
            skillBar: Array.from({ length: SKILL_SLOTS }, (_, i) => {
                const ref = raw.skillBar?.[i];
                return typeof ref === "number" ? ref : null;
            }),
            rewarded: num(raw.rewarded, -1),
            runes,
            craftSeed: num(raw.craftSeed, (num(raw.zoneSeed, 1) ^ 0x2c9a17e5) >>> 0) >>> 0,
            stash,
            // The prayers on, those the game has (content/prayers.ts): none for a hero saved before them
            prayers: (Array.isArray(raw.prayers) ? raw.prayers : []).filter((id: unknown): id is PrayerId => typeof id === "string" && PRAYER_IDS.includes(id as PrayerId)),
            // Their hireling (content/hirelings.ts): none for a hero saved before them
            hireling: readHire(raw.hireling),
            quests: readQuests(raw.quests),
            web: readWeb(raw.web),
            riftLane: raw.riftOpen === true && typeof raw.riftLane === "number" ? raw.riftLane : undefined,
            riftBounty: raw.riftOpen === true ? readBounty(raw.riftBounty) : undefined,
            riftAwakened: raw.riftOpen === true && raw.riftAwakened === true ? true : undefined,
            // The Tombs' invocations (content/tombs.ts): none for a hero saved before them
            invocations: readInvocations(raw.invocations),
            riftInvocations: raw.riftOpen === true ? readInvocations(raw.riftInvocations) : undefined,
            log: strings(raw.log),
            achievements: strings(raw.achievements),
            pets: strings(raw.pets)?.filter((id) => PET_BY_ID.has(id)),
            pet: typeof raw.pet === "string" && PET_BY_ID.has(raw.pet) ? raw.pet : undefined,
            orrery: readOrrery(raw.orrery),
            // A hero saved before tasks has none; a task naming what the game no longer has is dropped
            tasks: (Array.isArray(raw.tasks) ? raw.tasks : [])
                .map((t: unknown) => readTask(t, readItem))
                .filter((t: Task | undefined): t is Task => t !== undefined)
                .slice(0, TASKS.most),
        };
        if (hero.rewarded < 0) {
            fromBeforeGems(hero);
        }
        // Uids made since the save can't be the same as one in it
        let most = hero.nextUid;
        const see = (item: Item | null | undefined) => {
            if (item) {
                most = Math.max(most, item.uid + 1);
                item.sockets?.forEach((s) => see(s.gem));
            }
        };
        hero.inventory.forEach(see);
        hero.stash.forEach(see);
        hero.tasks.forEach((t) => {
            most = Math.max(most, t.uid + 1);
            see(t.reward.item);
        });
        SLOTS.forEach((slot) => see(hero.equipment[slot]));
        Object.values(hero.talismans).forEach(see);
        hero.potions.forEach(see);
        hero.nextUid = most;
        if (!Array.isArray(raw.potions)) {
            giveStarterPotions(hero);
        }
        // A hero saved while the belt's four places were open from the start keeps what was in
        // those not open yet, in the pack
        clearShutPlaces(hero);
        soundPassives(hero);
        if (hero.passives.length === 0) {
            hero.treeVersion = TREE_VERSION;
        }
        cleanBar(hero);
        // A save from before the collection log lights what's held now
        logHeld(hero);
        return hero;
    } catch {
        return undefined;
    }
}

// A hero saved before gems and the passive tree: sockets in what they wear, of their class's
// colour and linked, and every gem their level has brought
function fromBeforeGems(hero: Hero): void {
    for (const slot of SLOTS) {
        const item = hero.equipment[slot];
        if (!item || item.sockets || MAX_SOCKETS[slot] === 0) {
            continue;
        }
        item.sockets = starterSockets(hero.cls, slot) ?? [{ color: CLASS_COLOR[hero.cls], linked: false }];
    }
    hero.rewarded = 0;
    hero.skillBar = new Array(SKILL_SLOTS).fill(null);
    grantLevelGems(hero);
    if (!hero.skillBar.includes(BASIC) && hero.skillBar[0] === null) {
        hero.skillBar[0] = BASIC;
    }
}

export function saveHero(hero: Hero, slot = SAVE_KEY): void {
    try {
        localStorage.setItem(slot, JSON.stringify(hero));
        const roster = readRoster();
        if (!roster.slots.includes(slot)) {
            writeRoster({ slots: [...roster.slots, slot], last: slot });
        }
    } catch {
        // A private window, or storage full: it lasts the visit
    }
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}
