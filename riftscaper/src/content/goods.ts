// Goods: what falls in the rifts that's neither gear nor a rune, kept in the hero's pouch beside the
// runes and picked up by walking over it. Herbs first, grimy as OSRS's drop: the Apothecary brews
// potions up and makes elixirs with them (content/potions.ts). Object ids are the cache's
// (riftscaper/scripts/find-objs.ts). The ids are saved, so they're never renamed.

export type GoodId =
    | "guam"
    | "tarromin"
    | "ranarr"
    | "irit"
    | "kwuarm"
    | "cadantine"
    | "torstol"
    | "tokkul"
    | "voidSeal"
    | "abyssalAshes"
    | "abyssalPearls"
    | "egg"
    | "rawChicken"
    // The late game's (docs/late-game.md): the parts the transmuting circle upgrades a unique with
    // (circle.ts UPGRADES), each from where OSRS has it; the Awakener's orb that opens an awakened
    // pinnacle; the awakened generals' vestiges and the chromium that sets them; and the onyx
    // TzHaar-Hur-Tel sells for tokkul
    | "krakenTentacle"
    | "magicFang"
    | "ancientShard"
    | "tormentedSynapse"
    | "blisterwoodLogs"
    | "primordialCrystal"
    | "bloodShard"
    | "sunfireSplinters"
    | "awakenersOrb"
    | "chromiumIngot"
    | "ultorVestige"
    | "venatorVestige"
    | "magusVestige"
    | "bellatorVestige"
    | "uncutOnyx"
    // What the Apothecary stitches the belt's last two places with (content/potions.ts
    // BELT_ERRANDS), each dropped by one guardian for a hero who needs it
    | "wineOfZamorak"
    | "jarOfDarkness";

export type GoodDef = {
    id: GoodId;
    name: string;
    objId: number;
    color: string;
    blurb: string;
    // The lowest area level it drops at, and how often against the others open there
    level: number;
    weight: number;
    // Not a herb: an encounter's money (content/encounters.ts), or the secret rift's makings
    currency?: boolean;
    // Not shown in the pouch till there's one in it (the secret rift's makings, the late game's parts)
    secret?: boolean;
};

// A part, an orb or a vestige: kept in the pouch, shown once there's one, and spent in the circle
// or on the Archmage's awakened pinnacles
function part(id: GoodId, name: string, objId: number, color: string, blurb: string): GoodDef {
    return { id, name, objId, color, blurb, level: 0, weight: 0, currency: true, secret: true };
}

