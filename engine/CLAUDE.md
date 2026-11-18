# The engine: a guide for agents

This folder is a game engine for top-down games set in the Old School RuneScape world, with
everything on screen from the OSRS cache. It came out of Run Escape (a Vampire Survivors-style
game), which is still its first game, and it's meant to be copied into new projects. `README.md`
lists what it does; this guide is how to work with it. ScapeRune, its map maker, has a guide of its
own (`scaperune/CLAUDE.md`), and so does a floor that rises and falls away (`floor/CLAUDE.md`). Boss
and map design documents from Run Escape are in `docs/design/`, and `docs/plans/lamplight.md` is a
plan for a second game on the engine, with the engine work it needs.

Paths here are from this folder, unless they start `src/game/`, `scripts/` or `docs/` outside it:
those are Run Escape's repository, given as worked examples. A project that copied only this
folder doesn't have them.

## The rules

- **Nothing in here imports from outside this folder.** `engine.test.ts` fails if something does.
  Imports are relative, with no aliases, so the folder works wherever it's put.
- **The game hands the engine what's its own.** Names, keys and numbers that belong to one game are
  arguments, not constants in here: what a controller's buttons do (`PadBindings`), where sound
  settings are kept (`new GameAudio(settingsKey)`), the save lock's name (`new SaveLock(name)`),
  a character's speed and rules (`MoveRules`), a map's recipe (`MapRecipe`). A field of the game's
  own on an engine type goes on by declaration merging (Run Escape puts `mapDef` on `MapRecipe` in
  `src/game/scaperune/maps/recipes.ts`), never by editing the type here.
- **A system that isn't one game's goes here**, with what's the game's handed in. Moving
  something in means taking out every reference to the game: its names, its content's ids, its
  keys. `bun run tsc --noEmit -p engine` type checks this folder with nothing of the game's, so
  it finds what's left.
- **Never rename a key or a name players' data sits under** once a game ships with it: a
  localStorage key, a Web Lock's name, a Cache API cache's name. The game picks them; the engine
  only uses what it's given.
- **The sim is deterministic.** In `core/`, `world/` and `controller/`, a floor's own
  (`floor/ArenaFloor.ts` and `floorLayout.ts`), and any game's sim built on them, randomness comes
  from a seeded `Rng` (`core/Rng.ts`), never `Math.random`, and trigonometry goes through `fm`
  (`fm.sin`, `fm.cos`, `fm.atan2`, `fm.hypot`, `fm.acos`, `fm.pow` from `core/fmath.ts`), never
  `Math`'s. `engine.test.ts` holds those files to it. A lockstep
  game calls `usePortableMath(true)` for a shared run, so every browser rounds alike, and `false`
  after.
- **Show things with real assets.** Bosses, hazards, projectiles and effects use the game's own
  models, spot animations, locs and sprites, so a player reads what's happening from what's in the
  world. Look in the cache first, and reach for a coloured overlay or a flat shape only when nothing
  real can do it.
- **The cache is Jagex's.** It stays out of every repository.

## Where things are

