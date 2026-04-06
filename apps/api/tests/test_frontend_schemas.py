from datetime import date

from pydantic import ValidationError

from app.schemas import FrontendExamCreate


def test_frontend_exam_create_accepts_valid_payload() -> None:
    payload = FrontendExamCreate(
        academy_id=1,
        subject_id=2,
        name="June Mock",
        exam_date=date(2026, 6, 1),
        total_score=100,
    )

    assert payload.academy_id == 1
    assert payload.subject_id == 2
    assert payload.name == "June Mock"
    assert payload.total_score == 100


def test_frontend_exam_create_rejects_invalid_numeric_values() -> None:
    try:
        FrontendExamCreate(
            academy_id=0,
            subject_id=0,
            name="June Mock",
            exam_date=date(2026, 6, 1),
            total_score=0,
        )
    except ValidationError as exc:
        message = str(exc)
    else:
        raise AssertionError("ValidationError was expected for invalid numeric values")

    assert "academy_id" in message
    assert "subject_id" in message
    assert "total_score" in message


def test_frontend_exam_create_rejects_empty_name() -> None:
    try:
        FrontendExamCreate(
            academy_id=1,
            subject_id=2,
            name="",
            exam_date=date(2026, 6, 1),
            total_score=100,
        )
    except ValidationError as exc:
        message = str(exc)
    else:
        raise AssertionError("ValidationError was expected for an empty exam name")

    assert "name" in message
