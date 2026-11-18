// The keyboard's controls: the defaults (B and I for the pack), every key on one control at most,
// a key set moved off whatever had it, a place cleared, saved bindings read back with what's
// missing or broken left as it was, and keys named as the interface shows them.
import { CONTROLS, CONTROL_IDS, bindKey, controlLabel, controlOf, defaultBindings, keyLabel, readBindings } from "./controls";

describe("the controls", () => {
    it("start with every key on one control at most, the pack on B and I", () => {
        const keys = defaultBindings();
        const all = CONTROL_IDS.flatMap((id) => keys[id]);
        expect(new Set(all).size).toBe(all.length);
        expect(keys.pack).toEqual(["KeyB", "KeyI"]);
        expect(controlOf(keys, "KeyB")).toBe("pack");
        expect(controlOf(keys, "KeyW")).toBe("moveUp");
        expect(controlOf(keys, "KeyC")).toBeUndefined();
        expect(CONTROLS.every((c) => c.name.length > 0 && c.group.length > 0)).toBe(true);
    });

    it("move a key set onto one control off whatever had it, and clear a place", () => {
        let keys = defaultBindings();
        keys = bindKey(keys, "pack", 1, "KeyQ");
        expect(keys.pack).toEqual(["KeyB", "KeyQ"]);
        expect(keys.skill3).toEqual([]);
        expect(controlOf(keys, "KeyQ")).toBe("pack");
        expect(controlOf(keys, "KeyI")).toBeUndefined();
        expect(controlLabel(keys, "skill3")).toBe("unset");
        keys = bindKey(keys, "pack", 0, "");
        expect(keys.pack).toEqual(["KeyQ"]);
        // The defaults weren't touched
        expect(defaultBindings().skill3).toEqual(["KeyQ"]);
    });

    it("read saved bindings back, keeping the defaults for what's missing or broken", () => {
        const saved = { ...defaultBindings(), pack: ["KeyC"], help: "KeyH", map: ["Escape", 5, "KeyM"], tree: ["KeyC"] };
        const keys = readBindings(JSON.parse(JSON.stringify(saved)));
        expect(keys.pack).toEqual(["KeyC"]);
        expect(keys.help).toEqual(defaultBindings().help);
        expect(keys.map).toEqual(["KeyM"]);
        // A key on two controls stays on the first
        expect(keys.tree).toEqual([]);
        expect(readBindings(undefined)).toEqual(defaultBindings());
        expect(readBindings("nonsense")).toEqual(defaultBindings());
    });

    it("name keys as the interface shows them", () => {
        expect(keyLabel("KeyB")).toBe("B");
        expect(keyLabel("Digit1")).toBe("1");
        expect(keyLabel("Numpad4")).toBe("Num 4");
        expect(keyLabel(undefined)).toBe("");
        expect(keyLabel("Space").length).toBeGreaterThan(0);
    });
});
