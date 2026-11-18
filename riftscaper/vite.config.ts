// Riftscaper's page, on the engine (engine/vite.ts has what it needs). Run from the project's root:
// bun run riftscaper. The cache is served from the root's caches/ folder.
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

import {
    ENGINE_EXTENSIONS,
    ENGINE_HEADERS,
    ENGINE_OPTIMIZE_DEPS,
    ENGINE_WORKER_FORMAT,
    enginePlugins,
    engineWorkerPlugins,
} from "../engine/vite";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PROJECT = resolve(HERE, "..");
const CACHES_ROOT = process.env.RIFTSCAPER_CACHES ?? resolve(PROJECT, "caches");

export default defineConfig({
    root: HERE,
    // Relative asset URLs, so a build works wherever it's put
    base: "./",
    // Vite's dependency cache goes by the nearest package.json, which is this folder's (for its
    // own scripts): keep it in the root's node_modules, apart from the other games'
    cacheDir: resolve(PROJECT, "node_modules/.vite-riftscaper"),
    plugins: [react(), ...enginePlugins(CACHES_ROOT)],
    resolve: { extensions: ENGINE_EXTENSIONS },
    optimizeDeps: ENGINE_OPTIMIZE_DEPS,
    server: {
        // Not the other games', so they can all run at once
        port: 5188,
        headers: ENGINE_HEADERS,
        // The engine is beside the game, not in it
        fs: { allow: [PROJECT] },
    },
    preview: { port: 5189, headers: ENGINE_HEADERS },
    worker: {
        format: ENGINE_WORKER_FORMAT,
        plugins: () => engineWorkerPlugins(),
    },
    build: {
        outDir: resolve(HERE, "dist"),
        emptyOutDir: true,
        target: "es2020",
        // No source maps: they'd carry the game's source, comments and all, to anyone who looks
        sourcemap: false,
    },
});
