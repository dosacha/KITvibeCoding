// 학생 홈 — /frontend/student/home API 기반
// 오늘 핵심 할 일 편집 + LLM 추천 + 목표대학 gap + 전략 상태

import { useState } from 'react';
import { Link } from 'react-router-dom';
import GoalEditorModal from '../components/GoalEditorModal.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TodayFocusEditor from '../components/TodayFocusEditor.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { formatNumber } from '../lib/studentLabels.js';

const APPROVAL_LABEL = {
  student_draft: '내 초안',
  submitted_for_review: '검토 요청 중',
  coach_revision_requested: '강사 수정 요청',
  coach_approved: '강사 승인',
};

const APPROVAL_STATUS = {
  student_draft: 'draft',
  submitted_for_review: 'pending_review',
  coach_revision_requested: 'held',
  coach_approved: 'approved',
};

const SOURCE_LABEL = {
  student_workspace: '내 초안',
  coach_approved: '강사 승인본',
  ai_basic: 'AI 기본안',
  ai_conservative: 'AI 보수안',
};

// 수시/정시 방향 카드
function AdmissionDirectionCard({ direction }) {
  if (!direction) {
    return (
      <p className="muted small">
        진단을 완료하면 수시·정시 방향을 분석해줄게.{' '}
        <Link to="/student/diagnosis">진단하러 가기 →</Link>
      </p>
    );
  }

  const { recommended, reason, susi_ratio, jeongsi_ratio } = direction;

  return (
    <div className="stack-gap">
      <div className="direction-highlight">
        <span className="direction-tag">
          {recommended === 'susi' ? '수시 우선' : recommended === 'jeongsi' ? '정시 우선' : '균형 전략'}
        </span>
        {reason ? <p className="muted small" style={{ margin: '0.3rem 0 0' }}>{reason}</p> : null}
      </div>
      {(susi_ratio != null || jeongsi_ratio != null) ? (
        <div className="direction-ratio-row">
          <div className="direction-ratio-item">
            <span className="muted small">수시</span>
            <strong>{susi_ratio != null ? `${Math.round(susi_ratio * 100)}%` : '—'}</strong>
          </div>
          <div className="direction-ratio-sep">vs</div>
          <div className="direction-ratio-item">
            <span className="muted small">정시</span>
            <strong>{jeongsi_ratio != null ? `${Math.round(jeongsi_ratio * 100)}%` : '—'}</strong>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// 목표대학 gap 카드 (inline)
function GoalGapCard({ goalGap, onEditGoal }) {
  if (!goalGap) {
    return (
      <div className="stack-gap">
        <p className="muted small">목표대학을 설정하면 gap을 분석해줄게.</p>
        <button type="button" className="secondary-button compact" onClick={onEditGoal}>
          목표대학 설정하기
        </button>
      </div>
    );
  }

  const gaps = Array.isArray(goalGap) ? goalGap : [goalGap];

  return (
    <div className="stack-gap">
      {gaps.slice(0, 3).map((g, i) => {
        const totalGap = g.total_gap ?? g.gap ?? 0;
        const gapAbs = Math.abs(totalGap);
        const isPositive = totalGap <= 0; // gap이 0 이하면 초과달성

        return (
          <div key={i} className="goal-gap-row">
            <div className="goal-gap-info">
              <strong>{g.university_name || g.goal_label || `목표 ${i + 1}`}</strong>
              {g.admission_type ? <span className="muted small"> · {g.admission_type}</span> : null}
            </div>
            <div className={`goal-gap-value${isPositive ? ' positive' : ' negative'}`}>
              {isPositive ? '목표 달성권' : `${formatNumber(gapAbs, 1)}점 부족`}
            </div>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" className="secondary-button compact" onClick={onEditGoal}>
          목표 변경
        </button>
        <Link to="/student/simulator" className="secondary-button compact">
          시뮬레이션 해보기 →
        </Link>
      </div>
    </div>
  );
}

// 현재 전략 상태 카드
function CurrentStrategyCard({ strategy, coachApproved }) {
  if (!strategy && !coachApproved) {
    return (
      <p className="muted small">
        아직 전략이 없어.{' '}
        <Link to="/student/strategy-workspace">전략 설계실 →</Link>
      </p>
    );
  }

  const s = strategy || {};
  const approvalStatus = s.approval_status;
  const source = s.source;

  return (
    <div className="stack-gap">
      <div className="current-strategy-header">
        <div>
          <span className="muted small">{SOURCE_LABEL[source] || source || '전략'}</span>
          {approvalStatus ? (
            <StatusBadge
              status={APPROVAL_STATUS[approvalStatus] || approvalStatus}
              label={APPROVAL_LABEL[approvalStatus] || approvalStatus}
            />
          ) : null}
        </div>
      </div>

      {s.summary ? (
        <p style={{ margin: 0, lineHeight: 1.6 }}>{s.summary}</p>
      ) : null}

      {coachApproved && coachApproved.approved_at ? (
        <p className="muted small" style={{ margin: 0 }}>
          강사 승인:{' '}
          {new Date(coachApproved.approved_at).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to="/student/strategy-workspace" className="secondary-button compact">
          전략 설계실 →
        </Link>
        <Link to="/student/planner" className="secondary-button compact">
          주간 플래너 →
        </Link>
      </div>
    </div>
  );
}

// 저신뢰 보완 액션 목록
function LowConfidenceActions({ actions = [] }) {
  if (!actions.length) return null;
  return (
    <ul className="bullet-list">
      {actions.map((action, i) => (
        <li key={i}>
          {typeof action === 'string' ? action : action.label || action.text || JSON.stringify(action)}
        </li>
      ))}
    </ul>
  );
}

export default function StudentDashboardPage() {
  const { user, token } = useAuth();
  const [showGoalEditor, setShowGoalEditor] = useState(false);

  const { data, loading, error, reload } = useAsyncData(
    () => apiRequest('/frontend/student/home', { token }),
    [token]
  );

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  const strategy = data?.student_visible_strategy;
  const approvalStatus = strategy?.approval_status;

  return (
    <Layout title="내 학습 홈">
      {loading ? <div className="empty-state">준비 중...</div> : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 인사말 — full width */}
          <div className="student-greeting">
            <div>
              <h3 className="greeting-name">
                {user?.full_name ? `${user.full_name}님` : '안녕하세요'}
              </h3>
              <p className="greeting-date muted small">{today}</p>
            </div>
            <div className="greeting-status">
              {approvalStatus ? (
                <StatusBadge
                  status={APPROVAL_STATUS[approvalStatus] || approvalStatus}
                  label={APPROVAL_LABEL[approvalStatus] || approvalStatus}
                />
              ) : (
                <StatusBadge status="draft" label="전략 초안" />
              )}
            </div>
          </div>

          {/* Row 1: 오늘 할 일(넓게) + 지원 방향(좁게) */}
          <div className="page-row r-7-5">
            <SectionCard
              title="오늘 핵심 할 일"
              subtitle="직접 수정하거나 AI 추천 받기"
            >
              <TodayFocusEditor
                items={data.today_focus_items || []}
                token={token}
                onSaved={reload}
              />
            </SectionCard>

            <SectionCard
              title="지원 방향"
              subtitle="수시 / 정시 전략 확인"
            >
              <AdmissionDirectionCard direction={data.admission_direction} />
            </SectionCard>
          </div>

          {/* Row 2: 목표대학 gap(넓게) + 현재 전략(좁게) */}
          <div className="page-row r-7-5">
            <SectionCard
              title="목표 대학까지 거리"
              subtitle="gap이 줄수록 목표에 가까워짐"
            >
              <GoalGapCard
                goalGap={data.goal_gap}
                onEditGoal={() => setShowGoalEditor(true)}
              />
            </SectionCard>

            <SectionCard
              title="현재 전략"
              subtitle={
                approvalStatus === 'coach_approved'
                  ? '강사 승인본'
                  : '내 초안 · 검토 요청 가능'
              }
            >
              <CurrentStrategyCard
                strategy={data.student_visible_strategy}
                coachApproved={data.coach_approved_strategy}
              />
            </SectionCard>
          </div>

          {/* 저신뢰 CTA — full width (데이터 있을 때만) */}
          {data.low_confidence_actions?.length > 0 ? (
            <SectionCard
              title="진단 정확도 높이기"
              subtitle="아래 항목을 채우면 더 정확한 전략이 나와"
            >
              <LowConfidenceActions actions={data.low_confidence_actions} />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {showGoalEditor ? (
        <GoalEditorModal
          token={token}
          onClose={() => setShowGoalEditor(false)}
          onSaved={reload}
        />
      ) : null}
    </Layout>
  );
}
