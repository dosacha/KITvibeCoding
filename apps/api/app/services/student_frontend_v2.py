from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..models import (
    Exam,
    LearningHabitSnapshot,
    RecalculationTrigger,
    Role,
    StrategyStatus,
    StrategyWorkspaceStatus,
    StudentDiagnosis,
    StudentProfile,
    StudentResult,
    StudentStrategy,
    StudentStrategyWorkspace,
    TargetUniversityProfile,
    User,
    WeeklyPlan,
    WeeklyPlanItem,
    WeeklyPlanItemStatus,
    WeeklyPlanReflection,
    WeeklyPlanStatus,
)
from ..time_utils import utc_now
from .audit import queue_recalculation, record_audit, record_changes
from .domain import get_student_for_user, get_visible_students_query


SUBJECT_LABELS = {
    "KOR": "국어",
    "MATH": "수학",
    "ENG": "영어",
    "SCI": "과학탐구",
    "SOC": "사회탐구",
}

WEAKNESS_LABELS = {
    "concept_gap": "개념 이해 보완형",
    "transfer_weakness": "응용 전환 보완형",
    "precision_accuracy": "실수 점검 보완형",
    "time_pressure": "시간 관리 보완형",
    "instability": "성과 변동 보완형",
    "persistence_risk": "학습 지속 보완형",
}

WORKSPACE_STATUS_LABELS = {
    "draft": "작성 중",
    "submitted_for_review": "강사 검토 요청",
    "reviewed": "검토 완료",
    "approved": "승인 완료",
    "revise_requested": "수정 요청",
    "reset": "초기화",
}

DAY_BUCKETS = ["월", "화", "수", "목", "금", "토", "일"]


def _subject_label(code: str | None, fallback: str | None = None) -> str:
    if not code:
        return fallback or "과목"
    return SUBJECT_LABELS.get(code.upper(), fallback or code)


def _enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _student_for_current_user(db: Session, current_user: User) -> StudentProfile:
    student = get_visible_students_query(db, current_user).one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="학생 정보를 찾을 수 없어.")
    return student


def _latest_diagnosis(student: StudentProfile) -> StudentDiagnosis | None:
    return max(student.diagnoses, key=lambda item: item.computed_at, default=None)


def _latest_strategy(
    student: StudentProfile,
    *,
    status_filter: StrategyStatus | None = None,
    variant: str | None = None,
) -> StudentStrategy | None:
    strategies = student.strategies
    if status_filter is not None:
        strategies = [item for item in strategies if item.status == status_filter]
    if variant is not None:
        strategies = [item for item in strategies if item.variant == variant]
    return max(strategies, key=lambda item: item.generated_at, default=None)


def _latest_approved_strategy(student: StudentProfile) -> StudentStrategy | None:
    return _latest_strategy(student, status_filter=StrategyStatus.APPROVED)


def _primary_goal(student: StudentProfile) -> TargetUniversityProfile | None:
    active = [goal for goal in student.goals if goal.is_active]
    return min(active, key=lambda item: item.priority_order, default=None)


def _latest_workspace(db: Session, student_id: int) -> StudentStrategyWorkspace | None:
    return (
        db.query(StudentStrategyWorkspace)
        .options(joinedload(StudentStrategyWorkspace.base_strategy))
        .filter(StudentStrategyWorkspace.student_profile_id == student_id)
        .order_by(StudentStrategyWorkspace.updated_at.desc(), StudentStrategyWorkspace.id.desc())
        .first()
    )


def _results(db: Session, student_id: int) -> list[StudentResult]:
    return (
        db.query(StudentResult)
        .options(joinedload(StudentResult.exam).joinedload(Exam.subject), joinedload(StudentResult.subject))
        .join(StudentResult.exam)
        .filter(StudentResult.student_profile_id == student_id)
        .order_by(Exam.exam_date.asc(), StudentResult.id.asc())
        .all()
    )


def _score_percent(result: StudentResult) -> float:
    total = float(result.exam.total_score or 100)
    return round(float(result.raw_score or 0) / max(total, 1) * 100, 2)


