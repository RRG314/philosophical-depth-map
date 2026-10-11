# Philosophical Depth Map

Start with a question. Follow your reasoning. See where it takes you.

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

- Eight philosophical domains; 160 authored, versioned draft questions; 16 fixed introductory assessment items.
- Position, reason, objection, response and concept-discovery loop; selectable exploration branches, saved drafts, revisits and original responses.
- Objective concept checks where appropriate. Six optional evidence-backed self-reflection dimensions, with NA excluded and transparent domain/skill summaries.
- Typed directed graph, concept library, accessible relationship list, original SVG ocean/diver, skippable results animation, exploration XP and ten achievements.
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
