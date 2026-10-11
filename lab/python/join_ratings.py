"""Coordinator-only join: keep the key away from blind raters."""

import argparse, json


def join(packet, key, ratings):
    responses = {r["blindId"]: r for r in packet["responses"]}
    rows = []
    seen = set()
    for rating in ratings:
        bid = rating["blindId"]
        if bid not in responses or bid not in key:
            raise ValueError("Rating not in this packet/key")
        identity = (bid, rating["raterId"], rating["criterion"])
        if identity in seen:
            raise ValueError("Duplicate rating; resolve versions explicitly")
        seen.add(identity)
        if rating["rubricVersion"] != "lab-general-1.0":
            raise ValueError("Unknown rubric")
        if rating["score"] is not None and (
            not rating["evidence"]
            or rating["evidence"] not in responses[bid]["response"]
        ):
            raise ValueError("Evidence mismatch")
        m = key[bid]
        rows.append(
            dict(
                synthetic=packet["synthetic"],
                participant=m["participantId"],
                item=m["itemId"],
                phase=m["phase"],
                condition=m["method"],
                implementation=m["implementation"],
                criterion=rating["criterion"],
                rater=rating["raterId"],
                score=rating["score"],
            )
        )
    return rows


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--packet", required=True)
    p.add_argument("--key", required=True)
    p.add_argument("--ratings", nargs="+", required=True)
    p.add_argument("--output", required=True)
    a = p.parse_args()
    rows = join(
        json.load(open(a.packet)),
        json.load(open(a.key)),
        [r for f in a.ratings for r in json.load(open(f))],
    )
    with open(a.output, "w") as f:
        json.dump(rows, f, indent=2)
