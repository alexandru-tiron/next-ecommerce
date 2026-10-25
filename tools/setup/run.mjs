// `npm run setup`: installs the setup CLI's own dependencies on first use (the Firebase CLI and a prompt library),
// so they never weigh on the store's builds, then starts it. Arguments are passed through, e.g. `npm run setup -- --dry-run`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(dir, "node_modules", "firebase-tools")) || !existsSync(join(dir, "node_modules", "@inquirer", "prompts"))) {
   console.log("Installing the setup tool (once)…");
   const install = spawnSync("npm", ["ci", "--no-fund", "--no-audit"], { cwd: dir, stdio: "inherit", shell: true });
   if (install.status !== 0) process.exit(install.status ?? 1);
}
await import("./index.mjs");
