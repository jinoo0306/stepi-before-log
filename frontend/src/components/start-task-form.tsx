"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { CheckResult, Handler, TaskType } from "@/lib/types";
import { TASK_TYPE_LABELS } from "@/lib/types";
import { api } from "@/lib/api";
import { HandlerSelect } from "./handler-select";
import { DuplicateConfirmDialog } from "./duplicate-confirm-dialog";

const TASK_TYPES: TaskType[] = [
  "application_review",
  "qualification_review",
  "self_intro_violation_review",
  "outreach_violation_review",
  "result_organization",
  "other",
];

export function StartTaskForm({
  handlers,
  onHandlersChange,
  onStarted,
}: {
  handlers: Handler[];
  onHandlersChange: () => Promise<void> | void;
  onStarted: () => void;
}) {
  const [examNumber, setExamNumber] = useState("");
  const [taskType, setTaskType] = useState<TaskType | "">("");
  const [otherText, setOtherText] = useState("");
  const [handlerId, setHandlerId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const reset = () => {
    setExamNumber("");
    setTaskType("");
    setOtherText("");
    setHandlerId(null);
    setError(null);
  };

  const validate = (): string | null => {
    if (!examNumber.trim()) return "수험번호를 입력해 주세요.";
    if (!taskType) return "업무 종류를 선택해 주세요.";
    if (taskType === "other" && !otherText.trim())
      return "기타 업무 내용을 입력해 주세요.";
    if (handlerId === null) return "담당자를 선택해 주세요.";
    return null;
  };

  const start = async () => {
    if (taskType === "" || handlerId === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createTaskLog({
        exam_number: examNumber.trim(),
        task_type: taskType,
        task_type_other_text: taskType === "other" ? otherText.trim() : null,
        handler_id: handlerId,
      });
      reset();
      onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "타이머 시작에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (taskType === "") return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await api.checkExisting(examNumber.trim(), taskType);
      if (result.in_progress.length > 0 || result.completed.length > 0) {
        setCheckResult(result);
        setConfirmOpen(true);
        setSubmitting(false);
      } else {
        await start();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "중복 확인에 실패했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">업무 시작</h2>
      <p className="mt-1 text-sm text-slate-600">
        수험번호와 업무를 입력한 뒤 타이머를 시작합니다.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="exam_number" className="field-label block mb-1.5">
            수험번호
          </label>
          <input
            id="exam_number"
            className="field-input"
            placeholder="예: 0068-000001"
            value={examNumber}
            onChange={(e) => setExamNumber(e.target.value)}
            disabled={submitting}
            inputMode="text"
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="task_type" className="field-label block mb-1.5">
            업무 종류
          </label>
          <select
            id="task_type"
            className="field-input"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as TaskType | "")}
            disabled={submitting}
          >
            <option value="">선택</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {taskType === "other" && (
          <div>
            <label htmlFor="other_text" className="field-label block mb-1.5">
              기타 업무 내용
            </label>
            <input
              id="other_text"
              className="field-input"
              placeholder="어떤 업무인지 입력"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              disabled={submitting}
            />
          </div>
        )}

        <div>
          <label className="field-label block mb-1.5">담당자</label>
          <HandlerSelect
            handlers={handlers}
            value={handlerId}
            onChange={setHandlerId}
            onHandlersChange={onHandlersChange}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={submitting}
        >
          <Play size={16} />
          {submitting ? "시작 중..." : "타이머 시작"}
        </button>
      </form>

      <DuplicateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        result={checkResult}
        onConfirm={start}
      />
    </div>
  );
}
