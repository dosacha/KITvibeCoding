import { useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';

// 감사 / 영향 재계산 화면. summary-first UI.
// - AuditLog:       entity + 한국어 action 레이블, payload 접힘
// - ChangeHistory:  before / after diff 박스, 필드명 한국어
// - Recalculation:  trigger 배지, status 배지, scope 요약, details 접힘

const TABS = [
  { id: 'logs', label: '변경 감사 로그', subtitle: '누가 무엇을 언제 변경했는지 기록합니다.' },
  { id: 'changes', label: '필드 변경 이력', subtitle: '필드별 수정 전/후 값을 비교합니다.' },
  {
    id: 'jobs',
    label: '재계산 작업',
    subtitle: '결과·정책·문항 태그 변경에 따른 영향 재계산 이력입니다.',
  },
];

const ACTION_TO_TONE = {
  create: 'approved',
  update: 'pending_review',
  delete: 'failed',
  recalculate: 'processing',
};

// 한국어 action 레이블
const ACTION_LABELS = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  recalculate: '재계산',
  'review:approve': '전략 승인',
  'review:hold': '전략 보류',
  'review:revise': '전략 수정 요청',
};

function formatAction(action) {
  if (!action) return '-';
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith('review:')) {
    const decision = action.split(':')[1];
    return `검토 · ${decision}`;
  }
  for (const [key, label] of Object.entries(ACTION_LABELS)) {
    if (action.startsWith(key)) return label;
  }
  return action;
}

function actionTone(action) {
  if (!action) return null;
  for (const key of Object.keys(ACTION_TO_TONE)) {
    if (action.startsWith(key)) return ACTION_TO_TONE[key];
  }
  if (action.startsWith('review:')) {
    const decision = action.split(':')[1];
    if (decision === 'approve') return 'approved';
    if (decision === 'hold') return 'held';
    if (decision === 'revise') return 'pending_review';
  }
  return null;
}

const ENTITY_LABELS = {
  exams: '시험',
  questions: '문항',
  student_results: '학생 결과',
  student_profiles: '학생 프로필',
  student_strategies: '전략',
  university_score_policies: '대학 정책',
  target_university_profiles: '목표 대학',
  learning_habit_snapshots: '학습 습관',
};

function prettyEntity(entityType) {
  return ENTITY_LABELS[entityType] || entityType || '-';
}

