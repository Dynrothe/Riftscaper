# Riftscaper: potions, a ladder made of parts, and Diablo II

A proposal, written on 2026-11-16, for three asks: a way to upgrade potions, a ladder past level
60 that doesn't go stale, built as much as it can be from random rolls, and a game more like
Diablo II. It says what's there now, what Diablo and Path of Exile do, what would fit this game
and its rules, and an order to build it in. All of it but the druid was built the same day, in
that order; section 8 says how the questions were answered and where the build went its own way,
and `docs/design.md` has it as it is. Every number is a first guess,
to be measured with the balance bot (`docs/design.md`, section 13) before it's trusted. Every
cache id named was looked up on 2026-11-16 with `scripts/find-objs.ts` and `scripts/find-npcs.ts`;
each still has to be looked at in the game before it's built with.

## 1. Where it stands

**Potions.** Two flasks, 1 for life and 2 for mana, four charges each, refilled by kills and in
full in the city. A drink gives back 45% of life or 60% of mana over 1.5 seconds. One stat touches
them (`flaskPct`, from the tree), and one condition (`flasked`). Nothing drops, nothing's chosen,
and there's nothing to upgrade.

**Past 60.** A hero who clears each depth once is 60 at depth 16, with gems at 20 and gear at its
last tiers. From there the ladder (`docs/design.md`, section 8) is the same eight zones in the same
order, the same 25 monsters and three brothers, the same sixteen guardians on alternate laps, the
same twelve rift modifiers, two to four chests, a shrine or two and a hoard. Bases stop at 40,
affixes at 50, gems at 20 and the level at 60, so what's left to grow on is rolls, runes and two
passive points a depth. A depth-30 rift is a depth-14 rift with bigger numbers. The bot's heroes
stop getting stronger about depth 33 to 38. There's nothing new to see past 16, and little new to
chase.

**Diablo II, already in it.** The six classes are close to Diablo II's (the necromancer, the
paladin with Blessed Hammer, the mage for the sorceress, the ranger for the amazon, the warrior for
the barbarian, the rogue for the assassin). Click to move, held attacks, gambling, Hardcore,
rarity colours, Torment laps for its difficulties, and a city with a portal. **Missing** are the
things Diablo II is known for: set items, runewords, "+1 to all skills", chance to cast, normal,
exceptional and elite bases, the cube's recipes, a mercenary, the paladin's auras, resistances
and the penalties the harder difficulties put on them, superuniques, quests with rewards that last,
and the secret level.

## 2. Potions

### What the others do

| Game | How potions work | How they get better |
| --- | --- | --- |
| Diablo II | Potions drop all the time and fill a belt of four columns, one to four rows deep; healing comes over a few seconds, rejuvenation at once and for both | Bigger potions (Minor to Super) drop deeper; the cube makes rejuvenation from three healing, three mana and a gem |
| Diablo III | One potion on a cooldown | A few legendary potions, each with a power |
| Diablo IV | One potion with charges | The Alchemist upgrades it with herbs as you level; more charges from Renown; **elixirs** brewed from herbs give an hour's buff and more experience |
| Path of Exile | Five flask slots: life, mana, hybrid and utility flasks, charges refilled by kills | Bases by level; one prefix (how it recovers: at once, faster, more, on low life) and one suffix (what else: ends burning, armour, speed while it lasts); quality; unique flasks with rules of their own; enchants that drink it for you ("used when you're hit") |
| Path of Exile 2 | Life and mana flasks only, and **charms** that use themselves when something happens to you (frozen, stunned) | Bases and affixes as in the first; the belt sets how many charms |

### What fits

Path of Exile's way, where a potion is an item with a base and affixes, fits best, because the
game has the machinery already. Runes roll affixes on items, and a talisman is an item of a slot
that isn't worn. A potion is just an item of the slot `potion`. Diablo IV's way, brewing a potion
up a grade with herbs, gives a sure path beside the runes' random one, and OSRS has the herbs: 14
of them in level order, real objects (Grimy guam leaf 199 to Grimy torstol 219). OSRS's own
famous brews (Overload, Saradomin brew, Zamorak brew, Ambrosia) already come with rules, as Path
of Exile's unique flasks do. Diablo II gives the belt of four and the rejuvenation potion.

Kills refilling the potions stays. Diablo II's potion drops and belt-filling are its most dated
part, and the game's "fast to the point" pillar is against them.

### The belt

- **Four slots on 1 to 4** (3 and 4 are free in `client/controls.ts`). Slot 1 holds a life
  potion, slot 2 a mana potion, and 3 and 4 any potion. They're shown on the HUD by the orbs.
