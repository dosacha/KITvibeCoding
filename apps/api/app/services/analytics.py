from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session, joinedload

from ..engines.diagnosis import diagnose_student
from ..engines.features import build_feature_snapshot
from ..engines.strategy import generate_strategies
from ..models import (
    Exam,
    LearningHabitSnapshot,
    Question,
    QuestionStatisticsSnapshot,
    QuestionUnitMapping,
    RecalculationJob,
    RecalculationStatus,
    StudentDiagnosis,
    StudentProfile,
    StudentQuestionResponse,
    StudentResult,
    StudentStrategy,
    StrategyStatus,
    SubmissionStatus,
    TargetUniversityProfile,
    UnitMasteryCurrent,
    UnitMasteryHistory,
)
from .audit import mark_job_completed, mark_job_failed, mark_job_processing, record_audit


logger = logging.getLogger("unitflow.strategy_explanation")

VALID_RESPONSE_STATUSES = {SubmissionStatus.SUBMITTED, SubmissionStatus.UNANSWERED}
MASTERY_COUNT_STATUSES = {SubmissionStatus.SUBMITTED, SubmissionStatus.UNANSWERED}


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def compute_question_statistics(db: Session, *, exam_ids: list[int] | None = None) -> dict[int, QuestionStatisticsSnapshot]:
    question_query = db.query(Question).options(joinedload(Question.responses))
    if exam_ids:
        question_query = question_query.filter(Question.exam_id.in_(exam_ids))
    question_snapshots: dict[int, QuestionStatisticsSnapshot] = {}
    for question in question_query.all():
        valid_responses = [response for response in question.responses if response.response_status in VALID_RESPONSE_STATUSES]
        valid_response_count = len(valid_responses)
        error_count = sum(1 for response in valid_responses if response.is_correct is False or response.response_status == SubmissionStatus.UNANSWERED)
        error_rate = (error_count / valid_response_count) if valid_response_count else 0.0
        empirical_difficulty = 1 + 4 * error_rate
        confidence = min(1.0, valid_response_count / 30)
        final_difficulty = question.teacher_difficulty * (1 - confidence) + empirical_difficulty * confidence
        snapshot = QuestionStatisticsSnapshot(
            question_id=question.id,
            exam_id=question.exam_id,
            error_rate=round(error_rate, 4),
            valid_response_count=valid_response_count,
            empirical_difficulty=round(empirical_difficulty, 4),
            confidence=round(confidence, 4),
            final_difficulty=round(final_difficulty, 4),
        )
        db.add(snapshot)
        question_snapshots[question.id] = snapshot
    db.flush()
    return question_snapshots


def _recency_weight(latest_exam_date: date, exam_date: date) -> float:
    days_delta = max((latest_exam_date - exam_date).days, 0)
    return max(0.4, 1 - days_delta / 180)


