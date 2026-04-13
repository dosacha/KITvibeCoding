import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber, weaknessLabel } from '../lib/studentLabels.js';

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
          <SectionCard title="성장 요약" subtitle="점수, 목표대학 gap, 안정성 변화를 함께 봐.">
            <div className="highlight-card">
              <h3>{data.summary}</h3>
              {data.weakness_shift ? (
                <p className="muted">
                  현재 집중 보완 유형: {data.weakness_shift.label || weaknessLabel(data.weakness_shift.current)}
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="과목별 점수 흐름" subtitle="최근 시험 점수 변화를 과목별로 확인해.">
            <div className="split-grid">
              {(data.score_trend || []).map((subject) => (
                <div key={subject.subject_code} className="evidence-card">
                  <strong>{subject.subject_name}</strong>
                  <div className="simple-list">
                    {(subject.points || []).map((point) => (
                      <div key={`${subject.subject_code}-${point.exam_date}`} className="list-row">
                        <span>{point.exam_name}</span>
                        <strong>{formatNumber(point.score)}점</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="안정성 흐름" subtitle="점수 변동이 줄어드는지도 같이 확인해.">
            <div className="simple-list">
              {(data.stability_trend || []).map((item) => (
                <div key={item.subject_code} className="list-row">
                  <strong>{item.subject_name}</strong>
                  <span>안정도 {formatNumber(item.stability)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
