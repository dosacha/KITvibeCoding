# UnitFlow AI MVP

학생 진단, 목표 대학 기준 점수 격차 계산, 맞춤 학습 전략 제안을 위한 교육 AI 서비스다.

## 공식 실행 경로

- 백엔드: `apps/api`
- 프런트엔드: `apps/frontend`

현재 공식 프런트엔드는 `apps/frontend` 하나다.

## 저장소 구조

```text
apps/
  api/        FastAPI 기반 백엔드
  frontend/   Vite + React 기반 프런트엔드
scripts/
  demo_smoke_check.ps1
```

## 핵심 기능

- 역할 기반 로그인
- 학생별 취약 유형 진단
- 목표 대학 기준 점수 격차 계산
- 학생 맞춤 학습 전략 제안
- 강사용 학생 요약 대시보드
- 시험 등록, 수정, 문항 등록
- 학생 결과 입력과 전략 재계산
- 대학 정책 조회, 등록, 수정

## 환경 변수

루트의 `.env.example` 기준.

```env
APP_ENV=development
DATABASE_URL=sqlite:///./unitflow.db
AUTO_CREATE_SCHEMA=false

# 운영 권장 예시
# DATABASE_URL=postgresql+psycopg://unitflow:unitflow@localhost:5432/unitflow

JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
UNITFLOW_API_BASE_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000
```

## 데이터베이스 운영 원칙

- 로컬 빠른 실행 기본값은 SQLite
- 운영 권장 데이터베이스는 PostgreSQL
- 서버 기동 시 자동 스키마 생성은 기본 비활성화
- 스키마 생성과 초기 데이터 적재는 명시적 명령으로 처리

## 백엔드 실행

```powershell
cd apps/api
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\..\.env.example .env
pip uninstall -y bcrypt
pip install bcrypt==4.0.1
python manage_db.py seed
python -m uvicorn app.main:app --reload
```

스키마만 만들고 싶을 때:

```powershell
cd apps/api
python manage_db.py init
```

스키마만 초기화하고 싶을 때:

```powershell
cd apps/api
python manage_db.py reset
```

## 프런트엔드 실행

```powershell
cd apps/frontend
npm install
npm run dev
```

브라우저 주소:

- `http://127.0.0.1:5173`

## 테스트 계정

- 관리자: `admin@unitflow.ai` / `password123`
- 강사: `instructor@unitflow.ai` / `password123`
- 학생: `student@unitflow.ai` / `password123`

## 주요 API

인증:

- `POST /auth/login`
- `GET /auth/me`

프런트 화면용 데이터:

- `GET /frontend/dashboard/instructor`
- `GET /frontend/dashboard/student`
- `GET /frontend/students`
- `GET /frontend/students/{student_id}`
- `GET /frontend/exams`
- `GET /frontend/metadata`

운영 CRUD:

- `GET /exams`
- `POST /exams`
- `PUT /exams/{exam_id}`
- `GET /exams/{exam_id}/questions`
- `POST /questions`
- `PUT /questions/{question_id}`
- `GET /students/{student_profile_id}/results`
- `POST /student-results`
- `POST /students/{student_profile_id}/recalculate`
- `GET /universities/policies`
- `POST /universities/policies`
- `PUT /universities/policies/{policy_id}`

## 검증 명령

백엔드 검증:

```powershell
cd apps/api
python -m compileall app tests
.\.venv\Scripts\python.exe -m pytest tests\test_domain_services.py tests\test_engines.py tests\test_frontend_adapter.py tests\test_frontend_schemas.py tests\test_university_policy_services.py
```

프런트엔드 빌드 검증:

```powershell
cd apps/frontend
npm run build
```

빠른 점검:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo_smoke_check.ps1
```

## 데모 흐름

강사 흐름:

1. 강사 계정 로그인
2. 강사용 요약 확인
3. 학생 목록 진입
4. 학생 상세 진입
5. 학생 결과 입력
6. 전략 다시 계산 확인
7. 시험 관리에서 시험과 문항 등록
8. 목표 대학 정책 화면에서 정책 등록 또는 수정

학생 흐름:

1. 학생 계정 로그인
2. 나의 학습 전략 확인
3. 진단 근거 확인
4. 우선 보완 과목과 단원 확인
