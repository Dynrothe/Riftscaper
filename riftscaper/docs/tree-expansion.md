# Riftscaper: growing the passive tree

A proposal, written on 2026-11-14, for making the passive tree a maker of builds and not only
of numbers: what's there now and why builds come out alike, the builds a bigger tree is for, the
five pieces that would make them, how each keeps the game's rules, and an order to build them in.
It's built now: the tree as it stands is `docs/design.md`, section 6, and
`src/content/passives.ts`, and what's here is the reasoning, with section 7's questions left for
later. Every number is still a first guess, to be measured with the balance bot's named builds
(`balance.ts --build`, `docs/design.md`, section 13) before it's trusted.

## 1. The tree now

642 nodes: 6 starts, 153 attributes, 417 small nodes of 25 themes, 54 notables, 9 keystones and
3 masteries. Measured from the code (`pathTo` from each start):

- A keystone is 17 points from a pure class's start at the nearest and 29 at the farthest; 18 to
  34 from a hybrid's. Three notables lie within 6 points of every start, and 6 to 8 within 10.
- A hero has 74 points at level 60 with depth 16 cleared, and two more a depth on the ladder.

What makes builds come out alike:

- **Every node but the keystones is a number.** The 54 notables are bigger bundles of the same 35
  stats the small nodes give ("+25% melee damage, +15% critical multiplier"). Two heroes of a
  class who took different clusters differ by how much, not by how they play.
- **The keystones are all trade-offs of damage against defence** (Zamorak's Fury, Iron Skin,
  Steady Hand, Acrobatics, Point Blank, Mind over Matter, Blood Rite, Pain Attunement, Vampiric
  Pact). None of them is about the game's own systems: thralls, ignite, freeze and shock, buffs,
  walking while casting, mana on hit, flasks, shrines, forged traits.
- **Whole systems have no nodes.** Nothing on the tree makes thralls stronger or more (only skill
  duration), and nothing touches buffs, movement skills, chains, pierce, how long a freeze or a
  burn lasts or how hard a shock bites.
- **The tree and gear don't talk.** Uniques give keystones (the Amulet of fury, the Obsidian cape,
  the Dragon boots), which is good, but nothing on the tree cares what's worn (a shield, a book,
  daggers, a battleaxe, a longbow) and nothing worn changes the tree.
- **The hybrids' two attributes stay apart.** A paladin's Strength feeds melee and its
  Intelligence spells, and no node lets one feed the other, so its two halves never meet.

The bot shows it from the other side: it spends points by its own score of stats
(`balance.ts`), and for a tree of numbers that score is right. A tree it couldn't score that way
is one with choices in it.

## 2. What the expansion is for

- **More choices, not more power.** Points stay as they are. The tree grows by about 180 nodes,
  to some 820, so a hero still takes about a tenth of it, as in Path of Exile.
- **Every archetype the game's systems allow gets a way to be built round**, each with a keystone
  that says so in one line, and a taste of it close to its class's start so it starts early.
- **Gear decides as much as points.** What drops (a shield, a forged gem's traits, a unique, a
  talisman) should send a hero down one way of the tree and not another, and a found unique can
  free the points its rule cost.
- **Built from what's there.** Forged traits already run on every skill of the kinds they suit,
  from uniques (`Stats.traits`, `skillTraits`); keystones already reach the sim through one set.
  The tree should use those before it needs new machinery.
- **Named from the world.** Notables and keystones are OSRS's prayers, spells, places, items and
  the Barrows brothers, as the tree's are now.

## 3. The builds it's for

What a player could make with it. Each is a class, a way through the tree and the gear that makes
it, and how it plays.

