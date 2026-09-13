# Validation record — 13 September 2026

## Passed

- Table 6 extraction: 1,981 April, 1,987 May, 1,847 June and 1,775 July rows; 7,590 snapshots; 2,074 distinct IDs; no duplicate project/month keys or rejected rows.
- Original-cost, revised-cost and expenditure totals reconcile to each report's overview within its whole-crore rounding precision.
- A rendered April source page was visually inspected; the Kadapa airport row matches parsed cost, expenditure, progress, dates and source page. This is a spot check, not manual verification of every row.
- Hash-validated extraction-cache reuse completes without duplicating records.
- Fifteen automated tests pass: seven backend/model tests and eight frontend/data/API-helper tests. Coverage includes provenance, paging/history, intervention validation/deduplication/audit, all published SHAP probability reconstructions, missing-target handling, artifact prediction month, conflicting source imports, invalid score inputs, CSV safety and API error handling.
- Frontend TypeScript compilation and Vite production build pass. The initial JavaScript bundle is 277.39 kB (85.91 kB gzip), down from approximately 637 kB. The progress chart loads on demand as a separate 361.92 kB chunk. There is no bundle-size advisory in the current build.
- Browser outage recovery: stopping the local backend caused a review save to display an error without adding a review. Restarting the backend and choosing Reconnect API restored the saved queue and cleared the connection error. The database retained only the original resolved QA review.
- A regression test changes an existing source snapshot and confirms startup rejects the conflict, preserving the stored snapshot and previously loaded application data. The API also restarts successfully against the unchanged real dataset.
- The local dashboard serves successfully, loads the self-hosted Pixel Code font and real report data, and detects the local API.
- Browser: project 705368 opens with four months of history, rule contributions, actual experimental explanations and the July PDF page-81 link.
- Browser: project 701263 is found in April with revised cost 79,459 crore and 91.9% progress. It is absent from the July ongoing portfolio, correctly yielding no result rather than a fabricated latest status.
- Browser: ministry filtering shows 26 Civil Aviation projects in April; reset restores the complete portfolio. Pagination and the no-results state respond to the filtered selection.
- Browser: a review for 705368 with owner `Demo reviewer (QA)` and due date 2026-09-20 was saved, survived a page reload and was resolved. The resolved record is intentionally retained in the local demo audit trail.
- The review form defaults to an editable date seven days ahead and submits actual form-field values. Native browser automation did not reliably dispatch date-input changes; using the form values also prevents stale controlled-state payloads.
- Desktop (1440 px), intermediate (747 px) and phone (390 px) layout checks show no page-level horizontal overflow. Wide tables scroll within their panels. The assistant is accessible from the collapsed sidebar.
- Browser: model-evidence tables display the measured baseline, logistic, XGBoost and ablation results, with training/test counts and the three-positive cost-model limitation.
- The optional read-only `list_filtered_projects` browser tool returns the current portfolio and source pages. Valid limit=2 returns two real projects; invalid limit=0 is rejected intentionally.

## Limits / not executed

- Docker is unavailable on this machine. Container startup and PostgreSQL integration are configured but not executed. The running API uses SQLite.
- There is no authentication or production role enforcement. The servers bind to loopback and are intended for a single-user demonstration.
- No complete manual audit of all PDF rows, load test, formal accessibility audit, long-term calibration, prospective validation or subgroup uncertainty study was performed.
- The external OpenStreetMap iframe requires connectivity; it is regional context with no inferred project-coordinate claims.
- A private Sites registration was created early in the session. The Sites plugin was subsequently removed from the available local plugin files. No source was pushed and no hosted deployment was completed. The existing identifier is preserved in `.openai/hosting.json` for a future explicit continuation; do not create a duplicate site. The deliverable in this session is local.

## Runtime

- Frontend: http://127.0.0.1:5173
- API: http://127.0.0.1:8000
- API documentation: http://127.0.0.1:8000/docs
- Restart instructions: README.md.
