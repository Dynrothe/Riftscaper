// What opens a pinnacle (content/pinnacles.ts), and spending it: the Heartstone's shards, a god's
// kill count, or a pouch's goods
import { GOODS } from "../content/goods";
import { GOD_NAMES, GodId, PINNACLES, PinnacleId, awakenable } from "../content/pinnacles";
import { LADDER_DEPTH } from "../content/rules";
import type { Hero } from "./hero";
import { chickenWhyNot } from "./circle";
import { HILT } from "../content/achievements";
import { hasHilt } from "./log";
import { orreryLevers } from "./orrery";
import { hasAllShards, shardsHeld } from "./riftstones";
import { SHARD_IDS } from "../content/riftstones";

// How much of its key the hero has, and needs: shards in the pack, kill count, goods
export function pinnacleHave(hero: Hero, id: PinnacleId): number {
    const key = PINNACLES[id].key;
    switch (key.kind) {
        case "shards": {
            const held = shardsHeld({ ...hero, stash: [] });
            return SHARD_IDS.filter((s) => held[s] > 0).length;
        }
        case "killCount":
            return hero.killCount[key.god] ?? 0;
        case "goods":
            return hero.goods[key.id] ?? 0;
        case "free":
        case "circle":
            return 0;
    }
}

// So much of its key, a quarter less of a count with Ghommal's third hilt (content/achievements.ts)
export function pinnacleNeed(id: PinnacleId, hero?: Hero): number {
    const key = PINNACLES[id].key;
    if (key.kind === "shards") {
        return SHARD_IDS.length;
    }
    if (key.kind === "free" || key.kind === "circle") {
        return 0;
    }
    // Ghommal's third hilt, and the orrery's lighter toll
    const less = hero ? (hasHilt(hero, "key") ? HILT.keyLess : 0) + orreryLevers(hero).keys : 0;
    return Math.ceil(key.count * (1 - less));
}

// "40 Bandos kill count", "100 abyssal ashes"
export function pinnacleKeyText(id: PinnacleId, hero?: Hero): string {
    const key = PINNACLES[id].key;
    const count = pinnacleNeed(id, hero);
    switch (key.kind) {
        case "shards":
            return "The Heartstone's four shards";
        case "killCount":
            return `${count} ${GOD_NAMES[key.god]} kill count, from ${GOD_NAMES[key.god]}'s followers slain on the ladder`;
        case "goods":
            return `${count} ${GOODS[key.id].name.toLowerCase()}, from the Abyss's breaches`;
        case "free":
            return "Nothing: its gates are open to any hero past the ladder's start";
        case "circle":
            return "Three eggs, a raw chicken and a Law rune, laid in Aubury's circle";
    }
}

// Why the Archmage can't open it, if he can't
export function pinnacleWhyNot(hero: Hero, id: PinnacleId): string | undefined {
    // The secret rift's opened in the circle, by any hero who has its makings
    if (PINNACLES[id].key.kind === "circle") {
        return chickenWhyNot(hero);
    }
    if (hero.maxDepth <= LADDER_DEPTH) {
        return `Clear rift ${LADDER_DEPTH} first: the pinnacles are beside the ladder.`;
    }
    if (id === "heart") {
        return hasAllShards(hero) ? undefined : "You need all four of the Heartstone's shards in your pack.";
    }
    const have = pinnacleHave(hero, id);
    const need = pinnacleNeed(id, hero);
    return have >= need ? undefined : `It takes ${pinnacleKeyText(id, hero).replace(/, from.*$/, "")}: you have ${have}.`;
}

// Its key, spent (the Heart's shards are riftstones.ts takeShards')
export function spendPinnacleKey(hero: Hero, id: PinnacleId): void {
    const key = PINNACLES[id].key;
    const need = pinnacleNeed(id, hero);
    if (key.kind === "killCount") {
        hero.killCount[key.god] = Math.max(0, (hero.killCount[key.god] ?? 0) - need);
    } else if (key.kind === "goods") {
        hero.goods[key.id] = Math.max(0, (hero.goods[key.id] ?? 0) - need);
    }
}

// Why it can't be opened awakened, if it can't: its own key, and an Awakener's orb
export function awakenedWhyNot(hero: Hero, id: PinnacleId): string | undefined {
    if (!awakenable(id)) {
        return "It has no awakened version.";
    }
    const why = pinnacleWhyNot(hero, id);
    if (why) {
        return why;
    }
    return (hero.goods.awakenersOrb ?? 0) >= 1 ? undefined : `It takes an ${GOODS.awakenersOrb.name} besides its key.`;
}

// An awakened pinnacle's orb, spent with its key
export function spendOrb(hero: Hero): void {
    hero.goods.awakenersOrb = Math.max(0, (hero.goods.awakenersOrb ?? 0) - 1);
}

// A god's follower slain: their kill count
export function addKillCount(hero: Hero, god: GodId, count = 1): void {
    hero.killCount[god] = (hero.killCount[god] ?? 0) + count;
}
