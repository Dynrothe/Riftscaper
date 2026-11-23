# Riftscaper: the design

What Riftscaper is, how each of its systems works and why, and how to work on it, written for the
agents who come after, on 2026-11-10, from the code as it stood that day, and brought up to date
on 2026-11-14 with the uniques' powers, what there is to find in a rift, the second lap's
guardians, riftstones and the Heart of the Rift, and on 2026-11-16 with the Diablo expansion
(potions, the ladder made of parts, its encounters and pinnacles, Diablo II's items, levels to 99,
prayers, the hireling, quests, resistances, the rift web and the secret rift), whose proposal and
reasons are `docs/diablo-expansion.md`. Where a number here
drifts from the code, the code is the truth: `src/content/` holds the game's data and
`src/sim/` its rules, and both open with comments that say what they mean. `README.md` says how
the game is played and where each thing lives; `docs/city.md` has the city's research and plan;
the engine's guides are `../engine/CLAUDE.md` and, for ScapeRune, its map maker,
`../engine/scaperune/CLAUDE.md`; `../AGENTS.md` says what's what. The numbers
that grow with level, the classes and the guardians were tuned with a balance bot that plays the
game headless (section 13), against Diablo's and Path of Exile's curves; the rest (the passive
tree's nodes, the minions, the rift modifiers' rewards) are still a first guess, and their files
say so.

## 1. The game

Riftscaper is an action RPG in the Old School RuneScape world, in the mould of Diablo and Path of
Exile, on the engine in `../engine`. You make a hero of one of six classes and live in Runefall,
a walled city built round a tear in the air that the wizards bind and steer. The city's Archmage
tunes the tear to open a rift: a stretch of land that ScapeRune's generator (the engine's map
maker, `../engine/scaperune/`, which makes maps that aren't in OSRS) makes from a seed in
one of eight biomes, with monsters in packs and a guardian at the far end. You go through, fight
your way to the guardian, kill it, and its portal takes you home a step stronger, with a deeper
rift open to you. Loot drops with random affixes, runes change what you wear, gems in your gear's
sockets are your skills, and a passive tree of 800 nodes, with talismans set in it, makes the hero yours.

**What decides the rest:**

- **Everything on screen is the cache's.** Monsters, people, spells, items, buildings, the
  interface's stone and sprites and fonts: all Jagex's own assets, looked up by id with the
  scripts in `scripts/`. Nothing is drawn as a coloured shape where a real model could do it.
  The engine's rule (`../engine/CLAUDE.md`, "Show things with real assets") is this game's too.
- **The sim is deterministic.** The same rift, the same hero and the same presses play out the
  same on every machine: randomness from a seeded `Rng`, trigonometry through `fm`, never
  `Math.random` or `Math.sin` in `src/sim/`. `Game.test.ts` holds it to that. The client alone
  rolls new seeds, and only for things that start something: a rift, the shops' stock, the
  Archmage's offers, a new hero, what someone says.
- **Fights get longer, not deadlier.** Monster life grows faster than monster damage with the
  area level (section 8), so going deeper asks for more damage from the hero, not more caution,
  and a death stays something the player could have avoided. The engine's design records say the
  same about bosses: a death the player can't explain is the failure, not the difficulty.
- **The genre's rules are Path of Exile's where they were good.** Skills are gems in linked
  sockets, so gear is a build; map modifiers trade danger for reward and come in a choice of
  three; runes are the orbs. Where Diablo's are simpler they're Diablo's: six buttons, two flasks,
  a town with a portal in it.
- **Fast to the point.** The hero comes home beside the tear, the Archmage and Reldo, the bank
  across the way and the shops round the same square; a rift is a few minutes; dying costs a tenth of a level and the rift, never the hero
  (unless they chose Hardcore).
- **The interface is the OSRS client's.** Its stone frames, its two pixel fonts at their own
  sizes, its orbs, tabs and slot sprites from the cache, parchment for speech. A screen that
  needs something new borrows it from the client or RuneLite before inventing it.

## 2. The loop

A session starts on the title, in the tear's crater in the middle of the city's square: the heroes
kept on the left, the one chosen standing before the tear, or the six classes in a line round it
for a new hero. Play drops the hero on the tear's ring. From there:

1. **In the city.** No fighting, no skills, no teleport. Potions, life and mana are full on
   arrival and every shop's stock is rolled again. Click anyone to walk over and talk: four
   shopkeepers sell gear for your level (and buy anything), the gem trader sells gems and recuts
   sockets, Fortunato sells gambles, Aubury sells Air and Mind runes and enchants rings and amulets
   with the tree's notables, the banker keeps a stash of
   four tabs, and the townsfolk, wardens, wizards and guards have things to say. Three of the
   folk have a task to offer each time you're home (section 3). The Apothecary brews potions and
   elixirs (section 4), Reldo reads unidentified uniques and sets quests (section 3), the
   Mercenary Captain hires a hireling (section 4), Aubury inscribes runewords and keeps the
   transmuting circle (section 7), and three stalls sell the ladder's sets for its encounters'
   currencies (section 9).
2. **The Archmage** beside the tear offers any depth you've reached, in three versions: no modifier
   or one, one or two, two or three. Pick one and the tear becomes that rift's portal. From depth
   9 he also opens a riftstone's rift, woven as it is, and with the Heartstone's four shards the
   Heart of the Rift (section 9). Past 16 he opens the pinnacles too, and his rifts at the
   deepest are places on the rift web (section 9).
3. **The rift.** You arrive at a camp in a corner (a fire, a tent, a waystone). Packs of
   monsters stand where the walk from the camp is 34 tiles or more; the guardian stands seven
   tiles short of the farthest point; the way out is past it. Between them stand chests, a
   shrine or two and often a hoard guarded by a ruin (section 3). Kill the guardian and its portal
   opens home, and the next depth is yours. The rift has a time limit (section 9): run out and it
   collapses, sending the hero home alive with the rift lost.
4. **Home** by the portal, the waystone or the teleport (T, four seconds still). The waystone and
   the teleport leave the rift open to go back to, as it was, chasers gone home. Dying sends you
   home too and loses the rift and a tenth of the level's experience; a Hardcore hero who dies has
   fallen and never plays again.

The hero is saved on every arrival, every thirty seconds, on every panel's closing and whenever
the page goes hidden, so nothing is lost to a closed tab.

## 3. The world

### The story

Long ago the sky over a meadow tore and a fall of black stone came down, a rune burning in each:
the Runefall. Where the greatest stone struck, the tear in the air never closed. The wizards of
the Wizards' Tower found it could be steered: bound in four of the fallen stones, it opens on to
whatever land the Archmage tunes it to, a rift made new each time, and closes when the rift's
guardian falls, or when the one who went through does. They raised a tower beside the tear, and
the city grew round the tower to serve those who go through: a market, a forge, a fletcher, a
bank for what comes back, and a chapel with a yard for those who don't. The story is in
`content/town.ts` (`CITY_LORE`, and in what every person says), and in the help panel.

### The city

Runefall is laid out by hand in `src/world/cityGen.ts`, to what the genre's hubs teach and what
the real cities measure, and `docs/city.md` records both. In short: a flat, Varrock-stone walled
town whose square is the hub. The tear hangs in its middle, in the crater the fall left, in a dais
of flagstones and bound in four binding stones; the hero comes home on the dais with the Archmage,
Reldo and the bank's door within a few steps; the shops ring the square in the order they're
wanted; the orrery stands on the axis before the Wizards' Tower, which closes the square's north
side. The tower street runs before the tower between the side gates, with Zaff's and Aubury's on
it, and the south street from the square past the inn and the barracks to the south gate. Round
that hub, out of its way, are the places with stories: the strangers' camp on burned ground, the
training yard, the chapel and its churchyard, the tower's garden with the house a stone fell
through, the houses on the lanes, and a field and a pasture outside the south gate. Every
building is a real one cut from the cache (Varrock's east bank, Horvik's, Lowe's, Aubury's rune
shop, the Blue Moon Inn, the Wizards' Tower, Varrock's houses and shops, Lumbridge's church), every door opens on a
street, and every keeper and counter faces their customers. `scripts/city-map.ts` draws its
collision and fails if anyone, the portal or the orrery can't be reached; `scripts/city-png.ts`
draws it from above.

### The rifts

A rift is three map squares a side (192 tiles) of ScapeRune's land in the zone's biome, from a
seed the client rolls, shaped to a plan of arenas and lanes (below) with the camp in one of the
four corners and the guardian's arena at the far end. No buildings or towns, since nobody lives
there; a road from the camp to the guardian, and ruins and landmarks in the lanes.
The zones go round in order, four area levels apart, and past the eighth they come round again
with " (Torment n)" after the name and one more monster in every pack per lap; past depth 16 the
rifts are rolled from parts instead (section 9's ladder), keeping the laps' Torment:

| Depth | Zone              | Biome    | Monsters                                                | Guardian                           |
| ----- | ----------------- | -------- | ------------------------------------------------------- | ---------------------------------- |
| 1     | The Greenway      | meadow   | goblins, giant rats, hobgoblins                         | Grashnak, Ogre Chieftain           |
| 2     | Gloomwood         | darkwood | wolves, giant spiders, werewolves                       | Bloodmoon, Alpha of the Pack       |
| 3     | Fetid Marsh       | swamp    | zombies, skeletons, giant spiders, moss giants          | Count Draynor, Lord of the Marsh   |
| 4     | The Barrow Fields | deadlands | skeletons, zombies, dark wizards; rares led by Barrows brothers | Ahrim, the Blighted Brother       |
| 5     | Frostmarch        | snow     | wolves, Fremennik archers and berserkers, aviansies     | Kree'arra, Lord of the Skies       |
| 6     | Ashen Wastes      | ash      | imps, lesser demons, TzHaar-Ket, -Xil and -Mej          | TzTok-Jad, Fury of the Fight Caves |
| 7     | Sunscorch Dunes   | desert   | desert raiders, orks, ogres, rock crabs                 | General Graardor, Bandos's Warlord |
| 8     | The Abyssal Rift  | astral   | imps, lesser demons, dark wizards, black demons         | K'ril Tsutsaroth, Zamorak's Hand   |

Area level is `1 + (depth - 1) * 4`, so depths 1 to 8 are levels 1 to 29 and the second lap
starts at 33. Each zone sets the generator's settings (trees, hills, ruins, ponds, mountains,
volcanoes, mesas) and its day: every rift is lit as by day, each its own way, from the Heart's
violet (ambient 0.92), the Barrows' overcast and Gloomwood's shade to the Dunes' noon glare (1.05).
Zones are `content/zones.ts`; the land is `world/zoneGen.ts`.

**The plan** (`docs/rift-maps.md`). A rift is shaped as Diablo's and Path of Exile's maps are:
drawn first as arenas joined by lanes two thirds of a screen wide (a trail, a loop round a heart,
a hub with arms, isles, or a Diablo II field of open ground and blocks, the kind the biome and seed
pick), walled by the biome's forest or cliffs and floored by its water, lava or void where the
ground falls away, with a road from the camp to the guardian's arena down the middle of the lanes
(`world/riftLayout.ts`, `riftShape.ts`). Its packs are as many as the open land rifts were first
made on held, on half the ground (`PACK_AREA`), its boss stands in the guardian's arena, and its
chests go in its dead ends first. The two pinnacles with no packs on the way to their fight are
laid out so it starts as the hero comes in: the Colosseum is always a pit, its sand just past the
camp's gate, and the Tombs a nexus (below). The balance bot found planned rifts play as the open ones
did (section 13): as many deaths and collapses, 9% more kills a rift and a level higher at depth
16, its deaths more to packs and fewer to guardians (`docs/rift-maps.md`, section 5). In
development `?rifts=open` brings the open land back, and `?rifts=trail` (or `loop`, `arms`, `isles`,
`field`) makes every rift one kind.

**The second lap's guardians.** On the second lap (Torment 1: depths 9 to 16) each zone's far end
has a guardian of its own second (`ZoneDef.second`, `bossOf`), so the second time round has a new
fight at the end of it, as well as one more monster a pack. Past 16 a rift's guardian is its
host's (section 9), and these are among them. Each was looked at fighting, and most dying, in the game.

| Depth | Zone              | Second guardian                          | Special                  |
| ----- | ----------------- | ---------------------------------------- | ------------------------ |
| 9     | The Greenway      | Obor, the Hill Giant King                | slam                     |
| 10    | Gloomwood         | Sarachnis, Mother of the Brood           | rain (blood)             |
| 11    | Fetid Marsh       | Bryophyta, the Moss Matriarch            | slam                     |
| 12    | The Barrow Fields | Vet'ion, the Reanimated Lord             | rain (Saradomin strikes) |
| 13    | Frostmarch        | Vorkath, the Undead Dragon (fire bolts)  | nova (fire blasts)       |
| 14    | Ashen Wastes      | Cerberus, Guardian of the River          | rain (Zamorak's flames)  |
| 15    | Sunscorch Dunes   | Kalphite Queen, Empress of the Hive      | slam                     |
| 16    | The Abyssal Rift  | Skotizo, the Dark Altar's Demon          | nova (shadow bolts)      |

### What there is to find

A rift isn't only packs (`content/features.ts`, placed by `sim/placement.ts`'s `placeFeatures`,
used by `Game.useFeature`). Each is a real loc from the cache that the client bakes and draws
shut and then open, lit and then spent; its tiles block, and the hero is sent to an open tile
beside it (its `stand`, the one nearest the camp on foot), since a flow field can't lead onto a
solid tile. They're placed from a stream of their own (the rift's seed with `0x0fea7e5`), so the
packs are where they always were: reachable, 20 tiles of walking past the camp, short of the
guardian, five tiles off any pack and 14 from each other and the guardian.

- **Chests**, two to four a rift (locs 375 shut and 378 open): one sure item, magic 40% of the
  time, three times a monster's gold, and now and then a gem, a forged gem or a rune. A quarter of
  them are **trapped**: a magic pack of the zone's rises round the chest that opened it (three,
  one more a lap and two more in a Swarming rift), standing 0.9 seconds before it moves.
- **Shrines**, one or two a rift, the God Wars Dungeon's four altars, each a buff for 40 seconds
  with its own icon: Zamorak's 40% more damage, Saradomin's 30% less damage taken, Armadyl's 30%
  more movement and 20% more attack speed, Bandos's life, mana and flasks filled at once and 50%
  more armour. One use each; a spent altar is drawn dim. A first try used the Guthix altar 410,
  which read as a boulder in the game; Bandos's altar 26366 matches the other three. Each altar
  stood against a wall in the God Wars Dungeon, so it has no back worth seeing (Zamorak's is open
  behind), and it's one model, which a slope leaves floating: so all four face the camera
  (`SHRINE_YAW` in `Client.ts`, rotation 0 for all four, looked at in the game at every turn) and
  stand on the lowest corner of their tiles, and a shrine goes on the flattest ground it has room
  on (`SHRINE_GROUND`): anywhere within 24 scene units of level under the largest altar's tiles
  and one tile round them, so never on a cliff's lip, or the flattest there is where nothing's as
  flat. Chests and hoards keep a turn of the four by their uid and their middle's height.
- **A guarded hoard**, in 65% of rifts, at one of the generator's landmarks where one can be
  reached, so it's a ruin that's guarded (locs 20723 shut and 20724 open): a rare
  of the zone's leaders and three magic monsters (one more a lap) stand round it, and it won't
  open while one lives. Opened, it drops two sure items (one at least rare, one at least magic),
  an 8% unique, eight times the gold, a gem, runes, and half the time a riftstone (section 9).

The Heart of the Rift has two chests and two shrines and no hoard: its guardian is the hoard.

### Tasks

The city's nine folk set tasks (`content/tasks.ts`; rolled, counted and paid for in
`sim/tasks.ts`), in the way of Diablo III's bounties and the Slayer masters' assignments. They give
each trip home a reason to go somewhere in particular and play some way in particular, and make
the city's people matter.

