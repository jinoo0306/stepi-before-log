"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RefreshCw } from "lucide-react";
import type { TaskLog } from "@/lib/types";
import { TASK_TYPE_LABELS } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/format";

export function CompletedList({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [reworkingId, setReworkingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTaskLogs("completed");
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const rework = async (log: TaskLog) => {
    if (
      !confirm(
        `'${log.exam_number}' / ${TASK_TYPE_LABELS[log.task_type]} 재작업을 시작할까요? (담당자: ${log.handler_name})`
      )
    )
      return;
    setReworkingId(log.id);
    try {
      await api.createTaskLog({
        exam_number: log.exam_number,
        task_type: log.task_type,
        task_type_other_text: log.task_type_other_text,
        handler_id: log.handler_id,
        parent_log_id: log.id,
      });
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "재작업 시작에 실패했습니다.");
    } finally {
      setReworkingId(null);
    }
  };

  return (
    <section>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-900">완료 내역</h2>
          <p className="text-sm text-navy-600">
            종료된 작업 ({logs.length}건). 재작업 시 새로운 세션으로 기록됩니다.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={load}
          disabled={loading}
          aria-label="새로고침"
          title="새로고침"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </header>

      {error && (
        <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {!loading && logs.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-navy-500">완료된 작업이 아직 없습니다.</p>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {logs.map((log) => (
          <li key={log.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-navy-500">수험번호</p>
                <p className="truncate font-mono text-sm font-semibold text-navy-900">
                  {log.exam_number}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="badge">{TASK_TYPE_LABELS[log.task_type]}</span>
                {log.parent_log_id && <span className="badge">재작업</span>}
              </div>
            </div>

            {log.task_type === "other" && log.task_type_other_text && (
              <p className="mt-2 text-sm text-navy-600">
                <span className="text-navy-500">내용 · </span>
                {log.task_type_other_text}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-navy-500">담당자</p>
                <p className="text-navy-900">{log.handler_name}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">소요 시간</p>
                <p className="font-mono tabular-nums text-navy-900">
                  {log.duration_seconds !== null
                    ? formatDuration(log.duration_seconds)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">시작</p>
                <p className="text-navy-900">{formatDateTime(log.started_at)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-500">종료</p>
                <p className="text-navy-900">
                  {log.ended_at ? formatDateTime(log.ended_at) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-navy-100 pt-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => rework(log)}
                disabled={reworkingId === log.id}
              >
                <RotateCcw size={14} />
                {reworkingId === log.id ? "시작 중..." : "재작업"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
