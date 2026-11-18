// What's drawn that moves, baked from the cache as it's wanted: every spell, arrow and impact, the
// city's people and what skills raise, once as the game loads; each rift's monsters and boss as the
// rift's entered, dropping the last rift's; the hero in what they wear, again whenever that
// changes; items on the ground the first time one of a kind drops. On the title, the classes in
// their line and the hero being chosen or made, dropped when the game begins. The hitsplats'
// sprites come once too.
import { TOMBS } from "../content/tombs";
import { HIRELING, HIRELINGS } from "../content/hirelings";
import { PRAYER, PRAYERS } from "../content/prayers";
import type { ActorBakeInput, ActorBakeResult, BakeRequest } from "../../../engine/mapviewer/webgl/actor/ActorBakeTypes";
import { NPC_IDLE_SEQ, NPC_WALK_SEQ } from "../../../engine/mapviewer/webgl/actor/ActorBakeTypes";
import { ActorBakeLoader } from "../../../engine/mapviewer/webgl/actor/ActorBakeLoader";
import type { ActorModel, ActorPage, ActorRenderer } from "../../../engine/mapviewer/webgl/actor/ActorRenderer";
import type { RenderDataWorkerPool } from "../../../engine/mapviewer/worker/RenderDataWorkerPool";
import { SpriteDataInput, SpriteDataLoader, SpriteImage } from "../../../engine/mapviewer/worker/SpriteDataLoader";
import type { GameWebGLRenderer } from "../../../engine/render/GameWebGLRenderer";
import { HITSPLAT_SPRITES, HitsplatKind } from "../../../engine/render/Hitsplats";
import { EquipSlot, PlayerAppearance, createAppearance, getAppearanceKey } from "../../../engine/rs/model/player/PlayerModelLoader";
import { CLASSES, LINEUP } from "../content/classes";
import { forgeSkillDefs } from "../content/forge";
import { allSkillDefs as writtenSkillDefs } from "../content/gems";
import { ClassId, EQUIP_SLOT, SEQ, SLOTS } from "../content/items";
import type { Look } from "../content/looks";
import { MINIONS } from "../content/minions";
import { PETS } from "../content/pets";
import { featureLocIds } from "../content/features";
import { PEST_CONTROL, RIFT_GUARDIANS, encounterSpotIds } from "../content/encounters";
import { COLOSSEUM } from "../content/colosseum";
import { TASK_ICONS } from "../content/tasks";
import { BOSSES, MONSTERS, MonsterDef, allBossSpecials, allMonsterDefs, bossLooks } from "../content/monsters";
import { ARCHMAGE, BANKER, FOLK, GUARD_NPCS, SHOPS, WIZARD_NPCS } from "../content/town";
import { HOME_TELEPORT_SPOT, LEVEL_UP_SPOT, SOUND, SPOT, STUN_SPOT, TELEPORT_SPOT, Visual, visualSounds, visualSpots } from "../content/visuals";
import { ZoneDef } from "../content/zones";
import { Hero, newHero } from "../sim/hero";
import { itemInfo } from "../sim/loot";

// The way on: the Abyss's own rift, a tear of raw energy that hangs in the air and swirls (and,
// smaller and blue, the waystone home by a rift's camp)
export const PORTAL_LOC = 26149;
export const COINS_OBJ = 995;

export type MonsterLook = {
    model: ActorModel;
    // Drawn at this scale (a rare's or colossal's own size goes on top)
    scale: number;
    // Tiles tall at that scale, for the bar over it
    height: number;
};

// Every skill there is or can be forged, for its animations, spot animations and thrown things
function allSkillDefs() {
    return [...writtenSkillDefs(), ...forgeSkillDefs()];
}

