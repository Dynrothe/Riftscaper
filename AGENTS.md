# Riftscaper: a guide for agents

For agents of any kind (Claude Code reads it through `CLAUDE.md`), and for anyone new to the code:
what's what, where things are, what to read and how to work. The guides it points to have the
rest.

## What's what

- **Riftscaper** is the game: an action RPG in the Old School RuneScape world, in the mould of
  Diablo and Path of Exile, played in the browser. You make a hero of one of six classes, go
  through rifts (stretches of land made from a seed, deeper and harder each time), kill the
  guardian at the far end and come home stronger: loot with random affixes, gems in your gear's
  sockets for skills, runes, and a passive tree of 800 nodes. It's in `riftscaper/`.
- **Runefall** is the walled city the hero lives in between rifts, and the fall of rune-stones
  it's named after. It was the game's name once; now it's only the city's (`CITY_NAME`). Saves
  from then, under `runefall-` keys, are moved to `riftscaper-` ones as the game opens.
- **The engine** (`engine/`) is everything that isn't the game: reading the OSRS cache, drawing
  the world and its characters with WebGL, input from keys, a controller or a touch screen, sound,
  collision, path finding and deterministic maths. It started as
  [rs-map-viewer](https://github.com/dennisdev/rs-map-viewer) (BSD 2-Clause, `engine/LICENSE`),
  imports nothing from outside its folder, and is shared with other games.
- **ScapeRune** (`engine/scaperune/`) is the engine's map maker: it makes maps that aren't in OSRS
  (ground, heights, water, paths) from a recipe and a seed, with the cache's real objects and
  buildings on them. Riftscaper's city stands on land it makes (`riftscaper/src/world/cityGen.ts`),
  and every rift is one of its maps (`riftscaper/src/world/zoneGen.ts`). ScapeRune was also the
  name of the project this repository was split out of, which held the engine and several games;
  the map maker app (`mapmaker/`) and its other games are there, not here.
- **Run Escape** is the game the engine was first made for, a Vampire Survivors-style game in a
  repository of its own. The engine's guides use its files as worked examples: a path in them that
  starts `src/game/` or `scripts/` is Run Escape's, and isn't in this repository.
- **The cache** is the OSRS client's data, and Jagex's: every model, animation, sound, sprite and
  map square the game shows comes from it, by id. It's in `caches/`, which is never committed;
  `bun run download-caches` fetches it.

## Where things are

```
riftscaper/              the game
  src/content/           its data: classes, items, gems, passives, monsters, zones, the city's people
  src/sim/               its rules, a tick at a time, deterministic
  src/world/             the land: the city (cityGen.ts) and the rifts (zoneGen.ts), as ScapeRune recipes
  src/client/            the sim on screen: places, camera, input, bakes, and saves (settings.ts)
  src/ui/                React screens dressed as the OSRS client
  scripts/               cache lookups, checks, the balance bot, the slim cache and the cache's download
  docs/                  the design (design.md), the city's plan (city.md), and plans not built yet
  CHANGELOG.md           what players would notice, by release
engine/                  the engine, with ScapeRune in engine/scaperune/
caches/                  the OSRS cache (never committed)
```

## What to read

1. `riftscaper/CLAUDE.md`: the game's rules and checks.
2. `riftscaper/README.md`: how the game is played, and "How it's put together".
3. `riftscaper/docs/design.md`: every system with its numbers and the reasons behind them; section
   12, "Working on it", is how to add things and check them.
4. `engine/CLAUDE.md` before changing the engine or using a part of it the game doesn't yet;
   `engine/scaperune/CLAUDE.md` before changing the land, the city or the rifts' maps.

## Setting up

You need [Bun](https://bun.com/) (the version in `package.json`'s `packageManager`) and Node.js 20
or newer. From this folder:

```sh
bun install --frozen-lockfile
bun run download-caches   # the OSRS cache into caches/, about 190 MB
bun run riftscaper        # the game, on http://localhost:5188
```

The type check, the tests and a build don't need the cache; the game and the scripts do.

## The rules, in short

`riftscaper/CLAUDE.md` has them in full.

- Content is data in `src/content/`, rules are the sim's in `src/sim/`, and the sim is
  deterministic: a seeded `Rng` and `fm`, never `Math.random` or `Math.sin`.
- Everything on screen is a real asset from the cache, its id looked up with
  `riftscaper/scripts/`, never from memory, and looked at in the game before it's built with. The
  interface is dressed as the OSRS client's.
- Saves never lose a key or an order players' data depends on (`CLASS_IDS`, passive node ids). A
  save key is only ever renamed with a move, as `moveOldKeys` in `client/settings.ts` does.
- The engine imports nothing from outside `engine/`, and holds nothing of one game's: the game
  hands it what's its own.
- Write the game's name as Riftscaper and the city's as Runefall.
- Every change a player would notice goes in `riftscaper/CHANGELOG.md`, under Unreleased.
- There's no formatter config, and the code isn't any formatter's output: never run Prettier or
  another formatter over a file, which rewrites all of it. Match the code round you: four spaces,
  double quotes, semicolons.
- The cache and builds (which carry a slim copy of it) are Jagex's: never commit them.

## Before finishing

```sh
bun run typecheck                           # the engine on its own, then the game
bun run vitest run riftscaper               # the game's tests; bun run test runs the engine's too
bun run tsx riftscaper/scripts/city-map.ts  # if the city changed
bun run riftscaper                          # then look at it running, on port 5188
```

Keep `riftscaper/README.md` and `riftscaper/docs/design.md` true to what changed.
