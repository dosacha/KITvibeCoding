from __future__ import annotations


def render_strategy_summary(structured_plan: dict, diagnosis: dict, target_gap: dict) -> str:
    focus_subjects = ", ".join(item["subject_code"] for item in structured_plan.get("priority_subjects", [])[:2])
    top_units = ", ".join(item["unit_name"] for item in structured_plan.get("priority_units", [])[:3])
    return (
        f"현재 핵심 취약 유형은 {diagnosis.get('primary_weakness_type', 'concept_gap')}입니다. "
        f"{target_gap.get('university_name', '목표 대학')} 기준 격차가 {target_gap.get('gap', 0)}점이므로, "
        f"이번 4주에는 {focus_subjects} 중심으로 점수 효율을 높이고 {top_units} 순서로 단원 보완을 진행하는 것이 가장 합리적입니다."
    )
