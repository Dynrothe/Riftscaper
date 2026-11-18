// How big the interface is drawn. It's laid out for a window about 720 pixels tall (and 1150
// wide); a bigger window draws it bigger, up to UI_MAX_SCALE, so it isn't lost on a large screen
// (2 on a 1440p monitor). The player's interface size setting goes on top. The same scale is used
// for the HTML (CSS zoom, --ui-scale) and for what's drawn on the overlay canvas, so they match.
const UI_BASE_HEIGHT = 720;
const UI_BASE_WIDTH = 1150;
const UI_MAX_SCALE = 2.5;

// size: the player's setting, 1 as it fits the window
export function uiScale(size: number): number {
    const fit = Math.min(window.innerHeight / UI_BASE_HEIGHT, window.innerWidth / UI_BASE_WIDTH);
    const scale = Math.min(UI_MAX_SCALE, Math.max(1, fit)) * size;
    // In twentieths, so a small resize doesn't lay everything out again
    return Math.round(scale * 20) / 20;
}
