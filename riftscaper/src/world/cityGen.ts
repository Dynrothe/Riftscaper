// Runefall, the city that grew round a wound in the world. ScapeRune's generator makes the land (a
// meadow in a ring of forest, two map squares a side), and the city is laid on it by hand, as the
// ScapeRune guide's "By hand" has it, to a plan drawn from the genre's best towns (docs/city.md):
// everything a rift-walker comes back for stands round one square, a screen or so across, in the
// order it's wanted, and the rest of the town lies round that, each part with a story of its own.
//
// The square is the city's heart. The tear it's named for hangs in its middle, in the crater the
// fall left, in a dais of flagstones and bound in four of the fallen stones. The hero comes home
// on the dais's west side, by the Archmage, who opens the tear, and Reldo, who reads what comes back;
// the bank and the apothecary face the tear from the square's west side, Horvik's forge and Lowe's
// from its east, Fortunato's tent and the gem trader's stall stand at its south corners, and the
// orrery stands on the square's axis between the tear and the Wizards' Tower, which closes its
// north side. The tower street runs before the tower from the west gate to the east, Zaff's and
// Aubury's either side of it; the south street runs from the square to the south gate, past the
// inn. The chapel and its churchyard are to the north-west, the strangers who came out of the
// rifts camp south-east of the square by the Captain's barracks, the tower's garden lies behind
// it, where a stone came down through a house, and houses and their yards fill the rest. Outside
// the south gate are the road, a field and a pasture.
//
// It's always the same city: the seed and the plan are fixed. Coordinates in the plan are arena
// tiles (0 to 127, x east and y north), turned into world tiles for the game.
import { HIRELING } from "../content/hirelings";
import { yawFromVector } from "../../../engine/controller/CharacterMovement";
import type { CustomMapSquares } from "../../../engine/rs/map/CustomMapFileLoader";
import { Ground } from "../../../engine/scaperune/Ground";
import { CITY_WALLS, CityGate, placeCityWall } from "../../../engine/scaperune/cityWalls";
import { dressGround } from "../../../engine/scaperune/dress";
import { MAP_SQUARE_SIZE, TILE_BLOCKED, createTileGrid } from "../../../engine/scaperune/format";
import type { PlacedLoc, TileGrid } from "../../../engine/scaperune/format";
import { DEFAULT_SETTINGS, GeneratorSettings, generateMapDetail, getSettingsError } from "../../../engine/scaperune/generator";
import { LOC_WALL, MARGIN, WALL_EAST, WALL_NORTH, WALL_SOUTH, WALL_WEST } from "../../../engine/scaperune/mapBuild";
import { createRng } from "../../../engine/scaperune/noise";
import { Placer } from "../../../engine/scaperune/placer";
import { rotatePrefab } from "../../../engine/scaperune/prefab";
import { PREFABS, PrefabDef, PrefabKit, isDoor, loadPrefab } from "../../../engine/scaperune/prefabs";
import type { BuildContext, MapRecipe } from "../../../engine/scaperune/recipe";
import { buildRecipeSquares } from "../../../engine/scaperune/squares";
import { ARCHMAGE, BANKER, CITY_NAME, FOLK, FolkId, GUARD_NPCS, SHOPS, ShopId, WARDEN_LINES, WIZARD_NPCS } from "../content/town";
import type { PersonPlan, TownPlan } from "../sim/town";
import { ORRERY } from "../content/orrery";

// Map squares the cache doesn't have and nothing else in the game uses (scripts/free-squares.ts):
// x 86 to 89, y 92 to 95, the arena and a square of margin round it. The rifts are at 92 to 96.
export const CITY_MAP_X = 86;
export const CITY_MAP_Y = 92;
export const CITY_SQUARES = 2;
const CITY_SEED = 31_337;

// Places cut whole from the real world, besides the engine's prefabs (whose cottage is Zaff's own
// staff shop and its house the apothecary's, shelves of potions and all): Aubury's rune shop in
// south-east Varrock, eight-sided, its door on the street (its fire rune icon stands in it), but
// not the corner of the smithy next door that its rectangle takes in; the Wizards' Tower's ground floor, south of Draynor, with a row of its
// island round it (its own trees, heather and the fairy ring outside the walls stay behind);
// Varrock's east bank, booths and all, whose door is on its north side; Horvik's armoury, forge,
// anvils and lathe, open to the street through two arches on each of two sides; Lowe's archery
// shop, bow cabinets and all; the Blue Moon Inn, its hearth, bar and kitchen, and the tiles its
// west wall stands on, but not the alley's fence beyond them; and the butcher's by Varrock's east bank, carcasses on their hooks
// (riftscaper/scripts/locs-in.ts read each, and each was looked at in the game)
// A prefab, and a rectangle of it, in world tiles, whose locs are a neighbour's and stay behind
type CityPrefab = PrefabDef & { neighbour?: Rect };
const CITY_PREFABS: Record<string, CityPrefab> = {
    ...PREFABS,
    aubury: { worldX: 3249, worldY: 3398, sizeX: 8, sizeY: 8, neighbour: { x0: 3249, y0: 3403, x1: 3251, y1: 3405 } },
    wizards_tower: { worldX: 3100, worldY: 3151, sizeX: 18, sizeY: 19, leaveOut: [1179, 1180, 1278, 1299, 1300, 5615, 10820, 29495] },
    varrock_bank: { worldX: 3249, worldY: 3415, sizeX: 10, sizeY: 12 },
    horviks: { worldX: 3226, worldY: 3432, sizeX: 8, sizeY: 11 },
    lowes: { worldX: 3229, worldY: 3419, sizeX: 12, sizeY: 10 },
    blue_moon: { worldX: 3215, worldY: 3392, sizeX: 20, sizeY: 12 },
    butchers: { worldX: 3248, worldY: 3430, sizeX: 14, sizeY: 10 },
};

// ---- What the city's made of: loc ids, looked up with scripts/find-locs.ts and looked at ----

