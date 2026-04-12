from __future__ import annotations

from typing import Any

from ..llm.strategy_writer import maybe_generate_strategy_copy


def build_fallback_copy(context: dict[str, Any]) -> dict[str, str]:
    top_subjects = context.get("top_subjects", [])
    top_units = context.get("top_units", [])
    goal = context.get("goal") or {}
    weakness = context.get("primary_weakness")
    summary = (
        f"1순위 목표는 {goal.get('university_name', '미설정')} {goal.get('target_department', '')} 기준이며, "
        f"현재는 {', '.join(top_subjects[:2]) or '핵심 과목'} 보강과 {', '.join(top_units[:2]) or '핵심 단원'} 정리가 우선입니다."
    )
    instructor_explanation = (
        f"대학 반영 비중, 현재 격차, 성장 여지, 데이터 신뢰도를 결합해 우선순위를 산출했습니다. "
        f"주 진단 유형은 {weakness}이며, 상위 과목과 단원은 해당 유형을 가장 빠르게 개선할 수 있는 순서로 정렬했습니다."
    )
    student_coaching = (
        f"이번 주에는 한 번에 많이 바꾸기보다 우선순위가 높은 과목부터 짧고 반복적인 루틴으로 진행하세요. "
        f"특히 {', '.join(top_units[:2]) or '핵심 단원'}에서 작은 완료 경험을 쌓는 것이 중요합니다."
    )
    return {
        "summary": summary,
        "instructor_explanation": instructor_explanation,
        "student_coaching": student_coaching,
    }


def generate_explanations(context: dict[str, Any]) -> dict[str, str]:
    llm_result = maybe_generate_strategy_copy(context)
    if llm_result:
        return llm_result
    return build_fallback_copy(context)