- **A potion is an item** whose icon is the cache's own object for the doses left, so a Saradomin
  brew shows (4) full and (1) on its last dose (6685 to 6691; every potion named below has all
  four, but the Tombs of Amascut's, which have two).
  Doses are charges. Past four, the (4) icon carries the number, as the rune pouch's counts do.
- **Four families:**

| Family | Does | Doses | Refill |
| --- | --- | --- | --- |
| Life | As the life flask: a share of life over 1.5 s | 4 | 0.25 a kill, as now |
| Mana | As the mana flask | 4 | 0.35 a kill, as now |
| Rejuvenation | Life and mana at once, a smaller share of each | 2 | 0.1 a kill |
| Combat | A buff for 6 s: damage of one kind, armour, speed, less elemental damage | 3 | 0.2 a kill |

Combat potions are OSRS's: the Super combat potion (melee damage), the Ranging and Magic potions,
Super defence (armour), the Stamina potion (movement speed) and the Antifire potion (elemental
damage taken). Rejuvenation is the Sanfew serum (10925).

### Grades: the upgrade path

A potion's base is its grade. OSRS has the ladder already: the plain potions, then the Chambers
of Xeric's brews in three strengths, (-), plain and (+) (Xeric's aid 20973 to 20984).

| Grade | Life | Mana | From level | Life recovered | Mana recovered | Doses |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Guthix rest | Prayer potion | 1 | 45% | 60% | 4 |
| 2 | Saradomin brew | Super restore | 12 | 48% | 64% | 4 |
| 3 | Xeric's aid (-) | Prayer enhance (-) | 24 | 52% | 68% | 4 |
| 4 | Xeric's aid | Prayer enhance | 36 | 56% | 72% | 5 |
| 5 | Xeric's aid (+) | Prayer enhance (+) | 48 | 60% | 76% | 5 |

Grade 1 is today's flask exactly, so nothing changes for a hero until they find or brew one. Since
a potion's recovery is a share of the pool, a grade doesn't have to keep up with the level as
Diablo IV's flat heals do. What a grade gives is a little more, a dose more at the top, and its
item level, which sets the tiers its affixes roll at.

### Affixes

A potion is normal or magic, at most one prefix and one suffix, as Path of Exile's flasks are. So
Air and Mind runes, the commonest, work on potions to the end of the game. Today they pile up past
depth 8 with nothing to spend them on. Death, Cosmic and Soul work on them as on gear; Nature and
Chaos don't, since a potion can't be rare.

| Prefix | Does |
| --- | --- |
| Seething | Recovers at once, 25 to 35% less |
| Bubbling | Half at once, the rest over the time |
| Catalysed | Recovers 30 to 60% faster |
| Saturated | Recovers 15 to 30% more, 30% slower |
| Panicked | At once, if drunk on low life |
| Ample | One or two more doses |
| Abundant | Kills refill it 20 to 40% more |
| Chemist's | A 15 to 25% chance a drink takes no dose |
| Experimenter's | A combat potion lasts 20 to 40% longer |

