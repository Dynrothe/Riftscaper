# Riftscaper: a guide for agents

Riftscaper is an action RPG in the Old School RuneScape world on the engine in `../engine`.
`../AGENTS.md` says what's what (the game, Runefall, the engine, ScapeRune, Run Escape, the cache)
and how to set up. Read these first, in this order:

1. `README.md`: how the game is played, and where everything is ("How it's put together").
2. `docs/design.md`: the design: the pillars, the loop, every system with its numbers and the
   reasons behind them, the architecture's rules, how to add things, the checks, and what's rough.
3. `docs/city.md`: how the city was measured and planned.
4. `../engine/CLAUDE.md` and `../engine/scaperune/CLAUDE.md`: the engine's guide and ScapeRune's
   (the engine's map maker, which makes the city's land and every rift), whose rules this game
   keeps. Their paths starting `src/game/` or `scripts/` are Run Escape's, and aren't here.

The game is Riftscaper, and so is everything of its own: the folder, the scripts, the save keys.
Runefall is the city's name (`CITY_NAME`), and the fall of stone it's named after, never the
game's. The game was once called Runefall: its saves are moved from their `runefall-` keys as it
opens (`moveOldKeys` in `client/settings.ts`), which must stay, and a save key is never renamed
again without a move like it.

The rules in one breath: content is data in `src/content/`, rules are the sim's in `src/sim/`,
and the sim is deterministic (a seeded `Rng` and `fm`, never `Math.random` or `Math.sin`);
everything on screen is a real asset from the cache, looked up with `scripts/`, never from memory,
and looked at in the game before it's built with; the interface is dressed as the OSRS client's;
saves never lose a key or an order players' data depends on (`CLASS_IDS`, passive node ids).

Note every change a player would notice in `CHANGELOG.md`, under Unreleased and Added, Changed
or Fixed: one bullet a change, as short as it can be said, on one line. The title shows it
(What's new). A release, which is the developer's call, bumps `package.json`'s version and turns
Unreleased into that version's heading with the date; `changelog.test.ts` checks the two agree.

Before finishing: `bun run tsc --noEmit -p riftscaper`, `bun run vitest run riftscaper`, and
`bun run tsx riftscaper/scripts/city-map.ts` if the city changed; then look at it running
(`bun run riftscaper`, port 5188). Keep `README.md` and `docs/design.md` true to what changed.
