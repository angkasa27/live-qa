import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // `server-only` throws outside Next; tests run in plain node, so point it at a no-op.
    alias: { "server-only": "./tests/stubs/server-only.ts" },
  },
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    setupFiles: "./tests/setup.ts",
    // Both integration files share the local database; concurrent truncates deadlock.
    fileParallelism: false,
  },
});
