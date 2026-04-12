from __future__ import annotations


def test_metadata_exposes_role_capabilities(client, auth_headers):
    admin = client.get('/frontend/metadata', headers=auth_headers('admin@unitflow.ai'))
    instructor = client.get('/frontend/metadata', headers=auth_headers('instructor@unitflow.ai'))

    assert admin.status_code == 200, admin.text
    assert instructor.status_code == 200, instructor.text

    admin_viewer = admin.json()['viewer']
    instructor_viewer = instructor.json()['viewer']

    assert admin_viewer['role'] == 'admin'
    assert admin_viewer['can_manage_policies'] is True
    assert admin_viewer['can_view_audit'] is True

    assert instructor_viewer['role'] == 'instructor'
    assert instructor_viewer['can_manage_exams'] is True
    assert instructor_viewer['can_manage_policies'] is False
    assert instructor_viewer['can_view_audit'] is False


def test_governance_endpoints_are_admin_only(client, auth_headers):
    instructor_headers = auth_headers('instructor@unitflow.ai')
    admin_headers = auth_headers('admin@unitflow.ai')

    admin_ok = [
        '/universities/policies',
        '/frontend/universities/policies',
        '/audit-logs',
        '/change-history',
        '/recalculation-jobs',
    ]
    for path in admin_ok:
        response = client.get(path, headers=admin_headers)
        assert response.status_code == 200, (path, response.text)

    audit_payload = client.get('/audit-logs', headers=admin_headers).json()
    assert audit_payload and 'summary' in audit_payload[0] and 'display_action' in audit_payload[0]

    for path in admin_ok:
        response = client.get(path, headers=instructor_headers)
        assert response.status_code == 403, (path, response.text)
