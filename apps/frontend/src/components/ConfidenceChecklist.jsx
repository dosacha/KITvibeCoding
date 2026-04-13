// FE-104: 저신뢰 진단 보완 CTA
// missingInputs(신규 API) 또는 studentData(기존 dashboard 데이터)로 부족 항목을 판별한다.

import { Link } from 'react-router-dom';

const CHECKLIST_ITEMS = [
  {
    key: 'has_recent_exam',
    label: '최근 시험 결과',
    desc: '모의고사 또는 내신 결과를 입력하면 진단 정확도가 높아집니다.',
    link: '/student/diagnosis',
    linkLabel: '시험 결과 입력',
  },
  {
    key: 'has_study_habits',
    label: '학습 습관 정보',
    desc: '현재 공부 방식을 알려주면 나에게 맞는 전략이 만들어집니다.',
    link: '/student/diagnosis',
    linkLabel: '학습 습관 입력',
  },
  {
    key: 'has_goal',
    label: '목표대학 설정',
    desc: '목표가 없으면 gap 분석을 할 수 없습니다.',
    link: '/student/diagnosis',
    linkLabel: '목표대학 설정',
  },
  {
    key: 'has_available_hours',
    label: '주당 가용 시간',
    desc: '공부 가능한 시간을 알아야 주간 계획을 짤 수 있습니다.',
    link: '/student/diagnosis',
    linkLabel: '가용 시간 입력',
  },
];

function isMissing(key, missingInputs, studentData) {
  // 신규 API가 missing_inputs 배열을 내려주면 그걸 우선 사용
  if (missingInputs != null) return missingInputs.includes(key);
  // fallback: 기존 dashboard data로 추론
  if (key === 'has_goal') return !studentData?.primary_goal;
  if (key === 'has_available_hours') {
    const hours = studentData?.student?.weekly_available_hours;
    return hours == null || hours === 0;
  }
  // 나머지는 API 없이 판별 불가 → 숨김
  return false;
}

export default function ConfidenceChecklist({ missingInputs, studentData }) {
  const missingItems = CHECKLIST_ITEMS.filter((item) =>
    isMissing(item.key, missingInputs, studentData)
  );

  if (missingItems.length === 0) return null;

  return (
    <div className="confidence-checklist">
      <div className="confidence-header">
        <strong>보완이 필요한 항목</strong>
        <span className="confidence-count muted small">{missingItems.length}개</span>
      </div>
      <ul className="confidence-items">
        {missingItems.map((item) => (
          <li key={item.key} className="confidence-item">
            <span className="confidence-dot" aria-hidden="true" />
            <div className="confidence-item-body">
              <strong>{item.label}</strong>
              <span className="muted small">{item.desc}</span>
            </div>
            <Link to={item.link} className="confidence-cta-link">
              {item.linkLabel} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
