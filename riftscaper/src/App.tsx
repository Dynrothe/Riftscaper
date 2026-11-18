import { defaultBindings } from "./client/controls";
import { useEffect, useMemo, useRef, useState } from "react";
import WebFont from "webfontloader";

import { RendererCanvas } from "../../engine/components/renderer/RendererCanvas";
import { iconCache } from "../../engine/components/rs/icon/ItemIcon";
import { fetchCacheList, loadCacheFiles } from "../../engine/mapviewer/Caches";
import { MapViewer } from "../../engine/mapviewer/MapViewer";
import { WEBGL } from "../../engine/mapviewer/MapViewerRenderers";
import { RenderDataWorkerPool } from "../../engine/mapviewer/worker/RenderDataWorkerPool";
import { GameWebGLRenderer } from "../../engine/render/GameWebGLRenderer";
import type { DownloadProgress } from "../../engine/rs/cache/CacheFiles";
import { MAP_SQUARE_SIZE } from "../../engine/scaperune/format";
import { formatBytes } from "../../engine/util/BytesUtil";
import { isCoarsePointer } from "../../engine/util/DeviceUtil";
import { GAME_CACHE_NAME, findGameCache } from "./cache";
import { Client } from "./client/Client";
import { Store } from "./client/Store";
import { loadSettings } from "./client/settings";
import { Ui } from "./ui/Ui";
import { CITY_MAP_X, CITY_MAP_Y } from "./world/cityGen";

WebFont.load({ custom: { families: ["OSRS Bold", "OSRS Small"] } });

// Each worker has its own heap, and a phone has little memory to spare for them
const workerPool = RenderDataWorkerPool.create(isCoarsePointer ? 2 : 4);

if (import.meta.hot) {
    // The renderer, workers and a rift can't be swapped out live: any change reloads the page
    import.meta.hot.on("vite:beforeUpdate", () => window.location.reload());
}

// Enough for the camera pulled back as far as it goes
const RENDER_DISTANCE = 72;

type Loaded = { mapViewer: MapViewer; renderer: GameWebGLRenderer };

async function loadViewer(signal: AbortSignal, onProgress: (progress: DownloadProgress) => void): Promise<Loaded> {
    // The cache is shared with the workers in a SharedArrayBuffer, which browsers only allow on a
    // cross-origin isolated page
    if (!window.crossOriginIsolated) {
        throw new Error(
            "This page has to be served with the headers Cross-Origin-Opener-Policy: same-origin " +
                "and Cross-Origin-Embedder-Policy: require-corp.",
        );
    }
    const cacheList = await fetchCacheList();
    if (!cacheList) {
        throw new Error("Couldn't load the cache list (caches/caches.json).");
    }
    const info = findGameCache(cacheList.caches);
    if (!info) {
        throw new Error(`The cache ${GAME_CACHE_NAME} isn't in caches/. Put a copy of it there.`);
    }
    const cache = await loadCacheFiles(info, signal, onProgress);
    const mapImageCache = await caches.open("map-images");

    let renderer!: GameWebGLRenderer;
    const mapViewer = new MapViewer(workerPool, cacheList, [], [], mapImageCache, WEBGL, cache, (viewer) => {
        // Over the city's squares, before any are queued
        viewer.camera.pos[0] = (CITY_MAP_X + 2) * MAP_SQUARE_SIZE;
        viewer.camera.pos[2] = (CITY_MAP_Y + 2) * MAP_SQUARE_SIZE;
        viewer.renderDistance = RENDER_DISTANCE;
        renderer = new GameWebGLRenderer(viewer);
        // Our own ground: colours run across tiles rather than filling each one flat
        renderer.smoothTerrain = true;
        return renderer;
    });
    iconCache.setWorkerPool(workerPool);
    return { mapViewer, renderer };
}

export function App(): JSX.Element {
    const store = useMemo(
        () =>
            new Store({
                screen: "loading",
                loadingText: "Loading the cache",
                loadingProgress: 0,
                titleStep: "heroes",
                heroes: [],
                toasts: [],
                menu: false,
                help: false,
                changelog: false,
                uiSize: loadSettings().uiSize,
                muted: false,
                volume: 0.6,
                combatVolume: 1,
                interfaceVolume: 1,
                keys: defaultBindings(),
                shake: loadSettings().shake,
                smoothing: loadSettings().smoothing ?? !isCoarsePointer,
                deathWait: 0,
            }),
        [],
    );
    const [loaded, setLoaded] = useState<Loaded>();
    const [client, setClient] = useState<Client>();
    const [lost, setLost] = useState(false);
    const overlayRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const abort = new AbortController();
        loadViewer(abort.signal, (progress) => {
            store.set({
                loadingText: `Downloading the cache (${formatBytes(progress.total)})`,
                loadingProgress: Math.round((progress.current / progress.total) * 20),
            });
        })
            .then(setLoaded)
            .catch((e) => {
                console.error(e);
                store.set({ error: e instanceof Error ? e.message : String(e) });
            });
        return () => abort.abort();
    }, [store]);

    useEffect(() => {
        if (!loaded || !overlayRef.current) {
            return;
        }
        let disposed = false;
        let created: Client | undefined;
        // The renderer draws through the client from the first frame of the title on
        Client.create(loaded.mapViewer, loaded.renderer, overlayRef.current, store)
            .then((c) => {
                if (disposed) {
                    c.dispose();
                    return;
                }
                created = c;
                loaded.renderer.game = c;
                setClient(c);
                if (import.meta.env.DEV) {
                    (window as unknown as { game: Client }).game = c;
                }
            })
            .catch((e) => {
                console.error(e);
                store.set({ error: e instanceof Error ? e.message : String(e) });
            });
        return () => {
            disposed = true;
            created?.dispose();
        };
    }, [loaded, store]);

    // A lost WebGL context isn't coming back: everything on the GPU would have to be made again
    useEffect(() => {
        const renderer = loaded?.renderer;
        const canvas = renderer?.canvas;
        const onLost = (e: Event) => {
            e.preventDefault();
            renderer!.contextLost = true;
            client?.save();
            setLost(true);
        };
        canvas?.addEventListener("webglcontextlost", onLost);
        return () => canvas?.removeEventListener("webglcontextlost", onLost);
    }, [loaded, client]);

    return (
        <div className="game-root">
            {loaded && <RendererCanvas renderer={loaded.renderer} />}
            <canvas className="game-overlay" ref={overlayRef} />
            {lost ? (
                <div className="game-status">
                    <p>Your device took the game's graphics away. Your hero is saved: reload to carry on.</p>
                    <button className="ui-button" onClick={() => window.location.reload()}>
                        Reload
                    </button>
                </div>
            ) : (
                <Ui store={store} client={client} />
            )}
        </div>
    );
}