- **Offers.** Each time the hero comes home (`Client.enterCity`), three of the folk not already
  owed one of the hero's tasks have one to offer (`rollTaskOffers`). The minimap's quest start icon
  (sprite 1454, a map element's: `scripts/map-icons.ts`) marks them over their heads and on the
  minimap. The offers are the client's, rolled from a fresh seed and never saved, so each time
  home brings new ones. Clicking one of them opens their panel: what they say, the objective,
  where it counts, and the reward, rolled with the offer, so the panel shows exactly what's paid.
- **Holding them.** Up to three at once, one for each giver (`TASKS.most`). A task taken goes in
  `hero.tasks`, and the save. The tracker under the rift's box lists them as far as they've got.
  Talking to the giver again says how it goes and offers to give it up; they then have nothing
  more till the next time home.
- **Counting.** The sim counts as things happen: `countKill` from `Game.kill`, `countClear` when the
  guardian dies (with the rift's modifiers and the share of its time left), `countFeature` from
  `useFeature`. It emits a `task` event for each task moved on. A task counts only in rifts at
  least as deep as its depth, and stops at its count. When one's done the client says so, and the
  giver gets the client's yellow hint arrow (sprite 441, `headicons_hint`), bobbing over their head.
- **Paying** (`Game.claimTask`): gold, experience, levelling up as a kill would (life and mana
  filled, the level's gems given), and one thing more: an item into the pack (which needs room) or
  runes into the pouch.

| Kind     | Asks                                                   | Count                                              | Worth                          | Set up to this far short of the deepest reached |
| -------- | ------------------------------------------------------ | -------------------------------------------------- | ------------------------------ | ----------------------------------------------- |
| slay     | One monster of those depths' zones (`TASK_PREY`)       | 90 × its share of the zone's packs × 0.6-1, to fives, 10-40 | 1                     | 3                                               |
| rares    | Rare monsters                                          | 3-6                                                | 1.1, +0.1 each past 3          | 2                                               |
| guardian | That depth's guardian (`bossOf`)                       | 1                                                  | 1.3                            | 3                                               |
| clear    | Rifts cleared, woven with 0-3 modifiers or more        | 1-2                                                | 1, +0.7 for a second, +0.25 a modifier | 2                                       |
| swift    | A rift cleared with half its time left (`SWIFT_SHARE`) | 1                                                  | 1.5                            | 2                                               |
| chests   | Chests opened, trapped or not                          | 3-5                                                | 0.8, +0.1 each past 3          | 2                                               |
| shrines  | Shrines prayed at                                      | 2-3                                                | 0.7, +0.15 for a third         | 2                                               |
| hoards   | Guarded hoards taken                                   | 1-2                                                | 1.2, +0.6 for a second         | 2                                               |

| Giver                     | Kinds, by weight                  | Their prey, where those depths have any                                     |
| ------------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| Reldo, the chronicler     | clear 3, guardian 2, swift 1      |                                                                             |
| The town crier            | rares 3, guardian 2, slay 1       |                                                                             |
| Father Lawrence           | slay 3, guardian 2, shrines 2     | zombies, skeletons, werewolves, imps, lesser and black demons               |
| Apprentice Clara          | swift 2, shrines 2, clear 1       |                                                                             |
| Farmer Aldric             | slay 4, chests 1                  | giant rats, goblins, hobgoblins, wolves, giant spiders, rock crabs, ogres, orks |
| Bram                      | chests 3, hoards 2, slay 1        |                                                                             |
| Marta                     | slay 2, rares 2, chests 1         |                                                                             |
| Osric, the carter         | hoards 3, rares 1, clear 1        |                                                                             |
| Ailsa                     | shrines 3, slay 1, clear 1        |                                                                             |

**What a task pays**, at worth w and hero level L: gold 10 × 4 × (1 + 0.7 L) × w, ten of a
monster's best gold rolls; experience 15% × w of what level L needs (none at the cap); and one of,
by weight, an item of level L + 1 at least rare (4; unique at 5% × w), a few of the rarer runes
the task's depth drops (3; two to four Nature runes, the rarer ones fewer by their drop weight),
a forged gem (1.5), or a riftstone of the task's depth once that's 9 or deeper (1.5). All of it is
a first guess (section 14).

### Quests

Diablo II's quests leave something for good, and so do Reldo's (`content/quests.ts`,
`sim/quests.ts`): one for each of the campaign's eight zones, open once the hero is past it, kept
in his log (talk to him), and counted only in the campaign's own rifts, on any lap, never the
ladder's. Done, a quest is ready; its reward is claimed from Reldo, once.

| Zone | The quest | Its reward |
| --- | --- | --- |
| The Greenway | Every monster in one rift slain | A passive point |
| Gloomwood | Bloodmoon, Alpha of the Pack | The gem trader adds a socket for nothing |
| Fetid Marsh | Count Draynor | The gem trader imbues a normal item rare, its affixes at the best tiers for the level |
| The Barrow Fields | A rare led by each of Dharok, Ahrim and Karil | +5 to every attribute |
| Frostmarch | Kree'arra | +20 life |
| Ashen Wastes | Jad, in a Fleeting rift | +10% to every resistance |
| Sunscorch Dunes | A rift cleared with half its time left | A riftstone of three modifiers |
| The Abyssal Rift | K'ril | The Archmage's offers show one more version |

The log is saved under `quests` (ready, claimed, and the favours not yet spent: `sockets`,
`imbues`), by quest id, so those ids are never renamed.

## 4. The hero

### Classes

A class is where a hero starts: its weapons, life and mana, attributes and place on the passive
tree. What it can do comes from gems and the tree. A skill gem is its class's own: a class uses
only the skills of its gem colours (`classCanUse` in `sim/gems.ts`), so the ranger's bow skills are
the ranger's and the rogue's, the mage's spells the mage's, the paladin's and the necromancer's.
Another class's skill won't socket, never drops for the hero and isn't on the gem trader's shelves;
one socketed in an old save shows why it can't be used. Supports aren't locked: they only make
better what they're linked to. Three classes
are of one attribute and three of two, starting on the tree between those two's classes and
leaning to two gem colours (`content/classes.ts`, `CLASS_COLORS` in `content/gems.ts`).

| Class       | Attributes (Str/Dex/Int) | Life at 1, per level | Mana at 1, per level | Weapons, shield             | Gem colours  | First gems                   |
| ----------- | ------------------------ | -------------------- | -------------------- | --------------------------- | ------------ | ---------------------------- |
| Warrior     | 30/14/14                 | 55, +14              | 23, +4               | melee, shield               | red          | Slash, Cleave                |
| Ranger      | 14/30/14                 | 53, +11              | 33, +6               | bow, no shield              | green        | Shoot, Split Arrow           |
| Mage        | 14/14/30                 | 45, +9               | 45, +9               | staff, shield or book       | blue         | Fire Bolt, Ice Burst         |
| Paladin     | 22/14/22                 | 54, +12              | 34, +6               | melee, shield or holy book  | red, blue    | Smite, Blessed Hammer        |
| Rogue       | 22/22/14                 | 57, +13              | 30, +5               | daggers or bow, no shield   | green, red   | Flurry, Fan of Knives        |
| Necromancer | 14/22/22                 | 47, +10              | 42, +8               | staff, unholy book          | blue, green  | Shadow Bolt, Raise Skeleton  |

Each class is given a gem at levels 2, 3, 4, 6, 8 and 10 (the Necromancer's last at 14), listed in
`GEM_REWARDS`; the first of a level's gems goes on the left button and the next on the right.
`CLASS_IDS` is the order saves have always checked classes against: new classes go on its end.

### Attributes and stats

Strength gives a life every 2 points and 1% melee damage every 5; Dexterity 1% projectile
damage every 5 and 1% evasion every 20; Intelligence a mana every 2 and 1% spell damage every 5.
Life regeneration is the class's plus 0.08 a level, mana's plus 0.05 a level and 1% of the most
mana a second (`HERO.manaRegenShare`, as Path of Exile's is a share of the pool, so a bigger pool
pays for the dearer skills a deeper rift asks for). The classes' own mana regeneration was cut to
0.6 of what it was, and 1.5% to 1%, when skills were made dearer (section 5): mana is meant to
pace a fight, not be a fountain. `scripts/mana-check.ts` prints, for every class at levels 1,
10, 30 and 60, what each skill costs, its drain a second spammed and how long till the pool's dry:
at level 1 the warrior's Cleave empties it in about 2 seconds, area skills in 5 to 11, and the
mage's Fire Bolt, its staple, lasts 35 seconds (66 at level 60).

The classes that fight with weapons earn mana by fighting, as Diablo's warriors build fury: every
enemy an attack (a skill tagged `attack`) hits gives back a share of the most mana, the class's
`manaOnHit` (warrior 3%, rogue 3.5%, paladin 3%, ranger 1.5%, mage and necromancer none), for at
most three enemies a tick (`HERO.manaOnHitPerTick`), so a sweep through a big pack refills some
of a skill's cost and never all of it. It's `stats.manaOnHit`, shown on the Character tab, and
Blood Rite's empty pool gives nothing. Without it the dearer skills left the weapon classes
behind the casters, whose pools are twice the size (section 13); `scripts/mana-check.ts` counts
the pool and its regeneration only, not this. Base crit is 5%
for 1.5 times damage; evasion is capped at 60%, crit at 75%, movement speed bonuses at 60%, mana
cost reduction at 80% and life leech at 8% of damage (16% with Vampiric Pact). Armour takes off
`armour / (armour + 6 * damage)` of a hit, at most 75%, so it's worth most against many small
hits. The formulas are `heroStats` in `sim/hero.ts`; the constants are `HERO` in
`content/rules.ts`.

### Levels, death, potions

Ninety-nine levels, the first sixty the campaign's. Each to 60 takes `round(30 * level^1.75 + 20)` experience, and kills give
`base * (1 + 0.3x) * (1 + 0.015x)` for `x = monsterLevel - 1`, falling off by 12% a level once the
monster is more than three levels below the hero, to a floor of a tenth. A kill's experience grows
faster than a straight line because a level's does: a hero who clears each depth once stays about
the area's level, and comes to 60 about the end of the second lap (depth 16, area level 61), as Path
of Exile's campaign brings a character to the maps. Past 60 (`PEAK_LEVEL`) the levels go on to
99 (`MAX_LEVEL`), as Diablo II's and OSRS's do: the first costs 3.5 times the 60th, about a ladder
rift's experience, and each is 16% dearer than the last, about what a rift a depth deeper gives
more, so a hero who clears each depth once comes about a level a depth; 94 is half the way to 99,
as 92 is in OSRS. A level past 60 is a passive point and nothing else: life, mana and regeneration
stop at 60, and so do the gems' needs, the shops and the folk's rewards, so everything the bot
tuned to depth 16 stays as it was. A level-up fills life and mana and grants the
level's gems. Dying loses `0.1 * xpToNext` (never a level), closes the rift, and after 2.5 seconds
offers the city. The belt's potions are drunk with 1 to 4 (below); kills refill them a share
of a dose at a time, and the city in full. The hero moves 4.84 tiles a second (4.4 till it was found a little slow), reaches 1.3 tiles to pick
up, 2.6 to talk and 2.2 to step into a portal, and gold and runes are picked up by walking within
1.4.

### Potions

Path of Exile's flasks, Diablo II's belt and Diablo IV's brewing, made of OSRS's brews
(`content/potions.ts`, `sim/potions.ts`). A potion is an item of the slot `potion`, carried in the
belt's four places rather than worn: a life potion in the first, a mana potion in the second, any
in the last two. Its doses are its charges, and its icon is the cache's own object for the doses
left, (4) full and (1) on its last. Kills refill a share of a dose (a life potion 0.25 a kill, a
mana potion 0.35), so the pace of a fight is the old flasks' one.

**The last two places are rewards**, one a lap, stitched on by the Apothecary for an errand
(`BELT_ERRANDS`), as Diablo II's quests leave something for good: a new hero has the life and mana
potions' two, the old two flasks. The third wants the **Wine of Zamorak** that K'ril Tsutsaroth
drops at the end of rift 8, five ranarr and 5,000 gold; the fourth the **Jar of darkness**
Skotizo drops at the end of rift 16, five cadantine and 20,000 gold. The balance bot clears rift
8 about an hour in (62 minutes on average, `--depth 8 --seeds 2`) and rift 16 about two, so each
comes as the potions that want it do: the combat potions and the first uniques by the first lap's
end, the Heart's brews past the second. The gold is about half what the bot holds there. A
guardian drops its good, sure, on every death while the hero needs one and hasn't one, placed on
a stream of its own so its other loot is as it was; it lands with a unique's sound and a pillar in
its own colour, and a toast says what it's for. Stitching it on is marked as a level is, with the
level-up's fireworks over the hero. The Apothecary's bench shows the next errand from the first
visit, what's had of it and what's still wanted, so the reward is something to work towards, not
something that just happens: places that opened by themselves at rifts 3 and 8 came too soon and
meant too little (a player's feedback, 2026-11-18). The places stitched are saved
(`beltStitched`); the bar shows only the open places, and the pack's belt row shows the shut ones
dark, with what opens them. A save from when all four were open has a potion in a shut place
moved to the pack (or the stash), never lost. The balance bot drinks from the first two places
only, so the tuning stands.

| Grade | Life | Mana | From level | Life back | Mana back | Doses |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Guthix rest | Prayer potion | 1 | 45% | 60% | 4 |
| 2 | Saradomin brew | Super restore | 12 | 48% | 64% | 4 |
| 3 | Xeric's aid (-) | Prayer enhance (-) | 24 | 52% | 68% | 4 |
| 4 | Xeric's aid | Prayer enhance | 36 | 56% | 72% | 5 |
| 5 | Xeric's aid (+) | Prayer enhance (+) | 48 | 60% | 76% | 5 |

Grade 1 is the flask a hero had before potions, exactly, and a save from before them gets one of
each. Since what a potion gives back is a share of the pool, a grade needn't keep up with the level:
it gives a little more and a dose more at the top, and its item level sets its affixes' tiers.
Besides life and mana there are the Sanfew serum (rejuvenation: both at once) and six combat
potions, OSRS's, each a buff for a few seconds. A potion is normal or magic, a prefix and a suffix
at most, so the Air and Mind runes that pile up past the first lap have a use to the end: prefixes
change how it recovers (at once, faster, more, more doses, a dose kept), suffixes what it does while
it works, four of them ending an ailment and keeping it off (section 8). Eight unique potions,
OSRS's special brews, have rules of their own (Overload's damage for life, Ambrosia's everything at
once); three drop only in the Heart.

**The Apothecary**, on the square's west side, takes the herbs that fall in the rifts (seven of
OSRS's fourteen, Guam at 1 to Torstol, kept in the pouch beside the runes): **brew up** takes a
potion a grade up for the next grade's herbs and gold, keeping its affixes, as Diablo IV's
Alchemist does; **instil** gives it a line that drinks it for you (on low life, when hindered, on a
rare's kill, when a guardian wakes), as Path of Exile's enchants do; and **elixirs**, one at a time,
last ten minutes in the rifts (`ELIXIR_SECONDS`) with a stat and 5% more experience, so herbs
never pile up once the belt is done.

### Looks

A hero's look is OSRS's own character creation from the cache's identity kits: body type A or B,
hair and beard, what's worn under armour, and the colours of hair, skin, tunic, trousers and boots,
with eight presets, the dice, and a name of up to 16 letters or a rolled one (`content/looks.ts`).
A saved look that a body can't have is mended as it's loaded, and a hero from before looks gets
their class's own.

### Prayers

Diablo II's paladin is his auras, Path of Exile's auras reserve mana, and OSRS has the prayer tab
(`content/prayers.ts`): thirteen prayers on the client's own side tab, each opening at the level
OSRS's asks and **reserving a share of the most mana** while it's on (15% to 40%), so a prayer is
power paid for in mana, never drained. One protection and one other at once, as OSRS's overheads
and boosts go together. The protections take 20% off blows, shots or spells; the rest are more
armour, more damage of a kind, speed, life back, Preserve's longer buffs and potions, Retribution's
once-a-minute escape from a killing blow (its own timer), Chivalry and Augury. Under Blood Rite,
which has no mana, a prayer reserves life instead. Piety, Rigour and Redemption are the tree's, so
the tab leaves them out. The prayers on are saved by id.

### The hireling

Diablo II's mercenary (`content/hirelings.ts`, `sim/hirelings.ts`). The Mercenary Captain, by the
square's north-west lantern, hires one of four for `120 * level` gold: a **Barbarian** (the most
life; every third blow stuns), an **Archer** (arrows through the first they strike), a **Battle
mage** (fire bolts that burst) or a **White Knight** (the hero has 25% more armour while they
stand). It comes armed with the best plain weapon of its kind its level allows, and wears three of
the hero's cast-offs besides, a weapon of its kind, a helm and a body, whose numbers count while
its looks stay its own; its blow grows 2.5% a level, so the weapon matters most. It grows with the
hero's level, lives under the hero's prayers, and draws monsters that are nearer it than the hero.
Fallen, it stays down till the Captain raises it for `60 * level`. `balance.ts --curve` has it a
fifth to two fifths of a typical hero's damage, more early on.

## 5. Skills: gems and supports

Skills are gems set in the sockets of worn gear, as Path of Exile has them. A socket is red,
green, blue or white (any colour); a gem goes in its own colour. Sockets are linked in runs, and a
support gem in a run makes every skill gem in that run better, if it supports that kind of skill.
There are 35 skill gems and 23 supports, 58 in all, in three colours: red for Strength's (blades
and war), green for Dexterity's (bows and quick feet), blue for Intelligence's (spells). All are
`content/gems.ts`; how a skill is worked out is `sim/skills.ts`; sockets, links and gem levels are
`sim/gems.ts`.

A gem looks like a gem wherever it's a thing (the pack, the sockets, the ground, the gem trader):
a skill gem is its colour's cut ruby, emerald or sapphire, a support the uncut one, so it can't be
taken for gear and its socket's colour shows. A skill gem has its skill small in its top left.
Where it's a skill (the skill bar, the picker, buffs, the class's skills on the title) its
`icon` is shown: a spell's or prayer's own sprite where OSRS has one like it (Fire Bolt, Ice
Burst, Blood Barrage, Smite, Rock Skin, Skeletal Grasp for Grasp of the Dead), else an item's,
a weapon for an attack nothing in the spellbook or prayers is like (Slash's scimitar, Shoot's
shortbow). The combat-style sprites were tried for those and are too dark on the stone.

- **Damage is a share of the weapon's hit.** A skill's `damage` is a multiple of the weapon's roll
  (Slash 1.0, Cleave 1.35, Ground Slam 2.8, Rain of Arrows 2.6), so better weapons make every
  skill better, and a gem's level adds 0.045 to the share a level, up to level 20. A spell cast
  without a staff does 0.6 of its damage. A skill's `mana` is times `MANA_COST_MULT` (2.5),
  and each gem level adds 7% to it (it was 3%), so a gem's skill stays dear as the hero's mana
  grows; a class's first attack and the weapon's own stay free.
- **Gems learn.** Every worn gem gets the hero's kill experience; a level needs 2.2 times the
  hero's experience for its requirement level (`min(60, gemLevel + round((L - 1) * 2.5))`), and a
  gem waits for the hero to catch up before it levels.
- **Supports** multiply or add: more damage (Brutality, Concentrated Power), area (Expanse),
  projectiles (Volley, two more for 25% less), pierce, chain (Ricochet), speed (Swiftness), crit
  (Precision), ailments (Infernal Touch ignites and adds the fire tag; Kindling, Deep Freeze,
  Static Charge, Concussion), life on hit (Bloodthirst), leech (Siphon), splash on melee
  (Shockwave), cooldown (Momentum, Haste of Mind), duration (Persistence), cull at 10% life
  (Executioner, 5% on a guardian), and cheaper mana (Efficiency). Their numbers run linearly from
  gem level 1 to 20, and a support is passed over in two passes so a tag one adds can let another
  in.
- **Kinds of skill**: strike (one target, or the nearest in an arc), cleave (everyone in a 150°
  arc), slam and nova (everyone within a radius), buff (War Cry, Haste, Sanctuary, Rock Skin,
  Arcane Ward), shoot and burst (projectiles in a spread, a burst exploding on the first hit),
  rain (a marked circle that lands after 0.4 seconds), arc (lightning that chains within 6 tiles),
  blink and leap (to a free spot, a leap hitting where it lands; the mana back if there's nowhere
  to go), and summon (Raise Skeleton: thralls that follow, fight whatever's nearest, can't be
  hurt, and crumble after 20 seconds, 3 at once and one more at gem levels 8 and 15).
- **Ailments**: ignite burns 90% of the hit over 3 seconds; shock makes a monster take 20% more
  for 3 seconds; freeze and stun stop it (1 and 0.8 seconds when rolled, longer when the skill
  says so). A guardian suffers them for 0.35 of the time.
- **The bar** has six buttons: the mouse's two, set apart from the keys by a notch of stone and
  each marked with a mouse, its own button lit, as Path of Exile's bar groups them, then Q, E, R
  and F. A newly socketed skill goes on the
  first free one; with nothing on the left button, the weapon's plain attack is there (0.9 of a
  hit, a free Fire Strike for a staff), so a click on a monster always does something. A skill
  pressed while another is being used waits for it to finish and fires then, within 0.25 seconds;
  a held button isn't another press, so a click is never used twice. Casting takes the weapon's
  attack time times the skill's `castTime`, at least 8 ticks, and the blow lands 42% of the way
  through.

### Forged gems

Written gems are the same for everyone; forged gems (`content/forge.ts`) are what makes one
hero's skills unlike another's, as Diablo's random items make its gear. A forged gem is rolled
when it drops, from four parts:

- **An archetype**: a way of fighting with its own numbers, close to the written gem it's like.
  Red: blade (strike, 1.35), sweep (cleave, 1.3), quake (slam, 2.5), lunge (leap, 1.45), hurl
  (three piercing hammers, 0.8 each). Green: flurry (three stabs, 0.55 each) and knives (a ring of
  eight, 0.62) for a melee weapon; arrow (1.25), volley (five, one per enemy, 0.9), piercer (1.05,
  through three), blast (burst, 2.1) and deluge (rain, 2.5) for a bow. Blue: bolt (1.05), orb
  (burst, 1.9), nova (1.3), storm (rain, 1.7) and arc (chains four times, 1.1).
- **A look**, of the archetype's: its element, its words, its spot animations and its icon. An
  element adds its tag and a chance: fire 20% to ignite, cold 12% to freeze, lightning 25% to
  shock; plain force 8% more damage instead. Every look is made of spot animations, animations
  and thrown things the written gems already use, so `forgeSkillDefs()` hands the client all of
  them to bake up front: a forged gem never shows something unbaked.
- **A roll** of its damage, 90% to 115% of the archetype's.
- **One to three traits** (60%, 32%, 8%), each of the kinds of skill it suits, each with a value
  rolled within its range, each costing a share of the damage, multiplied together:

| Trait | Suits | Does | Costs |
| --- | --- | --- | --- |
| Echoing | all but leaps | the same use again 0.4 s later from where the hero is, for 40-65% | 20% |
| Volatile | hits | a kill explodes, 30-60% of a hit within 2.2 tiles | 10% |
| Thundering | hits | 12-25% chance on a hit to call lightning for 80% of a hit, at most every 0.25 s | 10% |
| Surging | hits | every 4th use a sure crit with 60-120% more damage | 8% |
| Frenzied | hits | each hit (once a tick) a stack of 4-8% attack speed, 5 at most, 2.5 s | 8% |
| Splitting | shots | on its first enemy it splits into 2-3, each for half | 12% |
| Returning | shots | pierces everything, and flies back to the hero once | 15% |
| Smouldering | areas | the ground burns 3 s for 30-55% of a hit a second, as an ignite | 20% |
| Whirling | areas | pulls what's near up to 0.8-1.5 tiles in, as a blow's shove | 6% |
| Numbing | hits | 20-40% slower for 2 s (half on a guardian) | 5% |
| Cascading | rains | falls 2-3 more times, 0.22 s apart, further on | 15% |
| Gravebound | hits | 10-25% chance a kill rises as the hero's skeleton for 8 s, 3 at most, at 60% | 8% |
| Warding | close blows | each hit a stack of 2-4% less damage taken, 5 at most, 3 s | 5% |
| Bloodthirsty | hits | a kill gives 15-30% movement and half that attack speed for 3 s | 5% |

A forged gem keeps about 90% of its archetype's hit on average (`scripts/forge-sample.ts`), with
its traits on top, so it's a sidegrade with a character more than an upgrade, and a three-trait
gem gives up about a third. What a trait does itself (an echo, lightning, a blast, split arrows, a
risen skeleton) carries none of the traits that would make more of it, so nothing recurs. A risen
skeleton is a thrall: thrall damage joins the increases of the hit that raised it
(`Game.raiseFallen`), so a ranger's Gravebound grows with a necromancer's nodes.
Its name is its first trait's word, its look's and its archetype's ("Volatile Shadow Nova"), and
"of" its second's ("of Echoes"), in purple, with the traits' lines in orange.

The item keeps only its recipe (`Item.forge`, base `forged`): the archetype, the look, the words,
the roll, the level and each trait's roll, and the gem is made again from it (`forgedGem`, made
once per recipe). A save keeps the recipe, and one the game can't make any more (an archetype or
trait gone) is dropped as an unknown item is. Forged gems drop only of the hero's class's colours
and weapons (`forgeArchetypes`): 0.05% from a normal monster, 0.2% magic, 2% rare and 15% a
guardian, more with rarity, about one in two or three rifts; the gem trader keeps one on its
shelf at four to ten times a gem's price. They sell for more than a written gem.

