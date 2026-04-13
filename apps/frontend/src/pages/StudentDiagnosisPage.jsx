import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber, weaknessCoaching, weaknessLabel } from '../lib/studentLabels.js';

function LoadingOrError({ loading, error }) {
  if (loading) return <div className="empty-state">진단 데이터를 불러오는 중이야.</div>;
  if (error) return <div className="error-box">{error}</div>;
  return null;
}

export default function StudentDiagnosisPage() {
  const { token } = useAuth();
  const { data, loading, error } = useAsyncData(
    () => apiRequest('/frontend/student/diagnosis', { token }),
    [token]
  );

  const weaknessType = data?.primary_weakness?.type;

  return (
    <Layout title="진단">
      <LoadingOrError loading={loading} error={error} />

      {data ? (
        <>
          <SectionCard
            title="내 취약 유형"
            subtitle="점수 하나가 아니라 최근 시험 흐름, 단원 이해도, 학습 안정성을 함께 본 결과야."
          >
            <div className="highlight-card">
              <p className="section-micro-label">현재 우선 진단</p>
              <h3>{data.primary_weakness?.label || weaknessLabel(weaknessType)}</h3>
              <p className="muted">{data.coaching_summary || weaknessCoaching(weaknessType)}</p>
              <p className="small muted">
                신뢰도: {data.confidence?.confidence_level || '-'}
                {data.confidence?.confidence_score != null ? ` (${formatNumber(data.confidence.confidence_score * 100, 0)}%)` : ''}
              </p>
            </div>
          </SectionCard>

          <div className="split-grid">
            <SectionCard title="먼저 볼 과목" subtitle="목표대학 gap과 안정성을 함께 반영한 우선순위야.">
              <div className="simple-list">
                {(data.weak_subjects || []).map((subject) => (
                  <div key={subject.subject_code || subject.subject_name} className="list-row">
                    <strong>{subject.subject_name}</strong>
                    <span className="muted small">
                      목표까지 {formatNumber(subject.gap_score)}점 · 안정도 {formatNumber(subject.stability)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="먼저 보완할 단원" subtitle="이해도와 근거 신뢰도를 같이 확인해.">
              <div className="simple-list">
                {(data.weak_units || []).slice(0, 6).map((unit) => (
                  <div key={`${unit.subject_name}-${unit.unit_name}`} className="list-row">
                    <strong>{unit.subject_name} · {unit.unit_name}</strong>
                    <span className="muted small">
                      이해도 {formatNumber(unit.effective_mastery)}점 · 신뢰도 {formatNumber(unit.unit_confidence)}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="진단 근거" subtitle="AI가 임의로 만든 말이 아니라 계산된 신호를 바탕으로 보여줘.">
            <div className="evidence-grid">
              {(data.evidence || []).slice(0, 6).map((item, index) => (
                <div key={`${item.signal}-${index}`} className="evidence-card">
                  <strong>{weaknessLabel(item.type)}</strong>
                  <p className="muted small">{item.message}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="최근 시험 흐름" subtitle="최근 결과가 어떤 방향으로 움직였는지 확인해.">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>시험</th>
                    <th>과목</th>
                    <th>점수</th>
                    <th>일자</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recent_trend || []).map((row, index) => (
                    <tr key={`${row.exam_name}-${index}`}>
                      <td>{row.exam_name}</td>
                      <td>{row.subject_name}</td>
                      <td>{formatNumber(row.score)}점</td>
                      <td>{row.exam_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
