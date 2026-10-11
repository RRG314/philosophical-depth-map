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
