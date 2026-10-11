"""Bounded symbolic reasoning; JSON stdin -> inspectable JSON trace. No NLP or pretrained model."""

import json, sys
from pathlib import Path

PROTOCOLS = json.loads(
    (Path(__file__).resolve().parents[2] / "src/lab/data/protocols.json").read_text()
)
METHODS = ("cartesian", "socratic", "pragmatist", "neutral")


def blank():
    return dict(
        response="",
        commitments={},
        definitions={},
        admittedObjections=[],
        outcomes={},
        revisionNote="",
    )


def validate(p, a):
    ids = {x["id"] for x in p["propositions"]}
    if len(ids) != len(p["propositions"]) or not 3 <= len(ids) <= 20:
        raise ValueError("Invalid proposition IDs")
    if (
        set(a) != set(blank())
        or len(a["response"]) > 4000
        or len(a["revisionNote"]) > 1000
    ):
        raise ValueError("Invalid action")
    if set(a["commitments"]) - ids or any(
        v not in ("accept", "reject", "suspend") for v in a["commitments"].values()
    ):
        raise ValueError("Invalid commitments")
    if set(a["definitions"]) - set(p["terms"]) or any(
        len(v) > 500 for v in a["definitions"].values()
    ):
        raise ValueError("Invalid definitions")
    if set(a["admittedObjections"]) - {x["id"] for x in p["objections"]}:
        raise ValueError("Invalid objections")
    if set(a["outcomes"]) - {x["id"] for x in p["hypotheses"]} or any(
        v not in ("confirmed", "disconfirmed", "unmeasured")
        for v in a["outcomes"].values()
    ):
        raise ValueError("Invalid outcomes")
    for arg in p["arguments"]:
        if (
            not arg["premises"]
            or set(arg["premises"]) - ids
            or arg["conclusion"] not in ids
        ):
            raise ValueError("Unknown dependency")
    if any(
        set(pair) - ids or len(pair) != 2 or pair[0] == pair[1]
        for pair in p["incompatibilities"]
    ):
        raise ValueError("Invalid incompatibilities")
    if any(o["target"] not in ids for o in p["objections"]):
        raise ValueError("Unknown target")