def _subject_scores(results: list[StudentResult]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for result in results:
        subject = result.subject or result.exam.subject
        code = subject.code
        grouped[code].append(
            {
                "subject_id": subject.id,
                "subject_code": code,
                "subject_name": _subject_label(code, subject.name),
                "score": _score_percent(result),
                "exam_name": result.exam.name,
                "exam_date": result.exam.exam_date,
            }
        )
    return grouped


def _stability(scores: list[float]) -> float:
    if len(scores) < 2:
        return 0.5
    avg = sum(scores) / len(scores)
    variance = sum((score - avg) ** 2 for score in scores) / len(scores)
    return round(max(0.0, min(1.0, 1 - (variance ** 0.5) / 35)), 4)


def _trend(scores: list[float]) -> float:
    if len(scores) < 2:
        return 0.0
    return round(scores[-1] - scores[0], 2)


def _goal_payload(goal: TargetUniversityProfile | None) -> dict[str, Any] | None:
    if goal is None:
        return None
    return {
        "id": goal.id,
        "university_name": goal.policy.university_name,
        "department": goal.target_department,
        "admission_type": goal.policy.admission_type,
        "priority_order": goal.priority_order,
        "target_score": goal.policy.target_score,
        "subject_weights": goal.policy.subject_weights or {},
        "required_subjects": goal.policy.required_subjects or [],
        "label": f"{goal.policy.university_name} {goal.target_department}",
    }


def build_goal_gap(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    return build_goal_gap_for_student(db, student=student)


def build_goal_gap_for_student(db: Session, *, student: StudentProfile) -> dict[str, Any]:
    goal = _primary_goal(student)
    results = _results(db, student.id)
    grouped = _subject_scores(results)
    if goal is None:
        return {
            "primary_goal": None,
            "goal_readiness_score": 0,
            "subject_gaps": [],
            "highest_leverage_subject": None,
            "risk_band": "데이터 부족",
            "gap_delta_vs_last_period": None,
            "message": "목표 대학을 먼저 설정하면 과목별 부족분을 계산할 수 있어.",
        }

    weights = goal.policy.subject_weights or {}
    target = float(goal.policy.target_score or 85)
    subject_gaps = []
    weighted_score = 0.0
    previous_weighted_score = 0.0
    total_weight = 0.0
    previous_total_weight = 0.0

    for code, weight_raw in weights.items():
        weight = float(weight_raw or 0)
        entries = grouped.get(code, [])
        scores = [item["score"] for item in entries]
        current = scores[-1] if scores else 0.0
        previous = scores[-2] if len(scores) >= 2 else None
        gap = round(max(target - current, 0), 2)
        trend = _trend(scores)
        leverage = round(gap * weight * (1.0 + max(trend, 0) / 50), 3)
        weighted_score += current * weight
        total_weight += weight
        if previous is not None:
            previous_weighted_score += previous * weight
            previous_total_weight += weight
        subject_gaps.append(
            {
                "subject_code": code,
                "subject_name": _subject_label(code),
                "current_score": current,
                "target_score": target,
                "gap": gap,
                "weight": weight,
                "trend": trend,
                "stability": _stability(scores),
                "leverage_score": leverage,
                "reason": f"{_subject_label(code)}은 반영 비중 {weight:.0%}, 목표 대비 {gap:.1f}점 차이를 기준으로 계산했어.",
            }
        )

    readiness = round(weighted_score / max(total_weight, 1), 2)
    gap_to_goal = round(max(target - readiness, 0), 2)
    previous_readiness = previous_weighted_score / previous_total_weight if previous_total_weight else None
    delta = None if previous_readiness is None else round(readiness - previous_readiness, 2)
    highest = max(subject_gaps, key=lambda item: item["leverage_score"], default=None)
    if gap_to_goal >= 15:
        risk_band = "집중 보완 필요"
    elif gap_to_goal >= 7:
        risk_band = "주의 구간"
    else:
        risk_band = "목표권 접근"

    return {
        "primary_goal": _goal_payload(goal),
        "goal_readiness_score": readiness,
        "target_score": target,
        "weighted_score": readiness,
        "gap": gap_to_goal,
        "subject_gaps": sorted(subject_gaps, key=lambda item: item["leverage_score"], reverse=True),
        "highest_leverage_subject": highest,
        "risk_band": risk_band,
        "gap_delta_vs_last_period": delta,
        "message": f"현재 환산 점수는 {readiness:.1f}점이고 목표까지 {gap_to_goal:.1f}점 남았어.",
    }


def build_confidence_checklist(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    return build_confidence_for_student(db, student=student)


def build_confidence_for_student(db: Session, *, student: StudentProfile) -> dict[str, Any]:
    diagnosis = _latest_diagnosis(student)
    results = _results(db, student.id)
    latest_habit = max(student.habits, key=lambda item: item.captured_at, default=None)
    missing = []
    actions = []

    if len(results) < 2:
        missing.append({"key": "recent_exams", "label": "최근 시험 데이터", "current": len(results), "required": 2})
        actions.append({"type": "exam_result", "label": "최근 시험 2회 이상 입력", "priority": 1})
    if _primary_goal(student) is None:
        missing.append({"key": "primary_goal", "label": "1순위 목표 대학", "current": 0, "required": 1})
        actions.append({"type": "goal", "label": "목표 대학 1순위 설정", "priority": 1})
    if latest_habit is None:
        missing.append({"key": "habit", "label": "학습 습관", "current": 0, "required": 1})
        actions.append({"type": "habit", "label": "학습 습관 입력", "priority": 2})
    if not student.weekly_available_hours or student.weekly_available_hours <= 0:
        missing.append({"key": "weekly_hours", "label": "주간 가능 시간", "current": 0, "required": 1})
        actions.append({"type": "available_time", "label": "주간 공부 가능 시간 입력", "priority": 2})
    if not student.mastery_current_records:
        missing.append({"key": "unit_mastery", "label": "단원별 이해도", "current": 0, "required": 1})
        actions.append({"type": "question_unit_mapping", "label": "문항별 단원 태깅과 결과 입력", "priority": 3})

    base_confidence = diagnosis.confidence_score if diagnosis else 0.25
    confidence = round(max(0.0, min(1.0, base_confidence - 0.08 * len(missing))), 3)
    level = "높음" if confidence >= 0.75 else "보통" if confidence >= 0.45 else "낮음"
    return {
        "confidence_score": confidence,
        "confidence_level": level,
        "low_confidence": confidence < 0.45 or bool(diagnosis and diagnosis.low_confidence_flag),
        "missing_inputs": missing,
        "recommended_data_actions": sorted(actions, key=lambda item: item["priority"]),
        "message": "데이터를 조금 더 채우면 전략의 정확도가 올라가." if missing else "현재 데이터로 전략을 계산하기에 충분해.",
    }


def build_admission_direction(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    results = _results(db, student.id)
    grouped = _subject_scores(results)
    latest_habit = max(student.habits, key=lambda item: item.captured_at, default=None)
    goal = _primary_goal(student)
    confidence = build_confidence_for_student(db, student=student)

    if confidence["confidence_score"] < 0.35:
        return {
            "direction": "defer",
            "label": "판단 보류",
            "confidence": confidence["confidence_score"],
            "reasons": ["최근 시험, 목표 대학, 학습 습관 데이터가 더 필요해."],
            "recommended_action": "먼저 부족한 입력을 채우고 방향성을 다시 확인하자.",
        }

    trends = [_trend([entry["score"] for entry in entries]) for entries in grouped.values()]
    stabilities = [_stability([entry["score"] for entry in entries]) for entries in grouped.values()]
    avg_trend = sum(trends) / max(len(trends), 1)
    avg_stability = sum(stabilities) / max(len(stabilities), 1)
    habit_consistency = latest_habit.consistency_score if latest_habit else 50
    admission_type = (goal.policy.admission_type if goal else "").lower()

    reasons = []
    if avg_trend >= 5:
        reasons.append("최근 시험 점수가 오르는 흐름이 보여.")
    if avg_stability >= 0.75:
        reasons.append("과목별 점수 변동이 크지 않아 안정적으로 관리되고 있어.")
    if habit_consistency >= 65:
        reasons.append("학습 습관 점수가 안정적이라 장기 관리에 유리해.")
    if goal:
        reasons.append(f"1순위 목표는 {goal.policy.university_name} {goal.target_department}이고, 전형 기준을 함께 반영했어.")

    if "regular" in admission_type or avg_trend >= 7:
        direction = "regular_advantage"
        label = "정시 우세"
        action = "모의고사 상승세가 이어지도록 반영 비중이 큰 과목부터 밀도 있게 올리자."
    elif habit_consistency >= 70 and avg_stability >= 0.78:
        direction = "rolling_advantage"
        label = "수시 우세"
        action = "안정적인 학습 루틴을 유지하면서 내신형 단원 보완을 우선하자."
    else:
        direction = "hybrid"
        label = "수시·정시 병행형"
        action = "당장은 한쪽으로 단정하지 말고, 시험 추세와 학교 성적 데이터를 함께 더 보자."

    return {
        "direction": direction,
        "label": label,
        "confidence": confidence["confidence_score"],
        "reasons": reasons[:4] or ["현재 데이터에서는 수시와 정시를 함께 보는 편이 안전해."],
        "recommended_action": action,
    }


def build_diagnosis(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    diagnosis = _latest_diagnosis(student)
    confidence = build_confidence_for_student(db, student=student)
    if diagnosis is None:
        return {
            "primary_weakness": None,
            "weak_subjects": [],
            "weak_units": [],
            "subject_stability": [],
            "recent_trend": [],
            "evidence": [],
            "coaching_summary": "아직 진단 데이터가 부족해. 최근 시험 결과를 먼저 입력해줘.",
            "confidence": confidence,
        }

    results = _results(db, student.id)
    grouped = _subject_scores(results)
    primary_type = _enum_value(diagnosis.primary_weakness_type)
    return {
        "primary_weakness": {
            "type": primary_type,
            "label": WEAKNESS_LABELS.get(primary_type, primary_type),
            "score": diagnosis.weakness_scores.get(primary_type),
        },
        "weak_subjects": diagnosis.weak_subjects or [],
        "weak_units": diagnosis.weak_units or [],
        "subject_stability": [
            {
                "subject_code": code,
                "subject_name": _subject_label(code),
                "stability": _stability([entry["score"] for entry in entries]),
                "trend": _trend([entry["score"] for entry in entries]),
            }
            for code, entries in grouped.items()
        ],
        "recent_trend": [entry for entries in grouped.values() for entry in entries][-8:],
        "evidence": diagnosis.evidence or [],
        "coaching_summary": diagnosis.coaching_message,
        "instructor_summary": diagnosis.instructor_summary,
        "confidence": confidence,
    }


def build_study_recipes(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    diagnosis = _latest_diagnosis(student)
    weakness = _enum_value(diagnosis.primary_weakness_type) if diagnosis else "concept_gap"
    weak_units = (diagnosis.weak_units or [])[:3] if diagnosis else []
    recipe_map = {
        "concept_gap": {
            "methods": ["개념 20분 정리 후 바로 확인 문제 5문항 풀기", "틀린 개념은 말로 설명해 보고 빈칸을 메우기"],
            "anti_patterns": ["개념이 흔들리는데 고난도 문제만 오래 붙잡기"],
            "session_length": 35,
        },
        "transfer_weakness": {
            "methods": ["대표 유형 1개를 풀고 조건을 바꾼 변형 문제 2개 풀기", "풀이 구조를 단계별로 적기"],
            "anti_patterns": ["답만 확인하고 왜 다른 유형에서 막혔는지 넘기기"],
            "session_length": 45,
        },
        "precision_accuracy": {
            "methods": ["문제 끝나고 60초 검산 체크", "실수 원인을 계산, 조건, 표시 누락으로 분류하기"],
            "anti_patterns": ["쉬운 문제를 빨리 푸는 데만 집중하기"],
            "session_length": 30,
        },
        "time_pressure": {
            "methods": ["20분 제한 미니 세트 풀이", "먼저 풀 문제와 넘길 문제를 표시하기"],
            "anti_patterns": ["시간 제한 없이 오래 풀고 실전 감각을 놓치기"],
            "session_length": 25,
        },
        "instability": {
            "methods": ["시험 전 루틴을 고정하고 짧은 복습을 매일 반복하기", "점수 변동이 큰 단원만 따로 주간 체크하기"],
            "anti_patterns": ["잘 나온 시험 직후 복습을 멈추기"],
            "session_length": 30,
        },
        "persistence_risk": {
            "methods": ["25분 단위 작은 목표로 시작하기", "매일 완료한 항목 1개를 기록하기"],
            "anti_patterns": ["하루 실패를 한 주 실패로 확대해서 포기하기"],
            "session_length": 25,
        },
    }
    selected = recipe_map.get(weakness, recipe_map["concept_gap"])
    return {
        "weakness_type": weakness,
        "weakness_label": WEAKNESS_LABELS.get(weakness, weakness),
        "recommended_methods": selected["methods"],
        "anti_patterns": selected["anti_patterns"],
        "session_length": selected["session_length"],
        "target_units": weak_units,
        "checkpoints": [
            {"label": "시작 전", "text": "오늘 풀 단원과 문항 수를 먼저 정하기"},
            {"label": "진행 중", "text": "막힌 이유를 한 줄로 적기"},
            {"label": "마무리", "text": "다음에 다시 볼 문제를 표시하기"},
        ],
    }


def _normalize_strategy(strategy: StudentStrategy | None) -> dict[str, Any] | None:
    if strategy is None:
        return None
    plan = strategy.structured_plan or {}
    return {
        "id": strategy.id,
        "variant": strategy.variant,
        "variant_label": "기본안" if strategy.variant == "basic" else "보수안" if strategy.variant == "conservative" else "학생 조정안",
        "status": _enum_value(strategy.status),
        "status_label": "승인됨" if strategy.status == StrategyStatus.APPROVED else "검토 대기",
        "summary": strategy.natural_language_summary,
        "student_coaching": strategy.student_coaching,
        "instructor_explanation": strategy.instructor_explanation,
        "weekly_time_allocation": plan.get("weekly_time_allocation") or [],
        "unit_study_order": plan.get("unit_study_order") or [],
        "study_methods": plan.get("study_methods") or [],
        "next_check_in": plan.get("next_check_in") or {},
        "risk_factors": strategy.risk_factors or plan.get("risk_factors") or [],
        "rationale": strategy.rationale or [],
        "plan": plan,
        "generated_at": strategy.generated_at,
    }


def _merge_strategy_with_overrides(strategy: StudentStrategy | None, overrides: dict[str, Any] | None) -> dict[str, Any]:
    base = dict(strategy.structured_plan or {}) if strategy else {}
    overrides = overrides or {}
    plan_overrides = overrides.get("plan") if isinstance(overrides.get("plan"), dict) else overrides
    for key in [
        "weekly_time_allocation",
        "unit_study_order",
        "study_methods",
        "next_check_in",
        "risk_factors",
        "priority_subjects",
        "student_constraints",
    ]:
        if key in plan_overrides:
            base[key] = plan_overrides[key]
    return base


def _workspace_payload(workspace: StudentStrategyWorkspace | None) -> dict[str, Any] | None:
    if workspace is None:
        return None
    status_value = _enum_value(workspace.status)
    return {
        "id": workspace.id,
        "base_strategy_id": workspace.base_strategy_id,
        "status": status_value,
        "status_label": WORKSPACE_STATUS_LABELS.get(status_value, status_value),
        "overrides": workspace.overrides or {},
        "merged_plan": _merge_strategy_with_overrides(workspace.base_strategy, workspace.overrides),
        "student_note": workspace.student_note,
        "instructor_message": workspace.instructor_message,
        "submitted_at": workspace.submitted_at,
        "reviewed_at": workspace.reviewed_at,
        "updated_at": workspace.updated_at,
    }


def build_workspace_timeline(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    workspace = _latest_workspace(db, student.id)
    timeline = []
    if workspace:
        timeline.append({"type": "created", "label": "수정안 작성", "at": workspace.created_at})
        if workspace.updated_at:
            timeline.append({"type": "saved", "label": "학생 수정안 저장", "at": workspace.updated_at})
        if workspace.submitted_at:
            timeline.append({"type": "submitted", "label": "강사 검토 요청", "at": workspace.submitted_at})
        if workspace.reviewed_at:
            timeline.append(
                {
                    "type": "reviewed",
                    "label": WORKSPACE_STATUS_LABELS.get(_enum_value(workspace.status), "강사 검토"),
                    "at": workspace.reviewed_at,
                    "message": workspace.instructor_message,
                }
            )
    return {"workspace_id": workspace.id if workspace else None, "timeline": timeline}


def build_strategy_workspace(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    basic = _latest_strategy(student, variant="basic")
    conservative = _latest_strategy(student, variant="conservative")
    approved = _latest_approved_strategy(student)
    workspace = _latest_workspace(db, student.id)
    return {
        "ai_basic": _normalize_strategy(basic),
        "ai_conservative": _normalize_strategy(conservative),
        "approved": _normalize_strategy(approved),
        "student_draft": _workspace_payload(workspace),
        "review_status": _enum_value(workspace.status) if workspace else "not_started",
        "review_status_label": WORKSPACE_STATUS_LABELS.get(_enum_value(workspace.status), "아직 작성 전") if workspace else "아직 작성 전",
        "timeline": build_workspace_timeline(db, current_user=current_user)["timeline"],
        "guide": "AI안은 참고안이고, 학생 수정안은 강사 승인 전까지 공식 전략이 아니야.",
    }


def _validate_workspace_overrides(overrides: dict[str, Any]) -> None:
    allocation = overrides.get("weekly_time_allocation")
    if allocation is not None and not isinstance(allocation, list):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="과목별 시간 배분은 목록이어야 해.")
    total_hours = overrides.get("weekly_total_hours")
    if total_hours is not None:
        try:
            total = float(total_hours)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="주간 총 시간은 숫자여야 해.") from exc
        if total < 1 or total > 80:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="주간 총 시간은 1시간 이상 80시간 이하로 입력해줘.")
    if isinstance(allocation, list):
        hours = []
        for item in allocation:
            if isinstance(item, dict) and item.get("hours") is not None:
                hours.append(float(item["hours"]))
        if any(hour < 0 for hour in hours):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="과목별 시간은 음수가 될 수 없어.")
        if total_hours is not None and sum(hours) > float(total_hours) + 0.01:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="과목별 시간 합이 주간 총 시간을 넘을 수 없어.")


def save_strategy_workspace(db: Session, *, current_user: User, payload: dict[str, Any]) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    overrides = payload.get("overrides") or {}
    if not isinstance(overrides, dict):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="전략 수정안은 객체 형태여야 해.")
    _validate_workspace_overrides(overrides)
    base_strategy_id = payload.get("base_strategy_id")
    base_strategy = db.get(StudentStrategy, base_strategy_id) if base_strategy_id else _latest_approved_strategy(student) or _latest_strategy(student, variant="basic")
    if base_strategy and base_strategy.student_profile_id != student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="다른 학생의 전략을 수정할 수 없어.")

    workspace = _latest_workspace(db, student.id)
    if workspace and workspace.status in {StrategyWorkspaceStatus.SUBMITTED_FOR_REVIEW, StrategyWorkspaceStatus.APPROVED}:
        workspace = None
    before = None if workspace is None else {"overrides": workspace.overrides, "student_note": workspace.student_note}
    if workspace is None:
        workspace = StudentStrategyWorkspace(
            student_profile_id=student.id,
            base_strategy_id=base_strategy.id if base_strategy else None,
            status=StrategyWorkspaceStatus.DRAFT,
        )
        db.add(workspace)
    workspace.base_strategy_id = base_strategy.id if base_strategy else workspace.base_strategy_id
    workspace.overrides = overrides
    workspace.student_note = payload.get("student_note")
    workspace.status = StrategyWorkspaceStatus.DRAFT
    db.flush()
    if before:
        record_changes(
            db,
            actor_user_id=current_user.id,
            entity_type="student_strategy_workspaces",
            entity_id=workspace.id,
            before=before,
            after={"overrides": overrides, "student_note": workspace.student_note},
        )
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="student_strategy_workspaces",
        entity_id=workspace.id,
        action="save_draft",
        payload={"student_id": student.id, "base_strategy_id": workspace.base_strategy_id},
    )
    db.commit()
    db.refresh(workspace)
    return {"workspace": _workspace_payload(workspace)}


