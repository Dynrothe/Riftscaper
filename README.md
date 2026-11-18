# Riftscaper

# NOTE: THIS REPO IS NOT ACCEPTING PULL REQUESTS, IF YOU MAKE PULL REQUESTS, THEY'RE MOST LIKELY GOING TO BE IGNORED!

A Diablo / Path of Exile clone in Old School RuneScape: an action RPG through randomly generated
rifts of Gielinor, drawn with the real models, animations and sounds from the OSRS cache.

The game is in [`riftscaper/`](riftscaper/): [`riftscaper/README.md`](riftscaper/README.md) is how
it's played and how it's put together. (Runefall is its city.) [`engine/`](engine/) is what it's
built on: reading the cache, drawing the world, ScapeRune (the map maker that makes the city's
land and every rift), input, sound and the maths ([`engine/README.md`](engine/README.md)).

New to the code, or an agent? [`AGENTS.md`](AGENTS.md) says what's what, where things are, what to
read and how to work.

## Getting started

You need [Bun](https://bun.com/) (the version in `package.json`'s `packageManager`) and
[Node.js](https://nodejs.org/) 20 or newer.

```sh
bun install --frozen-lockfile
bun run download-caches
bun run riftscaper
```

and open http://localhost:5188. The tests, the type check and a build don't need the cache; the
game and the scripts in `riftscaper/scripts/` do.

### The cache

The game runs on one OSRS cache, `osrs-241_2026-09-30` (revision 241, 30 September 2026:
[OpenRS2 Archive cache 2727](https://archive.openrs2.org/caches/runescape/2727)), set by
`GAME_CACHE_NAME` in `riftscaper/src/cache.ts`. It's read from `caches/` at the repository's root,
which holds a `caches.json` listing the caches and a folder for each with the cache's files, its
`keys.json` and its `info.json`.

`bun run download-caches` (`riftscaper/scripts/download-caches.cjs`) fetches it from the
[OpenRS2 Archive](https://archive.openrs2.org/) into `caches/`: about 190 MB, with room for the
download's ZIP beside it while it unzips. It gives up when nothing has arrived for a minute; on a
connection that drops out for longer, set `CACHE_DOWNLOAD_TIMEOUT_MS` to a longer wait in
milliseconds. You can also copy a `caches/` folder over from another checkout, or link one:

```powershell
New-Item -ItemType Junction -Path caches -Target D:\path\to\caches
```

The first load copies the cache into the browser's cache storage, so later loads are quick. The
cache is Jagex's, so it stays out of the repository (`.gitignore`), as does a build, which carries
a slim copy of it.

## Commands

| Command                         | What it does                                                  |
| ------------------------------- | ------------------------------------------------------------- |
| `bun run riftscaper`            | The game in development, on port 5188 (`bun run start` too)   |
| `bun run build:riftscaper`      | Builds it into `riftscaper/dist/` (`bun run build` too)       |
| `bun run slim-cache:riftscaper` | Puts a slim copy of the cache in the build, for hosting it    |
| `bun run preview:riftscaper`    | Serves the build on port 5189 (`bun run preview` too)         |
| `bun run download-caches`       | Fetches the game's cache into `caches/`                       |
| `bun run test`                  | The engine's and the game's tests                             |
| `bun run typecheck`             | Type checks the engine on its own, then the game              |

## Licence

Riftscaper is under the MIT licence (`LICENSE`). The engine started as
[rs-map-viewer](https://github.com/dennisdev/rs-map-viewer), under the BSD 2-Clause licence
(`engine/LICENSE`). Old School RuneScape and its cache are Jagex's; this is a fan project, not
endorsed by Jagex.
