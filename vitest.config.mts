import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reportsDirectory: "artifacts/coverage",
      reporter: ["text", "json", "html"],
    },
    include: ["tests/**/*.test.{ts,mts,mjs}"],
    outputFile: {
      junit: ".omo/evidence/todo-1/vitest-junit.xml",
    },
  },
});