def submit_strategy_workspace(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    workspace = _latest_workspace(db, student.id)
    if workspace is None or workspace.status == StrategyWorkspaceStatus.RESET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="제출할 전략 수정안이 없어.")
    if workspace.status == StrategyWorkspaceStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 승인된 수정안이야.")
    workspace.status = StrategyWorkspaceStatus.SUBMITTED_FOR_REVIEW
    workspace.submitted_at = utc_now()
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="student_strategy_workspaces",
        entity_id=workspace.id,
        action="submit_for_review",
        payload={"student_id": student.id},
    )
    queue_recalculation(
        db,
        entity_type="student_profiles",
        entity_id=student.id,
        trigger=RecalculationTrigger.WORKSPACE_SUBMITTED,
        scope={"student_ids": [student.id], "workspace_id": workspace.id},
        requested_by_user_id=current_user.id,
    )
    db.commit()
    db.refresh(workspace)
    return {"workspace": _workspace_payload(workspace), "timeline": build_workspace_timeline(db, current_user=current_user)["timeline"]}


def reset_strategy_workspace(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    workspace = _latest_workspace(db, student.id)
    if workspace is None:
        return {"workspace": None}
    workspace.status = StrategyWorkspaceStatus.RESET
    workspace.overrides = {}
    workspace.student_note = None
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="student_strategy_workspaces",
        entity_id=workspace.id,
        action="reset",
        payload={"student_id": student.id},
    )
    db.commit()
    return {"workspace": None}


