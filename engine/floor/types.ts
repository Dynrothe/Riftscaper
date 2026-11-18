// A floor that rises and falls away, after the Wardens' third phase in the Tombs of Amascut
// (ArenaFloor.ts runs it, FloorView.ts draws it). It's a rectangle of 1 by 1 tiles,
// each drawn by the game as a slab, so each can shake, rise and fall on its own. Its front is
// north, where a boss would stand: slams travel out from it, and rows fall away from the south,
// the back, towards it. Every hit is warned by the tiles themselves shaking.
//
// Everything past rect, slam, drop and script has a default, so a floor of the Wardens' slabs is
// those and nothing else. To make it your own (CLAUDE.md in this folder):
// shape or ascii for which tiles there are, skins for what they look like, tiles for which skin,
// type and slab size goes where.
export type FloorDef = {
    // World tiles, both ends in: the box the floor's in. Its tiles are counted from its south-west
    // corner (floor tiles) by everything below.
    rect: { x0: number; y0: number; x1: number; y1: number };
    // Which tiles of the box are floor (FloorShapeDef; all of it when unset). The rest is the
    // pit's dark from the start: blocked, and never there.
    shape?: FloorShapeDef;
    // A hand-drawn floor, a row a string, the north row first, from the box's south-west corner:
    // "." and " " are no floor, any other character is, and tiles rules can pick tiles out by
    // their character (FloorWhereDef "chars"). With shape too, the floor's where both say.
    ascii?: string[];
    // What its tiles look like (FloorSkinDef); tiles rules pick them by index. When unset, one:
    // the slam's own slab, rising with its animation.
    skins?: FloorSkinDef[];
    // Which skin, type, turn and slab size each tile has: every rule that covers a tile is
    // applied, in order, a later one over an earlier. Every tile starts as skin 0, "normal", unturned,
    // and a tile on its own.
    tiles?: FloorTileRuleDef[];
    // For the tiles rules' shares and weights: the same seed lays the floor out the same way
    seed?: number;
    slam: {
        // Seconds a tile shakes before it rises
        warn: number;
        // Seconds after it starts rising that it hits whoever's on it: while it's up
        hurt: [from: number, to: number];
        // Of the player's hitpoints
        damage: number;
        // Seconds after a hit from the floor before it can hit them again
        grace: number;
        // The slab coming up: a 1 by 1 tile, its top flush with the ground at rest
        spotAnim: number;
        // As tiles come up (one a tick at most, where they are), and as one hits the player
        sound: number;
    };
    drop: {
        // Seconds a tile shakes and sags before it falls
        warn: number;
        // Of the player's hitpoints, for being on a tile as it goes; they're pushed to the
        // nearest tile that isn't going, over shove seconds
        damage: number;
        shove: number;
        // The slab tumbling, and how long it's drawn falling into the dark
        spotAnim: number;
        fall: number;
        // Rows that never fall: the last row in front of the boss
        keepRows: number;
        // As tiles fall, and as the player's hurt by one
        sound: number;
        // A fragile tile's warning is this much of warn (default 0.5), and it falls by itself
        // after it's risen this many times (default 2)
        fragile?: { warn?: number; hits?: number };
        // Holes, falling rows and fragile tiles never cut the floor in two (so nobody's left on
        // an island) unless this is set
        islands?: boolean;
    };
    // What it throws up, all spot animations (FloorView.ts): dust as a slab comes up and
    // as a tile goes, and a chip of rock (crumbling off a tile about to go, and falling with it)
    effects?: { dust: number; fallDust: number; rock: number };
    // What's under the floor, seen through its holes (locs, drawn by FloorView.ts on a
    // regular grid): pillars holding it up, beams between them, and the arena's wall going down
    // round its edge, over a glow far below
    under?: { pillar: number; beam: number; wall: number };
    // The light under the floor, in its cracks as tiles tremble and far below (0xRRGGBB)
    glow?: number;
    // How a pattern shows every tile it'll hit from the moment it starts, unless it says
    // otherwise (FloorCue; subtle when unset)
    cue?: FloorCue;
    // How much a slab coming up near a player should shake the camera, and a tile going from under
    // or beside them: for the game to do (ArenaFloor.step says which tiles rose and fell)
    shake?: { slam: number; drop: number };
    // What the floor does, at seconds into the loop, and then the loop again from the top
    script: FloorBeatDef[];
    loopSeconds: number;
    // How much the tiles' effects do (FloorTileRuleDef.effect), over their defaults
    tileEffects?: FloorTileEffectsDef;
    // Fallen tiles rise back by themselves (FloorRebuildDef); a tiles rule can say otherwise
    rebuild?: FloorRebuildDef;
    // Patterns by name, for triggers, phases and bosses to start (FloorActionDef "pattern")
    patterns?: Record<string, FloorPatternDef>;
    // What stepping on a tile with a trigger does (FloorTileRuleDef.trigger: its name here)
    triggers?: Record<string, FloorTriggerDef>;
    // The floor's phases by name (FloorActionDef "phase"): another script, and skins swapped
    phases?: Record<string, FloorPhaseDef>;
};

