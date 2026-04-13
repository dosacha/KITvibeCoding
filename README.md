# UnitFlow AI

학생이 본인 진단을 이해하고 목표대학에 맞춰 오늘의 실행 전략을 직접 조정하는 설명 가능한 학습 전략 MVP다. 강사 검토와 admin 거버넌스는 학생 루프를 안전하게 보정하는 보조 흐름이다.

## 공식 실행 경로

- 백엔드: `apps/api`
- 프런트엔드: `apps/frontend`

클론 직후에는 백엔드 가상환경과 프런트 의존성이 없으므로 아래 순서대로 한 번 설치해야 한다.

## 사전 준비

- Python 3.13 권장
- Node.js 20 이상 권장
- Windows PowerShell 기준 명령 제공

Python 버전 확인:

```powershell
py -0p
```

`Python 3.14`로 백엔드 가상환경을 만들면 일부 패키지와 테스트에서 문제가 날 수 있다. 가능하면 `py -3.13`을 사용한다.

## 다른 로컬에서 처음 실행

새 PC나 다른 폴더에서 처음 실행할 때는 clone부터 시작한다. 아래 예시는 Windows PowerShell 기준이다.

```powershell
cd C:\Users\dosac\projects
git clone https://github.com/dosacha/KITvibeCoding.git
cd KITvibeCoding
```

백엔드 준비:

```powershell
cd apps\api
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python manage_db.py upgrade
python manage_db.py seed
python -m uvicorn app.main:app --reload
```

다른 PowerShell 창에서 프런트 준비:

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\frontend
npm.cmd ci --registry=https://registry.npmjs.org --no-audit --no-fund
npm.cmd run dev
```

접속 주소:

```text
프런트: http://localhost:5173
백엔드: http://127.0.0.1:8000
API 문서: http://127.0.0.1:8000/docs
```

처음 실행 후 로그인은 아래 데모 계정을 사용한다.

```text
admin@unitflow.ai / password123
instructor@unitflow.ai / password123
student@unitflow.ai / password123
```

주의: 기존 DB가 없는 새 로컬에서는 `python manage_db.py upgrade`로 Alembic 마이그레이션을 먼저 적용한 뒤 `python manage_db.py seed`를 실행한다. 이미 로컬 DB가 있고 데이터를 유지해야 한다면 `reset`이나 DB 파일 삭제를 하지 않는다.

## 1. 백엔드 처음 실행

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\api
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
copy .env.example .env
python manage_db.py seed
python -m uvicorn app.main:app --reload
```

백엔드 주소:

```text
http://127.0.0.1:8000
```

정상 확인:

```powershell
curl http://127.0.0.1:8000/health
```

정상 응답:

```json
{"status":"ok","environment":"development","database":"ok"}
```

## 2. 프런트엔드 처음 실행

새 PowerShell 창에서 실행한다.

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\frontend
npm.cmd ci --registry=https://registry.npmjs.org --no-audit --no-fund
npm.cmd run dev
```

프런트 주소:

```text
http://127.0.0.1:5173
```

## 3. 다음 실행부터

백엔드 의존성 설치와 프런트 의존성 설치는 처음 한 번만 필요하다.

백엔드:

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\api
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

프런트:

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\frontend
npm.cmd run dev
```

DB를 초기화하고 예시 데이터를 다시 넣고 싶을 때만 실행한다.

```powershell
cd C:\Users\dosac\projects\KITvibeCoding\apps\api
.\.venv\Scripts\Activate.ps1
python manage_db.py seed
```

## 테스트 계정

- 관리자: `admin@unitflow.ai` / `password123`
- 강사: `instructor@unitflow.ai` / `password123`
- 학생: `student@unitflow.ai` / `password123`

## 주요 기능