def _week_start(value: str | None = None) -> date:
    parsed = date.fromisoformat(value) if value else date.today()
    return parsed - timedelta(days=parsed.weekday())


def _plan_source(student: StudentProfile, workspace: StudentStrategyWorkspace | None) -> tuple[StudentStrategy | None, dict[str, Any], int | None]:
    if workspace and workspace.status in {
        StrategyWorkspaceStatus.DRAFT,
        StrategyWorkspaceStatus.SUBMITTED_FOR_REVIEW,
        StrategyWorkspaceStatus.REVISE_REQUESTED,
    }:
        strategy = workspace.base_strategy
        return strategy, _merge_strategy_with_overrides(strategy, workspace.overrides), workspace.id
    strategy = _latest_approved_strategy(student) or _latest_strategy(student, variant="basic")
    return strategy, dict(strategy.structured_plan or {}) if strategy else {}, None


def generate_weekly_plan(db: Session, *, current_user: User, week_start: str | None = None) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    workspace = _latest_workspace(db, student.id)
    strategy, plan_data, workspace_id = _plan_source(student, workspace)
    start = _week_start(week_start)
    plan = (
        db.query(WeeklyPlan)
        .options(joinedload(WeeklyPlan.items), joinedload(WeeklyPlan.reflections))
        .filter(WeeklyPlan.student_profile_id == student.id, WeeklyPlan.week_start == start)
        .one_or_none()
    )
    if plan is None:
        plan = WeeklyPlan(
            student_profile_id=student.id,
            source_strategy_id=strategy.id if strategy else None,
            workspace_id=workspace_id,
            week_start=start,
            week_end=start + timedelta(days=6),
            generation_source="student_workspace" if workspace_id else "approved_strategy",
            status=WeeklyPlanStatus.ACTIVE,
        )
        db.add(plan)
        db.flush()
    else:
        plan.items.clear()
        plan.source_strategy_id = strategy.id if strategy else None
        plan.workspace_id = workspace_id
        plan.status = WeeklyPlanStatus.ACTIVE
        db.flush()

    allocations = plan_data.get("weekly_time_allocation") or []
    units = plan_data.get("unit_study_order") or []
    if not allocations:
        allocations = [{"subject_name": "핵심 과목", "hours": max(student.weekly_available_hours, 6), "focus": "기본 학습"}]

    planned_total = 0
    for index, allocation in enumerate(allocations):
        if isinstance(allocation, str):
            subject_name = allocation
            subject_code = "CUSTOM"
            hours = 1.0
        else:
            subject_name = allocation.get("subject_name") or allocation.get("subject") or "과목"
            subject_code = allocation.get("subject_code") or "CUSTOM"
            hours = float(allocation.get("hours") or 1.0)
        unit = units[index % len(units)] if units else {}
        planned_minutes = max(int(hours * 60), 20)
        planned_total += planned_minutes
        db.add(
            WeeklyPlanItem(
                plan_id=plan.id,
                subject_code=subject_code,
                subject_name=_subject_label(subject_code, subject_name),
                unit_id=unit.get("unit_id") if isinstance(unit, dict) else None,
                unit_name=unit.get("unit_name") if isinstance(unit, dict) else None,
                planned_minutes=planned_minutes,
                title=f"{_subject_label(subject_code, subject_name)} 학습",
                instruction=allocation.get("focus") if isinstance(allocation, dict) else None,
                day_bucket=DAY_BUCKETS[index % len(DAY_BUCKETS)],
                day_of_week=DAY_BUCKETS[index % len(DAY_BUCKETS)],
                priority=index + 1,
                priority_order=index + 1,
                rollover_allowed=index < 3,
            )
        )
    plan.planned_total_minutes = planned_total
    plan.completed_total_minutes = 0
    plan.completion_rate_cached = round(plan.completed_total_minutes / max(plan.planned_total_minutes, 1), 3)
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="weekly_plans",
        entity_id=plan.id,
        action="generate",
        payload={"student_id": student.id, "week_start": start.isoformat()},
    )
    db.commit()
    return build_planner(db, current_user=current_user, week_start=start.isoformat())


