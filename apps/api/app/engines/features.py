from __future__ import annotations

from collections import defaultdict
from statistics import pstdev
from typing import Any

from ..models import (
    LearningHabitSnapshot,
    StudentProfile,
    StudentResult,
    Subject,
    TargetUniversityProfile,
    UnitMasteryCurrent,
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def normalize_result_score(result: StudentResult) -> float:
    total_score = result.exam.total_score or 100
    if total_score <= 0:
        return 0.0
    return round((result.raw_score / total_score) * 100, 2)


def build_feature_snapshot(
    *,
    student: StudentProfile,
    results: list[StudentResult],
    mastery_records: list[UnitMasteryCurrent],
    primary_goal: TargetUniversityProfile | None,
    latest_habit: LearningHabitSnapshot | None,
) -> dict[str, Any]:
    subject_results: dict[str, list[float]] = defaultdict(list)
    subject_dates: dict[str, list[str]] = defaultdict(list)
    subject_names: dict[str, str] = {}
    for result in sorted(results, key=lambda item: item.exam.exam_date):
        code = result.subject.code
        subject_names[code] = result.subject.name
        subject_results[code].append(normalize_result_score(result))
        subject_dates[code].append(result.exam.exam_date.isoformat())

    mastery_by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for mastery in mastery_records:
        mastery_by_subject[mastery.subject.code].append(
            {
                "unit_id": mastery.unit_id,
                "unit_name": mastery.unit.name,
                "effective_mastery": round(mastery.effective_mastery, 2),
                "confidence": round(mastery.unit_confidence, 2),
                "attempt_count": mastery.attempt_count,
            }
        )

    policy_weights = primary_goal.policy.subject_weights if primary_goal else {}
    target_score = primary_goal.policy.target_score if primary_goal else 85.0

    subject_features: dict[str, Any] = {}
    for code, scores in subject_results.items():
        latest_score = scores[-1]
        previous_score = scores[-2] if len(scores) >= 2 else latest_score
        trend = latest_score - previous_score
        growth_rate = (scores[-1] - scores[0]) / max(len(scores) - 1, 1)
        variability = pstdev(scores) if len(scores) >= 2 else 0.0
        stability = _clamp(1.0 - (variability / 25.0), 0.0, 1.0)
        confidence = _clamp(len(scores) / 4.0, 0.0, 1.0)
        mastery_values = [item["effective_mastery"] for item in mastery_by_subject.get(code, [])]
        avg_mastery = sum(mastery_values) / len(mastery_values) if mastery_values else latest_score
        readiness = round(0.6 * latest_score + 0.4 * avg_mastery, 2)
        gap_score = max(0.0, target_score - readiness)
        subject_features[code] = {
            "subject_name": subject_names.get(code, code),
            "history": scores,
            "history_dates": subject_dates.get(code, []),
            "latest_score": round(latest_score, 2),
            "trend": round(trend, 2),
            "growth_rate": round(growth_rate, 2),
            "stability": round(stability, 2),
            "confidence": round(confidence, 2),
            "average_mastery": round(avg_mastery, 2),
            "current_readiness": readiness,
            "gap_score": round(gap_score, 2),
            "admission_weight": float(policy_weights.get(subject_names.get(code, code), policy_weights.get(code, 0.5))),
            "weak_units": sorted(mastery_by_subject.get(code, []), key=lambda item: item["effective_mastery"])[:4],
        }

    average_confidence = sum(item["confidence"] for item in subject_features.values()) / max(len(subject_features), 1)
    average_stability = sum(item["stability"] for item in subject_features.values()) / max(len(subject_features), 1)
    latest_consistency = latest_habit.consistency_score if latest_habit else 50.0
    review_score = latest_habit.review_habit_score if latest_habit else 50.0

    return {
        "student": {
            "student_id": student.id,
            "grade_level": student.grade_level,
            "enrollment_status": student.enrollment_status.value,
            "weekly_available_hours": student.weekly_available_hours,
            "preferred_subjects": student.preferred_subjects,
            "disliked_subjects": student.disliked_subjects,
            "learning_style_preferences": student.learning_style_preferences,
        },
        "goal": None
        if not primary_goal
        else {
            "goal_id": primary_goal.id,
            "university_name": primary_goal.policy.university_name,
            "admission_type": primary_goal.policy.admission_type,
            "target_department": primary_goal.target_department,
            "priority_order": primary_goal.priority_order,
            "target_score": primary_goal.policy.target_score,
            "subject_weights": primary_goal.policy.subject_weights,
            "required_subjects": primary_goal.policy.required_subjects,
        },
        "subjects": subject_features,
        "habits": {
            "recent_learning_mode": latest_habit.recent_learning_mode if latest_habit else "mixed",
            "self_study_ratio": latest_habit.self_study_ratio if latest_habit else 0.25,
            "lecture_ratio": latest_habit.lecture_ratio if latest_habit else 0.25,
            "error_note_ratio": latest_habit.error_note_ratio if latest_habit else 0.25,
            "problem_solving_ratio": latest_habit.problem_solving_ratio if latest_habit else 0.25,
            "review_habit_score": review_score,
            "consistency_score": latest_consistency,
        },
        "overall": {
            "exam_count": len(results),
            "subject_count": len(subject_features),
            "average_confidence": round(average_confidence, 2),
            "average_stability": round(average_stability, 2),
            "low_data": len(results) < 2 or average_confidence < 0.45,
            "average_gap": round(
                sum(item["gap_score"] for item in subject_features.values()) / max(len(subject_features), 1),
                2,
            ),
        },
    }
