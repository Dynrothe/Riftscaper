// The ladder's rifts, rolled from their parts (content/ladder.ts): past depth 16 a rift isn't the
// next zone in turn but a land, a host and a guardian of the host's, rolled from the rift's seed on
// a stream of its own, so the same seed is always the same rift. Up to 16 the zones are what they
// always were (content/zones.ts), and a pinnacle is its own (content/pinnacles.ts). Everything that
// asks what a rift is asks here.
import { Rng } from "../../../engine/core/Rng";
import type { BiomeId } from "../../../engine/scaperune/biomes";
import type { GeneratorSettings } from "../../../engine/scaperune/settings";
import { BARROWS, BREACH, BrotherId, ENCOUNTER_IDS, EncounterId, FIGHT_CAVES, GOD_WARS, HUNTER, IMPLING, PEST_CONTROL, RIFT_GUARDIANS, ROAMERS, SUPERIORS } from "../content/encounters";
import { HOSTS, HOST_IDS, HostDef, HostId, LADDER_DUSK, LANDS, LAND_IDS, LAND_MIX, LAND_NOUNS } from "../content/ladder";
import { BOSSES, BossId, MONSTERS, MonsterDef, MonsterId } from "../content/monsters";
import { GodId, PINNACLES, PinnacleId } from "../content/pinnacles";
import { LADDER_DEPTH } from "../content/rules";
import { DUSK, ZONES, ZoneDef, bossOf, lapOf, zoneOf } from "../content/zones";

export type LadderRift = {
    zone: ZoneDef;
    host: HostDef;
    // Its land, and the second biome mixed into it
    biome: BiomeId;
    second?: BiomeId;
    dusk: boolean;
    // "The Ashen Fen"
    title: string;
    // Its encounter (content/encounters.ts) and what's in it: the impling that flees, the hunter,
    // the three brothers whose tombs are there, the two gods whose armies are at war; and the
    // Wilderness boss roaming it, if one is
    encounter: EncounterId;
    impling?: MonsterId;
    hunter?: MonsterId;
    brothers?: BrotherId[];
    armies?: [GodId, GodId];
    roamer?: BossId;
};

// A rift past the campaign's sixteen depths, and not a pinnacle
export function onLadder(depth: number, pinnacle?: PinnacleId): boolean {
    return !pinnacle && depth > LADDER_DEPTH;
}

// The generator's knobs that count things, rolled as whole numbers
const COUNTS = new Set<keyof GeneratorSettings>(["ponds", "lakes", "rivers", "volcanoes", "mesas", "plateaus", "canyons"]);

const rolled = new Map<string, LadderRift>();

