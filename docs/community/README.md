# Thought experiments and community

The existing React/Vite hash router now contains the featured collection, staged responses, accounts, discussion and an editorial desk. GitHub Pages remains the frontend host. Firebase Authentication, Firestore and a Node 22 callable Cloud Function form the optional persistent community service. The existing Cloudflare AI Worker and PostgreSQL research schema are unchanged. They are not alternate community backends.

## Routes and editorial workflow

- `#experiments`: searchable current page and topic filter, up to 25 entries per page. The Last Prisoner is first among the initial featured collection. Six historical cases follow it.
- `#experiment/the-last-prisoner`: canonical scenario, initial open response, then the additional condition and final open response. Context and discussion access appear after completing the responses. Other experiments use the same versioned format, with an optional later condition.
- `#community/general`, `/ethics`, `/knowledge`, `/mind`, `/reality`, `/society`: public discussions. `#community/EXPERIMENT_SLUG` is an experiment's discussion.
- `#community/submit` and `#community/submit/PROPOSAL_ID`: propose or revise a new experiment. These are proposals for new scenarios, not additional prompts inserted into existing experiments.
- `#community/questions`: publicly reviewed proposals. An administrator can prepare a proposal as a separate featured editorial experiment, review its attribution, edit it and publish it from the desk.
- `#account`: signup, login, email verification, password reset, profile name, own activity, data export, answer withdrawal and account deletion with recent authentication.
- `#admin`: trusted administrators edit/version/publish experiments, set the privacy contact, explicitly enable voluntary collection and inspect/export private answers. Moderators review posts, proposals and reports. Moderators cannot view private answers or publish official experiments.
- `#community/privacy`: privacy notice, retention and participation rules.

The home page and shared navigation lead directly to the collection. No account is needed to read or draft an answer. When Firebase is absent, the seven built-in experiments remain usable; account and upload controls explain the unavailable service rather than inventing a local forum. Drafts use tab-scoped session storage, separately from the existing Depth Map journal.

## Participant data

Submission is optional and requires a verified account plus `answers-1` consent. The owner receives initial/final free text, exact scenario and prompt wording, experiment version, account identifier, submission time, self-reported previous exposure and consent version. No target answer, classification or automatic score is encoded. Private responses are never automatically copied into public discussions. The supplied scholarly paper is not published with the initial exercise.

The staged sequence is enforced by the ordinary UI, not by a secure examination protocol. An advanced visitor can inspect the static source, visit discussions directly or revisit an experiment. The server receives both answers together after consent; it does not prove when the initial answer was composed. These volunteered responses are neither representative sampling nor scientific validation. The separate controlled Reasoning Lab enrollment remains disabled. Institutional or other research requirements must be evaluated for the owner's intended use; the software does not grant approval.

Private answers expire after 365 days; a deployed daily scheduled function removes expired records (up to 24 hours scheduling lag). Participants can withdraw sooner. An account export is bounded at 1,000 records per collection and explicitly refuses an incomplete export at the limit. Admin exports contain only the current visible page (25 records), clearly labelled; use pagination for subsequent pages. The owner must also honor withdrawal in downloaded working copies. Account deletion removes owned operational records before deleting Auth identity; interrupted deletion is retryable. Editorial publications derived from proposals are separate records and need editorial review for attribution/removal requests.

## Database and security

Collections: `experiments`, immutable `experimentVersions`, `profiles`, `posts`, `proposals`, private `responses`, `reports`, `bookmarks`, private `audit`, `limits`, and `settings/public`.

All client writes are denied by Firestore Rules. Callable `community` validates each action with strict schemas, derives ownership from the authenticated UID, verifies email for contributions, uses trusted admin/moderator custom claims, and limits each account to 30 operations per minute. Content is plain text rendered through React. Reference URLs must use HTTPS. Posts and edits require review before publication. Public queries are bounded to 25 entries (rules cap 50). Owner/private and moderator/admin boundaries are enforced independently of the interface. Indexed server timestamps are epoch milliseconds generated by the function, not accepted from a participant. The server keeps immutable experiment versions and detects stale editor saves. Submission IDs make response and post retries idempotent.

There are no uploads, direct messages, public email/profile directories, AI processing of community text, or self-service role grants. Rate limits do not prevent coordinated abuse across many accounts. Review Firebase quotas, budget alerts, and App Check before opening a large public service. Claims changes require token refresh; existing ID tokens can remain valid until expiry. Cloud-provider security logs and backups have separate retention policies. Do not log request bodies or enable detailed callable payload logging.

## Local execution without a cloud project

Use Node 22 and Java 21. On this Mac Java is available at `/opt/homebrew/opt/openjdk@21/bin/java`; add that directory to PATH for the emulators.

```sh
npm ci
npm --prefix functions ci
npm run community:build
# Terminal 1, only an isolated demo project:
npm run community:emulators
# Terminal 2:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-depth-map npm run community:seed
VITE_FIREBASE_EMULATORS=true npm run dev -- --port 5174
```

