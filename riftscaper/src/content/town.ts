// Runefall, the city between the rifts, as plain data: its story, its shops and who keeps them,
// the wizards of its tower and their Archmage, who opens the rifts, the guards at its gates and
// the people in its streets, each with what they say. NPC ids are the cache's, looked up with
// riftscaper/scripts/find-npcs.ts. Where each stands is the city's own (world/cityGen.ts).
import type { GoodId } from "./goods";
import type { BaseDef, ClassId, SetId, Slot } from "./items";

export const CITY_NAME = "Runefall";

// Why the city is where it is. Long ago the sky over this meadow tore open and a fall of black
// stone came down, each stone with a rune burning in it: the Runefall, which split the ground
// where the square now lies. Where the largest struck, the tear in the air never closed. The
// wizards came to study it and found it could be steered: bound in a ring of four of the fallen
// stones, the tear opens on to whatever land the Archmage tunes it to, a rift made new each time.
// They raised a tower beside it, and the city grew round the tower to serve those who go through:
// a market, a forge, a fletcher, a bank for what comes back, and a chapel for those who don't.
export const CITY_LORE = [
    "Long ago the sky over this meadow tore, and a fall of black stone came down, a rune burning in each: the Runefall.",
    "Where the greatest stone struck, the tear it left never closed. The wizards bound it in four of the fallen stones.",
    "Tuned by the Archmage, the tear opens on to other lands, each made new as the rift opens. The city grew up round it.",
];

// The city's light: a clear afternoon, a touch warm (the ambient as ZoneDef's)
export const CITY_LIGHT = { ambient: 1, ambientColor: 0xfff8ee };

export type ShopId = "smith" | "archery" | "staffs" | "jeweller" | "general" | "gems" | "apothecary" | "tzhaar" | "void" | "felix";

export type ShopDef = {
    id: ShopId;
    name: string;
    keeper: string;
    npcId: number;
    // What they say when the shop opens
    greeting: string;
    // How many things are on the shelves, rolled again every time the hero comes home
    stock: number;
    // What's on them
    sells: (base: BaseDef) => boolean;
    // Mystery items for a slot, magic or better, instead of shelves
    gamble?: boolean;
    // Skill and support gems on the shelves, and work on sockets
    gems?: boolean;
    // The cheaper runes behind the counter (runes.ts SHOP_RUNES), as many as the hero can pay for
    runes?: boolean;
    // Potions on the shelves, and brewing: potions brewed up a grade, instilled, and elixirs
    // (potions.ts)
    potions?: boolean;
    // A set (items.ts SETS) for an encounter's money, not gold (items.ts SET_PRICES): the TzHaar's
    // obsidian for tokkul, the Void Knight's equipment for seals, Felix's raiments for pearls
    // (its name in a price, and where it's won)
    sets?: { set: SetId; good: GoodId; money: string; text: string };
    // What else the stall sells for its money (docs/late-game.md E): a set's piece made elite from
    // the one it was; goods; and a talisman of the base the hero chooses, rare, or now and then one
    // of these uniques instead, as Guardians of the Rift's own shop sells them
    upgrades?: { from: string; to: string; price: number }[];
    wares?: { good: GoodId; price: number }[];
    talismans?: { price: number; unique: number; uniques: string[] };
};

const forClass =
    (...classes: ClassId[]) =>
    (base: BaseDef) =>
        classes.some((cls) => base.classes?.includes(cls));
const inSlots = (slots: Slot[]) => (base: BaseDef) => slots.includes(base.slot);

