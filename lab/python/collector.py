"""Optional coordinator-only PostgreSQL collector. No public enrollment endpoint.
Run behind a TLS reverse proxy. Collection defaults OFF; consent and DB approval are checked per import.
"""

import os, json, hmac, uuid, argparse
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime
from engine import execute, validate, METHODS

ROOT = Path(__file__).resolve().parents[2]
BANK = {p["id"]: p for p in json.load(open(ROOT / "src/lab/data/problems.json"))}
PROTOCOLS = json.load(open(ROOT / "src/lab/data/protocols.json"))
CONFIG = "four-methods-1.0"


def hash32(text):
    h = 2166136261
    for b in text.encode("utf-16-le")[
        ::2
    ]:  # allocation inputs are strictly ASCII UUID/config strings
        h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    return h


def shuffle(items, seed):
    out = list(items)
    x = seed & 0xFFFFFFFF
    for i in range(len(out) - 1, 0, -1):
        x = (1664525 * x + 1013904223) & 0xFFFFFFFF
        j = int(x / 4294967296 * (i + 1))
        out[i], out[j] = out[j], out[i]
    return out


def validate_session(s):
    if (
        s.get("version") != "1.0"
        or s.get("configId") != CONFIG
        or s.get("mode") != "rehearsal"
    ):
        raise ValueError("Versioned rehearsal log required")
    for key in ("id", "participantId"):
        uuid.UUID(s[key])
    seed = s["seed"]
    participant = s["participantId"]
    if type(seed) != int or not 0 <= seed <= 4294967295:
        raise ValueError("Invalid seed")
    if s.get("implementation") not in ("deterministic", "llm"):
        raise ValueError("Invalid implementation")
    if type(s.get("synthetic")) != bool:
        raise ValueError("Provenance flag required")
    if (
        s["method"]
        != shuffle(METHODS, hash32(f"{CONFIG}:{seed}:{participant}:assignment"))[0]
    ):
        raise ValueError("Allocation mismatch")
    scheduled = []
    for phase in ("pre", "intervention", "post", "delayed"):
        if phase == "delayed" and not s.get("delayedDueAt"):
            continue
        items = shuffle(
            [p for p in BANK.values() if p["pool"] == phase],
            hash32(f"{CONFIG}:{seed}:{participant}:{phase}"),
        )
        if phase == "intervention":
            items = items[:3]
        scheduled.extend(dict(id=p["id"], phase=phase) for p in items)
    if scheduled != s["schedule"]:
        raise ValueError("Schedule mismatch")
    slots = [
        (x["id"], x["phase"], turn)
        for x in scheduled
        for turn in range(4 if x["phase"] == "intervention" else 1)
    ]
    records = s["records"]
    if len(records) > len(slots):
        raise ValueError("Budget exceeded")
    if s["status"] != ("completed" if len(records) == len(slots) else "active"):
        raise ValueError("Status mismatch")
    previous = {}
    ids = set()
    for i, r in enumerate(records):
        uuid.UUID(r["id"])
        if r["id"] in ids:
            raise ValueError("Duplicate record")
        ids.add(r["id"])
        if (r["itemId"], r["phase"], r["turn"]) != slots[i] or r[
            "itemVersion"
        ] != "1.0":
            raise ValueError("Record ordering mismatch")
        validate(BANK[r["itemId"]], r["action"])
        if len(r["generatedQuestion"]) > 6000:
            raise ValueError("Question too long")
        datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
        if r["phase"] == "intervention":
            trace = execute(
                dict(
                    problem=BANK[r["itemId"]],
                    method=s["method"],
                    action=r["action"],
                    stage=r["turn"],
                    previous=previous.get(r["itemId"]),
                )
            )
            if trace != r["trace"]:
                raise ValueError("Symbolic replay mismatch")
            previous[r["itemId"]] = r["action"]
    successful = [
        e for e in s.get("aiEvents", []) if e.get("result") and not e.get("error")
    ]
    if s["implementation"] == "deterministic" and s.get("aiEvents"):
        raise ValueError("Unexpected AI metadata")
    fingerprints = set()
    for e in successful:
        value = e["result"]
        if e["condition"] != s["method"] or value["condition"] != s["method"]:
            raise ValueError("Condition mismatch")
        if value["parameters"] != {
            "temperature": 1,
            "maxOutputTokens": 1800,
            "store": False,
        }:
            raise ValueError("Parameters mismatch")
        fingerprints.add(
            json.dumps(
                [value["model"], value["protocolVersion"], value["parameters"]],
                sort_keys=True,
            )
        )
    if len(fingerprints) > 1:
        raise ValueError("Mixed models")
    if s["implementation"] == "llm":
        for r in records:
            if r["phase"] == "intervention" and not any(
                e["itemId"] == r["itemId"]
                and e["turn"] == r["turn"]
                and e["result"]["question"] == r["generatedQuestion"]
                for e in successful
            ):
                raise ValueError("Missing AI event")
    return s


