"""Tests for the slice 5 frontend adapter endpoints.

Covers:
* ``GET /frontend/exams/{exam_id}/result-entry`` — alias of exam detail, kept
  as a dedicated name because the original spec explicitly requests it.
* ``GET /frontend/universities/policies`` — policy list enriched with per-
  policy student counts so the admin UI can warn about impact radius.
* ``GET /frontend/dashboard/student`` — guards the "student dashboard shows
  only the approved strategy" invariant named in the original spec.
"""
from __future__ import annotations


def test_result_entry_endpoint_matches_exam_detail(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    exam_list = client.get("/frontend/exams", headers=headers).json()
    assert exam_list, "seeded exams expected"
    exam_id = exam_list[0]["id"]

    detail = client.get(f"/frontend/exams/{exam_id}", headers=headers)
    entry = client.get(f"/frontend/exams/{exam_id}/result-entry", headers=headers)

    assert detail.status_code == 200
    assert entry.status_code == 200
    assert detail.json() == entry.json(), "result-entry should be an exact alias of exam detail"


def test_result_entry_requires_staff_role(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    admin_headers = auth_headers("admin@unitflow.ai")
    exam_id = client.get("/frontend/exams", headers=admin_headers).json()[0]["id"]

    response = client.get(f"/frontend/exams/{exam_id}/result-entry", headers=student_headers)
    assert response.status_code == 403


def test_university_policies_adapter_includes_student_count(client, auth_headers):
    headers = auth_headers("admin@unitflow.ai")
    response = client.get("/frontend/universities/policies", headers=headers)
    assert response.status_code == 200, response.text

    payload = response.json()
    assert isinstance(payload, list)
    assert payload, "seeded university policies expected"

    for policy in payload:
        assert "id" in policy
        assert "university_name" in policy
        assert "admission_type" in policy
        assert "subject_weights" in policy
        assert "required_subjects" in policy
        assert "bonus_rules" in policy
        assert "grade_conversion_rules" in policy
        assert "student_count" in policy
        assert policy["student_count"] >= 0

    # At least one seeded policy should have a non-zero student count — the
    # seed script wires goals against policies for every demo student.
    assert any(policy["student_count"] > 0 for policy in payload)


def test_university_policies_adapter_blocks_students(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    response = client.get("/frontend/universities/policies", headers=student_headers)
    assert response.status_code == 403


def test_student_dashboard_shows_only_approved_strategy(client, auth_headers):
    """Guards the DoD line: student dashboard는 승인본만 노출.

    The student dashboard payload intentionally does not expose the raw
    ``status`` field — the student UI doesn't need it. To verify the
    invariant we instead cross-check against the instructor-facing
    strategy-options endpoint, which does carry the status field and is
    required to agree with what the student dashboard surfaces.
    """
    student_headers = auth_headers("student@unitflow.ai")
    instructor_headers = auth_headers("instructor@unitflow.ai")

    response = client.get("/frontend/dashboard/student", headers=student_headers)
    assert response.status_code == 200, response.text
    data = response.json()["data"]

    approved = data.get("approved_strategy")
    assert approved is not None, "seeded student should have an approved strategy"
    student_id = data["student"]["id"]
    surfaced_variant = approved["variant"]

    # Now compare against strategy-options, which is authoritative about status.
    options = client.get(
        f"/frontend/students/{student_id}/strategy-options",
        headers=instructor_headers,
    ).json()
    assert options["approved"] is not None
    assert options["approved"]["variant"] == surfaced_variant
    assert options["approved"]["status"] == "approved", (
        "strategy-options.approved must be status=approved, otherwise student dashboard "
        "is leaking a non-approved variant"
    )
    assert options["approved"]["is_student_visible"] is True

    # Also verify there is exactly one student-visible variant in the latest set.
    visible = [variant for variant in options["latest_set"]["variants"] if variant["is_student_visible"]]
    assert len(visible) == 1
    assert visible[0]["status"] == "approved"
