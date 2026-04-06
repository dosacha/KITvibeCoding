from __future__ import annotations

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..engines.features import build_student_features
from ..models import (
    Academy,
    ClassGroup,
    Exam,
    Question,
    StudentProfile,
    StudentResult,
    Subject,
    TargetUniversityProfile,
    UniversityScorePolicy,
)
from ..services.analytics import get_latest_diagnosis, get_latest_strategy


WEAKNESS_TYPE_TO_FRONTEND = {
    "concept_gap": "wt1",
    "calculation_mistake": "wt2",
    "time_pressure": "wt3",
    "prerequisite_gap": "wt4",
    "type_bias": "wt5",
    "high_variability": "wt6",
}

WEAKNESS_TYPE_LABELS = {
    "wt1": "개념 이해 보완",
    "wt2": "계산 실수 주의",
    "wt3": "시간 관리 보완",
    "wt4": "선행 개념 보완",
    "wt5": "문제 유형 편중",
    "wt6": "성적 흐름 불안정",
}

FRONTEND_SUBJECT_MAP = {
    "KOR": {"subjectId": "s1", "subjectName": "국어"},
    "MATH": {"subjectId": "s2", "subjectName": "수학"},
    "ENG": {"subjectId": "s3", "subjectName": "영어"},
    "SCI": {"subjectId": "s4", "subjectName": "과학탐구"},
    "SOC": {"subjectId": "s5", "subjectName": "사회탐구"},
}


def _parse_frontend_student_id(student_id: str) -> int:
    if student_id.startswith("st"):
        student_id = student_id[2:]
    return int(student_id)


def _build_consult_priority(gap_score: float) -> str:
    if gap_score >= 20:
        return "high"
    if gap_score >= 8:
        return "medium"
    return "low"


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


def _build_class_group_name(class_groups: dict[int, ClassGroup], student_profile: StudentProfile) -> str | None:
    if not student_profile.class_group_id:
        return None
    class_group = class_groups.get(student_profile.class_group_id)
    return class_group.name if class_group else None


def _build_frontend_weakness_types(diagnosis) -> list[str]:
    if not diagnosis:
        return []

    weakness_type_ids: list[str] = []
    primary_id = WEAKNESS_TYPE_TO_FRONTEND.get(diagnosis.primary_weakness_type.value)
    if primary_id:
        weakness_type_ids.append(primary_id)

    for weakness_type, score in (diagnosis.weakness_scores or {}).items():
        if score < 0.7:
            continue
        mapped = WEAKNESS_TYPE_TO_FRONTEND.get(weakness_type)
        if mapped and mapped not in weakness_type_ids:
            weakness_type_ids.append(mapped)
    return weakness_type_ids


def _student_results_by_student(db: Session) -> tuple[dict[int, list[StudentResult]], dict[int, Exam]]:
    results = db.query(StudentResult).order_by(StudentResult.created_at.desc()).all()
    exams = {exam.id: exam for exam in db.query(Exam).all()}
    results_by_student: dict[int, list[StudentResult]] = {}
    for result in results:
        results_by_student.setdefault(result.student_profile_id, []).append(result)
    return results_by_student, exams


def _build_recent_exam_items(student_results: list[StudentResult], exams: dict[int, Exam]) -> list[dict]:
    recent_exams: list[dict] = []
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
    return list(reversed(recent_exams))


def _build_student_list_item(
    db: Session,
    student_profile: StudentProfile,
    class_groups: dict[int, ClassGroup],
    student_results: list[StudentResult],
    exams: dict[int, Exam],
) -> dict:
    diagnosis = get_latest_diagnosis(db, student_profile.id)
    target_gap = {}
    if diagnosis and diagnosis.feature_snapshot:
        target_gap = diagnosis.feature_snapshot.get("target_gap", {})
    gap_score = float(target_gap.get("gap", 0.0))

    return {
        "id": f"st{student_profile.id}",
        "name": student_profile.user.full_name,
        "grade": student_profile.grade_level,
        "classGroup": _build_class_group_name(class_groups, student_profile),
        "targetUniv": _build_target_university_label(db, student_profile),
        "weaknessTypes": _build_frontend_weakness_types(diagnosis),
        "recentExams": _build_recent_exam_items(student_results, exams),
        "consultPriority": _build_consult_priority(gap_score),
        "gapScore": round(gap_score, 2),
    }


