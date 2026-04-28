import { Router } from "express";
import { pool } from "../db";

const router = Router();

const SAFE_NAME = /^[a-z_][a-z0-9_]*$/;

async function listAllowedTables(): Promise<string[]> {
  const r = await pool.query<{ table_name: string }>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  );
  return r.rows.map((row) => row.table_name);
}

async function getColumnNames(table: string): Promise<string[]> {
  const r = await pool.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return r.rows.map((row) => row.column_name);
}

async function getPrimaryKey(table: string): Promise<string | null> {
  const r = await pool.query<{ column_name: string }>(
    `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY kcu.ordinal_position`,
    [table]
  );
  if (r.rowCount !== 1) return null; // unsupported: no PK or composite PK
  return r.rows[0]?.column_name ?? null;
}

// 공통: 테이블 이름 검증 + 화이트리스트
async function resolveTable(name: string): Promise<
  | { ok: true; name: string }
  | { ok: false; status: number; error: string }
> {
  if (!SAFE_NAME.test(name)) {
    return { ok: false, status: 400, error: "invalid table name" };
  }
  const allowed = await listAllowedTables();
  if (!allowed.includes(name)) {
    return { ok: false, status: 404, error: "table not found" };
  }
  return { ok: true, name };
}

// 공통: 사용자가 보낸 values 객체에서 컬럼 화이트리스트만 통과시키기
function pickValidColumns(
  values: Record<string, unknown>,
  allowed: string[]
): { cols: string[]; vals: unknown[] } {
  const cols: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!SAFE_NAME.test(k)) continue;
    if (!allowed.includes(k)) continue;
    cols.push(k);
    // 빈 문자열 → NULL
    vals.push(v === "" ? null : v);
  }
  return { cols, vals };
}

// pg 식별자 escape
const ident = (n: string) => `"${n.replace(/"/g, '""')}"`;

// GET /api/tables -> [{name, row_count}]
router.get("/", async (_req, res, next) => {
  try {
    const names = await listAllowedTables();
    const out = await Promise.all(
      names.map(async (name) => {
        if (!SAFE_NAME.test(name)) return { name, row_count: 0 };
        const c = await pool.query<{ n: string }>(
          `SELECT COUNT(*)::text AS n FROM ${ident(name)}`
        );
        return { name, row_count: Number(c.rows[0]?.n ?? 0) };
      })
    );
    res.json(out);
  } catch (e) {
    next(e);
  }
});

