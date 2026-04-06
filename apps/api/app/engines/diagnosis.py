from __future__ import annotations

from collections import defaultdict

from ..models import WeaknessType


def diagnose_student(feature_snapshot: dict) -> dict:
    weakness_scores: dict[str, float] = defaultdict(float)
    evidence: list[dict] = []
    weak_units = feature_snapshot.get("unit_mastery", [])[:5]
    latest_scores = feature_snapshot.get("latest_scores", {})
    growth_rates = feature_snapshot.get("growth_rates", {})
    type_accuracy = feature_snapshot.get("type_accuracy", {})
    target_gap = feature_snapshot.get("target_gap", {})
    stability_index = feature_snapshot.get("stability_index", 0.0)

    low_mastery = [unit for unit in weak_units if unit["mastery"] < 60]
    if len(low_mastery) >= 2:
        weakness_scores[WeaknessType.CONCEPT_GAP.value] += 0.8
        evidence.append({"type": WeaknessType.CONCEPT_GAP.value, "reason": "Multiple units remain under 60 mastery.", "units": [u["unit_name"] for u in low_mastery[:3]]})
    if any(unit.get("prerequisite_unit_id") for unit in low_mastery):
        weakness_scores[WeaknessType.PREREQUISITE_GAP.value] += 0.9
        evidence.append({"type": WeaknessType.PREREQUISITE_GAP.value, "reason": "Low-mastery units include prerequisite-linked content."})

    weak_types = [question_type for question_type, score in type_accuracy.items() if score < 45]
    if len(weak_types) == 1:
        weakness_scores[WeaknessType.TYPE_BIAS.value] += 0.7
        evidence.append({"type": WeaknessType.TYPE_BIAS.value, "reason": "One question type is disproportionately weak.", "question_types": weak_types})

    if stability_index < 0.72:
        weakness_scores[WeaknessType.HIGH_VARIABILITY.value] += 0.85
        evidence.append({"type": WeaknessType.HIGH_VARIABILITY.value, "reason": "Recent exam volatility is high.", "stability_index": stability_index})

    low_subjects = [subject_code for subject_code, score in latest_scores.items() if score < 70]
    if len(low_subjects) >= 2:
        weakness_scores[WeaknessType.TIME_PRESSURE.value] += 0.55
        evidence.append({"type": WeaknessType.TIME_PRESSURE.value, "reason": "Several subjects stay below 70 despite repeated attempts.", "subjects": low_subjects})

    if any(score < 65 for score in latest_scores.values()) and any(rate > 0 for rate in growth_rates.values()):
        weakness_scores[WeaknessType.CALCULATION_MISTAKE.value] += 0.45
        evidence.append({"type": WeaknessType.CALCULATION_MISTAKE.value, "reason": "Improvement exists but execution errors are still likely."})

    if target_gap and target_gap.get("gap", 0) > 10:
        focus_subjects = sorted(target_gap.get("subject_weights", {}).items(), key=lambda item: item[1], reverse=True)[:2]
        evidence.append({"type": "target_gap", "reason": "Target university gap remains high in weighted subjects.", "subjects": [item[0] for item in focus_subjects], "gap": target_gap.get("gap")})

    if not weakness_scores:
        weakness_scores[WeaknessType.CONCEPT_GAP.value] = 0.4
        evidence.append({"type": WeaknessType.CONCEPT_GAP.value, "reason": "Fallback diagnosis because the data set is still sparse."})

    weak_subjects = []
    for subject_code, latest_score in sorted(latest_scores.items(), key=lambda item: item[1]):
        weak_subjects.append(
            {
                "subject_code": subject_code,
                "latest_score": latest_score,
                "growth_rate": growth_rates.get(subject_code, 0.0),
                "is_preferred": subject_code in feature_snapshot.get("preferred_subjects", []),
            }
        )

    return {
        "primary_weakness_type": max(weakness_scores.items(), key=lambda item: item[1])[0],
        "weakness_scores": {key: round(value, 4) for key, value in weakness_scores.items()},
        "weak_subjects": weak_subjects[:5],
        "weak_units": weak_units,
        "evidence": evidence,
        "feature_snapshot": feature_snapshot,
    }

