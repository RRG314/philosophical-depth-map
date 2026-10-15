# Verification record — 10 October 2026

Local macOS arm64, Node 22.22.0. Versions are locked in package-lock.json. Results below are engineering checks, not philosophical or psychometric validation.

| Check | Result |
|---|---|
| npm run check | ESLint, frontend and Worker TypeScript, production build, 22 Vitest tests passed |
| npm run test:e2e | Desktop and Pixel 7 Chromium: complete exploration, branching/revision, 16-item assessment, reload/resume, export/import/delete; malformed import and reduced motion; public route/axe/overflow checks |
| python3 -m unittest discover -s analysis | Seven tests passed: missing denominator, kappa, ICC/alpha, seeded bootstrap, contrast and input validation |
| PostgreSQL 17 migration/test.sql | Executed against disposable local cluster; transactional schema, anonymous isolation, participant scoping, denied writes and foreign-key checks passed |
| wrangler deploy --dry-run | Bundled Worker and Durable Object bindings successfully; no actual deployment implied |
| Local Worker HTTP | /health reports aiConfigured:false and researchEnabled:false; research POST returns 503 |
| npm audit --omit=dev | Zero known production dependency vulnerabilities at time of check |
| Skill Playwright client | Executed supplied client; screenshot visually inspected and game-state text inspected |

The first browser attempt was blocked by missing Chromium; installed the matching browser. Initial axe run found 4.42:1 contrast in domain numbering and nested interactive SVG/scroll-region focus issues. Colors, SVG semantics and keyboard scrolling were corrected; repeated 13-route desktop/mobile audits passed. Automated checks do not certify full WCAG conformance or Android hardware/assistive-technology behavior.

The built app includes the entire question bank for local browsing; approximately 1 MB uncompressed JS / 173 KB gzip at this stage. Vite warns about the large chunk. No external fonts, trackers or image assets are required. Real-device battery profiling, broad browser compatibility, formal load testing and full independent security review have not been performed.

AI tests use explicitly named synthetic provider fixtures. No live provider key, model scoring benchmark or human-rater comparison was available. The provider adapter and HTTP fail-closed paths were tested; a production Cloudflare deployment was not. Atomic reservation logic is unit tested; actual distributed load behavior needs deployment testing. R advanced calibration entry point is documented and gated, but not executed; Python formulas were tested on engineering fixtures only. No experiment has run.

Production hosting verification is recorded below; a local build alone is not deployment evidence.

## Production verification