def compute_unit_mastery_for_student(
    db: Session,
    *,
    student: StudentProfile,
    results: list[StudentResult],
    question_snapshots: dict[int, QuestionStatisticsSnapshot],
) -> list[UnitMasteryCurrent]:
    db.query(UnitMasteryCurrent).filter(UnitMasteryCurrent.student_profile_id == student.id).delete()
    latest_exam_date = max((result.exam.exam_date for result in results), default=date.today())
    recent_cutoff = date.fromordinal(max(latest_exam_date.toordinal() - 60, 1))

    weights_by_unit: dict[int, float] = defaultdict(float)
    earned_by_unit: dict[int, float] = defaultdict(float)
    recent_weights_by_unit: dict[int, float] = defaultdict(float)
    recent_earned_by_unit: dict[int, float] = defaultdict(float)
    attempt_count_by_unit: dict[int, int] = defaultdict(int)
    subject_lookup: dict[int, int] = {}
    unit_lookup: dict[int, Any] = {}
    latest_exam_lookup: dict[int, date] = {}

    for result in results:
        for response in result.responses:
            if response.response_status not in MASTERY_COUNT_STATUSES:
                continue
            snapshot = question_snapshots.get(response.question_id)
            if snapshot is None:
                continue
            is_correct = response.is_correct is True
            recency_weight = _recency_weight(latest_exam_date, result.exam.exam_date)
            for mapping in response.question.unit_mappings:
                weighted_difficulty = 0.6 + 0.4 * (snapshot.final_difficulty / 5)
                contribution_weight = mapping.weight * weighted_difficulty * recency_weight
                weights_by_unit[mapping.unit_id] += contribution_weight
                earned_by_unit[mapping.unit_id] += contribution_weight if is_correct else 0.0
                if result.exam.exam_date >= recent_cutoff:
                    recent_weights_by_unit[mapping.unit_id] += contribution_weight
                    recent_earned_by_unit[mapping.unit_id] += contribution_weight if is_correct else 0.0
                attempt_count_by_unit[mapping.unit_id] += 1
                subject_lookup[mapping.unit_id] = mapping.unit.subject_id
                unit_lookup[mapping.unit_id] = mapping.unit
                latest_exam_lookup[mapping.unit_id] = max(result.exam.exam_date, latest_exam_lookup.get(mapping.unit_id, result.exam.exam_date))

    records: list[UnitMasteryCurrent] = []
    for unit_id, total_weight in weights_by_unit.items():
        mastery_current = 100 * earned_by_unit[unit_id] / total_weight if total_weight else 0.0
        recent_weight = recent_weights_by_unit.get(unit_id, 0.0)
        recent_mastery = 100 * recent_earned_by_unit[unit_id] / recent_weight if recent_weight else mastery_current
        effective_mastery = 0.7 * mastery_current + 0.3 * recent_mastery
        attempt_count = attempt_count_by_unit.get(unit_id, 0)
        unit_confidence = min(1.0, attempt_count / 20)
        current_record = UnitMasteryCurrent(
            student_profile_id=student.id,
            unit_id=unit_id,
            subject_id=subject_lookup[unit_id],
            mastery_current=round(mastery_current, 4),
            recent_mastery=round(recent_mastery, 4),
            effective_mastery=round(effective_mastery, 4),
            unit_confidence=round(unit_confidence, 4),
            attempt_count=attempt_count,
            last_exam_date=latest_exam_lookup.get(unit_id),
        )
        db.add(current_record)
        history_record = UnitMasteryHistory(
            student_profile_id=student.id,
            unit_id=unit_id,
            subject_id=subject_lookup[unit_id],
            exam_id=results[-1].exam_id if results else None,
            mastery_current=round(mastery_current, 4),
            recent_mastery=round(recent_mastery, 4),
            effective_mastery=round(effective_mastery, 4),
            unit_confidence=round(unit_confidence, 4),
            attempt_count=attempt_count,
        )
        db.add(history_record)
        records.append(current_record)
    db.flush()
    return records


def _archive_pending_strategies(db: Session, *, student_id: int) -> None:
    db.query(StudentStrategy).filter(
        StudentStrategy.student_profile_id == student_id,
        StudentStrategy.status.in_([StrategyStatus.DRAFT, StrategyStatus.PENDING_REVIEW, StrategyStatus.HELD]),
    ).update({StudentStrategy.status: StrategyStatus.ARCHIVED}, synchronize_session=False)


