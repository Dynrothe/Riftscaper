// The orrery (docs/late-game.md C), on the square before the Wizards' Tower: an atlas of the
// ladder, as Path of Exile's atlas tree and Last Epoch's blessings are, kept small. Its spheres are
// lit by what the hero's done on the ladder (sim/orrery.ts): each host's guardian slain in each band
// of eight depths, each pinnacle cleared, and each awakened. Each sphere is a point, and each point
// takes a node of five arms, each node a lever on a roll the ladder already makes, read where it's
// made (Game.ts), from the hero, so the same rift and the same hero still play out the same. A node
// is taken after the one before it in its arm. Ids are saved: an arm's new nodes go on its end.
import type { GoodId } from "./goods";

export type OrreryArmId = "encounters" | "hosts" | "rifts" | "keys" | "finds";

export type OrreryEffect =
    // The encounters' currencies (tokkul, Void seals, abyssal ashes and pearls) this much more
    | "pay"
    // Gold on the ladder this much more
    | "gold"
    // A favoured host, chosen at the orrery: its parts twice as often (content/goods.ts
    // PART_DROPS); a second one further out
    | "favour"
    // A rift's time this much longer
    | "time"
    // A chest more in every rift; a guarded hoard in every one
    | "chest"
    | "hoard"
    // A shrine's blessing this much longer
    | "shrine"
    // A riftstone a depth deeper this much more often; the Heartstone's shards and the Awakener's
    // orbs this much more often
    | "stones"
    | "shards"
    | "orbs"
    // A pinnacle's key this much less
    | "keys"
    // This much more rarity on the ladder; superiors this much more often
    | "rarity"
    | "superior";

export type OrreryNode = { id: number; arm: OrreryArmId; step: number; name: string; effect: OrreryEffect; value: number; notable?: boolean };

export const ORRERY = {
    // A depth's band: the first sphere of a host's is its guardian's at 17 to 24, the second 25 to
    // 32, and so on
    band: 8,
    from: 17,
    // What giving a node back costs: this much gold times the deepest area level's square
    refund: 2,
    // The cache's Orrery (loc-info.ts): three tiles a side, turning
    locId: 25401,
    seq: 3579,
    // How near the hero stands to look into it
    reach: 2.6,
    color: "#ffd060",
};

// The encounters' currencies, which "pay" makes more of
export const ORRERY_PAID: GoodId[] = ["tokkul", "voidSeal", "abyssalAshes", "abyssalPearls"];

type Step = [name: string, effect: OrreryEffect, value: number, notable?: boolean];

const ARMS: { id: OrreryArmId; name: string; steps: Step[] }[] = [
    {
        id: "encounters",
        name: "The encounters",
        steps: [
            ["Fair wages", "pay", 0.1],
            ["Fair wages", "pay", 0.1],
            ["Fair wages", "pay", 0.1],
            ["The Great Guardian's favour", "pay", 0.25, true],
            ["Fair wages", "pay", 0.1],
            ["Fair wages", "pay", 0.1],
            ["Fair wages", "pay", 0.1],
            ["TzHaar-Ket-Zuh's ledger", "pay", 0.25, true],
        ],
    },
    {
        id: "hosts",
        name: "The hosts",
        steps: [
            ["Spoils", "gold", 0.05],
            ["Spoils", "gold", 0.05],
            ["A favoured host", "favour", 1, true],
            ["Spoils", "gold", 0.05],
            ["Spoils", "gold", 0.05],
            ["Spoils", "gold", 0.05],
            ["A second favoured host", "favour", 1, true],
            ["Spoils", "gold", 0.05],
            ["Plunder", "gold", 0.15, true],
        ],
    },
    {
        id: "rifts",
        name: "The rifts",
        steps: [
            ["Borrowed time", "time", 0.05],
            ["Borrowed time", "time", 0.05],
            ["A chest more", "chest", 1, true],
            ["Lingering grace", "shrine", 0.25],
            ["Lingering grace", "shrine", 0.25],
            ["Borrowed time", "time", 0.05],
            ["Hoarders", "hoard", 1, true],
            ["Borrowed time", "time", 0.05],
            ["A second chest", "chest", 1, true],
        ],
    },
    {
        id: "keys",
        name: "The keys",
        steps: [
            ["Deeper ways", "stones", 0.05],
            ["Deeper ways", "stones", 0.05],
            ["The Heartstone's call", "shards", 0.25, true],
            ["Deeper ways", "stones", 0.05],
            ["Woken things", "orbs", 0.25],
            ["Woken things", "orbs", 0.25],
            ["A lighter toll", "keys", 0.1, true],
            ["Deeper ways", "stones", 0.05],
            ["The Awakener's eye", "orbs", 0.5, true],
        ],
    },
    {
        id: "finds",
        name: "The finds",
        steps: [
            ["Keen eyes", "rarity", 0.05],
            ["Keen eyes", "rarity", 0.05],
            ["Keen eyes", "rarity", 0.05],
            ["Something stirs", "superior", 1, true],
            ["Keen eyes", "rarity", 0.05],
            ["Keen eyes", "rarity", 0.05],
            ["Keen eyes", "rarity", 0.05],
            ["A rare eye", "rarity", 0.2, true],
        ],
    },
];

export const ORRERY_ARMS = ARMS.map((a) => ({ id: a.id, name: a.name }));

// Every node, its id its arm's place times a hundred and its step
export const ORRERY_NODES: OrreryNode[] = ARMS.flatMap((arm, a) => arm.steps.map(([name, effect, value, notable], step) => ({ id: (a + 1) * 100 + step, arm: arm.id, step, name, effect, value, notable })));
export const ORRERY_NODE_BY_ID = new Map(ORRERY_NODES.map((n) => [n.id, n]));

// What a node does, as a line
export function orreryText(n: OrreryNode): string {
    const pct = Math.round(n.value * 100);
    switch (n.effect) {
        case "pay":
            return `${pct}% more tokkul, Void seals, abyssal ashes and pearls from the encounters`;
        case "gold":
            return `${pct}% more gold on the ladder`;
        case "favour":
            return "Choose a host here: its parts drop twice as often";
        case "time":
            return `A rift's time runs ${pct}% longer`;
        case "chest":
            return "A chest more in every rift";
        case "hoard":
            return "A guarded hoard in every rift";
        case "shrine":
            return `A shrine's blessing lasts ${pct}% longer`;
        case "stones":
            return `+${pct}% chance of a riftstone a depth deeper from a guardian`;
        case "shards":
            return `The Heartstone's shards drop ${pct}% more often`;
        case "orbs":
            return `Awakener's orbs drop ${pct}% more often`;
        case "keys":
            return `A pinnacle's key takes ${pct}% less`;
        case "rarity":
            return `${pct}% more rarity on the ladder`;
        case "superior":
            return "Superiors called up twice as often";
    }
}