// The tear's ward: the fallen stones, black basalt with a rune still burning in it, one standing
// alone, a tumble of two and a tumble of three; and the shards of essence the fall scattered
const BINDING_STONE = 13635;
const FALLEN_STONE = 29367;
const FALLEN_STONES = 29366;
const SHARD = 16687;
// The orrery, which turns with the rifts (content/orrery.ts), and Clara's telescope beside it
const ORRERY_LOC = ORRERY.locId;
const TELESCOPE = 7092;
// Reldo's lectern, where he keeps the register of the rifts
const LECTERN = 27214;
// Lights. Varrock's own streets have no lamps (scripts/city-survey.ts), and lamps and lanterns in
// the cache hang from walls, so the city's lights are the standing torch that burns in Edgeville
// and the Barbarian Village, at the gates and the square's corners, and a brazier at the inn's
// door and in the strangers' camp
const TORCH = 724;
const BRAZIER = 28818;
// Fortunato's tent of sealed curios; the gem trader's stall, its stones along its counter; the
// apothecary's herb stall, its herbs open to the sky; and the small stall of runes at Aubury's
// door. His transmuting circle (content/circle.ts) is at his bench, not on the street: the cache's
// magic circles (13682, 10252) are a house's floor traps, a swirl of light that reads as a glitch on
// cobbles, and its chalk patterns don't show on them
const TENT = 29307;
const GEM_STALL = 11731;
const HERB_STALL = 6948;
const MAGIC_STALL = 4877;
// The strangers' camp: TzHaar-Hur-Tel's lava pit, obsidian bench and stall; the Void Knight's
// market stall and the striped tent he sleeps in; Apprentice Felix's essence, elemental and
// catalytic, from the Temple of the Eye
const LAVA_PIT = 20234;
const OBSIDIAN_BENCH = 29276;
const MARKET_STALL = 2303;
const STRIPED_TENT = 23062;
const ELEMENTAL_ESSENCE = 43722;
const CATALYTIC_ESSENCE = 43723;
// Against walls, as real towns keep their clutter: barrels, stacked barrels, crates, sacks, the
// smith's quenching water, an anvil, a table and stools, a well, a planter of flowers
const BARREL = 362;
const STACKED_BARRELS = 4641;
const CRATE = 5106;
// Varrock's own, as they stand round Aubury's shop there: a big slatted crate, boxes and a barrel
const SLATTED_CRATE = 5107;
const BOXES = 5111;
const VARROCK_BARREL = 5122;
const SACKS = 23;
const WATER_BARREL = 5598;
const ANVIL = 2097;
const TABLE = 2333;
const STOOL = 7168;
const WELL = 884;
const PLANTER = 39495;
const SIGNPOST = 1082;
const NOTICE_BOARD = 24098;
// Carts, hay, a coop and a trough for the yards, and the field's own
const CART = 307;
const HAYSTACK = 300;
const HAY_BALE = 304;
const COOP = 5571;
const TROUGH = 2044;
const SCARECROW = 297;
const CROPS = [15506, 15507, 15508];
// The barracks' training yard
const DUMMY = 823;
const ARCHERY_TARGET = 13402;
// Gardens: the meadow's own trees, oaks and willows from the player's own gardens, bushes, roses,
// box hedge and a dead tree
const TREE = 1276;
const OAK = 4533;
const WILLOW = 4534;
const BUSH = 1118;
const SMALL_BUSH = 1125;
const ROSEBUSH = 1126;
const ROSES = 5148;
const HEDGE = 1116;
const DEAD_TREE = 1282;
// The churchyard
const GRAVESTONE = 404;
const GRAVE_MARKER = 401;
const TOMBSTONE = 402;
const SARADOMIN_STATUE = 9247;
// Walls on tile edges: Lumbridge's low cobbled stone wall (the chapel's own kit) round the
// churchyard, Varrock's fence round the yards, and Lumbridge's fence round
// the field outside
const LOW_WALL = 1902;
const FENCE = 23849;
const FIELD_FENCE = 980;
// Grass tufts and flowers for the ground the generator's dressing didn't reach
const MEADOW_DECOR = [4735, 4736, 4737, 4738];

// Floors (scripts/floor-info.ts, and looked at): the square and the streets in cobbles, the only
// stone with a grain from above; the tear's dais in flagstones; the lanes and the yards in the
// meadow's own road; and under them all the dark earth Varrock's own streets lie on round them;
// under the cobbles a grey the cobbles' own, which is what shows where a stone's edge cuts a tile;
// in the crater rough dark rock, black at its heart, on a grey earth like the rock, which is what
// shows in the mouth's slants (a tile holds one overlay, and those are the dais's)
const COBBLES = 12;
const DAIS_STONE = 174;
const CRATER_ROCK = 32;
const BLACK_ROCK = 115;
const ROAD = 22;
const TRAIL = 63;
const STONE_EARTH = 154;
const CRATER_EARTH = 179;

type Rect = { x0: number; y0: number; x1: number; y1: number };

// ---- The plan, in arena tiles ----

// Everything lines up on one axis, north and south through the middle of the arena: the south
// gate, the south street, the tear, the orrery and the tower's door
const AXIS = 64.5;

// What's cleared for the city: the walls and all inside them, the ground outside the south gate
// for the field and the pasture, and the roads out of the side gates
const TOWN: Rect = { x0: 26, y0: 19, x1: 102, y1: 108 };
const SOUTH_APPROACH: Rect = { x0: 40, y0: 0, x1: 88, y1: 20 };
const WEST_ROAD: Rect = { x0: 0, y0: 71, x1: 27, y1: 74 };
const EAST_ROAD: Rect = { x0: 101, y0: 71, x1: 127, y1: 74 };
const SOUTH_ROAD: Rect = { x0: 62, y0: 0, x1: 67, y1: 23 };
// The ground shaped under the town, easing into the meadow over the feather round it
const SHAPED: Rect = { x0: 26, y0: 0, x1: 102, y1: 108 };
const SHAPED_FEATHER = 10;

// The wall: the middle of its walkway, corner to corner, and the three gates. Varrock's kit is
// 3 tiles across, so its band is a tile either side of this, and its gates 6 wide with their posts
// and 4 open between them: the south one at x 63 to 66, on the axis, and the side ones at y 71 to
// 74, the tower street's own rows (a gate's 'at' counts along its side as the wall runs, so the
// west one and the east one take the same rows from 73 and from 72; scripts/city-map.ts shows them)
const WALL: Rect = { x0: 30, y0: 24, x1: 98, y1: 104 };
const GATES: CityGate[] = [
    { side: "south", at: 64 },
    { side: "west", at: 73 },
    { side: "east", at: 72 },
];

// The tear: its middle, on the axis; the crater the fall left round it, which dips this deep in
// its middle and is black this far round it; and the dais round that, a square of flagstones this far each way from the tear,
// with an eight-sided mouth over the crater, its straight sides this far from the tear and its
// slant ones where the two offsets add up to this. Its edges lie on tile corners, so that they
// come out as straight lines and clean slants (Ground.paintField).
const TEAR = { x: AXIS, y: 59.5 };
const CRATER_RADIUS = 3.5;
const CRATER_DEPTH = 24;
const HEART_RADIUS = 1.8;
const DAIS_REACH = 6.5;
const MOUTH = 3.5;
const MOUTH_SLANT = 5;
// A hair more than the dais's reach, so that its corners stay square: a tile with three corners
// on its edge would come out a slant
const EDGE = 0.01;
const DAIS: Rect = { x0: TEAR.x - DAIS_REACH, y0: TEAR.y - DAIS_REACH, x1: TEAR.x + DAIS_REACH - 1, y1: TEAR.y + DAIS_REACH - 1 };

// The square, its fronts the buildings' doors on its west and east sides, its north side the
// tower street and its south side the south street's mouth; the streets; and the lanes, of
// trodden earth, that run off the square to the houses
const SQUARE: Rect = { x0: 52, y0: 46, x1: 76, y1: 70 };
const TOWER_STREET: Rect = { x0: 32, y0: 71, x1: 96, y1: 74 };
const SOUTH_STREET: Rect = { x0: 62, y0: 23, x1: 67, y1: 45 };
const STREETS: Rect[] = [
    SQUARE,
    TOWER_STREET,
    SOUTH_STREET,
    { x0: 62, y0: 19, x1: 67, y1: 22 }, // through the south gate
    { x0: 59, y0: 34, x1: 61, y1: 45 }, // the inn's front, and the nook by its door
    { x0: 52, y0: 44, x1: 58, y1: 45 }, // along the inn's side on the square
    { x0: 28, y0: 71, x1: 31, y1: 74 }, // through the west gate
    { x0: 97, y0: 71, x1: 100, y1: 74 }, // through the east gate
];
const LANES: Rect[] = [
    { x0: 32, y0: 62, x1: 51, y1: 63 }, // west, between the bank and the apothecary
    { x0: 77, y0: 58, x1: 96, y1: 59 }, // east, between Lowe's and Horvik's
    { x0: 32, y0: 45, x1: 51, y1: 50 }, // south-west, between the bank and the inn
    { x0: 68, y0: 34, x1: 85, y1: 44 }, // the strangers' camp
    { x0: 44, y0: 75, x1: 45, y1: 88 }, // the chapel's side door to the churchyard
    { x0: 84, y0: 60, x1: 87, y1: 70 }, // Horvik's yard
    { x0: 84, y0: 75, x1: 85, y1: 92 }, // past Aubury's to the tower's garden and the ruin
    { x0: 41, y0: 40, x1: 42, y1: 44 }, // from the inn's alley door to the south-west lane
    { x0: 43, y0: 64, x1: 43, y1: 70 }, // the alley between the west lane's terrace and the apothecary
];

