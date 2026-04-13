// FE-103: 목표대학 gap 맵
// primaryGoal + weakSubjects(진단 기반 fallback) + goalGaps(신규 API, optional) 조합으로 동작한다.

import { Link } from 'react-router-dom';
import { gapBandLabel } from '../lib/studentLabels.js';

const GAP_BAND_VARIANT = {
  reach: 'reach',
  match: 'match',
  safety: 'safety',
};

// gap이 클수록 바가 길다. maxGap 기준으로 퍼센트 계산.
function GapBar({ gapScore }) {
  if (gapScore == null) return null;
  const MAX_GAP = 25;
  const pct = Math.min(100, Math.max(4, (gapScore / MAX_GAP) * 100));
  const tone =
    gapScore <= 0 ? 'gap-fill-good' : gapScore <= 5 ? 'gap-fill-low' : gapScore <= 12 ? 'gap-fill-mid' : 'gap-fill-high';
  return (
    <div className="gap-bar-track">
      <div className={`gap-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function GoalGapMap({ primaryGoal, weakSubjects, goalGaps }) {
  const hasGoal = !!primaryGoal;
  // goalGaps는 신규 API에서 오는 상세 데이터. 없으면 weakSubjects로 fallback.
  const subjects = goalGaps?.subjects || weakSubjects || [];
  const gapBand = goalGaps?.gap_band || primaryGoal?.gap_band;
  const trendNote = goalGaps?.trend_note;

  if (!hasGoal && subjects.length === 0) {
    return (
      <div className="empty-state">
        <p style={{ margin: '0 0 0.75rem' }}>목표대학을 설정하면 과목별 차이를 분석해 드립니다.</p>
        <Link to="/student/diagnosis">목표 설정하러 가기 →</Link>
      </div>
    );
  }

  // gap_score 기준 내림차순 정렬 (클수록 먼저)
  const sorted = [...subjects].sort((a, b) => (b.gap_score ?? 0) - (a.gap_score ?? 0));
  const topSubject = sorted.find((s) => (s.gap_score ?? 0) > 0) || sorted[0];

  return (
    <div className="goal-gap-map">
      {/* 대학/학과 + gap band */}
      {hasGoal ? (
        <div className="goal-gap-header">
          <div className="goal-gap-univ">
            <strong>{primaryGoal.university_name}</strong>
            {primaryGoal.target_department ? (
              <span className="muted small"> · {primaryGoal.target_department}</span>
            ) : null}
          </div>
          {gapBand ? (
            <span className={`gap-band-badge gap-band-${GAP_BAND_VARIANT[gapBand] || 'match'}`}>
              {gapBandLabel(gapBand)}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 가장 먼저 올릴 과목 callout */}
      {topSubject ? (
        <div className="info-box goal-gap-callout">
          <span className="section-micro-label">먼저 올릴 과목</span>
          <span className="goal-gap-top-subject">{topSubject.subject_name}</span>
          {topSubject.gap_score != null && topSubject.gap_score > 0 ? (
            <span className="muted small"> · 목표까지 {topSubject.gap_score}점</span>
          ) : null}
        </div>
      ) : null}

      {/* 과목별 gap 바 */}
      {sorted.length > 0 ? (
        <div className="gap-subject-list">
          {sorted.map((subject, i) => (
            <div key={subject.subject_code || subject.subject_name || i} className="gap-subject-row">
              <div className="gap-subject-meta">
                <span className="gap-subject-name">{subject.subject_name}</span>
                <div className="gap-subject-right">
                  {subject.gap_score != null ? (
                    <span className={`gap-score-label ${subject.gap_score <= 0 ? 'gap-score-ok' : 'muted small'}`}>
                      {subject.gap_score <= 0 ? '목표 도달' : `−${subject.gap_score}점`}
                    </span>
                  ) : null}
                  {subject.stability != null ? (
                    <span className="muted small">안정도 {subject.stability}</span>
                  ) : null}
                </div>
              </div>
              <GapBar gapScore={subject.gap_score} />
            </div>
          ))}
        </div>
      ) : null}

      {/* 트렌드 메모 */}
      {trendNote ? (
        <p className="muted small goal-gap-trend">{trendNote}</p>
      ) : null}
    </div>
  );
}
