// Pieces of the OSRS client's own interface, drawn from the cache's sprites: the close button,
// the side panel's tab icons and its red selected stone, the worn equipment's slot shapes, and
// the minimap's orbs (frame, fill and icon), so the screens look like the client they're set in.
// Sprites are kept at their own size and drawn at whole multiples of it, so their pixels stay
// crisp. A sprite the cache hasn't got draws nothing, or what's given in its place.
import { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useState } from "react";

import { ItemIcon, iconCache } from "../../../engine/components/rs/icon/ItemIcon";
import type { SkillIcon } from "../content/gems";
import { SPRITE } from "./sprites";

export { SLOT_SPRITE, SLOT_TILE, SPRITE } from "./sprites";

// A sprite's picture as a data URL: undefined while it's drawn, "" if the cache hasn't got it
export function useSprite(id: number): string | undefined {
    const [state, setState] = useState(() => ({ id, url: iconCache.getFrame(id, 0) }));
    useEffect(() => {
        let cancelled = false;
        iconCache.requestFrame(id, 0, (url) => {
            if (!cancelled) {
                setState({ id, url });
            }
        });
        return () => {
            cancelled = true;
        };
    }, [id]);
    return state.id === id ? state.url : iconCache.getFrame(id, 0);
}

// Several sprites' pictures at once, by id: one not drawn yet (or that the cache hasn't got) is
// missing
export function useSprites(ids: readonly number[]): Record<number, string> {
    const key = ids.join(",");
    const [urls, setUrls] = useState<Record<number, string>>(() => {
        const known: Record<number, string> = {};
        for (const id of ids) {
            const url = iconCache.getFrame(id, 0);
            if (url) {
                known[id] = url;
            }
        }
        return known;
    });
    useEffect(() => {
        let cancelled = false;
        for (const id of ids) {
            iconCache.requestFrame(id, 0, (url) => {
                if (!cancelled && url) {
                    setUrls((known) => (known[id] === url ? known : { ...known, [id]: url }));
                }
            });
        }
        return () => {
            cancelled = true;
        };
        // The ids, by what they are rather than the array they came in
    }, [key]);
    return urls;
}

type SpriteProps ={ id: number; scale?: number; className?: string; style?: CSSProperties; fallback?: ReactNode };

// A sprite at its own size, or a whole multiple of it
export function Sprite({ id, scale = 1, className, style, fallback }: SpriteProps): JSX.Element | null {
    const url = useSprite(id);
    if (url === "") {
        return <>{fallback ?? null}</>;
    }
    if (!url) {
        return null;
    }
    return <img className={`ui-icon ${className ?? ""}`} src={url} alt="" draggable={false} style={scale === 1 ? style : { ...style, zoom: scale }} />;
}

// A skill's picture in an item icon's box (36 by 32, at the size asked): its item's icon, or its
// spell's or prayer's sprite at its own size in the middle, made smaller only if it doesn't fit
export function SkillPic({ icon, size = 32 }: { icon: SkillIcon; size?: number }): JSX.Element {
    if ("obj" in icon) {
        return <ItemIcon objId={icon.obj} size={size} />;
    }
    return (
        <span className={`skill-pic ${size < 30 ? "small" : ""}`} style={{ width: Math.round((size * 36) / 32), height: size }}>
            <Sprite id={icon.sprite} />
        </span>
    );
}

// The client's close button: a dark stone square with an X, lit under the mouse
export function CloseButton({ onClick, title = "Close" }: { onClick: () => void; title?: string }): JSX.Element {
    return (
        <button className="rs-close" data-tip={title} aria-label={title} onClick={onClick}>
            <Sprite id={SPRITE.close} className="rs-close-idle" fallback={<span className="rs-close-x" />} />
            <Sprite id={SPRITE.closeHover} className="rs-close-lit" />
        </button>
    );
}

// An interface's title along its top, with the close button at its right; held, it moves a panel
// that can be moved (Ui.tsx useMovable)
type PanelHeadProps = { title: ReactNode; onClose?: () => void; onGrab?: (e: ReactPointerEvent) => void; children?: ReactNode };

export function PanelHead({ title, onClose, onGrab, children }: PanelHeadProps): JSX.Element {
    return (
        <div className={`panel-head ${onGrab ? "grab" : ""}`} onPointerDown={onGrab}>
            <span className="panel-title">{title}</span>
            {children}
            {onClose && <CloseButton onClick={onClose} />}
        </div>
    );
}

// The minimap's orb, twice its size: the frame, the orb filled from the bottom, its icon, and
// the number on the frame's plate, green when full and red when low, as the client colours it.
// The mana orb's frame is turned round, so both plates face outwards.
// A ward over life (a potion's, content/potions.ts) is a pale veil over the orb, as high as its share.
export function Orb({ kind, value, max, ward = 0 }: { kind: "life" | "mana"; value: number; max: number; ward?: number }): JSX.Element {
    const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    const warded = max > 0 ? Math.max(0, Math.min(1, ward / max)) : 0;
    return (
        <div className={`rs-orb ${kind}`} data-tip={`${kind === "life" ? "Life" : "Mana"}: ${value} / ${max}${ward > 0 ? `\nWard: ${ward}` : ""}`}>
            <Sprite id={SPRITE.orbFrame} scale={2} className="rs-orb-frame" />
            <div className="rs-orb-ball">
                <Sprite id={SPRITE.orbEmpty} scale={2} />
                <div className="rs-orb-fill" style={{ height: `${share * 100}%` }}>
                    <Sprite id={kind === "life" ? SPRITE.orbLife : SPRITE.orbMana} scale={2} />
                </div>
                {warded > 0 && <div className="rs-orb-ward" style={{ height: `${warded * 100}%` }} />}
                <Sprite id={kind === "life" ? SPRITE.orbHeart : SPRITE.orbStar} scale={2} className="rs-orb-icon" />
            </div>
            <div className="rs-orb-value" style={{ color: orbColor(share) }}>
                {value}
            </div>
        </div>
    );
}

// The client's orb number: green, through yellow, to red
function orbColor(share: number): string {
    const red = Math.round(255 * Math.min(1, 2 * (1 - share)));
    const green = Math.round(255 * Math.min(1, 2 * share));
    return `rgb(${red}, ${green}, 0)`;
}

// A stack's number as the client writes it: as it is, then K from 100,000 (white) and M from
// ten million (green)
export function stackText(n: number): { text: string; color: string } {
    if (n >= 10_000_000) {
        return { text: `${Math.floor(n / 1_000_000)}M`, color: "#00ff80" };
    }
    if (n >= 100_000) {
        return { text: `${Math.floor(n / 1000)}K`, color: "#ffffff" };
    }
    return { text: `${n}`, color: "#ffff00" };
}
