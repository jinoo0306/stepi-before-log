# database

PostgreSQL 16. Docker 컨테이너로만 실행하며 호스트에 직접 설치하지 않는다.

이 폴더는 컨테이너 초기 스키마/시드 SQL과 영구 볼륨 마운트 지점만 둔다. 애플리케이션 코드는 들어가지 않는다.

## 구성

- `init/` — 컨테이너가 처음 기동될 때(=볼륨이 비어 있을 때) 실행되는 SQL. `/docker-entrypoint-initdb.d`에 마운트된다. 알파벳 순서로 실행되므로 파일명에 번호 prefix를 붙인다.
  - `01_schema.sql` — 테이블/타입/인덱스/시드
- `data/` — 영구 볼륨 마운트 지점. **gitignore 대상**, 커밋 금지.

## 실행

루트 `docker-compose.yml`로 띄운다 (단독 실행도 가능):

```bash
docker compose up database
```

기본 접속 정보 (dev):
- host: `localhost` (호스트에서 접근 시) / `database` (백엔드 컨테이너에서 접근 시)
- port: `5432`
- user / password / db: `stepi` / `stepi` / `stepi`
- 연결 문자열: `postgres://stepi:stepi@localhost:5432/stepi`

## 스키마 정책

- 초기 스키마는 `init/01_schema.sql`에 둔다.
- **이후 변경**: 현재는 컨테이너를 다시 만들어 적용한다 (dev 한정). 운영 적재 후엔 backend 측 마이그레이션 도구 도입 필요.
- `init/` 스크립트는 **볼륨이 이미 있으면 다시 실행되지 않는다.** 변경을 적용하려면 `data/` 볼륨을 삭제해야 한다 — 데이터 손실 주의.

## 데이터 모델

- `handlers` — 담당자. `name`은 UNIQUE.
- `task_logs` — 작업 기록. `ended_at IS NULL`이면 진행중. `parent_log_id`가 채워져 있으면 재작업 세션.
- `task_type` ENUM: `application_review` / `pre_violation_review` / `result_organization` / `other`

자세한 컬럼은 `init/01_schema.sql` 참조.

## 작업 규칙

- 운영용 백업/복원은 이 저장소 범위 밖.
- `data/`는 절대 커밋하지 않는다 (`.gitignore`에 등재).
- 스키마 변경 시 backend의 쿼리도 함께 수정해야 한다.
