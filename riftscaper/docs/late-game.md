# Riftscaper: the late game

A proposal, written on 2026-11-16, for the game past rift 16 and level 60: what a hero on the
ladder has to do, to chase and to show for it once the Diablo expansion (`docs/diablo-expansion.md`)
is in. It says what's there now and where it runs thin, what the genre and OSRS do about it, the
pieces that would fit this game and its rules, and an order to build them in. Every number is a
first guess, to be measured with the balance bot (`docs/design.md`, section 13) before it's
trusted. Every cache id named was looked up on 2026-11-16 with `scripts/find-objs.ts`,
`find-npcs.ts` and `find-locs.ts` in `osrs-241_2026-09-30`; each still has to be looked at in the
game before it's built with, and where the cache has several of one name, the one to use is picked
by looking.

It was built on 2026-11-17, all seven phases, with the answers it recommends (section 6). Section 7
says where what was built differs from what's proposed here; `docs/design.md` (section 9, "The late
game") is the design as it stands.

## 1. Where it stands

A hero is 60 at about depth 16. From there the ladder rolls each rift from a land, a host, a
guardian and an encounter; levels go on to 99, a point each; the drops bring elite bases, the
rift-touched tier and high runes; the encounters pay in currencies that buy sets and open the
pinnacles; the web lets the hero choose a bounty. That is a lot, and most of it arrived today. What
it leaves thin:

- **The uniques are left behind.** A unique's numbers are fixed at its own level, whatever level
  it drops at (`rollItem` in `sim/loot.ts` rolls only within a fifth). The eighteen that drop
  anywhere are of levels 15 to 42: an Abyssal whip hits 22 to 34 at depth 40 as at depth 8, where
  a tier-three elite blade is 69 to 111 before its multiple (`ELITE_BLADE` in `content/items.ts`),
  and a skill's damage is a share of the weapon's hit. With its own 30% damage and 15% speed, a
  whip does under half what an Osmumten's fang or a Soulreaper axe does a second. The Heart's five
  are of levels 50 to 55 and the other pinnacles' of 67 and 68, against elite bases to 86. So the
  uniques that are ways to play (section 7 of the design) are worn on the ladder at a cost that
  grows every depth, and builds narrow to rares on elite bases.
- **A pinnacle is done once it has dropped.** Each opens at the deepest rift reached, so it
  climbs with the ladder, but it pays the same. Once a hero has a pinnacle's uniques with good
  rolls, its key piles up: kill count, abyssal ashes, the Heartstone's shards.
- **Currencies pile up.** A kill's gold grows with the monster's level, `(1 to 4) * (1 + 0.7 *
  level)`, and the ladder's levels go on growing (area level 61 at depth 16, 157 at 40: two and a
  half times the gold a kill, with a monster more in every pack each lap), while the gamble, the
  shops and the folk's rewards stop at level 60 (`cityLevel`). Tokkul, Void seals and abyssal
  pearls have nothing to buy once their set is had.
- **The web forgets.** A place cleared moves the hero's lane, and that's all. Nothing about the
  ladder is learnt or kept, so the hundredth ladder rift is chosen as the first was.
- **Nothing keeps score.** There's no record of what a hero has found, slain or done. Half of
  OSRS's late game is its collection log and its combat achievements; Diablo's is its trophies.
- **Level 99 is one more point.**
- **The wall is where it was meant to be.** The bot's damage stops growing about depth 33 to 38
  and its wall is 39 to 45 (design, section 13), as a greater rift's is. That's the genre's, and
  it's fine if a hero at the wall has other things to do. This proposal is mostly those things.

## 2. What the others do

| Game | Its late game | What it shows |
| --- | --- | --- |
| Diablo II | The cube's recipes upgrade a unique to its exceptional and elite base; the Pandemonium keys and Uber Tristram | An old unique is kept worth wearing; a harder version of a fight is content |
| Diablo III | Ancient and primal legendaries, the same item with bigger numbers, dropped deeper; legendary gems ranked in greater rifts | A unique found deeper is a better one |
| Diablo IV | Tormented bosses; masterworking, gold and materials into an item's numbers; the codex of aspects | A gold sink that's a chase |
| Path of Exile | The atlas passive tree, spent to choose what maps hold; uber pinnacles with their own drops; awakened support gems | The player chooses what to farm, and the choice lasts |
| Last Epoch | Monolith blessings kept for good; legendary potential, a unique joined with a rare | What's done once is kept |
| OSRS | Boss parts that upgrade an item (a whip and a kraken tentacle, Dragon boots and a primordial crystal, a fury and a blood shard); imbues; Desert Treasure II's awakened bosses, opened with an Awakener's orb; the collection log; combat achievements in six tiers; pets; the max cape; raids with invocations | All of the above, in the game's own assets |

