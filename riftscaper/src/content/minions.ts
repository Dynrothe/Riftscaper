// What a hero's skills can raise to fight beside them (gems.ts, a "summon" skill): an NPC drawn
// with the cache's own model and animations, which follows the hero, goes for whatever's nearest
// them, and crumbles when its time is up. Nothing can hurt one. The skeleton's ids are the rifts'
// own (monsters.ts). Starting guesses, to be tuned in play.
import { MONSTERS, Seqs } from "./monsters";

export type MinionId = "skeleton";

export type MinionDef = {
    id: MinionId;
    name: string;
    npcId: number;
    seqs: Seqs;
    // Tiles a second, and how far it goes for something from the hero
    speed: number;
    leash: number;
    // Tiles: its body, and how far it reaches with a blow
    radius: number;
    reach: number;
    // Seconds between blows, and how far into one it lands
    attackSeconds: number;
    hitAt: number;
    // How it's drawn: a pale glow over the cache's own colours
    tint: number;
    sounds: { attack: number };
};

const skeleton = MONSTERS.skeleton;

export const MINIONS: Record<MinionId, MinionDef> = {
    skeleton: {
        id: "skeleton",
        name: "Skeletal thrall",
        npcId: skeleton.npcId,
        seqs: skeleton.seqs,
        speed: 5.2,
        leash: 9,
        radius: 0.45,
        reach: 1.1,
        attackSeconds: 1.3,
        hitAt: 0.45,
        tint: 0xa8f0d0,
        sounds: { attack: skeleton.sounds.attack },
    },
};