// Every spot animation the game can show, and every thrown thing
function allSpotIds(): number[] {
    const ids = new Set<number>([STUN_SPOT, LEVEL_UP_SPOT, TELEPORT_SPOT, HOME_TELEPORT_SPOT, ARCHMAGE.castSpot, ...encounterSpotIds(), COLOSSEUM.spawnSpot, PRAYER.retribution.spot]);
    for (const v of Object.values(SPOT)) {
        visualSpots(v).forEach((id) => ids.add(id));
    }
    for (const def of allMonsterDefs()) {
        visualSpots(def.ranged?.visual).forEach((id) => ids.add(id));
    }
    for (const boss of Object.values(BOSSES)) {
        allBossSpecials(boss).forEach((special) => visualSpots(special.visual).forEach((id) => ids.add(id)));
        if (boss.formSpot !== undefined) {
            ids.add(boss.formSpot);
        }
    }
    for (const skill of allSkillDefs()) {
        visualSpots(skill.visual).forEach((id) => ids.add(id));
    }
    return [...ids];
}

function allThrownObjs(): number[] {
    const ids = new Set<number>();
    const visuals: (Visual | undefined)[] = [...Object.values(SPOT), ...allSkillDefs().map((s) => s.visual)];
    for (const v of visuals) {
        if (v?.projectileObj !== undefined) {
            ids.add(v.projectileObj);
        }
    }
    return [...ids];
}

export function allSounds(): number[] {
    const ids = new Set<number>(Object.values(SOUND).flat());
    for (const def of allMonsterDefs()) {
        ids.add(def.sounds.attack);
        ids.add(def.sounds.hit);
        ids.add(def.sounds.death);
        visualSounds(def.ranged?.visual).forEach((id) => ids.add(id));
    }
    for (const boss of Object.values(BOSSES)) {
        allBossSpecials(boss).forEach((special) => visualSounds(special.visual).forEach((id) => ids.add(id)));
    }
    for (const v of Object.values(SPOT)) {
        visualSounds(v).forEach((id) => ids.add(id));
    }
    for (const def of Object.values(MINIONS)) {
        ids.add(def.sounds.attack);
    }
    // The prayers' (content/prayers.ts), said and put out
    for (const p of Object.values(PRAYERS)) {
        ids.add(p.sound);
    }
    // The hirelings' blows and falls (content/hirelings.ts)
    for (const def of Object.values(HIRELINGS)) {
        ids.add(def.sounds.attack);
        ids.add(def.sounds.death);
        visualSounds(def.shot?.visual).forEach((id) => ids.add(id));
    }
    ids.add(PRAYER.off);
    return [...ids];
}

// A body as the player bake has it: the look (its body, face and colours), and what's worn over
// it. The ring isn't seen, and nor is the helm when it's hidden.
export function lookAppearance(look: Look, equipment: Hero["equipment"] = {}): PlayerAppearance {
    const worn: Partial<Record<EquipSlot, number>> = {};
    for (const slot of SLOTS) {
        const item = equipment[slot];
        const at = EQUIP_SLOT[slot];
        if (item && at !== undefined && !(slot === "head" && look.hideHelm)) {
            worn[at] = itemInfo(item).objId;
        }
    }
    const appearance = createAppearance(worn);
    appearance.female = look.female;
    appearance.kits = [...look.kits];
    appearance.colors = [...look.colors];
    return appearance;
}

export function heroAppearance(hero: Hero): PlayerAppearance {
    return lookAppearance(hero.look, hero.equipment);
}

export function heroLookKey(hero: Hero): string {
    return getAppearanceKey(heroAppearance(hero));
}

// What a class plays on the title: standing, stepping out of the line, and its flourish
export function titleSeqs(cls: ClassId): number[] {
    return [...new Set([SEQ.idle, SEQ.walk, CLASSES[cls].flourish])];
}

// Everyone in the city, by NPC id
function townNpcIds(): number[] {
    return [
        ...new Set([
            ...Object.values(SHOPS).map((s) => s.npcId),
            ARCHMAGE.npcId,
            BANKER.npcId,
            ...WIZARD_NPCS,
            ...GUARD_NPCS,
            ...Object.values(FOLK).map((f) => f.npcId),
            // Who stands in a rift to be spoken to (content/encounters.ts)
            PEST_CONTROL.knight.npcId,
            RIFT_GUARDIANS.npcId,
            COLOSSEUM.minimus.npcId,
            TOMBS.osmumten.npcId,
            HIRELING.captain.npcId,
        ]),
    ];
}

