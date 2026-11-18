# Engine

Everything Run Escape is built on that isn't Run Escape: reading the Old School RuneScape cache,
drawing its world and its characters, making maps that aren't in it, moving a character through it
with keys, a controller or a touch screen, its sounds, and the collision, path finding and
deterministic maths a game on top needs. It started as
[rs-map-viewer](https://github.com/dennisdev/rs-map-viewer) (BSD 2-Clause, see `LICENSE` in this
folder).

Nothing here imports from outside this folder (`engine.test.ts` fails if something does), so another
game can take the folder as it is. The game hands the engine what's its own: a map's recipe, what a
controller's buttons do, where its settings are kept. When it wants a field of its own on an engine
type, it adds it by declaration merging, as Run Escape does with `mapDef` on `MapRecipe`
(`src/game/scaperune/maps/recipes.ts`).

For agents (and people) working with it: `CLAUDE.md` is the guide (its rules, where things are, a
game on it from the page to a frame, and its traps), `scaperune/CLAUDE.md` is the map maker's,
`floor/CLAUDE.md` a floor's that rises and falls away, and `docs/design/` has Run Escape's design
documents for its bosses and maps, as worked examples. `docs/plans/lamplight.md` is a plan for a
second game on the engine, a survival horror game by lantern light, with the engine work it needs.

## What it does

**The cache**

- Reads OSRS caches (`dat2`, and the older formats rs-map-viewer knew): indexes, archives,
  containers, Gzip and Bzip2 (WebAssembly in the browser), and XTEA keys for map squares
  (`rs/cache/`).
- A slim cache split into chunks, so a hosted game downloads only what it reads, kept in the
  browser's Cache API between visits (`rs/cache/ChunkedCache.ts`, `mapviewer/Caches.ts`).
- Decoders for the config types: locs, NPCs, items, animations, spot animations, floors, identity
  kits, enums, params, structs, varbits and varps, inventories, quests and more (`rs/config/`).
- Models, with animations of both kinds (frame-based and skeletal), player models from identity
  kits and worn items, textures (procedural ones too), sprites and the 2D and 3D rasterizers
  (`rs/model/`, `rs/texture/`, `rs/sprite/`, `rs/graphics/`).
- The client's sound effect synthesizer: instruments, envelopes and filters (`rs/audio/`).
- The scene builder: a map square's terrain, locs, walls and collision, as the client builds them
  (`rs/scene/`), and the client's tile path finder (`rs/pathfinder/`).
- Map squares of your own, handed in as plain data, that everything reading a map treats as real
  (`rs/map/CustomMapFileLoader.ts`), replaced while they're played on and built again without a
  flicker (`MapViewer.refreshCustomMapSquares`), and per-loc overrides of a model, size or height
  (`rs/config/loctype/LocOverrides.ts`).

**Drawing it**

- A WebGL 2 renderer of the world: terrain (flat-shaded or smooth), locs, animated locs, NPCs and
  items on the ground, with FXAA and culling by cells of a map square (`mapviewer/webgl/`). An
  early WebGPU renderer sits beside it.
- Workers that build what's drawn off the main thread, in a pool (`mapviewer/worker/`): map
  squares, collision and heights for a whole arena, item icons drawn as the client draws them (or finer, at a whole multiple of their size, for an item shown big: `ItemIconRequest.scale`), pictures of locs for a picker (`LocIconLoader`),
  interface sprites, synthesized sounds, and actors baked frame by frame.
- An actor renderer: baked animation frames of any model drawn anywhere, any number of them, with
  silhouettes for what's behind walls, tipped (a flinch) or tinted, and keyframes optionally
  smoothed with poses between them at bake time (`tweenTicks`) (`mapviewer/webgl/actor/`).
- The upper levels a top-down camera mustn't show (roofs, floors overhead) left out
  (`mapviewer/webgl/loc/UpperLevels.ts`).
- A game's renderer on top: a play area whose edge fades to the sky, a light map with any number of
  lights at the cost of one, ambient light and colour washes, brightness, a lost WebGL context
  survived, and the world left undrawn under a screen that covers it (`holdFrame`) (`render/GameWebGLRenderer.ts`, `render/LightMap.ts`). A fixed top-down follow camera
  (`render/CameraRig.ts`).
- Lights: what one looks like (a radius, a colour, an intensity, a fire's flicker or a slow pulse,
  `render/LightLook.ts`), a frame's lights offered by whatever gives them off, glowing scenery by
  its loc id among them (`render/DrawnLights.ts`), and which get the few slots each frame, fading
  in and out rather than popping (`render/LightBudget.ts`).
- A 2D canvas over the 3D view, sized to its pixels, that turns a world position into a point on
  the screen, for health bars, names and the like (`render/Overlay.ts`), and the client's hitsplats
  drawn on it, cached so a hundred a frame stay cheap (`render/Hitsplats.ts`).
- What a frame costs: triangles, draws and CPU time, counted at the GL calls
  (`render/FrameProbe.ts`, a development tool).
