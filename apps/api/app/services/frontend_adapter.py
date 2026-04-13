from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from sqlalchemy.orm import Session, joinedload

from ..models import (
    ClassGroup,
    Exam,
    Question,
    ReviewDecision,
    Role,
    StudentDiagnosis,
    StudentProfile,
    StudentResult,
    StudentStrategy,
    StrategyStatus,
    SubmissionStatus,
    Subject,
    Unit,
    User,
)
from .domain import _ensure_same_academy, get_student_for_user, get_visible_students_query, list_exams


def _latest_diagnosis(student: StudentProfile) -> StudentDiagnosis | None:
    return max(student.diagnoses, key=lambda item: item.computed_at, default=None)


_APPROVAL_DECISIONS = {ReviewDecision.APPROVE, ReviewDecision.REVISE}


def _strategy_selected_at(strategy: StudentStrategy) -> Any:
    approved_reviews = [
        review.reviewed_at
        for review in strategy.reviews
        if review.decision in _APPROVAL_DECISIONS
    ]
    return max(approved_reviews, default=strategy.generated_at)


def _latest_approved_strategy(student: StudentProfile) -> StudentStrategy | None:
    approved = [strategy for strategy in student.strategies if strategy.status == StrategyStatus.APPROVED]
    if approved:
        return max(approved, key=_strategy_selected_at)
    return None


def _viewer_capabilities(current_user: User) -> dict[str, Any]:
    role_labels = {
        Role.ADMIN: "운영 관리자",
        Role.INSTRUCTOR: "강사",
        Role.STUDENT: "학생",
    }
    return {
        "id": current_user.id,
        "role": current_user.role.value,
        "role_label": role_labels.get(current_user.role, current_user.role.value),
        "can_manage_policies": current_user.role == Role.ADMIN,
        "can_view_audit": current_user.role == Role.ADMIN,
        "can_manage_exams": current_user.role in {Role.ADMIN, Role.INSTRUCTOR},
        "can_review_strategies": current_user.role in {Role.ADMIN, Role.INSTRUCTOR},
    }


def build_student_dashboard(db: Session, *, current_user: User) -> dict[str, Any]:
    if current_user.role != Role.STUDENT:
        raise ValueError("Student dashboard requires a student user.")
    student = get_visible_students_query(db, current_user).one()
    diagnosis = _latest_diagnosis(student)
    approved_strategy = _latest_approved_strategy(student)
    primary_goal = next((goal for goal in sorted(student.goals, key=lambda item: item.priority_order) if goal.is_active), None)

    return {
        "student": {
            "id": student.id,
            "name": student.user.full_name,
            "grade_level": student.grade_level,
            "weekly_available_hours": student.weekly_available_hours,
        },
        "primary_goal": None
        if not primary_goal
        else {
            "university_name": primary_goal.policy.university_name,
            "admission_type": primary_goal.policy.admission_type,
            "target_department": primary_goal.target_department,
            "priority_order": primary_goal.priority_order,
        },
        "diagnosis": None
        if not diagnosis
        else {
            "primary_weakness_type": diagnosis.primary_weakness_type.value,
            "low_confidence_flag": diagnosis.low_confidence_flag,
            "coaching_message": diagnosis.coaching_message,
            "weak_units": diagnosis.weak_units,
            "weak_subjects": diagnosis.weak_subjects,
        },
        "approved_strategy": None
        if not approved_strategy
        else {
            "variant": approved_strategy.variant,
            "summary": approved_strategy.natural_language_summary,
            "plan": approved_strategy.structured_plan,
            "student_coaching": approved_strategy.student_coaching,
            "explanation_source": (approved_strategy.structured_plan or {}).get("explanation", {}).get("explanation_source", "deterministic_fallback"),
            "explanation_model": (approved_strategy.structured_plan or {}).get("explanation", {}).get("explanation_model"),
            "explanation_generated_at": (approved_strategy.structured_plan or {}).get("explanation", {}).get("explanation_generated_at"),
        },
        "review_notice": None if approved_strategy else "강사 승인된 전략이 아직 없어, 마지막 승인본 또는 대기 상태를 기다리는 중입니다.",
    }


