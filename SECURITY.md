# Security policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems.

Report them privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. Include:

- what the problem is and where (file, endpoint, rule or page);
- the steps to reproduce it, or a proof of concept;
- the impact you think it has (for example, reading other customers' orders, giving yourself admin rights, changing prices).

What to expect:

| Step | Target time |
|---|---|
| We confirm we received the report | 3 working days |
| We tell you whether we can reproduce it and how serious it is | 10 working days |
| A fix or mitigation is released for confirmed critical or high-severity issues | 30 days |

We'll keep you updated, credit you in the release notes if you'd like, and publish a security advisory once a fix is available.

## Supported versions

Until version 1.0, security fixes go into the latest release on the `main` branch only. After 1.0, the latest minor release of each supported major version gets security fixes.

## Scope

In scope: the storefront and admin panel, the Cloud Functions, the Firestore and Storage security rules, and the setup and seed scripts in this repository.

Out of scope: vulnerabilities in third-party services themselves (Firebase, Algolia, Stripe, NETOPIA, Vercel), problems that need physical access to a device, social engineering, and denial-of-service tests against stores you don't own.

## Safe harbor

We won't take legal action against good-faith research that follows this policy: test only against your own deployment of the store (the demo seed makes this easy), don't access or change other people's data, and give us reasonable time to fix the problem before you disclose it.

## Running a store securely

If you deploy this project for your own shop:

- Deploy the Firestore and Storage rules from this repository together with the functions, and never replace them with open "test mode" rules.
- Keep secrets (payment keys, e-mail credentials, the Algolia write key) in Secret Manager or `functions/.env`, which is gitignored. Never commit them.
- Use a search-only Algolia key in the storefront.
- Protect admin accounts with strong, unique passwords (multi-factor sign-in for admins is on the [roadmap](docs/ROADMAP.md#security-plan)).
- Set a budget alert on your Google Cloud billing account.
- Keep your copy up to date with the latest release.
