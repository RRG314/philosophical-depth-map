# Optional AI service

Cloudflare Worker + SQLite-backed Durable Object, independently deployable. The static game functions without it. No API credentials were available for a live model test. A successful dry-run is a packaging check, not a live deployment.

```
cp server/.dev.vars.example server/.dev.vars
# Replace values locally. Never commit this file.
npm run server:dev
# After Cloudflare account authorization and provider configuration:
npx wrangler secret put OPENAI_API_KEY --config server/wrangler.toml
npx wrangler secret put IP_HASH_SALT --config server/wrangler.toml
# Set AI_MODEL to a supported tested model snapshot in Wrangler configuration.
npm run server:deploy
```

Set allowed origins exactly. Build frontend with public `VITE_AI_ENDPOINT=https://your-worker.workers.dev`. Never put provider keys in VITE variables. `/health` reports configuration only; `/guide` and `/evaluate` accept POST `{questionId, answer, consent:true}`. `/research` returns 503; it never accepts enrollment or uploads. Responses are not persisted by this service. AI evaluation is provisional, evidence-validated, versioned, and kept separate from self-reflection summaries. The UI exposes the guide; evaluator is an API intended for reviewed research tooling, not official scoring.

The provider adapter calls the current [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create) with [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), `store:false`, no tools and a 25-second timeout. Documentation checked 10 October 2026. This setting does not guarantee zero provider retention; disclose the provider's actual contractual and abuse-monitoring terms before enabling. Require output schema, valid dimensions, bounded scores, exact evidence and abstention consistency. Input is a JSON data field separate from trusted instructions. These are defenses, not proof against every model failure.

## Abuse and cost limits

Only allowlisted browser origins; no cookies or database credentials. CORS is not user authentication: non-browser clients can imitate Origin. A single Durable Object reserves usage atomically across all requests; daily global and salted daily IP-hash limits cap unauthenticated abuse. IP hashes expire on day reset/alarm, at most roughly 48 hours if no traffic. Raw IPs and reflections are not logged by application code; platform infrastructure may retain request metadata. Shared networks can hit a common limit.

Request body is capped at 22,000 bytes while streaming; answer at 18,002 characters. Provider output capped at 1,800 tokens. Each call reserves 40,000 token units conservatively. On successful completion, validated provider usage settles that reservation exactly once. Missing usage or a failed request retains the full reservation. The default 400,000 token cap therefore permits at most 10 simultaneous or unsettled calls; completed calls release only their unused reservation. The request and per-IP ceilings remain in effect after settlement. Validate positive integer limits before launch. Choose a model whose input capacity accepts the bounded payload and whose maximum output supports the schema. Set a provider project budget too. An upper cost planning bound is reserved token cap × max(input price, output price) per token, plus platform requests/storage. Actual prices depend on the selected model and must be checked before launch; no dollar price is assumed here. Changing provider features or adding tools requires a new bound.

Minimal operational checks: probe health, alert on error rates and budget exhaustion using aggregate metrics without answer text, monitor provider spend, rotate keys, review platform retention, and test allowed/denied origins. No production monitoring account is configured. No automatic research logging occurs merely because an AI request was made.