// Where the hero comes in, from the rifts and on starting out: the dais's west side, with the
// tear before them, the Archmage beside them and the bank's door behind
const SPAWN = { x: 58.5, y: 57.5 };

// A building: a prefab, its quarter turns, its south-west corner, and the shop that's in it
type Building = { prefab: string; turns: number; x: number; y: number; shop?: ShopId; bank?: boolean };

// Doors face the square or their street. A Varrock building's rectangle has a row of street on its
// door's side, which the paving takes.
const BUILDINGS: Building[] = [
    // The square's west side: the bank, and the apothecary across the west lane
    { prefab: "varrock_bank", turns: 1, x: 41, y: 52, bank: true },
    { prefab: "varrock_house", turns: 2, x: 44, y: 64, shop: "apothecary" },
    // Its east side: Horvik's forge, and Lowe's across the east lane
    { prefab: "horviks", turns: 2, x: 76, y: 60, shop: "smith" },
    { prefab: "lowes", turns: 3, x: 76, y: 46, shop: "archery" },
    // The tower street: Zaff's west of the tower, Aubury's east of it, the chapel west of Zaff's,
    // and a house east of Aubury's
    { prefab: "varrock_cottage", turns: 1, x: 46, y: 75, shop: "staffs" },
    { prefab: "aubury", turns: 0, x: 75, y: 75, shop: "jeweller" },
    { prefab: "lumbridge_church", turns: 2, x: 33, y: 75 },
    { prefab: "varrock_terrace", turns: 0, x: 86, y: 75 },
    // The south street: the inn, its front door open on the street and its alley door on the yards
    // west of it, and the barracks by the gate
    { prefab: "blue_moon", turns: 2, x: 42, y: 34 },
    { prefab: "varrock_store", turns: 3, x: 68, y: 26 },
    // Houses on the lanes: the west lane's two, the butcher's and a house on the east lane
    { prefab: "varrock_corner", turns: 1, x: 33, y: 54 },
    { prefab: "varrock_terrace", turns: 3, x: 32, y: 64 },
    { prefab: "butchers", turns: 1, x: 86, y: 44 },
    { prefab: "varrock_corner", turns: 1, x: 88, y: 60 },
];
const TOWER = { prefab: "wizards_tower", turns: 2, x: 56, y: 75 };
// Where the tower's door is, in its own tiles turned twice: on the axis
const TOWER_DOOR = { x: 8.5, y: 3 };

// Where a prefab's street door is, as an edge's middle in local tiles, and which way is out, from
// riftscaper/scripts/prefab-exits.ts; Horvik's arches, which have no door to find, from the walls
// themselves (scripts/locs-in.ts: the wall pieces between them don't block)
type Door = { x: number; y: number; outX: number; outY: number };
const DOORS: Record<string, Record<number, Door[]>> = {
    varrock_bank: { 1: [{ x: 11, y: 5, outX: 1, outY: 0 }] },
    varrock_house: { 2: [{ x: 8, y: 4.5, outX: 1, outY: 0 }] },
    horviks: {
        2: [
            { x: 1, y: 3.5, outX: -1, outY: 0 },
            { x: 1, y: 7.5, outX: -1, outY: 0 },
            { x: 2.5, y: 10, outX: 0, outY: 1 },
            { x: 5.5, y: 10, outX: 0, outY: 1 },
        ],
    },
    lowes: { 3: [{ x: 1, y: 4.5, outX: -1, outY: 0 }] },
    varrock_cottage: { 1: [{ x: 2.5, y: 1, outX: 0, outY: -1 }] },
    aubury: { 0: [{ x: 4.5, y: 1, outX: 0, outY: -1 }] },
    lumbridge_church: {
        2: [
            { x: 5, y: 1, outX: 0, outY: -1 },
            { x: 11, y: 6.5, outX: 1, outY: 0 },
        ],
    },
    varrock_terrace: {
        0: [
            { x: 3.5, y: 1, outX: 0, outY: -1 },
            { x: 1, y: 8.5, outX: -1, outY: 0 },
        ],
        3: [
            { x: 3.5, y: 1, outX: 0, outY: -1 },
            { x: 11, y: 3.5, outX: 1, outY: 0 },
        ],
    },
    // The inn's front door, which stands open, and its alley door; the gap prefab-exits finds in
    // its north side is a bay's recess, not a door
    blue_moon: {
        2: [
            { x: 19, y: 8.5, outX: 1, outY: 0 },
            { x: 1, y: 7.5, outX: -1, outY: 0 },
        ],
    },
    varrock_store: { 3: [{ x: 1, y: 3.5, outX: -1, outY: 0 }] },
    varrock_corner: {
        1: [
            { x: 3.5, y: 1, outX: 0, outY: -1 },
            { x: 3.5, y: 8, outX: 0, outY: 1 },
        ],
    },
    butchers: { 1: [{ x: 5.5, y: 13, outX: 0, outY: 1 }] },
};

// ---- Who stands where ----

// The Archmage on the dais's west side, by the hero's way in, looking into the tear; Reldo by his
// lectern between the spawn and the bank, the first the hero meets, as Deckard Cain is; the two
// rift wardens on the dais's east side, looking into the tear
const ARCHMAGE_AT = { x: 59.5, y: 61.5 };
const RELDO_AT = { x: 56.5, y: 58.5 };
const WARDENS = [
    { x: 70.5, y: 62.5 },
    { x: 70.5, y: 56.5 },
];
// The orrery's south-west tile, three a side, on the axis between the tear and the tower's door;
// Clara by her telescope east of it
const ORRERY_AT = { x: 63, y: 67 };
const CLARA_AT = { x: 67.5, y: 68.5 };
// The banker behind the bank's booths, in its own back row, looking out over the lobby to the door
const BANKER_AT = { x: 44.5, y: 58.5 };
// Fortunato before his tent at the square's south-west corner, looking at the tear, and the gem
// trader behind his stall at its south-east, which faces west across the way in from the gate
const TENT_AT = { x: 53, y: 47 };
const FORTUNATO_AT = { x: 56.5, y: 48.5 };
const GEM_STALL_AT = { x: 71, y: 48 };
const GEM_TRADER_AT = { x: 73.6, y: 49 };
// The strangers' camp: TzHaar-Hur-Tel by his lava pit, the Void Knight behind his stall, Felix
// between his piles of essence, round the stone that fell where they camp
const TZHAAR_AT = { x: 72.5, y: 39.5 };
const VOID_AT = { x: 79, y: 42.5 };
const FELIX_AT = { x: 79.5, y: 36.5 };
const CAMP_STONE = { x: 74, y: 36 };
// The Mercenary Captain at the barracks' door, by the south gate, his hirelings' road the south
// street (content/hirelings.ts)
const CAPTAIN_AT = { x: 67.2, y: 30.5 };

// A thing placed by hand: its id, south-west tile, size as it stands unturned, and quarter turns
type Prop = [id: number, x: number, y: number, sizeX?: number, sizeY?: number, rotation?: number];

