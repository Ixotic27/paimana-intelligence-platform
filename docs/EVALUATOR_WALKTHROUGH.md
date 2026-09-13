# Five-minute evaluator walkthrough

## Before the presentation

Start the API and frontend using README.md. Open the local Vite URL. Confirm the sidebar says **Local API connected**, select **Jul 2026**, and click **Reset**. The map needs internet; the report data, source PDFs, font, charts and experimental model evidence are local. There is one resolved QA review; use a different owner name for a fresh demo.

## 0:00–0:40 — Show the actual problem

"PAIMANA already monitors infrastructure projects. Our layer helps an officer prioritise reviews, inspect the evidence, and record an intervention. We distinguish what has already happened from experimental estimates of what the next report might show."

Show July: **1,775 ongoing projects**, approximately **37.11 lakh crore revised cost**, **353 high-review-priority projects**, and **482 projects with reported cost escalation**. These are calculated from the loaded July Table 6, not copied dashboard placeholders. The 353 figure is produced by our published triage policy; it is not an official PAIMANA risk classification.

## 0:40–1:20 — Prove the data is real

Open **Data & sources**. Show four reports, 7,590 monthly records and 2,074 distinct project codes. Show zero duplicate keys. Open a source PDF. Explain that stable project codes connect the reports and that source-page numbers follow PDF pagination.

Mention that projects disappearing between reports are not automatically labelled complete. This explains why a falling portfolio count cannot by itself be interpreted as completed projects or improvement.

## 1:20–2:30 — Explain a priority, with evidence

Return to **Overview** and open **Araria-Supaul 92 km (705368)**. In July the reported original cost is 1,605 crore, revised cost approximately 2,621 crore, expenditure approximately 2,141 crore, and physical progress 40%.

Explain its 100/100 review index: capped contributions of 35 for lag against the explicit linear-schedule assumption, 30 for a 34-month completion-date extension, 25 for reported cost escalation, and 10 for the decrease in reported progress since June. The decrease could be a measurement or scope correction; it is not proof of work reversing. The officer should verify the record.

**Say explicitly:** "100/100 means the rule-based review priority is at its cap. It does not mean a 100% probability of delay."

Show the April–July history and open **July PDF page 81** to inspect the underlying record. Show a recommended review action next to each observed signal.

## 2:30–3:30 — Demonstrate the predictive component honestly

Open **Model evidence**. Explain that the models are trained on April→May and compared on June→July, using only earlier snapshot features. The two targets are a later reported completion target and a higher reported revised cost in the following monthly report.

Show that logistic regression's schedule average precision (0.350) is higher than the XGBoost candidate's (0.332), and both exceed the prevalence baseline (0.183). This directly addresses the statement's demand to test whether AI adds value over conventional techniques. It is useful evidence even when a simpler model wins.

Open the feature-group ablation. Show that removing cost fields improves schedule AP in this small experiment. Do not overstate it as a universal conclusion or a finished study of extra CUF variables.

Return to a July project and expand an experimental prediction to show actual SHAP contributions in log-odds. Explain that these are model attributions, separate from rule points and causal explanations. The cost experiment has only three training positives and is not reliable for decisions.

## 3:30–4:20 — Close the decision loop

Open a project, enter a review owner, use the editable due date and click **Create review**. Close the project and open **Early warnings → Review queue**. Show the saved review. Reload and reopen the queue to demonstrate persistence. Resolve it. The backend records create/resolve events; no email or message is sent to the named owner.

## 4:20–5:00 — State the next milestone

"Our next step is longer authorized OCMS/CUF history, actual completion and final-cost outcomes, and publication timestamps. Those allow genuine advance-warning validation, probability calibration, lifecycle labels, and fair sector-level evaluation. Role-scoped access and a production ingestion service follow. Gemini is optional; the core demonstration uses open-source software and runs without an external AI key."

## Likely questions

**Why not show an impressive accuracy number?** Rare-event accuracy can reward a model that always predicts no change. We show ranking metrics, calibration error, positive counts and threshold recall. Our cost training data is too sparse to support a credible accuracy claim.

**Are you using the entire historical OCMS database?** No. This version uses the four supplied 2026 PDFs. The data plan includes the OCMS crosswalk and the access needed for longer history.

**Is SHAP proving the cause of delay?** No. It explains a fitted model's output. Operational causes require validated milestone/reason data and human investigation.

**Are the map points exact?** There are no inferred project pins. The source provides state-level location, so the map is regional context only.

**Why PostgreSQL if the local demo uses SQLite?** The SQLAlchemy-backed demo works with SQLite for quick local setup; the Docker configuration targets PostgreSQL. Production normalization, migrations and access control remain explicit roadmap work.

**What would success mean beyond a dashboard?** Useful warning lead time before an actual event, fewer false alerts for a fixed review capacity, traceable intervention decisions, and validated outcome improvements in a monitored pilot.
