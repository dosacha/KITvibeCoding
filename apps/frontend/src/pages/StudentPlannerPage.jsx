// FE-401~404: 주간 플래너
// 요일별 할 일 그룹, 실제 수행 시간 입력, 완료율 바, 주간 회고 섹션.

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
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

// 개별 플래너 항목
function PlannerItem({ item, onCheck, onTimeChange, actualMinutes }) {
  const isCompleted = item.status === 'completed';
  const isCarryOver = item.carry_over;

  return (
    <div className={`planner-row${isCompleted ? ' completed' : ''}`}>
      <div>
        <p className="planner-item-title">
          {item.title || `${item.subject_name}${item.unit_name ? ` · ${item.unit_name}` : ''}`}
          {isCarryOver ? <span className="muted small" style={{ marginLeft: '0.4rem' }}>↩ 이월</span> : null}
        </p>
        <p className="planner-item-meta">
          {item.subject_name}
          {item.unit_name ? ` · ${item.unit_name}` : ''}
          {' · '}계획 {item.planned_minutes || 0}분
          {isCompleted && item.completed_minutes != null
            ? ` · 실제 ${item.completed_minutes}분`
            : ''}
        </p>
      </div>
      {!isCompleted ? (
        <input
          type="number"
          className="planner-time-input"
          min={0}
          max={480}
          placeholder="분"
          value={actualMinutes ?? ''}
          onChange={(e) => onTimeChange(item.id, e.target.value)}
          title="실제 수행 시간(분)"
        />
      ) : (
        <span />
      )}
      <button
        type="button"
        className={`planner-check-btn${isCompleted ? ' secondary-button' : ''}`}
        onClick={() => onCheck(item, actualMinutes)}
      >
        {isCompleted ? '취소' : '완료'}
      </button>
    </div>
  );
}

// 주간 회고 섹션
function ReflectionSection({ initial, token, onSaved }) {
  const [form, setForm] = useState({
    went_well: initial?.went_well || '',
    stuck_at: initial?.stuck_at || '',
    why_failed: initial?.why_failed || '',
    next_week_changes: initial?.next_week_changes || '',
  });
  const [saving, setSaving] = useState(false);
  const { message: msg, isError: msgIsError, flash: flashMsg, flashError: flashMsgError } = useFlashMessage();

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await apiRequest('/frontend/student/planner/reflection', {
        method: 'POST',
        token,
        body: form,
      });
      flashMsg('회고를 저장했어.');
      onSaved?.();
    } catch (err) {
      flashMsgError(err.message || '저장에 실패했어.');
    } finally {
      setSaving(false);
    }
  };

  const FIELDS = [
    { key: 'went_well', label: '이번 주 가장 잘 된 공부는?' },
    { key: 'stuck_at', label: '가장 막힌 단원이나 유형은?' },
    { key: 'why_failed', label: '계획대로 못 한 이유가 있다면?' },
    { key: 'next_week_changes', label: '다음 주에 바꿔볼 것은?' },
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
      {msg ? (
        <p className={msgIsError ? 'error-text' : 'muted small'}>{msg}</p>
      ) : null}
      <div>
        <button type="button" onClick={save} disabled={saving}>
          {saving ? '저장 중' : '회고 저장'}
        </button>
      </div>
    </div>
  );
}

export default function StudentPlannerPage() {
  const { token } = useAuth();
  const { message, isError, flash, flashError } = useFlashMessage();
  const [generating, setGenerating] = useState(false);
  // 항목별 실제 시간 입력 상태 { [itemId]: minutes }
  const [actualMinutesMap, setActualMinutesMap] = useState({});

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/planner', { token }),
    [token]
  );

  const generatePlan = async () => {
    setGenerating(true);
    try {
      await apiRequest('/frontend/student/planner/generate', { method: 'POST', token });
      flash('이번 주 계획을 생성했어.');
      reload();
    } catch (err) {
      flashError(err.message || '계획 생성에 실패했어.');
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
      await apiRequest(`/frontend/student/planner/items/${item.id}/check`, {
        method: 'POST',
        token,
        body: { completed: completing, completed_minutes: minutes },
      });
      // 완료 처리 후 해당 항목 시간 입력 초기화
      if (completing) {
        setActualMinutesMap((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
      reload();
    } catch (err) {
      flashError(err.message || '업데이트에 실패했어.');
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
      {message ? (
        <div className={isError ? 'error-box' : 'info-box'}>{message}</div>
      ) : null}

      {data ? (
        <>
          {/* 이번 주 요약 카드 */}
          <SectionCard
            title="이번 주 실행 계획"
            subtitle={`기준 주간: ${data.week_start || '-'}부터`}
            actions={
              <button
                type="button"
                className="secondary-button compact"
                onClick={generatePlan}
                disabled={generating}
              >
                {generating ? '생성 중...' : '계획 재생성'}
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
                <p>{data.empty_state || '아직 이번 주 계획이 없어.'}</p>
                <button type="button" onClick={generatePlan} disabled={generating}>
                  {generating ? '생성 중...' : '이번 주 계획 만들기'}
                </button>
              </div>
            )}
          </SectionCard>

          {/* 요일별 할 일 목록 */}
          {items.length > 0 ? (
            <SectionCard
              title="요일별 할 일"
              subtitle="완료 후 실제 수행 시간을 입력하면 성장 리포트에 반영돼."
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

                {/* day_of_week 미지정 항목 */}
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

          {/* 주간 회고 */}
          {data.reflection !== undefined || items.length > 0 ? (
            <SectionCard
              title="주간 회고"
              subtitle="이번 주를 돌아보고 다음 주 계획에 반영해봐."
            >
              <ReflectionSection
                initial={data.reflection}
                token={token}
                onSaved={reload}
              />
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
