"""Deterministic packaging of editorial annotations, not automatic content calibration."""

import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
old = {q["id"]: q for q in json.loads((root / "src/data/questions.json").read_text())}
rows = []
for line in (root / "lab/curation.tsv").read_text().splitlines():
    source, premise, assumption, conclusion, objection, operation, consequence = (
        line.split("|")
    )
    q = old[source]
    rows.append(
        dict(
            id="lab-" + source,
            version="1.0",
            domain=q["domain"],
            pool="intervention",
            title=q["title"],
            question=q["prompt"],
            terms=[q["concepts"][0].replace("-", " ")],
            propositions=[
                dict(
                    id="p1",
                    text=premise,
                    kind="premise",
                    source="definition",
                    grounded=True,
                ),
                dict(
                    id="p2",
                    text=assumption,
                    kind="assumption",
                    source="normative"
                    if q["domain"] in ("ethics", "politics")
                    else "inference",
                    grounded=False,
                ),
                dict(
                    id="p3",
                    text=conclusion,
                    kind="conclusion",
                    source="inference",
                    grounded=False,
                ),
                dict(
                    id="p4",
                    text="It is not the case that: " + conclusion,
                    kind="conclusion",
                    source="inference",
                    grounded=False,
                ),
            ],
            arguments=[
                dict(
                    id="a1",
                    premises=["p1", "p2"],
                    conclusion="p3",
                    kind="defeasible",
                    warrant="Proposed reconstruction for examination, not a verified valid implication.",
                )
            ],
            incompatibilities=[["p3", "p4"]],
            objections=[
                dict(
                    id="o1",
                    target="p2",
                    text=objection,
                    type="undercutter",
                    refutesWhenAdmitted=False,
                ),
                dict(
                    id="o2",
                    target="p3",
                    text=q["branches"][1]["prompt"],
                    type="alternative",
                    refutesWhenAdmitted=False,
                ),
            ],
            hypotheses=[
                dict(
                    id="h1",
                    claim="p3",
                    consequence=consequence,
                    operation=operation,
                    evidenceNeeded="Report the result of this operation, its uncertainty, and whether it discriminates the stated alternatives: "
                    + operation,
                ),
                dict(
                    id="h2",
                    claim="p4",
                    consequence="The proposed conclusion may be withheld or rejected; compare whether the alternative accounts for the same case without the challenged bridge.",
                    operation="Apply the alternative interpretation to the same case: "
                    + operation,
                    evidenceNeeded="State a result or counterexample that would favor retaining the conclusion over its negation; report if neither is empirically distinguishable.",
                ),
            ],
            explanation=q["explanation"]
            + " The supplied bridge is deliberately contestable. Grounded means stipulated in this scenario, not objectively verified. Reconstructing a better argument is allowed.",
            references=q["references"],
            biasNote="Editorial affordance review: all methods receive the same graph, objection and hypothesis fields. A contestable bridge can favor skeptical/elenctic work; an operational prompt can favor pragmatism. This shared representation itself may privilege analytic argumentation. Independent blinded review and domain-stratified analysis are required.",
        )
    )
# Held-out forms reuse other original prompts, never the 60 intervention prompts.
for pool, index in [("pre", 13), ("post", 14), ("delayed", 15)]:
    for domain in [
        "epistemology",
        "ethics",
        "metaphysics",
        "logic",
        "mind",
        "politics",
    ]:
        q = old[f"{domain}-{index:02}"]
        template = json.loads(
            json.dumps(next(r for r in rows if r["domain"] == domain))
        )
        template.update(
            id=f"assessment-{pool}-{domain}",
            pool=pool,
            title=q["title"],
            question=q["prompt"],
            terms=[q["concepts"][0].replace("-", " ")],
            references=q["references"],
            explanation=q["explanation"],
            biasNote="Held-out task. Forms are disjoint, not empirically equated; form difficulty remains a design confound to estimate and counterbalance in an approved study.",
        )
        # Assessment is open reconstruction rather than a pre-filled intervention argument.
        template["propositions"] = [
            dict(
                id="p1",
                text="The proposed position needs support relevant to this case.",
                kind="premise",
                source="definition",
                grounded=True,
            ),
            dict(
                id="p2",
                text="The response identifies a defensible bridge from its reasons to its position.",
                kind="assumption",
                source="inference",
                grounded=False,
            ),
            dict(
                id="p3",
                text="The proposed position is justified in the stated context.",
                kind="conclusion",
                source="inference",
                grounded=False,
            ),
            dict(
                id="p4",
                text="The proposed position is not justified in the stated context.",
                kind="conclusion",
                source="inference",
                grounded=False,
            ),
        ]
        template["objections"] = [
            dict(
                id="o1",
                target="p2",
                text=q["followup"],
                type="undercutter",
                refutesWhenAdmitted=False,
            )
        ]
        template["hypotheses"] = [
            dict(
                id="h1",
                claim="p3",
                consequence="The response can defend its position against a relevant challenge.",
                operation="Identify an assumption and a possible objection in the response.",
                evidenceNeeded="Reasons that answer the objection without simply repeating the position.",
            ),
            dict(
                id="h2",
                claim="p4",
                consequence="The response qualifies, rejects or suspends its position with reasons.",
                operation="Identify what change of evidence or assumption would matter.",
                evidenceNeeded="A relevant explanation of uncertainty or a defended revision.",
            ),
        ]
        rows.append(template)
for row in rows:
    if row["id"] in [
        "lab-logic-04",
        "lab-logic-05",
        "lab-logic-06",
        "lab-logic-08",
        "lab-logic-11",
    ]:
        row["arguments"][0]["kind"] = "strict"
        row["arguments"][0]["warrant"] = (
            "Explicit conditional bridge p2 licenses p1 to p3 within this restricted encoding. The bridge itself remains contestable; this is not unrestricted theorem proving."
        )
for row in rows:
    if row["id"] in [
        "lab-epistemology-03",
        "lab-epistemology-04",
        "lab-epistemology-05",
        "lab-epistemology-10",
        "lab-epistemology-11",
        "lab-logic-04",
        "lab-logic-05",
        "lab-logic-06",
        "lab-logic-08",
        "lab-logic-11",
        "lab-logic-12",
    ]:
        row["objections"][0]["type"] = "counterexample"
assert len(rows) == 78 and len({q["question"] for q in rows}) == 78
(root / "src/lab/data/problems.json").write_text(
    json.dumps(rows, indent=2, ensure_ascii=False) + "\n"
)
