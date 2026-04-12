from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from .explanation import generate_explanations


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _growth_potential(subject: dict[str, Any]) -> float:
    readiness = subject.get("current_readiness", 0.0)
    trend = subject.get("trend", 0.0)
    return round(_clamp(0.5 + (trend / 20.0) + ((100 - readiness) / 100.0) * 0.2), 3)


def _priority_score(subject: dict[str, Any]) -> float:
    weight = float(subject.get("admission_weight", 0.5))
    target_gap = subject.get("gap_score", 0.0)
    gap_component = _clamp(target_gap / 30.0, 0.0, 1.2)
    growth = _growth_potential(subject)
    confidence = subject.get("confidence", 0.0)
    return round(weight * gap_component * (0.6 + 0.4 * growth) * max(confidence, 0.2), 4)


def _recommend_methods(primary_weakness: str, preferences: list[str], habit: dict[str, Any]) -> list[dict[str, str]]:
    preference_text = ", ".join(preferences[:2]) if preferences else "현재 익숙한 방식"
    methods = {
        "concept_gap": [
            {"label": "개념 강의 + 확인 문제", "detail": f"{preference_text} 기반으로 20분 개념 정리 후 5문항 확인 문제를 붙입니다."},
            {"label": "선행 단원 복구", "detail": "선행 단원 mastery가 낮은 부분부터 짧은 복구 세션을 배치합니다."},
        ],
        "transfer_weakness": [
            {"label": "대표 유형 변형", "detail": "대표 문제 풀이 구조를 만든 뒤 변형 2세트를 연달아 풉니다."},
            {"label": "오답 전이 메모", "detail": "개념은 맞았지만 적용이 흔들린 지점을 유형별로 메모합니다."},
        ],
        "precision_accuracy": [
            {"label": "검산 체크리스트", "detail": "쉬운 문제에서 놓치는 실수를 줄이기 위해 풀이 종료 전 60초 검산 루틴을 고정합니다."},
            {"label": "오답 원인 태깅", "detail": "부주의·계산·조건 해석 중 어떤 실수인지 기록합니다."},
        ],
        "time_pressure": [
            {"label": "제한시간 미니 모의", "detail": "20분 단위 제한시간 세션으로 후반부 집중력과 속도를 같이 점검합니다."},
            {"label": "풀이 순서 최적화", "detail": "초반 안정 득점 문제를 먼저 처리하는 순서를 고정합니다."},
        ],
        "instability": [
            {"label": "난도 단계화", "detail": "쉬움-중간-실전 순서의 고정 루틴으로 시험 변동성을 줄입니다."},
            {"label": "시험 전 루틴 고정", "detail": "시험 전 복습 범위와 휴식 루틴을 표준화합니다."},
        ],
        "persistence_risk": [
            {"label": "25분 반복 세션", "detail": "짧고 끊기지 않는 세션으로 시작 허들을 낮춥니다."},
            {"label": "즉시 피드백", "detail": "하루 내 체크포인트를 두어 완료 경험을 자주 만듭니다."},
        ],
    }
    selected = methods.get(primary_weakness, methods["concept_gap"])
    if habit.get("error_note_ratio", 0.0) > 0.35:
        selected.append({"label": "오답노트 유지", "detail": "현재 잘 하고 있는 오답노트 습관은 유지하되, 과목 우선순위에 맞춰 적용합니다."})
    return selected


