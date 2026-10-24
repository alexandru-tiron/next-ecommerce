# Roadmap: an open-source, white-label store anyone can set up

**Goal:** a shop owner with no coding experience can go from nothing to a secure, branded, live store in under 30 minutes, without editing code. Developers can extend it through documented provider interfaces instead of forking it.

## Principles

1. **Secure by default.** A store set up by a non-technical owner must be safe without them understanding Firebase. Insecure states are blocked or flagged, never silent.
2. **Configuration, not code.** Everything a store owner would change (name, logo, colours, currency, languages, tax, shipping, payments, legal pages) lives in the admin panel, not in environment variables or source files.
3. **One store per deployment.** Each owner runs their own Firebase project and hosting. This isolates customer data between stores, keeps the security model simple and avoids running a multi-tenant SaaS. A hosted multi-tenant version can come later, on the same code.
4. **Works on free tiers where possible.** Optional services (search, email provider, card payments) are opt-in. The core store runs on Firebase and Vercel alone.
5. **Upgradeable.** Owners can pull new versions without losing their data or customisations.

## Where the project is today

Already in place: product catalogue with variants, Algolia search and filters, cart, checkout with stock reservation, vouchers, VAT, order emails and status timeline, reviews, wishlist, admin panel (products, orders, customers, inventory, vouchers, analytics, settings), Stripe and NETOPIA card payments (behind flags), SEO (metadata, sitemap, structured data), PWA, and 90 web + 18 Cloud Functions unit tests.

Gaps this roadmap closes:

| Area | Current state |
|---|---|
| Open source | No `LICENSE` file (the README says MIT). `functions/` and the Firestore/Storage rules are gitignored, and the README calls them proprietary, so nobody else can run the store. Demo data uses real brand and product names. |
| Setup | Needs a Firebase project, the Blaze plan, an Algolia app with hand-made index settings, environment variables in three places (`.env.local`, `functions/.env`, Vercel) and secrets. There is no way to create the first admin: `setAdminPrivilege` requires an existing admin. |
| White-label | The currency is hard-coded ("Lei" 63 times, `ron` for Stripe), dates use `ro-RO` in 8 files, the brand pink is hard-coded 121 times, the locale is fixed to `en`, and Romanian text is hard-coded in auth popups, admin pages and e-mails. Store details exist both as `NEXT_PUBLIC_STORE_*` variables and in `Settings/Info`. |
| Security | App Check is off, there are no Storage upload size limits, the `Users` profile accepts any fields, there are no automated tests for the security rules, the Gmail SMTP password sits in `functions/.env` in plain text, the client logs the user's ID token, there are no security headers (CSP, HSTS…), and production dependencies have known vulnerabilities (14 in the app and 26 in functions, including critical ones). |
| Code | Two state systems (React contexts, plus a Redux migration on a branch). Pricing, VAT, voucher and payment logic are duplicated between `src/` and `functions/`. `firebase-functions` is outdated. |

## Decisions to make first

