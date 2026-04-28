# stepi-before-log

채용 과정 작업 시간 측정 도구. 채용 담당자가 수험번호별로 업무를 시작/종료하며 시간을 기록한다.

## 도메인 요약

- **수험번호별로 업무 단위 타이머를 기록**한다. 수험번호 형식 검증은 하지 않음 (예: `0068-000001`).
- 업무 종류는 6가지: 지원서 검토, 자격 검토, 자기소개서 위배 검토, 섭외 위배 검토, 결과 정리, 기타(자유 텍스트). 가운데 셋(자격/자기소개서/섭외)은 옛 "사전위배 검토"의 세부 유형이다.
- 담당자는 DB의 `handlers` 테이블에서 드롭다운으로 선택. 초기 시드는 `남지영` 1명.
- 같은 수험번호+업무를 다른 담당자가 이미 했거나 진행 중일 때 새 타이머를 시작하면 **확인 모달**을 띄우고, 사용자가 "예"를 누르면 중복 기록을 허용한다.
- 완료된 기록에 대해 **재작업**(re-work)을 시작하면 원본을 부모로 가지는 **새 레코드**가 만들어진다 — 원본은 그대로 보존한다.

## 화면

메인 (`/`) — 탭 3개:
1. **업무 시작**: 수험번호/업무종류/담당자 입력 → 타이머 시작
2. **진행중**: `ended_at IS NULL`인 레코드 목록, **일시정지/재개** 토글 버튼 + 종료 버튼
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
- **backend**: Docker 컨테이너. 호스트 **127.0.0.1:4000**에만 바인딩(외부 직노출 금지). 프로덕션 URL `https://stepilog.donkey.ai.kr`은 같은 호스트의 nginx가 `127.0.0.1:4000`으로 프록시. TLS는 Let's Encrypt(certbot --nginx)로 발급/갱신.
- **database**: Docker 컨테이너. 호스트 **127.0.0.1:5432**에만 바인딩(로컬 GUI 툴용, 외부 직노출 금지).
- backend ↔ database는 Docker 네트워크 내부에서 서비스명(`database`)으로 통신.
- frontend → backend는 **브라우저에서 직접 fetch** (`NEXT_PUBLIC_BACKEND_URL` 사용). API 키도 클라이언트가 헤더로 붙임 (`NEXT_PUBLIC_API_KEY`). 옛 Next.js Route Handler 프록시는 제거됨 — Vercel에서 fetch method 손실 이슈가 있었고 이 도구의 보안 요구를 정당화 못 함.
- backend의 **CORS는 모든 origin 허용** — API 키 헤더로 인증을 대체.
- **API 문서**: Swagger UI는 `/docs`(`https://stepilog.donkey.ai.kr/docs`), OpenAPI JSON은 `/docs.json`. 인증 불필요.

> 호스트 22번 포트는 sshd가 점유. backend는 호스트 4000번으로 publish하고 도메인은 외부 프록시에서 매핑한다.

## 보안 / API 키

- 모든 backend API 요청은 헤더 `X-API-Key`로 인증된다.
- **시크릿(API_KEY, POSTGRES_PASSWORD)은 저장소 루트 `.env`에서만 관리** — `.env`는 `.gitignore`로 커밋 차단. 템플릿은 `.env.example`.
- `docker-compose.yml`은 `${API_KEY:?...}`, `${POSTGRES_PASSWORD:?...}` 형태로 .env에서 주입받으며 값이 비면 기동 실패한다.
- dev 기본값은 `.env.example` 그대로 (`API_KEY=jinoo0306` 등).
- 프론트 클라이언트에는 키를 노출하지 않는다 — 반드시 Next.js 서버 측 프록시 경유.

## 데이터 모델 (요약, 자세한 SQL은 `database/init/`)

- `handlers(id, name UNIQUE, created_at, updated_at)` — 담당자
- `task_logs(id, exam_number, task_type ENUM, task_type_other_text, handler_id FK, parent_log_id FK SELF, started_at, ended_at NULL=진행중, ...)`
- `task_type` ENUM: `application_review`, `qualification_review`, `self_intro_violation_review`, `outreach_violation_review`, `result_organization`, `other`
- 일시정지: `task_logs.paused_at` (NULL=정상 진행, 값 있음=일시정지 중) + `total_paused_seconds` 누적. 종료 시 진행 중이던 일시정지 구간도 누적에 합쳐 종료한다. 표시되는 `duration_seconds`는 일시정지 시간이 빠진 실제 작업 시간.
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
