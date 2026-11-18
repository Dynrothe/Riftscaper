# Design documents

Run Escape's design records for its bosses and maps, copied here on 2026-11-06 as worked examples
for games built on the engine. They're records of what was decided and why, written while the work
was done: they aren't kept up to date here, and the code they name is Run Escape's. Run Escape keeps
its own copies in its `docs/design/` and `docs/plans/`. Dynny, in them, is Run Escape's owner and
playtester.

## What's here

| Document                 | What it is                                                                                        | Read it for                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `phosanis-nightmare.md`  | A bullet hell boss fight: its design, two playtests, its arena and what each round changed        | Designing a hard fight that stays fair, and how playtests turn into fixes                    |
| `phosani-harder.md`      | The plan that fight's rework followed, with the bullet hell reading behind it and its sources     | How to diagnose a fight that's too easy, and stage the fixes                                 |
| `justiciar-zachariah.md` | A second boss fight, built on what the first taught, with its numbers and the bot's               | A fight whose phases go by hitpoints, an arena that fights too, and tuning a fight's length  |
| `map-depth.md`           | How deep or high a map can go and still read from the top-down camera, measured                   | Heights for walkable ground and for backdrops; the numbers behind ScapeRune's Height section |
| `act-2-fallen-empire.md` | A campaign expansion: four maps, each with a rule of its own, a finale, rewards and a build order | Planning many maps and bosses at once, and listing the engine work they share                |

`phosani-harder.md` was in Run Escape's `docs/plans/`, where `phosanis-nightmare.md` points to it.
`act-2-fallen-empire.md` mentions a `quarry-colossus.md` as the shape for a fight's doc; it isn't
here, and the two boss documents are that shape.

## Whose names are whose

- **The engine's**, and in this folder: ScapeRune and its recipes, prefabs, `Ground` and checks;
  `ArenaGrid`, collision, flow fields and `FlightGrid`; actors, spot animations and their baking;
  lights, the light map and the light budget; the camera; the cache's ids.
- **Run Escape's**, not here: `Sim` and its tick, `MapDef`, `EnemyDef`, `BossAttackDef`,
  `GroundPatternDef` and the other content types; the balance bot (`scripts/game/simulate-run.ts`);
  anything under `src/game/`. They show how a game used the engine, not what the engine has.

## What they learnt

These come up again and again in the documents, and hold for any game on the engine:

- **A death the player can't explain is the failure, not the difficulty.** Every big hit gets a
  long warning.
- **What's drawn is what's hit.** A hit's area is what the player sees, made of the cache's own
  models and spot animations. It answered more playtest complaints than any new rule.
- **More bullets isn't harder.** Structure and timing are: a slow pattern to cross with aimed
  shots over it, random starting angles so nowhere is safe for free, and tempo that rises through
  the phases.
- **Do the arithmetic before tuning by feel.** How long the player takes to cross a stream sets
  how fast it can come; a fight's length is its hitpoints over the damage the kit can do.
- **A bot can't judge a fight it can't dodge.** Its numbers say how long the kit takes. Every real
  finding about difficulty came from a person playing.
- **New behaviour goes in as a data field whose default keeps everything else as it was**, with a
  test pinning it, so other fights and maps never move.
- **See every visual change before calling it done**, frame by frame for an animation used as a
  warning. A change that wasn't seen cost a round each time.
- **Settle how often something comes before tuning how it looks**, and ask about a word that can
  mean two things.
- **Height reads well up to about 4 tiles where players walk.** Past that it's scenery, and it
  needs a face turned to the camera to look deep (`map-depth.md`).

## Writing one for your game

The boss documents share a shape, which works for any fight or map:

1. **What it is**: where it sits in the game, who plays it and with what.
2. **Principles**: what decides the rest, and where each came from.
3. **The arena**: where its pieces come from in the cache, and what was tried.
4. **The fight**, phase by phase, with numbers.
5. **Fighting back**: what the player can do about each attack.
6. **Pace**: how long each part takes, before and after a change.
7. **Playtest rounds**: what the player said, what changed, what was kept.
8. **Decisions in one place**, **what's open**, and **what wasn't verified**.
9. **Fields added** to the content types, with their defaults.

Date it, name the branch it was written against, and say that the code is the truth if its numbers
drift.
