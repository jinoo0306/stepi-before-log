# backend

Express.js + TypeScript API 서버. Docker 컨테이너로 실행되며 PostgreSQL과 같은 Docker 네트워크에서 통신한다.

## 스택

- Express 4 + TypeScript
- `pg` (raw 드라이버, ORM 미사용)
- `cors`, `dotenv`
- 개발: `tsx` (watch 모드)
- 빌드: `tsc` → `dist/`

## 배포 / URL

- **프로덕션**: `https://stepilog.donkey.ai.kr` — 외부 리버스 프록시(nginx)에서 호스트 포트 4000으로 라우팅.
- **API 문서 (Swagger UI)**: `https://stepilog.donkey.ai.kr/docs` (인증 불필요), OpenAPI JSON은 `/docs.json`.
- **프론트엔드**: Vercel (`https://stepihr.vercel.app`)에서 호출 → Next.js Route Handler 프록시 → 이 백엔드.

## 실행

루트의 `docker-compose.yml`을 통해 database와 같이 띄운다:

```bash
docker compose up --build
```

로컬에서 컨테이너 없이 디버깅:

```bash
cp .env.example .env
# 기본 PORT=4000, DATABASE_URL host는 컨테이너 외부 실행 시 'localhost'로 설정.
npm install
npm run dev
```

## 환경 변수

- 도커 기동 시 시크릿은 **저장소 루트 `.env`** 에서 가져온다(`POSTGRES_*`, `API_KEY`). `docker-compose.yml`이 `${VAR:?...}` 형태로 주입하므로 값이 비면 기동 실패. 백엔드 컨테이너 안에서는 아래 변수가 보임:
  - `PORT` — 서버 포트. 기본 **4000** (컨테이너/호스트 동일, 호스트는 127.0.0.1에만 바인딩).
  - `DATABASE_URL` — `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}` 형태로 compose가 만들어 넘긴다.
  - `API_KEY` — 헤더 `X-API-Key`와 비교.
- 컨테이너 없이 로컬 디버깅할 때만 `backend/.env`(예시는 `backend/.env.example`)를 따로 둔다 — 그땐 `DATABASE_URL`의 host를 `localhost`로 바꿔야 함.

## CORS

- **모든 origin 허용**. `src/index.ts`에서 `app.use(cors())` (옵션 없음 = `Access-Control-Allow-Origin: *`).
- API 키가 헤더로 보호되므로 origin 제한은 두지 않음. Vercel 어떤 프리뷰 도메인에서도 호출 가능.

## 인증

- `src/middleware/apiKey.ts` 미들웨어가 모든 `/api/*` 라우트에 적용된다.
- 헤더 `X-API-Key`가 `process.env.API_KEY`와 일치하지 않으면 `401`.
- 키 비교는 단순 문자열 비교 (timing attack 방어 미적용 — 사내 도구 수준).

## API 문서 (Swagger)

- `swagger-ui-express`로 `/docs`에 Swagger UI를 띄운다. 스펙은 `src/openapi.ts`(OpenAPI 3.0, 손으로 관리).
- JSON 스펙은 `/docs.json`에서 받을 수 있다.
- `/docs`, `/docs.json`은 API 키 미들웨어 앞단에 마운트되어 인증 없이 열람 가능. 실제 호출은 여전히 `X-API-Key` 필요.
- 라우트 추가/변경 시 `src/openapi.ts`도 함께 수정한다.

## API 엔드포인트

**handlers**
- `GET /api/handlers` — 전체 목록
- `POST /api/handlers` `{ name }` — 추가
- `PATCH /api/handlers/:id` `{ name }` — 이름 수정
- `DELETE /api/handlers/:id` — 삭제 (작업 기록이 참조 중이면 409)

**task_logs**
- `GET /api/task-logs?status=in_progress|completed` — 목록
- `GET /api/task-logs/check?exam_number=X&task_type=Y` — 같은 (수험번호, 업무) 기존 기록 조회 (중복 모달용)
- `POST /api/task-logs` `{ exam_number, task_type, task_type_other_text?, handler_id, parent_log_id? }` — 타이머 시작
- `PATCH /api/task-logs/:id/stop` — 타이머 종료 (`ended_at = NOW()`)

응답에는 항상 handler 이름을 join해서 포함시킨다 (UI에서 추가 호출이 필요 없도록).

**tables (워크벤치 — `/table` 페이지 백엔드)**
- `GET /api/tables` — `[{name, row_count}]`. `information_schema.tables`에서 `public` 스키마의 BASE TABLE만 동적 조회.
- `GET /api/tables/:name/rows` — `{primary_key, columns:[{name,data_type,is_nullable,has_default}], rows:[...]}`. 모든 행 반환(페이지네이션 없음). `primary_key`는 단일 컬럼 PK일 때만 채워지고, 없거나 복합 PK면 `null` → 프런트 편집 UI 비활성화.
- `POST /api/tables/:name/rows` `{values:{col:val,...}}` — 행 추가. 컬럼명은 화이트리스트 검증. 빈 문자열은 NULL로 변환. 기본값 있는 컬럼을 생략하면 DB가 채움.
- `PATCH /api/tables/:name/rows/:pk` `{values:{col:val,...}}` — PK로 수정. PK 컬럼은 자동 제외.
- `DELETE /api/tables/:name/rows/:pk` — 삭제. FK 위반(`23503`) 시 409.
- 테이블명/컬럼명 모두 `^[a-z_][a-z0-9_]*$` 정규식 + `information_schema` 화이트리스트로 이중 검증한 뒤 식별자 인터폴레이션. 값은 `pg` 파라미터화로만 전달. SQL 인젝션 방어.
- 필터링/정렬은 클라이언트 측에서 처리 (서버는 항상 전체 행 반환).

## DB 연결

- 컨테이너 내부에서 host는 서비스명 `database` (NOT `localhost`).
- 풀(`pg.Pool`) 1개를 모듈에서 export해 재사용한다 (`src/db.ts`).

## 디렉터리 구조 (예정)

```
backend/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts            # 부트스트랩
    ├── db.ts               # pg Pool
    ├── middleware/
    │   └── apiKey.ts
    └── routes/
        ├── handlers.ts
        └── taskLogs.ts
```

## 작업 규칙

- 스키마 변경: 현재는 `database/init/`의 SQL을 수정하는 것으로 시작한다 (DB를 새로 띄울 때 적용됨). 운영/장기 보존이 필요해지면 마이그레이션 도구 도입 — 그 시점에 결정.
- 모든 SQL은 파라미터화 쿼리(`$1, $2`)로 작성. 문자열 결합 금지.
- 시크릿은 `.env` 외에 어디에도 두지 않는다.
