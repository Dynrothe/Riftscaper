// Talismans in the passive tree's sockets: one in each socket taken, its stats counting as the
// tree's, and a unique one's power over the nodes in its radius (passives.ts). One goes in from the
// pack and comes out into it again. A socket given back keeps its talisman, doing nothing till the
// socket's taken again, so starting the tree over never loses one.
import { PASSIVES } from "../content/passives";
import type { Hero } from "./hero";
import { stow } from "./hero";
import { Item, itemInfo } from "./loot";
import { joined, omniOf } from "./passives";

export function isTalisman(item: Item): boolean {
    return itemInfo(item).slot === "talisman";
}

// Every socket on the tree, by node
export const SOCKETS: number[] = PASSIVES.filter((n) => n.kind === "socket").map((n) => n.id);

// Why a talisman can't go in any socket, if it can't: its level
export function talismanWhy(hero: Hero, item: Item): string | undefined {
    const level = itemInfo(item).level;
    return level > hero.level ? `You need to be level ${level} to use this.` : undefined;
}

// Why a talisman can't go in a socket, if it can't
export function socketWhyNot(hero: Hero, socket: number, item: Item): string | undefined {
    if (PASSIVES[socket]?.kind !== "socket") {
        return "That isn't a socket.";
    }
    if (!hero.passives.includes(socket)) {
        return "Take the socket first.";
    }
    if (!isTalisman(item)) {
        return "Only a talisman goes in a socket.";
    }
    const low = talismanWhy(hero, item);
    if (low) {
        return low;
    }
    // One of each unique talisman in the tree at once
    if (item.rarity === "unique" && Object.entries(hero.talismans).some(([id, t]) => Number(id) !== socket && t.rarity === "unique" && t.base === item.base)) {
        return "You already have one of those in your tree.";
    }
    return undefined;
}

// The talisman at a place in the pack into a socket taken, and what was in it back into the pack
// in its place: why not, if it can't be
export function socketTalisman(hero: Hero, socket: number, index: number): string | undefined {
    const item = hero.inventory[index];
    if (!item) {
        return undefined;
    }
    const why = socketWhyNot(hero, socket, item);
    if (why) {
        return why;
    }
    const talismans = { ...hero.talismans, [socket]: item };
    if (!joined(hero.cls, hero.passives, omniOf(talismans))) {
        return "Passives you've taken hang from the talisman in it. Give them back first.";
    }
    const was = hero.talismans[socket];
    hero.talismans = talismans;
    hero.inventory[index] = was ?? null;
    return undefined;
}

// The talisman in a socket out into the pack: why not, if it can't be
export function unsocketTalisman(hero: Hero, socket: number): string | undefined {
    const was = hero.talismans[socket];
    if (!was) {
        return undefined;
    }
    const talismans = { ...hero.talismans };
    delete talismans[socket];
    if (!joined(hero.cls, hero.passives, omniOf(talismans))) {
        return "Passives you've taken hang from this talisman's radius. Give them back first.";
    }
    if (!stow(hero, was)) {
        return "Your pack is full.";
    }
    hero.talismans = talismans;
    return undefined;
}
