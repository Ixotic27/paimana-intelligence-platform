# PAIMANA Intelligence — SIH 2026 / Problem 26103

## 1. Verdict on the proposed approach

The stack is suitable. The missing work is primarily the definition of the prediction problem, defensible evaluation, trustworthy data, and the intervention workflow. A dashboard plus an XGBoost score is insufficient to demonstrate the statement's explicit requirement to assess gains over conventional methods and the predictive value of existing CUF fields.

The product should support a repeatable decision: **identify an emerging risk → inspect dated evidence → understand the model's reasons → assign a review → track the outcome**.

## 2. What is missing, and how we will address it

| Gap | Execution decision | Evidence for evaluators |
|---|---|---|
| No precise target or horizon | Separate eventual completion delay, final cost overrun, next-quarter deterioration and already-observed overruns. Do not call every score a probability. | Target dictionary and eligibility rules |
| Historical data access assumed | Inventory supplied reports; parse Table 6; join by project code, retain OCMS crosswalk; request authorized CUF exports later. | Reproducible extraction, source hashes, page references |
| No baseline comparison | Compare rules, prevalence baseline, logistic regression and XGBoost on identical eligible records and temporal splits. | Actual measured metrics, never invented accuracy |
| Leakage risk | Build each feature strictly from the information available at prediction time; split by report availability, purge overlapping target windows. | As-of feature contract and leakage tests |
| No CUF evaluation | Inventory current fields, group them, ablate schedule/cost/progress/history groups; compare CUF-only with genuinely collected enrichment. | Feature ablation table, unavailable variables explicitly marked |
| No uncertainty/calibration | Separate review priority from event probability; check calibration, Brier score and reliability by sector; suppress scores on invalid critical inputs. | Model card with limits and abstentions |
| SHAP treated as causal | Explain model output in its stated units; include baseline, positive and negative contributions, and source values. | Additivity check; no causal claims |
| No prescriptive workflow | Map warning reasons to review playbooks, owner, due date, status and audit history. | A working intervention queue |
| Optional proprietary LLM | Keep the core independent of Gemini; use deterministic source-linked queries first; optional self-hosted open-weight model later. | Application works without an API key |
| No integration/governance | Read-only data adapters initially; role-bound writes, provenance, audit, data freshness and versioned inference. | API contract, schema, Docker deployment |

## 3. Supplied data and immediate feasibility

The workspace contains April, May, June and July 2026 PAIMANA flash-report PDFs. Table 6 includes project code, legacy OCMS identifier where present, agency, ministry, infrastructure sector, state, approval/start month, original/revised completion month, original/revised cost, cumulative expenditure and physical progress. Values are in **INR crore**; dates have **month precision**.

These reports support real portfolio analytics, observed overrun detection, three month-to-month transitions, data-quality checks and a prototype of explainable early warnings. Four snapshots are not twenty years of training history. They do not by themselves support credible claims of long-term delay/cost prediction accuracy or causal bottleneck identification.

The parser uses only **Table 6: All Ongoing Projects**, avoiding double-counting the overview, regional and newly-added tables. It preserves raw cells, PDF page numbers, report month and file hashes. Missing values remain null. Projects disappearing from the ongoing table are **not assumed completed**. Completed-project Table 3 needs a separate verified lifecycle adapter before completion outcomes are usable. Exact coordinates, milestone paths, land acquisition, approvals, procurement, contracts and causes of delay must not be fabricated from the PDFs.

Report month is not data-availability time: April's introductory note states reporting through 19 May. Historical backtests must respect publication/receipt time. This initial short-window experiment will be labelled **retrospective report-sequence evaluation**, not a simulated real-time deployment.

## 4. Prediction contracts

### A. Immediately demonstrable: review priority

A versioned, deterministic 0–100 index uses observed schedule slippage, cost escalation, lag against an explicitly assumed linear schedule, and lack of reported progress in consecutive months. The reasons add to the index. It is a triage policy, **not a calibrated probability, not SHAP and not proof of future delay**. Expenditure ahead of progress is a review signal; financial and physical progress are not directly interchangeable earned-value measurements.

