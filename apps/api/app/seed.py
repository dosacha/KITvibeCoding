from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from .time_utils import current_utc_year

from .models import (
    Academy,
    ClassGroup,
    Exam,
    EnrollmentStatus,
    LearningHabitSnapshot,
    Question,
    QuestionUnitMapping,
    ReviewDecision,
    Role,
    StudentProfile,
    StudentStrategy,
    StudentQuestionResponse,
    StudentResult,
    StrategyReview,
    StrategyStatus,
    SubmissionStatus,
    Subject,
    TargetUniversityProfile,
    Unit,
    UniversityScorePolicy,
    User,
)
from .security import hash_password
from .services.analytics import recalculate_student_bundle


def _ensure_user(db: Session, *, academy: Academy, email: str, full_name: str, role: Role) -> User:
    existing = db.query(User).filter(User.email == email).one_or_none()
    if existing:
        return existing
    user = User(
        academy_id=academy.id,
        email=email,
        full_name=full_name,
        hashed_password=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user


def _create_exam(db: Session, *, academy: Academy, subject: Subject, name: str, exam_date: date, specs: list[dict], time_limit_minutes: int = 60) -> Exam:
    exam = Exam(
        academy_id=academy.id,
        subject_id=subject.id,
        name=name,
        exam_date=exam_date,
        total_score=100,
        time_limit_minutes=time_limit_minutes,
        is_retake=False,
    )
    db.add(exam)
    db.flush()
    for spec in specs:
        question = Question(
            exam_id=exam.id,
            number=spec["number"],
            teacher_difficulty=spec["teacher_difficulty"],
            answer_key=spec["answer_key"],
            points=spec.get("points", 25),
            question_type=spec["question_type"],
            problem_style=spec["problem_style"],
            estimated_seconds=spec.get("estimated_seconds", 90),
        )
        db.add(question)
        db.flush()
        for mapping in spec["units"]:
            db.add(QuestionUnitMapping(question_id=question.id, unit_id=mapping["unit"].id, weight=mapping.get("weight", 1.0)))
    db.flush()
    return exam


def _attach_result(
    db: Session,
    *,
    student: StudentProfile,
    exam: Exam,
    answers: list[str | None],
    completed_in_seconds: int,
    percentile: float | None,
    grade: int | None,
    overall_status: SubmissionStatus = SubmissionStatus.SUBMITTED,
) -> StudentResult:
    result = StudentResult(
        student_profile_id=student.id,
        exam_id=exam.id,
        subject_id=exam.subject_id,
        completed_in_seconds=completed_in_seconds,
        percentile=percentile,
        grade=grade,
        result_status=overall_status,
        question_breakdown={},
        result_metadata={"seeded": True},
    )
    db.add(result)
    db.flush()
    correct = 0
    breakdown = {status.value: 0 for status in SubmissionStatus}
    raw_score = 0.0
    questions = sorted(exam.questions, key=lambda item: item.number)
    for question, answer in zip(questions, answers):
        if overall_status == SubmissionStatus.ABSENT:
            status_value = SubmissionStatus.ABSENT
            selected = None
            is_correct = None
        elif answer is None:
            status_value = SubmissionStatus.NOT_ENTERED
            selected = None
            is_correct = None
        elif str(answer).upper() == "NR":
            status_value = SubmissionStatus.UNANSWERED
            selected = None
            is_correct = False
        else:
            status_value = SubmissionStatus.SUBMITTED
            selected = answer
            is_correct = selected == question.answer_key
        breakdown[status_value.value] += 1
        if is_correct:
            correct += 1
            raw_score += question.points
        db.add(
            StudentQuestionResponse(
                student_result_id=result.id,
                question_id=question.id,
                selected_answer=selected,
                is_correct=is_correct,
                response_status=status_value,
            )
        )
    result.raw_score = raw_score
    breakdown["correct"] = correct
    breakdown["incorrect"] = len(questions) - correct - breakdown[SubmissionStatus.NOT_ENTERED.value] - breakdown[SubmissionStatus.ABSENT.value]
    result.question_breakdown = breakdown
    db.flush()
    return result


def seed_demo_data(db: Session) -> None:
    if db.query(Academy).filter(Academy.name == "UnitFlow Academy").one_or_none():
        return

    academy = Academy(name="UnitFlow Academy")
    db.add(academy)
    db.flush()

    admin = _ensure_user(db, academy=academy, email="admin@unitflow.ai", full_name="운영 관리자", role=Role.ADMIN)
    instructor = _ensure_user(db, academy=academy, email="instructor@unitflow.ai", full_name="김강사", role=Role.INSTRUCTOR)
    instructor_two = _ensure_user(db, academy=academy, email="mentor@unitflow.ai", full_name="박멘토", role=Role.INSTRUCTOR)
    student_user = _ensure_user(db, academy=academy, email="student@unitflow.ai", full_name="김민수", role=Role.STUDENT)
    student_user_two = _ensure_user(db, academy=academy, email="student2@unitflow.ai", full_name="이서연", role=Role.STUDENT)
    student_user_three = _ensure_user(db, academy=academy, email="student3@unitflow.ai", full_name="박지후", role=Role.STUDENT)
    student_user_four = _ensure_user(db, academy=academy, email="student4@unitflow.ai", full_name="최하늘", role=Role.STUDENT)

    alpha = ClassGroup(academy_id=academy.id, instructor_id=instructor.id, name="Alpha반", grade_level="고3")
    beta = ClassGroup(academy_id=academy.id, instructor_id=instructor_two.id, name="Beta반", grade_level="고3")
    db.add_all([alpha, beta])
    db.flush()

    subjects = {
        "kor": Subject(academy_id=academy.id, name="국어", code="KOR"),
        "math": Subject(academy_id=academy.id, name="수학", code="MATH"),
        "eng": Subject(academy_id=academy.id, name="영어", code="ENG"),
    }
    db.add_all(subjects.values())
    db.flush()

    units = {
        "kor_reading": Unit(subject_id=subjects["kor"].id, name="독서", code="KOR-READ"),
        "kor_lit": Unit(subject_id=subjects["kor"].id, name="문학", code="KOR-LIT"),
        "kor_grammar": Unit(subject_id=subjects["kor"].id, name="문법", code="KOR-GRAM"),
        "math_algebra": Unit(subject_id=subjects["math"].id, name="대수", code="MATH-ALG"),
        "math_probability": Unit(subject_id=subjects["math"].id, name="확률과 통계", code="MATH-PROB"),
        "math_calculus": Unit(subject_id=subjects["math"].id, name="미적분", code="MATH-CALC", prerequisite_unit_id=None),
        "eng_reading": Unit(subject_id=subjects["eng"].id, name="독해", code="ENG-READ"),
        "eng_grammar": Unit(subject_id=subjects["eng"].id, name="문법", code="ENG-GRAM"),
        "eng_listening": Unit(subject_id=subjects["eng"].id, name="듣기", code="ENG-LISTEN"),
    }
    db.add_all(units.values())
    db.flush()
    units["math_calculus"].prerequisite_unit_id = units["math_algebra"].id
    db.flush()

    policies = [
        UniversityScorePolicy(
            academic_year=current_utc_year(),
            university_name="서울공대",
            admission_type="정시 일반",
            subject_weights={"수학": 1.6, "영어": 1.1, "국어": 1.0},
            required_subjects=["수학", "영어"],
            bonus_rules=[{"subject": "수학", "threshold": 92, "bonus": 3}],
            grade_conversion_rules={"type": "score_to_percentile", "baseline": 85},
            target_score=88,
            notes="수학 비중이 높은 공대형 전형",
        ),
        UniversityScorePolicy(
            academic_year=current_utc_year(),
            university_name="고려상경",
            admission_type="학생부 교과",
            subject_weights={"국어": 1.3, "영어": 1.2, "수학": 1.0},
            required_subjects=["국어", "영어"],
            bonus_rules=[],
            grade_conversion_rules={"type": "weighted_average"},
            target_score=84,
            notes="국어·영어 안정권 유지가 중요한 전형",
        ),
        UniversityScorePolicy(
            academic_year=current_utc_year(),
            university_name="경북대 컴공",
            admission_type="수능 위주",
            subject_weights={"수학": 1.4, "국어": 1.0, "영어": 1.0},
            required_subjects=["수학"],
            bonus_rules=[{"subject": "영어", "threshold": 90, "bonus": 1.5}],
            grade_conversion_rules={"type": "weighted_average"},
            target_score=82,
            notes="수학 우위 확보가 핵심",
        ),
    ]
    db.add_all(policies)
    db.flush()

    students = [
        StudentProfile(
            user_id=student_user.id,
            class_group_id=alpha.id,
            grade_level="고3",
            enrollment_status=EnrollmentStatus.ACTIVE,
            weekly_available_hours=14,
            preferred_subjects=["수학"],
            disliked_subjects=["국어"],
            learning_style_preferences=["개념 강의", "오답노트"],
            study_style_notes="수학은 좋아하지만 개념 빈칸이 남아 있다.",
        ),
        StudentProfile(
            user_id=student_user_two.id,
            class_group_id=alpha.id,
            grade_level="고3",
            enrollment_status=EnrollmentStatus.ACTIVE,
            weekly_available_hours=12,
            preferred_subjects=["영어"],
            disliked_subjects=["수학"],
            learning_style_preferences=["자습", "문제풀이"],
            study_style_notes="속도는 빠르지만 후반 집중력이 떨어진다.",
        ),
        StudentProfile(
            user_id=student_user_three.id,
            class_group_id=beta.id,
            grade_level="고3",
            enrollment_status=EnrollmentStatus.ACTIVE,
            weekly_available_hours=10,
            preferred_subjects=["국어"],
            disliked_subjects=["영어"],
            learning_style_preferences=["자습", "루틴형"],
            study_style_notes="시험 컨디션에 따라 편차가 크다.",
        ),
        StudentProfile(
            user_id=student_user_four.id,
            class_group_id=beta.id,
            grade_level="고3",
            enrollment_status=EnrollmentStatus.TRIAL,
            weekly_available_hours=6,
            preferred_subjects=["영어"],
            disliked_subjects=["수학", "국어"],
            learning_style_preferences=["짧은 세션", "피드백 중심"],
            study_style_notes="학습 공백이 잦아 지속성 보강이 먼저다.",
        ),
    ]
    db.add_all(students)
    db.flush()

    habits = [
        LearningHabitSnapshot(student_profile_id=students[0].id, recent_learning_mode="lecture+error_note", self_study_ratio=0.2, lecture_ratio=0.35, error_note_ratio=0.25, problem_solving_ratio=0.2, review_habit_score=64, consistency_score=78, notes="수학 개념 강의 후 오답노트를 정리함"),
        LearningHabitSnapshot(student_profile_id=students[1].id, recent_learning_mode="problem_drill", self_study_ratio=0.35, lecture_ratio=0.15, error_note_ratio=0.15, problem_solving_ratio=0.35, review_habit_score=58, consistency_score=62, notes="영어는 꾸준하나 수학은 후반부 집중 저하"),
        LearningHabitSnapshot(student_profile_id=students[2].id, recent_learning_mode="mixed", self_study_ratio=0.3, lecture_ratio=0.2, error_note_ratio=0.25, problem_solving_ratio=0.25, review_habit_score=72, consistency_score=50, notes="루틴이 있지만 시험 직전 편차가 큼"),
        LearningHabitSnapshot(student_profile_id=students[3].id, recent_learning_mode="short_sessions", self_study_ratio=0.25, lecture_ratio=0.25, error_note_ratio=0.1, problem_solving_ratio=0.4, review_habit_score=35, consistency_score=32, notes="짧은 세션 위주, 공백이 잦음"),
    ]
    db.add_all(habits)
    db.flush()

    goals = [
        TargetUniversityProfile(student_profile_id=students[0].id, policy_id=policies[0].id, target_department="컴퓨터공학", priority_order=1, is_active=True),
        TargetUniversityProfile(student_profile_id=students[0].id, policy_id=policies[2].id, target_department="소프트웨어학과", priority_order=2, is_active=True),
        TargetUniversityProfile(student_profile_id=students[1].id, policy_id=policies[1].id, target_department="경영학과", priority_order=1, is_active=True),
        TargetUniversityProfile(student_profile_id=students[1].id, policy_id=policies[2].id, target_department="경영정보학과", priority_order=2, is_active=True),
        TargetUniversityProfile(student_profile_id=students[2].id, policy_id=policies[2].id, target_department="컴퓨터공학", priority_order=1, is_active=True),
        TargetUniversityProfile(student_profile_id=students[3].id, policy_id=policies[2].id, target_department="컴퓨터공학", priority_order=1, is_active=True),
    ]
    db.add_all(goals)
    db.flush()

    exam_specs_math = [
        {"number": 1, "teacher_difficulty": 1, "answer_key": "A", "question_type": "객관식", "problem_style": "concept", "units": [{"unit": units["math_algebra"], "weight": 0.7}, {"unit": units["math_probability"], "weight": 0.3}]},
        {"number": 2, "teacher_difficulty": 2, "answer_key": "B", "question_type": "객관식", "problem_style": "concept", "units": [{"unit": units["math_algebra"], "weight": 1.0}]},
        {"number": 3, "teacher_difficulty": 4, "answer_key": "C", "question_type": "서술형", "problem_style": "applied", "units": [{"unit": units["math_probability"], "weight": 1.0}]},
        {"number": 4, "teacher_difficulty": 5, "answer_key": "D", "question_type": "서술형", "problem_style": "transfer", "units": [{"unit": units["math_calculus"], "weight": 1.0}]},
    ]
    exam_specs_kor = [
        {"number": 1, "teacher_difficulty": 2, "answer_key": "A", "question_type": "객관식", "problem_style": "concept", "units": [{"unit": units["kor_reading"], "weight": 1.0}]},
        {"number": 2, "teacher_difficulty": 3, "answer_key": "B", "question_type": "객관식", "problem_style": "applied", "units": [{"unit": units["kor_lit"], "weight": 1.0}]},
        {"number": 3, "teacher_difficulty": 2, "answer_key": "C", "question_type": "객관식", "problem_style": "concept", "units": [{"unit": units["kor_grammar"], "weight": 1.0}]},
        {"number": 4, "teacher_difficulty": 4, "answer_key": "D", "question_type": "서술형", "problem_style": "applied", "units": [{"unit": units["kor_reading"], "weight": 0.4}, {"unit": units["kor_lit"], "weight": 0.6}]},
    ]
    exam_specs_eng = [
        {"number": 1, "teacher_difficulty": 2, "answer_key": "A", "question_type": "객관식", "problem_style": "concept", "units": [{"unit": units["eng_grammar"], "weight": 1.0}]},
        {"number": 2, "teacher_difficulty": 3, "answer_key": "B", "question_type": "객관식", "problem_style": "applied", "units": [{"unit": units["eng_reading"], "weight": 1.0}]},
        {"number": 3, "teacher_difficulty": 4, "answer_key": "C", "question_type": "객관식", "problem_style": "applied", "units": [{"unit": units["eng_reading"], "weight": 0.7}, {"unit": units["eng_listening"], "weight": 0.3}]},
        {"number": 4, "teacher_difficulty": 3, "answer_key": "D", "question_type": "객관식", "problem_style": "transfer", "units": [{"unit": units["eng_listening"], "weight": 1.0}], "estimated_seconds": 120},
    ]

    exams = {
        "math_feb": _create_exam(db, academy=academy, subject=subjects["math"], name="2월 수학 진단", exam_date=date(2026, 2, 10), specs=exam_specs_math, time_limit_minutes=50),
        "math_mar": _create_exam(db, academy=academy, subject=subjects["math"], name="3월 수학 진단", exam_date=date(2026, 3, 20), specs=exam_specs_math, time_limit_minutes=50),
        "kor_feb": _create_exam(db, academy=academy, subject=subjects["kor"], name="2월 국어 진단", exam_date=date(2026, 2, 12), specs=exam_specs_kor, time_limit_minutes=55),
        "kor_mar": _create_exam(db, academy=academy, subject=subjects["kor"], name="3월 국어 진단", exam_date=date(2026, 3, 22), specs=exam_specs_kor, time_limit_minutes=55),
        "eng_feb": _create_exam(db, academy=academy, subject=subjects["eng"], name="2월 영어 진단", exam_date=date(2026, 2, 14), specs=exam_specs_eng, time_limit_minutes=45),
        "eng_mar": _create_exam(db, academy=academy, subject=subjects["eng"], name="3월 영어 진단", exam_date=date(2026, 3, 24), specs=exam_specs_eng, time_limit_minutes=45),
    }
    db.flush()

    # Student 1: concept gap in math, stable elsewhere.
    _attach_result(db, student=students[0], exam=exams["math_feb"], answers=["B", "D", "C", "D"], completed_in_seconds=2500, percentile=48, grade=4)
    _attach_result(db, student=students[0], exam=exams["math_mar"], answers=["C", "A", "C", "NR"], completed_in_seconds=2700, percentile=45, grade=4)
    _attach_result(db, student=students[0], exam=exams["kor_feb"], answers=["A", "B", "C", "D"], completed_in_seconds=2800, percentile=72, grade=2)
    _attach_result(db, student=students[0], exam=exams["kor_mar"], answers=["A", "B", "C", "NR"], completed_in_seconds=2950, percentile=70, grade=2)
    _attach_result(db, student=students[0], exam=exams["eng_feb"], answers=["A", "B", "C", "D"], completed_in_seconds=2300, percentile=68, grade=2)
    _attach_result(db, student=students[0], exam=exams["eng_mar"], answers=["A", "B", "NR", "D"], completed_in_seconds=2450, percentile=66, grade=2)

    # Student 2: time pressure in English.
    _attach_result(db, student=students[1], exam=exams["math_feb"], answers=["A", "B", "NR", "NR"], completed_in_seconds=2600, percentile=55, grade=3)
    _attach_result(db, student=students[1], exam=exams["math_mar"], answers=["A", "B", "D", "NR"], completed_in_seconds=2750, percentile=58, grade=3)
    _attach_result(db, student=students[1], exam=exams["kor_feb"], answers=["A", "B", "C", "D"], completed_in_seconds=2500, percentile=82, grade=2)
    _attach_result(db, student=students[1], exam=exams["kor_mar"], answers=["A", "B", "C", "D"], completed_in_seconds=2480, percentile=84, grade=2)
    _attach_result(db, student=students[1], exam=exams["eng_feb"], answers=["A", "B", "NR", "NR"], completed_in_seconds=2670, percentile=61, grade=3)
    _attach_result(db, student=students[1], exam=exams["eng_mar"], answers=["A", "B", "NR", "NR"], completed_in_seconds=2690, percentile=60, grade=3)

    # Student 3: instability across exams.
    _attach_result(db, student=students[2], exam=exams["math_feb"], answers=["A", "B", "C", "D"], completed_in_seconds=2400, percentile=88, grade=1)
    _attach_result(db, student=students[2], exam=exams["math_mar"], answers=["A", "NR", "NR", "NR"], completed_in_seconds=2550, percentile=52, grade=4)
    _attach_result(db, student=students[2], exam=exams["kor_feb"], answers=["A", "NR", "C", "NR"], completed_in_seconds=2650, percentile=49, grade=4)
    _attach_result(db, student=students[2], exam=exams["kor_mar"], answers=["A", "B", "C", "D"], completed_in_seconds=2400, percentile=86, grade=1)
    _attach_result(db, student=students[2], exam=exams["eng_feb"], answers=["A", "B", "C", "D"], completed_in_seconds=2200, percentile=81, grade=2)
    _attach_result(db, student=students[2], exam=exams["eng_mar"], answers=["A", "NR", "C", "NR"], completed_in_seconds=2350, percentile=57, grade=3)

    # Student 4: persistence risk + low confidence / sparse data.
    _attach_result(db, student=students[3], exam=exams["math_mar"], answers=[None, "NR", None, None], completed_in_seconds=1800, percentile=32, grade=6)
    _attach_result(db, student=students[3], exam=exams["eng_mar"], answers=["A", None, None, "NR"], completed_in_seconds=1700, percentile=44, grade=5)

    db.commit()

    for student in students:
        recalculate_student_bundle(db, student_id=student.id, actor_user_id=admin.id, trigger="seed")

    for student in students:
        strategy = (
            db.query(StudentStrategy)
            .filter_by(student_profile_id=student.id, variant="basic")
            .order_by(StudentStrategy.generated_at.desc())
            .first()
        )
        if strategy:
            strategy.status = StrategyStatus.APPROVED
            review = StrategyReview(
                strategy_id=strategy.id,
                reviewer_user_id=instructor.id if student.class_group_id == alpha.id else instructor_two.id,
                decision=ReviewDecision.APPROVE,
                reason="시드 데이터 초기 승인",
                diff={},
            )
            db.add(review)
    db.commit()
