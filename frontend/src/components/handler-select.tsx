"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import type { Handler } from "@/lib/types";
import { api } from "@/lib/api";
import { HandlerManagerDialog } from "./handler-manager-dialog";

const ADD_NEW = "__add_new__";

export function HandlerSelect({
  handlers,
  value,
  onChange,
  onHandlersChange,
}: {
  handlers: Handler[];
  value: number | null;
  onChange: (id: number | null) => void;
  onHandlersChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === ADD_NEW) {
      setAdding(true);
      onChange(null);
    } else if (v === "") {
      setAdding(false);
      onChange(null);
    } else {
      setAdding(false);
      onChange(Number(v));
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setError("이름을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createHandler(name);
      await onHandlersChange();
      onChange(created.id);
      setNewName("");
      setAdding(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          className="field-input flex-1"
          value={adding ? ADD_NEW : value === null ? "" : String(value)}
          onChange={handleSelect}
        >
          <option value="">담당자 선택</option>
          {handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
          <option value={ADD_NEW}>기타 (이름 직접 입력)</option>
        </select>
        <HandlerManagerDialog
          handlers={handlers}
          onChanged={onHandlersChange}
          trigger={
            <button
              type="button"
              className="btn-secondary !px-3"
              aria-label="담당자 관리"
              title="담당자 관리"
            >
              <Settings2 size={16} />
            </button>
          }
        />
      </div>

      {adding && (
        <div className="rounded-md border border-navy-200 bg-navy-50 p-3 space-y-2">
          <label className="field-label block">새 담당자 이름</label>
          <div className="flex gap-2">
            <input
              autoFocus
              className="field-input flex-1"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="예: 홍길동"
              disabled={submitting}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleAdd}
              disabled={submitting}
            >
              추가
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setAdding(false);
                setNewName("");
                setError(null);
              }}
              disabled={submitting}
            >
              취소
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