// What the hero can play: standing, walking, dying, the teleport home, their weapon's blow and
// every skill's own
export function heroSeqs(hero: Hero): number[] {
    const seqs = new Set<number>([SEQ.idle, SEQ.walk, SEQ.run, SEQ.death, SEQ.homeTeleport]);
    const weapon = hero.equipment.weapon && itemInfo(hero.equipment.weapon).weapon;
    seqs.add(weapon ? weapon.seq : 422);
    for (const skill of allSkillDefs()) {
        if (skill.seq !== undefined) {
            seqs.add(skill.seq);
        }
    }
    return [...seqs];
}

// What's baked once, as the game loads: every spot animation and thrown thing, the city's people
// and what skills raise, the portal, a rift's chests, hoards and shrines, and a pile of coins. The slim cache bakes them too
// (riftscaper/scripts/slim-cache.ts).
export function commonRequests(): BakeRequest[] {
    return [
        ...allSpotIds().map((id): BakeRequest => ({ kind: "spotanim", key: `spot:${id}`, spotAnimId: id })),
        ...allThrownObjs().map((id): BakeRequest => ({ kind: "obj", key: `obj:${id}`, objId: id, count: 1 })),
        ...townNpcIds().map(
            (npcId): BakeRequest => ({
                kind: "npc",
                key: `npc:${npcId}`,
                npcId,
                seqIds: npcId === ARCHMAGE.npcId ? [NPC_IDLE_SEQ, NPC_WALK_SEQ, ARCHMAGE.castSeq] : [NPC_IDLE_SEQ, NPC_WALK_SEQ],
            }),
        ),
        ...Object.values(HIRELINGS).map(
            (def): BakeRequest => ({
                kind: "npc",
                key: `hireling:${def.kind}`,
                npcId: def.npcId,
                seqIds: [...new Set([def.seqs.idle, def.seqs.walk, def.seqs.attack, def.seqs.death])],
            }),
        ),
        ...Object.values(MINIONS).map(
            (def): BakeRequest => ({
                kind: "npc",
                key: `minion:${def.id}`,
                npcId: def.npcId,
                seqIds: [...new Set([def.seqs.idle, def.seqs.walk, def.seqs.attack, def.seqs.death])],
            }),
        ),
        ...PETS.map(
            (def): BakeRequest => ({
                kind: "npc",
                key: `pet:${def.id}`,
                npcId: def.npcId,
                seqIds: [...new Set([def.seqs.idle, def.seqs.walk])],
            }),
        ),
        { kind: "loc", key: "portal", locId: PORTAL_LOC, animated: true },
        ...featureLocIds().map((locId): BakeRequest => ({ kind: "loc", key: `loc:${locId}`, locId })),
        { kind: "obj", key: `item:${COINS_OBJ}`, objId: COINS_OBJ, count: 100 },
    ];
}

// A monster or boss as a rift bakes it
export function monsterRequest(def: MonsterDef): BakeRequest {
    return {
        kind: "npc",
        key: `monster:${def.id}`,
        npcId: def.npcId,
        seqIds: [...new Set([def.seqs.idle, def.seqs.walk, def.seqs.attack, def.seqs.death])],
    };
}

// One model baked again whenever what it's of changes: the newest asked for wins, and the old one
// stays drawn till the new one's ready
class Rebake {
    model?: ActorModel;
    key = "";
    // Who the model's of, as the asker names them
    tag = "";
    private wanted?: { key: string; request: BakeRequest; tag: string };
    private baking?: Promise<void>;
    // Counted up when it's dropped, so a bake that finishes after is let go
    private generation = 0;

    constructor(private readonly assets: Assets) {}

