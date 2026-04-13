from __future__ import annotations


def test_student_home_exposes_visible_strategy_and_focus_items(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")

    response = client.get("/frontend/student/home", headers=headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "student_visible_strategy" in payload
    assert "coach_approved_strategy" in payload
    assert payload["approval_status"] in {
        "student_draft",
        "submitted_for_review",
        "coach_approved",
        "coach_revision_requested",
    }
    assert "today_focus_items" in payload

    saved = client.put(
        "/frontend/student/home/today-focus",
        headers=headers,
        json={"items": [{"title": "수학 확률 오답 8문제", "reason": "gap 기준 우선순위"}]},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["today_focus_items"][0]["source"] == "student"

    recommended = client.post(
        "/frontend/student/home/today-focus/recommend",
        headers=headers,
        json={"mode": "append", "user_note": "오늘은 40분만 가능"},
    )
    assert recommended.status_code == 200, recommended.text
    assert recommended.json()["explanation_source"] in {"llm", "deterministic_fallback"}
    assert len(recommended.json()["items"]) >= 1


def test_student_can_update_goal_and_queue_recalculation(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")
    before = client.get("/frontend/student/onboarding", headers=headers)
    assert before.status_code == 200, before.text

    response = client.put(
        "/frontend/student/onboarding/goals",
        headers=headers,
        json={
            "university_name": "서울대",
            "target_department": "컴퓨터공학",
            "admission_type": "정시",
            "notes": "학생이 직접 목표를 다시 선택",
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["primary_goal"]["department"] == "컴퓨터공학"

    jobs = client.get("/recalculation-jobs", headers=auth_headers("admin@unitflow.ai"))
    assert jobs.status_code == 200, jobs.text
    assert any(item["trigger"] == "GOAL_CHANGED" or item["trigger"] == "goal_changed" for item in jobs.json())


def test_workspace_recommend_save_submit_and_diff(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")

    saved = client.put(
        "/frontend/student/strategy-workspace",
        headers=headers,
        json={
            "weekly_total_hours": 18,
            "weekday_hours": 10,
            "weekend_hours": 8,
            "subject_allocations": [{"subject_code": "MATH", "subject_name": "수학", "hours": 8}],
            "unit_priorities": [{"unit_name": "확률", "priority": 1}],
            "study_method_overrides": [{"method": "오답 재풀이"}],
            "student_note": "이번 주는 수학 중심으로 진행",
        },
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["student_workspace"]["weekly_total_hours"] == 18
    assert "diff" in saved.json()

    recommended = client.post(
        "/frontend/student/strategy-workspace/recommend",
        headers=headers,
        json={"mode": "today_focus", "user_note": "오늘 할 일 위주로 추천"},
    )
    assert recommended.status_code == 200, recommended.text
    assert recommended.json()["suggested_workspace"]["status"] == "draft"
    assert recommended.json()["explanation_source"] in {"llm", "deterministic_fallback"}

    submitted = client.post("/frontend/student/strategy-workspace/submit", headers=headers)
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["workspace"]["status"] == "submitted_for_review"

    workspace = client.get("/frontend/student/strategy-workspace", headers=headers)
    assert workspace.status_code == 200, workspace.text
    assert workspace.json()["student_visible_strategy"]["source"] == "student_workspace"


def test_strategy_chat_persists_llm_and_instructor_messages(client, auth_headers):
    student_headers = auth_headers("student@unitflow.ai")
    instructor_headers = auth_headers("instructor@unitflow.ai")

    posted = client.post(
        "/frontend/student/strategy-chat/messages",
        headers=student_headers,
        json={"content": "오늘 계획을 더 줄여도 될까?", "recipient": "llm"},
    )
    assert posted.status_code == 200, posted.text
    appended = posted.json()["messages_appended"]
    assert [item["role"] for item in appended] == ["student", "assistant"]

    chat = client.get("/frontend/student/strategy-chat", headers=student_headers)
    assert chat.status_code == 200, chat.text
    assert len(chat.json()["messages"]) >= 2
    thread_id = chat.json()["thread"]["id"]

    instructor_view = client.get("/frontend/instructor/students/1/strategy-chat", headers=instructor_headers)
    assert instructor_view.status_code == 200, instructor_view.text
    instructor_reply = client.post(
        "/frontend/instructor/students/1/strategy-chat/messages",
        headers=instructor_headers,
        json={"content": "완료율을 보고 10% 줄여도 좋아.", "recipient": "student"},
    )
    assert instructor_reply.status_code == 200, instructor_reply.text

    message_id = appended[0]["id"]
    deleted = client.delete(f"/frontend/student/strategy-chat/messages/{message_id}", headers=student_headers)
    assert deleted.status_code == 200, deleted.text

    thread_delete = client.delete(f"/frontend/student/strategy-chat/thread/{thread_id}", headers=student_headers)
    assert thread_delete.status_code == 200, thread_delete.text


def test_community_exam_create_search_submit_and_stats(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")

    created = client.post(
        "/frontend/student/community-exams",
        headers=headers,
        json={
            "title": "공유 수학 미니 모의고사",
            "subject_name": "수학",
            "source_kind": "mock",
            "question_count": 3,
            "choice_count": 5,
            "answer_key": ["1", "3", "5"],
            "description": "학생이 올린 공유 시험",
        },
    )
    assert created.status_code == 200, created.text
    exam_id = created.json()["exam"]["id"]

    search = client.get("/frontend/student/community-exams?query=수학", headers=headers)
    assert search.status_code == 200, search.text
    assert any(item["id"] == exam_id for item in search.json()["exams"])

    submitted = client.post(
        f"/frontend/student/community-exams/{exam_id}/submissions",
        headers=headers,
        json={
            "choices": [
                {"question_number": 1, "selected_choice": "1"},
                {"question_number": 2, "selected_choice": "2"},
                {"question_number": 3, "selected_choice": "5"},
            ]
        },
    )
    assert submitted.status_code == 200, submitted.text
    stats = submitted.json()
    assert stats["questions"][0]["correct_rate"] == 1
    assert stats["questions"][1]["my_choice"] == "2"
    assert stats["questions"][1]["choice_distribution"]


def test_planner_regenerate_reflection_and_simulation_are_dynamic(client, auth_headers):
    headers = auth_headers("student@unitflow.ai")
    generated = client.post("/frontend/student/planner/generate", headers=headers, json={})
    assert generated.status_code == 200, generated.text
    plan = generated.json()["plan"]
    first_item = plan["items"][0]

    checked = client.patch(
        f"/frontend/student/planner/items/{first_item['id']}",
        headers=headers,
        json={"status": "completed", "completed_minutes": 35},
    )
    assert checked.status_code == 200, checked.text

    regenerated = client.post(
        f"/frontend/student/planner/{plan['id']}/regenerate",
        headers=headers,
        json={"reason": "manual", "preserve_completed": True},
    )
    assert regenerated.status_code == 200, regenerated.text
    summary = regenerated.json()["regeneration_summary"]
    assert summary["preserved_completed"] is True
    assert "moved_items_count" in summary

    reflection = client.post(
        f"/frontend/student/planner/{plan['id']}/reflection",
        headers=headers,
        json={"wins_text": "수학 완료", "blocker_text": "영어 시간 부족", "failure_reason": "계획 과다"},
    )
    assert reflection.status_code == 200, reflection.text
    assert reflection.json()["reflection_saved"] is True
    assert isinstance(reflection.json()["recommended_adjustments"], list)

    base_sim = client.post(
        "/frontend/student/simulations/goal-scenario",
        headers=headers,
        json={"subject_score_deltas": [{"subject_code": "MATH", "delta": 0}], "weekly_hours_delta": 0},
    )
    changed_sim = client.post(
        "/frontend/student/simulations/goal-scenario",
        headers=headers,
        json={"subject_score_deltas": [{"subject_code": "MATH", "delta": 5}], "weekly_hours_delta": 4},
    )
    assert base_sim.status_code == 200, base_sim.text
    assert changed_sim.status_code == 200, changed_sim.text
    assert changed_sim.json()["scenario"]["changed_fields"]
    assert base_sim.json()["scenario"] != changed_sim.json()["scenario"]


def test_student_self_directed_endpoints_enforce_roles(client, auth_headers):
    instructor_headers = auth_headers("instructor@unitflow.ai")
    response = client.get("/frontend/student/community-exams", headers=instructor_headers)
    assert response.status_code == 403

    response = client.post(
        "/frontend/student/strategy-chat/messages",
        headers=instructor_headers,
        json={"content": "x", "recipient": "llm"},
    )
    assert response.status_code == 403