// The square, kept clear in the middle: the tear's four binding stones on its dais, the orrery
// and the telescope on its north side, Reldo's lectern, a torch at each corner, and each shop's
// own things against its wall: the apothecary's herb stall, Horvik's quenching barrel between his
// arches, Fortunato's tent and his crates, the gem stall
const SQUARE_PROPS: Prop[] = [
    [BINDING_STONE, 60, 55],
    [BINDING_STONE, 68, 55],
    [BINDING_STONE, 60, 63],
    [BINDING_STONE, 68, 63],
    [ORRERY_LOC, ORRERY_AT.x, ORRERY_AT.y, 3, 3],
    [TELESCOPE, 68, 69],
    [LECTERN, 54, 59, 2, 1],
    [TORCH, 52, 70],
    [TORCH, 76, 70],
    [TORCH, 52, 46],
    [TORCH, 76, 46],
    [HERB_STALL, 52, 65, 2, 1, 1],
    [PLANTER, 52, 52, 2, 1, 1],
    [PLANTER, 52, 60, 2, 1, 1],
    [WATER_BARREL, 76, 65],
    [TENT, TENT_AT.x, TENT_AT.y, 3, 3],
    [CRATE, 56, 46],
    [SACKS, 57, 46],
    // Its counter faces north unturned
    [GEM_STALL, GEM_STALL_AT.x, GEM_STALL_AT.y, 2, 2, 3],
];

// The tower street: Aubury's runes by his door and his stock behind his shop, Zaff's barrels, the
// chapel's saint by its door, and a notice board at the west gate
const TOWER_STREET_PROPS: Prop[] = [
    [MAGIC_STALL, 76, 75],
    // His stock, piled in the corner his shop's walls make behind it, off the way past the tower
    [CRATE, 75, 80],
    [VARROCK_BARREL, 76, 80],
    [STACKED_BARRELS, 77, 80],
    [BARREL, 76, 81],
    [SLATTED_CRATE, 77, 81],
    [BOXES, 77, 82],
    [STACKED_BARRELS, 53, 75],
    [SARADOMIN_STATUE, 40, 75, 2, 1],
    [NOTICE_BOARD, 34, 70],
    [TORCH, 32, 75],
    [TORCH, 96, 75],
];

// The south street: torches at the gate, the inn's barrels in the nook of its front and its brazier
// by its door, the signpost where the street meets the square
const SOUTH_STREET_PROPS: Prop[] = [
    [TORCH, 61, 26],
    [TORCH, 68, 26],
    [BARREL, 59, 37],
    [STACKED_BARRELS, 59, 38],
    [BRAZIER, 62, 40],
    [SIGNPOST, 68, 44, 2, 2],
];

// The strangers' camp: TzHaar-Hur-Tel's lava pit and bench on bare rock, the Void Knight's stall
// and tent, Felix's essence, and the stone they camp round
const CAMP_PROPS: Prop[] = [
    [FALLEN_STONES, CAMP_STONE.x, CAMP_STONE.y, 3, 3],
    [LAVA_PIT, 70, 40, 2, 2],
    [OBSIDIAN_BENCH, 72, 42],
    [BRAZIER, 69, 37],
    [MARKET_STALL, 78, 40, 2, 2, 2],
    [STRIPED_TENT, 82, 40, 3, 3],
    [ELEMENTAL_ESSENCE, 77, 35, 2, 2],
    [CATALYTIC_ESSENCE, 80, 35, 2, 2],
    [SHARD, 71, 35],
    [SHARD, 84, 37],
];

// The barracks' yard by the south gate, fenced: dummies at its west end, targets at its east, hay
// for the targets; and the barracks' own things against its wall
const TRAINING_YARD: Rect = { x0: 79, y0: 27, x1: 95, y1: 33 };
const YARD_PROPS: Prop[] = [
    [DUMMY, 81, 28],
    [DUMMY, 81, 31],
    [DUMMY, 83, 29],
    // The targets' faces look south unturned, so they're turned a quarter to face the archers' line
    [ARCHERY_TARGET, 94, 28, 1, 1, 1],
    [ARCHERY_TARGET, 94, 30, 1, 1, 1],
    [ARCHERY_TARGET, 94, 32, 1, 1, 1],
    [HAY_BALE, 91, 33],
    [HAY_BALE, 92, 33],
    [CRATE, 68, 33],
    [BARREL, 68, 34],
];

// Horvik's yard behind his forge: his coal cart, his anvil out in the air, his water
const HORVIK_YARD_PROPS: Prop[] = [
    [CART, 85, 62, 2, 3],
    [ANVIL, 85, 67],
    [WATER_BARREL, 86, 67],
    [CRATE, 87, 69],
    [STACKED_BARRELS, 87, 70],
];

// The houses' yards and the west and south-west lanes: a well between the houses, a coop and a
// trough, a table and stools in the sun, clutter against the walls
const HOUSE_PROPS: Prop[] = [
    [WELL, 40, 48, 2, 2],
    [COOP, 34, 44, 2, 1],
    [TROUGH, 37, 44, 2, 1],
    [TABLE, 47, 47],
    [STOOL, 46, 47],
    [STOOL, 48, 47],
    [BARREL, 40, 61],
    [CRATE, 41, 61],
    [STACKED_BARRELS, 32, 61],
    [BARREL, 87, 57],
    [CRATE, 88, 57],
    [SACKS, 95, 60],
];

// The walled churchyard behind the chapel: graves among bushes, as real ones stand
const CHURCHYARD: Rect = { x0: 33, y0: 89, x1: 54, y1: 101 };
const CHURCHYARD_PROPS: Prop[] = [
    [GRAVESTONE, 36, 92],
    [GRAVESTONE, 39, 92],
    [GRAVESTONE, 42, 92],
    [GRAVESTONE, 48, 92],
    [GRAVESTONE, 51, 92],
    [GRAVE_MARKER, 36, 95],
    [GRAVE_MARKER, 39, 95],
    [TOMBSTONE, 41, 95, 2, 1],
    [GRAVE_MARKER, 48, 95],
    [GRAVE_MARKER, 51, 95],
    [GRAVESTONE, 36, 98],
    [GRAVE_MARKER, 40, 98],
    [GRAVESTONE, 48, 98],
    [SMALL_BUSH, 45, 96],
    [BUSH, 52, 99, 2, 2],
    [DEAD_TREE, 34, 100, 2, 2],
    [ROSES, 44, 92],
];

// The tower's garden behind it: trees, roses, and the stone that came down through the
// house there, with its shards about it
const RUIN = { prefab: "varrock_corner", turns: 0, x: 84, y: 93 };
const GARDEN_PROPS: Prop[] = [
    [FALLEN_STONE, 87, 95, 2, 2],
    [SHARD, 86, 97],
    [SHARD, 90, 94],
    [SHARD, 89, 99],
    [OAK, 58, 97, 2, 2],
    [WILLOW, 64, 98, 2, 2],
    [OAK, 70, 97, 2, 2],
    [OAK, 77, 99, 2, 2],
    [ROSEBUSH, 61, 95, 2, 1],
    [ROSEBUSH, 67, 95, 2, 1],
    [ROSES, 74, 96],
    [ROSES, 80, 95],
    [BUSH, 94, 99, 2, 2],
    [TREE, 92, 87, 2, 2],
    [TREE, 81, 88, 2, 2],
    // The yard west of the inn, and its kitchen garden behind it
    [OAK, 36, 30, 2, 2],
    [TREE, 38, 40, 2, 2],
    [BUSH, 34, 38, 2, 2],
    [ROSEBUSH, 56, 33, 2, 1],
];
// The inn's kitchen garden behind it, between its back wall and the city's: a bed of crops in box
// hedges
const CROP_ROWS: [y: number, crop: number][] = [
    [28, 0],
    [29, 1],
    [30, 2],
];
const CROP_X = { x0: 47, x1: 57 };