def build_student_detail(db: Session, *, student_id: int, current_user: User) -> dict[str, Any]:
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)
    diagnosis = _latest_diagnosis(student)
    approved_strategy = _latest_approved_strategy(student)
    latest_strategy = max(student.strategies, key=lambda item: item.generated_at, default=None)
    mastery = sorted(student.mastery_current_records, key=lambda item: item.effective_mastery)[:8]

    return {
        "student": {
            "id": student.id,
            "name": student.user.full_name,
            "class_group": student.class_group.name if student.class_group else None,
            "grade_level": student.grade_level,
            "enrollment_status": student.enrollment_status.value,
            "weekly_available_hours": student.weekly_available_hours,
            "preferred_subjects": student.preferred_subjects,
            "disliked_subjects": student.disliked_subjects,
        },
        "goals": [
            {
                "id": goal.id,
                "priority_order": goal.priority_order,
                "university_name": goal.policy.university_name,
                "admission_type": goal.policy.admission_type,
                "target_department": goal.target_department,
                "is_active": goal.is_active,
            }
            for goal in sorted(student.goals, key=lambda item: item.priority_order)
        ],
        "diagnosis": diagnosis,
        "approved_strategy": approved_strategy,
        "latest_strategy": latest_strategy,
        "unit_mastery": mastery,
        "recent_results": student.results[-6:],
    }


def build_instructor_dashboard(db: Session, *, current_user: User) -> dict[str, Any]:
    if current_user.role not in {Role.ADMIN, Role.INSTRUCTOR}:
        raise ValueError("Instructor dashboard requires staff user.")
    students = get_visible_students_query(db, current_user).all()
    class_groups: dict[int | None, dict[str, Any]] = {}

    for student in students:
        group_id = student.class_group_id
        group_name = student.class_group.name if student.class_group else "미배정"
        bucket = class_groups.setdefault(
            group_id,
            {
                "class_group_id": group_id,
                "class_group_name": group_name,
                "student_count": 0,
                "weakness_distribution": Counter(),
                "clusters": defaultdict(list),
                "remediation_candidates": [],
                "class_move_suggestions": [],
                "consultation_sentences": [],
                "scores": [],
            },
        )
        bucket["student_count"] += 1
        diagnosis = _latest_diagnosis(student)
        approved_strategy = _latest_approved_strategy(student)
        latest_strategy = max(student.strategies, key=lambda item: item.generated_at, default=None)
        latest_result = student.results[-1] if student.results else None
        latest_score = latest_result.raw_score / latest_result.exam.total_score * 100 if latest_result else 0
        bucket["scores"].append({"student": student, "score": latest_score})
        if diagnosis:
            weakness_label = diagnosis.primary_weakness_type.value
            bucket["weakness_distribution"][weakness_label] += 1
            bucket["clusters"][weakness_label].append(student.user.full_name)
            if diagnosis.low_confidence_flag or diagnosis.weak_units:
                weak_unit_name = diagnosis.weak_units[0]["unit_name"] if diagnosis.weak_units else "추가 데이터 필요"
                bucket["remediation_candidates"].append(
                    {
                        "student_id": student.id,
                        "student_name": student.user.full_name,
                        "reason": f"{weakness_label} 신호와 {weak_unit_name} 보강 필요",
                    }
                )
            bucket["consultation_sentences"].append(
                f"{student.user.full_name}: {diagnosis.instructor_summary} 학생용 코칭 문장은 '{diagnosis.coaching_message}'입니다."
            )
        if approved_strategy or latest_strategy:
            strategy = approved_strategy or latest_strategy
            bucket["consultation_sentences"].append(
                f"{student.user.full_name}: 다음 점검 일정은 {strategy.structured_plan.get('next_check_in', {}).get('date', '미설정')}입니다."
            )

    dashboard_groups = []
    for bucket in class_groups.values():
        average_score = sum(item["score"] for item in bucket["scores"]) / max(len(bucket["scores"]), 1)
        for entry in bucket["scores"]:
            if entry["score"] >= average_score + 15:
                bucket["class_move_suggestions"].append(
                    {
                        "student_id": entry["student"].id,
                        "student_name": entry["student"].user.full_name,
                        "direction": "up",
                        "suggestion": "상위반 검토",
                        "reason": f"최근 점수가 반 평균 {average_score:.1f} 대비 크게 높습니다.",
                    }
                )
            elif entry["score"] <= average_score - 15:
                bucket["class_move_suggestions"].append(
                    {
                        "student_id": entry["student"].id,
                        "student_name": entry["student"].user.full_name,
                        "direction": "support",
                        "suggestion": "보강반 검토",
                        "reason": f"최근 점수가 반 평균 {average_score:.1f} 대비 낮아 보강 우선 검토가 필요합니다.",
                    }
                )
        dashboard_groups.append(
            {
                "class_group_id": bucket["class_group_id"],
                "class_group_name": bucket["class_group_name"],
                "student_count": bucket["student_count"],
                "weakness_distribution": [
                    {"weakness_type": weakness_type, "count": count}
                    for weakness_type, count in bucket["weakness_distribution"].most_common()
                ],
                "weakness_clusters": [
                    {"label": weakness_type, "students": names, "count": len(names)}
                    for weakness_type, names in bucket["clusters"].items()
                ],
                "remediation_candidates": bucket["remediation_candidates"][:6],
                "class_move_suggestions": bucket["class_move_suggestions"][:6],
                "consultation_sentences": bucket["consultation_sentences"][:8],
            }
        )

    return {
        "summary": {
            "class_group_count": len(dashboard_groups),
            "student_count": len(students),
            "needs_review_count": sum(
                1
                for student in students
                for strategy in student.strategies
                if strategy.status == StrategyStatus.PENDING_REVIEW
            ),
        },
        "class_groups": sorted(dashboard_groups, key=lambda item: item["class_group_name"] or ""),
    }


