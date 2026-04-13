from __future__ import annotations

import json
import logging
from typing import Any

from ..llm.schema import normalize_explanation_payload
from ..llm.strategy_writer import maybe_generate_strategy_copy
from ..time_utils import utc_now


logger = logging.getLogger("unitflow.strategy_explanation")


def build_fallback_copy(context: dict[str, Any]) -> dict[str, Any]:
    top_subjects = [item.get("subject_name") for item in context.get("subject_priorities", []) if item.get("subject_name")]
    top_units = [item.get("unit_name") for item in context.get("unit_study_order", []) if item.get("unit_name")]
    goal = context.get("goal") or {}
    weakness = context.get("primary_weakness") or "진단 보완"
    next_check_in = context.get("next_check_in") or {}
    low_confidence = bool(context.get("low_confidence"))

    goal_label = " ".join(
        item for item in [goal.get("university_name"), goal.get("target_department")] if item
    ) or "현재 목표대학"
    subject_text = ", ".join(top_subjects[:2]) or "우선순위 과목"
    unit_text = ", ".join(top_units[:2]) or "우선 보완 단원"

    if low_confidence:
        summary = f"{goal_label} 기준 전략은 유지하되, 추가 데이터 수집 우선으로 {subject_text} 기록을 먼저 보강해야 해."
        student_coaching = f"이번 주에는 결론을 서두르기보다 시험 결과와 학습 습관 데이터를 더 채우면서 {unit_text}부터 작게 실행해보자."
    else:
        summary = f"{goal_label} 기준으로 {subject_text}와 {unit_text} 보완이 가장 먼저야."
        student_coaching = f"한 번에 많이 바꾸기보다 {unit_text}에서 작은 완료 경험을 만들고, 다음 점검 때 변화를 확인하자."

    rationale_bullets = []
    for item in context.get("subject_priorities", [])[:3]:
        rationale_bullets.append(
            {
                "label": item.get("subject_name") or item.get("subject_code") or "우선 과목",
                "detail": item.get("reason")
                or f"목표대학 반영비와 현재 gap을 함께 본 결과 우선순위가 높게 계산됐어.",
            }
        )
    if not rationale_bullets:
        rationale_bullets.append({"label": "데이터 보강", "detail": "최근 시험과 단원 기록이 더 쌓이면 우선순위를 더 안정적으로 볼 수 있어."})

    risk_translation = [
        {
            "label": item.get("label", "주의 요인"),
            "detail": item.get("detail", "전략 실행 중 변동 가능성이 있어 다음 점검에서 확인해야 해."),
        }
        for item in context.get("risk_factors", [])[:3]
        if isinstance(item, dict)
    ]
    if low_confidence:
        risk_translation.insert(
            0,
            {
                "label": "추가 데이터 수집 우선",
                "detail": "현재 신뢰도가 낮아 전략 확정보다 최근 결과, 단원 기록, 학습 습관 입력을 먼저 보강하는 편이 좋아.",
            },
        )
    if not risk_translation:
        risk_translation.append({"label": "점검 필요", "detail": "계획 실행률과 다음 결과를 보고 우선순위를 다시 조정해야 해."})

    next_check_in_message = (
        f"{next_check_in.get('date')}에 실행률과 {subject_text} 변화를 확인하자."
        if next_check_in.get("date")
        else "다음 점검에서 실행률과 우선 과목 변화를 함께 확인하자."
    )

    return normalize_explanation_payload(
        {
            "summary": summary,
            "student_coaching": student_coaching,
            "instructor_explanation": (
                f"진단 유형 {weakness}, 목표 {goal_label}, 과목 우선순위 {subject_text}, 단원 우선순위 {unit_text}를 근거로 설명을 생성했습니다."
                + (" 현재는 low confidence 상태이므로 추가 데이터 수집을 우선 안내했습니다." if low_confidence else "")
            ),
            "rationale_bullets": rationale_bullets,
            "risk_translation": risk_translation,
            "next_check_in_message": next_check_in_message,
        }
    )


def generate_explanations(context: dict[str, Any]) -> dict[str, Any]:
    llm_result, metadata = maybe_generate_strategy_copy(context)
    source = metadata["source"] if llm_result else "deterministic_fallback"
    explanation = llm_result or build_fallback_copy(context)
    generated = {
        **explanation,
        "explanation_source": source,
        "explanation_model": metadata["model"] if source == "llm" else None,
        "explanation_generated_at": utc_now().isoformat(),
    }
    logger.info(
        json.dumps(
            {
                "event": "strategy_explanation_finalized",
                "strategy_id": context.get("strategy_id"),
                "student_profile_id": context.get("student_profile_id"),
                "explanation_source": generated["explanation_source"],
                "model": generated["explanation_model"],
                "llm_error_type": metadata.get("llm_error_type"),
                "llm_error_message": metadata.get("llm_error_message"),
                "latency_ms": metadata.get("latency_ms"),
            },
            ensure_ascii=False,
        )
    )
    return generated
