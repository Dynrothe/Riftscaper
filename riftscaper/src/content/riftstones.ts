// Riftstones and the Heartstone's shards, as plain data: the keys to rifts past the Archmage's own
// offers, in the way of Path of Exile's maps and its pinnacle fragments.
//
// A riftstone is a shard of the Runefall still tuned to a land: guardians from the second lap on
// drop them, and given to the Archmage it opens that land's rift with the modifiers woven into it.
// Its modifiers are rolled as an item's affixes are, and the runes work on it as they do on gear
// (sim/riftstones.ts): Air and Nature weave a normal one, Mind and Chaos weave it again, Cosmic
// adds a modifier and Death takes one off, so a hero can make the rift they want, up to four
// modifiers where the Archmage weaves three.
//
// The Heartstone was the greatest stone of the fall, the one that tore the sky: it never landed,
// and is still falling somewhere past every rift. Guardians on the ladder (past depth 16) shed its
// shards, one of the four runes the binding stones burn with; with all four in the pack, the
// Archmage can open the way to the Heart of the Rift (zones.ts), the hardest fight there is, whose
// guardian drops uniques nothing else does (items.ts, `pinnacle`). Object ids are the cache's
// (riftscaper/scripts/find-objs.ts): the riftstone is an Ancient shard, and the Heartstone's shards
// are the four pieces of the frozen key.
import type { RiftModId } from "./riftMods";

export const RIFTSTONE_BASE = "riftstone";

export const RIFTSTONE = {
    objId: 19677, // Ancient shard
    // The shallowest rift whose guardian drops one: the second lap's first
    from: 9,
    // A guardian's: one of its own depth, and this chance of another a depth deeper
    deeper: 0.4,
    // A rare monster's chance of one, of its rift's depth
    rare: 0.04,
    // The chance one falls magic, or rare, before rarity (half of it counts, as for runes)
    magic: 0.3,
    rareChance: 0.1,
    // How many modifiers a magic and a rare one is woven with, and the most each can hold
    magicMods: [1, 2] as [number, number],
    rareMods: [3, 4] as [number, number],
    most: { magic: 2, rare: 4 } as Record<"magic" | "rare", number>,
    // What the Archmage gives for one, by rarity
    worth: { normal: 30, magic: 60, rare: 120 } as Record<"normal" | "magic" | "rare", number>,
};

export const RIFTSTONE_TEXT = "A shard of the Runefall, still tuned to the land it fell from. The Archmage can open a rift with it, woven as it is.";

export type ShardId = "air" | "water" | "earth" | "fire";

export const SHARD_IDS: ShardId[] = ["air", "water", "earth", "fire"];

export type ShardDef = { id: ShardId; name: string; base: string; objId: number; color: string };

export const HEART_SHARDS: Record<ShardId, ShardDef> = {
    air: { id: "air", name: "Heartstone shard (Air)", base: "heartshard_air", objId: 26358, color: "#d8e4f0" },
    water: { id: "water", name: "Heartstone shard (Water)", base: "heartshard_water", objId: 26364, color: "#70a8f0" },
    earth: { id: "earth", name: "Heartstone shard (Earth)", base: "heartshard_earth", objId: 26360, color: "#b89060" },
    fire: { id: "fire", name: "Heartstone shard (Fire)", base: "heartshard_fire", objId: 26362, color: "#f07040" },
};

export const SHARD_BY_BASE = new Map(SHARD_IDS.map((id) => [HEART_SHARDS[id].base, HEART_SHARDS[id]]));

export const SHARD_TEXT = "A shard of the Heartstone, the greatest stone of the fall, still falling past every rift. With all four in your pack, the Archmage can open the way to the Heart of the Rift.";

export const HEART = {
    // Guardians this deep or deeper shed a shard, this often, one the hero hasn't got this many
    // times likelier
    from: 17,
    chance: 0.4,
    lacking: 3,
    // The Heart's guardian's own: one of the Heart's uniques always, and a second this often
    second: 0.35,
};

// A riftstone's modifiers, kept on its item (loot.ts `Item.rift`)
export type RiftstoneMods = RiftModId[];