def build_student_list(db: Session, *, current_user: User) -> list[dict[str, Any]]:
    students = get_visible_students_query(db, current_user).all()
    return [
        {
            "id": student.id,
            "full_name": student.user.full_name,
            "class_group_name": student.class_group.name if student.class_group else None,
            "primary_goal": next(
                (
                    f"{goal.policy.university_name} {goal.target_department}"
                    for goal in sorted(student.goals, key=lambda item: item.priority_order)
                    if goal.is_active
                ),
                None,
            ),
            "latest_weakness": (_latest_diagnosis(student).primary_weakness_type.value if _latest_diagnosis(student) else None),
            "latest_strategy_status": (max(student.strategies, key=lambda item: item.generated_at).status.value if student.strategies else None),
            "low_confidence_flag": (_latest_diagnosis(student).low_confidence_flag if _latest_diagnosis(student) else False),
        }
        for student in students
    ]


def build_metadata(db: Session, *, current_user: User) -> dict[str, Any]:
    from ..models import Subject, Unit, UniversityScorePolicy

    return {
        "viewer": _viewer_capabilities(current_user),
        "subjects": db.query(Subject).filter(Subject.academy_id == current_user.academy_id).order_by(Subject.name.asc()).all(),
        "units": db.query(Unit).join(Unit.subject).filter(Unit.subject.has(academy_id=current_user.academy_id)).order_by(Unit.name.asc()).all(),
        "class_groups": db.query(ClassGroup).filter(ClassGroup.academy_id == current_user.academy_id).order_by(ClassGroup.name.asc()).all(),
        "universities": db.query(UniversityScorePolicy).order_by(UniversityScorePolicy.university_name.asc()).all(),
    }


def build_frontend_exams(db: Session, *, current_user: User) -> list[dict[str, Any]]:
    exams = list_exams(db, current_user=current_user)
    return [
        {
            "id": exam.id,
            "name": exam.name,
            "subject_name": exam.subject.name,
            "class_group_name": exam.class_group.name if exam.class_group else None,
            "exam_date": exam.exam_date.isoformat(),
            "is_retake": exam.is_retake,
            "question_count": len(exam.questions),
        }
        for exam in exams
    ]


# ---------------------------------------------------------------------------
# Slice 1 — additive aggregated payloads for the operational input UI
# ---------------------------------------------------------------------------