// Outside the south gate: the field west of the road and the pasture east of it, both fenced,
// with a signpost and a cart by the gate
const FIELD: Rect = { x0: 44, y0: 3, x1: 56, y1: 12 };
const PASTURE: Rect = { x0: 73, y0: 3, x1: 85, y1: 12 };
const APPROACH_PROPS: Prop[] = [
    [SIGNPOST, 59, 15, 2, 2],
    [CART, 69, 14, 2, 3, 1],
    [SCARECROW, 50, 8],
    [HAYSTACK, 45, 10, 2, 2],
    [TROUGH, 79, 6, 2, 1],
    [HAY_BALE, 75, 10],
    [HAY_BALE, 76, 10],
    [HAYSTACK, 82, 4, 2, 2],
];
const FIELD_ROWS: [y: number, crop: number][] = [
    [4, 0],
    [6, 1],
    [8, 2],
];
const FIELD_X = { x0: 47, x1: 54 };

// Box hedges either side of the inn's bed, a tile at a time
const HEDGES: Rect[] = [
    { x0: 46, y0: 27, x1: 58, y1: 27 },
    { x0: 46, y0: 31, x1: 58, y1: 31 },
];

// Walls on tile edges: the low stone wall round the churchyard, with its gate from the chapel's
// path; Varrock's fence round the training yard, open to the
// barracks; Lumbridge's fence round the field and the pasture, with their gates on the road
type Side = "south" | "north" | "west" | "east";
type EdgeWall = { id: number; rect: Rect; sides?: Side[]; gap?: (x: number, y: number) => boolean };
const EDGE_WALLS: EdgeWall[] = [
    { id: LOW_WALL, rect: CHURCHYARD, sides: ["south", "east"], gap: (x, y) => (x === 44 || x === 45) && y === CHURCHYARD.y0 },
    { id: FENCE, rect: TRAINING_YARD, gap: (x) => x === TRAINING_YARD.x0 },
    { id: FIELD_FENCE, rect: FIELD, gap: (x, y) => x === FIELD.x1 && y >= 7 && y <= 8 },
    { id: FIELD_FENCE, rect: PASTURE, gap: (x, y) => x === PASTURE.x0 && y >= 7 && y <= 8 },
];

// The wizards: in the tower's rooms, at its door, and one by the orrery; in tower tiles they're
// the tower's own (its south-west corner added), and the rest in arena tiles
const WIZARDS: { x: number; y: number; wander: number; inTower?: boolean }[] = [
    { x: 9, y: 7, wander: 1.5, inTower: true },
    { x: 5.5, y: 12.5, wander: 1.5, inTower: true },
    { x: 12.5, y: 12, wander: 1.5, inTower: true },
    { x: 61.5, y: 73, wander: 2 },
    { x: 70.5, y: 73, wander: 2 },
];
// The guards: two inside the south gate, one at each side gate, looking out
const GUARDS: { x: number; y: number; faceX: number; faceY: number }[] = [
    { x: 62.5, y: 27.5, faceX: 62.5, faceY: 18 },
    { x: 66.5, y: 27.5, faceX: 66.5, faceY: 18 },
    { x: 33.5, y: 75.5, faceX: 26, faceY: 72.5 },
    { x: 95.5, y: 70.5, faceX: 102, faceY: 72.5 },
];
// The folk: where each stands, which way they look, and how far they stray
const FOLK_AT: Record<Exclude<FolkId, "chronicler" | "apprentice">, { x: number; y: number; faceX: number; faceY: number; wander: number }> = {
    crier: { x: 64.5, y: 48.5, faceX: 64.5, faceY: 55, wander: 2 },
    priest: { x: 38, y: 73.5, faceX: 38, faceY: 70, wander: 1 },
    farmer: { x: 51.5, y: 6.5, faceX: 50, faceY: 6, wander: 2 },
    townsman: { x: 56.5, y: 38.5, faceX: 54, faceY: 38.5, wander: 2 },
    townswoman: { x: 59.5, y: 50.5, faceX: 64.5, faceY: 55, wander: 3 },
    carter: { x: 92.5, y: 73, faceX: 100, faceY: 73, wander: 2 },
    goodwife: { x: 42.5, y: 47.5, faceX: 40, faceY: 49, wander: 2 },
};

// ---- Building it ----

export type City = {
    squares: CustomMapSquares;
    // The arena, in world tiles
    baseX: number;
    baseY: number;
    sizeX: number;
    sizeY: number;
    spawn: { x: number; y: number };
    // Who's where, and the portal, in world tiles
    plan: TownPlan;
    // What gives light: torches and braziers; the fallen stones, whose runes glow; and the shards
    // of essence
    torches: { x: number; y: number }[];
    runes: { x: number; y: number }[];
    shards: { x: number; y: number }[];
};

export function citySettings(): GeneratorSettings {
    return {
        ...DEFAULT_SETTINGS,
        seed: CITY_SEED,
        squaresX: CITY_SQUARES,
        squaresY: CITY_SQUARES,
        biome: "meadow",
        boundary: "forest",
        hills: 0.12,
        mountains: 0,
        rivers: 0,
        lakes: 0,
        ponds: 0,
        roads: 0,
        buildings: 0,
        towns: 0,
        sites: 0,
        ruins: 0,
        landmarks: 0,
        waymarkers: 0,
        trees: 0.35,
        props: 0.25,
        flowers: 0.6,
        spawnX: 0.5,
        spawnY: 0.3,
    };
}

// The generator's land as a Ground to build on
function toGround(grid: TileGrid): Ground {
    const ground = new Ground(grid.sizeX, grid.sizeY);
    grid.levels.forEach((level, i) => {
        const to = ground.grid.levels[i];
        to.heights.set(level.heights);
        to.underlays.set(level.underlays);
        to.overlays.set(level.overlays);
        to.shapes.set(level.shapes);
        to.rotations.set(level.rotations);
        to.flags.set(level.flags);
    });
    ground.grid.locs = grid.locs.slice();
    return ground;
}

// The grid tile of an arena tile
const ARENA = MARGIN * MAP_SQUARE_SIZE;
const gx = (x: number) => x + ARENA;

function inRect(r: Rect, x: number, y: number): boolean {
    return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
}

// The doors of a building, in arena tiles
function doorsOf(b: { prefab: string; turns: number; x: number; y: number }): Door[] {
    return (DOORS[b.prefab]?.[b.turns] ?? []).map((d) => ({ ...d, x: b.x + d.x, y: b.y + d.y }));
}

function overlaps(a: Rect, b: Rect): boolean {
    return a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
}

// The tiles outside a door: two deep, and the door's width and a tile each side
function doorstep(door: Door): Rect {
    if (door.outX !== 0) {
        const x0 = door.outX > 0 ? door.x : door.x - 2;
        return { x0, y0: Math.floor(door.y - 1.5), x1: x0 + 1, y1: Math.floor(door.y + 1) };
    }
    const y0 = door.outY > 0 ? door.y : door.y - 2;
    return { x0: Math.floor(door.x - 1.5), y0, x1: Math.floor(door.x + 1), y1: y0 + 1 };
}

// How far a door's way runs out to meet a street or a lane
const DOOR_REACH = 6;

