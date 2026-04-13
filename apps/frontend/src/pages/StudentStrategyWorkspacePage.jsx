// FE-301~304: 전략 설계실
// AI 기본안/보수안 비교, 학생 수정안 저장, 검토 요청 타임라인.
// 학생이 AI 전략을 받아보는 데서 끝나지 않고 직접 수정하게 만드는 화면.

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
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

// 단일 전략 뷰 컴포넌트
function StrategyPlan({ strategy, compact = false }) {
  if (!strategy) {
    return (
      <div className="empty-state" style={{ padding: '1.5rem' }}>
        아직 표시할 전략이 없어.
      </div>
    );
  }

  const plan = strategy.plan || strategy;
  const alloc = strategy.weekly_time_allocation || plan.weekly_time_allocation || [];
  const unitOrder = strategy.unit_study_order || plan.unit_study_order || [];
  const methods = strategy.study_methods || plan.study_methods || [];
  const risks = strategy.risk_factors || plan.risk_factors || [];

  return (
    <div className="stack-gap">
      {/* 요약 + 코칭 */}
      <div className="highlight-card">
        <div className="section-header compact-header">
          <div>
            <p className="section-micro-label">{strategy.variant_label || strategy.variant || '전략안'}</p>
            <h3 style={{ marginBottom: 0 }}>{strategy.summary || '현재 진단과 목표대학 gap을 기준으로 우선순위를 다시 살펴보자.'}</h3>
          </div>
          <StatusBadge status={strategy.status} label={strategy.status_label} />
        </div>
        {strategy.student_coaching ? (
          <p className="muted" style={{ margin: 0 }}>{strategy.student_coaching}</p>
        ) : null}
      </div>

      {compact ? null : (
        <>
          <div className="split-grid">
            {/* 주간 배분 */}
            <div>
              <p className="section-micro-label">주간 시간 배분</p>
              {alloc.length > 0 ? (
                <div className="simple-list">
                  {alloc.map((item, i) => (
                    <div key={i} className="list-row">
                      <strong>{item.subject_name || item.label || '과목'}</strong>
                      <span className="muted small">
                        {formatNumber(item.hours)}시간
                        {item.focus ? ` · ${item.focus}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="muted small">배분 정보 없음</p>}
            </div>

            {/* 단원 순서 */}
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
            {/* 학습 방식 */}
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

            {/* 위험 요인 */}
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

          {/* 다음 점검일 */}
          {(plan.next_check_in?.date || strategy.next_check_in?.date) ? (
            <p className="muted small">
              다음 점검일:{' '}
              <strong>
                {plan.next_check_in?.date || strategy.next_check_in?.date}
              </strong>
              {(plan.next_check_in?.days ?? strategy.next_check_in?.days) != null
                ? ` (${plan.next_check_in?.days ?? strategy.next_check_in?.days}일 후)`
                : ''}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

// 검토 타임라인 컴포넌트
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

// 학생 workspace 에디터
function WorkspaceEditor({ workspace, token, onSaved }) {
  const [notes, setNotes] = useState(workspace?.notes || '');
  const [saving, setSaving] = useState(false);
  const { message: msg, isError: msgIsError, flash: flashMsg, flashError: flashMsgError } = useFlashMessage();

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/frontend/student/strategy-workspace/notes', {
        method: 'POST',
        token,
        body: { notes },
      });
      flashMsg('저장됐어.');
      onSaved?.();
    } catch (err) {
      flashMsgError(err.message || '저장에 실패했어.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workspace-editor">
      <p className="section-micro-label">내 메모 / 수정 의견</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="AI 전략 중 수정하고 싶은 부분, 강사에게 전달할 내용을 자유롭게 남겨봐."
        rows={4}
      />
      {msg ? (
        <p className={msgIsError ? 'error-text' : 'muted small'}>{msg}</p>
      ) : null}
      <div className="workspace-editor-actions">
        <button type="button" onClick={save} disabled={saving}>
          {saving ? '저장 중' : '메모 저장'}
        </button>
        {notes !== (workspace?.notes || '') ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => setNotes(workspace?.notes || '')}
          >
            취소
          </button>
        ) : null}
      </div>
    </div>
  );
}

const TABS = ['AI 기본안', 'AI 보수안', '내 메모', '검토 상태'];

export default function StudentStrategyWorkspacePage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('AI 기본안');
  const [submitting, setSubmitting] = useState(false);
  const { message: submitMsg, isError: submitIsError, flash: flashSubmit, flashError: flashSubmitError } = useFlashMessage(5000);

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/strategy-workspace', { token }),
    [token]
  );

  const submitForReview = async () => {
    setSubmitting(true);
    try {
      await apiRequest('/frontend/student/strategy-workspace/submit', {
        method: 'POST',
        token,
      });
      flashSubmit('강사 검토 요청을 보냈어. 승인까지 보통 1~2일 걸려.');
      reload();
    } catch (err) {
      flashSubmitError(err.message || '검토 요청에 실패했어.');
    } finally {
      setSubmitting(false);
    }
  };

  // 검토 요청 가능 여부
  const canSubmit = data && !['pending_review', 'approved'].includes(data.review_status);

  return (
    <Layout title="전략 설계실">
      {loading ? <div className="empty-state">전략을 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 상태 배너 */}
          {data.guide ? (
            <div className="info-box">
              <strong>{data.review_status_label || '전략 상태'}</strong>
              <p style={{ margin: '0.3rem 0 0' }}>{data.guide}</p>
              {data.instructor_feedback ? (
                <p style={{ margin: '0.5rem 0 0', borderTop: '1px solid #bfdbfe', paddingTop: '0.5rem' }}>
                  <strong>강사 피드백:</strong> {data.instructor_feedback}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitMsg ? (
            <div className={submitIsError ? 'error-box' : 'info-box'}>
              {submitMsg}
            </div>
          ) : null}

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
                {tab === '검토 상태' && data.review_status === 'pending_review' ? ' 🔔' : ''}
              </button>
            ))}
          </div>

          {/* AI 기본안 */}
          {activeTab === 'AI 기본안' ? (
            <SectionCard
              title="AI 기본 전략"
              subtitle="현재 진단과 목표대학 기준을 반영한 기본 학습 전략이야."
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
              <StrategyPlan strategy={data.ai_basic} />
            </SectionCard>
          ) : null}

          {/* AI 보수안 */}
          {activeTab === 'AI 보수안' ? (
            <SectionCard
              title="AI 보수 전략"
              subtitle="무리하지 않고 안정적으로 실행하는 방향의 대안이야."
            >
              <StrategyPlan strategy={data.ai_conservative} />
            </SectionCard>
          ) : null}

          {/* 내 메모 */}
          {activeTab === '내 메모' ? (
            <SectionCard
              title="내 메모 / 수정 의견"
              subtitle="AI안에서 수정하고 싶은 부분을 강사에게 전달해봐."
            >
              <WorkspaceEditor
                workspace={data.student_workspace}
                token={token}
                onSaved={reload}
              />

              {/* 승인된 전략이 있으면 함께 표시 */}
              {data.approved ? (
                <div style={{ marginTop: '1rem' }}>
                  <p className="section-micro-label">현재 승인본</p>
                  <StrategyPlan strategy={data.approved} compact />
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          {/* 검토 상태 */}
          {activeTab === '검토 상태' ? (
            <SectionCard
              title="검토 타임라인"
              subtitle="학생 수정안과 강사 승인 흐름을 분리해서 관리해."
            >
              <div className="stack-gap">
                <div className="simple-list">
                  <div className="list-row">
                    <strong>현재 단계</strong>
                    <StatusBadge
                      status={data.review_status}
                      label={data.review_status_label || data.review_status}
                    />
                  </div>
                </div>

                <ReviewTimeline timeline={data.review_timeline} />

                {canSubmit ? (
                  <div>
                    <button
                      type="button"
                      onClick={submitForReview}
                      disabled={submitting}
                    >
                      {submitting ? '요청 중...' : '강사 검토 요청하기'}
                    </button>
                    <p className="muted small" style={{ marginTop: '0.4rem' }}>
                      검토 요청 전 AI 기본안 또는 보수안을 먼저 확인해봐.
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
