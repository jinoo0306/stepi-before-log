# frontend

Next.js (App Router, TypeScript) 프론트엔드. 호스트 머신에서 직접 실행하며 Docker로 띄우지 않는다.

## 스택

- Next.js 15 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui (Radix 기반) + lucide-react 아이콘
- 폼/상태: 표준 React `useState` + `fetch` (가벼우므로 react-query/RHF 미사용)

## 실행

```bash
npm install
cp .env.example .env.local   # 로컬 개발용 (Next.js가 자동 로드)
npm run dev
```

기본 포트 **3000**. 브라우저에서 `http://localhost:3000`.

## 백엔드 연동 (중요)

- 클라이언트 코드는 backend를 직접 호출하지 않는다. 항상 **Next.js Route Handler 프록시**(`/api/*`)를 호출한다.
- 프록시는 `src/app/api/[...path]/route.ts`에서 모든 메서드를 받아 backend로 forward한다.
- 프록시가 서버 측 환경 변수에서 `API_KEY`를 읽어 `X-API-Key` 헤더로 붙인다.
- 따라서 **API 키는 클라이언트 번들에 절대 들어가지 않는다** (`NEXT_PUBLIC_*` 사용 금지).

환경 변수 (모두 서버 측 전용 — 클라이언트 번들에 노출되지 않음):
- `BACKEND_URL` — 로컬: `http://localhost:4000`, 프로덕션: `https://stepilog.donkey.ai.kr`
- `API_KEY` — 예: `jinoo0306`. Vercel에서는 Project Settings → Environment Variables에 등록.

env 파일 규칙 — frontend/ 안에 세 개:
- `.env.example` — 키만 있는 템플릿 (커밋 ✅)
- `.env.local`  — 로컬 개발 시 실제 값 (커밋 ❌, gitignore). Next.js가 자동 로드.
- `.env.vercel` — Vercel 대시보드에 등록할 값 모음 (커밋 ❌, gitignore, 사람용 메모/가이드. Next.js는 자동 로드 안 함)

## 배포

- **Vercel** (`https://stepihr.vercel.app` — 예정).
- 위 두 환경변수를 Vercel 프로젝트에 등록해야 한다. 둘 다 절대 클라이언트 번들에 들어가지 않으니 `NEXT_PUBLIC_*` 접두어 금지.

## 디자인 규칙

- **컬러**: Tailwind `slate` 중심, 액센트는 단일색(현재 `slate-900` 또는 `indigo-600`).
- **간격**: 넉넉한 padding/gap, 모바일에서 16px / 데스크톱에서 24~32px.
- **타이포**: 시스템 sans (Geist 또는 Inter 변형).
- **반응형**: 모바일 first. 카드 1열 → md 이상에서 2열. 폼은 항상 1열.
- 그림자/보더는 절제 — `border border-slate-200 shadow-sm` 정도.

## 라우트

- `/` — 메인 (탭 3개: 업무 시작/진행중/완료 내역)
- `/table` — 데이터 워크벤치. 모든 DB 테이블을 그리드로 보여주고 CSV/XLSX로 내보낸다.

## 주요 컴포넌트

- `src/app/page.tsx` — 메인 (탭 3개 컨테이너)
- `src/app/table/page.tsx` — 워크벤치 페이지 (CRUD + 필터 + 정렬 + CSV/XLSX). 필터/정렬은 클라이언트 측. 단일 컬럼 PK가 없는 테이블은 편집 UI가 노출되지 않음.
- `src/components/row-form-dialog.tsx` — 행 추가/수정 폼. 컬럼별 type-aware input(integer/numeric은 number, 그 외 text), NULL 토글(nullable 컬럼만), PK는 수정 시 read-only.
- `src/components/start-task-form.tsx` — 업무 시작 폼
- `src/components/in-progress-list.tsx` — 진행중 목록 + 종료 버튼
- `src/components/completed-list.tsx` — 완료 내역 + 재작업 버튼
- `src/components/handler-select.tsx` — 담당자 드롭다운 (+ 추가/수정/삭제)
- `src/components/duplicate-confirm-dialog.tsx` — 중복 시작 확인 모달
- `src/lib/export.ts` — CSV / XLSX 다운로드 유틸 (xlsx는 dynamic import로 지연 로딩)

## 작업 규칙

- 새 API 엔드포인트는 backend에 먼저 만들고, 프록시는 catch-all이라 자동 forward된다.
- 클라이언트에서 시간 표시: 초 단위 누적은 `setInterval`로 1초마다 업데이트.
