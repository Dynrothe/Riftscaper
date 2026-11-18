# Runefall: how the city is laid out, and why

A record of what was measured, read and decided when the city was rebuilt from scratch (November
2026), so that later work on `src/world/cityGen.ts` keeps to the same reasons. The engine's map
guide (`engine/scaperune/CLAUDE.md`, "Designing a map") has the general numbers for towns; this is
what was looked at on top of that, for a city that's a hub and not a battlefield.

The city before this one was three terraces climbing from the south gate to a plaza before the
tower, with the services spread up the climb. It read as bland where it was empty and cluttered
round the portal, and some things in it faced the wrong way. This one starts from what a hub is
for.

## What the genre's towns teach

What the hubs of Diablo, Path of Exile and their neighbours do, and what players say about them.
Reddit, poewiki and most of diablowiki turn automated readers away, so player opinion here comes
from the official forums, Wowhead, Icy Veins and the press.

- **Arrival, exit and stash together.** Every documented complaint is about the walk between
  them: Lut Gholein's waypoint in a quiet quarter far from where portals land
  ([diablowiki](https://diablo2.diablowiki.net/Lut_Gholein)), Oriath landing players on a boat
  with the stash at the end of a narrow bridge
  ([forum](https://www.pathofexile.com/forum/view-thread/1978881/page/1)), Path of Exile 2's
  third act with its waypoint in a far corner
  ([forum](https://www.pathofexile.com/forum/view-thread/3606347)). The praised ones put them
  together: the Rogue Encampment's bonfire with the stash beside it and portals arriving there
  ([diablowiki](https://diablo2.diablowiki.net/Rogue_Encampment)), and Temis in Diablo IV, its
  services a compact ring round the waypoint
  ([ConsolePCGaming](https://consolepcgaming.com/temis-may-finally-make-diablo-4-endgame-towns-usable)).
- **Services in the order they're used.** Path of Exile 2's Ardura Caravan, called the best town,
  lands the player by the Hooded One, who identifies, then the salvage bench, then the vendor,
  with the stash and waypoint close by; the Ziggurat Encampment breaks the order and was called
  the worst ([forum](https://www.pathofexile.com/forum/view-thread/3721506)).
- **Cluster, don't pile.** Oriath's walkway crowded with people turns clicks meant for walking
  into clicks on someone. Kyovashad after its fixes became "one clump" with half the town empty
  ([forum](https://us.forums.blizzard.com/en/d4/t/town-object-proximity/266131)).
- **Flat, clear lanes.** Wowhead's ranking of Diablo IV's towns docked points for a chair in
  front of a stash, a stash up in an inn through doorways, a waypoint pedestal in the way and
  stairs and corners that snag; Gea Kul was the most beautiful and one of the worst to use
  ([Wowhead](https://www.wowhead.com/diablo-4/news/diablo-4-city-layouts-tier-list-333348)).
- **Build for the thousandth visit.** Diablo IV's designers said towns made to serve the story
  are awful deep in the endgame, so Temis keeps its story in instances and the open city purely a
  hub ([interview](https://sameteem.com/threads/rebuilding-sanctuary-the-making-of-diablo-iv-lord-of-hatred-with-blizzard.34276/?amp=1));
  Path of Exile's hideouts, where players arrange everything on one screen, are the same answer
  ([PoE Vault](https://www.poe-vault.com/guides/hideout-guide)).
- **The town's state is the world's.** Tristram's fountain square with Cain beside it, and the
  same town later as a ruin with its dead where they stood
  ([fandom](https://diablo.fandom.com/wiki/Tristram)); Harrogath walled and under siege
  ([diablowiki](https://diablo2.diablowiki.net/Harrogath)); Kyovashad's defences building up along
  the approach, a culture to each district and a warm tavern against the cold
  ([Blizzard](https://news.blizzard.com/en-us/article/23788294/diablo-iv-quarterly-updatemarch-2022));
  Devil's Crossing in Grim Dawn starting in rubble and filling as people are rescued
  ([Crate](https://forums.crateentertainment.com/t/grim-misadventures-14-recruitment-and-rebuilding/28043)).
- **A place like nowhere else.** Last Epoch reworked its hub because it didn't look important
  enough ([patch notes](https://steamdb.info/patchnotes/10677063)). Players find their way by
  landmarks and by people more than by paths or districts
  ([Wellesley](https://cs.wellesley.edu/~pmwh/mvmap/papers/open_world_elements/open_world_elements.html)),
  so each service wants a silhouette of its own and someone visibly at work at it.
- **A rest.** The trip to town is the genre's break in pacing
  ([Kotaku](https://kotaku.com/hub-worlds-can-be-games-greatest-pleasure-1822520149);
  [PC Gamer](https://www.pcgamer.com/torchlight-3s-lead-designer-hates-that-pets-can-sell-loot/)),
  and a warm town against cold places makes it one.

Two older ideas from urbanism still hold. **Sitte's** square is a room: enclosed, its middle
kept free, its monument and important buildings at its edge
([review](https://archidose.blogspot.com/2005/02/book-review-city-planning-according-to.html)).
**Lynch's** paths, edges, districts, nodes and landmarks are how a city's read, in a game as
much as a real one
([Game Developer](https://gamedeveloper.com/design/realism-and-legibility-in-open-world-level-design)).

And one from this game's own camera, which looks north at about 70 degrees and shows about 27 by
16 tiles: whatever stands on the south side of a space hides what's north of it, and whatever
faces north shows its back. So tall things go on the north side and the south edge stays low,
and a counter faces its customers, wherever they come from, never the camera's convenience.

## What the real cities measure

`scripts/city-survey.ts` reads a rectangle of the real world and reports its heights, its paving
and what it's built with. Run on Varrock's centre, Falador, Lumbridge and the Ardougne market:

| City              | Flat tiles | Height span | Levels the ground sits at                              | Steepest edges                   | Paved |
| ----------------- | ---------- | ----------- | ------------------------------------------------------ | -------------------------------- | ----- |
| Varrock centre    | 72%        | 36 (2.3 t)  | streets 36, a lower quarter 32, the palace on 52       | none over 16 a tile              | 56%   |
| Falador           | 51%        | 73 (4.6 t)  | 36, 52, 72 (the castle), the park's pond at 0          | 7% over 16, the castle base to 32 | 46%   |
| Lumbridge         | 56%        | 59 (3.7 t)  | 32 round the castle, which stands on 60; the river 0   | 11% at 8 to 16                   | 50%   |
| Ardougne market   | 70%        | 27 (1.7 t)  | 78% on one level                                       | none over 16                     | 65%   |

Heights are the map's units, 16 to a tile. A town is mostly dead flat, and about half of it is
paved. Varrock has no street lamps, no benches and no hedges in its centre, and Falador has none
either. Lamps and lanterns in the cache (2492, 2491, 11606) hang from walls and float in the open;
the ground lights that burn are the standing torch 724 of Edgeville and the Barbarian Village and
the brazier 28818. The old hedge 1116 is a single rounded bush that doesn't join up into a row
from this camera, so it's used only as box hedging round beds. Lumbridge's low cobbled wall
(1902, the church's own kit) reads as a wall at any angle. Clutter stands against walls, in
groups, away from doors, as the engine's `VIGNETTES` measure.

## The plan

The city is flat but for the crater, as real towns are, and everything lines up on one axis
north and south through the arena's middle: the south gate, the south street, the tear, the
orrery and the tower's door.

- **The square** (25 tiles a side) is the hub, enclosed by buildings on all four sides, its middle
  given to the tear alone: a square dais of grey flagstones, 13 tiles a side, with an eight-sided
  mouth over the crater the fall left, rock going down to black at its heart, and four binding
  stones on the dais. (It was a ring of white marble first, which from above read as water.) The
  hero arrives on the dais's west side,
  between the tear (6 tiles) and the bank's door (6.5), with the Archmage, who opens the rifts,
  4 tiles off and Reldo, who identifies for free as Deckard Cain does, 2 tiles off at his
  lectern. The bank's booths are 12 tiles from the arrival, through its door: the one thing the
  hero uses every trip that's further than the genre's best keep it, though still on the same
  screen.
- **The shops ring the square in the order they're wanted.** The bank and the apothecary on its
  west side, Horvik's forge and Lowe's on its east, Fortunato's curio tent and the gem trader's
  stall at its south corners, each keeper at their door or behind their counter, looking into the
  square. Each has its scene: Horvik's quenching barrel between his arches and his yard behind
  with his coal cart and anvil, the apothecary's herb stall at the shop's door, Fortunato's crates of
  sealed curios by his tent. The orrery stands on the axis between the tear and the tower, with
  Clara's telescope beside it. Torches mark the square's four corners and nothing else stands
  loose on it, so every lane across it is clear.
- **The tower closes the square's north side**, the tallest thing in the city where the camera
  can see it whole. The tower street runs before it from the west gate to the east, with the
  mage's shops either side: Zaff's to the west, and to the east Aubury's own eight-sided rune shop
  from Varrock (found by its fire rune icon), its door standing open and his rune stall by it. (His transmuting circle stood on the street first; the cache's magic circles are a house's
  floor traps, a swirl of light that read as a glitch there.)
- **The south street** comes in from the south gate on the axis, past the guards, the Blue Moon
  Inn (its front door, which stands open as it does in Varrock, on the street, and its alley door
  on the yards west of it) and the Captain's barracks, so the tear is in view from the gate.
- **The rest of the town is for the story, outside the hub**, seen but never in the way:
  - the strangers' camp south-east of the square, on ground the fall burned bare round one of
    its stones: TzHaar-Hur-Tel at his lava pit, the Void Knight at his stall before his tent,
    Felix between his piles of essence;
  - the barracks' training yard by the gate, dummies at one end and targets at the other, facing
    the line the archers shoot from;
  - the chapel west of the tower, its saint by its door, and behind it the walled churchyard
    where those the rifts kept are buried;
  - the tower's garden behind the tower, reached by a path past Aubury's, where a stone came down
    through a house and still lies in its walls, shards about it;
  - the houses on the lanes, a well and a table in their yard, the inn's kitchen garden between
    its back wall and the city's;
  - outside the south gate, a field and a pasture, so the city has a country to stand in.
- **Ground in three grades**: flagstones for the tear's dais, cobbles for the square and streets,
  the meadow's trodden road for the lanes and yards. Every door's way runs out to the street or
  lane it opens on and is laid as what it meets, so no patch of stone lies on its own. Under the
  cobbles is an earth of the cobbles' own grey, which is what shows where a stone's edge cuts a
  tile, and under the dais a grey like the crater's rock, which shows at the mouth's slants.
- **Facing.** Every door opens on to a street, the square or a lane, every keeper looks out of
  their door or across their counter, every stall's counter faces where its customers come from,
  and the targets face the archers' line. Each was looked at in the game, the targets from the
  side, and the side gates open on the tower street's own rows.

`scripts/city-map.ts` draws the result as collision (and with `HEIGHTS=1` as heights) and fails if
anyone, the portal or the orrery can't be reached; run it after any change to the plan.
`scripts/city-png.ts` draws the city as a picture, a few pixels a tile, to look at a change as a
whole before walking it in the game.
