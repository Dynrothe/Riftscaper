// The orrery's working (content/orrery.ts): the spheres the hero's lit, the nodes taken with
// them, the hosts favoured, and what all of it adds to the ladder's rolls, read by Game.ts as a rift
// begins (so the same rift and the same hero play out the same).
import { HOSTS } from "../content/ladder";
import { ORRERY, ORRERY_NODES, ORRERY_NODE_BY_ID, OrreryEffect } from "../content/orrery";
import { PINNACLES, PinnacleId } from "../content/pinnacles";
import { areaLevel } from "../content/rules";
import type { Hero } from "./hero";

export type OrreryState = {
    // The spheres lit: "host:<id>:<band>", "pinnacle:<id>", "awakened:<id>"
    lit: string[];
    // The nodes taken, by id
    taken: number[];
    // The favoured hosts, by id, one for each "favour" node taken
    favour?: string[];
};

export function orreryOf(hero: Hero): OrreryState {
    hero.orrery ??= { lit: [], taken: [] };
    return hero.orrery;
}

// The points left to take nodes with: a sphere each, less those taken
export function orreryPoints(hero: Hero): number {
    const o = hero.orrery;
    return o ? o.lit.length - o.taken.length : 0;
}

// A host's sphere for a depth's band, or undefined above the ladder
export function hostSphere(host: string, depth: number): string | undefined {
    return depth >= ORRERY.from ? `host:${host}:${Math.floor((depth - ORRERY.from) / ORRERY.band)}` : undefined;
}

export function pinnacleSphere(id: PinnacleId, awakened: boolean): string {
    return `${awakened ? "awakened" : "pinnacle"}:${id}`;
}

// A sphere lit: true if it's new
export function lightSphere(hero: Hero, key: string): boolean {
    const o = orreryOf(hero);
    if (o.lit.includes(key)) {
        return false;
    }
    o.lit.push(key);
    return true;
}

// A sphere's name, for the panel: "Bandos's warband, rifts 17 to 24"
export function sphereName(key: string): string {
    const [kind, id, band] = key.split(":");
    if (kind === "host") {
        const host = (HOSTS as Record<string, { name: string }>)[id];
        const from = ORRERY.from + Number(band) * ORRERY.band;
        return `${host?.name ?? id}, rifts ${from} to ${from + ORRERY.band - 1}`;
    }
    const p = PINNACLES[id as PinnacleId];
    return `${kind === "awakened" ? "Awakened " : ""}${p?.name ?? id}`;
}

// What the taken nodes add up to, for each lever
export type OrreryLevers = Record<OrreryEffect, number>;

export function orreryLevers(hero: Hero): OrreryLevers {
    const levers: OrreryLevers = { pay: 0, gold: 0, favour: 0, time: 0, chest: 0, hoard: 0, shrine: 0, stones: 0, shards: 0, orbs: 0, keys: 0, rarity: 0, superior: 0 };
    for (const id of hero.orrery?.taken ?? []) {
        const n = ORRERY_NODE_BY_ID.get(id);
        if (n) {
            levers[n.effect] += n.value;
        }
    }
    return levers;
}

// Whether a host is favoured, its parts twice as often
export function favoured(hero: Hero, host: string | undefined): boolean {
    return host !== undefined && (hero.orrery?.favour ?? []).includes(host);
}

// Why a node can't be taken, if it can't: taken already, the one before it not, or no point
export function takeWhyNot(hero: Hero, id: number): string | undefined {
    const n = ORRERY_NODE_BY_ID.get(id);
    if (!n) {
        return "There's no such sphere.";
    }
    const taken = hero.orrery?.taken ?? [];
    if (taken.includes(id)) {
        return "It's yours.";
    }
    const before = ORRERY_NODES.find((o) => o.arm === n.arm && o.step === n.step - 1);
    if (before && !taken.includes(before.id)) {
        return `Take ${before.name} first.`;
    }
    return orreryPoints(hero) > 0 ? undefined : "Light a sphere first: a host's guardian slain in a band of the ladder, or a pinnacle cleared.";
}

export function takeNode(hero: Hero, id: number): string | undefined {
    const why = takeWhyNot(hero, id);
    if (why) {
        return why;
    }
    orreryOf(hero).taken.push(id);
    return undefined;
}

// What giving a node back costs
export function orreryRefund(hero: Hero): number {
    const level = areaLevel(Math.max(1, hero.maxDepth));
    return ORRERY.refund * level * level;
}

// Why a node can't be given back, if it can't: not taken, a later one of its arm taken, or gold
export function refundWhyNot(hero: Hero, id: number): string | undefined {
    const n = ORRERY_NODE_BY_ID.get(id);
    const taken = hero.orrery?.taken ?? [];
    if (!n || !taken.includes(id)) {
        return "It isn't yours.";
    }
    if (ORRERY_NODES.some((o) => o.arm === n.arm && o.step > n.step && taken.includes(o.id))) {
        return "Give back the ones after it first.";
    }
    return hero.gold >= orreryRefund(hero) ? undefined : `It costs ${orreryRefund(hero).toLocaleString("en-GB")} gold to give back.`;
}

export function refundNode(hero: Hero, id: number): string | undefined {
    const why = refundWhyNot(hero, id);
    if (why) {
        return why;
    }
    hero.gold -= orreryRefund(hero);
    const o = orreryOf(hero);
    o.taken = o.taken.filter((t) => t !== id);
    // A favour given back takes its host with it
    const n = ORRERY_NODE_BY_ID.get(id)!;
    if (n.effect === "favour" && o.favour && o.favour.length > orreryLevers(hero).favour) {
        o.favour = o.favour.slice(0, orreryLevers(hero).favour);
    }
    return undefined;
}

// A host favoured in a place the favour nodes taken give: the first place, or the second
export function favourHost(hero: Hero, slot: number, host: string): string | undefined {
    const places = orreryLevers(hero).favour;
    if (slot >= places) {
        return "Take a favoured host's node first.";
    }
    if (!(host in HOSTS)) {
        return "There's no such host.";
    }
    const o = orreryOf(hero);
    const favour = [...(o.favour ?? [])];
    while (favour.length < slot) {
        favour.push("");
    }
    favour[slot] = host;
    o.favour = favour.filter((f, i) => f !== "" && favour.indexOf(f) === i);
    return undefined;
}

// A saved orrery read back: only what's known
export function readOrrery(raw: unknown): OrreryState | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }
    const r = raw as Record<string, unknown>;
    const lit = [...new Set(Array.isArray(r.lit) ? r.lit.filter((s): s is string => typeof s === "string") : [])];
    const taken = [...new Set(Array.isArray(r.taken) ? r.taken.filter((n): n is number => typeof n === "number" && ORRERY_NODE_BY_ID.has(n)) : [])];
    const favour = Array.isArray(r.favour) ? r.favour.filter((s): s is string => typeof s === "string" && s in HOSTS) : undefined;
    // No more nodes than spheres to take them with
    return { lit, taken: taken.slice(0, lit.length), favour };
}
