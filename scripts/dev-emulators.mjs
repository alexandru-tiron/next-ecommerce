// Starts `next dev` against the local Firebase emulators (start them first with `npm run emulators`).
// A small script instead of an inline VAR=value so it works in every shell, Windows included.
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
   stdio: "inherit",
   shell: true,
   env: { ...process.env, NEXT_PUBLIC_USE_EMULATORS: "true" },
});
child.on("exit", (code) => process.exit(code ?? 0));
