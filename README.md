# UnitFlow AI

한국 중고등학생, 학원 강사, 학원 운영자를 위한 설명 가능한 학습 진단 및 목표 대학 맞춤 전략 MVP다.

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
- 강사용 대시보드
- 학생별 취약 유형 진단
- 단원별 이해도와 문항 통계
- 시험, 문항, 결과 입력
- CSV 업로드
- 목표 대학 정책 관리
- 학생별 전략 비교와 강사 승인
- 학생 자기주도 전략 draft와 coach-approved 전략 분리
- 학생 오늘의 핵심 할 일 저장/추천
- 학생 목표대학 직접 변경
- 전략 설계실 학생/강사/AI 대화
- 학생 공유 시험과 선지 선택률/정답률
- 주간 플래너 재생성/회고 기반 조정안
- 전략 설명 생성기: deterministic 전략 결과를 학생용 코칭 문장과 강사용 설명으로 변환
- 감사 로그, 변경 이력, 재계산 작업 조회

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

1. 관리자로 로그인해 대학 정책과 감사/재계산 작업을 확인한다.
2. 강사로 로그인해 시험, 문항, 학생 결과 또는 CSV 업로드를 입력하고 학생 재계산을 실행한다.
3. 학생으로 로그인해 온보딩, 방향성, 목표대학 gap, 진단 상세, 학습 레시피를 확인한다.
4. 학생이 전략 설계실에서 AI 기본안/보수안과 승인본을 비교하고 수정안을 저장한 뒤 검토 요청을 보낸다.
5. 강사가 학생 전략 검토 화면에서 AI안/학생 수정안/승인본 diff를 보고 승인, 보류, 수정 요청 중 하나를 선택한다.
6. 학생이 승인 전략을 기준으로 주간 플래너를 생성하고 체크/회고를 남긴다.
7. 학생이 성장 리포트와 What-if 시뮬레이션으로 다음 조정 포인트를 확인한다.

상세 운영 절차는 `docs/beta-operations-guide.md`를 기준으로 한다.
