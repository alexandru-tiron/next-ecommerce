# Scripts

Maintenance scripts for the store. By default they run against the **local Firebase emulators**. A real project needs `--project <id>`, and anything that changes it also needs `--yes`. For a real project, sign in with Application Default Credentials first (`gcloud auth application-default login`, or set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key).

| Command | What it does |
|---|---|
| `npm run seed:demo` | Starts the emulators, fills them with the demo catalogue (fictional brands, generated images, reviews, ~6 months of orders, vouchers) and creates the admin `admin@example.com` with a printed password, then stops. |
| `node scripts/seed-demo/seed.mjs --project <id> --yes [--with-orders]` | Adds the demo catalogue to a real store. Documents get `demo-` ids and `demo: true`; existing store settings are never overwritten. |
| `npm run make-admin -- --email you@example.com --project <id> --yes` | Gives an existing account admin rights; add `--revoke` to remove them. This is how a new store gets its first admin. |
| `npm run algolia:setup` | Configures the Algolia index and its sorted replicas (reads `functions/.env`; the write key comes from `functions/.secret.local` or the `ALGOLIA_API_WRITE_KEY` environment variable). Add `-- --dry-run` to print the settings only. |
| `npm run algolia:reindex -- --project <id> --yes` | Rebuilds the search index from Firestore. Add `--dry-run` to only check the records. Admins can also use Admin → Settings → Reindex search. |
| `npm run emulators` | Starts the emulators (Firestore, Auth, Storage, Functions, and the UI on port 4000). Build the functions first (`npm --prefix functions run build`). |
| `npm run seed:emulators` | Fills running emulators with the demo data and the `admin@example.com` account. |
| `npm run dev:emulators` | Runs the store against the emulators (see "Run everything locally" in [CONTRIBUTING.md](../CONTRIBUTING.md)). |

The emulator scripts run Firebase CLI 14 through npx: it supports the functions' firebase-functions 7 and still runs on Java 11+. CLI 13 can't run these functions in the emulator, and CLI 15 needs Java 21.

## Troubleshooting

- **Firestore emulator exits with "Unable to establish loopback connection" (Windows):** Java can't create its internal socket file in the temp folder. Point it at a short folder you can write to, for example `set JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\temp`, and try again.
- **Emulators need Java 11 or newer** (`java -version`).
- **"Could not start Emulator UI, port taken":** another program uses port 4000 (NoMachine does, for example). Change `emulators.ui.port` in `firebase.json` on your machine, or set `"enabled": false` there to run without the UI.
- **Functions fail in the emulator with "Unable to access secret environment variables":** copy `functions/.secret.local.example` to `functions/.secret.local`.
- **"Could not start Firestore Emulator, port taken" (Windows):** an earlier run left the emulator running. Close the Java process listening on port 8080 (`Get-NetTCPConnection -LocalPort 8080` shows its id) and run the command again.