export const SHOPS: Record<ShopId, ShopDef> = {
    smith: {
        id: "smith",
        name: "Horvik's Armoury",
        keeper: "Horvik",
        npcId: 2882,
        greeting: "Steel for the rifts, forged this morning. Plate, blades, maces, daggers and shields, all fit for a fighter.",
        stock: 14,
        // A rogue's daggers too, but not their togs
        sells: (base) => forClass("warrior", "paladin")(base) || (base.weapon?.kind === "melee" && forClass("rogue")(base)),
    },
    archery: {
        id: "archery",
        name: "Lowe's Archery Emporium",
        keeper: "Lowe",
        npcId: 2883,
        greeting: "Bows, hides and gloves, and a rogue's togs for whoever asks no questions. Light on the back, quick on the feet.",
        stock: 12,
        sells: (base) => forClass("ranger", "rogue")(base) && base.weapon?.kind !== "melee",
    },
    staffs: {
        id: "staffs",
        name: "Zaff's Superior Staffs",
        keeper: "Zaff",
        npcId: 2880,
        greeting: "Staves, robes and books, every one of them humming, and a few things I'd rather not say where they came from. Mind the sparks.",
        stock: 12,
        sells: forClass("mage", "necromancer"),
    },
    jeweller: {
        id: "jeweller",
        name: "Aubury's Trinkets",
        keeper: "Aubury",
        npcId: 10681,
        greeting: "Rings, amulets, a cape or two, and runes behind the counter. Small things, but the rifts notice them.",
        stock: 10,
        sells: inSlots(["amulet", "ring", "cape"]),
        runes: true,
    },
    general: {
        id: "general",
        name: "Fortunato's Curios",
        keeper: "Fortunato",
        npcId: 1260,
        greeting: "Wrapped up and sealed, straight out of the rifts. Pick a shape and try your luck. I buy anything, too.",
        stock: 0,
        sells: () => false,
        gamble: true,
    },
    gems: {
        id: "gems",
        name: "The Gem Trader",
        keeper: "Gem trader",
        npcId: 2874,
        greeting: "Cut stones that hold a skill, and uncut ones that make a skill better. Set them in your gear, linked, and they work together. I can recut your sockets, too.",
        stock: 14,
        sells: () => false,
        gems: true,
    },
    apothecary: {
        id: "apothecary",
        name: "The Apothecary",
        keeper: "Apothecary",
        npcId: 5036,
        greeting: "Brews for the belt, and herbs to make them better. Bring me what grows in the rifts and I'll brew your potions up, or make you an elixir to drink before you go. Bring me what the great guardians carry, and I'll give your belt more places.",
        stock: 8,
        sells: (base) => base.slot === "potion",
        potions: true,
    },
    // A TzHaar come up out of the Fight Caves with obsidian to sell, by his lava pit in the strangers'
    // camp, who takes tokkul and nothing else
    tzhaar: {
        id: "tzhaar",
        name: "TzHaar-Hur-Tel's Equipment Store",
        keeper: "TzHaar-Hur-Tel",
        npcId: 2183,
        greeting: "JalYt want obsidian? TzHaar-Hur-Tel take tokkul, from the Fight Caves. Only tokkul.",
        stock: 0,
        sells: () => false,
        sets: { set: "obsidian", good: "tokkul", money: "tokkul", text: "The Fight Caves pay tokkul, on the ladder. Four pieces make the obsidian set." },
        // An onyx, which Aubury's circle cuts into an Amulet of fury or a Ring of suffering
        wares: [{ good: "uncutOnyx", price: 8000 }],
    },
    // A Void Knight off Pest Control's outpost, at the camp's stall, who pays in the
    // knights' own equipment for the seals won defending them (npc-info.ts 1755)
    void: {
        id: "void",
        name: "The Void Knights' Reward Stall",
        keeper: "Void Knight",
        npcId: 1755,
        greeting: "The portals open on your ladder too, then. Bring me the seals you earn closing them, and the Void Knights will dress you for it.",
        stock: 0,
        sells: () => false,
        sets: { set: "void", good: "voidSeal", money: "void seals", text: "Pest Control pays in seals, on the ladder. A helm, the top, the robe and the gloves make the set: one helm counts." },
        upgrades: [
            { from: "void_knight_top", to: "elite_void_top", price: 200 },
            { from: "void_knight_robe", to: "elite_void_robe", price: 200 },
        ],
    },
    // Apprentice Felix, from the Temple of the Eye, in the camp between his essence: the raiments
    // for the Great Guardian's pearls (npc-info.ts 11404)
    felix: {
        id: "felix",
        name: "Apprentice Felix's Rewards",
        keeper: "Apprentice Felix",
        npcId: 11404,
        greeting: "You've been helping the Great Guardian? Then you've pearls. The Eye's raiments find more than runes, I promise.",
        stock: 0,
        sells: () => false,
        sets: { set: "raiments", good: "abyssalPearls", money: "abyssal pearls", text: "Guardians of the Rift pays in abyssal pearls, on the ladder. Four pieces make the Raiments of the Eye." },
        talismans: { price: 40, unique: 1 / 8, uniques: ["elemental_talisman", "catalytic_talisman"] },
    },
};

export const SHOP_IDS = Object.keys(SHOPS) as ShopId[];

// The head of the tower: he opens a rift to any depth the hero has reached
export const ARCHMAGE = {
    npcId: 11432,
    name: "Archmage Sedridor",
    title: "Keeper of the Rift",
    // His cast as the portal opens, and what it throws
    castSeq: 711,
    castSpot: 342,
};

// The tower's wizards, wandering its rooms and the street before it; a click has one say something
export const WIZARD_NPCS = [1160, 4398, 4400, 3246, 11436, 3249];

export const WIZARD_LINES = [
    "The rifts are getting deeper. The Archmage hardly sleeps.",
    "Don't touch the tear before it's tuned. Trust me.",
    "Every rift is a world of its own, made anew from nothing.",
    "Bring us back anything that glows. On second thoughts, don't.",
    "If you die out there, the tower's ward pulls you home. Most of you.",
    "Horvik's steel won't stop a spell. Zaff's robes might.",
    "The four binding stones hold the tear in place. Move one and it wanders. We tried.",
    "The runes in the fallen stones still burn after all these years. Nobody can read them.",
    "The orrery turns with the rifts, not the stars. Don't ask me how.",
    "Half the tower's essence comes out of our own gardens. The fall scattered it everywhere.",
];

// The banker at his counter on the square, who keeps the hero's stash
export const BANKER = {
    npcId: 2897,
    name: "Banker",
    title: "Keeps your stash",
    boothLoc: 10083,
    greeting: "Good day. Anything you leave with me stays safe while you're in the rifts.",
};