// The way from a door to what it opens on: its step, run out as far as the first street or lane it
// meets, and laid as what it meets, cobbles to a street and earth to a lane, so that no step of
// stone lies on its own. A door that meets neither is a mistake in the plan.
function doorWay(door: Door): { way: Rect; paved: boolean } {
    const step = doorstep(door);
    for (let reach = 0; reach <= DOOR_REACH; reach++) {
        const way = {
            x0: step.x0 + Math.min(0, door.outX * reach),
            y0: step.y0 + Math.min(0, door.outY * reach),
            x1: step.x1 + Math.max(0, door.outX * reach),
            y1: step.y1 + Math.max(0, door.outY * reach),
        };
        if (STREETS.some((r) => overlaps(r, way))) {
            return { way, paved: true };
        }
        if (LANES.some((r) => overlaps(r, way))) {
            return { way, paved: false };
        }
    }
    throw new Error(`The door at ${door.x}, ${door.y} opens on no street or lane within ${DOOR_REACH} tiles`);
}

// Doors that stand open in the real world, which stay: the kit leaves every door out, since a shut
// one blocks the way, but an open one lies back against its wall (loc-info: its action is Close).
// The inn's front door, Lowe's, the butcher's, the apothecary's and Aubury's are.
const OPEN_DOORS = [11774, 11778];
// How far a building's ground eases into what's round it, as the kit's own stamp has it
const BUILDING_FEATHER = 4;

// A field over the grid's corners in an area round a point, for painting shapes: positive inside,
// by how far, in tiles, from the corner's offsets from the point, east and north, either way
function fieldAbout(at: { x: number; y: number }, reach: number, value: (dx: number, dy: number) => number) {
    const area = { x0: gx(Math.floor(at.x - reach)), y0: gx(Math.floor(at.y - reach)), x1: gx(Math.ceil(at.x + reach)), y1: gx(Math.ceil(at.y + reach)) };
    const cornersX = area.x1 - area.x0 + 1;
    const cornersY = area.y1 - area.y0 + 1;
    const field = new Float32Array(cornersX * cornersY);
    for (let cy = 0; cy < cornersY; cy++) {
        for (let cx = 0; cx < cornersX; cx++) {
            field[cx + cy * cornersX] = value(Math.abs(area.x0 + cx - gx(at.x)), Math.abs(area.y0 + cy - gx(at.y)));
        }
    }
    return { field, area };
}