OSRS's late game already answers each of the gaps above, and its answers are the genre's. So the
expansion is mostly OSRS's late game laid over the ARPG's, as the Diablo expansion laid Diablo II's.

## 3. The pieces

### A. Uniques that keep up

**Rift-touched uniques**, as Diablo III's ancients. A unique that drops on the ladder (above
`LADDER_LEVEL`, 64) and above its own level is rift-touched: its weapon damage, armour and numbers
are lifted to stand with the elite bases its drop's level reaches (`ELITE_LEVELS`, 55, 70, 85).
A first guess: its weapon's or armour's numbers become those of the elite tier its level reaches,
times the unique's own share of its tier (a whip stays a fast blade, not a godsword), and its stat
lines a fifth more for each elite tier passed. Its trait, keystone or power doesn't change: the
lift is numbers, not rules. "Rift-touched" goes before its name, and its tooltip says so in the
seventh tier's colour.

It costs a save nothing. An item's `level` is the level it dropped at, already saved, so whether a
unique is rift-touched is worked out from it, never stored. Every unique a hero has already found
on the ladder becomes rift-touched the day this is built, a gift and no mending. The first sixteen
depths drop under 64, so they stay as the bot tuned them.

**Upgrades**, OSRS's own and Diablo II's cube recipes. A unique and its part laid in Aubury's
circle (`content/circle.ts`, a recipe kind on the end) give its upgrade: a unique of its own (a new
`UNIQUES` row, on the end) at the old one's level, so a rift-touched whip becomes a rift-touched
tentacle. Where the lift is numbers, an upgrade is a rule more. Its numbers roll again and it's
read at once; its sockets and the gems in them are kept.

| Unique | Laid with | Becomes | What it adds | The part comes from |
| --- | --- | --- | --- | --- |
| Abyssal whip | Kraken tentacle (12004) | Abyssal tentacle (12006) | Echoing 55% (from 40%), and Numbing 20% | The Kraken (494), a new guardian of Waterbirth's dagannoth (phase 6) |
| Staff of the Dead | Magic fang (12932) | Toxic Staff of the Dead (12904) | Gravebound 30% (from 20%), and the risen stand twice as long | Zulrah (2042), a new guardian (phase 6) |
| Darklight | Three Ancient shards (19677) | Arclight (19675) | Bloodthirsty 35%, and 40% more against demons | The restless dead's packs, as Kourend's catacombs drop them |
| Arclight | A Tormented synapse (29580) | Emberlight (29589) | Arclight's, and Smouldering 40% | The Tormented Demon, a guardian of Zamorak's legion |
| Ivandis flail | Blisterwood logs (24691) | Blisterwood flail (24699) | Volatile 70% (from 50%), and 40% more against vampyres | Morytania's vampyres: their guardians and their hoards |
| Dragon boots | A Primordial crystal (13231) | Primordial boots (13239) | Acrobatics, and 10% more melee damage | Cerberus, a guardian of Zamorak's legion |
| Amulet of fury | A Blood shard (24777) | Amulet of blood fury (24780) | Zamorak's Fury, and a fifth of hits heal 30% of their damage | The vampyres' Vyrewatch |
| Dizana's quiver | Sunfire splinters (28924) | Blessed Dizana's quiver (28955) | Its numbers half again, and Splitting 2 | The awakened Colosseum (B) |
| Infernal cape | The Max cape (13280) | Infernal max cape (21285) | Both capes' numbers and Inferno | The Max cape is Reldo's at 99 (D) |
| Blessed Dizana's quiver | The Max cape | Dizana's max cape (28902) | Both | The same |

