from __future__ import annotations


def test_instructor_and_student_dashboards(client, auth_headers):
    instructor_headers = auth_headers('instructor@unitflow.ai')
    admin_headers = auth_headers('admin@unitflow.ai')
    student_headers = auth_headers('student@unitflow.ai')

    instructor_dashboard = client.get('/frontend/dashboard/instructor', headers=instructor_headers)
    assert instructor_dashboard.status_code == 200, instructor_dashboard.text
    instructor_data = instructor_dashboard.json()['data']
    assert instructor_data['summary']['student_count'] == 2
    assert instructor_data['summary']['class_group_count'] == 1
    assert instructor_data['class_groups'][0]['class_group_name'] == 'Alpha반'

    admin_dashboard = client.get('/frontend/dashboard/instructor', headers=admin_headers)
    assert admin_dashboard.status_code == 200, admin_dashboard.text
    admin_data = admin_dashboard.json()['data']
    assert admin_data['summary']['student_count'] == 4
    assert admin_data['summary']['class_group_count'] == 2

    visible_students = client.get('/frontend/students', headers=instructor_headers)
    assert visible_students.status_code == 200, visible_students.text
    assert len(visible_students.json()) == 2

    student_dashboard = client.get('/frontend/dashboard/student', headers=student_headers)
    assert student_dashboard.status_code == 200, student_dashboard.text
    student_data = student_dashboard.json()['data']
    assert student_data['primary_goal']['priority_order'] == 1
    assert student_data['diagnosis']['primary_weakness_type']
    assert student_data['approved_strategy'] is not None
    assert student_data['approved_strategy']['variant'] == 'basic'
