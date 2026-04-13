import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StrategyCompareCard from '../components/StrategyCompareCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';

// 학생 상세 + 전략 비교 페이지.
//
// 데이터 소스:
//   - GET /frontend/students/{id}                    → 프로필 / 목표 / 진단 / mastery / 결과
//   - GET /frontend/students/{id}/strategy-options   → basic vs conservative 비교, 승인본, pending, diagnosis, history
//   - GET /frontend/metadata                         → universities (목표 폼)
//   - GET /students/{id}/results                     → 최근 결과
//   - GET /exams                                     → 결과 표 join
//
// 변경:
//   - PUT /students/{id}/profile, PUT /students/{id}/goals, POST /students/{id}/habits
//   - POST /students/{id}/recalculate
//   - POST /strategies/{id}/reviews — variant 단위로 approve / hold / revise
//
// 슬라이스 2 핵심: 전략 섹션이 페이지 최상단에 오고, basic vs conservative 를 나란히 보여 주며,
// 강사가 한 variant 를 채택해 검토 폼으로 끌어와 approve/hold/revise 를 진행한다.

const emptyHabitDraft = {
  recent_learning_mode: 'mixed',
  self_study_ratio: 0.25,
  lecture_ratio: 0.25,
  error_note_ratio: 0.25,
  problem_solving_ratio: 0.25,
  review_habit_score: 50,
  consistency_score: 50,
  notes: '',
};

const WEAKNESS_LABEL = {
  concept_gap: '개념 결손형',
  transfer_weakness: '적용 전이 약형',
  precision_accuracy: '정확도 부족형',
  time_pressure: '시간 압박형',
  instability: '편차 큰 불안정형',
  persistence_risk: '지속성 취약형',
};

function weaknessLabel(value) {
  return WEAKNESS_LABEL[value] || value || '-';
}

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReviewDraft(variant) {
  if (!variant) return null;
  const plan = variant.structured_plan || {};
  return {
    decision: 'approve',
    reason: '강사 검토 완료',
    summary: variant.natural_language_summary || '',
    teacher_notes: plan.teacher_notes || '',
    student_message: plan.student_message || variant.student_coaching || '',
    next_check_date: plan.next_check_in?.date || '',
  };
}

