import { defineConfig } from "vitest/config";

// Security rules tests. They need the Firestore and Storage emulators, so run them with `npm run test:rules`.
export default defineConfig({
   test: {
      include: ["tests/rules/**/*.test.ts"],
      environment: "node",
      // Both files talk to the same emulators
      fileParallelism: false,
      testTimeout: 20000,
      hookTimeout: 30000,
   },
});
