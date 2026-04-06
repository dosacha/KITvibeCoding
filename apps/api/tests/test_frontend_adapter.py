from app.services.frontend_adapter import _build_consult_priority, _parse_frontend_student_id


def test_parse_frontend_student_id_accepts_prefixed_value() -> None:
    assert _parse_frontend_student_id("st7") == 7


def test_parse_frontend_student_id_accepts_raw_integer_string() -> None:
    assert _parse_frontend_student_id("12") == 12


def test_build_consult_priority_uses_gap_thresholds() -> None:
    assert _build_consult_priority(22.0) == "high"
    assert _build_consult_priority(10.0) == "medium"
    assert _build_consult_priority(4.0) == "low"
