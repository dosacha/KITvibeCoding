# UnitFlow AI MVP

설명 가능한 진단과 목표 대학 기준 맞춤 전략 생성을 중심으로 구성한 교육 AI MVP.

## 저장소 구조

```text
apps/
  api/        FastAPI 기반 백엔드
  frontend/   실제 실행 프런트엔드
```

## 핵심 범위

- 역할 기반 권한 관리
  - `admin`
  - `instructor`
  - `student`
- 학원 도메인 기본 구조
  - academy
  - class group
  - subject
  - unit
  - exam
  - question
  - student result
  - target university profile
  - university score policy
- 학생 분석 기능
  - 취약 유형 진단
  - 단원 이해도 계산
  - 시험 추세 계산
  - 점수 상승률 계산
  - 학습 안정성 계산
- 전략 생성 기능
  - 목표 대학 반영 규칙 기반 갭 계산
  - 과목 우선순위 산출
  - 시간 배분 추천
  - 코칭 포인트 제안
- 운영 기능
  - 감사 로그
  - 변경 이력
  - 재계산 구조
  - seed 데이터

## 기술 스택

- Backend: FastAPI
- Frontend: 단일 실행 파일 기반 `apps/frontend/web.js`
- Database: SQLite 기본 설정
- Validation: Pydantic
- ORM: SQLAlchemy

## 환경 변수

루트의 `.env.example` 기준.

```env
DATABASE_URL=sqlite:///./unitflow.db
JWT_SECRET=change-me
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 백엔드 실행

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\..\.env.example .env
python -m app.seed
uvicorn app.main:app --reload
```

권장 Python 버전:

- `3.12`
- `3.13`

주의:

- 현재 로컬 Python이 `3.14.x`이면 일부 패키지 설치 호환성 문제가 날 수 있음

## 프런트엔드 실행

현재 프런트엔드는 `apps/web`가 아니라 `apps/frontend/web.js` 기준으로 작업 중.

실행 방식은 이 저장소의 프런트 실행 환경에 맞춰 `apps/frontend/web.js`를 로드하면 됨.

백엔드 연동 기준:

- API Base URL: `http://localhost:8000`
- 프런트 전용 API Prefix: `/frontend`

## 데모 계정

프런트엔드 전용 로그인 계정:

- `admin@unitflow.ai` / `demo1234`
- `instructor@unitflow.ai` / `demo1234`
- `student@unitflow.ai` / `demo1234`

백엔드 기본 예시 계정:

- `admin@unitflow.ai` / `password123`
- `instructor@unitflow.ai` / `password123`
- `student@unitflow.ai` / `password123`

프런트 로그인 화면은 `/frontend/login` 경로 응답 기준 사용.

## 주요 API

인증:

- `POST /frontend/login`
- `GET /frontend/me`
- `GET /auth/me`

프런트 전용 조회:

- `GET /frontend/dashboard/instructor`
- `GET /frontend/dashboard/student`
- `GET /frontend/students`
- `GET /frontend/students/{student_id}`
- `GET /frontend/exams`
- `GET /frontend/metadata`
- `GET /frontend/universities`

프런트 전용 입력:

- `POST /frontend/exams`

도메인/운영 API:

- `GET /students`
- `GET /exams`
- `POST /exams`

## 데모 흐름

1. 백엔드 실행
2. seed 데이터 적재
3. 프런트에서 강사 계정 로그인
4. 강사용 대시보드 확인
5. 학생 목록 진입
6. 학생 상세 진입
7. 대학 정책 확인
8. 시험 관리 화면에서 시험 생성

## 테스트

백엔드 소스 검증:

```bash
cd apps/api
python -m compileall app tests
```

프런트 소스 검증:

```bash
node --check apps/frontend/web.js
```

포함된 테스트 범위:

- 진단 엔진
- 전략 엔진
- 도메인 쓰기 경로 운영 이력
- frontend metadata 어댑터
- frontend exam create 스키마 검증

## 현재 상태

- 백엔드 핵심 기능 구현 완료 수준
- `apps/frontend` 기준 주요 실연동 완료 수준
- 현재 단계는 마감 정리와 최종 데모 품질 보강 중심
