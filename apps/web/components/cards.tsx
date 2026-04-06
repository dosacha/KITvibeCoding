type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="card">
      <div className="eyebrow">{label}</div>
      <div className="metric">{value}</div>
      <p className="muted">{detail}</p>
    </div>
  );
}

type NarrativeCardProps = {
  title: string;
  items: string[];
};

export function NarrativeCard({ title, items }: NarrativeCardProps) {
  return (
    <div className="card">
      <h3 className="section-title">{title}</h3>
      <ul className="list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

type StatusBoxProps = {
  tone: "info" | "error";
  title: string;
  description: string;
};

export function StatusBox({ tone, title, description }: StatusBoxProps) {
  return (
    <div className={tone === "error" ? "error-box" : "info-box"}>
      <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
      <span>{description}</span>
    </div>
  );
}
