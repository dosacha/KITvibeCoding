from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev

from sqlalchemy.orm import Session

from ..models import Exam, Question, QuestionUnitMapping, StudentProfile, StudentResult, Subject, TargetUniversityProfile, UniversityScorePolicy, Unit


def _safe_growth(values: list[float]) -> float:
    if len(values) < 2 or values[0] == 0:
        return 0.0
    return round((values[-1] - values[0]) / values[0], 4)


def _stability_index(values: list[float]) -> float:
    if len(values) <= 1:
        return 1.0
    deviation = pstdev(values)
    return round(max(0.0, 1 - (deviation / 30)), 4)


def build_student_features(db: Session, student_profile: StudentProfile) -> dict:
    results = db.query(StudentResult).filter(StudentResult.student_profile_id == student_profile.id).order_by(StudentResult.created_at.asc()).all()
    subjects = {subject.id: subject for subject in db.query(Subject).all()}
    questions = {question.id: question for question in db.query(Question).all()}

    subject_scores: dict[str, list[float]] = defaultdict(list)
    unit_attempts: dict[int, list[float]] = defaultdict(list)
    question_error_rates: dict[int, dict] = defaultdict(lambda: {"wrong": 0, "total": 0})
    type_score_map: dict[str, list[float]] = defaultdict(list)

    for result in results:
        subject = subjects[result.subject_id]
        subject_scores[subject.code].append(result.raw_score)
        for qid_str, answer in (result.question_breakdown or {}).items():
            qid = int(qid_str)
            question_error_rates[qid]["total"] += 1
            if not answer.get("is_correct", False):
                question_error_rates[qid]["wrong"] += 1
            question = questions.get(qid)
            if not question:
                continue
            type_score_map[question.question_type].append(1.0 if answer.get("is_correct", False) else 0.0)
            for mapping in db.query(QuestionUnitMapping).filter(QuestionUnitMapping.question_id == qid).all():
                unit_attempts[mapping.unit_id].append(1.0 if answer.get("is_correct", False) else 0.0)

    latest_scores = {code: scores[-1] for code, scores in subject_scores.items()}
    score_trends = {code: scores for code, scores in subject_scores.items()}
    growth_rates = {code: _safe_growth(scores) for code, scores in subject_scores.items()}
    stability_index = _stability_index([score for scores in subject_scores.values() for score in scores]) if subject_scores else 0.0

    units = {unit.id: unit for unit in db.query(Unit).all()}
    unit_mastery = []
    for unit_id, attempts in unit_attempts.items():
        unit = units.get(unit_id)
        if not unit:
            continue
        unit_mastery.append(
            {
                "unit_id": unit_id,
                "unit_name": unit.name,
                "subject_id": unit.subject_id,
                "mastery": round(mean(attempts) * 100, 2) if attempts else 0.0,
                "attempts": len(attempts),
                "prerequisite_unit_id": unit.prerequisite_unit_id,
            }
        )
    unit_mastery.sort(key=lambda item: item["mastery"])

    error_rates = []
    for question_id, counts in question_error_rates.items():
        question = questions.get(question_id)
        if not question or counts["total"] == 0:
            continue
        error_rates.append(
            {
                "question_id": question_id,
                "question_number": question.number,
                "exam_id": question.exam_id,
                "question_type": question.question_type,
                "error_rate": round(counts["wrong"] / counts["total"], 4),
            }
        )
    error_rates.sort(key=lambda item: item["error_rate"], reverse=True)

    target_gap = {}
    if student_profile.target_university_profile_id:
        target_profile = db.get(TargetUniversityProfile, student_profile.target_university_profile_id)
        if target_profile:
            policy = db.get(UniversityScorePolicy, target_profile.policy_id)
            if policy:
                weighted_score = 0.0
                covered_weight = 0.0
                for subject_code, weight in (policy.subject_weights or {}).items():
                    if subject_code in latest_scores:
                        weighted_score += latest_scores[subject_code] * weight
                        covered_weight += weight
                normalized = round(weighted_score / covered_weight, 2) if covered_weight else 0.0
                target_gap = {
                    "policy_id": policy.id,
                    "university_name": policy.university_name,
                    "admission_type": policy.admission_type,
                    "weighted_score": normalized,
                    "target_score": policy.target_score,
                    "gap": round(policy.target_score - normalized, 2),
                    "subject_weights": policy.subject_weights or {},
                }

    preferred_codes = []
    if student_profile.user:
        subject_code_map = {subject.id: subject.code for subject in subjects.values()}
        preferred_codes = [subject_code_map[sid] for sid in student_profile.user.preferred_subject_ids if sid in subject_code_map]

    return {
        "latest_scores": latest_scores,
        "score_trends": score_trends,
        "growth_rates": growth_rates,
        "unit_mastery": unit_mastery,
        "stability_index": stability_index,
        "question_error_rates": error_rates[:10],
        "type_accuracy": {k: round(mean(v) * 100, 2) for k, v in type_score_map.items()},
        "preferred_subjects": preferred_codes,
        "target_gap": target_gap,
        "exam_count": len(results),
    }

