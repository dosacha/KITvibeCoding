export const WEAKNESS_TYPE_LABEL = {
  concept_gap: '개념 이해 보완형',
  transfer_weakness: '응용 전환 보완형',
  precision_accuracy: '정확도 보완형',
  time_pressure: '시간 압박 보완형',
  instability: '성과 변동 보완형',
  persistence_risk: '학습 지속성 보완형',
};

export const WEAKNESS_COACHING = {
  concept_gap: '기본 개념을 먼저 다시 정리한 뒤 적용 문제로 넘어가는 흐름이 좋아.',
  transfer_weakness: '배운 개념을 낯선 문제에 옮겨 쓰는 연습을 늘리는 게 좋아.',
  precision_accuracy: '속도보다 검산과 오답 확인 루틴을 먼저 고정하는 게 좋아.',
  time_pressure: '문제 풀이 순서와 시간 배분을 정해두고 반복하는 게 좋아.',
  instability: '시험 전 루틴과 난도별 풀이 순서를 고정해 흔들림을 줄이는 게 좋아.',
  persistence_risk: '매일 작은 단위로 끝낼 수 있는 계획을 잡는 게 좋아.',
};

export const STRATEGY_STATUS_LABEL = {
  draft: '초안',
  pending_review: '검토 대기',
  approved: '승인됨',
  held: '보류',
  archived: '보관됨',
};

export const DIRECTION_TYPE_LABEL = {
  susi_favored: '수시 우세',
  jeongsi_favored: '정시 우세',
  balanced: '병행형',
  undetermined: '판단 보류',
  susi_dominant: '수시 우세',
  jeongsi_dominant: '정시 우세',
  pending: '판단 보류',
};

export const GAP_BAND_LABEL = {
  reach: '도전권',
  match: '적정권',
  safety: '안정권',
  '집중 보완 필요': '집중 보완 필요',
};

export function weaknessLabel(type) {
  return WEAKNESS_TYPE_LABEL[type] || type || '-';
}

export function weaknessCoaching(type) {
  return WEAKNESS_COACHING[type] || null;
}

export function strategyStatusLabel(status) {
  return STRATEGY_STATUS_LABEL[status] || status || '-';
}

export function gapBandLabel(band) {
  return GAP_BAND_LABEL[band] || band || '-';
}

export function directionLabel(type) {
  return DIRECTION_TYPE_LABEL[type] || type || '-';
}

export function renderStudyMethodText(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.label || item.method || item.title || null;
}

export function renderStudyMethodDetail(item) {
  if (!item || typeof item === 'string') return null;
  return item.detail || item.description || item.message || null;
}

export function renderRiskLabel(item) {
  if (!item) return null;
  if (typeof item === 'string') return item;
  return item.label || item.type || null;
}

export function renderRiskMessage(item) {
  if (!item || typeof item === 'string') return null;
  return item.message || item.reason || item.detail || null;
}

export function formatNumber(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(digits).replace(/\.0$/, '');
}
