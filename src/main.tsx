import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Layers3,
  LayoutDashboard,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  Dataset,
  Project,
  derive,
  fmt,
  money,
  date,
  shortMinistry,
} from "./data";
import "./style.css";
import { portfolioCsv } from "./export";
import { ApiError, requestJson } from "./api";
const ProgressHistory = lazy(() => import("./ProgressHistory"));
import { usePortfolioTools } from "./webmcp";

const views = [
  ["Overview", LayoutDashboard],
  ["Project explorer", Layers3],
  ["Early warnings", Bell],
  ["Sector benchmarks", BarChart3],
  ["Geographic view", Globe2],
  ["Model evidence", Activity],
  ["Data & sources", Database],
] as const;
type Review = {
  storage?: "session";
  id: string;
  project_id: string;
  project_name: string;
  owner: string;
  due: string;
  status: string;
  created_at: string;
};
type ModelEvidence = {
  prediction_month: string;
  status: string;
  train: string;
  test: string;
  targets: Record<
    string,
    {
      train_n: number;
      test_n: number;
      train_positive: number;
      test_positive: number;
      metrics: Record<string, Record<string, number | null>>;
      ablation?: Record<string, Record<string, number | null>>;
    }
  >;
  predictions: Record<
    string,
    Record<
      string,
      {
        probability: number;
        base: number;
        contributions: {
          feature: string;
          value: number | null;
          contribution: number;
        }[];
      }
    >
  >;
};
export default function App() {
  const [data, setData] = useState<Dataset | null>(null),
    [error, setError] = useState(""),
    [view, setView] = useState("Overview"),
    [month, setMonth] = useState(""),
    [search, setSearch] = useState(""),
    [ministry, setMinistry] = useState("All ministries"),
    [state, setState] = useState("All states"),
    [band, setBand] = useState("All priorities"),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<Project | null>(null),
    [chat, setChat] = useState(false),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [toast, setToast] = useState(""),
    [api, setApi] = useState(false),
    [apiError, setApiError] = useState(""),
    [checkingApi, setCheckingApi] = useState(false),
    [resolving, setResolving] = useState<string | null>(null),
    [reviews, setReviews] = useState<Review[]>([]),
    [evidence, setEvidence] = useState<ModelEvidence | null>(null),
    [sort, setSort] = useState("priority"),
    [showReviews, setShowReviews] = useState(false);
  useEffect(() => {
    fetch("/data/portfolio.json")
      .then((r) => {
        if (!r.ok)
          throw Error(
            "Dataset is not available. Run the report extraction and dataset build.",
          );
        return r.json();
      })
      .then((d) => {
        setData(d);
        setMonth(d.audit.sources.at(-1).month);
      })
      .catch((e) => setError(e.message));
    fetch("/data/model-evidence.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setEvidence)
      .catch(() => {});
    void checkConnection();
  }, []);
  useEffect(() => {
    setPage(0);
    setAnswer("");
  }, [month, search, ministry, state, band, sort]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const projects = useMemo(
    () => (data && month ? derive(data, month) : []),
    [data, month],
  );
  const filtered = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            (ministry === "All ministries" || p.ministry === ministry) &&
            (state === "All states" || p.state === state) &&
            (band === "All priorities" || p.band === band) &&
            `${p.name} ${p.id} ${p.agency} ${p.state}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "cost"
            ? (b.revised_cost || 0) - (a.revised_cost || 0)
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : Number(b.eligible) - Number(a.eligible) || b.score - a.score,
        ),
    [projects, ministry, state, band, search, sort],
  );
  const totals = useMemo(
    () => ({
      cost: filtered.reduce((s, p) => s + (p.revised_cost || 0), 0),
      expenditure: filtered.reduce((s, p) => s + (p.expenditure || 0), 0),
      high: filtered.filter((p) => p.band === "High").length,
      overrun: filtered.filter((p) => (p.costOverrun || 0) > 0).length,
    }),
    [filtered],
  );
  const sectors = useMemo(() => {
    const groups = new Map<string, Project[]>();
    filtered.forEach((p) =>
      groups.set(shortMinistry(p.ministry), [
        ...(groups.get(shortMinistry(p.ministry)) || []),
        p,
      ]),
    );
    return [...groups]
      .map(([name, ps]) => ({
        name,
        count: ps.length,
        high: ps.filter((p) => p.band === "High").length,
        cost: ps.reduce((s, p) => s + (p.revised_cost || 0), 0),
        progress:
          ps
            .filter((p) => p.progress != null)
            .reduce((s, p) => s + p.progress!, 0) /
          (ps.filter((p) => p.progress != null).length || 1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);
  usePortfolioTools(filtered);
  function notify(text: string) {
    setToast(text);
  }
  async function checkConnection() {
    setCheckingApi(true);
    try {
      const health = await requestJson<{ status: string }>("/api/health");
      if (health.status !== "ok") throw Error("The backend is not ready.");
      const saved = await requestJson<Review[]>("/api/reviews");
      if (!Array.isArray(saved))
        throw Error("The backend returned an invalid review list.");
      setReviews((current) => [
        ...saved,
        ...current.filter((r) => r.storage === "session"),
      ]);
      setApi(true);
      setApiError("");
    } catch {
      setApiError(
        "The local API is unavailable. Saved reviews cannot be refreshed.",
      );
    } finally {
      setCheckingApi(false);
    }
  }
  function exportCsv() {
    const content = portfolioCsv(filtered);
    const u = URL.createObjectURL(
      new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = u;
    a.download = `paimana-${month}-review-priority.csv`;
    a.click();
    URL.revokeObjectURL(u);
    notify(
      `Exported ${fmt(filtered.length)} projects. Scores are review priorities, not probabilities.`,
    );
  }
  async function addReview(p: Project, owner: string, due: string) {
    const record = {
      project_id: p.id,
      project_name: p.name,
      owner,
      due,
      status: "Open",
    };
    if (api) {
      let saved: Review;
      try {
        saved = await requestJson<Review>("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 0 || error.status >= 500)
        )
          setApiError(error.message);
        throw error;
      }
      setReviews((r) => [saved, ...r]);
    } else {
      if (
        reviews.some(
          (r) =>
            r.project_id === p.id && r.owner === owner && r.status === "Open",
        )
      )
        throw Error("An open review for this project and owner already exists");
      setReviews((r) => [
        {
          ...record,
          storage: "session",
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        },
        ...r,
      ]);
    }
    notify(
      api
        ? "Review saved to the local database."
        : "Review added to this demo session.",
    );
  }
  async function closeReview(r: Review) {
    setResolving(r.id);
    try {
      if (r.storage !== "session") {
        await requestJson<Review>(`/api/reviews/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Resolved" }),
        });
      }
      setReviews((all) =>
        all.map((x) => (x.id === r.id ? { ...x, status: "Resolved" } : x)),
      );
      notify("Review marked resolved.");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Could not update review.",
      );
      if (
        error instanceof ApiError &&
        (error.status === 0 || error.status >= 500)
      )
        setApiError(error.message);
    } finally {
      setResolving(null);
    }
  }
  function ask(q: string) {
    setQuestion(q);
    let result = "";
    const query = q.toLowerCase();
    const matched = filtered.find((p) => query.includes(p.id));
    if (matched) {
      result = `${matched.name} [${matched.id}], ${date(month)}: ${matched.band} review priority${matched.eligible ? ` (${matched.score}/100)` : ""}. ${matched.factors.map((f) => f.detail + ".").join(" ")} Source: ${matched.source_file}, PDF page ${matched.source_page}. These are rule-based signals, not a prediction of actual completion.`;
    } else if (/why|explain/.test(query) && selected) {
      result = `${selected.name} [${selected.id}]: ${selected.factors.map((f) => f.label + ": " + f.detail + ".").join(" ")} Source: ${selected.source_file}, PDF page ${selected.source_page}.`;
    } else if (/high|risk|priority|warning/.test(query)) {
      result = `${totals.high} projects have high review priority in your filtered ${date(month)} portfolio. Top projects: ${filtered
        .filter((p) => p.band === "High")
        .slice(0, 3)
        .map(
          (p) =>
            `${p.name} [${p.id}] — ${p.score}/100 (PDF p.${p.source_page})`,
        )
        .join(
          "; ",
        )}. This is an observed-signal triage index, not a calibrated delay probability.`;
    } else if (/cost|expend|budget/.test(query)) {
      result = `The filtered ${date(month)} portfolio has revised cost ${money(totals.cost)} and cumulative expenditure ${money(totals.expenditure)}. ${totals.overrun} projects report revised costs above original costs. Source: Table 6 of the selected monthly report.`;
    } else if (/data|source|month/.test(query)) {
      result = `The application uses ${data?.audit.sources.length} PAIMANA flash reports and ${fmt(data?.audit.total_snapshots)} extracted project-month records. All numbers link to Table 6. Missing fields remain missing. This is a deterministic query assistant; no LLM or Gemini connection is active.`;
    } else
      result =
        "I can answer questions about high-priority projects, costs, sources, or a project code in the filtered portfolio. Try “Which projects are high risk?” or “Explain 701263”. I cannot infer unreported causes, predict policy outcomes, or answer unrelated questions.";
    setAnswer(result);
  }
  if (error)
    return (
      <div className="load">
        <TriangleAlert />
        <h1>Data could not be loaded</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    );
  if (!data || !month)
    return (
      <div className="load">
        <Activity className="pulse" />
        <p>Reading PAIMANA project records…</p>
      </div>
    );
  const maxProgressBand = Math.max(
    1,
    ...[
      [0, 25],
      [25, 50],
      [50, 75],
      [75, 101],
    ].map(
      ([lo, hi]) =>
        filtered.filter(
          (p) => p.progress != null && p.progress >= lo && p.progress < hi,
        ).length,
    ),
  );
  const shown =
    view === "Early warnings"
      ? filtered.filter((p) => p.band === "High" || p.band === "Moderate")
      : filtered;
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={() => setView("Overview")}>
          <span className="brandmark">
            <Layers3 size={24} />
          </span>
          <span>
            PAIMANA<small>INTELLIGENCE PLATFORM</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">IN</span>
          <div>
            National portfolio<small>Central sector infrastructure</small>
          </div>
        </div>
        <div className="navlabel">WORKSPACE</div>
        <nav>
          {views.map(([label, Icon]) => (
            <button
              key={label}
              className={view === label ? "active" : ""}
              onClick={() => {
                setView(label);
                setShowReviews(false);
                setPage(0);
              }}
            >
              <Icon size={17} />
              {label}
              {label === "Early warnings" && (
                <span className="navcount">{totals.high}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="assistant-nav" onClick={() => setChat(true)}>
            <Sparkles size={17} /> Ask PAIMANA <ArrowUpRight size={15} />
          </button>
          <div className="system">
            <span className="status-dot" />{" "}
            {apiError
              ? "Local API unavailable"
              : api
                ? "Local API connected"
                : "Report snapshot mode"}
            <small>SIH 2026 · Problem 26103</small>
          </div>
          <div className="profile">
            <span>PM</span>
            <div>
              Project monitoring<small>Research prototype</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={13} /> <b>{view}</b>
          </div>
          <div>
            <span className="real-tag">
              <span className="status-dot" /> SOURCE-BACKED DATA
            </span>
            <button
              className="icon-button"
              aria-label="Open review queue"
              onClick={() => {
                setView("Early warnings");
                setShowReviews(true);
              }}
            >
              <Bell size={18} />
              <i>{reviews.filter((r) => r.status === "Open").length}</i>
            </button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                NATIONAL INFRASTRUCTURE / {month.replace("-", ".")}
              </div>
              <h1>
                {view === "Overview" ? "See the signals. Act earlier." : view}
              </h1>
              <p>
                {view === "Overview"
                  ? "A clearer view of project performance, emerging risks and where to focus next."
                  : view === "Model evidence"
                    ? "Measured experiments, transparent assumptions and the limits of the evidence."
                    : view === "Data & sources"
                      ? "Every project has a source. Every missing field stays visible."
                      : "Explore the evidence behind India’s infrastructure portfolio."}
              </p>
            </div>
            <div className="heading-actions">
              <select
                aria-label="Report month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {data.audit.sources.map((s) => (
                  <option value={s.month} key={s.month}>
                    {date(s.month)}
                  </option>
                ))}
              </select>
              <button className="primary" onClick={exportCsv}>
                <ArrowDownToLine size={16} /> Export report
              </button>
            </div>
          </div>
          <div className="notice">
            <ShieldCheck size={15} />
            <span>
              Real PAIMANA reports · Review scores are transparent rules, not
              delay probabilities.
            </span>
            <button onClick={() => setView("Model evidence")}>
              View methodology <ArrowRight size={14} />
            </button>
          </div>
          {apiError && (
            <div className="notice" role="status">
              <TriangleAlert size={15} />
              <span>
                {apiError}{" "}
                {!api && "New reviews are session-only until reconnected."}
              </span>
              <button
                onClick={() => void checkConnection()}
                disabled={checkingApi}
              >
                {checkingApi ? "Connecting…" : "Reconnect API"}
              </button>
            </div>
          )}
          {!["Data & sources", "Model evidence"].includes(view) && (
            <div className="filters">
              <div className="search">
                <Search size={16} />
                <input
                  aria-label="Search projects"
                  placeholder="Search projects, agencies or codes…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <select
                aria-label="Filter ministry"
                value={ministry}
                onChange={(e) => setMinistry(e.target.value)}
              >
                <option>All ministries</option>
                {[...new Set(projects.map((p) => p.ministry))]
                  .sort()
                  .map((s) => (
                    <option key={s} value={s}>
                      {shortMinistry(s)}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Filter state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                <option>All states</option>
                {[...new Set(projects.map((p) => p.state))].sort().map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Filter priority"
                value={band}
                onChange={(e) => setBand(e.target.value)}
              >
                <option>All priorities</option>
                {["High", "Moderate", "Low", "Insufficient data"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button
                className="reset"
                onClick={() => {
                  setSearch("");
                  setMinistry("All ministries");
                  setState("All states");
                  setBand("All priorities");
                }}
              >
                <SlidersHorizontal size={15} /> Reset
              </button>
            </div>
          )}
          {view === "Overview" && (
            <>
              <section className="kpis">
                <Kpi
                  label="MONITORED PROJECTS"
                  value={fmt(filtered.length)}
                  icon={<Layers3 size={18} />}
                  detail={`${new Set(filtered.map((p) => p.ministry)).size} ministries in selection`}
                />
                <Kpi
                  label="REVISED PORTFOLIO COST"
                  value={money(totals.cost)}
                  icon={<BarChart3 size={18} />}
                  detail={`${money(totals.expenditure)} spent to date`}
                />
                <Kpi
                  label="HIGH REVIEW PRIORITY"
                  value={fmt(totals.high)}
                  icon={<TriangleAlert size={18} />}
                  detail={`${filtered.length ? ((totals.high / filtered.length) * 100).toFixed(1) : "0"}% of selected projects`}
                  warn
                />
                <Kpi
                  label="REPORTED COST ESCALATION"
                  value={fmt(totals.overrun)}
                  icon={<Activity size={18} />}
                  detail="Projects above original cost"
                />
              </section>
              <section className="overview-grid">
                <div className="panel performance">
                  <PanelHead
                    title="Portfolio pulse"
                    sub="Projects by reported physical progress"
                    label="CURRENT SNAPSHOT"
                  />
                  <div className="stage-stats">
                    {[
                      ["0–25%", 0, 25],
                      ["25–50%", 25, 50],
                      ["50–75%", 50, 75],
                      ["75–100%", 75, 101],
                    ].map(([label, low, high]) => {
                      const count = filtered.filter(
                        (p) =>
                          p.progress != null &&
                          p.progress >= Number(low) &&
                          p.progress < Number(high),
                      ).length;
                      return (
                        <div key={label}>
                          <span>{label}</span>
                          <strong>{fmt(count)}</strong>
                          <div className="vertical-track">
                            <div
                              style={{
                                height: `${(count / maxProgressBand) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="chart-foot">
                    <span>
                      <i className="legend-dot" /> Physical progress bands
                    </span>
                    <span>
                      {fmt(filtered.filter((p) => p.progress == null).length)}{" "}
                      unreported · upper bounds exclusive except 100%
                    </span>
                  </div>
                </div>
                <div className="panel signal-card">
                  <div className="signal-title">
                    <span className="signal-icon">
                      <Activity size={20} />
                    </span>{" "}
                    ATTENTION RADAR
                    <span className="live-dot" />
                  </div>
                  <h2>
                    {totals.high > 0 ? (
                      <>
                        Focus where
                        <br />
                        the signals converge.
                      </>
                    ) : (
                      <>
                        Your portfolio,
                        <br />
                        in perspective.
                      </>
                    )}
                  </h2>
                  <p>
                    {fmt(totals.high)} projects combine enough reported signals
                    to warrant a closer review.
                  </p>
                  <div className="signal-stat">
                    <span>Cost revisions</span>
                    <b>{fmt(totals.overrun)} projects</b>
                  </div>
                  <div className="signal-stat">
                    <span>Completion date extensions</span>
                    <b>
                      {fmt(
                        filtered.filter((p) => (p.slippage || 0) > 0).length,
                      )}{" "}
                      projects
                    </b>
                  </div>
                  <button
                    onClick={() => {
                      setView("Early warnings");
                      setBand("High");
                    }}
                  >
                    Open early warnings <ArrowRight size={17} />
                  </button>
                </div>
              </section>
              <section className="panel">
                <PanelHead
                  title="Projects to look at first"
                  sub="Ranked by rule-based review priority"
                  action={
                    <button onClick={() => setView("Project explorer")}>
                      View all projects <ArrowUpRight size={15} />
                    </button>
                  }
                />
                <ProjectTable
                  projects={filtered.slice(0, 5)}
                  select={setSelected}
                />
              </section>
              <div className="overview-bottom">
                <div className="panel">
                  <PanelHead
                    title="Ministry watch"
                    sub="Share of projects with high review priority"
                  />
                  {sectors.slice(0, 5).map((s) => (
                    <button
                      className="sector-row"
                      key={s.name}
                      onClick={() => {
                        setMinistry(
                          projects.find(
                            (p) => shortMinistry(p.ministry) === s.name,
                          )!.ministry,
                        );
                        setView("Sector benchmarks");
                      }}
                    >
                      <span>{s.name}</span>
                      <div className="bar-track">
                        <i style={{ width: `${(s.high / s.count) * 100}%` }} />
                      </div>
                      <b>
                        {s.high}/{s.count}
                      </b>
                    </button>
                  ))}
                </div>
                <div className="panel source-summary">
                  <div className="eyebrow">THE EVIDENCE BEHIND THE VIEW</div>
                  <Database size={26} />
                  <h3>
                    {data.audit.sources.length} months. One connected record.
                  </h3>
                  <p>
                    Project codes link monthly reports. Original values, missing
                    fields and PDF page references travel with every record.
                  </p>
                  <button onClick={() => setView("Data & sources")}>
                    Explore data lineage <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
          {(view === "Project explorer" || view === "Early warnings") && (
            <section className="panel">
              <PanelHead
                title={
                  showReviews
                    ? "Intervention queue"
                    : view === "Early warnings"
                      ? "Prioritise the next review"
                      : "Project register"
                }
                sub={
                  showReviews
                    ? api
                      ? "Saved in the local database"
                      : "Session only · resets when this page reloads"
                    : `${fmt(shown.length)} projects · ${date(month)} · scores are not probabilities`
                }
                action={
                  <div className="inline">
                    {showReviews && api && (
                      <button
                        onClick={() => void checkConnection()}
                        disabled={checkingApi}
                      >
                        {checkingApi ? "Refreshing…" : "Refresh saved reviews"}
                      </button>
                    )}
                    {view === "Early warnings" && (
                      <button onClick={() => setShowReviews(!showReviews)}>
                        {showReviews
                          ? "Show warnings"
                          : `Review queue (${reviews.length})`}
                      </button>
                    )}
                    <select
                      aria-label="Sort projects"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="priority">Highest priority</option>
                      <option value="cost">Largest revised cost</option>
                      <option value="name">Project name</option>
                    </select>
                  </div>
                }
              />
              {showReviews ? (
                <div className="reviews">
                  {reviews.length === 0 ? (
                    <Empty text="No reviews yet. Open a project and assign a review." />
                  ) : (
                    reviews.map((r) => (
                      <div className="review-row" key={r.id}>
                        <div>
                          <b>{r.project_name}</b>
                          <small>
                            {r.owner} · Due {r.due} · {r.project_id}
                            {r.storage === "session" && " · Session only"}
                          </small>
                        </div>
                        <span className="badge low">{r.status}</span>
                        {r.status !== "Resolved" && (
                          <button
                            disabled={resolving === r.id}
                            onClick={() => closeReview(r)}
                          >
                            <Check size={15} /> Resolve
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <ProjectTable
                    projects={shown.slice(page * 12, page * 12 + 12)}
                    select={setSelected}
                  />
                  <div className="pagination">
                    <span>
                      {shown.length
                        ? `${page * 12 + 1}–${Math.min(shown.length, page * 12 + 12)}`
                        : "0"}{" "}
                      of {fmt(shown.length)} projects
                    </span>
                    <div>
                      <button
                        aria-label="Previous page"
                        disabled={page === 0}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span>Page {page + 1}</span>
                      <button
                        aria-label="Next page"
                        disabled={(page + 1) * 12 >= shown.length}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
          {view === "Sector benchmarks" && (
            <section className="panel">
              <PanelHead
                title="Compare ministry portfolios"
                sub="Descriptive comparisons · portfolios differ in project size, age and sector mix"
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Ministry</th>
                      <th>Projects</th>
                      <th>Revised cost</th>
                      <th>Mean progress</th>
                      <th>High priority share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectors.map((s) => (
                      <tr key={s.name}>
                        <td>
                          <b>{s.name}</b>
                        </td>
                        <td>{fmt(s.count)}</td>
                        <td>{money(s.cost)}</td>
                        <td>{s.progress.toFixed(1)}%</td>
                        <td>
                          <div className="inline">
                            <div className="bar-track">
                              <i
                                style={{
                                  width: `${(s.high / s.count) * 100}%`,
                                }}
                              />
                            </div>
                            {((s.high / s.count) * 100).toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!sectors.length && (
                <Empty text="No projects match these filters." />
              )}
              <p className="footnote">
                These are ministry groupings. The project detail retains the
                finer infrastructure sector. Differences do not establish
                relative agency performance.
              </p>
            </section>
          )}
          {view === "Geographic view" && (
            <div className="map-grid">
              <section className="panel">
                <PanelHead
                  title="Infrastructure across India"
                  sub="Regional context · project coordinates are not present in these reports"
                />
                <iframe
                  title="OpenStreetMap geographic context for India"
                  className="map"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=67%2C6%2C98%2C37&layer=mapnik"
                  loading="lazy"
                />
                <p className="footnote">
                  Map requires internet. No exact project locations or state
                  centroids are inferred.{" "}
                  <a
                    href="https://www.openstreetmap.org"
                    target="_blank"
                    rel="noreferrer"
                  >
                    © OpenStreetMap contributors
                  </a>
                </p>
              </section>
              <section className="panel">
                <PanelHead
                  title="Reported locations"
                  sub={`${fmt(filtered.length)} projects in selection`}
                />
                <div className="location-list">
                  {[...new Set(filtered.map((p) => p.state))]
                    .sort()
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setState(s);
                          setView("Project explorer");
                        }}
                      >
                        <MapPin size={15} />
                        <span>{s}</span>
                        <b>{filtered.filter((p) => p.state === s).length}</b>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                </div>
              </section>
            </div>
          )}
          {view === "Data & sources" && (
            <>
              <section className="kpis">
                <Kpi
                  label="REPORTS INGESTED"
                  value={String(data.audit.sources.length)}
                  detail="April–July 2026"
                  icon={<FileText />}
                />
                <Kpi
                  label="MONTHLY SNAPSHOTS"
                  value={fmt(data.audit.total_snapshots)}
                  detail="Table 6 only · no double counting"
                  icon={<Database />}
                />
                <Kpi
                  label="UNIQUE PROJECT CODES"
                  value={fmt(data.audit.unique_projects)}
                  detail="Matched by stable identifiers"
                  icon={<Layers3 />}
                />
                <Kpi
                  label="DUPLICATE KEYS"
                  value={String(data.audit.duplicate_keys.length)}
                  detail={`${data.audit.rejected_rows.length} rejected rows`}
                  icon={<ShieldCheck />}
                />
              </section>
              <section className="panel">
                <PanelHead
                  title="Source register"
                  sub="Original PDFs preserved · page references use the PDF page number"
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Project records</th>
                        <th>PDF pages</th>
                        <th>Provenance</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audit.sources.map((s) => (
                        <tr key={s.month}>
                          <td>
                            <FileText size={16} /> {date(s.month)}
                          </td>
                          <td>{fmt(s.extracted_records)}</td>
                          <td>{s.pages}</td>
                          <td>
                            <span title={s.sha256}>
                              SHA256 {s.sha256.slice(0, 12)}…
                            </span>
                          </td>
                          <td>
                            <a
                              href={`/reports/${s.file}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open PDF <ExternalLink size={14} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="overview-bottom">
                <section className="panel prose">
                  <h3>Data quality is part of the answer</h3>
                  {Object.entries(data.audit.quality_flags).map(([k, v]) => (
                    <div className="signal-stat" key={k}>
                      <span>{k}</span>
                      <b>{fmt(v)}</b>
                    </div>
                  ))}
                  <p>
                    Counts refer to project-month records. Zero expenditure and
                    progress are retained as reported; anomalies require agency
                    confirmation.
                  </p>
                </section>
                <section className="panel prose">
                  <h3>What these reports cannot tell us</h3>
                  <p>
                    Four months do not provide two decades of training history.
                    Actual completion outcomes, final costs, critical-path
                    milestones, reason codes and exact coordinates need further
                    verified data.
                  </p>
                  <p>
                    A missing project in a later report is not automatically
                    treated as completed. Reporting month is different from
                    publication or receipt date.
                  </p>
                  <a href="/EXECUTION_PLAN.md" target="_blank" rel="noreferrer">
                    Read the execution plan <ArrowUpRight size={14} />
                  </a>
                </section>
              </div>
            </>
          )}
          {view === "Model evidence" && (
            <>
              <section className="panel prose">
                <div className="eyebrow">PRIORITY ENGINE · RULES V1</div>
                <h2>A review index with visible arithmetic.</h2>
                <p>
                  The 0–100 review index adds four observed signals:
                  completion-date extension (up to 30), lag against an assumed
                  linear schedule (up to 35), revised-cost escalation (up to
                  25), and no reported progress in the previous consecutive
                  month (10). High ≥55; moderate ≥30; otherwise low. Critical
                  missing inputs suppress the displayed index.
                </p>
                <p>
                  The linear schedule is an approximation, not a reported
                  milestone plan. These factor contributions are rule points,
                  not SHAP values or causes of delay.
                </p>
              </section>
              <section className="panel prose">
                <div className="eyebrow">
                  RETROSPECTIVE EXPERIMENT · NOT PRODUCTION VALIDATION
                </div>
                <h2>Does machine learning add value?</h2>
                <p>
                  We test whether the next monthly report records a later
                  completion target or higher revised cost. These reporting
                  proxies differ from actual completion delay and final cost
                  overrun. Models use earlier snapshot fields only. Publication
                  lag is not simulated. The cost model has only three positive
                  training examples; its probabilities are not reliable for
                  decisions.
                </p>
                {evidence ? (
                  <>
                    <p>
                      <b>Training:</b> {evidence.train} ·{" "}
                      <b>Untouched comparison:</b> {evidence.test}
                    </p>
                    {Object.entries(evidence.targets).map(([target, t]) => (
                      <div key={target}>
                        <h3>
                          {target === "schedule"
                            ? "Next-report schedule revision"
                            : "Next-report cost increase"}
                        </h3>
                        <p>
                          {fmt(t.train_n)} training pairs ({t.train_positive}{" "}
                          positives) · {fmt(t.test_n)} holdout pairs (
                          {t.test_positive} positives)
                        </p>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Method</th>
                                <th>Average precision ↑</th>
                                <th>ROC-AUC ↑</th>
                                <th>Brier ↓</th>
                                <th>Recall @ 0.5</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(t.metrics).map(([name, m]) => (
                                <tr key={name}>
                                  <td>{name}</td>
                                  <td>{m.ap?.toFixed(3) ?? "N/A"}</td>
                                  <td>{m.auc?.toFixed(3) ?? "N/A"}</td>
                                  <td>{m.brier?.toFixed(3) ?? "N/A"}</td>
                                  <td>{m.recall?.toFixed(3) ?? "N/A"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {t.ablation && (
                          <details>
                            <summary>CUF feature-group ablation</summary>
                            <p>
                              Same split and candidate; each experiment removes
                              one available field group. Extra non-CUF variables
                              have not been collected.
                            </p>
                            <table>
                              <thead>
                                <tr>
                                  <th>Feature group removed</th>
                                  <th>AP ↑</th>
                                  <th>Brier ↓</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(t.ablation).map(([g, m]) => (
                                  <tr key={g}>
                                    <td>{g}</td>
                                    <td>{m.ap?.toFixed(3) ?? "N/A"}</td>
                                    <td>{m.brier?.toFixed(3) ?? "N/A"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="notice">
                    Model artifacts are not loaded. No accuracy or probability
                    is claimed. Run the documented experiment to generate
                    evidence.
                  </p>
                )}
                <p>
                  Scores are experimental and uncalibrated. The preselected
                  XGBoost candidate is not chosen by its holdout result. A
                  baseline can outperform it. Longer history, publication-time
                  splits, actual outcome labels and subgroup confidence
                  intervals are required before operational use.
                </p>
              </section>
            </>
          )}
          <footer>
            <span>
              PAIMANA INTELLIGENCE <i /> SIH 26103
            </span>
            <span>
              As reported {date(month)} · INR crore · Not an official government
              service
            </span>
          </footer>
        </div>
      </main>
      {selected && (
        <ProjectDetail
          key={selected.id + selected.month}
          p={selected}
          close={() => setSelected(null)}
          addReview={addReview}
          api={api}
          prediction={
            selected.month === evidence?.prediction_month
              ? evidence?.predictions?.[selected.id]
              : undefined
          }
        />
      )}
      {chat && (
        <div
          className="chat-panel"
          role="dialog"
          aria-label="PAIMANA query assistant"
        >
          <div className="drawer-header">
            <span>
              <Sparkles size={18} /> Ask PAIMANA
            </span>
            <button aria-label="Close assistant" onClick={() => setChat(false)}>
              <X size={19} />
            </button>
          </div>
          <div className="chat-body">
            <span className="badge low">SOURCE-LINKED QUERY ASSISTANT</span>
            <h2>Start with a question.</h2>
            <p>
              Answers use your filtered {date(month)} portfolio. Deterministic
              queries; no external LLM is connected.
            </p>
            {[
              "Which projects are high risk?",
              "What is the portfolio cost?",
              "What data are you using?",
            ].map((q) => (
              <button className="prompt" key={q} onClick={() => ask(q)}>
                {q}
                <ArrowUpRight size={14} />
              </button>
            ))}
            {answer && (
              <div className="answer" aria-live="polite">
                {answer}
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) ask(question);
            }}
          >
            <input
              aria-label="Ask a project question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a project or portfolio…"
            />
            <button aria-label="Send question" className="primary">
              <Send size={17} />
            </button>
          </form>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Kpi({
  label,
  value,
  detail,
  icon,
  warn = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className={"kpi" + (warn ? " warn" : "")}>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>
        {warn && <span className="warning-dot" />}
        {detail}
      </small>
    </div>
  );
}
function PanelHead({
  title,
  sub,
  label,
  action,
}: {
  title: string;
  sub: string;
  label?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
      {label && <span className="tiny-label">{label}</span>}
      {action}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Search size={22} />
      <p>{text}</p>
    </div>
  );
}
function ProjectTable({
  projects,
  select,
}: {
  projects: Project[];
  select: (p: Project) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="project-table">
        <thead>
          <tr>
            <th>Project / implementing agency</th>
            <th>Location</th>
            <th>Revised cost</th>
            <th>Physical progress</th>
            <th>Review priority</th>
            <th>
              <span className="sr-only">Details</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <button className="project-name" onClick={() => select(p)}>
                  {p.name}
                </button>
                <small>
                  {p.id} <i /> {p.agency || shortMinistry(p.ministry)}
                </small>
              </td>
              <td>
                {p.state.startsWith("Multi-States") ? "Multi-state" : p.state}
                <small>{shortMinistry(p.ministry)}</small>
              </td>
              <td className="nowrap">{money(p.revised_cost)}</td>
              <td>
                <div className="progress-cell">
                  <div className="bar-track">
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, p.progress || 0))}%`,
                      }}
                    />
                  </div>
                  <span>{fmt(p.progress, 1)}%</span>
                </div>
              </td>
              <td>
                <span
                  className={
                    "badge " + p.band.toLowerCase().replaceAll(" ", "-")
                  }
                >
                  <span />
                  {p.band}
                </span>
                {p.eligible && <small className="score">{p.score} / 100</small>}
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Open project ${p.id}`}
                  onClick={() => select(p)}
                >
                  <ArrowUpRight size={17} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!projects.length && (
        <Empty text="No projects match these filters. Clear a filter to broaden the portfolio." />
      )}
    </div>
  );
}
function ProjectDetail({
  p,
  close,
  addReview,
  api,
  prediction,
}: {
  p: Project;
  close: () => void;
  addReview: (p: Project, owner: string, due: string) => Promise<void>;
  api: boolean;
  prediction?: Record<
    string,
    {
      probability: number;
      base: number;
      contributions: {
        feature: string;
        value: number | null;
        contribution: number;
      }[];
    }
  >;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [owner, setOwner] = useState(""),
    [due, setDue] = useState(
      new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA"),
    ),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      className="detail-dialog"
      ref={dialog}
      onCancel={close}
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="drawer-header">
        <span>
          <Layers3 size={17} /> PROJECT INTELLIGENCE <b>#{p.id}</b>
        </span>
        <button aria-label="Close project details" onClick={close}>
          <X size={20} />
        </button>
      </div>
      <div className="detail-body">
        <div className="eyebrow">
          {shortMinistry(p.ministry)} / {date(p.month)}
        </div>
        <h2>{p.name}</h2>
        <div className="detail-meta">
          <MapPin size={14} />
          {p.state} <span>·</span> {p.agency}
        </div>
        <div className="detail-score">
          <div>
            <span>REVIEW PRIORITY</span>
            <strong>
              {p.eligible ? p.score : "—"}
              <small>/ 100</small>
            </strong>
            <span
              className={"badge " + p.band.toLowerCase().replaceAll(" ", "-")}
            >
              {p.band}
            </span>
          </div>
          <p>
            Observed warning signals, weighted for review. This index is not the
            probability of a future delay.
          </p>
        </div>
        <div className="detail-metrics">
          <div>
            <small>Original cost</small>
            <b>{money(p.original_cost)}</b>
          </div>
          <div>
            <small>Revised cost</small>
            <b>{money(p.revised_cost)}</b>
          </div>
          <div>
            <small>Expenditure</small>
            <b>{money(p.expenditure)}</b>
          </div>
          <div>
            <small>Physical progress</small>
            <b>{fmt(p.progress, 1)}%</b>
          </div>
        </div>
        <h3>Why this project needs attention</h3>
        {p.factors.length ? (
          p.factors.map((f) => (
            <div className="factor" key={f.label}>
              <div>
                <b>{f.label}</b>
                <span>+{f.points} pts</span>
              </div>
              <div className="factor-bar">
                <i style={{ width: `${(f.points / 35) * 100}%` }} />
              </div>
              <small>{f.detail}</small>
              <p>{f.action}</p>
            </div>
          ))
        ) : (
          <p>No positive rule contributions in the available inputs.</p>
        )}
        <h3>Monthly physical progress</h3>
        <div className="history-chart">
          <Suspense
            fallback={<p className="footnote">Loading progress chart…</p>}
          >
            <ProgressHistory history={p.history} />
          </Suspense>
        </div>
        <h3>Schedule & cost history</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Original target</th>
                <th>Revised target</th>
                <th>Revised cost</th>
              </tr>
            </thead>
            <tbody>
              {p.history.map((h) => (
                <tr key={h.month}>
                  <td>{date(h.month)}</td>
                  <td>{date(h.original_end)}</td>
                  <td>{date(h.revised_end)}</td>
                  <td>{money(h.revised_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {prediction && (
          <>
            <h3>Experimental next-report predictions</h3>
            <p className="footnote">
              Uncalibrated outputs for reporting revisions, not actual
              completion outcomes. The cost model has only 3 positive training
              examples. SHAP contributions are in log-odds.
            </p>
            {Object.entries(prediction).map(([target, v]) => (
              <details key={target}>
                <summary>
                  {target === "schedule"
                    ? "Later completion target"
                    : "Higher revised cost"}
                  : {(v.probability * 100).toFixed(1)}% · experimental
                </summary>
                <p>
                  Baseline {v.base.toFixed(3)} log-odds; all contributions sum
                  with the baseline to the model margin.
                </p>
                {v.contributions.map((c) => (
                  <div className="signal-stat" key={c.feature}>
                    <span>
                      {c.feature} (
                      {c.value == null ? "missing" : c.value.toFixed(2)})
                    </span>
                    <b>
                      {c.contribution > 0 ? "+" : ""}
                      {c.contribution.toFixed(3)}
                    </b>
                  </div>
                ))}
              </details>
            ))}
          </>
        )}
        {p.quality_flags.length > 0 && (
          <div className="quality-note">
            <TriangleAlert size={17} />
            <div>
              <b>Verify reported data</b>
              <p>{p.quality_flags.join(" · ")}</p>
            </div>
          </div>
        )}
        <div className="source-link">
          <FileText size={19} />
          <div>
            <b>Inspect the source record</b>
            <small>
              {p.source_file} · PDF page {p.source_page}
            </small>
          </div>
          <a
            href={`/reports/${p.source_file}#page=${p.source_page}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Open source PDF"
          >
            <ExternalLink size={18} />
          </a>
        </div>
        <h3>Turn the signal into a review</h3>
        <p className="footnote">
          {api
            ? "Saved locally through FastAPI."
            : "Demo session only. Connect the local API for persistent reviews."}{" "}
          No message is sent to the agency.
        </p>
        <form
          className="review-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const formElement = e.currentTarget;
            const form = new FormData(formElement);
            const formOwner = String(form.get("owner") || "").trim();
            const formDue = String(form.get("due") || "");
            if (!formOwner || !formDue) {
              setMessage("Enter a review owner and due date.");
              return;
            }
            setSaving(true);
            try {
              await addReview(p, formOwner, formDue);
              formElement.reset();
              setMessage(
                "Review created. Find it in Early warnings → Review queue.",
              );
              setOwner("");
              setDue(
                new Date(Date.now() + 7 * 86400000).toLocaleDateString("en-CA"),
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Review could not be saved. Try again.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Review owner
            <input
              name="owner"
              required
              maxLength={120}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Officer or team name"
            />
          </label>
          <label>
            Due date
            <input
              name="due"
              required
              type="date"
              min={new Date().toLocaleDateString("en-CA")}
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
          <button className="primary" disabled={saving}>
            {saving ? "Saving…" : "Create review"}
            <ArrowRight size={15} />
          </button>
        </form>
        {message && <p role="status">{message}</p>}
      </div>
    </dialog>
  );
}
