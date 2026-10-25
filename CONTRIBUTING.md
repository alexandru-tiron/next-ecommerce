# Contributing

Thanks for helping build an open-source store anyone can run. This guide covers setting up the project, the checks a change has to pass, and how to send it.

## Ways to help

- **Report a bug:** open an issue with the bug report form. For security problems, follow [SECURITY.md](SECURITY.md) instead.
- **Suggest a feature:** open an issue with the feature request form. Check the [roadmap](docs/ROADMAP.md) first, since it may already be planned.
- **Send code or docs:** pick an issue (those labelled `good first issue` are a good start), say in the issue that you're working on it, and open a pull request.

## Project layout

| Path | What it is |
|---|---|
| `src/` | The Next.js storefront and admin panel (App Router). State is in Redux (`src/state`); server pages read store data through `src/lib/server` |
| `packages/core/` | Business rules shared by the storefront and the functions (VAT, vouchers, payments, validators), imported as `@core/*` |
| `functions/` | Firebase Cloud Functions: orders, stock, vouchers, payments, e-mails, contact messages, search sync. Bundled with esbuild |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Security rules and indexes, deployed with the Firebase CLI |
| `messages/` | Translations (`en.json`, `ro.json`) |
| `scripts/` | Search index setup and reindexing, demo data |
| `docs/` | The roadmap and longer guides |

## Setting up

You need Node.js 22 and Java 11 or newer for the Firebase emulators. The npm scripts run Firebase CLI 14 through npx; for deploys, install the CLI yourself (`npm install -g firebase-tools@14`, or a newer one once you have Java 21).

```bash
npm install
npm --prefix functions install
cp .example.env .env.local              # storefront settings, see the README
cp functions/.example.env functions/.env  # function settings
cp .firebaserc.example .firebaserc        # then set your Firebase project id
```

### Run everything locally (recommended)

The Firebase emulators give you a private copy of the whole backend, filled with demo data, so you can sign in, place orders and use the admin panel without touching a real project. One command starts everything (Ctrl+C stops it):

```bash
npm run dev:demo                  # the store at http://localhost:3000; prints the admin account
npm run dev:demo -- --setup-link  # a store that isn't set up yet, with a link to the setup wizard
```

Or run the pieces separately, which keeps the emulators running while you restart the store:

```bash
cp functions/.secret.local.example functions/.secret.local   # once: placeholder secrets for the functions emulator
npm --prefix functions run build                             # the emulator runs the built functions
npm run emulators                                            # terminal 1: Auth, Firestore, Storage and Functions
npm run seed:emulators                                       # terminal 2: demo catalogue, orders and an admin account
npm run dev:emulators                                        # terminal 2: the store, connected to the emulators
```

The seed prints the password for `admin@example.com`. In the emulators, order and contact e-mails are skipped and nothing is sent to Algolia, so search shows your real index while everything else is local. Emulator data is gone when you stop them; seed again after a restart.

To work against your own Firebase project instead, run `npm run dev` with your keys in `.env.local`.

## Checks every change must pass

These run in CI on every pull request. Run them locally first:

```bash
npm run lint
npm run typecheck
npm test                    # storefront unit tests (Vitest)
npm --prefix functions test # Cloud Functions build and unit tests
npm run test:rules          # security rules tests (Firestore and Storage emulators; needs Java)
npm run build
```

Also:

- **Add tests** for new logic. Put pure logic (prices, VAT, vouchers, filters) in plain `.ts` modules so it can be unit-tested without Firebase.
- **Translate new text.** Add every user-facing string to both `messages/en.json` and `messages/ro.json`. Don't hard-code text in components.
- **Don't hard-code store details.** No store names, currencies, colours or URLs in code: they come from settings (see the roadmap's white-label phase).
- **Keep security in mind:**
  - Changes to `firestore.rules` or `storage.rules` must keep deny-by-default access and come with tests in `tests/rules/`.
  - Anything that changes prices, stock, payments or permissions belongs in a Cloud Function, not in the browser.
  - Never log tokens, passwords or customers' personal data.
- **No secrets in the repo.** Keys go in `.env.local`, `functions/.env` (both gitignored) or Secret Manager.

## Code style

- TypeScript everywhere. Formatting is 3-space indentation and double quotes; follow the surrounding code.
- Comments explain why something is done, not what the code says.
- Keep pull requests focused: one feature or fix per pull request, with a short description of what changed and how you tested it.

## Commit messages

Write the summary line in the imperative ("Add voucher expiry check", not "Added…"), under about 70 characters. Add a body when the reason for the change isn't obvious.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
