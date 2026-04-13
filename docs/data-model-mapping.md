# 데이터모델 매핑 원칙

## 목적

PRD 11장의 엔티티 이름과 현재 코드베이스의 ORM 모델 이름이 다르더라도 새 테이블을 중복 생성하지 않는다. 기존 모델을 기준으로 확장하고, PRD 용어는 문서와 API 응답에서 alias로 관리한다.

## PRD 엔티티와 현재 모델 매핑

| PRD 엔티티 | 현재 ORM 모델 | 운영 원칙 |
| --- | --- | --- |
| StudentGoal | TargetUniversityProfile | 목표 대학, 학과, 우선순위는 기존 목표 프로필에 저장 |
| UniversityAdmissionProfile | UniversityScorePolicy | 대학별 반영 비중, 환산 규칙, 목표 점수는 기존 정책 테이블에 저장 |
| WeaknessProfile | StudentDiagnosis | 취약 유형, 근거, 신뢰도는 진단 테이블과 DiagnosisSignal로 확장 |
| StrategyPlan | StudentStrategy | AI 전략과 승인 전략은 기존 전략 테이블에 저장 |
| StrategyReview | StrategyReview | AI안과 학생 수정안 검토를 같은 리뷰 테이블에서 추적 |

## 확장 정책

- 기존 테이블 삭제나 rename migration은 하지 않는다.
- 신규 기능은 기존 모델 필드 추가 또는 하위 테이블 추가로 처리한다.
- 학생이 만든 전략 수정안은 StudentStrategy를 직접 덮어쓰지 않고 StudentStrategyWorkspace에 저장한다.
- 강사 승인 이후에만 StudentStrategy 승인본으로 연결한다.
- 성장 리포트는 P0에서 별도 캐시 테이블을 만들지 않고 기존 결과, 진단, 목표 gap, 플래너 이력을 조합한다.

## P0 신규 테이블

| 테이블 | 역할 |
| --- | --- |
| admission_direction_snapshots | 수시·정시 방향성 진단 이력 |
| goal_readiness_snapshots | 목표 대학 대비 readiness 이력 |
| goal_gap_subject_details | 목표 gap의 과목별 상세 |
| diagnosis_signals | 취약 진단의 설명 가능한 근거 |
| study_recipe_templates | 취약 유형별 공부 레시피 seed 기반 관리 |
| student_strategy_workspaces | 학생 전략 수정안 작업공간 |
| weekly_plans | 주간 실행 계획 헤더 |
| weekly_plan_items | 일별·과목별 실행 항목 |
| weekly_plan_reflections | 주간 회고 |

## canonical strategy plan schema v2

```json
{
  "weekly_time_allocation": [
    { "subject_name": "수학", "hours": 5, "focus": "확률 단원 보완" }
  ],
  "unit_study_order": [
    { "subject_name": "수학", "unit_name": "확률", "effective_mastery": 42, "reason": "쉬운 문항 오답 반복" }
  ],
  "study_methods": [
    { "label": "개념 20분 정리", "detail": "정리 후 확인 문제 5문항 풀이" }
  ],
  "next_check_in": { "date": "2026-04-20", "days": 7, "note": "주간 실행률 확인" },
  "risk_factors": [
    { "label": "시간 배분 흔들림", "detail": "수학 보완 시간이 줄면 목표 gap 감소가 늦어짐" }
  ]
}
```
