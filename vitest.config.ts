import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["fake-indexeddb/auto"],
    // Keep Vitest away from the Playwright specs in e2e/.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
