# Closed Beta Operations Guide

이 문서는 1개 학원, 강사 1~3명, 학생 10~30명 규모의 폐쇄형 베타 운영 순서를 기준으로 한다. 공개 가입, 결제, 부모 포털, 커뮤니티는 이번 범위가 아니다.

## 1. 계정 발급

기본 데모 계정은 `python manage_db.py seed`로 생성한다.

- Admin: `admin@unitflow.ai` / `password123`
- Instructor: `instructor@unitflow.ai` / `password123`
- Student: `student@unitflow.ai` / `password123`

실제 베타 계정은 운영자가 DB 또는 내부 관리 스크립트로 생성한다. 공개 회원가입은 열지 않는다.

## 2. 배포 전 체크

백엔드:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -m pytest
python manage_db.py upgrade
python manage_db.py seed
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
curl http://127.0.0.1:8000/health
```

PostgreSQL 예시:

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg://unitflow:unitflow@localhost:5432/unitflow
AUTO_CREATE_SCHEMA=false
LOG_LEVEL=INFO
```

## 3. 데이터 입력 순서

1. Admin이 대학 정책을 생성하거나 수정한다.
2. Admin 또는 강사가 시험을 생성한다.
3. 강사가 문항과 단원 가중치를 입력한다.
4. 강사가 학생 결과를 직접 입력하거나 CSV로 업로드한다.
5. 학생별 재계산을 실행한다.
6. 감사 로그, 변경 이력, 재계산 작업에서 영향 범위와 상태를 확인한다.

정책 변경은 `policy_changed` 재계산 작업을 만들고, 결과 변경은 `result_changed` 재계산 작업을 만든다.

## 4. 학생 사용 흐름

1. 학생이 로그인한다.
2. 온보딩에서 목표대학, 주간 가용시간, 선호/비선호 과목, 학습 습관을 입력한다.
3. 홈에서 오늘의 핵심 할 일, 수시/정시 방향성, 목표대학 gap, 이번 주 전략 요약을 확인한다.
4. 진단 상세에서 취약 유형, 약한 과목/단원, signals/evidence, 학습 레시피를 확인한다.
5. 전략 설계실에서 AI 기본안, AI 보수안, 현재 승인본을 비교하고 학생 수정안을 저장한다.
6. 강사에게 검토 요청을 보낸다.
7. 승인 전략이 생기면 주간 플래너를 생성하고 체크/시간 입력/회고를 남긴다.
8. 성장 리포트와 What-if 시뮬레이션으로 다음 조정안을 확인한다.

학생 화면 문구는 공개 비교나 낙인 표현을 피하고, "보완", "조정", "다음 실험" 중심으로 유지한다.

## 5. 강사 검토 흐름

1. 강사가 담당 학생 목록에서 검토 우선순위를 확인한다.
2. 학생 상세 전략 검토에서 AI 기본안, 보수안, 학생 수정안, 승인본을 비교한다.
3. 강사는 `approve`, `hold`, `request_revision` 중 하나를 선택한다.
4. 학생용 코칭 메시지와 내부 메모를 분리해 작성한다.
5. 승인 시 학생 수정안은 새 승인 전략으로 복사되며, 기존 승인본은 보관 처리된다.

학생 draft는 workspace로만 저장되고 공식 승인본을 직접 덮어쓰지 않는다.

## 6. Admin 운영 흐름

1. 대학 정책 CRUD는 admin 전용이다.
2. 정책 변경 전 `student_count`로 영향 학생 수를 확인한다.
3. 정책 저장 후 재계산 작업이 생성됐는지 확인한다.
4. AuditLog, ChangeHistory, RecalculationJobs에서 누가, 무엇을, 언제, 왜 바꿨는지 summary-first로 점검한다.

## 7. 알려진 제약사항

- LLM API 키가 없어도 deterministic fallback 전략이 동작한다.
- 실시간 경쟁률, 모의지원, 푸시 알림 자동화, OCR 중심 기능은 폐쇄형 베타 범위가 아니다.
- 데이터가 부족한 학생은 low-confidence 상태가 될 수 있으며, 이 경우 추가 데이터 수집 CTA를 우선 노출한다.
- 운영 DB는 PostgreSQL을 기준으로 하며 SQLite는 로컬 개발용이다.
