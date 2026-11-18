// Riftscaper's cache, loaded in Node for the scripts beside this one. Run them from the project's
// root, where caches/ is: bun run tsx riftscaper/scripts/check-content.ts
import fs from "fs";

import type { LoadedCache, XteaMap } from "../../engine/mapviewer/Caches";
import { buildRegionData } from "../../engine/mapviewer/worker/RegionDataLoader";
import type { RegionData, RegionDataInput } from "../../engine/mapviewer/worker/RegionData";
import { CacheFiles } from "../../engine/rs/cache/CacheFiles";
import type { CacheInfo } from "../../engine/rs/cache/CacheInfo";
import { CacheSystem } from "../../engine/rs/cache/CacheSystem";
import { detectCacheType } from "../../engine/rs/cache/CacheType";
import { getCacheLoaderFactory } from "../../engine/rs/cache/loader/CacheLoaderFactory";
import { LocModelLoader } from "../../engine/rs/config/loctype/LocModelLoader";
import { VarManager } from "../../engine/rs/config/vartype/VarManager";
import { SceneBuilder } from "../../engine/rs/scene/SceneBuilder";
import type { MapRecipe } from "../../engine/scaperune/recipe";
import { installRecipeInSceneBuilder } from "../../engine/scaperune/squares";
import { GAME_CACHE_NAME } from "../src/cache";

const CACHES = "./caches/";

export function loadGameCache(): LoadedCache {
    const infos: CacheInfo[] = JSON.parse(fs.readFileSync(CACHES + "caches.json", "utf8"));
    const info = infos.find((c) => c.name === GAME_CACHE_NAME);
    if (!info) {
        throw new Error(`Cache ${GAME_CACHE_NAME} isn't in caches/caches.json`);
    }
    const path = CACHES + info.name + "/";
    const files = new Map<string, ArrayBuffer>();
    for (const name of fs.readdirSync(path)) {
        const buffer = fs.readFileSync(path + name);
        files.set(name, buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    }
    const keys: Record<string, number[]> = JSON.parse(fs.readFileSync(path + "keys.json", "utf8"));
    const xteas: XteaMap = new Map(Object.keys(keys).map((key) => [parseInt(key), keys[key]]));
    return { info, type: detectCacheType(info), files: new CacheFiles(files), xteas };
}

export function getFactory(cache: LoadedCache) {
    return getCacheLoaderFactory(cache.info, CacheSystem.fromFiles(cache.type, cache.files));
}

// An arena's collision and heights, as the render workers build them, on a ScapeRune map if given
export function loadRegion(cache: LoadedCache, input: RegionDataInput, recipe?: MapRecipe): RegionData {
    const factory = getFactory(cache);
    const locTypeLoader = factory.getLocTypeLoader();
    const sceneBuilder = new SceneBuilder(
        cache.info,
        factory.getMapFileLoader(),
        factory.getUnderlayTypeLoader(),
        factory.getOverlayTypeLoader(),
        locTypeLoader,
        new LocModelLoader(
            locTypeLoader,
            factory.getModelLoader(),
            factory.getTextureLoader(),
            factory.getSeqTypeLoader(),
            factory.getSeqFrameLoader(),
            factory.getSkeletalSeqLoader(),
        ),
        cache.xteas,
    );
    installRecipeInSceneBuilder(sceneBuilder, recipe);
    const varManager = new VarManager(factory.getVarBitTypeLoader());
    const quests = factory.getQuestTypeLoader();
    if (quests) {
        varManager.setQuestsCompleted(quests);
    }
    return buildRegionData(sceneBuilder, varManager, input);
}
