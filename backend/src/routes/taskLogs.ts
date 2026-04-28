import { Router } from "express";
import { pool } from "../db";

const router = Router();

const TASK_TYPES = [
  "application_review",
  "pre_violation_review",
  "result_organization",
  "other",
] as const;
type TaskType = (typeof TASK_TYPES)[number];

const isTaskType = (v: unknown): v is TaskType =>
  typeof v === "string" && (TASK_TYPES as readonly string[]).includes(v);

const SELECT_WITH_HANDLER = `
  SELECT tl.id, tl.exam_number, tl.task_type, tl.task_type_other_text,
         tl.handler_id, h.name AS handler_name,
         tl.parent_log_id, tl.started_at, tl.ended_at,
         tl.created_at, tl.updated_at,
         CASE WHEN tl.ended_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (tl.ended_at - tl.started_at))::INTEGER
              ELSE NULL END AS duration_seconds
    FROM task_logs tl
    JOIN handlers h ON h.id = tl.handler_id
`;

// GET /api/task-logs?status=in_progress|completed
router.get("/", async (req, res, next) => {
  try {
    const status = req.query.status;
    let where = "";
    if (status === "in_progress") where = "WHERE tl.ended_at IS NULL";
    else if (status === "completed") where = "WHERE tl.ended_at IS NOT NULL";
    const order =
      status === "completed"
        ? "ORDER BY tl.ended_at DESC, tl.id DESC"
        : "ORDER BY tl.started_at DESC, tl.id DESC";
    const r = await pool.query(`${SELECT_WITH_HANDLER} ${where} ${order}`);
    res.json(r.rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/task-logs/check?exam_number=X&task_type=Y
// 같은 (수험번호, 업무) 조합의 기존 기록을 in_progress / completed로 나눠 반환
router.get("/check", async (req, res, next) => {
  try {
    const examNumber =
      typeof req.query.exam_number === "string" ? req.query.exam_number.trim() : "";
    const taskType = req.query.task_type;
    if (!examNumber) {
      res.status(400).json({ error: "exam_number is required" });
      return;
    }
    if (!isTaskType(taskType)) {
      res.status(400).json({ error: "invalid task_type" });
      return;
    }
    const r = await pool.query(
      `${SELECT_WITH_HANDLER}
        WHERE tl.exam_number = $1 AND tl.task_type = $2
        ORDER BY tl.started_at DESC`,
      [examNumber, taskType]
    );
    const rows = r.rows;
    res.json({
      in_progress: rows.filter((row) => row.ended_at === null),
      completed: rows.filter((row) => row.ended_at !== null),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/task-logs   { exam_number, task_type, task_type_other_text?, handler_id, parent_log_id? }
router.post("/", async (req, res, next) => {
  try {
    const examNumber =
      typeof req.body?.exam_number === "string" ? req.body.exam_number.trim() : "";
    const taskType = req.body?.task_type;
    const otherText =
      typeof req.body?.task_type_other_text === "string"
        ? req.body.task_type_other_text.trim()
        : null;
    const handlerId = Number(req.body?.handler_id);
    const parentLogId =
      req.body?.parent_log_id === undefined || req.body?.parent_log_id === null
        ? null
        : Number(req.body.parent_log_id);

    if (!examNumber) {
      res.status(400).json({ error: "exam_number is required" });
      return;
    }
    if (!isTaskType(taskType)) {
      res.status(400).json({ error: "invalid task_type" });
      return;
    }
    if (taskType === "other" && !otherText) {
      res
        .status(400)
        .json({ error: "task_type_other_text is required when task_type=other" });
      return;
    }
    if (!Number.isInteger(handlerId) || handlerId <= 0) {
      res.status(400).json({ error: "handler_id is required" });
      return;
    }
    if (parentLogId !== null && (!Number.isInteger(parentLogId) || parentLogId <= 0)) {
      res.status(400).json({ error: "invalid parent_log_id" });
      return;
    }

    const insert = await pool.query(
      `INSERT INTO task_logs
         (exam_number, task_type, task_type_other_text, handler_id, parent_log_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        examNumber,
        taskType,
        taskType === "other" ? otherText : null,
        handlerId,
        parentLogId,
      ]
    );
    const newId = insert.rows[0].id as number;
    const r = await pool.query(
      `${SELECT_WITH_HANDLER} WHERE tl.id = $1`,
      [newId]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    if (e?.code === "23503") {
      res.status(400).json({ error: "참조 무결성 오류 (handler_id 또는 parent_log_id)" });
      return;
    }
    next(e);
  }
});

// PATCH /api/task-logs/:id/stop
router.patch("/:id/stop", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const upd = await pool.query(
      `UPDATE task_logs
          SET ended_at = NOW()
        WHERE id = $1 AND ended_at IS NULL
        RETURNING id`,
      [id]
    );
    if (upd.rowCount === 0) {
      res.status(409).json({ error: "이미 종료되었거나 존재하지 않는 기록입니다." });
      return;
    }
    const r = await pool.query(`${SELECT_WITH_HANDLER} WHERE tl.id = $1`, [id]);
    res.json(r.rows[0]);
  } catch (e) {
    next(e);
  }
});

export default router;
