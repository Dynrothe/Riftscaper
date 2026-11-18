// What the screens show, kept apart from the game so React can watch it (useSyncExternalStore):
// the client sets it, the UI reads it and calls back into the client.
import type { InvocationId } from "../content/tombs";
import type { QuestId } from "../content/quests";
import type { HirelingKind, HirelingSlot } from "../content/hirelings";
import type { PrayerId } from "../content/prayers";
import type { GloryId } from "../content/colosseum";
import type { KeyBindings } from "./controls";
import { useSyncExternalStore } from "react";

import type { GemColor, SkillIcon } from "../content/gems";
import type { ClassId, Rarity, Slot, SocketColor, TalismanPower } from "../content/items";
import type { Look } from "../content/looks";
import type { RuneId } from "../content/runes";
import type { GoodId } from "../content/goods";
import type { ElixirId } from "../content/potions";
import type { PinnacleId } from "../content/pinnacles";
import type { ShopId } from "../content/town";
import type { SocketWork } from "../sim/gems";
import type { RuneTarget } from "../sim/runes";
import type { ItemInfo } from "../sim/loot";
import type { Omni } from "../sim/passives";

export type Screen = "loading" | "title" | "play";

// The title's steps, as the genre has them: the heroes there are, a class for a new one from the
// line, then how they look, their name, and whether they've one life only
export type TitleStep = "heroes" | "class" | "look";

// A hero on the hero select screen
export type HeroCard = {
    slot: string;
    name: string;
    cls: ClassId;
    level: number;
    maxDepth: number;
    zone: string;
    hardcore: boolean;
    fallen: boolean;
    kills: number;
    deaths: number;
};

// The hero being made, on the look step
export type Creation = {
    cls: ClassId;
    look: Look;
    name: string;
    hardcore: boolean;
    // Shown in their first gear, or in what's under it
    showGear: boolean;
    // What's wrong with the name, once they've tried it
    problem?: string;
};

// An item as the screens show it
export type ItemView = {
    uid: number;
    rarity: Rarity;
    info: ItemInfo;
    // Its stats as lines of text, the base's own first
    implicit: string[];
    lines: string[];
    // Why it can't be worn, if it can't
    why?: string;
    sell: number;
    itemLevel: number;
    // Its sockets, with what's in them
    sockets?: SocketView[];
    // A gem's own
    gem?: GemView;
    // Why each rune can't be used on it, for the runes that can't
    runeWhy: Partial<Record<RuneId, string>>;
    // Its name's colour (a set piece's green, a runeword's gold), and its look's kind past its rarity
    color: string;
    tone?: "set" | "runeword";
    // Its rift-touched affixes' lines, drawn as their own
    rift: string[];
    // A set piece's set: its pieces, those worn lit, and its bonuses, those had lit
    set?: { name: string; pieces: { name: string; worn: boolean }[]; bonuses: { pieces: number; lines: string[]; active: boolean }[] };
};

// A rune in the pouch, or on Aubury's counter at a price
export type RuneView = { id: RuneId; name: string; objId: number; color: string; blurb: string; count: number; price?: number };

// A herb in the pouch (content/goods.ts)
export type GoodView = { id: GoodId; name: string; objId: number; color: string; blurb: string; count: number };

// A place in the belt as the bar shows it: its potion's icon and doses (a share of the next filling),
// and the key that drinks it
export type BeltSlot = { key: string; name?: string; objId?: number; rarity?: Rarity; doses: number; most: number; share?: number; empty: boolean };

export type SocketView = { color: SocketColor; linked: boolean; gem?: ItemView };

export type GemView = {
    color: GemColor;
    support: boolean;
    level: number;
    maxLevel: number;
    xp: number;
    xpNext: number;
    // The hero's level it needs now, and for its next
    requires: number;
    nextRequires: number;
    tags: string[];
    blurb?: string;
    // What it does at its level: a skill's as the hero has it if it's worn, a support's
    lines: string[];
    // A skill's cost, cooldown and words
    description?: string;
    // Why it does nothing where it is, if it doesn't (the hero's level, the weapon)
    why?: string;
    // What it's supporting or supported by, where it's socketed
    links?: string[];
    // Rolled when it dropped (forge.ts), with what its traits do
    forged?: boolean;
    traits: string[];
};

export type SkillRow = {
    // A gem's uid, -1 for the weapon's attack, null for an empty button
    ref: number | null;
    name: string;
    key: string;
    description: string;
    lines: string[];
    supports: string[];
    icon?: SkillIcon;
    // Why it can't be used, if it can't
    why?: string;
    mana: number;
    life: number;
    affordable: boolean;
    // 0 ready, to 1 just used
    cooldown: number;
    cooldownSeconds: number;
};

