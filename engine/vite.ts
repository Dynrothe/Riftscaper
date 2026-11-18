// What a Vite config needs to build a game on the engine: its plugins, how it resolves files,
// the dependencies its workers import, and the headers its shared memory needs. A game's
// vite.config.ts spreads these into its own (see the repository's for an example).
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve, sep } from "node:path";
import type { Connect, Plugin } from "vite";

const MIME_TYPES: Record<string, string> = {
    ".dat": "application/octet-stream",
    ".dat2": "application/octet-stream",
    ".json": "application/json",
    ".png": "image/png",
    ".wasm": "application/wasm",
    ".zip": "application/zip",
};

function mimeFor(filePath: string): string {
    const dot = filePath.lastIndexOf(".");
    if (dot === -1) {
        return "application/octet-stream";
    }
    return MIME_TYPES[filePath.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

// Replicates ts-shader-loader: resolves `#include "./path";` directives in
// .glsl files and returns the resulting source as a string module.
export function glslIncludesPlugin(): Plugin {
    const includeRegex = /^[ \t]*#include\s+"([^"]+)"\s*;?[ \t]*$/gm;

    return {
        name: "glsl-includes",
        enforce: "pre",
        load(id) {
            if (!/\.glsl($|\?)/.test(id)) {
                return null;
            }
            const filePath = id.replace(/\?.*$/, "");

            const resolveIncludes = (file: string, source: string): string =>
                source.replace(includeRegex, (_match, relPath: string) => {
                    const incPath = resolve(dirname(file), relPath);
                    this.addWatchFile(incPath);
                    return resolveIncludes(incPath, readFileSync(incPath, "utf8"));
                });

            const resolved = resolveIncludes(filePath, readFileSync(filePath, "utf8"));
            return `export default ${JSON.stringify(resolved)};`;
        },
    };
}

// Serves the gitignored caches folder (cachesRoot) at `/caches` during dev and
// `vite preview`, matching the previous craco devServer express.static middleware.
// `vite preview` serves the build's slim cache instead once `bun run slim-cache`
// has written one to dist/caches.
export function serveCachesPlugin(cachesRoot: string): Plugin {
    const serveCaches = (middlewares: Connect.Server, root: string) => {
        middlewares.use("/caches", (req, res) => {
            // The game asks for caches.json?build=<its build>
            const reqUrl = decodeURIComponent((req.url ?? "").replace(/^\//, "").split("?")[0]);
            const filePath = normalize(join(root, reqUrl));
            const rel = relative(root, filePath);
            if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
                res.statusCode = 403;
                res.end();
                return;
            }
            const notFound = () => {
                res.statusCode = 404;
                res.end();
            };
            try {
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    notFound();
                    return;
                }
                res.setHeader("Content-Type", mimeFor(filePath));
                res.setHeader("Cache-Control", "no-cache");
                createReadStream(filePath).on("error", notFound).pipe(res);
            } catch {
                notFound();
            }
        });
    };

    return {
        name: "serve-caches",
        configureServer(server) {
            serveCaches(server.middlewares, cachesRoot);
        },
        // Without this, `vite preview` answers /caches/* with the SPA's index.html.
        configurePreviewServer(server) {
            const { root, build } = server.config;
            const slimRoot = resolve(root, build.outDir, "caches");
            serveCaches(server.middlewares, existsSync(slimRoot) ? slimRoot : cachesRoot);
        },
    };
}

// Routes bare `.wasm` imports (e.g. the Emscripten `require("./module.wasm")`
// hack inside @foxglove/wasm-bz2) through Vite's `?url` asset handling so they
// resolve to an asset URL string, matching webpack's behaviour. Imports that
// already carry a query (e.g. `*.wasm?url`) are left untouched.
export function wasmAssetUrlPlugin(): Plugin {
    return {
        name: "wasm-asset-url",
        enforce: "pre",
        async resolveId(source, importer, options) {
            if (!source.endsWith(".wasm") || source.includes("?")) {
                return null;
            }
            const resolution = await this.resolve(source, importer, {
                ...options,
                skipSelf: true,
            });
            if (!resolution) {
                return null;
            }
            return { ...resolution, id: `${resolution.id}?url` };
        },
    };
}

// wasm-gzip's script ends with a `sourceMappingURL` comment for a map the
// package doesn't ship, so the dev server warns about it. Serves the script
// without the comment (Vite only looks for a source map when no plugin loads it).
export function wasmGzipNoSourceMapPlugin(): Plugin {
    return {
        name: "wasm-gzip-no-source-map",
        apply: "serve",
        load(id) {
            if (!/[\\/]wasm-gzip[\\/]wasm_gzip\.js($|\?)/.test(id)) {
                return null;
            }
            const source = readFileSync(id.replace(/\?.*$/, ""), "utf8");
            return source.replace(/\r?\n\/\/# sourceMappingURL=\S+\s*$/, "\n");
        },
    };
}

// The engine's plugins for the page, in this order, serving the cache from cachesRoot
export function enginePlugins(cachesRoot: string): Plugin[] {
    return [
        glslIncludesPlugin(),
        serveCachesPlugin(cachesRoot),
        wasmAssetUrlPlugin(),
        wasmGzipNoSourceMapPlugin(),
    ];
}

// And for its workers' bundles, which don't get a config's plugins: the render
// worker imports @foxglove/wasm-bz2 too
export function engineWorkerPlugins(): Plugin[] {
    return [wasmAssetUrlPlugin()];
}

// ".web.*" takes precedence so browser-specific variants (e.g. Gzip.web.ts)
// resolve the same way they did under CRA's webpack config.
export const ENGINE_EXTENSIONS = [
    ".web.ts",
    ".web.tsx",
    ".web.js",
    ".mjs",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".json",
];

export const ENGINE_OPTIMIZE_DEPS = {
    // Only the render worker imports these, and the startup scan doesn't
    // follow workers. Found mid-load instead, they made Vite reload the page.
    include: ["threads/worker", "jszip"],
    // wasm-gzip finds its .wasm via `new URL(..., import.meta.url)`, which
    // breaks once the dep optimizer moves it into node_modules/.vite.
    exclude: ["wasm-gzip"],
};

// Required for SharedArrayBuffer / multi-threaded workers.
export const ENGINE_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
};

// The render data worker is spawned with `{ type: "module" }` and its
// bundle code-splits (Bzip2 dynamically imports @foxglove/wasm-bz2),
// which the default "iife" format can't express.
export const ENGINE_WORKER_FORMAT = "es";
