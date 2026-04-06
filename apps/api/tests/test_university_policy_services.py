from app.schemas import UniversityPolicyCreate, UniversityPolicyUpdate
from app.services.university_policies import create_policy, update_policy


class FakePolicy:
    def __init__(self, **kwargs):
        self.id = None
        for key, value in kwargs.items():
            setattr(self, key, value)


class FakeSession:
    def __init__(self) -> None:
        self.added = []
        self.commit_count = 0
        self.refresh_count = 0

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = len(self.added) + 1
        self.added.append(obj)

    def flush(self):
        return None

    def commit(self):
        self.commit_count += 1

    def refresh(self, obj):
        self.refresh_count += 1


def test_create_policy_records_audit(monkeypatch) -> None:
    from app.services import university_policies

    audit_calls = []
    change_calls = []

    monkeypatch.setattr(university_policies, "UniversityScorePolicy", FakePolicy)
    monkeypatch.setattr(university_policies, "log_audit", lambda *args, **kwargs: audit_calls.append(kwargs))
    monkeypatch.setattr(university_policies, "log_change", lambda *args, **kwargs: change_calls.append(kwargs))

    db = FakeSession()
    policy = create_policy(
        db,
        UniversityPolicyCreate(
          university_name="한빛대학교",
          admission_type="정시",
          subject_weights={"KOR": 0.3, "MATH": 0.4, "ENG": 0.3},
          required_subjects=["KOR", "MATH", "ENG"],
          bonus_rules=[],
          grade_conversion_rules={},
          target_score=84,
          notes="테스트 정책",
        ),
        actor_user_id=5,
    )

    assert policy.university_name == "한빛대학교"
    assert db.commit_count == 1
    assert audit_calls
    assert change_calls


def test_update_policy_records_changes(monkeypatch) -> None:
    from app.services import university_policies

    audit_calls = []
    change_calls = []

    monkeypatch.setattr(university_policies, "log_audit", lambda *args, **kwargs: audit_calls.append(kwargs))
    monkeypatch.setattr(university_policies, "log_change", lambda *args, **kwargs: change_calls.append(kwargs))

    db = FakeSession()
    policy = FakePolicy(
        id=3,
        university_name="한빛대학교",
        admission_type="정시",
        subject_weights={"KOR": 0.3, "MATH": 0.4, "ENG": 0.3},
        required_subjects=["KOR", "MATH", "ENG"],
        bonus_rules=[],
        grade_conversion_rules={},
        target_score=84,
        notes="이전 메모",
    )

    updated = update_policy(
        db,
        policy,
        UniversityPolicyUpdate(
            target_score=86,
            notes="수정 메모",
            required_subjects=["KOR", "ENG"],
        ),
        actor_user_id=7,
    )

    assert updated.target_score == 86
    assert updated.notes == "수정 메모"
    assert updated.required_subjects == ["KOR", "ENG"]
    assert db.commit_count == 1
    assert audit_calls
    assert any(call["field_name"] == "target_score" for call in change_calls)