export const GOODS: Record<GoodId, GoodDef> = {
    guam: { id: "guam", name: "Grimy guam leaf", objId: 199, color: "#7cc05a", blurb: "A herb. The Apothecary makes Attack potions with it.", level: 1, weight: 10 },
    tarromin: { id: "tarromin", name: "Grimy tarromin", objId: 203, color: "#8ec060", blurb: "A herb. The Apothecary brews potions up to the second grade with it.", level: 8, weight: 9 },
    ranarr: { id: "ranarr", name: "Grimy ranarr weed", objId: 207, color: "#a0c868", blurb: "A herb. The Apothecary makes Defence potions with it.", level: 16, weight: 7 },
    irit: { id: "irit", name: "Grimy irit leaf", objId: 209, color: "#b0d070", blurb: "A herb. The Apothecary brews potions up to the third grade with it.", level: 24, weight: 6 },
    kwuarm: { id: "kwuarm", name: "Grimy kwuarm", objId: 213, color: "#c0d878", blurb: "A herb. The Apothecary brews potions up to the fourth grade with it.", level: 32, weight: 5 },
    cadantine: { id: "cadantine", name: "Grimy cadantine", objId: 215, color: "#d0e080", blurb: "A herb. The Apothecary makes Hunter potions with it.", level: 40, weight: 4 },
    torstol: { id: "torstol", name: "Grimy torstol", objId: 219, color: "#e0e890", blurb: "A herb. The Apothecary brews potions up to the fifth grade with it.", level: 48, weight: 3 },
    tokkul: { id: "tokkul", name: "Tokkul", objId: 6529, color: "#ff8838", blurb: "The TzHaar's money, won in the Fight Caves on the ladder.", level: 0, weight: 0, currency: true },
    voidSeal: { id: "voidSeal", name: "Void seal", objId: 11666, color: "#a070e0", blurb: "The Void Knights' thanks, won at Pest Control on the ladder. The Void Knight in the strangers' camp takes them.", level: 0, weight: 0, currency: true },
    abyssalAshes: { id: "abyssalAshes", name: "Abyssal ashes", objId: 25775, color: "#b060c0", blurb: "What's left of the Abyss's creatures, from its breaches on the ladder. A hundred open the way to the Abyssal Sire.", level: 0, weight: 0, currency: true },
    egg: {
        id: "egg",
        name: "Egg",
        objId: 1944,
        color: "#f0e8d0",
        blurb: "Laid in the meadows by something that didn't stay to hatch it. Three of them, with a raw chicken and a Law rune, are said to call something up in Aubury's circle.",
        level: 0,
        weight: 0,
        currency: true,
        secret: true,
    },
    rawChicken: {
        id: "rawChicken",
        name: "Raw chicken",
        objId: 2138,
        color: "#f0b8a0",
        blurb: "From the meadows. The old walkers said it goes in Aubury's circle with three eggs and a Law rune, and laughed.",
        level: 0,
        weight: 0,
        currency: true,
        secret: true,
    },
    abyssalPearls: { id: "abyssalPearls", name: "Abyssal pearls", objId: 26792, color: "#60d0c0", blurb: "The Great Guardian's thanks, won at Guardians of the Rift on the ladder. Apprentice Felix takes them.", level: 0, weight: 0, currency: true },
    krakenTentacle: part("krakenTentacle", "Kraken tentacle", 12004, "#70b0a0", "The Kraken's, from Waterbirth's waters on the ladder. In Aubury's circle with an Abyssal whip, it makes an Abyssal tentacle."),
    magicFang: part("magicFang", "Magic fang", 12932, "#80d060", "Zulrah's, from the ladder's swamps. In Aubury's circle with the Staff of the Dead, it makes a Toxic Staff of the Dead."),
    ancientShard: part("ancientShard", "Ancient shard", 19677, "#a0a0c0", "From the restless dead on the ladder, as Kourend's catacombs give them. Three in Aubury's circle with Darklight make Arclight."),
    tormentedSynapse: part("tormentedSynapse", "Tormented synapse", 29580, "#e06040", "A Tormented Demon's, on the ladder. In Aubury's circle with Arclight, it makes Emberlight."),
    blisterwoodLogs: part("blisterwoodLogs", "Blisterwood logs", 24691, "#c08060", "From Morytania's vampyres on the ladder. In Aubury's circle with the Ivandis flail, they make a Blisterwood flail."),
    primordialCrystal: part("primordialCrystal", "Primordial crystal", 13231, "#e04030", "Cerberus's, on the ladder. In Aubury's circle with Dragon boots, it makes Primordial boots."),
    bloodShard: part("bloodShard", "Blood shard", 24777, "#c02030", "A Vyrewatch's, on the ladder. In Aubury's circle with an Amulet of fury, it makes an Amulet of blood fury."),
    sunfireSplinters: part("sunfireSplinters", "Sunfire splinters", 28924, "#f0a030", "From the awakened Colosseum. Fifty in Aubury's circle bless Dizana's quiver."),
    awakenersOrb: part("awakenersOrb", "Awakener's orb", 28334, "#8060e0", "From the pinnacles' guardians, and now and then the ladder's superiors and Wilderness bosses. The Archmage spends one, with a pinnacle's key, to open it awakened."),
    chromiumIngot: part("chromiumIngot", "Chromium ingot", 28276, "#b0b8c8", "From the awakened pinnacles. Three in Aubury's circle set a vestige into its ring."),
    ultorVestige: part("ultorVestige", "Ultor vestige", 28285, "#d04030", "The awakened Graardor's. With three chromium ingots in Aubury's circle, it makes the Ultor ring."),
    venatorVestige: part("venatorVestige", "Venator vestige", 28283, "#40b040", "The awakened Kree'arra's. With three chromium ingots in Aubury's circle, it makes the Venator ring."),
    magusVestige: part("magusVestige", "Magus vestige", 28281, "#4070e0", "The awakened K'ril's. With three chromium ingots in Aubury's circle, it makes the Magus ring."),
    bellatorVestige: part("bellatorVestige", "Bellator vestige", 28279, "#e0c060", "The awakened Zilyana's. With three chromium ingots in Aubury's circle, it makes the Bellator ring."),
    uncutOnyx: part("uncutOnyx", "Uncut onyx", 6571, "#505058", "TzHaar-Hur-Tel's, for tokkul. With a Law rune in Aubury's circle, it's cut into an Amulet of fury or a Ring of suffering."),
    wineOfZamorak: part(
        "wineOfZamorak",
        "Wine of Zamorak",
        245,
        "#e04848",
        "K'ril Tsutsaroth's, from the end of rift 8. It never sours, whatever air it's in: the Apothecary steeps a third place on your belt in it.",
    ),
    jarOfDarkness: part(
        "jarOfDarkness",
        "Jar of darkness",
        19701,
        "#9070d0",
        "Skotizo's, from the end of rift 16. Nothing put in it ever spills: the Apothecary sets it in your belt as a fourth place.",
    ),
};

