"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrackerApi } from "@zatgo/erpnext";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
} from "@zatgo/ui";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { callZatGoApi } from "@/lib/call-zatgo-api";
import { asRows, type ProjectRow } from "@/lib/pt-types";

export function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const env = await callZatGoApi<ProjectRow[]>(TrackerApi.projectsList, {
        page: 1,
        page_size: 50,
      });
      setRows(asRows(env.data));
      setTotal(typeof env.meta?.total === "number" ? Number(env.meta.total) : asRows(env.data).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "API error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createProject = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await callZatGoApi(TrackerApi.projectsCreate, { project_name: name.trim() });
      setName("");
      toast.success("Project created");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<ProjectRow, unknown>[]>(
    () => [
      {
        accessorKey: "project_name",
        header: "Name",
        cell: ({ row }) =>
          row.original.name ? (
            <Link
              className="font-medium underline-offset-2 hover:underline"
              to={`/projects/${encodeURIComponent(row.original.name)}`}
            >
              {row.original.project_name || row.original.name}
            </Link>
          ) : (
            row.original.project_name
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <Badge variant="secondary">{(getValue() as string) || "—"}</Badge>
        ),
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ getValue }) => (getValue() as string) || "—",
      },
    ],
    [],
  );

  if (error) {
    return <ErrorState title="Could not load projects" description={error} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description={total !== null ? `${total} total` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[14rem]"
              placeholder="New project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button disabled={busy || !name.trim()} onClick={() => void createProject()}>
              Create
            </Button>
          </div>
        }
      />
      <Input
        className="max-w-xs"
        placeholder="Filter…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <DataTable
        data={rows}
        columns={columns}
        globalFilter={filter}
        loading={loading}
        empty={
          <EmptyState
            title="No projects"
            description="Create a project to get started."
          />
        }
      />
    </div>
  );
}
