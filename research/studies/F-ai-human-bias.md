# Study F — AI–human agreement and bias

Protocol draft 0.1 · Not registered · Not recruiting · No approval or exemption claimed

## Question and hypothesis

AI scores may differ from independent human ratings and may respond to style or conclusions despite preserved reasoning. Agreement in one model/prompt version does not generalize automatically.

## Outcomes and estimands

Ordinal agreement, mean absolute category error, directional discrepancies, evidence-span fidelity, abstention and invalid-output rates; paired score shifts under style and viewpoint transformations.

## Sampling and power planning

Consented adult responses plus clearly labeled researcher-authored matched pairs. Balance domains, short/long styles, philosophical traditions and conclusions without inferring participant demographics. Simulate paired-test precision and subgroup sizes. Final enrollment targets, stopping rule and decision thresholds must be completed before recruitment; these drafts do not supply invented power calculations.

## Design and blinding

Freeze provider/model, evaluator prompt and rubric. Human raters blind to AI score and transformation status. Independent reviewers verify meaning preservation of each pair. Randomize presentation and repeat a subset to assess stochasticity.

## Confounders and alternative explanations

Human bias, transformation quality, memorized anchors, API version changes, unequal abstention and prompt injection. Report model refusals and failures in denominators.

## Analysis

Use participant-cluster bootstrap; paired effects conditional on human-confirmed semantic equivalence. Report absolute agreement as well as rank correlation. Treat subgroup estimates with wide intervals as inconclusive. No automated replacement of raters merely because correlation is high.

## Eligibility and exclusions

Research initially restricted to consenting adults able to understand the offered consent and tasks, with reasonable accessibility accommodations. Do not infer age or demographics from text. Exclude duplicate or technically corrupted records using criteria set before outcomes are examined. Document exclusions and retain an audit count. Low scores, unusual views, disagreement, short answers and choosing “I do not know” are not exclusion criteria. Study A expert eligibility additionally requires declared relevant expertise or lived experience. Unsupported languages are a coverage limitation, not a participant deficiency.

## Missingness and deviations

Distinguish skipped item, no opportunity, withdrawal, rater abstention, API error and lost follow-up. NA is not zero. Preserve reasons when volunteered; do not pressure disclosure. Report denominators by outcome. Do not impute a nonexistent opportunity. Address plausible missing-at-random models only when justified; compare sensitivity to informative missingness. Log all deviations with date, reason and whether outcomes were visible.

## Preregistration fields to lock

Responsible investigator and institution; ethics determination; exact item/rubric/model versions; participant flow; primary and secondary hypotheses; outcome definitions and aggregation; sample-size simulation and seed; alpha or interval-based decision rule; multiplicity; randomization where applicable; exclusions; missingness; analysis code commit; stopping rule; release/deidentification plan. Deposit these before collection at an appropriate registry and record its actual URL. This file is a template, not evidence of preregistration.

## Limitations and reporting

A convenience sample cannot support population norms. Positive results do not establish intelligence, virtue, political correctness or a universal depth trait. Publish uncertainty, adverse consequences, rival interpretations, null and inconclusive results alongside any positive findings. No synthetic engineering data may enter empirical study tables.
