# Riftscaper

An action RPG in the Old School RuneScape world, on the engine in `../engine`, in the mould of
Diablo and Path of Exile. You make heroes of six classes: a warrior, a ranger or a mage, or one
of two attributes, a paladin, a rogue or a necromancer, who raises the dead. Between adventures you're in
Runefall, a walled city round the tear the sky left when a fall of rune-stones struck the meadow
long ago: the tear hangs in the middle of its square, bound in four of the fallen stones, with
the shops round it and the Wizards' Tower at its north end. The tower's Archmage tunes it, and opens rifts, each a stretch of land that ScapeRune's generator
(the engine's map maker, `../engine/scaperune/`, which makes maps that aren't in OSRS) makes from
a new seed, laid out as Diablo's and Path of Exile's maps are: arenas joined by lanes, walled by
forest or cliffs, water or the void, with a road to the far end. Monsters roam it in packs, and a
boss guards the far end. Kill the boss and its portal takes
you home, and the Archmage can then open a rift one step deeper: harder, in another biome, with
other monsters. He offers each rift in a few versions, as Path of Exile's map mods do: the more
modifiers he weaves into one, the harder it fights and the richer it pays. Loot rolls random affixes, and a few uniques turn up among it, and runes that fall
in the rifts change your gear as Path of Exile's orbs do. As in Path of Exile,
your skills come from gems set in the sockets of your gear, and a passive tree of eight hundred
nodes, with keystones at its rim, a wing for each class past it and talismans set in its sockets,
makes the hero your own.

## Running it

Runefall is the city's name, and the fall of stone it's named after. The game was once called
that too, and its saves were kept under `runefall-` keys; they're moved to the game's own as it
opens (see the saves, under "How it's put together").

From the repository's root (its dependencies are the root's: `bun install` there), with the cache
in `caches/` (the root's `README.md` has which one; `bun run download-caches` fetches it, with
`scripts/download-caches.cjs`):

```bash
bun run download-caches
bun run riftscaper
```

It's served on port 5188. `bun run build:riftscaper` builds it into `riftscaper/dist`, and
`bun run vitest run riftscaper` runs the sim's tests. `?bgtick` keeps frames coming in a browser pane
that isn't painted, for automated testing. In development, `window.game` is the client.

### Hosting it

```bash
bun run build:riftscaper
bun run slim-cache:riftscaper
```

builds the game into `riftscaper/dist/` and puts a slim copy of the cache in `riftscaper/dist/caches/`:
only the groups the game reads, in chunks named after their sha256, with a `caches.json` listing
them. `bun run preview:riftscaper` (port 5189) serves the build on that slim cache, to try it before
uploading. Run the slim cache again after every build, since the build empties `dist/`.

`scripts/slim-cache.ts` finds what the game reads by loading what it loads with its own loaders:
the city, ScapeRune's palette map (`engine/scaperune/palette.ts`: every floor, loc and prefab the
generator can put in a rift, so any seed's land is covered), a few rifts of each zone with their
camp, every bake (`commonRequests` and `monsterRequest` in `client/Assets.ts`, the hero in every
kit, worn item and animation, every item on the ground), the textures, the sounds (`allSounds`),
the sprites (`ui/sprites.ts`, the hitsplats, and every `sprite` id in the content and code) and an
icon for every item. Then it loads all of that again from the slim cache, with rifts from seeds
it didn't use, and fails if a group is missing. `SLIM_CHECK=0` skips that second pass, for local
tries only. `SLIM_SEEDS=n` sets how many rifts per zone each pass makes (2).

A new kind of thing the game loads (a bake, a sprite, a sound, a map) has to be one the script
loads too, or a hosted game won't find it: put its ids where the script looks, as above.

Host `dist/` with the headers `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`, over HTTPS. The chunks can be cached for good;
`caches.json` and `index.html` need `no-cache`. Upload the chunks before `caches.json`.

## Playing

- **Your heroes**: the title is the genre's hero select, before the Archmage's portal in the
  tear's crater. Your heroes are listed on the left, the last played first, and the one chosen
  stands before the portal (drag to turn them); double-click or Play to go. You can keep ten.
  **Create new hero** brings the six classes out in a line round the portal: click one and they step
  forward with a flourish, while a panel shows their attributes, life and mana, gear and the skills
  they're known for. Click them again, or Next, to make them your own: body type A or B, hair and
  beard, what's worn under armour, and the colours of hair, skin, tunic, trousers and boots (OSRS's
  own character creation, from the cache's identity kits), with eight looks to start from, the dice,
  and a look with or without their first gear. Then a name (or roll one), and **Hardcore** if you
  want it: one life, and a hardcore hero who dies has fallen, stays on the list as a ghost, and
  never plays again. Delete asks first. **Export** saves the chosen hero to a file and **Import**
  brings heroes in from files (on the list, or the class line when there are none yet), to keep
  them safe or take them to another browser; a hero brought in joins the list as one more. In the
  game, the menu's **Helm** hides your helm so your face shows, **Screen shake** and **Smooth
  animation** turn those off (smoothing is off to start with on a phone, as it costs memory), and
  **Save and change hero** goes back to the list. The title's corner has the game's version, and
  **What's new** opens what changed in each one (`CHANGELOG.md`).
  **Sound** sets the volume, and the fighting's and the interface's on top of it. **Controls** sets
  two keys for every control: click one and press a key (Backspace clears it, Escape leaves it),
  and a key already on another control moves over. The mouse's buttons and Escape stay as they
  are. Hovering over anything with something to say shows the game's own tooltip, never the
  browser's.
- **Moving and fighting**, as in Diablo and Path of Exile: what the left button's pressed on
  decides what it does while it's held. Pressed on the ground, it walks there (a ring marks the
  spot, and a click on a wall or a tree walks up to it), and held, it keeps walking towards the
  pointer, and fights any monster the pointer's swept over on the way, as Diablo's held button
  does. Pressed on a monster, it walks up and uses your
  left-button skill on it: a click is one blow, and holding keeps at it, then goes on to whichever
  monster is under the pointer when it falls. The right button, Q, E, R and F are your other five
  skills, aimed at the pointer, or at the monster under it. A blow (Slash, Cleave) used on a
  monster out of reach walks up to it first, and so does a shot or a spell at one out of its range
  or sight. A skill pressed while you're still swinging is used as soon as the swing's done.
  You can move while you swing or cast: walking (a click on the ground, or WASD) carries on through
  a use at 40% of your pace (60% slower), facing where it's aimed, and the blow still lands. A blink or a leap
  gets you out of anything at once. Shift stands still: every skill goes where you point. WASD
  also moves, and while it's walking you the left button is your left-button skill, used at the
  pointer or the monster under it as you go, as in Path of Exile's WASD mode. A left press made
  while WASD walks you, just after it did, or held while it does, never walks you up to a monster:
  it's used where you are till you let go, so you can kite backwards.
