"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./dialog";
import { api, type TableColumn } from "@/lib/api";

type Mode = "create" | "edit";

type FieldState = {
  value: string;
  isNull: boolean;
};

const NUMERIC_TYPES = new Set([
  "integer",
  "bigint",
  "smallint",
  "numeric",
  "decimal",
  "real",
  "double precision",
]);

function toInputString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function isNumericType(t: string) {
  return NUMERIC_TYPES.has(t.toLowerCase());
}

function placeholderFor(c: TableColumn): string {
  const t = c.data_type.toLowerCase();
  if (t.startsWith("timestamp")) return "예: 2026-04-28T10:00:00Z";
  if (t === "date") return "예: 2026-04-28";
  if (t === "time" || t.startsWith("time ")) return "예: 10:00:00";
  if (t === "boolean") return "true / false";
  if (t === "user-defined") return "ENUM 값을 그대로 입력";
  if (isNumericType(t)) return "숫자";
  return "";
}

export function RowFormDialog({
  open,
  onOpenChange,
  mode,
  tableName,
  primaryKey,
  columns,
  initialRow,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  tableName: string;
  primaryKey: string | null;
  columns: TableColumn[];
  initialRow?: Record<string, unknown> | null;
  onSaved: () => void;
}) {
  const [fields, setFields] = useState<Record<string, FieldState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pkValue = useMemo(() => {
    if (mode !== "edit" || !initialRow || !primaryKey) return null;
    const v = initialRow[primaryKey];
    return v === null || v === undefined ? null : String(v);
  }, [mode, initialRow, primaryKey]);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, FieldState> = {};
    for (const c of columns) {
      if (mode === "edit" && initialRow) {
        const v = initialRow[c.name];
        next[c.name] = {
          value: v === null || v === undefined ? "" : toInputString(v),
          isNull: v === null || v === undefined,
        };
      } else {
        next[c.name] = { value: "", isNull: false };
      }
    }
    setFields(next);
    setError(null);
  }, [open, mode, columns, initialRow]);

  const setField = (name: string, patch: Partial<FieldState>) => {
    setFields((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const values: Record<string, unknown> = {};

      for (const c of columns) {
        if (mode === "edit" && primaryKey && c.name === primaryKey) continue;

        const f = fields[c.name];
        if (!f) continue;

        if (f.isNull) {
          if (mode === "create" && c.has_default) {
            // create + 기본값 있으면 NULL 토글이 켜졌어도 그대로 두면 default 적용됨
            // 의도가 명시적으로 NULL이라면 보내야 함 → 보내자
          }
          values[c.name] = null;
          continue;
        }

        const trimmed = f.value;
        if (mode === "create" && trimmed === "") {
          // create + 빈 값 + 기본값 있음 → 컬럼 자체를 생략해서 default 적용
          if (c.has_default) continue;
          // default 없는데 nullable이면 null 보냄
          if (c.is_nullable) {
            values[c.name] = null;
            continue;
          }
          // default 없고 not null인데 비어 있으면 서버가 23502로 거절
          values[c.name] = "";
          continue;
        }
        values[c.name] = trimmed;
      }

      if (mode === "create") {
        await api.createRow(tableName, values);
      } else {
        if (!primaryKey || pkValue === null) {
          throw new Error("이 행의 PK를 찾을 수 없습니다.");
        }
        await api.updateRow(tableName, pkValue, values);
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>
          {mode === "create" ? "새 행 추가" : "행 수정"} · {tableName}
        </DialogTitle>
        <DialogDescription>
          {mode === "create"
            ? "기본값이 있는 컬럼은 비워두면 DB가 채웁니다."
            : "PK는 수정할 수 없습니다. 빈 값으로 두면 그대로 저장됩니다."}
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="max-h-[55vh] overflow-y-auto pr-1 space-y-3">
            {columns.map((c) => {
              const isPk = primaryKey === c.name;
              const readOnly = mode === "edit" && isPk;
              const f = fields[c.name] ?? { value: "", isNull: false };
              return (
                <div key={c.name}>
                  <label
                    htmlFor={`f-${c.name}`}
                    className="flex items-center justify-between mb-1.5"
                  >
                    <span className="text-sm">
                      <span className="font-mono font-medium text-navy-900">
                        {c.name}
                      </span>
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-navy-500">
                        {c.data_type}
                        {isPk && " · PK"}
                        {!c.is_nullable && !isPk && " · NOT NULL"}
                        {c.has_default && " · DEFAULT"}
                      </span>
                    </span>
                    {c.is_nullable && !readOnly && (
                      <label className="flex items-center gap-1.5 text-xs text-navy-600">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          checked={f.isNull}
                          onChange={(e) =>
                            setField(c.name, { isNull: e.target.checked })
                          }
                        />
                        NULL
                      </label>
                    )}
                  </label>
                  <input
                    id={`f-${c.name}`}
                    className="field-input"
                    type={isNumericType(c.data_type) ? "number" : "text"}
                    inputMode={isNumericType(c.data_type) ? "decimal" : undefined}
                    placeholder={
                      readOnly
                        ? "(읽기 전용)"
                        : f.isNull
                        ? "NULL"
                        : placeholderFor(c)
                    }
                    value={f.isNull ? "" : f.value}
                    onChange={(e) => setField(c.name, { value: e.target.value })}
                    disabled={readOnly || submitting || f.isNull}
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <p
              className="rounded-md bg-red-50 p-2 text-xs text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-navy-200">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "저장 중..." : mode === "create" ? "추가" : "저장"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
