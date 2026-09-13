# What remains — PAIMANA Intelligence

## Current status

The local evaluator prototype is working. It is **not yet a production early-warning service**. The interface, report extraction, retrospective experiments, real SHAP explanations and local review persistence are implemented. The remaining main work is data acquisition, statistical validation, operational ingestion and production controls.

## Small issues completed in the follow-up

- Reject malformed month strings and non-finite/invalid critical values from review-score eligibility.
- Keep a suppressed score blank in CSV exports instead of exporting an apparently valid number.
- Neutralize formula-like spreadsheet cells even when a dangerous prefix follows whitespace; retain correct quoting.
- Load the progress chart only when project details need it. Initial JavaScript falls from about 637 kB to 277 kB (minified, before gzip); the chart is a separate approximately 362 kB download.
- Handle failed review loads/writes/resolution without an unhandled promise or falsely changing the saved status.
- Provide API reconnection and an explicit refresh of saved reviews. Preserve session-only reviews separately on reconnection; do not silently upload them or send their IDs to the database.
- Readable validation messages; duplicate open-review checks in snapshot demo mode too.
- Clear old assistant answers when portfolio filters/month change.
- Record the experimental artifact's prediction month and use it in the API and UI. A newly imported report cannot relabel the July experiment as a newer prediction.
- Refuse a conflicting re-import of an existing project/month record instead of silently letting the database and source file disagree. Preserve the original stored snapshot; no automatic overwrite.
- Add eight frontend/data/API-helper regression tests and backend artifact-month/source-conflict regression tests. Current total: **15 automated tests**.

## Required before a credible predictive pilot

| Priority | Remaining work | Why this is not a small fix | Completion evidence |
|---|---|---|---|
| P0 | Obtain longer authorized OCMS/PAIMANA/CUF history, publication timestamps and verified actual completion/final-cost outcomes | Requires access and outcome data beyond the supplied four PDFs. Only three cost-increase training positives exist in the current split. | Versioned project-level history and audited labels with enough positive outcomes |
| P0 | Define and validate actual delay/cost targets, censoring, calibration and meaningful warning horizons | The current target is a next-report revision proxy, not actual completion or final cost. Statistical validity cannot be supplied by more UI code. | Leakage-safe temporal evaluation, baseline comparison, calibration/intervals, subgroup sample sizes and warning lead time |
| P0 | Build robust recurring ingestion and a verified project lifecycle | Current extractor supports the four supplied reports; Table 3 completion events, new layouts, corrections and receipt timestamps require adapters and validation. | Idempotent imports, quarantine, source reconciliation, immutable corrected versions, lifecycle crosswalks |
| P0 | Replace prototype database initialization with a normalized, migrated data model | Current snapshots are stored as JSON payloads; conflicting same-key re-imports now stop startup and preserve the stored row. Accepting a correction requires designed versioning and migrations. | Schema migrations, versioned sources/snapshots/predictions, database-enforced review constraints, backup/restore |
| P0 | Authentication, ministry/agency permissions and accountable audit identities | Current API is intentionally a single-user loopback demo. Identity and access scope need an agreed deployment/identity provider. | Tested access isolation, authenticated actors, least-privilege writes and secret management |
| P1 | Run the Docker/PostgreSQL stack and deploy a private pilot | Docker is unavailable on this machine. Configuration exists, but a running container/database/host must be tested. | Successful container startup, persistence/restart tests, health checks, HTTPS and host-level monitoring |
| P1 | Evaluate additional CUF/enrichment variables | Existing report-field ablations are implemented; exact CUF schema equivalence and extra variables are not available. | Verified CUF mapping and measured incremental benefit from genuinely collected milestone/reason/contract data |
| P1 | Pilot the intervention workflow with monitoring officers | Owner/due/status and audit APIs exist, but routing, escalation rules, review capacity and outcome feedback need domain decisions. | Measured useful alerts, false-alert burden, acknowledgement time and reviewed outcomes |

## Optional after the core evidence is sound

- Exact GIS project pins and route geometry: obtain authoritative coordinates; the current map deliberately offers regional context only.
- Gemini or a self-hosted language model: the current source-linked assistant is deterministic. Add an LLM only after deciding data permissions and evaluating grounded answers.
- Larger-scale performance, formal accessibility and security testing: current checks cover local functional behavior and responsive layouts, not operational certification.

## Recommended sequence

For the next evaluator review, use the existing demo and its honest model comparison. In parallel, request the longer longitudinal data and the CUF specification. Then implement lifecycle/correction-aware ingestion and the production schema, followed by validated target models. Add authentication and test PostgreSQL before allowing multiple users into a hosted pilot. Treat exact GIS and an LLM as optional additions.

See EXECUTION_PLAN.md for the phased team roadmap, EVALUATION.md for measured results, and EVALUATOR_WALKTHROUGH.md for the demo script.
