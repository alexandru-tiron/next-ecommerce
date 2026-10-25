// The setup CLI: from nothing to a deployed Firebase backend and a one-time link to the setup wizard.
// Run it from the repository root with `npm run setup` (add `-- --dry-run` to see every step without changing anything).
// Every step can be run again: existing projects, apps, databases and buckets are reused. See docs/quick-start.md.
import { confirm, input, password, select } from "@inquirer/prompts";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { bold, createIO, dim, ok, red, say, warn } from "./lib/io.mjs";
import { budgetBody, firebaseEnv, firestoreFields, LOCATIONS, maskEnv, mergeEnv, validEmail, validProjectId, validSiteUrl } from "./lib/values.mjs";
import { newSetupToken, SETUP_TOKEN_DAYS, setupLink } from "../../scripts/lib/setup-token.mjs";

// --- arguments: every question can be answered up front, e.g. --project my-shop --site https://shop.example.com
const args = {};
for (let i = 2; i < process.argv.length; i++) {
   const match = process.argv[i].match(/^--([^=]+)(?:=(.*))?$/);
   if (!match) continue;
   const next = process.argv[i + 1];
   args[match[1]] = match[2] ?? (next && !next.startsWith("--") ? (i++, next) : true);
}
const dryRun = Boolean(args["dry-run"]);
const auto = Boolean(args.yes);
const text = (name) => (typeof args[name] === "string" ? args[name] : undefined);

// A question, unless the answer came as an argument; with --yes the default is taken
async function ask(kind, name, options) {
   if (text(name) !== undefined) return text(name);
   if (args[`skip-${name}`]) return undefined;
   if (auto) {
      if (options.default !== undefined) return options.default;
      throw new Error(`--yes needs --${name}`);
   }
   if (kind === "select") return select(options);
   if (kind === "confirm") return confirm(options);
   if (kind === "password") return password({ mask: "•", ...options });
   return input(options);
}

const state = { project: null, location: "eur3", storeName: "My Store", siteUrl: "http://localhost:3000", firebaseConfig: null, emailUser: "", algolia: null };
let io = createIO({ dryRun, project: null });
const consoleUrl = (path) => `https://console.firebase.google.com/project/${state.project.id}/${path}`;

const steps = [
   ["Check the tools", prerequisites],
   ["Choose the Firebase project", chooseProject],
   ["Blaze plan and budget alert", billing],
   ["Database, sign-in and file storage", services],
   ["Register the web app", webApp],
   ["Configuration files and secrets", configuration],
   ["Product search (Algolia)", search],
   ["Deploy the rules, indexes and functions", deploy],
   ["Owner account", ownerLink],
   ["Demo catalogue (optional)", demo],
   ["Next steps", summary],
];

say(bold("\nStore setup") + (dryRun ? dim("  (dry run: nothing is changed)") : ""));
say(dim("About 15 minutes. You can stop at any time and run `npm run setup` again.\n"));
for (const [index, [title, step]] of steps.entries()) {
   say(bold(`\n${index + 1}/${steps.length}  ${title}`));
   try {
      await step();
   } catch (error) {
      if (error?.name === "ExitPromptError") process.exit(130);
      say(red(`\n${error.message}`));
      say("Fix the problem and run `npm run setup` again. Finished steps are reused, not repeated.");
      process.exit(1);
   }
}

// 1. Node and the Firebase CLI sign-in
async function prerequisites() {
   const [major, minor] = process.versions.node.split(".").map(Number);
   if (major < 20 || (major === 20 && minor < 17)) throw new Error(`Node 20.17 or newer is needed (this is ${process.versions.node}).`);
   ok(`Node ${process.versions.node}`);
   const accounts = io.firebase(["login:list"], { json: true, fake: [{ user: { email: "you@example.com" } }] }) ?? [];
   if (accounts.length === 0) {
      if (auto) throw new Error("Sign in to Firebase first: npx firebase-tools login");
      say("Sign in to Firebase with your Google account:");
      io.firebase(["login"], { interactive: true });
   } else {
      ok(`Signed in to Firebase as ${accounts[0].user?.email ?? "your account"}`);
   }
}

