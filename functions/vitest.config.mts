import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The shared rules in packages/core are tested from the repository root; these are the functions' own tests
export default defineConfig({
   resolve: {
      alias: { "@core": fileURLToPath(new URL("../packages/core/src", import.meta.url)) },
   },
   test: {
      include: ["test/**/*.test.{ts,tsx}"],
      environment: "node",
   },
});
