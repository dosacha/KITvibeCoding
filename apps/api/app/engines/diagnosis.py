from __future__ import annotations

from collections import defaultdict
from statistics import pstdev
from typing import Any

from ..models import LearningHabitSnapshot, StudentProfile, StudentQuestionResponse, StudentResult, SubmissionStatus, UnitMasteryCurrent, WeaknessType


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def diagnose_student(
    *,
    student: StudentProfile,
    feature_snapshot: dict[str, Any],
    mastery_records: list[UnitMasteryCurrent],
    results: list[StudentResult],
    responses: list[StudentQuestionResponse],
    latest_habit: LearningHabitSnapshot | None,
) -> dict[str, Any]:
    easy_concept_attempts = 0
    easy_concept_errors = 0
    applied_attempts = 0
    applied_errors = 0
    easy_attempts = 0
    easy_errors = 0
    late_attempts = 0
    late_errors_or_unanswered = 0
    per_subject_scores: dict[str, list[float]] = defaultdict(list)
    low_prereq_count = 0
    response_count = 0

    question_count_by_exam: dict[int, int] = {}
    for result in results:
        question_count_by_exam[result.exam_id] = len(result.exam.questions)
        per_subject_scores[result.subject.code].append(feature_snapshot["subjects"].get(result.subject.code, {}).get("latest_score", 0.0))

    for mastery in mastery_records:
        if mastery.unit.prerequisite_unit_id and mastery.effective_mastery < 55:
            low_prereq_count += 1

    for response in responses:
        question = response.question
        exam = question.exam
        response_count += 1
        is_error_like = response.response_status in {SubmissionStatus.UNANSWERED, SubmissionStatus.NOT_ENTERED} or response.is_correct is False
        if question.teacher_difficulty <= 2:
            easy_attempts += 1
            if is_error_like:
                easy_errors += 1
        if question.problem_style == "concept":
            easy_concept_attempts += 1
            if question.teacher_difficulty <= 2 and is_error_like:
                easy_concept_errors += 1
        if question.problem_style in {"applied", "transfer", "mixed"}:
            applied_attempts += 1
            if is_error_like:
                applied_errors += 1
        if question.number > max(1, int(question_count_by_exam.get(exam.id, 1) * 0.7)):
            late_attempts += 1
            if is_error_like:
                late_errors_or_unanswered += 1

    easy_error_rate = easy_errors / easy_attempts if easy_attempts else 0.0
    concept_gap = _clamp((easy_concept_errors / max(easy_concept_attempts, 1)) * 0.7 + min(low_prereq_count / 3.0, 1.0) * 0.3)
    transfer_weakness = _clamp((applied_errors / max(applied_attempts, 1)) * 0.7 + (0.4 if concept_gap < 0.55 else 0.0))
    precision_accuracy = _clamp(easy_error_rate * 0.6 + (1 - feature_snapshot["habits"]["review_habit_score"] / 100.0) * 0.4)
    time_pressure = _clamp((late_errors_or_unanswered / max(late_attempts, 1)) * 0.7)

    all_histories = [score for subject in feature_snapshot["subjects"].values() for score in subject["history"]]
    instability = _clamp((pstdev(all_histories) / 18.0) if len(all_histories) >= 2 else 0.0)
    persistence_risk = _clamp(
        (1 - feature_snapshot["habits"]["consistency_score"] / 100.0) * 0.5
        + (0.2 if feature_snapshot["student"]["weekly_available_hours"] < 8 else 0.0)
        + (0.15 if feature_snapshot["student"]["disliked_subjects"] else 0.0)
    )

    scores = {
        WeaknessType.CONCEPT_GAP.value: round(concept_gap, 3),
        WeaknessType.TRANSFER_WEAKNESS.value: round(transfer_weakness, 3),
        WeaknessType.PRECISION_ACCURACY.value: round(precision_accuracy, 3),
        WeaknessType.TIME_PRESSURE.value: round(time_pressure, 3),
        WeaknessType.INSTABILITY.value: round(instability, 3),
        WeaknessType.PERSISTENCE_RISK.value: round(persistence_risk, 3),
    }

    primary = max(scores, key=scores.get)
    primary_enum = WeaknessType(primary)
    weak_subjects = sorted(
        [
            {
                "subject_code": code,
                "subject_name": item["subject_name"],
                "gap_score": item["gap_score"],
                "stability": item["stability"],
                "priority_hint": round(item["gap_score"] * (1.2 - item["stability"]), 2),
            }
            for code, item in feature_snapshot["subjects"].items()
        ],
        key=lambda item: item["priority_hint"],
        reverse=True,
    )[:3]
    weak_units = sorted(
        [
            {
                "unit_id": mastery.unit_id,
                "subject_name": mastery.subject.name,
                "unit_name": mastery.unit.name,
                "effective_mastery": round(mastery.effective_mastery, 2),
                "unit_confidence": round(mastery.unit_confidence, 2),
            }
            for mastery in mastery_records
        ],
        key=lambda item: (item["effective_mastery"], item["unit_confidence"]),
    )[:6]

    evidence = [
        {
            "type": WeaknessType.CONCEPT_GAP.value,
            "signal": "easy_concept_error_rate",
            "value": round(easy_concept_errors / max(easy_concept_attempts, 1), 3),
            "message": "쉬운 개념형 문항 오답이 반복되면 개념 복구 우선 신호로 본다.",
        },
        {
            "type": WeaknessType.TRANSFER_WEAKNESS.value,
            "signal": "applied_error_rate",
            "value": round(applied_errors / max(applied_attempts, 1), 3),
            "message": "개념형보다 응용·변형 문항에서 오답 비중이 높으면 전이 약형 신호다.",
        },
        {
            "type": WeaknessType.PRECISION_ACCURACY.value,
            "signal": "review_habit_score",
            "value": feature_snapshot["habits"]["review_habit_score"],
            "message": "검산 및 오답 루틴이 약하면 정확도 부족형 가능성이 커진다.",
        },
        {
            "type": WeaknessType.TIME_PRESSURE.value,
            "signal": "late_error_or_unanswered_rate",
            "value": round(late_errors_or_unanswered / max(late_attempts, 1), 3),
            "message": "후반 문항의 무응답·오답 집중은 시간 압박형 신호다.",
        },
        {
            "type": WeaknessType.INSTABILITY.value,
            "signal": "score_variability",
            "value": round(pstdev(all_histories), 3) if len(all_histories) >= 2 else 0.0,
            "message": "시험 간 편차가 크면 불안정형으로 본다.",
        },
        {
            "type": WeaknessType.PERSISTENCE_RISK.value,
            "signal": "consistency_score",
            "value": feature_snapshot["habits"]["consistency_score"],
            "message": "지속성 지표와 비선호 과목 회피는 지속성 취약형 신호다.",
        },
    ]

    average_unit_confidence = sum(m.unit_confidence for m in mastery_records) / max(len(mastery_records), 1)
    confidence_score = _clamp((feature_snapshot["overall"]["exam_count"] / 3.0) * 0.6 + average_unit_confidence * 0.4)
    low_confidence_flag = confidence_score < 0.45 or feature_snapshot["overall"]["low_data"]

    coaching_lookup = {
        WeaknessType.CONCEPT_GAP: "지금은 속도보다 개념 연결을 다시 세우는 단계입니다. 쉬운 개념형 확인 문제로 기초를 단단히 만들면 다음 전략의 효율이 올라갑니다.",
        WeaknessType.TRANSFER_WEAKNESS: "개념 이해는 어느 정도 쌓였으니, 대표 유형을 변형해 보는 연습으로 응용 전환 능력을 키우는 것이 우선입니다.",
        WeaknessType.PRECISION_ACCURACY: "풀 수 있는 문제를 놓치지 않도록 검산 루틴과 오답 원인 기록을 붙이면 점수 회수가 빠르게 일어날 수 있습니다.",
        WeaknessType.TIME_PRESSURE: "실력을 다 보여주지 못하는 구간이 있어 제한시간 루틴과 풀이 순서 최적화가 우선입니다.",
        WeaknessType.INSTABILITY: "실력은 있지만 시험마다 흔들리는 폭이 커서, 난도 단계화와 시험 전 루틴 고정이 중요합니다.",
        WeaknessType.PERSISTENCE_RISK: "작은 목표를 자주 완료하는 방식으로 공부를 끊기지 않게 만드는 것이 가장 먼저입니다.",
    }

    instructor_lookup = {
        WeaknessType.CONCEPT_GAP: "쉬운 개념형 오답과 선행 단원 저이해도가 함께 보여 개념 결손형으로 분류했습니다.",
        WeaknessType.TRANSFER_WEAKNESS: "개념형 대비 응용형 오답 비율이 높아 적용 전이 약형으로 보입니다.",
        WeaknessType.PRECISION_ACCURACY: "쉬운 문항 실수와 낮은 복습 루틴 점수로 정확도 부족형 신호가 강합니다.",
        WeaknessType.TIME_PRESSURE: "후반부 무응답/오답 집중 패턴이 확인되어 시간 압박형으로 분류했습니다.",
        WeaknessType.INSTABILITY: "시험 간 성과 편차가 커 루틴 안정화가 필요한 불안정형으로 해석했습니다.",
        WeaknessType.PERSISTENCE_RISK: "지속성 지표와 비선호 과목 회피가 함께 나타나 지속성 취약형으로 판단했습니다.",
    }

    if low_confidence_flag:
        coaching_message = "현재 데이터 신뢰도가 낮아 추가 시험 데이터와 학습 습관 입력을 먼저 확보하는 것이 좋습니다. 현재 전략은 임시 가이드로 활용하세요."
        instructor_summary = "데이터 신뢰도가 낮아 저신뢰도 배지를 부여했습니다. 추가 데이터 수집을 우선 권장합니다."
    else:
        coaching_message = coaching_lookup[primary_enum]
        instructor_summary = instructor_lookup[primary_enum]

    return {
        "primary_weakness_type": primary_enum,
        "weakness_scores": scores,
        "weak_subjects": weak_subjects,
        "weak_units": weak_units,
        "evidence": evidence,
        "feature_snapshot": feature_snapshot,
        "confidence_score": round(confidence_score, 3),
        "low_confidence_flag": low_confidence_flag,
        "coaching_message": coaching_message,
        "instructor_summary": instructor_summary,
    }
