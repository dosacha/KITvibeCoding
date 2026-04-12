import StatusBadge from './StatusBadge.jsx';

// 한 variant 에 대한 비교 카드.
// props:
//   variant: { id, variant, status, natural_language_summary, structured_plan, rationale,
//              risk_factors, instructor_explanation, student_coaching, generated_at,
//              is_approved, is_student_visible }
//   onSelect()    : 강사가 이 variant 를 검토 대상으로 채택할 때 호출
//   isSelected    : 우측 검토 폼이 이 variant 를 가리키고 있을 때 true

const VARIANT_LABEL = {
  basic: '기본형 (basic)',
  conservative: '보수형 (conservative)',
};

function formatHours(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return `${value}h`;
  return String(value);
}

// weekly_time_allocation 두 가지 shape 처리:
//   배열: [{subject_name, hours, focus}]
//   객체: {focus_hours, review_hours, mock_hours, notes}
function WeeklyAllocationSection({ weekly }) {
  if (!weekly) {
    return <p className="muted small">시간 배분 정보가 없습니다.</p>;
  }

  if (Array.isArray(weekly)) {
    if (weekly.length === 0) return <p className="muted small">시간 배분 정보가 없습니다.</p>;
    return (
      <table className="weekly-table">
        <thead>
          <tr>
            <th>과목</th>
            <th>시간</th>
            <th>중점</th>
          </tr>
        </thead>
        <tbody>
          {weekly.map((item, index) => (
            <tr key={`${item?.subject_name ?? index}`}>
              <td>{item?.subject_name || '-'}</td>
              <td>{formatHours(item?.hours)}</td>
              <td className="small muted">{item?.focus || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // Object shape
  const hasAny =
    weekly.focus_hours != null || weekly.review_hours != null || weekly.mock_hours != null;
  if (!hasAny) return <p className="muted small">시간 배분 정보가 없습니다.</p>;

  return (
    <ul className="kv-list">
      {weekly.focus_hours != null ? (
        <li>
          <span>핵심 보강</span>
          <span>{formatHours(weekly.focus_hours)}</span>
        </li>
      ) : null}
      {weekly.review_hours != null ? (
        <li>
          <span>복습</span>
          <span>{formatHours(weekly.review_hours)}</span>
        </li>
      ) : null}
      {weekly.mock_hours != null ? (
        <li>
          <span>모의 시험</span>
          <span>{formatHours(weekly.mock_hours)}</span>
        </li>
      ) : null}
      {weekly.notes ? (
        <li>
          <span>비고</span>
          <span>{weekly.notes}</span>
        </li>
      ) : null}
    </ul>
  );
}

function renderTextOrObject(item, index, fallbackPrefix = '항목') {
  if (!item) return null;
  if (typeof item === 'string') return <li key={index}>{item}</li>;
  const label = item.label || item.signal || item.type || item.message || `${fallbackPrefix} ${index + 1}`;
  const detail = item.detail || item.reason || item.message;
  // label과 detail이 같으면 하나만 보여준다
  const showDetail = detail && detail !== label;
  return (
    <li key={index} className="study-method-item">
      <strong>{label}</strong>
      {showDetail ? <span className="study-method-detail">{detail}</span> : null}
    </li>
  );
}

export default function StrategyCompareCard({ variant, onSelect, isSelected }) {
  if (!variant) return null;
  const plan = variant.structured_plan || {};
  const weekly = plan.weekly_time_allocation;
  const unitOrder = plan.unit_study_order || [];
  const studyMethods = plan.study_methods || [];
  const nextCheckIn = plan.next_check_in || {};
  const planRiskFactors = plan.risk_factors || [];
  const topRiskFactors = variant.risk_factors || [];
  const allRisks = [...topRiskFactors, ...planRiskFactors];

  return (
    <div className={`strategy-card${isSelected ? ' selected' : ''}`}>
      <div className="strategy-card-header">
        <div>
          <div className="strategy-card-title">
            <strong>{VARIANT_LABEL[variant.variant] || variant.variant}</strong>
            <StatusBadge status={variant.status} />
            {variant.is_approved ? <span className="status-badge approved">승인본</span> : null}
            {variant.is_student_visible ? (
              <span className="status-badge student-visible">학생 노출</span>
            ) : null}
          </div>
          <div className="muted small" style={{ marginTop: '0.2rem' }}>
            생성: {new Date(variant.generated_at).toLocaleString()}
          </div>
        </div>
        {onSelect ? (
          <button
            type="button"
            className={`secondary-button compact${isSelected ? ' active' : ''}`}
            onClick={onSelect}
          >
            {isSelected ? '검토 대상 ✓' : '검토 채택'}
          </button>
        ) : null}
      </div>

      {/* 자연어 요약 */}
      <section className="strategy-section">
        <div className="strategy-section-label">전략 요약</div>
        <p className="strategy-summary">{variant.natural_language_summary || '-'}</p>
      </section>

      {/* 주간 시간 배분 — 배열/객체 모두 처리 */}
      <section className="strategy-section">
        <div className="strategy-section-label">주간 시간 배분</div>
        <WeeklyAllocationSection weekly={weekly} />
      </section>

      {/* 단원 학습 순서 */}
      <section className="strategy-section">
        <div className="strategy-section-label">단원 학습 순서</div>
        {unitOrder.length === 0 ? (
          <p className="muted small">지정된 순서가 없습니다.</p>
        ) : (
          <ol className="ordered-units">
            {unitOrder.map((entry, index) => (
              <li key={index}>
                {typeof entry === 'string'
                  ? entry
                  : entry?.unit_name || entry?.unit || entry?.label || `단원 ${index + 1}`}
                {entry?.reason ? <div className="small muted">{entry.reason}</div> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 학습 방법 */}
      <section className="strategy-section">
        <div className="strategy-section-label">추천 학습 방법</div>
        {studyMethods.length === 0 ? (
          <p className="muted small">지정된 방법이 없습니다.</p>
        ) : (
          <ul className="bullet-list">
            {studyMethods.map((method, index) => renderTextOrObject(method, index, '방법'))}
          </ul>
        )}
      </section>

      {/* 근거 */}
      <section className="strategy-section">
        <div className="strategy-section-label">진단 근거</div>
        {(variant.rationale || []).length === 0 ? (
          <p className="muted small">제공된 근거가 없습니다.</p>
        ) : (
          <ul className="bullet-list">
            {variant.rationale.map((entry, index) => renderTextOrObject(entry, index, '근거'))}
          </ul>
        )}
      </section>

      {/* 위험 요인 */}
      <section className="strategy-section">
        <div className="strategy-section-label">주의 요인</div>
        {allRisks.length === 0 ? (
          <p className="muted small">특별한 위험 요인이 없습니다.</p>
        ) : (
          <ul className="bullet-list">
            {allRisks.map((risk, index) => renderTextOrObject(risk, index, '요인'))}
          </ul>
        )}
      </section>

      {/* 강사 설명 / 학생 코칭 */}
      <section className="strategy-section split-pair">
        <div>
          <div className="strategy-section-label">강사 설명</div>
          <p className="small">{variant.instructor_explanation || '-'}</p>
        </div>
        <div>
          <div className="strategy-section-label">학생 코칭 메시지</div>
          <p className="small">{variant.student_coaching || '-'}</p>
        </div>
      </section>

      {/* 다음 점검 일정 */}
      <section className="strategy-section">
        <div className="strategy-section-label">다음 점검 일정</div>
        <p className="small">
          {nextCheckIn.date || '미설정'}
          {nextCheckIn.days != null ? ` (${nextCheckIn.days}일 후)` : ''}
          {nextCheckIn.note || nextCheckIn.reason
            ? ` · ${nextCheckIn.note || nextCheckIn.reason}`
            : ''}
        </p>
      </section>
    </div>
  );
}
