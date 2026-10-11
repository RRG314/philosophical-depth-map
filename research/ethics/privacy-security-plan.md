# Proposed privacy and security plan

Research collection remains disabled. Local game records stay on the device unless the user deliberately exports them or an authorized, separately consented submission service is later enabled.

## Data flow and minimization

Game: prompt → response → IndexedDB → optional user-directed file export. Research: explicit consent → authenticated/pseudonymous submission → private database → restricted rater view → derived analysis. AI: separate disclosure and authorization → minimal response and prompt content → server-side provider request → schema-validated output. Do not send full browser history, stored profiles or contact information to the AI provider.

Keep participant contact links separate from response records. Never infer religion, ethnicity, age or political beliefs from text. Optional demographic data require justification, granular consent and a minimum reporting-cell policy. Store raw records immutably where retention allows; derive analysis data with code/version provenance. Corrections and deletion must be auditable without preserving deleted sensitive text in the audit log.

## Proposed retention for institutional review

Raw research responses and rating evidence: up to 24 months after collection, then delete or retain only specifically approved deidentified derivatives. Contact records: delete within 90 days after last planned follow-up. Security logs: 30 days with no response text. Backups: expire within 30 days after primary deletion. These are proposed maxima and must be reconciled with institutional requirements and processor contracts before consent is offered; the runtime must not promise them until operationally verified.

## Controls and verification

TLS in transit, encrypted managed storage at rest, least-privilege roles, per-participant access isolation, no browser secrets, authenticated research endpoints, server-side consent checks, validated bounded inputs, rate limits, dependency review and safe import handling. Record access and export events without text contents. Test participant A cannot read, alter or delete participant B; revoked consent blocks future submissions; deletion removes all linked raw and derived records subject to disclosed lawful exceptions. Backup expiration and provider retention require operational verification.

## Withdrawal and incidents

Supply a withdrawal code and actual investigator contact at enrollment. Verify requests without collecting excessive identity documents. Log request receipt, scope, completion and backup expiry. Do not promise deletion of published aggregate statistics when individual contributions cannot be isolated. Suspend collection after material breach, preserve minimal incident evidence, notify the responsible institution and follow applicable legal/institutional timelines. No legal compliance certification is asserted by this draft.
