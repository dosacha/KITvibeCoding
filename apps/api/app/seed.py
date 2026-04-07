from datetime import date, timedelta

from .db import SessionLocal, initialize_database
from .models import Academy, ClassGroup, Exam, Question, QuestionUnitMapping, Role, StudentProfile, StudentResult, Subject, TargetUniversityProfile, UniversityScorePolicy, Unit, User
from .security import hash_password
from .services.analytics import recalculate_student_analysis


def seed() -> None:
    initialize_database(reset=True)
    db = SessionLocal()

    academy = Academy(name="UnitFlow Demo Academy")
    db.add(academy)
    db.flush()

    admin = User(academy_id=academy.id, email="admin@unitflow.ai", full_name="Admin Kim", hashed_password=hash_password("password123"), role=Role.ADMIN)
    instructor = User(academy_id=academy.id, email="instructor@unitflow.ai", full_name="Instructor Lee", hashed_password=hash_password("password123"), role=Role.INSTRUCTOR)
    db.add_all([admin, instructor])
    db.flush()

    math = Subject(academy_id=academy.id, name="Mathematics", code="MATH")
    korean = Subject(academy_id=academy.id, name="Korean", code="KOR")
    english = Subject(academy_id=academy.id, name="English", code="ENG")
    db.add_all([math, korean, english])
    db.flush()

    units = [
        Unit(subject_id=math.id, name="Functions", code="MATH-FUNC"),
        Unit(subject_id=math.id, name="Probability", code="MATH-PROB", prerequisite_unit_id=1),
        Unit(subject_id=korean.id, name="Modern Literature", code="KOR-LIT"),
        Unit(subject_id=english.id, name="Reading Inference", code="ENG-INF"),
    ]
    db.add_all(units)
    db.flush()

    policy_a = UniversityScorePolicy(university_name="Seoul Future University", admission_type="regular", subject_weights={"MATH": 0.4, "KOR": 0.3, "ENG": 0.3}, required_subjects=["MATH", "KOR", "ENG"], bonus_rules=[{"condition": "math_above_85", "bonus": 2}], grade_conversion_rules={"score_bands": [{"min": 90, "grade": 1}, {"min": 80, "grade": 2}]}, target_score=84.0, notes="Math-heavy regular admission sample policy.")
    policy_b = UniversityScorePolicy(university_name="Hanbit National University", admission_type="student_record", subject_weights={"KOR": 0.35, "ENG": 0.35, "MATH": 0.3}, required_subjects=["KOR", "ENG"], bonus_rules=[{"condition": "english_growth_positive", "bonus": 1.5}], grade_conversion_rules={"score_bands": [{"min": 88, "grade": 1}, {"min": 78, "grade": 2}]}, target_score=82.0, notes="Balanced humanities-friendly sample policy.")
    db.add_all([policy_a, policy_b])
    db.flush()

    class_group = ClassGroup(academy_id=academy.id, instructor_id=instructor.id, name="Grade 12 Strategy A", grade_level="12")
    db.add(class_group)
    db.flush()

    student_user = User(academy_id=academy.id, email="student@unitflow.ai", full_name="Student Park", hashed_password=hash_password("password123"), role=Role.STUDENT, preferred_subject_ids=[english.id, math.id])
    db.add(student_user)
    db.flush()

    student_profile = StudentProfile(user_id=student_user.id, class_group_id=class_group.id, grade_level="12", study_style_notes="Can focus deeply on preferred subjects but score volatility rises under test pressure.")
    db.add(student_profile)
    db.flush()

    target_profile = TargetUniversityProfile(student_profile_id=student_profile.id, policy_id=policy_a.id, target_department="Computer Science", priority_order=1)
    db.add(target_profile)
    db.flush()
    student_profile.target_university_profile_id = target_profile.id
    db.flush()

    exam_specs = [
        ("March Math Mock", math.id, 62),
        ("April Math Mock", math.id, 69),
        ("March Korean Mock", korean.id, 74),
        ("April Korean Mock", korean.id, 76),
        ("March English Mock", english.id, 68),
        ("April English Mock", english.id, 70),
    ]
    exam_objects = []
    for idx, (name, subject_id, _) in enumerate(exam_specs, start=1):
        exam = Exam(academy_id=academy.id, subject_id=subject_id, name=name, exam_date=date.today() - timedelta(days=40 - idx * 5), total_score=100)
        db.add(exam)
        exam_objects.append(exam)
    db.flush()

    results = []
    for exam, (_, subject_id, score) in zip(exam_objects, exam_specs, strict=False):
        breakdown = {}
        for number in range(1, 6):
            question = Question(exam_id=exam.id, number=number, difficulty=2 if number < 4 else 3, points=20, question_type="calculation" if subject_id == math.id and number in (2, 4) else "inference", estimated_seconds=90 if number < 4 else 150)
            db.add(question)
            db.flush()
            unit_id = {math.id: units[0].id if number <= 2 else units[1].id, korean.id: units[2].id, english.id: units[3].id}[subject_id]
            db.add(QuestionUnitMapping(question_id=question.id, unit_id=unit_id, weight=1.0))
            correct = number <= round(score / 20)
            if subject_id == math.id and number == 4:
                correct = False
            breakdown[str(question.id)] = {"is_correct": correct}
        results.append(StudentResult(student_profile_id=student_profile.id, exam_id=exam.id, subject_id=subject_id, raw_score=float(score), percentile=65 + (score - 60) / 2, grade=3 if score < 75 else 2, completed_in_seconds=4100 if subject_id == math.id else 3600, question_breakdown=breakdown, result_metadata={"source": "seed"}))
    db.add_all(results)
    db.commit()

    student_profile = db.get(StudentProfile, student_profile.id)
    recalculate_student_analysis(db, student_profile, actor_user_id=instructor.id)
    db.close()


if __name__ == "__main__":
    seed()
