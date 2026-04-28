"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { api, type TableInfo, type TableRowsResponse } from "@/lib/api";
import { downloadCsv, downloadXlsx } from "@/lib/export";
import { cn } from "@/lib/utils";
import { RowFormDialog } from "@/components/row-form-dialog";

type SortDir = "asc" | "desc" | null;

export default function TableWorkbenchPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<TableRowsResponse | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(
    null
  );
  const [deletingPk, setDeletingPk] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    setLoadingTables(true);
    setError(null);
    try {
      const list = await api.listTables();
      setTables(list);
      if (list.length > 0 && !selected) {
        setSelected(list[0].name);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "테이블 목록을 불러오지 못했습니다."
      );
    } finally {
      setLoadingTables(false);
    }
  }, [selected]);

  const loadRows = useCallback(async (name: string) => {
    setLoadingRows(true);
    setError(null);
    try {
      const d = await api.getTableRows(name);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) {
      loadRows(selected);
      setSortCol(null);
      setSortDir(null);
      setFilters({});
    }
  }, [selected, loadRows]);

  const columnNames = useMemo(
    () => (data ? data.columns.map((c) => c.name) : []),
    [data]
  );

  const filteredSortedRows = useMemo(() => {
    if (!data) return [];
    let rows = data.rows;

    // filter
    const active = Object.entries(filters).filter(([, v]) => v.trim() !== "");
    if (active.length > 0) {
      rows = rows.filter((r) =>
        active.every(([col, q]) => {
          const v = r[col];
          const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
          return s.toLowerCase().includes(q.trim().toLowerCase());
        })
      );
    }

    // sort
    if (sortCol && sortDir) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol];
        const bv = b[sortCol];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return (av - bv) * dir;
        }
        return String(av).localeCompare(String(bv), "ko") * dir;
      });
    }

    return rows;
  }, [data, filters, sortCol, sortDir]);

  const cycleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortCol(null);
      setSortDir(null);
    } else {
      setSortDir("asc");
    }
  };

  const onCsv = () => {
    if (!data || !selected) return;
    downloadCsv(`${selected}.csv`, columnNames, filteredSortedRows);
  };

  const onXlsx = async () => {
    if (!data || !selected) return;
    setExporting(true);
    try {
      await downloadXlsx(
        `${selected}.xlsx`,
        selected,
        columnNames,
        filteredSortedRows
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "XLSX 내보내기에 실패했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const refresh = () => {
    if (selected) loadRows(selected);
    loadTables();
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingRow(null);
    setFormOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setFormMode("edit");
    setEditingRow(row);
    setFormOpen(true);
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!data || !data.primary_key || !selected) return;
    const pk = row[data.primary_key];
    if (pk === null || pk === undefined) return;
    if (
      !confirm(
        `${selected} 테이블의 ${data.primary_key}=${String(pk)} 행을 삭제할까요?`
      )
    )
      return;
    setDeletingPk(String(pk));
    try {
      await api.deleteRow(selected, String(pk));
      await loadRows(selected);
      await loadTables();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingPk(null);
    }
  };

  const handleSaved = async () => {
    if (selected) await loadRows(selected);
    await loadTables();
  };

  const filterCount = Object.values(filters).filter((v) => v.trim() !== "").length;
  const visibleCount = filteredSortedRows.length;
  const totalCount = data?.rows.length ?? 0;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={12} />
            메인으로
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
            데이터 워크벤치
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            DB의 모든 테이블을 조회·편집하고 CSV / XLSX로 내보낼 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={refresh}
          disabled={loadingTables || loadingRows}
          aria-label="새로고침"
          title="새로고침"
        >
          <RefreshCw
            size={14}
            className={loadingTables || loadingRows ? "animate-spin" : ""}
          />
          새로고침
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="card p-2">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            테이블 ({tables.length})
          </p>
          {loadingTables && tables.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">불러오는 중...</p>
          ) : tables.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">
              표시할 테이블이 없습니다.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {tables.map((t) => (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => setSelected(t.name)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                      selected === t.name
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate font-mono">
                      <Table2 size={14} className="shrink-0 opacity-70" />
                      {t.name}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums",
                        selected === t.name
                          ? "bg-white/15 text-white"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {t.row_count.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-slate-900">
                {selected ?? "—"}
              </p>
              {data && (
                <p className="text-xs text-slate-500">
                  {visibleCount.toLocaleString()} / {totalCount.toLocaleString()} rows
                  {filterCount > 0 && ` · 필터 ${filterCount}`}
                  {sortCol && ` · 정렬 ${sortCol} ${sortDir}`}
                  {" · "}{data.columns.length} cols
                  {data.primary_key === null && " · PK 없음 (편집 불가)"}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {filterCount > 0 && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setFilters({})}
                >
                  <X size={14} />
                  필터 초기화
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={openCreate}
                disabled={!data}
              >
                <Plus size={14} />
                행 추가
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onCsv}
                disabled={!data || filteredSortedRows.length === 0}
              >
                <Download size={14} />
                CSV
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={onXlsx}
                disabled={!data || filteredSortedRows.length === 0 || exporting}
              >
                <Download size={14} />
                {exporting ? "내보내는 중..." : "XLSX"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingRows ? (
              <p className="p-8 text-center text-sm text-slate-500">불러오는 중...</p>
            ) : !data ? (
              <p className="p-8 text-center text-sm text-slate-500">
                테이블을 선택하세요.
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {data.columns.map((c) => (
                      <th
                        key={c.name}
                        className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-700"
                      >
                        <button
                          type="button"
                          onClick={() => cycleSort(c.name)}
                          className="flex w-full items-center justify-between gap-2 group"
                        >
                          <span className="text-left">
                            <div className="font-mono text-xs">
                              {c.name}
                              {c.name === data.primary_key && (
                                <span className="ml-1 text-[9px] text-slate-400">
                                  PK
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">
                              {c.data_type}
                            </div>
                          </span>
                          <SortIcon
                            active={sortCol === c.name}
                            dir={sortCol === c.name ? sortDir : null}
                          />
                        </button>
                      </th>
                    ))}
                    {data.primary_key !== null && (
                      <th className="sticky right-0 z-10 border-b border-l border-slate-200 bg-slate-50 px-3 py-2 text-right text-xs font-medium text-slate-500">
                        조작
                      </th>
                    )}
                  </tr>
                  <tr>
                    {data.columns.map((c) => (
                      <th
                        key={c.name}
                        className="border-b border-slate-200 bg-white px-2 py-1.5"
                      >
                        <input
                          type="text"
                          placeholder="필터..."
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
                          value={filters[c.name] ?? ""}
                          onChange={(e) =>
                            setFilters((p) => ({ ...p, [c.name]: e.target.value }))
                          }
                        />
                      </th>
                    ))}
                    {data.primary_key !== null && (
                      <th className="sticky right-0 z-10 border-b border-l border-slate-200 bg-white px-3 py-1.5"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          data.columns.length + (data.primary_key !== null ? 1 : 0)
                        }
                        className="p-8 text-center text-sm text-slate-500"
                      >
                        {totalCount === 0
                          ? "데이터가 없습니다."
                          : "필터 조건에 맞는 행이 없습니다."}
                      </td>
                    </tr>
                  ) : (
                    filteredSortedRows.map((row, i) => {
                      const pk = data.primary_key
                        ? String(row[data.primary_key])
                        : String(i);
                      return (
                        <tr
                          key={pk + ":" + i}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >
                          {data.columns.map((c) => (
                            <td
                              key={c.name}
                              className="px-3 py-2 align-top font-mono text-xs text-slate-800"
                            >
                              <Cell value={row[c.name]} />
                            </td>
                          ))}
                          {data.primary_key !== null && (
                            <td className="sticky right-0 z-10 border-l border-slate-100 bg-white px-2 py-1.5 text-right hover:bg-slate-50">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  className="btn-ghost !px-2 !py-1"
                                  onClick={() => openEdit(row)}
                                  aria-label="수정"
                                  title="수정"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-ghost !px-2 !py-1 !text-red-600 hover:!bg-red-50"
                                  onClick={() => handleDelete(row)}
                                  disabled={deletingPk === pk}
                                  aria-label="삭제"
                                  title="삭제"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {data && selected && (
        <RowFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          mode={formMode}
          tableName={selected}
          primaryKey={data.primary_key}
          columns={data.columns}
          initialRow={editingRow}
          onSaved={handleSaved}
        />
      )}
    </main>
  );
}

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">NULL</span>;
  }
  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  if (typeof value === "object") {
    return (
      <span className="whitespace-pre-wrap break-words">
        {JSON.stringify(value)}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir)
    return <ArrowUpDown size={12} className="text-slate-300 group-hover:text-slate-500" />;
  return dir === "asc" ? (
    <ArrowUp size={12} className="text-slate-700" />
  ) : (
    <ArrowDown size={12} className="text-slate-700" />
  );
}