1. **License.** MIT gives the widest adoption. AGPL-3.0 forces anyone who runs a modified version as a service to publish their changes. Recommendation: MIT for the store itself.
2. **Project name and brand**, separate from any one shop (the store owner's brand replaces it everywhere at runtime).
3. **Default market.** Keep Romanian specifics (NETOPIA, RO VAT rules, RO legal page templates) as an optional "Romania pack", with neutral defaults (English, EUR, Stripe) for everyone else.
4. **Search default.** Make Algolia optional and add a built-in Firestore search for small catalogues (see Phase 5), so a new store needs one fewer account.
5. **Transactional e-mail.** Replace Gmail SMTP with a provider interface, with Resend or SendGrid as the default.

---

## Phase 0: Open-source readiness

Make the repository something others can legally use and actually run.

1. Add the `LICENSE` file, and add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (private vulnerability reporting via GitHub Security Advisories), issue and PR templates.
2. Before publishing, scan the full git history for secrets with gitleaks or trufflehog. (A pattern scan in this session found none, but run a real tool.)
3. Publish `functions/`, `firestore.rules`, `storage.rules` and `firestore.indexes.json`: remove them from `.gitignore` and remove the "proprietary" sections from the README.
4. Remove author-specific values: the project id in `.firebaserc` (replace it with a template), and the default `SITE_URL` that points to the author's Vercel deployment.
5. Replace the demo catalogue with generic, trademark-free products and CC0 or generated images, so the public demo can't raise trademark complaints.
6. Move the scripts that currently live outside the repo into `scripts/`: Algolia index setup, full reindex, demo seed.
7. Turn on GitHub's secret scanning, Dependabot alerts and private vulnerability reporting.

**Done when:** a stranger can clone the repo and find everything needed to run it, and the license and contribution rules are clear.

## Phase 1: Security baseline

Fix what's exposed now, before adding features. (The full security plan is in the section below.)

1. Fix the known production vulnerabilities: update Next.js, Firebase and the other dependencies `npm audit` flags in both packages, then make `npm audit --omit=dev --audit-level=high` a CI gate.
2. Enable App Check (reCAPTCHA Enterprise) and enforce it on Firestore, Storage and every callable function. Use debug tokens for local development.
3. Add security headers in `next.config.ts`: a Content-Security-Policy with nonces, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'none'`.
4. Tighten the Firestore rules:
   - Allowlist the fields and validate the types of every customer-writable document (`Users`, `Addresses`, `Cart` with quantity limits).
   - Make `created_at` and `email` immutable after creation.
5. Add size limits to the Storage rules (for example 5 MB for images and 200 KB for SVG icons). Sanitise uploaded SVGs, or convert them to PNG, instead of relying on `dangerouslyAllowSVG`.
6. Move every secret to Secret Manager, including the e-mail password and the Algolia write key. Keep only public configuration in `.env` files.
7. Remove PII and token logging: the ID token and user objects logged in `AuthContext`, and the full product and order JSON in function logs.
8. Write automated tests for the security rules (`@firebase/rules-unit-testing` on the emulator) for every collection, for anonymous, customer, other-customer and admin users, and run them in CI.

**Done when:** CI blocks known-vulnerable dependencies and rule regressions, App Check is enforced, and a header scan (for example securityheaders.com) gives an A.

**Status:** the code is done; the store owner finishes the rollout with [docs/SECURITY-SETUP.md](SECURITY-SETUP.md).

- Done:
  - Dependencies upgraded (Next.js 15.5, Firebase 12, firebase-admin 14, firebase-functions 7) with 0 known production vulnerabilities, and an audit gate in CI.
  - Security headers, plus a per-request nonce CSP in `src/middleware.ts`.
  - Field allowlists and immutable fields in the rules, Storage size limits, and 33 rules tests on the emulators in CI.
  - Secrets moved to Secret Manager params.
  - Opt-in App Check: a site key for the browser, `ENFORCE_APP_CHECK` for the callable functions.
  - No token or personal-data logging.
  - The order function now rejects zero, negative, fractional and oversized quantities. A negative line used to cancel out another line's price.
- Left for the owner: set the two secrets, register App Check and turn on enforcement for the callable functions.
- Moved to Phase 2: enforcing App Check on Firestore and Storage, which needs the server-rendered reads on the Admin SDK first. Sanitising uploaded SVGs: only admins can upload, and the image optimizer serves SVGs sandboxed.

## Phase 2: Architecture cleanup

Give contributors one clear structure.

1. Convert the project to a monorepo with npm workspaces (Turborepo optional):
   - `apps/storefront` (Next.js)
   - `functions/` (Cloud Functions)
   - `packages/core`: shared types and the pricing, VAT, voucher, stock and payment-status logic, used by both the storefront and functions instead of the current copies
   - `packages/emails`
   - `scripts/`
2. Finish the state-management migration: merge the Redux branch after it passes the signed-in checks, or keep contexts, but don't ship both. Remove dead code (`LayoutWrapper`, the contexts the migration replaces).
3. Fix the remaining lint warnings. (`firebase-functions` and `firebase-admin` were upgraded in Phase 1.)
4. Validate every callable function's input with a schema library (zod) and use consistent error codes.
5. Move server-side Firestore reads to the Admin SDK and cache them with Next's data cache, invalidated when the admin saves changes (`revalidateTag`). Then enforce App Check on Firestore and Storage.
6. Make the contact and data-request forms actually send their messages (today they only show a success notice).

**Done when:** no business rule exists in two places, and `npm run build`, lint, typecheck and all tests run from the repository root.

**Status:** done, with one change to the plan.

- **Layout:** the storefront stays at the repository root instead of moving to `apps/storefront`. A move would change Vercel's Root Directory for every store. Shared rules live in `packages/core` and are imported as `@core/*`; the functions bundle them with esbuild. Moving `packages/emails` out is left for Phase 5, together with the e-mail provider interface.
- **Done:**
  - Redux merged and the contexts removed. Tested signed in on the emulators: profile, address, cart, wishlist and a cash-on-delivery order.
  - `npm run dev:emulators` and `npm run seed:emulators` run the whole store locally.
  - zod schemas for every callable function.
  - Server pages read through the Admin SDK and Next's data cache. Admin saves refresh it through `/api/revalidate`.
  - The contact and data-request forms send their messages: saved in `ContactMessages`, e-mailed to the store, rate-limited.
  - No lint warnings.
- **Fixed along the way:**
  - Missing translations, now caught by a test.
  - The checkout total ignoring cart changes.
  - Product pages failing for products with an `updated_at` timestamp.
- **Left for the owner:** set `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel, then enforce App Check on Firestore (see [docs/SECURITY-SETUP.md](SECURITY-SETUP.md)). Storage stays unenforced, because the image optimizer reads product images without App Check.

## Phase 3: White-label configuration

Everything a store owner changes lives in the admin panel.

1. **One settings model** in Firestore, edited in Admin → Settings:
   - `Settings/Store`: name, legal entity, tax ID, address, contacts, social links
   - `Settings/Branding`: logo, favicon, social share image, colours, font, corner radius
   - `Settings/Localization`: default language, enabled languages, currency, time zone
   - The existing Tax, Shipping, Payments and Notifications documents
   - `Settings/Legal`: terms, privacy, returns and delivery pages

   Remove the `NEXT_PUBLIC_STORE_*` variables. Environment variables keep only infrastructure configuration (Firebase config, site URL).
2. **Theming.**
   - Replace the 121 hard-coded `pink-*` classes with Tailwind theme tokens (`brand-50`…`brand-900`) backed by CSS variables.
   - The root layout injects those variables from `Settings/Branding` on the server, so there's no flash of the default theme.
   - The admin picks one colour; the app generates the tints and checks WCAG AA contrast before saving.
3. **Currency and dates.** One `<Price>` component using `Intl.NumberFormat` with the store currency, replacing the hard-coded "Lei". Store dates format with `Intl` and the store locale. Card payments take their currency from settings.
4. **Languages.**
   - Language routing (a locale segment or cookie) with a language switcher.
   - Move every hard-coded string into the message files: the Romanian auth popups, admin labels and function e-mails.
   - A CI check that every key exists in every enabled language.
5. **Content.**
   - Legal pages edited in the admin panel with a sanitised rich-text editor, starting from templates per country (EU/RO first).
   - Home page sections the owner can turn on, off and reorder.
   - Editable footer and navigation links.
6. **E-mail.** Branded, translated templates (React Email), with a guide for SPF, DKIM and DMARC on the store's domain.
7. **Domain and SEO.** A custom domain guide. A default social share image taken from branding. Analytics (GA4 or Plausible) off by default, shown behind a consent banner once enabled.

**Done when:** a store with a different name, logo, colours, currency (EUR) and language (German) can be set up entirely from the admin panel, with no Romanian or project-specific text left.

## Phase 4: Setup experience

Turn hours of configuration into a guided 30-minute flow.

1. **Setup CLI** (`npx create-<project>-store`, also `npm run setup`):
   1. Check prerequisites (Node, Firebase CLI login).
   2. Create or select a Firebase project and pick the data region.
   3. Enable Auth providers, Firestore and Storage.
   4. Explain the Blaze plan and create a **budget alert**.
   5. Register the web app and fetch its config automatically.
   6. Write `.env.local` and set secrets interactively.
   7. Deploy the rules, indexes and functions.
   8. Optionally configure search.
   9. Create the first admin account through the Admin SDK.
   10. Optionally load the demo catalogue.
   11. Print the deploy steps.
2. **First-run wizard** at `/setup` for owners who deployed with a hosting button instead of the CLI:
   - It works only with a one-time setup token printed during deployment and stored hashed.
   - It walks through store details → branding → language/currency/tax → shipping → payments → legal pages → admin account.
   - It locks itself permanently once finished (`Settings/System.setupCompleted`).
3. **First admin, done safely:** the CLI script or the setup token are the only ways to create the first admin. Never an open endpoint. After setup, admins are managed in an Admin → Team page, with roles (see the security plan).
4. **Try without accounts:** `npm run dev:demo` starts the Firebase Emulator Suite with demo data, so anyone can explore the full store and admin locally, offline.
5. **Setup checklist** in the admin dashboard: remaining steps (payments, domain, legal pages), plus live security checks (App Check enforced, rules version deployed, admin MFA on, backups enabled, budget alert set).
6. **Deploy buttons** (Vercel) with every required variable listed and described.
7. **Documentation site** (Nextra or Docusaurus) with:
   - quick start, configuration, branding, payments, shipping, going live, security and upgrades;
   - troubleshooting, covering the issues hit in this project: function discovery timeouts, secrets blocking deploys, stale Algolia apps, billing turned off.

**Done when:** a test user with no Firebase experience reaches a live, branded store with one test order in under 30 minutes, using only the CLI or wizard and the docs.

## Phase 5: Pluggable integrations

Let stores pick services, and let developers add new ones without touching core code.

1. Define provider interfaces in `packages/core`, each with a configuration schema, a capability list and test doubles:
   - `PaymentProvider`: start payment, verify webhook, refund
   - `ShippingProvider`: rates, create shipment/label, tracking
   - `SearchProvider`: index, query, facets
   - `EmailProvider`: send
2. Payments: move Stripe and NETOPIA behind the interface, keep cash on delivery, and add PayPal later. Payment methods are enabled from Settings → Payments, as they are now.
3. Shipping: a manual provider (flat rates and thresholds, as now), then Sameday and Fan Courier for the Romania pack (AWB creation and tracking into the order timeline), and a generic carrier (EasyPost or Shippo) for other markets.
4. Search:
   - A built-in Firestore provider (category, brand and price filters, prefix search) for catalogues up to a few thousand products.
   - Algolia, Meilisearch and Typesense providers for larger stores.
   - The setup CLI asks which to use.
5. Address checks: postcode format validation per country to start, then an optional address autocomplete provider (for example Google Places).

**Done when:** a new provider can be added as a package that implements an interface, with no changes to the checkout or admin code.

## Phase 6: Quality, operations and documentation

1. **Tests:**
   - Keep the unit tests.
   - Add the rule tests from Phase 1, and function integration tests on the emulator.
   - Add Playwright end-to-end tests: browse → cart → checkout (cash on delivery and voucher), a card payment with a provider sandbox, admin product create/edit, and the setup wizard.
   - Run them all in CI on every pull request.
2. **Accessibility:** axe checks in the Playwright suite, keyboard navigation and visible focus, and a WCAG 2.2 AA review of checkout and admin.
3. **Performance:** Lighthouse CI budgets on the home, product and listing pages.
4. **Monitoring:** error tracking (Sentry) for the storefront and functions, structured logs, an uptime check, and alerts for failed payments and webhook errors.
5. **Backups:** Firestore point-in-time recovery, plus scheduled exports to Cloud Storage, with a documented restore drill.
6. **Releases:**
   - Semantic versions, a changelog and release notes.
   - Versioned Firestore data migrations (`npm run migrate`, with the version stored in `Settings/System`).
   - An upgrade guide for stores created from the template.

## Phase 7: 1.0 launch

1. An external security review (see the security plan) and fixes for everything it finds.
2. A public demo store that resets nightly.
3. Showcase docs, a contribution guide with "good first issue" labels, and a public roadmap.
4. Announce 1.0, with a support policy (which versions get security fixes).

---

## Security plan

Security is part of every phase above; this section is the full checklist.

### Threat model

| Who or what | What they could try | Main defences |
|---|---|---|
| Anonymous visitors and bots | Scrape customer data, spam signups, reviews and contact forms, brute-force vouchers, run up the bill | Deny-by-default rules, App Check, rate limits, bot protection, function instance caps, budget alerts |
| Malicious customers | Change prices or totals, read other people's orders, give themselves admin, upload harmful files | Server-side pricing and stock, rules with field allowlists and rule tests, admin rights only through custom claims set by the server, upload validation |
| A compromised admin account | Read all customers, change prices, issue refunds | Admin MFA, roles with least privilege, an audit log, alerts on sensitive actions, session revocation |
| A compromised dependency or CI | Run code in the build or the browser | Lockfiles, automated updates, audit gates, CodeQL, GitHub Actions pinned by commit, minimal dependencies |
| The store owner's own mistakes | Insecure rules, leaked keys, billing surprises | Rules shipped and tested, no secrets in files, setup checks, a security checklist in the admin panel, budget alerts |

### Controls

**Accounts and sign-in**
- Require a verified e-mail before ordering (already done). Enforce a password policy through Identity Platform. Add bot protection to sign-up and login.
- Require MFA (TOTP) for every admin account. The admin panel refuses access without it.
- Revoke sessions (refresh tokens) when an admin is removed or changes role.

**Permissions**
- Roles in custom claims: `owner`, `admin`, `staff` (orders and inventory only). They are checked in the rules and in functions, and set only by functions that verify the caller's role.
- Create the first admin only through the CLI or the one-time setup token. Never through a public endpoint. (The old open `setAdminPrivilege` showed why.)
- An audit log (`AuditLog` collection, written only by functions and triggers) of admin changes: settings, prices, roles, refunds, order status.

**Data access**
- Deny-by-default Firestore rules (already done), with field allowlists, type checks and immutable fields for every document customers can write.
- Automated rule tests in CI for every collection and role. A rules change can't be merged without them.
- Storage rules with content-type checks (already done), size limits and path checks. Sanitise SVGs on upload.
- Keep sensitive writes in functions: order creation, stock, vouchers and payment status (already done).

**App Check and abuse**
- Enforce App Check on Firestore, Storage and all callable functions.
- Rate limits per user and per IP on order creation (partly done), voucher checks, review posting and the contact form.
- Cap the maximum instances of every function, so an attack can't turn into a large bill. Create a budget alert during setup.
- Moderation for reviews (approve before publishing, as an option).

**Functions**
- Validate every input against a schema, and return clear error codes without leaking internals.
- Give functions service accounts with only the permissions they need.
- Verify the signature of every webhook (Stripe and NETOPIA already do). Never trust redirect parameters (already done).

**Secrets and configuration**
- All secrets in Secret Manager, set by the CLI, with documented rotation steps. Nothing secret in `.env` files or the repo.
- Document that the Firebase web config is public by design: protection comes from the rules and App Check, not from hiding it.
- The Algolia search key restricted to `search` only, with rate limits and allowed referrers.

**Payments**
- Hosted payment pages only (Stripe Checkout, the NETOPIA hosted page), so card data never touches the store. This keeps PCI compliance at the simplest level (SAQ A).
- Amounts computed on the server, idempotent order creation, a payment-window clean-up (already done), and a daily reconciliation job comparing orders with provider records.

**Web application**
- Security headers: a nonce-based CSP, HSTS, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`.
- React escapes output by default. Pass any rich text (legal pages, descriptions) through a sanitiser (DOMPurify) before display.
- Keep the image optimizer restricted to the store's own bucket (already done). Keep redirects limited to the store's own origins (already done).

**Supply chain**
- Lockfiles committed. Dependabot or Renovate for updates. An `npm audit` gate in CI. CodeQL and OpenSSF Scorecard.
- GitHub Actions pinned to commit hashes, releases with provenance, and as few dependencies as possible.

**Privacy and GDPR**
- A data map of what is stored, where and why, and the processors used (Google/Firebase, Algolia, Stripe, NETOPIA, the e-mail provider).
- Customer self-service: data export and account deletion (deletion exists; add export).
- Retention rules: invoices kept as long as the law requires, the `DeletedUsers` archive minimised and time-limited, no PII in logs.
- A consent banner only when the owner enables analytics or marketing tools. Legal page templates the owner adapts.

**Operations**
- Backups (point-in-time recovery and scheduled exports), monitoring and alerts, and an incident response runbook (who does what if a key leaks or data is exposed).
- `SECURITY.md` with a disclosure policy, and security advisories for releases.

**Verification**
- Rule tests and dependency audits on every pull request.
- An OWASP ZAP baseline scan against each preview deployment.
- A manual review against the OWASP ASVS (level 2) before 1.0, then an external penetration test.
- A threat model review with every major release.

---

## Suggested order and size

| Phase | Size | Depends on |
|---|---|---|
| 0. Open-source readiness | Small | Decisions above |
| 1. Security baseline | Medium | Phase 0 |
| 2. Architecture cleanup | Medium–large | Phase 1 (the rule tests protect the refactor) |
| 3. White-label configuration | Large | Phase 2 |
| 4. Setup experience | Large | Phase 3 (the wizard edits the new settings) |
| 5. Pluggable integrations | Large | Phase 2; can run alongside Phases 3–4 |
| 6. Quality and operations | Medium | Ongoing from Phase 1; finish before 1.0 |
| 7. 1.0 launch | Small | Everything above |

Phases 0 and 1 make the project safe to publish. Phases 3 and 4 deliver the "anyone can set up a store" promise. Phase 5 makes it last.
