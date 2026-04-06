from datetime import date

from app.schemas import ExamCreate
from app.services.domain import create_exam


class FakeExam:
    def __init__(self, **kwargs):
        self.id = None
        for key, value in kwargs.items():
            setattr(self, key, value)


class FakeSession:
    def __init__(self) -> None:
        self.added = []
        self.flush_count = 0
        self.commit_count = 0
        self.refresh_count = 0

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = len([item for item in self.added if hasattr(item, "id")]) + 1
        self.added.append(obj)

    def flush(self):
        self.flush_count += 1

    def commit(self):
        self.commit_count += 1

    def refresh(self, obj):
        self.refresh_count += 1


def test_create_exam_records_operational_history(monkeypatch) -> None:
    from app.services import domain

    audit_calls = []
    change_calls = []

    monkeypatch.setattr(domain, "Exam", FakeExam)
    monkeypatch.setattr(domain, "log_audit", lambda *args, **kwargs: audit_calls.append(kwargs))
    monkeypatch.setattr(domain, "log_change", lambda *args, **kwargs: change_calls.append(kwargs))

    db = FakeSession()
    exam = create_exam(
        db,
        ExamCreate(
            academy_id=1,
            subject_id=2,
            name="May Mock",
            exam_date=date(2026, 5, 1),
            total_score=100,
        ),
        actor_user_id=7,
    )

    assert exam.name == "May Mock"
    assert db.commit_count == 1
    assert db.refresh_count == 1
    assert len(db.added) == 1
    assert audit_calls
    assert change_calls
