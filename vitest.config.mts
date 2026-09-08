import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const serverOnlyStub = fileURLToPath(
  new URL("./firebase/__tests__/stubs/server-only.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@": srcDir,
      // Server modules pull in `server-only`, which throws outside an RSC bundle.
      "server-only": serverOnlyStub,
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "firebase",
          environment: "node",
          globals: true,
          include: ["firebase/__tests__/**/*.test.ts"],
          setupFiles: ["firebase/__tests__/setup.ts"],
          // One emulator set, shared state — run serially.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
