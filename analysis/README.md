# Analysis, not evidence

All committed participant-shaped rows are **SYNTHETIC ENGINEERING FIXTURES**. They are not pilot results and must not appear as empirical findings. Research enrollment is disabled.

Run with Python 3.11+ (standard library only):

```
python3 -m unittest discover -s analysis -p 'test_*.py'
python3 analysis/analyze.py analysis/fixtures/synthetic.csv --output analysis/outputs/synthetic
```

Input long-form CSV keys: participant, item, version, dimension, rater, occasion, score, maximum, synthetic. NA/empty scores remain missing. Reject duplicate observation keys and non-ordinal or out-of-range scores. Preserve revisions as separate occasions/records. `raw/` is ignored; do not commit real participant data. `cleaned/`, `derived/`, `outputs/`, `figures/` separate products. Use manifests and approved access-controlled storage for actual studies.

Descriptives report applicable maxima, coverage and missingness separately by dimension, rater and occasion. Means are descriptive conventions on anchored ordinal categories, not assumed interval latent ability. Weighted kappa uses squared ordinal distance, with undefined expected disagreement returning null. ICC(2,1) assumes two-way random raters and absolute agreement; alpha is classical coefficient alpha, not ordinal alpha or proof of unidimensionality. Both require complete rectangular matrices and report no value on degenerate inputs. Select the reliability model to fit the sampling design, not the largest result.

`bootstrap_mean` uses seed 20261010 and percentile resampling of independent participant-level outcomes. Do not pass correlated item rows as independent observations. Attrition, clustered classes, repeated measures, rater uncertainty and small samples require other models or sensitivity analyses. `experimental_contrast` returns an unadjusted difference and sampling SE; randomization and prespecified estimands are necessary for causal interpretation. Item summaries and occasion plots are descriptive; compare matching dimensions/raters, not mixed scales. No automatic significance narrative is generated.

## Measurement model

For eligible observed ratings O(d,k), mean = sum S(i,j,k)/|O|; normalized observed total = sum S / sum applicable maximum. Missing/NA contributes to neither denominator. Coverage reports |O| and NA; unoffered dimensions remain not assessed. Version, rater and occasion are required strata. No universal depth index.

A possible graded-response model is P(S_ij >= c | theta_i) = logistic(a_j (theta_i - b_jc)); multidimensional form replaces a_j theta_i with a_j^T theta_i. Category probabilities are adjacent cumulative differences. Discrimination and ordered thresholds cannot be invented from editorial difficulty labels. Local independence, monotonicity, dimensionality, category use, fit, information, rater effects and group invariance require investigation. CTT observed X=T+E is a model, not a warrant to interpret a raw mean as a stable trait.

`calibrate.R` is a gated future-analysis entry point for item factor/graded-response models and anchored multi-group DIF. It **has not been run on research data or numerically validated in this environment**. It refuses to proceed without a reviewed RDS design manifest: approved flag, preregistration URL, sample justification from simulation, item columns, minimum_n, minimum_category_count, explicit mirt factor specification, anchor items, consented group variable and seed. Minimums must be justified for that design, not treated as universal thresholds. Inspect convergence, fit, cross-validation and identification before releasing outputs. Multidimensional DIF needs extension of slope parameter names beyond a1 for each specified dimension. Lock R/package versions with renv in the approved analysis environment. Never invoke this on the six-row fixture to manufacture calibration.

Official API references checked 10 October 2026: [mirt](https://philchalmers.github.io/mirt/docs/reference/mirt.html), [multipleGroup](https://philchalmers.github.io/mirt/docs/reference/multipleGroup.html), [DIF](https://philchalmers.github.io/mirt/docs/reference/DIF.html), [lavaan group-invariance discussion](https://www.lavaan.ugent.be/tutorial/groups.html). Full confirmatory ordinal invariance, power simulation, clustered experiments, missing-not-at-random sensitivity and longitudinal mixed models remain study-specific work before Studies C–G; the game does not run these models.