| You want                                                  | Go to                                                                             |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| What the engine does, and setting up a project on it      | `README.md`                                                                       |
| To read the cache: indexes, archives, the slim cache      | `rs/cache/` (`ChunkedCache.ts` for the slim one), `mapviewer/Caches.ts`           |
| A config type: locs, NPCs, items, seqs, spot animations   | `rs/config/`                                                                      |
| Models, animations, textures, sprites                     | `rs/model/`, `rs/texture/`, `rs/sprite/`                                          |
| The world drawn: terrain, locs, culling, fog              | `mapviewer/webgl/`, `render/GameWebGLRenderer.ts`                                 |
| Characters, items and effects drawn anywhere              | `mapviewer/webgl/actor/` (bake with `ActorBakeLoader`, draw with `ActorRenderer`) |
| Work off the main thread                                  | `mapviewer/worker/` (`RenderDataWorkerPool` and its loaders)                      |
| An arena's collision and heights                          | `mapviewer/worker/RegionDataLoader.ts`, then `world/ArenaGrid.ts`                 |
| Moving a circle, a character, a crowd                     | `world/Collision.ts`, `controller/`, `world/FlowField.ts`                         |
| What flies, and over what                                 | `world/FlightGrid.ts`                                                             |
| Whether one spot sees another (line of sight)             | `world/Sight.ts` (`canSee`)                                                       |
| Keys, controllers, touch                                  | `input/`                                                                          |
| Sound effects and music                                   | `audio/GameAudio.ts`, `rs/audio/` (the synthesizer)                               |
| Health bars, names, hitsplats over the 3D view            | `render/Overlay.ts`, `render/Hitsplats.ts`                                        |
| Lights and the dark: drawn                                | `render/DrawnLights.ts`, `LightLook.ts`, `LightBudget.ts`, `LightMap.ts`          |
| What's lit, and the ambient fading, for a sim             | `world/Lighting.ts`                                                               |
| A floor that rises and falls away, tile by tile           | `floor/`, and its guide `floor/CLAUDE.md`                                         |
| The camera                                                | `render/CameraRig.ts`, `mapviewer/Camera.ts`                                      |
| One tab saving, handing the player a file                 | `save/`                                                                           |
| Seeded randomness, what's near, bullets                   | `core/Rng.ts`, `core/SpatialHash.ts`, `core/BulletPool.ts`                        |
| A map that isn't in OSRS                                  | `scaperune/`, and its guide `scaperune/CLAUDE.md`                                 |
| A map made by hand in the map maker, saved and loaded     | `scaperune/mapFile.ts`, and `../maps/README.md`                                   |
| What a frame costs                                        | `render/FrameProbe.ts`                                                            |
| The fonts, the client's interface frame                   | `style/engine.css`                                                                |
| React pieces: the canvas, loading bar, an item's icon     | `components/`                                                                     |
| An item drawn big, crisp (a game piece, not an icon)      | `mapviewer/worker/ItemIconLoader.ts` with a `scale` on the request                |
| Vite settings and plugins                                 | `vite.ts`                                                                         |
| How Run Escape designed its bosses and maps               | `docs/design/`                                                                    |
| A plan for a second game (Lamplight), and its engine work | `docs/plans/lamplight.md`                                                         |

## A game on it, from the page to a frame

Run Escape's `src/index.tsx`, `src/game/GameApp.tsx` and `src/game/client/GameClient.ts` do all of
this; read them when something here isn't enough.

