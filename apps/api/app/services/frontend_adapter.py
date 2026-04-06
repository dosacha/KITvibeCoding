from __future__ import annotations

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import (
    Exam,
    Question,
    Role,
    StudentDiagnosis,
    StudentProfile,
    StudentResult,
    Subject,
    TargetUniversityProfile,
    UniversityScorePolicy,
)
from ..services.analytics import get_latest_diagnosis


WEAKNESS_TYPE_TO_FRONTEND = {
    "concept_gap": "wt1",
    "calculation_mistake": "wt2",
    "time_pressure": "wt3",
    "prerequisite_gap": "wt4",
    "type_bias": "wt5",
    "high_variability": "wt6",
}


def _build_target_university_label(db: Session, student_profile: StudentProfile) -> str | None:
    if not student_profile.target_university_profile_id:
        return None
    target_profile = db.get(TargetUniversityProfile, student_profile.target_university_profile_id)
    if not target_profile:
        return None
    policy = db.get(UniversityScorePolicy, target_profile.policy_id)
    if not policy:
        return target_profile.target_department
    return f"{policy.university_name} {target_profile.target_department}"


def _build_consult_priority(gap_score: float) -> str:
    if gap_score >= 20:
        return "high"
    if gap_score >= 8:
        return "medium"
    return "low"


def list_frontend_students(db: Session) -> list[dict]:
    student_profiles = db.query(StudentProfile).all()
    results = (
        db.query(StudentResult)
        .order_by(StudentResult.created_at.desc())
        .all()
    )
    exams = {exam.id: exam for exam in db.query(Exam).all()}

    results_by_student: dict[int, list[StudentResult]] = {}
    for result in results:
        results_by_student.setdefault(result.student_profile_id, []).append(result)

    student_items: list[dict] = []
    for student_profile in student_profiles:
        diagnosis = get_latest_diagnosis(db, student_profile.id)
        weak_type_ids: list[str] = []
        if diagnosis:
            primary_id = WEAKNESS_TYPE_TO_FRONTEND.get(diagnosis.primary_weakness_type.value)
            if primary_id:
                weak_type_ids.append(primary_id)
            for weakness_type, score in (diagnosis.weakness_scores or {}).items():
                if score >= 0.7:
                    mapped = WEAKNESS_TYPE_TO_FRONTEND.get(weakness_type)
                    if mapped and mapped not in weak_type_ids:
                        weak_type_ids.append(mapped)

        feature_gap = 0.0
        if diagnosis and diagnosis.feature_snapshot:
            feature_gap = float(diagnosis.feature_snapshot.get("target_gap", {}).get("gap", 0.0))

        recent_exams = []
        student_results = results_by_student.get(student_profile.id, [])
        for result in student_results[:4]:
            exam = exams.get(result.exam_id)
            if not exam:
                continue
            recent_exams.append(
                {
                    "id": f"e{exam.id}",
                    "name": exam.name,
                    "date": exam.exam_date.isoformat(),
                    "totalScore": result.raw_score,
                    "maxScore": exam.total_score,
                }
            )

        student_items.append(
            {
                "id": f"st{student_profile.id}",
                "name": student_profile.user.full_name,
                "grade": student_profile.grade_level,
                "classGroup": getattr(student_profile, "class_group_id", None) and f"{student_profile.class_group_id}반" or None,
                "targetUniv": _build_target_university_label(db, student_profile),
                "weaknessTypes": weak_type_ids,
                "recentExams": list(reversed(recent_exams)),
                "consultPriority": _build_consult_priority(feature_gap),
                "gapScore": round(feature_gap, 2),
            }
        )

    student_items.sort(key=lambda item: item["gapScore"], reverse=True)
    return student_items


def list_frontend_exams(db: Session) -> list[dict]:
    exams = db.query(Exam).order_by(Exam.exam_date.desc()).all()
    subject_map = {subject.id: subject for subject in db.query(Subject).all()}

    exam_items: list[dict] = []
    for exam in exams:
        question_count = db.query(func.count(Question.id)).filter(Question.exam_id == exam.id).scalar() or 0
        participant_count = db.query(func.count(StudentResult.id)).filter(StudentResult.exam_id == exam.id).scalar() or 0
        avg_score = db.query(func.avg(StudentResult.raw_score)).filter(StudentResult.exam_id == exam.id).scalar()
        subject = subject_map.get(exam.subject_id)
        exam_items.append(
            {
                "id": f"e{exam.id}",
                "name": exam.name,
                "date": exam.exam_date.isoformat(),
                "status": "완료" if exam.exam_date <= date.today() else "예정",
                "subject": subject.name if subject else "전과목",
                "questionCount": int(question_count),
                "avgScore": round(float(avg_score), 2) if avg_score is not None else None,
                "participantCount": int(participant_count),
            }
        )
    return exam_items
