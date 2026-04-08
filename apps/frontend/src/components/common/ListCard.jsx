// apps/frontend/src/components/common/ListCard.jsx
// unitflow-ai.jsx 디자인 이식: 아이콘 제목 + 호버 슬라이드 리스트

export function ListCard({ title, icon, items }) {
  return (
    <section className="panel">
      <h2 style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className="list">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="status-box empty">
          <strong style={{ display: "block", marginBottom: 4 }}>아직 표시할 내용이 없어요</strong>
          <span>데이터가 쌓이면 여기에 표시돼요.</span>
        </div>
      )}
    </section>
  );
}
