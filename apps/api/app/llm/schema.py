from __future__ import annotations

from typing import Any


RATIONALE_BULLET_SCHEMA = {
    "type": "object",
    "properties": {
        "label": {"type": "string"},
        "detail": {"type": "string"},
    },
    "required": ["label", "detail"],
    "additionalProperties": False,
}


STRATEGY_EXPLANATION_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "student_coaching": {"type": "string"},
        "instructor_explanation": {"type": "string"},
        "rationale_bullets": {
            "type": "array",
            "items": RATIONALE_BULLET_SCHEMA,
        },
        "risk_translation": {
            "type": "array",
            "items": RATIONALE_BULLET_SCHEMA,
        },
        "next_check_in_message": {"type": "string"},
    },
    "required": [
        "summary",
        "student_coaching",
        "instructor_explanation",
        "rationale_bullets",
        "risk_translation",
        "next_check_in_message",
    ],
    "additionalProperties": False,
}


def normalize_explanation_payload(payload: dict[str, Any]) -> dict[str, Any]:
    normalized = {
        "summary": str(payload.get("summary") or "").strip(),
        "student_coaching": str(payload.get("student_coaching") or "").strip(),
        "instructor_explanation": str(payload.get("instructor_explanation") or "").strip(),
        "rationale_bullets": _normalize_bullets(payload.get("rationale_bullets")),
        "risk_translation": _normalize_bullets(payload.get("risk_translation")),
        "next_check_in_message": str(payload.get("next_check_in_message") or "").strip(),
    }
    missing = [key for key, value in normalized.items() if value in ("", [])]
    if missing:
        raise ValueError(f"strategy explanation missing required content: {', '.join(missing)}")
    return normalized


def _normalize_bullets(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []
    bullets: list[dict[str, str]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()
        detail = str(item.get("detail") or "").strip()
        if label and detail:
            bullets.append({"label": label, "detail": detail})
    return bullets
