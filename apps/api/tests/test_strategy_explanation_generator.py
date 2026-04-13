from __future__ import annotations

import json
import sys
import types

from app.config import settings
from app.engines.explanation import generate_explanations
from app.llm.schema import STRATEGY_EXPLANATION_SCHEMA


def _context(low_confidence: bool = False) -> dict:
    return {
        "student_profile_id": 42,
        "variant": "basic",
        "goal": {
            "university_name": "서울공대",
            "target_department": "컴퓨터공학과",
            "admission_type": "정시",
            "target_score": 88,
        },
        "primary_weakness": "concept_gap",
        "subject_priorities": [
            {
                "subject_code": "MATH",
                "subject_name": "수학",
                "priority_score": 0.9,
                "gap_score": 18,
                "confidence": 0.7,
                "reason": "목표대학 반영비와 현재 gap이 모두 높게 계산됐어.",
            }
        ],
        "weekly_time_allocation": [{"subject_name": "수학", "hours": 5, "focus": "개념 복구"}],
        "unit_study_order": [{"subject_name": "수학", "unit_name": "미적분", "effective_mastery": 42}],
        "study_methods": [{"label": "개념 확인", "detail": "짧게 정리하고 바로 확인 문제를 풀어."}],
        "risk_factors": [{"label": "집중 분산", "detail": "우선순위가 흐려질 수 있어."}],
        "confidence_score": 0.3 if low_confidence else 0.8,
        "low_confidence": low_confidence,
        "next_check_in": {"days": 7, "date": "2026-04-20"},
        "instructor_rationale": "수학 gap이 가장 큼.",
    }


def _assert_shape(payload: dict):
    expected = set(STRATEGY_EXPLANATION_SCHEMA["required"]) | {
        "explanation_source",
        "explanation_model",
        "explanation_generated_at",
    }
    assert expected.issubset(payload.keys())
    assert isinstance(payload["rationale_bullets"], list)
    assert isinstance(payload["risk_translation"], list)
    assert payload["explanation_generated_at"]


def test_explanation_uses_fallback_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", None)
    monkeypatch.setattr(settings, "openai_strategy_explanation_enabled", True)

    payload = generate_explanations(_context())

    _assert_shape(payload)
    assert payload["explanation_source"] == "deterministic_fallback"
    assert payload["explanation_model"] is None


def test_explanation_uses_llm_when_mock_succeeds(monkeypatch):
    class FakeResponses:
        def create(self, **kwargs):
            assert kwargs["model"] == "unit-test-model"
            assert kwargs["text"]["format"]["schema"]["required"]
            return types.SimpleNamespace(
                output_text=json.dumps(
                    {
                        "summary": "수학 gap을 우선으로 조정하자.",
                        "student_coaching": "이번 주는 미적분 개념을 작게 반복해보자.",
                        "instructor_explanation": "수학 반영비와 gap이 높아 우선순위가 높습니다.",
                        "rationale_bullets": [{"label": "수학", "detail": "gap과 반영비가 모두 높습니다."}],
                        "risk_translation": [{"label": "집중 분산", "detail": "우선순위 유지가 필요합니다."}],
                        "next_check_in_message": "2026-04-20에 실행률을 확인합니다.",
                    },
                    ensure_ascii=False,
                )
            )

    class FakeOpenAI:
        def __init__(self, *, api_key, timeout):
            assert api_key == "test-key"
            assert timeout == 3
            self.responses = FakeResponses()

    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(OpenAI=FakeOpenAI))
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "openai_model", "unit-test-model")
    monkeypatch.setattr(settings, "openai_strategy_explanation_enabled", True)
    monkeypatch.setattr(settings, "openai_strategy_explanation_timeout_seconds", 3)

    payload = generate_explanations(_context())

    _assert_shape(payload)
    assert payload["explanation_source"] == "llm"
    assert payload["explanation_model"] == "unit-test-model"


def test_explanation_falls_back_when_llm_fails(monkeypatch):
    class FailingResponses:
        def create(self, **kwargs):  # noqa: ARG002
            raise TimeoutError("request timed out")

    class FakeOpenAI:
        def __init__(self, *, api_key, timeout):  # noqa: ARG002
            self.responses = FailingResponses()

    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(OpenAI=FakeOpenAI))
    monkeypatch.setattr(settings, "openai_api_key", "test-key")
    monkeypatch.setattr(settings, "openai_strategy_explanation_enabled", True)

    payload = generate_explanations(_context())

    _assert_shape(payload)
    assert payload["explanation_source"] == "deterministic_fallback"
    assert payload["explanation_model"] is None


def test_low_confidence_fallback_prioritizes_more_data(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", None)

    payload = generate_explanations(_context(low_confidence=True))

    _assert_shape(payload)
    joined = " ".join(
        [
            payload["summary"],
            payload["student_coaching"],
            *[item["detail"] for item in payload["risk_translation"]],
        ]
    )
    assert "추가 데이터 수집 우선" in joined
