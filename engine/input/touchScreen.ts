// What a game on a touch screen needs from the page, whatever its controls
import { isCoarsePointer } from "../util/DeviceUtil";
import { SharedTaps } from "./TouchStick";

// How long after clicking a tap by hand the browser's own click for it is
// ignored, for any browser that does make one
const OWN_CLICK_MS = 400;

// Clicks the taps a browser won't, as a second finger's (see SharedTaps), so a
// button can be pressed with the thumb still on the stick
function clickSharedTaps(): void {
    const taps = new SharedTaps<EventTarget>();
    let clickedAt = -Infinity;
    const isTouch = (event: PointerEvent) => event.pointerType === "touch" && event.target;
    window.addEventListener(
        "pointerdown",
        (event) => {
            if (isTouch(event)) {
                taps.down(event.pointerId, event.target!, event.clientX, event.clientY);
            }
        },
        true,
    );
    window.addEventListener("pointerup", (event) => {
        if (isTouch(event)) {
            const tapped = taps.up(event.pointerId, event.target!, event.clientX, event.clientY);
            if (tapped instanceof HTMLElement) {
                clickedAt = performance.now();
                tapped.click();
            }
        }
    });
    window.addEventListener("pointercancel", (event) => taps.cancel(event.pointerId));
    window.addEventListener(
        "click",
        (event) => {
            if (event.isTrusted && performance.now() - clickedAt < OWN_CLICK_MS) {
                event.stopPropagation();
                event.preventDefault();
            }
        },
        true,
    );
}

// Phones and tablets: no pinch or long press menu over the game, and taps a
// second finger makes are clicked (clickSharedTaps). iOS ignores the viewport's
// zoom settings and needs telling. Once, as the page starts; nothing on a mouse.
let setUp = false;
export function setUpTouchScreen(): void {
    if (!isCoarsePointer || setUp) {
        return;
    }
    setUp = true;
    const prevent = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", prevent);
    document.addEventListener("contextmenu", prevent);
    clickSharedTaps();
}

// Opened from the home screen, the web app manifest has already done this
const INSTALLED_QUERY = "(display-mode: fullscreen), (display-mode: standalone)";

// Full screen and held sideways where the browser allows it (Android's does,
// an iPhone's doesn't). Has to be called from a tap.
export function enterFullscreen(): void {
    const page = document.documentElement;
    if (
        !isCoarsePointer ||
        document.fullscreenElement ||
        !page.requestFullscreen ||
        window.matchMedia(INSTALLED_QUERY).matches
    ) {
        return;
    }
    page.requestFullscreen({ navigationUI: "hide" })
        .then(() =>
            (screen.orientation as unknown as { lock(type: string): Promise<void> }).lock(
                "landscape",
            ),
        )
        .catch(() => {});
}