// A ladder rift's parts, from its seed
export function ladderRift(depth: number, seed: number): LadderRift {
    const key = `${depth}:${seed}`;
    const known = rolled.get(key);
    if (known) {
        return known;
    }
    const rng = new Rng((seed ^ 0x1add3e5) >>> 0);
    const host = HOSTS[rng.pick(HOST_IDS)];
    const biome = LAND_IDS[Math.max(0, rng.weightedIndex(LAND_IDS.map((id) => (host.lands.includes(id) ? 3 : 1))))];
    const land = LANDS[biome];
    const settings: Partial<GeneratorSettings> = { ...land.settings };
    const knobs = settings as Record<string, unknown>;
    for (const [k, range] of Object.entries(land.knobs)) {
        const [lo, hi] = range!;
        knobs[k] = COUNTS.has(k as keyof GeneratorSettings) ? lo + rng.int(hi - lo + 1) : Math.round((lo + rng.next() * (hi - lo)) * 100) / 100;
    }
    let second: BiomeId | undefined;
    if (rng.chance(LAND_MIX.chance)) {
        second = rng.pick(LAND_IDS.filter((id) => id !== biome));
        settings.secondBiome = second;
        settings.biomeMix = Math.round((LAND_MIX.share[0] + rng.next() * (LAND_MIX.share[1] - LAND_MIX.share[0])) * 100) / 100;
    }
    const dusk = rng.chance(LADDER_DUSK);
    const guardian = rng.pick(host.guardians);
    const title = `The ${rng.pick(land.adjectives)} ${rng.pick(LAND_NOUNS[nounOf(settings)])}`;
    // Its encounter, and a roaming Wilderness boss one time in four
    const encounter = rng.pick(ENCOUNTER_IDS);
    const impling = encounter === "impling" ? IMPLING.kinds[Math.max(0, rng.weightedIndex(IMPLING.kinds.map(([, w]) => w)))][0] : undefined;
    const hunter = encounter === "hunter" ? rng.pick(HUNTER.monsters) : undefined;
    let brothers: BrotherId[] | undefined;
    if (encounter === "barrows") {
        const left = [...BARROWS.brothers];
        brothers = [];
        while (brothers.length < BARROWS.tombs) {
            brothers.push(left.splice(rng.int(left.length), 1)[0]);
        }
    }
    const armies = encounter === "godWars" ? rng.pick(GOD_WARS.pairs) : undefined;
    const roamer = rng.chance(ROAMERS.chance) ? rng.pick(ROAMERS.bosses.filter((b) => b !== guardian)) : undefined;
    // Everything met there besides its host and guardian, for the bake: its monsters' superiors,
    // its encounter's and its roamer's
    const also = new Set<MonsterId>();
    for (const [id] of host.monsters) {
        const superior = SUPERIORS[id];
        if (superior) {
            also.add(superior);
        }
    }
    for (const id of [impling, hunter, ...(brothers ?? [])]) {
        if (id) {
            also.add(id);
        }
    }
    if (encounter === "fightCaves") {
        for (const wave of FIGHT_CAVES.waves) {
            for (const [id] of wave) {
                also.add(id);
            }
        }
    }
    const encounterMonsters: MonsterId[] =
        encounter === "pestControl"
            ? [...PEST_CONTROL.portals, ...PEST_CONTROL.portals.map((id) => PEST_CONTROL.open[id]!), ...PEST_CONTROL.pests.map(([id]) => id)]
            : encounter === "godWars" && armies
              ? armies.flatMap((god) => HOSTS[god].monsters.map(([id]) => id))
              : encounter === "breach"
                ? BREACH.monsters.map(([id]) => id)
                : encounter === "guardians"
                  ? RIFT_GUARDIANS.monsters.map(([id]) => id)
                  : [];
    for (const id of encounterMonsters) {
        also.add(id);
    }
    if (roamer === "scorpia") {
        also.add(ROAMERS.scorpia.guard);
    }
    const zone: ZoneDef = {
        name: title,
        biome,
        monsters: host.monsters,
        leaders: host.leaders,
        boss: guardian,
        also: { monsters: [...also], bosses: roamer ? [roamer] : [] },
        ambient: dusk ? DUSK : land.ambient,
        ambientColor: land.ambientColor,
        settings,
    };
    const rift: LadderRift = { zone, host, biome, second, dusk, title, encounter, impling, hunter, brothers, armies, roamer };
    rolled.set(key, rift);
    return rift;
}

// What a land has most of, for its name
function nounOf(s: Partial<GeneratorSettings>): keyof typeof LAND_NOUNS {
    if ((s.mountains ?? 0) >= 0.25 || (s.mesas ?? 0) >= 4 || (s.volcanoes ?? 0) >= 2) {
        return "mountains";
    }
    if ((s.ponds ?? 0) + 2 * (s.lakes ?? 0) >= 5) {
        return "water";
    }
    if ((s.trees ?? 0) >= 0.75) {
        return "trees";
    }
    if ((s.hills ?? 0) >= 0.45) {
        return "hills";
    }
    return "open";
}

// A rift's zone: the campaign's, a pinnacle's, or the ladder's roll
export function riftZone(depth: number, seed: number, pinnacle?: PinnacleId): ZoneDef {
    return pinnacle ? PINNACLES[pinnacle].zone : onLadder(depth) ? ladderRift(depth, seed).zone : zoneOf(depth);
}

// The guardian at its far end
export function riftBoss(depth: number, seed: number, pinnacle?: PinnacleId): BossId {
    return pinnacle ? PINNACLES[pinnacle].zone.boss : onLadder(depth) ? ladderRift(depth, seed).zone.boss : bossOf(depth);
}

// Its name, with the lap it's on: "The Ashen Fen (Torment 2)". A ladder depth without its seed is
// only its depth.
export function riftName(depth: number, seed?: number, pinnacle?: PinnacleId): string {
    if (pinnacle) {
        return PINNACLES[pinnacle].name;
    }
    const lap = lapOf(depth);
    if (onLadder(depth)) {
        const title = seed === undefined ? `Depth ${depth} of the ladder` : ladderRift(depth, seed).title;
        return `${title} (Torment ${lap})`;
    }
    const name = zoneOf(depth).name;
    return lap === 0 ? name : `${name} (Torment ${lap})`;
}

