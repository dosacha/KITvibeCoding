from __future__ import annotations

import io


def test_strategy_review_and_result_recalculation_flow(client, auth_headers):
    instructor_headers = auth_headers('instructor@unitflow.ai')
    admin_headers = auth_headers('admin@unitflow.ai')

    detail_response = client.get('/frontend/students/1', headers=instructor_headers)
    assert detail_response.status_code == 200, detail_response.text
    detail = detail_response.json()
    latest_strategy = detail['latest_strategy']

    review_response = client.post(
        f"/strategies/{latest_strategy['id']}/reviews",
        headers=instructor_headers,
        json={'decision': 'approve', 'reason': '테스트 승인', 'diff': {}},
    )
    assert review_response.status_code == 200, review_response.text
    assert review_response.json()['decision'] == 'approve'

    result_list = client.get('/students/1/results', headers=instructor_headers)
    assert result_list.status_code == 200, result_list.text
    first_result = result_list.json()[0]
    exam_id = first_result['exam_id']

    questions_response = client.get(f'/exams/{exam_id}/questions', headers=instructor_headers)
    assert questions_response.status_code == 200, questions_response.text
    questions = questions_response.json()

    payload = {
        'student_profile_id': 1,
        'exam_id': exam_id,
        'subject_id': first_result['subject_id'],
        'percentile': 77.5,
        'grade': 2,
        'completed_in_seconds': 2100,
        'result_status': 'submitted',
        'responses': [
            {
                'question_id': question['id'],
                'selected_answer': question['answer_key'],
                'response_status': 'submitted',
                'time_spent_seconds': 60,
            }
            for question in questions
        ],
    }
    save_response = client.post('/student-results', headers=instructor_headers, json=payload)
    assert save_response.status_code == 200, save_response.text
    assert save_response.json()['raw_score'] > 0

    audit_logs = client.get('/audit-logs', headers=admin_headers)
    assert audit_logs.status_code == 200, audit_logs.text
    assert any(log['entity_type'] == 'student_results' and log['action'] == 'update' for log in audit_logs.json())
    assert any(log.get('summary') for log in audit_logs.json())

    change_history = client.get('/change-history', headers=admin_headers)
    assert change_history.status_code == 200, change_history.text
    assert any(change['entity_type'] == 'student_results' for change in change_history.json())

    jobs = client.get('/recalculation-jobs', headers=admin_headers)
    assert jobs.status_code == 200, jobs.text
    assert any(job['trigger'] == 'result_changed' and job['status'] == 'completed' for job in jobs.json())


def test_csv_import_endpoint(client, auth_headers):
    instructor_headers = auth_headers('instructor@unitflow.ai')
    exams = client.get('/exams', headers=instructor_headers)
    assert exams.status_code == 200, exams.text
    exam_id = exams.json()[0]['id']

    csv_content = '\n'.join(
        [
            'student_email,percentile,grade,completed_in_seconds,result_status,q1,q2,q3,q4',
            'student2@unitflow.ai,71.2,3,2200,submitted,A,B,NR,D',
        ]
    )
    files = {'file': ('results.csv', io.BytesIO(csv_content.encode('utf-8')), 'text/csv')}
    upload_response = client.post(f'/student-results/upload-csv?exam_id={exam_id}', headers=instructor_headers, files=files)
    assert upload_response.status_code == 200, upload_response.text
    payload = upload_response.json()
    assert payload['rows'] == 1
    assert payload['imported'] == 1
    assert payload['errors'] == []
