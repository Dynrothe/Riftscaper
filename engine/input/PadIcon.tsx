import { useSyncExternalStore } from "react";

import { PadButton, PadKind, padHints } from "./GamePad";

// The controller in use, while the player's on it (and its buttons work)
export function usePadKind(): PadKind | undefined {
    return useSyncExternalStore(padHints.subscribe, padHints.get);
}

// Kenney's Input Prompts (CC0, ./input-prompts), named by GamePad's buttons, and
// "move" for the left stick. A pad of another make has Xbox's, as it has
// Xbox's labels. They're in the bundle as data URLs rather than files beside
// it: Run Escape's desktop launcher 1.0.0 serves .svg files with no image type, so
// an <img> of one draws nothing there, and players keep their launcher. Vite
// makes the data URLs (?inline), keyed here as "xbox/south".
const ICON_DIR = "./input-prompts/";
export const PAD_ICONS: Record<string, string> = Object.fromEntries(
    Object.entries(
        import.meta.glob<string>("./input-prompts/*/*.svg", {
            query: "?inline",
            import: "default",
            eager: true,
        }),
    ).map(([file, url]) => [file.slice(ICON_DIR.length, -".svg".length), url]),
);

// A button's icon as the pad in use draws it, sized and placed by the game's CSS
export function PadIcon({
    kind,
    icon,
    label,
    className = "ui-pad-icon",
}: {
    kind: PadKind;
    icon: PadButton | "move";
    label: string;
    className?: string;
}): JSX.Element {
    const folder = kind === "generic" ? "xbox" : kind;
    return (
        <img
            className={className}
            src={PAD_ICONS[`${folder}/${icon}`]}
            alt={label}
            title={label}
            draggable={false}
        />
    );
}
