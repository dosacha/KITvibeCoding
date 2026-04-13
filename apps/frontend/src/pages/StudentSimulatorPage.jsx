import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

export default function StudentSimulatorPage() {
  const { token } = useAuth();
  const [mathDelta, setMathDelta] = useState(5);
  const [koreanDelta, setKoreanDelta] = useState(0);
  const [englishDelta, setEnglishDelta] = useState(0);
  const [hoursDelta, setHoursDelta] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const runSimulation = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/frontend/student/simulations/goal-scenario', {
        method: 'POST',
        token,
        body: {
          score_deltas: {
            MATH: Number(mathDelta || 0),
            KOR: Number(koreanDelta || 0),
            ENG: Number(englishDelta || 0),
          },
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
      <SectionCard title="What-if 시뮬레이션" subtitle="점수나 공부 시간이 바뀌면 목표대학 gap이 어떻게 달라지는지 확인해.">
        <form className="split-grid" onSubmit={runSimulation}>
          <label>
            수학 점수 변화
            <input type="number" value={mathDelta} onChange={(event) => setMathDelta(event.target.value)} />
          </label>
          <label>
            국어 점수 변화
            <input type="number" value={koreanDelta} onChange={(event) => setKoreanDelta(event.target.value)} />
          </label>
          <label>
            영어 점수 변화
            <input type="number" value={englishDelta} onChange={(event) => setEnglishDelta(event.target.value)} />
          </label>
          <label>
            주간 공부 시간 변화
            <input type="number" value={hoursDelta} onChange={(event) => setHoursDelta(event.target.value)} />
          </label>
          <div>
            <button type="submit" disabled={loading}>
              {loading ? '계산 중' : '시뮬레이션 실행'}
            </button>
          </div>
        </form>
        {error ? <div className="error-box" style={{ marginTop: '1rem' }}>{error}</div> : null}
      </SectionCard>

      {result ? (
        <>
          <SectionCard title="결과 요약" subtitle="이 결과는 실제 DB에 저장되지 않는 탐색용 계산이야.">
            <div className="highlight-card">
              <h3>{result.recommended_scenario_summary}</h3>
              <p className="muted">
                변경 후 주간 공부 시간: {formatNumber(result.updated_goal_gap?.weekly_hours_after_change)}시간
              </p>
            </div>
          </SectionCard>

          <SectionCard title="과목 우선순위 변화" subtitle="가장 먼저 손볼 과목을 확인해.">
            <div className="simple-list">
              {priorities.map((subject) => (
                <div key={subject.subject_code || subject.subject_name} className="list-row">
                  <strong>{subject.subject_name}</strong>
                  <span className="muted small">
                    예상 gap {formatNumber(subject.simulated_gap ?? subject.gap)}점 · 반영 비중 {formatNumber(subject.weight)}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