| Build | Class | The tree | The gear | How it plays |
| ----- | ----- | -------- | -------- | ------------ |
| The Hollow Fletcher | Ranger | Lingering Magic's Gravebound, the Arceuus wing's risen line, Arceuus Covenant (60 degrees from the ranger's side) | Twisted bow (Splitting), a Death talisman | Arrows split through a pack and what they kill rises; the ranger's own arrows are weak, its dead are many |
| Dharok's Disciple | Warrior | Blood Rite, the Warband's cursed line, Dharok's Curse, Guthan's Warspear | Amulet of fury, leech on everything | Fights at a fifth of its life, where its blows are huge, and leeches to stay there |
| Spellblade | Paladin | The Temple Knights' oath line, Temple Knight's Oath | A Law talisman, spell damage from Zaff's robes and books | A mace that grows on spell damage gear, Smite and Judgement scaling off both halves |
| Thornwall | Paladin or warrior | Iron Skin, the bulwark line, Shield of Arrav, Vengeance | Obsidian cape (Iron Skin from gear, so those points go elsewhere), plate, a shield | Walks into a pack and lets it die on its armour |
| Pyre | Mage | The Tower's fire way, Pyre, Inferno | Fire cape (Smouldering), Kindling, Infernal Touch | Three burns on everything, spreading from each death to the next |
| Shatterstorm | Necromancer | The Tower's cold way, Ice Blitz, Ice Barrage | Forged novas and orbs of a frost look | One frozen pack bursts into the next, a chain of deaths across the rift |
| Windrunner | Rogue | The runner line, Agility Shortcut, Graceful | Darklight (Bloodthirsty), Shadow Step | Never stops moving: knives thrown at full pace while kiting |
| Artillery | Ranger | The blast line, Chinchompa | Volley, Split Arrow | Every arrow of a volley bursts; a shotgun of blasts |
| Forgemaster | Any | Whatever suits its gems | A Soul talisman, forged gems of three traits | The build is whatever its forged gems rolled, their traits 40% stronger |
| The Offering | Mage or necromancer | Demonic Offering | Riftstones woven Empowered and Teeming | No mana comes back on its own: magic and rare kills are its mana, so it picks rifts full of them |

## 4. The five pieces

### A. Notables that do something

The cheapest change with the most in it: a notable can carry a forged trait, as a unique does,
and a condition on what's worn.

- **Traits on the tree.** `PassiveNode` gets `traits?: SkillTraits`, gathered in `passiveStats`
  and merged into `Stats.traits` with the uniques' in `heroStats`, the best of each, so
  `skillTraits` puts them on every skill of the kinds they suit and the sim needs nothing new. A
  tree trait is about half a unique's (the Dark bow's Thundering is 20%; the tree's 10%), and pays
  for itself out of the notable's numbers, as a forged gem's traits do out of its damage. A node's
  trait can be held to skills of a tag (Ancient Magicks' echo to spells), which the uniques'
  can't yet. The best-of-each merge means a unique with the same trait makes the tree's redundant:
  found gear frees points, which is the moment a player wants to look at the tree again.
- **Conditions on what's worn**, settled in `heroStats` since gear doesn't change in a rift: with
  a shield, with a book, with daggers, a mace, a battleaxe, a scimitar or sword, a shortbow, a
  longbow, a staff. A base gets a `family` (most are plain from its name), and a `StatLine` an
  optional `when`.

Notables reworked this way keep their ids, so saves keep them; what a taken node does changes, so
a hero saved before the change gets one free reset (piece F).

| Notable (near the) | Now | Would be |
| ------------------ | --- | -------- |
| Heavy Blows (warrior) | +20% melee, +4% stun | +15% melee, +4% stun; hits slow (Numbing 15%) |
| Iron Hide (rogue, warrior) | +25% armour, +20 armour | +25% armour; with a shield, +25% more and 5% less damage taken |
| Swift Hands (rogue) | +8% attack speed, +2% movement | +6% attack speed, +12% with daggers or a scimitar |
| Arcane Focus (mage) | +20% spell, +4% cast speed | +16% spell; with a book, +10% cast speed |
| Deadly Aim (necromancer, ranger) | +2% crit, +20% multiplier | +2% crit; every 4th use a sure crit for 50% more (Surging) |
| Storm Caller (mage, paladin) | +15% elemental, +6% shock | +10% elemental, +6% shock; lightning on a hit (Thundering 10%) |
| Blood Drinker (paladin) | +1.2% leech, +5 life on kill | +1.2% leech; kills give speed (Bloodthirsty 12%) |
| Earthshaker (paladin, warrior) | +15% area damage, +10% area | +10% area damage, +10% area; area skills draw in (Whirling 0.6) |
| Skull Cracker (warrior, rogue) | +8% stun, +10% melee | +8% stun; what you kill bursts (Volatile 25%) |
| Volley Master (ranger) | +20% projectile, +5% attack speed | +15% projectile; rains fall twice more (Cascading 2) |
| Lingering Magic (necromancer) | +20% duration, +5% cooldown | +15% duration; what you kill may rise (Gravebound 20%) |
| Executioner's Edge (warrior) | +25% melee, +15% multiplier | +20% melee, +15% multiplier; with a battleaxe, +15% area |
| Rapid Fire (ranger) | +10% attack speed, +5% projectile | +7% attack speed, +14% with a shortbow |
| Ancient Magicks (mage) | +30% spell, +1% crit | +20% spell; spells echo (Echoing 25%) |
| Winter's Grasp (mage, paladin) | +20% elemental, +8% freeze | +15% elemental, +8% freeze; hits chill (Numbing 20%) |
| Infernal Heart (paladin) | +20% elemental, +8% ignite | +15% elemental, +8% ignite; areas leave the ground burning (Smouldering 25%) |
| Torag's Bulwark (warrior, rogue) | +40% armour, +5% life | +30% armour, +5% life; close blows build a Ward (Warding 2%) |
| Verac's Flail (rogue) | +12% attack speed, +10% physical | +8% attack speed; hits build Frenzy (Frenzied 3%) |

That's eighteen of the 54, round every class, at every depth of the tree. The other 36 stay
numbers, which a tree needs too.

### B. Conditions in a rift

What the wings' notables need, and what makes a build play a way and not only hit harder. Two
kinds:

- **The hero's state**, which changes in a rift: killed recently (4 seconds), hit recently,
  evaded recently (2 seconds), moved recently (a step, a blink or a leap, 2 seconds), on low life (half or
  less, as Pain Attunement), on full life, one of the hero's buffs on, a flask in effect, a
  shrine's blessing on, and how many thralls stand ("3% less damage taken for each thrall, five at
  most"). `Game` keeps them as a mask, and when one flips it makes `this.stats` again with
  `heroStats(hero, mask)` and resolves the skills again: a handful of times a second at most, as
  `heroStats` is cheap. Ticks decide every one, so the sim stays deterministic.
- **The enemy's state**, read in `hitMonster` as a multiplier, as a shock already is: burning,
  frozen or chilled, shocked, stunned, not attacking the hero, a rare, a guardian.

New stats to go with them, each read in `heroStats` or `resolveSkill` (the "Adding things" table's
warning): thrall damage, thrall size and pace, the most thralls, burn damage and length, freeze
length, shock length and effect, one more chain, one more pierce, buff effect, damage taken, and
damage per so many of an attribute.

### C. Six wings and thirteen keystones

The new nodes go out past the rim, one wing for each class's side of the wheel, from the outward
node of the far cluster at the class's own angle (18 or 19 points from its start), out between the
two rim ends either side of it to a radius of about 2,650 (`TREE_RADIUS` is 2,060). A wing is a way
out (two nodes), a hub notable with a talisman socket (piece D), then two ways, three for the mage,
each of small nodes, two notables and a keystone at its end: about 26 nodes a wing, 37 for the
mage's, so a wing's keystone is about 30 points from its class's start. Each wing also leaves a
taste of itself near its class's start, a little cluster of three off the inner ring, so a
necromancer can be a thrall master at level 5 and the wing finishes the job at 25.

Every wing can be walked to by every class, as the rest of the tree can: a ranger's way to the
Arceuus wing is only a sixth of the wheel round.

| Wing (side) | Hub | A way | Its notables | Its keystone |
| ----------- | --- | ----- | ------------ | ------------ |
| Arceuus (necromancer, 30 degrees) | Arceuus Library: +10% thrall damage, +10% duration | The risen | Greater Thralls: +20% thrall damage, thralls 15% larger and 10% quicker. Death Charge: when a rare or a guardian you've hit dies, your thralls' time starts again | Arceuus Covenant |
| | | The offering | Ward of Arceuus: 3% less damage taken a thrall, five at most. Shadow Veil: +5% evasion, 10% more while you've killed recently | Demonic Offering |
| Wizards' Tower (mage, 90) | Rune Essence: +10% elemental, +5% cast speed | Fire | Flames of Zamorak: +25% burn damage, burns a second longer. Pyre: an enemy burning when it dies sets those within 2 tiles alight | Inferno |
| | | Cold | Ice Blitz: hits chill (Numbing 15%), freezes 20% longer. Winter's Bite: +25% damage against the frozen and chilled | Ice Barrage |
| | | Lightning | Claws of Guthix: shocks last 50% longer. Chain Lightning: arcs and chaining skills go on once more | Tempest |
| Temple Knights (paladin, 150) | Initiate's Vow: +6% melee and spell, +10 Strength and Intelligence | The oath | Proselyte's Discipline: +1% spell damage per 10 Strength. Saradomin's Light: +1% melee damage per 10 Intelligence | Temple Knight's Oath |
| | | The bulwark | Shield of Arrav: with a shield, +40% armour and 6% less damage taken. Redemption: once a minute, a hit that would kill you leaves you on 1 life and heals 30% over 2 seconds | Vengeance |
| Bandos's Warband (warrior, 210) | Bandos's Will: +10% melee, +5% life | The cursed | Berserker Necklace: +25% melee damage on low life. Guthan's Warspear: melee hits have a 25% chance to heal 30% of what they deal | Dharok's Curse |
| | | The warband | Ultimate Strength: +15% melee damage while a buff of yours is on. Steel Skin: +30% armour while a buff of yours is on | Piety |
| Rogues' Den (rogue, 270) | Rogue's Trick: +6% attack speed, +3% movement | The runner | Agility Shortcut: +30% damage if you've moved in the last 2 seconds. Stamina: +10% movement while you've killed recently | Graceful |
| | | The blade | Backstab: +40% critical multiplier against enemies not attacking you. Shadow Strike: crits against the stunned, frozen or chilled deal 30% more | Dragon Claws |
| Ranging Guild (ranger, 330) | Guild Marksman: +10% projectile, +1% crit | The blast | Black Chinchompa: projectile bursts 25% larger. Explosive Shot: +15% area damage for projectile skills | Chinchompa |
| | | The marksman | Sharp Eye: +1 pierce. Hawk Eye: +20% projectile damage on full life | Rigour |

The keystones, each one line and each about a system the game has:

| Keystone | What it does | What it's built on |
| -------- | ------------ | ------------------ |
| Arceuus Covenant | Two more thralls of every kind at once, and they deal 50% more; Gravebound raises twice as often, the risen standing four times as long; your own hits deal 50% less | Raise Skeleton, Gravebound, the Staff of the Dead |
| Demonic Offering | A magic or rare kill gives back 20% of your mana and 5% of your life, a normal one 4% of your mana; no mana regeneration | Kills; riftstones woven Empowered or Teeming |
| Inferno | Ignites stack, three at once, each burning on its own; you can't freeze or shock | Ignite (`m.burn` becomes three) |
| Ice Barrage | A frozen or chilled enemy that dies shatters, hitting those within 2 tiles for 12% of its life; you can't ignite or shock | Freeze, Numbing; a shatter kill can shatter, so a frozen pack goes in a chain |
| Tempest | Shocked enemies take 40% more, not 20%, and one that dies shocks those within 2.5 tiles; you can't ignite or freeze | Shock |
| Temple Knight's Oath | Increases to melee damage apply to spells too, and to spell damage to melee; skills cost 25% more mana | The hybrids' two tags, in `resolveSkill` |
| Vengeance | When hit, at most twice a second, strike back at the attacker for half your armour; 20% less damage with your hits | Armour, `hurtHero`; armour is damage, which no build has now |
| Dharok's Curse | Up to 80% more melee damage as your life falls, 1% more for each 1% missing; no life regeneration | Life at the use, as Pain Attunement reads it; Blood Rite keeps you low |
| Piety | Your skills' buffs last twice as long and do 50% more; they cost 50% more mana | War Cry, Haste, Sanctuary, Rock Skin, Arcane Ward |
| Graceful | You move at your full pace while using skills, not 40% of it; 20% less damage | `HERO.castMoveShare` |
| Dragon Claws | A critical strike lands again for half, then twice for a quarter, as the claws' special does; half the critical strike chance | Crits; four hits a crit for every on-hit effect (leech, Frenzy, Ward, traits) |
| Chinchompa | Projectiles burst where they stop or first hit, 50% of their hit within 1.5 tiles; they can't pierce, chain, split or return | Projectiles, `traitStrike` |
| Rigour | Projectiles deal up to 40% more the further they've flown, full at 8 tiles; you move 10% slower | Point Blank's opposite |

Vengeance strikes back from the hero's armour, not from the hit, because a hit is meant to be 4%
to 7% of a hero's life (section 8 of the design) and a share of that would be nothing. The
three elemental keystones each shut out the other two elements, as a choice of element: the mage's
own gems are of all three (Fire Bolt, Ice Burst, Saradomin Strike), so it's a real cost.

### D. Talismans: the tree's own gear

Path of Exile's jewels, in OSRS's dress: talismans, the runecrafter's keys to the altars, set in
sockets on the tree. A new node kind, `socket`, about eighteen of them: one at each wing's hub and
twelve on the main tree, one a sector between the outer ring and the outermost clusters, where two
clusters meet. A socket costs a point to reach like any node, and holds one talisman.

- **The item.** A talisman is an item of a new slot that isn't worn, with a base of each rune OSRS
  has a talisman of (air, mind, water, earth, fire, body, cosmic, chaos, nature, law, death, blood,
  soul), each base's obj id looked up with `scripts/find-objs.ts` and looked at in the game first.
  Normal, magic (two affixes) or rare (up to four), never sockets. Its rune leans its affixes: a
  fire talisman rolls burns and ignite three times as often, a death talisman thralls and duration,
  a law talisman attributes. The runes work on it as on gear, so the rune economy gets another
  thing to spend on.
- **Its affixes** are its own pool, smaller than gear's, and where the conditions live: +4% to 10%
  damage of a tag, +3% to 6% life or mana, +6% to 12% thrall damage, +5% to 10% burn damage,
  buff effect or freeze length, and the conditional ones: damage with a shield, damage if you've
  killed recently, attack speed for each thrall, damage against the burning, frozen or shocked,
  movement while you've killed recently, less damage taken while a buff is on.
- **Dropping.** Rarer than gear, commoner than forged gems: a first guess of 0.3% from a normal
  monster, 1% magic, 6% rare and 25% a guardian, one sure in a hoard, more with rarity.
- **Saved** as `hero.talismans`, the socket's node id to the item: a new key, and a hero saved
  before has none. A talisman in a socket that's given back goes into the pack.

Six unique talismans, five with a radius on the tree (small 300, medium 450 and large 650 in the
tree's units; the rings are 400 apart), drawn as a ring round the socket:

| Unique talisman | Radius | Does |
| --------------- | ------ | ---- |
| Omni-talisman | Large | Nodes in its radius can be taken without being joined to your tree, as if the socket reached them |
| Catalytic talisman | Medium | Small nodes in its radius give 50% more; notables in it give nothing |
| Blood talisman | Medium | Mana nodes in its radius give life instead (a Blood Rite hero's mana nodes are wasted, and this mends that) |
| Death talisman | Medium | Melee, projectile and spell damage nodes in its radius give thrall damage instead |
| Law talisman | Medium | Attribute nodes in its radius give +4 to every attribute instead of +10 to one |
| Soul talisman | None | Your forged gems' and uniques' traits are 40% stronger; your written skill gems deal 20% less |

The Omni-talisman and the catalytic talisman are OSRS's own items, as the rune talismans are;
whether this cache has each is for the scripts to say, and a unique whose item it hasn't takes
another talisman's look.

### E. Gear that speaks to the tree

- **A unique for most new keystones**, as Zamorak's Fury has the Amulet of fury, so a build can be
  found as well as taken, and the points freed spent elsewhere: the Book of the dead (Arceuus
  Covenant, the necromancer's book), the Infernal cape (Inferno), Graceful boots (Graceful),
  Dharok's greataxe (Dharok's Curse), the Ring of suffering (Vengeance), Dragon claws (Dragon
  Claws, the rogue's), the Ice ancient sceptre (Ice Barrage), each if the cache has it, looked up
  and looked at before it's built with.
- **Enchanting at Aubury**, as OSRS enchants jewellery with cosmic runes: a ring or an amulet
  enchanted with one of the main tree's notables gives it as if it were taken, without the points
  or the path. A few Cosmic runes and some gold; one notable an item, a second replacing the
  first; never a keystone or a wing's notable. Rings and amulets have no sockets, so it gives them
  a part in a build of their own, and Cosmic runes a use past adding an affix. Saved as the item's
  `enchant`, a node id, which saves already keep.

### F. What it costs a saved hero

- New nodes go on the end of `build()`, after the hybrids' starts, so every id now stays. Links
  from old nodes to new ones only add ways, which `soundPassives` takes as they come.
- A reworked notable keeps its id and changes what it does, so a hero saved before the change gets
  one free reset (a `treeVersion` in the save, mended to 0 when it's missing), and the tree says
  why.
- `passives.test.ts` checks that the hybrids' starts come after the last keystone; it would check
  against the first nine instead.

## 5. How it keeps the rules

- **Content is data.** Traits, conditions, wings, keystones' words, talisman bases and affixes are
  tables in `src/content/`. The keystones' rules are the sim's, each in one place, as Blood
  Rite's are now: `heroStats`, `resolveSkill`, or a hook in `Game` (`hitMonster`, `hurtHero`,
  `kill`, the thralls' step).
- **Deterministic.** Conditions are ticks; Redemption's minute, Vengeance's half second and the
  shatter's chain are ticks; Guthan's chance and the talismans' rolls come from the game's `Rng`
  and the hero's crafting seed, as the gear's do.
- **Real assets.** Talismans and the new uniques are cache objects; a socket on the tree and any
  new buff icon are sprites from `scripts/sprite-info.ts`; a shatter, a chinchompa's burst and
  Vengeance's strike back use spot animations already baked (`forgeSkillDefs()` does that for
  the traits). Every id is looked up, never written from memory, and looked at in the game.
- **The OSRS dress.** The tree's tooltip shows a node's traits in orange, as an item's are, its
  conditions under its numbers, and a socket's talisman's affixes; the search finds them.
- **Measured.** `balance.ts` can't score a trait or a keystone's rule, so it gets named builds:
  `--build hollow-fletcher` is a class, the nodes to path to in order, and what to keep worn, and
  it prints damage, time to clear and deaths beside the class's plain path on the same seeds. Each
  build in section 3 is one, and a keystone isn't done till its build has been run.

## 6. The order to build it in

Each step is a change of its own, playable when it's done, with its tests, a line in
`CHANGELOG.md`, and `README.md` and `docs/design.md` brought up to date.

1. **Notables that do something** (piece A): traits on nodes, the bases' families and conditions
   on what's worn, the eighteen reworked notables, the free reset, the tooltip's traits. Small:
   `content/passives.ts`, `content/items.ts`, `sim/hero.ts`, `sim/passives.ts`,
   `ui/PassiveTree.tsx`. A test that each reworked notable's trait reaches a skill, as
   `riftKeys.test.ts` checks the whip's echo.
2. **Conditions in a rift** (piece B): the mask, the enemy's state in `hitMonster`, the new stats.
   A test of each condition flipping and what it does.
3. **The wings and their keystones** (piece C), with the tastes by the starts, and the bot's named
   builds. The biggest: thirteen rules in the sim, each with a test as Blood Rite's has. The tree's
   screen gets a larger radius and nothing else, as it draws only what's on screen.
4. **Talismans** (piece D): the bases, their affixes, the sockets, `hero.talismans`, the pack and
   the tree's screen, the drops, the runes on them, the six uniques.
5. **Gear that speaks to the tree** (piece E): the uniques for the keystones, Aubury's enchanting.

Step 1 alone already gives a dozen classes of play the tree doesn't have, and builds on code that's
tested. Steps 3 and 4 are each about the size of the forged gems were.

## 7. For the developer to decide

- **Rework the old notables, or only add new ones?** Reworking is where most of the cheap variety
  is, and costs every saved hero a free reset. Adding only is safe, and leaves 54 notables as
  numbers. This proposal reworks eighteen.
- **A trait from the tree and the same from gear: the best of the two, or both?** The best of the
  two keeps the numbers in hand and makes found gear free points. Both would let a tree and a
  unique stack into something the forged gems' costs were made to stop.
- **More points?** This proposal keeps them as they are: more choice, the same power. Two a depth
  on the ladder already make the late tree a slow climb.
- **A keystone for another class's gems?** Guthix's Balance ("use every colour's skill gems; they
  cost 50% more mana") would make the strangest builds of all, and breaks the rule that a class's
  skills are its own (section 4 of the design). Left out; if wanted, better as a pinnacle unique
  than a node anyone can walk to.
- **Not in this proposal, and worth considering:** poison as a fourth ailment, for the rogue's
  daggers (OSRS's weapon poison); masteries that ask for one of three choices rather than giving
  a bundle; a combo keystone that pays for using a different skill each time; a flask keystone
  (Overload: a flask is damage, not healing); a class's own small ascendancy, earned from the
  second lap's guardians.
