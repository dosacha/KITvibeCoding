from __future__ import annotations

import json
from typing import Any

from ..config import settings
from .prompts import STRATEGY_SYSTEM_PROMPT
from .schema import STRATEGY_EXPLANATION_SCHEMA


def maybe_generate_strategy_copy(context: dict[str, Any]) -> dict[str, str] | None:
    if not settings.openai_api_key:
        return None

    try:
        from openai import OpenAI  # type: ignore
    except Exception:  # noqa: BLE001
        return None

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.responses.create(
            model=settings.openai_model,
            input=[
                {"role": "system", "content": STRATEGY_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "strategy_explanation",
                    "schema": STRATEGY_EXPLANATION_SCHEMA,
                }
            },
        )
        return json.loads(response.output_text)
    except Exception:  # noqa: BLE001
        return None