def _serialize_plan(plan: WeeklyPlan | None) -> dict[str, Any] | None:
    if plan is None:
        return None
    total = sum(item.planned_minutes for item in plan.items)
    completed = sum(item.completed_minutes for item in plan.items)
    checked = sum(1 for item in plan.items if item.is_checked)
    return {
        "id": plan.id,
        "week_start": plan.week_start,
        "status": _enum_value(plan.status),
        "items": [
            {
                "id": item.id,
                "subject_code": item.subject_code,
                "subject_name": item.subject_name,
                "unit_id": item.unit_id,
                "unit_name": item.unit_name,
                "planned_minutes": item.planned_minutes,
                "completed_minutes": item.completed_minutes,
                "day_bucket": item.day_bucket,
                "priority": item.priority,
                "rollover_allowed": item.rollover_allowed,
                "is_checked": item.is_checked,
                "student_note": item.student_note,
            }
            for item in sorted(plan.items, key=lambda item: (item.priority, item.id))
        ],
        "summary": {
            "planned_minutes": total,
            "completed_minutes": completed,
            "completion_rate": round(completed / max(total, 1), 3),
            "checked_count": checked,
            "item_count": len(plan.items),
        },
        "reflections": [
            {
                "id": reflection.id,
                "good": reflection.good,
                "blocked": reflection.blocked,
                "failure_reason": reflection.failure_reason,
                "next_adjustment": reflection.next_adjustment,
                "created_at": reflection.created_at,
            }
            for reflection in sorted(plan.reflections, key=lambda item: item.created_at, reverse=True)
        ],
    }


