# Planned rifts: how Diablo and Path of Exile shape their maps, and ours

A rift was first an open field: ScapeRune's land corner to corner, two thirds of it walkable,
trees scattered evenly over it, the camp in one corner and the guardian at the far one. It was big
enough, but it had no shape. You walked in a straight line and met monsters spread evenly
everywhere. Diablo's and Path of Exile's maps are the same size, but they are built differently,
and this is what was learnt from them and what was built from it. Every rift is planned now; the
open land is still there to look at in development (section 4).

## 1. What the research found

Two studies, one of the Diablo games and one of Path of Exile's, read the games' data tables, the
reverse-engineered generators (D2MOO, devilutionX, poe_data_tools), developers' posts, and the
community's map guides and tier lists, and looked at each layout image they cite. The numbers:

**Scale.** A Diablo II wilderness field is 80×80 tiles in cells of 8×8, each cell about a screen;
the field is about 85 screens of ground and about 30 seconds to run across. Our 192×192 arena at
27×16 tiles a screen is also about 85 screens and about 35 seconds. A Path of Exile screen at its
base speed is about 4.5 seconds across; ours is about 4.9. **Our maps are already the right size.
What they lack is structure.**

**The shapes players like** (Path of Exile's community layout ratings, Diablo III's rift tier lists, Diablo IV's patch history):

- *Linear strips* (Strand, Beach, Jungle Valley): one band a screen or two wide, walls both
  sides, the boss at the far end, no coming back. Rated best.
- *Loops round a blocker* (Dunes, Mesa; Diablo III's Festering Woods, a loop of wide lanes round
  clumps of trees): no backtracking, and you end where you started or in the middle.
- *Open walled fields with obstacles* (Diablo II's whole Act 1; Cemetery): open ground inside a
  border of cliffs or treeline, broken by blocks about a screen across (fenced fields, cottages,
  stands of trees, ponds), with **a dirt road** from the entrance to the exit that the points of
  interest are placed beside.
- *Hub and arms* (the Arcane Sanctuary): four arms off a middle, three ending in dead ends with
  a chest, one with the boss, over a void.

**The shapes players hate**: single-file corridors (Diablo II's Maggot Lair is the classic
example, and Path of Exile 2 players asked for hallways twice as wide), mazes, dead ends with
nothing in them, the exit next to the entrance, objectives off the main path, and long empty
stretches. GGG cut dead ends, shrank maps, and moved bosses to the far end in Path of Exile 2's
patches; Diablo IV moved objectives onto the main path and raised its density.

**Density.** A Path of Exile map has about 500 monsters, roughly 50 to 100 packs: two or three
packs a screen of lane. Diablo II spaces packs of 3 to 6 half a screen to a screen apart along
and beside the road.

**Dead ends pay.** Diablo II's false tombs and Arcane Sanctuary arms each end in a chest and an
elite; Path of Exile 2's side canyons end in a reward and a portal back.

**Edges are scenery.** Every wall is something you can see you can't cross: a cliff, a treeline,
the shore, a drop into the void. No invisible walls.

**How they're generated.** Diablo II's outdoors is an 8×8-tile cell grid stamped in passes
(border, cliffs, river, cave mouth, then a road random-walked from each exit to a hub, then the
waypoint, five shrines, and set pieces next to the road). Its dungeons grow fixed-size rooms as a
tree and merge about half the neighbouring rooms into loops. Path of Exile places nodes for the
entrance, exit and boss, joins them with typed edges, and lays tiles along them. Each area has a
handful of hand-written graphs of beats, and the rooms and tiles inside them are random. Both
games use a fixed structure with random filling.

Sources, among others: D2MOO (`DrlgOutWild.cpp`, `DrlgMaze.cpp`), Levels.txt/LvlMaze.txt via
blizzhackers' d2data, maxroll's Diablo II map reading and Diablo III rift tier list, Boris the
Brave's write-up of Diablo 1's generator, GGG's Dan_GGG on the Cemetery bug and its graph editor,
poedb's per-map flags and area topologies, Maps of Exile's layout ratings, the not_Shorex monster
count sheet, Path of Exile 2's 0.2 and 0.3 patch notes.

## 2. What we build

A planned rift (`world/riftLayout.ts`) is drawn before its land is made: nodes (the camp,
arenas, bends, nooks, a hub, the guardian's arena) joined by lanes, rasterised with noisy edges
into tiles that are walked (`open`) and tiles that are not, some of which fall away (`deep`). It
is pure data from a seed and needs no cache. Five kinds the biomes pick from, and two pinnacles'
own:

| Kind  | After | What it is |
| ----- | ----- | ---------- |
| trail | Diablo II's wilderness and Path of Exile's linear maps | A self-avoiding walk of 9 to 12 cells over a 4×4 grid, corner to corner: arenas and bends at the cells, wide lanes between, a second way round now and then (never past the guardian), and nooks into the cells it left out |
| loop  | Dunes, Festering Woods | A ring of eight nodes round a heart of water, lava, void or high ground, the guardian on an island in the heart with one causeway from the ring's far side, nooks off the ring outwards |
| arms  | The Arcane Sanctuary | A hub with four arms; the camp at the end of one, the guardian round a hook at the end of the opposite one, a nook at the end of each of the other two |
| isles | The Great Marsh, Path of Exile's Atoll | Islands about 45 tiles apart joined by a spanning tree of causeways and a few more for loops; the guardian on the island furthest away along them, islands at the end of one causeway made nooks |
| field | Diablo II's Act 1 and the desert | Open ground inside a ragged edge on a 6×6 grid of screen-sized cells: about four in five of the cells off a winding walk become clumps of two or three ovals, and a third of the cells on it get a small block for the road to go round |
| nexus | The Tombs of Amascut's Nexus | The Tombs' alone: a hall in the middle, the guardian's arena, the camp in an alcove off it towards its corner, and four chambers evenly round it down short lanes, one for each path |
| pit   | The Fortis Colosseum | The Colosseum's alone: the nexus's hall with no chambers, round sand 24 to 27 tiles in radius, the camp in an alcove off it |

**Sizes**, from the research (`WAY` and the rest at the top of `riftLayout.ts`): lanes on the
way are 15 to 21 tiles across (two thirds of a screen; a narrows of 10 to 12 now and then, as an
accent), arenas 14 to 19 tiles in radius, the guardian's 17 to 20, side lanes and causeways 10 to
13, an island 13 to 17. Two nodes that aren't joined keep a wall at least 8 tiles thick between
them. Trails leave 27% to 41% of the arena open, loops 24% to 29%, arms about 21%, isles 25% to
31%, fields 42% to 60%.
The guardian's arena is the far end (a nook further than it goes, and a trail's second way round
must leave enough of the way after it).

**Biomes pick their kinds and their edges** (`EDGES` in `world/riftShape.ts`). Meadows, the snow,
the desert and autumn are mostly fields, as Diablo II's wilderness is. The swamp, ash and
tropical isles are mostly isles. The Abyssal Rift's astral void gets the arms. What rises
round the lanes is forest in the green biomes and cliffs in the deadlands, snow, ash, desert and
astral ones. What falls away is the biome's water: a meadow's ponds, the swamp's marsh, the ash's
lava, the astral's void of stars.

**On the land** (`shapeRift`), ScapeRune's generator makes the ground with the closed tiles kept
off the map (the engine's `extras.offMap`), so its landmarks, ruins and set pieces land in the
lanes and arenas, and with the deep tiles as its sea (kept a tile off the open ground, so no lane
is narrowed and no causeway cut). Then:

- **Cliffs** rise from each lane's edge in a face three tiles deep, full height north of a lane
  (the face looks south, at the camera), under half that south of one (behind the camera, so it
  never hides the ground), and 0.7 to the sides; rock floor and the biome's rock dressing on the
  face, rolling high ground behind it.
- **Forest** is packed tight on level ground: the biggest trees first, nearest the lanes first
  but shuffled a few tiles' worth so they don't stand in rows, almost every tile within 5 of a lane
  that has room, thinner further in, and soft growth on the open ground at the edge.
- **The road.** Once the land's built, a road is laid from the camp along the route to the
  guardian: Dijkstra's over the open ground, a step dearer the nearer the walls, the water and the
  landmarks, so it keeps to the middle of a lane and goes round a ruin; noise makes some ground
  dearer than other so it wanders; then smoothed, and painted as the engine paints its own roads
  (the biome's road overlay with its edges cut on the slant, the ground for under a road beneath).
  A field's road makes for the guardian with one bend, over the open ground, as Diablo II's do.
  The scatter on it is cleared. `EDGES` can give a land a road of its own: the darkwood biome's,
  overlay 72, is a bright blood red on its ground, so its rifts have 634, the real Darkwood's
  paths (by Vampyrium, found with `scripts/floor-info.ts`).
- Whatever the land left cut off from the camp is blocked.

**In the sim.** A planned rift has as many packs as an open one on half the ground (`PACK_AREA`:
230 reachable tiles a pack rather than 520, still 16 to 42), so they're two or three a screen
along its ways. The boss stands in the guardian's arena whatever ground's further
(`LayoutPlan.guardian`), and packs keep 14 tiles off it. Chests go in the nooks first, so a dead
end always has something in it. Open land is placed exactly as it was.

**Pinnacles and the ladder** are planned as the campaign's rifts are, by their biome, but for the
two with no packs on the way to their fight, which any kind would make a walk with nothing in it
(`plannedKind` in `world/zoneGen.ts`). The Colosseum, fought in waves at its sand, is a pit, the
sand's middle about 55 steps from the camp (it was a loop, its sand in the heart, about 230 steps
round the ring and over the causeway). The Tombs, fought in rooms, are a nexus, the hall about 50
steps from the camp and each path's chamber a short way off it. Both start as the hero comes in.

## 3. Looking at them

```bash
bun run tsx riftscaper/scripts/layout-sheet.ts out.png seeds=4 scale=2
```

Every kind's plan for a few seeds, without the cache: open ground pale, deep blue, the route red.

```bash
bun run tsx riftscaper/scripts/rift-map.ts out.png depth=1 seed=5 scale=3
```

A rift built as the game builds it, from above, with the camp (green), packs (red), chests
(gold), shrines (blue), the hoard (orange), landmarks (white rings) and the boss (magenta), and
what can be walked lit. `shape` is `planned` (the game's), a kind, or `open`; `pinnacle=colosseum`
draws a pinnacle's rift; `crop=x0,y0,x1,y1` draws part of it close up. `layout-nodes.ts depth=1 seed=5` prints a plan's nodes in world tiles, to go and look at
them.

## 4. Playing them

Every rift is planned. In development, `http://localhost:5188/?rifts=trail` (or `loop`, `arms`,
`isles`, `field`) makes every rift one kind, and `?rifts=open` brings back the open land. From the
console in the city, `await game.devRift(depth, seed, "planned")` goes straight into one (or a
kind, or `"open"`).

## 5. How they play

The balance bot plays them as the game has them (`--rifts trail` and the rest for one kind, `--rifts open` for open land),
on the game's own plans (`world/zoneGen.ts`'s `riftPlan`, which needs no cache): what rises
round the lanes solid, what falls away water, and on the open ground the same clumps of rock its
open land has. Every class through depths 1 to 16, on seeds 1, 2 and 21, against open land on the
same seeds (2026-11-16):

| Land    | Rifts | Died | Collapsed | A cleared rift  | Level at 16 | All told  |
| ------- | ----- | ---- | --------- | --------------- | ----------- | --------- |
| Open    | 341   | 7.6% | 7.0%      | 6.6m, 139 kills | 57.5        | 2,352 min |
| Planned | 352   | 8.2% | 8.2%      | 6.4m, 151 kills | 58.5        | 2,427 min |

- **They play as open rifts do.** The deaths and collapses are within what the seeds swing by
  (seed 21 alone: 4 deaths on open land, 11 on planned; seeds 1 and 2: 22 and 18).
- **More is killed.** The way runs through the packs, so a cleared rift is about 9% more kills,
  and heroes come to depth 16 a level higher, nearer the 60 the curve aims at.
- **Deaths move from the guardians to the packs.** On open land 1 death in 26 was to a pack; on
  planned rifts 10 in 29 were. That's the lanes doing what they're for.
- **By kind** (each alone, seeds 1 and 2): trails and loops are easier than open land (18 and 20
  deaths against 22, 5 and 10 collapses against 19); fields play as open land does; arms are the
  quickest but the smallest, so heroes come to 16 about two levels behind; and every kind kills
  as many a minute (22 to 25), so none is a worse use of a player's time.
- **What it changed.** Isles died a third more often than open land, mostly the ranger, to packs:
  its kiting ran out of room on islands 11 to 15 tiles in radius and causeways 8 to 11 across. At
  13 to 17 and 10 to 13 (`ISLAND`, `SIDE`), the isles' deaths to packs fell from 16 to 6 and the
  ranger's from 11 to 6.

The bot fights every pack, where a player skips some. A player can go round a pack in an open
rift but not in a lane, so planned rifts may be slower beside open ones for a player than for the
bot. And the game's forest stops sight where the bot's rock doesn't, so the forest biomes may play
a little easier than it says.

## 6. What's rough

- They play as open rifts did for the balance bot (section 5), but they play differently (a way
  to follow, not a field to cross), and players' word on them is still to come.
- Snow cliffs read weakly: white on white. The deadlands' rock is very dark.
- Arms leave the least ground (about 21%) and are the plainest; they're only in the astral,
  deadlands and fairy biomes.
- The forest is trees only: the meadow has no bushes to fill the gaps between trunks, so the
  edge reads as a wood rather than a wall.
- The overlay map (Tab) outlines what's been seen, as Diablo's does, and a planned rift has walls
  for it to outline; it hasn't been looked at on one yet.
