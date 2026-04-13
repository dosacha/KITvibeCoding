// 전략 설계실 — AI안 / 내 초안(structured editor) / 채팅 / 검토 상태

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StrategyChatPanel from '../components/StrategyChatPanel.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';
import {
  formatNumber,
  renderRiskLabel,
  renderRiskMessage,
  renderStudyMethodDetail,
  renderStudyMethodText,
} from '../lib/studentLabels.js';

// ── 유틸 ──────────────────────────────────────────────────────────

const APPROVAL_LABEL = {
  student_draft: '내 초안',
  submitted_for_review: '검토 요청 중',
  coach_revision_requested: '강사 수정 요청',
  coach_approved: '강사 승인',
};
const APPROVAL_STATUS_MAP = {
  student_draft: 'draft',
  submitted_for_review: 'pending_review',
  coach_revision_requested: 'held',
  coach_approved: 'approved',
};

// ── 읽기 전용 전략 뷰 ────────────────────────────────────────────

function StrategyReadView({ strategy, compact = false }) {
  if (!strategy) {
    return <div className="empty-state" style={{ padding: '1.25rem' }}>전략이 아직 준비 안 됐어.</div>;
  }
  const plan = strategy.plan || strategy;
  const alloc = strategy.weekly_time_allocation || plan.weekly_time_allocation || [];
  const unitOrder = strategy.unit_study_order || plan.unit_study_order || [];
  const methods = strategy.study_methods || plan.study_methods || [];
  const risks = strategy.risk_factors || plan.risk_factors || [];

  return (
    <div className="stack-gap">
      <div className="highlight-card">
        <div className="section-header compact-header">
          <div>
            <p className="section-micro-label">{strategy.variant_label || strategy.variant || '전략안'}</p>
            <h3 style={{ marginBottom: 0 }}>{strategy.summary || '전략 요약 준비 중'}</h3>
          </div>
          <StatusBadge status={strategy.status} label={strategy.status_label} />
        </div>
        {strategy.student_coaching ? (
          <p className="muted" style={{ margin: 0 }}>{strategy.student_coaching}</p>
        ) : null}
      </div>

      {!compact ? (
        <>
          <div className="split-grid">
            <div>
              <p className="section-micro-label">주간 시간 배분</p>
              {alloc.length > 0 ? (
                <div className="simple-list">
                  {alloc.map((item, i) => (
                    <div key={i} className="list-row">
                      <strong>{item.subject_name || item.label || '과목'}</strong>
                      <span className="muted small">
                        {formatNumber(item.hours)}시간{item.focus ? ` · ${item.focus}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="muted small">배분 정보 없음</p>}
            </div>
            <div>
              <p className="section-micro-label">단원 학습 순서</p>
              {unitOrder.length > 0 ? (
                <div className="simple-list">
                  {unitOrder.slice(0, 5).map((item, i) => (
                    <div key={i} className="list-row">
                      <strong>
                        {typeof item === 'string' ? item : `${item.subject_name} · ${item.unit_name}`}
                      </strong>
                      {item.effective_mastery != null ? (
                        <span className="muted small">이해도 {formatNumber(item.effective_mastery)}점</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : <p className="muted small">순서 정보 없음</p>}
            </div>
          </div>

          <div className="split-grid">
            <div>
              <p className="section-micro-label">추천 공부 방식</p>
              {methods.length > 0 ? (
                <ul className="bullet-list">
                  {methods.map((item, i) => (
                    <li key={i}>
                      <strong>{renderStudyMethodText(item)}</strong>
                      {renderStudyMethodDetail(item) ? (
                        <span className="muted small"> · {renderStudyMethodDetail(item)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted small">방식 정보 없음</p>}
            </div>
            <div>
              <p className="section-micro-label">주의할 점</p>
              {risks.length > 0 ? (
                <ul className="bullet-list">
                  {risks.map((item, i) => (
                    <li key={i}>
                      <strong>{renderRiskLabel(item)}</strong>
                      {renderRiskMessage(item) ? (
                        <span className="muted small"> · {renderRiskMessage(item)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted small">위험 요인 없음</p>}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── 학생 초안 구조화 에디터 ────────────────────────────────────

function WorkspaceStructuredEditor({ workspace, token, onSaved, onRecommend }) {
  const [form, setForm] = useState(() => ({
    weekly_total_hours: workspace?.weekly_total_hours ?? 20,
    weekday_hours: workspace?.weekday_hours ?? 12,
    weekend_hours: workspace?.weekend_hours ?? 8,
    subject_allocations: (workspace?.subject_allocations || []).map((a) => ({ ...a })),
    unit_priorities: (workspace?.unit_priorities || []).map((u) => ({ ...u })),
    today_focus_items: (workspace?.today_focus_items || []).map((f) => ({ ...f })),
    student_note: workspace?.student_note || '',
  }));
  const [saving, setSaving] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [lastRecommendedFields, setLastRecommendedFields] = useState([]);
  const { message, isError, flash, flashError } = useFlashMessage(5000);

  const setTop = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // subject_allocations helpers
  const addSubjectAlloc = () =>
    setForm((prev) => ({
      ...prev,
      subject_allocations: [...prev.subject_allocations, { subject_code: '', hours: 0, focus: '' }],
    }));
  const removeSubjectAlloc = (i) =>
    setForm((prev) => ({
      ...prev,
      subject_allocations: prev.subject_allocations.filter((_, idx) => idx !== i),
    }));
  const setSubjectAlloc = (i, key, val) =>
    setForm((prev) => ({
      ...prev,
      subject_allocations: prev.subject_allocations.map((a, idx) =>
        idx === i ? { ...a, [key]: val } : a
      ),
    }));

  // unit_priorities helpers
  const addUnit = () =>
    setForm((prev) => ({
      ...prev,
      unit_priorities: [...prev.unit_priorities, { subject_name: '', unit_name: '', reason: '' }],
    }));
  const removeUnit = (i) =>
    setForm((prev) => ({
      ...prev,
      unit_priorities: prev.unit_priorities.filter((_, idx) => idx !== i),
    }));
  const setUnit = (i, key, val) =>
    setForm((prev) => ({
      ...prev,
      unit_priorities: prev.unit_priorities.map((u, idx) =>
        idx === i ? { ...u, [key]: val } : u
      ),
    }));

  // today_focus_items helpers
  const addFocus = () =>
    setForm((prev) => ({
      ...prev,
      today_focus_items: [...prev.today_focus_items, { title: '', reason: '' }],
    }));
  const removeFocus = (i) =>
    setForm((prev) => ({
      ...prev,
      today_focus_items: prev.today_focus_items.filter((_, idx) => idx !== i),
    }));
  const setFocus = (i, key, val) =>
    setForm((prev) => ({
      ...prev,
      today_focus_items: prev.today_focus_items.map((f, idx) =>
        idx === i ? { ...f, [key]: val } : f
      ),
    }));

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/frontend/student/strategy-workspace', {
        method: 'PUT',
        token,
        body: form,
      });
      flash('초안을 저장했어.');
      onSaved?.();
    } catch (err) {
      flashError(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const recommend = async () => {
    setRecommending(true);
    try {
      const res = await apiRequest('/frontend/student/strategy-workspace/recommend', {
        method: 'POST',
        token,
        body: { student_note: form.student_note || null },
      });
      const suggestion = res.suggested_workspace || res;
      const nextSubjectAllocations = suggestion.subject_allocations || suggestion.weekly_time_allocation;
      const nextUnitPriorities = suggestion.unit_priorities || suggestion.unit_study_order;
      const nextTodayFocusItems = suggestion.today_focus_items;
      const changed = [];
      if (nextSubjectAllocations && JSON.stringify(nextSubjectAllocations) !== JSON.stringify(form.subject_allocations)) {
        setTop('subject_allocations', nextSubjectAllocations);
        changed.push('과목별 시간 배분');
      }
      if (nextUnitPriorities && JSON.stringify(nextUnitPriorities) !== JSON.stringify(form.unit_priorities)) {
        setTop('unit_priorities', nextUnitPriorities);
        changed.push('우선 학습 단원');
      }
      if (nextTodayFocusItems && JSON.stringify(nextTodayFocusItems) !== JSON.stringify(form.today_focus_items)) {
        setTop('today_focus_items', nextTodayFocusItems);
        changed.push('오늘 핵심 할 일');
      }
      setLastRecommendedFields(changed);
      flash('AI 추천을 반영했어. 수정 후 저장해줘.');
      onRecommend?.();
    } catch (err) {
      flashError(err.message || 'AI 추천 실패');
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="workspace-structured-editor">
      {/* 시간 설정 */}
      <div className="editor-section">
        <p className="section-micro-label">주간 총 시간</p>
        <div className="editor-time-row">
          <label>
            <span className="muted small">총</span>
            <input
              type="number"
              min={0}
              max={80}
              value={form.weekly_total_hours}
              onChange={(e) => setTop('weekly_total_hours', Number(e.target.value))}
              style={{ width: '5rem' }}
            />
            <span className="muted small">시간</span>
          </label>
          <label>
            <span className="muted small">평일</span>
            <input
              type="number"
              min={0}
              max={50}
              value={form.weekday_hours}
              onChange={(e) => setTop('weekday_hours', Number(e.target.value))}
              style={{ width: '5rem' }}
            />
            <span className="muted small">시간</span>
          </label>
          <label>
            <span className="muted small">주말</span>
            <input
              type="number"
              min={0}
              max={30}
              value={form.weekend_hours}
              onChange={(e) => setTop('weekend_hours', Number(e.target.value))}
              style={{ width: '5rem' }}
            />
            <span className="muted small">시간</span>
          </label>
        </div>
      </div>

      {/* 과목별 시간 배분 */}
      <div className="editor-section">
        <div className="editor-section-header">
          <p className="section-micro-label">과목별 시간 배분</p>
          <button type="button" className="secondary-button compact" onClick={addSubjectAlloc}>
            + 과목 추가
          </button>
        </div>
        {form.subject_allocations.length === 0 ? (
          <p className="muted small">과목을 추가해봐.</p>
        ) : (
          <div className="editor-rows">
            {form.subject_allocations.map((a, i) => (
              <div key={i} className="editor-row-3col">
                <input
                  type="text"
                  value={a.subject_code}
                  onChange={(e) => setSubjectAlloc(i, 'subject_code', e.target.value)}
                  placeholder="과목 (예: 수학)"
                />
                <input
                  type="number"
                  value={a.hours}
                  onChange={(e) => setSubjectAlloc(i, 'hours', Number(e.target.value))}
                  placeholder="시간"
                  min={0}
                  max={40}
                  style={{ width: '5rem' }}
                />
                <input
                  type="text"
                  value={a.focus || ''}
                  onChange={(e) => setSubjectAlloc(i, 'focus', e.target.value)}
                  placeholder="집중 포인트 (선택)"
                />
                <button type="button" className="focus-remove-btn" onClick={() => removeSubjectAlloc(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 단원 우선순위 */}
      <div className="editor-section">
        <div className="editor-section-header">
          <p className="section-micro-label">우선 학습 단원</p>
          <button type="button" className="secondary-button compact" onClick={addUnit}>
            + 단원 추가
          </button>
        </div>
        {form.unit_priorities.length === 0 ? (
          <p className="muted small">중점적으로 공부할 단원을 추가해봐.</p>
        ) : (
          <div className="editor-rows">
            {form.unit_priorities.map((u, i) => (
              <div key={i} className="editor-row-3col">
                <input
                  type="text"
                  value={u.subject_name || ''}
                  onChange={(e) => setUnit(i, 'subject_name', e.target.value)}
                  placeholder="과목"
                />
                <input
                  type="text"
                  value={u.unit_name || ''}
                  onChange={(e) => setUnit(i, 'unit_name', e.target.value)}
                  placeholder="단원"
                />
                <input
                  type="text"
                  value={u.reason || ''}
                  onChange={(e) => setUnit(i, 'reason', e.target.value)}
                  placeholder="이유 (선택)"
                />
                <button type="button" className="focus-remove-btn" onClick={() => removeUnit(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 오늘의 핵심 할 일 */}
      <div className="editor-section">
        <div className="editor-section-header">
          <p className="section-micro-label">오늘 핵심 할 일</p>
          <button type="button" className="secondary-button compact" onClick={addFocus}>
            + 추가
          </button>
        </div>
        {form.today_focus_items.length === 0 ? (
          <p className="muted small">오늘 집중할 항목을 추가해봐.</p>
        ) : (
          <div className="editor-rows">
            {form.today_focus_items.map((f, i) => (
              <div key={i} className="editor-row-2col">
                <input
                  type="text"
                  value={f.title}
                  onChange={(e) => setFocus(i, 'title', e.target.value)}
                  placeholder="할 일"
                />
                <input
                  type="text"
                  value={f.reason || ''}
                  onChange={(e) => setFocus(i, 'reason', e.target.value)}
                  placeholder="이유 (선택)"
                />
                <button type="button" className="focus-remove-btn" onClick={() => removeFocus(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 학생 메모 */}
      <div className="editor-section">
        <p className="section-micro-label">메모 / AI에게 요청</p>
        <textarea
          value={form.student_note}
          onChange={(e) => setTop('student_note', e.target.value)}
          placeholder="AI 추천을 받기 전 요청사항이나 수정 의견을 여기에 남겨봐."
          rows={3}
        />
      </div>

      {message ? (
        <p className={isError ? 'error-text' : 'muted small'}>{message}</p>
      ) : null}

      {lastRecommendedFields.length > 0 ? (
        <div className="info-box">
          <strong>AI 추천으로 바뀐 항목</strong>
          <p style={{ margin: '0.25rem 0 0' }}>{lastRecommendedFields.join(', ')}</p>
        </div>
      ) : null}

      <div className="workspace-editor-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? '저장 중...' : '초안 저장'}
        </button>
        <button type="button" className="secondary-button" onClick={recommend} disabled={recommending}>
          {recommending ? '추천 중...' : '⚡ AI 추천받기'}
        </button>
      </div>
    </div>
  );
}

// ── 검토 타임라인 ────────────────────────────────────────────────

function ReviewTimeline({ timeline }) {
  if (!timeline?.length) return null;
  return (
    <div className="review-timeline">
      {timeline.map((step, i) => {
        const isDone = step.done;
        const isCurrent = !isDone && timeline[i - 1]?.done;
        return (
          <div key={step.step || i} className="timeline-step">
            <div className="timeline-dot-wrap">
              <div className={`timeline-dot${isDone ? ' done' : isCurrent ? ' current' : ''}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className={`timeline-line${isDone ? ' done' : ''}`} />
            </div>
            <div className="timeline-content">
              <p className={`timeline-label${isDone ? ' done' : isCurrent ? ' current' : ''}`} style={{ margin: 0 }}>
                {step.label}
              </p>
              {step.timestamp ? (
                <p className="timeline-ts">
                  {new Date(step.timestamp).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              ) : (
                <p className="timeline-ts">{isCurrent ? '대기 중' : '—'}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────────

const TABS = ['내 초안', '강사 승인본', 'AI 기본안', 'AI 보수안', '채팅', '검토 상태'];

export default function StudentStrategyWorkspacePage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('내 초안');
  const [submitting, setSubmitting] = useState(false);
  const { message: submitMsg, isError: submitIsError, flash: flashSubmit, flashError: flashSubmitError } =
    useFlashMessage(5000);

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/strategy-workspace', { token }),
    [token]
  );

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      await apiRequest('/frontend/student/strategy-workspace/submit', { method: 'POST', token });
      flashSubmit('강사 검토 요청을 보냈어. 보통 1~2일 안에 확인돼.');
      reload();
    } catch (err) {
      flashSubmitError(err.message || '검토 요청 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const workspace = data?.student_workspace;
  const approvalStatus = workspace?.status;
  const canSubmit = workspace && !['submitted_for_review', 'coach_approved'].includes(approvalStatus);

  return (
    <Layout title="전략 설계실">
      {loading ? <div className="empty-state">전략을 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 상태 배너 */}
          {data.guide ? (
            <div className="info-box">
              <strong>{APPROVAL_LABEL[approvalStatus] || '전략 상태'}</strong>
              <p style={{ margin: '0.3rem 0 0' }}>{data.guide}</p>
              {data.latest_instructor_feedback?.content ? (
                <p style={{ margin: '0.5rem 0 0', borderTop: '1px solid #bfdbfe', paddingTop: '0.5rem' }}>
                  <strong>강사 피드백:</strong> {data.latest_instructor_feedback.content}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitMsg ? (
            <div className={submitIsError ? 'error-box' : 'info-box'}>{submitMsg}</div>
          ) : null}

          <div className="info-box">
            <strong>내 초안은 내가 바꾸는 작업본, 강사 승인본은 공식 기준이야.</strong>
            <p style={{ margin: '0.3rem 0 0' }}>
              AI 기본안과 보수안은 비교용 대안이고, 대화창에서는 AI 코치·강사·둘 모두 중 대상을 골라 물어볼 수 있어.
            </p>
          </div>

          {/* 탭 */}
          <div className="workspace-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`workspace-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === '검토 상태' && approvalStatus === 'submitted_for_review' ? ' 🔔' : ''}
              </button>
            ))}
          </div>

          {/* AI 기본안 */}
          {activeTab === 'AI 기본안' ? (
            <SectionCard title="AI 기본 전략" subtitle="목표 gap과 취약 단원을 기준으로 만든 첫 대안">
              <StrategyReadView strategy={data.ai_basic} />
            </SectionCard>
          ) : null}

          {/* AI 보수안 */}
          {activeTab === 'AI 보수안' ? (
            <SectionCard title="AI 보수 전략" subtitle="실행 부담을 줄인 안전한 대안">
              <StrategyReadView strategy={data.ai_conservative} />
            </SectionCard>
          ) : null}

          {/* 내 초안 */}
          {activeTab === '내 초안' ? (
            <SectionCard
              title="내 전략 초안"
              subtitle="내가 직접 고치는 개인 작업본. 공식 승인본과 따로 유지돼"
              actions={
                canSubmit ? (
                  <button
                    type="button"
                    className="secondary-button compact"
                    onClick={submitForReview}
                    disabled={submitting}
                  >
                    {submitting ? '요청 중...' : '검토 요청'}
                  </button>
                ) : null
              }
            >
              <WorkspaceStructuredEditor
                workspace={workspace}
                token={token}
                onSaved={reload}
                onRecommend={reload}
              />

              {/* coach-approved 전략도 함께 표시 */}
              {data.coach_approved_strategy ? (
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #edf1f6', paddingTop: '1rem' }}>
                  <p className="section-micro-label">
                    강사 승인본{' '}
                    <StatusBadge status="approved" label="승인" />
                  </p>
                  <StrategyReadView strategy={data.coach_approved_strategy} compact />
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {activeTab === '강사 승인본' ? (
            <SectionCard title="강사 승인본" subtitle="플래너와 공식 코칭 기준으로 쓰는 현재 승인 전략">
              {data.coach_approved_strategy ? (
                <StrategyReadView strategy={data.coach_approved_strategy} />
              ) : (
                <div className="empty-state">아직 강사 승인본이 없어. 내 초안을 저장하고 검토를 요청해봐.</div>
              )}
            </SectionCard>
          ) : null}

          {/* 채팅 */}
          {activeTab === '채팅' ? (
            <SectionCard title="강사 · AI 코치와 대화" subtitle="메시지마다 AI 코치, 강사, 둘 모두 중 대상을 선택해 보낼 수 있어">
              <StrategyChatPanel workspaceId={workspace?.id} token={token} />
            </SectionCard>
          ) : null}

          {/* 검토 상태 */}
          {activeTab === '검토 상태' ? (
            <SectionCard title="검토 타임라인" subtitle="검토 진행 현황">
              <div className="stack-gap">
                <div className="simple-list">
                  <div className="list-row">
                    <strong>현재 단계</strong>
                    <StatusBadge
                      status={APPROVAL_STATUS_MAP[approvalStatus] || approvalStatus}
                      label={APPROVAL_LABEL[approvalStatus] || approvalStatus}
                    />
                  </div>
                </div>
                <ReviewTimeline timeline={data.timeline || data.review_timeline} />
                {canSubmit ? (
                  <div>
                    <button type="button" onClick={submitForReview} disabled={submitting}>
                      {submitting ? '요청 중...' : '강사 검토 요청하기'}
                    </button>
                    <p className="muted small" style={{ marginTop: '0.4rem' }}>
                      내 초안을 저장한 뒤 검토를 요청해봐.
                    </p>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