"Against demons" and "against vampyres" are two new conditions of the enemy hit (`VERSUS_WHEN`),
which want monsters tagged with what they are; the hosts already group them so.

**Imbues**, as OSRS's double a ring's bonuses. The circle takes a Berserker, Archers, Seers or
Warrior ring, a Ring of suffering or the Skull sceptre, with a Wrath rune and gold, and gives its
"(i)": its numbers doubled, its trait, keystone or power as it was (the Skull sceptre's burst 50%
more). The cache has the (i) of each, several under one name (Berserker ring (i) 11773, Archers
ring (i) 25260, Seers ring (i) 23624, Warrior ring (i) 11772, Ring of suffering (i) 19710, Skull
sceptre (i) 21276). The gold grows with the item's level, so it stays a few ladder rifts' gold at
any depth (E).

The parts are goods in the pouch (`GOOD_IDS`, on the end), as herbs and tokkul are, and fall on a
stream of their own from the rift's seed, as talismans do (`Game.talismanRng`), so every other drop
is as it was and `Game.test.ts`'s fingerprints hold. The parts that need a guardian the game hasn't
got (the tentacle, the fang) wait for it, in phase 6; their uniques' upgrades wait with them.

### B. Awakened pinnacles

Desert Treasure II's awakened bosses, Path of Exile's uber pinnacles and Diablo IV's tormented ones
are the same idea: the fight a hero has won, harder, for drops of its own. Each pinnacle but the
Coop has an awakened version, on the Archmage's list beside it, opened with its own key and an
**Awakener's orb** (28334), at the deepest rift reached, as the pinnacles are now.

- **The orbs** drop from a pinnacle's guardian, a third of the time (a first guess), and from the
  ladder's superiors and Wilderness bosses from depth 30, rarely. An orb is a good in the pouch.
- **Awakened**, a guardian has twice the life and a quarter more damage, its specials 30% faster,
  and a second phase at half life: its retinue raised again, and one special from the ladder's
  pool (a charge, a summon of its host's, a field) added to its turn. All of it is made of what
  the sim already does (`bossSpecials`, `PinnacleDef.retinue`), so each awakened fight is a table
  row, but each is looked at fighting before it's trusted.
- **What it drops**: two of its uniques always, their numbers rolling in the top half of their
  range; three Chromium ingots (28276) a third of the time; its pet (D) more often; and its own:

| Awakened | Drops besides | Laid in the circle with three Chromium ingots, gives |
| --- | --- | --- |
| Bandos's Stronghold | Ultor vestige (28285) | Ultor ring (25485): 12% more melee damage, 20% more crit multiplier |
| Armadyl's Eyrie | Venator vestige (28283) | Venator ring (25487): 12% more projectile damage, a projectile more |
| Zamorak's Fortress | Magus vestige (28281) | Magus ring (25486): 12% more spell damage, 10% less mana cost |
| Saradomin's Encampment | Bellator vestige (28279) | Bellator ring (25488): +3% crit chance, 8% more damage |
| The Heart, the Abyssal Nexus | Ingots every time | |
| The Fortis Colosseum | Sunfire splinters (A) | |

The four rings are OSRS's best, made as OSRS makes them, and they're the only ring uniques above
level 35: a reason for every class to go into every stronghold, whichever god's gear it wears.

A Heart that climbs (design, section 15) is half there already, since it opens at the deepest
rift reached; the awakened Heart is the rest. **Awakened support gems**, Path of Exile's, could be
the awakened pinnacles' too: half a dozen supports in a form going to level 25 with a little more
each. They want a look for the gem (another uncut stone) found and looked at first, so they're a
maybe.

### C. The orrery: an atlas of the ladder

Path of Exile's atlas tree and Last Epoch's blessings, kept small: a hero's choice of what the
ladder holds, kept for good. It belongs in the wizards' study on the Rift Plaza. The README says
the study has an orrery and the folk already talk of it ("The orrery's spheres are the rifts. The
one that's lit is yours.", `content/town.ts`), but `world/cityGen.ts` puts only a lectern, a desk
and a telescope there. The cache's Orrery (loc 25401) is three tiles a side and turns (seq 3579).
Placed in the study and clicked, it opens its panel; `scripts/city-map.ts` checks it shuts no one
in.

- **Spheres lit.** A point the first time each host's guardian falls in each band of eight depths
  (17 to 24, 25 to 32, and so on), fifteen a band, and the first time each pinnacle and each
  awakened pinnacle is cleared, fourteen more: about 59 by depth 40, and a band more every eight
  depths after. The panel shows which spheres are lit, so the points are a list to chase.
- **The tree**: about eighty nodes in five arms, so by the wall a hero has most of it but not all,
  and each node is a lever on a roll the ladder already makes:

| Arm | Its nodes |
| --- | --- |
| The encounters | A notable for each of the eight: it comes twice as often, and pays half again. Small nodes: its currency 10% more |
| The hosts | A favoured host, chosen at the orrery: twice as likely on the web, its parts (A) twice as often. A second favoured host further out |
| The web | One more lane open beside yours; the next depth's places shown; a bounty rolled again once a depth; bounties a fifth bigger |
| The keys | More riftstones, more Heartstone shards and Awakener's orbs; a pinnacle's key a quarter cheaper |
| The finds | A chest more; a hoard in every rift; shrines last longer; superiors and Wilderness bosses twice as often |

- **Giving one back** costs gold, as the passive tree's do, and dearer: a gold sink that's a choice.
- **Saved** as `orrery`: the nodes taken by id (new ones on the end) and the spheres lit by host and
  band. Its levers are read where the ladder's rolls are made (`sim/ladder.ts`, `sim/web.ts`,
  `Game.rollKeys`), from the hero, so the same rift and the same hero still play out the same.

### D. The record: the log, the achievements, the pets and the cape

**The collection log**, OSRS's (its book, 22711, is the tab's icon, or its sprite if
`scripts/sprite-info.ts` finds one). A side tab, as the prayers have, with a page for each of the
campaign's uniques, the ladder's (sets, high runes, the upgrades and imbues), each pinnacle's
(uniques, vestiges, rings, pets), the encounters' sets, the potions and the talismans: a slot for
each, lit the first time the hero holds one read. Each page counts ("31 of 46"), and the tab says
the whole. It's saved as `log`, a list of base ids; a save from before it lights what the hero
holds now, as it loads. It gives no power: a log that paid would be a chore, and OSRS's doesn't.