### B. Experimental short-window ML

Two separate binary targets: (1) a later reported completion target in the next available consecutive monthly report, and (2) a higher revised cost in that report. These are reporting-deterioration proxies, not actual completion delay or final cost. Train on April→May, compare models on June→July as an untouched later holdout; May→June may be reserved for validation in subsequent work. Only matched consecutive records with valid target fields qualify. Use early features only, include missingness indicators, and exclude IDs/names from learning. Report positive counts, AP/PR-AUC, ROC-AUC when defined, Brier score, precision/recall at a published threshold, and prevalence. Do not select a model based on the holdout and then claim that holdout as unbiased confirmation. Choose XGBoost a priori as the experimental candidate; display baseline wins honestly.

### C. Production targets after longitudinal access

- **Delay:** probability that verified actual completion exceeds the as-of committed date by >90 days, with 3/6/12-month decision horizons. Freeze the original and as-of revised baselines separately. Handle ongoing projects using censoring-aware survival methods or exclude them from completion labels without labelling them successful.
- **Cost:** expected final cost escalation ratio and prediction intervals relative to sanctioned original cost, with separate incremental escalation from as-of revised cost. Final costs and accounting closure are required.
- **Implementation:** milestone slippage or critical-path bottleneck classification only when milestone/dependency and reason-coded observations exist.

## 5. Architecture and data model

```text
Immutable PDFs / authorized CUF CSV / APIs
    → extraction staging + validation + quarantine
    → project registry + immutable monthly snapshots
    → as-of features → baseline / XGBoost → predictions + explanations
    → FastAPI → React + TypeScript dashboard
    → review queue → owner feedback + outcome audit
```

Use Pandas/NumPy for engineering, Scikit-learn for baselines/metrics, XGBoost for tree models, SHAP for model explanations, FastAPI/SQLAlchemy and PostgreSQL in Docker. SQLite is acceptable for an explicitly single-user local demo. The frontend can load a bundled, reproducibly generated report snapshot for an evaluator demonstration without server setup; its source mode must remain visible. The full local API provides persistent review records. A standalone hosted dashboard does not imply the Python backend is remotely deployed.

Core production entities:

- `source_report`: SHA-256, filename, report month, published/received timestamps, parser version.
- `project`: stable project code, legacy code crosswalk, agency; dated ministry/sector changes.
- `project_snapshot`: unique (project, source/version), cost fields, schedule fields, physical progress, reported status, state and source page.
- `feature_snapshot`: as-of timestamp, eligibility, feature schema version, missingness and lineage.
- `model_run`: training windows, labels, dataset hash, hyperparameters, code revision, calibration, evaluation and artifact hash.
- `prediction`: project/as-of/model/target/horizon, score, uncertainty, abstention reason.
- `explanation`: output space, baseline, signed contributions and feature values.
- `intervention` / `audit_event`: warning version, owner, due date, status, reason, actor and timestamps.

## 6. Execution roadmap (six-person team, four weeks)

| Phase | Work and ownership | Deliverable and acceptance gate |
|---|---|---|
| Days 1–2: data contract | Data lead + domain lead: inspect reports, verify units, parse Table 6, match IDs, count missing fields, reconcile report totals | No unexplained duplicate snapshot keys; exact ongoing project counts or documented discrepancies; stratified sample checked against PDF |
| Days 3–5: demonstrable product | Frontend + backend: portfolio, filters, project history, rule explanations, sources, review queue; ML lead: feature definitions | Every number traces to a source or documented calculation; no fake model claims; end-to-end evaluator walkthrough |
| Days 6–9: statistical foundations | ML + data: acquire history, define eligible labels, naive/rule/logistic and regression/survival baselines | Immutable temporal split manifest; label audit; missing-data strategy fitted only to training |
| Days 10–13: predictive experiment | ML: XGBoost candidate, model comparison, uncertainty and SHAP; backend: versioned inference | Candidate gains or losses reported against same baseline; output-space/additivity verified; no future leakage |
| Days 14–17: CUF study | Domain + ML: group ablation; request and map justified extra fields; sector/size/region slice evaluation | CUF contribution table with confidence intervals; explicit distinction between measured and proposed enrichment |
| Days 18–21: operations | Backend + QA: role access, audit log, alert deduplication, owner workflow, API adapter, scheduled ingestion, Docker | Repeat imports are idempotent; unauthorized writes rejected; review history survives restart; no alert storm |
| Days 22–25: hardening | QA + team: corrupted PDFs, schema drift, stale feeds, sparse history, bad dates, drift checks, load and accessibility | Demonstration works offline; recoverable failure states; documented performance on available hardware |
| Days 26–28: evaluation pack | Domain + team: model card, source lineage, architecture, demo script and evidence deck | Five-minute walkthrough + reproducible metrics + candid limitations + deployment instructions |