def recalculate_student_bundle(
    db: Session,
    *,
    student_id: int,
    actor_user_id: int | None = None,
    trigger: str = "manual",
) -> dict[str, Any]:
    student = (
        db.query(StudentProfile)
        .options(
            joinedload(StudentProfile.user),
            joinedload(StudentProfile.habits),
            joinedload(StudentProfile.goals).joinedload(TargetUniversityProfile.policy),
        )
        .filter(StudentProfile.id == student_id)
        .one()
    )
    results = (
        db.query(StudentResult)
        .options(
            joinedload(StudentResult.exam).joinedload(Exam.subject),
            joinedload(StudentResult.subject),
            joinedload(StudentResult.responses)
            .joinedload(StudentQuestionResponse.question)
            .joinedload(Question.unit_mappings)
            .joinedload(QuestionUnitMapping.unit),
        )
        .filter(StudentResult.student_profile_id == student.id)
        .order_by(StudentResult.exam_id.asc())
        .all()
    )
    exam_ids = [result.exam_id for result in results]
    question_snapshots = compute_question_statistics(db, exam_ids=exam_ids)
    mastery_records = compute_unit_mastery_for_student(db, student=student, results=results, question_snapshots=question_snapshots)
    latest_habit = max(student.habits, key=lambda item: item.captured_at, default=None)
    active_goals = [goal for goal in sorted(student.goals, key=lambda item: item.priority_order) if goal.is_active]
    primary_goal = active_goals[0] if active_goals else None
    feature_snapshot = build_feature_snapshot(
        student=student,
        results=results,
        mastery_records=mastery_records,
        primary_goal=primary_goal,
        latest_habit=latest_habit,
    )
    all_responses = [response for result in results for response in result.responses]
    diagnosis_payload = diagnose_student(
        student=student,
        feature_snapshot=feature_snapshot,
        mastery_records=mastery_records,
        results=results,
        responses=all_responses,
        latest_habit=latest_habit,
    )
    diagnosis = StudentDiagnosis(
        student_profile_id=student.id,
        primary_weakness_type=diagnosis_payload["primary_weakness_type"],
        weakness_scores=diagnosis_payload["weakness_scores"],
        weak_subjects=_json_safe(diagnosis_payload["weak_subjects"]),
        weak_units=_json_safe(diagnosis_payload["weak_units"]),
        evidence=_json_safe(diagnosis_payload["evidence"]),
        feature_snapshot=_json_safe(diagnosis_payload["feature_snapshot"]),
        confidence_score=diagnosis_payload["confidence_score"],
        low_confidence_flag=diagnosis_payload["low_confidence_flag"],
        coaching_message=diagnosis_payload["coaching_message"],
        instructor_summary=diagnosis_payload["instructor_summary"],
    )
    db.add(diagnosis)
    db.flush()

    _archive_pending_strategies(db, student_id=student.id)
    generated = generate_strategies(feature_snapshot=feature_snapshot, diagnosis_payload=diagnosis_payload)
    strategy_objects: list[StudentStrategy] = []
    for item in generated:
        strategy = StudentStrategy(
            student_profile_id=student.id,
            diagnosis_id=diagnosis.id,
            goal_id=primary_goal.id if primary_goal else None,
            variant=item["variant"],
            status=StrategyStatus.PENDING_REVIEW,
            structured_plan=_json_safe(item["structured_plan"]),
            natural_language_summary=item["natural_language_summary"],
            rationale=_json_safe(item["rationale"]),
            risk_factors=_json_safe(item["risk_factors"]),
            instructor_explanation=item["instructor_explanation"],
            student_coaching=item["student_coaching"],
        )
        db.add(strategy)
        strategy_objects.append(strategy)
    db.flush()
    for strategy in strategy_objects:
        explanation = (strategy.structured_plan or {}).get("explanation") or {}
        logger.info(
            json.dumps(
                {
                    "event": "strategy_explanation_persisted",
                    "strategy_id": strategy.id,
                    "student_profile_id": student.id,
                    "explanation_source": explanation.get("explanation_source", "deterministic_fallback"),
                    "model": explanation.get("explanation_model"),
                    "llm_error_type": None,
                    "llm_error_message": None,
                    "latency_ms": None,
                },
                ensure_ascii=False,
            )
        )

    record_audit(
        db,
        actor_user_id=actor_user_id,
        entity_type="student_profiles",
        entity_id=student.id,
        action="recalculate",
        payload={
            "trigger": trigger,
            "diagnosis_id": diagnosis.id,
            "strategy_ids": [strategy.id for strategy in strategy_objects],
            "low_confidence": diagnosis.low_confidence_flag,
        },
    )
    db.commit()
    return {
        "diagnosis": diagnosis,
        "strategies": strategy_objects,
        "feature_snapshot": feature_snapshot,
    }


def process_recalculation_job(db: Session, job: RecalculationJob) -> RecalculationJob:
    mark_job_processing(job)
    db.flush()
    try:
        student_ids = job.scope.get("student_ids") or []
        if not student_ids and job.entity_type == "student_profiles" and job.entity_id:
            student_ids = [job.entity_id]
        recalculated = []
        for student_id in student_ids:
            recalculate_student_bundle(db, student_id=student_id, actor_user_id=job.requested_by_user_id, trigger=job.trigger.value)
            recalculated.append(student_id)
        mark_job_completed(job, details={"student_ids": recalculated, "trigger": job.trigger.value})
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        mark_job_failed(job, details={"error": str(exc)})
        db.commit()
    return job


def process_queued_jobs(db: Session, *, limit: int = 20) -> list[RecalculationJob]:
    jobs = (
        db.query(RecalculationJob)
        .filter(RecalculationJob.status == RecalculationStatus.QUEUED)
        .order_by(RecalculationJob.created_at.asc())
        .limit(limit)
        .all()
    )
    processed = []
    for job in jobs:
        processed.append(process_recalculation_job(db, job))
    return processed
