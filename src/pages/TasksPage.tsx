"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ZatGoApi } from "@zatgo/erpnext";
import { toast } from "sonner";
import { callZatGoApi } from "@/lib/call-zatgo-api";
import { asRows, TASK_STATUSES, type TaskRow } from "@/lib/pt-types";

export function TasksPage() {
  const [status, setStatus] = useState("Loading…");
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const env = await callZatGoApi<TaskRow[]>(ZatGoApi.projectTracker.tasksList, {
      page: 1,
      page_size: 50,
    });
    setRows(asRows(env.data));
    setTotal(typeof env.meta?.total === "number" ? Number(env.meta.total) : asRows(env.data).length);
    setStatus("Connected");
  }, []);

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

  const onStatusChange = async (name: string, next: string) => {
    setBusy(name);
    try {
      await callZatGoApi(ZatGoApi.projectTracker.updateTaskStatus, { name, status: next });
      toast.success(`Updated ${name} → ${next}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {status}
          {total !== null ? ` · ${total} total` : null}
        </p>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-3 py-2 font-medium">Subject</th>
              <th className="px-3 py-2 font-medium">Project</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[var(--color-muted-foreground)]" colSpan={4}>
                  No tasks returned.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.name} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2">
                    {row.name ? (
                      <Link className="underline underline-offset-2" to={`/tasks/${row.name}`}>
                        {row.subject || row.name}
                      </Link>
                    ) : (
                      row.subject || "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {row.project ? (
                      <Link className="underline underline-offset-2" to={`/projects/${row.project}`}>
                        {row.project}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{row.priority ?? "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 py-1"
                      value={row.status ?? "Open"}
                      disabled={!row.name || busy === row.name}
                      onChange={(e) => {
                        if (row.name) void onStatusChange(row.name, e.target.value);
                      }}
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
