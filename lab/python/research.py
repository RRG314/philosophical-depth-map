"""Reproducible software-test data and participant-level analysis; no empirical claims."""

import argparse, json, random, statistics, hashlib
from collections import defaultdict, Counter

METHODS = ("cartesian", "socratic", "pragmatist", "neutral")
CRITERIA = (
    "reconstruction",
    "assumptions",
    "consistency",
    "objections",
    "justification",
    "uncertainty",
    "integration",
    "relevance",
)


def synthetic(n=80, seed=2026):
    rng = random.Random(seed)
    rows = []
    for p in range(n):
        method = METHODS[p % 4]
        for phase in ("pre", "post"):
            for item in range(6):
                for criterion in CRITERIA:
                    base = rng.randrange(5)
                    for rater in ("A", "B"):
                        rows.append(
                            dict(
                                synthetic=True,
                                participant=f"synthetic-{p:04}",
                                item=f"{phase}-{item}",
                                phase=phase,
                                condition=method,
                                implementation="deterministic",
                                criterion=criterion,
                                rater=rater,
                                score=max(
                                    0, min(4, base + rng.choice([-1, 0, 0, 0, 1]))
                                ),
                            )
                        )
    return rows


def kappa(pairs):
    if not pairs:
        return None
    observed = statistics.mean((a - b) ** 2 for a, b in pairs)
    expected = (
        statistics.mean(a * a for a, _ in pairs)
        + statistics.mean(b * b for _, b in pairs)
        - 2
        * statistics.mean(a for a, _ in pairs)
        * statistics.mean(b for _, b in pairs)
    )
    return None if expected == 0 else 1 - observed / expected


def analyze(rows, seed=2026, draws=1000):
    if not rows:
        raise ValueError("No observations")
    rng = random.Random(seed)
    cells = defaultdict(list)
    paired = defaultdict(dict)
    missing = 0
    seen = set()
    allocations = {}
    for r in rows:
        identity = tuple(
            r[k] for k in ("participant", "item", "phase", "criterion", "rater")
        )
        if identity in seen:
            raise ValueError("Duplicate rating")
        seen.add(identity)
        allocation = (r["condition"], r["implementation"])
        if (
            r["participant"] in allocations
            and allocations[r["participant"]] != allocation
        ):
            raise ValueError("Participant allocation changed")
        allocations[r["participant"]] = allocation
        if (
            r["condition"] not in METHODS
            or r["criterion"] not in CRITERIA
            or r["phase"] not in ("pre", "post", "delayed")
        ):
            raise ValueError("Unknown cell")
        if r["score"] is None:
            missing += 1
            continue
        value = r["score"]
        if type(value) not in (int, float) or not 0 <= value <= 4:
            raise ValueError("Invalid rating")
        cells[
            tuple(
                r[k]
                for k in (
                    "participant",
                    "condition",
                    "implementation",
                    "criterion",
                    "phase",
                    "item",
                )
            )
        ].append(value)
        paired[tuple(r[k] for k in ("participant", "item", "phase", "criterion"))][
            r["rater"]
        ] = value
    # Average raters within item, then items within person/phase: no item pseudoreplication.
    person = defaultdict(list)
    for key, values in cells.items():
        person[key[:-1]].append(statistics.mean(values))
    groups = defaultdict(list)
    for (p, c, impl, criterion, phase), values in person.items():
        post = person.get((p, c, impl, criterion, "post"))
        if phase == "pre" and post:
            groups[(impl, criterion, c)].append(
                statistics.mean(post) - statistics.mean(values)
            )

    def interval(values):
        if len(values) < 2:
            return None
        samples = sorted(
            statistics.mean(rng.choices(values, k=len(values))) for _ in range(draws)
        )
        return [samples[int(0.025 * (draws - 1))], samples[int(0.975 * (draws - 1))]]

    estimates = [
        dict(
            implementation=k[0],
            criterion=k[1],
            condition=k[2],
            participants=len(v),
            mean_change=statistics.mean(v),
            bootstrap95=interval(v),
        )
        for k, v in sorted(groups.items())
    ]
    contrasts = []
    for (impl, criterion, c), v in sorted(groups.items()):
        control = groups.get((impl, criterion, "neutral"))
        if c == "neutral" or not control:
            continue
        samples = sorted(
            statistics.mean(rng.choices(v, k=len(v)))
            - statistics.mean(rng.choices(control, k=len(control)))
            for _ in range(draws)
        )
        contrasts.append(
            dict(
                implementation=impl,
                criterion=criterion,
                condition=c,
                control="neutral",
                difference=statistics.mean(v) - statistics.mean(control),
                bootstrap95=[
                    samples[int(0.025 * (draws - 1))],
                    samples[int(0.975 * (draws - 1))],
                ]
                if min(len(v), len(control)) > 1
                else None,
            )
        )
    raters = sorted({r["rater"] for r in rows})
    reliability = []
    for i, a in enumerate(raters):
        for b in raters[i + 1 :]:
            for c in CRITERIA:
                pairs = [
                    (v[a], v[b])
                    for key, v in paired.items()
                    if key[-1] == c and a in v and b in v
                ]
                reliability.append(
                    dict(
                        raters=[a, b],
                        criterion=c,
                        pairs=len(pairs),
                        quadratic_kappa=kappa(pairs),
                    )
                )
    return dict(
        analysis_version="lab-analysis-1.0",
        input_sha256=hashlib.sha256(
            json.dumps(rows, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest(),
        label="SYNTHETIC SOFTWARE TEST — NOT EMPIRICAL FINDINGS"
        if any(r.get("synthetic") for r in rows)
        else "DESCRIPTIVE ANALYSIS — VALIDITY REQUIRES STUDY REVIEW",
        seed=seed,
        bootstrap_draws=draws,
        missing_ratings=missing,
        estimates=estimates,
        contrasts=contrasts,
        reliability=reliability,
        item_counts=dict(Counter(f"{k[3]}:{k[4]}:{k[5]}" for k in cells)),
        limitations=[
            "Unadjusted exploratory intervals; no multiplicity correction.",
            "Ordinal ratings summarized numerically; sensitivity analysis required.",
            "Complete available pre/post pairs; missingness may bias estimates.",
            "Forms are disjoint but not psychometrically equated.",
            "Participant bootstrap conditions on this item bank; item-generalizing crossed models are a preregistration extension.",
            "No latent proficiency, deficit or causal claim follows from these outputs.",
        ],
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("command", choices=["synthetic", "analyze"])
    p.add_argument("--input")
    p.add_argument("--output", required=True)
    p.add_argument("--seed", type=int, default=2026)
    p.add_argument("--participants", type=int, default=80)
    a = p.parse_args()
    value = (
        synthetic(a.participants, a.seed)
        if a.command == "synthetic"
        else analyze(json.load(open(a.input)), a.seed)
    )
    with open(a.output, "w") as f:
        json.dump(value, f, indent=2)
