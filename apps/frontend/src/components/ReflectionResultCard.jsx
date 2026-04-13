// 회고 저장 후 AI 분석 결과를 보여주는 카드
import { Link } from 'react-router-dom';

export default function ReflectionResultCard({ result, onDismiss }) {
  if (!result) return null;

  const {
    reflection_saved,
    recommended_adjustments = [],
    suggested_regenerate,
    updated_plan_summary,
  } = result;

  if (!reflection_saved) return null;

  return (
    <div className="reflection-result-card">
      <div className="reflection-result-header">
        <span className="reflection-result-icon">✓</span>
        <strong>회고가 저장됐어</strong>
        {onDismiss ? (
          <button type="button" className="secondary-button compact" onClick={onDismiss}>
            닫기
          </button>
        ) : null}
      </div>

      {updated_plan_summary ? (
        <p className="reflection-result-summary">{updated_plan_summary}</p>
      ) : null}

      {recommended_adjustments.length > 0 ? (
        <div className="reflection-result-section">
          <p className="section-micro-label">추천 조정안</p>
          <ul className="bullet-list">
            {recommended_adjustments.map((adj, i) => (
              <li key={i}>
                {typeof adj === 'string' ? adj : adj.text || adj.label || JSON.stringify(adj)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suggested_regenerate ? (
        <div className="reflection-regen-cta">
          <p className="muted small" style={{ margin: '0 0 0.4rem' }}>
            계획을 다시 짜는 게 도움이 될 것 같아.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/student/planner" className="secondary-button compact">
              플래너에서 재생성
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
