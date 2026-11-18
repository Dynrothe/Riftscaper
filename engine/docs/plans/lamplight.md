# Lamplight: a plan

A plan for a second game on the engine, written on 2026-11-06 against the `engine-folder` branch of
Run Escape's repository. Paths are from the engine's folder unless they start `src/game/` or
`scripts/`, which are Run Escape's, as worked examples. Where its numbers drift from the code, the
code is the truth. E3 is built, and a prototype of the first two steps of the build order is in the
`lamplight/` folder beside the engine's; each says so where it's described. The rest isn't built
yet.

## The game

You go down into the dark places of Gielinor with a lantern, and come back up with what you found.
Light is how you see, and it's also how you're seen. Every light you carry, set down or kindle shows
you the way and shows you to whatever is down there. Closing the lantern hides you, and leaves you
blind among things that hunt in the dark.

It's a top-down survival horror game, played in runs: each run is a delve of a few floors under a
real place, generated each time, with the cache's own crypts, caves and cellars. It's solo first,
and deterministic from the first day, so co-op can come later.

**What decides the rest:**

- **Light is a trade, never free.** Lighting more shows you more and shows you to more. Every light
  source has a cost: fuel, noise, a direction it doesn't light, a danger it brings.
- **The dark is never safe either.** Some things only hunt in light, and some only in the dark.
  Hiding means choosing which of them you're hiding from.
- **Every death is explained.** Anything that kills you was seen or heard first: eyes in the edge of
  the light, a sound behind a door, a shape on the minimap. That's the lesson of Run Escape's boss
  documents (`docs/design/README.md`), and it matters more in the dark.
- **Real assets.** Monsters, lanterns, fires and rooms are the cache's own, as everywhere on the
  engine. The dark makes it a different game, without the world looking any different.

## A delve

1. **The camp**, at dusk, above a way down: the Lumbridge Swamp Caves, the Barrows, Mort Myre,
   the Morytania Slayer Tower's cellars. You choose your light, your fuel and a few tools, and go
   down.
2. **Each floor** is a few rooms and the passages between them, generated from a seed with set
   pieces cut from the real place. Relics lie in the rooms, and the way down is somewhere past them.
   You can go back up at any stair, keeping what you carry.
3. **Going deeper** gives more and better relics, less fuel lying about, and more of what's down
   there. It's yours to choose when to turn back.
4. **Dying** loses what you carried this delve. What you brought up buys better lanterns, lenses
   and tools at the camp, and opens new places to go down.

A delve lasts 10 to 25 minutes. A floor takes 3 to 6.

## Light

**What you carry.** Each light source is a real OSRS item, with its look from the cache:

| Light            | Radius            | Its catch                                                  |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| Candle           | small, flickering | Burns fast; a naked flame, so it lights swamp gas          |
| Oil lamp         | medium            | Can't be shut                                              |
| Oil lantern      | medium            | Shuttered: open or closed at a press                       |
| Bullseye lantern | far, in a cone    | Lights only the way you face it; shuttered                 |
| Mining helmet    | small             | Leaves both hands free (a tool and a light); can't be shut |

- **Fuel** burns while the light's open. A shut lantern keeps its flame, and opening it is
  instant. Oil and candles lie in the rooms, never enough.
- **Throwing light.** A lit torch or a flare thrown down a corridor lights where it lands for a
  while. It draws what sees light to it, and lets you see what's there.
- **Fixtures.** Sconces, braziers and fires in the rooms, lit or cold. Lighting one makes a room
  you can see in, and that things come to look at. Some are lit when you arrive, and some go out.
- **Swamp gas.** Pockets of it in the swamp caves: a naked flame (a candle, a torch) set off a
  blast, which is loud and hurts. Enclosed lights are safe. This is after the Lumbridge Swamp
  Caves' own gas.

