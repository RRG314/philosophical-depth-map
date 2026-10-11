# Release verification — 0.2.0

Checked 2026-10-11. These are engineering results, not empirical evidence about people or philosophical methods.

| Area | Result |
|---|---|
| TypeScript frontend and Worker | Type checks, lint and production Vite build pass |
| Unit/integration suite | 31 tests pass, including the original application |
| Deterministic parity | 78 items × 4 methods × 4 stages = 1,248 Python/TypeScript trace comparisons pass |
| Allocation import | A completed TypeScript rehearsal validates through the Python collector's independent allocation/schedule/replay checks |
| Browser suite | 12 tests pass across desktop Chromium and Pixel 7 emulation |
| Browser behavior | Four-turn demo, persistence, replay verification, 24-response rehearsal, blind export/import, human rating/save/export, all new routes and original game regression |
| Accessibility | Automated axe checks and horizontal-overflow checks pass for exercised routes and scoring states; manual screenshots inspected; not a full accessibility certification |
| Python analyses | 7 standalone Lab tests pass; existing 7 analysis tests pass |
| PostgreSQL | Both migrations and protection tests pass on PostgreSQL 17; private collector separately passes real transaction/approval/consent/duplicate tests under the non-superuser `lab_collector` role |
| Optional AI transport | Worker dry-run bundles; four method protocols tested through injected provider fixtures; no live credentialed model calls claimed |
| Sources | 28 annotated references with explicit verification levels; 46 learning links checked; BibTeX generated |
| Statistical executable | Seeded 80-participant synthetic fixture generated and analyzed; results are marked synthetic and not committed as empirical findings |

The optional PostgreSQL test skips in the dependency-free Python suite unless an explicit disposable database URL is supplied. It runs separately in CI after migrations, canonical seed and least-privilege role setup. Public Pages has no research database credentials and does not execute Python.

A real study still requires institutional determination, actual consent, recruitment controls, independent rater training, model qualification where applicable, preregistration and participant data. Public local concealment is not secure server-side allocation. The optional coordinator collector accepts approved logs; it does not authenticate the historical truth of a participant's answers or provide public enrollment. Replay checks internal consistency, not cryptographic provenance.
