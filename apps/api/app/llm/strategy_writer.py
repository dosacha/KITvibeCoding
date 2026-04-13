from __future__ import annotations

import json
import logging
from time import perf_counter
from typing import Any

from ..config import settings
from .prompts import STRATEGY_SYSTEM_PROMPT, build_strategy_user_prompt
from .schema import STRATEGY_EXPLANATION_SCHEMA, normalize_explanation_payload


logger = logging.getLogger("unitflow.strategy_explanation")


def maybe_generate_strategy_copy(context: dict[str, Any]) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    metadata: dict[str, Any] = {
        "source": "deterministic_fallback",
        "model": None,
        "llm_error_type": None,
        "llm_error_message": None,
        "latency_ms": None,
    }
    if not settings.openai_strategy_explanation_enabled:
        metadata["llm_error_type"] = "disabled"
        return None, metadata
    if not settings.openai_api_key:
        metadata["llm_error_type"] = "missing_api_key"
        return None, metadata

    started = perf_counter()
    try:
        from openai import OpenAI  # type: ignore
    except Exception as exc:  # noqa: BLE001
        metadata["llm_error_type"] = type(exc).__name__
        metadata["llm_error_message"] = _safe_error_message(exc)
        return None, metadata

    try:
        client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_strategy_explanation_timeout_seconds,
        )
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": STRATEGY_SYSTEM_PROMPT},
                {"role": "user", "content": build_strategy_user_prompt(context)},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "strategy_explanation",
                    "schema": STRATEGY_EXPLANATION_SCHEMA,
                    "strict": True,
                }
            },
        )
        metadata["latency_ms"] = round((perf_counter() - started) * 1000, 2)
        parsed = normalize_explanation_payload(json.loads(response.output_text))
        metadata["source"] = "llm"
        metadata["model"] = settings.openai_model
        _log_explanation_event(context=context, metadata=metadata)
        return parsed, metadata
    except Exception as exc:  # noqa: BLE001
        metadata["latency_ms"] = round((perf_counter() - started) * 1000, 2)
        metadata["llm_error_type"] = type(exc).__name__
        metadata["llm_error_message"] = _safe_error_message(exc)
        _log_explanation_event(context=context, metadata=metadata)
        return None, metadata


def _safe_error_message(exc: Exception) -> str:
    message = str(exc).replace(settings.openai_api_key or "", "[redacted]")
    return message[:300]


def _log_explanation_event(*, context: dict[str, Any], metadata: dict[str, Any]) -> None:
    logger.info(
        json.dumps(
            {
                "event": "strategy_explanation_generated",
                "strategy_id": context.get("strategy_id"),
                "student_profile_id": context.get("student_profile_id"),
                "explanation_source": metadata.get("source"),
                "model": metadata.get("model"),
                "llm_error_type": metadata.get("llm_error_type"),
                "llm_error_message": metadata.get("llm_error_message"),
                "latency_ms": metadata.get("latency_ms"),
            },
            ensure_ascii=False,
        )
    )
