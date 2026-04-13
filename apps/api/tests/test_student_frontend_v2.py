from __future__ import annotations


def test_student_v2_aggregate_endpoints(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")
    paths = [
        "/frontend/student/home",
        "/frontend/student/diagnosis",
        "/frontend/student/goal-gap",
        "/frontend/student/confidence-checklist",
        "/frontend/student/admission-direction",
        "/frontend/student/study-recipes",
        "/frontend/student/strategy-workspace",
        "/frontend/student/planner",
        "/frontend/student/growth",
        "/frontend/student/onboarding",
    ]

    for path in paths:
        response = client.get(path, headers=headers)
        assert response.status_code == 200, f"{path}: {response.text}"
        assert isinstance(response.json(), dict)

    home = client.get("/frontend/student/home", headers=headers).json()
    assert "today_actions" in home
    assert "goal_gap" in home
    assert "strategy_workspace" in home

    gap = client.get("/frontend/student/goal-gap", headers=headers).json()
    assert gap["subject_gaps"]
    assert gap["highest_leverage_subject"] is not None


def test_student_v2_blocks_staff_from_student_self_endpoints(client, auth_headers):
    headers = auth_headers("instructor@unitflow.ai")
    response = client.get("/frontend/student/home", headers=headers)
    assert response.status_code == 403


def test_student_workspace_submit_and_instructor_review(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    instructor_headers = auth_headers("instructor@unitflow.ai")

    workspace_response = client.post(
        "/frontend/student/strategy-workspace",
        headers=student_headers,
        json={
            "overrides": {
                "weekly_total_hours": 12,
                "weekly_time_allocation": [
                    {"subject_code": "MATH", "subject_name": "수학", "hours": 5},
                    {"subject_code": "ENG", "subject_name": "영어", "hours": 3},
                ],
            },
            "student_note": "평일에는 수학을 먼저 하고 싶어.",
        },
    )
    assert workspace_response.status_code == 200, workspace_response.text
    workspace = workspace_response.json()["workspace"]
    assert workspace["status"] == "draft"

    notes_response = client.post(
        "/frontend/student/strategy-workspace/notes",
        headers=student_headers,
        json={"notes": "평일에는 수학을 먼저 배치하고 싶어."},
    )
    assert notes_response.status_code == 200, notes_response.text
    assert notes_response.json()["student_workspace"]["notes"] == "평일에는 수학을 먼저 배치하고 싶어."
    assert "review_timeline" in notes_response.json()

    submit_response = client.post("/frontend/student/strategy-workspace/submit", headers=student_headers)
    assert submit_response.status_code == 200, submit_response.text
    assert submit_response.json()["workspace"]["status"] == "submitted_for_review"

    review_response = client.get(
        "/frontend/instructor/students/1/strategy-review",
        headers=instructor_headers,
    )
    assert review_response.status_code == 200, review_response.text
    assert review_response.json()["student_workspace"]["id"] == workspace["id"]

    approve_response = client.post(
        f"/frontend/strategy-workspaces/{workspace['id']}/reviews",
        headers=instructor_headers,
        json={
            "decision": "approve",
            "student_message": "이번 주는 학생 수정안대로 진행하자.",
            "instructor_note": "가용 시간과 목표 과목이 맞음.",
        },
    )
    assert approve_response.status_code == 200, approve_response.text
    assert approve_response.json()["student_workspace"]["status"] == "approved"

    student_workspace = client.get("/frontend/student/strategy-workspace", headers=student_headers).json()
    assert student_workspace["approved"]["variant"] == "student_workspace"


def test_student_planner_generate_check_and_reflect(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")

    generated = client.post("/frontend/student/planner/generate", headers=headers, json={})
    assert generated.status_code == 200, generated.text
    plan = generated.json()["plan"]
    assert plan["items"]
    assert "planned_total_minutes" in plan
    assert "completion_rate_cached" in plan
    assert "status" in plan["items"][0]

    first_item_id = plan["items"][0]["id"]
    checked = client.post(
        f"/frontend/student/planner/items/{first_item_id}/check",
        headers=headers,
        json={"checked": True, "completed_minutes": 30, "student_note": "계획대로 진행함"},
    )
    assert checked.status_code == 200, checked.text
    updated_plan = checked.json()["plan"]
    assert updated_plan["summary"]["completed_minutes"] >= 30

    unchecked = client.post(
        f"/frontend/student/planner/items/{first_item_id}/check",
        headers=headers,
        json={"completed": False, "completed_minutes": 0},
    )
    assert unchecked.status_code == 200, unchecked.text
    unchecked_item = next(item for item in unchecked.json()["plan"]["items"] if item["id"] == first_item_id)
    assert unchecked_item["status"] == "planned"

    reflection = client.post(
        f"/frontend/student/planner/{plan['id']}/reflection",
        headers=headers,
        json={
            "good": "수학 시간을 지킴",
            "blocked": "영어 지문 시간이 부족함",
            "failure_reason": "오답 정리가 늦어짐",
            "next_adjustment": "영어를 하루 앞당김",
        },
    )
    assert reflection.status_code == 200, reflection.text
    assert reflection.json()["plan"]["reflections"]

    current_reflection = client.post(
        "/frontend/student/planner/reflection",
        headers=headers,
        json={
            "went_well": "수학 루틴을 지켰어.",
            "stuck_at": "영어 지문 시간이 부족했어.",
            "why_failed": "오답 정리가 밀렸어.",
            "next_week_changes": "영어를 하루 앞당길게.",
        },
    )
    assert current_reflection.status_code == 200, current_reflection.text
    assert current_reflection.json()["reflection"]["went_well"] == "수학 루틴을 지켰어."

    summary = client.get(f"/frontend/student/planner/{plan['id']}/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    assert summary.json()["summary"]["item_count"] >= 1