def build_planner(db: Session, *, current_user: User, week_start: str | None = None) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    start = _week_start(week_start)
    plan = (
        db.query(WeeklyPlan)
        .options(joinedload(WeeklyPlan.items), joinedload(WeeklyPlan.reflections))
        .filter(WeeklyPlan.student_profile_id == student.id, WeeklyPlan.week_start == start)
        .one_or_none()
    )
    return {
        "week_start": start,
        "plan": _serialize_plan(plan),
        "empty_state": None if plan else "아직 이번 주 계획이 없어. 승인 전략이나 저장한 수정안을 바탕으로 생성할 수 있어.",
    }


def check_plan_item(db: Session, *, current_user: User, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    item = (
        db.query(WeeklyPlanItem)
        .join(WeeklyPlanItem.plan)
        .filter(WeeklyPlanItem.id == item_id, WeeklyPlan.student_profile_id == student.id)
        .one_or_none()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="계획 항목을 찾을 수 없어.")
    item.is_checked = bool(payload.get("checked", True))
    if payload.get("completed_minutes") is not None:
        completed = int(payload["completed_minutes"])
        if completed < 0 or completed > 24 * 60:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="완료 시간은 0분 이상 하루 이하로 입력해줘.")
        item.completed_minutes = completed
    if item.is_checked:
        item.status = WeeklyPlanItemStatus.COMPLETED
    elif payload.get("status") == WeeklyPlanItemStatus.SKIPPED.value:
        item.status = WeeklyPlanItemStatus.SKIPPED
    else:
        item.status = WeeklyPlanItemStatus.PLANNED
    if payload.get("student_note") is not None:
        item.student_note = str(payload["student_note"])
    item.plan.completed_total_minutes = sum(plan_item.completed_minutes for plan_item in item.plan.items)
    item.plan.planned_total_minutes = sum(plan_item.planned_minutes for plan_item in item.plan.items)
    item.plan.completion_rate_cached = round(item.plan.completed_total_minutes / max(item.plan.planned_total_minutes, 1), 3)
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="weekly_plan_items",
        entity_id=item.id,
        action="check",
        payload={"checked": item.is_checked, "completed_minutes": item.completed_minutes},
    )
    queue_recalculation(
        db,
        entity_type="student_profiles",
        entity_id=student.id,
        trigger=RecalculationTrigger.PLAN_PROGRESS_CHANGED,
        scope={"student_ids": [student.id], "plan_item_id": item.id},
        requested_by_user_id=current_user.id,
    )
    db.commit()
    return build_planner(db, current_user=current_user, week_start=item.plan.week_start.isoformat())


