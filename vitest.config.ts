// The tests of the engine and Riftscaper, run together: bun run test
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

import { ENGINE_EXTENSIONS, enginePlugins } from "./engine/vite";

export default defineConfig({
    plugins: [...enginePlugins(resolve(process.cwd(), "caches"))],
    resolve: { extensions: ENGINE_EXTENSIONS },
    test: {
        include: ["engine/**/*.test.{ts,tsx}", "riftscaper/**/*.test.{ts,tsx}"],
        // Game logic needs no DOM; a UI test opts in with `// @vitest-environment jsdom`
        environment: "node",
        globals: true,
        setupFiles: ["riftscaper/src/setupTests.ts"],
        passWithNoTests: true,
    },
});
