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
{"status":"ok"}
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
- 학생에게 승인된 전략만 노출
- 감사 로그, 변경 이력, 재계산 작업 조회

## 주요 API

인증:

- `POST /auth/login`
- `GET /auth/me`

프런트 화면 데이터:

- `GET /frontend/dashboard/instructor`
- `GET /frontend/dashboard/student`
- `GET /frontend/students/{student_id}`
- `GET /frontend/students/{student_id}/strategy-options`
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
27 passed
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
- 운영 환경에서는 PostgreSQL 사용을 권장한다.
- `APP_ENV=production`에서는 SQLite 사용을 피한다.
- LLM 호출은 선택 사항이며, API 키가 없어도 deterministic fallback 전략이 동작한다.