export function buildCityGrid(context: BuildContext): TileGrid {
    const settings = citySettings();
    const error = getSettingsError(settings);
    if (error) {
        throw new Error(error);
    }
    const ground = toGround(generateMapDetail(settings, context).grid);
    const { sizeX } = ground;
    const level0 = ground.level0;
    const cleared = [TOWN, SOUTH_APPROACH, WEST_ROAD, EAST_ROAD];
    const isCleared = (x: number, y: number) => cleared.some((r) => inRect(r, x - ARENA, y - ARENA));

    // Clear the city's ground: no trees, rocks, paths or flowers, nothing blocked
    ground.grid.locs = ground.grid.locs.filter((loc) => !isCleared(loc.x, loc.y));
    const clear = new Uint8Array(ground.sizeX * ground.sizeY);
    for (const r of cleared) {
        for (let y = gx(r.y0); y <= gx(r.y1); y++) {
            for (let x = gx(r.x0); x <= gx(r.x1); x++) {
                clear[x + y * sizeX] = 1;
            }
        }
    }
    ground.clearOverlay(clear);
    for (let i = 0; i < clear.length; i++) {
        if (clear[i]) {
            level0.flags[i] &= ~TILE_BLOCKED;
        }
    }

    // Shape the ground: flat under the town, standing a little over the meadow's own level and
    // easing into it round the edges, with the crater the fall left round the tear (heights under
    // the ground's own are none: the town stands the crater's depth over its floor)
    const shapedX = SHAPED.x1 - SHAPED.x0 + 1;
    const shapedY = SHAPED.y1 - SHAPED.y0 + 1;
    let landSum = 0;
    for (let y = 0; y <= shapedY; y++) {
        for (let x = 0; x <= shapedX; x++) {
            landSum += ground.getHeight(gx(SHAPED.x0) + x, gx(SHAPED.y0) + y);
        }
    }
    const landMean = landSum / ((shapedX + 1) * (shapedY + 1));
    const shaped = createTileGrid(shapedX, shapedY);
    for (let cy = 0; cy <= shapedY; cy++) {
        for (let cx = 0; cx <= shapedX; cx++) {
            const d = Math.hypot(SHAPED.x0 + cx - TEAR.x, SHAPED.y0 + cy - TEAR.y) / CRATER_RADIUS;
            shaped.levels[0].heights[cx + cy * (shapedX + 1)] = CRATER_DEPTH - (d < 1 ? Math.round(CRATER_DEPTH * (1 - d * d)) : 0);
        }
    }
    ground.stamp(shaped, gx(SHAPED.x0), gx(SHAPED.y0), {
        floor: () => false,
        feather: SHAPED_FEATHER,
        flatten: false,
        keepUnderlays: true,
        height: Math.max(4, Math.round(landMean - 16 - CRATER_DEPTH)),
        anchor: 0,
    });
    ground.reserved.fill(0);

    const mask = () => new Uint8Array(ground.sizeX * ground.sizeY);
    const fill = (m: Uint8Array, r: Rect) => {
        for (let y = r.y0; y <= r.y1; y++) {
            for (let x = r.x0; x <= r.x1; x++) {
                m[gx(x) + gx(y) * sizeX] = 1;
            }
        }
    };
    // Earth under what's paved and trodden, which shows where a stone's edge cuts a tile, and dark
    // earth a tile round it, which blends the paving into the grass. Underlays blend over a few
    // tiles, so the cobbles' grey goes under all of the square and the streets, not just their edges.
    const earth = (m: Uint8Array, under: number) => {
        for (let i = 0; i < m.length; i++) {
            if (!m[i]) {
                continue;
            }
            const x = i % sizeX;
            const y = Math.floor(i / sizeX);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const j = x + dx + (y + dy) * sizeX;
                    if (ground.inside(x + dx, y + dy) && !m[j]) {
                        level0.underlays[j] = TRAIL;
                    }
                }
            }
            level0.underlays[i] = under;
        }
    };

    // Each door's way to its street or lane, but for where it would run under another building
    // The buildings, each cut from the world once and turned, without what's its neighbour's
    const cuts = new Map<string, TileGrid>();
    const cutOf = (b: { prefab: string; turns: number }): TileGrid => {
        const key = `${b.prefab}:${b.turns}`;
        let cut = cuts.get(key);
        if (!cut) {
            const def = CITY_PREFABS[b.prefab];
            const prefab = loadPrefab(context, def);
            const { neighbour } = def;
            if (neighbour) {
                prefab.locs = prefab.locs.filter((loc) => !inRect(neighbour, def.worldX + loc.x, def.worldY + loc.y));
            }
            cut = rotatePrefab(prefab, b.turns, context.locs);
            cuts.set(key, cut);
        }
        return cut;
    };
    const footprint = (b: { prefab: string; turns: number; x: number; y: number }): Rect => {
        const { sizeX: w, sizeY: h } = cutOf(b);
        return { x0: b.x, y0: b.y, x1: b.x + w - 1, y1: b.y + h - 1 };
    };
    const standing = [...BUILDINGS, TOWER, RUIN];
    const roads = mask();
    const paved = mask();
    for (const b of standing) {
        const doors = b === TOWER ? [{ x: TOWER.x + TOWER_DOOR.x, y: TOWER.y + TOWER_DOOR.y, outX: 0, outY: -1 }] : b === RUIN ? [] : doorsOf(b);
        const others = standing.filter((o) => o !== b).map(footprint);
        for (const door of doors) {
            const { way, paved: stone } = doorWay(door);
            for (let y = way.y0; y <= way.y1; y++) {
                for (let x = way.x0; x <= way.x1; x++) {
                    if (!others.some((r) => inRect(r, x, y))) {
                        fill(stone ? paved : roads, { x0: x, y0: y, x1: x, y1: y });
                    }
                }
            }
        }
    }

    // The roads out of the gates, and the lanes and yards of trodden earth
    [SOUTH_ROAD, WEST_ROAD, EAST_ROAD, ...LANES].forEach((r) => fill(roads, r));
    earth(roads, TRAIL);
    ground.paintOverlay(roads, ROAD, false);

    // The square and the streets in cobbles
    STREETS.forEach((r) => fill(paved, r));
    earth(paved, STONE_EARTH);
    ground.paintOverlay(paved, COBBLES, false);

    // The tear's dais, laid over the square's cobbles: the crater's rock and its heart, then the
    // dais's flagstones round them, which take the mouth's slanted tiles. Only the tear's own tile
    // is blocked, so that the hero can walk down to within the portal's reach.
    const dais = mask();
    fill(dais, DAIS);
    ground.clearOverlay(dais);
    for (let i = 0; i < dais.length; i++) {
        if (dais[i]) {
            level0.underlays[i] = CRATER_EARTH;
        }
    }
    const rock = fieldAbout(TEAR, MOUTH + 1, (dx, dy) => -Math.max(dx - MOUTH, dy - MOUTH, dx + dy - MOUTH_SLANT));
    ground.paintField(rock.field, CRATER_ROCK, false, undefined, rock.area);
    const heart = fieldAbout(TEAR, HEART_RADIUS + 1, (dx, dy) => HEART_RADIUS - Math.hypot(dx, dy));
    ground.paintField(heart.field, BLACK_ROCK, false, undefined, heart.area);
    const stones = fieldAbout(TEAR, DAIS_REACH + 1, (dx, dy) => Math.min(DAIS_REACH + EDGE - Math.max(dx, dy), Math.max(dx - MOUTH, dy - MOUTH, dx + dy - MOUTH_SLANT)));
    ground.paintField(stones.field, DAIS_STONE, false, undefined, stones.area);
    level0.flags[gx(Math.floor(TEAR.x)) + gx(Math.floor(TEAR.y)) * sizeX] |= TILE_BLOCKED;

    // The buildings and the tower, on the ground as shaped, with their open doors
    for (const b of [...BUILDINGS, TOWER]) {
        ground.stamp(cutOf(b), gx(b.x), gx(b.y), {
            floor: "footprint",
            feather: BUILDING_FEATHER,
            flatten: true,
            keepHeights: true,
            keepUnderlays: true,
            skipLoc: (loc) => isDoor(context, loc) && !OPEN_DOORS.includes(loc.id),
        });
    }
    // The house in the tower's garden the stone came down through
    const kit = new PrefabKit(context, CITY_PREFABS);
    const ruinRoll = createRng(CITY_SEED + 100);
    kit.stampRuin(ground, RUIN.prefab, RUIN.turns, gx(RUIN.x), gx(RUIN.y), ruinRoll, true);

    // The wall, with the heights done and everything it keeps off placed
    placeCityWall(
        ground,
        CITY_WALLS.varrock,
        { x0: gx(WALL.x0), y0: gx(WALL.y0), x1: gx(WALL.x1), y1: gx(WALL.y1) },
        GATES.map((g) => ({ side: g.side, at: gx(g.at) })),
    );

    // What stands about the city, by hand
    const put = (id: number, x: number, y: number, sizeX = 1, sizeY = 1, rotation = 0) => {
        const loc: PlacedLoc = { id, type: 10, rotation, level: 0, x: gx(x), y: gx(y) };
        const turned = rotation & 1;
        ground.place(loc, turned ? sizeY : sizeX, turned ? sizeX : sizeY);
    };
    const putAll = (props: Prop[]) => {
        for (const [id, x, y, sizeX, sizeY, rotation] of props) {
            put(id, x, y, sizeX, sizeY, rotation);
        }
    };
    // A wall piece on one edge of a tile
    const post = (id: number, x: number, y: number, rotation: number) => {
        ground.grid.locs.push({ id, type: LOC_WALL, rotation, level: 0, x: gx(x), y: gx(y) });
        ground.reserved[gx(x) + gx(y) * sizeX] = 1;
    };

    for (const props of ALL_PROPS) {
        putAll(props);
    }
    for (const [rows, xs, ids] of [
        [CROP_ROWS, CROP_X, CROPS],
        [FIELD_ROWS, FIELD_X, CROPS],
    ] as const) {
        for (const [y, crop] of rows) {
            for (let x = xs.x0; x <= xs.x1; x++) {
                put(ids[crop], x, y);
            }
        }
    }
    for (const r of HEDGES) {
        for (let y = r.y0; y <= r.y1; y++) {
            for (let x = r.x0; x <= r.x1; x++) {
                put(HEDGE, x, y);
            }
        }
    }
    // Walls and fences on tile edges along the sides of their rectangles
    for (const w of EDGE_WALLS) {
        const { x0, y0, x1, y1 } = w.rect;
        const sides = w.sides ?? ["south", "north", "west", "east"];
        const fencing = (x: number, y: number, rotation: number) => {
            if (!w.gap?.(x, y)) {
                post(w.id, x, y, rotation);
            }
        };
        for (let x = x0; x <= x1; x++) {
            if (sides.includes("south")) {
                fencing(x, y0, WALL_SOUTH);
            }
            if (sides.includes("north")) {
                fencing(x, y1, WALL_NORTH);
            }
        }
        for (let y = y0; y <= y1; y++) {
            if (sides.includes("west")) {
                fencing(x0, y, WALL_WEST);
            }
            if (sides.includes("east")) {
                fencing(x1, y, WALL_EAST);
            }
        }
    }

    // Small things scattered over the gardens, where there's room for them
    const rng = createRng(CITY_SEED + 200);
    const placer = new Placer(ground, { rng, locs: context.locs });
    for (const g of GARDENS) {
        const area = (g.x1 - g.x0 + 1) * (g.y1 - g.y0 + 1);
        const wanted = Math.round(area / 40);
        for (let i = 0, placed = 0; i < wanted * 8 && placed < wanted; i++) {
            const id = GARDEN_SCATTER[Math.floor(rng() * GARDEN_SCATTER.length)];
            const x = g.x0 + Math.floor(rng() * (g.x1 - g.x0 + 1));
            const y = g.y0 + Math.floor(rng() * (g.y1 - g.y0 + 1));
            const [w, h] = placer.getSize(id);
            if (ground.isClear(gx(x) - 1, gx(y) - 1, w + 2, h + 2) && placer.solid(id, gx(x), gx(y))) {
                placed++;
            }
        }
    }

    // Last of all, the city's own ground dressed, as the land round it already is, but for the
    // stone, which is kept swept, and the crater, where nothing grows
    const before = ground.grid.locs.length;
    dressGround(ground, { seed: CITY_SEED + 300, density: 0.8, biomeDecor: () => MEADOW_DECOR });
    const swept = new Set([COBBLES, DAIS_STONE, CRATER_ROCK, BLACK_ROCK]);
    const dressed = ground.grid.locs
        .slice(before)
        .filter((loc) => isCleared(loc.x, loc.y) && !inRect(DAIS, loc.x - ARENA, loc.y - ARENA) && !swept.has(level0.overlays[loc.x + loc.y * sizeX]));
    ground.grid.locs.length = before;
    ground.grid.locs.push(...dressed);
    return ground.grid;
}

