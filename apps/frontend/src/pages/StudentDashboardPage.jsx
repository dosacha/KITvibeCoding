// FE-101: 학생 홈 v2
// 로그인 후 10초 안에 "이번 주에 뭘 해야 하는지" 이해할 수 있도록 재구성.
// 현재 전략 + 목표 gap + 다음 행동이 한 화면에 보인다.

import { Link } from 'react-router-dom';
import ConfidenceChecklist from '../components/ConfidenceChecklist.jsx';
import DirectionCard from '../components/DirectionCard.jsx';
import GoalGapMap from '../components/GoalGapMap.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAsyncData } from '../hooks/useAsyncData.js';
import { apiRequest } from '../lib/api.js';
import { weaknessLabel } from '../lib/studentLabels.js';

// 전략에서 오늘의 핵심 할 일 3개를 도출한다.
function TodayTasks({ strategy, diagnosis }) {
  const tasks = [];

  // 1순위: 단원 학습 순서 첫 항목
  if (strategy?.plan?.unit_study_order?.length > 0) {
    const top = strategy.plan.unit_study_order[0];
    const label =
      typeof top === 'string'
        ? top
        : [top.subject_name, top.unit_name || top.label].filter(Boolean).join(' · ');
    if (label) tasks.push({ text: `${label} 집중 학습`, type: 'study' });
  }

  // 2순위: 취약 유형 보완 세션
  if (diagnosis?.primary_weakness_type) {
    tasks.push({
      text: `${weaknessLabel(diagnosis.primary_weakness_type)} 보완 세션`,
      type: 'weakness',
    });
  }

  // 3순위: 다음 점검일 준비
  if (strategy?.plan?.next_check_in?.date) {
    tasks.push({
      text: `점검일(${strategy.plan.next_check_in.date}) 준비 — 진도 체크`,
      type: 'checkin',
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="muted">
        전략이 승인되면 오늘의 할 일이 여기에 표시됩니다.{' '}
        <Link to="/student/strategy-workspace">전략 설계실 →</Link>
      </p>
    );
  }

  return (
    <ol className="today-tasks">
      {tasks.slice(0, 3).map((task, i) => (
        <li key={i} className={`today-task-item today-task-${task.type}`}>
          <span className="today-task-num">{i + 1}</span>
          <span>{task.text}</span>
        </li>
      ))}
    </ol>
  );
}

// 이번 주 전략 요약 — 승인된 전략 기반
function WeeklySummary({ strategy, reviewNotice }) {
  if (!strategy) {
    return (
      <p className="muted">
        {reviewNotice || '강사가 전략을 검토 중입니다. 승인 후 이 화면에서 확인할 수 있습니다.'}
        {' '}
        <Link to="/student/strategy-workspace">전략 설계실 →</Link>
      </p>
    );
  }

  const plan = strategy.plan;
  const alloc = plan?.weekly_time_allocation;
  const checkIn = plan?.next_check_in;

  return (
    <div className="stack-gap">
      {strategy.summary ? (
        <p style={{ lineHeight: 1.65, margin: 0 }}>{strategy.summary}</p>
      ) : null}

      <div className="split-grid">
        {/* 주간 배분 */}
        {Array.isArray(alloc) && alloc.length > 0 ? (
          <div>
            <p className="section-micro-label">주간 배분</p>
            <ul className="bullet-list">
              {alloc.slice(0, 4).map((item, i) => (
                <li key={i}>
                  {typeof item === 'string'
                    ? item
                    : `${item.subject_name || '과목'}: ${item.hours != null ? `${item.hours}시간` : '-'}${item.focus ? ` · ${item.focus}` : ''}`}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 다음 점검 일정 */}
        {checkIn ? (
          <div>
            <p className="section-micro-label">다음 점검 일정</p>
            <p style={{ margin: 0, fontWeight: 600 }}>
              {checkIn.date || '미정'}
              {checkIn.days != null ? (
                <span className="muted small" style={{ fontWeight: 400 }}>
                  {' '}({checkIn.days}일 후)
                </span>
              ) : null}
            </p>
            {checkIn.reason || checkIn.note ? (
              <p className="muted small" style={{ margin: '0.2rem 0 0' }}>
                {checkIn.reason || checkIn.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 강사 코칭 메시지 */}
      {strategy.student_coaching || plan?.student_message ? (
        <div className="info-box">
          <strong>강사 코칭</strong>
          <p style={{ marginTop: '0.3rem', marginBottom: 0 }}>
            {strategy.student_coaching || plan.student_message}
          </p>
        </div>
      ) : null}

      <div className="weekly-summary-actions">
        <Link to="/student/strategy-workspace" className="secondary-button compact">
          전략 상세 보기
        </Link>
        <Link to="/student/planner" className="secondary-button compact">
          주간 플래너 →
        </Link>
      </div>
    </div>
  );
}

// 성장 한 줄 요약 — growth API가 없으면 diagnosis 기반으로 간단히 표시
function GrowthOneLiner({ growth, diagnosis }) {
  if (growth?.summary) {
    return <p className="growth-one-liner">{growth.summary}</p>;
  }
  if (diagnosis?.primary_weakness_type) {
    const label = weaknessLabel(diagnosis.primary_weakness_type);
    return (
      <p className="growth-one-liner muted">
        현재 집중 개선 영역: <strong>{label}</strong>
        {' '}— 꾸준히 이어가면 다음 점검에서 변화를 확인할 수 있습니다.
      </p>
    );
  }
  return (
    <p className="muted">성장 데이터가 쌓이면 여기에 표시됩니다.</p>
  );
}

export default function StudentDashboardPage() {
  const { user, token } = useAuth();
  const { data, loading, error } = useAsyncData(
    async () => (await apiRequest('/frontend/dashboard/student', { token })).data,
    [token]
  );

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <Layout title="내 학습 홈">
      {loading ? (
        <div className="empty-state">맞춤 전략을 준비하는 중입니다...</div>
      ) : null}
      {error ? <div className="error-box">{error}</div> : null}

      {data ? (
        <>
          {/* 인사말 */}
          <div className="student-greeting">
            <div>
              <h3 className="greeting-name">
                {user?.full_name ? `안녕하세요, ${user.full_name}님` : '안녕하세요'}
              </h3>
              <p className="greeting-date muted small">{today}</p>
            </div>
            <div className="greeting-status">
              {data.approved_strategy ? (
                <StatusBadge status="approved" label="전략 승인됨" />
              ) : (
                <StatusBadge status="pending_review" label="전략 검토 중" />
              )}
            </div>
          </div>

          {/* 오늘의 핵심 할 일 */}
          <SectionCard
            title="오늘의 핵심 할 일"
            subtitle="승인된 전략에서 도출한 오늘 집중 항목입니다."
          >
            <TodayTasks
              strategy={data.approved_strategy}
              diagnosis={data.diagnosis}
            />
          </SectionCard>

          {/* 수시·정시 방향성 */}
          <SectionCard
            title="수시·정시 방향"
            subtitle="현재 성적과 목표를 바탕으로 분석한 방향입니다."
          >
            <DirectionCard direction={data.direction} />
          </SectionCard>

          {/* 목표대학 gap 맵 */}
          <SectionCard
            title="목표대학 gap"
            subtitle="목표대학까지 과목별로 얼마나 부족한지 확인하세요."
            actions={
              data.primary_goal ? (
                <Link to="/student/diagnosis" className="secondary-button compact">
                  자세히 보기
                </Link>
              ) : null
            }
          >
            <GoalGapMap
              primaryGoal={data.primary_goal}
              weakSubjects={data.diagnosis?.weak_subjects}
              goalGaps={data.goal_gaps}
            />
          </SectionCard>

          {/* 이번 주 전략 요약 */}
          <SectionCard
            title="이번 주 전략"
            subtitle="강사가 승인한 주간 학습 전략입니다."
          >
            <WeeklySummary
              strategy={data.approved_strategy}
              reviewNotice={data.review_notice}
            />
          </SectionCard>

          {/* 최근 성장 한 줄 요약 */}
          <SectionCard
            title="최근 성장"
            subtitle="나의 성장 흐름을 한눈에 확인하세요."
            actions={
              <Link to="/student/growth" className="secondary-button compact">
                성장 리포트 →
              </Link>
            }
          >
            <GrowthOneLiner
              growth={data.growth}
              diagnosis={data.diagnosis}
            />
          </SectionCard>

          {/* 저신뢰 진단 보완 CTA */}
          {data.diagnosis?.low_confidence_flag ? (
            <SectionCard
              title="진단 정확도 높이기"
              subtitle="아래 항목을 채우면 더 정확한 전략을 받을 수 있습니다."
            >
              <ConfidenceChecklist
                missingInputs={data.missing_inputs}
                studentData={data}
              />
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Layout>
  );
}
