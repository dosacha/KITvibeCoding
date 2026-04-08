// apps/frontend/src/components/common/LoadingPanel.jsx
// unitflow-ai.jsx 디자인 이식: 시머 애니메이션 로딩

export function LoadingPanel({ title = "불러오는 중", description = "데이터를 정리하고 있어요." }) {
  return (
    <div className="status-box info" style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{
          width: 16, height: 16, borderRadius: 8,
          background: "linear-gradient(135deg, #6366F1, #818CF8)",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
        <strong>{title}</strong>
      </div>
      <span>{description}</span>
    </div>
  );
}
