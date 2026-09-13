# Evidence and current limits

## Data reconciliation

All figures below are calculated from extracted Table 6 records, with original PDFs retained. Header financial totals are rounded to whole INR crore; extracted sums reconcile to that precision.

| Report | Records | Original cost (crore) | Revised cost (crore) | Expenditure (crore) |
|---|---:|---:|---:|---:|
| April 2026 | 1,981 | 3,712,662.01 | 4,278,402.37 | 2,036,107.49 |
| May 2026 | 1,987 | 3,709,724.65 | 4,249,554.14 | 2,181,683.19 |
| June 2026 | 1,847 | 3,561,721.07 | 4,054,473.30 | 2,196,663.55 |
| July 2026 | 1,775 | 3,370,138.22 | 3,710,641.55 | 1,926,099.57 |

There are 7,590 project-month records, 2,074 distinct project codes, zero duplicate project/month keys and zero rejected Table 6 rows. Financial totals reconcile, but that does not replace a full manual audit of every project name and field.

The April Kadapa airport row (612786), PDF page 55, was inspected against a rendered source page: original cost 265.91 crore, expenditure 129.07 crore, progress 65%, start January 2024, revised completion July 2026.

Quality flags across snapshots: 287 cases of expenditure above revised cost; 11 missing start months and 11 missing original completion months. These are retained as reported rather than silently corrected. Progress can decrease because of measurement/scope corrections; the warning explicitly asks the reviewer to verify this. Missing or removed projects do not become successful outcomes automatically.

## Real, exploratory model experiment

Train: matched April→May project reports. Untouched later comparison: June→July. The candidate and hyperparameters were fixed before viewing these holdout metrics. May→June is not used in fitting or tuning. There is no random row split. Projects may occur in both training and test periods, which evaluates later observations of a monitored portfolio, not unseen-project generalization.

Input fields: log original cost, cost escalation percentage, expenditure/revised cost, physical progress, months since start, months to original target, completion-date extension and lag against a linear schedule assumption. Names and IDs are excluded. Logistic preprocessing is fitted only on training records. XGBoost handles missing values. No external enrichment was collected. The field groups are aligned with the report; exact CUF schema equivalence remains to be verified against an authorized CUF specification.

| Target / method | Train positives / pairs | Holdout positives / pairs | Average precision | ROC-AUC | Brier score |
|---|---:|---:|---:|---:|---:|
| Later completion target / prevalence | 416 / 1,599 | 257 / 1,404 | 0.183 | 0.500 | 0.155 |
| Later completion target / logistic | same | same | **0.350** | **0.754** | **0.141** |
| Later completion target / XGBoost | same | same | 0.332 | 0.740 | 0.143 |
| Higher revised cost / prevalence | 3 / 1,951 | 85 / 1,732 | 0.049 | 0.500 | 0.049 |
| Higher revised cost / logistic | same | same | 0.098 | 0.699 | 0.049 |
| Higher revised cost / XGBoost | same | same | 0.089 | 0.655 | 0.049 |

Higher AP/AUC and lower Brier are preferable. AP is average precision, not the percentage of correct predictions. The logistic baseline beats the boosted candidate on schedule AP/AUC/Brier in this split. ML superiority is **not** established. At a 0.5 threshold, XGBoost schedule recall is approximately 0.226 and precision 0.343; logistic recall is zero at that arbitrary threshold despite better ranking. Threshold selection requires a review-capacity objective and earlier validation data.

The cost model has **only three positive training examples**, versus 85 in the later window. Its displayed probabilities are uncalibrated and unsuitable for decision-making. Zero recall at 0.5 is explicitly reflected in the dashboard; high apparent overall accuracy would be misleading.

## Available-field ablation

Fixed XGBoost candidate, same split; each group is removed without tuning against the holdout.

| Removed group | Schedule AP | Cost AP |
|---|---:|---:|
| None | 0.332 | 0.089 |
| Cost fields | 0.405 | 0.091 |
| Progress fields | 0.298 | 0.080 |
| Schedule fields | 0.308 | 0.109 |

Removing cost fields improves schedule ranking here. This is exploratory sensitivity evidence, not proof that those variables are universally irrelevant. Do not select the best ablation and reuse these holdout results as an unbiased confirmation. Longer data and a new evaluation window are needed. CUF versus extra-variable performance cannot yet be assessed because the extra variables are absent.

## Explanations

The dashboard's priority score is a transparent rule index with additive **rule points**. Experimental XGBoost predictions have separate **actual Tree SHAP values in log-odds**, a baseline, input values and signed contributions. Explanations are computed from the fitted models, not invented for visual effect.

Maximum observed SHAP margin reconstruction residuals are below 0.000003. Tests also apply the logistic transform to the summed contributions and compare against model probability for every published prediction. SHAP is associative attribution within a model, not causal proof of land, procurement, finance or agency bottlenecks.

## What has been verified

- Production frontend compilation and local route serving.
- Fifteen automated tests: seven backend/model tests and eight frontend/data/API-helper tests. These cover the source contract, project/review APIs, SHAP reconstruction, missing labels, prediction month, source conflicts, score eligibility, CSV safety and API error handling.
- Browser checks and final run notes are recorded in `docs/VALIDATION.md`.
- Docker configuration is supplied, but Docker is not installed on the current machine, so container startup and PostgreSQL integration have not been executed here. SQLite-backed API behavior is exercised.

## What remains before operational claims

Acquire longer authorized OCMS/CUF history with publication/receipt timestamps, actual completion and final-cost labels. Verify crosswalks, lifecycle transitions and unit normalization. Add censoring-aware targets and true early-warning lead-time evaluation. Calibrate probabilities on earlier held-out data and evaluate uncertainty, subgroup performance and alert burden. Add authenticated roles, migrations, robust ingestion/versioning and monitoring. These are execution-plan milestones, not completed features.
