// 플래너 재생성 후 before/after 요약을 보여주는 카드
export default function PlannerDiffSummary({ summary, onDismiss }) {
  if (!summary) return null;

  const {
    changed,
    reason,
    moved_items_count,
    rebalanced_minutes,
    preserved_completed,
    highlights = [],
  } = summary;

  if (!changed) {
    return (
      <div className="planner-diff-card planner-diff-unchanged">
        <div className="planner-diff-header">
          <span className="planner-diff-icon">✓</span>
          <strong>변경 없음</strong>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          현재 계획이 최적이야. 그대로 진행해봐.
        </p>
        {onDismiss ? (
          <button type="button" className="secondary-button compact" onClick={onDismiss} style={{ marginTop: '0.5rem' }}>
            닫기
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="planner-diff-card">
      <div className="planner-diff-header">
        <span className="planner-diff-icon">↻</span>
        <strong>계획이 바뀌었어</strong>
        {onDismiss ? (
          <button type="button" className="secondary-button compact" onClick={onDismiss}>
            닫기
          </button>
        ) : null}
      </div>

      {reason ? (
        <p className="planner-diff-reason">{reason}</p>
      ) : null}

      <div className="planner-diff-stats">
        {moved_items_count != null ? (
          <div className="planner-diff-stat">
            <span className="planner-diff-stat-val">{moved_items_count}개</span>
            <span className="muted small">항목 재배치</span>
          </div>
        ) : null}
        {rebalanced_minutes != null ? (
          <div className="planner-diff-stat">
            <span className="planner-diff-stat-val">{Math.round(rebalanced_minutes / 60 * 10) / 10}시간</span>
            <span className="muted small">시간 재분배</span>
          </div>
        ) : null}
        {preserved_completed != null ? (
          <div className="planner-diff-stat">
            <span className="planner-diff-stat-val">{preserved_completed ? '유지' : '초기화'}</span>
            <span className="muted small">완료 항목</span>
          </div>
        ) : null}
      </div>

      {highlights.length > 0 ? (
        <ul className="planner-diff-highlights">
          {highlights.map((h, i) => (
            <li key={i}>{typeof h === 'string' ? h : h.text || JSON.stringify(h)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
