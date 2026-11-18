// Says whether a block of map squares is free: none of them in the cache, so a generated world can
// go there. Other games' recipes aren't in the cache, so check their mapX and mapY by hand too.
//
//   bun run tsx riftscaper/scripts/free-squares.ts <mapX> <mapY> <squaresX> <squaresY>
import { getFactory, loadGameCache } from "./cacheUtil";

const [mapX, mapY, sx, sy] = process.argv.slice(2).map(Number);
const index = getFactory(loadGameCache()).getMapFileLoader().mapFileIndex;
const used: string[] = [];
for (let x = mapX; x < mapX + sx; x++) {
    for (let y = mapY; y < mapY + sy; y++) {
        if (index.getTerrainArchiveId(x, y) !== -1) {
            used.push(`${x},${y}`);
        }
    }
}
console.log(used.length === 0 ? "free" : `in the cache: ${used.join(" ")}`);