    async want(key: string, request: BakeRequest, tag = ""): Promise<void> {
        this.wanted = { key, request, tag };
        if (this.baking) {
            return this.baking;
        }
        this.baking = (async () => {
            while (this.wanted) {
                const want = this.wanted;
                this.wanted = undefined;
                if (want.key === this.key && this.model) {
                    this.tag = want.tag;
                    continue;
                }
                const generation = this.generation;
                const model = await this.assets.bakeOne(want.request);
                if (!model) {
                    continue;
                }
                if (generation !== this.generation) {
                    this.assets.actors.removePage(model.page);
                    continue;
                }
                const old = this.model;
                this.model = model;
                this.key = want.key;
                this.tag = want.tag;
                if (old && old.page !== model.page) {
                    this.assets.actors.removePage(old.page);
                }
            }
        })();
        try {
            await this.baking;
        } finally {
            this.baking = undefined;
        }
    }

    drop(): void {
        this.generation++;
        this.wanted = undefined;
        if (this.model) {
            this.assets.actors.removePage(this.model.page);
        }
        this.model = undefined;
        this.key = "";
        this.tag = "";
    }
}

export class Assets {
    readonly spots = new Map<number, ActorModel>();
    readonly objs = new Map<number, ActorModel>();
    readonly monsters = new Map<string, MonsterLook>();
    hitsplats = {} as Record<HitsplatKind, HTMLCanvasElement | undefined>;
    // Over the heads of the folk with a task, and on the minimap (content/tasks.ts TASK_ICONS)
    taskIcons: { offer?: HTMLCanvasElement; done?: HTMLCanvasElement } = {};
    // The city's people, by NPC id (the Archmage's can cast too)
    readonly people = new Map<number, ActorModel>();
    // What skills raise, by minion id
    readonly minions = new Map<string, ActorModel>();
    // The pets that follow (content/pets.ts), by their guardian's id
    readonly pets = new Map<string, ActorModel>();
    // The hirelings (content/hirelings.ts), by kind
    readonly hirelings = new Map<string, ActorModel>();
    portal?: ActorModel;
    // A rift's chests, hoards and shrines (content/features.ts), by loc id
    readonly locs = new Map<number, ActorModel>();
    // The classes in their line on the title, each in its first gear
    readonly lineup = new Map<ClassId, ActorModel>();
    // Items on the ground, by obj id: undefined while it's being baked
    private readonly items = new Map<number, ActorModel | undefined>();
    private zonePages: ActorPage[] = [];
    private zoneName = "";
    private readonly heroBake = new Rebake(this);
    // The hero chosen on the title, or being made
    private readonly previewBake = new Rebake(this);
    private lineupPages: ActorPage[] = [];
    private lineupLoading?: Promise<void>;
    private titleGeneration = 0;
    private itemQueue = new Set<number>();
    private itemBaking = false;

    // Smoothing between keyframes, in client ticks (ActorBakeInput.tweenTicks): 0 for none.
    // What's baked from now on is baked with it; the hero is baked again at once (its key has it).
    tweenTicks = 0;

    constructor(
        readonly workerPool: RenderDataWorkerPool,
        readonly renderer: GameWebGLRenderer,
        readonly actors: ActorRenderer,
    ) {}

    private async bake(requests: BakeRequest[]): Promise<{ models: Map<string, ActorModel>; pages: ActorPage[] }> {
        const models = new Map<string, ActorModel>();
        const pages: ActorPage[] = [];
        const BATCH = 8;
        for (let i = 0; i < requests.length; i += BATCH) {
            const bake = await this.workerPool.queueLoad<ActorBakeInput, ActorBakeResult, ActorBakeLoader>(new ActorBakeLoader(), {
                requests: requests.slice(i, i + BATCH),
                loadedTextureIds: this.renderer.loadedTextureIds,
                tweenTicks: this.tweenTicks,
            });
            this.renderer.updateTextureArray(bake.loadedTextures);
            for (const [key, model] of this.actors.addBake(bake)) {
                models.set(key, model);
                if (!pages.includes(model.page)) {
                    pages.push(model.page);
                }
            }
        }
        return { models, pages };
    }

    async bakeOne(request: BakeRequest): Promise<ActorModel | undefined> {
        const { models } = await this.bake([request]);
        return models.get(request.key);
    }

    get hero(): ActorModel | undefined {
        return this.heroBake.model;
    }

    get preview(): ActorModel | undefined {
        return this.previewBake.model;
    }

