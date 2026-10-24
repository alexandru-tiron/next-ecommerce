# Shared business rules

Plain TypeScript used by both the storefront (`src/`) and the Cloud Functions (`functions/`), so each rule exists once:

| Module | What it covers |
|---|---|
| `vat.ts` | VAT included in prices, net amounts, valid rates |
| `voucher.ts` | Voucher checks and discounts |
| `payments.ts` | Payment methods, settings, status changes from Stripe and NETOPIA |
| `validators.ts` | E-mail, phone, name and password checks |
| `orderLimits.ts` | Allowed quantities and order size |

Import a module as `@core/<module>`, for example `import { vatIncluded } from "@core/vat"`. The alias is set in `tsconfig.json` and `functions/tsconfig.json`; the functions build (`functions/build.mjs`) bundles this code into `functions/lib/index.js`, so deploys don't need anything extra.

Keep this folder free of Firebase, React and Node-only APIs. Its tests run with `npm test` at the repository root, and any npm package it needs goes in the root `package.json`.