// 2. A new or existing project, the database location and the store's name
async function chooseProject() {
   const projects = io.firebase(["projects:list"], { json: true, fake: [] }) ?? [];
   let id = text("project");
   if (!id && !text("create")) {
      id = await ask("select", "project", {
         message: "Which Firebase project should the store use?",
         default: "__new",
         choices: [{ name: "Create a new project", value: "__new" }, ...projects.map((project) => ({ name: `${project.displayName} (${project.projectId})`, value: project.projectId }))],
      });
   }
   if (!id || id === "__new") {
      id = text("create") ?? (await ask("input", "create", { message: "New project id (lowercase letters, digits and hyphens):", validate: (value) => validProjectId(value) || "6–30 characters: a-z, 0-9 and -, starting with a letter" }));
      if (!validProjectId(id)) throw new Error(`"${id}" isn't a valid project id.`);
      const name = await ask("input", "name", { message: "Project name:", default: id });
      io.firebase(["projects:create", id, "--display-name", name], { json: true, fake: {} });
      ok(`Created the project ${id}`);
   } else if (!dryRun && !projects.some((project) => project.projectId === id)) {
      throw new Error(`No project "${id}" in your account. Check the id with: npx firebase-tools projects:list`);
   }
   const known = projects.find((project) => project.projectId === id);
   state.project = { id, number: known?.projectNumber ?? null };
   io = createIO({ dryRun, project: state.project });
   if (!state.project.number) {
      const { body } = await io.google("GET", `https://cloudresourcemanager.googleapis.com/v1/projects/${id}`, undefined, { fake: { body: { projectNumber: "000000000000" } } });
      state.project.number = body.projectNumber;
   }
   state.location = await ask("select", "location", { message: "Where should the store's data be kept?", default: "eur3", choices: LOCATIONS.map((location) => ({ name: `${location.name} (${location.value})`, value: location.value })) });
   state.storeName = await ask("input", "store-name", { message: "Store name (you can change it later):", default: state.storeName });
   ok(`Project ${id}, data in ${state.location}`);
}

// 3. Cloud Functions and Storage need the Blaze (pay-as-you-go) plan; a budget alert guards against surprises
async function billing() {
   const billingInfo = async () => (await io.google("GET", `https://cloudbilling.googleapis.com/v1/projects/${state.project.id}/billingInfo`, undefined, { fake: { body: { billingEnabled: true, billingAccountName: "billingAccounts/000000-000000-000000" } } })).body;
   let info = await billingInfo();
   while (!info.billingEnabled) {
      say("The store's Cloud Functions and file storage need the Blaze plan (pay as you go). Small stores usually stay within the free usage,");
      say("and the budget alert below e-mails you long before costs matter.");
      say(`Upgrade here: ${consoleUrl("usage/details")}`);
      if (auto || !(await confirm({ message: "Upgraded? Check again", default: true }))) throw new Error("The project needs the Blaze plan before the store can be deployed.");
      info = await billingInfo();
   }
   ok("Blaze plan");
   const amount = await ask("input", "budget", { message: "Monthly budget for alerts (in your billing currency; 0 to skip):", default: "10", validate: (value) => /^\d+$/.test(value) || "A whole number" });
   if (!amount || amount === "0") return warn("No budget alert. Create one later in the Google Cloud console under Billing → Budgets & alerts.");
   try {
      await io.google("POST", `https://billingbudgets.googleapis.com/v1/${info.billingAccountName}/budgets`, budgetBody(state.project.number, Number(amount), state.storeName), { fake: { body: {} } });
      ok(`Budget alert at ${amount} per month (e-mails at 50%, 90% and 100%)`);
   } catch (error) {
      warn(`The budget couldn't be created (${error.status === 403 ? "you need billing permissions on the account" : error.message}).`);
      warn(`Create it in the console: https://console.cloud.google.com/billing/budgets?project=${state.project.id}`);
   }
}

