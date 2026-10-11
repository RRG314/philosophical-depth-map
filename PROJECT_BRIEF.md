# CODEX MASTER IMPLEMENTATION DIRECTIVE — PHILOSOPHICAL DEPTH MAP

Build a complete, publicly accessible, scientifically responsible philosophical exploration game and research platform FROM AN EMPTY REPOSITORY. Execute work directly in the repository, not merely plan it. You are the combined engineering, UX, philosophy, psychometrics, research, accessibility, and security team. Inspect existing files before changes. Make reasonable decisions without asking the owner to write code or populate content. Ask only for external credentials, account authorization, payments, institutional approval, or irreversible actions. Continue through verified milestones; commit changes and keep a resumable log. The initial frontend must work on GitHub Pages without a backend. Optional AI and research services must have secure, independently deployable backends. Do not fake deployment, citations, research data, scientific validation, or AI responses.

---

# PART I — RESEARCH AND PHILOSOPHICAL FOUNDATION

Research the proposed “philosophical deficit”: limited examination of the premises, values, justifications, and ends underlying otherwise capable practical reasoning. Treat this as an unvalidated philosophical construct, not an established condition. Investigate conceptual coherence, counterexamples, competing explanations, operationalization, and implications. Do not assume philosophy makes people moral, intelligent, politically agreeable, or more likely to revise beliefs. Separate philosophical arguments from empirical claims.
Research questions: Can depth be operationalized? Is knowledge separable from reasoning? Are abilities domain-specific? Can instrumental reasoning coexist with weak foundational reflection? Does guided exploration improve transfer? How do AI and human raters compare? Does AI systematically favor particular traditions or writing styles? Can argument development be mapped as a graph? Can a deficit be identified without defining disagreement as deficiency?
Conduct genuine literature searches through PhilPapers/PhilArchive, Stanford Encyclopedia of Philosophy, Internet Encyclopedia of Philosophy, Crossref, OpenAlex, ERIC, scholarly books, and peer-reviewed research. Cover Socratic method, Dewey, Arendt, Horkheimer, Habermas, Rawls, reflective equilibrium, King/Kitchener reflective judgment, Kohlberg, epistemic cognition, critical thinking, argumentation, intellectual humility, moral pluralism, metacognition, instrumental rationality, IRT, validity, AI grading, and game-based assessment. Follow relevant literature beyond named authors. Verify citations and DOIs; never invent findings. Create research/literature-review.md, annotated-bibliography.md, references.bib, construct-definition.md, competing-frameworks.md, validity-threats.md, research-questions.md, research-roadmap.md, source-verification.md. Each source must have a stable link or DOI, bibliographic metadata, relevance, and verification status. Distinguish original hypotheses from established research.

---

# PART II — CONSTRUCT AND MATHEMATICAL MEASUREMENT

Separate three profiles: (1) philosophical knowledge (concept recognition, argument comprehension, appropriate application); (2) philosophical reasoning (justification, assumption identification, consistency, counterargument engagement, conceptual precision, implications, reflective integration); and (3) exploration (questions, concepts, revisits, revisions, connections). Never treat XP, answer length, jargon, time spent, political conformity, or number of questions as proficiency.
Implement eight domains: ethics, epistemology, logic/argumentation, metaphysics, mind, political/social philosophy, aesthetics, and philosophy of science. Permit expansion.
Build behaviorally anchored 0–4 rubrics for justification, assumption awareness, counterargument engagement, consistency, conceptual precision, reflective integration. Give concrete positive/negative scoring examples; permit NA/not observed when prompt provides no opportunity. Score short, unconventional, uncertain, objection-to-the-question, contradictory, and revised answers fairly. Preserve evidence spans and rater explanations. Version every rubric.
Store observed scores S(i,j,k) for participant i, item j, dimension k, with missingness, applicable maximum, rater, timestamp, and item version. Calculate transparent descriptive domain/skill summaries only over applicable observations; report coverage and uncertainty. No fabricated normative percentile or universal intelligence/depth index. Design extensible graded-response IRT, multidimensional IRT, classical test theory, item calibration, factor analysis, differential item functioning, reliability, test-retest, invariance, and longitudinal models. Implement analysis only when data supports it. Include mathematical documentation, reproducible scripts, synthetic test fixtures clearly marked synthetic, and assertions against missing-data and denominator errors.

