# UnitFlow AI MVP 전달 상태

## 현재 상태

- 백엔드 핵심 기능 구현 완료 상태
- `apps/frontend/web.js` 기준 주요 사용자 흐름 연결 완료 상태
- 현재 단계는 제출 직전 마감 정리 단계

## 구현 완료 항목

### 백엔드

- 역할 기반 인증
- 학원 도메인 모델
- 시험 등록 구조
- 학생 결과 저장 구조
- 단원 이해도 계산
- 과목 추세 계산
- 점수 상승률 계산
- 학습 안정성 계산
- 취약 유형 진단 엔진
- 목표 대학 맞춤 전략 엔진
- 감사 로그
- 변경 이력
- 재계산 구조
- seed 데이터

### 프런트

- 강사 로그인
- 학생 로그인
- 세션 복원
- 강사용 대시보드
- 학생 목록
- 학생 상세
- 학생용 대시보드
- 대학 정책 화면
- 시험 관리 화면
- 시험 생성 입력 검증

## 핵심 API 상태

- `POST /frontend/login`
- `GET /frontend/me`
- `GET /frontend/dashboard/instructor`
- `GET /frontend/dashboard/student`
- `GET /frontend/students`
- `GET /frontend/students/{student_id}`
- `GET /frontend/exams`
- `GET /frontend/metadata`
- `GET /frontend/universities`
- `POST /frontend/exams`

## 검증 완료 항목

### 소스 검증

- `python -m compileall app tests`
- `node --check apps/frontend/web.js`
- `powershell -ExecutionPolicy Bypass -File .\scripts\demo_smoke_check.ps1`

### 테스트 보강 항목

- 진단 엔진 테스트
- 전략 엔진 테스트
- 도메인 쓰기 경로 운영 이력 테스트
- frontend metadata 어댑터 테스트
- frontend exam create 스키마 테스트

## 현재 제약사항

- `apps/frontend/web.js` 파일 내부에 과거 중복 선언이 남아 있음
- 현재 렌더링은 마지막 활성 선언 기준 동작
- 로컬 Python `3.14.x` 환경에서는 일부 패키지 설치 호환성 이슈 가능성 존재
- 전체 런타임 통합 검증은 실행 환경에 따라 추가 확인 필요

## 제출 전 확인 항목

1. 백엔드 기동 확인
2. seed 데이터 적재 확인
3. 프런트 API Base URL 확인
4. 강사 계정 로그인 확인
5. 학생 계정 로그인 확인
6. 학생 상세 진입 확인
7. 시험 생성 확인
8. fallback 화면 노출 확인

## 추천 시연 포인트

1. 취약 유형 진단 결과 설명
2. 목표 대학 반영 규칙 기반 전략 설명
3. 강사용 상담 우선 학생 확인 흐름
4. 학생용 오늘의 집중 포인트 확인 흐름
5. 시험 생성 후 목록 반영 흐름