For a 48-hour hackathon, prioritize Days 1–5, one honest retrospective comparison and the evidence pack. Cut the conversational LLM before cutting data validation or baseline evaluation.

## 7. Evaluation protocol

1. Lock target definitions, horizon, unit of analysis and eligibility before training.
2. Reserve the latest time block; tune only on earlier data. Add held-out-project evaluation separately to quantify generalization to new projects.
3. Fit preprocessing and encoders on training data only. Exclude actual completion, future revisions and future-derived rollups from features.
4. Compare prevalence, transparent rules, logistic/statistical models and boosted trees on identical samples. For continuous outcomes include MAE/RMSE and interval coverage.
5. Prioritize PR-AUC/AP for rare events, Brier and calibration, recall at a fixed review capacity, false alerts per 100 projects, and warning lead time. A high accuracy with few positives is not sufficient.
6. Bootstrap by project, not independent monthly rows; report subgroup sample sizes and intervals. With only four reports, results are exploratory.
7. Run CUF-only group ablations and only compare enriched data when actual observations exist. Incremental cost of collection matters.
8. Separate an observed issue alert from advance warning; measure lead time before the actual event, accounting for data receipt lag.
9. Validate SHAP in the model's output space; never translate log-odds contributions directly into percentage-point causal effects.
10. Pilot with monitoring officers to measure useful interventions and alert burden. Do not claim financial savings from model scores alone.

## 8. Operational requirements before real use

Use ministry/agency-scoped authorization, encrypted transport, managed secrets, least-privilege database roles, schema migrations, backup/restore verification, append-only audit records and human review of proposed actions. Add freshness alarms and prevent inference when critical fields are unavailable. Store immutable model and data versions. Re-evaluate after schema or policy changes; monitor feature/missingness drift and outcome-linked performance. Keep any LLM read-only, route through allowlisted structured queries, include project/month citations, and avoid passing restricted data to third-party APIs without approval.

## 9. Evaluator demonstration

1. Show the real portfolio and the four imported report months. Open data coverage and extraction counts.
2. Filter to one ministry or state and explain that totals change with the selected portfolio.
3. Open a high-priority project. Compare original/revised dates and costs, monthly progress, and the exact PDF page.
4. Explain the transparent priority contributions; distinguish observed overrun from forward-looking experimental predictions.
5. Open model evidence: describe the next-report revision proxy, train/test months, positive count, baseline comparison, and limitations.
6. Create a review with an owner and due date. Show its status and persistence mode.
7. Conclude with the measurable next milestone: longer authorized history, validated actual outcomes and CUF ablation—not just adding a chatbot.

## 10. Sources

- Supplied SIH problem statement: `pasted-text.txt`, PS 26103, MoSPI / DIID.
- Supplied PAIMANA flash reports: April–July 2026, Table 6 and reporting notes; local PDFs retained unchanged.
- [PAIMANA report portal](https://paimana-proj.mospi.gov.in/ReportPage).
- [Pixel Code font and license](https://qwerasd205.github.io/PixelCode/).
- [SHAP TreeExplainer](https://shap.readthedocs.io/en/stable/generated/shap.TreeExplainer.html): output units and additive explanations.
