"""Tests for the slice 1 additive frontend adapter endpoints.

These tests guard the operational input UI's data contract:

* ``GET /frontend/exams/{exam_id}`` returns exam metadata, the full question
  list with multi-weight unit mappings, the visible roster, and existing
  results in one round trip.
* ``GET /frontend/exams/{exam_id}/csv-template`` returns a CSV template aligned
  with the upload-csv endpoint.
* ``GET /frontend/exams/{exam_id}/csv-template.csv`` serves the same payload as
  a downloadable ``text/csv`` file.

The tests intentionally exercise both admin and instructor roles so the
visibility filtering remains explicit.
"""
from __future__ import annotations


def _first_visible_exam(client, headers):
    response = client.get("/frontend/exams", headers=headers)
    assert response.status_code == 200, response.text
    exams = response.json()
    assert exams, "expected at least one visible exam in seeded data"
    return exams[0]


def test_exam_detail_returns_aggregated_payload(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    exam_summary = _first_visible_exam(client, headers)

    response = client.get(f"/frontend/exams/{exam_summary['id']}", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["exam"]["id"] == exam_summary["id"]
    assert payload["exam"]["subject_name"]
    assert payload["exam"]["total_score"] > 0

    # Every question carries its multi-weight mapping list (may be empty per
    # question but the field is always present and well-typed).
    assert isinstance(payload["questions"], list)
    assert payload["questions"], "seeded exams should have at least one question"
    for question in payload["questions"]:
        assert "id" in question
        assert "number" in question
        assert "unit_mappings" in question
        for mapping in question["unit_mappings"]:
            assert "unit_id" in mapping
            assert "weight" in mapping

    # The roster contains every visible student for this exam.
    assert isinstance(payload["roster"], list)
    assert payload["roster"], "instructor should see at least one student in their class"
    for entry in payload["roster"]:
        assert "student_profile_id" in entry
        assert "full_name" in entry
        assert "has_result" in entry

    # Existing seeded results show up keyed by student_profile_id.
    assert isinstance(payload["results"], list)
    if payload["results"]:
        result = payload["results"][0]
        assert "responses" in result
        assert "result_status" in result


def test_exam_detail_404_for_unknown_id(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    response = client.get("/frontend/exams/999999", headers=headers)
    assert response.status_code == 404


def test_exam_detail_blocks_students(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    # Find an exam id via admin then try as student
    admin_headers = auth_headers("admin@unitflow.ai")
    exam = _first_visible_exam(client, admin_headers)

    response = client.get(f"/frontend/exams/{exam['id']}", headers=student_headers)
    assert response.status_code == 403


def test_csv_template_json_endpoint(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    exam = _first_visible_exam(client, headers)

    response = client.get(f"/frontend/exams/{exam['id']}/csv-template", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["filename"].endswith(".csv")
    assert "student_email" in payload["headers"]
    assert "student_profile_id" in payload["headers"]
    assert "result_status" in payload["headers"]
    # At least one q{N} column should appear because every seeded exam has
    # questions.
    assert any(header.startswith("q") and header[1:].isdigit() for header in payload["headers"])

    assert payload["sample_rows"], "csv template should contain at least one sample row"
    for row in payload["sample_rows"]:
        assert len(row) == len(payload["headers"]), "sample rows must match header width"

    assert payload["notes"], "csv template should ship with usage notes"
    # csv_text round-trips through the same headers.
    first_line = payload["csv_text"].splitlines()[0]
    assert first_line == ",".join(payload["headers"])


def test_csv_template_download_endpoint_serves_text_csv(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    exam = _first_visible_exam(client, headers)

    response = client.get(f"/frontend/exams/{exam['id']}/csv-template.csv", headers=headers)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers.get("content-disposition", "")
    body = response.text
    assert body.startswith("student_email,student_profile_id")


def test_csv_template_404_for_unknown_exam(client, auth_headers):
    headers = auth_headers("admin@unitflow.ai")
    response = client.get("/frontend/exams/999999/csv-template", headers=headers)
    assert response.status_code == 404