// A skill that can go on a button, in the button's picker
export type SkillChoice = { ref: number; name: string; icon: SkillIcon; level: number; supports: string[]; why?: string; on?: string };

export type Hud = {
    name: string;
    cls: ClassId;
    hardcore: boolean;
    hideHelm: boolean;
    life: number;
    maxLife: number;
    mana: number;
    maxMana: number;
    // The prayers on (content/prayers.ts), and what they keep of the most mana, or the most life
    prayers: PrayerId[];
    reserved: { mana: number; life: number };
    // The hireling (content/hirelings.ts), for its portrait: its life as a share, and whether it's
    // fallen
    hireling?: { name: string; title: string; life: number; dead: boolean };
    level: number;
    xp: number;
    xpNext: number;
    gold: number;
    // The belt's places open, the ward over the hero's life, and the elixir they've drunk, if any
    potions: BeltSlot[];
    ward: number;
    elixir?: { name: string; objId: number; seconds: number };
    skills: SkillRow[];
    zone: string;
    depth: number;
    areaLevel: number;
    killed: number;
    total: number;
    boss?: { name: string; title: string; life: number; awake: boolean; dead: boolean };
    portalOpen: boolean;
    // Whole seconds till the rift collapses (none in the city, or once its guardian's dead)
    timeLeft?: number;
    // Buffs on the hero, and the seconds left of each
    // What's on the hero, an ailment (a monster mod's) shown as one
    buffs: { name: string; seconds: number; icon?: SkillIcon; ailment?: boolean }[];
    // Passive points not yet spent
    points: number;
    dead: boolean;
    // In the city: no skills, and the rift left open, if one is
    town: boolean;
    riftOpen?: string;
    // The rift's modifiers (in the city, the open rift's), and what they pay
    mods: RiftModView[];
    reward: RiftRewardView;
    // The teleport home gathering, 0 to 1
    channel?: number;
    // The tasks the city's folk have set the hero, as far as they've got
    tasks: TaskView[];
    // Reldo's quest for the rift the hero's in, or in the city one done to claim (content/quests.ts)
    quest?: { name: string; ask: string; ready: boolean };
    // The ladder encounter under way, as Pest Control's own overlay is: its name, how it stands, and
    // a bar for what's at stake
    encounter?: { name: string; color: string; lines: string[]; share?: number };
};

export type StatRow = { label: string; value: string };

export type Pack = {
    inventory: (ItemView | null)[];
    equipment: Partial<Record<Slot, ItemView>>;
    // The belt's potions, what opens each place not open yet, and the herbs in the pouch
    potions: (ItemView | null)[];
    beltShut: (string | null)[];
    goods: GoodView[];
    stats: StatRow[];
    gambleCost: number;
    // The rune pouch, every rune whether there are any or not
    runes: RuneView[];
    // The banker's stash, while it's open: its tabs end to end
    stash?: (ItemView | null)[];
    // What each piece of socket work costs on what's worn, where it can be done
    socketWork: Partial<Record<Slot, Partial<Record<SocketWork, number>>>>;
    // The hireling, and the Captain's offers while he's spoken to
    hireling?: HirelingView;
    captain?: CaptainView;
};

// The hero's hireling as its panel shows it (content/hirelings.ts)
export type HirelingView = {
    kind: HirelingKind;
    name: string;
    title: string;
    text: string;
    level: number;
    dead: boolean;
    life: number;
    maxLife: number;
    armour: number;
    damage: string;
    dps: number;
    blows: string;
    // Its own weapon's name, with none given it
    own?: string;
    equipment: Record<HirelingSlot, ItemView | null>;
};

// The Captain's: each kind for hire, and what hiring and raising cost
export type CaptainView = {
    hireCost: number;
    raiseCost: number;
    offers: { kind: HirelingKind; name: string; text: string; life: number; weapon: string }[];
};

// The passive tree as the hero has it
export type TreeView = {
    cls: ClassId;
    taken: number[];
    points: number;
    total: number;
    refundCost: number;
    resetCost: number;
    gold: number;
    // Everything taken adds up to, as lines
    summary: string[];
    // The talismans in its sockets (talismans.ts), by socket, and those in the pack to set in one
    talismans: Record<number, ItemView>;
    packTalismans: { index: number; item: ItemView }[];
    // The unique talismans' radii in sockets taken, to draw; the Elemental ones', for the way to a
    // node (passives.ts)
    fields: { socket: number; radius: number; power: TalismanPower }[];
    omni: Omni[];
    // Starting over is free, once: the tree's changed since the points were spent
    freeReset: boolean;
};

