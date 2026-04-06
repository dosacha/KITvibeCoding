from types import SimpleNamespace

from app.services.frontend_adapter import (
    _build_consult_priority,
    _parse_frontend_student_id,
    get_frontend_metadata,
)


def test_parse_frontend_student_id_accepts_prefixed_value() -> None:
    assert _parse_frontend_student_id("st7") == 7


def test_parse_frontend_student_id_accepts_raw_integer_string() -> None:
    assert _parse_frontend_student_id("12") == 12


def test_build_consult_priority_uses_gap_thresholds() -> None:
    assert _build_consult_priority(22.0) == "high"
    assert _build_consult_priority(10.0) == "medium"
    assert _build_consult_priority(4.0) == "low"


class _FakeQuery:
    def __init__(self, items):
        self._items = items

    def order_by(self, *_args, **_kwargs):
        return self

    def all(self):
        return self._items


class _FakeMetadataSession:
    def __init__(self, academy_items, subject_items) -> None:
        self._academy_items = academy_items
        self._subject_items = subject_items

    def query(self, model):
        model_name = getattr(model, "__name__", "")
        if model_name == "Academy":
            return _FakeQuery(self._academy_items)
        if model_name == "Subject":
            return _FakeQuery(self._subject_items)
        raise AssertionError(f"Unexpected model query: {model_name}")


def test_get_frontend_metadata_returns_ordered_serializable_items() -> None:
    db = _FakeMetadataSession(
        academy_items=[SimpleNamespace(id=2, name="Beta Academy"), SimpleNamespace(id=1, name="Alpha Academy")],
        subject_items=[
            SimpleNamespace(id=10, code="ENG", name="English"),
            SimpleNamespace(id=20, code="MATH", name="Mathematics"),
        ],
    )

    metadata = get_frontend_metadata(db)

    assert metadata == {
        "academies": [
            {"id": 2, "name": "Beta Academy"},
            {"id": 1, "name": "Alpha Academy"},
        ],
        "subjects": [
            {"id": 10, "code": "ENG", "name": "English"},
            {"id": 20, "code": "MATH", "name": "Mathematics"},
        ],
    }