export default function StudentDetailPage() {
  const { token } = useAuth();
  const { studentId } = useParams();

  const [profileDraft, setProfileDraft] = useState(null);
  const [goalDrafts, setGoalDrafts] = useState([]);
  const [habitDraft, setHabitDraft] = useState(emptyHabitDraft);
  const { message: pageMessage, isError: pageIsError, flash: showFlash, flashError: showError } = useFlashMessage(5000);

  // 전략 비교 / 검토 상태
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [reviewDraft, setReviewDraft] = useState(null);
  const [reviewSaving, setReviewSaving] = useState(false);


  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const detail = await apiRequest(`/frontend/students/${studentId}`, { token });
      const [strategyOptions, metadata, results, exams] = await Promise.all([
        apiRequest(`/frontend/students/${studentId}/strategy-options`, { token }),
        apiRequest('/frontend/metadata', { token }),
        apiRequest(`/students/${studentId}/results`, { token }),
        apiRequest('/exams', { token }),
      ]);
      return { detail, strategyOptions, metadata, results, exams };
    },
    [token, studentId]
  );

  useEffect(() => {
    if (!data) return;
    const { detail, metadata, strategyOptions } = data;

    setProfileDraft({
      grade_level: detail.student.grade_level || '',
      enrollment_status: detail.student.enrollment_status || 'active',
      weekly_available_hours: detail.student.weekly_available_hours || 0,
      preferred_subjects: (detail.student.preferred_subjects || []).join(', '),
      disliked_subjects: (detail.student.disliked_subjects || []).join(', '),
      learning_style_preferences: '',
      study_style_notes: detail.student.study_style_notes || '',
    });

    const policyLookup = new Map(
      metadata.universities.map((policy) => [`${policy.university_name}::${policy.admission_type}`, policy.id])
    );
    setGoalDrafts(
      (detail.goals || []).map((goal) => ({
        policy_id: policyLookup.get(`${goal.university_name}::${goal.admission_type}`) || '',
        target_department: goal.target_department,
        priority_order: goal.priority_order,
        is_active: goal.is_active,
        notes: '',
      }))
    );
    setHabitDraft(emptyHabitDraft);

    // 전략 검토 대상 variant 자동 선택: 학생 노출본이 있으면 그것, 없으면 첫 variant.
    const variants = strategyOptions?.latest_set?.variants || [];
    if (variants.length === 0) {
      setSelectedVariantId(null);
      setReviewDraft(null);
      return;
    }
    const visible = variants.find((variant) => variant.is_student_visible);
    const initial = visible || variants[0];
    setSelectedVariantId(initial.id);
    setReviewDraft(buildReviewDraft(initial));
  }, [data]);

  // ----- helpers ----------------------------------------------------------

  const examMap = useMemo(() => {
    const map = new Map();
    (data?.exams || []).forEach((exam) => map.set(exam.id, exam));
    return map;
  }, [data]);

  const strategyOptions = data?.strategyOptions || null;
  const variants = strategyOptions?.latest_set?.variants || [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || null;

  const reviewPlan = useMemo(() => {
    if (!selectedVariant || !reviewDraft || reviewDraft.decision !== 'revise') {
      return selectedVariant?.structured_plan || null;
    }
    return {
      ...selectedVariant.structured_plan,
      teacher_notes: reviewDraft.teacher_notes,
      student_message: reviewDraft.student_message,
      next_check_in: {
        ...(selectedVariant.structured_plan?.next_check_in || {}),
        date: reviewDraft.next_check_date || selectedVariant.structured_plan?.next_check_in?.date,
      },
    };
  }, [selectedVariant, reviewDraft]);

  const reviewDiff = useMemo(() => {
    if (!selectedVariant || !reviewDraft) return [];
    const changes = [];
    if (reviewDraft.summary !== selectedVariant.natural_language_summary) {
      changes.push({
        field: 'natural_language_summary',
        before: selectedVariant.natural_language_summary,
        after: reviewDraft.summary,
      });
    }
    if (reviewDraft.decision === 'revise') {
      const beforePlan = selectedVariant.structured_plan || {};
      if ((reviewDraft.teacher_notes || '') !== (beforePlan.teacher_notes || '')) {
        changes.push({
          field: 'teacher_notes',
          before: beforePlan.teacher_notes || '',
          after: reviewDraft.teacher_notes || '',
        });
      }
      if ((reviewDraft.student_message || '') !== (beforePlan.student_message || '')) {
        changes.push({
          field: 'student_message',
          before: beforePlan.student_message || '',
          after: reviewDraft.student_message || '',
        });
      }
      if ((reviewDraft.next_check_date || '') !== (beforePlan.next_check_in?.date || '')) {
        changes.push({
          field: 'next_check_in.date',
          before: beforePlan.next_check_in?.date || '',
          after: reviewDraft.next_check_date || '',
        });
      }
    }
    return changes;
  }, [selectedVariant, reviewDraft]);

  // ----- save handlers ----------------------------------------------------

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profileDraft) return;
    try {
      await apiRequest(`/students/${studentId}/profile`, {
        method: 'PUT',
        token,
        body: {
          grade_level: profileDraft.grade_level,
          enrollment_status: profileDraft.enrollment_status,
          weekly_available_hours: Number(profileDraft.weekly_available_hours),
          preferred_subjects: parseList(profileDraft.preferred_subjects),
          disliked_subjects: parseList(profileDraft.disliked_subjects),
          learning_style_preferences: parseList(profileDraft.learning_style_preferences),
          study_style_notes: profileDraft.study_style_notes,
        },
      });
      showFlash('학생 프로필을 저장했습니다.');
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : '학생 프로필 저장에 실패했습니다.');
    }
  };

  const saveGoals = async () => {
    try {
      const payload = goalDrafts
        .filter((goal) => goal.policy_id && goal.target_department)
        .map((goal, index) => ({
          policy_id: Number(goal.policy_id),
          target_department: goal.target_department,
          priority_order: Number(goal.priority_order || index + 1),
          is_active: Boolean(goal.is_active),
          notes: goal.notes || null,
        }));
      await apiRequest(`/students/${studentId}/goals`, {
        method: 'PUT',
        token,
        body: payload,
      });
      showFlash('목표 대학 우선순위를 저장했습니다.');
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : '목표 대학 저장에 실패했습니다.');
    }
  };

  const saveHabit = async (event) => {
    event.preventDefault();
    try {
      await apiRequest(`/students/${studentId}/habits`, {
        method: 'POST',
        token,
        body: {
          ...habitDraft,
          self_study_ratio: Number(habitDraft.self_study_ratio),
          lecture_ratio: Number(habitDraft.lecture_ratio),
          error_note_ratio: Number(habitDraft.error_note_ratio),
          problem_solving_ratio: Number(habitDraft.problem_solving_ratio),
          review_habit_score: Number(habitDraft.review_habit_score),
          consistency_score: Number(habitDraft.consistency_score),
        },
      });
      showFlash('학습 습관 스냅샷을 추가했습니다.');
      setHabitDraft(emptyHabitDraft);
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : '학습 습관 스냅샷 저장에 실패했습니다.');
    }
  };

  const runRecalculation = async () => {
    try {
      await apiRequest(`/students/${studentId}/recalculate`, { method: 'POST', token });
      showFlash('학생 진단과 전략을 재계산했습니다.');
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : '재계산에 실패했습니다.');
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selectedVariant || !reviewDraft) return;
    setReviewSaving(true);
    try {
      const body = {
        decision: reviewDraft.decision,
        reason: reviewDraft.reason,
      };
      if (reviewDraft.decision === 'revise') {
        body.edited_summary = reviewDraft.summary;
        body.edited_plan = reviewPlan;
      }
      await apiRequest(`/strategies/${selectedVariant.id}/reviews`, { method: 'POST', token, body });
      const decisionLabel = { approve: '승인', hold: '보류', revise: '수정 후 승인' }[reviewDraft.decision];
      showFlash(`전략 ${decisionLabel} 처리를 저장했습니다.`);
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : '전략 검토 저장에 실패했습니다.');
    } finally {
      setReviewSaving(false);
    }
  };

  // ---------------------------------------------------------------------------

  const detail = data?.detail;
  const diagnosisFromOptions = strategyOptions?.diagnosis || null;
  const approved = strategyOptions?.approved || null;
  const reviewHistory = strategyOptions?.review_history || [];

  return (
    <Layout title="학생 상세 진단" backTo="/instructor" backLabel="대시보드로 돌아가기">
      <div className="toolbar-row">
        <button type="button" className="secondary-button" onClick={() => reload().catch(() => undefined)}>
          새로고침
        </button>
        <button type="button" onClick={runRecalculation}>
          재계산 실행
        </button>
      </div>
      {loading ? <div className="empty-state">학생 데이터를 불러오는 중입니다...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {pageMessage ? <div className={pageIsError ? 'error-box' : 'info-box'}>{pageMessage}</div> : null}

      {data && detail ? (
        <>
          <SectionCard
            title={`${detail.student.name} · ${detail.student.class_group || '미배정'}`}
            subtitle={`재원 상태: ${detail.student.enrollment_status} · 주간 가용 시간 ${detail.student.weekly_available_hours}시간`}
          >
            <div className="split-grid">
              <div>
                <p>
                  <strong>선호 과목:</strong> {(detail.student.preferred_subjects || []).join(', ') || '-'}
                </p>
                <p>
                  <strong>비선호 과목:</strong> {(detail.student.disliked_subjects || []).join(', ') || '-'}
                </p>
                <p>
                  <strong>최신 취약 유형:</strong> {weaknessLabel(detail.diagnosis?.primary_weakness_type)}
                </p>
              </div>
              <div>
                <strong>목표 대학</strong>
                <ol>
                  {(detail.goals || []).map((goal) => (
                    <li key={goal.id}>
                      {goal.priority_order}. {goal.university_name} {goal.target_department} ({goal.admission_type})
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </SectionCard>

          {/* ===== 전략 비교 / 검토 (슬라이스 2) ===== */}
          <SectionCard
            title="전략 비교 (basic vs conservative)"
            subtitle="최신 생성본을 나란히 비교하고, 한 variant 를 채택해 검토 / 승인 / 수정합니다."
          >
            {diagnosisFromOptions?.low_confidence_flag ? (
              <div className="info-box warn">
                <strong>저신뢰 진단입니다.</strong> 추가 데이터(시험 결과, 학습 습관 스냅샷)를 먼저 확보하는 것을 권장합니다.
                현재 전략은 참고용이며, 학생에게 단정적으로 노출하지 마세요.
              </div>
            ) : null}

            {approved ? (
              <div className="approved-banner">
                <div>
                  <span className="status-badge approved">현재 학생 노출본</span>
                  <strong style={{ marginLeft: '0.5rem' }}>{approved.variant}</strong>
                  <span className="muted small" style={{ marginLeft: '0.5rem' }}>
                    승인 시각 기준
                  </span>
                </div>
                <p className="small" style={{ margin: '0.4rem 0 0' }}>
                  {approved.natural_language_summary}
                </p>
              </div>
            ) : (
              <div className="info-box">
                아직 승인된 전략이 없습니다. 아래에서 한 variant 를 채택해 승인 처리를 진행하세요.
              </div>
            )}

            {variants.length === 0 ? (
              <div className="empty-state">
                생성된 전략이 없습니다. 상단의 “재계산 실행” 버튼을 눌러 진단/전략을 생성하세요.
              </div>
            ) : (
              <div className="strategy-compare-grid">
                {variants.map((variant) => (
                  <StrategyCompareCard
                    key={variant.id}
                    variant={variant}
                    isSelected={variant.id === selectedVariantId}
                    onSelect={() => {
                      setSelectedVariantId(variant.id);
                      setReviewDraft(buildReviewDraft(variant));
                    }}
                  />
                ))}
              </div>
            )}

            {selectedVariant && reviewDraft ? (
              <form className="review-form stack-gap" onSubmit={submitReview}>
                <div className="review-form-header">
                  <strong>채택한 variant: {selectedVariant.variant}</strong>
                  <StatusBadge status={selectedVariant.status} />
                  {selectedVariant.is_approved ? <span className="status-badge approved">승인본</span> : null}
                </div>
                <div className="form-grid compact-grid">
                  <label>
                    결정
                    <select
                      value={reviewDraft.decision}
                      onChange={(event) => setReviewDraft((current) => ({ ...current, decision: event.target.value }))}
                    >
                      <option value="approve">승인</option>
                      <option value="hold">보류</option>
                      <option value="revise">수정 후 승인</option>
                    </select>
                  </label>
                  <label className="form-span-2">
                    검토 사유
                    <textarea
                      rows={2}
                      value={reviewDraft.reason}
                      onChange={(event) => setReviewDraft((current) => ({ ...current, reason: event.target.value }))}
                    />
                  </label>
                  <label className="form-span-2">
                    자연어 요약
                    <textarea
                      rows={3}
                      value={reviewDraft.summary}
                      onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))}
                    />
                  </label>
                  {reviewDraft.decision === 'revise' ? (
                    <>
                      <label className="form-span-2">
                        강사용 메모
                        <textarea
                          rows={2}
                          value={reviewDraft.teacher_notes}
                          onChange={(event) => setReviewDraft((current) => ({ ...current, teacher_notes: event.target.value }))}
                        />
                      </label>
                      <label className="form-span-2">
                        학생용 코칭 문장
                        <textarea
                          rows={2}
                          value={reviewDraft.student_message}
                          onChange={(event) => setReviewDraft((current) => ({ ...current, student_message: event.target.value }))}
                        />
                      </label>
                      <label>
                        다음 점검 일정
                        <input
                          type="date"
                          value={reviewDraft.next_check_date}
                          onChange={(event) => setReviewDraft((current) => ({ ...current, next_check_date: event.target.value }))}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                {reviewDraft.decision === 'revise' ? (
                  <div className="subtle-card">
                    <h4>저장될 diff 미리보기</h4>
                    {reviewDiff.length === 0 ? (
                      <p className="muted small">현재 수정된 항목이 없습니다. 그대로 저장해도 변경 사항은 기록되지 않습니다.</p>
                    ) : (
                      <ul className="diff-list">
                        {reviewDiff.map((item) => (
                          <li key={item.field}>
                            <strong>{item.field}</strong>
                            <div className="diff-box">
                              <div>
                                <span className="small muted">before</span>
                                <pre>
                                  {typeof item.before === 'string' ? item.before : JSON.stringify(item.before, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="small muted">after</span>
                                <pre>
                                  {typeof item.after === 'string' ? item.after : JSON.stringify(item.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                <div className="form-actions">
                  <button type="submit" disabled={reviewSaving}>
                    {reviewSaving ? '저장 중...' : '검토 저장'}
                  </button>
                </div>
              </form>
            ) : null}

            {reviewHistory.length > 0 ? (
              <div className="stack-gap">
                <strong>검토 이력</strong>
                <ul className="history-list">
                  {reviewHistory.map((entry) => (
                    <li key={entry.id}>
                      <StatusBadge status={entry.decision === 'approve' ? 'approved' : entry.decision === 'hold' ? 'held' : 'pending_review'} label={entry.decision} />
                      <span className="muted small"> · {entry.variant} · {new Date(entry.reviewed_at).toLocaleString()}</span>
                      {entry.reason ? <div className="small">{entry.reason}</div> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </SectionCard>

          {/* ===== 진단 근거 ===== */}
          <SectionCard title="진단 근거" subtitle="전략 설명이 이 근거 위에서 만들어집니다.">
            {diagnosisFromOptions ? (
              <div className="stack-gap">
                <div className="diagnosis-summary">
                  <p>
                    <strong>핵심 취약 유형:</strong> {weaknessLabel(diagnosisFromOptions.primary_weakness_type)}{' '}
                    <span className="muted small">신뢰도 {Math.round((diagnosisFromOptions.confidence_score || 0) * 100)}%</span>
                  </p>
                  <p>
                    <strong>강사용 설명:</strong> {diagnosisFromOptions.instructor_summary || '-'}
                  </p>
                  <p>
                    <strong>학생용 코칭:</strong> {diagnosisFromOptions.coaching_message || '-'}
                  </p>
                </div>
                <div className="split-grid">
                  <div>
                    <strong>취약 단원</strong>
                    <ul className="bullet-list small">
                      {(diagnosisFromOptions.weak_units || []).slice(0, 6).map((unit, index) => (
                        <li key={index}>
                          {unit.unit_name || `단원 #${unit.unit_id || index}`}
                          {unit.reason ? ` · ${unit.reason}` : ''}
                        </li>
                      ))}
                      {(diagnosisFromOptions.weak_units || []).length === 0 ? <li className="muted">없음</li> : null}
                    </ul>
                  </div>
                  <div>
                    <strong>근거 시그널 (evidence)</strong>
                    <ul className="bullet-list small">
                      {(diagnosisFromOptions.evidence || []).slice(0, 6).map((entry, index) => (
                        <li key={index}>
                          {entry.message || entry.signal || entry.label || JSON.stringify(entry)}
                        </li>
                      ))}
                      {(diagnosisFromOptions.evidence || []).length === 0 ? <li className="muted">없음</li> : null}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">진단 결과가 없습니다.</p>
            )}
          </SectionCard>

          {/* ===== 단원 mastery ===== */}
          <SectionCard title="단원 mastery 스냅샷" subtitle="현재값, 최근값, 신뢰도를 함께 봅니다.">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>단원</th>
                    <th>effective</th>
                    <th>current</th>
                    <th>recent</th>
                    <th>confidence</th>
                    <th>문항 수</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.unit_mastery || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.unit?.name || item.unit_name || `단원 #${item.unit_id}`}</td>
                      <td>{Math.round(item.effective_mastery)}</td>
                      <td>{Math.round(item.mastery_current)}</td>
                      <td>{Math.round(item.recent_mastery)}</td>
                      <td>{item.unit_confidence}</td>
                      <td>{item.tagged_question_attempt_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ===== 최근 결과 ===== */}
          <SectionCard title="최근 결과 기록" subtitle="시험 결과 수정 시 관련 재계산이 이어집니다.">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>시험</th>
                    <th>점수</th>
                    <th>등급</th>
                    <th>상태</th>
                    <th>입력 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.results || []).map((result) => {
                    const exam = examMap.get(result.exam_id);
                    return (
                      <tr key={result.id}>
                        <td>{exam?.name || `시험 #${result.exam_id}`}</td>
                        <td>{result.raw_score}</td>
                        <td>{result.grade || '-'}</td>
                        <td>
                          <StatusBadge status={result.result_status} />
                        </td>
                        <td>{new Date(result.updated_at || result.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ===== 학생 프로필 수정 ===== */}
          <SectionCard title="학생 프로필 수정" subtitle="주간 시간, 선호 과목, 학습 선호를 구조화해 갱신합니다.">
            {profileDraft ? (
              <form className="form-grid" onSubmit={saveProfile}>
                <label>
                  학년
                  <input
                    value={profileDraft.grade_level}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, grade_level: event.target.value }))}
                  />
                </label>
                <label>
                  재원 상태
                  <select
                    value={profileDraft.enrollment_status}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, enrollment_status: event.target.value }))}
                  >
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="leave">leave</option>
                    <option value="graduated">graduated</option>
                    <option value="trial">trial</option>
                  </select>
                </label>
                <label>
                  주간 가용 시간
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={profileDraft.weekly_available_hours}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, weekly_available_hours: event.target.value }))}
                  />
                </label>
                <label>
                  선호 과목 (쉼표 구분)
                  <input
                    value={profileDraft.preferred_subjects}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, preferred_subjects: event.target.value }))}
                  />
                </label>
                <label>
                  비선호 과목 (쉼표 구분)
                  <input
                    value={profileDraft.disliked_subjects}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, disliked_subjects: event.target.value }))}
                  />
                </label>
                <label>
                  학습 방식 선호 (쉼표 구분)
                  <input
                    value={profileDraft.learning_style_preferences}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, learning_style_preferences: event.target.value }))}
                    placeholder="self_study, error_note"
                  />
                </label>
                <label className="form-span-2">
                  학습 스타일 메모
                  <textarea
                    rows={3}
                    value={profileDraft.study_style_notes}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, study_style_notes: event.target.value }))}
                  />
                </label>
                <div className="form-actions form-span-2">
                  <button type="submit">프로필 저장</button>
                </div>
              </form>
            ) : null}
          </SectionCard>

          {/* ===== 목표 대학 ===== */}
          <SectionCard title="목표 대학 우선순위" subtitle="MVP 전략 계산은 1순위 목표를 기준으로 하되, 다중 목표 데이터 구조를 유지합니다.">
            <div className="stack-gap">
              {(goalDrafts || []).map((goal, index) => (
                <div className="subtle-card" key={index}>
                  <div className="form-grid compact-grid">
                    <label>
                      대학 정책
                      <select
                        value={goal.policy_id}
                        onChange={(event) =>
                          setGoalDrafts((current) =>
                            current.map((item, idx) => (idx === index ? { ...item, policy_id: event.target.value } : item))
                          )
                        }
                      >
                        <option value="">선택</option>
                        {data.metadata.universities.map((policy) => (
                          <option key={policy.id} value={policy.id}>
                            {policy.university_name} · {policy.admission_type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      목표 학과
                      <input
                        value={goal.target_department}
                        onChange={(event) =>
                          setGoalDrafts((current) =>
                            current.map((item, idx) => (idx === index ? { ...item, target_department: event.target.value } : item))
                          )
                        }
                      />
                    </label>
                    <label>
                      우선순위
                      <input
                        type="number"
                        min="1"
                        value={goal.priority_order}
                        onChange={(event) =>
                          setGoalDrafts((current) =>
                            current.map((item, idx) => (idx === index ? { ...item, priority_order: event.target.value } : item))
                          )
                        }
                      />
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={goal.is_active}
                        onChange={(event) =>
                          setGoalDrafts((current) =>
                            current.map((item, idx) => (idx === index ? { ...item, is_active: event.target.checked } : item))
                          )
                        }
                      />
                      활성 목표
                    </label>
                  </div>
                </div>
              ))}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setGoalDrafts((current) => [
                      ...current,
                      { policy_id: '', target_department: '', priority_order: current.length + 1, is_active: true, notes: '' },
                    ])
                  }
                >
                  목표 추가
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setGoalDrafts((current) => (current.length > 1 ? current.slice(0, -1) : current))}
                >
                  마지막 목표 제거
                </button>
                <button type="button" onClick={saveGoals}>
                  목표 저장
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ===== 학습 습관 ===== */}
          <SectionCard title="학습 습관 스냅샷 추가" subtitle="자습·강의·오답노트·문제풀이 비중과 지속성 지표를 저장합니다.">
            <form className="form-grid" onSubmit={saveHabit}>
              <label>
                최근 학습 방식
                <input
                  value={habitDraft.recent_learning_mode}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, recent_learning_mode: event.target.value }))}
                />
              </label>
              <label>
                자습 비중
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={habitDraft.self_study_ratio}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, self_study_ratio: event.target.value }))}
                />
              </label>
              <label>
                강의 비중
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={habitDraft.lecture_ratio}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, lecture_ratio: event.target.value }))}
                />
              </label>
              <label>
                오답노트 비중
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={habitDraft.error_note_ratio}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, error_note_ratio: event.target.value }))}
                />
              </label>
              <label>
                문제풀이 비중
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={habitDraft.problem_solving_ratio}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, problem_solving_ratio: event.target.value }))}
                />
              </label>
              <label>
                복습 습관 점수
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={habitDraft.review_habit_score}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, review_habit_score: event.target.value }))}
                />
              </label>
              <label>
                지속성 점수
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={habitDraft.consistency_score}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, consistency_score: event.target.value }))}
                />
              </label>
              <label className="form-span-2">
                메모
                <textarea
                  rows={3}
                  value={habitDraft.notes}
                  onChange={(event) => setHabitDraft((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className="form-actions form-span-2">
                <button type="submit">스냅샷 저장</button>
              </div>
            </form>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