def _load_exam_for_user(db: Session, *, exam_id: int, current_user: User) -> Exam:
    from fastapi import HTTPException, status

    exam = (
        db.query(Exam)
        .options(
            joinedload(Exam.subject),
            joinedload(Exam.class_group),
            joinedload(Exam.questions).joinedload(Question.unit_mappings),
        )
        .filter(Exam.id == exam_id)
        .one_or_none()
    )
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    _ensure_same_academy(current_user, exam.academy_id)
    if current_user.role == Role.INSTRUCTOR:
        # Instructors can only see exams that target one of their class groups
        # (or exams that are not class-pinned).
        if exam.class_group is not None and exam.class_group.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned instructor can view this exam.",
            )
    return exam


def _exam_roster(db: Session, *, exam: Exam, current_user: User) -> list[StudentProfile]:
    """Return the student roster relevant to this exam.

    Rules:
      - If the exam is pinned to a class group, the roster is that class group's
        students (filtered by visibility for instructors).
      - Otherwise, the roster is every visible student in the academy.
    """
    query = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user), joinedload(StudentProfile.class_group))
        .join(StudentProfile.user)
        .filter(User.academy_id == exam.academy_id)
    )
    if exam.class_group_id is not None:
        query = query.filter(StudentProfile.class_group_id == exam.class_group_id)
    if current_user.role == Role.INSTRUCTOR:
        query = query.join(StudentProfile.class_group).filter(ClassGroup.instructor_id == current_user.id)
    return query.order_by(StudentProfile.id.asc()).all()


def build_exam_detail(db: Session, *, exam_id: int, current_user: User) -> dict[str, Any]:
    """Aggregated payload powering the operational ExamsPage.

    Returns exam metadata, all questions with their unit mappings, the relevant
    student roster, and any existing results so the frontend can pre-fill the
    result entry table.
    """
    exam = _load_exam_for_user(db, exam_id=exam_id, current_user=current_user)
    roster = _exam_roster(db, exam=exam, current_user=current_user)

    unit_lookup: dict[int, Unit] = {}
    unit_ids = {mapping.unit_id for question in exam.questions for mapping in question.unit_mappings}
    if unit_ids:
        for unit in db.query(Unit).filter(Unit.id.in_(unit_ids)).all():
            unit_lookup[unit.id] = unit

    results = (
        db.query(StudentResult)
        .options(joinedload(StudentResult.responses))
        .filter(StudentResult.exam_id == exam.id)
        .all()
    )
    results_by_student: dict[int, StudentResult] = {result.student_profile_id: result for result in results}

    # Limit results returned to the visible roster (avoid leaking results from
    # students this user cannot see when the exam is unpinned).
    visible_student_ids = {student.id for student in roster}
    visible_results = [result for result in results if result.student_profile_id in visible_student_ids]

    return {
        "exam": {
            "id": exam.id,
            "academy_id": exam.academy_id,
            "subject_id": exam.subject_id,
            "subject_name": exam.subject.name,
            "class_group_id": exam.class_group_id,
            "class_group_name": exam.class_group.name if exam.class_group else None,
            "name": exam.name,
            "exam_date": exam.exam_date,
            "total_score": exam.total_score,
            "time_limit_minutes": exam.time_limit_minutes,
            "is_retake": exam.is_retake,
        },
        "questions": [
            {
                "id": question.id,
                "number": question.number,
                "teacher_difficulty": question.teacher_difficulty,
                "answer_key": question.answer_key,
                "points": question.points,
                "question_type": question.question_type,
                "problem_style": question.problem_style,
                "estimated_seconds": question.estimated_seconds,
                "unit_mappings": [
                    {
                        "unit_id": mapping.unit_id,
                        "unit_name": unit_lookup[mapping.unit_id].name if mapping.unit_id in unit_lookup else None,
                        "subject_id": unit_lookup[mapping.unit_id].subject_id if mapping.unit_id in unit_lookup else None,
                        "weight": mapping.weight,
                    }
                    for mapping in sorted(question.unit_mappings, key=lambda item: item.id)
                ],
            }
            for question in sorted(exam.questions, key=lambda item: item.number)
        ],
        "roster": [
            {
                "student_profile_id": student.id,
                "full_name": student.user.full_name,
                "class_group_id": student.class_group_id,
                "class_group_name": student.class_group.name if student.class_group else None,
                "enrollment_status": student.enrollment_status.value,
                "has_result": student.id in results_by_student,
                "result_status": (
                    results_by_student[student.id].result_status
                    if student.id in results_by_student
                    else None
                ),
            }
            for student in roster
        ],
        "results": [
            {
                "id": result.id,
                "student_profile_id": result.student_profile_id,
                "raw_score": result.raw_score,
                "percentile": result.percentile,
                "grade": result.grade,
                "completed_in_seconds": result.completed_in_seconds,
                "result_status": result.result_status,
                "question_breakdown": result.question_breakdown or {},
                "updated_at": result.updated_at,
                "responses": [
                    {
                        "question_id": response.question_id,
                        "selected_answer": response.selected_answer,
                        "is_correct": response.is_correct,
                        "response_status": response.response_status,
                        "time_spent_seconds": response.time_spent_seconds,
                    }
                    for response in result.responses
                ],
            }
            for result in visible_results
        ],
    }


