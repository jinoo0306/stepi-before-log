# stepi-before-log

채용 과정 작업 시간 측정 도구. 채용 담당자가 수험번호별로 업무를 시작/종료하며 시간을 기록한다.

## 도메인 요약

- **수험번호별로 업무 단위 타이머를 기록**한다. 수험번호 형식 검증은 하지 않음 (예: `0068-000001`).
- 업무 종류는 4가지: 지원서 검토, 사전위배 검토, 결과 정리, 기타(자유 텍스트).
- 담당자는 DB의 `handlers` 테이블에서 드롭다운으로 선택. 초기 시드는 `남지영` 1명.
- 같은 수험번호+업무를 다른 담당자가 이미 했거나 진행 중일 때 새 타이머를 시작하면 **확인 모달**을 띄우고, 사용자가 "예"를 누르면 중복 기록을 허용한다.
- 완료된 기록에 대해 **재작업**(re-work)을 시작하면 원본을 부모로 가지는 **새 레코드**가 만들어진다 — 원본은 그대로 보존한다.

## 화면

메인 (`/`) — 탭 3개:
1. **업무 시작**: 수험번호/업무종류/담당자 입력 → 타이머 시작
2. **진행중**: `ended_at IS NULL`인 레코드 목록, 종료 버튼
3. **완료 내역**: `ended_at IS NOT NULL`인 레코드 목록, 재작업 버튼

데이터 워크벤치 (`/table`) — DB의 모든 public 테이블을 그리드로 보여주고 행 추가/수정/삭제, 컬럼별 필터, 컬럼 헤더 클릭 정렬, CSV/XLSX 내보내기를 제공한다.

## 구조

```
stepi-before-log/
├── docker-compose.yml      # backend + database 묶음
├── frontend/                # Next.js (호스트에서 직접 실행)
├── backend/                 # Express.js (Docker)
└── database/                # PostgreSQL 초기 스키마/시드 (Docker)
```

## 실행 모델 / 배포

- **frontend**: 호스트에서 `npm run dev` (포트 3000). Docker 미사용. **Vercel** (`https://stepihr.vercel.app`)에 배포 예정.
- **backend**: Docker 컨테이너 (포트 **22** → 호스트 22 publish — 사용자 지정). 프로덕션 URL: `https://stepilog.donkey.ai.kr` (예정).
- **database**: Docker 컨테이너 (포트 5432 → 호스트 5432 publish, 로컬 GUI 툴 접근용).
- backend ↔ database는 Docker 네트워크 내부에서 서비스명(`database`)으로 통신.
- frontend → backend는 **Next.js Route Handler 프록시**(`/api/*`)를 거쳐 호출. 프록시가 서버 사이드에서 API 키를 헤더에 붙인다.
- backend의 **CORS는 모든 origin 허용** — API 키 헤더로 인증을 대체.

> 로컬에서 백엔드를 컨테이너 없이 띄울 때는 PORT=22가 SSH와 충돌하므로 4000 등으로 덮어써서 실행한다.

## 보안 / API 키

- 모든 backend API 요청은 헤더 `X-API-Key`로 인증된다.
- 키 값은 `.env`에 보관하며 dev 기본값은 `jinoo0306`.
- 프론트 클라이언트에는 키를 노출하지 않는다 — 반드시 Next.js 서버 측 프록시 경유.

## 데이터 모델 (요약, 자세한 SQL은 `database/init/`)

- `handlers(id, name UNIQUE, created_at, updated_at)` — 담당자
- `task_logs(id, exam_number, task_type ENUM, task_type_other_text, handler_id FK, parent_log_id FK SELF, started_at, ended_at NULL=진행중, ...)`
- `task_type` ENUM: `application_review`, `pre_violation_review`, `result_organization`, `other`
- 재작업 = `parent_log_id`가 set된 새 레코드

## 디자인 가이드

- **톤**: 엔터프라이즈, 고급스러움, 깔끔함. 화려한 색/그라데이션 지양.
- **팔레트**: 중립 회색(slate) 기반 + 절제된 1색 액센트.
- **반응형**: 모바일 사용자 비중이 50% 수준 — 터치 타깃 충분히 크게, 카드 세로 스택 우선.
- shadcn/ui + Tailwind 사용.

## 작업 시 참고

- 각 하위 폴더의 CLAUDE.md를 먼저 보고 시작.
- 새 폴더가 생기면 자동으로 그 폴더에 CLAUDE.md를 만든다 (저장소 규칙).
- 구조/실행 방식 변경 시 관련 CLAUDE.md를 함께 갱신한다.