---

# PART III — TECHNICAL ARCHITECTURE AND PUBLIC WEBSITE

Use a maintainable TypeScript stack: React, Vite, TypeScript, accessible styling, client-side routing compatible with GitHub Pages subpaths and refresh, IndexedDB, Vitest, Playwright, GitHub Actions. Alternatives require written rationale. Build actual working Home, Start Exploring, Assessment, Philosophy Map, My Progress, Achievements, Philosophy Library, About, How Scoring Works, Research & Methodology, Privacy & Data, Accessibility, and Settings pages. No dead buttons, lorem ipsum, placeholder routes, or mock successes. Optimize for mobile Android, keyboard and screen readers.
Public copy must sound human and welcoming, not like AI marketing. Suggested heading: “How deep does a question go?” Invitation: “Start with a question. Follow your reasoning. See where it takes you.” Avoid “unlock your genius,” “revolutionary AI-powered,” fake scientific rankings, and excessive glowing tech visuals. Design a distinctive ocean identity with clear typography, readable contrast, and restrained motion.
Create an actual first-visit path, accessible explanations, guided assessment, free exploration, return dashboard, saved questions, history, revisions, concept library, profile and next-step suggestions. Registration is optional, not required for core play.

---

# PART IV — GAMEPLAY, CONTENT, AND KNOWLEDGE GRAPH

Implement the loop: choose question → state position → explain → encounter objection/counterexample → defend/revise/qualify → discover linked concept → update map → earn exploration progress → continue or return. Mix multiple choice, short text, argument reconstruction, dilemma, and reflection cards; never demand essays for every interaction.
Create at least 160 substantive, curated, versioned question records across eight domains; avoid trivial paraphrase padding. Include a smaller high-quality standardized assessment subset. Each record needs stable ID, version, domain, concepts, philosophical references, response type, difficulty hypothesis (NOT calibrated difficulty), opportunities to demonstrate skills, fixed assessment follow-ups, exploration branches, rubric ID, editorial/review status, and calibration status. Include real prompts and worked sample scoring anchors. Build content integrity tests.
Represent the philosophical ontology as a typed directed multigraph G=(V,E,tauV,tauE): concepts, questions, positions, arguments, objections; relationships prerequisite, supports, objects-to, responds-to, implies, distinguishes, historically-associated-with. Mark contested claims as contested; do not assert every ethical theory requires the same premises.
Assessment mode uses fixed standardized paths or future calibrated adaptive selection; exploratory mode branches on participant response, gaps in demonstrated reasoning, interests, visited nodes, and unresolved objections. Never use AI-generated questions as scored standardized items without review and calibration. Implement graph traversal, navigation, and accessible text alternative.
Build XP, domain exploration milestones, achievement unlocks, concept discoveries, saved reflections, repeat visits, history, progress export/import, and deterministic tests. XP is for exploration, not depth. Achievements include First Question, Devil’s Advocate, Hidden Assumption, Two Sides, Into the Deep, Reconsidered, Bridge Builder, Unanswered Questions, Long Conversation, Cartographer. No streak pressure or punishment for revision.

---

# PART V — OCEAN, DIVER, AND VISUAL RESULTS

Create original SVG/Canvas/CSS visuals and real animations. Ocean regions: Surface, Sunlit Waters, Reef, Twilight, Midnight, Abyss, Trenches. These indicate exploration milestones, NOT scientific rankings. Small floating diver companion with swim/idle/descent/surface states, water column, depth ruler, current milestone, expand/minimize/dismiss, saved preference, mobile-safe positioning, reduced-motion and no obstruction. Do not copy proprietary assistants. Contextual philosophical prompts may be offered sparingly.
Implement skippable end-of-session dive animation: diver enters water, descends through explored layers, encounters discovered concepts, stops at exploration milestone, and reveals separately the assessed skill profile, knowledge results, evidence coverage, unassessed areas, saved questions, and recommended next branches. Support sound mute and no-motion alternative. Optimize battery/performance. Build functional SVG/Canvas assets, not static mockups.

