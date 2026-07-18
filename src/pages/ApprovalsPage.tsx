"use client";

import { useCallback, useEffect, useState } from "react";
import { ZatGoApi } from "@zatgo/erpnext";
import { Button } from "@zatgo/ui";
import { toast } from "sonner";
import { callZatGoApi } from "@/lib/call-zatgo-api";
import { asApprovalRows, type ApprovalRow } from "@/lib/pt-types";

export function ApprovalsPage() {
  const [status, setStatus] = useState("Loading…");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const env = await callZatGoApi(ZatGoApi.projectTracker.approvalsListMine);
    setRows(asApprovalRows(env.data));
    setStatus(`Connected · ${asApprovalRows(env.data).length} pending`);
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

  const onApprove = async (name: string) => {
    setBusy(name);
    try {
      await callZatGoApi(ZatGoApi.projectTracker.approvalsApprove, { name });
      toast.success(`Approved ${name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (name: string) => {
    setBusy(name);
    try {
      await callZatGoApi(ZatGoApi.projectTracker.approvalsReject, { name });
      toast.success(`Rejected ${name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">{status}</p>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            No approvals waiting for you.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.name}
              className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4"
            >
              <p className="font-medium">{row.entity_name || row.name}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {row.entity_type ?? "—"} · {row.requested_by || row.owner || "—"} ·{" "}
                {row.status ?? "Pending"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!row.name || busy === row.name}
                  onClick={() => row.name && void onApprove(row.name)}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  disabled={!row.name || busy === row.name}
                  onClick={() => row.name && void onReject(row.name)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
