# UnitFlow AI MVP

설명 가능한 진단과 목표 대학 맞춤 전략 생성을 중심에 둔 교육 AI MVP.

## 저장소 구조

```text
apps/
  api/   FastAPI 기반 서버
  web/   Next.js 기반 웹 화면
```

## MVP 범위

- `admin`, `instructor`, `student` 역할 기반 접근 제어
- 학원 도메인 구조: academy, class group, subject, unit, exam, question, results
- 설명 가능한 분석 지표 계산: 단원 이해도, 점수 추세, 상승률, 안정성, 오답률
- 취약 유형 진단 엔진
- 대학 정책 기반 환산 엔진과 예시 정책 데이터
- 구조화 전략 생성과 근거 설명
- 강사용 대시보드와 학생용 대시보드
- 감사 로그, 수정 이력, 재계산 가능한 서비스 계층

## 구현 원칙

- 분석 우선
- 진단 우선
- 전략 생성 후행
- 설명 가능성 유지
- 하드코딩 최소화
- 운영 이력 기록
- 유지보수성 우선

## 서버 실행

```bash
cd apps/api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy ..\..\.env.example .env
python -m app.seed
uvicorn app.main:app --reload
```

권장 파이썬 버전: `3.12` 또는 `3.13`

현재 로컬 환경 파이썬 버전: `3.14.0`

일부 의존성 휠 미지원 상태 확인.
의존성 설치 실패 가능성 존재.

## 웹 실행

```bash
cd apps/web
npm.cmd install
copy ..\..\.env.example .env.local
npm.cmd run dev
```

## 예시 계정

- `admin@unitflow.ai` / `password123`
- `instructor@unitflow.ai` / `password123`
- `student@unitflow.ai` / `password123`

## 주요 운영 API

- `GET /auth/me`
- `GET /students`
- `GET /exams`
- `POST /exams`

## 공개 예시 API

- `GET /dashboard/demo/instructor`
- `GET /dashboard/demo/student`

## 점검 항목

- 시험 결과 입력 경로 확보
- 학생 목록 조회 경로 확보
- 재계산 API 확보
- 진단 결과 저장 구조 확보
- 전략 결과 저장 구조 확보
- 감사 로그 기록 구조 확보
- 수정 이력 기록 구조 확보