---

# PART VI — AI SYSTEM AND SCIENTIFIC GUARDRAILS

AI is an intentional optional component. Build a secure serverless backend with provider abstraction, configuration, schema validation, streaming or reliable response handling, rate limits, cost caps, abuse protection, logging minimization, and error handling. GitHub Pages must NEVER contain secret API keys. The game must work fully without the backend. No simulated AI passed off as live AI. Check current SDK documentation rather than guessing deprecated APIs.
AI Socratic guide can ask follow-ups, identify assumptions, propose counterexamples, explain concepts, compare frameworks, and encourage reasoning without prescribing ideology. AI scoring must be a separate, clearly provisional structured evaluator returning rubric version, dimension scores, evidence excerpts, missing evidence, rationale, abstention/uncertainty, model, prompt version, timestamp. Preserve original responses. Compare against blinded independent human raters before claiming reliability. Test biases toward verbosity, formal vocabulary, conventional political positions, traditions, and language style. Prompt injection defenses and untrusted input handling are mandatory.
With explicit research consent, instrument model/version, prompt/version, condition assignment, feedback categories, revisions, human-AI disagreement, latency, errors, token usage, and costs. Support controlled comparisons of AI-assisted, fixed-prompt, and unaided exploration. AI outputs cannot silently modify the official question bank or scientific scoring standards.

---

# PART VII — DATA, CONSENT, AND RESEARCH ETHICS

Create a normalized PostgreSQL research schema and executable migrations for participants/pseudonymous IDs, consent/version, assessment/exploration sessions, questions/versions, responses/revisions, graph concepts/edges, rubrics/versions, human/AI ratings, model/prompt metadata, proficiency estimates/uncertainty, calibration, achievements, event logs, experimental assignments, exports, deletion requests, and audit logs. Enforce access policies and privacy; create a data dictionary. Keep raw and derived records separate and preserve provenance. Supabase or equivalent may be used if appropriate and low-cost.
Implement local-first IndexedDB progress, resume, export/import, and delete without account. Remote research submission must require an actual backend and explicit opt-in. Never claim local records were submitted. Game access must not require research consent. Create versioned informed consent, withdrawal/deletion process, privacy notice, retention plan, disclosure of third-party AI processing, research opt-out, and separate game vs research data flows. Minimize PII, avoid inferred demographics, and do not enroll minors into research without appropriate approval.
Prepare an IRB-ready protocol packet, risk/benefit analysis, recruitment text, consent materials, privacy and security plan, and proposed human-subjects methods. DO NOT claim IRB approval or exemption; disable research enrollment/collection pending any required institutional authorization. Allow publicly usable game and local progress meanwhile.

---

# PART VIII — VALIDATION AND REPRODUCIBLE SCIENCE

Plan and document seven studies: A construct analysis and expert review; B blinded inter-rater reliability; C factor structure and convergent/discriminant validity; D instrumental reasoning versus foundational reflection; E randomized comparison of AI, fixed Socratic prompts, and independent exploration with pre/post and transfer items; F AI-human scoring agreement and bias; G longitudinal change and delayed transfer. Include hypotheses, outcomes, alternatives, confounders, sampling, missingness, power-planning approach, inclusion/exclusion criteria, preregistration templates, and limitations.
Implement Python or R scripts for cleaning, descriptives, reliability (weighted kappa/alpha/ICC as appropriate), item analysis, factor/IRT when justified, invariance/DIF, experimental contrasts, uncertainty intervals, and longitudinal plots. Unit-test calculations. Synthetic fixtures are for engineering tests only and must never appear as empirical findings. Separate raw, cleaned, derived, outputs, and publication figures. Record seeds, dependencies, versions, and analysis decisions. Never fabricate results, significance, population averages, or norms.

---

# PART IX — ACCESSIBILITY, SECURITY, AND QUALITY

