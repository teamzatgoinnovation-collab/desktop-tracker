export const TASK_STATUSES = [
  "Open",
  "Working",
  "Pending Review",
  "Completed",
  "Cancelled",
] as const;

export type ProjectRow = {
  name?: string;
  project_name?: string;
  status?: string;
  rag_status?: string;
  company?: string;
  description?: string;
};

export type TaskRow = {
  name?: string;
  subject?: string;
  status?: string;
  project?: string;
  priority?: string;
  parent_task?: string;
  description?: string;
};

export type ApprovalRow = {
  name?: string;
  entity_type?: string;
  entity_name?: string;
  status?: string;
  requested_by?: string;
  owner?: string;
};

export function asRows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export function asApprovalRows(data: unknown): ApprovalRow[] {
  if (Array.isArray(data)) return data as ApprovalRow[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: ApprovalRow[] }).items;
  }
  return [];
}
