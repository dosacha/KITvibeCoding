const LABELS = {
  submitted: '제출',
  absent: '결시',
  unanswered: '무응답',
  not_entered: '미입력',
  draft: '초안',
  pending_review: '검토 대기',
  approved: '승인',
  held: '보류',
  archived: '보관',
  queued: '대기',
  processing: '진행 중',
  completed: '완료',
  failed: '실패',
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
