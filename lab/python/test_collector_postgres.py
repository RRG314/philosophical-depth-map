"""Explicit ephemeral PostgreSQL integration test; skipped without LAB_TEST_DATABASE_URL."""

import os, unittest, uuid, json
from collector import collect, validate_session, BANK, CONFIG, hash32, shuffle, METHODS
from engine import blank, execute


@unittest.skipUnless(
    os.environ.get("LAB_TEST_DATABASE_URL"), "Ephemeral PostgreSQL URL not supplied"
)
class PostgresCollectorTests(unittest.TestCase):
    def test_approval_consent_replay_transaction_and_duplicate(self):
        import psycopg

        with psycopg.connect(os.environ["LAB_TEST_DATABASE_URL"]) as db:
            participant = str(uuid.uuid4())
            seed = 42
            schedule = []
            for phase in ("pre", "intervention", "post"):
                items = shuffle(
                    [p for p in BANK.values() if p["pool"] == phase],
                    hash32(f"{CONFIG}:{seed}:{participant}:{phase}"),
                )
                if phase == "intervention":
                    items = items[:3]
                schedule.extend(dict(id=p["id"], phase=phase) for p in items)
            method = shuffle(
                METHODS, hash32(f"{CONFIG}:{seed}:{participant}:assignment")
            )[0]
            s = dict(
                version="1.0",
                configId=CONFIG,
                mode="rehearsal",
                id=str(uuid.uuid4()),
                participantId=participant,
                seed=seed,
                implementation="deterministic",
                synthetic=True,
                method=method,
                schedule=schedule,
                status="active",
                records=[],
                aiEvents=[],
                startedAt="2026-10-11T00:00:00Z",
                delayedDueAt=None,
            )
            for slot in schedule:
                for turn in range(4 if slot["phase"] == "intervention" else 1):
                    p = BANK[slot["id"]]
                    a = blank()
                    a["response"] = "SYNTHETIC fixture"
                    trace = (
                        execute(
                            dict(
                                problem=p,
                                method=method,
                                stage=turn,
                                action=a,
                                previous=a if turn else None,
                            )
                        )
                        if slot["phase"] == "intervention"
                        else None
                    )
                    s["records"].append(
                        dict(
                            id=str(uuid.uuid4()),
                            itemId=p["id"],
                            itemVersion="1.0",
                            phase=slot["phase"],
                            turn=turn,
                            action=a,
                            trace=trace,
                            generatedQuestion=trace["question"] if trace else "",
                            timestamp="2026-10-11T00:01:00Z",
                        )
                    )
            s["status"] = "completed"
            validate_session(s)
            payload = dict(
                session=s, consent=dict(granted=True, version="synthetic-test-consent")
            )
            self.assertRaises(PermissionError, collect, db, payload)
            db.execute(
                "UPDATE reasoning_lab.configurations SET collection_enabled=true,approval_reference='SYNTHETIC TEST ONLY',approved_at=now() WHERE id=%s",
                (CONFIG,),
            )
            db.execute(
                "INSERT INTO reasoning_lab.consent_versions VALUES('synthetic-test-consent','SYNTHETIC fixture','TEST ONLY',now())"
            )
            db.commit()
            db.execute("SET ROLE lab_collector")
            db.commit()
            result = collect(db, payload)
            self.assertTrue(result["synthetic"])
            db.commit()
            count = db.execute(
                "SELECT count(*) FROM reasoning_lab.responses WHERE session_id=%s",
                (s["id"],),
            ).fetchone()[0]
            self.assertEqual(count, 24)
            self.assertRaises(psycopg.errors.UniqueViolation, collect, db, payload)
            db.rollback()
            db.execute("RESET ROLE")
            db.execute(
                "UPDATE reasoning_lab.configurations SET collection_enabled=false WHERE id=%s",
                (CONFIG,),
            )
            db.commit()
