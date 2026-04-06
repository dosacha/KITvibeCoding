from app.engines.diagnosis import diagnose_student
from app.engines.strategy import build_strategy


def test_diagnosis_returns_explainable_structure() -> None:
    features = {
        "latest_scores": {"MATH": 68, "KOR": 77, "ENG": 72},
        "score_trends": {"MATH": [60, 64, 68], "KOR": [74, 76, 77], "ENG": [70, 71, 72]},
        "growth_rates": {"MATH": 0.1333, "KOR": 0.0405, "ENG": 0.0285},
        "stability_index": 0.61,
        "unit_mastery": [
            {"unit_id": 1, "unit_name": "Functions", "subject_id": 1, "mastery": 52, "prerequisite_unit_id": None},
            {"unit_id": 2, "unit_name": "Probability", "subject_id": 1, "mastery": 48, "prerequisite_unit_id": 1},
        ],
        "question_error_rates": [],
        "type_accuracy": {"calculation": 42.0, "inference": 70.0},
        "preferred_subjects": ["ENG"],
        "target_gap": {"university_name": "Seoul Future University", "gap": 11.0, "subject_weights": {"MATH": 0.4, "KOR": 0.3, "ENG": 0.3}},
    }
    diagnosis = diagnose_student(features)
    assert diagnosis["primary_weakness_type"] in diagnosis["weakness_scores"]
    assert diagnosis["evidence"]
    assert diagnosis["weak_units"]


def test_strategy_uses_weight_and_growth() -> None:
    diagnosis = {
        "primary_weakness_type": "concept_gap",
        "weak_subjects": [
            {"subject_code": "MATH", "latest_score": 68, "growth_rate": 0.15, "is_preferred": False},
            {"subject_code": "ENG", "latest_score": 72, "growth_rate": 0.03, "is_preferred": True},
            {"subject_code": "KOR", "latest_score": 78, "growth_rate": 0.01, "is_preferred": False},
        ],
        "weak_units": [
            {"unit_id": 1, "unit_name": "Functions", "mastery": 55, "prerequisite_unit_id": None},
            {"unit_id": 2, "unit_name": "Probability", "mastery": 49, "prerequisite_unit_id": 1},
        ],
        "feature_snapshot": {"target_gap": {"subject_weights": {"MATH": 0.4, "ENG": 0.3, "KOR": 0.3}}},
    }
    strategy = build_strategy(diagnosis)
    assert strategy["priority_subjects"][0]["subject_code"] == "MATH"
    assert strategy["time_allocation"]
    assert strategy["rationale"]

