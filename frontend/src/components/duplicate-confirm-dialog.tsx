"use client";

import { Dialog, DialogContent, DialogTitle } from "./dialog";
import type { CheckResult } from "@/lib/types";

export function DuplicateConfirmDialog({
  open,
  onOpenChange,
  result,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: CheckResult | null;
  onConfirm: () => void;
}) {
  if (!result) return null;

  const inProgressNames = Array.from(
    new Set(result.in_progress.map((r) => r.handler_name))
  );
  const completedNames = Array.from(
    new Set(result.completed.map((r) => r.handler_name))
  );

  const segments: string[] = [];
  if (completedNames.length > 0) {
    segments.push(`${completedNames.join(", ")} 담당자가 해당 업무를 하였습니다`);
  }
  if (inProgressNames.length > 0) {
    segments.push(`${inProgressNames.join(", ")} 담당자가 진행 중입니다`);
  }
  const message =
    segments.length > 0
      ? `${segments.join(", 그리고 ")}. 계속 진행하시겠습니까?`
      : "이미 같은 작업 기록이 있습니다. 계속 진행하시겠습니까?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={false}>
        <DialogTitle>중복 작업 확인</DialogTitle>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onOpenChange(false)}
          >
            아니오
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            예, 계속 진행
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