| Suffix | While it works |
| --- | --- |
| of Dousing, of Heat, of Grounding, of Footing | Ends burning, being frozen or chilled, shocked, stunned or snared, and keeps it off |
| of Adrenaline | 15 to 30% more movement speed |
| of Iron Skin | 30 to 60% more armour |
| of Reflexes | +10 to 20% to evade |
| of the Berserker | 10 to 20% more attack speed |
| of Overflow | Life past full becomes a ward, up to 20% of life, that fades over 4 s (Diablo IV's barrier) |
| of Plenty | A kill while it works refills another potion's dose a tenth |

The hero can't be ignited, frozen, shocked or stunned today. The new monster mods (section 3.2)
add that, and these suffixes are the answer to it.

### The Apothecary: brewing

Varrock's own Apothecary (NPC 5036) gets a shop on the square: the chemist's house from Varrock
as a prefab, cut as the city's other shops are (`docs/city.md`).

- **Herbs** drop in the rifts, grimy, by area level, from Guam at 1 to Torstol at 49 (seven of the
  fourteen, one a grade and two above). They're picked up by walking over them and kept in the
  pouch beside the runes: any monster 1%, a rare always, a guardian a handful, a chest one or two.
- **Brew up a grade** (Diablo IV): the next grade's herbs and gold. It keeps its affixes, and its
  item level rises to the hero's, so a Soul rune then rolls them at the new tiers.
- **Instil** (Path of Exile's enchants, Path of Exile 2's charms): one line that drinks the potion
  for you, a choice of "when you fall to low life", "when you're frozen, stunned or snared", "when
  you kill a rare" or "when a guardian wakes". It costs herbs of its grade and gold; one a potion.
- **Elixirs** (Diablo IV): one dose, drunk in the city, lasting the next rift. Each is OSRS's
  plain potion of its kind (attack, strength, defence, ranging, magic, antifire, stamina), for
  10 to 15% of one thing, and every one gives 5% more experience. Herbs are spent on them, so herbs
  never pile up once the belt is done.

Every brew rolls from the hero's crafting seed, as the runes do (`sim/runes.ts`).

### Unique potions

OSRS's special brews, each with a rule, dropped as uniques are. The three from the Tombs of
Amascut (Ambrosia 27347, Liquid adrenaline 27339, Smelling salts 27343) drop only from the Heart and
the pinnacles of section 3.6.

| Potion | Rule |
| --- | --- |
| Overload | 40% more damage for 8 s; costs 30% of life over 2 s; can't be drunk on low life |
| Zamorak brew | 25% more damage for 6 s; costs 10% of life at once |
| Ancient brew | Turns 30% of life into twice that share of mana |
| Divine super combat potion | Its buff doesn't fade while you've killed recently; costs 10% of life |
| Menaphite remedy | Ends every ailment, and none for 4 s |
| Ambrosia | One dose: life and mana full, every other potion full, a ward of 25% of life; only the city refills it |
| Liquid adrenaline | Skills cost half their mana for 8 s |
| Smelling salts | 20% more damage and no ailments for 6 s |

### The tree

A cluster of potion nodes off the rim between Dexterity and Intelligence (potion effect, doses,
refill from kills, a dose back on a rare kill), and the keystone `docs/design.md`, section 15, has
waiting: **Overload**, where life potions recover nothing and each dose drunk gives 15% more damage
for 8 s, three at once. All of it goes on the end of `build()`.

### Saves

`hero.potions` holds four slots of items, and the pouch holds herbs. A hero saved before potions
gets a grade-1 life and mana potion in slots 1 and 2, the same as the flasks they had.

## 3. A ladder made of parts

### What makes random content interesting

What keeps Diablo III's rifts, Path of Exile's atlas and Last Epoch's monoliths fresh for
thousands of hours isn't randomness. It's this:

1. **Random from hand-made parts.** A rift is a roll of land, monsters, a guardian, an encounter
   and its modifiers, and each part is made by hand and looked at in the game. That keeps the
   game's first rule, that everything on screen is a real asset, and it keeps the soup out.
2. **A roll you see before you choose.** The choice is the fun, as with the Archmage's three
   offers today. Last Epoch shows each echo's reward before you go in.
3. **Each part changes how you play.** A host of archers plays unlike a host of brutes. An
   encounter is a thing to do. A monster mod is a behaviour to read.
4. **Rare surprises.** A treasure goblin, a superior, a wandering boss, a secret level: the "this
   one was different" moments.
5. **Everything random feeds a chase.** Each encounter pays in a currency of its own that buys a
   set or opens a pinnacle, so a player looks for it on purpose.

The first sixteen depths stay as they are: the campaign, tuned and hand-laid, with its laps. The
parts take over from depth 17.

### 3.1 A rift rolled from parts

Past 16, a rift isn't the next zone in order. It's rolled from the rift's seed, on a stream of its
own as the features' is (`0x0fea7e5`):

- **The land.** One of the generator's thirteen biomes, including the five the game doesn't use
  yet (jungle, tropical, autumn, elven, fairy). A third of the time a second biome is mixed in
  (`secondBiome`, `biomeMix`), so snow can run into ash or a swamp into desert. The generator's
  knobs (trees, hills, ruins, ponds, rivers, mountains, volcanoes, mesas, the boundary) roll
  within ranges the biome sets. A fifth of the rifts are at dusk, so the lights the city already
  has come up (`DUSK`).
- **The host.** A set of monsters that belong together, with roles (fodder, brutes, shooters or
  casters, leaders), from the 25 there are and new ones (below). The host decides which
  guardians can be met.
- **The guardian**, any of the host's, with one guardian mod (two from depth 30, section 3.4).
- **Its modifiers**, as now.
- **An encounter** (section 3.3).
- **A name** from its parts, in the way Diablo II names its places: "The Ashen Fen, held by
  Bandos's warband".

Thirteen biomes, half a dozen mixes, a dozen hosts, three or four guardians each, the modifiers and
eight encounters make tens of thousands of rifts, and each piece is checked once.

**The hosts.** OSRS's own factions, each with monsters the cache has:

| Host | Monsters | Guardians |
| --- | --- | --- |
| Bandos's warband | goblins, hobgoblins, orks, ogres | Graardor, Grashnak, Obor |
| Zamorak's legion | imps, lesser, greater (2025) and black demons, hellhounds (104) | K'ril, Skotizo, Cerberus, the Tormented Demon (13599) |
| Armadyl's flight | aviansies, Fremennik archers | Kree'arra |
| The restless dead | zombies, skeletons, ghosts, shades | Vet'ion, Count Draynor |
| Morytania's vampyres | Vyrewatch (3709), ghouls, werewolves | Count Draynor, Bloodmoon |
| The Barrows | dark wizards, skeletons; the brothers lead | Ahrim, and the other brothers in time |
| The Slayer Tower | crawling hands, banshees, gargoyles (412), nechryael (8), abyssal demons (415) | the Abyssal Sire (5886) |
| The Fight Caves | TzHaar-Ket, -Xil, -Mej | TzTok-Jad |
| The Kalphite hive | Kalphite workers, soldiers (138), guardians | the Kalphite Queen |
| Waterbirth | dagannoth of three sizes (140, 970, 973) | the Dagannoth Kings, three at once |
| The wild | wolves, giant spiders, bears, rock crabs | Sarachnis, Callisto (6503), Venenatis (6504) |
| Karamja's jungle | jungle horrors (1042), jungle spiders, moss giants | Bryophyta, a jungle demon |
| Dragonkin | wyverns, drakes, wyrms, baby dragons | Vorkath |

Each new monster is a row in `MONSTERS` with its seqs looked up (`npc-info.ts`, `seq-info.ts`) and
looked at fighting and dying, as every monster now has been. That's most of the work here, and
it can go host by host.

### 3.2 Monsters that differ

**More mods.** Six today: hasted, armoured, berserk, colossal, vampiric, regenerating. Diablo II's
champion and unique mods, Diablo III's elite affixes and Path of Exile's are where the danger of a
pack comes from, as something to read and answer. These twelve are each something the player sees,
dressed in spot animations the game already bakes or looks up:

| Mod | From | Does |
| --- | --- | --- |
| Infernal | D2's fire enchanted | Hits add fire and may ignite; it explodes as it dies |
| Frostbound | D2's cold enchanted | Hits chill; a ring of ice goes out from it as it dies |
| Charged | D2's lightning enchanted | Sparks fly out when it's hit |
| Blinking | D2's teleportation | Teleports beside the hero when they're far, every 6 s |
| Volleying | D2's multiple shots | A shooter's shot is three |
| Raising | Path of Exile's necromancer | Raises its pack's dead, once each |
| Commanding | D2's aura enchanted | Its pack moves and hits 20% faster while it's near |
| Binding | D3's jailer, OSRS's Bind and Entangle | Roots the hero for 1 s every 8 s, telegraphed |
| Grasping | D3's vortex | Pulls the hero to it every 8 s |
| Molten | D3's molten | The ground it walks on burns |
| Draining | D2's mana burn, Zamorak's drain | Hits take mana as well as life |
| Shielding | D3's shielding | Its followers take 60% less while it lives |

From depth 17, magic packs have one or two mods and rares three or four. Each mod past the first
pays as D2's do: more items and rarity from that monster. Reflected damage is left out on
purpose: it punishes the player for playing.

**Superiors.** OSRS's own rare surprise: a slayer monster's kill sometimes calls up its superior.
Any kill on the ladder has a 1 in 200 chance of raising its superior where it fell. Where the cache
has one, it's that one (the Greater abyssal demon 7410, the Nechryarch 7411, the King kurask
7405, the Night beast 7409, the Cave abomination 7401). Where it doesn't, it's the monster drawn
larger and named "Superior". It has a rare's life five times over, three mods, and drops as a
rare three times, with a sure handful of herbs and runes.