export type FloorBeatDef = {
    at: number;
    // A pattern to start, or something else to do (FloorActionDef); one of them
    pattern?: FloorPatternDef;
    action?: FloorActionDef;
    // On-screen notice as it starts
    message?: string;
};

// What standing on a tile does to whoever's on it (FloorTileRuleDef.effect, or its skin's).
// burn: hurts, a share of their hitpoints every so often (lava); enemies too. heal: heals the
// player, a share of their hitpoints every so often (a glyph). haste and slow: faster or slower,
// enemies too (a speed plate, mud or sand). ice: they keep their momentum and steer only a little
// each tick, so they slide (enemies aren't moved by it).
export type FloorEffect = "burn" | "heal" | "haste" | "slow" | "ice";

// How much: burn's and heal's share of the player's hitpoints, every so often (seconds), and
// burn's hit on an enemy; haste's and slow's change to speed (0.4 is 40% faster or slower); ice's
// grip, how much of the way to where they're steering they get each tick (0 to 1)
export type FloorTileEffectsDef = {
    burn?: { damage?: number; every?: number; enemyDamage?: number };
    heal?: { amount?: number; every?: number };
    haste?: number;
    slow?: number;
    ice?: { grip?: number };
};

// Fallen tiles coming back: after seconds, warned for warn seconds (a light far down the hole and
// the tile rising into view), taking rise seconds to come up. A rule's rebuild (seconds, or 0 for
// never) is over this, for its tiles.
export type FloorRebuildDef = { after: number; warn?: number; rise?: number };

// A tile that does something when it's stepped on (a pressure plate): what, and then not again for
// cooldown seconds (5 when unset); once, never again. A trigger that starts disarmed does nothing
// until something arms it (FloorActionDef "arm"). Only players set them off.
export type FloorTriggerDef = {
    actions: FloorActionDef[];
    cooldown?: number;
    once?: boolean;
    armed?: boolean;
    message?: string;
};

// Something done to the floor, by a trigger, a beat, a phase or a boss's attack (ArenaFloor.act),
// after delay seconds if it has one. pattern: start one (or one of FloorDef.patterns by name).
// drop: a group's tiles fall (warned as a fall is); raise: a group's fallen tiles come back;
// slam: a group's tiles rise, a warning from now (a trap). dropUnder: the tile under whoever it's
// aimed at falls (a boss's). arm: a trigger armed or disarmed. phase: one of FloorDef.phases.
export type FloorActionDef = (
    | { kind: "pattern"; pattern: FloorPatternDef | string }
    | { kind: "drop"; group: string }
    | { kind: "raise"; group: string }
    | { kind: "slam"; group: string }
    | { kind: "dropUnder" }
    | { kind: "arm"; trigger: string; armed?: boolean }
    | { kind: "phase"; phase: string }
) & { delay?: number };

// A phase of the floor (FloorActionDef "phase"): its own script from now (with its own loop), and
// skins swapped on every tile, [from, to] by index, effects going with them (their skins'); and
// what's said as it starts
export type FloorPhaseDef = {
    script?: FloorBeatDef[];
    loopSeconds?: number;
    skins?: [from: number, to: number][];
    message?: string;
};