**Combat achievements**, OSRS's six tiers (Easy, Medium, Hard, Elite, Master, Grandmaster, a point
to six points each): two to four for each of the thirty guardians in `BOSSES` (the Wilderness
bosses, the Heart's and the pinnacles' among them) and their awakened forms, and a dozen for the
rifts and encounters, about 120 in all. They're the tasks' machinery without the folk: never
offered, never given up, counted from what the sim sees (`sim/tasks.ts`'s `countKill` and
`countClear` are the model), and saved as `achievements` by id.

| Like | Examples |
| --- | --- |
| A kill | Slay Vorkath; slay each awakened general |
| Untouched | Slay Graardor without being hit by his slam; the Corporeal Beast without a rain landing on you |
| Swift | Slay Cerberus within 45 seconds of its waking; clear a rift with three quarters of its time left |
| Restraint | Slay K'ril with no hireling and no prayer on; clear a rift with no potion drunk |
| Daring | Clear a rift of four modifiers; dare six waves of the Fight Caves; take every glory in the Colosseum |

"Hit by a special", "time from waking" and "no potion" are a few events more from `Game`. The
points open Ghommal's hilts 1 to 6 (25926 to 25936), shown in the log, each a convenience rather
than power: the teleport home in two seconds, a fourth version of each rift from the Archmage, an
orrery node given back for nothing once a depth, a bounty rolled again once a depth, a pinnacle's
key a quarter cheaper, an Awakener's orb back on an awakened clear one time in four.

**Pets**, every OSRS guardian's own. Each guardian that has one drops it now and then (1 in 250
from its guardian, 1 in 50 awakened: a first guess, Diablo's length of chase, not OSRS's 1 in
5,000), into the log. One follows the hero, chosen on the log's pets page: a thrall's following
(`content/minions.ts`) without its fighting, never hurt, blocking nothing. These eighteen are in
the cache; the Chaos Elemental's and Scorpia's are still to look up:

| Guardian | Pet | | Guardian | Pet |
| --- | --- | --- | --- | --- |
| Corporeal Beast | Dark core (318 or 388) | | Kalphite Queen | Kalphite Princess (6637) |
| General Graardor | General Graardor Jr. (6632) | | Vorkath | Vorki (8025) |
| Kree'arra | Kree'arra Jr. (6631) | | Cerberus | Hellpuppy (964) |
| K'ril Tsutsaroth | K'ril Tsutsaroth Jr. (6634) | | Skotizo | Skotos (425) |
| Commander Zilyana | Zilyana Jr. (6633) | | Vet'ion | Vet'ion Jr. (5536) |
| The Abyssal Sire | Abyssal orphan (5883) | | Sarachnis | Sraracha (2143) |
| Sol Heredit | Smol Heredit (12767) | | Callisto | Callisto cub (497) |
| TzTok-Jad | TzRek-Jad (5892) | | Venenatis | Venenatis spiderling (495) |
| Dagannoth Rex | Dagannoth Rex Jr. (6630) | | King Black Dragon | Prince Black Dragon (6636) |

**The Max cape** (13280), Reldo's at level 99: a cape with something of everything (five to every
attribute, 5% to every resistance, a first guess), and the circle joins it with the Infernal cape
or the Blessed Dizana's quiver (A), as OSRS's are made. The 99th level is a moment, then.

### E. Sinks that are chases

- **Gold**: the upgrades and imbues (A), giving back an orrery node (C), and, if the developer
  wants it, **Fortunato's elite gamble** past 60: an elite base of the chosen slot at the deepest
  area level reached, at that level's price (`50 + 3L²` is 74,000 at depth 40's 157). It rolls the
  rift-touched tier, so it's a real chase and a real sink; the shops stay at 60.
- **The stalls' currencies** buy what OSRS's own shops sell for them: the Void Knight the **Elite
  void** top and robe (13072, 13073) for a Void piece and 200 seals, the set's bonuses half again;
  TzHaar-Hur-Tel an **Uncut onyx** (6571) for a great deal of tokkul, which the circle makes, with
  a Law rune, an Amulet of fury or a Ring of suffering, a way to aim at a unique; Apprentice Felix
  **talismans** for pearls, a base of the hero's choosing and now and then the unique Elemental or
  Catalytic talisman, as Guardians of the Rift's own shop sells them.
- **The folk's tasks past 60** pay from the task's depth, not level 60's: their item at that level
  (so elite bases and the rift-touched tier), and the new goods among the rewards (Father Lawrence's
  restless dead paying Ancient shards).

### F. A raid (later)

OSRS's crown, and the one piece that's mostly new fighting. The Tombs of Amascut fit best: its
invocations are a raid level chosen before going in, which is the Colosseum's glories chosen up
front, and its bosses are in the cache (Akkha 11789, Ba-Ba 11778, Kephri 11719, Zebak 10680, the
Wardens 11746 and 11747). A raid would be a pinnacle of five rooms in a row, each an arena of the
planned layout (`world/riftLayout.ts`), the Colosseum's machinery running each room, its raid level
setting what it pays. Each boss wants a fight of its own, so it's the most work here, and last.

### Considered and left out

- **Paragon boards**: more power from points breaks the tree's rule, more choice and the same
  power (`docs/tree-expansion.md`).
- **Seasons and leaderboards**: there's no server.
- **Corruption**, Path of Exile's Vaal orb, a last gamble on an item: maybe one day as a circle
  recipe with a Wrath rune; left out to keep crafting legible while upgrades and imbues go in.
- **An ascendancy** from the second lap's guardians (`docs/tree-expansion.md`, section 7) is the
  middle of the game, not its end. **The druid** is a class, not a late game. **Co-op** is its own
  work.
- **A dial of difficulty** past the ladder, as Last Epoch's corruption is: the ladder's depth
  already is one.

## 4. How it fits together

A ladder rift is chosen at the orrery's leaning. Its host gives the parts (Cerberus's crystals,
the Vyrewatch's shards, the Tormented Demon's synapses), and its encounter the currencies the
stalls take. The parts and gold go into upgrades and imbues of uniques that drop rift-touched; the
pinnacles give orbs; the awakened give vestiges, rings and pets. Every first lights a sphere, a slot
in the log or an achievement. Each system feeds another, as the Diablo expansion's do.

