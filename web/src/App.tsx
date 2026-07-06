import { useEffect, useMemo, useState } from "react";

type SessionStatus = "pending" | "running" | "completed" | "failed";

interface SessionRecord {
  id: number;
  issue_number: number;
  issue_title: string;
  repo: string;
  session_id: string;
  status: SessionStatus;
  pr_url: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Metrics {
  active: number;
  completed: number;
  failed: number;
  avgCompletionMinutes: number;
}

const emptyMetrics: Metrics = {
  active: 0,
  completed: 0,
  failed: 0,
  avgCompletionMinutes: 0,
};

function App() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [sessionsResponse, metricsResponse] = await Promise.all([
          fetch("/api/sessions"),
          fetch("/metrics"),
        ]);

        if (!sessionsResponse.ok || !metricsResponse.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const sessionsJson = (await sessionsResponse.json()) as { sessions: SessionRecord[] };
        const metricsJson = (await metricsResponse.json()) as Metrics;

        if (isMounted) {
          setSessions(sessionsJson.sessions);
          setMetrics(metricsJson);
          setError(null);
          setIsLoading(false);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Unknown dashboard error");
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 10_000);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const lastUpdated = useMemo(() => new Date().toLocaleTimeString(), [sessions, metrics]);

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">GitHub issue automation</p>
          <h1>Devin Dashboard</h1>
          <p className="subtitle">Track issues labeled for Devin and the sessions handling them.</p>
        </div>
        <div className="last-updated">Last refreshed {lastUpdated}</div>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="metrics-grid" aria-label="Metrics">
        <MetricCard label="Active" value={metrics.active} tone="active" />
        <MetricCard label="Completed" value={metrics.completed} tone="completed" />
        <MetricCard label="Failed" value={metrics.failed} tone="failed" />
        <MetricCard label="Avg completion" value={`${metrics.avgCompletionMinutes}m`} tone="neutral" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Sessions</h2>
          {isLoading ? <span className="muted">Loading...</span> : <span className="muted">{sessions.length} total</span>}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Issue</th>
                <th>Devin</th>
                <th>Status</th>
                <th>Started</th>
                <th>Completed</th>
                <th>PR</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No Devin sessions yet. Add the configured label to a GitHub issue to start one.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>#{session.issue_number}</strong>
                      <span className="issue-title">{session.issue_title}</span>
                      <span className="muted">{session.repo}</span>
                    </td>
                    <td>
                      <a href={getDevinSessionUrl(session.session_id)} target="_blank" rel="noreferrer">
                        <code>{session.session_id}</code>
                      </a>
                    </td>
                    <td>
                      <StatusPill status={session.status} />
                    </td>
                    <td>{formatDate(session.started_at ?? session.created_at)}</td>
                    <td>{session.completed_at ? formatDate(session.completed_at) : "-"}</td>
                    <td>
                      {session.pr_url ? (
                        <a href={session.pr_url} target="_blank" rel="noreferrer">
                          PR
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <article className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StatusPill({ status }: { status: SessionStatus }) {
  const labels: Record<SessionStatus, string> = {
    pending: "Pending",
    running: "Running",
    completed: "Done",
    failed: "Failed",
  };

  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" />
      {labels[status]}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDevinSessionUrl(sessionId: string): string {
  const appSessionId = sessionId.replace(/^devin-/, "");
  return `https://app.devin.ai/sessions/${encodeURIComponent(appSessionId)}`;
}

export default App;
