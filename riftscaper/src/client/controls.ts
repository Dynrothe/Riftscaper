// The keyboard's controls, and what the player has set them to (Menu, Controls). Each control has
// up to two keys, as Path of Exile's have a primary and a secondary; a key is on one control at
// most. Escape is always the menu's, and the mouse's buttons are always the bar's first two, so
// there's always a way back. Never rename a control's id: saved settings keep keys under them.

export type ControlId =
    | "moveUp"
    | "moveDown"
    | "moveLeft"
    | "moveRight"
    | "stand"
    | "skill3"
    | "skill4"
    | "skill5"
    | "skill6"
    | "lifeFlask"
    | "manaFlask"
    | "potion3"
    | "potion4"
    | "pickUp"
    | "pack"
    | "tree"
    | "map"
    | "teleport"
    | "labels"
    | "help";

export type ControlDef = { id: ControlId; name: string; group: string; keys: string[] };

export const KEYS_PER_CONTROL = 2;

export const CONTROLS: ControlDef[] = [
    { id: "moveUp", name: "Walk up", group: "Moving", keys: ["KeyW", "ArrowUp"] },
    { id: "moveDown", name: "Walk down", group: "Moving", keys: ["KeyS", "ArrowDown"] },
    { id: "moveLeft", name: "Walk left", group: "Moving", keys: ["KeyA", "ArrowLeft"] },
    { id: "moveRight", name: "Walk right", group: "Moving", keys: ["KeyD", "ArrowRight"] },
    { id: "stand", name: "Stand still to attack", group: "Moving", keys: ["ShiftLeft", "ShiftRight"] },
    { id: "skill3", name: "Skill 3", group: "Fighting", keys: ["KeyQ"] },
    { id: "skill4", name: "Skill 4", group: "Fighting", keys: ["KeyE"] },
    { id: "skill5", name: "Skill 5", group: "Fighting", keys: ["KeyR"] },
    { id: "skill6", name: "Skill 6", group: "Fighting", keys: ["KeyF"] },
    { id: "lifeFlask", name: "Potion 1 (life)", group: "Fighting", keys: ["Digit1"] },
    { id: "manaFlask", name: "Potion 2 (mana)", group: "Fighting", keys: ["Digit2"] },
    { id: "potion3", name: "Potion 3", group: "Fighting", keys: ["Digit3"] },
    { id: "potion4", name: "Potion 4", group: "Fighting", keys: ["Digit4"] },
    { id: "pickUp", name: "Pick up the nearest loot", group: "Fighting", keys: ["Space"] },
    { id: "pack", name: "Pack", group: "Windows", keys: ["KeyB", "KeyI"] },
    { id: "tree", name: "Passive tree", group: "Windows", keys: ["KeyP"] },
    { id: "map", name: "Overlay map", group: "Windows", keys: ["Tab"] },
    { id: "teleport", name: "Teleport home", group: "Windows", keys: ["KeyT"] },
    { id: "labels", name: "Loot names on the ground", group: "Windows", keys: ["KeyZ"] },
    { id: "help", name: "How to play", group: "Windows", keys: ["KeyH"] },
];

export const CONTROL_IDS = CONTROLS.map((c) => c.id);
export const SKILL_CONTROLS: ControlId[] = ["skill3", "skill4", "skill5", "skill6"];

export type KeyBindings = Record<ControlId, string[]>;

// Keys that can't be set: the menu's, and those the browser keeps for itself
export const RESERVED_KEYS = new Set(["Escape", "F5", "F11", "F12", "MetaLeft", "MetaRight", "ContextMenu"]);

export function defaultBindings(): KeyBindings {
    return Object.fromEntries(CONTROLS.map((c) => [c.id, [...c.keys]])) as KeyBindings;
}

// Bindings from saved settings: what's missing or unreadable is its default's, and a key on two
// controls is kept on the first
export function readBindings(raw: unknown): KeyBindings {
    const out = defaultBindings();
    if (!raw || typeof raw !== "object") {
        return out;
    }
    const saved = raw as Record<string, unknown>;
    const used = new Set<string>();
    for (const c of CONTROLS) {
        const keys = saved[c.id];
        if (!Array.isArray(keys)) {
            continue;
        }
        out[c.id] = keys.filter((k): k is string => typeof k === "string" && k.length > 0 && !RESERVED_KEYS.has(k)).slice(0, KEYS_PER_CONTROL);
    }
    for (const c of CONTROLS) {
        out[c.id] = out[c.id].filter((k) => {
            if (used.has(k)) {
                return false;
            }
            used.add(k);
            return true;
        });
    }
    return out;
}

// A key set on a control, in one of its two places: taken off whatever had it first. An empty
// key clears the place.
export function bindKey(bindings: KeyBindings, id: ControlId, place: number, code: string): KeyBindings {
    const out = { ...bindings };
    if (code) {
        for (const c of CONTROL_IDS) {
            if (out[c].includes(code)) {
                out[c] = out[c].filter((k) => k !== code);
            }
        }
    }
    const keys = [...out[id]];
    if (code) {
        keys[Math.min(place, keys.length)] = code;
    } else {
        keys.splice(place, 1);
    }
    out[id] = keys.filter((k) => !!k).slice(0, KEYS_PER_CONTROL);
    return out;
}

// The control a key is on, if any
export function controlOf(bindings: KeyBindings, code: string): ControlId | undefined {
    return CONTROL_IDS.find((id) => bindings[id].includes(code));
}

const NAMED: Record<string, string> = {
    Space: "Space",
    Tab: "Tab",
    Enter: "Enter",
    Backspace: "Backspace",
    ShiftLeft: "Shift",
    ShiftRight: "Right Shift",
    ControlLeft: "Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt Gr",
    CapsLock: "Caps Lock",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Insert: "Insert",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "Page Up",
    PageDown: "Page Down",
};

// A key's name as it's printed on it
export function keyLabel(code: string | undefined): string {
    if (!code) {
        return "";
    }
    if (NAMED[code]) {
        return NAMED[code];
    }
    if (code.startsWith("Key")) {
        return code.slice(3);
    }
    if (code.startsWith("Digit")) {
        return code.slice(5);
    }
    if (code.startsWith("Numpad")) {
        return `Num ${code.slice(6)}`;
    }
    return code;
}

// A control's keys as the interface shows them: its first, or "unset"
export function controlLabel(bindings: KeyBindings, id: ControlId): string {
    return keyLabel(bindings[id][0]) || "unset";
}
