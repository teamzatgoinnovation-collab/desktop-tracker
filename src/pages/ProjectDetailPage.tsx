"use client";

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TrackerApi, ZatGoApi } from "@zatgo/erpnext";
import { callZatGoApi } from "@/lib/call-zatgo-api";
import { asRows, type ProjectRow, type TaskRow } from "@/lib/pt-types";

export function ProjectDetailPage() {
  const { name = "" } = useParams();
  const [status, setStatus] = useState("Loading…");
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [projEnv, tasksEnv] = await Promise.all([
          callZatGoApi<ProjectRow>(TrackerApi.projectsGet, { name }),
          callZatGoApi<TaskRow[]>(TrackerApi.tasksList, {
            page: 1,
            page_size: 50,
            filters: { project: name },
          }),
        ]);
        if (cancelled) return;
        setProject(projEnv.data ?? null);
        setTasks(asRows<TaskRow>(tasksEnv.data));
        setStatus("Connected");
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error ? e.message : "API error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link className="text-sm underline underline-offset-2" to="/projects">
          ← Projects
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">
          {project?.project_name || project?.name || name}
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{status}</p>
      </div>

      {project ? (
        <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          <p>
            <span className="text-[var(--color-muted-foreground)]">Status:</span>{" "}
            {project.status ?? "—"}
          </p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">RAG:</span>{" "}
            {project.rag_status ?? "—"}
          </p>
          <p>
            <span className="text-[var(--color-muted-foreground)]">Company:</span>{" "}
            {project.company ?? "—"}
          </p>
          {project.description ? <p className="pt-2">{project.description}</p> : null}
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-lg font-medium">Tasks</h2>
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
              <tr>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--color-muted-foreground)]" colSpan={3}>
                    No tasks for this project.
                  </td>
                </tr>
              ) : (
                tasks.map((row) => (
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
                    <td className="px-3 py-2">{row.status ?? "—"}</td>
                    <td className="px-3 py-2">{row.priority ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
