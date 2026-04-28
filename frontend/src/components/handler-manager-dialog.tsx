"use client";

import { useState, type ReactNode } from "react";
import { Pencil, Trash2, Check, X as XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./dialog";
import type { Handler } from "@/lib/types";
import { api } from "@/lib/api";

export function HandlerManagerDialog({
  handlers,
  onChanged,
  trigger,
}: {
  handlers: Handler[];
  onChanged: () => Promise<void> | void;
  trigger: ReactNode;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (h: Handler) => {
    setEditingId(h.id);
    setEditingName(h.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setError(null);
  };

  const saveEdit = async (id: number) => {
    const name = editingName.trim();
    if (!name) {
      setError("이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.updateHandler(id, name);
      await onChanged();
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h: Handler) => {
    if (!confirm(`'${h.name}' 담당자를 삭제하시겠습니까?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteHandler(h.id);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>담당자 관리</DialogTitle>
        <DialogDescription>
          이름 수정과 삭제가 가능합니다. 작업 기록이 있는 담당자는 삭제할 수 없습니다.
        </DialogDescription>

        <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-navy-200">
          {handlers.length === 0 && (
            <p className="p-4 text-center text-sm text-navy-500">
              담당자가 없습니다.
            </p>
          )}
          <ul className="divide-y divide-navy-200">
            {handlers.map((h) => (
              <li key={h.id} className="flex items-center gap-2 p-3">
                {editingId === h.id ? (
                  <>
                    <input
                      autoFocus
                      className="field-input flex-1"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveEdit(h.id);
                        }
                      }}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="btn-ghost !text-navy-900"
                      onClick={() => saveEdit(h.id)}
                      disabled={busy}
                      aria-label="저장"
                      title="저장"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={cancelEdit}
                      disabled={busy}
                      aria-label="취소"
                      title="취소"
                    >
                      <XIcon size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-navy-900">{h.name}</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => startEdit(h)}
                      aria-label="이름 수정"
                      title="이름 수정"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !text-red-600 hover:!bg-red-50"
                      onClick={() => remove(h)}
                      aria-label="삭제"
                      title="삭제"
                      disabled={busy}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
