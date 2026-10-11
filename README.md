# Philosophical Depth Map

Start with a question. Follow your reasoning. See where it takes you.

[Play the public prototype](https://rrg314.github.io/philosophical-depth-map/) · [Source and release history](https://github.com/RRG314/philosophical-depth-map)

An ocean-themed, local-first philosophical exploration game. This is a separate project from DDEH. It separates concept knowledge, observed reasoning evidence and exploration rewards. It does not measure intelligence, moral worth or a validated universal philosophical depth.

## Run

Node 22.12+; Python 3.11+ for analysis tests.

```
npm ci
npm run dev
npm run check
npm run test:analysis
npx playwright install chromium
npm run test:e2e
npm run build
```

The dev URL is printed by Vite. No account, API key or research consent is needed. Browser IndexedDB stores your journal on that browser/origin; export before switching devices or hosts. Hash routes survive GitHub Pages refresh. Local-only does not guarantee browser storage will never be cleared.

## What is here

- Interactive [3D expedition](https://rrg314.github.io/philosophical-depth-map/#expedition): nine ocean destinations, including GEBCO Mariana terrain, 12 attributed Sketchfab assets (including 24 soft-coral forms), wildlife animation, keyboard/touch controls, equivalent text inquiries, and shared journal progress. [Asset licenses](public/assets/ocean/ATTRIBUTION.md).
- Eight philosophical domains; 160 authored, versioned draft questions; 16 fixed introductory assessment items.
- Position, reason, objection, response and concept-discovery loop; selectable exploration branches, saved drafts, revisits and original responses.
- Objective concept checks where appropriate. Six optional evidence-backed self-reflection dimensions, with NA excluded and transparent domain/skill summaries.
- Typed directed graph, concept library, accessible relationship list, rendered ocean preview and SVG result animation, skippable results animation, exploration XP and ten achievements.
- Local journal, import validation, export, deletion, reduced motion, keyboard forms and mobile layouts.
- Optional separately deployable AI guide/evaluator Worker with validated outputs, consent, provider abstraction and shared usage limits.
- Executable PostgreSQL migration and isolation tests. Research collection remains disabled.
- Verified 26-source research register, seven study protocols and draft ethics packet; Python descriptive/reliability tools with synthetic fixtures; gated future IRT/DIF entry point.

## Deployment

GitHub Actions verifies before publishing to Pages. Production base is `/philosophical-depth-map/`; routes use `#`. Enable Pages with GitHub Actions as its source. For another repository name, change VITE_BASE_PATH in the workflow. For a custom domain, set base `/`, add DNS and GitHub Pages domain settings, and update allowed AI origins. Export/import transfers journals across origins; there is no automatic migration.

AI is optional: [service setup](server/README.md). PostgreSQL: [migration and dictionary](database/README.md). Research methods: [research overview](research/README.md). Analysis: [limits and commands](analysis/README.md). [Roadmap](ROADMAP.md), [security](SECURITY.md), [privacy](PRIVACY.md), [verification](VERIFICATION.md).

## Honest boundaries

The item bank has structural/editorial review, not independent expert validation. Difficulty labels are hypotheses. The fixed assessment is standardized in delivery only; it is not psychometrically standardized or calibrated. Current summaries are self-ratings, not latent proficiency. Examples are illustrative, not required philosophical opinions. Content and bibliography need broader cultural and specialist review. No human subjects, norms, efficacy findings, novelty claim or ethics approval are represented.

AI credentials and Cloudflare deployment are not bundled. Mock-provider tests are engineering tests, not live model evaluation. Research accounts, cloud sync, a rater dashboard, production consent/withdrawal services, full dialogue and validated adaptive testing are future work. Advanced R analysis is gated and not yet numerically tested. All synthetic records are clearly identified. See the checklist for exact release status.


## Philosophical Reasoning Lab (0.2)

A separate application at `/#lab` compares four versioned dialogue conditions, with deterministic browser/Python engines and an optional common-model backend. It includes 60 structured intervention problems, 18 disjoint assessment items, local experiment rehearsal, replayable history, blind human scoring and separate fidelity review. `/#learn` provides 46 verified reading links. Original Depth Map data and routes remain separate.

Start with [Lab documentation](lab/README.md), [methodology](lab/research/METHODOLOGY.md), [literature review](lab/research/LITERATURE_REVIEW.md), [annotated bibliography](lab/research/ANNOTATED_BIBLIOGRAPHY.md) and [integration specification](lab/INTEGRATION.md). Research collection remains disabled. AI execution requires server credentials; no efficacy or psychometric validation is claimed.

## October 11 audit and expedition

[Audit findings and study boundaries](research/audits/2026-10-11-audit.md) document reproduced scoring, assessment-contamination and AI-accounting defects, fixes, and unresolved content-validity gaps. Engagement now counts distinct, nonblank explorations equally whether a conclusion changes or is retained. Saved questions and spaced revisits appear at optional reading stations. Ocean travel is a reward for text exploration, not a required intervention. This does not establish learning efficacy.

The 3D route lazily loads Three.js and the assets needed for its current habitat (roughly 5–20 MB, then browser-cached). The text route works without WebGL. The Mariana destination preserves metre-scale elevations and distances in a regional GEBCO grid; other destinations are authored habitats. None is a diving or marine-ecology simulator. Author credits and licenses appear in the game and ship with the GLBs.
