export type TaskType =
  | "application_review"
  | "qualification_review"
  | "self_intro_violation_review"
  | "outreach_violation_review"
  | "result_organization"
  | "other";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  application_review: "지원서 검토",
  qualification_review: "[사전 위배 검토] 자격 검토",
  self_intro_violation_review: "[사전 위배 검토] 자기소개서 위배 검토",
  outreach_violation_review: "[사전 위배 검토] 섭외 위배 검토",
  result_organization: "결과 정리",
  other: "기타",
};

export interface Handler {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: number;
  exam_number: string;
  task_type: TaskType;
  task_type_other_text: string | null;
  handler_id: number;
  handler_name: string;
  parent_log_id: number | null;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  total_paused_seconds: number;
  created_at: string;
  updated_at: string;
  duration_seconds: number | null;
}

export interface CheckResult {
  in_progress: TaskLog[];
  completed: TaskLog[];
}