// 4. The Firestore database, e-mail/password sign-in and the default Storage bucket
async function services() {
   const id = state.project.id;
   const database = await io.google("GET", `https://firestore.googleapis.com/v1/projects/${id}/databases/(default)`, undefined, { allowStatus: [404], fake: { status: 404 } });
   if (database.status === 404) {
      io.firebase(["firestore:databases:create", "(default)", "--location", state.location]);
      ok(`Created the Firestore database in ${state.location}`);
   } else {
      ok("Firestore database exists");
   }

   // Firebase Authentication, then e-mail and password sign-in. Google sign-in needs an OAuth client, set up in the console.
   await io.google("POST", `https://identitytoolkit.googleapis.com/v2/projects/${id}/identityPlatform:initializeAuth`, {}, { allowStatus: [400, 409], fake: {} });
   await io.google("PATCH", `https://identitytoolkit.googleapis.com/admin/v2/projects/${id}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`, { signIn: { email: { enabled: true, passwordRequired: true } } }, { fake: {} });
   ok("E-mail and password sign-in");
   warn(`To let customers sign in with Google too, enable it here: ${consoleUrl("authentication/providers")}`);

   const bucket = await io.google("GET", `https://firebasestorage.googleapis.com/v1alpha/projects/${id}/defaultBucket`, undefined, { allowStatus: [404], fake: { status: 404 } });
   if (bucket.status === 404) {
      const location = state.location === "eur3" ? "europe-west3" : state.location === "nam5" ? "us-central1" : state.location;
      try {
         await io.google("POST", `https://firebasestorage.googleapis.com/v1alpha/projects/${id}/defaultBucket`, { location, storageClass: "STANDARD" }, { fake: {} });
         ok(`Created the Storage bucket in ${location}`);
      } catch (error) {
         warn(`The Storage bucket couldn't be created (${error.message}). Click "Get started" here: ${consoleUrl("storage")}`);
      }
   } else {
      ok("Storage bucket exists");
   }
}

// 5. The web app whose config the store uses
async function webApp() {
   const apps = io.firebase(["apps:list", "WEB"], { json: true, fake: [] }) ?? [];
   let appId = apps[0]?.appId;
   if (!appId) {
      appId = io.firebase(["apps:create", "WEB", `${state.storeName} store`], { json: true, fake: { appId: "1:000000000000:web:0000" } }).appId;
      ok("Registered the web app");
   } else {
      ok(`Using the web app ${apps[0].displayName ?? appId}`);
   }
   const result = io.firebase(["apps:sdkconfig", "WEB", appId], { json: true, fake: { sdkConfig: { apiKey: "AIza…", authDomain: `${state.project.id}.firebaseapp.com`, projectId: state.project.id, storageBucket: `${state.project.id}.firebasestorage.app`, messagingSenderId: state.project.number, appId } } });
   state.firebaseConfig = result.sdkConfig ?? JSON.parse(result.fileContents.match(/\{[\s\S]*\}/)[0]);
   ok("Fetched the web app's config");
}