The rules hold. Every part, upgrade, ring, pet and the orrery are the cache's own, looked up and to
be looked at. New drops come on streams of their own, so the sim stays deterministic and the old
drops are as they were. New items, goods, uniques, nodes and achievements go on the ends of their
tables, and the saves' new fields (`orrery`, `log`, `achievements`, `pet`) are optional, mended as
they load. A new kind of thing loaded (the pets' bakes, the orrery's loc, the log's sprite) has to
be one `scripts/slim-cache.ts` loads too.

## 5. An order to build it in

Each phase can be released on its own.

| Phase | What | Size | What it needs checked |
| --- | --- | --- | --- |
| 1 | **Uniques that keep up**: rift-touched uniques; the upgrades whose parts have a source (Arclight, Emberlight, Blisterwood flail, Primordial boots, blood fury); imbues; the Max cape and its two joins | Medium, mostly data | A test of the lift and of each recipe; the bot's ladder runs (`--from 17 --depth 40`) before and after, since this is where the wall moves; each upgrade looked at worn |
| 2 | **Awakened pinnacles**, the orbs, the vestiges, the ingots and the four rings | Medium | A test that each opens, fights its second phase and pays; each awakened fight looked at. The bot fights no pinnacle, so their numbers are guesses till it's taught |
| 3 | **The record**: the log, the pets, combat achievements and the hilts | Medium | A test that the log lights on reading, an achievement of each kind counts, pets drop and follow; saves round trip in `settings.test.ts` |
| 4 | **The orrery** | Medium | The loc looked at in the study, `city-map.ts`; a test of each lever on the ladder's rolls |
| 5 | **Sinks**: the stalls' new wares, the elite gamble, the folk's rewards past 60 | Small | The bot's gold by depth, before and after |
| 6 | **The Kraken and Zulrah**, as guardians that stay where they are and change form, and the tentacle and the fang with them | Medium | Each looked at fighting and dying |
| 7 | **A raid** | Large | Everything, once the rest has settled |

Phase 1 answers what matters most, the uniques that stop being worth wearing, and is mostly rows in
tables. Phases 2 and 3 give the pinnacles and the climb a reason to go on. The orrery is the most
new interface, so it comes once there's more for it to lean on.

## 6. Questions for the developer

- Rift-touched uniques, upgrades, or both? (This proposal says both: the lift keeps every unique
  worth wearing, and the upgrades are the chase.)
- Should every ladder unique be rift-touched, or a share of them, as Diablo III's ancients are?
- Do the log and the achievements give anything but conveniences? (This proposal says no.)
- Pets: a Diablo-length chase (1 in 250) or OSRS's (1 in 5,000)?
- The elite gamble: in, or the shops' and gambles' cap at 60 kept as it is?
- The orrery's points: by host and band of depths, or by something nearer to hand?
- A raid at all, and if so the Tombs?

Answered on 2026-11-17, as recommended: both; every unique found on the ladder above its own level;
conveniences only; 1 in 250, and 1 in 50 awakened; the elite gamble in; points by host and band;
and the Tombs.

## 7. As built

All seven phases, in the order of section 5. Where they differ from the above:

- **The lift (A)** is worked out from the bases, not the tiers' numbers: a rift-touched weapon hits
  harder by as much as the best base of its kind hits harder a second at its drop's level than at
  its own (so a whip stays a fast blade), its armour grows as its slot's most armour does, and its
  added and increased numbers a fifth for each elite tier passed (`touchLift`, `sim/loot.ts`).
- **The upgrades (A)** are the eight of the table, with these changes: Emberlight is made from
  Arclight but rolls Darklight's numbers 30% more, and 50% against demons; the Toxic Staff of the
  Dead adds Numbing 25%, not risen that stand longer; the Amulet of blood fury 3% life leech, not a
  fifth of hits healing; Primordial boots only the 10% more melee damage; the blessed quiver takes
  50 Sunfire splinters. An upgrade costs twice the unique's level squared in gold, an imbue eight
  times. The imbued Archers and Seers rings are 11771 and 11770.
- **The Max cape (A, D)** is Reldo's at 99 for 100,000 gold, one at a time: 15 to each attribute,
  60 life, 40 mana, 8% to every resistance, Frenzied 3% and Bloodthirsty 15%. A join keeps both
  items' numbers, at level 99.
- **The rings (B)** are 28307, 28310, 28313 and 28316 in this cache (the ids in the table are
  others), each of level 70 with a trait: Ultor Volatile 40% (and 40 life), Venator Splitting 2
  (and 15 Dexterity), Magus Echoing 35% (and 15 Intelligence), Bellator Surging (and 15 Strength).
  A general's vestige drops half the time; the Colosseum's splinters 25 at a time. The awakened
  second phase raises four of the land's guards for a guardian with no retinue. Awakened support
  gems weren't built.
- **The orrery (C)** has 43 nodes, 13 of them notables, in five arms: the encounters (their
  currencies), the hosts (gold, and two favoured hosts), the rifts (time, a chest more, a hoard,
  shrines), the keys (riftstones, shards, orbs, a key 10% cheaper) and the finds (rarity,
  superiors). The web's levers (a lane more, the next depth shown, a bounty rolled again) weren't
  built: the rifts' arm took their place. A node given back costs twice the deepest area level's
  square in gold. It stands by the statue in the wizards' study.
- **The record (D)**: the log has fifteen pages and 170 things to find; there are 132 combat
  achievements, 483 points, for each guardian its kill, its kill untouched by its specials and its kill within 45
  seconds of its waking, each pinnacle's awakened, and fourteen more. The hilts open at 10, 30, 60,
  100, 150 and 220 points: a two-second teleport, a fourth offer, keys a quarter cheaper, an orb
  back one time in four, pets twice as often, and a rift's time a quarter longer (in place of an
  orrery node and a bounty given back, since those levers weren't built). There are 23 pets: the
  table's eighteen, Scorpia's offspring (5547), the Pet chaos elemental (2055), the Pet kraken
  (6640), the Pet snakeling (2127) and Tumeken's guardian (11652). The dark core is 318.
- **The sinks (E)** are as proposed: the Elite void top and robe for 200 seals each, the Uncut onyx
  for 8,000 tokkul (the circle makes it a fury or a Ring of suffering with a Law rune), a talisman
  for 40 pearls with a one in eight chance of the Elemental or Catalytic, the elite gamble, and the
  folk's tasks past 16 paying at their depth, Father Lawrence an Ancient shard besides.
- **The Kraken and Zulrah (phase 6)** guard Waterbirth's dagannoth and Karamja's jungle. Both stay
  where they rise and are drawn as a bake for each form: the Kraken a whirlpool (496) till it's
  disturbed, then the Kraken (494) casting water; Zulrah turning every twelve seconds through its
  green (2042), red (2043) and blue (2044) forms. Each drops its part a third of the time.
- **The raid (F)** is one desert rift on a plan of its own, the nexus (`world/riftLayout.ts`): the
  hero comes in beside Osmumten (11690) at the mouth of a hall with four chambers off it, takes the
  paths in any order, each room rising as its chamber's walked into, and the Wardens rise in the
  hall once the four are beaten. (It was first a rift of the biome's kind with the rooms rising in
  turn round Osmumten at its far end, a long walk with nothing in it before anything happened.)
  Each room is a guardian and its adds (Akkha's shadows 11797, baboon brawlers
  11712 and mages 11714, soldier scarabs 11724), with the Wardens last, Tumeken's (11747) and
  Elidinis' (11746) as a rare beside it. Kephri and Zebak stay where they rise. Ten invocations add
  up to raid level 200, each level 0.2% more items, rarity and chance of a second unique. Its
  uniques are Lightbearer (25975), Elidinis' ward (f) (27251) and the Keris partisan of the sun
  (27291); its achievements are raid level 100 and every invocation. Every boss's animations are
  skeletal and were picked by looking at them posed: `scripts/find-npc-seqs.ts` lists an NPC's,
  `classify-npc-seqs.ts` guesses at them, and `seq-sheet.ts` draws one's frames to a PNG.
- **Not done**: the bot's ladder runs before and after (`--from 17 --depth 40`), so where the wall
  moves is unmeasured; and the bot is still taught no pinnacle, awakened fight or raid.
