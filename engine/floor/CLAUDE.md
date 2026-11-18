# Floors that fight back

A floor the game draws and moves itself, tile by tile: slabs rise under the player in waves and
tiles fall away into a pit, as in the Wardens' third phase in the Tombs of Amascut. A floor is plain
data (`FloorDef`, in `types.ts`, each field's comment saying what it does), run by the sim tick by
tick and drawn with the cache's own models. Run Escape's Wardens' floor and eight demos are the
worked examples: its own guide (`src/game/scaperune/CLAUDE.md`, "Floors that fight back") has
them, and what it does with a floor that's its own.

| File             | What it does                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `types.ts`       | `FloorDef` and everything in it                                                               |
| `ArenaFloor.ts`  | Runs it: the script, every tile's state, what rose and fell each tick, and the grid's holes   |
| `floorLayout.ts` | Lays it out once, from its shape, ascii map and tiles rules, the same every time for its seed |
| `patterns.ts`    | Short forms for its script: `beat`, `side`, `sweep`, `ripple`, `bold`, `dropRows`, `holes`    |
| `floorLint.ts`   | Checks before it's played: in one piece, reachable, its skins and ramps, a phone's triangles  |
| `FloorView.ts`   | Draws it: each tile a model at rest, the warnings, rises and falls, and what's under it       |
| `floorBakes.ts`  | What `FloorView` needs baked, and the keys it looks each up by                                |
| `floorLights.ts` | Its glowing tiles (lava, ice), offered to a frame's lights                                    |

## In a game

**Running it.** Make one when a run starts, on the arena's grid, with the sim's seeded `Rng` and
its ticks a second, and step it every tick:

```ts
const floor = new ArenaFloor(def, grid, rng, TICKS_PER_SECOND);
// each tick: origin is where a ripple "at the player" starts, and who a dropUnder is aimed at
const { rose, fell, back, messages } = floor.step(tick, () => player);
```

- It changes the grid itself: what isn't floor and every fallen tile is dropped
  (`ArenaGrid.dropTile`) and comes back when it's restored, a pillar blocks the way as an object
  does, and wherever heights differ there's a ledge (`addLedge`). Work your flow field out again
  after a step with anything in `fell` or `back`.
- What it does to anyone is the game's, from its queries: `isHurting(x, y, tick)` (a slab's up
  under them), `isFalling`, `effectAt` (`FLOOR_EFFECTS`' index plus 1, 0 for nothing),
  `isPillarTile`, `blocksSight(fromX, fromY, toX, toY)` (a pillar between two points), and
  `liftAt(x, y)` (how high a spot stands, to draw whoever's there at). `slam.damage`,
  `drop.damage`, `shove`, `grace`, `shake` and `tileEffects` are numbers for the game to use: the
  engine never hurts anyone. The character controller's `MoveRules.surface` is where haste, slow
  and ice go.
- `press(tiles, tick, origin)`, with the tiles players stand on (world tiles, x then y), sets off
  triggers. `act(action, tick, origin)` is anything from outside: a boss's attack, an event.
- `step` and `press` return what's to be said (`message` on a beat, a trigger or a phase).
- **Determinism**: its layout's only chance is the floor's own `seed`, never the run's; holes and a
  sweep's wandering gap take the `Rng` it's handed. `ArenaFloor.ts` and `floorLayout.ts` are held
  to `fm` by `engine.test.ts`.

**Drawing it.** Bake what it needs with the rest of the game's actors, and draw it each frame:

```ts
requests.push(...getFloorRequests(def));
for (const id of getFloorSpotAnims(def)) {
    requests.push({ kind: "spotanim", key: getFloorSpotKey(id), spotAnimId: id });
}

const view = new FloorView(models); // anything with get(key): ActorModel | undefined
view.submitActors(actors, floor, tick, alpha); // each frame, alpha between ticks
```

- **The room**: the map under the floor's box must draw nothing, so a fallen tile opens onto what
  `FloorView` draws below (`under`: pillars, beams, the wall going down, a glow far below). In
  ScapeRune that's a bridge (`TILE_BRIDGE` on level 1) of the hidden overlay over a pit dug out of
  the terrain (Run Escape's `digPit`, in its `scaperune/maps/wardensFloor.ts`).
- Its pillars and raised tiles are drawn before silhouettes (`ActorDrawOptions.early`), so
  whoever's behind one shows as behind the world's walls.
- Every tile is a skin's model; a slab of tiles is one model stretched over them. Tiles at rest are
  instanced, one draw a skin, and a 1 by 1 tile at rest among others at its height is drawn as its
  top alone (`ModelBakeRequest.topOnly`), as nothing can show its sides. Glyphs, plates, decals,
  ramps and cracked tiles are always drawn whole.

**Its lights**, on a lit map: `offerFloorLights(lights, floor, tick, viewX, viewY, looks, kind)`
between `DrawnLights.begin` and `end`, with a `LightLook` for each effect that glows (Run Escape's
`FLOOR_LIGHTS`: lava's burn and, faintly, ice).

**Checking it**: `lintFloor(def, start, { presets, room })` gives warnings, notes and a rough phone
triangle count at rest and at its busiest, against `PHONE_TRIANGLES`. `presets` are the skins your
game knows are opaque (any other gets a note), and `room` what a phone draws besides the floor
(Run Escape's Wardens' room when unset). `floorGrid(def)` is a grid round a floor alone, to try one
away from a map, as a preview page does.

## Writing one

**A minimal floor** is a box, its slam, its drop and a script. Everything else has a default: the
whole box is floor, of the slam's own slab, all normal tiles.

```ts
const floor: FloorDef = {
    rect: { x0: 3200, y0: 3200, x1: 3222, y1: 3224 },
    slam: { warn: 1, hurt: [0.04, 0.28], damage: 0.2, grace: 0.6, spotAnim: 2220, sound: 6555 },
    drop: {
        warn: 2.4,
        damage: 0.15,
        shove: 0.25,
        spotAnim: 2228,
        fall: 1,
        keepRows: 5,
        sound: 6572,
    },
    script: [beat(3, side("east", 0.15)), beat(9, sweep(0.12, 3)), beat(15, holes(3))],
    loopSeconds: 20,
};
```

Spot animation 2220 is the Wardens' slab rising (seq 9697) and 2228 it tumbling away (seq 9722);
the sounds are the OSRS Wiki's ids for the Tombs' rocks.

Floor tiles are counted from the box's south-west corner, x east and y north. North is the front:
waves travel away from it, and rows fall from the south.

**Its shape** (`shape`, `FloorShapeDef`): `rect`, `ellipse` (a circle when `rx` and `ry` match),
`ring` (round, or `square`), `diamond`, `cross`, and `union` and `minus` of them. A middle (`cx`,
`cy`) can be in half tiles, and is the box's middle when it isn't given. What isn't floor is the pit
from the start: blocked, and never there. It's a clean pit: the structure under the floor only ever
shows through holes in the floor, and a shaped floor has no deep glow.

```ts
shape: { kind: "minus", from: { kind: "ellipse", rx: 11, ry: 11 }, cut: { kind: "ellipse", rx: 3, ry: 3 } },
```

**By hand** (`ascii`): a row a string, the north row first. `.` and space are no floor, and every
other character is floor. Characters also name tiles for the rules below
(`{ kind: "chars", chars: "f" }`). With a `shape` too, the floor is where both say.

```ts
ascii: [
    "..#####..",
    ".##*#*##.",
    "###fff###",
],
```

**Skins** (`skins`, `FloorSkinDef`): what tiles look like. Each skin is one of these:

- a spot animation's model (`spotAnim`), which rises with its own animation (`rise: "anim"`);
- a loc's model (`loc`);
- a model id (`model`).

Every skin can also have:

- `recolor` and `retexture`, as `[from, to]` pairs after the cache's own swaps;
- `scale`, `height`, `tint`;
- `light`, a steady glow in its seams at rest (for glyphs);
- `glow` (0 to 1, all over it in its `tint`'s colour) and a slow `pulse` on top, each tile on its
  own beat, as lava has;
- `idle`, a spot animation now and then on a share of its tiles at rest (lava's embers);
- `effect`, what standing on it does (below), and `material`, its own dust and sounds (below).

Anything without its own rise animation rises in code (`rise: "code"`): lifted, its leading edge
tipped up the way the wave goes, then settled back. A tile falls the same way in code
(`fall: "code"`). Only a 1 by 1 tile of the slam's own slab tumbles (`fall: "tumble"`,
`drop.spotAnim`).

A skin should be one tile across and centred, like a floor decoration (the cues' edge light assumes
it). A model made bigger says so with `size` (tiles across): a 2 by 2 pillar is `size: 2` on a 2
by 2 slab.

A skin the floor's light doesn't suit can have its own cue light
(`cue: { color, strength, width, tremor }`). Give bright tiles a stronger, hotter one, and a
recoloured slab a quieter one.

Most of the cache's 1 by 1 floor models are see-through overlays or invisible hitboxes:

- the Tombs' "Tile" (45356) is about 70% see-through;
- "Frozen platform" (54539) is invisible.

So check a new one in the game before you rely on it (and add it to the presets your lint is
handed). A decal needs a skin under it (`under`). A textured tile beats a recoloured slab: a slab's
top is one colour. The cache's flat tile of lava rock (loc 747, 18 triangles) with its texture
swapped makes lava (texture 59, which creeps on its own), ice (53), earth (32) and dunes (38).

```ts
skins: [
    { spotAnim: 2220, recolor: [[43904, 37278], [38156, 37300]] },
    { loc: 56393, light: 0x9fdcff },
],
```

**Tile rules** (`tiles`, `FloorTileRuleDef`): every rule that covers a tile applies in order, so a
later rule wins. A rule has:

- `where`: one of the shapes above, or `all`, `checker` (`size`, `odd`), `border` (`width`, from
  the floor's edge or any hole in it), `stripes` (`axis`, `every`, `width`, `offset`), or `chars`;
- `share`: only that fraction of the tiles, picked by the floor's `seed`, so the same seed always
  gives the same floor;
- what it sets: `skin` (an index, or weighted `[{ skin, weight }]`), `type`, `turn` (0 to 3, or
  `"random"`) and `slab`, and `effect`, `rebuild`, `trigger`, `group`, `height` and `ramp` (below).

```ts
tiles: [
    { skin: 0, turn: "random" },
    { where: { kind: "checker" }, skin: [{ skin: 1, weight: 3 }, { skin: 2, weight: 1 }] },
    { where: { kind: "border" }, skin: 3, type: "reinforced" },
],
```

**Tile types** (`FloorTileType`):

| Type         | Rises | Falls | Note                                                                                                                       |
| ------------ | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| `normal`     | yes   | yes   |                                                                                                                            |
| `reinforced` | yes   | no    |                                                                                                                            |
| `fragile`    | yes   | yes   | Its fall is warned for half as long (`drop.fragile.warn`), and it falls by itself after rising twice (`drop.fragile.hits`) |
| `solid`      | no    | no    |                                                                                                                            |
| `safe`       | no    | no    | The same as `solid`, for the spots a floor promises are safe (give them a glyph skin)                                      |
| `pillar`     | no    | no    | Nobody walks through it: it blocks the grid as an object does. Give it a pillar skin                                       |

**Pillars** are the pillar type with a pillar skin. A pillar is narrower than its tiles, so give
its skin the floor's skin to stand on (`under`). A 2 by 2 one is a slab:

```ts
{ where: { kind: "rect", x0: 10, y0: 11, x1: 11, y1: 12 }, skin: 4, type: "pillar", slab: [2, 2] },
```

- **Movement:** it blocks it, and the floor counts it as no way through, so holes never cut the
  floor round it.
- **Shots and sight:** `blocksSight` says whether one stands between two points, for the game's
  shots and aiming.
- **Camera:** whoever's behind it shows as a silhouette, as behind a wall.

**Slabs** (`slab: [x, y]` on a rule): tiles that rise and fall as one piece.

- They're laid from the south-west wherever a whole one fits in what the rule covers and isn't in a
  slab already.
- A slab rises when its first tile would, hurts on every tile while it's up, and falls whole.
- It's one model stretched over its tiles, so it costs a phone what one tile does.
- A slab that isn't square only turns end over end.

```ts
tiles: [{ where: { kind: "ellipse", rx: 6, ry: 6 }, slab: [2, 2] }],
```

**The script** (`script`, `loopSeconds`): beats at seconds into the loop, each starting a pattern
(`FloorPatternDef`) or doing an action, then the loop again from the top. The patterns:

- `side`: slabs rise row by row from the front, down the `east` or `west` half, or `both` but the
  middle three columns;
- `sweep`: every row, with a gap of `gap` tiles that wanders a tile at most from row to row;
- `ripple`: rings out from the player or the middle, never on its spokes (`cross`, `diagonal`);
- `dropRows`: rows fall away from the back, down to `drop.keepRows`;
- `holes`: single tiles fall at random, never next to another hole or the edge;
- `restore`: everything fallen comes back, front first.

On any shape:

- `side`, `sweep` and `ripple` go by the floor's own extent and middle.
- A sweep's gap is always on floor: the nearest place it fits in that row. A row with no room for it
  stays down.
- `dropRows` falls from the floor's own back row, and `keepRows` counts from there.
- `holes` are only ever inside the edge.
- Solid, safe and reinforced tiles are left out of whatever they don't do.
- **Islands:** holes, falling rows and fragile tiles never cut the floor in two, so nobody's
  stranded. Set `drop.islands` to allow it.

**Cues** (`cue` on a pattern or the floor): `subtle` (the default) or `bold`. Both show every tile a
pattern will hit from the moment it starts, and each tile's last second before it rises or falls is
a strong warning: the tremor and the light through its seams.

**Tiles that do something** (`effect` on a tiles rule, or a skin's own; `"none"` takes a skin's
away): `burn`, `heal`, `haste`, `slow` or `ice`. The floor says which is where (`effectAt`), and
the game says what each does, tuned by `tileEffects` (`burn: { damage, every, enemyDamage }`,
`heal: { amount, every }`, `haste`, `slow`, `ice: { grip }`). Run Escape's guide has what its do.

**A floor that rebuilds itself** (`rebuild: { after, warn, rise }`): a fallen tile comes back
`after` seconds after it falls. For its last `warn` seconds (1) it comes up out of the dark, lit
from under and turning back over the way it fell, then rises into place over `rise` seconds (0.8).
It waits for floor beside it, so it never comes back cut off. A rule's `rebuild` is seconds for its
tiles, or 0 for never.

```ts
rebuild: { after: 6 },
tiles: [{ where: { kind: "border" }, rebuild: 0 }],
```

**Pressure plates** (`triggers`, and `trigger` on a tiles rule): a player stepping onto the tile
sets it off (`press`), then it rests for `cooldown` seconds (5). `once` sets it off only once.
`armed: false` starts it disarmed. It's lit while it's ready and sinks while it's stood on. What it
does is a list of actions. Groups are named tiles (`group` on a rule), and `patterns` names
patterns.

```ts
tiles: [
    { where: { kind: "rect", x0: 11, y0: 5, x1: 11, y1: 5 }, skin: 2, type: "solid", trigger: "trap" },
    { where: { kind: "rect", x0: 8, y0: 7, x1: 14, y1: 9 }, group: "jaws" },
],
triggers: { trap: { actions: [{ kind: "slam", group: "jaws" }], cooldown: 4, message: "Click!" } },
```

**Actions** (`FloorActionDef`), each with an optional `delay` in seconds, from a trigger, a beat, a
phase, or the game (`act`):

| Action      | What it does                                                        |
| ----------- | ------------------------------------------------------------------- |
| `pattern`   | starts a pattern, or one of `patterns` by name                      |
| `drop`      | a group falls, warned as a fall is (never cutting the floor in two) |
| `raise`     | a group's fallen tiles come back                                    |
| `slam`      | a group rises, a warning from now: a trap                           |
| `dropUnder` | the tile under whoever it's aimed at falls                          |
| `arm`       | arms a trigger, or disarms it (`armed: false`)                      |
| `phase`     | goes to one of the floor's `phases`                                 |

A beat in the script can be an action instead of a pattern:
`{ at: 30, action: { kind: "phase", phase: "molten" } }`.

**Phases** (`phases`): another script with its own loop, from the moment it starts, and skins
swapped on every tile (`skins: [[from, to]]`, by index), their effects going with them. To swap only
part of the floor, give that part a copy of its skin.

**Materials** (a skin's `material`, `FloorMaterialDef`): a spot animation and a sound as it rises,
as it falls and as a fragile one cracks (rises nearer giving way). They take the place of the
floor's own dust and sounds on that skin, on the same share of the tiles.

**Damage you can see.** A fragile tile that's risen is darker, sunk a little and askew, more each
time, until it gives way. A skin's `stages` are skins to draw instead after one rise, two and so on.

**Height** (`height` on a rule, in tiles; below 0 is sunken) and **ramps** (`ramp: "north"` and so
on, the way up): a ramp goes from the tile behind it to the one ahead, and its sides are ledges.
Wherever heights differ there's a ledge, a wall on the grid (`ArenaGrid.addLedge`), so nobody walks
up or down it but by a ramp. What's faked: it's all one plane. Whoever's on it is drawn at the
height they're on (`liftAt`), but nothing else in the grid knows about height, and a flying enemy
crosses ledges. A raised tile's sides are the tile again under itself.

```ts
tiles: [
    { where: { kind: "rect", x0: 7, y0: 13, x1: 15, y1: 20 }, height: 0.5 },
    { where: { kind: "rect", x0: 11, y0: 12, x1: 11, y1: 12 }, ramp: "north" },
],
```

**What it costs a phone.** About 52 triangles a tile of the Wardens' slab, and the paving locs about
twice that, so a floor of paving costs a phone about 10k more triangles than slabs do: use it for
bands and borders. A wave or falling tiles add dust, chips and thickness round holes, and only a
share of the tiles throw effects, so a whole row coming up costs a few thousand triangles, not tens
of thousands. `lintFloor`'s count is rough on purpose: worked out from tile counts and each skin's
triangles, within about 8k of a probe at the busiest.
