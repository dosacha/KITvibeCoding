// 주간 플래너 — 재생성 diff 표시 + 회고 결과 카드

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import PlannerDiffSummary from '../components/PlannerDiffSummary.jsx';
import ReflectionResultCard from '../components/ReflectionResultCard.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 완료율 진행 바
function ProgressBar({ rate }) {
  const pct = Math.min(100, Math.round((rate || 0) * 100));
  return (
    <div>
      <div className="planner-progress-bar">
        <div className="planner-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted small" style={{ margin: 0 }}>완료율 {pct}%</p>
    </div>
  );
}

// 요일별 그룹화
function groupByDay(items) {
  const groups = {};
  for (const item of items) {
    const day = item.day_of_week ?? 'etc';
    if (!groups[day]) groups[day] = [];
    groups[day].push(item);
  }
  return groups;
}

// 개별 플래너 항목 (compact flat row)
function PlannerItem({ item, onCheck, onTimeChange, actualMinutes }) {
  const isCompleted = item.status === 'completed';
  const isCarryOver = item.carry_over;

  return (
    <div className={`planner-row${isCompleted ? ' completed' : ''}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="planner-item-title">
          {item.title || `${item.subject_name}${item.unit_name ? ` · ${item.unit_name}` : ''}`}
          {isCarryOver ? <span className="tag-carry">이월</span> : null}
          <span className="planner-item-mins muted">
            {isCompleted && item.completed_minutes != null
              ? `${item.completed_minutes}분 완료`
              : `${item.planned_minutes || 0}분`}
          </span>
        </span>
      </div>
      {!isCompleted ? (
        <input
          type="number"
          className="planner-time-input"
          min={0}
          max={480}
          placeholder="실제 분"
          value={actualMinutes ?? ''}
          onChange={(e) => onTimeChange(item.id, e.target.value)}
          title="실제 수행 시간(분)"
          style={{ width: '5.5rem', flexShrink: 0 }}
        />
      ) : null}
      <button
        type="button"
        className={`btn-check${isCompleted ? ' done' : ''}`}
        onClick={() => onCheck(item, actualMinutes)}
      >
        {isCompleted ? '취소' : '✓ 완료'}
      </button>
    </div>
  );
}

// 주간 회고 섹션
function ReflectionSection({ planId, initial, token, onSaved, onResult }) {
  const [form, setForm] = useState({
    wins_text: initial?.wins_text || initial?.went_well || '',
    blocker_text: initial?.blocker_text || initial?.stuck_at || '',
    failure_reason: initial?.failure_reason || initial?.why_failed || '',
    adjustment_note: initial?.adjustment_note || initial?.next_week_changes || '',
  });
  const [saving, setSaving] = useState(false);
  const { message: msg, isError: msgIsError, flash: flashMsg, flashError: flashMsgError } = useFlashMessage();

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    if (!planId) { flashMsgError('저장할 계획이 없어. 먼저 주간 계획을 생성해줘.'); return; }
    setSaving(true);
    try {
      const res = await apiRequest(`/frontend/student/planner/${planId}/reflection`, {
        method: 'POST',
        token,
        body: form,
      });
      flashMsg('회고를 저장했어.');
      onSaved?.();
      onResult?.(res);
    } catch (err) {
      flashMsgError(err.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { key: 'wins_text', label: '이번 주 가장 잘 된 공부는?' },
    { key: 'blocker_text', label: '가장 막힌 단원이나 유형은?' },
    { key: 'failure_reason', label: '계획대로 못 한 이유가 있다면?' },
    { key: 'adjustment_note', label: '다음 주에 바꿔볼 것은?' },
  ];

  return (
    <div className="reflection-form">
      {FIELDS.map(({ key, label }) => (
        <label key={key} style={{ display: 'grid' }}>
          {label}
          <textarea
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            rows={2}
            placeholder="자유롭게 써봐."
          />
        </label>
      ))}
      {msg ? <p className={msgIsError ? 'error-text' : 'muted small'}>{msg}</p> : null}
      <div>
        <button type="button" onClick={save} disabled={saving}>
          {saving ? '저장 중...' : '회고 저장'}
        </button>
      </div>
    </div>
  );
}

export default function StudentPlannerPage() {
  const { token } = useAuth();
  const { message, isError, flash, flashError } = useFlashMessage();
  const [generating, setGenerating] = useState(false);
  const [regenerateDiff, setRegenerateDiff] = useState(null);
  const [reflectionResult, setReflectionResult] = useState(null);
  const [actualMinutesMap, setActualMinutesMap] = useState({});

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/planner', { token }),
    [token]
  );

  // 첫 생성 (새 플랜)
  const generatePlan = async () => {
    setGenerating(true);
    try {
      await apiRequest('/frontend/student/planner/generate', {
        method: 'POST',
        token,
        body: { source: 'auto' },
      });
      flash('이번 주 계획을 생성했어.');
      setRegenerateDiff(null);
      reload();
    } catch (err) {
      flashError(err.message || '계획 생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  // 재생성 (plan_id 기반, diff 표시)
  const regeneratePlan = async () => {
    const planId = data?.plan?.id;
    if (!planId) { generatePlan(); return; }
    setGenerating(true);
    setRegenerateDiff(null);
    try {
      const res = await apiRequest(`/frontend/student/planner/${planId}/regenerate`, {
        method: 'POST',
        token,
        body: { reason: 'manual', preserve_completed: true },
      });
      setRegenerateDiff(res.regeneration_summary || null);
      flash('계획을 다시 만들었어.');
      reload();
    } catch (err) {
      flashError(err.message || '재생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleTimeChange = (id, val) => {
    setActualMinutesMap((prev) => ({ ...prev, [id]: val === '' ? '' : Number(val) }));
  };

  const checkItem = async (item, actualMinutes) => {
    const completing = item.status !== 'completed';
    const minutes =
      completing && actualMinutes !== '' && actualMinutes != null
        ? Number(actualMinutes)
        : item.completed_minutes ?? item.planned_minutes ?? 0;

    try {
      await apiRequest(`/frontend/student/planner/items/${item.id}`, {
        method: 'PATCH',
        token,
        body: { status: completing ? 'completed' : 'planned', completed_minutes: minutes },
      });
      if (completing) {
        setActualMinutesMap((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
      }
      reload();
    } catch (err) {
      flashError(err.message || '업데이트 실패');
    }
  };

  const plan = data?.plan;
  const items = plan?.items || [];
  const completionRate = plan?.completion_rate_cached ?? 0;
  const dayGroups = groupByDay(items);
  const orderedDays = [0, 1, 2, 3, 4, 5, 6];

  return (
    <Layout title="주간 플래너">
      {loading ? <div className="empty-state">주간 계획을 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className={isError ? 'error-box' : 'info-box'}>{message}</div> : null}

      {/* 재생성 diff 결과 */}
      {regenerateDiff ? (
        <PlannerDiffSummary
          summary={regenerateDiff}
          onDismiss={() => setRegenerateDiff(null)}
        />
      ) : null}

      {/* 회고 저장 결과 */}
      {reflectionResult ? (
        <ReflectionResultCard
          result={reflectionResult}
          onDismiss={() => setReflectionResult(null)}
        />
      ) : null}

      {data ? (
        <>
          {/* Row: 이번 주 요약 + 주간 회고 (계획 있을 때 6-6, 없으면 단독) */}
          <div className={`page-row${plan && (data.reflection !== undefined || items.length > 0) ? ' r-6-6' : ''}`}>
            <SectionCard
              title="이번 주 실행 계획"
              subtitle={data.week_start ? `이번 주 · ${data.week_start}~` : '이번 주'}
              actions={
                <button
                  type="button"
                  className="secondary-button compact"
                  onClick={regeneratePlan}
                  disabled={generating}
                >
                  {generating ? '생성 중...' : '다시 만들기'}
                </button>
              }
            >
              {plan ? (
                <div className="stack-gap">
                  <div className="metric-grid">
                    <div className="metric-card">
                      <span className="metric-label">계획 시간</span>
                      <strong className="metric-value">
                        {formatNumber((plan.planned_total_minutes || 0) / 60)}시간
                      </strong>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">완료 시간</span>
                      <strong className="metric-value">
                        {formatNumber((plan.completed_total_minutes || 0) / 60)}시간
                      </strong>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">남은 항목</span>
                      <strong className="metric-value">
                        {items.filter((i) => i.status !== 'completed').length}개
                      </strong>
                    </div>
                  </div>
                  <ProgressBar rate={completionRate} />
                </div>
              ) : (
                <div className="empty-state">
                  <p>{data.empty_state || '아직 이번 주 계획이 없어. 지금 만들어볼까?'}</p>
                  <button type="button" onClick={generatePlan} disabled={generating}>
                    {generating ? '생성 중...' : '이번 주 계획 생성'}
                  </button>
                </div>
              )}
            </SectionCard>

            {/* 주간 회고 — 요약 카드와 나란히 */}
            {data.reflection !== undefined || items.length > 0 ? (
              <SectionCard title="주간 회고" subtitle="이번 주 돌아보기">
                <ReflectionSection
                  planId={plan?.id}
                  initial={data.reflection}
                  token={token}
                  onSaved={reload}
                  onResult={setReflectionResult}
                />
              </SectionCard>
            ) : null}
          </div>

          {/* 요일별 할 일 — 전체 너비 */}
          {items.length > 0 ? (
            <SectionCard
              title="요일별 할 일"
              subtitle="완료 체크 + 실제 시간 입력하면 성장 리포트에 기록됨"
            >
              <div>
                {orderedDays.map((day) => {
                  const dayItems = dayGroups[day];
                  if (!dayItems?.length) return null;
                  return (
                    <div key={day} className="planner-day-group">
                      <p className="planner-day-label">{DAY_LABELS[day]}요일</p>
                      {dayItems.map((item) => (
                        <PlannerItem
                          key={item.id}
                          item={item}
                          onCheck={checkItem}
                          onTimeChange={handleTimeChange}
                          actualMinutes={actualMinutesMap[item.id]}
                        />
                      ))}
                    </div>
                  );
                })}
                {dayGroups['etc']?.length > 0 ? (
                  <div className="planner-day-group">
                    <p className="planner-day-label">날짜 미지정</p>
                    {dayGroups['etc'].map((item) => (
                      <PlannerItem
                        key={item.id}
                        item={item}
                        onCheck={checkItem}
                        onTimeChange={handleTimeChange}
                        actualMinutes={actualMinutesMap[item.id]}
                      />
                    ))}
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
