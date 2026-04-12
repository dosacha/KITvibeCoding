import Layout from '../components/Layout.jsx';
import MetricCard from '../components/MetricCard.jsx';
import SectionCard from '../components/SectionCard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';

function weaknessLabel(value) {
  const map = {
    concept_gap: '개념 보강 필요',
    transfer_weakness: '응용·전이 연습 필요',
    precision_accuracy: '정확도 향상 필요',
    time_pressure: '시간 관리 강화 필요',
    instability: '성취 안정화 필요',
    persistence_risk: '학습 지속성 강화 필요',
  };
  return map[value] || value || '-';
}

// study_methods 항목이 문자열 또는 {label, detail, method, ...} 객체를 모두 수용한다.
function renderStudyMethod(item, index) {
  if (!item) return null;
  if (typeof item === 'string') {
    return <li key={index}>{item}</li>;
  }
  const label = item.label || item.method || `방법 ${index + 1}`;
  const detail = item.detail || item.description || item.message;
  return (
    <li key={index} className="study-method-item">
      <strong>{label}</strong>
      {detail ? <span className="study-method-detail">{detail}</span> : null}
    </li>
  );
}

// weekly_time_allocation이 배열 또는 객체 두 가지 shape를 모두 처리한다.
function renderWeeklyAllocation(allocation) {
  if (!allocation) return <p className="muted small">배분 정보가 없습니다.</p>;

  if (Array.isArray(allocation)) {
    if (allocation.length === 0) return <p className="muted small">배분 정보가 없습니다.</p>;
    return (
      <ul>
        {allocation.map((item, index) => (
          <li key={`${item?.subject_name ?? index}`}>
            <strong>{item?.subject_name || '과목'}</strong>
            {item?.hours != null ? `: ${item.hours}시간` : ''}
            {item?.focus ? ` · ${item.focus}` : ''}
          </li>
        ))}
      </ul>
    );
  }

  // Object shape {focus_hours, review_hours, mock_hours, notes}
  return (
    <ul>
      {allocation.focus_hours != null ? <li>핵심 보강: {allocation.focus_hours}시간</li> : null}
      {allocation.review_hours != null ? <li>복습: {allocation.review_hours}시간</li> : null}
      {allocation.mock_hours != null ? <li>모의 시험: {allocation.mock_hours}시간</li> : null}
      {allocation.notes ? <li className="small muted">{allocation.notes}</li> : null}
    </ul>
  );
}

function renderRisk(risk, index) {
  if (!risk) return null;
  if (typeof risk === 'string') return <li key={index}>{risk}</li>;
  const label = risk.label || risk.type || `위험 요인 ${index + 1}`;
  const message = risk.message || risk.reason || risk.detail;
  return (
    <li key={index} className="study-method-item">
      <strong>{label}</strong>
      {message ? <span className="study-method-detail">{message}</span> : null}
    </li>
  );
}

