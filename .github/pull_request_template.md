## What this changes

<!-- What does this pull request do, and why? Link the issue it closes (e.g. "Closes #12"). -->

## How I tested it

<!-- Steps you followed, and what you checked (locally, on the emulators, on a preview deployment). -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm --prefix functions test` and `npm run build` pass
- [ ] New logic has tests
- [ ] New user-facing text is in both `messages/en.json` and `messages/ro.json`
- [ ] No store-specific values (names, currency, colours, URLs) are hard-coded
- [ ] Security rules still deny by default, and price, stock, payment and permission changes happen in Cloud Functions
- [ ] No secrets, tokens or personal data in code, logs or screenshots