**Wilderness bosses** as Diablo II's superuniques: named, always the same, with their own
behaviour. One in four ladder rifts has one roaming: the Chaos Elemental (2054), whose hit blinks
the hero a few tiles; Scorpia (6615) with her guardians, who heal her; the Crazy archaeologist
(6618), who throws books that explode; Callisto and Venenatis, when they aren't guardians. They
hunt the hero across the rift, and they drop as a guardian does.

### 3.3 Encounters: OSRS's minigames as Path of Exile's leagues

Path of Exile's leagues (Breach, Legion, Ritual, Blight, Expedition) are where its maps get their
variety: a self-contained thing to do, in any map, paying in its own way. OSRS has the same in its
minigames and raids. Each ladder rift rolls one (two in a rift of three modifiers or more), and the
Archmage's offers show which. From depth 9 a riftstone can have one woven. Placed as the hoard is,
at a reachable landmark.

| Encounter | Like | What happens | Pays in |
| --- | --- | --- | --- |
| A fleeing impling | D3's treasure goblin | A dragon, ninja, magpie or crystal impling (1644, 1643, 1642, 8741), now and then a lucky one (7233), runs from the hero, dropping gold and runes when hit, and is gone through a portal in 15 s | Its jar (11260): a burst of runes, herbs, items, sometimes a unique |
| A Wilderness hunter | Path of Exile's rogue exiles | A hero of one of the six classes, in real gear and with two of its class's skills, hunts you. The hero baker already bakes any class in anything, and the look generator rolls its name | One of what it wore, rare or better |
| The Fight Caves | Path of Exile's Ritual; push your luck | A ring of fire: step in for a wave of TzHaar, then choose to take the reward or go on to a harder wave, up to five, the reward doubling | Tokkul (6529), spent at the TzHaar's stall in the city on the obsidian set |
| The Barrows | Diablo II's tombs | Three of the brothers' mounds: touching each raises its brother; with the three down, the chest opens | A chance of a Barrows set piece (section 4.1), and runes |
| Pest Control | Path of Exile's Blight; defend | The Void Knight (1755) stands between four portals (1739) that open one at a time, each shielded while it spawns; break all four before the knight falls | Commendations, spent with the Void Knight in the city on the Void set |
| A God Wars skirmish | Path of Exile's Legion | Two gods' armies, Bandos's against Armadyl's, or Saradomin's against Zamorak's, fight each other and you | Kill count for each god, kept in the save; forty of a god's opens its general's rift (3.6) |
| An Abyssal breach | Path of Exile's Breach | A small tear: touched, it grows to a ring for 20 s and shrinks again, abyssal creatures pouring out inside it | Abyssal splinters; a hundred make a key to the Abyssal Sire's rift |
| Guardians of the Rift | OSRS's own rift minigame; deliver | The Great Guardian at a landmark, rifts round it; monsters drop essence that's carried to it as it's fought for, 100% within 90 s | Abyssal pearls (26792), spent with the apprentice on the Raiments of the Eye (26850) |