- 역할 기반 로그인
- 학생 홈: 오늘의 핵심 할 일, 수시/정시 방향성, 목표대학 gap, 주간 전략 요약, low-confidence 보완 CTA
- 학생 오늘의 핵심 할 일 직접 저장, 완료 토글, deterministic 추천 replace/append
- 학생 목표대학 직접 변경과 변경 후 gap/전략/보완 CTA 갱신
- 진단 상세: 취약 유형, 약한 과목/단원, evidence/signals, 학습 recipe
- 전략 설계실: AI 기본안, AI 보수안, 내 초안, 강사 승인본, diff, 검토 타임라인, AI/강사 선택 대화
- 주간 플래너: 계획 생성, 일별 체크리스트, 완료/수행 시간 기록, 다시 만들기 diff, 회고 기반 조정안
- 성장 리포트: 점수 추이, 목표대학 gap 변화, 취약 유형 변화, 안정성/실행률 변화
- What-if 시뮬레이터: 점수 변화, 학습시간 변화, 방향 가정에 따른 gap·위험도·우선순위·시간 배분 비교
- 학생 공유 시험: 검색, 생성, 답안 제출, 정답률/선택률/내 선택 비교
- 강사 보조 흐름: 시험/문항/결과/CSV 입력, 재계산, 학생 초안·AI안·승인본 비교, 승인/보류/수정 요청
- admin 거버넌스: 목표대학 정책 CRUD, 감사 로그, 변경 이력, 재계산 작업, role 기반 접근 제어
- 전략 설명 생성기: deterministic 전략 결과를 학생용 코칭 문장과 강사용 설명으로 변환

## 주요 API

인증:

- `POST /auth/login`
- `GET /auth/me`

프런트 화면 데이터:

- `GET /frontend/dashboard/instructor`
- `GET /frontend/dashboard/student`
- `GET /frontend/student/home`
- `PUT /frontend/student/home/today-focus`
- `POST /frontend/student/home/today-focus/recommend`
- `GET /frontend/student/diagnosis`
- `GET /frontend/student/goal-gap`
- `GET /frontend/student/admission-direction`
- `GET /frontend/student/study-recipes`
- `GET /frontend/student/strategy-workspace`
- `POST /frontend/student/strategy-workspace`
- `PUT /frontend/student/strategy-workspace`
- `POST /frontend/student/strategy-workspace/recommend`
- `POST /frontend/student/strategy-workspace/submit`
- `GET /frontend/student/strategy-workspace/timeline`
- `GET /frontend/student/strategy-chat`
- `POST /frontend/student/strategy-chat/messages`
- `DELETE /frontend/student/strategy-chat/messages/{message_id}`
- `DELETE /frontend/student/strategy-chat/thread/{thread_id}`
- `GET /frontend/student/planner`
- `POST /frontend/student/planner/generate`
- `POST /frontend/student/planner/{plan_id}/regenerate`
- `POST /frontend/student/planner/items/{item_id}/check`
- `PATCH /frontend/student/planner/items/{item_id}`
- `POST /frontend/student/planner/{plan_id}/reflection`
- `GET /frontend/student/growth`
- `POST /frontend/student/simulations/goal-scenario`
- `GET /frontend/student/onboarding`
- `PUT /frontend/student/onboarding/profile`
- `PUT /frontend/student/onboarding/goals`
- `POST /frontend/student/onboarding/habits`
- `GET /frontend/student/community-exams`
- `POST /frontend/student/community-exams`
- `GET /frontend/student/community-exams/{exam_id}`
- `POST /frontend/student/community-exams/{exam_id}/submissions`
- `GET /frontend/student/community-exams/{exam_id}/stats`
- `GET /frontend/students/{student_id}`
- `GET /frontend/students/{student_id}/strategy-options`
- `GET /frontend/instructor/students/{student_id}/strategy-review`
- `GET /frontend/instructor/students/{student_id}/strategy-chat`
- `POST /frontend/instructor/students/{student_id}/strategy-chat/messages`
- `POST /frontend/strategy-workspaces/{workspace_id}/reviews`
- `GET /frontend/exams`
- `GET /frontend/exams/{exam_id}`
- `GET /frontend/exams/{exam_id}/result-entry`
- `GET /frontend/universities/policies`