Open `http://127.0.0.1:5174/#experiments`. Emulator UI: `http://127.0.0.1:4000`. Verification/reset links appear in the Authentication emulator, not in real email. Create an account through the UI and verify using that emulator link. Bootstrap its trusted role using its emulator UID:

```sh
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GCLOUD_PROJECT=demo-depth-map node scripts/community/admin.mjs USER_UID admin
```

Sign out/in to refresh claims. Save the display name if needed. Open `#admin`. Collection defaults off; local testing may enable it with a clearly synthetic contact. The emulator flag is ignored by production builds and non-local hostnames.

```sh
# Against the running demo emulators. These tests clear demo Firestore first.
npm run test:community:service
# Seed missing catalogue entries after the service tests.
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-depth-map npm run community:seed
npm run test:community:browser
npm run check
```

The browser suite creates synthetic verified reader/editor accounts only in the emulator. It tests the actual Firebase SDK/callable/Firestore paths across separate browser contexts; these are software tests, not participant findings. CI starts fresh emulators and runs the same tests. Seed operations create missing stable IDs without overwriting editor changes or enabling collection.

## Live setup and the future domain

No Firebase project has been selected or deployed for this site. Other accessible projects were inspected by name only and not modified. No production accounts, billing changes, rules deployment or collection activation is implied by the frontend push.

1. Choose a dedicated Firebase project; use a separate staging project first. Enable email/password Authentication, create Firestore in the intended region, and review the Blaze billing requirement for Functions/scheduled cleanup. Do not attach this site to an unrelated project's live data.
2. Register a web app. Set the four public `VITE_FIREBASE_*` values in GitHub repository Variables and local `.env.local`. These are web configuration, never service-account credentials. Add `rrg314.github.io` to Auth authorized domains. Use the current Pages HTTPS address until the domain is ready.
3. With authorized Google application-default credentials, run `firebase deploy --only firestore,functions:community --project YOUR_STAGING_PROJECT`. Inspect existing rules before any deployment. This repository's rules deny unknown collections and must not replace unrelated project rules.
4. Seed reviewed content: `GCLOUD_PROJECT=YOUR_STAGING_PROJECT node scripts/community/seed.mjs --live`. This creates only missing catalogue entries and leaves collection off. Bootstrap your verified account with the admin script using the explicit project ID and privileged credentials outside the repository.
5. Test all account/email, ownership, moderation, export, withdrawal and scheduled-retention flows in staging. Repeat the reviewed deployment for the intended production project. Set an actual privacy contact in the editorial desk. Enable private submissions only after the notice and operational/research requirements have been addressed.
6. For a custom domain, configure GitHub Pages DNS and HTTPS and set the repository `SITE_BASE_PATH` variable to `/`. Add the domain to Firebase Auth authorized domains and verify email-action links. No domain purchase is needed for the current hash routes; refresh and deep links work on Pages today. The SPA's hash routes are not individually server-rendered SEO pages. Account/editorial routes set client-side noindex; access control comes from Auth and database rules, not search-engine directives.

Do not automatically deploy rules from an unreviewed frontend CI run. Before live migration, export the target Firestore data, retain the previous rules/indexes, deploy indexes first, wait for readiness, then deploy the reviewed functions/rules and frontend configuration. Roll back frontend/function versions if necessary, but preserve immutable experiment versions referenced by existing responses. Disabling collection in the desk immediately rejects new private submissions; it does not withdraw already-consented records.

## Sources checked 15 October 2026

Canonical original scenario and attribution were supplied by Steven Reid. Historical summaries are original paraphrases with links in each entry:
- Identity Over Time: https://plato.stanford.edu/entries/identity-time/
- Doctrine of Double Effect: https://plato.stanford.edu/entries/double-effect/
- Well-Being: https://plato.stanford.edu/entries/well-being/
- Qualia: The Knowledge Argument: https://plato.stanford.edu/entries/qualia-knowledge/
- The Chinese Room Argument: https://plato.stanford.edu/entries/chinese-room/
- Kant's Social and Political Philosophy: https://plato.stanford.edu/entries/kant-social-political/ (Kant, Doctrine of Right §49, Ak. 6:333).

Implementation references: Firebase Authentication emulator documentation and Security Rules emulator testing documentation at https://firebase.google.com/docs/emulator-suite/connect_auth and https://firebase.google.com/docs/firestore/security/test-rules-emulator .

## Verification at this implementation

15 October 2026: 53 unit tests, seven service/emulator tests, two full community desktop/mobile browser journeys, and ten public/Lab/depth regression cases passed. Functions compile and the production frontend builds. Both production dependency audits report zero known vulnerabilities; development Firebase CLI transitive advisories remain. Screenshots were inspected on desktop and phone. See `VERIFICATION.md` for scope and discovered/fixed defects. These are software tests using synthetic accounts, not participant research or evidence of philosophical validity. Production email delivery, deployed indexes/rules, scheduler operation, DNS and real-world moderation remain launch checks.
