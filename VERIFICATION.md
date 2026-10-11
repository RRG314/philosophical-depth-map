# Verification record — 10 October 2026

Local macOS arm64, Node 22.22.0. Versions are locked in package-lock.json. Results below are engineering checks, not philosophical or psychometric validation.

| Check | Result |
|---|---|
| npm run check | ESLint, frontend and Worker TypeScript, production build, 18 Vitest tests passed |
| npm run test:e2e | Desktop and Pixel 7 Chromium: complete exploration, branching/revision, 16-item assessment, reload/resume, export/import/delete; malformed import and reduced motion; public route/axe/overflow checks |
| python3 -m unittest discover -s analysis | Six tests passed: missing denominator, kappa, ICC/alpha, seeded bootstrap, contrast and input validation |
| PostgreSQL 17 migration/test.sql | Executed against disposable local cluster; transactional schema, anonymous isolation, participant scoping, denied writes and foreign-key checks passed |
| wrangler deploy --dry-run | Bundled Worker and Durable Object bindings successfully; no actual deployment implied |
| Local Worker HTTP | /health reports aiConfigured:false and researchEnabled:false; research POST returns 503 |
| npm audit --omit=dev | Zero known production dependency vulnerabilities at time of check |
| Skill Playwright client | Executed supplied client; screenshot visually inspected and game-state text inspected |

The first browser attempt was blocked by missing Chromium; installed the matching browser. Initial axe run found 4.42:1 contrast in domain numbering and nested interactive SVG/scroll-region focus issues. Colors, SVG semantics and keyboard scrolling were corrected; repeated 13-route desktop/mobile audits passed. Automated checks do not certify full WCAG conformance or Android hardware/assistive-technology behavior.

The built app includes the entire question bank for local browsing; approximately 1 MB uncompressed JS / 173 KB gzip at this stage. Vite warns about the large chunk. No external fonts, trackers or image assets are required. Real-device battery profiling, broad browser compatibility, formal load testing and full independent security review have not been performed.

AI tests use explicitly named synthetic provider fixtures. No live provider key, model scoring benchmark or human-rater comparison was available. The provider adapter and HTTP fail-closed paths were tested; a production Cloudflare deployment was not. Atomic reservation logic is unit tested; actual distributed load behavior needs deployment testing. R advanced calibration entry point is documented and gated, but not executed; Python formulas were tested on engineering fixtures only. No experiment has run.

Production hosting verification will be appended after GitHub Actions succeeds. Never infer deployment from a successful local build.
