"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrackerApi, ZatGoApi } from "@zatgo/erpnext";
import { Button } from "@zatgo/ui";
import { toast } from "sonner";
import { callZatGoApi } from "@/lib/call-zatgo-api";
import { TASK_STATUSES, type TaskRow } from "@/lib/pt-types";

export function TaskDetailPage() {
  const { name = "" } = useParams();
  const [status, setStatus] = useState("Loading…");
  const [task, setTask] = useState<TaskRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const env = await callZatGoApi<TaskRow>(TrackerApi.tasksGet, { name });
    setTask(env.data ?? null);
    setStatus("Connected");
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? e.message : "API error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onStatusChange = async (next: string) => {
    setBusy(true);
    try {
      await callZatGoApi(TrackerApi.updateTaskStatus, { name, status: next });
      toast.success(`Updated ${name} → ${next}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link className="text-sm underline underline-offset-2" to="/tasks">
        ← Tasks
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{task?.subject || task?.name || name}</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{status}</p>
      </div>

      {task ? (
        <div className="max-w-lg space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          <p>
            <span className="text-[var(--color-muted-foreground)]">Project:</span>{" "}
            {task.project ? (
              <Link className="underline underline-offset-2" to={`/projects/${task.project}`}>
                {task.project}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">Priority:</span>{" "}
            {task.priority ?? "—"}
          </p>
          {task.description ? <p>{task.description}</p> : null}
          <label className="block space-y-1.5">
            <span className="font-medium">Status</span>
            <select
              className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-transparent px-3"
              value={task.status ?? "Open"}
              disabled={busy}
              onChange={(e) => void onStatusChange(e.target.value)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      ) : null}
    </div>
  );
}