// In the order the pouch shows them, and the order they open
export const GOOD_IDS: GoodId[] = [
    "guam",
    "tarromin",
    "ranarr",
    "irit",
    "kwuarm",
    "cadantine",
    "torstol",
    "tokkul",
    "voidSeal",
    "abyssalAshes",
    "abyssalPearls",
    "egg",
    "rawChicken",
    "krakenTentacle",
    "magicFang",
    "ancientShard",
    "tormentedSynapse",
    "blisterwoodLogs",
    "primordialCrystal",
    "bloodShard",
    "sunfireSplinters",
    "awakenersOrb",
    "chromiumIngot",
    "ultorVestige",
    "venatorVestige",
    "magusVestige",
    "bellatorVestige",
    "uncutOnyx",
    "wineOfZamorak",
    "jarOfDarkness",
];

// The secret rift's makings (content/pinnacles.ts chicken): an egg and a raw chicken now and then
// from what's slain or opened in a meadow's rift, by rank, the chicken half as often
export const CHICKEN_DROPS = { normal: 0.002, magic: 0.005, rare: 0.03, boss: 0.15, chest: 0.05, hoard: 0.1 };

// The late game's parts (docs/late-game.md A): who drops each on the ladder, by its monster's id,
// and how often by its rank (a guardian's is its death's), on a stream of their own (Game.partRng) so
// every other drop is as it was. The restless dead pay Ancient shards as Kourend's catacombs do
export const PART_DROPS: { id: GoodId; from: string[]; chance: { normal: number; magic: number; rare: number; boss: number } }[] = [
    { id: "ancientShard", from: ["zombie", "skeleton", "ghost", "shade", "vetion"], chance: { normal: 0.004, magic: 0.012, rare: 0.08, boss: 0.5 } },
    { id: "tormentedSynapse", from: ["tormentedDemon"], chance: { normal: 0, magic: 0, rare: 0, boss: 0.34 } },
    { id: "primordialCrystal", from: ["cerberus"], chance: { normal: 0, magic: 0, rare: 0, boss: 0.34 } },
    { id: "blisterwoodLogs", from: ["countDraynor", "werewolfAlpha", "vyrewatch", "juvinate"], chance: { normal: 0.002, magic: 0.006, rare: 0.05, boss: 0.34 } },
    { id: "bloodShard", from: ["vyrewatch"], chance: { normal: 0.002, magic: 0.006, rare: 0.04, boss: 0 } },
    { id: "krakenTentacle", from: ["kraken"], chance: { normal: 0, magic: 0, rare: 0, boss: 0.34 } },
    { id: "magicFang", from: ["zulrah"], chance: { normal: 0, magic: 0, rare: 0, boss: 0.34 } },
];

// The Awakener's orb (docs/late-game.md B): a third of the time from a pinnacle's guardian, and now
// and then from the ladder's superiors and Wilderness bosses from this depth
export const ORB_DROPS = { pinnacle: 1 / 3, ladder: 0.1, fromDepth: 30 };

// The herbs, which fall as loot
export const HERB_IDS: GoodId[] = GOOD_IDS.filter((id) => !GOODS[id].currency);

export function isGood(id: unknown): id is GoodId {
    return typeof id === "string" && (GOOD_IDS as string[]).includes(id);
}

export function goodName(id: GoodId, count: number): string {
    return count === 1 ? GOODS[id].name : `${count} × ${GOODS[id].name}`;
}

// How often herbs fall: any monster's chance, a rare's always, and a guardian's and a chest's handful
export const HERB_DROPS = { normal: 0.012, magic: 0.03, rare: 1, boss: 4, chest: 1.5, hoard: 3 };
