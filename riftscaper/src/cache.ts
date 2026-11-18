import type { CacheInfo } from "../../engine/rs/cache/CacheInfo";

// Riftscaper only runs on this cache: its content's ids (objs, npcs, seqs, spot animations, locs)
// were looked up in it with the scripts in riftscaper/scripts. The cache is Jagex's: it lives in the
// project's caches/ folder (gitignored), never in the repository.
export const GAME_CACHE_NAME = "osrs-241_2026-09-30";

// The full cache when it's listed (development), or else a slim copy of it (a hosted build)
export function findGameCache(caches: CacheInfo[]): CacheInfo | undefined {
    return (
        caches.find((cache) => cache.name === GAME_CACHE_NAME) ??
        caches.find((cache) => cache.slimOf === GAME_CACHE_NAME)
    );
}