// What a skin does as it rises, falls, and cracks (a fragile tile's rise that brings it nearer
// giving way), each a spot animation and a sound, either or both (FloorSkinDef.material)
export type FloorMaterialDef = {
    rise?: FloorMaterialFxDef;
    fall?: FloorMaterialFxDef;
    crack?: FloorMaterialFxDef;
};
export type FloorMaterialFxDef = { spotAnim?: number; sound?: number; scale?: number };

// side: one half of the floor rises, row by row away from the front, the middle column with it
// (east or west), or all of it but the middle three columns (both). sweep: every row from the
// front, each with a gap of gap tiles that wanders a tile at a time. ripple: square rings out from
// a tile (the player's, or the middle), with spokes along which nothing rises (a cross, or the
// diagonals), the tile itself first. dropRows: rows from the back fall away, one after another.
// holes: single tiles fall away at random, never next to another hole or the floor's edge.
// restore: everything that's fallen comes back up, front first.
// How a pattern shows the tiles it'll hit from the moment it starts, so where's safe can be read
// before the wave gets there (FloorView.ts). Either way each tile's last second before it
// rises or falls is a strong warning: the tremor and the light through its seams.
// subtle: the floor still reads as stone. Marked tiles are a shade darker, with a thin warm line
// in their seams and the faintest tremor; the safe shape is there if you look for it.
// bold: the pattern's whole shape lit at once. Marked tiles' edges glow gold, bleeding in over
// them and breathing slowly, building to a wide bright glow; for a signature attack whose
// telegraph is the point.
export type FloorCue = "subtle" | "bold";

// Which tiles of a floor's box are floor, in floor tiles from its south-west corner (FloorDef).
// rect: a box, both ends in. ellipse: within rx and ry of a middle (a circle when they're the
// same). ring: between inner and outer of a middle, round (or square, by square). diamond: within
// r of a middle, counting steps. cross: the middle's row and column, width tiles wide. union: in
// any of them. minus: in from, and not in cut. A middle can be in half tiles (11.5 is between
// 11 and 12); it's the box's middle when unset.
export type FloorShapeDef =
    | { kind: "rect"; x0: number; y0: number; x1: number; y1: number }
    | { kind: "ellipse"; rx: number; ry: number; cx?: number; cy?: number }
    | { kind: "ring"; inner: number; outer: number; square?: boolean; cx?: number; cy?: number }
    | { kind: "diamond"; r: number; cx?: number; cy?: number }
    | { kind: "cross"; width: number; cx?: number; cy?: number }
    | { kind: "union"; of: FloorShapeDef[] }
    | { kind: "minus"; from: FloorShapeDef; cut: FloorShapeDef };

// What a floor's tiles look like: a model at a tile's middle, its top at the floor. A spot
// animation's (its model, recoloured as the cache has it, and its animation as its rise), a loc's,
// or a model's own. It should be a tile across (a slab more tiles across is stretched to them).
export type FloorSkinDef = {
    spotAnim?: number;
    loc?: number;
    model?: number;
    // Colours (the cache's HSL) and textures swapped, after the cache's own swaps
    recolor?: [from: number, to: number][];
    retexture?: [from: number, to: number][];
    // Bigger or smaller (1 as it is), and raised (tiles, up), as baked
    scale?: number;
    // Tiles across it's made (1 when unset): a slab of the tiles it's on draws it as it is, and a
    // bigger or smaller one stretches it (a 2 by 2 pillar on a 2 by 2 slab)
    size?: number;
    height?: number;
    // A tint over it (0xRRGGBB)
    tint?: number;
    // How it comes up: its spot animation's own rise ("anim", only a spotAnim skin with one), or
    // lifted, tipped the way the wave goes and settled back in code ("code", the default for
    // everything else)
    rise?: "anim" | "code";
    // How it falls: tumbling away as drop.spotAnim does ("tumble", only for a 1 by 1 tile of the
    // slam's slab), or dropping and turning over in code ("code", the default otherwise)
    fall?: "tumble" | "code";
    // A steady light along its edges while nothing's coming (0xRRGGBB): a glyph's glow
    light?: number;
    // Another skin (its index) drawn under this one, for a model that's only a decal (a rune
    // that lies on a floor), or one that doesn't cover its tiles (a pillar standing on them)
    under?: number;
    // How the cues look on it, for a skin the floor's own light doesn't suit: the light's colour
    // (FloorDef.glow when unset), its strength and width (times as much), and the tremor before
    // a tile's own warning (times as much)
    cue?: { color?: number; strength?: number; width?: number; tremor?: number };
    // A glow all over it, in its tint's colour (0 to 1): lava's; and how much more it glows at the
    // height of a slow pulse, each tile on its own beat
    glow?: number;
    pulse?: number;
    // A spot animation played now and then on a share of its tiles at rest (lava's embers): every
    // so many seconds, on one tile in share (4 when unset)
    idle?: { spotAnim: number; every: number; share?: number; scale?: number };
    // What standing on it does (FloorEffect), unless a tiles rule says otherwise
    effect?: FloorEffect;
    // Its dust, chips and sounds as it rises, falls and cracks (FloorMaterialDef; a game keeps presets, as Run Escape's FLOOR_MATERIALS)
    material?: FloorMaterialDef;
    // Skins (their indices) to draw instead once a fragile tile's risen once, twice and so on, so
    // you can see when it's about to go; without, it darkens and sits askew a little more each time
    stages?: number[];
};