export type Toast = { id: number; text: string; until: number; tone?: "warn" | "good" | "loot"; color?: string };

// The pack on its own, a shop or the banker's stash beside it, the Archmage's rifts, or one of the
// folk speaking of a task
export type Panel = "inventory" | "shop" | "stash" | "archmage" | "task" | "caves" | "glory" | "prayer" | "hireling" | "captain" | "quests" | "log" | "orrery";

// The record (sim/log.ts): the collection log's pages, each slot lit or not; the pets, and the one
// that follows; the combat achievements, their points, and Ghommal's hilts they open
export type LogView = {
    pages: { id: string; name: string; have: number; entries: { key: string; name: string; objId: number; have: boolean }[] }[];
    have: number;
    total: number;
    pets: { id: string; name: string; objId: number; have: boolean; following: boolean }[];
    achievements: { id: string; name: string; text: string; tier: string; points: number; done: boolean }[];
    points: number;
    totalPoints: number;
    hilts: { name: string; objId: number; points: number; text: string; have: boolean }[];
};

// The orrery (sim/orrery.ts): the points to spend, the spheres lit, each arm's nodes as they stand,
// what giving one back costs, and the favoured hosts' places
export type OrreryView = {
    points: number;
    spheres: { key: string; name: string }[];
    arms: { id: string; name: string; nodes: { id: number; name: string; text: string; notable: boolean; taken: boolean; why?: string; refundWhy?: string }[] }[];
    refund: number;
    places: number;
    favour: string[];
    hosts: { id: string; name: string }[];
};

// The Fight Caves' choice after a wave (content/encounters.ts): what's held, and what the next
// wave would make it
export type CavesView = { wave: number; waves: number; tokkul: number; next: number };

// Minimus's offer after a Colosseum wave (content/colosseum.ts): three glories, each with its rule,
// what it's worth and how many times it's been taken, and the glory so far
export type GloryView = { wave: number; waves: number; glory: number; offers: { id: GloryId; name: string; text: string; glory: number; taken: number }[] };

// A task as the tracker and its giver show it (sim/tasks.ts)
export type TaskView = {
    uid: number;
    // Who set it, and pays for it
    giver: string;
    objective: string;
    where: string;
    progress: number;
    count: number;
    done: boolean;
};

// Reldo's quest log (content/quests.ts): every quest, where it's done, what it leaves and how it
// stands; whether he has a task of his own besides, and the gem trader's favours waiting
export type QuestLogView = {
    says: string;
    quests: {
        id: QuestId;
        name: string;
        where: string;
        ask: string;
        gives: string;
        tale: string;
        state: "unseen" | "open" | "ready" | "claimed";
        progress?: string;
    }[];
    task: boolean;
    favours: string[];
    // At level 99, the Max cape for its price, or why not
    maxCape?: { price: number; why?: string };
};

// What a task pays
export type TaskRewardView = { gold: number; xp: number; item?: ItemView; runes?: RuneView; goods?: { name: string; objId: number; count: number } };

// One of the folk, spoken to about a task: one they offer, one the hero's doing for them, or one
// done and waiting to be paid for
export type TaskDialogView = {
    giver: string;
    title: string;
    says: string;
    state: "offer" | "held" | "done";
    task: TaskView;
    reward: TaskRewardView;
    // Why it can't be taken, or paid for, if it can't
    why?: string;
};

// A shop, open: its shelves (or its gambling), and what it says
export type ShopView = {
    id: ShopId;
    name: string;
    keeper: string;
    greeting: string;
    gamble: boolean;
    // Gems on the shelves, and socket work
    gems: boolean;
    stock: { item: ItemView; price: number }[];
    // Runes behind the counter (Aubury's)
    runes: RuneView[];
    // Rings and amulets enchanted with a notable of the tree (Aubury's, enchant.ts)
    enchants: boolean;
    // The Apothecary's brewing (sim/potions.ts)
    apothecary?: ApothecaryView;
    // A set for an encounter's money (TzHaar-Hur-Tel's obsidian for tokkul, the Void Knight's
    // equipment, Felix's raiments), and how much of it the hero has
    stall?: {
        title: string;
        money: string;
        text: string;
        held: number;
        offers: { id: string; item: ItemView; price: number }[];
        // A piece made elite from the one it was, goods, and a talisman of a base chosen
        // (docs/late-game.md E)
        upgrades: { to: string; item: ItemView; from: string; price: number; why?: string }[];
        wares: { good: GoodId; name: string; objId: number; blurb: string; price: number }[];
        talismans?: { price: number; text: string; bases: { id: string; name: string; objId: number }[] };
    };
    // Fortunato's elite gamble past the campaign: the level it's at, and its price
    eliteGamble?: { level: number; cost: number };
    // Aubury's runewords and transmuting circle (runewords.ts, circle.ts)
    jeweller?: JewellerView;
};

