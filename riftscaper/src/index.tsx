import ReactDOM from "react-dom/client";

import { Bzip2 } from "../../engine/rs/compression/Bzip2";
import { Gzip } from "../../engine/rs/compression/Gzip";
import "../../engine/style/engine.css";
import { App } from "./App";
import { moveOldKeys } from "./client/settings";
import "./ui/ui.css";

Bzip2.initWasm();
Gzip.initWasm();
// Heroes and settings saved while the game was called Runefall, before anything reads them
moveOldKeys();

// Dev only: frames from timers instead of requestAnimationFrame, so the game keeps running in a
// browser pane that isn't painted (automated testing)
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("bgtick")) {
    window.requestAnimationFrame = (callback) =>
        window.setTimeout(() => callback(performance.now()), 16) as unknown as number;
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);