def run(p, method, a=None, stage=0, previous=None):
    a = blank() if a is None else a
    previous = blank() if previous is None else previous
    validate(p, a)
    validate(p, previous)
    if method not in METHODS or type(stage) != int or not 0 <= stage <= 3:
        raise ValueError("Unknown method or budget exceeded")
    positive = {
        x["id"] for x in p["propositions"] if a["commitments"].get(x["id"]) == "accept"
    }
    negative = {
        x["id"] for x in p["propositions"] if a["commitments"].get(x["id"]) == "reject"
    }
    basis = {
        x["id"]: [f"commitment:{a['commitments'][x['id']]} ".strip()]
        if x["id"] in a["commitments"]
        else []
        for x in p["propositions"]
    }
    for o in p["objections"]:
        if o["id"] in a["admittedObjections"] and o["refutesWhenAdmitted"]:
            negative.add(o["target"])
            basis[o["target"]].append("admitted:" + o["id"])
    for _ in p["propositions"]:
        changed = False
        for arg in p["arguments"]:
            if (
                arg["kind"] == "strict"
                and all(x in positive for x in arg["premises"])
                and arg["conclusion"] not in positive
            ):
                positive.add(arg["conclusion"])
                basis[arg["conclusion"]].append("rule:" + arg["id"])
                changed = True
        if not changed:
            break
    conflicts = [
        pair for pair in p["incompatibilities"] if all(x in positive for x in pair)
    ]
    for x, y in conflicts:
        negative.update([x, y])
        basis[x].append("incompatible:" + y)
        basis[y].append("incompatible:" + x)
    grounded = {
        x["id"]
        for x in p["propositions"]
        if x["grounded"] and x["id"] in positive and x["id"] not in negative
    }
    for _ in p["propositions"]:
        for arg in p["arguments"]:
            if (
                arg["kind"] == "strict"
                and all(x in grounded for x in arg["premises"])
                and arg["conclusion"] not in negative
            ):
                grounded.add(arg["conclusion"])
    unsupported = [
        x["id"]
        for x in p["propositions"]
        if a["commitments"].get(x["id"]) == "accept" and x["id"] not in grounded
    ]
    doubted = []
    if method == "cartesian":
        for x in p["propositions"]:
            if (not x["grounded"] and x["id"] not in grounded) or x["source"] in (
                "perception",
                "testimony",
            ):
                doubted.append(x["id"])
        for o in p["objections"]:
            if o["id"] in a["admittedObjections"] and o["target"] not in doubted:
                doubted.append(o["target"])
        for _ in p["propositions"]:
            for arg in p["arguments"]:
                if (
                    any(x in doubted for x in arg["premises"])
                    and arg["conclusion"] not in doubted
                ):
                    doubted.append(arg["conclusion"])
    surviving = [
        arg["id"]
        for arg in p["arguments"]
        if arg["kind"] == "strict"
        and all(
            x in positive and x not in negative and x not in doubted
            for x in arg["premises"]
        )
        and arg["conclusion"] not in negative
        and arg["conclusion"] not in doubted
    ]
    changes = [
        dict(
            id=x["id"],
            before=previous["commitments"].get(x["id"], "unrecorded"),
            after=a["commitments"].get(x["id"], "unrecorded"),
        )
        for x in p["propositions"]
        if previous["commitments"].get(x["id"], "unrecorded")
        != a["commitments"].get(x["id"], "unrecorded")
    ]
    target = next(
        (o for o in p["objections"] if o["id"] not in a["admittedObjections"]),
        p["objections"][0],
    )
    term = next(
        (t for t in p["terms"] if not a["definitions"].get(t, "").strip()),
        p["terms"][0],
    )
    h = p["hypotheses"][stage % len(p["hypotheses"])]
    questions = {
        "cartesian": [
            f"Which propositions support the proposed conclusion? Reconstruct {p['arguments'][0]['id'] if p['arguments'] else 'the argument'} and distinguish its premises from assumptions.",
            f"What grounds support {unsupported[0] if unsupported else p['propositions'][0]['id']}? Consider: {target['text']} Does this justify suspension, or a refutation within the stated assumptions?",
            f"Which conclusions depend on the challenged premises ({', '.join(doubted) or 'none currently flagged'})? What independent support would be needed?",
            "What can you retain conditionally? Explain any revision or justified suspension; an unchallenged conclusion is not proven indubitable.",
        ],
        "socratic": [
            f"What do you mean by “{term}”? State your definition and commitments.",
            f"Your commitments include incompatible pairs {', '.join('/'.join(x) for x in conflicts)}. Which commitment or distinction needs examination?"
            if conflicts
            else f"No encoded incompatible pair is jointly accepted. Does your definition of “{term}” fit each stated commitment?",
            f"Consider this proposed challenge: {target['text']} Does it apply to your definition, or need a distinction?",
            "State your revised or defended position. What disagreement remains unresolved? A contradiction alone does not select the belief to abandon.",
        ],
        "pragmatist": [
            f"What makes this situation problematic: {p['question']} Which hypothesis would address it?",
            f"For {h['id']}, consider: {h['consequence']} Operational step: {h['operation']} What value judgment still needs justification?",
            f"What evidence would distinguish the hypotheses? For {h['id']}: {h['evidenceNeeded']}",
            f"Recorded outcomes: {', '.join(x['id'] + '=' + a['outcomes'].get(x['id'], 'unmeasured') for x in p['hypotheses'])}. What revision is warranted, and which empirical or normative question remains open?",
        ],
        "neutral": [
            f"In your own words, what is the issue in this question: {p['question']}",
            f"Clarify one statement you want a reader to understand. You may explain “{p['terms'][0]}” in your own terms.",
            "Give an example that illustrates your position, without needing to settle the whole issue.",
            "Summarize your current position and anything you want to add. You may retain your original view.",
        ],
    }
    return dict(
        engineVersion="symbolic-1.0",
        protocolVersion=PROTOCOLS["version"],
        method=method,
        stage=stage,
        operation=PROTOCOLS[method]["stages"][stage],
        question=questions[method][stage],
        facts=[
            dict(
                id=x["id"],
                status=("conflicted" if x["id"] in negative else "supported")
                if x["id"] in positive
                else ("refuted" if x["id"] in negative else "undetermined"),
                basis=basis[x["id"]],
            )
            for x in p["propositions"]
        ],
        dependencies=[
            dict(from_=x, to=arg["conclusion"], kind=arg["kind"])
            for arg in p["arguments"]
            for x in arg["premises"]
        ],
        unsupported=unsupported,
        conflicts=conflicts,
        doubted=doubted,
        survivingArguments=surviving,
        changes=changes,
        hypotheses=[
            dict(
                id=h["id"],
                status=a["outcomes"].get(h["id"], "unmeasured"),
                requirement=h["evidenceNeeded"],
            )
            for h in p["hypotheses"]
        ],
        limitations=[
            "Structured commitments and authored rules only; free text is not parsed.",
            "Supported/refuted are relative to this encoding, not established truths.",
            "No explosion from inconsistency; defeasible arguments do not establish conclusions.",
            "No automatic quality score, historical equivalence or personal proficiency inference.",
        ],
    )


def execute(payload):
    trace = run(
        payload["problem"],
        payload["method"],
        payload.get("action"),
        payload.get("stage", 0),
        payload.get("previous"),
    )
    for edge in trace["dependencies"]:
        edge["from"] = edge.pop("from_")
    return trace


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    print(
        json.dumps(
            [execute(x) for x in payload]
            if isinstance(payload, list)
            else execute(payload),
            ensure_ascii=False,
        )
    )