// What a tile does. normal: rises and falls. solid: never rises or falls. reinforced: rises,
// never falls. fragile: falls faster, and falls by itself after rising a few times (drop.fragile).
// safe: never rises or falls, as solid does; for the glyphs a floor promises as safe spots.
// pillar: never rises or falls, and nobody can walk through it (give it a pillar's skin).
export type FloorTileType = "normal" | "solid" | "reinforced" | "fragile" | "safe" | "pillar";

// Where a tiles rule applies (FloorTileRuleDef), in floor tiles. A shape (FloorShapeDef); checker:
// alternate squares of size tiles (1 when unset), odd ones if odd; border: within width tiles
// (1) of the floor's edge, or of no floor; stripes: every every tiles along x or y, width wide
// (1), from offset (0); chars: the ascii map's tiles with any of these characters; all: every
// tile.
export type FloorWhereDef =
    | FloorShapeDef
    | { kind: "all" }
    | { kind: "checker"; size?: number; odd?: boolean }
    | { kind: "border"; width?: number }
    | { kind: "stripes"; axis: "x" | "y"; every: number; width?: number; offset?: number }
    | { kind: "chars"; chars: string };

// A rule laying out a floor's tiles (FloorDef.tiles). Only where it says (everywhere when unset),
// and of those only a share of them (all when unset), picked by the floor's seed.
// skin: which (FloorDef.skins), or one of several by weight; type: what it does; turn: quarter
// turns (0 to 3), or any by chance; slab: tiles that rise and fall as one piece, [x, y] tiles
// across, laid from the south-west wherever the whole of one fits in what the rule covers and
// isn't in a slab already.
// effect: what standing on it does (FloorEffect; "none" for nothing, over its skin's). rebuild:
// seconds after it falls that it comes back, 0 never (FloorDef.rebuild when unset). trigger: the
// name of what stepping on it sets off (FloorDef.triggers). group: a name for its tiles, for
// actions (FloorActionDef). height: tiles up (or down, below 0) it stands, a platform or a sunken
// tile; ramp: a slope up the way it says, from the tile behind it to the one ahead (floorLayout.ts).
export type FloorTileRuleDef = {
    where?: FloorWhereDef;
    share?: number;
    skin?: number | { skin: number; weight: number }[];
    type?: FloorTileType;
    turn?: number | "random";
    slab?: [x: number, y: number];
    effect?: FloorEffect | "none";
    rebuild?: number;
    trigger?: string;
    group?: string;
    height?: number;
    ramp?: "north" | "east" | "south" | "west";
};

export type FloorPatternDef = (
    | { kind: "side"; side: "east" | "west" | "both"; rowSeconds: number }
    | { kind: "sweep"; rowSeconds: number; gap: number }
    | {
          kind: "ripple";
          at: "player" | "middle";
          ringSeconds: number;
          radius: number;
          spokes: "cross" | "diagonal";
      }
    | { kind: "dropRows"; rows: number; rowSeconds: number }
    | { kind: "holes"; count: number }
    | { kind: "restore"; rowSeconds: number }
) & {
    // Its own cue (FloorCue), over the floor's
    cue?: FloorCue;
};
