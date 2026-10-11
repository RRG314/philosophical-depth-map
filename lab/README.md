# Philosophical Reasoning Lab

An executable research-software module within Philosophical Depth Map. Public demonstrations and local protocol rehearsals work offline after loading; no language-model credentials are required for deterministic reasoning. This is not a validated psychological test or an active human-subject study.

## Run

From the repository root, `npm ci` then `npm run dev`. Open `/#lab`; `/#learn` contains the reading library. `npm run build` produces the static site. GitHub Pages runs the compiled browser engine, not Python.

For Python traces:

```sh
python3 - <<'PY' | python3 lab/python/engine.py
import json
p=json.load(open('src/lab/data/problems.json'))[0]
print(json.dumps({'problem':p,'method':'cartesian'}))
PY
```

Tests: `npm run check`, `npm run test:e2e`, `python3 -m unittest discover -s lab/python -p 'test_*.py'`. Browser/Python parity tests cover all 78 items × four methods × four stages with structured conflicting commitments. This is software equivalence, not evidence of philosophical equivalence or intervention efficacy.

## Where things belong

- `src/lab/core`: typed problem/action contract, four deterministic protocols, assignment, replay, scoring and storage.
- `src/lab/data`: 60 intervention problems, 18 held-out form items, versioned method protocols.
- `src/lab/pages`: independent blind quality scoring and condition-aware fidelity review.
- `src/learn`: searchable source library; checked links and source types.
- `lab/python`: portable deterministic engine, synthetic fixtures and reproducible descriptive analyses.
- `server/lab-service.ts`: optional common-model agent interface; four versioned prompts and fixed output contract.
- `database/002_reasoning_lab.sql`: separate PostgreSQL research schema, collection disabled.
- `lab/research`: review, annotated bibliography, BibTeX, source register, method-bias audit and study protocol.

## API

`POST /lab` on the optional Worker takes `{method,problemId,stage,action,history,consent:true}`. Methods are `cartesian`, `socratic`, `pragmatist`, `neutral`; stage is 0–3; history length must equal stage. Use the schema in `src/lab/core/schema.ts` and `labRequestSchema` in the service. Canonical problem text is server-loaded. Output includes question, observation, uncertainty, model/modelVersion, prompt/protocol version, fixed parameters, usage, latency, timestamp and condition. It has no quality score.

Set the server's `LAB_MODEL` to a qualified pinned snapshot shared by all four methods. The Provider function is injectable; the bundled implementation uses the OpenAI Responses API. `OPENAI_API_KEY` and `IP_HASH_SALT` stay server-side. The Worker retains origin checks, bounded request size, per-IP limits, global token reservation and strict output validation. Configure `VITE_AI_ENDPOINT` only for an approved endpoint. Live provider behavior requires credentials and has not been established by mock tests.

AI event errors retain input, participant response, condition, timing and error text. A failed request before a provider response has no verified model version or token usage; these are not fabricated. Successful events retain provider metadata. A model alias may change behind a provider's identifier, so pin a snapshot and record an external deployment manifest. Saved generated text supports event replay; re-querying a probabilistic model is not exact replay.

## Research boundary

The site offers a rehearsal with concealed condition labels. Public client code and local storage reveal assignment to an inspecting user. The private coordinator collector is disabled by default; a public server-authoritative recruitment service is not enabled. Database migrations are deployable schema foundations, not a claim that secure recruitment, consent adjudication or institutional approval has happened.

See [methodology](research/METHODOLOGY.md), [integration specification](INTEGRATION.md), [adversarial audit](research/ADVERSARIAL_AUDIT.md), [literature review](research/LITERATURE_REVIEW.md), [bibliography](research/ANNOTATED_BIBLIOGRAPHY.md) and [expansion gates](ROADMAP.md).

## Optional private research collector

`lab/python/collector.py` provides a coordinator-only PostgreSQL import service, independent of the public browser. Install `lab/python/requirements.txt` in a virtual environment. Apply migration 002, seed canonical content with `seed_database.py` using a provisioning account, and provision a separate login as a member of the `lab_collector` role defined in `database/optional_collector_role.sql`. Never use a superuser for the running service. The optional role has forced RLS and approval-gated writes; it cannot approve a study or consent version.

Run `python3 lab/python/collector.py --port 8790`. It binds loopback only. `GET /health` is readable; `POST /research/import` defaults to 403. After actual review, the authorized administrator must approve the configuration and consent-version rows, set `LAB_COLLECTION_ENABLED=true`, a random `LAB_COORDINATOR_TOKEN` of at least 32 characters, and the service's `LAB_DATABASE_URL`. Supply `Authorization: Bearer ...` from the coordinator's protected client, never a browser bundle. Terminate TLS, throttle requests and restrict network access at the gateway.

Import body: `{ "session": <exported rehearsal session>, "consent": {"version": "approved-version", "granted": true} }`. The coordinator is responsible for verifying the actual consent record; submitting this assertion is not an institutional approval process. Server checks allocation, schedule, budgets, trace replay, consent approval, withdrawal and duplicate IDs, then transactionally stores participants, consents, assignment, responses, revisions and AI events. Failed imports do not partially commit. This is an approved-log ingestion service, **not** a public recruitment service or secure real-time allocation server. Rater exports join offline through `join_ratings.py`.

PostgreSQL collector integration tests run only against an explicitly supplied disposable `LAB_TEST_DATABASE_URL`. Never point those tests at a live study database.