    // Who the preview's of: what loadPreview was told
    get previewTag(): string {
        return this.previewBake.tag;
    }

    // Once, as the game loads: spells and arrows, the city's people, the portal and the hitsplats
    async loadCommon(onProgress: (share: number) => void): Promise<void> {
        const spotIds = allSpotIds();
        const objIds = allThrownObjs();
        onProgress(0.1);
        const { models } = await this.bake(commonRequests());
        for (const id of spotIds) {
            const model = models.get(`spot:${id}`);
            if (model) {
                this.spots.set(id, model);
            }
        }
        for (const id of objIds) {
            const model = models.get(`obj:${id}`);
            if (model) {
                this.objs.set(id, model);
            }
        }
        for (const npcId of townNpcIds()) {
            const model = models.get(`npc:${npcId}`);
            if (model) {
                this.people.set(npcId, model);
            }
        }
        for (const def of Object.values(MINIONS)) {
            const model = models.get(`minion:${def.id}`);
            if (model) {
                this.minions.set(def.id, model);
            }
        }
        for (const def of PETS) {
            const model = models.get(`pet:${def.id}`);
            if (model) {
                this.pets.set(def.id, model);
            }
        }
        for (const def of Object.values(HIRELINGS)) {
            const model = models.get(`hireling:${def.kind}`);
            if (model) {
                this.hirelings.set(def.kind, model);
            }
        }
        this.portal = models.get("portal");
        for (const id of featureLocIds()) {
            const model = models.get(`loc:${id}`);
            if (model) {
                this.locs.set(id, model);
            }
        }
        this.items.set(COINS_OBJ, models.get(`item:${COINS_OBJ}`));
        onProgress(0.8);
        const kinds = Object.keys(HITSPLAT_SPRITES) as HitsplatKind[];
        const icons = [TASK_ICONS.offer, TASK_ICONS.done];
        const sprites = await this.workerPool.queueLoad<SpriteDataInput, SpriteImage[], SpriteDataLoader>(new SpriteDataLoader(), {
            spriteIds: [...kinds.map((k) => HITSPLAT_SPRITES[k]), ...icons.map((i) => i.sprite)],
            frames: [...kinds.map(() => 0), ...icons.map((i) => i.frame)],
        });
        kinds.forEach((k, i) => (this.hitsplats[k] = toCanvas(sprites[i])));
        this.taskIcons = { offer: toCanvas(sprites[kinds.length]), done: toCanvas(sprites[kinds.length + 1]) };
        onProgress(1);
    }

    // A rift's monsters and its guardians (its own, and its second's for the odd laps), in place
    // of the last rift's
    async loadZone(zone: ZoneDef): Promise<void> {
        // The same monsters as the last, whatever it's called
        const key = [...zone.monsters.map(([id]) => id), ...(zone.leaders ?? []), zone.boss, zone.second ?? "", ...(zone.also?.monsters ?? []), ...(zone.also?.bosses ?? [])].join(",");
        if (this.zoneName === key) {
            return;
        }
        for (const page of this.zonePages) {
            this.actors.removePage(page);
        }
        this.zonePages = [];
        this.monsters.clear();
        this.zoneName = "";
        const defs = new Map<string, MonsterDef>();
        for (const [id] of zone.monsters) {
            defs.set(id, MONSTERS[id]);
        }
        for (const id of zone.leaders ?? []) {
            defs.set(id, MONSTERS[id]);
        }
        for (const id of [zone.boss, ...(zone.second ? [zone.second] : []), ...(zone.also?.bosses ?? [])]) {
            defs.set(id, BOSSES[id]);
            // A guardian that changes form, each form its own bake
            for (const look of bossLooks(BOSSES[id])) {
                defs.set(look.id, look);
            }
        }
        for (const id of zone.also?.monsters ?? []) {
            defs.set(id, MONSTERS[id]);
        }
        const { models, pages } = await this.bake([...defs.values()].map(monsterRequest));
        this.zonePages = pages;
        for (const def of defs.values()) {
            const model = models.get(`monster:${def.id}`);
            if (!model) {
                throw new Error(`Nothing baked for ${def.name}`);
            }
            const radius = Math.max(model.radius, 1) / 128;
            let scale = def.scale ?? 1;
            if (def.maxRadius !== undefined && radius * scale > def.maxRadius) {
                scale = def.maxRadius / radius;
            }
            this.monsters.set(def.id, { model, scale, height: (Math.max(model.height, 1) / 128) * scale });
        }
        this.zoneName = key;
    }

