// Everything the setup CLI does to the outside world goes through here, so --dry-run can print it instead:
// Firebase CLI commands, Google API calls (with the Firebase CLI's sign-in) and file writes.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const toolDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const repoRoot = join(toolDir, "..", "..");
const firebaseBin = join(toolDir, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
export const bold = color(1);
export const dim = color(2);
export const green = color(32);
export const yellow = color(33);
export const red = color(31);

export const say = (text = "") => console.log(text);
export const ok = (text) => console.log(`${green("✔")} ${text}`);
export const warn = (text) => console.log(`${yellow("!")} ${text}`);
export const planned = (text) => console.log(`${dim("[dry run]")} ${text}`);

export function createIO({ dryRun, project }) {
   // A Firebase CLI command. json: parse the --json result; interactive: let the command ask the person directly.
   function firebase(args, { json = false, interactive = false, input, fake } = {}) {
      const full = [...args, ...(project && !args.includes("--project") ? ["--project", project.id] : []), ...(json ? ["--json"] : []), ...(interactive ? [] : ["--non-interactive"])];
      if (dryRun) {
         planned(`firebase ${full.join(" ")}`);
         return fake;
      }
      const result = spawnSync(process.execPath, [firebaseBin, ...full], {
         cwd: repoRoot,
         input,
         stdio: interactive ? "inherit" : [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
         encoding: "utf8",
         env: { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: "60" },
      });
      if (interactive) {
         if (result.status !== 0) throw new Error(`firebase ${args[0]} failed`);
         return undefined;
      }
      if (json) {
         const parsed = JSON.parse(result.stdout || "{}");
         if (parsed.status === "error") throw new Error(parsed.error ?? `firebase ${args[0]} failed`);
         return parsed.result;
      }
      if (result.status !== 0) throw new Error(`firebase ${args[0]} failed:\n${(result.stderr || result.stdout).trim().split("\n").slice(-8).join("\n")}`);
      return result.stdout;
   }

   // A Google API call as the person signed in to the Firebase CLI (`firebase login`)
   const clients = new Map();
   let signedIn = false;
   async function google(method, url, body, { fake, allowStatus = [] } = {}) {
      if (dryRun) {
         planned(`${method} ${url}${body ? ` ${JSON.stringify(body)}` : ""}`);
         return fake;
      }
      const lib = (name) => require(join(toolDir, "node_modules", "firebase-tools", "lib", name));
      if (!signedIn) {
         const account = lib("auth.js").getGlobalDefaultAccount();
         if (!account) throw new Error("Sign in to the Firebase CLI first.");
         await lib("requireAuth.js").requireAuth({ user: account.user, tokens: account.tokens, project: project?.id });
         signedIn = true;
      }
      const parsed = new URL(url);
      if (!clients.has(parsed.origin)) clients.set(parsed.origin, new (lib("apiv2.js").Client)({ urlPrefix: parsed.origin, auth: true }));
      const response = await clients.get(parsed.origin).request({
         method,
         path: parsed.pathname,
         queryParams: Object.fromEntries(parsed.searchParams),
         body,
         ignoreQuotaProject: true,
         resolveOnHTTPError: true,
      });
      if (response.status >= 400 && !allowStatus.includes(response.status)) {
         const message = response.body?.error?.message ?? JSON.stringify(response.body).slice(0, 300);
         const error = new Error(`${method} ${parsed.origin}${parsed.pathname}: ${response.status} ${message}`);
         error.status = response.status;
         throw error;
      }
      return { status: response.status, body: response.body };
   }

   // Writes a file in the repository, or shows what it would write
   function writeFile(path, content, summary) {
      if (dryRun) {
         planned(`write ${path}${summary ? `: ${summary}` : ""}`);
         return;
      }
      writeFileSync(join(repoRoot, path), content);
   }

   const readFile = (path) => (existsSync(join(repoRoot, path)) ? readFileSync(join(repoRoot, path), "utf8") : "");

   // A command in the repository, e.g. npm run algolia:setup
   function run(command, args, { env } = {}) {
      if (dryRun) {
         planned(`${command} ${args.join(" ")}`);
         return;
      }
      const result = spawnSync(command, args, { cwd: repoRoot, stdio: "inherit", shell: true, env: { ...process.env, ...env } });
      if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
   }

   return { firebase, google, writeFile, readFile, run };
}