운영 입력:

- `POST /exams`
- `PUT /exams/{exam_id}`
- `POST /questions`
- `PUT /questions/{question_id}`
- `POST /student-results`
- `POST /student-results/upload-csv`
- `POST /students/{student_id}/recalculate`
- `POST /strategies/{strategy_id}/reviews`
- `POST /universities/policies`
- `PUT /universities/policies/{policy_id}`

운영 로그:

- `GET /audit-logs`
- `GET /change-history`
- `GET /recalculation-jobs`

## 검증 명령

백엔드:

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
python -m pytest tests
```

현재 통과 기준:

```text
49 passed
```

프런트:

```powershell
cd apps/frontend
npm.cmd ci --registry=https://registry.npmjs.org --no-audit --no-fund
npm.cmd run build
npm.cmd run test
```

현재 통과 기준:

```text
프런트 빌드 통과
17 tests passed
```

## 환경 변수

백엔드는 `apps/api/.env.example`을 `apps/api/.env`로 복사해서 사용한다.

프런트는 `apps/frontend/.env.example`을 기준으로 `VITE_API_BASE_URL`을 설정한다.

기본 로컬 값:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 문제 해결

### `Activate.ps1`을 찾을 수 없음

백엔드 가상환경이 아직 없는 상태다.

```powershell
cd apps/api
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### `No module named sqlalchemy` 또는 `No module named uvicorn`

가상환경을 활성화하지 않았거나 의존성을 설치하지 않은 상태다.

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### `vite`를 찾을 수 없음

프런트 의존성이 설치되지 않은 상태다.

```powershell
cd apps/frontend
npm.cmd ci --registry=https://registry.npmjs.org --no-audit --no-fund
```

### npm 설치가 내부 레지스트리에서 멈춤

현재 `package-lock.json`은 공개 npm registry 기준으로 정리되어 있다. 그래도 문제가 나면 아래 명령으로 실행한다.

```powershell
npm.cmd ci --registry=https://registry.npmjs.org --no-audit --no-fund
```

## 운영 메모

- 로컬 개발 기본 DB는 SQLite다.
- 폐쇄형 베타/스테이징은 PostgreSQL 기준으로 실행한다.
- PostgreSQL URL 예시는 `postgresql+psycopg://unitflow:unitflow@localhost:5432/unitflow` 이다.
- 운영 DB에는 `python manage_db.py upgrade`로 Alembic 마이그레이션을 적용하고, 데모 환경에는 `python manage_db.py seed`로 샘플 계정을 주입한다.
- `APP_ENV=production`에서는 SQLite 사용을 피한다.
- 요청 로그는 JSON line 형태로 출력되며 `LOG_LEVEL`로 조정한다.
- LLM 호출은 선택 사항이며, API 키가 없어도 deterministic fallback 전략 설명이 동작한다.

## 가장 빠른 배포 루트

해커톤 데모용 공개 링크는 아래 조합이 가장 빠르다.

- Backend: Render Web Service
- Database: Render PostgreSQL
- Frontend: Vercel

레포에는 빠른 배포를 위한 설정이 포함되어 있다.

- `render.yaml`: Render 백엔드와 PostgreSQL 생성
- `apps/frontend/vercel.json`: Vercel SPA 라우팅 설정
- `docs/deployment-fast-path.md`: 실제 클릭 순서와 환경변수 체크리스트

배포 핵심 환경변수:

```env
# Render backend
APP_ENV=production
DATABASE_URL=<Render PostgreSQL URL>
AUTO_CREATE_SCHEMA=false
JWT_SECRET=<강한 랜덤 문자열>
CORS_ORIGINS=https://<vercel-domain>
CORS_ORIGIN_REGEX=
OPENAI_API_KEY=

# Vercel frontend
VITE_API_BASE_URL=https://<render-api-domain>
```

전체 순서:

1. GitHub `main`에 push한다.
2. Render에서 Blueprint로 `render.yaml`을 배포한다.
3. Render API의 `/health`가 `database: ok`인지 확인한다.
4. Vercel에서 `apps/frontend`를 Root Directory로 배포한다.
5. Vercel 도메인을 Render의 `CORS_ORIGINS`에 넣고 백엔드를 재배포한다.
6. Render Shell에서 데모 계정이 필요하면 `python manage_db.py seed`를 한 번 실행한다.

자세한 절차는 `docs/deployment-fast-path.md`를 따른다.

## 전략 설명 생성기

UnitFlow AI의 전략 계산은 deterministic engine이 담당한다. LLM은 취약 유형, 목표대학 gap, 과목 우선순위, 주간 시간 배분, 단원 순서, 위험 요인을 바꾸지 않고 설명 문장만 생성한다.

설명 출력은 항상 같은 shape를 가진다.

```json
{
  "summary": "string",
  "student_coaching": "string",
  "instructor_explanation": "string",
  "rationale_bullets": [{"label": "string", "detail": "string"}],
  "risk_translation": [{"label": "string", "detail": "string"}],
  "next_check_in_message": "string",
  "explanation_source": "llm",
  "explanation_model": "gpt-5.4-mini",
  "explanation_generated_at": "2026-04-13T00:00:00"
}
```

`OPENAI_API_KEY`가 없거나, `OPENAI_STRATEGY_EXPLANATION_ENABLED=false`이거나, 네트워크/timeout/API 오류가 발생하면 같은 shape로 deterministic fallback이 반환된다. 이때 `explanation_source`는 `deterministic_fallback`, `explanation_model`은 `null`이다.

LLM 설명 생성 활성화:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_STRATEGY_EXPLANATION_ENABLED=true
OPENAI_STRATEGY_EXPLANATION_TIMEOUT_SECONDS=8
```

관찰 가능성:

- `strategy_explanation_generated`: OpenAI 호출 성공/실패, source, model, error type/message, latency 기록
- `strategy_explanation_finalized`: 최종 설명 source 기록
- `strategy_explanation_persisted`: DB에 저장된 strategy id 기준 source 기록

해커톤 데모에서는 강사 전략 비교 응답의 `explanation_source`로 LLM 설명인지 fallback 설명인지 확인할 수 있다.

## 폐쇄형 베타 데모 흐름

1. 학생으로 로그인해 홈에서 오늘의 핵심 할 일, 방향성, 목표대학 gap, low-confidence CTA를 확인한다.
2. 학생이 오늘의 핵심 할 일을 직접 편집하고 AI 추천을 replace/append로 반영한 뒤 새로고침 후 유지되는지 확인한다.
3. 학생이 목표대학을 변경하고 goal gap, student-visible strategy, 보완 CTA가 즉시 갱신되는지 확인한다.
4. 학생이 진단 상세에서 취약 유형, evidence/signals, 학습 recipe를 확인한다.
5. 학생이 전략 설계실에서 내 초안, 강사 승인본, AI 기본안, AI 보수안을 비교하고 AI 추천으로 바뀐 필드를 확인한 뒤 검토 요청을 보낸다.
6. 학생이 주간 플래너를 생성하고 완료/수행 시간을 기록한 다음 다시 만들기 diff와 회고 저장 결과를 확인한다.
7. 학생이 What-if 시뮬레이터에서 수학 +3점, 주간 +4시간, 방향 가정을 바꿔 gap·위험도·우선순위·시간 배분 변화를 확인한다.
8. 학생이 공유 시험을 검색/생성하고 답안을 제출한 뒤 2명 이상 제출 기준 선택률·정답률·내 선택 비교를 확인한다.
9. 강사로 로그인해 학생 초안, AI안, 승인본 diff를 보고 승인, 보류, 수정 요청 중 하나를 선택한다.
10. 관리자로 로그인해 대학 정책, 감사 로그, 변경 이력, 재계산 작업을 확인한다.

상세 운영 절차는 `docs/beta-operations-guide.md`를 기준으로 한다.
