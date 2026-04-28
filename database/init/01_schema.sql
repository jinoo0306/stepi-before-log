-- handlers: 작업 담당자
CREATE TABLE handlers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- task_type: 업무 종류
CREATE TYPE task_type AS ENUM (
  'application_review',     -- 지원서 검토
  'pre_violation_review',   -- 사전위배 검토
  'result_organization',    -- 결과 정리
  'other'                   -- 기타 (task_type_other_text 사용)
);

-- task_logs: 타이머 기록
--   ended_at IS NULL  -> 진행중
--   parent_log_id     -> 재작업 세션 (원본을 부모로 가짐)
CREATE TABLE task_logs (
  id                    SERIAL PRIMARY KEY,
  exam_number           VARCHAR(50) NOT NULL,
  task_type             task_type NOT NULL,
  task_type_other_text  VARCHAR(200),
  handler_id            INTEGER NOT NULL REFERENCES handlers(id) ON DELETE RESTRICT,
  parent_log_id         INTEGER REFERENCES task_logs(id) ON DELETE SET NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_other_text
    CHECK (task_type <> 'other' OR task_type_other_text IS NOT NULL),
  CONSTRAINT chk_ended_after_started
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_task_logs_exam_task    ON task_logs(exam_number, task_type);
CREATE INDEX idx_task_logs_in_progress  ON task_logs(started_at) WHERE ended_at IS NULL;
CREATE INDEX idx_task_logs_parent       ON task_logs(parent_log_id);
CREATE INDEX idx_task_logs_handler      ON task_logs(handler_id);

-- updated_at 자동 갱신용 트리거
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_handlers_updated_at
  BEFORE UPDATE ON handlers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_task_logs_updated_at
  BEFORE UPDATE ON task_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 초기 시드
INSERT INTO handlers (name) VALUES ('남지영');
