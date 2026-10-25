# Upgrading a store

A store is a copy (fork) of this repository with its own Firebase project. Upgrading means bringing in the new code, then deploying the parts Vercel doesn't deploy for you.

## 1. Bring in the new code

Once, add this repository as `upstream`:

```bash
git remote add upstream https://github.com/alexandru-tiron/next-ecommerce.git
```

For each upgrade:

```bash
git fetch upstream
git merge upstream/main
npm install
npm --prefix functions install
```

Resolve any conflicts in files you changed yourself. Read the "Status" notes of the latest phase in [ROADMAP.md](ROADMAP.md) for anything that needs a step of its own.

## 2. Check it

```bash
npm run lint && npm run typecheck && npm test && npm --prefix functions test
npm run dev:demo
```

## 3. Deploy

Deploy in this order, so the backend is ready before the storefront that uses it:

1. Security rules and indexes: `npx firebase-tools deploy --only firestore,storage`
2. Cloud Functions: `npx firebase-tools deploy --only functions`
3. The storefront: push to the branch Vercel deploys.

The admin dashboard's checklist shows whether the deployed rules match the code ("Security rules up to date").

## Version notes

- **Before the white-label settings (Phase 3):** create `Settings/Localization` before deploying, or the store switches to the default euros, English and Berlin time. See section 5 of [STORE-SETUP.md](STORE-SETUP.md).
- **Before team roles (Phase 4):**
  - Accounts with the old admin right keep working as owners. Each can convert itself to the owner role in Admin → Team.
  - Delete the old `setAdminPrivilege` function after deploying: `npx firebase-tools functions:delete setAdminPrivilege --region europe-west3`. It could still hand out the old admin right, which now counts as owner.
