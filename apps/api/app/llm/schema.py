STRATEGY_EXPLANATION_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "instructor_explanation": {"type": "string"},
        "student_coaching": {"type": "string"},
    },
    "required": ["summary", "instructor_explanation", "student_coaching"],
    "additionalProperties": False,
}
