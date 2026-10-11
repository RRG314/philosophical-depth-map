# Research database — collection disabled

Apply once with `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f database/001_initial.sql`. Test a disposable database with `psql ... -f database/test.sql`. Migration is transactional and deliberately fails if reapplied; use a migration ledger before future versions. Never run tests against participant data. No remote database is provisioned by the static game.

## Access boundary

All public privileges revoked. Participant tables force RLS, with SELECT-only ownership policies. No enrollment/write policy is enabled. A future authenticated service must derive the participant UUID from a verified session and `SET LOCAL pdm.participant_id` inside a transaction. **This custom setting is not authentication**: do not hand database credentials or arbitrary SQL execution to participants. Use separate restricted service roles, TLS, pooled-connection transaction boundaries, migrations under an administrator, and a separately reviewed researcher role. Do not use the owner/superuser for API requests. Research writes additionally require active versioned consent and institutional authorization in application code. Those future routes are not implemented or enabled.

## Data dictionary

| Table | Purpose / provenance |
|---|---|
| participants | Random UUID, creation and withdrawal time; no names, email, inferred demographics |
| consent_versions / consents | Immutable consent text, approval reference, explicit dated grant or withdrawal |
| questions / rubrics | Composite ID+version snapshots, original item JSON and anchored rubrics |
| graph_nodes / graph_edges | Typed nodes and directed multigraph, contested flag and rationale |
| sessions | Participant-owned mode and timing |
| responses / revisions | Original text kept separate from ordered revisions; ownership enforced across session and response FKs |
| model_prompts | Provider/model snapshot, prompt version and cryptographic hash |
| ratings | Raw 0–4 or missing observations, evidence, reasons, rater identity/type, version and time |
| analysis_runs | Code commit, specification, input manifest hash, random seed |
| estimates / calibrations | Derived outputs with explicit run provenance; never computed by the game |
| achievements | Exploration rewards only |
| assignments | Preregistered study/condition, seed, assignment time |
| events | Consented minimal study telemetry, optional latency/token/cost metadata; no raw prompts in details |
| export_requests / deletion_requests | Request status; no publicly accessible export storage |
| audit_log | Action and opaque request ID; no participant or reflection text |

A deployment must add consent-aware authenticated endpoints, request ownership checks, export expiry, withdrawal processing, backup deletion, retention jobs, access audit, and disaster recovery tests before collection. The public Worker explicitly rejects research submission. This schema supports future infrastructure; it does not imply ethics approval or a functioning sync service.