Target WCAG 2.2 AA: keyboard navigation, focus, contrast, screen-reader support, accessible forms, text resizing, reduced motion, non-color status, alternative map view, touch targets, and mobile support. Threat-model keys, injection, XSS, CSRF as applicable, unsafe imports, API abuse, participant isolation, research data leakage, unauthorized writes, and third-party AI processing. Validate input/output; secrets server-side; implement access controls, rate limits, secure logging, deletion and export.
Unit tests: scoring/NA, rubrics, branching, graph, achievements, XP, persistence, import/export, versioning. Integration: full assessment, exploration, AI backend and outage, consent, synchronization, access controls. Playwright E2E: first visit → question → branch → achievement → dive → reload → restored progress → assessment → results → export → deletion. Test desktop and mobile. Audit performance, bundle, accessibility, failures, and cost. Do not claim features tested unless tests actually ran.

---

# PART X — GITHUB PAGES AND REPOSITORY DELIVERY

Configure production Vite base path, subpath-safe routes/refresh, GitHub Actions CI (install, lint, typecheck, test, build, deploy), GitHub Pages artifact and deployment. Prepare later custom domain migration. Backend deploy independently with environment example, migrations, health check, provider config, limits, monitoring, and deployment instructions. If account authorization or keys unavailable, leave truthful deploy-ready artifacts and document blockers; frontend remains playable.
Create README.md, CONTRIBUTING.md, LICENSE, CHANGELOG.md, SECURITY.md, PRIVACY.md, ARCHITECTURE.md, ROADMAP.md, CITATIONS.md, and full /research directory. Add installation, scripts, CI, testing, data dictionary, release notes, costs, limitations, and source verification. Commit meaningful milestones and maintain DEVELOPMENT_LOG.md plus a persistent checklist.

---

# PART XI — EXPANSION ROADMAP

Version 1.0: complete public static game, eight domains, 160 curated records, standardized introductory assessment, branching, transparent rubric summaries, knowledge map, diver/ocean, achievements, local profiles, export/import, verified research review, privacy, mobile accessibility, GitHub Pages, optional secure AI backend.
Version 2.0: full AI Socratic dialogue, secure accounts, sync, research DB and consent workflows, human/AI comparisons, research admin dashboard, expanded graph/question bank, analysis exports.
Version 3.0: real calibration studies, reliability/validity, IRT, invariance, longitudinal studies, bias auditing, population norms only with defensible samples.
Version 4.0: institutionally approved studies, researcher collaboration, preregistration, cohorts, controlled experiments, cross-cultural/multilingual assessments, scholarly outputs and consent-compatible datasets.
Version 5.0: moderated collaborative debates, community argument maps, historical philosophical journeys, simulations, advanced interlocutors, classroom mode, user-submitted reviewed questions, deeper ocean environments.
For each version, create milestones, dependencies, rough cost/complexity, measurable acceptance criteria, and research prerequisites. Do not conflate future roadmap features with implemented features.

---

# PART XII — DEFINITION OF DONE AND EXECUTION DIRECTIVE

Version 1.0 is done only when: production build works; every public page functions; assessment completes; real curated content and branching work; rubric summaries reproducible; map interactive; diver and result animations function; achievements unlock; local data persists; import/export/delete work; core game works offline from AI; optional AI adapter/backend tested; verified scholarly references exist; database schema/migrations and consent infrastructure are implemented; automated tests and accessibility checks run; GitHub Pages configuration works; roadmap and known limitations are documented.
Execute in phases: A inspect repo, literature, construct, architecture; B frontend/game/content/scoring/map; C ocean/diver/achievements; D AI/backend/database/consent/analysis; E testing/security/accessibility/docs/deploy; F audit/fix. Do not stop at a plan or scaffold. Work autonomously, verify each milestone, and commit. If context or execution ends, leave precise continuation instructions and resume next time.
Final report must state implemented, tested, deployed, unvalidated, blocked, and future separately; show commands/tests and actual deployment URL only if deployed. No invented evidence, fake citations, false completion, or claim that software proves the philosophical deficit. BEGIN IMPLEMENTATION NOW. Build actual files and content; test and correct until acceptance criteria are met or an explicitly documented external blocker prevents progress.
