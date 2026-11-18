// The record (docs/late-game.md D): the collection log, OSRS's, a slot for each unique, set
// piece, part and pet, lit the first time the hero has one; the combat achievements' points and
// the Ghommal's hilts they open; and the pet that follows. None of it gives power.
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, HILTS, HiltPerk, TIER_POINTS } from "../content/achievements";
import { GOODS, GoodId, PART_DROPS } from "../content/goods";
import { SETS, UNIQUES } from "../content/items";
import { AWAKENED_DROPS, PINNACLES, PINNACLE_IDS } from "../content/pinnacles";
import { PETS, PET_BY_ID } from "../content/pets";
import type { Hero } from "./hero";
import type { Item } from "./loot";

export type LogEntry = { key: string; name: string; objId: number };
export type LogPage = { id: string; name: string; entries: LogEntry[] };

// A pet's key in the log
export const petKey = (id: string) => `pet:${id}`;

let pages: LogPage[] | undefined;

// The log's pages, made once from the content: each pinnacle's uniques, goods and pet, the
// campaign's uniques, the sets, the circle's makes, the potions and talismans, the parts, the pets
export function logPages(): LogPage[] {
    if (pages) {
        return pages;
    }
    const unique = (u: (typeof UNIQUES)[number]): LogEntry => ({ key: u.id, name: u.name, objId: u.objId });
    const good = (id: GoodId): LogEntry => ({ key: id, name: GOODS[id].name, objId: GOODS[id].objId });
    const pet = (id: string): LogEntry[] => {
        const p = PET_BY_ID.get(id);
        return p ? [{ key: petKey(p.id), name: p.name, objId: p.objId }] : [];
    };
    const out: LogPage[] = [];
    for (const id of PINNACLE_IDS) {
        const p = PINNACLES[id];
        const entries = [...UNIQUES.filter((u) => u.pinnacle === id).map(unique), ...(AWAKENED_DROPS[id] ?? []).map((d) => good(d.id)), ...pet(p.zone.boss)];
        if (entries.length > 0) {
            out.push({ id, name: p.name, entries });
        }
    }
    const plain = UNIQUES.filter((u) => !u.pinnacle && !u.set && !u.source && u.slot !== "potion" && u.slot !== "talisman");
    out.push({ id: "campaign", name: "The rifts' uniques", entries: plain.map(unique) });
    out.push({ id: "sets", name: "Sets", entries: Object.values(SETS).flatMap((s) => [...s.pieces, ...(s.elite?.pieces ?? [])].map((id) => UNIQUES.find((u) => u.id === id)!).filter(Boolean).map(unique)) });
    out.push({ id: "made", name: "Aubury's circle", entries: UNIQUES.filter((u) => u.source === "upgrade").map(unique) });
    out.push({ id: "potions", name: "Potions", entries: UNIQUES.filter((u) => u.slot === "potion" && !u.pinnacle).map(unique) });
    out.push({ id: "talismans", name: "Talismans", entries: UNIQUES.filter((u) => u.slot === "talisman" && !u.pinnacle).map(unique) });
    const parts = [...new Set<GoodId>([...PART_DROPS.map((p) => p.id), "awakenersOrb", "chromiumIngot", "uncutOnyx"])];
    out.push({ id: "parts", name: "Parts", entries: parts.map(good) });
    out.push({ id: "pets", name: "Pets", entries: PETS.map((p) => ({ key: petKey(p.id), name: p.name, objId: p.objId })) });
    // Nothing twice on a page
    pages = out.map((page) => ({ ...page, entries: page.entries.filter((e, i) => page.entries.findIndex((o) => o.key === e.key) === i) }));
    return pages;
}

// Everything the log has a slot for
export function logKeys(): Set<string> {
    return new Set(logPages().flatMap((p) => p.entries.map((e) => e.key)));
}

// A slot lit: true if it's new
export function logIt(hero: Hero, key: string): boolean {
    if (!logKeys().has(key)) {
        return false;
    }
    hero.log ??= [];
    if (hero.log.includes(key)) {
        return false;
    }
    hero.log.push(key);
    return true;
}

// An item come to the hero: its unique's slot
export function logItem(hero: Hero, item: Item): boolean {
    return item.rarity === "unique" ? logIt(hero, item.base) : false;
}

// What the hero holds lit, as a save from before the log loads
export function logHeld(hero: Hero): void {
    const items = [...hero.inventory, ...Object.values(hero.equipment), ...hero.stash, ...hero.potions];
    for (const item of items) {
        if (item) {
            logItem(hero, item);
            for (const s of item.sockets ?? []) {
                if (s.gem) {
                    logItem(hero, s.gem);
                }
            }
        }
    }
    for (const [id, count] of Object.entries(hero.goods)) {
        if ((count ?? 0) > 0) {
            logIt(hero, id);
        }
    }
    for (const id of hero.pets ?? []) {
        logIt(hero, petKey(id));
    }
}

// ---- Combat achievements ----

export function achievementPoints(hero: Hero): number {
    return (hero.achievements ?? []).reduce((sum, id) => sum + (ACHIEVEMENT_BY_ID.get(id) ? TIER_POINTS[ACHIEVEMENT_BY_ID.get(id)!.tier] : 0), 0);
}

export function totalPoints(): number {
    return ACHIEVEMENTS.reduce((sum, a) => sum + TIER_POINTS[a.tier], 0);
}

// Whether the hero's points have opened the hilt with this perk
export function hasHilt(hero: Hero, perk: HiltPerk): boolean {
    const hilt = HILTS.find((h) => h.perk === perk);
    return hilt !== undefined && achievementPoints(hero) >= hilt.points;
}

// An achievement done: true if it's new
export function achieve(hero: Hero, id: string): boolean {
    if (!ACHIEVEMENT_BY_ID.has(id)) {
        return false;
    }
    hero.achievements ??= [];
    if (hero.achievements.includes(id)) {
        return false;
    }
    hero.achievements.push(id);
    return true;
}

// ---- Pets ----

// A pet won: true if it's new (a second is only a funny feeling)
export function winPet(hero: Hero, id: string): boolean {
    hero.pets ??= [];
    logIt(hero, petKey(id));
    if (hero.pets.includes(id)) {
        return false;
    }
    hero.pets.push(id);
    // The first follows at once
    hero.pet ??= id;
    return true;
}
