// apps/frontend/src/components/common/StatusBox.jsx

export function StatusBox({ tone = "info", title, description }) {
  const icons = { info: "ℹ️", error: "⚠️", empty: "📭", success: "✅" };
  return (
    <div className={`status-box ${tone}`} style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icons[tone] || icons.info}</span>
        <div>
          <strong style={{ display: "block", marginBottom: 2 }}>{title}</strong>
          <span>{description}</span>
        </div>
      </div>
    </div>
  );
}
