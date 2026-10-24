import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
   resolve: {
      alias: {
         "@": fileURLToPath(new URL("./src", import.meta.url)),
         "@core": fileURLToPath(new URL("./packages/core/src", import.meta.url)),
      },
   },
   test: {
      include: ["src/**/*.test.ts", "packages/core/src/**/*.test.ts"],
      environment: "node",
   },
});
