from __future__ import annotations


def _metadata(client, headers):
    response = client.get('/frontend/metadata', headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def _find(items, key, value):
    return next(item for item in items if item[key] == value)


def test_instructor_cannot_edit_other_instructor_class_exam(client, auth_headers):
    admin_headers = auth_headers('admin@unitflow.ai')
    instructor_headers = auth_headers('instructor@unitflow.ai')
    metadata = _metadata(client, admin_headers)

    subject = metadata['subjects'][0]
    beta = _find(metadata['class_groups'], 'name', 'Beta반')

    created = client.post(
        '/exams',
        headers=admin_headers,
        json={
            'academy_id': 1,
            'subject_id': subject['id'],
            'class_group_id': beta['id'],
            'name': 'Beta 전용 시험',
            'exam_date': '2026-04-01',
            'total_score': 100,
            'time_limit_minutes': 60,
            'is_retake': False,
        },
    )
    assert created.status_code == 200, created.text
    exam_id = created.json()['id']

    forbidden_update = client.put(
        f'/exams/{exam_id}',
        headers=instructor_headers,
        json={'name': '수정 시도'},
    )
    assert forbidden_update.status_code == 403

    forbidden_question = client.post(
        '/questions',
        headers=instructor_headers,
        json={
            'exam_id': exam_id,
            'number': 1,
            'teacher_difficulty': 3,
            'answer_key': 'A',
            'points': 10,
            'question_type': 'concept',
            'problem_style': 'basic',
            'estimated_seconds': 90,
            'unit_mappings': [],
        },
    )
    assert forbidden_question.status_code == 403


def test_result_save_rejects_student_outside_exam_class_and_invalid_unit_mapping(client, auth_headers):
    admin_headers = auth_headers('admin@unitflow.ai')
    metadata = _metadata(client, admin_headers)
    math = _find(metadata['subjects'], 'code', 'MATH')
    eng_unit = next(unit for unit in metadata['units'] if unit['code'].startswith('ENG'))
    alpha = _find(metadata['class_groups'], 'name', 'Alpha반')
    exams = client.get('/frontend/exams', headers=admin_headers).json()

    created_exam = client.post(
        '/exams',
        headers=admin_headers,
        json={
            'academy_id': 1,
            'subject_id': math['id'],
            'class_group_id': alpha['id'],
            'name': 'Alpha 전용 수학 시험',
            'exam_date': '2026-04-02',
            'total_score': 100,
            'time_limit_minutes': 60,
            'is_retake': False,
        },
    )
    assert created_exam.status_code == 200, created_exam.text
    exam_id = created_exam.json()['id']

    invalid_question = client.post(
        '/questions',
        headers=admin_headers,
        json={
            'exam_id': exam_id,
            'number': 1,
            'teacher_difficulty': 3,
            'answer_key': 'A',
            'points': 10,
            'question_type': 'concept',
            'problem_style': 'basic',
            'estimated_seconds': 90,
            'unit_mappings': [{'unit_id': eng_unit['id'], 'weight': 1.0}],
        },
    )
    assert invalid_question.status_code == 400

    students = client.get('/frontend/students', headers=admin_headers).json()
    beta_student = next(student for student in students if student['class_group_name'] == 'Beta반')

    # Beta반 학생은 Alpha 전용 시험 결과를 저장할 수 없다.
    result_response = client.post(
        '/student-results',
        headers=admin_headers,
        json={
            'student_profile_id': beta_student['id'],
            'exam_id': exam_id,
            'subject_id': math['id'],
            'raw_score': 0,
            'percentile': 10,
            'grade': 6,
            'completed_in_seconds': 1200,
            'result_status': 'submitted',
            'question_breakdown': {},
            'result_metadata': {},
            'responses': [],
        },
    )
    assert result_response.status_code == 400

    # CSV 업로드 응답은 created/updated/failed 요약을 함께 돌려준다.
    seeded_exam_id = exams[0]['id']
    csv_body = 'student_email,raw_score,result_status\nstudent@unitflow.ai,25,submitted\nmissing@unitflow.ai,,submitted\n'
    upload = client.post(
        f'/student-results/upload-csv?exam_id={seeded_exam_id}',
        headers=admin_headers,
        files={'file': ('results.csv', csv_body, 'text/csv')},
    )
    assert upload.status_code == 200, upload.text
    payload = upload.json()
    assert payload['rows'] == 2
    assert payload['imported'] == 1
    assert payload['failed'] == 1
    assert 'accepted_columns' in payload
    assert payload['error_rows'][0]['row'] == 2
