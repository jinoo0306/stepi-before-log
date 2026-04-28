import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { apiKeyAuth } from "./middleware/apiKey";
import handlersRouter from "./routes/handlers";
import taskLogsRouter from "./routes/taskLogs";
import tablesRouter from "./routes/tables";

const app = express();
const PORT = Number(process.env.PORT ?? 22);

// CORS: 모든 origin 허용 (어느 도메인에서든 호출 가능)
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiKeyAuth);
app.use("/api/handlers", handlersRouter);
app.use("/api/task-logs", taskLogsRouter);
app.use("/api/tables", tablesRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "internal server error" });
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[backend] listening on :${PORT}`);
});