// 6. .env.local, .firebaserc and functions/.env, the e-mail secret, and the store's address as an authorized sign-in domain
async function configuration() {
   state.siteUrl = await ask("input", "site", { message: "The store's address (keep localhost until it's deployed; you can change it later):", default: state.siteUrl, validate: (value) => validSiteUrl(value) || "An https:// address without a path, or http://localhost:3000" });
   if (!validSiteUrl(state.siteUrl)) throw new Error(`"${state.siteUrl}" isn't a valid store address.`);

   const previous = io.readFile(".env.local").match(/^NEXT_PUBLIC_PROJECTID=(.*)$/m)?.[1];
   if (previous && previous !== state.project.id && !auto && !(await confirm({ message: `.env.local belongs to the project ${previous}. Switch it to ${state.project.id}?`, default: true }))) {
      throw new Error("Stopped so .env.local stays as it is.");
   }
   const storeEnv = { ...firebaseEnv(state.firebaseConfig), NEXT_PUBLIC_SITE_URL: state.siteUrl };
   io.writeFile(".env.local", mergeEnv(io.readFile(".env.local") || io.readFile(".example.env"), storeEnv), JSON.stringify(maskEnv(storeEnv)));
   io.writeFile(".firebaserc", `${JSON.stringify({ projects: { default: state.project.id } }, null, 2)}\n`, `default project ${state.project.id}`);

   say("Order and contact e-mails are sent from a Gmail or Google Workspace address with an app password (https://support.google.com/accounts/answer/185833).");
   state.emailUser = (await ask("input", "email-user", { message: "Sending address (leave empty to set it up later):", default: "", validate: (value) => !value || validEmail(value) || "An e-mail address" })) ?? "";
   const functionsEnv = { SITE_URL: state.siteUrl, EMAIL_USER: state.emailUser || "orders@example.com", ENABLE_STRIPE: "false", ENABLE_NETOPIA: "false" };
   const currentFunctionsEnv = io.readFile("functions/.env") || io.readFile("functions/.example.env");
   if (!/^ENFORCE_APP_CHECK=/m.test(currentFunctionsEnv)) functionsEnv.ENFORCE_APP_CHECK = "false";
   io.writeFile("functions/.env", mergeEnv(currentFunctionsEnv, functionsEnv), JSON.stringify(functionsEnv));

   // The functions can't deploy without their secrets, so a skipped one gets a placeholder
   const emailPassword = state.emailUser ? await ask("password", "email-password", { message: "App password for that address:" }) : undefined;
   io.firebase(["functions:secrets:set", "EMAIL_PASSWORD", "--data-file", "-", "--force"], { input: emailPassword || "not-set" });
   ok(state.emailUser ? "Stored the e-mail password in Secret Manager" : "E-mail not set up yet; the store works, but sends no e-mails");

   if (!state.siteUrl.startsWith("http://localhost")) {
      const host = new URL(state.siteUrl).hostname;
      const config = (await io.google("GET", `https://identitytoolkit.googleapis.com/admin/v2/projects/${state.project.id}/config`, undefined, { fake: { body: { authorizedDomains: ["localhost"] } } })).body;
      const domains = config.authorizedDomains ?? [];
      if (!domains.includes(host)) {
         await io.google("PATCH", `https://identitytoolkit.googleapis.com/admin/v2/projects/${state.project.id}/config?updateMask=authorizedDomains`, { authorizedDomains: [...domains, host] }, { fake: {} });
      }
      ok(`${host} may use Firebase sign-in`);
   }
}

// 7. Algolia powers the product lists and search in this version (a built-in search is planned)
async function search() {
   say("Product lists and search use Algolia; its free plan is enough to start. Create an app at https://dashboard.algolia.com and copy its keys.");
   const appId = await ask("input", "algolia-app-id", { message: "Algolia application id (leave empty to skip for now):", default: "" });
   if (!appId) {
      io.firebase(["functions:secrets:set", "ALGOLIA_API_WRITE_KEY", "--data-file", "-", "--force"], { input: "not-set" });
      return warn("Skipped: product lists stay empty until Algolia is set up (run `npm run setup` again, or see README → Search index).");
   }
   const searchKey = await ask("input", "algolia-search-key", { message: "Search-only API key:" });
   const writeKey = await ask("password", "algolia-write-key", { message: "Write API key (stored in Secret Manager):" });
   const indexName = await ask("input", "algolia-index", { message: "Index name:", default: "products" });
   const storeEnv = { NEXT_PUBLIC_ALGOLIA_APP_ID: appId, NEXT_PUBLIC_ALGOLIA_SEARCH_KEY: searchKey };
   io.writeFile(".env.local", mergeEnv(io.readFile(".env.local"), storeEnv), JSON.stringify(storeEnv));
   io.writeFile("functions/.env", mergeEnv(io.readFile("functions/.env"), { ALGOLIA_APP_ID: appId, ALGOLIA_INDEX_NAME: indexName }), `ALGOLIA_APP_ID=${appId}, ALGOLIA_INDEX_NAME=${indexName}`);
   io.firebase(["functions:secrets:set", "ALGOLIA_API_WRITE_KEY", "--data-file", "-", "--force"], { input: writeKey });
   io.run("node", ["scripts/algolia-setup.mjs"], { env: { ALGOLIA_API_WRITE_KEY: writeKey } });
   ok("Algolia index and replicas configured");
}

