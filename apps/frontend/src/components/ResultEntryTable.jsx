import { Fragment, useEffect, useMemo, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

// 학생별 결과 입력 테이블.
// props:
//   exam: { id, subject_id, total_score, ... }
//   questions: [{ id, number, answer_key, points, ... }]
//   roster: [{ student_profile_id, full_name, has_result, result_status, ... }]
//   results: [{ student_profile_id, raw_score, percentile, grade, completed_in_seconds,
//               result_status, responses: [{ question_id, selected_answer, response_status, time_spent_seconds }] }]
//   onSave(payload): async, payload 는 StudentResultCreate 와 정확히 같은 모양이어야 한다.
//
// 결과 상태 enum: submitted / absent / unanswered / not_entered.
// "결시"로 result_status 를 바꾸면 모든 응답이 자동으로 absent 가 된다 (백엔드 _build_responses_for_exam 와 같은 규칙).

const RESPONSE_STATUSES = [
  { value: 'submitted', label: '제출' },
  { value: 'unanswered', label: '무응답' },
  { value: 'absent', label: '결시' },
  { value: 'not_entered', label: '미입력' },
];

const RESULT_STATUSES = [
  { value: 'submitted', label: '제출' },
  { value: 'absent', label: '결시' },
  { value: 'unanswered', label: '무응답' },
  { value: 'not_entered', label: '미입력' },
];

function buildBlankResponses(questions) {
  return questions.map((question) => ({
    question_id: question.id,
    selected_answer: '',
    response_status: 'not_entered',
    time_spent_seconds: '',
  }));
}

function buildDraftFromResult(questions, result) {
  if (!result) {
    return {
      raw_score: '',
      percentile: '',
      grade: '',
      completed_in_seconds: '',
      result_status: 'not_entered',
      responses: buildBlankResponses(questions),
    };
  }
  const responsesByQuestionId = new Map();
  (result.responses || []).forEach((response) => {
    responsesByQuestionId.set(response.question_id, response);
  });
  return {
    raw_score: result.raw_score ?? '',
    percentile: result.percentile ?? '',
    grade: result.grade ?? '',
    completed_in_seconds: result.completed_in_seconds ?? '',
    result_status: result.result_status || 'submitted',
    responses: questions.map((question) => {
      const existing = responsesByQuestionId.get(question.id);
      return {
        question_id: question.id,
        selected_answer: existing?.selected_answer ?? '',
        response_status: existing?.response_status || 'not_entered',
        time_spent_seconds: existing?.time_spent_seconds ?? '',
      };
    }),
  };
}

export default function ResultEntryTable({ exam, questions, roster, results, onSave }) {
  const sortedQuestions = useMemo(
    () => [...(questions || [])].sort((a, b) => a.number - b.number),
    [questions]
  );

  const resultsByStudent = useMemo(() => {
    const map = new Map();
    (results || []).forEach((result) => map.set(result.student_profile_id, result));
    return map;
  }, [results]);

  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [rowMessage, setRowMessage] = useState({});

  // Reset drafts whenever the upstream data changes (after a save / refresh).
  useEffect(() => {
    const next = {};
    (roster || []).forEach((entry) => {
      const result = resultsByStudent.get(entry.student_profile_id) || null;
      next[entry.student_profile_id] = buildDraftFromResult(sortedQuestions, result);
    });
    setDrafts(next);
    setRowMessage({});
  }, [roster, resultsByStudent, sortedQuestions]);

  const updateDraftField = (studentId, key, value) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [key]: value },
    }));
  };

  const setResponse = (studentId, questionIndex, patch) => {
    setDrafts((current) => {
      const draft = current[studentId];
      if (!draft) return current;
      const responses = draft.responses.map((response, idx) => (idx === questionIndex ? { ...response, ...patch } : response));
      return { ...current, [studentId]: { ...draft, responses } };
    });
  };

  const handleResultStatusChange = (studentId, value) => {
    setDrafts((current) => {
      const draft = current[studentId];
      if (!draft) return current;
      // 백엔드 _build_responses_for_exam 와 같은 규칙: result_status 가 absent 면 모든 응답이 absent.
      let responses = draft.responses;
      if (value === 'absent') {
        responses = responses.map((response) => ({ ...response, response_status: 'absent', selected_answer: '' }));
      }
      return { ...current, [studentId]: { ...draft, result_status: value, responses } };
    });
  };

  const handleSave = async (studentId) => {
    const draft = drafts[studentId];
    if (!draft) return;
    setSavingId(studentId);
    setRowMessage((current) => ({ ...current, [studentId]: '' }));
    try {
      const payload = {
        student_profile_id: studentId,
        exam_id: exam.id,
        subject_id: exam.subject_id,
        raw_score: draft.raw_score === '' || draft.raw_score === null ? null : Number(draft.raw_score),
        percentile: draft.percentile === '' || draft.percentile === null ? null : Number(draft.percentile),
        grade: draft.grade === '' || draft.grade === null ? null : Number(draft.grade),
        completed_in_seconds:
          draft.completed_in_seconds === '' || draft.completed_in_seconds === null
            ? null
            : Number(draft.completed_in_seconds),
        result_status: draft.result_status,
        question_breakdown: {},
        result_metadata: {},
        responses: draft.responses.map((response) => ({
          question_id: response.question_id,
          selected_answer: response.selected_answer === '' ? null : response.selected_answer,
          response_status: response.response_status,
          time_spent_seconds:
            response.time_spent_seconds === '' || response.time_spent_seconds === null
              ? null
              : Number(response.time_spent_seconds),
        })),
      };
      await onSave(payload);
      setRowMessage((current) => ({ ...current, [studentId]: '저장 완료' }));
    } catch (err) {
      const detail = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setRowMessage((current) => ({ ...current, [studentId]: detail }));
    } finally {
      setSavingId(null);
    }
  };

  if (!sortedQuestions.length) {
    return <div className="empty-state">먼저 문항 관리 탭에서 문항을 등록한 뒤 결과를 입력하세요.</div>;
  }
  if (!(roster || []).length) {
    return <div className="empty-state">대상 학생이 없습니다. 시험을 반에 배정하거나 학생을 추가하세요.</div>;
  }

  return (
    <div className="result-entry-wrapper">
      <div className="result-entry-meta muted small">
        시험 총점 {exam.total_score}점 · 문항 {sortedQuestions.length}개 · 학생 {roster.length}명. raw_score 를 비워두면 정답키 기준으로 자동 채점됩니다.
      </div>
      <div className="table-wrapper sticky-header">
        <table className="dense-table">
          <thead>
            <tr>
              <th>학생</th>
              <th>입력 상태</th>
              <th>raw_score</th>
              <th>percentile</th>
              <th>grade</th>
              <th>소요(초)</th>
              <th>결과 상태</th>
              <th>응답</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {roster.map((entry) => {
              const studentId = entry.student_profile_id;
              const draft = drafts[studentId];
              const isExpanded = expandedStudentId === studentId;
              const isSaving = savingId === studentId;
              if (!draft) return null;
              return (
                <Fragment key={studentId}>
                  <tr>
                    <td>
                      <div>
                        <strong>{entry.full_name}</strong>
                      </div>
                      <div className="small muted">{entry.class_group_name || '미배정'}</div>
                    </td>
                    <td>
                      {entry.has_result ? (
                        <StatusBadge status={entry.result_status || 'submitted'} />
                      ) : (
                        <span className="status-badge not_entered">미입력</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={draft.raw_score}
                        onChange={(event) => updateDraftField(studentId, 'raw_score', event.target.value)}
                        className="cell-input"
                        placeholder="자동"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={draft.percentile}
                        onChange={(event) => updateDraftField(studentId, 'percentile', event.target.value)}
                        className="cell-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={draft.grade}
                        onChange={(event) => updateDraftField(studentId, 'grade', event.target.value)}
                        className="cell-input narrow"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={draft.completed_in_seconds}
                        onChange={(event) => updateDraftField(studentId, 'completed_in_seconds', event.target.value)}
                        className="cell-input"
                      />
                    </td>
                    <td>
                      <select
                        value={draft.result_status}
                        onChange={(event) => handleResultStatusChange(studentId, event.target.value)}
                        className="cell-input"
                      >
                        {RESULT_STATUSES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button compact"
                        onClick={() => setExpandedStudentId(isExpanded ? null : studentId)}
                      >
                        {isExpanded ? '닫기' : '문항별'}
                      </button>
                    </td>
                    <td>
                      <div className="row-action">
                        <button type="button" onClick={() => handleSave(studentId)} disabled={isSaving} className="compact">
                          {isSaving ? '저장 중' : '저장'}
                        </button>
                        {rowMessage[studentId] ? <span className="small muted">{rowMessage[studentId]}</span> : null}
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="expanded-row">
                      <td colSpan={9}>
                        <div className="response-grid">
                          {sortedQuestions.map((question, index) => {
                            const response = draft.responses[index];
                            return (
                              <div className="response-card" key={question.id}>
                                <div className="response-header">
                                  <strong>#{question.number}</strong>
                                  <span className="small muted">정답 {question.answer_key || '-'}</span>
                                </div>
                                <input
                                  className="cell-input"
                                  value={response.selected_answer || ''}
                                  placeholder="응답"
                                  onChange={(event) =>
                                    setResponse(studentId, index, {
                                      selected_answer: event.target.value,
                                      response_status:
                                        response.response_status === 'not_entered' && event.target.value !== ''
                                          ? 'submitted'
                                          : response.response_status,
                                    })
                                  }
                                />
                                <div className="status-pills">
                                  {RESPONSE_STATUSES.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      className={`status-pill${response.response_status === option.value ? ' active' : ''}`}
                                      onClick={() =>
                                        setResponse(studentId, index, {
                                          response_status: option.value,
                                          selected_answer: option.value === 'submitted' ? response.selected_answer : '',
                                        })
                                      }
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