## 6. The passive tree

A wheel of 800 nodes (`content/passives.ts`), built once from tables, the same every time. Each
class starts on the inner ring (the Mage at the top, the Warrior lower left, the Ranger lower
right, the hybrids between them) and paths lead outward along spokes and rings of attribute nodes
(+10 to an attribute, by the sector they're in) and small nodes (31 themes: +4% life, +5% mana,
+10% armour, +8% melee damage, +0.5 crit and +5 multiplier, +2% movement speed, +6% thrall damage,
+8% burn damage and so on), into clusters of five or six round a notable (92 notables: Troll's
Blood, Deadly Aim, Blood Drinker, Dharok's Rage, Hawk's Gaze, Ancient Magicks, Juggernaut's
Plate), out to the rim, where twelve ends alternate nine keystones and three masteries. Past the
rim are six wings, one for each class's side (below), with thirteen keystones more, and the tree
has 18 sockets for talismans. The rim's keystones change the rules:

| Keystone          | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| Zamorak's Fury    | 40% more damage; you take 25% more                                            |
| Iron Skin         | Armour doubled; you can't evade                                               |
| Steady Hand       | Your hits can't crit; 30% more damage                                         |
| Acrobatics        | +30% to evade; half the armour                                                |
| Point Blank       | Projectiles deal up to 30% more close to you, down to 30% less far away       |
| Mind over Matter  | 30% of damage taken comes from mana before life                               |
| Blood Rite        | Skills cost life instead of mana; you have no mana                            |
| Pain Attunement   | 30% more spell damage on low life (half or less)                              |
| Vampiric Pact     | Twice the life leech, up to 16% of damage; no life regeneration               |

