// 작은 표시용 배지. status 키에 맞춰 색을 styles.css 의 .status-badge.<key> 로 매핑한다.
// 운영 입력 UI / 전략 검토 / 감사 로그 화면에서 공통으로 쓴다.

const LABELS = {
  // SubmissionStatus
  submitted: '제출',
  absent: '결시',
  unanswered: '무응답',
  not_entered: '미입력',
  // StrategyStatus
  draft: '초안',
  pending_review: '검토 대기',
  approved: '승인',
  held: '보류',
  archived: '보관',
  // RecalculationTrigger
  result_changed: '결과 변경',
  policy_changed: '정책 변경',
  question_tag_changed: '문항 태그 변경',
  manual: '수동',
  // RecalculationStatus
  queued: '대기',
  processing: '진행중',
  completed: '완료',
  failed: '실패',
  // Role
  admin: '관리자',
  instructor: '강사',
  student: '학생',
};

export default function StatusBadge({ status, label, tone }) {
  if (!status && !label) return null;
  const key = status || '';
  const text = label || LABELS[key] || key || '-';
  const className = `status-badge${key ? ` ${key}` : ''}${tone ? ` tone-${tone}` : ''}`;
  return <span className={className}>{text}</span>;
}
