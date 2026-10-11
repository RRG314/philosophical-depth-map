"""Load canonical content and CLOSED configuration; never creates approval or consent."""

import os, json
from collector import BANK, PROTOCOLS, CONFIG
import psycopg
from psycopg.types.json import Jsonb

with psycopg.connect(os.environ["LAB_DATABASE_URL"]) as connection:
    with connection.cursor() as cur:
        cur.execute(
            "INSERT INTO reasoning_lab.configurations(id,version,config) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING",
            (
                CONFIG,
                "1.0",
                Jsonb(
                    dict(
                        turns=4,
                        responseCharacters=4000,
                        interventionItems=3,
                        researchEnabled=False,
                    )
                ),
            ),
        )
        for method in ("cartesian", "socratic", "pragmatist", "neutral"):
            cur.execute(
                "INSERT INTO reasoning_lab.protocols(id,version,method,content) VALUES(%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                (
                    f"lab-{method}-1.0",
                    PROTOCOLS["version"],
                    method,
                    Jsonb(PROTOCOLS[method]),
                ),
            )
        for p in BANK.values():
            cur.execute(
                "INSERT INTO reasoning_lab.question_versions(id,version,domain,pool,content) VALUES(%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                (p["id"], p["version"], p["domain"], p["pool"], Jsonb(p)),
            )
print("Canonical content loaded; no approval or enrollment enabled.")