- **Hits** land on the swing's own moment: the animation is played to meet the blow and its sound
  is heard on it, a hit holds both of you a moment, what's hit flinches back and is shoved a little (a hard hit can stagger it
  out of its own blow), a kill throws the body along the blow, and big things shake the screen.
- **What you can click**: monsters, people, loot, chests, hoards and shrines, the waystone and the
  portal are each a box round their whole model on screen, and the thing whose middle is nearest the pointer wins. Loot's
  names come first, then monsters, then the rest.
- **The map** (Tab): an overlay over the world, as Diablo's and Path of Exile's are: what you've
  seen of the rift, faintly, with its walls, water and woods outlined in blue, laid round you as
  the camera sees the ground, and the waystone, the portal, the guardian, the chests, shrines and
  hoard you've seen and not yet used, and monsters about marked on it. Lone trees and rocks are left off. Tab again hides it; the minimap stays in its corner.
- **Mana**: skills cost a good deal of it (a class's first attack and the weapon's are free), and
  it comes back slowly, so a fight is paced by it: spam a skill and it's dry in a few seconds,
  and the mana flask and the free attack carry you till it's back. The classes that fight with
  weapons earn it back by fighting: every enemy an attack hits gives back a share of the pool
  (warrior 3%, rogue 3.5%, paladin 3%, ranger 1.5%, up to three enemies at once), so they're
  meant to be in the thick of it. The mage and necromancer have bigger pools instead. The
  Character tab shows how much a hit gives.
- **Potions**: the belt by the orbs holds four, drunk with 1 to 4: a life potion first, a mana
  potion second, and any in the last two (a rejuvenation potion, or a combat potion's buff). A new
  hero has the first two. The last two are the Apothecary's to stitch on, one a lap: bring her the
  Wine of Zamorak that K'ril Tsutsaroth drops at the end of rift 8, or the Jar of darkness Skotizo
  drops at the end of rift 16, with herbs and gold (her bench shows the next errand). Kills
  fill them back up a share of a dose at a time, and coming home fills them. Potions drop, five
  grades of life and mana from Guthix rest and the Prayer potion to the Chambers of Xeric's brews,
  magic ones with affixes (Air and Mind runes work on them), and eight uniques with rules of their
  own. Herbs fall in the rifts and go in the pouch. **The Apothecary**, on the square's west side,
  brews a potion up a grade with herbs and gold, instils one to drink itself (on low life, when
  you're hindered, on a rare's kill, when a guardian wakes), and makes **elixirs**, one at a time,
  ten minutes in the rifts with a stat and more experience.
- **Uniques** (orange) are more than their numbers: each carries a way to play. Some put a forged
  gem's trait on every skill of the kinds it suits (the Abyssal whip echoes your blows, the Dark
  bow calls lightning down, the Staff of the dead raises what you kill, the Fire cape leaves the
  ground burning), some a keystone as if taken on the tree (the Amulet of fury's Zamorak's Fury,
  the Dragon boots' Acrobatics), and a few a power of their own: the Skull sceptre's thralls
  burst as they crumble. Their tooltip lists it in orange. Five more drop only in the Heart of the
  Rift (below): the three spirit shields, the Necklace of anguish and the Amulet of torture.
- **Things to find**: every rift has two to four **chests** the lost left behind, in its dead ends first (one in four is a
  trap, and a magic pack rises round whoever opens it), one or two **shrines** that bless whoever
  touches them for 40 seconds (Zamorak's 40% more damage, Saradomin's 30% less taken, Armadyl's
  speed, and Bandos's armour with life, mana and flasks filled: the God Wars Dungeon's four altars,
  each on the flattest ground about and facing you), and mostly a **guarded hoard**
  by one of the land's ruins or landmarks: a rare and its magic pack stand round it, and it opens
  once they're dead, for two sure items, one rare, a gem, runes, and now and then a unique. Click
  one to walk up and use it.
- **Loot**: names on the ground show their rarity: white for normal, blue for magic, yellow for
  rare, orange for unique. Click a name or the item, or press Space to pick up the nearest. Gold and
  runes are picked up when you walk over them. Z hides the names, but for the one under the pointer.
- **Your pack** (B or I): drag an item onto its slot to wear it, as in Path of Exile (the slot it
  goes in lights up), and drag something worn back into the pack to take it off; drag within the
  pack to move things about. A tooltip compares an item with what you're wearing. Right-click drops the item, sells it while a shop is open (gems in it come out into the
  pack first), or puts it in your stash while the banker's is open. The Character tab shows your
  stats, attributes and keystones.
- **Runes** go in the pouch, the pack's **Pouch** tab, with your herbs and spoils (tokkul, seals,
  parts), not the pack itself. Click one, then an item in your pack, or one you wear on the Gear
  tab (it stays in hand as you change tabs; hold Shift to keep it after use; right-click puts it
  back). Items it
  works on glow. Air makes a normal item magic, Mind rolls a magic item again, Nature makes a
  normal item rare, Chaos rolls a rare again, Death takes off an affix, Cosmic adds one if there's
  room (one of each kind on a magic item, three on a rare), and Soul rolls an item's numbers again
  within their tiers. Affixes roll for the item's own level, so a base from a deep rift crafts
  better. Uniques and gems can't be changed. Any monster can drop a rune, rares always do and
  bosses drop a handful; Chaos and Death runes start at area level 5, Cosmic at 9 and Soul at 13
  (`src/content/runes.ts`). Each hero's rune rolls come from a seed kept in their save.
- **Gems**: a skill gem in a socket of something you wear gives you its skill; a support gem in a
  socket *linked* to it makes it better (more damage, more projectiles, a bigger area, ignite,
  shock, leech, faster casting, and so on), if it supports that kind of skill. Sockets are red,
  green or blue, and a gem only goes in its own colour (or a rare white socket). The pack's Gems
  page shows every socket you wear with its links: click a gem in your pack, then a socket, or
  click the gem twice to set it where it fits best; click a gem in a socket to take it out. Gems in
  what you wear learn from every kill and level up to 20, as far as your level allows. Your class
  gives you gems as you level, monsters drop more (bosses always), and the gem trader sells them.