export default function StudentDashboardPage() {
  const { token } = useAuth();
  const { data, loading, error } = useAsyncData(
    async () => (await apiRequest('/frontend/dashboard/student', { token })).data,
    [token]
  );

  const plan = data?.approved_strategy?.plan;

  return (
    <Layout title="내 학습 전략">
      {loading ? <div className="empty-state">맞춤 전략을 준비하는 중입니다...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
      {data ? (
        <>
          <div className="metric-grid">
            <MetricCard
              label="주간 가용 시간"
              value={`${data.student?.weekly_available_hours ?? '-'}시간`}
            />
            <MetricCard
              label="1순위 목표 대학"
              value={
                data.primary_goal
                  ? `${data.primary_goal.university_name} ${data.primary_goal.target_department}`
                  : '미설정'
              }
            />
            <MetricCard
              label="전략 승인 상태"
              value={data.approved_strategy ? '승인 완료' : '검토 중'}
              hint={data.review_notice || '승인된 전략만 이 화면에 표시됩니다.'}
            />
          </div>

          <SectionCard
            title="현재 학습 진단"
            subtitle="강점을 유지하면서 목표 대학에 필요한 영역을 함께 강화합니다."
          >
            {data.diagnosis ? (
              <div className="stack-gap">
                <div className="info-box">
                  <strong>핵심 방향:</strong> {weaknessLabel(data.diagnosis.primary_weakness_type)}
                  {data.diagnosis.coaching_message ? (
                    <p style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                      {data.diagnosis.coaching_message}
                    </p>
                  ) : null}
                </div>

                {data.diagnosis.weak_subjects?.length > 0 ? (
                  <div>
                    <strong>집중 보완 과목</strong>
                    <ul>
                      {data.diagnosis.weak_subjects.map((subject) => (
                        <li key={subject.subject_code}>
                          {subject.subject_name}
                          {subject.gap_score != null ? ` · 목표까지 ${subject.gap_score}점` : ''}
                          {subject.stability != null ? ` · 안정도 ${subject.stability}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {data.diagnosis.weak_units?.length > 0 ? (
                  <div>
                    <strong>집중 보완 단원</strong>
                    <ul>
                      {data.diagnosis.weak_units.map((unit, index) => (
                        <li key={`${unit.unit_name}-${index}`}>
                          {unit.subject_name} · {unit.unit_name}
                          {unit.effective_mastery != null
                            ? ` (현재 ${Math.round(unit.effective_mastery)}점)`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {data.diagnosis.low_confidence_flag ? (
                  <div className="info-box warn">
                    아직 데이터가 충분히 쌓이지 않았습니다. 시험 결과와 학습 기록이 더 쌓이면 전략 정확도가 높아집니다.
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="muted">진단 데이터가 아직 없습니다. 시험 결과를 입력하면 맞춤 진단이 시작됩니다.</p>
            )}
          </SectionCard>

          <SectionCard
            title="강사 승인 학습 전략"
            subtitle="담당 강사가 검토하고 승인한 전략입니다."
          >
            {data.approved_strategy && plan ? (
              <div className="stack-gap">
                {data.approved_strategy.summary ? (
                  <p style={{ fontSize: '0.97rem', lineHeight: 1.6 }}>{data.approved_strategy.summary}</p>
                ) : null}

                <div className="split-grid">
                  <div>
                    <h4>주간 학습 배분</h4>
                    {renderWeeklyAllocation(plan.weekly_time_allocation)}
                  </div>
                  <div>
                    <h4>다음 점검 일정</h4>
                    <p>
                      {plan.next_check_in?.date || '미정'}
                      {plan.next_check_in?.days != null
                        ? ` (${plan.next_check_in.days}일 후)`
                        : ''}
                    </p>
                    {plan.next_check_in?.reason || plan.next_check_in?.note ? (
                      <p className="muted small">
                        {plan.next_check_in.reason || plan.next_check_in.note}
                      </p>
                    ) : (
                      <p className="muted small">다음 시험 및 학습 진척도를 확인합니다.</p>
                    )}
                  </div>
                </div>

                {(plan.unit_study_order || []).length > 0 ? (
                  <div>
                    <h4>단원 학습 순서</h4>
                    <ol>
                      {(plan.unit_study_order || []).map((item, index) => {
                        if (typeof item === 'string') return <li key={index}>{item}</li>;
                        return (
                          <li key={`${item?.unit_name ?? index}`}>
                            {item?.subject_name ? `${item.subject_name} · ` : ''}
                            {item?.unit_name || item?.label || `단원 ${index + 1}`}
                            {item?.effective_mastery != null
                              ? ` (현재 ${Math.round(item.effective_mastery)}점)`
                              : ''}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : null}

                <div className="split-grid">
                  {(plan.study_methods || []).length > 0 ? (
                    <div>
                      <h4>추천 학습 방식</h4>
                      <ul>{(plan.study_methods || []).map(renderStudyMethod)}</ul>
                    </div>
                  ) : null}

                  {(plan.risk_factors || []).length > 0 ? (
                    <div>
                      <h4>주의할 점</h4>
                      <ul>{(plan.risk_factors || []).map(renderRisk)}</ul>
                    </div>
                  ) : null}
                </div>

                {data.approved_strategy.student_coaching || plan.student_message ? (
                  <div className="info-box">
                    <strong>강사 코칭 메시지</strong>
                    <p style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                      {data.approved_strategy.student_coaching || plan.student_message}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="muted">{data.review_notice || '강사가 전략을 검토 중입니다. 승인 후 이 화면에서 확인할 수 있습니다.'}</p>
            )}
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
}