// GET /api/tables/:name/rows -> { primary_key, columns, rows }
router.get("/:name/rows", async (req, res, next) => {
  try {
    const t = await resolveTable(req.params.name);
    if (!t.ok) {
      res.status(t.status).json({ error: t.error });
      return;
    }
    const colsRes = await pool.query<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position`,
      [t.name]
    );
    const pk = await getPrimaryKey(t.name);
    const rowsRes = await pool.query(
      `SELECT * FROM ${ident(t.name)} ORDER BY 1`
    );
    res.json({
      primary_key: pk,
      columns: colsRes.rows.map((c) => ({
        name: c.column_name,
        data_type: c.data_type,
        is_nullable: c.is_nullable === "YES",
        has_default: c.column_default !== null,
      })),
      rows: rowsRes.rows,
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/tables/:name/rows  body: { values: {col: val, ...} }
router.post("/:name/rows", async (req, res, next) => {
  try {
    const t = await resolveTable(req.params.name);
    if (!t.ok) {
      res.status(t.status).json({ error: t.error });
      return;
    }
    const values =
      req.body && typeof req.body.values === "object" && req.body.values !== null
        ? (req.body.values as Record<string, unknown>)
        : null;
    if (!values) {
      res.status(400).json({ error: "values object is required" });
      return;
    }
    const allowedCols = await getColumnNames(t.name);
    const { cols, vals } = pickValidColumns(values, allowedCols);

    let sql: string;
    if (cols.length === 0) {
      sql = `INSERT INTO ${ident(t.name)} DEFAULT VALUES RETURNING *`;
    } else {
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colList = cols.map(ident).join(", ");
      sql = `INSERT INTO ${ident(t.name)} (${colList}) VALUES (${placeholders}) RETURNING *`;
    }
    const r = await pool.query(sql, vals);
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: `중복된 값입니다 (${e.detail ?? ""})` });
      return;
    }
    if (e?.code === "23503") {
      res.status(400).json({ error: `참조 무결성 위반입니다 (${e.detail ?? ""})` });
      return;
    }
    if (e?.code === "23502") {
      res.status(400).json({ error: `필수 값이 비어 있습니다 (${e.column ?? ""})` });
      return;
    }
    if (e?.code === "23514") {
      res.status(400).json({ error: `체크 제약 위반입니다 (${e.constraint ?? ""})` });
      return;
    }
    if (e?.code === "22P02" || e?.code === "22007" || e?.code === "22008") {
      res.status(400).json({ error: `값 형식이 올바르지 않습니다: ${e.message ?? ""}` });
      return;
    }
    next(e);
  }
});

// PATCH /api/tables/:name/rows/:pk  body: { values: {col: val, ...} }
router.patch("/:name/rows/:pk", async (req, res, next) => {
  try {
    const t = await resolveTable(req.params.name);
    if (!t.ok) {
      res.status(t.status).json({ error: t.error });
      return;
    }
    const pkCol = await getPrimaryKey(t.name);
    if (!pkCol) {
      res
        .status(400)
        .json({ error: "이 테이블은 단일 컬럼 PK가 없어 수정할 수 없습니다." });
      return;
    }
    const values =
      req.body && typeof req.body.values === "object" && req.body.values !== null
        ? (req.body.values as Record<string, unknown>)
        : null;
    if (!values) {
      res.status(400).json({ error: "values object is required" });
      return;
    }
    const allowedCols = await getColumnNames(t.name);
    // PK 컬럼은 수정 대상에서 제외
    const { [pkCol]: _ignored, ...rest } = values;
    void _ignored;
    const { cols, vals } = pickValidColumns(rest, allowedCols);
    if (cols.length === 0) {
      res.status(400).json({ error: "수정할 컬럼이 없습니다." });
      return;
    }
    const setClause = cols
      .map((c, i) => `${ident(c)} = $${i + 1}`)
      .join(", ");
    const sql = `UPDATE ${ident(t.name)} SET ${setClause}
                  WHERE ${ident(pkCol)} = $${cols.length + 1}
                  RETURNING *`;
    const r = await pool.query(sql, [...vals, req.params.pk]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "해당 PK의 행을 찾을 수 없습니다." });
      return;
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: `중복된 값입니다 (${e.detail ?? ""})` });
      return;
    }
    if (e?.code === "23503") {
      res.status(400).json({ error: `참조 무결성 위반입니다 (${e.detail ?? ""})` });
      return;
    }
    if (e?.code === "23502") {
      res.status(400).json({ error: `필수 값이 비어 있습니다 (${e.column ?? ""})` });
      return;
    }
    if (e?.code === "23514") {
      res.status(400).json({ error: `체크 제약 위반입니다 (${e.constraint ?? ""})` });
      return;
    }
    if (e?.code === "22P02" || e?.code === "22007" || e?.code === "22008") {
      res.status(400).json({ error: `값 형식이 올바르지 않습니다: ${e.message ?? ""}` });
      return;
    }
    next(e);
  }
});

// DELETE /api/tables/:name/rows/:pk
router.delete("/:name/rows/:pk", async (req, res, next) => {
  try {
    const t = await resolveTable(req.params.name);
    if (!t.ok) {
      res.status(t.status).json({ error: t.error });
      return;
    }
    const pkCol = await getPrimaryKey(t.name);
    if (!pkCol) {
      res
        .status(400)
        .json({ error: "이 테이블은 단일 컬럼 PK가 없어 삭제할 수 없습니다." });
      return;
    }
    const r = await pool.query(
      `DELETE FROM ${ident(t.name)} WHERE ${ident(pkCol)} = $1`,
      [req.params.pk]
    );
    if (r.rowCount === 0) {
      res.status(404).json({ error: "해당 PK의 행을 찾을 수 없습니다." });
      return;
    }
    res.status(204).end();
  } catch (e: any) {
    if (e?.code === "23503") {
      res.status(409).json({
        error: `다른 행이 이 행을 참조 중이라 삭제할 수 없습니다 (${e.detail ?? ""})`,
      });
      return;
    }
    if (e?.code === "22P02") {
      res.status(400).json({ error: "PK 형식이 올바르지 않습니다." });
      return;
    }
    next(e);
  }
});

export default router;