GitHub Actions run [38109807934](https://github.com/RRG314/philosophical-depth-map/actions/runs/38109807934) completed successfully, including CI tests, PostgreSQL migration/policies, Worker packaging, subpath production build and Pages deployment. The actual URL returned HTTP 200: https://rrg314.github.io/philosophical-depth-map/ . A fresh mobile Chromium context loaded the production page, navigated to a question and preserved a written draft after reload; no page errors occurred. Observed in this single unthrottled smoke run: approximately 175.6 KB JS + 3.8 KB CSS transferred, first contentful paint 748 ms, viewport/scroll width both 412 px. These are environment-specific observations, not a performance guarantee or field study.

Final hardening adds all-achievement/version tests, a valid provisional-evaluator fixture, rectangular-matrix checks, connected graph selection, persisted rubric drafts, readable source formatting, and stronger cross-owner/evidence database tests. Current local totals: 22 Vitest tests, seven Python tests, six Playwright tests (two browser profiles); final CI reruns these before deployment.

## Ocean and audit update — 11 October 2026

This section supersedes earlier rendering/progress descriptions; earlier verification remains a historical record.

- `npm run check`: lint, frontend/Worker type checks, production build, **52 tests across eight files passed**. New checks cover equal exploration credit, assessment exclusion, provider usage settlement, argument-engine parity, shipped GLB hashes/licenses, metre-scale bathymetry and wall collision.
- `npm audit`: **zero reported vulnerabilities**, including development dependencies, on this date. This is not a security certification.
- Earlier in this update: seven statistical-analysis Python tests passed; seven Lab Python tests passed with the optional PostgreSQL collector test skipped locally; Wrangler dry-run succeeded. Live provider calls and production Worker deployment were not performed.
- Visual inspection found and corrected missing skeletal motion, floating reef bounds, excessive surface distortion and unlit submersible materials. Actual screenshots were inspected at shoreline, reef, deepest Mariana sample and a trench-wall waypoint. The regional grid resolves broad slopes; fine-scale cliffs are not available from these data. Art direction and real-device performance still need user testing; passing tests is not proof of visual quality.
- A journal-reset race was reproduced through browser reload and corrected. Deletion is now acknowledged after the durable write completes.
- Desktop/mobile browser-suite and deployment results are recorded in the release entry below after execution. No participant study or scientific validation is claimed. Research collection remains disabled.

## October 11 interface and reef follow-up

- `npm run check`: lint, frontend/backend TypeScript, production build, and all 52 unit tests passed. Vite still reports the existing large-chunk advisory.
- Twelve public-site and Lab desktop/mobile browser tests passed on the revised interface (53.9 seconds), including storage, assessment, replay, learning search, route accessibility and overflow.
- New station-marker tests passed on desktop and mobile: real projected target click, visible question text, Escape/focus restoration, camera-drag separation, native reading-dialog accessibility and entry into the writing flow.
- Full desktop ocean traversal reached all nine destinations, verified asset loading, movement and journal/draft preservation. The final axe check found a 4.3:1 selected-destination number. The foreground was lightened and the targeted full-page axe check now reports zero violations. The mobile traversal and GitHub release gate are recorded separately after completion.
- Inspected screenshots from the supplied web-game client and fresh home, Explore, Learn, Lab, reef, reading-dialog and mobile renders. These are software/interface observations, not user-study evidence or proof of photorealism.
- Twelve licensed Sketchfab packages ship locally. The added Soft Coral Set is 1,687,668 bytes with 28,110 original triangles across 24 component meshes. Credits and SHA-256 manifest were updated. The screenshot cover adds about 87 KB.
- Earlier run 38159210850 failed two long ocean tests on software rendering and did not deploy. Offscreen/dialog rendering now pauses; StrictMode no longer initializes the renderer twice. Traversal tests use reduced ambient motion with explicit movement steps, while the supplied client also exercises ordinary ambient rendering.

The full mobile traversal subsequently reached all nine destinations and saved/reloaded a reflection, then exposed a rapid return-navigation race: the prior modal could survive when the intermediate hash route was superseded. Starting an inquiry now explicitly closes the native dialog and clears selection before navigation. The strengthened marker/return/draft regression passed on both profiles (58.9s desktop, 42.2s mobile); lint, typechecking, build and 52 unit tests passed again. Twelve public/Lab checks remain passing. The superseded GitHub run 38162004048 was cancelled before deployment; the replacement commit must pass the full release workflow before Pages updates. A single uninterrupted all-20-tests pass on that final commit is not claimed in this local record.

## 2026-10-11 — reading layout and visible ocean progress

- Home uses the actual reef capture as its main visual, with direct question/ocean entrances. Subjects and question browsing use index rows instead of repeated cards. Lab introductory summaries explain the methods in prose.
- DepthWindow replaces the footer companion: animated water/light, shared expedition milestones, remaining question count, direct destination link, desktop side rail and mobile strip with reserved scrolling clearance. Learn and Lab show the existing journal's depth; they do not award milestones. Existing hide/minimize choices remain valid; new journals start expanded.
- `npm run check`: lint, frontend/backend type checks, production build and all 52 unit tests passed (`output/ui-release-check.log`). Existing bundle-size advisory remains.
- Twelve public-page/Lab desktop/mobile workflows passed on this implementation (`output/ui-pass-e2e.log`). The new preference tests exposed an immediate-reload persistence race; the controls now complete their preference write before changing visible state. After correcting a lazy-route test selector, both focused depth-window tests passed (`output/depth-preference-verified.log`). The earlier combined run's two failed cases are retained in its log; it is not described as an all-pass run.
- Inspected desktop/mobile home, question index, Learn and Lab captures. Supplied web-game client captured the home/question index and structured state; no new game loop was added. Progress is a count of unique saved exploration questions, not a validated measure of philosophical ability. No empirical participant study was conducted.
- Both ocean marker/dialog/navigation regression tests passed after the layout change (desktop 1.3m, mobile 50.3s; `output/ui-ocean-regression.log`). These exercise marker clicks, camera dragging, readable question dialogs, draft protection and returning to the ocean. Full nine-habitat traversal remains part of release CI; this turn did not rerun it locally.

## 15 October 2026 — Thought experiments and community

- Featured Steven Reid's *The Last Prisoner* with an initial free-text response before the later condition. Public contextual material appears after completion; no answer key or automatic philosophical classification is included.
- Added seven-entry catalogue, community discussions/replies, moderated proposals, owner editing/deletion, reporting, bookmarks, account export/deletion, and an administrative publishing/versioning desk.
- `npm run check`: lint, frontend/Worker types, production build and 53 unit tests across nine files passed.
- Functions TypeScript build passed. Seven emulator service tests passed, including rules isolation, current role/identity enforcement, immutable versions, explicit consent/idempotency, withdrawal, account deletion, quotas, and execution of scheduled expiry against expired/unexpired fixtures.
- Two full community browser workflows passed on desktop and Pixel 7 Chromium with synthetic emulator accounts. Ten additional desktop/mobile browser cases passed for the staged offline experiment, depth window and existing Reasoning Lab. Accessibility and horizontal-overflow assertions passed. Desktop/mobile reader screenshots inspected.
- Tests exposed and fixed: duplicate Firebase component registries, editor save confirmation lost on remount, hidden initial answers in the administrative viewer, settings hydration overwriting edits, and overlapping browser trace-output folders.
- Production dependency audits returned zero known vulnerabilities for both root frontend dependencies and Functions dependencies. Development CLI transitive advisories remain; this is not a comprehensive security audit. Functions use Node 22, firebase-admin 14.5 and firebase-functions 7.4.
- New Firestore composite indexes include publication/status queues; emulator tests do not certify production index readiness. Live index deployment must complete before launch.
- No Firebase project selected, live backend deployed, live email delivery tested, custom domain configured, or real participant data collected. Consent collection remains disabled until explicitly configured. Browser staging is not tamperproof experimental concealment. Full ocean traversal remains covered by the existing CI suite; it was not rerun locally for this community-only change.