1. **The page.** Call `Bzip2.initWasm()` and `Gzip.initWasm()` (`rs/compression/`) and import
   `style/engine.css` once, before anything else. The page has to be cross-origin isolated
   (`window.crossOriginIsolated`): the cache is shared with the workers in a SharedArrayBuffer.
   `vite.ts`'s `ENGINE_HEADERS` does it in development; a host sends
   `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.
   Check for it and say so, rather than failing somewhere deep in loading.
2. **The cache.** `fetchCacheList(build)` reads `caches/caches.json`; pick your cache from its
   `caches` by name, and `loadCacheFiles(info, signal, onProgress)` loads it (the full cache, or a
   slim one's chunks, kept in the Cache API between visits).
3. **Workers.** `RenderDataWorkerPool.create(n)`: 4, or 2 on a touch screen, as each has its own
   heap. Everything heavy goes through `workerPool.queueLoad(new SomeLoader(), input)`.
4. **The viewer and renderer.** Place the camera and set the render distance in the callback,
   before the first squares queue:

    ```ts
    let renderer!: GameWebGLRenderer;
    const mapViewer = new MapViewer(
        workerPool,
        cacheList,
        [],
        [],
        await caches.open("map-images"),
        WEBGL,
        cache,
        (viewer) => {
            viewer.camera.pos[0] = spawnX;
            viewer.camera.pos[2] = spawnY;
            viewer.renderDistance = 72;
            renderer = new GameWebGLRenderer(viewer);
            return renderer;
        },
    );
    iconCache.setWorkerPool(workerPool); // so ItemIcon can draw icons
    ```

    Mount it with `<RendererCanvas renderer={renderer} />`, and put a 2D canvas over it for the
    overlay.

5. **The game's hook.** `renderer.game` is a `GameFrameHandler`, whose three calls come in this
   order every frame. Heights here are in tiles, negative up (`grid.getHeight(x, y) / 128`, less
   how far above the ground something is):

    ```ts
    renderer.game = {
        update(deltaMs, camera) {
            // Step the sim, read input (input.getMoveVector, input.pollPads), place the camera
            cameraRig.apply(camera, x, height, y);
        },
        submitActors(actors, camera) {
            // Everything that moves, every frame
            actors.draw(model, anim, frame, x, height, y, yaw, options);
        },
        drawOverlay(camera) {
            overlay.begin(camera);
            const p = overlay.project(x, height, y, point); // a health bar, a name, a hitsplat
        },
    };
    ```

6. **An arena.** `queueLoad(new RegionDataLoader(), { baseX, baseY, sizeX, sizeY, plane })` builds
   a rectangle of the world's collision and heights in one scene build; `new ArenaGrid(region)`
   is what the sim walks on. `renderer.setPlayArea(x0, y0, x1, y1, reach)` fades the world out
   past it and drops what can never be seen; `reach` is how far past it the camera can get, so
   change it with the camera's pitch or zoom. `renderer.setPlane(grid.plane)` for a dungeon
   upstairs. A ScapeRune map is `await installRecipe(mapViewer, recipe)` first, then the same.
7. **Actors.** Ask for what's needed as `BakeRequest`s (`ActorBakeTypes.ts`): an NPC with its
   seqs (`NPC_IDLE_SEQ` and `NPC_WALK_SEQ` stand for its own), a player from kits and worn items,
   a spot animation, an item on the ground, a loc (its wall's or diagonal wall's model with
   `modelType`; a multiloc as the scene shows it), or a model recoloured. A loc's picture for a
   list, not drawn in the world, is `LocIconLoader`'s, in software like an item's icon. A loc drawn as an actor lies as the scene places it with
   yaw `rotation * 512`, and 256 more for a diagonal one (type 11). Bake them in small
   batches as they're wanted, not everything at once (see [Keeping it light](#keeping-it-light)):

    ```ts
    const bake = await workerPool.queueLoad<ActorBakeInput, ActorBakeResult, ActorBakeLoader>(
        new ActorBakeLoader(),
        { requests, loadedTextureIds: renderer.loadedTextureIds },
    );
    renderer.updateTextureArray(bake.loadedTextures);
    const models = actors.addBake(bake); // an ActorModel for each request's key
    ```

8. **Sprites and sounds.** `SpriteDataLoader` gives interface sprites (hitsplats' are
   `HITSPLAT_SPRITES`); `new GameAudio(settingsKey)` then `audio.load(workerPool, soundIds)`
   synthesizes sounds off the main thread, and `play` or `playAt` plays them. They come out of
   the synthesizer at full scale, some 20 dB louder than others, and many are a single tone at 4
   to 8 kHz, which pierces: give each a volume (`PlayOptions`) set by how loud it sounds (weighted
   for the ear, over its loudest tenth of a second), not by its peak. A `lowpass` takes hiss off
   a sound's top but erases a sound that's one high tone; `rate` under 1 lowers one instead.
   Measure them, energy by band too, rather than guessing, and don't start a long one again
   before it's finished. A sound starts at its first sound: many, attack sounds above all, open
   with up to 750 ms of silence (the server plays them as a swing starts, and that wait puts them
   on the blow), which `SoundLoader` takes off as the client does (`SoundEffect.trimDelay`), so
   play an attack's sound on its blow.
9. **Lights**, on a map that has them: `renderer.setLighting(true)` as it starts (`false` on one
   without, which pays nothing for them), then each frame, in `update`, offer every light there is
   to a `DrawnLights`, which hands the few that matter to the renderer:

    ```ts
    const lights = new DrawnLights(new LightBudget(MAX_SHOWN_LIGHTS)); // once
    lights.begin(renderer, ambient, 0xffffff, deltaMs / 1000);
    lights.offer(lightKey(KIND_PLAYER, 0), x, y, look.radius, look, true); // the shown player's
    const glowLocs = grid.data.glowLocs; // where the locs RegionDataInput.glowLocs asked for are
    if (glowLocs) lights.offerGlowLocs(glowLocs, glowingLocLooks, KIND_LOC);
    lights.end(renderer, viewX, viewY);
    ```

    A `LightLook` is a radius, a colour, an intensity, and a flicker or pulse that's only drawn.
    `lightKey(kind, id)` names a light the same every frame, so it fades in and out rather than
    popping; a kind is any number of the game's.

## The sim's basics

The engine has no game loop of its own: Run Escape's sim (`src/game/core/Sim.ts`) ticks every 20 ms
on its own, and the client steps it from `update`. What the engine gives a sim:

- **`ArenaGrid`**: `isSolid`, `getFlags` (the client's `CollisionFlag`s), `getHeight(x, y)` in
  scene units (negative is up; divide by 128 for tiles), ledges added at run time (`addLedge`).
  Positions are world tiles as floats, x east and y north; a tile's middle is `.5`.
- **`moveCircle`, `isCircleFree`, `findFreeSpot`** (`world/Collision.ts`): a circle against tiles,
  walls and locs. A loc blocks a little less than its tiles on sides facing open ground
  (`OBJECT_INSET`).
- **The character controller** (`controller/CharacterMovement.ts`):
  `moveCharacter(grid, body, moveX, moveY, rules)` moves one body a tick and turns it to face its
  way. `MoveRules` holds what the game decides: its speed, frozen or held, bounds, a steering matrix, a spot to face, the
  ground's pace and ice. It only writes the body it's given, so a copy can be moved for display
  (Run Escape's co-op prediction). Keep the game's own rules in an adapter that fills `MoveRules`,
  as Run Escape's `src/game/core/PlayerMovement.ts` does, and fill one object rather than making
  one a tick.
- **`FlowField`**: `update(grid, targetX, targetY)` works out the way to a target over a window
  round it; `getStep(grid, x, y, out)` gives each walker its next step. One field moves hundreds of
  enemies. `canWalkStraight` says whether a straight line is clear.
- **`canSee(grid, x0, y0, x1, y1)`** (`world/Sight.ts`): whether one spot sees another, a line over
  the tiles stopped by the grid's projectile-blocking flags, the ones the client keeps for what a
  shot can pass. So a fence or a low wall lets sight by, and a real wall, a rock or a floor's pillar
  doesn't. It's in integers and the same both ways round; where a line runs exactly through a
  corner, it sees past if either side is clear. How far a monster sees, and by what light, is the
  game's.
- **`SpatialHash`**, cleared and filled each tick, `query(x, y, radius, fn)` for what's near.
- **`BulletPool`**: bullets in flat arrays, with nothing allocated in a tick.
- **`Rng`**: one per stream that mustn't disturb another (Run Escape's random events roll on their
  own, so adding one doesn't change every seeded run).
- **Light** (`world/Lighting.ts`): `isInLight(lights, x, y, grace)`, for a rule that goes by what's
  lit (Run Escape's weapons that only aim at what's lit), and `AmbientFade`, a scene's ambient
  fading from one level to another by the tick. Squared distances only, so every machine agrees.
- **A floor that rises and falls away** (`floor/ArenaFloor.ts`): a sim steps it each tick, and it
  drops and restores the grid's tiles itself. `floor/CLAUDE.md` has the rest.

## Content from the cache

- **Look ids up, never from memory.** Run Escape's `scripts/cache/` has `find-npcs.ts` (with idle
  and walk animations), `find-objs.ts`, `find-locs.ts`, `find-npc-seqs.ts` (what an NPC's skeleton
  can play), `classify-npc-seqs.ts` (attack from death), `sounds.ts` (what an animation plays) and
  `sprites.ts png` (sprites have no names: draw a range and look). They take only the cache's
  name from the game, so they copy over with a name of your own.
- **Spell names as the cache does.**
- **A seq id existing doesn't mean the model can play it.** Bake it and look: an NPC can only play
  seqs on its own skeleton.
- **A player's face needs a jaw kit**, on both bodies: the hair's models stop above the chin, so a
  jaw of -1 leaves a hole. No beard is the bare chin, kit 14 on body type A and 296 on B. Newer
  hair and beards are two-tone, with a magenta placeholder the body colours replace
  (`BODY_COLORS_2` in `rs/model/player/PlayerModelLoader.ts`).
- **Attack sounds aren't in the cache.** The server picks them; their ids are on the OSRS Wiki's
  list of in-game sound IDs.
- **Skeletal animations** (newer bosses and creatures) have a pose for every client tick, so a bake
  samples them every `SKELETAL_TICK_STEP` ticks; frame-based ones are baked as they are, or with
  `ActorBakeInput.tweenTicks` smoothed: a keyframe held longer than that many ticks is baked as
  poses moved on towards the next (most hold a pose 4 ticks, 80 ms, which is what makes OSRS
  animation look steppy). It costs a pose's memory per in-between (2 about doubles an animation),
  so a game should let a phone go without (Riftscaper's **Smooth animation**).
- **Only one plane is drawn**, and roofs are hidden. A map whose roofs are plain scenery, or that
  has something floating, needs `mapviewer/webgl/loc/UpperLevels.ts`.
- **Decoders know revision 241's opcodes.** A newer cache can add opcodes; Run Escape's
  `scripts/cache/validate-decoders.ts` decodes everything and fails on a new one.

## Keeping it light

A phone is the budget. Measure with `FrameProbe` (`await frameProbe.sample(60)` in Run Escape's dev
build: triangles, draws and CPU time) rather than the frame rate, which a headless browser can't
tell you.

- **The world** is baked in cells of 8 tiles (32 without `WEBGL_multi_draw`, where each is a real
  draw call) and culled by each cell's box. A change to where `main.vert.glsl` puts a vertex needs
  one in `CullGrid.addInstance` too.
- **Actors** cost their triangles times their frames, in memory. Bake per map what that map uses
  and drop the last map's; merge requests that bake the same model. Indices are 16-bit, cut into
  segments of 65,536 vertices; a model too big for that falls back to 32-bit.
- **Without multi draw** (Safari, Firefox) actors on the same frame of the same animation are drawn
  together, so a crowd of one enemy is a few draws.
- **Lights** cost the same however many there are: `DrawnLights` offers them all to a
  `LightBudget`, which picks `MAX_SHOWN_LIGHTS` each frame, fading them in and out, into a light
  map read once a pixel. A map with none pays nothing
  (`setLighting(false)` builds the programs without them).
- **The overlay** draws each hitsplat once and copies it (`HitsplatImages`): text and gradients
  are the slowest things on a 2D canvas. Prune effects in place and reuse option objects, to keep
  a phone's garbage collector quiet.
- **On a touch screen**: a pixel ratio of 1.5 at most (`DeviceUtil.pixelRatio`), 2 workers,
  textures at half size, and a frame cap. `isCoarsePointer` is how anything asks.
- **A screen that covers the world** (a menu over everything): set `GameWebGLRenderer.holdFrame`
  while it's up. Frames still call the game's `update`, but nothing's drawn, so the GPU is the
  screen's; the canvas keeps its last frame, and a resize meanwhile waits for the next.
- **A lost WebGL context** isn't restored: everything on the GPU would have to be made again.
  Stop drawing (`GameWebGLRenderer.contextLost`), pause, and offer a reload.

## Input, sound and saves

- **`GameInput`** merges the keyboard (WASD and the arrows), a controller and the touch stick into
  one move of length 0 or 1, so the sim can't tell them apart. `onPress` fires once a press;
  `takesKey` and `ownKeys` stop the browser acting on keys the game uses. Keys are dropped when
  the window loses focus.
- **Controllers** send their buttons as the `KeyboardEvent`s the game already answers, so every
  screen works with a pad and nothing new. Only a pad reporting `mapping: "standard"` gets its
  buttons; any other gets the stick. On menus the d-pad moves the focus between buttons in the top
  `PadBindings.modal`, south clicks it, and start clicks `PadBindings.main`.
- **Touch**: `TouchStick` has no DOM; feed it pointer events from a full-screen layer. Call
  `setUpTouchScreen()` once on a page with touch controls, and `enterFullscreen()` from a tap.
  Everything touch hangs off `pointer: coarse`, so a mouse never sees it.
- **Sound** starts on the first press, as browsers require, and plays a few at once, quieter and
  panned by where they are. Music is a looping recording (`playMusic`), or one the game makes itself
  with Web Audio: `onMusicOutput(start)` hands it the context and a node to connect to, which
  follows the music's volume and mute, once the browser allows sound.
- **Saves**: `SaveLock` holds a Web Lock while the page is open, so only one tab writes; a tab that
  gets the lock should read the save again. `saveFile` hands the player a file (the share sheet on
  an installed iPhone game, an app around the game's own way, or a download).

## Hosting

- A slim cache (only what the game reads, a small part of the full one) is chunks named after their
  sha256, listed in `caches.json` with the build they're for. Run Escape's
  `scripts/cache/slim-cache.ts` makes it by loading everything the game loads; it's the game's,
  since only the game knows what that is. A cache made for another build stops partway through
  loading, so check the build in `caches.json` first.
- Chunks and hashed assets can be cached for good; `caches.json` and the page need `no-cache`.
- It needs HTTPS (or localhost) for the Cache API, and a folder's address with its trailing slash.
- `?viewer=1` in Run Escape opens the map viewer itself, which needs the full cache.

## Testing

- `bun run vitest run engine` runs this folder's tests, `bun run tsc --noEmit -p engine` type
  checks it alone, and `engine.test.ts` holds the boundary and the sim's maths.
- Tests run without the cache, so anything needing it skips when it isn't there. Build grids for
  tests with `makeGrid` (`world/testGrid.ts`): `#` solid, `~` water, `^` rock, `|` and `_` walls,
  `o` a loc in the middle of its tile. Those stop walking only; `]` and `=` are walls that stop
  sight and shots too, and `@` a loc that does (a pillar). A solid tile blocks a little less than the whole tile on
  sides facing open ground (`OBJECT_INSET`), so test against it with some room, and the grid's
  outermost ring isn't reliable for wall tests: put walls inside.
