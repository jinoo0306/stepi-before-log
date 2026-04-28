// OpenAPI 3.0 스펙 — Swagger UI(/docs)에서 사용.
// 라우트 추가/변경 시 이 파일도 같이 갱신해 주세요.
export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "stepi-before-log API",
    version: "0.1.0",
    description:
      "채용 과정 작업 시간 측정 도구의 백엔드 API. 모든 `/api/*` 요청은 헤더 `X-API-Key` 필요.",
  },
  servers: [
    { url: "https://stepilog.donkey.ai.kr", description: "production" },
    { url: "http://localhost:4000", description: "local" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      Handler: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      TaskType: {
        type: "string",
        enum: [
          "application_review",
          "qualification_review",
          "self_intro_violation_review",
          "outreach_violation_review",
          "result_organization",
          "other",
        ],
      },
      TaskLog: {
        type: "object",
        properties: {
          id: { type: "integer" },
          exam_number: { type: "string", example: "0068-000001" },
          task_type: { $ref: "#/components/schemas/TaskType" },
          task_type_other_text: { type: "string", nullable: true },
          handler_id: { type: "integer" },
          handler_name: { type: "string" },
          parent_log_id: { type: "integer", nullable: true },
          started_at: { type: "string", format: "date-time" },
          ended_at: { type: "string", format: "date-time", nullable: true },
          paused_at: { type: "string", format: "date-time", nullable: true },
          total_paused_seconds: { type: "integer" },
          duration_seconds: { type: "integer", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      TableSummary: {
        type: "object",
        properties: {
          name: { type: "string" },
          row_count: { type: "integer" },
        },
      },
      TableColumn: {
        type: "object",
        properties: {
          name: { type: "string" },
          data_type: { type: "string" },
          is_nullable: { type: "boolean" },
          has_default: { type: "boolean" },
        },
      },
      TableRows: {
        type: "object",
        properties: {
          primary_key: { type: "string", nullable: true },
          columns: {
            type: "array",
            items: { $ref: "#/components/schemas/TableColumn" },
          },
          rows: {
            type: "array",
            items: { type: "object", additionalProperties: true },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "API 키 누락/불일치",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      BadRequest: {
        description: "요청 형식 오류",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "리소스 없음",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Conflict: {
        description: "충돌(중복/참조 위반 등)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "헬스체크",
        tags: ["meta"],
        security: [],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { ok: { type: "boolean" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/handlers": {
      get: {
        summary: "담당자 전체 목록",
        tags: ["handlers"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Handler" },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        summary: "담당자 추가",
        tags: ["handlers"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Handler" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/handlers/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      patch: {
        summary: "담당자 이름 수정",
        tags: ["handlers"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Handler" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        summary: "담당자 삭제",
        tags: ["handlers"],
        responses: {
          204: { description: "No Content" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/task-logs": {
      get: {
        summary: "작업 로그 목록",
        tags: ["task-logs"],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["in_progress", "completed"],
            },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TaskLog" },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        summary: "타이머 시작 (작업 로그 생성)",
        tags: ["task-logs"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["exam_number", "task_type", "handler_id"],
                properties: {
                  exam_number: { type: "string" },
                  task_type: { $ref: "#/components/schemas/TaskType" },
                  task_type_other_text: { type: "string", nullable: true },
                  handler_id: { type: "integer" },
                  parent_log_id: { type: "integer", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskLog" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/task-logs/check": {
      get: {
        summary: "(수험번호, 업무) 중복 기록 조회",
        tags: ["task-logs"],
        parameters: [
          {
            name: "exam_number",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "task_type",
            in: "query",
            required: true,
            schema: { $ref: "#/components/schemas/TaskType" },
          },
        ],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    in_progress: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TaskLog" },
                    },
                    completed: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TaskLog" },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/task-logs/{id}": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      delete: {
        summary: "작업 로그 삭제 (영구)",
        tags: ["task-logs"],
        responses: {
          204: { description: "No Content" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/task-logs/{id}/stop": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      patch: {
        summary: "타이머 종료",
        tags: ["task-logs"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskLog" },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/task-logs/{id}/pause": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      patch: {
        summary: "타이머 일시정지",
        tags: ["task-logs"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskLog" },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/task-logs/{id}/resume": {
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      patch: {
        summary: "타이머 재개",
        tags: ["task-logs"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskLog" },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/tables": {
      get: {
        summary: "public 스키마의 테이블 목록과 행 수",
        tags: ["tables"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/TableSummary" },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/tables/{name}/rows": {
      parameters: [
        {
          name: "name",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      get: {
        summary: "테이블 전체 행 조회",
        tags: ["tables"],
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TableRows" },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        summary: "행 추가",
        tags: ["tables"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["values"],
                properties: {
                  values: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/tables/{name}/rows/{pk}": {
      parameters: [
        {
          name: "name",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "pk",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      patch: {
        summary: "PK로 행 수정",
        tags: ["tables"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["values"],
                properties: {
                  values: {
                    type: "object",
                    additionalProperties: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        summary: "PK로 행 삭제",
        tags: ["tables"],
        responses: {
          204: { description: "No Content" },
          400: { $ref: "#/components/responses/BadRequest" },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
  },
} as const;