def build_csv_template(db: Session, *, exam_id: int, current_user: User) -> dict[str, Any]:
    """Build a CSV template for ``POST /student-results/upload-csv``.

    The template lines up exactly with the columns the upload endpoint accepts:
    ``student_email`` (preferred for human entry) plus a ``q{number}`` column
    per question on the exam, and the optional aggregate columns.
    """
    exam = _load_exam_for_user(db, exam_id=exam_id, current_user=current_user)
    questions = sorted(exam.questions, key=lambda item: item.number)

    base_headers = [
        "student_email",
        "student_profile_id",
        "raw_score",
        "percentile",
        "grade",
        "completed_in_seconds",
        "result_status",
    ]
    question_headers = [f"q{question.number}" for question in questions]
    headers = base_headers + question_headers

    sample_answer_for = lambda question: question.answer_key or "A"  # noqa: E731
    sample_rows: list[list[str]] = [
        [
            "student@unitflow.ai",
            "",
            "",
            "",
            "",
            "",
            "submitted",
            *[sample_answer_for(question) for question in questions],
        ],
        [
            "",
            "1",
            "",
            "",
            "",
            "",
            "absent",
            *["" for _ in questions],
        ],
    ]

    notes = [
        "student_email 또는 student_profile_id 중 하나는 반드시 입력하세요.",
        "result_status는 submitted / absent / unanswered / not_entered 중 하나여야 합니다.",
        "문항 응답이 비어 있으면 not_entered, 'NR' 또는 'unanswered'면 무응답, 'A'/'absent'면 결시로 처리됩니다.",
        "raw_score를 비워두면 정답키 기준으로 자동 채점됩니다.",
    ]

    csv_lines = [",".join(headers)]
    for row in sample_rows:
        csv_lines.append(",".join(row))
    csv_text = "\n".join(csv_lines) + "\n"

    safe_name = exam.name.replace(" ", "_")
    filename = f"exam_{exam.id}_{safe_name}_template.csv"

    return {
        "filename": filename,
        "headers": headers,
        "sample_rows": sample_rows,
        "notes": notes,
        "csv_text": csv_text,
    }


# ---------------------------------------------------------------------------
# Slice 2 — strategy options aggregated payload
# ---------------------------------------------------------------------------


_SHOWN_PENDING_STATUSES = {StrategyStatus.PENDING_REVIEW, StrategyStatus.DRAFT, StrategyStatus.HELD}


def _serialize_strategy(strategy: StudentStrategy, *, approved_id: int | None, student_visible_id: int | None) -> dict[str, Any]:
    explanation = (strategy.structured_plan or {}).get("explanation") or {}
    return {
        "id": strategy.id,
        "variant": strategy.variant,
        "status": strategy.status,
        "natural_language_summary": strategy.natural_language_summary or "",
        "structured_plan": strategy.structured_plan or {},
        "rationale": strategy.rationale or [],
        "risk_factors": strategy.risk_factors or [],
        "instructor_explanation": strategy.instructor_explanation or "",
        "student_coaching": strategy.student_coaching or "",
        "rationale_bullets": explanation.get("rationale_bullets", []),
        "risk_translation": explanation.get("risk_translation", []),
        "next_check_in_message": explanation.get("next_check_in_message"),
        "explanation_source": explanation.get("explanation_source", "deterministic_fallback"),
        "explanation_model": explanation.get("explanation_model"),
        "explanation_generated_at": explanation.get("explanation_generated_at"),
        "generated_at": strategy.generated_at,
        "is_approved": strategy.id == approved_id,
        "is_student_visible": strategy.id == student_visible_id,
    }


