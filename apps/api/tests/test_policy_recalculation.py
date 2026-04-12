from __future__ import annotations


def test_policy_update_creates_impact_recalculation_and_audit(client, auth_headers):
    admin_headers = auth_headers('admin@unitflow.ai')

    policies_response = client.get('/universities/policies', headers=admin_headers)
    assert policies_response.status_code == 200, policies_response.text
    policy = policies_response.json()[0]

    update_response = client.put(
        f"/universities/policies/{policy['id']}",
        headers=admin_headers,
        json={
            'target_score': policy['target_score'] + 1,
            'notes': '테스트 영향 재계산',
        },
    )
    assert update_response.status_code == 200, update_response.text
    assert update_response.json()['target_score'] == policy['target_score'] + 1

    audit_logs = client.get('/audit-logs', headers=admin_headers)
    assert audit_logs.status_code == 200, audit_logs.text
    assert any(log['entity_type'] == 'university_score_policies' and log['action'] == 'update' for log in audit_logs.json())

    jobs = client.get('/recalculation-jobs', headers=admin_headers)
    assert jobs.status_code == 200, jobs.text
    assert any(job['trigger'] == 'policy_changed' and job['status'] == 'completed' for job in jobs.json())