// 8. Security rules and indexes first, then the Cloud Functions
async function deploy() {
   if (args["skip-deploy"]) return warn("Skipped. Deploy later with: npx firebase-tools deploy --only firestore,storage,functions");
   io.firebase(["deploy", "--only", "firestore,storage"]);
   ok("Deployed the security rules and indexes");
   say(dim("Deploying the Cloud Functions takes a few minutes…"));
   io.firebase(["deploy", "--only", "functions"]);
   ok("Deployed the Cloud Functions");
}

// 9. A one-time link that makes whoever opens it (signed in) the store's owner; only its hash is stored
async function ownerLink() {
   const { token, hash, expiresAt } = newSetupToken();
   const documents = `https://firestore.googleapis.com/v1/projects/${state.project.id}/databases/(default)/documents`;
   await io.google("PATCH", `${documents}/System/setup`, firestoreFields({ token_hash: hash, created_at: new Date(), expires_at: expiresAt, used_at: null }), { fake: {} });
   await io.google("POST", `${documents}/AuditLog`, firestoreFields({ action: "setup_token_created", by: "cli", created_at: new Date() }), { fake: {} });
   state.link = setupLink(state.siteUrl, token);
   ok(`Created a setup link (works once, valid ${SETUP_TOKEN_DAYS} days). It's shown at the end.`);
}

// 10. The demo catalogue needs Admin SDK credentials (Application Default Credentials)
async function demo() {
   const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS || [join(process.env.APPDATA ?? "", "gcloud", "application_default_credentials.json"), join(homedir(), ".config", "gcloud", "application_default_credentials.json")].some((file) => existsSync(file));
   const wanted = await ask("confirm", "demo", { message: "Add the demo catalogue (fictional products with images) to try the store?", default: false });
   if (!wanted) return;
   if (!adc && !dryRun) {
      warn("This needs Google Cloud credentials. Run `gcloud auth application-default login`, then:");
      return say(`  node scripts/seed-demo/seed.mjs --project ${state.project.id} --yes`);
   }
   io.run("node", ["scripts/seed-demo/seed.mjs", "--project", state.project.id, "--yes"]);
   ok("Added the demo catalogue (documents with demo- ids; remove them before opening the store)");
}

// 11. What's left: hosting the store and claiming it
async function summary() {
   say(`The backend of ${bold(state.storeName)} is ready in ${state.project.id}. Now:`);
   say("");
   say(`1. Deploy the store on Vercel (README → "Deploy with Vercel"), with these variables from .env.local:`);
   say(dim("   NEXT_PUBLIC_APIKEY, NEXT_PUBLIC_AUTHDOMAIN, NEXT_PUBLIC_PROJECTID, NEXT_PUBLIC_STORAGEBUCKET, NEXT_PUBLIC_MESSAGINGSENDERID,"));
   say(dim("   NEXT_PUBLIC_APPID, NEXT_PUBLIC_ALGOLIA_APP_ID, NEXT_PUBLIC_ALGOLIA_SEARCH_KEY and NEXT_PUBLIC_SITE_URL"));
   say(`2. Once it has its address, run ${bold(`npm run setup -- --project ${state.project.id} --site https://your-address`)} again`);
   say("   so e-mail links, sign-in and the setup link use it (the earlier steps are reused).");
   say("3. Open the setup link, sign up or sign in, and follow the wizard. The account becomes the store's owner:");
   say(`   ${bold(state.link ?? "(created in step 9)")}`);
   say("4. Turn on App Check and the other security settings: docs/SECURITY-SETUP.md. The admin dashboard shows what's left.");
   say(dim("\nGuides: docs/quick-start.md, docs/STORE-SETUP.md and docs/troubleshooting.md"));
}