- **Forged gems** are skill gems rolled when they drop, as Diablo's items are: a way of fighting
  (a blow, a sweep, a quake, thrown hammers, a volley, a rain of arrows, a bolt, an orb, a nova,
  a storm, an arc of lightning), an element that sets its look and adds a chance to ignite, freeze
  or shock, and one to three **traits** no written gem has: it echoes a moment later, its kills
  explode or rise as your skeletons, it calls lightning down, every fourth use surges, its hits
  build Frenzy or a Ward, its arrows split or come back, it leaves the ground burning, draws
  enemies in, numbs them, or falls again further on. Each trait costs some damage, so a gem with
  three is stranger, not simply stronger. Their names are purple ("Volatile Shadow Nova of
  Echoes"), their traits orange in the tooltip. They're rare (a guardian's about one time in seven,
  any other monster's far less), only of your class's own colours and weapons, and the gem trader
  keeps one on the shelf, dear.
- **The skill bar** has six buttons: the mouse's two, set apart on the left with a mouse drawn on
  each, as Path of Exile's bar has them, then Q, E, R and F. A newly socketed skill goes on
  the first free one. Click a button to choose what's on it: any skill gem you wear, or your
  weapon's plain attack. With nothing on the left button, it's the plain attack.
- **The passive tree** (P, or the Tree button, which glows when you have points): a point every
  level, to 99, and every rift's guardian slain the first time. Past 60 a level is a passive point
  and nothing else, about a ladder rift's worth of experience, so the ladder gives about two a
  depth.
  Click a node to take it and the shortest way to it from
  what you have; right-click one to give it back for gold, or reset the whole tree for half. Each
  class starts on the inner ring with its own notable inside; attributes (Strength for life and
  melee, Dexterity for projectiles and evasion, Intelligence for mana and spells), small nodes and
  clusters round notables lead outwards to keystones, which change the rules: Zamorak's Fury, Iron
  Skin, Blood Rite, Mind over Matter, Point Blank and more. Some notables carry a forged gem's
  trait, and some numbers hang on something: what you hold ("while holding a shield"), what
  you're doing ("while on low life", "if you've killed in the last 4 seconds") or what you hit
  ("against burning enemies"). Past the rim are six wings, one off each class's side, with
  thirteen keystones more: Arceuus Covenant's thrall army, Inferno's stacking burns, Ice Barrage's
  shattering dead, Temple Knight's Oath, Vengeance, Dharok's Curse, Piety, Graceful, Dragon Claws,
  Chinchompa, Rigour and more; each wing leaves a taste of three nodes near its class's start.
  Eighteen sockets hold talismans, which drop in the rifts (most often from rares and guardians,
  and always in a guarded hoard): click a socket you've taken to set one from your pack or take it
  out. A talisman's numbers count as the tree's, and the six unique ones change the nodes in their
  radius (the Elemental talisman lets them be taken without the way to them). Drag to look about,
  the wheel zooms, and the search lights up every node that matches (Enter goes to each in turn).
  The game waits while it's open. A hero whose points were spent before the tree grew can start it
  over for nothing, once.
- **Runefall**: you start every session in the city, on the square beside the tear. Click someone to walk
  over and talk to them. Horvik (armour, blades, maces and daggers), Lowe (bows, hides and the
  rogue's leathers), Zaff (staves, robes and books) and Aubury (rings, amulets, capes) keep the
  shops round the square and sell gear for your level, restocked every time you come home, and buy
  anything. Aubury also sells Air and Mind runes from behind his counter, dearer the higher your
  level, and enchants a ring or an amulet with one of the tree's notables, which it gives as if it
  were taken, for two Cosmic runes and gold. The gem trader, at his stall on the square's south-east corner, sells skill and support gems, and for gold
  recuts the sockets of what you wear: new colours, new links, or one more socket. Fortunato, at
  his tent on the square's south-west corner, sells gambles: an unknown magic-or-better item for the slot you pick.
  The banker, behind the booths in the bank on the square's west side, keeps your stash: four
  tabs the size of your pack. Click something in it to take it out, and right-click in your pack to
  put something in the tab that's showing. There's no fighting in the city.
- **The city** is walled in Varrock's stone, with a gate to the south, where the road comes in
  from the fields, and one at each end of the tower street. It's built as the genre's best hubs
  are, round what you use every trip (the research and the plan are in `docs/city.md`): you come
  home on the dais round the tear, in the middle of the square, with the Archmage beside you, Reldo
  the chronicler at his lectern, who identifies what you bring back, and the bank's door across
  the way; the shops ring the square, each with its keeper at the door or behind the counter; the
  orrery stands between the tear and the Wizards' Tower, which closes the square's north side.
  The tear hangs over the crater the fall left, in a square dais of flagstones with the four
  binding stones on it, their runes still burning. The south street runs from the square past the
  Blue Moon Inn and the Captain's barracks and training yard to the south gate. The rest of the
  town has stories of its own: the strangers' camp south-east of the square, on ground the fall
  burned bare, where the TzHaar, the Void Knight and Apprentice Felix sell; the chapel and its
  walled churchyard, whose graves are of those the rifts kept; the tower's garden, where a stone
  came down through a house; and the houses on the lanes. Its people have things to say: the town
  crier on the square, Reldo, Father Lawrence at the chapel, the Archmage's apprentice at her
  telescope, the rift wardens who watch the tear, the guards at the gates, the wizards about the
  tower, a farmer in the field outside the south gate, and the townsfolk in the streets.
- **Tasks**, as Diablo's bounties and the Slayer masters' tasks: each time you come home three of
  the city's nine folk (the crier, Reldo, Father Lawrence, the apprentice, the farmer, Bram, Marta,
  Osric the carter and Ailsa) have one for you, marked over their heads and on the minimap with
  the quest icon. Click one to hear it and what it pays. Each sets their own kinds: slay so many
  of one monster (the priest wants the dead and the demons, the farmer whatever's been getting
  into his field), slay rares, or a rift's guardian; clear a rift woven with so many modifiers, or
  with half its time left; open chests, pray at shrines, or take hoards. A task is set near the
  deepest rift you've reached, and counts there or deeper. You can do three at once, one for each
  of them: the tracker under the rift's box shows how far each has got, a line each (hover a line
  for the whole of it; click its heading to fold it away),
  and talking to whoever set one lets you give it up. When it's done a yellow arrow bobs over
  them, and they pay: gold, experience (about a sixth of a level), and one thing more, an item
  at least rare (now and then a unique), a handful of the rarer runes, a forged gem, or from rift
  9 a riftstone. Tasks taken are kept in the save; the offers are rolled anew each time you're
  home.
