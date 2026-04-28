import type { CheckResult, Handler, TaskLog, TaskType } from "./types";

export interface TableInfo {
  name: string;
  row_count: number;
}

export interface TableColumn {
  name: string;
  data_type: string;
  is_nullable: boolean;
  has_default: boolean;
}

export interface TableRowsResponse {
  primary_key: string | null;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

// 브라우저 → backend 직접 호출. backend의 CORS는 모든 origin 허용이며
// API_KEY는 사내 도구 수준의 단순 헤더 키 — 클라이언트 노출을 받아들인다.
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

async function call<T>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  if (!BACKEND_URL) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL 이 설정되지 않았습니다.");
  }
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) headers.set("content-type", "application/json");
  if (API_KEY) headers.set("x-api-key", API_KEY);
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.error ?? `요청 실패 (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  // handlers
  listHandlers: () => call<Handler[]>("/handlers"),
  createHandler: (name: string) =>
    call<Handler>("/handlers", { method: "POST", json: { name } }),
  updateHandler: (id: number, name: string) =>
    call<Handler>(`/handlers/${id}`, { method: "PATCH", json: { name } }),
  deleteHandler: (id: number) =>
    call<void>(`/handlers/${id}`, { method: "DELETE" }),

  // task logs
  listTaskLogs: (status: "in_progress" | "completed") =>
    call<TaskLog[]>(`/task-logs?status=${status}`),
  checkExisting: (exam_number: string, task_type: TaskType) =>
    call<CheckResult>(
      `/task-logs/check?exam_number=${encodeURIComponent(
        exam_number
      )}&task_type=${task_type}`
    ),
  createTaskLog: (input: {
    exam_number: string;
    task_type: TaskType;
    task_type_other_text?: string | null;
    handler_id: number;
    parent_log_id?: number | null;
  }) => call<TaskLog>("/task-logs", { method: "POST", json: input }),
  stopTaskLog: (id: number) =>
    call<TaskLog>(`/task-logs/${id}/stop`, { method: "PATCH" }),
  pauseTaskLog: (id: number) =>
    call<TaskLog>(`/task-logs/${id}/pause`, { method: "PATCH" }),
  resumeTaskLog: (id: number) =>
    call<TaskLog>(`/task-logs/${id}/resume`, { method: "PATCH" }),

  // tables (workbench)
  listTables: () => call<TableInfo[]>("/tables"),
  getTableRows: (name: string) =>
    call<TableRowsResponse>(`/tables/${encodeURIComponent(name)}/rows`),
  createRow: (name: string, values: Record<string, unknown>) =>
    call<Record<string, unknown>>(
      `/tables/${encodeURIComponent(name)}/rows`,
      { method: "POST", json: { values } }
    ),
  updateRow: (
    name: string,
    pk: string | number,
    values: Record<string, unknown>
  ) =>
    call<Record<string, unknown>>(
      `/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(String(pk))}`,
      { method: "PATCH", json: { values } }
    ),
  deleteRow: (name: string, pk: string | number) =>
    call<void>(
      `/tables/${encodeURIComponent(name)}/rows/${encodeURIComponent(String(pk))}`,
      { method: "DELETE" }
    ),
};
