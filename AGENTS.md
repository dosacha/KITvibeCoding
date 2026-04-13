# AGENTS.md

## Mission

UnitFlow AI의 폐쇄형 베타를 배포 가능한 수준으로 완성한다. 제품의 본체는 OCR이나 일반 운영 대시보드가 아니라 **AI 진단 + 목표대학 맞춤 학습 전략**이다. 학생 경험을 1순위, 강사 검토/승인을 2순위, admin 거버넌스를 3순위로 둔다. 계획이나 placeholder에서 멈추지 말고, 동작하는 코드, 마이그레이션, 테스트, seed/demo 데이터, 문서를 함께 갱신한다.

## Hard Rules

- 스택을 갈아엎거나 새 프로젝트로 재작성하지 않는다.
- 현재 스택을 유지한다: FastAPI + SQLAlchemy + Vite/React.
- 기존 API를 깨지 않는 additive change를 우선한다.
- 폐쇄형 베타 범위의 placeholder 화면은 허용하지 않는다.
- 추천은 설명 가능해야 하며 deterministic signal/evidence와 연결되어야 한다.
- 학생 화면 문구는 낙인형, 공개 비교형 표현을 피한다.
- 학생 draft는 공식 승인 전략을 직접 덮어쓰지 않는다.
- admin 전용 영역은 admin 전용으로 유지한다.
- 학생 데이터는 본인, 담당 강사, admin 범위를 벗어나 노출하지 않는다.

## Repository Guidance

- 기존 service layer, frontend adapter, `useAsyncData`, `apiRequest`, `Layout`, `SectionCard`, `MetricCard`, `StatusBadge` 패턴을 재사용한다.
- 큰 작업 지시는 `docs/` 아래 문서로 관리하고, AGENTS는 간결하게 유지한다.
- 동작이 바뀌면 `README.md`, `.env.example`, Alembic migration, seed/demo data, tests를 함께 갱신한다.

## Closed Beta Must-Pass Scope

### Student Loop

- Student home: 오늘의 핵심 할 일, 수시/정시 방향성, 목표대학 gap, 주간 전략 요약, low-confidence 보완 CTA
- Diagnosis detail: 취약 유형, 약한 과목/단원, evidence/signals, study recipes, low-confidence 보완 흐름
- Strategy workspace: AI 기본안, AI 보수안, 현재 승인본, 학생 draft, diff, review timeline
- Weekly planner: 주간 계획 생성, 일별/과목별 체크리스트, 완료 체크, 수행 시간, 이월, 주간 회고
- Growth report: 점수 추이, 목표대학 gap 감소 추이, 취약 유형 변화, 안정성 변화, 실행률 변화
- What-if simulator: 점수 변화, 학습시간 변화, 목표대학 변경, 우선순위/전략 변화

### Instructor Loop

- 시험/문항 CRUD
- 단원 가중치 편집
- 학생 결과 입력 및 CSV 업로드
- 결과 변경 후 재계산
- AI 기본안 / 보수안 / 학생 draft / 승인본 비교
- 승인 / 보류 / 수정 요청
- 학생용 코칭 메시지와 내부 메모 분리

### Admin / Governance

- 대학 정책 CRUD
- 감사 로그, 변경 이력, 재계산 작업
- role 기반 접근 제어

### Operational Hardening

- PostgreSQL 지원
- Alembic migration end-to-end
- seed/demo data
- 최신 `.env.example` 및 README
- health check endpoint
- structured logging
- closed beta operations guide

## Explicit No-Go Conditions

폐쇄형 베타는 아래 중 하나라도 남아 있으면 완료가 아니다.

- 학생 핵심 페이지가 placeholder/empty-state only 상태
- 학생 핵심 경로 runtime error
- 승인본과 draft 전략 혼동
- 추천 근거/evidence 누락
- PostgreSQL + Alembic + seed + build + tests 중 하나라도 실패
- cross-student data leak
- instructor가 admin-only 기능에 접근 가능

## Commands That Must Pass

### Backend

```bash
cd apps/api
alembic upgrade head
python manage_db.py seed
pytest -q
python -m uvicorn app.main:app --reload
```

### Frontend

```bash
cd apps/frontend
npm install
npm run build
npm run dev
```

## Delivery Expectations

작업 보고에는 다음을 포함한다.

1. 현재 단계
2. 방금 한 작업
3. 생성/수정한 파일
4. 핵심 코드 또는 설계 설명
5. 남은 작업
6. 실행/테스트 방법

## Linked Document

Read and satisfy: `docs/CLOSED_BETA_GO_NO_GO_CHECKLIST.md`