def _serialize_review(review, *, strategy_variant_lookup: dict[int, str]) -> dict[str, Any]:
    return {
        "id": review.id,
        "strategy_id": review.strategy_id,
        "variant": strategy_variant_lookup.get(review.strategy_id, ""),
        "decision": review.decision,
        "reason": review.reason or "",
        "reviewed_at": review.reviewed_at,
        "reviewer_user_id": review.reviewer_user_id,
        "diff": review.diff or {},
        "edited_summary": review.edited_summary,
        "edited_plan": review.edited_plan,
    }


def build_student_strategy_options(db: Session, *, student_id: int, current_user: User) -> dict[str, Any]:
    """Aggregated payload powering the strategy comparison UI on StudentDetailPage.

    Pulls the most recent diagnosis and the strategies anchored to it (the
    ``latest_set``), then surfaces the approved strategy actually shown to the
    student plus any pending items still in review. The result is structured so
    the frontend can render a side-by-side ``basic`` vs ``conservative`` view
    without doing post-processing on its own.
    """
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)

    diagnosis = _latest_diagnosis(student)
    student_visible = _latest_approved_strategy(student)
    student_visible_id = student_visible.id if student_visible else None

    # Anything currently approved (any variant) — the comparison view shows a
    # per-variant approved badge and we need to mark all of them.
    approved_ids = {
        strategy.id
        for strategy in student.strategies
        if strategy.status == StrategyStatus.APPROVED
    }

    # The "latest set" is the group of strategies sharing the most recent
    # diagnosis_id. If there is no diagnosis yet, fall back to the absolute
    # latest generated_at across all strategies (legacy data).
    if diagnosis is not None:
        set_strategies = [
            strategy
            for strategy in student.strategies
            if strategy.diagnosis_id == diagnosis.id
        ]
    else:
        set_strategies = sorted(
            student.strategies,
            key=lambda item: item.generated_at,
            reverse=True,
        )[:2]

    # Sort the set so the UI gets a stable order: basic first, then conservative,
    # then anything else by generated_at.
    variant_order = {"basic": 0, "conservative": 1}
    set_strategies = sorted(
        set_strategies,
        key=lambda item: (variant_order.get(item.variant, 9), item.generated_at),
    )

    set_generated_at = (
        max((strategy.generated_at for strategy in set_strategies), default=None)
        if set_strategies
        else None
    )

    latest_set = {
        "diagnosis_id": diagnosis.id if diagnosis else None,
        "generated_at": set_generated_at,
        "variants": [
            _serialize_strategy(
                strategy,
                approved_id=None,  # set-level "is_approved" still uses the global rule
                student_visible_id=student_visible_id,
            )
            | {"is_approved": strategy.id in approved_ids}
            for strategy in set_strategies
        ],
    }

    # The single canonical "approved" entry is whatever the student would see
    # right now. If somehow no strategy is in APPROVED status, this is None and
    # the UI shows a "no approved version yet" message.
    approved_payload = None
    if student_visible is not None:
        approved_payload = _serialize_strategy(
            student_visible,
            approved_id=student_visible.id,
            student_visible_id=student_visible_id,
        )

    # Pending items: anything still waiting in review across the whole student
    # (not just the latest set), so carryover holds don't get hidden.
    pending_payload = [
        _serialize_strategy(strategy, approved_id=None, student_visible_id=student_visible_id)
        for strategy in sorted(
            (s for s in student.strategies if s.status in _SHOWN_PENDING_STATUSES),
            key=lambda item: (variant_order.get(item.variant, 9), item.generated_at),
        )
    ]

    diagnosis_payload = None
    if diagnosis is not None:
        diagnosis_payload = {
            "id": diagnosis.id,
            "computed_at": diagnosis.computed_at,
            "primary_weakness_type": diagnosis.primary_weakness_type,
            "confidence_score": diagnosis.confidence_score,
            "low_confidence_flag": diagnosis.low_confidence_flag,
            "coaching_message": diagnosis.coaching_message or "",
            "instructor_summary": diagnosis.instructor_summary or "",
            "weak_subjects": diagnosis.weak_subjects or [],
            "weak_units": diagnosis.weak_units or [],
            "evidence": diagnosis.evidence or [],
            "weakness_scores": diagnosis.weakness_scores or {},
        }

    # Review history covers the latest set so the comparison view can show "이
    # variant 가 어떻게 검토되었는가" without a second round trip.
    set_strategy_ids = [strategy.id for strategy in set_strategies]
    variant_lookup = {strategy.id: strategy.variant for strategy in set_strategies}
    review_history: list[dict[str, Any]] = []
    if set_strategy_ids:
        for strategy in set_strategies:
            for review in sorted(strategy.reviews, key=lambda item: item.reviewed_at, reverse=True):
                review_history.append(_serialize_review(review, strategy_variant_lookup=variant_lookup))
        review_history.sort(key=lambda item: item["reviewed_at"], reverse=True)

    return {
        "student_id": student.id,
        "latest_set": latest_set,
        "approved": approved_payload,
        "pending": pending_payload,
        "diagnosis": diagnosis_payload,
        "review_history": review_history,
    }