// The city's guards, at its gates, and the rift wardens round the tear, who have lines of their own
export const GUARD_NPCS = [1947, 1949, 1950];

export const GUARD_LINES = [
    "Move along.",
    "Keep your weapons sheathed in the city.",
    "Another one back from the rifts. Welcome home.",
    "The road south goes to Varrock, if you ever want a quiet life.",
    "No fighting inside the walls. Save it for the rifts.",
];

export const WARDEN_LINES = [
    "Stand clear of the binding stones. They're warm, and that's not the sun.",
    "Nothing comes out of the tear that didn't go in. That's the first thing a warden learns.",
    "The Archmage tunes it, we watch it. Someone has to.",
    "A rift closes when its guardian falls, or when the walker does. Either way, we see the light go out.",
];

// Someone in the streets with lines of their own: the city's chronicler, its crier, the priest of
// its chapel, the Archmage's apprentice, a farmer outside the walls and the townsfolk
export type FolkDef = {
    npcId: number;
    name: string;
    title: string;
    lines: string[];
};

export const FOLK = {
    chronicler: {
        npcId: 4242,
        name: "Reldo",
        title: "Chronicler of the Runefall",
        lines: [
            "The Runefall came down in the Fourth Age, the records say. A night of falling stone, and every stone with a rune in it.",
            "The city's named for the fall. The stones you see about the town are the ones that didn't shatter.",
            "The tear was here before the tower. The wizards only taught it where to open.",
            "I keep the register of every rift the Archmage has opened. It gets longer every day you're here.",
            "Nobody has read the runes on the fallen stones. Not the Archmage, not the tower, not me.",
        ],
    },
    crier: {
        npcId: 276,
        name: "Town crier",
        title: "Voice of the square",
        lines: [
            "Hear ye! The Archmage opens rifts for any who dare them. Apply at the tear!",
            "Hear ye! Horvik's forge has steel fresh this morning, and Lowe has bows to match!",
            "Hear ye! The banker holds your goods while you're away, and asks no questions!",
            "Hear ye! Fortunato's curios are sealed and sold as seen. No refunds!",
            "Hear ye! Keep off the binding stones, by order of the tower!",
        ],
    },
    priest: {
        npcId: 1137,
        name: "Father Lawrence",
        title: "Priest of the chapel",
        lines: [
            "Every stone in this yard is someone the rifts kept. Saradomin hold them.",
            "The ward brings most of them home. We tend the rest.",
            "Light a candle before you go through. It costs nothing, and it may be the last thing you do here.",
            "The chapel was the first house in Runefall after the tower. People needed somewhere to pray before the tear.",
        ],
    },
    apprentice: {
        npcId: 1808,
        name: "Apprentice Clara",
        title: "The Archmage's apprentice",
        lines: [
            "I watch the tear in the glass. When it ripples, a rift is about to close.",
            "The orrery's spheres are the rifts. The one that's lit is yours.",
            "The Archmage says I'll tune the tear myself one day. The Archmage says a lot of things.",
            "Don't mind the shards in the grass. They're essence. The fall left them everywhere.",
        ],
    },
    farmer: {
        npcId: 3114,
        name: "Farmer Aldric",
        title: "Of the south field",
        lines: [
            "Crops come up strange this close to the tear. Bigger, mostly. I don't complain.",
            "The guards buy my hay for the stables. The wizards buy my cabbages. Everyone eats.",
            "Stones still turn up in the furrows. Little black ones, warm to the touch. The tower pays for them.",
        ],
    },
    townsman: {
        npcId: 3106,
        name: "Bram",
        title: "Of Runefall",
        lines: [
            "Lived here all my life. The tear's never once gone quiet.",
            "You can see the glow from the square at night, over the rooftops. You get used to it.",
            "My grandfather carried stone for the tower. Said the wizards paid in runes.",
        ],
    },
    townswoman: {
        npcId: 3111,
        name: "Marta",
        title: "Of Runefall",
        lines: [
            "The market's busiest when a rift closes. Everyone comes to see what came back.",
            "Lowe's got a new batch of hides in. Rift leather, he calls it. Looks like cow to me.",
            "Mind the crier. Once he starts, he doesn't stop.",
        ],
    },
    carter: {
        npcId: 3108,
        name: "Osric",
        title: "Carter to the tower",
        lines: [
            "I haul for the tower. Essence in, empty carts out. The stuff weighs nothing and pays well.",
            "The east road goes to the river. The west goes nowhere much. Everything worth having comes through the south gate.",
            "They say the tear hums if you stand close enough. I've never stood close enough.",
        ],
    },
    goodwife: {
        npcId: 3113,
        name: "Ailsa",
        title: "Of Runefall",
        lines: [
            "The stone that came down on the house in the tower garden glows at night. The children dare each other to touch it.",
            "Father Lawrence rings the chapel bell when a rift closes. Once for a walker home, twice for the ward.",
            "If you're going through, say goodbye to someone first. That's all I'll say.",
        ],
    },
} satisfies Record<string, FolkDef>;

export type FolkId = keyof typeof FOLK;

// How much a shop asks over what it pays
export const BUY_MARKUP = 5;
