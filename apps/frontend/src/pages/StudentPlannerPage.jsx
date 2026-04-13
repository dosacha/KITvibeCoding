import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

export default function StudentPlannerPage() {
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/planner', { token }),
    [token]
  );

  const generatePlan = async () => {
    setMessage('');
    await apiRequest('/frontend/student/planner/generate', { method: 'POST', token });
    setMessage('이번 주 계획을 생성했어.');
    reload();
  };

  const checkItem = async (item) => {
    await apiRequest(`/frontend/student/planner/items/${item.id}/check`, {
      method: 'POST',
      token,
      body: { completed: item.status !== 'completed', completed_minutes: item.planned_minutes || 0 },
    });
    reload();
  };

  const items = data?.plan?.items || [];

  return (
    <Layout title="주간 플래너">
      {loading ? <div className="empty-state">주간 계획을 불러오는 중이야.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {message ? <div className="info-box">{message}</div> : null}

      {data ? (
        <>
          <SectionCard
            title="이번 주 실행 계획"
            subtitle={`기준 주간: ${data.week_start || '-'}부터`}
            actions={<button type="button" className="secondary-button compact" onClick={generatePlan}>계획 생성</button>}
          >
            {data.plan ? (
              <div className="metric-grid">
                <div className="metric-card">
                  <span className="metric-label">계획 시간</span>
                  <strong className="metric-value">{formatNumber((data.plan.planned_total_minutes || 0) / 60)}시간</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">완료 시간</span>
                  <strong className="metric-value">{formatNumber((data.plan.completed_total_minutes || 0) / 60)}시간</strong>
                </div>
                <div className="metric-card">
                  <span className="metric-label">실행률</span>
                  <strong className="metric-value">{formatNumber((data.plan.completion_rate_cached || 0) * 100, 0)}%</strong>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>{data.empty_state || '아직 이번 주 계획이 없어.'}</p>
                <button type="button" onClick={generatePlan}>이번 주 계획 만들기</button>
              </div>
            )}
          </SectionCard>

          {items.length > 0 ? (
            <SectionCard title="할 일 목록" subtitle="완료한 항목을 체크하면 실행률에 반영돼.">
              <div className="simple-list">
                {items.map((item) => (
                  <div key={item.id} className="list-row planner-row">
                    <div>
                      <strong>{item.title || `${item.subject_name} ${item.unit_name || ''}`}</strong>
                      <p className="muted small">
                        {item.subject_name} · {item.unit_name || '공통'} · {item.planned_minutes || 0}분
                      </p>
                    </div>
                    <button type="button" className="secondary-button compact" onClick={() => checkItem(item)}>
                      {item.status === 'completed' ? '완료 취소' : '완료'}
                    </button>
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