def save_plan_reflection(db: Session, *, current_user: User, plan_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    plan = (
        db.query(WeeklyPlan)
        .options(joinedload(WeeklyPlan.items), joinedload(WeeklyPlan.reflections))
        .filter(WeeklyPlan.id == plan_id, WeeklyPlan.student_profile_id == student.id)
        .one_or_none()
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주간 계획을 찾을 수 없어.")
    db.add(
        WeeklyPlanReflection(
            plan_id=plan.id,
            student_profile_id=student.id,
            reflection_type=payload.get("reflection_type", "weekly"),
            wins_text=payload.get("wins_text") or payload.get("good"),
            blocker_text=payload.get("blocker_text") or payload.get("blocked"),
            good=payload.get("good"),
            blocked=payload.get("blocked"),
            failure_reason=payload.get("failure_reason"),
            adjustment_note=payload.get("adjustment_note") or payload.get("next_adjustment"),
            next_adjustment=payload.get("next_adjustment"),
        )
    )
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="weekly_plan_reflections",
        entity_id=plan.id,
        action="create",
        payload={"student_id": student.id},
    )
    db.commit()
    db.expire_all()
    return build_planner(db, current_user=current_user, week_start=plan.week_start.isoformat())


def build_plan_summary(db: Session, *, current_user: User, plan_id: int) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    plan = (
        db.query(WeeklyPlan)
        .options(joinedload(WeeklyPlan.items), joinedload(WeeklyPlan.reflections))
        .filter(WeeklyPlan.id == plan_id, WeeklyPlan.student_profile_id == student.id)
        .one_or_none()
    )
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주간 계획을 찾을 수 없어.")
    serialized = _serialize_plan(plan)
    return {"summary": serialized["summary"], "plan": serialized}


def build_growth(db: Session, *, current_user: User, range_value: str = "recent") -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    results = _results(db, student.id)
    grouped = _subject_scores(results)
    goal_gap = build_goal_gap_for_student(db, student=student)
    plans = (
        db.query(WeeklyPlan)
        .options(joinedload(WeeklyPlan.items))
        .filter(WeeklyPlan.student_profile_id == student.id)
        .order_by(WeeklyPlan.week_start.asc())
        .all()
    )
    execution_trend = [
        {
            "week_start": plan.week_start,
            "completion_rate": _serialize_plan(plan)["summary"]["completion_rate"],
        }
        for plan in plans
    ]
    diagnosis = _latest_diagnosis(student)
    summary = "최근 점수 흐름과 목표 대학 gap을 함께 추적 중이야."
    if goal_gap.get("gap_delta_vs_last_period") is not None:
        delta = goal_gap["gap_delta_vs_last_period"]
        summary = "목표 대학 환산 점수가 지난 기간보다 올랐어." if delta > 0 else "목표 대학 gap을 줄이려면 이번 주 실행률 관리가 중요해."
    return {
        "range": range_value,
        "summary": summary,
        "score_trend": [
            {
                "subject_code": code,
                "subject_name": _subject_label(code),
                "points": [{"exam_date": item["exam_date"], "score": item["score"], "exam_name": item["exam_name"]} for item in entries],
            }
            for code, entries in grouped.items()
        ],
        "gap_trend": [{"label": "현재 목표 gap", "gap": goal_gap.get("gap"), "delta": goal_gap.get("gap_delta_vs_last_period")}],
        "stability_trend": [
            {"subject_code": code, "subject_name": _subject_label(code), "stability": _stability([item["score"] for item in entries])}
            for code, entries in grouped.items()
        ],
        "execution_trend": execution_trend,
        "weakness_shift": {
            "current": _enum_value(diagnosis.primary_weakness_type) if diagnosis else None,
            "label": WEAKNESS_LABELS.get(_enum_value(diagnosis.primary_weakness_type), "") if diagnosis else None,
        },
    }


def build_home(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    diagnosis = build_diagnosis(db, current_user=current_user)
    goal_gap = build_goal_gap_for_student(db, student=student)
    strategy_workspace = build_strategy_workspace(db, current_user=current_user)
    approved = strategy_workspace.get("approved")
    growth = build_growth(db, current_user=current_user)
    confidence = build_confidence_for_student(db, student=student)
    actions = []
    top_subject = goal_gap.get("highest_leverage_subject")
    if top_subject:
        actions.append({"label": f"{top_subject['subject_name']} 먼저 보완하기", "reason": top_subject["reason"], "target": "goal-gap"})
    if diagnosis.get("weak_units"):
        first_unit = diagnosis["weak_units"][0]
        actions.append({"label": f"{first_unit.get('unit_name', '취약 단원')} 복습", "reason": "진단 근거에서 우선 보완 단원으로 잡혔어.", "target": "diagnosis"})
    if approved and approved.get("next_check_in"):
        actions.append({"label": "다음 점검 준비", "reason": f"점검일: {approved['next_check_in'].get('date', '미정')}", "target": "planner"})
    if confidence["low_confidence"]:
        actions.append({"label": "부족한 데이터 채우기", "reason": confidence["message"], "target": "onboarding"})
    return {
        "student": {
            "id": student.id,
            "name": student.user.full_name,
            "grade_level": student.grade_level,
            "weekly_available_hours": student.weekly_available_hours,
        },
        "today_actions": actions[:3],
        "weekly_strategy_summary": approved["summary"] if approved else "아직 승인된 전략이 없어. 수정안을 저장하고 강사 검토를 요청할 수 있어.",
        "primary_goal": goal_gap.get("primary_goal"),
        "next_check_in": approved.get("next_check_in") if approved else None,
        "recent_growth": growth.get("summary"),
        "confidence": confidence,
        "diagnosis": diagnosis,
        "goal_gap": goal_gap,
        "strategy_workspace": strategy_workspace,
        "growth": growth,
    }


def simulate_goal_scenario(db: Session, *, current_user: User, payload: dict[str, Any]) -> dict[str, Any]:
    base = build_goal_gap(db, current_user=current_user)
    deltas = payload.get("score_deltas") or {}
    hour_delta = float(payload.get("weekly_hours_delta") or 0)
    simulated_subjects = []
    for item in base.get("subject_gaps", []):
        delta = float(deltas.get(item["subject_code"], 0))
        current = max(0, min(100, item["current_score"] + delta))
        gap = round(max(item["target_score"] - current, 0), 2)
        simulated_subjects.append({**item, "simulated_score": current, "simulated_gap": gap})
    changed = sorted(simulated_subjects, key=lambda item: item["simulated_gap"] * item["weight"], reverse=True)
    return {
        "base_goal_gap": base,
        "updated_goal_gap": {
            "subject_gaps": changed,
            "highest_leverage_subject": changed[0] if changed else None,
            "weekly_hours_after_change": hour_delta,
        },
        "changed_subject_priorities": changed[:3],
        "recommended_scenario_summary": "점수 변화는 실제 DB에 저장하지 않았어. 가장 큰 simulated_gap 과목부터 확인해봐.",
    }


def build_onboarding(db: Session, *, current_user: User) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    latest_habit = max(student.habits, key=lambda item: item.captured_at, default=None)
    steps = [
        {"key": "goal", "label": "목표 대학 설정", "completed": _primary_goal(student) is not None},
        {"key": "weekly_time", "label": "주간 가능 시간", "completed": bool(student.weekly_available_hours and student.weekly_available_hours > 0)},
        {"key": "subject_preference", "label": "선호 과목 입력", "completed": bool(student.preferred_subjects or student.disliked_subjects)},
        {"key": "habit", "label": "학습 습관 입력", "completed": latest_habit is not None},
    ]
    completed = sum(1 for step in steps if step["completed"])
    return {
        "completeness_score": round(completed / len(steps), 3),
        "steps": steps,
        "profile": {
            "weekly_available_hours": student.weekly_available_hours,
            "preferred_subjects": student.preferred_subjects,
            "disliked_subjects": student.disliked_subjects,
            "learning_style_preferences": student.learning_style_preferences,
            "study_style_notes": student.study_style_notes,
        },
        "primary_goal": _goal_payload(_primary_goal(student)),
        "latest_habit": None if latest_habit is None else {
            "id": latest_habit.id,
            "captured_at": latest_habit.captured_at,
            "recent_learning_mode": latest_habit.recent_learning_mode,
            "review_habit_score": latest_habit.review_habit_score,
            "consistency_score": latest_habit.consistency_score,
        },
    }


def update_onboarding_profile(db: Session, *, current_user: User, payload: dict[str, Any]) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    before = {
        "weekly_available_hours": student.weekly_available_hours,
        "preferred_subjects": student.preferred_subjects,
        "disliked_subjects": student.disliked_subjects,
        "learning_style_preferences": student.learning_style_preferences,
        "study_style_notes": student.study_style_notes,
    }
    for key in before:
        if key in payload:
            setattr(student, key, payload[key])
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="student_profiles", entity_id=student.id, before=before, after={key: getattr(student, key) for key in before})
    record_audit(db, actor_user_id=current_user.id, entity_type="student_profiles", entity_id=student.id, action="student_onboarding_update", payload=payload)
    queue_recalculation(
        db,
        entity_type="student_profiles",
        entity_id=student.id,
        trigger=RecalculationTrigger.HABIT_CHANGED,
        scope={"student_ids": [student.id]},
        requested_by_user_id=current_user.id,
    )
    db.commit()
    return build_onboarding(db, current_user=current_user)


def add_onboarding_habit(db: Session, *, current_user: User, payload: dict[str, Any]) -> dict[str, Any]:
    student = _student_for_current_user(db, current_user)
    habit = LearningHabitSnapshot(
        student_profile_id=student.id,
        recent_learning_mode=payload.get("recent_learning_mode", "mixed"),
        self_study_ratio=float(payload.get("self_study_ratio", 0.25)),
        lecture_ratio=float(payload.get("lecture_ratio", 0.25)),
        error_note_ratio=float(payload.get("error_note_ratio", 0.25)),
        problem_solving_ratio=float(payload.get("problem_solving_ratio", 0.25)),
        review_habit_score=float(payload.get("review_habit_score", 50)),
        consistency_score=float(payload.get("consistency_score", 50)),
        notes=payload.get("notes"),
    )
    db.add(habit)
    db.flush()
    record_audit(db, actor_user_id=current_user.id, entity_type="learning_habit_snapshots", entity_id=habit.id, action="student_create", payload=payload)
    queue_recalculation(
        db,
        entity_type="student_profiles",
        entity_id=student.id,
        trigger=RecalculationTrigger.HABIT_CHANGED,
        scope={"student_ids": [student.id]},
        requested_by_user_id=current_user.id,
    )
    db.commit()
    return build_onboarding(db, current_user=current_user)


def _build_workspace_diff(workspace: StudentStrategyWorkspace | None) -> list[dict[str, Any]]:
    if workspace is None:
        return []
    base_plan = workspace.base_strategy.structured_plan if workspace.base_strategy else {}
    merged = _merge_strategy_with_overrides(workspace.base_strategy, workspace.overrides)
    diff = []
    for key, value in merged.items():
        if base_plan.get(key) != value:
            diff.append({"field": key, "before": base_plan.get(key), "after": value})
    return diff


def _workspace_review_history(workspace: StudentStrategyWorkspace | None) -> list[dict[str, Any]]:
    if workspace is None:
        return []
    history = []
    if workspace.submitted_at:
        history.append({"type": "submitted", "label": "학생 검토 요청", "at": workspace.submitted_at})
    if workspace.reviewed_at:
        history.append(
            {
                "type": "reviewed",
                "label": WORKSPACE_STATUS_LABELS.get(_enum_value(workspace.status)),
                "at": workspace.reviewed_at,
                "message": workspace.instructor_message,
            }
        )
    return history


def build_instructor_strategy_review(db: Session, *, student_id: int, current_user: User) -> dict[str, Any]:
    if current_user.role == Role.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="강사 검토 화면은 강사와 운영자만 볼 수 있어.")
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)
    workspace = _latest_workspace(db, student.id)
    return {
        "student": {"id": student.id, "name": student.user.full_name, "grade_level": student.grade_level},
        "ai_basic": _normalize_strategy(_latest_strategy(student, variant="basic")),
        "ai_conservative": _normalize_strategy(_latest_strategy(student, variant="conservative")),
        "student_workspace": _workspace_payload(workspace),
        "approved": _normalize_strategy(_latest_approved_strategy(student)),
        "diff_summary": _build_workspace_diff(workspace),
        "review_history": _workspace_review_history(workspace),
        "student_constraints": (workspace.overrides or {}).get("student_constraints") if workspace else None,
        "student_note": workspace.student_note if workspace else None,
    }


