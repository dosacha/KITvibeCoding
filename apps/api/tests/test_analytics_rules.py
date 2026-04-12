from __future__ import annotations

from app.models import Question, QuestionStatisticsSnapshot, StudentDiagnosis, StudentProfile, StudentStrategy, SubmissionStatus, UnitMasteryCurrent


VALID_RESPONSE_STATUSES = {SubmissionStatus.SUBMITTED, SubmissionStatus.UNANSWERED}


def test_question_statistics_formula_and_unit_mastery_formula(db_session):
    question = db_session.query(Question).order_by(Question.id.asc()).first()
    snapshot = (
        db_session.query(QuestionStatisticsSnapshot)
        .filter(QuestionStatisticsSnapshot.question_id == question.id)
        .order_by(QuestionStatisticsSnapshot.id.desc())
        .first()
    )

    valid_responses = [response for response in question.responses if response.response_status in VALID_RESPONSE_STATUSES]
    error_count = sum(
        1
        for response in valid_responses
        if response.is_correct is False or response.response_status == SubmissionStatus.UNANSWERED
    )
    raw_error_rate = error_count / len(valid_responses)
    expected_error_rate = round(raw_error_rate, 4)
    expected_empirical = round(1 + 4 * raw_error_rate, 4)
    expected_confidence = round(min(1.0, len(valid_responses) / 30), 4)
    expected_final = round(question.teacher_difficulty * (1 - expected_confidence) + expected_empirical * expected_confidence, 4)

    assert snapshot.valid_response_count == len(valid_responses)
    assert snapshot.error_rate == expected_error_rate
    assert snapshot.empirical_difficulty == expected_empirical
    assert snapshot.confidence == expected_confidence
    assert snapshot.final_difficulty == expected_final

    mastery = (
        db_session.query(UnitMasteryCurrent)
        .filter(UnitMasteryCurrent.student_profile_id == 1)
        .order_by(UnitMasteryCurrent.effective_mastery.asc())
        .first()
    )
    assert mastery is not None
    assert mastery.effective_mastery == round(0.7 * mastery.mastery_current + 0.3 * mastery.recent_mastery, 4)
    assert 0.0 <= mastery.unit_confidence <= 1.0


def test_low_confidence_student_still_receives_structured_strategy(db_session):
    sparse_student = db_session.query(StudentProfile).filter(StudentProfile.user.has(email='student4@unitflow.ai')).one()
    diagnosis = (
        db_session.query(StudentDiagnosis)
        .filter(StudentDiagnosis.student_profile_id == sparse_student.id)
        .order_by(StudentDiagnosis.computed_at.desc())
        .first()
    )
    strategies = db_session.query(StudentStrategy).filter(StudentStrategy.student_profile_id == sparse_student.id).all()

    assert diagnosis.low_confidence_flag is True
    assert diagnosis.coaching_message
    assert {strategy.variant for strategy in strategies} == {'basic', 'conservative'}
