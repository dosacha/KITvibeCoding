// What-if 시뮬레이션 — baseline vs scenario 나란히 비교

import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFlashMessage } from '../hooks/useFlashMessage.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

const SUBJECTS = [
  { code: 'KOR', label: '국어' },
  { code: 'MATH', label: '수학' },
  { code: 'ENG', label: '영어' },
];

const DIRECTION_OPTS = [
  { value: '', label: '방향 미지정' },
  { value: 'susi', label: '수시 가정' },
  { value: 'jeongsi', label: '정시 가정' },
  { value: 'balanced', label: '균형' },
];

const RISK_COLOR = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#16a34a',
  very_low: '#0284c7',
};

// 변경된 필드 하이라이트 배지
function ChangedBadge({ changed }) {
  if (!changed) return null;
  return <span className="sim-changed-badge">변동</span>;
}

// baseline / scenario 나란히 비교 패널
function SimComparePanel({ baseline, scenario }) {
  if (!baseline && !scenario) return null;

  const changedFields = new Set(scenario?.changed_fields || []);

  const baseGap = baseline?.goal_gap?.total_gap ?? baseline?.total_gap;
  const scenGap = scenario?.goal_gap?.total_gap ?? scenario?.total_gap;
  const gapDiff = baseGap != null && scenGap != null ? scenGap - baseGap : null;

  return (
    <div className="sim-compare-root">
      {/* gap 비교 */}
      <div className="sim-compare-row sim-gap-compare">
        <div className="sim-col sim-col-base">
          <p className="sim-col-label">현재 기준</p>
          <div className="sim-big-val">
            {baseGap != null ? `${formatNumber(Math.abs(baseGap), 1)}점 부족` : '—'}
          </div>
          <p className="muted small">{baseline?.goal_gap?.band || baseline?.risk_band || ''}</p>
        </div>

        <div className="sim-col-arrow">
          {gapDiff != null ? (
            <span className={`sim-gap-delta${gapDiff < 0 ? ' improved' : gapDiff > 0 ? ' worsened' : ''}`}>
              {gapDiff < 0 ? `▼ ${formatNumber(Math.abs(gapDiff), 1)}점` : gapDiff > 0 ? `▲ ${formatNumber(gapDiff, 1)}점` : '변동 없음'}
            </span>
          ) : '→'}
        </div>

        <div className="sim-col sim-col-scenario">
          <p className="sim-col-label">
            변경 후
            <ChangedBadge changed={changedFields.has('goal_gap')} />
          </p>
          <div className="sim-big-val">
            {scenGap != null ? `${formatNumber(Math.abs(scenGap), 1)}점 부족` : '—'}
          </div>
          <p className="muted small" style={{ color: scenario?.risk_band ? RISK_COLOR[scenario.risk_band] || '#334155' : undefined }}>
            {scenario?.goal_gap?.band || scenario?.risk_band || ''}
          </p>
        </div>
      </div>

      {/* 과목 우선순위 */}
      {(baseline?.subject_priorities?.length > 0 || scenario?.subject_priorities?.length > 0) ? (
        <div className="sim-section">
          <p className="section-micro-label">
            과목 우선순위
            <ChangedBadge changed={changedFields.has('subject_priorities')} />
          </p>
          <div className="sim-compare-row">
            <div className="sim-col">
              {(baseline?.subject_priorities || []).map((s, i) => (
                <div key={i} className="sim-priority-row">
                  <span className="sim-rank">{i + 1}</span>
                  <span>{s.subject_name || s.subject_code}</span>
                  {s.gap != null ? <span className="muted small">{formatNumber(s.gap, 1)}pt</span> : null}
                </div>
              ))}
            </div>
            <div className="sim-col-arrow">→</div>
            <div className="sim-col">
              {(scenario?.subject_priorities || []).map((s, i) => {
                const baseIdx = (baseline?.subject_priorities || []).findIndex(
                  (b) => b.subject_code === s.subject_code || b.subject_name === s.subject_name
                );
                const moved = baseIdx !== -1 && baseIdx !== i;
                return (
                  <div key={i} className={`sim-priority-row${moved ? ' sim-moved' : ''}`}>
                    <span className="sim-rank">{i + 1}</span>
                    <span>{s.subject_name || s.subject_code}</span>
                    {s.gap != null ? <span className="muted small">{formatNumber(s.gap, 1)}pt</span> : null}
                    {moved ? <span className="sim-changed-badge">이동</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 주간 배분 */}
      {(baseline?.weekly_time_allocation?.length > 0 || scenario?.weekly_time_allocation?.length > 0) ? (
        <div className="sim-section">
          <p className="section-micro-label">
            주간 시간 배분
            <ChangedBadge changed={changedFields.has('weekly_time_allocation')} />
          </p>
          <div className="sim-compare-row">
            <div className="sim-col">
              {(baseline?.weekly_time_allocation || []).map((a, i) => (
                <div key={i} className="sim-alloc-row">
                  <span>{a.subject_name || a.label}</span>
                  <span className="muted small">{formatNumber(a.hours)}시간</span>
                </div>
              ))}
            </div>
            <div className="sim-col-arrow">→</div>
            <div className="sim-col">
              {(scenario?.weekly_time_allocation || []).map((a, i) => {
                const base = (baseline?.weekly_time_allocation || []).find(
                  (b) => b.subject_name === a.subject_name || b.label === a.label
                );
                const diff = base != null ? a.hours - base.hours : null;
                return (
                  <div key={i} className={`sim-alloc-row${diff && diff !== 0 ? ' sim-moved' : ''}`}>
                    <span>{a.subject_name || a.label}</span>
                    <span className="muted small">
                      {formatNumber(a.hours)}시간
                      {diff != null && diff !== 0 ? (
                        <span className={diff > 0 ? 'sim-up' : 'sim-down'}>
                          {' '}{diff > 0 ? `+${formatNumber(diff, 1)}` : formatNumber(diff, 1)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 시나리오 요약 */}
      {scenario?.summary ? (
        <div className="sim-summary-box">
          <p style={{ margin: 0 }}>{scenario.summary}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function StudentSimulatorPage() {
  const { token } = useAuth();
  const [deltas, setDeltas] = useState(
    SUBJECTS.map((s) => ({ subject_code: s.code, label: s.label, delta: 0 }))
  );
  const [hoursDelta, setHoursDelta] = useState(2);
  const [direction, setDirection] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { message: error, flashError: setError } = useFlashMessage(8000);

  const setDelta = (code, val) =>
    setDeltas((prev) =>
      prev.map((d) => (d.subject_code === code ? { ...d, delta: val === '' ? 0 : Number(val) } : d))
    );

  const validate = () => {
    for (const d of deltas) {
      if (d.delta < -50 || d.delta > 50) return `${d.label} 변화는 -50~+50 사이로 입력해줘.`;
    }
    if (Number(hoursDelta) < -20 || Number(hoursDelta) > 40)
      return '주간 시간 변화는 -20~+40 사이로 입력해줘.';
    return null;
  };

  const run = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setResult(null);
    try {
      const payload = await apiRequest('/frontend/student/simulations/goal-scenario', {
        method: 'POST',
        token,
        body: {
          goal_id: null,
          subject_score_deltas: deltas
            .filter((d) => d.delta !== 0)
            .map(({ subject_code, delta }) => ({ subject_code, delta })),
          weekly_hours_delta: Number(hoursDelta || 0),
          assume_direction: direction || null,
        },
      });
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '시뮬레이션에 실패했어.');
    } finally {
      setLoading(false);
    }
  };

  // 입력이 바뀌면 결과 자동 초기화 유도
  const resetResult = () => { if (result) setResult(null); };

  return (
    <Layout title="시뮬레이터">
      <SectionCard
        title="What-if 시뮬레이션"
        subtitle="숫자 조정 → gap 변화 즉시 확인"
      >
        <form className="simulator-form" onSubmit={run}>
          <div>
            <p className="section-micro-label">과목별 점수 변화 (현재 대비 +/- 점)</p>
            <div className="simulator-subject-inputs">
              {deltas.map(({ subject_code, label, delta }) => (
                <label key={subject_code} style={{ display: 'grid', gap: '0.25rem' }}>
                  <span className="muted small">{label}</span>
                  <input
                    type="number"
                    value={delta}
                    onChange={(e) => { setDelta(subject_code, e.target.value); resetResult(); }}
                    min={-50}
                    max={50}
                    step={1}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="sim-input-row">
            <label style={{ display: 'grid', gap: '0.25rem' }}>
              <span className="section-micro-label">주간 공부 시간 변화 (+/- 시간)</span>
              <input
                type="number"
                value={hoursDelta}
                onChange={(e) => { setHoursDelta(e.target.value); resetResult(); }}
                min={-20}
                max={40}
                step={0.5}
                style={{ maxWidth: '9rem' }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.25rem' }}>
              <span className="section-micro-label">지원 방향 가정</span>
              <select
                value={direction}
                onChange={(e) => { setDirection(e.target.value); resetResult(); }}
                style={{ maxWidth: '12rem' }}
              >
                {DIRECTION_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <button type="submit" disabled={loading}>
              {loading ? '계산 중...' : '바로 계산하기'}
            </button>
          </div>
        </form>

        {error ? <div className="error-box" style={{ marginTop: '0.75rem' }}>{error}</div> : null}
      </SectionCard>

      {result ? (
        <>
          {/* 추천 요약 */}
          {result.scenario?.summary ? (
            <div className="info-box">
              <strong>AI 분석:</strong> {result.scenario.summary}
            </div>
          ) : null}

          {/* 비교 결과: 넓은 카드 + 입력값 요약 compact (있을 때만 8-4) */}
          <div className={`page-row${result.inputs_echo ? ' r-8-4' : ''}`}>
            <SectionCard
              title="변경 전/후 비교"
              subtitle="변동 항목은 강조 표시됨"
            >
              <SimComparePanel
                baseline={result.baseline}
                scenario={result.scenario}
              />
            </SectionCard>

            {result.inputs_echo ? (
              <SectionCard title="입력값 요약" compact>
                <div className="flat-list">
                  {deltas.filter((d) => d.delta !== 0).map((d) => (
                    <div key={d.subject_code} className="flat-row">
                      <span>{d.label}</span>
                      <span className={d.delta > 0 ? 'sim-up' : 'sim-down'}>
                        {d.delta > 0 ? `+${d.delta}` : d.delta}점
                      </span>
                    </div>
                  ))}
                  {Number(hoursDelta) !== 0 ? (
                    <div className="flat-row">
                      <span>주간 시간</span>
                      <span className={Number(hoursDelta) > 0 ? 'sim-up' : 'sim-down'}>
                        {Number(hoursDelta) > 0 ? `+${hoursDelta}` : hoursDelta}시간
                      </span>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}
          </div>
        </>
      ) : null}
    </Layout>
  );
}
