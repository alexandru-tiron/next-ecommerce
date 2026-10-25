// Bundles the functions into lib/index.js, including the shared business rules in packages/core.
// npm packages stay external: Cloud Functions installs them from package.json when deploying.
// `node build.mjs --watch` rebuilds on every change (for the emulator).
import { build, context } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies).flatMap((name) => [name, `${name}/*`]);

const options = {
   entryPoints: ["src/index.ts"],
   bundle: true,
   platform: "node",
   target: "node22",
   format: "cjs",
   outfile: "lib/index.js",
   sourcemap: true,
   // The e-mail templates (src/emails) are React components
   jsx: "automatic",
   external,
   logLevel: "warning",
};

if (process.argv.includes("--watch")) {
   await (await context(options)).watch();
} else {
   await build(options);
}