# ---------------------------------------------------------------------------
# Slice 5 — fill in the two additive endpoints named in the original spec
# ---------------------------------------------------------------------------


def build_exam_result_entry(db: Session, *, exam_id: int, current_user: User) -> dict[str, Any]:
    """Aggregated payload for the result-entry tab.

    Same data as ``build_exam_detail`` but named to match the original spec's
    "result-entry" endpoint. The result-entry tab only actually needs the exam
    meta, the question list (for the per-question response grid), the roster,
    and the existing results; other exam-detail fields would be unused. We still
    return the full shape here so the frontend adapter stays consistent and the
    UI can reuse the same ``ExamDetailRead`` schema.
    """
    return build_exam_detail(db, exam_id=exam_id, current_user=current_user)


def build_university_policies(db: Session, *, current_user: User) -> list[dict[str, Any]]:
    """Policy list payload for the admin management UI.

    Returns each policy with an additional ``student_count`` — the number of
    students that currently have this policy wired into one of their target
    university goals. This is what the admin UI uses to warn about the impact
    radius of a policy change ("이 정책을 저장하면 N명의 학생이 policy_changed
    트리거로 재계산됩니다").
    """
    from fastapi import HTTPException, status
    from ..models import TargetUniversityProfile, UniversityScorePolicy

    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view university policy governance data.")

    policies = (
        db.query(UniversityScorePolicy)
        .options(
            joinedload(UniversityScorePolicy.target_profiles).joinedload(
                TargetUniversityProfile.student_profile
            )
        )
        .order_by(
            UniversityScorePolicy.university_name.asc(),
            UniversityScorePolicy.academic_year.desc(),
            UniversityScorePolicy.admission_type.asc(),
        )
        .all()
    )

    result: list[dict[str, Any]] = []
    for policy in policies:
        # Count distinct students via active goals only — a policy that only has
        # archived/inactive goals shouldn't inflate the "impacted" number.
        student_ids = {
            goal.student_profile_id
            for goal in policy.target_profiles
            if goal.is_active
        }
        result.append(
            {
                "id": policy.id,
                "academic_year": policy.academic_year,
                "university_name": policy.university_name,
                "admission_type": policy.admission_type,
                "subject_weights": policy.subject_weights or {},
                "required_subjects": policy.required_subjects or [],
                "bonus_rules": policy.bonus_rules or [],
                "grade_conversion_rules": policy.grade_conversion_rules or {},
                "target_score": policy.target_score,
                "notes": policy.notes,
                "student_count": len(student_ids),
            }
        )
    return result
