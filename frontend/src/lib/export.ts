function cellToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(
  filename: string,
  columns: string[],
  rows: Record<string, unknown>[]
) {
  const lines: string[] = [];
  lines.push(columns.map((c) => csvEscape(c)).join(","));
  for (const r of rows) {
    lines.push(columns.map((c) => csvEscape(cellToString(r[c]))).join(","));
  }
  // ﻿ (UTF-8 BOM) so Excel renders Korean correctly
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, filename);
}

export async function downloadXlsx(
  filename: string,
  sheetName: string,
  columns: string[],
  rows: Record<string, unknown>[]
) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (const c of columns) {
      const v = r[c];
      o[c] =
        v === null || v === undefined
          ? ""
          : v instanceof Date
          ? v.toISOString()
          : typeof v === "object"
          ? JSON.stringify(v)
          : v;
    }
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: columns });
  const wb = XLSX.utils.book_new();
  // sheet name max 31 chars in Excel
  const safeName = sheetName.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
  XLSX.writeFile(wb, filename);
}