- The map viewer itself, as a page (`mapviewer/MapViewerApp.tsx`, `?viewer` in Run Escape), and
  OSRS-style React pieces: the canvas, a loading bar, a right-click menu, the minimap, a select, the
  world map, and an item's icon as the client draws it (`components/`). `style/engine.css` has the
  OSRS fonts, the client's interface frame (`rs-border`, `rs-background`) and the viewer's helpers.

**Playing it**

- A character controller for a top-down world (`controller/CharacterMovement.ts`): what's pressed
  becomes a step through the world's collision, at the speed the game gives, and the way the
  character faces. It can be frozen, rooted but still turning, kept inside bounds, turned to face a
  spot, its controls scrambled by a matrix, and slowed, hastened or slid on ice by the ground under
  it. It only writes the body it's given, so a copy can be moved the same way (a co-op guest's
  prediction). `walkToward` walks a follower, and `yawFromVector` gives the client's yaw.
- Input (`input/`): the keyboard (WASD and the arrows), the wheel, controllers and a touch stick,
  merged into one move of length 0 or 1, the same whichever is used (`GameInput.ts`). Keys are
  dropped when the window loses focus.
    - Controllers through the Gamepad API (`GamePad.ts`): one at a time, handed over cleanly
      when another's picked up, its make worked out for the labels (Xbox, PlayStation, Switch).
      Its buttons are sent as the keys the game already answers, which the game sets
      (`PadBindings`), and on menus the d-pad moves a highlight between buttons. `PadIcon.tsx`
      draws a button as the pad in use has it (Kenney's CC0 Input Prompts).
    - Touch (`TouchStick.ts`, `touchScreen.ts`): a stick wherever a thumb lands, which follows it
      past its rim; taps a browser won't click while the thumb's on the stick clicked anyway; no
      pinch or long press menu; full screen and sideways from a tap.
- Sound (`audio/GameAudio.ts`): the client's synthesized sound effects through Web Audio, each from
  its first sound (the silence some open with taken off, as the client does), or samples a game
  has without the workers (`add`: made in code, or exported and loaded), started on the first
  press as browsers require, a few at once, quieter and panned by where they are, each at the
  volume the game gives it, through a low pass or lowered if it asks (`PlayOptions`); a looping
  music track, or music the game makes itself (`onMusicOutput`); volume and mute kept where the
  game says.
- Saves (`save/`): one tab saves at a time, through a Web Lock the game names, taken over from
  another tab or passed on when it closes (`SaveLock.ts`); and handing the player a file to keep,
  through the share sheet on an installed iPhone game, an app around the game, or a download
  (`saveFile.ts`).

**A floor that fights back** (`floor/`, guide in `floor/CLAUDE.md`)

- A floor drawn and moved tile by tile, as the Wardens' is in the Tombs of Amascut: slabs rise in
  waves under the player and tiles fall away into a pit, every one warned by the tiles themselves
  shaking first. Plain data (`floor/types.ts`): its shape or an ascii map, skins from the cache's
  models, tile rules, and a script of patterns (`floor/patterns.ts`).
- Run by a sim tick by tick (`ArenaFloor.ts`), which drops and restores the grid's tiles itself:
  side slams, sweeps with a gap, ripples, falling rows and holes, never leaving anyone on an
  island; tiles that are solid, reinforced, fragile, safe or pillars; slabs of several tiles;
  raised and sunken tiles and ramps; tiles that burn, heal, haste, slow or slide; pressure plates,
  actions from outside (a boss's), phases, and tiles that rebuild themselves.
- Drawn with the cache's own models and spot animations, cheap enough for a phone
  (`FloorView.ts`, baked from `floorBakes.ts`), its glowing tiles among a frame's lights
  (`floorLights.ts`), and checked before it's played (`floorLint.ts`).

**Making maps that aren't in OSRS: ScapeRune** (`scaperune/`, guide in `scaperune/CLAUDE.md`)

- A map is a recipe: where its squares go and how to build them. It's written out in the cache's
  own formats, so the renderer, collision, minimap and scripts can't tell it from a real one.
- A seeded generator with a setting for everything and presets: land shaped by hills, ranges,
  plateaus, mesas, canyons, volcanoes or a heightmap; rivers in flat reaches with waterfalls, lakes,
  ponds and the sea; cliffs and their rock; roads and bridges; hamlets, towns and walled cities
  laid out in a fixed order against a map of what each tile's reserved for; set pieces, landmarks,
  ruins, wrecks and waymarkers; scatter and ground dressing by what real ground has on it.
- Biomes, from meadow to the astral plane, each with its ground, water, trees, buildings
  and rock.
- Prefabs: rectangles of the real world (buildings, bridges, whole halls) cut out, turned and
  stamped onto a map, upstairs levels brought down, floors cut as rugs.
- Height as floats with pins, so plots, roads, water and falls each get the ground they need,
  limited to what the camera can see and players can walk.
- A map maker (`mapmaker/`, beside the engine in the ScapeRune project, not in Riftscaper's
  repository) to make one by hand, and map files (`mapFile.ts`) any game loads as a recipe on
  squares of its own.
- Tools for hand-made maps: `Ground` to paint and place on, a `Placer` that counts what it placed
  and why the rest wasn't, real city walls as data, sealed rooms (`sealFrom`) and reachability
  checks.
- Checks that a map is sound: every open tile reaches the spawn, collision agrees with the game's,
  locs that read wrong outside where they belong are banned, faces that z-fight are found
  (`coplanar.ts`), and holes in the floor are warned of (`hiddenFloor.ts`).

**Collision, movement and the sim's basics**

- An arena's collision and heights in one grid, with ledges added at run time
  (`world/ArenaGrid.ts`), circles moved and pushed out against tiles and walls
  (`world/Collision.ts`), and which steps out of a tile are allowed, worked out once.
- A flow field: Dijkstra from the player over a window round them, how hundreds of enemies find
  their way at once (`world/FlowField.ts`), and the walls that stop what flies
  (`world/FlightGrid.ts`).
- Line of sight: whether one spot sees another past walls, rocks and pillars, the same both ways
  round (`world/Sight.ts`).
- What a sim knows of light: whether a spot's lit, and a scene's ambient fading by the tick
  (`world/Lighting.ts`), for a rule that goes by what's lit.
- A seeded random number generator (`core/Rng.ts`), a spatial hash for what's near
  (`core/SpatialHash.ts`), bullets in flat arrays, hundreds at once with nothing allocated in a
  tick (`core/BulletPool.ts`), and trigonometry that every browser works out the same to the bit,
  for a lockstep game that runs one sim on every player's machine (`core/fmath.ts`).
  `engine.test.ts` holds `core/`, `world/`, `controller/` and a floor's sim to it.

**Building with it**

- `vite.ts` has the Vite plugins and settings it needs: GLSL with `#include`, `.wasm` imports as
  URLs, `.web.ts` files first in the browser, ES module workers, the headers shared memory needs,
  and the cache served at `/caches` in development.
- `tsconfig.json` type checks it with nothing of the game's: `bun run tsc --noEmit -p engine`.

## What it isn't

No game rules, save data, menus or HUD: those are the game's. Run Escape, the game the engine was
made for, is a repository of its own, and this guide was written in it: its `src/game/` and
`scripts/` aren't in Riftscaper's repository, whose game is in `riftscaper/`. Co-op's lockstep is
Run Escape's too, since it runs Run Escape's sim. Some of what's here was made for Run Escape and says so in
its comments (the generator's `waveSet` choices are Run Escape's maps, and `LocOverrides.ts` has
its maps' overrides), but none of it needs the game to run.

## Using it in another project

1. Copy this folder in, or add the repository as a submodule.
2. Install what it imports: `@foxglove/wasm-bz2`, `bzip2`, `denque`, `file-saver`, `gl-matrix`,
   `java-random`, `js-xxhash`, `jszip`, `leva`, `pako`, `picogl`, `react`, `react-joystick-component`,
   `react-modal`, `react-router-dom`, `react-select`, `threads`, `wasm-gzip`, `webfontloader` and
   `xxhash-wasm`, with `vite`, `vitest`, `typescript`, `jsdom`, `@testing-library/react`,
   `@testing-library/jest-dom`, `@webgpu/types`, `@types/react` and `@types/node` to build and
   test. The repository's `package.json` has the versions it's tested with.
3. Spread `vite.ts` into your Vite config, as the repository's `vite.config.ts` does: the plugins
   (with where your caches are), `ENGINE_EXTENSIONS`, `ENGINE_OPTIMIZE_DEPS`, `ENGINE_HEADERS`,
   and `ENGINE_WORKER_FORMAT` with `engineWorkerPlugins()` for the workers.
4. Put an OSRS cache in your caches folder with a `caches.json` listing it (Riftscaper's and Run
   Escape's `bun run download-caches` fetch one). The cache is Jagex's: keep it out of your repository.
5. Call `Bzip2.initWasm()` and `Gzip.initWasm()` (`rs/compression/`) before loading anything, and
   import `style/engine.css` once, as Run Escape's `src/index.tsx` does.
6. Give the systems your game's own names and keys: `new GameInput(canvas, { pads })` with your
   `PadBindings` (`DEFAULT_PAD_BINDINGS` otherwise), `new GameAudio(settingsKey)`,
   `new SaveLock(lockName)`, and a `setUpTouchScreen()` call on a page with touch controls. Once
   players have saves and settings under those names, never change them.
7. Give your agents the guide: Claude Code reads `CLAUDE.md` when it works in this folder, and
   your project's own `CLAUDE.md` can bring it in everywhere with a line `@engine/CLAUDE.md` (the
   folder's path in your project). Other agents can be pointed at it the same way.

Its tests run under the repository's vitest with the rest (`bun run test`), and on their own with
`bun run vitest run engine`.