- **The Archmage**, Sedridor, stands on the tear's ring, beside where you come home. He opens a rift to any depth
  you've reached, and the tear becomes its portal. Step into it to enter. Pick a depth on his panel,
  then one of the three versions of it he offers: the first has no modifier or one, the next one or
  two, the last two or three (see below). The offers stay as they are while you choose, and new
  ones are rolled each time he opens a rift.
- **Riftstones** drop from the second lap on (rift 9 and deeper): the guardian always drops one of
  its own rift and often one a step deeper, a rare monster now and then, and a hoard half the time.
  Each is a rift with its modifiers woven in, normal, magic or rare (up to four modifiers, where
  the Archmage weaves three), and the runes work on it as on gear: Air or Nature weaves a plain
  one, Mind or Chaos weaves it again, Cosmic adds a modifier, Death takes one off. Give one to the
  Archmage (his panel lists those in your pack) and he opens that rift as it is, if you've been
  that deep.
- **The second lap and the Heart**: past the eighth rift each land has a second guardian (Obor,
  Sarachnis, Bryophyta, Vet'ion, Vorkath, Cerberus, the Kalphite Queen and Skotizo), met on the
  second lap (Torment 1), so the second time round is a new fight. From rift 17 the
  guardians shed **shards of the Heartstone**, one of four (Air, Water, Earth, Fire), the ones
  you lack the likelier. With all four in your pack the Archmage opens the way to **the Heart of
  the Rift**, at the deepest you've reached: a small rift of the Abyss's worst, and at its end
  the Corporeal Beast, the hardest guardian there is, which slams, throws a nova and calls a rain
  in turn, and is the only one that drops the five pinnacle uniques. The shards are spent on the
  way in; the Heart takes you no deeper.
- **Rift modifiers** make a rift harder, and each pays for itself: more items fall (every item and
  gem that drops has that chance of bringing another), better ones (rarity), more runes, and kills
  teach more. A rift's modifiers, and what they add up to, are listed under its name at the top
  left, in the rift and in the city while it's open. Some are only woven into deeper rifts:

  | Modifier         | From rift | What it does                                                          | Items | Rarity | Runes | Exp. |
  | ---------------- | --------- | --------------------------------------------------------------------- | ----- | ------ | ----- | ---- |
  | Hasted           | 1         | Monsters move and attack 25% faster                                   | 12%   | 10%    | 12%   | 8%   |
  | Hardy            | 1         | Monsters have 40% more life; the rift lasts 15% longer                | 12%   | 10%    | 10%   | 10%  |
  | Brutal           | 1         | Monsters deal 25% more damage                                         | 12%   | 12%    | 10%   | 8%   |
  | Ironclad         | 1         | Monsters have twice the armour; the rift lasts 10% longer             | 8%    | 8%     | 8%    | 6%   |
  | Teeming          | 1         | 40% more monster packs                                                | 10%   | 5%     | 10%   | 5%   |
  | Enraged guardian | 1         | The guardian: 60% more life, 30% harder hits, specials 50% more often; the rift lasts 10% longer | 10%   | 15%    | 15%   | 8%   |
  | Swarming         | 2         | Packs have two more monsters                                          | 8%    | 5%     | 8%    | 5%   |
  | Vampiric         | 2         | Monsters' blows heal them by 4% of their life                         | 8%    | 8%     | 8%    | 6%   |
  | Regenerating     | 2         | Monsters regenerate 2% of their life a second; the rift lasts 10% longer | 8%    | 6%     | 8%    | 6%   |
  | Fleeting         | 2         | The rift collapses in a third less time (35%)                         | 16%   | 16%    | 14%   | 12%  |
  | Empowered        | 3         | Magic and rare packs are 50% more common                              | 6%    | 8%     | 6%    | 5%   |
  | Elemental        | 3         | Monsters' hits deal 30% more as fire, cold or lightning, past armour  | 14%   | 12%    | 14%   | 10%  |

- **A rift's time** is limited: two minutes, and three seconds more for every monster in it
  (about ten minutes for most rifts), shown under its name at the top left (red in
  the last minute, with warnings at a minute and fifteen seconds). Modifiers change it: Fleeting
  cuts it by 35%, and the hardier ones (Hardy, Ironclad, Regenerating, Enraged guardian) give a
  little more. When it runs out the rift collapses and you're pulled home alive, the rift lost.
  The clock stops while you're in the city, and for good once the guardian's dead.
- **The ladder**: past rift 16 each rift is rolled from parts, a land (one of thirteen biomes,
  now and then two mixed, one in five at dusk), a host (one of fifteen of OSRS's factions, from
  Bandos's warband to the Abyss) and a guardian of the host's, and named for them: "The Ashen
  Fen, held by Bandos's warband". The Archmage's offers show each one's parts. Its monsters have
  twelve more mods (Infernal, Frostbound, Charged, Blinking and the rest), some of which burn,
  chill, shock or root you, and the more mods the better the loot; its guardians have mods and a
  new special of their own. Any kill there can call up a **superior** (1 in 200), and one rift in
  four has a **Wilderness boss** roaming it, hunting you. Waterbirth's dagannoth may be guarded by
  the **Kraken**, a whirlpool till you come near, and Karamja's jungle by **Zulrah**, which turns
  from one form to the next; neither moves from where it rose.
- **Encounters**: every ladder rift has one, shown in the offers and under the rift's name once
  you're in: a fleeing impling to catch in 15 seconds, a Wilderness hunter, the Fight Caves'
  waves for tokkul, the Barrows' three brothers and their chest, Pest Control's portals for Void
  seals, a God Wars skirmish for kill count, an Abyssal breach for abyssal ashes, or Guardians of
  the Rift for abyssal pearls. Three stalls in the strangers' camp south-east of the square sell sets for them: TzHaar-Hur-Tel
  obsidian for tokkul, the Void Knight his equipment for seals, Apprentice Felix the Raiments of
  the Eye for pearls.
- **Pinnacles**, beside the Heart, past rift 16: Graardor's, Kree'arra's, K'ril's and Zilyana's
  strongholds, each opened with forty of its god's kill count; the Abyssal Sire's nexus, with a
  hundred abyssal ashes; and the **Fortis Colosseum**, open to anyone: its sand just past the
  gate you come in by, where Minimus waits; step on to it and the first of twelve waves comes, a
  glory chosen after each (harder, and better paid), and Sol Heredit at the end. Each drops
  uniques nothing else does.
- **Awakened pinnacles**: each pinnacle is on the Archmage's list again, awakened, opened with its
  key and an **Awakener's orb** (a pinnacle's guardian drops one a third of the time, and the
  ladder's superiors and Wilderness bosses now and then from rift 30). Its guardian has twice the
  life, hits harder and more often, and at half its life calls its guards again and takes up
  another special. It drops two of its uniques every time, rolled high, Chromium ingots, and its
  own: the four generals their vestiges, which Aubury's circle sets in Ultor, Venator, Magus and
  Bellator rings with three ingots.
- **The Tombs of Amascut**, a raid, on the Archmage's list with the pinnacles: you come in beside
  Osmumten, at the mouth of the Nexus, a hall with four chambers off it, one for each path (Het's
  Akkha, Apmeken's Ba-Ba, Scabaras's Kephri and Crondis's Zebak), marked on the minimap. Take them
  in any order: walking into a chamber raises its guardian and its own up through the sand. Once
  all four are beaten, come back into the Nexus and the Wardens rise there, and their fall opens
  the way home. Before going in, choose its **invocations** on the Archmage's panel:
  ten harder rules (more life, faster monsters, no potions, ten minutes, and more), each adding to
  the raid level, which pays in more and rarer items and a likelier second unique from the
  Wardens. Lightbearer, Elidinis' ward (f) and the Keris partisan of the sun drop only there.
- **The rift web**: at your deepest rift past 16, the Archmage's offers are places on a web of
  five lanes, each with a bounty shown (a talisman, a set piece, a forged gem, potions, a unique,
  herbs, runes or experience). The places on your lane and those beside it are open; clearing one
  puts you on its lane, and the next depth opens from there.
- **Unidentified**: uniques and set pieces drop unread, and **Reldo**, in the city, reads them for
  nothing. A unique's numbers roll, so a second copy is worth a look, and a Soul rune rolls them
  again. A unique, a set piece or a high rune from Law up lands with a sound of its own and stands
  in a pillar of light.
- **Sets** (green): the six Barrows brothers', obsidian, the Void Knight equipment, the Raiments
  of the Eye and Graceful, with bonuses for two, three and four pieces worn.
- **Runewords and the circle**: nine high runes, Water to Sunfire, drop on the ladder. **Aubury**
  inscribes fourteen runewords on a normal item with exactly the right sockets, and keeps the
  **transmuting circle**: three runes, herbs or riftstones into one of the next, a life potion, a
  mana potion and a herb into a rejuvenation potion, and a normal base with a Law and a Cosmic
  rune into its elite version. The ladder also drops elite bases (godswords, Torva, Ancestral,
  Masori and more) and, now and then, rift-touched affixes, a seventh tier. The circle also makes
  OSRS's upgrades of a unique and its **part**, with gold (a whip and a Kraken tentacle give an
  Abyssal tentacle; Darklight and three Ancient shards Arclight; Dragon boots and a Primordial
  crystal Primordial boots; eight in all), imbues a ring with a Wrath rune and gold (its numbers
  doubled), and cuts an Uncut onyx into a fury or a Ring of suffering. The parts drop from the
  ladder's hosts and guardians and wait in the pouch.
- **Rift-touched uniques**: a unique found on the ladder above its own level is rift-touched, its
  damage, armour and numbers lifted to stand with the elite bases of the level it dropped at, so an
  old favourite is still worth wearing at rift 40. Its way to play is as it was.
- **The orrery**, on the square between the tear and the tower: click it. Each first on the ladder lights a
  sphere (each host's guardian slain in each band of eight depths, each pinnacle cleared, and each
  awakened), and each sphere is a point to spend on its five arms: more gold or currencies, a
  rift's time, chests and hoards, riftstones, shards and orbs, cheaper keys, rarity, superiors, and
  a favoured host whose parts drop twice as often. A node given back costs gold.
- **The Log** (the side tab with the book): the **collection log**, a slot for everything to find,
  page by page, lit the first time you have it; and the **combat achievements**, six tiers of them
  for every guardian (slain, slain untouched by its specials, slain in haste), the awakened, the
  ladder, the encounters and the raid. Their points open **Ghommal's hilts**, each a convenience: a
  quicker teleport home, a fourth offer from the Archmage, cheaper keys, an orb back, pets more
  often and longer rifts. Every guardian with an OSRS **pet** drops it now and then (1 in 250, 1 in
  50 awakened); choose one on the log's pets page to follow you. The log opens in the middle of the
  screen; drag it by its title to move it (the orrery's panel too), and it opens where you left it.
- **The Max cape**: Reldo gives one to a hero of level 99, for 100,000 gold, and the circle sews it
  into an Infernal cape or a Blessed Dizana's quiver.
- **Past level 60**, the stalls' currencies buy more: the Void Knight makes your top and robe elite
  for seals (the set's bonuses half again with both), TzHaar-Hur-Tel sells an Uncut onyx for tokkul,
  and Felix a talisman of your choice for pearls, now and then a unique one. Fortunato gambles elite
  bases at the deepest area level you've reached, and the folk's tasks past rift 16 pay at their
  depth.
- **Prayers** (the Prayer tab): thirteen, one protection and one other at once, each keeping a
  share of your mana while it's on, opening as you level, as OSRS's do.
- **A hireling**: the Mercenary Captain, at the barracks by the south gate, hires a Barbarian, an
  Archer, a Battle mage or a White Knight to fight beside you. It comes armed and grows with you;
  give it a weapon of its kind, a helm and a body from your cast-offs. A fallen one stays down till
  the Captain raises it, for gold.
- **Quests**: Reldo keeps a log of eight, one for each of the campaign's lands, done in their own
  rifts; each leaves something for good when you claim it (a passive point, a free socket or
  imbue at the gem trader, attributes, life, resistances, a riftstone, one more offer).
- **Resistances** to fire, cold and lightning come from gear, talismans and a quest, and are held
  to 75%; each Torment lap takes 15% off them, to 60% from rift 33. Fire, cold and lightning go
  through armour, and only resistances stop them. The character page shows them.
- Something in the meadows lays eggs. Aubury's circle may know what they're for.

The classes (`src/content/classes.ts`). Three are of one attribute; the other three are of two,
start on the passive tree in the gap between those two's classes, and lean to two gem colours:

| Class       | Attributes              | Fights with                                    | Wears                              | Gems         |
| ----------- | ----------------------- | ---------------------------------------------- | ---------------------------------- | ------------ |
| Warrior     | Strength                | Scimitars, swords, battleaxes, maces; a shield | Plate                              | Red          |
| Paladin     | Strength, Intelligence  | Maces and swords; a shield or a holy book      | Plate, chain, Temple Knight armour | Red, blue    |
| Rogue       | Dexterity, Strength     | Daggers, or a bow; no shield                   | Leather, the Rogues' Den's own     | Green, red   |
| Ranger      | Dexterity               | Bows                                           | Leather and dragonhide             | Green        |
| Necromancer | Intelligence, Dexterity | Staves; an unholy book                         | Zamorak's robes, skeletal armour   | Blue, green  |
| Mage        | Intelligence            | Staves; a shield or a book                     | Robes                              | Blue         |

Each class is given gems as it levels (`GEM_REWARDS` in `src/content/gems.ts`):

| Class       | Level 1                       | Then                                                                                                  |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Warrior     | Slash, Cleave                 | Brutality 2, Ground Slam 3, Concussion 4, War Cry 6, Expanse 8, Leap Slam 10                          |
| Paladin     | Smite, Blessed Hammer         | Brutality 2, Concussion 3, Sanctuary 4, Judgement 6, Static Charge 8, Runic Focus 10                  |
| Rogue       | Flurry, Fan of Knives         | Swiftness 2, Bloodthirst 3, Puncture 4, Shadow Step 6, Precision 8, Haste 10                          |
| Ranger      | Shoot, Split Arrow            | Piercing 2, Explosive Arrow 3, Swiftness 4, Rain of Arrows 6, Shadow Step 8, Volley 10                |
| Necromancer | Shadow Bolt, Raise Skeleton   | Concentrated Power 2, Grasp of the Dead 3, Piercing 4, Shadow Step 6, Persistence 8, Blood Barrage 14 |
| Mage        | Fire Bolt, Ice Burst          | Concentrated Power 2, Fire Wave 3, Quickened Casting 4, Blink 6, Saradomin Strike 8, Static Charge 10 |

There are 35 skill gems and 23 supports in all, of three colours, and the forged gems on top
(17 archetypes, 51 looks, 14 traits: `src/content/forge.ts`). A skill gem is its class's own:
only a class of its colour can use it (red for the warrior, paladin and rogue, green for the
ranger, rogue and necromancer, blue for the mage, paladin and necromancer), so a ranger's bow skills
are the ranger's and a mage's spells the mage's. Another class's won't go in a socket, doesn't drop
for you, and isn't sold to you. Supports go with any class. An attack also needs its weapon (a melee
weapon, a bow), and a spell cast without a staff does less. Raise
Skeleton calls up skeletal thralls (`src/content/minions.ts`) that rise from the ground, follow
you, fight whatever's nearest, and crumble when their time's up; nothing can hurt them, and
Persistence keeps them longer.

Monster packs come in four ranks. Normal monsters are plain. Magic packs share one mod, such as
hasted, armoured, berserk, colossal, vampiric or regenerating (and on the ladder twelve more). A rare leader has two or three mods
and a following, and drops more. The boss, at the end, has guards and special attacks. Stand clear
of the ring before its slam lands. A trapped chest's ambush is a magic pack too, and a hoard's
guards a rare and its pack.

The rifts go Greenway, Gloomwood, Fetid Marsh, Barrow Fields, Frostmarch, Ashen Wastes, Sunscorch
Dunes and the Abyssal Rift, each four area levels above the last. Past the eighth they come round
again, harder, with the second guardians. Past the sixteenth they're the ladder's, rolled from
parts.

## How it's put together

`docs/design.md` is the game's design: its pillars, the loop, every system with its numbers and
why, the rules the code keeps, how to add things and what's still rough. `docs/city.md` is the
city's research and plan, and `docs/rift-maps.md` the research into Diablo's and Path of Exile's
maps and the planned rifts built from it. `CLAUDE.md` points an agent at the first two. The table
is where things are.

| Where                      | What                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `src/content/`             | The rules (levels, scaling, armour), classes, how a hero can look (`looks.ts`: identity kits, colours, presets, names), what skills raise (`minions.ts`), skill and support gems (`gems.ts`), the passive tree's layout (`passives.ts`), monsters and bosses (each zone's two guardians, and the Heart's), item bases, affixes and uniques with their traits, keystones and powers, the runes (`runes.ts`), the rifts, the Heart of the Rift and the Archmage's modifiers for them (`riftMods.ts`), riftstones and the Heartstone's shards (`riftstones.ts`), a rift's chests, shrines and hoards (`features.ts`), the city's story, shops and people with what they say (`town.ts`), the tasks they set and what they pay (`tasks.ts`), and the spot animations, as plain data. The Diablo expansion's are beside them: potions, herbs and elixirs (`potions.ts`, `goods.ts`), the ladder's lands, hosts and guardians (`ladder.ts`), monster mods and ailments (`monsterMods.ts`), encounters (`encounters.ts`), pinnacles and the Colosseum (`pinnacles.ts`, `colosseum.ts`), runewords (`runewords.ts`), the transmuting circle (`circle.ts`), prayers (`prayers.ts`), hirelings (`hirelings.ts`), Reldo's quests (`quests.ts`) and the rift web (`web.ts`); sets, elite bases and resistances' affixes are in `items.ts`, resistances' caps in `rules.ts`. The late game's (`docs/late-game.md`): the orrery (`orrery.ts`), pets (`pets.ts`), combat achievements and Ghommal's hilts (`achievements.ts`), the Tombs of Amascut and its invocations (`tombs.ts`); its upgrades, imbues, rings and the Max cape are in `items.ts` and `circle.ts`, its parts in `goods.ts`, the awakened in `pinnacles.ts` |
| `src/world/cityGen.ts`     | Runefall: ScapeRune's generator for the meadow and forest round it on map squares 86-89 by 92-95, then the city laid on top by hand, to a plan drawn from the genre's hubs: the square with the tear in its middle, in its crater and ring of white stone with the binding stones, the shops round it in the order they're wanted, the Wizards' Tower closing its north side, Varrock's wall with its three gates, the tower street and the south street, real buildings cut whole (Varrock's east bank, Horvik's, Lowe's, the Blue Moon Inn, the Wizards' Tower) and the engine's prefabs, the strangers' camp, the barracks' training yard, the chapel and its churchyard, the tower's garden with its ruin, the field and pasture outside the south gate, and where everyone stands, which way they look and what gives light. `docs/city.md` has the research it follows |
| `src/world/zoneGen.ts`     | A rift: ScapeRune's generator on map squares 92-94 by 92-94 with the rift's biome (or the Heart's) and a seed, shaped to a plan with the spawn in a corner and the guardian at the far end, the camp pitched round it, and where its landmarks stand (in development, `?rifts=open` gives the open land rifts were first made on) |
| `src/world/riftLayout.ts`  | A planned rift's shape, from a seed and no cache: a trail, a loop, arms, isles or a field of arenas joined by lanes, the camp at one end and the guardian at the other, nooks off the way; and two pinnacles' own, the Tombs' nexus, a hall with a chamber off it for each path, and the Colosseum's pit, its sand just past the camp (`docs/rift-maps.md`) |
| `src/world/riftShape.ts`   | A plan laid on the land: the generator kept off the closed ground, then cliffs raised or forest planted round the lanes, the biome's water, lava or void where the ground falls away, and a road from the camp to the guardian |
| `src/sim/Game.ts`          | A rift or the city, a tick (20 ms) at a time: the hero's orders and skills, monster packs and their AI, projectiles, boss specials, loot and the keys to rifts, chests, shrines and hoards and the ambushes they spring, the tasks they count for, death, the portal, the waystone and the teleport home; in the city, its people wandering and talking, buying, and paying for tasks |
| `src/sim/town.ts`          | The city for the sim: who stands where, with their titles and lines, and each shop's stock, rolled for the hero |
| `src/sim/tasks.ts`         | The folk's tasks: who offers one each time the hero's home and what it asks and pays, rolled from a seed; taking and giving up; counting kills, guardians, clears, chests, shrines and hoards as a rift plays out; and paying |
| `src/sim/placement.ts`     | Where the waystone, the packs, the boss, the exit and the chests, shrines and hoard go, from walking distances over the rift |
| `src/sim/riftstones.ts`    | Riftstones and the Heartstone's shards: rolling them, what the runes do to a riftstone, and the shards a hero holds |
| `src/sim/hero.ts`, `loot.ts` | The hero's stats from level, attributes, gear and passives, equipping, the stash, experience, rolling items and their sockets, and what they sell and cost |
| `src/sim/runes.ts`         | What each rune does to an item, which runes a kill drops, and Aubury's runes; rolled from the hero's own seed |
| `src/sim/riftMods.ts`      | A rift's modifiers added up, what they do to its monsters and its loot and what they pay, and the versions of a rift the Archmage offers, rolled from a seed |
| `src/sim/gems.ts`          | Sockets and links, setting and taking out gems, gem experience, the gems given each level, the skill bar, and the gem trader's socket work |
| `src/sim/skills.ts`        | Each skill on the bar worked out from its gem's level, its linked supports, the hero's stats and keystones: damage, cost, speed, area, projectiles, chains and chances, which the sim uses as they are |
| `src/sim/passives.ts`      | Passive points, taking a node by the shortest way to it (and an Elemental talisman's links), giving one back, the free reset when the tree has changed, and what's taken adds up to with the talismans' stats and the unique ones' radii |
| `src/sim/talismans.ts`, `enchant.ts` | Setting a talisman in a socket on the tree and taking it out; Aubury's enchanting of rings and amulets with a notable |
| `src/sim/potions.ts`       | The belt: drinking, refilling from kills, brewing up, instilling and elixirs |
| `src/sim/ladder.ts`        | A ladder rift rolled from its seed (land, host, guardian, encounter, name), and how its monsters are evened out |
| `src/sim/runewords.ts`, `circle.ts` | Inscribing a runeword; the transmuting circle's recipes, the secret one among them |
| `src/sim/pinnacles.ts`     | What opens each pinnacle and spending it |
| `src/sim/hirelings.ts`     | Hiring, gearing, raising and the hireling's stats |
| `src/sim/quests.ts`, `web.ts` | Reldo's quests counted and claimed; the rift web's places, lanes and bounties |
| `src/sim/log.ts`, `orrery.ts` | The record: the collection log's pages and lighting a slot, achievements and their points, Ghommal's hilts and pets; the orrery's spheres lit, nodes taken and given back, and its levers as the ladder reads them |
| `src/client/Assets.ts`     | The hero baked with their look and what they wear, monsters scaled to size, the city's people, thralls, spot animations, items and the portal (the Abyss's own rift, a tear of raw energy); on the title, the six classes in their first gear and the hero chosen or being made, dropped once the game begins |
| `src/client/TitleStage.ts` | The title's stage before the portal: the line of classes and the one picked stepping out, a hero alone turned by dragging, and the camera for each step |
| `src/client/Client.ts`     | Builds the city and each rift and switches between them, keeping a rift open while you're home, and steps the sim. Runs the shops and the Archmage, with the riftstones and the Heart, and the folk's tasks. Draws it all on the engine's renderer, with the camera, mouse and keys, lights, the overlay (bars, labels, hitsplats, what people say, the task marks over the folk, the minimap) and the HUD's numbers |
| `src/client/Juice.ts`      | How a hit looks, on screen only: the hit pause, the flinch, screen shake, corpses thrown along the killing blow and facing turned smoothly (`docs/design.md`, section 10) |
| `src/content/anims.ts`     | Where each attack's blow lands in its own animation, and the timing that plays an animation to meet the sim's blow |
| `src/ui/`                  | The React screens over it: the title (`Title.tsx`: hero select, the class from the line, how they look, and what's new from `changelog.ts`, which reads `CHANGELOG.md`), HUD and its skill picker, pack with its Gems and Pouch pages, shops and the gem trader's socket work, the passive tree (`PassiveTree.tsx`, on a canvas), the Archmage, a task's giver and the task tracker, the teleport, death, help and menu. They're dressed as the OSRS client's interface: its stone frames, its fonts at their own sizes, and its sprites from the cache (`rs.tsx`: the close button, the side tabs' icons and stones, the equipment slots, the life and mana orbs) |
| `scripts/`                 | Lookups against the cache for NPC, loc and object ids (`loc-info.ts` for one id's details), animations, spot animations, interface sprites by id or name (`sprite-info.ts`) and drawn into a PNG to look at (`sprite-png.ts`), the world map's icons (`map-icons.ts`), prefabs' doors and free map squares; `locs-in.ts` reads a real place before it's cut; `floor-info.ts` shows floors' colours and counts a real place's; `city-survey.ts` measures a real city's heights, paving and kit; `city-map.ts` draws the city's collision (or, with `HEIGHTS=1`, its heights) as text and checks everyone can be walked to, and `city-png.ts` draws it from above as a PNG with who stands where; `sound-info.ts` checks a sound id from the OSRS Wiki's list is in the cache and how long and loud it is; `seq-motion.ts` shows how an animation moves frame by frame, to find where its blow lands (`content/anims.ts`); `find-npc-seqs.ts` lists the animations on an NPC's skeleton, `classify-npc-seqs.ts` guesses which are attacks, blocks and deaths, and `seq-sheet.ts` poses an NPC through an animation's frames in a PNG to look at; `balance.ts` is the balance bot, which plays every class through the rifts headless and prints what tuning needs (see `docs/design.md`, section 13), on the game's planned rifts or with `--rifts open` on open land; `rift-map.ts` draws a rift from above with its packs and finds, `layout-sheet.ts` rifts' plans, and `layout-nodes.ts` a plan's nodes in world tiles (`docs/rift-maps.md`) |
| `docs/`                    | `design.md`, the game's design for whoever works on it next, `city.md`, the city's research and plan, and the proposals the tree's wings, the Diablo expansion and the late game were built from (`tree-expansion.md`, `diablo-expansion.md`, `late-game.md`) |

The sim follows the engine's rules. Randomness comes from a seeded `Rng`, never `Math.random`, and
trig goes through `fm`. So the same rift, the same hero and the same input play out the same, which
`Game.test.ts` checks. `gems.test.ts` uses every skill gem in a fight, `forge.test.ts` every
class's forged gems and each trait, `passives.test.ts` walks
the tree from every class's start and to each wing's keystones, `expansion.test.ts` the notables'
conditions, talismans and their radii, enchanting, the free reset and the wings' keystones in a rift, `runes.test.ts` uses every rune and the stash, and
`riftMods.test.ts` checks every rift modifier does what it says, that the rewards grow with them,
that the same seed and modifiers play out the same, and the rift's time limit; `riftKeys.test.ts`
checks the uniques' traits, keystones and powers, riftstones and shards, the second guardians
and the Heart, and chests, shrines and hoards; `tasks.test.ts` the folk's offers, every giver's
tasks at every depth, taking them, counting them in a rift and paying for them; `settings.test.ts`
saves and loads heroes, their looks, tasks, quests, the web and the roster, and a hero to a file and back; `controls.test.ts` the key bindings.
The Diablo expansion has its own: `potions.test.ts`, `ladder.test.ts`, `encounters.test.ts` and
`encounters2.test.ts`, `diablo.test.ts` (sets, runewords, the circle, elite bases, skill levels and
chances to cast), `levels.test.ts`, `prayers.test.ts`, `hirelings.test.ts`, `quests.test.ts`,
`resists.test.ts`, `web.test.ts` and `chicken.test.ts`. The late game's are in `late.test.ts`. `Math.random` is used only in the client: for each new rift's seed, the
seeds the Archmage's offers and the folk's tasks are rolled from, the city's restocking, and what its people say.

Heroes are saved in `localStorage`: the first ever made under `riftscaper-save` (as the one hero was
before there could be more), each one since under `riftscaper-save-2`, `-3` and so on, and the list
of them, with the last played, under `riftscaper-heroes`. Everything saved while the game was
called Runefall, under the same keys beginning `runefall-`, is moved to these as the game opens
(`moveOldKeys` in `client/settings.ts`, before anything reads a save). A save from before the list is its first
hero. The settings are under `riftscaper-settings` and `riftscaper-audio`. A hero's file (Export) is
their save as it's kept, under `hero`, marked `"riftscaper": 1`; Import reads it, or a bare save,
as a save is loaded, mending it, and keeps the hero under the next free key. A hero saved before looks
is given their class's own (`CLASS_LOOKS`), and a look a body can't have is mended as it's
loaded. A hero saved before gems is given sockets in what they
wear, and the gems their level has brought, when it's loaded, one saved before runes an empty
pouch and stash, and one saved before rift modifiers no rift open (`riftOpen`, `riftMods`), and one saved before
the Heart in none (`riftHeart`). A riftstone is an item of the base `riftstone` with its rift's
modifiers under `rift`, and a shard one of the base `heartshard_air` (and so on). The tasks under
way are under `tasks`, each with who set it, its kind and its monster or guardian by id (`FOLK`,
`TASK_KIND_IDS`, `MONSTERS`, `BOSSES`), so those ids are never renamed; a task naming one that's gone
is left out, and a hero saved before tasks has none. Passive nodes are saved by id, which
is the order the tree is built in, so once heroes have taken some, new nodes go on the end of
`build()` in `passives.ts`. The talismans in the tree are under `talismans`, by socket id, and
kept in a socket not taken; `treeVersion` is the tree a hero spent their points on (a save
without it is 0, and gets the free reset), and a ring's or amulet's enchanted notable is its
`enchant`, by node id, dropped if that node can't be enchanted. The expansion's are optional, so a
save from before it loads: the belt (`potions`, a grade-1 life and mana potion for a save that had
flasks) and the places the Apothecary's stitched on past its first two (`beltStitched`, none for a
save from before, whose potions in places not open go to the pack), the pouch's herbs and currencies (`goods`, by `GOOD_IDS`), the elixir drunk (`elixir`),
the gods' kill count (`killCount`), the passive points the ladder gave before levels went past 60
(`ladderPoints`), the prayers on (`prayers`), the hireling and what it wears (`hireling`), Reldo's
quests (`quests`), the rift web (`web`) and an open rift's pinnacle, lane and bounty
(`riftPinnacle`, `riftLane`, `riftBounty`). Their ids are never renamed. So are the late game's:
the collection log (`log`, which a save from before lights from what the hero holds), the
achievements (`achievements`), the pets won and the one that follows (`pets`, `pet`), the orrery
(`orrery`: its spheres, nodes and favoured hosts), the Tombs' invocations chosen (`invocations`),
and an open rift's awakening and invocations (`riftAwakened`, `riftInvocations`).