// What Aubury's bench can do: the runewords, each with what it takes and what's short, and the
// items in the pack and worn a word could go on, with why each word can't; and the circle's
// recipes, each with what it gives or why not
export type JewellerView = {
    words: { id: string; name: string; runes: { name: string; objId: number; color: string; have: boolean }[]; fits: string; level: number; lines: string[]; powers: string[]; lore: string; short?: string }[];
    bases: { key: string; target: RuneTarget; item: ItemView; where: string; why: Record<string, string | undefined> }[];
    circle: {
        runes: { id: RuneId; name: string; objId: number; count: number; to: string; toObjId: number }[];
        herbs: { id: GoodId; name: string; objId: number; count: number; to: string; toObjId: number }[];
        riftstones: number[];
        rejuv?: string;
        // The secret recipe, once some of its makings are found: why it can't be laid yet, if not
        chicken?: { why?: string };
        elite: { key: string; target: RuneTarget; item: ItemView; where: string; to?: string; why?: string }[];
        // The late game's: each unique the hero has with an upgrade (an index into circle.ts
        // UPGRADES), what it takes and why not; and the makes whose makings the hero has some of
        upgrades: { key: string; target: RuneTarget; up: number; item: ItemView; where: string; to: string; toObjId: number; takes: string; why?: string }[];
        makes: { make: number; name: string; objId: number; takes: string; why?: string }[];
        texts: string[];
    };
};

// The Apothecary's bench: potions to brew up a grade or instil, with what each takes (or why not),
// and the elixirs to drink before a rift
export type ApothecaryView = {
    potions: {
        target: { belt: number } | { index: number };
        where: string;
        item: ItemView;
        brew: { to?: string; herb?: string; count?: number; gold?: number; why?: string };
        instil: { herb: string; count: number; gold: number; why?: string; now?: string };
    }[];
    elixirs: { id: ElixirId; name: string; objId: number; text: string; herb: string; count: number; gold: number; why?: string }[];
    // How long an elixir lasts in the rifts, and the one drunk, if any
    minutes: number;
    elixir?: { name: string; minutes: number };
    // Her errand for the next place of the belt (sim/potions.ts beltErrand), none once it has all
    // four, and the places it has
    belt?: {
        place: number;
        name: string;
        good: { name: string; objId: number; color: string; have: boolean; from: string };
        herb: { name: string; objId: number; count: number; have: number };
        gold: number;
        why?: string;
    };
    beltPlaces: number;
};

// The Archmage's offer: any rift down to the deepest reached, and the one still open, if any
// A rift modifier as the Archmage's panel and the HUD show it (content/riftMods.ts)
export type RiftModView = { id: string; name: string; text: string };
// What a rift's modifiers pay, in whole percents
export type RiftRewardView = { quantity: number; rarity: number; runes: number; xp: number };

// What a rift's modifiers pay, said in a line
export function rewardText(r: RiftRewardView): string {
    if (r.quantity === 0 && r.rarity === 0 && r.runes === 0 && r.xp === 0) {
        return "no bonus";
    }
    return `+${r.quantity}% items, +${r.rarity}% rarity, +${r.runes}% runes, +${r.xp}% experience`;
}