- A long test (a whole sim run, a map check) gets its own timeout: a machine running every test at
  once can take several times as long as yours.
- In a browser, headless Chromium needs `--use-angle=swiftshader --enable-unsafe-swiftshader` and a
  persistent profile, or the cache won't fit its storage quota. On Windows keep that profile's path
  short: past 260 characters the Cache API fails with `UnknownError`.
- A tab that isn't painted gets no `requestAnimationFrame`, so the game sits at its first loading
  step: check that frames fire before blaming the game. Its timers run about once a second, so a
  faked button press and release can fall between two polls; hold it for seconds.
- Touch needs `pointer: coarse`: Playwright's `isMobile` and `hasTouch`, or CDP's touch emulation,
  which lasts only as long as the session that set it. A small window isn't a phone.
- Fake controllers by replacing `navigator.getGamepads` with one returning a pad with
  `mapping: "standard"`, `connected: true`, its `buttons` and `axes`.
- Effects last a moment, so a screenshot can miss them: check the state as well.
- In the console, the 404s for the cache's `idx16` and `idx23` are normal.

## Traps

- **Worker-only packages** go in `ENGINE_OPTIMIZE_DEPS` (`vite.ts`): Vite's startup scan doesn't
  follow workers, so it finds them mid-load and reloads the page.
- **A file's data can be part of a bigger buffer** (`Archive` keeps a group's files in one array):
  mind its `byteOffset`.
- **The play area's keep area**: map squares drop what's wholly past the fade and further than the
  camera can get. Raise the camera or pull it back without changing `setPlayArea`'s `reach`, and
  holes show.
- **Frames go straight to the canvas** with no `preserveDrawingBuffer`: read one back in the same
  task as the frame.
- **Collision isn't the drawn squares'**: it's `RegionDataLoader`'s, built for the arena alone.
- **A square built again** (`refreshCustomMapSquares`) is drawn only a few frames after it
  arrives (`canRender`), and a square coming into view fades in from the fog. `MapManager` keeps
  the square it replaces drawn meanwhile, and a replacement skips the fade. Without both, every
  rebuild blinks the square black.

## Keeping this guide true

After a change here, check that this file, `README.md`, `scaperune/CLAUDE.md` and
`floor/CLAUDE.md` still say what's true, and update them with it: new systems, moved files, changed calls, and anything that cost time
to work out. Leave out counts that go stale. `docs/design/` is a record of what was decided, not a
description of the code: leave it as it is. `docs/plans/` is what isn't built yet: when a piece of
it is built, say so in the plan.
