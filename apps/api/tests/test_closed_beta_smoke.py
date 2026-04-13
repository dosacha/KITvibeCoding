from __future__ import annotations


def test_student_closed_beta_core_routes(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")

    for path in [
        "/frontend/student/home",
        "/frontend/student/diagnosis",
        "/frontend/student/goal-gap",
        "/frontend/student/admission-direction",
        "/frontend/student/study-recipes",
        "/frontend/student/strategy-workspace",
        "/frontend/student/planner",
        "/frontend/student/growth",
        "/frontend/student/onboarding",
    ]:
        response = client.get(path, headers=headers)
        assert response.status_code == 200, (path, response.text)

    simulation = client.post(
        "/frontend/student/simulations/goal-scenario",
        headers=headers,
        json={"score_deltas": {"MATH": 5}, "weekly_hours_delta": 2},
    )
    assert simulation.status_code == 200, simulation.text
    assert "changed_subject_priorities" in simulation.json()

    note = client.post(
        "/frontend/student/strategy-workspace/notes",
        headers=headers,
        json={"notes": "이번 주는 수학 개념 복구를 먼저 진행하고 싶어."},
    )
    assert note.status_code == 200, note.text
    assert note.json()["student_workspace"]["notes"]

    planner = client.post("/frontend/student/planner/generate", headers=headers, json={})
    assert planner.status_code == 200, planner.text
    plan = planner.json()["plan"]
    assert plan["items"]

    reflection = client.post(
        "/frontend/student/planner/reflection",
        headers=headers,
        json={
            "went_well": "계획한 첫 과목을 마쳤어.",
            "stuck_at": "두 번째 과목은 시간이 부족했어.",
            "why_failed": "복습 시간이 예상보다 길었어.",
            "next_week_changes": "복습 시간을 먼저 배치할게.",
        },
    )
    assert reflection.status_code == 200, reflection.text
    assert reflection.json()["reflection"]["went_well"]


def test_instructor_closed_beta_core_routes(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")

    for path in [
        "/frontend/dashboard/instructor",
        "/frontend/students",
        "/frontend/exams",
        "/frontend/instructor/students/1/strategy-review",
    ]:
        response = client.get(path, headers=headers)
        assert response.status_code == 200, (path, response.text)

    exams = client.get("/frontend/exams", headers=headers).json()
    assert exams
    exam_id = exams[0]["id"]

    detail = client.get(f"/frontend/exams/{exam_id}/result-entry", headers=headers)
    assert detail.status_code == 200, detail.text
    assert "questions" in detail.json()

    csv_template = client.get(f"/frontend/exams/{exam_id}/csv-template", headers=headers)
    assert csv_template.status_code == 200, csv_template.text
    assert "csv_text" in csv_template.json()


def test_admin_closed_beta_governance_routes(client, auth_headers):
    headers = auth_headers("admin@unitflow.ai")

    for path in [
        "/frontend/universities/policies",
        "/universities/policies",
        "/audit-logs",
        "/change-history",
        "/recalculation-jobs",
        "/frontend/metadata",
    ]:
        response = client.get(path, headers=headers)
        assert response.status_code == 200, (path, response.text)

    metadata = client.get("/frontend/metadata", headers=headers).json()
    assert metadata["viewer"]["can_manage_policies"] is True
    assert metadata["viewer"]["can_view_audit"] is True
