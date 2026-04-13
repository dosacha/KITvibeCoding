// FE-501~504: 성장 리포트
// 점수 트렌드 막대, gap 감소 시각화, 실행률 추이, 안정성 흐름.

import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber, weaknessLabel } from '../lib/studentLabels.js';

// 점수 막대 차트 (과목별 히스토리)
function ScoreTrendChart({ scoreTrend }) {
  if (!scoreTrend?.length) return <p className="muted small">점수 데이터가 없어.</p>;

  return (
    <div className="score-trend-chart">
      {scoreTrend.map((subject) => {
        const points = subject.points || [];
        if (!points.length) return null;
        const latest = points[points.length - 1];
        const prev = points[points.length - 2];
        const delta = prev ? latest.score - prev.score : null;

        return (
          <div key={subject.subject_code} className="score-subject-block">
            <div className="score-subject-header">
              <strong>{subject.subject_name}</strong>
              <span>
                {formatNumber(latest.score)}점
                {delta != null ? (
                  <span
                    className="muted small"
                    style={{ marginLeft: '0.35rem', color: delta >= 0 ? '#16a34a' : '#dc2626' }}
                  >
                    {delta >= 0 ? `+${formatNumber(delta)}` : formatNumber(delta)}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="score-point-list">
              {points.map((point) => {
                const pct = Math.min(100, Math.round((point.score / 100) * 100));
                return (
                  <div key={`${subject.subject_code}-${point.exam_date}`} className="score-point-row">
                    <span className="score-point-label">{point.exam_name || point.exam_date}</span>
                    <div className="score-bar-track">
                      <div className="score-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="score-value">{formatNumber(point.score)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Gap 감소 막대 차트
function GapTrendChart({ gapTrend }) {
  if (!gapTrend?.length) return <p className="muted small">gap 데이터가 없어.</p>;

  const maxGap = Math.max(...gapTrend.map((g) => g.max_gap ?? g.current_gap ?? 0), 1);

  return (
    <div className="gap-trend-chart">
      {gapTrend.map((item) => {
        const cur = item.current_gap ?? 0;
        const prev = item.prev_gap ?? cur;
        const pct = Math.min(100, Math.round((cur / maxGap) * 100));
        const delta = cur - prev;

        return (
          <div key={item.subject_code} className="gap-trend-row">
            <span className="gap-trend-subject">{item.subject_name}</span>
            <div className="gap-trend-bar-track">
              <div className="gap-trend-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="gap-trend-value">
              {formatNumber(cur)}점
              {delta !== 0 ? (
                <span
                  style={{ marginLeft: '0.3rem', color: delta < 0 ? '#16a34a' : '#dc2626', fontSize: '0.75rem' }}
                >
                  {delta < 0 ? `▼${formatNumber(Math.abs(delta))}` : `▲${formatNumber(delta)}`}
                </span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 실행률 추이 막대
function ExecutionTrend({ executionTrend }) {
  if (!executionTrend?.length) return <p className="muted small">실행률 데이터가 없어.</p>;

  return (
    <div className="execution-trend">
      {executionTrend.map((week, i) => {
        const pct = Math.min(100, Math.round((week.completion_rate || 0) * 100));
        return (
          <div key={week.week_start || i} className="execution-week-row">
            <span className="execution-week-label">{week.week_start || `${i + 1}주 전`}</span>
            <div className="execution-bar-track">
              <div className="execution-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="execution-rate-value">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentGrowthPage() {
  const { token } = useAuth();
  const { data, loading, error } = useAsyncData(
    () => apiRequest('/frontend/student/growth', { token }),
    [token]
  );

  return (
    <Layout title="성장 리포트">
      {loading ? <div className="empty-state">성장 데이터를 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 성장 요약 */}
          <SectionCard title="성장 요약" subtitle="점수 · gap · 실행률 한눈에 보기">
            <div className="highlight-card">
              <h3 style={{ marginBottom: 0 }}>{data.summary || '최근 결과와 실행 기록을 바탕으로 다음 조정 포인트를 확인해보자.'}</h3>
              {data.weakness_shift ? (
                <p className="muted" style={{ margin: 0 }}>
                  현재 집중 보완 유형:{' '}
                  <strong>
                    {data.weakness_shift.label || weaknessLabel(data.weakness_shift.current)}
                  </strong>
                  {data.weakness_shift.prev && data.weakness_shift.current !== data.weakness_shift.prev
                    ? ` (이전: ${data.weakness_shift.prev_label || weaknessLabel(data.weakness_shift.prev)})`
                    : ''}
                </p>
              ) : null}
            </div>

            {/* 핵심 수치 */}
            {data.key_metrics?.length > 0 ? (
              <div className="growth-metric-row" style={{ marginTop: '0.75rem' }}>
                {data.key_metrics.map((m, i) => (
                  <div key={i} className="metric-card">
                    <span className="metric-label">{m.label}</span>
                    <strong className="metric-value">
                      {formatNumber(m.value)}{m.unit || ''}
                    </strong>
                    {m.delta != null ? (
                      <span
                        className="small"
                        style={{ color: m.delta >= 0 ? '#16a34a' : '#dc2626' }}
                      >
                        {m.delta >= 0 ? `+${formatNumber(m.delta)}` : formatNumber(m.delta)}{m.unit || ''}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>

          {/* Row: 점수 흐름(넓) + Gap 변화(같이 있으면 6-6, 혼자면 단독) */}
          <div className={`page-row${data.gap_trend?.length > 0 ? ' r-6-6' : ''}`}>
            <SectionCard title="과목별 점수 흐름" subtitle="최근 시험 점수 변화">
              <ScoreTrendChart scoreTrend={data.score_trend} />
            </SectionCard>
            {data.gap_trend?.length > 0 ? (
              <SectionCard title="목표대학 Gap 변화" subtitle="gap이 줄수록 목표에 가까워짐">
                <GapTrendChart gapTrend={data.gap_trend} />
              </SectionCard>
            ) : null}
          </div>

          {/* Row: 실행률 추이 + 안정성 (둘 다 있으면 6-6) */}
          {(data.execution_trend?.length > 0 || data.stability_trend?.length > 0) ? (
            <div className={`page-row${data.execution_trend?.length > 0 && data.stability_trend?.length > 0 ? ' r-6-6' : ''}`}>
              {data.execution_trend?.length > 0 ? (
                <SectionCard title="주간 실행률 추이" subtitle="계획 대비 실제 수행률">
                  <ExecutionTrend executionTrend={data.execution_trend} />
                </SectionCard>
              ) : null}
              {data.stability_trend?.length > 0 ? (
                <SectionCard title="점수 안정성" subtitle="높을수록 점수 변동이 적음">
                  <div className="simple-list">
                    {data.stability_trend.map((item) => {
                      const pct = Math.min(100, Math.round((item.stability ?? 0) * 100));
                      return (
                        <div key={item.subject_code} className="list-row">
                          <strong>{item.subject_name}</strong>
                          <div style={{ flex: 1, maxWidth: '8rem' }}>
                            <div className="score-bar-track">
                              <div
                                className="score-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                                }}
                              />
                            </div>
                          </div>
                          <span className="muted small">{formatNumber(item.stability * 100, 0)}점</span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
