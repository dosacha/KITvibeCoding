from __future__ import annotations


def build_strategy(diagnosis: dict) -> dict:
    features = diagnosis["feature_snapshot"]
    subject_weights = features.get("target_gap", {}).get("subject_weights", {})
    weak_subjects = diagnosis.get("weak_subjects", [])
    ranked_subjects = []
    for item in weak_subjects:
        weight = subject_weights.get(item["subject_code"], 0.5)
        efficiency = round((weight * 100) + (item.get("growth_rate", 0.0) * 40) + ((100 - item.get("latest_score", 0.0)) * 0.2), 2)
        ranked_subjects.append({**item, "university_weight": weight, "efficiency_score": efficiency})
    ranked_subjects.sort(key=lambda item: item["efficiency_score"], reverse=True)

    total_efficiency = sum(item["efficiency_score"] for item in ranked_subjects[:3]) or 1.0
    time_allocation = [{"subject_code": item["subject_code"], "ratio_percent": round((item["efficiency_score"] / total_efficiency) * 100, 1)} for item in ranked_subjects[:3]]
    priority_units = [
        {
            "unit_id": unit["unit_id"],
            "unit_name": unit["unit_name"],
            "mastery": unit["mastery"],
            "sequence_reason": "선행 개념 보강 우선" if unit.get("prerequisite_unit_id") else "직접 점수 회복 우선",
        }
        for unit in diagnosis.get("weak_units", [])[:5]
    ]
    rationale = [
        {
            "kind": "subject_priority",
            "subject_code": item["subject_code"],
            "message": f"{item['subject_code']}는 대학 반영 비중 {item['university_weight']}와 최근 상승 여지를 함께 볼 때 투자 효율이 높습니다.",
        }
        for item in ranked_subjects[:2]
    ]
    rationale.extend(
        {
            "kind": "unit_priority",
            "unit_name": unit["unit_name"],
            "message": f"{unit['unit_name']} 단원은 이해도 {unit['mastery']}%로 낮아 우선 보완이 필요합니다.",
        }
        for unit in priority_units[:2]
    )
    return {
        "priority_subjects": ranked_subjects[:3],
        "priority_units": priority_units,
        "time_allocation": time_allocation,
        "coaching_points": [
            "오답 원인을 개념, 계산, 시간으로 분리해서 상담합니다.",
            "고가중치 과목과 최근 상승 여지가 큰 과목을 먼저 보강합니다.",
            "단원 보완 순서를 명확히 정해 학습 부담을 줄입니다.",
        ],
        "anti_patterns": [
            "모든 과목을 동일 비율로 분산 투자하는 방식",
            "약한 단원을 건너뛰고 문제풀이량만 늘리는 방식",
            "저가중치 과목에 과도한 시간을 쓰는 방식",
        ],
        "diagnosis_type": diagnosis["primary_weakness_type"],
        "rationale": rationale,
    }
