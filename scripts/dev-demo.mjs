// npm run dev:demo: the whole store on your computer, with no Firebase account. Starts the Firebase emulators,
// fills them with the demo catalogue, orders and an admin account, then runs the store against them at http://localhost:3000.
// Ctrl+C stops everything; the demo data is gone afterwards.
//   npm run dev:demo                    the store, set up, with the admin account printed below
//   npm run dev:demo -- --setup-link    a store that isn't set up yet, to try the setup wizard
// Needs Node 20+ and Java 11+ (for the Firestore emulator).
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const fail = (message) => {
   console.error(`\n${message}\n`);
   process.exit(1);
};

if (spawnSync("java", ["-version"], { stdio: "ignore", shell: true }).status !== 0) {
   fail("The Firebase emulators need Java 11 or newer. Install it (for example from https://adoptium.net) and run this again.");
}

// The functions emulator reads secrets from this file; placeholders are enough, since e-mails and search sync are skipped
if (!existsSync("functions/.secret.local")) copyFileSync("functions/.secret.local.example", "functions/.secret.local");

console.log("Building the Cloud Functions…");
const build = spawnSync("npm", ["--prefix", "functions", "run", "build"], { stdio: "inherit", shell: true });
if (build.status !== 0) fail("The functions didn't build; see the errors above.");

const seedArgs = ["--with-orders", "--admin-email", "admin@example.com", ...(process.argv.includes("--setup-link") ? ["--setup-link"] : [])];
const command = `node scripts/seed-demo/seed.mjs ${seedArgs.join(" ")} && node scripts/dev-emulators.mjs`;
const child = spawn("npx", ["--yes", "firebase-tools@14", "emulators:exec", "--only", "auth,firestore,storage,functions", "--project", "demo-store", `"${command}"`], {
   stdio: "inherit",
   shell: true,
});
child.on("exit", (code) => process.exit(code ?? 0));
