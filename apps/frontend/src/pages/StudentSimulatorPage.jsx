// FE-601~604: 시뮬레이터
// 점수 변화 입력 → 현실/도전/안정 시나리오 비교, 변경 전후 gap 시각화.

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

const SUBJECT_INPUTS = [
  { key: 'KOR', label: '국어' },
  { key: 'MATH', label: '수학' },
  { key: 'ENG', label: '영어' },
];

const SCENARIO_META = {
  current: { cls: 'scenario-current', emoji: '📌', label: '현재 기준' },
  challenge: { cls: 'scenario-challenge', emoji: '🚀', label: '도전 시나리오' },
  safe: { cls: 'scenario-safe', emoji: '🛡️', label: '안정 시나리오' },
};

// 시나리오 카드 3개 비교
function ScenarioCompareGrid({ scenarios }) {
  if (!scenarios?.length) return null;

  return (
    <div className="scenario-compare-grid">
      {scenarios.map((sc) => {
        const meta = SCENARIO_META[sc.type] || { cls: '', emoji: '—', label: sc.label || sc.type };
        return (
          <div key={sc.type} className={`scenario-card ${meta.cls}`}>
            <p className="scenario-card-label">{meta.emoji} {meta.label || sc.label}</p>
            <div className="scenario-gap-display">
              {formatNumber(sc.total_gap ?? sc.gap, 1)}점
            </div>
            <p className="muted small" style={{ margin: 0 }}>목표대학 gap</p>
            {sc.weekly_hours != null ? (
              <p className="muted small" style={{ margin: 0 }}>
                주 {formatNumber(sc.weekly_hours)}시간 필요
              </p>
            ) : null}
            {sc.success_probability != null ? (
              <p className="muted small" style={{ margin: 0 }}>
                달성 가능성 {formatNumber(sc.success_probability * 100, 0)}%
              </p>
            ) : null}
            {sc.summary ? (
              <p className="muted small" style={{ margin: '0.35rem 0 0', borderTop: '1px solid #e5ebf3', paddingTop: '0.35rem' }}>
                {sc.summary}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// 변경 전/후 gap 시각화
function BeforeAfterGap({ before, after }) {
  if (!before && !after) return null;

  return (
    <div className="simulator-before-after">
      <div className="before-box">
        <p className="ba-label">현재 gap</p>
        <p className="ba-value">{formatNumber(before?.total_gap ?? 0, 1)}점</p>
        {before?.band ? <p className="ba-band muted small">{before.band}</p> : null}
      </div>
      <div className="arrow-icon">→</div>
      <div className="after-box">
        <p className="ba-label">변경 후 gap</p>
        <p className="ba-value">{formatNumber(after?.total_gap ?? 0, 1)}점</p>
        {after?.band ? <p className="ba-band muted small">{after.band}</p> : null}
      </div>
    </div>
  );
}

export default function StudentSimulatorPage() {
  const { token } = useAuth();

  // 점수 변화 입력 (과목 코드 → delta)
  const [scoreDeltas, setScoreDeltas] = useState({ KOR: 0, MATH: 5, ENG: 0 });
  const [hoursDelta, setHoursDelta] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { message: error, isError: errorIsError, flashError: setError } = useFlashMessage(8000);

  const setDelta = (key, val) =>
    setScoreDeltas((prev) => ({ ...prev, [key]: val === '' ? 0 : Number(val) }));

  const validate = () => {
    for (const { key, label } of SUBJECT_INPUTS) {
      const v = Number(scoreDeltas[key]);
      if (v < -50 || v > 50) return `${label} 점수 변화는 -50~+50 사이로 입력해줘.`;
    }
    const h = Number(hoursDelta);
    if (h < -20 || h > 40) return '주간 시간 변화는 -20~+40 사이로 입력해줘.';
    return null;
  };

  const runSimulation = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setResult(null);
    try {
      const payload = await apiRequest('/frontend/student/simulations/goal-scenario', {
        method: 'POST',
        token,
        body: {
          score_deltas: scoreDeltas,
          weekly_hours_delta: Number(hoursDelta || 0),
        },
      });
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시뮬레이션에 실패했어.');
    } finally {
      setLoading(false);
    }
  };

  const priorities = result?.changed_subject_priorities || [];

  return (
    <Layout title="시뮬레이터">
      {/* 입력 폼 */}
      <SectionCard
        title="What-if 시뮬레이션"
        subtitle="점수나 공부 시간이 바뀌면 목표대학 gap이 어떻게 달라지는지 확인해."
      >
        <form className="simulator-form" onSubmit={runSimulation}>
          <div>
            <p className="section-micro-label">과목별 점수 변화 (현재 대비 +/- 점)</p>
            <div className="simulator-subject-inputs">
              {SUBJECT_INPUTS.map(({ key, label }) => (
                <label key={key} style={{ display: 'grid', gap: '0.25rem' }}>
                  <span className="muted small">{label}</span>
                  <input
                    type="number"
                    value={scoreDeltas[key]}
                    onChange={(e) => setDelta(key, e.target.value)}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </label>
              ))}
            </div>
          </div>

          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span className="section-micro-label">주간 공부 시간 변화 (+/- 시간)</span>
            <input
              type="number"
              value={hoursDelta}
              onChange={(e) => setHoursDelta(e.target.value)}
              min={-20}
              max={40}
              step={0.5}
              style={{ maxWidth: '10rem' }}
            />
          </label>

          <div>
            <button type="submit" disabled={loading}>
              {loading ? '계산 중...' : '시뮬레이션 실행'}
            </button>
          </div>
        </form>

        {error ? <div className="error-box" style={{ marginTop: '0.75rem' }}>{error}</div> : null}
      </SectionCard>

      {result ? (
        <>
          {/* 추천 요약 */}
          {result.recommended_scenario_summary ? (
            <div className="info-box">
              <strong>AI 추천:</strong> {result.recommended_scenario_summary}
            </div>
          ) : null}

          {/* 변경 전/후 gap */}
          {(result.before || result.after) ? (
            <SectionCard
              title="Gap 변화"
              subtitle="입력한 변화가 적용됐을 때 목표대학 gap이 얼마나 바뀌는지야."
            >
              <BeforeAfterGap before={result.before} after={result.after} />
              {result.after?.weekly_hours != null ? (
                <p className="muted small" style={{ marginTop: '0.6rem' }}>
                  변경 후 필요 주간 공부 시간:{' '}
                  <strong>{formatNumber(result.after.weekly_hours)}시간</strong>
                </p>
              ) : null}
            </SectionCard>
          ) : null}

          {/* 시나리오 비교 */}
          {result.scenarios?.length > 0 ? (
            <SectionCard
              title="시나리오 비교"
              subtitle="현재·도전·안정 세 가지 방향을 비교해서 선택해봐."
            >
              <ScenarioCompareGrid scenarios={result.scenarios} />
            </SectionCard>
          ) : (
            /* scenarios 배열이 없으면 단순 결과 표시 */
            result.updated_goal_gap ? (
              <SectionCard title="결과 요약" subtitle="이 결과는 탐색용 계산이야. 실제 DB에는 저장되지 않아.">
                <div className="highlight-card">
                  <p className="muted small" style={{ margin: 0 }}>
                    변경 후 주간 공부 시간:{' '}
                    <strong>
                      {formatNumber(result.updated_goal_gap.weekly_hours_after_change)}시간
                    </strong>
                  </p>
                </div>
              </SectionCard>
            ) : null
          )}

          {/* 과목 우선순위 변화 */}
          {priorities.length > 0 ? (
            <SectionCard
              title="과목 우선순위 변화"
              subtitle="시뮬레이션 후 가장 먼저 손볼 과목 순서야."
            >
              <div className="simple-list">
                {priorities.map((subject, i) => (
                  <div
                    key={subject.subject_code || subject.subject_name}
                    className="list-row"
                  >
                    <div>
                      <strong>
                        {i + 1}. {subject.subject_name}
                      </strong>
                      <p className="muted small" style={{ margin: 0 }}>
                        예상 gap {formatNumber(subject.simulated_gap ?? subject.gap, 1)}점
                        {subject.weight != null
                          ? ` · 반영 비중 ${formatNumber(subject.weight * 100, 0)}%`
                          : ''}
                      </p>
                    </div>
                    {subject.change_label ? (
                      <span className="muted small">{subject.change_label}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