// Who holds it: "held by Bandos's warband", or nothing for the campaign's and the pinnacles'
export function riftHost(depth: number, seed: number, pinnacle?: PinnacleId): HostDef | undefined {
    return onLadder(depth, pinnacle) ? ladderRift(depth, seed).host : undefined;
}

// The monsters that can be met at a depth, and how often, the hosts' all together on the ladder
// (each host as likely as another), for the tasks set there
export function depthMonsters(depth: number): [MonsterId, number][] {
    if (!onLadder(depth)) {
        return zoneOf(depth).monsters;
    }
    const all = new Map<MonsterId, number>();
    for (const id of HOST_IDS) {
        const host = HOSTS[id];
        const total = host.monsters.reduce((sum, [, w]) => sum + w, 0);
        for (const [m, w] of host.monsters) {
            all.set(m, (all.get(m) ?? 0) + w / total);
        }
    }
    return [...all.entries()];
}

// The guardians that can be met at a depth's far end
export function depthGuardians(depth: number): BossId[] {
    if (!onLadder(depth)) {
        return [bossOf(depth)];
    }
    return [...new Set(HOST_IDS.flatMap((id) => HOSTS[id].guardians))];
}

// ---- Evened out ----

// A host's monsters are as strong, on the whole, as the campaign's zones' were, and a guardian as
// strong as their guardians, so a host of goblins isn't easier than one of demons: their life and
// damage are scaled by how far off they are, within bounds
const MIGHT_BOUNDS: [number, number] = [0.5, 2.2];

type Might = { life: number; damage: number };

function meanOf(monsters: [MonsterId, number][]): Might {
    const total = monsters.reduce((sum, [, w]) => sum + w, 0);
    let life = 0;
    let damage = 0;
    for (const [id, w] of monsters) {
        const def: MonsterDef = MONSTERS[id];
        life += (def.life * w) / total;
        damage += (((def.damage[0] + def.damage[1]) / 2) * w) / total;
    }
    return { life, damage };
}

const clampMight = (v: number) => Math.min(MIGHT_BOUNDS[1], Math.max(MIGHT_BOUNDS[0], v));

const ZONE_MIGHT: Might = (() => {
    const each = ZONES.map((z) => meanOf(z.monsters));
    return { life: each.reduce((s, m) => s + m.life, 0) / each.length, damage: each.reduce((s, m) => s + m.damage, 0) / each.length };
})();

const GUARDIAN_MIGHT: Might = (() => {
    const ids = ZONES.flatMap((z) => [z.boss, ...(z.second ? [z.second] : [])]);
    const defs = ids.map((id) => BOSSES[id]);
    return {
        life: defs.reduce((s, d) => s + d.life, 0) / defs.length,
        damage: defs.reduce((s, d) => s + (d.damage[0] + d.damage[1]) / 2, 0) / defs.length,
    };
})();

const hostMight = new Map<string, Might>();

// How much a ladder rift's monster's life and damage are scaled by (1 for the campaign's and the
// Heart's, which were tuned as they are); a god's stronghold or the Sire's nexus is evened out as
// a ladder rift is, its guardian then made the tougher by its pinnacle (Game.ts)
export function ladderMight(depth: number, seed: number, pinnacle: PinnacleId | undefined, def: MonsterDef, guardian: boolean): Might {
    if (pinnacle === "heart" || (!pinnacle && !onLadder(depth))) {
        return { life: 1, damage: 1 };
    }
    if (guardian) {
        return {
            life: clampMight(GUARDIAN_MIGHT.life / def.life),
            damage: clampMight(GUARDIAN_MIGHT.damage / ((def.damage[0] + def.damage[1]) / 2)),
        };
    }
    const key = pinnacle ?? ladderRift(depth, seed).host.id;
    let might = hostMight.get(key);
    if (!might) {
        const mean = meanOf(pinnacle ? PINNACLES[pinnacle].zone.monsters : ladderRift(depth, seed).host.monsters);
        might = { life: clampMight(ZONE_MIGHT.life / mean.life), damage: clampMight(ZONE_MIGHT.damage / mean.damage) };
        hostMight.set(key, might);
    }
    return might;
}

// An encounter's monster (content/encounters.ts), evened out on its own: a TzHaar or a Barrows
// brother as strong as the campaign's zones' monsters are on the whole, whoever holds the rift
export function ownMight(def: MonsterDef, guardian: boolean): Might {
    const mean = guardian ? GUARDIAN_MIGHT : ZONE_MIGHT;
    return { life: clampMight(mean.life / def.life), damage: clampMight(mean.damage / Math.max(0.5, (def.damage[0] + def.damage[1]) / 2)) };
}
