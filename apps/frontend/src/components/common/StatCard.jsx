// apps/frontend/src/components/common/StatCard.jsx
// unitflow-ai.jsx 디자인 적용: 아이콘 + 색상 배경 + 그라데이션 수치

export function StatCard({ icon: Icon, label, value, description, color = "#7C3AED" }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {Icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${color}14`, border: `1px solid ${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={20} color={color} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{value}</div>
          <div className="muted" style={{ fontSize: 12 }}>{description}</div>
        </div>
      </div>
    </div>
  );
}
