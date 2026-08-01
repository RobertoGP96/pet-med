import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    // Sólo se testea la lógica pura de dominio: no necesita DOM ni red.
    include: ["src/domain/**/*.test.ts", "src/lib/**/*.test.ts", "src/services/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