Guardians of the Rift is OSRS's minigame about rifts, abyssal creatures and runes. It may be the
most fitting thing in the cache for a game called Riftscaper.

The currencies (tokkul, commendations, kill count, splinters, pearls) go in the pouch with the
runes and herbs. Each buys a set, or opens a pinnacle, so every encounter is something to look
for.

### 3.4 Guardians that are rolled

- **Any of its host's**, so the same land isn't always the same fight.
- **Guardian mods**: one from the monster mods, and from depth 30 two, with three only guardians
  have. *Enraging*: at half life, 30% faster and its specials twice as often. *Summoning*: calls its
  guards again at 75% and 25%. *Warded*: its guards make it take 75% less while any stands.
- **New specials** beside the slam, rain and nova: a *charge* (a line marked on the ground, then it
  runs it), a *summon* (a pack of its host's) and a *field* (ground that burns or freezes for 6 s).
  On the ladder its specials are its own, with one from the pool added.

### 3.5 Choosing where to go: the rift web

Past 16 the Archmage's depth list becomes a web on the apprentice's scrying table, as Last
Epoch's monoliths and Path of Exile's atlas are. Each node is a rolled rift (land, host, guardian,
encounter, modifiers), and its reward is shown: "its guardian drops a talisman", "a hoard of
herbs", "a set piece", "a forged gem", "twice the runes". Clearing one shows the nodes a depth
deeper next to it. Some nodes are special: a god's general, the Heart, the Colosseum, a
Wilderness boss's lair. A node keeps its roll till it's done, saved as a seed and a place, which
costs little.

A first step needs no web. The Archmage's three offers on the ladder show their land, host,
guardian and encounter, not only their modifiers. The web can come later.

### 3.6 Things to chase past 60

- **Levels to 99.** Diablo II and OSRS both stop at 99. Past 60 each level could cost 10% more
  than the last, as OSRS's do, so 92 is half the way to 99, as in OSRS. Each would give a passive
  point and nothing else: no life, no mana. These levels would take the place of the ladder's two
  points a depth, and a hero keeps whichever count is more. Every kill on the ladder moves a hero
  on again, where today only a cleared depth does. Monsters scale with the area's level, not the
  hero's, so the curves in `docs/design.md`, section 8, don't move.
- **A seventh affix tier**, *rift-touched*, that opens at item level 65, which only the ladder
  drops. A rift's area level is its items' level, so the ladder's drops get it as they deepen, and
  the chase never ends at 50. It's Diablo IV's greater affixes and Last Epoch's exalted ones.
- **Elite bases.** Diablo II's normal, exceptional and elite tiers, from OSRS's own top gear: the
  Barrows and God Wars armour and godswords at 55, Inquisitor's, Justiciar and Ancestral at 70,
  Torva, Masori and Virtus at 85. They drop only on the ladder. The uniques keep their own.
- **Uniques that roll.** A unique's numbers roll within ranges, as Diablo II's do, so a second
  copy is worth looking at, and a Soul rune rolls them again, as Path of Exile's divine orb does.
- **Pinnacles.** The Heart, made to climb (`docs/design.md`, section 15). The god generals, opened
  by kill count: Graardor, Kree'arra, K'ril and Commander Zilyana (2205), with their own uniques. The
  Abyssal Sire, opened with splinters, which drops the Abyssal whip more often than anything else
  does. And **the Colosseum**, from OSRS's Fortis Colosseum: twelve waves, choosing one of three
  "glories" (a harder rule paired with a richer reward) after each, ending at Sol Heredit (12821).
  It's a roguelite run, as Diablo IV's Infernal Hordes is, and it's random content that stays
  interesting because each run is a set of choices.

## 4. Diablo II

In the order of how much each one is Diablo II and how well it fits.

### 4.1 Set items

OSRS is full of sets with set effects, and they're the game's own:

| Set | Pieces | Its effect, as OSRS has it | Comes from |
| --- | --- | --- | --- |
| Dharok's, Ahrim's, Karil's, Guthan's, Torag's, Verac's | Helm, body, legs, weapon | Dharok's hits harder as life falls; Ahrim's may hit 30% harder with magic; Karil's hits again for half; Guthan's heals on a hit; Torag's slows; Verac's hits through armour | The Barrows encounter, and the brothers as rares (Dharok's helm 4716 to platelegs 4722) |
| Void Knight | Helm, top (8839), robe, gloves | More damage of the helm's kind | Pest Control's commendations |
| Obsidian | Helm, platebody (21301), legs; with a Berserker necklace | More melee damage | The Fight Caves' tokkul |
| Raiments of the Eye | Hat (26850), top, bottoms, boots | More runes from kills | Guardians of the Rift's pearls |
| Graceful | Hood (11850), top, legs, gloves, boots, cape | Movement speed and mana back | A drop anywhere, a piece at a time |

Bonuses at two, three and four pieces, as Diablo II's are. A set item's name is green, and its
tooltip lists the set with the pieces worn lit up. A set piece is an item with fixed affixes, as a
unique is, and a `set` id (`SetDef` in `content/items.ts`, read in `heroStats`).

### 4.2 Runewords

Diablo II's best idea, and the game has both halves of it: runes and sockets. Sockets here hold
gems, so a runeword is **inscribed, not socketed**. A normal item with exactly the word's number
of sockets is taken to the binding stones on the Rift Plaza, and the runes are spent in their
order. The item becomes a runeword: fixed affixes, and often a trait or a keystone, as a unique has.
It keeps its sockets for gems. So the chase is Diablo II's: the right base with the right sockets
(and the gem trader's socket work is a gold road to it), and the rare runes.

The runes the game doesn't use yet are the ladder's high runes: Water 555, Earth 557, Fire 554,
Body 559, Law 563, Blood 565, Astral 9075, Wrath 21880, Sunfire 28929, and the combination runes
(Mist, Dust, Mud, Smoke, Steam, Lava, 4694 to 4699). They drop from depth 17, rarest last. The
words get names of the game's own ("Guthix's Balance", "Wrath of the Wilderness"), never Diablo
II's. Every word is listed in Reldo's chronicle from the start, since the chase is the runes and
the base, not a wiki.

### 4.3 "+1 to all skills" and chance to cast

Diablo II's items are known for two kinds of line, and both can be built from what's here:

- **+ to skill levels**: "+1 to the level of all your skill gems" on a rare amulet, "+2 to fire
  skill gems" on a staff, "+1 to the level of socketed gems" on a body. A gem goes past 20 with it,
  up to 23. `resolveSkill` takes the level, so the effect is a number in, the rest is as it is.
- **Chance to cast**: "10% chance to cast a level 12 Ice Burst when struck", "on striking", "on a
  kill". The skill is a skill gem's own, worked out at that level by `resolveSkill` and used at the
  target. A cast from it carries no chance to cast, so nothing recurs (as the traits' rule already
  is).

### 4.4 Prayers as auras

Diablo II's paladin is his auras, Path of Exile's auras reserve mana, and OSRS has the prayer tab.
Prayers fit all three: a side tab of the client's own (its icon and the prayers' sprites are in
the cache), prayers unlocked as the hero levels, each **reserving a share of the most mana** while
it's on. At most two at once, one protection and one other. Its radius reaches thralls and the
hireling, as an aura reaches a party.

| Prayer | Reserves | Does |
| --- | --- | --- |
| Protect from Melee, Missiles, Magic | 20% | 20% less of that kind |
| Steel Skin | 25% | 40% more armour |
| Ultimate Strength, Eagle Eye, Mystic Might | 25% | 20% more melee, projectile, spell damage |
| Incredible Reflexes | 25% | 15% more attack speed |
| Rapid Heal | 15% | 1.5% of life back a second |
| Retribution | 15% | Once a minute, a hit that would kill leaves you on 1 life and blasts everything round you |
| Preserve | 15% | Buffs and potions last 30% longer |
| Chivalry | 40% | 15% more melee damage and 30% more armour |
| Augury | 40% | 15% more spell damage and 2% of mana back a second |

Piety, Rigour and Redemption are already the tree's, so the prayer tab leaves them out. The
paladin and the necromancer could reserve 25% less, which makes them the prayer classes, as Diablo
II's paladin is the aura class.

### 4.5 A hireling

Diablo II's mercenary. Hired at the inn east of the plaza, beside the training yard: a Fremennik
warrior, a ranger, a wizard or a Temple Knight, one at a time. It has three slots of its own
(weapon, helm, body), so a hero's cast-offs have a home, which in Diablo II is half the fun of
finding gear. It levels with the hero, is touched by the hero's prayers, can die, and is raised
again in the city for gold. A thrall follows and fights already; a hireling is a thrall with life,
gear and a skill. The engine's other game, Sellswords, has units that fight, and its AI may
carry over.

### 4.6 Resistances

Diablo II's and Path of Exile's gear has a tension this game hasn't: elemental resistances to cap.
Fire, cold and lightning resistances on gear and the tree, capped at 75%, with each Torment lap
taking 15% off them, as Nightmare's and Hell's penalties do. Monsters that deal elemental damage
(the Elemental modifier, Infernal, Frostbound and Charged, the guardians' specials) make it matter.
It gives a rare's suffixes something everyone wants, and it makes gearing on the ladder a puzzle.
It's the biggest balance change here, so it goes last, once the new mods have given elemental
damage somewhere to come from. **Immunities** stay out: they forced two-element builds in Diablo II,
Path of Exile dropped them, and they'd break the pillar of deaths the player can explain.

### 4.7 Quests that last

Diablo II's quests leave something for good: a skill point, a socket, an imbue, stat points, more
life. A chain of them, one for each zone of the first two laps, set by Reldo, who is the city's
chronicler and its Deckard Cain, counted with the tasks' machinery (`sim/tasks.ts`):

| Zone | The quest | Its reward, once |
| --- | --- | --- |
| The Greenway | Clear every pack of one rift | A passive point |
| Gloomwood | Bloodmoon's heart | The gem trader adds a socket for nothing |
| Fetid Marsh | Count Draynor, Enraged | Horvik makes a normal item rare at the best tiers for your level |
| The Barrow Fields | All three brothers in one rift | +5 to every attribute |
| Frostmarch | Kree'arra's feather | The Apothecary's potion of life: 20 more life for good |
| Ashen Wastes | Jad, in a Fleeting rift | +10% to every resistance (if there are resistances) |
| Sunscorch Dunes | The guardian with half the time left | A riftstone of three modifiers |
| The Abyssal Rift | K'ril | The Archmage's tuning: the offers show one more version |

### 4.8 The transmuting circle

Diablo II's cube, as the Rift Plaza's warding circle. The things are laid in it, the binding
stones burn, and one thing comes back. Recipes are listed in the chronicle:

- Three runes give one of the next: three Air give a Mind, and so on up to the ladder's high runes,
  as Diablo II upgrades its runes. That's a use for every rune that piles up.
- Three herbs give one of the next.
- Three riftstones of a depth give one a depth deeper, as Path of Exile's map recipe does.
- A life potion, a mana potion and a herb give a rejuvenation potion, as Diablo II's recipe does.
- A normal base, a Law rune and a Cosmic rune give its elite version, as Diablo II's upgrades do.

### 4.9 The secret rift

Diablo II's secret level, made of OSRS's own joke: the Evil Chicken (1870) from the old random
event. Three eggs (1944), a raw chicken (2138) and a Law rune laid in the circle open a rift of
chickens with their Evil Chicken leading, and its drops are a guardian's. A joke, with good loot.

### 4.10 Smaller touches

- **A drop's sound by its kind**, as Diablo II's high runes ring: a unique, a set piece and a
  high rune each sound different as they land (the cache's sounds), and a unique stands in a
  pillar of light (a spot animation), as later games show it.
- **Uniques and set pieces drop unidentified**, and Reldo reads them for nothing in the city. It's
  a moment of finding out, with little friction, since nothing else needs identifying.
- **A seventh class**, Guthix's druid from Taverley, with nature spells (Bind, Snare, Entangle,
  the Claws of Guthix) and wolves and bears to call. It's the most work here, so it's for much
  later.

## 5. How it fits together

A ladder rift is rolled from land, host, guardian, encounter and modifiers, and chosen for the
reward it shows. Its encounter pays in a currency that buys a set or opens a pinnacle. Its herbs
go into the potions and elixirs, its high runes into runewords and the circle, and its kills into
levels toward 99. Its drops roll rift-touched tiers on elite bases. Each system feeds another, and
the variety is in the combinations, not in any one random thing.

The rules hold throughout. Every part is a real asset, looked up and looked at. Every roll is from
a seed (the rift's, on streams of its own, and the hero's crafting seed), so the sim stays
deterministic. New items, monsters, mods, passives and task kinds go on the ends of their tables,
and old saves are mended as they load.

## 6. An order to build it in

Each phase can be released on its own.

| Phase | What | Size | What it needs checked |
| --- | --- | --- | --- |
| 1 | **Potions**: the belt of four, potion items in four families and five grades, their affixes on the runes, the Apothecary with herbs, brewing, instilling and elixirs, the unique potions | Medium | A `potions.test.ts`; the bot drinking from four slots; the Apothecary's shop in the city and `city-map.ts` |
| 2 | **The ladder's parts**: rifts rolled from depth 17 (biomes with the five new ones, mixes, knobs, hosts, guardians); the Archmage's offers showing them; the twelve monster mods, with the hero's own ailments | Large: most of it is looking up and looking at new monsters | The bot on the ladder (`--from 17 --depth 40`), and every new monster looked at fighting and dying |
| 3 | **Encounters, first four**: the impling, the Wilderness hunter, the Fight Caves, the Barrows; superiors and Wilderness bosses | Medium | A test of each, as `riftKeys.test.ts` tests the features |
| 4 | **Diablo II's items**: set items (the Barrows first), + skill levels and chance to cast, the rift-touched tier, elite bases, uniques that roll, the high runes, runewords and the transmuting circle | Large | The bot's ladder runs again, as all of it adds power |
| 5 | **Levels to 99**, in place of the ladder's points | Small | The bot's ladder runs; saves of heroes with ladder points |
| 6 | **Encounters, last four** (Pest Control, God Wars, the breach, Guardians of the Rift) and the pinnacles they open, and the Colosseum | Large | |
| 7 | **Prayers**, then **the hireling** | Medium each | `balance.ts` taught to pray and to hire |
| 8 | **Quests**, **the rift web**, **resistances** | Medium each | Resistances want the most balancing of anything here |

Phase 1 answers the first ask and is the smallest. Phases 2 and 3 do the most for the ladder. In
the bot's numbers, phase 4 is where the ladder's wall moves.

## 7. Questions for the developer

- Should the first sixteen depths stay as they are, with only the ladder rolled from parts? (This
  proposal says yes.)
- Levels to 99, or the two points a depth kept?
- Resistances: in, with the Torment penalty, or left out?
- How much of Diablo II's friction: unidentified uniques, potions that drop rather than refill?
  (This proposal takes the first and leaves the second.)
- Sets from OSRS's sets alone, or sets of the game's own as well?

## 8. As built

Built on 2026-11-16, phase by phase, each checked by its own tests and looked at in the game.

**The questions, answered.** The first sixteen depths stay hand-made, and the ladder is rolled from
parts. Levels go to 99, and a hero keeps the ladder points they had (`ladderPoints`). Resistances
are in, with the Torment penalty, built last. Uniques and set pieces drop unidentified, and Reldo
reads them; potions refill from kills and don't drop to fill the belt. The sets are OSRS's own.
The druid is left for later.

**Where the build went its own way:**

- **Levels.** Each past 60 is 16% dearer than the last, not 10%, and the first costs 3.5 times the
  60th: about what a ladder rift a depth deeper gives more, so a hero comes about a level a depth.
  94 is half the way to 99, not 92.
- **Encounters.** One a rift. Pest Control pays Void seals, and the breach abyssal ashes, not
  commendations and splinters. The sets are sold at three stalls on the square.
- **Pinnacles.** The Sire opens with a hundred abyssal ashes. The Colosseum is open to anyone past
  rift 16, for nothing.
- **Sets.** The Graceful boots unique became the Graceful outfit's boots too.
- **Runewords and the circle** are at Aubury's bench, not the binding stones.
- **Prayers.** Under Blood Rite, which has no mana, a prayer reserves life. Retribution keeps its own
  minute's timer.
- **The hireling** is hired from the Mercenary Captain, by the square's north-west lantern, not at
  the inn: a Barbarian, an Archer, a Battle mage or a White Knight, for `120 * level` gold, raised
  for `60 * level`. It comes armed with the best plain weapon of its kind for its level, and the
  hero's cast-off weapon takes its place.
- **Quests** count only in the campaign's own rifts. The Marsh's imbue and Gloomwood's socket
  are the gem trader's, not Horvik's; Frostmarch's life is Reldo's reward, not a potion. The goals
  are as `content/quests.ts` words them: every monster in a Greenway rift, Bloodmoon, Count Draynor,
  a rare led by each of three brothers, a Dunes rift cleared with half its time left.
- **The rift web** is on the Archmage's panel, not a scrying table, and only at the hero's deepest
  rift past 16; the pinnacles stay on the panel's own list, not on the web. Its bounties are eight:
  a talisman, herbs, a set piece, a forged gem, runes, three potions, a unique or experience.
- **Resistances** come from rare suffixes, "all resistances" on jewellery and bodies, talismans and
  the Ashen Wastes quest, not the tree. Fire, cold and lightning go through armour, and only
  resistances stop them.
- **The secret rift** is led by the Big Evil Chicken (15547, the same model and animations as 1870
  at full size). Its makings fall in meadow rifts, are hidden in the pouch till found, and the
  recipe shows at the bench only then. Its flock is made weaker than its depth's monsters, and its
  guardian drops two uniques of any kind and a riftstone.
- **A drop's sound and pillar.** A high rune rings from Law up, not every high rune, since Water
  drops often. The pillar is drawn on the overlay, not a spot animation: none in the cache could be
  found to be a beam.
