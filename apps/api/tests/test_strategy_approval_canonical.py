from __future__ import annotations


def test_approving_alternative_variant_replaces_student_visible_strategy(client, auth_headers):
    instructor_headers = auth_headers('instructor@unitflow.ai')
    student_headers = auth_headers('student@unitflow.ai')

    student_dashboard = client.get('/frontend/dashboard/student', headers=student_headers)
    assert student_dashboard.status_code == 200, student_dashboard.text
    student_data = student_dashboard.json()['data']
    assert student_data['approved_strategy']['variant'] == 'basic'
    student_id = student_data['student']['id']

    before = client.get(f'/frontend/students/{student_id}/strategy-options', headers=instructor_headers)
    assert before.status_code == 200, before.text
    before_payload = before.json()
    conservative = next(
        variant for variant in before_payload['latest_set']['variants'] if variant['variant'] == 'conservative'
    )
    assert conservative['status'] in ('pending_review', 'draft', 'held')

    review = client.post(
        f"/strategies/{conservative['id']}/reviews",
        headers=instructor_headers,
        json={'decision': 'approve', 'reason': '대안 전략 채택'},
    )
    assert review.status_code == 200, review.text

    after = client.get(f'/frontend/students/{student_id}/strategy-options', headers=instructor_headers)
    assert after.status_code == 200, after.text
    after_payload = after.json()

    assert after_payload['approved']['id'] == conservative['id']
    assert after_payload['approved']['variant'] == 'conservative'
    assert after_payload['approved']['status'] == 'approved'
    assert after_payload['approved']['is_student_visible'] is True

    latest_variants = {variant['variant']: variant for variant in after_payload['latest_set']['variants']}
    assert latest_variants['conservative']['status'] == 'approved'
    assert latest_variants['basic']['status'] == 'archived'

    student_dashboard_after = client.get('/frontend/dashboard/student', headers=student_headers)
    assert student_dashboard_after.status_code == 200, student_dashboard_after.text
    assert student_dashboard_after.json()['data']['approved_strategy']['variant'] == 'conservative'
