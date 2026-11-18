// Where each attack's blow lands in its own animation, as a share of the animation's length. The
// sim lands a hero's blow at a fixed share of the use (HIT_SHARE in rules.ts) and a monster's at its
// def's hitAt, however long the animation is; the client plays the wind-up and the follow-through at
// whatever speeds bring this moment of the animation onto the tick the blow lands, so a swing
// connects as it's struck and an arrow leaves the string. The sim never reads this.
//
// Read with `scripts/seq-motion.ts` (the end of the fastest stretch, for a blow; the end of the
// draw or the arm's push before the long hold, for a shot or a cast, as the fastest stretch there is
// the arm coming back), then looked at in the game. A seq that isn't here plays as if its blow
// landed where the sim lands it, which is how every seq played before.
export const ANIM_HIT: Record<number, number> = {
    // The hero's
    390: 0.72, // slash
    395: 0.65, // hack
    401: 0.68, // pound
    386: 0.44, // stab
    1062: 0.31, // the dragon dagger's double stab: the first of them
    929: 0.75, // a knife thrown
    1658: 0.72, // whip
    2067: 0.71, // smash
    426: 0.53, // a bow: the string let go after the hold at full draw
    711: 0.49, // a cast: the arm out, before the hold
    1162: 0.49, // a wave cast, on the same frames
    1978: 0.63, // a burst: the last push
    440: 0.58, // a sweep
    811: 0.64, // a prayer
    714: 0.56, // a teleport: gone
    // Monsters' (seq-motion --monsters), where the motion makes the blow plain; the rest land at
    // their hitAt, as they always did
    6184: 0.39, // goblin
    163: 0.41, // hobgoblin
    6579: 0.5, // wolf
    5327: 0.6, // giant spider
    6536: 0.53, // werewolf
    5568: 0.4, // zombie
    5487: 0.5, // skeleton
    6956: 0.45, // aviansie
    169: 0.71, // imp
    64: 0.4, // demons
    2610: 0.56, // TzHaar-Ket
    2613: 0.41, // TzHaar-Xil
    2611: 0.51, // TzHaar-Mej
    4320: 0.3, // ork
    359: 0.7, // ogres
    1312: 0.32, // rock crab
    6980: 0.6, // Kree'arra
    7018: 0.43, // Graardor
    6948: 0.5, // K'ril
};

// The animation's own tick to show, `t` ticks into a use of `useTicks` whose blow lands at
// `hitTicks`, for an animation `animTicks` long whose blow is at `share` of it (ANIM_HIT, or the
// sim's own share if it isn't known). The wind-up plays at whatever speed reaches the blow on time;
// the follow-through at least that speed and fast enough to finish by the use's end, and no slower
// than 0.6 of the wind-up's, so a slow weapon's recovery doesn't crawl. -1 once it's played out and
// the hero or monster is only waiting out the use (shown standing, not frozen in its last pose).
export function animTick(t: number, useTicks: number, hitTicks: number, animTicks: number, share: number): number {
    const animHit = animTicks * share;
    if (t <= hitTicks) {
        return hitTicks > 0 ? (animHit * t) / hitTicks : animHit;
    }
    const windRate = hitTicks > 0 ? animHit / hitTicks : 1;
    const left = Math.max(1, useTicks - hitTicks);
    const rate = Math.max((animTicks - animHit) / left, 0.6 * windRate);
    const at = animHit + (t - hitTicks) * rate;
    return at >= animTicks ? -1 : at;
}
