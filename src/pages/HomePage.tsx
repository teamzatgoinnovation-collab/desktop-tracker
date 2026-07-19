"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrackerApi, ZatGoApi } from "@zatgo/erpnext";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
} from "@zatgo/ui";
import { ClipboardList, LayoutDashboard } from "@zatgo/icons";
import { callZatGoApi } from "@/lib/call-zatgo-api";

type TaskRow = { name?: string; status?: string; project?: string };
type ProjectRow = { name?: string; status?: string };
type RunningRow = {
  name?: string;
  user?: string;
  task?: string;
  project?: string;
  elapsed_seconds?: number;
  status?: string;
};

function formatElapsed(sec?: number) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubOk, setHubOk] = useState(false);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [tasksOpen, setTasksOpen] = useState(0);
  const [tasksDone, setTasksDone] = useState(0);
  const [runningRows, setRunningRows] = useState<RunningRow[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await callZatGoApi(ZatGoApi.health.ping);
      setHubOk(true);
      const [projects, tasks, runningEnv] = await Promise.all([
        callZatGoApi<ProjectRow[]>(TrackerApi.projectsList, { page: 1, page_size: 200 }),
        callZatGoApi<TaskRow[]>(TrackerApi.tasksList, { mine: 1, page: 1, page_size: 200 }),
        callZatGoApi<RunningRow[]>(TrackerApi.activityRunningNow),
      ]);
      const plist = Array.isArray(projects.data) ? projects.data : [];
      const tlist = Array.isArray(tasks.data) ? tasks.data : [];
      setProjectsTotal(plist.length);
      setTasksOpen(tlist.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length);
      setTasksDone(tlist.filter((t) => t.status === "Completed").length);
      setRunningRows(Array.isArray(runningEnv.data) ? runningEnv.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState title="Dashboard unavailable" description={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracker"
        description={hubOk ? "Connected · hub ok" : "Connected"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects">Open projects</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Projects" value={projectsTotal} icon={LayoutDashboard} />
        <StatCard title="Open tasks (mine)" value={tasksOpen} icon={ClipboardList} />
        <StatCard title="Completed (mine)" value={tasksDone} />
        <StatCard title="Running now" value={runningRows.length} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Who is running</h2>
          <Badge variant="secondary">{runningRows.length} active</Badge>
        </div>
        {runningRows.length === 0 ? (
          <EmptyState title="No active timers" description="Start a timer from a task detail page." />
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-xl)] border border-[var(--color-border)]">
            {runningRows.map((r) => (
              <li key={r.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{r.user}</span>
                  {" · "}
                  {r.task || r.project || r.name}
                </span>
                <span className="tabular-nums text-[var(--color-muted-foreground)]">
                  {formatElapsed(r.elapsed_seconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
