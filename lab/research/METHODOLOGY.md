# Protocol four-methods-1.0

Status: executable local rehearsal; research collection disabled. No results from people have been collected by this application. Synthetic fixtures test software only.

## Unit, treatments and estimands

Assign at participant level to Cartesian, Socratic, pragmatist or neutral dialogue. Deterministic and LLM implementations are distinct experiments/cohorts: do not pool them as interchangeable treatment realizations. Within an AI comparison, use one pinned provider model, temperature 1, maximum 1,800 output tokens, no provider response storage request, and prompt protocol lab-protocols-1.0. A provider may retain data under its own terms despite `store:false`; obtain approval for that processor separately.

The primary outcome is not yet preregistered. Before enrollment, select one task-relative dimension or a justified multivariate strategy, its analysis, minimum meaningful effect, power assumptions, exclusions and multiplicity policy. Software currently reports all eight dimensions descriptively and contrasts each method with neutral. No weighted universal score is computed.

## Flow and budgets

Six pre-assessment items, three sampled intervention items with four turns each, six post-assessment items. Optional six-item delayed form opens seven days after the final post response. Four method stages and a 4,000-character response ceiling apply to all intervention conditions. AI responses must total no more than 100 words across three fields. Deterministic questions are fixed authored templates; exact reading load is not equated. No fixed time limit is claimed. Empty responses are retained as missing opportunities, not converted automatically to zero.

Each form has one item per domain. Intervention sampling is seeded Fisher–Yates across 60 items; it is not stratified within an individual three-item session. Independent seeded streams determine assignment and phase order. IDs, seed, version and schedule persist. Local UUIDs are pseudonymous device records, not identity verification; a person can create multiple sessions. Production recruitment must enforce one allocation per enrolled participant and log deviations.

Assessment pools never appear as interventions in this Lab. Public source code and the Depth Map's related questions make prior exposure possible. Record prior use, define exposure exclusions and consider fresh embargoed assessment forms before a study. Disjoint forms prevent exact within-session repeats; they do not establish parallel-form equivalence.

## Measurement and masking

Eight human-rated dimensions: reconstruction, assumptions, consistency, objections, justification, uncertainty, integration and relevance. Anchors are in `src/lab/core/evaluation.ts`. Score 0–4 only when the task affords evidence; otherwise choose not observed/not applicable and explain. Strong concise answers can reach the highest anchor. Defending a position or rejecting the prompt's premise can qualify. Moral agreement with a rater is not a criterion.

Blind packets contain random response IDs, item wording/version and response text. Participant IDs, phase, method and implementation remain in a separately exported coordinator key. Never send that key to outcome raters. Raters work independently and export their files before discussing disagreements. Importing two files permits weighted kappa calculations. Aliases alone cannot prove rater independence. Record training, anchor examples, calibration rounds, disagreements and adjudication separately; preserve original ratings.

Condition-aware fidelity review uses a separate page and export. Apply checks to the appropriate opportunities across a dialogue, not as a demand that every turn contain every feature. Lock outcome ratings before exposing condition logs. Neither fidelity nor AI self-report is an effectiveness outcome.

## Analysis

`python3 lab/python/research.py synthetic --output /tmp/lab-synthetic.json --seed 2026`

`python3 lab/python/research.py analyze --input /tmp/lab-synthetic.json --output /tmp/lab-analysis.json --seed 2026`

Input JSON consists of rows with synthetic, participant, item, phase, condition, implementation, criterion, rater, score (0–4 or null). The script averages raters within item, items within participant/phase, and estimates pre/post changes and method-minus-neutral differences. Percentile bootstrap resamples participants within treatment. It reports pairwise quadratic kappa per criterion, observed item counts and missing rating counts. These exploratory intervals are unadjusted and condition on the item bank. They are not power calculations or evidence of generalization to all philosophical questions.

For an approved confirmatory study: preregister ordinal and baseline-adjusted sensitivity models; account for participant and item dependence with crossed effects; model rater effects where warranted; inspect attrition, exposure and implementation errors; conduct a missing-data sensitivity analysis; report all prespecified outcomes and deviations. Do not treat a participant's many item responses as independent participants.

## Approval and security gates

Public mode is explicitly rehearsal. No public research enrollment endpoint exists. A separate coordinator-only import service defaults to disabled; it requires both server configuration and approved database/consent records. PostgreSQL migration 002 creates a separate schema with forced row-level security and no write policies or public grants. The configuration's collection flag requires an approval reference and timestamp. A database administrator can bypass these restrictions; deployment policy and institutional review remain necessary.

An approved research service must authenticate participants and raters; enforce allocation, budgets, consent versions and withdrawal server-side; issue scoped blind packets; encrypt and retain data according to policy; support access/deletion requests and audited exports. Optional AI processing is separately consented to in the interface and never implies consent to research collection. Do not deploy an unauthenticated research-write endpoint around this schema.

After independent ratings are locked, the authorized coordinator can join the blind packet and private key:

```sh
python3 lab/python/join_ratings.py --packet lab-blind-packet.json --key lab-coordinator-key-PRIVATE.json --ratings reviewer-a.json reviewer-b.json --output ratings-for-analysis.json
python3 lab/python/research.py analyze --input ratings-for-analysis.json --output analysis.json
```

The join rejects unmatched IDs, duplicate rater/criterion records, unknown rubrics and invented evidence excerpts. Preserve source exports and hash them with the analysis manifest. Never redistribute the coordinator key with the blind packet.
