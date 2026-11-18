// What a light looks like and how far it reaches: every kind of light is one, whatever gives it
// off (a map's, a loc's, a character's, a spell's, a floor tile's). Drawn by DrawnLights, through
// a LightBudget, into the light map (LightMap.ts, lights.glsl).
export type LightLook = {
    // Tiles. Full strength out to under half of it, then a soft fade to its edge.
    radius: number;
    // 0xRRGGBB (WARM_LIGHT, a lantern's, when unset)
    color?: number;
    // How much it adds to what it lights, at its middle (1 when unset). On a dark map 1 lights
    // things about as they'd be anyway; on a lit one 0.5 is a strong glow.
    intensity?: number;
    // 0 to 1: a fire's unsteady light, up to this much of its strength. Only drawn.
    flicker?: number;
    // A slow throb, this much of its strength every seconds. Only drawn.
    pulse?: { amount: number; seconds: number };
};

// A lantern's or a fire's colour: what a light is when it doesn't say
export const WARM_LIGHT = 0xffd49e;

// A look's colour times its intensity, 0 to 1 a channel before the intensity, into out
export function lightColor(look: LightLook, out: Float32Array | number[]): void {
    const color = look.color ?? WARM_LIGHT;
    const intensity = look.intensity ?? 1;
    out[0] = (((color >> 16) & 0xff) / 255) * intensity;
    out[1] = (((color >> 8) & 0xff) / 255) * intensity;
    out[2] = ((color & 0xff) / 255) * intensity;
}
