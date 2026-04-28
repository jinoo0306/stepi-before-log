"use client";

import { useEffect, useState } from "react";
import { Square, RefreshCw } from "lucide-react";
import type { TaskLog } from "@/lib/types";
import { TASK_TYPE_LABELS } from "@/lib/types";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { LiveTimer } from "./timer-display";

export function InProgressList({
  refreshKey,
  onChanged,
}: {
  refreshKey: number;
  onChanged: () => void;
}) {
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTaskLogs("in_progress");
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

  const stop = async (id: number) => {
    if (!confirm("이 작업의 타이머를 종료할까요?")) return;
    setStoppingId(id);
    try {
      await api.stopTaskLog(id);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "종료에 실패했습니다.");
    } finally {
      setStoppingId(null);
    }
  };

  return (
    <section>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">진행중</h2>
          <p className="text-sm text-slate-600">
            현재 타이머가 동작 중인 작업 ({logs.length}건)
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
          <p className="text-sm text-slate-500">진행중인 작업이 없습니다.</p>
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2">
        {logs.map((log) => (
          <li key={log.id} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">수험번호</p>
                <p className="truncate font-mono text-sm font-semibold text-slate-900">
                  {log.exam_number}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="badge-accent">{TASK_TYPE_LABELS[log.task_type]}</span>
                {log.parent_log_id && <span className="badge">재작업</span>}
              </div>
            </div>

            {log.task_type === "other" && log.task_type_other_text && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="text-slate-500">내용 · </span>
                {log.task_type_other_text}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">담당자</p>
                <p className="text-slate-900">{log.handler_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">시작</p>
                <p className="text-slate-900">{formatDateTime(log.started_at)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-500">경과</p>
                <LiveTimer startedAt={log.started_at} />
              </div>
              <button
                type="button"
                className="btn-danger"
                onClick={() => stop(log.id)}
                disabled={stoppingId === log.id}
              >
                <Square size={14} />
                {stoppingId === log.id ? "종료 중..." : "종료"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