def collect(connection, payload):
    from psycopg.types.json import Jsonb

    s = validate_session(payload["session"])
    consent = payload["consent"]
    if consent.get("granted") is not True or not consent.get("version"):
        raise ValueError("Explicit consent required")
    # All changes, including consent, are atomic; duplicate sessions fail instead of replacing research records.
    with connection.transaction():
        with connection.cursor() as cur:
            cur.execute(
                "SELECT collection_enabled,approval_reference,approved_at FROM reasoning_lab.configurations WHERE id=%s",
                (CONFIG,),
            )
            gate = cur.fetchone()
            if not gate or not all(gate):
                raise PermissionError("Study approval gate closed")
            cur.execute(
                "SELECT approval_reference,approved_at FROM reasoning_lab.consent_versions WHERE id=%s",
                (consent["version"],),
            )
            approved = cur.fetchone()
            if not approved or not all(approved):
                raise PermissionError("Consent version not approved")
            cur.execute(
                "INSERT INTO reasoning_lab.participants(id) VALUES(%s) ON CONFLICT DO NOTHING",
                (s["participantId"],),
            )
            cur.execute(
                "SELECT withdrawn_at FROM reasoning_lab.participants WHERE id=%s",
                (s["participantId"],),
            )
            if cur.fetchone()[0] is not None:
                raise PermissionError("Participant withdrawn")
            cur.execute(
                "INSERT INTO reasoning_lab.consents(id,participant_id,version,granted) VALUES(%s,%s,%s,true)",
                (str(uuid.uuid4()), s["participantId"], consent["version"]),
            )
            cur.execute(
                "INSERT INTO reasoning_lab.sessions(id,participant_id,config_id,implementation,synthetic,started_at) VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    s["id"],
                    s["participantId"],
                    CONFIG,
                    s["implementation"],
                    s["synthetic"],
                    s["startedAt"],
                ),
            )
            cur.execute(
                "INSERT INTO reasoning_lab.assignments(session_id,participant_id,condition,seed,schedule) VALUES(%s,%s,%s,%s,%s)",
                (
                    s["id"],
                    s["participantId"],
                    s["method"],
                    s["seed"],
                    Jsonb(s["schedule"]),
                ),
            )
            prior = {}
            for r in s["records"]:
                cur.execute(
                    "INSERT INTO reasoning_lab.responses(id,session_id,participant_id,item_id,item_version,phase,turn,response,structured_action,generated_question,trace,recorded_at) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (
                        r["id"],
                        s["id"],
                        s["participantId"],
                        r["itemId"],
                        r["itemVersion"],
                        r["phase"],
                        r["turn"],
                        r["action"]["response"],
                        Jsonb(r["action"]),
                        r["generatedQuestion"],
                        Jsonb(r["trace"]),
                        r["timestamp"],
                    ),
                )
                if r["itemId"] in prior:
                    cur.execute(
                        "INSERT INTO reasoning_lab.revisions(id,response_id,participant_id,revision_no,before_state,after_state,rationale) VALUES(%s,%s,%s,%s,%s,%s,%s)",
                        (
                            str(uuid.uuid4()),
                            r["id"],
                            s["participantId"],
                            r["turn"],
                            Jsonb(prior[r["itemId"]]),
                            Jsonb(r["action"]),
                            r["action"]["revisionNote"],
                        ),
                    )
                prior[r["itemId"]] = r["action"]
            for e in s.get("aiEvents", []):
                v = e.get("result") or {}
                cur.execute(
                    "INSERT INTO reasoning_lab.ai_invocations(id,session_id,participant_id,item_id,item_version,condition,model_identifier,model_version,prompt_version,parameters,input_question,participant_response,generated_questions,input_tokens,output_tokens,latency_ms,error) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (
                        str(uuid.uuid4()),
                        s["id"],
                        s["participantId"],
                        e["itemId"],
                        "1.0",
                        e["condition"],
                        v.get("model", "unavailable"),
                        v.get("modelVersion"),
                        v.get("promptVersion", f"lab-{s['method']}-1.0"),
                        Jsonb(v.get("parameters", {})),
                        e["inputQuestion"],
                        e["participantResponse"],
                        Jsonb(v.get("question")),
                        v.get("tokenUsage", {}).get("inputTokens"),
                        v.get("tokenUsage", {}).get("outputTokens"),
                        e["latencyMs"],
                        e.get("error"),
                    ),
                )
            if s["status"] == "completed":
                cur.execute(
                    "UPDATE reasoning_lab.sessions SET completed_at=%s WHERE id=%s",
                    (s["records"][-1]["timestamp"], s["id"]),
                )
    return dict(imported=True, sessionId=s["id"], synthetic=s["synthetic"])


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # No response bodies, bearer tokens or participant URLs in access logs.

    def reply(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            return self.reply(404, {"error": "Not found"})
        self.reply(
            200,
            {
                "status": "ok",
                "researchCollectionEnabled": False
                if os.environ.get("LAB_COLLECTION_ENABLED") != "true"
                else None,
                "approvalCheckedPerImport": True,
            },
        )

    def do_POST(self):
        if self.path != "/research/import":
            return self.reply(404, {"error": "Not found"})
        if os.environ.get("LAB_COLLECTION_ENABLED") != "true":
            return self.reply(403, {"error": "Research collection disabled"})
        token = os.environ.get("LAB_COORDINATOR_TOKEN", "")
        if len(token) < 32 or not hmac.compare_digest(
            self.headers.get("Authorization", ""), "Bearer " + token
        ):
            return self.reply(401, {"error": "Unauthorized"})
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.reply(415, {"error": "JSON required"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400, {"error": "Invalid length"})
        if not 0 < length <= 1_000_000:
            return self.reply(413, {"error": "Request size outside allowed range"})
        try:
            payload = json.loads(self.rfile.read(length))
            validate_session(payload["session"])
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {"error": "Invalid versioned session"})
        try:
            import psycopg

            with psycopg.connect(os.environ["LAB_DATABASE_URL"]) as connection:
                result = collect(connection, payload)
            self.reply(201, result)
        except PermissionError:
            self.reply(403, {"error": "Approval, consent or withdrawal gate closed"})
        except Exception:
            self.reply(
                409,
                {
                    "error": "Import not committed; verify configuration, consent and duplicate IDs with the coordinator"
                },
            )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args()
    # Deliberately loopback-only; production requires an authenticated TLS gateway and request throttling.
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