def _recommend_subject_target(current_score: float, target_gap: dict, subject_code: str) -> float:
    target_score = float(target_gap.get("target_score", current_score))
    gap_score = max(0.0, float(target_gap.get("gap", 0.0)))
    subject_weights = target_gap.get("subject_weights", {}) or {}
    total_weight = sum(subject_weights.values()) or 1.0
    weight = float(subject_weights.get(subject_code, 0.0))
    weighted_bonus = gap_score * ((weight / total_weight) + 0.35)
    return round(min(100.0, max(current_score, target_score, current_score + weighted_bonus)), 2)


def list_frontend_students(db: Session) -> list[dict]:
    student_profiles = db.query(StudentProfile).all()
    class_groups = {item.id: item for item in db.query(ClassGroup).all()}
    results_by_student, exams = _student_results_by_student(db)

    student_items = [
        _build_student_list_item(
            db,
            student_profile,
            class_groups,
            results_by_student.get(student_profile.id, []),
            exams,
        )
        for student_profile in student_profiles
    ]
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
                "status": "completed" if exam.exam_date <= date.today() else "scheduled",
                "subject": FRONTEND_SUBJECT_MAP.get(subject.code, {}).get("subjectName", subject.name) if subject else "전체 과목",
                "questionCount": int(question_count),
                "avgScore": round(float(avg_score), 2) if avg_score is not None else None,
                "participantCount": int(participant_count),
            }
        )
    return exam_items


def get_frontend_metadata(db: Session) -> dict:
    academies = db.query(Academy).order_by(Academy.name.asc()).all()
    subjects = db.query(Subject).order_by(Subject.name.asc()).all()
    return {
        "academies": [{"id": academy.id, "name": academy.name} for academy in academies],
        "subjects": [{"id": subject.id, "code": subject.code, "name": subject.name} for subject in subjects],
    }


def get_frontend_instructor_dashboard(db: Session) -> dict:
    students = list_frontend_students(db)
    exams = list_frontend_exams(db)
    student_profiles = db.query(StudentProfile).all()
    strategies = {item.id: get_latest_strategy(db, item.id) for item in student_profiles}

    weakness_distribution: list[dict] = []
    for weakness_id, label in WEAKNESS_TYPE_LABELS.items():
        count = len([student for student in students if weakness_id in student["weaknessTypes"]])
        if count > 0:
            weakness_distribution.append({"weaknessTypeId": weakness_id, "label": label, "count": count})

    all_units: list[dict] = []
    subject_code_by_id = {subject.id: subject.code for subject in db.query(Subject).all()}
    for student_profile in student_profiles:
        features = build_student_features(db, student_profile)
        for unit in features.get("unit_mastery", []):
            all_units.append(
                {
                    "unitId": unit["unit_id"],
                    "unitName": unit["unit_name"],
                    "subjectCode": subject_code_by_id.get(unit["subject_id"], ""),
                    "mastery": unit["mastery"],
                }
            )
    all_units.sort(key=lambda item: item["mastery"])

    recent_strategies: list[dict] = []
    student_lookup = {item["id"]: item for item in students}
    for student_profile in student_profiles:
        strategy = strategies.get(student_profile.id)
        if not strategy:
            continue
        frontend_student_id = f"st{student_profile.id}"
        student_item = student_lookup.get(frontend_student_id)
        if not student_item:
            continue
        recent_strategies.append(
            {
                "studentId": frontend_student_id,
                "studentName": student_item["name"],
                "consultPriority": student_item["consultPriority"],
                "weaknessTypes": student_item["weaknessTypes"],
                "summary": strategy.natural_language_summary,
            }
        )

    priority_order = {"high": 0, "medium": 1, "low": 2}
    recent_strategies.sort(key=lambda item: (priority_order.get(item["consultPriority"], 9), item["studentName"]))

    latest_avg = next((exam["avgScore"] for exam in exams if exam["avgScore"] is not None), None)
    high_priority_count = len([student for student in students if student["consultPriority"] == "high"])

    return {
        "stats": [
            {"label": "관리 학생 수", "value": f"{len(students)}", "sub": "진단 데이터가 있는 학생 기준"},
            {"label": "우선 상담 학생", "value": f"{high_priority_count}", "sub": "목표 대비 격차 기준"},
            {"label": "최근 시험 평균", "value": f"{round(latest_avg, 1)}" if latest_avg is not None else "-", "sub": "가장 최근 집계 시험"},
            {"label": "저장된 전략", "value": f"{len(recent_strategies)}", "sub": "분석 완료 학생 기준"},
        ],
        "consultPriorityStudents": students[:4],
        "weaknessDistribution": weakness_distribution,
        "examTrend": [
            {"name": exam["name"], "averageScore": exam["avgScore"]}
            for exam in reversed(exams)
            if exam["avgScore"] is not None
        ],
        "weakUnits": all_units[:5],
        "recentStrategies": recent_strategies[:3],
    }


