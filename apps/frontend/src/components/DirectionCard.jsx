// FE-102: 수시 vs 정시 방향성 카드
// direction prop이 없거나 type === 'pending'이면 판단 보류 상태를 자연스럽게 노출한다.

import { Link } from 'react-router-dom';
import { directionLabel } from '../lib/studentLabels.js';

const TYPE_VARIANT = {
  susi_dominant: 'susi',
  jeongsi_dominant: 'jeongsi',
  balanced: 'balanced',
  pending: 'pending',
};

const TYPE_ICON = {
  susi_dominant: '📘',
  jeongsi_dominant: '📊',
  balanced: '⚖️',
  pending: '🔍',
};

export default function DirectionCard({ direction }) {
  // 데이터 없음 / 판단 보류
  if (!direction || !direction.type || direction.type === 'pending') {
    return (
      <div className="direction-card direction-pending">
        <div className="direction-card-top">
          <span className="direction-badge direction-badge-pending">판단 보류</span>
          <span className="direction-confidence muted small">데이터 보완 후 분석됩니다</span>
        </div>
        <p className="muted" style={{ margin: '0.5rem 0 0.75rem' }}>
          시험 결과와 목표대학 정보가 더 쌓이면 수시·정시 방향을 분석해 드립니다.
        </p>
        <Link to="/student/diagnosis" className="direction-cta-link">
          진단 데이터 보완하러 가기 →
        </Link>
      </div>
    );
  }

  const variant = TYPE_VARIANT[direction.type] || 'pending';
  const label = directionLabel(direction.type);
  const icon = TYPE_ICON[direction.type] || '🔍';
  const reasons = Array.isArray(direction.reasons) ? direction.reasons : [];
  const confidence = direction.confidence;
  const isLowConfidence = confidence != null && confidence < 0.5;
  const cta = direction.recommended_action;

  return (
    <div className={`direction-card direction-${variant}`}>
      <div className="direction-card-top">
        <div className="direction-badge-group">
          <span className="direction-icon">{icon}</span>
          <span className={`direction-badge direction-badge-${variant}`}>{label}</span>
        </div>
        {confidence != null ? (
          <span className="direction-confidence muted small">
            신뢰도 {Math.round(confidence * 100)}%
          </span>
        ) : null}
      </div>

      {isLowConfidence ? (
        <div className="info-box warn" style={{ margin: '0.6rem 0' }}>
          데이터가 충분하지 않아 방향성 판단이 아직 잠정적입니다.
          데이터를 보완하면 더 정확해집니다.
        </div>
      ) : null}

      {reasons.length > 0 ? (
        <ul className="direction-reasons">
          {reasons.slice(0, 4).map((r, i) => (
            <li key={i}>
              {typeof r === 'string' ? r : r.text || r.label || '-'}
            </li>
          ))}
        </ul>
      ) : null}

      {cta ? (
        <div className="direction-cta-box">
          <strong className="section-micro-label">지금 할 행동</strong>
          <p style={{ margin: '0.25rem 0 0' }}>{cta}</p>
        </div>
      ) : null}
    </div>
  );
}