function asText(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

// scope 객체를 한 줄 요약으로 변환
function describeScopeShort(scope) {
  if (!scope) return null;
  if (typeof scope === 'string') return scope;
  if (typeof scope !== 'object') return String(scope);
  const parts = [];
  if (Array.isArray(scope.student_ids) && scope.student_ids.length > 0) {
    parts.push(`학생 ${scope.student_ids.length}명`);
  }
  if (scope.affected_count != null) parts.push(`${scope.affected_count}명 처리`);
  if (scope.policy_id) parts.push(`정책 #${scope.policy_id}`);
  if (scope.exam_id) parts.push(`시험 #${scope.exam_id}`);
  if (scope.reason) parts.push(scope.reason);
  if (scope.trigger_reason) parts.push(scope.trigger_reason);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export default function AuditPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('logs');
  const [entityFilter, setEntityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, error } = useAsyncData(
    async () => {
      const [auditLogs, changeHistory, jobs] = await Promise.all([
        apiRequest('/audit-logs', { token }),
        apiRequest('/change-history', { token }),
        apiRequest('/recalculation-jobs', { token }),
      ]);
      return { auditLogs, changeHistory, jobs };
    },
    [token]
  );

  const entityOptions = useMemo(() => {
    if (!data) return [];
    const source =
      activeTab === 'logs'
        ? data.auditLogs
        : activeTab === 'changes'
        ? data.changeHistory
        : data.jobs;
    const set = new Set();
    (source || []).forEach((item) => item.entity_type && set.add(item.entity_type));
    return Array.from(set).sort();
  }, [data, activeTab]);

  const counts = useMemo(
    () => ({
      logs: data?.auditLogs?.length || 0,
      changes: data?.changeHistory?.length || 0,
      jobs: data?.jobs?.length || 0,
    }),
    [data]
  );

  const failedJobs = useMemo(
    () => (data?.jobs || []).filter((job) => job.status === 'failed'),
    [data]
  );

  const applyFilters = (rows) => {
    if (!rows) return [];
    const term = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      if (entityFilter !== 'all' && row.entity_type !== entityFilter) return false;
      if (!term) return true;
      return JSON.stringify(row).toLowerCase().includes(term);
    });
  };

  const auditLogs = applyFilters(data?.auditLogs);
  const changeHistory = applyFilters(data?.changeHistory);
  const jobs = applyFilters(data?.jobs);

  const activeMeta = TABS.find((tab) => tab.id === activeTab);

  return (
    <Layout title="감사 · 재계산 관리" backTo="/instructor" backLabel="대시보드로 돌아가기">
      <div className="toolbar-row">
        <div className="chip-list">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`secondary-button tab-button${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setEntityFilter('all');
              }}
            >
              {tab.label} ({counts[tab.id]})
            </button>
          ))}
        </div>
      </div>

      {failedJobs.length > 0 ? (
        <div className="error-box">
          실패한 재계산 작업이 <strong>{failedJobs.length}</strong>건 있습니다. 재계산 작업 탭에서 확인하세요.
        </div>
      ) : null}

      {loading ? <div className="empty-state">감사 로그를 불러오는 중입니다...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <SectionCard title={activeMeta?.label} subtitle={activeMeta?.subtitle}>
          <div className="audit-toolbar">
            <label className="audit-filter">
              분류
              <select
                value={entityFilter}
                onChange={(event) => setEntityFilter(event.target.value)}
              >
                <option value="all">전체</option>
                {entityOptions.map((entity) => (
                  <option key={entity} value={entity}>
                    {prettyEntity(entity)}
                  </option>
                ))}
              </select>
            </label>
            <label className="audit-filter grow">
              검색
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="키워드 검색 (분류 / 필드 / 범위)"
              />
            </label>
            <span className="muted small">최근 200건</span>
          </div>

          {/* 변경 감사 로그 탭 */}
          {activeTab === 'logs' ? (
            <div className="audit-log-list">
              {auditLogs.length === 0 ? (
                <div className="empty-state">표시할 감사 로그가 없습니다.</div>
              ) : null}
              {auditLogs.map((log) => (
                <div className="audit-log-row" key={log.id}>
                  <div className="audit-log-header">
                    <div className="audit-log-header-left">
                      <strong>{prettyEntity(log.entity_type)}</strong>
                      {log.entity_id != null ? (
                        <span className="audit-entity-id">#{log.entity_id}</span>
                      ) : null}
                      <span
                        className={`status-badge ${actionTone(log.action) || ''}`}
                        title={log.action}
                      >
                        {formatAction(log.action)}
                      </span>
                    </div>
                    <span className="muted small">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.payload && Object.keys(log.payload).length > 0 ? (
                    <details className="audit-log-payload">
                      <summary className="small muted">세부 내용 보기</summary>
                      <pre>{asText(log.payload)}</pre>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* 필드 변경 이력 탭 */}
          {activeTab === 'changes' ? (
            <div className="audit-change-list">
              {changeHistory.length === 0 ? (
                <div className="empty-state">표시할 변경 이력이 없습니다.</div>
              ) : null}
              {changeHistory.map((item) => (
                <div className="audit-change-row" key={item.id}>
                  <div className="audit-log-header">
                    <div className="audit-log-header-left">
                      <strong>{prettyEntity(item.entity_type)}</strong>
                      <span className="audit-entity-id">#{item.entity_id}</span>
                      <span className="chip-item small">{item.field_name}</span>
                    </div>
                    <span className="muted small">
                      {new Date(item.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="diff-box">
                    <div>
                      <span className="diff-label before">변경 전</span>
                      <pre>{asText(item.old_value)}</pre>
                    </div>
                    <div>
                      <span className="diff-label after">변경 후</span>
                      <pre>{asText(item.new_value)}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* 재계산 작업 탭 */}
          {activeTab === 'jobs' ? (
            <div className="audit-job-list">
              {jobs.length === 0 ? (
                <div className="empty-state">재계산 작업이 없습니다.</div>
              ) : null}
              {jobs.map((job) => {
                const scopeSummary = describeScopeShort(job.scope);
                return (
                  <div
                    className={`audit-job-row${job.status === 'failed' ? ' failed' : ''}`}
                    key={job.id}
                  >
                    <div className="audit-log-header">
                      <div className="audit-job-header-left">
                        <StatusBadge status={job.trigger} />
                        <span className="muted small">
                          {prettyEntity(job.entity_type)}
                          {job.entity_id != null ? ` #${job.entity_id}` : ''}
                        </span>
                        {scopeSummary ? (
                          <span className="audit-scope-summary">{scopeSummary}</span>
                        ) : null}
                      </div>
                      <div className="audit-log-header-right">
                        <StatusBadge status={job.status} />
                        <span className="muted small">
                          {new Date(job.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {job.executed_at ? (
                      <div className="muted small">
                        실행: {new Date(job.executed_at).toLocaleString()}
                      </div>
                    ) : (
                      <div className="muted small">아직 실행되지 않음</div>
                    )}
                    <div className="audit-job-body">
                      {job.scope && !scopeSummary ? (
                        <details>
                          <summary className="small muted">범위 (scope)</summary>
                          <pre>{asText(job.scope)}</pre>
                        </details>
                      ) : null}
                      {job.details ? (
                        <details>
                          <summary className="small muted">상세 내용 (details)</summary>
                          <pre>{asText(job.details)}</pre>
                        </details>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </Layout>
  );
}