A point comes with every level after the first, to 99, every rift whose guardian has fallen for
the first time, and Reldo's first quest (section 3): `(level - 1) + cleared + ladderPoints +
quests` for `cleared = maxDepth - 1`. On the ladder (past depth 16, `LADDER_DEPTH`, section 8)
the levels past 60 come about one a depth (section 4), so pushing deeper is two points a depth:
two are 2% to 3% more damage (16 more points made a typical level-60 hero 16% to 28% more
damaging, 48 more 34% to 133%, by `balance.ts`), against the monsters' 6% a depth, with the
rift-touched tier, elite bases, rolls and runes the rest. A point a depth was a drip. Before the
levels went past 60 the ladder gave the second point itself; a hero saved then keeps the points
they had as `ladderPoints`, so no one loses any. Taking a node takes the shortest way to it from what
you have, through nothing of another class's start, and pays a point a node. Giving one back
costs `15 + 4 * level` gold and only if the rest still hangs together; a reset costs half of
giving them all back. **A node's id is its place in the build order and saves keep those ids**,
so new nodes go on the end of `build()`, as the hybrids' starts, the tastes, the sockets and the
wings do (`passives.test.ts` pins the hybrids' starts at 633, 636 and 639, and every node after
them is a wing's, a socket or a taste inside the inner ring).

The expansion's proposal, with the reasons and the builds it's for, is `docs/tree-expansion.md`.
More points weren't added: more choice, the same power.

### Notables that do something

A node's stat line can hang on something (`StatLine.when`, `content/items.ts` `When`), and the
tooltip ends the line with it ("while holding a shield", "while on low life", "against frozen or
chilled enemies"):

- **What's worn**: a shield, a book, a blade, a battleaxe, a mace, a shortbow, a longbow, a staff,
  by the bases' families (`WHEN_FAMILIES`). These are counted with the gear, in town as in a rift.
- **The hero in a rift** (`HeroState`): killed, hit, evaded or moved (a step, a blink or a leap)
  recently (4, 2, 2 and 2 seconds, `RECENTLY`), on low life (half or less) or full life, under a
  buff of their own, under a flask, blessed at a shrine, and for each thrall (five at most,
  `THRALLS_COUNTED`). `Game.watchState` makes a key of the conditions the hero's stats hang on
  (`Stats.hangsOn`) each tick and works the stats out again only when it changes, so a tree of
  conditions costs nothing while nothing changes.
- **The enemy hit** (`VERSUS_WHEN`): burning, frozen or chilled, shocked, hindered (stunned, frozen
  or chilled), not attacking the hero, or rare or a guardian. These aren't the hero's to know, so they're kept apart
  (`Stats.versus`) and counted in `hitMonster` for that hit: an increase against the state joins
  the hit's other increases, `(1 + inc + vs) / (1 + inc)`, and a crit's multiplier likewise.

Eighteen of the old notables were reworked: twelve carry a forged gem's trait on the skills that
suit it (Lingering Magic is Gravebound, Storm Caller Thundering, Volley Master Cascading, Ancient
Magicks Echoing), and six have numbers that hang on what's worn (Iron Hide's armour with a shield,
Rapid Fire's speed with a shortbow). The wings' notables add powers (Pyre, Guthan's Warspear,
Redemption, Death Charge) and conditions (Berserker Necklace's 25% melee on low life). A notable's
trait joins the forged gem's and the worn uniques' on each skill it suits, the
best of each kept (`skills.ts` `skillTraits`), so a tree and a unique of the same trait never
stack; a trait that asks for a tag (`traitTag`) is only on skills with it.

Each wing leaves a taste near its class's start: three nodes off the inner ring (Bone Rites,
Rune Mysteries, Squire's Oath, Battle Cry, Light Feet, Steady Aim), so a necromancer can lean to
thralls at level 5 and its wing finishes the job at 25.

### The wings

A wing runs out from the outward node of the far cluster at its class's own angle, past the rim:
two nodes out, a hub notable with a talisman socket beside it, then two ways (three for the
mage's), each of small nodes, two notables and a keystone at its end, out to a radius of about
2,800 (`TREE_RADIUS`). 128 nodes in all; a wing's keystone is 23 to 35 points from its class's
start (`passives.test.ts` checks), and every class can walk to every wing, as to the rest of the
tree.

| Wing (side)            | Its ways and their keystones                                |
| ---------------------- | ----------------------------------------------------------- |
| Arceuus (necromancer)  | The risen: Arceuus Covenant. The offering: Demonic Offering |
| Wizards' Tower (mage)  | Fire: Inferno. Cold: Ice Barrage. Lightning: Tempest        |
| Temple Knights (paladin) | The oath: Temple Knight's Oath. The bulwark: Vengeance    |
| Bandos's Warband (warrior) | The cursed: Dharok's Curse. The warband: Piety          |
| Rogues' Den (rogue)    | The runner: Graceful. The blade: Dragon Claws               |
| Ranging Guild (ranger) | The blast: Chinchompa. The marksman: Rigour                 |

Each keystone is about a system the game already has:

| Keystone             | What it does                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Arceuus Covenant     | 2 more thralls of every kind; thralls deal 50% more; Gravebound raises twice as often, to stand four times as long (32 s); your own hits 50% less |
| Demonic Offering     | A magic, rare or guardian kill gives back 20% mana and 5% life, any other 4% mana; no mana regeneration |
| Inferno              | Ignites stack, three at once, each burning on its own; you can't freeze or shock                 |
| Ice Barrage          | A frozen or chilled enemy that dies shatters, 12% of its life within 2 tiles; you can't ignite or shock |
| Tempest              | Shocked enemies take 40% more, not 20%, and one that dies shocks those within 2.5 tiles; you can't ignite or freeze |
| Temple Knight's Oath | Melee increases apply to spells and spell increases to melee; skills cost 25% more mana          |
| Vengeance            | When hit, strike back for half your armour, twice a second at most; your hits deal 20% less      |
| Dharok's Curse       | 1% more melee damage for each 1% of life missing, up to 80%; no life regeneration                |
| Piety                | Your skills' buffs last twice as long and do 50% more; buff skills cost 50% more mana            |
| Graceful             | You move at your full pace while using skills; your hits deal 20% less                           |
| Dragon Claws         | A crit lands again for half, then twice more for a quarter; half the crit chance                 |
| Chinchompa           | Projectiles burst where they first hit or stop, 50% of the hit within 1.5 tiles; no pierce, chain, split or return |
| Rigour               | Projectiles deal up to 40% more the further they've flown, the most at 8 tiles; you move 10% slower |

Vengeance strikes back from the hero's armour, not from the hit, because a hit is meant to be 4%
to 7% of a hero's life (section 8) and a share of that would be nothing. The three elemental
keystones each shut out the other two elements, a real cost to a mage, whose own gems are of all
three. The guards against runaway chains: a pyre spreads only the worst of a dying enemy's burns,
a shatter has no skill (so it freezes nothing), and a claw's extra hits can't claw again
(`Game.clawing`).

### Talismans

The tree's own gear, as Path of Exile's jewels are (`sim/talismans.ts`): a talisman is an item of
the `talisman` slot, set in a socket that's been taken (twelve round the middle of the tree at a
radius of 1,200, one by each wing's hub), and its stats count as the tree's. A click on a socket
taken opens its picker: the one in it, to take out, and the pack's, to set in. A socket given back
keeps its talisman, doing nothing till it's taken again, so a reset never loses one. Nine bases
(the runecrafting talismans, Air to Nature), each leaning to its rune's own affixes (the Fire
talisman to burns and damage against the burning), 2 to 4 mods on a rare.

They drop on a roll of their own (`Game.talismanRng`, seeded apart, so every other drop is the
same as it was): from a normal monster 0.3%, magic 1%, rare 6%, a guardian 25%, a chest 3%, and a
guarded hoard always has one. A dropped talisman is unique 4% of the time and rare to 15% (both
more with increased rarity), magic to 70%, and normal the rest.

The six uniques work on the nodes in their radius (small 300, medium 450, large 650,
`TALISMAN_RADIUS`), drawn round the socket on the tree:

| Talisman  | What it does in its radius                                                       |
| --------- | -------------------------------------------------------------------------------- |
| Elemental | Nodes can be taken without the way to them (large); +8% elemental damage         |
| Catalytic | Small nodes give 50% more; notables give nothing                                 |
| Blood     | Mana nodes give life instead; +4% life                                           |
| Death     | Melee, projectile and spell damage nodes give thrall damage instead; +8% thrall damage |
| Law       | Attribute nodes give +4 to every attribute instead                               |
| Soul      | No radius: forged gems' and uniques' traits are 40% stronger, other skill gems deal 20% less |

The Elemental talisman's links are links the tree doesn't draw (`passives.ts` `extraLinks`): the
way to a node, giving one back, and whether what's taken hangs together all count them, so a node
taken through one keeps its socket and its talisman from going. One of each unique in the tree at
once.

### Enchanting

Aubury enchants a ring or an amulet, worn or in the pack, with one of the main tree's notables
(`sim/enchant.ts`; not a wing's, nor a class's own inside its start), for 2 Cosmic runes and
`60 + 8 * item level` gold; it gives the notable as if it were taken, and a new enchantment takes
the old one's place. It's for reaching across the tree: a notable without the way there.

### A tree that changes

A hero saved under an older tree (`hero.treeVersion` below `TREE_VERSION`, 1 since the wings)
starts the tree over once for nothing; the tree's screen says so. A save from before the version
is 0, so every hero who'd spent points when the eighteen notables changed got the free reset.
`TREE_VERSION` goes up whenever a change takes something from nodes already taken.

### The screen

The tree's screen (`ui/PassiveTree.tsx`) is drawn on a canvas, not in SVG: some 3,000 shapes in
SVG were all drawn again for every move of a drag and every node the pointer met, and lagged. Each
disc is drawn once for each look at the zoom it's shown at and copied for every node that looks
so, only the nodes on screen are drawn, the links are one shape for each colour, the view moves
once a frame however many pointer and wheel events come, and the tooltip follows the pointer by
its style alone. While it's open the world isn't drawn under it (`GameWebGLRenderer.holdFrame`,
set from the store each frame), so the GPU is the tree's. A socket is a hole with a notched rim,
its talisman's item icon in it; a unique's radius is a faint ring round it, and a node inside one
says so in its tooltip. The pictures are the cache's (`ui/sprites.ts` `TREE_ICON`: the stats
tab's skill icons, spells' and prayers'), listed there so the slim cache has them.

The balance bot can't score a trait or a keystone's rule, so it has named builds:
`balance.ts --build pyre` walks to Flames of Zamorak, Pyre and Inferno before it spends the rest
where they score best, and plays its rifts beside its class's plain path on the same seeds.

## 7. Items, runes and the economy

### Items

Ten slots: weapon, offhand, head, body, legs, hands, feet, cape, amulet, ring (a ring isn't
drawn). 178 bases, all real objects (`content/items.ts`): the metals bronze to dragon at levels
1, 4, 9, 14, 19, 25, 32 and 40 as scimitars, longswords, battleaxes, maces (a stun chance) and
daggers (crit, the rogue's); bows from plain to magic at 1 to 38, short and long; eleven staves
whose damage is the spells cast with them and which carry mana; plate (helm, body, legs, shield,
boots, chainbody), hide (0.6 of plate's armour, speed on the body), robes, the paladin's Initiate
and Proselyte, the rogue's own, the necromancer's Zamorak and skeletal pieces, three books, seven
capes, five amulets and six rings. A base has the classes it suits: drops lean three to one
towards your own, another class's weapon is theirs.

Rarity is normal, magic, rare or unique, white, blue, yellow and orange on the ground. A drop
rolls unique at 0.6%, rare at 5.5% and magic at 24%, each times one plus the hero's and the
rift's rarity. Magic items have one or two affixes (one of each kind at most), rares three to
five (three to six from level 20, three of each kind at most) and a name made of two words. There
are 22 affixes, 9 prefixes (added damage, damage, life, mana, armour, armour %, movement speed on
boots, spell damage, elemental damage) and 13 suffixes (attack and cast speed, crit chance and
multiplier, life and mana regeneration, life on hit, leech, the three attributes, evasion,
rarity), each in six tiers that open at levels 1, 9, 18, 28, 39 and 50 (movement speed, leech
and rarity in four, at 1, 14, 30 and 46). An affix rolls mostly in the best two tiers its level
allows. The bases stop at 40 and the affixes ten levels on, as the genre has it, so gear goes on
getting better almost to the level cap. A drop's base is likeliest among the newest its slot has,
measured from the best that slot can be, so past dragon's 40 the best bases stay the likeliest.

**Uniques** have fixed stats, a lore line and something that changes how the hero plays, so one is
a way to play and not only an upgrade (`UniqueDef` in `content/items.ts`): a forged gem's trait
(section 5) on every skill of the kinds it suits, at no cost to the skill's damage; a keystone's
rule, as if taken on the tree; or a power of its own (`POWER_TEXT`). Traits reach the hero's
skills through `Stats.traits`, merged into each skill's own by `skillTraits`; keystones through
the same set the tree fills; powers through `Stats.powers`. Eighteen drop anywhere:

| Unique                                 | Gives                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------- |
| Abyssal whip                           | Echoing 40%: hits again 0.4 seconds later for 40%                      |
| Granite maul                           | Surging: every 4th use a critical strike with 100% more damage         |
| Dark bow                               | Thundering 20%: lightning on a hit                                     |
| Twisted bow                            | Splitting 2: arrows split on the first enemy they hit                  |
| Ancient staff                          | Numbing 30%: hits slow                                                 |
| Staff of the Dead                      | Gravebound 20%: what it kills rises as a skeleton for you              |
| Ivandis flail                          | Volatile 50%: what it kills explodes                                   |
| Darklight                              | Bloodthirsty 25%: kills give speed                                     |
| Skull sceptre                          | Thrall burst: thralls burst as they crumble, for 150% of their blow    |
| Fire cape                              | Smouldering 40%: the ground where area skills land burns               |
| Obsidian cape                          | Iron Skin                                                              |
| Barrows gloves                         | Whirling 1.2: area skills draw enemies in                              |
| Dragon boots                           | Acrobatics                                                             |
| Amulet of fury                         | Zamorak's Fury                                                         |
| Berserker ring                         | Frenzied 6%: hits stack attack speed                                   |
| Archers ring, Seers ring               | Point Blank, Mind over Matter                                          |
| Warrior ring                           | Warding 3%: close-in skills' hits stack less damage taken              |

Five more are **pinnacle** uniques (`pinnacle: true`), dropped only by the Heart of the Rift's
guardian (section 9) and never rolled by `rollItem`: the Spectral spirit shield (40% less from
guardians' slams and rains), the Arcane spirit shield (Echoing 50%, for robes), the Elysian spirit
shield (a 70% chance to take 25% less from each hit, for plate), the Necklace of anguish
(Returning: arrows pierce everything and fly back) and the Amulet of torture (Numbing 40%, for
blades). `riftKeys.test.ts` checks every unique has its power and that the whip's echo reaches
its skills.

Sockets: up to 3 at item level under 10, 4 under 20, 5 under 30, then 6, within the slot's most
(a weapon 4, a bow 6 as it's two-handed, an offhand 3, body 6, cape 2, jewellery none). The first
socket is sure, each further one 55% likely, 60% of them the class's colour; a socket links to the
next on a chance falling from 62%. A hero's first gear has sockets of its class's colours, linked.

An item is worth `(2 + 0.8 * level)` gold times 1, 3, 8 or 25 by rarity; shops ask five times
that (`BUY_MARKUP`); a gamble costs `50 + 3 * level^2` and is always magic or better. The gamble
is the gold sink, as Diablo's is: its price grows with the square of the level, faster than gold
does, so it stays about what a rift's gold buys at any depth, rather than gold piling up with
nothing to spend it on (before, a hero at depth 12 sat on 200,000).

### Runes

Runes fall in the rifts, go in the pouch (the pack's Pouch page, with the herbs and the spoils:
the encounters' money and the late game's parts) and change what you wear, as the
orbs do (`content/runes.ts`, `sim/runes.ts`). Each roll comes from the hero's own crafting seed, so
the same hero using the same runes gets the same result, which `runes.test.ts` checks.

| Rune   | Does                                                      | Weight | From area level | Stack |
| ------ | --------------------------------------------------------- | ------ | --------------- | ----- |
| Air    | Normal to magic                                           | 46     | 1               | 1 to 3|
| Mind   | Rolls a magic item again                                  | 30     | 1               | 1 to 2|
| Nature | Normal to rare                                            | 7      | 1               | 1     |
| Chaos  | Rolls a rare again, name and all                          | 7      | 5               | 1     |
| Death  | Takes one affix off                                       | 4      | 5               | 1     |
| Cosmic | Adds an affix if there's room                             | 2.5    | 9               | 1     |
| Soul   | Rolls an item's numbers again within their tiers          | 1.5    | 13              | 1     |

Uniques and gems can't be changed, and a rune that can't do anything isn't spent. Aubury sells Air
at `10 + 0.3 * level^2` and Mind at twice that. On a riftstone the runes weave its modifiers as
they roll an item's affixes (`sim/riftstones.ts`): Air makes a plain one magic (one or two
modifiers), Nature rare (three or four), Mind and Chaos weave a magic or rare one again, Cosmic adds
one if there's room (two on a magic one, four on a rare), Death takes one off; Soul has no numbers
to roll there, and a Heartstone shard takes no rune.

### Shops and the stash

Every shop's shelves are rolled again each time the hero comes home: items for the hero's level,
from one below to two above, rarity 1.5, never unique, cheapest first (Horvik 14, Lowe and Zaff
12, Aubury 10). The gem trader shows 14 gems the hero's level is near, no two the same, leaning to
the class's colours, and for gold recolours sockets (`10 + 2.5 * itemLevel`), relinks them
(`16 + 3.5 * itemLevel`) or adds one (`(50 + 6 * itemLevel) * sockets`), each times
`1 + itemLevel / 20`, so the work on a deep rift's gear is dearer, as Path of Exile's orbs are. Fortunato sells gambles
by slot. The banker's stash is four tabs the size of the pack (40). Selling an item takes its gems
out into the pack first.

### Diablo II's items

- **Unidentified.** Uniques and set pieces drop unread, their names and numbers hidden, and Reldo
  reads them for nothing in the city: a moment of finding out, with little friction. Potions and
  talismans are read at once.
- **Uniques that roll.** A unique's numbers roll, each within a fifth, as Diablo II's do, so a
  second copy is worth a look, and a Soul rune rolls them again.
- **Sets** (`SETS` in `content/items.ts`), from OSRS's own: the six Barrows brothers', obsidian,
  the Void Knight equipment, the Raiments of the Eye and the Graceful outfit, with bonuses at two,
  three and four pieces worn. A piece's name is green, even unread, and its tooltip lists the set
  with what's worn lit. The brothers' come from the Barrows encounter, obsidian, Void and the Eye
  from the stalls that take the encounters' currencies (section 9), Graceful from the ladder's
  guardians and now and then its rares.
- **Skill levels and chance to cast.** Affixes add levels to every skill gem or one kind's (a gem
  past 20 with them), and uniques, sets and runewords cast a skill when you strike, are struck or
  kill, the skill worked out by `resolveSkill` at its level; a cast from one never casts again.
- **The rift-touched tier**, a seventh tier of affixes that rolls rarely on items of level 65 and
  up, which only the ladder drops: Diablo IV's greater affixes, so the chase doesn't end at 50.
- **Elite bases**, Diablo II's top tier from OSRS's best gear (godswords, Torva, Ancestral,
  Masori, Tumeken's shadow and more), dropping only on the ladder.
- **High runes.** Nine more runes, Water to Sunfire, drop only on the ladder, rarest last; they do
  nothing on an item of their own.
- **Runewords** (`content/runewords.ts`): fourteen, of the game's own names. A socket here holds a
  gem, so a word is inscribed, not socketed: a normal item with exactly the word's number of
  sockets, taken to Aubury's, has the runes spent on it in their order and becomes the word, its
  stats on its base's, often with a power, a chance to cast or skill levels, keeping its sockets for
  gems. The chase is Diablo II's: the right base with the right sockets, and the rare runes.
- **The transmuting circle** at Aubury's (`content/circle.ts`), Diablo II's cube: three of a rune
  give one of the next, up to the high runes, which is a use for every rune that piles up; three
  herbs one of the next; three riftstones of a depth one a depth deeper, as Path of Exile's map
  recipe does; a life potion, a mana potion and a herb a rejuvenation potion; and a normal base,
  a Law and a Cosmic rune its elite version. Every recipe is listed at the bench but one
  (section 9's secret rift).

## 8. Monsters and combat

### Scaling and ranks

A monster's life and damage are given at level 1 (`content/monsters.ts`, 25 monsters and the three
Barrows brothers) and scaled by level (`content/rules.ts`), as Path of Exile's monster tables are,
to follow a typical hero of the level, so that fights get longer as the rifts go deeper, not
deadlier:

- **Life** by `exp(0.16x - 0.00125x^2)` for `x = L - 1`, up to level 49, by 4% a level from there
  to 64, and by 1.5% a level past that. A hero's damage grows fastest early, as metals and affix
  tiers open, and slows as the last of them do (dragon bases at 40, the last affix tier at 50), so
  life's growth slows from 17% a level to 4%. It is about 120 times its level-1 life at 49 and 190
  at 60, where it was 520 and 1,900 before the fit; at those numbers a guardian past depth 12 had
  76,000 to 139,000 life and took most of the twelve minutes, and the bot stalled there.
- **The ladder** starts past level 64 (`LADDER_LEVEL`), the most a monster at depth 16 can be (its
  area level 61, two more for the guardian, one more three times in ten), so every depth to 16 is
  as the bot tuned it. By 16 a hero who clears each depth once is 60, its gems 20 and its gear at
  its last tiers, and what's left to grow on is rolls, runes, the rift-touched tier, elite bases
  and the ladder's passive points (two a depth, section 6). Life grows 1.5% a level there, 6% a depth, so the rifts past 16 are a
  ladder to climb, as Diablo's greater rifts are, whose wall is where the hero's growth runs out:
  a depth-24 monster has 1.7 times a depth-16 one's life, a depth-32 one 2.8 times and a depth-40
  one 4.5 times. At 4% a level it was 17% a depth, and the wall was four depths up: 3.6 times at
  24, 13 at 32, 47 at 40, against a typical level-60 hero whom five times the drops made 1.5 to 2
  times as damaging, fifteen times 1.7 to 2.8 times, and 48 more points 1.3 to 2.3 times
  (`balance.ts`'s typical hero, on paper).
- **Damage** by `(1 + 0.1x)^1.5`, to the ladder. A hero's life grows about as a power of its level,
  not exponentially, so what hits it does too, a little faster: a typical hit is about 4% of an
  on-level hero's life at 1 and 7% at 60 before armour and evasion, which grow as well. It stops
  at 64, as the hero's level stops at 60: past it a rift's danger is its laps' (one more monster in
  every pack, the guardian's 35% more life and 20% more damage) and its modifiers', not a blow that
  outgrows the hero's life. Before, a depth-24 hit was 1.76 times a depth-16 one.

Both are written as whole powers of constants, as `fm.pow` is portable for whole exponents only
(`content/rules.ts`, checked by `content/rules.test.ts`). Armour grows 12% a level, to the ladder
(`monsterArmourScale`). Level is the area level, one more for a rare, two for the guardian, and
one more again three times in ten.

Packs come in four ranks (`sim/Game.ts`). A normal monster is plain. A magic pack (36% of packs)
shares one mod and has 1.6 times the life and 1.15 the damage. A rare (14%) leads a pack of two
to four normal followers, has 3.6 times the life and 1.3 the damage, two mods (three half the time
from area level 12), a name of its own and stands 1.12 times as large. The mods are hasted
(1.35 speed, 1.3 attack rate), armoured (double armour +15), berserk (1.5 damage), colossal (1.6
life, 1.22 size), vampiric (heals 5% of its life a blow) and regenerating (2% a second). Kills pay
experience times 1, 2.2, 5 and 3 for the guardian, whose own experience is already high.

### How they fight

A monster idles until it sees the hero within 9 tiles (a guardian 12) in line of sight, which
wakes its whole pack; a monster more than 48 tiles from the hero isn't stepped at all. Chasing, it
walks straight when the hero is within 10 and the way is clear, or follows a flow field to the
hero's tile, and attacks within its reach (or its range, for a ranged one, in sight). Within 4
tiles of the hero, one with another monster in its way goes round it, 60 degrees to the side away
from it, so a pack closes from all round rather than queueing behind its first. A ranged one closer
than half its `keep` backs off at 0.8 of its speed till it's 0.8 of it away, and fights where it
stands if it's cornered (a guardian never backs off). An attack
lands at `hitAt` of its attack time (half, for most), as a melee blow that can be evaded or a
projectile that can be too. It goes home when the hero dies or when it's 36 tiles from home with
the hero 14 or more away, healing on the way. Burning, freezing and stunning stop or hurt it;
freeze and stun cancel the attack it was making.

### Guardians

Eight guardians, each with life from 220 (Grashnak) to 470 (K'ril), armour 20, twice the radius
and reach of a monster, and 3 magic guards (plus one per lap and per Swarming); eight more for the
odd laps, 240 (Obor) to 500 (Skotizo) (section 3); and the Heart's (section 9). On each lap past
the first a guardian has 35% more life and 20% more damage (`GUARDIAN_LAP`), so a Torment
guardian stands out from its rift as Diablo's do, and the ladder's last rungs are guardians. A
guardian
wakes with its pack and uses its special every 5 to 7 seconds while the hero is within 14: a
**slam** (a red ring on its own spot that lands after a 0.9 to 1.1 second windup, 2 to 2.4 times
its hit, radius 3 to 4: stand clear), a **rain** (6 marked circles, the first on the hero, the
rest 1.5 to 5 tiles about, landing one after another) or a **nova** (10 or 14 projectiles in every
direction). Kree'arra's rain was 7 circles and Jad's 8, and between them they killed more heroes
in the bot's runs than the other six guardians together: that many circles fill the ground within
5 tiles, so there was no gap to run to. With 6 there is, as there is in Ahrim's. A guardian may
have `more` specials than its one, which it uses in turn (`bossSpecials`; the one under way is
`specialNow`): only the Heart's does, slam, nova and rain. Its ailment durations are 0.35 of a monster's, it's culled at 5% not 10%, and it's
never pushed by the crowd. Killing it opens the portal home and marks the next depth reached.

### Hitting and being hit

The hero's hit is the weapon's roll times the skill's share, increased by the tree, gear and
buffs, crit at the hero's chance, then cut by the monster's armour. The hero's armour cuts
monster damage the same way; evasion is rolled first against attacks (never against a guardian's
slam or rain); an Elemental rift's share is added after armour; Mind over Matter sends 30% to
mana. A life flask can't be drunk under one charge. Life on hit and leech heal on every hit,
leech capped at 8% of damage.

**How a hit lands** (`IMPACT` and `HIT_SHARE` in `content/rules.ts`). A hero's blow lands 42% of
the way through the use of a skill, as it always has; the client plays the skill's animation to
meet it (`content/anims.ts`, section 10). The hero moves while using a skill, as Path of Exile 2's do: walking (a click, the keys, a goal)
carries on through a use at `HERO.castMoveShare` (40%, so 60% slower; it was 70%) of the pace, facing where it was aimed, and
the use plays out and lands where the hero is when its blow comes. Walking used to cut a use short
(called off and paid back before its blow, the follow-through dropped after it), and the hero
stood rooted while swinging; that read as sluggish, so it went. The client shows a moving use's
animation up to its blow and runs after it, as there's no blending a run's legs with a swing.
What's pressed during a use still waits for its end. While the keys walk the hero, the left
button is its skill as the others are, used at the pointer or the monster under it from where the
hero's walking (as with Shift, but moving), since a click can't be a walk while the keys steer.
That holds for the whole press: one made while the keys walk, within `KEYS_GRACE_MS` (0.6 s) of
their last step, or held while they walk stays in place till it's let go (`Client.leftInPlace`),
and the hero stands while no key's down. It used to be read tick by tick, so letting go of a key
between steps of a kite turned a held attack on a monster out of reach into a walk up to it,
dragging the hero forward. In town, where there are no skills, a click is always a walk. A blink or a leap that's ready is used at
once, out of anything, as Path of Exile 2's dodge roll is (`cutAction`, `recoverUntil`).

Every hit shoves what it hits away from where it came from (the hero, a shot's way, a strike's
middle): 0.08 tiles, plus the share of its life it took, plus 0.1 for a crit, at most 0.6, spent
over a few ticks; three quarters of that for a magic monster, under half for a rare, none for a
guardian. A hit that takes over a tenth of a monster's life while it's winding up a blow may
stagger it out of it: the chance is 2.5 times the share past a tenth (a quarter for a fifth of its
life, certain at half), 0.7 of that for a magic monster and 0.4 for a rare; it stands 0.3 seconds
and can't be staggered again for 2. Path of Exile 2's light stun goes by the same share. A guardian
is never staggered.

Each projectile hits an enemy once, but a fan's could all hit the same one, so Split Arrow's five
landed together at a guardian's feet, for 3.75 times a weapon's hit to Shoot's one; the ranger
killed guardians in half the time the other classes did. A skill marked `onePerTarget` (Split
Arrow) now hits each enemy once between all of a use's projectiles, as Path of Exile's fans do, so
the crowd skill is for crowds. Barrage, four arrows in 8 degrees, is meant to land all four on one
enemy, and does; Blessed Hammer and Fan of Knives land two or three up close and one further off.
Arrows a support or the tree adds widen a fan to ten degrees a gap at the least, but a tight
volley, its own arrows under ten degrees apart, fits them inside its arc (`spreadOf` in
`sim/skills.ts`): Volley on Barrage is six arrows in its 8 degrees, and all six land on one enemy
eight tiles off as its four do, 13 to 28% more damage for 40% more mana. Barrage is the only such
skill, so every other fan widens as it did. Until 2026-11-14 every added arrow was ten degrees
from the next, so Barrage with Volley was six over 50 degrees, one of which found an enemy eight
tiles off, a link for more damage that gave less, and neither gem's words nor the tooltip said so.

### The ladder's monsters

- **Mods** (`content/monsterMods.ts`): past 16 twelve more join the campaign's six, after Diablo
  II's champion mods, Diablo III's elite affixes and Path of Exile's, each something seen and
  answered: Infernal, Frostbound, Charged, Blinking, Volleying, Raising, Commanding, Binding,
  Grasping, Molten, Draining and Shielding. Each mod past the first pays as Diablo II's do, with
  more and better loot from that monster. Reflected damage is left out on purpose: it punishes the
  player for playing.
- **Ailments**: several mods burn, chill, shock or root the hero, shown beside the buffs; four
  potion suffixes end one and keep it off (section 4).
- **Guardians** have a mod, two from rift 30, and three are theirs alone: Enraging, Summoning and
  Warded. Each ladder guardian has a new special besides its own: a charge, a summon of its host's,
  or a field of fire or frost.
- **Superiors**: any ladder kill has a 1 in 200 chance of calling up its superior where it fell,
  OSRS's own where the cache has one, as Slayer's are, much tougher and richer.
- **Wilderness bosses** roam one ladder rift in four, Diablo II's superuniques: named, hunting the
  hero across the rift, and dropping as a guardian does.

### Resistances

Diablo II's and Path of Exile's gear has a tension to cap, and so does this (`RESIST` in
`content/rules.ts`). Fire, cold and lightning resistances come from rare suffixes on armour and
jewellery (six tiers, 6% to 42%), "to all resistances" on amulets, rings, off-hands and bodies (3%
to 16%), talismans (3% to 8%) and Reldo's Ashen Wastes quest (10%). Each is held to 75%, and each
Torment lap takes 15% off, to 60% from rift 33, as Nightmare's and Hell's penalties do, so gearing
for the ladder is a puzzle; it can go to -100%. Elemental damage goes through armour, and
resistances stop it: the ladder's mods' fire, cold and lightning (Infernal's burning, the frosts'
fields, a mod's ailment-bearing strikes) and an Elemental rift's added damage, a third of each
element. The character page shows each, and the Torment's penalty where the hero is. Immunities
are left out: they forced two-element builds in Diablo II, Path of Exile dropped them, and they'd
break deaths the player can explain. The ladder bot's runs to 34 with them (warrior, mage, ranger,
one seed each) reached it, the warrior and ranger dying 12 to 15 times, mostly to guardians.

### Loot

Every monster drops by rank (`Game.dropLoot`), each item and gem with the rift's quantity chance
of bringing another: a normal monster an item 1.5% of the time and gold 30%; a magic one an item
6% with +0.6 rarity and gold 55%; a rare one an item at least magic half the time, at +1.5
rarity, four times the gold and always a rune; a guardian one item at least rare, one at least
magic 35% of the time, a unique two times in ten, a handful of runes and twelve times the gold.
Items were cut to these from 13%, 38%, two and a half and four (and then from a halfway cut): a
pack left a carpet of them, and none was worth looking at. Now an item on the ground is an
event, as it is in Diablo; gold, runes and the shops carry the rest of the hero's gearing. An item the quantity chance adds is at least what the drop it came with was (a rare for a
unique), so a rich rift's guardian drops more rares, not more of the plainest. Gems drop 0.5%, 2%,
10% and always from a guardian, and only skills the hero's class can use; forged gems (section 5) drop
0.05%, 0.2%, 2% and 15%. Gold is `(1 to 4) * (1 + 0.7 * level)`.
Drops land on free, reachable ground round the corpse, items first, then runes, then gold.
Chests and hoards (section 3) drop through the same `dropLoot`, as a `LootSource` of their own
rank. From depth 9, on top of the rest (`Game.rollKeys`), a guardian drops a riftstone of its
depth and, 40% of the time, another a depth deeper; a rare drops one 4% of the time; a hoard half
the time; from depth 17 a guardian sheds a Heartstone shard 40% of the time. The Heart's guardian
drops a pinnacle unique, a second 35% of the time, and a riftstone a depth deeper (section 9).

## 9. Rift modifiers

Sedridor offers three versions of each depth (`content/riftMods.ts`, `sim/riftMods.ts`): the first
with no modifier or one, the next one or two, the last two or three, rolled from a seed when first
asked for and kept until he opens a rift, so there's always a choice between safe and rich. Each
modifier makes the rift harder in one way and pays in four: more items (quantity), better ones
(rarity), more runes, and more experience.

| Modifier         | From depth | Effect                                                        | Items | Rarity | Runes | Exp. |
| ---------------- | ---------- | ------------------------------------------------------------- | ----- | ------ | ----- | ---- |
| Hasted           | 1          | Monsters move and attack 25% faster                           | 12%   | 10%    | 12%   | 8%   |
| Hardy            | 1          | 40% more life; 15% more time                                  | 12%   | 10%    | 10%   | 10%  |
| Brutal           | 1          | 25% more damage                                               | 12%   | 12%    | 10%   | 8%   |
| Ironclad         | 1          | Twice the armour; 10% more time                               | 8%    | 8%     | 8%    | 6%   |
| Teeming          | 1          | 40% more packs                                                | 10%   | 5%     | 10%   | 5%   |
| Enraged guardian | 1          | Guardian: 60% more life, 30% harder, specials 50% more often; 10% more time | 10%   | 15%    | 15%   | 8%   |
| Swarming         | 2          | Two more monsters a pack                                      | 8%    | 5%     | 8%    | 5%   |
| Vampiric         | 2          | Blows heal the monster 4% of its life                         | 8%    | 8%     | 8%    | 6%   |
| Regenerating     | 2          | 2% of life a second; 10% more time                            | 8%    | 6%     | 8%    | 6%   |
| Fleeting         | 2          | 35% less time                                                 | 16%   | 16%    | 14%   | 12%  |
| Empowered        | 3          | Magic and rare packs 50% more common                          | 6%    | 8%     | 6%    | 5%   |
| Elemental        | 3          | 30% of each hit again as fire, cold or lightning, past armour | 14%   | 12%    | 14%   | 10%  |

A rift's modifiers are named in a line under its name at the top left, what each does and what
they pay on hover, in the rift and in the city while it's open. The city never has any. `riftMods.test.ts` checks each does what it says, that
rewards grow with them, and that a modified rift plays out the same from its seed.

**The time limit.** A rift stands for `120 + 3 * monsters` seconds (`RIFT_TIME` in
`content/rules.ts`), times `1 + time` for its modifiers' summed `time` effect, never under 0.3:
about ten and a half minutes for a rift of 170 monsters, so a bigger rift is given longer. The
balance bot clears most rifts in 3 to 8 minutes; at `90 + 2 * monsters` (about seven) a quarter
of its rifts collapsed, too tight for a player who stops to loot. At this limit, with the weapon
classes' mana on hit (section 4), 2 to 5 of each class's 17 to 22 rifts to depth 8 collapse in
the bot's hands, mostly where it fights every pack on its way rather than going round.
Fleeting (-35%) is the race, paid for well; the modifiers that make monsters take longer to kill
(Hardy, Ironclad, Regenerating, Enraged guardian) give some of that time back, so a hard rift
isn't also a short one. The clock is the rift's own ticks (`Game.timeLimit`), so it runs only
while the hero's in the rift and waits while they're home with it open; the guardian's death
stops it for good, and a dead hero's doesn't run out. Warnings come at 60 and 15 seconds left
(`riftTime`), and at 0 the sim emits `riftCollapsed`: the client closes the rift as a death does,
but the hero comes home alive and loses no experience. The HUD shows the time under the rift's
name, red in its last minute. The balance bot plays to the limit rather than to a fixed 12
minutes, so a timeout in its numbers is now a collapse.

### Riftstones and the Heart

Past the Archmage's own offers, rifts have keys, as Path of Exile's maps and pinnacle fragments
are (`content/riftstones.ts`, `sim/riftstones.ts`). A **riftstone** is an item (base
`riftstone`, an Ancient shard, its `level` the depth) whose `rift` holds its modifiers: normal
with none, magic with one or two, rare with three or four (30% and 10% before rarity). The runes
weave it (section 7), so a hero can make the rift they want, up to four modifiers where the
Archmage weaves three. Given to the Archmage, whose panel lists them in a third column with what
each pays, it opens its rift woven as it is and is gone; one deeper than the hero has reached is
refused. It can't be worn and sells for 30, 60 or 120 gold by rarity, times `1 + depth / 10`.

The **Heartstone's shards**, Air, Water, Earth and Fire (the frozen key's four pieces), fall from
guardians on the ladder, a missing one three times likelier than one the hero has. With all four
in the pack, the Archmage takes them and opens the **Heart of the Rift** (`HEART_ZONE`) at the
deepest the hero has reached, 17 at the least: an astral rift of black and lesser demons and dark
wizards with a third of the packs (`HEART_PACKS`), whose guardian is the Corporeal Beast, the Heart
of the Rift, with 1,400 life at level 1 (three times K'ril's), a special every 5 seconds and
all three kinds in turn. It drops the pinnacle uniques (section 7). Clearing it doesn't deepen the
hero's rifts. The save keeps `riftHeart` for a Heart left open (false in an older save), and the
keys as items in the pack and stash.

### The ladder's rifts

Past 16 a rift isn't the next zone in order; it's rolled from parts, as Diablo II names its places
(`content/ladder.ts`, `sim/ladder.ts`), on a stream of its own from the rift's seed. What keeps
random content interesting is random hand-made parts, rolled where the player sees them before
choosing, each changing how a rift plays, with rare surprises, and every currency feeding a
chase; so each part is made by hand and looked at in the game, and the roll only puts them
together:

- **The land**: one of the generator's thirteen biomes, now and then mixed with a second, its
  knobs rolled within ranges the biome sets; one in five lies at dusk.
- **The host**: one of fifteen of OSRS's factions, from Bandos's warband to the Abyss, with
  forty-one new monsters; it decides which of its guardians (eight new) can be met.
- **The guardian**, the encounter (below) and the modifiers, as before.
- **The name** from the parts: "The Ashen Fen, held by Bandos's warband".

The Archmage's offers show each rift's land, host, guardian and encounter before it's chosen. The
first sixteen depths stay the campaign's, hand-laid and tuned.

### Encounters

Path of Exile's leagues give its maps their variety; OSRS's minigames do it here
(`content/encounters.ts`). Every ladder rift has one, shown in the offers, each a thing to do that
pays in its own way, and its state shows under the rift's name:

| Encounter | Like | Pays in |
| --- | --- | --- |
| A fleeing impling, gone in 15 s | Diablo III's treasure goblin | Its jar spilling open |
| A Wilderness hunter, a hero of a class who never gives up | Path of Exile's rogue exiles | What it wore |
| The Fight Caves: waves of TzHaar, doubling with each one dared | Ritual; push your luck | Tokkul |
| The Barrows: three sarcophagi, three brothers, a chest | Diablo II's tombs | The slain brothers' set pieces |
| Pest Control: four portals round a Void Knight | Blight; defend | Void seals |
| A God Wars skirmish: two gods' armies at war | Legion | The gods' kill count |
| An Abyssal breach, its ring growing for 22 s | Breach | Abyssal ashes |
| Guardians of the Rift: essence to the Great Guardian against the clock | Harvest | Abyssal pearls |

The currencies go in the pouch. Tokkul buys obsidian from TzHaar-Hur-Tel, Void seals the Void
Knight equipment from the Void Knight, and pearls the Raiments of the Eye from Apprentice Felix,
at the square's stalls; kill count and ashes open pinnacles.

### Pinnacles

Beside the Heart, past 16 (`content/pinnacles.ts`): **the four gods' generals**, Graardor,
Kree'arra, K'ril and Zilyana, each opened with forty of its god's kill count, each with its own
bodyguards round it; **the Abyssal Sire**, opened with a hundred abyssal ashes, guarded by its
spawn, which drops the Abyssal whip too; and **the Fortis Colosseum** (`content/colosseum.ts`),
open to anyone past 16: twelve waves in its sand, a choice of three glories after each (a harder
rule that pays the better for it, as Diablo IV's Infernal Hordes' boons and banes are), and Sol
Heredit at the end. Its land is a pit (`world/riftLayout.ts`): round sand 24 to 27 tiles in
radius and the camp in an alcove off it, the sand's middle about 55 steps from the camp, where it
was a loop's heart about 230 steps round the ring, with nothing on the way. Minimus stands four
tiles from the middle towards the gate, and coming within 18 tiles of it, on to the sand, starts
the first wave. Each drops uniques nothing else does, opens at the deepest the hero has
reached, and takes them no deeper. Past them are the late game's (below): each but the Coop
**awakened**, and **the Tombs of Amascut**, a raid of five rooms.

### The rift web

Last Epoch's monoliths and Path of Exile's atlas, kept small (`content/web.ts`, `sim/web.ts`). At
the hero's deepest rift past 16, the Archmage's offers are places on a web of five lanes: the
hero stands on one (the middle to start), and the places on it and the lanes beside it are open.
Each place is a rolled rift with up to three modifiers and a **bounty**, shown before it's chosen:
its guardian drops a talisman, a set piece, a forged gem, three potions or a unique, it gives a
hoard of herbs, more runes or more experience. Clearing one moves the hero onto its lane, and the
next depth's places open from there, so the lane walked is a choice of what to chase. A place keeps
its rift till it's done: the web is saved as a seed and the lane (`web`), and a rift open from it
as `riftLane` and `riftBounty`. Shallower depths keep the three offers.

### The secret rift

Diablo II's secret level, made of OSRS's own joke: the Evil Chicken from the old random event
(`PINNACLES.chicken`). Now and then an egg or a raw chicken falls in a meadow's rift (any rank,
likelier from the bigger; `CHICKEN_DROPS`), and the pouch shows them only once there's one in it.
With one found, Aubury's bench shows a recipe it never lists: three eggs, a raw chicken and a Law
rune laid in the circle open **the Coop** in the tear, at the deepest the hero has reached,
whatever that is. Its flock is chickens, many and weak (a third of their depth's life, two fifths
of its damage: `flock`), and the Big Evil Chicken leads them, calling more of them up, with a
pinnacle guardian's drops: two uniques of any kind and a riftstone, since the Coop has none of its
own. A joke, with good loot. The changelog keeps the secret: it says only that something in the
meadows lays eggs.

### The late game

What a hero past rift 16 and level 60 has to chase, as built from `docs/late-game.md` (which has
the research and the reasons): OSRS's late game laid over the ARPG's. Every number is a first
guess; none has been run through the bot, which fights no pinnacle or raid.

**Rift-touched uniques**, Diablo III's ancients (`touchLift` in `sim/loot.ts`). A unique that
drops on the ladder (past `LADDER_LEVEL`, 64) above its own level stands with the elite bases its
level reaches: its weapon's damage is lifted by as much as the best base of its kind hits harder a
second at the drop's level than at the unique's own, its armour by as much as its slot's most
armour grows, and its added and increased numbers (not speeds, chances, leech or skill levels,
which have caps or are enough) by a fifth for each elite tier passed (`ELITE_LEVELS`, 55, 70, 85).
Its trait, keystone or power is as it was: the lift is numbers, not rules. "Rift-touched" goes
before its name and its lifted lines are drawn in the seventh tier's colour. It's worked out from
the level the item dropped at, which is saved already, so nothing new is saved and every unique a
hero had found on the ladder was lifted the day it was built. A whip at rift 40 keeps up with a
godsword's damage a second, not with its blow.

**The circle's upgrades**, OSRS's own (`UPGRADES` and `MAKES` in `content/circle.ts`, the uniques
in `lateUniques` in `content/items.ts`). A unique laid in Aubury's circle with its part and gold
(twice its level squared) gives its upgrade: a unique of its own at the same level, its sockets,
gems and level kept, its rolls where they were in their ranges, read at once. Each keeps the old
one's way to play and adds to it, with its numbers 15% to half again more:

| Laid in | With | Gives |
| --- | --- | --- |
| Abyssal whip | A Kraken tentacle | Abyssal tentacle: Echoing 55%, and Numbing 20% |
| Staff of the Dead | A Magic fang | Toxic Staff of the Dead: Gravebound 30%, and Numbing 25% |
| Darklight | Three Ancient shards | Arclight: Bloodthirsty 35%, and 40% more damage against demons |
| Arclight | A Tormented synapse | Emberlight: Arclight's, Smouldering 40%, and 50% against demons |
| Ivandis flail | Blisterwood logs | Blisterwood flail: Volatile 70%, and 40% more against vampyres |
| Dragon boots | A Primordial crystal | Primordial boots: 10% more melee damage |
| Amulet of fury | A Blood shard | Amulet of blood fury: 3% life leech |
| Dizana's quiver | 50 Sunfire splinters | Blessed Dizana's quiver: half again, Frenzied 5% and Splitting 2 |
| A Berserker, Archers, Seers or Warrior ring, a Ring of suffering, the Skull sceptre | A Wrath rune, and eight times its level squared in gold | Its "(i)": every number doubled, its rule as it was; the sceptre's raises a thrall more |
| An Infernal cape, or a Blessed Dizana's quiver | The Max cape | The Infernal or Dizana's max cape, at level 99: both items' numbers |
| A vestige | Three Chromium ingots | Its ring (below) |
| An Uncut onyx | A Law rune | An Amulet of fury or a Ring of suffering, the hero's choice: a way to aim at a unique |

"Against demons" and "against vampyres" are two conditions of the enemy hit (`vsDemon`,
`vsVampyre`). The parts are goods in the pouch, shown once found (`PART_DROPS` in
`content/goods.ts`): Ancient shards from the restless dead now and then and Vet'ion half the time;
a Tormented synapse, a Primordial crystal, a Kraken tentacle and a Magic fang a third of the time
from the Tormented Demon, Cerberus, the Kraken and Zulrah; Blisterwood logs from Morytania's
vampyres and their guardians; Blood shards from the Vyrewatch. They fall on a stream of their own
from the rift's seed (`Game.partRng`), as talismans do, so every other drop is as it was and
`Game.test.ts`'s fingerprints hold.

**Awakened pinnacles**, Desert Treasure II's (`AWAKENED` in `content/pinnacles.ts`). Each pinnacle
but the Coop and the Tombs is on the Archmage's list a second time, awakened, opened with its key
and an **Awakener's orb**, at the deepest rift reached. The orbs drop from a pinnacle's guardian a
third of the time, and from the ladder's superiors and Wilderness bosses one time in ten from rift
30. Awakened, a guardian has twice the life and a quarter more damage, its specials come 30% more
often, and at half its life it begins a second phase (`Game.awakenPhase`): its retinue raised again
(or four of its land's guards, if it has none) and a special more from the ladder's pool. It drops
two of its uniques every time, their numbers in the top half of their ranges; three Chromium ingots
a third of the time; its pet one time in 50; and its own (`AWAKENED_DROPS`): the four generals each
their vestige half the time, the Heart three ingots always, the Colosseum 25 Sunfire splinters. A
vestige and three ingots in the circle make Desert Treasure II's rings, the only ring uniques above
level 35, so every class has a reason to go into every stronghold:

| Ring | Its numbers | Its trait |
| --- | --- | --- |
| Ultor (Graardor's) | 12% more melee damage, 20% more crit multiplier, 40 life | Volatile 40% |
| Venator (Kree'arra's) | 12% more projectile damage, a projectile more, 15 Dexterity | Splitting 2 |
| Magus (K'ril's) | 12% more spell damage, 10% less mana cost, 15 Intelligence | Echoing 35% |
| Bellator (Zilyana's) | +3% crit chance, 8% more damage, 15 Strength | Surging |

**The Kraken and Zulrah**, the ladder's guardians of Waterbirth's dagannoth and Karamja's jungle,
which stay where they rise (`speed: 0`) and change form (`BossDef.forms`, each drawn as its own
bake). The Kraken is a whirlpool till the hero comes near (`asleep`), then rises and casts water
from where it is, calling the sea down round the hero. Zulrah turns every twelve seconds: green and
spitting, red and lashing where the hero stands, blue and casting; venom pools round the hero
whichever it is.

**The Tombs of Amascut**, the raid (`content/tombs.ts`). A pinnacle of `rooms`, free to open at the
deepest rift reached, and never awakened: its invocations are its harder self. It's laid out as
OSRS's own is, on a plan of its own kind, the **nexus** (`plannedKind` in `world/zoneGen.ts`,
`planHall` in `world/riftLayout.ts`): a hall 22 to 25 tiles in radius in the arena's middle, the
camp in an alcove off it towards its corner, and four chambers of 15 to 17 round it, each 49 to 54
tiles from the hall's middle down a short lane, about 15% of the arena open in all. It was a
desert rift of the biome's kind with Osmumten at the far end and nothing on the way, a walk of
250 steps or more before the raid began; now the hall is about 50 steps from the camp and every
chamber a few seconds past it. Osmumten stands beside the hero as they come in. The four paths
are in the chambers in an order rolled from the seed, marked on both maps till they're beaten,
and taken in any order (`Game.stepTombs`): walking 70% of the way into an unbeaten chamber raises
its room round the chamber's middle, and while one's up no other rises. Het's Akkha with two of
his shadows; Apmeken's Ba-Ba with three baboon brawlers and two baboon mages; Scabaras's Kephri
with three soldier scarabs; Crondis's Zebak alone. Once the four are beaten, coming within 14
tiles of the Nexus's middle wakes the Wardens, three seconds before they rise round it, Tumeken's
with Elidinis' beside it, a rare with her own name; the hall is the plan's guardian's arena, so
the portal home opens there. On land drawn without a nexus (the tests' plain field, or `?rifts=`
in development) the chambers are four spots fanned out from the camp (`TOMBS.fallback`). Kephri
and Zebak stay where they rise, as in their rooms. A path's guardian has 1.8
times a pinnacle guardian's life and 1.1 its damage, a guardian's mod, and drops two hoards, not
the Tombs' uniques; the Wardens have 2.5 times and 1.2, two mods and a special more, and drop them:
**Lightbearer** (a ring: 8% attack speed, mana regeneration, life; Thundering 15%), **Elidinis'
ward (f)** (a robed class's offhand: 25% more spell damage, life, 6% less damage taken; Warding
4%) and **Keris partisan of the sun** (a blade: 30% more melee damage, life on hit; Smouldering
45%). The boss bar shows each room's guardian (`Game.shownBoss`). There's no clock unless Jog for
It sets one.

The **invocations** are chosen at the Archmage's, beneath the pinnacles, for the next raid, and
add up to its raid level; each level is 0.2% more items, 0.2% rarer, and 0.2% more chance of the
Wardens' second unique, a tenth of the time without any:

| Invocation | Level | What it does |
| --- | --- | --- |
| Walk the Path | 20 | The rooms' monsters have 25% more life |
| Overclocked | 20 | Monsters move and attack 15% faster |
| Insanity | 40 | The guardians have 50% more life and hit 25% harder |
| Feeling Special? | 20 | The guardians use their specials half again as often |
| Blood Thinners | 10 | Monsters regenerate 1% of their life a second |
| Aerial Assault | 15 | A fifth of every hit on you comes again as the sun's fire |
| More Overlords | 15 | Each room has two more of its first add |
| Double Trouble | 25 | A rare leads each room's adds |
| On a Diet | 15 | No potion can be drunk |
| Jog for It | 20 | The Tombs collapse in ten minutes |

All ten are raid level 200. They're saved with the hero (`invocations`) and with the open raid
(`riftInvocations`).

**The orrery**, Path of Exile's atlas tree kept small (`content/orrery.ts`, `sim/orrery.ts`). The
cache's Orrery (loc 25401, turning with seq 3579) stands on the square between the tear and the tower;
clicked, it opens its panel. Its spheres are lit by firsts on the ladder: each host's guardian slain
in each band of eight depths from 17, each pinnacle cleared, and each awakened. Each sphere is a
point, and a point takes a node: 43 in five arms (the encounters, the hosts, the rifts, the keys,
the finds), 13 of them notables, each taken after the one before it in its arm and given back the
last of its arm first, for twice the deepest area level's square in gold. Each is a lever on a
roll the ladder makes already, read from the hero where it's made: the encounters' currencies, gold,
a rift's time, a chest more and a guarded hoard, shrines' blessings, riftstones a depth deeper, the
Heartstone's shards, Awakener's orbs, a pinnacle's key, rarity, superiors, and two favoured hosts,
chosen at the orrery, whose parts drop twice as often. Saved as `orrery`: the nodes by id (an arm's
place times a hundred, and its step), the spheres, and the hosts favoured.

**The record** (`sim/log.ts`, `content/achievements.ts`, `content/pets.ts`), the Log side tab, none
of it power. **The collection log**, OSRS's, has a page for each pinnacle (its uniques, goods and
pet), the rifts' uniques, the sets, the circle's makes, the potions, the talismans, the parts and
the pets: 170 things, each lit the first time the hero has it, read (a pinnacle's pet is on its page
and the pets' too). A save from before it lights what the hero holds as it loads. **Combat
achievements**, OSRS's six tiers, 132 of them for 483 points: for each guardian its kill, its kill
untouched by its specials and its kill within 45 seconds of its waking; for each pinnacle's its
awakened kill; and fourteen for the rifts, the encounters, the raid and level 99, counted from what
the sim sees and never offered or given up. Their points open **Ghommal's hilts**, each a
convenience: at 10 the teleport home takes two seconds, at 30 the Archmage offers a fourth version
of each rift, at 60 a pinnacle's key takes a quarter less, at 100 an awakened pinnacle gives its orb
back one time in four, at 150 pets come twice as often, and at 220 a rift's time runs a quarter
longer. **Pets**: 23 guardians drop their own, one time in 250, or 50 awakened, and the one chosen
on the log's pets page follows the hero, drawn by the client alone, so the sim's the same with it or
without. Saved as `log`, `achievements`, `pets` and `pet`.

**The Max cape**: Reldo's, at level 99, for 100,000 gold, one at a time: 15 to each attribute, 60
life, 40 mana, 8% to every resistance, Frenzied 3% and Bloodthirsty 15%. The circle joins it with
the Infernal cape or the Blessed Dizana's quiver. The 99th level is a moment, then.

**Sinks that are chases.** The stalls' currencies buy what OSRS's own shops sell for them: the Void
Knight makes a Void knight top or robe elite for 200 seals, its sockets kept, and with both elite
pieces worn the set's bonuses are half again; TzHaar-Hur-Tel sells an Uncut onyx for 8,000 tokkul;
Apprentice Felix a rare talisman of the base chosen for 40 pearls, one time in eight the Elemental
or Catalytic talisman instead. Past the campaign, Fortunato's **elite gamble** sells elite bases of
the chosen slot at the deepest area level reached, at that level's price (`50 + 3L²`, 74,000 at
rift 40's 157), rolling the rift-touched tier, while the shops stay at 60. The folk's tasks past
rift 16 pay at their depth's level, elite bases among them, and Father Lawrence an Ancient shard
besides.

## 10. Presentation

- **The camera** looks north from the south at pitch -400 (about 70° down), 19 tiles away by
  default, 12 to 30 with the wheel, so a screen is about 27 by 16 tiles. On the title it comes in
  to 5.8 tiles before the hero and 10.5 for the line of classes.
- **Controls.** The left button does what it's pressed on: walk (a ring marks the spot, and held
  it fights a monster swept under the pointer on the way), fight
  (and keep fighting while held, then whatever's under the pointer when it falls), pick up, talk,
  the waystone, the portal. The right button, Q, E, R and F are the other five skills, aimed at
  the pointer or the monster under it, walking up first to a monster out of a blow's reach or a
  shot's range or sight; the hero moves while using a skill (section 8); Shift stands still; WASD walks; 1 and 2 drink; Space picks
  up the nearest; Z hides loot names; B or I open the pack (gear's dragged to its slot); Tab the
  overlay map; P the tree; H help; T the
  teleport; Escape closes things, then the menu. Every key but the mouse's buttons and Escape can
  be set again from the menu's **Controls**, two to a control (`client/controls.ts`: the defaults,
  reading them back from the settings, a key moved off whatever had it), and the HUD and tooltips
  name the keys as they're set. Controllers send the keys the pack and the flasks are on
  (`PAD_BINDINGS`, set again whenever the controls change).
- **Picking**: a loot label first, then a monster, then the nearest of what's on the ground,
  people, the waystone and the portal, each a padded box round its model on screen.
- **The overlay** draws warnings (red rings where a blow will land, gold for the hero's own),
  the walk ring, bars over hurt monsters (always over rares), names, speech, loot labels pushed
  apart, lightning, the cache's hitsplats (a crit bigger, with a gold mark), floating text and
  the minimap, revealed 15 tiles about in a rift and whole in the city. Tab lays the overlay map
  over the world, as Diablo's and Path of Exile's: the minimap's seen tiles drawn four pixels a
  tile, open ground faintly and a line along every side that meets blocked ground, in a clump of
  ten tiles or more (a lone tree or rock would make it noise), set on the ground round the hero by
  the camera's own east and north at the hero, a third of their size, so it lines up with the
  world it's over (`drawBigMap`).
- **How a fight feels**, after Diablo's and Path of Exile's, all of it the client's
  (`client/Juice.ts`), so the sim plays the same with it or without:
  - *Animations meet the blow.* The sim lands a blow at a fixed share of the use and an OSRS
    attack animation has its own (a slash connects at 72% of its 780 ms, a bow lets go at 53%, a
    cast at 49%), so the client plays the wind-up at whatever speed reaches the animation's blow
    on the sim's tick, and the follow-through at least that fast and fast enough to end with the
    use, standing once it's done rather than frozen in its last pose (`animTick`). Before, a
    sword's swing was cut off at 80%, a maul stood frozen half a second, and arrows left a bow
    still being drawn. Monsters' attacks are played the same way to their `hitAt`, so a hasted
    one's swing keeps up. Where each blow is (`ANIM_HIT`) was read with `scripts/seq-motion.ts`
    and looked at in the game.
  - *A hit pause*: the poses of whatever's struck, and of the hero if it was their own blow, held
    45 ms (85 for a crit, 70 for the hero on a kill, 120 for a stagger or a rare's or guardian's
    death), with a small shiver. The world goes on; only the poses wait.
  - *A flinch*: what's hit leans back from the blow, up to 17 degrees and less for the bigger
    ranks, and comes upright over 280 ms (the actor renderer's pitch and roll).
  - *Shake*, as trauma squared that fades in under a second, only for what's big: a hit that
    takes over 6% of the hero's life, a guardian's slam or rain landing near, the hero's own
    slams and leaps, a crit on a rare or a guardian, a rare's or guardian's death. The menu's
    **Screen shake** turns it off, as Diablo IV's does.
  - *Corpses* are thrown along the killing blow, 0.25 tiles plus 1.5 times the overkill (a share
    of its life) plus 0.45 for a crit, at most 1.8, as far as there's ground, with a hop for a big
    overkill or a crit; not a guardian.
  - *Facing* turns through in a few frames (60 ms for a monster, 25 for the hero) rather than
    snapping, and a walk or run plays as fast as its walker goes.
  - *Smoothing*: the hero's, the monsters' and the spells' keyframed animations are baked with
    poses between their frames, two ticks apart at most (the engine's `tweenTicks`), where most
    hold a pose for four. It about doubles their memory, so it's off to start with on a touch
    screen; the menu's **Smooth animation** turns it on or off (the hero at once, a rift's
    monsters from the next).
- **Light**: every place is by day. An ambient of 1 is the map as the cache colours it, OSRS's
  own daylight; the city is a clear afternoon at 1, a touch warm, and each rift's zone has a day
  of its own, a little brighter or shaded and tinted (section 3). By day (`DAY`, 0.85 and over) a
  light only warms what it's on, at a quarter of its strength, and the hero's lantern isn't seen:
  no ring round the hero. The portal pulses purple when open and sits dim when sealed, the
  waystone is blue, torches flicker, the fallen stones' runes pulse red and the shards blue, shots
  glow. Were a place darker, they'd come up to full strength by `DUSK` (0.6), the lantern with
  them. A `LightBudget` picks the few that matter each frame (`DrawnLights`).
- **Sound** is the engine's synthesiser from the cache's sounds, by id from the OSRS Wiki's list,
  played where things are. An attack is heard on its blow, the hero's, a monster's and a minion's
  alike (a guardian's special as it starts): the cache's attack sounds open with 350 to 750 ms of
  silence, for the server to play them as a swing starts, and the engine takes it off, so before
  that a bow was heard three quarters of a second after its arrow left. The menu's **Sound** page
  has the master volume (the engine's, under `riftscaper-audio`) and two on top of it, kept in the
  settings: fighting (everything played in the world, and the hero's death) and the interface
  (clicks, coins, picking up, the portal).
- **A drop worth turning round for** lands with a sound of its own, as Diablo II's high runes
  ring, and stands in a pillar of light in its colour, as Path of Exile's loot beams do
  (`dropGlory` in `Client.ts`): a unique (`sotn_muspah_unique_loot_02`, orange), a set piece
  (`jewel_ding`, green, even unread) or a high rune from Law up (`found_gem`, the rune's colour).
  The pillar is drawn on the overlay, rising as the drop lands and throbbing a little, so it's seen
  through trees and in a heap of drops, with a light of its colour on the ground under it.
  `scripts/sound-info.ts` checks a sound from the Wiki's list is in the cache and not silence.
- **Tooltips** are the game's, never the browser's: anything with something to say carries
  `data-tip` (its first line the heading, the rest under it), and one `HoverTip` in `Ui.tsx`
  follows the pointer and draws it in the client's tooltip box. It finds the element under the
  pointer itself, so a disabled button's tip shows too, and it hides on a press.
- **The interface** scales as a whole (0.75 to 1.5, from the menu) and the overlay with it, so the
  two match; fonts stay at 16 pixels and its multiples because the pixel fonts blur at anything
  else.
- **The top left** is kept small, as RuneLite's overlays are: the rift's box is its name and depth,
  a line of its level, kills and time, and a line of its modifiers' names (what they do and pay on
  hover); the tracker under it is a line a task, cut short with the whole on hover, under a heading
  that folds it away.
- **The side tabs** are the client's own stones at their own size: a grey one cut from its row of
  them (sprite 1032, 40 pixels in), and the red of a middle tab that's open (1030). 1026 to 1029
  are the corners' red stones, each rounded on one side, which is why the first try looked wrong.
- **Panels that move**: the collection log and the orrery float over the rest of the interface,
  open in the middle and are dragged by their title (`useMovable` in `Ui.tsx`), kept whole on the
  screen, and open where they were left while the game's open. The log is the client's own log's
  size, the same whichever page shows.

## 11. How it's built

| Where                    | What                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `src/content/`           | Plain data: rules, classes, items, gems, passives, runes, monsters, zones, rift modifiers, riftstones and the Heartstone's shards, what there is to find in a rift (`features.ts`), the city's people and story, the tasks the folk set (`tasks.ts`), looks, visuals, where attacks land in their animations (`anims.ts`, the client's alone); the late game's orrery, pets, achievements and raid (`orrery.ts`, `pets.ts`, `achievements.ts`, `tombs.ts`) |
| `src/sim/`               | The game a tick at a time, deterministic: `Game.ts` (hero, monsters, loot, the portal, the city's people), `hero.ts`, `loot.ts`, `skills.ts`, `gems.ts`, `passives.ts`, `talismans.ts`, `enchant.ts`, `runes.ts`, `riftMods.ts`, `riftstones.ts`, `placement.ts` (packs, and chests, shrines and hoards), `town.ts`, `tasks.ts`; the late game's record (`log.ts`) and orrery (`orrery.ts`) |
| `src/world/`             | The land: `cityGen.ts` (the city by hand) and `zoneGen.ts` (a rift from a seed), both ScapeRune recipes |
| `src/client/`            | `Client.ts` (builds places, steps the sim, camera, input, lights, overlay, shops, the Archmage, the folk's task offers, saves), `Assets.ts` (bakes), `Juice.ts` (how a hit looks: section 10), `TitleStage.ts`, `Store.ts` (what the screens read), `settings.ts` (saves) |
| `src/ui/`                | React screens dressed as the OSRS client: title and what's new, HUD and the task tracker, pack with Gems, Character and Pouch pages, shops, stash, gem trader, Archmage, a task's giver, passive tree (a canvas), help, menu, death |
| `scripts/`               | Cache lookups and checks, run with `bun run tsx riftscaper/scripts/<name>.ts` from the project root, and the cache's download (`download-caches.cjs`, `bun run download-caches`) |
| `docs/`                  | This document and the city's                                                                           |

**The sim and the client.** The sim (`Game`) is given a grid, a hero and a zone (or the city's
plan) and is stepped with a `GameInput` every 20 milliseconds; it never reads the clock, the
screen or `Math.random`, and tells the client what happened through events (`takeEvents`:
hits, casts, drops, deaths, the portal, the teleport, talk). The client turns the mouse and keys
into inputs, interpolates between ticks for drawing, runs the shops and the Archmage, keeps a
rift's `Game` alive while the hero is home, and saves. `Game.test.ts` plays a rift twice from a
seed and compares fingerprints; keep anything that would break that out of `src/sim/`.

**Saves** are `localStorage`: the first hero ever under `riftscaper-save`, each since under
`riftscaper-save-2`, `-3`..., the roster under `riftscaper-heroes`, settings under
`riftscaper-settings` and sound under `riftscaper-audio`. Never rename a key players have data under
without moving it: the keys from when the game was called Runefall (`runefall-save` and the rest)
are moved by `moveOldKeys` as it opens, before anything reads a save.
A hero goes to a file and back from the title (`exportHero`, `importHero` in `settings.ts`): the
file is the save as it's kept, so it's read in through the same mending as a load and the same
promises hold for it, and a hero brought in is one more on the list, never one replaced.
Loading mends old saves: a look a body can't have, a hero from before gems (sockets and gems are
given), before runes (empty pouch and stash), before modifiers (no rift open), before tasks (none
under way); unknown items are dropped, a task naming a kind, giver, monster or guardian that's gone
is dropped, and uids are raised past the save's, its tasks' and their rewards' among them. Four
orderings are save-compatible promises: `CLASS_IDS`, passive node ids, the item and gem ids saves
name (`riftstone` and the four `heartshard_` bases among them), and the ids a task names
(`TASK_KIND_IDS`, the keys of `FOLK`, `MONSTERS` and `BOSSES`). The late game's are optional and
mended as they load, and their ids are promises too: the collection log's (item and good ids, and
`pet:` and a guardian's id), the achievements', the orrery's nodes and the invocations'.

**Assets** are baked from the cache as they're wanted (`Assets.ts`): spells, arrows, impacts, the
city's people, thralls, the portal, the hitsplats and the chests, altars and hoards (`Assets.locs`)
once as the game loads; each rift's monsters and both its zone's guardians as it's entered,
dropping the last rift's; the hero in what they wear, again on every
change; items on the ground the first time one of a kind drops; the six classes and the hero being
made on the title, dropped once the game begins. The cache is `osrs-241_2026-09-30`
(`src/cache.ts`) and every id in `content/` was looked up in it; a hosted build loads a slim copy.

## 12. Working on it

### The rules

- Content is data in `src/content/`, rules in `src/sim/`. A new monster, gem, base or modifier is a
  row in a table, and the sim should need no change for it.
- Nothing in `src/sim/` uses `Math.random`, `Math.sin` or the clock; new randomness that mustn't
  disturb the rest gets a stream of its own (as the hero's crafting seed is).
- Everything shown is a real asset. Look ids up with the scripts, never from memory, and look at
  the thing in the game before building with it: a seq id existing doesn't mean the model plays it,
  and a loc that looks right on a sheet can float, stand on a wall or face one way.
- Keep the OSRS dress: sprites from `rs.tsx`, the two fonts at 16, 32 or 48 pixels, stone and
  parchment from `ui.css`.
- Saves: never rename a key, never reorder `CLASS_IDS` or the passive tree's build, mend old saves
  as they load rather than refusing them.
- The README's "Playing" and "How it's put together" describe the game to players and agents:
  change them with the game, and this document when a design changes.
- `CHANGELOG.md` says what's new to players, and the title shows it beside the version
  (`package.json`'s). Each change a player would notice gets one short bullet under Unreleased.
  A release bumps the version and turns Unreleased into its heading, dated; a test checks they
  agree.

### The checks

```bash
bun run tsc --noEmit -p riftscaper                  # types (the engine with -p engine)
bun run vitest run riftscaper                       # the sim's tests, about 10 seconds
bun run tsx riftscaper/scripts/city-map.ts          # the city's collision; fails if anyone's unreachable
HEIGHTS=1 bun run tsx riftscaper/scripts/city-map.ts  # the city's heights
bun run tsx riftscaper/scripts/city-png.ts out.png   # the city from above, who stands where marked
bun run riftscaper                                  # the game on port 5188; ?bgtick keeps it ticking unseen
bun run tsx riftscaper/scripts/balance.ts --curve   # the balance on paper, a few seconds (section 13)
bun run tsx riftscaper/scripts/balance.ts warrior --depth 8   # the bot playing, minutes a class
```

In the browser, `window.game` is the client in development. The hero can be moved for a look with
`game.game.hero.x = ...` (world tiles: the city's arena starts at 5568, 5952) and the camera pulled
back with `game.targetDistance = 23`. A page in a hidden pane loads slowly; `?bgtick` helps. The
cache's 404s for `idx16` and `idx23` in the console are normal.

### Adding things

| To add          | Where, and what to mind                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A monster       | `MONSTERS` in `content/monsters.ts` with its npc id, seqs and sounds (`scripts/find-npcs.ts`, `npc-info.ts`, `seq-info.ts`); then a zone's list |
| A guardian      | `BOSSES` with a special of the three kinds (and `more` for several in turn), or a new kind in `Game.startSpecial`; a zone's `boss` or `second`; its arena is the rift's far end, so it needs no map |
| A shrine        | `SHRINES` in `content/features.ts`: its buff, the loc (`scripts/loc-info.ts`, looked at in the game: an altar can read as a boulder, and from every side, since it's drawn facing the camera at `SHRINE_YAW`) and the tiles a side it stands on |
| A zone          | `ZONES` in `content/zones.ts`: biome, monsters with weights, guardian, light, generator settings; it goes on the end, as depth maps to index |
| A skill gem     | `SKILLS` in `content/gems.ts` with a kind the sim has, its spot animations in `visuals.ts`, its `icon` a sprite (`scripts/sprite-info.ts`, RuneLite's `SpriteID` for names) or an obj; `gems.test.ts` casts every gem at a dummy |
| A support       | `SUPPORTS`: what it supports (`tags`) and its numbers at level 1 and 20                                                            |
| A forged archetype or look | `ARCHETYPES` in `content/forge.ts`, made of spot animations and animations already baked; `forge.test.ts` uses every class's |
| A trait         | `TRAITS` in `content/forge.ts` with the kinds it suits, its range and cost, and its hook in `Game` (`traitsOnHit`, `traitsOnKill`, `landed`, `fire`); a test of it in `forge.test.ts` |
| A base or unique| `BASES` / `UNIQUES` in `content/items.ts` with the cache's obj id (`scripts/find-objs.ts`); the hero wears it by its equip slot; a unique wants a trait, keystone or power, and `pinnacle` if only the Heart drops it |
| An affix        | `AFFIXES` with six tiers and slot weights; mind its `StatKey` is read in `heroStats` or `resolveSkill`                           |
| A rune          | `RUNES` and a case in `sim/runes.ts`; `runes.test.ts` uses every rune                                                             |
| A rift modifier | `RIFT_MODS` with an effect field the sim reads (`riftEffect`) and its rewards; `riftMods.test.ts` checks each                     |
| A passive       | On the end of `build()` in `content/passives.ts`, never in the middle                                                             |
| A keystone      | `KeystoneId` and `KEYSTONES` in `content/passives.ts`, a way's `keystone` on the end of `WINGS`, its rule where the sim reads `stats.keystones`, and a named build in `balance.ts` `BUILDS` |
| A condition     | `When`, `WHEN_TEXT` and `HERO_WHEN` or `VERSUS_WHEN` in `content/items.ts`; `Game.heroState` or `Game.enemyIs` says when it holds |
| A talisman      | A base in `TALISMAN_BASES` with the affixes it leans to, or a unique of the `talisman` slot whose `talisman` power `sim/passives.ts` reads |
| A person        | `FOLK` in `content/town.ts` with lines, and a spot in `FOLK_AT` in `world/cityGen.ts`; `city-map.ts` checks they can be reached. One of the folk sets tasks too: their `GIVERS` entry in `content/tasks.ts` (the types ask for it) |
| A task kind     | `TASK_KIND_IDS` (on the end: saves name them) and `TASK_KIND` in `content/tasks.ts`; its count in `sim/tasks.ts`, called from where `Game` sees it happen, and its line in `taskObjective`; then some giver's `kinds`. `tasks.test.ts` rolls every kind |
| A monster to slay | `TASK_PREY` in `content/tasks.ts`, with what it's called by the score; a giver's `prey` if it's theirs |
| A building      | A prefab (a rectangle of the real world, found with `scripts/locs-in.ts`, doors from `prefab-exits.ts`) in `BUILDINGS`, with its doors in `DOORS` facing a street, the square or a lane; each door's way runs out to it, laid as what it meets, and the city fails to build if it meets nothing |
| An upgrade      | A unique in `lateUniques` in `content/items.ts` (`source: "upgrade"`), and its row in `UPGRADES` or `MAKES` in `content/circle.ts`; a new part in `GOODS` on the end and `PART_DROPS`. `late.test.ts` checks every recipe names what exists |
| An achievement  | `BOSS_TIER` for a guardian's three, or a row of `ACHIEVEMENTS` with a goal the sim counts (`Game.achieveWhere`); its id is saved, so it's never changed |
| An orrery node  | A step on the end of its arm in `content/orrery.ts` (an id is its arm's place times a hundred and its step), with an effect read where the ladder rolls it |
| A pet           | `PETS` in `content/pets.ts`: its guardian's id, the NPC that follows and its idle and walk, and the item the log shows |
| An invocation   | `INVOCATIONS` in `content/tombs.ts` with a raid level and an effect the sim reads; `late.test.ts` checks they add up |

### What was learnt (so far)

- The cache's lamps and lanterns are wall pieces: they float in the open. The one ground light
  that burns is the standing torch 724. Its hedges are single rounded pieces and don't join up.
  Varrock's streets have none of either.
- A prefab's rectangle has a row of street on its door's side; the paving must take it in, and a
  shopkeeper stands 1.6 tiles inside the door.
- A wall on a tile's far edge belongs to that tile, so a building's wall can stand outside the
  rectangle round its floor: read its edges with `locs-in.ts` and take the column in, or the wall
  comes out broken (the Blue Moon's west wall stands on 3215).
- The kit leaves doors out, since a shut one blocks; one standing open in the real world (11774,
  11778, whose action is Close) lies back against its wall and is kept (`OPEN_DOORS`).
- A shop is found by its minimap icon, which is a loc's (`mapFunctionId`) standing in it: Aubury's
  is the fire rune, icon 2, at 3253, 3403. A rectangle round a building that isn't square takes a
  corner of its neighbour, whose locs stay behind (`neighbour` in `CITY_PREFABS`).
- A gap `prefab-exits.ts` finds in a building's walls isn't always a door: the Blue Moon's bay
  is a recess. Look at it before opening a street on it.
- A loc's front unturned is its own: the gem stall's counter faces north, the archery target
  south. Look at a turned one from the side, where the camera doesn't show it.
- A tile holds one overlay, so where two meet on a slant the other half shows the underlay: give
  it one that looks like the floor it stands for (the crater's rock on a grey earth).
- Floor 196, white marble, reads as water from above.
- A gate's `at` counts along its side as the wall runs, so the west gate and the east one open on
  the same rows from different numbers; `city-map.ts` shows where they open.
- Paint paving and anything inside it as one `paintOverlay` field, or the seam shows grass.
- Buildings on shaped ground take `keepHeights`; the ground under each must be flat first.
- The portal is drawn by the client as an actor, so its model (`PORTAL_LOC`) can be dim when
  sealed and bright when open; a map loc could not.
- An OSRS attack animation's blow isn't where its length says: `scripts/seq-motion.ts` finds a
  blow at the end of its fastest stretch, but a bow's and a cast's fastest stretch is the arm
  coming back after the shot, so read those from its frames (the long hold is the shot). NPCs
  don't name a block animation in the cache (the server picks it), which is why a flinch is a
  lean and not a seq.
- The minimap's icons (the quest start, shops, banks) aren't an archive of sprites of their own in
  this cache: they're the map elements' sprites, 1448 on, listed by `scripts/map-icons.ts` with
  names left empty, so they're picked by looking at them (`scripts/sprite-png.ts` draws them into a
  PNG as the game does; `scripts/sprite-info.ts` takes a name or
  an id, and the browser can draw any frame).
- A few sprites (the side panel's red tab stones 1027 to 1030 among them) carry an alpha channel
  that's nought on every pixel, which the client ignores and draws solid. The engine's sprite
  loader drew them invisible till it was taught to ignore it too (`SpriteDataLoader.ts`).
- The repository has no formatter's config and no git: a formatter run over a file rewrites the
  whole of it, with nothing to undo it. Indent by hand to match.
- The Tombs' bosses animate on skeletons, and their seqs can't be told apart by length or motion:
  `scripts/find-npc-seqs.ts` lists the seqs on an NPC's skeleton, `classify-npc-seqs.ts` guesses
  which are attacks, blocks and deaths, and `seq-sheet.ts` poses an NPC through a seq's frames in a
  PNG, which is how each was picked.
- The engine's guides have the rest: a loc's `contour`, kit pieces, the camera's limits on height.

## 13. Balance

The balance is measured, not guessed: `scripts/balance.ts` plays the real sim headless, as the
sim is deterministic, and prints what tuning needs. It was first tuned on 2026-11-10 against the
curves Diablo and Path of Exile keep.

### What it's tuned to

- **Fights get longer, not deadlier.** Monster life follows a typical hero's damage, so an
  on-level normal monster lasts about a second (1 to 1.5), a rare about five, and a guardian 30 to
  90 seconds at every depth, as an act boss does. Monster damage follows a typical hero's life: a
  hit is 4% of an on-level hero's life at level 1 and 7% at 60, before armour and evasion. Deaths
  come from crowds and a guardian's specials, not from one plain blow.
- **The level is the area's.** A hero who clears each depth once stays about the area's level and
  comes to 60 at about depth 16, the end of the second lap, as Path of Exile's campaign brings a
  character to its maps; past that the rifts are a ladder (section 8).
- **Gear goes on getting better** almost to the cap: affix tiers open to 50, ten levels past the
  last bases, and the best bases stay the likeliest drops.
- **Gold is spent.** The gamble and the gem trader's work grow with the square of the level, so a
  rift's gold buys about a gamble or two at any depth, rather than piling up.
- **Classes are equal and not alike.** A class trades damage for life, as Path of Exile's do, but
  no class's guardian fights take more than about one and a half times another's, and every class
  clears the same depths.

### The tools

```bash
bun run tsx riftscaper/scripts/balance.ts --curve [--seeds 4]       # a typical hero by level, on paper
bun run tsx riftscaper/scripts/forge-sample.ts                       # forged gems' damage kept and traits, by the thousand
bun run tsx riftscaper/scripts/balance.ts --skills --level 25       # every skill: estimate and on a dummy
bun run tsx riftscaper/scripts/balance.ts --guardians [--seeds 6]   # each guardian against an on-level hero
bun run tsx riftscaper/scripts/balance.ts --inspect ranger --level 53  # one typical hero's gear and skills
bun run tsx riftscaper/scripts/balance.ts [classes] --depth 16 --seeds 2  # the bot plays whole runs
bun run tsx riftscaper/scripts/balance.ts --depth 16 --seeds 2 --rifts open  # the same on open land
bun run tsx riftscaper/scripts/balance.ts [classes] --from 17 --depth 40  # the ladder, from a level-60 hero
bun run tsx riftscaper/scripts/balance.ts --sheet --depth 32         # the monsters by depth, on paper
DEBUG=1 bun run tsx riftscaper/scripts/balance.ts ranger --guardians  # what each fight was spent on
```

- **A typical hero** (`--curve`, `--skills`, `--inspect`, `--guardians`) is made at a level with
  gems at the most they can be, and wears the best of as many drops as a player has seen by then
  (items a few levels below theirs, at rarity 0.4), with points spent. It is a little weaker than
  a hero who has farmed.
- **The paper estimate** of a skill's damage (`skillDps`) is checked against the sim by `--skills`'
  dummy column, a guardian-sized target held at for 20 seconds; they agree within a few per cent,
  but for the wide fans (Blessed Hammer, Fan of Knives), which land more at the feet than further
  off.
- **The bot** plays whole runs on the game's own plans for its rifts (`world/zoneGen.ts`'s
  `riftPlan`, which needs no cache: its walls solid, what falls away water, and clumps of rock on
  its open ground), or with `--rifts open` on made-up open land of a rift's size, as rifts were
  first made; from level 1, or with `--from`
  from a typical hero who has cleared the depths before it (past 16, a level-60 hero with 16
  cleared, the ladder's foot), for `--hours` of play (6). In a rift it fights
  whatever is nearest by walk, steps to the gap in a guardian's rain (the one of sixteen ways with
  the fewest rings by the time they land) and out of its slam, kites when its attack flies (lets
  the shot fly, steps back from what fights hand to hand for half a second, shoots for a second) and walks
  into range and sight before it shoots (the sim does that too now, for a skill used on a monster), drinks at
  half life and uses every skill as it's ready. In the city it wears what scores better
  (`damage^0.55 * effective life^0.45 * speed^0.3`), sockets, spends points on the best path, puts
  its best one-target attack on the left button, sells, buys what's better and gambles what's
  left. It says its class's prayers (a protection from blows and its weapon's damage) and hires
  its class's hireling once it has gold to spare, gives it what in the pack scores better for it
  and raises it when it falls; `--alone` plays without either, and `--curve`'s table has the
  typical hero's hireling's damage and life beside the hero's. It gives up a rift at 12 minutes and goes back a depth after three failures. It clears
  every pack where a player would skip some, so its rifts are slower than a player's (4 to 11
  minutes), and it dies more than a careful player would.

### What the first tuning found and changed

| Found                                                                                     | Changed                                                                                                    |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Every class stalled at depth 11 to 12, guardians at 76,000 to 139,000 life, rifts timing out | Monster life fitted to the hero's damage, easing from 17% a level to 4% (section 8); damage to the hero's life |
| Hero damage stopped growing at 41: bases and affixes ended at 40, and high drops were mostly old bases | Affix tiers to 50; a base's chance measured from its slot's best                                           |
| Heroes sat on 200,000 gold by depth 12                                                     | Gamble `50 + 3L²`, socket work times `1 + L/20`                                                            |
| Heroes fell behind the area's level on the second lap                                      | Kill experience `(1 + 0.3x)(1 + 0.015x)`                                                                   |
| Mana ran dry on the dearer skills of deep rifts                                            | 1.5% of the most mana back a second                                                                        |
| Cooldown skills (Ground Slam, Judgement, Rain of Arrows, Explosive Arrow) worth less than a plain attack | More damage and shorter cooldowns (section 5's numbers in `content/gems.ts`)                         |
| The rogue and paladin weakest, the ranger strongest                                        | Rogue life 54 +12 (57 +13 since); paladin's level 2 and 10 gems Brutality and Runic Focus; Split Arrow one hit an enemy (section 8) |
| Split Arrow without its shotgun left the ranger's start the weakest                         | Shoot 1.2, Split Arrow 0.9                                                                                 |
| Kree'arra and Jad killed more heroes than the other guardians together                     | Their rains 6 circles, Kree'arra's blows 6 to 12; guardians' life eased (350 to 470 at the top)            |
| A guardian on the second lap no harder than its rift                                       | 35% more life and 20% more damage a lap                                                                    |
| Past depth 16 monsters grew 17% a depth in life and kept growing in damage, against a hero who had stopped: a wall four depths up (a player's feedback, 2026-11-14) | The ladder past level 64: life 1.5% a level (6% a depth), damage and armour stopped; two passive points a depth past 16 (sections 6, 8) |
| On the ladder the bot's ranger stalled at depth 20: it had linked Volley to Barrage, scoring six arrows on one target where the sim fanned them over 50 degrees, so one in six landed | The bot judges a fan by the sim's spread (`spreadOf`), and a tight volley fits added arrows inside its arc (section 8), so Barrage with Volley lands all six; the ranger cleared 38 with it, and on depths 1 to 16 took 37 rifts and died once, against 40 and three times |
| A rich rift's extra items were mostly plain                                                | Extra items keep the drop's floor (section 8)                                                              |
| Skills made 2.5 times dearer (section 5): the warrior's guardians took 74 s against 45, the rogue took 42 rifts to clear depth 8 (9 deaths, 12 collapses), the paladin 26; the mage and necromancer 17 | The weapon classes' mana on hit (section 4): warrior 3%, rogue 3.5%, paladin 3%, ranger 1.5% of the pool an enemy, three a tick; rogue life 57 +13. Then 17 to 22 rifts for every class, guardians 43 to 56 s |

### Where it stands

The bot's last whole runs (two seeds a class, from level 1 to depth 16, 2026-11-10, after the
changes to how a fight feels in §10: the shove, the stagger, ranged monsters backing off and the
crowd going round; the ranger and rogue again on 2026-11-14, the ranger after the bot learnt the
spread of a fan, below):

| Class       | Rifts (two runs) | Hours a run | Deaths | Guardian, a win | Level at depth 4 / 8 / 12 / 16 | Gold at the end |
| ----------- | ---------------- | ----------- | ------ | --------------- | ------------------------------ | --------------- |
| Warrior     | 34               | 1.9         | 0      | 44 s            | 14 / 29 / 42 / 57              | 33,000–46,000   |
| Ranger      | 37               | 2.3         | 1      | 42 s            | 14 / 32 / 42 / 58              | 35,000–38,000   |
| Mage        | 34               | 2.3         | 0      | 45 s            | 15 / 31 / 41 / 54              | 40,000          |
| Paladin     | 36               | 2.1         | 0      | 48 s            | 14 / 33 / 41 / 57              | 33,000–43,000   |
| Rogue       | 41               | 2.6         | 4      | 53 s            | 15 / 31 / 43 / 59              | 38,000–42,000   |
| Necromancer | 34               | 2.2         | 0      | 46 s            | 13 / 30 / 43 / 56              | 39,000–52,000   |

Every run cleared depth 16 and came to 60 there. Before the tuning, every class stalled at depth
11 to 12; on the way, deaths in these runs went from 33 to 4 (on 2026-11-10). A rift took the
bot 3 to 12 minutes, and each run made 24 to 32 gambles. The ranger's one death now is to K'ril
at depth 8 (it was three, to Count Draynor and twice to K'ril at 16). The rogue's run of
2026-11-14 is slower than its row of the 10th was (41 rifts against 34, four deaths against one:
Count Draynor at 3, and at 12 Karil, a rare Ahrim and Ahrim himself), from changes between the
two, not the ladder, which leaves depths 1 to 16 as they were; the other four classes weren't run
again. Against
the runs before the fight changes, the hours and deaths are much the same, and a guardian takes a
few seconds longer, 44 to 50 seconds a win against 36 to 49. A step now calls off a shot that
hasn't been loosed, so the bot's kiting waits for the arrow to fly before it steps. Before it
learnt that, the necromancer took 4.3 hours a run and timed out at depth 16 five times.

The guardian trial (`--guardians --seeds 6`, an on-level typical hero, so harder than a farmed
one; 2026-11-10, before the bot learnt a fan's spread, which changes the ranger's) won 82 (ranger) to 92 (necromancer) of each class's 96 fights, in 52 to 65 seconds a win. The
hardest guardians are the ranged ones for the ranged classes (Kree'arra and Jad: the ranger and
mage win half to five of six), and the end of a lap's pair (Graardor, K'ril) for the rest.

On paper (`--curve`), an on-level normal monster lasts 0.8 to 1.6 seconds at every level for
every class, and a guardian 28 to 90, longest for the paladin and warrior, which have the most
life.

The ladder's first runs (`--from 17 --depth 40`, one seed a class, six hours each, 2026-11-14,
after the ladder in section 8), each from a typical level-60 hero with depth 16 cleared:

| Class       | Deepest cleared | Rifts | Hours | Deaths | Timeouts | Damage, at 17 and at the end | Where it stopped                                     |
| ----------- | --------------- | ----- | ----- | ------ | -------- | ---------------------------- | ---------------------------------------------------- |
| Warrior     | 40              | 24    | 3.2   | 0      | 0        | 1,401 to 7,295 (5.2×)        | Not stopped; K'ril took 134 s at 40                   |
| Ranger      | 38              | 31    | 6.0   | 0      | 8        | 2,103 to 13,405 (6.4×)       | Rifts of 19 to 20 minutes at 39, timing out; guardians 22 to 109 s to 38 |
| Mage        | 39              | 43    | 6.0   | 16     | 0        | 1,955 to 13,308 (6.8×)       | Guardians took 5 to 6 minutes; Kree'arra and Jad killed it |
| Paladin     | 39              | 32    | 6.3   | 1      | 7        | 1,078 to 10,206 (9.5×)       | Rifts of 18 to 19 minutes, timing out                 |
| Rogue       | 40              | 30    | 4.8   | 5      | 0        | 1,133 to 8,648 (7.6×)        | Not stopped; guardians 80 to 205 s at 37 to 40        |
| Necromancer | 40              | 24    | 2.7   | 0      | 0        | 3,605 to 31,345 (8.7×)       | Not stopped; guardians 64 to 119 s at 37 to 40        |

The bot's damage grew five to ten times over the ladder, from the drops, gambles and shops of
twenty to forty rifts and its ladder points, more than the typical hero does on paper, and stopped
growing about depth 33 to 38; its wall is about there, 39 to 45, as the ladder was meant to put
it for a hero who farms. Before, every class would have met it about depth 20.

The ranger's row is from its third run that day. In the first it stalled at depth 20, in the
Barrow Fields, timing out 19 times and never reaching Ahrim: the bot had linked Volley to Barrage,
judging the six arrows by Barrage's own 8 degrees, all on one target, where the sim then fanned
them over 50 (section 8). Against the Barrows' dark wizards and Karil, who stand off and shoot,
three arrows in four flew past (one in four hit, against two in five at depth 19, where
everything comes to the hero), and the ranger couldn't pay for its main skill two thirds of the
time: 741 damage a second dealt against 3,148 at 19. With the bot judging a fan by the sim's own
spread (`spreadOf`), the second run led with Quick Shot instead and cleared 40 in 4.9 hours, its
guardians taking 200 to 350 seconds at 37 to 40. The third is with Barrage kept tight under
Volley: its left button is Barrage, Volley and Swiftness, its guardians fall in 22 to 109 seconds
all the way to 38, and it stops at 39, where a rift of some 360 monsters is more than one target
at a time clears in twenty minutes. Barrage needs a bow, so only the rogue could have had the same
trouble; it never linked Volley to Barrage, and its runs came out the same all three times. The
ranger's and rogue's depths 1 to 16 were the same with Barrage tight as without.

### The tree's builds

The thirteen builds of `docs/tree-expansion.md` (`balance.ts --build`), one seed each from level 1
to depth 16, beside the class's plain path on the same seed (2026-11-14). Each walks to its three
or four nodes before it spends the rest by the bot's score. Every run cleared 16.

| Build             | Class       | Rifts | Deaths | Minutes | The plain class's | Against it |
| ----------------- | ----------- | ----- | ------ | ------- | ----------------- | ---------- |
| Shatterstorm      | Necromancer | 18    | 0      | 111     | 18, 0, 133        | 17% faster |
| The Offering      | Necromancer | 19    | 0      | 149     | 18, 0, 133        | 12% slower |
| Tempest           | Mage        | 18    | 0      | 109     | 17, 0, 116        | 6% faster  |
| Pyre              | Mage        | 18    | 0      | 126     | 17, 0, 116        | 9% slower  |
| Thornwall         | Paladin     | 16    | 0      | 113     | 18, 0, 132        | 14% faster |
| Spellblade        | Paladin     | 20    | 0      | 147     | 18, 0, 132        | 11% slower |
| Piety             | Warrior     | 19    | 2      | 132     | 18, 0, 131        | the same   |
| Dharok's Disciple | Warrior     | 20    | 1      | 149     | 18, 0, 131        | 14% slower |
| Dragon Claws      | Rogue       | 21    | 2      | 146     | 26, 6, 185        | 21% faster |
| Windrunner        | Rogue       | 25    | 1      | 217     | 26, 6, 185        | 17% slower |
| Artillery         | Ranger      | 18    | 0      | 119     | 17, 0, 130        | 8% faster  |
| Rigour            | Ranger      | 18    | 1      | 114     | 17, 0, 130        | 12% faster |
| Hollow Fletcher   | Ranger      | 22    | 2      | 179     | 17, 0, 130        | 38% slower |

Six builds are faster than their class's own path, though the bot's damage on paper says
otherwise: Thornwall's is half the paladin's (2,553 a second against 4,921 at the end), because
a strike back, a shatter, a shock's chain and a burst aren't hits of a skill and the score can't
see them. The slow ones are slow for what the bot doesn't do, as far as one seed can say: it
drinks at half life, so Dharok's Curse seldom has much life missing to count, and its melee rogue
moves in only a tenth of its attacks, so Windrunner pays Graceful's 20% less for little.

Three were tuned after the first runs (the table is after). Windrunner was 37% slower: Agility
Shortcut's 30% and Light Feet's 15% hung on a blink or a leap, which the bot never used, so a build
of never stopping had none of it. A step counts now (the bot has moved recently about half the
time), and it's 17% slower, with one death to the rogue's six; the rest is depth 5, where it runs
out of mana, and a bot that stands still. The Offering was 23% slower, its timeouts deep the rifts
it ran dry in (out of mana 194 and 272 times, the plain necromancer never). A normal kill gives
back 4% of mana, not 2%, and it no longer runs dry: 12% slower, its timeouts at depths 4 to 7 slow
kills on the walk to the wing. Hollow Fletcher didn't work at first: it ran out of the bot's six
hours at depth 15, having cleared 14. Lingering Magic's Gravebound was 12% and the risen stood 8
seconds: a fifth to a third of a skeleton was up on average, doing 3% to 8% of the damage, and from
level 31 Arceuus Covenant halved the ranger's own hits. Now Lingering Magic is 20%, and under the
Covenant Gravebound raises twice as often and the risen stand four times as long (32 seconds): one
to three are up, doing about half the damage. It's faster than the plain ranger at depths 8 to 11
(its guardians fall in 7 to 23 seconds) and slower at 12 to 15, where a guardian alone, with few
kills to raise, takes 86 to 275. The rest of its time goes on the walk there, from the Ranger's
side to the Arceuus wing, which gives little damage on the way: three timeouts at depths 5 to 7,
before the Covenant.

What the bot can't say: how the passive tree's 800 nodes compare (it takes the best path by its
own score, and a trait or a keystone's rule only on a named build, `--build`), whether the rift modifiers' rewards are worth their danger, and how a careful player
does, who skips packs and dodges better. Those want people.

## 14. Rough edges

Found while reading the sim for this document; none is decided either way yet.

- A monster going home heals 1% of its life a tick, which is half its life a second.
- A guardian's slam and rain can't be evaded and don't feed vampiric or Vampiric healing; its
  projectiles can be evaded. Monster projectiles pass no attacker either.
- `arrive()` puts a woken guardian back to sleep but leaves its life where it was.
- Potion doses are fractional (0.25 and 0.35 a kill); a drink needs a whole dose and a second
  drink replaces the first rather than stacking.
- The city's people, the gambles and the gem trader's work all draw from the one game `Rng`.
- The chapel's south-east corner tile has no wall flag on its south edge, so the church can be
  walked into there (its interior is open anyway).
- A rare that's both regenerating and vampiric, and colossal, heals about as fast as an on-level
  ranged hero can hurt it; the bot gives up on one after 25 seconds without getting it lower.
- The balance was tuned with the bot (section 13), not with people: the tree's 800 nodes, its wings'
  keystones and talismans, and the rift modifiers' rewards have had the least of it, and a careful player will find it easier than
  the bot does.
- What there is to find in a rift, the riftstones' and shards' drop rates, the second lap's
  guardians and the Heart's are first guesses, not tuned: the bot opens no chest, touches no shrine
  and never uses a riftstone, and has never fought in the Heart.
- A guardian, as any monster, wakes only with the hero in its line of sight; a tree between them at
  12 tiles leaves it asleep until the hero steps round.
- The folk's tasks are first guesses too: what each kind asks and pays, and how often each of the
  folk sets it. The bot takes none. A guardian task names its depth's own guardian, so the Heart's
  never counts for one, though clearing the Heart counts as a rift cleared. The task icon is the
  minimap's at its own 15 pixels, small with the camera pulled back. "Town crier" is the crier's
  name, so a done task's tip in the tracker, "Done: see Town crier", reads oddly.
- The Diablo expansion's numbers are first guesses, checked by its tests and a few ladder runs of
  the bot, not tuned: the potions' grades and affixes, the hosts' and encounters' rewards, the
  pinnacles, the sets and runewords, the prayers' reserves, the hireling's strength, the quests'
  rewards, the web's bounties and the Coop's drops. The bot drinks only life and mana, opens no
  encounter, pinnacle or web place, and inscribes no runeword. Resistances want the most balancing
  of anything here, and had the least: one seed a class to depth 34, with no run before them to
  set against.
- The drop sounds were chosen by their names in the Wiki's list and checked to be in the cache and
  loud enough (`sound-info.ts`), not heard. The unique's peaks at full, so it plays at 0.3.
- The pillar is drawn over the world, not in it, so it shows through trees and walls, as Path of
  Exile's do; it isn't a spot animation, since none in the cache could be found to be a beam
  without names to search by.
- A set piece's sound and green pillar give it away before Reldo reads it, as Diablo II's green
  names do.
- The late game's numbers are first guesses, checked by `late.test.ts` and a look in the game, not
  tuned: the rift-touched lift, the upgrades and rings, the orbs' and pets' rates, the awakened
  fights, the orrery's levers, the hilts' points, the sinks' prices, and every room of the Tombs.
  The bot fights no pinnacle, awakened or raid, takes no orrery node and makes no upgrade, so where
  the wall goes with them is unmeasured.
- The Wardens' extra special can be a summon, which calls the rift's own monsters, the Tombs'
  Soldier Scarabs, up to nine at once; the room isn't beaten till they're dead too.
- Osmumten is small and grey on the sand, and easy to miss before the rooms rise.
- The Coop's chickens are evened out to their depth's monsters before its flock makes them weaker,
  so at a deep rift each is still a real monster; a hero who opens it far past their level dies
  as fast as in any rift there.
- The bank's booths are 12 tiles from where the hero comes home, through the bank's door: on the
  same screen, but further than the genre's best hubs keep their stash (`docs/city.md`).

## 15. Not built, and worth considering

Ideas that fit the pillars and haven't been decided. None is planned; this is where a next step
might come from. The larger proposal for potions, a ladder rolled from parts and more of Diablo II
(`docs/diablo-expansion.md`) is built, but for its seventh class, Guthix's druid, which is still
the most work of anything in it.

- A **slim cache** for hosting (the engine's guide says how; it's the game's to make, since only
  the game knows what it loads).
- **Touch and controller** are half there: the engine's stick and pad bindings are wired, but the
  screens haven't been played on a phone.
- **The city at night**, or weather: the lights are all in place for it, and come up as the ambient
  falls below `DAY`.
- **A city that changes with the climb**, as New Tristram opens up and Grim Dawn's Devil's
  Crossing is rebuilt (`docs/city.md`): more strangers in the camp as the ladder's encounters are
  found, the ruined house in the tower's garden mended, the churchyard growing with Hardcore's dead.
- **A second lap's own monsters**: the odd laps have their own guardians now, but the same packs.
- **A Heart that climbs**: it opens at the deepest rift reached, and awakened it's harder; a Heart
  that grows harder each time it's cleared would give its uniques a ladder of their own.
- **Awakened support gems**, Path of Exile's, as the awakened pinnacles' own (`docs/late-game.md`
  B): they want a look for the gem found first.
- **Co-op**: the sim is deterministic for it, as the engine's other games are; the client isn't.
- **More for the tree** (`docs/tree-expansion.md`, section 7): poison as a fourth ailment for the
  rogue's daggers, masteries that ask for one of three choices, a keystone that pays for using a
  different skill each time, a flask keystone (Overload: a flask is damage, not healing), and a
  class's own small ascendancy from the second lap's guardians. Each wing's keystone wants its
  build run with `balance.ts --build` at depth before its numbers are trusted.
- **Standing with the folk**: tasks done for one of them could add up to something of theirs (a
  discount at a shop, the chapel's blessing before a rift, a chain of tasks with a story), as OSRS's
  favour does.