export type ArchmageView = {
    tiers: { depth: number; zone: string; areaLevel: number; boss: string }[];
    maxDepth: number;
    chosen: number;
    // The versions of the chosen depth's rift on offer, mildest first
    offers: {
        mods: RiftModView[];
        reward: RiftRewardView;
        land?: { name: string; host: string; land: string; guardian: string; encounter: string; roamer?: string };
        // On the web, what its guardian gives besides (content/web.ts)
        bounty?: string;
    }[];
    // The web round the deepest rift on the ladder: the hero's lane, the lanes open from it, and
    // each lane's bounty at this depth and the next
    web?: {
        depth: number;
        lane: number;
        open: number[];
        here: { lane: number; bounty: string; text: string; lit: boolean }[];
        ahead: { lane: number; bounty: string; text: string; lit: boolean }[];
    };
    open?: { depth: number; zone: string; mods: RiftModView[] };
    // The riftstones in the pack (content/riftstones.ts), each a rift as it's woven, and why one
    // can't be opened yet
    stones: { uid: number; name: string; rarity: Rarity; objId: number; depth: number; zone: string; areaLevel: number; boss: string; mods: RiftModView[]; reward: RiftRewardView; why?: string }[];
    // The way to the Heart of the Rift, once a shard's been found or the ladder reached: which of
    // the four shards are in the pack, and the depth it opens at
    heart?: { shards: { name: string; objId: number; color: string; have: boolean; stashed: boolean }[]; ready: boolean; depth: number; areaLevel: number; awakened?: { why?: string } };
    // The other pinnacles (content/pinnacles.ts), once the ladder's reached: what each takes, how
    // much of it the hero has, and why it can't open yet
    pinnacles: { id: PinnacleId; name: string; color: string; guardian: string; key: string; have: number; need: number; areaLevel: number; why?: string; awakened?: { why?: string } }[];
    // The Tombs' invocations for the next raid (content/tombs.ts), once it can be opened
    invocations?: { list: { id: InvocationId; name: string; text: string; level: number; on: boolean }[]; level: number; pay: string };
    // The Awakener's orbs held, once there's been one (content/pinnacles.ts AWAKENED)
    orbs?: number;
};

// What's under the mouse, named at the top of the screen
export type Hover = { name: string; color: string; sub?: string; life?: number };

export type UiState = {
    screen: Screen;
    loadingText: string;
    loadingProgress: number;
    error?: string;
    // A rift being made, and what it'll be
    generating?: string;
    titleStep: TitleStep;
    heroes: HeroCard[];
    // The hero chosen on the heroes step, by the key they're saved under
    selected?: string;
    // A hero about to be deleted, asked about first
    deleting?: string;
    // The class picked from the line, and the one the mouse is over
    pick?: ClassId;
    hoverClass?: ClassId;
    creating?: Creation;
    hud?: Hud;
    pack?: Pack;
    panel?: Panel;
    // The passive tree, open over everything (the game waits)
    tree?: TreeView;
    // A skill button's picker, open
    picker?: { button: number; choices: SkillChoice[] };
    shop?: ShopView;
    archmage?: ArchmageView;
    // A task, while its giver's panel is open
    task?: TaskDialogView;
    quests?: QuestLogView;
    log?: LogView;
    orrery?: OrreryView;
    caves?: CavesView;
    glory?: GloryView;
    hover?: Hover;
    toasts: Toast[];
    menu: boolean;
    help: boolean;
    // What's new, open over the title (CHANGELOG.md)
    changelog: boolean;
    uiSize: number;
    muted: boolean;
    // The master volume, and the world's and the interface's on top of it, 0 to 1
    volume: number;
    combatVolume: number;
    interfaceVolume: number;
    // The keyboard's controls (controls.ts)
    keys: KeyBindings;
    shake: boolean;
    smoothing: boolean;
    // Seconds until the dead hero can go back to the city
    deathWait: number;
    // On the way somewhere: "Entering ..." over the screen while it's made
    transition?: string;
};

export class Store {
    private state: UiState;
    private readonly listeners = new Set<() => void>();
    private toastId = 0;

    constructor(initial: UiState) {
        this.state = initial;
    }

    getSnapshot = (): UiState => this.state;

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    };

    set(patch: Partial<UiState>): void {
        this.state = { ...this.state, ...patch };
        this.listeners.forEach((listener) => listener());
    }

    toast(text: string, ms = 3000, tone?: Toast["tone"], color?: string): void {
        const now = performance.now();
        // The same again just stays up longer
        const same = this.state.toasts.find((t) => t.text === text);
        if (same) {
            this.set({ toasts: this.state.toasts.map((t) => (t === same ? { ...t, until: now + ms } : t)) });
            return;
        }
        const toasts = [...this.state.toasts, { id: this.toastId++, text, until: now + ms, tone, color }];
        this.set({ toasts: toasts.slice(-6) });
    }

    expireToasts(now: number): void {
        const toasts = this.state.toasts;
        if (toasts.some((t) => t.until <= now)) {
            this.set({ toasts: toasts.filter((t) => t.until > now) });
        }
    }
}

export function useStore(store: Store): UiState {
    return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