def review_strategy_workspace(db: Session, *, workspace_id: int, current_user: User, payload: dict[str, Any]) -> dict[str, Any]:
    if current_user.role == Role.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="학생은 전략 검토를 승인할 수 없어.")
    workspace = (
        db.query(StudentStrategyWorkspace)
        .options(joinedload(StudentStrategyWorkspace.student_profile).joinedload(StudentProfile.user), joinedload(StudentStrategyWorkspace.base_strategy))
        .filter(StudentStrategyWorkspace.id == workspace_id)
        .one_or_none()
    )
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="전략 수정안을 찾을 수 없어.")
    student = get_student_for_user(db, student_id=workspace.student_profile_id, current_user=current_user)
    decision = payload.get("decision")
    if decision not in {"approve", "hold", "request_revision"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="decision은 approve, hold, request_revision 중 하나여야 해.")
    workspace.instructor_message = payload.get("student_message")
    workspace.instructor_private_note = payload.get("instructor_note")
    workspace.reviewed_at = utc_now()
    approved_strategy = None
    if decision == "approve":
        workspace.status = StrategyWorkspaceStatus.APPROVED
        base = workspace.base_strategy
        if base is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="승인할 기준 전략이 없어.")
        db.query(StudentStrategy).filter(
            StudentStrategy.student_profile_id == student.id,
            StudentStrategy.status == StrategyStatus.APPROVED,
        ).update({StudentStrategy.status: StrategyStatus.ARCHIVED}, synchronize_session=False)
        approved_strategy = StudentStrategy(
            student_profile_id=student.id,
            diagnosis_id=base.diagnosis_id,
            goal_id=base.goal_id,
            variant="student_workspace",
            status=StrategyStatus.APPROVED,
            structured_plan=_merge_strategy_with_overrides(base, workspace.overrides),
            natural_language_summary=payload.get("approved_summary") or base.natural_language_summary,
            rationale=base.rationale,
            risk_factors=base.risk_factors,
            instructor_explanation=payload.get("instructor_note") or base.instructor_explanation,
            student_coaching=payload.get("student_message") or base.student_coaching,
        )
        db.add(approved_strategy)
        db.flush()
    elif decision == "request_revision":
        workspace.status = StrategyWorkspaceStatus.REVISE_REQUESTED
    else:
        workspace.status = StrategyWorkspaceStatus.REVIEWED

    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="student_strategy_workspaces",
        entity_id=workspace.id,
        action=f"review:{decision}",
        payload={"student_id": student.id, "approved_strategy_id": approved_strategy.id if approved_strategy else None},
    )
    db.commit()
    return build_instructor_strategy_review(db, student_id=student.id, current_user=current_user)