def _build_plan(
    *,
    variant: str,
    feature_snapshot: dict[str, Any],
    diagnosis_payload: dict[str, Any],
) -> dict[str, Any]:
    goal = feature_snapshot.get("goal") or {}
    subjects = []
    for code, item in feature_snapshot.get("subjects", {}).items():
        priority = _priority_score(item)
        subjects.append(
            {
                "subject_code": code,
                "subject_name": item["subject_name"],
                "priority_score": priority,
                "gap_score": item["gap_score"],
                "growth_potential": _growth_potential(item),
                "confidence": item["confidence"],
                "reason": f"반영 비중 {item.get('admission_weight', 0)} · 준비도 격차 {item.get('gap_score', 0)} · 최근 추세 {item.get('trend', 0)} 기반",
                "weak_units": item.get("weak_units", []),
            }
        )
    subjects.sort(key=lambda item: item["priority_score"], reverse=True)

    total_hours = feature_snapshot["student"].get("weekly_available_hours", 12.0)
    if diagnosis_payload.get("low_confidence_flag"):
        total_hours = max(total_hours, 6.0)
    focus_ratio = 0.7 if variant == "basic" else 0.55
    review_ratio = 0.2 if variant == "basic" else 0.3
    mock_ratio = 0.1 if variant == "basic" else 0.15

    total_priority = sum(item["priority_score"] for item in subjects[:3]) or 1.0
    weekly_time_allocation = []
    for subject in subjects[:3]:
        raw_hours = total_hours * focus_ratio * (subject["priority_score"] / total_priority)
        weekly_time_allocation.append(
            {
                "subject_name": subject["subject_name"],
                "hours": round(raw_hours, 1),
                "focus": "상승 효율이 높은 핵심 보강" if variant == "basic" else "안정적 점수 회수와 루틴 유지",
            }
        )
    weekly_time_allocation.extend(
        [
            {"subject_name": "오답 복습", "hours": round(total_hours * review_ratio, 1), "focus": "전 과목 공통 복습"},
            {"subject_name": "실전 점검", "hours": round(total_hours * mock_ratio, 1), "focus": "시간관리·안정성 점검"},
        ]
    )

    weak_units = []
    for subject in subjects[:3]:
        for unit in subject["weak_units"]:
            weak_units.append(
                {
                    "subject_name": subject["subject_name"],
                    "unit_name": unit["unit_name"],
                    "effective_mastery": unit["effective_mastery"],
                    "priority_score": round(subject["priority_score"] * (1.1 - unit["confidence"]), 4),
                }
            )
    weak_units.sort(key=lambda item: (item["effective_mastery"], -item["priority_score"]))
    unit_order = weak_units[:6]

    risk_factors = [
        {"label": "데이터 신뢰도", "detail": "데이터가 적으면 전략의 정밀도가 낮아질 수 있습니다."}
        if diagnosis_payload.get("low_confidence_flag")
        else {"label": "우선순위 집중", "detail": "상위 과목 2~3개에 집중하지 않으면 점수 상승 효율이 낮아질 수 있습니다."},
    ]
    if feature_snapshot["habits"]["consistency_score"] < 55:
        risk_factors.append({"label": "지속성", "detail": "학습 공백이 생기면 우선 단원 mastery 회복 속도가 느려질 수 있습니다."})
    if diagnosis_payload.get("primary_weakness_type").value == "time_pressure":
        risk_factors.append({"label": "시간 관리", "detail": "후반부 무응답이 다시 나오면 실력 대비 성과가 낮게 나올 수 있습니다."})

    primary_weakness = diagnosis_payload["primary_weakness_type"].value
    methods = _recommend_methods(primary_weakness, feature_snapshot["student"].get("learning_style_preferences", []), feature_snapshot["habits"])
    next_check_in_days = 7 if diagnosis_payload.get("low_confidence_flag") else 14
    next_check_in = (date.today() + timedelta(days=next_check_in_days)).isoformat()

    explanation_context = {
        "variant": variant,
        "goal": goal,
        "primary_weakness": primary_weakness,
        "top_subjects": [subject["subject_name"] for subject in subjects[:3]],
        "top_units": [unit["unit_name"] for unit in unit_order[:4]],
    }
    copy = generate_explanations(explanation_context)

    plan = {
        "variant": variant,
        "goal_context": goal,
        "subject_priorities": subjects,
        "weekly_time_allocation": weekly_time_allocation,
        "unit_study_order": unit_order,
        "study_methods": methods,
        "next_check_in": {"days": next_check_in_days, "date": next_check_in},
        "risk_factors": risk_factors,
        "low_confidence": diagnosis_payload.get("low_confidence_flag", False),
        "low_confidence_message": "추가 데이터 수집 우선" if diagnosis_payload.get("low_confidence_flag") else None,
        "teacher_notes": diagnosis_payload.get("instructor_summary"),
        "student_message": diagnosis_payload.get("coaching_message"),
    }
    return {
        "variant": variant,
        "status": "pending_review",
        "structured_plan": plan,
        "natural_language_summary": copy["summary"],
        "rationale": [
            {
                "subject_name": subject["subject_name"],
                "priority_score": subject["priority_score"],
                "reason": subject["reason"],
            }
            for subject in subjects[:3]
        ],
        "risk_factors": risk_factors,
        "instructor_explanation": copy["instructor_explanation"],
        "student_coaching": copy["student_coaching"],
    }


def generate_strategies(*, feature_snapshot: dict[str, Any], diagnosis_payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        _build_plan(variant="basic", feature_snapshot=feature_snapshot, diagnosis_payload=diagnosis_payload),
        _build_plan(variant="conservative", feature_snapshot=feature_snapshot, diagnosis_payload=diagnosis_payload),
    ]
