// What's seen and heard of attacks and spells: the cache's spot animations and the client's own
// synthesized sounds. Spot animation ids and sound ids are the ones Sellswords checked against
// this cache (sellswords/src/content/units.ts), sounds by the OSRS Wiki's list of sound ids.

export type Visual = {
    // On the caster as it lets go
    castSpot?: number;
    // In flight
    projectile?: number;
    // An item's model in flight instead (a thrown obsidian ring)
    projectileObj?: number;
    // Where it lands, on each one it hits
    impactSpot?: number;
    sound?: number;
    hitSound?: number;
};

export const SPOT = {
    fireStrike: { castSpot: 99, projectile: 100, impactSpot: 101, sound: 160, hitSound: 161 },
    fireBolt: { castSpot: 126, projectile: 127, impactSpot: 128, sound: 157, hitSound: 158 },
    fireBlast: { castSpot: 129, projectile: 130, impactSpot: 131, sound: 155, hitSound: 156 },
    fireWave: { castSpot: 155, projectile: 156, impactSpot: 157, sound: 162, hitSound: 163 },
    iceBurst: { impactSpot: 363, sound: 170 },
    shadowBarrage: { impactSpot: 383, sound: 168 },
    // Iban's blast, cast, flying and bursting: a necromancer's shadow bolt
    shadowBolt: { castSpot: 87, projectile: 88, impactSpot: 89, sound: 168, hitSound: 163 },
    bloodBurst: { impactSpot: 376, sound: 105 },
    saradominStrike: { impactSpot: 76, sound: 1659 },
    zamorakFlames: { impactSpot: 78, sound: 1659 },
    blueImpact: { impactSpot: 1458, sound: 2564 },
    bronzeArrow: { projectile: 10, sound: 2707 },
    mithrilArrow: { projectile: 12, sound: 2707 },
    runeArrow: { projectile: 15, sound: 2707 },
    dragonArrow: { projectile: 1099, impactSpot: 1100, sound: 2707 },
    obsidianRing: { projectileObj: 6522, sound: 2707 },
    stomp: { impactSpot: 318, sound: 2500 },
    dust: { impactSpot: 2184, sound: 2500 },
    jadMagic: { castSpot: 447, projectile: 448, impactSpot: 157, sound: 162, hitSound: 163 },
    jadRocks: { impactSpot: 451, sound: 2500 },
} satisfies Record<string, Visual>;

// The stars of a stunned head
export const STUN_SPOT = 80;
// level_up's fireworks
export const LEVEL_UP_SPOT = 199;
// teleport_other_impact
export const TELEPORT_SPOT = 342;
// The home teleport's light gathering round the hero, played with SEQ.homeTeleport
export const HOME_TELEPORT_SPOT = 800;

export const SOUND = {
    // human_hit, human_hit2, human_hit3, human_death
    heroHit: [513, 514, 515],
    heroDeath: 512,
    swing: 2564,
    bow: 2707,
    // item_pickup, coins
    pickup: 2582,
    coins: 2114,
    // interface_select1, interface_wrong
    click: 2266,
    denied: 2268,
    // town_crier_bell_ding: the rift opens
    portal: 3813,
    stomp: 2500,
    godSpell: 1659,
    // A drop worth turning round for, as it lands (Client.dropGlory): sotn_muspah_unique_loot_02,
    // jewel_ding, found_gem
    uniqueDrop: 6765,
    setDrop: 6647,
    runeDrop: 2655,
};

// Every spot animation the game's attacks and spells can show
export function visualSpots(v: Visual | undefined): number[] {
    if (!v) {
        return [];
    }
    return [v.castSpot, v.projectile, v.impactSpot].filter((id): id is number => id !== undefined);
}

export function visualSounds(v: Visual | undefined): number[] {
    if (!v) {
        return [];
    }
    return [v.sound, v.hitSound].filter((id): id is number => id !== undefined);
}
