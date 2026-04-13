import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber, renderRiskLabel, renderRiskMessage, renderStudyMethodDetail, renderStudyMethodText } from '../lib/studentLabels.js';

function StrategyPlan({ strategy }) {
  if (!strategy) return <div className="empty-state">아직 표시할 전략이 없어.</div>;

  return (
    <div className="stack-gap">
      <div className="highlight-card">
        <div className="section-header compact-header">
          <div>
            <p className="section-micro-label">{strategy.variant_label || strategy.variant || '전략안'}</p>
            <h3>{strategy.summary || '전략 요약 준비 중'}</h3>
          </div>
          <StatusBadge status={strategy.status} label={strategy.status_label} />
        </div>
        {strategy.student_coaching ? <p className="muted">{strategy.student_coaching}</p> : null}
      </div>

      <div className="split-grid">
        <div>
          <p className="section-micro-label">주간 시간 배분</p>
          <div className="simple-list">
            {(strategy.weekly_time_allocation || strategy.plan?.weekly_time_allocation || []).map((item, index) => (
              <div key={index} className="list-row">
                <strong>{item.subject_name || item.label || '과목'}</strong>
                <span className="muted small">{formatNumber(item.hours)}시간 · {item.focus || '핵심 보완'}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="section-micro-label">단원 학습 순서</p>
          <div className="simple-list">
            {(strategy.unit_study_order || strategy.plan?.unit_study_order || []).slice(0, 5).map((item, index) => (
              <div key={index} className="list-row">
                <strong>{item.subject_name} · {item.unit_name}</strong>
                <span className="muted small">이해도 {formatNumber(item.effective_mastery)}점</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="split-grid">
        <div>
          <p className="section-micro-label">추천 공부 방식</p>
          <ul className="bullet-list">
            {(strategy.study_methods || strategy.plan?.study_methods || []).map((item, index) => (
              <li key={index}>
                <strong>{renderStudyMethodText(item)}</strong>
                {renderStudyMethodDetail(item) ? <span className="muted small"> · {renderStudyMethodDetail(item)}</span> : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="section-micro-label">주의할 점</p>
          <ul className="bullet-list">
            {(strategy.risk_factors || strategy.plan?.risk_factors || []).map((item, index) => (
              <li key={index}>
                <strong>{renderRiskLabel(item)}</strong>
                {renderRiskMessage(item) ? <span className="muted small"> · {renderRiskMessage(item)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function StudentStrategyWorkspacePage() {
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/strategy-workspace', { token }),
    [token]
  );

  const submitForReview = async () => {
    setMessage('');
    await apiRequest('/frontend/student/strategy-workspace/submit', { method: 'POST', token });
    setMessage('강사 검토 요청을 보냈어.');
    reload();
  };

  return (
    <Layout title="전략 설계실">
      {loading ? <div className="empty-state">전략을 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="info-box">{message}</div> : null}

      {data ? (
        <>
          <SectionCard
            title="AI 기본안"
            subtitle="현재 진단과 목표대학 기준을 반영한 기본 학습 전략이야."
            actions={<button type="button" className="secondary-button compact" onClick={submitForReview}>검토 요청</button>}
          >
            <StrategyPlan strategy={data.ai_basic} />
          </SectionCard>

          <SectionCard title="AI 보수안" subtitle="무리하지 않고 안정적으로 실행하는 방향의 대안이야.">
            <StrategyPlan strategy={data.ai_conservative} />
          </SectionCard>

          <SectionCard title="검토 상태" subtitle="학생 수정안과 강사 승인 흐름을 분리해서 관리해.">
            <div className="simple-list">
              <div className="list-row">
                <strong>현재 상태</strong>
                <span>{data.review_status_label || data.review_status}</span>
              </div>
              <div className="list-row">
                <strong>안내</strong>
                <span className="muted">{data.guide}</span>
              </div>
            </div>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
