import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, name, created_at, updated_at
         FROM handlers
        ORDER BY name ASC`
    );
    res.json(r.rows);
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const r = await pool.query(
      `INSERT INTO handlers (name) VALUES ($1)
         RETURNING id, name, created_at, updated_at`,
      [name]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "이미 존재하는 담당자 이름입니다." });
      return;
    }
    next(e);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    if (!name) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const r = await pool.query(
      `UPDATE handlers SET name = $1 WHERE id = $2
         RETURNING id, name, created_at, updated_at`,
      [name, id]
    );
    if (r.rowCount === 0) {
      res.status(404).json({ error: "handler not found" });
      return;
    }
    res.json(r.rows[0]);
  } catch (e: any) {
    if (e?.code === "23505") {
      res.status(409).json({ error: "이미 존재하는 담당자 이름입니다." });
      return;
    }
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const r = await pool.query(`DELETE FROM handlers WHERE id = $1`, [id]);
    if (r.rowCount === 0) {
      res.status(404).json({ error: "handler not found" });
      return;
    }
    res.status(204).end();
  } catch (e: any) {
    if (e?.code === "23503") {
      res
        .status(409)
        .json({ error: "이 담당자에게 작업 기록이 있어 삭제할 수 없습니다." });
      return;
    }
    next(e);
  }
});

export default router;