**What the dark is.** Pitch black: the ambient is 0, so out of every light there's nothing at all
(Run Escape's dark is about 0.16). The first plan was near black, 0.05 to 0.1, with a setting for how
dark; the prototype's first playtest asked for pitch black and no such setting. What you can't see
isn't drawn at all: rooms you haven't seen into are black, rooms you have are a dim memory, and the
minimap shows only what you've seen.

**Sanity.** The dark wears your mind away, and light brings it back. With none left, the dark
starts to hurt. You can hide in the dark but not live there, so the lantern can't simply stay shut.

## What's in the dark

Each kind hunts by one thing, so the player can learn it and choose:

- **The watchers** (ghouls) see light. They see you from as far as your light reaches plus a few
  tiles, if nothing stands between you. They chase what they see, and lose you when you go dark and
  out of their sight, then search where they saw you last.
- **The listeners** (cave horrors) are blind and hunt by sound: running, doors, a fight, a blast. A
  lit lantern means nothing to them, so you walk past one slowly, light open.
- **The shades** (the shades of Mort'ton's kind) can't stand light. They never cross a lit tile, and
  stalk whoever's in the dark. A shut lantern among shades is the worst place to be, and lighting
  a brazier drives them off.
- **The moths** (bats) are drawn to light in a swarm. Alone they do little, but they're loud, so they
  wake the listeners.

Look up their ids with `scripts/cache/find-npcs.ts` (Run Escape's, and it copies over), and check
each animation plays on its model, as Run Escape's `.claude/rules/adding-content.md` says.

**Fighting** is possible and always loud. A few tools stun or drive things off at a cost: a flare
burst spends fuel, and a thrown pot breaks on whoever it hits and on the floor. Killing is rarely
the point.

## Places

- **Generated floors**: rooms and passages from a seed (engine work E8), in the look of the place
  you went down from: the swamp caves' rock and water, the Barrows' crypt tunnels, Mort Myre's
  rotten cellars.
- **Set pieces** cut from the real place with ScapeRune's prefabs: a real crypt, a real cellar, a
  room of the Slayer Tower, joined to the generated passages.
- **Hiding places**: dark corners, alcoves, behind pillars, and in places that block sight
  (`canSee`, E3) without blocking light. A floor's check makes sure there's somewhere to hide every
  so many tiles along any way through.
- **Doors** that open and close (E7). They stop sight and light, and muffle sound, until opened.

The renderer draws one plane, so each floor is its own arena, not a level above or below another.

## Between delves

The camp is a small surface map at dusk, where you buy and upgrade things with relics:

- bigger oil flasks;
- lenses for the bullseye (a wider cone, or a longer one);
- a quieter step;
- tools: flares, pots, a lockpick;
- the next places to go down.

What you've bought is kept, and so is a record of which places you've delved and what you found
there. As in Run Escape, the save is only written through the game's own save path, under keys that
never change once players have them (`save/SaveLock.ts` for one tab at a time).

## What the engine has for it

| Lamplight needs                        | The engine has                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| The world, from the cache              | Everything: the cache, the renderer, actors baked and drawn, spot animations              |
| A light you carry, lights that flicker | `render/DrawnLights.ts`, `LightLook.ts` (flicker, pulse), `LightBudget.ts`, `LightMap.ts` |
| Black out of every light               | The ambient (0 is black), and drawing some things unlit (`ActorDrawOptions.unlit`)        |
| Whether a spot's lit, for the sim      | `world/Lighting.ts` (`isInLight`, `AmbientFade`), with no walls yet                       |
| Glowing scenery: fires, sconces        | `DrawnLights.offerGlowLocs`, found as the arena's collision is built (`glowLocs`)         |
| Walking through dungeons               | `world/ArenaGrid.ts`, `Collision.ts`, and the character controller                        |
| Monsters finding their way             | `world/FlowField.ts` (to any target, round walls)                                         |
| Whether a monster can see you          | `world/Sight.ts` (`canSee`, E3)                                                           |
| Rooms that aren't in OSRS              | ScapeRune: recipes, prefabs, `Ground`, sealed rooms, reachability checks                  |
| Sound                                  | `audio/GameAudio.ts`: the client's sound effects, by distance and side, and music         |
| Keys, pads, phones                     | `input/`: one move from all three, and pads' buttons as keys                              |
| A run you can replay                   | A seeded `Rng` and `fm`, which a lockstep game needs too                                  |
| Hosting                                | The slim cache, in chunks, and `vite.ts`                                                  |

## Engine work

Each item goes into the engine, so it's there for any game, with what's Lamplight's handed in (the
engine's rule, `CLAUDE.md`). Each has a default that keeps Run Escape as it is: Run Escape's lights
go through walls today, and should keep doing so until it opts in. They're in the order they're
needed (see the build order below).

### E1. Lights that walls stop

The light map adds every light as a soft disc, through walls. Lamplight needs a room's fire to light
the room and not the corridor behind its wall.

- `world/Visibility.ts` (new): which tiles a point can see within so many tiles, by the grid's
  projectile-blocking flags (`OBJECT_PROJECTILE_BLOCKER` and the `WALL_*_PROJECTILE_BLOCKER` ones,
  `rs/pathfinder/flag/CollisionFlag.ts`). Those are the flags the client keeps for what a shot can
  pass, so a fence or a low wall lets light by and a real wall doesn't. Symmetric shadowcasting, in
  integers, so the sim can use it too (E2). The grid has them already: `SceneBuilder` sets them
  from each loc's `blocksProjectile`, and `RegionDataLoader` hands `ArenaGrid` the flags whole.
- `render/LightMap.ts`: `add` takes a light's visibility and scales each texel by it. A texel's
  share comes from the four tiles round it, so a shadow's edge is half a tile soft, not a staircase.
- `render/DrawnLights.ts`: hand it the grid to turn this on. It works out a light's visibility once
  for a light that stays put, and again for one that moves only when it changes tile, or when the
  grid's `version` goes up (a door, a fallen tile).
- `lights.glsl`: a wall reads the light where it stands on the ground (`applyLight(color, pos,
...)` takes only the position), so both faces of a wall get the same texels, and the dark side of
  a lit wall would glow. Read the light map a quarter of a tile out along the face's normal. Check
  first what normals the world's and the actors' shaders have.
- **Done when** a fire lights its room and not the corridor behind the wall, a fence doesn't cast a
  shadow, `LightMap` has tests with walls (`makeGrid`), and 24 lights stay within a phone's frame
  in `FrameProbe`'s CPU time.

### E2. Light the sim can see

A watcher has to know whether you're lit, through the same walls as what's drawn, and the same on
every machine.

- `world/Lighting.ts`: `lightAt(lights, grid, x, y)`, how much light reaches a spot (the same
  falloff as `LightMap`'s, in plain arithmetic), and `isInLight` with walls when it's handed a grid.
- It uses E1's visibility, so what's drawn and what the sim believes agree to the tile.
- Held to `fm` by `engine.test.ts`, like the rest of `world/`.
- **Done when** a light behind a wall leaves a spot dark to the sim and to the eye alike, and a
  seeded run's hash is the same on every run.

### E3. Line of sight

- `world/Sight.ts` (new): `canSee(grid, x0, y0, x1, y1)`, a ray over the tiles against the
  projectile-blocking flags, symmetric: if one sees the other, the other sees it back. What a
  monster's eyes take in on top of that (a cone, how far, how lit) is the game's.
- `world/testGrid.ts`: `makeGrid`'s `|` and `_` are walls for walking only. Add characters for walls
  that block sight too, rather than change those two, which other tests rely on.
- Floor pillars already block sight (`ArenaFloor.blocksSight`); `canSee` should agree with them on a
  floor.
- **Done when** a fence doesn't block sight, a wall and a pillar do, corners are the same both ways,
  and it's cheap enough for every monster every few ticks.
- **Built** (2026-11-06): `world/Sight.ts` walks every tile a line touches, in integers. Where the
  line runs exactly through a corner, it sees past if either side is clear, which keeps it the same
  both ways round. `makeGrid` has `]`, `=` and `@` for walls and a loc that stop sight, and
  `Sight.test.ts` covers fences, walls, rocks touching at a corner, a floor's pillars and dropped
  tiles, and symmetry over every pair of tiles in a room. Lamplight's prototype has 5 watchers look
  every 5 ticks. Nothing has measured its cost on a phone yet.

### E4. A light in a cone

- `LightLook` gets `cone?: { width: number }` (radians), and a light offered with one takes the way
  it faces (`DrawnLights.offer(..., yaw)`). `LightMap` keeps a texel's light by its angle from that
  way, with a soft edge, and `lightAt` does the same.
- **Done when** the bullseye lantern lights a wedge that turns with the player's aim, and a watcher
  standing behind it sees nothing.

### E5. Noise

- `world/NoiseField.ts` (new): many noises at once, each as loud as so many tiles, spread by one
  Dijkstra a tick over the steps a walker can take (`Steps`, as `FlowField` does). Walls stop it,
  doors cost it more, and it goes round corridors, not through rock.
- `heardAt(x, y)` gives the loudest a spot hears, and the step towards it, so a listener can walk
  to where it came from.
- It's `FlowField` with many sources and a cap on how far it goes; a goal-seeking `FlowField` (to
  the keep, not the player) wants the same many-source update, so do both together.
- **Done when** a noise behind a wall is heard round the corridor and not through it, and ten noises
  a tick cost little enough on a phone.

### E6. What the player sees

The fixed top-down camera shows everything round you. A horror game needs what you can't see to be
black.

- A sight map beside the light map, or in its spare channel: 1 where the shown player can see now (in
  sight, E3, and lit, E2), a remembered value where they have seen, and 0 everywhere else. The
  shaders draw what's unseen black and what's remembered as a dim wash.
- What the player can't see isn't drawn: the game doesn't submit it, so no silhouette of it shows
  through a wall either (`ActorDrawOptions.silhouette` is already each actor's choice).
- The minimap (`components/`) takes the sight map, and shows only what's been seen.
- **Done when** walking a corridor shows each room only as you see into it, and the minimap fills in
  as you go.

### E7. Doors

This is the first piece of "scenery that changes at run time", which any game on the engine wants.

- A door's closed and open locs are different ids in the cache, the open one turned and on the
  next edge. Opening swaps its wall flags on the grid (`ArenaGrid`, then `Steps.refresh` and
  `version`), so walking, sight, light and noise all follow.
- Map squares are baked with their locs, so a door that can change is left out of its square (a
  recipe's list, or `LocOverrides`) and drawn as an actor, both ways, with its own open and close
  animation when it has one.
- **Done when** a door opens and shuts, a monster paths through it only while it's open, and light
  and sight stop at it when it's shut.

### E8. Dungeons in ScapeRune

The generator makes land. Lamplight needs what's under it.

- A dungeon recipe: rooms, passages, loops and dead ends from a seed, laid out against a map of what
  each tile's for, as towns are. It's built from the cache's own dungeon floors, walls and props by
  place: the swamp caves, the Barrows tunnels, crypts and cellars. It has set pieces from prefabs,
  and fixtures, gas and hiding places as data.
- Checks, as ScapeRune's are: every room reaches the stairs, there's somewhere to hide every so
  many tiles along any way through, no lit corridor is too long to cross, and the usual collision
  and hidden-floor checks.
- **Done when** a seeded floor of 4 to 8 rooms builds, passes its checks and plays, for two places.

### E9. Going down a floor

A run builds its arena once, as it starts. Lamplight changes arena at every stair.

- Build the next floor's arena (its squares and its grid) while this one's played, then swap behind
  a short fade. That takes the run's state across, and drops the last floor's actors and squares.
- **Done when** going down takes under a second after the fade on a phone, with no hitch before
  it.

### E10. Sound in the dark

- `GameAudio`: a sound that came round walls is muffled by how much longer its way was than a
  straight line (E5's path length), through a low-pass filter.
- A cave's echo (a convolver, or a cheap delay).
- Looping ambience by area, and music in layers that come in as things close in. Lamplight's
  prototype has its own layered music, made with Web Audio through `GameAudio.onMusicOutput`.
- **Done when** a ghoul behind a door sounds like it's behind a door.

### E11. Aiming

- `GameInput` gives a move. Lamplight also needs an aim: the mouse's point on the ground (back
  through the camera), a pad's right stick, or a second stick on a phone, which `TouchStick` can
  already be.
- **Done when** the bullseye turns with the mouse, the right stick and a thumb.

### E12. Co-op, later

Co-op's lockstep and rooms are Run Escape's today (`src/game/client/coop/`, `server/`). Moving them
into the engine is on the list of engine work that pays off for many games. Lamplight only needs it
if it gets co-op: its sim is deterministic from the start so that it can.

## Lamplight's own work

This lives in the new project, not the engine:

- **The sim**: its tick, the player, fuel, items, fixtures, gas, and the monsters' minds (patrol,
  suspicious, searching, chasing, lost, and shades' fear of light), on a seeded `Rng`.
- **Content** as plain data with real cache ids: monsters, light sources, tools, fixtures, places
  and their floors.
- **The screens and HUD** (the engine has none): fuel, what you carry, a cue for what you've heard
  and from where, and the camp.
- **Saves and settings**, including a brightness setting. There's no "how dark" setting: the dark
  is pitch black on purpose, and brightness is a power, so it can't lift black.
- **A route bot**, as Run Escape has a balance bot: it plays a floor headless and says whether it can
  be crossed unseen, and how often it's caught, by floor and seed.

## Build order

Each step ends in something to play, and a question for the playtest.

1. **The dark** (no engine work). Make a new project from the engine (`README.md`'s steps), and a
   dark ScapeRune map with a lantern that flickers, burns oil and opens and shuts. It should run on
   a desktop and a phone. _Is walking in the dark with a lantern already tense?_
2. **Being seen** (E3). Watchers that see the light with `isInLight`, walls or not, and `canSee`.
   They chase what they see and search where you were. Use one hand-made floor, a real crypt cut
   with prefabs. _Does shutting the lantern feel like hiding? This is the go or no-go._

   **Prototyped** (2026-11-06), steps 1 and 2 together, in `lamplight/` (its `README.md` says how to
   run it). It has the lantern (it flickers, burns oil, gutters when low, opens and shuts), ghouls
   that patrol, stare, chase, search where they saw you and give up, and relics, oil and the rope
   out to make a run. Where it differs from the steps:

   - The floor is the real Lumbridge Swamp Caves from the cache, not a ScapeRune map or a crypt cut
     with prefabs.
   - A ghoul sees the lantern within its radius plus 4 tiles, if `canSee` agrees. With the lantern
     the only light, that's what `isInLight` would say.
   - Noise is a straight-line distance until E5.
   - It hasn't been played on a phone: it has no touch controls yet.

   After its first playtest (2026-11-07) it gained:

   - Pitch black, with no setting for how dark.
   - Sanity, which the dark wears away and light brings back. As it goes, the screen closes in,
     and you hear dread, your heartbeat, whispers and ghouls that aren't there. At none, the dark
     takes a hitpoint every 2.5 s.
   - Nothing of a ghoul shows in the dark, not even its eyes or marks.
   - Music, made as it plays (`lamplight/src/client/Music.ts`): a drone and the cave's air while exploring,
     dread as sanity goes, and a driving chase that crossfades in while one's after you.
3. **Shadows** (E1, E2, E6). Lights stop at walls, for the eye and the sim alike, and what you can't
   see is black. Measure a phone. _Can you read a room from the light in it?_
4. **Sound** (E5, E10). Listeners, noise from running, doors and fights, and muffled sound.
   _Can you tell where a sound came from without seeing it?_
5. **Floors** (E7, E8, E9). Doors, generated floors for one place, and going down. _Is a new floor
   as good as the hand-made one?_
6. **The tools** (E4, E11). The bullseye, thrown light, fixtures, gas and shades. _Does every light
   source get chosen by someone?_
7. **The run and the camp**: relics, upgrades, saves, more places. _Do players go one floor deeper
   than they meant to?_
8. **Co-op**, if wanted (E12).

## Numbers to start from

These are guesses to tune, not decisions.

| What                                        | Start at                              |
| ------------------------------------------- | ------------------------------------- |
| Ambient on a floor                          | 0: pitch black out of every light     |
| Sanity in the dark                          | gone in 30 s, back in 45 s of light   |
| With no sanity left                         | a hitpoint every 2.5 s                |
| Candle                                      | 2.5 tiles, flicker 0.3, 90 s a candle |
| Oil lantern                                 | 5 tiles, 3 minutes a flask            |
| Bullseye lantern                            | 9 tiles, a cone of 40 degrees         |
| A watcher sees a light from                 | its radius plus 4 tiles, in sight     |
| A watcher gives up searching after          | 12 s                                  |
| Noise: walking, running, door, fight, blast | 2, 7, 6, 10 and 16 tiles              |
| A door costs noise                          | 4 tiles                               |
| A floor                                     | 4 to 8 rooms, 60 to 90 tiles across   |

## Risks

- **Too dark to play.** Phones outdoors, cheap screens and people who can't see well. The dark is
  pitch black by choice, so the lantern's light has to be enough to play by; keep the brightness
  setting for that. What hunts you in the dark can't be seen, so sound has to tell you instead:
  the chase music, and later where a sound came from (E5, E10).
- **The light map is flat.** Walls and tall things take their light from the ground they stand on.
  E1's normal offset is the fix, and it needs trying early, in step 3.
- **A phone's CPU.** Shadows, sight and noise all run on the CPU. Cache everything that doesn't
  move, work sight out every few ticks rather than every one, and measure with `FrameProbe` at every
  step.
- **The fixed camera.** A top-down camera shows a lot, and the sight map (E6) is what makes it a
  horror game rather than a game in the dark. If that doesn't work, nothing else will.
- **The cache is Jagex's.** Lamplight is a free fan project, as Run Escape is, and the cache stays
  out of its repository.

## Open questions

- Solo only, or co-op too? It changes how hard a watcher should be, and whether E12 is in.
- Runs that lose what you carried, or a gentler death?
- How much fighting: none, a little, or a style of play of its own?
- Which places first? The Lumbridge Swamp Caves have the gas and need a light in OSRS already; the
  Barrows have the crypts.
- Phone first, or desktop first with phones after?