// Where the garden's scattered small things go: the quiet corners, kept off the streets
const GARDENS: Rect[] = [
    { x0: 56, y0: 95, x1: 82, y1: 101 },
    { x0: 76, y0: 86, x1: 96, y1: 92 },
    { x0: 32, y0: 33, x1: 39, y1: 43 },
];
const GARDEN_SCATTER = [BUSH, SMALL_BUSH, ROSES, ROSEBUSH];

const ALL_PROPS = [SQUARE_PROPS, TOWER_STREET_PROPS, SOUTH_STREET_PROPS, CAMP_PROPS, YARD_PROPS, HORVIK_YARD_PROPS, HOUSE_PROPS, CHURCHYARD_PROPS, GARDEN_PROPS, APPROACH_PROPS];

// The recipe, for the scripts and the squares
export function cityRecipe(): MapRecipe {
    const squares = CITY_SQUARES + MARGIN * 2;
    return {
        id: "runefall_city",
        mapX: CITY_MAP_X,
        mapY: CITY_MAP_Y,
        squaresX: squares,
        squaresY: squares,
        margin: MARGIN,
        spawn: { x: Math.floor(gx(SPAWN.x)), y: Math.floor(gx(SPAWN.y)) },
        build: buildCityGrid,
    };
}

// Who's in the city and where the portal opens, in world tiles, and what gives light
export function cityPlan(): Pick<City, "plan" | "spawn" | "torches" | "runes" | "shards"> {
    const originX = CITY_MAP_X * MAP_SQUARE_SIZE + ARENA;
    const originY = CITY_MAP_Y * MAP_SQUARE_SIZE + ARENA;
    const at = (x: number, y: number) => ({ x: originX + x, y: originY + y });
    const people: PersonPlan[] = [];
    const facing = (from: { x: number; y: number }, to: { x: number; y: number }) => yawFromVector(to.x - from.x, to.y - from.y);
    const shop = (id: ShopId, spot: { x: number; y: number }, face: { x: number; y: number }) => {
        const def = SHOPS[id];
        people.push({ kind: "shop", shop: id, npcId: def.npcId, name: def.keeper, ...at(spot.x, spot.y), yaw: facing(spot, face), wander: 0 });
    };
    // Each shopkeeper stands just inside their first door, looking out of it
    for (const b of BUILDINGS) {
        if (!b.shop) {
            continue;
        }
        const door = doorsOf(b)[0];
        const spot = { x: door.x - door.outX * 1.6, y: door.y - door.outY * 1.6 };
        shop(b.shop, spot, { x: door.x + door.outX * 4, y: door.y + door.outY * 4 });
    }
    // The stalls' keepers, and the strangers
    shop("general", FORTUNATO_AT, TEAR);
    shop("gems", GEM_TRADER_AT, { x: GEM_TRADER_AT.x - 4, y: GEM_TRADER_AT.y });
    shop("tzhaar", TZHAAR_AT, { x: 71, y: 41 });
    shop("void", VOID_AT, { x: VOID_AT.x, y: VOID_AT.y - 4 });
    shop("felix", FELIX_AT, { x: FELIX_AT.x - 4, y: FELIX_AT.y });
    people.push({
        kind: "captain",
        npcId: HIRELING.captain.npcId,
        name: HIRELING.captain.name,
        title: HIRELING.captain.title,
        ...at(CAPTAIN_AT.x, CAPTAIN_AT.y),
        yaw: facing(CAPTAIN_AT, { x: 62, y: CAPTAIN_AT.y }),
        wander: 0,
    });
    people.push({
        kind: "banker",
        npcId: BANKER.npcId,
        name: BANKER.name,
        ...at(BANKER_AT.x, BANKER_AT.y),
        yaw: facing(BANKER_AT, { x: BANKER_AT.x + 4, y: BANKER_AT.y }),
        wander: 0,
    });
    people.push({
        kind: "archmage",
        npcId: ARCHMAGE.npcId,
        name: ARCHMAGE.name,
        ...at(ARCHMAGE_AT.x, ARCHMAGE_AT.y),
        yaw: facing(ARCHMAGE_AT, TEAR),
        wander: 0,
    });
    WIZARDS.forEach((w, i) => {
        const x = w.inTower ? TOWER.x + w.x : w.x;
        const y = w.inTower ? TOWER.y + w.y : w.y;
        people.push({ kind: "wizard", npcId: WIZARD_NPCS[i % WIZARD_NPCS.length], name: "Wizard", ...at(x, y), yaw: 0, wander: w.wander });
    });
    GUARDS.forEach((g, i) => {
        people.push({
            kind: "guard",
            npcId: GUARD_NPCS[i % GUARD_NPCS.length],
            name: `${CITY_NAME} guard`,
            ...at(g.x, g.y),
            yaw: facing(g, { x: g.faceX, y: g.faceY }),
            wander: 0,
        });
    });
    WARDENS.forEach((w, i) => {
        people.push({
            kind: "guard",
            npcId: GUARD_NPCS[(i + 1) % GUARD_NPCS.length],
            name: "Rift warden",
            title: "Watches the tear",
            lines: WARDEN_LINES,
            ...at(w.x, w.y),
            yaw: facing(w, TEAR),
            wander: 0,
        });
    });
    const folkAt: Record<FolkId, { x: number; y: number; faceX: number; faceY: number; wander: number }> = {
        ...FOLK_AT,
        chronicler: { ...RELDO_AT, faceX: SPAWN.x, faceY: SPAWN.y - 1, wander: 0 },
        apprentice: { ...CLARA_AT, faceX: TEAR.x, faceY: TEAR.y, wander: 0 },
    };
    for (const id of Object.keys(FOLK) as FolkId[]) {
        const def = FOLK[id];
        const spot = folkAt[id];
        people.push({
            kind: "folk",
            folk: id,
            npcId: def.npcId,
            name: def.name,
            title: def.title,
            lines: def.lines,
            ...at(spot.x, spot.y),
            yaw: facing(spot, { x: spot.faceX, y: spot.faceY }),
            wander: spot.wander,
        });
    }
    // What gives light: the torches and braziers, as placed; the fallen stones' runes; the shards
    const middle = (p: Prop) => at(p[1] + (p[3] ?? 1) / 2, p[2] + (p[4] ?? 1) / 2);
    const all = ALL_PROPS.flat();
    return {
        plan: { portal: at(TEAR.x, TEAR.y), people, orrery: at(ORRERY_AT.x + 1.5, ORRERY_AT.y + 1.5) },
        spawn: at(SPAWN.x, SPAWN.y),
        torches: all.filter((p) => p[0] === TORCH || p[0] === BRAZIER).map(middle),
        runes: all.filter((p) => p[0] === BINDING_STONE || p[0] === FALLEN_STONE || p[0] === FALLEN_STONES).map(middle),
        shards: all.filter((p) => p[0] === SHARD).map(middle),
    };
}

// Builds the city's land and squares. A second or two, on the main thread.
export function generateCity(context: BuildContext): City {
    const recipe = cityRecipe();
    const size = CITY_SQUARES * MAP_SQUARE_SIZE;
    return {
        squares: buildRecipeSquares(recipe, context),
        baseX: CITY_MAP_X * MAP_SQUARE_SIZE + ARENA,
        baseY: CITY_MAP_Y * MAP_SQUARE_SIZE + ARENA,
        sizeX: size,
        sizeY: size,
        ...cityPlan(),
    };
}
