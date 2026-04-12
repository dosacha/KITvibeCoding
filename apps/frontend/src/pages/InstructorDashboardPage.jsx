import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import MetricCard from '../components/MetricCard.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';

const WEAKNESS_LABEL = {
  concept_gap: '개념 결손형',
  transfer_weakness: '적용 전이 약형',
  precision_accuracy: '정확도 부족형',
  time_pressure: '시간 압박형',
  instability: '편차 큰 불안정형',
  persistence_risk: '지속성 취약형',
};

const WEAKNESS_TONE = {
  concept_gap: 'tone-red',
  transfer_weakness: 'tone-orange',
  precision_accuracy: 'tone-yellow',
  time_pressure: 'tone-purple',
  instability: 'tone-blue',
  persistence_risk: 'tone-gray',
};

function weaknessLabel(value) {
  return WEAKNESS_LABEL[value] || value || '-';
}

const REVIEW_PRIORITY = {
  pending_review: 0,
  draft: 1,
  held: 2,
  approved: 3,
  archived: 4,
};

function strategySortKey(student) {
  const status = student.latest_strategy_status;
  if (student.low_confidence_flag) return -1;
  if (status in REVIEW_PRIORITY) return REVIEW_PRIORITY[status];
  return 99;
}

export default function InstructorDashboardPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [classFilter, setClassFilter] = useState('all');

  const { data, loading, error } = useAsyncData(
    async () => {
      const [dashboardResponse, students] = await Promise.all([
        apiRequest('/frontend/dashboard/instructor', { token }),
        apiRequest('/frontend/students', { token }),
      ]);
      return { dashboard: dashboardResponse.data, students };
    },
    [token]
  );

  const dashboard = data?.dashboard;
  const allStudents = data?.students || [];

  const classOptions = useMemo(() => {
    const set = new Map();
    allStudents.forEach((student) => {
      const key = student.class_group_name || '미배정';
      set.set(key, (set.get(key) || 0) + 1);
    });
    return Array.from(set.entries()).map(([name, count]) => ({ name, count }));
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    if (classFilter === 'all') return allStudents;
    return allStudents.filter(
      (student) => (student.class_group_name || '미배정') === classFilter
    );
  }, [allStudents, classFilter]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => strategySortKey(a) - strategySortKey(b));
  }, [filteredStudents]);

  const lowConfidenceCount = useMemo(
    () => allStudents.filter((student) => student.low_confidence_flag).length,
    [allStudents]
  );
  const needsReviewCount = useMemo(
    () =>
      allStudents.filter(
        (student) =>
          student.latest_strategy_status &&
          ['pending_review', 'draft', 'held'].includes(student.latest_strategy_status)
      ).length,
    [allStudents]
  );

  const pageTitle = isAdmin ? '운영 대시보드' : '학생 진단 · 전략';
  const pageSubtitle = isAdmin
    ? '전체 학생 현황과 검토 대기 전략을 관리합니다.'
    : '검토가 필요한 학생이 상단에 표시됩니다. AI 전략을 확인하고 승인하세요.';

  return (
    <Layout title={pageTitle}>
      {loading ? <div className="empty-state">대시보드를 불러오는 중입니다...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {dashboard ? (
        <>
          {lowConfidenceCount > 0 ? (
            <div className="info-box warn">
              현재 <strong>{lowConfidenceCount}</strong>명의 학생이 저신뢰 진단 상태입니다. 추가 시험 결과나 학습 기록 입력을 우선하세요.
            </div>
          ) : null}

          <p className="muted small" style={{ marginBottom: '0.5rem' }}>{pageSubtitle}</p>

          <div className="metric-grid">
            <MetricCard label="담당 반" value={dashboard.summary.class_group_count} hint="담당 반 수" />
            <MetricCard label="학생 수" value={dashboard.summary.student_count} hint="접근 가능한 학생" />
            <MetricCard label="검토 대기" value={needsReviewCount} hint="초안 · 검토 대기 · 보류" />
            <MetricCard label="저신뢰 진단" value={lowConfidenceCount} hint="추가 데이터 필요" />
          </div>

          <SectionCard
            title="학생 목록"
            subtitle="검토 대기 및 저신뢰 학생이 상단에 먼저 보입니다."
          >
            <div className="dashboard-filter-row">
              <span className="small muted">반:</span>
              <button
                type="button"
                className={`secondary-button compact${classFilter === 'all' ? ' active' : ''}`}
                onClick={() => setClassFilter('all')}
              >
                전체 ({allStudents.length})
              </button>
              {classOptions.map((option) => (
                <button
                  key={option.name}
                  type="button"
                  className={`secondary-button compact${classFilter === option.name ? ' active' : ''}`}
                  onClick={() => setClassFilter(option.name)}
                >
                  {option.name} ({option.count})
                </button>
              ))}
            </div>
            <div className="table-wrapper">
              <table className="dense-table">
                <thead>
                  <tr>
                    <th>학생</th>
                    <th>반</th>
                    <th>1순위 목표</th>
                    <th>취약 유형</th>
                    <th>전략 상태</th>
                    <th>신뢰도</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="muted small">
                        선택한 필터에 해당하는 학생이 없습니다.
                      </td>
                    </tr>
                  ) : null}
                  {sortedStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <Link to={`/students/${student.id}`}>{student.full_name}</Link>
                      </td>
                      <td className="small muted">{student.class_group_name || '미배정'}</td>
                      <td className="small">{student.primary_goal || '-'}</td>
                      <td>
                        {student.latest_weakness ? (
                          <span
                            className={`chip-item small ${WEAKNESS_TONE[student.latest_weakness] || ''}`}
                          >
                            {weaknessLabel(student.latest_weakness)}
                          </span>
                        ) : (
                          <span className="muted small">-</span>
                        )}
                      </td>
                      <td>
                        {student.latest_strategy_status ? (
                          <StatusBadge status={student.latest_strategy_status} />
                        ) : (
                          <span className="muted small">없음</span>
                        )}
                      </td>
                      <td>
                        {student.low_confidence_flag ? (
                          <span className="status-badge unanswered">저신뢰</span>
                        ) : (
                          <span className="muted small">보통 이상</span>
                        )}
                      </td>
                      <td>
                        <Link to={`/students/${student.id}`} className="secondary-button compact">
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {(dashboard.class_groups || []).map((group) => {
            const groupTotal =
              group.weakness_distribution.reduce((sum, item) => sum + item.count, 0) || 1;
            return (
              <SectionCard
                key={group.class_group_id ?? group.class_group_name}
                title={group.class_group_name}
                subtitle={`학생 ${group.student_count}명 · 취약 유형 분포, 군집, 보강/반이동 추천`}
              >
                <div className="dashboard-group-grid">
                  <div className="stack-gap">
                    <h4>취약 유형 분포</h4>
                    {group.weakness_distribution.length > 0 ? (
                      <div className="bar-list">
                        {group.weakness_distribution.map((item) => {
                          const percent = Math.round((item.count / groupTotal) * 100);
                          return (
                            <div key={item.weakness_type} className="bar-row">
                              <div className="bar-meta">
                                <span
                                  className={`chip-item small ${WEAKNESS_TONE[item.weakness_type] || ''}`}
                                >
                                  {weaknessLabel(item.weakness_type)}
                                </span>
                                <strong>
                                  {item.count}명{' '}
                                  <span className="muted small">({percent}%)</span>
                                </strong>
                              </div>
                              <div className="bar-track">
                                <div
                                  className={`bar-fill ${WEAKNESS_TONE[item.weakness_type] || ''}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="muted small">아직 진단 데이터가 없습니다.</p>
                    )}

                    <h4>취약 유형 군집</h4>
                    {group.weakness_clusters.length > 0 ? (
                      <div className="stack-gap">
                        {group.weakness_clusters.map((cluster) => (
                          <div className="cluster-row" key={cluster.label}>
                            <span
                              className={`chip-item small ${WEAKNESS_TONE[cluster.label] || ''}`}
                            >
                              {weaknessLabel(cluster.label)}
                            </span>
                            <span className="muted small">{cluster.count}명</span>
                            <div className="cluster-students">
                              {(cluster.students || []).map((name) => (
                                <span className="chip-item small" key={name}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted small">군집 데이터가 아직 없습니다.</p>
                    )}
                  </div>

                  <div className="stack-gap">
                    <h4>보강 후보 추천</h4>
                    {group.remediation_candidates.length > 0 ? (
                      <div className="recommendation-list">
                        {group.remediation_candidates.map((candidate) => (
                          <div className="recommendation-row" key={candidate.student_id}>
                            <Link to={`/students/${candidate.student_id}`}>
                              <strong>{candidate.student_name}</strong>
                            </Link>
                            <p className="small muted">{candidate.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted small">현재 추천 후보가 없습니다.</p>
                    )}

                    <h4>반 이동 추천</h4>
                    {group.class_move_suggestions.length > 0 ? (
                      <div className="recommendation-list">
                        {group.class_move_suggestions.map((suggestion) => (
                          <div
                            className={`recommendation-row direction-${suggestion.direction}`}
                            key={`${suggestion.student_id}-${suggestion.direction}`}
                          >
                            <div className="recommendation-head">
                              <Link to={`/students/${suggestion.student_id}`}>
                                <strong>{suggestion.student_name}</strong>
                              </Link>
                              <span
                                className={`chip-item small direction-chip direction-${suggestion.direction}`}
                              >
                                {suggestion.suggestion}
                              </span>
                            </div>
                            <p className="small muted">{suggestion.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted small">자동 확정 없이 설명형 추천만 제공합니다.</p>
                    )}
                  </div>
                </div>

                <div className="stack-gap consultation-block">
                  <h4>상담용 설명 문장</h4>
                  {group.consultation_sentences.length > 0 ? (
                    <ul className="consultation-list">
                      {group.consultation_sentences.map((sentence, index) => (
                        <li key={index} className="small">
                          {sentence}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted small">상담 문장이 아직 생성되지 않았습니다.</p>
                  )}
                </div>
              </SectionCard>
            );
          })}
        </>
      ) : null}
    </Layout>
  );
}
