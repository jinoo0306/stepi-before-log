import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { apiKeyAuth } from "./middleware/apiKey";
import handlersRouter from "./routes/handlers";
import taskLogsRouter from "./routes/taskLogs";
import tablesRouter from "./routes/tables";
import { openapiSpec } from "./openapi";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// CORS: 모든 origin 허용 (어느 도메인에서든 호출 가능)
app.use(cors());
app.use(express.json());

// 요청 로깅 — 들어오는 모든 요청과 응답 코드/소요시간을 stdout에 한 줄씩 찍는다.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `[req] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`
    );
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Swagger UI (인증 불필요) — /docs, OpenAPI JSON은 /docs.json
app.get("/docs.json", (_req, res) => {
  res.json(openapiSpec);
});
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, {
    customSiteTitle: "stepi-before-log API",
  })
);

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
