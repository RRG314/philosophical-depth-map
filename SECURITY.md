# Security model and reporting

Do not post secrets, private reflections or participant data in public issues. For a vulnerability, use GitHub private vulnerability reporting if enabled, or contact the repository owner privately. No dedicated security response team or guaranteed response time is claimed.

| Threat | Current control | Remaining limit |
|---|---|---|
| Client key leakage | No provider keys in VITE variables; ignored local secret files | Review built artifact and deployment settings |
| XSS from answers/import/AI | React text rendering, no raw HTML, strict bounded import schemas | Dependency/browser vulnerabilities remain |
| Unsafe file import | 2 MB cap, exact schema, known IDs/versions, score/evidence validation, consent reset | Local self-ratings are not tamper-proof research records |
| API abuse/cost | Bounded request/output, allowlisted origins, atomic global and salted-IP daily reservations | CORS is not auth; distributed abuse can exhaust shared allowance |
| Prompt injection | Trusted instructions separate from response data; no model tools; schema and exact-evidence checks | Semantic manipulation/bias requires human audit |
| CSRF | No authenticated cookies or browser credentials in optional service | Reevaluate when accounts are added |
| Participant leakage | No live collection; revoked public DB privileges and forced RLS | Trusted identity service and consent-gated writes must be implemented before research |
| Sensitive logging | No answer logging, no analytics; provider storage disabled where API supports it | Host/provider metadata and abuse retention require operator review |
| Data loss | Export/import and serial writes | No cross-tab conflict resolution or recovery after browser eviction |

Never expose PostgreSQL credentials to the client, use superuser credentials in a service, or trust an arbitrary participant UUID from a request. Validate secrets, origin list, model and positive limit configuration at launch. Test deletion/export on the deployed service before enabling research. GitHub Pages cannot supply arbitrary security headers; React escaping is the primary current content-injection boundary. Add CSP/headers when moving to a configurable host. Dependency audit is part of release verification, not a perpetual security guarantee.