def get_frontend_student_detail(db: Session, frontend_student_id: str) -> dict | None:
    student_profile_id = _parse_frontend_student_id(frontend_student_id)
    student_profile = db.get(StudentProfile, student_profile_id)
    if not student_profile:
        return None

    class_groups = {item.id: item for item in db.query(ClassGroup).all()}
    results_by_student, exams = _student_results_by_student(db)
    student_results = results_by_student.get(student_profile.id, [])
    student_item = _build_student_list_item(db, student_profile, class_groups, student_results, exams)

    features = build_student_features(db, student_profile)
    diagnosis = get_latest_diagnosis(db, student_profile.id)
    strategy = get_latest_strategy(db, student_profile.id)
    target_gap = features.get("target_gap", {})
    preferred_subjects = set(features.get("preferred_subjects", []))
    subject_code_by_id = {subject.id: subject.code for subject in db.query(Subject).all()}

    subjects: list[dict] = []
    for subject_code, current_score in features.get("latest_scores", {}).items():
        subject_meta = FRONTEND_SUBJECT_MAP.get(
            subject_code,
            {"subjectId": f"custom-{subject_code.lower()}", "subjectName": subject_code},
        )
        subjects.append(
            {
                "subjectId": subject_meta["subjectId"],
                "subjectCode": subject_code,
                "subjectName": subject_meta["subjectName"],
                "currentScore": current_score,
                "targetScore": _recommend_subject_target(current_score, target_gap, subject_code),
                "trend": features.get("score_trends", {}).get(subject_code, []),
                "stability": round(features.get("stability_index", 0.0), 4),
                "universityWeight": float(target_gap.get("subject_weights", {}).get(subject_code, 0.0)),
                "isPreferred": subject_code in preferred_subjects,
            }
        )
    subjects.sort(key=lambda item: item["currentScore"])

    weak_units = [
        {
            "unitId": unit["unit_id"],
            "unitName": unit["unit_name"],
            "subjectCode": subject_code_by_id.get(unit["subject_id"], ""),
            "mastery": unit["mastery"],
        }
        for unit in features.get("unit_mastery", [])[:5]
    ]

    return {
        "student": student_item,
        "subjects": subjects,
        "diagnosis": {
            "primaryWeaknessType": WEAKNESS_TYPE_TO_FRONTEND.get(diagnosis.primary_weakness_type.value) if diagnosis else None,
            "weaknessTypes": _build_frontend_weakness_types(diagnosis),
            "evidence": diagnosis.evidence if diagnosis else [],
        },
        "strategy": {
            "summary": strategy.natural_language_summary if strategy else "",
            "studentSummary": strategy.structured_plan.get("student_summary", "") if strategy else "",
            "instructorSummary": strategy.structured_plan.get("instructor_summary", "") if strategy else "",
            "confidenceLevel": strategy.structured_plan.get("confidence_level", "") if strategy else "",
            "confidenceMessage": strategy.structured_plan.get("confidence_message", "") if strategy else "",
            "dataSufficiency": strategy.structured_plan.get("data_sufficiency", {}) if strategy else {},
            "prioritySubjects": strategy.structured_plan.get("priority_subjects", []) if strategy else [],
            "priorityUnits": strategy.structured_plan.get("priority_units", []) if strategy else [],
            "timeAllocation": strategy.structured_plan.get("time_allocation", []) if strategy else [],
            "coachingPoints": strategy.structured_plan.get("coaching_points", []) if strategy else [],
            "antiPatterns": strategy.structured_plan.get("anti_patterns", []) if strategy else [],
        },
        "weakUnits": weak_units,
        "targetGap": target_gap,
    }


def get_frontend_student_detail_by_user(db: Session, user_id: int) -> dict | None:
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if not student_profile:
        return None
    return get_frontend_student_detail(db, f"st{student_profile.id}")


def list_frontend_university_policies(db: Session) -> list[dict]:
    policies = db.query(UniversityScorePolicy).order_by(UniversityScorePolicy.university_name.asc()).all()
    return [
        {
            "id": policy.id,
            "universityName": policy.university_name,
            "admissionType": policy.admission_type,
            "subjectWeights": policy.subject_weights or {},
            "requiredSubjects": policy.required_subjects or [],
            "bonusRules": policy.bonus_rules or [],
            "targetScore": policy.target_score,
            "notes": policy.notes,
        }
        for policy in policies
    ]
