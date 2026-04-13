"""Tests for the slice 2 strategy options endpoint.

Guards the data contract for the StudentDetailPage strategy comparison view.
The seeded data ships with both ``basic`` and ``conservative`` strategies for
each student, so the latest set should always have at least two variants and
the approved one should match what the student dashboard shows.
"""
from __future__ import annotations


def _first_visible_student_id(client, headers):
    response = client.get("/frontend/students", headers=headers)
    assert response.status_code == 200, response.text
    students = response.json()
    assert students, "expected at least one visible student"
    return students[0]["id"]


def test_strategy_options_returns_latest_set(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    student_id = _first_visible_student_id(client, headers)

    response = client.get(f"/frontend/students/{student_id}/strategy-options", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["student_id"] == student_id
    latest_set = payload["latest_set"]
    assert latest_set is not None
    assert latest_set["diagnosis_id"] is not None
    assert latest_set["generated_at"]

    variants = latest_set["variants"]
    assert len(variants) >= 2, "seeded recalculation should produce both basic and conservative"
    variant_names = {variant["variant"] for variant in variants}
    assert {"basic", "conservative"}.issubset(variant_names)

    # basic comes first in the canonical ordering
    assert variants[0]["variant"] == "basic"

    for variant in variants:
        assert "structured_plan" in variant
        assert "rationale" in variant
        assert "risk_factors" in variant
        assert "instructor_explanation" in variant
        assert "student_coaching" in variant
        assert variant["explanation_source"] in {"llm", "deterministic_fallback"}
        assert "rationale_bullets" in variant
        assert "risk_translation" in variant
        assert "next_check_in_message" in variant
        assert isinstance(variant["is_approved"], bool)
        assert isinstance(variant["is_student_visible"], bool)


def test_strategy_options_marks_approved_consistently_with_student_dashboard(client, auth_headers):
    instructor_headers = auth_headers("instructor@unitflow.ai")
    student_headers = auth_headers("student@unitflow.ai")

    # The student dashboard endpoint exposes whatever the student is actually
    # seeing right now — strategy_options.approved must agree with that.
    student_dashboard = client.get("/frontend/dashboard/student", headers=student_headers).json()["data"]
    assert student_dashboard["approved_strategy"] is not None
    expected_variant = student_dashboard["approved_strategy"]["variant"]

    # Find the matching student id via the student-visible endpoint.
    student_id = student_dashboard["student"]["id"]

    options = client.get(
        f"/frontend/students/{student_id}/strategy-options",
        headers=instructor_headers,
    ).json()
    assert options["approved"] is not None
    assert options["approved"]["variant"] == expected_variant
    assert options["approved"]["is_student_visible"] is True
    assert options["approved"]["is_approved"] is True

    # The latest set should also flag exactly that variant as student-visible.
    visible_in_set = [variant for variant in options["latest_set"]["variants"] if variant["is_student_visible"]]
    assert len(visible_in_set) == 1
    assert visible_in_set[0]["variant"] == expected_variant


def test_strategy_options_includes_diagnosis_signals(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    student_id = _first_visible_student_id(client, headers)

    payload = client.get(f"/frontend/students/{student_id}/strategy-options", headers=headers).json()
    diagnosis = payload["diagnosis"]
    assert diagnosis is not None
    assert diagnosis["primary_weakness_type"]
    assert "weak_subjects" in diagnosis
    assert "weak_units" in diagnosis
    assert "evidence" in diagnosis
    assert isinstance(diagnosis["low_confidence_flag"], bool)
    assert isinstance(diagnosis["confidence_score"], (int, float))


def test_strategy_options_review_history_after_review(client, auth_headers):
    instructor_headers = auth_headers("instructor@unitflow.ai")
    student_id = _first_visible_student_id(client, instructor_headers)

    initial = client.get(f"/frontend/students/{student_id}/strategy-options", headers=instructor_headers).json()
    pending_basic = next(
        (
            variant
            for variant in initial["latest_set"]["variants"]
            if variant["variant"] == "basic" and variant["status"] in ("pending_review", "draft", "held")
        ),
        None,
    )
    if pending_basic is None:
        # Seed already approved both variants — pick any non-approved one to hold.
        pending_basic = next(
            (variant for variant in initial["latest_set"]["variants"] if variant["status"] != "approved"),
            None,
        )
    if pending_basic is None:
        # Nothing to review against; the seed dataset always leaves at least
        # one strategy for review, but be defensive.
        return

    review_response = client.post(
        f"/strategies/{pending_basic['id']}/reviews",
        json={"decision": "hold", "reason": "테스트용 보류"},
        headers=instructor_headers,
    )
    assert review_response.status_code == 200, review_response.text

    after = client.get(f"/frontend/students/{student_id}/strategy-options", headers=instructor_headers).json()
    history = after["review_history"]
    assert any(
        entry["strategy_id"] == pending_basic["id"] and entry["decision"] == "hold"
        for entry in history
    ), "review history should surface the freshly recorded hold decision"


def test_strategy_options_blocks_other_students(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    # Student profile id 2 is the other Alpha student in the seeded dataset.
    response = client.get("/frontend/students/2/strategy-options", headers=student_headers)
    # Either 403 (peer student) or 404 — both are correct refusals; what we
    # must avoid is leaking another student's strategies.
    assert response.status_code in (403, 404)