    // The hero in what they wear now; the old model stays drawn until the new one's ready
    loadHero(hero: Hero): Promise<void> {
        return this.heroBake.want(heroLookKey(hero) + "|" + hero.cls + "|" + this.tweenTicks, { kind: "player", key: "hero", appearance: heroAppearance(hero), seqIds: heroSeqs(hero) });
    }

    // The classes in their line, once a visit to the title
    async loadLineup(): Promise<void> {
        if (this.lineup.size > 0) {
            return;
        }
        if (this.lineupLoading) {
            return this.lineupLoading;
        }
        const generation = this.titleGeneration;
        this.lineupLoading = (async () => {
            const requests = LINEUP.map((cls): BakeRequest => ({ kind: "player", key: `lineup:${cls}`, appearance: heroAppearance(newHero(cls, 1)), seqIds: titleSeqs(cls) }));
            const { models, pages } = await this.bake(requests);
            if (generation !== this.titleGeneration) {
                pages.forEach((page) => this.actors.removePage(page));
                return;
            }
            this.lineupPages = pages;
            for (const cls of LINEUP) {
                const model = models.get(`lineup:${cls}`);
                if (model) {
                    this.lineup.set(cls, model);
                }
            }
        })();
        try {
            await this.lineupLoading;
        } finally {
            this.lineupLoading = undefined;
        }
    }

    // The hero chosen on the title, or the one being made, as they look now: `tag` names who it is
    loadPreview(tag: string, cls: ClassId, look: Look, equipment: Hero["equipment"] | undefined): Promise<void> {
        const appearance = lookAppearance(look, equipment);
        return this.previewBake.want(getAppearanceKey(appearance) + "|" + cls, { kind: "player", key: "preview", appearance, seqIds: titleSeqs(cls) }, tag);
    }

    // The title's models, once the game's begun
    dropTitle(): void {
        this.titleGeneration++;
        this.lineupPages.forEach((page) => this.actors.removePage(page));
        this.lineupPages = [];
        this.lineup.clear();
        this.previewBake.drop();
    }

    // An item lying on the ground: baked the first time one of its kind is asked for
    item(objId: number): ActorModel | undefined {
        if (this.items.has(objId)) {
            return this.items.get(objId);
        }
        this.items.set(objId, undefined);
        this.itemQueue.add(objId);
        void this.bakeItems();
        return undefined;
    }

    private async bakeItems(): Promise<void> {
        if (this.itemBaking) {
            return;
        }
        this.itemBaking = true;
        try {
            while (this.itemQueue.size > 0) {
                const ids = [...this.itemQueue];
                this.itemQueue.clear();
                const { models } = await this.bake(ids.map((id): BakeRequest => ({ kind: "obj", key: `item:${id}`, objId: id, count: 1 })));
                for (const id of ids) {
                    this.items.set(id, models.get(`item:${id}`));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            this.itemBaking = false;
        }
    }
}

function toCanvas(sprite: SpriteImage | undefined): HTMLCanvasElement | undefined {
    if (!sprite || sprite.width <= 0 || sprite.height <= 0) {
        return undefined;
    }
    const canvas = document.createElement("canvas");
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext("2d")!;
    const image = ctx.createImageData(sprite.width, sprite.height);
    for (let i = 0; i < sprite.pixels.length; i++) {
        const p = sprite.pixels[i];
        image.data[i * 4] = (p >> 16) & 0xff;
        image.data[i * 4 + 1] = (p >> 8) & 0xff;
        image.data[i * 4 + 2] = p & 0xff;
        image.data[i * 4 + 3] = (p >>> 24) & 0xff;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
}
